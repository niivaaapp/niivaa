"use client";
import RouteGuard from '@/components/RouteGuard';
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Printer, Save, Plus, Trash2, CheckCircle,
  Mic, AlignLeft, Clock, MonitorPlay, AlertTriangle, Crown,
  Settings2, Users, ExternalLink, Video, LayoutGrid, HelpCircle,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ScriptBuilderManualDrawer from '@/components/ScriptBuilderManualDrawer';

interface EventAgendaItem {
  id: string;
  title: string;
  duration_minutes: number;
  sort_order: number;
  details: string;
  main_script: string;
  sub_script: string;
  start_time: string;
  speaker_role: string;
  responsible_person: string;
  reference_url: string;
  media_type: string;
  media_url: string;
  visual_audio_cue: string;
}

// 🌟 สร้าง Component ย่อยสำหรับกล่องจัดลำดับ (พิมพ์แล้วกด Enter)
function CueSortOrder({
  cue,
  index,
  totalCues,
  onMove,
  onJump
}: {
  cue: EventAgendaItem;
  index: number;
  totalCues: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onJump: (id: string, newOrder: number) => void;
}) {
  const [val, setVal] = useState(cue.sort_order.toString());

  // ซิงค์ค่าเมื่อมีการเปลี่ยนลำดับจากภายนอก (เช่น กดปุ่มลูกศร)
  useEffect(() => {
    setVal(cue.sort_order.toString());
  }, [cue.sort_order]);

  const handleApply = () => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = cue.sort_order;
    if (num < 1) num = 1;
    if (num > totalCues) num = totalCues;

    setVal(num.toString()); // รีเซ็ตค่าให้ถูกต้องในกล่อง
    if (num !== cue.sort_order) {
      onJump(cue.id, num); // สั่งย้ายสลับคิวจริง
    }
  };

  return (
    <div className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
      <span className="text-xs text-gray-500 font-bold uppercase">ลำดับที่</span>

      {/* 🌟 ซ่อนลูกศรขึ้นลงแบบ Native ของเบราว์เซอร์ ด้วย Tailwind คลาส */}
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleApply}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleApply();
          }
        }}
        className="w-10 bg-transparent text-purple-400 font-black text-center outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <div className="flex flex-col ml-1 border-l border-gray-800 pl-2">
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
          title="เลื่อนขึ้น"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === totalCues - 1}
          className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
          title="เลื่อนลง"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Component เนื้อหาหลัก
