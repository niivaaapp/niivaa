"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, ConciergeBell, Info, MapPin, Car, Droplets, DoorOpen, Map, Wifi } from 'lucide-react';

function GuestSeatingContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || '';

  const [mealInfo, setMealInfo] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [myTable, setMyTable] = useState<any>(null);
  const [announcement, setAnnouncement] = useState('');
  const [serviceMsg, setServiceMsg] = useState('');
  
  // สถานะสลับหน้าจอ (search = ค้นหาโต๊ะ, map = ดูแผนผังรวม)
  const [activeTab, setActiveTab] = useState<'search' | 'map'>('search');

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

  // 2. ฟังเสียงประกาศจาก Admin
  useEffect(() => {
    const channel = supabase.channel('announcements')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_announcements' }, (payload) => {
        setAnnouncement(payload.new.message);
        setTimeout(() => setAnnouncement(''), 10000); 
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
      setActiveTab('search'); // บังคับสลับมาหน้าค้นหาเพื่อดูผลลัพธ์
    } else {
      alert('❌ ไม่พบข้อมูลโต๊ะของคุณ กรุณาลองพิมพ์ชื่อกลุ่ม หรือเลขโต๊ะใหม่อีกครั้งครับ');
    }
  };

  const handleCallService = async () => {
    if (!myTable || !serviceMsg.trim()) return;
    try {
      await supabase.from('event_table_messages').insert({
        event_id: eventId, table_number: myTable.table_number, message: serviceMsg
      });
      alert('✅ ส่งข้อความให้พนักงานส่วนกลางเรียบร้อยแล้วครับ');
      setServiceMsg('');
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการส่งข้อความ');
    }
  };

  if (!mealInfo) return <div className="p-10 text-center text-zinc-500 font-bold bg-[#020617] min-h-screen flex items-center justify-center">กำลังโหลดข้อมูลห้องจัดเลี้ยง...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans relative pb-20">
      
      {/* 📢 Pop-up Announcement */}
      {announcement && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 flex gap-3 items-center">
          <Info size={24} className="shrink-0 text-indigo-200" />
          <p className="font-black text-sm">{announcement}</p>
        </div>
      )}

      {/* Header */}
      <div className="pt-8 pb-6 px-4 bg-gradient-to-b from-black to-[#020617] text-center border-b border-white/5 sticky top-0 z-40">
        <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 tracking-tight">
          NiiVaa Smart Guest
        </h1>
        <p className="text-xs text-zinc-400 mt-1">{mealInfo.meal_name}</p>

        {/* แถบสลับเมนู (Segmented Control) */}
        <div className="mt-5 flex bg-zinc-900/80 p-1 rounded-xl border border-white/10 max-w-sm mx-auto">
          <button onClick={() => setActiveTab('search')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'search' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Search size={14} /> ค้นหาโต๊ะ / บริการ
          </button>
          <button onClick={() => setActiveTab('map')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'map' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Map size={14} /> ผังห้อง & สิ่งอำนวยความสะดวก
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        
        {/* =========================================
            TAB 1: โซนค้นหาที่นั่ง และเรียกบริการ
            ========================================= */}
        {activeTab === 'search' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* 🔍 Search Box */}
            <div className="bg-zinc-900/60 p-5 rounded-3xl border border-white/10 shadow-xl">
              <label className="text-xs font-bold text-zinc-400 block mb-3">พิมพ์ชื่อกลุ่มคณะ หรือ เลขโต๊ะของท่าน</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="เช่น VIP, โรงเรียน... หรือ 1" 
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-amber-500"
                />
                <button onClick={handleSearch} className="bg-amber-600 text-white px-5 rounded-xl hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20 font-black">
                  ค้นหา
                </button>
              </div>
            </div>

            {/* 🎯 Result Display */}
            {myTable && (
              <div className="mt-6 bg-gradient-to-br from-amber-900/30 to-orange-900/30 p-6 rounded-3xl border border-amber-500/30 shadow-[0_10px_30px_rgba(245,158,11,0.1)]">
                <div className="text-center border-b border-amber-500/20 pb-5 mb-5">
                  <p className="text-xs text-amber-500 font-black tracking-widest uppercase mb-2">พิกัดโต๊ะของท่านคือ</p>
                  <div className="text-6xl font-black text-white font-mono tracking-tighter drop-shadow-md">
                    {getExcelColLetter(myTable.grid_col_index)}{myTable.grid_row_index + 1}
                  </div>
                  <p className="text-sm text-zinc-300 font-bold mt-3 bg-black/40 py-2 px-4 rounded-lg inline-block">{myTable.group_name}</p>
                </div>

                {/* แผงเรียกพนักงาน (Service Call) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black flex items-center gap-1.5 text-zinc-300">
                    <ConciergeBell size={16} className="text-emerald-400"/> บริการพิเศษถึงโต๊ะ (Smart Service)
                  </h3>
                  <textarea 
                    value={serviceMsg}
                    onChange={e => setServiceMsg(e.target.value)}
                    placeholder="พิมพ์ความประสงค์ เช่น ขอเก้าอี้เสริม 1 ตัว, ขอกระดาษทิชชู่, น้ำแข็ง 1 ถัง..."
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-emerald-500 text-white min-h-[80px] resize-none"
                  />
                  <button 
                    onClick={handleCallService} 
                    disabled={!serviceMsg.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black py-3 rounded-xl text-xs transition-all flex justify-center items-center shadow-lg shadow-emerald-900/20"
                  >
                    ส่งข้อความแจ้งพนักงาน
                  </button>
                </div>
              </div>
            )}

            {/* Quick Info Cards */}
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-full text-blue-400"><Wifi size={20}/></div>
                <h4 className="font-black text-xs">Wi-Fi ฟรี</h4>
                <p className="text-[10px] text-zinc-500">รหัส: NiiVaa2026</p>
              </div>
              <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-400"><Car size={20}/></div>
                <h4 className="font-black text-xs">ประทับตราจอดรถ</h4>
                <p className="text-[10px] text-zinc-500">ที่โต๊ะลงทะเบียนหน้างาน</p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 2: โซนแผนผังรวม และ Facilities
            ========================================= */}
        {activeTab === 'map' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            
            <div className="bg-black/60 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              <h3 className="text-sm font-black text-amber-500 mb-2 text-center flex items-center justify-center gap-2">
                <MapPin size={16} /> แผนผังห้องจัดเลี้ยง (Venue Map)
              </h3>
              <p className="text-center text-[10px] text-zinc-400 mb-6">สีส้มกระพริบ คือ โต๊ะที่ท่านค้นหาล่าสุด</p>
              
              {/* สภาพแวดล้อมห้องโถง (Hall Environment) */}
              <div className="relative border-4 border-zinc-800/80 rounded-3xl p-4 sm:p-8 bg-[#050505]">
                
                {/* 🚻 ป้ายบอกทางห้องน้ำ (ซ้าย) */}
                <div className="absolute top-1/2 -left-3 -translate-y-1/2 bg-cyan-900 border border-cyan-500 text-cyan-300 px-2 py-4 rounded-l-none rounded-r-xl shadow-lg flex flex-col items-center gap-2">
                  <Droplets size={14} />
                  <span className="text-[8px] font-black" style={{ writingMode: 'vertical-rl' }}>ไปห้องน้ำ</span>
                </div>

                {/* 🚪 ป้ายบอกทางเข้าออก (ขวา) */}
                <div className="absolute top-1/2 -right-3 -translate-y-1/2 bg-zinc-800 border border-zinc-600 text-zinc-300 px-2 py-4 rounded-l-xl rounded-r-none shadow-lg flex flex-col items-center gap-2">
                  <DoorOpen size={14} />
                  <span className="text-[8px] font-black" style={{ writingMode: 'vertical-rl' }}>ทางออกฉุกเฉิน</span>
                </div>

                {/* เวที */}
                <div className="w-[80%] h-8 bg-gradient-to-b from-zinc-800 to-black rounded-b-2xl border-b-4 border-amber-500 flex items-center justify-center mx-auto mb-8 shadow-[0_10px_20px_rgba(245,158,11,0.15)] relative">
                  <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase drop-shadow-md">เวทีหลัก (STAGE)</span>
                  {/* แสงไฟตกแต่งเวที */}
                  <div className="absolute -bottom-8 left-1/4 w-4 h-4 bg-yellow-400/20 rounded-full blur-xl"></div>
                  <div className="absolute -bottom-8 right-1/4 w-4 h-4 bg-yellow-400/20 rounded-full blur-xl"></div>
                </div>

                {/* ตารางผังโต๊ะ */}
                <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 relative z-10">
                  <div className="flex flex-col gap-5 sm:gap-6 items-center w-fit mx-auto min-w-max">
                    {Array.from({ length: mealInfo.grid_rows }).map((_, r) => (
                      <div key={r} className="flex gap-5 sm:gap-6 justify-center">
                        {Array.from({ length: mealInfo.grid_cols }).map((_, s) => {
                          const tData = tables.find(t => t.grid_row_index === r && t.grid_col_index === s);
                          if (!tData) return <div key={s} className="w-10 h-10 sm:w-12 sm:h-12 border border-dashed border-white/5 rounded-full opacity-10" />;

                          // ไฮไลต์ถ้าตรงกับโต๊ะที่ค้นหาไว้
                          const isMyTable = myTable && myTable.id === tData.id;
                          const tableStyle = isMyTable 
                            ? "bg-amber-500 border-white text-white shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse scale-110 z-20" 
                            : "bg-zinc-900/80 border-zinc-700 text-zinc-500";

                          return (
                            <div key={s} className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[2px] flex items-center justify-center transition-all ${tableStyle}`}>
                              <span className="font-black text-[10px] sm:text-xs font-mono">{getExcelColLetter(s)}{r + 1}</span>
                              {isMyTable && (
                                <div className="absolute -top-7 whitespace-nowrap bg-white text-black text-[10px] font-black px-2.5 py-1 rounded-md shadow-xl animate-bounce pointer-events-none before:content-[''] before:absolute before:-bottom-1 before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-white">
                                  📍 โต๊ะของท่าน
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ⬇️ ทางเข้าหลัก และจุดจอดรถ */}
                <div className="mt-8 border-t-2 border-dashed border-zinc-700 pt-4 flex flex-col items-center justify-center text-zinc-500">
                  <span className="text-[10px] font-black mb-2 flex items-center gap-2"><DoorOpen size={12}/> ประตูทางเข้าหลัก (Entrance)</span>
                  <div className="flex gap-4">
                    <span className="text-[9px] bg-zinc-900 px-2 py-1 rounded flex items-center gap-1 border border-white/5"><Car size={10} className="text-emerald-400"/> ลานจอดรถด้านนอก</span>
                    <span className="text-[9px] bg-zinc-900 px-2 py-1 rounded flex items-center gap-1 border border-white/5">📋 โต๊ะลงทะเบียน</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
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