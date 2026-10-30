"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Search, Play, Users, BookOpen, Calculator, FlaskConical,
  Globe, Star, Flame, Clock, Compass, ArrowLeft, CheckCircle2, LayoutDashboard
} from 'lucide-react';

interface PublicExam {
  id: string;
  title: string;
  subject: string;
  level: string;
  questionsCount: number;
  authorName: string;
  playCount: number;
  isOfficial: boolean;
  date: string;
}

const getSubjectIcon = (subjectName: string) => {
  if (subjectName.includes('วิทย์') || subjectName.includes('ฟิสิกส์') || subjectName.includes('เคมี') || subjectName.includes('ชีว')) return <FlaskConical size={16} />;
  if (subjectName.includes('คณิต')) return <Calculator size={16} />;
  if (subjectName.includes('อังกฤษ') || subjectName.includes('ภาษาจีน') || subjectName.includes('ภาษาญี่ปุ่น')) return <Globe size={16} />;
  return <BookOpen size={16} />;
};

export default function ExplorePage() {
  const router = useRouter();
  const [exams, setExams] = useState<PublicExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'trending' | 'official' | 'new'>('all');

  useEffect(() => {
    fetchPublicExams();
  }, []);

  const fetchPublicExams = async () => {
    try {
      // 🌟 ดึงเฉพาะข้อสอบที่ is_public = true และ status = 'published'
      const { data, error } = await supabase
        .from('exams')
        .select(`id, title, subject_category, education_level, author_name, play_count, is_official, created_at, exam_questions (count)`)
        .eq('is_public', true)
        .eq('status', 'published')
        .order('play_count', { ascending: false }) // เรียงตามความนิยมเป็นหลัก
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted: PublicExam[] = data.map((ex: any) => ({
          id: ex.id,
          title: ex.title,
          subject: ex.subject_category || 'ทั่วไป',
          level: ex.education_level || 'ทั่วไป',
          questionsCount: ex.exam_questions?.[0]?.count || 0,
          authorName: ex.author_name || 'คุณครูใจดี (ไม่ระบุชื่อ)',
          playCount: ex.play_count || 0,
          isOfficial: ex.is_official || false,
          date: new Date(ex.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
        }));
        setExams(formatted);
      }
    } catch (error: any) {
      console.error("Error fetching public exams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 ระบบคัดกรองข้อมูลตามหมวดหมู่และคำค้นหา
  const filteredExams = useMemo(() => {
    let result = exams.filter(exam => exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || exam.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeCategory === 'trending') {
      result = result.sort((a, b) => b.playCount - a.playCount).slice(0, 20); // ฮิตสุด 20 อันดับ
    } else if (activeCategory === 'official') {
      result = result.filter(exam => exam.isOfficial);
    } else if (activeCategory === 'new') {
      result = result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    
    return result;
  }, [exams, searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-amber-500/30">
      
      {/* 🟢 HEADER */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Compass className="text-amber-500" /> Explore 
              <span className="text-sm font-medium text-gray-500 ml-2 hidden sm:inline">| คลังข้อสอบสาธารณะ</span>
            </h1>
          </div>
          <button onClick={() => router.push('/smartexam')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
            <LayoutDashboard size={16} /> กลับหน้าของฉัน
          </button>
        </div>
      </nav>

      {/* 🟢 HERO SECTION & SEARCH */}
      <div className="relative overflow-hidden bg-slate-900 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-blue-500/10 opacity-50"></div>
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10 text-center space-y-6">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
            ค้นหาแบบทดสอบเพื่อฝึกฝน
          </h2>
          <p className="text-gray-400 text-lg">รวบรวมข้อสอบจากคุณครูทั่วประเทศ ให้คุณได้ประลองความรู้ฟรี!</p>
          
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อข้อสอบ, รายวิชา, หรือระดับชั้น..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/20 focus:border-amber-500 rounded-2xl py-4 pl-12 pr-4 text-white text-lg outline-none transition-all shadow-2xl backdrop-blur-sm placeholder:text-gray-500"
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* 🟢 CATEGORY TABS */}
        <div className="flex overflow-x-auto custom-scrollbar gap-3 mb-8 pb-2">
          <button onClick={() => setActiveCategory('all')} className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeCategory === 'all' ? 'bg-white text-black' : 'bg-slate-900 text-gray-400 hover:bg-slate-800'}`}>
            <Globe size={16} /> ทั้งหมด
          </button>
          <button onClick={() => setActiveCategory('trending')} className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeCategory === 'trending' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-slate-900 text-gray-400 hover:bg-slate-800'}`}>
            <Flame size={16} /> ยอดฮิตสัปดาห์นี้
          </button>
          <button onClick={() => setActiveCategory('official')} className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeCategory === 'official' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-slate-900 text-gray-400 hover:bg-slate-800'}`}>
            <CheckCircle2 size={16} /> NiiVaa Official
          </button>
          <button onClick={() => setActiveCategory('new')} className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${activeCategory === 'new' ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-900 text-gray-400 hover:bg-slate-800'}`}>
            <Clock size={16} /> มาใหม่ล่าสุด
          </button>
        </div>

        {/* 🟢 EXAM GRID */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-500">
            <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            <p className="font-bold">กำลังโหลดคลังข้อสอบ...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-white/5">
            <Search className="mx-auto text-slate-600 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-300">ไม่พบข้อสอบที่คุณค้นหา</h3>
            <p className="text-gray-500 mt-2">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่ใหม่อีกครั้ง</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div key={exam.id} className="bg-slate-900 border border-white/10 rounded-3xl p-5 hover:border-amber-500/50 transition-all hover:-translate-y-1 shadow-lg group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border ${exam.isOfficial ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-800 text-gray-300 border-white/10'}`}>
                    {exam.isOfficial ? <><CheckCircle2 size={12}/> Official</> : <><Star size={12}/> Community</>}
                  </div>
                  <div className="text-xs font-bold text-gray-500 flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md">
                    <Users size={12} /> {exam.playCount.toLocaleString()}
                  </div>
                </div>
                
                <h3 className="text-lg font-black text-white leading-snug mb-2 line-clamp-2 group-hover:text-amber-400 transition-colors">
                  {exam.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400 mb-6">
                  <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-white/5 text-cyan-400">{getSubjectIcon(exam.subject)} {exam.subject}</span>
                  <span className="bg-slate-950 px-2 py-1 rounded border border-white/5 text-indigo-400">{exam.level}</span>
                  <span className="bg-slate-950 px-2 py-1 rounded border border-white/5">{exam.questionsCount} ข้อ</span>
                </div>

                <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-[10px] text-gray-500">
                    โดย <span className="font-bold text-gray-300">{exam.authorName}</span>
                  </div>
                  <button 
                    onClick={() => router.push(`/smartexam/practice/${exam.id}`)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl flex items-center gap-1.5 transition-transform active:scale-95 shadow-lg shadow-amber-500/20"
                  >
                    <Play size={12} className="fill-current" /> ฝึกทำเลย
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}