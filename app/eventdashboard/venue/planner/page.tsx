"use client";
import SeatingPlannerManualDrawer from '@/components/SeatingPlannerManualDrawer'; // ปรับ Path ให้ตรง
import Draggable from 'react-draggable';
import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Activity, Save, BellRing, Droplet, HelpCircle, Link, LayoutGrid, Trash, Sparkles, CheckCircle2, Sliders, Loader2, ArrowLeft, Armchair, Check, X, RefreshCw, Search, Trash2, ArrowRightLeft, UserCheck, Coffee, Move, Lock, Unlock, Users, UserPlus, ListOrdered } from 'lucide-react';

const DRINK_MENU = [
  { id: 'none', label: 'ไม่รับเครื่องดื่ม', group: 'none', is_active: true },
  { id: 'water_cold', label: 'น้ำเย็น', group: 'water', is_active: true },
  { id: 'water_room', label: 'น้ำไม่เย็น (อุณหภูมิห้อง)', group: 'water', is_active: true },
  { id: 'water_warm', label: 'น้ำอุ่น', group: 'water', is_active: true },
  { id: 'tea', label: 'น้ำชา', group: 'water', is_active: true },
  { id: 'coffee_black', label: 'กาแฟดำ', group: 'coffee', is_active: true },
  { id: 'coffee_less_sugar', label: 'กาแฟ (หวานน้อย)', group: 'coffee', is_active: true },
  { id: 'coffee_normal', label: 'กาแฟ (หวานปกติ)', group: 'coffee', is_active: true },
  { id: 'ovaltine', label: 'โอวัลติน', group: 'coffee', is_active: false },
];

const WATER_OPTIONS = ['ไม่รับน้ำดื่ม', 'น้ำเย็น', 'น้ำไม่เย็น (อุณหภูมิห้อง)', 'น้ำอุ่น'];
const BEVERAGE_OPTIONS = ['ไม่รับเครื่องดื่ม', 'กาแฟดำ', 'กาแฟ (หวานน้อย)', 'กาแฟ (หวานปกติ)', 'ชา', 'โอวัลติน'];

interface Attendee {
  id: string;
  prefix: string;
  fullname: string;
  position: string;
  organization: string;
  priority_level: number;
  action_sequence?: number;
  attendee_type?: string;
  special_act1?: string;
  special_act2?: string;
  profile_image_url?: string;
}

interface SeatAssignment {
  seat_id: string;
  seat_zone: 'left' | 'center' | 'right';
  attendee_id: string;
  live_presence: 'pending' | 'arrived' | 'seated' | 'away';
  drink_pref?: string;
  water_pref?: string;
  is_served?: boolean;
}

