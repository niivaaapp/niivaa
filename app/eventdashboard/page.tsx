"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Sparkles, Plus, Briefcase, Users, FileText, 
  Award, PartyPopper, Trophy, Flame, Heart, 
  GraduationCap, ShieldAlert, Music, FolderOpen, Calendar, Clock, MapPin, ArrowRight
} from 'lucide-react';

// 1. กำหนดประเภทงานทั้ง 11 Templates
const EVENT_TEMPLATES = [
  { id: 'seminar', name: 'การประชุมสัมมนาทางวิชาการ', icon: Briefcase, color: 'from-purple-500 to-indigo-500', recommended: true },
  { id: 'forum', name: 'งานเสวนาทางวิชาการ', icon: Users, color: 'from-blue-500 to-cyan-500' },
  { id: 'royal-ceremony', name: 'งานราชพิธี/งานพิธี', icon: Award, color: 'from-amber-500 to-yellow-600' },
  { id: 'congrats', name: 'งานพิธีต้อนรับ/แสดงความยินดี', icon: PartyPopper, color: 'from-pink-500 to-rose-500' },
  { id: 'sports', name: 'พิธีเปิด-ปิดการแข่งขันกีฬา', icon: Trophy, color: 'from-emerald-500 to-teal-500' },
  { id: 'project-launch', name: 'พิธีเปิดโครงการ/กิจกรรม', icon: Flame, color: 'from-orange-500 to-amber-500' },
  { id: 'wedding', name: 'งานแต่งงาน', icon: Heart, color: 'from-red-400 to-pink-500' },
  { id: 'ordination', name: 'งานบวช', icon: GraduationCap, color: 'from-yellow-500 to-amber-600' },
  { id: 'funeral', name: 'งานศพ', icon: ShieldAlert, color: 'from-zinc-600 to-zinc-800' },
  { id: 'merit-making', name: 'งานพิธีทำบุญ', icon: FileText, color: 'from-indigo-400 to-purple-600' },
  { id: 'concert', name: 'งานจัดแสดงดนตรี', icon: Music, color: 'from-violet-500 to-fuchsia-500' },
];

