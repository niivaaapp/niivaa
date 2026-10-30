"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Sparkles, Plus, Briefcase, Users, FileText, 
  Award, PartyPopper, Trophy, Flame, Heart, 
  GraduationCap, ShieldAlert, Music, FolderOpen, Calendar, MapPin, ChevronRight, Loader2
} from 'lucide-react';

const EVENT_TEMPLATES = [
  { id: 'official', name: 'งานรัฐพิธี / พิธีการทางการ', icon: Award, color: 'from-blue-500 to-cyan-500', ready: true },
  { id: 'seminar', name: 'การประชุมสัมมนาทางวิชาการ', icon: Briefcase, color: 'from-teal-500 to-emerald-500', ready: true, recommended: true },
  { id: 'farewell_welcome', name: 'งานพิธีต้อนรับ / แสดงความยินดี', icon: PartyPopper, color: 'from-cyan-500 to-blue-500', ready: true },
  { id: 'wedding', name: 'งานแต่งงาน', icon: Heart, color: 'from-pink-500 to-rose-500', ready: false },
  { id: 'ordination', name: 'งานบวช', icon: GraduationCap, color: 'from-orange-500 to-amber-500', ready: false },
  { id: 'funeral', name: 'งานศพ', icon: ShieldAlert, color: 'from-slate-600 to-slate-800', ready: false },
  { id: 'merit_making', name: 'งานพิธีทำบุญ', icon: FileText, color: 'from-indigo-400 to-blue-500', ready: false },
  { id: 'concert', name: 'งานจัดแสดงดนตรี', icon: Music, color: 'from-violet-500 to-fuchsia-500', ready: false },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeType = searchParams.get('type');

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creatingEvent, setCreatingEvent] = useState(false); // 🌟 State สำหรับปุ่มสร้างงาน
  const [savedEvents, setSavedEvents] = useState<any[]>([]);

  const currentTemplateInfo = activeType ? EVENT_TEMPLATES.find(t => t.id === activeType) : null;

  useEffect(() => {
    const checkUserAndFetchEvents = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/'); 
        return;
      }
      setUser(user);

      let query = supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (activeType) {
        query = query.eq('category', activeType);
      }

      const { data: eventsData, error } = await query;

      if (!error && eventsData) {
        setSavedEvents(eventsData);
      }
      setLoading(false);
    };

    checkUserAndFetchEvents();
  }, [router, activeType]);

  const getCategoryThaiName = (cat: string) => {
    return EVENT_TEMPLATES.find(t => t.id === cat)?.name || 'กิจกรรมทั่วไป';
  };

  // 🌟 ฟังก์ชันพิเศษสำหรับ "สร้างงานรัฐพิธี (Official)" โดยเฉพาะ
  const handleCreateOfficialEvent = async () => {
    try {
      setCreatingEvent(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("กรุณาเข้าสู่ระบบ");

      const todayString = new Date().toISOString().split('T')[0];

      // สร้างร่าง (Draft) ลง Database อัตโนมัติ
      const { data: newEvent, error } = await supabase
        .from('events')
        .insert([{
          user_id: session.user.id,
          title: 'งานรัฐพิธี (ฉบับร่าง)',
          status: 'draft',
          category: 'official', 
          event_date: todayString,
        }])
        .select()
        .single();

      if (error) throw error;

      // สร้างสำเร็จ พุ่งตัวไปหน้า Official Hub ทันที
      router.push(`/officialeventdashboard/hub?event_id=${newEvent.id}`);

    } catch (error: any) {
      alert(`ไม่สามารถสร้างงานได้: ${error.message}`);
      setCreatingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center text-teal-400 font-bold animate-pulse text-sm">
        กำลังโหลดคลังข้อมูล NiiVaa Smart Event...
      </div>
    );
  }

  return (
    <div className="max-w-5xl w-full mx-auto space-y-10 py-6 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-teal-500/20 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-black text-xs tracking-widest bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            NIIVAA SMART EVENT
          </span>
          <span className="text-slate-600 text-xs">|</span>
          <span className="text-slate-400 text-xs font-bold">ผู้ดูแลงาน: {user?.email}</span>
        </div>
        <button 
          onClick={() => router.push('/eventhub')} 
          className="text-xs text-teal-400 hover:text-teal-300 font-bold transition-colors"
        >
          ← กลับหน้าเลือกประเภทงาน
        </button>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl mx-auto py-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-400 text-[10px] font-black uppercase tracking-widest mx-auto">
          <Sparkles size={10} /> แพลตฟอร์มบริหารและกำกับเวทีอัจฉริยะรวมศูนย์
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white">
          {activeType && currentTemplateInfo ? (
            <>ระบบจัดการ <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">{currentTemplateInfo.name}</span></>
          ) : (
            <>ระบบจัดทำและ <span className="bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">ควบคุมโชว์ไทม์</span> หน้างาน</>
          )}
        </h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          เข้าจัดระเบียบบทสคริปต์รายวัน จัดวางแปลนผังเก้าอี้ และตรวจประเมินผลความพร้อมก่อนรันสถานการณ์จริง
        </p>

        <div className="pt-2">
          {/* 🌟 เช็คปุ่มสร้างงาน: ถ้าเป็น Official ให้ทำงานแบบหนึ่ง ถ้าเป็นแบบอื่นให้ทำงานอีกแบบ */}
          {activeType === 'official' ? (
            <button
              onClick={handleCreateOfficialEvent}
              disabled={creatingEvent}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-black font-black text-sm rounded-2xl shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] transition-all hover:-translate-y-1 disabled:opacity-50"
            >
              {creatingEvent ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={3} />}
              สร้าง{currentTemplateInfo?.name || 'อีเวนต์'}ใหม่
            </button>
          ) : (
            <Link
              href={`/events/event-dashboard/create?category=${activeType || ''}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-black font-black text-sm rounded-2xl shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] transition-all hover:-translate-y-1"
            >
              <Plus size={16} strokeWidth={3} /> 
              {activeType && currentTemplateInfo ? `สร้าง${currentTemplateInfo.name}ใหม่` : 'สร้างอีเวนต์ใหม่ตอนนี้'}
            </Link>
          )}
        </div>
      </div>

      {/* คลังประวัติแสดงผลการ์ดอีเวนต์ */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2">
          <FolderOpen size={16} className="text-cyan-400" />
          <h2 className="text-sm font-black text-slate-200 uppercase tracking-wider">
            คลังข้อมูล{activeType && currentTemplateInfo ? currentTemplateInfo.name : 'โครงการจัดตั้งทั้งหมด'} ({savedEvents.length} อีเวนต์)
          </h2>
        </div>

        {savedEvents.length === 0 ? (
          <div className="p-12 bg-slate-900/40 border border-dashed border-slate-700 rounded-3xl text-center space-y-2">
            <p className="text-xs font-bold text-slate-500">ยังไม่พบโครงการ{activeType ? 'ประเภทนี้' : ''}ที่เคยสร้างไว้ในประวัติระบบ</p>
            <p className="text-[10px] text-slate-600">คลิกที่ปุ่มสร้างด้านบนเพื่อเริ่มปั้นโครงการเข้าสู่คลังระบบครับ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedEvents.map((event) => (
              /* 🌟 การ์ดกดได้ทั้งใบ (ชี้ URL ตามประเภทงาน) */
              <Link 
                href={activeType === 'official' || event.category === 'official' ? `/officialeventdashboard/hub?event_id=${event.id}` : `/events/event-dashboard/${event.id}`}
                key={event.id}
                className="bg-[#111827]/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between group hover:bg-[#1e293b]/80 shadow-md hover:shadow-[0_10px_30px_rgba(45,212,191,0.1)] hover:-translate-y-1 relative"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="bg-teal-950/60 text-teal-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-teal-500/20">
                      {getCategoryThaiName(event.category)}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded font-mono ${event.status === 'live' ? 'bg-amber-950 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                      {event.status === 'live' ? '🔴 LIVE MODE' : '📝 PRE-EVENT DRAFT'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2">
                      <h3 className="text-sm md:text-base font-black text-white line-clamp-1 group-hover:text-teal-300 transition-colors">
                        {event.title || 'ไม่ระบุชื่องาน'}
                      </h3>
                      <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-teal-600 flex items-center justify-center transition-colors shrink-0">
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-white" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 gap-y-1.5 text-[10px] font-bold text-slate-400 border-t border-slate-700/50 pt-3 mt-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar size={12} className="text-slate-500 shrink-0" />
                      <span>{event.event_date ? new Date(event.event_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : 'ไม่ระบุวัน'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin size={12} className="text-slate-500 shrink-0" />
                      <span className="truncate">{event.location_district || 'อ.เมือง'} , {event.location_province || 'สุรินทร์'}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SmartEventWelcomePage() {
  return (
    <div className="min-h-screen bg-[#0a1128] text-white p-6 select-none font-sans relative overflow-hidden">
      {/* Background Effects (Navy/Teal/Blue style) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <Suspense fallback={<div className="text-center text-teal-400 mt-20 animate-pulse">กำลังโหลดข้อมูล...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}