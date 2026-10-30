// app/actions/authActions.ts
"use server";
import { createClient } from '@supabase/supabase-js';

// 🌟 สร้าง Admin Client สำหรับทะลุ RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyStaffPasscode(eventId: string, pinCode: string) {
  try {
    // 1. อ่านข้อมูลจากตาราง 'event_staff' ของคุณ
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('event_staff')
      .select('event_role, display_name')
      .eq('event_id', eventId)
      .eq('passcode', pinCode)
      .eq('is_active', true)
      .single();

    if (staffError || !staffData) {
      return { success: false, error: 'รหัส PIN ไม่ถูกต้อง' };
    }

    // 2. ออกบัตรผ่าน (Token) และบันทึกลงตาราง 'event_staff_sessions'
    // (⚠️ อย่าลืมสร้างตารางนี้ในฐานข้อมูล ตามคำแนะนำในข้อความก่อนหน้านี้ด้วยนะครับ)
    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from('event_staff_sessions')
      .insert({ event_id: eventId, role: staffData.event_role })
      .select('token')
      .single();

    if (sessionError) throw sessionError;

    // 3. คืนค่า Token និងข้อมูล ให้หน้าเว็บ
    return { 
      success: true, 
      token: sessionData.token, 
      role: staffData.event_role,
      name: staffData.display_name 
    };

  } catch (error) {
    console.error("Server PIN Verification Error:", error);
    return { success: false, error: 'ระบบขัดข้องชั่วคราว กรุณาลองใหม่' };
  }
}