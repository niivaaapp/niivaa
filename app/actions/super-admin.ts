'use server';

import { createClient } from '@supabase/supabase-js';

// 🌟 เรียกใช้ Service Role Key (ต้องตั้งค่าใน .env.local)
// ระวัง: ห้ามใช้ NEXT_PUBLIC_ นำหน้าตัวแปร Service Role Key เด็ดขาด
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ฟังก์ชันลบผู้ใช้แบบถอนรากถอนโคน (ถ้าทำ ON DELETE CASCADE ไว้ ข้อมูลที่ผูกกันจะหายหมด)
export async function deleteUserAccount(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { success: true, message: 'ลบบัญชีผู้ใช้สำเร็จ' };
  } catch (error: any) {
    console.error("Delete user error:", error);
    return { success: false, message: error.message };
  }
}

// ฟังก์ชันลบเฉพาะ Workspace (กรณีแอดมินต้องการเคลียร์โปรเจกต์ขยะ)
export async function deleteWorkspace(workspaceId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);
      
    if (error) throw new Error(error.message);
    return { success: true, message: 'ลบ Workspace สำเร็จ' };
  } catch (error: any) {
    console.error("Delete workspace error:", error);
    return { success: false, message: error.message };
  }
}