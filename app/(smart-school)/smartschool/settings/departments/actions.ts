'use server'

import { createClient } from '@/utils/supabase/server';

// 1. ฟังก์ชันนำเข้าจาก Excel (ของเดิม)
export async function importDepartmentData(jsonData: any[]) {
    const supabase = await createClient()
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1)
        const school_id = schools?.[0]?.id
        if (!school_id) throw new Error("ไม่พบรหัสสถานศึกษาในระบบ")

        const departmentsToInsert = jsonData.map(row => ({
            school_id: school_id,
            department_id: String(row.department_id).trim(),
            department_name: String(row.department_name).trim(),
            subdepartment_id: String(row.subdepartment_id).trim(),
            subdepartment_name: String(row.subdepartment_name).trim(),
            subdepartment_role_id: String(row.subdepartment_role_id).trim(),
            subdepartment_role_name: String(row.subdepartment_role_name).trim()
        })).filter(dept => dept.department_id !== 'undefined' && dept.department_id !== '')

        if (departmentsToInsert.length === 0) throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์")

        await supabase.schema('core').from('departments').delete().eq('school_id', school_id)
        const { error: insertError } = await supabase.schema('core').from('departments').insert(departmentsToInsert)
        if (insertError) throw insertError

        return { success: true, message: `นำเข้าโครงสร้างหน่วยงานสำเร็จจำนวน ${departmentsToInsert.length} รายการ` }
    } catch (error: any) {
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
    }
}

// 2. ดึงข้อมูลโครงสร้างทั้งหมด (สำหรับแสดงในตาราง)
export async function getDepartments(searchQuery: string = '') {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        if (!school_id) return [];

        let query = supabase.schema('core')
            .from('departments')
            .select('*')
            .eq('school_id', school_id)
            .order('department_id', { ascending: true })
            .order('subdepartment_id', { ascending: true })
            .order('subdepartment_role_id', { ascending: true });

        if (searchQuery) {
            query = query.or(`department_name.ilike.%${searchQuery}%,subdepartment_name.ilike.%${searchQuery}%,subdepartment_role_name.ilike.%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Get Departments Error:", error);
        return [];
    }
}

// 3. บันทึกข้อมูลทีละรายการ (เพิ่ม / แก้ไข)
export async function saveDepartment(departmentData: any) {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        if (!school_id) throw new Error("ไม่พบข้อมูลสถานศึกษา");

        const dataToSave = { ...departmentData, school_id: school_id };

        if (dataToSave.id) {
            // กรณีอัปเดตแก้ไข
            const { error } = await supabase.schema('core').from('departments').update(dataToSave).eq('id', dataToSave.id);
            if (error) throw error;
        } else {
            // กรณีเพิ่มใหม่
            const { error } = await supabase.schema('core').from('departments').insert([dataToSave]);
            if (error) throw error;
        }
        return { success: true, message: "บันทึกข้อมูลสำเร็จ" };
    } catch (error: any) {
        console.error("Save Department Error:", error);
        if (error.code === '23505') return { success: false, message: "รหัสหน้าที่ (Role ID) นี้ซ้ำกับที่มีอยู่ในระบบแล้ว กรุณาเปลี่ยนรหัสใหม่" };
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
    }
}

// 4. ลบข้อมูล
export async function deleteDepartment(id: string) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.schema('core').from('departments').delete().eq('id', id);
        if (error) throw error;
        return { success: true, message: "ลบข้อมูลสำเร็จ" };
    } catch (error: any) {
        console.error("Delete Department Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
}