function SeatingPlannerContent() {
  // 🌟 เก็บ URL รูปภาพพร้อมชื่อ
  const [enlargedImage, setEnlargedImage] = useState<{ url: string, name: string } | null>(null);
  // 🌟 เก็บ ID ของที่นั่งที่ถูกค้นหาเพื่อทำไฮไลต์
  const [highlightedSeat, setHighlightedSeat] = useState<string | null>(null);
  const [isEditLayout, setIsEditLayout] = useState(false);

  const leftZoneRef = useRef(null);
  const centerZoneRef = useRef(null);
  const rightZoneRef = useRef(null);

  const [zonePositions, setZonePositions] = useState({
    left: { x: 20, y: 80 },
    center: { x: 320, y: 80 },
    right: { x: 700, y: 80 }
  });

  const handleDragStop = (zone: 'left' | 'center' | 'right', data: { x: number, y: number }) => {
    setZonePositions(prev => ({
      ...prev,
      [zone]: { x: data.x, y: data.y }
    }));
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [time, setTime] = useState(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [assignments, setAssignments] = useState<Record<string, SeatAssignment>>({});

  const [rosterSearchTerm, setRosterSearchTerm] = useState('');

  // 🌟 ย้าย State สำหรับ Dropdown กรองรายชื่อขึ้นมาประกาศตรงนี้
  const [rosterFilter, setRosterFilter] = useState('All');

  const [showVipNames, setShowVipNames] = useState(true);

  const [leftConfig, setLeftConfig] = useState({ rows: 4, seats: 5 });
  const [centerConfig, setCenterConfig] = useState({ rows: 6, seats: 8 });
  const [rightConfig, setRightConfig] = useState({ rows: 4, seats: 5 });

  const [activeSeatModal, setActiveSeatModal] = useState<{ id: string, zone: 'left' | 'center' | 'right' } | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchConfig, setBatchConfig] = useState({
    zone: 'center' as 'left' | 'center' | 'right',
    group: 'all',
    sortBy: 'priority_level' as 'priority_level' | 'action_sequence',
    count: 50,
    startSeat: '',
    pattern: 'standard' as 'standard' | 'snake'
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [visibleZones, setVisibleZones] = useState({ left: true, center: true, right: true });

  interface ServiceAlert {
    type: 'water' | 'clear' | 'clean' | 'help';
    message: string;
    timestamp: Date;
  }
  const [alerts, setAlerts] = useState<Record<string, ServiceAlert>>({});
  const [clearedDrinks, setClearedDrinks] = useState<Record<string, boolean>>({});

  // 🌟 ย้ายค่าคงที่หมวดหมู่มาอยู่ด้วยกัน
  const ROSTER_FILTERS = [
    { id: 'All', label: '📋 กรอง: ทั้งหมด (All)' },
    { id: 'VIP', label: '🌟 กรอง: เฉพาะ VIP' },
    { id: 'Staff', label: '🎧 กรอง: เฉพาะ Staff' },
    { id: 'General', label: '👥 กรอง: เฉพาะ General' },
    { id: 'Speaker', label: '🗣️ กรอง: เฉพาะ Speaker' },
    { id: 'Guest', label: '🤝 กรอง: เฉพาะ Guest' },
    { id: 'special_act1', label: '🎭 กรอง: Special Act 1' },
    { id: 'special_act2', label: '🎬 กรอง: Special Act 2' },
    { id: 'Present', label: '🎤 กรอง: ประกาศชื่อ (Present)' }
  ];

  const triggerAlert = (seatId: string, type: 'water' | 'clear' | 'clean' | 'help', message: string) => {
    setAlerts(prev => ({ ...prev, [seatId]: { type, message, timestamp: new Date() } }));
  };

  const resolveAlert = (seatId: string) => {
    setAlerts(prev => {
      const updated = { ...prev };
      delete updated[seatId];
      return updated;
    });
  };

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const initPlannerData = async () => {
    setLoading(true);
    try {
      const { data: attData, error: attError } = await supabase
        .from('event_attendees')
        .select('id, prefix, fullname, position, organization, priority_level, action_sequence, attendee_type, special_act1, special_act2, global_profiles(profile_image_url)')
        .eq('event_id', eventId !== 'current' ? eventId : null);

      if (attError) {
        console.error("Supabase Error:", attError);
      }

      if (attData) {
        const formattedData = attData.map((att: any) => ({
          ...att,
          profile_image_url: att.global_profiles?.profile_image_url || null
        }));
        const sorted = formattedData.sort((a, b) => (a.priority_level || 50) - (b.priority_level || 50));
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
            live_presence: s.live_presence || 'pending',
            drink_pref: s.drink_pref || '',
            water_pref: s.water_pref || '',
            is_served: s.is_served || false
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

    // 🌟 ตั้งค่า Channel ฝั่งรับสัญญาณให้ตรงกัน
    const seatingChannel = supabase.channel('realtime_guest_seating_sync', {
      config: { broadcast: { ack: true } }
    });

    seatingChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_seat_assignments' }, () => {
        initPlannerData();
      })
      // 🛎️ ดักฟัง Broadcast จากหน้าแขก
      .on('broadcast', { event: 'service_alert' }, (response) => {
        const { seatId, type, message } = response.payload;
        // เรียกป๊อปอัปแจ้งเตือนให้ทีมงานเห็น
        triggerAlert(seatId, type as 'water' | 'clear' | 'clean' | 'help', message);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(seatingChannel);
    };
  }, [eventId]);

  const handleSeatClick = (seatId: string, zone: 'left' | 'center' | 'right') => {
    setActiveSeatModal({ id: seatId, zone });
    setModalSearchTerm('');
  };

  const handleAssignSeatFromModal = (attendeeId: string) => {
    if (!activeSeatModal) return;
    const updatedMap = { ...assignments };
    Object.keys(updatedMap).forEach(key => {
      if (updatedMap[key].attendee_id === attendeeId) delete updatedMap[key];
    });

    updatedMap[activeSeatModal.id] = {
      seat_id: activeSeatModal.id,
      seat_zone: activeSeatModal.zone,
      attendee_id: attendeeId,
      live_presence: 'pending',
      drink_pref: '',
      is_served: false
    };
    setAssignments(updatedMap);
    setActiveSeatModal(null);
  };

  const handleClearSeatFromModal = () => {
    if (!activeSeatModal) return;
    setAssignments(prev => {
      const updated = { ...prev };
      delete updated[activeSeatModal.id];
      return updated;
    });
    setActiveSeatModal(null);
  };

  const handleUpdatePresence = (seatId: string, status: 'pending' | 'arrived' | 'away') => {
    setAssignments(prev => ({
      ...prev,
      [seatId]: { ...prev[seatId], live_presence: status }
    }));
  };

  const handleToggleClearDrink = (seatId: string) => {
    setClearedDrinks(prev => {
      const next = { ...prev };
      if (next[seatId]) delete next[seatId];
      else next[seatId] = true;
      return next;
    });
  };

  const handleServeNewRoundIndividual = (seatId: string) => {
    setClearedDrinks(prev => { const next = { ...prev }; delete next[seatId]; return next; });
    setAssignments(prev => ({
      ...prev,
      [seatId]: { ...prev[seatId], is_served: false }
    }));
  };

  const handleClearAllDrinks = () => {
    if (!confirm('ยืนยันการเคลียร์โต๊ะ\nต้องการซ่อนไอคอนเครื่องดื่มบนแผนผัง "ทั้งหมด" ใช่หรือไม่?')) return;
    const allSeats = Object.keys(assignments);
    const newCleared: Record<string, boolean> = {};
    allSeats.forEach(id => newCleared[id] = true);
    setClearedDrinks(newCleared);
  };

  const handleNewRoundAll = () => {
    if (!confirm('เริ่มเสิร์ฟรอบใหม่\nสถานะเครื่องดื่มทั้งหมดจะกลับเป็น "รอเสิร์ฟ" (สีส้ม) และแสดงไอคอนอีกครั้ง ใช่หรือไม่?')) return;
    setClearedDrinks({});
    setAssignments(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], is_served: false };
      });
      return next;
    });
  };

  const handleSmartAutoSeating = () => {
    const assignedIds = new Set(Object.values(assignments).map(a => a.attendee_id));
    const unassignedAttendees = attendees.filter(a => !assignedIds.has(a.id));

    if (unassignedAttendees.length === 0) {
      alert("📋 แขก VIP ทุกคนมีที่นั่งระบุครบถ้วนหมดแล้วครับ!");
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
              live_presence: 'pending',
              drink_pref: '',
              is_served: false
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

  const handleRunBatchSeating = () => {
    const assignedIds = new Set(Object.values(assignments).map(a => a.attendee_id));
    let pool = attendees.filter(a => !assignedIds.has(a.id));

    if (batchConfig.group !== 'all') {
      if (batchConfig.group === 'vip') {
        pool = pool.filter(a => a.attendee_type === 'VIP');
      } else if (batchConfig.group === 'general') {
        pool = pool.filter(a => a.attendee_type === 'General');
      } else if (batchConfig.group === 'special1') {
        pool = pool.filter(a => !!a.special_act1 && a.special_act1.trim() !== '' && a.special_act1.toLowerCase() !== 'none');
      } else if (batchConfig.group === 'special2') {
        pool = pool.filter(a => !!a.special_act2 && a.special_act2.trim() !== '' && a.special_act2.toLowerCase() !== 'none');
      }
    }

    pool.sort((a, b) => {
      if (batchConfig.sortBy === 'priority_level') return (a.priority_level || 999) - (b.priority_level || 999);
      if (batchConfig.sortBy === 'action_sequence') return (a.action_sequence || 999) - (b.action_sequence || 999);
      return 0;
    });

    pool = pool.slice(0, batchConfig.count);

    if (pool.length === 0) {
      alert("⚠️ ไม่มีแขกในกลุ่มที่เลือก หรือจัดที่นั่งไปครบหมดแล้ว");
      return;
    }

    const config = batchConfig.zone === 'left' ? leftConfig : batchConfig.zone === 'center' ? centerConfig : rightConfig;
    const charCodeStart = batchConfig.zone === 'center' ? 65 : batchConfig.zone === 'left' ? 76 : 90;
    const reverseRowLetter = batchConfig.zone === 'right';

    let orderedSeats: string[] = [];
    for (let r = 0; r < config.rows; r++) {
      const rowLetter = String.fromCharCode(reverseRowLetter ? charCodeStart - r : charCodeStart + r);
      let rowSeats: string[] = [];
      for (let s = 1; s <= config.seats; s++) {
        rowSeats.push(`${rowLetter}${s}`);
      }

      if (batchConfig.pattern === 'snake' && r % 2 === 1) {
        rowSeats.reverse();
      }

      orderedSeats.push(...rowSeats);
    }

    let startIndex = 0;
    if (batchConfig.startSeat.trim() !== '') {
      const foundIdx = orderedSeats.findIndex(s => s.toLowerCase() === batchConfig.startSeat.trim().toLowerCase());
      if (foundIdx !== -1) {
        startIndex = foundIdx;
      } else {
        alert(`❌ ไม่พบหมายเลขที่นั่ง ${batchConfig.startSeat} ในโซนที่เลือก ระบบจะเริ่มจากที่นั่งแรกแทน`);
      }
    }

    const targetSeats = orderedSeats.slice(startIndex);
    const updatedAssignments = { ...assignments };
    let assignedCount = 0;
    let poolIdx = 0;

    for (const seatId of targetSeats) {
      if (!updatedAssignments[seatId] && poolIdx < pool.length) {
        updatedAssignments[seatId] = {
          seat_id: seatId,
          seat_zone: batchConfig.zone,
          attendee_id: pool[poolIdx].id,
          live_presence: 'pending',
          drink_pref: '',
          is_served: false
        };
        poolIdx++;
        assignedCount++;
      }
    }

    setAssignments(updatedAssignments);
    setIsBatchModalOpen(false);
    alert(`✅ จัดที่นั่งแบบกลุ่มสำเร็จแล้ว จำนวน ${assignedCount} ท่าน`);
  };

  const handleSaveSeatingToSupabase = async () => {
    setLoading(true);
    try {
      const finalEventId = eventId !== 'current' ? eventId : null;
      const { data: oldAssignments } = await supabase
        .from('event_seat_assignments')
        .select('attendee_id')
        .eq('event_id', finalEventId);

      const oldAttendeeIds = oldAssignments ? oldAssignments.map(a => a.attendee_id) : [];
      await supabase.from('event_seat_assignments').delete().eq('event_id', finalEventId);

      const insertRows = Object.values(assignments).map(a => ({
        event_id: finalEventId,
        attendee_id: a.attendee_id,
        seat_id: a.seat_id,
        seat_zone: a.seat_zone,
        live_presence: a.live_presence,
        drink_pref: a.drink_pref || null,
        water_pref: a.water_pref || null,
        is_served: a.is_served || false
      }));

      const newAttendeeIds = insertRows.map(r => r.attendee_id);
      const removedAttendeeIds = oldAttendeeIds.filter(id => !newAttendeeIds.includes(id));

      if (removedAttendeeIds.length > 0) {
        await supabase
          .from('event_attendees')
          .update({ seat_number: null })
          .in('id', removedAttendeeIds);
      }

      if (insertRows.length > 0) {
        const { error } = await supabase.from('event_seat_assignments').insert(insertRows);
        if (!error) {
          const updatePromises = insertRows.map(row =>
            supabase
              .from('event_attendees')
              .update({ seat_number: row.seat_id })
              .eq('id', row.attendee_id)
          );
          await Promise.all(updatePromises);
          alert("💾 บันทึกแผนผังเก้าอี้ VIP และซิงค์ที่นั่งไปยังหน้าแสดงรายชื่อเสร็จสมบูรณ์!");
        } else {
          alert(`❌ บันทึกผิดพลาด: ${error.message}`);
        }
      } else {
        alert("🧹 เคลียร์แผนผังเก้าอี้ว่างเปล่าเรียบร้อย");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
    setLoading(false);
  };

  const handleUpdateDrink = (seatId: string, updates: Partial<SeatAssignment>) => {
    setAssignments(prev => ({
      ...prev,
      [seatId]: { ...prev[seatId], ...updates }
    }));
  };

  const renderSmartSeat = (seatId: string, zone: 'left' | 'center' | 'right') => {
    const isOccupied = assignments[seatId];
    const attendeeInfo = isOccupied ? attendees.find(a => a.id === isOccupied.attendee_id) : null;
    const activeAlert = alerts[seatId];
    let seatColorClass = "bg-zinc-800 border-zinc-700 hover:border-zinc-500 text-zinc-500";

    if (activeAlert) {
      if (activeAlert.type === 'water') seatColorClass = "bg-blue-900 border-blue-400 text-blue-100 ring-2 ring-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20";
      else if (activeAlert.type === 'clear') seatColorClass = "bg-zinc-800 border-zinc-400 text-white ring-2 ring-zinc-400 animate-pulse shadow-[0_0_15px_rgba(161,161,170,0.8)] z-20";
      else if (activeAlert.type === 'clean') seatColorClass = "bg-rose-900 border-rose-400 text-rose-100 ring-2 ring-rose-500 animate-pulse shadow-[0_0_15px_rgba(225,29,72,0.8)] z-20";
      else seatColorClass = "bg-amber-900 border-amber-400 text-amber-100 ring-2 ring-amber-500 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.8)] z-20";
    }
    else if (isOccupied) {
      if (isOccupied.live_presence === 'arrived' || isOccupied.live_presence === 'seated') seatColorClass = "bg-emerald-600 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]";
      else if (isOccupied.live_presence === 'away') seatColorClass = "bg-yellow-500 border-yellow-300 text-black";
      else seatColorClass = "bg-purple-600 border-purple-400 text-purple-100 shadow-[0_0_10px_rgba(147,51,234,0.3)]";
    }

    const hasDrinkOrder = isOccupied?.water_pref || isOccupied?.drink_pref;
    const showDrinkIcon = hasDrinkOrder && !clearedDrinks[seatId];

    // 🌟 เช็กว่าที่นั่งนี้กำลังถูกไฮไลต์อยู่หรือไม่
    const isHighlighted = seatId === highlightedSeat;

    return (
      <div
        key={seatId}
        onClick={() => {
          if (isEditLayout) return;
          handleSeatClick(seatId, zone);
        }}
        // 🌟 เพิ่มเงื่อนไข isHighlighted ใน className หากใช่ให้ขยายและเรืองแสงสีฟ้า
        className={`w-11 h-11 rounded-xl border text-[9px] font-mono flex flex-col items-center justify-center cursor-pointer transition-all relative group select-none shadow-md ${seatColorClass} ${isHighlighted ? 'scale-125 ring-4 ring-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.9)] z-50 animate-pulse' : 'active:scale-90'}`}
      >
        <Armchair size={14} className={isOccupied ? "opacity-90" : "opacity-30"} />
        <span className="font-bold font-mono text-[8px] mt-0.5">{seatId}</span>

        {showDrinkIcon && (
          <div
            className={`absolute -top-2 -right-2 rounded-full p-1 transition-all ${isOccupied.is_served
              ? 'bg-emerald-950 border border-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
              : 'bg-orange-950 border border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.9)] animate-pulse z-30'
              }`}
          >
            <Coffee
              size={10}
              className={
                isOccupied.is_served
                  ? 'text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,1)]'
                  : 'text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,1)]'
              }
            />
          </div>
        )}

        {attendeeInfo && (
          <div className="absolute bottom-12 bg-zinc-950 border border-purple-500/50 text-white text-[10px] p-2.5 rounded-xl hidden group-hover:block w-44 z-40 shadow-2xl text-left pointer-events-none">
            <div className="flex items-center gap-3 border-b border-purple-500/30 pb-2">
              {attendeeInfo.profile_image_url ? (
                <img src={attendeeInfo.profile_image_url} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 shrink-0"><UserCheck size={16} className="text-zinc-500" /></div>
              )}
              <div className="min-w-0">
                <p className="font-black text-purple-400 truncate">{attendeeInfo.prefix}{attendeeInfo.fullname}</p>
                <p className="text-[9px] text-zinc-400 truncate mt-0.5">{attendeeInfo.position || 'ไม่ระบุตำแหน่ง'}</p>
              </div>
            </div>

            {hasDrinkOrder && (
              <div className="mt-1.5 pt-1.5">
                {isOccupied.water_pref && (
                  <p className={`text-[9px] font-bold truncate ${isOccupied.is_served ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    💧 {isOccupied.water_pref}
                  </p>
                )}
                {isOccupied.drink_pref && (
                  <p className={`text-[9px] font-bold truncate mt-0.5 ${isOccupied.is_served ? 'text-emerald-400' : 'text-amber-400'}`}>
                    ☕ {isOccupied.drink_pref}
                  </p>
                )}
                <p className={`text-[8px] mt-1 ${isOccupied.is_served ? 'text-emerald-500' : 'text-zinc-500'}`}>
                  {isOccupied.is_served ? '✓ เสิร์ฟเรียบร้อย' : '⌛ รอการเสิร์ฟ'}
                </p>
              </div>
            )}
          </div>
        )}

        {showVipNames && attendeeInfo && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-zinc-400 font-bold truncate max-w-[50px] bg-black/60 px-1 py-0.5 rounded border border-white/5 z-10">
            {attendeeInfo.fullname.substring(0, 5)}
          </span>
        )}
      </div>
    );
  };

  const leftTotal = leftConfig.rows * leftConfig.seats;
  const centerTotal = centerConfig.rows * centerConfig.seats;
  const rightTotal = rightConfig.rows * rightConfig.seats;
  const grandTotal = leftTotal + centerTotal + rightTotal;
  const totalAssigned = Object.keys(assignments).length;

  const filteredRoster = attendees.filter(a => {
    const matchesSearch = (a.fullname?.includes(rosterSearchTerm)) || (a.organization?.includes(rosterSearchTerm));

    let matchesDropdown = true;
    if (rosterFilter !== 'All') {
      if (['VIP', 'General', 'Staff', 'Speaker', 'Guest', 'Walk-in'].includes(rosterFilter)) {
        matchesDropdown = a.attendee_type === rosterFilter;
      } else if (rosterFilter === 'special_act1') {
        matchesDropdown = !!a.special_act1 && a.special_act1.trim() !== '' && a.special_act1.toLowerCase() !== 'none';
      } else if (rosterFilter === 'special_act2') {
        matchesDropdown = !!a.special_act2 && a.special_act2.trim() !== '' && a.special_act2.toLowerCase() !== 'none';
      }
    }

    return matchesSearch && matchesDropdown;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1633] via-[#17244d] to-[#0c1633] text-white flex flex-col font-sans select-none overflow-hidden relative">
      {Object.keys(alerts).length > 0 && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 w-full max-w-lg pointer-events-none">
          {Object.entries(alerts).map(([id, alert]) => {
            let bgConfig = "bg-amber-500/90 border-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)]";
            let Icon = BellRing;
            if (alert.type === 'water') { bgConfig = "bg-blue-600/95 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.6)]"; Icon = Droplet; }
            if (alert.type === 'clear') { bgConfig = "bg-zinc-700/95 border-zinc-400 text-white shadow-[0_0_20px_rgba(63,63,70,0.6)]"; Icon = Trash; }
            if (alert.type === 'clean') { bgConfig = "bg-rose-600/95 border-rose-400 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)]"; Icon = Sparkles; }

            return (
              <div key={id} className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md animate-in slide-in-from-top-10 fade-in duration-300 ${bgConfig}`}>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-black/20 rounded-full animate-pulse"><Icon size={20} /></div>
                  <div>
                    <p className="text-sm font-black flex items-center gap-2">
                      เรียกบริการที่พิกัด: <span className="bg-black/30 px-2 py-0.5 rounded-md">{id}</span>
                    </p>
                    <p className="text-[11px] opacity-90 mt-0.5">{alert.message} • {alert.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
                <button onClick={() => resolveAlert(id)} className="px-4 py-2 bg-black/30 hover:bg-black/50 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 size={14} /> รับเรื่อง
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* HEADER */}
      <div className="bg-[#0b1430]/90 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 z-30 shadow-xl shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-purple-400 flex items-center gap-2">
              <Sliders size={22} /> ศูนย์บริหารผังเก้าอี้ VIP (Dynamic Seating)
            </h1>
            <p className="text-xs text-zinc-400 mt-1">แตะที่เก้าอี้เพื่อจัดการสิทธิ์ หรือจัดที่นั่งกลุ่มอัตโนมัติ (Batch Auto Seat)</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3 self-end xl:self-center">
          <div className="flex items-center gap-2">
            {/* 🌟 ปุ่มจัดกลุ่มลงที่นั่ง (ใหม่) */}
            <button onClick={() => setIsBatchModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 font-black rounded-xl shadow-lg text-xs transition-all flex items-center gap-1.5">
              <ListOrdered size={14} /> จัดกลุ่มลงที่นั่ง (Batch)
            </button>
            <button onClick={handleSmartAutoSeating} className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 font-black rounded-xl shadow-lg text-xs transition-all">⚡ 1-Click Auto Seat</button>
            <button onClick={handleSaveSeatingToSupabase} disabled={loading} className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 font-black rounded-xl shadow-lg text-xs transition-all flex items-center gap-1">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : '💾 บันทึกผัง'}
            </button>
          </div>

          <h1 className="text-xl md:text-2xl font-black text-purple-400 flex items-center gap-2 hidden sm:flex">
            <span className="text-sm bg-purple-900/50 px-2 py-1 rounded-lg ml-2 border border-purple-500/30">
              จองแล้ว <span className="text-white">{totalAssigned}/{grandTotal}</span> ที่นั่ง
            </span>
          </h1>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex-none flex items-center justify-center gap-2 px-3 h-[42px] bg-zinc-800 hover:bg-purple-900/40 text-zinc-300 hover:text-purple-400 rounded-xl transition-all duration-300 border border-zinc-700 hover:border-purple-500/50 shadow-md relative z-10"
          >
            <HelpCircle size={18} className="shrink-0" />
            <span className="text-sm font-bold whitespace-nowrap hidden sm:inline-block">คู่มือ</span>
          </button>

          <div className="h-10 w-px bg-white/10 hidden lg:block"></div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden lg:block">
              <div className="text-xl font-mono font-black text-purple-400 leading-none">
                {isMounted ? time.toLocaleTimeString('th-TH') : "--:--:--"}
              </div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
            </div>
            <button
              onClick={() => setIsEditLayout(!isEditLayout)}
              className={`px-4 py-2 font-black rounded-xl shadow-lg text-xs transition-all flex items-center gap-1.5 border ${isEditLayout
                ? 'bg-amber-500 text-black border-amber-400 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'
                }`}
            >
              {isEditLayout ? <Unlock size={14} /> : <Lock size={14} />}
              {isEditLayout ? '🔓 กำลังจัดวางผัง (คลิกเพื่อล็อค)' : '🔒 ปลดล็อคจัดวางผัง'}
            </button>
            {/* 📝 ปุ่ม: ลงทะเบียนผู้ร่วมงาน (สีเขียว/Emerald) */}
            <a
              href={`/eventdashboard/attendees?event_id=${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-950/40 hover:bg-emerald-700/60 border border-emerald-600/50 text-emerald-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">ลงทะเบียนผู้ร่วมงาน</span>
            </a>
            <a
              href={`/events/event-dashboard/${eventId}`}
              className="inline-flex flex-none items-center justify-center gap-2 px-4 h-[42px] bg-slate-800 hover:bg-teal-900/40 text-slate-300 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shadow-md cursor-pointer relative z-10"
              style={{ minWidth: '160px' }}
            >
              <LayoutGrid size={18} className="shrink-0" />
              <span className="text-sm font-bold whitespace-nowrap shrink-0">กลับหน้าหลัก</span>
            </a>
          </div>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 overflow-hidden">

        {/* 📋 คอลัมน์ซ้าย: รายชื่อ */}
        {/* 📋 คอลัมน์ซ้าย: รายชื่อ */}
        <div className="xl:col-span-3 bg-black/30 border-r border-white/5 p-4 flex flex-col gap-4 overflow-hidden backdrop-blur-sm">

          {/* 🌟 1. Dropdown กรองประเภท */}
          <select
            value={rosterFilter}
            onChange={(e) => setRosterFilter(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-purple-500 cursor-pointer"
          >
            {ROSTER_FILTERS.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>

          {/* 🌟 2. ช่องค้นหา */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-zinc-500" size={14} />
            <input
              type="text"
              value={rosterSearchTerm}
              onChange={e => setRosterSearchTerm(e.target.value)}
              placeholder="ค้นหารายชื่อ หรือสังกัด..."
              className="w-full bg-zinc-900 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-purple-500 font-bold text-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredRoster.map((att) => {
              const assignedSeat = Object.values(assignments).find(a => a.attendee_id === att.id);
              return (
                <div
                  key={att.id}
                  // 🌟 เพิ่ม cursor-pointer และ onClick ให้ทั้งกล่อง เพื่อคลิกหาตำแหน่งที่นั่ง
                  className="p-2.5 rounded-xl border bg-zinc-900/40 border-white/5 flex items-center gap-3 justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  onClick={() => {
                    if (assignedSeat) {
                      setHighlightedSeat(assignedSeat.seat_id);
                      setTimeout(() => setHighlightedSeat(null), 4000); // ให้เรืองแสง 4 วินาทีแล้วดับไปเอง
                    }
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0 cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                    onClick={(e) => {
                      e.stopPropagation(); // 🌟 ป้องกันไม่ให้การกดรูปลามไปคลิกกล่องใหญ่
                      if (att.profile_image_url) {
                        // 🌟 ส่งชื่อพ่วงไปกับ URL ด้วย
                        setEnlargedImage({ url: att.profile_image_url, name: `${att.prefix}${att.fullname}` });
                      }
                    }}
                  >
                    {att.profile_image_url ? (
                      <img src={att.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck size={16} className="text-zinc-600 m-auto mt-1.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-black truncate ${assignedSeat ? 'text-zinc-400' : 'text-zinc-200'}`}>{att.prefix}{att.fullname}</p>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">
                      {att.position || 'ไม่ระบุตำแหน่ง'}
                      {/* 🌟 แสดง Action Sequence (ถ้ามี) */}
                      {att.action_sequence && <span className="ml-1 text-cyan-500">(คิว: {att.action_sequence})</span>}
                    </p>
                  </div>
                  {assignedSeat ? (
                    <span className="text-[9px] bg-purple-900/40 border border-purple-500/30 text-purple-300 font-mono px-2 py-0.5 rounded-lg font-black shrink-0">🪑 {assignedSeat.seat_id}</span>
                  ) : (
                    <span className="text-[9px] bg-zinc-800 text-zinc-500 font-black px-2 py-0.5 rounded-lg shrink-0">รอนั่ง</span>
                  )}
                </div>
              );
            })}

            {filteredRoster.length === 0 && (
              <div className="text-center py-10 text-xs text-zinc-500">
                ไม่พบรายชื่อในหมวดหมู่ที่เลือก
              </div>
            )}
          </div>
        </div>

        {/* 📺 คอลัมน์ขวา: แผงที่นั่ง */}
        <div className="xl:col-span-9 flex flex-col p-6 overflow-y-auto gap-4 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 border border-white/5 p-4 rounded-2xl shrink-0">
            {/* 🌟 ปรับปรุงการตั้งค่า Layout (รองรับตัวเลขขนาดใหญ่) */}
            <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl flex justify-between items-center text-left transition-all">
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="font-black text-cyan-400 text-[11px]">⬅️ ปีกข้างซ้าย (Left Wing)</div>
                <div className="flex gap-2 items-center text-zinc-400 text-[11px]">
                  <span>แถว:</span><input type="number" min={1} value={leftConfig.rows} onChange={e => setLeftConfig({ ...leftConfig, rows: Math.max(1, Number(e.target.value)) })} className="w-14 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none focus:border-cyan-500" />
                  <span>ลึก:</span><input type="number" min={1} value={leftConfig.seats} onChange={e => setLeftConfig({ ...leftConfig, seats: Math.max(1, Number(e.target.value)) })} className="w-14 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="bg-blue-950 border border-blue-600 rounded-xl px-4 py-1.5 text-xl font-black text-white shadow-[0_0_10px_rgba(37,99,235,0.3)] shrink-0">
                {leftTotal}
              </div>
            </div>

            <div className="p-3 bg-purple-950/10 border border-purple-500/20 rounded-xl flex justify-between items-center text-left transition-all">
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="font-black text-purple-400 text-[11px]">🏛️ โซนกลางหลัก (Center Zone)</div>
                <div className="flex gap-2 items-center text-zinc-400 text-[11px]">
                  <span>กว้าง:</span><input type="number" min={1} value={centerConfig.seats} onChange={e => setCenterConfig({ ...centerConfig, seats: Math.max(1, Number(e.target.value)) })} className="w-14 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-purple-300 font-mono font-bold outline-none focus:border-purple-500" />
                  <span>ลึก:</span><input type="number" min={1} value={centerConfig.rows} onChange={e => setCenterConfig({ ...centerConfig, rows: Math.max(1, Number(e.target.value)) })} className="w-14 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-purple-300 font-mono font-bold outline-none focus:border-purple-500" />
                </div>
              </div>
              <div className="bg-blue-950 border border-blue-600 rounded-xl px-4 py-1.5 text-xl font-black text-white shadow-[0_0_10px_rgba(37,99,235,0.3)] shrink-0">
                {centerTotal}
              </div>
            </div>

            <div className="p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl flex justify-between items-center text-left transition-all">
              <div className="space-y-1.5 flex-1 pr-2">
                <div className="font-black text-cyan-400 text-[11px]">➡️ ปีกข้างขวา (Right Wing)</div>
                <div className="flex gap-2 items-center text-zinc-400 text-[11px]">
                  <span>แถว:</span><input type="number" min={1} value={rightConfig.rows} onChange={e => setRightConfig({ ...rightConfig, rows: Math.max(1, Number(e.target.value)) })} className="w-14 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none focus:border-cyan-500" />
                  <span>ลึก:</span><input type="number" min={1} value={rightConfig.seats} onChange={e => setRightConfig({ ...rightConfig, seats: Math.max(1, Number(e.target.value)) })} className="w-14 bg-zinc-900 border border-white/10 p-0.5 rounded text-center text-cyan-300 font-mono font-bold outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div className="bg-blue-950 border border-blue-600 rounded-xl px-4 py-1.5 text-xl font-black text-white shadow-[0_0_10px_rgba(37,99,235,0.3)] shrink-0">
                {rightTotal}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center bg-black/20 px-4 py-2 rounded-xl border border-white/5 text-[10px] text-zinc-500 font-bold shrink-0 gap-2">
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1">⚪ ว่าง</span>
              <span className="flex items-center gap-1 text-purple-400">🟣 จอง/รอนั่ง</span>
              <span className="flex items-center gap-1 text-emerald-400">🟢 มานั่งแล้ว</span>
              <span className="flex items-center gap-1 text-yellow-400">🟡 ลุกชั่วคราว</span>
              <span className="flex items-center gap-1 text-orange-400 ml-2">☕ รอเสิร์ฟน้ำ</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleClearAllDrinks} className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-white/10 transition-colors">🧹 เก็บแก้วทั้งหมด</button>
              <button onClick={handleNewRoundAll} className="px-2 py-1 bg-orange-950 hover:bg-orange-900 text-orange-400 border border-orange-500/30 rounded transition-colors">🔄 เริ่มเสิร์ฟรอบ 2</button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button onClick={() => setShowVipNames(!showVipNames)} className="text-purple-400 hover:underline">
                {showVipNames ? '👁️ ซ่อนชื่อ' : '👁️ แสดงชื่อ'}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center bg-zinc-900/50 px-4 py-3 rounded-xl border border-white/10 text-[11px] font-bold shrink-0 gap-4">
            <div className="flex items-center gap-4">
              <span className="text-zinc-400 font-black">👁️ แสดงโซน:</span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors">
                <input type="checkbox" checked={visibleZones.left} onChange={e => setVisibleZones({ ...visibleZones, left: e.target.checked })} className="accent-cyan-500 w-3 h-3" /> ⬅️ ซ้าย
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={visibleZones.center} onChange={e => setVisibleZones({ ...visibleZones, center: e.target.checked })} className="accent-purple-500 w-3 h-3" /> 🏛️ กลาง
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors">
                <input type="checkbox" checked={visibleZones.right} onChange={e => setVisibleZones({ ...visibleZones, right: e.target.checked })} className="accent-cyan-500 w-3 h-3" /> ➡️ ขวา
              </label>
            </div>

            {/* 🌟 ปรับระยะย่อขยายให้ซูมออกได้ถึง 10% (0.1) สำหรับผังขนาดใหญ่ */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-black mr-2">🔍 ซูม: {Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(prev => Math.max(0.1, prev - 0.05))} className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-md border border-white/10 active:scale-95">-</button>
              <input type="range" min="0.1" max="2" step="0.05" value={zoomLevel} onChange={(e) => setZoomLevel(parseFloat(e.target.value))} className="w-24 accent-purple-500 cursor-pointer" />
              <button onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.05))} className="w-6 h-6 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-md border border-white/10 active:scale-95">+</button>
              <button onClick={() => setZoomLevel(1)} className="px-2 py-1 ml-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-md border border-white/10 transition-colors">คืนค่า</button>
            </div>
          </div>

          <div className="relative w-full h-[800px] mt-4">
            <div className="absolute inset-0 bg-zinc-950/50 rounded-[2rem] border-2 border-dashed border-white/10 overflow-hidden shadow-inner pointer-events-none z-0">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            </div>

            <div className="absolute top-4 left-0 w-full text-center pointer-events-none z-10">
              <div className="inline-block py-1.5 px-12 bg-zinc-800 border border-white/10 text-zinc-400 font-black tracking-widest rounded-b-xl text-[12px] shadow-lg">
                STAGE / FRONT (เวทีกลาง)
              </div>
            </div>

            <div
              className="absolute inset-0 z-20 transition-transform duration-200 origin-top"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* 🌟 เพิ่ม scale={zoomLevel} ลงใน Draggable ทุกตัว เพื่อกันเมาส์หลอนเวลาซูมผังใหญ่ */}
              {visibleZones.left && (
                <Draggable scale={zoomLevel} nodeRef={leftZoneRef} defaultPosition={zonePositions.left} onStop={(e, data) => handleDragStop('left', data)} disabled={!isEditLayout} handle=".drag-handle">
                  <div ref={leftZoneRef} className={`absolute p-4 rounded-3xl transition-colors ${isEditLayout ? 'bg-cyan-950/60 border-2 border-amber-500 z-50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-cyan-950/5 border border-cyan-500/10'}`}>
                    {isEditLayout && (
                      <div className="drag-handle absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg cursor-move"><Move size={10} /> จับเพื่อลาก</div>
                    )}
                    <div className="flex gap-2">
                      {Array.from({ length: leftConfig.rows }).map((_, r) => {
                        const char = String.fromCharCode(76 + r);
                        return (
                          <div key={char} className="flex flex-col gap-9 items-center">
                            <span className="text-cyan-500 font-mono text-[10px] font-black mb-2">{char}</span>
                            {Array.from({ length: leftConfig.seats }).map((_, s) => renderSmartSeat(`${char}${s + 1}`, 'left'))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Draggable>
              )}

              {visibleZones.center && (
                <Draggable scale={zoomLevel} nodeRef={centerZoneRef} defaultPosition={zonePositions.center} onStop={(e, data) => handleDragStop('center', data)} disabled={!isEditLayout} handle=".drag-handle">
                  <div ref={centerZoneRef} className={`absolute p-4 rounded-3xl transition-colors ${isEditLayout ? 'bg-purple-950/60 border-2 border-amber-500 z-50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-purple-950/5 border border-purple-500/10'}`}>
                    {isEditLayout && (
                      <div className="drag-handle absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg cursor-move"><Move size={10} /> จับเพื่อลาก</div>
                    )}
                    <div className="space-y-9">
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
                </Draggable>
              )}

              {visibleZones.right && (
                <Draggable scale={zoomLevel} nodeRef={rightZoneRef} defaultPosition={zonePositions.right} onStop={(e, data) => handleDragStop('right', data)} disabled={!isEditLayout} handle=".drag-handle">
                  <div ref={rightZoneRef} className={`absolute p-4 rounded-3xl transition-colors ${isEditLayout ? 'bg-cyan-950/60 border-2 border-amber-500 z-50 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-cyan-950/5 border border-cyan-500/10'}`}>
                    {isEditLayout && (
                      <div className="drag-handle absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg cursor-move"><Move size={10} /> จับเพื่อลาก</div>
                    )}
                    <div className="flex gap-2">
                      {Array.from({ length: rightConfig.rows }).map((_, r) => {
                        const char = String.fromCharCode(90 - r);
                        return (
                          <div key={char} className="flex flex-col gap-9 items-center">
                            <span className="text-cyan-500 font-mono text-[10px] font-black mb-2">{char}</span>
                            {Array.from({ length: rightConfig.seats }).map((_, s) => renderSmartSeat(`${char}${s + 1}`, 'right'))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Draggable>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🖼️ Floating Image Pop-up พร้อมระบบคลิกพื้นที่อื่นเพื่อปิด */}
      {enlargedImage && (
        <>
          {/* 🌟 1. ฉากหลังโปร่งใสเต็มหน้าจอ สำหรับดักจับการคลิกพื้นที่อื่น */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setEnlargedImage(null)}
          ></div>

          {/* 🌟 2. ตัวการ์ดรูปภาพ */}
          <div
            className="fixed bottom-6 left-6 z-[9999] p-3 bg-[#111111] border border-white/10 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-10 fade-in cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => setEnlargedImage(null)}
          >
            <img src={enlargedImage.url} alt="Enlarged VIP" className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl" />

            <div className="mt-3 mb-1 text-center px-2">
              <p className="text-sm font-black text-white truncate">{enlargedImage.name}</p>
            </div>

            <div className="absolute top-4 right-4 bg-black/60 p-1.5 rounded-full text-white backdrop-blur-md">
              <X size={14} />
            </div>
          </div>
        </>
      )}

      {/* 🌟 1. Modal คุมรายที่นั่ง (Individual Seat Modal) */}
      {activeSeatModal && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 rounded-[28px] p-6 w-full max-w-md max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col gap-5 custom-scrollbar">
            <div className="flex justify-between items-start shrink-0">
              <div>
                <span className="bg-purple-900/60 text-purple-400 font-black px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest border border-purple-500/30">
                  พิกัด {activeSeatModal.id} ({activeSeatModal.zone.toUpperCase()})
                </span>
                <h3 className="font-black text-xl text-white mt-3">จัดการสิทธิ์ผู้ครองเก้าอี้ VIP</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={async () => { await handleSaveSeatingToSupabase(); setActiveSeatModal(null); }} disabled={loading} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1 shadow-lg disabled:opacity-50">
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : '💾 บันทึก'}
                </button>
                <button onClick={() => setActiveSeatModal(null)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors"><X size={16} /></button>
              </div>
            </div>

            {assignments[activeSeatModal.id] ? (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-900/50 rounded-full flex items-center justify-center shrink-0"><UserCheck size={20} className="text-purple-400" /></div>
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

                <div className="mt-2 border-t border-purple-500/30 pt-3">
                  <p className="text-[10px] text-purple-400 font-bold mb-2 flex items-center gap-1">📍 อัปเดตสถานะหน้างาน:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleUpdatePresence(activeSeatModal.id, 'pending')} className={`py-2 rounded-lg text-[10px] font-black flex flex-col items-center gap-1 transition-all ${assignments[activeSeatModal.id].live_presence === 'pending' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)] ring-2 ring-purple-400' : 'bg-purple-950/40 text-purple-400 border border-purple-500/30 hover:bg-purple-900/50'}`}><span>🟣</span> จอง/รอนั่ง</button>
                    <button onClick={() => handleUpdatePresence(activeSeatModal.id, 'arrived')} className={`py-2 rounded-lg text-[10px] font-black flex flex-col items-center gap-1 transition-all ${assignments[activeSeatModal.id].live_presence === 'arrived' || assignments[activeSeatModal.id].live_presence === 'seated' ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/50'}`}><span>🟢</span> มานั่งแล้ว</button>
                    <button onClick={() => handleUpdatePresence(activeSeatModal.id, 'away')} className={`py-2 rounded-lg text-[10px] font-black flex flex-col items-center gap-1 transition-all ${assignments[activeSeatModal.id].live_presence === 'away' ? 'bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)] ring-2 ring-yellow-400' : 'bg-yellow-950/40 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-900/50'}`}><span>🟡</span> ลุกชั่วคราว</button>
                  </div>
                </div>

                <div className="mt-2 border-t border-purple-500/30 pt-3">
                  <p className="text-[10px] text-amber-400 font-bold mb-2 flex items-center gap-1"><BellRing size={12} /> จำลองเรียกบริการ (ทดสอบแจ้งเตือน Staff):</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { triggerAlert(activeSeatModal.id, 'water', 'ขอน้ำดื่มเพิ่ม'); setActiveSeatModal(null); }} className="p-2 bg-blue-950/40 hover:bg-blue-900 border border-blue-500/30 rounded-lg text-[10px] text-blue-400 flex flex-col items-center gap-1 transition-all"><Droplet size={14} /> ขอน้ำดื่มเพิ่ม</button>
                    <button onClick={() => { triggerAlert(activeSeatModal.id, 'clear', 'เก็บภาชนะ/แก้ว'); setActiveSeatModal(null); }} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-500/30 rounded-lg text-[10px] text-zinc-400 flex flex-col items-center gap-1 transition-all"><Trash size={14} /> เก็บภาชนะ</button>
                    <button onClick={() => { triggerAlert(activeSeatModal.id, 'clean', 'ทำความสะอาด/น้ำหก'); setActiveSeatModal(null); }} className="p-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 rounded-lg text-[10px] text-rose-400 flex flex-col items-center gap-1 transition-all"><Sparkles size={14} /> น้ำหก/ทำความสะอาด</button>
                    <button onClick={() => { triggerAlert(activeSeatModal.id, 'help', 'ต้องการความช่วยเหลืออื่นๆ'); setActiveSeatModal(null); }} className="p-2 bg-amber-950/40 hover:bg-amber-900 border border-amber-500/30 rounded-lg text-[10px] text-amber-400 flex flex-col items-center gap-1 transition-all"><BellRing size={14} /> เรียกพนักงาน</button>
                  </div>
                </div>

                <div className="mt-2 border-t border-purple-500/30 pt-3">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] text-purple-400 font-bold flex items-center gap-1"><Coffee size={12} /> บริการเครื่องดื่ม:</p>
                    <button onClick={() => handleUpdateDrink(activeSeatModal.id, { is_served: !assignments[activeSeatModal.id].is_served })} className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${assignments[activeSeatModal.id].is_served ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-zinc-800 text-amber-400 border border-white/10'}`}>
                      <Check size={14} /> {assignments[activeSeatModal.id].is_served ? 'เสิร์ฟแล้ว' : 'รอเสิร์ฟ'}
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleToggleClearDrink(activeSeatModal.id)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-colors ${clearedDrinks[activeSeatModal.id] ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10'}`}>
                      {clearedDrinks[activeSeatModal.id] ? '👁️ แสดงแก้วอีกครั้ง' : '🧹 เก็บแก้ว (ซ่อน)'}
                    </button>
                    <button onClick={() => handleServeNewRoundIndividual(activeSeatModal.id)} className="flex-1 py-1.5 bg-orange-950/40 hover:bg-orange-900 text-orange-400 border border-orange-500/30 rounded-lg text-[10px] font-black transition-colors">
                      🔄 สั่งรอบใหม่ (สีส้ม)
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 w-12 shrink-0">น้ำดื่ม :</span>
                      <select value={assignments[activeSeatModal.id].water_pref || ''} onChange={(e) => handleUpdateDrink(activeSeatModal.id, { water_pref: e.target.value })} className="flex-1 bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500">
                        <option value="">-- ระบุน้ำดื่ม --</option>
                        {WATER_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-400 w-12 shrink-0">เครื่องดื่ม :</span>
                      <select value={assignments[activeSeatModal.id].drink_pref || ''} onChange={(e) => handleUpdateDrink(activeSeatModal.id, { drink_pref: e.target.value })} className="flex-1 bg-zinc-900 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-amber-500">
                        <option value="">-- ระบุเครื่องดื่มชง --</option>
                        {BEVERAGE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 text-center">
                <Armchair size={24} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-400">เก้าอี้ตัวนี้ยังว่างเปล่าครับ</p>
              </div>
            )}

            <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-purple-500" size={16} />
                <input type="text" value={modalSearchTerm} onChange={e => setModalSearchTerm(e.target.value)} placeholder="พิมพ์ชื่อ-สกุล หรือสังกัดเพื่อค้นหา..." className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-purple-500 text-white font-bold" />
              </div>
              <p className="text-[10px] text-amber-400 font-bold flex items-center gap-1 ml-1">💡 แตะเลือกรายชื่อเพื่อส่งลงนั่ง:</p>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {attendees
                  .filter(a => a.fullname.includes(modalSearchTerm) || (a.organization && a.organization.includes(modalSearchTerm)))
                  .map(att => {
                    const isAlreadySittingHere = assignments[activeSeatModal.id]?.attendee_id === att.id;
                    if (isAlreadySittingHere) return null;
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
                        <button onClick={() => handleAssignSeatFromModal(att.id)} className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 flex items-center gap-1.5 transition-all ${currentSeatOfThisPerson ? 'bg-amber-950/40 text-amber-500 hover:bg-amber-900/60 border border-amber-500/30' : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-500/30'} `}>
                          {currentSeatOfThisPerson ? <ArrowRightLeft size={14} /> : <UserCheck size={14} />}
                          {currentSeatOfThisPerson ? 'ย้ายมานั่ง' : 'เลือกนั่ง'}
                        </button>
                      </div>
                    );
                  })}
                {attendees.filter(a => a.fullname.includes(modalSearchTerm)).length === 0 && <p className="text-xs text-zinc-500 text-center py-4">ไม่พบรายชื่อที่ค้นหา</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 2. NEW: Modal จัดที่นั่งกลุ่ม (Batch Seating Modal) */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111111] border border-white/10 rounded-[28px] p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <ListOrdered className="text-blue-400" /> จัดกลุ่มลงที่นั่งอัจฉริยะ (Batch)
                </h3>
                <p className="text-xs text-zinc-400 mt-1">ประมวลผลจัดผังอัตโนมัติทีละกลุ่ม ตามรูปแบบที่คุณกำหนด</p>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Target Zone */}
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1 block">1. เลือกโซนเป้าหมาย:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setBatchConfig({ ...batchConfig, zone: 'left' })} className={`py-2 text-xs font-bold rounded-xl transition-all ${batchConfig.zone === 'left' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 border border-cyan-400' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-white/5'}`}>⬅️ ปีกซ้าย</button>
                  <button onClick={() => setBatchConfig({ ...batchConfig, zone: 'center' })} className={`py-2 text-xs font-bold rounded-xl transition-all ${batchConfig.zone === 'center' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-white/5'}`}>🏛️ โซนกลาง</button>
                  <button onClick={() => setBatchConfig({ ...batchConfig, zone: 'right' })} className={`py-2 text-xs font-bold rounded-xl transition-all ${batchConfig.zone === 'right' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 border border-cyan-400' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-white/5'}`}>➡️ ปีกขวา</button>
                </div>
              </div>

              {/* Group & Sort */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1 block">2. เลือกกลุ่มแขก (Group):</label>
                  <select value={batchConfig.group} onChange={(e) => setBatchConfig({ ...batchConfig, group: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-blue-500">
                    <option value="all">👥 แขกทั้งหมดที่ว่าง</option>
                    <option value="vip">⭐ กลุ่ม VIP (คิว 1-10)</option>
                    <option value="special1">🔴 คิวพิเศษ 1</option>
                    <option value="special2">🟡 คิวพิเศษ 2</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1 block">3. ลำดับการนั่ง (Sort By):</label>
                  <select value={batchConfig.sortBy} onChange={(e) => setBatchConfig({ ...batchConfig, sortBy: e.target.value as any })} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-blue-500">
                    <option value="priority_level">🎯 ระดับความสำคัญ (Priority)</option>
                    <option value="action_sequence">🎬 ตามคิวเวที (Action Seq.)</option>
                  </select>
                </div>
              </div>

              {/* Advanced Config */}
              <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1 block">4. เริ่มจัดที่นั่งหมายเลข:</label>
                  <input type="text" value={batchConfig.startSeat} onChange={(e) => setBatchConfig({ ...batchConfig, startSeat: e.target.value.toUpperCase() })} placeholder="เช่น C1 หรือเว้นว่าง" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-blue-500 uppercase placeholder:normal-case placeholder:font-normal" />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 mb-1 block">5. โควต้าจัดสูงสุด (คน):</label>
                  <input type="number" min={1} value={batchConfig.count} onChange={(e) => setBatchConfig({ ...batchConfig, count: Number(e.target.value) })} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-sm text-white font-bold outline-none focus:border-blue-500" />
                </div>
              </div>

              {/* Pattern */}
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-2 block">6. รูปแบบการจัดเรียง (Pattern):</label>
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setBatchConfig({ ...batchConfig, pattern: 'standard' })} className={`cursor-pointer border p-3 rounded-xl transition-all ${batchConfig.pattern === 'standard' ? 'bg-blue-900/30 border-blue-400' : 'bg-zinc-900 border-white/10 opacity-70 hover:opacity-100'}`}>
                    <p className={`font-black text-sm ${batchConfig.pattern === 'standard' ? 'text-blue-400' : 'text-white'}`}>➡️ รูปแบบมาตรฐาน</p>
                    <p className="text-[10px] text-zinc-400 mt-1">เริ่มจากที่นั่งแรกของฝั่งเดิมเสมอ (เช่น A1-ไปA10 ขึนแถวใหม่เริ่ม B1-ไปB10)</p>
                  </div>
                  <div onClick={() => setBatchConfig({ ...batchConfig, pattern: 'snake' })} className={`cursor-pointer border p-3 rounded-xl transition-all ${batchConfig.pattern === 'snake' ? 'bg-blue-900/30 border-blue-400' : 'bg-zinc-900 border-white/10 opacity-70 hover:opacity-100'}`}>
                    <p className={`font-black text-sm ${batchConfig.pattern === 'snake' ? 'text-blue-400' : 'text-white'}`}>🐍 สลับฟันปลา (งูเลื้อย)</p>
                    <p className="text-[10px] text-zinc-400 mt-1">วนย้อนกลับจากที่นั่งสุดท้ายของแถวถัดไป (เช่น A1-ไปA10 ขึนแถวใหม่เริ่ม B10-ไปB1)</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={handleRunBatchSeating} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50">
                  <CheckCircle2 size={18} /> ยืนยันประมวลผลจัดคิว
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 📖 เรียกใช้ Component คู่มือการใช้งานใหม่ */}
      <SeatingPlannerManualDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
  
      
    </div >
  );
}

export default function DynamicMultiZoneSeatingPlanner() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c1633] flex items-center justify-center text-white font-mono">Loading Seating Planner...</div>}>
      <SeatingPlannerContent />
    </Suspense>
  );
}