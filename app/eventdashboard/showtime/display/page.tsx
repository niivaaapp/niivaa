'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// โครงสร้างคำสั่งที่รับมาจากหน้า Controller (เพิ่ม single_video_url)
interface ScreenState {
  mode: 'standby' | 'image' | 'video' | 'slideshow' | 'game' | 'quiz' | 'tug_of_war' | 'leaderboard' | 'sudden_death';
  media_url: string;
  single_video_url: string; // 💡 ช่องเก็บลิงก์วิดีโอเดี่ยว
  playlist: string[];
  ticker_text: string;
  ticker_speed: string;
  ticker_color: string;
  ticker_direction: 'rtl' | 'btt';
  quiz_question: string;
  quiz_correct_answer: string;
  game_phase: 'brainstorm' | 'reveal';
}

interface LiveMessage {
  id: string; nickname: string; message: string; team_color: 'red' | 'blue' | 'green' | 'yellow' | 'neutral'; created_at: string;
  randomX?: number; randomY?: number; effectClass?: string; phase?: 'floating' | 'center' | 'queued'; 
}

const QUIZ_EFFECTS = ['animate-[wiggle_1s_infinite]', 'animate-[pulse-fast_0.5s_infinite]', 'animate-[float-random_3s_infinite]', 'animate-[jelly_2s_infinite]'];
const GAME_COLORS = {
  red: 'bg-red-600 border-red-400 text-red-100 shadow-red-500/50',
  blue: 'bg-blue-600 border-blue-400 text-blue-100 shadow-blue-500/50',
  green: 'bg-emerald-600 border-emerald-400 text-emerald-100 shadow-emerald-500/50',
  yellow: 'bg-yellow-600 border-yellow-400 text-yellow-100 shadow-yellow-500/50',
  neutral: 'bg-zinc-600 border-zinc-400 text-zinc-100 shadow-zinc-500/50'
};

