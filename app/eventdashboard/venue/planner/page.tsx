"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sliders, Loader2, ArrowLeft, Armchair, Check, X, RefreshCw, Search, Trash2, ArrowRightLeft, UserCheck } from 'lucide-react';

interface Attendee {
  id: string;
  prefix?: string;
  fullname: string;
  position?: string;
  organization?: string;
  priority_level: number;
}

interface SeatAssignment {
  seat_id: string;
  seat_zone: 'left' | 'center' | 'right';
  attendee_id: string;
  live_presence: 'pending' | 'arrived' | 'seated' | 'away';
}

export default function DynamicMultiZoneSeatingPlanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [assignments, setAssignments] = useState<Record<string, SeatAssignment>>({});
  
  // ซ้ายมือ: ค้นหารายชื่อรวม
  const [rosterSearchTerm, setRosterSearchTerm] = useState('');
  const [showVipNames, setShowVipNames] = useState(true);

  // 🏛️ โครงสร้างสัดส่วน Layout เก้าอี้
  const [leftConfig, setLeftConfig] = useState({ rows: 4, seats: 5 });
  const [centerConfig, setCenterConfig] = useState({ rows: 6, seats: 8 });
  const [rightConfig, setRightConfig] = useState({ rows: 4, seats: 5 });

  // 📦 States สำหรับ Modal จัดการสิทธิ์ที่นั่ง
  const [activeSeatModal, setActiveSeatModal] = useState<{ id: string, zone: 'left'|'center'|'right' } | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initPlannerData = async () => {
    setLoading(true);
    try {
      const { data: attData } = await supabase
        .from('event_attendees')
        .select('id, prefix, fullname, position, organization, priority_level')
        .eq('attendee_type', 'vip');
      
      if (attData) {
        const sorted = [...attData].sort((a, b) => (a.priority_level || 50) - (b.priority_level || 50));
        setAttendees(sorted);
      }

      const { data: seatData } = await supabase
        .from('event_seat_assignments')
        .select('*')
        .eq('event_id', eventId !== 'current' ? eventId : null);

      if (seatData) {
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
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    initPlannerData();
  }, [eventId]);

  // 🪑 เปิด Modal เมื่อแตะเก้าอี้
  const handleSeatClick = (seatId: string, zone: 'left' | 'center' | 'right') => {
    setActiveSeatModal({ id: seatId, zone });
    setModalSearchTerm(''); // เคลียร์คำค้นหาทุกครั้งที่เปิดใหม่
  };

  // ✅ ลอจิกมอบหมายที่นั่งผ่าน Modal (ล็อคตัว / สลับตัว)
  const handleAssignSeatFromModal = (attendeeId: string) => {
    if (!activeSeatModal) return;

    const updatedMap = { ...assignments };
    // 1. เคลียร์คนๆ นี้ออกจากเก้าอี้เดิม (ถ้ามี)
    Object.keys(updatedMap).forEach(key => {
      if (updatedMap[key].attendee_id === attendeeId) delete updatedMap[key];
    });

    // 2. จับนั่งเก้าอี้ใหม่
    updatedMap[activeSeatModal.id] = {
      seat_id: activeSeatModal.id,
      seat_zone: activeSeatModal.zone,
      attendee_id: attendeeId,
      live_presence: 'pending'
    };

    setAssignments(updatedMap);
    setActiveSeatModal(null); // ปิด Modal
  };

  // 🗑️ ลอจิกเตะออก/ล้างที่นั่ง
  const handleClearSeatFromModal = () => {
    if (!activeSeatModal) return;
    setAssignments(prev => {
      const updated = { ...prev };
      delete updated[activeSeatModal.id];
      return updated;
    });
    setActiveSeatModal(null); // ปิด Modal
  };

  // ⚡ 1-Click Auto Seat
  const handleSmartAutoSeating = () => {
    const assignedIds = new Set(Object.values(assignments).map(a => a.attendee_id));
    const unassignedAttendees = attendees.filter(a => !assignedIds.has(a.id));

    if (unassignedAttendees.length === 0) {
      alert("📋 แขก VIP ทุกคนมีที่นั่งระบุครบถ้วนหมดแล้วครับพี่!");
      return;
    }

    const updatedAssignments = { ...assignments };
    let attendeeIdx = 0;

    const fillZoneSeats = (rowsCount: number, seatsCount: number, zone: 'left' | 'center' | 'right', charCodeStart: number, reverseRow: boolean) => {
      for (let r = 0; r < rowsCount; r++) {
        const rowLetter = String.fromCharCode(reverseRow ? charCodeStart - r : charCodeStart + r);
        for (let s = 1; s <= seatsCount; s++) {
          const seatId = `${rowLetter}${s}`;
          if (!updatedAssignments[seatId] && attendeeIdx < unassignedAttendees.length) {
            updatedAssignments[seatId] = {
              seat_id: seatId,
              seat_zone: zone,
              attendee_id: unassignedAttendees[attendeeIdx].id,
              live_presence: 'pending'
            };
            attendeeIdx++;
          }
        }
      }
    };

    fillZoneSeats(centerConfig.rows, centerConfig.seats, 'center', 65, false);
    fillZoneSeats(leftConfig.rows, leftConfig.seats, 'left', 76, false);
    fillZoneSeats(rightConfig.rows, rightConfig.seats, 'right', 90, true);

    setAssignments(updatedAssignments);
    alert(`⚡ ถมเก้าอี้ว่างอัตโนมัติเสร็จสิ้น! จัดที่นั่งเพิ่มสำเร็จ ${attendeeIdx} ท่าน`);
  };

  // 💾 บันทึกลง Supabase
  const handleSaveSeatingToSupabase = async () => {
    setLoading(true);
    try {
      const finalEventId = eventId !== 'current' ? eventId : null;
      await supabase.from('event_seat_assignments').delete().eq('event_id', finalEventId);

      const insertRows = Object.values(assignments).map(a => ({
        event_id: finalEventId,
        attendee_id: a.attendee_id,
        seat_id: a.seat_id,
        seat_zone: a.seat_zone,
        live_presence: a.live_presence
      }));

      if (insertRows.length > 0) {
        const { error } = await supabase.from('event_seat_assignments').insert(insertRows);
        if (!error) alert("💾 บันทึกแผนผังเก้าอี้ VIP ลงฐานข้อมูลเสร็จสมบูรณ์ครับ!");
        else alert(`❌ บันทึกผิดพลาด: ${error.message}`);
      } else {
        alert("🧹 เคลียร์แผนผังเก้าอี้ว่างเปล่าเรียบร้อย");
      }
    } catch (err) { alert("เกิดข้อผิดพลาดในการบันทึก"); }
    setLoading(false);
  };

  const renderSmartSeat = (seatId: string, zone: 'left' | 'center' | 'right') => {
    const isOccupied = assignments[seatId];
    const attendeeInfo = isOccupied ? attendees.find(a => a.id === isOccupied.attendee_id) : null;
    
    let seatColorClass = "bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-500"; 
    if (isOccupied) {
      if (isOccupied.live_presence === 'arrived' || isOccupied.live_presence === 'seated') seatColorClass = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]"; 
      else if (isOccupied.live_presence === 'away') seatColorClass = "bg-yellow-500 border-yellow-300 text-black"; 
      else seatColorClass = "bg-purple-600 border-purple-400 text-purple-100 shadow-[0_0_10px_rgba(147,51,234,0.3)]"; 
    }

    return (
      <div
        key={seatId}
        onClick={() => handleSeatClick(seatId, zone)}
        className={`w-11 h-11 rounded-xl border text-[9px] font-mono flex flex-col items-center justify-center cursor-pointer transition-all active:scale-90 relative group select-none shadow-md ${seatColorClass}`}
      >
        <Armchair size={14} className={isOccupied ? "opacity-90" : "opacity-30"} />
        <span className="font-bold font-mono text-[8px] mt-0.5">{seatId}</span>
        
        {attendeeInfo && (
          <div className="absolute bottom-12 bg-zinc-950 border border-purple-500/50 text-white text-[10px] p-2.5 rounded-xl hidden group-hover:block w-44 z-40 shadow-2xl text-left pointer-events-none">
            <p className="font-black text-purple-400 truncate">{attendeeInfo.prefix}{attendeeInfo.fullname}</p>
            <p className="text-[9px] text-zinc-400 truncate mt-0.5">{attendeeInfo.position || 'ไม่ระบุตำแหน่ง'}</p>
          </div>
        )}
        
        {showVipNames && attendeeInfo && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 font-bold truncate max-w-[50px] bg-black/60 px-1 py-0.5 rounded border border-white/5">
            {attendeeInfo.fullname.substring(0, 5)}
          </span>
        )}
      </div>
    );
  };

  const filteredRoster = attendees.filter(a => 
    a.fullname.includes(rosterSearchTerm) || (a.organization && a.organization.includes(rosterSearchTerm))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1633] via-[#17244d] to-[#0c1633] text-white flex flex-col font-sans select-none overflow-hidden relative">
      
      {/* ⏱️ HEADER: เพิ่มโลโก้ NiiVaa และนาฬิกา */}
      <div className="bg-[#0b1430]/90 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-30 shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-purple-400 flex items-center gap-2">
              <Sliders size={22} /> ศูนย์บริหารผังเก้าอี้ VIP แบบแยกโซนตอนลึก (Dynamic Seating)
            </h1>
            <p className="text-xs text-zinc-400 mt-1">แตะที่เก้าอี้เพื่อจัดการสิทธิ์ หรือกด 1-Click Auto Seat เพื่อถมที่นั่งอัตโนมัติ</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-4 self-end xl:self-center">
          <div className="flex items-center gap-2">
            <button onClick={handleSmartAutoSeating} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 font-black rounded-xl shadow-lg text-xs transition-all">⚡ 1-Click Auto Seat</button>
            <button onClick={handleSaveSeatingToSupabase} disabled={loading} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 font-black rounded-xl shadow-lg text-xs transition-all flex items-center gap-1">
              {loading ? <RefreshCw size={14} className="animate-spin"/> : '💾 บันทึกผัง'}
            </button>
          </div>
          
          <div className="h-10 w-px bg-white/10 hidden lg:block"></div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block">
              <div className="text-xl font-mono font-black text-purple-400 leading-none">{time.toLocaleTimeString('th-TH')}</div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
            </div>
            <div className="flex flex-col items-end justify-center">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-7 object-contain" />
              <span className="text-[8px] text-purple-400 font-bold tracking-widest mt-1">ระบบบริหารการจัดงานดิจิทัลอัจฉริยะ</span>
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">
        
        {/* 📋 คอลัมน์ซ้าย: บัญชีรายชื่อรวม (ดูสถานะเฉยๆ ว่าใครมีที่นั่งแล้วบ้าง) */}
        <div className="xl:col-span-3 bg-black/30 border-r border-white/5 p-4 flex flex-col gap-4 overflow-hidden backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={14} />
            <input 
              type="text" 
              value={rosterSearchTerm}
              onChange={e => setRosterSearchTerm(e.target.value)}
              placeholder="ค้นหารายชื่อจากทะเบียน..." 
              className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-purple-500 font-bold text-white"
            />
          </div>

          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">
            ทะเบียนประวัติแขก VIP ทั้งหมด ({filteredRoster.length} ท่าน)
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredRoster.map((att) => {
              const assignedSeat = Object.values(assignments).find(a => a.attendee_id === att.id);
              return (
                <div key={att.id} className="p-2.5 rounded-xl border bg-zinc-900/40 border-white/5 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${assignedSeat ? 'text-zinc-400' : 'text-zinc-200'}`}>{att.prefix}{att.fullname}</p>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">{att.position || 'ไม่ระบุตำแหน่ง'}</p>
                  </div>
                  {assignedSeat ? (
                    <span className="text-[9px] bg-purple-900/40 border border-purple-500/30 text-purple-300 font-mono px-2 py-0.5 rounded-lg font-black shrink-0">🪑 {assignedSeat.seat_id}</span>
                  ) : (
                    <span className="text-[9px] bg-zinc-800 text-zinc-500 font-black px-2 py-0.5 rounded-lg shrink-0">รอนั่ง</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 📺 คอลัมน์ขวา: แผงกราฟิกแผนผัง Interactive Seating Grid 3 โซน */}
        <div className="xl:col-span-9 flex flex-col p-6 overflow-y-auto gap-4 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 border border-white/5 p-4 rounded-2xl shrink-0">
            <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl space-y-1.5 text-left">
              <div className="font-black text-cyan-400 text-[11px]">⬅️ ปีกข้างซ้ายตอนลึก (Left Wing)</div>
              <div className="flex gap-2 items-center text-zinc-400 text-[11px]">
                <span>แถว:</span><input type="number" value={leftConfig.rows} onChange={e => setLeftConfig({ ...leftConfig, rows: Math.max(1, Number(e.target.value)) })} className="w-12 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none" />
                <span>ลึก:</span><input type="number" value={leftConfig.seats} onChange={e => setLeftConfig({ ...leftConfig, seats: Math.max(1, Number(e.target.value)) })} className="w-12 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none" />
              </div>
            </div>
            <div className="p-3 bg-purple-950/10 border border-purple-500/20 rounded-xl space-y-1.5 text-left">
              <div className="font-black text-purple-400 text-[11px]">🏛️ โซนกลางหลัก (Center Zone)</div>
              <div className="flex gap-2 items-center text-zinc-400 text-[11px]">
                <span>แถว:</span><input type="number" value={centerConfig.rows} onChange={e => setCenterConfig({ ...centerConfig, rows: Math.max(1, Number(e.target.value)) })} className="w-12 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-purple-300 font-mono font-bold outline-none" />
                <span>ต่อแถว:</span><input type="number" value={centerConfig.seats} onChange={e => setCenterConfig({ ...centerConfig, seats: Math.max(1, Number(e.target.value)) })} className="w-12 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-purple-300 font-mono font-bold outline-none" />
              </div>
            </div>
            <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl space-y-1.5 text-left">
              <div className="font-black text-cyan-400 text-[11px]">➡️ ปีกข้างขวาตอนลึก (Right Wing)</div>
              <div className="flex gap-2 items-center text-zinc-400 text-[11px]">
                <span>แถว:</span><input type="number" value={rightConfig.rows} onChange={e => setRightConfig({ ...rightConfig, rows: Math.max(1, Number(e.target.value)) })} className="w-12 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none" />
                <span>ลึก:</span><input type="number" value={rightConfig.seats} onChange={e => setRightConfig({ ...rightConfig, seats: Math.max(1, Number(e.target.value)) })} className="w-12 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center bg-black/20 px-4 py-2 rounded-xl border border-white/5 text-[10px] text-zinc-500 font-bold shrink-0 gap-2">
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1">⚪ ว่าง (Zinc)</span>
              <span className="flex items-center gap-1 text-purple-400">🟣 จอง/สแตนบายคิว (Purple)</span>
              <span className="flex items-center gap-1 text-emerald-400">🟢 มานั่งแล้ว (Emerald)</span>
              <span className="flex items-center gap-1 text-yellow-400">🟡 ลุกชั่วคราว (Yellow)</span>
            </div>
            <button onClick={() => setShowVipNames(!showVipNames)} className="text-purple-400 hover:underline">{showVipNames ? '👁️ ซ่อนชื่อใต้เก้าอี้' : '👁️ แสดงชื่อถาวรใต้เก้าอี้'}</button>
          </div>

          <div className="p-6 bg-black/40 rounded-[2rem] border border-white/5 overflow-x-auto text-center space-y-4 flex-1 min-h-[500px]">
            <div className="w-64 py-1.5 bg-zinc-800 border border-white/10 text-zinc-400 font-black tracking-widest mx-auto rounded-b-xl text-[10px]">STAGE / FRONT (เวทีกลาง)</div>
            
            <div className="flex flex-row justify-center items-start gap-6 min-w-max p-4 pt-6">
              {/* ซ้าย */}
              <div className="p-4 bg-cyan-950/5 border border-cyan-500/10 rounded-2xl">
                <div className="flex gap-2">
                  {Array.from({ length: leftConfig.rows }).map((_, r) => {
                    const char = String.fromCharCode(76 + r); 
                    return (
                      <div key={char} className="flex flex-col gap-7 items-center">
                        <span className="text-cyan-500 font-mono text-[10px] font-black">{char}</span>
                        {Array.from({ length: leftConfig.seats }).map((_, s) => renderSmartSeat(`${char}${s + 1}`, 'left'))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* กลาง */}
              <div className="p-4 bg-purple-950/5 border border-purple-500/10 rounded-2xl">
                <div className="space-y-7">
                  {Array.from({ length: centerConfig.rows }).map((_, r) => {
                    const lbl = String.fromCharCode(65 + r); 
                    return (
                      <div key={lbl} className="flex gap-2 items-center justify-center">
                        <span className="w-4 font-mono font-black text-purple-500 text-xs text-left">{lbl}</span>
                        {Array.from({ length: centerConfig.seats }).map((_, s) => renderSmartSeat(`${lbl}${s + 1}`, 'center'))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ขวา */}
              <div className="p-4 bg-cyan-950/5 border border-cyan-500/10 rounded-2xl">
                <div className="flex gap-2">
                  {Array.from({ length: rightConfig.rows }).map((_, r) => {
                    const char = String.fromCharCode(90 - r); 
                    return (
                      <div key={char} className="flex flex-col gap-7 items-center">
                        <span className="text-cyan-500 font-mono text-[10px] font-black">{char}</span>
                        {Array.from({ length: rightConfig.seats }).map((_, s) => renderSmartSeat(`${char}${s + 1}`, 'right'))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          📦 MODAL: จัดการสิทธิ์ผู้ครองเก้าอี้ (ตามภาพ Mockup)
          ======================================================== */}
      {activeSeatModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 rounded-[28px] p-6 w-full max-w-md shadow-2xl flex flex-col gap-5">
            
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-purple-900/60 text-purple-400 font-black px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest border border-purple-500/30">
                  พิกัด {activeSeatModal.id} ({activeSeatModal.zone.toUpperCase()})
                </span>
                <h3 className="font-black text-xl text-white mt-3">จัดการสิทธิ์ผู้ครองเก้าอี้ VIP</h3>
              </div>
              <button onClick={() => setActiveSeatModal(null)} className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"><X size={16}/></button>
            </div>

            {/* แสดงข้อมูลคนนั่งปัจจุบัน (ถ้ามี) */}
            {assignments[activeSeatModal.id] ? (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center shrink-0">
                    <UserCheck size={20} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">ผู้ครอบครองเก้าอี้ปัจจุบัน:</p>
                    <p className="text-lg font-black text-white truncate">
                      {attendees.find(a => a.id === assignments[activeSeatModal.id].attendee_id)?.prefix}
                      {attendees.find(a => a.id === assignments[activeSeatModal.id].attendee_id)?.fullname}
                    </p>
                  </div>
                </div>
                <button onClick={handleClearSeatFromModal} className="w-full py-2.5 bg-red-950/50 hover:bg-red-900/80 border border-red-500/30 text-red-400 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all mt-1">
                  <Trash2 size={14} /> ล้างที่นั่ง (นำรายชื่อออก)
                </button>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-center">
                <Armchair size={24} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-400">เก้าอี้ตัวนี้ยังว่างเปล่าครับ</p>
              </div>
            )}

            {/* แผงค้นหาและเลือกคนนั่งใหม่ (ใช้ได้ทั้งตอนเก้าอี้ว่าง หรือตอนต้องการสลับตัวคนนั่ง) */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-purple-500" size={16} />
                <input 
                  type="text" 
                  value={modalSearchTerm}
                  onChange={e => setModalSearchTerm(e.target.value)}
                  placeholder="พิมพ์ชื่อ-สกุล หรือสังกัดเพื่อค้นหา..." 
                  className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 text-white font-bold"
                />
              </div>
              
              <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1 ml-1">💡 แตะเลือกรายชื่อเพื่อส่งลงนั่ง:</p>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {attendees
                  .filter(a => a.fullname.includes(modalSearchTerm) || (a.organization && a.organization.includes(modalSearchTerm)))
                  .map(att => {
                    const isAlreadySittingHere = assignments[activeSeatModal.id]?.attendee_id === att.id;
                    if (isAlreadySittingHere) return null; // ซ่อนคนที่กำลังนั่งอยู่เก้าอี้นี้แล้ว

                    const currentSeatOfThisPerson = Object.values(assignments).find(a => a.attendee_id === att.id)?.seat_id;

                    return (
                      <div key={att.id} className="bg-zinc-900 border border-white/5 p-3 rounded-2xl flex justify-between items-center gap-3 hover:border-purple-500/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-white truncate">{att.prefix}{att.fullname}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {att.position || 'ไม่ระบุตำแหน่ง'} 
                            {currentSeatOfThisPerson && <span className="text-amber-500 ml-1">(นั่งอยู่ {currentSeatOfThisPerson})</span>}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleAssignSeatFromModal(att.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all
                            ${currentSeatOfThisPerson 
                              ? 'bg-amber-950/40 text-amber-500 hover:bg-amber-900/60 border border-amber-500/30' 
                              : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-500/30'}
                          `}
                        >
                          {currentSeatOfThisPerson ? <ArrowRightLeft size={14}/> : <UserCheck size={14}/>} 
                          {currentSeatOfThisPerson ? 'ย้ายมานั่ง' : 'เลือกนั่ง'}
                        </button>
                      </div>
                    );
                })}
                {attendees.filter(a => a.fullname.includes(modalSearchTerm)).length === 0 && (
                  <p className="text-xs text-zinc-500 text-center py-4">ไม่พบรายชื่อที่ค้นหา</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}