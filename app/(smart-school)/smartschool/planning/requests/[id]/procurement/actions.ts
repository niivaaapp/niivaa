'use server'

import { createClient } from '@/utils/supabase/server'

// === บล็อกที่ 1: ดึงข้อมูลตั้งต้นสำหรับหน้าตั้งค่าพัสดุ ===
export async function getProcurementSetupData(requestId: string) {
    const supabase = await createClient()
    try {
        const { data: req, error: reqError } = await supabase
            .schema('core')
            .from('activity_requests')
            .select('*')
            .eq('id', requestId)
            .single()
        if (reqError) throw reqError

        const [activityRes, projectRes, schoolRes, employeesRes, materialsRes, existingProcRes] = await Promise.all([
            supabase.schema('core').from('activities').select('*').eq('id', req.activity_id).single(),
            supabase.schema('core').from('projects').select('*').eq('id', req.project_id).single(),
            supabase.schema('core').from('schools').select('*').eq('id', req.school_id).single(),
            supabase.schema('core').from('employees').select('*').eq('school_id', req.school_id).order('first_name', { ascending: true }),
            supabase.schema('core').from('request_expense_items').select('*').eq('request_id', requestId).eq('expense_type', 'MATERIAL').order('seq_no', { ascending: true }),
            supabase.schema('core').from('procurements').select('*').eq('request_id', requestId).limit(1)
        ])

        const existingProcurement = existingProcRes.data?.[0] || null
        let existingCommittees: any[] = []

        if (existingProcurement) {
            const { data: commData } = await supabase
                .schema('core')
                .from('procurement_committees')
                .select('*')
                .eq('procurement_id', existingProcurement.id)
                .order('seq_no', { ascending: true })
            existingCommittees = commData || []
        }

        // ประกาศตัวแปร deptInfo ไว้นอก if เพื่อให้ return มองเห็น
        let deptInfo = null
        if (activityRes.data?.subdepartment_id) {
            const { data: deptData } = await supabase
                .schema('core')
                .from('departments')
                .select('*')
                .eq('subdepartment_id', activityRes.data.subdepartment_id)
                .limit(1)
            deptInfo = deptData?.[0] || null
        }

        return {
            success: true,
            data: {
                req,
                activity: activityRes.data,
                project: projectRes.data,
                school: schoolRes.data,
                deptInfo,
                employees: employeesRes.data || [],
                materials: materialsRes.data || [],
                existingProcurement,
                existingCommittees
            }
        }
    } catch (error: any) {
        console.error('getProcurementSetupData Error:', error)
        return { success: false, error: error.message }
    }
}

