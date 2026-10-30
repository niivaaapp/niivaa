"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, CheckCircle2, XCircle, ChevronRight,
    Lightbulb, Loader2, RefreshCcw, Award, Play, Image as ImageIcon,
    FileText, MonitorPlay
} from 'lucide-react';

export default function PracticeExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [examInfo, setExamInfo] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 🌟 States สำหรับการฝึกทำ
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    useEffect(() => {
        fetchExamAndQuestions();
    }, [examId]);

    const fetchExamAndQuestions = async () => {
        try {
            // 1. ดึงข้อมูลชุดข้อสอบ
            const { data: exam, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single();

            if (examError || !exam) throw new Error("ไม่พบชุดข้อสอบนี้ หรืออาจถูกลบไปแล้ว");
            if (!exam.is_public) throw new Error("ข้อสอบชุดนี้ไม่ได้เปิดเป็นสาธารณะครับ");

            let metadata: any = {};
            try { if (exam.topic) metadata = JSON.parse(exam.topic); } catch (e) { }

            setExamInfo({ ...exam, metadata });

            // 2. ดึงข้อสอบ
            const { data: qData, error: qError } = await supabase
                .from('exam_questions')
                .select('*')
                .eq('exam_id', examId)
                .order('question_number', { ascending: true });

            if (qError) throw qError;

            let loadedQuestions = qData || [];

            // 🌟 ดักกรณีเป็น PDF แต่ยังไม่มีข้อสอบรายข้อในฐานข้อมูล (Virtual Mode)
            const isDoc = exam.exam_format === 'pdf' || exam.exam_format === 'image' || exam.exam_format === 'multi_image' || (exam.file_url && exam.file_url.includes('.pdf'));
            if (loadedQuestions.length === 0 && isDoc) {
                const count = exam.total_score > 0 ? Number(exam.total_score) : 10;
                loadedQuestions = Array.from({ length: count }).map((_, i) => ({
                    id: `virtual-q-${i + 1}`,
                    question_number: i + 1,
                    question_type: 'mcq',
                    question_text: 'อ้างอิงจากไฟล์เอกสาร',
                    options: [{ id: 'ก', text: 'ก' }, { id: 'ข', text: 'ข' }, { id: 'ค', text: 'ค' }, { id: 'ง', text: 'ง' }],
                    correct_answer: '',
                    score: 1,
                    solution_text: ''
                }));
            }

            setQuestions(loadedQuestions);

           // 3. อัปเดตยอดเข้าชม (Play Count) ผ่าน RPC แทนเพื่อข้าม RLS อย่างปลอดภัย
      await supabase.rpc('increment_play_count', { exam_id_param: examId });

        } catch (error: any) {
            alert(error.message);
            router.push('/smartexam/explore');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectOption = (questionId: string, selectedOption: string) => {
        if (answers[questionId]) return;

        setAnswers(prev => ({ ...prev, [questionId]: selectedOption }));

        const q = questions.find(q => q.id === questionId);
        if (q && q.correct_answer === selectedOption) {
            setScore(prev => prev + (Number(q.score) || 1));
        }
    };

    const handleNext = () => {
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    const handleRestart = () => {
        setAnswers({});
        setCurrentIdx(0);
        setScore(0);
        setIsFinished(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-amber-500">
                <Loader2 className="animate-spin w-12 h-12 mb-4" />
                <p className="font-bold">กำลังเตรียมข้อสอบให้คุณ...</p>
            </div>
        );
    }

    if (isFinished) {
        const percentage = Math.round((score / (examInfo.total_score || questions.length)) * 100);
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                        <Award size={48} className="text-black" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white">ฝึกทำสำเร็จ!</h2>
                        <p className="text-gray-400 text-sm mt-2">{examInfo.title}</p>
                    </div>

                    <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                        <div className="text-sm text-gray-500 mb-2">คะแนนของคุณ</div>
                        <div className="text-5xl font-black text-amber-400">
                            {score} <span className="text-2xl text-gray-600">/ {examInfo.total_score || questions.length}</span>
                        </div>
                        <div className="mt-4 text-sm font-bold text-emerald-400 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
                            คิดเป็น {percentage}%
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                        <button onClick={handleRestart} className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                            <RefreshCcw size={16} /> ทำใหม่อีกครั้ง
                        </button>
                        <button onClick={() => router.push('/smartexam/explore')} className="py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors">
                            <Play size={16} className="fill-current" /> หาข้อสอบอื่น
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIdx];
    const hasAnswered = !!answers[currentQ.id];
    const isCorrect = hasAnswered && answers[currentQ.id] === currentQ.correct_answer;
    const isPdfOrImage = examInfo?.exam_format === 'pdf' || examInfo?.exam_format === 'image' || examInfo?.exam_format === 'multi_image' || (examInfo?.file_url && examInfo.file_url.toLowerCase().includes('.pdf'));

    // 🌟 ฟังก์ชันแปลงลิงก์ YouTube ให้อยู่ในรูปแบบ Embed
    const getYouTubeEmbedUrl = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}?rel=0` : null;
    };
    return (
        <div className={`w-full bg-[#0f172a] text-white font-sans flex flex-col ${isPdfOrImage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>

            {/* 🟢 HEADER */}
            <nav className="w-full border-b border-white/5 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 shrink-0 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">

                    {/* 🌟 ฝั่งซ้าย: ปุ่มกลับ และ โลโก้ */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={() => router.push('/smartexam/explore')} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors" title="กลับหน้าคลังข้อสอบ">
                            <ArrowLeft size={20} />
                        </button>
                        <img
                            src="/niivaa_smartexam_logo.png"
                            alt="NiiVaa SmartExam"
                            className="h-5 sm:h-6 object-contain hidden md:block"
                        />
                    </div>

                    {/* 🌟 ตรงกลาง: ข้อมูลชุดข้อสอบ (ชื่อ, วิชา, ระดับชั้น, จำนวนข้อ) */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center overflow-hidden">
                        <h1 className="text-sm sm:text-base font-black text-white truncate w-full px-2">
                            {examInfo?.title || 'กำลังโหลด...'}
                        </h1>
                        <div className="flex items-center justify-center gap-2 mt-0.5 text-[10px] sm:text-xs font-medium text-gray-400">
                            <span className="truncate max-w-[80px] sm:max-w-none">{examInfo?.subject_category || 'ทั่วไป'}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0"></span>
                            <span className="truncate max-w-[80px] sm:max-w-none">{examInfo?.education_level || 'ทั่วไป'}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600 shrink-0"></span>
                            <span className="shrink-0 text-amber-400 font-bold">{questions.length} ข้อ</span>
                        </div>
                    </div>

                    {/* 🌟 ฝั่งขวา: คะแนนปัจจุบัน */}
                    <div className="shrink-0 flex flex-col items-end">
                        <div className="text-xs sm:text-sm font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            {score} pt
                        </div>
                    </div>
                </div>

                {/* 🌟 แถบ Progress Bar (อยู่ขอบล่างของ Header) */}
                <div className="w-full bg-slate-800 h-1 relative">
                    <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500 ease-out"
                        style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                    ></div>
                    {/* ตัวเลขนับข้อ (ลอยอยู่เหนือ Progress Bar เล็กน้อย) */}
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 font-bold tracking-widest uppercase bg-slate-950 px-2 py-0.5 rounded-b-md border-x border-b border-white/5">
                        ข้อที่ {currentIdx + 1}
                    </div>
                </div>
            </nav>

            {/* 🟢 MAIN AREA (รองรับ Split Screen สำหรับ PDF/Image) */}
            <main className={`flex flex-col ${isPdfOrImage ? 'lg:flex-row flex-1 overflow-hidden' : 'flex-1 overflow-y-auto pb-32'}`}>

                {/* 🌟 ฝั่งซ้าย: Document Viewer (แสดงเฉพาะโหมด PDF/Image) */}
                {isPdfOrImage && (
                    <div className="flex-1 relative overflow-y-auto custom-scrollbar bg-[#1e293b] h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col items-center">
                        {examInfo.exam_format === 'pdf' || (examInfo.file_url && examInfo.file_url.toLowerCase().includes('.pdf')) ? (
                            <iframe src={`${examInfo.file_url}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full border-none absolute inset-0" title="Exam Document" />
                        ) : (
                            <div className="w-full h-full p-4 flex flex-col items-center gap-6">
                                {examInfo.image_urls && examInfo.image_urls.length > 0 ? (
                                    examInfo.image_urls.map((url: string, imgIndex: number) => (
                                        <div key={imgIndex} className="relative w-full max-w-3xl shadow-2xl rounded-xl bg-white overflow-hidden shrink-0">
                                            <img src={url} alt={`Page ${imgIndex + 1}`} className="w-full h-auto block pointer-events-none" />

                                            {/* เรนเดอร์ตรายางข้อสอบ */}
                                            {questions.filter(q => q.image_index === imgIndex).map((q) => (
                                                <div
                                                    key={q.id}
                                                    className={`absolute flex items-center justify-center font-black rounded-full shadow-lg border-2 pointer-events-none transition-all ${currentQ.id === q.id ? 'border-amber-500 bg-amber-500 text-black scale-125 z-10 animate-pulse' : 'border-white bg-[#f59e0b] text-white'
                                                        }`}
                                                    style={{
                                                        left: `${q.marker_x_percent}%`, top: `${q.marker_y_percent}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        width: 'clamp(24px, 4vw, 36px)', height: 'clamp(24px, 4vw, 36px)',
                                                        fontSize: 'clamp(12px, 2vw, 16px)'
                                                    }}
                                                >
                                                    {q.question_number}
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <div className="relative w-full max-w-3xl shadow-2xl rounded-xl bg-white overflow-hidden shrink-0">
                                        <img src={examInfo.file_url} alt="Exam" className="w-full h-auto block" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 🌟 ฝั่งขวา (หรือตรงกลางสำหรับโหมดปกติ): แบบฝึกหัดและเฉลย */}
                <div className={`${isPdfOrImage ? 'w-full lg:w-[450px] shrink-0 h-1/2 lg:h-full overflow-y-auto custom-scrollbar bg-slate-950 p-4 md:p-6 relative' : 'max-w-3xl mx-auto px-4 py-8 w-full'}`}>
                    <div className="space-y-6 pb-24">

                        {/* ส่วนโจทย์ (ถ้ารูปแบบ PDF ให้ลดขนาดกล่องลงเพื่อประหยัดพื้นที่) */}
                        <div className={`bg-slate-900 border border-white/10 rounded-2xl ${isPdfOrImage ? 'p-4' : 'p-6 md:p-8 shadow-xl'}`}>
                            {!isPdfOrImage && (
                                <h2 className="text-lg md:text-xl font-medium leading-relaxed whitespace-pre-wrap">
                                    {currentQ.question_text}
                                </h2>
                            )}
                            {isPdfOrImage && (
                                <div className="text-amber-500 font-bold flex items-center gap-2">
                                    <FileText size={18} /> คำถามข้อที่ {currentQ.question_number}
                                </div>
                            )}
                            {currentQ.image_url && (
                                <img src={currentQ.image_url} alt="ภาพประกอบโจทย์" className="mt-4 max-w-full max-h-64 rounded-xl border border-white/10 object-contain bg-black/50 mx-auto" />
                            )}
                        </div>

                        {/* ส่วนตัวเลือก */}
                        <div className={`space-y-3 ${isPdfOrImage ? 'text-sm' : ''}`}>
                            {currentQ.options?.map((opt: any) => {
                                const isSelected = answers[currentQ.id] === opt.id;
                                const isCorrectOption = opt.id === currentQ.correct_answer;

                                let cardStyle = "bg-slate-900 border-white/10 hover:border-white/30 text-gray-300";
                                let icon = null;

                                if (hasAnswered) {
                                    if (isCorrectOption) {
                                        cardStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]";
                                        icon = <CheckCircle2 className="text-emerald-500 shrink-0" size={isPdfOrImage ? 18 : 24} />;
                                    } else if (isSelected && !isCorrectOption) {
                                        cardStyle = "bg-red-500/10 border-red-500 text-red-400 font-bold opacity-80";
                                        icon = <XCircle className="text-red-500 shrink-0" size={isPdfOrImage ? 18 : 24} />;
                                    } else {
                                        cardStyle = "bg-slate-900 border-white/5 text-gray-600 opacity-50";
                                    }
                                } else if (isSelected) {
                                    cardStyle = "bg-amber-500/20 border-amber-500 text-amber-400";
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleSelectOption(currentQ.id, opt.id)}
                                        disabled={hasAnswered}
                                        className={`w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${cardStyle}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-sm ${hasAnswered ? (isCorrectOption ? 'border-emerald-500 text-emerald-500' : isSelected ? 'border-red-500 text-red-500' : 'border-gray-700 text-gray-700') : 'border-gray-500'}`}>
                                                {opt.id}
                                            </div>
                                            <span className="leading-relaxed">{opt.text}</span>
                                        </div>
                                        {icon}
                                    </button>
                                );
                            })}
                        </div>

                        {/* 🌟 ส่วนเฉลยละเอียด */}
                        {/* 🌟 ส่วนเฉลยละเอียด (ข้อความ, ภาพ, และวิดีโอ) */}
                        {hasAnswered && (currentQ.solution_text || currentQ.solution_image_url || currentQ.solution_video_url) && (
                            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                                <div className={`p-5 rounded-2xl border ${isCorrect ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-red-950/30 border-red-500/20'}`}>
                                    <div className={`flex items-center gap-2 font-bold mb-3 ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <Lightbulb size={18} /> {isCorrect ? 'ยอดเยี่ยม! คุณตอบถูก' : 'ไม่เป็นไร! มาดูเฉลยกัน'}
                                    </div>

                                    {/* เฉลยแบบข้อความ */}
                                    {currentQ.solution_text && (
                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap bg-black/40 p-4 rounded-xl border border-white/5 mb-4">
                                            {currentQ.solution_text}
                                        </p>
                                    )}

                                    {/* เฉลยแบบวิดีโอ YouTube */}
                                    {currentQ.solution_video_url && getYouTubeEmbedUrl(currentQ.solution_video_url) && (
                                        <div className="mb-4">
                                            <span className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5"><MonitorPlay size={14} className="text-red-500" /> วิดีโออธิบายวิธีทำ:</span>
                                            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black">
                                                <iframe
                                                    src={getYouTubeEmbedUrl(currentQ.solution_video_url) as string}
                                                    title="YouTube video solution"
                                                    className="absolute top-0 left-0 w-full h-full border-0"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        </div>
                                    )}

                                    {/* เฉลยแบบรูปภาพ */}
                                    {currentQ.solution_image_url && (
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5"><ImageIcon size={14} className="text-blue-400" /> ภาพเฉลย (คลิกเพื่อขยาย):</span>
                                            <img
                                                src={currentQ.solution_image_url}
                                                alt="ภาพเฉลย"
                                                onClick={() => setZoomedImage(currentQ.solution_image_url)}
                                                className="max-h-64 w-full rounded-xl border border-white/10 bg-white object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* 🌟 Modal: ขยายภาพเฉลย (Lightbox) */}
                {zoomedImage && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                        onClick={() => setZoomedImage(null)}
                    >
                        <button
                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 rounded-full transition-colors z-50"
                            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
                        >
                            <XCircle size={28} />
                        </button>

                        <img
                            src={zoomedImage}
                            alt="Expanded solution view"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()} // ป้องกันการกดที่รูปแล้วปิด
                        />
                    </div>
                )}
            </main>

            {/* 🟢 FLOATING ACTION BUTTON */}
            {hasAnswered && (
                <div className={`fixed bottom-0 ${isPdfOrImage ? 'right-0 w-full lg:w-[450px]' : 'left-0 w-full'} bg-slate-950/90 backdrop-blur-md border-t border-white/10 p-4 z-50 animate-in slide-in-from-bottom-full`}>
                    <div className={`${isPdfOrImage ? 'w-full' : 'max-w-3xl mx-auto'} flex justify-end`}>
                        <button
                            onClick={handleNext}
                            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-base rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95 w-full sm:w-auto"
                        >
                            {currentIdx < questions.length - 1 ? (
                                <>ข้อถัดไป <ChevronRight size={18} /></>
                            ) : (
                                <>ดูสรุปผล <CheckCircle2 size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
        </div>
    );
}