// app/(event)/events/event-dashboard/create/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function createEventAction(formData: FormData) {
  const supabase = await createClient();
  
  // 1. เช็คสิทธิ์ผู้ใช้
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("หมดอายุการเชื่อมต่อ กรุณาล็อกอินใหม่");

  // 2. ดึง org_id ของผู้ใช้
  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();

  const orgId = member?.org_id;

  // 3. รับค่าจากฟอร์ม
  const title = formData.get('title') as string;
  const brand_name = formData.get('brand_name') as string; // 🌟 เพิ่มรับค่าแบรนด์/ผู้จัดงาน
  const event_date = formData.get('event_date') as string;
  const start_time = formData.get('start_time') as string;
  const category = formData.get('category') as string;
  const location_hotel = formData.get('location_hotel') as string;
  const location_district = formData.get('location_district') as string;
  const location_province = formData.get('location_province') as string;

  if (!title) {
    return { error: "กรุณาระบุชื่ออีเวนต์" };
  }

  // 4. บันทึกลงฐานข้อมูลตาราง events
  const { data, error } = await supabase.from('events').insert({
    user_id: user.id,
    org_id: orgId,
    title: title,
    brand_name: brand_name, // 🌟 บันทึกลงฐานข้อมูล
    event_date: event_date || null,
    start_time: start_time || '09:00',
    category: category || 'seminar',
    location_hotel: location_hotel,
    location_district: location_district,
    location_province: location_province || 'สุรินทร์',
    status: 'active' // ตั้งให้ active เลย
  }).select('id').single();

  if (error) {
    console.error("Create Event Error:", error);
    return { error: `สร้างงานล้มเหลว: ${error.message}` };
  }

  // 5. 🌟 สำเร็จ! พาทะลุเข้าหน้า Dashboard ของอีเวนต์นี้ทันที
  redirect(`/events/event-dashboard/${data.id}`);
}