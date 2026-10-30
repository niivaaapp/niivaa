'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ChevronRight, ChevronLeft, LayoutDashboard, FileEdit, Users, Clock, Pause, HelpCircle, X, MousePointerClick, Type, List } from 'lucide-react';
import { ScriptChunk } from '@/lib/speechParser';
import PinGuard from '@/components/PinGuard';

interface Attendee {
  id: string;
  fullname: string;
  position: string;
  organization: string;
  profile_image_url?: string;
  priority_level?: number;
}

interface TeleprompterProps {
  eventId?: string;
  defaultVipLimit?: number;
}

const TAG_COLORS = [
  { bg: 'bg-emerald-500/10', border: 'border-emerald-400', text: 'text-emerald-300', activeBg: 'bg-emerald-500 text-black' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-400', text: 'text-cyan-300', activeBg: 'bg-cyan-500 text-black' },
  { bg: 'bg-purple-500/10', border: 'border-purple-400', text: 'text-purple-300', activeBg: 'bg-purple-500 text-black' },
  { bg: 'bg-amber-500/10', border: 'border-amber-400', text: 'text-amber-300', activeBg: 'bg-amber-500 text-black' },
  { bg: 'bg-rose-500/10', border: 'border-rose-400', text: 'text-rose-300', activeBg: 'bg-rose-500 text-black' },
  { bg: 'bg-blue-500/10', border: 'border-blue-400', text: 'text-blue-300', activeBg: 'bg-blue-500 text-black' },
];

function TeleprompterContent({ eventId: propEventId, defaultVipLimit = 5 }: TeleprompterProps) {
  const searchParams = useSearchParams();
  const eventId = propEventId || searchParams.get('event_id') || searchParams.get('eventId') || '';
  const isShared = searchParams.get('shared') === 'true';

  const [eventName, setEventName] = useState<string>('');
  const [vipLimit, setVipLimit] = useState<number>(defaultVipLimit);
  const [vipList, setVipList] = useState<Attendee[]>([]);
  const [currentVipIndex, setCurrentVipIndex] = useState<number>(0);

  const [chunks, setChunks] = useState<ScriptChunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const [speechFontSize, setSpeechFontSize] = useState<number>(40);
  const increaseFontSize = () => setSpeechFontSize((prev) => Math.min(prev + 4, 72));
  const decreaseFontSize = () => setSpeechFontSize((prev) => Math.max(prev - 4, 32));

  const [allTags, setAllTags] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const handleTagClick = useCallback((targetTag: string) => {
    const targetIndex = chunks.findIndex((chunk) => chunk.tag === targetTag);
    if (targetIndex !== -1) {
      setActiveChunkIndex(targetIndex);
      if (chunks[targetIndex].type === 'vip_greeting') {
        setCurrentVipIndex(0);
      }
    }
  }, [chunks]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
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
        const { data: eventData } = await supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .maybeSingle();
        if (eventData) setEventName(eventData.title);

        const { data: attendeesData } = await supabase
          .from('event_attendees')
          .select(`id, fullname, position, organization, global_profiles ( profile_image_url )`)
          .eq('event_id', eventId)
          .order('priority_level', { ascending: true })
          .range(1, vipLimit);

        if (attendeesData) {
          setVipList(
            attendeesData.map((att: any) => ({
              id: att.id,
              fullname: att.fullname,
              position: att.position,
              organization: att.organization,
              profile_image_url: att.global_profiles?.profile_image_url || null,
            }))
          );
        }

        const { data: scriptData, error: scriptError } = await supabase
          .from('event_scripts')
          .select('content_chunks')
          .eq('event_id', eventId)
          .eq('script_type', 'opening')
          .maybeSingle();

        if (scriptError || !scriptData || !Array.isArray(scriptData.content_chunks) || scriptData.content_chunks.length === 0) {
          throw new Error('No script data');
        } else {
          const loadedChunks: ScriptChunk[] = scriptData.content_chunks;
          setChunks(loadedChunks);
          const tags = Array.from(new Set(loadedChunks.map((c) => c.tag).filter(Boolean))) as string[];
          setAllTags(tags);
        }
      } catch (err) {
        const fallbackChunks: ScriptChunk[] = [
          { id: '1', type: 'vip_greeting', tag: 'ทักทาย VIP', tagIndex: 0, text: '' },
          { id: '2', type: 'text', tag: 'เกริ่นนำ', tagIndex: 1, text: 'ผมรู้สึกยินดีและเป็นเกียรติอย่างยิ่ง ที่ได้มาเป็นประธานในพิธีเปิดการอบรมสัมมนาในวันนี้' },
          { id: '3', type: 'text', tag: 'นโยบาย', tagIndex: 2, text: 'การขับเคลื่อนงานด้านการศึกษาและการพัฒนาบุคลากร ถือเป็นรากฐานที่สำคัญยิ่งต่อการพัฒนาประเทศในระยะยาว' },
          { id: '4', type: 'text', tag: 'เปิดงาน', tagIndex: 3, text: 'ขอขอบคุณคณะทำงานและผู้มีส่วนเกี่ยวข้องทุกท่าน และขออวยพรให้การจัดกิจกรรมในครั้งนี้บรรลุตามวัตถุประสงค์ทุกประการ' },
        ];
        setChunks(fallbackChunks);
        const tags = Array.from(new Set(fallbackChunks.map((c) => c.tag).filter(Boolean))) as string[];
        setAllTags(tags);
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      initData();
    } else {
      setLoading(false);
    }
  }, [eventId, vipLimit]);

  const handleNext = useCallback(() => {
    if (!isTimerRunning && elapsedTime === 0) setIsTimerRunning(true);
    const currentChunk = chunks[activeChunkIndex];

    if (currentChunk?.type === 'vip_greeting' && currentVipIndex < vipList.length - 1) {
      setCurrentVipIndex((prev) => prev + 1);
      return;
    }

    if (activeChunkIndex < chunks.length - 1) {
      setActiveChunkIndex((prev) => prev + 1);
    }
  }, [activeChunkIndex, currentVipIndex, chunks, vipList.length, isTimerRunning, elapsedTime]);

  const handlePrev = useCallback(() => {
    if (!isTimerRunning && elapsedTime === 0) setIsTimerRunning(true);
    const currentChunk = chunks[activeChunkIndex];

    if (currentChunk?.type === 'vip_greeting' && currentVipIndex > 0) {
      setCurrentVipIndex((prev) => prev - 1);
      return;
    }

    if (activeChunkIndex > 0) {
      setActiveChunkIndex((prev) => prev - 1);
      if (chunks[activeChunkIndex - 1]?.type === 'vip_greeting') {
        setCurrentVipIndex(vipList.length - 1);
      }
    }
  }, [activeChunkIndex, currentVipIndex, chunks, vipList.length, isTimerRunning, elapsedTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        handleNext();
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (loading) return <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center font-bold text-lg">กำลังจัดเตรียมข้อมูลสำหรับประธาน...</div>;
  if (!eventId) return <div className="min-h-screen bg-[#070b14] text-red-400 flex items-center justify-center font-bold text-lg">ข้อผิดพลาด: ไม่พบรหัสงาน (event_id)</div>;

  const currentChunk = chunks[activeChunkIndex];
  const nextChunk = chunks[activeChunkIndex + 1];
  const visibleVips = vipList.slice(currentVipIndex, currentVipIndex + 2);

  const content = (
    <>
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
        <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-amber-500/30 shadow-2xl transform transition-transform duration-300 flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-950">
            <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
              <HelpCircle size={20} /> คู่มือการใช้งาน Teleprompter
            </h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-zinc-300">
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><MousePointerClick className="text-amber-400" size={16} /> 1. การเลื่อนคำกล่าว</h3>
              <p className="leading-relaxed">คลิก/แตะ ที่กล่องข้อความ หรือกดปุ่ม <b>ลูกศรขวา/ลง (➡️/⬇️) หรือ Spacebar</b> บนคีย์บอร์ดหรือพอยน์เตอร์ เพื่อเปลี่ยนไปเนื้อหาถัดไป</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Users className="text-amber-400" size={16} /> 2. การตั้งค่าและจัดคิวทักทาย VIP</h3>
              <p className="leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">คุณสามารถปรับ <b>"จำนวน VIP"</b> ที่กล่องด้านบนขวา (ค่าเริ่มต้นคือ 5) เพื่อกำหนดว่าประธานจะต้องเอ่ยทักทายแขกวีไอพีกี่ท่าน หากเวลาบนเวทีมีจำกัด สามารถลดจำนวนลงได้ทันที ระบบจะตัดคิวท้ายๆ ออกและเริ่มเข้าสู่เนื้อหาคำกล่าวโดยอัตโนมัติ</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Type className="text-amber-400" size={16} /> 3. ปรับขนาดฟอนต์</h3>
              <p className="leading-relaxed">ใช้ปุ่ม <span className="bg-zinc-800 text-white px-1.5 py-0.5 rounded">+A / -A</span> ด้านบน เพื่อปรับขนาดตัวอักษรให้พอดีกับระยะสายตาของประธานที่สุด</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><List className="text-amber-400" size={16} /> 4. การกระโดดข้ามหัวข้อ</h3>
              <p className="leading-relaxed">แถบสีด้านบนสุดแสดง <b>โครงสร้างคำกล่าว</b> ทั้งหมด หากต้องการข้ามเนื้อหา สามารถคลิกที่ป้ายแท็กเพื่อกระโดดไปยังจุดนั้นได้ทันที</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Clock className="text-amber-400" size={16} /> 5. นาฬิกาจับเวลา</h3>
              <p className="leading-relaxed">นาฬิกาที่มุมขวาบนจะเริ่มจับเวลา <b>อัตโนมัติ</b> ทันทีที่มีการกดเลื่อนหน้าจอครั้งแรก (สามารถคลิกที่เวลาเพื่อหยุดพัก Pause ได้)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-[#060911] text-white flex flex-col justify-between p-5 select-none overflow-hidden">
        <header className="flex flex-wrap justify-between items-center border-b border-white/10 pb-3 gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa Smart Event" className="h-8 object-contain" />
            <span className="text-zinc-400 text-sm font-medium truncate max-w-md">{eventName || 'งานพิธีการ'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs font-bold text-amber-400 transition-colors shadow-[0_0_10px_rgba(251,191,36,0.15)] shrink-0">
              <HelpCircle size={14} className="animate-pulse" /> คู่มือ
            </button>
            
            <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-xl p-0.5 shrink-0">
              <button onClick={decreaseFontSize} className="px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">-A</button>
              <span className="text-[11px] text-zinc-500 px-1 font-mono">{speechFontSize}px</span>
              <button onClick={increaseFontSize} className="px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">+A</button>
            </div>

            <div className="flex items-center gap-2 bg-zinc-900/80 border border-amber-500/30 px-2.5 py-1 rounded-xl shrink-0">
              <Users size={14} className="text-amber-400" />
              <span className="text-xs text-zinc-400 font-bold hidden sm:inline">จำนวน VIP:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={vipLimit}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setVipLimit(val);
                    setCurrentVipIndex(0);
                  }
                }}
                className="w-10 bg-black border border-white/10 rounded-lg px-1 py-0.5 text-center text-xs font-black text-amber-400 focus:border-amber-500 outline-none"
              />
              <span className="text-[11px] text-zinc-500">คน</span>
            </div>

            {!isShared && (
              <>
                <Link href={`/eventdashboard/gp-speech-scripts?event_id=${eventId}`} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold text-zinc-300 transition-colors">
                  <FileEdit size={14} /> ร่างคำกล่าว
                </Link>
                <Link href={`/events/event-dashboard/${eventId}`} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/10 hover:border-white/30 rounded-lg text-xs font-semibold text-zinc-300 transition-colors">
                  <LayoutDashboard size={14} /> ศูนย์กลาง
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="flex justify-center w-full max-w-5xl mx-auto mt-4 mb-1 shrink-0">
          <h2 className="text-xl md:text-2xl font-black text-amber-400 tracking-wide bg-gradient-to-r from-amber-500/5 via-amber-500/15 to-amber-500/5 px-8 py-2 rounded-full border border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.1)] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            คำกล่าวของประธานในพิธี
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          </h2>
        </div>

        <div className="w-full max-w-5xl mx-auto my-3 px-2 shrink-0 flex justify-between items-center gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1 custom-scrollbar">
            {allTags.length > 0 && allTags.map((tag, idx) => {
              const isCurrentTag = currentChunk?.tag === tag;
              const colorScheme = TAG_COLORS[idx % TAG_COLORS.length];
              return (
                <div key={tag} onClick={() => handleTagClick(tag)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-300 shrink-0 cursor-pointer ${isCurrentTag ? `${colorScheme.activeBg} border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105` : `${colorScheme.bg} border-${colorScheme.border.split('-')[1]}/30 ${colorScheme.text} hover:bg-white/10 hover:border-white/50 hover:shadow-md opacity-90`} title="กระโดดไปยังหัวข้อนี้" `}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-black transition-colors ${isCurrentTag ? 'bg-black text-white' : 'bg-black/40 text-white border border-white/20'}`}>
                    {idx + 1}
                  </span>
                  <span className="tracking-wide">{tag}</span>
                </div>
              );
            })}
          </div>
          <div onClick={() => setIsTimerRunning(!isTimerRunning)} className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 px-4 py-1.5 rounded-xl shrink-0 cursor-pointer hover:bg-zinc-800 transition-colors shadow-lg" title="คลิกเพื่อ เริ่ม/หยุด เวลา">
            {isTimerRunning ? <Clock size={16} className="text-amber-400 animate-pulse" /> : <Pause size={16} className="text-zinc-500" />}
            <span className={`font-mono font-black text-base tracking-wider ${isTimerRunning ? 'text-amber-400' : 'text-zinc-500'}`}>{formatTime(elapsedTime)}</span>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto px-4 mb-4 flex items-center gap-4 shrink-0 h-10">
          <div className="flex items-center justify-center bg-zinc-900 border border-amber-500/50 w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] shrink-0 z-10">
            <ChevronRight className="text-amber-400" size={24} />
          </div>
          {currentChunk?.type === 'vip_greeting' && currentVipIndex === 0 && (
            <div className="text-amber-400 font-bold text-2xl tracking-widest shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
              เรียน <span className="animate-pulse">. . .</span>
            </div>
          )}
          <div className="flex-1 h-full flex items-center opacity-70 overflow-hidden">
            <svg width="100%" height="20" style={{ WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)', maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)' }}>
              <line x1="0" y1="10" x2="100%" y2="10" stroke="#fbbf24" strokeWidth="4" strokeDasharray="0 12" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" values="12;0" dur="0.8s" repeatCount="indefinite" />
              </line>
            </svg>
          </div>
        </div>

        <main className="flex-1 flex flex-col justify-center max-w-5xl mx-auto w-full my-2">
          {currentChunk?.type === 'vip_greeting' && visibleVips.length > 0 ? (
            <div onClick={handleNext} className="cursor-pointer space-y-4">
              {visibleVips.map((vip, idx) => {
                const isCurrent = idx === 0;
                const originalIndex = currentVipIndex + idx + 1;
                return (
                  <div key={vip.id} className={`flex items-center gap-6 rounded-3xl transition-all duration-300 ${isCurrent ? 'bg-gradient-to-r from-[#071936] via-[#092248] to-[#0d1c33] border-2 border-amber-400/80 p-6 shadow-[0_0_45px_rgba(251,191,36,0.2)] opacity-100' : 'bg-zinc-950/40 border border-white/10 p-4 opacity-40 hover:opacity-60 scale-[0.98]'}`}>
                    <div className={`flex flex-col items-center justify-center rounded-2xl shrink-0 ${isCurrent ? 'w-20 h-28 bg-black/60 border border-amber-400/50 shadow-inner' : 'w-14 h-16 bg-black/30 border border-white/5'}`}>
                      <span className={`font-semibold ${isCurrent ? 'text-xs text-zinc-400' : 'text-[10px] text-zinc-500'}`}>ลำดับ</span>
                      <span className={`font-black ${isCurrent ? 'text-amber-400 text-4xl mt-1' : 'text-zinc-400 text-2xl'}`}>{originalIndex}</span>
                    </div>
                    <div className={`rounded-2xl border overflow-hidden shrink-0 bg-zinc-900 flex items-center justify-center ${isCurrent ? 'w-28 h-36 border-2 border-amber-400/70 shadow-[0_0_20px_rgba(0,0,0,0.5)]' : 'w-16 h-20 border border-white/10'}`}>
                      {vip.profile_image_url ? <img src={vip.profile_image_url} alt={vip.fullname} className="w-full h-full object-cover" /> : <Users size={isCurrent ? 36 : 20} className="text-zinc-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isCurrent && <span className="inline-block bg-amber-400 text-black text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-wider mb-2">กำลังเอ่ยทักทาย (Reading Now)</span>}
                      <h3 className={`font-black truncate ${isCurrent ? 'text-3xl md:text-4xl text-amber-300 leading-tight' : 'text-xl text-zinc-300'}`}>{vip.fullname}</h3>
                      <p className={`font-bold truncate ${isCurrent ? 'text-xl md:text-2xl text-white mt-1.5' : 'text-sm text-zinc-400 mt-1'}`}>{vip.position || '-'}</p>
                      <p className={`truncate ${isCurrent ? 'text-base md:text-lg text-cyan-300/80 mt-1' : 'text-xs text-zinc-500'}`}>{vip.organization || '-'}</p>
                    </div>
                  </div>
                );
              })}
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
              
              {currentChunk?.text?.trim().startsWith('[IMG=') ? (
                <div className="flex items-center justify-center h-full min-h-[40vh] my-auto">
                  <img
                    src={currentChunk.text.trim().replace('[IMG=', '').replace(']', '')}
                    alt="Cue Graphic"
                    className="max-w-full max-h-[50vh] rounded-2xl border-2 border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.15)] object-contain"
                  />
                </div>
              ) : (
                <p style={{ fontSize: `${speechFontSize}px` }} className="font-bold leading-relaxed text-[#FFFBEB] tracking-wide my-auto select-none">
                  {currentChunk?.text || '(ไม่มีข้อความ)'}
                </p>
              )}

              <div className={`absolute bottom-0 left-0 right-0 h-1.5 ${TAG_COLORS[(currentChunk?.tagIndex || 0) % TAG_COLORS.length].activeBg}`} />
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-3 px-2">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">คิวถัดไป</span>
            <div className="text-lg text-zinc-500 font-medium line-clamp-2 leading-relaxed">
              {currentChunk?.type === 'vip_greeting' && currentVipIndex < vipList.length - 1 ? (
                `ลำดับถัดไป: ${vipList[currentVipIndex + 1]?.fullname} (${vipList[currentVipIndex + 1]?.position})`
              ) : nextChunk ? (
                <>
                  {nextChunk.tag && nextChunk.tag !== currentChunk?.tag && <span className="text-amber-400 font-bold mr-2">&lt;{nextChunk.tag}&gt;</span>}
                  {nextChunk.text?.trim().startsWith('[IMG=') ? (
                    <span className="italic text-amber-500/80">(ภาพแผนผัง Mind Map)</span>
                  ) : (
                    nextChunk.text
                  )}
                </>
              ) : '(สิ้นสุดคำกล่าว)'}
            </div>
          </div>
        </main>

        <footer className="flex justify-between items-center border-t border-white/10 pt-3 shrink-0">
          <div className="text-xs text-zinc-500 font-mono">
            {currentChunk?.type === 'vip_greeting'
              ? `VIP ทักทาย: ท่านที่ ${currentVipIndex + 1} จากทั้งหมด ${vipList.length} ท่าน`
              : `คำกล่าวตอนที่: ${activeChunkIndex + 1} จาก ${chunks.length}`}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrev} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-zinc-300 transition-colors" title="ย้อนกลับ"><ChevronLeft size={18} /></button>
            <button onClick={handleNext} className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg transition-colors font-bold text-xs flex items-center gap-1.5" title="ไปข้างหน้า">
              <span>ถัดไป</span><ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
    </>
  );

  if (isShared) {
    return <PinGuard eventId={eventId}>{content}</PinGuard>;
  }

  return content;
}

export default function TeleprompterPage(props: TeleprompterProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center font-bold text-lg">กำลังจัดเตรียมข้อมูลสำหรับประธาน...</div>}>
      <TeleprompterContent {...props} />
    </Suspense>
  );
}