'use server'

import { createClient } from '@/utils/supabase/server'

export async function getWor119SetupData(requestId: string) {
    const supabase = await createClient()
    try {
        const { data: req, error: reqError } = await supabase
            .schema('core')
            .from('activity_requests')
            .select('*')
            .eq('id', requestId)
            .single()
        if (reqError) throw reqError

        const [activityRes, schoolRes, materialsRes, procRes, vendorsRes,employeesRes,
            deptRes ] = await Promise.all([
            // ใน Promise.all เพิ่ม 2 บรรทัดนี้:
            supabase.schema('core').from('employees').select('*').eq('school_id', req.school_id),
            supabase.schema('core').from('departments').select('*').eq('id', req.department_id).maybeSingle(),
            supabase.schema('core').from('activities').select('*').eq('id', req.activity_id).single(),
            supabase.schema('core').from('schools').select('*').eq('id', req.school_id).single(),
            supabase.schema('core').from('request_expense_items').select('*').eq('request_id', requestId).order('seq_no', { ascending: true }),
            supabase.schema('core').from('procurements').select('*').eq('request_id', requestId).limit(1),
            supabase.schema('core').from('vendors').select('*').eq('school_id', req.school_id).order('vendor_name', { ascending: true })
        ])

        // ดึงคลังพัสดุกลาง (ลองจาก schema 'core' ก่อน ถ้าติด error ให้ลอง 'public' อัตโนมัติ)
        let catalogMaterials: any[] = []
        const coreCatalogRes = await supabase
            .schema('core')
            .from('material_catalog')
            .select('*')
            .range(0, 999)

        if (!coreCatalogRes.error && coreCatalogRes.data) {
            catalogMaterials = coreCatalogRes.data
            // กรณีมีมากกว่า 1,000 รายการ ดึงชุดที่ 2 ต่อ
            if (coreCatalogRes.data.length === 1000) {
                const { data: page2 } = await supabase
                    .schema('core')
                    .from('material_catalog')
                    .select('*')
                    .range(1000, 1999)
                if (page2) catalogMaterials = [...catalogMaterials, ...page2]
            }
        } else {
            console.warn('core.material_catalog error, trying public schema:', coreCatalogRes.error?.message)
            const publicCatalogRes = await supabase
                .from('material_catalog')
                .select('*')
                .range(0, 999)
            if (!publicCatalogRes.error && publicCatalogRes.data) {
                catalogMaterials = publicCatalogRes.data
            } else {
                console.error('public.material_catalog error:', publicCatalogRes.error?.message)
            }
        }

        console.log(`[Wor119] Loaded material_catalog: ${catalogMaterials.length} items`)

        const procurement = procRes.data?.[0] || null
        let receipts: any[] = []

        if (procurement) {
            const { data: recData } = await supabase
                .schema('core')
                .from('wor119_receipts')
                .select('*')
                .eq('procurement_id', procurement.id)
                .order('seq_no', { ascending: true })
            receipts = recData || []
        }

        return {
            success: true,
            data: {
                req,
                activity: activityRes.data,
                school: schoolRes.data,
                materials: materialsRes.data || [],
                employees: employeesRes.data || [],
                deptInfo: deptRes.data || null,
                catalogMaterials,
                procurement,
                vendors: vendorsRes.data || [],
                receipts
            }
        }
    } catch (error: any) {
        console.error('getWor119SetupData Error:', error)
        return { success: false, error: error.message }
    }
}

export async function saveWor119Receipts(payload: {
    schoolId: string
    procurementId: string
    receipts: any[]
}) {
    const supabase = await createClient()
    try {
        const { schoolId, procurementId, receipts } = payload
        const grandTotal = receipts.reduce((sum, r) => sum + Number(r.total_amount || 0), 0)

        if (grandTotal > 10000) {
            return { success: false, error: 'วงเงินรวมเกิน 10,000 บาท ไม่สามารถบันทึกตามแนวทาง ว 119 ได้' }
        }

        // ลบรายการเดิมของ procurement_id นี้แล้วบันทึกชุดใหม่ (ป้องกันข้อมูลค้าง)
        const { error: delError } = await supabase
            .schema('core')
            .from('wor119_receipts')
            .delete()
            .eq('procurement_id', procurementId)
        if (delError) throw delError

        if (receipts.length > 0) {
            const rowsToInsert = receipts.map((r, idx) => ({
                school_id: schoolId,
                procurement_id: procurementId,
                seq_no: idx + 1,
                expense_category: r.expense_category || 'BUY',
                title_label: r.title_label || (r.expense_category === 'HIRE' ? 'ค่าจ้าง' : 'ค่าวัสดุ'),
                vendor_id: r.vendor_id || null,
                vendor_name: r.vendor_name || '',
                vendor_address: r.vendor_address || '',
                receipt_book_no: r.receipt_book_no || '',
                receipt_no: r.receipt_no || '',
                receipt_date: r.receipt_date || null,
                items: r.items || [],
                total_amount: Number(r.total_amount) || 0,
                updated_at: new Date().toISOString()
            }))

            const { error: insError } = await supabase
                .schema('core')
                .from('wor119_receipts')
                .insert(rowsToInsert)
            if (insError) throw insError
        }

        // อัปเดตสถานะ is_wor_119 = true ใน core.procurements
        await supabase
            .schema('core')
            .from('procurements')
            .update({ is_wor_119: true, updated_at: new Date().toISOString() })
            .eq('id', procurementId)

        return { success: true }
    } catch (error: any) {
        console.error('saveWor119Receipts Error:', error)
        return { success: false, error: error.message }
    }
}