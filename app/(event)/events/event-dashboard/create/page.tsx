"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Save, Calendar, MapPin, Building2, AlignLeft, ArrowLeft, Image as ImageIcon, Sparkles, Tag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createEventAction } from './actions';

// 🌟 1. แยกคอมโพเนนต์ฟอร์มออกมา เพื่อให้รองรับ Suspense และการดึงค่า URL
function CreateEventForm() {
  const searchParams = useSearchParams();
  const defaultCategory = searchParams.get('category') || 'farewell_welcome'; 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const formData = new FormData(e.currentTarget);
    const result = await createEventAction(formData);

    if (result?.error) {
      setErrorMsg(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-3xl shadow-2xl border border-slate-700/50 overflow-hidden relative">
      {/* เอฟเฟกต์แสงตกแต่ง (แถบบนสุด) */}
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
            <h2 className="text-lg font-bold text-white tracking-wide">1. ข้อมูลหลักของงาน</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ชื่องาน (Event Title) <span className="text-teal-500">*</span></label>
              <input type="text" name="title" required placeholder="เช่น พิธีต้อนรับผู้อำนวยการ..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
            </div>
            
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ประเภทของงาน (Category)</label>
              <div className="relative">
                <Tag className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <select name="category" defaultValue={defaultCategory} className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner appearance-none">
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
                <input type="text" name="brand_name" placeholder="เช่น สำนักงานเขตพื้นที่การศึกษา..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
              </div>
            </div>

            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">ชื่อแอดมินผู้รับผิดชอบ / คำอธิบาย</label>
              <input type="text" name="description" placeholder="ระบุชื่อหรือเบอร์ติดต่อแอดมิน" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
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
              <input type="date" name="event_date" required className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner [color-scheme:dark]" />
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">เวลาเริ่มงาน</label>
              <input type="time" name="start_time" defaultValue="09:00" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner [color-scheme:dark]" />
            </div>

            <div className="md:col-span-2 group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">สถานที่ (ห้อง/อาคาร/โรงแรม)</label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <input type="text" name="location_hotel" placeholder="เช่น ห้องประชุมทองทา โรงแรมทองธารินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">อำเภอ</label>
              <input type="text" name="location_district" placeholder="เช่น เมืองสุรินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">จังหวัด</label>
              <input type="text" name="location_province" defaultValue="สุรินทร์" className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl px-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
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
                <input type="url" name="schedule_image_url" placeholder="https://..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
              </div>
            </div>
            <div className="group">
              <label className="block text-sm font-semibold text-slate-300 mb-2 group-focus-within:text-teal-400 transition-colors">URL คำสั่ง/รายชื่อคณะทำงาน</label>
              <div className="relative">
                <AlignLeft className="w-5 h-5 text-slate-500 absolute left-4 top-3.5 group-focus-within:text-teal-400 transition-colors" />
                <input type="url" name="venue_map_image_url" placeholder="https://..." className="w-full bg-slate-900/50 border border-slate-700 border-l-4 border-l-teal-500 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-400 transition-all shadow-inner" />
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
  );
}

// 🌟 2. คอมโพเนนต์หลักที่ทำหน้าที่แสดง UI พื้นหลัง และเช็คสิทธิ์ผู้ใช้ใหม่ (Guard)
export default function CreateEventPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  // ตรวจสอบสิทธิ์ (The Guard): ต้องมี Workspace ของ SmartEvent ก่อนถึงจะสร้างงานได้
  useEffect(() => {
    const checkWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?next=/events/event-dashboard/create');
        return;
      }

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .eq('service_code', 'SMART_EVENT')
        .maybeSingle();

      if (!workspace) {
        // 🛑 ถ้าไม่มีแพ็กเกจ/Workspace ให้เด้งไปหน้า Pricing อัตโนมัติ (ตาม Workflow)
        router.push('/eventdashboard/pricing');
      } else {
        setIsCheckingUser(false);
      }
    };

    checkWorkspace();
  }, [router, supabase]);

  if (isCheckingUser) {
    return (
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-teal-500 animate-spin mb-4" />
            <p className="text-slate-400">กำลังตรวจสอบพื้นที่ทำงาน...</p>
        </div>
    );
  }

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
          
          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-500 mb-3 flex items-center justify-center gap-3">
             สร้างโปรเจกต์งานอีเวนต์
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            ตั้งค่าข้อมูลพื้นฐานของงาน ระบบจะสร้าง Dashboard และเครื่องมือควบคุมทั้งหมดให้โดยอัตโนมัติ
          </p>
        </div>

        {/* 🌟 แสดงฟอร์มที่ครอบด้วย Suspense */}
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-[#1e293b] rounded-3xl border border-slate-700/50">
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
                <p className="text-slate-400">กำลังเตรียมแบบฟอร์ม...</p>
            </div>
        }>
            <CreateEventForm />
        </Suspense>

      </div>
    </div>
  );
}