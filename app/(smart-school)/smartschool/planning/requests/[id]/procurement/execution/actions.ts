'use server'

import { createClient } from '@/utils/supabase/server' // ปรับ path ให้ตรงกับไฟล์ procurement/actions.ts เดิม

function getThaiFiscalYear(dateStr?: string | null): number {
    const d = dateStr ? new Date(dateStr) : new Date()
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    return month >= 10 ? year + 544 : year + 543
}

// === 1. ดึงข้อมูลตั้งต้นสำหรับหน้า Execution ===
export async function getExecutionSetupData(requestId: string) {
    const supabase = await createClient()
    try {
        const { data: req, error: reqError } = await supabase
            .schema('core')
            .from('activity_requests')
            .select('*')
            .eq('id', requestId)
            .single()
        if (reqError) throw reqError

        const [activityRes, schoolRes, employeesRes, materialsRes, procRes, vendorsRes] = await Promise.all([
            supabase.schema('core').from('activities').select('*').eq('id', req.activity_id).single(),
            supabase.schema('core').from('schools').select('*').eq('id', req.school_id).single(),
            supabase.schema('core').from('employees').select('*').eq('school_id', req.school_id).order('first_name', { ascending: true }),
            supabase.schema('core').from('request_expense_items').select('*').eq('request_id', requestId).eq('expense_type', 'MATERIAL').order('seq_no', { ascending: true }),
            supabase.schema('core').from('procurements').select('*').eq('request_id', requestId).limit(1),
            supabase.schema('core').from('vendors').select('*').eq('school_id', req.school_id).order('vendor_name', { ascending: true })
        ])

        const procurement = procRes.data?.[0] || null
        let existingExecution = null

        if (procurement) {
            const { data: execData } = await supabase
                .schema('core')
                .from('procurement_executions')
                .select('*')
                .eq('procurement_id', procurement.id)
                .maybeSingle()
            existingExecution = execData || null
        }

        return {
            success: true,
            data: {
                req,
                activity: activityRes.data,
                school: schoolRes.data,
                employees: employeesRes.data || [],
                materials: materialsRes.data || [],
                procurement,
                vendors: vendorsRes.data || [],
                existingExecution
            }
        }
    } catch (error: any) {
        console.error('getExecutionSetupData Error:', error)
        return { success: false, error: error.message }
    }
}

