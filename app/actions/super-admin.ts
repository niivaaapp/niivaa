// app/actions/super-admin.ts
'use server';

// 🌟 นำเข้า Supabase JS แบบดั้งเดิม สำหรับใช้สิทธิ์ Service Role (ทะลุ RLS)
import { createClient } from '@supabase/supabase-js';

// 🌟 สร้าง Admin Client ด้วย Service Role Key (ห้ามใช้ NEXT_PUBLIC_ นำหน้าเด็ดขาด)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ต้องมีตัวแปรนี้ในไฟล์ .env.local
);

// 1. ฟังก์ชันดึงข้อมูลผู้ใช้ทั้งหมด
export async function getAdminUsers() {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message, data: null };
  }
}

// 2. ฟังก์ชันดึงข้อมูล Workspaces ทั้งหมด
export async function getAdminWorkspaces() {
  try {
    const { data, error } = await supabaseAdmin
      .from('workspaces')
      // 🌟 เปลี่ยนเป็น profiles(*) เพื่อดึงมาทั้งหมด ป้องกันปัญหาชื่อคอลัมน์ผิด
      .select('*, profiles(*)') 
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ DB Error ใน getAdminWorkspaces:", error);
      throw error;
    }
    return { success: true, data };
  } catch (error: any) {
    return { success: false, message: error.message, data: null };
  }
}

// ... (โค้ด deleteUserAccount และ deleteWorkspace เดิมของคุณให้อยู่ต่อจากนี้ครับ) ...

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