"use client";

import React, { useState, useEffect, use, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function LiveScreenPage({ params }: { params: Promise<{ eventId: string }> }) {
  const supabase = createClient();
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId; 
  
  const [screenState, setScreenState] = useState<any>(null);
  
  // 🌟 State สำหรับโหมด Auto
  const [autoIndex, setAutoIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 🌟 State สำหรับลายน้ำ NiiVaa
  const [showWatermark, setShowWatermark] = useState(false);

  // แอนิเมชันสำหรับสุ่ม
  const TRANSITIONS = [
    'animate-in fade-in zoom-in-75 duration-1000',
    'animate-in fade-in slide-in-from-bottom-24 duration-1000',
    'animate-in fade-in slide-in-from-right-32 duration-1000',
    'animate-in fade-in slide-in-from-left-32 duration-1000',
    'animate-in fade-in zoom-in-110 duration-1000'
  ];
  const [currentTransition, setCurrentTransition] = useState(TRANSITIONS[0]);

  // 1. ดึงข้อมูลและเปิด Realtime
  useEffect(() => {
    if (!eventId) return;
    const fetchInitialState = async () => {
      const { data } = await supabase.from('screen_state').select('*').eq('id', 'current').maybeSingle();
      if (data) setScreenState(data);
    };
    fetchInitialState();

    const channel = supabase.channel(`live-screen-${eventId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' },
        (payload) => {
          console.log("📢 จอ Live ได้รับข้อมูลใหม่:", payload);
          setScreenState(payload.new);
        }
      ).subscribe((status) => {
          console.log("📡 สถานะเชื่อมต่อสัญญาณจอมอนิเตอร์:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // 🌟 2. ระบบควบคุมเพลง Background Music (BGM) & Fade out
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/bgm-soft.mp3'); 
      audioRef.current.loop = true;
      audioRef.current.volume = 0;
    }

    const audio = audioRef.current;

    if (screenState?.mode === 'mc_vip_auto') {
      audio.volume = 0.2; 
      audio.play().catch(e => console.log("ต้องคลิกที่จอ 1 ครั้งก่อนเพื่อให้เบราว์เซอร์อนุญาตเล่นเสียง", e));
    } else {
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
  }, [screenState?.mode]);

  // 🌟 3. ระบบ Auto-Slide วนลูปตามเวลาที่ตั้งไว้
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (screenState?.mode === 'mc_vip_auto') {
      const attendees = screenState.payload?.attendees || [];
      const intervalSec = screenState.payload?.interval || 10;
      
      if (attendees.length > 0) {
        timer = setInterval(() => {
          setAutoIndex((prev) => (prev + 1) % attendees.length);
        }, intervalSec * 1000);
      }
    } else {
      setAutoIndex(0);
    }
    return () => clearInterval(timer);
  }, [screenState?.mode, screenState?.payload]);

  // 4. จัดการแอนิเมชัน
  useEffect(() => {
    if (screenState?.mode === 'mc_vip' || screenState?.mode === 'mc_vip_auto') {
      const isDynamic = screenState.payload?.graphic_mode === 'dynamic';
      setCurrentTransition(''); 
      setTimeout(() => {
        if (isDynamic) {
          setCurrentTransition(TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)]);
        } else {
          setCurrentTransition('animate-in fade-in zoom-in-95 duration-700');
        }
      }, 10);
    }
  }, [screenState?.payload?.fullname, screenState?.media_url, screenState?.payload?.graphic_mode, autoIndex]);

  // ==========================================
  // 🌟 ป้องกันหน้าจอดับ (Screen Wake Lock API)
  // ==========================================
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('💡 Wake Lock ทำงาน: หน้าจอจะไม่ดับอัตโนมัติแล้ว');
        }
      } catch (err: any) {
        console.error(`Wake Lock ขัดข้อง: ${err.message}`);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock !== null) {
        wakeLock.release()
          .then(() => console.log('💡 Wake Lock ถูกยกเลิก'))
          .catch(() => {});
      }
    };
  }, []);

  // ==========================================
  // 🌟 ระบบลายน้ำ (Watermark) โผล่ทุก 1 นาที ค้าง 10 วิ
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      setShowWatermark(true);
      // แสดงค้างไว้ 10 วินาที แล้วเลือนหายไป
      setTimeout(() => {
        setShowWatermark(false);
      }, 10000);
    }, 60000); // ทำงานทุกๆ 60,000 มิลลิวินาที (1 นาที)

    return () => clearInterval(interval);
  }, []);

  // ตัวแปรเก็บ UI ของลายน้ำ เพื่อเอาไปแทรกในหน้าจอแต่ละโหมด
  const WatermarkOverlay = (
    <div 
      className={`fixed bottom-6 right-8 z-[9999] pointer-events-none transition-opacity duration-1000 ease-in-out ${
        showWatermark ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="text-[11px] md:text-[13px] text-white/50 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] font-bold tracking-widest uppercase">
        NiiVaa SmartEvent By NiiVaa.com
      </span>
    </div>
  );
  
  // ==========================================
  // การแสดงผล
  // ==========================================
  if (!screenState) return <div className="bg-black w-screen h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>;

  const isVipMode = screenState.mode === 'mc_vip' || screenState.mode === 'mc_vip_auto';

  if (isVipMode) {
    const vipData = screenState.mode === 'mc_vip_auto' 
      ? (screenState.payload?.attendees?.[autoIndex] || {}) 
      : (screenState.payload || {});
      
    const isDynamic = screenState.payload?.graphic_mode === 'dynamic';
    const mediaUrl = screenState.mode === 'mc_vip_auto' ? vipData.media_url : screenState.media_url;
    
    const renderSmartName = (fullName: string) => {
      if (!fullName) return 'ไม่ระบุชื่อ';
      const parts = fullName.trim().split(' ');
      if (parts.length <= 1) return fullName; 
      const first = parts[0];
      const last = parts.slice(1).join(' '); 
      return (
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          <span className="whitespace-nowrap">{first}</span>
          <span className="whitespace-nowrap">{last}</span>
        </span>
      );
    };

    const renderSmartPosition = (position: string) => {
      if (!position) return null;
      const parts = position.trim().split(' ');
      return (
        <span className="flex flex-col gap-1">
          {parts.map((word, idx) => (
            word ? <span key={idx} className="break-words leading-tight">{word}</span> : null
          ))}
        </span>
      );
    };

    return (
      <div className="w-screen h-screen bg-[#0b1430] flex items-center justify-center relative overflow-hidden font-sans">
        
        {/* 🌟 แทรกลายน้ำมุมขวาล่าง */}
        {WatermarkOverlay}

        <div className={`absolute inset-0 z-0 bg-cover bg-center blur-[80px] opacity-40 scale-125 transition-all duration-1000 ${isDynamic ? 'animate-slow-pan' : ''}`} style={{ backgroundImage: `url(${mediaUrl || ''})` }}></div>
        {isDynamic && <div className="absolute inset-0 z-0 effect-smoke opacity-60 mix-blend-screen pointer-events-none"></div>}
        
        <div className={`z-10 flex items-center gap-16 w-[85%] max-w-7xl ${currentTransition}`}>
          <div className="relative w-[360px] h-[480px] xl:w-[480px] xl:h-[640px] shrink-0 border-4 border-amber-400/80 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(251,191,36,0.3)] bg-gradient-to-br from-slate-900 via-[#111] to-black flex items-center justify-center">
            
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.15)_0%,transparent_70%)]"></div>

            {mediaUrl ? (
              <img 
                src={mediaUrl} 
                alt="Profile" 
                className="relative z-10 w-full h-full object-cover object-center animate-in fade-in zoom-in duration-700" 
              />
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full opacity-90 animate-in fade-in duration-1000">
                <div className="flex items-center justify-center w-40 h-40 xl:w-52 xl:h-52 rounded-full bg-gradient-to-b from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-[inset_0_4px_10px_rgba(255,255,255,0.1),_0_20px_40px_rgba(0,0,0,0.8),_0_0_50px_rgba(251,191,36,0.15)]">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-20 h-20 xl:w-28 xl:h-28 text-amber-500/80 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                  >
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="mt-8 text-amber-500/50 font-bold tracking-[0.4em] text-sm xl:text-lg uppercase drop-shadow-md">
                  Guest Profile
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-5 text-white text-left flex-1 min-w-0">
            {vipData.role && (
              <div className="bg-amber-500/20 text-amber-400 px-6 py-2.5 rounded-full w-max text-2xl xl:text-3xl font-bold uppercase tracking-widest border border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                {vipData.role}
              </div>
            )}
            
            <h1 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-500 drop-shadow-2xl text-[clamp(2.5rem,5vw,5.5rem)] lg:text-[clamp(3.5rem,6vw,7rem)]">
              {renderSmartName(vipData.fullname)}
            </h1>
            
            <h2 className="text-cyan-300 font-medium text-[clamp(1.5rem,2.5vw,2.5rem)] lg:text-[clamp(1.8rem,3vw,3.5rem)]">
              {renderSmartPosition(vipData.position)}
            </h2>
            
          </div>
        </div>

        {isDynamic && (
          <style dangerouslySetInnerHTML={{__html: `
            .effect-smoke { background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(251,191,36,0.05) 0%, transparent 50%); animation: smokeMove 20s infinite alternate ease-in-out; }
            @keyframes smokeMove { 0% { transform: scale(1) translate(0px, 0px); } 50% { transform: scale(1.1) translate(30px, -20px); } 100% { transform: scale(1) translate(-20px, 10px); } }
            .animate-slow-pan { animation: slowPan 30s infinite alternate linear; }
            @keyframes slowPan { 0% { transform: scale(1.2) translate(0%, 0%); } 100% { transform: scale(1.3) translate(2%, 2%); } }
          `}} />
        )}
      </div>
    );
  }

  // โหมด Media
  if (screenState.mode === 'media') {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center relative">
        {/* 🌟 แทรกลายน้ำมุมขวาล่าง */}
        {WatermarkOverlay}
        
        <img src={screenState.media_url} className="w-full h-full object-contain animate-in fade-in duration-500" />
      </div>
    );
  }

  // โหมด Standby
  return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center relative">
      {/* 🌟 แทรกลายน้ำมุมขวาล่าง (เปิดไว้สำหรับโหมดสแตนด์บายด้วย) */}
      {WatermarkOverlay}

      <div className="absolute w-[300px] h-[300px] bg-green-500/10 rounded-full blur-[100px]"></div>
      <img src="/niivaasmartevent_logo.png" className="h-32 md:h-48 opacity-80 relative z-10 animate-pulse" style={{ animationDuration: '3s' }} alt="NiiVaa Logo" />
      <h2 className="mt-8 text-2xl md:text-4xl font-black tracking-[0.5em] text-green-400 relative z-10" style={{ textShadow: '0 0 10px #4ade80, 0 0 20px #22c55e, 0 0 40px #16a34a' }}>NiiVaa SMART DISPLAY</h2>
    </div>
  );
}