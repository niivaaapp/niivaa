"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

import {
  BookOpen, LayoutGrid, Search, MessageSquare,
  Library, FileEdit, LayoutTemplate, Palette,
  ArrowLeft, Music, ArrowRight, Settings, Users, FileText, MonitorPlay,
  Mic2, MonitorSpeaker, ListChecks, Radio, Tv, LayoutDashboard, Activity,
  MessageSquareShare, LogOut, Edit3, Save, Loader2 // 🌟 รวม Import ให้ครบ
} from 'lucide-react';

export default function EventDashboardHub() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const supabase = createClient();

  const [eventInfo, setEventInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 State สำหรับระบบแก้ไขชื่องาน
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ฟังก์ชันสำหรับการออกจากระบบ
  const handleLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    }
  }; 

  useEffect(() => {
    if (!eventId) return;

    const fetchEventData = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) throw error;
        setEventInfo(data);
        setTempTitle(data.title || ''); // 🌟 เก็บชื่องานตั้งต้นไว้ใน State
      } catch (error) {
        console.error("Error fetching event:", error);
        alert("ไม่พบข้อมูลงาน หรือเกิดข้อผิดพลาด");
        router.push('/eventhub');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, router]);

  // 🌟 ฟังก์ชันบันทึกชื่องานใหม่ลงฐานข้อมูล
  const handleSaveTitle = async () => {
    if (!tempTitle.trim()) {
      alert('ชื่องานไม่สามารถเว้นว่างได้');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ title: tempTitle })
        .eq('id', eventId);

      if (error) throw error;

      // อัปเดตข้อมูลบนหน้าจอให้เป็นชื่อใหม่
      setEventInfo({ ...eventInfo, title: tempTitle });
      setIsEditingTitle(false);
      
    } catch (error: any) {
      console.error("Error updating title:", error.message);
      alert("ไม่สามารถอัปเดตชื่องานได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-teal-400 font-bold"><Loader2 className="w-8 h-8 animate-spin mr-2"/> กำลังโหลดศูนย์กลางงาน...</div>;
  }

  // ฟังก์ชันช่วยสร้างการ์ดเมนู
  const MenuCard = ({ href, icon: Icon, title, desc, colorClass }: any) => (
    <Link href={href} className="group relative bg-[#1e293b] border border-slate-700/50 rounded-2xl p-5 hover:border-teal-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(45,212,191,0.15)] hover:-translate-y-1 overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`}></div>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors`}>
          <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <h3 className="text-slate-200 font-bold text-base mb-1 group-hover:text-teal-300 transition-colors">{title}</h3>
          <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto">

        {/* 🌟 Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-[#1e293b]/50 p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500"></div>

          <div className="flex items-start gap-5 w-full md:w-auto">
            <Link href="/eventhub" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 mt-1 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 w-full max-w-2xl">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="bg-teal-500/20 text-teal-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-teal-500/30">
                  {eventInfo?.category || 'Farewell / Welcome'}
                </span>
                <Link href="/eventdashboard/pricing" className="group flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-xs px-2.5 py-1 rounded-md border border-slate-700 transition-colors cursor-pointer">
                  <span className="text-slate-300 group-hover:text-white transition-colors">Free Plan</span>
                  <span className="text-amber-400 text-[10px] underline decoration-amber-400/30">(ดูแพ็กเกจทั้งหมด)</span>
                </Link>
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Active
                </span>
              </div>
              
              {/* 🌟 ส่วนแก้ไขชื่องาน (Inline Editing) */}
              {isEditingTitle ? (
                <div className="flex items-center gap-2 mb-1 w-full mt-2">
                  <input
                    type="text"
                    autoFocus
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-teal-500 text-white text-xl sm:text-2xl font-black rounded-lg px-4 py-2 focus:outline-none focus:shadow-[0_0_15px_rgba(45,212,191,0.3)]"
                  />
                  <button 
                    onClick={handleSaveTitle} 
                    disabled={isSaving}
                    className="bg-teal-600 hover:bg-teal-500 text-white p-2.5 rounded-lg font-bold disabled:opacity-50 transition-colors shrink-0"
                    title="บันทึก"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => {
                        setIsEditingTitle(false);
                        setTempTitle(eventInfo?.title || '');
                    }} 
                    className="bg-slate-700 hover:bg-slate-600 text-white p-2.5 rounded-lg transition-colors shrink-0"
                    title="ยกเลิก"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3 group">
                  {eventInfo?.title || 'ไม่ได้ระบุชื่องาน'}
                  <button 
                    onClick={() => setIsEditingTitle(true)} 
                    className="text-slate-500 hover:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="แก้ไขชื่องาน"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                </h1>
              )}

              <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
                {eventInfo?.event_date ? new Date(eventInfo.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ยังไม่ระบุวันที่'}
                {eventInfo?.location_hotel ? ` • ณ ${eventInfo.location_hotel}` : ''}
              </p>
            </div>
          </div>

          {/* ส่วนขวาบน: โลโก้ + ปุ่ม Logout */}
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-slate-700/50 md:border-none pt-4 md:pt-0 mt-2 md:mt-0">
            <div className="hidden md:block bg-white/5 p-3 rounded-xl border border-white/10">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 w-auto object-contain opacity-80" />
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all font-bold text-sm"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* 🌟 Menu Grid Sections (ส่วนล่างคงเดิม) */}
        <div className="space-y-10">

          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <Settings className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-200">1. เตรียมความพร้อม (Preparation)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MenuCard
                href={`/eventdashboard/attendees?event_id=${eventId}`}
                icon={Users} title="ลงทะเบียน & จัดการแขก" colorClass="bg-amber-400"
                desc="ระบบจุดลงทะเบียนต้อนรับ และจัดการข้อมูลรายชื่อผู้เข้าร่วมงาน"
              />
              <MenuCard
                href={`/officialeventdashboard/script-builder?event_id=${eventId}`}
                icon={FileText} title="เตรียมสคริปต์พิธีกร" colorClass="bg-amber-400"
                desc="สร้างและจัดเรียงลำดับสคริปต์ ลำดับการเชิญแขกขึ้นเวที"
              />
              <MenuCard
                href={`/eventdashboard/media?event_id=${eventId}&source=smartevent`}
                icon={MonitorPlay}
                title="อัปโหลดคลังสื่อ"
                colorClass="bg-amber-400"
                desc="อัปโหลดภาพ พื้นหลัง วิดีโอ หรือสไลด์โชว์ที่ใช้ในงาน"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <Mic2 className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-slate-200">2. หน้าจอพิธีกร (MC Prompters)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MenuCard
                href={`/officialeventdashboard/mc-script?event_id=${eventId}`}
                icon={ListChecks} title="สคริปต์พิธีการ (Official)" colorClass="bg-teal-400"
                desc="หน้าจอสำหรับอ่านสคริปต์ทางการตามลำดับขั้นตอน"
              />
              <MenuCard
                href={`/eventdashboard/showtime/vip?event_id=${eventId}`}
                icon={MonitorSpeaker} title="แนะนำแขก (VIP Live)" colorClass="bg-teal-400"
                desc="หน้าจอสำหรับแนะนำประวัติแขก VIP (ส่งภาพโปรไฟล์ออกจอ Live ได้)"
              />
              <MenuCard
                href={`/eventdashboard/showtime/mc_prompter?event_id=${eventId}`}
                icon={Radio} title="อ่านรายชื่อ (ETA Mode)" colorClass="bg-teal-400"
                desc="โหมดอ่านรายชื่อจำนวนมากแบบรวดเร็ว พร้อมแสดงเวลาถึงคิว"
              />
              <MenuCard
                href={`/eventdashboard/showtime/script?event_id=${eventId}`}
                icon={FileText} title="สคริปต์พิธีการ (EDIT)" colorClass="bg-teal-400"
                desc="โหมดอ่านสคริปต์ที่สามารถแก้ไขข้อความเฉพาะหน้าได้"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <LayoutDashboard className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-slate-200">3. ศูนย์ควบคุม (SM Control Room)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MenuCard
                href={`/officialeventdashboard?event_id=${eventId}`}
                icon={Activity} title="Live Operation Monitor" colorClass="bg-cyan-400"
                desc="หน้าจอหลักของ SM สำหรับติดตามภาพรวมและสั่งการทุกระบบ"
              />
              <MenuCard
                href={`/officialeventdashboard/master-control?event_id=${eventId}`}
                icon={Tv} title="สับสวิตช์จอ (Master Control)" colorClass="bg-cyan-400"
                desc="ระบบเลือกสัญญาณภาพที่จะส่งขึ้นจอเวทีกลาง (Main Screen)"
              />
              <MenuCard
                href={`/eventdashboard/showtime/controller?event_id=${eventId}`}
                icon={MonitorPlay} title="ควบคุมสื่อและเกม" colorClass="bg-cyan-400"
                desc="ควบคุมการปล่อยภาพนิ่ง สไลด์ วิดีโอ หรือระบบโชว์ไทม์"
              />
              <MenuCard
                href={`/sm-control?event_id=${eventId}`}
                icon={MessageSquareShare} title="จัดการข้อความ (SMS)" colorClass="bg-cyan-400"
                desc="กลั่นกรองและจัดการข้อความอวยพรที่จะขึ้นจอ Marquee"
              />
              <MenuCard
                href={`/dj/${eventId}`}
                icon={Radio} title="DJ & Music Controller" colorClass="bg-cyan-400"
                desc="ค้นหาสื่อ/คัดลอก URL YouTube เพื่อฉายสื่อหรือเพิ่มเพลงเข้าคิว"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <Tv className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-bold text-slate-200">4. จอแสดงผลสาธารณะ (Public Displays)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MenuCard
                href={`/eventdashboard/main-screen/${eventId}`}
                icon={MonitorPlay} title="จอเวทีกลาง (Main Screen)" colorClass="bg-pink-400"
                desc="หน้าจอหลักบนเวทีสำหรับรับสัญญาณจาก Master Control"
              />
              <MenuCard
                href={`/eventdashboard/live/${eventId}`}
                icon={MonitorSpeaker} title="จอ Slideshow VIP" colorClass="bg-pink-400"
                desc="หน้าจอเฉพาะสำหรับเปิดวนภาพนิ่งและประวัติแขก VIP"
              />
              <MenuCard
                href={`/attendee-view?event_id=${eventId}`}
                icon={MessageSquareShare} title="จอผู้ร่วมงาน (Attendee View)" colorClass="bg-pink-400"
                desc="หน้าจอให้แขกตรวจสอบคิวและส่งข้อความ SMS ขึ้นจอ"
              />
              <MenuCard
                href={`/lyrics?event_id=${eventId}`}
                icon={Mic2} title="จอแสดงเนื้อเพลง" colorClass="bg-pink-400"
                desc="หน้าจอเสริมสำหรับแสดงเนื้อเพลงบนเวที"
              />
              <MenuCard
                href={`/eventdashboard/showtime/display?event_id=${eventId}`}
                icon={MonitorPlay} title="จอเวทีสื่อ/เกม (Showtime)" colorClass="bg-pink-400"
                desc="จอรับสัญญาณภาพที่ควบคุมโดย Showtime Controller"
              />
              <MenuCard
                href={`/eventdashboard/showtime/marquee?event_id=${eventId}`}
                icon={MessageSquareShare} title="จอข้อความวิ่ง (Marquee)" colorClass="bg-pink-400"
                desc="หน้าจอแสดงข้อความวิ่ง (ปรับฟอนต์, สี, เลื่อนขวา-ซ้าย-ล่าง-บน ได้)"
              />
              <MenuCard
                href={`/live/photo?event_id=${eventId}`}
                icon={MonitorPlay} title="จอผู้ร่วมงานส่งภาพ (Live Photo)" colorClass="bg-pink-400"
                desc="หน้าจอรับภาพจากแขกเพื่อขึ้นโชว์สไลด์พร้อม BGM (Background Music)"
              />
              <MenuCard
                href={`/eventdashboard/showtime/mc?event_id=${eventId}`}
                icon={MonitorSpeaker} title="จอพิธีกรบรรยายภาพ (MC Prompter)" colorClass="bg-pink-400"
                desc="หน้าจอให้ MC เลือก/คัดกรองภาพจากแขกเพื่อสั่งขึ้นจอเวทีพร้อมคำอธิบาย"
              />
              <MenuCard
                href={`/live?event_id=${eventId}`}
                icon={MessageSquare} title="จอมือถือเล่นเกม (Live Player)" colorClass="bg-pink-400"
                desc="หน้าจอสำหรับผู้ร่วมงานส่งคำตอบเล่นเกม และมีส่วนร่วมกับกิจกรรมบนเวที"
              />
            </div>
          </section>
          
          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <LayoutDashboard className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-slate-200">5. จัดการสถานที่ & จัดเลี้ยง (Venue & Banquet)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MenuCard
                href={`/eventdashboard/venue/builder?event_id=${eventId}`}
                icon={LayoutGrid} title="ออกแบบผังงาน (Venue Builder)" colorClass="bg-orange-400"
                desc="วาดผังโต๊ะ เวที และสถานที่จัดเลี้ยงแบบอิสระ พร้อมจัดคิวแขก Walk-in"
              />
              <MenuCard
                href={`/eventdashboard/venue/meal-planner?event_id=${eventId}`}
                icon={Users} title="จัดโต๊ะแขก (Meal Planner)" colorClass="bg-orange-400"
                desc="ออกแบบการจัดโต๊ะและจัดสรรรายชื่อแขกลงโต๊ะอาหาร"
              />
              <MenuCard
                href={`/eventdashboard/venue/builder?event_id=${eventId}&guest=true`}
                icon={Search} title="ค้นหาที่นั่ง (Guest View)" colorClass="bg-orange-400"
                desc="หน้าจอสำหรับให้แขกผู้ร่วมงานค้นหาโต๊ะอาหารของตนเอง"
              />
              <MenuCard
                href={`/eventdashboard/showtime/seating?event_id=${eventId}`}
                icon={ListChecks} title="ตรวจสอบพิกัดที่นั่ง" colorClass="bg-orange-400"
                desc="ผู้ร่วมงานเช็คพิกัดที่นั่ง / โซนของตนเอง"
              />
              <MenuCard
                href={`/eventdashboard/showtime/seating?event_id=${eventId}`}
                icon={LayoutGrid} title="ระบบผังที่นั่งสัมมนา (Seating)" colorClass="bg-orange-400"
                desc="ระบบบริหารจัดการผังที่นั่งห้องประชุม สัมมนา และตรวจสอบพิกัด"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <Mic2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-slate-200">6. ระบบประธานจัดงาน & พิธีเปิด (Executive)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MenuCard
                href={`/eventdashboard/report-speech-scripts?event_id=${eventId}`}
                icon={FileText} title="ร่างคำกล่าวรายงาน (Report Script)" colorClass="bg-purple-400"
                desc="ระบบเตรียมสคริปต์คำกล่าวรายงานสำหรับประธานจัดงาน"
              />
              <MenuCard
                href={`/officialeventdashboard/report-teleprompter?eventId=${eventId}`}
                icon={Tv} title="จอประธานจัดงาน (Teleprompter)" colorClass="bg-purple-400"
                desc="จออ่านสคริปต์ (Teleprompter) สำหรับประธานจัดงานกล่าวรายงาน"
              />
              <MenuCard
                href={`/eventdashboard/gp-speech-scripts?event_id=${eventId}`}
                icon={FileText} title="ร่างคำกล่าวเปิด/ปิดงาน" colorClass="bg-purple-400"
                desc="ระบบเตรียมสคริปต์คำกล่าวเปิดและปิดงานสำหรับประธานในพิธี"
              />
              <MenuCard
                href={`/officialeventdashboard/grand-pressider-teleprompter?event_id=${eventId}`}
                icon={Tv} title="จอประธานในพิธี (Teleprompter)" colorClass="bg-purple-400"
                desc="จออ่านสคริปต์สำหรับประธานในพิธี (Grand Presider)"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
              <BookOpen className="w-5 h-5 text-rose-400" />
              <h2 className="text-lg font-bold text-slate-200">7. จัดทำรายงานของหน่วยงาน (Annual Report)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MenuCard
                href={`/events/event-dashboard/annual-report/manager?event_id=${eventId}`}
                icon={Library} title="จัดการเล่มรายงาน (Report Manager)" colorClass="bg-rose-400"
                desc="ระบบจัดการภาพรวมเอกสารและเนื้อหาทั้งหมดในเล่มรายงานของหน่วยงาน"
              />
              <MenuCard
                href={`/events/event-dashboard/annual-report/article?event_id=${eventId}`}
                icon={FileEdit} title="สร้างบทความ (Article Editor)" colorClass="bg-rose-400"
                desc="เขียนบทความสั้นพร้อมภาพประกอบ ระบบช่วยจัดรูปแบบเอกสารอัตโนมัติ"
              />
              <MenuCard
                href={`/events/event-dashboard/annual-report/cover-builder?event_id=${eventId}`}
                icon={LayoutTemplate} title="ออกแบบปก 1 (Cover Builder 1)" colorClass="bg-rose-400"
                desc="เครื่องมือสร้างหน้าปกเอกสารหรือรายงานแบบกำหนดเอง (รูปแบบที่ 1)"
              />
              <MenuCard
                href={`/events/event-dashboard/annual-report/cover-builder2?event_id=${eventId}`}
                icon={Palette} title="ออกแบบปก 2 (Cover Builder 2)" colorClass="bg-rose-400"
                desc="เครื่องมือออกแบบปกเอกสารพร้อมลูกเล่นเพิ่มเติม (รูปแบบที่ 2)"
              />
            </div>
          </section>

          <section className="mt-12 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-3xl -m-6 p-6 border border-blue-500/20"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-5 border-b border-blue-700/50 pb-2">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <Music className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-white">NiiVaa Workspace Ecosystem</h2>
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest ml-2 animate-pulse">
                  แนะนำ
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Link
                  href="/welcome"
                  className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] hover:-translate-y-1 overflow-hidden flex items-center justify-between"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="p-4 rounded-2xl bg-blue-950 border border-blue-800 group-hover:scale-110 transition-transform shadow-inner">
                      <Mic2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg mb-1 group-hover:text-blue-300 transition-colors">
                        จัดการสื่อ & คาราโอเกะอัจฉริยะ
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                        เข้าสู่ศูนย์คลังไอเดีย สื่อมัลติมีเดีย และระบบคาราโอเกะ <span className="text-emerald-400 font-bold">เปิดใช้งาน Free Plan ได้ทันที!</span>
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors relative z-10">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </Link>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}