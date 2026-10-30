'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { 
  Settings, Users, Mic, MonitorPlay, 
  FileText, ArrowLeft, Loader2, Calendar, LayoutDashboard, Crown, AlertCircle
} from 'lucide-react';

function EventHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 🌟 ดึงค่าจาก URL ด้วย Hook (รองรับ Next.js 15 100%)
  const eventId = searchParams.get('event_id');

  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setIsLoading(false);
      return;
    }

    const fetchEvent = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (data && !error) setEventData(data);
      setIsLoading(false);
    };

    fetchEvent();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-500">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-xl font-bold">กำลังโหลดศูนย์ควบคุมอีเวนต์...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">ไม่พบข้อมูลอีเวนต์</h1>
        <p className="text-gray-400 mb-6">กรุณาตรวจสอบลิงก์ หรือรหัส event_id อีกครั้ง</p>
        <button onClick={() => router.push('/')} className="px-6 py-2 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition">กลับหน้าหลัก</button>
      </div>
    );
  }

  // 🌟 ลอจิกเปิด/ปิดโมดูล
  const isOfficial = eventData.category === 'official';

  const modules = {
    mc_script: eventData.active_modules?.mc_script ?? true,
    mc_vip: eventData.active_modules?.mc_vip ?? true,
    phan_phum: eventData.active_modules?.phan_phum ?? isOfficial,
    sm_monitor: eventData.active_modules?.sm_monitor ?? true,
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-cyan-500/30 pb-20">
      
      {/* 🚀 HEADER */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <LayoutDashboard className="text-cyan-400" size={24} /> NiiVaa Event Hub
              </h1>
              <span className="text-xs text-cyan-500 font-bold tracking-widest uppercase">Central Control Panel</span>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-white/5">
            <Settings size={16} /> ตั้งค่าอีเวนต์
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* 🌟 Event Info Card */}
        <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden mb-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-3 inline-block border
                ${isOfficial ? 'bg-fuchsia-950/50 text-fuchsia-400 border-fuchsia-500/30' : 'bg-blue-950/50 text-blue-400 border-blue-500/30'}
              `}>
                {isOfficial ? '🏛️ งานรัฐพิธี (Official Event)' : '🎤 งานสัมมนาทั่วไป (General Event)'}
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2">{eventData.title}</h2>
              <div className="flex items-center gap-4 text-gray-400 font-medium text-sm">
                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-cyan-500"/> {eventData.event_date || 'ยังไม่กำหนดวันที่'}</span>
                <span className="flex items-center gap-1.5"><Users size={16} className="text-cyan-500"/> {eventData.brand_name || 'NiiVaa SmartEvent'}</span>
              </div>
            </div>
            
            <div className="text-right bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Event ID</p>
              <p className="font-mono text-cyan-400 text-sm">{eventId}</p>
            </div>
          </div>
        </div>

        {/* 🌟 Modules Grid */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-black text-white flex items-center gap-2">
             แผงควบคุมระบบ (Active Modules)
          </h3>
          <span className="text-sm font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-lg">เลือกระบบที่ต้องการเข้าใช้งาน</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* 1. ระบบควบคุมเวที SM */}
          {modules.sm_monitor && (
            <Link href={`/eventdashboard/hub?event_id=${eventId}`} className="group bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-blue-500/50 p-6 rounded-3xl transition-all hover:scale-[1.02] shadow-lg">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><MonitorPlay size={24} /></div>
              <h4 className="text-lg font-black text-white mb-1">Stage Monitor (SM)</h4>
              <p className="text-sm text-gray-400 font-medium line-clamp-2">หน้าจอผู้กำกับเวที ควบคุมคิวงาน ส่ง SMS แจ้งเตือนด่วนหาทุกจอ</p>
            </Link>
          )}

          {/* 2. สคริปต์พิธีการหลัก */}
          {modules.mc_script && (
            <Link href={`/eventdashboard/showtime/script?event_id=${eventId}`} className="group bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-emerald-500/50 p-6 rounded-3xl transition-all hover:scale-[1.02] shadow-lg">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><FileText size={24} /></div>
              <h4 className="text-lg font-black text-white mb-1">สคริปต์พิธีการ (Official)</h4>
              <p className="text-sm text-gray-400 font-medium line-clamp-2">Teleprompter อ่านสคริปต์บทพากย์หลักสำหรับพิธีกรบนเวที</p>
            </Link>
          )}

          {/* 3. ระบบอ่านรายชื่อ VIP */}
          {modules.mc_vip && (
            <Link href={`/eventdashboard/showtime/vip?event_id=${eventId}`} className="group bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-amber-500/50 p-6 rounded-3xl transition-all hover:scale-[1.02] shadow-lg">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Crown size={24} /></div>
              <h4 className="text-lg font-black text-white mb-1">รายชื่อแขก VIP</h4>
              <p className="text-sm text-gray-400 font-medium line-clamp-2">ระบบจัดคิวและหน้าจออ่านรายชื่อแขกผู้มีเกียรติ พร้อม ETA</p>
            </Link>
          )}

          {/* 4. สคริปต์พานพุ่ม */}
          {modules.phan_phum && (
            <Link href={`/officialeventdashboard/mc-view?eventId=${eventId}`} className="group bg-fuchsia-950/40 hover:bg-fuchsia-900/60 border border-fuchsia-900/50 hover:border-fuchsia-400/50 p-6 rounded-3xl transition-all hover:scale-[1.02] shadow-lg">
              <div className="w-12 h-12 bg-fuchsia-500/20 text-fuchsia-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Mic size={24} /></div>
              <h4 className="text-lg font-black text-white mb-1">สคริปต์วางพานพุ่ม</h4>
              <p className="text-sm text-fuchsia-200/60 font-medium line-clamp-2">รันคิวรายชื่อหน่วยงานวางพานพุ่ม พร้อมระบบเช็คอินสถานะ</p>
            </Link>
          )}

          {/* 5. ลงทะเบียนพานพุ่ม */}
          {modules.phan_phum && (
            <Link href={`/officialeventdashboard/phan-phum-registration?eventId=${eventId}`} className="group bg-slate-900/60 hover:bg-slate-800 border border-white/5 hover:border-purple-500/50 p-6 rounded-3xl transition-all hover:scale-[1.02] shadow-lg">
              <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users size={24} /></div>
              <h4 className="text-lg font-black text-white mb-1">ลงทะเบียนวางพานพุ่ม</h4>
              <p className="text-sm text-gray-400 font-medium line-clamp-2">จุดรับรายงานตัวหน่วยงาน และออกคิวลำดับพิธีการ</p>
            </Link>
          )}

        </div>

      </main>
    </div>
  );
}

// 🌟 ห่อหุ้มด้วย Suspense เพื่อป้องกัน Hydration Error ในการโหลด searchParams
export default function EventHubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-500">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    }>
      <EventHubContent />
    </Suspense>
  );
}