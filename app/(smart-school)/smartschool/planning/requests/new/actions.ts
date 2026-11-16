'use server'

import { createClient } from '@/utils/supabase/server';

export async function getRequestMasterData() {
    const supabase = await createClient();
    try {
        // ดึง id และ name ของโรงเรียนมาใช้เลย
        const { data: schools } = await supabase.schema('core').from('schools').select('id, name').limit(1);
        const school_id = schools?.[0]?.id;
        const school_name = schools?.[0]?.name || 'โรงเรียน...'; // ชื่อโรงเรียน
        
        if (!school_id) return { success: false, data: null };

        const [projects, activities, employees, departments] = await Promise.all([
            supabase.schema('core').from('projects').select('*').eq('school_id', school_id),
            supabase.schema('core').from('activities').select('*').eq('school_id', school_id),
            supabase.schema('core').from('employees').select('emp_code, prefix, first_name, last_name, sub_department_id').eq('school_id', school_id),
            supabase.schema('core').from('departments').select('*').eq('school_id', school_id)
        ]);

        return { 
            success: true, 
            data: {
                schoolName: school_name, // ส่งชื่อไปให้หน้าเว็บ
                projects: projects.data || [],
                activities: activities.data || [],
                employees: employees.data || [],
                departments: departments.data || []
            }
        };
    } catch (error) {
        console.error("Fetch Data Error:", error);
        return { success: false, data: null };
    }
}