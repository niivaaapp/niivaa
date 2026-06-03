"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Music, LayoutGrid, LogOut, ArrowRight, Sparkles } from 'lucide-react';

export default function LaunchpadPage() {
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/'); // ออกระบบแล้วดีดกลับหน้าแรกสุด
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white flex flex-col justify-between p-6 select-none">
            
            {/* ส่วนบน: แถบหัวเรื่องบอร์ด */}
            <div className="max-w-6xl w-full mx-auto flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                    <span className="font-black text-sm tracking-widest bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        NIIVAA SMART SYSTEM
                    </span>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl text-xs font-bold border border-white/5 hover:border-red-500/20 transition-all"
                >
                    <LogOut size={12} /> ออกจากระบบ
                </button>
            </div>

            {/* ส่วนกลาง: ศูนย์รวมการเข้าถึงบริการหลัก (Launchpad Hub) */}
            <div className="max-w-4xl w-full mx-auto text-center space-y-10 my-auto py-12">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-black uppercase tracking-widest mx-auto animate-pulse">
                        <Sparkles size={10} /> แพลตฟอร์มเปิดบริการมัลติมีเดีย
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight">
                        ยินดีต้อนรับสู่ <span className="bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">NIIVAA App</span>
                    </h1>
                    <p className="text-xs md:text-sm text-gray-400 max-w-md mx-auto">
                        กรุณาเลือกบริการหรือโมดูลการทำงานที่ท่านต้องการเข้าใช้งานด้านล่างนี้
                    </p>
                </div>

                {/* 📦 แผงปุ่มทางเลือกบริการ (Grid Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4">
                    
                    {/* 🟢 การ์ดที่ 1: ระบบจัดการสื่ออัจฉริยะ (เปลี่ยนเป้าหมายเลี้ยวเข้าป้ายไอเดียเรียบร้อย) */}
                    <div 
                        onClick={() => router.push('/playlistdashboard')} // 🎯 จุดแก้ไข: เปลี่ยนจาก /create-playlist เป็น /playlistdashboard ตามเป้าหมายใหม่ครับพี่!
                        className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 hover:from-cyan-500/20 hover:to-blue-500/10 border border-cyan-500/20 hover:border-cyan-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-cyan-500/5"
                    >
                        <div className="space-y-2">
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 w-fit group-hover:bg-cyan-500 group-hover:text-black transition-all">
                                <Music size={20} />
                            </div>
                            <h2 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                                จัดการสื่อ & คาราโอเกะอัจฉริยะ
                            </h2>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                เข้าสู่ศูนย์คลังไอเดียแนะนำกรณีตัวอย่าง คัดลอกและจัดสรรหมวดหมู่ชุดเพลง/บทเรียนส่วนตัวตามความสนใจของท่าน
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-cyan-400 group-hover:translate-x-1 transition-transform">
                            เปิดใช้งานสตูดิโอ <ArrowRight size={12} strokeWidth={3} />
                        </div>
                    </div>

                    {/* การ์ดที่ 2: ระบบบริหารงานอีเวนต์ (Smart Event คุมงานบอร์ดกิจกรรมของพี่ ปล่อยคงไว้ปลอดภัยตามเดิมครับ) */}
                    <div 
                        onClick={() => router.push('/eventdashboard')} 
                        className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 hover:from-purple-500/20 hover:to-indigo-500/10 border border-white/5 hover:border-purple-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300"
                    >
                        <div className="space-y-2">
                            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 w-fit group-hover:bg-purple-500 group-hover:text-black transition-all">
                                <LayoutGrid size={20} />
                            </div>
                            <h2 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                                NIIVAA Smart Event
                            </h2>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                เข้าสู่แผงควบคุมระบบจัดการบอร์ดกิจกรรม แดชบอร์ดข้อมูลสารสนเทศ และงานควบคุมหลักของแพลตฟอร์ม
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-purple-400 group-hover:translate-x-1 transition-transform">
                            เปิดหน้าบอร์ดจัดการ <ArrowRight size={12} strokeWidth={3} />
                        </div>
                    </div>

                </div>
            </div>

            {/* ส่วนล่างสุด: เครดิตแพลตฟอร์ม */}
            <div className="max-w-6xl w-full mx-auto text-center text-[10px] text-gray-600 border-t border-white/5 pt-4">
                &copy; {new Date().getFullYear()} NIIVAA Online Smart Media Platform. All Rights Reserved.
            </div>
            
        </div>
    );
}