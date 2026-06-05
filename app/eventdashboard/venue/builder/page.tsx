"use client";
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Move, Save, DoorOpen, Droplets, Mic2, Car, MousePointerSquareDashed, 
  Trash2, Calendar, Hash, ArrowRight, Ticket, Utensils, RotateCw 
} from 'lucide-react';

function VenueBuilderContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || '';
  const router = useRouter();

  const [mealInfo, setMealInfo] = useState<any>(null);
  const [layoutItems, setLayoutItems] = useState<any[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchLayout = async () => {
      const { data: mealData } = await supabase.from('event_meals').select('*').eq('event_id', eventId).maybeSingle();
      if (!mealData) return;
      setMealInfo(mealData);

      if (mealData.venue_layout_json && mealData.venue_layout_json.length > 0) {
        setLayoutItems(mealData.venue_layout_json);
      } else {
        const { data: tableData } = await supabase.from('event_meal_tables').select('*').eq('meal_id', mealData.id).order('table_number');
        if (tableData) {
          const initialLayout = tableData.map((t) => ({
            id: `table-${t.id}`,
            type: 'table',
            label: `${getExcelColLetter(t.grid_col_index)}${t.grid_row_index + 1}`,
            subLabel: t.group_name,
            x: 50 + (t.grid_col_index * 80),
            y: 100 + (t.grid_row_index * 80),
            rotation: 0
          }));
          setLayoutItems(initialLayout);
        }
      }
    };
    if (eventId) fetchLayout();
  }, [eventId]);

  const getExcelColLetter = (colIdx: number) => {
    let letter = "";
    let temp = colIdx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // 🖱️ ระบบลากและวาง
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    setSelectedId(id);
    const el = (e.target as HTMLElement).closest('.draggable-item') as HTMLElement;
    if (el && canvasRef.current) {
      const itemRect = el.getBoundingClientRect();
      setDragOffset({ x: e.clientX - itemRect.left, y: e.clientY - itemRect.top });
      setDraggingId(id);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - canvasRect.left - dragOffset.x;
    let newY = e.clientY - canvasRect.top - dragOffset.y;
    setLayoutItems(prev => prev.map(item => item.id === draggingId ? { ...item, x: newX, y: newY } : item));
  };

  const handlePointerUp = () => {
    // 🗑️ เช็คระบบ "ลากออกนอกกรอบเพื่อลบ"
    if (draggingId && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const item = layoutItems.find(i => i.id === draggingId);
      if (item) {
        // ถ้าพิกัด x, y หลุดขอบออกไปมากเกินไป (เช่น ลากทะลุจอ) ให้ลบทิ้ง
        if (item.x < -50 || item.y < -50 || item.x > canvasRect.width || item.y > canvasRect.height) {
          handleDeleteItem(item.id, item.type, true);
        }
      }
    }
    setDraggingId(null);
  };

  // ➕ เพิ่มไอเทมใหม่
  const addNewItem = (type: string, label: string) => {
    const newItem = { id: `item-${Date.now()}`, type, label, x: 20, y: 20, rotation: 0 };
    setLayoutItems([...layoutItems, newItem]);
  };

  // 🪑 สร้างโต๊ะเสริม
  const handleAddExtraTable = async () => {
    if (!mealInfo) return;
    const tName = prompt("ระบุชื่อโต๊ะเสริม (เช่น VIP-เสริม, หน้าประตู):", "เสริม-1");
    if (!tName) return;

    try {
      const { data: newTable, error } = await supabase.from('event_meal_tables').insert({
        meal_id: mealInfo.id, table_number: 900 + Math.floor(Math.random() * 99), 
        group_name: `(เสริม) ${tName}`, status: 'confirmed',
        grid_row_index: -1, grid_col_index: -1, table_capacity: mealInfo.seats_per_table || 8
      }).select().single();
      if (error) throw error;

      const newItem = { id: `table-${newTable.id}`, type: 'table', label: tName, subLabel: 'โต๊ะเสริม', x: 50, y: 50, rotation: 0 };
      setLayoutItems([...layoutItems, newItem]);
    } catch (err: any) { alert('❌ เกิดข้อผิดพลาด: ' + err.message); }
  };

  // 🗑️ ระบบลบวัตถุ (กดปุ่มลบ หรือ ลากออกนอกจอ)
  const handleDeleteItem = async (id: string, type: string, autoDelete = false) => {
    // นำ confirm ออกเพื่อให้ระบบสัมผัสทำงานลื่นไหล 100%
    if (type === 'table') {
      const tableDbId = id.replace('table-', '');
      await supabase.from('event_meal_tables').delete().eq('id', tableDbId);
    }
    setLayoutItems(prev => prev.filter(item => item.id !== id));
    setSelectedId(null);
    setDraggingId(null);
  };

  // 🔄 ระบบหมุนวัตถุ (ทีละ 45 องศา)
  const handleRotateItem = (id: string) => {
    setLayoutItems(prev => prev.map(item => item.id === id ? { ...item, rotation: ((item.rotation || 0) + 45) % 360 } : item));
  };

  // 💾 บันทึก
  const handleSaveLayout = async () => {
    if (!mealInfo) return;
    try {
      const { error } = await supabase.from('event_meals').update({ venue_layout_json: layoutItems }).eq('id', mealInfo.id);
      if (error) throw error;
      alert('✅ บันทึกผังห้องจัดเลี้ยงเรียบร้อยแล้ว!');
    } catch (err: any) { alert('❌ เกิดข้อผิดพลาด: ' + err.message); }
  };

  if (!mealInfo) return <div className="p-10 text-center font-bold text-white bg-[#020617] min-h-screen">กำลังโหลด Canvas...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 flex flex-col h-screen overflow-hidden">
      
      {/* 🌟 Header & Branding */}
      <div className="bg-zinc-900/80 p-5 rounded-2xl border border-white/5 mb-4 shrink-0 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          
          {/* ซ้าย: ข้อมูลงาน และปุ่ม Save */}
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex flex-wrap gap-4 p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] font-bold text-zinc-400">
              <div className="flex items-center gap-2"><Utensils size={18} className="text-amber-500 shrink-0"/> ห้อง/มื้ออาหาร: <span className="text-amber-400 font-black">{mealInfo.meal_name}</span></div>
              <div className="flex items-center gap-2"><Calendar size={18} className="text-blue-400 shrink-0"/> วันที่จัดงาน: <span className="text-white font-black">{mealInfo.meal_date || 'ไม่ระบุ'}</span></div>
              <div className="flex items-center gap-2"><Hash size={18} className="text-emerald-400 shrink-0"/> จำนวนโต๊ะในผัง: <span className="text-emerald-400 font-mono text-base sm:text-lg font-black">{layoutItems.filter(i => i.type === 'table').length}</span> โต๊ะ</div>
            </div>

            <button onClick={handleSaveLayout} className="w-fit px-5 py-2.5 bg-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-500 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
              <Save size={16} /> บันทึกผังห้อง
            </button>
          </div>

          {/* ขวา: โลโก้ภาพ และตัวหนังสือสีฟ้านีออน */}
          <div className="flex flex-col items-start md:items-end w-full md:w-auto mt-2 md:mt-0">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa Smart Event" className="h-10 md:h-12 object-contain mb-1" />
            <span className="text-[10px] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] tracking-widest uppercase font-black">
              ระบบบริหารการจัดงานดิจิทัลอัจฉริยะ
            </span>
          </div>

        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        
        {/* 🧰 แผงเครื่องมือ (Toolbox) */}
        <div className="lg:w-64 bg-black/60 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shrink-0 overflow-y-auto">
          <h3 className="text-sm font-black text-amber-500 border-b border-white/10 pb-2 flex items-center gap-2"><MousePointerSquareDashed size={16}/> เครื่องมือวาดผัง</h3>
          
          <div className="space-y-2">
            <button onClick={() => addNewItem('stage', 'เวทีหลัก (Stage)')} className="w-full flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/5 hover:border-amber-500 transition-colors text-xs font-bold text-left">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><Mic2 size={16} /></div> วาดเวทีหลัก
            </button>
            <button onClick={() => addNewItem('entrance', 'ประตูทางเข้า')} className="w-full flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/5 hover:border-emerald-500 transition-colors text-xs font-bold text-left">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><DoorOpen size={16} /></div> วาดประตูทางเข้า
            </button>
            <button onClick={() => addNewItem('restroom', 'ห้องน้ำ')} className="w-full flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/5 hover:border-cyan-500 transition-colors text-xs font-bold text-left">
              <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg"><Droplets size={16} /></div> วาดป้ายห้องน้ำ
            </button>
            <button onClick={() => addNewItem('parking', 'ลานจอดรถ')} className="w-full flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-white/5 hover:border-blue-500 transition-colors text-xs font-bold text-left">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Car size={16} /></div> วาดป้ายลานจอดรถ
            </button>

            <div className="border-t border-white/10 my-2 pt-2"></div>
            
            <button onClick={handleAddExtraTable} className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-amber-950/50 to-orange-950/50 rounded-xl border border-amber-500/30 hover:border-amber-400 transition-colors text-xs font-black text-left shadow-lg">
              <span className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/50"><div className="w-3 h-3 rounded-full bg-amber-400" /></div>
                เพิ่มโต๊ะเสริม (นอกผัง)
              </span>
              <span className="text-amber-400">➕</span>
            </button>
          </div>

          <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2">
            <button onClick={() => router.push(`/eventdashboard/create/agenda?event_id=${eventId}`)} className="w-full p-3 bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-[11px] font-black flex justify-between items-center">
              ตั้งค่ากำหนดการ/อาหาร <ArrowRight size={14} />
            </button>
            <button onClick={() => router.push(`/eventdashboard/create/invitation?event_id=${eventId}`)} className="w-full p-3 bg-pink-900/30 text-pink-300 border border-pink-500/30 rounded-xl hover:bg-pink-600 hover:text-white transition-all text-[11px] font-black flex justify-between items-center">
              ตั้งค่าบัตรเชิญเข้างาน <Ticket size={14} />
            </button>
          </div>
        </div>

        {/* 🗺️ กระดานวาดผัง (Canvas Area) */}
        <div className="flex-1 bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-700 relative overflow-hidden bg-[url('https://transparenttextures.com/patterns/cubes.png')] shadow-inner"
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerLeave={handlePointerUp}
             onClick={() => setSelectedId(null)}
             ref={canvasRef}
        >
          <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-500 pointer-events-none">
            💡 ทริค: ลากวัตถุออกนอกกรอบเพื่อลบทิ้ง
          </div>

          {layoutItems.map(item => {
            let itemStyle = "bg-zinc-900 border-zinc-500 text-zinc-400";
            if (item.type === 'table') itemStyle = "bg-amber-950 border-amber-500 text-amber-400 rounded-full w-14 h-14 flex-col";
            if (item.type === 'stage') itemStyle = "bg-orange-950 border-orange-500 text-orange-400 rounded-lg w-48 h-12";
            if (item.type === 'entrance') itemStyle = "bg-emerald-950 border-emerald-500 text-emerald-400 rounded-lg px-4 py-2";
            if (item.type === 'restroom') itemStyle = "bg-cyan-950 border-cyan-500 text-cyan-400 rounded-lg px-4 py-2";
            if (item.type === 'parking') itemStyle = "bg-blue-950 border-blue-500 text-blue-400 rounded-lg px-4 py-2";

            const isSelected = selectedId === item.id;
            const isDragging = draggingId === item.id;

            return (
              <div 
                key={item.id}
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, item.id); }}
                className={`draggable-item absolute flex items-center justify-center border-2 cursor-grab shadow-lg transition-shadow select-none
                  ${itemStyle} 
                  ${isDragging ? 'cursor-grabbing scale-105 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.8)] opacity-90' : 'z-10 hover:border-white hover:z-20'}
                  ${isSelected && !isDragging ? 'ring-4 ring-white/30 z-30' : ''}`}
                style={{ 
                  left: `${item.x}px`, top: `${item.y}px`, 
                  transform: `rotate(${item.rotation || 0}deg)`, 
                  touchAction: 'none' 
                }}
              >
                {/* 🛠️ แผงควบคุมลอย (หมุน / ลบ) */}
                {isSelected && !isDragging && (
                  <div className="absolute -top-10 flex gap-2 z-50 bg-zinc-800 p-1.5 rounded-lg border border-white/10 shadow-2xl">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRotateItem(item.id); }}
                      className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-md transition-transform hover:scale-110"
                      title="หมุน 45 องศา"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id, item.type, true); }}
                      className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-md transition-transform hover:scale-110"
                      title="ลบทิ้ง"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {item.type === 'table' ? (
                  <>
                    <span className="font-black text-xs font-mono">{item.label}</span>
                    <span className="text-[6px] truncate w-full text-center px-1 font-bold absolute -bottom-4 text-zinc-500">{item.subLabel}</span>
                  </>
                ) : (
                  <span className="font-black text-[10px] tracking-wide flex items-center gap-2">
                    <Move size={12} className="opacity-50" /> {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function VenueBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center font-bold text-white">กำลังโหลด...</div>}>
      <VenueBuilderContent />
    </Suspense>
  );
}