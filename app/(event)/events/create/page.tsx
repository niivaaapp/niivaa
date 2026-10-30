"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Save, Calendar, MapPin, Building2, AlignLeft, ArrowLeft, Image as ImageIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image'; // 🌟 นำเข้า Image component ของ Next.js

export default function CreateEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    brand_name: '', 
    event_date: '',
    start_time: '09:00',
    location_hotel: '', 
    location_district: '',
    location_province: 'สุรินทร์',
    description: '', 
    schedule_image_url: '', 
    venue_map_image_url: '', 
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.event_date) {
      alert("กรุณากรอกชื่องานและวันที่จัดงานให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            user_id: user?.id || null,
            title: formData.title,
            brand_name: formData.brand_name,
            event_date: formData.event_date,
            start_time: formData.start_time,
            location_hotel: formData.location_hotel,
            location_district: formData.location_district,
            location_province: formData.location_province,
            description: formData.description,
            schedule_image_url: formData.schedule_image_url,
            venue_map_image_url: formData.venue_map_image_url,
            category: 'farewell_welcome', 
            status: 'active',
            active_modules: {
               mc_vip: true, 
               mc_script: true, 
               phan_phum: false, 
               sm_monitor: true 
            }
          }
        ])
        .select('id')
        .single();

      if (error) throw error;

      // 🌟 [ปรับปรุง] ถ้าสร้างสำเร็จ ค่อยเด้งไปหน้า Hub
      if (data && data.id) {
        router.push(`/eventhub?event_id=${data.id}`); 
      }

    } catch (error: any) {
      console.error("Error creating event:", error);
      alert(`เกิดข้อผิดพลาดในการสร้างงาน: ${error.message}`);
      setIsSubmitting(false); // 🌟 [ปรับปรุง] คืนสถานะปุ่มเมื่อเกิด error
    } 
  };

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-teal-500/30">
      <div className="max-w-4xl mx-auto">
        
        {/* 🌟 Header Section */}
        <div className="mb-10 text-center relative">
          <div className="absolute left-0 top-0">
            <Link href="/eventhub" className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> ยกเลิก / กลับ
            </Link>
          </div>
          
          <div className="flex justify-center mb-6 mt-12 sm:mt-0">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(45,212,191,0.15)]">
               <img 
                 src="/niivaasmartevent_logo.png" 
                 alt="NiiVaa SmartEvent" 
                 className="h-10 w-auto object-contain drop-shadow-md"
               />
            </div>
          </div>
          
          {/* 🌟 เปลี่ยนสีข้อความเป็น Gradient เหลือบ เขียว Teal - น้ำเงิน Blue */}
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 mb-3 flex items-center justify-center gap-3">
             สร้างงานพิธีแสดงความยินดี
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            ตั้งค่าข้อมูลพื้นฐานสำหรับ (Farewell / Welcome Event) ระบบจะสร้าง Dashboard ศูนย์กลางให้โดยอัตโนมัติ
          </p>
        </div>

        {/* 🌟 Form Container */}
        <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden relative">
          {/* เอฟเฟกต์แสงตกแต่ง (แถบบนสุด) */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"></div>
          
          <div className="p-8 sm:p-10 space-y-12">
            
            {/* หมวดหมู่ 1: ข้อมูลหลัก */}
            <section className="relative">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-3">
                <div className="bg-teal-500/20 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-wide">1. ข้อมูลหลักของงาน</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="md:col-span-2 group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ชื่องาน (Event Title) <span className="text-teal-500">*</span></label>
                  {/* 🌟 เพิ่มขอบซ้ายสี Teal (border-l-4 border-l-teal-500) */}
                  <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="เช่น พิธีต้อนรับผู้อำนวยการ..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                </div>
                
                <div className="md:col-span-2 group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">หน่วยงานผู้จัด (Host Organization)</label>
                  <div className="relative">
                    <Building2 className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                    <input type="text" name="brand_name" value={formData.brand_name} onChange={handleChange} placeholder="เช่น สำนักงานเขตพื้นที่การศึกษา..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ชื่อแอดมินผู้รับผิดชอบ</label>
                  <input type="text" name="description" value={formData.description} onChange={handleChange} placeholder="ระบุชื่อหรือเบอร์ติดต่อแอดมิน" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                </div>
              </div>
            </section>

            {/* หมวดหมู่ 2: วันเวลาและสถานที่ */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-3">
                <div className="bg-teal-500/20 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-teal-400" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-wide">2. วันเวลา และสถานที่</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">วันที่จัดงาน <span className="text-teal-500">*</span></label>
                  <div className="relative">
                    <input type="date" name="event_date" value={formData.event_date} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner [color-scheme:dark]" />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">เวลาเริ่มงาน</label>
                  <input type="time" name="start_time" value={formData.start_time} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner [color-scheme:dark]" />
                </div>

                <div className="md:col-span-2 group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">สถานที่ (ห้อง/อาคาร/โรงแรม)</label>
                  <div className="relative">
                    <MapPin className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                    <input type="text" name="location_hotel" value={formData.location_hotel} onChange={handleChange} placeholder="เช่น ห้องประชุมทองทา โรงแรมทองธารินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">อำเภอ</label>
                  <input type="text" name="location_district" value={formData.location_district} onChange={handleChange} placeholder="เช่น เมืองสุรินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">จังหวัด</label>
                  <input type="text" name="location_province" value={formData.location_province} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                </div>
              </div>
            </section>

            {/* หมวดหมู่ 3: เอกสารแนบ */}
            <section>
              <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-3">
                <div className="bg-teal-500/20 p-2 rounded-lg">
                  <AlignLeft className="w-5 h-5 text-teal-400" />
                </div>
                <h2 className="text-lg font-bold text-white tracking-wide">3. เอกสารและข้อมูลอ้างอิง (Links)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">URL กำหนดการ (Schedule)</label>
                  <div className="relative">
                    <ImageIcon className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                    <input type="url" name="schedule_image_url" value={formData.schedule_image_url} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">URL คำสั่ง/รายชื่อคณะทำงาน</label>
                  <div className="relative">
                    <AlignLeft className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                    <input type="url" name="venue_map_image_url" value={formData.venue_map_image_url} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* 🌟 Footer & Submit Button */}
          <div className="bg-slate-900/80 p-6 sm:px-10 sm:py-8 border-t border-slate-700/50 flex flex-col-reverse sm:flex-row justify-end gap-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="group relative flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white rounded-xl font-black text-lg transition-all duration-300 shadow-[0_0_20px_rgba(45,212,191,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.5)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  กำลังสร้างระบบ...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  บันทึกและเริ่มต้นงาน
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}