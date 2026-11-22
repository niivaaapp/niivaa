'use client';

import { supabase } from '@/lib/supabase';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sparkles,
  Music2,
  UserPlus,
  Lock,
  CheckCircle2,
  Headphones,
  BookOpen,
  FileText,
  Star,
  ListVideo,
  Share2,
  Check,
  Zap,
  BookmarkPlus,
  Copy
} from 'lucide-react';

export interface ShareTrack {
  id: string;
  video_id: string;
  title: string;
  alias_name?: string;
  thumbnail_url: string;
  start_time: number;
  end_time: number;     // จำนวนวินาทีที่ตัดทิ้งก่อนจบ (Cut Tail)
  skip_start?: number;  // เริ่มข้ามท่อนกลาง (วินาที)
  skip_end?: number;    // สิ้นสุดการข้าม (วินาที)
  is_app_intro?: boolean;
}

export interface SharePlaylistData {
  id: string;
  name: string;
  creator_name: string;
  share_code?: string; // 🌟 เพิ่มบรรทัดนี้
  type: 'listening' | 'karaoke' | 'education';
  description?: string;
  tracks: ShareTrack[];
}

const MARQUEE_SEGMENTS = [
  { text: 'จัดชุดสื่อวิดิโอความรู้ที่ท่านสนใจ', color: 'text-cyan-300' },
  { text: 'บทเรียนตามหัวข้อ', color: 'text-amber-300' },
  { text: 'ฝึกภาษา ฟังสุนทรพจน์', color: 'text-emerald-300' },
  { text: 'ทักษะอาชีพ ศิลปะ', color: 'text-pink-300' },
  { text: 'ฟังธรรม ฟังบทสวดมนต์', color: 'text-yellow-200' },
  { text: 'จัดคิวสื่อสำหรับวิทยากร', color: 'text-sky-300' },
  { text: 'ฟังเพลง ขับร้องคาราโอเกะ ระบุผู้จองคิวร้องได้', color: 'text-purple-300' },
  { text: 'จัดการทุกเรื่องที่ท่านสนใจจาก YouTube เป็นอัลบัมส่วนตัว', color: 'text-teal-300' },
  { text: 'ตั้งค่าปรับแต่งตัดส่วนต้น ส่วนกลาง หรือส่วนท้าย ของคลิป', color: 'text-orange-300' },
  { text: 'กำหนดจำนวนรอบเล่นซ้ำ', color: 'text-lime-300' },
  { text: 'ระบบ AUTO DJ เติมคิวเพลงให้อัตโนมัติ', color: 'text-cyan-200' },
  { text: 'หรือ วาง url เพิ่มสื่อในคิวได้หลายเพลงในคราวเดียว', color: 'text-indigo-300' },
  { text: 'แชร์ชุดสื่อได้ ไม่มีโฆษณาขัดจังหวะ', color: 'text-emerald-400 font-black' },
];

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any; // <--- แก้บรรทัดนี้เป็น any
  }
}

