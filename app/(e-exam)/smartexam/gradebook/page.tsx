"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx'; 
import { 
  ArrowLeft, FileSpreadsheet, Search, Save, Loader2, BookOpen, 
  Building, PlusCircle, Upload, HelpCircle, X, CheckCircle2, 
  ClipboardPaste, CloudDownload, Calculator, AlertCircle, 
  ChevronUp, ChevronDown, Lock, Unlock, Plus, FolderOpen, Key, Dices,
  Home, Printer, FileText, Layers
} from 'lucide-react';

// --- Types ---
type SectionKey = 'preMidterm' | 'midterm' | 'postMidterm' | 'final';
interface ScoreColumn { id: string; name: string; maxScore: number; }

interface Evaluations {
  competency?: (number | null)[];
  literacy?: (number | null)[];
  character?: (number | null)[];
}

interface StudentGrade { 
  id: string; 
  studentId: string; 
  name: string; 
  scores: Record<string, number>; 
  examToken?: string;
  evals?: Evaluations; 
}

export default function GradebookApp() {
  const router = useRouter();
  const [view, setView] = useState<'lobby' | 'editor'>('lobby');
  
  // --- States สำหรับ Lobby ---
  const [lobbyGradebooks, setLobbyGradebooks] = useState<any[]>([]);
  const [isLobbyLoading, setIsLobbyLoading] = useState(true);
  const [authModal, setAuthModal] = useState({ isOpen: false, gradebook: null as any, pin: '', error: '' });
  const [newModal, setNewModal] = useState({ isOpen: false, pin: '', confirmPin: '', error: '' });
  
  // --- States สำหรับ Editor ---
  const [activeGbId, setActiveGbId] = useState<string | null>(null);
  const [activePin, setActivePin] = useState<string>(''); 
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('intro'); 

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

  // 🌟 State สำหรับจัดหน้าพิมพ์ PDF
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<'portrait' | 'landscape' | null>(null);

  const [importModal, setImportModal] = useState<{
    isOpen: boolean; section: SectionKey | null; colId: string | null; colName: string; maxScore: number;
  }>({ isOpen: false, section: null, colId: null, colName: '', maxScore: 0 });

  const [importExams, setImportExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const [headerInfo, setHeaderInfo] = useState({
    school_id: 'SCH-001', teacher_id: '', school_name: '', department: 'วิทยาศาสตร์และเทคโนโลยี', 
    subject_code: '', subject_name: '', credits: '', teacher_name: '', grade_level: 'ม.4', room: '', term: ''
  });

  const [columns, setColumns] = useState<Record<SectionKey, ScoreColumn[]>>({
    preMidterm: [{ id: 'pre_1', name: '1', maxScore: 10 }], midterm: [{ id: 'mid_1', name: '1', maxScore: 20 }],
    postMidterm: [{ id: 'post_1', name: '1', maxScore: 10 }], final: [{ id: 'fin_1', name: '1', maxScore: 20 }]
  });

  const [students, setStudents] = useState<StudentGrade[]>([]);

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || s.studentId.includes(searchTerm)
  );

  // --- Effects ---
  useEffect(() => {
    if (view === 'lobby') {
      const fetchLobby = async () => {
        setIsLobbyLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('gradebooks').select('*').eq('teacher_id', user.id).order('updated_at', { ascending: false });
          if (data) setLobbyGradebooks(data);
        }
        setIsLobbyLoading(false);
      };
      fetchLobby();
    }
  }, [view]);

  useEffect(() => {
    if (view === 'editor' && activeGbId) {
      const loadGb = async () => {
        setIsEditorLoading(true);
        const { data: gb } = await supabase.from('gradebooks').select('*').eq('id', activeGbId).single();
        if (gb) {
          setHeaderInfo({
            school_id: gb.school_id || '', teacher_id: gb.teacher_id, school_name: gb.school_name || '', department: gb.department || '', 
            subject_code: gb.subject_code || '', subject_name: gb.subject_name || '', credits: gb.credits || '', teacher_name: gb.teacher_name || '', 
            grade_level: gb.grade_level || '', room: gb.room || '', term: gb.term || ''
          });
          if (gb.columns_config) setColumns(gb.columns_config);
          
          const { data: std } = await supabase.from('student_grades').select('*').eq('gradebook_id', activeGbId).order('order_number', { ascending: true });
          if (std) setStudents(std.map(s => ({ 
            id: s.id, studentId: s.student_code, name: s.student_name, scores: s.scores || {}, examToken: s.exam_token || '', evals: s.evaluations || {}
          })));
        }
        setIsEditorLoading(false);
      };
      loadGb();
    }
  }, [view, activeGbId]);

  useEffect(() => {
    if (importModal.isOpen) {
      const fetchExams = async () => {
        const { data } = await supabase.from('exams').select('id, title, total_score').eq('status', 'published').eq('education_level', headerInfo.grade_level).order('created_at', { ascending: false });
        if (data) setImportExams(data);
      };
      fetchExams();
      setPreviewData([]);
    }
  }, [importModal.isOpen, headerInfo.grade_level]);

  // 🌟 Effect ดักจับการพิมพ์ เมื่อ State ถูกเซ็ตแล้ว ให้สั่งพิมพ์แล้วรีเซ็ต
  useEffect(() => {
    if (printMode) {
      setTimeout(() => {
        window.print();
        setPrintMode(null);
      }, 300); // ดีเลย์ให้ CSS React โหลดครบก่อน
    }
  }, [printMode]);

  // --- Logic Functions ---
  const handleAuthSubmit = () => {
    if (authModal.pin === authModal.gradebook.pin_code) {
      setAuthModal({ ...authModal, isOpen: false, error: '' });
      setActiveGbId(authModal.gradebook.id); setActivePin(authModal.gradebook.pin_code); setView('editor');
    } else { setAuthModal({ ...authModal, error: 'รหัสผ่านไม่ถูกต้อง' }); }
  };

  const handleCreateNewSubmit = () => {
    if (newModal.pin.length < 4) return setNewModal({ ...newModal, error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัว' });
    if (newModal.pin !== newModal.confirmPin) return setNewModal({ ...newModal, error: 'รหัสผ่านยืนยันไม่ตรงกัน' });
    
    setNewModal({ ...newModal, isOpen: false, error: '' });
    setActiveGbId(null); setActivePin(newModal.pin);
    setHeaderInfo({ ...headerInfo, subject_code: '', subject_name: '', room: '' });
    setStudents([]);
    setColumns({ preMidterm: [{ id: 'pre_1', name: '1', maxScore: 10 }], midterm: [{ id: 'mid_1', name: '1', maxScore: 20 }], postMidterm: [{ id: 'post_1', name: '1', maxScore: 10 }], final: [{ id: 'fin_1', name: '1', maxScore: 20 }] });
    setView('editor');
  };

  const handleAddColumn = (section: SectionKey) => {
    const newId = section + '_' + Date.now();
    setColumns(prev => ({ ...prev, [section]: [...prev[section], { id: newId, name: (prev[section].length + 1).toString(), maxScore: 10 }] }));
  };

  const handleUpdateColumn = (section: SectionKey, colId: string, field: 'name' | 'maxScore', value: string) => {
    setColumns(prev => {
      const updated = prev[section].map(col => {
        if (col.id === colId) return field === 'maxScore' ? { ...col, maxScore: value === '' ? 0 : parseInt(value, 10) || 0 } : { ...col, name: value };
        return col;
      });
      return { ...prev, [section]: updated };
    });
  };

  const handleScoreChange = (studentId: string, colId: string, value: string) => {
    let numValue = parseInt(value, 10); if (isNaN(numValue)) numValue = 0;
    setStudents(prev => prev.map(std => std.id === studentId ? { ...std, scores: { ...std.scores, [colId]: numValue } } : std));
  };

  const handleProcessPaste = () => {
    if (!pasteText.trim()) return alert("กรุณาวางข้อมูลก่อนกดตกลงครับ");
    try {
      const rows = pasteText.trim().split('\n');
      const newStudents = rows.map((row, index) => {
        const cols = row.split('\t');
        return {
          id: `std-${Date.now()}-${index}`, studentId: cols[1] ? cols[1].trim() : `STD-${index + 1}`,
          name: cols[2] ? cols[2].trim() : (cols[1] || 'ไม่ระบุชื่อ'), scores: {}, examToken: '', evals: {} 
        };
      }).filter(s => s.name !== 'ไม่ระบุชื่อ');

      if (newStudents.length > 0) {
        setStudents(newStudents); setIsPasteModalOpen(false); setPasteText(""); alert(`นำเข้ารายชื่อสำเร็จ ${newStudents.length} คน!`);
      }
    } catch (e) { alert("เกิดข้อผิดพลาดในการประมวลผลข้อมูล"); }
  };

  const handleSaveToDatabase = async () => {
    if (students.length === 0) return alert("กรุณานำเข้านักเรียนก่อนบันทึกครับ");
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const gbPayload = {
        teacher_id: user.id, school_id: headerInfo.school_id, school_name: headerInfo.school_name,
        department: headerInfo.department, subject_code: headerInfo.subject_code, subject_name: headerInfo.subject_name,
        credits: headerInfo.credits, teacher_name: headerInfo.teacher_name, grade_level: headerInfo.grade_level,
        room: headerInfo.room, term: headerInfo.term, columns_config: columns, pin_code: activePin
      };

      let currentGbId = activeGbId;
      if (currentGbId) await supabase.from('gradebooks').update(gbPayload).eq('id', currentGbId);
      else {
        const { data } = await supabase.from('gradebooks').insert(gbPayload).select('id').single();
        if (data) { currentGbId = data.id; setActiveGbId(data.id); }
      }

      if (currentGbId) {
        const stdPayload = students.map((std, idx) => ({
          gradebook_id: currentGbId, student_code: std.studentId, student_name: std.name, 
          order_number: idx + 1, scores: std.scores, exam_token: std.examToken 
        }));
        await supabase.from('student_grades').upsert(stdPayload, { onConflict: 'gradebook_id,student_code' });
      }
      alert("บันทึกข้อมูล ปพ.5 ลงฐานข้อมูลสำเร็จแล้ว!");
    } catch (e: any) { alert("Error: " + e.message); } finally { setIsSaving(false); }
  };

  const handleGeneratePreview = async () => {
    if (!selectedExamId) return alert("กรุณาเลือกชุดข้อสอบ");
    setIsCalculating(true);
    try {
      const selectedExam = importExams.find(e => e.id === selectedExamId);
      const { data: submissions } = await supabase.from('exam_submissions').select('student_id, score').eq('exam_id', selectedExamId);

      const mappedData = students.map(student => {
        const submission = submissions?.find(sub => sub.student_id === student.studentId);
        let rawScore = submission ? submission.score : 0;
        let isAbsent = !submission;
        let calcScore = (!isAbsent && selectedExam.total_score > 0) ? (rawScore / selectedExam.total_score) * importModal.maxScore : 0;
        return { ...student, rawScore, rawMaxScore: selectedExam.total_score, finalScore: isAbsent ? 0 : Math.round(calcScore * 100) / 100, isAbsent };
      });
      setPreviewData(mappedData);
    } catch (e) {} finally { setIsCalculating(false); }
  };

  const handleConfirmImport = () => {
    setStudents(prev => prev.map(std => {
      const previewMatch = previewData.find(p => p.studentId === std.studentId);
      if (previewMatch && !previewMatch.isAbsent) return { ...std, scores: { ...std.scores, [importModal.colId as string]: previewMatch.finalScore } };
      return std;
    }));
    setImportModal({ ...importModal, isOpen: false });
    alert("โอนคะแนนลงตารางสำเร็จ! (อย่าลืมกด 'บันทึก' เพื่ออัปเดตลงฐานข้อมูล)");
  };

  const calculateGrade = (totalScore: number) => {
    if (totalScore >= 80) return '4.0'; if (totalScore >= 75) return '3.5';
    if (totalScore >= 70) return '3.0'; if (totalScore >= 65) return '2.5';
    if (totalScore >= 60) return '2.0'; if (totalScore >= 55) return '1.5';
    if (totalScore >= 50) return '1.0'; return '0';
  };

  const generateRandomTokens = () => {
    if(students.length === 0) return alert("กรุณานำเข้านักเรียนก่อนสร้างรหัสครับ");
    const confirmGenerate = window.confirm("การสุ่มใหม่จะเขียนทับรหัสผ่านเดิมทั้งหมดที่ยังไม่ได้บันทึก คุณต้องการดำเนินการต่อหรือไม่?");
    if (!confirmGenerate) return;

    setStudents(prev => prev.map(std => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let token = '';
      for (let i = 0; i < 4; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
      return { ...std, examToken: token };
    }));
  };

  const getMode = (arr?: (number | null)[]) => {
    if (!arr || arr.length === 0) return '';
    const counts: Record<number, number> = {};
    let maxCount = 0;
    let mode: number | null = null;
    for (let num of arr) {
      if (num === null || isNaN(num)) continue;
      counts[num] = (counts[num] || 0) + 1;
      if (counts[num] > maxCount) { maxCount = counts[num]; mode = num; } 
      else if (counts[num] === maxCount && mode !== null) { if (num > mode) mode = num; }
    }
    return mode === null ? '' : mode;
  };

  const handleExportSGS = () => {
    if (students.length === 0) return alert("ยังไม่มีข้อมูลนักเรียนสำหรับดาวน์โหลดครับ");
    try {
      const exportData = students.map((std, index) => {
        const pre = Object.keys(std.scores).filter(k => k.startsWith('pre')).reduce((s, k) => s + std.scores[k], 0);
        const mid = Object.keys(std.scores).filter(k => k.startsWith('mid')).reduce((s, k) => s + std.scores[k], 0);
        const post = Object.keys(std.scores).filter(k => k.startsWith('post')).reduce((s, k) => s + std.scores[k], 0);
        const fin = Object.keys(std.scores).filter(k => k.startsWith('fin')).reduce((s, k) => s + std.scores[k], 0);
        const total = pre + mid + post + fin;
        const grade = calculateGrade(total);

        const litMode = getMode(std.evals?.literacy);    
        const charMode = getMode(std.evals?.character);  

        return {
          'ลำดับ': index + 1, 'รหัสนักเรียน': std.studentId, 'ชื่อ - นามสกุล': std.name,
          'ก่อนกลางภาค': pre, 'กลางภาค': mid, 'หลังกลางภาค': post, 'ปลายภาค': fin, 'รวม': total,
          'ระดับผลการเรียน': grade, 'คุณลักษณะฯ': charMode, 'อ่าน คิด เขียน': litMode    
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const wscols = [{ wch: 8 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SGS_Format');
      
      const fileName = `SGS_คะแนน_${headerInfo.subject_code}_${headerInfo.grade_level}_ห้อง${headerInfo.room}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) { alert("เกิดข้อผิดพลาด! กรุณาตรวจสอบว่าได้รันคำสั่ง npm install xlsx ใน Terminal แล้วหรือไม่"); }
  };


  // --- 🟢 RENDER LOBBY ---
  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-5xl z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4"><div className="bg-slate-900/80 p-4 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md"><img src="/niivaa_smartexam_logo.png" alt="NiiVaa" className="h-12 object-contain" onError={(e) => e.currentTarget.style.display='none'} /></div></div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200 mb-2">ยินดีต้อนรับสู่ NiiVaa Gradebook</h1>
            <p className="text-gray-400">เลือกระบบสมุดบันทึกผลการเรียนของคุณเพื่อจัดการคะแนน หรือสร้างรายวิชาใหม่</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div onClick={() => setNewModal({ isOpen: true, pin: '', confirmPin: '', error: '' })} className="bg-slate-900/50 hover:bg-slate-800/80 border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group min-h-[220px]">
              <div className="bg-blue-500/10 p-4 rounded-full text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all"><Plus size={32} /></div>
              <h3 className="font-bold text-blue-400">สร้างสมุด ปพ.5 เล่มใหม่</h3>
            </div>
            {isLobbyLoading ? <div className="col-span-1 md:col-span-2 flex items-center justify-center text-gray-500"><Loader2 className="animate-spin mr-2"/> กำลังโหลดข้อมูล...</div> : lobbyGradebooks.map(gb => (
                <div key={gb.id} onClick={() => setAuthModal({ isOpen: true, gradebook: gb, pin: '', error: '' })} className="bg-slate-900 border border-white/10 hover:border-white/30 rounded-3xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-2xl group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-4"><div className="bg-white/5 text-gray-300 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-widest">{gb.subject_code || 'N/A'}</div><Lock size={16} className="text-gray-500 group-hover:text-amber-500 transition-colors" /></div>
                  <h3 className="text-xl font-bold text-white mb-1 truncate">{gb.subject_name || 'วิชาที่ยังไม่ตั้งชื่อ'}</h3>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mb-4"><FolderOpen size={14}/> {gb.grade_level} {gb.room ? `ห้อง ${gb.room}` : ''}</div>
                  <div className="pt-4 border-t border-white/5 text-xs text-gray-500 flex justify-between"><span>เทอม {gb.term || '-'}</span><span>อัปเดต: {new Date(gb.updated_at).toLocaleDateString('th-TH')}</span></div>
                </div>
            ))}
          </div>
          
          <div className="mt-10 flex justify-center gap-4">
             <button onClick={() => router.push('/smart-exam-dashboard')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"><Home size={18}/> กลับหน้า Dashboard</button>
             <button onClick={() => router.push('/smartexam/gradebook2')} className="px-6 py-3 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl font-bold flex items-center gap-2 transition-colors"><BookOpen size={18}/> ประเมินสมรรถนะ (ปพ.5 ส่วนที่ 2)</button>
          </div>
        </div>

        {/* Modals... */}
        {authModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setAuthModal({...authModal, isOpen: false})}></div>
            <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
              <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mb-4"><Lock size={28} /></div>
              <h2 className="text-xl font-bold text-white mb-2">ป้อนรหัสความปลอดภัย</h2>
              <p className="text-sm text-gray-400 mb-6">รหัสผ่านเพื่อเปิดสมุดวิชา <b className="text-amber-400">{authModal.gradebook?.subject_name}</b></p>
              <input type="password" placeholder="••••••" maxLength={6} value={authModal.pin} onChange={e => setAuthModal({...authModal, pin: e.target.value, error: ''})} onKeyDown={e => e.key === 'Enter' && handleAuthSubmit()} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:border-amber-500 mb-2 font-mono" />
              {authModal.error && <p className="text-xs text-red-400 mb-4 animate-bounce">{authModal.error}</p>}
              <div className="flex gap-3 mt-6"><button onClick={() => setAuthModal({...authModal, isOpen: false})} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold">ยกเลิก</button><button onClick={handleAuthSubmit} className="flex-1 py-3 bg-amber-500 text-black font-bold rounded-xl flex justify-center items-center gap-2"><Unlock size={18}/> เข้าสู่ระบบ</button></div>
            </div>
          </div>
        )}

        {newModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setNewModal({...newModal, isOpen: false})}></div>
            <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
              <div className="mx-auto w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-4"><BookOpen size={28} /></div>
              <h2 className="text-xl font-bold text-white mb-2">ตั้งรหัสความปลอดภัย</h2>
              <p className="text-sm text-gray-400 mb-6">ตั้งรหัสผ่านสำหรับเปิดสมุดเล่มนี้ (ตัวเลข 4-6 หลัก)</p>
              <input type="password" placeholder="ตั้งรหัสผ่านใหม่" value={newModal.pin} onChange={e => setNewModal({...newModal, pin: e.target.value, error: ''})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-center text-lg focus:border-blue-500 mb-3" />
              <input type="password" placeholder="ยืนยันรหัสผ่าน" value={newModal.confirmPin} onChange={e => setNewModal({...newModal, confirmPin: e.target.value, error: ''})} onKeyDown={e => e.key === 'Enter' && handleCreateNewSubmit()} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-center text-lg focus:border-blue-500 mb-2" />
              {newModal.error && <p className="text-xs text-red-400 mb-4">{newModal.error}</p>}
              <div className="flex gap-3 mt-6"><button onClick={() => setNewModal({...newModal, isOpen: false})} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold">ยกเลิก</button><button onClick={handleCreateNewSubmit} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">สร้างสมุด ปพ.5</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 🟢 RENDER EDITOR ---
  if (isEditorLoading) return <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-gray-400"><Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" /> กำลังดึงข้อมูลสมุดบันทึกผลการเรียน...</div>;

  const preMax = columns.preMidterm.reduce((s, c) => s + c.maxScore, 0); const midMax = columns.midterm.reduce((s, c) => s + c.maxScore, 0);
  const postMax = columns.postMidterm.reduce((s, c) => s + c.maxScore, 0); const finalMax = columns.final.reduce((s, c) => s + c.maxScore, 0);
  const totalMidtermMax = preMax + midMax + postMax; const totalMax = totalMidtermMax + finalMax;

  const renderEditableHeader = (col: ScoreColumn, section: SectionKey) => (
    <th key={col.id} className="border border-gray-300 p-1 w-14 bg-white relative group">
      <div className="flex flex-col items-center justify-center gap-0.5 pt-1">
        <button onClick={() => setImportModal({ isOpen: true, section, colId: col.id, colName: col.name, maxScore: col.maxScore })} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100 p-0.5 rounded transition-all z-20 no-print" title="ดึงคะแนนจากระบบสอบออนไลน์"><CloudDownload size={14}/></button>
        <input type="text" value={col.name} onChange={(e) => handleUpdateColumn(section, col.id, 'name', e.target.value)} className="w-10 text-center text-[12px] font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-100 focus:bg-white border-b border-dashed border-blue-300 outline-none print:border-none print:bg-transparent" title="แก้ไขชื่อ/เลข" />
        <div className="flex items-center text-[11px] font-bold text-blue-700">(<input type="number" value={col.maxScore === 0 ? '' : col.maxScore} onChange={(e) => handleUpdateColumn(section, col.id, 'maxScore', e.target.value)} className="w-7 text-center text-blue-700 bg-blue-50/50 hover:bg-blue-100 focus:bg-white border-b border-dashed border-blue-300 outline-none hide-arrows print:border-none print:bg-transparent" title="คะแนนเต็ม"/>)</div>
      </div>
    </th>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      
      {/* 🌟 พิมพ์ PDF CSS */}
      <style>{`
        .hide-arrows::-webkit-inner-spin-button, .hide-arrows::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } .hide-arrows { -moz-appearance: textfield; }
        
        @media print {
          @page {
            size: ${printMode === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 0.5cm;
          }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-border { border-color: #000 !important; border-width: 1px !important; }
          .bg-white { background-color: transparent !important; }
          input { color: black !important; border: none !important; background: transparent !important; }
          .print-header { display: block !important; margin-bottom: 20px; text-align: center; font-weight: bold; color: black; }
          
          /* บังคับตารางให้พอดีกระดาษ */
          .print-scale-table {
             width: 100% !important;
             max-width: 100% !important;
             font-size: ${printMode === 'landscape' ? '11px' : '9px'} !important;
             zoom: ${printMode === 'landscape' ? '0.9' : '0.75'};
          }
          th, td { padding: 2px !important; border-color: #000 !important; }
        }
      `}</style>
      
      {/* NAVBAR */}
      <nav className="w-full border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 no-print">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/smart-exam-dashboard')} className="p-2 hover:bg-white/10 rounded-full text-gray-400" title="กลับหน้า Dashboard"><Home size={20} /></button>
            <h1 className="text-lg font-bold flex items-center gap-2"><BookOpen className="text-amber-500" /> สมุดบันทึก ปพ.5 (ส่วนที่ 1)</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* ปุ่มตั้งค่าพิมพ์ */}
            <button onClick={() => setIsPrintModalOpen(true)} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl flex items-center gap-2 text-sm font-bold transition-all" title="พิมพ์หน้านี้เป็น PDF">
              <Printer size={16} /> <span className="hidden lg:inline">พิมพ์ PDF</span>
            </button>
            <button onClick={() => router.push('/smartexam/gradebook2')} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-indigo-500/10">
              <Layers size={16} /> <span className="hidden sm:inline">ประเมิน ปพ.5 (ส่วนที่ 2)</span>
            </button>
            <div className="w-px h-6 bg-white/10 mx-1 hidden md:block"></div>
            <button onClick={handleExportSGS} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-sm font-bold transition-all">
              <FileSpreadsheet size={16} /> <span className="hidden lg:inline">Export SGS</span>
            </button>
            <button onClick={handleSaveToDatabase} disabled={isSaving} className="px-5 py-2 bg-amber-500 text-black hover:bg-amber-400 rounded-xl flex items-center gap-2 text-sm font-black shadow-lg">
              {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} บันทึก
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 mt-6 space-y-4">
        
        {/* Print Header (แสดงเฉพาะตอน Print) */}
        <div className="hidden print-header text-black">
          <h2 className="text-xl">สมุดบันทึกผลการเรียน ปพ.5 (ส่วนที่ 1)</h2>
          <p className="font-normal mt-2">โรงเรียน {headerInfo.school_name} ภาคเรียนที่ {headerInfo.term} รหัสวิชา {headerInfo.subject_code} วิชา {headerInfo.subject_name}</p>
          <p className="font-normal">ระดับชั้น {headerInfo.grade_level} ห้อง {headerInfo.room} ครูผู้สอน: {headerInfo.teacher_name}</p>
        </div>

        {/* Toggle Head */}
        <div className="flex justify-between items-center bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 cursor-pointer hover:bg-slate-800 transition-colors shadow-lg no-print" onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}>
          <div className="flex items-center gap-3 text-amber-500 font-bold"><Building size={20}/> ตั้งค่าหน้าปก ปพ.5 และจัดการรายชื่อ</div>
          <div className="flex items-center gap-4">
            <button onClick={(e) => { e.stopPropagation(); setIsManualOpen(true); }} className="text-blue-400 text-sm font-bold flex items-center gap-1 hover:text-blue-300"><HelpCircle size={16}/> คู่มือ</button>
            <button className="text-gray-400">{isHeaderExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</button>
          </div>
        </div>

        {/* Collapsed Section */}
        <div className={`space-y-4 transition-all duration-300 origin-top no-print ${isHeaderExpanded ? 'block animate-in fade-in' : 'hidden'}`}>
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
              <div className="space-y-1"><label className="text-xs text-gray-400">สถานศึกษา</label><input type="text" value={headerInfo.school_name} onChange={e => setHeaderInfo({...headerInfo, school_name: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none" /></div>
              <div className="space-y-1 lg:col-span-1">
                <label className="text-xs text-gray-400">หมวดวิชา</label>
                <select value={headerInfo.department} onChange={e => setHeaderInfo({...headerInfo, department: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none">
                  <optgroup label="แกนกลางฯ"><option>คณิตศาสตร์</option><option>วิทยาศาสตร์และเทคโนโลยี</option><option>ภาษาไทย</option><option>ภาษาต่างประเทศ</option><option>สังคมศึกษาฯ</option><option>สุขศึกษาและพลศึกษา</option><option>ศิลปศึกษา</option><option>การงานอาชีพ</option></optgroup>
                  <optgroup label="อาชีวศึกษา"><option>สมรรถนะแกนกลาง</option><option>สมรรถนะวิชาชีพ</option></optgroup>
                </select>
              </div>
              <div className="space-y-1"><label className="text-xs text-gray-400">รหัสวิชา</label><input type="text" value={headerInfo.subject_code} onChange={e => setHeaderInfo({...headerInfo, subject_code: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none" /></div>
              <div className="space-y-1"><label className="text-xs text-gray-400">รายวิชา</label><input type="text" value={headerInfo.subject_name} onChange={e => setHeaderInfo({...headerInfo, subject_name: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none" /></div>
              <div className="space-y-1"><label className="text-xs text-gray-400">ครูผู้สอน</label><input type="text" value={headerInfo.teacher_name} onChange={e => setHeaderInfo({...headerInfo, teacher_name: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none" /></div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">ระดับชั้น</label>
                <select value={headerInfo.grade_level} onChange={e => setHeaderInfo({...headerInfo, grade_level: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-amber-500 outline-none">
                  <option>ป.1</option><option>ป.2</option><option>ป.3</option><option>ป.4</option><option>ป.5</option><option>ป.6</option>
                  <option>ม.1</option><option>ม.2</option><option>ม.3</option><option>ม.4</option><option>ม.5</option><option>ม.6</option>
                  <option>ปวช.1</option><option>ปวช.2</option><option>ปวช.3</option><option>ปวส.1</option><option>ปวส.2</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1"><label className="text-xs text-gray-400">ห้อง (ทับ)</label><input type="text" value={headerInfo.room} onChange={e => setHeaderInfo({...headerInfo, room: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-center focus:border-amber-500 outline-none" /></div>
                <div className="space-y-1"><label className="text-xs text-gray-400">ภาคเรียน</label><input type="text" value={headerInfo.term} onChange={e => setHeaderInfo({...headerInfo, term: e.target.value})} className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-center focus:border-amber-500 outline-none" /></div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input type="text" placeholder="ค้นหานักเรียน..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            
            <div className="flex w-full md:w-auto gap-3">
              <button onClick={() => setIsTokenModalOpen(true)} className="flex-1 md:flex-none px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-bold flex gap-2 hover:bg-purple-600/30 transition-all">
                <Key size={16}/> จัดการรหัสเข้าสอบ
              </button>
              <button onClick={() => setIsPasteModalOpen(true)} className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20">
                <ClipboardPaste size={16}/> วางรายชื่อจาก Excel
              </button>
            </div>
          </div>
        </div>

        {/* 🟢 Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-gray-300 mt-4 print-border">
          <div className="overflow-x-auto pb-4">
            <table className="print-scale-table text-black border-collapse min-w-[1200px] print-border" style={{ fontSize: '13px' }}>
              <thead className="bg-gray-100 text-center font-bold">
               <tr>
                  <th colSpan={3} className="border border-gray-300 print-border p-2 bg-gray-200">อัตราส่วนคะแนนระหว่างภาค : ปลายภาค = 80 : 20</th>
                  <th colSpan={columns.preMidterm.length + columns.midterm.length + columns.postMidterm.length + 3} className="border border-gray-300 print-border p-2 bg-gray-200">การวัดผลระหว่างภาค</th>
                  <th colSpan={columns.final.length + 1} className="border border-gray-300 print-border p-2 bg-gray-200">การวัดผลปลายภาค</th>
                  <th colSpan={3} className="border border-gray-300 print-border p-2 bg-gray-200">รวม / สรุป</th>
                </tr>
                <tr>
                  <th rowSpan={3} className="border border-gray-300 print-border w-10 sticky left-0 bg-gray-200 z-10">เลขที่</th>
                  <th rowSpan={3} className="border border-gray-300 print-border w-16 sticky left-[40px] bg-gray-200 z-10">เลขประจำตัว</th>
                  <th rowSpan={3} className="border border-gray-300 print-border w-40 sticky left-[104px] bg-gray-200 z-10">ชื่อ - สกุล<br/><span className="text-[10px] font-normal no-print">{headerInfo.grade_level}/{headerInfo.room}</span></th>
                  <th colSpan={columns.preMidterm.length + 1} className="border border-gray-300 print-border p-1 relative group">ก่อนกลางภาค<button onClick={() => handleAddColumn('preMidterm')} className="absolute top-1 right-1 text-blue-600 hover:text-blue-800 opacity-50 group-hover:opacity-100 no-print"><PlusCircle size={14}/></button></th>
                  <th colSpan={columns.midterm.length + 1} className="border border-gray-300 print-border p-1 relative group">กลางภาค<button onClick={() => handleAddColumn('midterm')} className="absolute top-1 right-1 text-blue-600 hover:text-blue-800 opacity-50 group-hover:opacity-100 no-print"><PlusCircle size={14}/></button></th>
                  <th colSpan={columns.postMidterm.length + 1} className="border border-gray-300 print-border p-1 relative group">หลังกลางภาค<button onClick={() => handleAddColumn('postMidterm')} className="absolute top-1 right-1 text-blue-600 hover:text-blue-800 opacity-50 group-hover:opacity-100 no-print"><PlusCircle size={14}/></button></th>
                  <th colSpan={columns.final.length + 1} className="border border-gray-300 print-border p-1 relative group">ปลายภาค<button onClick={() => handleAddColumn('final')} className="absolute top-1 right-1 text-blue-600 hover:text-blue-800 opacity-50 group-hover:opacity-100 no-print"><PlusCircle size={14}/></button></th>
                  {/* 👇 ปรับช่องสรุปด้านหลังจาก w-12 ให้เล็กลงเหลือ w-10 */}
                  <th rowSpan={2} className="border border-gray-300 print-border w-10">ระหว่าง<br/>ภาค</th><th rowSpan={2} className="border border-gray-300 print-border w-10">ทั้งหมด</th><th rowSpan={2} className="border border-gray-300 print-border w-10">ระดับ</th>
                </tr>
                <tr className="text-[11px]">
                  {/* 👇 เพิ่ม w-8 เข้าไปที่ช่องรวมคะแนนทั้ง 4 ช่องเพื่อให้เล็กลง 50% */}
                  <th colSpan={columns.preMidterm.length} className="border border-gray-300 print-border p-1">ตัวชี้วัด/คะแนน</th><th rowSpan={2} className="border border-gray-300 print-border p-1 w-8 bg-amber-50">รวม<br/><span className="inline-block mt-1 bg-[#4A72B2] text-white px-1.5 py-0.5 rounded print:text-black print:bg-transparent">{preMax}</span></th>
                  <th colSpan={columns.midterm.length} className="border border-gray-300 print-border p-1">ตัวชี้วัด/คะแนน</th><th rowSpan={2} className="border border-gray-300 print-border p-1 w-8 bg-amber-50">รวม<br/><span className="inline-block mt-1 bg-[#4A72B2] text-white px-1.5 py-0.5 rounded print:text-black print:bg-transparent">{midMax}</span></th>
                  <th colSpan={columns.postMidterm.length} className="border border-gray-300 print-border p-1">ตัวชี้วัด/คะแนน</th><th rowSpan={2} className="border border-gray-300 print-border p-1 w-8 bg-amber-50">รวม<br/><span className="inline-block mt-1 bg-[#4A72B2] text-white px-1.5 py-0.5 rounded print:text-black print:bg-transparent">{postMax}</span></th>
                  <th colSpan={columns.final.length} className="border border-gray-300 print-border p-1">ตัวชี้วัด/คะแนน</th><th rowSpan={2} className="border border-gray-300 print-border p-1 w-8 bg-blue-50">รวม<br/><span className="inline-block mt-1 bg-[#4A72B2] text-white px-1.5 py-0.5 rounded print:text-black print:bg-transparent">{finalMax}</span></th>
                </tr>
                <tr className="bg-white text-[11px]">
                  {columns.preMidterm.map(col => renderEditableHeader(col, 'preMidterm'))}{columns.midterm.map(col => renderEditableHeader(col, 'midterm'))}
                  {columns.postMidterm.map(col => renderEditableHeader(col, 'postMidterm'))}{columns.final.map(col => renderEditableHeader(col, 'final'))}
                  <th className="border border-gray-300 print-border p-1 bg-amber-100 font-bold text-amber-700 w-10">({totalMidtermMax})</th>
                  <th className="border border-gray-300 print-border p-1 bg-green-100 font-black text-green-700 w-10">({totalMax})</th><th className="border border-gray-300 print-border bg-purple-100 w-10">เกรด</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {students.length === 0 ? (
                  <tr><td colSpan={100} className="text-center py-12 text-gray-400 bg-gray-50">ยังไม่มีข้อมูลนักเรียน กดปุ่ม <b>"วางรายชื่อจาก Excel"</b></td></tr>
                ) : (
                  filteredStudents.map((student, index) => {
                    const pre = Object.keys(student.scores).filter(k => k.startsWith('pre')).reduce((s, k) => s + student.scores[k], 0);
                    const mid = Object.keys(student.scores).filter(k => k.startsWith('mid')).reduce((s, k) => s + student.scores[k], 0);
                    const post = Object.keys(student.scores).filter(k => k.startsWith('post')).reduce((s, k) => s + student.scores[k], 0);
                    const fin = Object.keys(student.scores).filter(k => k.startsWith('fin')).reduce((s, k) => s + student.scores[k], 0);
                    const tm = pre + mid + post; const ts = tm + fin; const g = calculateGrade(ts);

                    return (
                      <tr key={student.id} className="hover:bg-blue-50 text-center">
                        <td className="border border-gray-300 print-border sticky left-0 bg-white z-10">{index + 1}</td>
                        <td className="border border-gray-300 print-border sticky left-[40px] bg-white z-10 font-mono text-xs">{student.studentId}</td>
                        <td className="border border-gray-300 print-border p-2 text-left sticky left-[104px] bg-white z-10 whitespace-nowrap">
                          {student.name}
                          {!student.examToken && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full no-print" title="ยังไม่มีรหัสเข้าสอบ"></span>}
                        </td>
                        
                        {columns.preMidterm.map(col => (<td key={col.id} className="border border-gray-300 print-border p-0"><input type="number" value={student.scores[col.id] ?? ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} className="w-full h-full text-center py-2 focus:bg-blue-100 outline-none hide-arrows font-medium" /></td>))}
                        <td className="border border-gray-300 print-border p-1 font-bold bg-amber-50">{pre}</td>
                        {columns.midterm.map(col => (<td key={col.id} className="border border-gray-300 print-border p-0"><input type="number" value={student.scores[col.id] ?? ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} className="w-full h-full text-center py-2 focus:bg-blue-100 outline-none hide-arrows font-medium" /></td>))}
                        <td className="border border-gray-300 print-border p-1 font-bold bg-amber-50">{mid}</td>
                        {columns.postMidterm.map(col => (<td key={col.id} className="border border-gray-300 print-border p-0"><input type="number" value={student.scores[col.id] ?? ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} className="w-full h-full text-center py-2 focus:bg-blue-100 outline-none hide-arrows font-medium" /></td>))}
                        <td className="border border-gray-300 print-border p-1 font-bold bg-amber-50">{post}</td>
                        {columns.final.map(col => (<td key={col.id} className="border border-gray-300 print-border p-0"><input type="number" value={student.scores[col.id] ?? ''} onChange={(e) => handleScoreChange(student.id, col.id, e.target.value)} className="w-full h-full text-center py-2 focus:bg-blue-100 outline-none hide-arrows font-medium" /></td>))}
                        <td className="border border-gray-300 print-border p-1 font-bold bg-blue-50">{fin}</td>
                        <td className="border border-gray-300 print-border font-bold text-amber-600 bg-amber-50">{tm}</td>
                        <td className="border border-gray-300 print-border font-black text-green-600 bg-green-50">{ts}</td>
                        <td className={"border border-gray-300 print-border font-black bg-purple-50 " + (g === '0' || g === '1.0' ? "text-red-500 print:text-black" : "text-purple-600 print:text-black")}>{g}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 🌟 Modal 1: จัดการพิมพ์ PDF */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in zoom-in-95">
            <Printer size={40} className="mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">ตั้งค่าการพิมพ์ ปพ.5</h2>
            <p className="text-sm text-gray-400 mb-6">เลือกรูปแบบหน้ากระดาษเพื่อบันทึกเป็น PDF</p>
            
            <div className="space-y-3">
              <button onClick={() => { setIsPrintModalOpen(false); setPrintMode('portrait'); }} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <FileText size={18} /> A4 แนวตั้ง (ย่อพอดีหน้า)
              </button>
              <button onClick={() => { setIsPrintModalOpen(false); setPrintMode('landscape'); }} className="w-full py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <FileText size={18} className="rotate-90" /> A4 แนวนอน (ตารางกว้าง)
              </button>
            </div>
            <button onClick={() => setIsPrintModalOpen(false)} className="mt-6 w-full py-2 text-gray-500 hover:text-white text-sm font-bold">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* 🌟 Slide-over Drawer: คู่มืออัจฉริยะแบบ Accordion */}
      {isManualOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end no-print">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsManualOpen(false)}></div>
          <div className="relative w-full max-w-md bg-[#0f172a] h-full border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950/80">
              <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2"><BookOpen size={20}/> คู่มือใช้งาน ปพ.5</h2>
              <button onClick={() => setIsManualOpen(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full hover:bg-white/10"><X size={18}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-sm text-gray-300 scrollbar-hide">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                <p className="leading-relaxed text-amber-300">ยินดีต้อนรับสู่ระบบสมุดบันทึกผลการเรียนอัจฉริยะ คุณสามารถจัดการโครงสร้างและประเมินผลได้อย่างยืดหยุ่น</p>
              </div>

              {/* Accordion 1: โครงสร้างตาราง */}
              <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
                <button onClick={() => setActiveAccordion(activeAccordion === 'struct' ? null : 'struct')} className="w-full p-4 text-left bg-slate-900/50 hover:bg-slate-800/80 flex justify-between items-center font-bold text-gray-200">
                  <span className="flex gap-2 items-center"><Layers size={16} className="text-blue-400"/> การจัดการโครงสร้างตาราง</span>
                  <ChevronDown size={16} className={`transition-transform ${activeAccordion === 'struct' ? 'rotate-180' : ''}`} />
                </button>
                {activeAccordion === 'struct' && (
                  <div className="p-4 bg-slate-950/50 text-xs text-gray-400 leading-relaxed border-t border-white/5">
                    1. <b>เพิ่มคอลัมน์:</b> นำเมาส์ไปชี้ที่หัวข้อ เช่น "ก่อนกลางภาค" จะมีปุ่ม + สีฟ้า กดเพื่อเพิ่มช่อง<br/><br/>
                    2. <b>แก้ชื่อและคะแนนเต็ม:</b> คลิกที่ตัวเลขบนหัวตาราง (เช่น 1 หรือ 10) เพื่อพิมพ์แก้ไขได้ทันที<br/><br/>
                    3. <b>การคำนวณ:</b> ระบบจะรวมคะแนนตามช่องสีและคำนวณเกรด (0 - 4.0) อัตโนมัติเมื่อพิมพ์
                  </div>
                )}
              </div>

              {/* Accordion 2: วาง Excel */}
              <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
                <button onClick={() => setActiveAccordion(activeAccordion === 'excel' ? null : 'excel')} className="w-full p-4 text-left bg-slate-900/50 hover:bg-slate-800/80 flex justify-between items-center font-bold text-gray-200">
                  <span className="flex gap-2 items-center"><ClipboardPaste size={16} className="text-emerald-400"/> การนำเข้ารายชื่อจาก Excel</span>
                  <ChevronDown size={16} className={`transition-transform ${activeAccordion === 'excel' ? 'rotate-180' : ''}`} />
                </button>
                {activeAccordion === 'excel' && (
                  <div className="p-4 bg-slate-950/50 text-xs text-gray-400 leading-relaxed border-t border-white/5">
                    เปิดไฟล์ Excel ของคุณ ลากคลุมเฉพาะ <b>3 คอลัมน์</b> ได้แก่: <br/>
                    <code className="bg-black px-2 py-1 rounded mt-1 mb-2 inline-block">1.เลขที่ &gt; 2.รหัส &gt; 3.ชื่อ-สกุล</code><br/>
                    จากนั้นกด Ctrl+C แล้วมากดปุ่ม <b>"วางรายชื่อจาก Excel"</b> ในระบบนี้แล้วกด Ctrl+V
                  </div>
                )}
              </div>

              {/* Accordion 3: ดึงคะแนน */}
              <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
                <button onClick={() => setActiveAccordion(activeAccordion === 'import' ? null : 'import')} className="w-full p-4 text-left bg-slate-900/50 hover:bg-slate-800/80 flex justify-between items-center font-bold text-gray-200">
                  <span className="flex gap-2 items-center"><CloudDownload size={16} className="text-cyan-400"/> การดึงคะแนนสอบจากระบบออนไลน์</span>
                  <ChevronDown size={16} className={`transition-transform ${activeAccordion === 'import' ? 'rotate-180' : ''}`} />
                </button>
                {activeAccordion === 'import' && (
                  <div className="p-4 bg-slate-950/50 text-xs text-gray-400 leading-relaxed border-t border-white/5">
                    หากเด็กทำแบบทดสอบในระบบ NiiVaa SmartExam คุณสามารถดึงคะแนนมาลงช่องได้เลย โดยเอาเมาส์ชี้ที่หัวตาราง แล้วคลิกที่ไอคอน <b>ก้อนเมฆ (Cloud)</b> เลือกรอบสอบ ระบบจะทำการเทียบบัญญัติไตรยางศ์ให้อัตโนมัติ
                  </div>
                )}
              </div>

              {/* Accordion 4: รหัสเข้าสอบ */}
              <div className="border border-white/10 rounded-xl overflow-hidden mb-3">
                <button onClick={() => setActiveAccordion(activeAccordion === 'token' ? null : 'token')} className="w-full p-4 text-left bg-slate-900/50 hover:bg-slate-800/80 flex justify-between items-center font-bold text-gray-200">
                  <span className="flex gap-2 items-center"><Key size={16} className="text-purple-400"/> การจัดการรหัสเข้าสอบ (Tokens)</span>
                  <ChevronDown size={16} className={`transition-transform ${activeAccordion === 'token' ? 'rotate-180' : ''}`} />
                </button>
                {activeAccordion === 'token' && (
                  <div className="p-4 bg-slate-950/50 text-xs text-gray-400 leading-relaxed border-t border-white/5">
                    คลิกปุ่ม <b>"จัดการรหัสเข้าสอบ"</b> เพื่อให้ระบบสุ่มรหัสผ่าน 4 หลักแจกนักเรียนรายบุคคล จากนั้นกด <b>พิมพ์ใบแจกรหัส</b> เพื่อตัดแจกนักเรียนตอนเข้าห้องสอบ (ใช้ป้องกันการทุจริตแอบอ้างชื่อเพื่อนสอบ)
                  </div>
                )}
              </div>

              {/* Accordion 5: การประเมินส่วนที่ 2 */}
              <div className="border border-indigo-500/30 rounded-xl overflow-hidden mb-3 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                <button onClick={() => setActiveAccordion(activeAccordion === 'grade2' ? null : 'grade2')} className="w-full p-4 text-left bg-indigo-500/10 hover:bg-indigo-500/20 flex justify-between items-center font-bold text-indigo-300">
                  <span className="flex gap-2 items-center"><AlertCircle size={16} className="text-indigo-400"/> ประเมินสมรรถนะและคุณลักษณะฯ</span>
                  <ChevronDown size={16} className={`transition-transform ${activeAccordion === 'grade2' ? 'rotate-180' : ''}`} />
                </button>
                {activeAccordion === 'grade2' && (
                  <div className="p-4 bg-slate-950/80 text-xs text-indigo-200 leading-relaxed border-t border-indigo-500/20">
                    ⚠️ <b>อย่าลืม!</b> เมื่อบันทึกคะแนนส่วนนี้เสร็จแล้ว ให้คลิกปุ่ม <b>"ประเมิน ปพ.5 (ส่วนที่ 2)"</b> ที่เมนูด้านบนขวา เพื่อเข้าไปสุ่มเติมผลการประเมิน สมรรถนะ, การอ่านคิดเขียน, และคุณลักษณะอันพึงประสงค์ ก่อนส่งออกไฟล์ Export SGS
                  </div>
                )}
              </div>

            </div>
            
            <div className="p-4 border-t border-white/10 bg-slate-950/80 text-center">
              <p className="text-xs text-gray-500">NiiVaa SmartExam v2.0</p>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal 1: จัดการรหัสเข้าสอบ (Tokens) */}
      {isTokenModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsTokenModalOpen(false)}></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950">
              <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2"><Key size={22}/> ระบบสร้างรหัสผ่านรายบุคคล (Tokens)</h2>
              <button onClick={() => setIsTokenModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 shrink-0 bg-slate-900/50 border-b border-white/10 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-300">รหัสผ่านนี้ใช้คู่กับ <b>"เลขประจำตัว"</b> เพื่อให้นักเรียนล็อกอินเข้าทำข้อสอบ</p>
                <p className="text-xs text-purple-400 mt-1">* หากต้องการความปลอดภัยสูงสุด แนะนำให้กดสุ่มรหัสใหม่ก่อนสอบทุกครั้ง</p>
              </div>
              <button onClick={generateRandomTokens} className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all">
                <Dices size={18} /> สุ่มรหัสให้ทุกคน (4 หลัก)
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#020617] p-6">
              {students.length === 0 ? (
                <div className="text-center text-gray-500 py-10">ยังไม่มีรายชื่อนักเรียนในสมุด ปพ.5</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 bg-slate-900 border-b border-white/10">
                    <tr><th className="py-3 px-4 w-16 text-center">เลขที่</th><th className="py-3 px-4 w-32">รหัสประจำตัว</th><th className="py-3 px-4">ชื่อ - นามสกุล</th><th className="py-3 px-4 w-48 text-center bg-purple-500/10 text-purple-400">รหัสเข้าสอบ (Token)</th></tr>
                  </thead>
                  <tbody>
                    {students.map((std, idx) => (
                      <tr key={std.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 px-4 text-center text-gray-500">{idx + 1}</td><td className="py-3 px-4 font-mono text-gray-300">{std.studentId}</td><td className="py-3 px-4">{std.name}</td>
                        <td className="py-2 px-4 text-center">
                          <input type="text" maxLength={4} value={std.examToken || ''} onChange={(e) => { const val = e.target.value.toUpperCase(); setStudents(prev => prev.map(s => s.id === std.id ? { ...s, examToken: val } : s)); }} placeholder="----" className="w-24 bg-slate-950 border border-purple-500/30 rounded-lg py-1.5 text-center text-purple-400 font-black tracking-[0.2em] focus:outline-none focus:border-purple-500 uppercase" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-white/10 bg-slate-950 flex justify-end gap-3 shrink-0">
              <button onClick={() => { window.print(); }} className="px-6 py-2.5 rounded-xl text-gray-400 hover:bg-white/5 font-bold border border-white/10">🖨️ พิมพ์ใบแจกรหัส</button>
              <button onClick={() => { setIsTokenModalOpen(false); handleSaveToDatabase(); }} className="px-8 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2"><Save size={18}/> บันทึกรหัสทั้งหมด</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal วางข้อมูลจาก Excel */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/80" onClick={() => setIsPasteModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2"><ClipboardPaste/> นำเข้ารายชื่อนักเรียน</h2>
            <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="ลากคลุม 3 คอลัมน์ (เลขที่, รหัส, ชื่อ) จาก Excel แล้วกด Ctrl+V ที่นี่..." className="w-full h-64 bg-slate-950 p-4 text-white font-mono text-sm resize-none mb-4 rounded-xl border border-white/10"></textarea>
            <div className="flex gap-3"><button onClick={() => setIsPasteModalOpen(false)} className="flex-1 py-3 bg-white/5 rounded-xl">ยกเลิก</button><button onClick={handleProcessPaste} className="flex-1 py-3 bg-blue-600 font-bold rounded-xl">ตกลง นำเข้าข้อมูล</button></div>
          </div>
        </div>
      )}

      {/* Modal นำเข้าคะแนน (Import) */}
      {importModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-black/80" onClick={() => setImportModal({...importModal, isOpen: false})}></div>
          <div className="relative bg-slate-900 rounded-3xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-950">
              <h2 className="text-xl font-bold text-cyan-400"><CloudDownload className="inline mr-2"/>ดึงคะแนนเข้า ปพ.5</h2>
              <button onClick={() => setImportModal({...importModal, isOpen: false})} className="text-gray-400 hover:text-white"><X/></button>
            </div>
            <div className="p-6 shrink-0 bg-slate-900/50">
              <div className="flex gap-6 mb-4 text-sm bg-slate-950 p-4 rounded-xl border border-white/5">
                 <div><span className="text-gray-400">รหัสวิชา:</span> <span className="text-amber-400 font-bold px-2">{headerInfo.subject_code}</span></div>
                 <div><span className="text-gray-400">ระดับชั้น:</span> <span className="text-cyan-400 font-bold px-2">{headerInfo.grade_level}</span></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-400">เลือกข้อสอบ (มี {importExams.length} ชุด)</label>
                  <select value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="w-full bg-slate-950 rounded-xl px-4 py-2 mt-1 text-sm outline-none focus:border-cyan-500 border border-white/10">
                    <option value="">-- เลือก --</option>{importExams.map(ex => <option key={ex.id} value={ex.id}>{ex.title} (เต็ม {ex.total_score})</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-gray-400">ช่องปลายทาง</label><div className="bg-slate-950 rounded-xl px-4 py-2 mt-1 text-sm text-gray-400 truncate">จุดประสงค์ {importModal.colName}</div></div>
                <div><label className="text-xs text-gray-400">คะแนนเต็ม</label><div className="bg-cyan-500/10 rounded-xl px-4 py-2 mt-1 text-sm text-cyan-400 font-bold text-center">({importModal.maxScore})</div></div>
              </div>
              <button onClick={handleGeneratePreview} disabled={isCalculating || !selectedExamId} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 font-bold py-2.5 rounded-xl disabled:opacity-50">
                {isCalculating ? <Loader2 className="inline animate-spin mr-2" size={18}/> : <Calculator className="inline mr-2" size={18}/>} จำลองการแปลงคะแนน
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-[#020617]">
              {previewData.length > 0 ? (
                <table className="w-full text-sm text-center">
                  <thead className="text-xs text-gray-400 bg-slate-900 border-b border-white/10"><tr><th className="py-2">รหัส</th><th className="py-2">ชื่อ</th><th className="py-2">ดิบ (สอบ)</th><th className="py-2 text-cyan-400 bg-cyan-500/10">สุทธิ</th></tr></thead>
                  <tbody>{previewData.map((s,i) => (<tr key={i} className="border-b border-white/5"><td className="py-2 text-gray-400">{s.studentId}</td><td className="py-2">{s.name}</td><td className="py-2">{s.isAbsent?'-':s.rawScore}</td><td className="py-2 text-cyan-400 font-bold bg-cyan-500/5">{s.isAbsent?'-':s.finalScore}</td></tr>))}</tbody>
                </table>
              ) : <div className="text-center text-gray-500 mt-10">กรุณากดปุ่ม "จำลองการแปลงคะแนน"</div>}
            </div>
            <div className="p-4 bg-slate-950 flex justify-end gap-3 shrink-0"><button onClick={() => setImportModal({...importModal, isOpen: false})} className="px-6 py-2.5 rounded-xl text-gray-400 hover:bg-white/5">ยกเลิก</button><button onClick={handleConfirmImport} disabled={previewData.length===0} className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold disabled:opacity-50">โอนคะแนนลงตาราง</button></div>
          </div>
        </div>
      )}

    </div>
  );
}