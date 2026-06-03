"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Play, Pause, FileText, Megaphone, Palette, Sliders, Layout, CheckCircle, UploadCloud, Loader2, Image as ImageIcon } from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function DynamicSubAdminDashboard() {
  // 🌟 ระบบอัจฉริยะขั้นสุด: ดึงชื่องาน (Slug) จากหน้าต่าง URL บราวเซอร์จริงให้อัตโนมัติ ไม่ต้องกรอกเองแล้วครับ
  const [slug, setSlug] = useState("wedding-test");
  const [screenId, setScreenId] = useState(""); 
  
  const [tickerInput, setTickerInput] = useState("");
  const [boxOpacity, setBoxOpacity] = useState(15);
  const [speed, setSpeed] = useState(80);
  const [currentTheme, setCurrentTheme] = useState("cyanCyber");
  const [bgType, setBgType] = useState("color");
  const [pdfUrl, setPdfUrl] = useState(""); 
  
  // ล็อกค่าเริ่มต้นชื่อกลุ่มภาพแกนหลัก ป้องกัน Not-Null Constraint บล็อกท่อส่งข้อมูล
  const [targetPoolKey, setTargetPoolKey] = useState("seaPool"); 
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const [agendaItems, setAgendaItems] = useState([
    { id: 1, time: "18:00", task: "ต้อนรับแขกผู้มีเกียรติ / เปิดเพลงบรรเลงคาราโอเกะสบายตา", done: false },
    { id: 2, time: "18:45", task: "ฉายวิดีโอ Presentation ประวัติเจ้าภาพและบ่าวสาว", done: false },
    { id: 3, time: "19:00", task: "พิธีกรกล่าวเปิดงานอย่างเป็นทางการ (Grand Entrance)", done: false },
    { id: 4, time: "19:30", task: "ประธานขึ้นกล่าวคำอวยพร / จุดเทียนมงคลฉลองวิวาห์", done: false },
    { id: 5, time: "20:15", task: "พิธีตัดเค้กแต่งงาน / โยนดอกไม้เสี่ยงทายดวงชะตา", done: false },
    { id: 6, time: "21:00", task: "After Party ปลดล็อกเครื่องยนต์เพลงแดนซ์สะเทือนเบส", done: false }
  ]);

  // 📡 ดักส่องคัดลอกค่า Slug ตัวท้ายสุดบนช่อง URL จริง (เช่น ส่องดึงคำว่า wedding-test มาใช้งานอัตโนมัติ)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathSegments = window.location.pathname.split("/");
      const urlSlug = pathSegments[pathSegments.length - 1];
      if (urlSlug && urlSlug.trim() !== "") {
        setSlug(urlSlug);
      }
    }
  }, []);

  // 📡 นำค่า Slug ที่แกะรอยได้ วิ่งไปสืบหาเลข UUID ประจำหน้าจอนั้น ๆ มาสแตนด์บายในเครื่องทันที
  useEffect(() => {
    if (!slug) return;
    async function autoFetchScreenId() {
      const { data } = await supabase
        .from("social_screens")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (data?.id) {
        setScreenId(data.id);
      }
    }
    autoFetchScreenId();
  }, [slug]);

  const pushVisualUpdate = async (payload: any) => {
    await supabase.from("social_screens").update(payload).eq("slug", slug);
  };

  const handleToggleAgenda = (id: number) => {
    setAgendaItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  // 🚀 ฟังก์ชันการันตีความปลอดภัย ล็อกเป้าหมาย String ป้องกัน Constraint ตารางพังถาวร
  const handleUploadMediaFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!screenId) {
        setUploadStatus("❌ ระบบกำลังดึงรหัสเชื่อมโยงหน้าจอ กรุณากดใหม่อีกครั้งใน 2 วินาที");
        return;
      }
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      setUploading(true);
      setUploadStatus("กำลังประมวลผลไฟล์สื่อ...");

      const isVideo = file.type.startsWith("video/");
      const mediaType = isVideo ? "video" : "image";
      const fileExt = file.name.split(".").pop();
      
      // ควบคุมค่ากลุ่มภาพปลายทางอย่างเข้มงวด ถ้าหน้าเว็บบราวเซอร์จำแคชว่าง ให้ยัด "seaPool" ลงไปแทนทันที
      const activePool = targetPoolKey && targetPoolKey.trim() !== "" ? targetPoolKey : "seaPool";
      const fileName = `${screenId}/${activePool}-${Date.now()}.${fileExt}`;

      setUploadStatus("กำลังส่งไฟล์เข้าคลัง Storage...");
      const { error: storageErr } = await supabase.storage
        .from("background-media")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (storageErr) throw storageErr;

      const { data: { publicUrl } } = supabase.storage
        .from("background-media")
        .getPublicUrl(fileName);

      setUploadStatus("กำลังบันทึกพิกัดลงฐานข้อมูลเรียลไทม์...");
      const { error: dbErr } = await supabase.from("screen_background_media").insert({
        screen_id: screenId,
        pool_key: activePool, 
        media_type: mediaType,
        media_url: publicUrl,
        media_name: file.name.split(".")[0]
      });

      if (dbErr) throw dbErr;
      setUploadStatus("🎉 สำเร็จเด็ดขาด! ภาพเด้งหมุนเวียนขึ้นหลังจอเรียบร้อยครับ");
    } catch (err: any) {
      console.error(err);
      setUploadStatus("❌ ติดขัด: " + (err.message || "กรุณาตรวจสอบโครงสร้างตาราง"));
    } finally {
      setUploading(false);
    }
  };

  const triggerAtmospherePreset = async (phase: string) => {
    if (phase === "presentation") {
      setBoxOpacity(0); setCurrentTheme("sapphire"); setBgType("video");
      await pushVisualUpdate({ theme: "sapphire", bg_type: "video", bg_url: "cyberVideoPool", box_opacity: 0, ticker_text: "🎬 ขณะนี้กำลังเข้าสู่ช่วงรับชมวิดีโอ Presentation พิเศษของค่ำคืนนี้ ขอรับชมด้วยความสุนทรีย์ครับ 🎬" });
    } else if (phase === "grandEntrance") {
      setBoxOpacity(10); setCurrentTheme("roseGold"); setBgType("image");
      await pushVisualUpdate({ theme: "roseGold", bg_type: "image", bg_url: "skyPool", box_opacity: 10, ticker_text: "✨ ขอเสียงปรบมือต้อนรับการเปิดตัวอย่างเป็นทางการ ท่ามกลางละอองดาวแห่งความสุขครับ ✨" });
    } else if (phase === "afterParty") {
      setBoxOpacity(0); setCurrentTheme("crimsonNeon"); setBgType("video");
      await pushVisualUpdate({ theme: "crimsonNeon", bg_type: "video", bg_url: "cyberVideoPool", speed: 180, box_opacity: 0, ticker_text: "🔥 MUSIC ON! เข้าสู่ช่วง NiiVaa SmartKaraoke After Party แขกผู้มีเกียรติร่วมสนุกหน้าเวทีได้เลยครับ! 🔥" });
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans p-6 select-none">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-white/5 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              NIIVAA SMARTEVENT CONTROL DESK
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">แดชบอร์ดบริหารสถานการณ์และมัลติมีเดียสำหรับพิธีกรและ Organizer หน้างาน</p>
        </div>
        <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-cyan-400">
          LIVE STATION: <span className="font-bold text-white uppercase">{slug}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================= ปีกฝั่งซ้าย (อัปเดตเลย์เอาต์รวมศูนย์ ล็อคป้ายชื่อกลุ่มป้องกันบั๊ก) ================= */}
        <section className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase">
              <FileText size={14} className="text-cyan-400" />
              <span>📜 สคริปต์และเช็คลิสต์ลำดับงานแต่ง (Run of Show)</span>
            </div>
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {agendaItems.map((item) => (
                <div key={item.id} onClick={() => handleToggleAgenda(item.id)} className={"flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer " + (item.done ? "bg-emerald-500/10 border-emerald-500/30 opacity-60" : "bg-slate-950/40 border-white/5 hover:border-white/10")}>
                  <CheckCircle size={16} className={"mt-0.5 flex-shrink-0 " + (item.done ? "text-emerald-400" : "text-slate-600")} />
                  <div className="text-xs space-y-0.5">
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded text-[10px] mr-1.5">{item.time}</span>
                    <p className={"inline font-medium " + (item.done ? "line-through text-slate-400" : "text-slate-200")}>{item.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase">
              <UploadCloud size={14} className="text-cyan-400" />
              <span>📤 อัปโหลดภาพ/วิดีโอ เข้าคลังสลับกลุ่มเรียลไทม์</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. เลือกกลุ่มเป้าหมายคลังภาพบนเวที</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                <button type="button" onClick={() => setTargetPoolKey("seaPool")} className={"py-2.5 rounded-xl border text-center transition-all cursor-pointer " + (targetPoolKey === "seaPool" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black border-cyan-400 shadow-md scale-[1.02]" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10")}>🌄 คลังวิวทะเล (seaPool)</button>
                <button type="button" onClick={() => setTargetPoolKey("skyPool")} className={"py-2.5 rounded-xl border text-center transition-all cursor-pointer " + (targetPoolKey === "skyPool" ? "bg-gradient-to-r from-sky-400 to-indigo-500 text-slate-950 font-black border-sky-300 shadow-md scale-[1.02]" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10")}>☁️ คลังท้องฟ้า (skyPool)</button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>2. เลือกไฟล์รูปภาพสากล</span>
                <span className="text-cyan-400 font-mono font-black bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-500/20">คลังที่เลือก: {targetPoolKey}</span>
              </div>
              
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 hover:border-cyan-500/40 bg-slate-950/50 rounded-2xl cursor-pointer p-4 text-center transition-all group">
                {uploading ? (
                  <div className="space-y-2 text-cyan-400">
                    <Loader2 className="mx-auto animate-spin" size={22} />
                    <p className="text-[10px] font-bold animate-pulse">{uploadStatus}</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-400 group-hover:text-slate-200">
                    <ImageIcon className="mx-auto mb-1 text-slate-500 group-hover:scale-105 transition-transform" size={24} />
                    <p className="text-xs font-black">กดเลือกภาพเพื่อส่งเข้ากลุ่ม [{targetPoolKey}]</p>
                    <p className="text-[9px] text-slate-500">ขนาดภาพแนะนําไม่เกิน 1.5 MB อัตราส่วน 16:9</p>
                  </div>
                )}
                <input type="file" accept="image/*,video/mp4" onChange={handleUploadMediaFile} disabled={uploading} className="hidden" />
              </label>
            </div>
            
            {!uploading && uploadStatus && (
              <p className="text-[10px] font-bold text-center text-slate-300 bg-white/5 p-2 rounded-xl border border-white/5">{uploadStatus}</p>
            )}
          </div>
        </section>

        {/* ================= ปีกฝั่งขวา (บอร์ดควบคุม visual ข้ามอากาศ) ================= */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/5 p-5 rounded-2xl space-y-3 shadow-xl">
            <span className="text-xs font-black tracking-widest text-amber-400 uppercase flex items-center gap-2">
              <Sliders size={14} />
              <span>🚀 QUICK MACROS: คลัตช์เปลี่ยนฉากเวทีด่วน (ตัวเดียวเปลี่ยนทั้งจอ)</span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => triggerAtmospherePreset("presentation")} className="py-3 bg-indigo-600/10 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-indigo-400 flex flex-col items-center gap-1.5 active:scale-95"><span>🎬 คิวช่วง Presentation</span></button>
              <button onClick={() => triggerAtmospherePreset("grandEntrance")} className="py-3 bg-rose-600/10 hover:bg-rose-600 hover:text-white border border-rose-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-rose-400 flex flex-col items-center gap-1.5 active:scale-95"><span>✨ คิวเปิดตัวบ่าวสาว</span></button>
              <button onClick={() => triggerAtmospherePreset("afterParty")} className="py-3 bg-amber-600/10 hover:bg-amber-600 hover:text-white border border-amber-500/30 rounded-xl text-xs font-black transition-all cursor-pointer text-amber-400 flex flex-col items-center gap-1.5 active:scale-95"><span>🔥 คิว After Party คาราโอเกะ</span></button>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl space-y-3 shadow-xl">
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Megaphone size={14} className="text-amber-400" />
              <span>📢 แท่นพิมพ์ประกาศด่วนและโฆษณาวิ่งขอบล่างจอ (Live Ticker)</span>
            </span>
            <div className="flex gap-2">
              <textarea rows={2} placeholder="พิมพ์ข้อความประกาศด่วนตรงนี้ (เช่น ขอความร่วมมือเลื่อนรถทะเบียน...)" value={tickerInput} onChange={(e) => setTickerInput(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 px-4 py-2.5 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setTickerInput(""); pushVisualUpdate({ ticker_text: "" }); }} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer">ล้างข้อมูลจอ</button>
              <button onClick={() => pushVisualUpdate({ ticker_text: tickerInput })} className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"><Play size={12} className="fill-current" /><span>ยิงขึ้นจอสด</span></button>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl space-y-4 shadow-xl">
            <span className="text-xs font-black tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Palette size={14} className="text-purple-400" />
              <span>🗛 บอร์ดปรับความโปร่งแสงและความเร็วสายพานข้ามอากาศ</span>
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>ความโปร่งแสงกล่องข้อความอวยพร</span>
                  <span className="text-cyan-400 font-mono font-bold">{boxOpacity}%</span>
                </div>
                <input type="range" min="0" max="100" value={boxOpacity} onChange={(e) => { setBoxOpacity(parseInt(e.target.value)); pushVisualUpdate({ box_opacity: parseInt(e.target.value) }); }} className="w-full accent-cyan-400 h-1 bg-white/10 rounded-lg cursor-pointer" />
              </div>
              <div className="bg-slate-950/40 border border-white/5 p-3 rounded-xl space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>ความเร็วในการเคลื่อนที่ของสายพาน</span>
                  <span className="text-white font-mono font-bold">{speed} Px</span>
                </div>
                <input type="range" min="5" max="230" value={speed} onChange={(e) => { setSpeed(parseInt(e.target.value)); pushVisualUpdate({ speed: parseInt(e.target.value) }); }} className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg cursor-pointer" />
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}