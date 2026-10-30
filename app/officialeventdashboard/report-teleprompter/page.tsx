'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronRight, ChevronLeft, LayoutDashboard, FileEdit, UserCheck, Clock, Pause, HelpCircle, X, MousePointerClick, Type, List } from 'lucide-react';
import { ScriptChunk } from '@/lib/speechParser';

interface Attendee {
  id: string;
  fullname: string;
  position: string;
  organization: string;
  profile_image_url?: string;
}

const TAG_COLORS = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-400', text: 'text-emerald-300', activeBg: 'bg-emerald-500 text-black' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-400', text: 'text-cyan-300', activeBg: 'bg-cyan-500 text-black' },
  { bg: 'bg-purple-500/10', border: 'border-purple-400', text: 'text-purple-300', activeBg: 'bg-purple-500 text-black' },
  { bg: 'bg-amber-500/10', border: 'border-amber-400', text: 'text-amber-300', activeBg: 'bg-amber-500 text-black' },
  { bg: 'bg-rose-500/10', border: 'border-rose-400', text: 'text-rose-300', activeBg: 'bg-rose-500 text-black' },
  { bg: 'bg-blue-500/10', border: 'border-blue-400', text: 'text-blue-300', activeBg: 'bg-blue-500 text-black' },
];

function ReportTeleprompterContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || searchParams.get('eventId') || '';

  const [eventName, setEventName] = useState<string>('');
  const [president, setPresident] = useState<Attendee | null>(null);
  const [chunks, setChunks] = useState<ScriptChunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [speechFontSize, setSpeechFontSize] = useState<number>(40);
  const increaseFontSize = () => setSpeechFontSize((prev) => Math.min(prev + 4, 72));
  const decreaseFontSize = () => setSpeechFontSize((prev) => Math.max(prev - 4, 32));

  const [allTags, setAllTags] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // 🌟 State เปิด/ปิด Drawer คู่มือ
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: eventData } = await supabase.from('events').select('title').eq('id', eventId).maybeSingle();
        if (eventData) setEventName(eventData.title);

        const { data: attendeesData } = await supabase
          .from('event_attendees')
          .select(`id, fullname, position, organization, global_profiles ( profile_image_url )`)
          .eq('event_id', eventId)
          .order('priority_level', { ascending: true })
          .limit(1);

        if (attendeesData && attendeesData.length > 0) {
          setPresident({
            id: attendeesData[0].id,
            fullname: attendeesData[0].fullname,
            position: attendeesData[0].position,
            organization: attendeesData[0].organization,
            profile_image_url: (attendeesData[0] as any)?.global_profiles?.profile_image_url || null,
          });
        }

        const { data: scriptData, error: scriptError } = await supabase
          .from('event_scripts')
          .select('content_chunks')
          .eq('event_id', eventId)
          .eq('script_type', 'report')
          .maybeSingle();

        if (scriptError || !scriptData || !Array.isArray(scriptData.content_chunks) || scriptData.content_chunks.length === 0) {
          throw new Error('No script data');
        } else {
          setChunks(scriptData.content_chunks);
          setAllTags(Array.from(new Set(scriptData.content_chunks.map((c: any) => c.tag).filter(Boolean))));
        }
      } catch (err) {
        setChunks([
          { id: '1', type: 'president_greeting' as any, tag: 'เรียนประธาน', tagIndex: 0, text: '' },
          { id: '2', type: 'text', tag: 'วัตถุประสงค์', tagIndex: 1, text: 'การจัดงานในวันนี้ มีวัตถุประสงค์เพื่อส่งเสริมการเรียนรู้...' },
        ]);
        setAllTags(['เรียนประธาน', 'วัตถุประสงค์']);
      } finally {
        setLoading(false);
      }
    }
    if (eventId) initData();
    else setLoading(false);
  }, [eventId]);

  const handleNext = useCallback(() => {
    if (!isTimerRunning && elapsedTime === 0) setIsTimerRunning(true);
    if (activeChunkIndex < chunks.length - 1) setActiveChunkIndex((prev) => prev + 1);
  }, [activeChunkIndex, chunks.length, isTimerRunning, elapsedTime]);

  const handlePrev = useCallback(() => {
    if (!isTimerRunning && elapsedTime === 0) setIsTimerRunning(true);
    if (activeChunkIndex > 0) setActiveChunkIndex((prev) => prev - 1);
  }, [activeChunkIndex, isTimerRunning, elapsedTime]);

  const handleTagClick = useCallback((targetTag: string) => {
    const targetIndex = chunks.findIndex((chunk) => chunk.tag === targetTag);
    if (targetIndex !== -1) setActiveChunkIndex(targetIndex);
  }, [chunks]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); handleNext(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (loading) return <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">กำลังจัดเตรียมข้อมูล...</div>;
  if (!eventId) return <div className="min-h-screen bg-[#070b14] text-red-400 flex items-center justify-center">ข้อผิดพลาด: ไม่พบรหัสงาน (event_id)</div>;

  const currentChunk = chunks[activeChunkIndex];
  const nextChunk = chunks[activeChunkIndex + 1];

  return (
    <>
      {/* 🌟 Slide-over Drawer คู่มือหน้าจอ Teleprompter */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>

        <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-cyan-500/30 shadow-2xl transform transition-transform duration-300 flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-950">
            <h2 className="text-lg font-black text-cyan-400 flex items-center gap-2">
              <HelpCircle size={20} /> คู่มือการใช้งาน Teleprompter
            </h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-zinc-300">
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><MousePointerClick className="text-cyan-400" size={16} /> 1. การเลื่อนคำกล่าว (Clicker)</h3>
              <p className="leading-relaxed">
                คลิก/แตะ ที่จอแสดงผล หรือกดปุ่ม <b>ลูกศรขวา/ลง (➡️/⬇️) หรือ Spacebar</b> บนคีย์บอร์ด/หรือรีโมทพอยน์เตอร์ เพื่อเปลี่ยนไปย่อหน้าถัดไป
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><UserCheck className="text-cyan-400" size={16} /> 2. การเอ่ยเรียนประธานในพิธี</h3>
              <p className="leading-relaxed">
                หน้าจอจะดึงข้อมูล <b>"ประธานในพิธี"</b> มาเป็นคิวแรกเสมอ ผู้อ่านสามารถอ่านออกเสียงชื่อและตำแหน่งจากหน้าจอได้เลยอย่างมั่นใจ
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Type className="text-cyan-400" size={16} /> 3. ปรับขนาดฟอนต์</h3>
              <p className="leading-relaxed">
                ใช้ปุ่ม <span className="bg-zinc-800 text-white px-1.5 py-0.5 rounded">+A / -A</span> มุมขวาบน เพื่อปรับความใหญ่ของข้อความให้สบายตาประธานที่สุด
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><List className="text-cyan-400" size={16} /> 4. การกระโดดข้ามหัวข้อ</h3>
              <p className="leading-relaxed">
                แถบสีด้านบนสุดแสดง <b>โครงสร้างคำกล่าว</b> คุณสามารถคลิกที่ป้ายชื่อหัวข้อ เพื่อกระโดดข้ามเนื้อหาไปยังจุดที่ต้องการได้ทันที
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Clock className="text-cyan-400" size={16} /> 5. นาฬิกาจับเวลา</h3>
              <p className="leading-relaxed">
                นาฬิกาที่มุมขวาบนจะเริ่มจับเวลา <b>อัตโนมัติ</b> ทันทีที่มีการกดเลื่อนหน้าจอครั้งแรก (คุณสามารถคลิกที่เวลาเพื่อหยุดพัก Pause ได้)
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-[#060911] text-white flex flex-col justify-between p-5 select-none overflow-hidden">
        <header className="flex flex-wrap justify-between items-center border-b border-white/10 pb-3 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 object-contain" />
            <span className="text-zinc-400 text-sm font-medium truncate max-w-md">{eventName || 'งานพิธีการ'}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* 🌟 ปุ่มเปิดคู่มือ */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-400 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.15)]"
            >
              <HelpCircle size={14} className="animate-pulse" /> คู่มือ
            </button>

            <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-xl p-0.5">
              <button onClick={decreaseFontSize} className="px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg">-A</button>
              <span className="text-[11px] text-zinc-500 px-1 font-mono">{speechFontSize}px</span>
              <button onClick={increaseFontSize} className="px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg">+A</button>
            </div>
            <Link href={`/eventdashboard/gp-speech-scripts?event_id=${eventId}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold text-zinc-300 transition-colors">
              <FileEdit size={14} /> ร่างคำกล่าว
            </Link>
            <Link href={`/events/event-dashboard/${eventId}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold text-zinc-300 transition-colors">
              <LayoutDashboard size={14} /> ศูนย์กลาง
            </Link>
            <Link href={`/eventdashboard/report-speech-scripts?event_id=${eventId}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold text-zinc-300">
              <FileEdit size={14} /> ร่างคำกล่าวรายงาน
            </Link>
          </div>
        </header>

        <div className="flex justify-center w-full max-w-5xl mx-auto mt-4 mb-1 shrink-0">
          <h2 className="text-xl md:text-2xl font-black text-cyan-400 tracking-wide bg-gradient-to-r from-cyan-500/5 via-cyan-500/15 to-cyan-500/5 px-8 py-2 rounded-full border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            คำกล่าวรายงานของประธานจัดงาน
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          </h2>
        </div>

        <div className="w-full max-w-5xl mx-auto my-3 px-2 shrink-0 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 custom-scrollbar">
            {allTags.map((tag, idx) => {
              const isCurrentTag = currentChunk?.tag === tag;
              const colorScheme = TAG_COLORS[idx % TAG_COLORS.length];
              return (
                <div key={tag} onClick={() => handleTagClick(tag)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer ${isCurrentTag ? `${colorScheme.activeBg} border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105` : `${colorScheme.bg} border-${colorScheme.border.split('-')[1]}/30 ${colorScheme.text} hover:bg-white/10 hover:border-white/50 opacity-90`}`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${isCurrentTag ? 'bg-black text-white' : 'bg-black/40 text-white border border-white/20'}`}>{idx + 1}</span>
                  <span className="tracking-wide">{tag}</span>
                </div>
              );
            })}
          </div>
          <div onClick={() => setIsTimerRunning(!isTimerRunning)} className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 px-4 py-1.5 rounded-xl shrink-0 cursor-pointer hover:bg-zinc-800 transition-colors">
            {isTimerRunning ? <Clock size={16} className="text-cyan-400 animate-pulse" /> : <Pause size={16} className="text-zinc-500" />}
            <span className={`font-mono font-black text-base tracking-wider ${isTimerRunning ? 'text-cyan-400' : 'text-zinc-500'}`}>{formatTime(elapsedTime)}</span>
          </div>
        </div>
        <div className="w-full max-w-5xl mx-auto my-3 px-2 shrink-0 flex justify-between items-center gap-4">
          {/* แถบแท็ก (โค้ดเดิม) ... */}
          {/* กล่องจับเวลา (โค้ดเดิม) ... */}
        </div>

        {/* 🌟 NEW: Status Bar (ลูกศรเรืองแสงสีฟ้า, คำว่า เรียน, และจุดไข่ปลาวิ่ง) */}
        <div className="w-full max-w-5xl mx-auto px-4 mb-4 flex items-center gap-4 shrink-0 h-10">

          {/* กล่องลูกศรชี้เรืองแสง สีฟ้า (Cyan) */}
          <div className="flex items-center justify-center bg-zinc-900 border border-cyan-500/50 w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.3)] shrink-0 z-10">
            <ChevronRight className="text-cyan-400" size={24} />
          </div>

          {/* คำว่า "เรียน . . ." (แสดงเฉพาะคิวเอ่ยเรียนประธานในพิธีเท่านั้น) */}
          {(currentChunk as any)?.type === 'president_greeting' && (
            <div className="text-cyan-400 font-bold text-2xl tracking-widest shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              เรียน <span className="animate-pulse">. . .</span>
            </div>
          )}

          {/* แอนิเมชันจุดไข่ปลาวิ่งไปทางขวา สีฟ้า (#22d3ee) */}
          <div className="flex-1 h-full flex items-center opacity-70 overflow-hidden">
            <svg
              width="100%"
              height="20"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)'
              }}
            >
              <line x1="0" y1="10" x2="100%" y2="10" stroke="#22d3ee" strokeWidth="4" strokeDasharray="0 12" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" values="12;0" dur="0.8s" repeatCount="indefinite" />
              </line>
            </svg>
          </div>

        </div>

        {/* 🌟 Main Content Viewport (โค้ดเดิม) */}
        <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full my-2">
          {(currentChunk as any)?.type === 'president_greeting' && president ? (
            <div onClick={handleNext} className="cursor-pointer flex flex-col items-center justify-center text-center">
              <div className="bg-gradient-to-b from-[#071936] to-[#092248] border-2 border-cyan-400/80 rounded-3xl p-10 shadow-[0_0_50px_rgba(34,211,238,0.15)] max-w-2xl w-full">
                <span className="inline-block bg-cyan-500/20 text-cyan-300 text-sm font-black px-4 py-1 rounded-full uppercase tracking-widest mb-6 border border-cyan-400/30">เรียน (ประธานในพิธี)</span>
                <div className="w-32 h-40 mx-auto rounded-2xl border-2 border-cyan-400/70 overflow-hidden bg-zinc-900 flex items-center justify-center shadow-2xl mb-6">
                  {president.profile_image_url ? <img src={president.profile_image_url} alt={president.fullname} className="w-full h-full object-cover" /> : <UserCheck size={48} className="text-zinc-600" />}
                </div>
                <h3 className="text-4xl md:text-5xl font-black text-white leading-tight mb-3">{president.fullname}</h3>
                <p className="text-2xl md:text-3xl font-bold text-cyan-300 mb-2">{president.position || '-'}</p>
                <p className="text-lg md:text-xl text-zinc-400">{president.organization || '-'}</p>
              </div>
            </div>
          ) : (
            <div onClick={handleNext} className="cursor-pointer bg-zinc-900/40 border border-white/10 rounded-3xl p-8 md:p-10 min-h-[300px] flex flex-col justify-between transition-all hover:border-white/20 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">หัวข้อ:</span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${TAG_COLORS[(currentChunk?.tagIndex || 0) % TAG_COLORS.length].bg} ${TAG_COLORS[(currentChunk?.tagIndex || 0) % TAG_COLORS.length].border} ${TAG_COLORS[(currentChunk?.tagIndex || 0) % TAG_COLORS.length].text}`}>
                    {currentChunk?.tag || 'ทั่วไป'}
                  </span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">(คลิกจอ หรือกด Pointer เพื่อเลื่อน)</span>
              </div>
              <p style={{ fontSize: `${speechFontSize}px` }} className="font-bold leading-relaxed text-[#F0F8FF] tracking-wide my-auto select-none">
                {currentChunk?.text || '(ไม่มีข้อความ)'}
              </p>
              <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${TAG_COLORS[(currentChunk?.tagIndex || 0) % TAG_COLORS.length].activeBg}`} />
            </div>
          )}
          <div className="mt-5 border-t border-white/10 pt-3 px-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">คิวถัดไป</span>
            <div className="text-lg text-zinc-500 font-medium line-clamp-2 leading-relaxed">
              {nextChunk ? <>{nextChunk.tag && nextChunk.tag !== currentChunk?.tag && <span className="text-cyan-400 font-bold mr-2">&lt;{nextChunk.tag}&gt;</span>}{nextChunk.text}</> : '(สิ้นสุดคำกล่าวรายงาน)'}
            </div>
          </div>
        </main>

        <footer className="flex justify-between items-center border-t border-white/10 pt-3 shrink-0">
          <div className="text-xs text-zinc-500 font-mono">คำกล่าวตอนที่: {activeChunkIndex + 1} จาก {chunks.length}</div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-300 transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={handleNext} className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg transition-colors font-bold text-xs flex items-center gap-1.5">
              <span>ถัดไป</span><ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
// ==========================================
// 🚀 Component หลักที่ Export (หุ้ม Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function ReportTeleprompterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-cyan-400 flex items-center justify-center font-bold">กำลังโหลดหน้าจอ Report Teleprompter...</div>}>
      {/* 🌟 ถ้าไฟล์นี้มี <RouteGuard> ก็เอามาครอบ <ReportTeleprompterContent /> ไว้ด้านในนี้ได้เลยครับ */}
      <ReportTeleprompterContent />
    </Suspense>
  );
}