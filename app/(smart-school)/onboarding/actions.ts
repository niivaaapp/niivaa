'use server'

import { createClient } from '@/utils/supabase/server';

export async function getOnboardingData() {
    const supabase = await createClient();
    
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error("ไม่พบผู้ใช้งานในระบบ (กรุณาล็อกอิน)");

        // ดึงข้อมูลครู
        const { data: employee, error: empError } = await supabase.schema('core')
            .from('employees')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(); // ป้องกัน Error กรณีแอดมินทดสอบระบบ
            
        if (empError) throw empError;

        // ดึงข้อมูล School ID ปัจจุบัน
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;

        // ดึงข้อมูลโครงสร้างหน่วยงานทั้งหมดของโรงเรียนนี้
        const { data: departments } = await supabase.schema('core')
            .from('departments')
            .select('*')
            .eq('school_id', school_id)
            .order('subdepartment_role_id', { ascending: true });

        // จัดกลุ่มข้อมูล 3 ระดับ: กลุ่มบริหาร -> งานย่อย -> บทบาทหน้าที่
        const groupedDepartments = departments?.reduce((acc: any, curr: any) => {
            if (!acc[curr.department_name]) {
                acc[curr.department_name] = {};
            }
            if (!acc[curr.department_name][curr.subdepartment_name]) {
                acc[curr.department_name][curr.subdepartment_name] = [];
            }
            acc[curr.department_name][curr.subdepartment_name].push({
                role_id: curr.subdepartment_role_id,
                role_name: curr.subdepartment_role_name
            });
            return acc;
        }, {});

        return { success: true, employee: employee || {}, groupedDepartments, school_id };
    } catch (error: any) {
        console.error("Get Onboarding Data Error:", error);
        return { success: false, message: error.message };
    }
}

export async function completeOnboarding(formData: any, assignments: any[]) {
    const supabase = await createClient();
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("กรุณาล็อกอินใหม่");

        if (formData.new_password) {
            const { error: pwdError } = await supabase.auth.updateUser({ password: formData.new_password });
            if (pwdError) throw new Error("เปลี่ยนรหัสผ่านไม่สำเร็จ: " + pwdError.message);
        }

        const employeeData = {
            prefix: formData.prefix,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            education_level: formData.education_level,
            education_degree: formData.education_degree,
            education_major: formData.education_major,
            pin_code_hash: formData.pin_code, 
            account_status: 'ACTIVE'
        };

        const { error: updateError } = await supabase.schema('core')
            .from('employees')
            .update(employeeData)
            .eq('user_id', user.id);

        if (updateError) throw updateError;

        // บันทึกหน้าที่ลงตาราง employee_assignments
        if (assignments.length > 0 && formData.emp_code && formData.school_id) {
            await supabase.schema('core').from('employee_assignments')
                .delete()
                .eq('emp_code', formData.emp_code)
                .eq('school_id', formData.school_id);

            const assignmentsToInsert = assignments.map(a => ({
                school_id: formData.school_id,
                emp_code: formData.emp_code,
                department_id: a.department_name, // เก็บชื่อกลุ่มเพื่อแสดงผล
                sub_department_id: a.subdepartment_name, // เก็บชื่องานย่อยเพื่อแสดงผล
                role_title: a.role_name, // เก็บชื่อหน้าที่
                role_id: a.role_id, // รหัสอ้างอิง PSxx-xx-x
                is_primary: a.is_primary
            }));

            // *หมายเหตุ: หากตาราง employee_assignments ของคุณยังไม่มีคอลัมน์ role_title และ role_id 
            // ระบบอาจจะแจ้ง error ให้เพิ่มคอลัมน์เหล่านั้นในรอบถัดไปครับ
            const { error: assignError } = await supabase.schema('core')
                .from('employee_assignments')
                .insert(assignmentsToInsert);

            if (assignError) {
                console.warn("Assignment Insert Warn (อาจต้องอัปเดตตาราง):", assignError.message);
            }
        }

        return { success: true, message: "ตั้งค่าบัญชีเสร็จสมบูรณ์" };
    } catch (error: any) {
        console.error("Complete Onboarding Error:", error);
        return { success: false, message: error.message };
    }
}