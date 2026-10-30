"use client";

import React, { useState, ChangeEvent ,Suspense} from "react";
// import { supabase } from '@/lib/supabase'; // <--- เอาคอมเมนต์ออกและใช้ตอนผูก Database จริง
import { useSearchParams } from 'next/navigation';

// ==========================================
// 1. ชุดสีสำเร็จรูป (Color Presets สำหรับ Geometric Style)
// ==========================================
const GEOMETRIC_PRESETS = [
  { 
    id: "corporate", name: "Corporate Blue (แบบภาพต้นฉบับ)", 
    bg: "#ffffff", 
    primaryShape: "#2563eb",   // น้ำเงินหลัก (ริบบิ้นชิ้นใหญ่)
    secondaryShape: "#60a5fa", // น้ำเงินอ่อน (รอยพับทบ)
    footerShape: "#1e293b",    // เทาดำ (ส่วนฐานล่าง)
    textMain: "#0f172a",       // สีชื่อบริษัท
    textAccent: "#ffffff",     // สีชื่อรายงานบนริบบิ้น
  },
  { 
    id: "emerald", name: "Emerald Tech (เขียวมรกต)", 
    bg: "#ffffff", 
    primaryShape: "#059669", 
    secondaryShape: "#34d399", 
    footerShape: "#064e3b", 
    textMain: "#0f172a", 
    textAccent: "#ffffff",
  },
  { 
    id: "ruby", name: "Ruby Red (แดงทับทิม)", 
    bg: "#fff5f5", 
    primaryShape: "#e11d48", 
    secondaryShape: "#fb7185", 
    footerShape: "#4c0519", 
    textMain: "#4c0519", 
    textAccent: "#ffffff",
  },
  { 
    id: "monochrome", name: "Monochrome (เทาดำโมเดิร์น)", 
    bg: "#f8fafc", 
    primaryShape: "#475569", 
    secondaryShape: "#94a3b8", 
    footerShape: "#0f172a", 
    textMain: "#0f172a", 
    textAccent: "#ffffff",
  },
  { 
    id: "sunset", name: "Warm Sunset (ส้มอบอุ่น)", 
    bg: "#fffbeb", 
    primaryShape: "#ea580c", 
    secondaryShape: "#fb923c", 
    footerShape: "#451a03", 
    textMain: "#451a03", 
    textAccent: "#ffffff",
  },
];

function GeometricCoverBuilderContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false); // สำหรับเปิด-ปิดคู่มือ

  // ==========================================
  // 2. State Management (ข้อมูลและรูปภาพ)
  // ==========================================
  const [formData, setFormData] = useState({
    titleLine1: "ANNUAL",
    titleLine2: "REPORT",
    companyName: "COMPANY NAME",
    companyDesc: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna.",
    footerTitle: "LOREM IPSUM DOLOR SIT AMET",
    footerDesc: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna",
    
    presetId: "corporate",
    
    // Custom Colors
    bg: "", primaryShape: "", secondaryShape: "", footerShape: "", textMain: "", textAccent: ""
  });

  const [logoPreview, setLogoPreview] = useState("/niivaasmartevent_logo.png");
  // รูปภาพพื้นหลังฝั่งขวาบน
  const [coverImage, setCoverImage] = useState("https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&h=800&fit=crop"); 

  // คำนวณสีปัจจุบัน
  const activePreset = GEOMETRIC_PRESETS.find(p => p.id === formData.presetId) || GEOMETRIC_PRESETS[0];
  const theme = {
    bg: formData.bg || activePreset.bg,
    primaryShape: formData.primaryShape || activePreset.primaryShape,
    secondaryShape: formData.secondaryShape || activePreset.secondaryShape,
    footerShape: formData.footerShape || activePreset.footerShape,
    textMain: formData.textMain || activePreset.textMain,
    textAccent: formData.textAccent || activePreset.textAccent,
  };

  // ==========================================
  // 3. Handlers
  // ==========================================
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleCoverImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev, 
      presetId: e.target.value,
      bg: "", primaryShape: "", secondaryShape: "", footerShape: "", textMain: "", textAccent: ""
    }));
  };

  const handleResetColors = () => {
    setFormData(prev => ({
      ...prev, bg: "", primaryShape: "", secondaryShape: "", footerShape: "", textMain: "", textAccent: ""
    }));
  };

  const handleSave = async () => {
    if (!eventId) return alert("ไม่พบรหัส Event (event_id)");
    setIsSaving(true);
    try {
      // 💡 โค้ดอัปโหลดรูปและบันทึกฐานข้อมูลจะอยู่ที่นี่ (คล้ายหน้า Article Editor)
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("บันทึกเทมเพลตหน้าปกสำเร็จ!");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  // CSS Class สำหรับ Input กลาง
  const inputClass = "w-full bg-slate-900/50 text-slate-100 placeholder-slate-500/50 border border-slate-700/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 p-2.5 rounded-lg text-sm outline-none transition-all";

  // บรรทัดที่ 148 เริ่มตรงนี้
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans relative overflow-hidden">
      
      {/* ================= ซ้าย: เครื่องมือตั้งค่า (Tools Panel) ================= */}
      <div className="w-full md:w-[450px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 shadow-[10px_0_20px_rgba(0,0,0,0.3)] flex flex-col h-screen z-20 shrink-0 text-slate-300">
        
        {/* Header พร้อมปุ่ม คู่มือ */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm z-30">
          <h2 className="text-xl font-black text-blue-400 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
            Geometric Cover
          </h2>
          <button 
            onClick={() => setIsManualOpen(true)}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border border-slate-500/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            คู่มือ
          </button>
        </div>

        {/* Tools Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* 1. สีและกราฟิกสำเร็จรูป */}
          <div className="space-y-4">
            <h3 className="font-bold text-blue-300 border-b border-slate-700 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
              1. ชุดสีและกราฟิก
            </h3>
            
            <select value={formData.presetId} onChange={handlePresetChange} className={inputClass}>
              {GEOMETRIC_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 shadow-inner">
              <label className="text-xs text-slate-400 mb-3 block font-bold">แผงสีปรับแต่งอิสระ (Custom Shapes)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center text-xs"><span className="w-16">พื้นหลัง:</span><input type="color" name="bg" value={theme.bg} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-blue-300">ริบบิ้นหลัก:</span><input type="color" name="primaryShape" value={theme.primaryShape} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-sky-200">รอยพับรอง:</span><input type="color" name="secondaryShape" value={theme.secondaryShape} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                <div className="flex justify-between items-center text-xs"><span className="w-16 text-slate-400">ฐานล่าง:</span><input type="color" name="footerShape" value={theme.footerShape} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                
                <div className="col-span-2 border-t border-slate-700 mt-2 pt-2 grid grid-cols-2 gap-3">
                   <div className="flex justify-between items-center text-xs"><span className="w-16 text-slate-200">อักษรหลัก:</span><input type="color" name="textMain" value={theme.textMain} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                   <div className="flex justify-between items-center text-xs"><span className="w-16 text-slate-200">อักษรบนแถบ:</span><input type="color" name="textAccent" value={theme.textAccent} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" /></div>
                </div>
              </div>
              {(formData.bg || formData.primaryShape) && (
                 <button onClick={handleResetColors} className="w-full text-xs text-rose-400 mt-4 text-right underline hover:text-rose-300 transition-colors">ล้างค่ากลับเป็น Preset</button>
              )}
            </div>
          </div>

          {/* 2. ข้อความหน้าปก */}
          <div className="space-y-4">
            <h3 className="font-bold text-blue-300 border-b border-slate-700 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              2. ข้อความบนหน้าปก
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ชื่อบริษัท (ซ้ายบน)</label>
                <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className={`${inputClass} uppercase font-bold`} />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">รายละเอียดบริษัท</label>
                <textarea name="companyDesc" value={formData.companyDesc} onChange={handleChange} className={`${inputClass} h-16 resize-none`} />
              </div>
              
              <div className="pt-2 border-t border-slate-700/50">
                <label className="text-xs text-slate-400 mb-1 block font-bold text-blue-200">ชื่อรายงาน (ซ้อนบนแถบสี)</label>
                <div className="flex gap-2">
                  <input type="text" name="titleLine1" value={formData.titleLine1} onChange={handleChange} placeholder="บรรทัดที่ 1" className={`${inputClass} font-bold uppercase`} />
                  <input type="text" name="titleLine2" value={formData.titleLine2} onChange={handleChange} placeholder="บรรทัดที่ 2" className={`${inputClass} font-bold uppercase`} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/50">
                <label className="text-xs text-slate-400 mb-1 block">หัวข้อส่วนฐานล่าง (Footer)</label>
                <input type="text" name="footerTitle" value={formData.footerTitle} onChange={handleChange} className={`${inputClass} font-bold uppercase mb-2`} />
                <textarea name="footerDesc" value={formData.footerDesc} onChange={handleChange} className={`${inputClass} h-16 resize-none`} />
              </div>
            </div>
          </div>

          {/* 3. รูปภาพโลโก้ และ ภาพประกอบ */}
          <div className="space-y-4 pb-8">
            <h3 className="font-bold text-blue-300 border-b border-slate-700 pb-2 flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
               3. โลโก้ และ ภาพประกอบ
            </h3>
            
            <div>
              <label className="text-xs text-slate-400 mb-2 block">อัปโหลดโลโก้หน่วยงาน</label>
              <input type="file" onChange={handleLogoUpload} className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/40 file:cursor-pointer" />
            </div>

            <div className="pt-2">
              <label className="text-xs text-slate-400 mb-2 block">ภาพประกอบหลัก (ซ้ายบนเฉียงขวาล่าง)</label>
              <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 text-center relative group">
                <div className="h-32 bg-slate-900 rounded-lg mb-2 overflow-hidden border border-slate-800">
                  <img src={coverImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="cover" />
                </div>
                <input type="file" onChange={handleCoverImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded pointer-events-none">คลิกเพื่อเปลี่ยนรูปภาพ</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-700">
            <button onClick={handleSave} disabled={isSaving} className={`w-full text-white p-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all ${isSaving ? "bg-blue-800 opacity-50" : "bg-blue-600 hover:bg-blue-500 hover:scale-[1.02]"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
              {isSaving ? "กำลังบันทึก..." : "บันทึกหน้าปก (Save)"}
            </button>
            <button onClick={() => window.print()} className="w-full bg-slate-800 text-white border border-slate-600 p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-700 transition-colors">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              พิมพ์ / บันทึกเป็น PDF
            </button>
          </div>

        </div>
      </div>

      {/* ================= ขวา: พื้นที่วาดกระดาษ (Live Preview) ================= */}
      <div className="flex-1 bg-[#1e293b] flex justify-center items-start overflow-y-auto p-10 relative">
        <div 
          className="page-a4 shadow-2xl relative"
          style={{ backgroundColor: theme.bg }}
        >
          
          {/* 1. Header (Top Left - Logo & Info) */}
          <div className="absolute top-0 left-0 w-full p-12 z-20 flex items-start gap-4">
            {logoPreview && <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain" />}
            <div className="max-w-[45%]">
              <h2 className="text-xl font-bold tracking-widest uppercase mb-1" style={{ color: theme.textMain }}>{formData.companyName}</h2>
              <p className="text-[9px] leading-relaxed opacity-70" style={{ color: theme.textMain }}>{formData.companyDesc}</p>
            </div>
          </div>

          {/* 2. Image Polygon (Background Top Right) */}
          <div 
            className="absolute z-0 shadow-inner"
            style={{ 
              top: '0', right: '0', width: '100%', height: '100%',
              backgroundImage: `url(${coverImage})`, 
              backgroundSize: 'cover', 
              backgroundPosition: 'center right',
              // จุด 1: บนขยับมาซ้าย (30%), จุด 2: บนขวา, จุด 3: ขวาล่าง (65%), จุด 4: ซ้ายขยับลง (35%)
              clipPath: 'polygon(30% 0%, 100% 0%, 100% 65%, 0% 35%)' 
            }}
          ></div>

          {/* 3. Primary Ribbon (Dark Blue Fold) */}
          <div 
            className="absolute z-10 shadow-2xl"
            style={{ 
              top: '0', left: '0', width: '100%', height: '100%',
              backgroundColor: theme.primaryShape,
              // การคำนวณจุดตัดให้เนียนกริบ:
              clipPath: 'polygon(0% 25%, 58% 50%, 28% 70%, 0% 55%)'
            }}
          ></div>

          {/* 4. Secondary Ribbon (Light Blue Fold) */}
          <div 
            className="absolute z-10"
            style={{ 
              top: '0', left: '0', width: '100%', height: '100%',
              backgroundColor: theme.secondaryShape,
              // รอยพับต้องต่อจากจุด (28%, 70%) และ (58%, 50%) ของ Ribbon หลักพอดี
              clipPath: 'polygon(28% 70%, 58% 50%, 95% 68%, 60% 85%)'
            }}
          ></div>

          {/* 5. Dark Footer Block */}
          <div 
            className="absolute z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]"
            style={{ 
              top: '0', left: '0', width: '100%', height: '100%',
              backgroundColor: theme.footerShape,
              // ฐานล่างสุด ซ้อนทับ Ribbon เล็กน้อยเพื่อความลึก
              clipPath: 'polygon(0% 50%, 60% 85%, 100% 65%, 100% 100%, 0% 100%)'
            }}
          >
            {/* Footer Text Content */}
            <div className="absolute bottom-[10%] left-[10%] max-w-[50%]">
              <h3 className="text-[14pt] font-bold uppercase tracking-widest mb-3" style={{ color: theme.textAccent }}>{formData.footerTitle}</h3>
              <p className="text-[9pt] leading-relaxed opacity-70" style={{ color: theme.textAccent }}>{formData.footerDesc}</p>
            </div>
            
            {/* Social Icons Placeholder */}
            <div className="absolute bottom-[10%] right-[10%] flex gap-3">
              <div className="w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center font-bold" style={{ borderColor: theme.textAccent, color: theme.textAccent }}>🌐</div>
              <div className="w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center font-bold" style={{ borderColor: theme.textAccent, color: theme.textAccent }}>f</div>
              <div className="w-10 h-10 rounded-full border-[1.5px] flex items-center justify-center font-bold" style={{ borderColor: theme.textAccent, color: theme.textAccent }}>X</div>
            </div>
          </div>

          {/* 6. Title Text Overlay (ลอยอยู่เหนือ Primary Ribbon) */}
          <div className="absolute z-30 flex flex-col justify-center" style={{ top: '38%', left: '10%' }}>
            <h1 className="text-[3.5rem] font-black uppercase leading-[1.1] tracking-wider" style={{ color: theme.textAccent }}>
              <div>{formData.titleLine1}</div>
              <div>{formData.titleLine2}</div>
            </h1>
          </div>

        </div>
      </div>

      {/* ================= Slide-over Drawer (คู่มือการใช้งาน) ================= */}
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40 transition-opacity duration-300 no-print ${isManualOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsManualOpen(false)}
      ></div>
      
      {/* Drawer Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col no-print border-l border-slate-700 ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-black text-blue-400 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            คู่มือการออกแบบปก
          </h2>
          <button onClick={() => setIsManualOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors border border-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-sm bg-slate-900 custom-scrollbar">
          
          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm">
            <h4 className="font-bold text-blue-300 mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg>
              ระบบการจัดสีเรขาคณิต
            </h4>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed">
              <li>เราได้เตรียม <strong>ชุดสีสำเร็จรูป 5 แบบ</strong> ที่แมตช์สีน้ำเงิน, สีตัด และสีข้อความให้ดูเป็นทางการ (Corporate) ไว้อยู่แล้ว</li>
              <li>แต่คุณสามารถกดที่ <strong>แผงสีปรับแต่งอิสระ</strong> เพื่อจิ้มเลือกสีให้กับ <em>ริบบิ้นหลัก</em>, <em>รอยพับรอง</em> หรือ <em>ฐานล่างสีดำ</em> ได้ด้วยตัวเอง เพื่อให้ตรงกับสีแบรนด์ (Corporate Identity) ขององค์กรคุณที่สุด</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm">
            <h4 className="font-bold text-blue-300 mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              การจัดการรูปภาพ
            </h4>
            <p className="mb-2 leading-relaxed">ภาพประกอบหลักที่อยู่ด้านบนขวา ระบบใช้ CSS ตัดขอบให้เฉียง <strong>คุณเพียงแค่อัปโหลดรูปสี่เหลี่ยมตามปกติ</strong> ระบบจะทำการจัดองค์ประกอบให้อัตโนมัติ (แนะนำให้ใช้ภาพแนวนอนที่มีพื้นที่ว่างฝั่งซ้าย เพื่อไม่ให้รูปโดนริบบิ้นทับจุดสำคัญ)</p>
          </div>

          <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm">
            <h4 className="font-bold text-blue-300 mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
              การตั้งค่าตอนพิมพ์ PDF
            </h4>
            <ul className="list-disc pl-5 space-y-2 leading-relaxed text-rose-300">
              <li>เมื่อกดพิมพ์ <strong>อย่าลืมทำเครื่องหมายถูกที่ Background graphics</strong> เสมอ ไม่เช่นนั้นสีพื้นหลังและลวดลายจะไม่ปรากฏใน PDF</li>
              <li>นำเครื่องหมายถูกออกจาก Headers and footers</li>
            </ul>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(96, 165, 250, 0.4); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(96, 165, 250, 0.8); }

        .page-a4 { 
          width: 210mm; 
          height: 297mm; 
          box-sizing: border-box; 
          font-family: 'Inter', 'Kanit', sans-serif; 
          position: relative; 
          overflow: hidden;
        }

        @media print {
          body > div > div:first-child, body > div > div.fixed { display: none !important; }
          .page-a4 { box-shadow: none; position: absolute; left: 0; top: 0; margin: 0; }
          .bg-\\[\\#1e293b\\] { background: none; }
        }
        `
      }} />
    </div>
  );
}
// ==========================================
// 🚀 Component หลักที่ Export (เอา Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function GeometricCoverBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดเครื่องมือออกแบบปก...</div>}>
      {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้ได้เลยครับ */}
      <GeometricCoverBuilderContent />
    </Suspense>
  );
}