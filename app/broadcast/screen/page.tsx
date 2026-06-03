"use client";

import { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const neonColors = ['#ff00ff', '#00ffff', '#ffff00', '#00ff00', '#ff0000', '#ff8000', '#ff0080'];

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: any; }
}

function BroadcastScreenContent() {
  const searchParams = useSearchParams();
  const screenId = searchParams?.get?.('screen_id') || 'screen_1';
  const urlEventId = searchParams?.get?.('event_id') || '';

  // 🎯 ดักจับว่าเป็นจอพรีวิวในห้องคอนโทรลหรือไม่?
  const isPreviewMode = searchParams?.get?.('preview') === 'true';

  const [config, setConfig] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [gameState, setGameState] = useState<'idle' | 'chaos' | 'converge' | 'docked'>('idle');
  const [interacted, setInteracted] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string>(urlEventId);

  const ytPlayerRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' น.'), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    let targetEventId = activeEventId;
    if (!targetEventId) {
      const { data: latestEvent } = await supabase.from('events').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (latestEvent) { targetEventId = latestEvent.id; setActiveEventId(latestEvent.id); }
    }
    if (!targetEventId) return;

    const { data: screenData } = await supabase.from('event_screens_control').select('*').eq('screen_id', screenId).eq('event_id', targetEventId).maybeSingle();
    if (screenData) setConfig(screenData);

    const { data: msgData } = await supabase.from('event_live_messages').select('*').eq('event_id', targetEventId).order('created_at', { ascending: true });
    if (msgData) {
      setLiveMessages(msgData);
      setMessages(msgData.map((m) => ({ ...m, color: neonColors[Math.floor(Math.random() * neonColors.length)], randX: Math.random() * 80 + 10 + '%', randY: Math.random() * 80 + 10 + '%', delay: Math.random() * 2 + 's' })));
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!activeEventId) return;
    const sub = supabase.channel(`broadcast_sync_${screenId}_${activeEventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_screens_control', filter: `event_id=eq.${activeEventId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${activeEventId}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [screenId, activeEventId]);

  useEffect(() => {
    if (config?.marquee_mode === 'game-fx' && config?.game_start_at) {
      setGameState('chaos');
      const t1 = setTimeout(() => setGameState('converge'), 4000);
      const t2 = setTimeout(() => setGameState('docked'), 7000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else { setGameState('idle'); }
  }, [config?.game_start_at, config?.marquee_mode]);

  const advanceToNextQueue = async () => {
    if (isPreviewMode) return; // จอพรีวิวไม่ต้องส่งคำสั่งข้ามคิว ปล่อยให้จอใหญ่เป็นคนจัดการ
    try {
      const { data } = await supabase.from('event_screens_control').select('media_queue').eq('screen_id', screenId).eq('event_id', activeEventId).single();

      if (data && data.media_queue && data.media_queue.length > 0) {
        const nextMediaUrl = data.media_queue[0];
        const newQueue = data.media_queue.slice(1);

        let nextType = 'iframe';
        if (nextMediaUrl.match(/\.(jpeg|jpg|gif|png)$/i)) nextType = 'image';
        else if (nextMediaUrl.match(/\.(mp4|webm)$/i)) nextType = 'video';
        else if (nextMediaUrl.match(/\.(ppt|pptx)$/i)) nextType = 'ppt';

        await supabase.from('event_screens_control').update({
          media_url: nextMediaUrl, media_type: nextType, media_queue: newQueue, is_media_playing: true
        }).eq('screen_id', screenId).eq('event_id', activeEventId);
      } else {
        await supabase.from('event_screens_control').update({ is_media_playing: false, media_url: '' }).eq('screen_id', screenId).eq('event_id', activeEventId);
      }
    } catch (e) { }
  };

  useEffect(() => {
    let timer: any;
    if (config?.is_media_playing && config?.media_url && !isPreviewMode) {
      if (config.media_type === 'image') {
        timer = setTimeout(() => advanceToNextQueue(), 20000);
      } else if (config.media_type === 'ppt') {
        window.open(config.media_url, '_blank');
        timer = setTimeout(() => advanceToNextQueue(), 8000);
      }
    }
    return () => clearTimeout(timer);
  }, [config?.media_url, config?.is_media_playing, config?.media_type, isPreviewMode]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  const getMediaIframeUrl = () => {
    if (!config?.media_url) return '';
    let base = config.media_url;
    let videoId = '';

    try {
      if (base.includes('youtube.com/embed/')) {
        videoId = base.split('embed/')[1].split('?')[0];
      } else if (base.includes('youtu.be/')) {
        videoId = base.split('youtu.be/')[1].split('?')[0];
      } else if (base.includes('youtube.com/watch?v=')) {
        // แก้ไขจุด Error ตรงนี้: ใช้ || '' เพื่อการันตีว่าจะเป็น string แน่นอน
        videoId = new URL(base).searchParams.get('v') || '';
      }
    } catch (e) {
      console.error("Invalid YouTube URL:", base);
    }

    if (videoId) {
      // 🎯 ถ้าเป็นโหมดพรีวิว ให้บังคับปิดเสียง (mute=1) อัตโนมัติ เพื่อให้เล่นวิดีโอได้โดยไม่ต้องคลิกป้าย
      const forceMute = isPreviewMode ? '1' : (config.audio_output === 'muted' ? '1' : '0');

      // ใช้ Template literal ที่ถูกต้อง
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${forceMute}&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''
        }`;
    }
    return base;
  };

  useEffect(() => {
    let timeoutId: any;
    const checkYouTubeState = (event: any) => { if (event.data === 0 && !isPreviewMode) advanceToNextQueue(); };
    const tryInitPlayer = () => {
      if (window.YT && window.YT.Player) {
        const iframe = document.getElementById('yt-player');
        if (iframe) {
          try {
            if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') ytPlayerRef.current.destroy();
            ytPlayerRef.current = new window.YT.Player('yt-player', { events: { 'onStateChange': checkYouTubeState } });
          } catch (err) { }
        } else timeoutId = setTimeout(tryInitPlayer, 500);
      } else timeoutId = setTimeout(tryInitPlayer, 500);
    };
    if (config?.is_media_playing && config?.media_url?.includes('youtube')) timeoutId = setTimeout(tryInitPlayer, 1000);
    return () => clearTimeout(timeoutId);
  }, [config?.media_url, config?.is_media_playing, isPreviewMode]);

  const winners = useMemo(() => {
    if (config?.game_sub_mode === 'slowest') return [...messages].reverse().slice(0, config?.game_n || 3);
    return messages.slice(0, config?.game_n || 3);
  }, [messages, config]);

  if (!config) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">⏳ รอรับสัญญาณภาพ...</div>;

  const getThemeBackground = () => {
    if (config.bg_theme === 'cyan-wave') return 'bg-gradient-to-tr from-[#001f3f] via-[#005f73] to-[#0a9396]';
    if (config.bg_theme === 'custom-img' && config.bg_img_url) return `bg-cover bg-center`;
    return 'bg-gradient-to-b from-[#020208] via-[#050515] to-[#020208]';
  };

  const combinedMarqueeString = liveMessages.length > 0
    ? liveMessages.filter(m => config.filter_roles?.includes(m.sender_role)).map(m => `🌟 [${m.sender_role}] ${m.message_text}`).join('  |  ')
    : config.marquee_text;

  return (
    <div className={`min-h-screen relative overflow-hidden text-white font-sans flex flex-col justify-between p-6 select-none ${getThemeBackground()}`} style={config.bg_theme === 'custom-img' ? { backgroundImage: `url(${config.bg_img_url})` } : {}}>

      {/* 🎯 ซ่อนป้ายสีม่วงทันที ถ้าเป็นจอพรีวิว (isPreviewMode) */}
      {!interacted && !isPreviewMode && (
        <div onClick={() => setInteracted(true)} className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer">
          <div className="bg-purple-600 animate-pulse text-white px-8 py-4 rounded-3xl font-black text-2xl shadow-[0_0_40px_#a855f7]">
            👆 คลิก 1 ครั้ง เพื่อปลดล็อกระบบเสียงและการรันคิววิดีโอออโต้
          </div>
        </div>
      )}

      <div className="flex justify-between items-start z-30 w-full">
        {config.clock_position === 'top-left' || config.clock_position === 'top-right' ? (
          <div className={`bg-black/60 border border-white/10 px-4 py-2 rounded-2xl font-mono text-sm font-black text-[#00ffcc] backdrop-blur-md ${config.clock_position === 'top-right' ? 'ml-auto' : ''}`}>🕒 {currentTime}</div>
        ) : <div />}
        <div className="text-right bg-zinc-950/60 border border-white/10 backdrop-blur-xl p-3.5 rounded-2xl shadow-xl shadow-black/40">
          <h1 className="text-lg font-black tracking-wider flex items-center justify-end gap-1 font-sans italic">
            <span className="bg-gradient-to-r from-[#0028a5] via-[#4f46e5] to-[#3b82f6] bg-clip-text text-transparent">Nii</span>
            <span className="bg-gradient-to-r from-[#059669] via-[#10b981] to-[#34d399] bg-clip-text text-transparent">Vaa</span>
            <span className="text-[11px] font-medium tracking-widest text-zinc-300 not-italic ml-1.5 font-mono uppercase bg-zinc-900/80 px-2 py-0.5 rounded-md border border-white/5">SmartEvent</span>
          </h1>
          <div className="text-[10px] text-zinc-500 font-bold mt-1.5 uppercase tracking-widest flex items-center justify-end gap-1.5 font-mono"><span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span> PORT: <span className="text-cyan-400 font-black">{config.screen_name}</span></div>
        </div>
      </div>

      <div className="absolute inset-0 m-auto w-[88%] h-[68%] z-10 bg-black/40 border border-white/5 rounded-[35px] shadow-2xl flex items-center justify-center overflow-hidden">

        {config.is_media_playing === false ? (
          <div className="text-center space-y-4 animate-pulse">
            <h2 className="text-4xl font-black bg-gradient-to-r from-[#4f46e5] to-[#10b981] bg-clip-text text-transparent italic tracking-wider">NIIVAA SMART MEDIA STAGE</h2>
            <p className="text-xs text-zinc-500 font-bold font-mono tracking-widest">● MEDIA PAUSED BY CONTROL ROOM — STANDBY MODE</p>
          </div>
        ) : config.media_type === 'ppt' ? (
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-black text-amber-400">📊 PRESENTATION STANDBY</h2>
            <p className="text-xs text-zinc-400">ระบบสั่งดาวน์โหลดไฟล์ Presentation อัตโนมัติแล้ว<br />กำลังข้ามไปมารอฉายคิวต่อไป...</p>
          </div>
        ) : config.media_type === 'image' ? (
          <img src={config.media_url} className="w-full h-full object-contain" alt="media_image" />
        ) : config.media_type === 'video' ? (
          <video src={config.media_url} autoPlay muted={isPreviewMode ? true : config.audio_output === 'muted'} className="w-full h-full object-contain" onEnded={advanceToNextQueue} />
        ) : config.media_url ? (
          <iframe
            id="yt-player" key={getMediaIframeUrl()} src={getMediaIframeUrl()}
            className="w-full h-full border-none rounded-[35px]" allow="autoplay; fullscreen; encrypted-media"
          />
        ) : (
          <div className="text-center space-y-4 animate-pulse">
            <h2 className="text-3xl font-black text-white/90">ศูนย์ระบบประชุมอัจฉริยะ</h2>
            <p className="text-xs text-zinc-500 font-bold font-mono">STANDBY MODE</p>
          </div>
        )}

        {config.is_qrcode_on && (
          <div className="absolute bottom-4 right-4 bg-white p-3 rounded-2xl shadow-2xl z-20 border-4 border-purple-600 flex flex-col items-center justify-center animate-in zoom-in duration-200">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/send-message?event_id=${activeEventId}`)}`} alt="QR Code" className="w-[100px] h-[100px] rounded-lg" />
            <span className="text-[10px] font-black text-purple-900 mt-2">📲 สแกนส่งข้อความขึ้นจอ</span>
          </div>
        )}

        {config.marquee_mode === 'game-fx' && gameState !== 'idle' && (
          <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm overflow-hidden">
            {messages.map((msg) => {
              const isWinner = winners.find(w => w.id === msg.id);
              const winnerIdx = winners.findIndex(w => w.id === msg.id);
              let style: any = { color: msg.color, textShadow: `0 0 10px ${msg.color}, 0 0 20px ${msg.color}`, transition: 'all 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)', position: 'absolute', zIndex: isWinner ? 50 : 10, opacity: gameState === 'chaos' ? 1 : (isWinner ? 1 : 0) };
              if (gameState === 'chaos') { style.left = msg.randX; style.top = msg.randY; style.animation = `chaos-fly 3s infinite alternate ease-in-out ${msg.delay}`; }
              else if (gameState === 'converge' && isWinner) { style.left = '50%'; style.top = '50%'; style.transform = `translate(-50%, -50%) scale(${1.2 + (winners.length - winnerIdx) * 0.1})`; style.animation = 'blink 0.5s infinite'; }
              else if (gameState === 'docked' && isWinner) { style.left = '30px'; style.top = `${60 + (winnerIdx * 60)}px`; style.transform = 'scale(1)'; style.textAlign = 'left'; }
              return <div key={msg.id} style={style} className="font-black text-xl px-4 py-2 rounded-2xl whitespace-nowrap bg-black/40 border border-white/10">{msg.message_text}</div>;
            })}
          </div>
        )}
      </div>

      {config.is_marquee_on && config.marquee_mode !== 'game-fx' && (
        <div className={`fixed inset-x-0 bg-black/70 backdrop-blur-md border-y border-white/5 py-2.5 z-20 font-sans text-xs font-black overflow-hidden flex items-center ${config.marquee_position === 'top' ? 'top-16' : 'bottom-0'}`} style={{ color: config.font_color || '#ffffff' }}>
          {config.marquee_mode === 'right-to-left' ? (
            <div className="whitespace-nowrap animate-marquee flex items-center gap-4" style={{ animationDuration: `${30 - (config.marquee_speed * 2.5)}s` }}><span>{combinedMarqueeString}</span><span className="ml-24">{combinedMarqueeString}</span></div>
          ) : config.marquee_mode === 'left-to-right' ? (
            <div className="whitespace-nowrap animate-marquee-reverse flex items-center gap-4" style={{ animationDuration: `${30 - (config.marquee_speed * 2.5)}s` }}><span>{combinedMarqueeString}</span><span className="mr-24">{combinedMarqueeString}</span></div>
          ) : (
            <div className="w-full text-center h-6 overflow-hidden relative"><div className="absolute inset-x-0 animate-scroll-up space-y-1">{liveMessages.slice(0, 3).map((m, mIdx) => (<p key={mIdx} className="truncate tracking-wide text-center">💬 {m.message_text}</p>))}</div></div>
          )}
        </div>
      )}

      <div className="flex justify-between items-end w-full z-30">
        {config.clock_position === 'bottom-left' || config.clock_position === 'bottom-right' ? (
          <div className={`bg-black/60 border border-white/10 px-4 py-2 rounded-2xl font-mono text-sm font-black text-[#00ffcc] backdrop-blur-md ${config.clock_position === 'bottom-right' ? 'ml-auto' : ''}`}>🕒 {currentTime}</div>
        ) : <div />}
      </div>

      <style jsx global>{`
        @keyframes marquee { 0% { transform: translate3d(0, 0, 0); } 100% { transform: translate3d(-50%, 0, 0); } }
        @keyframes marquee-reverse { 0% { transform: translate3d(-50%, 0, 0); } 100% { transform: translate3d(0, 0, 0); } }
        @keyframes scrollUp { 0%, 20% { transform: translateY(0); } 25%, 45% { transform: translateY(-24px); } 50%, 70% { transform: translateY(-48px); } 75%, 100% { transform: translateY(0); } }
        @keyframes chaos-fly { 0% { transform: translate(0, 0) rotate(0deg); } 33% { transform: translate(30px, -50px) rotate(5deg); } 66% { transform: translate(-40px, 30px) rotate(-5deg); } 100% { transform: translate(20px, 40px) rotate(2deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; filter: brightness(1); } 50% { opacity: 0.7; filter: brightness(2); } }
        .animate-marquee { display: inline-block; animation: marquee linear infinite; }
        .animate-marquee-reverse { display: inline-block; animation: marquee-reverse linear infinite; }
        .animate-scroll-up { animation: scrollUp 9s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default function BroadcastLiveScreen() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">Loading NiiVaa Framework...</div>}>
      <BroadcastScreenContent />
    </Suspense>
  );
}