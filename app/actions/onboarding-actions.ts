// app/actions/onboarding-actions.ts
'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// 🌟 1. เพิ่มพารามิเตอร์รับค่า userId และ fullName จากฝั่งหน้าเว็บโดยตรง
export async function executeSilentOnboardingServer(
  appConfig: any, 
  planId: string | null,
  clientUserId?: string,
  clientFullName?: string
) {
  try {
    // ลองเช็ค Auth ด้วย Server ก่อน (เผื่อคุกกี้ทำงานปกติ)
    const supabaseAuth = await createServerClient()
    const { data: { user } } = await supabaseAuth.auth.getUser()
    
    // 🌟 2. ถ้า Server มองไม่เห็นคุกกี้ (พบบ่อยในมือถือ) ให้ใช้ ID ที่หน้าเว็บส่งมาให้แทน!
    const finalUserId = user?.id || clientUserId;
    const finalFullName = user?.user_metadata?.full_name || clientFullName || 'คุณ';

    if (!finalUserId) {
      return { success: false, error: 'หมดเวลาเซสชันหรือคุกกี้ถูกบล็อก กรุณาเข้าสู่ระบบใหม่' }
    }

    // 🌟 3. เรียกใช้กุญแจ Master Key ทะลุ RLS 100%
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    )

    // --- STEP 1: องค์กร (Organization) ---
    let orgId = null
    const { data: memberData } = await supabaseAdmin
      .from('organization_members')
      .select('org_id')
      .eq('profile_id', finalUserId) // 👈 ใช้ finalUserId
      .eq('org_role', 'owner')
      .limit(1)
      .maybeSingle()

    if (memberData && memberData.org_id) {
      orgId = memberData.org_id
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: `Workspace ของ ${finalFullName}` }) // 👈 ใช้ finalFullName
        .select('id').single()
      if (orgError) throw orgError
      orgId = newOrg.id

      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({ org_id: orgId, profile_id: finalUserId, org_role: 'owner' }) // 👈 ใช้ finalUserId
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
      .eq('profile_id', finalUserId) // 👈 ใช้ finalUserId
      .eq('org_id', orgId)
      .eq('app_id', appConfig.appId)
      .maybeSingle()

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        profile_id: finalUserId, // 👈 ใช้ finalUserId
        org_id: orgId,
        app_id: appConfig.appId,
        role: 'admin'
      })
      if (roleError && roleError.code !== '23505') throw roleError 
    }

    // --- STEP 4: พื้นที่ทำงาน UI (Workspaces) ---
    let finalWorkspaceId = ''
    const { data: existingWorkspace } = await supabaseAdmin
      .from('workspaces')
      .select('id')
      .eq('owner_id', finalUserId) // 👈 ใช้ finalUserId
      .eq('service_code', appConfig.serviceCode)
      .maybeSingle()

    if (!existingWorkspace) {
      const { data: newWs, error: wsError } = await supabaseAdmin.from('workspaces').insert({
        owner_id: finalUserId, // 👈 ใช้ finalUserId
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