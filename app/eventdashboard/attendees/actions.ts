'use server'

import { createClient } from '@/utils/supabase/server';
import { checkAttendeeQuota } from '@/app/(event)/events/event-dashboard/actions/quota-checker'; // 🌟 1. นำเข้า Gatekeeper

export async function addAttendeeAction(formData: FormData, eventId: string) {
  // 🛡️ 2. เรียกใช้ Gatekeeper เป็นด่านแรกสุด!
  const quota = await checkAttendeeQuota(eventId);
  
  // ถ้าระบบขัดข้อง
  if (!quota.success) {
    return { success: false, error: quota.error };
  }
  
  // ⛔ 3. ถ้าโควตาเต็ม (Gatekeeper ไม่อนุญาต)
  if (!quota.allowed) {
    return { 
      success: false,
      error: `ที่นั่งเต็มแล้ว! (รับได้สูงสุด ${quota.maxAttendees} คน)`, 
      shouldUpgrade: true // 🌟 ส่งสัญญาณไปบอกหน้าจอว่า "ให้โชว์ป๊อปอัปอัปเกรดเลย!"
    };
  }

  // ✅ 4. ถ้าผ่าน Gatekeeper มาได้ (โควตายังไม่เต็ม) ถึงจะยอมให้บันทึกข้อมูล
  const supabase = await createClient();
  const fullName = formData.get('fullname') as string;
  // ... ดึงข้อมูลอื่นๆ จาก formData ...

  const { error: insertError } = await supabase
    .from('event_attendees')
    .insert({
      event_id: eventId,
      fullname: fullName,
      status: 'registered'
      // ... ข้อมูลอื่นๆ
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, message: 'เพิ่มผู้เข้าร่วมสำเร็จ!' };
}