"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, UploadCloud, FileText, CheckCircle2, 
  ChevronRight, Save, Loader2, BookOpen, GraduationCap,
  FileBox, Info, Plus, Trash2
} from 'lucide-react';

const LEVELS = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2', 'สอบเข้า ม.1', 'สอบเข้า ม.4', 'สอบเข้าสถาบัน', 'แนวข้อสอบ ก.พ.', 'แนวข้อสอบ ครูผู้ช่วย', 'แนวข้อสอบ พนักงานท้องถิ่น', 'แนวข้อสอบตำรวจ', 'แนวข้อสอบทหาร'];
const SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 'ศิลปศึกษา', 'การงานอาชีพ', 'ฟิสิกส์', 'เคมี', 'ชีววิทยา'];

interface ExamPart {
  id: number;
  title: string;
  type: string;
  count: number;
  score: number;
}

export default function ImportExamPage() {
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');

  const [config, setConfig] = useState({
    title: '',
    level: '',
    subject: '',
    referenceNote: ''
  });

  const [parts, setParts] = useState<ExamPart[]>([
    { id: 1, title: 'ตอนที่ 1', type: 'mcq4', count: 20, score: 1.0 }
  ]);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(selectedFile.type)) return alert("อัปโหลดได้เฉพาะ PDF หรือ รูปภาพ");
      if (selectedFile.size > 50 * 1024 * 1024) return alert("ขนาดไฟล์ใหญ่เกินไป (จำกัดไม่เกิน 50MB)");
      setFile(selectedFile);
    }
  };

  const handleNextStep = async () => {
    if (!file && !fileUrl) return alert("กรุณาอัปโหลดไฟล์ข้อสอบครับ");
    if (!config.title.trim()) return alert("กรุณาตั้งชื่อชุดข้อสอบครับ");
    if (parts.length === 0 || parts.some(p => p.count < 1)) return alert("กรุณากำหนดจำนวนข้อให้ถูกต้อง");

    if (file && !fileUrl) {
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `exam-file-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('exam-assets').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('exam-assets').getPublicUrl(fileName);
        setFileUrl(publicUrlData.publicUrl);
        setCurrentStep(2);
      } catch (error: any) {
        alert("เกิดข้อผิดพลาดในการอัปโหลด: " + error.message);
      } finally {
        setIsUploading(false);
      }
    } else {
      setCurrentStep(2);
    }
  };

  const handleSaveExam = async (status: 'draft' | 'published') => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return alert("กรุณาเข้าสู่ระบบก่อนครับ");

      const fileFormat = fileUrl.toLowerCase().includes('.pdf') ? 'pdf' : 'image';
      const totalQuestions = parts.reduce((sum, p) => sum + p.count, 0);
      const totalScore = parts.reduce((sum, p) => sum + (p.count * p.score), 0);

      const { data: examData, error: examError } = await supabase.from('exams').insert([{
        creator_id: user.id, 
        title: config.title.trim(),
        education_level: config.level || 'ทั่วไป', 
        subject_category: config.subject || 'ทั่วไป',
        topic: JSON.stringify({ parts }), 
        difficulty_level: 'ปานกลาง', 
        status: status,
        total_score: totalScore,
        exam_format: fileFormat,
        file_url: fileUrl,
        reference_note: config.referenceNote
      }]).select().single();

      if (examError) throw examError;

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
          const displayLabel = `${globalIndex}`; // ค่าเริ่มต้น
          questionsToInsert.push({
            exam_id: examData.id,
            question_number: globalIndex,
            display_label: displayLabel, // ฟิลด์ใหม่รองรับตัวอักษร
            question_type: qType,
            options: defaultOptions,
            correct_answer: answers[`${part.id}-${globalIndex}`] || '',
            score: part.score,
            explanation: part.title
          });
          globalIndex++;
        }
      }

      const { error: questionsError } = await supabase.from('exam_questions').insert(questionsToInsert);
      if (questionsError) throw questionsError;

      alert(status === 'published' ? `เผยแพร่แบบทดสอบเรียบร้อย!` : `บันทึกแบบร่างลงคลังเรียบร้อยแล้ว!`);
      router.push('/smart-exam-dashboard');
    } catch (error: any) {
      alert("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white select-none pb-24 font-sans">
      <datalist id="level-options">{LEVELS.map(l => <option key={l} value={l} />)}</datalist>
      <datalist id="subject-options">{SUBJECTS.map(s => <option key={s} value={s} />)}</datalist>

      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => currentStep === 1 ? router.push('/smart-exam-dashboard') : setCurrentStep(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold">นำเข้าไฟล์ข้อสอบ</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 mt-8">
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl space-y-8">
              
              <div className="border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 rounded-2xl p-10 text-center relative flex flex-col items-center">
                <input type="file" accept="application/pdf, image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <UploadCloud size={32} className="text-cyan-400 mb-2" />
                <p className="font-bold">{file ? file.name : (fileUrl ? 'อัปโหลดแล้ว' : 'คลิกหรือลากไฟล์ PDF / รูปภาพ มาวางที่นี่')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-400 mb-1 block">ชื่อแบบทดสอบ</label>
                  <input type="text" value={config.title} onChange={(e) => setConfig({ ...config, title: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">ระดับชั้น (เลือกหรือพิมพ์เอง)</label>
                  <input list="level-options" value={config.level} onChange={(e) => setConfig({ ...config, level: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">กลุ่มวิชา (เลือกหรือพิมพ์เอง)</label>
                  <input list="subject-options" value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500" />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-amber-400">โครงสร้างข้อสอบ (Parts)</h3>
                  <button onClick={() => setParts([...parts, { id: Date.now(), title: `ตอนที่ ${parts.length + 1}`, type: 'mcq4', count: 10, score: 1.0 }])} className="text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus size={14}/> เพิ่มตอน</button>
                </div>
                
                {parts.map((p, idx) => (
                  <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <label className="text-xs text-gray-400 mb-1 block">ชื่อตอน</label>
                      <input type="text" value={p.title} onChange={(e) => setParts(parts.map((part, i) => i === idx ? { ...part, title: e.target.value } : part))} className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-white outline-none" />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xs text-gray-400 mb-1 block">รูปแบบ</label>
                      <select value={p.type} onChange={(e) => setParts(parts.map((part, i) => i === idx ? { ...part, type: e.target.value } : part))} className="w-full bg-black border border-white/10 rounded-lg p-2 text-sm text-cyan-400 font-bold outline-none">
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
                      <button onClick={() => setParts(parts.filter((_, i) => i !== idx))} className="mb-1 p-2 text-gray-500 hover:text-red-400"><Trash2 size={18}/></button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={handleNextStep} disabled={isUploading} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-lg rounded-2xl flex justify-center gap-2">
                {isUploading ? <Loader2 className="animate-spin" /> : <>ถัดไป: ตั้งค่าเฉลย <ChevronRight /></>}
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300 pb-32">
            <h2 className="text-2xl font-black text-cyan-400">สร้างกระดาษคำตอบเฉลย</h2>
            
            <div className="space-y-6">
              {(() => {
                let globalIndex = 1;
                return parts.map(part => {
                  const partQuestions = Array.from({ length: part.count }).map((_, i) => globalIndex + i);
                  globalIndex += part.count;
                  
                  let choiceLabels: string[] = [];
                  if (part.type === 'mcq2') choiceLabels = ['ถูก', 'ผิด'];
                  else if (part.type === 'mcq3') choiceLabels = ['ก', 'ข', 'ค'];
                  else if (part.type === 'mcq4') choiceLabels = ['ก', 'ข', 'ค', 'ง'];
                  else if (part.type === 'mcq5') choiceLabels = ['ก', 'ข', 'ค', 'ง', 'จ'];

                  return (
                    <div key={part.id} className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-xl">
                      <h3 className="font-bold text-amber-400 border-b border-white/10 pb-2 mb-4">{part.title} ({part.count} ข้อ)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {partQuestions.map(qNum => (
                          <div key={qNum} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <span className="w-6 text-right font-bold text-gray-400">{qNum}.</span>
                            
                            {part.type === 'short' || part.type === 'matching' ? (
                              <input 
                                type="text" placeholder="พิมพ์เฉลย..." 
                                value={answers[`${part.id}-${qNum}`] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [`${part.id}-${qNum}`]: e.target.value }))}
                                className="w-full bg-black/50 border border-white/20 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500"
                              />
                            ) : (
                              <div className="flex gap-1.5 flex-wrap">
                                {choiceLabels.map(choice => (
                                  <button
                                    key={choice} onClick={() => setAnswers(prev => ({ ...prev, [`${part.id}-${qNum}`]: choice }))}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                                      answers[`${part.id}-${qNum}`] === choice 
                                        ? 'bg-cyan-500 border-cyan-500 text-black' 
                                        : 'bg-black/50 border-white/20 text-gray-400'
                                    }`}
                                  >{choice}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-slate-950/90 border-t border-white/10 p-4 z-50">
              <div className="max-w-5xl mx-auto flex justify-end gap-4">
                <button onClick={() => handleSaveExam('draft')} disabled={isSaving} className="px-6 py-3 bg-slate-800 text-white rounded-xl flex items-center gap-2">บันทึกแบบร่าง</button>
                <button onClick={() => handleSaveExam('published')} disabled={isSaving} className="px-8 py-3 bg-cyan-600 text-white font-black rounded-xl flex items-center gap-2">บันทึกและเผยแพร่</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}