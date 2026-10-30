"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, CalendarPlus, Clock, Key, Users, Copy, 
  CheckCircle2, Plus, Server, Activity, Lock, ExternalLink, 
  Loader2, BookOpen, GraduationCap, ShieldCheck, ShieldAlert
} from 'lucide-react';

interface ExamSession {
  id: string;
  master_exam_id: string;
  session_name: string;
  start_time: string;
  end_time: string;
  pin_code: string;
  status: 'scheduled' | 'active' | 'closed';
  visibility: 'immediate' | 'delayed' | 'manual';
  require_token: boolean; // 🌟 1. เพิ่มฟิลด์ควบคุมการใช้ Token
  master_exam?: { 
    title: string; 
    total_score: number; 
    education_level: string; 
    subject_category: string;
    difficulty_level: string;
  };
}

export default function ExamSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [masterExams, setMasterExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    master_exam_id: '',
    session_name: '',
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '08:30',
    end_time: '09:30',
    pin_code: Math.floor(100000 + Math.random() * 900000).toString(), 
    visibility: 'delayed',
    require_token: false // 🌟 2. ค่าเริ่มต้นให้ปิดการใช้ Token ไว้ (เพื่อความสะดวก)
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // ดึงข้อสอบที่เผยแพร่แล้ว (ดึงข้อมูลให้ครบตามที่คุณต้องการ)
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title, total_score, education_level, subject_category, difficulty_level')
        .eq('creator_id', user.id)
        .eq('status', 'published');
      
      setMasterExams(examsData || []);

      // ดึงรอบสอบ (Sessions) ของครู
      const { data: sessionsData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select(`*, master_exam:exams(title, total_score, education_level, subject_category, difficulty_level)`)
        .eq('host_id', user.id)
        .order('start_time', { ascending: false });

      if (sessionError) {
        console.warn("ยังไม่ได้สร้างตาราง exam_sessions โหลด Mock Data แทน");
        generateMockSessions(examsData || []);
      } else {
        setSessions(sessionsData as ExamSession[]);
      }

    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockSessions = (exams: any[]) => {
    if (!exams || exams.length === 0) return;
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);

    setSessions([
      {
        id: 'sess-001', master_exam_id: exams[0].id, session_name: 'สอบกลางภาค ม.4/1',
        start_time: new Date(now.getTime() - 10 * 60000).toISOString(), end_time: new Date(now.getTime() + 50 * 60000).toISOString(),
        pin_code: '458912', status: 'active', visibility: 'delayed', require_token: true, master_exam: exams[0]
      },
      {
        id: 'sess-002', master_exam_id: exams[0].id, session_name: 'สอบกลางภาค ม.4/2',
        start_time: tomorrow.toISOString(), end_time: new Date(tomorrow.getTime() + 60 * 60000).toISOString(),
        pin_code: '998124', status: 'scheduled', visibility: 'delayed', require_token: false, master_exam: exams[0]
      }
    ]);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.master_exam_id) return alert("กรุณาเลือกแบบทดสอบต้นฉบับ");
    if (!formData.session_name) return alert("กรุณาตั้งชื่อรอบสอบ");

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const startDateTime = new Date(`${formData.exam_date}T${formData.start_time}:00`).toISOString();
      const endDateTime = new Date(`${formData.exam_date}T${formData.end_time}:00`).toISOString();

      const newSession = {
        host_id: user.id,
        master_exam_id: formData.master_exam_id,
        session_name: formData.session_name,
        start_time: startDateTime,
        end_time: endDateTime,
        pin_code: formData.pin_code,
        visibility: formData.visibility,
        require_token: formData.require_token, // 🌟 บันทึกการตั้งค่า Token ลงฐานข้อมูล
        status: 'scheduled'
      };

      const { data, error } = await supabase.from('exam_sessions').insert([newSession]).select(`*, master_exam:exams(title, total_score, education_level, subject_category, difficulty_level)`).single();
      
      if (error) {
        console.warn("จำลองการสร้าง Session (สำหรับ Demo)");
        const mockNewSession = { ...newSession, id: `sess-${Date.now()}`, master_exam: masterExams.find(ex => ex.id === formData.master_exam_id) };
        setSessions(prev => [mockNewSession as ExamSession, ...prev]);
      } else {
        setSessions(prev => [data as ExamSession, ...prev]);
      }

      setIsModalOpen(false);
      alert("สร้างรอบสอบสำเร็จ! สามารถส่งรหัส PIN ให้นักเรียนได้เลย");
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = (pin: string) => {
    const url = `${window.location.origin}/smartexam/enter?pin=${pin}`;
    navigator.clipboard.writeText(url);
    alert(`คัดลอกลิงก์และรหัสเข้าสอบ (PIN: ${pin}) เรียบร้อยแล้ว\nนำไปวางส่งให้นักเรียนได้เลย`);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> กำลังสอบ</span>;
      case 'scheduled': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> รอเปิดสอบ</span>;
      case 'closed': return <span className="bg-gray-500/20 text-gray-400 border border-gray-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Lock size={12}/> ปิดรับคำตอบ</span>;
      default: return null;
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="w-12 h-12 text-amber-500 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white pb-32">
      
      {/* HEADER */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/smartexam')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Server className="text-amber-500" /> ระบบจัดการรอบสอบ (Exam Sessions)
            </h1>
          </div>
          <button 
            onClick={() => {
              setFormData({ ...formData, pin_code: Math.floor(100000 + Math.random() * 900000).toString(), require_token: false });
              setIsModalOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20"
          >
            <Plus size={16} /> สร้างรอบสอบใหม่
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        
        {/* แนะนำระบบ */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
          <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 shrink-0"><Activity size={24} /></div>
          <div>
            <h2 className="text-lg font-bold text-blue-400 mb-1">สถาปัตยกรรมแบบรวมศูนย์ (Centralized Sessions)</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              การสร้างรอบสอบ (Session) มีไว้สำหรับดึงข้อสอบต้นฉบับไปเปิดห้องสอบออนไลน์ให้นักเรียนทำผ่านระบบ 
              หากคุณต้องการสอบย่อยแบบลงกระดาษ (Paper-based) ไม่จำเป็นต้องสร้าง Session ที่นี่ สามารถนำคะแนนดิบไปพิมพ์กรอกในหน้า ปพ.5 ได้เลย
            </p>
          </div>
        </div>

        {/* รายการรอบสอบ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => {
            const startDate = new Date(session.start_time);
            const endDate = new Date(session.end_time);
            return (
              <div key={session.id} className="bg-slate-900 border border-white/10 rounded-3xl p-6 flex flex-col transition-all hover:border-white/20 hover:shadow-xl hover:shadow-black/50 relative overflow-hidden">
                
                {/* 🌟 แสดง Badge การป้องกัน */}
                {session.require_token && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-lg z-10">
                    <ShieldCheck size={12}/> บังคับใช้ Token
                  </div>
                )}

                <div className="flex justify-between items-start mb-4">
                  {getStatusBadge(session.status)}
                  <div className="text-xs text-gray-500 font-mono mt-1">ID: {session.id.substring(0,8)}...</div>
                </div>

                <div className="mb-4 flex-1">
                  <h3 className="text-xl font-black text-white leading-tight mb-2">{session.session_name}</h3>
                  <div className="text-sm text-gray-400 flex flex-col gap-1.5 bg-slate-950 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 font-bold text-gray-300"><ExternalLink size={14}/> {session.master_exam?.title || "ข้อสอบไม่ระบุชื่อ"}</div>
                    
                    {/* 🌟 แสดงข้อมูลระดับชั้น วิชาย่อย และความยาก */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {session.master_exam?.education_level && <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded border border-blue-500/20">{session.master_exam.education_level}</span>}
                      {session.master_exam?.subject_category && <span className="bg-amber-500/10 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-amber-500/20">{session.master_exam.subject_category}</span>}
                      {session.master_exam?.difficulty_level && <span className="bg-white/5 text-gray-400 text-[10px] px-2 py-0.5 rounded border border-white/10">{session.master_exam.difficulty_level.split(' ')[0]}</span>}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl p-4 space-y-3 mb-6 border border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5"><CalendarPlus size={14}/> เวลาเริ่ม</span>
                    <span className="text-white font-medium">{startDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. ({startDate.toLocaleDateString('th-TH', {day:'numeric', month:'short'})})</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5"><Clock size={14}/> เวลาปิด</span>
                    <span className="text-white font-medium">{endDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                    <span className="text-gray-500 flex items-center gap-1.5"><Users size={14}/> ผู้เข้าสอบ</span>
                    <span className="text-amber-400 font-bold">รอระบบ...</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                  <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between p-3">
                    <div>
                      <div className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mb-0.5">PIN Code ห้องสอบ</div>
                      <div className="text-xl font-black text-white tracking-widest font-mono">{session.pin_code}</div>
                    </div>
                    <button onClick={() => handleCopyLink(session.pin_code)} className="p-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition-colors" title="คัดลอกลิงก์ส่งให้นักเรียน">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </main>

      {/* 🟢 MODAL: สร้างรอบสอบใหม่ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Server className="text-amber-500"/> เปิดห้องสอบใหม่ (New Session)</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleCreateSession} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">ชื่อรอบสอบ / ห้องสอบ <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.session_name} onChange={e => setFormData({...formData, session_name: e.target.value})} placeholder="เช่น สอบเก็บคะแนนท้ายบท ม.4/1" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">เลือกแบบทดสอบต้นฉบับ (Master Exam) <span className="text-red-500">*</span></label>
                <select required value={formData.master_exam_id} onChange={e => setFormData({...formData, master_exam_id: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500">
                  <option value="" disabled>-- เลือกข้อสอบจากคลังของคุณ --</option>
                  {masterExams.map(ex => (
                    <option key={ex.id} value={ex.id}>[{ex.education_level}] {ex.title} ({ex.total_score} คะแนน)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm text-gray-400 mb-1 block">วันที่สอบ</label>
                  <input type="date" value={formData.exam_date} onChange={e => setFormData({...formData, exam_date: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500" style={{colorScheme: 'dark'}} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-sm text-gray-400 mb-1 block">รหัส PIN เข้าสอบ</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" value={formData.pin_code} onChange={e => setFormData({...formData, pin_code: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-amber-400 font-bold tracking-widest focus:outline-none focus:border-amber-500 font-mono" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">เวลาเริ่ม</label>
                  <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500" style={{colorScheme: 'dark'}} />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">เวลาสิ้นสุด</label>
                  <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500" style={{colorScheme: 'dark'}} />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">การประกาศผลสอบให้นักเรียนรู้</label>
                <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value as any})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-sm">
                  <option value="immediate">⚡ แจ้งคะแนนทันทีเมื่อนักเรียนกดส่ง</option>
                  <option value="delayed">⏱️ ซ่อนคะแนนไว้ก่อน (แจ้งเมื่อหมดเวลาของทุกคน)</option>
                  <option value="manual">🔒 ซ่อนถาวร (รอครูประกาศหรือดึงลง ปพ.5)</option>
                </select>
              </div>

              {/* 🌟 3. สวิตช์เปิด/ปิด ระบบป้องกันการสอบแทนกัน (Token) */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 flex gap-3 items-start cursor-pointer hover:bg-purple-500/20 transition-colors" onClick={() => setFormData({...formData, require_token: !formData.require_token})}>
                <div className="mt-1">
                  <input type="checkbox" checked={formData.require_token} onChange={(e) => setFormData({...formData, require_token: e.target.checked})} className="w-4 h-4 accent-purple-500 cursor-pointer"/>
                </div>
                <div>
                  <h4 className="text-purple-400 font-bold text-sm flex items-center gap-1.5">
                    <ShieldCheck size={16}/> บังคับใช้รหัสผ่านรายบุคคล (Tokens)
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    หากเปิดใช้นักเรียนจะต้องกรอกรหัสผ่าน 4 หลักที่สุ่มมาจากหน้า <b>"สมุด ปพ.5"</b> ก่อนเข้าสอบ เหมาะสำหรับการสอบที่ต้องการป้องกันการทุจริตแอบอ้างชื่อเพื่อน <br/>
                    <span className="text-amber-500/80">(* สำหรับการสอบย่อยทั่วไปในห้องเรียน สามารถปิดฟังก์ชันนี้เพื่อให้นักเรียนเข้าสอบได้ไวขึ้น)</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>} ยืนยันเปิดห้องสอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Scrollbar สำหรับ Modal */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />

    </div>
  );
}