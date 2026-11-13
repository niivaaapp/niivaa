'use server'

import { createClient } from '@/utils/supabase/server';

export async function getTrackingData() {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        
        if (!school_id) return { success: false, projects: [], activities: [], departments: [], employees: [] };

        // 1. ดึงโครงการ
        const { data: projects, error: pErr } = await supabase.schema('core').from('projects').select('*').eq('school_id', school_id).order('project_code');
        if (pErr) console.error("Fetch Projects Error:", pErr);

        // 2. ดึงกิจกรรม
        const { data: activities, error: aErr } = await supabase.schema('core').from('activities').select('*').eq('school_id', school_id).order('activity_code');
        if (aErr) console.error("Fetch Activities Error:", aErr);

        // 3. ดึงโครงสร้างหน่วยงาน
        const { data: departments, error: dErr } = await supabase.schema('core').from('departments').select('*').eq('school_id', school_id);
        if (dErr) console.error("Fetch Departments Error:", dErr);

        // 4. ดึงข้อมูลบุคลากร (เอา .catch ออก)
        const { data: employees, error: eErr } = await supabase.schema('core').from('employees').select('emp_code, prefix, first_name, last_name').eq('school_id', school_id);
        if (eErr) console.error("Fetch Employees Error:", eErr);

        return { 
            success: true, 
            projects: projects || [], 
            activities: activities || [],
            departments: departments || [],
            employees: employees || []
        };
    } catch (error) {
        console.error("Fetch Tracking Data Error:", error);
        return { success: false, projects: [], activities: [], departments: [], employees: [] };
    }
}