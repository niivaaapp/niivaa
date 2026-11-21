import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ShareClient, { SharePlaylistData } from './ShareClient';

// 🌟 บังคับให้ดึงข้อมูลสดจาก Supabase ทุกครั้ง (ไม่แคชข้อมูลเก่า)
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ตรวจสอบรูปแบบ UUID ป้องกัน Supabase Error เมื่อมีคนพิมพ์ URL มั่ว (เช่น /share/demo)
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSharedPlaylist(id: string): Promise<SharePlaylistData | null> {
  if (!UUID_REGEX.test(id)) return null;

  // 1. ดึงข้อมูลอัลบั้ม (เฉพาะที่เปิด is_public = true)
  const { data: playlist, error: pError } = await supabase
    .from('playlists')
    .select('id, name, type, description, creator_name, is_public, share_code')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();

  if (pError) {
    console.error('Supabase Playlist Error:', pError.message);
    return null;
  }
  if (!playlist) return null;

  // 2. ดึงคิวเพลงจริงในอัลบั้มนั้น
  const { data: tracksData, error: tError } = await supabase
    .from('tracks')
    .select(`
      id,
      video_id,
      alias_name,
      start_time,
      skip_start,
      skip_end,
      end_time,
      is_app_intro,
      order_index,
      master_songs (
        title,
        thumbnail_url
      )
    `)
    .eq('playlist_id', id)
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  if (tError) {
    console.error('Supabase Tracks Error:', tError.message);
    return null;
  }

  const formattedTracks = (tracksData || []).map((t: any) => ({
    id: t.id,
    video_id: t.video_id,
    title: t.master_songs?.title || t.alias_name || 'ไม่มีชื่อรายการ',
    alias_name: t.alias_name || '',
    thumbnail_url:
      t.master_songs?.thumbnail_url ||
      `https://img.youtube.com/vi/${t.video_id}/hqdefault.jpg`,
    start_time: Number(t.start_time) || 0,
    skip_start: Number(t.skip_start) || 0,
    skip_end: Number(t.skip_end) || 0,
    end_time: Number(t.end_time) || 0,
    is_app_intro: Boolean(t.is_app_intro),
  }));

  return {
    id: playlist.id,
    name: playlist.name || 'ชุดสื่อ NiiVaa SmartMedia',
    creator_name: playlist.creator_name || 'สมาชิก NiiVaa',
    share_code: playlist.share_code || '', // 🌟 เพิ่มบรรทัดนี้
    type:
      playlist.type === 'education' || playlist.type === 'karaoke'
        ? playlist.type
        : 'listening',
    description: playlist.description || '',
    tracks: formattedTracks,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playlist = await getSharedPlaylist(id);

  if (!playlist) {
    return { title: 'ไม่พบชุดสื่อ หรือถูกปิดการแชร์แล้ว | NiiVaa SmartMedia' };
  }

  const coverImage =
    playlist.tracks[0]?.thumbnail_url || 'https://niivaa.com/og-default.jpg';

  return {
    title: `${playlist.name} | NiiVaa SmartMedia`,
    description:
      playlist.description ||
      `รับชมชุดสื่อ "${playlist.name}" (${playlist.tracks.length} รายการ) ไม่มีโฆษณาคั่นบน NiiVaa SmartMedia`,
    openGraph: {
      title: `🎵 ${playlist.name}`,
      description:
        playlist.description ||
        `โดย ${playlist.creator_name} • ทั้งหมด ${playlist.tracks.length} รายการบน NiiVaa SmartMedia`,
      images: [{ url: coverImage, width: 480, height: 360, alt: playlist.name }],
      type: 'website',
    },
  };
}

export default async function SharePlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playlist = await getSharedPlaylist(id);

  if (!playlist || playlist.tracks.length === 0) {
    notFound();
  }

  return <ShareClient playlist={playlist} />;
}