export default function SmartEventWelcomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateSection, setShowCreateSection] = useState(false);
  
  // 🎯 [เพิ่มสถานะใหม่] สำหรับเก็บประวัติรายการอีเวนต์ทั้งหมดที่ผู้ใช้รายนี้เคยบันทึกสร้างไว้
  const [savedEvents, setSavedEvents] = useState<any[]>([]);

  // ตรวจสอบสิทธิ์รักษา Session และดึงข้อมูลประวัติโครงการเก่าจาก DB
  useEffect(() => {
    const checkUserAndFetchEvents = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/'); // ไม่มีสิทธิ์ ดีดกลับหน้าแรก
        return;
      }
      
      setUser(user);

      // 📥 🚀 [จุดดึงข้อมูลสำคัญ] ทะลวงดึงรายชื่ออีเวนต์ที่เคยเซฟไว้ทั้งหมดของ User ท่านนี้ เรียงตามวันที่สร้างล่าสุด
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && eventsData) {
        setSavedEvents(eventsData);
      }

      setLoading(false);
    };

    checkUserAndFetchEvents();
  }, [router]);

  // ฟังก์ชันจังหวะคลิกการ์ดเทมเพลตเพื่อสร้างอีเวนต์แถวใหม่ (Draft)
  const handleSelectTemplate = async (templateId: string) => {
    if (actionLoading) return;

    if (templateId !== 'seminar') {
      alert(`Template "${templateId}" อยู่ในระหว่างจัดเตรียมข้อมูลคิวงานมาตรฐานครับ`);
      return;
    }

    try {
      setActionLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("เซสชันหลุด กรุณาเข้าสู่ระบบใหม่อีกครั้งครับ");
        return;
      }

      const todayString = new Date().toISOString().split('T')[0];

      // สร้างแถวแม่ดราฟต์จองพื้นที่ส่งจังหวัดและอำเภอตั้งต้นกันบั๊ก Not-Null
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert([{
          user_id: session.user.id,
          title: 'กำลังกำหนดชื่องานสัมมนาใหม่...',
          status: 'draft',
          category: templateId, 
          event_date: todayString,
          start_time: '09:00',
          location_district: 'เมืองสุรินทร์',
          location_province: 'สุรินทร์'
        }])
        .select()
        .single();

      if (error) throw error;

      // พุ่งตัวเข้าหน้าสถาปัตยกรรมข้อมูล 16 ฝ่ายพร้อมส่ง ID แม่แนบ URL ทันที
      router.push(`/eventdashboard/create/${templateId}?event_id=${newEvent.id}`);

    } catch (error: any) {
      console.error("Error generating event ID:", error.message);
      alert(`ไม่สามารถจัดเตรียมกระดานงานได้: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 🎯 ฟังก์ชันช่วยแปลงชื่อคีย์ภาษาอังกฤษของเทมเพลตกลับมาเป็นภาษาไทยเพื่อแสดงบนกล่องประวัติ
  const getCategoryThaiName = (cat: string) => {
    return EVENT_TEMPLATES.find(t => t.id === cat)?.name || 'กิจกรรมทั่วไป';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-purple-400 font-bold animate-pulse text-sm">
        กำลังเชื่อมต่อระบบ คลังข้อมูลคิวงาน NIIVAA Smart Event...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0b0f19] to-[#020617] text-white p-6 select-none font-sans">
      <div className="max-w-5xl w-full mx-auto space-y-10 py-6">
        
        {/* ส่วนหัว: แสดงแบรนด์ของระบบร่วมกับผู้ใช้งาน */}
        <div className="flex justify-between items-center border-b border-purple-500/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs tracking-widest bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              NIIVAA SMART EVENT
            </span>
            <span className="text-zinc-600 text-xs">|</span>
            <span className="text-zinc-400 text-xs font-bold">ผู้ดูแลงาน: {user?.email}</span>
          </div>
          <button 
            onClick={() => router.push('/launchpad')} 
            className="text-xs text-purple-400 hover:text-purple-300 font-bold transition-colors"
          >
            ← กลับหน้า Launchpad
          </button>
        </div>

        {/* ส่วนต้อนรับหลัก (Hero Section) */}
        <div className="text-center space-y-4 max-w-2xl mx-auto py-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 text-[10px] font-black uppercase tracking-widest mx-auto">
            <Sparkles size={10} /> แพลตฟอร์มบริหารและกำกับเวทีอัจฉริยะรวมศูนย์
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none">
            ระบบจัดทำและ <span className="bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">ควบคุมโชว์ไทม์</span> หน้างาน
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            เข้าจัดระเบียบบทสคริปต์รายวัน จัดวางแปลนผังเก้าอี้ และตรวจประเมินผลความพร้อม 16 ฝ่ายภารกิจก่อนรันสถานการณ์จริง
          </p>

          <div className="pt-2">
            <button
              onClick={() => setShowCreateSection(!showCreateSection)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-black text-xs rounded-2xl shadow-lg shadow-purple-500/10 hover:scale-[1.02] transition-all"
            >
              <Plus size={14} strokeWidth={3} /> {showCreateSection ? 'ปิดกล่องเลือกเทมเพลต' : 'สร้างอีเวนต์ใหม่ตอนนี้'}
            </button>
          </div>
        </div>

        {/* 📋 โซนการเลือก Template (แสดง/ซ่อน สลับสวิตช์ตามปุ่มกด) */}
        {showCreateSection && (
          <div className="space-y-5 p-5 bg-zinc-900/20 border border-white/5 rounded-[30px] animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-center space-y-0.5">
              <h2 className="text-sm font-black text-purple-300">เลือกประเภทโครงสร้างอีเวนต์ที่ต้องการจัดตั้ง</h2>
              <p className="text-[10px] text-zinc-500">ระบบจะทำการสแกนแมตช์เช็กลิสต์และคิวงานมาตรฐานให้ผู้ดูแลทันที</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {EVENT_TEMPLATES.map((template) => {
                const IconComponent = template.icon;
                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className={`p-4 rounded-2xl bg-zinc-950/50 border ${template.recommended ? 'border-purple-500/30 hover:border-purple-400 shadow-md shadow-purple-500/5' : 'border-white/5 hover:border-zinc-700'} cursor-pointer flex items-center gap-4 group hover:bg-zinc-900 transition-all duration-200 ${actionLoading ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${template.color} text-white shadow-inner`}>
                      <IconComponent size={18} />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-xs font-black text-zinc-200 group-hover:text-white truncate">
                        {template.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {actionLoading && template.id === 'seminar' ? '⏳ กำลังเปิดกระดาน...' : template.recommended ? '✨ แนะนำเริ่มต้นใช้งาน' : 'โครงสร้างมาตรฐาน'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🎯 🎯 [โซนที่เพิ่มขึ้นมาใหม่ยักษ์] คลังประวัติแสดงผลการ์ดอีเวนต์ทั้งหมดที่เคยสร้างไว้ (SAVED EVENTS RECORDS) */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <FolderOpen size={16} className="text-indigo-400" />
            <h2 className="text-sm font-black text-zinc-200 uppercase tracking-wider">คลังข้อมูลโครงการจัดตั้งทั้งหมดของคุณ ({savedEvents.length} อีเวนต์)</h2>
          </div>

          {savedEvents.length === 0 ? (
            /* เคสไม่มีข้อมูลสำรองเลย */
            <div className="p-12 bg-zinc-900/10 border border-dashed border-white/5 rounded-3xl text-center space-y-2">
              <p className="text-xs font-bold text-zinc-500">ยังไม่พบโครงการที่เคยสร้างไว้ในประวัติระบบ</p>
              <p className="text-[10px] text-zinc-600">รบกวนคุณพี่คลิกที่ปุ่ม "สร้างอีเวนต์ใหม่ตอนนี้" ด้านบนเพื่อเริ่มปั้นโครงการแรกเข้าสู่คลังระบบครับ</p>
            </div>
          ) : (
            /* เคสสตรีมข้อมูลขึ้นการ์ดลิสสำเร็จ พร้อมเชื่อมลิ้งก์กลับตัวจริง */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {savedEvents.map((event) => (
                <div 
                  key={event.id}
                  className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between group hover:bg-zinc-900/80 shadow-md relative"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="bg-purple-950/60 text-purple-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-purple-500/10">
                        {getCategoryThaiName(event.category)}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded font-mono ${event.status === 'live' ? 'bg-red-950 text-red-400 border border-red-500/20' : 'bg-zinc-950 text-zinc-400'}`}>
                        {event.status === 'live' ? '🔴 LIVE MODE' : '📝 PRE-EVENT DRAFT'}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                      {event.title || 'งานสัมมนาวิชาการไม่ระบุชื่องาน'}
                    </h3>

                    {/* แสดงรายละเอียดไอเทมพิกัดกำกับสถานที่และเวลาเริ่ม */}
                    <div className="grid grid-cols-2 gap-y-1.5 text-[10px] font-bold text-zinc-500 border-t border-white/5 pt-3">
                      <div className="flex items-center gap-1.5 truncate">
                        <Calendar size={12} className="text-zinc-600" />
                        <span>{event.event_date ? new Date(event.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'ไม่ระบุวัน'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Clock size={12} className="text-zinc-600" />
                        <span>เริ่มเวลา: {event.start_time || '09:00'} น.</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2 truncate">
                        <MapPin size={12} className="text-zinc-600" />
                        <span>{event.location_district || 'อ.เมือง'} , {event.location_province || 'สุรินทร์'}</span>
                      </div>
                    </div>
                  </div>

                  {/* สวิตช์ปุ่มแตะทางลัด กระโดดเข้าสู่ฟอร์มเตรียมงานตัวจริงของโปรเจกต์นั้นโดยดึง ID จากแถว */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex gap-2">
                    <button
                      onClick={() => router.push(`/eventdashboard/create/${event.category || 'seminar'}?event_id=${event.id}`)}
                      className="flex-1 py-2 px-3 bg-zinc-950 border border-white/5 hover:border-purple-500 rounded-xl font-black text-[10px] text-zinc-300 hover:text-white flex items-center justify-center gap-1 transition-all"
                    >
                      🛠️ จัดการข้อมูล 16 ฝ่าย
                    </button>
                    
                    <button
                      onClick={() => router.push(`/eventdashboard/live?event_id=${event.id}`)}
                      className="py-2 px-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-black text-[10px] text-white flex items-center justify-center gap-1 transition-all"
                    >
                      คุมคิว Live <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}