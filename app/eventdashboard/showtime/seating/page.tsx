"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Armchair, ShieldCheck, AlertCircle } from 'lucide-react';

interface Attendee {
  id: string;
  prefix?: string;
  fullname: string;
  position?: string;
  organization?: string;
}

interface SeatAssignment {
  seat_id: string;
  seat_zone: 'left' | 'center' | 'right';
  attendee_id: string;
  live_presence: 'pending' | 'arrived' | 'seated' | 'away';
}

export default function GuestSeatingView() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [assignments, setAssignments] = useState<Record<string, SeatAssignment>>({});
  
  // 🔍 ระบบสืบค้นข้อมูลของแขก
  const [searchTerm, setSearchTerm] = useState('');
  const [searchedSeatId, setSearchedSeatId] = useState<string | null>(null);

  // 🏛️ โครงสร้างสัดส่วนผังเก้าอี้ (ล็อคให้สัมพันธ์ตรงเป๊ะกับหน้าสตาฟพาสเนอร์)
  const leftConfig = { rows: 4, seats: 5 };
  const centerConfig = { rows: 6, seats: 8 };
  const rightConfig = { rows: 4, seats: 5 };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSeatingData = async () => {
    try {
      // 1. ดึงข้อมูลรายชื่อแขกประเภท vip
      const { data: attData, error: attError } = await supabase
        .from('event_attendees')
        .select('id, prefix, fullname, position, organization')
        .eq('attendee_type', 'vip');

      if (attError) {
        console.error("❌ Fetch Attendees Error:", attError);
      } else if (attData) {
        setAttendees(attData);
      }

      // 2. ดึงผังที่นั่ง (เพิ่มระบบตรวจสอบความปลอดภัย ป้องกัน Error 400 Bad Request ยินดีต้อนรับรหัส UUID)
      let seatQuery = supabase.from('event_seat_assignments').select('*');
      
      // ดักตรวจรูปแบบรหัสงาน: ต้องมีความยาวและโครงสร้างแบบ UUID จริงๆ เท่านั้น (ไม่ใช่คำว่า 'current' หรือ null)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (eventId && uuidRegex.test(eventId)) {
        seatQuery = seatQuery.eq('event_id', eventId);
      }

      const { data: seatData, error: seatError } = await seatQuery;

      if (seatError) {
        console.error("❌ Fetch Seats Error:", seatError);
      } else if (seatData) {
        const seatMap: Record<string, SeatAssignment> = {};
        seatData.forEach((s: any) => {
          seatMap[s.seat_id] = {
            seat_id: s.seat_id,
            seat_zone: s.seat_zone,
            attendee_id: s.attendee_id,
            live_presence: s.live_presence || 'pending'
          };
        });
        setAssignments(seatMap);
      }
    } catch (err) {
      console.error("System Matrix Crash:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeatingData();

    // 📡 เปิดท่อดักฟังความเคลื่อนไหวเก้าอี้สดๆ จากสตาฟแบบ Real-time
    const seatingChannel = supabase.channel('realtime_guest_seating_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_seat_assignments' }, fetchSeatingData)
      .subscribe();

    return () => {
      supabase.removeChannel(seatingChannel);
    };
  }, [eventId]);

  // 🔍 ลอจิกวิเคราะห์ค้นหา (บดขยี้ช่องว่างเว้นวรรค และรวมคำนำหน้าชื่อเพื่อความแม่นยำสูง)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchedSeatId(null);
      return;
    }

    const keyword = searchTerm.toLowerCase().replace(/\s+/g, '');

    const matchedAttendee = attendees.find(a => {
      const fullNameCombined = `${a.prefix || ''}${a.fullname || ''}`.toLowerCase().replace(/\s+/g, '');
      return fullNameCombined.includes(keyword);
    });

    if (matchedAttendee) {
      const seat = Object.values(assignments).find(a => a.attendee_id === matchedAttendee.id);
      if (seat) setSearchedSeatId(seat.seat_id);
      else setSearchedSeatId(null); 
    } else {
      setSearchedSeatId(null);
    }
  }, [searchTerm, attendees, assignments]);

  // 🪑 เรนเดอร์บล็อกเก้าอี้
  const renderGuestSeat = (seatId: string, zone: 'left' | 'center' | 'right') => {
    const isOccupied = assignments[seatId];
    const attendeeInfo = isOccupied ? attendees.find(a => a.id === isOccupied.attendee_id) : null;
    const isSearched = searchedSeatId === seatId;
    
    let seatColorClass = "bg-zinc-900/40 border-zinc-800 text-zinc-600"; 
    if (isOccupied) {
      if (isOccupied.live_presence === 'arrived' || isOccupied.live_presence === 'seated') {
        seatColorClass = "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"; 
      } else if (isOccupied.live_presence === 'away') {
        seatColorClass = "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"; 
      } else {
        seatColorClass = "bg-purple-900/30 border-purple-500/30 text-purple-300"; 
      }
    }

    // 🌟 ไฟเอฟเฟกต์สีทองไฮไลต์สว่างวาบกระพริบเมื่อแขกค้นหาเจอที่นั่งตัวเอง
    if (isSearched) {
      seatColorClass = "bg-amber-500 border-amber-300 text-black shadow-[0_0_25px_rgba(245,158,11,0.9)] scale-110 z-30 animate-pulse";
    }

    return (
      <div key={seatId} className={`w-11 h-11 md:w-12 md:h-12 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 relative select-none ${seatColorClass}`}>
        <Armchair size={isSearched ? 18 : 14} className={isOccupied || isSearched ? "opacity-100" : "opacity-30"} />
        <span className={`font-mono ${isSearched ? 'text-[10px] font-black' : 'text-[8px] font-bold'}`}>{seatId}</span>
        
        {attendeeInfo && !isSearched && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-zinc-500 font-bold truncate max-w-[48px] bg-black/40 px-1 py-0.5 rounded border border-white/5">
            {attendeeInfo.fullname.substring(0, 5)}
          </span>
        )}

        {isSearched && attendeeInfo && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black px-3 py-1 rounded-xl font-black text-[11px] whitespace-nowrap shadow-2xl border border-amber-400 z-50 animate-bounce">
            👇 ที่นั่งของคุณ อยู่ตรงนี้ครับ
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0c1633] flex items-center justify-center text-purple-400 font-black"><span className="animate-pulse tracking-widest">กำลังดึงข้อมูลระบบผังที่นั่งสด...</span></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1128] via-[#111a36] to-[#0a1128] text-white flex flex-col font-sans overflow-x-hidden relative">
      
      {/* ========================================================
          🌟 STICKY HEADER (ขยับกลุ่มโลโก้และระบบบริการดิจิทัลไปขวาสุด)
          ======================================================== */}
      <div className="bg-[#0b1430]/90 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-40 shadow-xl sticky top-0">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-lg md:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <MapPin size={22} className="text-purple-400 animate-pulse" /> ตรวจสอบตำแหน่งพิกัดเก้าอี้ที่นั่ง VIP
          </h1>
          <p className="text-[10px] md:text-xs text-zinc-400 mt-0.5 font-medium">พิมพ์ชื่อ-นามสกุลของท่านในช่องค้นหา เพื่อระบุตำแหน่งเก้าอี้บนแผนผังจำลอง</p>
        </div>

        {/* ใช้ลอจิกผลักกล่องเวลารวมกลุ่มโลโก้ชิดขวาสุดของพื้นที่ขอบจอเต็มตัวด้วย ml-auto */}
        <div className="flex items-center gap-5 justify-end ml-auto shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-xl font-mono font-black text-purple-400 leading-none">{time.toLocaleTimeString('th-TH')}</div>
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
          </div>
          <div className="h-10 w-px bg-white/10 hidden md:block"></div>
          <div className="flex flex-col items-center md:items-end justify-center text-right">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 object-contain" />
            <span className="text-[8px] text-cyan-400 font-black tracking-widest mt-1 uppercase">ระบบบริหารการจัดงานดิจิทัลอัจฉริยะ</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          🔍 INPUT SEARCH ENGINE BLOCK
          ======================================================== */}
      <div className="max-w-md mx-auto w-full px-6 pt-8 pb-2 relative z-30">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur opacity-25 group-focus-within:opacity-45 transition duration-300"></div>
          <div className="relative flex items-center bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl">
            <Search className="text-purple-400 ml-3 shrink-0" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="พิมพ์ชื่อ หรือนามสกุล เพื่อหาเก้าอี้..." 
              className="w-full bg-transparent border-none px-3 py-1.5 outline-none text-white font-black text-sm md:text-base placeholder-zinc-600"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-white/5 rounded-lg transition-colors shrink-0">ล้าง</button>
            )}
          </div>
        </div>

        {/* แถบรายงานผลลัพธ์ด่วนใต้กล่องพิมพ์ */}
        {searchTerm && (
          <div className="mt-4 text-center animate-in fade-in duration-150">
            {searchedSeatId ? (
              <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 px-4 py-2 rounded-xl text-emerald-400 font-black text-xs shadow-md">
                <ShieldCheck size={14} /> ระบบพบที่นั่งของท่านแล้ว: พิกัดเก้าอี้ [{searchedSeatId}]
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-500/40 px-4 py-2 rounded-xl text-red-400 font-bold text-[11px]">
                <AlertCircle size={14} /> ไม่พบข้อมูลเก้าอี้ของชื่อนี้ โปรดตรวจสอบการพิมพ์หรือติดต่อฝ่ายลงทะเบียนประตูหน้า
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          📊 INTERACTIVE VISUAL SEATING GRAPHIC
          ======================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-20 z-20">
        
        {/* แถบอธิบายความหมายของสีเก้าอี้ (Legend) */}
        <div className="flex flex-wrap justify-center gap-4 bg-black/30 px-5 py-2.5 rounded-xl border border-white/5 text-[10px] text-zinc-500 font-bold mb-6 backdrop-blur-sm shadow-sm">
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-700"></div> เก้าอี้ว่าง</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-600 border border-purple-400"></div> มีผู้จับจองสิทธิ์แล้ว</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div> พิกัดระบุตำแหน่งของท่าน</span>
        </div>

        {/* ตัวกระดานผังรังผึ้งจัดโซนสากลแบบ Scrollable */}
        <div className="w-full max-w-5xl overflow-x-auto pb-8 custom-scrollbar">
          <div className="min-w-max mx-auto bg-black/10 p-6 md:p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative">
            
            {/* ป้ายบอกทิศทางเวทีกลาง */}
            <div className="w-56 py-1.5 bg-zinc-800 border border-white/10 text-zinc-400 font-black tracking-widest mx-auto rounded-b-xl text-[10px] text-center shadow-md absolute top-0 left-1/2 -translate-x-1/2">
              STAGE / FRONT (เวทีกลาง)
            </div>
            
            <div className="flex flex-row justify-center items-start gap-6 md:gap-10 pt-10">
              
              {/* ⬅️ ปีกซ้าย (Left Wing) */}
              <div className="p-3 bg-cyan-950/5 border border-cyan-500/5 rounded-2xl flex gap-2">
                {Array.from({ length: leftConfig.rows }).map((_, r) => {
                  const char = String.fromCharCode(76 + r); 
                  return (
                    <div key={char} className="flex flex-col gap-6 md:gap-8 items-center">
                      <span className="text-cyan-500/40 font-mono text-[9px] font-black">{char}</span>
                      {Array.from({ length: leftConfig.seats }).map((_, s) => renderGuestSeat(`${char}${s + 1}`, 'left'))}
                    </div>
                  );
                })}
              </div>

              {/* 🏛️ โซนกลางหลัก (Center Zone) */}
              <div className="p-3 bg-purple-950/5 border border-purple-500/5 rounded-2xl space-y-6 md:space-y-8 px-4 md:px-6 border-x border-white/5">
                {Array.from({ length: centerConfig.rows }).map((_, r) => {
                  const lbl = String.fromCharCode(65 + r); 
                  return (
                    <div key={lbl} className="flex gap-2 md:gap-3 items-center justify-center relative">
                      <span className="absolute -left-6 font-mono font-black text-purple-500/30 text-[9px]">{lbl}</span>
                      {Array.from({ length: centerConfig.seats }).map((_, s) => renderGuestSeat(`${lbl}${s + 1}`, 'center'))}
                      <span className="absolute -right-6 font-mono font-black text-purple-500/30 text-[9px]">{lbl}</span>
                    </div>
                  );
                })}
              </div>

              {/* ➡️ ปีกขวา (Right Wing) */}
              <div className="p-3 bg-cyan-950/5 border border-cyan-500/5 rounded-2xl flex gap-2">
                {Array.from({ length: rightConfig.rows }).map((_, r) => {
                  const char = String.fromCharCode(90 - r); 
                  return (
                    <div key={char} className="flex flex-col gap-6 md:gap-8 items-center">
                      <span className="text-cyan-500/40 font-mono text-[9px] font-black">{char}</span>
                      {Array.from({ length: rightConfig.seats }).map((_, s) => renderGuestSeat(`${char}${s + 1}`, 'right'))}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* FOOTER WATERMARK */}
      <div className="w-full text-center py-3 bg-black/40 mt-auto shrink-0 border-t border-white/5 backdrop-blur-md">
        <span className="text-[10px] text-white/10 font-bold tracking-widest uppercase">POWERED BY NIIVAA SMARTEVENT</span>
      </div>
      
    </div>
  );
}