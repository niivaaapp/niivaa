"use client";

import React, { useState, ChangeEvent, useEffect, Suspense } from "react";
import { supabase } from '@/lib/supabase'; // เช็คพาธตามโปรเจกต์ของคุณ
import { useSearchParams } from 'next/navigation';

// ==========================================
// 1. ข้อมูลตั้งค่า (Layouts, Shapes, Presets)
// ==========================================

// รูปแบบ Layout
const COVER_LAYOUTS = [
  { id: "grid-mosaic", name: "ตารางโมเสก (คล้าย Moira Shire)" },
  { id: "geometric-angles", name: "มุมเรขาคณิต (คล้าย Company Name)" },
];

// ชุดสีสำเร็จรูป (Color Presets) - ควบคุมสีพื้นหลัง, รูปทรงตกแต่ง และสีข้อความ
const COLOR_PRESETS = [
  { id: "cp1", name: "Corporate Blue (สไตล์เรขาคณิต)", bg: "#f8fafc", shape1: "#1d4ed8", shape2: "#1e293b", textMain: "#0f172a", textAccent: "#ffffff" },
  { id: "cp2", name: "Deep Navy (สไตล์โมเสก)", bg: "#0f172a", shape1: "#0ea5e9", shape2: "#10b981", textMain: "#ffffff", textAccent: "#38bdf8" },
  { id: "cp3", name: "Modern Teal", bg: "#ffffff", shape1: "#0f766e", shape2: "#ccfbf1", textMain: "#134e5e", textAccent: "#0f766e" },
  { id: "cp4", name: "Warm Sunset", bg: "#fffbeb", shape1: "#ea580c", shape2: "#fde047", textMain: "#451a03", textAccent: "#ffffff" },
  { id: "cp5", name: "Elegant Dark", bg: "#18181b", shape1: "#a1a1aa", shape2: "#3f3f46", textMain: "#f4f4f5", textAccent: "#e4e4e7" },
];

function CoverBuilderContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');

  // ==========================================
  // 2. การจัดการ State
  // ==========================================
  const [isSaving, setIsSaving] = useState(false);

  // ข้อมูลข้อความและการตั้งค่าดีไซน์
  const [formData, setFormData] = useState({
    title: "Annual Report",
    subtitle: "2024-25",
    companyName: "COMPANY NAME",
    companyDesc: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.",
    footerText: "LOREM IPSUM DOLOR SIT AMET",
    footerDesc: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt",

    // ตั้งค่าเลย์เอาต์และสี
    layoutId: "grid-mosaic", // เริ่มต้นด้วย Mosaic
    presetId: "cp2",         // เริ่มด้วยธีม Deep Navy

    // สีที่ผู้ใช้ปรับแต่งเอง (หากมีค่าจะไปทับ Preset)
    customBgColor: "",
    customShape1Color: "",
    customShape2Color: "",
    customTextMainColor: "",
    customTextAccentColor: "",
  });

  // สถานะรูปภาพ
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("/niivaasmartevent_logo.png");

  // รองรับหลายรูปภาพตามที่ Layout ต้องการ (เช่น Mosaic ใช้ 4 รูป)
  const [coverImages, setCoverImages] = useState<{ file: File | null, preview: string }[]>([
    { file: null, preview: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop" },
    { file: null, preview: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop" },
    { file: null, preview: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop" },
    { file: null, preview: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop" }
  ]);

  // คำนวณสีที่จะนำไปใช้จริง (จาก Preset หรือ Custom)
  const activePreset = COLOR_PRESETS.find(p => p.id === formData.presetId) || COLOR_PRESETS[1];
  const theme = {
    bg: formData.customBgColor || activePreset.bg,
    shape1: formData.customShape1Color || activePreset.shape1,
    shape2: formData.customShape2Color || activePreset.shape2,
    textMain: formData.customTextMainColor || activePreset.textMain,
    textAccent: formData.customTextAccentColor || activePreset.textAccent,
  };

  // ==========================================
  // 3. ฟังก์ชันจัดการข้อมูล (Handlers)
  // ==========================================
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverImageUpload = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newImages = [...coverImages];
      newImages[index] = { file, preview: URL.createObjectURL(file) };
      setCoverImages(newImages);
    }
  };

  const handleResetColors = () => {
    setFormData(prev => ({
      ...prev,
      customBgColor: "", customShape1Color: "", customShape2Color: "",
      customTextMainColor: "", customTextAccentColor: ""
    }));
  };

  // ฟังก์ชันสลับ Preset หากเปลี่ยน Layout เพื่อให้ดูสวยขึ้น
  const handleLayoutChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const layout = e.target.value;
    setFormData(prev => ({
      ...prev,
      layoutId: layout,
      presetId: layout === 'geometric-angles' ? 'cp1' : 'cp2' // สลับสีให้เข้ากับแบบ
    }));
    handleResetColors();
  };

  const handleSave = async () => {
    if (!eventId) {
      alert("ไม่พบรหัส Event (event_id)");
      return;
    }
    setIsSaving(true);
    try {
      // 💡 ในการใช้งานจริง: คุณต้องเขียนโค้ด upload ไฟล์ logoFile และ coverImages ขึ้น Supabase Storage ก่อน
      // แล้วนำ URL ที่ได้มากำหนดใน Database ควบคู่กับข้อมูล formData

      // จำลองการเซฟ
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("บันทึกเทมเพลตหน้าปกสำเร็จ!");
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // 4. การแสดงผล Layout (Renderers)
  // ==========================================

  // Layout 1: Grid Mosaic (แนวตั้ง 4 แถว แบ่งช่องคล้ายภาพแรก)
  const renderGridMosaic = () => (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ backgroundColor: theme.bg }}>

      {/* ส่วนบน: พื้นหลังสีหลัก และ Logo */}
      <div className="h-[25%] p-12 flex flex-col justify-end relative z-10">
        {/* กล่องใส่โลโก้ */}
        <div className="w-32 h-auto relative mb-4">
          {logoPreview && <img src={logoPreview} alt="Logo" className="w-full h-full object-contain filter invert opacity-90" style={{ filter: theme.bg === '#ffffff' ? 'none' : 'brightness(0) invert(1)' }} />}
        </div>
      </div>

      {/* ส่วนกลาง 1: ตารางโมเสก (Row 1-2) */}
      <div className="h-[45%] grid grid-cols-5 grid-rows-2 w-[110%] -ml-[5%]">
        {/* แถว 1 */}
        <div className="col-span-1" style={{ backgroundImage: `url(${coverImages[0].preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="col-span-1" style={{ backgroundColor: theme.shape1 }}></div>
        <div className="col-span-2" style={{ backgroundImage: `url(${coverImages[1].preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="col-span-1" style={{ backgroundColor: theme.shape2, filter: 'brightness(1.5)' }}></div>

        {/* แถว 2 */}
        <div className="col-span-1" style={{ backgroundColor: theme.shape1, filter: 'brightness(0.8)' }}></div>
        <div className="col-span-1" style={{ backgroundImage: `url(${coverImages[2].preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="col-span-1" style={{ backgroundColor: theme.shape1, opacity: 0.5 }}></div>
        <div className="col-span-1" style={{ backgroundColor: theme.shape2 }}></div>
        <div className="col-span-1" style={{ backgroundColor: theme.shape2, filter: 'brightness(1.2)' }}></div>
      </div>

      {/* ส่วนกลาง 2: โมเสกแถวล่าง (Row 3) */}
      <div className="h-[15%] grid grid-cols-4 w-[110%] -ml-[5%]">
        <div className="col-span-1" style={{ backgroundColor: theme.bg, filter: 'brightness(0.9)' }}></div>
        <div className="col-span-1" style={{ backgroundImage: `url(${coverImages[3].preview})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
        <div className="col-span-1" style={{ backgroundColor: theme.shape2, filter: 'brightness(0.8)' }}></div>
        <div className="col-span-1" style={{ backgroundImage: `url(${coverImages[0].preview})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'hue-rotate(180deg) opacity(0.3)' }}></div>
      </div>

      {/* ส่วนล่าง: ชื่อรายงาน (Title) */}
      <div className="h-[15%] p-12 flex flex-col justify-center items-center text-center mt-auto relative z-10">
        <div className="w-12 h-1.5 mb-4" style={{ backgroundColor: theme.shape1 }}></div>
        <h1 className="text-4xl font-normal tracking-wide" style={{ color: theme.textMain }}>{formData.title}</h1>
        <h2 className="text-2xl font-bold mt-2" style={{ color: theme.shape1 }}>{formData.subtitle}</h2>
      </div>
    </div>
  );

  // Layout 2: Geometric Angles (สามเหลี่ยมและมุมเรขาคณิต คล้ายภาพสอง)
  const renderGeometricAngles = () => (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: theme.bg }}>

      {/* Header (Logo + Company Name) */}
      <div className="absolute top-0 left-0 w-full p-12 z-20 flex items-start gap-4">
        {logoPreview && <img src={logoPreview} alt="Logo" className="w-16 h-16 object-contain" />}
        <div className="max-w-[40%]">
          <h2 className="text-xl font-bold tracking-widest uppercase" style={{ color: theme.textMain }}>{formData.companyName}</h2>
          <p className="text-[10px] mt-1 leading-tight opacity-70" style={{ color: theme.textMain }}>{formData.companyDesc}</p>
        </div>
      </div>

      {/* รูปภาพพื้นหลัง (ตัดมุมทแยง) */}
      <div
        className="absolute top-0 right-0 w-full h-[65%] z-0 shadow-inner"
        style={{
          backgroundImage: `url(${coverImages[0].preview})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          // ใช้ CSS Clip-path ตัดให้เป็นมุมเอียง
          clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0 45%)'
        }}
      ></div>

      {/* รูปร่างหลัก (Shape 1 - สามเหลี่ยม/ริบบิ้น แถบชื่อรายงาน) */}
      <div
        className="absolute z-10 flex flex-col justify-center p-12 shadow-2xl"
        style={{
          backgroundColor: theme.shape1,
          top: '25%', left: '-5%', width: '60%', height: '40%',
          clipPath: 'polygon(0 0, 100% 40%, 65% 100%, 0% 100%)'
        }}
      >
        <div className="pl-12 pt-4">
          <h1 className="text-[2.5rem] font-black uppercase leading-[1.15] tracking-wider" style={{ color: theme.textAccent }}>
            {formData.title.split(' ').map((word, i) => <div key={i}>{word}</div>)}
          </h1>
          <h2 className="text-xl mt-4 font-medium tracking-widest opacity-80" style={{ color: theme.textAccent }}>
            {formData.subtitle}
          </h2>
        </div>
      </div>

      {/* รูปร่างรอง (Shape 2 - แถบสีเข้มด้านล่าง) */}
      <div
        className="absolute bottom-0 left-0 w-full h-[35%] z-10 flex flex-col justify-end p-12 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]"
        style={{
          backgroundColor: theme.shape2,
          clipPath: 'polygon(0 25%, 55% 0, 100% 25%, 100% 100%, 0 100%)'
        }}
      >
        <div className="max-w-[60%] mb-4">
          <h3 className="text-xl font-bold uppercase tracking-widest mb-2" style={{ color: theme.textAccent }}>{formData.footerText}</h3>
          <p className="text-[10px] opacity-70 leading-relaxed" style={{ color: theme.textAccent }}>{formData.footerDesc}</p>
        </div>

        {/* Social Icons Placeholder */}
        <div className="absolute bottom-12 right-12 flex gap-3">
          <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold" style={{ borderColor: theme.textAccent, color: theme.textAccent }}>🌐</div>
          <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold" style={{ borderColor: theme.textAccent, color: theme.textAccent }}>f</div>
          <div className="w-8 h-8 rounded-full border flex items-center justify-center font-bold" style={{ borderColor: theme.textAccent, color: theme.textAccent }}>X</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col md:flex-row font-sans relative overflow-hidden">

      {/* ================= ซ้าย: เครื่องมือตั้งค่า (Tools Panel) ================= */}
      <div className="w-full md:w-[420px] xl:w-[450px] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col h-screen z-20 shrink-0 text-slate-300">

        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
          <h2 className="text-2xl font-black text-indigo-400 flex items-center gap-3 mb-4">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            ออกแบบหน้าปกรายงาน
          </h2>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-600/20">
              {isSaving ? "กำลังบันทึก..." : "บันทึกหน้าปก"}
            </button>
            <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 rounded-xl text-white font-bold transition-colors">
              🖨️ PDF
            </button>
          </div>
        </div>

        {/* Tools Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* 1. Layout */}
          <div className="space-y-3">
            <h3 className="font-bold text-indigo-300 border-b border-slate-800 pb-2">1. โครงสร้างเลย์เอาต์ (Layout Pattern)</h3>
            <select name="layoutId" value={formData.layoutId} onChange={handleLayoutChange} className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl focus:border-indigo-500 outline-none">
              {COVER_LAYOUTS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* 2. Color Options */}
          <div className="space-y-4">
            <h3 className="font-bold text-indigo-300 border-b border-slate-800 pb-2">2. สีและกราฟิกสำเร็จรูป</h3>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">ชุดสีสำเร็จรูป (Color Presets)</label>
              <select name="presetId" value={formData.presetId} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-xl text-sm focus:border-indigo-500 outline-none">
                {COLOR_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Custom Color Panel */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <label className="text-xs text-slate-400 mb-3 block font-bold">แผงสีอิสระสำหรับวัตถุ (Custom Colors)</label>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div className="flex justify-between items-center text-xs">
                  <span>พื้นหลัง:</span>
                  <input type="color" name="customBgColor" value={theme.bg} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>ข้อความหลัก:</span>
                  <input type="color" name="customTextMainColor" value={theme.textMain} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>รูปร่างที่ 1:</span>
                  <input type="color" name="customShape1Color" value={theme.shape1} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>รูปร่างที่ 2:</span>
                  <input type="color" name="customShape2Color" value={theme.shape2} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                </div>
                <div className="flex justify-between items-center text-xs col-span-2 border-t border-slate-700/50 pt-2 mt-1">
                  <span>สีข้อความเน้น (บนรูปร่าง):</span>
                  <input type="color" name="customTextAccentColor" value={theme.textAccent} onChange={handleChange} className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                </div>
              </div>

              <button onClick={handleResetColors} className="w-full text-xs text-rose-400 mt-4 text-right underline hover:text-rose-300">คืนค่าสีกลับเป็น Preset</button>
            </div>
          </div>

          {/* 3. Text Content */}
          <div className="space-y-4">
            <h3 className="font-bold text-indigo-300 border-b border-slate-800 pb-2">3. ข้อความบนหน้าปก</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">ชื่อรายงาน (Title)</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl font-bold" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">หัวข้อรอง หรือ ปี (Subtitle / Year)</label>
                <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl" />
              </div>

              {formData.layoutId === "geometric-angles" && (
                <div className="pt-2 border-t border-slate-700/50 space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">ชื่อหน่วยงาน (Company Name)</label>
                    <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl uppercase" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">รายละเอียด / สโลแกน</label>
                    <textarea name="companyDesc" value={formData.companyDesc} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-xs h-16 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">ข้อความ Footer ด้านล่าง</label>
                    <input type="text" name="footerText" value={formData.footerText} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-sm font-bold mb-2" />
                    <textarea name="footerDesc" value={formData.footerDesc} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-xl text-xs h-16 resize-none" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Images & Logo */}
          <div className="space-y-4 pb-8">
            <h3 className="font-bold text-indigo-300 border-b border-slate-800 pb-2">4. โลโก้ และ ภาพประกอบ</h3>

            <div>
              <label className="text-xs text-slate-400 mb-2 block">อัปโหลดโลโก้หน่วยงาน</label>
              <input type="file" onChange={handleLogoUpload} className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-900 file:text-indigo-100 hover:file:bg-indigo-800 file:cursor-pointer" />
            </div>

            <div className="pt-2">
              <label className="text-xs text-slate-400 mb-3 block">อัปโหลดภาพประกอบพื้นหลัง</label>
              <div className="grid grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(i => {
                  // ถ้าเป็นแบบเรขาคณิต ใช้แค่ภาพหลักภาพเดียว
                  if (formData.layoutId === "geometric-angles" && i > 0) return null;
                  return (
                    <div key={i} className="bg-slate-800 p-2 rounded-xl border border-slate-700 text-center relative group">
                      <div className="h-20 bg-slate-900 rounded-lg mb-2 overflow-hidden border border-slate-700">
                        <img src={coverImages[i].preview} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <input type="file" onChange={handleCoverImageUpload(i)} className="w-full text-[9px] text-slate-400 file:hidden absolute inset-0 opacity-0 cursor-pointer" title={`เปลี่ยนภาพที่ ${i + 1}`} />
                      <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-md pointer-events-none">คลิกเพื่อเปลี่ยนรูปที่ {i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= ขวา: พื้นที่วาดกระดาษ (Live Preview) ================= */}
      <div className="flex-1 bg-slate-950 flex justify-center items-start overflow-y-auto p-10 relative">
        <div
          className="page-a4 shadow-2xl relative"
          style={{ backgroundColor: theme.bg }}
        >
          {formData.layoutId === "grid-mosaic" && renderGridMosaic()}
          {formData.layoutId === "geometric-angles" && renderGeometricAngles()}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* ตกแต่ง Scrollbar ให้ดูดี */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.8); }

        /* การตั้งค่าหน้ากระดาษ A4 */
        .page-a4 { 
          width: 210mm; 
          height: 297mm; /* บังคับความสูงสำหรับหน้าปกพอดีเป๊ะ */
          box-sizing: border-box; 
          font-family: 'Inter', 'Kanit', sans-serif; 
          position: relative; 
          overflow: hidden; /* ป้องกัน Shape ล้นขอบกระดาษ */
        }

        @media print {
          body > div > div:first-child { display: none !important; }
          .page-a4 { box-shadow: none; position: absolute; left: 0; top: 0; margin: 0; }
          .bg-slate-950 { background: none; }
        }
        `
      }} />
    </div>
  );
}
// ==========================================
// 🚀 Component หลักที่ Export (เอา Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function CoverBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดเครื่องมือออกแบบปก...</div>}>
      {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้ได้เลยครับ */}
      <CoverBuilderContent />
    </Suspense>
  );
}