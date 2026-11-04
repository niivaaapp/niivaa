"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Save, Calendar, MapPin, Building2, AlignLeft, ArrowLeft, Image as ImageIcon, Sparkles, Tag, Loader2 } from 'lucide-react';

function EditEventForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const eventId = searchParams.get('event_id');
  
  // 🌟 1. รับค่า source เพื่อพิจารณาการเปลี่ยนหน้า (hub หรือ dashboard)
  const source = searchParams.get('source');
  const returnUrl = source === 'hub' 
      ? `/officialeventdashboard/hub?event_id=${eventId}` 
      : `/events/event-dashboard/${eventId}`;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState<any>({});

  // 🌟 ดึงข้อมูลงานเดิมมาแสดง
  useEffect(() => {
    if (!eventId) {
      router.push('/events'); // ป้องกันกรณีคนพิมพ์ URL ผิด
      return;
    }

    const fetchEventData = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) throw error;

        // แปลงฟอร์แมตวันที่ให้รองรับกับ input type="date"
        if (data.event_date) {
          data.event_date = new Date(data.event_date).toISOString().split('T')[0];
        }
        
        setFormData(data);
      } catch (error) {
        console.error("Error fetching event:", error);
        setErrorMsg('ไม่พบข้อมูลงาน หรือเกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, router, supabase]);

  // 🌟 ฟังก์ชันจัดการเมื่อพิมพ์แก้ไขข้อมูล
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🌟 ฟังก์ชันบันทึกข้อมูลที่แก้ไข
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: formData.title,
          category: formData.category,
          brand_name: formData.brand_name,
          description: formData.description,
          event_date: formData.event_date,
          start_time: formData.start_time,
          location_hotel: formData.location_hotel,
          location_district: formData.location_district,
          location_province: formData.location_province,
          schedule_image_url: formData.schedule_image_url,
          venue_map_image_url: formData.venue_map_image_url,
        })
        .eq('id', eventId);

      if (error) throw error;

      alert('✅ บันทึกการแก้ไขข้อมูลงานสำเร็จ!');
      // 🌟 2. กลับไปหน้าที่กำหนดตาม source
      router.push(returnUrl); 
    } catch (error: any) {
      setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700/50">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
        <p className="text-slate-400">กำลังโหลดข้อมูลงานเดิม...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"></div>
      
      <div className="p-8 sm:p-10 space-y-12">
        {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
                {errorMsg}
            </div>
        )}

        {/* หมวดหมู่ 1: ข้อมูลหลัก */}
        <section className="relative">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-700/50 pb-3">
            <div className="bg-teal-500/20 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">1. แก้ไขข้อมูลหลักของงาน</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ชื่องาน (Event Title) <span className="text-teal-500">*</span></label>
              <input type="text" name="title" value={formData.title || ''} onChange={handleChange} required placeholder="เช่น พิธีต้อนรับผู้อำนวยการ..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ประเภทของงาน (Category)</label>
              <div className="relative">
                <Tag className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <select name="category" value={formData.category || 'farewell_welcome'} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner appearance-none">
                    <option value="farewell_welcome">งานพิธีแสดงความยินดี / การต้อนรับ</option>
                    <option value="official">งานรัฐพิธี / พิธีการทางการ</option>
                    <option value="seminar">งานสัมมนา / การประชุม</option>
                    <option value="wedding">งานแต่งงาน</option>
                    <option value="sport">การแข่งขันกีฬา</option>
                    <option value="other">อื่นๆ</option>
                </select>
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">หน่วยงานผู้จัด (Host)</label>
              <div className="relative">
                <Building2 className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <input type="text" name="brand_name" value={formData.brand_name || ''} onChange={handleChange} placeholder="เช่น สำนักงานเขตพื้นที่การศึกษา..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
              </div>
            </div>

            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ชื่อแอดมินผู้รับผิดชอบ / คำอธิบาย</label>
              <input type="text" name="description" value={formData.description || ''} onChange={handleChange} placeholder="ระบุชื่อหรือเบอร์ติดต่อแอดมิน" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
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
              <input type="date" name="event_date" value={formData.event_date || ''} onChange={handleChange} required className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner [color-scheme:dark]" />
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">เวลาเริ่มงาน</label>
              <input type="time" name="start_time" value={formData.start_time || ''} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner [color-scheme:dark]" />
            </div>

            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">สถานที่ (ห้อง/อาคาร/โรงแรม)</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <input type="text" name="location_hotel" value={formData.location_hotel || ''} onChange={handleChange} placeholder="เช่น ห้องประชุมทองทา โรงแรมทองธารินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">อำเภอ</label>
              <input type="text" name="location_district" value={formData.location_district || ''} onChange={handleChange} placeholder="เช่น เมืองสุรินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">จังหวัด</label>
              <input type="text" name="location_province" value={formData.location_province || ''} onChange={handleChange} placeholder="สุรินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
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
                <input type="url" name="schedule_image_url" value={formData.schedule_image_url || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
              </div>
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">URL คำสั่ง/รายชื่อคณะทำงาน</label>
              <div className="relative">
                <AlignLeft className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <input type="url" name="venue_map_image_url" value={formData.venue_map_image_url || ''} onChange={handleChange} placeholder="https://..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
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
              <Loader2 className="w-6 h-6 animate-spin" />
              กำลังบันทึกข้อมูล...
            </>
          ) : (
            <>
              <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
              บันทึกการแก้ไข
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// 🌟 2. คอมโพเนนต์หลักที่ทำหน้าที่แสดง UI พื้นหลัง
// 🌟 เปลี่ยนมาใช้การอ่าน source เพื่อทำปุ่มยกเลิก
export default function EditEventPage() {
  const router = useRouter();

  // สร้าง Component ย่อยมาดึง useSearchParams() เพื่อป้องกันปัญหา hydration
  const HeaderWithBackButton = () => {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event_id');
    const source = searchParams.get('source');
    const returnUrl = source === 'hub' 
      ? `/officialeventdashboard/hub?event_id=${eventId}` 
      : `/events/event-dashboard/${eventId}`;

    return (
      <div className="absolute left-0 top-0">
        <button onClick={() => router.push(returnUrl)} className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10">
          <ArrowLeft className="w-4 h-4 mr-2" /> ยกเลิก / กลับไปที่ Dashboard
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-teal-500/30">
      <div className="max-w-4xl mx-auto">
        
        {/* 🌟 Header Section */}
        <div className="mb-10 text-center relative">
          
          <Suspense fallback={<div></div>}>
            <HeaderWithBackButton />
          </Suspense>
          
          <div className="flex justify-center mb-6 mt-12 sm:mt-0">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(45,212,191,0.15)]">
               <img 
                 src="/niivaasmartevent_logo.png" 
                 alt="NiiVaa SmartEvent" 
                 className="h-10 w-auto object-contain drop-shadow-md"
               />
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 mb-3 flex items-center justify-center gap-3">
             แก้ไขโปรเจกต์งานอีเวนต์
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            ปรับปรุงข้อมูลพื้นฐานของงาน ข้อมูลจะถูกอัปเดตไปยังระบบและหน้าจอแสดงผลทั้งหมดโดยอัตโนมัติ
          </p>
        </div>

        {/* 🌟 แสดงฟอร์มที่ครอบด้วย Suspense */}
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700/50">
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
                <p className="text-slate-400">กำลังเตรียมหน้าต่างแก้ไขข้อมูล...</p>
            </div>
        }>
            <EditEventForm />
        </Suspense>

      </div>
    </div>
  );
}