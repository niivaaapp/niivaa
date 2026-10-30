// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' // ตรวจสอบ path ให้ตรงกับโปรเจกต์ของคุณ

export async function GET(request: Request) {
  // ดึง URL และพารามิเตอร์ที่ส่งกลับมาจาก Google
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // ดึงค่า next ที่เราตั้งไว้ในหน้า Signup (เช่น /welcome?source=signup...)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // นำรหัส code ไปแลกเป็น Session ของผู้ใช้
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 🌟 แลกสำเร็จ! ให้พาผู้ใช้ไปยังหน้า Welcome พร้อมแนบข้อมูลพารามิเตอร์ต่างๆ ไปด้วย
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("Callback Error:", error.message)
  }

  // ถ้าแลกไม่สำเร็จ หรือไม่มี code กลับมา ให้ส่งไปหน้า Login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}