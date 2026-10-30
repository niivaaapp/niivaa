"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Send, Heart, User, MessageSquare, Sparkles, Loader2 } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GuestWishForm() {
  const [slug, setSlug] = useState("wedding-test");
  const [screenId, setScreenId] = useState("");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // 📡 ระบบแกะรอย Slug ชื่องานจาก URL บนมือถือแขกอัตโนมัติ
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathSegments = window.location.pathname.split("/");
      const urlSlug = pathSegments[pathSegments.length - 1];
      if (urlSlug && urlSlug.trim() !== "") {
        setSlug(urlSlug);
      }
    }
  }, []);

  // 📡 นำ Slug ไปดึงรหัส UUID ของหน้าจอหลักเพื่อเชื่อมท่อส่งข้อความ
  useEffect(() => {
    if (!slug) return;
    async function fetchScreenCore() {
      const { data } = await supabase
        .from("social_screens")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (data?.id) {
        setScreenId(data.id);
      }
    }
    fetchScreenCore();
  }, [slug]);

  // 🚀 ฟังก์ชันยิงข้อความอวยพรข้ามโลก เข้าสายพานวิ่งบนจอหลักทันที (Full Automation)
  const handleSubmitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screenId) return setStatusMsg("❌ ระบบกำลังเชื่อมต่อสถานี กรุณาลองใหม่อีกครั้ง");
    if (!author.trim()) return setStatusMsg("❌ กรุณาระบุชื่อผู้ส่งคำอวยพร");
    if (!text.trim()) return setStatusMsg("❌ กรุณาพิมพ์ข้อความอวยพร");

    setSending(true);
    setStatusMsg("กำลังส่งคำอวยพรขึ้นสู่จอใหญ่...");

    try {
      // ยิงข้อมูลเข้าตาราง social_messages โดยตั้งค่า status เป็น approved ทันทีตามแผนงานจริง
      const { error } = await supabase.from("social_messages").insert([
        {
          screen_id: screenId,
          author: author.trim(),
          text: text.trim(),
          status: "approved" 
        }
      ]);

      if (error) throw error;

      setText(""); // ล้างกล่องข้อความเมื่อส่งสำเร็จ
      setStatusMsg("🎉 ส่งคำอวยพรสำเร็จ! ข้อความกำลังวิ่งขึ้นจอเวทีแล้วค่ะ");
    } catch (err: any) {
      console.error(err);
      setStatusMsg("❌ เกิดข้อผิดพลาด: " + (err.message || "เครือข่ายขัดข้อง"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b13] text-slate-200 font-sans flex flex-col justify-between p-4 relative overflow-hidden select-none">
      
      {/* เอฟเฟกต์แสงนีออนละมุนหลังการ์ดมือถือ */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[40%] bg-blue-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* ส่วนหัวแสดงชื่อแอปและชื่องาน */}
      <header className="text-center pt-6 pb-4 space-y-1 z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-black tracking-widest text-cyan-400 uppercase animate-pulse">
          <Sparkles size={12} />
          <span>NiiVaa Live Wish Station</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">ร่วมส่งคำอวยพรสดในพิธี</h1>
        <p className="text-xs text-slate-400 font-light font-mono">STATION ID: {slug.toUpperCase()}</p>
      </header>

      {/* บล็อกฟอร์มรับข้อมูล (Main Interaction Form) */}
      <main className="w-full max-w-md mx-auto bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-xl shadow-2xl z-10 space-y-6">
        <form onSubmit={handleSubmitWish} className="space-y-5">
          
          {/* ช่องกรอกชื่อผู้ส่ง */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <User size={13} className="text-cyan-400" />
              <span>ชื่อของคุณ / จากหน่วยงาน</span>
            </label>
            <input 
              type="text" 
              maxLength={40}
              placeholder="เช่น นายกสมาคมกีฬาฯ / ครอบครัวสุรินทร์"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 focus:border-cyan-500 px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all placeholder:text-slate-600 font-medium"
            />
          </div>

          {/* ช่องกรอกคำอวยพร */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-cyan-400" />
              <span>พิมพ์คำอวยพรมงคลของคุณ</span>
            </label>
            <textarea 
              rows={4}
              maxLength={120}
              placeholder="พิมพ์ข้อความอวยพรส่งความสุขขึ้นสู่จอหลักที่นี่..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-slate-950/60 border border-white/10 focus:border-blue-500 px-4 py-3 rounded-xl text-sm text-white focus:outline-none transition-all placeholder:text-slate-600 leading-relaxed font-medium resize-none"
            />
            <div className="flex justify-end text-[10px] text-slate-600 font-mono font-bold">
              {text.length}/120 ตัวอักษร
            </div>
          </div>

          {/* ปุ่มส่งคำอวยพรระดับพรีเมียม */}
          <button 
            type="submit" 
            disabled={sending}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-slate-950 font-black text-sm rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-cyan-500/10"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin text-slate-950" />
                <span>กำลังยิงสัญญาณขึ้นเวที...</span>
              </>
            ) : (
              <>
                <Send size={15} className="text-slate-950 fill-current" />
                <span>ส่งข้อความขึ้นจอใหญ่สด ๆ</span>
              </>
            )}
          </button>

        </form>

        {/* บล็อกแสดงข้อความสถานะแจ้งเตือนแขก */}
        {statusMsg && (
          <div className={`p-3 rounded-xl text-center text-xs font-bold border ${statusMsg.startsWith("🎉") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-shake"}`}>
            {statusMsg}
          </div>
        )}
      </main>

      {/* ส่วนท้ายเครดิตดีไซน์เรียบหรู */}
      <footer className="text-center pt-4 pb-2 text-[10px] text-slate-600 font-medium tracking-wide flex items-center justify-center gap-1 z-10">
        <span>Powered by NIIVAA SMARTEVENT</span>
        <Heart size={10} className="text-rose-600 fill-current" />
      </footer>

    </div>
  );
}