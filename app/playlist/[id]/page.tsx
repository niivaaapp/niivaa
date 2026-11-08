'use client'

import ManualDrawer from '@/components/ManualDrawer';
import Link from 'next/link';
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  LayoutGrid,
  Play, Search, Info, Mic, Trash2, Maximize, Settings, Music, Zap, Plus,
  CheckCircle2, ToggleLeft, ToggleRight, ListMusic, X, SkipForward,
  Headphones, Mic2, Minimize, ChevronDown, Save, Globe, User, RefreshCw
} from 'lucide-react';

// --- [PRE-INITIALIZATION] ---
// ตรวจสอบและโหลด YouTube API ครั้งเดียว
if (typeof window !== 'undefined' && !document.getElementById('youtube-api')) {
  const tag = document.createElement('script');
  tag.id = 'youtube-api';
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

export default function SmartKaraokePage({ params }: { params: any }) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const isMutedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  if (typeof window !== 'undefined' && !hasInitializedRef.current) {
    const params = new URLSearchParams(window.location.search);

    // 🌟 1. เช็กว่า URL ตอนนี้มีคำสั่งบังคับเปิดเสียงหรือไม่
    let forceAudio = params.get('forceAudio') === 'true';

    // 🌟 2. ใช้ window.name เป็น "ความจำถาวร" ของจอจิ๋วนี้
    if (forceAudio) {
      // ถ้ามีคำสั่งมาจาก URL ให้สลักความจำไว้ที่หน้าต่างนี้เลย
      window.name = 'FORCE_AUDIO_ACTIVE';
    } else if (window.name === 'FORCE_AUDIO_ACTIVE') {
      // ถ้ารอบนี้ URL เปลี่ยนแล้วพารามิเตอร์หายไป แต่หน้าต่างนี้มีความจำฝังอยู่ ก็ให้เปิดเสียงต่อ!
      forceAudio = true;
    }

    let preview = params.get('preview') === 'true';

    // ถ้าอยู่ในกรอบ Iframe บังคับเป็น Preview
    if (window.self !== window.top) {
      preview = true;
    }

    // ตัวแปรชี้ขาด: จะปิดเสียงก็ต่อเมื่อเป็น Preview และไม่ได้ถูกบังคับให้เปิดเสียง
    isMutedRef.current = preview && !forceAudio;
    hasInitializedRef.current = true;
  }

  // 🌟 2. บังคับเคลียร์เพลงที่ค้างอยู่ตอนรีเฟรชหน้า เพื่อให้วิ่งไปเข้าลอจิกเล่น Promo Video เสมอ
  useEffect(() => {
    setCurrentVideoId(null);
    setIsAppStarted(false);
    setPromoLoopCount(0); // เริ่มนับรอบโปรโมทใหม่ที่ 0 (รอบแรกมีเสียง)
  }, []);

  // 🌟 1. เปลี่ยนมาใช้ State เพื่อเก็บสถานะการซ่อนปุ่ม
  const [isCompact, setIsCompact] = useState(false);

  // 🌟 2. ใช้ useEffect ดักจับและจดจำสถานะลงใน Iframe
  useEffect(() => {
    // ก. เช็คว่ามี ?compact=true ส่งมาใน URL หรือไม่ (ตอนเปิดจอลอยครั้งแรก)
    const compactFromUrl = searchParams.get('compact') === 'true';

    if (compactFromUrl) {
      // ถ้ามี ให้ซ่อนปุ่ม และ "จดจำ" ไว้ในความจำของเบราว์เซอร์
      setIsCompact(true);
      sessionStorage.setItem('niivaa_compact_mode', 'true');
    } else {
      // ข. ถ้า URL ไม่มีพารามิเตอร์แล้ว (เพราะเพิ่งกดเปลี่ยนเพลง) ให้ไปค้นดูว่าเคยจำไว้ไหม
      const savedMode = sessionStorage.getItem('niivaa_compact_mode') === 'true';
      setIsCompact(savedMode);
    }
  }, [searchParams]);

  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  // 1. การรับค่าพารามิเตอร์
  const { id: playlistId } = React.use(params) as any;
  const router = useRouter();
  const [isManualOpen, setIsManualOpen] = useState(false);
  // --- [STATES - ระบบเล่นเพลง] ---
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlistInfo, setPlaylistInfo] = useState<any>(null);
  const [allPlaylists, setAllPlaylists] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNextQueue, setShowNextQueue] = useState(false);
  const playerRef = useRef<any>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null); // 🎯 [เพิ่มใหม่]: คุมแท็กวิดีโอของระบบ Storage

  // 🎯 [ปรับใหม่]: เปลี่ยนจาก ID ยูทูป มาใส่ลิงก์ URL วิดีโอ MP4 จากตู้เก็บไฟล์ promo-videos ของพี่ครับ (ใส่ได้หลายตัวระบบจะสุ่มให้เอง)
  const PROMO_VIDEOS = [
    'https://[โปรดแก้เป็น URL ของพี่]/storage/v1/object/public/promo-videos/promo_v1.mp4',
    'https://[โปรดแก้เป็น URL ของพี่]/storage/v1/object/public/promo-videos/promo_v2.mp4'
  ];

  // --- [STATES - ระบบค้นหาและข้อมูลเพลง] ---
  const [query, setQuery] = useState(''); // ข้อความในช่องค้นหา
  const [results, setResults] = useState<any[]>([]); // ผลลัพธ์จากการค้นหา (UI)
  const [allMasterSongs, setAllMasterSongs] = useState<any[]>([]); // คลังเพลงทั้งหมดสำหรับ AI ค้นหา
  const [selectedResults, setSelectedResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false); // สถานะไมค์ 1
  const [isSmartListening, setIsSmartListening] = useState(false); // สถานะไมค์ 2
  const [isInstantListening, setIsInstantListening] = useState(false);//6มิย69ไมค์ค้นเล่นทันที
  // --- [STATES - โหมดและประกาศ] ---
  const [isKaraokeMode, setKaraokeMode] = useState(false);
  const [isListeningMode, setListeningMode] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [announcement, setAnnouncement] = useState('ยินดีต้อนรับสู่ NiiVaa SmartKaraoke');
  const [isLooping, setIsLooping] = useState(true);
  const [editingTrack, setEditingTrack] = useState<any | null>(null);

  // 🌟 State สำหรับจัดการข้อความวิ่ง (Marquee) แจ้งคิวถัดไป
  const [isQueueMarquee, setIsQueueMarquee] = useState(false);
  const [queueMarqueeText, setQueueMarqueeText] = useState("");
  const marqueeTriggerRef = useRef(false);
  const marqueeTimeoutRef = useRef<any>(null); // 👈 [เพิ่มใหม่] ตัวจับเวลา

  // 🌟 [เพิ่มใหม่] ตัวแปรสำหรับคำนวณเวลาตัดต่อ SME
  const [vidDuration, setVidDuration] = useState(0);
  const [cutTail, setCutTail] = useState(0);
  const [skipS, setSkipS] = useState(0);
  const [skipE, setSkipE] = useState(0);
  
  // 🌟 [เพิ่มใหม่] วางฟังก์ชันตัวช่วยกรองเพลงไว้ตรงนี้ครับ
  const isValidMode = (title: string) => {
    if (!title) return false;
    const lowerTitle = title.toLowerCase();
    const isK = lowerTitle.includes('karaoke') || lowerTitle.includes('คาราโอเกะ');

    // ถ้าเปิดโหมดไมค์ (คาราโอเกะ) แต่ชื่อเพลง "ไม่มี" คำว่าคาราโอเกะ -> คัดทิ้ง
    if (isKaraokeMode && !isK) return false;
    
    // ถ้าเปิดโหมดหูฟัง (ฟังเพลง) แต่ชื่อเพลง "มี" คำว่าคาราโอเกะ -> คัดทิ้ง
    if (isListeningMode && isK) return false;

    return true; // ถ้าผ่านเงื่อนไข (หรือไม่ได้เปิดโหมดไหนเลย) ให้เอาเพลงนี้
  };

  // 🌟 รีเซ็ตแค่ตัวล็อค (ให้เพลงใหม่พร้อมจับเวลา 10 วิสุดท้ายได้) 
  // แต่ไม่ตัดข้อความวิ่งทิ้ง ปล่อยให้มันเล่นคร่อมเพลงใหม่ไปจนจบ 1 รอบ
  useEffect(() => {
    marqueeTriggerRef.current = false;
  }, [currentVideoId]);
  // ดึงความยาววิดีโอจาก YouTube อัตโนมัติเมื่อกดเปิด Modal
  useEffect(() => {
    if (editingTrack) {
      setSkipS(editingTrack.skip_start || 0);
      setSkipE(editingTrack.skip_end || 0);

      const fetchVideoDuration = async () => {
        try {
          const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg"; // ⚠️ อย่าลืมใส่ API Key ของคุณครับ
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${editingTrack.video_id}&part=contentDetails&key=${apiKey}`);
          const data = await res.json();

          if (data.items && data.items.length > 0) {
            const iso = data.items[0].contentDetails.duration;
            const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            const h = parseInt(match[1] || '0') || 0;
            const m = parseInt(match[2] || '0') || 0;
            const s = parseInt(match[3] || '0') || 0;
            const totalSeconds = (h * 3600) + (m * 60) + s;

            setVidDuration(totalSeconds);

            if (editingTrack.end_time > 0 && editingTrack.end_time < totalSeconds) {
              setCutTail(totalSeconds - editingTrack.end_time);
            } else {
              setCutTail(0);
            }
          }
        } catch (err) {
          setVidDuration(0);
          setCutTail(0);
        }
      };
      fetchVideoDuration();
    }
  }, [editingTrack]);
  // state คุม Modal การค้นหา manual 
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [singerName, setSingerName] = useState('');

  // วางฟังก์ชันนี้ไว้ใน Playlist Component
  const triggerLyrics = async (v_id: string) => {
    await supabase
      .from('current_playing')
      .upsert({
        playlist_id: playlistId, // 🌟 ใช้รหัส Playlist เป็นชื่อห้อง
        video_id: v_id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'playlist_id' }); // ถ้ามีห้องนี้แล้วให้อัปเดต
  };


  // ตอนที่พี่สั่งเล่นเพลง (ในปุ่ม Play หรือฟังก์ชันเปิดวิดีโอ)
  const handlePlay = (track: any) => {
    setPlayingVideoId(track.video_id); // เล่นเพลงในหน้าปัจจุบัน
    triggerLyrics(track.video_id);    // ส่งสัญญาณไปที่หน้า Lyrics (Tab อื่น)

    // ⚡ แทรกโค้ด Media Session API อัปเดตข้อมูลขึ้นหน้าจอล็อกมือถือ
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.master_songs?.title || track.title || 'NiiVaa คาราโอเกะ',
        artist: 'NiiVaa Smart System',
        artwork: (track.master_songs?.thumbnail_url || track.thumbnail_url) ? [
          { src: track.master_songs?.thumbnail_url || track.thumbnail_url, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });
    }
  };

  // ฟังก์ชันสำหรับส่งสัญญาณเปลี่ยนเพลงไปที่หน้า Lyrics อัตโนมัติ
  const syncCurrentPlaying = async (video_id: string, title: string) => {
    try {
      console.log("📡 กำลังส่งสัญญาณเปลี่ยนเพลงไปที่หน้า Lyrics...");

      const { error } = await supabase
        .from('current_playing')
        .upsert({
          playlist_id: playlistId, // 🌟 เปลี่ยนมาใช้รหัส Playlist แบ่งห้อง
          video_id: video_id,
          title: title,
          updated_at: new Date().toISOString()
        }, { onConflict: 'playlist_id' }); // 🌟 ถ้ามีห้องนี้แล้วให้อัปเดต ถ้ายังไม่มีให้สร้างใหม่

      if (error) throw error;
      console.log("✅ ส่งสัญญาณสำเร็จ!");
    } catch (err: any) {
      console.error("❌ ส่งสัญญาณพลาด:", err.message);
    }
  };

  // --- [FETCH DATA - โหลดข้อมูลจาก Database] ---
  const fetchAllData = useCallback(async () => {
    try {
      // 🌟 1. ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่ปัจจุบัน
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("ไม่มีสิทธิ์เข้าถึง หรือเซสชันหมดอายุ");
        // ถ้าจำเป็น สามารถเพิ่ม router.push('/login') ตรงนี้ได้ครับ
        return;
      }

      // 🌟 2. ดึง Playlist "เฉพาะที่เป็นของ User คนนี้เท่านั้น"
      const { data: allP, error: pError } = await supabase
        .from('playlists')
        .select('*, tracks(count)')
        .eq('user_id', user.id); // 👈 ใช้ user_id ตามโครงสร้างตารางของคุณ

      if (pError) throw pError;

      if (allP) {
        const formattedPlaylists = allP.map(p => ({
          ...p,
          tracks_count: p.tracks?.[0]?.count || 0
        }));
        setAllPlaylists(formattedPlaylists);

        const currentPlay = formattedPlaylists.find(p => p.id === playlistId);

        // 🌟 3. ป้องกันการแอบเอา URL (id) ของคนอื่นมาเปิด
        // ถ้าหา id นี้ไม่เจอในรายการของตัวเอง ให้ดีดกลับหน้า Dashboard ทันที
        if (!currentPlay && allP.length > 0) {
          alert("คุณไม่มีสิทธิ์เข้าถึงเพลย์ลิสต์นี้ หรือไม่มีข้อมูลในระบบ!");
          window.location.href = '/smart-media-dashboard';
          return;
        }

        if (currentPlay) setPlaylistInfo(currentPlay);
      }

      // 4. ดึงคลังเพลงทั้งหมด (ส่วนกลาง)
      const { data: mData } = await supabase.from('master_songs').select('*');
      if (mData) setAllMasterSongs(mData);

      // 5. ดึงคิวเพลงใน Playlist (ปลอดภัยแล้ว เพราะดัก currentPlay ไว้ด้านบน)
      const { data: tData, error } = await supabase
        .from('tracks')
        .select(`*, master_songs(*)`)
        .eq('playlist_id', playlistId)
        .order('order_index', { ascending: true });
      setTracks(tData || []);

      // ตั้งค่าเพลงโปรโมทตอนเริ่มต้น
      // 🎯 [ปรับใหม่]: ดึงวิดีโอโปรโมทจากคลังตารางส่วนกลางบน Supabase มาสุ่มเล่นแทนแบบ Dynamic
      const { data: promoData } = await supabase.from('promo_videos').select('video_url');
      if (promoData && promoData.length > 0) {
        const globalUrls = promoData.map(v => v.video_url);

        if (!currentVideoId && !promoId) {
          const randomPromo = globalUrls[Math.floor(Math.random() * globalUrls.length)];
          setPromoId(randomPromo);
        }
      }

    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [playlistId, currentVideoId, promoId]);


  useEffect(() => {
    fetchAllData();

    // 🌟 [เพิ่มใหม่] Realtime Sync รอรับคำสั่งจากหน้า DJ หรือคนอื่นๆ
    const channel = supabase.channel('player_queue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks', filter: `playlist_id=eq.${playlistId}` }, () => {
        fetchAllData(); // โหลดคิวใหม่เมื่อมีการเปลี่ยนแปลง
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData, playlistId]);
  // =========================================================
  // 🌟 [ระบบ Sync หน้าจอ]: แยกการทำงานเป็น 2 ส่วน (ป้องกันบั๊กรีเซ็ตตัวเอง)
  // =========================================================

  // ส่วนที่ 1: ทำงานแค่ "ครั้งเดียว" ตอนเปิดหน้าจอหรือกดรีเฟรช
  useEffect(() => {
    if (!playlistId) return; // 🌟 ต้องมีรหัสห้องเสมอ

    if (!isPreview) {
      // จอหลัก: ล้างความจำเฉพาะ "ห้องตัวเอง"
      supabase.from('current_playing')
        .upsert({
          playlist_id: playlistId, // 🌟
          video_id: null,
          title: 'Standby'
        }, { onConflict: 'playlist_id' })
        .then();
    } else {
      // จอจิ๋ว: เช็กเพลงของ "ห้องตัวเอง"
      const checkCurrentPlaying = async () => {
        const { data, error } = await supabase
          .from('current_playing')
          .select('video_id')
          .eq('playlist_id', playlistId) // 🌟 ดึงข้อมูลเฉพาะห้องนี้
          .maybeSingle(); // ใช้ maybeSingle ป้องกัน Error ถ้าหาไม่เจอ

        if (!error && data?.video_id) {
          startApp(data.video_id, true);
        }
      };
      checkCurrentPlaying();
    }
  }, [isPreview, playlistId]); // 🌟 เพิ่ม playlistId

  // ส่วนที่ 2: ดักฟังคำสั่งสลับเพลงจาก Database (Realtime) แบบเพียวๆ
  useEffect(() => {
    if (!playlistId) return;

    // 🌟 เปลี่ยนชื่อ Channel ไม่ให้ซ้ำกัน และเปลี่ยน Filter ให้ดักฟังเฉพาะห้องนี้
    const syncChannel = supabase.channel(`sync_playing_status_${playlistId}`)
      .on('postgres_changes', {
        event: '*', // 🌟 เปลี่ยนเป็น * เพื่อรับทั้งการ Insert/Update ใหม่
        schema: 'public',
        table: 'current_playing',
        filter: `playlist_id=eq.${playlistId}` // 🌟 กรองเฉพาะห้องของตัวเอง
      }, (payload) => {
        const newVid = (payload.new as { video_id?: string })?.video_id;

        if (newVid) {
          startApp(newVid, true);
        } else {
          setIsAppStarted(false);
          setCurrentVideoId(null);
        }
      }).subscribe();

    return () => { supabase.removeChannel(syncChannel); };
  }, [playlistId]);

  // --- [AI VOICE RESPONSE - ระบบเสียงตอบรับ] ---
  const speakResponse = (message: string) => {
    if (isPreview) return; // 🌟 ถ้าเป็นจอ Preview (จอจิ๋ว) สั่งให้ AI เงียบทันที ห้ามพูด!

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // หยุดเสียงเก่าก่อนพูดใหม่
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'th-TH';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- [LOGIC - ระบบการเล่นเพลง] ---
  const startApp = (videoId: string, isFast = false) => {
    setIsAppStarted(true);

    // ⚡ ฟังก์ชันช่วยค้นหาข้อมูลจากคลังแล้วอัปเดตขึ้นหน้าจอล็อกมือถือ
    const updateLockScreenMetadata = (id: string) => {
      if ('mediaSession' in navigator) {
        const song = allMasterSongs?.find((s: any) => s.video_id === id);
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song?.title || 'NiiVaa คาราโอเกะ',
          artist: 'NiiVaa Smart System',
          artwork: song?.thumbnail_url ? [
            { src: song.thumbnail_url, sizes: '512x512', type: 'image/jpeg' }
          ] : []
        });
      }
    };
    // 🌟 บังคับเคลียร์ข้อความคิวทันที เมื่อมีคนกดเล่นเพลงแบบแมนนวล
    if (marqueeTimeoutRef.current) clearTimeout(marqueeTimeoutRef.current);
    setIsQueueMarquee(false);

    if (isFast) {
      setIsTransitioning(false);
      setCurrentVideoId(videoId);
      updateLockScreenMetadata(videoId); // ⚡ แทรกตรงนี้สำหรับโหมดเล่นทันที
    } else {
      setCurrentVideoId(null);
      setIsTransitioning(true);
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentVideoId(videoId);
        updateLockScreenMetadata(videoId); // ⚡ แทรกตรงนี้หลังโชว์หน้าจอโปรโมทครบ 5 วินาที
      }, 5000);
    }
  };
  // 🌟 ฟังก์ชันตัวช่วย: อัปเดตเพลงแยกตามห้องแบบไม่ต้องพึ่งกฎ UNIQUE
  // 🌟 ฟังก์ชันตัวช่วย: เวอร์ชันติดเรดาร์ตรวจสอบข้อผิดพลาด
  const updateCurrentPlayingRoom = async (v_id: string, v_title: string) => {
    console.log("=== 🔍 เริ่มกระบวนการส่งสัญญาณเปลี่ยนเพลง ===");
    console.log("👉 1. รหัสห้อง (playlistId):", playlistId);
    console.log("👉 2. รหัสเพลง (v_id):", v_id);

    if (!playlistId) {
      console.error("❌ ล้มเหลว: playlistId หายไป! (อาจจะดึงค่าจาก URL ไม่สำเร็จ)");
      alert("ไม่สามารถเปลี่ยนเพลงได้: หาบรรทัด const { id: playlistId } ไม่เจอ หรือค่าว่าง");
      return;
    }
    if (!v_id) {
      console.error("❌ ล้มเหลว: ไม่มี video_id ส่งเข้ามา");
      return;
    }

    try {
      const payload = {
        video_id: v_id,
        title: v_title || 'Unknown Title',
        updated_at: new Date().toISOString()
      };

      // ลองสั่ง Update
      console.log("👉 3. กำลังส่งคำสั่ง Update ไปที่ Supabase...");
      const { data, error } = await supabase
        .from('current_playing')
        .update(payload)
        .eq('playlist_id', playlistId)
        .select();

      console.log("✅ ผลการ Update - Data:", data, " | Error:", error);

      // ถ้า Update ไม่เจอข้อมูล (ห้องยังไม่ถูกสร้าง)
      if (!error && (!data || data.length === 0)) {
        console.log("👉 4. ไม่พบห้องนี้ในตาราง กำลังส่งคำสั่ง Insert เพื่อสร้างห้องใหม่...");
        const { data: insData, error: insErr } = await supabase.from('current_playing').insert([{
          playlist_id: playlistId,
          ...payload
        }]).select();
        
        console.log("✅ ผลการ Insert - Data:", insData, " | Error:", insErr);
      }
      
      console.log("=== 🎉 จบกระบวนการส่งสัญญาณ ===");
      
    } catch (err) {
      console.error("❌ เกิดข้อผิดพลาดร้ายแรงของระบบ:", err);
    }
  };
  // --- [เพิ่ม States ใหม่] ---
  const [isAutoDJ, setIsAutoDJ] = useState(false); // ระบบ Auto DJ

  // --- [1. แก้ไขปุ่มกรอง (Karaoke/Listening) ให้ทำงานทันที] ---
  // ใช้ useEffect เพื่อให้เมื่อกดปุ่ม Mode แล้ว รายการที่ค้นหาค้างไว้จะถูกกรองใหม่ทันที
  useEffect(() => {
    if (query) handleSearch(query);
  }, [isKaraokeMode, isListeningMode]);

  // 🎯 [เพิ่มใหม่]: สเตตัสควบคุม Pop-up แผงปรับสี และหน่วยความจำเก็บสไตล์พรีเมียม
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [theme, setTheme] = useState({
    bg: '#000a12',
    border: '#006666',
    text: '#22d3ee',
    glow: 15,
    pulse: 2
  });
  // 🎯 [เพิ่มใหม่]: ตัวนับรอบการทำงานของวิดีโอโปรโมทส่วนกลาง
  const [promoLoopCount, setPromoLoopCount] = useState(0);

  // 🌟 บังคับอัปเดตเสียงวิดีโอโปรโมทโดยตรง
  useEffect(() => {
    if (videoPlayerRef.current) {
      // เล่นแบบมีเสียงแค่รอบแรก (promoLoopCount === 0) ถ้ารอบที่ 2 (>= 1) ให้ปิดเสียง
      videoPlayerRef.current.muted = isMutedRef.current || promoLoopCount >= 1;
    }
  }, [promoLoopCount]); // 👈 ไม่ต้องพึ่งพาตัวแปรอื่นแล้ว ใช้แค่รอบการเล่นพอ

  // 🎯 [เพิ่มใหม่]: ลอจิกรีเซ็ตตัวนับรอบกลับไปเป็น 0 ทันทีที่มีเพลงหลักถูกเปิดขึ้นมาเล่น
  useEffect(() => {
    if (currentVideoId) {
      setPromoLoopCount(0);
    }
  }, [currentVideoId]);
  // 🎯 [เพิ่มใหม่]: ซิงค์ค่าสีจากฐานข้อมูลมาลง State ทันทีที่ข้อมูลเพลย์ลิสต์โหลดเสร็จ
  useEffect(() => {
    if (playlistInfo?.theme_config) {
      setTheme(playlistInfo.theme_config);
    }
  }, [playlistInfo]);

  // --- [2. ระบบ Auto DJ Logic (อัปเกรด กรองอารมณ์เพลง + YouTube Fallback)] ---
  const triggerAutoDJ = useCallback(async () => {
    if (!isAutoDJ || allMasterSongs.length === 0) return;

    // 1. วิเคราะห์แนวเพลงปัจจุบันจากคิว (อิงจากเพลงสุดท้ายในคิวเป็นหลัก)
    const referenceTrack = tracks.length > 0 ? tracks[tracks.length - 1] : null;
    const targetCategory = referenceTrack?.master_songs?.category || referenceTrack?.category || '';

    // 2. ค้นหาจากคลังส่วนกลาง (Local Database) ก่อน
    let pool = allMasterSongs.filter(s => {
      // 2.1 กรองตามโหมดร้อง/ฟัง (เรียกใช้ฟังก์ชันตัวช่วยที่เราเพิ่งสร้าง คลีนมาก!)
      if (!isValidMode(s.title)) return false;

      // 2.2 🌟 กรองตามอารมณ์เพลง (หมวดหมู่) 
      // ถ้าคิวเพลงมีหมวดหมู่กำกับไว้ เพลงที่จะสุ่มมาต่อก็ต้องมีหมวดหมู่ตรงกันเป๊ะๆ
      if (targetCategory && s.category && s.category !== targetCategory) return false;

      return true;
    });

    // 3. 🚀 [YOUTUBE FALLBACK] ถ้าคลังในหมวดหมู่นี้แห้งสนิท ให้ดึงจาก YouTube ทันที
    if (pool.length === 0 && targetCategory) {
      console.log(`[AutoDJ] คลังเพลงแนว '${targetCategory}' หมดแล้ว กำลังค้นหาจาก YouTube...`);
      const searchSuffix = isKaraokeMode ? "คาราโอเกะ" : isListeningMode ? "Official Audio" : "";
      
      // สร้างคำค้นหาอัจฉริยะ เช่น "เพลง ลูกทุ่งอีสาน คาราโอเกะ"
      const query = `เพลง ${targetCategory} ${searchSuffix}`; 
      
      try {
        const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg"; // ⚠️ อย่าลืมใส่ API Key ของคุณที่นี่
        
        // ใช้ videoCategoryId=10 เพื่อเน้นหมวดหมู่ Music ใน YouTube
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${apiKey}`);
        const ytData = await res.json();
        
        if (ytData.items && ytData.items.length > 0) {
          // สุ่มเลือก 1 เพลงจากผลลัพธ์ที่ได้
          const randomYt = ytData.items[Math.floor(Math.random() * ytData.items.length)];
          
          const newSong = {
            video_id: randomYt.id.videoId,
            title: randomYt.snippet.title,
            thumbnail_url: randomYt.snippet.thumbnails.default.url,
            category: targetCategory // 🌟 ประทับตราหมวดหมู่เดียวกันเข้าไปด้วยเลย
          };
          
          // บันทึกลงคลัง Master_songs ก่อน
          await supabase.from('master_songs').upsert(newSong, { onConflict: 'video_id' });
          
          // นำเข้าคิว (tracks)
          handleAddToQueue(newSong);
          speakResponse(`คิวหมดแล้ว ออโต้ดีเจจัดเพลงแนว ${targetCategory} จากยูทูปให้ต่อเลยครับ`);
          return; // จบการทำงาน
        }
      } catch (err) {
        console.error("Auto DJ YouTube Error:", err);
      }
    }

    // 4. กรณีหาในคลัง Local เจอ (หรือคิวว่างเปล่าไม่มีหมวดหมู่) ให้สุ่มตามปกติ
    if (pool.length > 0) {
      const randomSong = pool[Math.floor(Math.random() * pool.length)];
      handleAddToQueue(randomSong);
      
      if (targetCategory) {
        speakResponse(`ออโต้ดีเจจัดเพลง ${randomSong.title} ให้ต่อเลยครับ`);
      } else {
        speakResponse(`ออโต้ดีเจสุ่มเพลง ${randomSong.title} ให้ฟังเพลินๆ ครับ`);
      }
    } else {
      // แผนสำรองสุดท้าย: ถ้าไม่มีเพลงหมวดหมู่นั้นจริงๆ และหาจากเน็ตไม่เจอ ให้สุ่มเพลงอะไรก็ได้ที่ตรงโหมด
      const backupPool = allMasterSongs.filter(s => isValidMode(s.title));
      if (backupPool.length > 0) {
         const fallbackSong = backupPool[Math.floor(Math.random() * backupPool.length)];
         handleAddToQueue(fallbackSong);
         speakResponse(`หาเพลงแนวเดิมไม่เจอ ออโต้ดีเจขอเปลี่ยนบรรยากาศเป็น ${fallbackSong.title} นะครับ`);
      }
    }
  }, [isAutoDJ, allMasterSongs, isKaraokeMode, isListeningMode, tracks, isValidMode]);

  // --- [3. ปรับปรุง playNextSong ให้รองรับ Auto DJ และ Repeat Count] ---
  const playNextSong = useCallback(async () => {
    // 1. หาตำแหน่งของเพลงปัจจุบันในคิว
    const currentIndex = tracks.findIndex(t => t.video_id === currentVideoId);

    if (currentIndex !== -1) {
      const currentTrack = tracks[currentIndex];

      // 2. 🔁 ตรวจสอบเงื่อนไขการเล่นซ้ำ (Repeat)
      if (currentTrack.repeat_count > 1) {
        const newRepeatCount = currentTrack.repeat_count - 1;

        try {
          // อัปเดต Database ลดจำนวนรอบลง 1
          await supabase
            .from('tracks')
            .update({ repeat_count: newRepeatCount })
            .eq('id', currentTrack.id);

          // ดึงข้อมูลคิวเพลงใหม่มาอัปเดตหน้าจอ (ถ้ามีฟังก์ชันนี้)
          if (typeof fetchAllData === 'function') fetchAllData();

          // สั่งให้เริ่มเล่นเพลงเดิมอีกครั้ง
          startApp(currentTrack.video_id, true);

          // จบการทำงานของฟังก์ชันนี้ เพื่อไม่ให้เลื่อนไปเพลงถัดไป
          return;
        } catch (err) {
          console.error("Error updating repeat count:", err);
        }
      }

      // 3. 🗑️ (ออปชันเสริม) ลบเพลงที่เล่นจบแล้วออกจากคิว
      // หากพี่ต้องการให้เพลงที่เล่นจบ (หรือเล่นซ้ำครบแล้ว) ลบตัวเองออกจากคิวอัตโนมัติ ให้เอาคอมเมนต์ 2 บรรทัดล่างออกครับ
      // await supabase.from('tracks').delete().eq('id', currentTrack.id);
      // if (typeof fetchAllData === 'function') fetchAllData();
    }

    // 4. ⏭️ เลื่อนไปเพลงถัดไปตามปกติ
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      startApp(tracks[currentIndex + 1].video_id, true);
    } else {
      // ถ้าคิวเพลงหมด
      if (isAutoDJ) {
        triggerAutoDJ();
      } else {
        setIsAppStarted(false);
        setCurrentVideoId(null);
        speakResponse("จบการเล่นคิวเพลงแล้วครับ");
      }
    }
  }, [isAppStarted, tracks, currentVideoId, isAutoDJ, triggerAutoDJ]);
  // หมายเหตุ: หากใช้ Linter แล้วมันฟ้องให้เพิ่ม fetchAllData หรือ supabase ใน Array ด้านบน พี่สามารถเพิ่มเข้าไปได้เลยครับ

  // --- [LOGIC - ระบบค้นหาปกติ (Mic 1)] ---
  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val) { setResults([]); return; }

    setIsListening(true);
    try {
      // 1. ค้นหาในคลังเพลง (Database) ก่อน
      const { data: stockData, error: dbError } = await supabase
        .from('master_songs')
        .select('*')
        .ilike('title', `%${val}%`)
        .limit(15);

      if (dbError) console.error("Database Error:", dbError);

      // 2. กรองข้อมูลในคลังตามโหมด (Karaoke / Listening)
      let filteredStock = [];
      if (stockData) {
        // 🌟 แก้ไข: เรียกใช้ฟังก์ชันตัวช่วยกรองเพลงแทนลอจิกเดิม
        filteredStock = stockData.filter(s => isValidMode(s.title));
      }

      // 3. 🚩 ตัดสินใจ: ถ้าเจอในคลัง ให้แสดงผลจากคลัง แต่ถ้า "ไม่เจอ" ให้ไป YouTube
      if (filteredStock.length > 0) {
        console.log("พบเพลงในคลัง:", filteredStock.length);
        setResults(filteredStock.map(s => ({ ...s, source: 'stock' })));
        // ถ้าอยากให้หา YouTube ด้วยแม้จะเจอในคลังแล้ว ให้ลบบรรทัด return ด้านล่างออกครับ
        setIsListening(false);
        return;
      }

      // 4. 🚀 [YOUTUBE FALLBACK] ถ้าในคลังไม่มีเพลงที่ตรงโหมด ให้เริ่มค้นหาใน YouTube
      console.log("ไม่พบในคลัง... กำลังค้นหาใน YouTube");

      // ⚠️ ตรวจสอบ API KEY ตรงนี้ (ต้องเป็นคีย์จริงและไม่มีช่องว่าง)
      const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg";
      const searchSuffix = isKaraokeMode ? " คาราโอเกะ" : isListeningMode ? "" : "";
      const finalQuery = val + searchSuffix;

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(finalQuery)}&type=video&key=${apiKey}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("YouTube API Error:", errorData);
        return;
      }

      const ytData = await res.json();
      const ytResults = ytData.items?.map((i: any) => ({
        video_id: i.id.videoId,
        title: i.snippet.title,
        thumbnail_url: i.snippet.thumbnails.default.url,
        source: 'youtube'
      })) || [];

      setResults(ytResults);

    } catch (err) {
      console.error("Search System Failed:", err);
    } finally {
      setIsListening(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("เบราว์เซอร์ไม่รองรับ");
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => handleSearch(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // --- [LOGIC - ระบบ SMART VOICE SEARCH (Mic 2)] ---
  const processSmartCommand = async (transcript: string) => {
    const command = transcript.trim().toLowerCase();
    let action = "search";
    let songName = command;

    // 1. ตรวจจับคำสั่ง (Keywords)
    const queueWords = /(ขอเพลง|เอาเพลง|จองเพลง|คิว|ต่อคิว)/;
    const playWords = /(ร้องเลย|เปิดเลย|จัดมา|เล่นเลย|เล่นเดี๋ยวนี้)/;

    if (queueWords.test(command)) {
      action = "queue";
      songName = command.replace(queueWords, "").trim();
    } else if (playWords.test(command)) {
      action = "play";
      songName = command.replace(playWords, "").trim();
    }

    setQuery(songName); // โชว์ชื่อเพลงในช่องค้นหา

    // 2. ค้นหาในคลัง (Stock) ก่อน
    let targetSong = allMasterSongs.find(s => {
      const isK = s.title.includes("คาราโอเกะ") || s.title.toLowerCase().includes("karaoke");
      const match = s.title.toLowerCase().includes(songName);
      if (isKaraokeMode) return match && isK;
      if (isListeningMode) return match && !isK;
      return match;
    });

    // 3. 🚀 [หัวใจสำคัญ] ถ้าในคลังไม่มี ให้ไปดึงจาก YouTube มา "เดี๋ยวนี้"
    if (!targetSong) {
      speakResponse(`กำลังค้นหา ${songName} จากยูทูปให้ครับ`);
      const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg"; // 🚩 ใส่ Key จริงของพี่
      const searchSuffix = isKaraokeMode ? " karaoke" : "";

      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(songName + searchSuffix)}&type=video&key=${apiKey}`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          // แปลงข้อมูล YouTube ให้เป็นรูปแบบเดียวกับ Master Song
          targetSong = {
            video_id: item.id.videoId,
            title: item.snippet.title,
            thumbnail_url: item.snippet.thumbnails.default.url
          };

          // 🚩 บันทึกลงคลัง Master_songs ก่อน เพื่อให้ Database ยอมให้เพิ่มคิว
          await supabase.from('master_songs').upsert(targetSong, { onConflict: 'video_id' });
        }
      } catch (err) {
        console.error("YouTube Smart Search Error:", err);
      }
    }

    // 4. สั่งการ (Action)
    if (targetSong) {
      if (action === "queue") {
        // สั่งเพิ่มคิว
        const { data } = await supabase.from('tracks').insert({
          playlist_id: playlistId,
          video_id: targetSong.video_id
        }).select();

        if (data) {
          speakResponse(`เพิ่มเพลง ${targetSong.title} ลงคิวเรียบร้อยครับ`);
          fetchAllData(); // อัปเดตรายการคิวด้านข้าง
        }
      } else if (action === "play") {
        // สั่งเล่นทันที
        // 1. เพิ่มเข้าคิวแบบเงียบๆ ก่อน
        await supabase.from('tracks').insert({ playlist_id: playlistId, video_id: targetSong.video_id });
        // 2. สั่ง Player เริ่มเล่น
        startApp(targetSong.video_id, true);
        speakResponse(`จัดไปครับ ร้องเพลง ${targetSong.title} เลย`);
        fetchAllData();
      }

      const handlePlaySong = async (song: any) => {
        // 1. สั่งเล่นในหน้าจอตัวเอง (โค้ดเดิมของพี่)
        setPlayingVideoId(song.video_id);

        // 2. ⚡ แทรกคำสั่งส่งสัญญาณ (เพิ่มเข้าไปตรงนี้ครับพี่)
        await syncCurrentPlaying(song.video_id, song.title);
      };

      // เคลียร์ UI การค้นหา (เลียนแบบปุ่ม Esc)
      setResults([]);
      setQuery('');
    } else {
      speakResponse(`หาเพลง ${songName} ไม่เจอจริงๆ ครับ ลองเปลี่ยนชื่อเพลงดูนะ`);
    }
  };

  // วางฟังก์ชันนี้ไว้ก่อนบรรทัด return (...)
  const updateTrackSettings = async (id: string, updates: any, videoId?: string) => {
    console.log("🔥 เริ่มบันทึกข้อมูล:", { id, updates, videoId });

    try {
      // 1. อัปเดตตาราง tracks
      const { error: trackError } = await supabase
        .from('tracks')
        .update(updates)
        .eq('id', id);

      if (trackError) {
        console.error("❌ Tracks Error:", trackError);
      } else {
        console.log("✅ บันทึก tracks สำเร็จ");
      }

      // 2. อัปเดตตาราง master_songs (ถ้ามีการส่ง category และ videoId มา)
      if (updates.category !== undefined && videoId) {
        const { error: masterError } = await supabase
          .from('master_songs')
          .update({ category: updates.category })
          .eq('video_id', videoId);

        if (masterError) {
          console.error("❌ Master Songs Error:", masterError);
        } else {
          console.log("✅ บันทึก master_songs สำเร็จ");
        }
      }

      // 3. รีเฟรชข้อมูลคิวเพลงใหม่
      fetchAllData();
    } catch (err) {
      console.error("❌ System Error:", err);
    }
  };

  const startSmartVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setIsSmartListening(true);
    recognition.onresult = (event: any) => processSmartCommand(event.results[0][0].transcript);
    recognition.onend = () => setIsSmartListening(false);
    recognition.start();
  };

  // --- [SYSTEM - การจัดการเพลงใน Database] ---
  const handleAddToQueue = async (song: any) => {
    const { data } = await supabase.from('tracks').insert([{ playlist_id: playlistId, video_id: song.video_id }]).select();
    if (data) fetchAllData();
  };

  const handleRemoveTrack = async (id: string) => {
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (!error) setTracks(prev => prev.filter(t => t.id !== id));
  };

  {/* --- 3. MODAL POPUP SETTINGS SME (เวอร์ชัน Form Submit แก้ปัญหาบันทึกไม่ติด) --- */ }
  {
    editingTrack && (
      <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingTrack(null)}>
        <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
          <h3 className="text-cyan-400 font-black text-center mb-6 text-sm italic uppercase tracking-wider">
            ⚙️ ตั้งค่า: {editingTrack?.master_songs?.title || 'ไม่ทราบชื่อเพลง'}
          </h3>

          {/* 🚀 เปลี่ยนมาใช้ <form> เพื่อรวบรวมข้อมูลทั้งหมดตอนกดปุ่มทีเดียว */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);

              // 🌟 ดึงค่า end_time จาก Input ที่ถูกซ่อนและคำนวณไว้ให้แล้วส่งไป
              const finalEndTime = parseInt(formData.get('end_time')?.toString() || '0') || 0;

              updateTrackSettings(editingTrack.id, {
                alias_name: formData.get('alias_name')?.toString() || '',
                start_time: parseInt(formData.get('start_time')?.toString() || '0') || 0,
                end_time: finalEndTime,
                repeat_count: parseInt(formData.get('repeat_count')?.toString() || '1') || 1,
                skip_start: parseInt(formData.get('skip_start')?.toString() || '0') || 0,
                skip_end: parseInt(formData.get('skip_end')?.toString() || '0') || 0,
                category: formData.get('category')?.toString() || ''
              }, editingTrack.video_id);

              setEditingTrack(null);
            }}
            className="space-y-6"
          >
            {/* 🌟 แสดงข้อมูลความยาวรวมของคลิป (ช่วยให้ตัดสินใจง่ายขึ้น) */}
            <div className="bg-cyan-950/30 border border-cyan-900/50 p-3 rounded-xl flex items-center justify-between mb-4">
              <div>
                <label className="text-[10px] text-cyan-400 block uppercase font-bold tracking-widest">ความยาวคลิปรวม (Total)</label>
                <p className="text-[9px] text-cyan-600/70">ระบบดึงอัตโนมัติ / สามารถแก้ไขเองได้</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={vidDuration}
                  onChange={(e) => {
                    setVidDuration(parseInt(e.target.value) || 0);
                    setCutTail(0); // ล้างค่าตัดท้ายถ้าระยะเวลารวมเปลี่ยน
                  }}
                  className="w-16 bg-black/60 border border-cyan-800 p-2 rounded-lg text-emerald-400 outline-none focus:border-cyan-500 text-center font-bold"
                />
                <span className="text-[10px] text-cyan-500 font-bold">วินาที</span>
              </div>
            </div>

            {/* 1. ช่องระบุชื่อเฉพาะ (Alias Name) */}
            <div>
              <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold tracking-widest">ชื่อเฉพาะ (ALIAS NAME)</label>
              <input
                type="text"
                name="alias_name"
                placeholder="เช่น บทนำ, ฝึกร้อง, ตัดท่อนแรก..."
                defaultValue={editingTrack?.alias_name || ''}
                className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-sm"
              />
            </div>

            {/* 2. S, E และ จำนวนรอบ */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-white/40 block mb-2 uppercase font-bold">ตัดเริ่ม (วินาที)</label>
                <input type="number" name="start_time" defaultValue={editingTrack?.start_time || 0} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-center" />
              </div>

              <div className="relative">
                <label className="text-[10px] text-emerald-400 block mb-2 uppercase font-bold">ตัดท้ายออก (วินาที)</label>
                <input
                  type="number"
                  value={cutTail}
                  onChange={(e) => setCutTail(parseInt(e.target.value) || 0)}
                  placeholder="จำนวนวิฯ"
                  className="w-full bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 outline-none focus:border-emerald-500 transition-all text-center"
                />
                {/* 🌟 ไดนามิกคำนวณวินาทีที่จบให้เห็นแบบ Real-time ใต้ช่องกรอก */}
                {vidDuration > 0 && (
                  <p className="text-[9px] text-emerald-400 mt-1.5 absolute w-full text-center font-bold">
                    = จบที่วิฯ: {vidDuration - cutTail}
                  </p>
                )}
                {/* ซ่อนค่า end_time ที่ผ่านการคำนวณแล้ว เพื่อส่งไปกับ Submit ฟอร์ม */}
                <input type="hidden" name="end_time" value={vidDuration > 0 ? Math.max(0, vidDuration - cutTail) : (editingTrack?.end_time || 0)} />
              </div>

              <div>
                <label className="text-[10px] text-purple-400 block mb-2 uppercase font-bold">🔁 เล่นซ้ำ</label>
                <input
                  type="number"
                  name="repeat_count"
                  min="1"
                  defaultValue={editingTrack?.repeat_count || 1}
                  className="w-full bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl text-purple-300 outline-none focus:border-purple-500 transition-all text-center font-black"
                />
              </div>
            </div>

            {/* 3. M (Skip) */}
            <div className="pt-3 border-t border-white/5 pb-4">
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] text-yellow-500 uppercase font-bold">⏭️ ข้ามท่อนกลาง (SKIP)</label>
                {/* 🌟 ตัวช่วย: แสดงระยะเวลาที่ข้ามให้เห็น */}
                {skipE > 0 && skipS > 0 && skipE > skipS && (
                  <span className="text-[9px] text-yellow-400/80 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full">ข้ามเนื้อหา {skipE - skipS} วินาที</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  name="skip_start"
                  type="number"
                  value={skipS}
                  onChange={(e) => setSkipS(parseInt(e.target.value) || 0)}
                  placeholder="เริ่มข้าม"
                  className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-yellow-500/50 text-center"
                />
                <div className="flex items-center text-white/20">-</div>
                <input
                  name="skip_end"
                  type="number"
                  value={skipE}
                  onChange={(e) => setSkipE(parseInt(e.target.value) || 0)}
                  placeholder="สิ้นสุด"
                  className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-yellow-500/50 text-center"
                />
              </div>
            </div>

            {/* 4. แท็ก (CATEGORY) */}
            <div className="pt-2 border-t border-white/5">
              <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold">🏷️ หมวดหมู่ (CATEGORY)</label>
              <input
                type="text"
                name="category"
                list="category-options"
                placeholder="เลือกหรือพิมพ์หมวดหมู่..."
                defaultValue={editingTrack?.category || editingTrack?.master_songs?.category || ''}
                className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-sm"
              />
              <datalist id="category-options">
                <option value="ลูกทุ่ง" />
                <option value="ลูกทุ่งเพลงคู่" />
                <option value="ลูกทุ่งเพลงแหล่" />
                <option value="ลูกทุ่งอีสาน" />
                <option value="หมอลำ" />
                <option value="กันตรึม" />
                <option value="เพื่อชีวิต" />
                <option value="เพื่อชีวิตเพลงคู่" />
                <option value="สตริง" />
                <option value="พื้นเมือง" />
                <option value="ไทยสากล" />
                <option value="สากล" />
                <option value="จีน" />
                <option value="บทสวด" />
                <option value="งานช่าง" />
                <option value="บทเรียน" />
              </datalist>
            </div>

            {/* 🚀 ปุ่มปิด - เปลี่ยนเป็น type="submit" เพื่อกระตุ้นการบันทึกฟอร์ม */}
            <button
              type="submit"
              className="w-full py-4 bg-cyan-600 text-black font-black rounded-2xl hover:bg-cyan-400 transition-colors uppercase text-xs tracking-widest shadow-lg"
            >
              บันทึกและปิดหน้าต่าง
            </button>
          </form>
        </div>
      </div>
    )
  }

  const handleReorder = async (oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;

    // 1. สลับตำแหน่งในหน้าจอทันทีเพื่อให้ดูสมูท
    const newTracks = [...tracks];
    const [movedItem] = newTracks.splice(oldIndex, 1);
    newTracks.splice(newIndex, 0, movedItem);
    setTracks(newTracks);

    // 2. สร้างข้อมูลอัปเดตลำดับ order_index
    const updates = newTracks.map((t, i) => ({
      id: t.id,
      playlist_id: t.playlist_id,
      video_id: t.video_id,
      order_index: i
    }));

    try {
      // 3. บันทึกทับในฐานข้อมูล (เดี๋ยว Realtime จะส่งไปบอกหน้า DJ เอง)
      const { error } = await supabase.from('tracks').upsert(updates);
      if (error) console.error("Reorder Error:", error);
    } catch (err) {
      console.error("System Error during reorder:", err);
    }
  };

  const handleBulkAction = async (playNow: boolean) => {
    if (selectedResults.length === 0 || !playlistId) {
      console.error("ไม่มีข้อมูลเพลงที่เลือก หรือ playlistId หายไป");
      return;
    }

    try {
      // ขั้นตอนที่ 1: ลงทะเบียนเพลงลงในคลังหลัก (master_songs) ก่อน
      // ต้องทำเพื่อให้ Foreign Key ในตาราง tracks ทำงานได้
      const masters = selectedResults.map(s => ({
        video_id: s.video_id,
        title: s.title,
        thumbnail_url: s.thumbnail_url
      }));

      const { error: upsertError } = await supabase
        .from('master_songs')
        .upsert(masters, { onConflict: 'video_id' });

      if (upsertError) throw upsertError;

      // ขั้นตอนที่ 2: เพิ่มเพลงลงใน Playlist (tracks)
      const trackEntries = selectedResults.map(s => ({
        playlist_id: playlistId,
        video_id: s.video_id
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('tracks')
        .insert(trackEntries)
        .select();

      if (insertError) throw insertError;

      // ขั้นตอนที่ 3: สั่งเล่นทันที (ถ้าเลือกปุ่มเล่นเลย)
      if (playNow && inserted && inserted.length > 0) {
        startApp(inserted[0].video_id, true);
        speakResponse(`จัดไปครับ เริ่มเล่นเพลง ${selectedResults[0].title}`);
      } else {
        speakResponse(`เพิ่มเพลง ${selectedResults.length} รายการลงคิวแล้วครับ`);
      }

      // ขั้นตอนที่ 4: เคลียร์ค่าและโหลดข้อมูลใหม่
      setSelectedResults([]);
      setResults([]);
      setQuery('');
      fetchAllData(); // 🚩 สำคัญ: ต้องเรียกเพื่อให้ UI อัปเดตคิวเพลงด้านข้าง

    } catch (err) {
      console.error("Bulk Action Failed:", err);
      alert("ไม่สามารถเพิ่มเพลงได้ กรุณาตรวจสอบการเชื่อมต่อ Database");
    }
  };

  // --- [PLAYER CONTROL - YouTube API & Time Sensors] ---
  useEffect(() => {
    if (isTransitioning) return;
    const vidToPlay = currentVideoId;
    if (!vidToPlay || !(window as any).YT) return;

    if (!playerRef.current) {
      playerRef.current = new (window as any).YT.Player('main-player', {
        videoId: vidToPlay,
        playerVars: {
          'autoplay': 1,
          'rel': 0,
          'controls': 1,
          'modestbranding': 1,
          // 🌟 บังคับเปิดเสียง (0) ทันที ถ้าอยู่ในโหมดจอลอย (isCompact) 
          'mute': isMutedRef.current ? 1 : 0
        },
        events: {
          'onStateChange': (e: any) => {
            if (e.data === 0) playNextSong();

            if (e.data === 1) { // เมื่อวิดีโอเริ่มเล่น
              if (isMutedRef.current) { // 👈 2. เช็กด้วย Ref สดๆ
                e.target.mute();
              } else {
                e.target.unMute();
                e.target.setVolume(100);
              }
            }
          },
          'onReady': (e: any) => {
            if (isMutedRef.current) { // 👈 3. เช็กด้วย Ref
              e.target.mute();
            } else {
              e.target.unMute();
              e.target.setVolume(100);
            }
          }
        }
      });
    } else if (playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById({
        videoId: vidToPlay,
        startSeconds: tracks.find(t => t.video_id === vidToPlay)?.start_time || 0
      });

      if (isMutedRef.current) { // 👈 4. เช็กด้วย Ref
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      }
    }
  }, [currentVideoId, promoId, isTransitioning]); // 👈 5. สังเกตว่าเราเอาตัวแปรเรื่องเสียง (Preview) ออกจาก Array นี้ทั้งหมดแล้ว เพื่อกันลอจิกตีกัน

  useEffect(() => {
    let isRepeating = false; // 🔒 ตัวแปรล็อค ป้องกันไม่ให้คำสั่งทำงานรัวๆ ในเสี้ยววินาที

    const interval = setInterval(async () => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        const track = tracks.find(t => t.video_id === currentVideoId);

        if (!track || duration === 0) return;

        const endTime = track.end_time || duration;

        // โชว์กล่อง Next Queue ตอน 20 วิสุดท้าย
        setShowNextQueue(endTime - time <= 20 && isAppStarted);

        // =======================================================
        // 🌟 [เจาะเกราะ] ลอจิก: 30 วินาทีสุดท้าย
        // =======================================================
        if (time >= (endTime - 30) && time < (endTime - 1) && isAppStarted) {
          if (!marqueeTriggerRef.current) {
            marqueeTriggerRef.current = true; // ล็อคทันที ป้องกันทำงานซ้ำ
            setIsQueueMarquee(true); // สับสวิตช์เปิดข้อความคิว

            if (marqueeTimeoutRef.current) clearTimeout(marqueeTimeoutRef.current);
            marqueeTimeoutRef.current = setTimeout(() => {
              setIsQueueMarquee(false); // 🌟 เปลี่ยนเป็น 40 วินาที เพื่อให้มีเวลาวิ่งจบ 1 รอบแบบชิลๆ
            }, 40000);
          }
        }
        // =======================================================


        // --- [LOGIC: จัดการตอนจบเพลง หรือ เล่นซ้ำ] ---
        // ตรวจสอบว่าเวลาปัจจุบันถึง "จุดสิ้นสุด" (หรือก่อนจบฉิวเฉียด 0.5 วิ เพื่อชิงตัดหน้า onEnd)
        if (time >= (endTime - 0.5) && isAppStarted) {

          if (track.repeat_count > 1 && !isRepeating) {
            isRepeating = true; // ล็อคทันทีไม่ให้ลูปเข้าซ้ำ

            // 1. ⏪ กระชากเวลากลับไปจุดเริ่มต้น (Start Time) ทันที วิดีโอจะเล่นต่อไม่สะดุด
            playerRef.current.seekTo(track.start_time || 0);

            // 2. 📝 อัปเดต Database ลดจำนวนรอบลง 1
            try {
              await supabase
                .from('tracks')
                .update({ repeat_count: track.repeat_count - 1 })
                .eq('id', track.id);

              if (typeof fetchAllData === 'function') fetchAllData();
            } catch (err) {
              console.error("Repeat Update Error:", err);
            }

            // 3. ปลดล็อคหลังจากผ่านไป 1.5 วินาที เพื่อให้แถบเวลาวิ่งพ้นจุดอันตรายไปแล้ว
            setTimeout(() => { isRepeating = false; }, 1500);

          } else if (track.repeat_count <= 1 && !isRepeating) {
            // ถ้าเล่นซ้ำจนครบ 1 รอบแล้ว ให้เลื่อนไปเล่นเพลงถัดไป
            playNextSong();
          }
        }

        // --- [LOGIC: ข้ามท่อนกลาง (SME)] ---
        if (track.skip_start && time >= track.skip_start && time < (track.skip_end || 0)) {
          playerRef.current.seekTo(track.skip_end);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentVideoId, tracks, isAppStarted, playNextSong]);

  // ฟังก์ชันที่เรียกเมื่อกดเล่นเพลง
  const playSong = async (song: any) => {
    // 1. อัปเดตตาราง current_playing ว่าตอนนี้เล่นเพลงนี้อยู่ (แยกตามห้อง)
    const { error } = await supabase
      .from('current_playing')
      .upsert({
        playlist_id: playlistId, // 🌟 ใส่ความเป็นเจ้าของห้อง
        video_id: song.video_id,
        title: song.title,
        updated_at: new Date().toISOString()
      }, { onConflict: 'playlist_id' }); // 🌟 บังคับ Upsert

    if (!error) {
      // 2. สั่งเล่นเพลงในเครื่องนี้ตามปกติ (เช่นเปิด YouTube Embed)
      setCurrentVideoId(song.video_id);
    }
  };

  // --- [KEYBOARD SHORTCUTS] ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Home') { e.preventDefault(); playerRef.current?.seekTo(tracks.find(t => t.video_id === currentVideoId)?.start_time || 0); }
      if (e.key === 'End') { e.preventDefault(); playNextSong(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentVideoId, tracks, playNextSong]);

  // --- [4. ระบบปุ่มลัด ESC และการจัดการคีย์บอร์ด] ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('');
        setResults([]);
        setSelectedResults([]);
        setEditingTrack(null);
      }
      if (e.key === 'Home') {
        e.preventDefault();
        playerRef.current?.seekTo(tracks.find(t => t.video_id === currentVideoId)?.start_time || 0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        playNextSong();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, tracks, currentVideoId, playNextSong]);
  // =======================================================
  // 👇👇👇 วางโค้ด "จุดที่ 2" ตรงนี้เลยครับ! 👇👇👇
  // =======================================================
  let displayMarqueeText = announcement;
  let isMarqueeAmber = false;

  if (isQueueMarquee) {
    const currentIndex = tracks.findIndex(t => t.video_id === currentVideoId);

    // ตรวจสอบว่ามีเพลงที่กำลังเล่นอยู่ และไม่ใช่เพลงสุดท้ายใช่หรือไม่
    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      const nextTracks = tracks.slice(currentIndex + 1, currentIndex + 4);

      const queueString = nextTracks.map((t, idx) => {
        const singer = t.singer_name ? t.singer_name : 'ไม่ระบุผู้จอง';
        return `คิว ${idx + 1} ${singer} : ${t.master_songs?.title}`;
      }).join('   >   ');

      displayMarqueeText = `✨ 3 คิวถัดไป ✨   ${queueString}`;
      isMarqueeAmber = true; // เปิดใช้สีเหลืองอำพัน
    } else {
      // ถ้าบังเอิญทำงาน แต่ไม่มีคิวเพลงเหลือแล้ว ให้โชว์ข้อความนี้แทน
      displayMarqueeText = `✨ ขณะนี้เป็นคิวสุดท้ายแล้วครับ ✨   ${announcement}`;
      isMarqueeAmber = true;
    }
  }
  // =======================================================
  // 👆👆👆 จบโค้ดจุดที่ 2 👆👆👆
  // =======================================================

  // 🚩 เพิ่มโค้ดชุดนี้ใน Component หน้าที่ใช้แสดงคิวเพลง
  useEffect(() => {
    if (!playlistId) return;

    // 1. สร้าง Channel สำหรับฟังการเปลี่ยนแปลง
    const channel = supabase
      .channel('realtime-tracks') // ชื่อแชนแนล (ตั้งอะไรก็ได้)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // ฟังเฉพาะตอนที่มีการเพิ่มข้อมูลใหม่
          schema: 'public',
          table: 'tracks',
          filter: `playlist_id=eq.${playlistId}` // ฟังเฉพาะชุดเพลงที่เปิดอยู่
        },
        (payload) => {
          console.log('พบเพลงใหม่เข้าคิว!', payload);
          // 2. ⚡ สั่งให้โหลดข้อมูลใหม่ทันทีโดยไม่ต้องรีเฟรช
          fetchAllData();

          // (Option) อาจจะเพิ่มเสียงแจ้งเตือนสั้นๆ หรือแจ้งเตือนบนหน้าจอ
          // toast.success("มีเพื่อนส่งเพลงใหม่เข้ามา!");
        }
      )
      .subscribe();

    // 3. ปิดการเชื่อมต่อเมื่อออกจากหน้า
    return () => {
      supabase.removeChannel(channel);
    };
  }, [playlistId, fetchAllData]);
  // ⚡ ระบบรีโมทอัจฉริยะ: ส่งสัญญาณทุกครั้งที่ Video ID เปลี่ยน (ไม่ว่าจะกดเองหรือ Auto-Next)
  useEffect(() => {
    const syncLyricsSignal = async () => {
      if (!currentVideoId || !playlistId) return; // 🌟 เพิ่มเช็ค playlistId

      // ค้นหาข้อมูลเพลงจากรายการ tracks เพื่อเอา Title
      const currentTrack = tracks.find(t => t.video_id === currentVideoId);

      console.log("📡 กำลังซิงค์เพลงใหม่ไปหน้า Lyrics:", currentTrack?.master_songs?.title);

      const { error } = await supabase
        .from('current_playing')
        .upsert({
          playlist_id: playlistId, // 🌟 ใช้ playlist_id
          video_id: currentVideoId,
          title: currentTrack?.master_songs?.title || 'Unknown Title',
          updated_at: new Date().toISOString()
        }, { onConflict: 'playlist_id' }); // 🌟 บังคับ Upsert ทับห้องเดิม

      if (error) console.error("❌ ส่งสัญญาณไม่สำเร็จ:", error.message);
    };

    syncLyricsSignal();
  }, [currentVideoId, playlistId]); // <--- เพิ่ม playlistId ในวงเล็บนี้ด้วย

  // 📺 ฟังก์ชันสั่งเปิดโหมดหน้าต่างลอย (Picture-in-Picture) สำหรับ YouTube Iframe
  const togglePiP = async () => {
    try {
      // 🔍 ค้นหาแท็ก iframe ของ YouTube ในหน้าจอ
      const iframe = document.querySelector('iframe');
      if (!iframe) {
        alert("ไม่พบตัวเล่นวิดีโอในหน้าจอขณะนี้ครับ");
        return;
      }

      // ตรวจสอบสิทธิ์และสั่งเปิดโหมดหน้าต่างลอยผ่าน Document Picture-in-Picture API
      if ('documentPictureInPicture' in window) {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 320,
          height: 180,
        });
        // ย้าย iframe ไปไว้ในหน้าต่างลอย
        pipWindow.document.body.appendChild(iframe);
      } else {
        // Fallback: ถ้าเบราว์เซอร์มือถือบางรุ่นไม่รองรับ จะแจ้งเตือนให้เปิดผ่านโหมด Desktop หรือเบราว์เซอร์ที่รองรับ
        alert("เบราว์เซอร์นี้รองรับระบบหน้าต่างลอยผ่านการกดปุ่มย่อจอของตัวเล่น YouTube โดยตรง หรือใช้เบราว์เซอร์ Chrome/Safari เวอร์ชันล่าสุดครับ");
      }
    } catch (error) {
      console.error("PiP Error:", error);
    }
  };

  // 1. ฟังก์ชันแปลง URL และตรวจสอบความถูกต้องของลิงก์ YouTube
  const extractYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // 2. ฟังก์ชัน handleManualImport ที่ปรับปรุงการทำงานและดักจับ Error ให้สมบูรณ์
  const handleManualImport = async () => {
    const videoId = extractYouTubeVideoId(manualUrl);
    if (!videoId) {
      alert("กรุณากรอกลิงก์ YouTube ให้ถูกต้องครับ");
      return;
    }

    try {
      // ดึงข้อมูลชื่อเพลงและภาพปกจาก YouTube oEmbed
      const oEmbedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      const oEmbedData = oEmbedRes.ok ? await oEmbedRes.json() : {
        title: `YouTube Video (${videoId})`,
        thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      };

      // บันทึกลงตาราง master_songs ก่อน (ใช้ upsert ป้องกันกรณีมีอยู่แล้ว)
      const { error: masterError } = await supabase.from('master_songs').upsert({
        video_id: videoId,
        title: oEmbedData.title,
        thumbnail_url: oEmbedData.thumbnail_url
      }, { onConflict: 'video_id' });

      if (masterError) {
        console.error("Master Songs Error:", masterError);
      }

      // บันทึกลงตาราง tracks พร้อมชื่อผู้จอง (singer_name)
      const { error: trackError } = await supabase.from('tracks').insert({
        playlist_id: playlistId,
        video_id: videoId,
        singer_name: singerName.trim() || 'ทั่วไป'
      });

      if (trackError) {
        console.error("Tracks Error:", trackError);
        alert("ไม่สามารถเพิ่มเพลงลงคิวได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      alert("นำเข้าเพลงสู่คิวเรียบร้อย!");
      setManualUrl('');
      setSingerName('');
      fetchAllData(); // ซิงก์ข้อมูลคิวเพลงใหม่ทันที
    } catch (err) {
      console.error("Manual Import Failed:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดึงข้อมูลเพลง");
    }
  };

  // --- [RENDER UI SET F - FULL FEATURE & NEON STYLE] ---
  return (
    <main className="flex h-screen overflow-hidden bg-[var(--user-bg)] font-prompt">
      {/* ⚡ [เพิ่มใหม่]: แผงฝังตัวแปรสไตล์ CSS Variables เพื่อลอนช์ค่าสีและ Slide bar วิ่งกระจายไปทั่วทั้งหน้าจอ */}
      <style>{`
        :root {
          --user-bg: ${theme.bg};
          --user-border: ${theme.border};
          --user-neon: ${theme.text};
          --user-glow: 0 0 ${theme.glow}px ${theme.text};
          --user-pulse-speed: ${theme.pulse}s;
        }
        /* คลาสแอนิเมชันกระพริบวูบวาบอัจฉริยะแบบไดนามิก ปรับความเร็วตามสไลด์บาร์ */
        .premium-pulse {
          animation: premium-pulse-anim var(--user-pulse-speed) cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes premium-pulse-anim {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 ${theme.glow}px ${theme.text}); }
          50% { opacity: .5; filter: drop-shadow(0 0 ${theme.glow / 3}px ${theme.text}); }
        }
        @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        @keyframes marquee-once { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-marquee { animation: marquee 25s linear infinite; }
        .animate-marquee-once { animation: marquee-once 25s linear forwards; }
        .shadow-neon { box-shadow: 0 0 15px rgba(34,211,238,0.4); }
        .drop-shadow-neon { filter: drop-shadow(0 0 8px rgba(34,211,238,0.8)); }
        
        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.6); }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #000a12; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #000a12; }
      `}</style>

      <div className={`flex-1 bg-[#000a12] text-white flex flex-col overflow-hidden relative ${isFullscreen ? 'p-0' : 'p-2'}`}>

        {/* 1. MARQUEE SECTION - ควบคุมโดย Announce & Loop */}
        {/* แถบข้อความวิ่ง (Marquee) */}
        {showAnnouncement && displayMarqueeText && (
          <div className={`absolute left-0 right-0 z-[10002] transition-all duration-700 ${isFullscreen ? 'top-4 bg-black/40 backdrop-blur-sm py-2' : 'top-0 bg-black/20 py-1'}`}>
            <div className="overflow-hidden flex items-center">
              {/* 🌟 เพิ่ม style แทรกลงไป เพื่อบอกเบราว์เซอร์ว่า: ถ้าเป็นคิวเพลง (isMarqueeAmber) ให้ใช้เวลาวิ่ง 40 วินาที ความเร็วจะได้นุ่มนวลเท่าข้อความปกติ */}
              <div
                className={`whitespace-nowrap flex gap-10 ${isLooping ? 'animate-marquee' : 'animate-marquee-once'}`}
                style={{ animationDuration: isMarqueeAmber ? '50s' : '15s' }}
              >
                {/* 🌟 เปลี่ยนคลาสจาก text-amber-400 เป็น text-yellow-100 (สีเหลืองนวลเกือบขาว) */}
                <span className={`${isMarqueeAmber ? 'text-yellow-100' : 'text-cyan-400'} font-bold uppercase tracking-widest flex items-center gap-4 text-lg`}>
                  <Music size={20} /> {displayMarqueeText}
                </span>

                {isLooping && (
                  <span className={`${isMarqueeAmber ? 'text-yellow-100' : 'text-cyan-400'} font-bold uppercase tracking-widest flex items-center gap-4 text-lg`}>
                    <Music size={20} /> {displayMarqueeText}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. MAIN LAYOUT (ปลดล็อคความสูงในมือถือ ให้ไถสกอร์ลลงไปดูคิวเพลงได้) */}
        <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-50px)] p-2 lg:p-4 pb-20 lg:pb-4 overflow-x-hidden">

          {/* --- [LEFT SIDE: VIDEO & SEARCH] --- */}
          <section className={`flex flex-col gap-3 md:gap-4 transition-all duration-500 ${isFullscreen ? 'flex-1 h-screen w-full fixed inset-0 z-[9999] bg-black' : 'w-full lg:flex-[4] h-auto md:h-full'}`}>

            {/* VIDEO CONTAINER (ปรับความสูงให้หดตัวในมือถือแนวตั้ง และขยายเท่าเดิมในจอคอม) */}
            <div className={`relative bg-black overflow-hidden transition-all duration-700 shrink-0 ${isFullscreen ? 'h-screen w-screen' : 'h-[35vh] sm:h-[45vh] md:h-[480px] rounded-2xl md:rounded-[2rem] border-2 border-[var(--user-border)] shadow-[var(--user-glow)] w-full'}`}>

              {/* 🎬 1. ตู้เล่น YouTube: บังคับให้สแตนบายอยู่ใน DOM ตลอดเวลาเพื่อป้องกันระบบลบ Node พัง แต่ใช้สไตล์คุมเปิด/ปิดการมองเห็น */}
              <div
                id="main-player"
                className={`w-full h-full ${currentVideoId ? 'block' : 'hidden'}`}
              ></div>

              {/* 📺 2. ตู้เล่นวิดีโอโปรโมทส่วนกลาง: คุมลอจิกรอบที่ 1-2 มีเสียง รอบที่ 3 ขึ้นไปเงียบสนิท */}
              {!currentVideoId && (
                <video
                  ref={videoPlayerRef}
                  src={promoId || PROMO_VIDEOS[0]}
                  autoPlay
                  playsInline
                  // 🌟 ดึงค่าจาก Ref สดๆ ป้องกันเสียงเล็ดลอดตอน Render
                  muted={isMutedRef.current || promoLoopCount >= 1}
                  controls={false}
                  onEnded={() => {
                    setPromoLoopCount(prev => prev + 1);
                    if (videoPlayerRef.current) videoPlayerRef.current.play();
                    if (isAutoDJ) triggerAutoDJ();
                  }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}

              {/* Popup รายชื่อเพลงถัดไป (Next Queue) */}
              {showNextQueue && isAppStarted && tracks.length > 0 && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[85] w-auto max-w-[80%] animate-in fade-in zoom-in slide-in-from-top-4 duration-500">
                  <div className="bg-blue-900/80 backdrop-blur-xl border border-blue-400/30 px-6 py-2.5 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-6 text-white">
                    {/* 🌟 ปรับเน้นคำ NEXT TRACKS เป็นตัวหนาและเอียง (font-black italic) */}
                    <span className="text-[11px] font-black italic text-cyan-400 uppercase tracking-widest shrink-0 border-r border-white/10 pr-4">
                      NEXT TRACKS
                    </span>
                    <div className="flex gap-6 overflow-hidden">
                      {tracks.slice(tracks.findIndex(t => t.video_id === currentVideoId) + 1, tracks.findIndex(t => t.video_id === currentVideoId) + 3).map((t, idx) => (
                        <div key={t.id} className="flex items-center gap-3 whitespace-nowrap">
                          {/* ปรับขนาดวงกลมตัวเลขให้ใหญ่ขึ้นนิดหน่อยเพื่อให้สมดุลกับข้อความ 2 บรรทัด */}
                          <span className="text-[10px] font-black bg-white/10 w-6 h-6 flex items-center justify-center rounded-full shrink-0">{idx + 1}</span>
                          {/* 🌟 จัดกลุ่มข้อความแบบแนวตั้ง (flex-col) */}
                          <div className="flex flex-col justify-center">
                            {/* ดึงข้อมูล singer_name มาแสดงเป็นสีเหลืองอำพัน (text-amber-400) ด้านบนชื่อเพลง */}
                            {t.singer_name && (
                              <span className="text-[9px] text-amber-400 font-semibold mb-0.5">
                                ผู้จองคิวขับร้อง : {t.singer_name}
                              </span>
                            )}
                            <span className={`text-xs font-bold ${idx === 0 ? 'text-white' : 'text-white/50'}`}>
                              {t.master_songs?.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setIsFullscreen(!isFullscreen)} className="absolute bottom-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-2xl z-[100] backdrop-blur-md border border-white/10">
                {isFullscreen ? <Minimize size={24} className="text-[var(--user-neon)]" /> : <Maximize size={24} />}
              </button>
            </div>

            {/* [SEARCH & MODE SECTION] */}
            {!isFullscreen && (
              <div className="bg-[#001a33]/40 p-4 md:p-6 rounded-[2rem] border border-white/5 shadow-2xl shrink-0">
                <div className="flex flex-col gap-4">
                  {/* 🎛️ แถวบนสุด (เฉพาะจอคอม): ปุ่ม AutoDJ และปุ่มหน้าต่างลอย */}
                  <div className="hidden lg:flex gap-4 items-center mb-2">
                    {/* 🤖 ปุ่ม Auto DJ (จอคอม) */}
                    <button
                      onClick={() => {
                        setIsAutoDJ(!isAutoDJ);
                        speakResponse(isAutoDJ ? "ปิดระบบออโต้ดีเจ" : "เปิดระบบออโต้ดีเจ เตรียมสนุกต่อเนื่องครับ");
                      }}
                      className={`w-[52px] h-[52px] flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-300 shrink-0 ${isAutoDJ
                        ? 'border-amber-500 text-amber-400 shadow-[0_0_15px_#f59e0b] scale-105'
                        : 'border-white/10 text-white/20'
                        }`}
                    >
                      <Zap size={22} className="mb-0.5" />
                      <span className="text-[7.5px] font-black uppercase leading-none">Auto DJ</span>
                    </button>

                    <div className="flex gap-3 shrink-0">
                      {/* 🎛️ ปุ่ม Toggle สลับโหมด */}
                      <button
                        onClick={() => {
                          if (isKaraokeMode) {
                            setKaraokeMode(false);
                            setListeningMode(true);
                          } else {
                            setKaraokeMode(true);
                            setListeningMode(false);
                          }
                        }}
                        className={`w-[52px] h-[52px] flex items-center justify-center rounded-xl border-2 transition-all duration-300 shrink-0 ${isKaraokeMode
                          ? 'border-purple-500 text-purple-400 shadow-[0_0_15px_#a855f7] scale-105'
                          : 'border-blue-500 text-blue-400 shadow-[0_0_15px_#3b82f6] scale-105'
                          }`}
                        title={isKaraokeMode ? "โหมดคาราโอเกะ (สีม่วง) - คลิกเพื่อสลับเป็นฟังเพลง" : "โหมดฟังเพลง (สีฟ้า) - คลิกเพื่อสลับเป็นร้องเพลง"}
                      >
                        {isKaraokeMode ? (
                          <Mic2 size={26} strokeWidth={2.5} />
                        ) : (
                          <Headphones size={26} strokeWidth={2.5} />
                        )}
                      </button>
                      {/* 📺 ปุ่มหน้าต่างลอย PiP */}
                      <button
                        type="button"
                        onClick={togglePiP}
                        className="w-[52px] h-[52px] flex items-center justify-center rounded-xl border-2 border-fuchsia-500 text-fuchsia-400 bg-fuchsia-950/40 shadow-[0_0_15px_#d946ef] hover:bg-fuchsia-900/60 hover:border-fuchsia-400 transition-all duration-300 shrink-0"
                        title="เปิดโหมดหน้าต่างลอย (Picture-in-Picture)"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_#d946ef]">
                          <path d="M8 4.5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V14" />
                          <rect width="10" height="7" x="12" y="3.5" rx="1" fill="currentColor" className="opacity-30" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 🔍 แถวกลาง: กล่องค้นหา และปุ่มเพิ่มลิงก์สำรอง (จอคอม) */}
                  <div className="flex items-center gap-3 w-full animate-in fade-in duration-500">
                    {/* ปุ่มเพิ่มลิงก์สำรอง (เฉพาะจอคอม) */}
                    <button
                      onClick={() => setIsManualModalOpen(true)}
                      className="hidden lg:flex p-3 bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400 rounded-2xl text-cyan-400 transition-all items-center justify-center gap-2 shrink-0 h-[60px]"
                      title="เพิ่มลิงก์ YouTube สำรอง"
                    >
                      <span className="text-xs font-bold uppercase tracking-wider">➕ เพิ่มลิงก์สำรอง</span>
                      <span className="text-sm">🔗</span>
                    </button>

                    {/* 🔍 กล่องค้นหา */}
                    <div className="w-full relative group">
                      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isListening || isSmartListening || isInstantListening ? 'text-cyan-400 animate-pulse' : 'text-white/40'}`} size={20} />
                      <input
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="ค้นหาชื่อเพลง หรือ ศิลปิน..."
                        className="w-full bg-black/40 p-4 pl-12 pr-4 rounded-xl outline-none focus:border-cyan-400/50 border border-cyan-500/40 lg:border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.15)] lg:shadow-inner transition-all font-bold text-sm md:text-lg text-white"
                      />
                    </div>

                    {/* 💻 ปุ่มกลุ่มไมค์ (เฉพาะจอคอม) */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                      <button onClick={startSpeechRecognition} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isListening ? 'border-red-500 text-white bg-red-500 animate-bounce shadow-[0_0_15px_#ef4444]' : 'border-red-500/70 text-red-400 bg-red-950/20 hover:bg-red-900/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`} style={{ height: '60px', minWidth: '60px' }} title="ค้นหาปกติ">
                        <Mic size={24} strokeWidth={2.5} />
                      </button>
                      <button onClick={startSmartVoiceSearch} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isSmartListening ? 'border-orange-500 text-white bg-orange-500 shadow-[0_0_20px_#f97316] scale-110' : 'border-orange-500/70 text-orange-400 bg-orange-950/20 hover:bg-orange-900/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]'}`} style={{ height: '60px', minWidth: '60px' }} title="สั่งเข้าคิวหรือเล่นเลย">
                        <Mic size={24} strokeWidth={2.5} className={isSmartListening ? 'animate-pulse' : ''} />
                      </button>
                      <button onClick={async () => {
                        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                        if (!SpeechRecognition) { alert("ไม่รองรับการสั่งงานด้วยเสียง"); return; }
                        const recognition = new SpeechRecognition();
                        recognition.lang = 'th-TH'; recognition.interimResults = false;
                        recognition.onstart = () => setIsInstantListening(true);
                        recognition.onresult = async (event: any) => {
                          setIsInstantListening(false);
                          const voiceText = event.results[0][0].transcript.trim();
                          if (typeof processSmartCommand === 'function') processSmartCommand(voiceText + " เล่นเลย");
                        };
                        recognition.onerror = () => setIsInstantListening(false);
                        recognition.onend = () => setIsInstantListening(false);
                        recognition.start();
                      }} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isInstantListening ? 'border-green-500 text-white bg-green-500 shadow-[0_0_20px_#22c55e] scale-110' : 'border-green-500/70 text-green-400 bg-green-950/20 hover:bg-green-900/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]'}`} style={{ height: '60px', minWidth: '60px' }} title="พูดชื่อเพลงแล้วเล่นทันที">
                        <Mic size={24} strokeWidth={2.5} className={isInstantListening ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* 📱 แถวล่าง: ปุ่มเครื่องมือสำหรับมือถือ (เลื่อนซ้าย-ขวาได้) */}
                  <div className="flex lg:hidden items-center justify-start gap-2 w-full overflow-x-auto pb-2 custom-scrollbar">
                    {/* ปุ่มเพิ่มลิงก์สำรอง (จอมือถือ) */}
                    <button
                      onClick={() => setIsManualModalOpen(true)}
                      className="p-3 rounded-xl border-2 border-cyan-500/50 text-cyan-400 bg-cyan-950/40 hover:bg-cyan-900/60 shadow-sm flex items-center justify-center shrink-0 transition-all"
                      style={{ height: '48px' }}
                    >
                      <span className="text-[10px] font-black uppercase whitespace-nowrap">➕ เพิ่มลิงก์</span>
                    </button>

                    <button onClick={togglePiP} className="p-3 rounded-xl border-2 border-fuchsia-500 text-fuchsia-400 bg-fuchsia-950/40 hover:bg-fuchsia-900/60 shadow-[0_0_10px_#d946ef] flex items-center justify-center shrink-0 transition-all" style={{ height: '48px', minWidth: '48px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="14" x="3" y="8" rx="2" ry="2" /><line x1="15" x2="21" y1="2" y2="8" /><line x1="21" x2="21" y1="2" y2="8" /><line x1="15" x2="15" y1="2" y2="2" /></svg>
                    </button>

                    <button
                      onClick={() => {
                        setIsAutoDJ(!isAutoDJ);
                        speakResponse(isAutoDJ ? "ปิดระบบออโต้ดีเจ" : "เปิดระบบออโต้ดีเจ เตรียมสนุกต่อเนื่องครับ");
                      }}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isAutoDJ ? 'border-amber-500 text-amber-400 bg-amber-950/50 shadow-[0_0_15px_#f59e0b]' : 'border-amber-500/50 text-amber-400/50 bg-amber-950/30'}`} style={{ height: '48px', minWidth: '48px' }}>
                      <span className="text-[8px] font-black leading-tight text-center">AUTO<br />DJ</span>
                    </button>

                    <button
                      onClick={() => { isKaraokeMode ? (setKaraokeMode(false), setListeningMode(true)) : (setKaraokeMode(true), setListeningMode(false)) }}
                      className={`relative p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isKaraokeMode ? 'border-cyan-400 text-cyan-300 shadow-[0_0_15px_#22d3ee] bg-cyan-950/30' : 'border-blue-500 text-blue-400 shadow-[0_0_15px_#3b82f6] bg-blue-950/30'}`}
                      style={{ height: '48px', minWidth: '48px' }}
                    >
                      {isKaraokeMode ? <Mic2 size={20} strokeWidth={2.5} /> : <Headphones size={20} strokeWidth={2.5} />}
                      <RefreshCw size={8} className="absolute top-1 right-1 opacity-60" />
                    </button>

                    <button onClick={startSpeechRecognition} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isListening ? 'border-red-500 text-white bg-red-500 animate-bounce shadow-[0_0_15px_#ef4444]' : 'border-red-500/70 text-red-400 bg-red-950/20 hover:bg-red-900/50'}`} style={{ height: '48px', minWidth: '48px' }}>
                      <Mic size={20} strokeWidth={2.5} />
                    </button>

                    <button onClick={startSmartVoiceSearch} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isSmartListening ? 'border-orange-500 text-white bg-orange-500 shadow-[0_0_20px_#f97316] scale-110' : 'border-orange-500/70 text-orange-400 bg-orange-950/20 hover:bg-orange-900/50'}`} style={{ height: '48px', minWidth: '48px' }}>
                      <Mic size={20} strokeWidth={2.5} className={isSmartListening ? 'animate-pulse' : ''} />
                    </button>

                    <button onClick={async () => {
                      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                      if (!SpeechRecognition) { alert("ไม่รองรับการสั่งงานด้วยเสียง"); return; }
                      const recognition = new SpeechRecognition();
                      recognition.lang = 'th-TH'; recognition.interimResults = false;
                      recognition.onstart = () => setIsInstantListening(true);
                      recognition.onresult = async (event: any) => {
                        setIsInstantListening(false);
                        const voiceText = event.results[0][0].transcript.trim();
                        if (typeof processSmartCommand === 'function') processSmartCommand(voiceText + " เล่นเลย");
                      };
                      recognition.onerror = () => setIsInstantListening(false);
                      recognition.onend = () => setIsInstantListening(false);
                      recognition.start();
                    }} className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center shrink-0 ${isInstantListening ? 'border-green-500 text-white bg-green-500 shadow-[0_0_20px_#22c55e] scale-110' : 'border-green-500/70 text-green-400 bg-green-950/20 hover:bg-green-900/50'}`} style={{ height: '48px', minWidth: '48px' }}>
                      <Mic size={20} strokeWidth={2.5} className={isInstantListening ? 'animate-pulse' : ''} />
                    </button>
                  </div>

                  {/* [BULK ACTIONS] - ย้ายออกมาไว้อิสระนอกแถว เพื่อไม่ให้ถูกบีบ */}
                  {selectedResults.length > 0 && (
                    <div className="flex gap-2 w-full animate-in slide-in-from-top-2 duration-300">
                      <button
                        type="button"
                        onClick={() => handleBulkAction(false)}
                        className="flex-1 bg-teal-600 hover:bg-teal-500 py-3 rounded-xl font-bold text-[11px] sm:text-xs text-white"
                      >
                        เพิ่มเข้าคิว ({selectedResults.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkAction(true)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-[11px] sm:text-xs text-white"
                      >
                        แทรกเล่นทันที
                      </button>
                      <button type="button" onClick={() => setSelectedResults([])} className="bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl text-white shrink-0">
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  {/* SEARCH RESULTS GRID */}
                  {results.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-2xl w-full">
                      {results.map((s) => {
                        const isSelected = selectedResults.some(r => r.video_id === s.video_id);
                        return (
                          <div
                            key={s.video_id}
                            onClick={() => isSelected ? setSelectedResults(selectedResults.filter(r => r.video_id !== s.video_id)) : setSelectedResults([...selectedResults, s])}
                            className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-600/30 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                          >
                            <div className="relative shrink-0">
                              <img src={s.thumbnail_url} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover" alt="" />
                              <span className={`absolute -top-1.5 -right-1.5 px-1 rounded text-[7px] sm:text-[8px] font-black shadow-sm ${s.source === 'stock' ? 'bg-orange-500 text-black' : 'bg-red-600 text-white'}`}>
                                {s.source === 'stock' ? 'STK' : 'YT'}
                              </span>
                            </div>
                            <div className="flex-1 overflow-hidden text-[10px] sm:text-[11px] font-bold text-white line-clamp-2 leading-tight">{s.title}</div>
                            {isSelected && <CheckCircle2 size={16} className="text-blue-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* --- [RIGHT SIDE: ASIDE] (ปรับให้สูงพอดีคิวเพลง ไม่โดนตัด) --- */}
          {!isFullscreen && (
            <aside className="w-full lg:w-[380px] shrink-0 min-h-[500px] lg:h-full flex flex-col bg-[#000a12] border-t lg:border-t-0 lg:border-l border-white/5 relative shadow-[0_0_20px_rgba(34,211,238,0.05)] rounded-t-3xl lg:rounded-none mt-4 lg:mt-0">
              {/* 1. Banner & Neon Control Panel (ฉบับอัปเดตระบบ White-Label ติดแบรนด์หน่วยงาน) */}
              <div className={`bg-slate-900 rounded-2xl p-4 ... ${isCompact ? 'hidden' : 'block'}`}>
                <div className="bg-[#000a1a] p-4 border-b border-white/5 shrink-0">
                  <div className="flex items-center justify-center gap-3 mb-5">
                    {/* 🏢 [ส่วนที่ 1 - โลโก้]: แสดงรูปโลโก้หน่วยงานจริง หรือแสดงตัวอักษรแบรนด์ NIIVAA ทันสมัยหากไม่มีรูป */}
                    {playlistInfo?.logo_url ? (
                      <img
                        src={playlistInfo.logo_url}
                        alt="Logo"
                        className="w-8 h-8 rounded-lg object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                      />
                    ) : (
                      <div className="text-sm font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#CCFFFF] to-[#3333FF] drop-shadow-[0_0_5px_rgba(51,51,255,0.4)] italic">
                        NIIVAA
                      </div>
                    )}
                    <div className="flex flex-col items-start">
                      {/* 📝 [ส่วนที่ 2 - ป้ายชื่อ]: แสดงชื่อหน่วยงานที่ผู้ใช้พิมพ์กำหนดเอง หรือใช้ชื่อระบบมาตรฐานหากเว้นว่าง */}
                      <h1 className="text-white font-black tracking-wider italic text-xs uppercase">
                        {playlistInfo?.custom_banner || "SMARTKARAOKE"}
                      </h1>
                      {/* 🏷️ [ส่วนที่ 3 - สวิตช์ป้ายเล็ก]: ตรวจเช็คสวิตช์ ON/OFF ถ้าเปิดอยู่ให้เรืองแสงสแตนบายไว้เบาๆ */}
                      {playlistInfo?.show_niivaa_badge !== false && (
                        <span className="text-[7px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase tracking-widest font-bold mt-0.5 animate-pulse">
                          NiiVaa Academy
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setIsManualOpen(true)}
                      className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-cyan-500/30 text-cyan-400 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                    >
                      <Info size={18} />
                      <span className="text-xs font-bold uppercase tracking-wider hidden md:block">คู่มือการใช้งาน</span>
                    </button>
                  </div>

                  {/* 🟢 NEON BUTTONS: Announce & Loop */}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowAnnouncement(!showAnnouncement)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all duration-300 ${showAnnouncement ? 'border-green-500 text-green-400 shadow-[0_0_10px_#22c55e]' : 'border-white/10 text-white/20'
                        }`}
                    >
                      Announce {showAnnouncement ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all duration-300 ${isLooping ? 'border-cyan-500 text-cyan-400 shadow-[0_0_10px_#06b6d4]' : 'border-white/10 text-white/20'
                        }`}
                    >
                      Loop {isLooping ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* 🛡️ [เพิ่มใหม่]: แผงปุ่มวิเศษตรวจสิทธิ์พรีเมียมองค์กร จะดีดโผล่ขึ้นมาให้เฉพาะสิทธิ์ Premium เท่านั้น */}
                  {/* เติม || true เข้าไปท้ายเงื่อนไข เพื่อสั่งเปิดเผยปุ่มจานสีออกมาให้ทดสอบก่อนชั่วคราวครับ */}
                  {(playlistInfo?.is_premium === true || true) && (
                    <button
                      type="button"
                      onClick={() => setShowThemeModal(true)}
                      className="mt-3 w-full py-2 rounded-lg text-[10px] font-black uppercase border border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all flex items-center justify-center gap-1.5 premium-pulse"
                    >
                      🎨 ปรับแต่งสีบอร์ดพรีเมียม (Premium Theme)
                    </button>
                  )}
                </div>
              </div>

              {/* 💿 Playlist Selection Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2 mt-4 px-4">
                <label className="text-[9px] font-black text-cyan-400/40 uppercase tracking-widest leading-none">
                  Select Playlist
                </label>
                <Link href="/smart-media-dashboard">
                  <button className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-white transition-all bg-white/5 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-500/50 shadow-lg whitespace-nowrap">
                    <LayoutGrid size={14} strokeWidth={3} />
                    <span>ศูนย์กลาง</span>
                  </button>
                </Link>
                <Link href="/create-playlist">
                  <button className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 hover:text-white transition-all bg-white/5 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg border border-white/10 hover:border-cyan-500/50 shadow-lg whitespace-nowrap">
                    <Plus size={14} strokeWidth={3} />
                    <span>CREATE PLAYLIST</span>
                  </button>
                </Link>
              </div>

              <div className="relative mb-4 px-4">
                <select
                  value={playlistId}
                  onChange={(e) => router.push(`/playlist/${e.target.value}`)}
                  className="w-full bg-[#001a33] border border-white/10 p-3 sm:p-4 rounded-2xl text-cyan-400 font-bold outline-none text-sm appearance-none cursor-pointer hover:border-cyan-400/30 transition-all"
                >
                  {allPlaylists.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tracks_count || 0} เพลง)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-7 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={16} />
              </div>

              {/* 3. QUEUE LIST (ปรับปรุงรองรับมือถือ Double Tap + เพิ่ม Alias Name + Inline Delete) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-24 space-y-2 px-4">
                {tracks
                  // 🌟 แก้ไข: ใช้ isValidMode แทนเงื่อนไขยาวๆ เดิม
                  .filter(t => isValidMode(t.master_songs?.title || t.title || ''))
                  .map((track, i) => {
                    const isPlaying = track.video_id === currentVideoId;
                    return (
                      <div
                        key={track.id}
                        draggable
                        // 🌟 รองรับ Double Click บนคอม
                        onDoubleClick={async () => {
                          startApp(track.video_id, true);
                          
                          // 🌟 แก้ไข: เรียกฟังก์ชันตัวช่วยแทน upsert เดิม
                          await updateCurrentPlayingRoom(track.video_id, track.master_songs?.title);
                        }}

                        // 🌟 รองรับ Touch Double Tap บนมือถือ
                        onClick={async (e) => {
                          const currentTime = new Date().getTime();
                          // 🌟 ดึงเป้าหมายมาเก็บไว้ก่อน ป้องกันการเป็น null หลัง await
                          const targetElement = e.currentTarget; 
                          const lastTap = Number(targetElement.getAttribute('data-last-tap') || 0);
                          const tapLength = currentTime - lastTap;

                          if (tapLength > 0 && tapLength < 500) {
                            startApp(track.video_id, true);

                            // รอส่งสัญญาณเข้าฐานข้อมูล
                            await updateCurrentPlayingRoom(track.video_id, track.master_songs?.title);

                            // 🌟 ใช้ตัวแปรที่เก็บไว้
                            targetElement.setAttribute('data-last-tap', '0');
                          } else {
                            // 🌟 ใช้ตัวแปรที่เก็บไว้
                            targetElement.setAttribute('data-last-tap', currentTime.toString());
                          }
                        }}

                        onDragStart={(e) => {
                          e.dataTransfer.setData('trackId', track.id);
                          e.dataTransfer.setData('draggedIndex', i.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleReorder(parseInt(e.dataTransfer.getData('draggedIndex')), i);
                        }}
                        className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl border transition-all duration-300 cursor-pointer min-w-0 ${isPlaying
                          ? 'bg-green-900/60 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.7)] sticky top-0 z-20 scale-[1.01]'
                          : 'bg-white/5 border-transparent hover:bg-white/10'
                          }`}
                      >
                        {/* 1. กล่องแก้ไขเลขคิว (Auto Reorder) */}
                        <div className="shrink-0 flex items-center justify-center">
                          {isPlaying ? (
                            <div className="w-6 sm:w-8 text-center font-black text-[10px] sm:text-[11px] text-white">
                              ▶️
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              max={tracks.length}
                              defaultValue={i + 1}
                              key={`queue-input-${track.id}-${i}`}
                              title="พิมพ์เลขใหม่แล้วกด Enter เพื่อย้ายคิว"
                              className="w-7 sm:w-9 bg-black/40 border border-white/10 hover:border-cyan-500/50 focus:border-cyan-400 focus:bg-cyan-950/40 text-center font-black text-[10px] sm:text-[11px] text-cyan-400 rounded-md outline-none transition-all py-1 custom-number-input"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                }
                              }}
                              onBlur={(e) => {
                                const newVal = parseInt(e.target.value);
                                const oldIndex = i;

                                if (!isNaN(newVal) && newVal !== oldIndex + 1) {
                                  let newIndex = newVal - 1;
                                  if (newIndex < 0) newIndex = 0;
                                  if (newIndex >= tracks.length) newIndex = tracks.length - 1;
                                  handleReorder(oldIndex, newIndex);
                                } else {
                                  e.target.value = (oldIndex + 1).toString();
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* 2. รูปหน้าปก */}
                        <img
                          src={track.master_songs?.thumbnail_url}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover shrink-0 pointer-events-none"
                          alt=""
                        />

                        {/* 3. ชื่อเพลง + Alias Name + ป้ายชื่อผู้ร้องสีเหลืองอำพัน */}
                        <div className="flex-1 min-w-0 overflow-hidden pointer-events-none">
                          <p className="text-[10px] sm:text-[11px] font-bold truncate text-white/90">
                            {track.master_songs?.title}
                          </p>

                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {track.alias_name && (
                              <span className="text-[7px] sm:text-[8px] bg-cyan-500/25 text-cyan-300 px-1.5 py-0.2 rounded uppercase font-black tracking-tighter truncate max-w-[80px]">
                                {track.alias_name}
                              </span>
                            )}
                            {track.singer_name && (
                              <span className="text-[7px] sm:text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold truncate max-w-[100px]">
                                🎤 {track.singer_name}
                              </span>
                            )}
                            {track.category && (
                              <span className="text-[7px] sm:text-[8px] bg-white/5 text-gray-400 px-1 py-0.5 rounded uppercase font-black tracking-tighter">
                                {track.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4. S M E Status และ ปุ่มจัดการ (Settings + Inline Delete) */}
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                          <div className="flex gap-0.5 pointer-events-none">
                            {track.start_time > 0 && <span className="bg-green-500 text-[7px] px-1 rounded text-white font-black">S</span>}
                            {track.skip_start > 0 && <span className="bg-yellow-500 text-black text-[7px] px-1 rounded font-black">M</span>}
                            {track.end_time > 0 && <span className="bg-red-500 text-[7px] px-1 rounded text-white font-black">E</span>}
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTrack(track); }}
                            className="text-white/20 hover:text-cyan-400 p-1 transition-colors shrink-0"
                            title="ตั้งค่า SME และชื่อเวอร์ชัน"
                          >
                            <Settings size={14} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`ต้องการลบ "${track.master_songs?.title || 'เพลงนี้'}" ออกจากคิวใช่หรือไม่?`)) {
                                handleRemoveTrack(track.id);
                              }
                            }}
                            className="text-red-400/40 hover:text-red-400 p-1 transition-colors shrink-0"
                            title="ลบเพลงนี้ออกจากคิว"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

            </aside>
          )}

        </div>

        {/* 🎛️ [เพิ่มใหม่]: หน้าต่าง Pop-up คุมสไลด์บาร์ปรับแต่งสีกระพริบนีออนอิสระเฉพาะสมาชิกพรีเมียม */}
        {/* PREMIUM THEME SETTING MODAL (Turbopack Bug-Free Version) */}
        {showThemeModal && (
          <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#000d1a] border border-[var(--user-border)] p-6 rounded-[2.5rem] w-full max-w-xs shadow-[var(--user-glow)]">
              <h3 className="text-[var(--user-neon)] premium-pulse font-black text-xs uppercase tracking-wider mb-6 text-center">🎨 PREMIUM THEME CONTROL</h3>

              <div className="space-y-4">
                {/* 1. Background Color */}
                <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 font-bold">Background Color</span>
                  <input type="color" value={theme.bg} onChange={(e) => setTheme({ ...theme, bg: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                </div>

                {/* 2. Neon Glow Color */}
                <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 font-bold">Neon & Font Color</span>
                  <input type="color" value={theme.text} onChange={(e) => setTheme({ ...theme, text: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                </div>

                {/* 3. Slider: Glow Radius */}
                <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                    <span>Glow Radius</span>
                    <span className="text-[var(--user-neon)] font-black">{theme.glow}px</span>
                  </div>
                  <input type="range" min="0" max="35" value={theme.glow} onChange={(e) => setTheme({ ...theme, glow: parseInt(e.target.value) })} className="w-full accent-cyan-400 cursor-pointer h-1" />
                </div>

                {/* 4. Slider: Pulse Speed */}
                <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                    <span>Neon Pulse Speed</span>
                    <span className="text-cyan-400 font-black">{theme.pulse === 0 ? 'STILL' : `${theme.pulse}s`}</span>
                  </div>
                  <input type="range" min="0" max="4" step="0.5" value={theme.pulse} onChange={(e) => setTheme({ ...theme, pulse: parseFloat(e.target.value) })} className="w-full accent-cyan-400 cursor-pointer h-1" />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.from('playlists').update({ theme_config: theme }).eq('id', playlistId);
                    setShowThemeModal(false);
                    alert('Theme saved successfully!');
                  }}
                  className="flex-1 py-3 bg-cyan-500 text-black font-black text-[10px] tracking-wider rounded-xl hover:bg-cyan-400 transition-all active:scale-95"
                >
                  SAVE THEME
                </button>
                <button type="button" onClick={() => setShowThemeModal(false)} className="px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white">
                  CLOSE
                </button>
              </div>

              {/* RESET DEFAULT BUTTON */}
              <button
                type="button"
                onClick={async () => {
                  const defaultTheme = {
                    bg: '#000a12',
                    border: '#006666',
                    text: '#22d3ee',
                    glow: 15,
                    pulse: 2
                  };

                  if (window.confirm('Do you want to reset theme to default?')) {
                    setTheme(defaultTheme);
                    await supabase.from('playlists').update({ theme_config: defaultTheme }).eq('id', playlistId);
                    setShowThemeModal(false);
                    alert('Theme reset successfully!');
                  }
                }}
                className="w-full mt-3 py-2 bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                ↩️ RESET DEFAULT THEME
              </button>
            </div>
          </div>
        )}

        {/* ORIGINAL SME TRACK SETTING MODAL */}
        {/* --- 3. MODAL POPUP SETTINGS SME (ดีไซน์ใหม่: คืนความสุขให้แอดมิน) --- */}
        {editingTrack && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingTrack(null)}>
            <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <h3 className="text-cyan-400 font-black text-center mb-6 text-sm italic uppercase tracking-wider">
                ⚙️ ตั้งค่า: {editingTrack?.master_songs?.title || 'ไม่ทราบชื่อเพลง'}
              </h3>

              <div className="space-y-6">
                {/* 🌟 กล่องโชว์ความยาวรวม (ดึงให้อัตโนมัติ) */}
                <div className="bg-cyan-950/30 border border-cyan-900/50 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <label className="text-[10px] text-cyan-400 block uppercase font-bold tracking-widest">ความยาวคลิปรวม (Total)</label>
                    <p className="text-[9px] text-cyan-600/70">ดึงอัตโนมัติ / แก้ไขได้</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={vidDuration}
                      onChange={(e) => {
                        setVidDuration(parseInt(e.target.value) || 0);
                        setCutTail(0);
                      }}
                      className="w-16 bg-black/60 border border-cyan-800 p-2 rounded-lg text-emerald-400 outline-none text-center font-bold"
                    />
                    <span className="text-[10px] text-cyan-500 font-bold">วินาที</span>
                  </div>
                </div>

                {/* 1. ช่องระบุชื่อเฉพาะ (Alias Name) */}
                <div>
                  <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold tracking-widest">ชื่อเฉพาะ (ALIAS NAME)</label>
                  <input
                    type="text"
                    placeholder="เช่น บทนำ, ฝึกร้อง, ตัดท่อนแรก..."
                    defaultValue={editingTrack?.alias_name || ''}
                    onBlur={(e) => updateTrackSettings(editingTrack?.id, { alias_name: e.target.value })}
                    className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-sm"
                  />
                </div>

                {/* 2. S, E และ จำนวนรอบ */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-2 uppercase font-bold">ตัดเริ่ม (วินาที)</label>
                    <input type="number" defaultValue={editingTrack?.start_time || 0} onBlur={(e) => updateTrackSettings(editingTrack?.id, { start_time: parseInt(e.target.value) || 0 })} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-center" />
                  </div>

                  {/* 🌟 ปรับใหม่: เปลี่ยนเป็นกรอกเลข "วินาทีที่จะตัดทิ้ง" */}
                  <div className="relative">
                    <label className="text-[10px] text-emerald-400 block mb-2 uppercase font-bold">ตัดท้ายทิ้ง (วินาที)</label>
                    <input
                      type="number"
                      value={cutTail}
                      onChange={(e) => setCutTail(parseInt(e.target.value) || 0)}
                      onBlur={() => {
                        // 🌟 เมื่อคลิกออก ให้ระบบคำนวณ (เวลารวม - เวลาที่ตัด) แล้วบันทึกลง Database อัตโนมัติ!
                        const finalEndTime = vidDuration > 0 ? Math.max(0, vidDuration - cutTail) : 0;
                        updateTrackSettings(editingTrack?.id, { end_time: finalEndTime });
                      }}
                      className="w-full bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-emerald-300 outline-none focus:border-emerald-500 transition-all text-center"
                    />
                    {/* แสดงผลการคำนวณสดๆ ด้านล่าง */}
                    {vidDuration > 0 && cutTail > 0 && (
                      <p className="text-[9px] text-emerald-400 mt-1.5 absolute w-full text-center font-bold">
                        = จบที่: {vidDuration - cutTail} วิฯ
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] text-purple-400 block mb-2 uppercase font-bold">🔁 เล่นซ้ำ</label>
                    <input
                      type="number"
                      min="1"
                      defaultValue={editingTrack?.repeat_count || 1}
                      onBlur={(e) => updateTrackSettings(editingTrack?.id, { repeat_count: parseInt(e.target.value) || 1 })}
                      className="w-full bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl text-purple-300 outline-none focus:border-purple-500 transition-all text-center font-black"
                    />
                  </div>
                </div>

                {/* 3. M (Skip) */}
                <div className="pt-3 border-t border-white/5">
                  <div className="flex justify-between items-end mb-2">
                    <label className="text-[10px] text-yellow-500 uppercase font-bold">⏭️ ข้ามท่อนกลาง (SKIP)</label>
                    {/* 🌟 ตัวช่วยคำนวณระยะเวลาข้ามให้เห็น */}
                    {skipE > 0 && skipS > 0 && skipE > skipS && (
                      <span className="text-[9px] text-yellow-400/80 font-bold bg-yellow-500/10 px-2 py-0.5 rounded-full">ข้ามเนื้อหา {skipE - skipS} วิฯ</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      placeholder="เริ่ม"
                      type="number"
                      value={skipS}
                      onChange={(e) => setSkipS(parseInt(e.target.value) || 0)}
                      onBlur={(e) => updateTrackSettings(editingTrack?.id, { skip_start: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-yellow-500/50 text-center"
                    />
                    <div className="flex items-center text-white/20">-</div>
                    <input
                      placeholder="จบ"
                      type="number"
                      value={skipE}
                      onChange={(e) => setSkipE(parseInt(e.target.value) || 0)}
                      onBlur={(e) => updateTrackSettings(editingTrack?.id, { skip_end: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-yellow-500/50 text-center"
                    />
                  </div>
                </div>

                {/* 4. แท็ก (CATEGORY) */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold">🏷️ หมวดหมู่ (CATEGORY)</label>
                  <input
                    type="text"
                    list="category-options"
                    placeholder="เลือกหรือพิมพ์หมวดหมู่..."
                    defaultValue={editingTrack?.category || editingTrack?.master_songs?.category || ''}
                    onBlur={(e) => updateTrackSettings(editingTrack?.id, { category: e.target.value }, editingTrack?.video_id)}
                    className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-sm"
                  />
                  <datalist id="category-options">
                    <option value="ลูกทุ่ง" />
                    <option value="ลูกทุ่งเพลงคู่" />
                    <option value="ลูกทุ่งเพลงแหล่" />
                    <option value="ลูกทุ่งอีสาน" />
                    <option value="หมอลำ" />
                    <option value="กันตรึม" />
                    <option value="เพื่อชีวิต" />
                    <option value="เพื่อชีวิตเพลงคู่" />
                    <option value="สตริง" />
                    <option value="พื้นเมือง" />
                    <option value="ไทยสากล" />
                    <option value="สากล" />
                    <option value="จีน" />
                    <option value="บทสวด" />
                    <option value="งานช่าง" />
                    <option value="บทเรียน" />
                  </datalist>
                </div>

                {/* ปุ่มปิด */}
                <button
                  onClick={() => setEditingTrack(null)}
                  className="w-full py-4 bg-cyan-600 text-black font-black rounded-2xl hover:bg-cyan-400 transition-colors uppercase text-xs tracking-widest shadow-lg"
                >
                  บันทึกและปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- MANUAL IMPORT MODAL (โปร่งแสง และชิดล่างเพื่อรองรับมือถือ) --- */}
        {isManualModalOpen && (
          <div
            className="fixed inset-0 z-[10005] bg-black/40 backdrop-blur-sm flex items-end justify-center p-2 sm:p-4 transition-all"
            onClick={() => setIsManualModalOpen(false)}
          >
            <div
              className="bg-[#121212]/90 backdrop-blur-xl border border-cyan-500/40 w-full max-w-lg rounded-t-[2.5rem] rounded-b-2xl p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] space-y-4 animate-in slide-in-from-bottom duration-300 mb-2"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-cyan-400 font-black text-xs uppercase tracking-wider">
                  📥 นำเข้าลิงก์ YouTube สำรอง
                </h3>
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="text-gray-400 hover:text-white text-sm font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-gray-300 leading-relaxed">
                วางลิงก์ YouTube และระบุชื่อผู้ร้อง เพื่อเพิ่มเพลงลงคิวโดยตรง:
              </p>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-cyan-400 font-bold block mb-1">YouTube URL</label>
                  <input
                    type="text"
                    placeholder="เช่น https://youtu.be/xxxx"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-cyan-400 font-bold block mb-1">ชื่อผู้จอง / ผู้ขับร้อง</label>
                  <input
                    type="text"
                    placeholder="เช่น ทีม A, คุณสมชาย"
                    value={singerName}
                    onChange={(e) => setSingerName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 p-3 rounded-xl text-white text-xs outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Actions Button */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={async () => {
                    await handleManualImport();
                    setIsManualModalOpen(false);
                  }}
                  className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
                >
                  ยืนยันนำเข้าคิวเพลง
                </button>
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl transition-all border border-white/10"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drawer คู่มือการใช้งาน */}
        <ManualDrawer
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
        />
      </div>
    </main>
  );
}