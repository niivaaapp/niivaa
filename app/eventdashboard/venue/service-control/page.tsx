"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Utensils, MessageSquare, Megaphone, CheckCircle2, User, Search, Map } from 'lucide-react';

// 1. แยกเนื้อหาหลักออกมาเป็น Component ย่อย
function ServiceControlContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || '';
  const router = useRouter();

  const [mealInfo, setMealInfo] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [announcementMsg, setAnnouncementMsg] = useState('');

  // 1. ดึงข้อมูลผังตั้งต้น
  useEffect(() => {
    const fetchVenueData = async () => {
      // ดึงโครงสร้างหลัก
      const { data: mealData } = await supabase.from('event_meals').select('*').eq('event_id', eventId).maybeSingle();
      if (mealData) setMealInfo(mealData);

      // ดึงสถานะโต๊ะทั้งหมด
      const { data: tableData } = await supabase.from('event_meal_tables').select('*').eq('meal_id', mealData?.id).order('table_number', { ascending: true });
      if (tableData) setTables(tableData);
    };
    if (eventId) fetchVenueData();
  }, [eventId]);

  // 2. รับข้อความแบบ Realtime จากแขก
  useEffect(() => {
    const channel = supabase.channel('table-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_table_messages' }, (payload) => {
        // มีข้อความเข้า -> เล่นเสียงแจ้งเตือน (ถ้ามีไฟล์เสียง)
        // const audio = new Audio('/alert-beep.mp3'); audio.play();
        setInbox(prev => [payload.new, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ฟังก์ชันแปลงตัวเลขเป็น A, B, C
  const getExcelColLetter = (colIdx: number) => {
    let letter = "";
    let temp = colIdx;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const handleUpdateTableStatus = async (tableId: string, field: string, currentValue: boolean) => {
    const { error } = await supabase.from('event_meal_tables').update({ [field]: !currentValue }).eq('id', tableId);
    if (!error) {
      setTables(tables.map(t => t.id === tableId ? { ...t, [field]: !currentValue } : t));
    }
  };

  const handleBroadcast = async () => {
    if (!announcementMsg.trim()) return;
    await supabase.from('event_announcements').insert({ event_id: eventId, message: announcementMsg });
    alert('📢 ส่งข้อความแจ้งเตือนไปยังผู้ร่วมงานทั้งหมดแล้ว!');
    setAnnouncementMsg('');
  };

  if (!mealInfo) return <div className="p-10 text-center text-zinc-500">กำลังโหลดผังจัดเลี้ยง...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-6 flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-white/5 mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-black text-amber-500 flex items-center gap-2"><Utensils /> Service Control Room (Master Map)</h1>
          <p className="text-xs text-zinc-400">ควบคุมสถานะโต๊ะ รับแจ้งเหตุ และดูแลแขกแบบเรียลไทม์</p>
        </div>
        <button onClick={() => router.back()} className="px-4 py-2 bg-zinc-800 rounded-xl text-xs font-bold hover:bg-zinc-700">ย้อนกลับ</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* =========================================
            แผงซ้าย (Col 8): Master Map Interactive
            ========================================= */}
        <div className="lg:col-span-8 bg-black/40 border border-white/5 rounded-3xl p-5 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="font-black text-sm flex items-center gap-2"><Map size={16} className="text-amber-500"/> ผังสถานะการเสิร์ฟ (Live Map)</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold">
               <div className="flex items-center gap-1"><span className="w-3 h-3 bg-zinc-800 rounded-full"></span> ยังไม่เสิร์ฟ</div>
               <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-900/80 border border-blue-500 rounded-full"></span> เครื่องดื่มแล้ว</div>
               <div className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-900/80 border border-emerald-500 rounded-full"></span> อาหารแล้ว</div>
            </div>
          </div>

          <div className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-zinc-700 pb-10">
            <div className="w-[60%] h-6 bg-zinc-800 rounded-b-xl border-b-2 border-amber-500 flex items-center justify-center mx-auto mb-8 shadow-lg">
              <span className="text-[8px] font-black text-zinc-400 tracking-widest uppercase">เวทีหลัก (Stage Area)</span>
            </div>

            <div className="flex flex-col gap-6 items-center w-fit mx-auto">
              {Array.from({ length: mealInfo.grid_rows }).map((_, r) => (
                <div key={r} className="flex gap-6 justify-center">
                  {Array.from({ length: mealInfo.grid_cols }).map((_, s) => {
                    const tData = tables.find(t => t.grid_row_index === r && t.grid_col_index === s);
                    if (!tData) return <div key={s} className="w-14 h-14 border border-dashed border-white/5 rounded-full opacity-10 flex items-center justify-center text-[8px] text-zinc-700">{getExcelColLetter(s)}{r + 1}</div>;

                    // สีกรอบตามสถานะการเสิร์ฟ
                    let ringColor = "border-zinc-700 bg-zinc-900/50";
                    if (tData.food_served) ringColor = "border-emerald-500 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                    else if (tData.drinks_served) ringColor = "border-blue-500 bg-blue-950/40 shadow-[0_0_10px_rgba(59,130,246,0.2)]";

                    return (
                      <div key={s} className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[3px] flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110 group ${ringColor}`}>
                        <span className="font-black text-[10px] sm:text-xs font-mono tracking-tighter text-white">{getExcelColLetter(s)}{r + 1}</span>
                        
                        {/* แผงควบคุมลอย (Hover Menu) */}
                        <div className="hidden group-hover:flex absolute -top-12 bg-zinc-900 border border-white/10 rounded-lg p-1.5 shadow-2xl z-50 gap-1 w-[120px] justify-center">
                          <button onClick={() => handleUpdateTableStatus(tData.id, 'drinks_served', tData.drinks_served)} className={`text-[9px] px-2 py-1 rounded font-bold ${tData.drinks_served ? 'bg-blue-600' : 'bg-zinc-800'}`}>🍺 น้ำ</button>
                          <button onClick={() => handleUpdateTableStatus(tData.id, 'food_served', tData.food_served)} className={`text-[9px] px-2 py-1 rounded font-bold ${tData.food_served ? 'bg-emerald-600' : 'bg-zinc-800'}`}>🍽️ อาหาร</button>
                        </div>

                        {/* ชื่อกลุ่ม */}
                        {tData.group_name && (
                          <div className="absolute -bottom-5 w-[200%] text-center text-zinc-400 text-[8px] font-bold truncate">
                            {tData.group_name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================
            แผงขวา (Col 4): Inbox & Broadcast
            ========================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* Inbox: ข้อความจากโต๊ะ */}
          <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-3xl p-5 flex flex-col overflow-hidden">
            <h3 className="font-black text-sm flex items-center justify-between mb-4 border-b border-white/10 pb-2">
              <span className="flex items-center gap-2"><MessageSquare size={16} className="text-cyan-400"/> คำขอจากผู้ร่วมงาน (Inbox)</span>
              <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{inbox.filter(m => m.status === 'unread').length} ใหม่</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin pr-1">
              {inbox.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs py-10 font-bold">ยังไม่มีคำขอรับบริการ</div>
              ) : (
                inbox.map((msg, i) => (
                  <div key={msg.id || i} className={`p-3 rounded-xl border ${msg.status === 'unread' ? 'bg-red-950/20 border-red-500/50' : 'bg-zinc-950 border-white/5'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-[11px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">โต๊ะ {getExcelColLetter(msg.table_number % mealInfo.grid_cols)}{Math.floor(msg.table_number / mealInfo.grid_cols) + 1}</span>
                      <span className="text-[9px] text-zinc-500">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-white font-medium">{msg.message}</p>
                    {msg.status === 'unread' && (
                      <button onClick={async () => {
                         await supabase.from('event_table_messages').update({ status: 'resolved' }).eq('id', msg.id);
                         setInbox(inbox.map(m => m.id === msg.id ? { ...m, status: 'resolved' } : m));
                      }} className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 size={12}/> กดเมื่อบริการเรียบร้อย
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Broadcast Center: ยิง Pop-up */}
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-3xl p-5 shrink-0">
             <h3 className="font-black text-sm flex items-center gap-2 mb-3 text-indigo-400"><Megaphone size={16}/> ประกาศส่วนกลาง (Broadcast)</h3>
             <textarea 
               value={announcementMsg} 
               onChange={e => setAnnouncementMsg(e.target.value)}
               placeholder="พิมพ์ข้อความที่ต้องการแจ้งเตือนไปยังหน้าจอแขกทุกคน..."
               className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 min-h-[80px] text-white resize-none"
             />
             <button onClick={handleBroadcast} className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2 rounded-xl text-xs shadow-lg transition-all">
               ส่งข้อความ Pop-up ทันที
             </button>
          </div>

        </div>

      </div>
    </div>
  );
}

// 2. ส่งออก Component หลักที่ครอบด้วย Suspense
export default function ServiceControlRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-bold">กำลังโหลดระบบ...</div>}>
      <ServiceControlContent />
    </Suspense>
  );
}