"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, ArrowLeft, Users, Trophy, Target, FileDown, 
  BarChart3, Loader2, Search, CheckCircle2, XCircle 
} from 'lucide-react';

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // 🌟 State สำหรับรายชื่อข้อสอบทั้งหมด (ใช้ทำ Dropdown)
  const [examList, setExamList] = useState<{id: string, title: string}[]>([]);

  // Tabs: 'scores' | 'analysis'
  const [activeTab, setActiveTab] = useState<'scores' | 'analysis'>('scores');

  useEffect(() => {
    fetchResultsData();
    fetchExamList();
  }, [examId]);

  // 🌟 ฟังก์ชันดึงรายชื่อข้อสอบทั้งหมดมาใส่ Dropdown
  const fetchExamList = async () => {
    try {
      const { data } = await supabase
        .from('exams')
        .select('id, title')
        .order('created_at', { ascending: false });
      if (data) setExamList(data);
    } catch (error) {
      console.error("Error fetching exam list:", error);
    }
  };

  const fetchResultsData = async () => {
    try {
      // 1. ดึงข้อมูลข้อสอบ
      const { data: examData, error: examErr } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (examErr) throw examErr;

      // 2. ดึงข้อมูลคำถามและเฉลย
      const { data: qData, error: qErr } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('question_number', { ascending: true });
      if (qErr) throw qErr;

      // 3. ดึงข้อมูลการส่งข้อสอบของนักเรียน
      const { data: subData, error: subErr } = await supabase.from('exam_submissions').select('*').eq('exam_id', examId).order('score', { ascending: false });
      if (subErr) throw subErr;

      setExam(examData);
      setQuestions(qData || []);
      setSubmissions(subData || []);
    } catch (error: any) {
      alert("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- การคำนวณสถิติภาพรวม ---
  const totalStudents = submissions.length;
  const maxScore = totalStudents > 0 ? Math.max(...submissions.map(s => s.score)) : 0;
  const minScore = totalStudents > 0 ? Math.min(...submissions.map(s => s.score)) : 0;
  const avgScore = totalStudents > 0 ? (submissions.reduce((sum, s) => sum + s.score, 0) / totalStudents).toFixed(2) : 0;
  const passThreshold = exam ? exam.total_score / 2 : 0;
  const passCount = submissions.filter(s => s.score >= passThreshold).length;
  const passRate = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) : 0;

  // --- การกรองรายชื่อนักเรียน ---
  const filteredSubmissions = submissions.filter(s =>
    s.student_id.includes(searchTerm) ||
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Export CSV ---
  const exportToCSV = () => {
    const headers = ["ลำดับ", "รหัสนักเรียน", "ชื่อ-นามสกุล", "คะแนนที่ได้", "คะแนนเต็ม", "ส่งเมื่อ"];
    const rows = submissions.map((s, index) => [
      index + 1,
      s.student_id,
      s.student_name,
      s.score,
      s.total_score,
      new Date(s.submitted_at).toLocaleString('th-TH')
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `คะแนนสอบ_${exam?.title}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-amber-400"><Loader2 className="animate-spin w-12 h-12" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans pb-20">

      {/* 🌟 Header & Navbar */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shadow-xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => router.push('/smart-exam-dashboard')} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors hidden sm:block" title="กลับหน้าศูนย์กลาง">
              <ArrowLeft size={20} />
            </button>
            
            {/* 🌟 โลโก้ */}
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 cursor-pointer" onClick={() => router.push('/smart-exam-dashboard')}>
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa SmartExam" className="h-5 sm:h-6 object-contain" />
              <span className="hidden lg:inline">SmartExam</span>
            </h1>
            
            <div className="h-6 w-[1px] bg-white/10 hidden sm:block mx-1"></div>

            {/* 🌟 Dropdown สลับชุดข้อสอบ */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg px-2 sm:px-3 py-1.5 max-w-[180px] sm:max-w-xs md:max-w-md shadow-inner">
              <span className="text-xs text-gray-400 mr-2 hidden md:inline whitespace-nowrap">ผลสอบ:</span>
              <select 
                value={examId}
                onChange={(e) => router.push(`/smartexam/results/${e.target.value}`)}
                className="bg-transparent text-xs sm:text-sm text-amber-400 font-bold outline-none cursor-pointer w-full truncate"
              >
                {examList.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-slate-900 text-white">
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/smart-exam-dashboard')}
              className="p-2 hover:bg-amber-500/10 rounded-full text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2"
              title="กลับหน้าศูนย์กลาง"
            >
              <LayoutDashboard size={18} />
            </button>
            <button 
              onClick={exportToCSV} 
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
            >
              <FileDown size={16} /> <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 space-y-8 animate-in fade-in duration-500">

        {/* 🌟 Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-md">
            <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2"><Users size={20} /></div>
            <div className="text-xs text-gray-400 uppercase font-bold">ผู้เข้าสอบทั้งหมด</div>
            <div className="text-3xl font-black text-white">{totalStudents} <span className="text-sm font-normal text-gray-500">คน</span></div>
          </div>
          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-md">
            <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-2"><BarChart3 size={20} /></div>
            <div className="text-xs text-gray-400 uppercase font-bold">คะแนนเฉลี่ย</div>
            <div className="text-3xl font-black text-white">{avgScore} <span className="text-sm font-normal text-gray-500">/ {exam?.total_score}</span></div>
          </div>
          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-md">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2"><Trophy size={20} /></div>
            <div className="text-xs text-gray-400 uppercase font-bold">คะแนนสูงสุด</div>
            <div className="text-3xl font-black text-emerald-400">{maxScore}</div>
          </div>
          <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-md">
            <div className="w-10 h-10 bg-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mb-2"><Target size={20} /></div>
            <div className="text-xs text-gray-400 uppercase font-bold">เปอร์เซ็นต์สอบผ่าน</div>
            <div className="text-3xl font-black text-cyan-400">{passRate}%</div>
          </div>
        </div>

        {/* 🌟 Tabs Control */}
        <div className="flex border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('scores')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'scores' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            📋 สรุปผลคะแนนผู้เข้าสอบ
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === 'analysis' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            📊 วิเคราะห์ความยากง่ายรายข้อ
          </button>
        </div>

        {/* =========================================
            TAB 1: สรุปผลคะแนนนักเรียน (Scores Table)
            ========================================= */}
        {activeTab === 'scores' && (
          <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><Users className="text-amber-500" /> รายชื่อนักเรียน ({filteredSubmissions.length})</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="ค้นหารหัส หรือ ชื่อนักเรียน..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-300 min-w-[600px]">
                <thead className="text-xs text-gray-400 uppercase bg-slate-950">
                  <tr>
                    <th className="px-6 py-4 font-bold rounded-tl-xl">ลำดับ</th>
                    <th className="px-6 py-4 font-bold">รหัสประจำตัว</th>
                    <th className="px-6 py-4 font-bold">ชื่อ - นามสกุล</th>
                    <th className="px-6 py-4 font-bold text-center">คะแนน</th>
                    <th className="px-6 py-4 font-bold text-center">สถานะ</th>
                    <th className="px-6 py-4 font-bold text-right rounded-tr-xl">เวลาที่ส่ง</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-16 text-gray-500">ยังไม่มีผู้ส่งคำตอบ หรือไม่พบข้อมูลที่ค้นหา</td></tr>
                  ) : (
                    filteredSubmissions.map((sub, index) => {
                      const isPass = sub.score >= passThreshold;
                      return (
                        <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-500">{index + 1}</td>
                          <td className="px-6 py-4 font-mono text-amber-400">{sub.student_id}</td>
                          <td className="px-6 py-4 font-medium text-white">{sub.student_name}</td>
                          <td className="px-6 py-4 text-center font-black text-lg">
                            {sub.score} <span className="text-xs font-normal text-gray-500">/ {sub.total_score}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isPass
                              ? <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-bold"><CheckCircle2 size={12} /> ผ่าน</span>
                              : <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-md text-xs font-bold"><XCircle size={12} /> ไม่ผ่าน</span>
                            }
                          </td>
                          <td className="px-6 py-4 text-right text-xs text-gray-500">
                            {new Date(sub.submitted_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })} น.
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================
            TAB 2: วิเคราะห์ข้อสอบรายข้อ (Item Analysis)
            ========================================= */}
        {activeTab === 'analysis' && (
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl">
            <div className="mb-6 flex justify-between items-end border-b border-white/5 pb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-white"><BarChart3 className="text-cyan-400" /> สถิติการตอบถูกแต่ละข้อ</h2>
                <p className="text-xs text-gray-400 mt-1">ระบบวิเคราะห์เปอร์เซ็นต์นักเรียนที่ตอบถูก เพื่อหาความยาก-ง่าย ของข้อสอบ</p>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">ไม่พบข้อมูลกระดาษคำตอบ</div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => {
                  let correctAnswers = 0;
                  submissions.forEach(sub => {
                    if (sub.answers_data) {
                      const studentAns = (sub.answers_data[q.id] || '').toString().trim().toLowerCase();
                      const trueAns = (q.correct_answer || '').toString().trim().toLowerCase();
                      if (studentAns === trueAns && trueAns !== '') correctAnswers++;
                    }
                  });

                  const percentCorrect = totalStudents > 0 ? Math.round((correctAnswers / totalStudents) * 100) : 0;

                  let difficultyStr = "ปานกลาง";
                  let difficultyColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                  if (percentCorrect >= 80) { difficultyStr = "ง่ายมาก"; difficultyColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"; }
                  else if (percentCorrect <= 30) { difficultyStr = "ยากมาก"; difficultyColor = "text-red-400 bg-red-500/10 border-red-500/20"; }

                  return (
                    <div key={q.id} className="bg-slate-950 border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-white/10 transition-colors">
                      <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-xl flex items-center justify-center font-black text-xl text-gray-400 shrink-0 shadow-inner">
                        {q.question_number}
                      </div>

                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-end mb-2">
                          <div>
                            <div className="text-sm font-bold text-gray-300">เฉลย: <span className="text-cyan-400 text-base">{q.correct_answer || 'ไม่มีเฉลย'}</span></div>
                            <div className="text-xs text-gray-500">{q.question_type === 'short_answer' ? '📝 อัตนัยแบบเติมคำ' : '🔘 ปรนัย (ตัวเลือก)'}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-white">{percentCorrect}%</span>
                            <div className="text-[10px] text-gray-500">ตอบถูก {correctAnswers} / {totalStudents} คน</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-cyan-500 transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${percentCorrect}%` }}></div>
                        </div>
                      </div>

                      <div className="shrink-0 w-full sm:w-24 text-right sm:text-center mt-2 sm:mt-0">
                        <span className={`text-[10px] font-bold px-2 py-1 border rounded-md shadow-sm ${difficultyColor}`}>
                          {difficultyStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}