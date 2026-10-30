"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useState, useEffect, useMemo, Suspense } from 'react'; // 🌟 เพิ่ม Suspense
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import RouteGuard from '@/components/RouteGuard'; // 🌟 นำเข้า RouteGuard
import {
  ArrowLeft, Clock, CheckCircle2, FastForward, LayoutGrid,
  Users, AlertTriangle, MessageSquare, Printer,
  FileText, X, ChevronDown, Save, Mic, Gift, ListChecks, HelpCircle
} from 'lucide-react';

interface Attendee {
  id: string;
  prefix: string;
  fullname: string;
  position: string;
  organization: string;
  bio_note?: string;
  is_present?: boolean;
  special_act1?: string;
  special_act2?: string;
  action_sequence?: number;
  priority_level?: number; 
  seat_number?: string;    
  role_in_event?: string;
  gift_number?: string;
  gift_style?: string;
  status?: string;
  attendee_type?: string;
  created_at?: string;
}

type IncomingMsg = {
  id: string;
  time: string;
  text: string;
  isShowingOnMarquee: boolean;
};

// ==========================================
// 📖 Component: คู่มือการใช้งาน (Manual Drawer)
// ==========================================
function McPrompterManualDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#050B14] h-full shadow-[-10px_0_40px_rgba(0,0,0,0.8)] border-l border-[#00E676]/30 flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0A1326] shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#00E676]/20 p-2.5 rounded-xl border border-[#00E676]/50">
              <HelpCircle className="text-[#00E676] w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">คู่มือการอ่านรายชื่อแขก</h2>
              <p className="text-xs text-[#00E676] mt-0.5 uppercase tracking-widest">MC Prompter Manual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar text-sm text-zinc-300">
          <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-inner">
            <p className="text-blue-200 font-bold leading-relaxed">
              💡 <strong className="text-white">หน้านี้เหมาะสมอย่างยิ่งสำหรับพิธีกรที่ต้อง "อ่านรายชื่อแขกผู้ร่วมงานจำนวนมาก"</strong> (เช่น งานรับรางวัล, งานพิธีการที่มีแขก VIP เยอะ) เนื่องจากมีระบบป้องกันการอ่านข้ามคิว ตัวอักษรขนาดใหญ่พิเศษ และการซิงค์ข้อมูลกับทีมลงทะเบียน (แอดมินหลังบ้าน) แบบ Real-time ทันที
            </p>
          </div>
          
          <section>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <ListChecks className="w-5 h-5 text-cyan-400" /> 1. การจัดเรียงและการกรองคิว (Filter & Sort)
            </h3>
            <div className="bg-[#0A1326]/50 rounded-xl p-5 border border-white/5 space-y-3">
              <ul className="space-y-4 text-zinc-400">
                <li className="flex gap-3 items-start">
                  <div className="bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded border border-cyan-800/50 text-[10px] font-black shrink-0 mt-0.5">การจัดเรียง</div>
                  <div>
                    ระบบตั้งค่าเริ่มต้นให้ <strong className="text-white">"เรียงตามระดับความสำคัญ (Priority)"</strong> แต่พิธีกรสามารถสลับไปเรียงตามเลขลำดับคิว, เลขที่นั่ง, หรือเวลาลงทะเบียนได้ทันทีจากเมนู Dropdown ด้านบน
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded border border-emerald-800/50 text-[10px] font-black shrink-0 mt-0.5">การกรองกลุ่ม</div>
                  <div>
                    ใช้ Dropdown หมวดหมู่ เพื่อกรองเฉพาะกลุ่มที่ต้องการประกาศชื่อ เช่น เลือก <strong className="text-white">"เฉพาะที่ต้องประกาศชื่อ (Present)"</strong> หรือกรองอ่านเฉพาะกลุ่ม <strong className="text-white">"VIP"</strong> 
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <CheckCircle2 className="w-5 h-5 text-[#00E676]" /> 2. การควบคุมการอ่าน (Teleprompter Control)
            </h3>
            <div className="bg-[#0A1326]/50 rounded-xl p-5 border border-white/5 space-y-3">
              <ul className="space-y-4 text-zinc-400">
                <li className="flex items-start gap-3">
                  <div className="bg-zinc-800 px-2 py-1 rounded text-white text-xs font-bold shrink-0 mt-0.5">A- / A+</div>
                  <div>ใช้ปุ่มมุมขวาบนของจอเพื่อย่อ/ขยาย ขนาดตัวอักษรให้พอดีกับสายตาของพิธีกร</div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-[#00E676] px-2 py-1 rounded text-black text-xs font-bold shrink-0 mt-0.5 flex items-center"><CheckCircle2 size={12} className="mr-1"/> อ่านแล้ว</div>
                  <div>
                    เมื่ออ่านรายชื่อบนจอจบแล้ว ให้กดปุ่ม <strong>"อ่านแล้ว & ถัดไป"</strong> ระบบจะประทับตราว่าคนนี้อ่านแล้ว และเลื่อนรายชื่อคนต่อไปขึ้นมาแสดงตรงกลางจอโดยอัตโนมัติ
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-purple-900/30 px-2 py-1 rounded border border-purple-800/50 text-purple-400 text-xs font-bold shrink-0 mt-0.5">🎮 Remote Pointer</div>
                  <div>
                    รองรับการใช้งานพรีเซนต์เตอร์คลิกเกอร์ <strong className="text-white">กดปุ่ม Next (➡️)</strong> เพื่อบันทึกว่าอ่านแล้วและเลื่อนไปคิวถัดไป หรือ <strong className="text-white">กดปุ่ม Prev (⬅️)</strong> เพื่อย้อนกลับไปดูคิวก่อนหน้าได้ทันที
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="text-[#00E676] shrink-0 mt-0.5"><Clock size={16}/></div>
                  <div>
                    <strong className="text-white block">ระบบประเมินเวลา (ETA)</strong>
                    ระบบจะคำนวณความเร็วในการอ่านของคุณ และประเมินเวลา (ETA) ที่คิวถัดๆ ไปจะถูกอ่านถึง ไปแสดงที่รายการด้านขวามือ
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <MessageSquare className="w-5 h-5 text-amber-400" /> 3. ระบบ Real-time และการสื่อสาร
            </h3>
            <div className="bg-[#0A1326]/50 rounded-xl p-5 border border-white/5 space-y-3">
              <p className="text-zinc-400">
                หน้าจอนี้เชื่อมต่อกับฐานข้อมูลแบบ <strong className="text-emerald-400">Real-time 100%</strong> หากทีมงาน (SM) เพิ่มชื่อแขก สลับลำดับคิว หรือแจ้งเตือนสถานะการมาถึง ข้อมูลจะอัปเดตบนจอพิธีกรทันที
              </p>
              <ul className="space-y-3 mt-2 text-zinc-400">
                <li>• หากแขกมาสายและเพิ่งลงทะเบียน ระบบจะแทรกคิวและขึ้นป้าย <strong className="text-red-400">เพิ่งมาถึง!</strong> ทันที</li>
                <li>• หากทีมงานส่งข้อความด่วน (SMS) มาหา จะแสดงเป็นตัววิ่งด้านบน หรือแบนเนอร์ใหญ่กลางจอ</li>
                <li>• หากพิธีกรติดปัญหา สามารถกดปุ่ม <strong className="text-red-500">SOS</strong> มุมขวาบน เพื่อส่งข้อความกลับไปหาทีมงานได้เช่นกัน</li>
              </ul>
            </div>
          </section>
          <section>
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Users className="w-5 h-5 text-fuchsia-400" /> 4. สัญลักษณ์สีของแถบรายชื่อ (Status Colors)
            </h3>
            <div className="bg-[#0A1326]/50 rounded-xl p-5 border border-white/5 space-y-4">
              <p className="text-zinc-400">
                รายการคิวทางขวามือจะมีเส้นแถบสีบอกสถานะการมาถึงของแขกแบบ Real-time เพื่อให้พิธีกรตัดสินใจอ่านรายชื่อได้อย่างแม่นยำ:
              </p>
              <ul className="space-y-4 text-zinc-400">
                <li className="flex gap-3 items-start bg-blue-900/20 p-3 rounded-lg border border-blue-500/30">
                  <div className="w-1.5 h-10 bg-blue-500 rounded-full shrink-0"></div>
                  <div>
                    <strong className="text-blue-300 block mb-0.5">แถบสีน้ำเงิน (Active)</strong>
                    รายชื่อคิวปัจจุบันที่กำลังแสดงอยู่บนหน้าจอ Prompter ให้พิธีกรอ่าน
                  </div>
                </li>
                <li className="flex gap-3 items-start bg-emerald-900/20 p-3 rounded-lg border border-emerald-500/30">
                  <div className="w-1.5 h-10 bg-emerald-500 rounded-full shrink-0"></div>
                  <div>
                    <strong className="text-emerald-400 block mb-0.5">แถบสีเขียว (Arrived)</strong>
                    แขก <strong className="text-white">Check-in เข้างานในระบบแล้ว</strong> (พิธีกรสามารถประกาศชื่อได้อย่างมั่นใจ)
                  </div>
                </li>
                <li className="flex gap-3 items-start bg-orange-900/20 p-3 rounded-lg border border-orange-500/30">
                  <div className="w-1.5 h-10 bg-orange-500 rounded-full shrink-0"></div>
                  <div>
                    <strong className="text-orange-400 block mb-0.5">แถบสีส้ม (Pending)</strong>
                    แขก <strong className="text-white">ยังไม่มา หรือ รอการ Check-in</strong> (หากใกล้ถึงคิวแต่ยังเป็นสีส้ม พิธีกรอาจประเมินข้ามคิวไปก่อนได้)
                  </div>
                </li>
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ==========================================
// 🌟 Component หลักสำหรับเนื้อหา (แยกออกมาเพื่อใช้คู่กับ Suspense)
// ==========================================
function McPrompterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('event_id') || 'current';

  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeIndex, setActiveIndex] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [textScale, setTextScale] = useState<number>(0.9);

  const [filterMode, setFilterMode] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('priority_asc'); 
  const [isManualOpen, setIsManualOpen] = useState(false); 

  const filterLabels = [
    { id: 'All', label: '📋 ทั้งหมด (All)' },
    { id: 'Present', label: '🎤 ที่ต้องประกาศชื่อ (Present)' },
    { id: 'Act1', label: '🎭 คิวพิเศษ 1' },
    { id: 'Act2', label: '🎬 คิวพิเศษ 2' },
    { id: 'VIP', label: '🌟 เฉพาะ VIP' },
    { id: 'General', label: '👥 เฉพาะ General' },
    { id: 'Pending', label: '⏳ สถานะ: รอเข้างาน (Pending)' },
    { id: 'Arrived', label: '✅ สถานะ: มาถึงแล้ว (Arrived)' },
  ];

  const [cueDurations, setCueDurations] = useState<number[]>([]);
  const [lastCueTime, setLastCueTime] = useState<number | null>(null);

  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [incomingMessages, setIncomingMessages] = useState<IncomingMsg[]>([]);
  const [urgentSms, setUrgentSms] = useState<{ text: string, sender: string } | null>(null);
  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);

  const [showSosModal, setShowSosModal] = useState(false);
  const [sosText, setSosText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [quickSosMessages, setQuickSosMessages] = useState([
    "ขอน้ำดื่มด่วน", "ขอข้ามคิวนี้ก่อน", "ไมโครโฟนมีปัญหา", "ขอเวลาเพิ่ม 3 นาที"
  ]);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchEventDataAndAttendees = async () => {
    setLoading(true);
    try {
      let actualEventId = eventId;

      if (eventId === 'current') {
        const { data: evData } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(1).single();
        if (evData) { setEventData(evData); setActiveEventId(evData.id); actualEventId = evData.id; }
      } else {
        const { data: evData } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (evData) { setEventData(evData); setActiveEventId(evData.id); }
      }

      let query = supabase.from('event_attendees').select('*');
      if (actualEventId && actualEventId !== 'current') query = query.eq('event_id', actualEventId);

      const { data, error } = await query;
      if (error) throw error;
      setAttendees(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEventDataAndAttendees(); }, [eventId]);

  useEffect(() => {
    if (!activeEventId) return;

    const attendeeChannel = supabase.channel(`prompter_updates_${activeEventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${activeEventId}` },
        () => {
          console.log("🔄 ข้อมูลรายชื่อเปลี่ยน (Real-time Sync อัปเดต)");
          fetchEventDataAndAttendees();
        }
      ).subscribe();

    const smsChannel = supabase.channel(`receive-sms-eta-${activeEventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${activeEventId}` },
        (payload) => {
          const newMsg = payload.new;
          const isFromSM = newMsg.sender_role === 'sm' || newMsg.sender_role === 'admin';
          const isForETA = !newMsg.target_screen || ['all', 'mc_eta', 'mc_prompter_eta'].includes(newMsg.target_screen);

          if (isFromSM && isForETA) {
            const finalMessage = newMsg.message_text || "ไม่มีข้อความ";
            const finalSender = newMsg.sender_name || "ศูนย์อำนวยการ";
            const timeStr = new Date(newMsg.created_at || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            setUrgentSms({ text: finalMessage, sender: finalSender });
            setUrgentIntercomMsg(finalMessage);
            setShowUrgentBanner(true);

            setIncomingMessages(prev => [{
              id: newMsg.id || Date.now().toString(),
              time: timeStr,
              text: finalMessage,
              isShowingOnMarquee: true
            }, ...prev]);
            setIsInboxOpen(true);
          }
        }).subscribe();

    return () => {
      supabase.removeChannel(attendeeChannel);
      supabase.removeChannel(smsChannel);
    };
  }, [activeEventId]);

  const marqueeDisplayText = useMemo(() => {
    const activeMessages = incomingMessages.filter(msg => msg.isShowingOnMarquee);
    if (activeMessages.length === 0) return "ยินดีต้อนรับเข้าสู่ระบบ NiiVaa Smart Prompter | พร้อมสำหรับการประกาศรายชื่อ";
    return activeMessages.map(msg => `🔴 ประกาศด่วน [เวลา ${msg.time}]: ${msg.text}`).join('  ✦✦✦  ');
  }, [incomingMessages]);

  const toggleMarquee = (id: string) => {
    setIncomingMessages(prev => prev.map(msg => msg.id === id ? { ...msg, isShowingOnMarquee: !msg.isShowingOnMarquee } : msg));
  };
  const resolveMessage = (id: string) => {
    setIncomingMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const filteredAttendees = useMemo(() => {
    if (!attendees) return [];
    let result = [...attendees];

    const currentFilterId = filterLabels[filterMode]?.id;
    const getType = (val: any) => val ? String(val).trim().toUpperCase() : '';

    switch (currentFilterId) {
      case 'Present': result = result.filter(a => a.is_present === true || String(a.is_present).toUpperCase() === 'Y' || String(a.is_present).toUpperCase() === 'TRUE'); break;
      case 'Act1': result = result.filter(a => a.special_act1 && a.special_act1.trim() !== ''); break;
      case 'Act2': result = result.filter(a => a.special_act2 && a.special_act2.trim() !== ''); break;
      case 'VIP': case 'General': result = result.filter(a => getType(a.attendee_type) === currentFilterId.toUpperCase()); break;
      case 'Pending': result = result.filter(a => (a.status || '').toLowerCase() === 'pending'); break;
      case 'Arrived': result = result.filter(a => (a.status || '').toLowerCase() === 'arrived'); break;
      case 'All': default: break;
    }

    switch (sortBy) {
      case 'seq_asc':
        result.sort((a, b) => (a.action_sequence ?? 9999) - (b.action_sequence ?? 9999));
        break;
      case 'priority_asc':
        result.sort((a, b) => (a.priority_level ?? 9999) - (b.priority_level ?? 9999));
        break;
      case 'seat_asc':
        result.sort((a, b) => (a.seat_number || 'ZZ').localeCompare(b.seat_number || 'ZZ'));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        break;
      case 'latest':
        result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      default:
        break;
    }

    return result;
  }, [attendees, filterMode, sortBy]);

  useEffect(() => {
    setActiveIndex(0); setReadIds(new Set()); setCueDurations([]); setLastCueTime(null);
  }, [filterMode, sortBy]);

  const defaultDurationMs = 15000;
  const avgDurationMs = cueDurations.length > 0 ? cueDurations.reduce((a, b) => a + b, 0) / cueDurations.length : defaultDurationMs;

  const handleMarkAsRead = (id: string) => {
    const now = Date.now();
    if (lastCueTime) {
      const diff = now - lastCueTime;
      if (diff < 120000) setCueDurations(prev => [...prev, diff]);
    }
    setLastCueTime(now);
    setReadIds(prev => new Set(prev).add(id));

    const nextUnreadIndex = filteredAttendees.findIndex((a, idx) => idx > activeIndex && !readIds.has(a.id));
    if (nextUnreadIndex !== -1) setActiveIndex(nextUnreadIndex);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (['PageDown', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault(); 
        const currentAtt = filteredAttendees[activeIndex];
        if (currentAtt) {
          if (!readIds.has(currentAtt.id)) {
            handleMarkAsRead(currentAtt.id);
          } else {
            if (activeIndex < filteredAttendees.length - 1) {
              setActiveIndex(prev => prev + 1);
            }
          }
        }
      }
      else if (['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        if (activeIndex > 0) {
          setActiveIndex(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredAttendees, readIds]); 

  const getEtaString = (index: number) => {
    if (index === activeIndex) return 'คิวปัจจุบัน';
    if (index < activeIndex || readIds.has(filteredAttendees[index].id)) return 'อ่านแล้ว';
    let unreadAhead = 0;
    for (let i = activeIndex; i < index; i++) {
      if (!readIds.has(filteredAttendees[i].id)) unreadAhead++;
    }
    const etaDate = new Date(Date.now() + (unreadAhead * avgDurationMs));
    return `${etaDate.getHours().toString().padStart(2, '0')}:${etaDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const activeAttendee = filteredAttendees[activeIndex];

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
    if (!quickSosMessages.includes(sosText)) {
      setQuickSosMessages(prev => [sosText, ...prev]);
    }
  };

  const handleDeleteSosMessage = (msgToDelete: string) => {
    if (window.confirm(`ต้องการลบข้อความ "${msgToDelete}" ใช่หรือไม่?`)) {
      setQuickSosMessages(prev => prev.filter(msg => msg !== msgToDelete));
    }
  };

  const handleSendSOS = async (presetText?: string) => {
    const messageToSend = typeof presetText === 'string' ? presetText : sosText;
    if (!messageToSend || !messageToSend.trim() || !activeEventId) return;

    try {
      await supabase.from('event_live_messages').insert({
        event_id: activeEventId,
        sender_name: 'พิธีกร (หน้า ETA)',
        sender_role: 'mc',
        message_text: `🚨 SOS ด่วน: ${messageToSend.trim()}`,
        is_approved: true,
        target_screen: 'staff'
      });
      setShowSosModal(false);
      setSosText('');
    } catch (err) { console.error("ส่ง SOS ล้มเหลว:", err); }
  };

  return (
    <div className="h-screen bg-[#050B14] text-white flex flex-col font-sans overflow-hidden">
      
      <McPrompterManualDrawer isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      {showUrgentBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-4xl bg-red-600/95 backdrop-blur-md border-2 border-red-400 text-white p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-in slide-in-from-top-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-2 text-amber-300">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            <h2 className="text-2xl font-black tracking-wider">ข้อความด่วนจากผู้กำกับเวที (SM)</h2>
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <p className="text-3xl font-bold leading-relaxed">{urgentIntercomMsg}</p>
          <button onClick={() => setShowUrgentBanner(false)} className="mt-6 px-8 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2">
            <X size={18} /> รับทราบและปิดข้อความ
          </button>
        </div>
      )}

      <header className="bg-[#0A1326]/95 backdrop-blur-md border-b border-[#00E676]/30 shrink-0 shadow-lg print:hidden z-50">
        <div className="px-6 py-3 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-4">
            <Link href={`/officialeventdashboard?type=official`} className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg transition-colors" title="กลับไปหน้า Operation Monitor">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa Logo" className="h-8 object-contain" />
              <div>
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00E676] tracking-wide">
                  MC PROMPTER
                </h1>
                <p className="text-[10px] text-[#00E676]/80 font-bold uppercase tracking-widest">
                  {eventData?.title ? `${eventData.title} | ${eventData.location_hotel || ''}` : 'Smart Teleprompter & Cue Engine'}
                </p>
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
            
            <button onClick={() => router.push(`/eventdashboard/attendees?event_id=${eventId}`)} className="flex items-center gap-2 bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              <Users size={14} /> จัดการลงทะเบียน
            </button>
            <button onClick={() => router.push(`/officialeventdashboard/mc-script?event_id=${eventId}`)} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
              <FileText size={14} /> สคริปต์พิธีการ
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-black text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-md">
              <Printer size={14} /> พิมพ์สคริปต์สำรอง
            </button>
            <button onClick={() => setIsManualOpen(true)} className="flex items-center gap-2 bg-[#00E676]/20 hover:bg-[#00E676]/40 text-[#00E676] border border-[#00E676]/50 text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm ml-1">
              <HelpCircle size={14} /> คู่มือ
            </button>
          </div>
        </div>

        <div className="px-6 py-3 flex justify-between items-center relative">
          <div className="flex items-center gap-4 w-full mr-4">
            
            <div className="relative shrink-0">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(Number(e.target.value))}
                className="appearance-none bg-zinc-900 border border-white/10 text-white font-bold text-sm rounded-xl pl-4 pr-10 py-2 outline-none focus:border-cyan-500 cursor-pointer min-w-[200px]"
              >
                {filterLabels.map((label, index) => (
                  <option key={label.id} value={index}>{label.label}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-2.5 text-zinc-400 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-zinc-900 border border-white/10 text-[#00E676] font-bold text-sm rounded-xl pl-4 pr-10 py-2 outline-none focus:border-[#00E676] cursor-pointer min-w-[240px]"
              >
                <option value="priority_asc">⭐ เรียงตาม: ความสำคัญ (Priority)</option>
                <option value="seq_asc">🔢 เรียงตาม: ลำดับคิว (Sequence)</option>
                <option value="seat_asc">🪑 เรียงตาม: เลขที่นั่ง (Seat)</option>
                <option value="latest">⏱️ เรียงตาม: ลงทะเบียนล่าสุด</option>
                <option value="oldest">⏳ เรียงตาม: ลงทะเบียนก่อน</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-2.5 text-zinc-400 pointer-events-none" />
            </div>

            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg px-4 py-1.5 flex items-center w-full max-w-xl overflow-hidden relative">
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
            className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
          >
            <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
          </Link>
          
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => setShowSosModal(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              <AlertTriangle size={16} /> SOS
            </button>
            <div className="flex flex-col items-end justify-center bg-zinc-900/80 px-4 py-1.5 rounded-xl border border-white/5">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none mb-0.5">Local Time</span>
              <span className="font-mono text-xl font-black text-pink-400 tracking-wider leading-none">
                {mounted ? time.toLocaleTimeString('th-TH') : '--:--:--'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex p-4 gap-4 print:hidden">
        <div className="flex-[7] bg-[#0A1326]/50 rounded-3xl border border-[#1E3A68] flex flex-col shadow-2xl relative overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00E676]/10 rounded-full blur-[100px]"></div>

          <div className="absolute top-5 right-5 flex flex-col items-end gap-3 z-20">
            <div className="flex gap-2">
              <button onClick={() => setTextScale(s => Math.max(0.5, s - 0.05))} className="bg-[#1E3A68]/80 hover:bg-[#1E3A68] text-cyan-200 px-4 py-2 rounded-lg text-sm font-bold border border-cyan-500/30 transition-colors shadow-lg" title="ลดขนาดตัวอักษร">A-</button>
              <button onClick={() => setTextScale(s => Math.min(1.5, s + 0.05))} className="bg-[#1E3A68]/80 hover:bg-[#1E3A68] text-cyan-200 px-4 py-2 rounded-lg text-sm font-bold border border-cyan-500/30 transition-colors shadow-lg" title="เพิ่มขนาดตัวอักษร">A+</button>
            </div>

            <button
              disabled={!activeAttendee || readIds.has(activeAttendee?.id)}
              onClick={() => activeAttendee && handleMarkAsRead(activeAttendee.id)}
              className="bg-gradient-to-r from-[#00E676] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-lg font-black py-3 px-6 rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(0,230,118,0.4)] disabled:opacity-30 disabled:cursor-not-allowed group border border-[#00E676]/50"
            >
              <CheckCircle2 size={24} />
              อ่านแล้ว & ถัดไป
              <FastForward size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="p-6 md:p-8 mt-4 flex-1 flex flex-col justify-start relative z-10 overflow-y-auto custom-scrollbar pr-4 md:pr-56">
            {loading ? (
              <div className="text-center text-zinc-500 animate-pulse mt-10">กำลังโหลดสคริปต์...</div>
            ) : filteredAttendees.length === 0 ? (
              <div className="text-center text-zinc-500 text-2xl font-bold mt-10">ไม่มีคิวในหมวดหมู่นี้</div>
            ) : activeAttendee ? (
              <div className="animate-in slide-in-from-right-8 duration-300 fade-in w-full">

                <div style={{ transform: `scale(${textScale})`, transformOrigin: 'top left' }} className="transition-transform duration-200 w-full">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-[#00E676] text-black text-xl font-black px-5 py-1.5 rounded-xl shadow-[0_0_20px_rgba(0,230,118,0.4)]">
                      คิวที่ {activeIndex + 1}
                    </div>
                    <div className="bg-zinc-800/80 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 uppercase tracking-widest">
                      {filterLabels[filterMode]?.label || 'คิวงาน'}
                    </div>
                  </div>

                  {activeAttendee.role_in_event && (
                    <div className="mb-3 inline-block bg-blue-900/40 border border-blue-500/40 px-3 py-1.5 rounded-lg text-blue-300 text-sm font-bold tracking-wide">
                      บทบาท: {activeAttendee.role_in_event}
                    </div>
                  )}

                  <div className="mb-4">
                    <h2 className="text-3xl text-zinc-400 font-medium mb-1">{activeAttendee.prefix || ''}</h2>
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-[#00E676] leading-tight">
                      {activeAttendee.fullname}
                    </h1>
                  </div>

                  <div className="space-y-2 mb-4">
                    {activeAttendee.position && (
                      <div className="text-3xl text-amber-400 font-bold leading-snug">
                        {activeAttendee.position}
                      </div>
                    )}
                    {activeAttendee.organization && (
                      <div className="text-2xl text-amber-200/70 font-medium flex items-center gap-3">
                        <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                        {activeAttendee.organization}
                      </div>
                    )}
                  </div>

                  {(activeAttendee.gift_number || activeAttendee.gift_style) && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {activeAttendee.gift_number && (
                        <div className="flex items-center gap-2 bg-pink-950/40 border border-pink-500/30 px-4 py-2 rounded-xl text-pink-300 text-base font-bold">
                          <Gift size={18} /> หมายเลข: <span className="text-yellow-400 font-mono text-xl">{activeAttendee.gift_number}</span>
                        </div>
                      )}
                      {activeAttendee.gift_style && (
                        <div className="flex items-center gap-2 bg-pink-950/40 border border-pink-500/30 px-4 py-2 rounded-xl text-pink-300 text-base font-bold">
                          <Gift size={18} /> รูปแบบ: <span className="text-white">{activeAttendee.gift_style}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeAttendee.bio_note && (
                    <div className="bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-2xl">
                      <p className="text-xl text-blue-100 font-medium leading-relaxed whitespace-pre-wrap">
                        {activeAttendee.bio_note}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center text-[#00E676] text-2xl font-black mt-10">🎉 อ่านครบทุกคิวแล้ว!</div>
            )}
          </div>
        </div>

        <div className="flex-[3] bg-[#0A1326] rounded-3xl border border-[#1E3A68] shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-zinc-900/30 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <ListChecks className="text-cyan-400" size={20} />
              <h3 className="font-black text-base text-white">ลำดับคิวทั้งหมด</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 font-mono hidden xl:block">
                <Clock size={10} className="inline mr-1" /> เฉลี่ย {(avgDurationMs / 1000).toFixed(1)} วิ/คิว
              </span>
              <span className="bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                {filteredAttendees.length} คิว
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-scroll overflow-x-hidden p-3 space-y-2 custom-scrollbar">
            {filteredAttendees.map((att, index) => {
              const isRead = readIds.has(att.id);
              const isActive = index === activeIndex;
              const isSkipped = index < activeIndex && !isRead;
              const isLateArrival = isSkipped && att.status !== 'pending';
              const statusBorderColor = att.status === 'pending' ? 'border-l-orange-500' : 'border-l-emerald-500';

              return (
                <div
                  key={att.id}
                  onClick={() => setActiveIndex(index)}
                  title={att.status === 'pending' ? 'สถานะ: รอยืนยัน' : 'สถานะ: มาถึงแล้ว'}
                  className={`relative p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group border-y border-r border-l-[5px] ${statusBorderColor}
                    ${isActive ? 'bg-blue-900/40 border-y-blue-500 border-r-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      : isLateArrival ? 'bg-emerald-900/30 border-y-emerald-500/50 border-r-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : isRead ? 'bg-zinc-900/30 border-y-transparent border-r-transparent opacity-40 hover:opacity-100'
                          : 'bg-zinc-900/80 border-y-white/5 border-r-white/5 hover:border-y-white/20 hover:border-r-white/20 hover:bg-zinc-800'
                    }`}
                >
                  {isLateArrival && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-lg z-10">เพิ่งมาถึง!</div>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isActive ? 'bg-blue-500 text-white' : isRead ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-800 text-zinc-300'}`}>
                    {isRead ? <CheckCircle2 size={16} className="text-emerald-500" /> : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold truncate text-sm ${isActive || isLateArrival ? 'text-white' : isRead ? 'text-zinc-500' : 'text-zinc-200'}`}>{att.fullname}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-blue-300' : 'text-zinc-600'}`}>{att.position || att.organization || '-'}</div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase mb-0.5">ETA</div>
                    <div className={`font-mono text-xs font-black ${isActive ? 'text-[#00E676]' : isRead ? 'text-zinc-600' : 'text-cyan-400'}`}>
                      {getEtaString(index)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden print:block text-black bg-white p-8">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black mb-2">{eventData?.title || 'สคริปต์รายชื่อสำรอง (Backup Script)'}</h1>
            <h2 className="text-lg font-bold text-gray-700">{eventData?.brand_name || 'ไม่ระบุหน่วยงาน'} | {eventData?.location_hotel || 'ไม่ระบุสถานที่'}</h2>
            <p className="text-sm text-gray-500 mt-1">{eventData?.event_date || 'ไม่ระบุวันที่'}</p>
            <div className="mt-4 bg-gray-100 border border-gray-300 px-4 py-2 inline-block rounded-lg">
              <span className="font-bold">หมวดหมู่:</span> {filterLabels[filterMode]?.label} | <span className="font-bold">จำนวน:</span> {filteredAttendees.length} ท่าน
            </div>
          </div>
          <img src="/niivaasmartevent_logo.png" alt="NiiVaa Logo" className="h-12 object-contain" />
        </div>
        <div className="space-y-6">
          {filteredAttendees.map((att, index) => (
            <div key={att.id} className="flex gap-4 items-start border-b border-gray-200 pb-4">
              <div className="text-2xl font-black text-gray-400 pt-1 w-12 text-center">{(index + 1).toString().padStart(2, '0')}</div>
              <div className="flex-1">
                <h3 className="text-2xl font-black mb-1">{att.prefix}{att.fullname}</h3>
                <div className="text-lg font-bold text-gray-800">{att.position}</div>
                <div className="text-gray-600">{att.organization}</div>
                {att.bio_note && <p className="mt-2 text-sm text-gray-700 italic border-l-2 border-gray-300 pl-3">{att.bio_note}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showSosModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#0A1326] border border-red-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-red-950/40">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> ส่งสัญญาณความช่วยเหลือ (SOS)
              </h2>
              <button onClick={() => setShowSosModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-zinc-400 font-medium">ส่งข้อความด่วนไปยังหน้าจอ Monitor หลัก (สามารถสร้างและบันทึกข้อความเตรียมไว้ได้)</p>

              <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
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

              <div className="relative">
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
                  <button onClick={handleSaveSosMessage} disabled={!sosText.trim()} className="p-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:text-amber-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-all" title="บันทึกเป็นข้อความสำรอง">
                    <Save size={16} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleSendSOS(sosText)}
                disabled={!sosText.trim()}
                className="w-full bg-red-900/80 hover:bg-red-700 text-red-200 font-black text-lg py-4 rounded-xl mt-2 transition-all flex items-center justify-center gap-2 border border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare size={20} /> ส่งออกไปยัง Live Monitor
              </button>
            </div>
          </div>
        </div>
      )}

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
                      title="จัดการเสร็จสิ้นแล้ว ลบทิ้งได้"
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

// ==========================================
// 🚀 Component หลักที่ Export (มี Suspense + RouteGuard)
// ==========================================
export default function McPrompterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050B14] flex items-center justify-center text-[#00E676] font-bold">กำลังโหลดหน้าจอพิธีกร...</div>}>
      <RouteGuard allowedRoles={['admin', 'mc']}>
        <McPrompterContent />
      </RouteGuard>
    </Suspense>
  );
}