// === 2. เพิ่มร้านค้า/ผู้รับจ้างใหม่เข้าทะเบียนกลาง ===
export async function createVendor(payload: {
    school_id: string
    vendor_name: string
    vendor_type: string
    tax_id?: string
    address?: string
    phone?: string
    bank_name?: string
    bank_account_no?: string
    bank_account_name?: string
    is_vat_registered: boolean
}) {
    const supabase = await createClient()
    try {
        const { data, error } = await supabase
            .schema('core')
            .from('vendors')
            .insert(payload)
            .select('*')
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// === 3. บันทึกข้อมูลการดำเนินการ + รันเลข PO / ใบตรวจรับ / ใบเบิกอัตโนมัติ ===
export async function saveExecutionData(payload: {
    executionId?: string | null
    schoolId: string
    procurementId: string
    procurementType: string
    form: any
}) {
    const supabase = await createClient()
    try {
        const { schoolId, procurementId, procurementType, form } = payload
        const fiscalYear = getThaiFiscalYear(form.po_date || form.quotation_date)

        let poRunningNo = form.po_running_no || null
        let poNo = form.po_no?.trim() || ''
        let inspectionRunningNo = form.inspection_running_no || null
        let inspectionNo = form.inspection_no?.trim() || ''
        let requisitionRunningNo = form.requisition_running_no || null
        let requisitionNo = form.requisition_no?.trim() || ''

        // รันเลขใบสั่งซื้อ/สั่งจ้าง (PO) อัตโนมัติถ้าเว้นว่าง
        if (!poNo) {
            const { data: lastPo } = await supabase
                .schema('core')
                .from('procurement_executions')
                .select('po_running_no')
                .eq('school_id', schoolId)
                .eq('fiscal_year', fiscalYear)
                .not('po_running_no', 'is', null)
                .order('po_running_no', { ascending: false })
                .limit(1)
                .maybeSingle()

            poRunningNo = (lastPo?.po_running_no || 0) + 1
            poNo = `${poRunningNo}/${fiscalYear}`
        }

        // รันเลขใบตรวจรับพัสดุอัตโนมัติถ้าเว้นว่าง
        if (!inspectionNo) {
            const { data: lastInsp } = await supabase
                .schema('core')
                .from('procurement_executions')
                .select('inspection_running_no')
                .eq('school_id', schoolId)
                .eq('fiscal_year', fiscalYear)
                .not('inspection_running_no', 'is', null)
                .order('inspection_running_no', { ascending: false })
                .limit(1)
                .maybeSingle()

            inspectionRunningNo = (lastInsp?.inspection_running_no || 0) + 1
            inspectionNo = `ร ${String(inspectionRunningNo).padStart(3, '0')}/${fiscalYear}`
        }

        // รันเลขใบเบิกพัสดุอัตโนมัติ (เฉพาะงานซื้อวัสดุ)
        if (procurementType === 'BUY' && !requisitionNo) {
            const { data: lastReq } = await supabase
                .schema('core')
                .from('procurement_executions')
                .select('requisition_running_no')
                .eq('school_id', schoolId)
                .eq('fiscal_year', fiscalYear)
                .not('requisition_running_no', 'is', null)
                .order('requisition_running_no', { ascending: false })
                .limit(1)
                .maybeSingle()

            requisitionRunningNo = (lastReq?.requisition_running_no || 0) + 1
            requisitionNo = `บ ${String(requisitionRunningNo).padStart(3, '0')}/${fiscalYear}`
        }

        const record = {
            school_id: schoolId,
            procurement_id: procurementId,
            vendor_id: form.vendor_id || null,
            fiscal_year: fiscalYear,
            quoted_total: Number(form.quoted_total) || 0,
            vat_mode: form.vat_mode || 'NONE',
            vat_amount: Number(form.vat_amount) || 0,
            net_amount: Number(form.net_amount) || 0,
            quotation_no: form.quotation_no || null,
            po_running_no: poRunningNo,
            po_no: poNo,
            delivery_note_no: form.delivery_note_no || null,
            incoming_doc_no: form.incoming_doc_no || null,
            incoming_doc_date: form.incoming_doc_date || null,
            inspection_running_no: inspectionRunningNo,
            inspection_no: inspectionNo,
            requisition_running_no: procurementType === 'BUY' ? requisitionRunningNo : null,
            requisition_no: procurementType === 'BUY' ? requisitionNo : null,
            quotation_date: form.quotation_date || null,
            eval_report_date: form.eval_report_date || null,
            announce_date: form.announce_date || null,
            po_date: form.po_date || null,
            delivery_date: form.delivery_date || null,
            inspection_date: form.inspection_date || null,
            requisition_date: procurementType === 'BUY' ? (form.requisition_date || null) : null,
            credit_days: Number(form.credit_days) || 30,
            warranty_days: Number(form.warranty_days) || 0,
            guarantee_type: form.guarantee_type || null,
            guarantee_amount: Number(form.guarantee_amount) || 0,
            requester_emp_code: procurementType === 'BUY' ? (form.requester_emp_code || null) : null,
            status: 'READY',
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .schema('core')
            .from('procurement_executions')
            .upsert(record, { onConflict: 'procurement_id' })
            .select('id')
            .single()

        if (error) throw error
        return { success: true, id: data.id }
    } catch (error: any) {
        console.error('saveExecutionData Error:', error)
        return { success: false, error: error.message }
    }
}