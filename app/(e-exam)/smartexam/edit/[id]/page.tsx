"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, Save, Trash2, Plus, ImageIcon, Loader2, TypeIcon,
    Type, FileText, Target, X, MoveUp, MoveDown, MousePointerClick, CopyPlus, LayoutDashboard,
    MessageSquareText, BookOpen, ChevronDown, AlignLeft, Upload, MonitorPlay, Link as LinkIcon // 🌟 เพิ่มไอคอนใหม่
} from 'lucide-react';

interface Option { id: string; text: string; }

interface Question {
    id: string | number;
    question_number: number;
    question_text: string;
    display_label?: string; 
    options: Option[];
    correct_answer: string;
    explanation: string;
    score: number;
    question_type?: string;
    image_index?: number;
    marker_x_percent?: number;
    marker_y_percent?: number;
    image_url?: string;
    solution_image_url?: string;
    solution_video_url?: string; // 🌟 รองรับวิดีโอเฉลย
    reference_source?: string;   // 🌟 รองรับที่มาข้อสอบ
    part_name?: string; // 👈 เติมบรรทัดนี้เข้าไปเพื่อให้ TypeScript รู้จัก
}

interface Annotation {
    id: string;
    image_index: number;
    x_percent: number;
    y_percent: number;
    text: string;
    font_size: number;
    text_color: string;
    bg_color: string;
}

