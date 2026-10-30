'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Columns2, Columns3, LayoutGrid, ArrowDownToLine, PauseCircle, AlignJustify, ListOrdered, Eye, EyeOff, MessageSquare } from 'lucide-react';

interface ScreenState {
  mode: 'standby' | 'image' | 'video' | 'slideshow' | 'game' | 'quiz' | 'tug_of_war' | 'leaderboard' | 'sudden_death' | 'get_ready' | 'grand_leaderboard' | 'single_photo' | 'live_gallery' | 'dual_photo' | 'dual_slideshow' | 'activity_single' | 'activity_gallery';
  media_url: string;
  single_video_url: string;
  playlist: string[];
  video_playlist?: string[];
  ticker_text: string;
  ticker_speed: string;
  ticker_color: string;
  ticker_direction: 'rtl' | 'btt';
  ticker_bg_color?: string;
  quiz_question_type?: string;
  quiz_options?: any[];
  quiz_question: string;
  quiz_correct_answer: string;
  game_phase: 'brainstorm' | 'show_answers' | 'reveal' | 'get_ready';
  reveal_step: number;
  gallery_interval_sec?: number;
  focused_photo?: { url: string; nickname: string; caption: string; id: string; };
  focused_photos?: { id: string; url: string; nickname: string; caption: string }[];
  show_qr?: boolean;
  qr_url?: string;
  show_live_qr?: boolean;
  live_qr_url?: string;
}

interface LiveMessage {
  id: string; nickname: string; message: string; team_color: 'red' | 'blue' | 'green' | 'yellow' | 'neutral'; created_at: string;
  randomX?: number; randomY?: number; effectClass?: string; phase?: 'floating' | 'center' | 'queued';
}

const QUIZ_EFFECTS = ['animate-[wiggle_1s_infinite]', 'animate-[pulse-fast_0.5s_infinite]', 'animate-[float-random_3s_infinite]', 'animate-[jelly_2s_infinite]'];
const GAME_COLORS: Record<string, string> = {
  red: 'bg-red-600 border-red-400 text-red-100 shadow-red-500/50',
  blue: 'bg-blue-600 border-blue-400 text-blue-100 shadow-blue-500/50',
  green: 'bg-emerald-600 border-emerald-400 text-emerald-100 shadow-emerald-500/50',
  yellow: 'bg-yellow-600 border-yellow-400 text-yellow-100 shadow-yellow-500/50',
  neutral: 'bg-zinc-600 border-zinc-400 text-zinc-100 shadow-zinc-500/50'
};

const NEON_COLORS = [
  'drop-shadow-[0_0_15px_rgba(20,184,166,0.8)] text-teal-300',
  'drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] text-orange-300',
  'drop-shadow-[0_0_15px_rgba(168,85,247,0.8)] text-purple-300',
  'drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] text-white',
  'drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] text-pink-300',
  'drop-shadow-[0_0_15px_rgba(132,204,22,0.8)] text-lime-300',
  'drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] text-cyan-300',
  'drop-shadow-[0_0_15px_rgba(244,63,94,0.8)] text-rose-300',
  'drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] text-yellow-300',
  'drop-shadow-[0_0_15px_rgba(217,70,239,0.8)] text-fuchsia-300',
  'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] text-red-300',
  'drop-shadow-[0_0_15px_rgba(16,185,129,0.8)] text-emerald-300',
];

const getNeonColor = (id: string) => {
  let hash = 0;
  if (!id) return NEON_COLORS[0];
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return NEON_COLORS[Math.abs(hash) % NEON_COLORS.length];
};

