'use server'

import { createClient } from '@/utils/supabase/server'

// 🌟 ลบ import { redirect } ออกไปเลยครับ

export async function signup(formData: FormData, planId: string | undefined) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  // 1. สมัครสมาชิกผ่าน Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })

  // 2. ตรวจสอบ Error จากการสมัคร
  if (authError || !authData.user) {
    return { error: authError?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก' }
  }

  // 🌟 3. ส่งสัญญาณกลับไปว่า "สำเร็จ!" (ไม่มี Error)
  // หมายเหตุ: เราลบโค้ดส่วนสร้าง Organization และ Subscription ออกจากไฟล์นี้แล้ว
  // เพราะระบบจะไปทำงานอัตโนมัติ (Silent Onboarding) อย่างสวยงามที่หน้า WelcomePage แทนครับ
  
  return { error: null }
}