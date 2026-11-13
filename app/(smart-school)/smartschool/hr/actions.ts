'use server'

import { createClient } from '@/utils/supabase/server';

// 1. ดึงข้อมูลบุคลากรทั้งหมด (พร้อมระบบค้นหาและตัวกรอง)
export async function getEmployees(searchQuery: string = '', filters: any = {}) {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        if (!school_id) return [];

        let query = supabase.schema('core')
            .from('employees')
            .select('*')
            .eq('school_id', school_id)
            .order('emp_code', { ascending: true });

        // กรองด้วยคำค้นหา (ค้นชื่อ, นามสกุล, รหัส)
        if (searchQuery) {
            query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,emp_code.ilike.%${searchQuery}%`);
        }

        // กรองตามตัวกรองต่างๆ
        if (filters.gender) query = query.eq('gender', filters.gender);
        if (filters.academic_standing) query = query.eq('academic_standing', filters.academic_standing);
        if (filters.education_level) query = query.eq('education_level', filters.education_level);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Get Employees Error:", error);
        return [];
    }
}

// 2. บันทึกข้อมูลบุคลากร
export async function saveEmployee(employeeData: any) {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        if (!school_id) throw new Error("ไม่พบข้อมูลสถานศึกษา");

        const dataToSave = { ...employeeData, school_id: school_id };

        const { error } = await supabase
            .schema('core')
            .from('employees')
            .upsert(dataToSave, { onConflict: 'school_id, emp_code' });

        if (error) throw error;
        return { success: true, message: "บันทึกข้อมูลสำเร็จ" };
    } catch (error: any) {
        console.error("Save Employee Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
    }
}

// 3. ลบข้อมูลบุคลากร
export async function deleteEmployee(id: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.schema('core').from('employees').delete().eq('id', id);
        if (error) throw error;
        return { success: true, message: "ลบข้อมูลสำเร็จ" };
    } catch (error: any) {
        console.error("Delete Employee Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
}