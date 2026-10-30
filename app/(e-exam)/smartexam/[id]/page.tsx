"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Clock, CheckCircle2, User, Send, Loader2, FileText, 
  ChevronRight, Lock, AlertCircle, Hourglass,
  ChevronLeft, Flag, LayoutGrid, Hash, Info
} from 'lucide-react';

export default function StudentExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  // 1. States ข้อมูลข้อสอบ
  const [examConfig, setExamConfig] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. States สถานะการเข้าสอบ
  const [accessStatus, setAccessStatus] = useState<'loading' | 'waiting' | 'open' | 'late' | 'closed' | 'error'>('loading');
  const [timeToStart, setTimeToStart] = useState<number>(0); 
  
  // 3. States การทำข้อสอบ
  const [examState, setExamState] = useState<'intro' | 'taking' | 'submitted'>('intro');
  const [studentInfo, setStudentInfo] = useState({ name: '', studentId: '' });
  const [answers, setAnswers] = useState<Record<string, string>>({}); 
  const [timeLeft, setTimeLeft] = useState<number>(0); 
  const [scoreResult, setScoreResult] = useState({ totalScore: 0, earnedScore: 0, correctCount: 0 });

  // 4. States สำหรับ UI
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flagged, setFlagged] = useState<string[]>([]); 
  const [showGrid, setShowGrid] = useState(false); 
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  // ----------------------------------------------------
  // ระบบโหลดข้อมูลและตรวจสอบเวลา
  // ----------------------------------------------------
  useEffect(() => {
    fetchExamData();
  }, [examId]);

  const fetchExamData = async () => {
    try {
      const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (examError || !exam) throw new Error("ไม่พบห้องสอบนี้ หรือลิงก์อาจถูกยกเลิกไปแล้ว");

      const { data: qData, error: qError } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('question_number', { ascending: true });
      if (qError) throw qError;

      let metadata: any = {};
      try { 
        if (exam.topic) {
          metadata = JSON.parse(exam.topic); 
        }
      } catch (e) {}

      setExamConfig({ ...exam, metadata });

      let loadedQuestions = (qData || []).map(q => {
        let metaQ = {};
        try { 
          if (q.explanation) {
            metaQ = JSON.parse(q.explanation); 
          }
        } catch(e) {}
        
        return { ...q, ...metaQ, explanation: q.explanation };
      });

      const isDocument = exam.exam_format === 'pdf' || exam.exam_format === 'image' || exam.exam_format === 'multi_image' || (exam.file_url && exam.file_url.includes('.pdf'));
      
      if (loadedQuestions.length === 0 && isDocument) {
        const count = exam.total_score > 0 ? Number(exam.total_score) : 10; 
        loadedQuestions = Array.from({ length: count }).map((_, i) => ({
          id: `virtual-q-${i + 1}`,
          question_number: i + 1,
          question_type: 'mcq',
          question_text: 'อ้างอิงจากไฟล์เอกสาร',
          options: [{ id: 'ก', text: 'ก' }, { id: 'ข', text: 'ข' }, { id: 'ค', text: 'ค' }, { id: 'ง', text: 'ง' }],
          correct_answer: '', 
          score: 1,
          explanation: ''
        }));
      }

      setQuestions(loadedQuestions);
      checkAccessStatus(metadata);

    } catch (error: any) {
      alert(error.message);
      setAccessStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccessStatus = (metadata: any) => {
    if (!metadata?.settings) {
      setAccessStatus('open'); 
      return;
    }

    const { examDate, startTime, endTime, timingMode, lateTolerance } = metadata.settings;
    if (!examDate || !startTime || !endTime) {
      setAccessStatus('open');
      return;
    }

    const now = new Date();
    const startDateTime = new Date(`${examDate}T${startTime}:00`);
    const endDateTime = new Date(`${examDate}T${endTime}:00`);

    if (now < startDateTime) {
      setAccessStatus('waiting');
      setTimeToStart(Math.floor((startDateTime.getTime() - now.getTime()) / 1000));
    } else if (now > endDateTime) {
      setAccessStatus('closed');
    } else {
      if (timingMode === 'fixed') {
        const lateLimit = new Date(startDateTime.getTime() + (lateTolerance * 60000));
        if (now > lateLimit) {
          setAccessStatus('late'); 
          return;
        }
      }
      setAccessStatus('open'); 
    }
  };

  useEffect(() => {
    if (accessStatus === 'waiting' && timeToStart > 0) {
      const timer = setInterval(() => {
        setTimeToStart(prev => {
          if (prev <= 1) {
            checkAccessStatus(examConfig?.metadata); 
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [accessStatus, timeToStart, examConfig]);

  useEffect(() => {
    if (examState !== 'taking' || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          clearInterval(timer); 
          handleAutoSubmit(); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examState, timeLeft]);

  useEffect(() => {
    if (examState !== 'taking') return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("⚠️ คำเตือน: คุณสลับหน้าต่างหรือย่อเบราว์เซอร์ระหว่างการสอบ!\nระบบได้บันทึกพฤติกรรมนี้ส่งให้กรรมการคุมสอบแล้ว");
      }
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && ['c', 'v', 'p'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    try { document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [examState]);

  // ----------------------------------------------------
  // ฟังก์ชันการทำงาน
  // ----------------------------------------------------
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartExam = () => {
    if (!studentInfo.name.trim() || !studentInfo.studentId.trim()) {
      return alert("กรุณากรอกชื่อและรหัสประจำตัวให้ครบถ้วนก่อนเริ่มสอบครับ");
    }
    if (questions.length === 0) {
      return alert("⚠️ ขออภัย ไม่สามารถเข้าสอบได้\nเนื่องจากแบบทดสอบชุดนี้ยังไม่มีข้อคำถามครับ");
    }
    
    const settings = examConfig?.metadata?.settings;
    if (settings && settings.examDate && settings.endTime) {
      const now = new Date();
      const endDateTime = new Date(`${settings.examDate}T${settings.endTime}:00`);
      const secondsUntilEnd = Math.floor((endDateTime.getTime() - now.getTime()) / 1000);
      if (settings.timingMode === 'fixed') {
        setTimeLeft(secondsUntilEnd);
      } else {
        const allowedDuration = (settings.duration || 60) * 60;
        setTimeLeft(Math.min(allowedDuration, secondsUntilEnd));
      }
    } else {
      setTimeLeft(3600); 
    }
    setExamState('taking');
  };

  const handleSelectOption = (questionId: string, value: string, isShortAnswer: boolean = false) => {
    if (!questionId) return;
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    const isDocument = examConfig.exam_format === 'pdf' || examConfig.exam_format === 'image' || examConfig.exam_format === 'multi_image' || (examConfig.file_url && examConfig.file_url.includes('.pdf'));
    
    if (isDocument && !isShortAnswer && currentQuestionIndex < questions.length - 1) {
      setTimeout(() => setCurrentQuestionIndex(prev => prev + 1), 300); 
    }
  };

  const toggleFlag = (questionId: string) => {
    if (!questionId) return;
    setFlagged(prev => prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]);
  };

  const handleSubmitExam = () => {
    const answeredCount = Object.values(answers).filter(val => val && val.trim() !== '').length;
    if (answeredCount < questions.length) {
      if (!confirm(`คุณทำไปเพียง ${answeredCount} จาก ${questions.length} ข้อ\nแน่ใจหรือไม่ว่าต้องการส่งข้อสอบ? (ข้อที่ไม่ได้ตอบจะไม่ได้คะแนน)`)) return;
    } else {
      if (!confirm("ตรวจสอบคำตอบเรียบร้อยแล้ว ยืนยันการส่งข้อสอบหรือไม่?")) return;
    }
    processGrading();
  };

  const handleAutoSubmit = () => {
    alert("หมดเวลาทำข้อสอบ! ระบบกำลังส่งคำตอบของคุณอัตโนมัติ");
    processGrading();
  };

  const processGrading = async () => {
    let earnedScore = 0;
    let correctCount = 0;
    let totalScore = 0;

    questions.forEach(q => {
      const questionScore = Number(q.score) || 1;
      totalScore += questionScore;
      
      const studentAns = (answers[q.id] || '').toString().trim().toLowerCase();
      const correctAns = (q.correct_answer || '').toString().trim().toLowerCase();

      if (studentAns === correctAns && correctAns !== '') {
        earnedScore += questionScore;
        correctCount++;
      }
    });

    setScoreResult({ totalScore, earnedScore, correctCount });
    setExamState('submitted');

    try {
      const { error } = await supabase.from('exam_submissions').insert({
        exam_id: examId,
        student_id: studentInfo.studentId,
        student_name: studentInfo.name,
        score: earnedScore,
        total_score: totalScore,
        answers_data: answers 
      });
      
      if (error) {
        console.error("Save Error:", error);
        alert("คำตอบถูกตรวจแล้ว แต่ระบบไม่สามารถบันทึกลงฐานข้อมูลได้ กรุณาแจ้งผู้คุมสอบ");
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || accessStatus === 'loading') {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="w-10 h-10 text-amber-500 animate-spin" /></div>;
  }

  const metadata = examConfig?.metadata;
  const branding = metadata?.branding || { primaryColor: '#f59e0b', secondaryColor: '#fef3c7' };
  const settings = metadata?.settings || {};
  const isFree = !metadata?.branding;

  const isPdfOrImage = examConfig.exam_format === 'pdf' || examConfig.exam_format === 'image' || examConfig.exam_format === 'multi_image' || (examConfig.file_url && examConfig.file_url.includes('.pdf'));

  const currentQ = questions[currentQuestionIndex] || questions[0] || null;
  const safeQuestionId = currentQ?.id || `safe-id-${currentQuestionIndex}`;
  const safeQuestionNumber = currentQ?.question_number || (currentQuestionIndex + 1);

  const isShortAnswerMode = currentQ?.question_type === 'short_answer' || !currentQ?.options || currentQ.options.length === 0;

  // ----------------------------------------------------
  // UI Rendering
  // ----------------------------------------------------
  if (accessStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 p-8 rounded-3xl space-y-6">
          <Hourglass size={48} className="mx-auto text-amber-500 animate-pulse" />
          <h2 className="text-2xl font-black text-white">ห้องสอบยังไม่เปิด</h2>
          <p className="text-gray-400 text-sm">การสอบ {examConfig.title} จะเปิดในเวลา {settings.startTime} น.</p>
          <div className="bg-black/50 p-6 rounded-2xl border border-white/5">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest font-bold">เริ่มสอบในอีก</div>
            <div className="text-4xl font-black text-amber-400 font-mono">{formatTime(timeToStart)}</div>
          </div>
          <p className="text-xs text-gray-500">กรุณารอในหน้านี้ ระบบจะพาเข้าสู่ห้องสอบอัตโนมัติเมื่อถึงเวลา</p>
        </div>
      </div>
    );
  }

  if (accessStatus === 'closed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 p-8 rounded-3xl space-y-4">
          <Lock size={48} className="mx-auto text-red-500" />
          <h2 className="text-2xl font-black text-red-400">หมดเวลาการทำแบบทดสอบ</h2>
          <p className="text-gray-400 text-sm">ระบบได้ปิดรับคำตอบสำหรับ {examConfig.title} เรียบร้อยแล้ว (ปิดระบบเมื่อ {settings.endTime} น.)</p>
        </div>
      </div>
    );
  }

  if (accessStatus === 'late') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 p-8 rounded-3xl space-y-4">
          <AlertCircle size={48} className="mx-auto text-red-500" />
          <h2 className="text-2xl font-black text-red-400">ไม่อนุญาตให้เข้าสอบ (สายเกินกำหนด)</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            ข้อสอบชุดนี้บังคับเข้าสอบตรงเวลา ({settings.startTime} น.) <br/>
            คุณเข้าสู่ระบบช้าเกินกว่า {settings.lateTolerance} นาทีที่อนุโลมไว้
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-[#0f172a] text-white font-sans ${examState === 'taking' && isPdfOrImage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      
      {/* 🟢 STATE 1: ลงทะเบียนก่อนเริ่มสอบ */}
      {examState === 'intro' && accessStatus === 'open' && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#020617] to-[#0f172a]">
          <div className="max-w-2xl w-full bg-slate-900 border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300 mt-10 mb-10">
            <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: branding.primaryColor }}></div>
            <div className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4 mb-8">
                {isFree ? (
                  <div className="text-center space-y-2">
                    <img src="/niivaasmartevent_logo.png" alt="NiiVaa SmartExam" className="h-10 mx-auto object-contain" />
                  </div>
                ) : (
                  branding.orgLogo ? <img src={branding.orgLogo} alt="Logo" className="w-20 h-20 rounded-full object-cover bg-white" /> 
                                   : <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center"><FileText size={32} className="text-gray-400" /></div>
                )}
                <h1 className="text-2xl sm:text-3xl font-black text-white text-center leading-tight">{examConfig.title}</h1>
              </div>

              <div className="bg-black/40 rounded-2xl p-6 mb-6 border border-white/5 space-y-3 text-sm shadow-inner">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                  <div><span className="text-gray-400">สถานที่สอบ:</span> {metadata?.schoolName || metadata?.orgName || '-'}</div>
                  <div><span className="text-gray-400">ระดับชั้น:</span> {metadata?.level || examConfig.education_level}</div>
                  <div><span className="text-gray-400">รายวิชา:</span> {metadata?.subjectName || '-'} ({metadata?.subjectCode || '-'})</div>
                  <div><span className="text-gray-400">สอบวันที่:</span> {settings.examDate ? new Date(settings.examDate).toLocaleDateString('th-TH') : '-'}</div>
                  <div className="col-span-1 sm:col-span-2 border-t border-white/10 mt-2 pt-4 flex flex-wrap justify-between items-center gap-2">
                    <div className="text-lg">จำนวน <strong className="text-white">{questions.length}</strong> ข้อ</div>
                    <div className="text-lg">เวลาสอบ <strong className="text-white">{settings.startTime || '-'} - {settings.endTime || '-'}</strong> น.</div>
                    <div className="text-lg">คะแนนเต็ม <strong className="text-white">{examConfig.total_score || questions.length}</strong> คะแนน</div>
                  </div>
                </div>
              </div>

              {/* 🌟 ส่วนแสดงคำชี้แจง */}
              <div className="mb-8">
                <span className="font-bold block mb-2 text-amber-500 flex items-center gap-2">
                    <Info size={18}/> คำชี้แจงการทำแบบทดสอบ:
                </span>
                <div className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-white/10 shadow-inner">
                    {metadata?.instructions || 'เลือกคำตอบที่ถูกต้อง หรือพิมพ์คำตอบให้สมบูรณ์'}
                </div>
              </div>

              <div className="space-y-4 mb-8 bg-slate-800/30 p-6 rounded-2xl border border-white/5">
                <h3 className="font-bold text-white mb-2">ข้อมูลผู้เข้าสอบ</h3>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">รหัสประจำตัวนักเรียน (Student ID) *</label>
                  <input type="text" value={studentInfo.studentId} onChange={e => setStudentInfo({...studentInfo, studentId: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 font-mono text-lg tracking-wider" placeholder="เช่น 670123" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">ชื่อ-นามสกุล *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" value={studentInfo.name} onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} placeholder="นาย / นางสาว / ด.ช. / ด.ญ." className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
              </div>

              <button onClick={handleStartExam} className="w-full py-4 text-black font-black rounded-xl transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg shadow-lg hover:brightness-110" style={{ backgroundColor: branding.primaryColor }}>
                ยืนยันตัวตนและเริ่มทำข้อสอบ <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 STATE 2: กำลังทำข้อสอบ (Taking) */}
      {examState === 'taking' && (
        <div className="flex flex-col h-full w-full">
          
          <nav className="w-full bg-slate-950 border-b border-white/10 sticky top-0 z-50 shadow-xl shrink-0">
            <div className={`w-full py-2 flex items-center justify-center gap-2 text-lg sm:text-xl font-black transition-colors ${timeLeft < 300 ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
              <Clock size={20} className={timeLeft < 300 ? 'animate-bounce' : ''} /> 
              {timeLeft < 300 && "เหลือเวลาอีก: "} {formatTime(timeLeft)}
            </div>
            
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-sm truncate max-w-[200px] md:max-w-md">{studentInfo.name} <span className="text-gray-500 font-normal ml-2">({studentInfo.studentId})</span></div>
                <div className="text-xs text-gray-400 mt-1">
                  ทำแล้ว <strong className="text-white">{Object.values(answers).filter(v => v && v.trim() !== '').length}</strong> จาก {questions.length} ข้อ
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                {/* 🌟 ปุ่มเปิดคำชี้แจงระหว่างทำข้อสอบ */}
                <button 
                    onClick={() => setShowInstructionsModal(true)} 
                    className="p-2 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg flex items-center gap-1.5 transition-colors border border-cyan-500/20 shadow-sm"
                >
                    <Info size={16} /> <span className="hidden sm:inline text-xs font-bold">คำชี้แจง</span>
                </button>

                <button onClick={handleSubmitExam} className="px-4 py-2 sm:px-6 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <Send size={16} /> <span className="hidden sm:inline">ส่งคำตอบ</span>
                </button>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-800"><div className="h-full transition-all duration-300" style={{ width: `${(Object.values(answers).filter(v => v && v.trim() !== '').length / questions.length) * 100}%`, backgroundColor: branding.primaryColor }}></div></div>
          </nav>

          {isPdfOrImage ? (
            // ==========================================
            // โหมด 2.1: PDF / รูปภาพ (Virtual OMR)
            // ==========================================
            <div className="flex-1 relative flex overflow-hidden">
              <div className="flex-1 h-full bg-[#1e293b] relative">
                {examConfig.exam_format === 'pdf' || (examConfig.file_url && examConfig.file_url.toLowerCase().includes('.pdf')) ? (
                  <iframe src={`${examConfig.file_url}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full border-none absolute inset-0" title="Exam Document" />
                ) : (
                  <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col items-center gap-6 bg-[#0f172a] p-4 pb-40">
                    {/* กรณีมีหลายรูปภาพ (Multi-Image) */}
                    {examConfig.image_urls && examConfig.image_urls.length > 0 ? (
                      examConfig.image_urls.map((url: string, imgIndex: number) => (
                        <div key={imgIndex} className="relative w-full max-w-3xl shadow-2xl rounded-xl bg-white overflow-hidden shrink-0">
                          <img src={url} alt={`Page ${imgIndex + 1}`} className="w-full h-auto block pointer-events-none" />
                          
                          {/* เรนเดอร์ตรายางข้อสอบ */}
                          {questions.filter(q => q.image_index === imgIndex).map((q) => (
                            <div
                              key={q.id}
                              className="absolute flex items-center justify-center font-black rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 border-white pointer-events-none"
                              style={{
                                left: `${q.marker_x_percent}%`,
                                top: `${q.marker_y_percent}%`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: examConfig.metadata?.stamp_color || '#f59e0b',
                                color: '#ffffff',
                                width: 'clamp(24px, 4vw, 36px)',
                                height: 'clamp(24px, 4vw, 36px)',
                                fontSize: 'clamp(12px, 2vw, 16px)'
                              }}
                            >
                              {q.question_number}
                            </div>
                          ))}

                          {/* 🌟 เรนเดอร์กล่องข้อความ (Annotations) บนภาพ */}
                          {examConfig.metadata?.annotations?.filter((a: any) => a.image_index === imgIndex).map((anno: any) => (
                            <div
                                key={anno.id}
                                className="absolute p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] border border-white/20 pointer-events-none font-bold whitespace-pre-wrap leading-tight"
                                style={{
                                    left: `${anno.x_percent}%`, top: `${anno.y_percent}%`,
                                    backgroundColor: anno.bg_color, color: anno.text_color, fontSize: `${anno.font_size}px`,
                                    transform: 'translate(0, -50%)', maxWidth: '80%'
                                }}
                            >
                                {anno.text}
                            </div>
                          ))}

                        </div>
                      ))
                    ) : (
                      /* กรณีมีรูปภาพเดียว (โหมดเก่า) */
                      <div className="relative w-full max-w-3xl shadow-2xl rounded-xl bg-white overflow-hidden shrink-0">
                        <img src={examConfig.file_url} alt="Exam" className="w-full h-auto block" />
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
              </div>

              {currentQ && (
                <div className="absolute bottom-6 right-6 md:right-10 w-[90%] md:w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 z-40 animate-in slide-in-from-bottom-10">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-gray-400">ข้อที่</span>
                      <span className="text-3xl font-black text-cyan-400 leading-none">{safeQuestionNumber}</span>
                      <span className="text-sm font-bold text-gray-600">/ {questions.length}</span>
                    </div>
                    <button onClick={() => toggleFlag(safeQuestionId)} className={`p-2.5 rounded-xl border transition-all ${flagged.includes(safeQuestionId) ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-slate-800 border-slate-700 text-gray-400 hover:bg-slate-700 hover:text-white'}`}>
                      <Flag size={20} className={flagged.includes(safeQuestionId) ? 'fill-current' : ''} />
                    </button>
                  </div>

                  {/* แสดง Input หรือปุ่ม กขคง ตามประเภทข้อสอบ */}
                  {isShortAnswerMode ? (
                    <div className="mb-6 relative z-50">
                      <label className="text-xs text-gray-400 mb-2 block flex items-center justify-center gap-1"><Hash size={12}/> พิมพ์คำตอบที่ถูกต้องด้านล่าง</label>
                      <input 
                        key={`input-${safeQuestionId}`}
                        type="text" 
                        value={answers[safeQuestionId] || ''} 
                        onChange={(e) => handleSelectOption(safeQuestionId, e.target.value, true)}
                        onMouseDown={(e) => e.stopPropagation()} 
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="ระบุคำตอบ"
                        className="w-full bg-slate-950 border-2 border-cyan-500/50 rounded-2xl p-4 text-center text-xl font-black text-cyan-400 focus:outline-none focus:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)] placeholder:text-slate-600 placeholder:text-sm"
                        style={{ pointerEvents: 'auto', userSelect: 'auto' }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-3 mb-6">
                      {currentQ?.options?.map((opt: any) => (
                        <button
                          key={opt.id} onClick={() => handleSelectOption(safeQuestionId, opt.id, false)}
                          className={`flex-1 min-w-[50px] aspect-square rounded-2xl flex items-center justify-center text-2xl font-black transition-all border-2 ${
                            answers[safeQuestionId] === opt.id ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-105' : 'bg-slate-800/80 border-slate-700 text-gray-300 hover:bg-slate-700'
                          }`}
                        >
                          {opt.id}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                    <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="flex-1 py-3 hover:bg-slate-800 disabled:opacity-30 rounded-xl flex justify-center text-gray-300 transition-colors"><ChevronLeft size={24} /></button>
                    <div className="w-[1px] h-8 bg-white/10"></div>
                    <button onClick={() => setShowGrid(true)} className="flex-1 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-xl flex justify-center transition-colors"><LayoutGrid size={22} /></button>
                    <div className="w-[1px] h-8 bg-white/10"></div>
                    <button disabled={currentQuestionIndex === questions.length - 1} onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="flex-1 py-3 hover:bg-slate-800 disabled:opacity-30 rounded-xl flex justify-center text-gray-300 transition-colors"><ChevronRight size={24} /></button>
                  </div>
                </div>
              )}

              {showGrid && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-white/5">
                      <div>
                        <h3 className="text-xl font-black text-white flex items-center gap-3"><LayoutGrid className="text-indigo-400" /> ภาพรวมกระดาษคำตอบ</h3>
                        <div className="flex gap-4 mt-3 text-xs font-bold">
                          <span className="flex items-center gap-1.5 text-gray-400"><div className="w-3 h-3 bg-slate-800 rounded-sm"></div> ยังไม่ได้ทำ</span>
                          <span className="flex items-center gap-1.5 text-cyan-400"><div className="w-3 h-3 bg-cyan-500 rounded-sm"></div> ทำแล้ว</span>
                          <span className="flex items-center gap-1.5 text-orange-400"><Flag size={12} className="fill-current" /> ทบทวน</span>
                        </div>
                      </div>
                      <button onClick={() => setShowGrid(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white font-bold">X</button>
                    </div>
                    <div className="p-8 overflow-y-auto custom-scrollbar grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                      {questions.map((q, idx) => {
                        const qIdStr = q?.id || `safe-id-${idx}`;
                        const ans = answers[qIdStr];
                        const isAns = ans !== undefined && ans.trim() !== '';
                        const isFlag = flagged.includes(qIdStr);
                        return (
                          <button
                            key={qIdStr} onClick={() => { setCurrentQuestionIndex(idx); setShowGrid(false); }}
                            className={`relative aspect-square rounded-xl flex items-center justify-center text-sm md:text-base font-black border-2 hover:scale-110 transition-all ${
                              idx === currentQuestionIndex ? 'ring-2 ring-white ring-offset-4 ring-offset-slate-900 z-10' : ''
                            } ${isAns ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-gray-400'}`}
                          >
                            {q.question_number || (idx + 1)}
                            {isFlag && <div className="absolute -top-2 -right-2 bg-orange-500 w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900"><Flag size={8} className="text-white fill-current" /></div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ==========================================
            // โหมด 2.2: Standard (ข้อสอบแบบพิมพ์ข้อความ)
            // ==========================================
            <div className="flex-1 overflow-auto pb-32">
              <div className="max-w-3xl mx-auto px-4 mt-8 space-y-6">
                {questions.map((q, idx) => {
                  const isThisQShortAnswer = q.question_type === 'short_answer' || !q.options || q.options.length === 0;

                  return (
                    <div key={q.id || `std-${idx}`} id={`q-${idx}`} className="bg-slate-900 border border-white/10 rounded-3xl p-6 md:p-8 shadow-md">
                      <div className="flex gap-4 items-start mb-6 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-lg" style={{ backgroundColor: `${branding.primaryColor}20`, color: branding.primaryColor }}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-base md:text-lg text-white font-medium leading-relaxed whitespace-pre-wrap">{q.question_text}</p>
                          {q.image_url && <img src={q.image_url} alt="ภาพประกอบ" className="max-w-sm max-h-64 rounded-xl border border-white/10 mt-4 object-contain bg-black/50" />}
                        </div>
                      </div>

                      <div className="space-y-3 pl-0 md:pl-14">
                        {isThisQShortAnswer ? (
                          <div className="mt-4 relative z-50">
                            <input 
                              key={`input-std-${q.id}`}
                              type="text" 
                              value={answers[q.id] || ''} 
                              onChange={(e) => handleSelectOption(q.id, e.target.value, true)}
                              onMouseDown={(e) => e.stopPropagation()} 
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              placeholder="พิมพ์คำตอบของคุณที่นี่..."
                              className="w-full sm:w-2/3 bg-slate-950 border border-white/20 focus:border-amber-500 rounded-xl px-4 py-3 text-white text-lg outline-none transition-colors"
                              style={{ pointerEvents: 'auto', userSelect: 'auto' }}
                            />
                          </div>
                        ) : (
                          q.options?.map((opt: any) => {
                            const isSelected = answers[q.id] === opt.id;
                            return (
                              <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${isSelected ? 'shadow-inner scale-[1.01]' : 'bg-slate-950 border-white/5 hover:border-white/20'}`} style={{ backgroundColor: isSelected ? `${branding.primaryColor}15` : '', borderColor: isSelected ? branding.primaryColor : '' }}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? '' : 'border-gray-500'}`} style={{ borderColor: isSelected ? branding.primaryColor : '' }}>
                                  {isSelected && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: branding.primaryColor }}></div>}
                                </div>
                                <span className={`text-sm md:text-base ${isSelected ? 'font-bold text-white' : 'text-gray-300'}`}>{opt.id}. {opt.text}</span>
                                <input type="radio" value={opt.id} checked={isSelected} onChange={() => handleSelectOption(q.id, opt.id, false)} className="hidden" />
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🟢 STATE 3: ส่งข้อสอบแล้ว (Submitted) */}
      {examState === 'submitted' && (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-[#020617] to-[#0f172a]">
          <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 mx-auto bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/10">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-black text-white">บันทึกคำตอบสำเร็จ!</h2>
            <p className="text-gray-400 text-sm">ระบบได้บันทึกคำตอบของคุณ {studentInfo.name} ({studentInfo.studentId}) ส่งให้คุณครูเรียบร้อยแล้ว</p>

            {settings?.scoreVisibility === 'immediate' ? (
              <div className="bg-black/50 p-6 rounded-2xl border border-white/5 mt-6">
                <div className="text-sm text-gray-500 mb-2">คะแนนที่คุณทำได้</div>
                <div className="text-5xl font-black flex items-baseline justify-center gap-2" style={{ color: branding.primaryColor }}>
                  {scoreResult.earnedScore} <span className="text-xl text-gray-500">/ {scoreResult.totalScore}</span>
                </div>
                <div className="text-xs text-gray-500 mt-4">ตอบถูก {scoreResult.correctCount} จาก {questions.length} ข้อ</div>
              </div>
            ) : settings?.scoreVisibility === 'delayed' ? (
              <div className="bg-black/50 p-6 rounded-2xl border border-white/5 mt-6 flex flex-col items-center gap-3">
                <Clock size={32} className="text-blue-400" />
                <div className="text-sm text-gray-300 font-medium">คะแนนถูกซ่อนไว้ชั่วคราว</div>
                <div className="text-xs text-gray-500">ระบบจะแสดงผลคะแนนของคุณอัตโนมัติ<br/>หลังจากหมดเวลาสอบของทุกคน</div>
              </div>
            ) : (
              <div className="bg-black/50 p-6 rounded-2xl border border-white/5 mt-6 flex flex-col items-center gap-3">
                <Lock size={32} className="text-gray-500" />
                <div className="text-sm text-gray-300 font-medium">คะแนนส่วนนี้เป็นความลับ</div>
                <div className="text-xs text-gray-500">กรุณารอการประกาศผลอย่างเป็นทางการ<br/>จากคุณครูประจำวิชาของคุณ</div>
              </div>
            )}

            <button onClick={() => window.close()} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl mt-4 transition-colors">
              ออกจากระบบ / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* 🌟 Modal: แสดงคำชี้แจงระหว่างทำข้อสอบ */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-black text-cyan-400 mb-4 flex items-center gap-2">
                    <Info size={24} /> คำชี้แจงการทำแบบทดสอบ
                </h3>
                <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-6 bg-slate-950 p-5 rounded-2xl border border-white/5 shadow-inner">
                    {metadata?.instructions || 'เลือกคำตอบที่ถูกต้อง หรือพิมพ์คำตอบให้สมบูรณ์ในช่องที่กำหนด'}
                </div>
                <button 
                    onClick={() => setShowInstructionsModal(false)} 
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-white/10"
                >
                    รับทราบ และกลับไปทำข้อสอบ
                </button>
            </div>
        </div>
      )}

    </div>
  );
}