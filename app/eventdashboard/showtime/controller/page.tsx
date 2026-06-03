'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const QUESTION_BANK = [
  { q: "เมืองหลวงของประเทศไทยคือนครอะไร?", a: "กรุงเทพ" },
  { q: "ระบบบริหารจัดการอีเวนต์อัจฉริยะในงานนี้ชื่ออะไร?", a: "NiiVaa" },
  { q: "สัญลักษณ์ประจำจังหวัดสุรินทร์คือสัตว์ชนิดใด?", a: "ช้าง" }
];

interface MediaFile { name: string; url: string; type: 'image' | 'video'; }
interface AgendaItem {
  id: string; title: string; duration_minutes: number; sort_order: number;
  main_script: string; sub_script: string; visual_audio_cue: string;
  responsible_person: string; is_live_now: boolean; force_media_trigger: string;
}

export default function DirectorController() {
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  const [localQuestion, setLocalQuestion] = useState(QUESTION_BANK[0].q);
  const [localAnswer, setLocalAnswer] = useState(QUESTION_BANK[0].a);
  const [tickerMsg, setTickerMsg] = useState('');
  const [tickerDirection, setTickerDirection] = useState('rtl');
  const [tickerColor, setTickerColor] = useState('#FFFFFF');
  const [availableMedia, setAvailableMedia] = useState<MediaFile[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string[]>([]);

  // 💡 States ใหม่สำหรับระบการรันคิว (Timeline)
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [startTime, setStartTime] = useState('');
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editMainScript, setEditMainScript] = useState('');

  // ==========================================
  // 2. DATA LIFECYCLE & REALTIME SUBSCRIPTION
  // ==========================================
  const fetchAgendaData = async () => {
    const { data } = await supabase.from('event_agenda_items').select('*').order('sort_order', { ascending: true });
    if (data) setAgendaItems(data);
  };

  useEffect(() => {
    // ดึงข้อมูลสื่อ
    const fetchMedia = async () => {
      const { data } = await supabase.storage.from('event-media').list();
      if (data) {
        setAvailableMedia(data.map(f => {
          const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(f.name);
          return {
            name: f.name,
            url: urlData.publicUrl,
            // 🎯 เติม as 'video' | 'image' เข้าไปตรงนี้ครับ
            type: (f.name.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image') as 'video' | 'image'
          };
        }).filter(f => f.name.match(/\.(jpeg|jpg|gif|png|mp4|webm|ogg)$/i)));
      }
    };

    fetchMedia();
    fetchAgendaData();

    // ⚡ ดักฟังระบบ Realtime คิวงาน (ถ้าทีมงานเครื่องอื่นแก้วิชวลคิวหรือสคริปท์ หน้านี้จะอัปเดตตามทันที)
    const agendaChannel = supabase.channel('agenda_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_agenda_items' }, () => { fetchAgendaData(); })
      .subscribe();

    return () => { supabase.removeChannel(agendaChannel); };
  }, []);

  // ==========================================
  // 3. CORE FUNCTIONS (บันทึกข้อมูลและรันสัญญาณ)
  // ==========================================

  // ตั้งเวลาเริ่มกิจกรรมหลัก
  const handleSaveStartTime = async () => {
    if (!startTime) return alert('กรุณาเลือกเวลาก่อนครับ');
    const { error } = await supabase.from('screen_state').update({ ticker_text: `⏱️ เวลาเริ่มกิจกรรมอย่างเป็นทางการ: ${startTime}` }).eq('id', 'current');
    if (!error) alert('บันทึกเวลาเปิดพิกัดงานเรียบร้อย!');
  };

  // สลับสถานะคิวสด (Live Cue) สั่งอัปเดตแบบจุดเดียวเสร็จสิ้น
  const handleSetLiveCue = async (id: string, forceMedia: string) => {
    try {
      // 1. ดับคิวอื่นทั้งหมด และเปิดคิวนี้ให้เป็น Live Now = true
      await supabase.from('event_agenda_items').update({ is_live_now: false }).neq('id', id);
      await supabase.from('event_agenda_items').update({ is_live_now: true }).eq('id', id);

      // 2. ส่งคำสั่งมีเดียทริกเกอร์อัตโนมัติพุ่งตรงไปที่หน้าจอ Display (ถ้าคิวนั้นผูกกับมีเดียไว้)
      if (forceMedia && forceMedia !== 'idle') {
        await supabase.from('screen_state').update({ mode: 'video', single_video_url: forceMedia }).eq('id', 'current');
      }

      fetchAgendaData(); // รีเฟรชสถานะในตาราง
    } catch (err) { console.error(err); }
  };

  // บันทึกการแก้ไขสคริปท์พิธีกรย้อนกลับเข้าตารางจริง
  const handleSaveScriptChanges = async (id: string) => {
    const { error } = await supabase.from('event_agenda_items').update({ main_script: editMainScript }).eq('id', id);
    if (!error) {
      alert('💾 บันทึกการแก้ไขสคริปท์พิธีกรลงฐานข้อมูลสำเร็จ!');
      setEditingAgendaId(null);
      fetchAgendaData();
    }
  };

  const updateScreen = async (updates: any) => {
    await supabase.from('screen_state').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 'current');
  };

  const toggleImageSelection = (url: string) => setSelectedPlaylist(prev => prev.includes(url) ? prev.filter(i => i !== url) : [...prev, url]);
  const handleRandomQuestion = () => { const s = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)]; setLocalQuestion(s.q); setLocalAnswer(s.a); };
  const simulateAnswer = async (t: string) => { await supabase.from('live_messages').insert([{ nickname: `ผู้เล่น_${t}`, message: Math.random() > 0.4 ? localAnswer : 'ผิด', team_color: t }]); };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 font-sans flex flex-col gap-4">

      {/* HEADER TOP-BAR */}
      <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-md">
        <div><h1 className="text-2xl font-black text-cyan-400 tracking-wider">NiiVaa MASTER CONTROL ROOM</h1><p className="text-xs text-zinc-500">ระบบสลับคิวงาน กราฟิก และ Game Collection ไร้สาย</p></div>

        {/* โซนตั้งเวลาเริ่มกิจกรรม */}
        <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-zinc-800">
          <span className="text-xs font-bold text-zinc-400">⏱️ ตั้งเวลาเริ่มงาน:</span>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none" />
          <button onClick={handleSaveStartTime} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">บันทึก</button>
        </div>
      </div>

      {/* 🌟 MAIN LAYOUT 3 COLUMNS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1">

        {/* คอลัมน์ซ้าย (3/12): คลังสื่อและข้อความวิ่ง */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md">
            <h2 className="text-sm font-black text-zinc-300 uppercase tracking-wider mb-3 border-b border-zinc-800 pb-2">📦 คลังสื่ออัจฉริยะ</h2>
            <div className="max-h-48 overflow-y-auto bg-black/40 border border-zinc-800 rounded-xl p-1 mb-3 scrollbar-thin">
              {availableMedia.map(file => (
                <div key={file.name} className="flex items-center justify-between p-1.5 hover:bg-zinc-800/40 rounded text-xs">
                  <div className="flex items-center gap-2 truncate">
                    {file.type === 'image' ? <input type="checkbox" checked={selectedPlaylist.includes(file.url)} onChange={() => toggleImageSelection(file.url)} className="accent-cyan-500" /> : <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 px-1 rounded">VID</span>}
                    <span className="truncate text-zinc-400">{file.name}</span>
                  </div>
                  {file.type === 'video' && <button onClick={() => updateScreen({ mode: 'video', single_video_url: file.url })} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-0.5 rounded text-[10px]">▶️ PLAY</button>}
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <button onClick={() => updateScreen({ mode: 'standby', single_video_url: '' })} className="w-full bg-red-900/40 hover:bg-red-800 text-red-300 border border-red-900/50 py-2 rounded-xl text-xs font-bold">🛑 ปิดสื่อ/โลโก้สแตนด์บาย</button>
              <button onClick={() => { if (selectedPlaylist.length === 0) return alert('เลือกรูปก่อนครับ'); updateScreen({ mode: 'slideshow', playlist: selectedPlaylist }); }} className="w-full bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 border border-emerald-900/50 py-2 rounded-xl text-xs font-bold">🖼️ ฉายสไลด์โชว์ที่เลือก</button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md">
            <h2 className="text-sm font-black text-zinc-300 mb-2">💬 ข้อความวิ่งฉุกเฉิน</h2>
            <input type="text" value={tickerMsg} onChange={e => setTickerMsg(e.target.value)} placeholder="พิมพ์คำประกาศ..." className="w-full bg-black border border-zinc-800 text-xs text-white p-2 rounded-lg outline-none mb-2" />
            <div className="flex gap-1.5"><button onClick={() => updateScreen({ ticker_text: tickerMsg, ticker_direction: tickerDirection, ticker_color: tickerColor })} className="flex-1 bg-cyan-700 hover:bg-cyan-600 py-1.5 rounded text-xs font-bold">ส่งขึ้นจอ</button><button onClick={() => updateScreen({ ticker_text: '' })} className="flex-1 bg-zinc-800 text-zinc-500 py-1.5 rounded text-xs font-bold">ปิด</button></div>
          </div>
        </div>

        {/* 🌟 คอลัมน์กลาง (6/12): MASTER AGENDA TIMELINE (ตารางคิวงานเลื่อนดูได้ อุ่นใจชัวร์ 💯) */}
        <div className="xl:col-span-6 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md flex flex-col h-[70vh] xl:h-auto">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3">
            <h2 className="text-base font-black text-cyan-400 tracking-wide flex items-center gap-2">📋 ตารางคิวงานและบทพิธีกรล่วงหน้า (Timeline Table)</h2>
            <span className="text-xs text-zinc-500 font-bold">จำนวนคิวทั้งหมด: {agendaItems.length} คิว</span>
          </div>

          {/* ตารางแบบเลื่อนได้อิสระ (Scrollable Box) */}
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-3">
            {agendaItems.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-12">ไม่พบข้อมูลคิวงานในตาราง event_agenda_items</p>
            ) : (
              agendaItems.map((item, idx) => (
                <div key={item.id} className={`p-3.5 rounded-xl border transition-all duration-300 relative overflow-hidden flex flex-col gap-2.5
                  ${item.is_live_now
                    ? 'bg-gradient-to-r from-cyan-950/60 to-zinc-950 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-black/40 border-zinc-800/80 hover:border-zinc-700'
                  }
                `}>
                  {/* แถวบน: รายละเอียดคิวหลัก */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border
                        ${item.is_live_now ? 'bg-cyan-500 text-black border-cyan-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}
                      `}>{idx + 1}</div>
                      <div>
                        <h3 className="font-black text-sm text-white flex items-center gap-2">
                          {item.title}
                          <span className="text-[11px] font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">⏱️ {item.duration_minutes} นาที</span>
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">ผู้รับผิดชอบ: <b className="text-zinc-400">{item.responsible_person || 'ไม่ระบุ'}</b> | คิวภาพเสียง: <b className="text-amber-500/80">{item.visual_audio_cue || 'ไม่มี'}</b></p>
                      </div>
                    </div>

                    {/* ปุ่มสั่งยิงสถานะ LIVE (เปิดสวิตช์ขึ้นโปรเจกต์เตอร์) */}
                    <button
                      onClick={() => handleSetLiveCue(item.id, item.force_media_trigger)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs transition-all transform active:scale-95 flex items-center gap-1 border
                        ${item.is_live_now
                          ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.4)]'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'
                        }
                      `}
                    >
                      {item.is_live_now ? '🔴 ON AIR LIVE' : '🎬 สลับคิวสด'}
                    </button>
                  </div>

                  {/* แถวล่าง: บทพูดพิธีกร (Main Script) พร้อมปุ่มจิ้มแก้ไขและบันทึกย้อนกลับ */}
                  <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-900/50 text-xs">
                    <div className="flex justify-between items-center mb-1 text-zinc-500 font-bold">
                      <span>🎤 สคริปท์บทพูดพิธีกรหลัก:</span>
                      {editingAgendaId === item.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveScriptChanges(item.id)} className="text-emerald-400 hover:underline font-black">💾 กดเซฟลงฐานข้อมูล</button>
                          <button onClick={() => setEditingAgendaId(null)} className="text-zinc-500 hover:underline">ยกเลิก</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingAgendaId(item.id); setEditMainScript(item.main_script || ''); }} className="text-cyan-500 hover:underline">✍️ แก้ไขบทพูดคิวนี้</button>
                      )}
                    </div>

                    {editingAgendaId === item.id ? (
                      <textarea value={editMainScript} onChange={e => setEditMainScript(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-1.5 outline-none font-bold text-xs resize-none" />
                    ) : (
                      <p className="text-zinc-300 whitespace-pre-line leading-relaxed font-medium">{item.main_script || '(คิวนีไม่มีบทพูดของพิธีกร)'}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* คอลัมน์ขวา (3/12): คลังระบบเกม 5 โหมด */}
        <div className="xl:col-span-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-1.5">
            <h2 className="text-sm font-black text-indigo-400 uppercase tracking-wider">🎮 Game Collection</h2>
            <button onClick={async () => { if (confirm('ล้างคิว?')) await supabase.from('live_messages').delete().neq('id', '0'); }} className="bg-red-950 border border-red-900 text-red-400 text-[10px] px-2 py-0.5 rounded">ล้างคิว</button>
          </div>

          <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800 space-y-1.5">
            <button onClick={handleRandomQuestion} className="w-full bg-indigo-900/40 text-indigo-300 text-[10px] font-bold py-1 rounded">🎲 สุ่มชุดคำถามคลังสำรอง</button>
            <p className="text-[10px] text-zinc-400 truncate"><b>Q:</b> {localQuestion}</p>
            <p className="text-[10px] text-emerald-400"><b>A:</b> {localAnswer}</p>
          </div>

          <div className="space-y-2">
            <button onClick={() => updateScreen({ mode: 'game' })} className="w-full bg-pink-700/80 hover:bg-pink-600 text-white text-xs font-bold py-2 rounded-xl border border-pink-600/30">🚀 1. เปิดโหมดข้อความอิสระ</button>
            <div className="p-2.5 bg-black/40 border border-zinc-800 rounded-xl space-y-1">
              <span className="text-[10px] text-zinc-500 font-bold block">โหมดมินิเกมตอบคำถามระเบิดคะแนน:</span>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => updateScreen({ mode: 'quiz', quiz_question: localQuestion, quiz_correct_answer: localAnswer, game_phase: 'brainstorm' })} className="bg-zinc-800 text-zinc-300 text-[10px] font-bold py-1.5 rounded">🥇 2. จัดอันดับคิว</button>
                <button onClick={() => updateScreen({ mode: 'tug_of_war', quiz_question: localQuestion, quiz_correct_answer: localAnswer, game_phase: 'brainstorm' })} className="bg-zinc-800 text-zinc-300 text-[10px] font-bold py-1.5 rounded">🪢 3. ชักเย่อทีม</button>
                <button onClick={() => updateScreen({ mode: 'leaderboard', quiz_question: localQuestion, quiz_correct_answer: localAnswer, game_phase: 'brainstorm' })} className="bg-zinc-800 text-zinc-300 text-[10px] font-bold py-1.5 rounded">📊 4. กราฟ 4 ทัพ</button>
                <button onClick={() => updateScreen({ mode: 'sudden_death', quiz_question: localQuestion, quiz_correct_answer: localAnswer, game_phase: 'brainstorm' })} className="bg-zinc-800 text-zinc-300 text-[10px] font-bold py-1.5 rounded">⚡ 5. ใครไวใครได้</button>
              </div>
              <button onClick={() => updateScreen({ game_phase: 'reveal' })} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-xl text-xs shadow mt-1">💥 กดเฉลย / ประกาศผล!</button>
            </div>
          </div>

          {/* แผงยิงจำลอง */}
          <div className="pt-1 border-t border-zinc-800"><span className="text-[10px] text-zinc-600 block mb-1">แผงยิงคำตอบจำลองหน้างาน:</span>
            <div className="grid grid-cols-4 gap-1 text-[9px] font-bold">
              <button onClick={() => simulateAnswer('red')} className="bg-red-700 py-1 rounded">🔴 แดง</button>
              <button onClick={() => simulateAnswer('blue')} className="bg-blue-700 py-1 rounded">🔵 ฟ้า</button>
              <button onClick={() => simulateAnswer('green')} className="bg-emerald-700 py-1 rounded">🟢 เขียว</button>
              <button onClick={() => simulateAnswer('yellow')} className="bg-yellow-600 py-1 rounded">🟡 เหลือง</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}