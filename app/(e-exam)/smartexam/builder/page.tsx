"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Save, Loader2, ListOrdered, FileText,
  School, Trash2, Building2, Palette, Image as ImageIcon, Calendar,
  Clock, Settings, Eye, AlertCircle, X, Search, Database, Plus,
  CheckSquare, BookOpen, ChevronDown, Target
} from 'lucide-react';

function QuestionBankModal({ isOpen, onClose, onAddQuestions, existingQuestionIds }: any) {
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 เพิ่ม State สำหรับเก็บ ID ของข้อที่กำลังกด Preview
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');

  const [levels, setLevels] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) fetchBankQuestions();
  }, [isOpen]);

  const fetchBankQuestions = async () => {
    setIsLoading(true);
    try {
      // 🌟 ดึง image_urls จากแฟ้มหลัก (exams) มาด้วย เพื่อใช้พรีวิวข้อสอบแบบ PDF/รูปภาพแผ่นใหญ่
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*, exams!inner(education_level, subject_category, difficulty_level, image_urls)')
        .neq('exams.difficulty_level', 'จัดชุดผสม');

      if (error) throw error;

      if (data) {
        const formattedData = data.map(q => ({
          ...q,
          education_level: q.education_level || q.exams?.education_level || 'ทั่วไป',
          subject_category: q.subject_category || q.exams?.subject_category || 'ทั่วไป'
        }));

        setBankQuestions(formattedData);
        setFilteredQuestions(formattedData);

        const uniqueLevels = Array.from(new Set(formattedData.map(q => q.education_level).filter(Boolean)));
        const uniqueSubjects = Array.from(new Set(formattedData.map(q => q.subject_category).filter(Boolean)));

        setLevels(uniqueLevels as string[]);
        setSubjects(uniqueSubjects as string[]);
      }
    } catch (error: any) {
      console.error("Error fetching bank:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let result = bankQuestions;

    if (selectedLevel !== 'all') result = result.filter(q => q.education_level === selectedLevel);
    if (selectedSubject !== 'all') result = result.filter(q => q.subject_category === selectedSubject);

    if (searchQuery) {
      result = result.filter(q =>
        q.question_text?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredQuestions(result);
  }, [searchQuery, selectedLevel, selectedSubject, bankQuestions]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]);
  };

  const handleAddSelected = () => {
    const questionsToAdd = bankQuestions.filter(q => selectedIds.includes(q.id));
    onAddQuestions(questionsToAdd);
    setSelectedIds([]);
    setPreviewId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="text-emerald-400" size={24} /> คลังข้อสอบส่วนกลาง
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-slate-800/50 border-b border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text" placeholder="ค้นหาโจทย์ข้อสอบ..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none"
          >
            <option value="all">ทุกระดับชั้น</option>
            {levels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 appearance-none"
          >
            <option value="all">ทุกรายวิชา</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center text-slate-500 py-10">ไม่พบข้อสอบที่ตรงกับเงื่อนไข</div>
          ) : (
            filteredQuestions.map(q => {
              const isAlreadyInCart = existingQuestionIds.includes(q.id);
              const isSelected = selectedIds.includes(q.id);
              const isPreviewing = previewId === q.id;

              const displayImgUrl = q.image_url || (q.exams?.image_urls ? q.exams.image_urls[q.image_index || 0] : null);
              const isImageBased = !!displayImgUrl;

              return (
                <div key={q.id} className={`rounded-xl border transition-all overflow-hidden ${isAlreadyInCart ? 'bg-slate-800/30 border-slate-800' : isSelected ? 'bg-emerald-900/20 border-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>

                  <div className="p-4 flex gap-4 cursor-pointer" onClick={() => !isAlreadyInCart && toggleSelect(q.id)}>
                    <div className="pt-1">
                      {isAlreadyInCart ? (
                        <CheckSquare className="text-slate-600 cursor-not-allowed" size={20} />
                      ) : (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                          {isSelected && <CheckSquare className="text-white" size={14} />}
                        </div>
                      )}
                    </div>

                    {displayImgUrl ? (
                      <div className="w-12 h-12 bg-white rounded-md shrink-0 overflow-hidden border border-white/10">
                        <img src={displayImgUrl} className="w-full h-full object-cover" alt="exam" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-800 rounded-md shrink-0 flex items-center justify-center border border-white/5">
                        <FileText size={20} className="text-emerald-500/50" />
                      </div>
                    )}

                    <div className="flex-1">
                      {/* 🌟 จุดที่แก้: บังคับให้โชว์เลขข้อตรงนี้ */}
                      <p className="text-sm font-medium text-white mb-2 line-clamp-2">
                        <span className="text-amber-400 font-black mr-2 bg-amber-500/10 px-2 py-0.5 rounded">
                          ข้อ {q.display_label || q.question_number}
                        </span>
                        {(q.question_text && !q.question_text.includes('อิงจากภาพข้อสอบ'))
                          ? q.question_text
                          : <span className="text-gray-500 italic">อิงจากภาพข้อสอบต้นฉบับ</span>}
                      </p>

                      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                        {isImageBased ? (
                          <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded-md flex items-center gap-1"><ImageIcon size={10} /> จากรูปภาพ</span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded-md">ข้อความ / AI</span>
                        )}
                        <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded-md">{q.education_level || 'N/A'}</span>
                        <span className="px-2 py-1 bg-indigo-900/30 text-indigo-400 rounded-md">{q.subject_category || 'N/A'}</span>
                        {isAlreadyInCart && <span className="px-2 py-1 bg-emerald-900/30 text-emerald-400 rounded-md">อยู่ในชุดนี้แล้ว</span>}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewId(isPreviewing ? null : q.id);
                      }}
                      className={`px-3 py-1.5 h-fit rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 shrink-0 ${isPreviewing ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-gray-300 border-white/10 hover:bg-slate-700'}`}
                    >
                      <Eye size={14} /> พรีวิว
                    </button>
                  </div>

                  {isPreviewing && (
                    <div className="p-4 border-t border-slate-700 bg-black/40 cursor-default">
                      {/* 🌟 จุดที่แก้: เพิ่มเลขข้อในหน้าต่าง Preview ด้วย */}
                      <div className="text-xs text-amber-400 font-bold mb-3 flex items-center gap-2">
                        <Eye size={14} /> ตัวอย่างข้อสอบ (ข้อ {q.display_label || q.question_number})
                      </div>

                      {displayImgUrl && (
                        <div className="mb-4 bg-white/5 p-2 rounded-xl border border-white/10 inline-block w-full">
                          <img src={displayImgUrl} className="w-full max-h-72 object-contain rounded-lg" alt="Preview" />
                        </div>
                      )}

                      {(q.question_text && !q.question_text.includes('อิงจากภาพข้อสอบ')) && (
                        <div className="text-sm text-gray-200 mb-4 whitespace-pre-wrap">
                          {q.question_text}
                        </div>
                      )}

                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt: any) => (
                            <div key={opt.id} className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${opt.id === q.correct_answer ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold' : 'bg-slate-900 border-white/10 text-gray-400'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${opt.id === q.correct_answer ? 'border-emerald-500 text-emerald-400' : 'border-slate-700'}`}>
                                {opt.id}
                              </div>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
          <span className="text-sm text-slate-400">เลือกแล้ว <strong className="text-emerald-400">{selectedIds.length}</strong> ข้อ</span>
          <button
            onClick={handleAddSelected}
            disabled={selectedIds.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} /> เพิ่มลงชุดข้อสอบ
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamBuilderPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 🌟 State สำหรับเปิด/ปิดคู่มือ (Manual Slide-Over)
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('step1');

  const [userPackage, setUserPackage] = useState<'free' | 'pro' | 'premium'>('free');
  const [branding, setBranding] = useState({
    orgLogo: '',
    primaryColor: '#f59e0b',
    secondaryColor: '#fef3c7',
  });

  const [headerMode, setHeaderMode] = useState<'school' | 'other'>('school');

  const [examHeader, setExamHeader] = useState({
    title: 'ข้อสอบกลางภาคเรียนที่ 1/2569',
    schoolName: 'โรงเรียน...',
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    subjectName: 'เคมี',
    subjectCode: 'ว30221',
    level: 'มัธยมศึกษาปีที่ 4',
    teacherNames: 'นาย.... , นาง....',
    orgName: 'ชื่อหน่วยงาน',
    instructions: 'ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว',
    referenceImage: '' // 🌟 1. เพิ่มฟิลด์เก็บลิงก์ภาพอ้างอิง
  });

  // 🌟 2. เพิ่ม State และฟังก์ชันอัปโหลดภาพ (วางต่อจากบรรทัดด้านบนได้เลย)
  const [isUploadingRef, setIsUploadingRef] = useState(false);

  const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingRef(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ref_${Date.now()}.${fileExt}`;
      const filePath = `references/${fileName}`;

      // อัปโหลดไฟล์ขึ้น Supabase ถัง exam-assets
      const { error: uploadError } = await supabase.storage.from('exam-assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      // ดึงลิงก์ URL ออกมา
      const { data: publicUrlData } = supabase.storage.from('exam-assets').getPublicUrl(filePath);
      setExamHeader(prev => ({ ...prev, referenceImage: publicUrlData.publicUrl }));

    } catch (error: any) {
      alert("อัปโหลดภาพอ้างอิงไม่สำเร็จ: " + error.message);
    } finally {
      setIsUploadingRef(false);
    }
  };

  const [examSettings, setExamSettings] = useState({
    examDate: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    endTime: '09:30',
    duration: 60,
    timingMode: 'flexible',
    lateTolerance: 15,
    scoreVisibility: 'immediate'
  });

  const departmentOptions = [
    "กลุ่มสาระการเรียนรู้ภาษาไทย",
    "กลุ่มสาระการเรียนรู้คณิตศาสตร์",
    "กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี",
    "กลุ่มสาระการเรียนรู้สังคมศึกษา ศาสนา และวัฒนธรรม",
    "กลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา",
    "กลุ่มสาระการเรียนรู้ศิลปะ",
    "กลุ่มสาระการเรียนรู้การงานอาชีพ",
    "กลุ่มสาระการเรียนรู้ภาษาต่างประเทศ",
    "หมวดวิชาสมรรถนะแกนกลาง (อาชีวศึกษา)",
    "หมวดวิชาสมรรถนะวิชาชีพ (อาชีวศึกษา)"
  ];

  useEffect(() => {
    const savedCart = localStorage.getItem('smart_exam_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        const validated = parsed.map((q: any) => ({ ...q, score: q.score || 1 }));
        setQuestions(validated);
      } catch (e) {
        router.push('/smartexam/bank');
      }
    } else {
      router.push('/smartexam/bank');
    }
  }, [router]);

  const totalQuestions = questions.length;
  const totalScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);

  useEffect(() => {
    if (userPackage === 'free') {
      setBranding({ orgLogo: '', primaryColor: '#f59e0b', secondaryColor: '#fef3c7' });
    } else if (userPackage === 'pro') {
      setBranding({ orgLogo: 'https://api.dicebear.com/7.x/initials/svg?seed=School&backgroundColor=0284c7', primaryColor: '#0ea5e9', secondaryColor: '#e0f2fe' });
    } else {
      setBranding({ orgLogo: 'https://api.dicebear.com/7.x/initials/svg?seed=Org&backgroundColor=7c3aed', primaryColor: '#8b5cf6', secondaryColor: '#ede9fe' });
    }
  }, [userPackage]);

  useEffect(() => {
    if (examSettings.startTime && examSettings.endTime) {
      const start = new Date(`2000-01-01T${examSettings.startTime}`);
      const end = new Date(`2000-01-01T${examSettings.endTime}`);
      let diff = (end.getTime() - start.getTime()) / 60000;
      if (diff < 0) diff += 24 * 60;
      setExamSettings(prev => ({ ...prev, duration: diff }));
    }
  }, [examSettings.startTime, examSettings.endTime]);

  const handleReorderQuestion = (oldIndex: number, newNumberStr: string) => {
    let targetNumber = parseInt(newNumberStr, 10);
    if (isNaN(targetNumber) || targetNumber < 1) targetNumber = 1;
    if (targetNumber > questions.length) targetNumber = questions.length;
    const newIndex = targetNumber - 1;
    if (newIndex === oldIndex) return;
    setQuestions(prev => {
      const copy = [...prev];
      const [movedItem] = copy.splice(oldIndex, 1);
      copy.splice(newIndex, 0, movedItem);
      localStorage.setItem('smart_exam_cart', JSON.stringify(copy));
      return copy;
    });
  };

  const handleUpdateScore = (id: string | number, newScore: string) => {
    const scoreNum = parseFloat(newScore) || 0;
    setQuestions(prev => {
      const updated = prev.map(q => q.id === id ? { ...q, score: scoreNum } : q);
      localStorage.setItem('smart_exam_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemove = (id: string | number) => {
    setQuestions(prev => {
      const updated = prev.filter(q => q.id !== id);
      localStorage.setItem('smart_exam_cart', JSON.stringify(updated));
      if (updated.length === 0) router.push('/smartexam/bank');
      return updated;
    });
  };

  const handleSaveCompiledExam = async () => {
    if (!examHeader.title) return alert("กรุณาตั้งชื่อชุดข้อสอบด้วยครับ");

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

      const headerMetadata = {
        mode: headerMode,
        ...examHeader,
        settings: examSettings,
        totalQuestions,
        totalScore,
        branding: userPackage !== 'free' ? branding : null
      };

      const { data: newExam, error: examError } = await supabase.from('exams').insert([{
        creator_id: user.id,
        title: examHeader.title,
        subject_category: headerMode === 'school' ? examHeader.subjectName : 'ทั่วไป',
        education_level: examHeader.level,
        difficulty_level: 'จัดชุดผสม',
        topic: JSON.stringify(headerMetadata),
        status: 'draft',
      }]).select().single();

      if (examError) throw examError;

      // 🌟 อัปเดต Map เพื่อรักษาฟิลด์เฉลยและรูปภาพที่เพิ่งเพิ่มเข้าไป
      const formattedQuestions = questions.map((q, index) => ({
        exam_id: newExam.id,
        question_number: index + 1,
        display_label: `${index + 1}`, // รันเลขข้อใหม่ตามลำดับที่จัดเรียง
        part_name: q.part_name || '',
        question_type: q.question_type || 'mcq',
        question_text: q.question_text || '',
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        solution_image_url: q.solution_image_url, // 💡 สำคัญ: รักษาภาพเฉลยไว้
        score: Number(q.score) || 1,
        image_url: q.image_url,
        is_bank_item: false, // ข้อนี้กลายเป็นสำเนาสำหรับการสอบเฉพาะครั้งนี้
        education_level: examHeader.level,
        subject_category: examHeader.subjectName
      }));

      const { error: insertError } = await supabase.from('exam_questions').insert(formattedQuestions);
      if (insertError) throw insertError;

      localStorage.removeItem('smart_exam_cart');
      alert("จัดชุดและตั้งค่าการสอบเรียบร้อยแล้วครับ!");
      router.push('/smartexam');

    } catch (error: any) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateThai = (dateString: string) => {
    if (!dateString) return '.....';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleAddQuestionsFromBank = (newQuestions: any[]) => {
    setQuestions(prev => {
      const existingIds = prev.map(q => q.id);
      const uniqueNew = newQuestions.filter(q => !existingIds.includes(q.id));
      const updated = [...prev, ...uniqueNew];
      localStorage.setItem('smart_exam_cart', JSON.stringify(updated));
      return updated;
    });
  };

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white pb-32">
      <QuestionBankModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onAddQuestions={handleAddQuestionsFromBank}
        existingQuestionIds={questions.map(q => q.id)}
      />

      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/smartexam/bank')} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ListOrdered style={{ color: userPackage !== 'free' ? branding.primaryColor : '#f59e0b' }} />
              จัดชุดและตั้งค่าการสอบ
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* 🌟 เพิ่มปุ่มเปิดคู่มือ (Slide-Over Drawer) */}
            <button
              onClick={() => setIsManualOpen(true)}
              className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-full transition-colors mr-2"
              title="คู่มือการตั้งค่า"
            >
              <BookOpen size={20} />
            </button>

            {userPackage === 'free' ? (
              <>
                <div className="text-right hidden sm:block">
                  <h1 className="text-sm font-black text-white leading-none">NiiVaa SmartExam</h1>
                </div>
                <img src="/niivaalogo.png" alt="NIIVAA" className="h-7 object-contain" />
              </>
            ) : (
              <>
                <div className="text-right hidden sm:block">
                  <h1 className="text-sm font-black text-white leading-none">{headerMode === 'school' ? (examHeader.schoolName || 'ชื่อสถานศึกษา') : (examHeader.orgName || 'ชื่อหน่วยงาน')}</h1>
                  <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: branding.primaryColor }}>White-label Mode</p>
                </div>
                {branding.orgLogo ? (
                  <img src={branding.orgLogo} alt="Logo" className="h-8 w-8 rounded bg-white object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-gray-500"><ImageIcon size={14} /></div>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">

            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="font-bold flex items-center gap-2 text-white"><FileText size={18} /> ข้อมูลหัวกระดาษ</h2>
                <div className="flex bg-slate-950 rounded-lg p-1 border border-white/5">
                  <button onClick={() => setHeaderMode('school')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${headerMode === 'school' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}><School size={12} className="inline mr-1" /> สถานศึกษา</button>
                  <button onClick={() => setHeaderMode('other')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${headerMode === 'other' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Building2 size={12} className="inline mr-1" /> หน่วยงานอื่น</button>
                </div>
              </div>

              {headerMode === 'school' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">หัวข้อหลัก (ซ้าย)</label>
                      <input type="text" value={examHeader.title} onChange={e => setExamHeader({ ...examHeader, title: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">ชื่อโรงเรียน (ขวา)</label>
                      <input type="text" value={examHeader.schoolName} onChange={e => setExamHeader({ ...examHeader, schoolName: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">รายวิชา</label>
                      <input type="text" value={examHeader.subjectName} onChange={e => setExamHeader({ ...examHeader, subjectName: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">กลุ่มสาระการเรียนรู้</label>
                      <select value={examHeader.department} onChange={e => setExamHeader({ ...examHeader, department: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                        {departmentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">ระดับชั้น</label>
                      <input type="text" value={examHeader.level} onChange={e => setExamHeader({ ...examHeader, level: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">รหัสวิชา</label>
                      <input type="text" value={examHeader.subjectCode} onChange={e => setExamHeader({ ...examHeader, subjectCode: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">ครูประจำวิชา</label>
                    <input type="text" value={examHeader.teacherNames} onChange={e => setExamHeader({ ...examHeader, teacherNames: e.target.value })} placeholder="นาย... , นาง..." className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-400 mb-1 block">หัวข้อหลัก</label><input type="text" value={examHeader.title} onChange={e => setExamHeader({ ...examHeader, title: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" /></div>
                    <div><label className="text-xs text-gray-400 mb-1 block">ชื่อหน่วยงาน</label><input type="text" value={examHeader.orgName} onChange={e => setExamHeader({ ...examHeader, orgName: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" /></div>
                  </div>
                </>
              )}
              {/* 🌟 3. เพิ่มส่วนคำชี้แจง และ ปุ่มแนบภาพข้อมูลอ้างอิง วางต่อตรงนี้เลยครับ */}
              <div className="mt-4 border-t border-white/5 pt-5">
                <label className="text-xs text-gray-400 mb-1 block">คำชี้แจงแบบทดสอบ</label>
                <textarea 
                  value={examHeader.instructions} 
                  onChange={e => setExamHeader({ ...examHeader, instructions: e.target.value })} 
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 min-h-[80px] mb-4"
                />

                <div>
                  <label className="text-xs text-gray-400 mb-2 block">ภาพข้อมูลอ้างอิงส่วนกลาง (เช่น ตารางธาตุ, สูตรคำนวณ)</label>
                  {examHeader.referenceImage ? (
                    <div className="relative inline-block border border-white/10 rounded-lg overflow-hidden bg-slate-950">
                      <img src={examHeader.referenceImage} alt="Reference" className="h-32 object-contain" />
                      <button onClick={() => setExamHeader({ ...examHeader, referenceImage: '' })} className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded text-xs transition-colors shadow-md">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium rounded-lg border border-white/10 transition-colors">
                      {isUploadingRef ? <Loader2 size={16} className="animate-spin text-amber-500"/> : <ImageIcon size={16} className="text-amber-500"/>}
                      {isUploadingRef ? "กำลังอัปโหลด..." : "แนบภาพข้อมูลอ้างอิง"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadReference} disabled={isUploadingRef} />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
              <h2 className="font-bold flex items-center gap-2 text-amber-400 border-b border-white/5 pb-4"><Settings size={18} /> ตั้งค่าระบบการสอบออนไลน์</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Calendar size={12} /> วันที่เปิดสอบ</label>
                    <input type="date" value={examSettings.examDate} onChange={e => setExamSettings({ ...examSettings, examDate: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1"><Clock size={12} /> ช่วงเวลา (เริ่ม - สิ้นสุด)</label>
                    <div className="flex items-center gap-2">
                      <input type="time" value={examSettings.startTime} onChange={e => setExamSettings({ ...examSettings, startTime: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-amber-500 text-center" style={{ colorScheme: 'dark' }} />
                      <span className="text-gray-500">-</span>
                      <input type="time" value={examSettings.endTime} onChange={e => setExamSettings({ ...examSettings, endTime: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-2 py-2 text-sm text-white focus:outline-none focus:border-amber-500 text-center" style={{ colorScheme: 'dark' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="text-sm font-bold text-white mb-2 block">รูปแบบการควบคุมเวลา</label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${examSettings.timingMode === 'flexible' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="timingMode" checked={examSettings.timingMode === 'flexible'} onChange={() => setExamSettings({ ...examSettings, timingMode: 'flexible' })} className="mt-1 accent-amber-500" />
                    <div>
                      <div className="font-bold text-sm text-white">แบบยืดหยุ่น (Flexible Window)</div>
                      <div className="text-xs text-gray-400 mt-0.5">เข้าสอบช่วงไหนก็ได้ระหว่าง {examSettings.startTime}-{examSettings.endTime} น. ระบบจะจับเวลาคนละ <strong className="text-amber-400">{examSettings.duration} นาที</strong></div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${examSettings.timingMode === 'fixed' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="timingMode" checked={examSettings.timingMode === 'fixed'} onChange={() => setExamSettings({ ...examSettings, timingMode: 'fixed' })} className="mt-1 accent-amber-500" />
                    <div className="w-full">
                      <div className="font-bold text-sm text-white">แบบตรึงเวลา (Fixed Synchronous)</div>
                      <div className="text-xs text-gray-400 mt-0.5">บังคับทุกคนเข้าสอบพร้อมกันเวลา {examSettings.startTime} น. และบังคับส่งพร้อมกัน</div>

                      {examSettings.timingMode === 'fixed' && (
                        <div className="mt-3 flex items-center gap-2 bg-black/50 p-2 rounded-lg">
                          <AlertCircle size={14} className="text-red-400" />
                          <span className="text-xs text-gray-300">อนุโลมให้เข้าสายได้ไม่เกิน</span>
                          <input type="number" min="0" max="60" value={examSettings.lateTolerance} onChange={e => setExamSettings({ ...examSettings, lateTolerance: parseInt(e.target.value) || 0 })} className="w-12 bg-slate-900 border border-white/20 rounded p-1 text-center text-xs text-white" />
                          <span className="text-xs text-gray-300">นาที</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-2 block flex items-center gap-1"><Eye size={12} /> การประกาศผลคะแนนให้นักเรียนทราบ</label>
                  <select value={examSettings.scoreVisibility} onChange={e => setExamSettings({ ...examSettings, scoreVisibility: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500">
                    <option value="immediate">⚡ แจ้งคะแนนทันทีเมื่อนักเรียนกดส่งข้อสอบ</option>
                    <option value="delayed">⏱️ แจ้งคะแนนเมื่อหมดเวลาสอบของทุกคน (หลัง {examSettings.endTime} น.)</option>
                    <option value="manual">🔒 ซ่อนคะแนน (รอครูประกาศผลผ่านระบบภายหลัง)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400">Live Preview (มุมมองหน้ากระดาษ)</h3>
            <div
              className="bg-white rounded-xl p-8 text-black shadow-2xl relative overflow-hidden font-sans"
              style={{ borderTop: `8px solid ${userPackage !== 'free' ? branding.primaryColor : '#f59e0b'}` }}
            >
              <div className="text-center font-bold text-[15px] mb-4">
                {headerMode === 'school' ? (examHeader.schoolName || 'โรงเรียน........................................') : (examHeader.orgName || 'หน่วยงาน........................................')}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] leading-relaxed mb-6">
                {headerMode === 'school' ? (
                  <>
                    <div className="font-bold text-[14px]">{examHeader.title || '........................................'}</div>
                    <div>{examHeader.department || '.................................................'}</div>
                    <div>รายวิชา {examHeader.subjectName || '..............................'}</div>
                    <div>รหัสวิชา {examHeader.subjectCode || '.........................'}</div>
                    <div>ระดับชั้น{examHeader.level || '..............................'}</div>
                    <div>จำนวน {totalQuestions} ข้อ คะแนนเต็ม {totalScore} คะแนน</div>
                    <div>สอบวันที่ {formatDateThai(examSettings.examDate)}</div>
                    <div>เวลา {examSettings.startTime}-{examSettings.endTime} น. ( {examSettings.duration} นาที )</div>
                    <div className="col-span-2">ครูประจำวิชา {examHeader.teacherNames || '........................................'}</div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-[14px]">{examHeader.title || '........................................'}</div>
                    <div>จำนวน {totalQuestions} ข้อ คะแนนเต็ม {totalScore} คะแนน</div>
                    <div>สอบวันที่ {formatDateThai(examSettings.examDate)}</div>
                    <div>เวลา {examSettings.startTime}-{examSettings.endTime} น. ( {examSettings.duration} นาที )</div>
                  </>
                )}
              </div>

              <div className="text-sm p-4 rounded-lg" style={{ backgroundColor: userPackage !== 'free' ? branding.secondaryColor : '#fef3c7' }}>
                <span className="font-bold block mb-1" style={{ color: userPackage !== 'free' ? branding.primaryColor : '#d97706' }}>คำชี้แจง:</span>
                <p className="whitespace-pre-wrap">{examHeader.instructions || '..............................'}</p>
              {/* 🌟 แสดงภาพอ้างอิงใน Live Preview */}
                {examHeader.referenceImage && (
                  <div className="mt-4 pt-4 border-t border-black/10">
                     <span className="text-xs font-bold text-gray-600 flex items-center gap-1 mb-2"><ImageIcon size={14}/> ภาพข้อมูลอ้างอิง:</span>
                     <img src={examHeader.referenceImage} className="max-w-full rounded-lg border border-black/10 shadow-sm" alt="Reference"/>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-white/10">
              <div className="flex justify-between items-center text-white font-bold mb-2">
                <span>จัดการข้อสอบ ({totalQuestions} ข้อ)</span>
                <div className="flex items-center gap-4">
                  <span className="text-amber-400">{totalScore} คะแนน</span>
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus size={14} /> ดึงจากคลัง
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {questions.map((q, idx) => (
                  <div key={q.id} className="bg-slate-900 border border-white/5 rounded-xl p-3 flex gap-3 items-center group hover:border-white/20 transition-all">
                    <input
                      type="number" min="1" max={questions.length} defaultValue={idx + 1}
                      onBlur={(e) => handleReorderQuestion(idx, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleReorderQuestion(idx, e.currentTarget.value) }}
                      className="w-10 h-8 text-center bg-slate-950 border border-white/20 rounded-lg text-xs font-bold text-gray-300 focus:outline-none focus:border-amber-500 shrink-0"
                    />

                    {/* 🌟 แสดงไอคอนรูปภาพ ถ้าเป็นข้อสอบแบบรูปภาพ */}
                    {q.image_url && <ImageIcon size={16} className="text-blue-400 shrink-0" />}

                    <div className="flex-1 w-full"><p className="text-sm font-medium text-white mb-2 line-clamp-2">
                      <span className="text-amber-400 font-black mr-2">ข้อ {q.display_label || q.question_number}</span>
                      {(q.question_text && !q.question_text.includes('อิงจากภาพข้อสอบ'))
                        ? q.question_text
                        : <span className="text-gray-500 italic">อิงจากภาพข้อสอบต้นฉบับ</span>}
                    </p></div>
                    <div className="flex items-center gap-1 shrink-0 bg-black/50 px-2 py-1 rounded-md border border-white/5">
                      <span className="text-[9px] text-gray-500">คะแนน:</span>
                      <input
                        type="number" min="0" step="0.5" value={q.score}
                        onChange={(e) => handleUpdateScore(q.id, e.target.value)}
                        className="w-10 bg-transparent text-amber-400 font-bold text-center text-xs focus:outline-none"
                      />
                    </div>
                    <button onClick={() => handleRemove(q.id)} className="text-gray-600 hover:text-red-400 p-1.5 rounded-md hover:bg-red-500/10 shrink-0"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-md border-t border-white/10 p-4 z-50">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            onClick={() => router.push('/smartexam/bank')}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
          >
            ยกเลิก / กลับไปตะกร้าข้อสอบ
          </button>
          <button
            onClick={handleSaveCompiledExam} disabled={isSaving || questions.length === 0}
            className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-black rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <><Loader2 className="animate-spin" size={18} /> กำลังบันทึก...</> : <><Save size={18} /> บันทึกการตั้งค่าและจัดชุดข้อสอบ</>}
          </button>
        </div>
      </div>

      {/* 🌟 Slide-Over Drawer: คู่มือการใช้งาน (Manual) */}
      {isManualOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsManualOpen(false)}></div>
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-[#0f172a] border-l border-white/10 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950">
          <h2 className="text-base font-black text-white flex items-center gap-2"><BookOpen className="text-amber-500" size={18} /> คู่มือจัดชุดการสอบ</h2>
          <button onClick={() => setIsManualOpen(false)} className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {/* Accordion Item 1 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step1')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-amber-400 flex items-center gap-2"><FileText size={14} /> 1. ข้อมูลหัวกระดาษ</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step1' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step1' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• ใช้สำหรับกรอกข้อมูลที่จะไปปรากฏใน <strong>Live Preview</strong> ทางฝั่งขวา</p>
                <p>• สามารถเลือกสลับโหมดระหว่าง <strong>สถานศึกษา</strong> และ <strong>หน่วยงานอื่น</strong> ได้ เพื่อให้ฟอร์มปรับเปลี่ยนตามความเหมาะสม</p>
              </div>
            </div>
          </div>

          {/* Accordion Item 2 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step2')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-blue-400 flex items-center gap-2"><Clock size={14} /> 2. ตั้งค่าระบบควบคุมเวลา</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step2' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step2' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• <strong>แบบยืดหยุ่น:</strong> นักเรียนเข้าสอบเวลาไหนก็ได้ภายในกรอบเวลาที่กำหนด ระบบจะเริ่มนับถอยหลังแยกแต่ละคน</p>
                <p>• <strong>แบบตรึงเวลา:</strong> บังคับทุกคนเข้าพร้อมกัน หากเข้าสายเวลาทำข้อสอบจะถูกหักลบออกตามจริง</p>
              </div>
            </div>
          </div>

          {/* Accordion Item 3 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step3')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-2"><ListOrdered size={14} /> 3. การจัดการข้อสอบ (ผสม)</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step3' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step3' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• ข้อสอบที่นำมาจัดชุด สามารถดึงเพิ่มจากคลังส่วนกลางได้ผ่านปุ่ม <strong>+ ดึงจากคลัง</strong></p>
                <p>• ข้อสอบที่ถูกสร้างมาจากภาพ/PDF จะมีไอคอนรูปภาพกำกับไว้ ระบบจะนำภาพโจทย์ไปแสดงผลในหน้าสอบจริงของนักเรียนโดยอัตโนมัติ</p>
                <p>• สามารถจัดเรียงลำดับใหม่โดยการพิมพ์เลขด้านหน้า และแก้ไขคะแนนรายข้อได้ทันที</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-white/10 bg-slate-950 flex justify-center items-center gap-2">
          <img src="/niivaasmartevent_logo.png" className="h-3 opacity-50" />
          <p className="text-[9px] text-gray-500 font-bold">SmartExam Setup</p>
        </div>
      </div>
    </div>
  );
}