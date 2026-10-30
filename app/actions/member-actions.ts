// app/actions/member-actions.ts
'use server'

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function inviteMemberAction(formData: FormData, orgId: string) {
  try {
    const email = formData.get('email') as string
    const role = formData.get('role') as string // 'teacher' หรือ 'admin'

    if (!email) return { success: false, error: 'กรุณาระบุอีเมล' }

    // 1. ตรวจสอบสิทธิ์คนกดเชิญก่อน (ต้องเป็น Admin ของระบบ)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }

    // 2. สร้าง Admin Client เพื่อทะลุ RLS จัดการระบบ User
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. ใช้คำสั่ง Invite ของ Supabase Auth Admin
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        invited_org_id: orgId,
        invited_role: role 
      },
      // กำหนด URL ให้เด้งกลับมาหน้าตั้งรหัสผ่าน หรือหน้า Welcome
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/welcome?source=invite`
    })

    if (error) {
      if (error.message.includes('already exists')) {
         return { success: false, error: 'อีเมลนี้มีอยู่ในระบบแล้ว' }
      }
      throw error
    }

    return { success: true, message: `ส่งอีเมลคำเชิญไปยัง ${email} สำเร็จแล้ว` }

  } catch (err: any) {
    console.error('Invite Error:', err)
    return { success: false, error: 'เกิดข้อผิดพลาดในการส่งคำเชิญ' }
  }
}