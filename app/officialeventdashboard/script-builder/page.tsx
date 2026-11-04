"use client";

import RouteGuard from '@/components/RouteGuard';
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  Copy, Download, Loader2, X, Calendar,
  ArrowLeft, Printer, Save, Plus, Trash2, CheckCircle,
  Mic, AlignLeft, Clock, MonitorPlay, AlertTriangle, Crown,
  Settings2, Users, ExternalLink, Video, LayoutGrid, HelpCircle,
  ChevronUp, ChevronDown, Building2, MapPin, Sparkles, LayoutTemplate
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
  const eventId = searchParams.get('event_id');
  const source = searchParams.get('source');
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

  // 🌟 State สำหรับเก็บข้อมูล Event เต็มรูปแบบเพื่อแสดงบน Header
  const [eventCategory, setEventCategory] = useState<string>('');
  const [eventFullData, setEventFullData] = useState<any>(null);

  // 🌟 State สำหรับระบบนำเข้าสคริปต์งานเก่า
  const [showImportModal, setShowImportModal] = useState(false);
  const [previousEvents, setPreviousEvents] = useState<any[]>([]);
  const [selectedImportEventId, setSelectedImportEventId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  // 🌟 State สำหรับระบบ Platform Templates (เทมเพลตกลาง)
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [platformTemplates, setPlatformTemplates] = useState<any[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchEventData = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (data) {
        setEventCategory(data.category);
        setEventFullData(data); // 🌟 เก็บข้อมูลทั้งหมดไว้ทำ Sticky Header
      }
    };

    fetchEventData();
  }, [eventId]);

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

  // --- 🌟 Engine: คำนวณเวลาอย่างเดียว ---
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
      setIsPreviewMode(false); // 🌟 ปิดแถบ Preview เมื่อบันทึกสำเร็จ
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

  const moveCueSequence = useCallback((index: number, direction: -1 | 1) => {
    setCues(prevCues => {
      const newCues = [...prevCues];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newCues.length) return prevCues;
      const temp = newCues[index];
      newCues[index] = newCues[targetIndex];
      newCues[targetIndex] = temp;
      return newCues.map((c, i) => ({ ...c, sort_order: i + 1 }));
    });
  }, []);

  const jumpCueSequence = useCallback((id: string, newOrder: number) => {
    setCues(prevCues => {
      const currentIndex = prevCues.findIndex(c => c.id === id);
      if (currentIndex === -1) return prevCues;
      const targetIndex = Math.max(0, Math.min(newOrder - 1, prevCues.length - 1));
      const newCues = [...prevCues];
      const [movedItem] = newCues.splice(currentIndex, 1);
      newCues.splice(targetIndex, 0, movedItem);
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

  // 🌟 ฟังก์ชันดึงรายชื่องานเก่า
  const fetchPreviousEvents = async () => {
    if (!eventCategory) return;
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date')
      .eq('category', eventCategory)
      .neq('id', eventId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error && data) setPreviousEvents(data);
  };

  const handleImportScript = async () => {
    if (!selectedImportEventId) return alert('กรุณาเลือกงานที่ต้องการนำเข้าสคริปต์');
    if (!window.confirm('คำเตือน: การนำเข้าจะเขียนทับสคริปต์ที่คุณกำลังร่างอยู่ปัจจุบัน คุณแน่ใจหรือไม่?')) return;

    setIsImporting(true);
    try {
      // ดึงสคริปต์จาก event_agenda_items ของงานเก่า
      const { data: oldCues, error: fetchErr } = await supabase
        .from('event_agenda_items')
        .select('*')
        .eq('event_id', selectedImportEventId)
        .order('sort_order', { ascending: true });

      if (fetchErr || !oldCues || oldCues.length === 0) {
        throw new Error('ไม่พบข้อมูลสคริปต์ในงานที่เลือก หรือสคริปต์ว่างเปล่า');
      }

      // ลบของเก่าในงานนี้ก่อน แล้ว Insert ชุดใหม่เข้าไป
      await supabase.from('event_agenda_items').delete().eq('event_id', eventId);
      
      const newPayload = oldCues.map((c) => {
        const { id, event_id, created_at, ...rest } = c;
        return { ...rest, event_id: eventId };
      });
      await supabase.from('event_agenda_items').insert(newPayload);

      alert('✅ นำเข้าสคริปต์สำเร็จ!');
      setShowImportModal(false);
      window.location.reload();

    } catch (error: any) {
      alert(`❌ ไม่สามารถนำเข้าได้: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // 🌟 3. ฟังก์ชันดึงเทมเพลตแพลตฟอร์ม
  const fetchPlatformTemplates = async () => {
    if (!eventCategory) return;
    const { data, error } = await supabase
      .from('script_templates')
      .select('id, title, category, content_chunks')
      .eq('category', eventCategory)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPlatformTemplates(data);
    }
  };

  // 🌟 4. ฟังก์ชันพรีวิวเทมเพลตขึ้นจอ (ยังไม่เซฟ)
  const handlePreviewTemplate = (templateChunks: any[]) => {
    if (cues.length > 0 && cues[0].main_script !== '' && !window.confirm('สคริปต์เดิมบนหน้าจอจะถูกแทนที่ชั่วคราว ต้องการดูตัวอย่างเทมเพลตนี้หรือไม่?')) {
      return;
    }
    
    if (templateChunks && Array.isArray(templateChunks)) {
      // สร้าง id ใหม่จำลองให้คิวที่ดึงมา
      const previewCues = templateChunks.map((c: any, index: number) => ({
        ...c,
        id: crypto.randomUUID(),
        sort_order: index + 1
      }));
      setCues(previewCues);
      setIsPreviewMode(true);
      setShowTemplateModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans print:bg-white print:text-black relative">

      <ScriptBuilderManualDrawer isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      {/* 🌟 ปรับปรุง Header ให้แสดงข้อมูล Event */}
      <header className="bg-gray-900 border-b border-purple-900/50 sticky top-0 z-40 shadow-md print:hidden flex flex-col justify-center min-h-[5rem] py-3">
        <div className="max-w-[1400px] w-full mx-auto px-4 md:px-6 flex flex-col gap-2">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {source === 'dashboard' && (
                <Link
                  href={`/events/event-dashboard/${eventId}`}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 font-bold text-sm"
                >
                  <LayoutGrid className="w-4 h-4" />
                  กลับหน้าศูนย์กลาง
                </Link>
              )}
              {source !== 'dashboard' && (
                <Link
                  href={`/officialeventdashboard/hub?event_id=${eventId}`}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              )}
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

          {/* 🌟 แสดงข้อมูล Event แถวล่างของ Header */}
          {eventFullData && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-1 sm:pl-[4.5rem] text-xs text-gray-400">
              <span className="font-bold text-purple-300 text-sm flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> {eventFullData.title}</span>
              {eventFullData.event_date && (
                <span className="flex items-center gap-1.5 bg-gray-800/50 px-2 py-0.5 rounded-md"><Calendar className="w-3.5 h-3.5 text-blue-400"/> {new Date(eventFullData.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              )}
              {eventFullData.brand_name && (
                <span className="flex items-center gap-1.5 bg-gray-800/50 px-2 py-0.5 rounded-md"><Building2 className="w-3.5 h-3.5 text-yellow-400"/> {eventFullData.brand_name}</span>
              )}
              {eventFullData.location_hotel && (
                <span className="flex items-center gap-1.5 bg-gray-800/50 px-2 py-0.5 rounded-md"><MapPin className="w-3.5 h-3.5 text-amber-500"/> {eventFullData.location_hotel}</span>
              )}
            </div>
          )}

        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 print:p-0 print:m-0 z-10 relative">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
          <div className="flex flex-wrap bg-black p-1 rounded-xl border border-gray-800 w-full md:w-auto gap-1">
            <button onClick={() => setViewMode('editor')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${viewMode === 'editor' ? 'bg-purple-900 text-white shadow-md' : 'text-gray-500 hover:text-white'}`}>
              <Settings2 className="w-4 h-4 mr-2" /> โหมดแก้ไขสคริปต์
            </button>
            <button onClick={() => setViewMode('preview')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center ${viewMode === 'preview' ? 'bg-gray-200 text-black shadow-md' : 'text-gray-500 hover:text-white'}`}>
              <Printer className="w-4 h-4 mr-2" /> ตัวอย่างก่อนพิมพ์
            </button>
            
            {/* 🌟 ปุ่มเลือก Template กลางระบบ */}
            <button
              onClick={() => {
                fetchPlatformTemplates();
                setShowTemplateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg transition-colors text-sm font-bold shadow-lg"
            >
              <LayoutTemplate size={16} /> เลือกเทมเพลตระบบ
            </button>

            <button
              onClick={() => {
                fetchPreviousEvents();
                setShowImportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg transition-colors text-sm font-bold shadow-lg"
            >
              <Copy size={16} /> นำเข้าจากงานเก่า
            </button>
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

        {/* 🌟 แถบแจ้งเตือน Preview Mode */}
        {isPreviewMode && viewMode === 'editor' && (
          <div className="bg-amber-500/20 border border-amber-500 text-amber-400 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start sm:items-center gap-2">
              <Sparkles className="w-5 h-5 animate-pulse shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-sm block sm:inline">โหมดดูตัวอย่างเทมเพลต (Preview Mode)</span>
                <span className="text-xs text-amber-200/80 sm:ml-2 block sm:inline mt-1 sm:mt-0">ข้อมูลยังไม่ถูกบันทึก คุณสามารถปรับแก้และกดปุ่ม "บันทึกข้อมูล" ด้านบนเพื่อยืนยันการใช้งานจริง</span>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="text-xs font-bold bg-black/40 hover:bg-black/60 px-4 py-2 rounded-lg border border-amber-500/50 transition-colors shrink-0"
            >
              ยกเลิก / ใช้ข้อมูลเดิม
            </button>
          </div>
        )}

        {viewMode === 'editor' && (
          <div className="space-y-6 animate-in fade-in pb-12 print:hidden">
            {cues.map((cue, index) => (
              <div key={cue.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg relative group">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-4">
                    <CueSortOrder cue={cue} index={index} totalCues={cues.length} onMove={moveCueSequence} onJump={jumpCueSequence} />
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

      {/* ================= MODAL นำเข้าสคริปต์จากระบบ (Platform Templates) ================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0A1326] border border-amber-500/30 rounded-3xl p-6 w-full max-w-lg shadow-[0_0_40px_rgba(245,158,11,0.15)] flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <LayoutTemplate className="text-amber-400" /> เลือกเทมเพลตระบบ
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                เลือกโครงสร้างสคริปต์สำเร็จรูปในหมวด <span className="text-amber-400 font-bold">"{eventCategory}"</span> เพื่อนำมาเป็นโครงตั้งต้นในการเขียน (ข้อมูลจะโหลดเข้าหน้าจอเพื่อให้ดูตัวอย่างก่อน)
              </p>
              {platformTemplates.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 bg-black/30 rounded-xl border border-white/5">
                  ระบบยังไม่มีเทมเพลตสำหรับงานหมวดหมู่นี้
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                  {platformTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => handlePreviewTemplate(tpl.content_chunks)}
                      className="p-4 rounded-xl border border-white/10 cursor-pointer bg-zinc-900 hover:border-amber-500/50 hover:bg-zinc-800 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-full bg-amber-500/10 text-amber-400">
                        <Sparkles size={14} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-amber-300 line-clamp-1">{tpl.title || 'เทมเพลตสคริปต์'}</h4>
                        <p className="text-xs text-zinc-500 mt-1">กดเพื่อดูตัวอย่างบนหน้าจอ</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors text-sm"
              >
                ยกเลิกปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL นำเข้าสคริปต์เก่าจากงานอื่น ================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#0A1326] border border-blue-500/30 rounded-3xl p-6 w-full max-w-lg shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="font-black text-xl text-white flex items-center gap-2">
                <Download className="text-blue-400" /> นำเข้าสคริปต์จากงานเก่า
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                เลือกร่างสคริปต์จากงาน <span className="text-blue-400 font-bold">"{eventCategory}"</span> ที่คุณเคยสร้างไว้ เพื่อเขียนทับโครงสร้างเดิมทั้งหมด
              </p>
              {previousEvents.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 bg-black/30 rounded-xl border border-white/5">
                  ไม่พบประวัติงานเก่าในหมวดหมู่นี้
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
                  {previousEvents.map((evt) => (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedImportEventId(evt.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${selectedImportEventId === evt.id
                          ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                          : 'bg-zinc-900 border-white/10 hover:border-blue-500/50 hover:bg-zinc-800'
                        }`}
                    >
                      <div className={`p-2 rounded-full ${selectedImportEventId === evt.id ? 'bg-blue-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Copy size={14} />
                      </div>
                      <div>
                        <h4 className={`font-bold text-sm ${selectedImportEventId === evt.id ? 'text-blue-300' : 'text-white'} line-clamp-1`}>
                          {evt.title || 'ไม่ระบุชื่องาน'}
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <Calendar size={12} />
                          {evt.event_date ? new Date(evt.event_date).toLocaleDateString('th-TH') : 'ไม่มีวันที่'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10 mt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleImportScript}
                disabled={!selectedImportEventId || isImporting}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                ยืนยันการนำเข้า
              </button>
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
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-cyan-500 flex items-center justify-center font-bold">กำลังโหลดตัวสร้างสคริปต์...</div>}>
      <RouteGuard allowedRoles={['admin', 'mc']}>
        <ScriptBuilderContent />
      </RouteGuard>
    </Suspense>
  );
}