"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, UploadCloud, Loader2, FileImage, X, ImageIcon, LayoutDashboard, Plus, Trash2 } from 'lucide-react';

const LEVELS = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2', 'สอบเข้า ม.1', 'สอบเข้า ม.4', 'สอบเข้าสถาบัน', 'แนวข้อสอบ ก.พ.', 'แนวข้อสอบ ครูผู้ช่วย', 'แนวข้อสอบ พนักงานท้องถิ่น', 'แนวข้อสอบตำรวจ', 'แนวข้อสอบทหาร'];
const SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 'ศิลปศึกษา', 'การงานอาชีพ', 'ฟิสิกส์', 'เคมี', 'ชีววิทยา'];

interface ExamPart {
  id: number;
  title: string;
  type: string;
  count: number;
  score: number;
}

export default function ImageToExamCreatePage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // State โครงสร้างใหม่ที่รองรับการพิมพ์อิสระ
  const [examData, setExamData] = useState({
    title: '',
    level: '',
    subject: '',
    difficulty: 'ปานกลาง (เน้นความเข้าใจ/ประยุกต์ใช้)'
  });

  // State จัดการตอน (Parts) แบบเดียวกับหน้า PDF
  const [parts, setParts] = useState<ExamPart[]>([
    { id: Date.now(), title: 'ตอนที่ 1', type: 'mcq4', count: 10, score: 1.0 }
  ]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setFiles(prev => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateExam = async () => {
    if (!examData.title.trim()) return alert("กรุณาระบุชื่อชุดข้อสอบ");
    if (parts.length === 0 || parts.some(p => p.count < 1)) return alert("กรุณากำหนดจำนวนข้อในแต่ละตอนให้ถูกต้อง");
    if (files.length === 0) return alert("กรุณาเลือกรูปภาพข้อสอบอย่างน้อย 1 ภาพ");

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนครับ");

      const uploadedUrls: string[] = [];

      // 1. อัปโหลดภาพทั้งหมด
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `exam-img-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('exam-assets').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('exam-assets').getPublicUrl(fileName);
        uploadedUrls.push(data.publicUrl);
      }

      const totalScore = parts.reduce((sum, p) => sum + (p.count * p.score), 0);
      const metadata = JSON.stringify({ stamp_color: '#f59e0b', parts });

      // 2. สร้างชุดข้อสอบ (แฟ้มหลัก)
      const { data: newExam, error: insertError } = await supabase.from('exams').insert({
        creator_id: user.id,
        title: examData.title.trim(),
        education_level: examData.level || 'ทั่วไป', 
        subject_category: examData.subject || 'ทั่วไป',
        difficulty_level: examData.difficulty,
        status: 'draft',
        exam_format: 'multi_image',
        file_url: uploadedUrls[0], 
        image_urls: uploadedUrls,  
        topic: metadata,
        total_score: totalScore
      }).select('id').single();

      if (insertError) throw insertError;

      // 3. สร้างข้อสอบเปล่าๆ (เตรียมให้ครูไปวางเลขในหน้า Edit)
      const questionsToInsert = [];
      let globalIndex = 1;

      for (const part of parts) {
        let choiceLabels: string[] = [];
        let qType = 'mcq';
        if (part.type === 'mcq2') choiceLabels = ['ถูก', 'ผิด'];
        else if (part.type === 'mcq3') choiceLabels = ['ก', 'ข', 'ค'];
        else if (part.type === 'mcq4') choiceLabels = ['ก', 'ข', 'ค', 'ง'];
        else if (part.type === 'mcq5') choiceLabels = ['ก', 'ข', 'ค', 'ง', 'จ'];
        else if (part.type === 'short') qType = 'short_answer';
        else if (part.type === 'matching') qType = 'matching';

        const defaultOptions = choiceLabels.map(ch => ({ id: ch, text: ch }));

        for (let i = 0; i < part.count; i++) {
          questionsToInsert.push({
            exam_id: newExam.id,
            question_number: globalIndex,
            display_label: `${globalIndex}`, 
            part_name: part.title, // อิงตามคอลัมน์ใหม่ที่เพิ่มไป
            question_type: qType,
            options: defaultOptions,
            correct_answer: '',
            score: part.score,
            explanation: '', // ว่างไว้รอครูเฉลย
            image_index: 0 // Default ให้ไปกองรวมกันที่ภาพแรกก่อน
          });
          globalIndex++;
        }
      }

      const { error: questionsError } = await supabase.from('exam_questions').insert(questionsToInsert);
      if (questionsError) throw questionsError;

      alert("อัปโหลดและสร้างชุดข้อสอบสำเร็จ! ระบบกำลังพาไปหน้าตั้งค่าเฉลย");
      router.push(`/smartexam/edit/${newExam.id}`);

    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col pb-20">
      
      {/* 🌟 Datalist สำหรับพิมพ์อิสระ */}
      <datalist id="level-options">{LEVELS.map(l => <option key={l} value={l} />)}</datalist>
      <datalist id="subject-options">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>

      <nav className="h-16 shrink-0 border-b border-white/10 bg-slate-950 flex items-center px-4 sm:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-1 sm:gap-3 mr-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors" title="ย้อนกลับ">
                <ArrowLeft size={20} />
            </button>
            <button onClick={() => router.push('/smart-exam-dashboard')} className="p-2 hover:bg-amber-500/10 rounded-full text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2" title="กลับหน้าศูนย์กลาง">
                <LayoutDashboard size={20} />
                <span className="text-sm font-bold hidden sm:inline">หน้าหลัก</span>
            </button>
            <div className="h-6 w-[1px] bg-white/10 ml-1 mr-2 hidden sm:block"></div>
        </div>
        <h1 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="text-blue-400"/> สร้างข้อสอบจากรูปภาพ (Image to Exam)</h1>
      </nav>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
          
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-base font-bold text-amber-400 border-b border-white/5 pb-3">1. รายละเอียด โครงสร้าง และระดับชั้น</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs text-gray-400 mb-1 block">ชื่อชุดข้อสอบ *</label>
                    <input type="text" value={examData.title} onChange={e => setExamData({...examData, title: e.target.value})} placeholder="เช่น แบบทดสอบกลางภาค วิทยาศาสตร์ ม.4" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">ระดับชั้น (เลือกหรือพิมพ์เอง)</label>
                  <input list="level-options" value={examData.level} onChange={(e) => setExamData({ ...examData, level: e.target.value })} placeholder="คลิกเลือกหรือพิมพ์..." className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">กลุ่มวิชา (เลือกหรือพิมพ์เอง)</label>
                  <input list="subject-options" value={examData.subject} onChange={(e) => setExamData({ ...examData, subject: e.target.value })} placeholder="คลิกเลือกหรือพิมพ์..." className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500 text-sm" />
                </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-amber-400 text-sm">โครงสร้างข้อสอบ (Parts)</h3>
                <button onClick={() => setParts([...parts, { id: Date.now(), title: `ตอนที่ ${parts.length + 1}`, type: 'mcq4', count: 10, score: 1.0 }])} className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1 border border-blue-500/20 hover:bg-blue-500/20"><Plus size={14}/> เพิ่มตอน</button>
              </div>
              
              {parts.map((p, idx) => (
                <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[120px]">
                    <label className="text-xs text-gray-400 mb-1 block">ชื่อตอน</label>
                    <input type="text" value={p.title} onChange={(e) => setParts(parts.map((part, i) => i === idx ? { ...part, title: e.target.value } : part))} className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white outline-none" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-gray-400 mb-1 block">รูปแบบ</label>
                    <select value={p.type} onChange={(e) => setParts(parts.map((part, i) => i === idx ? { ...part, type: e.target.value } : part))} className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-blue-400 font-bold outline-none cursor-pointer">
                      <option value="mcq2">2 ตัวเลือก (ถูก/ผิด)</option>
                      <option value="mcq3">3 ตัวเลือก</option>
                      <option value="mcq4">4 ตัวเลือก</option>
                      <option value="mcq5">5 ตัวเลือก</option>
                      <option value="short">เติมคำตอบสั้นๆ</option>
                      <option value="matching">จับคู่</option>
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-400 mb-1 block">จำนวนข้อ</label>
                    <input type="number" min="1" value={p.count} onChange={(e) => setParts(parts.map((part, i) => i === idx ? { ...part, count: parseInt(e.target.value)||1 } : part))} className="w-full bg-black border border-white/10 rounded-lg p-2 text-center text-sm font-bold outline-none" />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-400 mb-1 block">คะแนน/ข้อ</label>
                    <input type="number" min="0" step="0.5" value={p.score} onChange={(e) => setParts(parts.map((part, i) => i === idx ? { ...part, score: parseFloat(e.target.value)||0 } : part))} className="w-full bg-black border border-white/10 rounded-lg p-2 text-center text-sm font-bold text-amber-400 outline-none" />
                  </div>
                  {parts.length > 1 && (
                    <button onClick={() => setParts(parts.filter((_, i) => i !== idx))} className="mb-1 p-2 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={18}/></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h2 className="text-base font-bold text-amber-400">2. อัปโหลดไฟล์รูปภาพข้อสอบ</h2>
              <span className="text-xs text-gray-500 bg-slate-800 px-3 py-1 rounded-full font-bold">{files.length} ภาพ</span>
            </div>

            <label className="border-2 border-dashed border-white/20 hover:border-blue-500/50 bg-slate-950 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-4"><UploadCloud size={32}/></div>
              <p className="font-bold text-white mb-1">คลิกเพื่อเลือกไฟล์ หรือลากรูปภาพมาวางที่นี่</p>
              <p className="text-xs text-gray-500">รองรับ JPG, PNG, WEBP (สามารถเลือกพร้อมกันได้หลายภาพ)</p>
              <input type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileSelect} />
            </label>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-6">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative aspect-[3/4] bg-white rounded-xl overflow-hidden border border-white/10 group shadow-md">
                    <img src={url} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <button onClick={() => removeFile(idx)} className="bg-red-500 text-white p-2.5 rounded-full hover:bg-red-600 transition-colors shadow-lg"><X size={18}/></button>
                    </div>
                    <div className="absolute top-2 left-2 bg-slate-900/90 text-white text-xs px-2 py-0.5 rounded-md font-bold shadow-sm">{idx + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={handleCreateExam} disabled={isUploading || files.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 text-lg"
          >
            {isUploading ? <><Loader2 className="animate-spin"/> กำลังประมวลผลและอัปโหลด...</> : <><FileImage /> สร้างชุดข้อสอบและไปตั้งค่าเฉลย</>}
          </button>
        </div>
      </main>
    </div>
  );
}