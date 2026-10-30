"use client";

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft, UploadCloud, Image as ImageIcon, BrainCircuit,
    Settings, CheckCircle2, ChevronRight, FileText, Type,
    ToggleLeft, ToggleRight, Sparkles, Save, Send, Loader2, LayoutPanelLeft,
    List, Columns, Shuffle, GraduationCap, BookOpen
} from 'lucide-react';

interface Option {
    id: string;
    text: string;
}

interface Question {
    id: number | string;
    type?: string;
    score: number;
    text: string;
    options?: Option[];
    left_items?: Option[];
    right_items?: Option[];
    correct_pairs?: Record<string, string>;
    correct?: string;
    explanation: string;
    image_url?: string;
}

// 🌟 1. นำเข้า Master Data
const BASIC_SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 'ศิลปศึกษา', 'การงานอาชีพ'];
const VOCATIONAL_SUBJECTS = ['หมวดวิชาสมรรถนะแกนกลาง', 'หมวดวิชาสมรรถนะวิชาชีพ'];

const EXAM_CATEGORIES = [
    {
        id: 'primary',
        label: 'ระดับประถมศึกษา',
        grades: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'],
        subjects: BASIC_SUBJECTS
    },
    {
        id: 'junior_high',
        label: 'ระดับมัธยมศึกษาตอนต้น',
        grades: ['ม.1', 'ม.2', 'ม.3'],
        subjects: BASIC_SUBJECTS
    },
    {
        id: 'senior_high',
        label: 'ระดับมัธยมศึกษาตอนปลาย',
        grades: ['ม.4', 'ม.5', 'ม.6'],
        subjects: [...BASIC_SUBJECTS, 'ฟิสิกส์', 'เคมี', 'ชีววิทยา', 'วิทยาศาสตร์โลกและอวกาศ', 'ภาษาญี่ปุ่น', 'ภาษาจีน']
    },
    {
        id: 'vocational',
        label: 'ระดับอาชีวศึกษา',
        grades: ['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2'],
        subjects: VOCATIONAL_SUBJECTS
    },
    {
        id: 'entrance',
        label: 'สอบเข้า ม.1 และ ม.4',
        grades: [],
        subjects: ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'ภาษาไทย', 'สังคมศึกษา']
    },
    {
        id: 'institution',
        label: 'สอบเข้าสถาบัน',
        grades: [],
        subjects: ['โรงเรียนพลตำรวจ', 'โรงเรียนเตรียมทหาร', 'โรงเรียนนายร้อยตำรวจ', 'โรงเรียนนายสิบทหารบก']
    },
    {
        id: 'government',
        label: 'ก.พ. และ ข้าราชการ',
        grades: [],
        subjects: ['ข้อสอบ ก.พ.', 'ข้อสอบบรรจุครู', 'ข้อสอบบรรจุข้าราชการท้องถิ่น']
    }
];

