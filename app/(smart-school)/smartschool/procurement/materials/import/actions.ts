'use server'

import { createClient } from '@/utils/supabase/server';

export async function importMaterialData(jsonData: any[]) {
    const supabase = await createClient();

    try {
        // 1. ดึงข้อมูล School ID
        const { data: schools, error: schoolError } = await supabase.schema('core').from('schools').select('id').limit(1);
        if (schoolError) throw schoolError;
        const school_id = schools?.[0]?.id;
        if (!school_id) throw new Error("ไม่พบข้อมูลสถานศึกษา กรุณาตั้งค่าโรงเรียนก่อน");

        if (!jsonData || jsonData.length === 0) {
            throw new Error("ไม่พบข้อมูลที่ถูกต้องในไฟล์ Excel");
        }

        // 2. จัดเตรียมข้อมูลก่อน Insert
        const materialsToInsert = jsonData.map(item => ({
            school_id: school_id,
            item_name: item.item_name,
            category: item.category,
            unit_name: item.unit_name,
            default_price: item.default_price,
            brand: item.brand
        }));

        // 3. ลบข้อมูลพัสดุเดิมของโรงเรียนนี้ทิ้งทั้งหมดก่อน (เพื่อ Refresh ฐานข้อมูลใหม่ ป้องกันข้อมูลซ้ำซ้อนเวลาอัปเดตราคา)
        // *หากต้องการให้เป็นการ "เพิ่มสะสม" สามารถลบบรรทัด delete() นี้ออกได้ครับ
        await supabase.schema('core').from('material_catalog').delete().eq('school_id', school_id);

        // 4. บันทึกข้อมูลใหม่
        const { error: insertError } = await supabase.schema('core').from('material_catalog').insert(materialsToInsert);
        
        if (insertError) throw new Error("บันทึกข้อมูลพัสดุล้มเหลว: " + insertError.message);

        return { 
            success: true, 
            message: `นำเข้าฐานข้อมูลพัสดุสำเร็จจำนวน ${materialsToInsert.length} รายการ` 
        };

    } catch (error: any) {
        console.error("Import Material Error:", error);
        return { success: false, message: error.message || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ" };
    }
}