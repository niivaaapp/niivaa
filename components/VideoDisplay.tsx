'use client'

import React from 'react'
import { Maximize, Play, SkipForward } from 'lucide-react'

interface VideoDisplayProps {
  isAppStarted: boolean;
  isTransitioning: boolean;
  tracks: any[];
  currentVideoId: string | null;
  showNextQueue: boolean;
  isFullscreen: boolean;
  onStart: () => void;
  onToggleFullscreen: () => void;
}

export default function VideoDisplay({
  isAppStarted,
  isTransitioning,
  tracks,
  currentVideoId,
  showNextQueue,
  isFullscreen,
  onStart,
  onToggleFullscreen
}: VideoDisplayProps) {

  const currentIndex = tracks.findIndex(t => t.video_id === currentVideoId);
  const next2Tracks = tracks.slice(currentIndex + 1, currentIndex + 3);

  return (
    <div 
      className={`relative bg-black rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(51,51,255,0.2)] border-2 border-[#3333FF]/20 group transition-all duration-700
      ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'h-[480px] w-full'}`}
    >
      
      {/* 1. หน้าจอต้อนรับ */}
      {!isAppStarted && !isTransitioning && (
        <div className="absolute inset-0 z-[50] bg-black/90 flex flex-col items-center justify-center backdrop-blur-2xl">
          <div className="text-center p-8 border-2 border-[#006666]/30 rounded-[3rem] bg-[#001122]/50">
            <h2 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#CCFFFF] to-[#3333FF]">
              NiiVaa SmartKaraoke
            </h2>
            <button 
              onClick={onStart}
              className="px-10 py-4 bg-gradient-to-r from-[#006666] to-[#3333FF] rounded-2xl text-xl font-black flex items-center gap-3 mx-auto mt-6"
            >
              <Play className="fill-white" size={24} /> ระเบิดความมันส์เลย!
            </button>
          </div>
        </div>
      )}

      {/* 3. หน้าจอ Transition */}
      {isTransitioning && (
        <div className="absolute inset-0 z-[60] bg-[#000a12] flex items-center justify-center">
          <div className="text-center">
             <h1 className="text-6xl font-black text-[#CCFFFF] animate-pulse">NIIVAA</h1>
             <h2 className="text-2xl font-bold text-[#3333FF] tracking-widest uppercase">SmartKaraoke</h2>
          </div>
        </div>
      )}

      {/* 15. Popup คิวถัดไป */}
      {showNextQueue && isAppStarted && next2Tracks.length > 0 && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[40]">
          <div className="bg-[#001122]/95 px-8 py-5 rounded-[2rem] border-2 border-[#3333FF] shadow-lg min-w-[320px]">
            <p className="text-[#00ccff] text-[10px] uppercase font-black mb-2">เตรียมตัว... คิวถัดไป</p>
            {next2Tracks.map((t, idx) => (
              <div key={idx} className="text-lg font-bold text-white truncate">
                {idx + 1}. {t.master_songs?.title || 'Loading...'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ส่วนที่ Error: ผมเขียนใหม่ให้สั้นและชัดเจนขึ้นครับ --- */}
      <div id="main-player" className="w-full h-full bg-black"></div>

      {/* 24. ปุ่มขยายจอ */}
      <button 
        onClick={onToggleFullscreen} 
        className="absolute bottom-6 right-6 p-4 bg-black/40 hover:bg-[#3333FF] rounded-2xl border border-[#CCFFFF]/20 z-[70]"
      >
        <Maximize size={20} className="text-[#CCFFFF]" />
      </button>

    </div>
  )
}