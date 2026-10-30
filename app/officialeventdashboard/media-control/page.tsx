"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import RouteGuard from '@/components/RouteGuard';
import { 
  ArrowLeft, MonitorPlay, Square, Volume2, 
  Type, Image as ImageLucide, Video, Music, 
  FastForward, AlertCircle, ArrowRightLeft, ArrowDownUp, 
  PlaySquare, UserSquare, ShieldAlert, Plus, Trash2, 
  UploadCloud, Clock, CheckCircle2, Loader2, Palette, Sparkles
} from 'lucide-react';

// --- Types ---
interface YoutubeQueueItem { id: string; title: string; url: string; videoId: string; startSec: number; endSec: number; }
interface ImageGalleryItem { id: string; name: string; url: string; path: string; }

// --- คู่สีโหมดเต็มจอ ---
const VERTICAL_THEMES = [
  { id: 't1', name: 'ร.๑๐ (ทอง/น้ำเงิน)', bg: '#0B3D91', text: '#FDE047' },
  { id: 't2', name: 'ร.๑๐ (ทอง/น้ำตาล)', bg: '#78350F', text: '#FCD34D' },
  { id: 't3', name: 'ราชินี (ม่วง/ขาว)', bg: '#6B21A8', text: '#FFFFFF' },
  { id: 't4', name: 'คลาสสิก (ดำ/ขาว)', bg: '#000000', text: '#FFFFFF' },
];