const CORPORATE_THEMES = [
  // 🔹 โทนน้ำเงิน / ฟ้า (Professional & Trust)
  { bg: 'bg-gradient-to-r from-blue-950 to-indigo-900', text: 'text-sky-300', glow: 'drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]' },
  { bg: 'bg-gradient-to-r from-cyan-950 to-blue-900', text: 'text-cyan-300', glow: 'drop-shadow-[0_0_12px_rgba(103,232,249,0.8)]' },
  { bg: 'bg-gradient-to-r from-sky-950 to-indigo-950', text: 'text-sky-200', glow: 'drop-shadow-[0_0_12px_rgba(186,230,253,0.8)]' },
  { bg: 'bg-gradient-to-r from-slate-900 to-blue-950', text: 'text-blue-300', glow: 'drop-shadow-[0_0_12px_rgba(147,197,253,0.8)]' },
  { bg: 'bg-gradient-to-r from-blue-950 to-teal-900', text: 'text-cyan-200', glow: 'drop-shadow-[0_0_12px_rgba(165,243,252,0.8)]' },

  // 🌿 โทนเขียว / มรกต (Fresh & Growth)
  { bg: 'bg-gradient-to-r from-emerald-950 to-teal-900', text: 'text-emerald-300', glow: 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' },
  { bg: 'bg-gradient-to-r from-lime-950 to-green-900', text: 'text-lime-300', glow: 'drop-shadow-[0_0_12px_rgba(190,242,100,0.8)]' },
  { bg: 'bg-gradient-to-r from-green-950 to-emerald-900', text: 'text-emerald-400', glow: 'drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]' },
  { bg: 'bg-gradient-to-r from-teal-950 to-cyan-900', text: 'text-teal-300', glow: 'drop-shadow-[0_0_12px_rgba(94,234,212,0.8)]' },
  { bg: 'bg-gradient-to-r from-green-950 to-teal-950', text: 'text-green-300', glow: 'drop-shadow-[0_0_12px_rgba(134,239,172,0.8)]' },

  // 🌸 โทนชมพู / ม่วง (Creative & Elegant)
  { bg: 'bg-gradient-to-r from-rose-950 to-pink-900', text: 'text-pink-300', glow: 'drop-shadow-[0_0_12px_rgba(244,114,182,0.8)]' },
  { bg: 'bg-gradient-to-r from-violet-950 to-purple-900', text: 'text-fuchsia-300', glow: 'drop-shadow-[0_0_12px_rgba(232,121,249,0.8)]' },
  { bg: 'bg-gradient-to-r from-fuchsia-950 to-pink-900', text: 'text-pink-200', glow: 'drop-shadow-[0_0_12px_rgba(251,207,232,0.8)]' },
  { bg: 'bg-gradient-to-r from-purple-950 to-indigo-900', text: 'text-purple-300', glow: 'drop-shadow-[0_0_12px_rgba(216,180,254,0.8)]' },
  { bg: 'bg-gradient-to-r from-violet-900 to-fuchsia-950', text: 'text-violet-300', glow: 'drop-shadow-[0_0_12px_rgba(196,181,253,0.8)]' },

  // ☀️ โทนเหลือง / ส้ม / แดง (Warm & Energy)
  { bg: 'bg-gradient-to-r from-amber-950 to-orange-900', text: 'text-amber-300', glow: 'drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' },
  { bg: 'bg-gradient-to-r from-red-950 to-rose-900', text: 'text-rose-300', glow: 'drop-shadow-[0_0_12px_rgba(251,113,133,0.8)]' },
  { bg: 'bg-gradient-to-r from-orange-950 to-red-900', text: 'text-orange-300', glow: 'drop-shadow-[0_0_12px_rgba(253,186,116,0.8)]' },
  { bg: 'bg-gradient-to-r from-yellow-950 to-amber-900', text: 'text-yellow-300', glow: 'drop-shadow-[0_0_12px_rgba(253,224,71,0.8)]' },
  { bg: 'bg-gradient-to-r from-rose-950 to-red-950', text: 'text-rose-400', glow: 'drop-shadow-[0_0_12px_rgba(2fb,113,133,0.8)]' },
  { bg: 'bg-gradient-to-r from-yellow-900 to-orange-950', text: 'text-yellow-400', glow: 'drop-shadow-[0_0_12px_rgba(250,204,21,0.8)]' },

  // 🌑 โทนคลาสสิก / เทา (Modern & Minimal)
  { bg: 'bg-gradient-to-r from-slate-950 to-zinc-900', text: 'text-gray-300', glow: 'drop-shadow-[0_0_12px_rgba(209,213,219,0.8)]' },
  { bg: 'bg-gradient-to-r from-stone-900 to-zinc-900', text: 'text-stone-300', glow: 'drop-shadow-[0_0_12px_rgba(214,211,209,0.8)]' },
  { bg: 'bg-gradient-to-r from-zinc-950 to-slate-800', text: 'text-zinc-300', glow: 'drop-shadow-[0_0_12px_rgba(212,212,216,0.8)]' },
  { bg: 'bg-gradient-to-r from-neutral-950 to-stone-900', text: 'text-neutral-300', glow: 'drop-shadow-[0_0_12px_rgba(212,212,212,0.8)]' },
  { bg: 'bg-gradient-to-r from-indigo-950 to-slate-900', text: 'text-indigo-300', glow: 'drop-shadow-[0_0_12px_rgba(165,180,252,0.8)]' },
];

const getCorporateTheme = (topic: string) => {
  let hash = 0;
  if (!topic) return CORPORATE_THEMES[0];
  for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
  return CORPORATE_THEMES[Math.abs(hash) % CORPORATE_THEMES.length];
};

const DUAL_TRANSITIONS = [
  'animate-in zoom-in-[0.9] fade-in duration-1000',
  'animate-in slide-in-from-bottom-10 fade-in duration-[1200ms]',
  'animate-in slide-in-from-left-10 fade-in duration-[1500ms]',
  'animate-in slide-in-from-right-10 fade-in duration-[1500ms]',
  'animate-in zoom-in-110 fade-in duration-[2000ms] ease-out',
  'animate-in spin-in-3 fade-in duration-1000',
];

export default function MainProjectorDisplay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); // 🎵 ตัวเล่นเพลง

  // 🌟 State ควบคุมจาก MC

  // 🌟 State ควบคุมเสียงเพลง และจำกัดภาพ
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [slideshowLimit, setSlideshowLimit] = useState<number>(0);

  const [screen, setScreen] = useState<ScreenState>({
    mode: 'standby', media_url: '', single_video_url: '', playlist: [], video_playlist: [],
    ticker_text: '', ticker_speed: '20s', ticker_color: '#FFFFFF', ticker_direction: 'rtl',
    quiz_question: '', quiz_correct_answer: '', game_phase: 'brainstorm', reveal_step: 0
  });
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  const [currentVidIndex, setCurrentVidIndex] = useState(0);

  const [columns, setColumns] = useState(3);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isListView, setIsListView] = useState(false);
  const [fontSize, setFontSize] = useState(26);

  const [livePhotos, setLivePhotos] = useState<any[]>([]);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);
  const [galleryTransition, setGalleryTransition] = useState('animate-in zoom-in-[0.98] fade-in duration-1000');

  const [dualPhotoChunks, setDualPhotoChunks] = useState<any[][]>([]);
  const [currentDualChunkIdx, setCurrentDualChunkIdx] = useState(0);
  const [dualTransitionClass, setDualTransitionClass] = useState(DUAL_TRANSITIONS[0]);

  const [showPhotoName, setShowPhotoName] = useState(true);
  const [showPhotoCaption, setShowPhotoCaption] = useState(true);

  // 🌟 State สำหรับเก็บ URL ของหน้าจอ Live ที่สร้างอัตโนมัติ
  const [dynamicLiveUrl, setDynamicLiveUrl] = useState('');

  // 🌟 ดึง event_id จาก Address Bar ของหน้า Display แล้วสร้าง URL อัตโนมัติ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const eventId = urlParams.get('event_id') || 'current';
      const origin = window.location.origin; // ดึง http://localhost:3000 หรือโดเมนจริงของเว็บ
      
      // ประกอบร่าง URL สำหรับให้ผู้ร่วมงานสแกนเข้าเล่นเกม
      setDynamicLiveUrl(`${origin}/live?event_id=${eventId}`);
    }
  }, []);

  // โลโก้ NiiVaa SmartEvent มุมขวาบน
  const [showFloatingLogo, setShowFloatingLogo] = useState(false);

  useEffect(() => {
    const triggerLogo = () => {
      setShowFloatingLogo(true);
      setTimeout(() => setShowFloatingLogo(false), 10000);
    };
    triggerLogo();
    const logoInterval = setInterval(triggerLogo, 60000);
    return () => clearInterval(logoInterval);
  }, []);

  // 1. ดึงภาพจาก Database (ครอบคลุม 3 โหมด) และเพิ่ม Real-time
  useEffect(() => {
    const fetchPhotos = async () => {
      const { data } = await supabase.from('live_photos')
        .select('*')
        .eq('is_approved', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // 🌟 ตัดข้อมูลรูปภาพตาม Limit ที่ตั้งไว้ (ถ้า 0 คือเอาทั้งหมด)
        const activeData = slideshowLimit > 0 ? data.slice(0, slideshowLimit) : data;

        setLivePhotos(activeData);
        setCurrentPhotoIdx(0);

        const chunks = [];
        for (let i = 0; i < activeData.length; i += 2) {
          let chunk = activeData.slice(i, i + 2);
          if (chunk.length === 1 && i > 0) chunk = [activeData[i - 1], activeData[i]];
          chunks.push(chunk);
        }
        setDualPhotoChunks(chunks);
        setCurrentDualChunkIdx(0);
      }
    };

    if (['live_gallery', 'dual_slideshow', 'activity_gallery'].includes(screen.mode)) {
      fetchPhotos();
    }

    // 🌟 ดักฟังการเปลี่ยนแปลง Database แบบ Real-time
    const photoChannel = supabase.channel('display_live_photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_photos' }, fetchPhotos)
      .subscribe();

    return () => { supabase.removeChannel(photoChannel); };
  }, [screen.mode, slideshowLimit]);

  // ==========================================
  // 🎵 ระบบควบคุมเพลง Background Music (BGM) & Fade out แบบแนบเนียน
  // ==========================================
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/bgm-soft.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
    }

    const audio = audioRef.current;

    if (bgmPlaying) {
      audio.volume = 0.4; // 🌟 ความดังเสียงคลอ (40%)
      audio.play().catch(e => {
        console.log("ต้องคลิกที่จอ 1 ครั้งก่อนเพื่อให้เบราว์เซอร์อนุญาตเล่นเสียง", e);
        alert("⚠️ กรุณาคลิกที่หน้าจอโปรเจคเตอร์ 1 ครั้ง เพื่อให้ระบบเสียงทำงาน");
      });
    } else {
      // Fade out ค่อยๆ ลดเสียงลงจนดับ
      if (!audio.paused) {
        let vol = audio.volume;
        const fadeTimer = setInterval(() => {
          if (vol > 0.05) {
            vol -= 0.02;
            audio.volume = vol;
          } else {
            clearInterval(fadeTimer);
            audio.pause();
          }
        }, 100);
      }
    }
  }, [bgmPlaying]); // 🌟 อัปเดตเมื่อค่า bgmPlaying เปลี่ยน

  // 2. ตัวตั้งเวลาสลับภาพ (สไลด์เดี่ยว และ สไลด์กิจกรรม)
  useEffect(() => {
    if (['live_gallery', 'activity_gallery'].includes(screen.mode) && livePhotos.length > 1) {
      const intervalTime = (screen.gallery_interval_sec || 4) * 1000;
      const interval = setInterval(() => {
        // 🌟 แก้ไขคลาสแอนิเมชันใหม่ทั้งหมด ให้ปรากฏขึ้นมาแบบสวยงาม
        const TRANSITIONS = [
          'animate-in zoom-in-50 fade-in duration-1000',
          'animate-in slide-in-from-bottom-32 fade-in duration-[1200ms]',
          'animate-in slide-in-from-left-40 fade-in duration-[1500ms]',
          'animate-in slide-in-from-right-40 fade-in duration-[1500ms]',
          'animate-in zoom-in-110 fade-in duration-[2000ms] ease-out',
          'animate-in spin-in-3 fade-in duration-[1200ms]',
        ];
        setGalleryTransition(TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)]); setCurrentPhotoIdx(prevIdx => (prevIdx + 1) % livePhotos.length);
      }, intervalTime);
      return () => clearInterval(interval);
    }
  }, [screen.mode, screen.gallery_interval_sec, livePhotos.length]);

  // 3. ตัวตั้งเวลาสลับภาพ (สไลด์คู่)
  useEffect(() => {
    if (screen.mode === 'dual_slideshow' && dualPhotoChunks.length > 1) {
      const intervalTime = (screen.gallery_interval_sec || 10) * 1000;
      const interval = setInterval(() => {
        setDualTransitionClass(DUAL_TRANSITIONS[Math.floor(Math.random() * DUAL_TRANSITIONS.length)]);
        setCurrentDualChunkIdx(prevIdx => (prevIdx + 1) % dualPhotoChunks.length);
      }, intervalTime);
      return () => clearInterval(interval);
    }
  }, [screen.mode, dualPhotoChunks.length, screen.gallery_interval_sec]);

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialState = async () => {
      const { data: screenData } = await supabase.from('screen_state').select('*').eq('id', 'current').single();
      if (screenData) setScreen(screenData);
      const { data: msgData } = await supabase.from('live_messages').select('*').order('created_at', { ascending: true });
      if (msgData) setMessages(msgData.map(m => injectRandomData(m)));
    };
    fetchInitialState();

    const screenChannel = supabase.channel('screen_changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' },
      (payload) => setScreen(payload.new as ScreenState)).subscribe();

    const msgChannel = supabase.channel('message_changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages' },
      (payload) => setMessages(prev => [...prev, injectRandomData(payload.new as LiveMessage)]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'live_messages' }, () => setMessages([])).subscribe();

    return () => { supabase.removeChannel(screenChannel); supabase.removeChannel(msgChannel); };
  }, []);

  useEffect(() => {
    if (screen.mode === 'get_ready' || screen.game_phase === 'get_ready') setMessages([]);
  }, [screen.mode, screen.game_phase]);

  useEffect(() => {
    if (screen.quiz_question && screen.quiz_question !== 'รอสักครู่...') setMessages([]);
  }, [screen.quiz_question]);

  useEffect(() => {
    if (screen.mode === 'grand_leaderboard') {
      supabase.from('player_scores').select('*').order('score', { ascending: true })
        .then(({ data }) => { if (data) setLeaderboardData(data); });
    }
  }, [screen.mode, screen.reveal_step]);

  useEffect(() => {
    setCurrentVidIndex(0);
  }, [screen.video_playlist, screen.single_video_url]);

  // Broadcast ควบคุมหน้าจอ และรับคำสั่งเสียงเพลง
  useEffect(() => {
    const syncChannel = supabase.channel('display_sync');
    syncChannel.on('broadcast', { event: 'layout_change' }, (payload) => {
      if (payload.payload.columns !== undefined) setColumns(payload.payload.columns);
      if (payload.payload.autoScroll !== undefined) setAutoScroll(payload.payload.autoScroll);
      if (payload.payload.isListView !== undefined) setIsListView(payload.payload.isListView);
      if (payload.payload.fontSize !== undefined) setFontSize(payload.payload.fontSize);
    })
      .on('broadcast', { event: 'display_settings' }, (payload) => {
        if (payload.payload.showPhotoName !== undefined) setShowPhotoName(payload.payload.showPhotoName);
        if (payload.payload.showPhotoCaption !== undefined) setShowPhotoCaption(payload.payload.showPhotoCaption);

        // 🎵 รับคำสั่งเปลี่ยนสถานะเพลง
        if (payload.payload.bgmPlaying !== undefined) {
          setBgmPlaying(payload.payload.bgmPlaying);
        }

        if (payload.payload.slideshowLimit !== undefined) {
          setSlideshowLimit(payload.payload.slideshowLimit);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(syncChannel); };
  }, []);


  const broadcastLayout = (cols: number, scroll: boolean, listMode: boolean, fSize: number) => {
    setColumns(cols); setAutoScroll(scroll); setIsListView(listMode); setFontSize(fSize);
    supabase.channel('display_sync').send({ type: 'broadcast', event: 'layout_change', payload: { columns: cols, autoScroll: scroll, isListView: listMode, fontSize: fSize } });
  };

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, autoScroll, columns, isListView, fontSize]);

  useEffect(() => {
    if (screen.mode === 'video' && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(err => console.error("Autoplay blocked:", err));
    }
  }, [screen.single_video_url, screen.mode, currentVidIndex]);

  const injectRandomData = (msg: LiveMessage): LiveMessage => ({
    ...msg, phase: 'floating', effectClass: QUIZ_EFFECTS[Math.floor(Math.random() * QUIZ_EFFECTS.length)],
    randomX: Math.floor(Math.random() * 70) + 12, randomY: Math.floor(Math.random() * 55) + 25,
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (screen.mode === 'slideshow' && screen.playlist?.length > 0) {
      const intervalTime = (screen.gallery_interval_sec || 15) * 1000;
      interval = setInterval(() => setSlideIndex((prev) => (prev + 1) % screen.playlist.length), intervalTime);
    }
    return () => clearInterval(interval);
  }, [screen.mode, screen.playlist, screen.gallery_interval_sec]);

  const safeAnswer = (screen.quiz_correct_answer || '').toLowerCase().trim();
  const correctSubs = messages.filter(m => (m.message || '').toLowerCase().includes(safeAnswer)).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const getTeamScore = (color: string) => messages.filter(m => m.team_color === color && (m.message || '').toLowerCase().includes(safeAnswer)).length * 10;
  const redScore = getTeamScore('red'); const blueScore = getTeamScore('blue'); const greenScore = getTeamScore('green'); const yellowScore = getTeamScore('yellow');
  const totalTug = redScore + blueScore; const redPercent = totalTug === 0 ? 50 : (redScore / totalTug) * 100; const maxScore = Math.max(redScore, blueScore, greenScore, yellowScore, 100);
  const fastestWinner = correctSubs[0];

  const gridColsClass = { 1: 'grid-cols-1 max-w-4xl mx-auto', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns] || 'grid-cols-3';

  const handleVideoEnded = () => {
    if (screen.video_playlist && currentVidIndex < screen.video_playlist.length - 1) setCurrentVidIndex(prev => prev + 1);
  };
  // 🌟 เพิ่มฟังก์ชันบังคับเล่นเพลงเมื่อคลิกหน้าจอ (เผื่อเบราว์เซอร์ดื้อ)
  const handleScreenClick = () => {
    if (bgmPlaying && audioRef.current && audioRef.current.paused) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(e => console.error("Still blocked:", e));
    }
  };
  return (
    <div onClick={handleScreenClick} className="w-screen h-screen bg-black overflow-hidden relative font-sans select-none cursor-auto">

      {/* 🎵 เครื่องเล่นเพลงพื้นหลัง (ฝังลง DOM เพื่อความเสถียร 100%) */}
      <audio ref={audioRef} src="/bgm-soft.mp3" loop preload="auto" />
      {/* 🌟 NiiVaa SmartEvent ลอยมุมขวาบน */}
      <div className={`absolute top-8 right-10 z-[999] transition-all duration-1000 transform ${showFloatingLogo ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}>
        <div className="flex items-baseline gap-2 bg-transparent px-5 py-2.5">
          <span className="font-black text-3xl tracking-tighter text-[#60a5fa] drop-shadow-[0_0_15px_rgba(59,130,246,1)] drop-shadow-[0_0_30px_rgba(30,58,138,0.8)] animate-pulse">
            NiiVaa
          </span>
          <span className="font-bold text-2xl tracking-widest text-[#2dd4bf] drop-shadow-[0_0_15px_rgba(45,212,191,1)] drop-shadow-[0_0_30px_rgba(15,118,110,0.8)] opacity-90">
            SMARTEVENT
          </span>
        </div>
      </div>

      {/* 🛠️ Floating Control Panel สำหรับโหมดเกม */}
      {(screen.mode === 'game' || screen.mode === 'quiz' || screen.mode === 'tug_of_war') && (
        <div className="absolute top-4 right-4 z-[150] opacity-0 hover:opacity-100 transition-opacity duration-300 bg-zinc-900/90 backdrop-blur border border-zinc-700 p-2 rounded-2xl flex items-center gap-2 shadow-2xl">
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl">
            <button onClick={() => broadcastLayout(columns, autoScroll, true, fontSize)} className={`p-2 rounded-lg transition-all ${isListView ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="โหมดลิสต์รายการ"><ListOrdered size={18} /></button>
            <div className="w-px h-4 bg-zinc-700 mx-1"></div>
            <button onClick={() => broadcastLayout(1, autoScroll, false, fontSize)} className={`p-2 rounded-lg transition-all ${!isListView && columns === 1 ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="1 คอลัมน์"><AlignJustify size={18} /></button>
            <button onClick={() => broadcastLayout(2, autoScroll, false, fontSize)} className={`p-2 rounded-lg transition-all ${!isListView && columns === 2 ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="2 คอลัมน์"><Columns2 size={18} /></button>
            <button onClick={() => broadcastLayout(3, autoScroll, false, fontSize)} className={`p-2 rounded-lg transition-all ${!isListView && columns === 3 ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="3 คอลัมน์"><Columns3 size={18} /></button>
            <button onClick={() => broadcastLayout(4, autoScroll, false, fontSize)} className={`p-2 rounded-lg transition-all ${!isListView && columns === 4 ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`} title="4 คอลัมน์"><LayoutGrid size={18} /></button>
          </div>
          <div className="w-px h-6 bg-zinc-700 mx-1"></div>
          <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl">
            <button onClick={() => broadcastLayout(columns, autoScroll, isListView, Math.max(14, fontSize - 2))} className="px-3 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded font-bold transition-all" title="ลดขนาดอักษร">A-</button>
            <span className="text-xs text-cyan-400 font-mono w-6 text-center">{fontSize}</span>
            <button onClick={() => broadcastLayout(columns, autoScroll, isListView, Math.min(80, fontSize + 2))} className="px-3 py-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded font-bold transition-all" title="เพิ่มขนาดอักษร">A+</button>
          </div>
          <div className="w-px h-6 bg-zinc-700 mx-1"></div>
          <button onClick={() => broadcastLayout(columns, !autoScroll, isListView, fontSize)} className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all ${autoScroll ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-600/20 text-red-400 border border-red-500/30'}`}>
            {autoScroll ? <ArrowDownToLine size={16} /> : <PauseCircle size={16} />}
            {autoScroll ? 'SCROLL: ON' : 'PAUSED'}
          </button>
        </div>
      )}

      {/* 🖼️ แผงควบคุมลอยตัว สำหรับโหมดนำเสนอภาพ (โชว์/ซ่อน ข้อความ) */}
      {(['live_gallery', 'single_photo', 'dual_photo', 'dual_slideshow', 'activity_single', 'activity_gallery'].includes(screen.mode)) && (
        <div className="absolute top-20 right-4 z-[500] opacity-0 hover:opacity-100 transition-opacity duration-300 bg-zinc-900/90 backdrop-blur border border-zinc-700 p-2 rounded-2xl flex items-center gap-2 shadow-2xl">
          <div className="text-zinc-500 font-bold text-[10px] px-2 uppercase tracking-wider">Display Settings</div>
          <div className="w-px h-6 bg-zinc-700 mx-1"></div>
          <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-xl">
            <button onClick={() => setShowPhotoName(!showPhotoName)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${showPhotoName ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'}`}>
              {showPhotoName ? <Eye size={14} /> : <EyeOff size={14} />} ชื่อ-สกุล
            </button>
            <button onClick={() => setShowPhotoCaption(!showPhotoCaption)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${showPhotoCaption ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 border border-transparent'}`}>
              {showPhotoCaption ? <MessageSquare size={14} /> : <EyeOff size={14} />} คำอวยพร
            </button>
          </div>
        </div>
      )}

      {/* พื้นหลังหลัก (ถ้าสแตนด์บายจะดำ) */}
      <div className={`absolute inset-0 z-0 transition-colors duration-1000 ${screen.mode === 'sudden_death' && screen.game_phase === 'reveal' && fastestWinner ? (fastestWinner.team_color === 'red' ? 'bg-red-950' : fastestWinner.team_color === 'blue' ? 'bg-blue-950' : fastestWinner.team_color === 'green' ? 'bg-emerald-950' : 'bg-yellow-950') : 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]'}`}>
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="text-center"><div className="text-[140px] tracking-tighter font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">NiiVaa</div><p className="text-3xl text-zinc-500 tracking-[1em] mt-4 font-bold">SMARTEVENT</p></div>
        </div>

        {screen.mode !== 'standby' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center animate-in fade-in duration-1000">
            {screen.mode === 'video' && (screen.video_playlist?.length ? screen.video_playlist[currentVidIndex] : screen.single_video_url) && (
              <video ref={videoRef} src={screen.video_playlist?.length ? screen.video_playlist[currentVidIndex] : screen.single_video_url} className="w-full h-full object-contain bg-black" autoPlay controls={false} loop={!screen.video_playlist || screen.video_playlist.length <= 1} onEnded={handleVideoEnded} muted={false} />
            )}
            {screen.mode === 'image' && screen.media_url && (
              <img src={screen.media_url} className="w-full h-full object-contain" />
            )}
            {screen.mode === 'slideshow' && screen.playlist?.length > 0 && (
              screen.playlist.map((url, i) => (
                <img key={i} src={url} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ${i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} />
              ))
            )}
          </div>
        )}
      </div>

      {screen.mode !== 'standby' && screen.mode !== 'get_ready' && (
        <div className="absolute top-6 left-6 z-[100] bg-black/40 backdrop-blur-sm p-3 rounded-2xl border border-white/10 shadow-xl animate-in fade-in duration-500">
          <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x40?text=NiiVaa'; }} />
        </div>
      )}

      {/* ========================================== */}
      {/* 🎮 โหมดเกมต่างๆ (Game, Quiz, Tug of War, Leaderboards) */}
      {/* ========================================== */}
      {screen.mode === 'get_ready' && (
        <div className="absolute inset-0 z-[60] bg-black overflow-hidden flex flex-col items-center justify-center animate-in fade-in duration-500">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={`absolute text-teal-500/10 ${i % 2 === 0 ? 'animate-bounce' : 'animate-pulse'}`}
              style={{
                top: `${Math.floor(Math.random() * 90)}%`, left: `${Math.floor(Math.random() * 90)}%`,
                fontSize: `${Math.random() * 3 + 2}rem`, animationDuration: `${Math.random() * 3 + 2}s`,
                transform: `rotate(${Math.random() * 45 - 20}deg)`
              }}>📱</div>
          ))}
          <div className="absolute text-teal-500/5 animate-pulse" style={{ fontSize: '45rem', right: '-10rem', bottom: '-15rem', transform: 'rotate(-15deg)' }}>📲</div>
          <div className="relative z-10 text-center animate-in zoom-in-95 duration-1000 flex flex-col items-center">
            <div className="bg-teal-950/40 px-8 py-3 rounded-full border border-teal-500/30 mb-8 animate-pulse">
              <span className="text-teal-400 font-bold text-xl tracking-[0.5em] uppercase">STANDBY FOR NEXT ROUND</span>
            </div>
            <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-teal-200 to-teal-500 drop-shadow-[0_0_40px_rgba(45,212,191,0.8)] tracking-wide animate-pulse">
              เตรียมร่วมตอบเกมข้อต่อไป
            </h1>
            <p className="text-3xl text-teal-100/50 mt-8 tracking-widest font-medium">GET YOUR PHONES READY</p>
          </div>
        </div>
      )}

      {screen.mode !== 'video' && screen.mode !== 'get_ready' && (
        <>
          {screen.mode === 'game' && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in flex flex-col p-12 pt-28">
              <div className="text-center mb-8 shrink-0">
                <h2 className="text-xl text-cyan-400 font-bold tracking-widest uppercase mb-2">LIVE MESSAGES</h2>
                <h1 className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                  {screen.quiz_question && screen.quiz_question !== 'รอสักครู่...' ? screen.quiz_question : 'ส่งข้อความของคุณเข้าสู่หน้าจอ!'}
                </h1>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 relative w-full">
                {isListView ? (
                  <div className="w-full max-w-6xl mx-auto flex flex-col border-2 border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-black/60">
                    {messages.map((msg, idx) => {
                      const bgTone = Math.floor(idx / 5) % 2 === 0 ? 'bg-zinc-900/60' : 'bg-indigo-950/40';
                      const isDivider = (idx + 1) % 5 === 0 && (idx + 1) !== messages.length;
                      const borderStyle = isDivider ? 'border-b-2 border-cyan-500 shadow-[0_5px_15px_rgba(6,182,212,0.15)]' : 'border-b border-white/5';
                      return (
                        <div key={msg.id} className={`flex items-start gap-4 py-3 px-6 ${bgTone} ${borderStyle} hover:bg-white/5 transition-colors animate-in fade-in slide-in-from-bottom-2`}>
                          <span className="font-black text-cyan-400 shrink-0 text-right opacity-80 pt-1" style={{ fontSize: `${fontSize * 0.75}px`, minWidth: '3rem' }}>{idx + 1}.</span>
                          <span className="font-bold text-emerald-400 shrink-0 pt-1 truncate" style={{ fontSize: `${fontSize * 0.85}px`, minWidth: '8rem', maxWidth: '12rem' }}>{msg.nickname}</span>
                          <span className="text-white font-medium flex-1 break-words transition-all duration-300" style={{ fontSize: `${fontSize}px`, lineHeight: '1.4' }}>
                            {screen.game_phase === 'brainstorm' ? (
                              <span className="text-zinc-500 italic animate-pulse">🔒 ซ่อนข้อความ...</span>
                            ) : msg.message}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`grid ${gridColsClass} gap-6 w-full`}>
                    {messages.map((msg) => (
                      <div key={msg.id} className="bg-white/10 backdrop-blur-md border-l-4 border-l-cyan-400 border border-white/10 p-5 rounded-2xl shadow-xl animate-in zoom-in-95 duration-500 flex flex-col gap-2">
                        <div className="font-black text-cyan-400 flex items-center gap-2" style={{ fontSize: `${fontSize * 0.6}px` }}>👤 {msg.nickname}</div>
                        <div className="font-bold text-white leading-snug break-words transition-all duration-300" style={{ fontSize: `${fontSize}px` }}>
                          {screen.game_phase === 'brainstorm' ? (
                            <span className="text-zinc-400 italic animate-pulse">🔒 ซ่อนข้อความ...</span>
                          ) : msg.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} className="h-10" />
              </div>
            </div>
          )}

          {screen.mode === 'quiz' && (() => {
            // 🌟 1. ดึงและจัดรูปแบบข้อมูลตัวเลือกออกมาไว้ข้างนอกสุด เพื่อให้ใช้เช็คเงื่อนไขเลื่อนข้อความได้
            let safeOptions: any[] = [];
            try {
              if (Array.isArray(screen.quiz_options)) {
                safeOptions = screen.quiz_options;
              } else if (typeof screen.quiz_options === 'string') {
                const trimmed = (screen.quiz_options as string).trim();
                if (trimmed !== '' && trimmed !== '""' && trimmed !== '[]') {
                  safeOptions = JSON.parse(trimmed);
                }
              }
            } catch (e) {
              console.error("Display - Quiz options parse error:", e);
            }

            const hasOptions = safeOptions.length > 0;
            const thaiPrefixes = ['ก.', 'ข.', 'ค.', 'ง.', 'จ.', 'ฉ.'];

            return (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in">
                
                {/* 🌟 ส่วนโจทย์ และ ตัวเลือกช้อยส์ */}
                <div className={`absolute top-10 w-full flex justify-center z-50 transition-all duration-1000 ${screen.game_phase === 'reveal' ? 'scale-90 opacity-90 top-4' : 'scale-100'}`}>
                  <div className="flex flex-col items-center w-full max-w-5xl">
                    <div className="bg-gradient-to-b from-indigo-900 to-slate-900 px-14 py-5 rounded-3xl border-2 border-white/10 shadow-2xl text-center w-full">
                      <span className="text-indigo-400 font-black text-xs uppercase mb-1 block">LIVE QUIZ</span>
                      <h1 className="font-black text-white leading-tight" style={{ fontSize: `${fontSize + 12}px` }}>{screen.quiz_question}</h1>
                    </div>
                    
                    {/* 🌟 แสดงตัวเลือกคำถาม 4 กล่อง (ถ้ามีข้อมูล) */}
                    {hasOptions && (
                      <div className="grid grid-cols-2 gap-4 mt-6 w-full px-8">
                        {safeOptions.map((opt, idx) => {
                          const prefix = thaiPrefixes[idx] || `${idx + 1}.`;
                          const rawText = typeof opt === 'object' && opt !== null ? opt.text : String(opt);
                          const optId = typeof opt === 'object' && opt !== null && opt.id ? `${opt.id}.` : prefix;
                          const text = `${optId} ${rawText}`; // รวม ก. ไก่
                          
                          const isReveal = screen.game_phase === 'reveal';
                          const correctAns = (screen.quiz_correct_answer || '').toLowerCase().trim();
                          const isCorrect = isReveal && correctAns && text.toLowerCase().includes(correctAns);
                          
                          const colors = [
                            'bg-red-600/90 border-red-400', 
                            'bg-blue-600/90 border-blue-400', 
                            'bg-emerald-600/90 border-emerald-400', 
                            'bg-amber-600/90 border-amber-400'
                          ];

                          return (
                            <div key={idx} className={`px-6 py-4 rounded-2xl text-left font-bold border-2 shadow-lg transition-all duration-700 flex items-center 
                              ${isReveal
                                ? (isCorrect ? 'bg-emerald-500 border-white scale-[1.03] shadow-[0_0_40px_rgba(16,185,129,0.8)] z-10 text-white' : 'bg-zinc-900/80 border-zinc-800 text-zinc-600 opacity-40')
                                : `${colors[idx % 4]} text-white`
                              }`}
                            >
                              <span style={{ fontSize: `${fontSize * 0.8}px` }} className="leading-snug">{text}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 🌟 ส่วนข้อความคนตอบที่ลอยขึ้นมา */}
                {/* 🌟 ส่วนข้อความคนตอบที่ลอยขึ้นมา (ปรับสีตามช่วงเวลา) */}
                {(screen.game_phase === 'brainstorm' || screen.game_phase === 'show_answers') ? (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {messages.map((sub) => {
                      // 💡 เลื่อนข้อความหลบกล่องตัวเลือก
                      const topY = hasOptions ? ((sub.randomY || 50) * 0.5 + 45) : sub.randomY;
                      
                      // 🎨 จัดการสีของกล่องข้อความ
                      let bubbleStyle = '';
                      if (screen.game_phase === 'brainstorm') {
                        // 1. ก่อนเฉลย: สีกรมท่า (Navy) ขอบขาวเรืองแสง เหมือนกันทุกคน
                        bubbleStyle = 'bg-blue-950 border-2 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.7)]';
                      } else {
                        // 2. หลังเฉลย (show_answers): สีเปลี่ยนตามตัวเลือก (ก=แดง, ข=น้ำเงิน, ค=เขียว, ง=เหลือง)
                        const msg = (sub.message || '').trim();
                        if (msg.startsWith('ก')) bubbleStyle = 'bg-red-600/90 border-2 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]';
                        else if (msg.startsWith('ข')) bubbleStyle = 'bg-blue-600/90 border-2 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]';
                        else if (msg.startsWith('ค')) bubbleStyle = 'bg-emerald-600/90 border-2 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]';
                        else if (msg.startsWith('ง')) bubbleStyle = 'bg-amber-600/90 border-2 border-amber-400 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]';
                        else bubbleStyle = 'bg-zinc-700 border-2 border-zinc-400 text-white shadow-[0_0_15px_rgba(161,161,170,0.5)]'; // สีสำรองกรณีพิมพ์เข้ามาเอง
                      }

                      return (
                        <div key={sub.id} className={`absolute drop-shadow-xl ${sub.effectClass}`} style={{ top: `${topY}%`, left: `${sub.randomX}%` }}>
                          <div className={`${bubbleStyle} px-4 py-2.5 rounded-xl flex flex-col items-center transform rotate-[-4deg] transition-colors duration-700`}>
                            <span className="text-white/90 font-black bg-black/40 px-2 py-0.5 rounded-full mb-1" style={{ fontSize: `${fontSize * 0.4}px` }}>{sub.nickname}</span>
                            <span className="font-bold leading-tight" style={{ fontSize: `${fontSize * 0.8}px` }}>
                              {screen.game_phase === 'brainstorm' ? '🔒 *****' : sub.message}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  
                  // 🌟 ส่วนรายชื่อคนตอบถูก
                  <div className={`absolute inset-0 flex flex-col items-center animate-in fade-in duration-1000 ${hasOptions ? 'pt-[500px]' : 'pt-[420px]'}`}>
                    <div className="bg-zinc-900/90 border border-zinc-800 px-6 py-2.5 rounded-full flex gap-6 mb-6 text-sm font-bold text-zinc-400">
                      <span>ยอดส่งคำตอบ: <b className="text-white text-base">{messages.length}</b></span>
                      <span className="text-emerald-400">ตอบถูก: <b className="text-emerald-300 text-base">{correctSubs.length}</b> คน</span>
                    </div>
                    <div className="w-full flex-1 overflow-y-auto pb-12 px-4 sm:px-10 custom-scrollbar">
                      <div className={`grid ${gridColsClass} gap-4 w-full`}>
                        {correctSubs.map((sub, idx) => (
                          <div key={sub.id} className="flex items-center gap-4 bg-gradient-to-r from-emerald-950/60 to-zinc-900 p-4 rounded-2xl border border-emerald-500/30 animate-in zoom-in-95 fade-in shadow-lg">
                            <div className={`w-12 h-12 rounded-full flex shrink-0 items-center justify-center font-black text-xl border-2 ${idx === 0 ? 'bg-yellow-400 text-yellow-950 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'bg-emerald-900 text-emerald-300 border-emerald-700'}`}>{idx + 1}</div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-white font-black truncate" style={{ fontSize: `${fontSize * 0.9}px` }}>{sub.nickname}</span>
                              <span className="text-zinc-400 truncate" style={{ fontSize: `${fontSize * 0.6}px` }}>ตอบ: <b className="text-emerald-400">"{sub.message}"</b></span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div ref={messagesEndRef} className="h-4" />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {screen.mode === 'tug_of_war' && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in">
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-2xl text-center"><div className="bg-zinc-950/90 px-10 py-4 rounded-3xl border border-white/10 shadow-2xl"><span className="text-purple-400 font-black tracking-widest text-xs uppercase mb-0.5 block">ศึกชักเย่อสมองเพชร</span><h1 className="font-black text-white" style={{ fontSize: `${fontSize + 6}px` }}>{screen.quiz_question}</h1></div></div>
              <div className="absolute top-10 left-10"><span className="text-red-500 font-black text-4xl block">TEAM RED</span><span className="text-white text-xl font-bold bg-red-900/30 px-4 py-1 rounded-full border border-red-500/20">{redScore} PTS</span></div>
              <div className="absolute top-10 right-10 text-right"><span className="text-blue-500 font-black text-4xl block">TEAM BLUE</span><span className="text-white text-xl font-bold bg-blue-900/30 px-4 py-1 rounded-full border border-blue-500/20">{blueScore} PTS</span></div>
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[80vw] h-14 bg-zinc-950 rounded-full border-4 border-white/10 flex shadow-2xl"><div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${redPercent}%` }}></div><div className="h-full flex-1 bg-gradient-to-l from-blue-700 to-blue-500"></div><div className="absolute top-1/2 -translate-y-1/2 w-16 h-16 bg-zinc-900 rounded-full border-4 border-zinc-700 flex items-center justify-center font-black text-lg text-white" style={{ left: `calc(${redPercent}% - 2rem)` }}>VS</div></div>
              {screen.game_phase === 'brainstorm' && (
                <div className="absolute inset-0 pt-44 overflow-hidden pointer-events-none">
                  {messages.map((sub) => (
                    <div key={sub.id} className={`absolute drop-shadow-md ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: sub.team_color === 'red' ? `${Math.floor(Math.random() * 30) + 10}%` : `${Math.floor(Math.random() * 30) + 60}%` }}>
                      <div className={`px-4 py-2 rounded-xl border border-white/20 text-white font-bold ${sub.team_color === 'red' ? 'bg-red-600' : 'bg-blue-600'}`} style={{ fontSize: `${fontSize * 0.8}px` }}>{sub.nickname}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {screen.mode === 'leaderboard' && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute top-10 w-full flex justify-center z-50 transition-all duration-1000 ${screen.game_phase === 'reveal' ? 'scale-90 top-4' : 'scale-100'}`}><div className="bg-zinc-900 px-14 py-5 rounded-3xl border border-emerald-500/30 text-center"><span className="text-emerald-400 font-black text-xs uppercase tracking-widest block mb-1">⚡ ศึกประชันโซน 4 ทัพ</span><h1 className="font-black text-white leading-tight" style={{ fontSize: `${fontSize + 6}px` }}>{screen.quiz_question}</h1>{screen.game_phase === 'reveal' && <p className="text-yellow-400 font-black mt-3" style={{ fontSize: `${fontSize * 0.8}px` }}>เฉลย: {screen.quiz_correct_answer}</p>}</div></div>
              <div className={`absolute bottom-0 w-full h-[58vh] flex items-end justify-center gap-6 px-12 pb-10 transition-all duration-1000 ${screen.game_phase === 'reveal' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>{[{ label: 'RED', score: redScore, color: 'from-red-900 to-red-500 border-red-400' }, { label: 'BLUE', score: blueScore, color: 'from-blue-900 to-blue-500 border-blue-400' }, { label: 'GREEN', score: greenScore, color: 'from-emerald-900 to-emerald-500 border-emerald-400' }, { label: 'YELLOW', score: yellowScore, color: 'from-yellow-900 to-yellow-500 border-yellow-400' }].map((t) => (<div key={t.label} className="flex flex-col items-center w-40"><span className="text-white font-black text-2xl bg-black/40 px-3 py-1 rounded-xl mb-2">{t.score}</span><div className={`w-full bg-gradient-to-t rounded-t-2xl border-t-2 border-l-2 border-r-2 ${t.color}`} style={{ height: screen.game_phase === 'reveal' ? `${(t.score / maxScore) * 100}%` : '0%', minHeight: '1.5rem' }}></div><div className="mt-4 text-zinc-400 font-black text-xl tracking-wider">{t.label}</div></div>))}</div>
              {screen.game_phase === 'brainstorm' && (<div className="absolute inset-0 pt-44 overflow-hidden pointer-events-none">{messages.map((sub) => (<div key={sub.id} className={`absolute drop-shadow-md ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: `${sub.randomX}%` }}><div className={`px-4 py-2 rounded-xl border border-white/10 text-white font-bold ${GAME_COLORS[sub.team_color] || GAME_COLORS.neutral}`} style={{ fontSize: `${fontSize * 0.6}px` }}>{sub.nickname}</div></div>))}</div>)}
            </div>
          )}

          {screen.mode === 'sudden_death' && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute top-12 w-full flex justify-center z-50 transition-all duration-1000 ${screen.game_phase === 'reveal' ? '-translate-y-48 opacity-0' : 'translate-y-0'}`}><div className="bg-zinc-900 px-14 py-5 rounded-3xl border border-orange-500/30 text-center"><span className="text-orange-400 font-black text-xs uppercase tracking-widest block mb-1">⚡ ใครไวใครได้ (Sudden Death)</span><h1 className="font-black text-white leading-tight" style={{ fontSize: `${fontSize + 6}px` }}>{screen.quiz_question}</h1></div></div>
              {screen.game_phase === 'brainstorm' ? (
                <div className="absolute inset-0 pt-44 overflow-hidden pointer-events-none">{messages.map((sub) => (<div key={sub.id} className={`absolute drop-shadow-xl ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: `${sub.randomX}%` }}><div className={`px-4 py-2 rounded-xl border border-white/10 text-white font-bold flex flex-col items-center ${GAME_COLORS[sub.team_color] || GAME_COLORS.neutral}`} style={{ fontSize: `${fontSize * 0.5}px` }}><span>{sub.nickname}</span><span className="text-white/40 font-normal text-xs">[ Locked In ]</span></div></div>))}</div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">{fastestWinner ? (<div className="flex flex-col items-center animate-in zoom-in-50 fade-in"><span className="text-yellow-400 font-black tracking-[0.4em] mb-4 text-3xl">👑 THE FASTEST FINGER</span><div className={`px-20 py-12 rounded-[2.5rem] border-4 ${GAME_COLORS[fastestWinner.team_color]}`}><p className="text-white/70 font-bold text-lg mb-1">ทัพสี {fastestWinner.team_color.toUpperCase()}</p><h2 className="font-black text-white drop-shadow-2xl mb-6 text-9xl">{fastestWinner.nickname}</h2><div className="bg-black/30 px-6 py-3 rounded-xl border border-white/10"><p className="text-white font-black text-4xl">"{fastestWinner.message}"</p></div></div></div>) : (<div className="text-center text-zinc-400 font-bold text-3xl">ไม่มีใครตอบถูกเลย! (เฉลย: {screen.quiz_correct_answer})</div>)}</div>
              )}
            </div>
          )}

          {screen.mode === 'grand_leaderboard' && (() => {
            const uniqueScoresDesc = Array.from(new Set(leaderboardData.map(p => p.score))).sort((a, b) => b - a);
            const uniqueScoresAsc = [...uniqueScoresDesc].reverse();
            const revealedScores = uniqueScoresAsc.slice(0, screen.reveal_step || 0);

            const displayPlayers = leaderboardData
              .filter(p => revealedScores.includes(p.score))
              .reverse();

            return (
              <div className="absolute inset-0 z-[200] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black flex flex-col p-16 animate-in fade-in duration-1000">
                <div className="text-center shrink-0 mb-10 animate-in slide-in-from-top-10 duration-1000">
                  <span className="text-yellow-500 font-black tracking-[0.5em] text-lg uppercase block mb-2">Grand Finale Leaderboard</span>
                  <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                    สรุปคะแนนสะสมรวม
                  </h1>
                </div>

                <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto custom-scrollbar pr-4 flex flex-col gap-4">
                  {displayPlayers.map((player) => {
                    const rankNumber = uniqueScoresDesc.indexOf(player.score) + 1;
                    const isGold = rankNumber === 1; const isSilver = rankNumber === 2; const isBronze = rankNumber === 3;
                    let cardClass = 'bg-zinc-900/60 border-zinc-800'; let badgeClass = 'bg-zinc-800 text-zinc-500 border-zinc-700'; let nameClass = 'text-3xl text-zinc-300'; let scoreClass = 'text-4xl text-cyan-400';

                    if (isGold) { cardClass = 'bg-gradient-to-r from-yellow-950/60 to-black border-2 animate-[glowGold_2s_infinite]'; badgeClass = 'bg-yellow-400 text-yellow-950 border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)]'; nameClass = 'text-4xl text-yellow-400'; scoreClass = 'text-5xl text-yellow-400 drop-shadow-lg'; }
                    else if (isSilver) { cardClass = 'bg-gradient-to-r from-slate-900/70 to-black border-2 animate-[glowSilver_2s_infinite]'; badgeClass = 'bg-slate-300 text-slate-800 border-white shadow-[0_0_15px_rgba(203,213,225,0.6)]'; nameClass = 'text-4xl text-slate-300'; scoreClass = 'text-5xl text-slate-300 drop-shadow-lg'; }
                    else if (isBronze) { cardClass = 'bg-gradient-to-r from-orange-950/50 to-black border-2 animate-[glowBronze_2s_infinite]'; badgeClass = 'bg-amber-600 text-amber-950 border-amber-300 shadow-[0_0_15px_rgba(217,119,6,0.6)]'; nameClass = 'text-4xl text-orange-400'; scoreClass = 'text-5xl text-orange-400 drop-shadow-lg'; }

                    return (
                      <div key={player.nickname} className={`flex items-center gap-6 p-5 rounded-2xl transition-all duration-700 animate-in slide-in-from-top-12 fade-in ${cardClass}`}>
                        <div className={`w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center font-black text-3xl border-2 ${badgeClass}`}>
                          {rankNumber}
                        </div>
                        <div className="flex-1 flex flex-col">
                          <span className="text-zinc-500 text-xs font-black tracking-wider uppercase mb-1">TEAM {player.team_color}</span>
                          <h2 className={`font-black truncate ${nameClass}`}>{player.nickname}</h2>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-zinc-500 text-sm font-bold mb-1">TOTAL SCORE</span>
                          <span className={`font-black tracking-tighter ${scoreClass}`}>
                            {player.score} <span className="text-2xl text-zinc-600 opacity-50">PTS</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="h-20 shrink-0"></div>
                </div>
              </div>
            );
          })()}

          {/* ========================================== */}
          {/* 🔴 LAYOUT 1: บุคคลเดี่ยว (ภาพซ้าย - ข้อความขวา) */}
          {/* โหมดที่ใช้: single_photo, live_gallery */}
          {/* ========================================== */}
          {(screen.mode === 'single_photo' || screen.mode === 'live_gallery') && (() => {
            let photo = null;
            let isGallery = screen.mode === 'live_gallery';

            if (isGallery && livePhotos.length > 0) photo = livePhotos[currentPhotoIdx];
            else if (!isGallery && screen.focused_photo) photo = screen.focused_photo;

            // 🌟 เปลี่ยนจาก return null; เป็น Loading Screen
            if (!photo) return (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[200] bg-[#0b1430] animate-pulse">
                <div className="w-24 h-24 border-4 border-amber-500 rounded-full border-t-transparent animate-spin mb-6"></div>
                <div className="text-amber-500 text-3xl font-black tracking-widest drop-shadow-lg">LOADING PRESENTATION...</div>
              </div>
            );

            const textParts = (photo.nickname || '').split(/[_|-]/).map((s: any) => s.trim()).filter(Boolean);
            const mainName = textParts[0] || 'แขกผู้มีเกียรติ';
            const positions = textParts.slice(1);
            const captionNeonClass = getNeonColor(photo.id);

            return (
              <div key={isGallery ? currentPhotoIdx : photo.id} className={`absolute inset-0 z-[200] bg-[#0b1430] flex items-center justify-center p-8 overflow-hidden font-sans ${isGallery ? galleryTransition : 'animate-in fade-in duration-700'}`}>
                <div className="absolute inset-0 z-0 bg-cover bg-center blur-[80px] opacity-40 scale-125" style={{ backgroundImage: `url(${photo.url || photo.image_url})` }}></div>
                <div className="absolute inset-0 z-0 effect-smoke opacity-60 mix-blend-screen pointer-events-none"></div>

                <div className="z-10 flex flex-row items-center gap-10 xl:gap-16 w-[90%] max-w-7xl mx-auto">
                  {/* ซ้าย: ภาพกรอบ 3D */}
                  <div className="relative w-[420px] h-[580px] xl:w-[500px] xl:h-[700px] shrink-0 border-4 border-amber-400/80 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.5)] bg-zinc-950 flex items-center justify-center transform animate-in zoom-in-[0.9] duration-1000 hover:scale-[1.02] transition-transform">
                    <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15)_0%,transparent_70%)]"></div>
                    <div className="absolute inset-0 z-0 bg-cover bg-center blur-2xl opacity-40 scale-110" style={{ backgroundImage: `url(${photo.url || photo.image_url})` }}></div>
                    <img src={photo.url || photo.image_url} className="relative z-10 w-full h-full object-contain shadow-inner" alt="Profile" />
                  </div>

                  {/* ขวา: ข้อความ */}
                  <div className="flex flex-col gap-3 xl:gap-5 text-white text-left flex-1 min-w-0 animate-in slide-in-from-right-10 fade-in duration-1000 delay-300">
                    {showPhotoCaption && photo.caption && (
                      <h2 className={`font-bold italic text-[clamp(1.4rem,2vw,2.5rem)] leading-snug tracking-wide ${captionNeonClass}`}>
                        “{photo.caption}”
                      </h2>
                    )}
                    {showPhotoCaption && photo.caption && <div className="h-1 w-16 bg-gradient-to-r from-amber-400 to-transparent rounded-full my-1 opacity-50"></div>}

                    {showPhotoName && (
                      <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-400 drop-shadow-2xl text-[clamp(2.5rem,4vw,5.5rem)] leading-tight break-words">
                        {mainName}
                      </h1>
                    )}

                    {positions.length > 0 && showPhotoName && (
                      <div className="flex flex-col gap-1 mt-1">
                        {positions.map((pos: any, i: number) => (
                          <h3 key={i} className="text-sky-300 font-medium text-[clamp(1.1rem,1.5vw,1.8rem)] leading-snug drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
                            {pos}
                          </h3>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ========================================== */}
          {/* 🟢 LAYOUT 2: บุคคลคู่ (ภาพบน ข้อความทับล่าง) */}
          {/* โหมดที่ใช้: dual_photo, dual_slideshow */}
          {/* ========================================== */}
          {(screen.mode === 'dual_photo' || screen.mode === 'dual_slideshow') && (() => {
            let photosToDisplay: any[] = [];
            if (screen.mode === 'dual_photo' && screen.focused_photos) photosToDisplay = screen.focused_photos;
            else if (screen.mode === 'dual_slideshow' && dualPhotoChunks.length > 0) photosToDisplay = dualPhotoChunks[currentDualChunkIdx] || [];

            // 🌟 เปลี่ยนจาก return null; เป็น Loading Screen
            if (photosToDisplay.length === 0) return (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-[250] bg-black animate-pulse">
                <div className="w-24 h-24 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin mb-6"></div>
                <div className="text-indigo-500 text-3xl font-black tracking-widest drop-shadow-lg">LOADING SLIDESHOW...</div>
              </div>
            );

            return (
              <div key={screen.mode === 'dual_slideshow' ? currentDualChunkIdx : 'static'} className={`absolute inset-0 z-[250] bg-black overflow-hidden flex items-center justify-center pt-8 pb-20 px-8 lg:px-12 ${screen.mode === 'dual_slideshow' ? dualTransitionClass : 'animate-in fade-in duration-700'}`}>
                <div className={`w-full h-full max-w-[1700px] mx-auto grid gap-8 lg:gap-16 ${photosToDisplay.length === 1 ? 'grid-cols-1 max-w-4xl' : 'grid-cols-2'}`}>
                  {photosToDisplay.map((photo, idx) => {
                    const textParts = (photo.nickname || '').split(/[_|-]/).map((s: string) => s.trim()).filter(Boolean);
                    const mainName = textParts[0] || 'แขกผู้มีเกียรติ';
                    const positions = textParts.slice(1);
                    const captionNeonClass = getNeonColor(photo.id);

                    return (
                      <div key={photo.id || idx} className="flex flex-col items-center justify-start w-full h-full group">
                        <div className="relative w-full flex-1 rounded-[2.5rem] overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.2)] border-[3px] border-indigo-500/30 bg-zinc-950 flex flex-col justify-end">
                          <div className="absolute inset-0 z-0 bg-cover bg-center blur-2xl opacity-40 scale-110" style={{ backgroundImage: `url(${photo.url || photo.image_url})` }}></div>
                          <img src={photo.url || photo.image_url} className="absolute inset-0 w-full h-full z-10 object-contain transition-transform duration-[10000ms] ease-linear group-hover:scale-105" alt="Dual Layout" />
                          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-20 pointer-events-none"></div>

                          <div className="relative z-30 p-6 md:p-10 flex flex-col items-center text-center w-full">
                            {showPhotoCaption && photo.caption && (
                              <p className={`text-[clamp(1.2rem,1.6vw,2rem)] font-bold ${captionNeonClass} px-4 leading-snug w-[95%] truncate mb-1 drop-shadow-xl`}>
                                "{photo.caption}"
                              </p>
                            )}
                            {showPhotoName && (
                              <h1 className="text-[clamp(1.6rem,2.2vw,3rem)] font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.9)] w-[95%] truncate">
                                {mainName}
                              </h1>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col items-center gap-1 w-full px-4 h-[60px] shrink-0 justify-start">
                          {positions.length > 0 && showPhotoName && positions.map((pos: any, i: number) => (
                            <h3 key={i} className="text-zinc-300 font-bold text-[clamp(1.1rem,1.4vw,1.6rem)] leading-tight drop-shadow-md w-full text-center truncate">
                              {pos}
                            </h3>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ========================================== */}
          {/* 🔵 LAYOUT 3: กิจกรรม (ภาพ 97% ของจอ ชื่อบน Caption ล่าง ปรับสเกลอัตโนมัติ) */}
          {/* โหมดที่ใช้: activity_single, activity_gallery */}
          {/* ========================================== */}
          {(screen.mode === 'activity_single' || screen.mode === 'activity_gallery') && (() => {
            let photo = null;
            let isGallery = screen.mode === 'activity_gallery';

            if (isGallery && livePhotos.length > 0) photo = livePhotos[currentPhotoIdx];
            else if (!isGallery && screen.focused_photo) photo = screen.focused_photo;

            if (!photo) return null;

            const theme = getCorporateTheme(photo.nickname);

            return (
              <div key={isGallery ? currentPhotoIdx : photo.id} className={`absolute inset-0 z-[300] flex items-center justify-center p-[1.5vw] bg-[#0b1430] overflow-hidden ${isGallery ? galleryTransition : 'animate-in fade-in zoom-in-[0.98] duration-700'}`}>
                <div className="absolute inset-0 z-0 bg-cover bg-center blur-[80px] opacity-40 scale-125" style={{ backgroundImage: `url(${photo.url || photo.image_url})` }}></div>

                <div className="relative z-10 w-[97%] h-full max-w-[1920px] flex flex-col rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border-[3px] border-white/20 bg-black">
                  <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black/60">
                    <div className="absolute inset-0 z-0 bg-cover bg-center blur-3xl opacity-50 scale-110" style={{ backgroundImage: `url(${photo.url || photo.image_url})` }}></div>
                    <img src={photo.url || photo.image_url} className="relative z-10 w-full h-full object-contain drop-shadow-2xl" alt="Activity" />
                  </div>

                  <div className={`relative shrink-0 p-6 md:p-8 flex flex-col items-center justify-center text-center border-t-2 border-white/10 ${theme.bg}`}>
                    {showPhotoName && (
                      <h1 className="text-[clamp(1.5rem,3vw,4rem)] font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mb-2 leading-tight w-[95%] truncate">
                        {photo.nickname}
                      </h1>
                    )}
                    {showPhotoCaption && photo.caption && (
                      <p className={`text-[clamp(1rem,2vw,2.5rem)] font-bold ${theme.text} ${theme.glow} leading-snug w-[95%] line-clamp-2`}>
                        {photo.caption}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </>
      )}

      {/* TICKER MARQUEE */}
      <div
        className={`absolute bottom-0 left-0 w-full z-[500] backdrop-blur-md overflow-hidden transition-all duration-500 flex items-center shadow-2xl ${screen.ticker_text && screen.ticker_direction === 'rtl' ? 'h-20 border-t-2 border-white/10' : 'h-0 opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: screen.ticker_bg_color ? `${screen.ticker_bg_color}E6` : 'rgba(0,0,0,0.8)' }}
      >
        <div className="absolute left-0 top-0 h-full z-10 px-6 flex items-center justify-center border-r-2 border-white/20 shadow-[10px_0_20px_rgba(0,0,0,0.3)]" style={{ backgroundColor: screen.ticker_bg_color || '#0B0C60' }}>
          <span className="text-xl font-black tracking-widest text-white flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
            LIVE MSG
          </span>
        </div>
        <div className="whitespace-nowrap w-full pl-[250px]">
          <div className="inline-block font-bold text-4xl" style={{ animation: `tickerRtl ${screen.ticker_speed} linear infinite`, color: screen.ticker_color || '#FFFFFF' }}>
            {screen.ticker_text} &nbsp;&nbsp;&nbsp;&nbsp; 🟢 &nbsp;&nbsp;&nbsp;&nbsp; {screen.ticker_text}
          </div>
        </div>
      </div>

      {/* 🎮 ป้าย QR CODE สำหรับเล่นเกม (Auto Dynamic URL ผูก event_id) */}
      {screen.show_live_qr && dynamicLiveUrl && (
        <div className="absolute bottom-10 left-10 z-[300] bg-zinc-950 p-4 rounded-3xl shadow-[0_10px_40px_rgba(79,70,229,0.5)] flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in border-4 border-indigo-900/50 transform hover:scale-105 transition-transform">
          
          <div className="bg-indigo-600 text-white font-black text-xs px-5 py-1 rounded-full absolute -top-3 shadow-[0_0_15px_rgba(79,70,229,0.8)] uppercase tracking-widest">
            สแกนร่วมสนุก!
          </div>
          
          <div className="bg-white p-2 rounded-2xl">
            {/* 🌟 ใช้ dynamicLiveUrl ในการ Generate QR Code */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dynamicLiveUrl)}`} 
              alt="Game QR Code" 
              className="w-40 h-40 rounded-xl" 
            />
          </div>
          
          {/* ข้อความอธิบายด้านล่าง: สีทอง (Amber) เรืองแสง ต่างจาก QR ส่งรูป */}
          <span className="text-amber-400 font-black text-sm mt-3 tracking-widest flex items-center gap-1 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
            🎮 LIVE GAME
          </span>
        </div>
      )}

      {/* 📱 ป้าย QR CODE */}
      {screen.show_qr && screen.qr_url && (
        <div className="absolute bottom-10 right-10 z-[300] bg-white p-4 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in border-4 border-zinc-100 transform hover:scale-105 transition-transform">
          <div className="bg-cyan-500 text-white font-black text-xs px-4 py-1 rounded-full absolute -top-3 shadow-md uppercase tracking-widest">แสกนส่งรูป!</div>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(screen.qr_url)}`} alt="QR Code" className="w-40 h-40 rounded-xl" />
          <span className="text-zinc-800 font-black text-sm mt-3 tracking-wide flex items-center gap-1">📸 LIVE GALLERY</span>
        </div>
      )}
      {/* 🎵 ไฟสถานะ BGM เช็กสัญญาณจาก MC (เพิ่มใหม่) */}
      <div className={`absolute bottom-4 right-4 z-[999] px-4 py-2 rounded-full backdrop-blur-md border text-xs font-bold transition-all duration-500 ${bgmPlaying ? 'bg-pink-600/20 border-pink-500/50 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-pulse' : 'bg-black/40 border-zinc-800 text-zinc-600'}`}>
        🎵 BGM: {bgmPlaying ? 'ON' : 'OFF'}
      </div>
      {/* 🌟 แทรก Keyframes ตรงแท็ก <style> ล่างสุด */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes bgGradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes tickerRtl { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        @keyframes tickerBtt { 0% { transform: translateY(100vh); } 100% { transform: translateY(-100%); } }
        @keyframes jelly { 0%, 100% { transform: scale(1, 1); } 25% { transform: scale(0.9, 1.1); } 50% { transform: scale(1.1, 0.9); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes pulse-fast { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes float-random { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(0, -12px); } }
        
        @keyframes glowGold { 0%, 100% { box-shadow: 0 0 10px rgba(250,204,21,0.2); border-color: rgba(250,204,21,0.3); } 50% { box-shadow: 0 0 35px rgba(250,204,21,0.8); border-color: rgba(250,204,21,1); } }
        @keyframes glowSilver { 0%, 100% { box-shadow: 0 0 10px rgba(203,213,225,0.2); border-color: rgba(203,213,225,0.3); } 50% { box-shadow: 0 0 35px rgba(203,213,225,0.8); border-color: rgba(203,213,225,1); } }
        @keyframes glowBronze { 0%, 100% { box-shadow: 0 0 10px rgba(249,115,22,0.2); border-color: rgba(249,115,22,0.3); } 50% { box-shadow: 0 0 35px rgba(249,115,22,0.8); border-color: rgba(249,115,22,1); } }

        .effect-smoke { background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(251,191,36,0.05) 0%, transparent 50%); animation: smokeMove 20s infinite alternate ease-in-out; }
        @keyframes smokeMove { 0% { transform: scale(1) translate(0px, 0px); } 50% { transform: scale(1.1) translate(30px, -20px); } 100% { transform: scale(1) translate(-20px, 10px); } }
        `}} />
    </div>
  );
}