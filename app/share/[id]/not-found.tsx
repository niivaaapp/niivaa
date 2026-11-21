'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, UserPlus, Home, Headphones, Sparkles } from 'lucide-react';

export default function ShareNotFound() {
  const router = useRouter();

  // ดักจับ LINE In-App Browser เพื่อกัน Error 403 ตอนล็อกอิน Google
  const handleGoToSignup = () => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (/Line/i.test(ua)) {
      window.location.href = `${window.location.origin}/login?openExternalBrowser=1`;
      return;
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a1128] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#0a1128]/95 border-b border-cyan-500/20 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Headphones size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-cyan-400 tracking-wide">
                NiiVaa SmartMedia
              </h1>
              <p className="text-[10px] text-slate-400">
                SmartMedia & Karaoke Platform
              </p>
            </div>
          </Link>

          <button
            onClick={handleGoToSignup}
            className="px-3.5 py-2 bg-[#2d728f] hover:bg-[#3886a6] text-[#f4f1de] font-bold text-xs rounded-xl border border-[#f4f1de]/25 transition-all flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            <span>สมัครฟรี</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gradient-to-b from-[#111c3d] to-[#0a1128] border border-cyan-500/30 rounded-3xl p-7 sm:p-9 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <Lock size={30} className="text-amber-400" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-bold mb-3">
            ไม่สามารถเข้าถึงชุดสื่อนี้ได้
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white mb-2.5">
            ชุดสื่อนี้ถูกปิดการแชร์แล้ว
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
            ผู้จัดทำอาจเปลี่ยนสถานะเป็นส่วนตัว ลบชุดสื่อ หรือลิงก์อาจไม่ถูกต้อง
            <br />
            แต่คุณสามารถสร้างอัลบั้มเพลง คาราโอเกะ หรือชุดสื่อการสอนของคุณเองได้ฟรี!
          </p>

          {/* กล่องแนะนำสั้นๆ */}
          <div className="bg-black/30 border border-cyan-500/20 rounded-2xl p-3.5 mb-6 text-left flex items-start gap-2.5">
            <Sparkles size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              จัดคิววิดีโอจาก YouTube ไม่มีโฆษณาคั่น ตัดช่วงต้น-กลาง-ท้ายคลิป (S/M/E) พร้อมระบบ Auto DJ และแชร์ลิงก์ให้เพื่อนได้ทันที
            </p>
          </div>

          {/* ปุ่ม CTA */}
          <div className="space-y-2.5">
            <button
              onClick={handleGoToSignup}
              className="w-full py-3.5 bg-[#2d728f] hover:bg-[#3886a6] text-[#f4f1de] font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              <span>สมัครสมาชิกฟรี สร้างอัลบั้มของคุณเอง</span>
            </button>

            <Link
              href="/"
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Home size={15} />
              <span>กลับหน้าหลัก NiiVaa</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}