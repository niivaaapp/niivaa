"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Save, Info, Users, UserCheck, Sliders,
  Plus, Trash2, Clock, Monitor, Share2, Shield,
  FileText, Camera, Volume2, Sparkles, CheckCircle2, Upload, Table, Calendar, Link, Laptop, Video, Mic
} from 'lucide-react';

export default function SeminarUltimateAdvancePreparationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'mock-event-id';
  // นำไปวางรวมกับกลุ่ม useState เดิมของพี่ที่ด้านบนสุดของไฟล์
  const [roomSetup, setRoomSetup] = useState({ tables: 150, seats: 8, cols: 15, rows: 10 });
  const [activeMenu, setActiveMenu] = useState('project_info');
  const [loading, setLoading] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>({});
  const [mcScripts, setMcScripts] = useState<any[]>([]);


  // --- [1. โครงสร้าง STATES สำหรับ 16 ฝ่ายภารกิจ - คืนชีพครบถ้วนร้อยเปอร์เซ็นต์] ---

  // ฝ่ายที่ 1: ข้อมูลโครงการหลัก
  const [projectInfo, setProjectInfo] = useState({
    title: '', projectName: '', organizer: '', targetGroup: '', targetCount: '',
    room: '', hotel: '', district: '', province: '', startDate: '', endDate: '',
    agendaUrl: '', projectUrl: '', committeeUrl: '',
    chairName: '', chairPosition: '', chairPhoto: '', manualStatus: 'pending'
  });

  // ฝ่ายที่ 2: ข้อมูลประธานในพิธีเปิด
  const [presiderInfo, setPresiderInfo] = useState({
    name: '', position: '', organization: '', bio: '', photoUrls: [] as string[],
    lectureTopic: '', lectureMediaUrl: '', followerName: '', followerPhone: '', followerLine: '',
    travelDetails: '', accommodationDetails: ''
  });

  // ฝ่ายที่ 3: การประสานงานวิทยากร (คืนชีพชุดโครงสร้างสมบูรณ์แบบเดิม)
  const [speakerCoordinator, setSpeakerCoordinator] = useState({ name: '', position: '', phone: '' });
  const [speakersList, setSpeakersList] = useState<any[]>([
    {
      id: 'sp-1', fullname: 'ดร.สมชาย ใจดี', position: 'ผู้เชี่ยวชาญระดับ 9', org: 'กระทรวงศึกษาธิการ', phone: '081-2345678',
      topic: 'นวัตกรรมการศึกษายุค 2026', date: '', startTime: '10:30', endTime: '12:00', room: 'ห้องแกรนด์บอลรูม 1',
      speaker_photo_url: '', speaker_photo_type: 'url',
      media_type: 'ppt', media_url: '',
      device_setup: 'central_laptop',
      token: 'sp-' + Math.random().toString(36).substring(7), password: 'nv' + Math.floor(1000 + Math.random() * 9000),
      blocks: [
        { title: 'เกริ่นนำปัญหาและสถิติภาพรวม', duration: 15, media_type: 'url', media_url: '' }
      ]
    }
  ]);
  const [speakerChecklist, setSpeakerChecklist] = useState({
    letter: 'pending', bio: 'pending', travel: 'pending', room: 'pending', linkShared: 'pending', finance: 'pending', media: 'pending'
  });

  // ฝ่ายที่ 4 & ฝ่ายที่ 7: ระบบคิวกิจกรรมหลักร่วมและคลังรายชื่อ VIP
  const [startTime, setStartTime] = useState('09:00');
  const [agendaItems, setAgendaItems] = useState<any[]>([]);
  const [vipGuests, setVipGuests] = useState<any[]>([]);

  // ฝ่ายที่ 5: ฝ่ายต้อนรับบุคคลสำคัญ
  const [vipReceptionCheck, setVipReceptionCheck] = useState<any>({ vipDataComplete: 'pending', staffAssigned: 'pending', dateConfirmed: 'pending', readyToWelcome: 'pending' });

  // ฝ่ายที่ 6: ฝ่ายรับลงทะเบียนหน้างาน
  const [regStaffCount, setRegStaffCount] = useState('0');
  const [regChecklist, setRegChecklist] = useState<any>({ meetingDone: 'pending', listReady: 'pending', materialReady: 'pending', PRSign: 'pending', systemReady: 'pending', giftReady: 'pending', tableReady: 'pending' });

  // ฝ่ายที่ 7: ฝ่ายจัดสถานที่และที่นั่ง VIP
  const [venueResponsible, setVenueResponsible] = useState('');
  const [venueLayout, setVenueLayout] = useState({ seatsPerRow: 10, totalRows: 2, startVipIdx: 1, endVipIdx: 10 });
  const [showVipNames, setShowVipNames] = useState(false);
  const [venueChecklist, setVenueChecklist] = useState<any>({ stageDecor: 'pending', altarSet: 'pending', lightAltar: 'pending', footRest: 'pending', stageMarking: 'pending', presiderPodium: 'pending', chairPodium: 'pending', mcPodium: 'pending', regTable: 'pending', certTable: 'pending', giftTable: 'pending' });

  // หน้าต่างลอยควบคุมผังเก้าอี้
  const [seatingModal, setSeatingModal] = useState<{
    isOpen: boolean;
    seatId: string;
    zone: 'center' | 'left' | 'right';
    searchTerm: string;
  }>({ isOpen: false, seatId: '', zone: 'center', searchTerm: '' });

  // ฝ่ายที่ 8: ฝ่ายเครื่องเสียงและสื่อมัลติมีเดีย
  const [audioChecklist, setAudioChecklist] = useState<any>({ soundReady: 'pending', micReady: 'pending', openSound: 'pending', openVTR: 'pending', openShow: 'pending', projector1: 'pending', projector2: 'pending' });
  const [systemStability, setSystemStability] = useState(100);

  // ฝ่ายที่ 9: พิธีมอบรางวัลเกียรtiบัตร
  const [certMeta, setCertMeta] = useState({ room: '', prepTime: '' });
  const [certLayout, setCertLayout] = useState({ rows: 4, seatsPerRow: 10, description: '' });
  const [certRecipients, setCertRecipients] = useState<any[]>([
    { id: 1, name: 'นายวีระชัย มุ่งมั่น', position: 'ครูชำนาญการพิเศษ', org: 'โรงเรียนสุรวิทยาคาร', province: 'สุรินทร์', note: '' }
  ]);
  const [mcGroupSize, setMcGroupSize] = useState(10);

  // ฝ่ายที่ 10: ฝ่ายแจกเอกสาร และของที่ระลึก
  const [giftMeta, setGiftMeta] = useState({ room: '', date: '', period: '' });
  const [giftChecklist, setGiftChecklist] = useState<any>({ prepareGift: 'pending', systemDataReady: 'pending' });

  // ฝ่ายที่ 11: ฝ่ายจัดเลี้ยงภัตตาหาร / อาหารว่าง
  const [cateringSnacks, setCateringSnacks] = useState<any[]>([{ id: 1, date: '', mealPeriod: 'เบรคเช้า (10:30)', qty: 0 }]);
  const [cateringMeals, setCateringMeals] = useState<any[]>([
    { id: 1, date: '', mealName: 'มื้อกลางวัน วันที่ 1', time: '12:00', rooms: [{ roomName: 'ห้องแกรนด์บอลรูม', zoneProvince: 'กลุ่มภาคอีสานตอนล่าง', tableCount: 150 }] }
  ]);

  // ฝ่ายที่ 12: ฝ่ายบันทึกภาพหน้างาน
  const [photoChecklist, setPhotoChecklist] = useState<any>({ deviceReady: 'pending', systemReady: 'pending', staffAssigned: 'pending' });

  // ฝ่ายที่ 13: ฝ่ายประชาสัมพันธ์
  const [prActivities, setPrActivities] = useState('1. กระจายข่าวผ่านระบบ Line Official\n2. ลงข่าวก่อนเริ่มงานทางเว็บไซต์หน่วยงาน');
  const [prChecklist, setPrChecklist] = useState<any>({ progressAsPlan: 'pending' });

  // ฝ่ายที่ 14: ฝ่ายควบคุมแสงเวที
  const [lightChecklist, setLightChecklist] = useState<any>({ scriptReady: 'pending', systemChecked: 'pending' });

  // ฝ่ายที่ 15: ฝ่ายกำกับเวที (Stage Operator)
  const [showtimeConfig, setShowtimeConfig] = useState<any[]>([]);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedBlockIdx, setSelectedBlockIdx] = useState<number | null>(null);
  const [tempDepts, setTempDepts] = useState<string[]>([]);
  const [stageOperatorCheck, setStageOperatorCheck] = useState<any>({ briefingDone: 'pending', systemRehearsal: 'pending', commsReady: 'pending' });

  // ฝ่ายที่ 16: ฝ่ายประเมินผลการดำเนินงานและรายงาน
  const [evaluationInfo, setEvaluationInfo] = useState<any>({ toolName: '', googleFormLink: '', toolReady: 'pending', collecting: 'pending', summaryDone: 'pending', googleSheetLink: '', pptSummaryLink: '' });

  // --- [2. ENGINE คำนวณลำดับเวลาแบบ Cascading และตัวดักจับ] ---

  const calculateItemStartTime = (index: number) => {
    if (agendaItems.length === 0 || index >= agendaItems.length) return "09:00 น.";
    const targetItem = agendaItems[index];
    const targetDay = targetItem.event_day || 1;
    let totalMinutes = 540;
    if (startTime && startTime.includes(':')) {
      const [h, m] = startTime.split(':').map(Number);
      totalMinutes = (h * 60) + m;
    }
    for (let i = 0; i < index; i++) {
      if (agendaItems[i].event_day === targetDay) {
        totalMinutes += Number(agendaItems[i].duration || agendaItems[i].duration_minutes || 0);
      }
    }
    return `${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}:${(totalMinutes % 60).toString().padStart(2, '0')} น.`;
  };

  const moveAgendaItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...agendaItems]; const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= agendaItems.length) return;
    const temp = newItems[index]; newItems[index] = newItems[targetIdx]; newItems[targetIdx] = temp;
    setAgendaItems(newItems);
  };

  const calculateTotalDays = () => {
    if (!projectInfo.startDate || !projectInfo.endDate) return 0;
    const start = new Date(projectInfo.startDate); const end = new Date(projectInfo.endDate);
    return Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculateTotalMealPeople = (mealId: number) => {
    const meal = cateringMeals.find(m => m.id === mealId);
    return meal ? meal.rooms.reduce((acc: number, curr: any) => acc + (Number(curr.tableCount || 0) * 8), 0) : 0;
  };

  const triggerMockUpload = (fieldDesc: string, callback: (url: string) => void) => {
    const fakeUrl = `https://bpretgwbwvepqg.supabase.co/storage/v1/object/public/media/${Date.now()}.pdf`;
    alert(`[NIIVAA Storage] สั่งอัปโหลดไฟล์สื่อ: ${fieldDesc} สำเร็จเรียบร้อย!`);
    callback(fakeUrl);
  };

  // 🔄 ดึงข้อมูลผังเก้าอี้จากคลังกลางตาราง event_attendees ต้นทางจริง
  const fetchEventAttendeesForSeating = async () => {
    if (!eventId || eventId === 'mock-event-id') return;
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId);
      if (!error && data) {
        setVipGuests(data);
      }
    } catch (err) {
      console.error("Error fetching attendees:", err);
    }
  };

  // 📥 โหลดข้อมูลเริ่มต้นทั้งหมดจากฐานข้อมูลจริงตารางหลังบ้าน
  useEffect(() => {
    const loadSavedEventClock = async () => {
      if (!eventId || eventId === 'mock-event-id') return;

      const { data: eventData, error: eventErr } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (!eventErr && eventData) {
        setStartTime(eventData.start_time || '09:00');
        setProjectInfo(p => ({
          ...p,
          title: eventData.title || '',
          hotel: eventData.location_hotel || '',
          district: eventData.location_district || '',
          province: eventData.location_province || '',
          startDate: eventData.event_date || ''
        }));
      }

      // ดึงคิวงานเรียงตามเลขทศนิยมสากล sort_order ดักสลับคิวแม่นยำ
      const { data: agendaData, error: agendaErr } = await supabase
        .from('event_agenda_items')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (!agendaErr && agendaData && agendaData.length > 0) {
        const mappedItems = agendaData.map(d => ({
          id: d.id,
          title: d.title,
          duration: d.duration_minutes,
          speaker_role: d.speaker_role,
          main_script: d.main_script,
          sub_script: d.sub_script,
          event_day: d.event_day || 1,
          media_type: d.media_type || 'none',
          media_url: d.media_url || '',
          visual_audio_cue: d.visual_audio_cue || '',
          responsible_person: d.responsible_person || '',
          sort_order: Number(d.sort_order) || 0
        }));
        setAgendaItems(mappedItems);
      }
    };

    loadSavedEventClock();
    fetchEventAttendeesForSeating();
  }, [eventId]);

  // 💾 บันทึกความพร้อมรวมศูนย์ 16 ฝ่ายลงฐานข้อมูลตัวจริง
  const handleSaveAllData = async () => {
    if (!eventId || eventId === 'mock-event-id') {
      alert('⚠️ ไม่พบรหัส ID งานในระบบ กรุณาเข้าใช้งานผ่านหน้าแดชบอร์ดหลักโครงการเพื่อบันทึกข้อมูลครับพี่');
      return;
    }
    setLoading(true);
    try {
      await supabase.from('events').update({
        title: projectInfo.title || 'งานสัมมนาวิชาการ',
        event_date: projectInfo.startDate || null,
        location_hotel: projectInfo.hotel,
        location_district: projectInfo.district,
        location_province: projectInfo.province,
        start_time: startTime,
        status: 'draft'
      }).match({ id: eventId });

      await supabase.from('event_agenda_items').delete().eq('event_id', eventId);

      const agendaToInsert = agendaItems.map((item, index) => ({
        event_id: eventId,
        title: item.title || 'กิจกรรมช่วงใหม่',
        duration_minutes: Number(item.duration || item.duration_minutes || 5),
        speaker_role: item.speaker_role || 'both',
        main_script: item.main_script || '',
        sub_script: item.sub_script || '',
        event_day: Number(item.event_day || 1),
        visual_audio_cue: item.visual_audio_cue || '',
        responsible_person: item.responsible_person || '',
        sort_order: item.sort_order ? Number(item.sort_order) : (index + 1) * 10
      }));

      const { error: insertErr } = await supabase.from('event_agenda_items').insert(agendaToInsert);
      if (insertErr) throw new Error(insertErr.message);

      alert('🎉 บันทึกสคริปต์สากลและระบบสื่อห้องควบคุม 16 ฝ่ายลงฐานข้อมูลเรียบร้อยครับพี่!');
      router.refresh();
    } catch (error: any) {
      alert(`❌ เกิดข้อผิดพลาดหลังบ้าน: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 🪑 ฟังก์ชันวาดเก้าอี้อัจฉริยะฝ่ายสถานที่
  const renderSmartSeat = (seatId: string, zone: 'center' | 'left' | 'right') => {
    const assignedGuest = vipGuests.find(g => g.seat_id === seatId && g.seat_zone === zone);
    let seatColorClass = 'bg-zinc-900 border-white/5 text-zinc-600 hover:border-purple-500/50';
    if (assignedGuest) {
      if (assignedGuest.live_presence === 'present') {
        seatColorClass = 'bg-emerald-500/10 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)] border-2 animate-pulse';
      } else if (assignedGuest.live_presence === 'away') {
        seatColorClass = 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)] border-2';
      } else {
        seatColorClass = 'bg-purple-600/20 border-purple-500 text-purple-200';
      }
    }

    return (

      <div
        key={seatId}
        onClick={() => setSeatingModal({ isOpen: true, seatId, zone, searchTerm: '' })}
        className={`w-9 h-9 rounded-lg border flex flex-col items-center justify-center font-mono text-[10px] transition-all cursor-pointer relative group ${seatColorClass}`}
      >
        <span>{seatId}</span>
        {assignedGuest && showVipNames && (
          <span className="text-[7px] tracking-tighter text-white font-sans truncate w-full px-0.5">
            {(assignedGuest.fullname || assignedGuest.name).split(' ')[0]}
          </span>
        )}
      </div>
    );
  };

  // ⚡ 1-Click Auto Seating (ถมเก้าอี้ที่เหลือหลบตัวล็อก 3-5 คนแรกตามสั่ง)
  const handleSmartAutoSeating = () => {
    const availableVips = vipGuests
      .filter(g => g.attendee_type === 'vip' && !g.seat_id)
      .sort((a, b) => (a.priority_level || 50) - (b.priority_level || 50));

    if (availableVips.length === 0) {
      alert("💡 แขก VIP ในระบบมีเก้าอี้ประจำการหมดแล้วครับพี่!");
      return;
    }

    let guestIdx = 0;
    const updatedGuests = [...vipGuests];
    const zones: ('center' | 'left' | 'right')[] = ['center', 'left', 'right'];
    const rows = Array.from({ length: venueLayout.totalRows }, (_, i) => String.fromCharCode(65 + i));
    const seatsCount = venueLayout.seatsPerRow;

    for (const zone of zones) {
      for (const row of rows) {
        for (let s = 1; s <= seatsCount; s++) {
          if (guestIdx >= availableVips.length) break;
          const currentSeatId = `${row}${s}`;

          const isSeatOccupied = updatedGuests.some(g => g.seat_id === currentSeatId && g.seat_zone === zone);
          if (!isSeatOccupied) {
            const nextGuest = availableVips[guestIdx];
            const targetIdx = updatedGuests.findIndex(g => g.id === nextGuest.id);
            if (targetIdx !== -1) {
              updatedGuests[targetIdx] = {
                ...updatedGuests[targetIdx],
                seat_id: currentSeatId,
                seat_zone: zone,
                live_presence: 'pending'
              };
              guestIdx++;
            }
          }
        }
        if (guestIdx >= availableVips.length) break;
      }
      if (guestIdx >= availableVips.length) break;
    }

    setVipGuests(updatedGuests);
    alert(`⚡ ถมที่นั่งออโต้สำเร็จ จัดแขก VIP เข้าเก้าอี้ว่างเพิ่มอีก ${guestIdx} ท่านเรียบร้อยครับ!`);
  };

  // 💾 บันทึกสิทธิ์ผังที่นั่งลงฐานข้อมูล Supabase ตาราง event_attendees ตัวจริง
  const handleSaveSeatingToSupabase = async () => {
    setLoading(true);
    try {
      for (const guest of vipGuests) {
        await supabase
          .from('event_attendees')
          .update({
            seat_id: guest.seat_id || null,
            seat_zone: guest.seat_zone || null,
            live_presence: guest.live_presence || 'pending'
          })
          .eq('id', guest.id);
      }
      alert('💾 บันทึกโครงสร้างตำแหน่งแผนผังเก้าอี้ลงฐานข้อมูลคลังกลางสำเร็จจริงเรียบร้อยครับ!');
      await fetchEventAttendeesForSeating();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลผังที่นั่ง');
    } finally {
      setLoading(false);
    }
  };

  // 💡 ชุดคำสั่งดึงข้อมูลที่สมบูรณ์แบบ (กวาดมาทุกคอลัมน์ 100% จากทั้ง 2 ตาราง)
  useEffect(() => {
    const fetchAllEventData = async () => {
      if (!eventId) return;

      try {
        // 1. ดึงตารางหลัก (events) ดึงทุกคอลัมน์ (*)
        const { data: evData, error: evError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (evError) throw evError;
        if (evData) {
          setProjectInfo(evData); // โยนเข้า State ของตารางหลัก
        }

        // 2. ดึงตารางรายละเอียด (event_details) ดึงทุกคอลัมน์ (*)
        const { data: dtlData, error: dtlError } = await supabase
          .from('event_details')
          .select('*')
          .eq('event_id', eventId)
          .maybeSingle(); // ใช้ maybeSingle เพราะตอนสร้างงานใหม่อาจจะยังไม่มีข้อมูลนี้

        if (dtlError) throw dtlError;
        if (dtlData) {
          setEventDetails(dtlData); // โยนเข้า State ของตารางรายละเอียด
        }

      } catch (err: any) {
        console.error("❌ ดึงข้อมูลล้มเหลว:", err.message);
      }
    };

    fetchAllEventData();
  }, [eventId]);


  // --- [ตัดแบ่งครึ่งที่ตรงนี้เพื่อประสิทธิภาพส่งข้อมูลสูงสุดร้อยเปอร์เซ็นต์] ---
  return (

    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#070b16] to-[#020617] text-white p-4 select-none font-sans">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* TOP COMMAND BAR */}
        <div className="bg-zinc-950/80 p-4 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg shadow-black/40">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/eventdashboard')} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400"><ArrowLeft size={14} /></button>
            <div>
              <h1 className="text-base font-black tracking-tight">ศูนย์สถาปัตยกรรม 16 ฝ่ายภารกิจ (Master Data Control Hub)</h1>
              <p className="text-[10px] text-zinc-500">ระบบประมวลผลตัวชี้วัดความพร้อมอัตโนมัติอ้างอิงระดับปฏิบัติงานจริง</p>
            </div>
          </div>
          <button onClick={handleSaveAllData} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 font-black text-xs rounded-xl hover:scale-[1.02] transition-all">
            <Save size={12} /> {loading ? 'กำลังประมวลผลบันทึก...' : 'บันทึกและวิเคราะห์'}
          </button>
        </div>

        {/* WORKSPACE MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">

          {/* SIDEBAR MENU MATRIX */}
          <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-2 space-y-1 text-xs font-bold">
            {[
              { key: 'project_info', label: '1. ข้อมูลโครงการหลัก', status: projectInfo.manualStatus },
              { key: 'presider_info', label: '2. ข้อมูลประธานพิธีเปิด', status: presiderInfo.name ? 'completed' : 'pending' },
              { key: 'speaker_hub', label: '3. การประสานงานวิทยากร', status: 'progress' },
              { key: 'emcee_script', label: '4. สคริปต์ & ระบบพิธีกร', status: 'progress' },
              { key: 'vip_reception', label: '5. ฝ่ายต้อนรับบุคคลสำคัญ', status: vipReceptionCheck.readyToWelcome },
              { key: 'registration_tab', label: '6. ฝ่ายรับลงทะเบียนหน้างาน', status: regChecklist.systemReady },
              { key: 'venue_tab', label: '7. ฝ่ายจัดสถานที่ & ผัง VIP', status: venueChecklist.stageDecor },
              { key: 'audio_media', label: '8. เครื่องเสียง & มัลติมีเดีย', status: audioChecklist.soundReady },
              { key: 'cert_distribution', label: '9. พิธีมอบรางวัลเกียรติบัตร', status: certRecipients.length > 0 ? 'completed' : 'pending' },
              { key: 'gift_tab', label: '10. ฝ่ายแจกเอกสาร/ของที่ระลึก', status: giftChecklist.prepareGift },
              { key: 'catering_tab', label: '11. ฝ่ายจัดเลี้ยงภัตตาหาร', status: 'progress' },
              { key: 'photo_tab', label: '12. ฝ่ายบันทึกภาพหน้างาน', status: photoChecklist.deviceReady },
              { key: 'pr_tab', label: '13. ฝ่ายประชาสัมพันธ์', status: prChecklist.progressAsPlan },
              { key: 'lighting_tab', label: '14. ฝ่ายควบคุมแสงเวที', status: lightChecklist.systemChecked },
              { key: 'stage_operator', label: '15. ฝ่ายกำกับเวที (Stage Op)', status: stageOperatorCheck.systemRehearsal },
              { key: 'evaluation_tab', label: '16. ฝ่ายประเมินผลและรายงาน', status: evaluationInfo.toolReady }
            ].map((menu) => (
              <div
                key={menu.key} onClick={() => setActiveMenu(menu.key)}
                className={`p-2.5 rounded-xl cursor-pointer flex justify-between items-center border transition-all ${activeMenu === menu.key ? 'bg-purple-600 border-purple-400 text-white font-black shadow-md' : 'text-zinc-400 border-transparent hover:bg-white/5'}`}
              >
                <span>{menu.label}</span>
                <div className={`w-2 h-2 rounded ${menu.status === 'completed' ? 'bg-[#00ffcc]' : menu.status === 'progress' ? 'bg-amber-400' : 'bg-zinc-700'}`} />
              </div>
            ))}
          </div>

          {/* DYNAMIC INDIVIDUAL CONTENT SCREEN */}
          <div className="md:col-span-3 bg-zinc-950/30 border border-white/5 rounded-2xl p-5 min-h-[550px]">

            {/* 📋 1. ข้อมูลโครงการหลัก (Master Project Information - Strict Error Handling & Auto Calc) */}
            {activeMenu === 'project_info' && (
              <div className="relative flex flex-col h-full animate-in fade-in duration-200 text-xs text-left">

                {/* 🌟 1. STICKY HEADER */}
                <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl pb-3 -mt-4 pt-4 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-blue-400 flex items-center gap-1.5 uppercase tracking-wide">
                          📋 1. ศูนย์ข้อมูลโครงการหลักและโครงสร้างงาน
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          จัดการรายละเอียดพื้นฐาน, วันที่, สถานที่, บุคคลสำคัญ และเอกสารโครงการทั้งหมด
                        </p>
                      </div>

                      {(() => {
                        const safeEvent = typeof projectInfo !== 'undefined' && projectInfo ? projectInfo : {};
                        const safeDetails = typeof eventDetails !== 'undefined' && eventDetails ? eventDetails : {};
                        const isBasicInfoComplete = safeEvent?.title && safeDetails?.project_name;

                        return isBasicInfoComplete ? (
                          <div className="w-fit px-3 py-1 bg-emerald-950/80 border border-emerald-500 rounded-lg flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></span>
                            <span className="text-emerald-400 font-black text-[9px] tracking-wide">🟢 ข้อมูลพร้อม 100%</span>
                          </div>
                        ) : (
                          <div className="w-fit px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-lg flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#fbbf24]"></span>
                            <span className="text-amber-400 font-black text-[9px] tracking-wide">🟡 รอเติมข้อมูลให้ครบถ้วน</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col items-end gap-2.5 shrink-0 self-start">
                      <div className="flex items-center gap-1.5 font-black text-xl select-none mr-1">
                        <div className="flex tracking-tight">
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Nii</span>
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 ml-0.5">Vaa</span>
                        </div>
                        <div className="bg-black/80 border border-white/20 rounded px-1.5 py-0.5 flex items-center justify-center shadow-lg transform -skew-x-6">
                          <span className="text-[7px] text-zinc-300 tracking-[0.2em] font-bold">SMARTEVENT</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!eventId) { alert('❌ ไม่พบ ID ของงานสัมมนา กรุณาสร้างงานใหม่ก่อนครับ'); return; }

                            const getVal = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value || '';
                            const getInt = (id: string, def: number) => parseInt((document.getElementById(id) as HTMLInputElement)?.value) || def;

                            const { error: evError } = await supabase.from('events').update({
                              title: getVal('v1_title'),
                              brand_name: getVal('v1_organizer'),
                              brand_logo_url: getVal('v1_logo'),
                              event_date: getVal('v1_start_date') || null,
                              end_date: getVal('v1_end_date') || null,
                              location_hotel: getVal('v1_hotel'),
                              location_district: getVal('v1_district'),
                              location_province: getVal('v1_province'),
                            }).eq('id', eventId);

                            if (evError) throw new Error("บันทึกตาราง Events ล้มเหลว: " + evError.message);

                            const detailPayload = {
                              project_name: getVal('v1_project_name'),
                              organizer_name: getVal('v1_organizer'),
                              venue_room: getVal('v1_room'),
                              total_days: getInt('v1_total_days', 1),
                              target_group_name: getVal('v1_target_name'),
                              target_group_size: getInt('v1_target_size', 0),
                              chair_name: getVal('v1_chair_name'),
                              chair_position: getVal('v1_chair_pos'),
                              secretary_name: getVal('v1_sec_name'),
                              secretary_contact: getVal('v1_sec_contact'),
                            };

                            const { data: checkDetail, error: chkErr } = await supabase.from('event_details').select('id').eq('event_id', eventId).maybeSingle();
                            if (chkErr) throw new Error("เชื่อมต่อ event_details ล้มเหลว: " + chkErr.message);

                            if (checkDetail) {
                              const { error: dtlUpdError } = await supabase.from('event_details').update(detailPayload).eq('event_id', eventId);
                              if (dtlUpdError) throw new Error("อัปเดต event_details ล้มเหลว: " + dtlUpdError.message);
                            } else {
                              const { error: dtlInsError } = await supabase.from('event_details').insert({ event_id: eventId, ...detailPayload });
                              if (dtlInsError) throw new Error("สร้างข้อมูล event_details ล้มเหลว: " + dtlInsError.message);
                            }

                            const safeEvent = typeof projectInfo !== 'undefined' ? projectInfo : {};
                            const currentStatus = safeEvent?.departments_status || {};
                            await supabase.from('events').update({ departments_status: { ...currentStatus, dept_1: 'ready' } }).eq('id', eventId);

                            alert('🎉 บันทึกข้อมูลโครงการสำเร็จครบถ้วนแล้วครับ!');
                            window.location.reload();

                          } catch (err: any) { alert('❌ เกิดข้อผิดพลาดรุนแรง: \n' + err.message); }
                        }}
                        className="w-full px-5 py-2.5 bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-700 hover:from-zinc-400 hover:via-zinc-500 hover:to-zinc-600 text-zinc-100 font-bold rounded-lg text-[10px] sm:text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.5)] transition-all hover:scale-[1.02] cursor-pointer border border-zinc-400 flex justify-center items-center gap-1.5"
                      >
                        💾 บันทึกข้อมูลและอัปเดต Dashboard
                      </button>
                    </div>
                  </div>
                </div>

                {/* 📜 2. SCROLLABLE CONTENT ZONE */}
                {(() => {
                  const safeEvent = typeof projectInfo !== 'undefined' && projectInfo ? projectInfo : {};
                  const safeDetails = typeof eventDetails !== 'undefined' && eventDetails ? eventDetails : {};

                  const formKey = `f1-matrix-${safeEvent?.id || 'load'}-${safeEvent?.event_date || 'd1'}-${safeEvent?.end_date || 'd2'}`;

                  const formatDateForInput = (dateString: any) => {
                    if (!dateString) return '';
                    try {
                      if (String(dateString).includes('T')) return String(dateString).split('T')[0];
                      return String(dateString).substring(0, 10);
                    } catch (e) { return ''; }
                  };

                  const calcDaysOnLoad = () => {
                    const sDate = safeEvent?.event_date;
                    const eDate = safeEvent?.end_date;
                    if (sDate && eDate) {
                      const d1 = new Date(sDate);
                      const d2 = new Date(eDate);
                      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                        const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        return diffDays > 0 ? diffDays : 1;
                      }
                    }
                    return safeDetails?.total_days || 1;
                  };

                  const calculateDaysOnChange = () => {
                    const sDate = (document.getElementById('v1_start_date') as HTMLInputElement)?.value;
                    const eDate = (document.getElementById('v1_end_date') as HTMLInputElement)?.value;
                    if (sDate && eDate) {
                      const d1 = new Date(sDate);
                      const d2 = new Date(eDate);
                      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const totalInput = document.getElementById('v1_total_days') as HTMLInputElement;
                      if (totalInput) totalInput.value = diffDays > 0 ? diffDays.toString() : "1";
                    }
                  };

                  return (
                    <div key={formKey} className="space-y-5 mt-4 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-zinc-700 pr-1">

                      <div className="p-5 bg-blue-950/10 border border-blue-500/20 rounded-2xl space-y-3">
                        <h3 className="font-black text-blue-400 text-[11px] border-b border-blue-500/20 pb-2 mb-3">1. ข้อมูลพื้นฐานโครงการและหน่วยงาน (Basic Info)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-zinc-400 font-bold text-[10px]">ชื่องานที่ใช้แสดงผล</label>
                            <input type="text" id="v1_title" defaultValue={safeEvent?.title || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none font-bold text-white focus:border-blue-500" />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-zinc-400 font-bold text-[10px]">ชื่อโครงการตามเอกสาร</label>
                            <input type="text" id="v1_project_name" defaultValue={safeDetails?.project_name || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-200 focus:border-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">ชื่อหน่วยงานผู้จัด</label>
                            <input type="text" id="v1_organizer" defaultValue={safeDetails?.organizer_name || safeEvent?.brand_name || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-300 focus:border-blue-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">ตราโลโก้หน่วยงาน</label>
                            <input type="text" id="v1_logo" defaultValue={safeEvent?.brand_logo_url || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-400 font-mono text-[10px] focus:border-blue-500" />
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-amber-950/10 border border-amber-500/20 rounded-2xl space-y-3">
                        <h3 className="font-black text-amber-500 text-[11px] border-b border-amber-500/20 pb-2 mb-3">2. กำหนดการและสถานที่จัดงาน (Time & Location)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">วันที่เริ่มจัดงาน</label>
                            <input type="date" id="v1_start_date" defaultValue={formatDateForInput(safeEvent?.event_date)} onChange={calculateDaysOnChange} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-white focus:border-amber-500 cursor-pointer" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">วันที่สิ้นสุดงาน</label>
                            <input type="date" id="v1_end_date" defaultValue={formatDateForInput(safeEvent?.end_date)} onChange={calculateDaysOnChange} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-white focus:border-amber-500 cursor-pointer" />
                          </div>

                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">จำนวนวันจัดงาน (Auto-Calc)</label>
                            <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl p-2.5">
                              <input type="number" id="v1_total_days" min="1" defaultValue={calcDaysOnLoad()} className="w-full bg-transparent outline-none text-amber-400 font-black text-center" />
                              <span className="text-zinc-500 font-bold">วัน</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">สถานที่/ห้องจัด</label>
                            <input type="text" id="v1_room" defaultValue={safeDetails?.venue_room || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-200 focus:border-amber-500" />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-zinc-400 font-bold text-[10px]">ชื่อโรงแรม/อาคาร</label>
                            <input type="text" id="v1_hotel" defaultValue={safeEvent?.location_hotel || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-200 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">อำเภอ</label>
                            <input type="text" id="v1_district" defaultValue={safeEvent?.location_district || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-300 focus:border-amber-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">จังหวัด</label>
                            <input type="text" id="v1_province" defaultValue={safeEvent?.location_province || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-white font-bold focus:border-amber-500" />
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-emerald-950/10 border border-emerald-500/20 rounded-2xl space-y-3">
                        <h3 className="font-black text-emerald-400 text-[11px] border-b border-emerald-500/20 pb-2 mb-3">3. ข้อมูลกลุ่มเป้าหมายผู้เข้าร่วมประชุม</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="space-y-1 sm:col-span-3">
                            <label className="text-zinc-400 font-bold text-[10px]">กลุ่มเป้าหมายผู้เข้าประชุม</label>
                            <input type="text" id="v1_target_name" defaultValue={safeDetails?.target_group_name || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-200 focus:border-emerald-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-zinc-400 font-bold text-[10px]">จำนวนเป้าหมาย</label>
                            <div className="flex items-center gap-2">
                              <input type="number" id="v1_target_size" defaultValue={safeDetails?.target_group_size || ''} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-emerald-400 font-black text-center focus:border-emerald-500" />
                              <span className="text-zinc-500 font-bold">คน</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 bg-purple-950/10 border border-purple-500/20 rounded-2xl space-y-4">
                        <h3 className="font-black text-purple-400 text-[11px] border-b border-purple-500/20 pb-2 mb-3">4. ข้อมูลคณะกรรมการบริหารการจัดงาน</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                            <h4 className="font-black text-purple-300 text-[10px] bg-purple-900/40 inline-block px-2 py-1 rounded">👤 ประธานกรรมการจัดงาน</h4>
                            <div className="space-y-1">
                              <label className="text-zinc-500 font-bold text-[9px]">ชื่อ-นามสกุล ประธานจัดงาน</label>
                              <input type="text" id="v1_chair_name" defaultValue={safeDetails?.chair_name || ''} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-white focus:border-purple-500" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-zinc-500 font-bold text-[9px]">ตำแหน่งงานประจำ</label>
                              <input type="text" id="v1_chair_pos" defaultValue={safeDetails?.chair_position || ''} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-zinc-300 focus:border-purple-500" />
                            </div>
                          </div>

                          <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
                            <h4 className="font-black text-indigo-300 text-[10px] bg-indigo-900/40 inline-block px-2 py-1 rounded">📋 กรรมการและเลขานุการโครงการ</h4>
                            <div className="space-y-1">
                              <label className="text-zinc-500 font-bold text-[9px]">ชื่อ-นามสกุล เลขาฯ</label>
                              <input type="text" id="v1_sec_name" defaultValue={safeDetails?.secretary_name || ''} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-white focus:border-indigo-500" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-zinc-500 font-bold text-[9px]">เบอร์โทรศัพท์เลขาฯ</label>
                              <input type="text" id="v1_sec_contact" defaultValue={safeDetails?.secretary_contact || ''} className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-indigo-400 font-mono font-bold focus:border-indigo-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ========================================================
                          🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix)
                          ======================================================== */}
                      <div className="mt-8 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none"></div>

                        <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                          ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                        </h3>

                        <div className="flex flex-wrap gap-3 relative z-10">
                          <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                            🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                          </button>

                          <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                            🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                          </button>

                          <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                            📺 จอแสดงผลโปรเจกเตอร์ (Display)
                          </button>

                          <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                            👥 ตรวจสอบรายชื่อ (Attendees)
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
            )}
            {/* 👑 2. ข้อมูลประธานพิธีเปิด (VIP Protocol & Liaison Command Center) */}
            {activeMenu === 'presider_info' && (
              <div className="relative flex flex-col h-full animate-in fade-in duration-200 text-xs text-left">

                {/* 🧠 คำนวณข้อมูลประธานและสถานะ (Null-Safe & Auto-Load) */}
                {(() => {
                  const safeGuests = typeof vipGuests !== 'undefined' && Array.isArray(vipGuests) ? vipGuests : [];

                  const chairman = safeGuests.find(g => (g?.role_in_event || '') === 'ประธานในพิธี' || (g?.fullname || '').includes('ประธาน') || (g?.position || '').includes('ประธาน')) || null;
                  const secretary = safeGuests.find(g => (g?.role_in_event || '') === 'เลขาฯประธานในพิธี' || ((g?.position || '').includes('เลขา') && (g?.organization || 'A') === (chairman?.organization || 'B'))) || null;
                  const coordinator = safeGuests.find(g => (g?.role_in_event || '') === 'ผู้ประสานงานวิทยากร' || (g?.role_in_event || '') === 'หัวหน้าฝ่ายต้อนรับบุคคลสำคัญ') || null;

                  const isDataComplete = chairman?.fullname && secretary?.fullname && coordinator?.fullname;

                  // 💡 ตัวแปรคีย์เวิร์ดหยุดปัญหาจอดำ และบังคับให้ฟอร์มโหลดใหม่เมื่อข้อมูลมาถึง
                  const formKey = `f2-${chairman?.id || 'load'}-${chairman?.fullname || ''}`;

                  return (
                    <>
                      {/* 🌟 1. STICKY HEADER (ส่วนหัวติดหนึบค้างตลอดเวลา) */}
                      <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl pb-3 -mt-4 pt-4 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                          {/* 🔹 ซ้ายบน: ป้ายศูนย์ใหญ่ และไฟสถานะ */}
                          <div className="flex flex-col gap-2.5">
                            <div>
                              <h2 className="text-base sm:text-lg font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                                👑 2. ศูนย์ข้อมูลประธานในพิธีเปิดและผู้ติดตาม
                              </h2>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                ดึงข้อมูลประสานงานอัตโนมัติจากตารางแขก VIP พร้อมระบบบันทึกสดหน้างาน
                              </p>
                            </div>

                            {/* 🚥 ไฟสัญญาณตรวจสอบความพร้อม */}
                            {isDataComplete ? (
                              <div className="w-fit px-3 py-1 bg-emerald-950/80 border border-emerald-500 rounded-lg flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></span>
                                <span className="text-emerald-400 font-black text-[9px] tracking-wide">🟢 ข้อมูลประธานพร้อม 100%</span>
                              </div>
                            ) : (
                              <div className="w-fit px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-lg flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#fbbf24]"></span>
                                <span className="text-amber-400 font-black text-[9px] tracking-wide">🟡 รอตรวจสอบข้อมูลเพิ่ม</span>
                              </div>
                            )}
                          </div>

                          {/* 🔹 ขวาบน: แบรนด์ NiiVaa + ปุ่มบันทึก Metallic */}
                          <div className="flex flex-col items-end gap-2.5 shrink-0 self-start">

                            {/* โลโก้ NiiVaa SMARTEVENT */}
                            <div className="flex items-center gap-1.5 font-black text-xl select-none mr-1">
                              <div className="flex tracking-tight">
                                <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Nii</span>
                                <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 ml-0.5">Vaa</span>
                              </div>
                              <div className="bg-black/80 border border-white/20 rounded px-1.5 py-0.5 flex items-center justify-center shadow-lg transform -skew-x-6">
                                <span className="text-[7px] text-zinc-300 tracking-[0.2em] font-bold">SMARTEVENT</span>
                              </div>
                            </div>

                            {/* ปุ่มบันทึก Metallic (Save & Sync Dashboard) */}
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  if (!eventId) { alert('⚠️ ไม่พบรหัสงานสัมมนา กรุณาสร้างงานใหม่ก่อนครับ'); return; }

                                  const cName = (document.getElementById('v2_chairman_name') as HTMLInputElement).value;
                                  const cPos = (document.getElementById('v2_chairman_pos') as HTMLInputElement).value;
                                  const cOrg = (document.getElementById('v2_chairman_org') as HTMLInputElement).value;
                                  const cBio = (document.getElementById('v2_chairman_bio') as HTMLTextAreaElement).value;
                                  const lTopic = (document.getElementById('v2_lecture_topic') as HTMLInputElement).value;
                                  const lMedia = (document.getElementById('v2_lecture_media') as HTMLInputElement).value;
                                  const sName = (document.getElementById('v2_secretary_name') as HTMLInputElement).value;
                                  const sContact = (document.getElementById('v2_secretary_contact') as HTMLInputElement).value;
                                  const coName = (document.getElementById('v2_coord_name') as HTMLInputElement).value;
                                  const coPos = (document.getElementById('v2_coord_pos') as HTMLInputElement).value;
                                  const coContact = (document.getElementById('v2_coord_contact') as HTMLInputElement).value;

                                  if (!cName.trim()) { alert('⚠️ กรุณาระบุชื่อประธานในพิธีก่อนกดบันทึกครับ'); return; }

                                  // 1. บันทึก/อัปเดต ข้อมูลลงตาราง event_attendees
                                  const { error: chairErr } = await supabase.from('event_attendees').upsert({
                                    event_id: eventId, fullname: cName, position: cPos, organization: cOrg, bio_note: cBio,
                                    role_in_event: 'ประธานในพิธี', special_act1: lTopic || 'none', special_act2: lMedia || 'none',
                                    attendee_type: 'VIP', priority_level: 10, status: 'รอ'
                                  }, { onConflict: 'event_id, role_in_event' });
                                  if (chairErr) throw new Error("บันทึกข้อมูลประธานล้มเหลว: " + chairErr.message);

                                  if (sName.trim()) {
                                    const { error: secErr } = await supabase.from('event_attendees').upsert({
                                      event_id: eventId, fullname: sName, contact_info: sContact, role_in_event: 'เลขาฯประธานในพิธี',
                                      attendee_type: 'VIP', priority_level: 11, status: 'รอ'
                                    }, { onConflict: 'event_id, role_in_event' });
                                    if (secErr) throw new Error("บันทึกข้อมูลเลขาฯล้มเหลว: " + secErr.message);
                                  }

                                  if (coName.trim()) {
                                    const { error: coErr } = await supabase.from('event_attendees').upsert({
                                      event_id: eventId, fullname: coName, position: coPos, contact_info: coContact, role_in_event: 'ผู้ประสานงานวิทยากร',
                                      attendee_type: 'staff', priority_level: 30, status: 'รอ'
                                    }, { onConflict: 'event_id, role_in_event' });
                                    if (coErr) throw new Error("บันทึกผู้ประสานงานล้มเหลว: " + coErr.message);
                                  }

                                  // 2. ยิงไฟสถานะให้ CEO Dashboard
                                  const safeEvent = typeof projectInfo !== 'undefined' ? projectInfo : {};
                                  const currentStatus = safeEvent?.departments_status || {};
                                  await supabase.from('events').update({ departments_status: { ...currentStatus, dept_2: 'ready' } }).eq('id', eventId);

                                  if (typeof fetchEventAttendeesForSeating === 'function') fetchEventAttendeesForSeating();
                                  alert('🎉 บันทึกหลอมรวมข้อมูลประธาน และส่งไฟสถานะ 🟢 ขึ้น SMARTEVENT Dashboard สำเร็จแล้วครับ!');
                                  window.location.reload();

                                } catch (err: any) { alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + err.message); }
                              }}
                              className="w-full px-5 py-2.5 bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-700 hover:from-zinc-400 hover:via-zinc-500 hover:to-zinc-600 text-zinc-100 font-bold rounded-lg text-[10px] sm:text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(0,0,0,0.5)] transition-all hover:scale-[1.02] cursor-pointer border border-zinc-400 flex justify-center items-center gap-1.5"
                            >
                              💾 บันทึกข้อมูลและอัปเดต Dashboard
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 📜 2. SCROLLABLE CONTENT (แบบฟอร์มมุดลอดใต้ Header อย่างอิสระ) */}
                      <div key={formKey} className="space-y-4 mt-4 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-zinc-700 pr-1">

                        <div className="p-5 bg-zinc-950/60 border border-white/5 rounded-2xl space-y-4 shadow-xl">
                          {/* ส่วนที่ 2.1: ข้อมูลประธานหลัก */}
                          <div className="space-y-2">
                            <p className="font-black text-purple-300 text-[11px]">👤 2.1 ข้อมูลตัวประธานในพิธีเปิด (จากคลังกลาง event_attendees)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div className="space-y-1">
                                <span className="text-zinc-500 text-[10px] font-bold">ชื่อ-นามสกุล ประธาน *</span>
                                {/* 💡 นำ prefix มาต่อกับ fullname เหมือนเดิม */}
                                <input type="text" id="v2_chairman_name" defaultValue={chairman ? `${chairman.prefix || ''}${chairman.fullname || ''}` : ''} placeholder="ชื่อ-นามสกุล ประธานเปิดงาน" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none font-bold text-white focus:border-purple-500" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-zinc-500 text-[10px] font-bold">ตำแหน่งบริหารสูงสุด</span>
                                <input type="text" id="v2_chairman_pos" defaultValue={chairman?.position || ''} placeholder="ตำแหน่งเกียรติยศสูงสุด" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-300" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-zinc-500 text-[10px] font-bold">หน่วยงาน/สังกัด</span>
                                <input type="text" id="v2_chairman_org" defaultValue={chairman?.organization || ''} placeholder="หน่วยงาน/สังกัด" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-300" />
                              </div>
                            </div>

                            <div className="space-y-1 pt-1">
                              <span className="text-zinc-500 text-[10px] font-bold">ข้อมูลแนะนำตัว/ประวัติย่อ (bio_note)</span>
                              <textarea id="v2_chairman_bio" defaultValue={chairman?.bio_note || ''} placeholder="คำนิยามข้อมูลแนะนำประวัติและผลงานเด่นประธานย่อ..." className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 h-16 outline-none resize-none text-zinc-300 focus:border-purple-500" />
                            </div>
                          </div>

                          {/* ส่วนที่ 2.2: รูปถ่าย & สื่อประธาน */}
                          <div className="p-3 bg-zinc-900/50 border border-white/5 rounded-xl space-y-2">
                            <div className="text-[11px] font-bold text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span>🖼️ คลังอัปโหลดภาพถ่าย หรือเอกสารแนะนำตัวประธาน (ดึงขึ้นสไลด์อัตโนมัติ)</span>
                              <button type="button" onClick={() => alert('เปิดระบบอัปโหลดไฟล์สื่อ')} className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-3 py-1.5 text-[10px] flex items-center gap-1 transition-all cursor-pointer">
                                ➕ อัปโหลดไฟล์เพิ่ม
                              </button>
                            </div>
                          </div>

                          {/* ส่วนที่ 2.3: บรรยายพิเศษ & ข้อมูลเลขาฯ */}
                          <div className="p-3 bg-zinc-900/50 border border-purple-500/10 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2.5">
                              <div className="font-bold text-purple-400 flex items-center gap-1">🎤 ช่วงการบรรยายพิเศษของประธาน (ถ้ามี)</div>
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">หัวข้อบรรยายพิเศษ</span>
                                <input type="text" id="v2_lecture_topic" defaultValue={chairman?.special_act1 && chairman.special_act1 !== 'none' ? chairman.special_act1 : ''} placeholder="หัวข้อบรรยายพิเศษ" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 outline-none text-cyan-400 font-bold" />
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">ลิงก์ไฟล์สไลด์บรรยาย</span>
                                <input type="text" id="v2_lecture_media" defaultValue={chairman?.special_act2 && chairman.special_act2 !== 'none' ? chairman.special_act2 : ''} placeholder="ลิงก์ไฟล์สื่อสไลด์ประกอบการบรรยายพิเศษ" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 outline-none text-purple-400 font-mono" />
                              </div>
                            </div>

                            <div className="space-y-2.5 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-4">
                              <div className="font-bold text-indigo-400 flex items-center gap-1">📱 ช่องทางติดต่อเลขานุการ / ผู้ติดตาม</div>
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">ชื่อ-นามสกุล เลขาฯผู้ติดตาม</span>
                                <input type="text" id="v2_secretary_name" defaultValue={secretary ? `${secretary.prefix || ''}${secretary.fullname || ''}` : ''} placeholder="ชื่อ-นามสกุล เลขาฯผู้ติดตาม" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 outline-none text-zinc-200 font-bold" />
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">หมายเลขโทรศัพท์ / LINE ID</span>
                                <input type="text" id="v2_secretary_contact" defaultValue={secretary?.contact_info || ''} placeholder="หมายเลขโทรศัพท์ หรือ LINE ID" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 outline-none text-emerald-400 font-mono font-bold" />
                              </div>
                            </div>
                          </div>

                          {/* ส่วนที่ 2.4: ข้อมูลผู้ประสานงานจัดงาน */}
                          <div className="p-4 bg-cyan-950/10 border border-cyan-500/10 rounded-xl space-y-2">
                            <p className="font-black text-cyan-400 flex items-center gap-1">📞 2.4 เจ้าหน้าที่ผู้ประสานงานฝั่งคณะผู้จัดงาน (Liaison Staff)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">ชื่อผู้ประสานงานหลัก</span>
                                <input type="text" id="v2_coord_name" defaultValue={coordinator ? `${coordinator.prefix || ''}${coordinator.fullname || ''}` : ''} placeholder="ชื่อผู้ประสานงานฝ่ายจัดงาน" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none font-bold text-white" />
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">ตำแหน่งงานในคณะจัดงาน</span>
                                <input type="text" id="v2_coord_pos" defaultValue={coordinator?.position || coordinator?.role_in_event || 'หัวหน้าฝ่ายต้อนรับบุคคลสำคัญ'} placeholder="ตำแหน่งงานผู้ประสานงาน" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-zinc-300" />
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] font-bold block mb-0.5">เบอร์โทรติดต่อผู้ประสานงาน</span>
                                <input type="text" id="v2_coord_contact" defaultValue={coordinator?.contact_info || ''} placeholder="หมายเลขโทรศัพท์ผู้ประสานงาน" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-cyan-400 font-mono font-bold" />
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </>
                  );
                })()}
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>


                    <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                      🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                      🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                      👥 ตรวจสอบรายชื่อ (Attendees)
                    </button>
                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}


            {/* 👨‍🏫 3. ฝ่ายการประสานงานวิทยากร (Speaker Management & Portal Hub) */}
            {activeMenu === 'speaker_hub' && (
              <div className="relative flex flex-col h-full animate-in fade-in duration-200 text-xs text-left">

                {/* 🌟 1. STICKY HEADER (ส่วนหัวติดหนึบ + แบรนด์ NiiVaa) */}
                <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl pb-3 -mt-4 pt-4 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                          <Users size={18} /> 3. ศูนย์บัญชาการข้อมูลและสื่อวิทยากร (Speaker Hub)
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          บริหารจัดการรายชื่อ, หัวข้อบรรยาย, และสร้างลิงก์ Portal ส่วนตัวให้วิทยากรอัปโหลดสื่อ
                        </p>
                      </div>
                      {/* 🚧 แบนเนอร์แจ้งสถานะการอัปเกรดระบบ */}
                      <div className="flex items-center gap-3 p-3 mb-4 bg-amber-950/20 border border-amber-500/30 rounded-xl animate-pulse">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">สถานะ: อยู่ระหว่างปรับปรุงระบบ</h3>
                          <p className="text-[9px] text-zinc-500 font-bold">ระบบกำลังเชื่อมต่อฐานข้อมูลใหม่ กรุณารอสักครู่...</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            const newToken = crypto.randomUUID();
                            setSpeakersList([...speakersList, {
                              id: crypto.randomUUID(), // 👉 เปลี่ยนตรงนี้เป็น UUID ของจริงเพื่อให้ฐานข้อมูลยอมรับ
                              fullname: '', position: '', topic: '', phone: '', room: '',
                              date: '', startTime: '', endTime: '', access_token: newToken,
                              is_verified_by_speaker: false, blocks: []
                            }]);
                          }}
                          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 font-black rounded-xl text-[10px] shadow-lg shadow-purple-900/30 transition-all flex items-center gap-1.5"
                        >
                          ➕ เพิ่มวิทยากรท่านใหม่
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2.5 shrink-0 self-start">
                      {/* โลโก้แบรนด์ NiiVaa */}
                      <div className="flex items-center gap-1.5 font-black text-xl select-none mr-1">
                        <div className="flex tracking-tight">
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Nii</span>
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 ml-0.5">Vaa</span>
                        </div>
                        <div className="bg-black/80 border border-white/20 rounded px-1.5 py-0.5 flex items-center justify-center shadow-lg transform -skew-x-6">
                          <span className="text-[7px] text-zinc-300 tracking-[0.2em] font-bold">SMARTEVENT</span>
                        </div>
                      </div>

                      {/* 💾 ปุ่มบันทึกสไตล์ Dark Metallic */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!eventId || eventId === 'current') { alert('⚠️ ไม่พบ ID งานสัมมนา กรุณาสร้างงานก่อนครับ'); return; }

                            // 1. เตรียมข้อมูลให้ตรงกับ Schema ตาราง event_speakers
                            const payload = speakersList.map((sp, idx) => ({
                              id: sp.id,
                              event_id: eventId,
                              fullname: sp.fullname || 'ไม่ระบุชื่อ',
                              position: sp.position || null,
                              topic: sp.topic || null,
                              room: sp.room || null,
                              lecture_date: sp.date || null,
                              start_time: sp.startTime ? `${sp.startTime}:00` : null, // แปลงให้เป็น Time format
                              end_time: sp.endTime ? `${sp.endTime}:00` : null,
                              phone: sp.phone || null,
                              sort_order: idx + 1,
                              access_token: sp.access_token,
                              files_payload: sp.blocks || [] // ยัด sub-blocks เป็น JSONB
                            }));

                            // 2. บันทึก (Upsert) ลงฐานข้อมูล
                            const { error: spError } = await supabase.from('event_speakers').upsert(payload, { onConflict: 'id' });
                            if (spError) throw spError;

                            // 3. อัปเดตสถานะความพร้อมให้ CEO Dashboard
                            const safeEvent = typeof projectInfo !== 'undefined' ? projectInfo : {};
                            const currentStatus = safeEvent?.departments_status || {};
                            await supabase.from('events').update({ departments_status: { ...currentStatus, dept_3: 'ready' } }).eq('id', eventId);

                            alert('🎉 บันทึกข้อมูลวิทยากรและสร้างลิงก์ Portal สำเร็จแล้วครับ!');

                          } catch (err: any) { alert('❌ บันทึกข้อมูลล้มเหลว: ' + err.message); }
                        }}
                        className="w-full px-5 py-2.5 bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-200 font-bold rounded-lg text-[10px] sm:text-xs border border-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all hover:bg-zinc-800 hover:scale-[1.02] cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        💾 บันทึกข้อมูลและอัปเดต Dashboard
                      </button>
                    </div>
                  </div>
                </div>

                {/* 📜 2. SCROLLABLE CONTENT */}
                <div className="mt-5 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-zinc-700 pr-1 space-y-6">

                  {/* Speaker Cards Loop */}
                  {speakersList.length === 0 ? (
                    <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center text-zinc-500 font-bold">
                      ย้งไม่มีข้อมูลวิทยากร กดปุ่ม +เพิ่มวิทยากรท่านใหม่ ด้านบนครับ
                    </div>
                  ) : (
                    speakersList.map((sp, idx) => (
                      <div key={sp.id || idx} className="p-5 bg-zinc-950/80 border border-purple-500/20 rounded-3xl space-y-4 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-purple-900/50 text-purple-300 font-black px-3 py-1 rounded-lg border border-purple-500/30">วิทยากร #{idx + 1}</span>
                            <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${sp.is_verified_by_speaker ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' : 'bg-amber-900/40 text-amber-400 border border-amber-500/30'}`}>
                              {sp.is_verified_by_speaker ? '✅ วิทยากรยืนยันสื่อแล้ว' : '⏳ รอการตรวจสอบสื่อ'}
                            </span>
                          </div>
                          <button onClick={() => { if (confirm('ต้องการลบวิทยากรท่านนี้?')) { const u = [...speakersList]; u.splice(idx, 1); setSpeakersList(u); } }} className="text-zinc-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                        </div>

                        {/* แผงข้อมูลหลัก */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">ชื่อ-นามสกุล วิทยากร</label>
                            <input type="text" placeholder="ชื่อ-นามสกุล" value={sp.fullname || ''} onChange={e => { const u = [...speakersList]; u[idx].fullname = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none font-bold text-white focus:border-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">ตำแหน่ง / องค์กร</label>
                            <input type="text" placeholder="ตำแหน่งการทำงาน" value={sp.position || ''} onChange={e => { const u = [...speakersList]; u[idx].position = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none text-zinc-300 focus:border-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">เบอร์โทรศัพท์ติดต่อ</label>
                            <input type="text" placeholder="08X-XXX-XXXX" value={sp.phone || ''} onChange={e => { const u = [...speakersList]; u[idx].phone = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 outline-none font-mono text-cyan-400 focus:border-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-400">หัวข้อบรรยายหลัก (Topic)</label>
                            <input type="text" placeholder="หัวข้อหลักที่บรรยาย" value={sp.topic || ''} onChange={e => { const u = [...speakersList]; u[idx].topic = e.target.value; setSpeakersList(u); }} className="w-full bg-black/60 border border-purple-500/30 rounded-xl p-2.5 outline-none text-purple-300 font-bold focus:border-purple-500" />
                          </div>
                        </div>

                        {/* แผงข้อมูลตารางเวลาและห้อง */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-black/30 p-3 rounded-2xl border border-white/5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500">วันที่บรรยาย</label>
                            <input type="date" value={sp.date || ''} onChange={e => { const u = [...speakersList]; u[idx].date = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500">เวลาเริ่ม (Start)</label>
                            <input type="time" value={sp.startTime || ''} onChange={e => { const u = [...speakersList]; u[idx].startTime = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white outline-none font-mono focus:border-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500">เวลาจบ (End)</label>
                            <input type="time" value={sp.endTime || ''} onChange={e => { const u = [...speakersList]; u[idx].endTime = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white outline-none font-mono focus:border-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-500">ห้องจัด/เวที (Room)</label>
                            <input type="text" placeholder="เช่น Grand Hall" value={sp.room || ''} onChange={e => { const u = [...speakersList]; u[idx].room = e.target.value; setSpeakersList(u); }} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-purple-500" />
                          </div>
                        </div>

                        {/* กล่องสร้างลิงก์ส่วนตัว (Speaker Portal Link) */}
                        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                          <div>
                            <p className="font-black text-blue-400 text-xs flex items-center gap-1.5">🔗 ลิงก์พอร์ทัลส่วนตัวสำหรับวิทยากร (Speaker Portal)</p>
                            <p className="text-[9px] text-zinc-400 mt-1">ส่งลิงก์นี้ให้วิทยากรเพื่อตรวจสอบข้อมูลและอัปโหลดสไลด์/สื่อด้วยตนเอง</p>
                            <div className="mt-2 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 font-mono text-[10px] text-zinc-300 truncate max-w-sm select-all">
                              https://niivaa.com/speaker/{sp.access_token || 'pending...'}
                            </div>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(`https://niivaa.com/speaker/${sp.access_token}`); alert('📋 คัดลอกลิงก์ส่งให้วิทยากรเรียบร้อยครับ!'); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-[10px] transition-all shrink-0 shadow-lg shadow-blue-900/30">
                            คัดลอกลิงก์
                          </button>
                        </div>

                        {/* คิวบล็อกหัวข้อย่อยยืดหยุ่น (บันทึกลง files_payload JSONB) */}
                        <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black text-cyan-400">
                            <span>📝 แผนการใช้สไลด์/สื่อแยกตามหัวข้อย่อย (JSONB Sub-blocks)</span>
                            <button onClick={() => { const u = [...speakersList]; u[idx].blocks.push({ title: 'หัวข้อย่อยบรรยายใหม่', duration: 10, media_type: 'none', media_url: '' }); setSpeakersList(u); }} className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">+ เพิ่มแถว</button>
                          </div>
                          {sp.blocks?.map((bl: any, bIdx: number) => (
                            <div key={bIdx} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-zinc-950/80 p-2 rounded-xl border border-white/5">
                              <span className="text-zinc-600 font-mono font-bold text-[9px]">#{bIdx + 1}</span>
                              <input type="text" placeholder="ชื่อหัวข้อย่อย" value={bl.title} onChange={e => { const u = [...speakersList]; u[idx].blocks[bIdx].title = e.target.value; setSpeakersList(u); }} className="flex-1 min-w-[120px] bg-transparent border-b border-zinc-800 focus:border-purple-500 text-[11px] outline-none text-zinc-200 font-bold px-1" />
                              <div className="flex items-center gap-1">
                                <input type="number" placeholder="นาที" value={bl.duration} onChange={e => { const u = [...speakersList]; u[idx].blocks[bIdx].duration = Number(e.target.value); setSpeakersList(u); }} className="w-12 bg-zinc-900 border border-white/10 text-center text-purple-400 p-1 rounded font-mono text-[10px]" />
                                <span className="text-[9px] text-zinc-500">นาที</span>
                              </div>
                              <select value={bl.media_type || 'none'} onChange={e => { const u = [...speakersList]; u[idx].blocks[bIdx].media_type = e.target.value; setSpeakersList(u); }} className="bg-zinc-900 border border-white/10 rounded p-1 text-[10px] text-zinc-300 outline-none w-24">
                                <option value="none">ไม่ใช้สื่อ</option>
                                <option value="slide">สไลด์ PDF</option>
                                <option value="video">วิดีโอ</option>
                              </select>
                              <button onClick={() => { const u = [...speakersList]; u[idx].blocks.splice(bIdx, 1); setSpeakersList(u); }} className="text-zinc-600 hover:text-red-400 text-[10px] p-1">❌</button>
                            </div>
                          ))}
                        </div>

                      </div>
                    ))
                  )}

                  {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix)
                      ======================================================== */}
                  <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                    <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                      <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                      ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                    </h3>

                    <div className="flex flex-wrap gap-3 relative z-10">
                      <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                        👥 ตรวจสอบรายชื่อ (Attendees)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                        🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                        📺 จอแสดงผลโปรเจกเตอร์ (Display)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                        🪑 ดูผังที่นั่ง VIP (Venue Planner)
                      </button>
                    </div>
                  </div>
                  {/* ================= จบแผงปุ่มทางด่วน ================= */}

                </div>
              </div>
            )}


            {/* 🎤 4. ฝ่ายเตรียมสคริปต์พิธีกรและสื่อ (Emcee & Media Command Center - NiiVaa JSONB Matrix) */}
            {activeMenu === 'emcee_script' && (
              <div className="relative flex flex-col h-full animate-in fade-in duration-200 text-xs text-left">

                {/* 🌟 1. STICKY HEADER (ส่วนหัวติดหนึบค้างตลอดเวลา + แบรนด์ NIIVAA) */}
                <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl pb-3 -mt-4 pt-4 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                          🎤 4. ห้องควบคุมสคริปต์และคิวสื่อมัลติมีเดียเวที
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          ฝ่ายที่ 4: บริหารบล็อกสคริปต์ 2 ชั้น พร้อมแผงคิว Switching ยิงสื่อภาพและ Lower Third (ชื่อ-ตำแหน่ง) ขึ้นจอ
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-fit px-3 py-1 bg-purple-950/80 border border-purple-500/50 rounded-lg flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse shadow-[0_0_8px_#c084fc]"></span>
                          <span className="text-purple-400 font-black text-[9px] tracking-wide">🔵 โหมดคุมสคริปต์ & Smart VIP Media Matrix</span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-xl border border-white/5 text-[10px]">
                          <span className="text-zinc-400 font-bold">เริ่มกิจกรรมแรก:</span>
                          <input
                            type="time"
                            value={startTime || '09:00'}
                            onChange={e => { if (typeof setStartTime === 'function') setStartTime(e.target.value) }}
                            className="bg-zinc-950 border border-white/10 rounded px-1.5 py-0.5 font-bold text-purple-400 outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2.5 shrink-0 self-start">

                      {/* โลโก้แบรนด์ NiiVaa */}
                      <div className="flex items-center gap-1.5 font-black text-xl select-none mr-1">
                        <div className="flex tracking-tight">
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Nii</span>
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 ml-0.5">Vaa</span>
                        </div>
                        <div className="bg-black/80 border border-white/20 rounded px-1.5 py-0.5 flex items-center justify-center shadow-lg transform -skew-x-6">
                          <span className="text-[7px] text-zinc-300 tracking-[0.2em] font-bold">SMARTEVENT</span>
                        </div>
                      </div>

                      {/* 💾 ปุ่มบันทึกสไตล์ Dark Metallic */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!eventId) { alert('⚠️ ไม่พบ ID ของงานสัมมนา'); return; }

                            let currentTotalMinutes = 0;
                            if (startTime) {
                              const [h, m] = startTime.split(':').map(Number);
                              currentTotalMinutes = h * 60 + m;
                            }

                            const sortedItems = [...agendaItems].sort((a, b) => (a.sequence_no || a.sort_order || 0) - (b.sequence_no || b.sort_order || 0));

                            const agendaPayloadToUpsert = sortedItems.map((item) => {
                              const calcHours = Math.floor(currentTotalMinutes / 60) % 24;
                              const calcMins = currentTotalMinutes % 60;
                              const timeString = `${calcHours.toString().padStart(2, '0')}:${calcMins.toString().padStart(2, '0')}`;

                              currentTotalMinutes += Number(item.duration_minutes || item.duration || 0);

                              return {
                                id: item.id,
                                event_id: eventId,
                                title: item.title,
                                duration_minutes: item.duration_minutes || item.duration || 0,
                                sort_order: item.sequence_no || item.sort_order || 0,
                                main_script: item.main_script || '',
                                sub_script: item.sub_script || '',
                                speaker_role: item.speaker_role || 'both',
                                event_day: item.event_day || 1,
                                media_type: item.media_type || 'none',
                                media_url: item.media_url || '',
                                start_time: timeString
                              };
                            });

                            const { error: agendaErr } = await supabase.from('event_agenda_items').upsert(agendaPayloadToUpsert);
                            if (agendaErr) throw agendaErr;

                            await supabase.from('event_details').update({ mc_script_data: agendaItems }).eq('event_id', eventId);

                            const safeEvent = typeof projectInfo !== 'undefined' ? projectInfo : {};
                            const currentStatus = safeEvent?.departments_status || {};
                            const { error: timeErr } = await supabase
                              .from('events')
                              .update({
                                start_time: startTime,
                                departments_status: { ...currentStatus, dept_4: 'ready' }
                              })
                              .eq('id', eventId);
                            if (timeErr) throw timeErr;

                            alert('🎉 บันทึกสคริปต์พิธีกร พร้อมจัดสรรเวลา start_time ของแต่ละคิวลงฐานข้อมูลสำเร็จครับ!');
                            if (typeof fetchEventAgendaData === 'function') fetchEventAgendaData();
                          } catch (err: any) { alert('❌ บันทึกโครงสร้างล้มเหลว: ' + err.message); }
                        }}
                        className="w-full px-5 py-2.5 bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-200 font-bold rounded-lg text-[10px] sm:text-xs border border-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all hover:bg-zinc-800 hover:scale-[1.02] cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        💾 บันทึกสคริปต์คิวงานและอัปเดต Dashboard
                      </button>
                    </div>
                  </div>
                </div>

                {/* 📜 2. SCROLLABLE CONTENT */}
                <div key={`f4-core-key-${eventId}-${agendaItems?.length || 0}`} className="mt-5 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-zinc-700 pr-1">

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                    {/* ========================================================
                        แผงซ้าย: ระบบจัดคิวสคริปต์ (Cascading Multi-MC Sheet) (Col 7)
                        ======================================================== */}
                    <div className="xl:col-span-7 space-y-4">
                      <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                        <span className="font-black text-purple-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          ระบบจัดคิวสคริปต์พิธีกร (Script & Cue Sheet)
                        </span>
                        <button type="button" onClick={() => { if (typeof setAgendaItems === 'function') setAgendaItems([...agendaItems, { title: 'กิจกรรมช่วงใหม่', duration: 10, speaker_role: 'both', main_script: '', sub_script: '', event_day: 1, visual_audio_cue: '', responsible_person: '' }]) }} className="px-2.5 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600 hover:text-white rounded font-bold text-[10px] transition cursor-pointer">
                          ➕ เพิ่ม Block กิจกรรมย่อย
                        </button>
                      </div>

                      <div className="space-y-4">
                        {typeof agendaItems === 'undefined' || agendaItems.length === 0 ? (
                          <div className="p-8 border border-dashed border-white/5 rounded-2xl text-center text-zinc-500 font-bold text-xs">
                            ⏳ ยังไม่มีข้อมูลสคริปต์ กดปุ่มเพิ่ม Block ด้านบน
                          </div>
                        ) : (
                          [...agendaItems]
                            .sort((a, b) => (a.sequence_no || 0) - (b.sequence_no || 0))
                            .map((item, idx) => {
                              const getCalendarDate = (dayNum: number) => {
                                const safeProj = typeof projectInfo !== 'undefined' ? projectInfo : {};
                                if (!safeProj?.startDate) return '';
                                const d = new Date(safeProj.startDate);
                                d.setDate(d.getDate() + (dayNum - 1));
                                return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                              };

                              return (
                                <div key={`agenda-item-${item.id || idx}`} className={`p-4 rounded-2xl border transition-all duration-300 bg-gradient-to-b ${item.is_live_now ? 'from-purple-950/40 via-zinc-950 text-left to-zinc-950 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : item.speaker_role === 'mc_1' ? 'from-cyan-950/10 to-zinc-950 border-cyan-500/20' : item.speaker_role === 'mc_2' ? 'from-purple-950/10 to-zinc-950 border-purple-500/20' : 'from-zinc-900/90 to-zinc-950 border-white/5 hover:border-white/10'}`}>

                                  {/* แถวบน: ลำดับคิว และ หัวข้อช่วงงาน */}
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-white/5 pb-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className={`w-6 h-6 rounded-lg font-mono font-black text-[11px] flex items-center justify-center shrink-0 border ${item.is_live_now ? 'bg-purple-500 text-white border-purple-400' : 'bg-purple-600/20 text-purple-400 border-purple-500/20'}`}>#{idx + 1}</span>

                                      <select value={item.event_day || 1} onChange={e => { const updated = [...agendaItems]; updated[idx].event_day = Number(e.target.value); if (typeof setAgendaItems === 'function') setAgendaItems(updated); }} className="bg-black/60 border border-white/10 rounded px-2 py-0.5 text-[10px] font-black text-purple-400 outline-none cursor-pointer">
                                        <option value={1}>DAY 1 ({getCalendarDate(1) || 'วันแรก'})</option>
                                        <option value={2}>DAY 2 ({getCalendarDate(2) || 'วันที่ 2'})</option>
                                      </select>

                                      <span className="bg-black/60 font-mono font-black text-[#00ffcc] px-2 py-0.5 rounded text-[11px] border border-white/5 shadow-sm">
                                        {typeof calculateItemStartTime === 'function' ? calculateItemStartTime(idx) : '00:00'}
                                      </span>

                                      <input type="text" value={item.title || ''} onChange={e => { const updated = [...agendaItems]; updated[idx].title = e.target.value; if (typeof setAgendaItems === 'function') setAgendaItems(updated); }} className="bg-transparent font-black text-white outline-none border-b border-transparent hover:border-zinc-700 focus:border-purple-500 w-52 text-xs" placeholder="พิมพ์ชื่อกิจกรรมย่อย..." />
                                      {item.is_live_now && (<span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-md font-black animate-pulse flex items-center gap-1 ml-2"><span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE</span>)}
                                    </div>

                                    <div className="flex items-center gap-2 self-end text-[10px]">
                                      <input type="number" placeholder="นาที" value={item.duration || item.duration_minutes || ''} onChange={e => { const updated = [...agendaItems]; updated[idx].duration = Number(e.target.value); updated[idx].duration_minutes = Number(e.target.value); if (typeof setAgendaItems === 'function') setAgendaItems(updated); }} className="w-12 bg-zinc-950 border border-white/10 rounded p-1 text-center outline-none font-bold font-mono text-purple-400" />
                                      <span className="text-zinc-500 font-bold">นาที</span>

                                      <select value={item.speaker_role || 'both'} onChange={e => { const updated = [...agendaItems]; updated[idx].speaker_role = e.target.value; if (typeof setAgendaItems === 'function') setAgendaItems(updated); }} className="bg-zinc-950 border border-white/10 p-1 rounded font-black text-cyan-400 cursor-pointer">
                                        <option value="both">🗣️ คู่ร่วม</option>
                                        <option value="mc_1">🧑‍💼 MC 1</option>
                                        <option value="mc_2">👩‍💼 MC 2</option>
                                      </select>

                                      <div className="flex bg-black/40 rounded overflow-hidden text-[9px] border border-white/5">
                                        <button type="button" onClick={() => { if (typeof moveAgendaItem === 'function') moveAgendaItem(idx, 'up'); }} className="px-2 py-1 hover:bg-white/10 font-bold">▲</button>
                                        <button type="button" onClick={() => { if (typeof moveAgendaItem === 'function') moveAgendaItem(idx, 'down'); }} className="px-2 py-1 hover:bg-white/10 border-l border-white/5 font-bold">▼</button>
                                      </div>
                                      <button type="button" onClick={() => { if (confirm('ต้องการลบช่วงคิวงานนี้?')) { const updated = [...agendaItems]; updated.splice(idx, 1); if (typeof setAgendaItems === 'function') setAgendaItems(updated); } }} className="text-zinc-600 hover:text-red-400 font-bold ml-1">❌</button>
                                    </div>
                                  </div>

                                  {/* ส่วนกลาง: สคริปต์ 2 ชั้น */}
                                  <div className="my-3 space-y-1.5 text-left">
                                    <label className="text-[10px] font-black text-amber-400 block mb-1">🎙 * สคริปต์คำกล่าวคิวงานนี้ (Script Block 2 Layers):</label>
                                    <input type="text" placeholder="💬 [ชั้นบน - บทหลักกล่าวจริงออกไมค์หลัก] (main_script)" value={item.main_script || item.emcee_script_th || ''} onChange={e => { const updated = [...agendaItems]; updated[idx].main_script = e.target.value; updated[idx].emcee_script_th = e.target.value; if (typeof setAgendaItems === 'function') setAgendaItems(updated); }} className="w-full bg-black/60 border border-white/5 rounded-xl p-2.5 text-white font-medium outline-none focus:border-purple-500/50" />
                                    <input type="text" placeholder="💡 [ชั้นล่าง - ข้อมูลเสริมคั่นเวลาเดดแอร์] (sub_script)" value={item.sub_script || ''} onChange={e => { const updated = [...agendaItems]; updated[idx].sub_script = e.target.value; if (typeof setAgendaItems === 'function') setAgendaItems(updated); }} className="w-full bg-zinc-900/40 border border-transparent rounded-xl p-2 text-zinc-400 outline-none text-[11px] focus:text-zinc-200" />
                                  </div>

                                  {/* 🎛 แผง Media คิวสื่อ */}
                                  <div className="p-3 bg-zinc-950 border border-white/5 rounded-xl space-y-2.5 text-left text-[11px]">
                                    <p className="font-black text-cyan-400 flex items-center gap-1">📁 คลังเก็บสื่อประจำคิว (Media URL)</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div className="space-y-1">
                                        <select value={item.media_type || 'none'} onChange={async (e) => { const val = e.target.value; await supabase.from('event_agenda_items').update({ media_type: val }).eq('id', item.id); if (typeof fetchEventAgendaData === 'function') fetchEventAgendaData(); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-white font-medium focus:border-cyan-500 outline-none cursor-pointer">
                                          <option value="none">🛑 ไม่มีสื่อแนบ</option>
                                          <option value="image_vip">🖼️ ภาพนิ่ง/สไลด์</option>
                                          <option value="video">🎥 วิดีโอ VTR</option>
                                        </select>
                                      </div>
                                      <div className="sm:col-span-2 space-y-1">
                                        <div className="flex gap-1.5">
                                          <input type="text" placeholder="https://ลิงก์ไฟล์..." defaultValue={item.media_url || ''} onBlur={async (e) => { const inputUrl = e.target.value.trim(); if (inputUrl === item.media_url) return; await supabase.from('event_agenda_items').update({ media_url: inputUrl }).eq('id', item.id); if (typeof fetchEventAgendaData === 'function') fetchEventAgendaData(); }} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-zinc-300 font-mono text-[10px] focus:border-cyan-500 outline-none" />
                                          {item.media_url && (<a href={item.media_url} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg flex items-center justify-center font-bold text-[10px] transition-all">🔗</a>)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* ========================================================
                        แผงขวา: โปรมป์เตอร์คิว VIP และ แผง Media Matrix ยิงภาพ (Col 5)
                        ======================================================== */}
                    <div className="xl:col-span-5 flex flex-col gap-4">

                      {/* 🎯 ส่วนที่ 1: แผง Teleprompter */}
                      <div className="p-4 bg-zinc-950 border border-purple-500/20 rounded-2xl shadow-2xl flex flex-col min-h-[350px]">
                        <div className="border-b border-white/10 pb-3 mb-4 flex justify-between items-start gap-2">
                          <div>
                            <h3 className="font-black text-purple-400 text-sm flex items-center gap-1.5">🎬 แผง Teleprompter (คิวอ่าน)</h3>
                            <p className="text-[10px] text-zinc-500 mt-0.5">เรียงคิวอิสระ กดสลับขึ้นลงได้ตลอดเวลา</p>
                          </div>
                          <button
                            onClick={async () => {
                              if (confirm('ซ้อมเสร็จแล้ว ต้องการรีเซ็ตคิว VIP ทั้งหมดกลับสู่ค่าเริ่มต้นหรือไม่?')) {
                                await supabase.from('event_attendees').update({ priority_level: 50 }).eq('event_id', eventId);
                                if (typeof fetchEventAttendeesForSeating === 'function') fetchEventAttendeesForSeating();
                              }
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded text-[9px] font-bold transition-all border border-white/5 cursor-pointer"
                          >
                            🔄 รีเซ็ตคิว
                          </button>
                        </div>

                        <div className="bg-black/80 rounded-xl p-3 border border-white/5 flex-1 flex flex-col">
                          <span className="text-[8px] font-bold text-zinc-600 tracking-widest uppercase mb-2 block border-b border-white/5 pb-1">ลำดับการกล่าวประกาศนาม</span>

                          {typeof vipGuests !== 'undefined' && vipGuests.length > 0 ? (
                            <div className="space-y-2 overflow-auto max-h-[250px] pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                              {[...vipGuests]
                                .sort((a, b) => (Number(a.priority_level) || 50) - (Number(b.priority_level) || 50))
                                .map((vip, vIdx) => {
                                  const isRead = Number(vip.priority_level) >= 900;
                                  const isPinned = Number(vip.priority_level) <= 10;
                                  const displayName = vip.fullname || vip.name || 'ไม่ระบุชื่อ';

                                  const cardBgClass = isRead ? 'bg-zinc-950/80 border-white/5 opacity-50'
                                    : (isPinned ? 'bg-gradient-to-r from-purple-950/60 to-zinc-900 border-purple-500/30'
                                      : 'bg-zinc-900/60 border-white/5');

                                  return (
                                    <div key={`prompter-${vip.id || vIdx}`} className={`p-2 border rounded-xl flex items-center justify-between transition-all duration-300 ${cardBgClass}`}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-5 h-5 font-mono font-black text-[9px] rounded flex items-center justify-center shrink-0 border ${isRead ? 'bg-zinc-900 text-zinc-600 border-zinc-800' : 'bg-purple-600 text-white border-purple-400'}`}>
                                          {vIdx + 1}
                                        </span>
                                        <div className="min-w-0">
                                          <p className={`truncate font-black ${isRead ? 'text-zinc-600 line-through text-[11px]' : 'text-white text-xs'}`}>{displayName}</p>
                                          <p className="text-[9px] text-zinc-500 truncate">{vip.position || '-'}</p>
                                        </div>
                                      </div>

                                      <div className="flex gap-1 shrink-0 ml-2">
                                        <button onClick={async () => { await supabase.from('event_attendees').update({ priority_level: 1 }).eq('id', vip.id); if (typeof fetchEventAttendeesForSeating === 'function') fetchEventAttendeesForSeating(); }} className="w-6 h-6 bg-zinc-800 hover:bg-cyan-700 text-white rounded flex items-center justify-center text-[10px] transition-all cursor-pointer">⬆️</button>
                                        <button onClick={async () => { await supabase.from('event_attendees').update({ priority_level: 999 }).eq('id', vip.id); if (typeof fetchEventAttendeesForSeating === 'function') fetchEventAttendeesForSeating(); }} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-600 text-white rounded flex items-center justify-center text-[10px] transition-all cursor-pointer">⏬</button>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="text-center text-zinc-600 py-4 text-[10px]">รอข้อมูล VIP จากตาราง</div>
                          )}
                        </div>
                      </div>

                      {/* 🎛️ ส่วนที่ 2: แผง Media Matrix ยิงภาพ */}
                      <div className="p-4 bg-gradient-to-br from-zinc-900 to-black border border-cyan-500/20 rounded-2xl shadow-xl flex-1">
                        <div className="border-b border-white/10 pb-2 mb-3 flex justify-between items-end">
                          <div>
                            <h3 className="font-black text-cyan-400 text-xs flex items-center gap-1.5">🎛️ บอร์ดควบคุมภาพ VIP (Lower Third Matrix)</h3>
                            <p className="text-[9px] text-zinc-500 mt-0.5">ส่งแพ็กเกจ "รูปภาพ + ชื่อ + ตำแหน่ง" ขึ้นจอใหญ่ทันที</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-auto max-h-[250px] pr-1 scrollbar-thin scrollbar-thumb-cyan-900">
                          {typeof vipGuests !== 'undefined' && vipGuests.length > 0 ? (
                            vipGuests.map((vip, vIdx) => {
                              const payloadToScreen = {
                                type: 'vip_lower_third',
                                imageUrl: vip.profile_image_url || 'ไม่มีรูปภาพ',
                                captionLine1: `${vip.prefix || ''}${vip.fullname || 'ไม่ระบุชื่อ'}`,
                                captionLine2: vip.position || 'ผู้บริหารระดับสูง'
                              };

                              return (
                                <button
                                  key={`matrix-${vip.id || vIdx}`}
                                  type="button"
                                  onClick={() => {
                                    console.log('Sending to projector:', payloadToScreen);
                                    alert(`🚀 ส่งข้อมูลขึ้นจอสำเร็จ!\n\n📷 รูปภาพ: ${payloadToScreen.imageUrl !== 'ไม่มีรูปภาพ' ? 'พร้อมแสดง' : 'ไม่มีรูปในระบบ'}\n📝 บรรทัดที่ 1 (ชื่อ): ${payloadToScreen.captionLine1}\n💼 บรรทัดที่ 2 (ตำแหน่ง): ${payloadToScreen.captionLine2}`);
                                  }}
                                  className="p-2 flex flex-col items-center justify-center text-center gap-1.5 bg-zinc-950 border border-zinc-800 hover:border-cyan-500 hover:bg-cyan-950/30 rounded-xl transition-all group active:scale-95 cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg group-hover:border-cyan-400 transition-all overflow-hidden">
                                    {vip.profile_image_url ? (
                                      <img src={vip.profile_image_url} alt={vip.fullname} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[14px]">👤</span>
                                    )}
                                  </div>
                                  <div className="w-full">
                                    <p className="text-[9px] font-black text-zinc-300 group-hover:text-white truncate">{vip.fullname}</p>
                                    <p className="text-[8px] text-zinc-500 truncate">{vip.position || 'VIP'}</p>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="col-span-full text-center text-zinc-600 py-4 text-[10px]">รอข้อมูล VIP...</div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* ========================================================
                      🚀 โซนเมนูลัด (Quick Navigation) วางไว้อย่างปลอดภัยตรงนี้
                      ======================================================== */}
                  <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-purple-500/5 to-transparent pointer-events-none"></div>

                    <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                      <span className="bg-white/10 text-white px-2 py-1 rounded-lg text-xs">🚀 เมนูด่วน</span>
                      เลือกเส้นทางไปต่อ (Quick Navigation)
                    </h3>

                    <div className="flex flex-wrap gap-3 relative z-10">
                      <button type="button" onClick={() => router.push('/eventdashboard')} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 rounded-xl text-xs font-bold text-white transition-all shadow-sm">
                        🏠 กลับหน้าศูนย์บัญชาการ (Mini-Hub)
                      </button>

                      <button type="button" onClick={() => router.push('/eventdashboard/venue/planner')} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                        🪑 จัดแปลนผังเก้าอี้ VIP
                      </button>

                      <button type="button" onClick={() => router.push('/eventdashboard/showtime/controller')} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-900/40 hover:bg-cyan-600 border border-cyan-500/50 hover:border-cyan-400 rounded-xl text-xs font-bold text-cyan-100 transition-all shadow-sm">
                        🎛️ คุมคิวหน้างาน (Controller)
                      </button>

                      <button type="button" onClick={() => router.push('/eventdashboard/showtime/display')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                        📺 จอแสดงผลโปรเจกเตอร์
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId !== 'current' ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        ตรวจสอบรายชื่อ (Attendees)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/showtime/script${eventId !== 'current' ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
                        หน้าบทพิธีกร (Showtime Script)
                      </button>
                    </div>
                  </div>
                  {/* ================= จบโซนเมนูลัด ================= */}

                </div>
              </div>
            )}

            {/* 🛡️ ฝ่ายที่ 5: ฝ่ายต้อนรับบุคคลสำคัญ */}
            {activeMenu === 'vip_reception' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                <h2 className="text-sm font-black text-purple-400 border-b border-white/5 pb-2">🛡️ 5. รายงานตัวชี้วัดความพร้อม ฝ่ายต้อนรับและประสานงานบุคคลสำคัญ (VIP Reception)</h2>
                <div className="space-y-2">
                  {[
                    { key: 'vipDataComplete', label: '1. มีแฟ้มรวบรวมข้อมูลรายชื่อและพิกัดการจองที่นั่ง VIP ครบถ้วนแล้ว' },
                    { key: 'staffAssigned', label: '2. กำหนดเจ้าหน้าที่ผู้รับผิดชอบประกบดูแล ครบตามจำนวน VIP แล้ว' },
                    { key: 'dateConfirmed', label: '3. ตรวจสอบยืนยันกำหนดเวลานัดหมายและการเดินทางของแขกเสร็จสิ้น' },
                    { key: 'readyToWelcome', label: '4. จัดเตรียมอาหารว่าง เครื่องดื่ม และความพร้อมเจ้าหน้าที่สแตนบายรอต้อนรับแล้ว' }
                  ].map((item) => (
                    <div key={item.key} className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex justify-between items-center">
                      <span className="font-bold text-zinc-300">{item.label}</span>
                      <select value={vipReceptionCheck[item.key] || 'pending'} onChange={e => setVipReceptionCheck({ ...vipReceptionCheck, [item.key]: e.target.value })} className="bg-zinc-950 border border-white/10 p-1 text-[10px] font-bold text-purple-400 rounded">
                        <option value="pending">⚪ เทา (รอตรวจ)</option>
                        <option value="progress">🟡 เหลือง (กำลังทำ)</option>
                        <option value="completed">🟢 เขียวนีออน (สมบูรณ์)</option>
                      </select>
                    </div>
                  ))}
                </div>
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/seating${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-900/40 hover:bg-pink-600 border border-pink-500/50 hover:border-pink-400 rounded-xl text-xs font-bold text-pink-100 transition-all shadow-sm">
                      🗺️ หน้าจอแสดงผังที่นั่งผู้ร่วมงาน (Seating)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                      🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                      👥 ตรวจสอบรายชื่อ (Attendees)
                    </button>
                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}

            {/* 📝 ฝ่ายที่ 6: ฝ่ายรับลงทะเบียนหน้างาน บันทึกลงตาราง event_attendees ต้นสังกัดตัวจริง */}
            {activeMenu === 'registration_tab' && (
              <div className="space-y-6 animate-in fade-in duration-150 text-xs text-left">

                {/* ส่วนหัวแสดงผลภาพรวม (งานเก่า) */}
                <div className="border-b border-white/5 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h2 className="text-sm font-black text-purple-400 flex items-center gap-1.5"><FileText size={14} /> 6. ศูนย์รับลงทะเบียนคลังรายชื่อส่วนกลาง (event_attendees Target)</h2>
                    <p className="text-[10px] text-zinc-500">ทุกคนลงตารางก้อนกลางเดียวกัน กระจายข้อมูลส่งต่อให้ระบบผังเก้าอี้ VIP ฝ่ายที่ 7 ค้นหาด่วนได้ทันที</p>
                  </div>
                </div>

                {/* ⚙️ ฟังก์ชันงานใหม่: ส่วนตั้งค่าเปิด-ปิด การแสดงผลคอลัมน์ตามความต้องการของผู้จัดงาน */}
                <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-cyan-400 font-black flex items-center gap-1.5">⚙️ ตั้งค่าช่องข้อมูลฟอร์มลงทะเบียน (เปิด-ปิด คอลัมน์ที่ต้องการใช้งาน)</span>
                    <span className="text-[9px] text-zinc-500">* บันทึกคอนฟิกเฉพาะงานลงฟิลด์ hidden_fields_config</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-zinc-400">
                    {[
                      { id: 'show_bio', label: '📝 แนะนำตัว (bio_note)' },
                      { id: 'show_gift', label: '🎁 ของที่ระลึก (gift_number/style)' },
                      { id: 'show_geo', label: '📍 พิกัดท้องถิ่น (district/province)' },
                      { id: 'show_special', label: '🏅 กิจกรรมพิเศษ (special_act1/2)' },
                    ].map((cfg) => (
                      <label key={cfg.id} className="flex items-center gap-2 bg-black/40 p-2 border border-white/5 rounded-xl cursor-pointer hover:border-zinc-800 transition-colors">
                        <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-purple-500 rounded cursor-pointer" />
                        {cfg.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 📥 EXCEL BULK PASTE PARSER SYSTEM (งานเก่า - ห้ามทิ้ง อัปเกรดฟิลด์พิเศษ) */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="flex-1">
                      <p className="font-black text-purple-300">📥 นำเข้าบัญชีรายชื่อแบบ Bulk จาก Excel / Google Sheets</p>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        รูปแบบคอลัมน์: ประเภทบุคคล(VIP/staff/guest) [Tab] คำนำหน้า [Tab] ชื่อ-สกุล [Tab] ตำแหน่ง [Tab] หน่วยงาน [Tab] อำเภอ [Tab] จังหวัด [Tab] หน้าที่ในงาน [Tab] กิจกรรมพิเศษ1 [Tab] คะแนนความสำคัญ [Tab] ช่องทางติดต่อ [Tab] กิจกรรมพิเศษ2
                      </p>
                    </div>
                    <textarea
                      placeholder="📋 วาง (Ctrl+V) ข้อมูลแถวจาก Excel ตรงนี้..."
                      onPaste={async (e) => {
                        e.preventDefault();
                        const pasteText = e.clipboardData.getData('text');
                        const rows = pasteText.split('\n').filter(r => r.trim() !== '');

                        const recordsToInsert = rows.map(row => {
                          const cols = row.split('\t');
                          return {
                            event_id: eventId,
                            attendee_type: cols[0] || 'guest',
                            prefix: cols[1] || '',
                            fullname: cols[2] || 'ไม่ระบุชื่อ',
                            position: cols[3] || '',
                            organization: cols[4] || '',
                            guest_district: cols[5] || 'ท่าตูม',
                            guest_province: cols[6] || 'สุรินทร์',
                            role_in_event: cols[7] || 'ผู้เข้าประชุม',
                            special_act1: cols[8] || 'none',
                            priority_level: Number(cols[9] || 50),
                            status: 'รอ',
                            is_present: false,
                            contact_info: cols[10] || '',
                            special_act2: cols[11] || 'none',
                            created_at: new Date().toISOString()
                          };
                        });

                        const { error } = await supabase.from('event_attendees').insert(recordsToInsert);
                        if (!error) {
                          alert(`🎉 บันทึกนำเข้า Excel แขกร่วมงานจำนวน ${recordsToInsert.length} คนสำเร็จถาวร!`);
                          fetchEventAttendeesForSeating();
                        } else {
                          alert(`เกิดเออร์เรอร์นำเข้า: ${error.message}`);
                        }
                      }}
                      className="w-full sm:w-80 bg-zinc-950/90 border border-dashed border-purple-500/40 rounded-xl p-2.5 text-[10px] outline-none h-14 text-purple-400 font-bold focus:border-purple-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 📝 WALK-IN DATA ENTRY FORM (งานเก่า + หลอมรวมฟิลด์ใหม่ทั้งหมดเข้าสถาปัตยกรรม ID ครบถ้วน) */}
                <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5 space-y-4">
                  <div className="font-black text-purple-400 text-xs flex items-center gap-1">📝 แบบฟอร์มกรอกบันทึกรายชื่อลงทะเบียน (กรณี Walk-In หน้าเคาน์เตอร์)</div>

                  {/* บล็อกที่ 1: การจำแนกประเภทและสถานะหลัก */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">1. ประเภทบุคคลหลัก (attendee_type):</span>
                      <select id="ins_type" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-black text-cyan-400 outline-none">
                        <option value="guest">👥 guest (ผู้เข้าประชุมทั่วไป)</option>
                        <option value="VIP">👑 VIP (แขกจัดที่นั่ง & แนะนำตัว)</option>
                        <option value="staff">🛠️ staff (คณะทำงาน/เจ้าหน้าที่)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">2. ลำดับความสำคัญศักดิ์งาน (priority_level):</span>
                      <select id="ins_priority" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-black text-purple-400 outline-none">
                        <option value={50}>LVL 50 (ผู้ร่วมงานทั่วไป / แขกทั่วไป)</option>
                        <option value={10}>LVL 10 (ประธานสูงสุด / ผู้ว่าฯ / VIP ใหญ่)</option>
                        <option value={11}>LVL 11 (นายอำเภอ / ผอ.เขต / VIP พื้นที่)</option>
                        <option value={20}>LVL 20 (หน.ส่วนราชการ / ผู้จัดงานบริหาร)</option>
                        <option value={30}>LVL 30 (Staff ฝ่ายปฏิบัติการหน้างาน)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">3. สถานะหน้างาน (status):</span>
                      <select id="ins_status" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-black text-emerald-400 outline-none">
                        <option value="รอ">⏳ รอลงทะเบียน (pending)</option>
                        <option value="มาแล้ว">🟢 arrived (มางานแล้ว)</option>
                        <option value="กลับแล้ว">⚪กลับแล้ว (returned)</option>
                        <option value="ยืนยันไม่ได้มา">❌ ยืนยันไม่ได้มา</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">4. แนะนำตัวหน้างาน (is_present):</span>
                      <select id="ins_is_present" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-black text-amber-400 outline-none">
                        <option value="false">❌ ยังไม่แนะนำตัว</option>
                        <option value="true">✅ แนะนำตัวเรียบร้อย (True)</option>
                      </select>
                    </div>
                  </div>

                  {/* บล็อกที่ 2: ข้อมูลอัตลักษณ์ตัวบุคคล และช่องทางติดต่อสื่อสาร */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="space-y-1 sm:col-span-3">
                      <span className="font-bold text-zinc-400">5. คำนำหน้าชื่อ/ยศ (prefix):</span>
                      <div className="flex gap-1">
                        <select id="ins_prefix_sel" onChange={(e) => { const i = document.getElementById('ins_prefix') as HTMLInputElement; if (i && e.target.value !== 'other') i.value = e.target.value; }} className="bg-zinc-900 border border-white/10 rounded-lg p-2 font-bold text-zinc-300 outline-none w-24">
                          <option value="นาย">นาย</option>
                          <option value="นาง">นาง</option>
                          <option value="นางสาว">น.ส.</option>
                          <option value="ดร.">ดร.</option>
                          <option value="ผอ.">ผอ.</option>
                          <option value="other">อื่น ๆ ➡️</option>
                        </select>
                        <input type="text" id="ins_prefix" defaultValue="นาย" placeholder="ยศ..." className="flex-1 bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-zinc-200 font-bold text-center" />
                      </div>
                    </div>

                    <div className="space-y-1 sm:col-span-5">
                      <span className="font-bold text-zinc-400">6. ชื่อ - นามสกุลจริง (fullname) *:</span>
                      <input type="text" id="ins_fullname" placeholder="กรอกชื่อและนามสกุลจริงผู้ร่วมงาน" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none font-bold text-white focus:border-purple-500 placeholder:text-zinc-700" />
                    </div>

                    <div className="space-y-1 sm:col-span-4">
                      <span className="font-bold text-zinc-400">7. ช่องทางติดต่อ (contact_info):</span>
                      <input type="text" id="ins_contact" placeholder="เช่น โทร.08X-XXXXXXX, Line ID..." className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-zinc-300 placeholder:text-zinc-700" />
                    </div>
                  </div>

                  {/* บล็อกที่ 3: ตำแหน่ง, สังกัด และ ระบบ Dropdown พิมพ์กรอกเพิ่มบทบาทในงานได้อิสระ */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">8. ตำแหน่งบริหาร (position):</span>
                      <input type="text" id="ins_position" placeholder="เช่น ผู้อำนวยการสถานศึกษา" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 outline-none text-zinc-200 placeholder:text-zinc-700" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">9. หน่วยงาน / สังกัด (organization):</span>
                      <input type="text" id="ins_org" placeholder="เช่น โรงเรียนสุรวิทยาคาร" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-zinc-200 outline-none placeholder:text-zinc-700" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-cyan-400 font-black">🎭 10. บทบาทในงาน (role_in_event):</span>
                      <input
                        type="text"
                        id="ins_role"
                        list="roles-central-list"
                        placeholder="เลือกจากรายการ หรือพิมพ์กรอกเองได้อิสระ..."
                        className="w-full bg-zinc-900 border border-cyan-900/50 rounded-lg p-2 text-amber-400 font-bold outline-none focus:border-cyan-500 placeholder:text-zinc-700 placeholder:font-normal"
                      />
                      <datalist id="roles-central-list">
                        <option value="ประธานในพิธี" /><option value="เลขาฯประธานในพิธี" /><option value="ประธานกรรมการจัดงาน" />
                        <option value="กรรมการและเลขาฯโครงการ" /><option value="กรรมการและผู้ช่วยเลขาฯโครงการ" /><option value="หัวหน้าฝ่ายสถานที่" />
                        <option value="หัวหน้าฝ่ายเครื่องเสียง" /><option value="หัวหน้าฝ่ายกำกับเวที" /><option value="วิทยากร" />
                        <option value="แขกรับเชิญvip" /><option value="ผู้ประสานงานวิทยากร" /><option value="พิธีกร" />
                        <option value="ผู้ช่วยพิธีกร" /><option value="หัวหน้าฝ่ายต้อนรับบุคคลสำคัญ" /><option value="หัวหน้าฝ่ายการเงิน" />
                        <option value="หัวหน้าฝ่ายรับลงทะเบียน" /><option value="หัวหน้าฝ่ายจัดสถานที่และที่นั่ง VIP" /><option value="หัวหน้าฝ่ายเครื่องเสียงและสื่อมัลติมิเดีย" />
                        <option value="หัวหน้าฝ่ายพิธีมอบรางวัลเกียรติบัตร" /><option value="หัวหน้าฝ่ายแจกเอกสารและของที่ระลึก" /><option value="หัวหน้าฝ่ายจัดเลี้ยง" />
                        <option value="หัวหน้าฝ่ายบันทึกภาพ" /><option value="หัวหน้าฝ่ายประชาสัมพันธ์" /><option value="หัวหน้าฝ่ายควบคุมแสง" />
                        <option value="หัวหน้าฝ่ายประเมินผล" /><option value="กรรมการ" /><option value="ผู้เข้าประชุม" />
                      </datalist>
                    </div>
                  </div>

                  {/* บล็อกที่ 4: พิกัดภูมิศาสตร์ (งานเก่าปรับปรุงค่าเริ่มต้นโรงเรียน) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">11. พิกัดอำเภอ (guest_district):</span>
                      <input type="text" id="ins_district" defaultValue="ท่าตูม" placeholder="กรอกอำเภอ..." className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-zinc-200 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-purple-400">🗺️ 12. พิกัดจังหวัด (guest_province):</span>
                      <input type="text" id="ins_province" defaultValue="สุรินทร์" placeholder="ระบุจังหวัด..." className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-white font-bold outline-none" />
                    </div>
                  </div>

                  {/* บล็อกที่ 5: กิจกรรมพิเศษขยายโครงสร้าง 2 ชั้น (special_act1 และ special_act2) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="space-y-1">
                      <span className="font-bold text-amber-400">🏅 13. กิจกรรมพิเศษ 1 (special_act1 คิวรับโล่/ใบประกาศ):</span>
                      <input type="text" id="ins_special_act1" placeholder="เช่น รับโล่, รับเกียรติบัตร, มอบของที่ระลึก" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-amber-300 font-bold outline-none placeholder:text-zinc-700" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-amber-500">🎁 14. กิจกรรมพิเศษ 2 (special_act2 คิวแจก/สนับสนุน):</span>
                      <input type="text" id="ins_special_act2" placeholder="เช่น มอบของที่ระลึก, นำเสนองาน" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-amber-400/90 font-bold outline-none placeholder:text-zinc-700" />
                    </div>
                  </div>

                  {/* บล็อกที่ 6: การบริหารจัดการของที่ระลึกประจำตัวบุคคล */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">15. หมายเลขของที่ระลึก (gift_number):</span>
                      <input type="text" id="ins_gift_number" placeholder="กรอกหมายเลขกล่อง หรือรหัสของขวัญ" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-zinc-300 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-zinc-400">16. ลักษณะเด่นของที่ระลึก (gift_style):</span>
                      <input type="text" id="ins_gift_style" placeholder="เช่น ชะลอมผูกผ้าไหม, ถุงผ้าไหมสุรินทร์" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-zinc-300 outline-none" />
                    </div>
                  </div>

                  {/* บล็อกที่ 7: ข้อมูลแนะนำตัวย่อ (bio_note) */}
                  <div className="space-y-1">
                    <span className="font-bold text-zinc-400">17. ข้อมูลแนะนำตัวเพิ่มเติม (bio_note เพื่อดึงไปทำโพยสคริปต์):</span>
                    <textarea id="ins_bio_note" rows={2} placeholder="กรอกประวัติการศึกษา ผลงานเด่น หรือเกียรติประวัติย่อเพื่อให้พิธีกรอ่านช่วงแนะนำตัว..." className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-zinc-300 outline-none placeholder:text-zinc-700 resize-none" />
                  </div>

                  {/* แถวปุ่มกดยืนยันบันทึกผล (งานเก่าหลอมรวมโครงสร้างใหม่สมบูรณ์) */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        const f = (document.getElementById('ins_fullname') as HTMLInputElement)?.value;
                        if (!f) { alert('⚠️ กรุณากรอกชื่อ-นามสกุลจริงด้วยครับพี่'); return; }

                        const { error } = await supabase.from('event_attendees').insert([{
                          event_id: eventId,
                          attendee_type: (document.getElementById('ins_type') as HTMLSelectElement).value,
                          prefix: (document.getElementById('ins_prefix') as HTMLInputElement).value,
                          fullname: f,
                          position: (document.getElementById('ins_position') as HTMLInputElement).value,
                          organization: (document.getElementById('ins_org') as HTMLInputElement).value,
                          guest_district: (document.getElementById('ins_district') as HTMLInputElement).value || 'ท่าตูม',
                          guest_province: (document.getElementById('ins_province') as HTMLInputElement).value || 'สุรินทร์',
                          priority_level: Number((document.getElementById('ins_priority') as HTMLSelectElement).value),
                          role_in_event: (document.getElementById('ins_role') as HTMLInputElement).value || 'ผู้เข้าประชุม',
                          special_act1: (document.getElementById('ins_special_act1') as HTMLInputElement).value || 'none',
                          special_act2: (document.getElementById('ins_special_act2') as HTMLInputElement).value || 'none',
                          status: (document.getElementById('ins_status') as HTMLSelectElement).value,
                          is_present: (document.getElementById('ins_is_present') as HTMLSelectElement).value === 'true',
                          contact_info: (document.getElementById('ins_contact') as HTMLInputElement).value || '',
                          gift_number: (document.getElementById('ins_gift_number') as HTMLInputElement).value || '',
                          gift_style: (document.getElementById('ins_gift_style') as HTMLInputElement).value || '',
                          bio_note: (document.getElementById('ins_bio_note') as HTMLTextAreaElement).value || '',
                          created_at: new Date().toISOString()
                        }]);

                        if (!error) {
                          alert(`🎉 บันทึกฝังรายชื่อคุณ ${f} ลงคลังกลางและกระจายไปฝ่ายเก้าอี้ VIP เรียบร้อยครับพี่!`);
                          fetchEventAttendeesForSeating();
                          // รีเซ็ตฟิลด์หลักหลังกรอกเสร็จ
                          (document.getElementById('ins_fullname') as HTMLInputElement).value = '';
                          (document.getElementById('ins_position') as HTMLInputElement).value = '';
                          (document.getElementById('ins_org') as HTMLInputElement).value = '';
                          (document.getElementById('ins_role') as HTMLInputElement).value = '';
                          (document.getElementById('ins_special_act1') as HTMLInputElement).value = '';
                          (document.getElementById('ins_special_act2') as HTMLInputElement).value = '';
                          (document.getElementById('ins_contact') as HTMLInputElement).value = '';
                          (document.getElementById('ins_gift_number') as HTMLInputElement).value = '';
                          (document.getElementById('ins_gift_style') as HTMLInputElement).value = '';
                          (document.getElementById('ins_bio_note') as HTMLTextAreaElement).value = '';
                        } else {
                          alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
                        }
                      }}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-black rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all hover:scale-[1.01] cursor-pointer text-white"
                    >
                      💾 บันทึกฝังเข้าฐานข้อมูลกลาง
                    </button>
                  </div>
                </div>
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/seating${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-900/40 hover:bg-pink-600 border border-pink-500/50 hover:border-pink-400 rounded-xl text-xs font-bold text-pink-100 transition-all shadow-sm">
                      🗺️ หน้าจอแสดงผังที่นั่งผู้ร่วมงาน (Seating)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                      🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                      🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                      👥 ตรวจสอบรายชื่อ (Attendees)
                    </button>
                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}

            {/* 📐 ฝ่ายที่ 7: ฝ่ายจัดสถานที่ แปลนผังเก้าอี้ Interactive แบบ 3 โซนสากล */}
            {activeMenu === 'venue_tab' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                <div className="border-b border-white/5 pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h2 className="text-sm font-black text-purple-400 flex items-center gap-1.5"><Sliders size={14} /> 7. ศูนย์บริหารผังเก้าอี้ VIP แบบแยกโซนตอนลึก (Dynamic Multi-Zone Seating Engine)</h2>
                    <p className="text-[10px] text-zinc-500">ล็อกตำแหน่งประธาน 3-5 คนแรก แล้วแตะปุ่มคลิกเดียวจัดถมที่นั่งว่างเหลือกองกลางลอจิกอัตโนมัติ</p>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 self-end">
                    <button onClick={handleSmartAutoSeating} className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 font-black rounded-xl shadow-lg text-[10px]">⚡ 1-Click Auto Seat (ถมที่นั่งที่เหลือ)</button>
                    <button onClick={handleSaveSeatingToSupabase} disabled={loading} className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 font-black rounded-xl shadow-lg text-[10px]">💾 บันทึกแผนผังเก้าอี้ลงฐานข้อมูล</button>
                    <button
                      onClick={() => {
                        const assignedList = vipGuests.filter(g => g.seat_id);
                        if (assignedList.length === 0) alert("📊 ปัจจุบันยังไม่มีการจัดแขกลงที่นั่งใด ๆ ครับพี่");
                        else alert(`📊 สรุปรายชื่อจัดผังประจำการ:\n${assignedList.map(g => `🪑 ที่นั่ง ${g.seat_id} (${g.seat_zone}): ${g.prefix || ''}${g.fullname || g.name}`).join('\n')}`);
                      }}
                      className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-xl text-[10px] font-bold"
                    >
                      👁️ ตรวจบัญชีผังรวม
                    </button>
                  </div>
                </div>

                {/* CONFIG GRID */}
                <div className="bg-zinc-950/60 border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1">
                      <div className="font-black text-cyan-400 text-[11px]">⬅️ ปีกข้างซ้ายตอนลึก (Left Wing)</div>
                      <div className="flex gap-1"><span>แถว:</span><input type="number" id="side_left_rows" defaultValue={4} className="w-10 bg-zinc-900 p-0.5 rounded text-center text-cyan-300 font-mono" /><span>ลึก:</span><input type="number" id="side_left_seats" defaultValue={5} className="w-10 bg-zinc-900 p-0.5 rounded text-center text-cyan-300 font-mono" /></div>
                    </div>
                    <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-1">
                      <div className="font-black text-purple-400 text-[11px]">🏛️ โซนกลางหลัก (Center Zone)</div>
                      <div className="flex gap-1"><span>แถว:</span><input type="number" value={venueLayout.totalRows} onChange={e => setVenueLayout({ ...venueLayout, totalRows: Number(e.target.value) })} className="w-10 bg-zinc-900 p-0.5 rounded text-center text-purple-300 font-mono" /><span>ต่อแถว:</span><input type="number" value={venueLayout.seatsPerRow} onChange={e => setVenueLayout({ ...venueLayout, seatsPerRow: Number(e.target.value) })} className="w-10 bg-zinc-900 p-0.5 rounded text-center text-purple-300 font-mono" /></div>
                    </div>
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-1">
                      <div className="font-black text-cyan-400 text-[11px]">➡️ ปีกข้างขวาตอนลึก (Right Wing)</div>
                      <div className="flex gap-1"><span>แถว:</span><input type="number" id="side_right_rows" defaultValue={4} className="w-10 bg-zinc-900 p-0.5 rounded text-center text-cyan-300 font-mono" /><span>ลึก:</span><input type="number" id="side_right_seats" defaultValue={5} className="w-10 bg-zinc-900 p-0.5 rounded text-center text-cyan-300 font-mono" /></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-white/5 font-bold">
                    <div className="flex gap-2"><span>⚪ ว่าง</span><span>🟣 จองล่วงหน้า</span><span>🟢 มานั่งแล้ว</span><span>🟡 ลุกชั่วคราว</span></div>
                    <button onClick={() => setShowVipNames(!showVipNames)} className="text-purple-400 hover:underline">{showVipNames ? '👁️ แสดงชื่อถาวร' : '👁️ ซ่อนชื่อ'}</button>
                  </div>
                </div>

                {/* GRAPHIC GRAPH MATRIC */}
                <div className="p-6 bg-zinc-950/50 rounded-[30px] border border-white/5 overflow-x-auto text-center space-y-4">
                  <div className="w-64 py-1 bg-zinc-800 text-zinc-400 font-black tracking-widest mx-auto rounded-b-xl border border-white/10 text-[10px]">STAGE / FRONT (เวทีกลาง)</div>
                  <div className="flex flex-row justify-center items-start gap-5 min-w-max p-1">

                    {/* LEFT */}
                    <div className="p-2 bg-cyan-950/5 border border-cyan-500/10 rounded-xl">
                      <div className="flex gap-1">
                        {Array.from({ length: Number((document.getElementById('side_left_rows') as HTMLInputElement)?.value || 3) }).map((_, r) => {
                          const char = String.fromCharCode(76 + r);
                          return (
                            <div key={char} className="flex flex-col gap-1 items-center">
                              <span className="text-cyan-500 font-mono text-[9px] font-bold">{char}</span>
                              {Array.from({ length: Number((document.getElementById('side_left_seats') as HTMLInputElement)?.value || 5) }).map((_, s) => renderSmartSeat(`${char}${s + 1}`, 'left'))}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* CENTER */}
                    <div className="p-2 bg-purple-950/5 border border-purple-500/10 rounded-xl">
                      <div className="space-y-1">
                        {Array.from({ length: venueLayout.totalRows }).map((_, r) => {
                          const lbl = String.fromCharCode(65 + r);
                          return (
                            <div key={lbl} className="flex gap-1 items-center justify-center">
                              <span className="w-3 font-mono font-black text-purple-500 text-[10px]">{lbl}</span>
                              {Array.from({ length: venueLayout.seatsPerRow }).map((_, s) => renderSmartSeat(`${lbl}${s + 1}`, 'center'))}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT */}
                    <div className="p-2 bg-cyan-950/5 border border-cyan-500/10 rounded-xl">
                      <div className="flex gap-1">
                        {Array.from({ length: Number((document.getElementById('side_right_rows') as HTMLInputElement)?.value || 3) }).map((_, r) => {
                          const char = String.fromCharCode(90 - r);
                          return (
                            <div key={char} className="flex flex-col gap-1 items-center">
                              <span className="text-cyan-500 font-mono text-[9px] font-bold">{char}</span>
                              {Array.from({ length: Number((document.getElementById('side_right_seats') as HTMLInputElement)?.value || 5) }).map((_, s) => renderSmartSeat(`${char}${s + 1}`, 'right'))}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/seating${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-900/40 hover:bg-pink-600 border border-pink-500/50 hover:border-pink-400 rounded-xl text-xs font-bold text-pink-100 transition-all shadow-sm">
                      🗺️ หน้าจอแสดงผังที่นั่งผู้ร่วมงาน (Seating)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                      🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                      🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                      👥 ตรวจสอบรายชื่อ (Attendees)
                    </button>
                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}

            {/* 🔊 ฝ่ายที่ 8: ฝ่ายเครื่องเสียงและสื่อมัลติมีเดีย (คืนชีพฉบับสมบูรณ์เดิม) */}
            {activeMenu === 'audio_media' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-xs">
                <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                  <h2 className="text-sm font-black text-purple-400 flex items-center gap-1.5"><Volume2 size={14} /> 8. ฝ่ายเครื่องเสียงและมัลติมีเดีย</h2>
                  <span className="text-emerald-400 font-mono font-bold">{systemStability}% stability</span>
                </div>
                <input type="range" min="0" max="100" value={systemStability} onChange={e => setSystemStability(Number(e.target.value))} className="w-full accent-purple-600 cursor-pointer" />
                <div className="space-y-2">
                  {['soundReady', 'micReady', 'openVTR', 'projector1'].map((k, i) => (
                    <div key={k} className="p-2.5 bg-zinc-950/40 border border-white/5 rounded-xl flex justify-between items-center">
                      <span className="text-zinc-300">ตัวชี้วัดความพร้อมระบบเครื่องเสียงและโคมไฟชุดที่ #{i + 1}</span>
                      <select value={audioChecklist[k] || 'pending'} onChange={e => setAudioChecklist({ ...audioChecklist, [k]: e.target.value })} className="bg-zinc-900 border border-white/10 text-purple-400 p-1 rounded font-bold text-[10px]">
                        <option value="pending">⏳ รอตรวจ</option><option value="ready">🟢 เรียบร้อย</option>
                      </select>
                    </div>
                  ))}
                </div>
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                      🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}

            {/* 🏆 9. ฝ่ายบริหารจัดการคิวและผังรับรางวัล (Advanced Queue Management & DB Sync) */}
            {activeMenu === 'cert_distribution' && (
              <div className="relative flex flex-col h-full animate-in fade-in duration-200 text-xs text-left">

                {/* 🌟 1. STICKY HEADER (ส่วนหัวติดหนึบค้างตลอดเวลา) */}
                <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl pb-3 -mt-4 pt-4 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                    {/* 🔹 ซ้ายบน: ป้ายศูนย์ใหญ่ และไฟสถานะ */}
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                          🏆 9. ศูนย์บัญชาการคิวรับรางวัลและผังที่นั่ง
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          ตั้งค่าวาระการอ่าน, จัดการพิธีกรประจำเซ็ต, และวาดผังที่นั่งรับรางวัลอัตโนมัติ
                        </p>
                      </div>

                      {/* 🚥 ไฟสัญญาณตรวจสอบความพร้อม */}
                      <div className="w-fit px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#fbbf24]"></span>
                        <span className="text-amber-400 font-black text-[9px] tracking-wide">🟡 รอตรวจสอบและบันทึกเซ็ตรางวัล</span>
                      </div>
                    </div>

                    {/* 🔹 ขวาบน: แบรนด์ NiiVaa + ปุ่มบันทึก Dark Metallic */}
                    <div className="flex flex-col items-end gap-2.5 shrink-0 self-start">

                      {/* โลโก้ NiiVaa SMARTEVENT (ขนาดกะทัดรัด) */}
                      <div className="flex items-center gap-1.5 font-black text-xl select-none mr-1">
                        <div className="flex tracking-tight">
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Nii</span>
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 ml-0.5">Vaa</span>
                        </div>
                        <div className="bg-black/80 border border-white/20 rounded px-1.5 py-0.5 flex items-center justify-center shadow-lg transform -skew-x-6">
                          <span className="text-[7px] text-zinc-300 tracking-[0.2em] font-bold">SMARTEVENT</span>
                        </div>
                      </div>

                      {/* 💾 ปุ่มบันทึกสไตล์ Dark Metallic เข้มด้าน (ไม่มีเงาวาว) */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!eventId) { alert('⚠️ ไม่พบ ID ของงานสัมมนา กรุณาสร้างงานใหม่ก่อนครับ'); return; }

                            const aGiver = (document.getElementById('v9_award_giver') as HTMLInputElement).value;
                            const aItem = (document.getElementById('v9_award_item') as HTMLInputElement).value;

                            if (!aItem.trim()) { alert('⚠️ กรุณาระบุ "รายการที่มอบ" ก่อนบันทึกครับ'); return; }

                            // 1. บันทึกข้อมูลตั้งค่าเซ็ตรางวัลลงตาราง event_award_sets
                            const { error: setError } = await supabase.from('event_award_sets').insert({
                              event_id: eventId,
                              award_giver: aGiver,
                              set_name: aItem,
                              award_item: aItem,
                              mc_1: (document.getElementById('v9_mc1') as HTMLInputElement).value,
                              mc_2: (document.getElementById('v9_mc2') as HTMLInputElement).value,
                              event_date: (document.getElementById('v9_date') as HTMLInputElement).value || null,
                              start_time: (document.getElementById('v9_time') as HTMLInputElement).value || null,
                              venue_room: (document.getElementById('v9_room') as HTMLInputElement).value,
                              responsible_person: (document.getElementById('v9_resp') as HTMLInputElement).value,
                              seating_rows: parseInt((document.getElementById('v9_rows') as HTMLInputElement).value) || 5,
                              seating_cols: parseInt((document.getElementById('v9_cols') as HTMLInputElement).value) || 10
                            });

                            if (setError) throw setError;

                            // 2. ยิงไฟสถานะให้ CEO Dashboard
                            const safeEvent = typeof projectInfo !== 'undefined' ? projectInfo : {};
                            const currentStatus = safeEvent?.departments_status || {};
                            await supabase.from('events').update({ departments_status: { ...currentStatus, dept_9: 'ready' } }).eq('id', eventId);

                            alert('🎉 บันทึกเซ็ตรางวัลเรียบร้อย และอัปเดตไฟสถานะ 🟢 ขึ้น SMARTEVENT Dashboard สำเร็จแล้วครับ!');
                          } catch (err: any) { alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + err.message); }
                        }}
                        className="w-full px-5 py-2.5 bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-200 font-bold rounded-lg text-[10px] sm:text-xs border border-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all hover:bg-zinc-800 hover:scale-[1.02] cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        💾 บันทึกข้อมูลและอัปเดต Dashboard
                      </button>
                    </div>
                  </div>

                  {/* 🗂️ แถบเมนูเซ็ตรางวัล */}
                  <div className="flex items-center gap-2 overflow-x-auto mt-4 pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
                    <button className="shrink-0 px-4 py-2 bg-purple-600 text-white font-black rounded-xl border border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      รายการที่ 1: โล่ผู้บริหารดีเด่น
                    </button>
                    <button className="shrink-0 px-4 py-2 bg-zinc-900 text-zinc-400 font-bold rounded-xl border border-white/5 hover:bg-zinc-800 transition">
                      รายการที่ 2: เข็มเชิดชูเกียรติ
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button onClick={() => alert('เตรียมสร้างเซ็ตรางวัลใหม่')} className="shrink-0 px-4 py-2 bg-zinc-950 text-cyan-500 font-black rounded-xl border border-cyan-900/30">
                      ➕ เพิ่มเซ็ตมอบรางวัล
                    </button>
                  </div>
                </div>

                {/* 📜 2. SCROLLABLE CONTENT (เนื้อหามุดลอดใต้ Header) */}
                <div className="space-y-5 mt-5 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-zinc-700 pr-1">
                  {(() => {
                    const safeRows = typeof certLayout !== 'undefined' && certLayout.rows ? certLayout.rows : 10;
                    const safeCols = typeof certLayout !== 'undefined' && certLayout.seatsPerRow ? certLayout.seatsPerRow : 15;

                    const mockRecipients = Array.from({ length: 42 }).map((_, i) => ({
                      id: i, seq: i + 1, name: `นายสมชาย ใจดีลำดับที่ ${i + 1}`,
                      school: 'โรงเรียนสุรวิทยาคาร', province: 'สุรินทร์',
                      line_status: i === 15 ? 'absent' : i % 8 === 0 ? 'coming' : 'ready',
                      mc_status: i < 5 ? 'read' : 'pending',
                      seat_row: Math.floor(i / safeCols), seat_col: i % safeCols
                    }));

                    const totalCount = mockRecipients.length;
                    const readCount = mockRecipients.filter(r => r.mc_status === 'read').length;
                    const progressPercent = (readCount / totalCount) * 100;

                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* =========================================
                            แผงซ้าย: ฟอร์มตั้งค่าเซ็ต และ ตารางรายชื่อ
                            ========================================= */}
                        <div className="xl:col-span-2 space-y-4">

                          {/* 📝 1. ฟอร์มตั้งค่ารายการมอบ */}
                          <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-4">
                            <h3 className="font-black text-purple-300 text-[11px] border-b border-purple-500/20 pb-2">1. ตั้งค่าข้อมูลรายการ / เซ็ตการมอบ</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">👤 ชื่อผู้มอบรางวัล (Award Giver)</label>
                                <input type="text" id="v9_award_giver" defaultValue="ท่านผู้ว่าราชการจังหวัดสุรินทร์" className="w-full bg-zinc-950 border border-purple-500/30 rounded-lg p-2 text-white font-black outline-none focus:border-purple-500" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">📑 รายการที่มอบ (Award Item) *</label>
                                <input type="text" id="v9_award_item" defaultValue="โล่เกียรติยศผู้บริหารดีเด่น ประจำปี 2569" className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-zinc-200 outline-none focus:border-purple-500" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl">
                              <div className="space-y-1">
                                <label className="text-indigo-400 font-bold text-[10px]">🎙️ พิธีกรอ่านรายชื่อ คนที่ 1</label>
                                <input type="text" id="v9_mc1" defaultValue="นายอรรถพล เสียงหล่อ" className="w-full bg-zinc-950 border border-indigo-500/30 rounded-lg p-2 outline-none text-white font-bold" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-indigo-400 font-bold text-[10px]">🎙️ พิธีกรอ่านรายชื่อ คนที่ 2 (ถ้ามี)</label>
                                <input type="text" id="v9_mc2" defaultValue="นางสาววิไล ไพเราะ" className="w-full bg-zinc-950 border border-indigo-500/30 rounded-lg p-2 outline-none text-white font-bold" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">วันที่</label>
                                <input type="date" id="v9_date" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-zinc-300 text-[9px] outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">เวลาเริ่ม</label>
                                <input type="time" id="v9_time" defaultValue="10:30" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-zinc-300 text-[9px] outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">สถานที่/ห้อง</label>
                                <input type="text" id="v9_room" defaultValue="หอประชุมใหญ่" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-zinc-300 outline-none" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">ผู้รับผิดชอบคิว</label>
                                <input type="text" id="v9_resp" defaultValue="นางสมศรี (พิธีการ)" className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-amber-400 outline-none" />
                              </div>
                            </div>

                            <div className="p-3 bg-black/50 border border-white/5 rounded-xl flex items-center justify-between">
                              <span className="font-black text-emerald-400">🪑 ขนาดผังเก้าอี้รอคิว (Dynamic Grid):</span>
                              <div className="flex items-center gap-2">
                                <label className="text-[9px] text-zinc-400 font-bold">แถว</label>
                                <input type="number" id="v9_rows" defaultValue={safeRows} className="w-12 bg-zinc-900 border border-white/10 rounded p-1.5 text-center text-white outline-none" />
                                <span className="text-zinc-600">x</span>
                                <label className="text-[9px] text-zinc-400 font-bold">ที่นั่ง/แถว</label>
                                <input type="number" id="v9_cols" defaultValue={safeCols} className="w-12 bg-zinc-900 border border-white/10 rounded p-1.5 text-center text-white outline-none" />
                              </div>
                            </div>
                          </div>

                          {/* 📊 แถบความก้าวหน้า (Progress Bar) */}
                          <div className="space-y-1.5 px-1">
                            <div className="flex justify-between items-end text-[10px] font-black">
                              <span className="text-emerald-400">📊 แถบความก้าวหน้า (วัดจากรายชื่อที่อ่านแล้ว)</span>
                              <span className="text-white bg-emerald-600 px-2 rounded-full">{readCount} / {totalCount} คน ({progressPercent.toFixed(0)}%)</span>
                            </div>
                            <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                              <div className="h-full bg-gradient-to-r from-emerald-600 to-green-400 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                          </div>

                          {/* 📋 ตารางรายชื่อ */}
                          <div className="bg-zinc-950/80 border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-3 bg-black/50 border-b border-white/10 flex justify-between items-center">
                              <span className="font-black text-white">📋 บัญชีรายชื่อผู้เข้ารับรางวัล (สไลด์เลื่อนดูข้อมูลได้)</span>
                              <button className="px-3 py-1 bg-blue-600 text-[9px] font-black rounded-lg hover:bg-blue-500 transition">📥 นำเข้า Excel</button>
                            </div>

                            <div className="overflow-auto max-h-[400px] scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                              <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="sticky top-0 z-20 bg-zinc-900 shadow-md">
                                  <tr className="text-zinc-500 text-[9px] uppercase tracking-wider">
                                    <th className="p-3 text-center border-b border-white/10">ไฟสถานะ</th>
                                    <th className="p-3 text-center border-b border-white/10">ที่</th>
                                    <th className="p-3 border-b border-white/10">รายชื่อ - นามสกุล</th>
                                    <th className="p-3 border-b border-white/10">โรงเรียน / หน่วยงาน</th>
                                    <th className="p-3 border-b border-white/10">หมายเหตุ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {mockRecipients.map((r, index) => {
                                    const isFifthRow = index % 5 === 4;
                                    const isRead = r.mc_status === 'read';

                                    return (
                                      <tr key={r.id} className={`transition-all duration-200 ${isRead ? 'opacity-30 bg-black/40' : 'hover:bg-white/5'} ${isFifthRow ? 'border-b-[3px] border-purple-500/60' : 'border-b border-white/5'}`}>
                                        <td className="p-3 text-center">
                                          <div className={`w-3 h-3 rounded-full mx-auto shadow-sm ${r.line_status === 'ready' ? 'bg-emerald-500 animate-pulse' : r.line_status === 'coming' ? 'bg-amber-500' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                                        </td>
                                        <td className="p-3 text-center font-mono font-black text-zinc-400">{r.seq}</td>
                                        <td className={`p-3 font-black ${isRead ? 'line-through text-zinc-500' : 'text-white text-[11px]'}`}>{r.name}</td>
                                        <td className="p-3 text-zinc-400 font-bold">{r.school}</td>
                                        <td className="p-3">
                                          <div className="flex gap-1.5">
                                            <button className={`px-2 py-0.5 rounded text-[8px] font-black ${isRead ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}`}>อ่านแล้ว</button>
                                            <button className="px-2 py-0.5 bg-amber-600/10 text-amber-500 border border-amber-500/20 rounded text-[8px] font-black">ข้ามก่อน</button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* =========================================
                            แผงขวา: กราฟิกผังที่นั่งอัจฉริยะ (Interactive Map)
                            ========================================= */}
                        <div className="space-y-4">

                          <div className="p-4 bg-zinc-950 border border-white/5 rounded-2xl shadow-2xl space-y-4">
                            <h3 className="font-black text-purple-400 w-full text-center border-b border-white/5 pb-2">🗺️ กราฟิกผังที่นั่งสแตนบาย</h3>

                            <div className="grid grid-cols-2 gap-2">
                              <button onClick={() => alert('จัดรายชื่อลงเก้าอี้สำเร็จ!')} className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] transition-all shadow-lg flex items-center justify-center gap-1">⚡ จัดรายชื่อลงที่นั่งอัตโนมัติ</button>
                              <button onClick={() => { document.querySelectorAll('.table-label-name').forEach(el => el.classList.toggle('hidden')); }} className="py-2 bg-zinc-900 border border-white/10 text-zinc-400 rounded-xl font-black text-[9px] hover:text-white transition-all">👁️ แสดงชื่อ / ไม่แสดงชื่อ</button>
                            </div>

                            {/* เวที */}
                            <div className="w-[85%] h-6 bg-zinc-800 rounded-t-xl border-t-2 border-purple-500 flex items-center justify-center mx-auto shadow-[0_-5px_15px_rgba(168,85,247,0.2)]">
                              <span className="text-[7px] font-black text-zinc-500 tracking-widest">STAGE AREA</span>
                            </div>

                            {/* 🪑 Seating Grid */}
                            <div className="w-full overflow-auto max-h-[450px] scrollbar-thin scrollbar-thumb-zinc-800 px-1 py-4">
                              <div className="flex flex-col gap-1.5 items-center w-fit mx-auto">
                                {Array.from({ length: safeRows }).map((_, r) => (
                                  <div key={r} className="flex gap-1.5 justify-center">
                                    {Array.from({ length: safeCols }).map((_, s) => {
                                      const seatNumber = (r * safeCols) + (s + 1);
                                      const occupant = mockRecipients.find(rec => rec.seat_row === r && rec.seat_col === s);

                                      let seatClass = "bg-purple-900/10 border-purple-500/20 text-purple-400/50";
                                      if (occupant) {
                                        if (occupant.line_status === 'ready') seatClass = "bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.2)]";
                                        else if (occupant.line_status === 'coming') seatClass = "bg-amber-950 border-amber-500 text-amber-400";
                                        else if (occupant.line_status === 'absent') seatClass = "bg-red-900 border-red-500 text-white shadow-[0_0_8px_#ef4444] animate-pulse";
                                      }

                                      return (
                                        <div
                                          key={s}
                                          onClick={() => { if (occupant) alert(`🔍 ตรวจสอบคิวที่: ${occupant.seq}\nชื่อ: ${occupant.name}\nสถานะ: ${occupant.line_status === 'absent' ? '❌ ขาด/ไม่เข้ารับ' : '✅ ปกติ'}`); }}
                                          className={`w-7 h-7 flex flex-col items-center justify-center rounded-lg border text-[8px] font-mono font-black cursor-pointer transition-all hover:scale-125 hover:z-30 ${seatClass}`}
                                        >
                                          <span className="leading-none">{seatNumber}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* สรุปสถานะด้านล่าง */}
                          <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl">
                            <div className="flex justify-between items-center font-black text-zinc-500 text-[9px] uppercase">
                              <span>🟢 พร้อม: {mockRecipients.filter(x => x.line_status === 'ready').length}</span>
                              <span>🟡 กำลังมา: {mockRecipients.filter(x => x.line_status === 'coming').length}</span>
                              <span className="text-red-400">🔴 ขาด/ข้าม: {mockRecipients.filter(x => x.line_status === 'absent').length}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                      🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                      🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                      👥 ตรวจสอบรายชื่อ (Attendees)
                    </button>
                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}

            {/* 📦 ฝ่ายที่ 10: ฝ่ายแจกเอกสาร/ของที่ระลึก */}
            {activeMenu === 'gift_tab' && (
              <div className="space-y-4 animate-in fade-in duration-100 text-xs">
                <h2 className="text-sm font-black text-purple-400 border-b border-white/5 pb-2">📦 10. ฝ่ายแจกเอกสารและของที่ระลึกโครงการ</h2>
                {/* 🚧 แบนเนอร์แจ้งสถานะการอัปเกรดระบบ */}
                <div className="flex items-center gap-3 p-3 mb-4 bg-amber-950/20 border border-amber-500/30 rounded-xl animate-pulse">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest">สถานะ: อยู่ระหว่างปรับปรุงระบบ</h3>
                    <p className="text-[9px] text-zinc-500 font-bold">ระบบกำลังเชื่อมต่อฐานข้อมูลใหม่ กรุณารอสักครู่...</p>
                  </div>
                </div>

                <input type="text" placeholder="สถานที่จุดตั้งพูลของแจก" value={giftMeta.room} onChange={e => setGiftMeta({ ...giftMeta, room: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded p-2" />
                <div className="p-3 bg-zinc-950/40 rounded-xl flex justify-between items-center border border-white/5">
                  <span>จัดเตรียมของที่ระลึกตามจำนวนยอดรับลงทะเบียน</span>
                  <select value={giftChecklist.prepareGift || 'pending'} onChange={e => setGiftChecklist({ ...giftChecklist, prepareGift: e.target.value })} className="bg-zinc-900 text-purple-400 font-bold p-1 rounded text-[10px]"><option value="pending">⏳ เทา</option><option value="ready">🟢 เขียว</option></select>
                </div>
              </div>
            )}

            {/* 🍽️ ฝ่ายที่ 11: ฝ่ายบริหารจัดการระบบจัดเลี้ยงอาหารและเครื่องดื่ม (Excel Matrix Table Map) */}
            {activeMenu === 'catering_tab' && (
              <div className="relative flex flex-col h-full animate-in fade-in duration-200 text-xs text-left">

                {/* 🌟 1. STICKY HEADER (ส่วนหัวติดหนึบค้างตลอดเวลา + แบรนด์ NIIVAA) */}
                <div className="sticky top-0 z-40 bg-[#020617]/95 backdrop-blur-xl pb-3 -mt-4 pt-4 border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">

                    {/* 🔹 ซ้ายบน: ป้ายศูนย์ใหญ่ และไฟสถานะ */}
                    <div className="flex flex-col gap-2.5">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-1.5 uppercase tracking-wide">
                          🍽️ 11. ศูนย์บัญชาการระบบจัดเลี้ยงและผังโต๊ะพิกัดแมทริกซ์
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          บริหารจำนวนโต๊ะด้วยระบบพิกัดคอลัมน์ (A, B, C) และแถว (1, 2, 3) สไตล์ Excel เพื่อความแม่นยำสูงสุด
                        </p>
                      </div>

                      {/* 🚥 ไฟสัญญาณตรวจสอบความพร้อม */}
                      <div className="w-fit px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-lg flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse shadow-[0_0_8px_#fbbf24]"></span>
                        <span className="text-amber-400 font-black text-[9px] tracking-wide">🟡 รอตรวจสอบและบันทึกข้อมูลจัดเลี้ยง</span>
                      </div>
                    </div>

                    {/* 🔹 ขวาบน: แบรนด์ NiiVaa + ปุ่มบันทึก Dark Metallic */}
                    <div className="flex flex-col items-end gap-2.5 shrink-0 self-start">

                      {/* โลโก้ NiiVaa SMARTEVENT */}
                      <div className="flex items-center gap-1.5 font-black text-xl select-none mr-1">
                        <div className="flex tracking-tight">
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">Nii</span>
                          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 ml-0.5">Vaa</span>
                        </div>
                        <div className="bg-black/80 border border-white/20 rounded px-1.5 py-0.5 flex items-center justify-center shadow-lg transform -skew-x-6">
                          <span className="text-[7px] text-zinc-300 tracking-[0.2em] font-bold">SMARTEVENT</span>
                        </div>
                      </div>

                      {/* 💾 ปุ่มบันทึกสไตล์ Dark Metallic เข้มด้าน */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!eventId) { alert('⚠️ ไม่พบ ID ของงานสัมมนา กรุณาสร้างงานใหม่ก่อนครับ'); return; }

                            const mDate = (document.getElementById('v11_meal_date') as HTMLInputElement).value;
                            const mType = (document.getElementById('v11_meal_type') as HTMLInputElement).value;

                            if (!mType.trim()) { alert('⚠️ กรุณาระบุ "มื้ออาหาร" ก่อนบันทึกครับ'); return; }

                            const { error: mealErr } = await supabase.from('event_meals').insert({
                              event_id: eventId,
                              meal_name: mType,
                              meal_date: mDate || null,
                              coordinator: (document.getElementById('v11_coordinator') as HTMLInputElement).value,
                              liaison: (document.getElementById('v11_liaison') as HTMLInputElement).value,
                              grid_rows: roomSetup.rows,
                              grid_cols: roomSetup.cols,
                              total_tables: roomSetup.tables,
                              seats_per_table: roomSetup.seats
                            });
                            if (mealErr) throw mealErr;

                            const safeEvent = typeof projectInfo !== 'undefined' ? projectInfo : {};
                            const currentStatus = safeEvent?.departments_status || {};
                            await supabase.from('events').update({ departments_status: { ...currentStatus, dept_11: 'ready' } }).eq('id', eventId);

                            alert('🎉 บันทึกข้อมูลมื้อจัดเลี้ยงพิกัดแมทริกซ์เรียบร้อย และส่งไฟสถานะ 🟢 ขึ้น Dashboard สำเร็จแล้วครับ!');
                          } catch (err: any) { alert('❌ เกิดข้อผิดพลาดในการบันทึก: ' + err.message); }
                        }}
                        className="w-full px-5 py-2.5 bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-200 font-bold rounded-lg text-[10px] sm:text-xs border border-zinc-600 shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all hover:bg-zinc-800 hover:scale-[1.02] cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        💾 บันทึกข้อมูลและอัปเดต Dashboard
                      </button>
                    </div>
                  </div>

                  {/* 🗂️ แถบเมนูจำลอง เลือกมื้ออาหาร (Tabs) */}
                  <div className="flex items-center gap-2 overflow-x-auto mt-4 pb-1 scrollbar-thin scrollbar-thumb-zinc-700">
                    <button className="shrink-0 px-4 py-2 bg-amber-600 text-white font-black rounded-xl border border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                      มื้อที่ 1: งานเลี้ยงต้อนรับ (เย็น 29 พ.ค.)
                    </button>
                    <button className="shrink-0 px-4 py-2 bg-zinc-900 text-zinc-400 font-bold rounded-xl border border-white/5 hover:bg-zinc-800 transition">
                      มื้อที่ 2: อาหารกลางวัน (30 พ.ค.)
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1"></div>
                    <button onClick={() => alert('สร้างข้อมูลมื้ออาหารใหม่')} className="shrink-0 px-4 py-2 bg-zinc-950 text-orange-500 font-black rounded-xl border border-orange-900/30 cursor-pointer">
                      ➕ เพิ่มมื้ออาหารใหม่
                    </button>
                  </div>
                </div>

                {/* 📜 2. SCROLLABLE CONTENT */}
                <div className="space-y-5 mt-5 overflow-y-auto pb-10 scrollbar-thin scrollbar-thumb-zinc-700 pr-1">
                  {(() => {
                    const currentMeal = {
                      date: '2026-05-29', mealType: 'อาหารเย็น (Gala Dinner)',
                      coordinator: 'นายสมพร จัดให้ (ฝ่ายสถานที่)', liaison: 'คุณเจน (เซลส์โรงแรมทองธารินทร์)'
                    };

                    const activeCapacity = roomSetup.tables * roomSetup.seats;

                    // 🧮 ฟังก์ชันแปลงดัชนีคอลัมน์ตัวเลขเป็นตัวอักษร Excel (0 -> A, 1 -> B, 25 -> Z)
                    const getExcelColLetter = (colIdx: number) => {
                      let letter = "";
                      let temp = colIdx;
                      while (temp >= 0) {
                        letter = String.fromCharCode((temp % 26) + 65) + letter;
                        temp = Math.floor(temp / 26) - 1;
                      }
                      return letter;
                    };

                    // สร้างพิกัดรายชื่อโต๊ะแบบ Dynamic อิงตามพิกัดโครงสร้าง Row/Col แบบ Excel
                    const tableAssignments = Array.from({ length: roomSetup.tables }).map((_, i) => {
                      const r = Math.floor(i / roomSetup.cols);
                      const s = i % roomSetup.cols;

                      const colLetter = getExcelColLetter(s);
                      const rowNumber = r + 1;
                      const tableCoordinateCode = `${colLetter}${rowNumber}`; // ผลลัพธ์เป็น A1, B1, C3...

                      let groupName = "";
                      let status = "empty";

                      if (i <= 9) { groupName = "คณะผู้บริหาร สพม. (VIP)"; status = "confirmed"; }
                      else if (i <= 24) { groupName = `โรงเรียนเครือข่ายกลุ่มพิกัดเซ็ตที่ ${r + 1}`; status = "reserved"; }
                      else if (i === 44) { groupName = "ทีมงานจัดแสงสีเสียงสตาฟ"; status = "confirmed"; }

                      return { tableNo: i + 1, tableLabel: tableCoordinateCode, groupName, status, row: r, col: s };
                    });

                    return (
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                        {/* =========================================
                            แผงซ้าย: ฟอร์มตั้งค่า และ ตารางควบคุมห้อง
                            ========================================= */}
                        <div className="xl:col-span-6 space-y-4">

                          <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3">
                            <h3 className="font-black text-orange-400 text-[11px] border-b border-orange-500/20 pb-2">1. ข้อมูลผู้รับผิดชอบและการประสานงาน</h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">วันที่จัดเลี้ยง</label>
                                <input type="date" id="v11_meal_date" defaultValue={currentMeal.date} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-zinc-300 outline-none focus:border-amber-500" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-zinc-500 font-bold text-[10px]">มื้ออาหาร *</label>
                                <input type="text" id="v11_meal_type" defaultValue={currentMeal.mealType} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-white font-bold outline-none focus:border-amber-500" />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <label className="text-zinc-500 font-bold text-[10px]">ผู้รับผิดชอบฝ่ายจัดงาน</label>
                                <input type="text" id="v11_coordinator" defaultValue={currentMeal.coordinator} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-amber-400 outline-none focus:border-amber-500" />
                              </div>
                              <div className="space-y-1 col-span-2">
                                <label className="text-zinc-500 font-bold text-[10px]">เจ้าหน้าที่ประสานงานโรงแรม (Liaison)</label>
                                <input type="text" id="v11_liaison" defaultValue={currentMeal.liaison} className="w-full bg-zinc-950 border border-white/10 rounded-lg p-2 text-cyan-400 font-bold outline-none focus:border-cyan-500" />
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3 flex flex-col h-[calc(100%-250px)] min-h-[300px]">
                            <div className="flex justify-between items-end border-b border-white/10 pb-2">
                              <h3 className="font-black text-amber-400 text-[11px]">2. การจัดสรรห้องอาหารและการตั้งค่าผัง (Real-time Dynamic)</h3>
                              <button className="text-[9px] bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white px-2 py-1 rounded transition cursor-pointer">➕ เพิ่มห้อง</button>
                            </div>

                            <div className="space-y-2 overflow-auto scrollbar-thin scrollbar-thumb-zinc-700 pr-1 flex-1">
                              <div className="p-2.5 rounded-xl border bg-amber-950/30 border-amber-500/50 shadow-md transition-all">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="font-black text-[11px] text-amber-400">1. ห้องเพชรชมพู (ปรับค่าสเกลผัง)</span>
                                </div>

                                <div className="flex flex-col gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                                  {/* บรรทัดบน: คำนวณความจุ */}
                                  <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400 font-bold items-center">
                                    <label className="flex items-center gap-1.5">
                                      โต๊ะทั้งหมด:
                                      <input
                                        type="number"
                                        value={roomSetup.tables}
                                        onChange={(e) => setRoomSetup({ ...roomSetup, tables: parseInt(e.target.value) || 0 })}
                                        className="w-12 bg-zinc-900 border border-white/10 rounded p-1 text-center text-white outline-none focus:border-amber-500"
                                      />
                                    </label>
                                    <span className="text-zinc-600">×</span>
                                    <label className="flex items-center gap-1.5 text-cyan-500">
                                      จัดโต๊ะละ:
                                      <input
                                        type="number"
                                        value={roomSetup.seats}
                                        onChange={(e) => setRoomSetup({ ...roomSetup, seats: parseInt(e.target.value) || 0 })}
                                        className="w-10 bg-cyan-950/50 border border-cyan-500/30 rounded p-1 text-center text-cyan-400 outline-none focus:border-cyan-400"
                                      /> คน
                                    </label>
                                    <span className="text-zinc-600">=</span>
                                    <label className="flex items-center gap-1.5 text-emerald-400 ml-auto">
                                      ความจุรวม:
                                      <input type="number" value={activeCapacity} readOnly className="w-14 bg-zinc-950 border border-emerald-500/20 rounded p-1 text-center font-black text-emerald-400 shadow-inner cursor-not-allowed" /> คน
                                    </label>
                                  </div>

                                  {/* บรรทัดล่าง: ทรงผังห้องสไตล์ Excel Grid */}
                                  <div className="flex flex-wrap gap-2 text-[9px] text-orange-400 font-bold items-center border-t border-white/5 pt-2">
                                    <span>📐 กำหนดขอบเขตคอลัมน์ & แถว:</span>
                                    <label className="flex items-center gap-1">
                                      จำนวนคอลัมน์ (หน้ากระดาน X)
                                      <input
                                        type="number"
                                        value={roomSetup.cols}
                                        onChange={(e) => setRoomSetup({ ...roomSetup, cols: parseInt(e.target.value) || 0 })}
                                        className="w-10 bg-orange-950/30 border border-orange-500/30 rounded p-1 text-center text-orange-300 outline-none focus:border-orange-400"
                                      />
                                    </label>
                                    <span className="text-zinc-600">×</span>
                                    <label className="flex items-center gap-1">
                                      จำนวนแถว (ตอนลึก Y)
                                      <input
                                        type="number"
                                        value={roomSetup.rows}
                                        onChange={(e) => setRoomSetup({ ...roomSetup, rows: parseInt(e.target.value) || 0 })}
                                        className="w-10 bg-orange-950/30 border border-orange-500/30 rounded p-1 text-center text-orange-300 outline-none focus:border-orange-400"
                                      />
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/10 bg-zinc-950/80 p-3 rounded-xl mt-auto shadow-inner">
                              <div className="flex justify-between items-center font-black text-xs">
                                <span className="text-zinc-400">📊 รวม: 1 ห้อง</span>
                                <span className="text-amber-400"><span className="text-white">{roomSetup.tables}</span> โต๊ะ</span>
                                <span className="text-emerald-400">รองรับ <span className="text-white">{activeCapacity.toLocaleString()}</span> คน</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* =========================================
                            แผงขวา: รายชื่อโต๊ะ & ผังโต๊ะ พิกัด Excel (Col 6-12)
                            ========================================= */}
                        <div className="xl:col-span-6 space-y-4">
                          <div className="p-4 bg-zinc-950 border border-white/5 rounded-2xl shadow-2xl flex flex-col h-full">

                            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 border-b border-white/10 pb-3 mb-4">
                              <div>
                                <h3 className="font-black text-amber-500 text-sm">🗺️ ผังโต๊ะระบุพิกัดแมทริกซ์ Excel</h3>
                                <p className="text-[10px] text-zinc-500 mt-1">
                                  พิกัดกว้าง (คอลัมน์ A ถึง {getExcelColLetter(roomSetup.cols - 1)}) × ลึก (แถว 1 ถึง {roomSetup.rows})
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { document.querySelectorAll('.table-label-name').forEach(el => el.classList.toggle('hidden')); }} className="px-3 py-1.5 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white rounded-lg font-black text-[9px] transition-all cursor-pointer shadow-md">
                                  👁️ สลับแสดงรหัสพิกัด/ชื่อกลุ่ม
                                </button>
                              </div>
                            </div>

                            {/* 🪑 โซนกราฟิกผังที่นั่ง (Auto-Dynamic 100% พิกัด Excel) */}
                            <div className="w-full overflow-auto max-h-[450px] scrollbar-thin scrollbar-thumb-zinc-700 bg-black/30 rounded-xl p-4 border border-white/5 relative">
                              <div className="w-[60%] h-6 bg-zinc-800 rounded-b-xl border-b-2 border-amber-500 flex items-center justify-center mx-auto mb-8 shadow-[0_5px_15px_rgba(245,158,11,0.15)]">
                                <span className="text-[8px] font-black text-zinc-400 tracking-widest uppercase">เวทีหลัก (Stage Area)</span>
                              </div>

                              <div className="flex flex-col gap-5 items-center w-fit mx-auto pb-6">
                                {Array.from({ length: roomSetup.rows }).map((_, r) => (
                                  <div key={r} className="flex gap-5 justify-center">
                                    {Array.from({ length: roomSetup.cols }).map((_, s) => {
                                      const tableIdx = (r * roomSetup.cols) + s;
                                      // ดักจับกรณีดัชนีเกินจำนวนโต๊ะรวม
                                      if (tableIdx >= roomSetup.tables) return <div key={s} className="w-10 h-10 sm:w-12 sm:h-12 border border-dashed border-white/5 rounded-full opacity-10 flex items-center justify-center text-[7px] text-zinc-700 font-mono">{getExcelColLetter(s)}{r + 1}</div>;

                                      const tableInfo = tableAssignments[tableIdx];
                                      let tableColor = "bg-zinc-900 border-zinc-700 text-zinc-400";
                                      if (tableInfo.status === 'confirmed') tableColor = "bg-emerald-950 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                                      else if (tableInfo.status === 'reserved') tableColor = "bg-amber-950 border-amber-500 text-amber-400";

                                      return (
                                        <div
                                          key={s}
                                          onClick={() => alert(`📌 โต๊ะพิกัดตำแหน่ง: ${tableInfo.tableLabel}\nลำดับรันคิว: โต๊ะที่ ${tableInfo.tableNo}\nกลุ่มเป้าหมาย: ${tableInfo.groupName || 'โต๊ะว่าง/สำรอง'}\nสถานะไฟ: ${tableInfo.status === 'confirmed' ? '🟢 ยืนยันรายชื่อแล้ว' : tableInfo.status === 'reserved' ? '🟡 ล็อกโซนกลุ่ม' : '⚪ โต๊ะว่าง'}`)}
                                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[3px] flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-115 hover:z-30 relative group ${tableColor}`}
                                        >
                                          {/* 💡 แสดงตำแหน่งพิกัด Excel เช่น A1, B1 แทนตัวเลขดิบ */}
                                          <span className="font-black text-[9px] sm:text-xs font-mono tracking-tighter">{tableInfo.tableLabel}</span>

                                          {tableInfo.groupName && (
                                            <div className="table-label-name hidden absolute -bottom-4 w-[250%] text-center bg-black/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10 truncate pointer-events-none z-10 shadow-lg">
                                              {tableInfo.groupName}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* 📋 รายชื่อระบุโต๊ะเปลี่ยนเป็นระบบพิกัด Excel */}
                            <div className="mt-4 pt-4 border-t border-white/10 flex-1 flex flex-col">
                              <h4 className="font-black text-white text-[10px] mb-2 flex justify-between items-center">
                                <span>📋 บัญชีแมทริกซ์กำหนดกลุ่มบุคคลประจำโต๊ะ</span>
                                <span className="text-zinc-500 font-normal">🟢 แน่นอน: {tableAssignments.filter(t => t.status === 'confirmed').length} | 🟡 ล็อกโซน: {tableAssignments.filter(t => t.status === 'reserved').length}</span>
                              </h4>

                              <div className="overflow-auto max-h-[150px] scrollbar-thin scrollbar-thumb-zinc-700">
                                <table className="w-full text-left">
                                  <thead className="sticky top-0 bg-zinc-950 z-10 shadow-md">
                                    <tr className="text-zinc-500 text-[9px] uppercase">
                                      <th className="p-2 border-b border-white/5 w-20 text-center">พิกัดโต๊ะ</th>
                                      <th className="p-2 border-b border-white/5">ชื่อกลุ่มบุคคล / หน่วยงานสัมมนา / คณะ VIP</th>
                                      <th className="p-2 border-b border-white/5 w-24 text-center">สถานะ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tableAssignments.map((t, idx) => (
                                      <tr key={idx} className="hover:bg-white/5 border-b border-white/5 transition-colors">
                                        {/* 💡 แสดงรหัสพิกัดในตารางรายชื่อด้วย เพื่อให้เปิดคู่กันดูง่าย */}
                                        <td className="p-2 text-center font-mono font-black text-amber-500 bg-amber-500/5 rounded text-[10px]">{t.tableLabel}</td>
                                        <td className="p-2">
                                          <input type="text" defaultValue={t.groupName} placeholder={`${t.tableLabel} - ระบุกลุ่มผู้จัดนั่ง...`} className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-500 outline-none text-[10px] text-white font-bold pl-1" />
                                        </td>
                                        <td className="p-2 text-center">
                                          <select defaultValue={t.status} className={`bg-zinc-900 border border-white/10 rounded p-1 text-[9px] font-black outline-none cursor-pointer ${t.status === 'confirmed' ? 'text-emerald-400' : t.status === 'reserved' ? 'text-amber-400' : 'text-zinc-500'}`}>
                                            <option value="empty">⚪ ว่าง</option>
                                            <option value="reserved">🟡 จัดโซน</option>
                                            <option value="confirmed">🟢 ระบุชัด</option>
                                          </select>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* 📷 ฝ่ายที่ 12: ฝ่ายบันทึกภาพหน้างาน */}
            {activeMenu === 'photo_tab' && (
              <div className="space-y-4 animate-in text-xs">
                <h2 className="text-sm font-black text-purple-400 border-b border-white/5 pb-2">📷 12. ฝ่ายบันทึกภาพนิ่งและภาพเคลื่อนไหวประจำงาน</h2>
                <div className="p-3 bg-zinc-950/40 rounded-xl flex justify-between border border-white/5">
                  <span>จัดเตรียมอุปกรณ์กล้อง เลนส์ และการสำรองข้อมูลภาพแบบ Real-time</span>
                  <select value={photoChecklist.deviceReady || 'pending'} onChange={e => setPhotoChecklist({ ...photoChecklist, deviceReady: e.target.value })} className="bg-zinc-900 text-purple-400 p-1 rounded font-bold"><option value="pending">⏳ เทา</option><option value="ready">🟢 เขียว</option></select>
                </div>
              </div>
            )}

            {/* 📰 ฝ่ายที่ 13: ฝ่ายประชาสัมพันธ์ */}
            {activeMenu === 'pr_tab' && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-black text-purple-400 border-b border-white/5 pb-2">📰 13. ฝ่ายประชาสัมพันธ์และกระจายสารสนเทศโครงการ</h2>
                <textarea value={prActivities} onChange={e => setPrActivities(e.target.value)} className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 h-20 outline-none resize-none text-zinc-300 font-sans" />
              </div>
            )}

            {/* 💡 ฝ่ายที่ 14: ฝ่ายควบคุมแสงเวที */}
            {activeMenu === 'lighting_tab' && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-black text-purple-400 border-b border-white/5 pb-2">💡 14. ฝ่ายเทคนิคระบบโคมไฟและแสงสีเวทีหลัก</h2>
                <div className="p-3 bg-zinc-950/40 rounded-xl flex justify-between border border-white/5">
                  <span>การตรวจสอบสัญญาณเชื่อมโยงบอร์ดดิมเมอร์แสงไฟตามคิวงานสคริปต์</span>
                  <select value={lightChecklist.systemChecked || 'pending'} onChange={e => setLightChecklist({ ...lightChecklist, systemChecked: e.target.value })} className="bg-zinc-900 text-purple-400 p-1 rounded font-bold"><option value="pending">⏳ เทา</option><option value="ready">🟢 เขียว</option></select>
                </div>
              </div>
            )}

            {/* 🎚️ ฝ่ายที่ 15: ฝ่ายกำกับเวที */}
            {activeMenu === 'stage_operator' && (
              <div className="space-y-6 animate-in fade-in duration-150 text-xs relative h-full flex flex-col">
                <div className="flex justify-between items-center border-b border-white/5 pb-2 shrink-0">
                  <h2 className="text-sm font-black text-purple-400 flex items-center gap-2">
                    <Monitor size={14} /> 15. ศูนย์ตั้งค่าและรันคิวงานอัตโนมัติ (SM SHOWTIME SETUP)
                  </h2>
                  <button
                    onClick={() => setIsConfigModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-1.5 shadow-lg shadow-indigo-900/20 transition-all"
                  >
                    <Plus size={12} strokeWidth={3} /> เพิ่มรายการรันคิว (Add Script Block to Showtime)
                  </button>
                </div>

                {/* 📜 Scrollable List Zone */}
                <div className="overflow-y-auto flex-1 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 pb-10">

                  {/* รายการคิวงานที่ SM ตั้งค่าไว้สำหรับการรัน Live */}
                  {showtimeConfig.length === 0 ? (
                    <div className="p-12 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-zinc-600 gap-2">
                      <Clock size={32} className="opacity-20" />
                      <p className="font-bold">ยังไม่มีรายการคิวงานที่ถูกเลือกเข้าสู่ระบบ SHOWTIME</p>
                    </div>
                  ) : (
                    showtimeConfig.map((config, idx) => (
                      <div key={idx} className="p-5 bg-zinc-950/60 border border-white/10 rounded-3xl space-y-4 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>

                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">CUE #{idx + 1}</span>
                              <h3 className="text-sm font-black text-zinc-100">{config.blockName}</h3>
                            </div>
                            <p className="text-zinc-500 font-bold flex items-center gap-3">
                              <span>📅 {projectInfo?.startDate || 'ยังไม่ระบุ'}</span>
                              <span>⏱️ เริ่ม: {config.startTime}</span>
                              <span>⏳ ใช้เวลา: {config.duration} นาที</span>
                            </p>
                          </div>
                          <button onClick={() => {
                            const updated = [...showtimeConfig]; updated.splice(idx, 1); setShowtimeConfig(updated);
                          }} className="text-zinc-700 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>

                        {/* แผงไฟแสดงสถานะความพร้อมของฝ่ายที่เลือกไว้ */}
                        <div className="pt-3 border-t border-white/5">
                          <div className="text-[10px] font-black text-zinc-500 mb-3 uppercase tracking-widest">Department Readiness Ticker (ฝ่ายประสานงานที่ถูกเลือกคุมคิว)</div>
                          <div className="flex flex-wrap gap-2">
                            {config.targetDepts.map((deptKey: string) => {
                              const deptName = [
                                { key: 'speaker_hub', label: '3. การประสานงานวิทยากร' },
                                { key: 'emcee_script', label: '4. สคริปต์ & ระบบพิธีกร' },
                                { key: 'vip_reception', label: '5. ฝ่ายต้อนรับบุคคลสำคัญ' },
                                { key: 'registration_tab', label: '6. ฝ่ายรับลงทะเบียนหน้างาน' },
                                { key: 'venue_tab', label: '7. ฝ่ายจัดสถานที่ & ผัง VIP' },
                                { key: 'audio_media', label: '8. เครื่องเสียง & มัลติมีเดีย' },
                                { key: 'cert_distribution', label: '9. พิธีมอบรางวัลเกียรติบัตร' },
                                { key: 'gift_tab', label: '10. ฝ่ายแจกเอกสาร/ของที่ระลึก' },
                                { key: 'catering_tab', label: '11. ฝ่ายจัดเลี้ยงภัตตาหาร' },
                                { key: 'photo_tab', label: '12. ฝ่ายบันทึกภาพหน้างาน' },
                                { key: 'pr_tab', label: '13. ฝ่ายประชาสัมพันธ์' }
                              ].find(d => d.key === deptKey)?.label || deptKey;
                              return (
                                <div key={deptKey} className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                                  <div className="w-2.5 h-2.5 rounded bg-zinc-700 shadow-inner"></div>
                                  <span className="font-bold text-zinc-400 text-[11px]">{deptName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* แถบสีแสดงความก้าวหน้าของกิจกรรมย่อย (Progress Bar & Run Control) */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden relative border border-white/5">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300" style={{ width: '0%' }}></div>
                          </div>
                          <button className="bg-gradient-to-r from-indigo-600/30 to-blue-600/30 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider cursor-pointer hover:from-indigo-600 hover:to-blue-600 hover:text-white transition-all">
                            READY FOR LIVE
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                  <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                    <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                      <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                      ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                    </h3>

                    <div className="flex flex-wrap gap-3 relative z-10">
                      <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                        🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/showtime/seating${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-900/40 hover:bg-pink-600 border border-pink-500/50 hover:border-pink-400 rounded-xl text-xs font-bold text-pink-100 transition-all shadow-sm">
                        🗺️ หน้าจอแสดงผังที่นั่งผู้ร่วมงาน (Seating)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                        🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                        🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                        📺 จอแสดงผลโปรเจกเตอร์ (Display)
                      </button>

                      <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                        👥 ตรวจสอบรายชื่อ (Attendees)
                      </button>
                    </div>
                  </div>
                  {/* ================= จบแผงปุ่มทางด่วน ================= */}

                </div>


                {/* --- [MODAL: ตั้งค่า SHOWTIME คิวงาน] --- */}
                {isConfigModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-white/10 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl">
                      <div className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                          <h2 className="text-xl font-black text-white tracking-tight">ตั้งค่าชุดสั่งการ Showtime Cue Sheet</h2>
                          <button onClick={() => setIsConfigModalOpen(false)} className="text-zinc-500 hover:text-white">❌</button>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400">เลือก Script Block ที่ผู้กำกับเวทีต้องการควบคุมคิว:</label>
                            <select
                              onChange={(e) => setSelectedBlockIdx(Number(e.target.value))}
                              className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-indigo-500 text-xs"
                            >
                              <option value="">-- กรุณาเลือกช่วงกิจกรรมย่อยจากสคริปต์ --</option>
                              {agendaItems.map((item, i) => (
                                <option key={i} value={i}>{item.title} ({typeof calculateItemStartTime === 'function' ? calculateItemStartTime(i) : '00:00'})</option>
                              ))}
                            </select>
                          </div>

                          {selectedBlockIdx !== null && (
                            <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-[30px] space-y-4 animate-in slide-in-from-top-2">
                              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
                                <div><p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">เวลาเริ่มตามสคริปต์</p><p className="text-base font-black text-white">{typeof calculateItemStartTime === 'function' ? calculateItemStartTime(selectedBlockIdx) : '00:00'}</p></div>
                                <div><p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">โควตาเวลาที่ใช้</p><p className="text-base font-black text-white">{agendaItems[selectedBlockIdx].duration} นาที</p></div>
                              </div>

                              {/* 🔄 ดึงฝ่ายที่ 3-13 มาแสดงเป็นปุ่มกด Interactive แตะเลือก เฉพาะที่เกี่ยวข้อง */}
                              <div className="space-y-3">
                                <p className="text-[11px] font-black text-zinc-200 flex items-center gap-1.5 text-purple-300">
                                  <span>🎯 แตะเลือกฝ่ายประสานงานที่เกี่ยวข้องสำหรับจัดตั้งแผงไฟเรียกตรวจ (ฝ่ายที่ 3 - 13):</span>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                  {[
                                    { key: 'speaker_hub', label: '3. การประสานงานวิทยากร' },
                                    { key: 'emcee_script', label: '4. สคริปต์ & ระบบพิธีกร' },
                                    { key: 'vip_reception', label: '5. ฝ่ายต้อนรับบุคคลสำคัญ' },
                                    { key: 'registration_tab', label: '6. ฝ่ายรับลงทะเบียนหน้างาน' },
                                    { key: 'venue_tab', label: '7. ฝ่ายจัดสถานที่ & ผัง VIP' },
                                    { key: 'audio_media', label: '8. เครื่องเสียง & มัลติมีเดีย' },
                                    { key: 'cert_distribution', label: '9. พิธีมอบรางวัลเกียรติบัตร' },
                                    { key: 'gift_tab', label: '10. ฝ่ายแจกเอกสาร/ของที่ระลึก' },
                                    { key: 'catering_tab', label: '11. ฝ่ายจัดเลี้ยงภัตตาหาร' },
                                    { key: 'photo_tab', label: '12. ฝ่ายบันทึกภาพหน้างาน' },
                                    { key: 'pr_tab', label: '13. ฝ่ายประชาสัมพันธ์' }
                                  ].map(dept => (
                                    <button
                                      key={dept.key}
                                      onClick={() => {
                                        if (tempDepts.includes(dept.key)) setTempDepts(tempDepts.filter(d => d !== dept.key));
                                        else setTempDepts([...tempDepts, dept.key]);
                                      }}
                                      className={`p-2.5 rounded-xl text-[10px] font-bold border text-left transition-all flex items-center justify-between ${tempDepts.includes(dept.key)
                                        ? 'bg-purple-600/20 border-purple-400 text-purple-200 shadow-md font-black'
                                        : 'bg-black/40 border-white/5 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                                        }`}
                                    >
                                      <span>{dept.label}</span>
                                      <div className={`w-2 h-2 rounded-full ${tempDepts.includes(dept.key) ? 'bg-purple-400 animate-pulse' : 'bg-zinc-800'}`} />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 flex gap-3">
                          <button
                            disabled={selectedBlockIdx === null || tempDepts.length === 0}
                            onClick={() => {
                              const newConfig = {
                                blockName: agendaItems[selectedBlockIdx!].title,
                                startTime: typeof calculateItemStartTime === 'function' ? calculateItemStartTime(selectedBlockIdx!) : '00:00',
                                duration: agendaItems[selectedBlockIdx!].duration,
                                targetDepts: tempDepts
                              };
                              setShowtimeConfig([...showtimeConfig, newConfig]);
                              setIsConfigModalOpen(false);
                              setSelectedBlockIdx(null);
                              setTempDepts([]);
                            }}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 p-3.5 rounded-2xl font-black text-xs tracking-wider transition-all shadow-lg shadow-purple-950/20"
                          >
                            บันทึกเข้าสู่แผงสั่งการรันคิว (Save to Cue Sheet)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* 📊 ฝ่ายที่ 16: ฝ่ายประเมินผลการดำเนินงาน */}
            {activeMenu === 'evaluation_tab' && (
              <div className="space-y-4 text-xs">
                <h2 className="text-sm font-black text-purple-400 border-b border-white/5 pb-2">📊 16. ฝ่ายประเมินผลแบบสำรวจและการรายงานตัวชี้วัดความสำเร็จ</h2>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="ระบุชื่อเครื่องมือประเมินผล" value={evaluationInfo.toolName} onChange={e => setEvaluationInfo({ ...evaluationInfo, toolName: e.target.value })} className="bg-zinc-950 border border-white/10 rounded p-2 text-white" />
                  <input type="url" placeholder="ลิงก์แบบสอบถาม Google Form https://..." value={evaluationInfo.googleFormLink} onChange={e => setEvaluationInfo({ ...evaluationInfo, googleFormLink: e.target.value })} className="bg-zinc-950 border border-white/10 rounded p-2 text-purple-400 font-mono outline-none" />
                </div>
                {/* ========================================================
                      🚀 แผงปุ่มทางด่วน (Quick Express Navigation Matrix) - ฝ่าย 15
                      ======================================================== */}
                <div className="mt-12 p-6 bg-zinc-950/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>

                  <h3 className="text-white font-black text-sm mb-4 flex items-center gap-2">
                    <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-lg text-xs font-black">⚡ ทางด่วนระบบ</span>
                    ทางลัดปฏิบัติการหน้างาน (Quick Navigation)
                  </h3>

                  <div className="flex flex-wrap gap-3 relative z-10">
                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/vip${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-amber-950/40 hover:bg-amber-600 border border-amber-500/50 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-100 transition-all shadow-sm">
                      🌟 หน้าจอคิวอ่าน VIP (Showtime VIP)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/seating${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-pink-900/40 hover:bg-pink-600 border border-pink-500/50 hover:border-pink-400 rounded-xl text-xs font-bold text-pink-100 transition-all shadow-sm">
                      🗺️ หน้าจอแสดงผังที่นั่งผู้ร่วมงาน (Seating)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/venue/planner${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/40 hover:bg-purple-600 border border-purple-500/50 hover:border-purple-400 rounded-xl text-xs font-bold text-purple-100 transition-all shadow-sm">
                      🪑 จัดแปลนผังที่นั่ง/โต๊ะ (Venue Planner)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/media${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-900/40 hover:bg-rose-600 border border-rose-500/50 hover:border-rose-400 rounded-xl text-xs font-bold text-rose-100 transition-all shadow-sm">
                      🎬 คลังสื่อมัลติมีเดีย (Media Hub)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/showtime/display${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900/40 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-400 rounded-xl text-xs font-bold text-blue-100 transition-all shadow-sm">
                      📺 จอแสดงผลโปรเจกเตอร์ (Display)
                    </button>

                    <button type="button" onClick={() => router.push(`/eventdashboard/attendees${eventId ? `?event_id=${eventId}` : ''}`)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-900/40 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-400 rounded-xl text-xs font-bold text-emerald-100 transition-all shadow-sm">
                      👥 ตรวจสอบรายชื่อ (Attendees)
                    </button>
                  </div>
                </div>
                {/* ================= จบแผงปุ่มทางด่วน ================= */}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 🏛️ หน้าต่างลอย SEARCHABLE DROPDOWN & LIVE INTERACTIVE LAYER */}
      {seatingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-white/10 rounded-[30px] w-full max-w-md overflow-hidden p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <span className="bg-purple-950 text-purple-400 px-2 py-0.5 rounded text-[9px] font-black uppercase">พิกัด {seatingModal.seatId} ({seatingModal.zone})</span>
                <h3 className="text-sm font-black text-white mt-0.5">จัดการสิทธิ์ผู้ครองเก้าอี้ VIP</h3>
              </div>
              <button onClick={() => setSeatingModal({ ...seatingModal, isOpen: false })} className="w-6 h-6 rounded-full bg-white/5 text-zinc-400 hover:text-white text-xs">❌</button>
            </div>

            {(() => {
              const currentGuest = vipGuests.find(g => g.seat_id === seatingModal.seatId && g.seat_zone === seatingModal.zone);
              if (currentGuest) {
                return (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 bg-zinc-950/60 border border-white/5 rounded-xl text-[11px]">
                      <p className="text-[10px] text-zinc-500 font-bold">👤 ผู้ครองสิทธิ์ปัจจุบัน:</p>
                      <p className="font-black text-purple-400 text-xs">{currentGuest.prefix || ''}{currentGuest.fullname || currentGuest.name}</p>
                      <p className="text-zinc-400 mt-0.5">{currentGuest.position} — {currentGuest.organization || currentGuest.org}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-zinc-500 uppercase">🚦 ปรับปรุงสถานะสัญญาณไฟหน้างานจริง:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { setVipGuests(vipGuests.map(g => g.id === currentGuest.id ? { ...g, live_presence: 'present' } : g)); setSeatingModal({ ...seatingModal, isOpen: false }); }} className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-xl font-bold text-[11px]">🟢 มาประจำที่แล้ว</button>
                        <button onClick={() => { setVipGuests(vipGuests.map(g => g.id === currentGuest.id ? { ...g, live_presence: 'away' } : g)); setSeatingModal({ ...seatingModal, isOpen: false }); }} className="p-2.5 bg-amber-950/60 border border-amber-500/40 text-amber-400 rounded-xl font-bold text-[11px]">🟡 ลุกธุระชั่วคราว</button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex gap-2">
                      <button onClick={() => { setVipGuests(vipGuests.map(g => g.id === currentGuest.id ? { ...g, seat_id: undefined, seat_zone: undefined, live_presence: undefined } : g)); alert('🧹 คืนสิทธิ์เก้าอี้ว่างสำเร็จ!'); setSeatingModal({ ...seatingModal, isOpen: false }); }} className="flex-1 py-2 bg-zinc-950 border border-white/5 text-zinc-400 hover:text-red-400 rounded-xl font-black text-[11px]">❌ เคลียร์เก้าอี้ว่าง</button>
                      <button onClick={() => { setVipGuests(vipGuests.map(g => g.id === currentGuest.id ? { ...g, seat_id: undefined, seat_zone: undefined, live_presence: undefined } : g)); }} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[11px]">🔄 เปลี่ยนตัวบุคคล</button>
                    </div>
                  </div>
                );
              } else {
                const filteredGuests = vipGuests
                  .filter(g => !g.seat_id)
                  .filter(g => {
                    const name = g.fullname || g.name || '';
                    return name.toLowerCase().includes(seatingModal.searchTerm.toLowerCase());
                  });

                return (
                  <div className="space-y-3 animate-in fade-in">
                    <input type="text" placeholder="🔍 พิมพ์ชื่อ-สกุล หรือสังกัดเพื่อค้นหา..." value={seatingModal.searchTerm} onChange={e => setSeatingModal({ ...seatingModal, searchTerm: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-purple-500" />
                    <p className="text-[10px] font-black text-purple-300">💡 แตะเลือกรายชื่อเพื่อส่งลงนั่ง:</p>
                    <div className="max-h-48 overflow-y-auto bg-black/50 rounded-2xl border border-white/5 divide-y divide-white/5 pr-1">
                      {filteredGuests.length === 0 ? (
                        <div className="p-4 text-center text-zinc-600 text-[10px] font-bold">ไม่พบรายชื่อ VIP ว่างในระบบฝ่าย 6 ครับพี่</div>
                      ) : (
                        filteredGuests.map((guest) => {
                          const fn = guest.fullname || guest.name || 'ไม่ระบุชื่อ';
                          return (
                            <div key={guest.id} onClick={() => { setVipGuests(vipGuests.map(g => g.id === guest.id ? { ...g, seat_id: seatingModal.seatId, seat_zone: seatingModal.zone, live_presence: 'pending' } : g)); setSeatingModal({ ...seatingModal, isOpen: false }); }} className="p-3 hover:bg-purple-600/10 cursor-pointer flex justify-between items-center transition-all group">
                              <div className="text-left max-w-[70%]">
                                <p className="font-black text-white group-hover:text-purple-400 text-sm truncate">{guest.prefix || ''}{fn}</p>
                                <p className="text-[10px] text-zinc-400 truncate mt-0.5 font-medium">{guest.position} — {guest.organization || guest.org || ''}</p>
                              </div>
                              <span className="bg-zinc-900 border border-white/5 text-purple-400 text-[9px] font-black px-2 py-1 rounded-lg">➕ เลือกนั่ง</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              }
            })()}

          </div>
        </div>
      )}

    </div>
  );
}