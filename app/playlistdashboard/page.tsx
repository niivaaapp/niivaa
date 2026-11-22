"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    LayoutDashboard,
    User,
    BookOpen,
    Languages,
    Heart,
    Wrench,
    Copy,
    Plus,
    X,
    ArrowRight,
    Eye,
    HelpCircle,
    Sparkles,
    CheckCircle2
} from 'lucide-react';

// ฟังก์ชันแมปไอคอนตามชื่อหมวดหมู่เพื่อความสวยงามล้ำสมัย
const getCategoryIcon = (catName: string) => {
    if (catName.includes("ภาษา")) return Languages;
    if (catName.includes("คณิต") || catName.includes("วิทย์") || catName.includes("ฟิสิกส์") || catName.includes("เคมี") || catName.includes("ชีว")) return BookOpen;
    if (catName.includes("สุขภาพ") || catName.includes("สวดมนต์")) return Heart;
    return Wrench; // ค่าเริ่มต้น เช่น งานช่าง ฟังเพลง คาราโอเกะ
};

// ฟังก์ชันแมปสีนีออนตามหมวดหมู่
const getCategoryColor = (catName: string) => {
    if (catName.includes("ภาษา")) return "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400";
    if (catName.includes("คณิต") || catName.includes("วิทย์") || catName.includes("ฟิสิกส์") || catName.includes("เคมี") || catName.includes("ชีว")) return "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400";
    if (catName.includes("สุขภาพ") || catName.includes("สวดมนต์")) return "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400";
    return "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400";
};

