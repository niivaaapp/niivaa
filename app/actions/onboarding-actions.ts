// app/actions/onboarding-actions.ts
'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function executeSilentOnboardingServer(appConfig: any, planId: string | null) {
  try {
    // 1. เช็ค Auth ด้วย Client ปกติว่ามีคนล็อกอินจริง
    const supabaseAuth = await createServerClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }
    }

    // 🌟 2. เรียกใช้กุญแจ Master Key ทะลุ RLS 100%
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // ใช้กุญแจที่คุณเพิ่งใส่ใน .env.local
    )

    // --- STEP 1: องค์กร (Organization) ---
    let orgId = null
    const { data: memberData } = await supabaseAdmin
      .from('organization_members')
      .select('org_id')
      .eq('profile_id', user.id)
      .eq('org_role', 'owner')
      .limit(1)
      .maybeSingle()

    if (memberData && memberData.org_id) {
      orgId = memberData.org_id
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: `Workspace ของ ${user.user_metadata?.full_name || 'คุณ'}` })
        .select('id').single()
      if (orgError) throw orgError
      orgId = newOrg.id

      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({ org_id: orgId, profile_id: user.id, org_role: 'owner' })
      if (memberError) throw memberError
    }

    // --- STEP 2: แพ็กเกจ (Subscription) ---
    let isNewSubscription = false
    const { data: existingSubs } = await supabaseAdmin
      .from('subscriptions')
      .select('id, plans!inner(app_id)')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .eq('plans.app_id', appConfig.appId)

    if (!existingSubs || existingSubs.length === 0) {
      let targetPlanId = planId
      if (!targetPlanId) {
        const { data: freePlan } = await supabaseAdmin
          .from('plans')
          .select('id')
          .eq('app_id', appConfig.appId)
          .eq('tier', 'free')
          .single()
        if (freePlan) targetPlanId = freePlan.id
      }

      if (targetPlanId) {
        const validUntil = new Date()
        validUntil.setFullYear(validUntil.getFullYear() + 10)

        const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
          org_id: orgId,
          plan_id: targetPlanId,
          status: 'active',
          start_date: new Date().toISOString(),
          valid_until: validUntil.toISOString(),
          cancel_at_period_end: false
        })
        if (subError) throw subError
        isNewSubscription = true
      } else {
        throw new Error(`ไม่พบแพ็กเกจฟรีสำหรับ ${appConfig.title}`)
      }
    }

    // --- STEP 3: สิทธิ์เข้าถึง (User Roles) ---
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('profile_id', user.id)
      .eq('org_id', orgId)
      .eq('app_id', appConfig.appId)
      .maybeSingle()

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        profile_id: user.id,
        org_id: orgId,
        app_id: appConfig.appId,
        role: 'admin'
      })
      if (roleError && roleError.code !== '23505') throw roleError // ป้องกันดักจับซ้ำซ้อน
    }

    // --- STEP 4: พื้นที่ทำงาน UI (Workspaces) ---
    let finalWorkspaceId = ''
    const { data: existingWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .eq('service_code', appConfig.serviceCode)
      .maybeSingle()

    if (!existingWorkspace) {
      const { data: newWs, error: wsError } = await supabaseAdmin.from('workspaces').insert({
        owner_id: user.id,
        service_code: appConfig.serviceCode,
        workspace_name: appConfig.workspaceName,
        theme_config: { primary_color: "#14b8a6" },
        is_private: true
      }).select('id').single()
      
      if (wsError) throw wsError
      finalWorkspaceId = newWs.id
    } else {
      finalWorkspaceId = existingWorkspace.id
    }

    return { 
      success: true, 
      workspaceId: finalWorkspaceId, 
      status: isNewSubscription ? 'new_free' : 'existing' 
    }

  } catch (error: any) {
    console.error("Server Onboarding Error:", error)
    return { success: false, error: error.message }
  }
}