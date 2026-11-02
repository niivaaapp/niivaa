import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarPlus, Calendar, MapPin, ChevronRight, LayoutGrid, Sparkles } from 'lucide-react';

export default async function EventDashboardPage({
  searchParams,
}: {
  searchParams: { category?: string; type?: string };
}) {
  const supabase = await createClient();
  
  const eventType = searchParams.category || searchParams.type || 'seminar'; 

  // 🛡️ 1. ยามด่านแรก: ตรวจสอบการล็อกอิน
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  // 🛡️ 2. ยามด่านสอง: ตรวจสอบ Workspace (หลักฐานการผ่านหน้า Welcome ชัวร์ที่สุด)
  // ❌ ลบการเช็ค profiles.package_tier ออก เพื่อแก้ปัญหาลูปเด้งกลับหน้า Pricing
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, workspace_name')
    .eq('owner_id', user.id)
    .eq('service_code', 'SMART_EVENT')
    .maybeSingle();

  if (!workspace) {
    redirect('/eventdashboard/pricing'); 
  }

  // 3. ดึง org_id ของผู้ใช้
  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();

  // 🌟 4. ดึงข้อมูล Events
  let query = supabase
    .from('events') 
    .select('id, title, event_date, location_hotel, location_province, status') 
    .eq('org_id', member?.org_id)
    .order('created_at', { ascending: false });

  if (eventType !== 'all' && eventType !== 'seminar' && eventType !== 'official' && eventType !== 'farewell_welcome') {
      // ป้องกัน Query แปลกๆ 
  } else if (eventType && eventType !== 'all') {
      query = query.eq('category', eventType);
  }

  const { data: events } = await query;
  const eventList = events || [];

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'farewell_welcome': return 'งานแสดงความยินดี / พิธีการ';
      case 'official': return 'งานรัฐพิธี';
      case 'seminar': return 'งานประชุมสัมมนา';
      case 'ordination': return 'งานอุปสมบท';
      case 'wedding': return 'งานมงคลสมรส';
      default: return 'งานอีเวนต์ทั้งหมด';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1128] text-white font-sans p-6 md:p-10 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400">
                <LayoutGrid size={24} />
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                {workspace.workspace_name || 'NiiVaa SmartEvent'}
              </h1>
            </div>
            <p className="text-slate-400 ml-14">จัดการข้อมูล {getEventTypeName(eventType)}</p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <Link 
                href={`/eventhub`} 
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500 px-5 py-3.5 rounded-xl font-bold transition-all"
              >
                ย้อนกลับ
              </Link>
            <Link 
              href={`/events/event-dashboard/create?category=${eventType}`} 
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-3.5 rounded-xl font-bold shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all hover:-translate-y-1"
            >
              <CalendarPlus size={20} />
              สร้างอีเวนต์ใหม่
            </Link>
          </div>
        </div>

        {eventList.length === 0 ? (
          <div className="bg-[#111827]/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 relative">
              <Sparkles className="absolute top-0 right-0 text-yellow-400 w-6 h-6 animate-pulse" />
              <Calendar className="text-slate-500 w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">ยังไม่มี{getEventTypeName(eventType)}</h3>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              เริ่มต้นสร้างโปรเจกต์งานของคุณ เพื่อเตรียมการ 16 ฝ่าย และจัดระบบสคริปต์
            </p>
            <Link 
              href={`/events/event-dashboard/create?category=${eventType}`} 
              className="bg-slate-800 hover:bg-slate-700 text-purple-400 border border-slate-700 hover:border-purple-500 px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              <CalendarPlus size={18} />
              สร้างงานแรกของคุณ
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventList.map((evt) => (
              <Link 
                href={`/events/event-dashboard/${evt.id}`} 
                key={evt.id}
                className="bg-[#111827]/80 backdrop-blur-xl border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 group transition-all duration-300 hover:shadow-[0_10px_30px_rgba(147,51,234,0.1)] hover:-translate-y-1 flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-purple-900/40 text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-800/50">
                    {evt.status === 'active' ? 'กำลังดำเนินการ' : 'ฉบับร่าง'}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-purple-600 flex items-center justify-center transition-colors">
                    <ChevronRight size={16} className="text-slate-400 group-hover:text-white" />
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors line-clamp-2">
                  {evt.title}
                </h3>
                
                <div className="mt-auto space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar size={14} className="text-slate-500" />
                    <span>{evt.event_date ? new Date(evt.event_date).toLocaleDateString('th-TH') : 'ยังไม่กำหนดวัน'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <MapPin size={14} className="text-slate-500" />
                    <span className="truncate">{evt.location_hotel || 'ยังไม่กำหนดสถานที่'}</span>
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