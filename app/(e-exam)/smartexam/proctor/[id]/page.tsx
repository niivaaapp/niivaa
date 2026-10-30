"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShieldAlert, Users, MonitorPlay, WifiOff, CheckCircle2, 
  Search, AlertTriangle, ArrowLeft, RefreshCw, XCircle
} from 'lucide-react';

// โครงสร้างข้อมูลสถานะนักเรียนแบบ Real-time
interface ProctorStudent {
  studentId: string;
  name: string;
  status: 'online' | 'offline' | 'submitted';
  warnings: number; // จำนวนครั้งที่สลับแท็บ
  progress: number; // เปอร์เซ็นต์การทำข้อสอบ (เช่น 80%)
  lastActive: string;
}

export default function ProctorDashboard() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;

  // 🟢 จำลองข้อมูลนักเรียนในสนามสอบแบบ Real-time
  const [students, setStudents] = useState<ProctorStudent[]>([
    { studentId: "670101", name: "นาย สมชาย รักดี", status: 'online', warnings: 0, progress: 45, lastActive: '2 วินาทีที่แล้ว' },
    { studentId: "670102", name: "นางสาว สมหญิง ใจงาม", status: 'online', warnings: 2, progress: 80, lastActive: 'เพิ่งใช้งาน' },
    { studentId: "670103", name: "ด.ช. ต้นกล้า พากเพียร", status: 'submitted', warnings: 0, progress: 100, lastActive: 'ส่งแล้ว' },
    { studentId: "670104", name: "ด.ญ. ฟ้าใส ใฝ่รู้", status: 'offline', warnings: 0, progress: 10, lastActive: 'ขาดการเชื่อมต่อ 5 นาที' },
    { studentId: "670105", name: "นาย ธนา พาณิช", status: 'online', warnings: 5, progress: 95, lastActive: 'เพิ่งใช้งาน' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  // ฟังก์ชันบังคับส่งข้อสอบ (Force Submit)
  const handleForceSubmit = (studentId: string) => {
    if (confirm(`คุณต้องการบังคับส่งข้อสอบของรหัส ${studentId} ใช่หรือไม่?`)) {
      setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, status: 'submitted', progress: 100 } : s));
      // 🚀 ของจริง: ยิง API ไปเตะเด็กออกจากห้อง และเปลี่ยนสถานะใน DB
    }
  };

  // คำนวณสถิติ
  const total = students.length;
  const online = students.filter(s => s.status === 'online').length;
  const submitted = students.filter(s => s.status === 'submitted').length;
  const offline = students.filter(s => s.status === 'offline').length;
  const warnings = students.filter(s => s.warnings > 0).length;

  const filteredStudents = students.filter(s => s.name.includes(searchTerm) || s.studentId.includes(searchTerm));

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      
      {/* HEADER: ศูนย์บัญชาการ */}
      <nav className="w-full bg-slate-900 border-b border-red-500/20 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white"><ArrowLeft size={20}/></button>
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-lg text-red-500 animate-pulse"><MonitorPlay size={20}/></div>
            <div>
              <h1 className="font-black text-lg text-red-400 tracking-wide uppercase">Live Proctoring Center</h1>
              <p className="text-xs text-gray-500">ระบบควบคุมและเฝ้าระวังการสอบแบบเรียลไทม์</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right text-xs">
            <div className="text-gray-400">สถานะเซิร์ฟเวอร์</div>
            <div className="text-emerald-400 font-bold flex items-center justify-end gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Connected</div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* KPI: ภาพรวมสนามสอบ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <Users size={24} className="text-blue-400 mb-2"/>
            <div className="text-2xl font-black">{total}</div>
            <div className="text-xs text-gray-500 uppercase">ผู้เข้าสอบทั้งหมด</div>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2"><div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div></div>
            <div className="text-2xl font-black text-emerald-400">{online}</div>
            <div className="text-xs text-emerald-500/70 uppercase">กำลังทำข้อสอบ</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={24} className="text-gray-400 mb-2"/>
            <div className="text-2xl font-black">{submitted}</div>
            <div className="text-xs text-gray-500 uppercase">ส่งข้อสอบแล้ว</div>
          </div>
          <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
            <WifiOff size={24} className="text-gray-600 mb-2"/>
            <div className="text-2xl font-black text-gray-400">{offline}</div>
            <div className="text-xs text-gray-500 uppercase">หลุดการเชื่อมต่อ</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <ShieldAlert size={24} className="text-red-500 mb-2"/>
            <div className="text-2xl font-black text-red-500">{warnings}</div>
            <div className="text-xs text-red-400/80 uppercase">แจ้งเตือนสลับแท็บ</div>
          </div>
        </div>

        {/* ระบบค้นหาและจัดการ */}
        <div className="flex gap-4 items-center bg-slate-900 p-4 rounded-2xl border border-white/5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input type="text" placeholder="ค้นหาชื่อ หรือ รหัสนักเรียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-red-500 text-sm" />
          </div>
          <button className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold flex items-center gap-2"><RefreshCw size={16}/> รีเฟรช</button>
        </div>

        {/* ตารางแสดงสถานะนักเรียนแบบ Grid (เพื่อง่ายต่อการมองกวาดสายตา) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((s, idx) => {
            const isSuspicious = s.warnings >= 3;
            
            return (
              <div key={idx} className={`p-5 rounded-2xl border flex flex-col gap-4 relative overflow-hidden transition-all ${
                s.status === 'submitted' ? 'bg-slate-900 border-white/5 opacity-60' :
                s.status === 'offline' ? 'bg-slate-900 border-gray-600/50 grayscale' :
                isSuspicious ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-slate-900 border-emerald-500/30'
              }`}>
                
                {isSuspicious && s.status !== 'submitted' && (
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse flex items-center gap-1">
                    <AlertTriangle size={10}/> ทุจริต!
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-1">{s.studentId}</div>
                    <div className={`font-bold text-lg ${isSuspicious && s.status !== 'submitted' ? 'text-red-400' : 'text-white'}`}>{s.name}</div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1 ${
                    s.status === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                    s.status === 'submitted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-gray-500/20 text-gray-400 border border-gray-500/20'
                  }`}>
                    {s.status === 'online' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                    {s.status}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* ความคืบหน้าการทำข้อสอบ */}
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                      <span>ความคืบหน้า</span>
                      <span>{s.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
                      <div className={`h-full ${s.status === 'submitted' ? 'bg-blue-500' : 'bg-emerald-500'}`} style={{ width: `${s.progress}%` }}></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">การตอบสนอง: <span className="text-white">{s.lastActive}</span></span>
                    
                    {/* Badge เตือนสลับแท็บ */}
                    {s.warnings > 0 && (
                      <span className={`px-2 py-0.5 rounded font-bold ${isSuspicious ? 'bg-red-500 text-white' : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'}`}>
                        สลับแท็บ {s.warnings} ครั้ง
                      </span>
                    )}
                  </div>
                </div>

                {/* ปุ่มจัดการรายบุคคล */}
                {s.status !== 'submitted' && (
                  <div className="pt-3 border-t border-white/10 mt-auto flex gap-2">
                    <button className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold py-2 rounded-lg transition-colors border border-amber-500/20">
                      แจ้งเตือน
                    </button>
                    <button onClick={() => handleForceSubmit(s.studentId)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold py-2 rounded-lg transition-colors border border-red-500/20 flex items-center justify-center gap-1">
                      <XCircle size={14}/> บังคับส่ง
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
}