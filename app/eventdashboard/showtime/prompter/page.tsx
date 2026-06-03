'use client';

import React, { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase'; // เตรียมไว้สำหรับเชื่อม DB จริง

export default function ShowtimePrompter() {
  // 1. ตัวแปรสถานะสคริปต์และ VIP
  const [activeCue, setActiveCue] = useState(0); // ติดตามว่ากำลังอ่านคิวไหนอยู่
  const [showTech, setShowTech] = useState<Record<number, boolean>>({}); // สลับเปิด/ปิด สคริปต์เทคนิครายข้อ
  
  // 2. ตัวแปรระบบสื่อสาร (Intercom System)
  const [smMessage, setSmMessage] = useState<{ text: string, type: 'info' | 'urgent' } | null>({
    text: "ท่านประธานกำลังเดินเข้าฮอลล์ ยืดเวลาสคริปต์นี้ออกไปอีก 2 นาที!",
    type: 'urgent'
  }); // จำลองข้อความเด้งจาก SM
  
  const [sosStatus, setSosStatus] = useState<string | null>(null);

  // 📝 ข้อมูลจำลอง (Mockup Data) รอเชื่อม Supabase
  const scripts = [
    { id: 1, time: "09:00", title: "กล่าวต้อนรับ", main_script: "ขอต้อนรับท่านผู้มีเกียรติทุกท่าน เข้าสู่งานสัมมนาประจำปีอย่างเป็นทางการครับ...", tech_script: "MC เดินมาจุด Center Stage / ไฟ Follow ส่อง" },
    { id: 2, time: "09:15", title: "เชิญประธาน", main_script: "ในลำดับนี้ ขอขอบพระคุณท่านประธานเป็นอย่างสูง และขอเรียนเชิญท่านบนเวทีครับ", tech_script: "เปิดซาวด์มหาฤกษ์ / สไลด์ขึ้นโลโก้ผู้จัด" },
    { id: 3, time: "09:30", title: "มอบรางวัล", main_script: "ขอเชิญทุกท่านพบกับช่วงเวลาสำคัญ การประกาศผลรางวัลเกียรติยศ...", tech_script: "สแตนบายถาดรางวัล 5 รางวัลด้านขวาเวที" }
  ];

  const vips = [
    { id: 1, fullname: "นพ. สมเกียรติ ใจดี", position: "ผู้อำนวยการระดับสูง", status: "arrived" },
    { id: 2, fullname: "ดร. สมศรี รักเรียน", position: "ประธานกรรมการบริหาร", status: "arrived" }
  ];

  // ฟังก์ชันสลับการแสดงผลสคริปต์เทคนิค
  const toggleTechScript = (index: number) => {
    setShowTech(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // ฟังก์ชันส่งสัญญาณ SOS
  const sendSos = (message: string) => {
    setSosStatus(`กำลังส่ง: ${message}`);
    // TODO: ยิงเข้า Supabase Realtime
    setTimeout(() => setSosStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col selection:bg-purple-900 selection:text-white">
      
      {/* 🚨 1. TOP BANNER: ระบบข้อความฉุกเฉินจาก SM (SM Intercom Receiver) */}
      {smMessage && (
        <div className={`w-full py-4 px-6 flex justify-between items-center z-50 shadow-2xl transition-all animate-in slide-in-from-top-4 ${smMessage.type === 'urgent' ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}>
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-white/80 uppercase tracking-widest">ข้อความด่วนจากผู้กำกับเวที (Stage Manager)</p>
              <p className="text-2xl font-black text-white leading-tight">{smMessage.text}</p>
            </div>
          </div>
          <button 
            onClick={() => setSmMessage(null)}
            className="px-8 py-4 bg-white text-black font-black text-xl rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            ✅ รับทราบ / ปฏิบัติ
          </button>
        </div>
      )}

      {/* 🛠️ 2. CONTROL HEADER: ปุ่ม SOS และ นาฬิกา */}
      <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex gap-3">
          <span className="text-zinc-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
            MC Prompter Mode
          </span>
        </div>

        {/* ปุ่ม SOS สื่อสารกลับไปหา SM */}
        <div className="flex gap-2">
          <span className="text-zinc-500 mr-2 flex items-center text-sm font-bold">📡 ขอความช่วยเหลือ:</span>
          <button onClick={() => sendSos('ขอโพยชื่อประธานใหม่ด่วน!')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-bold text-amber-400 transition-colors">
            📝 ขอโพยชื่อใหม่
          </button>
          <button onClick={() => sendSos('มีปัญหาติดขัด ยืดเวลาคิวนี้ที!')} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm font-bold text-blue-400 transition-colors">
            ⏳ ขอยืดเวลาคิวนี้
          </button>
          {sosStatus && <span className="text-emerald-400 animate-pulse ml-2 font-bold flex items-center">{sosStatus}</span>}
        </div>
      </div>

      {/* 📜 3. MAIN CONTENT: Split Screen (สคริปต์ 70% | VIP 30%) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 📖 ฝั่งซ้าย: โพยสคริปต์หลัก */}
        <div className="flex-[7] p-8 overflow-y-auto scrollbar-hide space-y-8 pb-32">
          {scripts.map((script, idx) => {
            const isActive = activeCue === idx;
            const isPast = idx < activeCue;

            return (
              <div 
                key={script.id} 
                onClick={() => setActiveCue(idx)}
                className={`p-6 rounded-3xl transition-all duration-300 border-2 cursor-pointer
                  ${isActive ? 'bg-zinc-900 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
                  : isPast ? 'bg-black border-zinc-900 opacity-40' 
                  : 'bg-black border-zinc-800 opacity-80 hover:border-zinc-600'}`}
              >
                {/* หัวคิว */}
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-4">
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-black ${isActive ? 'text-purple-400' : 'text-zinc-600'}`}>Q{idx + 1}</span>
                    <span className={`text-xl font-bold ${isActive ? 'text-white' : 'text-zinc-500'}`}>{script.title}</span>
                  </div>
                  <span className="text-xl font-mono text-cyan-500 bg-cyan-950/30 px-3 py-1 rounded-lg border border-cyan-500/20">{script.time}</span>
                </div>

                {/* สคริปต์หลัก (ตัวยักษ์ อ่านง่าย) */}
                <p className={`text-3xl leading-relaxed tracking-wide font-medium transition-colors
                  ${isActive ? 'text-white' : isPast ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {script.main_script}
                </p>

                {/* แผงปุ่มเปิด/ปิด สคริปต์เทคนิค */}
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleTechScript(idx); }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all
                      ${showTech[idx] ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}
                  >
                    💡 {showTech[idx] ? 'ซ่อนโพยเทคนิค' : 'ดูโพยเทคนิค (Sub Script)'}
                  </button>
                </div>

                {/* สคริปต์เทคนิค (ตัวเล็กกว่า สีต่างออกไป พื้นหลังเด่นชัด) */}
                {showTech[idx] && (
                  <div className="mt-4 p-4 bg-zinc-800/80 border border-zinc-600 rounded-2xl animate-in slide-in-from-top-2">
                    <p className="text-amber-400 font-bold text-sm mb-1 uppercase tracking-widest">⚠️ Note for MC / Technical Cue:</p>
                    <p className="text-xl text-cyan-300 font-medium leading-relaxed">
                      {script.tech_script}
                    </p>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* 👤 ฝั่งขวา: รายชื่อ VIP (Focus Queue) */}
        <div className="flex-[3] bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col">
          <h3 className="text-xl font-black text-amber-500 mb-6 uppercase tracking-wider flex items-center gap-2">
            📢 คิวประกาศชื่อ VIP
          </h3>
          
          <div className="space-y-4 flex-1 overflow-y-auto scrollbar-hide">
            {vips.map((vip, vIdx) => (
              <div key={vip.id} className="p-5 bg-zinc-900 border border-zinc-700 rounded-2xl">
                <div className="flex items-start gap-4">
                  <span className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-black text-lg shrink-0">
                    {vIdx + 1}
                  </span>
                  <div>
                    <p className="text-2xl font-black text-white leading-tight mb-2">{vip.fullname}</p>
                    <p className="text-base text-zinc-400 font-medium">💼 {vip.position}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}