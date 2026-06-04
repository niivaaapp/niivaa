"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Mic, Clock, Layers, ArrowLeft, ToggleLeft, ToggleRight, HelpCircle, Send, Save, AlertTriangle, MessageSquare } from 'lucide-react';

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

// 1. แยกเนื้อหาหลักออกมาเป็น Component ย่อย
function EmceeShowtimeScriptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [currentLiveItem, setCurrentLiveItem] = useState<AgendaItem | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState<boolean>(false);
  const [assistantInputText, setAssistantInputText] = useState<string>('');
  const [readParagraphs, setReadParagraphs] = useState<Record<string, boolean>>({});
  const [editMainScript, setEditMainScript] = useState<string>('');
  const [editSubScript, setEditSubScript] = useState<string>('');
  
  // แจ้งเตือนจาก SM -> MC
  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);

  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchScriptData = async () => {
    const { data, error } = await supabase.from('event_agenda_items').select('*').order('sort_order', { ascending: true });
    if (!error && data) {
      setAgendaItems(data);
      const liveItem = data.find((item) => item.is_live_now === true);
      if (isRealtimeActive) {
        const activeItem = liveItem || data[0] || null;
        setCurrentLiveItem(activeItem);
        if (activeItem) {
          setEditMainScript(activeItem.main_script || '');
          setEditSubScript(activeItem.sub_script || '');
        }
      }
    }
  };

  const fetchIntercomState = async () => {
    const { data, error } = await supabase.from('screen_state').select('sm_intercom_msg').eq('id', 'current').single();
    if (!error && data?.sm_intercom_msg) {
      setUrgentIntercomMsg(data.sm_intercom_msg);
      setShowUrgentBanner(true);
    }
  };

  useEffect(() => {
    fetchScriptData();
    fetchIntercomState();

    const realtimeChannel = supabase.channel('emcee_script_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_agenda_items' }, () => { fetchScriptData(); })
      .subscribe();

    const intercomSub = supabase.channel('emcee_intercom_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' }, (payload: any) => {
        if (payload.new?.sm_intercom_msg) {
          setUrgentIntercomMsg(payload.new.sm_intercom_msg);
          setShowUrgentBanner(true);
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
      supabase.removeChannel(intercomSub);
    };
  }, [eventId, isRealtimeActive]);

  useEffect(() => {
    if (isRealtimeActive && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLiveItem, isRealtimeActive]);

  const handleAcknowledgeMessage = async () => {
    setShowUrgentBanner(false);
    setUrgentIntercomMsg(''); 

    try {
      await supabase
        .from('screen_state')
        .update({ sm_intercom_msg: null })
        .eq('id', 'current');
    } catch (error) {
      console.error("Failed to clear intercom message:", error);
    }
  };

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

  const handleSendHelpRequest = async (predefinedText?: string) => {
    const textToSend = predefinedText || assistantInputText;
    if (!textToSend.trim()) return;

    const { error } = await supabase
      .from('screen_state')
      .update({ mc_help_request: textToSend, updated_at: new Date().toISOString() })
      .eq('id', 'current');

    if (!error) {
      setAssistantInputText('');
      setIsHelpPanelOpen(false);
      alert('🚀 ส่งคำขอความช่วยเหลือฉุกเฉิน ไปกะพริบที่หน้าจอ SM สำเร็จแล้วครับ!');
    }
  };

  const renderParagraphsWithColors = (text: string | undefined, itemId: string) => {
    if (!text) return <span className="text-zinc-600 italic font-bold">ไม่มีบทพากย์หลักบันทึกไว้ในคิวงานนี้</span>;
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    return (
      <div className="space-y-4 text-left">
        {paragraphs.map((para, index) => {
          const isLast = index === paragraphs.length - 1;
          const paragraphKey = `${itemId}-${index}`;
          const isParagraphRead = readParagraphs[paragraphKey];
          let fontColorClass = "text-[#2dd4bf]";
          if (paragraphs.length > 1) {
            if (isLast) fontColorClass = "text-orange-400";
            else if (index === 0) fontColorClass = "text-teal-300";
            else if (index === 1) fontColorClass = "text-sky-400";
            else fontColorClass = "text-emerald-400";
          }
          return (
            <p key={index} onClick={() => setReadParagraphs(prev => ({ ...prev, [paragraphKey]: !prev[paragraphKey] }))}
              className={`cursor-pointer transition-all duration-300 text-lg sm:text-xl font-black leading-relaxed select-text tracking-wide hover:brightness-125
                ${fontColorClass} ${isParagraphRead ? 'opacity-30 saturate-50 scale-[0.99] font-medium' : 'opacity-100'}
              `} title="แตะสลับเพื่อดรอปสีเมื่ออ่านย่อหน้านี้จบ">
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
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans flex flex-col gap-4 select-none relative overflow-x-hidden">
      
      {showUrgentBanner && urgentIntercomMsg && (
        <div className="fixed top-4 left-4 right-4 z-[9999] bg-gradient-to-r from-red-600 via-red-700 to-amber-600 border-2 border-white text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.4)] flex items-center justify-between gap-4 animate-in slide-in-from-top-6">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-black/30 rounded-xl text-white animate-bounce shrink-0"><AlertTriangle size={24} /></div>
            <div className="min-w-0 flex-1">
              <span className="bg-white text-red-700 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">คำสั่งด่วนจากผู้กำกับเวที (SM)</span>
              <p className="text-sm md:text-base font-black tracking-wide text-white mt-1 break-words leading-snug animate-pulse">{urgentIntercomMsg}</p>
            </div>
          </div>
          <button onClick={handleAcknowledgeMessage} className="bg-black/30 hover:bg-black/50 p-2 rounded-xl font-bold text-xs transition-colors shrink-0">❌ รับทราบ (ปิด)</button>
        </div>
      )}

      <div className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl pb-4 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2.5 bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={16}/></button>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2"><Mic size={18} className="text-purple-400" /> ห้องปฏิบัติการสคริปต์พิธีกรและโพยอ่านสด</h1>
            <div className="flex items-center gap-2 mt-1.5 bg-black/40 px-3 py-1 rounded-xl border border-white/5 w-fit">
              <span className="text-[10px] font-bold text-zinc-400">ระบบเชื่อมต่อหลัก:</span>
              <button type="button" onClick={() => setIsRealtimeActive(!isRealtimeActive)} className="flex items-center gap-1.5 text-[10px] font-black tracking-wider transition-all focus:outline-none">
                {isRealtimeActive ? <span className="text-emerald-400 flex items-center gap-1"><ToggleRight size={20} className="text-emerald-500"/> REALTIME MATRIX ACTIVE</span> : <span className="text-yellow-400 flex items-center gap-1"><ToggleLeft size={20} className="text-yellow-500"/> NON-ACTIVE (โหมดอิสระ แก้ไข/ซ้อมได้)</span>}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end md:self-center">
          <div className="bg-zinc-900 px-4 py-1.5 rounded-xl border border-white/5 text-center">
            <span className="text-[8px] text-zinc-500 font-bold block uppercase tracking-widest">CLOCK TIME</span>
            <span className="text-base font-mono font-black text-cyan-400">{time.toLocaleTimeString('th-TH')}</span>
          </div>
          <div className="h-10 w-auto flex items-center justify-center border-l border-white/10 pl-4">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" className="h-full object-contain" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1">
        <div className="lg:col-span-8 space-y-4">
          <div className={`p-6 bg-zinc-900 border border-white/5 rounded-3xl flex flex-col gap-5 shadow-xl relative overflow-hidden ${getMcLeftBorderTheme(currentLiveItem?.speaker_role)}`}>
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-start">
              <div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border tracking-wider ${currentLiveItem?.is_live_now ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {currentLiveItem?.is_live_now ? '🔴 ON-AIR LIVE POSITION' : '📖 REVIEW MODE POSITION'}
                </span>
                <h2 className="text-lg font-black text-white tracking-tight mt-2">{currentLiveItem?.title || 'ไม่มีรายการรันคิว'}</h2>
              </div>
              <button type="button" onClick={() => setIsHelpPanelOpen(!isHelpPanelOpen)} className="px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 hover:border-cyan-500/50 text-cyan-400 font-black text-[10px] rounded-xl flex items-center gap-1.5 transition-all shadow-md">
                <HelpCircle size={13}/> ส่งคำขอด่วนหา SM
              </button>
            </div>

            {isHelpPanelOpen && (
              <div className="p-4 bg-black/60 border border-cyan-500/30 rounded-2xl animate-in fade-in duration-150 space-y-3 shadow-inner">
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">🎯 กดส่งรหัสคำขอด่วน เพื่อให้กะพริบแจ้งเตือนที่จอผู้กำกับเวที (SM):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button onClick={() => handleSendHelpRequest("ขอรายละเอียดข้อมูลเรื่องที่เพิ่มใหม่หน้างานด่วนครับ")} className="p-2.5 bg-zinc-950 border border-zinc-800 text-left rounded-xl font-bold text-[11px] hover:border-cyan-400 text-zinc-300">❓ ขอรายละเอียดเรื่องที่เพิ่มใหม่</button>
                  <button onClick={() => handleSendHelpRequest("มีการเปลี่ยนแปลงคิว โปรดส่งเอกสารอัปเดตหน้าเวที")} className="p-2.5 bg-zinc-950 border border-zinc-800 text-left rounded-xl font-bold text-[11px] hover:border-cyan-400 text-zinc-300">🔄 ขอข้อมูลคิวที่เปลี่ยนแปลงหน้างาน</button>
                </div>
                <div className="flex gap-2 pt-2 border-t border-zinc-800">
                  <input type="text" value={assistantInputText} onChange={e => setAssistantInputText(e.target.value)} placeholder="พิมพ์ข้อความที่ต้องการให้ SM ตอบกลับ..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-medium outline-none focus:border-cyan-500" />
                  <button onClick={() => handleSendHelpRequest()} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-4 rounded-xl text-xs flex items-center gap-1"><Send size={12}/> ส่งหา SM</button>
                </div>
              </div>
            )}

            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">💬 Layer Upper — บทพูดกล่าวออกอากาศจริง (แตะเพื่อดรอปสีได้):</span>
              {renderParagraphsWithColors(isRealtimeActive ? currentLiveItem?.main_script : editMainScript, currentLiveItem?.id || 'manual')}
            </div>

            <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 text-left space-y-1 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-600/50" />
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">💡 Layer Lower — ข้อมูลเพิ่มเติม / แผงรับข้อความตอบกลับจาก SM:</span>
              <div className="text-xs md:text-sm font-bold text-zinc-300 leading-relaxed pt-1 whitespace-pre-line">
                {isRealtimeActive ? (
                  currentLiveItem?.sub_script || <span className="text-zinc-700 italic">ไม่มีข้อมูลส่วนล่าง</span>
                ) : (
                  <span className="text-zinc-400">{editSubScript || 'ไม่มีข้อมูลส่วนล่าง'}</span>
                )}
              </div>
            </div>
          </div>

          {!isRealtimeActive && currentLiveItem && (
            <div className="p-5 bg-gradient-to-b from-zinc-900 to-black border border-yellow-500/20 rounded-3xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <h3 className="font-black text-xs text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">📝 แผงทบทวนแก้ไขสคริปต์หน้างาน (Venue Code Editor)</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1"><textarea rows={3} value={editMainScript} onChange={e => setEditMainScript(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs outline-none text-teal-400 font-black focus:border-yellow-500" /></div>
                <div className="space-y-1"><textarea rows={2} value={editSubScript} onChange={e => setEditSubScript(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs outline-none text-zinc-300 font-bold focus:border-yellow-500" /></div>
                <button onClick={handleSaveScriptChanges} className="w-full py-3 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"><Save size={14} className="inline mr-1"/> บันทึกสคริปต์</button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-zinc-900 border border-white/5 p-4 rounded-3xl flex flex-col max-h-[82vh] shadow-xl">
          <div className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-3">ผังลําดับสคริปต์ในงาน</div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {agendaItems.map((item, idx) => {
              const isItemLive = item.is_live_now;
              const isManualFocused = currentLiveItem?.id === item.id;
              let cardStyle = "bg-black/30 border-white/5 opacity-50 cursor-not-allowed";
              if (!isRealtimeActive) cardStyle = isManualFocused ? "bg-zinc-800 border-yellow-500 scale-[1.01]" : "bg-black/60 hover:border-zinc-700 cursor-pointer opacity-80";
              else if (isItemLive) cardStyle = "bg-gradient-to-r from-purple-950/50 to-indigo-950/50 border-purple-500 shadow-md scale-[1.01] opacity-100";
              return (
                <div key={item.id} ref={isItemLive && isRealtimeActive ? activeRowRef : null} onClick={() => handleSelectManualCue(item)} className={`p-3 rounded-2xl border transition-all text-left ${cardStyle}`}>
                  <div className="flex justify-between text-[9px] font-bold">
                    <span className={isItemLive ? "text-purple-400 font-black animate-pulse" : "text-zinc-500"}>{isItemLive ? "🔴 ON AIR NOW" : isManualFocused && !isRealtimeActive ? "📝 FOCUS EDIT" : `CUE #${idx + 1}`}</span>
                    <span className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-zinc-400"><Clock size={10} className="inline mr-1"/>{item.start_time || '-'}</span>
                  </div>
                  <h4 className={`text-xs font-black truncate mt-1 ${isItemLive ? 'text-white' : isManualFocused ? 'text-yellow-400' : 'text-zinc-400'}`}>{item.title}</h4>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// 2. Component หลักที่ห่อหุ้มด้วย Suspense เพื่อแก้บั๊กตอน Build
export default function EmceeShowtimeScriptPrompter() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-mono">Loading Script Prompter...</div>}>
      <EmceeShowtimeScriptContent />
    </Suspense>
  );
}