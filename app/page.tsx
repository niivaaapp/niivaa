"use client";

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Music, LayoutGrid, LogOut, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';

export default function LaunchpadPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/'); // ออกระบบแล้วดีดกลับหน้าแรกสุด
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white flex flex-col justify-between p-6 select-none">

      {/* ส่วนบน: แถบหัวเรื่องบอร์ด (ปรับมาใช้รูปภาพ Logo) */}
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

      {/* ส่วนกลาง: ศูนย์รวมการเข้าถึงบริการหลัก (Launchpad Hub) */}
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

        {/* 📦 แผงปุ่มทางเลือกบริการ (ขยาย grid เป็น 3 คอลัมน์) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-4">

          {/* 🟢 การ์ดที่ 1: ระบบจัดการสื่ออัจฉริยะ (คงไว้ตามเดิม) */}
          <div
            onClick={() => router.push('/playlistdashboard')}
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
            <div className="flex items-center gap-1.5 text-[11px] font-black text-cyan-400 group-hover:translate-x-1 transition-transform mt-auto">
              เปิดใช้งานสตูดิโอ <ArrowRight size={12} strokeWidth={3} />
            </div>
          </div>

          {/* 🟣 การ์ดที่ 2: ระบบบริหารงานอีเวนต์ (ปรับลิงก์ไป /eventhub และเปลี่ยนคำอธิบาย) */}
          <div
            onClick={() => router.push('/eventhub')}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 hover:from-purple-500/20 hover:to-indigo-500/10 border border-white/5 hover:border-purple-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-purple-500/5"
          >
            <div className="space-y-2">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 w-fit group-hover:bg-purple-500 group-hover:text-black transition-all">
                <LayoutGrid size={20} />
              </div>
              <h2 className="text-base font-black text-white group-hover:text-purple-300 transition-colors">
                NIIVAA Smart Event
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                ศูนย์รวมระบบบริหารจัดงานดิจิทัลอัจฉริยะ สำหรับ หน่วยงาน องค์กร  ORGANIZER ผู้ให้บริการจัดงานเลี้ยง ร้านอาหาร เจ้าภาพจัดงาน และพิธีกร ทุกระดับ
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-purple-400 group-hover:translate-x-1 transition-transform mt-auto">
              เข้าสู่หน้าสารบัญ <ArrowRight size={12} strokeWidth={3} />
            </div>
          </div>

          {/* 🟢 การ์ดที่ 3: ระบบบริหารสถานศึกษา (ใหม่) */}
          <div
            onClick={() => router.push('/schooladmin')}
            className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 hover:from-emerald-500/20 hover:to-teal-500/10 border border-white/5 hover:border-emerald-400 rounded-3xl cursor-pointer flex flex-col justify-between items-start text-left gap-6 group hover:scale-[1.03] transition-all duration-300 shadow-lg shadow-emerald-500/5"
          >
            <div className="space-y-2">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 w-fit group-hover:bg-emerald-500 group-hover:text-black transition-all">
                <GraduationCap size={20} />
              </div>
              <h2 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                ระบบบริหารสถานศึกษา
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                ระบบบริหารงานแผนงาน บริหารงานพัสดุ การเงินและบัญชี บริหารทั่วไป บริหารวิชาการ และบริหารงานบุคคล แบบอัตโนมัติสมบูรณ์แบบ (Full Automation)
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-400 group-hover:translate-x-1 transition-transform mt-auto">
              เข้าสู่ระบบบริหาร <ArrowRight size={12} strokeWidth={3} />
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