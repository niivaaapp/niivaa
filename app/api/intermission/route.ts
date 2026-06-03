import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. ดึงสถานะมาสเตอร์สวิตช์ก่อนว่าเปิดอยู่หรือไม่
    const { data: config, error: configError } = await supabase
      .from('live_announcements')
      .select('is_intermission_active')
      .eq('id', 1)
      .maybeSingle();

    if (configError) throw configError;

    // ถ้าแอดมินปิดสวิตช์ไว้ ให้ส่งอาร์เรย์ว่างกลับไปทันที
    if (!config || !config.is_intermission_active) {
      return NextResponse.json({ active: false, media: [] });
    }

    // 2. ดึงรายการรูปภาพ/วิดีโอคั่นเวลาที่พี่กดเปิดใช้งาน (สีส้ม) ไว้
    const { data: media, error: mediaError } = await supabase
      .from('intermission_media')
      .select('id, media_url, media_type, media_name')
      .eq('isselected_for_loop', true);

    if (mediaError) throw mediaError;

    return NextResponse.json({
      active: true,
      media: media || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}