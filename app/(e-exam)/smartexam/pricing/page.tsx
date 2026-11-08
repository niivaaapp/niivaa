"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, BrainCircuit, Sparkles, ArrowLeft } from 'lucide-react';
// ลบ import { redirect } ออกจากไฟล์ Client Component หากไม่ได้ใช้งานจริงในฝั่ง Client
// import { redirect } from 'next/navigation';

export default function SmartExamPricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const APP_ID = 'c3333333-3333-3333-3333-333333333333'; 

  // ฟังก์ชันช่วยเหลือสำหรับแสดงรายการฟีเจอร์
  const FeatureItem = ({ included, text, highlight = false }: { included: boolean, text: string, highlight?: boolean }) => (
    <li className="flex items-start gap-3 py-2">
      {included ? (
        <CheckCircle2 className={`w-5 h-5 shrink-0 mt-0.5 ${highlight ? 'text-fuchsia-400' : 'text-purple-400'}`} />
      ) : (
        <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-slate-600" />
      )}
      <span className={`text-sm leading-relaxed ${included ? (highlight ? 'text-white font-bold' : 'text-slate-300') : 'text-slate-500 line-through'}`}>
        {text}
      </span>
    </li>
  );

  return (
    <div className="min-h-screen bg-[#0a1128] font-sans selection:bg-purple-500/30 pb-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex justify-center mb-6">
            <Link href="/eventhub" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
            </Link>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-semibold mb-6">
            <BrainCircuit className="w-4 h-4" />
            NiiVaa SmartExam
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400 mb-6">
            ยกระดับการสอบด้วย AI อัจฉริยะ
          </h1>
          <p className="text-lg text-slate-400">
            เลือกแพ็กเกจที่เหมาะสมกับการจัดการเรียนการสอนของคุณ <br className="hidden md:block"/> 
            พร้อมระบบตัดเกรด ปพ.5 และเชื่อมต่อ SGS อัตโนมัติ
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">

          {/* ----------------- Freemium Plan ----------------- */}
          <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 flex flex-col hover:border-slate-600 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Freemium</h3>
            <p className="text-slate-400 text-sm mb-6 h-10">เริ่มต้นสร้างข้อสอบและทดสอบระบบได้ฟรี ไม่มีค่าใช้จ่าย</p>
            
            <div className="mb-8">
              <span className="text-4xl font-black text-white">ฟรี</span>
              <span className="text-slate-500 ml-2">ตลอดชีพ</span>
            </div>

            <Link 
              href="/signup?is_free=true&app=exam" 
              className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-center transition-colors mb-8 border border-slate-700"
            >
              เริ่มต้นใช้งานฟรี
            </Link>

            <ul className="space-y-1 flex-1">
              <FeatureItem included={true} text="สร้างข้อสอบด้วย AI วันละ 1 ครั้ง (สูงสุด 5 ข้อ)" />
              <FeatureItem included={true} text="แปลงไฟล์ PDF เป็นข้อสอบ วันละ 1 ชุด (จำกัด 10 ข้อ)" />
              <FeatureItem included={true} text="สแกนภาพเอกสาร/หนังสือ วันละ 1 ชุด (จำกัด 5 ข้อ)" />
              <FeatureItem included={true} text="ฝึกทดสอบและดูคะแนน วันละ 5 ครั้ง" />
              <FeatureItem included={true} text="ระบบบันทึกคะแนน ปพ.5 (10 คน/ห้อง สูงสุด 2 ห้อง)" />
              <FeatureItem included={false} text="ระบบจัดชุดข้อสอบ" />
              <FeatureItem included={false} text="ระบบวิเคราะห์ข้อสอบเชิงลึก" />
              <FeatureItem included={false} text="ส่งคะแนนเข้า SGS อัตโนมัติ" />
            </ul>
          </div>

          {/* ----------------- Premium Plan (Highlight) ----------------- */}
          <div className="bg-gradient-to-b from-purple-900/40 to-[#111827]/90 backdrop-blur-xl rounded-3xl border-2 border-purple-500 p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-lg">
              <Sparkles className="w-3.5 h-3.5" /> แพ็กเกจยอดนิยม
            </div>

            <h3 className="text-xl font-bold text-purple-300 mb-2">Premium (ช่วงแนะนำ)</h3>
            <p className="text-slate-300 text-sm mb-6 h-10">ปลดล็อกขีดจำกัดทั้งหมด เหมาะสำหรับโรงเรียนและติวเตอร์มืออาชีพ</p>
            
            <div className="mb-8 flex flex-col">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white">290 ฿</span>
                <span className="text-slate-400 mb-1">/ เดือน</span>
              </div>
              <span className="text-sm text-slate-500 line-through mt-1">ราคาปกติ 350 บาท/เดือน</span>
            </div>

            <Link 
              href="/signup?plan_id=e5555555-5555-5555-5555-555555555555&app=exam"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl font-bold text-center transition-all mb-8 shadow-lg shadow-purple-500/25 hover:-translate-y-0.5"
            >
              สมัคร Premium
            </Link>

            <ul className="space-y-1 flex-1">
              <FeatureItem included={true} text="สร้างข้อสอบคู่ขนานด้วย AI (เนื้อหา/ภาพ/หัวข้อ)" highlight />
              <FeatureItem included={true} text="AI วันละ 10 ครั้ง (สูงสุด 5 ข้อ/ครั้ง)" />
              <FeatureItem included={true} text="สร้างจาก PDF / ภาพ สูงสุด 120 ข้อ (วันละ 3 ชุด)" />
              <FeatureItem included={true} text="ฝึกทดสอบและดูผลคะแนน ไม่จำกัดจำนวนครั้ง" />
              <FeatureItem included={true} text="ระบบจัดชุดแบบทดสอบ / จัดสนามสอบออนไลน์" />
              <FeatureItem included={true} text="ประมวลผลและวิเคราะห์ข้อสอบ (Item Analysis)" />
              <FeatureItem included={true} text="บันทึก ปพ.5 รายคาบ (45 คน/ห้อง สูงสุด 15 ห้อง)" highlight />
              <FeatureItem included={true} text="เชื่อมต่อระบบนำคะแนนเข้า SGS อัตโนมัติ" highlight />
              <FeatureItem included={true} text="รองรับการสอบทุกประเภท (สอบเข้า, ราชการ ฯลฯ)" />
            </ul>
          </div>

          {/* ----------------- Pro Plan ----------------- */}
          <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl border border-slate-800 p-8 flex flex-col hover:border-purple-500/50 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Pro (ช่วงแนะนำ)</h3>
            <p className="text-slate-400 text-sm mb-6 h-10">สำหรับครูผู้สอนที่ต้องการฟีเจอร์เพิ่มขึ้นเพื่อจัดการห้องเรียน</p>
            
            <div className="mb-8 flex flex-col">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-white">150 ฿</span>
                <span className="text-slate-400 mb-1">/ เดือน</span>
              </div>
              <span className="text-sm text-slate-500 line-through mt-1">ราคาปกติ 200 บาท/เดือน</span>
            </div>

            <Link 
              href="/signup?plan_id=d4444444-4444-4444-4444-444444444444&app=exam"
              className="w-full py-3.5 px-4 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 rounded-xl font-bold text-center transition-colors mb-8"
            >
              สมัคร Pro
            </Link>

            <ul className="space-y-1 flex-1">
              <FeatureItem included={true} text="สร้างข้อสอบด้วย AI วันละ 5 ครั้ง (สูงสุด 5 ข้อ)" />
              <FeatureItem included={true} text="แปลงไฟล์ PDF วันละ 2 ชุด (สูงสุด 50 ข้อ)" />
              <FeatureItem included={true} text="สแกนภาพเอกสาร วันละ 2 ชุด (สูงสุด 50 ข้อ)" />
              <FeatureItem included={true} text="ฝึกทดสอบและดูคะแนน วันละ 10 ครั้ง" />
              <FeatureItem included={true} text="ระบบจัดชุดข้อสอบ" />
              <FeatureItem included={true} text="ระบบบันทึกคะแนน ปพ.5 (45 คน/ห้อง สูงสุด 8 ห้อง)" />
              <FeatureItem included={false} text="ระบบวิเคราะห์ข้อสอบเชิงลึก" />
              <FeatureItem included={false} text="ส่งคะแนนเข้า SGS อัตโนมัติ" />
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}