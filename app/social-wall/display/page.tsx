"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { RefreshCw, PlusCircle, Settings, X } from "lucide-react";

export default function NiivaaSmartDisplay({ params }: { params: any }) {
  const { slug } = React.use(params) as any;

  // --- [STATES] ---
  const [screenSettings, setScreenSettings] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [localIsPaused, setLocalIsPaused] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // ตรวจสิทธิ์แอดมินจาก URL (?admin=true)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAdmin(window.location.search.includes("admin=true"));
    }
  }, []);

  // โหลดคิวข้อมูลเวอร์ชันจริงจาก DB 
  useEffect(() => {
    if (!slug) return;
    const loadSystem = async () => {
      try {
        setLoading(true);
        const { data: screen } = await supabase.from('social_screens').select('*').eq('slug', slug).maybeSingle();
        if (screen) {
          setScreenSettings(screen);
          
          const { data: msgs } = await supabase
            .from('social_messages')
            .select('*')
            .eq('screen_id', screen.id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(15);
          if (msgs) setMessages(msgs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSystem();
  }, [slug]);

  // 🚀 [ฟังก์ชันทลายแคช] สลายถังขยะความจำบราวเซอร์ แล้วหมุนเปลี่ยนพารามิเตอร์เวลา
  const handleForceManualRefresh = () => {
    console.log("🔥 ปุ่ม UPDATE DATA ถูกกด! กำลังล้างสมองบราวเซอร์...");
    if (window.caches) {
      caches.keys().then((names) => {
        for (let name of names) caches.delete(name);
      }).then(() => {
        window.location.href = window.location.pathname + `?t=${Date.now()}${isAdmin ? '&admin=true' : ''}`;
      });
    } else {
      window.location.href = window.location.pathname + `?t=${Date.now()}${isAdmin ? '&admin=true' : ''}`;
    }
  };

  const direction = screenSettings?.direction || "horizontal";
  const speed = screenSettings?.speed || 80;
  const blackout_mode = screenSettings?.blackout_mode || false;
  const isHorizontal = direction === "horizontal";
  const cssSpeedDuration = `${Math.max(8, (220 - speed) / 6)}s`;

  return (
    <main className="relative w-full h-screen bg-[#000a12] overflow-hidden font-prompt text-slate-100 select-none">
      
      {/* BLACKOUT LAYER */}
      {blackout_mode && (
        <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center">
          <p className="text-xl text-slate-700 tracking-widest uppercase font-bold">Ceremony in progress</p>
        </div>
      )}

      {/* ⚡ [กล่องควบคุมหลักมุมขวาบน] วางรวมกันในระนาบกล่องเดียวกัน 100% พี่เห็นปุ่มชัวร์ครับ! */}
      <div className="absolute top-6 right-8 z-[250] w-[360px] flex flex-col gap-3 bg-black/80 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
        
        {/* แถวบนสุด: โลโก้ระบบหลัก */}
        <div className="flex flex-col items-end pointer-events-none w-full">
          <h1 className="text-xl font-black italic tracking-tighter text-white">
            NIIVAA <span className="text-green-400">DISPLAY</span>
          </h1>
          <div className="h-[2px] w-16 bg-gradient-to-l from-green-500 to-transparent mt-0.5 opacity-50" />
          <div className="text-[9px] font-black text-orange-400 mt-1 tracking-widest uppercase">
            MODE: AUTO APPROVED (LIVE)
          </div>
        </div>

        {/* 🛠 [ระนาบปุ่มคู่ขนานควบคุมงาน] วางเคียงข้างขนาบคู่กับปุ่ม CONFIG เดิมเลยครับผม */}
        <div className="flex items-center gap-2 w-full mt-1">
          
          {/* 🚀 ปุ่ม UPDATE DATA เรืองแสงสีฟ้านีออน ตัวหนาเต็มพิกัด วางอยู่ด้านซ้ายมือของปุ่มตั้งค่าเดิมเป๊ะๆ ครับ */}
          <button 
            onClick={handleForceManualRefresh}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs py-3.5 rounded-xl shadow-lg shadow-cyan-500/10 active:scale-95 transition-all tracking-wide uppercase cursor-pointer"
          >
            <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '5s' }} />
            <span>⚡ UPDATE DATA</span>
          </button>

          {/* ปุ่ม CONFIG เดิมของพี่ที่ใช้งานได้ปกติ วางสแตนด์บายฝั่งขวามือ */}
          <button 
            onClick={() => setShowControls(!showControls)} 
            className="bg-slate-800 hover:bg-slate-700 border border-white/10 px-3 py-3.5 rounded-xl text-[10px] font-black tracking-widest transition-all text-white flex items-center gap-1 cursor-pointer shrink-0"
          >
            {showControls ? <X size={12} /> : <Settings size={12} />}
            <span>{showControls ? "CLOSE" : "CONFIG"}</span>
          </button>

        </div>

        {/* ปุ่มลิงก์กระโดดกลับไปหน้าส่งข้อความ Join ด้านล่างกล่อง */}
        <button 
          onClick={() => window.location.href = `/social-wall/join/${slug}`}
          className="w-full flex items-center justify-center gap-2 bg-slate-900/90 border border-white/5 text-slate-400 font-bold text-xs py-2 rounded-xl hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
        >
          <PlusCircle size={12} className="text-green-400" />
          <span>พิมพ์ข้อความ (Join)</span>
        </button>
      </div>

      {/* --- 💿 ENGINE: DYNAMIC PURE CSS MARQUEE LOOP --- */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden z-10">
        {loading ? (
          <div className="text-green-400 font-bold tracking-widest text-xs animate-pulse">LOADING NIIVAA SYSTEM...</div>
        ) : (
          <div className="w-full flex items-center overflow-hidden relative py-12">
            {!localIsPaused && !blackout_mode ? (
              <div 
                className={`flex gap-16 whitespace-nowrap will-change-transform ${isHorizontal ? 'animate-css-marquee-horiz' : 'flex-col animate-css-marquee-vert h-full'}`}
                style={{ '--marquee-duration': cssSpeedDuration } as React.CSSProperties}
              >
                {messages.length > 0 ? (
                  messages.map((msg, i) => (
                    <div key={`msg-a-${msg.id}-${i}`} className="inline-flex flex-col items-center justify-center bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-[3rem] mx-6 px-16 py-12 min-w-[550px]">
                      <p className="text-5xl md:text-8xl font-black text-white text-center leading-tight tracking-tighter">{msg.text}</p>
                      <div className="mt-6 flex items-center gap-4 opacity-70">
                         <div className="h-[1px] w-8 bg-green-500" />
                         <span className="text-2xl md:text-4xl text-green-400 font-light">{msg.author}</span>
                         <div className="h-[1px] w-8 bg-green-500" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center opacity-10 text-3xl italic">ยังไม่มีข้อความส่งเข้ามาในระบบ...</div>
                )}

                {/* ลูปคู่ขนานต่อสายพานเนียนตา */}
                {messages.length > 0 && messages.map((msg, i) => (
                  <div key={`msg-b-${msg.id}-${i}`} className="inline-flex flex-col items-center justify-center bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-[3rem] mx-6 px-16 py-12 min-w-[550px]">
                    <p className="text-5xl md:text-8xl font-black text-white text-center leading-tight tracking-tighter">{msg.text}</p>
                    <div className="mt-6 flex items-center gap-4 opacity-70">
                       <div className="h-[1px] w-8 bg-green-500" />
                       <span className="text-2xl md:text-4xl text-green-400 font-light">{msg.author}</span>
                       <div className="h-[1px] w-8 bg-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full text-center opacity-20 text-2xl font-bold">⏸ DISPLAY PAUSED</div>
            )}
          </div>
        )}
      </div>

      {/* ADMIN PANEL DROPDOWN */}
      {showControls && screenSettings && (
        <div className="fixed inset-0 z-[240]" onClick={() => setShowControls(false)}>
          <div className="absolute top-[195px] right-8 w-[350px] p-4 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between text-xs">
              <span className={blackout_mode ? 'text-rose-500 font-bold' : 'text-slate-400'}>BLACKOUT MODE</span>
              <button onClick={() => updateSettings({ blackout_mode: !blackout_mode })} className={`relative w-8 h-4 rounded-full ${blackout_mode ? 'bg-rose-500' : 'bg-slate-700'}`}><div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${blackout_mode ? 'left-4.5' : 'left-0.5'}`} /></button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
              <button onClick={() => updateSettings({ direction: "horizontal" })} className={`py-1.5 rounded border ${isHorizontal ? 'bg-green-600 border-green-400' : 'bg-slate-800 opacity-50'}`}>HORIZONTAL</button>
              <button onClick={() => updateSettings({ direction: "vertical" })} className={`py-1.5 rounded border ${!isHorizontal ? 'bg-green-600 border-green-400' : 'bg-slate-800 opacity-50'}`}>VERTICAL</button>
            </div>
            <button onClick={() => setLocalIsPaused(!localIsPaused)} className={`w-full py-2 rounded-lg font-bold text-[10px] ${localIsPaused ? 'bg-blue-600' : 'bg-rose-600'}`}>{localIsPaused ? "▶ RUN" : "⏸ PAUSE"}</button>
          </div>
        </div>
      )}

      {/* ⚡ ใช้ป้ายสไตล์มาตรฐานดิบ การันตีผ่านคอมไพเลอร์ Next.js แน่นอน */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cssMarqueeHorizontal { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }
        @keyframes cssMarqueeVertical { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(0, -50%, 0); } }
        .animate-css-marquee-horiz { animation: cssMarqueeHorizontal var(--marquee-duration, 20s) linear infinite; }
        .animate-css-marquee-vert { animation: cssMarqueeVertical var(--marquee-duration, 20s) linear infinite; }
      `}} />

    </main>
  );
}