'use server'

import { createClient } from '@/utils/supabase/server';

export async function getRequestMasterData() {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id, name').limit(1);
        const school_id = schools?.[0]?.id;
        const school_name = schools?.[0]?.name || 'โรงเรียน...';
        
        if (!school_id) return { success: false, data: null };

        // 🌟 เพิ่มการดึง material_catalog เข้ามาใน Promise.all
        const [projects, activities, employees, departments, materials] = await Promise.all([
            supabase.schema('core').from('projects').select('*').eq('school_id', school_id),
            supabase.schema('core').from('activities').select('*').eq('school_id', school_id),
            supabase.schema('core').from('employees').select('*').eq('school_id', school_id),
            supabase.schema('core').from('departments').select('*').eq('school_id', school_id),
            supabase.schema('core').from('material_catalog').select('*').eq('school_id', school_id) // ดึงแคตตาล็อกพัสดุ
        ]);

        return { 
            success: true, 
            data: {
                schoolName: school_name,
                projects: projects.data || [],
                activities: activities.data || [],
                employees: employees.data || [],
                departments: departments.data || [],
                materials: materials.data || [] // 🌟 ส่งต่อให้หน้าเว็บ
            }
        };
    } catch (error) {
        console.error("Fetch Data Error:", error);
        return { success: false, data: null };
    }
}

