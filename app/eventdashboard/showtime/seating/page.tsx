"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, MapPin, Armchair, ShieldCheck, AlertCircle, LayoutGrid, HelpCircle, X, Navigation, UserCheck, Coffee, BellRing } from 'lucide-react';

interface Attendee {
  id: string;
  profile_id?: string;
  prefix?: string;
  fullname: string;
  position?: string;
  organization?: string;
  profile_image_url?: string;
}

interface SeatAssignment {
  seat_id: string;
  seat_zone: 'left' | 'center' | 'right';
  attendee_id: string;
  live_presence: 'pending' | 'arrived' | 'seated' | 'away';
  water_pref?: string;
  drink_pref?: string;
  is_served?: boolean;
}

function StageManagerContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [assignments, setAssignments] = useState<Record<string, SeatAssignment>>({});
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchedSeatId, setSearchedSeatId] = useState<string | null>(null);

  // 🌟 เพิ่ม State สำหรับระบบสั่งเครื่องดื่ม
  const [isOrderingDrink, setIsOrderingDrink] = useState(false);
  const [drinkSelection, setDrinkSelection] = useState('');

  // 🌟 เก็บช่องสัญญาณ Real-time เพื่อใช้เตือน Admin
  const channelRef = useRef<any>(null);

  const leftConfig = { rows: 4, seats: 5 };
  const centerConfig = { rows: 6, seats: 8 };
  const rightConfig = { rows: 4, seats: 5 };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // เมื่อเปลี่ยนที่นั่งที่คลิก ให้รีเซ็ตฟอร์มสั่งน้ำ
  useEffect(() => {
    setIsOrderingDrink(false);
    setDrinkSelection('');
  }, [activeSeatId]);

  const fetchSeatingData = async () => {
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidEventId = eventId && uuidRegex.test(eventId);

      let attQuery = supabase
        .from('event_attendees')
        .select('id, profile_id, prefix, fullname, position, organization, global_profiles(profile_image_url)')
        .limit(5000);

      if (isValidEventId) {
        attQuery = attQuery.eq('event_id', eventId);
      }

      const { data: attData, error: attError } = await attQuery;

      if (attError) {
        console.error("❌ Fetch Attendees Error:", attError);
      } else if (attData) {
        const formattedData = attData.map((att: any) => {
          const profile = Array.isArray(att.global_profiles) ? att.global_profiles[0] : att.global_profiles;
          return {
            ...att,
            profile_image_url: profile?.profile_image_url || null
          };
        });
        setAttendees(formattedData);
      }

      let seatQuery = supabase.from('event_seat_assignments').select('*');

      if (isValidEventId) {
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
            live_presence: s.live_presence || 'pending',
            water_pref: s.water_pref || '',
            drink_pref: s.drink_pref || '',
            is_served: s.is_served || false
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

    const seatingChannel = supabase.channel('realtime_guest_seating_sync', {
      config: { broadcast: { ack: true } }
    });

    seatingChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_seat_assignments' }, fetchSeatingData)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = seatingChannel;
        }
      });

    return () => {
      supabase.removeChannel(seatingChannel);
      channelRef.current = null;
    };
  }, [eventId]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchedSeatId(null);
      return;
    }

    const keyword = searchTerm.toLowerCase().replace(/\s+/g, '');
    const matchedAttendees = attendees.filter(a => {
      const fullNameCombined = `${a.prefix || ''}${a.fullname || ''}`.toLowerCase().replace(/\s+/g, '');
      return fullNameCombined.includes(keyword);
    });

    let foundSeatId = null;
    for (const att of matchedAttendees) {
      const seat = Object.values(assignments).find(a =>
        a.attendee_id === att.id || a.attendee_id === att.profile_id
      );
      if (seat) {
        foundSeatId = seat.seat_id;
        break;
      }
    }
    setSearchedSeatId(foundSeatId);
  }, [searchTerm, attendees, assignments]);

  useEffect(() => {
    if (searchedSeatId) {
      setTimeout(() => {
        const seatElement = document.getElementById(`seat-${searchedSeatId}`);
        if (seatElement) {
          seatElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 300);
    }
  }, [searchedSeatId]);

  // 🌟 ฟังก์ชัน Self Check-in
  const handleGuestCheckIn = async (seatId: string) => {
    try {
      const finalEventId = eventId !== 'current' ? eventId : null;
      const { error } = await supabase
        .from('event_seat_assignments')
        .update({ live_presence: 'arrived' })
        .eq('seat_id', seatId)
        .eq('event_id', finalEventId);

      if (error) throw error;
      
      setAssignments(prev => ({
        ...prev,
        [seatId]: { ...prev[seatId], live_presence: 'arrived' }
      }));
      
      alert('✅ เช็คอินสำเร็จ! ทีมงานรับทราบแล้วว่าท่านมาถึงที่นั่ง');
      setActiveSeatId(null);
    } catch (err) {
      console.error("Check-in error:", err);
      alert("เกิดข้อผิดพลาดในการเช็คอิน กรุณาลองใหม่อีกครั้ง");
    }
  };

  // 🌟 ฟังก์ชัน ออเดอร์เครื่องดื่ม (อัปเดตลง Database)
  const handleOrderDrink = async (seatId: string) => {
    if (!drinkSelection) return alert("กรุณาเลือกประเภทเครื่องดื่มที่ต้องการครับ");
    
    try {
      const isWater = drinkSelection.includes('น้ำ');
      const finalEventId = eventId !== 'current' ? eventId : null;
      const updateData = isWater 
        ? { water_pref: drinkSelection, is_served: false } 
        : { drink_pref: drinkSelection, is_served: false };

      // บันทึกลงฐานข้อมูลเพื่อให้หน้า Planner แสดงแก้วสีส้ม
      const { error } = await supabase
        .from('event_seat_assignments')
        .update(updateData)
        .eq('seat_id', seatId)
        .eq('event_id', finalEventId);

      if (error) throw error;

      // อัปเดต UI Local ทันที
      setAssignments(prev => ({
        ...prev,
        [seatId]: { ...prev[seatId], ...updateData }
      }));

      // ส่ง Broadcast สะกิดจอ Admin ให้เด้ง
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'service_alert',
          payload: { seatId, type: 'water', message: `สั่งเครื่องดื่ม: ${drinkSelection}` }
        });
      }

      alert('☕ ส่งรายการเครื่องดื่มเรียบร้อยแล้ว พนักงานกำลังจัดเตรียมครับ');
      setIsOrderingDrink(false);
      setActiveSeatId(null);
    } catch (err) {
      console.error("Order drink error:", err);
      alert("ไม่สามารถส่งออเดอร์ได้ในขณะนี้");
    }
  };

  // 🌟 ฟังก์ชัน เรียกพนักงาน (Broadcast ล้วน)
  const handleCallStaff = async (seatId: string) => {
    try {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'service_alert',
          payload: { seatId, type: 'help', message: 'ต้องการพนักงานช่วยเหลือ' }
        });
        alert(`🛎️ ส่งคำร้องสำเร็จ: พนักงานกำลังเดินไปที่โต๊ะของท่านครับ`);
        setActiveSeatId(null);
      } else {
        alert("⚠️ กำลังเชื่อมต่อเครือข่าย กรุณารอสักครู่แล้วกดใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("Service request error:", err);
      alert("ไม่สามารถส่งคำร้องได้ในขณะนี้");
    }
  };

  const renderGuestSeat = (seatId: string, zone: 'left' | 'center' | 'right') => {
    const isOccupied = assignments[seatId];
    const attendeeInfo = isOccupied ? attendees.find(a => a.id === isOccupied.attendee_id || a.profile_id === isOccupied.attendee_id) : null;
    const isSearched = searchedSeatId === seatId;
    const isActive = activeSeatId === seatId;

    let seatColorClass = "bg-zinc-900/40 border-zinc-800 text-zinc-600 hover:bg-zinc-800/50";
    if (isOccupied) {
      if (isOccupied.live_presence === 'arrived' || isOccupied.live_presence === 'seated') {
        seatColorClass = "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]";
      } else if (isOccupied.live_presence === 'away') {
        seatColorClass = "bg-yellow-500/20 border-yellow-500/40 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.15)]";
      } else {
        seatColorClass = "bg-purple-900/40 border-purple-500/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] hover:bg-purple-800/50";
      }
    }

    if (isSearched) {
      seatColorClass = "bg-amber-500 border-amber-300 text-black shadow-[0_0_30px_rgba(245,158,11,0.9)] scale-110 z-30 animate-pulse ring-2 ring-white/50";
    }

    return (
      <div 
        id={`seat-${seatId}`}
        key={seatId} 
        onClick={(e) => {
          e.stopPropagation(); 
          if (isActive) setActiveSeatId(null); 
          else if (isOccupied) setActiveSeatId(seatId); 
        }}
        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 relative select-none cursor-pointer ${seatColorClass} ${isActive ? 'z-50 scale-105 shadow-2xl ring-2 ring-purple-400' : 'z-10 active:scale-95'}`}
      >
        <Armchair size={isSearched ? 20 : 16} className={isOccupied || isSearched ? "opacity-100" : "opacity-30"} />
        <span className={`font-mono mt-0.5 ${isSearched ? 'text-[11px] font-black' : 'text-[9px] font-bold tracking-widest'}`}>{seatId}</span>

        {attendeeInfo && !isSearched && !isActive && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 font-bold truncate max-w-[54px] bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 shadow-lg">
            {attendeeInfo.fullname.substring(0, 5)}
          </span>
        )}

        {/* 🌟 บังคับ Pop-up แสดงลงล่างเสมอ (top-[120%]) */}
        {isActive && attendeeInfo && (
          <div className="absolute top-[120%] left-1/2 -translate-x-1/2 bg-zinc-950/95 backdrop-blur-xl border border-purple-500/50 text-white p-4 rounded-3xl w-[260px] z-[999] shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-left cursor-default ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              {attendeeInfo.profile_image_url ? (
                <img 
                  src={attendeeInfo.profile_image_url} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/50 shrink-0 shadow-inner bg-zinc-900" 
                  onError={(e) => { e.currentTarget.outerHTML = '<div class="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0 text-zinc-500">👤</div>'; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0 text-zinc-500">👤</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-black text-purple-400 text-sm truncate leading-tight">{attendeeInfo.prefix}{attendeeInfo.fullname}</p>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">{attendeeInfo.position || 'ไม่ระบุตำแหน่ง'}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2 bg-black/30 p-2.5 rounded-2xl border border-white/5">
              {isOccupied.water_pref && (
                <div className="flex items-center gap-2.5">
                  <span className="text-cyan-400 text-sm drop-shadow-md">💧</span>
                  <span className="text-xs font-bold text-cyan-400 truncate">{isOccupied.water_pref}</span>
                </div>
              )}
              {isOccupied.drink_pref && (
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-400 text-sm drop-shadow-md">☕</span>
                  <span className="text-xs font-bold text-amber-400 truncate">{isOccupied.drink_pref}</span>
                </div>
              )}
              {!isOccupied.water_pref && !isOccupied.drink_pref && (
                 <p className="text-[10px] text-zinc-500 italic text-center py-1">ไม่มีข้อมูลเครื่องดื่ม</p>
              )}
              
              <div className="flex items-center justify-center gap-2 pt-2 mt-1 border-t border-white/5">
                {isOccupied.is_served ? (
                  <>
                    <span className="text-emerald-400 text-sm">✅</span>
                    <span className="text-[10px] text-emerald-400 font-bold tracking-wide uppercase">เสิร์ฟเรียบร้อย</span>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-500 text-sm">⏳</span>
                    <span className="text-[10px] text-zinc-400 font-bold tracking-wide uppercase">รอการเสิร์ฟ</span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-[10px] text-zinc-400 font-bold text-center mb-2">บริการสำหรับที่นั่งนี้ (Self-Service)</p>
              
              {isOccupied.live_presence === 'pending' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleGuestCheckIn(seatId); }}
                  className="w-full mb-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck size={16} /> ฉันมาถึงที่นั่งแล้ว (Check-in)
                </button>
              )}

              {/* 🌟 แสดงฟอร์มเลือกเครื่องดื่ม หากกดสั่ง */}
              {isOrderingDrink ? (
                <div className="flex flex-col gap-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                  <select 
                    value={drinkSelection}
                    onChange={(e) => setDrinkSelection(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">-- เลือกรายการ --</option>
                    <optgroup label="น้ำดื่ม">
                      <option value="น้ำเย็น">💧 น้ำเย็น</option>
                      <option value="น้ำอุณหภูมิห้อง">💧 น้ำอุณหภูมิห้อง</option>
                    </optgroup>
                    <optgroup label="ชา/กาแฟ">
                      <option value="กาแฟดำ">☕ กาแฟดำ</option>
                      <option value="กาแฟ (หวานน้อย)">☕ กาแฟ (หวานน้อย)</option>
                      <option value="กาแฟ (หวานปกติ)">☕ กาแฟ (หวานปกติ)</option>
                      <option value="ชา">🍵 ชา</option>
                    </optgroup>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleOrderDrink(seatId); }} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg py-2 text-[10px] font-bold transition-colors">ส่งออเดอร์</button>
                    <button onClick={(e) => { e.stopPropagation(); setIsOrderingDrink(false); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg py-2 text-[10px] font-bold transition-colors">ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsOrderingDrink(true); }}
                    className="p-2.5 bg-zinc-900 border border-white/10 hover:border-cyan-500/50 rounded-xl text-[10px] text-cyan-400 font-bold flex flex-col items-center gap-1.5 transition-all"
                  >
                    <Coffee size={16} /> สั่งเครื่องดื่ม
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCallStaff(seatId); }}
                    className="p-2.5 bg-zinc-900 border border-white/10 hover:border-amber-500/50 rounded-xl text-[10px] text-amber-400 font-bold flex flex-col items-center gap-1.5 transition-all"
                  >
                    <BellRing size={16} /> เรียกพนักงาน
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {isSearched && attendeeInfo && !isActive && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1.5 rounded-2xl font-black text-[11px] whitespace-nowrap shadow-[0_10px_25px_rgba(255,255,255,0.2)] border border-amber-400 z-50 animate-bounce flex items-center gap-1.5">
            👇 ที่นั่งของคุณ
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-[#070b19] flex items-center justify-center"><div className="flex flex-col items-center gap-4"><div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div><span className="text-purple-400 font-black tracking-widest text-sm animate-pulse">CONNECTING TO SEATING MATRIX...</span></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#050814] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#111a36] via-[#050814] to-[#050814] text-white flex flex-col font-sans overflow-x-hidden relative">

      {/* STICKY HEADER */}
      <div className="bg-[#050814]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] sticky top-0">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-lg md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center gap-2 tracking-tight">
            <MapPin size={24} className="text-purple-400 animate-pulse" /> ตรวจสอบพิกัดเก้าอี้ที่นั่ง VIP
          </h1>
          <p className="text-[10px] md:text-xs text-zinc-400 mt-1 font-medium">ระบบแผนผังดิจิทัล พิมพ์ชื่อ-นามสกุลเพื่อระบุตำแหน่งของท่าน</p>
        </div>
          
        <div className="flex items-center gap-4 justify-end ml-auto shrink-0">
          <Link
            href={`/events/event-dashboard/${eventId}`}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl transition-all border border-white/10 hover:border-white/20 shadow-lg flex-none cursor-pointer active:scale-95"
          >
            <LayoutGrid size={16} className="shrink-0 text-cyan-400" />
            <span className="text-xs font-bold whitespace-nowrap">หน้าศูนย์กลาง</span>
          </Link>

          <div className="h-8 w-px bg-white/10 hidden md:block"></div>

          <div className="text-right hidden md:block">
            <div className="text-xl font-mono font-black text-purple-400 leading-none tracking-tight">{time.toLocaleTimeString('th-TH')}</div>
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Local Time</div>
          </div>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 bg-purple-900/30 hover:bg-purple-600 text-purple-300 hover:text-white rounded-xl transition-all border border-purple-500/30 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] flex-none cursor-pointer backdrop-blur-md active:scale-95"
          >
            <HelpCircle size={16} className="shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap hidden sm:inline-block">คู่มือ</span>
          </button>
        </div>
      </div>

      {/* INPUT SEARCH ENGINE */}
      <div className="max-w-xl mx-auto w-full px-6 pt-10 pb-4 relative z-40">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 rounded-2xl blur-md opacity-30 group-focus-within:opacity-60 transition duration-500"></div>
          <div className="relative flex items-center bg-[#0a0f1d] border border-white/10 rounded-2xl p-2.5 shadow-2xl">
            <Search className="text-purple-400 ml-3 shrink-0" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="พิมพ์ชื่อ หรือนามสกุลของท่าน..."
              className="w-full bg-transparent border-none px-4 py-2 outline-none text-white font-black text-base md:text-lg placeholder-zinc-600 tracking-wide"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors shrink-0 mr-1">ล้าง</button>
            )}
          </div>
        </div>

        <div className="h-12 mt-4 flex items-center justify-center">
          {searchTerm && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              {searchedSeatId ? (
                <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 px-5 py-2.5 rounded-xl text-emerald-400 font-black text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md">
                  <ShieldCheck size={18} /> พบที่นั่ง: พิกัด [{searchedSeatId}]
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-500/40 px-5 py-2.5 rounded-xl text-red-400 font-bold text-xs shadow-md backdrop-blur-md">
                  <AlertCircle size={16} /> ไม่พบชื่อของท่าน (ตรวจสอบตัวสะกด/ติดต่อฝ่ายลงทะเบียน)
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* VISUAL SEATING MAP */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 pb-20 relative z-30 overflow-hidden">
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-5 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 text-[11px] text-zinc-400 font-bold mb-8 backdrop-blur-md shadow-xl">
          <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-700"></div> ว่าง</span>
          <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-900/50 border border-purple-500/50"></div> จองสิทธิ์</span>
          <span className="flex items-center gap-2 text-emerald-400"><div className="w-3 h-3 rounded-full bg-emerald-600/50 border border-emerald-500/50"></div> นั่งแล้ว</span>
          <span className="flex items-center gap-2 text-amber-400"><div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div> พิกัดของท่าน</span>
        </div>

        {/* 🌟 ปรับ pt-10 เป็น pt-2 และ pb-40 เป็น pb-64 เพื่อไม่ให้กินที่บน และมีพื้นที่ข้างล่างให้ Pop-up กาง */}
        <div className="w-full max-w-6xl overflow-x-auto pb-64 pt-2 custom-scrollbar px-4" onClick={() => setActiveSeatId(null)}>
          
          {/* 🌟 ปรับ pt-20 เป็น pt-12 เพื่อลดความกว้างขอบบน */}
          <div className="min-w-max mx-auto bg-[#0a0f1d]/80 p-8 md:p-12 pt-12 rounded-[3rem] border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative">
            
            <div className="w-64 py-2.5 bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 text-zinc-300 font-black tracking-[0.3em] mx-auto rounded-b-2xl text-[11px] text-center shadow-[0_10px_20px_rgba(0,0,0,0.5)] absolute top-0 left-1/2 -translate-x-1/2 z-30">
              STAGE / FRONT
            </div>

            <div className="flex flex-row justify-center items-start gap-8 md:gap-14 mt-4">

              {/* LEFT ZONE */}
              <div className="p-4 md:p-6 bg-gradient-to-b from-cyan-950/10 to-transparent border border-cyan-500/10 rounded-3xl flex gap-3 relative">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-cyan-500/30 uppercase tracking-widest">Left Wing</div>
                {Array.from({ length: leftConfig.rows }).map((_, r) => {
                  const char = String.fromCharCode(76 + r);
                  return (
                    <div key={char} className="flex flex-col gap-8 md:gap-10 items-center">
                      <span className="text-cyan-500/30 font-mono text-[10px] font-black">{char}</span>
                      {Array.from({ length: leftConfig.seats }).map((_, s) => renderGuestSeat(`${char}${s + 1}`, 'left'))}
                    </div>
                  );
                })}
              </div>

              {/* CENTER ZONE */}
              <div className="p-4 md:p-6 bg-gradient-to-b from-purple-950/10 to-transparent border border-purple-500/10 rounded-3xl space-y-8 md:space-y-10 px-6 md:px-10 relative">
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-purple-500/30 uppercase tracking-widest">Center Zone</div>
                {Array.from({ length: centerConfig.rows }).map((_, r) => {
                  const lbl = String.fromCharCode(65 + r);
                  return (
                    <div key={lbl} className="flex gap-3 md:gap-4 items-center justify-center relative">
                      <span className="absolute -left-8 font-mono font-black text-purple-500/30 text-[10px]">{lbl}</span>
                      {Array.from({ length: centerConfig.seats }).map((_, s) => renderGuestSeat(`${lbl}${s + 1}`, 'center'))}
                      <span className="absolute -right-8 font-mono font-black text-purple-500/30 text-[10px]">{lbl}</span>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT ZONE */}
              <div className="p-4 md:p-6 bg-gradient-to-b from-cyan-950/10 to-transparent border border-cyan-500/10 rounded-3xl flex gap-3 relative">
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-cyan-500/30 uppercase tracking-widest">Right Wing</div>
                {Array.from({ length: rightConfig.rows }).map((_, r) => {
                  const char = String.fromCharCode(90 - r);
                  return (
                    <div key={char} className="flex flex-col gap-8 md:gap-10 items-center">
                      <span className="text-cyan-500/30 font-mono text-[10px] font-black">{char}</span>
                      {Array.from({ length: rightConfig.seats }).map((_, s) => renderGuestSeat(`${char}${s + 1}`, 'right'))}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="w-full text-center py-4 bg-[#050814] mt-auto shrink-0 border-t border-white/5 relative z-40">
        <span className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">POWERED BY NIIVAA SMARTEVENT</span>
      </div>

      {/* SLIDE-OVER DRAWER (GUIDE) */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-300" onClick={() => setIsHelpOpen(false)}></div>
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[#0a0f1d] border-l border-white/10 shadow-2xl z-[9999] transform transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${isHelpOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/20">
          <h2 className="text-xl font-black text-white flex items-center gap-2"><HelpCircle size={22} className="text-purple-400" /> คู่มือการค้นหาที่นั่ง</h2>
          <button onClick={() => setIsHelpOpen(false)} className="p-2 bg-zinc-900 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8 text-sm text-zinc-300">
          
          <section className="space-y-4">
            <h3 className="text-cyan-400 font-black flex items-center gap-2 border-b border-cyan-500/20 pb-2 text-base"><Search size={18} /> 1. การค้นหาพิกัด</h3>
            <p className="text-xs leading-relaxed text-zinc-400">พิมพ์ชื่อหรือนามสกุลของท่านลงในช่องค้นหาด้านบน (ไม่ต้องใส่คำนำหน้า) ระบบจะเลื่อนหน้าจอไปยังเก้าอี้ของท่านอัตโนมัติ โดยมีแสง <strong className="text-amber-400">สีทองกระพริบ</strong> แจ้งเตือน</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-emerald-400 font-black flex items-center gap-2 border-b border-emerald-500/20 pb-2 text-base"><UserCheck size={18} /> 2. การเช็คอินและสั่งเครื่องดื่ม (Self-Service)</h3>
            <p className="text-xs leading-relaxed text-zinc-400">ใช้นิ้ว <strong>แตะที่เก้าอี้ของท่าน</strong> บนแผนผัง ระบบจะเปิดการ์ดแสดงข้อมูล จากนั้นท่านสามารถ:</p>
            <ul className="list-disc list-inside text-xs text-zinc-400 space-y-2 pl-2">
              <li>กดปุ่ม <strong className="text-emerald-400">"ฉันมาถึงที่นั่งแล้ว"</strong> เพื่อเช็คอินด้วยตนเอง</li>
              <li>กดปุ่ม <strong className="text-cyan-400">"สั่งเครื่องดื่ม"</strong> เลือกระบุเมนูที่ต้องการ แล้วรอรับที่โต๊ะได้เลย</li>
              <li>กดปุ่ม <strong className="text-amber-400">"เรียกพนักงาน"</strong> หากต้องการความช่วยเหลืออื่นๆ</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-purple-400 font-black flex items-center gap-2 border-b border-purple-500/20 pb-2 text-base"><Armchair size={18} /> 3. ความหมายของสี</h3>
            <div className="grid gap-3 text-xs">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="w-3 h-3 rounded-full bg-purple-900 border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]"></div>
                <span><strong className="text-purple-400">จองสิทธิ์:</strong> ระบบได้ล็อกที่นั่งไว้ให้ท่านแล้ว</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="w-3 h-3 rounded-full bg-emerald-600 border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                <span><strong className="text-emerald-400">มานั่งแล้ว:</strong> มีการเช็คอินเข้าประจำที่เรียบร้อย</span>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <div className="w-3 h-3 rounded-full bg-yellow-500 border border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]"></div>
                <span><strong className="text-yellow-400">ลุกชั่วคราว:</strong> ป้องกันผู้ร่วมงานท่านอื่นมานั่งทับ</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

export default function StageManagerMasterDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050814] flex items-center justify-center"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <StageManagerContent />
    </Suspense>
  );
}