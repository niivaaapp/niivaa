"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft, Printer, CheckSquare, Loader2, Download, FileText
} from 'lucide-react';

export default function PrintExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [examConfig, setExamConfig] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // State ควบคุมการแสดงผลเฉลยบนกระดาษ
  const [showAnswers, setShowAnswers] = useState(false);
  // เลื่อนหาบรรทัดที่มีการประกาศ State แล้วเพิ่มโค้ดนี้เข้าไป
  const [showNameField, setShowNameField] = useState(true); // 👈 ค่าเริ่มต้นคือ true (แสดงช่อง)
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
        if (examError || !exam) throw new Error("ไม่พบข้อสอบชุดนี้");

        const { data: qData, error: qError } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('question_number', { ascending: true });
        if (qError) throw qError;

        // แกะ Metadata หัวกระดาษที่ซ่อนไว้ใน topic
        let metadata = null;
        try { metadata = JSON.parse(exam.topic); } catch (e) { }

        setExamConfig({ ...exam, metadata });
        setQuestions(qData || []);
      } catch (error: any) {
        alert(error.message);
        router.push('/smartexam');
      } finally {
        setIsLoading(false);
      }
    };
    if (examId) fetchExam();
  }, [examId, router]);

  const handlePrint = () => {
    window.print();
  };

  const formatDateThai = (dateString?: string) => {
    if (!dateString) return '.....';
    return new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="w-10 h-10 text-amber-500 animate-spin" /></div>;
  }

  const metadata = examConfig?.metadata;
  const isSchoolMode = metadata?.mode === 'school' || !metadata?.mode;
  const totalQuestions = questions.length;
  const totalScore = metadata?.totalScore || questions.reduce((sum, q) => sum + (Number(q.score) || 1), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-900 font-sans print:bg-white">

      {/* 🟢 TOOLBAR (จะถูกซ่อนเวลากดพิมพ์) */}
      <div className="sticky top-0 z-50 bg-slate-950 border-b border-white/10 p-4 print:hidden shadow-xl">
        <div className="max-w-[794px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={18} /> กลับ
          </button>
          {/* 🌟 ปุ่ม Toggle แสดง/ซ่อนช่องชื่อ-สกุล */}
          <div
            className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition-colors"
            onClick={() => setShowNameField(!showNameField)}
          >
            <div className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors ${showNameField ? 'bg-blue-500' : 'bg-white/20'}`}>
              {/* ไอคอนติ๊กถูก (จะแสดงเมื่อค่าเป็น true) */}
              {showNameField && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
            <span className="text-sm font-bold text-gray-200 select-none">
              แสดงช่อง ชื่อ-เลขที่
            </span>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-300 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10">
              <input
                type="checkbox"
                checked={showAnswers}
                onChange={(e) => setShowAnswers(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              พิมพ์เฉลย (ฉบับครูผู้สอน)
            </label>

            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2.5 rounded-lg font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95"
            >
              <Printer size={18} /> สั่งพิมพ์ / บันทึกเป็น PDF
            </button>
          </div>
        </div>
      </div>

      {/* 🟢 กระดาษ A4 เสมือนจริง (จะสยายเต็มจอตอนสั่งพิมพ์) */}
      <div className="py-8 print:p-0">
        <div className="bg-white w-full max-w-[794px] mx-auto min-h-[1123px] shadow-2xl p-10 sm:p-14 print:shadow-none print:max-w-none print:w-full print:p-8 relative">

          {/* ลายน้ำจางๆ ถ้ามี */}
          {metadata?.branding?.orgLogo && (
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none z-0">
              <img src={metadata.branding.orgLogo} alt="Watermark" className="w-[60%] object-contain grayscale" />
            </div>
          )}

          <div className="relative z-10">
            {/* --- หัวกระดาษ --- */}
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold mb-2">{examConfig?.title || 'แบบทดสอบ'}</h1>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6 pb-6 border-b-2 border-black/80">
              {isSchoolMode ? (
                <>
                  <div><span className="font-bold">โรงเรียน:</span> {metadata?.schoolName || '.................................................'}</div>
                  <div><span className="font-bold">จังหวัด/สพป/สพม:</span> {metadata?.areaName || '.................................................'}</div>
                  <div><span className="font-bold">รายวิชา:</span> {metadata?.subjectName || '.................................................'}</div>
                  <div><span className="font-bold">รหัสวิชา:</span> {metadata?.subjectCode || '.................................................'}</div>
                  <div><span className="font-bold">ระดับชั้น:</span> {metadata?.level || examConfig?.education_level || '.................................................'}</div>
                  <div><span className="font-bold">จำนวน:</span> {totalQuestions} ข้อ <span className="font-bold ml-4">คะแนนเต็ม:</span> {totalScore} คะแนน</div>
                  <div><span className="font-bold">สอบวันที่:</span> {formatDateThai(metadata?.examDate)}</div>
                  <div><span className="font-bold">เวลา:</span> {metadata?.examTimeStr || '..........'} น. ({metadata?.duration || 60} นาที)</div>
                  <div className="col-span-2"><span className="font-bold">ครูประจำวิชา:</span> {metadata?.teacherNames || '....................................................................................................'}</div>
                </>
              ) : (
                <>
                  <div className="col-span-2"><span className="font-bold">หน่วยงาน:</span> {metadata?.orgName || '....................................................................................................'}</div>
                  <div><span className="font-bold">จำนวน:</span> {totalQuestions} ข้อ <span className="font-bold ml-4">คะแนนเต็ม:</span> {totalScore} คะแนน</div>
                  <div><span className="font-bold">สอบวันที่:</span> {formatDateThai(metadata?.examDate)}</div>
                  <div><span className="font-bold">เวลา:</span> {metadata?.examTimeStr || '..........'} น. ({metadata?.duration || 60} นาที)</div>
                </>
              )}
            </div>

            <div className="mb-6 flex gap-2 text-sm">
              <span className="font-bold whitespace-nowrap">คำชี้แจง:</span>
              <p className="whitespace-pre-wrap">{metadata?.instructions || 'เลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว'}</p>
            </div>

            {/* --- พื้นที่กรอกชื่อนักเรียน --- */}
            {/* 🌟 หุ้มโค้ดส่วนช่องชื่อ-สกุล ด้วยเงื่อนไข showNameField */}
            {showNameField && (
              <div className="flex justify-end gap-6 mb-8 text-sm">
                <div className="flex gap-2 items-end">
                  <span>ชื่อ-สกุล</span><div className="w-48 border-b border-black border-dashed"></div>
                </div>
                <div className="flex gap-2 items-end">
                  <span>เลขที่</span><div className="w-16 border-b border-black border-dashed"></div>
                </div>
              </div>
            )}
            {/* --- รายการข้อสอบ --- */}
            <div className="space-y-6">
              {questions.map((q, idx) => (
                <div key={q.id} className="break-inside-avoid text-sm">
                  {/* โจทย์ */}
                  <div className="flex gap-2 items-start mb-2">
                    <span className="font-bold shrink-0">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap leading-relaxed">{q.question_text}</p>
                      {q.image_url && (
                        <img src={q.image_url} alt="ภาพประกอบข้อสอบ" className="max-w-md max-h-48 mt-3 border border-gray-300 rounded object-contain" />
                      )}
                    </div>
                  </div>

                  {/* ตัวเลือก */}
                  <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    {q.options.map((opt: any) => {
                      const isCorrectAnswer = opt.id === q.correct_answer;
                      return (
                        <div key={opt.id} className="flex gap-2 items-start">
                          <span className={`font-bold shrink-0 ${showAnswers && isCorrectAnswer ? 'text-white bg-black px-1 rounded-sm' : ''}`}>
                            {opt.id}.
                          </span>
                          <span className={`${showAnswers && isCorrectAnswer ? 'font-bold underline underline-offset-4 decoration-2' : ''}`}>
                            {opt.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* แสดงคำอธิบายเฉลย (เฉพาะเปิดโหมดเฉลย) */}
                  {showAnswers && q.explanation && (
                    <div className="pl-6 mt-2 text-[12px] text-gray-600 italic border-l-2 border-gray-300 ml-1 pl-3 py-1">
                      <span className="font-bold mr-1">อธิบาย:</span>{q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* --- จบกระดาษ --- */}
            <div className="mt-16 text-center text-sm font-bold border-t border-black/20 pt-4">
              -- สิ้นสุดแบบทดสอบ --
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}