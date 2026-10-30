"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Search, ShoppingCart, CheckSquare, 
  Loader2, Library, FolderOpen, BookOpen, FileText, ChevronRight, Home, GraduationCap, Image as ImageIcon, Layers, Edit3, X, MonitorUp
} from 'lucide-react';

// 🌟 โครงสร้างหมวดหมู่แบบลำดับชั้น
const BASIC_SUBJECTS = [
  'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 
  'สังคมศึกษา', 'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 
  'ศิลปศึกษา', 'การงานอาชีพ'
];

const EXAM_CATEGORIES = [
  { 
    id: 'primary', 
    label: 'ทั่วไป', 
    description: 'ข้อสอบทั่วไปที่ไม่ระบุระดับชั้น',
    subjects: ['ทั่วไป', ...BASIC_SUBJECTS]
  },
  { 
    id: 'junior_high', 
    label: 'ม.ต้น', 
    description: 'มัธยมศึกษาตอนต้น (ม.1 - ม.3)',
    subjects: ['ทั่วไป', ...BASIC_SUBJECTS]
  },
  { 
    id: 'senior_high', 
    label: 'ม.ปลาย', 
    description: 'มัธยมศึกษาตอนปลาย (ม.4 - ม.6)',
    subjects: [
      'ทั่วไป', ...BASIC_SUBJECTS, 
      'ฟิสิกส์', 'เคมี', 'ชีววิทยา', 
      'วิทยาศาสตร์โลกและอวกาศ'
    ]
  }
];

