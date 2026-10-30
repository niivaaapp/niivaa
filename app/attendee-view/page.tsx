"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Clock, Megaphone, Calendar, Send, Sparkles, X, ZoomIn, Map, Sun, Moon, Tv, MonitorPlay, MessageSquare } from 'lucide-react';

function AttendeeViewContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const supabase = createClient();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [eventData, setEventData] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [smsInput, setSmsInput] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [theme, setTheme] = useState<'dark' | 'classic'>('dark');
  const [liveAttendee, setLiveAttendee] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'vip' | 'marquee'>('marquee');

  // 🌟 เพิ่ม State สำหรับระบบ Local Slideshow ในจอจิ๋ว (ย้ายขึ้นมาถูกตำแหน่งแล้ว)
  const [slideIndex, setSlideIndex] = useState(0);

  // ระบบนาฬิกา
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('th-TH'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // สลับสไลด์อัตโนมัติทุกๆ 5 วินาที
  useEffect(() => {
    if (attendees.length === 0) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % attendees.length);
    }, 5000); // 5000ms = 5 วินาที
    return () => clearInterval(interval);
  }, [attendees.length]);

  // ดึงข้อมูลและ Real-time
  useEffect(() => {
    if (!eventId) return; // 🛑 คำสั่งนี้ต้องอยู่หลังจากประการ Hook ทั้งหมด

    const fetchInitialData = async () => {
      const { data: evt } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (evt) setEventData(evt);

      const { data: att } = await supabase.from('event_attendees')
        .select(`
          *,
          global_profiles ( profile_image_url )
        `)
        .eq('event_id', eventId)
        .order('priority_level', { ascending: true, nullsFirst: false });
      if (att) setAttendees(att);

      const { data: msgs } = await supabase.from('event_live_messages')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_approved', true)
        .in('target_screen', ['all', 'marquee'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (msgs) setMessages(msgs);

      const { data: screenData, error: screenError } = await supabase.from('screen_state')
        .select('*')
        .eq('id', 'current')
        .maybeSingle(); 
      
      if (!screenError && screenData && screenData.mode === 'mc_vip' && screenData.payload) {
        setLiveAttendee({ ...screenData.payload, media_url: screenData.media_url });
      }
    };

    fetchInitialData();

    const attendeesChannel = supabase.channel('public:event_attendees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${eventId}` }, () => {
        supabase.from('event_attendees')
          .select(`
            *,
            global_profiles ( profile_image_url )
          `)
          .eq('event_id', eventId)
          .order('priority_level', { ascending: true, nullsFirst: false })
          .then(({ data }) => { if (data) setAttendees(data); });
      })
      .subscribe();

    const messagesChannel = supabase.channel('public:event_live_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${eventId}` }, () => {
        supabase.from('event_live_messages')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_approved', true)
          .in('target_screen', ['all', 'marquee'])
          .order('created_at', { ascending: false })
          .limit(10)
          .then(({ data }) => { if (data) setMessages(data); });
      })
      .subscribe();

    const screenStateChannel = supabase.channel('public:screen_state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' }, (payload) => {
        const newData = payload.new;
        if (newData && newData.mode === 'mc_vip' && newData.payload) {
          setLiveAttendee({ ...newData.payload, media_url: newData.media_url });
        } else if (newData && newData.mode !== 'mc_vip') {
           setLiveAttendee(null); 
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attendeesChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(screenStateChannel);
    };
  }, [eventId, supabase]);

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsInput.trim() || !eventId) return;

    setIsSending(true);
    const { error } = await supabase.from('event_live_messages').insert([{
      event_id: eventId, 
      sender_name: senderName.trim() || 'ผู้ร่วมงาน', 
      sender_role: 'guest',
      message_text: smsInput.trim(), 
      is_approved: true, 
      target_screen: 'all'
    }]);
    setIsSending(false);
    
    if (!error) { 
      setSmsInput(''); 
      alert('ส่งข้อความสำเร็จ ขอบคุณที่ร่วมแสดงความยินดีครับ'); 
    } else {
      alert('เกิดข้อผิดพลาดในการส่งข้อความ');
      console.error(error);
    }
  };

  // 🎯 ตัวแปรตัดสินใจว่า "จะโชว์ใครบนจอ" (ความสำคัญ: จอหลักสั่งมา > สไลด์โชว์วนลูป)
  const displayVip = liveAttendee || (attendees.length > 0 ? attendees[slideIndex] : null);
  
  // จัดการตัวแปรรูปภาพ (ครอบคลุมชื่อคอลัมน์ทั้ง media_url และ image_url)
 // 🎯 ดึงจาก Live Mode ก่อน (media_url) หากเป็นระบบ Auto ให้ดึงจากข้อมูลที่ Join มา
  const vipImageUrl = displayVip?.media_url || displayVip?.global_profiles?.profile_image_url || '/default-bg.jpg';

  const marqueeText = messages.length > 0 
    ? messages.map(m => `💬 ${m.message_text} (จาก: ${m.sender_name})`).join('  |  ') 
    : 'ยินดีต้อนรับสู่พิธีอันทรงเกียรติ กรุณาตรวจสอบลำดับคิวของท่านล่วงหน้า';

  const isDark = theme === 'dark';
  const themeClasses = {
    bgMain: isDark ? 'bg-zinc-950 text-white' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 text-slate-900',
    header: isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/80 border-amber-200 shadow-sm',
    cardBg: isDark ? 'bg-zinc-900 border-white/10' : 'bg-white/90 border-amber-200 shadow-xl',
    textMuted: isDark ? 'text-zinc-400' : 'text-slate-500',
    textHighlight: isDark ? 'text-amber-400' : 'text-amber-600',
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } } .animate-marquee { display: inline-block; white-space: nowrap; animation: marquee 25s linear infinite; }`}} />

      <div className={`min-h-screen font-sans pb-10 flex flex-col items-center transition-colors duration-500 ${themeClasses.bgMain}`}>
        
        {/* Top Header */}
        <header className={`w-full max-w-md px-4 py-3 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md border-b ${themeClasses.header}`}>
          <div className="flex items-center gap-2">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-7 w-auto object-contain" />
            <span className={`text-xs font-bold tracking-wider ${themeClasses.textHighlight}`}>Live Status</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(isDark ? 'classic' : 'dark')} className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition">
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
            </button>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-bold ${isDark ? 'bg-black/50 border-white/10 text-amber-400' : 'bg-amber-100 border-amber-300 text-amber-800'}`}>
              <Clock size={14} /><span>{currentTime || '00:00:00'}</span>
            </div>
          </div>
        </header>

        {/* Marquee Ticker */}
        <div className="w-full max-w-md bg-[#374259]/95 border-y border-white/20 overflow-hidden py-2.5 px-4 flex items-center gap-2 sticky top-[53px] z-30 backdrop-blur-md shadow-lg">
          <Megaphone size={16} className="text-amber-400 shrink-0 animate-bounce" />
          <div className="overflow-hidden whitespace-nowrap w-full flex items-center">
            <div className="animate-marquee text-xs font-bold text-white pr-10 tracking-wide">
              📢 ประกาศ: {marqueeText}
            </div>
          </div>
        </div>

        <main className="w-full max-w-md p-4 space-y-6">

          {/* 🌟 ปุ่มสลับโหมดจำลองหน้าจอ */}
          <div className={`p-1 flex rounded-xl border ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-amber-200'}`}>
            <button 
              onClick={() => setViewMode('marquee')} 
              className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'marquee' ? 'bg-cyan-600 text-white shadow-md' : themeClasses.textMuted}`}
            >
              <MessageSquare size={14} /> จำลองหน้าจอข้อความ
            </button>
            <button 
              onClick={() => setViewMode('vip')} 
              className={`flex-1 py-2 flex items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'vip' ? 'bg-amber-600 text-white shadow-md' : themeClasses.textMuted}`}
            >
              <MonitorPlay size={14} /> จำลองหน้าจอ VIP
            </button>
          </div>

          {/* 🌟 จอเล็ก (Mini Screen) */}
          <section className={`border rounded-2xl overflow-hidden relative shadow-2xl flex flex-col items-center justify-center min-h-[350px] w-full transition-all duration-500 ${isDark ? 'border-white/20' : 'border-amber-400/50'} ${viewMode === 'marquee' ? 'bg-[#000d1a]' : ''}`}>
            
            {/* โหมด 1: จำลองหน้าจอข้อความวิ่ง (Marquee) */}
            {viewMode === 'marquee' && (
              <div className="w-full h-full flex flex-col items-center justify-center absolute inset-0 bg-[#000d1a] animate-in fade-in zoom-in-95 duration-500">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-cyan-500/50 shadow-md">
                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping absolute"></span>
                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full relative"></span>
                  <span className="text-[10px] font-black text-cyan-300 uppercase tracking-widest">Marquee Screen</span>
                </div>
                
                {/* ลายน้ำพื้นหลัง */}
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
                
                {/* แถบข้อความจำลองวิ่ง */}
                <div className="relative z-10 w-full border-y border-cyan-500/30 bg-black/60 py-10 overflow-hidden flex items-center shadow-[0_0_30px_rgba(34,211,238,0.15)]">
                  <div className="animate-marquee whitespace-nowrap flex gap-10">
                    {messages.length === 0 ? (
                        <span className="text-cyan-400 font-bold text-xl px-10 tracking-widest">รอรับข้อความอวยพร...</span>
                    ) : (
                        [...messages, ...messages].map((msg, i) => (
                          <div key={i} className="inline-flex flex-col items-center justify-center px-6">
                            <span className="text-3xl font-black text-white">{msg.message_text}</span>
                            <span className="text-sm text-cyan-400 mt-2 tracking-widest">— {msg.sender_name}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* โหมด 2: จำลองหน้าจอเวที (VIP) */}
            {viewMode === 'vip' && (
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
                <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-red-500/50 shadow-md">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping absolute"></span>
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full relative"></span>
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                    {liveAttendee ? "LIVE NOW" : "SLIDESHOW"} 
                  </span>
                </div>
                
                {displayVip ? (
                  <>
                    {/* พื้นหลังเบลอ */}
                    <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 blur-2xl scale-110 transition-all duration-1000" style={{ backgroundImage: `url(${vipImageUrl})` }}></div>
                    <div className={`absolute inset-0 z-0 bg-gradient-to-t ${isDark ? 'from-zinc-950 via-zinc-900/80 to-zinc-900/40' : 'from-slate-900 via-slate-800/80 to-transparent'}`}></div>

                    {/* ข้อมูล VIP */}
                    <div className="relative z-10 flex flex-col items-center justify-center p-6 w-full h-full animate-in fade-in zoom-in-95 duration-500" key={`slide-${displayVip.id}`}>
                      <div className="relative w-36 h-48 xl:w-44 xl:h-56 mb-5 rounded-xl overflow-hidden border-4 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] bg-gradient-to-b from-slate-800 to-black">
                        {vipImageUrl !== '/default-bg.jpg' ? (
                          <img src={vipImageUrl} alt="Profile" className="w-full h-full object-cover object-center" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-5xl opacity-50">👤</div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 backdrop-blur-sm p-1.5 text-center border-t border-amber-500/50">
                          <p className="text-[10px] font-bold text-amber-300 truncate px-1">{displayVip.fullname}</p>
                        </div>
                      </div>

                      <div className="text-center w-full">
                        <h3 className={`text-2xl md:text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-white via-amber-100 to-amber-500' : 'from-white to-amber-300 drop-shadow-md'}`}>
                          {displayVip.fullname}
                        </h3>
                        <p className="text-sm md:text-base font-medium text-cyan-300 leading-snug px-4">
                          {displayVip.position}
                        </p>
                        {displayVip.role && (
                          <div className="mt-4 inline-block bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-amber-500/50 shadow-inner">
                            {displayVip.role}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={`relative z-10 text-center py-12 flex flex-col items-center opacity-50 ${themeClasses.textMuted}`}>
                    <Tv size={60} className="mb-4 text-amber-500/30 animate-pulse" />
                    <p className="text-xs font-bold tracking-widest">ยังไม่มีข้อมูลรายชื่อ</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ข้อมูลการจัดงาน (ปุ่มซูม) */}
          {(eventData?.schedule_image_url || eventData?.venue_map_image_url) && (
            <section className={`border rounded-2xl p-4 ${themeClasses.cardBg}`}>
              <h2 className={`text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${themeClasses.textMuted}`}>
                <Calendar size={14} className="text-blue-400" /> ข้อมูลการจัดงาน
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {eventData?.schedule_image_url && (
                  <button onClick={() => setZoomedImage(eventData.schedule_image_url)} className={`flex flex-col items-center p-3 border rounded-xl transition-colors ${isDark ? 'bg-black/40 border-white/10 hover:bg-white/5' : 'bg-white/50 border-amber-200 hover:bg-amber-100'}`}>
                    <Calendar size={24} className="text-blue-500 mb-2" />
                    <span className="text-xs font-bold">กำหนดการ</span>
                  </button>
                )}
                {eventData?.venue_map_image_url && (
                  <button onClick={() => setZoomedImage(eventData.venue_map_image_url)} className={`flex flex-col items-center p-3 border rounded-xl transition-colors ${isDark ? 'bg-black/40 border-white/10 hover:bg-white/5' : 'bg-white/50 border-amber-200 hover:bg-amber-100'}`}>
                    <Map size={24} className="text-emerald-500 mb-2" />
                    <span className="text-xs font-bold">แผนผังงาน</span>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* ตารางคิวเตรียมตัว */}
          <section className={`border rounded-2xl p-4 flex flex-col h-[400px] ${themeClasses.cardBg}`}>
            <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3">
              <h2 className={`text-xs font-black uppercase ${themeClasses.textMuted}`}>ลำดับและเวลาถึงคิวโดยประมาณ</h2>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> ONLINE
              </span>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
              {(() => {
                const activeIndex = attendees.findIndex(a => a.status === 'reading' || a.is_reading === true);
                const baseIndex = activeIndex !== -1 ? activeIndex : attendees.findIndex(a => !a.is_read);
                const currentQueue = baseIndex !== -1 ? baseIndex : attendees.length;

                return attendees.map((att, idx) => {
                  const isPassed = idx < currentQueue || att.is_read;
                  const isReadingNow = idx === currentQueue && !att.is_read;
                  
                  let etaText = "";
                  if (isPassed) {
                    etaText = "ผ่านแล้ว";
                  } else if (isReadingNow) {
                    etaText = "NOW";
                  } else {
                    const distance = idx - currentQueue;
                    const avgMinutes = 0.5;
                    const targetTime = new Date(Date.now() + distance * avgMinutes * 60000);
                    etaText = targetTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
                  }

                  const boxStyle = isReadingNow 
                    ? 'bg-amber-600/90 border-amber-400 shadow-lg scale-[1.02] z-10' 
                    : isPassed 
                      ? 'bg-zinc-800/50 opacity-50 border-transparent grayscale' 
                      : 'bg-[#121358] border-blue-400/30 hover:bg-[#1a1b7a]'; 

                  const textStylePrimary = isPassed ? 'text-zinc-400 line-through' : 'text-[#E4D329]';
                  const textStyleSecondary = isPassed ? 'text-zinc-500' : 'text-[#E4D329]/80';

                  return (
                    <div key={att.id} className={`p-3 rounded-xl flex justify-between items-center transition-all border ${boxStyle}`}>
                      <div className="flex items-center gap-3 w-full min-w-0 pr-2">
                        <span className={`text-xs font-mono font-black w-6 text-center ${isReadingNow ? 'text-white' : 'text-[#E4D329]/70'}`}>
                          {idx + 1}
                        </span>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {isReadingNow && <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0"></span>}
                            <p className={`text-xs font-bold truncate ${textStylePrimary}`}>
                              {att.prefix}{att.fullname}
                            </p>
                          </div>
                          <p className={`text-[10px] truncate ${textStyleSecondary}`}>
                            {att.position}
                          </p>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end justify-center">
                          {!isPassed && !isReadingNow && <span className="text-[8px] text-[#FFFC8C]/70 block tracking-wider uppercase">คาดถึงคิว</span>}
                          <span className={`text-xs font-mono font-bold ${isReadingNow ? 'text-white animate-pulse' : isPassed ? 'text-zinc-500' : 'text-[#FFFC8C]'}`}>
                            {etaText}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              {attendees.length === 0 && eventId && <p className={`text-center text-xs py-10 ${themeClasses.textMuted}`}>ยังไม่มีข้อมูลคิวในขณะนี้</p>}
            </div>
          </section>

          {/* กล่องแชทส่ง SMS */}
          <section className={`border rounded-2xl p-4 ${themeClasses.cardBg}`}>
            <h2 className={`text-xs font-black uppercase tracking-wider mb-3 flex items-center gap-1.5 ${themeClasses.textMuted}`}>
              <Sparkles size={14} className={themeClasses.textHighlight} /> ส่งข้อความอวยพร
            </h2>
            <form onSubmit={handleSendSms} className="space-y-3">
              <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="ชื่อผู้ส่ง (ระบุหรือไม่ก็ได้)" className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-amber-200 text-slate-800'}`} />
              <div className="flex gap-2">
                <input type="text" value={smsInput} onChange={(e) => setSmsInput(e.target.value)} required placeholder="พิมพ์ข้อความที่นี่..." className={`flex-1 border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-cyan-500 ${isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-amber-200 text-slate-800'}`} />
                <button type="submit" disabled={isSending} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2">
                  ส่ง <Send size={12} />
                </button>
              </div>
            </form>
          </section>

        </main>
      </div>

      {/* Modal ขยายภาพเต็มจอ */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 backdrop-blur-sm">
          <button onClick={() => setZoomedImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full z-50 transition-colors">
            <X size={24} />
          </button>
          <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10" />
        </div>
      )}
    </>
  );
}

export default function AttendeeLiveViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">กำลังโหลด...</div>}>
      <AttendeeViewContent />
    </Suspense>
  );
}