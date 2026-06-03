"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Send, User, MessageSquare, CheckCircle2, AlertCircle, Sparkles, ShieldAlert, Monitor } from "lucide-react";

export default function NiivaaJoinPage({ params }: { params: any }) {
  const { slug } = React.use(params) as any;

  // --- [STATES] ---
  const [screen, setScreen] = useState<any>(null);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!slug) return;
    const fetchScreenInfo = async () => {
      try {
        setLoading(true);
        const { data } = await supabase.from("social_screens").select("*").eq("slug", slug).maybeSingle();
        if (data) setScreen(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchScreenInfo();
  }, [slug]);

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screen?.id || !text.trim()) return;

    setSending(true);
    setStatus('idle');

    try {
      // หักดิบบันทึกเป็น approved ทันทีตั้งแต่มือถือต้นทาง ข้ามหน้าแอดมินตามแผนใหม่
      const { error } = await supabase
        .from("social_messages")
        .insert([{ screen_id: screen.id, text: text.trim(), author: author.trim() || "ผู้ร่วมงาน", status: "approved" }]);

      if (error) throw error;
      setStatus('success');
      setText(""); 
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="bg-[#000a12] h-screen w-full flex items-center justify-center text-green-400 font-bold font-prompt">LOADING...</div>;
  if (!screen) return <div className="bg-[#000a12] h-screen w-full flex items-center justify-center text-rose-400 font-bold p-8 text-center font-prompt">❌ ไม่พบข้อมูลหน้าจอ</div>;

  return (
    <main className="min-h-screen bg-[#000a12] text-slate-100 flex flex-col justify-between font-prompt p-4 relative overflow-hidden">
      
      {/* HEADER */}
      <header className="text-center pt-4 z-10">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-2">
          <Sparkles size={12} className="text-cyan-400" />
          <span className="text-[9px] font-black tracking-[0.2em] text-cyan-400 uppercase">NiiVaa Connect</span>
        </div>
        <h1 className="text-xl font-black text-white">{screen.screen_name}</h1>
      </header>

      {/* FORM CONTAINER */}
      <div className="w-full max-w-md mx-auto z-10 my-auto py-4">
        <form onSubmit={handleSubmitMessage} className="space-y-4 bg-[#001424]/80 border border-white/5 p-5 rounded-[2rem] shadow-2xl">
          
          {/* 🚨 [ป้ายเตือนกฎหมาย PDPA และ ความสุภาพตามคำสั่งพี่] */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] flex gap-2.5 items-start leading-relaxed">
            <ShieldAlert size={16} className="shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">⚠️ ข้อควรปฏิบัติร่วมกันในงาน</p>
              <p className="opacity-80 mt-0.5">โปรดใช้คำสุภาพในการส่งข้อความ และปฏิบัติตามกฎหมาย PDPA (ห้ามพาดพิงหรือละเมิดสิทธิ์ส่วนบุคคลของผู้อื่น)</p>
            </div>
          </div>

          {/* INPUT NAME */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-cyan-400/70 uppercase pl-1 flex items-center gap-1.5"><User size={10}/> ชื่อของคุณ</label>
            <input type="text" maxLength={20} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="กรอกชื่อเล่น..." className="w-full bg-black/40 border border-white/5 outline-none p-3.5 rounded-xl font-bold text-white text-sm" />
          </div>

          {/* INPUT TEXT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-cyan-400/70 uppercase pl-1 flex items-center gap-1.5"><MessageSquare size={10}/> ข้อความอวยพร</label>
            <textarea required rows={3} maxLength={80} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์คำอวยพรวิ่งขึ้นหน้าจอที่นี่..." className="w-full bg-black/40 border border-white/5 outline-none p-3.5 rounded-xl text-white text-sm resize-none" />
          </div>

          {/* ALERTS */}
          <AnimatePresence mode="wait">
            {status === 'success' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={14} /> <span>ส่งสำเร็จ! โปรดกดรีเฟรชที่หน้าจอหลักเพื่อดูข้อความ 🎉</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SUBMIT BUTTON */}
          <button type="submit" disabled={sending || !text.trim()} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[#000a12] font-black text-xs tracking-wider uppercase shadow-lg shadow-cyan-500/20">
            {sending ? "กำลังยิงข้อความ..." : "ส่งข้อความขึ้นจอทันที"}
          </button>
        </form>

        {/* 📺 [ปุ่มทางอ้อม: คลิกเพื่อสลับไปหน้าจอดีสเพลย์] */}
        <div className="text-center mt-4">
          <button type="button" onClick={() => window.location.href = `/social-wall/display/${slug}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors text-xs font-bold bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <Monitor size={12} /> สลับไปดูหน้าจอแสดงผล (Display)
          </button>
        </div>
      </div>

      <footer className="text-center text-[9px] text-slate-700 font-bold uppercase">NiiVaa Smart Studio</footer>
    </main>
  );
}