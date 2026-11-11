// app/(e-exam)/smartexam/import-text/page.tsx
"use client";

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, CheckCircle2, List, Wand2, PlusCircle, Database, ChevronRight, GraduationCap, BookOpen, AlertCircle } from 'lucide-react';

interface Option {
    id: string;
    text: string;
}

interface ParsedQuestion {
    id: string;
    text: string;
    options: Option[];
    correct: string;
    solution_text: string;
    score: number;
    type: 'mcq';
}

// 🌟 ข้อมูล Master Data สำหรับ Dropdown
const BASIC_SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 'ศิลปศึกษา', 'การงานอาชีพ'];
const VOCATIONAL_SUBJECTS = ['หมวดวิชาสมรรถนะแกนกลาง', 'หมวดวิชาสมรรถนะวิชาชีพ'];

const EXAM_CATEGORIES = [
    { id: 'primary', label: 'ระดับประถมศึกษา', grades: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'], subjects: BASIC_SUBJECTS },
    { id: 'junior_high', label: 'ระดับมัธยมศึกษาตอนต้น', grades: ['ม.1', 'ม.2', 'ม.3'], subjects: BASIC_SUBJECTS },
    { id: 'senior_high', label: 'ระดับมัธยมศึกษาตอนปลาย', grades: ['ม.4', 'ม.5', 'ม.6'], subjects: [...BASIC_SUBJECTS, 'ฟิสิกส์', 'เคมี', 'ชีววิทยา', 'วิทยาศาสตร์โลกและอวกาศ'] },
    { id: 'vocational', label: 'ระดับอาชีวศึกษา', grades: ['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2'], subjects: VOCATIONAL_SUBJECTS },
    { id: 'entrance', label: 'สอบเข้า ม.1 และ ม.4', grades: [], subjects: ['คณิตศาสตร์', 'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'ภาษาไทย', 'สังคมศึกษา'] },
    { id: 'government', label: 'ก.พ. และ ข้าราชการ', grades: [], subjects: ['ข้อสอบ ก.พ.', 'ข้อสอบบรรจุครู'] }
];

export default function ImportTextExamPage() {
    const router = useRouter();
    const supabase = createClient();
    
    const [rawText, setRawText] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const [importMode, setImportMode] = useState<'new' | 'append'>('new');
    const [existingExams, setExistingExams] = useState<any[]>([]);
    const [selectedExamId, setSelectedExamId] = useState("");

    const [config, setConfig] = useState({
        title: '',
        examCode: '',
        category: 'junior_high',
        grade_level: 'ม.1',
        subject: 'วิทยาศาสตร์',
        difficulty: 'ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)',
    });

    useEffect(() => {
        const fetchExams = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('exams')
                    .select('id, title, exam_code')
                    .eq('creator_id', user.id)
                    .order('created_at', { ascending: false });
                if (data) {
                    setExistingExams(data);
                    if (data.length > 0) setSelectedExamId(data[0].id);
                }
            }
        };
        fetchExams();
    }, [supabase]);

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

    const handleGenerateSmartCode = () => {
        let subjCode = 'GEN';
        const subjMap: Record<string, string> = { 'ภาษาไทย': 'THA', 'คณิตศาสตร์': 'MAT', 'วิทยาศาสตร์': 'SCI', 'ภาษาอังกฤษ': 'ENG', 'สังคมศึกษา': 'SOC' };
        if (subjMap[config.subject]) subjCode = subjMap[config.subject];
        
        let lvlCode = 'ALL';
        const rawLvl = config.grade_level;
        if (rawLvl.includes('ป.')) lvlCode = 'P' + rawLvl.replace('ป.', '').padStart(2, '0');
        else if (rawLvl.includes('ม.')) lvlCode = 'M' + rawLvl.replace('ม.', '').padStart(2, '0');
        else if (rawLvl.includes('ปวช')) lvlCode = 'V' + rawLvl.replace('ปวช.', '').padStart(2, '0');
        else if (rawLvl.includes('ปวส')) lvlCode = 'S' + rawLvl.replace('ปวส.', '').padStart(2, '0');
        
        const year = (new Date().getFullYear() + 543).toString().slice(-2);
        const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        setConfig({ ...config, examCode: `${subjCode}-${lvlCode}-${year}-${randomHash}` });
    };

    const handleParseText = () => {
        if (!rawText.trim()) return alert("กรุณาวางข้อความข้อสอบก่อนครับ");

        const blocks = rawText.split(/(?=โจทย์)/).filter(b => b.trim());
        const extracted: ParsedQuestion[] = [];

        blocks.forEach((block, index) => {
            const lines = block.split('\n').map(l => l.trim()).filter(l => l);
            let questionText = "";
            let options: Option[] = [];
            let correct = "";
            let solution = "";
            let currentSection = "";

            lines.forEach(line => {
                if (line.startsWith('โจทย์')) {
                    currentSection = "Q";
                    questionText = line.replace(/^โจทย์\s*:?/, '').trim();
                } else if (line.startsWith('ตัวเลือก') || line.match(/^[กขคงจABCD]\./)) {
                    currentSection = "O";
                    if (!line.startsWith('ตัวเลือก')) {
                        const optId = line.substring(0, 1).toUpperCase();
                        const optText = line.substring(2).trim();
                        if (optText) options.push({ id: optId, text: optText });
                    }
                } else if (line.startsWith('เฉลยข้อถูก')) {
                    currentSection = "C";
                    correct = line.replace(/^เฉลยข้อถูก\s*:?/, '').trim().substring(0, 1).toUpperCase();
                } else if (line.startsWith('เฉลยละเอียด')) {
                    currentSection = "S";
                    solution = line.replace(/^เฉลยละเอียด\s*:?/, '').trim();
                } else {
                    if (currentSection === "Q") questionText += "\n" + line;
                    else if (currentSection === "S") solution += "\n" + line;
                }
            });

            if (questionText && options.length >= 2) {
                extracted.push({
                    id: `q_${Date.now()}_${index}`,
                    text: questionText,
                    options: options,
                    correct: correct || options[0].id,
                    solution_text: solution,
                    score: 1,
                    type: 'mcq'
                });
            }
        });

        if (extracted.length === 0) {
            alert("ไม่สามารถแยกแยะข้อสอบได้ กรุณาตรวจสอบรูปแบบ (Pattern) เช่น คำว่า 'โจทย์', 'ตัวเลือก', 'เฉลยข้อถูก'");
        } else {
            setParsedQuestions(extracted);
        }
    };

    const handleSave = async () => {
        if (parsedQuestions.length === 0) return alert("กรุณากด 'วิเคราะห์ข้อสอบ' เพื่อตรวจสอบก่อนบันทึก");
        
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("กรุณาเข้าสู่ระบบ");

            let targetExamId = "";
            let targetExamCode = "";
            let startQuestionNumber = 1;

            if (importMode === 'new') {
                if (!config.title.trim()) throw new Error("กรุณาตั้งชื่อข้อสอบ");
                const finalExamCode = config.examCode || `MAN-${Date.now().toString().slice(-6)}`;

                const { data: examData, error: examError } = await supabase.from('exams').insert([{
                    creator_id: user.id,
                    title: config.title.trim(),
                    exam_code: finalExamCode,
                    education_level: config.grade_level,
                    subject_category: config.subject,
                    topic: 'นำเข้าจากการคัดลอก (Manual Import)',
                    difficulty_level: config.difficulty,
                    status: 'published',
                    total_score: parsedQuestions.length
                }]).select().single();
                
                if (examError) throw examError;
                targetExamId = examData.id;
                targetExamCode = finalExamCode;

            } else {
                if (!selectedExamId) throw new Error("กรุณาเลือกชุดข้อสอบเดิมที่ต้องการเพิ่มข้อ");
                
                const { data: existingExam, error: fetchError } = await supabase
                    .from('exams')
                    .select('id, exam_code, total_score')
                    .eq('id', selectedExamId)
                    .single();
                
                if (fetchError) throw fetchError;
                targetExamId = existingExam.id;
                targetExamCode = existingExam.exam_code;
                
                const { count } = await supabase
                    .from('exam_questions')
                    .select('*', { count: 'exact', head: true })
                    .eq('exam_id', targetExamId);
                
                startQuestionNumber = (count || 0) + 1;

                await supabase.from('exams').update({ 
                    total_score: existingExam.total_score + parsedQuestions.length 
                }).eq('id', targetExamId);
            }

            const formattedQuestions = parsedQuestions.map((q, idx) => ({
                exam_id: targetExamId,
                creator_id: user.id,
                exam_code: targetExamCode,
                question_number: startQuestionNumber + idx,
                question_type: 'mcq',
                question_text: q.text,
                options: q.options,
                correct_answer: q.correct,
                solution_text: q.solution_text,
                score: q.score,
                is_bank_item: true,
                education_level: config.grade_level,
                subject_category: config.subject,
                tags: [config.difficulty, 'mcq', 'manual_import']
            }));

            const { error: questionsError } = await supabase.from('exam_questions').insert(formattedQuestions);
            if (questionsError) throw questionsError;

            alert(importMode === 'new' ? "สร้างข้อสอบใหม่สำเร็จ!" : "เพิ่มข้อสอบลงในชุดเดิมสำเร็จ!");
            router.push('/smart-exam-dashboard');

        } catch (error: any) {
            alert("บันทึกไม่สำเร็จ: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const allGrades = Array.from(new Set(EXAM_CATEGORIES.flatMap(c => c.grades)));
    const allSubjects = Array.from(new Set(EXAM_CATEGORIES.flatMap(c => c.subjects)));

    return (
        <div className="min-h-screen bg-[#0a1128] text-white pb-24 font-sans selection:bg-teal-500/30">
            {/* Navbar */}
            <nav className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/smart-exam-dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-teal-400">
                            <ArrowLeft size={20} />
                        </button>
                        <img 
                            src="/niivaa_smartexam_logo.png" 
                            alt="NiiVaa SmartExam Logo" 
                            className="h-8 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] hidden sm:block" 
                        />
                        <div className="h-6 w-px bg-white/20 hidden sm:block"></div>
                        <h1 className="font-bold text-lg text-white">นำเข้าข้อสอบ (Import Text)</h1>
                    </div>
                    <button onClick={handleSave} disabled={isSaving || parsedQuestions.length === 0} className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-slate-900 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                        {isSaving ? "กำลังบันทึก..." : <><Save size={18} /> บันทึกข้อสอบ ({parsedQuestions.length})</>}
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                
                {/* 🟢 คอลัมน์ซ้าย: นำเข้าข้อความและการตั้งค่า */}
                <div className="space-y-6">
                    {/* เลือกโหมดการนำเข้า */}
                    <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/10">
                        <button onClick={() => setImportMode('new')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${importMode === 'new' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            <PlusCircle size={18} /> สร้างชุดข้อสอบใหม่
                        </button>
                        <button onClick={() => setImportMode('append')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${importMode === 'append' ? 'bg-teal-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            <Database size={18} /> เพิ่มในชุดเดิม
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-5">
                        {importMode === 'new' ? (
                            <>
                                <h2 className="font-bold text-lg flex items-center gap-2 mb-4"><CheckCircle2 className="text-teal-400" /> ตั้งค่าโครงสร้างข้อสอบใหม่</h2>
                                
                                <div>
                                    <label className="text-xs text-gray-400">ชื่อแบบทดสอบ</label>
                                    <input type="text" value={config.title} onChange={e => setConfig({...config, title: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 mt-1 text-sm focus:border-teal-500 outline-none" placeholder="แบบทดสอบปลายภาค..." />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                                    {/* หมวดหมู่หลัก */}
                                    <div className="col-span-1 sm:col-span-2">
                                        <label className="text-xs text-gray-400">หมวดหมู่การศึกษา</label>
                                        <div className="relative mt-1">
                                            <select value={config.category} onChange={handleCategoryChange} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-teal-500">
                                                {EXAM_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                        </div>
                                    </div>

                                    {/* ระดับชั้น (Hybrid) */}
                                    <div>
                                        <label className="text-xs text-gray-400 flex items-center gap-1"><GraduationCap size={14} /> ระดับชั้น</label>
                                        <div className="relative mt-1">
                                            <select 
                                                value={allGrades.includes(config.grade_level) ? config.grade_level : 'custom'} 
                                                onChange={(e) => {
                                                    if (e.target.value !== 'custom') setConfig({ ...config, grade_level: e.target.value });
                                                    else setConfig({ ...config, grade_level: '' });
                                                }} 
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-teal-500"
                                            >
                                                {allGrades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                                                <option value="custom" className="bg-slate-800 text-teal-400 font-bold">➕ พิมพ์ระบุเอง...</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                        </div>
                                        {!allGrades.includes(config.grade_level) && (
                                            <input type="text" autoFocus value={config.grade_level} onChange={(e) => setConfig({ ...config, grade_level: e.target.value })} placeholder="พิมพ์ระดับชั้น..." className="w-full bg-black/50 border border-teal-500/50 rounded-xl px-4 py-3 mt-2 text-sm outline-none focus:border-teal-400" />
                                        )}
                                    </div>

                                    {/* วิชา (Hybrid) */}
                                    <div>
                                        <label className="text-xs text-gray-400 flex items-center gap-1"><BookOpen size={14} /> กลุ่มวิชา</label>
                                        <div className="relative mt-1">
                                            <select 
                                                value={allSubjects.includes(config.subject) ? config.subject : 'custom'} 
                                                onChange={(e) => {
                                                    if (e.target.value !== 'custom') setConfig({ ...config, subject: e.target.value });
                                                    else setConfig({ ...config, subject: '' });
                                                }} 
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-teal-500"
                                            >
                                                {allSubjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                                <option value="custom" className="bg-slate-800 text-teal-400 font-bold">➕ พิมพ์ระบุเอง...</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                        </div>
                                        {!allSubjects.includes(config.subject) && (
                                            <input type="text" autoFocus value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })} placeholder="พิมพ์ชื่อวิชา..." className="w-full bg-black/50 border border-teal-500/50 rounded-xl px-4 py-3 mt-2 text-sm outline-none focus:border-teal-400" />
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                                    <div>
                                        <label className="text-xs text-gray-400">ระดับความยาก</label>
                                        <div className="relative mt-1">
                                            <select value={config.difficulty} onChange={(e) => setConfig({ ...config, difficulty: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-teal-500">
                                                <option value="ง่าย (เน้นความจำ)">ง่าย (เน้นความจำ)</option>
                                                <option value="ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)">ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)</option>
                                                <option value="ยาก (เน้นวิเคราะห์/ประเมินค่า)">ยาก (เน้นวิเคราะห์/ประเมินค่า)</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-gray-400">รหัสข้อสอบ (Exam Code)</label>
                                        <div className="flex gap-2 mt-1">
                                            <input type="text" value={config.examCode} onChange={e => setConfig({...config, examCode: e.target.value.toUpperCase()})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none font-mono uppercase focus:border-blue-500" placeholder="เช่น SCI-M01..." />
                                            <button onClick={handleGenerateSmartCode} className="px-4 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center transition-colors" title="สุ่มรหัสอัตโนมัติ"><Wand2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="font-bold text-lg flex items-center gap-2 mb-4"><Database className="text-teal-400" /> เลือกชุดข้อสอบเดิม</h2>
                                <div>
                                    <label className="text-xs text-gray-400">เลือกข้อสอบจากคลังของคุณ</label>
                                    <div className="relative mt-1">
                                        <select 
                                            value={selectedExamId} 
                                            onChange={e => setSelectedExamId(e.target.value)} 
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-teal-500 outline-none appearance-none"
                                        >
                                            <option value="" disabled>-- เลือกชุดข้อสอบ --</option>
                                            {existingExams.map(exam => (
                                                <option key={exam.id} value={exam.id}>
                                                    [{exam.exam_code}] {exam.title}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500"><ChevronRight size={16} className="rotate-90" /></div>
                                    </div>
                                    <p className="text-[10px] text-orange-400 mt-2 flex items-center gap-1"><AlertCircle size={12}/> ระบบจะรันเลขข้อ (Question Number) ต่อจากข้อสุดท้ายในชุดนี้ให้อัตโนมัติ</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* วางข้อความดิบ */}
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 flex flex-col h-[500px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-lg flex items-center gap-2"><FileText className="text-blue-400" /> วางเนื้อหาข้อสอบที่นี่</h2>
                            <button onClick={handleParseText} className="px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 text-sm font-bold rounded-xl border border-teal-500/30 transition-colors">วิเคราะห์ข้อสอบ</button>
                        </div>
                        
                        <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 mb-4 text-xs text-blue-300">
                            <strong>💡 รูปแบบ (Pattern) วางแบบ 4 หรือ 5 ตัวเลือกคละกันได้เลย:</strong>
                            <pre className="font-mono mt-1 opacity-80 bg-black/50 p-2 rounded-lg text-[10px] sm:text-xs">
โจทย์ ข้อใดคือเมืองหลวงของไทย?
ตัวเลือก
ก. เชียงใหม่
ข. กรุงเทพฯ
ค. ภูเก็ต
ง. ชลบุรี
เฉลยข้อถูก ข
เฉลยละเอียด กรุงเทพฯ เป็นศูนย์กลาง...
                            </pre>
                        </div>

                        <textarea 
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder="วางข้อสอบตามรูปแบบ (Pattern) ที่นี่..." 
                            className="flex-1 bg-black/40 border border-white/5 focus:border-teal-500/50 rounded-xl p-4 resize-none outline-none font-sans"
                        />
                    </div>
                </div>

                {/* 🟢 คอลัมน์ขวา: พรีวิว (Preview) */}
                <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 flex flex-col h-full max-h-[850px]">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                        <h2 className="font-bold text-lg flex items-center gap-2"><List className="text-orange-400" /> ตัวอย่างก่อนบันทึก</h2>
                        <span className="text-sm font-bold text-gray-400 bg-white/5 px-3 py-1 rounded-full">พบ {parsedQuestions.length} ข้อ</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {parsedQuestions.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                                <FileText size={48} />
                                <p>ยังไม่มีข้อมูลข้อสอบ (กรุณากด 'วิเคราะห์ข้อสอบ')</p>
                            </div>
                        ) : (
                            parsedQuestions.map((q, i) => (
                                <div key={q.id} className="bg-black/30 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between mb-3">
                                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-md font-bold">ข้อที่ {i + 1}</span>
                                    </div>
                                    <p className="font-medium mb-4 whitespace-pre-wrap leading-relaxed">{q.text}</p>
                                    
                                    <div className="grid grid-cols-1 gap-2 mb-4">
                                        {q.options.map(opt => (
                                            <div key={opt.id} className={`p-2.5 rounded-xl text-sm border flex items-center gap-3 transition-colors ${opt.id === q.correct ? 'bg-teal-500/10 border-teal-500/50 text-teal-300' : 'bg-white/5 border-transparent text-gray-400'}`}>
                                                <span className={`w-6 h-6 shrink-0 rounded flex items-center justify-center text-xs font-bold ${opt.id === q.correct ? 'bg-teal-500 text-slate-900' : 'bg-white/10'}`}>
                                                    {opt.id}
                                                </span>
                                                {opt.text}
                                            </div>
                                        ))}
                                    </div>

                                    {q.solution_text && (
                                        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-sm text-orange-200/90 flex gap-2 whitespace-pre-wrap leading-relaxed">
                                            <span className="shrink-0 text-lg">💡</span> 
                                            <div>
                                                <span className="font-bold text-orange-400 block mb-1">คำอธิบายเฉลย:</span>
                                                {q.solution_text}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}