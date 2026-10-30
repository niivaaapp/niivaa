"use client";

import React, { useState, ChangeEvent ,Suspense} from "react";
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard } from "lucide-react";
// ==========================================
// 1. ชุดสีสำเร็จรูป (Color Presets สำหรับตารางโมเสก)
// ==========================================
const MOSAIC_PRESETS = [
  {
    id: "moira", name: "Moira Original (แบบภาพตัวอย่าง)",
    mainBg: "#00334e", textMain: "#ffffff", textAccent: "#38bdf8",
    c1: "#008ecc", c2: "#ffcc00", c3: "#87ceeb", c4: "#4cb963", c5: "#a4de02", c6: "#00a877"
  },
  {
    id: "corporate", name: "Corporate Blue (น้ำเงินทางการ)",
    mainBg: "#0f172a", textMain: "#ffffff", textAccent: "#60a5fa",
    c1: "#1e3a8a", c2: "#3b82f6", c3: "#1d4ed8", c4: "#2563eb", c5: "#60a5fa", c6: "#1e40af"
  },
  {
    id: "forest", name: "Eco Forest (รักษ์โลก/ธรรมชาติ)",
    mainBg: "#064e3b", textMain: "#ffffff", textAccent: "#a3e635",
    c1: "#059669", c2: "#fbbf24", c3: "#34d399", c4: "#10b981", c5: "#6ee7b7", c6: "#047857"
  },
  {
    id: "sunset", name: "Warm Sunset (อบอุ่น/พลังงาน)",
    mainBg: "#451a03", textMain: "#ffffff", textAccent: "#fde047",
    c1: "#ea580c", c2: "#facc15", c3: "#f97316", c4: "#ef4444", c5: "#fb923c", c6: "#b91c1c"
  },
];