export default function MainProjectorDisplay() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // 📡 STATE คุมหน้าจอ
  const [screen, setScreen] = useState<ScreenState>({
    mode: 'standby', media_url: '', single_video_url: '', playlist: [],
    ticker_text: '', ticker_speed: '20s', ticker_color: '#FFFFFF', ticker_direction: 'rtl',
    quiz_question: '', quiz_correct_answer: '', game_phase: 'brainstorm'
  });
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  // 📡 LINK SUPABASE REALTIME
  useEffect(() => {
    const fetchInitialState = async () => {
      const { data: screenData } = await supabase.from('screen_state').select('*').eq('id', 'current').single();
      if (screenData) setScreen(screenData);
      const { data: msgData } = await supabase.from('live_messages').select('*').order('created_at', { ascending: true });
      if (msgData) setMessages(msgData.map(m => injectRandomData(m)));
    };
    fetchInitialState();

    const screenChannel = supabase.channel('screen_changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' }, 
        (payload) => setScreen(payload.new as ScreenState)).subscribe();

    const msgChannel = supabase.channel('message_changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_messages' }, 
        (payload) => setMessages(prev => [...prev, injectRandomData(payload.new as LiveMessage)]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'live_messages' }, () => setMessages([])).subscribe();

    return () => { supabase.removeChannel(screenChannel); supabase.removeChannel(msgChannel); };
  }, []);

  // 💡 เมื่อมีการเปลี่ยน URL วิดีโอ ให้สั่งโหลดวิดีโอใหม่ทันที
  useEffect(() => {
    if (screen.mode === 'video' && screen.single_video_url && videoRef.current) {
      videoRef.current.load(); // บังคับโหลด HTML5 Video ใหม่
      videoRef.current.play().catch(err => console.error("Autoplay blocked:", err));
    }
  }, [screen.single_video_url, screen.mode]);

  const injectRandomData = (msg: LiveMessage): LiveMessage => ({
      ...msg, phase: 'floating', effectClass: QUIZ_EFFECTS[Math.floor(Math.random() * QUIZ_EFFECTS.length)],
      randomX: Math.floor(Math.random() * 70) + 12, randomY: Math.floor(Math.random() * 55) + 25, 
  });

  // วงจรชีวิตข้อความ (โหมด 1)
  useEffect(() => {
    if (screen.mode === 'game') {
      messages.filter(m => m.phase === 'floating').forEach(m => setTimeout(() => setMessages(prev => prev.map(item => item.id === m.id ? { ...item, phase: 'center' } : item)), 2000));
      messages.filter(m => m.phase === 'center').forEach(m => setTimeout(() => setMessages(prev => prev.map(item => item.id === m.id ? { ...item, phase: 'queued' } : item)), 2500));
    }
  }, [messages, screen.mode]);

  // ระบบสลับภาพสไลด์โชว์
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (screen.mode === 'slideshow' && screen.playlist?.length > 0) interval = setInterval(() => setSlideIndex((prev) => (prev + 1) % screen.playlist.length), 15000);
    return () => clearInterval(interval);
  }, [screen.mode, screen.playlist]);

  // 🧮 MATH ENGINES
  const correctSubs = messages.filter(m => m.message.toLowerCase().includes(screen.quiz_correct_answer.toLowerCase()))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const getTeamScore = (color: string) => messages.filter(m => m.team_color === color && m.message.toLowerCase().includes(screen.quiz_correct_answer.toLowerCase())).length * 10;
  const redScore = getTeamScore('red'); const blueScore = getTeamScore('blue'); const greenScore = getTeamScore('green'); const yellowScore = getTeamScore('yellow');
  const totalTug = redScore + blueScore; const redPercent = totalTug === 0 ? 50 : (redScore / totalTug) * 100; const maxScore = Math.max(redScore, blueScore, greenScore, yellowScore, 100);
  const fastestWinner = correctSubs[0];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative font-sans select-none cursor-none">
      
      {/* ==========================================
          LAYER 1: BACKGROUND / MEDIA
          ========================================== */}
      <div className={`absolute inset-0 z-0 transition-colors duration-1000
        ${screen.mode === 'sudden_death' && screen.game_phase === 'reveal' && fastestWinner 
          ? (fastestWinner.team_color === 'red' ? 'bg-red-950' : fastestWinner.team_color === 'blue' ? 'bg-blue-950' : fastestWinner.team_color === 'green' ? 'bg-emerald-950' : 'bg-yellow-950')
          : 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]'
        }
      `}>
        {/* โลโก้แบรนด์จางๆ */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <div className="text-center"><div className="text-[140px] tracking-tighter font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">NiiVaa</div><p className="text-3xl text-zinc-500 tracking-[1em] mt-4 font-bold">SMARTEVENT</p></div>
        </div>

        {/* 🌟 โหมดฉายสื่อเดี่ยว (ภาพ/วิดีโอ) หรือสไลด์โชว์ */}
        <div className="absolute inset-0 z-10 flex items-center justify-center animate-in fade-in duration-1000">
          
          {/* A. โหมดวิดีโอเดี่ยว (HTML5 Video Player) */}
          {screen.mode === 'video' && screen.single_video_url && (
            <video 
              ref={videoRef}
              src={screen.single_video_url}
              className="w-full h-full object-contain bg-black"
              autoPlay // บังคับเล่นทันที
              controls // โชว์แถบคอนโทรล (Play/Pause/Volume) เผื่อแอดมินต้องคุมหน้าจอหลัก
              loop // เล่นวนลูป
              muted={false} // เปิดเสียง (ถ้า Autoplay ไม่ทำงานต้องปิด muted)
            />
          )}

          {/* B. โหมดรูปภาพเดี่ยว */}
          {screen.mode === 'image' && screen.media_url && (
            <img src={screen.media_url} className="w-full h-full object-contain" />
          )}

          {/* C. โหมดสไลด์โชว์รูปภาพ */}
          {screen.mode === 'slideshow' && screen.playlist?.length > 0 && (
            screen.playlist.map((url, i) => (
              <img key={i} src={url} className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ${i === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} />
            ))
          )}
        </div>
      </div>

      {/* 💡 BRAND LOGO มุมขวาบน */}
      {screen.mode !== 'standby' && (
        <div className="absolute top-6 right-6 z-[100] bg-black/40 backdrop-blur-sm p-3 rounded-2xl border border-white/10 shadow-xl animate-in fade-in duration-500">
          <img src="/niivaa-logo.png" alt="NiiVaa" className="h-8 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150x40?text=NiiVaa'; }} />
        </div>
      )}

      {/* ==========================================
          🌟 GAME LAYERS (ซ่อนเมื่อเปิดวิดีโอ เพื่อให้วิดีโอเต็มจอ)
          ========================================== */}
      {screen.mode !== 'video' && (
        <>
          {/* GAME 1 */}
          {screen.mode === 'game' && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in">
              <div className="absolute left-8 top-10 bottom-10 w-96 flex flex-col gap-3 justify-end pb-6 overflow-hidden">
                {messages.filter(m => m.phase === 'queued').map((msg) => (
                  <div key={msg.id} className="animate-in slide-in-from-left-20 fade-in duration-500 border-l-4 border-l-cyan-400 bg-white/10 p-4 rounded-2xl"><span className="text-cyan-400 font-black text-xs uppercase mb-0.5">👤 {msg.nickname}</span><span className="text-white font-bold text-xl leading-tight">{msg.message}</span></div>
                ))}
              </div>
              {messages.filter(m => m.phase !== 'queued').map((msg) => (
                msg.phase === 'floating' ? (
                  <div key={msg.id} className={`absolute drop-shadow-2xl ${msg.effectClass}`} style={{ top: `${msg.randomY}%`, left: `${msg.randomX}%` }}><div className="bg-[#0B0C60] px-5 py-3 rounded-full border-2 border-white/30 flex gap-2 items-center transform -rotate-3"><span className="text-white font-black text-xs bg-black/40 px-2.5 py-0.5 rounded-full">{msg.nickname}</span><span className="text-white font-bold text-lg">{msg.message}</span></div></div>
                ) : (
                  <div key={msg.id} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-50 fade-in"><div className="flex flex-col items-center"><span className="bg-yellow-400 text-black px-5 py-1 rounded-t-xl font-black text-lg translate-y-2">🎉 GUEST COMMENT 🎉</span><div className="bg-gradient-to-r from-[#0B0C60] to-indigo-900 px-10 py-8 rounded-3xl border-4 border-white/20"><span className="text-white font-black text-5xl text-center leading-tight">"{msg.message}"</span></div></div></div>
                )
              ))}
            </div>
          )}

          {/* GAME 2 */}
          {screen.mode === 'quiz' && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute top-10 w-full flex justify-center z-50 transition-all duration-1000 ${screen.game_phase === 'reveal' ? 'scale-90 opacity-90 top-4' : 'scale-100'}`}><div className="bg-gradient-to-b from-indigo-900 to-slate-900 px-14 py-5 rounded-3xl border-2 border-white/10 shadow-2xl text-center"><span className="text-indigo-400 font-black text-xs uppercase mb-1 block">LIVE QUIZ</span><h1 className="text-4xl font-black text-white leading-tight">{screen.quiz_question}</h1></div></div>
              {screen.game_phase === 'brainstorm' ? (
                <div className="absolute inset-0 pt-44 overflow-hidden">{messages.map((sub) => (<div key={sub.id} className={`absolute drop-shadow-xl ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: `${sub.randomX}%` }}><div className={`${GAME_COLORS[sub.team_color] || GAME_COLORS.neutral} px-4 py-2.5 rounded-xl border border-white/20 shadow-md flex flex-col items-center transform rotate-[-4deg]`}><span className="text-white/80 font-black text-[10px] bg-black/30 px-2 py-0.5 rounded-full">{sub.nickname}</span><span className="text-white font-bold text-lg">{sub.message}</span></div></div>))}</div>
              ) : (
                <div className="absolute inset-0 pt-48 flex flex-col items-center animate-in fade-in duration-1000"><div className="bg-zinc-900/90 border border-zinc-800 px-6 py-2.5 rounded-full flex gap-6 mb-6 text-sm font-bold text-zinc-400"><span>ยอดส่งคำตอบ: <b className="text-white text-base">{messages.length}</b></span><span className="text-emerald-400">ตอบถูก: <b className="text-emerald-300 text-base">{correctSubs.length}</b> คน</span></div><div className="w-full max-w-4xl flex flex-col gap-3 overflow-y-auto max-h-[62vh] pb-12 px-4 scrollbar-hide">{correctSubs.map((sub, idx) => (<div key={sub.id} className="flex items-center gap-4 bg-gradient-to-r from-emerald-950/60 to-transparent p-3 rounded-2xl border border-emerald-500/20 animate-in slide-in-from-left-10 fade-in" style={{ animationDelay: `${idx * 120}ms` }}><div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 ${idx === 0 ? 'bg-yellow-400 text-yellow-950 border-yellow-200' : 'bg-emerald-900 text-emerald-300 border-emerald-700'}`}>{idx + 1}</div><div className="flex items-baseline gap-4"><span className="text-white font-black text-2xl">{sub.nickname}</span><span className="text-zinc-500 text-sm">ตอบ: <b className="text-emerald-400 text-base">"{sub.message}"</b></span></div></div>))}</div></div>
              )}
            </div>
          )}

          {/* GAME 3 */}
          {screen.mode === 'tug_of_war' && (
            <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in">
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full max-w-2xl text-center"><div className="bg-zinc-950/90 px-10 py-4 rounded-3xl border border-white/10 shadow-2xl"><span className="text-purple-400 font-black tracking-widest text-xs uppercase mb-0.5 block">ศึกชักเย่อสมองเพชร</span><h1 className="text-3xl font-black text-white">{screen.quiz_question}</h1></div></div>
              <div className="absolute top-10 left-10"><span className="text-red-500 font-black text-4xl block">TEAM RED</span><span className="text-white text-xl font-bold bg-red-900/30 px-4 py-1 rounded-full border border-red-500/20">{redScore} PTS</span></div>
              <div className="absolute top-10 right-10 text-right"><span className="text-blue-500 font-black text-4xl block">TEAM BLUE</span><span className="text-white text-xl font-bold bg-blue-900/30 px-4 py-1 rounded-full border border-blue-500/20">{blueScore} PTS</span></div>
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[80vw] h-14 bg-zinc-950 rounded-full border-4 border-white/10 flex shadow-2xl"><div className="h-full bg-gradient-to-r from-red-700 to-red-500" style={{ width: `${redPercent}%` }}></div><div className="h-full flex-1 bg-gradient-to-l from-blue-700 to-blue-500"></div><div className="absolute top-1/2 -translate-y-1/2 w-16 h-16 bg-zinc-900 rounded-full border-4 border-zinc-700 flex items-center justify-center font-black text-lg text-white" style={{ left: `calc(${redPercent}% - 2rem)` }}>VS</div></div>
              {screen.game_phase === 'brainstorm' && (<div className="absolute inset-0 pt-44 overflow-hidden pointer-events-none">{messages.map((sub) => (<div key={sub.id} className={`absolute drop-shadow-md ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: sub.team_color === 'red' ? `${Math.floor(Math.random()*30)+10}%` : `${Math.floor(Math.random()*30)+60}%` }}><div className={`px-4 py-2 rounded-xl border border-white/20 text-white font-bold text-lg ${sub.team_color === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}>{sub.nickname}</div></div>))}</div>)}
            </div>
          )}

          {/* GAME 4 */}
          {screen.mode === 'leaderboard' && (
            <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute top-10 w-full flex justify-center z-50 transition-all duration-1000 ${screen.game_phase === 'reveal' ? 'scale-90 top-4' : 'scale-100'}`}><div className="bg-zinc-900 px-14 py-5 rounded-3xl border border-emerald-500/30 text-center"><span className="text-emerald-400 font-black text-xs uppercase tracking-widest block mb-1">⚡ ศึกประชันโซน 4 ทัพ</span><h1 className="text-4xl font-black text-white leading-tight">{screen.quiz_question}</h1>{screen.game_phase === 'reveal' && <p className="text-yellow-400 text-2xl font-black mt-3">เฉลย: {screen.quiz_correct_answer}</p>}</div></div>
              <div className={`absolute bottom-0 w-full h-[58vh] flex items-end justify-center gap-6 px-12 pb-10 transition-all duration-1000 ${screen.game_phase === 'reveal' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>{[{ label: 'RED', score: redScore, color: 'from-red-900 to-red-500 border-red-400' }, { label: 'BLUE', score: blueScore, color: 'from-blue-900 to-blue-500 border-blue-400' }, { label: 'GREEN', score: greenScore, color: 'from-emerald-900 to-emerald-500 border-emerald-400' }, { label: 'YELLOW', score: yellowScore, color: 'from-yellow-900 to-yellow-500 border-yellow-400' }].map((t) => (<div key={t.label} className="flex flex-col items-center w-40"><span className="text-white font-black text-2xl bg-black/40 px-3 py-1 rounded-xl mb-2">{t.score}</span><div className={`w-full bg-gradient-to-t rounded-t-2xl border-t-2 border-l-2 border-r-2 ${t.color}`} style={{ height: screen.game_phase === 'reveal' ? `${(t.score / maxScore) * 100}%` : '0%', minHeight: '1.5rem' }}></div><div className="mt-4 text-zinc-400 font-black text-xl tracking-wider">{t.label}</div></div>))}</div>
              {screen.game_phase === 'brainstorm' && (<div className="absolute inset-0 pt-44 overflow-hidden pointer-events-none">{messages.map((sub) => (<div key={sub.id} className={`absolute drop-shadow-md ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: `${sub.randomX}%` }}><div className={`px-4 py-2 rounded-xl border border-white/10 text-white text-base font-bold ${GAME_COLORS[sub.team_color] || GAME_COLORS.neutral}`}>{sub.nickname}</div></div>))}</div>)}
            </div>
          )}

          {/* GAME 5 */}
          {screen.mode === 'sudden_death' && (
            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className={`absolute top-12 w-full flex justify-center z-50 transition-all duration-1000 ${screen.game_phase === 'reveal' ? '-translate-y-48 opacity-0' : 'translate-y-0'}`}><div className="bg-zinc-900 px-14 py-5 rounded-3xl border border-orange-500/30 text-center"><span className="text-orange-400 font-black text-xs uppercase tracking-widest block mb-1">⚡ ใครไวใครได้ (Sudden Death)</span><h1 className="text-4xl font-black text-white leading-tight">{screen.quiz_question}</h1></div></div>
              {screen.game_phase === 'brainstorm' ? (
                <div className="absolute inset-0 pt-44 overflow-hidden pointer-events-none">{messages.map((sub) => (<div key={sub.id} className={`absolute drop-shadow-xl ${sub.effectClass}`} style={{ top: `${sub.randomY}%`, left: `${sub.randomX}%` }}><div className={`px-4 py-2 rounded-xl border border-white/10 text-white font-bold text-sm flex flex-col items-center ${GAME_COLORS[sub.team_color] || GAME_COLORS.neutral}`}><span>{sub.nickname}</span><span className="text-white/40 font-normal text-xs">[ Locked In ]</span></div></div>))}</div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">{fastestWinner ? (<div className="flex flex-col items-center animate-in zoom-in-50 fade-in"><span className="text-yellow-400 font-black text-2xl tracking-[0.4em] mb-4">👑 THE FASTEST FINGER</span><div className={`px-20 py-12 rounded-[2.5rem] border-4 ${GAME_COLORS[fastestWinner.team_color]}`}><p className="text-white/70 font-bold text-lg mb-1">ทัพสี {fastestWinner.team_color.toUpperCase()}</p><h2 className="text-8xl font-black text-white drop-shadow-2xl mb-6">{fastestWinner.nickname}</h2><div className="bg-black/30 px-6 py-3 rounded-xl border border-white/10"><p className="text-white text-3xl font-black">"{fastestWinner.message}"</p></div></div></div>) : (<div className="text-center text-zinc-400 text-3xl font-bold">ไม่มีใครตอบถูกเลย! (เฉลย: {screen.quiz_correct_answer})</div>)}</div>
              )}
            </div>
          )}
        </>
      )}


      {/* ==========================================
          LAYER 6: TICKER MARQUEE (ยังโชว์เสมอแม้เปิดวิดีโอ)
          ========================================== */}
      <div className={`absolute bottom-0 left-0 w-full z-[100] bg-black/80 backdrop-blur-md text-white overflow-hidden transition-all duration-500 flex items-center shadow-2xl ${screen.ticker_text && screen.ticker_direction === 'rtl' ? 'h-20 border-t-2 border-cyan-500/30' : 'h-0 opacity-0 pointer-events-none'}`}>
        <div className="absolute left-0 top-0 h-full bg-[#0B0C60] z-10 px-6 flex items-center justify-center border-r-2 border-white/20 shadow-2xl"><span className="text-xl font-black tracking-widest text-white flex items-center gap-2"><span className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></span> LIVE MSG</span></div>
        <div className="whitespace-nowrap w-full pl-[250px]"><div className="inline-block font-bold text-4xl" style={{ animation: `tickerRtl ${screen.ticker_speed} linear infinite`, color: screen.ticker_color }}>{screen.ticker_text} &nbsp;&nbsp;&nbsp;&nbsp; 🟢 &nbsp;&nbsp;&nbsp;&nbsp; {screen.ticker_text}</div></div>
      </div>

      <div className={`absolute top-0 right-0 h-full w-1/4 z-[90] bg-gradient-to-l from-black/90 to-transparent overflow-hidden transition-all duration-500 flex flex-col justify-end ${screen.ticker_text && screen.ticker_direction === 'btt' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-32 pointer-events-none'}`}>
        <div className="absolute top-20 right-6 bg-[#0B0C60] px-4 py-1.5 rounded-full border border-white/20 z-10 shadow-xl"><span className="text-sm font-black tracking-wider text-white">🟢 LIVE COMMENTS</span></div>
        <div className="w-full text-right pr-6 pb-[100vh]"><div className="flex flex-col gap-8 font-bold text-2xl" style={{ animation: `tickerBtt ${screen.ticker_speed} linear infinite`, color: screen.ticker_color }}>{screen.ticker_text.split(' 🟢 ').map((msg, i) => (<p key={i} className="leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5 backdrop-blur-sm">{msg}</p>))}</div></div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes tickerRtl { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        @keyframes tickerBtt { 0% { transform: translateY(100vh); } 100% { transform: translateY(-100%); } }
        @keyframes jelly { 0%, 100% { transform: scale(1, 1); } 25% { transform: scale(0.9, 1.1); } 50% { transform: scale(1.1, 0.9); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes pulse-fast { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        @keyframes float-random { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(0, -12px); } }
      `}} />
    </div>
  );
}