"use client";

import React, { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function NiivaaSmartDisplayFinal({ params }: { params: Promise<{ slug: string }> }) {
    // 1. แกะค่า slug จาก Promise (Next.js 15)
    const { slug } = use(params);

    // --- [STATES] ---
    const [screenSettings, setScreenSettings] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [localIsPaused, setLocalIsPaused] = useState(false);

    // --- [DATA FETCHING & REAL-TIME] ---
    useEffect(() => {
        fetchInitialData();

        // Subscribe การเปลี่ยนค่าใน Database (เพื่อให้ทุกหน้าจอซิงค์กัน)
        const screenSub = supabase
            .channel(`screen-${slug}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'social_screens',
                filter: `slug=eq.${slug}`
            }, (payload) => {
                setScreenSettings(payload.new);
            })
            .subscribe();

        // Subscribe เมื่อมีข้อความใหม่ถูกอนุมัติ
        const msgSub = supabase
            .channel(`msg-${slug}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'social_messages'
            }, () => fetchMessages());

        return () => {
            supabase.removeChannel(screenSub);
            supabase.removeChannel(msgSub);
        };
    }, [slug]);

    const fetchInitialData = async () => {
        setLoading(true);
        const { data: screen } = await supabase
            .from('social_screens')
            .select('*')
            .eq('slug', slug)
            .single();

        if (screen) {
            setScreenSettings(screen);
            await fetchMessages(screen.id);
        }
        setLoading(false);
    };

   const fetchMessages = async (screenId: string) => {
    const { data, error } = await supabase
      .from('social_messages')
      .select('*')
      .eq('screen_id', screenId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // --- เพิ่มบรรทัดตรวจสอบตรงนี้ครับ ---
    console.log("=== DISPLAY APPROVED DATA ===", data);
    if (error) console.error("Display DB Error:", error.message);
    // ---------------------------------
    
    if (data) setMessages(data);
  };

    // --- [UI CONTROL HANDLER] ---
    const updateSettings = async (updates: any) => {
        // 1. Optimistic Update: เปลี่ยนที่หน้าจอทันทีเพื่อให้ปุ่มตอบสนองไว
        setScreenSettings((prev: any) => ({ ...prev, ...updates }));

        // 2. บันทึกลง Supabase
        const { error } = await supabase
            .from('social_screens')
            .update(updates)
            .eq('slug', slug);

        if (error) {
            console.error("Update Error:", error.message);
            fetchInitialData(); // ถ้าพลาดให้ดึงค่าจริงมาทับ
        }
    };

    if (loading) return <div className="bg-black h-screen w-full flex items-center justify-center text-[#00688F]">LOADING NIIVAA...</div>;
    if (!screenSettings) return <div className="bg-black h-screen w-full flex items-center justify-center text-white">Screen not found.</div>;

    // ดึงค่าการตั้งค่ามาใช้งาน
    const { direction, speed, blackout_mode, approve_enabled } = screenSettings;
    const isHorizontal = direction === "horizontal";
    const baseSpeed = (210 - speed);
    const adjustedDuration = isHorizontal ? baseSpeed : baseSpeed * 0.6;

    return (
        <main className="relative w-full h-screen bg-[#020617] overflow-hidden font-sans text-slate-100">

            {/* --- [1. BLACKOUT LAYER] --- 
          อยู่ชั้น z-[200] บังข้อความทั้งหมดแต่ไม่บังแผงควบคุม */}
            <AnimatePresence>
                {blackout_mode && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center"
                    >
                        <div className="w-1 h-1 bg-[#00688F]/40 rounded-full animate-ping" />
                        <p className="text-[10px] text-slate-800 mt-4 tracking-widest uppercase">Ceremony in progress</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- [2. TOP RIGHT BRANDING & CONTROL] --- 
          อยู่ชั้น z-[250] สูงที่สุด เพื่อให้กดคืนค่าจาก Blackout ได้ */}
            <div className="absolute top-6 right-8 z-[250] flex flex-col items-end gap-3">
                <div className="flex flex-col items-end pointer-events-none">
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter">
                        <span className="text-[#00688F] drop-shadow-[0_0_10px_rgba(0,104,143,0.7)]">NIIVAA</span>
                        <span className="text-white ml-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">SMART DISPLAY</span>
                    </h1>
                    <div className="h-1 w-32 bg-gradient-to-l from-[#00688F] to-transparent mt-1 opacity-60" />
                </div>

                <button
                    onClick={() => setShowControls(!showControls)}
                    className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest shadow-xl transition-all"
                >
                    {showControls ? "✕ CLOSE PANEL" : "⚙️ OPEN SETTINGS"}
                </button>

                {/* --- [FOLDABLE CONTROL PANEL] --- */}
                <AnimatePresence>
                    {showControls && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            className="mt-2 w-72 p-5 rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4"
                        >
                            {/* Blackout Toggle */}
                            <div className="flex items-center justify-between group">
                                <span className={`text-xs font-bold transition-colors ${blackout_mode ? 'text-rose-500' : 'text-slate-400'}`}>BLACKOUT MODE</span>
                                <button
                                    onClick={() => updateSettings({ blackout_mode: !blackout_mode })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${blackout_mode ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${blackout_mode ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Approve System */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-300">Approve System</span>
                                <button
                                    onClick={() => updateSettings({ approve_enabled: !approve_enabled })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${approve_enabled ? 'bg-[#00688F]' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${approve_enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>

                            {/* Direction Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updateSettings({ direction: 'horizontal' })}
                                    className={`py-2 text-[9px] font-bold rounded-lg border transition-all ${isHorizontal ? 'bg-[#00688F] border-[#00688F] shadow-lg shadow-[#00688F]/20' : 'bg-slate-800 border-white/5 opacity-50'}`}
                                >
                                    HORIZONTAL
                                </button>
                                <button
                                    onClick={() => updateSettings({ direction: 'vertical' })}
                                    className={`py-2 text-[9px] font-bold rounded-lg border transition-all ${!isHorizontal ? 'bg-[#00688F] border-[#00688F] shadow-lg shadow-[#00688F]/20' : 'bg-slate-800 border-white/5 opacity-50'}`}
                                >
                                    VERTICAL
                                </button>
                            </div>

                            {/* Speed Slider */}
                            <div className="space-y-1 py-2">
                                <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                    <span>SPEED CONTROL</span>
                                    {/* เปลี่ยนจาก {speed}s เป็นการคำนวณระดับ 1-100 หรือโชว์ Speed Level */}
                                    <span className="text-[#00688F] font-black">
                                        {Math.round((speed / 200) * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range" min="10" max="200" step="10"
                                    value={speed || 80}
                                    onChange={(e) => updateSettings({ speed: Number(e.target.value) })}
                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00688F]"
                                />
                                <div className="flex justify-between text-[7px] text-slate-500 uppercase"><span>Fast</span><span>Slow</span></div>
                            </div>

                            {/* Local Play/Pause */}
                            <button
                                onClick={() => setLocalIsPaused(!localIsPaused)}
                                className={`w-full py-3 rounded-xl font-bold text-xs transition-all shadow-lg ${localIsPaused ? 'bg-blue-600' : 'bg-rose-600 shadow-rose-900/20'}`}
                            >
                                {localIsPaused ? "▶ RESUME DISPLAY" : "⏸ PAUSE DISPLAY"}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* --- [3. DISPLAY ENGINE] --- */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* เพิ่ม key ที่รวมทั้ง direction, slug และ speed เพื่อให้ Reset Animation ทุกครั้งที่ตั้งค่าเปลี่ยน */}
                <div
                    key={`${direction}-${slug}-${speed}`}
                    className={`flex w-full h-full overflow-hidden ${isHorizontal ? "flex-row items-center" : "flex-col items-center"}`}
                >
                    <motion.div
                        // หากอยู่ในโหมด Blackout หรือ Pause ให้หยุดแอนิเมชัน
                        animate={(localIsPaused || blackout_mode) ? {} : (isHorizontal ? { x: ["0%", "-100%"] } : { y: ["0%", "-100%"] })}
                        transition={{
                            duration: adjustedDuration,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className={`flex flex-shrink-0 ${isHorizontal ? "flex-row min-w-full" : "flex-col min-h-full w-full"}`}
                    >
                        {messages.length > 0 ? (
                            [...messages, ...messages].map((msg, i) => (
                                <div
                                    key={`${msg.id}-${i}`}
                                    className={`flex flex-col items-center justify-center bg-white/[0.02] backdrop-blur-sm border border-white/5 rounded-[3rem] shadow-2xl
            ${isHorizontal ? "mx-12 px-20 py-14 min-w-[600px]" : "my-10 px-14 py-16 w-[85%] mx-auto"}`}
                                >
                                    <p className="text-6xl md:text-[9rem] font-black text-white text-center leading-[1.1] tracking-tighter drop-shadow-2xl">
                                        {msg.text}
                                    </p>
                                    <div className="mt-8 flex items-center gap-6 opacity-90">
                                        <div className="h-[1px] w-12 bg-[#00688F]" />
                                        <span className="text-3xl md:text-5xl text-[#00688F] font-light tracking-wide">{msg.author}</span>
                                        <div className="h-[1px] w-12 bg-[#00688F]" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full text-center opacity-10 text-4xl italic font-light">
                                Waiting for Niivaa Messages...
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Background Decor */}
            <div className="absolute inset-0 z-[-1] opacity-30">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_30%,_rgba(0,104,143,0.1)_0%,_transparent_50%)]" />
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_70%,_rgba(0,104,143,0.1)_0%,_transparent_50%)]" />
            </div>
        </main>
    );
}