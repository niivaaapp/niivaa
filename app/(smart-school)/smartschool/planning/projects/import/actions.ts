'use server'

import { createClient } from '@/utils/supabase/server';

export async function importPlanData(jsonData: any[]) {
    const supabase = await createClient();

    try {
        // 1. ตรวจสอบ School ID
        const { data: schools, error: schoolError } = await supabase.schema('core').from('schools').select('id').limit(1);
        if (schoolError) throw schoolError;
        const school_id = schools?.[0]?.id;
        if (!school_id) throw new Error("ไม่พบข้อมูลสถานศึกษา กรุณาตั้งค่าโรงเรียนก่อน");

        if (!jsonData || jsonData.length === 0) {
            throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์ Excel");
        }

        // 2. สกัดข้อมูลโครงการแบบไม่ให้ซ้ำกัน (Unique Projects)
        const uniqueProjectsMap = new Map();
        
        for (const row of jsonData) {
            const projectCode = String(row['projects.id']).trim();
            // ข้ามแถวที่ไม่มีรหัสโครงการ
            if (!projectCode || projectCode === 'undefined' || projectCode === 'null') continue;

            if (!uniqueProjectsMap.has(projectCode)) {
                uniqueProjectsMap.set(projectCode, {
                    school_id: school_id,
                    fiscal_year: parseInt(row['fiscal_year']) || new Date().getFullYear() + 543,
                    department_id: String(row['department_id']).trim(),
                    project_code: projectCode,
                    project_name: String(row['projects.name']).trim(),
                    status: 'DRAFT'
                });
            }
        }

        const projectsToInsert = Array.from(uniqueProjectsMap.values());
        if (projectsToInsert.length === 0) throw new Error("ไม่พบรหัสโครงการ (projects.id) ในไฟล์");

        // 3. บันทึกข้อมูลโครงการ (ใช้วิธี Upsert ป้องกัน Error ข้อมูลซ้ำ)
        const { data: insertedProjects, error: projectInsertError } = await supabase
            .schema('core')
            .from('projects')
            .upsert(projectsToInsert, { onConflict: 'school_id, project_code' })
            .select('id, project_code');

        if (projectInsertError) throw new Error("บันทึกข้อมูลโครงการล้มเหลว: " + projectInsertError.message);

        // สร้าง Map จับคู่รหัสโครงการ กับ UUID ที่เพิ่งบันทึกได้
        const projectUuidMap = new Map();
        insertedProjects.forEach(p => projectUuidMap.set(p.project_code, p.id));

        // 4. เตรียมข้อมูลกิจกรรม
        const activitiesToInsert = [];

        for (const row of jsonData) {
            const projectCode = String(row['projects.id']).trim();
            const activityCode = String(row['activity.id']).trim();
            
            // ดึง UUID ของโครงการมารอไว้
            const projectId = projectUuidMap.get(projectCode);

            // ตรวจสอบความสมบูรณ์ของบรรทัด
            if (!projectId || !activityCode || activityCode === 'undefined') continue;

            // จัดการวันที่ (ตรวจสอบว่ามีค่าส่งมาหรือไม่)
            let startDate = null;
            let endDate = null;
            
            // ฟังก์ชันช่วยแปลงวันที่จาก Excel ให้เป็น Format ที่ฐานข้อมูลรับได้ (YYYY-MM-DD)
            const parseDate = (val: any) => {
                if (!val) return null;
                // กรณีเป็นตัวเลข Serial Number ของ Excel
                if (typeof val === 'number') {
                    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                    return date.toISOString().split('T')[0];
                }
                return String(val).trim();
            };

            activitiesToInsert.push({
                school_id: school_id,
                project_id: projectId, // ใช้ UUID ที่ดึงมา
                activity_code: activityCode,
                activity_name: String(row['activity.name']).trim(),
                sub_department_id: String(row['sub_department_id']).trim(),
                emp_code: String(row['emp_code']).trim(),
                objective: row['objective'] ? String(row['objective']).trim() : null,
                budget_allocated: parseFloat(row['budget_allocated']) || 0,
                fund_type: row['fund_type'] ? String(row['fund_type']).trim() : null,
                start_date: parseDate(row['start_date']),
                end_date: parseDate(row['end_date']),
                status: 'PENDING'
            });
        }

        if (activitiesToInsert.length === 0) throw new Error("ไม่พบข้อมูลกิจกรรมที่สมบูรณ์ในไฟล์");

        // 5. บันทึกข้อมูลกิจกรรม
        const { error: activityInsertError } = await supabase
            .schema('core')
            .from('activities')
            .upsert(activitiesToInsert, { onConflict: 'school_id, activity_code' });

        if (activityInsertError) throw new Error("บันทึกข้อมูลกิจกรรมล้มเหลว: " + activityInsertError.message);

        return { 
            success: true, 
            message: `นำเข้าข้อมูลสำเร็จ: โครงการ ${projectsToInsert.length} รายการ, กิจกรรม ${activitiesToInsert.length} รายการ` 
        };

    } catch (error: any) {
        console.error("Import Plan Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ" };
    }
}