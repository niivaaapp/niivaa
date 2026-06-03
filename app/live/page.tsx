'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LiveGuestApp() {
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !message.trim()) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('live_messages')
        .insert([{ nickname: nickname.trim(), message: message.trim() }]);

      if (error) throw error;

      setIsSuccess(true);
      setMessage(''); 
      setTimeout(() => setIsSuccess(false), 3000);

    } catch (error: any) {
      alert(`❌ ส่งข้อมูลไม่สำเร็จ: ${error.message}\n(กรุณาเช็คการตั้งค่า RLS ใน Supabase)`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center selection:bg-[#0B0C60] selection:text-white">
      <div className="w-full max-w-md flex flex-col min-h-screen relative overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#0B0C60]/40 to-transparent pointer-events-none -z-10"></div>
        <div className="absolute top-40 -left-32 w-80 h-80 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

        {/* 🌟 HEADER: โลโก้แบรนด์ภาพจริง */}
        <div className="pt-12 pb-6 px-6 text-center z-10 flex flex-col items-center">
          {/* 💡 เรียกใช้ภาพโลโก้จากโฟลเดอร์ public */}
          <img 
            src="/niivaa-logo.png" 
            alt="NiiVaa SmartMedia" 
            className="h-14 md:h-16 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform"
            onError={(e) => {
              // กรณีหาไฟล์รูปไม่เจอ จะแสดงข้อความสำรอง
              (e.target as HTMLImageElement).style.display = 'none';
              document.getElementById('fallback-logo')!.style.display = 'block';
            }}
          />
          {/* โลโก้สำรอง (ถ้ายังไม่ได้เอาภาพไปใส่ในโฟลเดอร์ public) */}
          <div id="fallback-logo" className="hidden text-3xl font-black text-white mb-6">
            NiiVaa <span className="text-[#0B0C60] bg-white px-2 py-0.5 rounded">SmartMedia</span>
          </div>

          <h1 className="text-2xl font-black text-white drop-shadow-lg">ร่วมสนุกตอบคำถาม Live!</h1>
          <p className="text-zinc-400 text-sm mt-2">ส่งคำตอบของคุณเพื่อลุ้นขึ้นจอภาพหลักของงาน</p>
        </div>

        {/* 📝 FORM: ฟอร์มกรอกข้อมูล */}
        <div className="flex-1 px-6 pb-12 z-10 flex flex-col justify-center">
          {isSuccess ? (
            <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-3xl p-8 text-center animate-in zoom-in-95 fade-in duration-500 backdrop-blur-md">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-bounce">🚀</div>
              <h2 className="text-2xl font-black text-emerald-400 mb-2">ส่งคำตอบสำเร็จ!</h2>
              <p className="text-emerald-100/70 text-sm">รอลุ้นผลคำตอบของคุณบนจอโปรเจกต์เตอร์ได้เลยครับ!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300 ml-2">👤 ชื่อเล่นของคุณ (แสดงบนจอ)</label>
                <input type="text" required value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="เช่น พี่บอส, น้องสมชาย" className="w-full bg-zinc-900/80 border-2 border-zinc-800 focus:border-cyan-500 text-white px-5 py-4 rounded-2xl text-lg font-bold outline-none transition-all placeholder:text-zinc-600 placeholder:font-normal" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-zinc-300 ml-2">💬 พิมพ์คำตอบที่นี่</label>
                <textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="พิมพ์คำตอบของคุณ..." rows={3} className="w-full bg-zinc-900/80 border-2 border-zinc-800 focus:border-cyan-500 text-white px-5 py-4 rounded-2xl text-lg font-bold outline-none transition-all placeholder:text-zinc-600 placeholder:font-normal resize-none" />
              </div>

              {/* 🌟 ปุ่มส่งข้อมูล (อัปเดตสีตามบรีฟ: พื้น #0B0C60 ขอบขาว) */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-5 rounded-2xl font-black text-xl tracking-wide transition-all transform active:scale-95 shadow-xl flex justify-center items-center gap-3 border-2 border-white
                  ${isSubmitting 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-600' 
                    : 'bg-[#0B0C60] hover:bg-[#0B0C60]/80 text-white shadow-[0_10px_30px_rgba(11,12,96,0.5)]'
                  }`}
              >
                {isSubmitting ? (
                  <><span className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></span> กำลังส่ง...</>
                ) : '🎯 ส่งคำตอบเลย!'}
              </button>
            </form>
          )}
        </div>
        
        <div className="py-6 text-center z-10">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Powered by NiiVaa SmartEvent</p>
        </div>
      </div>
    </div>
  );
}