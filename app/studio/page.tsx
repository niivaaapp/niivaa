"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Music, Image, Sliders, LayoutGrid, CheckCircle, UploadCloud, RefreshCw, ExternalLink, Radio, QrCode, MessageSquare, ToggleLeft, ToggleRight, Film } from 'lucide-react';
import Link from 'next/link';

// --- สัญลักษณ์ Lyrics สีเขียว (ของดั้งเดิมของพี่) ---
const LyricsBadge = ({ exists }: { exists: boolean }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
        exists 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
        : 'bg-white/5 text-white/30 border border-white/10'
    }`}>
        {exists ? '● Lyrics' : 'No Lyrics'}
    </span>
);

export default function NiiVaaStudioDashboard() {
    const router = useRouter();
    // 🗂️ STATES CONTROL TABS
    const [activeTab, setActiveTab] = useState<'lyrics' | 'upload' | 'manage' | 'live_control' | 'intermission'>('lyrics');
    
    // ✍️ STATES LYRICS SECTION
    const [songs, setSongs] = useState<any[]>([]);
    const [selectedSong, setSelectedSong] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lyricsInput, setLyricsInput] = useState('');

    // 🖼️ STATES BACKGROUND IMAGES
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 📢 STATES LIVE ANNOUNCEMENT & QR CODE CONTROL
    const [isAnnouncementActive, setIsAnnouncementActive] = useState(false);
    const [announcementText, setAnnouncementText] = useState('');
    const [showLiveQr, setShowLiveQr] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    
    const [savingLive, setSavingLive] = useState(false);
    const [uploadingQR, setUploadingQR] = useState(false);
    const qrFileInputRef = useRef<HTMLInputElement>(null);

    // 🎞️ NEW STATES: ระบบควบคุมสไลด์คั่นจังหวะเปลี่ยนเพลง 8 วินาที
    const [isIntermissionActive, setIsIntermissionActive] = useState(false); // คุม เปิด/ปิด เลเยอร์คั่นเวลา
    const [intermissionMediaList, setIntermissionMediaList] = useState<any[]>([]);
    const [uploadingIntermission, setUploadingIntermission] = useState(false);
    const [loadingIntermission, setLoadingIntermission] = useState(false);
    const intermissionFileInputRef = useRef<HTMLInputElement>(null);

    // 1. โหลดข้อมูลเพลงทั้งหมดทิศทางเดิมของพี่
    const fetchSongs = async () => {
        const { data } = await supabase.from('master_songs').select('*').order('created_at', { ascending: false });
        if (data) setSongs(data);
    };

    // 2. ดึงรูปภาพคลังสื่อคุมพิกัดตามหน้าตารางจริงของพี่
    const fetchBackgroundMedia = async () => {
        setLoadingMedia(true);
        try {
            const { data, error } = await supabase
                .from('screen_background_media')
                .select('id, media_name, media_url, isselected_for_loop')
                .order('id', { ascending: false });
            if (!error && data) setMediaList(data);
        } catch (err) { console.error(err); }
        setLoadingMedia(false);
    };

    // 📢 ดึงตั้งค่าระบบประกาศ, QR และสวิตช์คั่นเวลาล่าสุดจากตาราง live_announcements
    const fetchLiveConfiguration = async () => {
        try {
            const { data, error } = await supabase
                .from('live_announcements')
                .select('*')
                .eq('id', 1)
                .maybeSingle();
            
            if (!error && data) {
                setIsAnnouncementActive(data.is_announcement_active || false);
                setAnnouncementText(data.announcement_text || '');
                setShowLiveQr(data.show_live_qr || false);
                setQrCodeUrl(data.qr_code_url || '');
                setIsIntermissionActive(data.is_intermission_active || false); // ผูกล็อกค่าสวิตช์คั่นเวลา
            }
        } catch (err) { console.error(err); }
    };

    // 🎞️ ดึงข้อมูลคลังภาพ/วิดีโอคั่นเวลารอยต่อเปลี่ยนเพลง 8 วินาที
    const fetchIntermissionMedia = async () => {
        setLoadingIntermission(true);
        try {
            const { data, error } = await supabase
                .from('intermission_media')
                .select('*')
                .order('id', { ascending: false });
            if (!error && data) setIntermissionMediaList(data);
        } catch (err) { console.error(err); }
        setLoadingIntermission(false);
    };

    useEffect(() => { 
        fetchSongs(); 
        fetchBackgroundMedia();
        fetchLiveConfiguration();
        fetchIntermissionMedia();
    }, []);

    // 3. ฟังก์ชันเซฟเนื้อเพลงสูตรเดิมของพี่
    const handleSaveLyrics = async () => {
        if (!selectedSong) return;
        const { error } = await supabase
            .from('master_songs')
            .update({ lyrics: lyricsInput })
            .eq('video_id', selectedSong.video_id);

        if (!error) {
            setIsModalOpen(false);
            setLyricsInput('');
            fetchSongs();
        }
    };

    // 4. ลอจิกอัปโหลดภาพมุ่งตรงเข้าคลังจริง background-media
    const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
            
            const { error: storageError } = await supabase.storage
                .from('background-media')
                .upload(fileName, file);

            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage
                .from('background-media')
                .getPublicUrl(fileName);

            const publicUrl = publicUrlData.publicUrl;

            const { error: dbError } = await supabase
                .from('screen_background_media')
                .insert([{
                    pool_key: 'seaPool', 
                    media_type: 'image', 
                    media_url: publicUrl, 
                    media_name: file.name, 
                    isselected_for_loop: false 
                }]);

            if (dbError) throw dbError;

            alert('ภาพเซฟเข้า Bucket และบันทึกลงตารางเสร็จสิ้นครับพี่!');
            fetchBackgroundMedia(); 
        } catch (err: any) {
            console.error(err);
            alert(`ติดขัดจังหวะเซฟลง SQL: ${err.message || err}`);
        }
        setUploading(false);
    };

    // 5. ปุ่มสลับสถานะติ๊กเลือกสุ่มวนหน้าร้องเพลงคาราโอเกะ
    const handleToggleSelectForLoop = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('screen_background_media')
                .update({ isselected_for_loop: !currentStatus })
                .eq('id', id);

            if (!error) {
                setMediaList(prev => prev.map(item => 
                    item.id === id ? { ...item, isselected_for_loop: !currentStatus } : item
                ));
            }
        } catch (err) { console.error(err); }
    };

    // 📢 ฟังก์ชันควบคุมระบบเปิด/ปิด บอร์ดตัววิ่งประกาศ
    const handleToggleAnnouncementStatus = async () => {
        const nextStatus = !isAnnouncementActive;
        try {
            const { error } = await supabase
                .from('live_announcements')
                .update({ is_announcement_active: nextStatus })
                .eq('id', 1);
            if (!error) setIsAnnouncementActive(nextStatus);
        } catch (err) { console.error(err); }
    };

    // 📢 ฟังก์ชันควบคุมระบบเปิด/ปิด การฉายแสดงคิวอาร์โค้ด
    const handleToggleQrDisplayStatus = async () => {
        const nextStatus = !showLiveQr;
        try {
            const { error } = await supabase
                .from('live_announcements')
                .update({ show_live_qr: nextStatus })
                .eq('id', 1);
            if (!error) setShowLiveQr(nextStatus);
        } catch (err) { console.error(err); }
    };

    // 📢 ฟังก์ชันควบคุมระบบเปิด/ปิด สไลด์คั่นจังหวะเปลี่ยนเพลง 8 วินาที (ฟังก์ชันใหม่)
    const handleToggleIntermissionStatus = async () => {
        const nextStatus = !isIntermissionActive;
        try {
            const { error } = await supabase
                .from('live_announcements')
                .update({ is_intermission_active: nextStatus })
                .eq('id', 1);
            if (!error) setIsIntermissionActive(nextStatus);
        } catch (err) { console.error(err); }
    };

    // 📢 ปุ่มกด UPDATE TEXT บันทึกข้อความประกาศ
    const handleSaveAnnouncementTextOnly = async () => {
        setSavingLive(true);
        try {
            const { error } = await supabase
                .from('live_announcements')
                .update({ announcement_text: announcementText.trim() })
                .eq('id', 1);
            if (!error) alert('💾 บันทึกข้อความประกาศลงบอร์ดสดเรียบร้อยครับพี่!');
        } catch (err) { console.error(err); }
        setSavingLive(false);
    };

    // 📢 ฟังก์ชันอัปโหลดภาพ QR Code ฝังลงตารางไลฟ์
    const handleUploadQRCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingQR(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `qr_${Date.now()}.${fileExt}`;

            const { error: storageError } = await supabase.storage
                .from('background-media') 
                .upload(fileName, file);

            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage
                .from('background-media')
                .getPublicUrl(fileName);

            const qrUrl = publicUrlData.publicUrl;

            const { error: dbError } = await supabase
                .from('live_announcements')
                .update({ qr_code_url: qrUrl })
                .eq('id', 1);

            if (!dbError) {
                setQrCodeUrl(qrUrl);
                alert('อัปโหลดคิวอาร์โค้ดขึ้นระบบคุมจอเรียบร้อยครับพี่!');
            }
        } catch (err) { console.error(err); }
        setUploadingQR(false);
    };

    // 🎞️ ฟังก์ชันอัปโหลดไฟล์ สื่อภาพนิ่ง/วิดีโอคั่นเวลา เข้าถังใหม่ intermission-media (ฟังก์ชันใหม่)
    const handleUploadIntermissionMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingIntermission(true);
        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const isVideo = ['mp4', 'mov', 'webm'].includes(fileExt || '');
            const typeKey = isVideo ? 'video' : 'image';
            const fileName = `intermission_${Date.now()}.${fileExt}`;

            // ยิงเข้า Bucket ถังความจุ background-media ร่วมเพื่อความปลอดภัย
            const { error: storageError } = await supabase.storage
                .from('background-media')
                .upload(fileName, file);

            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage
                .from('background-media')
                .getPublicUrl(fileName);

            const fileUrl = publicUrlData.publicUrl;

            // บันทึกฝังพิกัดลงตาราง intermission_media ตัวใหม่แกะกล่อง
            const { error: dbError } = await supabase
                .from('intermission_media')
                .insert([{
                    media_name: file.name,
                    media_url: fileUrl,
                    media_type: typeKey,
                    isselected_for_loop: true
                }]);

            if (dbError) throw dbError;

            alert('ฝังไฟล์สื่อคั่นเวลา 8 วินาที เข้าสารบบตารางเรียบร้อยครับพี่!');
            fetchIntermissionMedia(); // รีเฟรชหน้ากริดทันที
        } catch (err: any) {
            console.error(err);
            alert(`อัปโหลดขัดข้อง: ${err.message || err}`);
        }
        setUploadingIntermission(false);
    };

    // 🎞️ ปุ่มสลับสถานะเปิด/ปิดการดึงภาพนิ่ง/วิดีโอมาสุ่มวนในลูปสไลด์ 8 วินาที (ฟังก์ชันใหม่)
    const handleToggleIntermissionMediaSelection = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('intermission_media')
                .update({ isselected_for_loop: !currentStatus })
                .eq('id', id);

            if (!error) {
                setIntermissionMediaList(prev => prev.map(item => 
                    item.id === id ? { ...item, isselected_for_loop: !currentStatus } : item
                ));
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="min-h-screen bg-[#06080c] text-white flex select-none font-sans">
            
            {/* Sidebar ซ้าย คอนโซลนำทางอัจฉริยะ */}
            <div className="w-72 bg-[#090d16] border-r border-white/5 flex flex-col justify-between p-6 relative z-30 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
                <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-5">
                        <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                            <Sliders size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">NIIVAA STUDIO</h2>
                            <p className="text-[8px] font-black text-white/30 tracking-widest uppercase">System Director</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase block mb-3 px-2">Workspace</span>
                        
                        <button 
                            onClick={() => setActiveTab('lyrics')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                                activeTab === 'lyrics' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400 text-cyan-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Music size={14} className={activeTab === 'lyrics' ? 'text-cyan-400' : 'text-gray-400'} />
                            <span>Lyrics Add / Edit</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                                activeTab === 'upload' ? 'bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-purple-400 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <UploadCloud size={14} className={activeTab === 'upload' ? 'text-purple-400' : 'text-gray-400'} />
                            <span>Upload Background</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('manage')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                                activeTab === 'manage' ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-amber-400 text-amber-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <LayoutGrid size={14} className={activeTab === 'manage' ? 'text-amber-400' : 'text-gray-400'} />
                            <span>Select Images Loop</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('live_control')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                                activeTab === 'live_control' ? 'bg-gradient-to-r from-red-500/10 to-transparent border-l-2 border-red-500 text-red-400 shadow-[inset_10px_0_20px_rgba(239,68,68,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Radio size={14} className={activeTab === 'live_control' ? 'text-red-400 animate-pulse' : 'text-gray-400'} />
                            <span>Live & QR Control</span>
                        </button>

                        {/* 🟢 [แทรกแถบเมนูคอนโซลใหม่]: ปุ่มเปิดพื้นที่คุมสไลด์ 8 วินาทีรอยต่อเปลี่ยนเพลง */}
                        <button 
                            onClick={() => setActiveTab('intermission')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${
                                activeTab === 'intermission' ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-orange-500 text-orange-400 shadow-[inset_10px_0_20px_rgba(245,158,11,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Film size={14} className={activeTab === 'intermission' ? 'text-orange-400' : 'text-gray-400'} />
                            <span>Intermission 8s Loop</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-5">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase block mb-2 px-2">Quick Links</span>
                    <div className="grid grid-cols-1 gap-1.5 text-[10px] font-black tracking-widest uppercase">
                        <Link href="/lyrics" className="w-full py-2.5 px-4 bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-950/20 text-gray-400 hover:text-cyan-400 rounded-xl flex items-center justify-between transition-all group">
                            <span>🎤 Lyrics Board</span> <ExternalLink size={11} className="opacity-40 group-hover:opacity-100" />
                        </Link>
                        <Link href="/playlist" className="w-full py-2.5 px-4 bg-white/5 border border-white/5 hover:border-teal-500/30 hover:bg-teal-950/20 text-gray-400 hover:text-teal-400 rounded-xl flex items-center justify-between transition-all group">
                            <span>🎵 Playlist Mgr</span> <ExternalLink size={11} className="opacity-40 group-hover:opacity-100" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* PANEL ทำงานฝั่งขวา */}
            <div className="flex-1 bg-[#05070a] p-10 overflow-y-auto relative z-10">
                <AnimatePresence mode="wait">
                    
                    {/* WORKSPACE 1: LYRICS DIRECTORY */}
                    {activeTab === 'lyrics' && (
                        <motion.div key="lyrics-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-wider uppercase text-cyan-400">เพิ่มหรือแก้ไขเนื้อเพลง</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Lyrics Add/Edit Matrix</p>
                                </div>
                                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full font-bold">{songs.length} SONGS</span>
                            </div>

                            <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1 no-scrollbar">
                                {songs.map((song) => (
                                    <div key={song.video_id} className="bg-[#0b101b] border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group hover:border-cyan-500/40 transition-all shadow-md">
                                        <div className="flex flex-col gap-2">
                                            <h3 className="font-bold text-base text-gray-200 group-hover:text-cyan-400 transition-all">{song.title}</h3>
                                            <div><LyricsBadge exists={!!song.lyrics} /></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => {
                                                    const trackId = song.id || song.video_id; 
                                                    router.push(`/studio/lyric-mapper?track_id=${trackId}`);
                                                }}
                                                className="px-4 py-3 bg-amber-500 hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 text-black font-black text-[10px] tracking-widest rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-1.5"
                                            >
                                                ⏱️ SET TIMING
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setSelectedSong(song);
                                                    setLyricsInput(song.lyrics || '');
                                                    setIsModalOpen(true);
                                                }}
                                                className="px-5 py-3 bg-white/5 border border-white/10 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-teal-500 hover:border-transparent rounded-xl text-[10px] font-black tracking-widest transition-all active:scale-95 shadow-md"
                                            >
                                                {song.lyrics ? 'EDIT LYRICS' : 'ADD LYRICS'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* WORKSPACE 2: UPLOAD BACKGROUND IMAGES */}
                    {activeTab === 'upload' && (
                        <motion.div key="upload-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-xl mx-auto space-y-6">
                            <div className="border-b border-white/5 pb-4">
                                <h2 className="text-xl font-black tracking-wider uppercase text-purple-400">เพิ่มภาพพื้นหลังสตู</h2>
                                <p className="text-[10px] text-gray-500 uppercase font-semibold">Upload Background Images</p>
                            </div>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-80 border-2 border-dashed border-white/10 hover:border-purple-500/40 rounded-[2.5rem] bg-[#0b101b]/50 flex flex-col justify-center items-center gap-4 cursor-pointer hover:bg-purple-950/5 group transition-all"
                            >
                                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleUploadBackground} />
                                <div className="w-16 h-16 bg-white/5 border border-white/5 group-hover:border-purple-500/30 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-purple-400 transition-all">
                                    {uploading ? <RefreshCw size={24} className="animate-spin text-purple-400" /> : <UploadCloud size={24} />}
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{uploading ? 'กำลังบันทึกพิกัดลิงก์เข้าตาราง SQL...' : 'คลิกเปิดโฟลเดอร์เลือกภาพแบคกราวน์'}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* WORKSPACE 3: CHOOSE IMAGES FOR LOOP */}
                    {activeTab === 'manage' && (
                        <motion.div key="manage-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-wider uppercase text-amber-400">จัดการรูปภาพพื้นหลัง</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Select Background Images</p>
                                </div>
                                <button onClick={fetchBackgroundMedia} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
                                    <RefreshCw size={14} className={loadingMedia ? "animate-spin text-amber-400" : ""} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 max-h-[72vh] overflow-y-auto pr-1 no-scrollbar">
                                {mediaList.map((media) => (
                                    <div key={media.id} className={`bg-[#0b101b] border p-3 rounded-[2rem] relative group transition-all duration-300 ${media.isselected_for_loop ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-950/5' : 'border-white/5 hover:border-white/20'}`}>
                                        <div className="w-full h-36 rounded-[1.5rem] overflow-hidden bg-slate-950 relative border border-white/5">
                                            <img src={media.media_url} alt="Media" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            {media.isselected_for_loop && (
                                                <div className="absolute top-2.5 right-2.5 bg-amber-500 text-black p-1 rounded-full shadow-lg">
                                                    <CheckCircle size={12} fill="currentColor" className="text-amber-500 fill-black" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2 px-1">
                                            <span className="text-[10px] font-bold text-gray-400 truncate uppercase tracking-wide">{media.media_name || `IMAGE_${media.id}`}</span>
                                            <button
                                                type="button" onClick={() => handleToggleSelectForLoop(media.id, media.isselected_for_loop)}
                                                className={`w-full py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl border ${media.isselected_for_loop ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                                            >
                                                {media.isselected_for_loop ? '🟢 เปิดสุ่มใช้งานแล้ว' : '⚪ ติ๊กส่งออกสุ่มวน'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* WORKSPACE 4: LIVE ANNOUNCEMENT & QR CODE CONTROL */}
                    {activeTab === 'live_control' && (
                        <motion.div key="live-control-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-2xl mx-auto space-y-8">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-wider uppercase text-red-400">ควบคุมระบบประกาศ & QR Screen</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Live System Announcement Banner & QR Display Core</p>
                                </div>
                                <button onClick={fetchLiveConfiguration} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-red-400">
                                    <RefreshCw size={14} className="text-red-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[#0b101b] border border-white/5 p-6 rounded-[2.5rem] space-y-4 shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare size={16} className="text-red-400" />
                                            <h3 className="text-sm font-black tracking-wide uppercase text-gray-200">ข้อความประกาศหน้าจอ (Ticker Text)</h3>
                                        </div>
                                        <button type="button" onClick={handleToggleAnnouncementStatus} className="transition-transform active:scale-90">
                                            {isAnnouncementActive ? <ToggleRight size={38} className="text-red-500 fill-red-500/20" /> : <ToggleLeft size={38} className="text-gray-600" />}
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="พิมพ์ข้อความประกาศด่วนตรงนี้..." className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-gray-300 focus:outline-none focus:border-red-500/40 transition-all resize-none" />
                                        <div className="flex justify-end">
                                            <button type="button" onClick={handleSaveAnnouncementTextOnly} disabled={savingLive} className="px-5 py-2.5 bg-red-500 text-white font-black text-[10px] tracking-widest uppercase rounded-xl shadow-md active:scale-95">{savingLive ? 'SAVING...' : 'UPDATE TEXT'}</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#0b101b] border border-white/5 p-6 rounded-[2.5rem] space-y-5 shadow-lg">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <QrCode size={16} className="text-cyan-400" />
                                            <h3 className="text-sm font-black tracking-wide uppercase text-gray-200">คิวอาร์โค้ดหน้าจอหลัก (Request Song / Tip QR)</h3>
                                        </div>
                                        <button type="button" onClick={handleToggleQrDisplayStatus} className="transition-transform active:scale-90">
                                            {showLiveQr ? <ToggleRight size={38} className="text-emerald-500 fill-emerald-500/20" /> : <ToggleLeft size={38} className="text-gray-600" />}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                        <div className="aspect-square bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center p-3 relative group">
                                            {qrCodeUrl ? <img src={qrCodeUrl} alt="Live Dashboard QR" className="w-full h-full object-contain rounded-xl" /> : <div className="text-center space-y-1 text-gray-600"><QrCode size={32} className="mx-auto opacity-30" /><p className="text-[9px] font-bold uppercase tracking-wider">No QR Code</p></div>}
                                        </div>
                                        <div className="md:col-span-2 space-y-3">
                                            <p className="text-[11px] text-gray-400 font-bold leading-relaxed">อัปโหลดรูปภาพ QR Code เพื่อนำไปสลักโชว์ด้านมุมขวาของแถบประกาศวิ่งหน้าเวที ให้คณะผู้เยี่ยมชมหรือผู้ใช้ร่วมสแกน</p>
                                            <input type="file" ref={qrFileInputRef} accept="image/*" className="hidden" onChange={handleUploadQRCode} />
                                            <button type="button" onClick={() => qrFileInputRef.current?.click()} disabled={uploadingQR} className="w-full py-3 bg-white/5 border border-white/10 text-cyan-400 font-black text-[10px] tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2">{uploadingQR ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}<span>{qrCodeUrl ? 'CHANGE QR CODE IMAGE' : 'UPLOAD QR CODE IMAGE'}</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* 🟢 [WORKSPACE 5 NEW]: แผงบริหารคลังรูปภาพ/วิดีโอเงียบคั่นจังหวะรอยต่อเปลี่ยนเพลง 8 วินาที */}
                    {activeTab === 'intermission' && (
                        <motion.div key="intermission-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-wider uppercase text-orange-400">คลังสื่อคั่นจังหวะเปลี่ยนเพลง (Intermission 8s)</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">ฉายสไลด์ภาพนิ่ง/วิดีโอช่วงคั่นรอยต่อ 4 วินาทีท้ายเพลง + 4 วินาทีต้นเพลงใหม่</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* สวิตช์มาสเตอร์เปิด/ปิดระบบคั่นเวลา 8 วิทั้งโปรเจกต์ */}
                                    <div className="bg-black/40 border border-white/5 px-4 py-1.5 rounded-xl flex items-center gap-3">
                                        <span className="text-[9px] font-black tracking-widest text-gray-300 uppercase">ระบบมาสเตอร์คั่นเวลา:</span>
                                        <button type="button" onClick={handleToggleIntermissionStatus} className="transition-transform active:scale-90">
                                            {isIntermissionActive ? <ToggleRight size={34} className="text-orange-500 fill-orange-500/20" /> : <ToggleLeft size={34} className="text-gray-600" />}
                                        </button>
                                    </div>
                                    <button onClick={fetchIntermissionMedia} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-orange-400">
                                        <RefreshCw size={14} className={loadingIntermission ? "animate-spin" : ""} />
                                    </button>
                                </div>
                            </div>

                            {/* กล่องรับอินพุต อัปโหลดสไลด์แผ่นใหม่ เข้าตาราง */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-stretch">
                                <div 
                                    onClick={() => intermissionFileInputRef.current?.click()}
                                    className="md:col-span-1 border-2 border-dashed border-white/10 hover:border-orange-500/40 rounded-[2rem] bg-[#0b101b]/50 flex flex-col justify-center items-center p-6 text-center cursor-pointer hover:bg-orange-950/5 group transition-all"
                                >
                                    <input type="file" ref={intermissionFileInputRef} accept="image/*,video/*" className="hidden" onChange={handleUploadIntermissionMedia} />
                                    {uploadingIntermission ? <RefreshCw size={20} className="animate-spin text-orange-400 mb-2" /> : <UploadCloud size={20} className="text-gray-400 group-hover:text-orange-400 mb-2" />}
                                    <p className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors">{uploadingIntermission ? 'กำลังฝังลิงก์...' : 'เพิ่มสไลด์ภาพ / วิดีโอเงียบ'}</p>
                                    <p className="text-[8px] text-gray-500 font-bold uppercase mt-1 tracking-wider">JPG, PNG, MP4</p>
                                </div>

                                {/* รายการกริดพรีวิวรูปภาพสไลด์คั่นเวลาที่มีในคลังตาราง */}
                                <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
                                    {intermissionMediaList.map((media) => (
                                        <div key={media.id} className={`bg-[#0b101b] border p-2.5 rounded-[1.8rem] relative transition-all duration-300 ${media.isselected_for_loop ? 'border-orange-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5'}`}>
                                            <div className="w-full h-24 rounded-[1.2rem] overflow-hidden bg-black border border-white/5 relative">
                                                {media.media_type === 'video' ? (
                                                    <video src={media.media_url} muted className="w-full h-full object-cover" />
                                                ) : (
                                                    <img src={media.media_url} alt="Intermission" className="w-full h-full object-cover" />
                                                )}
                                                {media.isselected_for_loop && (
                                                    <div className="absolute top-2 right-2 bg-orange-500 text-black p-0.5 rounded-full shadow-md"><CheckCircle size={10} fill="currentColor" className="text-orange-500 fill-black" /></div>
                                                )}
                                            </div>
                                            <div className="mt-2 flex flex-col gap-1.5 px-1">
                                                <span className="text-[8px] font-bold text-gray-400 truncate uppercase tracking-wider">{media.media_name || `SLIDE_${media.id}`}</span>
                                                <button
                                                    type="button" onClick={() => handleToggleIntermissionMediaSelection(media.id, media.isselected_for_loop)}
                                                    className={`w-full py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg border ${media.isselected_for_loop ? 'bg-orange-500 text-black border-orange-400' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
                                                >
                                                    {media.isselected_for_loop ? '🟢 เปิดคั่นเวลาแล้ว' : '⚪ ปิดใช้งานคั่น'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* POPUP MODAL DIALOG */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="bg-[#0b101b] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-2xl z-10">
                            <h2 className="text-2xl font-black mb-1 text-white uppercase italic tracking-tighter">{selectedSong?.lyrics ? 'Edit Lyrics' : 'Manual Entry'}</h2>
                            <p className="text-cyan-400 font-bold text-xs mb-6 opacity-60 uppercase tracking-wide">SONG: {selectedSong?.title}</p>
                            <textarea value={lyricsInput} onChange={(e) => setLyricsInput(e.target.value)} placeholder="วางเนื้อเพลงที่นี่..." className="w-full h-80 bg-black/60 border border-white/5 rounded-[1.5rem] p-6 text-gray-300 focus:outline-none focus:border-cyan-500/40 transition-all mb-6 resize-none custom-scrollbar" />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest">Close</button>
                                <button type="button" onClick={handleSaveLyrics} className="flex-[2] py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-black text-xs tracking-wider uppercase rounded-2xl shadow-all active:scale-95">SAVE LYRICS</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}