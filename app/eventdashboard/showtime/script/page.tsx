"use client";
import RouteGuard from '@/components/RouteGuard';
import Link from 'next/link';
import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Mic, Clock, ArrowLeft, ToggleLeft, ToggleRight, AlertTriangle,
  Send, Save, MessageSquare, X, MonitorPlay, Mic2, Users, LayoutGrid, BookOpen, ChevronDown
} from 'lucide-react';

interface AgendaItem {
  id: string;
  title: string;
  duration_minutes: number;
  sort_order: number;
  is_live_now: boolean;
  start_time?: string;
  main_script?: string;
  sub_script?: string;
  speaker_role?: string;
  responsible_person?: string;
}

type IncomingMsg = {
  id: string;
  time: string;
  text: string;
  isShowingOnMarquee: boolean;
};

function EmceeShowtimeScriptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  // ==========================================
  // 🌟 STATES
  // ==========================================
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [currentLiveItem, setCurrentLiveItem] = useState<AgendaItem | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);

  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState(new Date());

  const [readParagraphs, setReadParagraphs] = useState<Record<string, boolean>>({});
  const [editMainScript, setEditMainScript] = useState<string>('');
  const [editSubScript, setEditSubScript] = useState<string>('');
  const [textScale, setTextScale] = useState<number>(1.0);

  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [incomingMessages, setIncomingMessages] = useState<IncomingMsg[]>([]);
  const [urgentSms, setUrgentSms] = useState<{ text: string, sender: string } | null>(null);
  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);

  const [showSosModal, setShowSosModal] = useState(false);
  const [sosText, setSosText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [quickSosMessages, setQuickSosMessages] = useState([
    "มีข้อมูลอัปเดตไหม?", "ขอเวลาเตรียมตัว 2 นาที", "ไมโครโฟนมีปัญหา", "ข้ามคิวถัดไปเลยไหม?"
  ]);

  const [isGuideOpen, setIsGuideOpen] = useState(false); // 🌟 State คู่มือ
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  // ==========================================
  // 🌟 EFFECTS & DATA FETCHING
  // ==========================================
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchEventData = async () => {
    try {
      let actualEventId = eventId;
      if (eventId === 'current') {
        const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(1).single();
        if (data) { setEventData(data); setActiveEventId(data.id); actualEventId = data.id; }
      } else {
        const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (data) { setEventData(data); setActiveEventId(data.id); }
      }
    } catch (err) { console.error(err); }
  };

  // 🌟 แก้ไข: บังคับกรองเฉพาะ Event ID ของงานนี้
  const fetchScriptData = async (forceEventId?: string) => {
    const targetId = forceEventId || activeEventId;
    if (!targetId) return;

    const { data, error } = await supabase
      .from('event_agenda_items')
      .select('*')
      .eq('event_id', targetId) // 👈 กรองแยกงานเด็ดขาด
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setAgendaItems(data);
      if (isRealtimeActive) {
        const liveItem = data.find((item) => item.is_live_now === true) || data[0] || null;
        setCurrentLiveItem(liveItem);
        if (liveItem) {
          setEditMainScript(liveItem.main_script || '');
          setEditSubScript(liveItem.sub_script || '');
        }
      }
    }
  };

  useEffect(() => { fetchEventData(); }, [eventId]);

  useEffect(() => {
    if (!activeEventId) return;
    fetchScriptData(activeEventId);

    const realtimeChannel = supabase.channel(`script_stream_${activeEventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_agenda_items', filter: `event_id=eq.${activeEventId}` }, () => { fetchScriptData(activeEventId); })
      .subscribe();

    const smsChannel = supabase.channel(`receive-sms-script-${activeEventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${activeEventId}` },
        (payload) => {
          const newMsg = payload.new;
          const isFromSM = newMsg.sender_role === 'sm' || newMsg.sender_role === 'admin';
          const isForScript = !newMsg.target_screen || ['all', 'mc_script', 'mc_script_edit'].includes(newMsg.target_screen);

          if (isFromSM && isForScript) {
            const finalMessage = newMsg.message_text || "ไม่มีข้อความ";
            const finalSender = newMsg.sender_name || "ศูนย์อำนวยการ";
            const timeStr = new Date(newMsg.created_at || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            setUrgentSms({ text: finalMessage, sender: finalSender });
            setUrgentIntercomMsg(finalMessage);
            setShowUrgentBanner(true);

            setIncomingMessages(prev => [{
              id: newMsg.id || Date.now().toString(),
              time: timeStr, text: finalMessage, isShowingOnMarquee: true
            }, ...prev]);
            setIsInboxOpen(true);
          }
        }).subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(smsChannel);
    };
  }, [activeEventId, isRealtimeActive]);

  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLiveItem, isRealtimeActive]);

  // ==========================================
  // 🌟 PRESENTER CLICKER CONTROL (รีโมทเลื่อนคิว)
  // ==========================================
  useEffect(() => {
    // รีโมทจะทำงานเฉพาะเมื่อปิด Realtime (โหมด Review/Edit) และไม่มี Modal อื่นเปิดบังอยู่
    if (isRealtimeActive || showSosModal || isInboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ดักจับเฉพาะปุ่มที่ Clicker มักใช้ และปุ่มลูกศร
      if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        setCurrentLiveItem(prev => {
          if (!prev) return agendaItems[0] || null;
          const currentIndex = agendaItems.findIndex(item => item.id === prev.id);
          const nextItem = agendaItems[Math.min(currentIndex + 1, agendaItems.length - 1)];
          setEditMainScript(nextItem.main_script || '');
          setEditSubScript(nextItem.sub_script || '');
          return nextItem;
        });
      } else if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        setCurrentLiveItem(prev => {
          if (!prev) return agendaItems[0] || null;
          const currentIndex = agendaItems.findIndex(item => item.id === prev.id);
          const prevItem = agendaItems[Math.max(currentIndex - 1, 0)];
          setEditMainScript(prevItem.main_script || '');
          setEditSubScript(prevItem.sub_script || '');
          return prevItem;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRealtimeActive, agendaItems, showSosModal, isInboxOpen]);

  // ==========================================
  // ฟังก์ชันอื่นๆ
  // ==========================================
  const marqueeDisplayText = useMemo(() => {
    const activeMessages = incomingMessages.filter(msg => msg.isShowingOnMarquee);
    if (activeMessages.length === 0) return "พร้อมใช้งานระบบอ่านสคริปต์พิธีการ | หากพบปัญหาแจ้ง SOS ได้ทันที";
    return activeMessages.map(msg => `🔴 ประกาศด่วน [เวลา ${msg.time}]: ${msg.text}`).join('   ✦✦✦   ');
  }, [incomingMessages]);

  const toggleMarquee = (id: string) => setIncomingMessages(prev => prev.map(msg => msg.id === id ? { ...msg, isShowingOnMarquee: !msg.isShowingOnMarquee } : msg));
  const resolveMessage = (id: string) => setIncomingMessages(prev => prev.filter(msg => msg.id !== id));

  const handleSelectManualCue = (item: AgendaItem) => {
    if (isRealtimeActive) return;
    setCurrentLiveItem(item);
    setEditMainScript(item.main_script || '');
    setEditSubScript(item.sub_script || '');
  };

  const handleSaveScriptChanges = async () => {
    if (!currentLiveItem) return;
    const { error } = await supabase.from('event_agenda_items')
      .update({ main_script: editMainScript, sub_script: editSubScript, updated_at: new Date().toISOString() })
      .eq('id', currentLiveItem.id);

    if (!error) {
      alert('💾 บันทึกการแก้ไขสคริปต์ลงฐานข้อมูลจริงสำเร็จเรียบร้อยครับ!');
      fetchScriptData();
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง");
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => setSosText(prev => prev + " " + event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
  };

  const handleSaveSosMessage = () => {
    if (!sosText.trim()) return;
    if (!quickSosMessages.includes(sosText)) setQuickSosMessages(prev => [sosText, ...prev]);
  };

  const handleDeleteSosMessage = (msgToDelete: string) => {
    if (window.confirm(`ต้องการลบข้อความ "${msgToDelete}" ใช่หรือไม่?`)) setQuickSosMessages(prev => prev.filter(msg => msg !== msgToDelete));
  };

  const handleSendSOS = async (presetText?: string) => {
    const messageToSend = typeof presetText === 'string' ? presetText : sosText;
    if (!messageToSend || !messageToSend.trim() || !activeEventId) return;

    try {
      await supabase.from('event_live_messages').insert({
        event_id: activeEventId, sender_name: 'พิธีกร (หน้าสคริปต์)', sender_role: 'mc',
        message_text: `🚨 SOS ด่วน: ${messageToSend.trim()}`, is_approved: true, target_screen: 'staff'
      });
      setShowSosModal(false);
      setSosText('');
    } catch (err) { console.error("ส่ง SOS ล้มเหลว:", err); }
  };

  const renderParagraphsWithColors = (text: string | undefined, itemId: string) => {
    if (!text) return <span className="text-zinc-600 italic font-bold">ไม่มีบทพากย์หลักบันทึกไว้ในคิวงานนี้</span>;
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    return (
      <div className="space-y-4 text-left">
        {paragraphs.map((para, index) => {
          const paragraphKey = `${itemId}-${index}`;
          const isParagraphRead = readParagraphs[paragraphKey];
          let fontColorClass = "text-[#2dd4bf]";
          if (paragraphs.length > 1) {
            if (index === paragraphs.length - 1) fontColorClass = "text-orange-400";
            else if (index === 0) fontColorClass = "text-teal-300";
            else if (index === 1) fontColorClass = "text-sky-400";
            else fontColorClass = "text-emerald-400";
          }
          return (
            <p key={index} onClick={() => setReadParagraphs(prev => ({ ...prev, [paragraphKey]: !prev[paragraphKey] }))}
              className={`cursor-pointer transition-all duration-300 font-black leading-relaxed select-text tracking-wide hover:brightness-125
                ${fontColorClass} ${isParagraphRead ? 'opacity-30 saturate-50 scale-[0.99] font-medium' : 'opacity-100'}
              `} title="แตะสลับเพื่อดรอปสีเมื่ออ่านย่อหน้านี้จบ"
              style={{ fontSize: `${1.25 * textScale}rem` }}
            >
              {para}
            </p>
          );
        })}
      </div>
    );
  };

  const getMcLeftBorderTheme = (role: string | undefined) => {
    if (role === 'mc_1') return 'border-l-[6px] border-sky-500 shadow-[inset_4px_0_10px_rgba(14,165,233,0.1)]';
    if (role === 'mc_2') return 'border-l-[6px] border-indigo-600 shadow-[inset_4px_0_10px_rgba(79,70,229,0.1)]';
    if (role === 'both') return 'border-l-[6px] border-emerald-500 shadow-[inset_4px_0_10px_rgba(16,185,129,0.1)]';
    return 'border-l-[6px] border-zinc-700';
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col select-none relative overflow-x-hidden pb-8">

      {/* 🌟 Slide-over Drawer (คู่มือการใช้งาน) */}
      <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-[#020617] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] transform transition-transform duration-500 ease-in-out flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
            <h2 className="text-xl font-black text-cyan-400 flex items-center gap-2"><BookOpen size={20} /> คู่มือ พิธีกร (MC Prompter)</h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-sm">

            <details className="group bg-zinc-900 rounded-xl border border-white/5 overflow-hidden">
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-emerald-400 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2"><ToggleRight size={16} /> โหมดการอ่าน (Read Modes)</span>
                <ChevronDown className="w-4 h-4 text-zinc-500 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-zinc-300 border-t border-white/5 bg-black/40 space-y-2">
                <p>การสลับโหมดการทำงานของสคริปต์:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-400">
                  <li><b className="text-emerald-400">REALTIME LIVE:</b> สคริปต์จะเลื่อนตามคำสั่งจากห้องควบคุม (SM Control) อัตโนมัติ พิธีกรไม่ต้องกดเปลี่ยนคิวเอง</li>
                  <li><b className="text-yellow-400">REVIEW / EDIT:</b> พิธีกรสามารถคลิกเลือกคิว หรือใช้ <b>รีโมทพอยเตอร์ (Clicker)</b> กดลูกศร ซ้าย-ขวา เพื่อเลื่อนสคริปต์เองได้ และยังสามารถแก้ไขข้อความสคริปต์เพื่อบันทึกได้ด้วย</li>
                </ul>
              </div>
            </details>

            <details className="group bg-zinc-900 rounded-xl border border-white/5 overflow-hidden">
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-cyan-400 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2"><Mic size={16} /> เทคนิคการอ่าน (Reading Tips)</span>
                <ChevronDown className="w-4 h-4 text-zinc-500 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-zinc-300 border-t border-white/5 bg-black/40 space-y-2">
                <p>การจัดการหน้าจอเพื่อความสะดวก:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-400">
                  <li><b>ย่อหน้าหลากสี:</b> ข้อความใน Layer Upper จะแยกสีในแต่ละย่อหน้าให้เห็นชัดเจน</li>
                  <li><b>ดรอปสี:</b> เมื่ออ่านย่อหน้าไหนจบ สามารถเอานิ้วแตะที่ข้อความนั้น สีจะหม่นลง เพื่อให้รู้ว่าอ่านไปแล้ว (กันหลงบรรทัด)</li>
                  <li><b>ขยายฟอนต์:</b> ใช้ปุ่ม A+ / A- มุมขวาบนของกล่องสคริปต์ เพื่อปรับขนาดตัวอักษรให้พอดีสายตา</li>
                </ul>
              </div>
            </details>

            <details className="group bg-zinc-900 rounded-xl border border-white/5 overflow-hidden">
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-blue-400 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2"><MessageSquare size={16} /> การรับคำสั่งด่วน (Inbox & Marquee)</span>
                <ChevronDown className="w-4 h-4 text-zinc-500 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-zinc-300 border-t border-white/5 bg-black/40 space-y-2">
                <p>เมื่อห้องควบคุมส่งข้อความด่วนมา:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-400">
                  <li>จะมีแบนเนอร์สีแดงเด้งขึ้นมากลางจอให้ทราบทันที</li>
                  <li>ข้อความจะถูกเก็บในปุ่ม <b>กล่องข้อความ</b> มุมขวาล่าง</li>
                  <li>พิธีกรสามารถเลือกนำข้อความนั้นขึ้น <b>แถบวิ่ง (Marquee)</b> บริเวณด้านบนของจอ เพื่อเตือนความจำตัวเองได้</li>
                </ul>
              </div>
            </details>

            <details className="group bg-zinc-900 rounded-xl border border-white/5 overflow-hidden">
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-red-400 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2"><AlertTriangle size={16} /> ขอความช่วยเหลือ (SOS)</span>
                <ChevronDown className="w-4 h-4 text-zinc-500 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-zinc-300 border-t border-white/5 bg-black/40 space-y-2">
                <p>หากพิธีกรติดปัญหาหน้าเวที:</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-400">
                  <li>กดปุ่ม <b>SOS สีแดง</b> มุมขวาบน</li>
                  <li>สามารถพูดใส่ไมค์ หรือพิมพ์ข้อความ เพื่อส่งสัญญาณไปเตือนหน้าจอของทีมงานในห้องควบคุมให้เข้ามาช่วยเหลือได้ทันที</li>
                </ul>
              </div>
            </details>

          </div>
        </div>
      </div>

      {showUrgentBanner && urgentIntercomMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-3xl bg-red-600/95 backdrop-blur-md border-2 border-red-400 text-white p-5 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-in slide-in-from-top-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-2 text-amber-300">
            <AlertTriangle className="w-7 h-7 animate-pulse" />
            <h2 className="text-xl font-black tracking-wider">คำสั่งด่วนจากผู้กำกับเวที (SM)</h2>
            <AlertTriangle className="w-7 h-7 animate-pulse" />
          </div>
          <p className="text-2xl font-bold leading-relaxed">{urgentIntercomMsg}</p>
          <button onClick={() => setShowUrgentBanner(false)} className="mt-4 px-6 py-2 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2">
            <X size={16} /> รับทราบและปิดข้อความ
          </button>
        </div>
      )}

      {/* 🚀 STICKY HEADER & NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start md:items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors" title="ย้อนกลับ">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa Logo" className="h-8 object-contain" />
              <div>
                <h1 className="text-lg font-black text-white flex items-center gap-2">
                  <Mic className="text-purple-400" /> สคริปต์พิธีการ
                </h1>
                <div className="text-[10px] text-purple-400/80 font-bold uppercase tracking-widest mt-0.5">
                  {eventData?.title ? `${eventData.title} | ${eventData.brand_name} | ${eventData.location_hotel}` : 'Seminar Script Prompter'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {urgentSms && (
              <div className="hidden sm:flex bg-red-600/90 border border-red-400 text-white px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-in fade-in zoom-in items-center gap-2 mr-2">
                <AlertTriangle size={16} className="animate-pulse text-amber-300" />
                <div className="flex flex-col text-left mr-2">
                  <span className="text-[9px] font-black uppercase text-amber-300">จาก: {urgentSms.sender}</span>
                  <span className="text-xs font-bold truncate max-w-[150px]">{urgentSms.text}</span>
                </div>
                <button onClick={() => setUrgentSms(null)} className="p-1 hover:bg-black/30 rounded-lg transition-colors"><X size={14} /></button>
              </div>
            )}

            {/* 🌟 ปุ่มเปิดคู่มือ */}
            <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-2 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              <BookOpen size={14} /> คู่มือ
            </button>

            <button onClick={() => router.push(`/eventdashboard/create/seminar?event_id=${eventId}`)} className="flex items-center gap-2 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 border border-indigo-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-colors hidden md:flex">
              <MonitorPlay size={14} /> เตรียมสคริปต์
            </button>
            <button onClick={() => router.push(`/eventdashboard/showtime/mc_prompter?event_id=${eventId}`)} className="flex items-center gap-2 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-colors hidden md:flex">
              <Mic2 size={14} /> สคริปต์อ่านชื่อ
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-white/5 pt-3">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400">ระบบสคริปต์:</span>
              <button type="button" onClick={() => setIsRealtimeActive(!isRealtimeActive)} className="flex items-center gap-1.5 text-[10px] font-black tracking-wider transition-all focus:outline-none">
                {isRealtimeActive
                  ? <span className="text-emerald-400 flex items-center gap-1"><ToggleRight size={20} className="text-emerald-500" /> REALTIME LIVE</span>
                  : <span className="text-yellow-400 flex items-center gap-1"><ToggleLeft size={20} className="text-yellow-500" /> REVIEW / EDIT MODE</span>
                }
              </button>
            </div>

            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg px-4 py-1.5 flex items-center flex-1 overflow-hidden hidden md:flex">
              <span className="text-blue-400 font-bold text-xs shrink-0 mr-3">UPDATE:</span>
              <div className="flex-1 overflow-hidden relative flex items-center">
                <style>{`
                  @keyframes scroll-text { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                  .animate-scroll { display: inline-block; white-space: nowrap; animation: scroll-text 20s linear infinite; }
                `}</style>
                <div className="animate-scroll text-blue-200 text-sm font-bold tracking-wider">
                  {marqueeDisplayText}
                </div>
              </div>
            </div>
          </div>

          <Link
            href={`/events/event-dashboard/${eventId}`}
            className="group flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-white/5 hover:border-teal-500/50 shrink-0 mx-4"
          >
            <LayoutGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold hidden md:inline">ศูนย์กลาง</span>
          </Link>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setShowSosModal(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]"
            >
              <AlertTriangle size={14} /> SOS
            </button>

            <div className="flex flex-col items-end justify-center bg-zinc-900/80 px-3 py-1 rounded-xl border border-white/5">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-0.5">LOCAL TIME</span>
              <span className="font-mono text-lg font-black text-cyan-400 tracking-wider leading-none">
                {mounted ? time.toLocaleTimeString('th-TH') : '--:--:--'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1 p-4">

        {/* LEFT 8 COLUMNS: SCRIPT READER */}
        <div className="lg:col-span-8 space-y-4">
          <div className={`p-6 bg-zinc-900 border border-white/5 rounded-3xl flex flex-col gap-5 shadow-xl relative overflow-hidden ${getMcLeftBorderTheme(currentLiveItem?.speaker_role)}`}>

            <div className="absolute top-4 right-4 flex gap-2 z-20">
              <button onClick={() => setTextScale(s => Math.max(0.5, s - 0.1))} className="bg-[#020617]/80 hover:bg-[#020617] text-cyan-200 px-3 py-1.5 rounded-lg text-sm font-bold border border-cyan-500/30 transition-colors shadow-lg" title="ลดขนาดตัวอักษร">A-</button>
              <button onClick={() => setTextScale(s => Math.min(2.0, s + 0.1))} className="bg-[#020617]/80 hover:bg-[#020617] text-cyan-200 px-3 py-1.5 rounded-lg text-sm font-bold border border-cyan-500/30 transition-colors shadow-lg" title="เพิ่มขนาดตัวอักษร">A+</button>
            </div>

            <div className="border-b border-zinc-800 pb-3 flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="bg-purple-900/50 border border-purple-500/50 text-purple-300 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shrink-0">
                  {currentLiveItem ? currentLiveItem.sort_order : '-'}
                </div>
                <div className="pr-20">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider inline-block mb-1 ${currentLiveItem?.is_live_now && isRealtimeActive ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                    {currentLiveItem?.is_live_now && isRealtimeActive ? '🔴 ON-AIR LIVE POSITION' : '📖 REVIEW MODE POSITION'}
                  </span>
                  <h2 className="text-xl font-black text-white tracking-tight leading-snug">{currentLiveItem?.title || 'ไม่มีรายการรันคิว'}</h2>
                </div>
              </div>
            </div>

            <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-3">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block border-b border-zinc-800/50 pb-2 mb-2">💬 Layer Upper — บทพูดกล่าวออกอากาศจริง (แตะเพื่อดรอปสีได้):</span>
              {renderParagraphsWithColors(isRealtimeActive ? currentLiveItem?.main_script : editMainScript, currentLiveItem?.id || 'manual')}
            </div>

            <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 text-left space-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-600/50" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">💡 Layer Lower — ข้อมูลเพิ่มเติมจากทีมงาน:</span>
              <div className="text-xs md:text-sm font-bold text-zinc-300 leading-relaxed pt-1 whitespace-pre-line">
                {isRealtimeActive ? (
                  currentLiveItem?.sub_script || <span className="text-zinc-700 italic">ไม่มีข้อมูลส่วนล่าง</span>
                ) : (
                  <span className="text-zinc-400">{editSubScript || 'ไม่มีข้อมูลส่วนล่าง'}</span>
                )}
              </div>
            </div>
          </div>

          {/* EDIT PANEL (Review Mode Only) */}
          {!isRealtimeActive && currentLiveItem && (
            <div className="p-5 bg-gradient-to-b from-zinc-900 to-black border border-yellow-500/20 rounded-3xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="font-black text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">📝 แผงทบทวนแก้ไขสคริปต์หน้างาน (Venue Code Editor)</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1"><textarea rows={3} value={editMainScript} onChange={e => setEditMainScript(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs outline-none text-teal-400 font-black focus:border-yellow-500" /></div>
                <div className="space-y-1"><textarea rows={2} value={editSubScript} onChange={e => setEditSubScript(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs outline-none text-zinc-300 font-bold focus:border-yellow-500" /></div>
                <button onClick={handleSaveScriptChanges} className="w-full py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"><Save size={14} className="inline mr-1" /> บันทึกสคริปต์</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 4 COLUMNS: AGENDA LIST */}
        <div className="lg:col-span-4 bg-zinc-900 border border-white/5 p-4 rounded-3xl flex flex-col max-h-[82vh] shadow-xl">
          <div className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-3 mb-3 flex justify-between">
            <span>ผังลําดับสคริปต์</span>
            <span className="text-purple-400 font-bold">{agendaItems.length} รายการ</span>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {agendaItems.map((item, idx) => {
              const isItemLive = item.is_live_now;
              const isManualFocused = currentLiveItem?.id === item.id;
              let cardStyle = "bg-black/30 border-white/5 opacity-50 cursor-not-allowed";
              if (!isRealtimeActive) cardStyle = isManualFocused ? "bg-zinc-800 border-yellow-500 scale-[1.01]" : "bg-black/60 hover:border-zinc-700 cursor-pointer opacity-80";
              else if (isItemLive) cardStyle = "bg-gradient-to-r from-purple-950/50 to-indigo-950/50 border-purple-500 shadow-md scale-[1.01] opacity-100";

              return (
                <div key={item.id} ref={isItemLive && isRealtimeActive ? activeRowRef : isManualFocused && !isRealtimeActive ? activeRowRef : null} onClick={() => handleSelectManualCue(item)} className={`p-3 rounded-2xl border transition-all text-left flex gap-3 items-center group ${cardStyle}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isItemLive && isRealtimeActive ? 'bg-purple-500 text-white' : isManualFocused && !isRealtimeActive ? 'bg-yellow-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                    {item.sort_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-[9px] font-bold">
                      <span className={isItemLive && isRealtimeActive ? "text-purple-400 font-black animate-pulse" : "text-zinc-500"}>{isItemLive && isRealtimeActive ? "🔴 ON AIR NOW" : isManualFocused && !isRealtimeActive ? "📝 FOCUS EDIT" : `CUE`}</span>
                      <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-zinc-400"><Clock size={10} className="inline mr-1" />{item.start_time || '-'}</span>
                    </div>
                    <h4 className={`text-xs font-black truncate mt-1 ${isItemLive && isRealtimeActive ? 'text-white' : isManualFocused ? 'text-yellow-400' : 'text-zinc-400'}`}>{item.title}</h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 🚨 MODAL: SOS / Emergency Message */}
      {showSosModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#020617] border border-red-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-red-950/40">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> ส่งสัญญาณฉุกเฉิน (SOS)
              </h2>
              <button onClick={() => setShowSosModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-zinc-400 font-medium">ส่งข้อความด่วนไปยังหน้าจอ Monitor หลัก</p>

              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                {quickSosMessages.map((msg, i) => (
                  <div key={i} className="flex items-center bg-zinc-800/80 border border-white/5 rounded-xl overflow-hidden group">
                    <button onClick={() => handleSendSOS(msg)} className="hover:bg-red-600 hover:text-white text-zinc-300 text-xs px-3 py-1.5 transition-colors font-medium flex items-center gap-1.5" title="กดเพื่อส่งข้อความนี้ทันที">
                      {msg}
                    </button>
                    <button onClick={() => handleDeleteSosMessage(msg)} className="px-2 py-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/50 transition-colors border-l border-white/5" title="ลบข้อความนี้">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="relative mt-2">
                <textarea
                  value={sosText}
                  onChange={(e) => setSosText(e.target.value)}
                  placeholder="พิมพ์ หรือ พูด ข้อความที่ต้องการ..."
                  className="w-full h-32 bg-black border border-white/10 rounded-2xl p-4 text-white resize-none outline-none focus:border-red-500 text-base"
                ></textarea>

                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                  <button onClick={handleVoiceInput} className={`p-2 rounded-lg transition-all border ${isListening ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:text-white'}`}>
                    <Mic size={16} />
                  </button>
                  <button onClick={handleSaveSosMessage} disabled={!sosText.trim()} className="p-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:text-amber-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-all">
                    <Save size={16} />
                  </button>
                </div>
              </div>

              <button onClick={() => handleSendSOS(sosText)} disabled={!sosText.trim()} className="w-full bg-red-900/80 hover:bg-red-700 text-red-200 font-black text-lg py-4 rounded-xl mt-2 transition-all flex items-center justify-center gap-2 border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send size={20} /> ส่งออกไปยัง Live Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 กล่อง Inbox มุมขวาล่าง */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end print:hidden">
        {isInboxOpen && (
          <div className="mb-4 w-80 bg-blue-900/95 backdrop-blur-xl border border-blue-400/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-4 py-3 border-b border-blue-400/30 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={16} className="text-blue-400" /> กล่องข้อความ SM</h3>
              <button onClick={() => setIsInboxOpen(false)} className="text-blue-300 hover:text-white p-1 bg-white/10 hover:bg-red-500 rounded-md transition-colors"><X size={16} /></button>
            </div>
            <div className="p-3 flex flex-col gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {incomingMessages.length > 0 ? incomingMessages.map((msg) => (
                <div key={msg.id} className={`border rounded-xl p-3 transition-colors ${msg.isShowingOnMarquee ? 'bg-blue-900/40 border-blue-400' : 'bg-black/40 border-white/5'}`}>

                  <div className="text-[10px] text-blue-300 font-bold mb-1 flex items-center gap-1">
                    <Clock size={10} /> เวลา {msg.time}
                  </div>
                  <p className="text-sm text-white font-medium mb-3">{msg.text}</p>

                  <div className="flex gap-2 border-t border-white/10 pt-2 mt-auto">
                    <button
                      onClick={() => toggleMarquee(msg.id)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex justify-center items-center gap-1 ${msg.isShowingOnMarquee ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                    >
                      {msg.isShowingOnMarquee ? '👀 ซ่อนจากแถบวิ่ง' : '📢 โชว์บนแถบวิ่ง'}
                    </button>

                    <button
                      onClick={() => resolveMessage(msg.id)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-colors"
                    >
                      ✅ รับทราบ
                    </button>
                  </div>
                </div>
              )) : <div className="text-xs text-center text-blue-300/50 py-6 font-bold">ไม่มีข้อความใหม่</div>}
            </div>
          </div>
        )}
        <button onClick={() => setIsInboxOpen(!isInboxOpen)} className="relative bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all transform hover:scale-110 border-2 border-blue-400/50">
          <MessageSquare size={24} />
          {incomingMessages.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#020617] animate-bounce">{incomingMessages.length}</span>}
        </button>
      </div>

    </div>
  );
}

export default function EmceeShowtimeScriptPrompter() {
  return (
    // 🌟 หุ้มด้วย RouteGuard และให้สิทธิ์เฉพาะ admin และ mc
    <Suspense fallback={<div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-mono">Loading Script Prompter...</div>}>
      <RouteGuard allowedRoles={['admin', 'mc']}>
        <EmceeShowtimeScriptContent />
      </RouteGuard>
    </Suspense>
  );
}