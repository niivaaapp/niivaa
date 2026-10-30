"use client";
import RouteGuard from '@/components/RouteGuard';
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutGrid, MonitorUp, Video, Gamepad2, Mic2, ArrowRightLeft, Settings, ExternalLink, Activity, Music, MicVocal, Layers, EyeOff, Eye, MessageSquareText, HelpCircle, BookOpen, X, MonitorPlay } from 'lucide-react';

function MasterControlContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const supabase = createClient();

  const [liveStageSource, setLiveStageSource] = useState('blackout');
  const [isLoading, setIsLoading] = useState(true);

  const [showPipPanel, setShowPipPanel] = useState(true);

  // 🌟 State ควบคุมแถบ Slide-over Drawer คู่มือ
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchRoutingState = async () => {
      const { data } = await supabase.from('event_screen_routing').select('*').eq('event_id', eventId);
      if (data && data.length > 0) {
        const live = data.find(d => d.screen_target === 'live_stage');
        if (live) {
          setLiveStageSource(live.active_source);
          if (live.meta_data && live.meta_data.show_pip !== undefined) {
            setShowPipPanel(live.meta_data.show_pip);
          }
        }
      }
      setIsLoading(false);
    };

    fetchRoutingState();

    const channel = supabase.channel(`routing-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_screen_routing', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.screen_target === 'live_stage') {
            setLiveStageSource(row.active_source);
            if (row.meta_data && row.meta_data.show_pip !== undefined) {
              setShowPipPanel(row.meta_data.show_pip);
            }
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const handleSwitchSource = async (targetScreen: string, sourceName: string) => {
    if (targetScreen === 'live_stage') setLiveStageSource(sourceName);

    const metaData = sourceName === 'karaoke_lyrics' ? { show_pip: true } : {};
    if (sourceName === 'karaoke_lyrics') setShowPipPanel(true);

    await supabase.from('event_screen_routing').upsert({
      event_id: eventId,
      screen_target: targetScreen,
      active_source: sourceName,
      meta_data: metaData
    }, { onConflict: 'event_id, screen_target' });
  };

  const handleTogglePip = async () => {
    const newState = !showPipPanel;
    setShowPipPanel(newState);

    await supabase.from('event_screen_routing').update({
      meta_data: { show_pip: newState }
    }).eq('event_id', eventId).eq('screen_target', 'live_stage');
  };

  if (!eventId) return <div className="p-10 text-center text-red-400">กรุณาระบุ event_id ใน URL</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans flex flex-col">

      {/* 🌟 Slide-over Drawer (คู่มือการใช้งาน) */}
      <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <h2 className="text-2xl font-black text-emerald-400 flex items-center gap-2"><BookOpen size={24} /> คู่มือ Master Control</h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-300 custom-scrollbar">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><MonitorPlay size={18} className="text-emerald-400" /> 1. จอจำลอง Preview Monitor</h3>
              <p>กรอบจอภาพด้านซ้ายมือคือ <b>จอจำลองเรียลไทม์</b> ที่ดึงภาพสดจาก Main Screen มาแสดงผล ช่วยให้คนคุมคิว (Switcher) มั่นใจได้ว่าภาพที่ถูกส่งออกไปบนโปรเจคเตอร์ใหญ่มีความถูกต้อง 100%</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><ArrowRightLeft size={18} className="text-cyan-400" /> 2. การสลับสัญญาณ (Video Switcher)</h3>
              <p className="mb-2">คุณสามารถกดปุ่มในแผงควบคุมขวามือ เพื่อเปลี่ยนภาพบนจอหลักได้ทันที โดยมีโหมดสำคัญดังนี้:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><b className="text-emerald-400">Multimedia & Games:</b> สลับหน้าจอหลักเพื่อแสดงผลระบบเกม สุ่มผู้โชคดี หรือกิจกรรมจับรางวัล (Lucky Draw) สำหรับสร้างสีสันและแจกของรางวัลให้แขกในงาน</li>
                <li><b>Stage Media Control:</b> ส่งภาพสไลด์โชว์หรือภาพกิจกรรม (จากหน้า MC) ขึ้นจอ</li>
                <li><b className="text-amber-300">Marquee (ข้อความวิ่ง):</b> ส่งหน้าจอข้อความอวยพรวิ่งที่ปรับแต่งสีสันไว้ขึ้นจอ</li>
                <li><b className="text-emerald-400">VIP Profile & Script:</b> แสดงภาพแขกสำคัญ VIP ขณะพิธีกรประกาศแนะนำตัว หรือตั้งค่าให้ฉายเป็น Slide Show ภาพแขก VIP บนเวทีได้</li>
                <li><b className="text-emerald-400">Karaoke (ร้องเดี่ยว):</b> เข้าสู่ระบบ NiiVaa SmartMedia & SmartKaraoke ระบบจัดคิวสื่อและร้องเพลงคาราโอเกะจาก YouTube อัจฉริยะ</li>
                <li><b>Lyrics / Karaoke:</b> ส่งเนื้อเพลงหรือระบบร้องเพลงขึ้นจอ</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Layers size={18} className="text-indigo-400" /> 3. โหมดจอซ้อน (Combo PiP)</h3>
              <p>เมื่อกดเลือกโหมด <b>Lyrics + Karaoke</b> ระบบจะนำจอเนื้อเพลงและจอร้องคาราโอเกะมาแสดงผลซ้อนกัน คุณสามารถกดปุ่ม <b className="text-indigo-300">"ซ่อน/แสดงแผงคิวเพลง"</b> เพื่อเคลียร์หน้าจอโปรเจคเตอร์ให้เห็นแค่เนื้อเพลงล้วนๆ ได้ตามสถานการณ์หน้างาน</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><EyeOff size={18} className="text-rose-400" /> 4. ตัดภาพเป็นจอดำ (Blackout)</h3>
              <p>ปุ่มแดงด้านล่างสุด ใช้สำหรับ <b>ตัดภาพฉุกเฉิน</b> หรือพักหน้าจอก่อนเริ่มพิธีการ เมื่อกดปุ่มนี้ จอโปรเจคเตอร์หลักจะมืดลงทันที ป้องกันภาพไม่พึงประสงค์หลุดขึ้นจอครับ</p>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 Header */}
      <header className="bg-gray-900 border-b border-indigo-900/50 shrink-0 z-50 shadow-md">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center select-none bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa Logo" className="h-7 w-auto object-contain drop-shadow-md" />
            </div>
            <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>
            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-400" /> Master Router Hub
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 🌟 ปุ่มเปิดคู่มือ */}
            <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg">
              <HelpCircle className="w-4 h-4" /> <span className="hidden sm:inline">คู่มือ</span>
            </button>

            <Link href={`/events/event-dashboard/${eventId}`} className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0">
              <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold hidden md:inline">กลับหน้าศูนย์กลาง</span>
            </Link>
            <Link href={`/eventdashboard/settings?event_id=${eventId}`} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm font-medium transition-colors">
              <Settings className="w-4 h-4 text-gray-400" /> <span className="hidden md:inline">ตั้งค่าระบบ</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] w-full mx-auto px-6 py-8 flex-1 flex flex-col xl:flex-row gap-8">

        {/* ========================================== */}
        {/* 📺 โซนซ้าย: จอจำลอง Preview Monitor (iframe) */}
        {/* ========================================== */}
        <div className="w-full xl:w-[45%] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <MonitorPlay className="w-6 h-6 text-emerald-400" /> Preview Monitor
              </h2>
              <p className="text-gray-400 text-sm">จำลองภาพเรียลไทม์จากจอเวทีหลัก (Main Screen)</p>
            </div>
            <a href={`/eventdashboard/main-screen/${eventId}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-emerald-950 rounded-lg hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 transition-colors text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <ExternalLink className="w-4 h-4" /> <span>เปิดจอจริง (Full)</span>
            </a>
          </div>

          {/* กรอบจอจำลอง สัดส่วน 16:9 */}
          <div className="w-full aspect-video bg-black rounded-2xl border-4 border-gray-800 overflow-hidden shadow-2xl relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500"><Activity className="w-8 h-8 animate-pulse" /></div>
            ) : (
              <div className="w-full h-full relative">
                {/* ป้ายเตือนโหมด Blackout */}
                {liveStageSource === 'blackout' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                    <EyeOff className="w-12 h-12 text-red-500 mb-2 opacity-50" />
                    <span className="text-red-500 font-bold tracking-widest opacity-50 uppercase">BLACKOUT MODE</span>
                  </div>
                )}

                {/* 🌟 ดึงจอจำลอง (เขียนเงื่อนไขว่าถ้าเป็น marquee ให้วิ่งไปดึงไฟล์ marquee มาโชว์โดยตรง) */}
                <iframe
                  src={liveStageSource === 'marquee' ? `/eventdashboard/showtime/marquee?event_id=${eventId}` : `/eventdashboard/main-screen/${eventId}?preview=true`}
                  className="w-full h-full border-0"
                  title="Main Screen Preview"
                  allow="autoplay; fullscreen"
                />
              </div>
            )}
          </div>
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex items-center justify-between text-sm">
            <span className="text-gray-400 font-bold">สถานะสัญญาณส่งออก:</span>
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md font-mono border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              {liveStageSource.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ========================================== */}
        {/* 🎛️ โซนขวา: แผงควบคุม Video Switcher */}
        {/* ========================================== */}
        <div className="w-full xl:w-[55%] flex flex-col">
          <div className="mb-4 text-left">
            <h2 className="text-2xl font-black text-white mb-1">ระบบสลับสัญญาณ (Video Switcher)</h2>
            <p className="text-gray-400 text-sm">กดปุ่มเพื่อส่งภาพจากห้องต่างๆ ขึ้นโปรเจคเตอร์หลักทันที</p>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-20 text-indigo-400"><Activity className="w-8 h-8 animate-pulse mr-3" /> กำลังโหลดสถานะ...</div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg flex-1">

              {/* 🌟 กริดเพิ่มเป็น 7 โหมด (รวม Marquee) */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                <button onClick={() => handleSwitchSource('live_stage', 'vip_prompter')} className={`p-4 md:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${liveStageSource === 'vip_prompter' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                  <Mic2 className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold text-xs md:text-sm text-center">VIP Profile<br />& Script</span>
                </button>

                <button onClick={() => handleSwitchSource('live_stage', 'media')} className={`p-4 md:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${liveStageSource === 'media' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                  <Video className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold text-xs md:text-sm text-center">Stage Media<br />(สไลด์รูปภาพ)</span>
                </button>

                {/* 🌟 ปุ่ม Marquee (ข้อความวิ่ง) เพิ่มใหม่ */}
                <button onClick={() => handleSwitchSource('live_stage', 'marquee')} className={`p-4 md:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${liveStageSource === 'marquee' ? 'bg-amber-950/40 border-amber-500 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-amber-900/50 hover:text-amber-200'}`}>
                  <MessageSquareText className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold text-xs md:text-sm text-center">Marquee<br />(ข้อความวิ่ง)</span>
                </button>

                <button onClick={() => handleSwitchSource('live_stage', 'games')} className={`p-4 md:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${liveStageSource === 'games' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                  <Gamepad2 className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold text-xs md:text-sm text-center">Multimedia<br />& Games</span>
                </button>

                <button onClick={() => handleSwitchSource('live_stage', 'lyrics')} className={`p-4 md:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${liveStageSource === 'lyrics' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                  <Music className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold text-xs md:text-sm text-center">Lyrics<br />(เนื้อเพลงเดี่ยว)</span>
                </button>

                <button onClick={() => handleSwitchSource('live_stage', 'karaoke')} className={`p-4 md:p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 transition-all ${liveStageSource === 'karaoke' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'bg-black/50 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}>
                  <MicVocal className="w-6 h-6 md:w-8 md:h-8" /> <span className="font-bold text-xs md:text-sm text-center">Karaoke<br />(ร้องเดี่ยว)</span>
                </button>
              </div>

              {/* ปุ่มโหมดคอมโบ (แยกมาด้านล่างให้เด่นขึ้น) */}
              <div className="mt-4">
                <button onClick={() => handleSwitchSource('live_stage', 'karaoke_lyrics')} className={`w-full p-4 md:p-6 rounded-xl border-2 flex flex-row items-center justify-center gap-4 transition-all ${liveStageSource === 'karaoke_lyrics' ? 'bg-cyan-950/50 border-cyan-400 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.3)]' : 'bg-black/50 border-cyan-900/30 text-cyan-700 hover:border-cyan-700 hover:text-cyan-500'}`}>
                  <Layers className="w-8 h-8 shrink-0" />
                  <div className="flex flex-col items-start">
                    <span className="font-black text-lg">Lyrics + Karaoke (โหมดจอซ้อน PiP)</span>
                    <span className="text-xs opacity-70">แสดงเนื้อเพลงคู่กับแผงควบคุมคาราโอเกะบนจอเดียวกัน</span>
                  </div>
                </button>
              </div>

              {/* แผงควบคุมพิเศษ: จะแสดงเมื่อเลือกโหมด Combo เท่านั้น */}
              {liveStageSource === 'karaoke_lyrics' && (
                <div className="mt-4 p-4 bg-cyan-950/20 border border-cyan-900/50 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
                  <div className="text-sm text-cyan-400">
                    <span className="font-bold block">โหมดจอซ้อนทำงานอยู่</span>
                    <span className="text-cyan-600 text-[11px] md:text-xs">คุณสามารถกดซ่อนแผงคิวเพลงได้ เพื่อให้จอโปรเจคเตอร์เห็นเฉพาะเนื้อเพลงล้วนๆ</span>
                  </div>
                  <button
                    onClick={handleTogglePip}
                    className={`flex items-center shrink-0 gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all border ${showPipPanel ? 'bg-amber-600/20 text-amber-500 border-amber-500/50 hover:bg-amber-600/30' : 'bg-cyan-600/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-600/30'}`}
                  >
                    {showPipPanel ? <><EyeOff className="w-4 h-4" /> ซ่อนแผงคิวเพลง</> : <><Eye className="w-4 h-4" /> แสดงแผงคิวเพลง</>}
                  </button>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-gray-800 flex justify-center">
                <button onClick={() => handleSwitchSource('live_stage', 'blackout')} className={`w-full md:w-auto px-10 py-4 rounded-xl border-2 font-black transition-colors ${liveStageSource === 'blackout' ? 'bg-red-950 text-red-400 border-red-900 shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-gray-900 text-red-500 border-gray-800 hover:bg-gray-800 hover:border-red-900'}`}>
                  ■ ตัดภาพเป็นจอดำ (Blackout)
                </button>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function MasterControlPage() {
  return (
    // 🌟 หุ้มด้วย RouteGuard และให้สิทธิ์ admin, mc และ controller
    <Suspense fallback={<div className="h-screen bg-gray-950 flex items-center justify-center text-indigo-400"><Activity className="w-8 h-8 animate-pulse" /></div>}>
      <RouteGuard allowedRoles={['admin', 'mc', 'controller']}>
        <MasterControlContent />
      </RouteGuard>
    </Suspense>
  );
}