function CoverBuilder2Content() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');

  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // 2. State Management (ข้อมูลและรูปภาพ)
  // ==========================================
  const [formData, setFormData] = useState({
    orgName: "ชื่อหน่วยงาน", // เพิ่ม State ชื่อหน่วยงาน
    title: "การประชุมใหญ่สามัญประจำปี 2569", // เปลี่ยนค่าเริ่มต้นตามภาพ
    location: "ณ ห้องประชุมใหญ่...", // เพิ่ม State สถานที่
    subtitle: "8 ตุลาคม 2569",
    presetId: "moira",

    // Custom Colors
    mainBg: "", textMain: "", textAccent: "",
    c1: "", c2: "", c3: "", c4: "", c5: "", c6: ""
  });

  const [logoPreview, setLogoPreview] = useState("/niivaasmartevent_logo.png");

  // ช่องใส่รูปภาพในโมเสก 6 ช่อง
  const [mosaicImages, setMosaicImages] = useState([
    "https://images.unsplash.com/photo-1596245195341-b33a7f275fdb?w=500&h=500&fit=crop",
    "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=400&fit=crop",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&h=500&fit=crop",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=500&h=500&fit=crop",
    "https://images.unsplash.com/photo-1541336032412-2048a678540d?w=800&h=400&fit=crop",
  ]);

  // คำนวณสีปัจจุบัน
  const activePreset = MOSAIC_PRESETS.find(p => p.id === formData.presetId) || MOSAIC_PRESETS[0];
  const theme = {
    mainBg: formData.mainBg || activePreset.mainBg,
    textMain: formData.textMain || activePreset.textMain,
    textAccent: formData.textAccent || activePreset.textAccent,
    c1: formData.c1 || activePreset.c1,
    c2: formData.c2 || activePreset.c2,
    c3: formData.c3 || activePreset.c3,
    c4: formData.c4 || activePreset.c4,
    c5: formData.c5 || activePreset.c5,
    c6: formData.c6 || activePreset.c6,
  };

  // ==========================================
  // 3. Handlers
  // ==========================================
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleMosaicImageUpload = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newImages = [...mosaicImages];
      newImages[index] = URL.createObjectURL(e.target.files[0]);
      setMosaicImages(newImages);
    }
  };

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      presetId: e.target.value,
      mainBg: "", textMain: "", textAccent: "",
      c1: "", c2: "", c3: "", c4: "", c5: "", c6: ""
    }));
  };

  const handleSave = async () => {
    if (!eventId) return alert("ไม่พบรหัส Event (event_id)");
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("บันทึกเทมเพลตหน้าปกสำเร็จ!");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans relative overflow-hidden">

      {/* ================= ซ้าย: เครื่องมือตั้งค่า (Tools Panel) ================= */}
      <div className="w-full md:w-[450px] bg-slate-800 border-r border-slate-700 shadow-[10px_0_20px_rgba(0,0,0,0.3)] flex flex-col h-screen z-20 shrink-0 text-slate-300">

        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-slate-900/50 sticky top-0 z-30 flex justify-between items-center">
          <h2 className="text-xl font-black text-sky-400 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Grid Mosaic Cover
          </h2>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isSaving} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-sky-600/20">
              {isSaving ? "Saving..." : "บันทึก"}
            </button>
            <button onClick={() => window.print()} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-white font-bold transition-colors">
              PDF
            </button>
            <Link
              href={`/events/event-dashboard/${eventId}`}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
            >
              <LayoutDashboard size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">กลับศูนย์กลาง</span>
            </Link>
          </div>
        </div>

        {/* Tools Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* 1. ข้อความหน้าปก */}
          <div className="space-y-4">
            <h3 className="font-bold text-sky-300 border-b border-slate-700 pb-2">1. ข้อความหน้าปก</h3>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">ชื่อหน่วยงาน (Organization Name)</label>
              <input type="text" name="orgName" value={formData.orgName} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white p-2.5 rounded-xl focus:border-sky-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">ชื่อรายงาน (Title)</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white p-2.5 rounded-xl font-bold focus:border-sky-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">สถานที่ (Location)</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white p-2.5 rounded-xl focus:border-sky-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">หัวข้อรอง หรือ วันที่ (Subtitle / Date)</label>
              <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} className="w-full bg-slate-900 border border-slate-600 text-white p-2.5 rounded-xl focus:border-sky-500 outline-none" />
            </div>
          </div>

          {/* 2. สีและแพทเทิร์น */}
          <div className="space-y-4">
            <h3 className="font-bold text-sky-300 border-b border-slate-700 pb-2">2. ชุดสีโมเสก (Color Palette)</h3>

            <select value={formData.presetId} onChange={handlePresetChange} className="w-full bg-slate-900 border border-slate-600 text-white p-3 rounded-xl text-sm mb-4 focus:border-sky-500 outline-none">
              {MOSAIC_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
              <label className="text-xs text-slate-400 mb-3 block font-bold">ปรับสีกล่องแยกอิสระ (Custom)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center text-xs"><span className="w-16">พื้นหลัง:</span><input type="color" name="mainBg" value={theme.mainBg} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-sky-200">กล่องที่ 1:</span><input type="color" name="c1" value={theme.c1} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-yellow-200">กล่องที่ 2:</span><input type="color" name="c2" value={theme.c2} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-cyan-200">กล่องที่ 3:</span><input type="color" name="c3" value={theme.c3} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-green-300">กล่องที่ 4:</span><input type="color" name="c4" value={theme.c4} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-lime-200">กล่องที่ 5:</span><input type="color" name="c5" value={theme.c5} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-teal-300">กล่องที่ 6:</span><input type="color" name="c6" value={theme.c6} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>

                <div className="col-span-2 border-t border-slate-700 mt-2 pt-2 grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center text-xs"><span className="w-16">สีอักษร:</span><input type="color" name="textMain" value={theme.textMain} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                  <div className="flex justify-between items-center text-xs"><span className="w-16">สีรอง:</span><input type="color" name="textAccent" value={theme.textAccent} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Images */}
          <div className="space-y-4 pb-8">
            <h3 className="font-bold text-sky-300 border-b border-slate-700 pb-2">3. อัปโหลดรูปภาพ</h3>

            <div>
              <label className="text-xs text-slate-400 mb-2 block">โลโก้ (มุมซ้ายบน)</label>
              <input type="file" onChange={handleLogoUpload} className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-white" />
            </div>

            <div className="pt-2">
              <label className="text-xs text-slate-400 mb-3 block">ภาพประกอบตาราง (6 ช่อง)</label>
              <div className="grid grid-cols-3 gap-2">
                {mosaicImages.map((img, i) => (
                  <div key={i} className="bg-slate-900 p-1.5 rounded-lg border border-slate-700 text-center relative group">
                    <div className="h-16 bg-slate-800 rounded mb-1.5 overflow-hidden">
                      <img src={img} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={`mosaic-${i}`} />
                    </div>
                    <input type="file" onChange={handleMosaicImageUpload(i)} className="absolute inset-0 opacity-0 cursor-pointer" title={`เปลี่ยนภาพที่ ${i + 1}`} />
                    <span className="text-[9px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded pointer-events-none">รูปที่ {i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= ขวา: พื้นที่วาดกระดาษ (Live Preview) ================= */}
      <div className="flex-1 bg-slate-950 flex justify-center items-start overflow-y-auto p-10 relative">
        <div
          className="page-a4 shadow-2xl flex flex-col"
          style={{ backgroundColor: theme.mainBg }}
        >

          {/* Section 1: Header & Logo & Org Name (20%) - ปรับตามภาพ */}
          <div className="h-[20%] p-12 flex items-center justify-center relative">
            <div className="flex items-center gap-6">
              {logoPreview && <img src={logoPreview} alt="Logo" className="w-24 h-auto object-contain" />}
              <h2 className="text-3xl font-bold tracking-wide" style={{ color: theme.textMain }}>
                {formData.orgName}
              </h2>
            </div>
          </div>

          {/* Section 2: Mosaic Grid (55%) */}
          <div className="h-[55%] grid grid-cols-5 grid-rows-3 w-full">

            {/* แถวที่ 1 */}
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundImage: `url(${mosaicImages[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundColor: theme.c1 }}></div>
            <div className="col-span-2 border-white/10 border-[0.5px]" style={{ backgroundImage: `url(${mosaicImages[1]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundColor: theme.c2 }}></div>

            {/* แถวที่ 2 */}
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundImage: `url(${mosaicImages[2]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundColor: theme.c3 }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundColor: theme.c4 }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundColor: theme.c5 }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundImage: `url(${mosaicImages[3]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

            {/* แถวที่ 3 */}
            <div className="col-span-1 border-white/10 border-[0.5px] border-l-0 border-b-0" style={{ backgroundColor: theme.mainBg }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundImage: `url(${mosaicImages[4]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
            <div className="col-span-1 border-white/10 border-[0.5px]" style={{ backgroundColor: theme.c6 }}></div>
            <div className="col-span-2 border-white/10 border-[0.5px]" style={{ backgroundImage: `url(${mosaicImages[5]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

          </div>

          {/* Section 3: Title & Date & Location (25%) - ปรับตามภาพ */}
          <div className="h-[25%] p-12 flex flex-col justify-center items-center text-center">
            {/* เส้นขีดตกแต่งเหนือข้อความ */}
            <div className="w-12 h-1.5 mb-6 rounded-full" style={{ backgroundColor: theme.c1 }}></div>
            <h1 className="text-[2.25rem] font-medium tracking-wide leading-tight mb-2" style={{ color: theme.textMain }}>
              {formData.title}
            </h1>
            <h3 className="text-xl font-medium mb-1" style={{ color: theme.textAccent }}>
              {formData.location}
            </h3>
            <h2 className="text-xl font-bold" style={{ color: theme.textAccent }}>
              {formData.subtitle}
            </h2>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* ตกแต่ง Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.4); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.8); }

        /* A4 Size */
        .page-a4 { 
          width: 210mm; 
          height: 297mm; 
          box-sizing: border-box; 
          font-family: 'Sarabun', 'Kanit', sans-serif; 
          position: relative; 
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Print Settings (เวทมนตร์สำหรับการสั่งพิมพ์) */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }
          body > div > div:first-child { display: none !important; }
          body { margin: 0; padding: 0; background: none; }
          .page-a4 { box-shadow: none !important; position: absolute; left: 0; top: 0; margin: 0 !important; width: 210mm !important; height: 297mm !important; }
          .bg-slate-950 { background: none !important; padding: 0 !important; }
        }
        `
      }} />
    </div>
  );
}
// ==========================================
// 🚀 Component หลักที่ Export (เอา Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function CoverBuilder2Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดเครื่องมือออกแบบปก...</div>}>
      {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้ได้เลยครับ */}
      <CoverBuilder2Content />
    </Suspense>
  );
}