import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ShoppingBag, DollarSign, Briefcase, BookOpen, Users, Radio, ShieldAlert, Truck, ChevronRight } from 'lucide-react';

export default function SchoolAdministrationPage() {
  // ข้อมูลการ์ดระบบบริหารงาน 7 ด้าน พร้อม link เส้นทาง Dashboard
  const adminSystems = [
    {
      id: 'planning',
      title: 'ระบบบริหารงานแผนงาน',
      enTitle: 'School E-planning system',
      icon: <FileText className="text-emerald-400" size={28} />,
      borderColor: 'border-emerald-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      bgColor: 'bg-emerald-950/20',
      description: 'บริหารแผนปฏิบัติการประจำปี, โครงการ, และตัวชี้วัด (KPI) ของสถานศึกษา',
      link: '/smartschool/planning' // 👈 ชี้ไปที่ Dashboard งานแผนงานตามที่คุณต้องการ
    },
    {
      id: 'procurement',
      title: 'ระบบบริหารงานพัสดุ',
      enTitle: 'School E-Procurement & Asset Management System',
      icon: <ShoppingBag className="text-blue-400" size={28} />,
      borderColor: 'border-blue-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
      bgColor: 'bg-blue-950/20',
      description: 'ระบบจัดซื้อจัดจ้าง, ลงทะเบียนครุภัณฑ์, แทงจำหน่าย, และตรวจนับพัสดุประจำปี',
      link: '/smartschool/procurement' // 👈 ชี้ไปที่ Dashboard งานพัสดุ
    },
    {
      id: 'financial',
      title: 'ระบบบริหารการเงินและบัญชี',
      enTitle: 'School Financial & Accounting Management System',
      icon: <DollarSign className="text-amber-400" size={28} />,
      borderColor: 'border-amber-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      bgColor: 'bg-amber-950/20',
      description: 'จัดการงบประมาณแผ่นดิน, เงินรายได้สถานศึกษา, และการออกใบเสร็จรับเงินอิเล็กทรอนิกส์',
      link: '/smartschool/finance' // 👈 ชี้ไปที่ Dashboard งานการเงิน
    },
    {
      id: 'general',
      title: 'ระบบบริหารงานทั่วไป',
      enTitle: 'School General Administration System',
      icon: <Briefcase className="text-cyan-400" size={28} />,
      borderColor: 'border-cyan-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(34,211,238,0.15)]',
      bgColor: 'bg-cyan-950/20',
      description: 'ศูนย์รวมงานบริหารจัดการโครงสร้างพื้นฐานและงานบริการในโรงเรียน',
      link: '/smartschool/general', // 👈 ชี้ไปที่ Dashboard งานทั่วไป
      subSystems: [
        { name: 'ระบบงานสารบรรณ (E-Official Correspondence)', icon: <FileText size={14} /> },
        { name: 'ระบบดูแลช่วยเหลือนักเรียน (E-Student Care)', icon: <ShieldAlert size={14} /> },
        { name: 'ระบบบริหารอาคารสถานที่และยานพาหนะ (E-Building & Vehicle)', icon: <Truck size={14} /> }
      ]
    },
    {
      id: 'academic',
      title: 'ระบบบริหารวิชาการ',
      enTitle: 'School E-Academic Management System',
      icon: <BookOpen className="text-violet-400" size={28} />,
      borderColor: 'border-violet-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]',
      bgColor: 'bg-violet-950/20',
      description: 'จัดการหลักสูตรสถานศึกษา, ตารางเรียนตารางสอน, บันทึกคะแนน และการวัดประเมินผล',
      link: '/smartschool/academic' // 👈 ชี้ไปที่ Dashboard วิชาการ
    },
    {
      id: 'personnel',
      title: 'ระบบบริหารงานบุคคล',
      enTitle: 'School E-Personnel Management System',
      icon: <Users className="text-pink-400" size={28} />,
      borderColor: 'border-pink-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(236,72,153,0.15)]',
      bgColor: 'bg-pink-950/20',
      description: 'บันทึกประวัติข้าราชการครูและบุคลากร (P-Spread/LOG), ประเมินวิทยฐานะ, และการลา',
      link: '/smartschool/personnel' // 👈 ชี้ไปที่ Dashboard งานบุคคล
    },
    {
      id: 'broadcasting',
      title: 'ระบบสถานีโทรทัศน์และเสียงตามสายดิจิทัล',
      enTitle: 'School Digital Broadcasting System',
      icon: <Radio className="text-rose-400" size={28} />,
      borderColor: 'border-rose-500/30',
      glowColor: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]',
      bgColor: 'bg-rose-950/20',
      description: 'ควบคุมระบบกระจายเสียงดิจิทัล, ประกาศข่าวสารภายใน และการจัดสตรีมมิ่งกิจกรรมโรงเรียน',
      link: '/smartschool/broadcasting' // 👈 ชี้ไปที่ Dashboard โสตทัศนศึกษา
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white p-4 md:p-8 font-sans">
      
      {/* HEADER ZONE */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          {/* ปุ่มส่งกลับหน้าหลักหลัก localhost:3000 */}
          <Link href="/">
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all flex items-center justify-center shadow-lg group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </Link>
          <div>
            <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">Management Hub</span>
            <h1 className="text-xl md:text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 mt-0.5">
              ระบบบริหารสถานศึกษา
            </h1>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Smart School Standard v1.0
          </span>
        </div>
      </div>

      {/* CARDS GRID ZONE */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {adminSystems.map((sys) => (
          <Link href={sys.link} key={sys.id} className="block group">
            <div
              className={`flex flex-col h-full bg-slate-900/40 backdrop-blur-md rounded-2xl border ${sys.borderColor} ${sys.glowColor} ${sys.bgColor} p-6 group-hover:scale-[1.02] group-hover:bg-slate-900/60 transition-all duration-300 relative overflow-hidden`}
            >
              {/* Upper Section */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 group-hover:bg-black/60 transition-colors">
                  {sys.icon}
                </div>
                <ChevronRight size={18} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>

              {/* Title Section */}
              <div className="mb-3">
                <h2 className="text-lg font-bold text-slate-100 leading-tight mb-1 group-hover:text-white transition-colors">
                  {sys.title}
                </h2>
                <p className="text-[11px] font-medium text-slate-400 font-mono tracking-wide uppercase">
                  {sys.enTitle}
                </p>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-400 font-medium leading-relaxed flex-1 group-hover:text-zinc-300 transition-colors">
                {sys.description}
              </p>

              {/* Sub-systems Rendering (For General Admin Item 4) */}
              {sys.subSystems && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
                  {sys.subSystems.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-cyan-400/80 font-bold bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5">
                      <span className="text-cyan-400">{sub.icon}</span>
                      <span className="truncate">{sub.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}