// === บล็อกที่ 2: บันทึกข้อมูลรายงานขอซื้อขอจ้างและคณะกรรมการ ===
export async function saveProcurementData(payload: any) {
    const supabase = await createClient()
    try {
        const { procurementId, schoolId, requestId, form, committees, meta } = payload
        // meta ส่งมาจากหน้า page.tsx: { activityName, subdepartmentName, departmentName, ownerName }

        let finalReportNo = form.report_no?.trim() || ''
        let finalMedianOrderNo = form.median_order_no?.trim() || ''
        let finalOrderNo = form.order_no?.trim() || ''

        // 1. ออกเลขที่รายงานขอซื้อขอจ้างอัตโนมัติ (ถ้ายังไม่มีเลข) โดยดึง doc_prefix ของ "งานพัสดุ"
        if (!finalReportNo) {
            const { data: supplyDept } = await supabase
                .schema('core')
                .from('departments')
                .select('department_id, subdepartment_id, doc_prefix')
                .eq('school_id', schoolId)
                .ilike('subdepartment_name', '%พัสดุ%')
                .limit(1)
                .maybeSingle()

            const docPrefix = supplyDept?.doc_prefix || 'งปม.พด.'
            const deptId = supplyDept?.subdepartment_id || supplyDept?.department_id || 'SUPPLY'

            finalReportNo = await issueDepartmentDocNo(supabase, {
                schoolId,
                departmentId: deptId,
                docPrefix,
                docDate: form.report_date,
                subject: `รายงานขอซื้อขอจ้าง (${meta?.activityName || '-'})`
            })
        }

        // 2. ออกเลขที่คำสั่ง กก.กำหนดราคากลาง (เฉพาะงานก่อสร้าง และยังไม่มีเลข) — ออกก่อนเพื่อให้เลขเรียงลำดับ
        if (form.procurement_type === 'CONSTRUCTION' && !finalMedianOrderNo) {
            finalMedianOrderNo = await issueSchoolOrderNo(supabase, {
                schoolId,
                orderDate: form.median_order_date || form.report_date,
                subject: `แต่งตั้งคณะกรรมการกำหนดราคากลาง (${meta?.activityName || '-'})`,
                subdepartmentName: meta?.subdepartmentName || 'งานพัสดุ',
                departmentName: meta?.departmentName || 'กลุ่มบริหารงบประมาณ',
                ownerName: meta?.ownerName || '-',
                refProcurementId: procurementId
            })
        }

        // 3. ออกเลขที่คำสั่งแต่งตั้ง กก.จัดซื้อจัดจ้าง (ถ้ายังไม่มีเลข)
        if (!finalOrderNo) {
            finalOrderNo = await issueSchoolOrderNo(supabase, {
                schoolId,
                orderDate: form.order_date || form.report_date,
                subject: `แต่งตั้งคณะกรรมการซื้อหรือจ้างและตรวจรับพัสดุ (${meta?.activityName || '-'})`,
                subdepartmentName: meta?.subdepartmentName || 'งานพัสดุ',
                departmentName: meta?.departmentName || 'กลุ่มบริหารงบประมาณ',
                ownerName: meta?.ownerName || '-',
                refProcurementId: procurementId
            })
        }
        const recordData = {
            school_id: schoolId,
            request_id: requestId,
            report_no: form.report_no || null,
            report_date: form.report_date,
            order_no: form.order_no || null,
            order_date: form.order_date || null,
            median_order_no: form.procurement_type === 'CONSTRUCTION' ? (form.median_order_no || null) : null,
            median_order_date: form.procurement_type === 'CONSTRUCTION' ? (form.median_order_date || null) : null,
            median_report_date: form.procurement_type === 'CONSTRUCTION' ? (form.median_report_date || null) : null,
            procurement_type: form.procurement_type,
            is_wor_119: form.is_wor_119,
            procurement_method: form.procurement_method,
            price_source: form.price_source,
            median_price: Number(form.median_price) || 0,
            total_budget: Number(form.total_budget) || 0,
            reason_text: form.reason_text || null,
            delivery_due_date: form.delivery_due_date || null,
            consider_days: Number(form.consider_days) || 2,
            inspect_days: Number(form.inspect_days) || 5,
            inspector_type: form.inspector_type,
            officer_emp_code: form.officer_emp_code || null,
            head_officer_emp_code: form.head_officer_emp_code || null,
            status: 'READY',
            updated_at: new Date().toISOString()
        }

        let savedProcId = procurementId

        // 2.1 Insert หรือ Update ตารางหลัก core.procurements
        if (savedProcId) {
            const { error: updateErr } = await supabase
                .schema('core')
                .from('procurements')
                .update(recordData)
                .eq('id', savedProcId)
            if (updateErr) throw updateErr
        } else {
            const { data: insertData, error: insertErr } = await supabase
                .schema('core')
                .from('procurements')
                .insert(recordData)
                .select('id')
                .single()
            if (insertErr) throw insertErr
            savedProcId = insertData.id
        }

        // 2.2 ลบรายชื่อกรรมการชุดเดิม (ถ้ามี) แล้วบันทึกชุดใหม่ลง core.procurement_committees
        await supabase
            .schema('core')
            .from('procurement_committees')
            .delete()
            .eq('procurement_id', savedProcId)

        const validCommittees = committees
            .filter((c: any) => c.emp_code)
            .map((c: any) => ({
                procurement_id: savedProcId,
                committee_group: c.committee_group,
                emp_code: c.emp_code,
                role_in_committee: c.role_in_committee,
                seq_no: c.seq_no
            }))

        if (validCommittees.length > 0) {
            const { error: commErr } = await supabase
                .schema('core')
                .from('procurement_committees')
                .insert(validCommittees)
            if (commErr) throw commErr
        }

        return { success: true, id: savedProcId }
    } catch (error: any) {
        console.error('saveProcurementData Error:', error)
        return { success: false, error: error.message }
    }
}
// === ฟังก์ชันช่วย: คำนวณปีงบประมาณ พ.ศ. จากวันที่ (ต.ค.-ธ.ค. ปัดเป็นปีงบฯ ถัดไป) ===
function getThaiFiscalYear(dateStr?: string | null): number {
    const d = dateStr ? new Date(dateStr) : new Date()
    const year = d.getFullYear()
    const month = d.getMonth() + 1 // 1-12
    return month >= 10 ? year + 544 : year + 543
}

