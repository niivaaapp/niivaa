import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { 
  LogOut, Crown, Home, BrainCircuit, Database, Settings, 
  PenTool, LayoutTemplate, MonitorCheck, Printer, BarChart4, 
  Search, UserCircle, UploadCloud, CalendarDays, ShieldAlert, 
  BookOpen, Award, Users 
} from 'lucide-react';

// 🌟 ย้าย MenuCard มาไว้ด้านนอก เป็น Server Component ธรรมดา
const MenuCard = ({ href, icon: Icon, title, desc, colorClass, disabled = false }: any) => (
  <Link href={disabled ? '#' : href} className={`block group ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
    <div className="h-full bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-600 transition-all duration-300 rounded-2xl p-6 shadow-lg hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] relative overflow-hidden">
      <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full ${colorClass.split(' ')[0].replace('text-', 'bg-')}`}></div>
      <div className="flex items-start gap-4 relative z-10">
        <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-inner ${colorClass}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-100 group-hover:text-white mb-1 transition-colors">
            {title} {disabled && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded ml-1 uppercase">Pro Only</span>}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  </Link>
);

export default async function SmartExamDashboardPage() {
  const supabase = await createClient();

  // 🌟 ด่านตรวจ 1: เช็ค Auth Session บน Server
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login?next=/smartexam/dashboard');
  }

  // 🌟 ด่านตรวจ 2: ดึงข้อมูล Workspace และสิทธิ์ผู้ใช้ในองค์กร
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, org_id')
    .eq('profile_id', user.id)
    .eq('app_id', 'c3333333-3333-3333-3333-333333333333') // APP_ID ของ SmartExam
    .maybeSingle();

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('workspace_name')
    .eq('owner_id', user.id) // หรือใช้ org_id หากระบบ Workspace ผูกกับองค์กร
    .eq('service_code', 'SMART_EXAM')
    .maybeSingle();

  if (!workspace) {
    redirect('/welcome?source=dashboard&app=exam');
  }

  // 🌟 ด่านตรวจ 3: เช็คแพ็กเกจการใช้งาน (Pricing Tier)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plans(tier, name)')
    .eq('org_id', userRole?.org_id)
    .eq('status', 'active')
    .maybeSingle();

  const currentTier = (subscription?.plans as any)?.tier || 'free';
  const planName = (subscription?.plans as any)?.name || 'Freemium Plan';
  
  // 🌟 ดึงข้อมูลข้อสอบล่าสุด เพื่อไปทำ Dynamic Link
  const { data: examData } = await supabase.from('exams').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const { data: sessionData } = await supabase.from('exam_sessions').select('id').eq('status', 'scheduled').order('created_at', { ascending: false }).limit(1).maybeSingle();
  
  const targetExamId = examData?.id || "create-new";
  const targetSessionId = sessionData?.id || "create-new";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans select-none relative overflow-x-hidden pb-12">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] pointer-events-none z-0"></div>
      
      {/* 🚀 STICKY HEADER */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <img src="/niivaa_smartexam_logo.png" alt="NiiVaa Logo" className="h-12 object-contain drop-shadow-md" />
            <div>
              {/* 🌟 แสดงชื่อ Workspace ของโรงเรียน */}
              <h1 className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 drop-shadow-sm">
                {workspace.workspace_name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-amber-500 font-bold tracking-widest uppercase text-[10px] drop-shadow-sm">
                  NiiVaa SmartExam
                </p>
                {/* 🌟 แสดงป้ายบอกสถานะแพ็กเกจ */}
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[9px] text-slate-300 font-bold uppercase">
                  {planName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            {currentTier === 'free' && (
              <Link href="/smartexam/pricing" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md">
                <Crown size={14} /> อัปเกรดแพ็กเกจ
              </Link>
            )}
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg">
              <UserCircle size={16} className="text-slate-400" />
              <span className="text-xs font-mono text-slate-300">ID: {user.id.substring(0, 8)}</span>
            </div>

            {/* 🌟 เปลี่ยนปุ่ม Logout เป็น Server Action Form (ทำงานได้โดยไม่ต้องใช้ 'use client') */}
            <form action={async () => {
              'use server';
              const sb = await createClient();
              await sb.auth.signOut();
              redirect('/login');
            }}>
              <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all shadow-md">
                <LogOut size={16} /> <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 mt-10 relative z-10 space-y-12">
        <section className="bg-gradient-to-r from-indigo-950/40 to-cyan-950/40 border border-indigo-500/20 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-white mb-2">สวัสดี, {user.user_metadata?.full_name || 'คุณครู'}</h2>
            <p className="text-sm text-slate-400">เข้าสู่ระบบคลังข้อสอบอัจฉริยะ จัดการสอบและวิเคราะห์ผลด้วย AI</p>
          </div>
          <Link href="/smartexam/create">
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105">
              <BrainCircuit size={18} /> เริ่มสร้างข้อสอบด้วย AI
            </button>
          </Link>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* 🌟 หมวดหมู่แอดมินองค์กร/โรงเรียน */}
          {userRole?.role === 'admin' && (
            <div className="md:col-span-12 space-y-4">
              <div className="flex items-center gap-2 border-b border-rose-900/50 pb-2 mb-4">
                <ShieldAlert className="text-rose-400" size={20} />
                <h2 className="text-lg font-bold text-rose-200">ส่วนจัดการสำหรับผู้บริหารโรงเรียน (Admin)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MenuCard href="/smartexam/admin/members" icon={Users} title="จัดการสมาชิกในโรงเรียน" desc="เชิญครู เพิ่มนักเรียน และกำหนดสิทธิ์การเข้าถึงข้อมูล" colorClass="text-rose-400" />
                <MenuCard href="/smartexam/admin/billing" icon={Crown} title="จัดการแพ็กเกจและบิล" desc="ดูประวัติการชำระเงิน และอัปเกรดความจุระบบ" colorClass="text-fuchsia-400" />
              </div>
            </div>
          )}

          {/* 🌟 หมวดหมู่ 1: จัดการคลังและแบบทดสอบ (Bank & Builder) */}
          <div className="md:col-span-12 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
              <Database className="text-cyan-400" size={20} />
              <h2 className="text-lg font-bold text-slate-200">ระบบคลัง และ การจัดชุดสอบ (Bank & Builder)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MenuCard href="/smartexam" icon={Search} title="หน้าหลักคลังข้อสอบ" desc="ภาพรวมการสร้างแบบทดสอบ จัดหมวดหมู่ และฝึกทดสอบ" colorClass="text-cyan-400" />
              <MenuCard href="/smartexam/create" icon={BrainCircuit} title="AI สร้างข้อสอบ" desc="สร้างข้อสอบด้วย AI (เนื้อหา/ภาพ/หัวข้อ)" colorClass="text-indigo-400" />
              <MenuCard href="/smartexam/import" icon={UploadCloud} title="อัปโหลดข้อสอบ PDF" desc="นำเข้าข้อสอบจากไฟล์ PDF หรือ รูปภาพข้อสอบเข้าสู่ระบบ" colorClass="text-blue-400" />
              <MenuCard href="/smartexam/bank" icon={Database} title="จัดการคลังข้อสอบ" desc="เรียกดู จัดเรียง และกรองข้อสอบทั้งหมดในฐานข้อมูลของคุณ" colorClass="text-emerald-400" />
              <MenuCard href={`/smartexam/edit/${targetExamId}`} icon={PenTool} title="แก้ไขชุดข้อสอบล่าสุด" desc="เพิ่ม ลบ แก้ไข ข้อสอบภายในชุดนี้ก่อนดำเนินการจัดสอบ" colorClass="text-orange-400" />
              
              <MenuCard 
                href="/smartexam/builder" 
                icon={LayoutTemplate} 
                title="จัดชุดสนามสอบ" 
                desc="จัดชุดสอบออนไลน์ (เฉพาะ Pro/Premium)" 
                colorClass="text-amber-400" 
                disabled={currentTier === 'free'} // ล็อกฟีเจอร์ถ้าเป็นสายฟรี
              />
              
              <MenuCard href={`/smartexam/print/${targetExamId}`} icon={Printer} title="Print Preview ข้อสอบ" desc="หน้าจัดการสำหรับจัดหน้าข้อสอบเพื่อสั่งพิมพ์ลงกระดาษ (PDF)" colorClass="text-slate-300" />
            </div>
          </div>

          {/* 🌟 หมวดหมู่ 2: ดำเนินการจัดสอบและควบคุมห้องสอบ (Sessions & Proctoring) */}
          <div className="md:col-span-12 space-y-4 mt-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
              <Settings className="text-purple-400" size={20} />
              <h2 className="text-lg font-bold text-slate-200">ดำเนินการจัดสอบและควบคุมห้องสอบ</h2>
              <span className="ml-auto text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                Active ID: {targetSessionId !== "create-new" ? targetSessionId.substring(0, 8) : "N/A"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MenuCard href="/smartexam/sessions" icon={CalendarDays} title="ระบบจัดรอบการสอบ" desc="สร้างและจัดการตารางการสอบ กำหนด PIN Code สำหรับผู้สอบ" colorClass="text-fuchsia-400" />
              <MenuCard href={`/smartexam/${targetSessionId}`} icon={MonitorCheck} title="ระบบเข้าห้องสอบ (Live)" desc="หน้านักเรียนระบุตัวตน เข้าสู่รอบสอบที่กำลังเปิดรับในขณะนี้" colorClass="text-blue-400" />
              <MenuCard href={`/smartexam/proctor/6767af28-4b46-4099-a010-08aa50b836fa`} icon={ShieldAlert} title="Proctoring Dashboard" desc="สำหรับกรรมการคุมสอบ ดูสถานะผู้เข้าสอบแบบ Real-time" colorClass="text-rose-400" />
            </div>
          </div>

          {/* 🌟 หมวดหมู่ 3: ระบบประเมินและวิเคราะห์ผล (Analytics & Gradebook) */}
          <div className="md:col-span-12 space-y-4 mt-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
              <BarChart4 className="text-emerald-400" size={20} />
              <h2 className="text-lg font-bold text-slate-200">ระบบประเมินและวิเคราะห์ผล (Gradebook)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MenuCard href={`/smartexam/results/${targetExamId}`} icon={BarChart4} title="วิเคราะห์ผลการสอบ" desc="ดูภาพรวมรายบุคคล และการวิเคราะห์ค่าความยากง่ายรายข้อ" colorClass="text-emerald-400" />
              <MenuCard href="/smartexam/gradebook" icon={BookOpen} title="ปพ.5 (ส่วนคะแนน)" desc="สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน ส่วนการจัดเก็บคะแนน" colorClass="text-amber-400" />
              <MenuCard href="/smartexam/gradebook2" icon={Award} title="ปพ.5 (ส่วนประเมิน)" desc="บันทึกและสุ่มประเมิน สมรรถนะ คุณลักษณะ และ อ่านคิดเขียน" colorClass="text-indigo-400" />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}