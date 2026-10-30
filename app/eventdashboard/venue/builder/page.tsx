"use client";
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Move, Save, DoorOpen, Mic, LayoutGrid, Trash2, Calendar, Hash,
  Utensils, RotateCw, Coffee, AlertTriangle, Monitor, Square, UserCheck,
  Printer, Camera, Projector, ChefHat, Droplets, MousePointer2, Users,
  Search, X, UserPlus, RefreshCcw, Clock, List
} from 'lucide-react';

function VenueBuilderContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || '';
  const isGuest = searchParams.get('guest') === 'true';
  const router = useRouter();

  const [eventName, setEventName] = useState('กำลังโหลดชื่องาน...');
  const [eventDate, setEventDate] = useState('');

  const [mealInfo, setMealInfo] = useState<any>(null);
  const [layoutItems, setLayoutItems] = useState<any[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<{ active: boolean, startX: number, startY: number, originals: { id: string, x: number, y: number }[] } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isManualOpen, setIsManualOpen] = useState(false);
  // 🟢 State สำหรับฟีเจอร์ค้นหารายชื่อ และ Modal
  const [attendeesList, setAttendeesList] = useState<any[]>([]);
  const [viewTableId, setViewTableId] = useState<string | null>(null); // สำหรับ Pop-up ดูข้อมูลโต๊ะ
  const [showWalkInReport, setShowWalkInReport] = useState(false); // สำหรับ Modal รายงาน Walk-in

  useEffect(() => {
    const fetchLayout = async () => {
      if (!eventId) {
        setErrorMsg('ไม่พบรหัส Event (event_id) ใน URL');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 🟢 โหลดรายชื่อแขกทั้งหมดในงาน เพื่อใช้ค้นหาและแสดงผล
        const { data: attData } = await supabase.from('event_attendees').select('id, fullname, attendee_type, created_at').eq('event_id', eventId);
        if (attData) setAttendeesList(attData);

        const { data: eventData } = await supabase.from('events').select('title').eq('id', eventId).maybeSingle();
        if (eventData) setEventName(eventData.title);

        const { data: meals, error: mealErr } = await supabase.from('event_meals').select('*').eq('event_id', eventId).limit(1);
        if (mealErr) throw mealErr;
        if (!meals || meals.length === 0) {
          setErrorMsg('ยังไม่ได้สร้างผังโต๊ะ กรุณากลับไปตั้งค่าที่หน้า Meal Planner ก่อน');
          setIsLoading(false);
          return;
        }

        const mealData = meals[0];
        setMealInfo(mealData);
        setEventDate(mealData.meal_date || '');

        // 🟢 โหลดข้อมูลโต๊ะล่าสุดจาก Database เสมอ (เพื่อเอาจำนวนคนนั่ง)
        const [tableRes, zoneRes] = await Promise.all([
          supabase.from('event_meal_tables').select('*').eq('meal_id', mealData.id).order('table_number'),
          supabase.from('event_meal_zones').select('*').eq('meal_id', mealData.id)
        ]);

        if (tableRes.error) throw tableRes.error;
        const tableData = tableRes.data;
        const zoneData = zoneRes.data || [];

        let savedLayout = mealData.venue_layout_json;
        if (typeof savedLayout === 'string') {
          try { savedLayout = JSON.parse(savedLayout); } catch (e) { savedLayout = null; }
        }

        if (Array.isArray(savedLayout) && savedLayout.length > 0) {
          // 🟢 กรณีมีผังวาดแล้ว: นำพิกัดเดิม มาผสาน(Merge)กับข้อมูลคนนั่งล่าสุด
          const finalLayout = savedLayout.filter(item => item && item.id).map(item => {
            if (item.type === 'table' && !item.id.includes('extra')) {
              const dbId = item.id.replace('table-', '');
              const liveTable = tableData.find(t => t.id === dbId);
              if (liveTable) {
                return {
                  ...item,
                  label: liveTable.table_number?.toString() || item.label,
                  subLabel: liveTable.group_name || '',
                  seatedCount: Array.isArray(liveTable.seated_names) ? liveTable.seated_names.length : 0,
                  seatedIds: Array.isArray(liveTable.seated_names) ? liveTable.seated_names : [],
                  capacity: mealData.seats_per_table || 8,
                };
              }
            }
            return item;
          });
          setLayoutItems(finalLayout);

        } else {
          // 🟢 กรณีสร้างผังครั้งแรก (คำนวณแยกตามโซน)
          if (tableData && tableData.length > 0) {
            const newLayoutItems: any[] = [];
            let currentOffsetY = 0; // ตัวแปรเก็บระยะความสูงสะสม

            // วนลูปทีละโซน
            zoneData.forEach((zone, zoneIndex) => {
              // 1. สร้างป้ายชื่อโซน
              newLayoutItems.push({
                id: `zone-label-${zone.id}`, type: 'zone-label',
                label: zone.zone_name || `Zone ${zoneIndex + 1}`,
                x: 100, y: 80 + currentOffsetY, rotation: 0
              });

              // 2. ดึงโต๊ะ "เฉพาะ" ของโซนนี้มาจัดเรียง (รีเซ็ตแถวใหม่)
              const zoneTables = tableData.filter(t => t.zone_id === zone.id);
              const colsPerZone = zone.grid_cols || 10;

              zoneTables.forEach((t, tIndex) => {
                const row = t.grid_row_index ?? Math.floor(tIndex / colsPerZone);
                const col = t.grid_col_index ?? (tIndex % colsPerZone);

                let gapX = 0; let gapY = 0;
                // ตรวจสอบทางเดินเฉพาะภายในโซนนี้
                if (zone.walkway_col > 0 && col > zone.walkway_col) gapX = 100;
                if (zone.walkway_row > 0 && row > zone.walkway_row) gapY = 100;

                // นำ seatedIds มาใส่ในโต๊ะให้ถูกต้อง
                newLayoutItems.push({
                  id: `table-${t.id}`, type: 'table',
                  label: t.table_number?.toString() || `${getExcelColLetter(col)}${row + 1}`,
                  subLabel: t.group_name || '',
                  x: 100 + (col * 80) + gapX,
                  y: 150 + (row * 80) + gapY + currentOffsetY,
                  rotation: 0,
                  seatedCount: Array.isArray(t.seated_names) ? t.seated_names.length : 0,
                  seatedIds: Array.isArray(t.seated_names) ? t.seated_names : [],
                  capacity: mealData.seats_per_table || 8, // แก้จาก mealInfo เป็น mealData ป้องกันค่าว่างตอนโหลดแรกสุด
                });
              });

              // 3. บวกความสูงของโซนนี้ เพื่อดันโซนถัดไปลงด้านล่าง
              const totalRowsInZone = zone.grid_rows || Math.ceil(zoneTables.length / colsPerZone);
              const hasWalkwayRow = (zone.walkway_row && zone.walkway_row > 0) ? 100 : 0;
              currentOffsetY += (totalRowsInZone * 80) + hasWalkwayRow + 150; // 150 คือระยะห่างระหว่างโซน
            });

            setLayoutItems(newLayoutItems);
          } else {
            setLayoutItems([]);
          }
        }

      } catch (err: any) {
        setErrorMsg('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (err.message || 'Unknown Error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchLayout();
  }, [eventId]);

  const getExcelColLetter = (colIdx: number) => {
    if (colIdx < 0 || isNaN(colIdx)) return "A";
    let letter = "";
    let temp = colIdx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isGuest) return;
    if ((e.target as HTMLElement).closest('.draggable-item')) return;
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
      setSelectedIds([]);
    }
  };

  const handleItemPointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (isGuest) return;
    e.preventDefault(); e.stopPropagation();

    let currentSelected = [...selectedIds];
    if (!currentSelected.includes(id)) {
      currentSelected = [id];
      setSelectedIds(currentSelected);
    }

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const originals = layoutItems.filter(item => currentSelected.includes(item.id)).map(item => ({ id: item.id, x: item.x, y: item.y }));
      setDragState({ active: true, startX: x, startY: y, originals });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isGuest || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectionBox) {
      setSelectionBox(prev => ({ ...prev!, currentX: x, currentY: y }));
      const left = Math.min(selectionBox.startX, x);
      const right = Math.max(selectionBox.startX, x);
      const top = Math.min(selectionBox.startY, y);
      const bottom = Math.max(selectionBox.startY, y);

      const insideIds = layoutItems.filter(item => {
        const cx = item.x + 30;
        const cy = item.y + 30;
        return cx >= left && cx <= right && cy >= top && cy <= bottom;
      }).map(i => i.id);
      setSelectedIds(insideIds);
    }
    else if (dragState?.active) {
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;
      setLayoutItems(prev => prev.map(item => {
        const orig = dragState.originals.find(o => o.id === item.id);
        if (orig) return { ...item, x: orig.x + deltaX, y: orig.y + deltaY };
        return item;
      }));
    }
  };

  const handlePointerUp = () => {
    if (selectionBox) setSelectionBox(null);
    if (dragState?.active) setDragState(null);
  };

  const handleGroupRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLayoutItems(prev => prev.map(item => selectedIds.includes(item.id) ? { ...item, rotation: ((item.rotation || 0) + 45) % 360 } : item));
  };

  const handleGroupDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const itemsToDelete = layoutItems.filter(i => selectedIds.includes(i.id));
    for (const t of itemsToDelete) {
      if (t.type === 'table' && !t.id.includes('extra')) {
        const tableDbId = t.id.replace('table-', '');
        await supabase.from('event_meal_tables').delete().eq('id', tableDbId);
      }
    }
    setLayoutItems(prev => prev.filter(item => !selectedIds.includes(item.id)));
    setSelectedIds([]);
  };

  // 🟢 ฟังก์ชันเพิ่มแขก Walk-in ด่วนหน้างาน
  // 🟢 ฟังก์ชันเพิ่มแขก Walk-in (แบบมีหน้าต่างถามชื่อ)
  const handleQuickWalkIn = async (e: React.PointerEvent | React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. เด้งหน้าต่างถามชื่อแขก
    const inputName = window.prompt("ระบุชื่อ/ชื่อเล่น แขก Walk-in\n(หากเว้นว่างไว้ ระบบจะสุ่มรหัสให้แทน):", "");

    // ถ้าผู้ใช้กด Cancel (ยกเลิก) ให้หยุดการทำงานทันที
    if (inputName === null) return;

    // ถ้าพิมพ์ชื่อมา ให้ใช้ชื่อนั้น ถ้าไม่พิมพ์ ให้สุ่มรหัส Walk-in (XXXX)
    const finalWalkInName = inputName.trim() !== ""
      ? `Walk-in: ${inputName.trim()}`
      : `Walk-in (${Math.floor(1000 + Math.random() * 9000)})`;

    // 2. อัปเดตตัวเลขหน้าจอทันที (Optimistic Update)
    setLayoutItems(prev => prev.map(item => {
      if (item.id === tableId) {
        return { ...item, seatedCount: (item.seatedCount || 0) + 1 };
      }
      return item;
    }));

    try {
      // 3. บันทึกชื่อลงตาราง event_attendees
      const { data: newGuest, error: guestErr } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          fullname: finalWalkInName,
          attendee_type: 'Walk-in',
          guest_faction: 'visitor'
        })
        .select().single();

      if (guestErr) throw guestErr;
      // 🟢 อัปเดตรายชื่อในหน่วยความจำทันที ไม่ต้องรีเฟรช
      setAttendeesList(prev => [...prev, newGuest]);

      // อัปเดต ID คนนั่งใน layoutItems ด้วย
      setLayoutItems(prev => prev.map(item => item.id === tableId ? { ...item, seatedIds: [...(item.seatedIds || []), newGuest.id] } : item));

      // 4. เอา ID แขกใหม่ไปยัดใส่โต๊ะ
      const tableDbId = tableId.replace('table-', '');
      const { data: tableData, error: fetchErr } = await supabase
        .from('event_meal_tables')
        .select('seated_names')
        .eq('id', tableDbId)
        .single();

      if (fetchErr) throw fetchErr;

      const currentSeated = Array.isArray(tableData?.seated_names) ? tableData.seated_names : [];
      const newSeatedNames = [...currentSeated, newGuest.id];

      const { error: updateErr } = await supabase
        .from('event_meal_tables')
        .update({ seated_names: newSeatedNames })
        .eq('id', tableDbId);

      if (updateErr) throw updateErr;

    } catch (err: any) {
      // ถ้าระบบหลังบ้านมีปัญหา ให้ดึงตัวเลขกลับมาเป็นค่าเดิม
      setLayoutItems(prev => prev.map(item => {
        if (item.id === tableId) {
          return { ...item, seatedCount: Math.max(0, (item.seatedCount || 0) - 1) };
        }
        return item;
      }));
      alert('❌ ขัดข้อง! ไม่สามารถบันทึกแขกลงฐานข้อมูลได้: ' + err.message);
    }
  };

  const addNewItem = (type: string, label: string) => {
    const newItem = { id: `item-${Date.now()}`, type, label, x: 200, y: 100, rotation: 0 };
    setLayoutItems([...layoutItems, newItem]);
  };

  const handleAddExtraTable = () => {
    const tName = prompt("ระบุชื่อหรือเลขโต๊ะเสริม:", "เสริม-1");
    if (!tName) return;
    const newItem = { id: `table-extra-${Date.now()}`, type: 'table', label: tName, subLabel: 'โต๊ะเสริม', x: 200, y: 100, rotation: 0, seatedCount: 0, capacity: mealInfo?.seats_per_table || 8 };
    setLayoutItems([...layoutItems, newItem]);
  };

  const handleSaveLayout = async () => {
    if (!mealInfo) return;
    try {
      await supabase.from('events').update({ title: eventName }).eq('id', eventId);

      // 🟢 แปลงค่าว่างให้เป็น null เพื่อป้องกัน Error "invalid input syntax for type date"
      const validDate = eventDate ? eventDate : null;

      const { error } = await supabase
        .from('event_meals')
        .update({ meal_date: validDate, venue_layout_json: layoutItems })
        .eq('id', mealInfo.id);

      if (error) throw error;
      alert('✅ บันทึกชื่องาน วันที่ และพิกัดผังห้องเรียบร้อยแล้ว!');
    } catch (err: any) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    }
  };
  const handleResetLayout = async () => {
    if (!confirm('⚠️ ยืนยันการรีเซ็ตผัง?\n\nการทำเช่นนี้จะล้างพิกัดและของตกแต่งทั้งหมดที่เคยวางไว้ และจัดเรียงโต๊ะใหม่ตามค่าตั้งต้นจากหน้า Meal Planner')) return;

    try {
      const { error } = await supabase.from('event_meals').update({ venue_layout_json: null }).eq('id', mealInfo.id);
      if (error) throw error;
      window.location.reload();
    } catch (err: any) { alert('❌ เกิดข้อผิดพลาด: ' + err.message); }
  };
  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center font-bold text-amber-500 tracking-widest animate-pulse">Initializing Canvas...</div>;
  if (errorMsg) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-bold max-w-md">
        <AlertTriangle size={32} className="mx-auto mb-2 opacity-80" /> {errorMsg}
      </div>
      {!isGuest && (
        <button onClick={() => router.push(`/eventdashboard/venue/meal-planner?event_id=${eventId}`)} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all border border-white/10">
          กลับไปตั้งค่าหน้า Meal Planner
        </button>
      )}
    </div>
  );
  if (!mealInfo) return null;
  const handlePrint = () => {
    window.print();
  };
  if (!mealInfo) return null;

  // 🟢 คำนวณยอดแขกที่นั่งโต๊ะแล้วทั้งหมดแบบเรียลไทม์
  const totalSeatedGuests = layoutItems.reduce((sum, item) => item.type === 'table' ? sum + (item.seatedCount || 0) : sum, 0);
  // 🟢 1. คำนวณหาจุดที่กว้างสุดและลึกสุดของผังโต๊ะทั้งหมด
  const maxCanvasWidth = Math.max(1122, ...layoutItems.map(item => (item.x || 0) + 250));
  const maxCanvasHeight = Math.max(793, ...layoutItems.map(item => (item.y || 0) + 250));

  // 🟢 2. คำนวณอัตราส่วนการย่อ (Auto-scale) ให้พอดีหน้ากระดาษ A4 แนวนอน (1122x793 px)
  const printScaleX = 1100 / maxCanvasWidth;
  const printScaleY = 720 / maxCanvasHeight;
  const finalPrintScale = Math.min(printScaleX, printScaleY, 1); // ห้ามขยายเกิน 100%

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0f172a] to-[#050505] text-white p-4 flex flex-col h-screen overflow-hidden selection:bg-amber-500/30 print:bg-white print:p-0 print:h-auto print:overflow-visible print:block">
      {/* 🟢 3. เพิ่ม CSS บังคับหน้ากระดาษ ย่อสเกล และสีพื้นหลังให้ขาวสะอาด */}
      <style>{`
        @media print {
          @page { 
            size: A4 landscape !important; 
            margin: 5mm !important; 
          }
          body, html, main, .min-h-screen {
            background: white !important;
            color: black !important;
          }
          .canvas-print-area {
            zoom: ${finalPrintScale} !important;
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ::-webkit-scrollbar { display: none !important; }
        }
      `}</style>
      {/* 🌟 Header & Banner (Ultra-Compact Version) */}
      <div className="bg-black/60 backdrop-blur-2xl p-2.5 md:p-3 rounded-2xl border border-white/10 mb-2 shrink-0 shadow-lg print:hidden flex flex-col gap-2">

        {/* 🟢 ส่วนที่ 1: Banner ชื่อหน้า */}
        <div className="border-b border-white/5 pb-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-wide flex items-center gap-2">
            แผนผังห้องจัดเลี้ยงและรายงานสถานะโต๊ะอาหาร
            {isGuest && <span className="text-[9px] text-cyan-400 border border-cyan-500/50 bg-cyan-950/50 px-1.5 py-0.5 rounded-lg">(Guest View)</span>}
          </h1>
          <Link href={`/events/event-dashboard/${eventId}`} className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md" > <LayoutGrid size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">กลับศูนย์กลาง</span> </Link>

          <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-4 md:h-5 object-contain shrink-0 opacity-80" />
        </div>

        {/* 🟢 ส่วนที่ 2: ข้อมูลงาน และ เครื่องมือ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 w-full">

          {/* ซ้าย: ชื่องาน (ย่อขนาดลง) และ สถิติ */}
          <div className="flex flex-col gap-1.5 w-full md:w-auto">
            {isGuest ? (
              <div className="text-xs md:text-sm font-semibold text-zinc-300 truncate w-[250px] sm:w-[350px]">{eventName}</div>
            ) : (
              <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} className="bg-transparent border-b border-dashed border-white/20 text-xs md:text-sm font-semibold text-zinc-300 focus:border-amber-500 outline-none w-[250px] sm:w-[350px] truncate transition-colors" placeholder="พิมพ์ชื่องานจัดเลี้ยงที่นี่..." />
            )}

            {/* 🟢 สถิติและข้อมูลงาน (แสดงทั้ง Admin และ Guest) */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white/[0.02] rounded-lg border border-white/5 text-[9px] font-bold text-zinc-400 w-fit">
              <div className="flex items-center gap-1"><Utensils size={12} className="text-amber-500" /> <span className="text-amber-400">{mealInfo.meal_name}</span></div>
              <div className="w-px h-2 bg-white/10"></div>

              {/* วันที่ (Guest เห็นเป็นข้อความ, Admin แก้ไขได้) */}
              <div className="flex items-center gap-1">
                <Calendar size={12} className="text-blue-400" />
                {isGuest ? (
                  <span className="text-white">{eventDate || 'ไม่ได้ระบุวันที่'}</span>
                ) : (
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-transparent text-white focus:outline-none cursor-text w-20" />
                )}
              </div>

              <div className="w-px h-2 bg-white/10"></div>

              {/* จำนวนโต๊ะทั้งหมด */}
              <div className="flex items-center gap-1"><Hash size={12} className="text-emerald-400" /> <span className="text-emerald-400 font-mono">{layoutItems.filter(i => i.type === 'table').length}</span> โต๊ะ</div>
              <div className="w-px h-2 bg-white/10"></div>

              {/* จำนวนแขกที่นั่งแล้ว */}
              <div className="flex items-center gap-1 bg-blue-950/40 border border-blue-500/30 px-1.5 py-0.5 rounded">
                <span className="text-blue-400">แขกนั่งแล้ว:</span><span className="text-blue-400 font-mono">{totalSeatedGuests}</span>
              </div>

              {/* ปุ่ม Walk-in (ซ่อนในมุมมอง Guest ให้เห็นเฉพาะ Admin) */}
              {!isGuest && (
                <button onClick={() => setShowWalkInReport(true)} className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/50 hover:bg-amber-900/60 px-1.5 py-0.5 rounded transition-colors ml-1">
                  <Clock size={10} className="text-amber-400" /> <span className="text-amber-400">Walk-in</span>
                </button>
              )}
            </div>
          </div>
          {/* 📝 ปุ่ม: ลงทะเบียนผู้ร่วมงาน (ขนาดเล็ก/Compact) */}
          <a
            href={`/eventdashboard/attendees?event_id=${eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-700/60 border border-emerald-600/50 text-emerald-400 hover:text-white font-bold text-xs px-4 py-2 rounded-xl transition-all w-max cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">ลงทะเบียนผู้ร่วมงาน</span>
          </a>
          {/* ขวา: กล่องค้นหา และ ปุ่มเครื่องมือ */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 w-full md:w-auto mt-1 md:mt-0">
            {/* กล่องค้นหา (ค่อนไปทางขวา) */}
            <div className={`relative flex items-center ${isGuest ? 'w-full md:w-auto mt-2 md:mt-0' : 'mr-2'}`}>
              <Search size={isGuest ? 16 : 12} className="absolute left-3 text-pink-500" />
              <input
                type="text"
                placeholder={isGuest ? "ค้นหาชื่อหน่วยงาน/กลุ่ม หรือ ชื่อของท่าน..." : "ค้นหาชื่อแขก/หน่วยงาน..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                    ${isGuest ? 'w-full md:w-96 text-sm py-2 pl-9' : 'w-36 md:w-48 text-[10px] py-1.5 pl-8'} 
                    bg-pink-950/20 border border-pink-500/30 rounded-lg pr-6 text-pink-300 outline-none focus:border-pink-500 transition-all font-bold shadow-inner
                  `}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 text-pink-400 hover:text-white bg-pink-900/50 rounded-full p-0.5">
                  <X size={isGuest ? 14 : 10} />
                </button>
              )}
            </div>

            {/* กลุ่มปุ่ม (เรียงชิดขวา, คู่มืออยู่ขวาสุด) */}
            {!isGuest && (
              <>
                <button onClick={handleResetLayout} className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white rounded-lg border border-red-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"><RefreshCcw size={12} /> รีเซ็ต</button>
                <button onClick={() => router.push(`/eventdashboard/venue/meal-planner?event_id=${eventId}`)} className="px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-white/5 text-[10px] font-bold transition-all">ย้อนกลับ</button>
                <button onClick={handlePrint} className="px-2.5 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded-lg border border-white/5 text-[10px] font-bold flex items-center gap-1 transition-all"><Printer size={12} /> พิมพ์</button>
                <button onClick={handleSaveLayout} className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-lg flex items-center gap-1 shadow-md transition-all"><Save size={12} /> บันทึก</button>
                <button onClick={() => setIsManualOpen(true)} className="px-2.5 py-1.5 bg-blue-900/30 hover:bg-blue-600/50 text-blue-400 hover:text-white rounded-lg border border-blue-500/30 text-[10px] font-black flex items-center gap-1 transition-all ml-1">
                  <span className="text-[9px] font-black border border-current rounded-full w-3 h-3 flex items-center justify-center leading-none">?</span> คู่มือ
                </button>
              </>
            )}
          </div>

        </div>
      </div>


      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 print:h-auto print:overflow-visible print:block">

        {/* 🧰 แผงเครื่องมือ */}
        {!isGuest && (
          <div className="w-full lg:w-64 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-4 flex flex-col gap-3 shrink-0 overflow-y-auto custom-scrollbar shadow-inner print:hidden">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input type="text" placeholder="ค้นหากลุ่ม / หน่วยงาน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors shadow-inner font-bold placeholder-zinc-600" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white bg-zinc-800 p-0.5 rounded-full"><X size={10} /></button>}
            </div>
            <h3 className="text-sm font-black text-amber-500 border-b border-white/10 pb-2 flex items-center gap-2 uppercase tracking-widest"><LayoutGrid size={16} /> วัตถุจัดงาน</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <button onClick={() => addNewItem('stage', 'เวทีหลัก (Stage)')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-amber-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-amber-500/20 text-amber-400 rounded-md"><Mic size={14} /></div> เวที</button>
              <button onClick={() => addNewItem('projector', 'จอโปรเจคเตอร์')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-zinc-400/50 text-xs font-bold transition-colors"><div className="p-1 bg-zinc-500/20 text-zinc-300 rounded-md"><Projector size={14} /></div> จอฉายภาพ</button>
              <button onClick={() => addNewItem('backdrop', 'จุดถ่ายภาพ')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-purple-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-purple-500/20 text-purple-400 rounded-md"><Camera size={14} /></div> แบ็คดร็อป</button>
              <button onClick={() => addNewItem('food-station', 'ซุ้มอาหาร')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-orange-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-orange-500/20 text-orange-400 rounded-md"><ChefHat size={14} /></div> ซุ้มอาหาร</button>
              <button onClick={() => addNewItem('buffet', 'ไลน์เครื่องดื่ม')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-pink-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-pink-500/20 text-pink-400 rounded-md"><Coffee size={14} /></div> บาร์/บุฟเฟต์</button>
              <button onClick={() => addNewItem('restroom-m', 'ห้องน้ำชาย')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-blue-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-blue-500/20 text-blue-400 rounded-md"><Droplets size={14} /></div> ห้องน้ำชาย</button>
              <button onClick={() => addNewItem('restroom-w', 'ห้องน้ำหญิง')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-rose-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-rose-500/20 text-rose-400 rounded-md"><Droplets size={14} /></div> ห้องน้ำหญิง</button>
              <button onClick={() => addNewItem('entrance', 'ประตูทางเข้า')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-emerald-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md"><DoorOpen size={14} /></div> ทางเข้า</button>
              <button onClick={() => addNewItem('pillar', 'เสา (Pillar)')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-zinc-400 text-xs font-bold transition-colors"><div className="p-1 bg-zinc-800 text-zinc-400 rounded-md"><Square size={14} /></div> เสาโครงสร้าง</button>
              <button onClick={() => addNewItem('carpet', 'พรมทางเดิน')} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-xl border border-white/5 hover:border-red-500/50 text-xs font-bold transition-colors"><div className="p-1 bg-red-500/20 text-red-400 rounded-md"><Move size={14} /></div> ทางเดินพรม</button>
            </div>
            <div className="border-t border-white/10 mt-auto pt-4">
              <button onClick={handleAddExtraTable} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-950/50 to-orange-950/50 rounded-xl border border-amber-500/30 hover:border-amber-400 text-xs font-black shadow-lg transition-colors">
                <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> เพิ่มโต๊ะเสริมลอย</span>
                <span className="text-amber-400 font-bold">+</span>
              </button>
            </div>
          </div>
        )}

        {/* 🗺️ กระดานวาดผัง */}
        <div className="flex-1 relative rounded-3xl border-2 border-dashed border-white/10 bg-zinc-950/50 shadow-inner overflow-hidden print:border-none print:w-full print:h-auto print:overflow-visible print:rounded-none print:block">

          <div className="absolute top-4 right-4 bg-black/80 px-4 py-2 rounded-xl border border-white/10 text-[10px] font-bold text-zinc-400 pointer-events-none z-40 shadow-lg print:hidden">
            {/* 🟢 คำอธิบายสีสถานะโต๊ะ (Legend) */}
            <div className="flex items-center gap-3 mb-1.5 border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#0a0a0a] border border-zinc-500"></div> ว่าง</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-950/40 border border-blue-500 border-dashed"></div> ไม่เต็ม</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-950/40 border border-emerald-500 shadow-[0_0_5px_#10b981]"></div> เต็ม</span>
            </div>
            {!isGuest && <span className="flex items-center gap-1.5"><MousePointer2 size={12} /> ลากคลุมพื้นหลังเพื่อเลือกหลายชิ้น</span>}
          </div>

          <div className="w-full h-full overflow-auto custom-scrollbar print:h-auto print:overflow-visible">

            {/* 🟢 1. Print Header (อยู่ด้านนอกกระดาน พร้อมตั้งค่าดันระยะ margin ไม่ให้ทับเวที) */}
            <div className="hidden print:flex text-black justify-between items-start w-full print:mb-16 print:relative print:z-[100]" style={{ padding: '10px 20px' }}>
              <div className="pr-4">
                <h1 className="text-3xl font-black leading-tight">{eventName}</h1>
                <p className="text-lg font-bold text-gray-700 mt-2">วันที่: {eventDate} | แผนผังห้องจัดเลี้ยง ({mealInfo.meal_name})</p>
              </div>

              <div className="flex flex-col items-center border-4 border-black p-2.5 rounded-2xl bg-white shadow-sm shrink-0">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/eventdashboard/venue/builder?event_id=${eventId}&guest=true` : '')}`}
                  alt="Guest View QR Code"
                  className="w-20 h-20 object-contain"
                />
                <span className="text-[10px] font-black mt-1.5 tracking-widest">สแกนดูผังโต๊ะ</span>
              </div>
            </div>

            {/* 🟢 2. กระดานวาดผัง (Canvas) (เพิ่ม print:mt-12 ให้เว้นระยะปลอดภัยจากขอบบน) */}
            <div
              ref={canvasRef} /* 👈 เติมคำสั่งนี้กลับเข้ามา เพื่อให้ระบบรู้พิกัดเมาส์ */
              className="canvas-print-area min-w-[2400px] relative bg-[url('https://transparenttextures.com/patterns/cubes.png')] print:min-w-0 print:bg-none print:mt-12"
              style={{ minHeight: `${maxCanvasHeight}px` }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {selectionBox && !isGuest && (
                <div className="absolute border-2 border-cyan-400 bg-cyan-400/20 z-[90] pointer-events-none shadow-[0_0_15px_rgba(34,211,238,0.3)]" style={{ left: Math.min(selectionBox.startX, selectionBox.currentX), top: Math.min(selectionBox.startY, selectionBox.currentY), width: Math.abs(selectionBox.currentX - selectionBox.startX), height: Math.abs(selectionBox.currentY - selectionBox.startY) }} />
              )}

              {/* หมายเหตุ: นำเอา Print Header อันเก่าที่เคยอยู่ตรงนี้ออกไปแล้ว เพื่อไม่ให้เกิดภาพซ้อน */}

              {layoutItems.map(item => {

                if (!item || !item.id) return null;

                // 🟢 1. แทรกการตรวจจับ isMatch (ค้นหาแบบไม่สนตัวพิมพ์เล็ก-ใหญ่)
                const queryLower = searchQuery ? searchQuery.toLowerCase() : '';
                const isMatch = queryLower && item.type === 'table' && (
                  item.label?.toLowerCase().includes(queryLower) ||
                  item.subLabel?.toLowerCase().includes(queryLower) ||
                  item.seatedIds?.some((id: string) => attendeesList.find(a => a.id === id)?.fullname.toLowerCase().includes(queryLower))
                );

                // 🟢 กำหนดสถานะและสีของโต๊ะ
                let itemStyle = "bg-zinc-900 border-zinc-500 text-zinc-400 px-4 py-2 rounded-lg";
                let textColor = "text-zinc-400";

                if (item.type === 'table') {
                  const sCount = item.seatedCount || 0;
                  const cap = item.capacity || mealInfo?.seats_per_table || 8;

                  if (item.id.includes('extra')) {
                    itemStyle = "bg-[#0a0a0a] border-amber-500/80 text-amber-400 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex-col shadow-[0_0_15px_rgba(245,158,11,0.1)] print:border-black print:text-black print:bg-white";
                    textColor = "text-amber-400";
                  } else if (sCount >= cap) { // เต็ม
                    itemStyle = "bg-emerald-950/40 border-emerald-500 text-emerald-400 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex-col shadow-[0_0_15px_rgba(16,185,129,0.2)] print:border-black print:text-black print:bg-white";
                    textColor = "text-emerald-400";
                  } else if (sCount > 0) { // ไม่เต็ม
                    itemStyle = "bg-blue-950/40 border-blue-500 border-dashed text-blue-400 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex-col shadow-[0_0_15px_rgba(59,130,246,0.2)] print:border-black print:text-black print:bg-white";
                    textColor = "text-blue-400";
                  } else { // ว่าง
                    itemStyle = "bg-[#0a0a0a] border-zinc-500 text-zinc-500 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex-col print:border-black print:text-black print:bg-white";
                    textColor = "text-zinc-400";
                  }

                  // 🟢 2. หากค้นหาเจอ (isMatch = true) ให้บวกคลาสเรืองแสงสีชมพูทับเข้าไปใน itemStyle
                  if (isMatch) {
                    itemStyle += " ring-4 ring-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.8)] scale-110 z-[100] bg-pink-900/40 print:ring-0 print:shadow-none print:scale-100 print:bg-white";
                  }
                }
                // สไตล์วัตถุอื่นๆ
                else if (item.type === 'stage') itemStyle = "bg-gradient-to-b from-orange-900/80 to-black border-orange-500/50 text-orange-400 rounded-b-3xl rounded-t-sm w-64 h-16 shadow-2xl print:border-black print:text-black print:bg-gray-200";
                else if (item.type === 'projector') itemStyle = "bg-zinc-800/80 border-zinc-400/50 text-zinc-300 rounded-sm w-40 h-6 print:border-black print:text-black";
                else if (item.type === 'backdrop') itemStyle = "bg-purple-950/80 border-purple-500/50 text-purple-300 rounded-md w-32 h-8 print:border-black print:text-black";
                else if (item.type === 'food-station') itemStyle = "bg-orange-950/80 border-orange-500/50 text-orange-400 rounded-lg w-40 h-10 print:border-black print:text-black";
                else if (item.type === 'buffet') itemStyle = "bg-pink-950/80 border-pink-500/50 text-pink-400 rounded-lg w-32 h-10 print:border-black print:text-black";
                else if (item.type === 'restroom-m') itemStyle = "bg-blue-950/80 border-blue-500/50 text-blue-400 rounded-lg w-28 h-10 print:border-black print:text-black";
                else if (item.type === 'restroom-w') itemStyle = "bg-rose-950/80 border-rose-500/50 text-rose-400 rounded-lg w-28 h-10 print:border-black print:text-black";
                else if (item.type === 'entrance') itemStyle = "bg-emerald-950/80 border-emerald-500/50 text-emerald-400 rounded-xl px-6 py-2 print:border-black print:text-black";
                else if (item.type === 'emergency') itemStyle = "bg-red-950/80 border-red-500/50 text-red-400 rounded-lg px-4 py-2 ring-2 ring-red-500/20 print:border-black print:text-black";
                else if (item.type === 'pillar') itemStyle = "bg-zinc-900 border-zinc-700 text-zinc-500 w-10 h-10 rounded-md print:border-black print:text-black print:bg-gray-300";
                else if (item.type === 'carpet') itemStyle = "bg-red-900/30 border-red-500/50 text-red-300 w-48 h-16 rounded-sm shadow-inner print:border-red-500 print:text-red-500 print:bg-red-100";
                else if (item.type === 'zone-label') itemStyle = "bg-[#0a0a0a] border border-white/10 text-cyan-400 px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest shadow-lg print:border-black print:text-black print:bg-white";

                const isSelected = selectedIds.includes(item.id);
                const showControls = isSelected && selectedIds[0] === item.id && !dragState?.active && !selectionBox && !isGuest;

                const isSearching = searchQuery.trim().length > 0;

                const searchOpacityClass = isSearching && !isMatch ? 'opacity-20 grayscale' : 'opacity-100';
                const searchHighlightClass = isMatch ? `ring-4 ${isGuest ? 'ring-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.8)]' : 'ring-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.8)]'} animate-pulse z-[60]` : '';

                return (
                  <div
                    key={item.id}
                    onPointerDown={(e) => {
                      if (isGuest) {
                        // 🟢 ถ้าเป็น Guest ให้คลิกเปิด Modal ดูรายชื่อโต๊ะได้ทันที
                        e.stopPropagation();
                        setViewTableId(item.id);
                      } else {
                        // 🟢 ถ้าเป็น Admin ให้รันฟังก์ชันลากโต๊ะตามปกติ
                        handleItemPointerDown(e, item.id);
                      }
                    }}
                    className={`draggable-item absolute flex items-center justify-center border-2 transition-all select-none
                      ${itemStyle} ${searchOpacityClass || ''} ${searchHighlightClass || ''}
                      ${isGuest ? 'cursor-pointer hover:scale-105 hover:z-50' : 'cursor-grab'} 
                      ${dragState?.active && isSelected ? 'cursor-grabbing z-[80] shadow-[0_15px_30px_rgba(0,0,0,0.8)] opacity-90' : !isGuest ? 'z-10 hover:border-white/50 hover:z-20' : 'z-10'}
                      ${isSelected && !dragState?.active && !isGuest ? 'ring-4 ring-cyan-500/50 border-cyan-400 z-30' : ''} print:ring-0`}
                    style={{ left: `${item.x}px`, top: `${item.y}px`, transform: `rotate(${item.rotation || 0}deg)`, touchAction: 'none' }}
                  >
                    {showControls && (
                      <div className="absolute -top-14 flex gap-2 z-[100] bg-cyan-950 p-2 rounded-xl border border-cyan-500/50 shadow-[0_10px_30px_rgba(34,211,238,0.3)] print:hidden whitespace-nowrap">
                        {/* 🟢 ปุ่มดูรายชื่อในโต๊ะ (โชว์เมื่อเลือกโต๊ะเดียว) */}
                        {selectedIds.length === 1 && item.type === 'table' && (
                          <button
                            onPointerDown={(e) => { e.stopPropagation(); setViewTableId(item.id); }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                          >
                            <List size={12} /> ข้อมูลโต๊ะ
                          </button>
                        )}
                        {/* 🟢 ปุ่มเพิ่ม Walk-in ใช้ onPointerDown */}
                        {selectedIds.length === 1 && item.type === 'table' && (item.seatedCount || 0) < (item.capacity || 8) && (
                          <button
                            onPointerDown={(e) => handleQuickWalkIn(e, item.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                          >
                            <UserPlus size={12} /> +1 แขกหน้างาน
                          </button>
                        )}

                        {selectedIds.length > 1 && <span className="text-[10px] text-cyan-400 font-bold self-center mr-1">เลือก {selectedIds.length} ชิ้น</span>}

                        {/* 🟢 ปุ่มหมุน และ ลบ ก็ต้องใช้ onPointerDown เช่นกัน */}
                        <button onPointerDown={(e) => { e.stopPropagation(); handleGroupRotate(e as any); }} className="bg-zinc-800 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors"><RotateCw size={14} /></button>
                        <button onPointerDown={(e) => { e.stopPropagation(); handleGroupDelete(e as any); }} className="bg-zinc-800 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    )}

                    {item.type === 'table' ? (
                      <>
                        {/* 🟢 แสดงเลขโต๊ะ */}
                        <span className={`font-black text-sm sm:text-base font-mono ${textColor} print:text-black`}>{item.label}</span>

                        {/* 🟢 แสดงตัวเลขจำนวนคนนั่งในโต๊ะจริง */}
                        {!item.id.includes('extra') && (
                          <span className="text-[8px] font-black bg-black/80 px-1.5 py-0.5 rounded-md mt-0.5 border border-white/10 text-white print:border-none print:text-black print:bg-transparent">
                            {item.seatedCount || 0}/{item.capacity || 8}
                          </span>
                        )}

                        <span className="text-[7px] truncate w-[150%] text-center px-1 py-0.5 font-bold absolute -bottom-4 text-zinc-300 bg-black/90 rounded-md border border-white/10 shadow-lg print:bg-transparent print:border-none print:text-black">{item.subLabel || 'โต๊ะ'}</span>
                      </>
                    ) : (
                      <span className="font-black text-[10px] tracking-widest uppercase flex items-center gap-2 text-center leading-tight pointer-events-none">
                        {item.type !== 'pillar' && item.type !== 'zone-label' && !isGuest && <Move size={12} className="opacity-40 shrink-0 print:hidden" />}
                        {item.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {isManualOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          <div className="absolute inset-0 bg-black/10 animate-in fade-in duration-200 cursor-pointer" onClick={() => setIsManualOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#050505]/95 backdrop-blur-xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-zinc-900/80 to-[#0a0a0a]/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg font-black flex items-center justify-center w-8 h-8 border border-blue-500/30">?</div>
                <div>
                  <h2 className="text-lg font-black text-white">คู่มือการวาดผังอิสระ</h2>
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase">Freeform Layout Builder</p>
                </div>
              </div>
              <button onClick={() => setIsManualOpen(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-7">
              <section className="space-y-3">
                <h3 className="text-xs font-black text-amber-500 tracking-widest uppercase flex items-center gap-2 border-b border-white/10 pb-2">1. สิ่งที่ต้องทำมาก่อน (Prerequisites)</h3>
                <p className="text-xs text-zinc-400 leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">ระบบจะดึงโครงสร้างโต๊ะมาจาก <strong className="text-amber-400">Meal Planner</strong> คุณต้องวาดโซน จัดโต๊ะ และกด <strong className="text-white">"บันทึก"</strong> จากหน้านั้นให้เรียบร้อยก่อน</p>
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/10 pb-2">2. การใช้กล่องเครื่องมือ</h3>
                <ul className="space-y-3 text-xs text-zinc-400">
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">🔹</span><div><strong className="text-white block">เพิ่มวัตถุตกแต่ง:</strong> คลิกปุ่มในแผง "วัตถุจัดงาน" ซ้ายมือ วัตถุจะปรากฏกลางจอ</div></li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">🔹</span><div><strong className="text-white block">เพิ่มโต๊ะเสริม:</strong> กดปุ่ม "➕ เพิ่มโต๊ะเสริมลอย" ด้านล่างสุด เพื่อสร้างโต๊ะที่ไม่มีในรายชื่อหลัก</div></li>
                  <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">🔹</span><div><strong className="text-white block">ค้นหาโต๊ะ:</strong> พิมพ์ชื่อหน่วยงาน หรือชื่อบุคคล(กรณีได้ลงทะเบียนแจ้งรายชื่อไว้แล้ว) ในช่องค้นหา โต๊ะนั้นจะเรืองแสงกระพริบให้เห็นชัดเจน</div></li>
                </ul>
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-black text-purple-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/10 pb-2">3. การควบคุมและ Multi-Select</h3>
                <ul className="space-y-3 text-xs text-zinc-400">
                  <li className="bg-zinc-900/50 p-3 rounded-xl border border-white/5"><strong className="text-purple-300 block mb-1">🖱️ ลากคลุมเลือกหลายชิ้น</strong>คลิกพื้นที่ว่างค้างไว้แล้วลากกรอบคลุมวัตถุหลายๆ ชิ้น เพื่อย้าย หมุน หรือลบพร้อมกัน</li>
                  <li><strong className="text-white block">ย้าย / หมุน / ลบ:</strong> ลากเพื่อย้ายที่, คลิกเลือกแล้วใช้แผงเมนูลอยกดปุ่ม 🔄 เพื่อหมุน หรือ 🗑️ เพื่อลบทิ้ง</li>
                  <li><strong className="text-white block">คลิกที่โต๊ะ คลิกปุ่ม "ข้อมูลโต๊ะ" จะแสดงชื่อแขกที่นั่งโต๊ะนั้น :</strong> กรณีโต๊ะที่ยังมีที่นั่งว่าง คลิกปุ่ม +Walk in เพื่อเพิ่มแขกนั่งโต๊ะ โดยจระบุชื่อ หรือชื่อเล่น หรือไม่ระบุก็ได้ กรณีไม่ระบุ ระบบ จะกำหนดชื่อเป็น Walkin(เลขรหัส)ให้อัตโนมัติ</li>
                  <li><strong className="text-white block">คลิกที่โต๊ะ คลิกปุ่ม "+1แขกหน้างาน" เพื่อเพิ่มแขกนั่งโต๊ะ" :</strong> กรณีโต๊ะที่ยังมีที่นั่งว่าง  โดยจะบุชื่อ หรือชื่อเล่น เพื่อประโยชน์ในการค้นหาภายหลัง หรือไม่ระบุก็ได้ กรณีไม่ระบุ ระบบจะกำหนดชื่อเป็น Walkin(เลขรหัส)ให้อัตโนมัติ</li>
                  <li><strong className="text-white block">การจัดแขกที่ลงทะเบียนในระบบล่วงหน้าแล้ว จัดการที่หน้า "จัดห้องจัดเลี้ยง Matrix Banquet Planner" :</strong> รวมถึงการการย้ายแขกเปลี่ยนโต๊ะนั่ง</li>
                </ul>
              </section>
              <section className="space-y-3">
                <h3 className="text-xs font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/10 pb-2">4. การพิมพ์และโหมดแขก</h3>
                <ul className="space-y-3 text-xs text-zinc-400">
                  <li><strong className="text-white block">สั่งพิมพ์:</strong> กดปุ่ม <strong className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">พิมพ์ / PDF</strong> ระบบจะซ่อนเครื่องมือและปรับเป็นกระดาษ A4 แนวนอนอัตโนมัติ</li>
                  <li><strong className="text-white block">โหมด Guest (ดูได้อย่างเดียว):</strong> นำลิงก์หน้านี้ไปเติม <code>&guest=true</code> ต่อท้าย แล้วส่งให้แขกดูผังและใช้ช่องค้นหาได้ โดยไม่สามารถขยับโต๊ะได้</li>
                </ul>
              </section>
            </div>
            <div className="p-5 border-t border-white/10 bg-[#050505] shrink-0">
              <button onClick={() => setIsManualOpen(false)} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-colors">เข้าใจแล้ว</button>
            </div>
          </div>
        </div>
      )}
      {/* ==================== 🟢 MODAL 1: ข้อมูลโต๊ะ (Table Info) ==================== */}
      {viewTableId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden" onPointerDown={() => setViewTableId(null)}>
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-[90%] max-w-md shadow-2xl" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-black text-white">โต๊ะ {layoutItems.find(i => i.id === viewTableId)?.label}</h2>
                <p className="text-cyan-400 font-bold text-sm">{layoutItems.find(i => i.id === viewTableId)?.subLabel || 'ไม่มีระบุหน่วยงาน'}</p>
              </div>
              <button onClick={() => setViewTableId(null)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="bg-black/50 rounded-xl p-3 max-h-[300px] overflow-y-auto">
              <h3 className="text-xs font-black text-zinc-400 mb-2 border-b border-white/5 pb-2">รายชื่อผู้นั่ง ({layoutItems.find(i => i.id === viewTableId)?.seatedCount || 0} คน)</h3>
              <ul className="space-y-2">
                {layoutItems.find(i => i.id === viewTableId)?.seatedIds?.map((guestId: string, idx: number) => {
                  const guest = attendeesList.find(a => a.id === guestId);
                  return (
                    <li key={idx} className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">{idx + 1}</span>
                      {guest ? guest.fullname : 'ไม่ทราบชื่อ'}
                      {guest?.attendee_type === 'Walk-in' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">Walk-in</span>}
                    </li>
                  );
                })}
                {!(layoutItems.find(i => i.id === viewTableId)?.seatedIds?.length) && <li className="text-sm text-zinc-500 italic">ยังไม่มีแขกนั่งที่โต๊ะนี้</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 🟢 MODAL 2: สรุปรายงาน Walk-in ==================== */}
      {showWalkInReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden" onPointerDown={() => setShowWalkInReport(false)}>
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-[90%] max-w-3xl shadow-2xl flex flex-col max-h-[85vh]" onPointerDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-amber-500 flex items-center gap-2"><Clock size={20} /> รายงานกลุ่ม Walk-in หน้างาน</h2>
              <button onClick={() => setShowWalkInReport(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-black text-white">{attendeesList.filter(a => a.attendee_type === 'Walk-in').length}</div>
                <div className="text-xs font-bold text-zinc-400 mt-1">Walk-in ทั้งหมด (คน)</div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 bg-black/50 rounded-xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-zinc-400 text-xs uppercase font-black sticky top-0">
                  <tr><th className="px-4 py-3">เวลา</th><th className="px-4 py-3">ชื่อ-สกุล</th><th className="px-4 py-3">นั่งโต๊ะที่</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-bold">
                  {attendeesList.filter(a => a.attendee_type === 'Walk-in').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(guest => {
                    // หาว่าแขกคนนี้นั่งโต๊ะไหน
                    const assignedTable = layoutItems.find(item => item.type === 'table' && item.seatedIds?.includes(guest.id));
                    return (
                      <tr key={guest.id} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-zinc-400">{new Date(guest.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 text-amber-400">{guest.fullname}</td>
                        <td className="px-4 py-3 text-cyan-400">{assignedTable ? `โต๊ะ ${assignedTable.label} (${assignedTable.subLabel})` : 'ไม่พบข้อมูลโต๊ะ'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VenueBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center font-bold text-amber-500 tracking-widest">Loading...</div>}>
      <VenueBuilderContent />
    </Suspense>
  );
}