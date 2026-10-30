"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, CheckCircle2, ChevronDown, Lightbulb, Loader2, Image as ImageIcon } from 'lucide-react';

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: string | number;
    question_number: number;
    display_label?: string;
    part_name?: string;
    question_type: string;
    question_text: string;
    options: Option[];
    correct_answer: string;
    explanation: string;
    solution_image_url?: string;
    image_url?: string;
}

export default function SolutionReviewPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [exam, setExam] = useState<any>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    
    // State สำหรับเก็บ ID ของข้อที่ถูกกางดูเฉลยอยู่
    const [expandedQId, setExpandedQId] = useState<string | number | null>(null);

    useEffect(() => {
        const fetchSolutions = async () => {
            try {
                // 1. ดึงข้อมูลหัวข้อสอบ
                const { data: examData, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('id', examId)
                    .single();
                
                if (examError) throw examError;
                setExam(examData);

                // 2. ดึงข้อมูลข้อสอบพร้อมเฉลย
                const { data: qData, error: qError } = await supabase
                    .from('exam_questions')
                    .select('*')
                    .eq('exam_id', examId)
                    .order('question_number', { ascending: true });

                if (qError) throw qError;

                const formattedQ = (qData || []).map(q => {
                    let plainExplanation = q.explanation || '';
                    
                    // 🌟 วนลูป "ปอกหัวหอม" ล้าง JSON ขยะ (แบบเดียวกับหน้า Edit)
                    let attempts = 0;
                    while (typeof plainExplanation === 'string' && plainExplanation.startsWith('{') && attempts < 5) {
                        try {
                            const parsed = JSON.parse(plainExplanation);
                            if (parsed.original_explanation !== undefined) {
                                plainExplanation = parsed.original_explanation;
                            } else {
                                break;
                            }
                        } catch(e) {
                            break;
                        }
                        attempts++;
                    }
                    if (plainExplanation === '""' || plainExplanation === "''" || plainExplanation === 'null') {
                        plainExplanation = '';
                    }

                    return { ...q, explanation: plainExplanation };
                });

                setQuestions(formattedQ);
            } catch (error: any) {
                alert("ไม่สามารถโหลดข้อมูลเฉลยได้: " + error.message);
            } finally {
                setIsLoading(false);
            }
        };

        if (examId) fetchSolutions();
    }, [examId]);

    const toggleExplanation = (id: string | number) => {
        setExpandedQId(expandedQId === id ? null : id);
    };

    if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-amber-500"><Loader2 className="animate-spin w-10 h-10" /></div>;
    if (!exam) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">ไม่พบข้อมูลชุดข้อสอบ</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans pb-24">
            {/* 🌟 Navbar */}
            <nav className="w-full bg-slate-950/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 size={18} /> เฉลยละเอียด
                        </h1>
                        <p className="text-xs text-gray-400 line-clamp-1">{exam.title}</p>
                    </div>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
                {questions.map((q, idx) => {
                    const isExpanded = expandedQId === q.id;
                    const hasExplanation = (q.explanation && q.explanation.trim() !== '') || q.solution_image_url;

                    return (
                        <div key={q.id} className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                            {/* แถบสีตกแต่ง */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>

                            {/* หัวข้อ (ตอนที่ + เลขข้อ) */}
                            <div className="flex items-start gap-3 mb-4">
                                <div className="bg-slate-800 text-emerald-400 font-black text-sm px-3 py-1.5 rounded-lg border border-emerald-500/20 shrink-0">
                                    ข้อ {q.display_label || q.question_number}
                                </div>
                                <div className="flex-1 pt-1">
                                    {q.part_name && <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full mb-2 inline-block">{q.part_name}</span>}
                                    <p className="text-sm sm:text-base font-medium leading-relaxed">{q.question_text || 'อิงจากภาพข้อสอบต้นฉบับ'}</p>
                                </div>
                            </div>

                            {/* ภาพโจทย์ (ถ้ามี) */}
                            {q.image_url && (
                                <div className="mb-4 pl-12">
                                    <img src={q.image_url} alt="ภาพโจทย์" className="max-h-64 rounded-xl border border-white/10" />
                                </div>
                            )}

                            {/* ตัวเลือกคำตอบ */}
                            <div className="pl-0 sm:pl-12 space-y-2 mb-4">
                                {q.question_type === 'short_answer' ? (
                                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs font-black shrink-0"><CheckCircle2 size={14}/></div>
                                        <div>
                                            <div className="text-[10px] text-emerald-500 font-bold uppercase mb-0.5">เฉลยคำตอบ</div>
                                            <div className="font-bold text-emerald-300">{q.correct_answer}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {q.options?.map((opt) => {
                                            const isCorrect = opt.id === q.correct_answer;
                                            return (
                                                <div key={opt.id} className={`p-3 rounded-xl border text-sm flex items-center gap-3 transition-colors ${isCorrect ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-slate-950 border-white/5 opacity-60'}`}>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCorrect ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-400'}`}>
                                                        {isCorrect ? '✓' : opt.id}
                                                    </div>
                                                    <span className={`font-medium ${isCorrect ? 'text-emerald-300' : 'text-gray-400'}`}>{opt.text}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 🌟 ส่วน Accordion: อธิบายวิธีทำ (กาง/หด) */}
                            {hasExplanation && (
                                <div className="pl-0 sm:pl-12 mt-4">
                                    <button 
                                        onClick={() => toggleExplanation(q.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${isExpanded ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-white/5 hover:bg-slate-800'}`}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
                                            <Lightbulb size={16} className={isExpanded ? 'fill-amber-500' : ''} /> 
                                            ดูคำอธิบาย / วิธีทำอย่างละเอียด
                                        </div>
                                        <ChevronDown size={18} className={`text-amber-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* กล่องเนื้อหาเฉลยที่จะกางออก */}
                                    <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                                        <div className="bg-black/40 border border-white/5 rounded-xl p-5 space-y-4">
                                            
                                            {/* ภาพถ่ายวิธีทำ */}
                                            {q.solution_image_url && (
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mb-2"><ImageIcon size={12}/> ภาพวิธีทำ</div>
                                                    <img src={q.solution_image_url} alt="Solution" className="w-full sm:max-w-md rounded-lg border border-white/10 shadow-lg" />
                                                </div>
                                            )}
                                            
                                            {/* ข้อความอธิบาย */}
                                            {q.explanation && (
                                                <div>
                                                    <div className="text-[10px] text-gray-500 font-bold mb-1">คำอธิบายเพิ่มเติม</div>
                                                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                        {q.explanation}
                                                    </div>
                                                </div>
                                            )}
                                            
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    );
                })}
            </main>
        </div>
    );
}