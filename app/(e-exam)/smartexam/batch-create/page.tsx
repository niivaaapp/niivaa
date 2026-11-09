"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, Database, Play, SquareTerminal, CheckCircle2, 
    AlertCircle, Loader2, ListPlus, BookOpen, GraduationCap, 
    Sparkles, Info
} from 'lucide-react';
// สมมติว่าเรามี Server Action สำหรับสร้างและบันทึกข้อสอบ (สร้างไว้ในไฟล์ actions)
import { generateAndSaveBatchItem } from '@/app/actions/ai-exam-actions';


interface BatchJob {
    id: string;
    topic: string;
    count: number;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
}

export default function BatchCreateExamPage() {
    const router = useRouter();
    const logsEndRef = useRef<HTMLDivElement>(null);
    
    // ตั้งค่าหลัก
    const [config, setConfig] = useState({
        subject: 'ภาษาไทย',
        grade_level: 'ม.3',
        difficulty: 'ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)',
        exam_title: 'แนวข้อสอบ O-NET (ชุดสร้างอัตโนมัติ)'
    });

    const [batchInput, setBatchInput] = useState("");
    const [jobs, setJobs] = useState<BatchJob[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, successCount: 0, failCount: 0 });

    // Auto-scroll ลงล่างสุดเมื่อมี Log ใหม่
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [jobs]);

    const handleParseInput = () => {
        if (!batchInput.trim()) return alert("กรุณาใส่รายการหัวข้อก่อนครับ");

        // แยกบรรทัด และแยกด้วยเครื่องหมาย |
        const lines = batchInput.split('\n').filter(line => line.trim() !== '');
        const parsedJobs: BatchJob[] = lines.map((line, idx) => {
            const parts = line.split('|').map(p => p.trim());
            return {
                id: `job-${Date.now()}-${idx}`,
                topic: parts[0] || 'ไม่ระบุหัวข้อ',
                count: parseInt(parts[1]) || 5, // ค่าเริ่มต้น 5 ข้อถ้าไม่ได้ระบุ
                status: 'pending'
            };
        });

        setJobs(parsedJobs);
        setProgress({ current: 0, total: parsedJobs.length, successCount: 0, failCount: 0 });
    };

    const startBatchProcess = async () => {
        if (jobs.length === 0) return alert("กรุณากด 'เตรียมข้อมูล' ก่อนรันระบบครับ");
        
        setIsProcessing(true);
        let success = 0;
        let fail = 0;

        // 🌟 1. สร้าง Base Prefix จากวิชาและระดับชั้น
        let subjCode = 'GEN';
        const subjMap: Record<string, string> = {
            'ภาษาไทย': 'THA', 'คณิตศาสตร์': 'MAT', 'วิทยาศาสตร์': 'SCI', 
            'ภาษาอังกฤษ': 'ENG', 'สังคมศึกษา': 'SOC', 'เทคโนโลยี': 'TEC'
        };
        if (subjMap[config.subject]) subjCode = subjMap[config.subject];

        let lvlCode = 'ALL';
        const rawLvl = config.grade_level;
        if (rawLvl.includes('ป.')) lvlCode = 'P' + rawLvl.replace('ป.', '').padStart(2, '0');
        else if (rawLvl.includes('ม.')) lvlCode = 'M' + rawLvl.replace('ม.', '').padStart(2, '0');

        const year = (new Date().getFullYear() + 543).toString().slice(-2);
        
        // 🌟 Prefix เช่น THA-M03-BAT-69 (ใส่คำว่า BAT คั่นกลางเพื่อให้รู้ว่าข้อสอบมาจากระบบ Batch)
        const baseExamCodePrefix = `${subjCode}-${lvlCode}-BAT-${year}`;

        for (let i = 0; i < jobs.length; i++) {
            const currentJob = jobs[i];
            
            // ข้ามถ้าเคยทำสำเร็จแล้ว
            if (currentJob.status === 'success') continue;

            // อัปเดตสถานะเป็นกำลังทำงาน
            setJobs(prev => prev.map(j => j.id === currentJob.id ? { ...j, status: 'processing', message: 'กำลังเชื่อมต่อ AI...' } : j));
            setProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                // 🚀 2. เรียกใช้ Server Action โดยส่ง Prefix และ Index (i) ไปรันเลข -001, -002
                const result = await generateAndSaveBatchItem(currentJob.topic, currentJob.count, config, baseExamCodePrefix, i);
                
                if (result.success) {
                    success++;
                    // 🌟 แสดงรหัสข้อสอบใน Terminal Log ด้วย (เช่น บันทึกสำเร็จ 5 ข้อ (THA-M03-BAT-69-001))
                    setJobs(prev => prev.map(j => j.id === currentJob.id ? { ...j, status: 'success', message: `บันทึกสำเร็จ ${result.count} ข้อ (${result.examCode})` } : j));
                } else {
                    fail++;
                    setJobs(prev => prev.map(j => j.id === currentJob.id ? { ...j, status: 'error', message: `ล้มเหลว: ${result.error}` } : j));
                }
            } catch (error: any) {
                fail++;
                setJobs(prev => prev.map(j => j.id === currentJob.id ? { ...j, status: 'error', message: `ข้อผิดพลาดระบบ: ${error.message}` } : j));
            }

            // หน่วงเวลาเล็กน้อยกัน Rate Limit
            await new Promise(res => setTimeout(res, 4500));
        }

        setProgress(prev => ({ ...prev, successCount: success, failCount: fail }));
        setIsProcessing(false);
        alert(`ทำงานเสร็จสิ้น!\nสำเร็จ: ${success} หัวข้อ\nล้มเหลว: ${fail} หัวข้อ`);
    };

    const percentComplete = jobs.length > 0 ? Math.round((progress.current / jobs.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white pb-12">
            {/* Navbar */}
            <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/smartexam/create')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Database className="text-emerald-400" size={24} />
                            <h1 className="text-lg font-bold">Auto Batch Generator <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase ml-2">Pro Tool</span></h1>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Column: Configuration & Input */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Config Card */}
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                            <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/10 pb-3"><Sparkles size={18} className="text-amber-400"/> ตั้งค่าแกนหลัก (Master Config)</h2>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><BookOpen size={12} /> วิชา</label>
                                    <input type="text" value={config.subject} onChange={(e) => setConfig({...config, subject: e.target.value})} disabled={isProcessing} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 flex items-center gap-1"><GraduationCap size={12} /> ระดับชั้น</label>
                                    <input type="text" value={config.grade_level} onChange={(e) => setConfig({...config, grade_level: e.target.value})} disabled={isProcessing} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">ชื่อชุดข้อสอบอ้างอิง</label>
                                <input type="text" value={config.exam_title} onChange={(e) => setConfig({...config, exam_title: e.target.value})} disabled={isProcessing} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 outline-none" />
                            </div>
                        </div>

                        {/* Batch Input Card */}
                        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-3">
                                <h2 className="font-bold text-lg flex items-center gap-2"><ListPlus size={18} className="text-blue-400"/> รายการตัวชี้วัด / หัวข้อย่อย</h2>
                            </div>
                            
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex gap-3 text-sm text-blue-300">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <p className="leading-relaxed text-xs">
                                    พิมพ์ 1 บรรทัดต่อ 1 หัวข้อ คั่นจำนวนข้อด้วยเครื่องหมาย <b>| (Pipe)</b><br/>
                                    <span className="opacity-70 text-white">รูปแบบ:</span> <code>ชื่อหัวข้อ/ตัวชี้วัด | จำนวนข้อ</code>
                                </p>
                            </div>

                            <textarea 
                                rows={8}
                                value={batchInput}
                                onChange={(e) => setBatchInput(e.target.value)}
                                disabled={isProcessing}
                                placeholder="ตัวอย่าง:&#10;มาตรฐาน ท 1.1 ม.3/2 จับใจความสำคัญ | 10&#10;มาตรฐาน ท 4.1 ม.3/1 ประโยคความซ้อน | 5&#10;มาตรฐาน ท 4.1 ม.3/4 คำสมาส-สนธิ | 5"
                                className="w-full bg-black/50 border border-white/10 hover:border-white/20 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
                            />
                            
                            <button 
                                onClick={handleParseInput} 
                                disabled={isProcessing || !batchInput}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                โหลดข้อมูลลงระบบ ({batchInput.split('\n').filter(l => l.trim()).length} รายการ)
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Terminal & Progress */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-black border border-white/10 rounded-3xl p-1 overflow-hidden flex flex-col h-[600px] shadow-2xl">
                            
                            {/* Terminal Header */}
                            <div className="bg-slate-900 border-b border-white/10 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-400 font-mono text-sm">
                                    <SquareTerminal size={16} /> Operation Terminal
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="p-6 bg-slate-900/50 border-b border-white/5 space-y-4">
                                <div className="flex justify-between text-sm font-bold">
                                    <span className="text-gray-300">ความคืบหน้า (Progress)</span>
                                    <span className="text-emerald-400">{percentComplete}%</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-3 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${percentComplete}%` }}
                                    ></div>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
                                    <span>คิวทั้งหมด: {jobs.length} รายการ</span>
                                    <div className="flex gap-4">
                                        <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> {progress.successCount} สำเร็จ</span>
                                        <span className="text-red-400 flex items-center gap-1"><AlertCircle size={12}/> {progress.failCount} พลาด</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={startBatchProcess} 
                                    disabled={isProcessing || jobs.length === 0}
                                    className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all mt-4 ${isProcessing ? 'bg-slate-800 text-gray-500 cursor-not-allowed' : jobs.length > 0 ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02]' : 'bg-white/5 text-gray-600'}`}
                                >
                                    {isProcessing ? <><Loader2 className="animate-spin" size={18}/> กำลังสร้างข้อสอบเข้าคลัง...</> : <><Play size={18} /> เริ่มกระบวนการ Batch AI (Start)</>}
                                </button>
                                {isProcessing && <p className="text-[10px] text-amber-500/80 text-center animate-pulse mt-2">⚠️ กรุณาอย่าปิดหน้าต่างเบราว์เซอร์จนกว่าระบบจะทำงานเสร็จสิ้น</p>}
                            </div>

                            {/* Logs Viewer */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm bg-black relative">
                                {jobs.length === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                        ยังไม่มีข้อมูลคิวงาน
                                    </div>
                                ) : (
                                    jobs.map((job, idx) => (
                                        <div key={job.id} className={`p-3 rounded-lg border flex flex-col gap-1 transition-colors ${
                                            job.status === 'processing' ? 'bg-blue-500/10 border-blue-500/30' :
                                            job.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                            job.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                            'bg-white/5 border-transparent text-gray-500'
                                        }`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <span className="opacity-50 text-xs">[{idx + 1}/{jobs.length}]</span>
                                                    <span className={job.status === 'pending' ? 'text-gray-400' : 'text-white'}>{job.topic}</span>
                                                </div>
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] shrink-0">{job.count} ข้อ</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 text-xs mt-1">
                                                {job.status === 'processing' && <><Loader2 size={12} className="animate-spin text-blue-400"/> <span className="text-blue-400">{job.message}</span></>}
                                                {job.status === 'success' && <><CheckCircle2 size={12} className="text-emerald-400"/> <span className="text-emerald-400">{job.message}</span></>}
                                                {job.status === 'error' && <><AlertCircle size={12} className="text-red-400"/> <span className="text-red-400">{job.message}</span></>}
                                                {job.status === 'pending' && <span className="text-gray-600 pl-4">รอคิว...</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {/* Element เปล่าสำหรับใช้ Auto-scroll */}
                                <div ref={logsEndRef} />
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}