// 🌟 ฟังก์ชันใหม่สำหรับบันทึกข้อมูลลงฐานข้อมูล 3 ตาราง
export async function saveActivityRequest(payload: any) {
    const supabase = await createClient();
    try {
        // 1. ดึง school_id ปัจจุบัน
        const { data: schools } = await supabase.schema('core').from('schools').select('id').limit(1);
        const school_id = schools?.[0]?.id;
        if (!school_id) return { success: false, error: 'ไม่พบข้อมูลโรงเรียน' };

        const { formData, materialExpenses, generalExpenses, budgetSources, requestMode, status, projectId, empCode, grandTotal } = payload;

        // 2. บันทึกข้อมูลหลัก (Header) ลงตาราง core.activity_requests
        const { data: requestData, error: requestError } = await supabase.schema('core').from('activity_requests').insert({
            school_id,
            emp_code: empCode,
            project_id: projectId,
            activity_id: formData.activity_id,
            request_date: formData.request_date,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            requested_budget: grandTotal,
            location_name: formData.location,
            target_executives: Number(formData.target_executives) || 0,
            target_teachers: Number(formData.target_teachers) || 0,
            target_students: Number(formData.target_students) || 0,
            target_student_level: formData.target_student_level,
            target_others: formData.target_others,
            target_others_count: Number(formData.target_others_count) || 0,
            status: status, // 'DRAFT' (บันทึกร่าง) หรือ 'PENDING' (ส่งอนุมัติ)
            request_iteration: Number(formData.request_iteration) || 1,
            require_procurement: materialExpenses.length > 0
        }).select('id').single();

        if (requestError) throw new Error(requestError.message);
        const requestId = requestData.id;

        // 3. เตรียมข้อมูลและบันทึกรายละเอียดค่าใช้จ่าย (Details)
        const expenseItems = [];
        let seq = 1;
        
        // 3.1 พัสดุ
        for (const mat of materialExpenses) {
            expenseItems.push({
                request_id: requestId,
                expense_type: 'MATERIAL',
                expense_category: 'MATERIAL',
                item_code: mat.item_code,
                item_name: mat.item_name,
                brand: mat.brand || null,
                qty_a: Number(mat.qty) || 0,
                unit_a: mat.unit,
                qty_b: null,
                unit_b: null,
                unit_price: Number(mat.unit_price) || 0,
                total_price: Number(mat.total) || 0,
                seq_no: seq++
            });
        }
        
        // 3.2 ค่าใช้จ่ายทั่วไป
        for (const gen of generalExpenses) {
            expenseItems.push({
                request_id: requestId,
                expense_type: 'GENERAL',
                expense_category: gen.expense_category,
                item_code: null,
                item_name: gen.item_name,
                brand: null,
                qty_a: Number(gen.qty_a) || 0,
                unit_a: gen.unit_a,
                qty_b: gen.qty_b ? Number(gen.qty_b) : null,
                unit_b: gen.unit_b,
                unit_price: Number(gen.unit_price) || 0,
                total_price: Number(gen.total) || 0,
                seq_no: seq++
            });
        }

        if (expenseItems.length > 0) {
            const { error: itemsError } = await supabase.schema('core').from('request_expense_items').insert(expenseItems);
            if (itemsError) throw new Error(itemsError.message);
        }

        // 4. บันทึกประวัติการโอนงบ (เฉพาะ Mode 2 และ 3 ที่มีข้อมูลยอดเงิน)
        if ((requestMode === 2 || requestMode === 3) && budgetSources.length > 0) {
            const transfers = budgetSources
                .filter((s:any) => s.fromActivityId && Number(s.amount) > 0)
                .map((s:any) => ({
                    request_id: requestId,
                    from_activity_id: s.fromActivityId,
                    transfer_amount: Number(s.amount)
                }));
                
            if (transfers.length > 0) {
                const { error: transferError } = await supabase.schema('core').from('request_budget_transfers').insert(transfers);
                if (transferError) throw new Error(transferError.message);
            }
        }

        return { success: true, id: requestId };
    } catch (error: any) {
        console.error("Save Data Error:", error);
        return { success: false, error: error.message };
    }
}
// เพิ่มฟังก์ชันนี้ต่อท้ายในไฟล์ actions.ts เดิม
export async function getActivityRequestById(id: string) {
    const supabase = await createClient();
    try {
        // 1. ดึงข้อมูลหัวเอกสาร
        const { data: req, error: reqError } = await supabase.schema('core').from('activity_requests').select('*').eq('id', id).single();
        if (reqError) throw reqError;

        // 2. ดึงข้อมูลตารางที่เกี่ยวข้อง (กิจกรรม, โครงการ, ผู้เสนอ, โรงเรียน)
        const { data: activity } = await supabase.schema('core').from('activities').select('*').eq('id', req.activity_id).single();
        const { data: project } = await supabase.schema('core').from('projects').select('*').eq('id', req.project_id).single();
        const { data: employee } = await supabase.schema('core').from('employees').select('*').eq('emp_code', req.emp_code).single();
        const { data: school } = await supabase.schema('core').from('schools').select('*').eq('id', req.school_id).single();

        // 3. ดึงตารางรายละเอียดค่าใช้จ่าย
        const { data: expenses } = await supabase.schema('core').from('request_expense_items').select('*').eq('request_id', id).order('seq_no', { ascending: true });

        // 4. ดึงข้อมูลโอนงบ (ถ้ามี)
        const { data: transfers } = await supabase.schema('core').from('request_budget_transfers').select('*').eq('request_id', id);
        let transferDetails = [];
        if (transfers && transfers.length > 0) {
            const activityIds = transfers.map((t:any) => t.from_activity_id);
            const { data: transferActivities } = await supabase.schema('core').from('activities').select('id, activity_name').in('id', activityIds);
            transferDetails = transfers.map((t:any) => ({ ...t, from_activity: transferActivities?.find((a:any) => a.id === t.from_activity_id) }));
        }

        // 5. ดึงข้อมูลกลุ่มงาน/ฝ่าย เพื่อระบุชื่อในสายการอนุมัติ
        let deptInfo = null;
        if (activity?.subdepartment_id) {
            const { data: dept } = await supabase.schema('core').from('departments').select('*').eq('subdepartment_id', activity.subdepartment_id).limit(1);
            deptInfo = dept?.[0] || null;
        }

        return { 
            success: true, 
            data: { req, activity, project, employee, school, expenses: expenses || [], transfers: transferDetails, deptInfo } 
        };
    } catch (error: any) {
        console.error("Fetch Data Error:", error);
        return { success: false, error: error.message };
    }
}