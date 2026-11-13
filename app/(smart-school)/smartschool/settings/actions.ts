'use server'

import { createClient } from '@/utils/supabase/server';

// ดึงข้อมูลการตั้งค่าเดิม (ถ้ามี)
export async function getSchoolSettings() {
    const supabase = await createClient();
    try {
        const { data: schools } = await supabase.schema('core').from('schools').select('id, name').limit(1);
        if (!schools || schools.length === 0) return null;

        const school_id = schools[0].id;
        const { data: settings } = await supabase.schema('core').from('school_settings').select('*').eq('school_id', school_id).single();
        
        return { school_name: schools[0].name, ...settings };
    } catch (error) {
        console.error("Get Settings Error:", error);
        return null;
    }
}

// บันทึกข้อมูลการตั้งค่า
export async function saveSchoolSettings(formData: FormData) {
    const supabase = await createClient();

    try {
        const school_name = formData.get('school_name') as string;
        const district = formData.get('district') as string;
        const province = formData.get('province') as string;
        const educational_service_area = formData.get('educational_service_area') as string;
        const current_academic_year = formData.get('current_academic_year') as string;
        const current_term = formData.get('current_term') as string;

        if (!school_name) throw new Error("กรุณากรอกชื่อสถานศึกษา");

        // 1. เช็คว่ามีโรงเรียนในระบบหรือยัง
        let { data: schools, error: fetchError } = await supabase.schema('core').from('schools').select('id').limit(1);
        
        let school_id = schools?.[0]?.id;

        // 2. ถ้ายังไม่มี ให้สร้างใหม่ลงตาราง core.schools
        if (!school_id) {
            const { data: newSchool, error: insertSchoolError } = await supabase
                .schema('core')
                .from('schools')
                .insert([{ name: school_name, is_active: true }])
                .select('id')
                .single();

            if (insertSchoolError) throw insertSchoolError;
            school_id = newSchool.id;
        } else {
            // ถ้ามีแล้ว อัปเดตชื่อโรงเรียนให้ตรงกัน
            await supabase.schema('core').from('schools').update({ name: school_name }).eq('id', school_id);
        }

        // 3. บันทึก/อัปเดต ข้อมูลตั้งค่าลง core.school_settings
        const settingsData = {
            school_id: school_id,
            school_name: school_name,
            district: district || null,
            province: province || null,
            educational_service_area: educational_service_area || null,
            current_academic_year: current_academic_year || '2569',
            current_term: current_term || '1',
        };

        const { error: upsertError } = await supabase
            .schema('core')
            .from('school_settings')
            .upsert(settingsData, { onConflict: 'school_id' });

        if (upsertError) throw upsertError;

        return { success: true, message: "บันทึกข้อมูลสถานศึกษาเรียบร้อยแล้ว" };

    } catch (error: any) {
        console.error("Save Settings Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
    }
}