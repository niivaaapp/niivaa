"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BookOpen, Languages, Heart, Wrench, Music, Copy, LogOut, Plus, X, ArrowRight, Library, Eye } from 'lucide-react';

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

    const handleCloneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCloning(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { alert('กรุณาเข้าสู่ระบบก่อนครับ'); return; }

            // บันทึกสร้างชุดสื่อใหม่ให้สมาชิก
            const { error: plError } = await supabase
                .from('playlists')
                .insert([{
                    name: newTitle,
                    description: newDesc,
                    user_id: user.id,
                    is_global: false,
                    is_featured: false,
                    category: selectedTemplate.category,
                    type: selectedTemplate.type || 'music'
                }]);

            if (plError) throw plError;

            // บันทึกยอดสะสมจำนวนครั้งที่ถูกเลือกนำไปใช้จริงในแถวแม่แบบตัวนั้น
            await supabase
                .from('playlists')
                .update({ clone_count: selectedTemplate.clone_count + 1 })
                .eq('id', selectedTemplate.id);

            setSelectedTemplate(null);
            alert(`🎉 บันทึกชุดสื่อ "${newTitle}" เข้าสตูดิโอส่วนตัวของท่านเรียบร้อยแล้วครับ!`);
            router.push('/create-playlist');
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการคัดลอกคลังสื่อครับ: ' + err.message);
        } finally {
            setIsCloning(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#030914] via-[#091124] to-[#020712] text-white p-6 relative select-none">
            {/* Header ส่วนบนคงเดิม */}
            <div className="max-w-6xl mx-auto flex justify-between items-center border-b border-white/10 pb-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 font-mono font-black text-xs tracking-wider">NIIVAA HUB</div>
                    <span className="text-sm font-bold text-gray-400">| คลังสื่อมัลติมีเดียและแม่แบบการสอนกลาง</span>
                </div>
                <button onClick={() => supabase.auth.signOut().then(() => router.push('/launchpad'))} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all">
                    ออกจากระบบ
                </button>
            </div>

            <div className="max-w-4xl mx-auto text-center space-y-4 mb-12">
                <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                    ยินดีต้อนรับสู่ NIIVAA Online Smart Media!
                </h1>
                <p className="text-sm text-gray-400 max-w-2xl mx-auto">
                    คลิกที่ชุดสื่อใด ๆ เพื่อเข้าชมรายการคิวงานและทดลองเปิดเล่น หรือคลิกปุ่มหยิบใช้เพื่อโคลนคลังเข้าสู่บัญชีของท่าน
                </p>
                <div className="pt-2">
                    <button onClick={() => router.push('/create-playlist')} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all">
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
                                            onClick={() => handleViewPlaylist(item.id)} // 🟢 ส่ง id ไปหน้าเล่นคิวเพลงจริง
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

            {/* Popup Modal คงตามเดิม */}
            {selectedTemplate && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0b1324] border border-cyan-500/30 p-6 rounded-3xl w-full max-w-md text-white space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => setSelectedTemplate(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={16} /></button>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">⚡ CLONE & CUSTOMIZE</span>
                            <h3 className="text-base font-black">ดึงข้อมูลชุดสื่อลงคลังสตูดิโอ</h3>
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
                            <button type="submit" disabled={isCloning} className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg">
                                {isCloning ? 'กำลังดึงสื่อติดไป...' : 'ตกลง! บันทึกเข้าคลังของฉัน'} <ArrowRight size={14} strokeWidth={3} />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}