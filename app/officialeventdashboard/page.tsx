"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  ArrowLeft, FileText, Activity, MessageSquare,
  Send, BellRing, Users, Megaphone, AlertTriangle, MonitorPlay, Settings, Check, Trash2, LayoutGrid
} from 'lucide-react';

// ==========================================
// Types
// ==========================================
type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  time: string;
  isAlert: boolean;
  target: string;
};

type AgendaItem = {
  id: string;
  sequence: number;
  title: string;
  description: string;
  start_time?: string;
  duration_minutes?: number;
};

// ==========================================
// Component หลัก
// ==========================================
function LiveMonitorContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const supabase = createClient();

  // --- States ---
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAlertMc, setIsAlertMc] = useState(true);

  // 🌟 State สำหรับเก็บข้อความวิ่งโดยเฉพาะ
  const [marqueeMessages, setMarqueeMessages] = useState<ChatMessage[]>([]);

  const [targetScreen, setTargetScreen] = useState('all');
  const [monitorUrl, setMonitorUrl] = useState('');
  const [showStateCeremonyCards, setShowStateCeremonyCards] = useState(false);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventInfo, setEventInfo] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ตัวแปรสำหรับคำนวณการย่อส่วนจอภาพ
  const monitorRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setScaleFactor(entries[0].contentRect.width / 1440);
      }
    });
    if (monitorRef.current) resizeObserver.observe(monitorRef.current);
    return () => resizeObserver.disconnect();
  }, [monitorUrl]);

  // ตัวเลือกส่ง SMS
  const SCREEN_OPTIONS = [
    { id: 'all', label: '📢 ส่งหาทุกหน้าจอ (ALL)' },
    { id: 'mc_vip', label: '🖥️ 1. หน้าพิธีกรอ่านรายชื่อ (VIP)' },
    { id: 'mc_script', label: '📄 2. หน้าสคริปต์พิธีการ (Official)' },
    { id: 'mc_prompter_eta', label: '⏱️ 3. หน้าพิธีกรอ่านรายชื่อ (ETA)' },
    { id: 'mc_script_edit', label: '📝 4. หน้าสคริปต์พิธีการ (Edit)' },
    { id: 'mc_view', label: '🪷 5. หน้าสคริปต์วางพานพุ่ม' },
    { id: 'registration', label: '👥 6. หน้าจุดลงทะเบียนแขก (Registration)' },
    { id: 'marquee', label: '📱 ส่งเข้าจอมือถือแขก (Marquee / Attendee)' }
  ];

  // ตั้งค่าเริ่มต้นจอมอนิเตอร์
  useEffect(() => {
    if (eventId && !monitorUrl) setMonitorUrl(`/eventdashboard/live/${eventId}`);
  }, [eventId]);

  // นาฬิกาเดินทุก 1 นาที เพื่ออัปเดต Marquee
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ดึงข้อมูลหลักจาก Supabase
  useEffect(() => {
    if (!eventId) return;

    const fetchInitialData = async () => {

      // 1. ดึงข้อความแชท (กรองเฉพาะข้อความประสานงานทีม)
      const { data: chatData } = await supabase
        .from('event_live_messages')
        .select('*')
        .eq('event_id', eventId)
        .or('sender_role.in.(staff,sm,mc),target_screen.in.(staff,mc,sm)')
        .order('created_at', { ascending: true });

      if (chatData) {
        setMessages(chatData.map(msg => ({
          id: msg.id, sender: msg.sender_name || 'Staff', text: msg.message_text,
          time: new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          isAlert: msg.sender_role === 'sm' || msg.sender_role === 'admin', target: msg.target_screen || 'all'
        })));
      }

      // 1.5 ดึงข้อความแขก (สำหรับ Marquee)
      const { data: guestData } = await supabase
        .from('event_live_messages')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_approved', true)
        .in('target_screen', ['all', 'marquee'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (guestData) {
        setMarqueeMessages(guestData.map(msg => ({
          id: msg.id, sender: msg.sender_name || 'Guest', text: msg.message_text,
          time: new Date(msg.created_at).toLocaleTimeString('th-TH'),
          isAlert: false, target: msg.target_screen || 'all'
        })));
      }

      // 2. ดึงสคริปต์กำหนดการ
      const { data: agendaData, error: agendaError } = await supabase
        .from('event_agenda_items')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true, nullsFirst: false });

      if (agendaError) console.error("โหลดข้อมูล Marquee ไม่สำเร็จ:", agendaError);
      if (agendaData) setAgendaItems(agendaData);

      // 3. ดึงข้อมูลรายละเอียดงาน
      const { data: eData, error: eError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (!eError && eData) {
        setEventInfo(eData);
      } else {
        console.error("โหลดข้อมูลชื่องานไม่สำเร็จ:", eError);
      }
    };

    fetchInitialData();

    // Subscribe รับข้อความใหม่แบบ Realtime
    const channel = supabase.channel(`live-monitor-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const newMsg = payload.new as any;
          const formattedMsg = {
            id: newMsg.id, sender: newMsg.sender_name || 'User', text: newMsg.message_text,
            time: new Date(newMsg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            isAlert: newMsg.sender_role === 'sm', target: newMsg.target_screen || 'all'
          };

          // เช็คว่าเป็นแชททีมงานไหม
          const isFromStaff = ['staff', 'sm', 'mc'].includes(newMsg.sender_role);
          const isToStaff = ['staff', 'sm', 'mc'].includes(newMsg.target_screen);

          if (isFromStaff || isToStaff) {
            setMessages(prev => [...prev, formattedMsg]);
          }

          // เช็คว่าเป็นข้อความที่ควรเข้า Marquee ไหม
          if (newMsg.is_approved && ['all', 'marquee'].includes(newMsg.target_screen)) {
            setMarqueeMessages(prev => [formattedMsg, ...prev].slice(0, 10));
          }

        }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId, supabase]);

  const handleSendMessage = async (e: React.FormEvent, isSos: boolean = false) => {
    e.preventDefault();
    const textToSend = isSos ? "🚨 SOS! ต้องการความช่วยเหลือด่วนที่หน้าเวที!" : newMessage;
    if (!textToSend.trim() || !eventId) return;

    setNewMessage('');

    try {
      await supabase.from('event_live_messages').insert({
        event_id: eventId,
        sender_name: isSos ? 'SM (ฉุกเฉิน)' : 'ศูนย์อำนวยการ (SM)',
        sender_role: 'sm',
        message_text: textToSend,
        is_approved: true,
        target_screen: isAlertMc ? targetScreen : 'staff'
      });
    } catch (err) {
      console.error("ส่งข้อความล้มเหลว:", err);
    }
  };

  const formatMarqueeTimeline = () => {
    const defaultText = 'Live Operation Monitor ศูนย์บัญชาการผู้ควบคุมเวทีกลาง ระบบติดตามเหตุการณ์และประสานงาน ระหว่างคณะทำงานทั้งระบบ';
    if (!agendaItems || agendaItems.length === 0) return defaultText;

    let currentTrackMins = 0;
    const timelineParts: string[] = [];

    agendaItems.forEach((item) => {
      let startMins = 0;

      if (item.start_time) {
        const cleanTime = item.start_time.replace(/[^0-9:]/g, '');
        if (cleanTime) {
          const [h, m] = cleanTime.split(':').map(Number);
          startMins = (h || 0) * 60 + (m || 0);
        }
      } else {
        startMins = currentTrackMins === 0 ? 480 : currentTrackMins;
      }

      const duration = item.duration_minutes || 0;
      currentTrackMins = startMins + duration;

      const hh = String(Math.floor(startMins / 60) % 24).padStart(2, '0');
      const mm = String(startMins % 60).padStart(2, '0');

      if (item.title) {
        timelineParts.push(`${hh}:${mm} น. ${item.title}`);
      }
    });

    if (timelineParts.length === 0) return defaultText;

    return "กำหนดการ ➔ " + timelineParts.join(' ➔ ');
  };

  const latestAlert = messages.filter(m => m.isAlert).slice(-1)[0];

  const handleDeleteMessage = async (msgId: string) => {
    const isConfirm = window.confirm('คุณต้องการลบข้อความนี้ใช่หรือไม่?');
    if (!isConfirm) return;

    try {
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== msgId));
      const { error } = await supabase
        .from('event_live_messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อความ');
    }
  };

  return (
    <div className="h-screen bg-gray-950 text-gray-200 font-sans flex flex-col overflow-hidden">

      {/* ================= HEADER ================= */}
      <header className="bg-gray-900 border-b border-indigo-900/50 shrink-0 z-50 shadow-md">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">

            <div className="h-8 w-px bg-gray-700 mx-1 hidden sm:block"></div>

            <div className="hidden sm:flex items-center select-none shrink-0 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa Logo" className="h-6 w-auto object-contain drop-shadow-md" />
            </div>

            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 ml-2">
              <Activity className="w-5 h-5 text-indigo-500 animate-pulse hidden md:block" />
              Live Operation Monitor
            </h1>
          </div>
          {/* ปุ่มกลับ */}
          <Link
            href={`/events/event-dashboard/${eventId}`} // ⚠️ แก้ไข Path ให้ตรงกับ URL หน้า Hub ของคุณ
            className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
          >
            <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowStateCeremonyCards(!showStateCeremonyCards)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${showStateCeremonyCards ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
            >
              <Settings className="w-3.5 h-3.5" /> {showStateCeremonyCards ? 'ปิดโหมดรัฐพิธี' : 'เปิดโหมดรัฐพิธี (พานพุ่ม)'}
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-green-950/50 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-green-400">ONLINE</span>
            </div>
          </div>
        </div>

        {/* แถบแสดงข้อมูลชื่องาน */}
        {eventInfo && (
          <div className="w-full bg-gray-900 border-b border-gray-800 py-3 px-6 flex flex-col items-center justify-center shrink-0 z-10">
            <h1 className="text-lg md:text-xl font-bold text-emerald-400 drop-shadow-sm mb-1 text-center">
              {eventInfo.title || 'ไม่ระบุชื่องาน'}
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-gray-400">
              {eventInfo.brand_name && (
                <span className="flex items-center gap-1">
                  <span className="text-gray-500">โดย</span> {eventInfo.brand_name}
                </span>
              )}
              {(eventInfo.location_hotel || eventInfo.location_province) && (
                <>
                  <span className="text-gray-600 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">ณ</span>
                    {[
                      eventInfo.location_hotel,
                      eventInfo.location_district ? `อ.${eventInfo.location_district}` : null,
                      eventInfo.location_province ? `จ.${eventInfo.location_province}` : null
                    ].filter(Boolean).join(' ')}
                  </span>
                </>
              )}
              {eventInfo.event_date && (
                <>
                  <span className="text-gray-600 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-500">วันที่</span>{' '}
                    {new Date(eventInfo.event_date).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* TIMELINE MARQUEE */}
        <div className="bg-indigo-950/40 border-b border-indigo-900/50 px-6 py-2 flex items-center w-full overflow-hidden">
          <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 mr-3 shadow-[0_0_10px_rgba(79,70,229,0.5)]">
            TIMELINE
          </span>
          <div className="w-full overflow-hidden whitespace-nowrap flex-1">
            <div className="inline-block animate-marquee text-indigo-200 text-xs font-medium tracking-wide">
              {formatMarqueeTimeline()}
            </div>
          </div>
        </div>

        {/* ป้ายประกาศสีแดง */}
        {messages.filter(m => m.isAlert).length > 0 && (
          <div className="bg-red-600 w-full px-6 py-2.5 border-b-2 border-red-800 flex items-center shadow-[0_4px_15px_rgba(220,38,38,0.3)] overflow-hidden">
            <div className="flex items-center gap-3 shrink-0 mr-4 z-10 bg-red-600 pr-2">
              <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
              <span className="text-white font-black text-sm uppercase tracking-wider border-r border-red-400/50 pr-3">ประกาศด่วน / SOS</span>
            </div>

            <div className="w-full overflow-hidden whitespace-nowrap flex-1">
              <div className="inline-block animate-marquee text-red-100 font-bold text-base tracking-wide">
                {(messages as any[])
                  ?.filter((m: any) => m.isAlert)
                  ?.slice(-5)
                  ?.map((alert: any) => `🚨 ${alert.text} (จาก: ${alert.sender} เวลา ${alert.time})`)
                  ?.join('  |  ')}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">

        {/* ================= ซ้าย: MONITOR FRAME (7 Cols) ================= */}
        <div className="lg:col-span-7 flex flex-col h-full bg-gray-900 border border-gray-800 rounded-2xl shadow-lg overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-3 gap-2 p-3 bg-gray-950 border-b border-gray-800 shrink-0">
            {eventId && [
              { id: 'live', url: `/eventdashboard/live/${eventId}`, label: 'เวทีกลาง (Live Stage)', icon: '🎥' },
              { id: 'mc_vip', url: `/eventdashboard/showtime/vip?event_id=${eventId}`, label: '1. พิธีกรอ่านรายชื่อ (VIP)', icon: '🖥️' },
              { id: 'mc_script', url: `/officialeventdashboard/mc-script?event_id=${eventId}`, label: '2. สคริปต์พิธีการ (Official)', icon: '📄' },
              { id: 'mc_prompter_eta', url: `/eventdashboard/showtime/mc_prompter?event_id=${eventId}`, label: '3. พิธีกรอ่านรายชื่อ (ETA)', icon: '⏱️' },
              { id: 'mc_script_edit', url: `/eventdashboard/showtime/script?event_id=${eventId}`, label: '4. สคริปต์พิธีการ (Edit)', icon: '📝' },
              { id: 'mc_view', url: `/officialeventdashboard/mc-view?eventId=${eventId}`, label: '5. สคริปต์วางพานพุ่ม', icon: '🪷' },
              { id: 'attendees', url: `/eventdashboard/attendees?event_id=${eventId}`, label: 'จอลงทะเบียน (Attendees)', icon: '👥' },
              { id: 'attendees_2', url: `/eventdashboard/attendees?event_id=${eventId}`, label: 'จอลงทะเบียน (จุดที่ 2)', icon: '👥' },
              { id: 'controller', url: `/eventdashboard/showtime/controller?event_id=${eventId}`, label: 'Showtime Controller', icon: '🎛️' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMonitorUrl(opt.url)}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group bg-black shadow-inner ${monitorUrl === opt.url
                  ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-1 ring-emerald-500/50'
                  : 'border-gray-800 hover:border-gray-600 opacity-60 hover:opacity-100'
                  }`}
                title={opt.label}
              >
                <div className="absolute inset-0 z-20 cursor-pointer bg-transparent"></div>
                <iframe
                  key={opt.url}
                  src={opt.url}
                  style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: '0 0' }}
                  className="pointer-events-none border-none opacity-80 group-hover:opacity-100 transition-opacity bg-gray-950"
                  tabIndex={-1}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent pt-5 pb-1 px-2 text-[9px] sm:text-[10px] text-white truncate text-center font-bold z-30">
                  {opt.icon} {opt.label}
                </div>
              </button>
            ))}
          </div>

          <div
            ref={monitorRef}
            className="w-full h-[600px] xl:h-[800px] bg-[#0a0a0a] relative overflow-auto custom-scrollbar shrink-0 border-t-2 border-gray-800"
          >
            {monitorUrl ? (
              <div
                className="origin-top-left relative bg-gray-950"
                style={{
                  width: '1440px',
                  height: '2500px',
                  transform: `scale(${scaleFactor})`,
                  marginBottom: `calc(2500px * ${scaleFactor} - 2500px)`,
                  marginRight: `calc(1440px * ${scaleFactor} - 1440px)`
                }}
              >
                <div className="absolute inset-0 z-10 cursor-crosshair" title="จอภาพมอนิเตอร์ (โหมดดูอย่างเดียว)"></div>
                <iframe
                  key={monitorUrl}
                  src={monitorUrl}
                  className="w-full h-full border-none absolute inset-0 pointer-events-none"
                  title="Main Live Screen"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                <MonitorPlay className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-medium">กำลังโหลดหน้าจอมอนิเตอร์...</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= ขวา: STATS & COMMAND CHAT (5 Cols) ================= */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full min-h-0">

          <div className={`grid gap-4 shrink-0 ${showStateCeremonyCards ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {showStateCeremonyCards && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                <Users className="w-5 h-5 text-amber-400 mb-2" />
                <span className="text-[10px] text-gray-400 font-bold uppercase mb-1">รายงานตัวพานพุ่ม</span>
                <div className="text-2xl font-black text-white">42 <span className="text-sm font-normal text-gray-500">/ 50</span></div>
              </div>
            )}

            {/* 🌟 Marquee Monitor สำหรับ SM ที่อัปเดตแอนิเมชันให้วิ่งได้ */}
            {/* 🌟 Marquee Monitor สำหรับ SM ที่อัปเดตใหม่ให้ใช้แท็ก <marquee> */}
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-lg p-2.5 mb-3 flex items-center gap-3 shadow-sm overflow-hidden relative h-10">

              {/* ไอคอนและป้ายกำกับ (ซ้าย) */}
              <div className="flex items-center gap-2 shrink-0 z-10 bg-slate-800/80 pr-2">
                <div className="bg-blue-500/20 p-1.5 rounded-md">
                  <Megaphone className="text-blue-400 animate-pulse" size={14} />
                </div>
                <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider hidden sm:block">Guest Marquee</span>
              </div>

              {/* 🌟 ข้อความวิ่ง (ขวา) - เปลี่ยนมาใช้แท็ก <marquee> เหมือนของ TIMELINE */}
              <div className="w-full overflow-hidden whitespace-nowrap flex-1">
                <div className="inline-block animate-marquee text-xs font-medium text-slate-300 tracking-wide">
                  {(marqueeMessages as any[]).length > 0
                    ? (marqueeMessages as any[]).map((m: any) => `💬 ${m.text} (จาก: ${m.sender})`).join('  |  ')
                    : 'ยังไม่มีข้อความอวยพรจากผู้ร่วมงาน...'}
                </div>
              </div>

              {/* Fade effect ตรงขอบขวา */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-800/80 to-transparent z-10 pointer-events-none"></div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-lg flex-1 flex flex-col min-h-0">
            <div className="bg-gray-950 p-3 border-b border-gray-800 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-indigo-400" /> บอร์ดประสานงาน</h3>
              <button
                onClick={(e) => handleSendMessage(e, true)}
                className="bg-red-600/20 hover:bg-red-600 border border-red-500/50 text-red-400 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1"
              >
                <AlertTriangle size={12} /> ส่ง SOS
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 bg-black/40 relative">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs mt-10">ยังไม่มีข้อความ...</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col group">
                    <div className="flex items-baseline gap-2 mb-1 pl-1">
                      <span className={`text-[10px] font-bold ${msg.isAlert ? 'text-red-400' : 'text-indigo-400'}`}>{msg.sender}</span>
                      <span className="text-[9px] text-gray-600">{msg.time}</span>
                      {msg.target !== 'staff' && (
                        <span className="text-[8px] bg-gray-800 text-gray-400 px-1 rounded uppercase">Target: {msg.target}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`p-3 rounded-2xl text-sm w-fit max-w-[90%] transition-all
                        ${msg.isAlert
                          ? 'bg-red-950/40 border border-red-500/50 text-red-100 rounded-tl-sm shadow-[0_0_10px_rgba(220,38,38,0.2)]'
                          : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'}`}
                      >
                        {msg.isAlert && <div className="flex items-center text-[10px] font-black text-red-500 mb-1"><Check className="w-3 h-3 mr-1" /> ดันขึ้นจอเป้าหมายแล้ว</div>}
                        {msg.text}
                      </div>

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 bg-red-500/10 text-red-500/50 hover:bg-red-500 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                        title="ลบข้อความนี้"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-gray-950 border-t border-gray-800 shrink-0">
              <form onSubmit={(e) => handleSendMessage(e, false)} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer w-fit group">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={isAlertMc} onChange={(e) => setIsAlertMc(e.target.checked)} />
                      <div className={`block w-10 h-6 rounded-full transition-colors ${isAlertMc ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-gray-700'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAlertMc ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                    <span className={`text-xs font-bold transition-colors ${isAlertMc ? 'text-red-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                      <BellRing className="w-3 h-3 inline mb-0.5 mr-1" /> ประกาศหน้าจอ
                    </span>
                  </label>

                  {isAlertMc && (
                    <select
                      value={targetScreen}
                      onChange={(e) => setTargetScreen(e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-gray-300 text-[10px] font-bold rounded-lg px-2 py-1 outline-none"
                    >
                      {SCREEN_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isAlertMc ? "พิมพ์ข้อความด่วนส่งหาจอเป้าหมาย..." : "พิมพ์ข้อความประสานงานภายในทีม..."}
                    className={`flex-1 bg-gray-900 border rounded-xl px-4 py-2 text-sm text-white focus:outline-none transition-colors
                      ${isAlertMc ? 'border-red-500/50 focus:border-red-500 placeholder-red-900/50' : 'border-gray-700 focus:border-indigo-500 placeholder-gray-600'}`}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || !eventId}
                    className={`px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed
                      ${isAlertMc ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </main>

      {/* 🌟 รวบรวม CSS ทั้งหมดไว้ที่นี่ */}
      {/* 🌟 รวบรวม CSS ทั้งหมดไว้ที่นี่ */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        
        /* 🌟 แอนิเมชันสำหรับข้อความวิ่ง (แทนที่แท็ก <marquee>) */
        @keyframes pureMarquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        /* 🌟 คลาสสำหรับกรอบของข้อความวิ่ง (ต้องมี overflow-hidden และ white-space: nowrap) */
        .marquee-container {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
          display: flex;
          align-items: center;
        }
        
        /* 🌟 คลาสสำหรับตัวอักษรที่จะวิ่ง */
        .marquee-content {
          display: inline-block;
          animation: pureMarquee 20s linear infinite;
          padding-left: 100%; /* ดันข้อความไปรอที่ขอบขวา */
        }
        
        /* ปรับความเร็วสำหรับแถบ Guest Marquee (ให้วิ่งช้าลงนิดนึง) */
        .marquee-content-guest {
          animation-duration: 25s; 
        }
      `}} />
    </div>
  );
}

export default function LiveMonitorWrapper() {
  return (
    <Suspense fallback={<div className="h-screen bg-gray-950 flex flex-col items-center justify-center text-indigo-400 font-mono"><Activity className="w-8 h-8 animate-pulse mb-4" /> Loading Operation Monitor...</div>}>
      <LiveMonitorContent />
    </Suspense>
  );
}