export default function WelcomePlaylistDashboard() {
    const router = useRouter();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isCloning, setIsCloning] = useState(false);

    // State สำหรับ Slide-over Drawer คู่มือการใช้งาน
    const [showManual, setShowManual] = useState(false);

    // สร้าง State สำหรับเก็บอีเมล
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // ดึงข้อมูล User เมื่อโหลดหน้า
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
            }
        };
        fetchUser();
    }, []);

    // 🔄 1. ดึงข้อมูลจริงจากตาราง playlists (เฉพาะของส่วนกลาง is_global = true)
    const fetchRealTemplates = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('playlists')
                .select('*, tracks(count)')
                .eq('is_global', true)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                // จัดโครงสร้างนับจำนวนสื่อ และจัดกลุ่มตาม category (Group By Category)
                const formatted = data.map(p => ({
                    ...p,
                    song_count: p.tracks?.[0]?.count || 0,
                    clone_count: p.clone_count || 0
                }));

                // แบ่งกลุ่มลงถัง Category แบบ Dynamic ไม่ต้อง Hardcode
                const groups: { [key: string]: any[] } = {};
                formatted.forEach(item => {
                    const catName = item.category || "ทั่วไป / บันเทิง";
                    if (!groups[catName]) groups[catName] = [];
                    groups[catName].push(item);
                });

                // แปลงเป็น Array เพื่อนำไปเรนเดอร์บน UI
                const categoryArray = Object.keys(groups).map(catName => ({
                    title: catName,
                    icon: getCategoryIcon(catName),
                    color: getCategoryColor(catName),
                    items: groups[catName]
                }));

                setCategories(categoryArray);
            }
        } catch (err: any) {
            console.error("ดึงคลังข้อมูลไม่สำเร็จ:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRealTemplates();
    }, []);

    // 🎯 2. สั่งวิ่งเข้าหน้าเล่นสื่อ/คิวเพลงตาม ID จริงในตาราง playlists
    const handleViewPlaylist = (id: string) => {
        router.push(`/playlist/${id}`);
    };

    // 🎯 3. เปิดกล่องปรับแต่งเตรียมก๊อปปี้คลัง
    const handleSelectTemplate = (e: React.MouseEvent, item: any) => {
        e.stopPropagation(); // ห้ามทะลุไปโดนคลิกเปิดหน้าเล่น
        setSelectedTemplate(item);
        setNewTitle(`${item.name} (คลังของฉัน)`);
        setNewDesc(item.description || `คัดลอกมาจากชุดสื่อแนะนำ: ${item.name}`);
    };

    // 🎯 4. โคลนเพลย์ลิสต์พร้อมรายการสื่อ/เพลง และค่า S/M/E + รอบเล่นซ้ำทั้งหมด
    const handleCloneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;
        setIsCloning(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('กรุณาเข้าสู่ระบบก่อนครับ');
                return;
            }

            // 1. บันทึกสร้างชุดสื่อใหม่ให้สมาชิก พร้อมรับ ID ของเพลย์ลิสต์ใหม่กลับมา
            const { data: newPlaylist, error: plError } = await supabase
                .from('playlists')
                .insert([{
                    name: newTitle,
                    description: newDesc,
                    user_id: user.id,
                    is_global: false,
                    is_featured: false,
                    is_public: false,
                    category: selectedTemplate.category,
                    type: selectedTemplate.type || 'music'
                }])
                .select()
                .single();

            if (plError || !newPlaylist) throw plError;

            // 2. ดึงรายการเพลง/สื่อทั้งหมดจากเทมเพลตต้นฉบับ
            // 2. ดึงรายการเพลง/สื่อทั้งหมดจากเทมเพลตต้นฉบับ (เรียงตาม created_at แทน position)
            const { data: sourceTracks, error: fetchTracksError } = await supabase
                .from('tracks')
                .select('*')
                .eq('playlist_id', selectedTemplate.id)
                .order('created_at', { ascending: true });

            if (fetchTracksError) throw fetchTracksError;

            // 3. คัดลอกเพลงทั้งหมด (ตัด id และ created_at เดิมออก เพื่อสร้างแถวใหม่ในเพลย์ลิสต์ใหม่)
            if (sourceTracks && sourceTracks.length > 0) {
                const tracksToInsert = sourceTracks
                    .filter((t: any) => !t.is_app_intro)
                    .map(({ id, created_at, playlist_id, ...rest }: any) => ({
                        ...rest,
                        playlist_id: newPlaylist.id,
                        is_played: false
                    }));

                if (tracksToInsert.length > 0) {
                    const { error: insertTracksError } = await supabase
                        .from('tracks')
                        .insert(tracksToInsert);

                    if (insertTracksError) throw insertTracksError;
                }
            }

            // 4. บันทึกยอดสะสมจำนวนครั้งที่ถูกเลือกนำไปใช้ (ไม่ให้ขัดจังหวะหากติดสิทธิ์ RLS)
            try {
                await supabase
                    .from('playlists')
                    .update({ clone_count: (selectedTemplate.clone_count || 0) + 1 })
                    .eq('id', selectedTemplate.id);
            } catch (countErr) {
                console.warn('อัปเดตยอด clone_count ไม่สำเร็จ:', countErr);
            }

            setSelectedTemplate(null);
            alert(`🎉 บันทึกชุดสื่อ "${newTitle}" พร้อมรายการสื่อทั้งหมด (${sourceTracks?.length || 0} รายการ) เข้าสตูดิโอส่วนตัวเรียบร้อยแล้วครับ!`);
            router.push('/create-playlist');
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการคัดลอกคลังสื่อครับ: ' + err.message);
        } finally {
            setIsCloning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#030914] via-[#091124] to-[#020712] text-white relative select-none flex flex-col">

            {/* 🌟 1. CSS สำหรับ Animation ข้อความวิ่งให้ลื่นไหล (Smooth Marquee) */}
            <style jsx>{`
                @keyframes smoothMarquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .marquee-container {
                    display: inline-block;
                    white-space: nowrap;
                    animation: smoothMarquee 35s linear infinite;
                    will-change: transform;
                }
                .marquee-wrapper:hover .marquee-container {
                    animation-play-state: paused;
                }
            `}</style>

            {/* 🌟 2. โครงสร้างข้อความวิ่งแบบใหม่ */}
            <div className="w-full bg-cyan-900/40 border-b border-cyan-500/30 text-cyan-300 py-1.5 overflow-hidden shrink-0 marquee-wrapper relative h-8 flex items-center">
                <div className="marquee-container text-[11px] sm:text-xs font-medium tracking-wide flex items-center h-full absolute">
                    🎉 ยินดีต้อนรับคุณ <span className="font-bold text-white px-1">{userEmail || 'สมาชิก NiiVaa'}</span>
                    คุณสามารถแวะชมตัวอย่างชุดสื่อหรืออัลบัม (Playlist) ที่เป็นเทมเพลตตัวอย่างด้านล่างนี้
                    หากสนใจสามารถเลือก <span className="text-yellow-300 font-bold px-1">&quot;หยิบเทมเพลตนี้ไปปรับใช้&quot;</span>
                    หรือ คุณอาจไปเริ่มต้นสร้าง Playlist ใหม่ของคุณเอง โดยแตะปุ่ม <span className="text-emerald-300 font-bold px-1">&quot;ไปหน้าจัดการชุดสื่อส่วนตัว (Create Playlist)&quot;</span> 🚀
                </div>
            </div>

            <div className="p-6 flex-1">
                {/* Header ส่วนบน */}
                <div className="max-w-6xl mx-auto flex justify-between items-center border-b border-white/10 pb-4 mb-8 gap-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 font-mono font-black text-xs tracking-wider">NIIVAA HUB</div>
                        <span className="text-sm font-bold text-gray-400 hidden sm:inline">| คลังสื่อมัลติมีเดียและแม่แบบการสอนกลาง</span>
                    </div>

                    {/* กลุ่มเมนูด้านขวา */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* แสดง Email ผู้ใช้งาน */}
                        {userEmail && (
                            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 text-xs font-medium">
                                <User size={14} className="text-cyan-400" />
                                <span>{userEmail}</span>
                            </div>
                        )}

                        {/* ปุ่มเปิด Slide-over คู่มือการใช้งาน */}
                        <button
                            onClick={() => setShowManual(true)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
                            title="คู่มือการใช้งานหน้านี้"
                        >
                            <HelpCircle size={14} className="sm:w-4 sm:h-4" />
                            <span>คู่มือ</span>
                        </button>

                        <Link
                            href={`/smart-media-dashboard`}
                            className="flex items-center justify-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
                        >
                            <LayoutDashboard size={14} className="sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">กลับศูนย์กลาง</span>
                        </Link>

                        <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] sm:text-xs font-bold transition-all">
                            ออกจากระบบ
                        </button>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto text-center space-y-4 mb-12">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                        ยินดีต้อนรับสู่ NIIVAA Online Smart Media!
                    </h1>
                    <p className="text-sm text-gray-400 max-w-2xl mx-auto">
                        คลิกที่ชุดสื่อใด ๆ เพื่อเข้าชมรายการคิวงานและทดลองเปิดเล่น หรือคลิกปุ่มหยิบใช้เพื่อโคลนคลังเข้าสู่บัญชีของท่าน
                    </p>
                    <div className="pt-2">
                        <button onClick={() => router.push('/create-playlist')} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-[10px] sm:text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all shadow-lg">
                            <Plus size={16} /> ไปที่หน้าจัดการชุดสื่อส่วนตัว (Create Playlist)
                        </button>
                    </div>
                </div>

                {/* ส่วนแสดงรายการแบ่งหมวดหมู่อัตโนมัติจากฐานข้อมูล */}
                <div className="max-w-6xl mx-auto space-y-10 pb-24">
                    {loading ? (
                        <div className="text-center py-12 text-cyan-400 font-bold animate-pulse text-sm">กำลังเชื่อมต่อคลังข้อมูลหลักฐานระบบ...</div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-sm">ยังไม่มีชุดสื่อกลางในระบบ (แอดมินสามารถสร้างได้ที่หน้า admin/create-template)</div>
                    ) : (
                        categories.map((cat, idx) => {
                            const IconComponent = cat.icon;
                            return (
                                <div key={idx} className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm font-black tracking-wide text-gray-300 border-l-2 border-cyan-400 pl-2">
                                        <IconComponent size={16} className="text-cyan-400" />
                                        <h2>{cat.title}</h2>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {cat.items.map((item: any) => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleViewPlaylist(item.id)}
                                                className={`p-5 rounded-2xl border bg-gradient-to-br ${cat.color} flex flex-col justify-between gap-4 group hover:scale-[1.02] cursor-pointer transition-all duration-300 hover:border-cyan-400/60 shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]`}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-start gap-2">
                                                        <h3 className="font-black text-sm text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                                                            {item.name}
                                                        </h3>
                                                        <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-md shrink-0 text-gray-300 font-mono">
                                                            {item.song_count} รายการ
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                                                        {item.description || 'ไม่มีข้อมูลคำอธิบาย'}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] text-gray-500">
                                                    <span>ถูกนำไปใช้: <b className="text-cyan-400 font-mono">{item.clone_count}</b> ครั้ง</span>
                                                    <span className="text-cyan-400/60 group-hover:text-cyan-400 font-bold flex items-center gap-0.5 transition-colors">
                                                        เข้าชมสื่อ <Eye size={10} />
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={(e) => handleSelectTemplate(e, item)}
                                                    className="w-full py-2 bg-white/5 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-400 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Copy size={12} /> หยิบเทมเพลตนี้ไปปรับใช้
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Popup Modal โคลนชุดสื่อ */}
            {selectedTemplate && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0b1324] border border-cyan-500/30 p-6 rounded-3xl w-full max-w-md text-white space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => setSelectedTemplate(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={16} /></button>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">⚡ CLONE & CUSTOMIZE</span>
                            <h3 className="text-base font-black">ดึงข้อมูลชุดสื่อลงคลังสตูดิโอ</h3>
                            <p className="text-[11px] text-emerald-400">
                                คัดลอกทั้ง {selectedTemplate.song_count} รายการ พร้อมค่าตัดต่อ S/M/E และรอบเล่นซ้ำ
                            </p>
                        </div>
                        <form onSubmit={handleCloneSubmit} className="space-y-4 pt-2">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">ชื่อชุดสื่อการเรียนรู้/เพลง:</label>
                                <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-cyan-500 rounded-xl p-3 text-sm text-cyan-300 font-bold focus:outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">คำอธิบายเพิ่มเติม:</label>
                                <textarea value={newDesc} rows={3} onChange={(e) => setNewDesc(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-cyan-500 rounded-xl p-3 text-sm text-gray-300 focus:outline-none resize-none" />
                            </div>
                            <button type="submit" disabled={isCloning} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                {isCloning ? 'กำลังดึงสื่อติดไป...' : 'ตกลง! บันทึกเข้าคลังของฉัน'} <ArrowRight size={14} strokeWidth={3} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* 🌟 Slide-over Drawer คู่มือการใช้งานหน้านี้ */}
            {showManual && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowManual(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                    />

                    {/* Drawer Panel */}
                    <div className="relative z-10 w-full max-w-md bg-[#070e1d] border-l border-cyan-500/30 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-cyan-950/30">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-300">
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white">คู่มือการใช้งาน NiiVaa Hub</h2>
                                    <p className="text-[11px] text-cyan-400">คลังชุดสื่อตัวอย่าง &amp; แม่แบบการสอนกลาง</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowManual(false)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs text-gray-300 leading-relaxed">
                            {/* หัวข้อ 1 */}
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                                <div className="flex items-center gap-2 text-cyan-300 font-black text-sm">
                                    <Eye size={16} /> 1. ทดลองรับชมชุดสื่อตัวอย่าง
                                </div>
                                <p>
                                    คลิกที่ <b className="text-white">การ์ดชุดสื่อใดก็ได้</b> เพื่อเปิดเข้าสู่หน้าเล่นสื่อทันที สามารถดูรายการคิวทั้งหมดและทดลองฟัง/รับชมการตัดต่อช่วงคลิปอัตโนมัติได้โดยไม่กระทบต้นฉบับ
                                </p>
                            </div>

                            {/* หัวข้อ 2 */}
                            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-300 font-black text-sm">
                                    <Copy size={16} /> 2. หยิบเทมเพลตไปปรับใช้ (Clone)
                                </div>
                                <p>
                                    กดปุ่ม <b className="text-amber-300">&quot;หยิบเทมเพลตนี้ไปปรับใช้&quot;</b> ที่ด้านล่างของการ์ด ตั้งชื่อใหม่ตามต้องการ ระบบจะคัดลอกสิ่งต่อไปนี้ไปไว้ในบัญชีส่วนตัวของคุณครบถ้วน:
                                </p>
                                <ul className="space-y-1.5 pt-1 text-[11px] text-gray-200">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                        รายการเพลงและวิดีโอทั้งหมดตามลำดับคิว
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                        ค่าตัดต่อช่วงต้น (S), ข้ามช่วงกลาง (M), ตัดท้าย (E)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                        จำนวนรอบการเล่นซ้ำ (Repeat Count) ของแต่ละรายการ
                                    </li>
                                </ul>
                            </div>

                            {/* หัวข้อ 3 */}
                            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                                <div className="flex items-center gap-2 text-blue-300 font-black text-sm">
                                    <Plus size={16} /> 3. จัดการชุดสื่อส่วนตัว (Create Playlist)
                                </div>
                                <p>
                                    กดปุ่ม <b className="text-cyan-300">&quot;ไปที่หน้าจัดการชุดสื่อส่วนตัว&quot;</b> ด้านบน เพื่อเข้าไปดูอัลบั้มที่คุณโคลนไว้ หรือสร้างอัลบั้มใหม่เอง ปรับแต่งเพิ่ม/ลบเพลง ตั้งค่า S/M/E และตั้งรหัสแชร์ (Share Code) ส่งต่อให้ผู้อื่นได้
                                </p>
                            </div>

                            {/* ทิปส์ */}
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-amber-300 font-black text-xs">
                                    <Sparkles size={14} /> เคล็ดลับ
                                </div>
                                <p className="text-[11px] text-amber-100/90">
                                    ชุดสื่อที่โคลนไปจะถูกตั้งเป็น <b>ส่วนตัว</b> โดยอัตโนมัติ คุณสามารถปรับแก้ได้อิสระโดยไม่กระทบกับชุดสื่อกลางครับ
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-black/30">
                            <button
                                onClick={() => setShowManual(false)}
                                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs rounded-xl hover:opacity-90 transition-all"
                            >
                                เข้าใจแล้ว ปิดคู่มือ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}