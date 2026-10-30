'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, CheckCircle2, AlertCircle, Edit, Flag, MessageSquare ,UserCircle} from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// ==========================================
// 🌟 ข้อมูลทีมสี สำหรับให้ผู้ใช้เลือก
// ==========================================
const TEAM_OPTIONS = [
  { id: 'red', label: 'ทีมสีแดง', style: 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)]' },
  { id: 'blue', label: 'ทีมสีน้ำเงิน', style: 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)]' },
  { id: 'green', label: 'ทีมสีเขียว', style: 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]' },
  { id: 'yellow', label: 'ทีมสีเหลือง', style: 'bg-amber-500 border-amber-200 text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.8)]' }
];

function LivePlayerContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [screenState, setScreenState] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 🌟 ค่าเริ่มต้นทีมคือ neutral (ไม่มีทีม) จะเปลี่ยนก็ต่อเมื่อผู้ใช้จิ้มเลือก
  const [teamColor, setTeamColor] = useState('neutral');
  const [isNameLocked, setIsNameLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 🎨 ค่าสีพื้นหลัง (Background) ตามทีมที่เลือก
  const teamTheme: Record<string, string> = {
    red: 'from-red-950 to-black',
    blue: 'from-blue-950 to-black',
    green: 'from-emerald-950 to-black',
    yellow: 'from-amber-950 to-black',
    neutral: 'from-zinc-950 to-black',
  };

  useEffect(() => {
    const fetchScreen = async () => {
      const { data } = await supabase.from('screen_state').select('*').eq('id', 'current').single();
      if (data) setScreenState(data);
    };
    fetchScreen();

    const sub = supabase.channel(`live_screen_sync_${eventId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' }, (payload) => {
        setScreenState(payload.new);
        setIsSubmitted(false);
        setMessage('');
        setErrorMsg('');
      }).subscribe();

    const savedName = localStorage.getItem(`niivaa_nickname_${eventId}`);
    const savedTeam = localStorage.getItem(`niivaa_team_color_${eventId}`);

    if (savedName) {
      setNickname(savedName);
      setTeamColor(savedTeam || 'neutral');
      setIsNameLocked(true);
    }

    return () => { supabase.removeChannel(sub); };
  }, [eventId]);

  const handleSaveName = () => {
    if (!nickname.trim()) {
      setErrorMsg('กรุณาตั้งชื่อเล่นก่อนครับ!');
      if (navigator.vibrate) navigator.vibrate(200);
      return;
    }

    // 🌟 ดักเช็ค: ถ้าจอหลักเปิดโหมดแบ่งทีม (is_team_mode) แต่ผู้ใช้ยังไม่ได้เลือกทีม
    if (screenState?.is_team_mode && teamColor === 'neutral') {
      setErrorMsg('กรุณาเลือกทีมสีของคุณด้วยครับ!');
      if (navigator.vibrate) navigator.vibrate(200);
      return;
    }

    setErrorMsg('');
    localStorage.setItem(`niivaa_nickname_${eventId}`, nickname);
    localStorage.setItem(`niivaa_team_color_${eventId}`, teamColor);
    setIsNameLocked(true);
  };

  const handleSubmitAnswer = async (answerText: string) => {
    if (!answerText.trim()) {
      setErrorMsg('กรุณาเลือกหรือพิมพ์คำตอบครับ!');
      if (navigator.vibrate) navigator.vibrate(200);
      return;
    }

    setIsSubmitted(true);
    setErrorMsg('');
    if (navigator.vibrate) navigator.vibrate([50, 50]);

    try {
      // 🌟 รับค่า error จาก Supabase มาเช็คด้วย
      const { error } = await supabase.from('live_messages').insert([{
        // event_id: eventId, // ❌ ปิดบรรทัดนี้ไว้ก่อน จนกว่าคุณจะสร้างคอลัมน์ event_id ใน Supabase
        nickname: nickname,
        message: answerText,
        team_color: teamColor
      }]);

      // 🌟 ถ้ามี Error จาก Database ให้โยนไปเข้า block catch
      if (error) throw error;

    } catch (err: any) {
      console.error("Database Insert Error:", err);
      // โชว์ข้อความ Error บนหน้าจอมือถือให้รู้ว่าพังเพราะอะไร
      setErrorMsg('ส่งไม่สำเร็จ: ' + (err.message || 'เครือข่ายขัดข้อง'));
      setIsSubmitted(false); // ปลดล็อกปุ่มให้กดส่งใหม่ได้
    }
  };

  if (!screenState) return <div className="min-h-screen bg-black flex items-center justify-center text-cyan-400 font-bold animate-pulse">กำลังซิงค์ข้อมูลหน้าจอ...</div>;

  const isGameMode = ['game', 'quiz', 'tug_of_war', 'leaderboard', 'sudden_death'].includes(screenState.mode);
  const isBrainstorming = isGameMode && screenState.game_phase === 'brainstorm';
  const currentTheme = teamTheme[teamColor] || teamTheme.neutral;

  return (
    <div className={`min-h-[100dvh] bg-gradient-to-b ${currentTheme} text-white p-4 font-sans flex flex-col max-w-md mx-auto relative shadow-2xl transition-colors duration-1000`}>

      {/* 1. Header: Logo */}
      <div className="text-center py-4 mb-2 shrink-0">
        <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 mx-auto object-contain mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
      </div>

      {/* 2. ระบบ Login & เลือกทีม */}
      {!isNameLocked ? (
        <div className="flex-1 flex flex-col justify-center animate-in zoom-in-95 duration-300">
          <div className="bg-zinc-950/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            <h2 className="text-2xl font-black text-white mb-2 text-center">เข้าสู่ระบบร่วมสนุก!</h2>
            <p className="text-sm text-zinc-400 mb-6 text-center">โปรดตั้งชื่อเล่นเพื่อแสดงบนจอภาพ</p>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="พิมพ์ชื่อของคุณ..."
              className="w-full bg-black/50 border-2 border-zinc-800 rounded-2xl p-4 text-white text-center font-black text-xl outline-none focus:border-cyan-500 transition-all mb-6"
            />

            {/* 🌟 แสดงปุ่มเลือกทีม เฉพาะตอนที่ Controller เปิดใช้งาน is_team_mode = true เท่านั้น */}
            {screenState?.is_team_mode && (
              <div className="mb-6">
                <div className="text-center text-sm font-bold text-zinc-300 mb-3 flex items-center justify-center gap-2">
                  <Flag className="w-4 h-4 text-cyan-400" /> เลือกทีมของคุณตามพิธีกรแจ้ง
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {TEAM_OPTIONS.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setTeamColor(team.id)}
                      className={`py-3 rounded-xl font-bold border-2 transition-all duration-300 flex items-center justify-center gap-2 
                   ${teamColor === team.id ? `${team.style} scale-105` : 'bg-black/50 border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                    >
                      {teamColor === team.id && <CheckCircle2 className="w-4 h-4" />} {team.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && <p className="text-red-400 text-sm font-bold text-center mb-4 animate-bounce">⚠️ {errorMsg}</p>}

            <button
              onClick={handleSaveName}
              className="w-full bg-white text-black hover:bg-cyan-400 hover:text-black font-black py-4 rounded-2xl text-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
            >
              เริ่มต้นเล่นเกม 🚀
            </button>
          </div>
        </div>
      ) : (
        /* 3. Game UI */
        <div className="flex-1 flex flex-col gap-4">

          {/* 🏷️ แถบข้อมูลผู้เล่น */}
          <div className="bg-black/40 backdrop-blur-md px-5 py-4 rounded-3xl border border-white/10 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              {/* ถ้ามีทีมให้โชว์ไอคอนธง ถ้าไม่มีให้โชว์แค่ไอคอน User */}
              {teamColor !== 'neutral' ? (
                <div className={`p-2 rounded-full border border-white/20 ${TEAM_OPTIONS.find(t => t.id === teamColor)?.style.split(' ')[0]}`}>
                  <Flag className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-full border border-white/20 bg-zinc-800">
                  <UserCircle className="w-5 h-5 text-zinc-400" />
                </div>
              )}
              <div className="flex flex-col">
                {teamColor !== 'neutral' && <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">TEAM {teamColor.toUpperCase()}</span>}
                <span className="text-white font-bold text-lg leading-none mt-1">{nickname}</span>
              </div>
            </div>
            <button onClick={() => setIsNameLocked(false)} className="text-zinc-400 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>

          {/* 📺 กล่องคำถาม */}
          {isGameMode && screenState.quiz_question && screenState.quiz_question !== 'รอสักครู่...' && (
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center animate-in slide-in-from-top-4 shadow-xl">
              <span className="text-white/50 text-[10px] font-black tracking-widest uppercase mb-3 block">LIVE QUESTION</span>
              <h2 className="text-2xl font-black text-white leading-snug drop-shadow-md">
                {screenState.quiz_question}
              </h2>
            </div>
          )}

          {/* ✍️ พื้นที่ส่งคำตอบ */}
          {isBrainstorming ? (
            <div className="flex-1 flex flex-col justify-end animate-in fade-in duration-500 pb-4">

              {errorMsg && (
                <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-center py-2 rounded-xl mb-4 font-bold text-sm animate-in slide-in-from-bottom-2">
                  ⚠️ {errorMsg}
                </div>
              )}

              {isSubmitted ? (
                // 🟢 สถานะส่งแล้ว
                <div className="bg-emerald-950/40 backdrop-blur-md border border-emerald-500/30 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-center">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
                  <div>
                    <h3 className="text-2xl font-black text-emerald-400">ส่งคำตอบสำเร็จ!</h3>
                    <p className="text-emerald-200/50 mt-2 font-medium">รอลุ้นผลบนหน้าจอหลักได้เลย 🎯</p>
                  </div>
                </div>
              ) : (
                // 🟡 ฟอร์มส่งคำตอบ
                <div className="bg-black/60 backdrop-blur-lg p-2 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col gap-2">
                  {/* 🌟 ระบบตัวกรองอัจฉริยะ (Smart Parser) สำหรับจัดการ Options ที่รับมาจาก SmartExam */}
                  {(() => {
                    let safeOptions: any[] = [];
                    try {
                      if (Array.isArray(screenState.quiz_options)) {
                        safeOptions = screenState.quiz_options;
                      } else if (typeof screenState.quiz_options === 'string') {
                        // ป้องกันการ Parse String ว่างเปล่า หรือแปลกๆ
                        const trimmed = screenState.quiz_options.trim();
                        if (trimmed !== '' && trimmed !== '""' && trimmed !== '[]') {
                          safeOptions = JSON.parse(trimmed);
                        }
                      }
                    } catch (e) {
                      console.error("Quiz options parsing error:", e);
                    }

                    // สังเกต: เราจะไม่เช็ค screenState.quiz_question_type แล้ว (เพราะบางที Controller ส่งมาไม่ตรง)
                    // เราจะยึดหลักว่า "ถ้ามีของใน safeOptions เกิน 0 ชิ้น ให้โชว์ปุ่ม 4 สีทันที"
                    // 🔸 โหมดช้อยส์
                    if (safeOptions.length > 0) {
                      const thaiPrefixes = ['ก.', 'ข.', 'ค.', 'ง.', 'จ.', 'ฉ.'];

                      return (
                        <div className="grid grid-cols-1 gap-3 p-1">
                          {safeOptions.map((opt, index) => {
                            const prefix = thaiPrefixes[index] || `${index + 1}.`;

                            // 1. ดึงข้อความดิบออกมา
                            let rawText = typeof opt === 'object' && opt !== null ? (opt.text || String(opt.id || '')) : String(opt);

                            // 2. 🌟 แก้ไข Regex: บังคับว่าต้องมีจุด (.) หรือช่องว่างตามหลังเท่านั้น ถึงจะถือว่าเป็น Prefix และถูกตัดทิ้ง
                            rawText = rawText.replace(/^[กขคงจฉ](\.|\s+)\s*/, '').trim();

                            // 3. ประกอบร่างใหม่
                            const textToShow = `${prefix} ${rawText}`;

                            // 4. ชุดสี 4 สี (แดง, น้ำเงิน, เขียว, เหลือง)
                            const buttonColors = [
                              'bg-red-600 hover:bg-red-500 border-red-400 shadow-[0_4px_15px_rgba(220,38,38,0.4)]',
                              'bg-blue-600 hover:bg-blue-500 border-blue-400 shadow-[0_4px_15px_rgba(37,99,235,0.4)]',
                              'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 shadow-[0_4px_15px_rgba(16,185,129,0.4)]',
                              'bg-amber-600 hover:bg-amber-500 border-amber-400 shadow-[0_4px_15px_rgba(245,158,11,0.4)]'
                            ];

                            return (
                              <button
                                key={index}
                                onClick={() => handleSubmitAnswer(textToShow)}
                                className={`${buttonColors[index % 4]} border-2 text-white font-bold py-4 px-6 rounded-2xl text-[17px] active:scale-95 transition-all text-left flex items-center`}
                              >
                                <span className="flex-1 leading-snug drop-shadow-md">{textToShow}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    }

                    // 🔸 โหมดเขียนตอบ หรือไม่มีตัวเลือก ให้โชว์ช่องพิมพ์ข้อความทันที
                    return (
                      <div className="flex flex-col gap-3 p-1">
                        <div className="relative">
                          <MessageSquare className="absolute top-4 left-4 text-white/40 w-5 h-5" />
                          <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="พิมพ์คำตอบที่นี่..."
                            rows={3}
                            className="w-full bg-black/60 border border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-white text-lg font-bold outline-none focus:bg-white/10 focus:border-cyan-500 resize-none transition-colors placeholder:text-zinc-500"
                          />
                        </div>

                        {/* 🌟 ปุ่มส่งคำตอบ Two-tone (Navy + Blue) ขอบเรืองแสงขาว ตามที่คุณขอ */}
                        <button
                          onClick={() => handleSubmitAnswer(message)}
                          className="w-full bg-gradient-to-r from-blue-950 to-blue-600 text-white hover:from-blue-900 hover:to-blue-500 font-black py-4 rounded-2xl text-xl flex items-center justify-center gap-2 active:scale-95 transition-all border-2 border-white/90 shadow-[0_0_20px_rgba(255,255,255,0.6)] mt-2"
                        >
                          <Send className="w-6 h-6" /> ส่งคำตอบ!
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : (
            /* 🛑 โหมดพักจอ / รอเฉลย */
            <div className="flex-1 flex flex-col items-center justify-center text-center pb-10">
              <div className="bg-black/40 backdrop-blur-md p-10 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-2xl max-w-[85%]">
                <AlertCircle className="w-14 h-14 text-white/30 mb-6 animate-pulse" />
                <h2 className="text-2xl font-black text-white mb-3">
                  {screenState.game_phase === 'reveal' ? 'หมดเวลาตอบ!' : 'เตรียมตัวให้พร้อม'}
                </h2>
                <p className="text-white/50 text-sm font-medium leading-relaxed">
                  {screenState.game_phase === 'reveal'
                    ? 'สายตาจับจ้องที่หน้าจอเวที\nเพื่อดูโฉมหน้าผู้ชนะ 👀'
                    : 'รอรับสัญญาณคำถามข้อต่อไป\nจากพิธีกร 🎤'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LivePlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
      <LivePlayerContent />
    </Suspense>
  );
}