// === ฟังก์ชันช่วย: ออกเลขที่หนังสือภายใน (core.department_doc_logs) ===
async function issueDepartmentDocNo(
    supabase: any,
    params: {
        schoolId: string
        departmentId: string
        docPrefix: string
        docDate: string
        subject: string
    }
) {
    const fiscalYear = getThaiFiscalYear(params.docDate)

    // หา running_no ล่าสุดของ doc_prefix และปีงบประมาณเดียวกัน
    const { data: lastLog } = await supabase
        .schema('core')
        .from('department_doc_logs')
        .select('running_no')
        .eq('school_id', params.schoolId)
        .eq('doc_prefix', params.docPrefix)
        .eq('fiscal_year', fiscalYear)
        .order('running_no', { ascending: false })
        .limit(1)
        .maybeSingle()

    const nextRunningNo = (lastLog?.running_no || 0) + 1
    const fullDocNo = `${params.docPrefix}/${String(nextRunningNo).padStart(2, '0')}`

    const { error } = await supabase
        .schema('core')
        .from('department_doc_logs')
        .insert({
            school_id: params.schoolId,
            department_id: params.departmentId,
            fiscal_year: fiscalYear,
            doc_prefix: params.docPrefix,
            running_no: nextRunningNo,
            full_doc_no: fullDocNo,
            doc_date: params.docDate,
            subject: params.subject
        })

    if (error) throw error
    return fullDocNo
}

// === ฟังก์ชันช่วย: ออกเลขที่คำสั่งโรงเรียน (core.school_order_logs) ===
async function issueSchoolOrderNo(
    supabase: any,
    params: {
        schoolId: string
        orderDate: string
        subject: string
        subdepartmentName: string
        departmentName: string
        ownerName: string
        refProcurementId?: string | null
    }
) {
    const fiscalYear = getThaiFiscalYear(params.orderDate)

    // หา running_no ล่าสุดของโรงเรียนในปีงบประมาณเดียวกัน
    const { data: lastOrder } = await supabase
        .schema('core')
        .from('school_order_logs')
        .select('running_no')
        .eq('school_id', params.schoolId)
        .eq('fiscal_year', fiscalYear)
        .order('running_no', { ascending: false })
        .limit(1)
        .maybeSingle()

    const nextRunningNo = (lastOrder?.running_no || 0) + 1
    const fullOrderNo = `${nextRunningNo}/${fiscalYear}`

    const { error } = await supabase
        .schema('core')
        .from('school_order_logs')
        .insert({
            school_id: params.schoolId,
            fiscal_year: fiscalYear,
            running_no: nextRunningNo,
            full_order_no: fullOrderNo,
            order_date: params.orderDate,
            subject: params.subject,
            subdepartment_name: params.subdepartmentName,
            department_name: params.departmentName,
            owner_name: params.ownerName,
            ref_procurement_id: params.refProcurementId || null
        })

    if (error) throw error
    return fullOrderNo
}