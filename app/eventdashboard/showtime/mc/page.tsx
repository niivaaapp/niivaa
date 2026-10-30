'use client';
import React, { useState, useEffect, useRef,Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tv, EyeOff, MonitorUp, GripVertical, PlayCircle, Search, Mic, LayoutGrid, SlidersHorizontal, Loader2, X, Images, CheckSquare, Shuffle, Eye, MessageSquare, Trash2, Edit3, Music, Save, HelpCircle, BookOpen } from 'lucide-react';

function MCHostDashboardContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const [photos, setPhotos] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  // 🌟 State สำหรับ Drawer คู่มือ
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [selectedDualPhotos, setSelectedDualPhotos] = useState<any[]>([]);
  const [intervalSec, setIntervalSec] = useState(10); 

  // State ควบคุมจอ Display
  const [showPhotoName, setShowPhotoName] = useState(true);
  const [showPhotoCaption, setShowPhotoCaption] = useState(true);
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [slideshowLimit, setSlideshowLimit] = useState<number>(0);

  // State สำหรับโหมดแก้ไขภาพ
  const [editingPhoto, setEditingPhoto] = useState<any>(null);
  const [editForm, setEditForm] = useState({ nickname: '', caption: '', image_url: '' });

  const channelRef = useRef<any>(null);

  const fetchPhotos = async () => {
    const { data } = await supabase.from('live_photos').select('*').order('created_at', { ascending: false });
    if (data) setPhotos(data);
  };

  useEffect(() => {
    fetchPhotos();
    const photoChannel = supabase.channel('mc_photos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_photos' }, fetchPhotos)
      .subscribe();
      
    const syncChannel = supabase.channel('display_sync', { config: { broadcast: { ack: true } } });
    syncChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') channelRef.current = syncChannel;
    });

    return () => { 
      supabase.removeChannel(photoChannel); 
      supabase.removeChannel(syncChannel);
    };
  }, []);

  const broadcastSettings = async (updates: any) => {
    if (channelRef.current) {
      await channelRef.current.send({ type: 'broadcast', event: 'display_settings', payload: updates });
    }
  };

  const handleToggleDisplay = (type: 'name' | 'caption') => {
    const newNameState = type === 'name' ? !showPhotoName : showPhotoName;
    const newCaptionState = type === 'caption' ? !showPhotoCaption : showPhotoCaption;
    if (type === 'name') setShowPhotoName(newNameState);
    if (type === 'caption') setShowPhotoCaption(newCaptionState);
    broadcastSettings({ showPhotoName: newNameState, showPhotoCaption: newCaptionState });
  };

  const handleToggleBGM = () => {
    const newState = !bgmPlaying;
    setBgmPlaying(newState);
    broadcastSettings({ bgmPlaying: newState });
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const limit = Number(e.target.value);
    setSlideshowLimit(limit);
    broadcastSettings({ slideshowLimit: limit });
  };

  // 🌟 ฟังก์ชันซ่อน/แสดงภาพ (ใช้เปิด-ปิดรูปที่ไม่อยากให้อยู่ในลูปสไลด์)
  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    await supabase.from('live_photos').update({ is_approved: !currentStatus }).eq('id', id);
    fetchPhotos();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพนี้ออกจากระบบ?')) return;
    await supabase.from('live_photos').delete().eq('id', id);
    fetchPhotos();
  };

  const openEditModal = (photo: any) => {
    setEditingPhoto(photo);
    setEditForm({ nickname: photo.nickname || '', caption: photo.caption || '', image_url: photo.image_url || photo.url || '' });
  };

  const saveEdit = async () => {
    if (!editingPhoto) return;
    await supabase.from('live_photos').update({
      nickname: editForm.nickname, caption: editForm.caption, image_url: editForm.image_url
    }).eq('id', editingPhoto.id);
    setEditingPhoto(null);
    fetchPhotos();
  };

  const toggleListening = () => {
    if (isListening) return; 
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง');
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => { setSearchQuery(event.results[0][0].transcript.replace(/\.$/, '')); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const sortedPhotos = [...photos]
    .filter(p => (p.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.caption || '').toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.is_approved !== b.is_approved) return a.is_approved ? -1 : 1;
      if (a.sort_order !== b.sort_order) return (a.sort_order || 999) - (b.sort_order || 999);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleUpdateOrder = async (id: string, newOrder: string) => {
    const orderNum = newOrder === '' ? 999 : parseInt(newOrder, 10);
    await supabase.from('live_photos').update({ sort_order: orderNum }).eq('id', id);
    fetchPhotos();
  };

  const toggleDualSelection = (photo: any) => {
    if (selectedDualPhotos.find(p => p.id === photo.id)) setSelectedDualPhotos(selectedDualPhotos.filter(p => p.id !== photo.id));
    else { if (selectedDualPhotos.length >= 2) return alert('เลือกภาพได้สูงสุด 2 ภาพครับ'); setSelectedDualPhotos([...selectedDualPhotos, photo]); }
  };

  const handlePushDualToScreen = async () => {
    if (selectedDualPhotos.length !== 2) return alert('กรุณาเลือกภาพให้ครบ 2 ภาพก่อนครับ');
    await supabase.from('screen_state').update({ mode: 'dual_photo', focused_photos: selectedDualPhotos.map(p => ({ id: p.id, url: p.image_url, nickname: p.nickname, caption: p.caption })) }).eq('id', 'current');
    setSelectedDualPhotos([]); 
  };

  const handleStartDualSlideshow = async () => {
    const approved = photos.filter(p => p.is_approved);
    if (approved.length < 2) return alert('ต้องมีรูปที่แสดงผลได้(เปิดตา)อย่างน้อย 2 รูป จึงจะเล่นสไลด์คู่ได้');
    let pool = [...approved].sort(() => Math.random() - 0.5); let pairedFlatList = [];
    while(pool.length > 0) { let p1 = pool.shift(); pairedFlatList.push(p1); let p2Index = pool.findIndex(p => p.nickname !== p1.nickname); if (p2Index !== -1) pairedFlatList.push(pool.splice(p2Index, 1)[0]); else if (pool.length > 0) pairedFlatList.push(pool.shift()); }
    const formattedForDB = pairedFlatList.map(p => ({ id: p.id, url: p.image_url, nickname: p.nickname, caption: p.caption }));
    await supabase.from('screen_state').update({ mode: 'dual_slideshow', gallery_interval_sec: intervalSec, focused_photos: formattedForDB }).eq('id', 'current');
  };

  const handleStartSingleSlideshow = async () => { await supabase.from('screen_state').update({ mode: 'live_gallery', gallery_interval_sec: intervalSec }).eq('id', 'current'); };
  const handleStartActivitySlideshow = async () => { await supabase.from('screen_state').update({ mode: 'activity_gallery', gallery_interval_sec: intervalSec }).eq('id', 'current'); };
  const handlePushToScreen = async (photo: any) => { await supabase.from('screen_state').update({ mode: 'single_photo', focused_photo: { url: photo.image_url, nickname: photo.nickname, caption: photo.caption, id: photo.id } }).eq('id', 'current'); };
  const handlePushActivityToScreen = async (photo: any) => { await supabase.from('screen_state').update({ mode: 'activity_single', focused_photo: { url: photo.image_url, nickname: photo.nickname, caption: photo.caption, id: photo.id } }).eq('id', 'current'); };
  const handleStandby = async () => { await supabase.from('screen_state').update({ mode: 'standby', focused_photo: null, focused_photos: [] }).eq('id', 'current'); };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden pb-32">
      
      {/* 🌟 Slide-over Drawer (คู่มือการใช้งาน) */}
      <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
            <h2 className="text-2xl font-black text-cyan-400 flex items-center gap-2"><BookOpen size={24} /> คู่มือการใช้งาน</h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-xl transition-colors"><X size={20} /></button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-zinc-300">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Eye size={18} className="text-amber-400"/> 1. การควบคุมหน้าจอ (Display Settings)</h3>
              <p>สามารถกดปุ่ม <b className="text-amber-400">"เปิด/ปิด ชื่อ"</b> หรือ <b className="text-cyan-400">"เปิด/ปิด คำอวยพร"</b> ที่แถบเมนูด้านบน เพื่อสั่งซ่อนข้อความบนโปรเจคเตอร์แบบเรียลไทม์ เหมาะสำหรับเวลาต้องการโชว์แค่รูปเต็มๆ</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Music size={18} className="text-pink-400"/> 2. การควบคุมดนตรี (BGM)</h3>
              <p>ปุ่ม <b className="text-pink-400">MUSIC ON/OFF</b> ใช้สั่งให้จอโปรเจคเตอร์เปิดเล่นเพลงคลอเบาๆ <i>(ระบบจะดึงไฟล์ `bgm-soft.mp3` ในโฟลเดอร์ public มาเล่น)</i></p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><EyeOff size={18} className="text-red-400"/> 3. การซ่อน/แสดงภาพในสไลด์</h3>
              <p>ในช่องรูปภาพแต่ละรูป จะมีปุ่มรูปดวงตา หากต้องการนำภาพกิจกรรมหรือภาพเบลอ <b className="text-red-400">"ออกจากลูปสไลด์โชว์"</b> ให้กดซ่อนภาพนั้น ภาพจะถูกกันออกจากการฉายสไลด์อัตโนมัติทันที</p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><SlidersHorizontal size={18} className="text-indigo-400"/> 4. การกรองจำนวนภาพสไลด์</h3>
              <p>สามารถตั้งค่าจำกัดการดึงภาพได้ เช่น <b className="text-indigo-300">"10 ภาพล่าสุด"</b> ระบบจะตัดภาพเก่าทิ้งและเล่นวนเฉพาะภาพใหม่ๆ ลดปัญหาการรอสไลด์นาน</p>
            </div>
            <hr className="border-zinc-800" />
            <div>
              <h3 className="text-lg font-bold text-white mb-3">รูปแบบการฉาย (Layouts)</h3>
              <ul className="space-y-4">
                <li className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <b className="text-emerald-400 block mb-1">▶️ สไลด์บุคคล (Single Photo)</b>
                  ฉายภาพเดี่ยวโดยมี <b>"ภาพกรอบ 3D อยู่ฝั่งซ้าย"</b> และ <b>"ข้อความอยู่ฝั่งขวา"</b> (เหมาะกับงานแต่ง/แนะนำตัว)
                </li>
                <li className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <b className="text-fuchsia-400 block mb-1">▶️ สไลด์คู่ (Dual Slideshow)</b>
                  จับคู่ภาพทีละ 2 รูป <b>"ภาพอยู่ด้านบน ข้อความทับส่วนล่าง"</b> (ประหยัดเวลาฉาย)
                </li>
                <li className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <b className="text-sky-400 block mb-1">▶️ สไลด์กิจกรรม (Activity Gallery)</b>
                  ภาพขยายเกือบเต็มจอ (97%) <b>"แบนเนอร์ข้อความธีมสีองค์กรอยู่ด้านล่าง"</b> ปรับฟอนต์ออโต้ไม่ล้นขอบ (เหมาะสำหรับภาพหมู่/ผลงาน)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 Modal สำหรับแก้ไขรูปภาพ */}
      {editingPhoto && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-[2rem] w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setEditingPhoto(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
            <h2 className="text-2xl font-black text-cyan-400 mb-6 flex items-center gap-2"><Edit3 size={24} /> แก้ไขข้อมูลภาพ</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-zinc-400 font-bold text-sm mb-2">ลิงก์รูปภาพ (URL) - หากต้องการเปลี่ยนภาพแต่ใช้คำอธิบายเดิม</label>
                <input type="text" value={editForm.image_url} onChange={e => setEditForm({...editForm, image_url: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-zinc-400 font-bold text-sm mb-2">ชื่อ - นามสกุล / หัวข้อ</label>
                <input type="text" value={editForm.nickname} onChange={e => setEditForm({...editForm, nickname: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-zinc-400 font-bold text-sm mb-2">คำอธิบายภาพ / คำอวยพร</label>
                <textarea value={editForm.caption} onChange={e => setEditForm({...editForm, caption: e.target.value})} rows={3} className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingPhoto(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors">ยกเลิก</button>
              <button onClick={saveEdit} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2">
                <Save size={20} /> บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Header Top Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex flex-wrap justify-between items-center sticky top-0 z-40 shadow-md gap-4">
        <div className="flex items-center gap-6">
          <img src="/niivaasmartevent_logo.png" alt="NiiVaa Smart Event" className="h-8 object-contain" />
          {eventId && (
            <div className="flex gap-2">
              <Link href={`/events/event-dashboard/${eventId}`} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors text-xs">
                <LayoutGrid size={14} /> Dashboard
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded-xl border border-zinc-800">
            <span className="text-zinc-500 font-bold text-[10px] px-2 hidden md:block">DISPLAY:</span>
            <button onClick={() => handleToggleDisplay('name')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${showPhotoName ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-zinc-500 hover:text-zinc-300 bg-black/40 border border-transparent'}`}>
              {showPhotoName ? <Eye size={14} /> : <EyeOff size={14} />} ชื่อ
            </button>
            <button onClick={() => handleToggleDisplay('caption')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${showPhotoCaption ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-500 hover:text-zinc-300 bg-black/40 border border-transparent'}`}>
              {showPhotoCaption ? <MessageSquare size={14} /> : <EyeOff size={14} />} อวยพร
            </button>
          </div>

          <div className="w-px h-6 bg-zinc-800"></div>

          <button onClick={handleToggleBGM} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border ${bgmPlaying ? 'bg-pink-600/20 text-pink-400 border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)] animate-pulse' : 'bg-black/50 text-zinc-500 border-zinc-800 hover:text-zinc-300'}`}>
            <Music size={16} className={bgmPlaying ? "animate-bounce" : ""} />
            {bgmPlaying ? 'MUSIC ON' : 'MUSIC OFF'}
          </button>

          {/* 🌟 ปุ่มเปิดคู่มือ */}
          <button onClick={() => setIsGuideOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg">
            <HelpCircle size={16} /> คู่มือ
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto p-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl mb-6 gap-6">
          <div>
            <h1 className="text-3xl font-black text-cyan-400 tracking-wider">🎙️ MC CONTROLLER</h1>
            <p className="text-zinc-500 font-bold mt-1">ระบบคัดกรองและส่งภาพขึ้นจอสำหรับพิธีกร</p>
          </div>
          
          <div className="flex flex-col items-end gap-4 w-full xl:w-auto">
            {/* 🌟 แถบตั้งค่าการสไลด์ (กรองภาพล่าสุด) */}
            <div className="flex flex-wrap items-center gap-3 bg-black/40 p-2 rounded-2xl border border-zinc-800 w-full xl:w-auto justify-end">
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm text-zinc-400 font-bold">แสดงผล:</span>
                <select value={slideshowLimit} onChange={handleLimitChange} className="bg-zinc-800 text-white font-bold rounded-lg px-2 py-1.5 border border-zinc-700 outline-none focus:border-cyan-500 text-sm">
                  <option value={0}>ทั้งหมด (All)</option>
                  <option value={5}>5 ภาพล่าสุด</option>
                  <option value={10}>10 ภาพล่าสุด</option>
                  <option value={20}>20 ภาพล่าสุด</option>
                  <option value={50}>50 ภาพล่าสุด</option>
                </select>
              </div>
              <div className="w-px h-6 bg-zinc-700 hidden sm:block"></div>
              <div className="flex items-center gap-2 px-3">
                <span className="text-sm text-zinc-400 font-bold">เวลาสไลด์:</span>
                <input type="number" value={intervalSec} onChange={e => setIntervalSec(Number(e.target.value))} className="w-14 bg-zinc-800 text-white font-black text-center rounded-lg py-1 border border-zinc-700 outline-none focus:border-cyan-500 transition-colors text-sm" />
                <span className="text-sm text-zinc-400 font-bold">วิ</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
              <button onClick={handlePushDualToScreen} disabled={selectedDualPhotos.length !== 2} className="bg-indigo-950 hover:bg-indigo-900 disabled:opacity-30 disabled:grayscale text-indigo-400 px-4 py-2.5 rounded-xl font-bold transition-all border border-indigo-900/50 flex items-center gap-2 text-sm">
                <Images size={16} /> ฉายคู่ <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedDualPhotos.length === 2 ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{selectedDualPhotos.length}/2</span>
              </button>
              <button onClick={handleStartDualSlideshow} className="bg-fuchsia-950 hover:bg-fuchsia-900 text-fuchsia-400 px-4 py-2.5 rounded-xl font-bold transition-all border border-fuchsia-900/50 flex items-center gap-2 text-sm">
                <Shuffle size={16} /> สไลด์คู่
              </button>
              <div className="w-px h-8 bg-zinc-800 mx-1 hidden md:block"></div>
              <button onClick={handleStartActivitySlideshow} className="bg-sky-950 hover:bg-sky-900 text-sky-400 px-4 py-2.5 rounded-xl font-bold transition-all border border-sky-900/50 flex items-center gap-2 text-sm">
                <LayoutGrid size={16} /> สไลด์กิจกรรม
              </button>
              <button onClick={handleStartSingleSlideshow} className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 px-4 py-2.5 rounded-xl font-bold transition-all border border-emerald-900/50 flex items-center gap-2 text-sm">
                <PlayCircle size={16} /> สไลด์บุคคล
              </button>
              <button onClick={handleStandby} className="bg-red-950 hover:bg-red-900 text-red-400 px-4 py-2.5 rounded-xl font-bold transition-all border border-red-900/50 flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <Tv size={16} /> ปิดจอ
              </button>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-2xl flex items-center gap-3 mb-6 shadow-md focus-within:border-cyan-500 transition-colors">
          <div className="pl-4 text-zinc-500"><Search size={20} /></div>
          <input type="text" placeholder="ค้นหาชื่อ หรือ คำบรรยายภาพ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent border-none text-white font-medium text-lg outline-none placeholder:text-zinc-600" />
          {searchQuery && (<button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-300 font-bold px-2">ล้าง</button>)}
        </div>

        <div className="space-y-4">
          {sortedPhotos.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-500">
              <Search size={40} className="mb-3 opacity-20" />
              <p className="font-bold text-lg">ไม่พบรูปภาพ หรือ ชื่อรายชื่อที่ค้นหา</p>
            </div>
          ) : (
            sortedPhotos.map((p) => {
              const isSelectedDual = selectedDualPhotos.find(s => s.id === p.id);
              return (
                <div key={p.id} className={`flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border-y-2 border-r-2 border-l-8 transition-all relative ${isSelectedDual ? 'bg-indigo-950/40 border-y-indigo-900 border-r-indigo-900 border-l-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : p.is_approved ? 'bg-zinc-900/80 border-y-zinc-800 border-r-zinc-800 border-l-teal-500 hover:border-l-teal-400 hover:bg-zinc-900' : 'bg-red-950/20 border-red-900/30 border-l-red-900 opacity-60 grayscale-[50%]'}`}>

                  {/* โซนที่ 1: ตัวจัดลำดับ */}
                  <div className="flex flex-col items-center gap-1 shrink-0 ml-2">
                    <GripVertical className="text-zinc-600 w-5 h-5 mb-1" />
                    <input type="number" placeholder="-" value={p.sort_order === 999 ? '' : p.sort_order} onChange={(e) => handleUpdateOrder(p.id, e.target.value)} className="w-14 h-14 bg-black border-2 border-zinc-700 rounded-xl text-center text-xl font-black text-white focus:border-teal-500 outline-none transition-all" />
                  </div>

                  {/* โซนที่ 2: รูปภาพ */}
                  <img src={p.image_url} className={`w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border-2 shrink-0 shadow-inner mt-6 sm:mt-0 ${isSelectedDual ? 'border-indigo-400' : 'border-zinc-700'}`} alt="Guest" />

                  {/* โซนที่ 3: ข้อความ */}
                  <div className="flex-1 min-w-0 text-center sm:text-left mt-4 sm:mt-0">
                    <h2 className="text-xl sm:text-2xl font-black text-white truncate">{p.nickname}</h2>
                    <p className="text-teal-400 font-medium text-base sm:text-lg truncate mt-1">"{p.caption}"</p>
                    {!p.is_approved && <span className="inline-block text-red-400 bg-red-950 px-3 py-1 rounded-md text-xs font-bold mt-3 border border-red-900">🚫 ภาพนี้ถูกงดแสดงผลจากการฉายสไลด์อัตโนมัติแล้ว</span>}
                  </div>

                  {/* โซนที่ 4: คอลัมน์ปุ่มกดด้านขวามือ (จัดระเบียบใหม่ไม่ทับกัน) */}
                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-44 mt-4 sm:mt-0">
                    
                    {/* 🌟 4.1 แถบปุ่มจัดการ (ซ่อน / แก้ไข / ลบ) */}
                    <div className="flex items-center justify-between gap-1.5 w-full bg-black/20 p-1.5 rounded-xl border border-zinc-800">
                      <button onClick={() => handleToggleApproval(p.id, p.is_approved)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-colors ${p.is_approved ? 'bg-zinc-800 text-zinc-400 hover:bg-amber-900 hover:text-amber-400' : 'bg-red-900 text-red-200 hover:bg-emerald-900 hover:text-emerald-400'}`}>
                        {p.is_approved ? <><EyeOff size={14} /> ซ่อน</> : <><Eye size={14} /> โชว์</>}
                      </button>
                      <button onClick={() => openEditModal(p)} className="p-1.5 bg-zinc-800 hover:bg-cyan-900 text-zinc-400 hover:text-cyan-400 rounded-lg transition-colors shrink-0" title="แก้ไขข้อมูล">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-zinc-800 hover:bg-red-900 text-zinc-400 hover:text-red-400 rounded-lg transition-colors shrink-0" title="ลบภาพ">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* 🌟 4.2 ปุ่มสั่งขึ้นจอ */}
                    <button onClick={() => toggleDualSelection(p)} disabled={!p.is_approved} className={`h-10 rounded-xl font-black text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 disabled:opacity-30 disabled:grayscale ${isSelectedDual ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-indigo-950 hover:text-indigo-400 hover:border-indigo-500/50'}`}>
                      <CheckSquare size={16} /> {isSelectedDual ? 'ยกเลิกจับคู่' : 'เลือกจับคู่'}
                    </button>
                    
                    <button onClick={() => handlePushToScreen(p)} disabled={!p.is_approved || isSelectedDual} className="h-10 bg-[#0a192f] hover:bg-[#112240] disabled:opacity-30 disabled:grayscale text-cyan-400 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all group">
                      <MonitorUp size={16} className="group-hover:-translate-y-1 transition-transform" /> ฉายบุคคล
                    </button>

                    <button onClick={() => handlePushActivityToScreen(p)} disabled={!p.is_approved || isSelectedDual} className="h-10 bg-sky-950 hover:bg-sky-900 disabled:opacity-30 disabled:grayscale text-sky-400 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.2)] active:scale-95 transition-all group">
                      <MonitorUp size={16} className="group-hover:-translate-y-1 transition-transform" /> ฉายกิจกรรม
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
// ==========================================
// 🚀 Component หลักที่ Export (เอา Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function MCHostDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดเครื่องมือออกแบบปก...</div>}>
      {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้ได้เลยครับ */}
      <MCHostDashboardContent />
    </Suspense>
  );
}