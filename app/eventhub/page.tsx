"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
    Landmark,
    Users,
    Sun,
    Heart,
    Flame,
    Flag,
    ArrowLeft,
    ChevronRight,
    Crown,
    Lock,
    Loader2,
    User // 🌟 นำเข้าไอคอน User
} from 'lucide-react';

export default function EventHubPage() {
    const router = useRouter();
    const supabase = createClient();
    const [isChecking, setIsChecking] = useState(false);
    
    // 🌟 1. สร้าง State สำหรับเก็บชื่อผู้ใช้งาน
    const [userName, setUserName] = useState<string | null>(null);

    // 🌟 2. ดึงข้อมูลผู้ใช้เมื่อหน้าเว็บโหลด
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // พยายามดึงชื่อจากตาราง profiles (ถ้ามี)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username') // สมมติว่ามีคอลัมน์ชื่อ full_name หรือ username
                    .eq('id', user.id)
                    .maybeSingle();

                // แสดงชื่อเต็ม > หรือชื่อผู้ใช้ > หรืออีเมล เป็นลำดับสุดท้าย
                setUserName(profile?.full_name || profile?.username || user.email || 'ผู้ใช้งาน');
            }
        };
        fetchUser();
    }, [supabase]);

    // 🌟 ฟังก์ชันคัดกรองผู้ใช้ (ยามเฝ้าประตู)
    const handleCheckAndRoute = async (categoryId: string) => {
        setIsChecking(true);
        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            // 1. ถ้ายังไม่ล็อกอิน ให้ไปหน้า Pricing
            if (authError || !session) {
                router.push('/eventdashboard/pricing');
                return;
            }

            // 2. 🛡️ เช็คหลักฐานการเปิดใช้งานระบบ (Workspace)
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('id')
                .eq('owner_id', session.user.id)
                .eq('service_code', 'SMART_EVENT')
                .maybeSingle();

            // 3. แยกเส้นทาง
            if (!workspace) {
                // ❌ ผู้ใช้ใหม่: ส่งไปหน้า Pricing
                router.push('/eventdashboard/pricing');
            } else {
                // ✅ ผู้ใช้เก่า: ส่งไปหน้า Dashboard ตามประเภทงาน
                router.push(`/eventdashboard?type=${categoryId}`);
            }

        } catch (error) {
            console.error("Routing Error:", error);
            router.push('/eventdashboard/pricing');
        } finally {
            setTimeout(() => setIsChecking(false), 3000); 
        }
    };

    // 🌟 ข้อมูลหมวดหมู่งานทั้งหมด
    const eventCategories = [
        {
            id: 'official',
            title: 'งานรัฐพิธี',
            description: 'ระบบจัดการลำดับพิธีการ การจัดเตรียมสถานที่ และผังที่นั่งระดับเป็นทางการ',
            icon: Landmark,
            color: 'from-amber-500/20 to-yellow-500/10',
            borderColor: 'hover:border-amber-400',
            textColor: 'text-amber-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]',
            ready: true // ✅ เปิดใช้งาน
        },
        {
            id: 'farewell_welcome',
            title: 'พิธีการ / แสดงความยินดี',
            description: 'ระบบบริหารจัดการกิจกรรมพิเศษ งานเปิดตัว มอบของที่ระลึก งานพิธีทั่วไป',
            icon: Flag,
            color: 'from-emerald-500/20 to-teal-500/10',
            borderColor: 'hover:border-emerald-400',
            textColor: 'text-emerald-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]',
            ready: true // ✅ เปิดใช้งาน
        },
        {
            id: 'seminar',
            title: 'งานประชุมสัมมนา',
            description: 'ระบบจัดการลงทะเบียน การเบรกอาหารว่าง และผังที่นั่งผู้เข้าร่วมประชุม',
            icon: Users,
            color: 'from-blue-500/20 to-cyan-500/10',
            borderColor: 'hover:border-blue-400',
            textColor: 'text-blue-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(96,165,250,0.2)]',
            ready: false // 🚧 ปิดใช้งานชั่วคราว
        },
        {
            id: 'ordination',
            title: 'งานบวช',
            description: 'ระบบจัดการคิวงานพิธีอุปสมบท งานเลี้ยงฉลอง และการจัดสรรของที่ระลึก',
            icon: Sun,
            color: 'from-orange-500/20 to-amber-500/10',
            borderColor: 'hover:border-orange-400',
            textColor: 'text-orange-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.2)]',
            ready: false
        },
        {
            id: 'wedding',
            title: 'งานแต่งงาน',
            description: 'ระบบรันคิวพิธีการ ผังโต๊ะจีน/ค็อกเทล และระบบจัดการแขก VIP',
            icon: Heart,
            color: 'from-pink-500/20 to-rose-500/10',
            borderColor: 'hover:border-pink-400',
            textColor: 'text-pink-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(244,114,182,0.2)]',
            ready: false
        },
        {
            id: 'funeral',
            title: 'งานศพ',
            description: 'ระบบจัดการตารางสวดอภิธรรม การจัดการของว่าง และอำนวยความสะดวกแขก',
            icon: Flame,
            color: 'from-slate-500/20 to-zinc-500/10',
            borderColor: 'hover:border-slate-400',
            textColor: 'text-slate-300',
            shadow: 'hover:shadow-[0_0_30px_rgba(148,163,184,0.2)]',
            ready: false
        }
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col relative overflow-hidden select-none pb-12">
            
            {/* 🌟 หน้าต่าง Loading Overlay แบบกระจก (ตอนเช็คแพ็กเกจ) */}
            {isChecking && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                    <p className="text-amber-400 font-bold tracking-widest animate-pulse">กำลังตรวจสอบข้อมูลบัญชี...</p>
                </div>
            )}

            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-purple-900/10 blur-[150px] pointer-events-none rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full"></div>

            {/* Navbar Menu */}
            <div className="p-6 max-w-6xl w-full mx-auto relative z-20 flex justify-between items-center">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all text-xs font-bold border border-white/5 shrink-0"
                >
                    <ArrowLeft size={14} /> <span className="hidden sm:inline">กลับสู่หน้าหลัก</span>
                </button>
                
                {/* 🌟 แสดงชื่อผู้ใช้ และปุ่มอัปเกรด */}
                <div className="flex items-center gap-3">
                    {userName && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-medium text-slate-300">
                            <User size={14} className="text-cyan-400" />
                            <span className="truncate max-w-[120px] sm:max-w-[200px]">{userName}</span>
                        </div>
                    )}
                    <Link
                        href="/eventdashboard/pricing"
                        className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl transition-all font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:-translate-y-0.5"
                    >
                        <Crown className="w-4 h-4" />
                        อัปเกรดพรีเมียม
                    </Link>
                </div>
            </div>
            
            {/* Header Section */}
            <div className="flex flex-col items-center justify-center text-center px-6 mt-4 mb-12 relative z-20">
                <span className="text-sm font-black text-zinc-400 tracking-widest mb-4">ยินดีต้อนรับสู่</span>
                <img
                    src="/niivaasmartevent_logo.png"
                    alt="NiiVaa SmartEvent"
                    className="h-16 md:h-20 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.4)] mb-6"
                />
                <p className="text-sm md:text-base text-zinc-300 max-w-3xl leading-relaxed font-medium bg-white/5 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm">
                    ศูนย์รวมระบบบริหารจัดงานดิจิทัลอัจฉริยะ สำหรับ หน่วยงาน องค์กร ORGANIZER <br className="hidden md:block" />
                    ผู้ให้บริการจัดงานเลี้ยง ร้านอาหาร เจ้าภาพจัดงาน และพิธีกร ทุกระดับ
                </p>
            </div>

            {/* Category Grid Cards */}
            <div className="max-w-6xl w-full mx-auto px-6 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {eventCategories.map((cat) => {
                        const Icon = cat.icon;
                        const isReady = cat.ready;

                        return (
                            <div
                                key={cat.id}
                                onClick={() => isReady && !isChecking && handleCheckAndRoute(cat.id)}
                                className={`group relative bg-zinc-900/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl transition-all duration-300 overflow-hidden 
                                    ${isReady ? `cursor-pointer hover:-translate-y-1 ${cat.borderColor} ${cat.shadow}` : 'cursor-not-allowed opacity-60 grayscale-[30%]'}
                                `}
                            >
                                {/* Gradient Background Hover */}
                                {isReady && (
                                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                )}

                                {/* Badge สำหรับงานที่ยังไม่พร้อม */}
                                {!isReady && (
                                    <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                        <Lock size={10} /> เร็วๆ นี้
                                    </div>
                                )}

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 transition-colors ${isReady ? `group-hover:bg-black/60 ${cat.textColor}` : 'text-gray-500'}`}>
                                            <Icon size={24} />
                                        </div>
                                        {isReady && (
                                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/20 transition-all">
                                                <ChevronRight size={16} />
                                            </div>
                                        )}
                                    </div>

                                    <h2 className={`text-lg font-black mb-2 transition-colors ${isReady ? 'text-white group-hover:text-white' : 'text-gray-400'}`}>
                                        {cat.title}
                                    </h2>

                                    <p className="text-xs text-zinc-400 leading-relaxed mt-auto">
                                        {cat.description}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}