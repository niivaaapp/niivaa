"use client";

import React, { useState, useEffect, use, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Music, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
// 🌟 นำเข้า Rnd สำหรับทำหน้าต่างลอยตัวให้ลากและย่อขยายได้
import { Rnd } from 'react-rnd';

export default function MainScreenReceiver({ params }: { params: Promise<{ eventId: string }> }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = createClient();
  const resolvedParams = use(params);
  const eventId = resolvedParams.eventId;

  const [activeSource, setActiveSource] = useState('blackout');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showKaraokePanel, setShowKaraokePanel] = useState(true);

  // 🌟 State ควบคุมขนาดและตำแหน่งของหน้าต่างลอย (ค่าเริ่มต้นอยู่มุมขวาล่าง)
  // 🌟 1. State ควบคุมขนาดและตำแหน่ง (ปรับให้กะทัดรัดลง)
  const [rndState, setRndState] = useState({
    width: 400,
    height: 600,
    x: 1000,
    y: 50 // ค่าเริ่มต้นเผื่อไว้
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 🌟 คำนวณความสูงให้ปลอดภัย ไม่เกินจอ (Math.min)
      const safeHeight = Math.min(650, window.innerHeight - 60); 
      
      setRndState(prev => ({
        ...prev,
        width: 400,
        height: safeHeight,
        x: window.innerWidth - 400 - 24, // ชิดขวา
        // 🌟 Math.max ป้องกันแกน Y ติดลบ ทำให้มั่นใจว่าแถบจับจะไม่ทะลุขอบบนแน่นอน
        y: Math.max(20, window.innerHeight - safeHeight - 20) 
      }));
    }
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const fetchCurrentState = async () => {
      const { data } = await supabase
        .from('event_screen_routing')
        .select('*')
        .eq('event_id', eventId)
        .eq('screen_target', 'live_stage')
        .single();

      if (data) {
        setActiveSource(data.active_source);
        if (data.meta_data && data.meta_data.show_pip !== undefined) {
          setShowKaraokePanel(data.meta_data.show_pip);
        }
      }
    };

    fetchCurrentState();

    const channel = supabase.channel(`main-screen-${eventId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_screen_routing', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.screen_target === 'live_stage') {
            setActiveSource(row.active_source);
            if (row.meta_data && row.meta_data.show_pip !== undefined) {
              setShowKaraokePanel(row.meta_data.show_pip);
            }
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const handleInteraction = () => setHasInteracted(true);

  // 1. รับค่า parameter จาก URL
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  // 2. ดักจับการปิดเสียง (Mute) เฉพาะกรณีที่ไม่ใช่โหมด 'karaoke_lyrics' (โหมด 6)
  // เพราะโหมด 6 เราต้องการให้ Player หลักมีเสียง!
  if (isPreview && activeSource !== 'karaoke_lyrics' && audioRef.current) {
    audioRef.current.volume = 0;
    audioRef.current.muted = true;
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative cursor-none" onClick={handleInteraction}>

      {!hasInteracted && activeSource !== 'blackout' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white cursor-pointer backdrop-blur-md">
          <img src="/niivaasmartevent_logo.png" alt="Logo" className="h-28 mb-8 animate-pulse" />
          <h2 className="text-4xl font-black mb-3 text-emerald-400">ระบบจอรับสัญญาณพร้อมทำงาน</h2>
          <p className="text-gray-400 text-xl font-medium">คลิกที่หน้าจอ 1 ครั้ง เพื่อปลดล็อกระบบเสียงดนตรี (Autoplay)</p>
        </div>
      )}

      {/* 1. VIP Prompter & 2. Stage Media */}
      {(activeSource === 'vip_prompter' || activeSource === 'media') && (
        <iframe src={`/eventdashboard/live/${eventId}`} className="w-full h-full border-none pointer-events-none" allow="autoplay" />
      )}

      {/* 3. Multimedia & Games */}
      {activeSource === 'games' && (
        <iframe src={`/eventdashboard/showtime/display?event_id=${eventId}`} className="w-full h-full border-none pointer-events-auto" allow="autoplay" />
      )}

      {/* 4. Lyrics (เดี่ยว) */}
      {activeSource === 'lyrics' && (
        <iframe src={`/lyrics`} className="w-full h-full border-none pointer-events-none" allow="autoplay" />
      )}

      {/* 5. Karaoke (เดี่ยว) */}
      {activeSource === 'karaoke' && (
        <iframe src={`/playlist/974d9c5d-fbd5-473e-bac7-8e2d7cfc1d63?type=music`} className="w-full h-full border-none pointer-events-auto" allow="autoplay" />
      )}

      {/* 🌟 6. โหมดคอมโบ (Lyrics พื้นหลัง + Karaoke ลอยตัวแบบย้ายได้/ย่อได้) */}
      {activeSource === 'karaoke_lyrics' && (
        <div className="w-full h-full relative bg-black">
          
          {/* พื้นหลัง: หน้าเนื้อเพลง (ไม่ให้จับเมาส์) */}
          <iframe src={`/lyrics`} className="absolute inset-0 w-full h-full border-none z-10 pointer-events-none" allow="autoplay" />

          {/* 🌟 หน้าต่างลอยตัว (ใช้ CSS ซ่อนเพื่อให้ Iframe ทำงานต่อ เพลงไม่ดับ) */}
          <div className={`absolute inset-0 z-30 transition-opacity duration-500 ${showKaraokePanel ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <Rnd
              size={{ width: rndState.width, height: rndState.height }}
              position={{ x: rndState.x, y: rndState.y }}
              onDragStop={(e, d) => setRndState(prev => ({ ...prev, x: d.x, y: d.y }))}
              onResizeStop={(e, direction, ref, delta, position) => {
                setRndState({
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                  ...position,
                });
              }}
              dragHandleClassName="drag-header"
              minWidth={300}
              minHeight={400}
              bounds="parent" // ห้ามลากออกนอกจอ
              className="bg-gray-900 border border-gray-700 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* บังคับความสูงเต็มกล่อง */}
              <div className="w-full h-full flex flex-col">
                
                {/* แถบจับสำหรับลาก (Drag Handle) */}
                <div className="drag-header bg-gray-800 px-4 h-[50px] flex justify-between items-center border-b border-gray-700 cursor-move shrink-0">
                  <span className="text-white text-sm font-bold flex items-center gap-2 pointer-events-none">
                    <Music className="w-4 h-4 text-emerald-400" /> ควบคุมเพลง
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowKaraokePanel(false); }} 
                    className="text-gray-400 hover:text-white hover:bg-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                    title="พับหน้าจอ (เพลงยังคงเล่นต่อ)"
                  >
                    <X className="w-4 h-4 pointer-events-none" />
                  </button>
                </div>

                {/* กรอบ Iframe (คิวเพลง) บังคับความสูง 100% ลบขอบจับ */}
                <div className="w-full h-[calc(100%-50px)] bg-black relative">
                  <iframe 
                    src={`/playlist/974d9c5d-fbd5-473e-bac7-8e2d7cfc1d63?type=music&standalone=true&compact=true`} 
                    className="absolute inset-0 w-full h-full border-none" 
                    allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
                  />
                </div>

              </div>
            </Rnd>
          </div>

          {/* 🌟 ปุ่มลอยไว้กดเปิด (กรณีถูกย่อ/ปิดไปแล้ว) */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowKaraokePanel(true); }}
            className={`absolute bottom-8 right-8 z-40 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3.5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center gap-2 font-bold transition-all duration-500 cursor-pointer pointer-events-auto ${showKaraokePanel ? 'scale-0 opacity-0' : 'scale-100 opacity-100 hover:scale-110'}`}
          >
            <Music className="w-5 h-5 animate-pulse" /> เรียกคืนแผงจัดการเพลง
          </button>
          
        </div>
      )}

      {activeSource === 'blackout' && (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-32 opacity-10" />
        </div>
      )}
    </div>
  );
}