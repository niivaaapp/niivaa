'use client';

import React, { Suspense, useState, useEffect } from 'react'; 
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Music, Mic2, PlusCircle, ListMusic, Video, Layers,
    UploadCloud, FileEdit, MonitorPlay, Sparkles, GraduationCap
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

function SmartMediaDashboardContent() {
    const MenuCard = ({ href, icon: Icon, title, desc, colorClass, badge }: any) => (
        <Link href={href} className="group relative bg-[#1e293b]/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] hover:-translate-y-1 overflow-hidden flex flex-col h-full">
            <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`}></div>
            {badge && (
                <span className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    {badge}
                </span>
            )}
            <div className={`p-3 rounded-xl inline-block w-fit bg-slate-800 group-hover:bg-slate-700 transition-colors mb-4`}>
                <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2 group-hover:text-cyan-300 transition-colors">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed flex-1">{desc}</p>
        </Link>
    );

    const searchParams = useSearchParams();
    const eventId = searchParams.get('event_id') || '';
    
    const [userEmail, setUserEmail] = useState<string>('');
    // 🌟 1. เพิ่ม State สำหรับเก็บ ID ของเพลย์ลิสต์
    const [playlistId, setPlaylistId] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchUserDataAndPlaylist = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');
                
                // 🌟 2. ดึงข้อมูลเพลย์ลิสต์ล่าสุดของ User คนนี้
                const { data: playlist } = await supabase
                    .from('playlists')
                    .select('id')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                if (playlist) {
                    setPlaylistId(playlist.id);
                }
            }
        };
        fetchUserDataAndPlaylist();
    }, []);

    return (
        <div className="min-h-screen bg-[#0f172a] py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500/30">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-slate-900 to-[#1e293b] p-8 rounded-3xl border border-slate-700/50 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full"></div>

                    <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                        <div className="bg-black/40 p-3 rounded-2xl border border-white/10 shadow-inner shrink-0">
                            <img src="/SMK.png" alt="NiiVaa SmartMedia" className="w-16 h-16 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                                NiiVaa SmartMedia & Karaoke
                            </h1>
                            <p className="text-slate-400 text-sm mt-2">ศูนย์รวมการจัดการสื่อมัลติมีเดีย คาราโอเกะอัจฉริยะ และสื่อการเรียนการสอน</p>
                        </div>
                    </div>

                    {userEmail && (
                        <div className="relative z-10 flex items-center gap-3 bg-slate-950/60 border border-cyan-500/30 px-5 py-2.5 rounded-full shadow-inner backdrop-blur-md shrink-0 w-full md:w-auto justify-center md:justify-start">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
                                    Logged in as
                                </span>
                                <span className="text-sm font-bold text-cyan-300 leading-none">
                                    {userEmail}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* หมวดหมู่ที่ 1 */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <ListMusic className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">จัดการคลังสื่อและเพลย์ลิสต์</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <MenuCard
                            href="/playlistdashboard"
                            icon={Sparkles} title="ชุดสื่อแนะนำ (Templates)" colorClass="bg-cyan-400"
                            desc="เรียกดูชุดสื่อตัวอย่าง บทเรียน หรืออัลบั้มเพลงที่ระบบสร้างไว้ให้ เพื่อนำมาโคลนใช้งาน"
                        />
                        <MenuCard
                            href="/create-playlist"
                            icon={PlusCircle} title="สร้างชุดสื่อ/อัลบั้มใหม่" colorClass="bg-cyan-400"
                            desc="สร้างเพลย์ลิสต์ใหม่สำหรับงานของคุณ เพื่อเตรียมใส่เพลงหรือวิดีโอ"
                        />
                        
                        {/* 🌟 3. แก้ไขลิงก์ตรงนี้ โดยดักจับกรณีที่ยังไม่มีเพลย์ลิสต์ ให้ไปหน้าสร้างแทน */}
                        <MenuCard
                            href={playlistId ? `/playlist/${playlistId}` : "/create-playlist"}
                            icon={Music} title="เพลย์ลิสต์ของฉัน (My Library)" colorClass="bg-cyan-400"
                            desc={playlistId ? "เข้าสู่หน้าเครื่องเล่น จัดการคิวเพลง และร้องคาราโอเกะ (เลือกจากอัลบั้มของคุณ)" : "คุณยังไม่มีเพลย์ลิสต์ คลิกเพื่อสร้างใหม่"}
                        />
                    </div>
                </section>

                {/* หมวดหมู่ที่ 2 */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <Mic2 className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-bold text-white">สตูดิโอและเครื่องมือ (Tools)</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <MenuCard
                            href="/dj/selector"
                            icon={Video} title="DJ / เพิ่มสื่อ YouTube" colorClass="bg-purple-400"
                            desc="นำ URL จาก YouTube มาวางเพื่อบันทึกเข้าคิวเพลย์ลิสต์"
                        />
                        <MenuCard
                            href="/studio"
                            icon={FileEdit} title="ระบบสร้างเนื้อเพลง" colorClass="bg-purple-400"
                            desc="Studio สำหรับเพิ่ม แก้ไข หรือซิงค์เวลาเนื้อเพลงคาราโอเกะ"
                        />
                        <MenuCard
                            href="/lyrics"
                            icon={MonitorPlay} title="จอแสดงเนื้อเพลง (Display)" colorClass="bg-purple-400"
                            desc="เปิดหน้าจอสไลด์เนื้อเพลงคาราโอเกะ ที่ซิงค์กับเครื่องเล่นหลัก"
                        />
                        <MenuCard
                            href={`/eventdashboard/media?event_id=${eventId}&source=smartmedia`}
                            icon={MonitorPlay}
                            title="คลังสื่อ SmartMedia"
                            colorClass="bg-cyan-500"
                            desc="อัปโหลดและจัดการไฟล์ภาพ วิดีโอ พื้นหลังในระบบ"
                        />
                        
                        {/* ลบ MenuCard ที่ซ้ำซ้อนออก (ที่ชี้ไป /playlist/manage หรือ /playlist/[id] ตัวเก่า) */}
                        
                        <MenuCard
                            href="/mykaraoke"
                            icon={Layers} title="คาราโอเกะคอมโบ (MyKaraoke)" colorClass="bg-cyan-400"
                            badge="โหมดใหม่"
                            desc="ร้องคาราโอเกะโหมดส่วนตัว (เนื้อเพลงพื้นหลังเต็มจอ + จอลอยเครื่องเล่นเพลง)"
                        />
                        <MenuCard
                            href="/smartmedia/dashboard/billing"
                            icon={Layers} title="ตรวจสอบสถานะสมาชิก แพ็กเกจ" colorClass="bg-cyan-400"
                            badge=""
                            desc="ข้อมูลแพ็กเกจ และระยะเวลาใช้งาน"
                        />
                    </div>
                </section>

                {/* หมวดหมู่ที่ 3 */}
                <section className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-3xl -m-6 p-6 border border-emerald-500/20"></div>
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                            <GraduationCap className="w-6 h-6 text-emerald-400" />
                            <h2 className="text-xl font-bold text-white">ต่อยอดสื่อการเรียนรู้ (Education Suite)</h2>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <Link href="/smartexam" className="group flex bg-emerald-950/40 border border-emerald-800 hover:border-emerald-500 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                <div className="mr-6 shrink-0">
                                    <div className="w-16 h-16 bg-emerald-900/50 rounded-2xl flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                                        <GraduationCap className="w-8 h-8 text-emerald-400" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-black text-white group-hover:text-emerald-300">NiiVaa SmartExam</h3>
                                        <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded-full uppercase">เชื่อมต่อแล้ว</span>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        เปลี่ยนสื่อหรือบทเรียนจาก SmartMedia ให้กลายเป็นการประเมินผล! <br />
                                        สร้างแบบทดสอบด้วย AI, จัดการห้องสอบ และวิเคราะห์ผลรายบุคคล
                                    </p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}

// ==========================================
// 🚀 Component หลักที่ Export (หุ้ม Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function SmartMediaDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-cyan-500">กำลังโหลด Smart Media Dashboard...</div>}>
            <SmartMediaDashboardContent />
        </Suspense>
    );
}