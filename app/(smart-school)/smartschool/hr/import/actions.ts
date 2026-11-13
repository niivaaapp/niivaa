'use server'

import { createClient } from '@/utils/supabase/server';

export async function importPersonnelData(jsonData: any[]) {
    const supabase = await createClient()

    try {
        // 1. ดึง school_id ปัจจุบัน
        const { data: schools, error: schoolError } = await supabase.schema('core').from('schools').select('id').limit(1)
        if (schoolError) console.error("Supabase Fetch Error:", schoolError)
        const school_id = schools?.[0]?.id

        if (!school_id) throw new Error("ไม่พบรหัสสถานศึกษาในระบบ")

        // 2. จัดเตรียมข้อมูล (ดึงเฉพาะฟิลด์ตาม Excel Template ใหม่)
        const employeesToInsert = jsonData.map(row => {
            return {
                school_id: school_id,
                emp_code: String(row.emp_code).trim(),
                prefix: row.prefix?.trim() || null,
                first_name: row.first_name?.trim() || 'ไม่ระบุ',
                last_name: row.last_name?.trim() || 'ไม่ระบุ',
                position_title: row.position_title?.trim() || null,
                academic_standing: row.academic_standing?.trim() || null,
                gender: row.gender?.trim() || null,
                phone: row.phone ? String(row.phone).trim() : null,
                email: row.email?.trim() || null,
                // ไม่มีการยุ่งเกี่ยวกับสังกัดหรือหน้าที่ในขั้นตอนนี้
            }
        }).filter(emp => emp.emp_code !== 'undefined' && emp.emp_code !== '')

        if (employeesToInsert.length === 0) throw new Error("ไม่พบข้อมูลบุคลากรในไฟล์")

        // 3. บันทึกลงตาราง employees (1 คน = 1 บรรทัด)
        const { error: insertError } = await supabase
            .schema('core')
            .from('employees')
            .upsert(employeesToInsert, { onConflict: 'school_id, emp_code' }) 

        if (insertError) throw insertError

        return { success: true, message: `นำเข้าฐานข้อมูลบุคลากรสำเร็จจำนวน ${employeesToInsert.length} คน (รอครูเข้าระบบเพื่อระบุหน้าที่)` }

    } catch (error: any) {
        console.error("Import Personnel Error:", error)
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }
    }
}