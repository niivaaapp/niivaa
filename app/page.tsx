"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
// นำเข้าไอคอน BookOpen สำหรับระบบสอบ
import { Music, LayoutGrid, LogOut, ArrowRight, Sparkles, GraduationCap, BookOpen } from 'lucide-react';

export default function LaunchpadPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); 
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white flex flex-col justify-between p-6 select-none">

      {/* ส่วนบน: แถบหัวเรื่องบอร์ด */}
      <div className="max-w-6xl w-full mx-auto flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <img
            src="/niivaalogo.png"
            alt="NIIVAA Logo"
            className="h-8 md:h-10 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]"
          />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-xl text-xs font-bold border border-white/5 hover:border-red-500/20 transition-all"
        >
          <LogOut size={12} /> ออกจากระบบ
        </button>
      </div>

      {/* ส่วนกลาง: ศูนย์รวมการเข้าถึงบริการหลัก */}
      <div className="max-w-6xl w-full mx-auto text-center space-y-10 my-auto py-12">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-[10px] font-black uppercase tracking-widest mx-auto animate-pulse">
            <Sparkles size={10} /> แพลตฟอร์มบริหารจัดการแบบครบวงจร
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            ยินดีต้อนรับสู่ <span className="bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">NIIVAA Workspace</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-400 max-w-md mx-auto">
            กรุณาเลือกบริการหรือโมดูลการทำงานที่ท่านต้องการเข้าใช้งานด้านล่างนี้
          </p>
        </div>

        {/* 📦 แผงปุ่มทางเลือกบริการ (4 คอลัมน์สำหรับจอใหญ่ และ 2 คอลัมน์สำหรับแท็บเล็ต) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto pt-4">

          {/* 🟢 การ์ดที่ 1: NiiVaa SmartMedia&Karaoke */}
          <div
            onClick={() => router.push('/smart-media/pricing')}
            className="p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 hover:from-cyan-500/20 hover:to-blue-500/10 border border-cyan-500/20 hover:border-cyan-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-cyan-500/5"
          >
            <div className="space-y-2">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 w-fit group-hover:bg-cyan-500 group-hover:text-black transition-all">
                <Music size={20} />
              </div>
              <h2 className="text-base font-black text-white group-hover:text-cyan-300 transition-colors">
                NiiVaa SmartMedia&Karaoke
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                ระบบจัดการคลังสื่อมัลติมีเดีย ดนตรี และคาราโอเกะ พร้อมระบบแผงควบคุมการฉายขึ้นจอภาพเวที (Matrix Control) แบบครบวงจร
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-cyan-400 group-hover:translate-x-1 transition-transform mt-auto">
              เปิดใช้งานสตูดิโอ <ArrowRight size={12} strokeWidth={3} />
            </div>
          </div>

          {/* 🟣 การ์ดที่ 2: NiiVaa SmartEvent */}
          <div
            onClick={() => router.push('/eventhub')}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 hover:from-purple-500/20 hover:to-indigo-500/10 border border-white/5 hover:border-purple-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-purple-500/5"
          >
            <div className="space-y-2">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 w-fit group-hover:bg-purple-500 group-hover:text-black transition-all">
                <LayoutGrid size={20} />
              </div>
              <h2 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                NiiVaa SmartEvent
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                ศูนย์รวมระบบบริหารจัดงานดิจิทัลอัจฉริยะ สำหรับองค์กร ORGANIZER และพิธีกรทุกระดับ
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-purple-400 group-hover:translate-x-1 transition-transform mt-auto">
              ดูแพ็กเกจและเข้าใช้งาน <ArrowRight size={12} strokeWidth={3} />
            </div>
          </div>

          {/* 🟢 การ์ดที่ 3: ระบบบริหารสถานศึกษา (Coming Soon) */}
          <div
            className="p-6 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-slate-800 rounded-3xl cursor-not-allowed flex flex-col justify-between items-start text-left gap-6 group relative overflow-hidden opacity-80"
          >
            {/* 🌟 ป้ายกำกับ Coming Soon */}
            <div className="absolute top-5 right-5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              เร็วๆ นี้
            </div>

            <div className="space-y-2 opacity-70 grayscale-[20%]">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 w-fit">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-base font-black text-white">
                ระบบบริหารสถานศึกษา
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                ระบบบริหารงานแผนงาน พัสดุ การเงิน บริหารวิชาการ และงานบุคคล แบบอัตโนมัติสมบูรณ์แบบ
              </p>
            </div>
            
            {/* 🌟 เปลี่ยนข้อความ Call to Action ด้านล่าง */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mt-auto">
              กำลังอยู่ในระหว่างการพัฒนา...
            </div>
          </div>

          {/* 🟠 การ์ดที่ 4: NiiVaa SmartExam */}
          <div
            onClick={() => router.push('/smart-exam-dashboard')}
            className="p-6 bg-gradient-to-br from-orange-500/10 to-amber-500/5 hover:from-orange-500/20 hover:to-amber-500/10 border border-white/5 hover:border-orange-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-orange-500/5"
          >
            <div className="space-y-2">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400 w-fit group-hover:bg-orange-500 group-hover:text-black transition-all">
                <BookOpen size={20} />
              </div>
              <h2 className="text-base font-black text-white group-hover:text-orange-300 transition-colors">
                NiiVaa SmartExam
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                แพลตฟอร์ม e-Exam อัจฉริยะ สร้างข้อสอบอัตโนมัติด้วย AI พร้อมระบบจัดการสอบและวิเคราะห์ผล
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-orange-400 group-hover:translate-x-1 transition-transform mt-auto">
              เข้าสู่ระบบสอบ <ArrowRight size={12} strokeWidth={3} />
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