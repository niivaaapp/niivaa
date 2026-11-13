'use server'

import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// ฟังก์ชันสร้าง Admin Client (เพื่อจัดการ auth.users)
const getAdminSupabase = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
};

// 1. สร้างบัญชีอัตโนมัติ (จากโค้ดที่เราคุยกัน)
export async function generateUserAccounts() {
    const supabase = await createServerClient();
    const adminAuth = getAdminSupabase();

    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id, name').limit(1);
        const school_id = schools?.[0]?.id;
        const school_name = schools?.[0]?.name.replace(/\s+/g, '').toLowerCase() || 'school';
        
        if (!school_id) throw new Error("ไม่พบข้อมูลสถานศึกษา");

        const { data: employees, error: fetchError } = await supabase.schema('core')
            .from('employees')
            .select('*')
            .eq('school_id', school_id)
            .is('user_id', null);

        if (fetchError) throw fetchError;
        if (!employees || employees.length === 0) {
            return { success: true, message: "ไม่มีบุคลากรที่ต้องสร้างบัญชี (ทุกคนมีบัญชีครบแล้ว)" };
        }

        let successCount = 0;
        let errorCount = 0;

        for (const emp of employees) {
            const email = emp.email || `${emp.emp_code}@${school_name}.niivaa.com`;
            const password = emp.national_id || emp.phone || `NiiVaa@${emp.emp_code}`;

            const { data: authData, error: authError } = await adminAuth.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: { emp_code: emp.emp_code, school_id: school_id, system_role: emp.system_role || 'User' }
            });

            if (authError) {
                console.error(`Error ${emp.emp_code}:`, authError.message);
                errorCount++;
                continue; 
            }

            if (authData.user) {
                await supabase.schema('core').from('employees').update({
                    user_id: authData.user.id,
                    email: email, 
                    account_status: 'PENDING_ONBOARDING'
                }).eq('id', emp.id);
                successCount++;
            }
        }

        return { success: true, message: `สร้างบัญชีสำเร็จ ${successCount} บัญชี, ผิดพลาด ${errorCount} บัญชี` };
    } catch (error: any) {
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการสร้างบัญชี" };
    }
}

// 2. ดึงข้อมูลรายชื่อผู้ใช้งานเพื่อแสดงในตาราง
export async function getUsersList(searchQuery: string = '') {
    const supabase = await createServerClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        if (!school_id) return [];

        let query = supabase.schema('core')
            .from('employees')
            .select('id, emp_code, prefix, first_name, last_name, email, system_role, account_status, failed_pin_attempts, user_id')
            .eq('school_id', school_id)
            .order('emp_code', { ascending: true });

        if (searchQuery) {
            query = query.or(`first_name.ilike.%${searchQuery}%,emp_code.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Get Users Error:", error);
        return [];
    }
}

// 3. อัปเดตสิทธิ์การใช้งาน (System Role) หรือสถานะบัญชี
export async function updateUserAccess(employeeId: string, field: 'system_role' | 'account_status', value: string) {
    const supabase = await createServerClient();
    try {
        const { error } = await supabase.schema('core')
            .from('employees')
            .update({ [field]: value })
            .eq('id', employeeId);

        if (error) throw error;
        return { success: true, message: "อัปเดตข้อมูลสำเร็จ" };
    } catch (error: any) {
        return { success: false, message: "เกิดข้อผิดพลาดในการอัปเดต" };
    }
}