// ==========================================
// 1. คอมโพเนนต์เนื้อหาหลัก (MediaControlContent)
// ==========================================
function MediaControlContent() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🌟 ดึง event_id จาก URL
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || "current";
  
  // 🌟 โฟลเดอร์สำหรับเก็บภาพแยกตามงาน
  const folderPath = `media_${eventId}`;

  // --- States: Live Output ---
  const [activeMedia, setActiveMedia] = useState<{name: string, type: string, source: string} | null>(null);
  const [masterVolume, setMasterVolume] = useState(80);

  // --- States: YouTube Queue ---
  const [ytQueue, setYtQueue] = useState<YoutubeQueueItem[]>([]);
  const [newYtTitle, setNewYtTitle] = useState('');
  const [newYtUrl, setNewYtUrl] = useState('');
  const [newYtStart, setNewYtStart] = useState<number>(0);
  const [newYtEnd, setNewYtEnd] = useState<number>(0);

  // --- States: Image Gallery ---
  const [imageGallery, setImageGallery] = useState<ImageGalleryItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- States: Text/CG ---
  const [runningText, setRunningText] = useState('ขอเชิญผู้แทนหน่วยงาน เตรียมตั้งแถว ณ จุดพักคอย\nเพื่อเตรียมความพร้อมสำหรับพิธีการ');
  const [isTextRunning, setIsTextRunning] = useState(false);
  const [textSpeed, setTextSpeed] = useState(50);
  const [textMode, setTextMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isCeremonyStatic, setIsCeremonyStatic] = useState(false);
  const [staticAgencyName, setStaticAgencyName] = useState('โรงเรียนสุรินทร์วิทยา');
  
  // --- States: Colors ---
  const [horizBg, setHorizBg] = useState('#1E3A8B'); 
  const [horizText, setHorizText] = useState('#FFFFFF'); 
  
  const [activeThemeId, setActiveThemeId] = useState('t1');
  const [customBg, setCustomBg] = useState('#0B3D91');
  const [customText, setCustomText] = useState('#FCD34D');
  const [bgEffect, setBgEffect] = useState<'none' | 'aurora' | 'smoke'>('aurora');

  const currentBg = activeThemeId === 'custom' ? customBg : VERTICAL_THEMES.find(t => t.id === activeThemeId)?.bg;
  const currentText = activeThemeId === 'custom' ? customText : VERTICAL_THEMES.find(t => t.id === activeThemeId)?.text;

  // Auto-detect เดือนเพื่อเซ็ตสี Default
  useEffect(() => {
    const month = new Date().getMonth();
    if (month === 6) setActiveThemeId('t1'); 
    else if (month === 5) setActiveThemeId('t3'); 
  }, []);

  // --- ดึงข้อมูล ---
  useEffect(() => {
    if (eventId !== "current") {
      fetchImages();
    }
    setYtQueue([
      { id: '1', title: 'สารคดีเฉลิมพระเกียรติ', url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ', startSec: 60, endSec: 180 }
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchImages = async () => {
    const { data, error } = await supabase.storage.from('event-media').list(folderPath);
    if (data && !error) {
      const images = data.map(file => {
        const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(`${folderPath}/${file.name}`);
        return { id: file.id || '', name: file.name, path: `${folderPath}/${file.name}`, url: urlData.publicUrl };
      });
      setImageGallery(images);
    }
  };

  // --- Handlers ---
  const handleAddYoutube = () => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = newYtUrl.match(regExp);
    const videoId = (match && match[2].length === 11) ? match[2] : null;

    if (!videoId) return alert('ลิงก์ YouTube ไม่ถูกต้อง');
    if (!newYtTitle) return alert('กรุณาตั้งชื่อรายการ');

    setYtQueue([...ytQueue, {
      id: Date.now().toString(), title: newYtTitle, url: newYtUrl, videoId: videoId, startSec: newYtStart || 0, endSec: newYtEnd || 0
    }]);
    setNewYtTitle(''); setNewYtUrl(''); setNewYtStart(0); setNewYtEnd(0);
  };

  const handleRemoveYoutube = (id: string) => {
    if(window.confirm('ต้องการลบรายการนี้ออกจากคิวหรือไม่?')) {
      setYtQueue(ytQueue.filter(item => item.id !== id));
      if (activeMedia?.source.includes(id)) handleStopMedia();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `slide_${Date.now()}_${i}.${file.name.split('.').pop()}`;
      await supabase.storage.from('event-media').upload(`${folderPath}/${fileName}`, file);
    }
    await fetchImages();
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = async (path: string, id: string) => {
    if(window.confirm('ยืนยันการลบรูปภาพนี้ออกจากฐานข้อมูลอย่างถาวร?')) {
      const { error } = await supabase.storage.from('event-media').remove([path]);
      if (!error) {
        setImageGallery(imageGallery.filter(img => img.id !== id));
        if (activeMedia?.source === path) handleStopMedia();
      }
    }
  };

  // 🌟 1. ฟังก์ชันเล่น YouTube
  const handlePlayYoutube = async (item: YoutubeQueueItem) => {
    let embedUrl = `https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=0`;
    if (item.startSec > 0) embedUrl += `&start=${item.startSec}`;
    if (item.endSec > 0) embedUrl += `&end=${item.endSec}`;
    
    setActiveMedia({ name: item.title, type: 'youtube', source: embedUrl });

    try {
      await supabase.from('screen_state').update({
        mode: 'media',
        media_url: embedUrl,
        payload: {}, 
        updated_at: new Date().toISOString()
      }).eq('event_id', eventId);
    } catch (err) {
      console.error("Play Youtube Error:", err);
    }
  };

  // 🌟 2. ฟังก์ชันเล่นภาพนิ่ง
  const handlePlayImage = async (item: ImageGalleryItem) => {
    setActiveMedia({ name: item.name, type: 'image', source: item.url });

    try {
      await supabase.from('screen_state').update({
        mode: 'media',
        media_url: item.url,
        payload: {}, 
        updated_at: new Date().toISOString()
      }).eq('event_id', eventId);
    } catch (err) {
      console.error("Play Image Error:", err);
    }
  };
  
  // 🌟 3. ฟังก์ชันหยุดเล่นสื่อ
  const handleStopMedia = async () => {
    setActiveMedia(null);

    try {
      await supabase.from('screen_state').update({
        mode: 'standby',
        media_url: '',
        payload: {},
        updated_at: new Date().toISOString()
      }).eq('event_id', eventId);
    } catch (err) {
      console.error("Stop Media Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-gray-900 border-b border-green-400/30 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="p-2 bg-gray-800 hover:bg-gray-700 text-green-400 rounded-lg border border-green-900/50">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MonitorPlay className="w-6 h-6 text-green-400" /> Stage Media Control
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleStopMedia} className="px-6 py-2 rounded-lg bg-red-950/80 border border-red-500 text-red-500 font-bold hover:bg-red-600 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <Square className="w-4 h-4 inline mr-2 mb-0.5" /> STOP ALL MEDIA
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: MEDIA LIBRARY & QUEUE (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. YouTube Playlist Queue */}
          <div className="bg-gray-900 border border-green-400/40 rounded-2xl p-6 shadow-[0_0_12px_rgba(74,222,128,0.15)]">
            <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
              <PlaySquare className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm">คิววิดีโอ (YouTube Playlist)</h3>
            </div>
            
            <div className="bg-black/50 p-4 rounded-xl border border-gray-800 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <input type="text" placeholder="ตั้งชื่องาน เช่น VTR ประวัติ" value={newYtTitle} onChange={(e) => setNewYtTitle(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none text-white" />
                </div>
                <div className="md:col-span-8">
                  <input type="text" placeholder="วางลิงก์ YouTube" value={newYtUrl} onChange={(e) => setNewYtUrl(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none text-white" />
                </div>
                <div className="md:col-span-12 flex flex-wrap items-center gap-3 bg-gray-900 p-3 rounded-lg border border-gray-800 mt-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-400">ตัดวิดีโอ (วิ):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">เริ่ม</span>
                    <input type="number" min="0" value={newYtStart || ''} onChange={(e) => setNewYtStart(Number(e.target.value))} className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white text-center" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">จบ</span>
                    <input type="number" min="0" value={newYtEnd || ''} onChange={(e) => setNewYtEnd(Number(e.target.value))} className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white text-center" />
                  </div>
                  <button onClick={handleAddYoutube} className="ml-auto bg-green-900/50 hover:bg-green-600 text-green-400 hover:text-black border border-green-500/50 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> บันทึกเข้าคิว
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
              {ytQueue.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm border-2 border-dashed border-gray-800 rounded-xl">ยังไม่มีวิดีโอในคิว</div>
              ) : (
                ytQueue.map((item, idx) => {
                  const isPlaying = activeMedia?.source?.includes(item.videoId);
                  return (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isPlaying ? 'bg-green-950/40 border-green-500 shadow-[0_0_10px_rgba(74,222,128,0.2)]' : 'bg-black border-gray-800 hover:border-gray-600'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-xs font-bold text-gray-600 w-4">{idx + 1}.</span>
                        <div className="truncate">
                          <h4 className={`text-sm font-bold truncate ${isPlaying ? 'text-green-400' : 'text-gray-300'}`}>{item.title}</h4>
                          <p className="text-[10px] text-gray-500 flex gap-2">
                            <span>ID: {item.videoId}</span>
                            {item.startSec > 0 && <span className="text-yellow-500">▶ เริ่ม: {item.startSec}s</span>}
                            {item.endSec > 0 && <span className="text-red-400">■ จบ: {item.endSec}s</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-2">
                        <button onClick={() => handlePlayYoutube(item)} className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center border transition-all ${isPlaying ? 'bg-green-500 text-black border-green-400 animate-pulse' : 'bg-transparent text-green-400 border-green-500/50 hover:bg-green-500/20'}`}>
                          {isPlaying ? 'ON-AIR' : 'PLAY'}
                        </button>
                        <button onClick={() => handleRemoveYoutube(item.id)} className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-950/50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Image Gallery */}
          <div className="bg-gray-900 border border-green-400/40 rounded-2xl p-6 shadow-[0_0_12px_rgba(74,222,128,0.15)]">
            <div className="flex items-center justify-between mb-5 border-b border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <ImageLucide className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm">คลังภาพนิ่ง (Media Bucket)</h3>
              </div>
              <div>
                <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-blue-900/40 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center">
                  {isUploading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin"/> กำลังอัปโหลด...</> : <><UploadCloud className="w-3 h-3 mr-2"/> อัปโหลดรูปภาพใหม่</>}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[35vh] overflow-y-auto custom-scrollbar pr-2">
              {imageGallery.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-800 rounded-xl">ยังไม่มีรูปภาพในโฟลเดอร์ <br/><span className="text-xs">Bucket: {folderPath}</span></div>
              ) : (
                imageGallery.map((img) => {
                  const isPlaying = activeMedia?.source === img.url;
                  return (
                    <div key={img.id} className={`relative group rounded-xl overflow-hidden border-2 transition-all ${isPlaying ? 'border-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'border-gray-800 hover:border-gray-500'}`}>
                      <div className="aspect-video bg-black flex items-center justify-center overflow-hidden relative">
                        {/* Dynamic Blur Background สำหรับ Thumbnail */}
                        <div className="absolute inset-0 z-0 bg-cover bg-center blur-md opacity-50 scale-110" style={{ backgroundImage: `url(${img.url})` }}></div>
                        <img src={img.url} alt={img.name} className="w-full h-full object-contain relative z-10" />
                      </div>
                      <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 transition-opacity z-20 ${isPlaying ? 'opacity-100 bg-green-950/40' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isPlaying ? (
                          <div className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> ON-AIR</div>
                        ) : (
                          <button onClick={() => handlePlayImage(img)} className="bg-green-500 hover:bg-green-400 text-black px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">PLAY</button>
                        )}
                        <button onClick={() => handleRemoveImage(img.path, img.id)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-gray-300 hover:text-red-500 hover:bg-red-950/80 rounded-lg"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full bg-black/80 px-2 py-1 truncate text-[10px] text-gray-400 text-center z-20">{img.name}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. CG / Text Crawl */}
          <div className="bg-gray-900 border border-green-400/40 rounded-2xl p-6 shadow-[0_0_12px_rgba(74,222,128,0.15)]">
             <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
              <Type className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white uppercase tracking-widest text-sm">ระบบตัวอักษรวิ่ง (CG / Marquee)</h3>
            </div>
            
            <div className="flex bg-black rounded-xl p-1 border border-gray-800 mb-5">
              <button onClick={() => setTextMode('horizontal')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${textMode === 'horizontal' ? 'bg-gray-800 text-green-400 border border-green-500/30 shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                <ArrowRightLeft className="w-4 h-4 mr-2" /> แถบวิ่งล่างจอ (85/15)
              </button>
              <button onClick={() => setTextMode('vertical')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${textMode === 'vertical' ? 'bg-gray-800 text-green-400 border border-green-500/30 shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                <ArrowDownUp className="w-4 h-4 mr-2" /> วิ่งเต็มจอขึ้นบน (กราฟิก)
              </button>
            </div>

            {/* โหมดแนวนอน (แถบล่าง) */}
            {textMode === 'horizontal' && (
              <div className="space-y-4 animate-in fade-in">
                {/* เพิ่มจานสีสำหรับโหมดแนวนอน */}
                <div className="flex gap-6 p-4 bg-gray-950 border border-gray-800 rounded-xl mb-4">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-400">สีแถบ (Bg):</label>
                    <input type="color" value={horizBg} onChange={(e) => setHorizBg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-gray-400">สีอักษร (Text):</label>
                    <input type="color" value={horizText} onChange={(e) => setHorizText(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-cyan-950/20 border border-cyan-900/50 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserSquare className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h4 className="font-bold text-cyan-400 text-sm">โหมดพิธีการ (หยุดวิ่ง)</h4>
                      <p className="text-xs text-gray-400">แสดงภาพประธาน/ชื่อหน่วยงาน แบบหยุดนิ่ง</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isCeremonyStatic} onChange={(e) => setIsCeremonyStatic(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                {isCeremonyStatic ? (
                  <div>
                    <label className="text-xs font-bold text-cyan-400 uppercase mb-2 block">ชื่อหน่วยงาน (แสดงนิ่งคู่กับภาพ)</label>
                    <input type="text" value={staticAgencyName} onChange={(e) => setStaticAgencyName(e.target.value)} className="w-full bg-black border border-cyan-900/50 rounded-lg p-3 text-white focus:border-cyan-500 outline-none font-medium" />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">ข้อความวิ่ง (ขวาไปซ้าย)</label>
                    <textarea rows={2} value={runningText} onChange={(e) => setRunningText(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-green-500 outline-none" />
                  </div>
                )}
              </div>
            )}

            {/* โหมดแนวตั้ง (เต็มจอ) */}
            {textMode === 'vertical' && (
              <div className="space-y-4 animate-in fade-in bg-black p-4 rounded-xl border border-gray-800">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-400 mr-2 uppercase">เลือกคู่สี:</span>
                  {VERTICAL_THEMES.map(theme => (
                    <button key={theme.id} onClick={() => setActiveThemeId(theme.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeThemeId === theme.id ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] scale-105' : 'border-gray-700 hover:border-gray-500 opacity-70'}`} style={{ backgroundColor: theme.bg, color: theme.text }}>
                      {theme.name}
                    </button>
                  ))}
                  <button onClick={() => setActiveThemeId('custom')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeThemeId === 'custom' ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.3)] bg-gray-800 text-white' : 'border-gray-700 hover:border-gray-500 text-gray-400 bg-transparent'}`}>
                    <Palette className="w-3 h-3" /> กำหนดเอง
                  </button>
                </div>
                
                {activeThemeId === 'custom' && (
                  <div className="flex gap-6 p-3 bg-gray-900 border border-gray-700 rounded-lg mb-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-gray-400">สีพื้นหลัง (Bg):</label>
                      <input type="color" value={customBg} onChange={(e) => setCustomBg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-gray-400">สีอักษร (Text):</label>
                      <input type="color" value={customText} onChange={(e) => setCustomText(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4 bg-gray-900 p-3 rounded-lg border border-gray-700">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <label className="text-xs font-bold text-gray-400 uppercase">เอฟเฟกต์พื้นหลัง (BG Effect):</label>
                  <select value={bgEffect} onChange={(e) => setBgEffect(e.target.value as 'none' | 'aurora' | 'smoke')} className="bg-black text-white text-xs px-3 py-1.5 rounded border border-gray-600 focus:border-purple-400 outline-none">
                    <option value="none">สีพื้นเรียบ (Solid)</option>
                    <option value="aurora">คลื่นแสงออโรร่า (Aurora)</option>
                    <option value="smoke">หมอกควันเคลื่อนไหว (Smoke)</option>
                  </select>
                </div>

                <textarea rows={4} value={runningText} onChange={(e) => setRunningText(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-white focus:border-green-500 outline-none text-center" placeholder="บรรทัดที่ 1&#10;บรรทัดที่ 2" />
              </div>
            )}

            {/* ส่วนควบคุมความเร็วและการส่งออกจอ (Show/Hide) */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-950 p-4 rounded-xl border border-gray-800 mt-5">
              <div className="flex-1 w-full flex items-center gap-3">
                <FastForward className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-bold text-gray-400 w-16">ความเร็ว:</span>
                <input type="range" min="10" max="100" value={textSpeed} onChange={(e) => setTextSpeed(Number(e.target.value))} className="w-full accent-green-500" disabled={textMode === 'horizontal' && isCeremonyStatic} />
              </div>
              <button 
                onClick={() => setIsTextRunning(!isTextRunning)}
                className={`w-full sm:w-auto px-8 py-3 rounded-lg font-bold transition-all flex items-center justify-center text-sm tracking-wide
                  ${isTextRunning ? 'bg-red-500 text-black shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse' : 'bg-green-600 hover:bg-green-500 text-black shadow-[0_0_15px_rgba(74,222,128,0.3)]'}`}
              >
                {/* ปุ่มนี้ทำหน้าที่ ซ่อน/แสดง แถบวิ่ง */}
                {isTextRunning ? '■ ซ่อนแถบข้อความ (HIDE)' : '▶ แสดงแถบข้อความ (SHOW)'}
              </button>
            </div>
          </div>

        </div>

        {/* ================= RIGHT: LIVE PREVIEW (4 cols) ================= */}
        <div className="lg:col-span-4">
          <div className="bg-gray-900 border-2 border-gray-800 rounded-2xl p-2 shadow-2xl sticky top-24">
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-xs font-bold text-red-500 flex items-center gap-1 animate-pulse"><div className="w-2 h-2 rounded-full bg-red-500"></div> LIVE PREVIEW</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">LED SCREEN OUT</span>
            </div>
            
            {/* THE SCREEN SIMULATOR */}
            <div className="aspect-video bg-black rounded-xl border border-gray-700 relative overflow-hidden flex flex-col">
              
              {/* === เลเยอร์ 1: โหมดแนวนอน (สื่อภาพ/วิดีโอ) === */}
              {textMode === 'horizontal' && (
                <>
                  {/* พื้นที่สื่อ: จะขยายเป็น 100% (h-full) หากไม่ได้เปิดแถบวิ่ง, และบีบเหลือ 85% หากเปิดแถบวิ่ง */}
                  <div className={`w-full ${isTextRunning ? 'h-[85%]' : 'h-full'} flex items-center justify-center bg-black relative z-0 transition-all duration-500 ease-in-out overflow-hidden`}>
                    {activeMedia ? (
                      activeMedia.type === 'youtube' ? (
                        <iframe title="YouTube Video" src={activeMedia.source} className="w-full h-full border-0 pointer-events-none relative z-10" allow="autoplay; encrypted-media"></iframe>
                      ) : (
                        <>
                          {/* Dynamic Blurred Background (เติมขอบดำด้วยสีที่แมตช์กับภาพ) */}
                          <div 
                            className="absolute inset-0 z-0 bg-cover bg-center blur-2xl opacity-50 scale-110" 
                            style={{ backgroundImage: `url(${activeMedia.source})` }}
                          ></div>
                          {/* ภาพหลัก */}
                          <img src={activeMedia.source} alt="Media" className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
                        </>
                      )
                    ) : (
                      <div className="flex flex-col items-center opacity-30">
                        <MonitorPlay className="w-10 h-10 mb-2" />
                        <span className="text-[10px] tracking-widest font-bold">NO MEDIA</span>
                      </div>
                    )}
                  </div>
                  
                  {/* พื้นที่แถบข้อความ (สูง 15%) แนบสนิทด้านล่าง */}
                  {isTextRunning && (
                    <div 
                      className="w-full h-[15%] shrink-0 border-t flex items-center overflow-hidden relative z-10 box-border shadow-[0_-5px_15px_rgba(0,0,0,0.3)] transition-colors duration-300"
                      style={{ backgroundColor: horizBg, borderTopColor: '#EAB308' }} // ขอบบนสีทอง
                    >
                      {isCeremonyStatic ? (
                        <div className="w-full flex items-center h-full px-2 gap-3">
                          <div className="h-[80%] aspect-[3/4] bg-yellow-600 rounded border border-yellow-400 shrink-0 flex items-center justify-center text-[6px] font-bold text-black shadow-inner">รูป</div>
                          <span className="font-bold text-xs md:text-sm truncate" style={{ color: horizText }}>{staticAgencyName}</span>
                        </div>
                      ) : (
                        <div className="whitespace-nowrap text-sm font-bold" style={{ color: horizText, animation: `marquee ${110 - textSpeed}s linear infinite`, paddingLeft: '100%' }}>
                          {runningText}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* === เลเยอร์ 2: โหมดแนวตั้งเต็มจอ === */}
              {textMode === 'vertical' && isTextRunning && (
                <div 
                  className={`absolute inset-0 z-20 overflow-hidden flex justify-center 
                    ${bgEffect === 'aurora' ? 'effect-aurora' : ''} 
                    ${bgEffect === 'smoke' ? 'effect-smoke' : ''}
                  `} 
                  style={{ backgroundColor: currentBg }}
                >
                  <div 
                    className="absolute w-full text-center whitespace-pre-line font-bold text-sm px-4 smooth-scroll-up" 
                    style={{ color: currentText, animationDuration: `${110 - textSpeed}s` }}
                  >
                    {runningText}
                  </div>
                </div>
              )}

            </div>
            
            <div className="mt-4 p-3 bg-gray-950 border border-gray-800 rounded-lg flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <div className="text-[10px] text-gray-400 leading-relaxed">
                <ul className="list-disc pl-3">
                  <li>ภาพนิ่งจะมี <strong className="text-purple-400">พื้นหลังแบบสมาร์ทเบลอ</strong> เพื่อลดขอบดำ</li>
                  <li>หาก <strong>"ซ่อนแถบข้อความ"</strong> ภาพวีดิทัศน์/สไลด์จะขยายเต็มจออัตโนมัติ 100%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </main>
      
      {/* CSS Keyframes & Effects */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Horizontal Marquee */
        @keyframes marquee { 
          0% { transform: translateX(0%); } 
          100% { transform: translateX(-100%); } 
        }
        
        /* Smooth Vertical Scroll */
        .smooth-scroll-up {
          top: 100%;
          will-change: transform;
          animation-name: scrollUp;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes scrollUp { 
          0% { transform: translate3d(0, 0, 0); } 
          100% { transform: translate3d(0, -200vh, 0); } 
        }

        /* Effect: Aurora Wave */
        .effect-aurora {
          background-image: linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%);
          background-size: 200% 200%;
          animation: bgAurora 6s ease-in-out infinite alternate;
        }
        @keyframes bgAurora {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        /* Effect: Moving Smoke */
        .effect-smoke::before {
          content: "";
          position: absolute;
          top: -50%; left: -50%; width: 200%; height: 200%;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1), transparent 50%),
                      radial-gradient(circle at 30% 70%, rgba(255,255,255,0.05), transparent 40%);
          animation: bgSmoke 10s infinite alternate linear;
          pointer-events: none;
        }
        @keyframes bgSmoke {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(5%, 5%) rotate(3deg) scale(1.1); }
        }
      `}} />
    </div>
  );
}

// ==========================================
// 🚀 2. คอมโพเนนต์หลักที่ห่อหุ้มด้วย RouteGuard และ Suspense
// ==========================================
export default function MediaControlPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-green-400 font-bold">กำลังโหลดระบบควบคุมสื่อ...</div>}>
      {/* 🌟 หุ้มด้วย RouteGuard กำหนดสิทธิ์ให้ admin, controller และ mc (พิธีกร) */}
      <RouteGuard allowedRoles={['admin', 'controller', 'mc']}>
        <MediaControlContent />
      </RouteGuard>
    </Suspense>
  );
}