export default function QuestionBankPage() {
  const router = useRouter();
  
  // 🌟 Navigation States
  const [viewLevel, setViewLevel] = useState<'category' | 'subject' | 'content' | 'question'>('category');
  
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  // 🌟 Tab State สำหรับเลือกระหว่าง ข้อสอบรายข้อ (Splitter) กับ ชุดข้อสอบ
  const [activeTab, setActiveTab] = useState<'standalone' | 'exams'>('standalone');

  // 🌟 Data States
  const [examsList, setExamsList] = useState<any[]>([]);
  const [standaloneQuestions, setStandaloneQuestions] = useState<any[]>([]);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 Modal States สำหรับจัดการเฉลย
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editForm, setEditForm] = useState({ correct_answer: '1', solution_text: '', solution_image_url: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  // 🌟 ฟังก์ชันเปิด Modal แก้ไขเฉลย
  const handleOpenEditModal = (q: any, e: React.MouseEvent) => {
    e.stopPropagation(); // ป้องกันไม่ให้การกดปุ่มไปทริกเกอร์การหยิบใส่ตะกร้า
    setEditingQuestion(q);
    setEditForm({
      correct_answer: q.correct_answer || '1',
      solution_text: q.solution_text || '',
      solution_image_url: q.solution_image_url || ''
    });
  };

  // 🌟 ฟังก์ชันบันทึกข้อมูลเฉลยลงฐานข้อมูล
  const handleSaveSolution = async () => {
    if (!editingQuestion) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('exam_questions')
        .update({
          correct_answer: editForm.correct_answer,
          solution_text: editForm.solution_text,
          solution_image_url: editForm.solution_image_url
        })
        .eq('id', editingQuestion.id);

      if (error) throw error;

      // อัปเดตข้อมูลใน State ทันทีเพื่อให้หน้าจอเปลี่ยนโดยไม่ต้องรีเฟรช
      setStandaloneQuestions(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...editForm } : q));
      setQuestionsList(prev => prev.map(q => q.id === editingQuestion.id ? { ...q, ...editForm } : q));
      
      setEditingQuestion(null);
      alert("บันทึกเฉลยเรียบร้อยแล้ว!");
    } catch (err: any) {
      alert("บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // 🌟 Cart
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('smart_exam_cart');
    if (savedCart) { 
      try { setCart(JSON.parse(savedCart)); } catch (e) {} 
    }
  }, []);

  // 📡 ฟังก์ชันดึงข้อมูลเมื่อเลือกวิชาย่อย (ดึงมาทั้งชุดข้อสอบและข้อสอบรายข้อ)
  // 📡 ฟังก์ชันดึงข้อมูลเมื่อเลือกวิชาย่อย (ดึงมาทั้งชุดข้อสอบและข้อสอบรายข้อ)
  const fetchSubjectContent = async (categoryLabel: string, subjectLabel: string) => {
    setIsLoading(true);
    setViewLevel('content');
    try {
      // 🌟 1. สร้าง Array ดักจับคำค้นหาให้ครอบคลุมระดับชั้นย่อย
      let levelsToSearch = [categoryLabel];
      if (categoryLabel === 'ม.ปลาย') {
        levelsToSearch = ['ม.ปลาย', 'ม.4', 'ม.5', 'ม.6'];
      } else if (categoryLabel === 'ม.ต้น') {
        levelsToSearch = ['ม.ต้น', 'ม.1', 'ม.2', 'ม.3', 'สอบเข้า ม.4'];
      } else if (categoryLabel === 'ทั่วไป' || categoryLabel === 'ระดับประถมศึกษา') {
        levelsToSearch = ['ทั่วไป', 'ระดับประถมศึกษา', 'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'สอบเข้า ม.1'];
      }

      // 2. ดึงชุดข้อสอบ (Exams) - 🌟 เปลี่ยนจาก .eq เป็น .in()
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, title, status, total_score, created_at')
        .in('education_level', levelsToSearch) 
        .eq('subject_category', subjectLabel)
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;
      setExamsList(examsData || []);

      // 3. ดึงข้อสอบรายข้อที่มาจาก Splitter (is_bank_item = true) - 🌟 เปลี่ยนจาก .eq เป็น .in()
      const { data: standaloneData, error: standaloneError } = await supabase
        .from('exam_questions')
        .select('*')
        .in('education_level', levelsToSearch) 
        .eq('subject_category', subjectLabel)
        .eq('is_bank_item', true)
        .order('id', { ascending: false });

      if (standaloneError) throw standaloneError;
      setStandaloneQuestions(standaloneData || []);

    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 📡 ดึง "ข้อสอบ" ภายในชุดข้อสอบ
  const fetchQuestionsList = async (exam: any) => {
    setIsLoading(true);
    setViewLevel('question');
    setSelectedExam(exam);
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', exam.id)
        .order('question_number', { ascending: true });

      if (error) throw error;
      setQuestionsList(data || []);
    } catch (err: any) { 
      alert(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 🛒 ตะกร้า
  const toggleCart = (question: any) => {
    setCart(prev => {
      const isExists = prev.some(q => q.id === question.id);
      const newCart = isExists ? prev.filter(q => q.id !== question.id) : [...prev, question];
      localStorage.setItem('smart_exam_cart', JSON.stringify(newCart));
      return newCart;
    });
  };
  const isQuestionInCart = (id: string) => cart.some(q => q.id === id);

  // 🍞 BREADCRUMBS
  const Breadcrumbs = () => (
    <div className="flex items-center flex-wrap gap-2 text-xs md:text-sm font-bold bg-slate-900/50 p-3 rounded-xl border border-slate-800 mb-6">
      <button 
        onClick={() => setViewLevel('category')} 
        className={`flex items-center gap-1.5 transition-colors ${viewLevel === 'category' ? 'text-cyan-400' : 'text-slate-500 hover:text-white'}`}
      >
        <Home size={14} /> หมวดหลัก
      </button>
      
      {viewLevel !== 'category' && selectedCategory && (
        <>
          <ChevronRight size={14} className="text-slate-600" />
          <button 
            onClick={() => setViewLevel('subject')} 
            className={`transition-colors ${viewLevel === 'subject' ? 'text-cyan-400' : 'text-slate-500 hover:text-white'}`}
          >
            {selectedCategory.label}
          </button>
        </>
      )}

      {(viewLevel === 'content' || viewLevel === 'question') && selectedSubject && (
        <>
          <ChevronRight size={14} className="text-slate-600" />
          <button 
            onClick={() => { setViewLevel('content'); fetchSubjectContent(selectedCategory.label, selectedSubject); }} 
            className={`transition-colors ${viewLevel === 'content' ? 'text-cyan-400' : 'text-slate-500 hover:text-white'}`}
          >
            {selectedSubject}
          </button>
        </>
      )}

      {viewLevel === 'question' && selectedExam && (
        <>
          <ChevronRight size={14} className="text-slate-600" />
          <span className="text-cyan-400 truncate max-w-[150px] md:max-w-xs" title={selectedExam.title}>
            {selectedExam.title}
          </span>
        </>
      )}
    </div>
  );

  // 🧩 คอมโพเนนต์แสดงการ์ดข้อสอบ (รองรับทั้งรูปภาพและข้อความ)
  const QuestionCard = ({ q, idx }: { q: any, idx?: number }) => {
    const inCart = isQuestionInCart(q.id);
    return (
      <div 
        onClick={() => toggleCart(q)}
        className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex gap-4 group ${
          inCart ? 'bg-slate-800 shadow-[0_5px_20px_rgba(0,0,0,0.3)] border-cyan-500' : 'bg-slate-900/30 border-slate-800 hover:bg-slate-800/50 hover:border-slate-600'
        }`}
      >
        <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all duration-300 ${inCart ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-slate-600 text-transparent'}`}>
          <CheckSquare size={12} className={inCart ? 'opacity-100' : 'opacity-0'} strokeWidth={3} />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold bg-slate-800 text-slate-400 px-2 py-1 rounded">
              ข้อที่ {q.display_label || idx}
            </span>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-white/5">
              {q.question_type === 'mcq' ? 'ปรนัย' : 'อัตนัย'} | {q.score} คะแนน
            </span>
          </div>
          
          {/* แสดงรูปภาพ ถ้าเป็นข้อสอบจาก Splitter */}
          {q.image_url ? (
            <div className="bg-white rounded-lg p-2 max-w-sm border border-white/20">
              <img src={q.image_url} alt="Question" className="w-full h-auto object-contain rounded" />
            </div>
          ) : (
            <p className={`font-bold text-sm leading-relaxed ${inCart ? 'text-cyan-100' : 'text-slate-200'}`}>
              {q.question_text}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans selection:bg-cyan-500/30">
      
      {/* 🟢 HEADER / NAVBAR */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shadow-xl shadow-black/20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/smart-exam-dashboard')} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-black flex items-center gap-2">
              <Library className="text-cyan-500" /> NiiVaa Exam Bank
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => router.push('/smartexam/splitter')} className="bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-500 flex items-center gap-2 transition-colors">
               <ImageIcon size={14}/> หั่นข้อสอบเพิ่ม
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 mt-8 space-y-2 relative z-10">
        
        <Breadcrumbs />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="animate-spin mb-4 text-cyan-500" size={40} />
            <p className="font-medium tracking-wide">กำลังดึงข้อมูล...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            {/* 🔴 LEVEL 0: หมวดหมู่หลัก */}
            {viewLevel === 'category' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {EXAM_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat); setViewLevel('subject'); }}
                    className="flex flex-col items-start p-6 bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-3xl transition-all group shadow-lg text-left relative overflow-hidden"
                  >
                    <div className="w-14 h-14 bg-cyan-950/50 group-hover:bg-cyan-900/60 rounded-2xl flex items-center justify-center transition-colors mb-4 border border-cyan-800/30">
                      <FolderOpen size={28} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="font-bold text-slate-200 group-hover:text-white text-lg block mb-1">
                      {cat.label}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed font-normal">
                      {cat.description}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* 🔴 LEVEL 1: วิชาย่อย */}
            {viewLevel === 'subject' && selectedCategory && (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <GraduationCap className="text-cyan-400" size={20} />
                    ระดับ: <span className="text-cyan-400">{selectedCategory.label}</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedCategory.subjects.map((sub: string) => (
                    <button
                      key={sub}
                      onClick={() => { setSelectedSubject(sub); fetchSubjectContent(selectedCategory.label, sub); }}
                      className="flex items-center gap-3 p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition-all group text-left shadow-sm"
                    >
                      <BookOpen size={18} className="text-indigo-400 shrink-0" />
                      <span className="font-bold text-slate-300 group-hover:text-white text-sm leading-tight">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 🔴 LEVEL 2: เนื้อหา (ข้อสอบรายข้อ หรือ ชุดข้อสอบ) */}
            {viewLevel === 'content' && (
              <div className="space-y-6">
                {/* 🌟 Tab Navigation */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                  <button 
                    onClick={() => setActiveTab('standalone')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'standalone' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                  >
                    <Layers size={16} /> ข้อสอบรายข้อ ({standaloneQuestions.length})
                  </button>
                  <button 
                    onClick={() => setActiveTab('exams')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeTab === 'exams' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                  >
                    <FileText size={16} /> ชุดข้อสอบ ({examsList.length})
                  </button>
                </div>

                {/* 🌟 แสดงข้อสอบรายข้อ (จาก Splitter) */}
                {activeTab === 'standalone' && (
                  <div>
                    {standaloneQuestions.length === 0 ? (
                       <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
                         <ImageIcon size={48} className="mx-auto mb-4 opacity-30" />
                         <p className="text-lg font-bold text-slate-300 mb-1">ยังไม่มีข้อสอบรายข้อ</p>
                         <p className="text-sm">คุณสามารถใช้เครื่องมือ Smart Splitter เพื่อหั่นและเพิ่มข้อสอบเข้าหมวดนี้ได้</p>
                       </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {standaloneQuestions.map((q, idx) => (
                          <QuestionCard key={q.id} q={q} idx={idx + 1} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 🌟 แสดงชุดข้อสอบ */}
                {activeTab === 'exams' && (
                  <div>
                    {examsList.length === 0 ? (
                      <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center text-slate-500">
                        <FileText size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-bold text-slate-300 mb-1">ยังไม่มีชุดข้อสอบในหมวดนี้</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {examsList.map((exam) => (
                          <button
                            key={exam.id}
                            onClick={() => fetchQuestionsList(exam)}
                            className="flex flex-col p-5 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl transition-all text-left group"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                                {exam.title}
                              </h3>
                              <span className="shrink-0 bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
                                เปิดดูข้อสอบ
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                              <span>คะแนนเต็ม: {exam.total_score}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 🔴 LEVEL 3: ข้อสอบภายในชุด (เมื่อกดดูจากแท็บชุดข้อสอบ) */}
            {viewLevel === 'question' && selectedExam && (
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-800 pb-3 px-1 mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    ข้อสอบในชุดนี้ <span className="bg-slate-800 text-cyan-400 text-xs px-2 py-0.5 rounded-full">{questionsList.length} ข้อ</span>
                  </h2>
                </div>
                {questionsList.length === 0 ? (
                  <p className="text-center text-slate-500 py-10">ไม่พบคำถามในชุดข้อสอบนี้</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {questionsList.map((q, idx) => (
                      <QuestionCard key={q.id} q={q} idx={idx + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* 🌟 Modal จัดการเฉลย */}
        {editingQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 rounded-t-2xl">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Edit3 size={18} className="text-indigo-400"/> จัดการเฉลยข้อสอบ
                </h3>
                <button onClick={() => setEditingQuestion(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">ตัวเลือกที่ถูกต้อง (เฉลยคีย์):</label>
                  <select 
                    value={editForm.correct_answer}
                    onChange={(e) => setEditForm({...editForm, correct_answer: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    <option value="-">- ไม่ระบุ -</option>
                    <option value="1">ตัวเลือกที่ 1 (ก)</option>
                    <option value="2">ตัวเลือกที่ 2 (ข)</option>
                    <option value="3">ตัวเลือกที่ 3 (ค)</option>
                    <option value="4">ตัวเลือกที่ 4 (ง)</option>
                    <option value="5">ตัวเลือกที่ 5 (จ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">คำอธิบายเฉลย (ข้อความ):</label>
                  <textarea 
                    value={editForm.solution_text}
                    onChange={(e) => setEditForm({...editForm, solution_text: e.target.value})}
                    placeholder="พิมพ์อธิบายวิธีทำ, สูตรที่ใช้ หรือทริคในการจำ..."
                    className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">ลิงก์ภาพเฉลยละเอียด (ถ้ามี):</label>
                  <input 
                    type="text"
                    value={editForm.solution_image_url}
                    onChange={(e) => setEditForm({...editForm, solution_image_url: e.target.value})}
                    placeholder="วางลิงก์รูปภาพ (เช่น จาก Splitter หรือฝากไฟล์ไว้)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/50 rounded-b-2xl">
                <button 
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSaveSolution}
                  disabled={isUpdating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                  บันทึกเฉลย
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 🛒 Floating Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-gradient-to-r from-amber-600 to-orange-500 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 flex items-center justify-between border border-white/20 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-4 text-white font-black drop-shadow-md">
            <div className="bg-black/20 p-2.5 rounded-xl relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white text-[10px] flex items-center justify-center rounded-full border-2 border-orange-500 shadow-lg">{cart.length}</span>
            </div>
            <div>
              <div className="text-sm md:text-base leading-none tracking-wide">หยิบใส่ตะกร้า {cart.length} ข้อ</div>
              <div className="text-[9px] text-white/90 mt-1 uppercase tracking-widest">พร้อมนำไปจัดชุดสอบ (Builder)</div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/smartexam/builder')}
            className="bg-slate-950 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-black transition-all flex items-center gap-2 shadow-xl border border-slate-700"
          >
            นำไปจัดชุด
          </button>
        </div>
      )}
    </div>
  );
}