export default function EditExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);

    const [examConfig, setExamConfig] = useState({
        title: '', subject_category: '', education_level: '', status: 'draft',
        exam_format: 'standard', file_url: '',
        image_urls: [] as string[],
        metadata: { stamp_color: '#f59e0b', instructions: '' } as any
    });

    const [questions, setQuestions] = useState<Question[]>([]);
    const [interactionMode, setInteractionMode] = useState<'stamp' | 'text'>('stamp');
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [defaultQType, setDefaultQType] = useState('mcq');
    const [mcqFormat, setMcqFormat] = useState('กขคง');

    const [isManualOpen, setIsManualOpen] = useState(false);
    const [activeAccordion, setActiveAccordion] = useState<string | null>('step1');

    const handleUploadQuestionImage = async (e: React.ChangeEvent<HTMLInputElement>, qIdx: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `question_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `images/questions/${fileName}`; 

            const { error: uploadError } = await supabase.storage.from('exam-assets').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('exam-assets').getPublicUrl(filePath);
            
            const updatedQuestions = [...questions];
            updatedQuestions[qIdx].image_url = publicUrlData.publicUrl;
            setQuestions(updatedQuestions);
        } catch (error: any) {
            alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message);
        }
    };

    const handleRemoveQuestionImage = (qIdx: number) => {
        const updatedQuestions = [...questions];
        updatedQuestions[qIdx].image_url = undefined; // ใช้ undefined แทน null ให้ตรง interface
        setQuestions(updatedQuestions);
    };

    useEffect(() => {
        const fetchExamData = async () => {
            try {
                const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
                if (examError || !exam) throw new Error("ไม่พบข้อสอบชุดนี้");

                let meta: any = { stamp_color: '#f59e0b', annotations: [], instructions: '' };
                try {
                    const parsedMeta = JSON.parse(exam.topic || '{}');
                    meta = { ...meta, ...parsedMeta };
                } catch (e) { }

                const loadedImages = exam.image_urls || (exam.file_url ? [exam.file_url] : []);

                setExamConfig({
                    title: exam.title || '', subject_category: exam.subject_category || '',
                    education_level: exam.education_level || '', status: exam.status || 'draft',
                    exam_format: exam.exam_format || 'standard', file_url: exam.file_url || '',
                    image_urls: loadedImages,
                    metadata: meta
                });

                if (meta.annotations && Array.isArray(meta.annotations)) {
                    setAnnotations(meta.annotations);
                }

                const { data: qData } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('question_number', { ascending: true });
                const formattedQ = (qData || []).map(q => {
                    let metaQ: any = {};
                    let plainExplanation = q.explanation || '';
                    
                    let attempts = 0;
                    while (typeof plainExplanation === 'string' && plainExplanation.startsWith('{') && attempts < 5) {
                        try {
                            const parsed = JSON.parse(plainExplanation);
                            if (parsed.original_explanation !== undefined) {
                                plainExplanation = parsed.original_explanation;
                                metaQ = { ...metaQ, ...parsed };
                            } else { break; }
                        } catch(e) { break; }
                        attempts++;
                    }
                    
                    if (plainExplanation === '""' || plainExplanation === "''" || plainExplanation === 'null') plainExplanation = '';
                    
                    return { ...q, ...metaQ, explanation: plainExplanation };
                });

                setQuestions(formattedQ);
            } catch (error: any) {
                alert(error.message);
            } finally {
                setIsLoading(false);
            }
        };
        if (examId) fetchExamData();
    }, [examId]);

    const getOptionsList = (format: string): Option[] => {
        switch (format) {
            case 'TF': return [{ id: 'ถูก', text: 'ถูก' }, { id: 'ผิด', text: 'ผิด' }];
            case '123': return [{ id: '1', text: '1' }, { id: '2', text: '2' }, { id: '3', text: '3' }];
            case 'ABCD': return [{ id: 'A', text: 'A' }, { id: 'B', text: 'B' }, { id: 'C', text: 'C' }, { id: 'D', text: 'D' }];
            case '1234': return [{ id: '1', text: '1' }, { id: '2', text: '2' }, { id: '3', text: '3' }, { id: '4', text: '4' }];
            case '12345': return [{ id: '1', text: '1' }, { id: '2', text: '2' }, { id: '3', text: '3' }, { id: '4', text: '4' }, { id: '5', text: '5' }];
            default: return [{ id: 'ก', text: 'ก' }, { id: 'ข', text: 'ข' }, { id: 'ค', text: 'ค' }, { id: 'ง', text: 'ง' }];
        }
    };

    const applyFormatToAllMCQ = () => {
        if (!confirm('ยืนยันการเปลี่ยนรูปแบบตัวเลือกของ "ข้อปรนัยทั้งหมด" หรือไม่?')) return;
        
        setQuestions(prev => prev.map(q => {
            if (q.question_type !== 'mcq') return q;
            const oldOptions = q.options || [];
            const oldCorrectAnswer = q.correct_answer;
            const oldCorrectIndex = oldOptions.findIndex(opt => opt.id === oldCorrectAnswer);
            const newOptions = getOptionsList(mcqFormat);
            
            let newCorrectAnswer = '';
            if (oldCorrectIndex !== -1 && oldCorrectIndex < newOptions.length) {
                newCorrectAnswer = newOptions[oldCorrectIndex].id;
            }

            const mergedOptions = newOptions.map((newOpt, index) => {
                const oldOpt = oldOptions[index];
                const textToKeep = (oldOpt && oldOpt.text !== oldOpt.id) ? oldOpt.text : newOpt.text;
                return { id: newOpt.id, text: textToKeep };
            });

            return { ...q, options: mergedOptions, correct_answer: newCorrectAnswer };
        }));
    };

    const handleUpdateQuestionField = (index: number, field: keyof Question, value: any) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const handleTypeChange = (index: number, newType: string) => {
        setQuestions(prev => prev.map((q, i) => i === index ? {
            ...q, question_type: newType, correct_answer: '',
            options: newType === 'mcq' ? getOptionsList(mcqFormat) : []
        } : q));
    };

    const handleDeleteQuestion = (index: number) => {
        if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อคำถามข้อนี้?")) {
            setQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, question_number: i + 1 })));
        }
    };

    const handleUpdateOptionText = (qIndex: number, optId: string, text: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const updatedOptions = q.options.map(opt => opt.id === optId ? { ...opt, text } : opt);
            return { ...q, options: updatedOptions };
        }));
    };

    const handleUploadSolutionImage = async (qIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return alert("ขนาดรูปภาพต้องไม่เกิน 5 MB");

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `solution-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('exam-assets').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('exam-assets').getPublicUrl(fileName);
            handleUpdateQuestionField(qIdx, 'solution_image_url', publicUrlData.publicUrl);
        } catch (error: any) {
            alert("อัปโหลดภาพเฉลยไม่สำเร็จ: " + error.message);
        }
    };

    const handleAddQuestionManually = () => {
        const newQuestion: Question = {
            id: `new-${Date.now()}`, question_number: questions.length + 1, question_text: '',
            options: defaultQType === 'mcq' ? getOptionsList(mcqFormat) : [],
            correct_answer: '', explanation: '', score: 1, question_type: defaultQType
        };
        setQuestions(prev => [...prev, newQuestion]);
    };

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, imageIndex: number) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).closest('.annotation-toolbar')) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

        if (interactionMode === 'stamp') {
            const newQuestion: Question = {
                id: `stamp-${Date.now()}`, question_number: questions.length + 1, question_type: defaultQType,
                question_text: 'อิงจากภาพข้อสอบ', options: defaultQType === 'mcq' ? getOptionsList(mcqFormat) : [],
                correct_answer: '', explanation: '', score: 1, image_index: imageIndex,
                marker_x_percent: parseFloat(xPercent.toFixed(2)), marker_y_percent: parseFloat(yPercent.toFixed(2)),
            };
            setQuestions(prev => [...prev, newQuestion]);
            setTimeout(() => {
                const rightPanel = document.getElementById('right-panel-scroll');
                if (rightPanel) rightPanel.scrollTo({ top: rightPanel.scrollHeight, behavior: 'smooth' });
            }, 100);
        } else if (interactionMode === 'text') {
            const newAnnotation: Annotation = {
                id: `anno-${Date.now()}`, image_index: imageIndex, x_percent: parseFloat(xPercent.toFixed(2)),
                y_percent: parseFloat(yPercent.toFixed(2)), text: '', font_size: 16, text_color: '#ffffff', bg_color: '#3b82f6'
            };
            setAnnotations(prev => [...prev, newAnnotation]);
        }
    };

    const updateAnnotation = (id: string, field: keyof Annotation, value: any) => {
        setAnnotations(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const deleteAnnotation = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setAnnotations(prev => prev.filter(a => a.id !== id));
    };

    const handleRemoveStamp = (e: React.MouseEvent, questionId: string | number) => {
        e.stopPropagation();
        setQuestions(prev => prev.filter(q => q.id !== questionId).map((q, i) => ({ ...q, question_number: i + 1 })));
    };

    const removeImage = (indexToRemove: number) => {
        if (!confirm("ลบภาพนี้? (ข้อสอบที่ประทับตราจะหายไปด้วย)")) return;
        const newImages = examConfig.image_urls.filter((_, idx) => idx !== indexToRemove);
        setExamConfig(prev => ({ ...prev, image_urls: newImages }));
        setQuestions(prev => {
            const remaining = prev.filter(q => q.image_index !== indexToRemove).map(q => ({
                ...q, image_index: q.image_index! > indexToRemove ? q.image_index! - 1 : q.image_index
            }));
            return remaining.map((q, i) => ({ ...q, question_number: i + 1 }));
        });
        setAnnotations(prev => prev.filter(a => a.image_index !== indexToRemove).map(a => ({
            ...a, image_index: a.image_index > indexToRemove ? a.image_index - 1 : a.image_index
        })));
    };

    const moveImage = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === examConfig.image_urls.length - 1)) return;
        const newUrls = [...examConfig.image_urls];
        const swapIdx = direction === 'up' ? index - 1 : index + 1;
        [newUrls[index], newUrls[swapIdx]] = [newUrls[swapIdx], newUrls[index]];
        setExamConfig(prev => ({ ...prev, image_urls: newUrls }));

        setQuestions(prev => prev.map(q => {
            if (q.image_index === index) return { ...q, image_index: swapIdx };
            if (q.image_index === swapIdx) return { ...q, image_index: index };
            return q;
        }));

        setAnnotations(prev => prev.map(a => {
            if (a.image_index === index) return { ...a, image_index: swapIdx };
            if (a.image_index === swapIdx) return { ...a, image_index: index };
            return a;
        }));
    };

    const handleSaveEdits = async () => {
        setIsSaving(true);
        try {
            const newTotalScore = parseFloat(questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0).toFixed(2));
            const finalMetadata = { ...examConfig.metadata, annotations };
            const metaStr = JSON.stringify(finalMetadata);

            const { error: examError } = await supabase.from('exams').update({
                title: examConfig.title.trim(), status: examConfig.status,
                total_score: newTotalScore, exam_format: examConfig.exam_format,
                file_url: examConfig.image_urls[0] || examConfig.file_url,
                topic: metaStr,
                image_urls: examConfig.image_urls.length > 0 ? examConfig.image_urls : null
            }).eq('id', examId);
            if (examError) throw examError;

            await supabase.from('exam_questions').delete().eq('exam_id', examId);

            const formattedQ = questions.map((q, i) => {
                const markerData = { image_index: q.image_index, marker_x_percent: q.marker_x_percent, marker_y_percent: q.marker_y_percent };
                const finalExplanation = JSON.stringify({ original_explanation: q.explanation, ...markerData });

                return {
                    exam_id: examId, 
                    question_number: i + 1,
                    display_label: q.display_label || `${i + 1}`,
                    part_name: (q as any).part_name || '', // cast as any to handle part_name if missing in interface
                    question_type: q.question_type || 'mcq', 
                    question_text: q.question_text || '',
                    options: q.question_type === 'short_answer' ? [] : (q.options || []),
                    correct_answer: q.correct_answer || '', 
                    score: Number(q.score) || 1,
                    explanation: finalExplanation, 
                    image_url: q.image_url || null,
                    solution_image_url: q.solution_image_url || null,
                    solution_video_url: q.solution_video_url || null, // 🌟 บันทึกลิงก์วิดีโอ
                    reference_source: q.reference_source || null      // 🌟 บันทึกที่มา
                };
            });

            if (formattedQ.length > 0) {
                const { error: insertErr } = await supabase.from('exam_questions').insert(formattedQ);
                if (insertErr) throw insertErr;
            }

            alert("บันทึกข้อมูลเรียบร้อยแล้ว!");
            router.push('/smartexam'); // กลับไปหน้าคลังข้อสอบของคุณ
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerateParallelItem = async (index: number) => {
        setGeneratingIndex(index);
        try {
            const originalQuestion = questions[index];
            const payload = { originalQuestion: { question_text: originalQuestion.question_text, options: originalQuestion.options, correct_answer: originalQuestion.correct_answer, explanation: originalQuestion.explanation } };
            const res = await fetch('/api/generate-parallel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await res.json();

            if (result.success && result.data) {
                const generated = result.data;
                const newQuestion: Question = {
                    id: `parallel-${Date.now()}`, question_number: 0,
                    question_text: generated.question_text || generated.text,
                    options: generated.options, correct_answer: generated.correct_answer || generated.correct,
                    explanation: generated.explanation, score: originalQuestion.score, question_type: originalQuestion.question_type || 'mcq'
                };
                setQuestions(prev => {
                    const copy = [...prev]; copy.splice(index + 1, 0, newQuestion);
                    return copy.map((q, i) => ({ ...q, question_number: i + 1 }));
                });
            }
        } catch (error: any) {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
        } finally {
            setGeneratingIndex(null);
        }
    };

    const toggleAccordion = (id: string) => {
        setActiveAccordion(activeAccordion === id ? null : id);
    };

    if (isLoading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-amber-500"><Loader2 className="animate-spin w-12 h-12" /></div>;

    const isDocumentMode = examConfig.exam_format === 'multi_image' || examConfig.exam_format === 'pdf' || examConfig.exam_format === 'image' || examConfig.image_urls.length > 0;

    return (
        <div className={`flex flex-col bg-[#020617] text-white font-sans ${isDocumentMode ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>

            {/* 🌟 Navbar ปรับแต่งเพิ่มโลโก้และให้แก้ไขชื่อเรื่องได้เลย */}
            <nav className="h-16 shrink-0 border-b border-white/10 bg-slate-950 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-1 sm:gap-3 flex-1 overflow-hidden">
                    <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="ย้อนกลับ">
                        <ArrowLeft size={20} />
                    </button>
                    {/* 🌟 โลโก้ NiiVaa */}
                    <img src="/niivaa_smartexam_logo.png" alt="SmartExam Logo" className="h-5 sm:h-6 object-contain hidden md:block" />
                    
                    <div className="h-6 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>
                    
                    {/* 🌟 แก้ไขชื่อแบบทดสอบได้ทันทีบน Navbar */}
                    <input
                        type="text"
                        value={examConfig.title}
                        onChange={(e) => setExamConfig({ ...examConfig, title: e.target.value })}
                        className="font-bold bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-500 outline-none w-full max-w-[200px] sm:max-w-md transition-colors text-white"
                        placeholder="ชื่อแบบทดสอบ..."
                    />
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    <button
                        onClick={() => setIsManualOpen(true)}
                        className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-full transition-colors hidden sm:block"
                        title="คู่มือการตั้งค่าข้อสอบ"
                    >
                        <BookOpen size={20} />
                    </button>

                    {isDocumentMode && (
                        <div className="flex items-center gap-2 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-full shadow-inner hidden md:flex">
                            <label className="text-xs text-gray-400">สีตราประทับ:</label>
                            <input
                                type="color" value={examConfig.metadata.stamp_color}
                                onChange={(e) => setExamConfig({ ...examConfig, metadata: { ...examConfig.metadata, stamp_color: e.target.value } })}
                                className="w-6 h-6 rounded cursor-pointer bg-transparent border-none outline-none"
                            />
                        </div>
                    )}
                    <button onClick={handleSaveEdits} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-transform active:scale-95">
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} <span className="hidden sm:inline">บันทึก</span>
                    </button>
                </div>
            </nav>

            {isDocumentMode ? (
                // ==========================================
                // โหมด 1: SPLIT SCREEN (สำหรับ Image/PDF)
                // ==========================================
                <div className="flex-1 flex overflow-hidden">
                    <div className="w-7/12 h-full bg-[#1e293b] border-r border-white/10 flex flex-col relative">
                        <div className="p-3 bg-slate-900 border-b border-white/5 flex justify-between items-center z-10 shadow-md">
                            <div className="text-sm font-bold text-cyan-400 flex items-center gap-2"><ImageIcon size={16} /> เครื่องมือตั้งค่าเอกสาร</div>
                            {!(examConfig.exam_format === 'pdf' || (examConfig.file_url && examConfig.file_url.toLowerCase().includes('.pdf'))) && (
                                <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-white/10">
                                    <button
                                        onClick={() => setInteractionMode('stamp')}
                                        className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${interactionMode === 'stamp' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Target size={16} /> <span>วางเลขข้อ</span>
                                    </button>
                                    <button
                                        onClick={() => setInteractionMode('text')}
                                        className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${interactionMode === 'text' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <MessageSquareText size={16} /> <span>พิมพ์ข้อความ</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#0f172a]">
                            <div className="max-w-2xl mx-auto space-y-10 pb-32">
                                <div className="bg-slate-900 border border-white/10 p-5 rounded-2xl shadow-xl relative group">
                                    <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                                        <AlignLeft size={16} /> คำชี้แจง / รายละเอียดก่อนทำข้อสอบ
                                    </h3>
                                    <textarea
                                        value={examConfig.metadata.instructions || ''}
                                        onChange={(e) => setExamConfig({ ...examConfig, metadata: { ...examConfig.metadata, instructions: e.target.value } })}
                                        placeholder="เช่น ให้นักเรียนเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว..."
                                        className="w-full bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-amber-500/50 min-h-[100px] leading-relaxed resize-y"
                                    />
                                </div>

                                {examConfig.exam_format === 'pdf' || (examConfig.file_url && examConfig.file_url.toLowerCase().includes('.pdf')) ? (
                                    <div className="relative w-full h-[80vh] shadow-2xl rounded-xl overflow-hidden bg-white mt-6 border border-white/20">
                                        <iframe src={`${examConfig.file_url}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full border-none" title="Exam Document" />
                                    </div>
                                ) : (
                                    examConfig.image_urls.map((url, imgIndex) => (
                                        <div key={imgIndex} className="relative group">
                                            <div className="absolute -top-4 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-20">
                                                <button onClick={() => moveImage(imgIndex, 'up')} className="bg-slate-800 p-1.5 rounded-md hover:bg-white/20"><MoveUp size={14} /></button>
                                                <button onClick={() => moveImage(imgIndex, 'down')} className="bg-slate-800 p-1.5 rounded-md hover:bg-white/20"><MoveDown size={14} /></button>
                                                <button onClick={() => removeImage(imgIndex)} className="bg-red-500/90 text-white p-1.5 rounded-md hover:bg-red-500"><X size={14} /></button>
                                            </div>
                                            <div className="text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest text-center">หน้า {imgIndex + 1}</div>

                                            <div
                                                className={`relative w-full shadow-2xl rounded-xl overflow-hidden bg-white select-none ${interactionMode === 'stamp' ? 'cursor-crosshair' : 'cursor-text'}`}
                                                onClick={(e) => handleImageClick(e, imgIndex)}
                                            >
                                                <img src={url} alt={`Page ${imgIndex}`} className="w-full block pointer-events-none" />

                                                {questions.filter(q => q.image_index === imgIndex).map((q) => (
                                                    <div
                                                        key={q.id} onClick={(e) => handleRemoveStamp(e, q.id)}
                                                        className="absolute flex items-center justify-center font-black rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 border-white cursor-pointer hover:scale-125 transition-transform group/stamp"
                                                        style={{ left: `${q.marker_x_percent}%`, top: `${q.marker_y_percent}%`, transform: 'translate(-50%, -50%)', backgroundColor: examConfig.metadata.stamp_color, color: '#ffffff', width: 'clamp(28px, 4vw, 40px)', height: 'clamp(28px, 4vw, 40px)', fontSize: 'clamp(14px, 2vw, 18px)' }}
                                                    >
                                                        {q.question_number}
                                                        <div className="absolute inset-0 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/stamp:opacity-100 transition-opacity"><X size={16} className="text-white" /></div>
                                                    </div>
                                                ))}

                                                {annotations.filter(a => a.image_index === imgIndex).map(anno => (
                                                    <div
                                                        key={anno.id}
                                                        className="absolute p-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] border-2 border-white/20 group/anno min-w-[200px]"
                                                        style={{ left: `${anno.x_percent}%`, top: `${anno.y_percent}%`, backgroundColor: anno.bg_color, color: anno.text_color, transform: 'translate(0, -50%)' }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="annotation-toolbar absolute -top-10 left-0 bg-slate-900 border border-white/10 rounded-lg p-1.5 flex items-center gap-2 opacity-0 group-hover/anno:opacity-100 transition-opacity shadow-xl">
                                                            <input type="color" value={anno.bg_color} onChange={(e) => updateAnnotation(anno.id, 'bg_color', e.target.value)} className="w-5 h-5 rounded cursor-pointer outline-none bg-transparent" />
                                                            <input type="color" value={anno.text_color} onChange={(e) => updateAnnotation(anno.id, 'text_color', e.target.value)} className="w-5 h-5 rounded cursor-pointer outline-none bg-transparent" />
                                                            <div className="w-px h-4 bg-white/20 mx-1"></div>
                                                            <button onClick={() => updateAnnotation(anno.id, 'font_size', Math.max(12, anno.font_size - 2))} className="text-gray-400 hover:text-white font-bold">-A</button>
                                                            <button onClick={() => updateAnnotation(anno.id, 'font_size', Math.min(48, anno.font_size + 2))} className="text-gray-400 hover:text-white font-bold">+A</button>
                                                            <div className="w-px h-4 bg-white/20 mx-1"></div>
                                                            <button onClick={(e) => deleteAnnotation(e, anno.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                                                        </div>
                                                        <textarea
                                                            value={anno.text} onChange={(e) => updateAnnotation(anno.id, 'text', e.target.value)}
                                                            placeholder="พิมพ์ข้อความที่นี่..."
                                                            className="w-full bg-transparent outline-none resize-none font-bold placeholder:text-white/50 leading-tight"
                                                            style={{ fontSize: `${anno.font_size}px`, height: `${Math.max(anno.font_size * 2, anno.text.split('\n').length * (anno.font_size * 1.5) + 10)}px` }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div id="right-panel-scroll" className="w-5/12 h-full bg-[#020617] overflow-y-auto p-4 sm:p-6 pb-32">
                        <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 mb-6 shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2"><Target className="text-amber-500" /> กระดาษคำตอบ ({questions.length} ข้อ)</h3>
                                    <p className="text-xs text-gray-400 mt-1">ตั้งค่าประเภทและรูปแบบตัวเลือก</p>
                                </div>
                                <button onClick={handleAddQuestionManually} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-blue-500/20">
                                    <Plus size={14} /> เพิ่มข้อ
                                </button>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <select value={defaultQType} onChange={(e) => setDefaultQType(e.target.value)} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold outline-none flex-1 min-w-[140px]">
                                    <option value="mcq">สร้างข้อใหม่: ปรนัย</option>
                                    <option value="short_answer">สร้างข้อใหม่: เติมคำตอบ</option>
                                </select>
                                {defaultQType === 'mcq' && (
                                    <>
                                        <select value={mcqFormat} onChange={(e) => setMcqFormat(e.target.value)} className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-cyan-400 font-bold outline-none flex-1 min-w-[160px]">
                                            <option value="TF">2 ตัวเลือก (ถูก/ผิด)</option>
                                            <option value="123">3 ตัวเลือก (1,2,3)</option>
                                            <option value="กขคง">4 ตัวเลือก (ก, ข, ค, ง)</option>
                                            <option value="ABCD">4 ตัวเลือก (A, B, C, D)</option>
                                            <option value="1234">4 ตัวเลือก (1, 2, 3, 4)</option>
                                            <option value="12345">5 ตัวเลือก (1-5)</option>
                                        </select>
                                        <button onClick={applyFormatToAllMCQ} className="bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 px-3 py-2 rounded-lg text-xs font-bold border border-cyan-500/20 w-full sm:w-auto mt-2 sm:mt-0 transition-colors">ใช้กับปรนัยทุกข้อ</button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {questions.map((q, qIdx) => (
                                <div key={q.id} className="flex flex-col gap-3 bg-slate-900 border border-white/5 p-4 rounded-2xl shadow-sm relative group/row hover:border-amber-500/30 transition-colors">
                                    {q.image_index !== undefined && (
                                        <div className="absolute -top-2 -right-2 bg-slate-800 border border-white/10 text-[10px] text-gray-400 px-2 py-0.5 rounded-full font-bold shadow-md">แผ่นที่ {q.image_index + 1}</div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text" value={q.display_label || q.question_number} onChange={(e) => handleUpdateQuestionField(qIdx, 'display_label', e.target.value)}
                                            className="w-14 h-10 rounded-xl text-center font-black text-white text-sm shrink-0 shadow-inner border-2 border-white/20 outline-none focus:border-white focus:scale-105 transition-all"
                                            style={{ backgroundColor: examConfig.metadata.stamp_color }}
                                        />
                                        <div className="flex bg-slate-950 border border-white/10 rounded-xl overflow-hidden flex-1">
                                            <input
                                                type="text" placeholder="ตอนที่..." value={(q as any).part_name || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'part_name', e.target.value)}
                                                className="w-20 sm:w-24 bg-transparent border-r border-white/10 px-2 py-2 text-xs text-cyan-400 font-bold outline-none text-center"
                                            />
                                            <select value={q.question_type || 'mcq'} onChange={(e) => handleTypeChange(qIdx, e.target.value)} className="bg-transparent px-3 py-2 text-xs sm:text-sm text-gray-300 outline-none flex-1 font-bold cursor-pointer">
                                                <option value="mcq" className="bg-slate-900">🔘 ปรนัย</option>
                                                <option value="short_answer" className="bg-slate-900">✍️ เติมคำตอบ</option>
                                            </select>
                                        </div>
                                        <button onClick={() => handleDeleteQuestion(qIdx)} className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                    
                                    {/* 🌟 เพิ่มกล่องอ้างอิงที่มา */}
                                    <div className="pl-0 sm:pl-12 flex-1">
                                        <div className="flex items-center gap-2 bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 w-full mb-3">
                                            <LinkIcon size={12} className="text-gray-500" />
                                            <input
                                                type="text" placeholder="อ้างอิงที่มา (เช่น O-NET ปี 68)..."
                                                value={q.reference_source || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'reference_source', e.target.value)}
                                                className="bg-transparent text-[11px] text-gray-400 outline-none w-full"
                                            />
                                        </div>

                                        {q.question_type === 'short_answer' ? (
                                            <input type="text" placeholder="พิมพ์คำตอบ..." value={q.correct_answer} onChange={(e) => handleUpdateQuestionField(qIdx, 'correct_answer', e.target.value)} className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-base font-bold text-cyan-400 focus:outline-none focus:border-cyan-400" />
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {q.options?.map(opt => (
                                                    <button key={opt.id} onClick={() => handleUpdateQuestionField(qIdx, 'correct_answer', opt.id)} className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all flex-1 min-w-[40px] max-w-[48px] ${q.correct_answer === opt.id ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)] scale-105' : 'border-slate-700 bg-slate-950 text-gray-400 hover:border-gray-500'}`}>{opt.id}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-2 border-t border-white/5 mt-1">
                                        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                            <span className="text-xs text-gray-500 font-bold">คะแนน:</span>
                                            <input type="number" step="0.1" min="0" value={q.score} onChange={(e) => handleUpdateQuestionField(qIdx, 'score', parseFloat(e.target.value) || 0)} className="w-12 bg-transparent text-sm font-black text-amber-400 text-center outline-none" />
                                        </div>
                                    </div>

                                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl mt-2 flex flex-col gap-3 sm:ml-12">
                                        <div className="text-sm font-bold text-amber-400 flex items-center gap-2"><span className="text-lg">💡</span> อธิบายเหตุผล / วิธีทำ</div>
                                        <textarea 
                                            value={q.explanation || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'explanation', e.target.value)}
                                            placeholder="พิมพ์คำอธิบายเหตุผล หรือสูตรที่ใช้..."
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:outline-none focus:border-amber-500 resize-y min-h-[60px]"
                                        />
                                        
                                        {/* 🌟 เพิ่มกล่องรับลิงก์วิดีโอเฉลย YouTube */}
                                        <div className="pt-2 border-t border-white/5">
                                            <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1"><MonitorPlay size={12} className="text-red-400"/> ลิงก์วิดีโอเฉลย (YouTube URL)</label>
                                            <input
                                                type="text" placeholder="https://youtube.com/watch?v=..."
                                                value={q.solution_video_url || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'solution_video_url', e.target.value)}
                                                className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-red-500"
                                            />
                                        </div>

                                        <div className="pt-2 border-t border-white/5">
                                            {q.solution_image_url ? (
                                                <div className="relative inline-block group/solimg">
                                                    <img src={q.solution_image_url} alt="ภาพเฉลย" className="max-h-32 rounded-lg border border-white/20 shadow-md" />
                                                    <button 
                                                        onClick={() => handleUpdateQuestionField(qIdx, 'solution_image_url', null)} 
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/solimg:opacity-100 transition-opacity shadow-lg"
                                                    ><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer inline-flex items-center gap-2 text-[11px] bg-slate-900 border border-dashed border-white/20 px-4 py-2 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors">
                                                    <ImageIcon size={14} /> แนบภาพวิธีทำ / สไลด์เฉลย
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadSolutionImage(qIdx, e)} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                // ==========================================
                // โหมด 2: STANDARD (แบบดั้งเดิมเต็มจอ)
                // ==========================================
                <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 pb-32 bg-[#0f172a]">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
                            <h2 className="text-md font-bold text-amber-400 flex items-center gap-2 border-b border-white/5 pb-3">
                                <FileText size={18} /> ข้อมูลรายละเอียดชุดข้อสอบ (Standard)
                            </h2>
                            {/* สำหรับ Standard โหมด ซ่อนชื่อไว้ที่ Navbar แล้ว แต่คงไว้ตรงนี้เพื่อกรอกรายละเอียดเพิ่มเติม */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="text-xs text-gray-400 mb-1 block">คำชี้แจง / รายละเอียดก่อนทำข้อสอบ</label>
                                    <textarea
                                        value={examConfig.metadata.instructions || ''}
                                        onChange={(e) => setExamConfig({ ...examConfig, metadata: { ...examConfig.metadata, instructions: e.target.value } })}
                                        placeholder="คำอธิบายสำหรับนักเรียน..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 min-h-[80px]"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">สถานะ</label>
                                    <select value={examConfig.status} onChange={(e) => setExamConfig({ ...examConfig, status: e.target.value })} className={`w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-3 focus:outline-none text-sm font-bold ${examConfig.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        <option value="draft">📝 แบบร่าง</option>
                                        <option value="published">🌐 เผยแพร่</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end gap-4">
                                <div><h3 className="text-lg font-black text-white">ข้อสอบ ({questions.length} ข้อ)</h3></div>
                                <button onClick={handleAddQuestionManually} className="text-xs bg-blue-500/10 text-blue-400 px-3 py-2 rounded-xl flex items-center gap-1"><Plus size={14} /> เพิ่มข้อ</button>
                            </div>

                            {questions.map((q, qIdx) => (
                                <div key={q.id} className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-md">
                                    <div className="flex flex-wrap justify-between items-center gap-3 border-b border-white/5 pb-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-gray-500">ข้อที่</span>
                                            <input type="text" value={q.display_label || q.question_number} onChange={(e) => handleUpdateQuestionField(qIdx, 'display_label', e.target.value)} className="w-16 text-center bg-slate-950 border border-white/10 rounded-md py-1 text-sm text-amber-400 font-bold outline-none" placeholder="เช่น 35.1" />
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/5 flex-1 max-w-[280px]">
                                            <select value={q.question_type || 'mcq'} onChange={(e) => handleTypeChange(qIdx, e.target.value)} className="bg-transparent text-xs text-white outline-none flex-1">
                                                <option value="mcq" className="bg-slate-900">ปรนัย</option>
                                                <option value="short_answer" className="bg-slate-900">เติมคำตอบ</option>
                                            </select>
                                            <div className="w-px h-4 bg-white/10"></div>
                                            <div className="flex items-center gap-1 px-1">
                                                <span className="text-[10px] text-gray-500">Score:</span>
                                                <input type="number" step="0.1" min="0" value={q.score} onChange={(e) => handleUpdateQuestionField(qIdx, 'score', parseFloat(e.target.value) || 0)} className="w-10 bg-transparent text-xs font-bold text-amber-400 text-center outline-none" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {q.question_type !== 'short_answer' && (
                                                <button onClick={() => handleGenerateParallelItem(qIdx)} disabled={generatingIndex === qIdx} className="text-xs bg-blue-500/10 text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/20 disabled:opacity-50"><CopyPlus size={16} /></button>
                                            )}
                                            <button onClick={() => handleDeleteQuestion(qIdx)} className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        
                                        {/* 🌟 กล่องระบุที่มา */}
                                        <div className="flex items-center gap-2 bg-slate-950 border border-white/5 rounded-lg px-3 py-1.5 w-full md:w-1/2">
                                            <LinkIcon size={12} className="text-gray-500" />
                                            <input
                                                type="text" placeholder="อ้างอิงที่มาข้อสอบ (เช่น O-NET ปี 68)..."
                                                value={q.reference_source || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'reference_source', e.target.value)}
                                                className="bg-transparent text-[11px] text-gray-400 outline-none w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block"><Type size={12} className="inline" /> โจทย์คำถาม</label>
                                            <textarea value={q.question_text || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'question_text', e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-amber-500/50 min-h-[60px]" />
                                        </div>

                                        <div className="mt-3 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
                                            <label className="block text-xs font-bold text-slate-400 mb-3 flex items-center gap-2"><ImageIcon size={14} className="text-cyan-400" /> ภาพประกอบโจทย์ (ถ้ามี)</label>
                                            {q.image_url ? (
                                                <div className="relative inline-block group">
                                                    <img src={q.image_url} alt="ภาพประกอบโจทย์" className="max-h-48 rounded-lg border border-slate-700 object-contain bg-white" />
                                                    <button type="button" onClick={() => handleRemoveQuestionImage(qIdx)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"><Trash2 size={12} /></button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-sm font-medium rounded-lg border border-slate-700 transition-colors text-slate-300">
                                                        <Upload size={16} className="text-cyan-500" /> อัปโหลดภาพประกอบ
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadQuestionImage(e, qIdx)} />
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {q.question_type === 'short_answer' ? (
                                            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mt-2">
                                                <label className="text-xs text-cyan-400 font-bold mb-2 block">เฉลยที่ถูกต้อง</label>
                                                <input type="text" value={q.correct_answer} onChange={(e) => handleUpdateQuestionField(qIdx, 'correct_answer', e.target.value)} className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-4 py-3 text-white font-black focus:outline-none" />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                                {q.options?.map((opt) => {
                                                    const isCorrect = q.correct_answer === opt.id;
                                                    return (
                                                        <div key={opt.id} className={`p-2 rounded-xl border flex items-center gap-2 ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-950 border-white/5'}`}>
                                                            <button onClick={() => handleUpdateQuestionField(qIdx, 'correct_answer', opt.id)} className={`w-6 h-6 rounded-full shrink-0 flex justify-center items-center text-xs font-bold border ${isCorrect ? 'bg-emerald-500 text-black border-emerald-500' : 'border-gray-600 text-gray-400'}`}>{isCorrect ? '✓' : opt.id}</button>
                                                            <input type="text" value={opt.text} onChange={(e) => handleUpdateOptionText(qIdx, opt.id, e.target.value)} className="bg-transparent text-sm w-full outline-none text-white px-1" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl mt-3 flex flex-col gap-3">
                                            <div className="text-sm font-bold text-amber-400 flex items-center gap-2"><span className="text-lg">💡</span> อธิบายเหตุผล / วิธีทำ (เฉลยข้อต่อข้อ)</div>
                                            <textarea 
                                                value={q.explanation || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'explanation', e.target.value)}
                                                placeholder="พิมพ์คำอธิบายเหตุผล หรือสูตรที่ใช้..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:outline-none focus:border-amber-500 resize-y min-h-[60px]"
                                            />
                                            
                                            {/* 🌟 กล่องรับลิงก์วิดีโอเฉลย YouTube */}
                                            <div className="pt-2 border-t border-white/5">
                                                <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1"><MonitorPlay size={12} className="text-red-400"/> ลิงก์วิดีโอเฉลย (YouTube URL)</label>
                                                <input
                                                    type="text" placeholder="https://youtube.com/watch?v=..."
                                                    value={q.solution_video_url || ''} onChange={(e) => handleUpdateQuestionField(qIdx, 'solution_video_url', e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-red-500"
                                                />
                                            </div>

                                            <div className="pt-2 border-t border-white/5">
                                                {q.solution_image_url ? (
                                                    <div className="relative inline-block group/solimg">
                                                        <img src={q.solution_image_url} alt="ภาพเฉลย" className="max-h-40 rounded-lg border border-white/20 shadow-md" />
                                                        <button 
                                                            onClick={() => handleUpdateQuestionField(qIdx, 'solution_image_url', null)} 
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover/solimg:opacity-100 transition-opacity shadow-lg"
                                                        ><X size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <label className="cursor-pointer inline-flex items-center gap-2 text-xs bg-slate-900 border border-dashed border-white/20 px-4 py-2 rounded-lg text-gray-400 hover:text-amber-400 hover:border-amber-500/50 transition-colors">
                                                        <ImageIcon size={16} /> แนบรูปถ่ายวิธีทำ / สไลด์เฉลย
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadSolutionImage(qIdx, e)} />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            )}

            {isManualOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" onClick={() => setIsManualOpen(false)}></div>
            )}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-[#0f172a] border-l border-white/10 shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950">
                    <h2 className="text-base font-black text-white flex items-center gap-2"><BookOpen className="text-amber-500" size={18} /> คู่มือการตั้งค่าข้อสอบ</h2>
                    <button onClick={() => setIsManualOpen(false)} className="p-1.5 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {/* ข้อมูลคู่มือคงเดิม... */}
                </div>
                <div className="p-3 border-t border-white/10 bg-slate-950 flex justify-center items-center gap-2">
                    <img src="/niivaasmartevent_logo.png" className="h-3 opacity-50" />
                    <p className="text-[9px] text-gray-500 font-bold">SmartExam Setup</p>
                </div>
            </div>
        </div>
    );
}