// ==========================================
function ScriptBuilderContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const urlEventId = searchParams.get('event_id') || 'current';

  const [activeEventId, setActiveEventId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [scriptTitle, setScriptTitle] = useState('สคริปต์พิธีกร: งานรัฐพิธี');
  const [baseStartTime, setBaseStartTime] = useState('08:00');
  const [cues, setCues] = useState<EventAgendaItem[]>([]);

  const [printSubScript, setPrintSubScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showProAlert, setShowProAlert] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const eventIdFromUrl = searchParams.get('event_id');

  // --- 1. Fetch ข้อมูลจริง ---
  useEffect(() => {
    const fetchScripts = async () => {
      let targetId = urlEventId;

      if (targetId === 'current' || !targetId) {
        const { data: latestEvent } = await supabase
          .from('events')
          .select('id, title')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (latestEvent) {
          targetId = latestEvent.id;
          if (latestEvent.title) setScriptTitle(`สคริปต์พิธีกร: ${latestEvent.title}`);
        }
      }

      setActiveEventId(targetId);

      if (targetId && targetId !== 'current') {
        const { data, error } = await supabase
          .from('event_agenda_items')
          .select('*')
          .eq('event_id', targetId)
          .order('sort_order', { ascending: true });

        if (data && data.length > 0) {
          setCues(data);
        } else {
          setCues([{
            id: crypto.randomUUID(),
            sort_order: 1, duration_minutes: 5,
            title: 'เริ่มกิจกรรม',
            main_script: '', sub_script: '', details: '', start_time: '',
            speaker_role: 'MC', responsible_person: '',
            reference_url: '', media_type: 'none', media_url: '', visual_audio_cue: ''
          }]);
        }
      }
    };
    fetchScripts();
  }, [urlEventId]);

  // --- 🌟 Engine: คำนวณเวลาอย่างเดียว (แยกเรื่องจัดลำดับออกไป) ---
  useEffect(() => {
    if (cues.length === 0) return;

    let [hours, minutes] = baseStartTime.split(':').map(Number);
    let currentTime = new Date();
    currentTime.setHours(hours || 0, minutes || 0, 0, 0);

    const updatedCues = cues.map((cue) => {
      const timeString = currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      const newDuration = (Number(cue.duration_minutes) || 0);
      currentTime.setMinutes(currentTime.getMinutes() + newDuration);
      return { ...cue, start_time: timeString };
    });

    // อัปเดตเฉพาะเมื่อเวลาเปลี่ยน เพื่อป้องกัน Infinite Loop
    const isDifferent = JSON.stringify(updatedCues.map(c => c.start_time)) !== JSON.stringify(cues.map(c => c.start_time));
    if (isDifferent) {
      setCues(updatedCues);
    }
  }, [cues, baseStartTime]);

  const handlePrintClick = () => setShowProAlert(true);
  const confirmPrint = () => {
    setShowProAlert(false);
    setTimeout(() => window.print(), 500);
  };

  const handleSaveToDatabase = async () => {
    if (!activeEventId || activeEventId === 'current') return alert("ไม่พบรหัสงาน (Event ID)");
    setIsSaving(true);
    try {
      const payload = cues.map(cue => ({ ...cue, event_id: activeEventId }));
      const { error } = await supabase.from('event_agenda_items').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCue = (id: string, field: keyof EventAgendaItem, value: any) => {
    setCues(prev => prev.map(cue => cue.id === id ? { ...cue, [field]: value } : cue));
  };

  // 🌟 [ระบบสลับลำดับ] กดปุ่มขึ้น/ลง
  const moveCueSequence = useCallback((index: number, direction: -1 | 1) => {
    setCues(prevCues => {
      const newCues = [...prevCues];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= newCues.length) return prevCues;

      // สลับของใน Array ตรงๆ
      const temp = newCues[index];
      newCues[index] = newCues[targetIndex];
      newCues[targetIndex] = temp;

      // จัดเรียงเลข sort_order ใหม่ให้ถูกต้อง
      return newCues.map((c, i) => ({ ...c, sort_order: i + 1 }));
    });
  }, []);

  // 🌟 [ระบบข้ามลำดับ] พิมพ์เลขแล้วกด Enter
  const jumpCueSequence = useCallback((id: string, newOrder: number) => {
    setCues(prevCues => {
      const currentIndex = prevCues.findIndex(c => c.id === id);
      if (currentIndex === -1) return prevCues;

      const targetIndex = Math.max(0, Math.min(newOrder - 1, prevCues.length - 1));

      const newCues = [...prevCues];
      const [movedItem] = newCues.splice(currentIndex, 1); // ดึงตัวที่ต้องการย้ายออก
      newCues.splice(targetIndex, 0, movedItem); // แทรกกลับเข้าไปในตำแหน่งใหม่

      return newCues.map((c, i) => ({ ...c, sort_order: i + 1 }));
    });
  }, []);

  const addCue = () => {
    const nextOrder = cues.length > 0 ? Math.max(...cues.map(c => c.sort_order)) + 1 : 1;
    setCues([...cues, {
      id: crypto.randomUUID(), sort_order: nextOrder, duration_minutes: 5,
      title: 'บล็อกสคริปต์ใหม่', main_script: '', sub_script: '', details: '', start_time: '',
      speaker_role: 'MC', responsible_person: '', reference_url: '', media_type: 'none', media_url: '', visual_audio_cue: ''
    }]);
  };

  const deleteCue = (id: string) => {
    if (confirm('ต้องการลบ Script Block นี้หรือไม่?')) {
      setCues(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, sort_order: i + 1 })));
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans print:bg-white print:text-black relative">

      <ScriptBuilderManualDrawer isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      <header className="bg-gray-900 border-b border-purple-900/50 sticky top-0 z-40 shadow-md print:hidden">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/events/event-dashboard/${eventIdFromUrl}`} className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0">
              <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
            </Link>
            <Link href="/officialeventdashboard/hub" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-purple-400 rounded-lg transition-colors border border-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-gray-800 mx-1"></div>
            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <AlignLeft className="w-5 h-5 text-purple-500" /> สร้างสคริปต์ (Script Builder)
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsManualOpen(true)} className="flex items-center gap-2 px-3 h-10 bg-gray-800 hover:bg-purple-950/40 text-gray-300 hover:text-purple-400 rounded-xl transition-all border border-gray-700 hover:border-purple-500/50 shadow-sm">
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-bold hidden sm:inline">คู่มือ</span>
            </button>
            <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block"></div>
            <Link href={`/officialeventdashboard/mc-script${activeEventId !== 'current' ? `?event_id=${activeEventId}` : ''}`} target='_blank' className="hidden sm:flex items-center px-4 h-10 bg-fuchsia-950/40 hover:bg-fuchsia-900 text-fuchsia-400 border border-fuchsia-800 rounded-xl text-sm font-bold transition-all shadow-sm">
              <MonitorPlay className="w-4 h-4 mr-2" /> พิธีกรหน้างาน
            </Link>
            <div className="h-6 w-px bg-gray-800 mx-1 hidden sm:block"></div>
            <div className="h-10 w-auto hidden lg:block mr-2">
              <Image src="/niivaasmartevent_logo.png" alt="NiiVaa" width={140} height={35} className="h-full object-contain opacity-90 drop-shadow-[0_0_8px_rgba(217,70,239,0.3)]" priority />
            </div>
            <button onClick={handleSaveToDatabase} disabled={isSaving} className="flex items-center px-4 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50">
              {isSaved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              <span className="hidden sm:inline">{isSaving ? 'กำลังบันทึก...' : isSaved ? 'บันทึกเรียบร้อย' : 'บันทึกข้อมูล'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 print:p-0 print:m-0 z-10 relative">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
          <div className="flex bg-black p-1 rounded-xl border border-gray-800 w-full md:w-auto">
            <button onClick={() => setViewMode('editor')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${viewMode === 'editor' ? 'bg-purple-900 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
              <Settings2 className="w-4 h-4 mr-2" /> โหมดแก้ไขสคริปต์
            </button>
            <button onClick={() => setViewMode('preview')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${viewMode === 'preview' ? 'bg-gray-200 text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>
              <Printer className="w-4 h-4 mr-2" /> ตัวอย่างก่อนพิมพ์
            </button>
            <Link href={`/eventdashboard/showtime/vip${activeEventId !== 'current' ? `?event_id=${activeEventId}` : ''}`} target='_blank' className="hidden sm:flex items-center px-4 h-10 bg-indigo-950/40 hover:bg-indigo-900 text-indigo-400 border border-indigo-800 rounded-xl text-sm font-bold transition-all shadow-sm">
              <Mic className="w-4 h-4 mr-2" /> พิธีกรแนะนำVIP
            </Link>
          </div>

          {viewMode === 'editor' && (
            <div className="flex gap-4 w-full md:w-auto bg-gray-900 p-2 rounded-xl border border-gray-800 shadow-lg">
              <div className="flex items-center px-3 gap-2 border-r border-gray-800">
                <Clock className="w-4 h-4 text-purple-400" />
                <input type="time" value={baseStartTime} onChange={(e) => setBaseStartTime(e.target.value)} className="bg-transparent text-sm font-bold text-white outline-none w-24" />
              </div>
              <input type="text" value={scriptTitle} onChange={(e) => setScriptTitle(e.target.value)} placeholder="ชื่องาน..." className="flex-1 min-w-[300px] bg-transparent text-sm font-bold text-white outline-none px-2" />
            </div>
          )}

          {viewMode === 'preview' && (
            <div className="flex gap-4 w-full md:w-auto">
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer bg-gray-900 px-4 py-2 rounded-xl border border-gray-800">
                <input type="checkbox" checked={printSubScript} onChange={(e) => setPrintSubScript(e.target.checked)} className="rounded text-purple-500 focus:ring-purple-500 bg-gray-800 border-gray-700" />
                พิมพ์ข้อมูลสำรอง (Sub-script) ด้วย
              </label>
              <button onClick={handlePrintClick} className="flex items-center px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-md">
                <Printer className="w-4 h-4 mr-2" /> สั่งพิมพ์
              </button>
            </div>
          )}
        </div>

        {viewMode === 'editor' && (
          <div className="space-y-6 animate-in fade-in pb-12 print:hidden">
            {cues.map((cue, index) => (
              <div key={cue.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg relative group">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-4">

                    {/* 🌟 ดึง Component ย่อยมาแสดงตรงนี้ */}
                    <CueSortOrder
                      cue={cue}
                      index={index}
                      totalCues={cues.length}
                      onMove={moveCueSequence}
                      onJump={jumpCueSequence}
                    />

                    <div className="text-gray-300 text-sm font-bold flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-purple-400" /> เริ่ม {cue.start_time}
                    </div>
                  </div>
                  <button onClick={() => deleteCue(cue.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2 bg-gray-950 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-3 space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-1">ชื่อสคริปต์บล็อก (Title)</label>
                      <input type="text" value={cue.title} onChange={(e) => updateCue(cue.id, 'title', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-purple-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">เวลา (นาที)</label>
                        <input type="number" value={cue.duration_minutes} onChange={(e) => updateCue(cue.id, 'duration_minutes', Number(e.target.value))} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-yellow-500 font-bold outline-none focus:border-yellow-500 text-center" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold block mb-1">ผู้พูด (Speaker)</label>
                        <select value={cue.speaker_role} onChange={(e) => updateCue(cue.id, 'speaker_role', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-2 py-2 text-sm text-fuchsia-400 font-bold outline-none focus:border-fuchsia-500">
                          <option value="MC">MC</option><option value="MC1">MC 1</option><option value="MC2">MC 2</option><option value="MC(Both)">MC(Both)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-1">ผู้รับผิดชอบ / ผู้เกี่ยวข้อง</label>
                      <div className="relative">
                        <Users className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input type="text" value={cue.responsible_person || ''} onChange={(e) => updateCue(cue.id, 'responsible_person', e.target.value)} placeholder="เช่น ผู้จัดการเวที" className="w-full bg-black border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-purple-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 font-bold block mb-1">คิวเวที / เทคนิค (Details)</label>
                      <textarea rows={3} value={cue.details} onChange={(e) => updateCue(cue.id, 'details', e.target.value)} placeholder="(เช่น ไฟแสงสว่าง / คิวประธาน)" className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-xs text-cyan-300 outline-none focus:border-cyan-500 resize-none italic custom-scrollbar" />
                    </div>
                  </div>

                  <div className="md:col-span-9 space-y-4 flex flex-col">
                    <div>
                      <label className="text-[10px] text-purple-400 font-bold mb-1 flex items-center bg-purple-950/30 w-fit px-2 py-0.5 rounded"><Mic className="w-3 h-3 mr-1" /> บทพูดหลัก (Main Script)</label>
                      <textarea rows={3} value={cue.main_script} onChange={(e) => updateCue(cue.id, 'main_script', e.target.value)} placeholder="คำกล่าวนำที่ต้องพูดจริง..." className="w-full bg-black border border-purple-900/50 rounded-lg px-4 py-3 text-base text-gray-100 outline-none focus:border-purple-500 resize-none custom-scrollbar leading-relaxed" />
                    </div>
                    <div>
                      <label className="text-[10px] text-orange-400 font-bold mb-1 flex items-center bg-orange-950/30 w-fit px-2 py-0.5 rounded"><AlignLeft className="w-3 h-3 mr-1" /> ข้อมูลสำรอง / ขยายความ (Sub Script)</label>
                      <textarea rows={2} value={cue.sub_script} onChange={(e) => updateCue(cue.id, 'sub_script', e.target.value)} placeholder="หมายเหตุ หรือ ข้อมูลเติมเต็มคั่นเวลา (พูดหรือไม่พูดก็ได้)..." className="w-full bg-gray-950 border border-orange-900/30 rounded-lg px-4 py-3 text-sm text-orange-200/80 outline-none focus:border-orange-500 resize-none custom-scrollbar" />
                    </div>
                    <div className="mt-auto bg-gray-950 p-4 rounded-xl border border-gray-800 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-blue-400 font-bold flex items-center"><ExternalLink className="w-3 h-3 mr-1" /> ลิงก์เอกสารอ้างอิง (URL)</label>
                          <button type="button" onClick={() => updateCue(cue.id, 'reference_url', `/officialeventdashboard/mc-view?event_id=${activeEventId}`)} className="text-[10px] bg-blue-900/40 text-blue-300 hover:bg-blue-600 hover:text-white px-2 py-0.5 rounded border border-blue-700/50 transition-colors flex items-center">
                            <Plus className="w-3 h-3 mr-0.5" /> แทรกหน้ารายชื่อ (MC-View)
                          </button>
                        </div>
                        <input type="text" value={cue.reference_url || ''} onChange={(e) => updateCue(cue.id, 'reference_url', e.target.value)} placeholder="เช่น ลิงก์ Google Docs..." className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-blue-300 outline-none focus:border-blue-500" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-1/3">
                          <label className="text-[10px] text-pink-400 font-bold mb-1 flex items-center"><Video className="w-3 h-3 mr-1" /> สื่อ (Media)</label>
                          <select value={cue.media_type || 'none'} onChange={(e) => updateCue(cue.id, 'media_type', e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-2 text-xs text-pink-400 font-bold outline-none focus:border-pink-500">
                            <option value="none">ไม่มี</option><option value="video">วิดีโอ (VTR)</option><option value="audio">เสียง</option><option value="image">ภาพ</option>
                          </select>
                        </div>
                        <div className="w-2/3">
                          <label className="text-[10px] text-gray-500 font-bold mb-1 block">URL หรือชื่อไฟล์สื่อ</label>
                          <input type="text" value={cue.media_url || ''} onChange={(e) => updateCue(cue.id, 'media_url', e.target.value)} placeholder="ลิงก์ Youtube..." className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-pink-500 disabled:opacity-30" disabled={!cue.media_type || cue.media_type === 'none'} />
                        </div>
                      </div>
                      {cue.media_type && cue.media_type !== 'none' && (
                        <div className="lg:col-span-2">
                          <label className="text-[10px] text-pink-400 font-bold mb-1 flex items-center">หมายเหตุการเปิดสื่อ (Visual/Audio Cue)</label>
                          <input type="text" value={cue.visual_audio_cue || ''} onChange={(e) => updateCue(cue.id, 'visual_audio_cue', e.target.value)} placeholder="เช่น เล่น VTR ทันทีที่ประธานเดินถึงที่นั่ง..." className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-pink-500 italic" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addCue} className="w-full py-5 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 hover:text-purple-400 hover:border-purple-900/50 hover:bg-purple-950/10 transition-all font-bold flex items-center justify-center shadow-lg">
              <Plus className="w-5 h-5 mr-2" /> เพิ่ม Script Block
            </button>
          </div>
        )}

        {viewMode === 'preview' && (
          <div className="flex justify-center print:block pb-12">
            <div className="bg-white text-black shadow-2xl shrink-0 print:shadow-none w-full max-w-[210mm] min-h-[297mm] relative p-[10mm] md:p-[15mm] font-serif" style={{ fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif' }}>
              <div className="text-center border-b-[3px] border-black pb-4 mb-8">
                <h1 className="font-bold leading-tight" style={{ fontSize: '24pt' }}>{scriptTitle}</h1>
              </div>
              <div className="space-y-8">
                {cues.map((cue) => (
                  <div key={cue.id} className="relative pb-6 border-b border-gray-300 print:break-inside-avoid">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-black text-white px-3 py-1 font-bold whitespace-nowrap shrink-0" style={{ fontSize: '16pt', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        {cue.start_time}
                      </div>
                      <div className="bg-blue-600 text-white font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ width: '36px', height: '36px', fontSize: '16pt', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                        {cue.sort_order}
                      </div>
                      <div className="font-bold underline mt-1" style={{ fontSize: '18pt' }}>{cue.title}</div>
                    </div>
                    {(cue.details || cue.responsible_person) && (
                      <div className="mb-3 pl-24 pr-4">
                        <div className="bg-gray-100 p-3 px-4 border-l-4 border-gray-500 text-gray-700 flex flex-col gap-1" style={{ fontSize: '16pt', lineHeight: '1.2' }}>
                          {cue.details && <div className="italic"><span className="font-bold mr-2 text-black">[คิวเวที]:</span> {cue.details}</div>}
                          {cue.responsible_person && <div className="text-gray-600 font-bold" style={{ fontSize: '14pt' }}>ผู้รับผิดชอบ: <span className="font-normal text-gray-700">{cue.responsible_person}</span></div>}
                        </div>
                      </div>
                    )}
                    {cue.media_type && cue.media_type !== 'none' && (
                      <div className="mb-3 pl-24 pr-4">
                        <div className="bg-pink-50 p-2 px-4 border-l-4 border-pink-500 text-pink-900 font-bold flex flex-col gap-1" style={{ fontSize: '16pt', lineHeight: '1.2' }}>
                          <div>[🎬 คิวสื่อ {cue.media_type.toUpperCase()}]: <span className="font-normal italic">{cue.visual_audio_cue || 'เตรียมเปิดสื่อ'}</span></div>
                        </div>
                      </div>
                    )}
                    {cue.main_script && (
                      <div className="pl-6 mb-2">
                        <div className="flex gap-3">
                          <span className="font-bold mt-1 shrink-0 text-purple-900" style={{ fontSize: '18pt' }}>{cue.speaker_role}:</span>
                          <div className="flex-1 font-bold leading-relaxed text-justify" style={{ fontSize: '20pt', lineHeight: '1.4' }}>
                            {cue.main_script.split('\n').map((paragraph, index) => {
                              const trimmedPara = paragraph.trim();
                              if (!trimmedPara) return null;
                              const startsWithQuote = /^["“]/.test(trimmedPara);
                              const formatTextWithComments = (text: string) => {
                                return text.split(/([\(（].*?[\)）])/g).map((part, i) => {
                                  if (/^[\(（].*[\)）]$/.test(part)) return <span key={i} className="italic font-normal text-gray-800" style={{ fontSize: '16pt' }}>{part}</span>;
                                  return <span key={i}>{part}</span>;
                                });
                              };
                              return (
                                <div key={index} className={`flex items-start ${startsWithQuote ? 'gap-3 mb-2' : 'mb-2'}`}>
                                  {startsWithQuote && <div className="bg-blue-600 rounded-full shrink-0 mt-[12px]" style={{ width: '16px', height: '16px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}></div>}
                                  <div className="flex-1">{formatTextWithComments(trimmedPara)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    {printSubScript && cue.sub_script && (
                      <div className="pl-[5.5rem] pr-4 mt-3">
                        <div className="text-gray-600 border border-gray-300 p-3 rounded-lg bg-gray-50" style={{ fontSize: '16pt', lineHeight: '1.3' }}>
                          <span className="font-bold underline mr-2">ข้อมูลสำรอง:</span> {cue.sub_script}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showProAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="bg-gradient-to-r from-fuchsia-900 to-purple-900 p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-black/30 rounded-full flex items-center justify-center mb-4 border-2 border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                <Crown className="w-8 h-8 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">สงวนสิทธิ์เฉพาะสมาชิกระดับ PRO</h3>
              <p className="text-sm text-fuchsia-100/80">การพิมพ์ <strong className="text-white">"สคริปต์พิธีกรงานรัฐพิธี"</strong> สงวนไว้สำหรับผู้ใช้ที่สมัครสมาชิกแบบ Pro เท่านั้น</p>
            </div>
            <div className="p-6 bg-gray-950 space-y-4">
              <div className="flex items-start gap-3 text-xs text-gray-400 bg-gray-900 p-3 rounded-lg border border-gray-800">
                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <p>หมายเหตุ: สิทธิ์นี้ไม่เกี่ยวข้องกับการพิมพ์เอกสารอื่นๆ (เช่น รายชื่อจัดคิวพานพุ่ม) ซึ่งท่านยังสามารถสั่งพิมพ์และใช้งานได้ฟรีตามปกติ</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowProAlert(false)} className="flex-1 py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-colors">ย้อนกลับ</button>
                <button onClick={confirmPrint} className="flex-1 py-2.5 bg-fuchsia-600 text-white rounded-xl font-bold hover:bg-fuchsia-500 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)]">ทดลองพิมพ์ (Dev)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #6b21a8; border-radius: 4px; }
        @media print { @page { size: A4 portrait; margin: 0; } body { background: white !important; } }
      `}} />
    </div>
  );
}

export default function ScriptBuilderPage() {
  return (
    // 🌟 หุ้มด้วย RouteGuard และอนุญาตให้ admin และ mc (พิธีกร) เข้าใช้งานได้
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-cyan-500 flex items-center justify-center font-bold">กำลังโหลดตัวสร้างสคริปต์...</div>}>
      <RouteGuard allowedRoles={['admin', 'mc']}>
        <ScriptBuilderContent />
      </RouteGuard>
    </Suspense>
  );
}