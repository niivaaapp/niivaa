"use client";

import { useState, useEffect, useRef, Suspense  } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Play, Pause, ArrowLeft, Send, MessageSquare, CheckCircle, AlertCircle, X, HelpCircle, Camera, Loader2, Image as ImageIcon } from 'lucide-react';

interface AgendaItem {
  id: string;
  title: string;
  duration_minutes: number;
  sort_order: number;
  is_live_now: boolean;
  start_time?: string;
  sub_script?: string;
  responsible_person?: string;
  target_depts?: string[];
  sm_readiness_state: Record<string, string>;
  updated_at?: string;
}

interface TimeSegment { type: 'run' | 'pause'; durationMs: number; }

const QUICK_ALERTS = [
  { id: 1, short: "เร่งพิธี", text: "⚠️ พิธีการล่าช้า ขอให้กระชับเวลาช่วงนี้", color: "from-red-950 to-zinc-900 border-red-500/30" },
  { id: 2, short: "สลับคิว", text: "🔄 มีการสลับคิวฉุกเฉิน โปรดเช็คสคริปต์", color: "from-teal-950 to-zinc-900 border-teal-500/30" },
  { id: 3, text: "⏳ รอประธาน กล่าวคั่นเวลาเดดแอร์", short: "รอประธาน", color: "from-blue-950 to-zinc-900 border-blue-500/30" },
  { id: 4, text: "🖼️ เตรียมสไลด์ VIP ขึ้นจอทันที", short: "วิชวล VIP", color: "from-purple-950 to-zinc-900 border-purple-500/30" }
];

const DEPARTMENTS = [
  { key: 'speaker_hub', label: 'วิทยากร' },
  { key: 'emcee_script', label: 'พิธีกร' },
  { key: 'vip_reception', label: 'VIP' },
  { key: 'audio_media', label: 'เสียง/สื่อ' },
  { key: 'venue_tab', label: 'สถานที่' },
  { key: 'photo_tab', label: 'ถ่ายภาพ' }
];

function StageManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [time, setTime] = useState(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);

  // --- [STATES แผงข้อความ SM ไปยังลูกข่าย (Intercom กล่องขวาล่าง)] ---
  const [customAlertText, setCustomAlertText] = useState('');
  const [isIntercomOpen, setIsIntercomOpen] = useState(false);
  const [smUploadFile, setSmUploadFile] = useState<File | null>(null);
  const [isSmUploading, setIsSmUploading] = useState(false);

  // --- [STATES ระบบเวลาและ Progress] ---
  const [runStatus, setRunStatus] = useState<'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED'>('IDLE');
  const [overallProgressPercent, setOverallProgressPercent] = useState(0);
  const [timeSegments, setTimeSegments] = useState<TimeSegment[]>([]);
  const [totalEventDurationMs, setTotalEventDurationMs] = useState(1);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // --- [STATES ระบบรับคำขอด่วนจาก MC (แบนเนอร์ด้านบน)] ---
  const [mcHelpRequestMsg, setMcHelpRequestMsg] = useState<string>('');
  const [mcHelpRequestImage, setMcHelpRequestImage] = useState<string>('');
  const [mcReplyText, setMcReplyText] = useState<string>('');
  const [mcReplyFile, setMcReplyFile] = useState<File | null>(null);
  const [isReplyingUpload, setIsReplyingUpload] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAgendaData = async () => {
    const { data } = await supabase.from('event_agenda_items').select('*').order('sort_order', { ascending: true });
    if (data) {
      const now = new Date();
      const filtered = data.filter((item: any) => {
        if (item.is_live_now && item.updated_at) {
          const minsPassed = (now.getTime() - new Date(item.updated_at).getTime()) / 60000;
          if (minsPassed > Number(item.duration_minutes || 5) + 2) return false;
        }
        return true;
      });
      setAgendaItems(filtered);
      setTotalEventDurationMs(filtered.reduce((sum, i) => sum + Number(i.duration_minutes || 5), 0) * 60000);
    }
  };

  useEffect(() => {
    fetchAgendaData();
    const sub = supabase.channel('sm_live_box_stream').on('postgres_changes', { event: '*', schema: 'public', table: 'event_agenda_items' }, fetchAgendaData).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // ดักฟังข้อความและรูปภาพจาก MC
  useEffect(() => {
    const fetchScreen = async () => {
      const { data } = await supabase.from('screen_state').select('mc_help_request, mc_help_image').eq('id', 'current').single();
      if (data) {
        setMcHelpRequestMsg(data.mc_help_request || '');
        setMcHelpRequestImage(data.mc_help_image || '');
      }
    };
    fetchScreen();

    const sub = supabase.channel('sm_screen_state').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' }, (payload: any) => {
      if (payload.new) {
        setMcHelpRequestMsg(payload.new.mc_help_request || '');
        setMcHelpRequestImage(payload.new.mc_help_image || '');
      }
    }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // [ระบบ Progress Bar]
  useEffect(() => {
    if (runStatus === 'IDLE' || runStatus === 'FINISHED') return;
    lastUpdateTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const delta = Date.now() - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = Date.now();
      setTimeSegments(prev => {
        const updated = [...prev];
        const type = runStatus === 'RUNNING' ? 'run' : 'pause';
        if (updated.length > 0 && updated[updated.length - 1].type === type) updated[updated.length - 1].durationMs += delta;
        else updated.push({ type, durationMs: delta });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [runStatus]);

  useEffect(() => {
    const totalMs = timeSegments.reduce((sum, seg) => sum + seg.durationMs, 0);
    setOverallProgressPercent(Math.min((totalMs / Math.max(totalEventDurationMs, totalMs)) * 100, 100));
  }, [timeSegments, totalEventDurationMs]);

  const handleToggleShowRun = () => setRunStatus(prev => prev === 'RUNNING' ? 'PAUSED' : 'RUNNING');
  const handleFinishEvent = () => { if (confirm('ปิดฉากคิวรันงานพิธีการทั้งหมด?')) { setRunStatus('FINISHED'); setOverallProgressPercent(100); } };

  const handleTriggerReadyCheck = async (item: AgendaItem) => {
    const targetKeys = item.target_depts?.length ? item.target_depts : DEPARTMENTS.map(d => d.key);
    const newState = { ...(item.sm_readiness_state || {}) };
    targetKeys.forEach(k => { newState[k] = 'red'; });
    setAgendaItems(prev => prev.map(a => a.id === item.id ? { ...a, sm_readiness_state: newState } : a));
    await supabase.from('event_agenda_items').update({ sm_readiness_state: newState }).eq('id', item.id);
  };

  const handleToggleDepartmentStatus = async (item: AgendaItem, deptKey: string) => {
    const currentState = { ...(item.sm_readiness_state || {}) };
    const cv = currentState[deptKey] || 'gray';
    currentState[deptKey] = cv === 'gray' ? 'red' : cv === 'red' ? 'yellow' : cv === 'yellow' ? 'green' : 'gray';
    setAgendaItems(prev => prev.map(a => a.id === item.id ? { ...a, sm_readiness_state: currentState } : a));
    await supabase.from('event_agenda_items').update({ sm_readiness_state: currentState }).eq('id', item.id);
  };

  // 📸 ฟังก์ชันอัปโหลดรูปขึ้น Bucket intercom-media
  const uploadImageToStorage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;
    const { error } = await supabase.storage.from('intercom-media').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('intercom-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ⚡ SM ยิงข้อความ/รูป ด่วนไปยังลูกข่ายทั้งหมด (Floating Intercom ขวาล่าง)
  const handleSendUrgentIntercom = async (text: string) => {
    if (!text.trim() && !smUploadFile) return;
    setIsSmUploading(true);
    try {
      let imageUrl = '';
      if (smUploadFile) imageUrl = await uploadImageToStorage(smUploadFile, 'sm_alerts');

      await supabase.from('screen_state').update({
        sm_intercom_msg: text,
        sm_intercom_image: imageUrl,
        updated_at: new Date().toISOString()
      }).eq('id', 'current');

      setCustomAlertText('');
      setSmUploadFile(null);
      setIsIntercomOpen(false); // พับเก็บแผง
      alert('🚀 ส่งประกาศด่วนพร้อมภาพสำเร็จ!');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดภาพ');
    }
    setIsSmUploading(false);
  };

  // 💡 SM ตอบกลับ MC ลงโพย (แบนเนอร์ด้านบน)
  const handleReplyToMc = async () => {
    if (!mcReplyText.trim() && !mcReplyFile) return;
    setIsReplyingUpload(true);
    try {
      const liveItem = agendaItems.find(i => i.is_live_now);
      if (liveItem) {
        let imageUrl = '';
        if (mcReplyFile) imageUrl = await uploadImageToStorage(mcReplyFile, 'sm_replies');

        let appendText = `\n📌 [SM ตอบกลับด่วน]: ${mcReplyText}`;
        if (imageUrl) appendText += `\n📷 [ดูภาพแนบ]: ${imageUrl}`;

        const updatedSubScript = (liveItem.sub_script || '') + appendText;
        await supabase.from('event_agenda_items').update({ sub_script: updatedSubScript.trim() }).eq('id', liveItem.id);
      }

      await supabase.from('screen_state').update({ mc_help_request: '', mc_help_image: '' }).eq('id', 'current');
      setMcHelpRequestMsg(''); setMcHelpRequestImage('');
      setMcReplyText(''); setMcReplyFile(null);
      alert('✅ ตอบกลับลงโพยสำเร็จ!');
    } catch (err) {
      alert('อัปโหลดรูปภาพล้มเหลว');
    }
    setIsReplyingUpload(false);
  };

  const handleClearMcHelp = async () => {
    await supabase.from('screen_state').update({ mc_help_request: '', mc_help_image: '' }).eq('id', 'current');
    setMcHelpRequestMsg(''); setMcHelpRequestImage('');
  };

  const handleSetLiveCue = async (id: string) => {
    await supabase.from('event_agenda_items').update({ is_live_now: false }).neq('id', id);
    await supabase.from('event_agenda_items').update({ is_live_now: true, updated_at: new Date().toISOString() }).eq('id', id);
  };

  const currentLiveIndex = agendaItems.findIndex(i => i.is_live_now);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans flex flex-col gap-4 select-none overflow-x-hidden relative">

      {/* 🚨 แบนเนอร์รับคำขอ+รูปภาพจาก MC (ส่วนบน) */}
      {(mcHelpRequestMsg || mcHelpRequestImage) && (
        <div className="fixed top-4 left-4 right-4 z-[9999] bg-gradient-to-r from-cyan-800 via-blue-900 to-indigo-900 border-2 border-cyan-400 text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(6,182,212,0.5)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in slide-in-from-top-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
            <div className="p-2 bg-black/30 rounded-xl text-cyan-400 animate-bounce shrink-0 self-start"><HelpCircle size={24} /></div>
            <div className="min-w-0 flex-1">
              <span className="bg-cyan-400 text-black font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider animate-pulse">🙋‍♂️ คำขอด่วนจากพิธีกร (MC)</span>
              {mcHelpRequestMsg && <p className="text-sm md:text-base font-black tracking-wide text-white mt-1 break-words">{mcHelpRequestMsg}</p>}
              {mcHelpRequestImage && (
                <a href={mcHelpRequestImage} target="_blank" rel="noreferrer">
                  <img src={mcHelpRequestImage} alt="MC Image" className="mt-2 max-h-32 rounded-lg border-2 border-cyan-400/50 shadow-md cursor-pointer hover:opacity-80 transition-opacity" />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0 items-center">
            <input type="text" value={mcReplyText} onChange={e => setMcReplyText(e.target.value)} placeholder="พิมพ์ตอบกลับแทรกโพย..." className="bg-black/50 border border-cyan-400/50 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-300 w-full md:w-56" />

            {/* 📸 ปุ่มแนบรูปตอบกลับจาก SM ไปลงโพย */}
            <label className="bg-black/30 hover:bg-black/50 border border-cyan-400/30 text-cyan-400 px-3 py-2 rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-md">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setMcReplyFile(e.target.files?.[0] || null)} />
              {mcReplyFile ? <ImageIcon size={16} className="text-emerald-400" /> : <Camera size={16} />}
            </label>

            <button onClick={handleReplyToMc} disabled={isReplyingUpload} className="bg-cyan-500 hover:bg-cyan-400 text-black font-black px-4 py-2 rounded-xl text-xs shadow-md flex items-center gap-1 w-[120px] justify-center">
              {isReplyingUpload ? <Loader2 size={14} className="animate-spin" /> : 'ตอบกลับลงโพย'}
            </button>
            <button onClick={handleClearMcHelp} className="bg-black/30 hover:bg-black/50 px-3 py-2 rounded-xl font-bold text-xs transition-colors border border-white/10">❌ ปิด</button>
          </div>
        </div>
      )}

      {/* 🌟 STICKY PANEL */}
      <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-md border-b border-white/5 pb-4 space-y-4 shadow-2xl">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 shadow-inner">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${runStatus === 'RUNNING' ? 'bg-emerald-400 animate-ping' : runStatus === 'PAUSED' ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`}></span>
              <span className="text-[11px] font-black text-zinc-400 tracking-wider uppercase">NiiVaa Multi-Segment Timeline Track</span>
            </div>
            <div className="text-right flex items-baseline gap-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">พิธีการสะสม:</span>
              <span className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{overallProgressPercent.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full h-7 bg-black/50 rounded-full overflow-hidden p-0.5 border border-white/10 flex items-center relative shadow-inner">
            {timeSegments.map((seg, sIdx) => {
              const totalMs = timeSegments.reduce((sum, s) => sum + s.durationMs, 0);
              const segmentWidth = (seg.durationMs / Math.max(totalEventDurationMs, totalMs)) * 100;
              return (
                <div key={sIdx} style={{ width: `${segmentWidth}%` }} className={`h-full transition-all duration-300 ease-linear ${seg.type === 'run' ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 border-r border-black/20 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-yellow-500 to-amber-500 border-r border-black/20 shadow-[0_0_8px_rgba(234,179,8,0.3)]'}`} />
              );
            })}
            <div className="absolute inset-0 flex items-center w-full px-2 pointer-events-none">
              {agendaItems.map((item, idx) => {
                const stepPercent = ((idx + 1) / agendaItems.length) * 100;
                if (overallProgressPercent < stepPercent) return null;
                return (<span key={item.id} className="absolute font-black text-[9px] bg-black/60 px-1 rounded text-white border border-white/5" style={{ left: `${stepPercent - 3}%` }}>#{idx + 1}</span>);
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center bg-zinc-900/60 p-3 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white"><ArrowLeft size={16} /></button>
            <div>
              <h1 className="text-sm font-black text-white">แผงผู้บัญชาการ SM ระบบรวมศูนย์ควบคุมความพร้อม</h1>
              <p className="text-cyan-400 font-mono text-[11px] mt-0.5">เวลาหน้างาน: {time.toLocaleTimeString('th-TH')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleToggleShowRun} className={`px-6 py-2.5 rounded-xl font-black text-xs border shadow-md ${runStatus === 'RUNNING' ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-gradient-to-b from-emerald-500 to-teal-600 border-emerald-400 text-white'}`}>
              {runStatus === 'RUNNING' ? <><Pause size={13} className="inline mr-1" /> PAUSE</> : <><Play size={13} className="inline mr-1" /> SHOW RUN</>}
            </button>
            <button onClick={handleFinishEvent} className="px-4 py-2.5 bg-red-900/40 border border-red-800 text-red-200 text-xs font-black rounded-xl">🏁 FINISH EVENT</button>
            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 object-contain" />
          </div>
        </div>
      </div>

      <div className="px-3 space-y-3 flex-1 pb-20">
        {agendaItems.map((item, idx) => {
          const isCurrent = currentLiveIndex === idx;
          const isPast = currentLiveIndex !== -1 && idx < currentLiveIndex;
          const lights = item.sm_readiness_state || {};
          const targetKeys = item.target_depts?.length ? item.target_depts : DEPARTMENTS.map(d => d.key);
          const isAllGreen = targetKeys.length > 0 && targetKeys.every(k => lights[k] === 'green');
          const isAnyPending = targetKeys.some(k => lights[k] === 'red' || lights[k] === 'yellow');

          return (
            <div key={item.id} className={`p-4 rounded-3xl border transition-all duration-300 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 ${isPast ? "bg-zinc-950 border-zinc-900/60 opacity-40 grayscale" : isCurrent ? "bg-purple-950/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)]" : "bg-zinc-900 border-white/5"}`}>
              <div className="min-w-[240px] flex-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSetLiveCue(item.id)} className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all ${isCurrent ? 'bg-purple-600 border-purple-400 text-white animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
                    {isCurrent ? '▶ ON AIR' : `CUE #${idx + 1}`}
                  </button>
                  <span className="font-mono font-bold text-zinc-400 text-[11px]">{item.start_time || '00:00'} ({item.duration_minutes || 5}m)</span>
                </div>
                <h3 className={`text-sm font-black mt-2 ${isCurrent ? 'text-purple-400' : 'text-zinc-200'}`}>{item.title}</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-black/40 p-2 rounded-2xl border border-white/5 shrink-0 w-full xl:w-auto">
                {targetKeys.map((deptKey) => {
                  const stateColor = lights[deptKey] || 'gray';
                  const label = DEPARTMENTS.find(d => d.key === deptKey)?.label || deptKey;
                  return (
                    <button key={deptKey} onClick={() => handleToggleDepartmentStatus(item, deptKey)} className={`w-[65px] h-[46px] rounded-xl border text-[9px] flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${stateColor === 'red' ? 'bg-red-600 border-red-300 text-white animate-pulse' : stateColor === 'yellow' ? 'bg-yellow-500 border-yellow-300 text-black' : stateColor === 'green' ? 'bg-emerald-500 border-emerald-300 text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                      {stateColor === 'green' ? <CheckCircle size={12} /> : stateColor === 'yellow' ? <AlertCircle size={12} /> : null}
                      <span className="truncate w-full px-1">{label}</span>
                    </button>
                  );
                })}
                <div className="w-px h-8 bg-zinc-800 mx-1.5 self-center"></div>
                <button onClick={() => handleTriggerReadyCheck(item)} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${isAllGreen ? 'bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-700' : isAnyPending ? 'bg-red-900/60 border-red-500 text-red-300 animate-pulse' : 'bg-purple-950/40 border-purple-500/40 text-purple-300 hover:bg-purple-900/60'}`}>
                  {isAllGreen ? '✅ พร้อม' : isAnyPending ? '🚨 รอ...' : '🚨 เรียกตรวจ'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🎛️ FLOATING INTERCOM (SM ไปลูกข่าย - อัปเกรดมีแนบรูป) */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
        {isIntercomOpen && (
          <div className="mb-3 w-[320px] bg-zinc-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare size={12} /> ประกาศด่วนลงทุกจอ</span>
              <button onClick={() => setIsIntercomOpen(false)} className="text-zinc-600 hover:text-white"><X size={14} /></button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_ALERTS.map(msg => (
                <button key={msg.id} onClick={() => handleSendUrgentIntercom(msg.text)} className={`bg-gradient-to-br ${msg.color} p-2.5 rounded-xl border text-left flex flex-col h-14 justify-between transition-all active:scale-95`}>
                  <span className="text-[8px] font-mono text-white/50 font-bold">MSG #{msg.id}</span>
                  <span className="text-[10px] font-black text-white truncate w-full">{msg.short}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-900 flex flex-col gap-2">
              {/* พรีวิวรูปภาพของ SM ก่อนประกาศลงบอร์ด */}
              {smUploadFile && (
                <div className="relative w-fit">
                  <img src={URL.createObjectURL(smUploadFile)} alt="Preview" className="h-16 rounded-lg border border-cyan-500/50 object-cover" />
                  <button onClick={() => setSmUploadFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                </div>
              )}

              <div className="flex gap-1.5">
                <input type="text" value={customAlertText} onChange={e => setCustomAlertText(e.target.value)} placeholder="พิมพ์ข้อความ..." className="flex-1 bg-black border border-zinc-800 px-3 py-1.5 text-[10px] rounded-lg outline-none focus:border-cyan-500 text-white font-bold" />

                {/* 📸 ปุ่มเปิดกล้อง/แนบรูป (Floating Intercom) */}
                <label className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-cyan-400 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all flex items-center justify-center shadow-md">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setSmUploadFile(e.target.files?.[0] || null)} />
                  <Camera size={14} />
                </label>

                <button onClick={() => handleSendUrgentIntercom(customAlertText)} disabled={isSmUploading} className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold px-3 rounded-lg transition-all flex items-center justify-center w-12 shadow-md">
                  {isSmUploading ? <Loader2 size={12} className="animate-spin" /> : 'ส่ง'}
                </button>
              </div>
            </div>
          </div>
        )}
        <button onClick={() => setIsIntercomOpen(!isIntercomOpen)} className={`w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-cyan-400 shadow-lg transition-all active:scale-95 backdrop-blur-md ${isIntercomOpen ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900/80 hover:bg-zinc-800'}`} title="แผงประกาศด่วน">
          {isIntercomOpen ? <X size={20} /> : <MessageSquare size={20} />}
        </button>
      </div>

    </div>
  );
}
// 3. เพิ่มฟังก์ชันนี้ไปที่บรรทัดสุดท้ายของไฟล์เพื่อเป็นตัวเปิดหลัก
export default function StageManagerMasterDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-500">Loading Dashboard...</div>}>
      <StageManagerContent />
    </Suspense>
  );
}