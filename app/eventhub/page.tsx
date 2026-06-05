"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
    Landmark, 
    Users, 
    Sun, 
    Heart, 
    Flame, 
    Flag, 
    ArrowLeft, 
    ChevronRight 
} from 'lucide-react';

export default function EventHubPage() {
    const router = useRouter();

    // ข้อมูลหมวดหมู่งานทั้ง 6 ประเภท พร้อมการตั้งค่าสีและไอคอน
    const eventCategories = [
        {
            id: 'official',
            title: 'งานราชพิธี งานพิธี',
            description: 'ระบบจัดการลำดับพิธีการ การจัดเตรียมสถานที่ และผังที่นั่งระดับเป็นทางการ',
            icon: Landmark,
            color: 'from-amber-500/20 to-yellow-500/10',
            borderColor: 'hover:border-amber-400',
            textColor: 'text-amber-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]',
            link: '/eventdashboard?type=official' // สามารถเปลี่ยนลิงก์ในอนาคตได้
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
            link: '/eventdashboard?type=seminar'
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
            link: '/eventdashboard?type=ordination'
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
            link: '/eventdashboard?type=wedding'
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
            link: '/eventdashboard?type=funeral'
        },
        {
            id: 'project',
            title: 'พิธีการในกิจกรรมของโครงการ',
            description: 'ระบบบริหารจัดการกิจกรรมพิเศษ งานเปิดตัว และพิธีการเฉพาะกิจ',
            icon: Flag,
            color: 'from-emerald-500/20 to-teal-500/10',
            borderColor: 'hover:border-emerald-400',
            textColor: 'text-emerald-400',
            shadow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.2)]',
            link: '/eventdashboard?type=project'
        }
    ];

    return (
        <div className="min-h-screen bg-[#020617] text-white flex flex-col relative overflow-hidden select-none pb-12">
            
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-purple-900/10 blur-[150px] pointer-events-none rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-blue-900/10 blur-[150px] pointer-events-none rounded-full"></div>

            {/* Navbar Menu */}
            <div className="p-6 max-w-6xl w-full mx-auto relative z-20">
                <button 
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all text-xs font-bold border border-white/5"
                >
                    <ArrowLeft size={14} /> กลับสู่หน้าหลัก (Workspace)
                </button>
            </div>

            {/* Header Section */}
            <div className="flex flex-col items-center justify-center text-center px-6 mt-4 mb-12 relative z-20">
                <span className="text-sm font-black text-zinc-400 tracking-widest mb-4">ยินดีต้อนรับสู่</span>
                
                {/* ดึงภาพ Logo NiiVaa SmartEvent */}
                <img 
                    src="/niivaasmartevent_logo.png" 
                    alt="NiiVaa SmartEvent" 
                    className="h-16 md:h-20 object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.4)] mb-6"
                />

                <p className="text-sm md:text-base text-zinc-300 max-w-3xl leading-relaxed font-medium bg-white/5 border border-white/10 px-6 py-4 rounded-2xl backdrop-blur-sm">
                    ศูนย์รวมระบบบริหารจัดงานดิจิทัลอัจฉริยะ สำหรับ หน่วยงาน องค์กร ORGANIZER <br className="hidden md:block"/> 
                    ผู้ให้บริการจัดงานเลี้ยง ร้านอาหาร เจ้าภาพจัดงาน และพิธีกร ทุกระดับ
                </p>
            </div>

            {/* Category Grid Cards */}
            <div className="max-w-6xl w-full mx-auto px-6 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {eventCategories.map((cat) => {
                        const Icon = cat.icon;
                        return (
                            <div 
                                key={cat.id}
                                onClick={() => router.push(cat.link)}
                                className={`group relative bg-zinc-900/40 backdrop-blur-md border border-white/10 p-6 rounded-3xl cursor-pointer transition-all duration-300 hover:-translate-y-1 overflow-hidden ${cat.borderColor} ${cat.shadow}`}
                            >
                                {/* Gradient Background Hover */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-2xl bg-black/40 border border-white/5 group-hover:bg-black/60 transition-colors ${cat.textColor}`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-white/20 transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                    
                                    <h2 className="text-lg font-black text-white mb-2 group-hover:text-white transition-colors">
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