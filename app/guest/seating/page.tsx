"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, ConciergeBell, Info } from 'lucide-react';

function GuestSeatingContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || '';

  const [mealInfo, setMealInfo] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [myTable, setMyTable] = useState<any>(null);
  const [announcement, setAnnouncement] = useState('');
  const [serviceMsg, setServiceMsg] = useState('');

  // 1. ดึงข้อมูลผังตั้งต้น
  useEffect(() => {
    const fetchVenueData = async () => {
      const { data: mealData } = await supabase.from('event_meals').select('*').eq('event_id', eventId).maybeSingle();
      if (mealData) {
        setMealInfo(mealData);
        const { data: tableData } = await supabase.from('event_meal_tables').select('*').eq('meal_id', mealData.id);
        if (tableData) setTables(tableData);
      }
    };
    if (eventId) fetchVenueData();
  }, [eventId]);

  // 2. ฟังเสียงประกาศจาก Admin (Realtime Pop-up)
  useEffect(() => {
    const channel = supabase.channel('announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_announcements' }, (payload) => {
        setAnnouncement(payload.new.message);
        setTimeout(() => setAnnouncement(''), 10000); // หายไปเองใน 10 วิ
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const getExcelColLetter = (colIdx: number) => {
    let letter = "";
    let temp = colIdx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    const found = tables.find(t => 
      t.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.table_number.toString() === searchTerm.trim()
    );
    if (found) {
      setMyTable(found);
    } else {
      alert('❌ ไม่พบข้อมูลโต๊ะของคุณ กรุณาลองพิมพ์ชื่อกลุ่ม หรือเลขโต๊ะใหม่อีกครั้งครับ');
    }
  };

  const handleCallService = async () => {
    if (!myTable || !serviceMsg.trim()) return;
    try {
      await supabase.from('event_table_messages').insert({
        event_id: eventId, 
        table_number: myTable.table_number, 
        message: serviceMsg
      });
      alert('✅ ส่งข้อความให้พนักงานส่วนกลางเรียบร้อยแล้วครับ พนักงานกำลังเดินทางมาให้บริการครับ');
      setServiceMsg('');
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการส่งข้อความ');
    }
  };

  if (!mealInfo) return <div className="p-10 text-center text-zinc-500 font-bold bg-[#020617] min-h-screen flex items-center justify-center">กำลังโหลดข้อมูลผังที่นั่ง...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 font-sans relative">
      
      {/* 📢 Pop-up Announcement จาก Admin */}
      {announcement && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 flex gap-3 items-center">
          <Info size={24} className="shrink-0 text-indigo-200" />
          <p className="font-black text-sm">{announcement}</p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8 mt-4">
        <h1 className="text-2xl font-black text-amber-500 tracking-tight">ระบบตรวจสอบผังที่นั่ง</h1>
        <p className="text-sm text-zinc-400 mt-1">{mealInfo.meal_name}</p>
      </div>

      {/* 🔍 Search Box */}
      <div className="bg-zinc-900/60 p-5 rounded-3xl border border-white/10 max-w-md mx-auto shadow-xl">
        <label className="text-xs font-bold text-zinc-400 block mb-3">ค้นหาตำแหน่งโต๊ะของคุณ</label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="พิมพ์ชื่อกลุ่ม หรือ เลขโต๊ะ..." 
            className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500 transition-colors"
          />
          <button onClick={handleSearch} className="bg-amber-600 text-white p-3 rounded-xl hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20">
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* 🎯 Result Display (แสดงเมื่อค้นหาเจอ) */}
      {myTable && (
        <div className="mt-6 bg-gradient-to-br from-amber-900/30 to-orange-900/30 p-6 rounded-3xl border border-amber-500/30 max-w-md mx-auto shadow-[0_10px_30px_rgba(245,158,11,0.1)] animate-in zoom-in-95">
          <div className="text-center border-b border-amber-500/20 pb-5 mb-5">
            <p className="text-xs text-amber-500 font-black tracking-widest uppercase mb-2">พิกัดโต๊ะของคุณคือ</p>
            <div className="text-6xl font-black text-white font-mono tracking-tighter drop-shadow-md">
              {getExcelColLetter(myTable.grid_col_index)}{myTable.grid_row_index + 1}
            </div>
            <p className="text-sm text-zinc-300 font-bold mt-3 bg-black/40 py-2 px-4 rounded-lg inline-block">{myTable.group_name}</p>
          </div>

          {/* แผงเรียกพนักงาน (Service Call) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black flex items-center gap-1.5 text-zinc-300">
              <ConciergeBell size={16} className="text-emerald-400"/> เรียกพนักงาน / แจ้งความประสงค์
            </h3>
            <textarea 
              value={serviceMsg}
              onChange={e => setServiceMsg(e.target.value)}
              placeholder="เช่น ขอเก้าอี้เสริม 1 ตัว, ขอกระดาษทิชชู่..."
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 text-white min-h-[80px] resize-none"
            />
            <button 
              onClick={handleCallService} 
              disabled={!serviceMsg.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black py-3 rounded-xl text-xs transition-all flex justify-center items-center shadow-lg shadow-emerald-900/20"
            >
              ส่งข้อความแจ้งส่วนกลาง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestSeatingPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-bold">กำลังโหลดระบบ...</div>}>
      <GuestSeatingContent />
    </Suspense>
  );
}