"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft,Calculator, Save, Loader2, BookOpen, Wand2, RefreshCw, CheckCircle2,
  ChevronDown, ChevronUp, Info, Building, HelpCircle, X, LayoutTemplate,
  Home, FileSpreadsheet
} from 'lucide-react';

interface Evaluations {
  competency: (number | null)[];
  literacy: (number | null)[];
  character: (number | null)[];
}

interface StudentEval {
  id: string;
  studentId: string;
  name: string;
  totalScore: number; 
  evals: Evaluations;
}

export default function EvaluationGradebookPage() {
  const router = useRouter();
  const [view, setView] = useState<'lobby' | 'editor'>('lobby');
  
  // States: Lobby
  const [lobbyGradebooks, setLobbyGradebooks] = useState<any[]>([]);
  const [isLobbyLoading, setIsLobbyLoading] = useState(true);

  // States: Editor
  const [activeGbId, setActiveGbId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isManualOpen, setIsManualOpen] = useState(false);
  
  const [headerInfo, setHeaderInfo] = useState({
    school_name: '', subject_code: '', subject_name: '', teacher_name: '', grade_level: '', room: '', term: ''
  });

  const [students, setStudents] = useState<StudentEval[]>([]);

  // 1. โหลดข้อมูล Lobby
  useEffect(() => {
    if (view === 'lobby') {
      const fetchLobby = async () => {
        setIsLobbyLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('gradebooks').select('*').eq('teacher_id', user.id).order('updated_at', { ascending: false });
          if (data) setLobbyGradebooks(data);
        }
        setIsLobbyLoading(false);
      };
      fetchLobby();
    }
  }, [view]);

  // 2. โหลดข้อมูล Editor
  useEffect(() => {
    if (view === 'editor' && activeGbId) {
      const loadGb = async () => {
        setIsLoading(true);
        try {
          const { data: gb } = await supabase.from('gradebooks').select('*').eq('id', activeGbId).single();
          if (gb) setHeaderInfo(gb);

          const { data: stdData } = await supabase.from('student_grades').select('*').eq('gradebook_id', activeGbId).order('order_number', { ascending: true });
          
          if (stdData) {
            const mappedStudents = stdData.map(s => {
              // คำนวณคะแนนรวมจาก Gradebook หลัก (ปพ.5 ส่วน 1) เพื่อใช้เป็นฐาน
              const scoresObj = s.scores || {};
              const calculatedTotal = Object.values(scoresObj).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
              
              // ดึงโครงสร้างเก่า ถ้าไม่มีให้สร้าง Array ว่าง
              const defaultEvals = { competency: Array(5).fill(null), literacy: Array(5).fill(null), character: Array(8).fill(null) };
              const currentEvals = s.evaluations || defaultEvals;

              return {
                id: s.id,
                studentId: s.student_code,
                name: s.student_name,
                totalScore: calculatedTotal,
                evals: currentEvals
              };
            });
            setStudents(mappedStudents);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoading(false);
        }
      };
      loadGb();
    }
  }, [view, activeGbId]);

  // 🧮 ฟังก์ชันคำนวณฐานนิยม (Mode)
  const getMode = (arr: (number | null)[]) => {
    const counts: Record<number, number> = {};
    let maxCount = 0;
    let mode: number | null = null;
    for (let num of arr) {
      if (num === null || isNaN(num)) continue;
      counts[num] = (counts[num] || 0) + 1;
      if (counts[num] > maxCount) {
        maxCount = counts[num];
        mode = num;
      } else if (counts[num] === maxCount && mode !== null) {
        if (num > mode) mode = num; // ความถี่เท่ากัน เอาค่าสูง
      }
    }
    return mode;
  };

  const getSum = (arr: (number | null)[]) => arr.reduce((a, b) => (a || 0) + (Number(b) || 0), 0) as number;

  // 🎲 ฟังก์ชันสุ่มคะแนนตามเกณฑ์
  const handleAutoRandomize = () => {
    if (!confirm("ระบบจะเขียนทับคะแนนเดิมด้วยการสุ่มระดับ 2 และ 3 อิงตามเกณฑ์คะแนนรวมจาก ปพ.5 ต้องการดำเนินการต่อหรือไม่?")) return;

    setStudents(prev => prev.map(std => {
      const isHigh = std.totalScore >= 65; // เกณฑ์ 65 คะแนน
      
      const generateRandomArray = (length: number, exactNumOfTwos: number) => {
        const arr = Array(length).fill(3); 
        const indices = new Set<number>();
        while(indices.size < exactNumOfTwos) { indices.add(Math.floor(Math.random() * length)); }
        indices.forEach(idx => arr[idx] = 2);
        return arr;
      };

      const compTwos = isHigh ? Math.floor(Math.random() * 2) : 2; 
      const litTwos = isHigh ? Math.floor(Math.random() * 2) : 2;  
      const charTwos = isHigh ? Math.floor(Math.random() * 4) : (Math.random() > 0.5 ? 4 : 5); 

      return {
        ...std,
        evals: {
          competency: generateRandomArray(5, compTwos),
          literacy: generateRandomArray(5, litTwos),
          character: generateRandomArray(8, charTwos)
        }
      };
    }));
  };

  const handleScoreChange = (studentId: string, category: keyof Evaluations, index: number, value: string) => {
    let numValue: number | null = parseInt(value, 10);
    if (isNaN(numValue)) numValue = null;
    else if (numValue > 3) numValue = 3;
    else if (numValue < 0) numValue = 0;
    
    setStudents(prev => prev.map(std => {
      if (std.id !== studentId) return std;
      const newEvals = { ...std.evals };
      newEvals[category] = [...newEvals[category]];
      newEvals[category][index] = numValue;
      return { ...std, evals: newEvals };
    }));
  };

  const handleClearData = () => {
    if (!confirm("ยืนยันการล้างคะแนนทั้งหมดเป็นช่องว่าง?")) return;
    setStudents(prev => prev.map(std => ({ ...std, evals: { competency: Array(5).fill(null), literacy: Array(5).fill(null), character: Array(8).fill(null) } })));
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      // ใช้ Promise.all() และ .update() เพื่ออัปเดตเฉพาะคอลัมน์ evaluations 
      // วิธีนี้จะแก้ปัญหา NOT NULL ของ student_code และป้องกันไม่ให้คะแนนสอบหน้าแรกหาย
      const updatePromises = students.map(std => 
        supabase
          .from('student_grades')
          .update({ evaluations: std.evals })
          .eq('id', std.id)
      );
      
      // สั่งรันการอัปเดตพร้อมกันทุกคน
      await Promise.all(updatePromises);
      
      alert("บันทึกผลการประเมินคุณลักษณะและสมรรถนะสำเร็จ!");
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };


  // ==========================================
  // 🟢 RENDER LOBBY
  // ==========================================
  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-5xl z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4"><div className="bg-slate-900/80 p-4 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md"><img src="/niivaa_smartexam_logo.png" alt="NiiVaa" className="h-12 object-contain" onError={(e) => e.currentTarget.style.display='none'} /></div></div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mb-2">ระบบประเมิน ปพ.5 (ส่วนที่ 2)</h1>
            <p className="text-gray-400">เลือกรายวิชาเพื่อทำการประเมินสมรรถนะ อ่านคิดวิเคราะห์ และคุณลักษณะอันพึงประสงค์</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLobbyLoading ? <div className="col-span-1 md:col-span-3 flex items-center justify-center text-gray-500 py-10"><Loader2 className="animate-spin mr-2"/> กำลังโหลดรายวิชา...</div> : lobbyGradebooks.map(gb => (
                <div key={gb.id} onClick={() => { setActiveGbId(gb.id); setView('editor'); }} className="bg-slate-900 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20 group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4"><div className="bg-white/5 text-gray-300 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-widest">{gb.subject_code || 'N/A'}</div></div>
                  <h3 className="text-xl font-bold text-white mb-1 truncate group-hover:text-emerald-400 transition-colors">{gb.subject_name || 'วิชาที่ยังไม่ตั้งชื่อ'}</h3>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mb-4"><BookOpen size={14}/> {gb.grade_level} {gb.room ? `ห้อง ${gb.room}` : ''}</div>
                  <div className="pt-4 border-t border-white/5 text-xs text-gray-500 flex justify-between"><span>{gb.term ? `เทอม ${gb.term}` : '-'}</span><span>{gb.teacher_name}</span></div>
                </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center gap-4">
             <button onClick={() => router.push('/smart-exam-dashboard')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"><Home size={18}/> กลับหน้า Dashboard</button>
             <button onClick={() => router.push('/smartexam/gradebook')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"><FileSpreadsheet size={18}/> ไปยัง ปพ.5 (ส่วนคะแนน)</button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🟢 RENDER EDITOR
  // ==========================================
  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-gray-400"><Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" /> กำลังดึงข้อมูลรายชื่อนักเรียน...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      
      <style>{`
        .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); text-align: right; padding: 8px 4px; }
        .hide-arrows::-webkit-inner-spin-button, .hide-arrows::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .hide-arrows { -moz-appearance: textfield; }
      `}</style>

      {/* NAVBAR */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('lobby')} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><ArrowLeft size={20} /></button>
            <h1 className="text-lg font-bold flex items-center gap-2"><BookOpen className="text-emerald-500" /> ระบบประเมิน ปพ.5 (ส่วนที่ 2)</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/smartexam/gradebook')} className="hidden md:flex px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl items-center gap-2 text-sm font-bold transition-colors">
              <FileSpreadsheet size={16} /> ปพ.5 (คะแนน)
            </button>
            <button onClick={handleSaveToDatabase} disabled={isSaving} className="px-6 py-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl flex items-center gap-2 text-sm font-black transition-all shadow-lg shadow-emerald-500/20">
              {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} บันทึกข้อมูล
            </button>
            <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>
            <img src="/niivaa_smartexam_logo.png" alt="NiiVaa Logo" className="h-8 object-contain hidden md:block" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 mt-6 space-y-4">
        
        {/* Toggle Head (Info & Legend) */}
        <div className="flex justify-between items-center bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 cursor-pointer hover:bg-slate-800 transition-colors shadow-lg" onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}>
          <div className="flex items-center gap-3 text-emerald-500 font-bold"><Building size={20}/> ข้อมูลรายวิชา และ เกณฑ์การประเมิน (คลิกเพื่อพับ/กาง)</div>
          <div className="flex items-center gap-4">
             <button onClick={(e) => { e.stopPropagation(); setIsManualOpen(true); }} className="text-blue-400 text-sm font-bold flex items-center gap-1 hover:text-blue-300"><HelpCircle size={16}/> คู่มือ</button>
             <button className="text-gray-400">{isHeaderExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</button>
          </div>
        </div>

        {/* Collapsible Info Section */}
        <div className={`transition-all duration-300 origin-top ${isHeaderExpanded ? 'block animate-in fade-in' : 'hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* กล่องข้อมูลวิชา */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg">
              <h3 className="font-bold text-gray-300 mb-3 border-b border-white/5 pb-2">ข้อมูลรายวิชา</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">โรงเรียน:</span><span className="text-white font-medium">{headerInfo.school_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">รายวิชา:</span><span className="text-white font-medium">{headerInfo.subject_name} ({headerInfo.subject_code})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ระดับชั้น:</span><span className="text-emerald-400 font-bold">{headerInfo.grade_level} {headerInfo.room ? `ห้อง ${headerInfo.room}` : ''}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ภาคเรียน:</span><span className="text-white font-medium">{headerInfo.term || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ผู้สอน:</span><span className="text-white font-medium">{headerInfo.teacher_name || '-'}</span></div>
              </div>
            </div>

            {/* กล่องคำอธิบาย 1 */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 shadow-lg">
              <h3 className="font-bold text-blue-400 mb-3 border-b border-blue-500/10 pb-2 flex items-center gap-2"><Info size={16}/> สมรรถนะสำคัญ</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">3</span> ดีมาก (ดีเยี่ยม)</div>
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">2</span> ดี</div>
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">1</span> พอใช้ (ผ่าน)</div>
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-rose-400 font-bold border border-rose-500/30">0</span> ปรับปรุง (ไม่ผ่าน)</div>
              </div>
            </div>

            {/* กล่องคำอธิบาย 2 */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 shadow-lg">
              <h3 className="font-bold text-amber-500 mb-3 border-b border-amber-500/10 pb-2 flex items-center gap-2"><Info size={16}/> อ่านคิดวิเคราะห์ฯ / คุณลักษณะฯ</h3>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-amber-500 font-bold border border-amber-500/30">3</span> ดีเยี่ยม</div>
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-amber-500 font-bold border border-amber-500/30">2</span> ดี</div>
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-amber-500 font-bold border border-amber-500/30">1</span> ผ่าน</div>
                <div className="flex items-center gap-2"><span className="w-6 h-6 rounded bg-slate-950 flex items-center justify-center text-rose-400 font-bold border border-rose-500/30">0</span> ไม่ผ่าน</div>
              </div>
            </div>

          </div>
        </div>

        {/* แผงควบคุม (Controls) */}
        <div className="flex flex-col md:flex-row justify-end items-center gap-4 py-2">
          <div className="flex gap-3 w-full md:w-auto">
            <button onClick={handleClearData} className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors">
              <RefreshCw size={16}/> ล้างข้อมูล
            </button>
            <button onClick={handleAutoRandomize} className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg shadow-emerald-500/20">
              <Wand2 size={16}/> สุ่มเติมอัตโนมัติ (อิงฐาน 100 คะแนน)
            </button>
          </div>
        </div>

        {/* 🟢 ตาราง ปพ.5 ส่วนที่ 2 */}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-300 mt-2">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-black border-collapse min-w-[1200px]" style={{ fontSize: '13px' }}>
              <thead className="bg-gray-100 font-bold border-b-2 border-gray-400">
                <tr>
                  <th colSpan={3} className="border border-gray-300 p-2 bg-gray-200"></th>
                  <th colSpan={24} className="border border-gray-300 p-3 bg-gray-200 text-lg tracking-widest text-center">ผลการประเมิน</th>
                </tr>

                <tr className="text-center text-[14px]">
                  <th rowSpan={2} className="border border-gray-300 p-2 w-10 sticky left-0 bg-gray-200 z-10 vertical-text h-32">เลขที่</th>
                  <th rowSpan={2} className="border border-gray-300 p-2 w-16 sticky left-[40px] bg-gray-200 z-10 vertical-text h-32">เลขประจำตัว</th>
                  <th rowSpan={2} className="border border-gray-300 p-2 w-48 sticky left-[104px] bg-gray-200 z-10 text-center">ชื่อ - สกุล</th>
                  
                  <th colSpan={7} className="border border-gray-300 p-2 bg-blue-50/50">สมรรถนะ</th>
                  <th colSpan={7} className="border border-gray-300 p-2 bg-amber-50/50">อ่านคิดเขียนวิเคราะห์</th>
                  <th colSpan={10} className="border border-gray-300 p-2 bg-emerald-50/50">คุณลักษณะที่พึงประสงค์</th>
                </tr>

                <tr className="text-[12px] h-32">
                  <th className="border border-gray-300 vertical-text w-8 bg-blue-50/50">สื่อสาร</th><th className="border border-gray-300 vertical-text w-8 bg-blue-50/50">คิด</th><th className="border border-gray-300 vertical-text w-8 bg-blue-50/50">แก้ปัญหา</th><th className="border border-gray-300 vertical-text w-8 bg-blue-50/50">ใช้ทักษะชีวิต</th><th className="border border-gray-300 vertical-text w-8 bg-blue-50/50">ใช้เทคโนโลยี</th><th className="border border-gray-300 vertical-text w-10 font-black">รวมคะแนน</th><th className="border border-gray-300 vertical-text w-10 font-black text-lg text-blue-700">สรุป</th>
                  <th className="border border-gray-300 vertical-text w-8 bg-amber-50/50">อ่าน</th><th className="border border-gray-300 vertical-text w-8 bg-amber-50/50">เขียน</th><th className="border border-gray-300 vertical-text w-8 bg-amber-50/50">คิด</th><th className="border border-gray-300 vertical-text w-8 bg-amber-50/50">วิเคราะห์</th><th className="border border-gray-300 vertical-text w-8 bg-amber-50/50">สื่อความ</th><th className="border border-gray-300 vertical-text w-10 font-black">รวมคะแนน</th><th className="border border-gray-300 vertical-text w-10 font-black text-lg text-amber-700">สรุป</th>
                  <th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">รักชาติ ศาสน์ กษัตริย์</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">ซื่อสัตย์สุจริต</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">มีวินัย</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">ใฝ่เรียนรู้</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">อยู่อย่างพอเพียง</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">มุ่งมั่นในการทำงาน</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">รักความเป็นไทย</th><th className="border border-gray-300 vertical-text w-8 bg-emerald-50/50">มีจิตสาธารณะ</th><th className="border border-gray-300 vertical-text w-10 font-black">รวมคะแนน</th><th className="border border-gray-300 vertical-text w-10 font-black text-lg text-emerald-700">สรุป</th>
                </tr>

                <tr className="bg-gray-100 text-[14px] text-center font-mono font-bold">
                  <th colSpan={3} className="border border-gray-300 p-1 text-right pr-4 text-gray-500">คะแนนเต็ม</th>
                  {Array(5).fill(3).map((_,i) => <th key={`c_m_${i}`} className="border border-gray-300 p-1 text-gray-500">3</th>)}<th className="border border-gray-300 p-1 text-blue-600">15</th><th className="border border-gray-300 p-1 text-blue-700 text-lg">3</th>
                  {Array(5).fill(3).map((_,i) => <th key={`l_m_${i}`} className="border border-gray-300 p-1 text-gray-500">3</th>)}<th className="border border-gray-300 p-1 text-amber-600">15</th><th className="border border-gray-300 p-1 text-amber-700 text-lg">3</th>
                  {Array(8).fill(3).map((_,i) => <th key={`ch_m_${i}`} className="border border-gray-300 p-1 text-gray-500">3</th>)}<th className="border border-gray-300 p-1 text-emerald-600">24</th><th className="border border-gray-300 p-1 text-emerald-700 text-lg">3</th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {students.length === 0 ? (
                  <tr><td colSpan={27} className="text-center py-10 text-gray-500">ไม่พบรายชื่อนักเรียน กรุณาเพิ่มนักเรียนในหน้า ปพ.5 (คะแนน) ก่อนครับ</td></tr>
                ) : students.map((student, index) => {
                  const compSum = getSum(student.evals.competency); const litSum = getSum(student.evals.literacy); const charSum = getSum(student.evals.character);
                  const compMode = getMode(student.evals.competency); const litMode = getMode(student.evals.literacy); const charMode = getMode(student.evals.character);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors text-center font-medium">
                      <td className="border border-gray-300 p-1 sticky left-0 bg-white z-10">{index + 1}</td>
                      <td className="border border-gray-300 p-1 sticky left-[40px] bg-white z-10 font-mono text-xs">{student.studentId}</td>
                      <td className="border border-gray-300 p-2 text-left sticky left-[104px] bg-white z-10 whitespace-nowrap">
                        {student.name}
                        <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200" title="คะแนนรวม 100 จากหน้าแรก">ฐาน: {student.totalScore}</span>
                      </td>

                      {/* สมรรถนะ */}
                      {student.evals.competency.map((score, i) => (
                        <td key={`comp_${i}`} className="border border-gray-300 p-0"><input type="number" min="0" max="3" value={score === null ? '' : score} onChange={(e) => handleScoreChange(student.id, 'competency', i, e.target.value)} className="w-full h-full text-center py-2 focus:bg-blue-100 outline-none hide-arrows font-mono text-base" /></td>
                      ))}
                      <td className="border border-gray-300 p-1 font-bold text-gray-600 bg-blue-50/30">{compSum === 0 ? '' : compSum}</td>
                      <td className="border border-gray-300 p-1 font-black text-lg text-blue-700 bg-blue-100/50">{compMode === null ? '' : compMode}</td>

                      {/* อ่านคิดเขียน */}
                      {student.evals.literacy.map((score, i) => (
                        <td key={`lit_${i}`} className="border border-gray-300 p-0"><input type="number" min="0" max="3" value={score === null ? '' : score} onChange={(e) => handleScoreChange(student.id, 'literacy', i, e.target.value)} className="w-full h-full text-center py-2 focus:bg-amber-100 outline-none hide-arrows font-mono text-base" /></td>
                      ))}
                      <td className="border border-gray-300 p-1 font-bold text-gray-600 bg-amber-50/30">{litSum === 0 ? '' : litSum}</td>
                      <td className="border border-gray-300 p-1 font-black text-lg text-amber-700 bg-amber-100/50">{litMode === null ? '' : litMode}</td>

                      {/* คุณลักษณะ */}
                      {student.evals.character.map((score, i) => (
                        <td key={`char_${i}`} className="border border-gray-300 p-0"><input type="number" min="0" max="3" value={score === null ? '' : score} onChange={(e) => handleScoreChange(student.id, 'character', i, e.target.value)} className="w-full h-full text-center py-2 focus:bg-emerald-100 outline-none hide-arrows font-mono text-base" /></td>
                      ))}
                      <td className="border border-gray-300 p-1 font-bold text-gray-600 bg-emerald-50/30">{charSum === 0 ? '' : charSum}</td>
                      <td className="border border-gray-300 p-1 font-black text-lg text-emerald-700 bg-emerald-100/50">{charMode === null ? '' : charMode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 🟢 Slide-over Drawer (คู่มือการใช้งาน) */}
      {isManualOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsManualOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0f172a] h-full border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/80">
              <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2"><BookOpen size={20}/> คู่มือใช้งาน ปพ.5 (ส่วนที่ 2)</h2>
              <button onClick={() => setIsManualOpen(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={18}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-gray-300 scrollbar-hide">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2 text-base"><LayoutTemplate size={18}/> โครงสร้างการประเมิน</h3>
                <p className="leading-relaxed">ตารางนี้เชื่อมโยงรายชื่อนักเรียนจาก ปพ.5 (ส่วนคะแนน) อัตโนมัติ ใช้สำหรับประเมินความสามารถที่ไม่ได้อยู่ในรูปของคะแนนดิบ โดยประเมินเป็นระดับ 0-3</p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-emerald-500/20 text-emerald-500 p-2 rounded-lg shrink-0 mt-1"><Wand2 size={16}/></div>
                  <div>
                    <h4 className="font-bold text-white mb-1">การสุ่มเติมคะแนนอิงฐาน 100</h4>
                    <p className="text-gray-400 leading-relaxed">คลิกปุ่ม <b>"สุ่มเติมอัตโนมัติ"</b> ระบบจะเช็ก <span className="text-amber-400">ฐานคะแนนเต็ม 100</span> ของเด็กแต่ละคน หากได้มากกว่า 65 คะแนน ระบบจะสุ่มระดับ 3 ให้เป็นส่วนใหญ่ หากต่ำกว่า จะแทรกระดับ 2 ให้มากขึ้น</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-amber-500/20 text-amber-500 p-2 rounded-lg shrink-0 mt-1"><Calculator size={16}/></div>
                  <div>
                    <h4 className="font-bold text-white mb-1">สถิติ ฐานนิยม (Mode)</h4>
                    <p className="text-gray-400 leading-relaxed">ในช่องสรุปผลการประเมิน ระบบไม่ได้ใช้ค่าเฉลี่ย แต่ใช้ค่า <b>"ฐานนิยม"</b> (ระดับคะแนนที่เด็กได้บ่อยที่สุดในหมวดนั้น) หากความถี่เท่ากัน ระบบจะเลือกค่าที่สูงกว่าเป็นตัวสรุป</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-blue-500/20 text-blue-400 p-2 rounded-lg shrink-0 mt-1"><Save size={16}/></div>
                  <div>
                    <h4 className="font-bold text-white mb-1">การบันทึกข้อมูล</h4>
                    <p className="text-gray-400 leading-relaxed">ข้อมูลที่ประเมินจะถูกแพ็กเป็น JSON บันทึกลงฐานข้อมูลเดียวกับคะแนนของนักเรียนคนนั้น ทำให้ข้อมูลไม่สูญหายและนำไปใช้ออกรายงาน สพฐ. ได้ทันที</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-white/10 bg-slate-950/80 text-center"><p className="text-xs text-gray-500">NiiVaa SmartExam v2.0 - Education Platform</p></div>
          </div>
        </div>
      )}

    </div>
  );
}