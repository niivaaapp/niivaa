'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Rnd } from 'react-rnd';
import { 
  Music, X, LayoutDashboard, Mic2, FileEdit, ExternalLink, PlayCircle 
} from 'lucide-react';

function MyKaraokeContent() {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('playlist_id') || '974d9c5d-fbd5-473e-bac7-8e2d7cfc1d63';

  const [showKaraokePanel, setShowKaraokePanel] = useState(true);

  // 🌟 1. ปรับขนาดเริ่มต้นให้กว้างขึ้นนิดหน่อยเพื่อให้กดง่าย
  const [rndState, setRndState] = useState({
    width: 400,  
    height: 700, // ค่าชั่วคราวก่อนคำนวณความสูงจริง
    x: 1000,     
    y: 85        
  });

  useEffect(() => {
    // 🌟 2. คำนวณความสูง (Height) ให้ยืดสุดขอบล่างจออัตโนมัติ
    if (typeof window !== 'undefined') {
      // เอาความสูงของหน้าจอทั้งหมด ลบขอบบน 85px และเว้นขอบล่าง 30px
      const optimalHeight = window.innerHeight - 115; 
      
      setRndState(prev => ({
        ...prev,
        height: optimalHeight, 
        x: window.innerWidth - prev.width - 24, // ชิดขวา
        y: 85 
      }));
    }
  }, []);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative font-sans">
      
      {/* ========================================== */}
      {/* 🌟 Top Navigation Bar */}
      {/* ========================================== */}
      <div className="absolute top-0 left-0 w-full z-40 p-4 flex justify-between items-start pointer-events-none">
        
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 pointer-events-auto shadow-lg">
          <img src="/SMK.png" alt="NiiVaa SmartKaraoke" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
          <div>
            <h1 className="text-white font-black text-lg leading-none tracking-wide">
              NiiVaa <span className="text-cyan-400">SmartKaraoke</span>
            </h1>
            <span className="text-cyan-500/80 text-[10px] font-bold uppercase tracking-widest">
              Combo Mode
            </span>
          </div>
        </div>

        <div className="flex gap-3 pointer-events-auto">
          <Link 
            href="/smart-media-dashboard" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-sm font-bold shadow-lg"
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400" /> Dashboard
          </Link>
          
          <Link 
            href="/studio" 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all text-sm font-bold shadow-lg"
          >
            <FileEdit className="w-4 h-4 text-purple-400" /> Studio
          </Link>

          <Link 
            href={`/playlist/${playlistId}`} 
            className="flex items-center gap-2 px-4 py-2 bg-cyan-900/60 hover:bg-cyan-800 backdrop-blur-md border border-cyan-700 text-cyan-100 hover:text-white rounded-xl transition-all text-sm font-bold shadow-lg"
          >
            <ExternalLink className="w-4 h-4" /> เปิดจอ Playlist เต็ม
          </Link>
        </div>
      </div>

      {/* ========================================== */}
      {/* 🌟 จอเนื้อเพลง (Lyrics Background) */}
      {/* ========================================== */}
      <iframe 
    // 🌟 2. เติม &forceAudio=true ลงไป
    src={`/lyrics?playlist_id=${playlistId}?type=music&standalone=true&compact=true&forceAudio=true`} 
    className="absolute inset-0 w-full h-full border-none" 
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture" 
/>

      {/* ========================================== */}
      {/* 🌟 หน้าต่างลอย Playlist */}
      {/* ========================================== */}
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
          minWidth={320}
          minHeight={500}
          bounds="parent"
          className="bg-[#0a0a0a] border border-cyan-900/50 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* 🌟 สร้างกล่องครอบเนื้อหาด้านใน บังคับให้สูง 100% ของ Rnd เสมอ */}
          <div className="w-full h-full flex flex-col">
            
            {/* 1. แถบหัวจับ: บังคับความสูงคงที่เป๊ะๆ ที่ 50px (h-[50px]) */}
            <div className="drag-header bg-gradient-to-r from-slate-900 to-cyan-950 px-4 h-[50px] flex justify-between items-center border-b border-cyan-900/50 cursor-move shrink-0">
              <span className="text-white text-sm font-black flex items-center gap-2 pointer-events-none tracking-wide">
                <Mic2 className="w-4 h-4 text-cyan-400" /> เครื่องเล่นเพลง
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowKaraokePanel(false); }} 
                className="text-slate-400 hover:text-white hover:bg-rose-500/80 p-1.5 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-400"
                title="พับหน้าจอ"
              >
                <X className="w-4 h-4 pointer-events-none" />
              </button>
            </div>

            {/* 2. กรอบ Iframe: บังคับความสูงให้เท่ากับ พื้นที่ที่เหลือ (100% ลบ 50px) */}
            <div className="w-full h-[calc(100%-50px)] bg-zinc-950 relative">
              <iframe 
                src={`/playlist/${playlistId}?type=music&standalone=true&compact=true&forceAudio=true`}
                className="absolute inset-0 w-full h-full border-none" 
                allow="autoplay" 
              />
            </div>
            
          </div>
        </Rnd>
      </div>

      {/* ========================================== */}
      {/* 🌟 ปุ่มเรียกหน้าต่างลอยกลับมา */}
      {/* ========================================== */}
      <button
        onClick={() => setShowKaraokePanel(true)}
        className={`absolute bottom-10 right-10 z-40 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-4 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center gap-3 font-black transition-all duration-500 cursor-pointer pointer-events-auto border border-cyan-400/30
          ${showKaraokePanel ? 'scale-0 opacity-0 translate-y-10' : 'scale-100 opacity-100 hover:scale-105 hover:-translate-y-2'}`}
      >
        <PlayCircle className="w-6 h-6 animate-pulse text-cyan-200" /> 
        <span>เปิดเครื่องเล่นเพลง</span>
      </button>
      
    </div>
  );
}

export default function MyKaraokePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-black flex items-center justify-center text-cyan-400 font-bold">กำลังโหลด NiiVaa SmartKaraoke...</div>}>
      <MyKaraokeContent />
    </Suspense>
  );
}