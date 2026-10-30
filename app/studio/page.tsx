"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
    Music, Image, Sliders, LayoutGrid, CheckCircle, UploadCloud,
    RefreshCw, ExternalLink, Radio, QrCode, MessageSquare,
    ToggleLeft, ToggleRight, Film, Search, Trash2, BookOpen, ChevronDown, X
} from 'lucide-react';
import Link from 'next/link';

// --- สัญลักษณ์ Lyrics สีเขียว ---
const LyricsBadge = ({ exists }: { exists: boolean }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${exists
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

    // 📖 STATE คู่มือ Slide-over Drawer
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    // ✍️ STATES LYRICS SECTION
    const [songs, setSongs] = useState<any[]>([]);
    const [songSearch, setSongSearch] = useState(''); // 🌟 เพิ่ม State สำหรับค้นหาเพลง
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
    const [isIntermissionActive, setIsIntermissionActive] = useState(false);
    const [intermissionMediaList, setIntermissionMediaList] = useState<any[]>([]);
    const [uploadingIntermission, setUploadingIntermission] = useState(false);
    const [loadingIntermission, setLoadingIntermission] = useState(false);
    const intermissionFileInputRef = useRef<HTMLInputElement>(null);

    // 1. โหลดข้อมูลเพลงทั้งหมด
    const fetchSongs = async () => {
        const { data } = await supabase.from('master_songs').select('*').order('created_at', { ascending: false });
        if (data) setSongs(data);
    };

    // 2. ดึงรูปภาพคลังสื่อ
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

    // 📢 ดึงตั้งค่าระบบประกาศ
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
                setIsIntermissionActive(data.is_intermission_active || false);
            }
        } catch (err) { console.error(err); }
    };

    // 🎞️ ดึงข้อมูลคลังภาพ/วิดีโอคั่นเวลา
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

    // 🌟 กรองรายชื่อเพลงจากการค้นหา
    const filteredSongs = songs.filter(song =>
        song.title?.toLowerCase().includes(songSearch.toLowerCase())
    );

    // 3. ฟังก์ชันเซฟเนื้อเพลง
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

    // 4. ลอจิกอัปโหลดภาพมุ่งตรงเข้าคลัง
    const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

            const { error: storageError } = await supabase.storage.from('background-media').upload(fileName, file);
            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage.from('background-media').getPublicUrl(fileName);

            const { error: dbError } = await supabase.from('screen_background_media').insert([{
                pool_key: 'seaPool',
                media_type: 'image',
                media_url: publicUrlData.publicUrl,
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

    // 🌟 ฟังก์ชันลบภาพพื้นหลัง

    // 5. ปุ่มสลับสถานะติ๊กเลือกสุ่มวน
    const handleToggleSelectForLoop = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('screen_background_media').update({ isselected_for_loop: !currentStatus }).eq('id', id);
            if (!error) {
                setMediaList(prev => prev.map(item => item.id === id ? { ...item, isselected_for_loop: !currentStatus } : item));
            }
        } catch (err) { console.error(err); }
    };

    // 📢 ฟังก์ชันควบคุมระบบเปิด/ปิด บอร์ดตัววิ่ง
    const handleToggleAnnouncementStatus = async () => {
        const nextStatus = !isAnnouncementActive;
        try {
            const { error } = await supabase.from('live_announcements').update({ is_announcement_active: nextStatus }).eq('id', 1);
            if (!error) setIsAnnouncementActive(nextStatus);
        } catch (err) { console.error(err); }
    };

    // 📢 ฟังก์ชันควบคุมระบบเปิด/ปิด การฉายแสดงคิวอาร์โค้ด
    const handleToggleQrDisplayStatus = async () => {
        const nextStatus = !showLiveQr;
        try {
            const { error } = await supabase.from('live_announcements').update({ show_live_qr: nextStatus }).eq('id', 1);
            if (!error) setShowLiveQr(nextStatus);
        } catch (err) { console.error(err); }
    };

    // 📢 ฟังก์ชันควบคุมระบบเปิด/ปิด สไลด์คั่นจังหวะ 8 วิ
    const handleToggleIntermissionStatus = async () => {
        const nextStatus = !isIntermissionActive;
        try {
            const { error } = await supabase.from('live_announcements').update({ is_intermission_active: nextStatus }).eq('id', 1);
            if (!error) setIsIntermissionActive(nextStatus);
        } catch (err) { console.error(err); }
    };

    // 📢 ปุ่มกด UPDATE TEXT บันทึกข้อความประกาศ
    const handleSaveAnnouncementTextOnly = async () => {
        setSavingLive(true);
        try {
            const { error } = await supabase.from('live_announcements').update({ announcement_text: announcementText.trim() }).eq('id', 1);
            if (!error) alert('💾 บันทึกข้อความประกาศลงบอร์ดสดเรียบร้อยครับพี่!');
        } catch (err) { console.error(err); }
        setSavingLive(false);
    };

    // 📢 ฟังก์ชันอัปโหลดภาพ QR Code
    const handleUploadQRCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingQR(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `qr_${Date.now()}.${fileExt}`;

            const { error: storageError } = await supabase.storage.from('background-media').upload(fileName, file);
            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage.from('background-media').getPublicUrl(fileName);
            const qrUrl = publicUrlData.publicUrl;

            const { error: dbError } = await supabase.from('live_announcements').update({ qr_code_url: qrUrl }).eq('id', 1);

            if (!dbError) {
                setQrCodeUrl(qrUrl);
                alert('อัปโหลดคิวอาร์โค้ดขึ้นระบบคุมจอเรียบร้อยครับพี่!');
            }
        } catch (err) { console.error(err); }
        setUploadingQR(false);
    };

    // 🎞️ ฟังก์ชันอัปโหลดไฟล์ สื่อภาพนิ่ง/วิดีโอคั่นเวลา
    const handleUploadIntermissionMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingIntermission(true);
        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const isVideo = ['mp4', 'mov', 'webm'].includes(fileExt || '');
            const typeKey = isVideo ? 'video' : 'image';
            const fileName = `intermission_${Date.now()}.${fileExt}`;

            const { error: storageError } = await supabase.storage.from('background-media').upload(fileName, file);
            if (storageError) throw storageError;

            const { data: publicUrlData } = supabase.storage.from('background-media').getPublicUrl(fileName);
            const fileUrl = publicUrlData.publicUrl;

            const { error: dbError } = await supabase.from('intermission_media').insert([{
                media_name: file.name,
                media_url: fileUrl,
                media_type: typeKey,
                isselected_for_loop: true
            }]);

            if (dbError) throw dbError;

            alert('ฝังไฟล์สื่อคั่นเวลา 8 วินาที เข้าสารบบตารางเรียบร้อยครับพี่!');
            fetchIntermissionMedia();
        } catch (err: any) {
            console.error(err);
            alert(`อัปโหลดขัดข้อง: ${err.message || err}`);
        }
        setUploadingIntermission(false);
    };

    // 🌟 ฟังก์ชันลบภาพพื้นหลัง (อัปเดตใหม่)
    const handleDeleteBackgroundMedia = async (id: any, mediaUrl: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if(!confirm('คุณแน่ใจหรือไม่ที่จะลบภาพพื้นหลังนี้อย่างถาวร?')) return;
        try {
            // 1. ลบข้อมูลจาก Database (เช็ค error ด้วย)
            const { error: dbError } = await supabase.from('screen_background_media').delete().eq('id', id);
            if (dbError) throw dbError;

            // 2. ดึงชื่อไฟล์จาก URL แล้วลบไฟล์ออกจาก Storage Bucket ด้วย
            const fileName = mediaUrl.split('/').pop();
            if (fileName) {
                await supabase.storage.from('background-media').remove([fileName]);
            }

            fetchBackgroundMedia(); // รีเฟรชภาพ
        } catch (err: any) {
            console.error(err);
            alert(`เกิดข้อผิดพลาดในการลบ: ${err.message || err}`);
        }
    };

    // 🌟 ฟังก์ชันลบสื่อคั่นเวลา (อัปเดตใหม่)
    const handleDeleteIntermissionMedia = async (id: any, mediaUrl: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if(!confirm('คุณแน่ใจหรือไม่ที่จะลบสื่อคั่นเวลานี้อย่างถาวร?')) return;
        try {
            // 1. ลบข้อมูลจาก Database
            const { error: dbError } = await supabase.from('intermission_media').delete().eq('id', id);
            if (dbError) throw dbError;

            // 2. ดึงชื่อไฟล์จาก URL แล้วลบไฟล์ออกจาก Storage Bucket ด้วย
            const fileName = mediaUrl.split('/').pop();
            if (fileName) {
                await supabase.storage.from('background-media').remove([fileName]);
            }

            fetchIntermissionMedia(); // รีเฟรชภาพ
        } catch (err: any) {
            console.error(err);
            alert(`เกิดข้อผิดพลาดในการลบ: ${err.message || err}`);
        }
    };

    // 🎞️ ปุ่มสลับสถานะเปิด/ปิดการดึงภาพนิ่ง/วิดีโอคั่นเวลา
    const handleToggleIntermissionMediaSelection = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('intermission_media').update({ isselected_for_loop: !currentStatus }).eq('id', id);
            if (!error) {
                setIntermissionMediaList(prev => prev.map(item => item.id === id ? { ...item, isselected_for_loop: !currentStatus } : item));
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="min-h-screen bg-[#06080c] text-white flex select-none font-sans overflow-hidden">

            {/* ========================================== */}
            {/* 🌟 คู่มือ Slide-over Drawer (Accordion) */}
            {/* ========================================== */}
            <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
                <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-slate-950 border-l border-cyan-900/50 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] transform transition-transform duration-500 ease-in-out flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-6 border-b border-cyan-900/50 flex justify-between items-center bg-slate-900 shrink-0">
                        <h2 className="text-xl font-black text-cyan-400 flex items-center gap-2"><BookOpen size={20} /> คู่มือ NIIVAA STUDIO</h2>
                        <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"><X size={20} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-sm">

                        <details className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-cyan-400 hover:bg-slate-800/50 transition-colors">
                                <span className="flex items-center gap-2"><Music size={16} /> Lyrics Add / Edit</span>
                                <ChevronDown className="w-4 h-4 text-slate-500 group-open:-rotate-180 transition-transform" />
                            </summary>
                            <div className="p-4 pt-0 text-slate-300 border-t border-slate-800 bg-slate-950/50 space-y-2">
                                <p>จัดการเนื้อเพลงและตั้งค่าจังหวะการเลื่อน (Timing)</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                    <li><b>ค้นหาเพลง:</b> ใช้กล่องค้นหาด้านบนเพื่อพิมพ์ชื่อเพลงหรือศิลปินได้ทันที</li>
                                    <li><b>ADD/EDIT LYRICS:</b> คลิกเพื่อเปิดหน้าต่างวางเนื้อเพลง (Copy & Paste)</li>
                                    <li><b>SET TIMING:</b> เข้าสู่หน้าเครื่องมือจับจังหวะเนื้อเพลงให้ตรงกับเสียงร้อง</li>
                                </ul>
                            </div>
                        </details>

                        <details className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-purple-400 hover:bg-slate-800/50 transition-colors">
                                <span className="flex items-center gap-2"><UploadCloud size={16} /> Upload & Manage Images</span>
                                <ChevronDown className="w-4 h-4 text-slate-500 group-open:-rotate-180 transition-transform" />
                            </summary>
                            <div className="p-4 pt-0 text-slate-300 border-t border-slate-800 bg-slate-950/50 space-y-2">
                                <p>จัดการภาพพื้นหลังที่จะแสดงบนจอ</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                    <li><b>Upload:</b> อัปโหลดภาพพื้นหลังใหม่เข้าสู่ระบบ Cloud</li>
                                    <li><b>Select Images Loop:</b> ติ๊กเลือกภาพที่ต้องการให้สุ่มวนฉายเป็นสไลด์โชว์</li>
                                    <li><b>ลบสื่อ:</b> กดปุ่มรูป <Trash2 size={10} className="inline text-red-400" /> ถังขยะสีแดงที่มุมซ้ายบนของรูปเพื่อลบออกจากคลัง</li>
                                </ul>
                            </div>
                        </details>

                        <details className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-red-400 hover:bg-slate-800/50 transition-colors">
                                <span className="flex items-center gap-2"><Radio size={16} /> Live & QR Control</span>
                                <ChevronDown className="w-4 h-4 text-slate-500 group-open:-rotate-180 transition-transform" />
                            </summary>
                            <div className="p-4 pt-0 text-slate-300 border-t border-slate-800 bg-slate-950/50 space-y-2">
                                <p>ควบคุมการแสดงผลบนจอเวทีหลัก</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                    <li><b>ข้อความวิ่ง (Ticker Text):</b> พิมพ์ประกาศฉุกเฉินหรือข่าวสาร แล้วกดเปิดสวิตช์เพื่อแสดงแถบข้อความด้านล่างจอ</li>
                                    <li><b>QR Code:</b> อัปโหลดรูป QR Code (เช่น สำหรับทิปนักร้อง หรือขอเพลง) แล้วเปิดสวิตช์ให้แสดงที่มุมจอ</li>
                                </ul>
                            </div>
                        </details>

                        <details className="group bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-orange-400 hover:bg-slate-800/50 transition-colors">
                                <span className="flex items-center gap-2"><Film size={16} /> Intermission 8s Loop</span>
                                <ChevronDown className="w-4 h-4 text-slate-500 group-open:-rotate-180 transition-transform" />
                            </summary>
                            <div className="p-4 pt-0 text-slate-300 border-t border-slate-800 bg-slate-950/50 space-y-2">
                                <p>ระบบคั่นเวลาระหว่างเปลี่ยนเพลง (รอยต่อ 8 วินาที)</p>
                                <ul className="list-disc pl-4 space-y-1 text-xs text-slate-400">
                                    <li><b>การทำงาน:</b> ระบบจะสุ่มฉายสื่อที่เลือกไว้ ในช่วงท้ายเพลง 4 วิ และต้นเพลงใหม่ 4 วิ เพื่อไม่ให้จอดำ</li>
                                    <li><b>สื่อที่รองรับ:</b> สามารถอัปโหลดได้ทั้งภาพนิ่ง (JPG, PNG) และวิดีโอ (MP4)</li>
                                    <li><b>เปิด/ปิดระบบ:</b> ต้องเปิดสวิตช์ "ระบบมาสเตอร์คั่นเวลา" ด้านบนด้วย สื่อจึงจะทำงาน</li>
                                </ul>
                            </div>
                        </details>

                    </div>
                </div>
            </div>

            {/* Sidebar ซ้าย คอนโซลนำทางอัจฉริยะ */}
            <div className="w-72 bg-[#090d16] border-r border-white/5 flex flex-col justify-between p-6 relative z-30 shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-white/5 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                <Sliders size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black tracking-[0.2em] bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent">NIIVAA STUDIO</h2>
                                <p className="text-[8px] font-black text-white/30 tracking-widest uppercase">System Director</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase block mb-3 px-2">Workspace</span>

                        <button
                            onClick={() => setActiveTab('lyrics')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'lyrics' ? 'bg-gradient-to-r from-cyan-500/10 to-transparent border-l-2 border-cyan-400 text-cyan-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Music size={14} className={activeTab === 'lyrics' ? 'text-cyan-400' : 'text-gray-400'} />
                            <span>Lyrics Add / Edit</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('upload')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'upload' ? 'bg-gradient-to-r from-purple-500/10 to-transparent border-l-2 border-purple-400 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <UploadCloud size={14} className={activeTab === 'upload' ? 'text-purple-400' : 'text-gray-400'} />
                            <span>Upload Background</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('manage')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'manage' ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-amber-400 text-amber-300' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <LayoutGrid size={14} className={activeTab === 'manage' ? 'text-amber-400' : 'text-gray-400'} />
                            <span>Select Images Loop</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('live_control')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'live_control' ? 'bg-gradient-to-r from-red-500/10 to-transparent border-l-2 border-red-500 text-red-400 shadow-[inset_10px_0_20px_rgba(239,68,68,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Radio size={14} className={activeTab === 'live_control' ? 'text-red-400 animate-pulse' : 'text-gray-400'} />
                            <span>Live & QR Control</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('intermission')}
                            className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3 text-xs font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'intermission' ? 'bg-gradient-to-r from-orange-500/10 to-transparent border-l-2 border-orange-500 text-orange-400 shadow-[inset_10px_0_20px_rgba(245,158,11,0.05)]' : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Film size={14} className={activeTab === 'intermission' ? 'text-orange-400' : 'text-gray-400'} />
                            <span>Intermission 8s Loop</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4 border-t border-white/5 pt-5">
                    {/* 🌟 ปุ่มเปิดคู่มือ */}
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="w-full py-2.5 px-4 bg-cyan-900/40 border border-cyan-500/30 hover:bg-cyan-800/60 text-cyan-300 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-[10px] uppercase tracking-widest"
                    >
                        <BookOpen size={14} /> <span>เปิดคู่มือการใช้งาน</span>
                    </button>

                    <div className="space-y-2">
                        <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase block mb-1 px-2">Quick Links</span>
                        <div className="grid grid-cols-1 gap-1.5 text-[10px] font-black tracking-widest uppercase">
                            <Link href="/lyrics" className="w-full py-2.5 px-4 bg-white/5 border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-950/20 text-gray-400 hover:text-cyan-400 rounded-xl flex items-center justify-between transition-all group">
                                <span>🎤 Lyrics Board</span> <ExternalLink size={11} className="opacity-40 group-hover:opacity-100" />
                            </Link>
                            <Link href="/playlistdashboard" className="w-full py-2.5 px-4 bg-white/5 border border-white/5 hover:border-teal-500/30 hover:bg-teal-950/20 text-gray-400 hover:text-teal-400 rounded-xl flex items-center justify-between transition-all group">
                                <span>🎵 Playlist Mgr</span> <ExternalLink size={11} className="opacity-40 group-hover:opacity-100" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* PANEL ทำงานฝั่งขวา */}
            <div className="flex-1 bg-[#05070a] p-10 overflow-y-auto relative z-10 custom-scrollbar">
                <AnimatePresence mode="wait">

                    {/* WORKSPACE 1: LYRICS DIRECTORY */}
                    {activeTab === 'lyrics' && (
                        <motion.div key="lyrics-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl mx-auto space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-wider uppercase text-cyan-400">เพิ่มหรือแก้ไขเนื้อเพลง</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">Lyrics Add/Edit Matrix</p>
                                </div>
                                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full font-bold">{filteredSongs.length} SONGS</span>
                            </div>

                            {/* 🌟 กล่องค้นหา (Search Box) */}
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อเพลง หรือ นักร้อง..."
                                    value={songSearch}
                                    onChange={(e) => setSongSearch(e.target.value)}
                                    className="w-full bg-[#0b101b] border border-white/10 hover:border-cyan-500/30 focus:border-cyan-500 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none transition-all shadow-md"
                                />
                            </div>

                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredSongs.map((song) => (
                                    <div key={song.video_id} className="bg-[#0b101b] border border-white/5 p-5 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-cyan-500/40 transition-all shadow-md">
                                        <div className="flex flex-col gap-2">
                                            <h3 className="font-bold text-base text-gray-200 group-hover:text-cyan-400 transition-all">{song.title}</h3>
                                            <div><LyricsBadge exists={!!song.lyrics} /></div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
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
                                {filteredSongs.length === 0 && (
                                    <div className="text-center text-gray-500 py-10 font-bold">ไม่พบเพลงที่ค้นหา</div>
                                )}
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

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 max-h-[72vh] overflow-y-auto pr-1 custom-scrollbar">
                                {mediaList.map((media) => (
                                    <div key={media.id} className={`bg-[#0b101b] border p-3 rounded-[2rem] relative group transition-all duration-300 ${media.isselected_for_loop ? 'border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] bg-amber-950/5' : 'border-white/5 hover:border-white/20'}`}>

                                        {/* 🌟 ปุ่มลบภาพพื้นหลัง */}
                                        {/* 🌟 ปุ่มลบภาพพื้นหลัง */}
                                        <button
                                            onClick={(e) => handleDeleteBackgroundMedia(media.id, media.media_url, e)}
                                            className="absolute top-4 left-4 bg-red-600/90 hover:bg-red-500 text-white p-2 rounded-xl shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                            title="ลบสื่อนี้"
                                        >
                                            <Trash2 size={14} />
                                        </button>

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
                                        <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} placeholder="พิมพ์ข้อความประกาศด่วนตรงนี้..." className="w-full h-24 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-bold text-gray-300 focus:outline-none focus:border-red-500/40 transition-all resize-none custom-scrollbar" />
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
                                            <button type="button" onClick={() => qrFileInputRef.current?.click()} disabled={uploadingQR} className="w-full py-3 bg-white/5 border border-white/10 text-cyan-400 font-black text-[10px] tracking-widest uppercase rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-white/10">{uploadingQR ? <RefreshCw size={12} className="animate-spin" /> : <UploadCloud size={12} />}<span>{qrCodeUrl ? 'CHANGE QR CODE IMAGE' : 'UPLOAD QR CODE IMAGE'}</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* WORKSPACE 5: แผงบริหารคลังรูปภาพ/วิดีโอเงียบคั่นจังหวะ */}
                    {activeTab === 'intermission' && (
                        <motion.div key="intermission-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                <div>
                                    <h2 className="text-xl font-black tracking-wider uppercase text-orange-400">คลังสื่อคั่นจังหวะเปลี่ยนเพลง (Intermission 8s)</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-semibold">ฉายสไลด์ภาพนิ่ง/วิดีโอช่วงคั่นรอยต่อ 4 วินาทีท้ายเพลง + 4 วินาทีต้นเพลงใหม่</p>
                                </div>
                                <div className="flex items-center gap-3">
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

                                <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                                    {intermissionMediaList.map((media) => (
                                        <div key={media.id} className={`bg-[#0b101b] border p-2.5 rounded-[1.8rem] relative transition-all duration-300 group ${media.isselected_for_loop ? 'border-orange-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5'}`}>

                                            {/* 🌟 ปุ่มลบสื่อคั่นเวลา */}
                                            {/* 🌟 ปุ่มลบสื่อคั่นเวลา */}
                                            <button
                                                onClick={(e) => handleDeleteIntermissionMedia(media.id, media.media_url, e)}
                                                className="absolute top-3 left-3 bg-red-600/90 hover:bg-red-500 text-white p-1.5 rounded-lg shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                                title="ลบสื่อนี้"
                                            >
                                                <Trash2 size={12} />
                                            </button>

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

            {/* POPUP MODAL DIALOG (สำหรับเพิ่ม/แก้ไขเนื้อเพลง) */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-md" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 30 }} className="bg-[#0b101b] border border-white/10 w-full max-w-lg rounded-[2.5rem] p-8 relative shadow-2xl z-10">
                            <h2 className="text-2xl font-black mb-1 text-white uppercase italic tracking-tighter">{selectedSong?.lyrics ? 'Edit Lyrics' : 'Manual Entry'}</h2>
                            <p className="text-cyan-400 font-bold text-xs mb-6 opacity-60 uppercase tracking-wide">SONG: {selectedSong?.title}</p>
                            <textarea value={lyricsInput} onChange={(e) => setLyricsInput(e.target.value)} placeholder="วางเนื้อเพลงที่นี่..." className="w-full h-80 bg-black/60 border border-white/5 rounded-[1.5rem] p-6 text-gray-300 focus:outline-none focus:border-cyan-500/40 transition-all mb-6 resize-none custom-scrollbar" />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl text-[10px] font-black text-gray-500 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest">Close</button>
                                <button type="button" onClick={handleSaveLyrics} className="flex-[2] py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-black text-xs tracking-wider uppercase rounded-2xl shadow-all active:scale-95">SAVE LYRICS</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}