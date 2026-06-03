"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Radio, Play, Plus, Trash2, Sliders, 
  QrCode, Clock, MessageSquare, Volume2, VolumeX, Gamepad2, Monitor,
  Square, ListMusic, ArrowUpRight, PlayCircle, Video, Presentation
} from 'lucide-react';

function SMMasterControlContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [screens, setScreens] = useState<any[]>([]);
  
  const [liveMessages, setLiveMessages] = useState<any[]>([]);
  const [newLiveMessage, setNewLiveMessage] = useState<string>('');
  const [queueInput, setQueueInput] = useState<{ [key: string]: string }>({});

  const mediaPresets = {
    screen_default_bg: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
    game_url: "https://quizizz.com/join",
    qa_dashboard: "https://app.sli.do/event/mock",
  };

  const formatMediaUrl = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return finalUrl;
    try {
      if (finalUrl.includes('youtu.be/')) {
        const videoId = finalUrl.split('youtu.be/')[1].split('?')[0];
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (finalUrl.includes('youtube.com/watch?v=')) {
        const urlObj = new URL(finalUrl);
        const videoId = urlObj.searchParams.get('v');
        finalUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    } catch (e) {}
    return finalUrl;
  };

  // 🎯 ดึงรูปหน้าปก YouTube มาแสดงที่จอพรีวิวจิ๋ว เพื่อความเบาและรวดเร็ว
  const getYouTubeThumb = (url: string) => {
    if (!url) return '';
    let vid = '';
    if (url.includes('embed/')) vid = url.split('embed/')[1].split('?')[0];
    else if (url.includes('youtu.be/')) vid = url.split('youtu.be/')[1].split('?')[0];
    else if (url.includes('youtube.com/watch?v=')) vid = new URL(url).searchParams.get('v');
    return vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : '';
  };

  const fetchAllEventsDropdown = async () => {
    try {
      const { data, error } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
      if (!error && data) {
        setEventsList(data);
        const urlEventId = searchParams?.get?.('event_id');
        if (urlEventId && data.some(e => e.id === urlEventId)) setSelectedEventId(urlEventId);
      }
    } catch (err) {}
  };

  const fetchScreensForSelectedEvent = async (targetEventId: string) => {
    if (!targetEventId) { setScreens([]); return; }
    try {
      const { data, error } = await supabase.from('event_screens_control').select('*').eq('event_id', targetEventId);
      if (!error && data) setScreens(data.sort((a, b) => a.screen_id.localeCompare(b.screen_id, undefined, { numeric: true, sensitivity: 'base' })));
    } catch (err) {}
  };

  const fetchLiveMessages = async (targetEventId: string) => {
    if (!targetEventId) { setLiveMessages([]); return; }
    try {
      const { data, error } = await supabase.from('event_live_messages').select('*').eq('event_id', targetEventId).order('created_at', { ascending: false });
      if (!error && data) setLiveMessages(data);
    } catch (err) {}
  };

  useEffect(() => { fetchAllEventsDropdown(); }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    fetchScreensForSelectedEvent(selectedEventId);
    fetchLiveMessages(selectedEventId);

    const screenChannel = supabase.channel(`realtime_sm_controls_${selectedEventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_screens_control', filter: `event_id=eq.${selectedEventId}` }, () => fetchScreensForSelectedEvent(selectedEventId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${selectedEventId}` }, () => fetchLiveMessages(selectedEventId))
      .subscribe();

    return () => { supabase.removeChannel(screenChannel); };
  }, [selectedEventId]);

  const handleUpdateScreenConfig = async (screenId: string, payload: any) => {
    if (!selectedEventId) return;
    setScreens(prev => prev.map(s => s.screen_id === screenId ? { ...s, ...payload } : s));
    try {
      await supabase.from('event_screens_control').update(payload).match({ event_id: selectedEventId, screen_id: screenId });
    } catch (err) {}
  };

  const handleAddNewScreenDynamic = async () => {
    if (!selectedEventId) return;
    const nextScreenNumber = screens.length + 1;
    const defaultScreenId = `screen_${nextScreenNumber}`;
    const customRoom = prompt(`🏢 ชื่อห้องบรรยายประจำ จอที่ ${nextScreenNumber}:`, `ห้องประชุมย่อย ${nextScreenNumber}`);
    if (customRoom === null) return; 
    const customName = prompt(`📺 ชื่อเรียกจอภาพ:`, `จอหลัก ${customRoom}`);
    if (!customName) return;

    setLoading(true);
    try {
      await supabase.from('event_screens_control').insert([{
        event_id: selectedEventId, screen_id: defaultScreenId, screen_name: customName, room_name: customRoom,
        media_type: 'image', media_url: mediaPresets.screen_default_bg, audio_output: 'muted', marquee_text: `ยินดีต้อนรับเข้าสู่ ${customRoom}`,
        marquee_mode: 'right-to-left', marquee_speed: 5, font_color: '#ffffff', is_marquee_on: true, is_qrcode_on: false,
        bg_theme: 'neon-dark', bg_img_url: '', marquee_position: 'bottom', clock_position: 'top-left',
        filter_roles: ['VIP', 'CEO', 'SM', 'Staff', 'guest'], is_media_playing: true, media_queue: []
      }]);
      fetchScreensForSelectedEvent(selectedEventId);
    } catch (err) {} finally { setLoading(false); }
  };

  const handleAddLiveMessage = async () => {
    if (!newLiveMessage.trim() || !selectedEventId) return;
    try {
      const { error } = await supabase.from('event_live_messages').insert([{ event_id: selectedEventId, message_text: newLiveMessage.trim(), is_approved: true }]);
      if (!error) { setNewLiveMessage(''); fetchLiveMessages(selectedEventId); }
    } catch (err) {}
  };

  const handleSwitchAudioMatrix = async (targetScreenId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'unmuted' ? 'muted' : 'unmuted';
    setScreens(prev => prev.map(s => s.screen_id === targetScreenId ? { ...s, audio_output: nextStatus } : (nextStatus === 'unmuted' ? { ...s, audio_output: 'muted' } : s)));
    if (nextStatus === 'unmuted') {
      for (const screen of screens) {
        await supabase.from('event_screens_control').update({ audio_output: screen.screen_id === targetScreenId ? 'unmuted' : 'muted' }).match({ event_id: selectedEventId, screen_id: screen.screen_id });
      }
    } else {
      await supabase.from('event_screens_control').update({ audio_output: 'muted' }).match({ event_id: selectedEventId, screen_id: targetScreenId });
    }
  };

  const handleAddToQueue = async (screenId: string, currentQueue: string[]) => {
    const inputUrl = queueInput[screenId]?.trim();
    if (!inputUrl) return;
    const formattedUrl = formatMediaUrl(inputUrl);
    const updatedQueue = [...(currentQueue || []), formattedUrl];
    setQueueInput(prev => ({ ...prev, [screenId]: '' }));
    await handleUpdateScreenConfig(screenId, { media_queue: updatedQueue });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 select-none font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* SELECT EVENT */}
        <div className="bg-zinc-950 p-5 border border-purple-500/20 rounded-2xl shadow-2xl text-left">
          <label className="text-[11px] font-black text-purple-400 uppercase tracking-wider block mb-2">🏛️ เลือกโครงการสัมมนาหลัก</label>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 font-black text-xs outline-none focus:border-purple-500 text-white cursor-pointer">
            <option value="">-- กรุณาเลือกชื่องานสัมมนาเพื่อเชื่อมสัญญาณระบบคุมสื่อ --</option>
            {eventsList.map((evt) => <option key={evt.id} value={evt.id} className="bg-zinc-950">📝 ชื่องาน: {evt.title}</option>)}
          </select>
        </div>

        {selectedEventId && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-zinc-950 p-5 border border-white/5 rounded-3xl space-y-6 shadow-2xl text-left">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h2 className="text-sm font-black text-purple-400 flex items-center gap-1.5"><Radio size={16} className="text-red-500 animate-pulse" /> แผงควบคุมสัญญาณภาพ NiiVaa Matrix</h2>
                  <button onClick={handleAddNewScreenDynamic} className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-[11px] flex items-center gap-1.5">
                    <Plus size={14}/> เพิ่มจอภาพปลายทาง
                  </button>
                </div>

                {screens.map((scr) => {
                  const isAudioLive = scr.audio_output === 'unmuted';
                  const ytThumb = getYouTubeThumb(scr.media_url);
                  const combinedMarqueeString = liveMessages.length > 0 
                    ? liveMessages.filter(m => scr.filter_roles?.includes(m.sender_role)).map(m => `🌟 [${m.sender_role}] ${m.message_text}`).join('  |  ')
                    : scr.marquee_text;

                  return (
                    <div key={scr.screen_id} className="bg-[#0b0f19] border border-white/5 rounded-2xl p-5 space-y-4 shadow-xl">
                      
                      {/* HEADER */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                              📺 {scr.screen_name} <span className="text-[10px] text-zinc-500 font-mono">({scr.screen_id})</span>
                            </h3>
                            <a href={`/broadcast/screen?screen_id=${scr.screen_id}&event_id=${selectedEventId}`} target="_blank" className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-2 py-0.5 rounded font-bold text-[9px] transition-all flex items-center gap-1 cursor-pointer">
                              เปิดแท็บจอใหญ่
                            </a>
                          </div>
                          <p className="text-[9px] text-purple-300 font-bold">🏢 ห้องติดตั้ง: {scr.room_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSwitchAudioMatrix(scr.screen_id, scr.audio_output)} className={`py-1 px-2.5 rounded-lg border font-black text-[10px] flex items-center gap-1 cursor-pointer ${isAudioLive ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                            {isAudioLive ? <Volume2 size={12}/> : <VolumeX size={12}/>} {isAudioLive ? 'LIVE' : 'MUTED'}
                          </button>
                          <button onClick={() => { if(confirm('ลบจอนี้?')) { supabase.from('event_screens_control').delete().eq('id', scr.id); fetchScreensForSelectedEvent(selectedEventId); } }} className="p-1 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400 rounded-lg"><Trash2 size={12}/></button>
                        </div>
                      </div>

                      <div className="flex flex-col lg:flex-row gap-5">
                        
                        {/* 🎯 จอจิ๋ว SMART MONITOR แบบจำลอง UI เพื่อความเร็วแสง */}
                        <div className="w-full lg:w-[280px] shrink-0 space-y-1.5">
                          <span className="text-[10px] text-cyan-400 font-black uppercase flex items-center gap-1"><Monitor size={12}/> Smart Monitor</span>
                          
                          <div 
                            className="relative w-[280px] h-[157px] rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col items-center justify-center bg-black transition-all"
                            style={scr.bg_theme === 'custom-img' ? { backgroundImage: `url(${scr.bg_img_url})`, backgroundSize: 'cover' } : {}}
                          >
                            {/* ฉากหลังธีม */}
                            {scr.bg_theme === 'cyan-wave' && <div className="absolute inset-0 bg-gradient-to-tr from-[#001f3f] via-[#005f73] to-[#0a9396] z-0" />}
                            {scr.bg_theme === 'neon-dark' && <div className="absolute inset-0 bg-gradient-to-b from-[#020208] via-[#050515] to-[#020208] z-0" />}

                            {/* กรอบกลางจอ (Media Area) */}
                            <div className="absolute inset-0 m-auto w-[88%] h-[68%] bg-black/60 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden z-10 shadow-inner">
                              {scr.is_media_playing === false ? (
                                <span className="text-[10px] font-black text-amber-500 animate-pulse tracking-wider">STANDBY</span>
                              ) : scr.media_type === 'ppt' ? (
                                <div className="text-center text-orange-400"><Presentation size={24} className="mx-auto mb-1"/><span className="text-[8px] font-bold">PPT ACTIVE</span></div>
                              ) : scr.media_type === 'image' && scr.media_url ? (
                                <img src={scr.media_url} className="w-full h-full object-cover opacity-80" />
                              ) : ytThumb ? (
                                <div className="relative w-full h-full">
                                  <img src={ytThumb} className="w-full h-full object-cover opacity-60" />
                                  <div className="absolute inset-0 flex items-center justify-center"><PlayCircle className="text-red-500 drop-shadow-md" size={32}/></div>
                                </div>
                              ) : scr.media_url?.includes('.mp4') ? (
                                <div className="text-center text-blue-400"><Video size={24} className="mx-auto mb-1"/><span className="text-[8px] font-bold">VIDEO ACTIVE</span></div>
                              ) : (
                                <span className="text-[10px] font-black text-zinc-500">MEDIA ACTIVE</span>
                              )}
                            </div>

                            {/* จุดนาฬิกาจำลอง */}
                            <div className={`absolute w-1.5 h-1.5 bg-cyan-400 rounded-full z-20 ${scr.clock_position?.includes('top') ? 'top-2' : 'bottom-2'} ${scr.clock_position?.includes('left') ? 'left-2' : 'right-2'}`} />

                            {/* กล่อง QR จำลอง */}
                            {scr.is_qrcode_on && <div className="absolute bottom-1 right-1 bg-white p-0.5 rounded border border-purple-500 z-20"><QrCode size={12} className="text-black"/></div>}

                            {/* แถบตัววิ่งจำลอง */}
                            {scr.is_marquee_on && scr.marquee_mode !== 'game-fx' && (
                              <div className={`absolute inset-x-0 bg-black/80 py-0.5 px-2 text-[8px] font-bold whitespace-nowrap overflow-hidden z-20 ${scr.marquee_position === 'top' ? 'top-0' : 'bottom-0'}`} style={{ color: scr.font_color || '#fff' }}>
                                <div className={scr.marquee_mode === 'right-to-left' ? 'animate-marquee' : 'animate-marquee-reverse'}>
                                  <span>{combinedMarqueeString}</span>
                                </div>
                              </div>
                            )}

                            {/* Game Mode Overlay จำลอง */}
                            {scr.marquee_mode === 'game-fx' && (
                              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-30">
                                <span className="text-[12px] font-black text-amber-400 animate-bounce">🎮 GAME MODE</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* แผงปุ่มควบคุมสื่อ */}
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                            <div className="space-y-1">
                              <span className="text-cyan-400 font-black">🔗 URL สื่อหลักที่กำลังฉายอยู่:</span>
                              <input 
                                type="text" value={scr.media_url}
                                onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { media_url: e.target.value })}
                                onBlur={(e) => { const formatted = formatMediaUrl(e.target.value); handleUpdateScreenConfig(scr.screen_id, { media_url: formatted }); }}
                                className="w-full bg-black/60 border border-white/5 rounded-xl p-2 font-mono text-[10px] text-zinc-300 outline-none focus:border-cyan-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-purple-400 font-black">📝 ข้อความบอร์ดวิ่งตัวอักษร:</span>
                              <input 
                                type="text" value={scr.marquee_text}
                                onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { marquee_text: e.target.value })}
                                className="w-full bg-black/60 border border-white/5 rounded-xl p-2 font-sans font-bold text-[10px] text-zinc-300 outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 bg-black/20 p-2 rounded-xl border border-white/5 items-center">
                            <span className="text-[10px] text-zinc-400 font-bold">🕹️ การควบคุมวิดีโอ:</span>
                            <button 
                              onClick={() => handleUpdateScreenConfig(scr.screen_id, { is_media_playing: true })}
                              className={`px-3 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all ${scr.is_media_playing !== false ? 'bg-cyan-600 text-white shadow-[0_0_10px_#0891b2]' : 'bg-zinc-800 text-zinc-500'}`}
                            >
                              <Play size={10}/> PLAY วิดีโอ
                            </button>
                            <button 
                              onClick={() => handleUpdateScreenConfig(scr.screen_id, { is_media_playing: false })}
                              className={`px-3 py-1 rounded-lg font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all ${scr.is_media_playing === false ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}
                            >
                              <Square size={10}/> STOP (สแตนบาย)
                            </button>
                          </div>

                          <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-2">
                            <span className="text-[10px] text-cyan-400 font-black flex items-center gap-1"><ListMusic size={12}/> ระบบจัดคิวลิงก์สื่อล่วงหน้า</span>
                            <div className="flex gap-2">
                              <input 
                                type="text" placeholder="วางลิงก์วิดีโอ YouTube หรือรูปภาพ เพื่อต่อคิว..."
                                value={queueInput[scr.screen_id] || ''}
                                onChange={(e) => setQueueInput(prev => ({ ...prev, [scr.screen_id]: e.target.value }))}
                                className="w-full bg-zinc-950 border border-white/10 rounded-lg p-1.5 text-[10px] text-zinc-300 outline-none focus:border-cyan-500"
                              />
                              <button onClick={() => handleAddToQueue(scr.screen_id, scr.media_queue)} className="px-3 bg-cyan-700 hover:bg-cyan-600 text-white font-black text-[10px] rounded-lg shrink-0 cursor-pointer">➕ เข้าคิว</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(!scr.media_queue || scr.media_queue.length === 0) && <p className="text-[9px] text-zinc-600 italic">ยังไม่มีคิวสื่อสแตนบาย</p>}
                              {scr.media_queue?.map((qUrl: string, qIdx: number) => (
                                <div key={qIdx} className="flex items-center gap-1 bg-zinc-900 border border-white/5 rounded-md p-1 text-[9px]">
                                  <span className="text-zinc-500 font-mono font-bold">#{qIdx+1}</span>
                                  <button onClick={() => {
                                      const type = qUrl.includes('.mp4') ? 'video' : qUrl.includes('.ppt') ? 'ppt' : qUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? 'image' : 'iframe';
                                      handleUpdateScreenConfig(scr.screen_id, { media_url: qUrl, is_media_playing: true, media_type: type });
                                    }} 
                                    className="text-cyan-400 hover:underline font-mono max-w-[120px] truncate flex items-center gap-0.5"
                                  >
                                    {qUrl} <ArrowUpRight size={8}/>
                                  </button>
                                  <button onClick={() => { const nQ = scr.media_queue.filter((_: any, i: number) => i !== qIdx); handleUpdateScreenConfig(scr.screen_id, { media_queue: nQ }); }} className="text-zinc-600 hover:text-red-400 font-bold ml-1">×</button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-black/60 border border-white/5 rounded-xl p-3 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                              <span className="text-[10px] text-purple-400 font-black">⚙️ ปรับคุณสมบัติบอร์ดวิ่ง & เกมส์</span>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleUpdateScreenConfig(scr.screen_id, { is_marquee_on: !scr.is_marquee_on })} className={`px-2 py-0.5 rounded text-[9px] font-black border cursor-pointer ${scr.is_marquee_on ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                                  {scr.is_marquee_on ? '🟢 MARQUEE ON' : '🔴 MARQUEE OFF'}
                                </button>
                                <button onClick={() => handleUpdateScreenConfig(scr.screen_id, { is_qrcode_on: !scr.is_qrcode_on })} className={`px-2 py-0.5 rounded text-[9px] font-black border cursor-pointer ${scr.is_qrcode_on ? 'bg-cyan-950 text-cyan-400 border-cyan-800' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>
                                  <QrCode size={10} className="inline mr-0.5" /> {scr.is_qrcode_on ? 'QR ON' : 'QR HIDDEN'}
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold">
                              <div>
                                <span className="text-zinc-500 text-[9px] block mb-0.5">1. ทิศทางวิ่ง</span>
                                <select value={scr.marquee_mode || 'right-to-left'} onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { marquee_mode: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded p-1 text-white cursor-pointer">
                                  <option value="right-to-left">ขวาไปซ้าย</option>
                                  <option value="left-to-right">ซ้ายไปขวา</option>
                                  <option value="bottom-to-top">ล่างขึ้นบน</option>
                                  <option value="game-fx">🎮 โหมดเกม Chaos</option>
                                </select>
                              </div>
                              <div>
                                <div className="flex justify-between"><span className="text-zinc-500 text-[9px]">2. ความเร็ว</span><span className="text-purple-400 font-mono text-[9px]">Lv.{scr.marquee_speed}</span></div>
                                <input type="range" min="1" max="12" value={scr.marquee_speed || 5} onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { marquee_speed: parseInt(e.target.value) })} className="w-full accent-purple-500 h-1 bg-zinc-900 rounded cursor-pointer mt-1"/>
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] block mb-0.5">3. สีฟอนต์วิ่ง</span>
                                <div className="flex items-center gap-1 bg-zinc-950 border border-white/10 rounded p-0.5">
                                  <input type="color" value={scr.font_color || '#ffffff'} onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { font_color: e.target.value })} className="w-4 h-4 cursor-pointer bg-transparent border-none"/>
                                  <span className="font-mono text-zinc-400 text-[8px] uppercase truncate">{scr.font_color || '#ffffff'}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-zinc-500 text-[9px] block mb-0.5">4. มุมนาฬิกา</span>
                                <select value={scr.clock_position || 'top-left'} onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { clock_position: e.target.value })} className="w-full bg-zinc-950 border border-white/10 rounded p-1 text-white cursor-pointer">
                                  <option value="top-left">บนซ้าย</option>
                                  <option value="top-right">บนขวา</option>
                                  <option value="bottom-left">ล่างซ้าย</option>
                                  <option value="bottom-right">ล่างขวา</option>
                                </select>
                              </div>
                            </div>

                            <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-2.5 mt-1">
                              <span className="text-[10px] text-amber-400 font-black block mb-1.5"><Gamepad2 size={11} className="inline mr-1"/> ระบบเกมส์อัจฉริยะ</span>
                              <div className="flex gap-2">
                                <select value={scr.game_sub_mode || 'fastest'} onChange={(e) => handleUpdateScreenConfig(scr.screen_id, { game_sub_mode: e.target.value })} className="flex-1 bg-black border border-white/10 rounded p-1 text-[10px] font-bold text-white cursor-pointer">
                                  <option value="fastest">⚡ คัด 3 คนแรกส่งเร็วสุด</option>
                                  <option value="popular">📊 นับคำซ้ำ / โหวตมหาชน</option>
                                  <option value="team">⚔️ ศึกประชันทีม (A:, B:)</option>
                                </select>
                                <button onClick={() => handleUpdateScreenConfig(scr.screen_id, { marquee_mode: 'game-fx', game_start_at: new Date().toISOString() })} className="px-4 py-1 bg-gradient-to-r from-amber-600 to-orange-500 text-black font-black rounded-md text-[10px] hover:brightness-110 cursor-pointer">
                                  🚀 ยิงเอฟเฟกต์เกมส์
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: MESSAGES */}
            <div className="space-y-6">
              <div className="bg-zinc-950 p-5 border border-white/5 rounded-3xl shadow-2xl text-left">
                <h2 className="text-xs font-black text-emerald-400 mb-4"><MessageSquare size={14} className="inline mr-1"/> คลังคำถามและประกาศด่วน</h2>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="พิมพ์ข้อความใหม่..." value={newLiveMessage} onChange={(e) => setNewLiveMessage(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleAddLiveMessage(); }} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2 text-[11px] outline-none text-white focus:border-emerald-500"/>
                  <button onClick={handleAddLiveMessage} className="px-3 bg-emerald-600 text-black font-black text-[11px] rounded-xl cursor-pointer">บันทึก</button>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {liveMessages.map((msg) => (
                    <div key={msg.id} className="bg-[#0b0f19] border border-white/5 rounded-xl p-3">
                      <p className="text-[11px] font-bold text-zinc-200">{msg.message_text}</p>
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
                        <select onChange={async (e) => { if(e.target.value) { await handleUpdateScreenConfig(e.target.value, { marquee_text: msg.message_text }); e.target.value = ""; } }} className="bg-black border border-white/10 rounded px-1 py-0.5 text-[9px] text-emerald-400 outline-none cursor-pointer">
                          <option value="">🚀 ส่งเข้าบอร์ดวิ่ง...</option>
                          {screens.map(s => <option key={s.screen_id} value={s.screen_id}>⏩ {s.screen_name}</option>)}
                        </select>
                        <button onClick={async () => { if(confirm('ลบ?')) { await supabase.from('event_live_messages').delete().eq('id', msg.id); fetchLiveMessages(selectedEventId); } }} className="text-zinc-600 hover:text-red-400 cursor-pointer"><Trash2 size={10} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default function SMMasterDynamicControlCenter() {
  return (
    <Suspense fallback={<div className="text-white p-4">Loading Matrix Dashboard...</div>}>
      <SMMasterControlContent />
    </Suspense>
  );
}