export default function CreateExamPage() {
    const router = useRouter();
    const supabase = createClient(); // 🌟 เพิ่มบรรทัดนี้
    const [currentStep, setCurrentStep] = useState(1);
    const [sourceType, setSourceType] = useState<string | null>(null);
    const [sourceText, setSourceText] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [config, setConfig] = useState({
        title: '',
        category: 'junior_high',
        grade_level: 'ม.1',
        subject: 'วิทยาศาสตร์',
        difficulty: 'ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)',
        mcqCount: 5,
        questionType: 'mcq',
        customScoring: false
    });

    const [isParallelMode, setIsParallelMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'A' | 'B'>('A');

    const [questions, setQuestions] = useState<Question[]>([]);
    const [questionsSetA, setQuestionsSetA] = useState<Question[]>([]);
    const [questionsSetB, setQuestionsSetB] = useState<Question[]>([]);

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCatId = e.target.value;
        const selectedCat = EXAM_CATEGORIES.find(c => c.id === newCatId);
        const newSubjects = selectedCat?.subjects || [];
        const newGrades = selectedCat?.grades || [];
        setConfig({
            ...config,
            category: newCatId,
            subject: newSubjects[0] || '',
            grade_level: newGrades[0] || ''
        });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) return alert("กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ (JPG, PNG, WebP) เท่านั้นครับ");
            if (file.size > 5 * 1024 * 1024) return alert("ขนาดรูปภาพใหญ่เกินไป กรุณาใช้รูปภาพขนาดไม่เกิน 5 MB ครับ");
            setImageFile(file);
        }
    };

    // 🌟 ฟังก์ชันตัวช่วย แปลงไฟล์รูปภาพเป็น Base64 เพื่อส่งข้าม API แบบ JSON
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    const handleGenerateExam = async () => {
        if (sourceType === 'image' && !imageFile) return alert("กรุณาอัปโหลดรูปภาพข้อสอบก่อนครับ");
        if ((sourceType === 'document' || sourceType === 'scratch') && !sourceText.trim()) return alert("กรุณาระบุเนื้อหาหรือหัวข้อก่อนครับ");
        if (!config.title.trim()) return alert("กรุณาตั้งชื่อชุดข้อสอบด้วยครับ");

        const categoryLabel = EXAM_CATEGORIES.find(c => c.id === config.category)?.label || '';
        const exactLevel = config.grade_level ? `${categoryLabel} (${config.grade_level})` : categoryLabel;

        setIsGenerating(true);
        try {
            // 🌟 ทำการแปลงภาพเป็น Base64 ก่อนยิง API
            let imageBase64Data = null;
            if (sourceType === 'image' && imageFile) {
                imageBase64Data = await fileToBase64(imageFile);
            }

            const payload = {
                sourceType: sourceType,
                sourceText: sourceText,
                hasImage: !!imageFile,
                imageBase64: imageBase64Data, // 🌟 ส่งข้อมูลภาพแบบ Base64 ไปยัง Backend แล้ว!
                level: exactLevel,
                subject: config.subject,
                difficulty: config.difficulty,
                mcqCount: config.mcqCount,
                generateParallelSets: isParallelMode,
                questionType: config.questionType
            };

            const res = await fetch('/api/generate-exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (result.success && result.data) {
                if (isParallelMode) {
                    setQuestionsSetA(result.data.set_a || []);
                    setQuestionsSetB(result.data.set_b || []);
                } else {
                    setQuestions(result.data.questions || []);
                }
                setCurrentStep(3);
            } else {
                alert("เกิดข้อผิดพลาดจาก AI: " + (result.error || "รูปแบบข้อมูลไม่ถูกต้อง"));
            }
        } catch (error) {
            alert("ไม่สามารถเชื่อมต่อกับ AI ได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUploadQuestionImage = async (questionId: number | string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) return alert("รับเฉพาะไฟล์รูปภาพ JPG, PNG, WebP ครับ");
        if (file.size > 5 * 1024 * 1024) return alert("ขนาดรูปภาพต้องไม่เกิน 5 MB ครับ");

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `question-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('exam-assets').upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('exam-assets').getPublicUrl(fileName);

            const updateFn = (prev: Question[]) => prev.map(q => q.id === questionId ? { ...q, image_url: publicUrlData.publicUrl } : q);
            if (isParallelMode) {
                if (activeTab === 'A') setQuestionsSetA(updateFn);
                else setQuestionsSetB(updateFn);
            } else {
                setQuestions(updateFn);
            }
            alert("อัปโหลดรูปภาพประกอบโจทย์สำเร็จ!");
        } catch (error: any) {
            alert("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: " + error.message);
        }
    };

    const handleSaveExam = async (status: 'draft' | 'published') => {
        const currentData = isParallelMode ? (questionsSetA.length > 0 ? questionsSetA : []) : questions;
        if (currentData.length === 0) return alert("ไม่พบข้อสอบสำหรับบันทึก");

        setIsSaving(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                alert("กรุณาเข้าสู่ระบบก่อนทำการบันทึกข้อสอบครับ");
                setIsSaving(false);
                return;
            }

            const baseTopic = sourceType === 'scratch' ? sourceText : (sourceType === 'image' ? 'สแกนจากรูปภาพ' : 'สร้างจากเนื้อหา');

            const categoryLabel = EXAM_CATEGORIES.find(c => c.id === config.category)?.label || 'ทั่วไป';
            const subjectLabel = config.subject || 'ทั่วไป';
            const educationLevelToSave = config.grade_level || categoryLabel;

            // 🌟 จุดที่มีการแก้ไข เพิ่ม `creator_id: user.id` ไปด้วยเพื่อป้องกัน RLS error
            const formatQuestionForDB = (q: Question, examId: string, index: number) => {
                let optionsToSave = q.options || [];
                let correctAnswerToSave = q.correct || '';

                if (q.type === 'matching') {
                    optionsToSave = [
                        { id: 'left', items: q.left_items },
                        { id: 'right', items: q.right_items }
                    ] as any;
                    correctAnswerToSave = JSON.stringify(q.correct_pairs);
                }

                return {
                    exam_id: examId,
                    creator_id: user.id, // 🌟 ปรับปรุงตรงนี้: ส่ง ID ผู้ใช้แนบไปกับคำถาม
                    question_number: index + 1,
                    question_type: q.type || 'mcq',
                    question_text: q.text,
                    options: optionsToSave,
                    correct_answer: correctAnswerToSave,
                    // 🌟 ใช้คอลัมน์ใหม่สำหรับการอธิบายเฉลย
                    solution_text: q.explanation,
                    score: Number(q.score) || (q.type === 'matching' ? 5 : 1.0),
                    image_url: q.image_url,

                    // 🌟 ระบุว่าเป็นข้อสอบต้นฉบับในคลัง (และถูกจัดเข้าชุดแล้ว)
                    is_bank_item: true,
                    education_level: config.grade_level, // ใช้ค่าจาก config ที่ผู้ใช้กรอก
                    subject_category: config.subject, // ใช้ค่าจาก config ที่ผู้ใช้กรอก
                    //tags: JSON.stringify([config.difficulty, config.questionType, baseTopic])
                    // 🌟 แก้ไขบรรทัดนี้: ส่งเป็น Array ตรงๆ ไม่ต้องครอบ JSON.stringify
                    tags: [config.difficulty, config.questionType, baseTopic]
                };
            };

            if (isParallelMode) {
                const { data: examA, error: errA } = await supabase.from('exams').insert([{
                    creator_id: user.id, title: `${config.title.trim() || "แบบทดสอบไม่มีชื่อ"} (ชุด A)`,
                    education_level: educationLevelToSave, subject_category: subjectLabel,
                    topic: baseTopic, difficulty_level: config.difficulty, status: status,
                    total_score: questionsSetA.reduce((sum, q) => sum + (Number(q.score) || (q.type === 'matching' ? 5 : 1)), 0)
                }]).select().single();
                if (errA) throw errA;

                const formattedSetA = questionsSetA.map((q, idx) => formatQuestionForDB(q, examA.id, idx));
                const { error: errorA } = await supabase.from('exam_questions').insert(formattedSetA);
                if (errorA) {
                    console.error("Error inserting Set A:", errorA);
                    throw new Error("บันทึกคำถามชุด A ไม่สำเร็จ: " + errorA.message);
                }

                const { data: examB, error: errB } = await supabase.from('exams').insert([{
                    creator_id: user.id, title: `${config.title.trim() || "แบบทดสอบไม่มีชื่อ"} (ชุด B)`,
                    education_level: educationLevelToSave, subject_category: subjectLabel,
                    topic: baseTopic, difficulty_level: config.difficulty, status: status,
                    total_score: questionsSetB.reduce((sum, q) => sum + (Number(q.score) || (q.type === 'matching' ? 5 : 1)), 0)
                }]).select().single();
                if (errB) throw errB;

                const formattedSetB = questionsSetB.map((q, idx) => formatQuestionForDB(q, examB.id, idx));
                const { error: errorB } = await supabase.from('exam_questions').insert(formattedSetB);
                if (errorB) {
                    console.error("Error inserting Set B:", errorB);
                    throw new Error("บันทึกคำถามชุด B ไม่สำเร็จ: " + errorB.message);
                }

                alert(status === 'published' ? `เผยแพร่แบบทดสอบคู่ขนาน (2 ชุด) เรียบร้อย!` : `บันทึกแบบร่าง (2 ชุด) ลงคลังเรียบร้อยแล้วครับ`);
            } else {
                const { data: examData, error: examError } = await supabase.from('exams').insert([{
                    creator_id: user.id, title: config.title.trim() || "แบบทดสอบไม่มีชื่อ",
                    education_level: educationLevelToSave, subject_category: subjectLabel,
                    topic: baseTopic, difficulty_level: config.difficulty, status: status,
                    total_score: questions.reduce((sum, q) => sum + (Number(q.score) || (q.type === 'matching' ? 5 : 1)), 0)
                }]).select().single();
                if (examError) throw examError;

                const formattedQuestions = questions.map((q, idx) => formatQuestionForDB(q, examData.id, idx));
                const { error: questionsError } = await supabase.from('exam_questions').insert(formattedQuestions);
                if (questionsError) {
                    console.error("Error inserting questions:", questionsError);
                    throw new Error("บันทึกคำถามไม่สำเร็จ: " + questionsError.message);
                }

                alert(status === 'published' ? `เผยแพร่แบบทดสอบเรียบร้อย!` : `บันทึกแบบร่างลงคลังเรียบร้อยแล้วครับ`);
            }

            router.push('/smartexam');

        } catch (error: any) {
            console.error("Save Error:", error);
            alert("บันทึกไม่สำเร็จ: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const currentQuestionsToRender = isParallelMode ? (activeTab === 'A' ? questionsSetA : questionsSetB) : questions;
    const totalQuestionsCount = currentQuestionsToRender.length;
    const totalScoreSum = currentQuestionsToRender.reduce((sum, q) => sum + (Number(q.score) || (q.type === 'matching' ? 5 : 1)), 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white select-none pb-24">

            <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => currentStep === 1 ? router.push('/smartexam') : setCurrentStep(currentStep - 1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-lg font-bold hidden sm:block">สร้างแบบทดสอบใหม่</h1>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-sm font-medium">
                        <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-amber-400' : 'text-gray-500'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep >= 1 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-white/5'}`}>1</div><span>เลือกแหล่งที่มา</span></div>
                        <div className="w-6 h-[1px] bg-white/10 mx-1"></div>
                        <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-amber-400' : 'text-gray-500'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep >= 2 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-white/5'}`}>2</div><span>ตั้งค่าข้อสอบ</span></div>
                        <div className="w-6 h-[1px] bg-white/10 mx-1"></div>
                        <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-amber-400' : 'text-gray-500'}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentStep >= 3 ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-white/5'}`}>3</div><span>ตรวจสอบ</span></div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block text-right">
                            <h1 className="text-sm font-black tracking-tight text-white leading-none">SmartExam</h1>
                            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest mt-0.5">by NIIVAA</p>
                        </div>
                        <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
                        <img src="/niivaalogo.png" alt="NIIVAA Logo" className="h-7 object-contain" />
                    </div>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 mt-8">

                {/* 🟢 STEP 1: เลือกแหล่งที่มา */}
                {currentStep === 1 && (
                    <div className="space-y-8 animate-in fade-in duration-300">
                        <div className="text-center space-y-2">
                            <h2 className="text-3xl font-black">AI ควรดึงข้อมูลจากไหน?</h2>
                            <p className="text-gray-400">เลือกแหล่งที่มาของเนื้อหา เพื่อให้ AI สร้างหรือสกัดข้อสอบได้อย่างแม่นยำ</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div onClick={() => setSourceType('document')} className={`p-8 border rounded-3xl cursor-pointer group transition-all text-center space-y-4 ${sourceType === 'document' ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]' : 'bg-white/5 border-white/10 hover:border-amber-500/50'}`}>
                                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-transform ${sourceType === 'document' ? 'bg-amber-500 text-black' : 'bg-amber-500/10 text-amber-400 group-hover:scale-110'}`}><FileText size={32} /></div>
                                <div><h3 className="text-xl font-bold">สร้างจากเนื้อหา</h3><p className="text-sm text-gray-400 mt-2">วางข้อความ หรือ สไลด์สอน</p></div>
                            </div>
                            <div onClick={() => setSourceType('image')} className={`p-8 border rounded-3xl cursor-pointer group transition-all text-center space-y-4 relative overflow-hidden ${sourceType === 'image' ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10 hover:border-blue-500/50'}`}>
                                <div className="absolute top-3 right-3 px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-lg flex items-center gap-1"><Sparkles size={10} /> แนะนำ</div>
                                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-transform ${sourceType === 'image' ? 'bg-blue-500 text-black' : 'bg-blue-500/10 text-blue-400 group-hover:scale-110'}`}><ImageIcon size={32} /></div>
                                <div><h3 className="text-xl font-bold">สแกนจากรูปภาพ</h3><p className="text-sm text-gray-400 mt-2">ถ่ายรูปข้อสอบเก่าจากหนังสือ</p></div>
                            </div>
                            <div onClick={() => setSourceType('scratch')} className={`p-8 border rounded-3xl cursor-pointer group transition-all text-center space-y-4 ${sourceType === 'scratch' ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/10 hover:border-purple-500/50'}`}>
                                <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-transform ${sourceType === 'scratch' ? 'bg-purple-500 text-black' : 'bg-purple-500/10 text-purple-400 group-hover:scale-110'}`}><BrainCircuit size={32} /></div>
                                <div><h3 className="text-xl font-bold">สร้างจากหัวข้อ</h3><p className="text-sm text-gray-400 mt-2">พิมพ์ชื่อเรื่องให้ AI คิดให้</p></div>
                            </div>
                        </div>

                        {sourceType && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 mt-8">
                                {sourceType === 'document' && (
                                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                                        <label className="font-bold text-amber-400 flex items-center gap-2"><Type size={18} /> วางเนื้อหาที่นี่</label>
                                        <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="วางเนื้อหาที่คุณต้องการให้ AI นำไปออกข้อสอบ..." className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-amber-500/50 min-h-[200px] resize-y"></textarea>
                                    </div>
                                )}
                                {sourceType === 'image' && (
                                    <div className="border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 bg-blue-500/5 rounded-3xl p-12 text-center transition-colors relative flex flex-col items-center justify-center gap-4">
                                        <input type="file" accept="image/jpeg, image/png, image/webp" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className="p-4 bg-blue-500/20 rounded-full text-blue-400"><UploadCloud size={32} /></div>
                                        <div>
                                            <p className="font-bold text-lg text-white">{imageFile ? imageFile.name : 'คลิกหรือลากรูปภาพข้อสอบมาวางที่นี่'}</p>
                                            <p className="text-sm text-gray-400 mt-1">AI จะดึงข้อความและหาคำตอบที่ถูกทำเครื่องหมายไว้ให้ (รองรับ JPG, PNG)</p>
                                        </div>
                                    </div>
                                )}
                                {sourceType === 'scratch' && (
                                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 text-center max-w-xl mx-auto">
                                        <label className="font-bold text-purple-400 text-lg">ระบุหัวข้อที่ต้องการ</label>
                                        <input type="text" value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="เช่น ประวัติศาสตร์อยุธยาตอนต้น..." className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-purple-500 text-center text-lg" />
                                    </div>
                                )}
                                <div className="flex justify-center mt-8">
                                    <button onClick={() => setCurrentStep(2)} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl flex items-center gap-2 border border-white/10">
                                        ไปที่การตั้งค่าข้อสอบ <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 🟢 STEP 2: ตั้งค่าพารามิเตอร์ */}
                {currentStep === 2 && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                        <div className="text-center space-y-2"><h2 className="text-3xl font-black">ตั้งค่าโครงสร้างข้อสอบ</h2></div>
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-6">

                            <div>
                                <label className="text-sm text-gray-400 mb-1 block">ชื่อแบบทดสอบ / บทเรียน</label>
                                <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} placeholder="เช่น แบบทดสอบกลางภาค วิชาวิทยาศาสตร์..." className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500" />
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block font-bold text-white">รูปแบบข้อสอบ (Question Type)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${config.questionType === 'mcq' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                                        <input type="radio" name="qType" value="mcq" checked={config.questionType === 'mcq'} onChange={(e) => setConfig({ ...config, questionType: e.target.value })} className="mt-1 accent-amber-500" />
                                        <div><div className="font-bold text-sm text-white flex items-center gap-1.5"><List size={14} className="text-amber-400" /> ปรนัย 4 ตัวเลือก</div><div className="text-xs text-gray-500 mt-0.5">รูปแบบมาตรฐาน ก ข ค ง</div></div>
                                    </label>
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${config.questionType === 'tf' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                                        <input type="radio" name="qType" value="tf" checked={config.questionType === 'tf'} onChange={(e) => setConfig({ ...config, questionType: e.target.value })} className="mt-1 accent-amber-500" />
                                        <div><div className="font-bold text-sm text-white flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-400" /> ถูก-ผิด (True/False)</div><div className="text-xs text-gray-500 mt-0.5">วิเคราะห์ว่าประโยคถูกต้องหรือไม่</div></div>
                                    </label>
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${config.questionType === 'matching' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                                        <input type="radio" name="qType" value="matching" checked={config.questionType === 'matching'} onChange={(e) => setConfig({ ...config, questionType: e.target.value })} className="mt-1 accent-amber-500" />
                                        <div><div className="font-bold text-sm text-white flex items-center gap-1.5"><Columns size={14} className="text-blue-400" /> จับคู่ (Matching)</div><div className="text-xs text-gray-500 mt-0.5">จับคู่ความสัมพันธ์ ซ้าย-ขวา</div></div>
                                    </label>
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${config.questionType === 'mixed' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                                        <input type="radio" name="qType" value="mixed" checked={config.questionType === 'mixed'} onChange={(e) => setConfig({ ...config, questionType: e.target.value })} className="mt-1 accent-amber-500" />
                                        <div>
                                            <div className="font-bold text-sm text-white flex items-center gap-1.5"><Shuffle size={14} className="text-purple-400" /> ผสมผสาน (Mixed) <span className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full uppercase ml-1">Pro</span></div>
                                            <div className="text-xs text-gray-500 mt-0.5">AI สุ่มคละทุกรูปแบบในชุดเดียว</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">

                                {/* 🎓 1. ระดับชั้น (Hybrid Mode) */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 flex items-center gap-1"><GraduationCap size={14} /> ระดับชั้น</label>
                                    <div className="space-y-2">
                                        {(() => {
                                            // รวบรวมระดับชั้นทั้งหมดโดยไม่ซ้ำกัน
                                            const allGrades = Array.from(new Set(EXAM_CATEGORIES.flatMap(c => c.grades)));

                                            return (
                                                <>
                                                    <div className="relative">
                                                        <select
                                                            value={allGrades.includes(config.grade_level) ? config.grade_level : 'custom'}
                                                            onChange={(e) => {
                                                                if (e.target.value !== 'custom') setConfig({ ...config, grade_level: e.target.value });
                                                                else setConfig({ ...config, grade_level: '' });
                                                            }}
                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer hover:border-amber-500/50 transition-colors"
                                                        >
                                                            {allGrades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                                                            <option value="custom" className="bg-slate-800 font-bold text-amber-400">➕ พิมพ์ระบุระดับชั้นเอง...</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                                    </div>

                                                    {/* กล่องพิมพ์ระดับชั้นเอง */}
                                                    {!allGrades.includes(config.grade_level) && (
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={config.grade_level}
                                                            onChange={(e) => setConfig({ ...config, grade_level: e.target.value })}
                                                            placeholder="พิมพ์ระดับชั้นที่ต้องการ..."
                                                            className="w-full bg-black/50 border border-amber-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-amber-400 animate-in fade-in slide-in-from-top-1 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                                                        />
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* 📚 2. กลุ่มวิชา / รายวิชา (Hybrid Mode) */}
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 flex items-center gap-1"><BookOpen size={14} /> กลุ่มวิชา / รายวิชา</label>
                                    <div className="space-y-2">
                                        {(() => {
                                            // รวบรวมวิชาทั้งหมดโดยไม่ซ้ำกัน
                                            const allSubjects = Array.from(new Set(EXAM_CATEGORIES.flatMap(c => c.subjects)));

                                            return (
                                                <>
                                                    <div className="relative">
                                                        <select
                                                            value={allSubjects.includes(config.subject) ? config.subject : 'custom'}
                                                            onChange={(e) => {
                                                                if (e.target.value !== 'custom') setConfig({ ...config, subject: e.target.value });
                                                                else setConfig({ ...config, subject: '' });
                                                            }}
                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer hover:border-cyan-500/50 transition-colors"
                                                        >
                                                            {allSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                                            <option value="custom" className="bg-slate-800 font-bold text-cyan-400">➕ พิมพ์ระบุวิชาเอง...</option>
                                                        </select>
                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                                    </div>

                                                    {/* กล่องพิมพ์วิชาเอง */}
                                                    {!allSubjects.includes(config.subject) && (
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            value={config.subject}
                                                            onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                                                            placeholder="พิมพ์ชื่อวิชาที่ต้องการ..."
                                                            className="w-full bg-black/50 border border-cyan-500/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 animate-in fade-in slide-in-from-top-1 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                                                        />
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">ระดับความยาก</label>
                                    <div className="relative">
                                        <select value={config.difficulty} onChange={(e) => setConfig({ ...config, difficulty: e.target.value })} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 appearance-none cursor-pointer">
                                            <option value="ง่าย (เน้นความจำ)">ง่าย (เน้นความจำ)</option>
                                            <option value="ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)">ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)</option>
                                            <option value="ยาก (เน้นวิเคราะห์/ประเมินค่า)">ยาก (เน้นวิเคราะห์/ประเมินค่า)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                    </div>
                                </div>

                                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div>
                                        <span className="font-bold text-sm block">จำนวนข้อสอบที่ต้องการ</span>
                                        {config.mcqCount > 10 && <span className="text-[9px] text-amber-500/70 block mt-0.5">* เกิน 10 ข้อ ปิดโหมด A/B</span>}
                                    </div>
                                    <input type="number" min="1" max="50" value={config.mcqCount} onChange={(e) => {
                                        const count = parseInt(e.target.value) || 5;
                                        setConfig({ ...config, mcqCount: count });
                                        if (count > 10) setIsParallelMode(false);
                                    }} className="w-14 bg-black border border-white/10 rounded-lg p-1.5 text-center font-bold text-amber-400 focus:outline-none" />
                                </div>
                            </div>

                            <div className={`mt-2 p-5 rounded-2xl border transition-all ${config.mcqCount <= 10 ? (isParallelMode ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950 border-white/10') : 'opacity-50 grayscale pointer-events-none bg-slate-950 border-white/5'}`}>
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center mt-1">
                                        <input type="checkbox" checked={isParallelMode} onChange={(e) => setIsParallelMode(e.target.checked)} disabled={config.mcqCount > 10} className="peer appearance-none w-5 h-5 border-2 border-gray-500 rounded flex-shrink-0 checked:bg-amber-500 checked:border-amber-500 transition-all cursor-pointer" />
                                        <CheckCircle2 size={14} className="absolute text-black opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold transition-colors ${isParallelMode ? 'text-amber-400' : 'text-gray-300 group-hover:text-white'}`}>สร้างชุดข้อสอบคู่ขนาน (ชุด A / ชุด B)</span>
                                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 uppercase tracking-wider"><Sparkles size={10} /> Pro</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                            AI จะสร้างข้อสอบ 2 ชุด ที่วัดจุดประสงค์และความยากเท่ากันแบบ "ข้อต่อข้อ" <br className="hidden sm:block" />
                                            <strong className="text-emerald-400">เหมาะสำหรับสลับแจกนักเรียนป้องกันการลอก</strong>
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <button onClick={handleGenerateExam} disabled={isGenerating} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95">
                            {isGenerating ? <><Loader2 className="animate-spin" /> กำลังประมวลผลข้อสอบ...</> : <><Sparkles /> ให้ AI เริ่มสร้างข้อสอบ {isParallelMode && "(ชุด A / B)"}</>}
                        </button>
                    </div>
                )}

                {/* 🟢 STEP 3: ตรวจสอบและบันทึก */}
                {currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-black text-amber-400">{config.title || "แบบทดสอบอัจฉริยะ"}</h2>
                                <p className="text-sm text-gray-400">ตรวจสอบความถูกต้องก่อนบันทึกลงคลังระบบ</p>
                            </div>
                            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-sm">
                                รวมผลจริง: <span className="font-bold text-amber-400">{totalQuestionsCount} ข้อ ({totalScoreSum} คะแนน)</span>
                            </div>
                        </div>

                        {isParallelMode && (
                            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 mb-6">
                                <button onClick={() => setActiveTab('A')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'A' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><LayoutPanelLeft size={18} /> ข้อสอบชุด A (ต้นแบบ)</button>
                                <button onClick={() => setActiveTab('B')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'B' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Sparkles size={18} /> ข้อสอบชุด B (คู่ขนาน)</button>
                            </div>
                        )}

                        {/* แสดงรายการข้อสอบ */}
                        {currentQuestionsToRender.map((q, idx) => (
                            <div key={q.id} className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 space-y-4 shadow-md hover:border-white/20 transition-all">

                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${isParallelMode && activeTab === 'B' ? 'bg-blue-500/20 text-blue-500' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-0.5">
                                                {q.type === 'matching' ? 'จับคู่ (Matching)' : q.type === 'tf' ? 'ถูก-ผิด (True/False)' : 'ปรนัย (MCQ)'}
                                            </div>
                                            {isParallelMode && <span className="text-xs font-normal opacity-50 ml-1">(ชุด {activeTab})</span>}
                                        </div>
                                    </div>
                                    {sourceType === 'image' && <div className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md border border-blue-500/30">ดึงจากภาพ</div>}
                                </div>

                                <textarea
                                    value={q.text}
                                    onChange={(e) => {
                                        const updateFn = (prev: Question[]) => prev.map(item => item.id === q.id ? { ...item, text: e.target.value } : item);
                                        isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                    }}
                                    className="w-full bg-slate-950/50 border border-white/5 hover:border-white/20 rounded-xl p-3 text-white text-lg font-medium focus:outline-none focus:border-amber-500/50 resize-y min-h-[60px]"
                                />

                                <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col items-start gap-4">
                                    {q.image_url ? (
                                        <div className="relative group">
                                            <img src={q.image_url} alt="ภาพประกอบ" className="max-h-48 rounded-lg object-contain border border-white/10" />
                                            <button onClick={() => {
                                                const updateFn = (prev: Question[]) => prev.map(item => item.id === q.id ? { ...item, image_url: undefined } : item);
                                                isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                            }} className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">ลบรูป</button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                            <ImageIcon size={16} /> แนบภาพประกอบโจทย์
                                            <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={(e) => handleUploadQuestionImage(q.id, e)} />
                                        </label>
                                    )}
                                </div>

                                {q.type === 'matching' ? (
                                    <div className="bg-slate-950/50 rounded-xl border border-white/5 p-4 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="text-xs text-gray-400 font-bold uppercase border-b border-white/10 pb-2">คอลัมน์ซ้าย (คำถาม)</div>
                                                {q.left_items?.map((item) => (
                                                    <div key={item.id} className="flex gap-2 items-center">
                                                        <span className="w-7 h-7 shrink-0 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-amber-400">{item.id}</span>
                                                        <input type="text" value={item.text} onChange={(e) => {
                                                            const updateFn = (prev: Question[]) => prev.map(qi => {
                                                                if (qi.id !== q.id) return qi;
                                                                const newLeft = qi.left_items?.map(i => i.id === item.id ? { ...i, text: e.target.value } : i);
                                                                return { ...qi, left_items: newLeft };
                                                            });
                                                            isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                                        }} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-amber-500" />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-3">
                                                <div className="text-xs text-gray-400 font-bold uppercase border-b border-white/10 pb-2">คอลัมน์ขวา (ตัวเลือกคำตอบ)</div>
                                                {q.right_items?.map((item) => (
                                                    <div key={item.id} className="flex gap-2 items-center">
                                                        <span className="w-7 h-7 shrink-0 rounded bg-white/10 flex items-center justify-center text-xs font-bold text-blue-400">{item.id}</span>
                                                        <input type="text" value={item.text} onChange={(e) => {
                                                            const updateFn = (prev: Question[]) => prev.map(qi => {
                                                                if (qi.id !== q.id) return qi;
                                                                const newRight = qi.right_items?.map(i => i.id === item.id ? { ...i, text: e.target.value } : i);
                                                                return { ...qi, right_items: newRight };
                                                            });
                                                            isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                                        }} className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-amber-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl">
                                            <div className="text-xs text-emerald-400 font-bold mb-3 flex items-center gap-2"><CheckCircle2 size={14} /> เฉลยการจับคู่ที่ถูกต้อง</div>
                                            <div className="flex flex-wrap gap-3">
                                                {Object.entries(q.correct_pairs || {}).map(([leftId, rightId]) => (
                                                    <div key={leftId} className="bg-slate-950 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-sm flex items-center gap-2">
                                                        <span className="text-amber-400 font-bold">{leftId}</span>
                                                        <span className="text-gray-500">↔</span>
                                                        <span className="text-blue-400 font-bold">{rightId}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-emerald-500/70 mt-2">* หากต้องการเปลี่ยนคู่เฉลย กรุณาแก้ไขข้อความในกล่องด้านบนให้ตรงกัน</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {q.options?.map((opt) => (
                                            <div key={opt.id} className={`p-2 rounded-xl border text-sm flex items-center gap-3 transition-colors ${opt.id === q.correct ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-950 border-white/5 hover:border-white/20'}`}>
                                                <button
                                                    onClick={() => {
                                                        const updateFn = (prev: Question[]) => prev.map(item => item.id === q.id ? { ...item, correct: opt.id } : item);
                                                        isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                                    }}
                                                    className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold transition-colors ${opt.id === q.correct ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                                                >
                                                    {opt.id === q.correct ? '✓' : opt.id}
                                                </button>
                                                <input
                                                    type="text" value={opt.text}
                                                    onChange={(e) => {
                                                        const updateFn = (prev: Question[]) => prev.map(item => {
                                                            if (item.id !== q.id) return item;
                                                            const newOptions = item.options?.map(o => o.id === opt.id ? { ...o, text: e.target.value } : o) || [];
                                                            return { ...item, options: newOptions };
                                                        });
                                                        isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                                    }}
                                                    className={`bg-transparent w-full outline-none ${opt.id === q.correct ? 'text-emerald-300 font-medium' : 'text-gray-300'}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg mt-2 flex items-start gap-2">
                                    <span className="text-xl shrink-0">💡</span>
                                    <textarea
                                        value={q.explanation}
                                        onChange={(e) => {
                                            const updateFn = (prev: Question[]) => prev.map(item => item.id === q.id ? { ...item, explanation: e.target.value } : item);
                                            isParallelMode ? (activeTab === 'A' ? setQuestionsSetA(updateFn) : setQuestionsSetB(updateFn)) : setQuestions(updateFn);
                                        }}
                                        placeholder="คำอธิบายเหตุผลของเฉลยข้อนี้..."
                                        className="w-full bg-transparent border-none text-xs text-gray-400 focus:outline-none focus:text-amber-200 resize-y min-h-[40px]"
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-md border-t border-white/10 p-4 z-50">
                            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-end items-center gap-4">
                                <button onClick={() => handleSaveExam('draft')} disabled={isSaving} className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 border border-white/10 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} บันทึกแบบร่าง {isParallelMode && '(2 ชุด)'}
                                </button>
                                <button onClick={() => handleSaveExam('published')} disabled={isSaving} className="w-full sm:w-auto px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} บันทึกเข้าคลัง {isParallelMode && '(2 ชุด)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}