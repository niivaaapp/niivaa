'use server'

import { createClient } from '@/utils/supabase/server';

export async function checkAttendeeQuota(eventId: string) {
  try {
    const supabase = await createClient();

    // 🌟 1. หา org_id ของ Event นี้
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('org_id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !event?.org_id) {
      throw new Error('ไม่พบข้อมูลอีเวนต์หรือองค์กร');
    }

    // 🌟 2. หา Subscription ปัจจุบันขององค์กรนี้
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        status,
        plans (
          tier,
          features
        )
      `)
      .eq('org_id', event.org_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 🌟 3. อ่านค่าโควตาจาก JSONB (จัดการ Type Safety และป้องกัน Null/Array ทั้งหมดเรียบร้อย)
    let maxAttendees = 20; // ค่าเริ่มต้น (Fallback)
    
    // จัดการแปลงโครงสร้าง plans ให้ปลอดภัยไม่ว่าจะมาเป็น Array หรือ Object เดี่ยว
    const planData = sub?.plans 
      ? (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) 
      : null;

    if (planData && typeof planData === 'object') {
      const features = (planData.features || {}) as { max_attendees?: number };
      
      if (features.max_attendees !== undefined) {
        maxAttendees = features.max_attendees;
      } else if (planData.tier === 'premium') {
        maxAttendees = 999999; // ถ้าเป็น Premium แต่ลืมใส่ limit ให้ถือว่าไม่จำกัด
      }
    }

    // 🌟 4. นับจำนวนผู้เข้าร่วม "ปัจจุบัน" ในอีเวนต์นี้
    const { count, error: countError } = await supabase
      .from('event_attendees')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    const currentCount = count || 0;
    const isFull = maxAttendees !== -1 && currentCount >= maxAttendees; // ถ้าระบุ -1 คือไม่จำกัด

    return {
      success: true,
      allowed: !isFull,
      currentCount,
      maxAttendees,
      remaining: maxAttendees - currentCount,
      eventName: event.title,
      tier: planData?.tier || 'free'
    };

  } catch (error: any) {
    console.error("Gatekeeper Error:", error);
    return { success: false, error: error.message };
  }
}