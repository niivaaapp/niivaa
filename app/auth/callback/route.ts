// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  // ดึง URL และ Parameters ที่ Google ส่งกลับมา
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // ดึง parameter 'next' ที่เราพ่วงไปตอนกดปุ่ม Login (เช่น /welcome?app=media)
  // ถ้าไม่มี ให้ตั้งค่าเริ่มต้นไปที่หน้าแรก
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // แลกเปลี่ยน 'code' เป็น 'session' (สร้าง Cookie)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // เพื่อรองรับการใช้งานผ่าน Load Balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      // กำหนด URL ปลายทางหลังจากแปลง Token สำเร็จ
      if (isLocalEnv) {
        // สำหรับรันบน Localhost
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        // สำหรับการใช้งานบน Production (Vercel)
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      // ถ้าแลก Token ไม่สำเร็จ ให้เตะกลับไปหน้า Login พร้อมส่ง Error ไปแสดง
      console.error("Auth Callback Error:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }
  }

  // หากไม่มี code ส่งมา (เกิดข้อผิดพลาดจาก Google)
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}