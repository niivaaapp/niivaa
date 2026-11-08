"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, LayoutDashboard,
  Search, Plus, BookOpen, Calculator, FlaskConical,
  Globe, MoreVertical, Link as LinkIcon, BarChart3,
  GraduationCap, FileText, CheckCircle2, Printer, Loader2,
  Copy, Check, UploadCloud, ImageIcon, X, ChevronDown,
  Eye, Share2, MessageCircle, QrCode, Filter, Trash2
} from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  topic: string; // 👈 เพิ่มฟิลด์นี้
  subject: string;
  level: string;
  questionsCount: number;
  score: number;
  status: string;
  date: string;
  format?: string;
  is_public?: boolean;
}

const getSubjectIcon = (subjectName: string) => {
  if (subjectName.includes('วิทย์') || subjectName.includes('ฟิสิกส์') || subjectName.includes('เคมี') || subjectName.includes('ชีว')) return <FlaskConical size={14} />;
  if (subjectName.includes('คณิต')) return <Calculator size={14} />;
  if (subjectName.includes('อังกฤษ') || subjectName.includes('ภาษาจีน') || subjectName.includes('ภาษาญี่ปุ่น')) return <Globe size={14} />;
  return <BookOpen size={14} />;
};

export default function SmartExamDashboard() {
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 States สำหรับ Filters แบบสมบูรณ์
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 🌟 States สำหรับ Share Modal
  const [shareExam, setShareExam] = useState<Exam | null>(null);
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);

  // States สำหรับ Slide-Over Drawer คู่มือ
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('step1');

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      let query = supabase
        .from('exams')
        .select(`id, title, topic, subject_category, education_level, total_score, status, created_at, exam_format, is_public, exam_questions (count)`)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const formattedExams: Exam[] = data.map((ex: any) => {
          // 🌟 1. ดักจับและแงะข้อมูล Topic (ป้องกัน Error จากข้อมูลชุดเก่าที่เป็น JSON)
          let topicName = ex.topic;
          if (ex.topic && typeof ex.topic === 'string' && ex.topic.startsWith('{')) {
            try {
              const meta = JSON.parse(ex.topic);
              topicName = meta.topic_name || ''; // ถ้าเป็น JSON ให้พยายามหา key topic_name
            } catch (e) {
              topicName = '';
            }
          }

          // 🌟 2. แมปข้อมูลส่งกลับไปให้ State
          return {
            id: ex.id,
            title: ex.title,
            topic: topicName || '', // 👈 คืนค่า Topic ที่เป็นข้อความธรรมดา
            subject: ex.subject_category || 'ทั่วไป',
            level: ex.education_level || 'ทั่วไป',
            questionsCount: ex.exam_questions?.[0]?.count || 0,
            score: ex.total_score || 0,
            status: ex.status || 'draft',
            format: ex.exam_format || 'standard',
            is_public: ex.is_public || false,
            date: new Date(ex.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
          };
        });

        setExams(formattedExams);
      }
    } catch (error: any) {
      console.error("Error fetching exams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (examId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    setExams(prev => prev.map(ex => ex.id === examId ? { ...ex, status: newStatus } : ex));
    try {
      const { error } = await supabase.from('exams').update({ status: newStatus }).eq('id', examId);
      if (error) throw error;
    } catch (error: any) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ: " + error.message);
      setExams(prev => prev.map(ex => ex.id === examId ? { ...ex, status: currentStatus } : ex));
    }
  };

  const handleTogglePublic = async (examId: string, currentPublicState: boolean) => {
    setIsUpdatingPublic(true);
    try {
      const { error } = await supabase.from('exams').update({ is_public: !currentPublicState }).eq('id', examId);
      if (error) throw error;

      // อัปเดต UI ทันที
      setExams(prev => prev.map(ex => ex.id === examId ? { ...ex, is_public: !currentPublicState } : ex));
      setShareExam(prev => prev ? { ...prev, is_public: !currentPublicState } : null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsUpdatingPublic(false);
    }
  };

  // 🌟 ฟังก์ชันลบชุดข้อสอบ
  const handleDeleteExam = async (e: React.MouseEvent, examId: string, examTitle: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบ "${examTitle}" ?\n(ข้อสอบทั้งหมดที่อยู่ในชุดนี้จะถูกลบทิ้งอย่างถาวร)`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);

      if (error) throw error;

      // อัปเดต State หน้าจอให้รายการหายไปทันทีโดยไม่ต้องโหลดหน้าใหม่
      setExams(prev => prev.filter(exam => exam.id !== examId));

    } catch (error: any) {
      console.error("Error deleting exam:", error.message);
      alert("ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  };

  // 🌟 1. กำหนดรายการมาตรฐานสำหรับ "ระดับชั้น" และ "กลุ่มวิชา"
  const PREDEFINED_LEVELS = [
    'ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6',
    'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6',
    'ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2',
    'สอบเข้า ม.1', 'สอบเข้า ม.4', 'สอบเข้าสถาบัน',
    'แนวข้อสอบ ก.พ.', 'แนวข้อสอบ ครูผู้ช่วย', 'แนวข้อสอบ พนักงานท้องถิ่น', 'แนวข้อสอบตำรวจ', 'แนวข้อสอบทหาร'
  ];

  const PREDEFINED_SUBJECTS = [
    'ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 'สังคมศึกษา',
    'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 'ศิลปศึกษา', 'การงานอาชีพ',
    'ฟิสิกส์', 'เคมี', 'ชีววิทยา'
  ];

  // 🌟 2. รวมรายการมาตรฐาน เข้ากับ รายการที่มีคนพิมพ์เพิ่มเข้ามา (ลบตัวซ้ำออกอัตโนมัติ)
  const uniqueSubjects = useMemo(() => {
    const dynamicSubjects = exams.map(e => e.subject).filter(Boolean);
    const combinedSubjects = new Set([...PREDEFINED_SUBJECTS, ...dynamicSubjects]);
    return ['all', ...Array.from(combinedSubjects)];
  }, [exams]);

  const uniqueLevels = useMemo(() => {
    const dynamicLevels = exams.map(e => e.level).filter(Boolean);
    const combinedLevels = new Set([...PREDEFINED_LEVELS, ...dynamicLevels]);
    return ['all', ...Array.from(combinedLevels)];
  }, [exams]);

  // 🌟 Logic การกรองข้อมูลที่อัปเดตใหม่
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchText = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSubject = selectedSubject === 'all' || exam.subject === selectedSubject;
      const matchLevel = selectedLevel === 'all' || exam.level === selectedLevel;
      const matchStatus = selectedStatus === 'all' || exam.status === selectedStatus;
      return matchText && matchSubject && matchLevel && matchStatus;
    });
  }, [exams, searchQuery, selectedSubject, selectedLevel, selectedStatus]);

  const handleCopyLink = (examId: string) => {
    const url = `${window.location.origin}/smartexam/${examId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(examId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white select-none pb-24 font-sans overflow-x-hidden">

      {/* 🟢 HEADER (Sticky Top) */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 shadow-xl shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-3">
            <button onClick={() => router.back()} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors hidden sm:block" title="ย้อนกลับ">
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => router.push('/smart-exam-dashboard')}
              className="p-1.5 sm:p-2 hover:bg-amber-500/10 rounded-full text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2"
              title="กลับหน้าศูนย์กลาง"
            >
              <LayoutDashboard size={18} />
              <span className="text-xs sm:text-sm font-bold hidden sm:inline">หน้าหลัก</span>
            </button>
            <div className="h-5 w-[1px] bg-white/10 ml-1 mr-2 hidden sm:block"></div>

            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa SmartExam" className="h-4 sm:h-6 object-contain" />
              SmartExam
            </h1>
            <span className="hidden lg:inline-block px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-widest rounded flex items-center border border-amber-500/30">
              Workspace
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsManualOpen(true)}
              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-full transition-colors hidden sm:block mr-1"
              title="คู่มือการใช้งาน"
            >
              <BookOpen size={18} />
            </button>

            <button
              onClick={() => router.push('/smartexam/image2exam')}
              className="hidden lg:flex px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg items-center gap-1 transition-all text-xs shadow-md active:scale-95"
            >
              <ImageIcon size={14} /> สร้างจากรูปภาพ
            </button>
            <button
              onClick={() => router.push('/smartexam/import')}
              className="hidden sm:flex px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg items-center gap-1 transition-all text-xs shadow-md active:scale-95"
            >
              <FileText size={14} /> สร้างจาก PDF
            </button>
            <button
              onClick={() => router.push('/smartexam/create')}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black font-black rounded-lg flex items-center gap-1 transition-all text-xs shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Plus size={14} strokeWidth={3} /> สร้างด้วย AI
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-5 space-y-5">

        {/* 🟢 โซนสรุปภาพรวม */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg sm:text-xl font-black flex items-center gap-2 text-white mb-0">
            คลังข้อสอบของคุณ
            {isLoading && <Loader2 size={16} className="animate-spin text-amber-500" />}
          </h2>

          <div className="flex gap-3">
            <div className="bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 shadow-sm backdrop-blur-sm min-w-[120px] flex flex-col justify-center">
              <div className="text-gray-400 text-[11px] font-medium text-right">ข้อสอบทั้งหมด</div>
              <div className="text-2xl font-black text-white text-right leading-none mt-1">{exams.length}</div>
            </div>
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-4 py-2 shadow-sm backdrop-blur-sm min-w-[120px] flex flex-col justify-center">
              <div className="text-emerald-400 text-[11px] font-medium text-right">เผยแพร่แล้ว</div>
              <div className="text-2xl font-black text-emerald-400 text-right leading-none mt-1">
                {exams.filter(e => e.status === 'published').length}
              </div>
            </div>
          </div>
        </div>

        {/* 🌟 โซนตัวกรอง (ปรับปรุงใหม่ให้เป็น Grid Dropdown เป็นระเบียบ) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-md backdrop-blur-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* ค้นหา */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text" placeholder="ค้นหาชื่อแบบทดสอบ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
              />
            </div>

            {/* หมวดหมู่วิชา */}
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer shadow-inner"
              >
                {uniqueSubjects.map(subj => (
                  <option key={subj} value={subj} className="bg-slate-900">{subj === 'all' ? 'ทุกกลุ่มวิชา' : subj}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>

            {/* ระดับชั้น */}
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer shadow-inner"
              >
                {uniqueLevels.map(lvl => (
                  <option key={lvl} value={lvl} className="bg-slate-900">{lvl === 'all' ? 'ทุกระดับชั้น' : lvl}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>

            {/* สถานะ */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer shadow-inner"
              >
                <option value="all" className="bg-slate-900">ทุกสถานะ</option>
                <option value="published" className="bg-slate-900">เผยแพร่แล้ว</option>
                <option value="draft" className="bg-slate-900">แบบร่าง (ปิด)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {/* 🟢 โซนรายการตารางข้อสอบ (Table Header ทำเป็น Sticky) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur-sm relative flex flex-col h-[60vh] sm:h-[65vh]">
          <div className="overflow-auto custom-scrollbar flex-1 relative rounded-2xl">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-16 text-slate-400 h-full">
                <Loader2 className="animate-spin mb-4 text-amber-500" size={40} />
                กำลังโหลดคลังข้อสอบของคุณ...
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-md shadow-md">
                  <tr className="border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="p-4 font-medium">ชื่อแบบทดสอบ</th>
                    <th className="p-4 font-medium hidden md:table-cell">กลุ่มวิชา</th>
                    <th className="p-4 font-medium hidden sm:table-cell">ระดับชั้น</th>
                    <th className="p-4 font-medium text-center">ข้อมูล</th>
                    <th className="p-4 font-medium text-center">สถานะ</th>
                    <th className="p-4 font-medium text-right rounded-tr-2xl">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredExams.length > 0 ? (
                    filteredExams.map((exam) => (
                      <tr key={exam.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 flex flex-col items-start gap-1">
                          <div className="flex justify-between w-full items-start">
                            <div className="flex flex-col items-start gap-1.5">

                              {/* 🌟 1. แสดง Tag สถานะแหล่งที่มา */}
                              <div className="flex gap-2">
                                {exam.format === 'pdf' ? (
                                  <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">PDF</span>
                                ) : exam.format === 'image' || exam.format === 'multi_image' ? (
                                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">รูปภาพ</span>
                                ) : (
                                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">AI</span>
                                )}

                                {/* 🌟 2. แสดงตัวชี้วัด (ถ้ามี) แบบ Badge เล็กๆ */}
                                {exam.topic && exam.topic.trim() !== '' && !exam.topic.startsWith('{') && (
                                  <span className="bg-white/10 text-gray-300 border border-white/20 px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap line-clamp-1 max-w-[150px]">
                                    📍 {exam.topic}
                                  </span>
                                )}
                              </div>

                              {/* 3. แสดงชื่อข้อสอบ */}
                              <div className="font-bold text-white text-sm md:text-base group-hover:text-amber-400 transition-colors line-clamp-2 pr-4">
                                {exam.title}
                              </div>
                            </div>

                            {/* ปุ่มลบ */}
                            <button
                              onClick={(e) => handleDeleteExam(e, exam.id, exam.title)}
                              className="w-7 h-7 rounded-full bg-slate-800/50 hover:bg-red-500/20 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-500/30 shrink-0 ml-2"
                              title="ลบชุดข้อสอบนี้"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="text-[10px] font-mono text-slate-500 mt-1">อัปเดต: {exam.date}</div>
                        </td>
                        <td className="p-4 hidden md:table-cell">
                          <span className="bg-slate-800 text-cyan-300 border border-cyan-500/20 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap">
                            {exam.subject}
                          </span>
                        </td>
                        <td className="p-4 hidden sm:table-cell">
                          <span className="bg-slate-800 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap">
                            {exam.level}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="text-sm font-bold text-white whitespace-nowrap">{exam.questionsCount} ข้อ</div>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">{exam.score} คะแนน</div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(exam.id, exam.status)}
                            className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-md whitespace-nowrap transition-all hover:scale-105 active:scale-95 shadow-sm ${exam.status === 'published'
                                ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-emerald-500/10 hover:bg-emerald-500 hover:text-black'
                                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 hover:text-black'
                              }`}
                            title={exam.status === 'published' ? 'คลิกเพื่อซ่อนข้อสอบ' : 'คลิกเพื่อเผยแพร่ข้อสอบ'}
                          >
                            {exam.status === 'published' ? <><CheckCircle2 size={14} /> เผยแพร่แล้ว</> : <><FileText size={14} /> แบบร่าง (ปิด)</>}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* 🌟 ปุ่มทดลองสอบ (เปิดในหน้าต่างใหม่ พร้อมส่ง Parameter ว่าเป็น Preview) */}
                            <button
                              onClick={() => window.open(`/smartexam/${exam.id}?preview=true`, '_blank')}
                              className="p-1.5 bg-slate-800 text-amber-400 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/30 rounded-md transition-colors"
                              title="ทดลองทำข้อสอบ (Preview)"
                            >
                              <Eye size={14} />
                            </button>

                            {exam.status === 'published' && (
                              <>
                                {/* 🌟 ปุ่มแชร์แบบใหม่ เปิด Modal */}
                                <button
                                  onClick={() => setShareExam(exam)}
                                  className="p-1.5 bg-slate-800 text-blue-400 hover:bg-blue-500/20 border border-slate-700 hover:border-blue-500/30 rounded-md transition-colors"
                                  title="แชร์และคัดลอกลิงก์"
                                >
                                  <Share2 size={14} />
                                </button>
                                <button
                                  onClick={() => router.push(`/smartexam/results/${exam.id}`)}
                                  className="p-1.5 bg-slate-800 text-purple-400 hover:bg-purple-500/20 border border-slate-700 hover:border-purple-500/30 rounded-md transition-colors"
                                  title="ดูผลสอบและวิเคราะห์สถิติ"
                                >
                                  <BarChart3 size={14} />
                                </button>
                                {exam.format === 'standard' && (
                                  <button
                                    onClick={() => router.push(`/smartexam/print/${exam.id}`)}
                                    className="hidden lg:flex bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 text-white px-2 py-1.5 rounded-md text-[11px] font-bold items-center justify-center gap-1.5 transition-colors"
                                    title="พิมพ์กระดาษข้อสอบ (PDF)"
                                  >
                                    <Printer size={12} className="text-slate-300" /> พิมพ์
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => router.push(`/smartexam/edit/${exam.id}`)}
                              className="p-1.5 bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
                              title="แก้ไขชุดข้อสอบ"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-500 h-64 align-middle">
                        <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-base font-bold text-slate-400 mb-1">ไม่พบแบบทดสอบ</p>
                        <p className="text-xs">ลองเปลี่ยนเงื่อนไขการค้นหา หรือคลิกปุ่มสร้างด้านบนดูนะครับ</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>

      {/* 🌟 Modal: แชร์ข้อสอบ (Share Center) */}
      {shareExam && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/50">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Share2 className="text-blue-400" size={18} /> แชร์ข้อสอบให้นักเรียน
              </h3>
              <button onClick={() => setShareExam(null)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <p className="text-sm font-bold text-white mb-1 line-clamp-1">{shareExam.title}</p>
                <p className="text-[11px] text-gray-400">เมื่อนักเรียนเปิดลิงก์นี้ จะสามารถเข้าทำข้อสอบได้ทันที</p>
              </div>

              {/* URL Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">ลิงก์เข้าสอบ (URL)</label>
                <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-xl p-1.5">
                  <div className="flex-1 px-3 text-sm text-gray-300 truncate font-mono">
                    {`${window.location.origin}/smartexam/${shareExam.id}`}
                  </div>
                  <button
                    onClick={() => handleCopyLink(shareExam.id)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${copiedId === shareExam.id ? 'bg-emerald-500 text-black' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                  >
                    {copiedId === shareExam.id ? <><Check size={14} /> คัดลอกแล้ว</> : <><Copy size={14} /> คัดลอก</>}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {/* รหัสเข้าห้องสอบ สำหรับให้นักเรียนกรอกในหน้าเว็บ */}
                <div className="bg-slate-950 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                  <div className="text-[10px] text-gray-500 mb-1">รหัสเข้าห้องสอบ (PIN)</div>
                  <div className="text-lg font-black text-amber-400 tracking-widest font-mono">
                    {shareExam.id.substring(0, 6).toUpperCase()}
                  </div>
                </div>

                {/* ปุ่มแชร์ไป LINE */}
                <button
                  onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(`📝 แบบทดสอบ: ${shareExam.title}\nคลิกเพื่อเข้าสอบ: ${window.location.origin}/smartexam/${shareExam.id}`)}`, '_blank')}
                  className="bg-[#00B900]/10 hover:bg-[#00B900]/20 border border-[#00B900]/30 rounded-xl p-3 flex flex-col items-center justify-center text-center transition-colors group"
                >
                  <MessageCircle className="text-[#00B900] mb-1 group-hover:scale-110 transition-transform" size={20} />
                  <div className="text-xs font-bold text-[#00B900]">แชร์ผ่าน LINE</div>
                </button>
              </div>
            </div>
          </div>
          {/* 🌟 เพิ่มส่วนตั้งค่าแชร์สาธารณะ */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <label className="flex items-start justify-between cursor-pointer group bg-slate-950 p-4 rounded-xl border border-white/5 hover:border-amber-500/30 transition-colors">
              <div className="flex-1 pr-4">
                <div className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <Globe size={16} className={shareExam.is_public ? "text-amber-400" : "text-gray-500"} />
                  เผยแพร่สู่คลังข้อสอบสาธารณะ (Explore)
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  อนุญาตให้ผู้ใช้ท่านอื่นในแพลตฟอร์ม สามารถค้นพบและเข้ามาฝึกทำข้อสอบชุดนี้ของคุณได้ (คะแนนจะถูกแยกส่วน ไม่ปะปนกับนักเรียนของคุณ)
                </p>
              </div>
              <div className="relative flex items-center justify-center mt-1 shrink-0">
                <input
                  type="checkbox"
                  checked={shareExam.is_public}
                  onChange={() => handleTogglePublic(shareExam.id, shareExam.is_public || false)}
                  disabled={isUpdatingPublic}
                  className="peer appearance-none w-10 h-5 bg-slate-800 rounded-full checked:bg-amber-500 transition-colors cursor-pointer disabled:opacity-50"
                />
                <div className="absolute left-1 top-1 w-3 h-3 bg-gray-400 rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-transform pointer-events-none"></div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer: คู่มือการใช้งาน (Modern Accordion) */}
      {isManualOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsManualOpen(false)}></div>
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-[#0f172a] border-l border-white/10 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950">
          <h2 className="text-base font-black text-white flex items-center gap-2"><BookOpen className="text-amber-500" size={18} /> คู่มือการใช้งาน</h2>
          <button onClick={() => setIsManualOpen(false)} className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {/* Accordion Item 1 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step1')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-blue-400 flex items-center gap-2">1. การสร้างชุดข้อสอบ</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step1' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step1' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• <strong>สร้างจากภาพ/PDF:</strong> อัปโหลดเอกสารข้อสอบเดิม จากนั้นใช้เครื่องมือ "ประทับตรา" วางเลขข้อลงบนภาพเพื่อสร้าง OMR เสมือน</p>
                <p>• <strong>สร้างจาก AI:</strong> ป้อนหัวข้อหรือเนื้อหา เพื่อให้ AI ออกแบบคำถามและตัวเลือกให้โดยอัตโนมัติ</p>
              </div>
            </div>
          </div>

          {/* Accordion Item 2 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step2')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-amber-400 flex items-center gap-2">2. การตั้งค่าและเฉลย</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step2' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step2' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• เลือกรูปแบบข้อสอบระหว่าง <strong>ปรนัย (ตัวเลือก)</strong> และ <strong>อัตนัย (เติมคำ)</strong> ในหน้าจอ Edit</p>
                <p>• สามารถใช้ปุ่ม "ใช้กับปรนัยทุกข้อ" เพื่อเปลี่ยนรูปแบบตัวเลือก (เช่น A,B,C,D หรือ 1-5) ทีเดียวทั้งฉบับ</p>
              </div>
            </div>
          </div>

          {/* Accordion Item 3 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step3')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-emerald-400 flex items-center gap-2">3. การเปิดสอบและส่งลิงก์</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step3' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step3' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• คลิกปุ่มในคอลัมน์ <strong>"สถานะ"</strong> จากตารางหน้าแรก เพื่อเปิด-ปิดการสอบได้ทันที</p>
                <p>• เมื่อเปิดสอบแล้ว ให้กดปุ่มแชร์ข้อสอบ เพื่อรับลิงก์ รหัสสอบ หรือส่งเข้า LINE ให้นักเรียนได้เลย</p>
              </div>
            </div>
          </div>

          {/* Accordion Item 4 */}
          <div className="bg-slate-900 border border-white/5 rounded-lg overflow-hidden">
            <button onClick={() => toggleAccordion('step4')} className="w-full p-3 flex justify-between items-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
              <span className="font-bold text-xs text-cyan-400 flex items-center gap-2">4. การดูรายงานและ ปพ.5</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${activeAccordion === 'step4' ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 overflow-hidden ${activeAccordion === 'step4' ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-3 text-[11px] text-gray-300 space-y-2 bg-slate-900/50 leading-relaxed">
                <p>• เข้าไปที่เมนู <strong>"ดูผลสอบ" (รูปกราฟ)</strong> เพื่อดูคะแนนนักเรียน, ดาวน์โหลด Excel, และดูกราฟโค้งระฆังคว่ำ</p>
                <p>• ในระบบสมุดคะแนน ปพ.5 จะมีปุ่ม "ดึงคะแนนสอบ" เพื่อแปลงคะแนนดิบเป็นสัดส่วนคะแนนลงช่องที่กำหนดให้อัตโนมัติ</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-3 border-t border-white/10 bg-slate-950 flex justify-center items-center gap-2">
          <img src="/niivaasmartevent_logo.png" className="h-3 opacity-50" />
          <p className="text-[9px] text-gray-500 font-bold">SmartExam Dashboard</p>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}