export default function ShareClient({ playlist }: { playlist: SharePlaylistData }) {
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [showSignupModal, setShowSignupModal] = useState<boolean>(false);
  const [ytReady, setYtReady] = useState<boolean>(false);
  const [showUpNextPopup, setShowUpNextPopup] = useState<boolean>(false);

  // 🌟 ใหม่: State สำหรับ Micro-Toast โชว์จุดขาย S/M/E และสถานะปุ่มแชร์ต่อ
  const [smeToast, setSmeToast] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  const playerRef = useRef<any>(null);
  const currentIndexRef = useRef<number>(0);
  const hasSkippedMidRef = useRef<boolean>(false);
  const isEndingRef = useRef<boolean>(false);
  currentIndexRef.current = currentIndex;

  const currentTrack = playlist.tracks[currentIndex];
  const isEducation = playlist.type === 'education';
  const upcomingTracks = playlist.tracks.slice(currentIndex + 1, currentIndex + 3);

  // ฟังก์ชันแสดง Micro-Toast 4 วินาที
  const triggerSmeToast = (message: string) => {
    setSmeToast(message);
    setTimeout(() => {
      setSmeToast((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  // 🌟 ฟังก์ชันจัดการปุ่มสมัครสมาชิก (ดักจับ LINE In-App Browser เพื่อกัน Error 403 Google Login)
  const handleGoToSignup = (saveThisPlaylist = false) => {
    const targetPath = saveThisPlaylist
      ? `/login?clone_share=${playlist.id}`
      : '/login';

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isLineBrowser = /Line/i.test(ua);

    if (isLineBrowser) {
      // บังคับเด้งออกไปเปิดใน Chrome / Safari ภายนอก
      const fullUrl = `${window.location.origin}${targetPath}${targetPath.includes('?') ? '&' : '?'
        }openExternalBrowser=1`;
      window.location.href = fullUrl;
      return;
    }

    router.push(targetPath);
  };

  // 🌟 ฟังก์ชันปุ่มแชร์ต่อ (แนบ ?openExternalBrowser=1 อัตโนมัติ)
  const handleShareForward = async () => {
    const shareUrl = `${window.location.origin}/share/${playlist.id}?openExternalBrowser=1`;
    const shareTitle = `${playlist.name} | NiiVaa SmartMedia`;
    const shareText = playlist.description
      ? `${playlist.name}\n${playlist.description}`
      : `ชวนรับชมชุดสื่อ "${playlist.name}" ผ่าน NiiVaa SmartMedia`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // กรณีผู้ใช้กดยกเลิก ให้ fallback ไปคัดลอกลิงก์แทน
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      alert(`คัดลอกลิงก์นี้เพื่อส่งต่อ:\n${shareUrl}`);
    }
  };

  // 1. โหลด YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtReady(true);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
  }, []);

  // 2. เล่นคลิปถัดไป หรือเปิด Pop-up เมื่อจบคลิปสุดท้าย
  const handleNextOrFinish = () => {
    setShowUpNextPopup(false);
    isEndingRef.current = false;
    const idx = currentIndexRef.current;
    if (idx < playlist.tracks.length - 1) {
      setCurrentIndex(idx + 1);
    } else {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo();
      }
      setShowSignupModal(true);
    }
  };
  // 🌟 เล่นรายการก่อนหน้า
  const handlePrev = () => {
    setShowUpNextPopup(false);
    isEndingRef.current = false;
    if (currentIndexRef.current > 0) {
      setCurrentIndex(currentIndexRef.current - 1);
      setHasStarted(true);
    }
  };
  // 3. สร้าง/อัปเดตตัวเล่นเมื่อเริ่มเล่นหรือเปลี่ยนคลิป
  useEffect(() => {
    if (!ytReady || !hasStarted || !currentTrack) return;

    setShowUpNextPopup(false);
    hasSkippedMidRef.current = false;
    isEndingRef.current = false;

    // 🌟 โชว์ Micro-Toast ถ้าคลิปนี้มีการตั้งค่าตัดช่วงต้น (Start Time)
    if (currentTrack.start_time > 0) {
      triggerSmeToast(`⚡ ข้ามช่วงเกริ่นนำ (${currentTrack.start_time} วิ) อัตโนมัติโดย NiiVaa`);
    }

    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById({
        videoId: currentTrack.video_id,
        startSeconds: currentTrack.start_time || 0,
      });
      return;
    }

    playerRef.current = new window.YT.Player('share-yt-player', {
      height: '100%',
      width: '100%',
      videoId: currentTrack.video_id,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        start: currentTrack.start_time || 0,
      },
      events: {
        onStateChange: (event: any) => {
          if (event.data === 0) {
            handleNextOrFinish();
          }
        },
      },
    });
  }, [ytReady, hasStarted, currentIndex]);

  // 4. ตรวจจับเวลาทุก 0.5 วิ: รองรับ Skip กลางคลิป (M), ตัดท้าย (E) และ Pop-up แจ้ง 2 คิวถัดไปก่อนจบ 10 วิ
  useEffect(() => {
    if (!hasStarted || !ytReady || !currentTrack) return;

    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function') {
        return;
      }

      const state = player.getPlayerState?.();
      if (state !== 1) return; // 1 = Playing

      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();

      // 🌟 M: ข้ามท่อนกลางอัตโนมัติ
      if (
        !hasSkippedMidRef.current &&
        currentTrack.skip_start &&
        currentTrack.skip_end &&
        currentTrack.skip_end > currentTrack.skip_start &&
        currentTime >= currentTrack.skip_start &&
        currentTime < currentTrack.skip_end
      ) {
        hasSkippedMidRef.current = true;
        player.seekTo(currentTrack.skip_end, true);
        triggerSmeToast('⏭️ ข้ามท่อนกลางอัตโนมัติโดย NiiVaa');
        return;
      }

      // 🌟 E: คำนวณจุดจบจริง (ตัดท้ายคลิปออกตาม end_time วินาที)
      if (duration > 0) {
        const effectiveEnd =
          currentTrack.end_time > 0 && duration > currentTrack.end_time
            ? duration - currentTrack.end_time
            : duration;

        const remaining = effectiveEnd - currentTime;

        // ถ้าถึงจุดตัดท้ายแล้ว ให้ข้ามไปคลิปถัดไปเลย
        if (currentTrack.end_time > 0 && remaining <= 0.3 && !isEndingRef.current) {
          isEndingRef.current = true;
          triggerSmeToast('✂️ ตัดช่วงท้ายคลิปอัตโนมัติโดย NiiVaa');
          handleNextOrFinish();
          return;
        }

        // โชว์ Pop-up แจ้ง 2 คิวถัดไป ล่วงหน้า 10 วินาที
        const hasNext = currentIndexRef.current < playlist.tracks.length - 1;
        if (hasNext && remaining <= 10 && remaining > 0) {
          setShowUpNextPopup(true);
        } else {
          setShowUpNextPopup(false);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [hasStarted, ytReady, currentIndex, currentTrack, playlist.tracks.length]);

  // 5. เล่นซ้ำตั้งแต่คลิปแรก
  const handleReplayAll = () => {
    setShowSignupModal(false);
    setShowUpNextPopup(false);
    setCurrentIndex(0);
    setHasStarted(true);
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      playerRef.current.loadVideoById({
        videoId: playlist.tracks[0].video_id,
        startSeconds: playlist.tracks[0].start_time || 0,
      });
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isCloning, setIsCloning] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    checkUser();
  }, []);

  const handleCloneToMyAccount = async () => {
    // ถ้ายังไม่ล็อกอิน -> พาไปหน้า Login (ดัก LINE Browser)
    if (!currentUser) {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const loginPath = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      if (/Line/i.test(ua)) {
        window.location.href = `${window.location.origin}${loginPath}&openExternalBrowser=1`;
        return;
      }
      router.push(loginPath);
      return;
    }

    if (isCloning) return;
    setIsCloning(true);

    try {
      // 1. สร้างเพลย์ลิสต์ใหม่ในบัญชีของผู้รับ (ตั้งเป็นส่วนตัว และไม่ก๊อป share_code กันซ้ำ)
      const { data: newPlaylist, error: plError } = await supabase
        .from('playlists')
        .insert({
          user_id: currentUser.id,
          name: `${playlist.name} (สำเนา)`,
          description: playlist.description || null,
          is_public: false,
        })
        .select()
        .single();

      if (plError || !newPlaylist) throw plError;

      // 2. เตรียมคิวเพลงทั้งหมด (ไม่เอาคลิปแนะนำแอป is_app_intro) พร้อมค่า S/M/E และจำนวนรอบ
      const tracksToCopy = playlist.tracks
        .filter((t: any) => !t.is_app_intro)
        .map((t: any, index: number) => ({
          playlist_id: newPlaylist.id,
          video_id: t.video_id,
          order_index: t.order_index ?? index, // 👈 เปลี่ยนจาก position เป็น order_index
          start_time: Number(t.start_time) || 0,
          skip_start: Number(t.skip_start) || 0,
          skip_end: Number(t.skip_end) || 0,
          end_time: Number(t.end_time) || 0,
          repeat_count: Math.max(1, Number(t.repeat_count) || 1),
          alias_name: t.alias_name || null,
          singer_name: t.singer_name || null,
          is_played: false,
          is_app_intro: false,
        }));

      if (tracksToCopy.length > 0) {
        const { error: trError } = await supabase
          .from('tracks')
          .insert(tracksToCopy);

        if (trError) throw trError;
      }

      // 3. พาไปยังหน้าเพลย์ลิสต์ใหม่ของผู้ใช้ เพื่อแก้ไขหรือเปิดเล่นทันที
      alert('บันทึกเป็นเพลย์ลิสต์ของคุณเรียบร้อยแล้ว!');
      router.push(`/playlist/${newPlaylist.id}`);
    } catch (err: any) {
      console.error('Clone Error:', err);
      alert(`ไม่สามารถบันทึกเพลย์ลิสต์ได้: ${err?.message || 'กรุณาลองใหม่'}`);
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] text-white font-sans flex flex-col">
      <style>{`
        @keyframes niivaaMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-niivaa-marquee {
          display: flex;
          width: max-content;
          animation: niivaaMarquee 48s linear infinite;
        }
        .animate-niivaa-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-30 bg-[#0a1128]/95 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] shrink-0">
              {isEducation ? <BookOpen size={18} className="text-white" /> : <Headphones size={18} className="text-white" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-cyan-400 truncate tracking-wide">
                NiiVaa SmartMedia
              </h1>
              <p className="text-[10px] text-slate-400 truncate">
                ชุดสื่อแชร์พิเศษ • โดย {playlist.creator_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 🌟 ปุ่มแชร์ต่อให้เพื่อน (แนบ ?openExternalBrowser=1 อัตโนมัติ) */}
            <button
              onClick={handleShareForward}
              className="px-3 py-2 bg-white/5 hover:bg-white/15 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              title="แชร์ชุดสื่อนี้ให้เพื่อน"
            >
              {copiedShare ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
              <span className="hidden sm:inline">{copiedShare ? 'คัดลอกแล้ว' : 'แชร์ต่อ'}</span>
            </button>

            {/* ปุ่มสมัครฟรี (#2d728f / #f4f1de) */}
            <button
              onClick={() => handleGoToSignup(false)}
              className="px-3.5 py-2 bg-[#2d728f] hover:bg-[#3886a6] text-[#f4f1de] font-bold text-xs rounded-xl border border-[#f4f1de]/25 shadow-md transition-all flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>สมัครฟรี</span>
            </button>
            <button
              onClick={handleCloneToMyAccount}
              disabled={isCloning}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl border border-emerald-400/40 shadow-lg transition-all flex items-center gap-1.5"
            >
              <Copy size={14} />
              <span>
                {isCloning
                  ? 'กำลังบันทึก...'
                  : currentUser
                    ? 'บันทึกเป็นของฉัน'
                    : 'ล็อกอินเพื่อบันทึกไปแก้ไข'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* --- MARQUEE BAR (Compact 1 บรรทัด) --- */}
      <div className="w-full bg-[#060b1e] border-b border-cyan-500/25 py-1.5 overflow-hidden select-none">
        <div className="animate-niivaa-marquee items-center text-xs sm:text-sm font-semibold tracking-wide">
          {[0, 1].map((dupIndex) => (
            <div key={dupIndex} className="flex items-center shrink-0">
              {MARQUEE_SEGMENTS.map((seg, i) => (
                <span key={`${dupIndex}-${i}`} className="inline-flex items-center">
                  <span className={`${seg.color} px-3`}>{seg.text}</span>
                  <span className="text-slate-600">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ฝั่งซ้าย: จอวิดีโอ + คำอธิบายสื่อ */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
            {!hasStarted ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900/80 to-[#0a1128]/95">
                <img
                  src={currentTrack.thumbnail_url}
                  alt="ปกชุดสื่อ"
                  className="absolute inset-0 w-full h-full object-cover opacity-25 blur-[2px]"
                />
                <div className="relative z-10 flex flex-col items-center max-w-md">
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-bold mb-2">
                    {playlist.creator_name} ส่งชุดสื่อนี้ให้คุณ ({playlist.tracks.length} รายการ)
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white mb-5 drop-shadow">
                    {playlist.name}
                  </h2>
                  <button
                    onClick={() => setHasStarted(true)}
                    className="px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-transform active:scale-95 flex items-center gap-2.5 text-sm sm:text-base"
                  >
                    <Play size={20} fill="currentColor" />
                    <span>แตะเพื่อเริ่มรับชม</span>
                  </button>
                </div>
              </div>
            ) : (
              <div id="share-yt-player" className="w-full h-full" />
            )}

            {/* 🌟 Micro-Toast โชว์จุดขายเมื่อระบบ S/M/E ทำงาน (มุมบนซ้าย) */}
            {smeToast && (
              <div className="absolute top-3 left-3 z-20 max-w-[85%] bg-[#050814]/90 backdrop-blur-md border border-amber-400/50 text-amber-300 px-3 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-left duration-300">
                <Zap size={14} className="shrink-0 text-amber-400" />
                <span>{smeToast}</span>
              </div>
            )}

            {/* POP-UP แจ้งชื่อเพลง/สื่อ 2 คิวถัดไป (พื้นกระจกเข้ม มุมบนขวา ก่อนจบ 10 วิ) */}
            {showUpNextPopup && upcomingTracks.length > 0 && (
              <div className="absolute top-3 right-3 z-20 w-72 sm:w-80 bg-[#050814]/90 backdrop-blur-xl border border-cyan-400/40 ring-1 ring-white/15 rounded-2xl p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] animate-in slide-in-from-right duration-300">
                <div className="flex items-center gap-2.5 text-cyan-500 text-sm sm:text-base font-black uppercase tracking-wider mb-2.5 border-b border-cyan-500/30 pb-2">
                  <ListVideo size={18} className="shrink-0" />
                  <span>คิวถัดไปในอีกไม่กี่วินาที...</span>
                </div>
                <div className="space-y-2">
                  {upcomingTracks.map((nextTrack, i) => (
                    <div
                      key={nextTrack.id}
                      className="flex items-center gap-2.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10"
                    >
                      <span className="w-5 h-5 rounded-md bg-cyan-500/30 border border-cyan-300/60 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {currentIndex + 2 + i}
                      </span>
                      <p className="text-xs font-bold text-white truncate flex-1">
                        {nextTrack.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* แถบพิเศษ: โชว์ทันทีเมื่อกำลังเล่น "วิดีโอแนะนำแอป" */}
          {hasStarted && currentTrack.is_app_intro && (
            <div className="bg-gradient-to-r from-emerald-950/80 to-cyan-950/80 border border-emerald-400/50 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-in fade-in">
              <div className="flex items-center gap-2.5 text-center sm:text-left">
                <Sparkles size={20} className="text-emerald-400 shrink-0 hidden sm:block" />
                <div>
                  <p className="text-xs sm:text-sm font-black text-emerald-300">
                    ถูกใจระบบ NiiVaa SmartMedia หรือไม่?
                  </p>
                  <p className="text-[11px] text-slate-300">
                    สมัครสมาชิกฟรีตอนนี้ เพื่อบันทึกชุดสื่อนี้เก็บไว้ในบัญชีของคุณ
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleGoToSignup(true)}
                className="px-4 py-2 bg-[#2d728f] hover:bg-[#3886a6] text-[#f4f1de] font-bold text-xs rounded-xl shrink-0 transition-all"
              >
                สมัครและบันทึกชุดนี้ฟรี →
              </button>
            </div>
          )}

          {/* แถบข้อมูลคลิปที่กำลังเล่น + ปุ่มควบคุม */}
          {/* แถบข้อมูลคลิปที่กำลังเล่น + ป้ายรหัสชุดสื่อ + ปุ่มควบคุม */}
          <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {/* 🌟 ป้ายรหัสชุดสื่อ (เช่น NSP001) + NiiVaa SmartMedia Playlist */}
                  {playlist.share_code && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#2d728f]/30 border border-cyan-400/40">
                      <span className="text-xs font-black text-[#f4f1de] tracking-wider">
                        {playlist.share_code}
                      </span>
                      <span className="text-[9px] text-cyan-300/80 border-l border-white/20 pl-1.5">
                        NiiVaa SmartMedia Playlist
                      </span>
                    </div>
                  )}

                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    รายการที่ {currentIndex + 1} / {playlist.tracks.length}
                  </span>

                  {currentTrack.is_app_intro ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> แนะนำแอป
                    </span>
                  ) : (
                    currentTrack.alias_name && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {currentTrack.alias_name}
                      </span>
                    )
                  )}
                </div>

                <p className="text-sm sm:text-base font-bold text-white truncate">
                  {currentTrack.title}
                </p>
              </div>

              {/* 🌟 ปุ่มรายการก่อนหน้า คู่กับ รายการถัดไป */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${currentIndex === 0
                    ? 'bg-white/5 text-slate-600 border-white/5 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 text-white border-white/10'
                    }`}
                >
                  <SkipBack size={15} />
                  <span>รายการก่อนหน้า</span>
                </button>

                <button
                  onClick={handleNextOrFinish}
                  className="px-3.5 py-2 bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <SkipForward size={15} />
                  <span>{currentIndex < playlist.tracks.length - 1 ? 'รายการถัดไป' : 'จบชุดสื่อ'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* กล่องคำอธิบายแนะนำสื่อสั้นๆ จากผู้สร้าง */}
          {playlist.description && (
            <div className="bg-slate-900/50 border border-cyan-500/15 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1.5">
                <FileText size={14} />
                <span>คำแนะนำจากผู้สร้างชุดสื่อจาก YouTube ({playlist.creator_name})</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {playlist.description}
              </p>
            </div>
          )}

        </div>


        {/* ฝั่งขวา: รายการคิวแบบจำกัดสิทธิ์ (Read-only) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Music2 size={18} className="text-cyan-400" />
                <h3 className="font-bold text-sm text-white">รายการในชุดนี้</h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                ทั้งหมด {playlist.tracks.length} รายการ
              </span>
            </div>

            <div className="space-y-2.5 flex-1">
              {playlist.tracks.map((track, idx) => {
                const isActive = idx === currentIndex && hasStarted;
                const isPromo = track.is_app_intro;

                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setHasStarted(true);
                    }}
                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-xl border transition-all ${isActive
                      ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[0_0_15px_rgba(34,211,238,0.15)]'
                      : isPromo
                        ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-black/30 border-white/5 hover:border-white/20'
                      }`}
                  >
                    <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                      <img
                        src={track.thumbnail_url}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-cyan-500/40 flex items-center justify-center">
                          <Play size={14} fill="white" className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isPromo && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 inline-block mb-0.5">
                          ✨ แนะนำแอป
                        </span>
                      )}
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-cyan-300' : isPromo ? 'text-emerald-200' : 'text-white/90'}`}>
                        {idx + 1}. {track.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {isActive ? '🔊 กำลังเล่นอยู่...' : 'แตะเพื่อเปิดชม'}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* กล่องชวนสมัครสมาชิก */}
              <div
                onClick={() => setShowSignupModal(true)}
                className="mt-4 p-3.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                  <Lock size={14} />
                  <span>อยากบันทึกชุดสื่อนี้ หรือสร้างคิวเอง?</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  สมัครสมาชิกฟรี เพื่อเก็บอัลบั้มนี้ไว้ในบัญชีของคุณ ตัดต่อช่วงคลิป (S/M/E) และแชร์ต่อได้ทันที
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- POP-UP MODAL: แนะนำสมัครสมาชิกเพื่อบันทึกชุดสื่อนี้เมื่อจบคลิปสุดท้าย --- */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#111c3d] to-[#0a1128] border border-cyan-400/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.5)]">
              <BookmarkPlus size={32} className="text-slate-950" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold mb-3">
              ✅ รับชมครบทุกรายการแล้ว
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
              เก็บชุดสื่อนี้ไว้ในบัญชีของคุณฟรี!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">
              สมัครสมาชิก NiiVaa SmartMedia เพื่อบันทึก <strong className="text-cyan-300">"{playlist.name}"</strong> ไว้เปิดฟังต่อ เพิ่มคลิปใหม่ หรือปรับแต่งคิวเองได้ทันที
            </p>

            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2.5 text-xs text-slate-200">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>บันทึกชุดสื่อนี้เก็บไว้ในคลังส่วนตัวและแก้ไขเพิ่ม-ลดได้</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                <span>ตั้งค่าตัดต้น-ข้ามกลาง-ตัดท้ายคลิป (S/M/E) ได้แม่นยำ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                <span>ระบบ Auto DJ สุ่มเพลงต่อเนื่อง + ค้นหาด้วยเสียง</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => handleGoToSignup(true)}
                className="w-full py-3.5 bg-[#2d728f] hover:bg-[#3886a6] text-[#f4f1de] font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                <span>สมัครฟรี เพื่อบันทึกชุดสื่อนี้</span>
              </button>

              <button
                onClick={handleReplayAll}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} />
                <span>รับชมชุดนี้อีกครั้ง</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}