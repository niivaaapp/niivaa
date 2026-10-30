'use client';
import RouteGuard from '@/components/RouteGuard';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckSquare, LayoutGrid, UploadCloud, Tv, MonitorPlay, Plus, CheckCircle2, X, Edit2, Trash2, DownloadCloud, Library, Search, Loader2, Eye, EyeOff, MessageSquare, Check, RefreshCw, BookOpen, ChevronDown } from 'lucide-react';
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface MediaFile { name: string; url: string; type: 'image' | 'video'; }
interface AgendaItem {
  id: string; title: string; duration_minutes: number; sort_order: number;
  main_script: string; sub_script: string; visual_audio_cue: string;
  responsible_person: string; is_live_now: boolean; force_media_trigger: string;
}
interface QuizQuestion {
  id: string; question_type: string; question_text: string;
  options: string[]; correct_answer: string; explanation: string;
}

function DirectorControllerContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');

  const [tickerMsg, setTickerMsg] = useState('');
  const [tickerDirection, setTickerDirection] = useState('rtl');
  const [tickerColor, setTickerColor] = useState('#FFFFFF');
  const [tickerBgColor, setTickerBgColor] = useState('#000000'); // 🌟 เพิ่มบรรทัดนี้
  const [galleryInterval, setGalleryInterval] = useState(4);
  const [availableMedia, setAvailableMedia] = useState<MediaFile[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [startTime, setStartTime] = useState('');
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editMainScript, setEditMainScript] = useState('');
  // 🌟 State สำหรับจัดการ SMS Modal
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [allSms, setAllSms] = useState<any[]>([]);
  const [editingSmsId, setEditingSmsId] = useState<string | null>(null);
  const [editSmsText, setEditSmsText] = useState("");
  // 🌟 State สำหรับระบบอัปโหลดสื่อ
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("seaPool");
  const [isUploading, setIsUploading] = useState(false);

  // 🌟 State ควบคุมการเปิด/ปิด คู่มือ (Slide-over Drawer)
  const [showGuideDrawer, setShowGuideDrawer] = useState(false);

  // หมวดหมู่ทั้งหมดตามที่คุณต้องการ
  const mediaCategories = [
    { id: 'seaPool', label: '🌊 หมวดวิวทะเล' },
    { id: 'skyPool', label: '☁️ หมวดวิวท้องฟ้า' },
    { id: 'naturePool', label: '🌲 หมวดวิวธรรมชาติ (ป่าไม้ ภูเขา)' },
    { id: 'cityPool', label: '🏙️ หมวดวิวชีวิตในเมือง (อาคาร ถนน)' },
    { id: 'cyberVideoPool', label: '🌌 หมวดนีออนไซเบอร์ (วิดีโอ)' },
    { id: 'waveVideoPool', label: '🌊 หมวดคลื่นทะเลลูป (วิดีโอ)' }
  ];
  const [showMiniMonitor, setShowMiniMonitor] = useState(false);
  const [monitorPos, setMonitorPos] = useState({ x: 50, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0 });
  const [iframeRefreshKey, setIframeRefreshKey] = useState(0);

  const [questionBank, setQuestionBank] = useState<QuizQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [localQuestion, setLocalQuestion] = useState('กรุณาเลือกคำถามจากคลังด้านบน...');
  const [localAnswer, setLocalAnswer] = useState('-');
  const [localQuestionType, setLocalQuestionType] = useState('short_answer');
  const [localOptions, setLocalOptions] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);

  const [newQ, setNewQ] = useState({
    type: 'multiple_choice', text: '', answer: '', explanation: '',
    opt1: '', opt2: '', opt3: '', opt4: ''
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [smartExamQuestions, setSmartExamQuestions] = useState<any[]>([]);
  const [searchImport, setSearchImport] = useState('');
  const [selectedImports, setSelectedImports] = useState<any[]>([]);
  const [isFetchingBank, setIsFetchingBank] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // 🌟 STATES สำหรับระบบ Live Photo Manager
  const [livePhotos, setLivePhotos] = useState<any[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<any>(null);

  const fetchAgendaData = async () => {
    if (!eventId) return;
    const { data } = await supabase.from('event_agenda_items').select('*').eq('event_id', eventId).order('sort_order', { ascending: true });
    if (data) setAgendaItems(data);
  };

  const fetchQuestions = async () => {
    if (!eventId) return;
    const { data } = await supabase.from('event_quiz_questions').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setQuestionBank(data);
      if (!selectedQuestionId) {
        setSelectedQuestionId(data[0].id);
        setLocalQuestion(data[0].question_text);
        setLocalAnswer(data[0].correct_answer);
        setLocalQuestionType(data[0].question_type);
        setLocalOptions(data[0].options || []);
      }
    } else {
      setQuestionBank([]);
    }
  };

  const [showLiveQr, setShowLiveQr] = useState(false);

  const toggleLiveQr = async () => {
    const newValue = !showLiveQr;
    setShowLiveQr(newValue);

    try {
      // 🌟 อัปเดตแค่สถานะ เปิด/ปิด ลงฐานข้อมูล
      await supabase.from('screen_state')
        .update({ show_live_qr: newValue })
        .eq('id', 'current');
    } catch (error) {
      console.error("Error toggling Live QR:", error);
    }
  };
  // 🌟 State สำหรับสวิตช์ QR ส่งรูป (ถ้าดึงจาก screenState โดยตรงก็ใช้ screenState.show_qr ได้เลย)
  const [showPhotoQr, setShowPhotoQr] = useState(false);

  // 🌟 ฟังก์ชันอัปเดตสถานะ QR ส่งรูปไปที่จอ Display
  const togglePhotoQr = async () => {
    const newValue = !showPhotoQr;
    setShowPhotoQr(newValue);

    try {
      await supabase.from('screen_state')
        .update({ show_qr: newValue }) // อัปเดตคอลัมน์ show_qr เดิมของคุณ
        .eq('id', 'current');
    } catch (error) {
      console.error("Error toggling Photo QR:", error);
    }
  };
  // 🌟 ดึงข้อมูล SMS ทั้งหมดเมื่อเปิด Modal
  useEffect(() => {
    if (showSmsModal && eventId) {
      const fetchAllSms = async () => {
        const { data } = await supabase.from('event_live_messages')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });
        if (data) setAllSms(data);
      };
      fetchAllSms();
    }
  }, [showSmsModal, eventId]);

  const handleDeleteSms = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบข้อความนี้อย่างถาวร?')) return;
    await supabase.from('event_live_messages').delete().eq('id', id);
    setAllSms(prev => prev.filter(m => m.id !== id));
  };

  const handleStartEditSms = (msg: any) => {
    setEditingSmsId(msg.id);
    setEditSmsText(msg.message_text);
  };

  const handleSaveEditSms = async (id: string) => {
    if (!editSmsText.trim()) return;
    await supabase.from('event_live_messages')
      .update({ message_text: editSmsText })
      .eq('id', id);

    setAllSms(prev => prev.map(m => m.id === id ? { ...m, message_text: editSmsText } : m));
    setEditingSmsId(null);
  };

  // 🌟 ฟังก์ชันดึงรูปภาพแบบ Realtime
  const fetchLivePhotos = async () => {
    const { data } = await supabase.from('live_photos').select('*').order('created_at', { ascending: false });
    if (data) setLivePhotos(data);
  };

  useEffect(() => {
    if (!eventId) return;
    const fetchMedia = async () => {
      const { data } = await supabase.storage.from('event-media').list();
      if (data) {
        setAvailableMedia(data.map(f => {
          const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(f.name);
          return { name: f.name, url: urlData.publicUrl, type: (f.name.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image') as 'video' | 'image' };
        }).filter(f => f.name.match(/\.(jpeg|jpg|gif|png|mp4|webm|ogg)$/i)));
      }
    };
    fetchMedia();
    fetchAgendaData();
    fetchQuestions();
    fetchLivePhotos(); // ดึงรูปครั้งแรก

    const agendaChannel = supabase.channel(`agenda_realtime_${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_agenda_items', filter: `event_id=eq.${eventId}` }, () => { fetchAgendaData(); })
      .subscribe();

    // 🌟 ดักฟังตารางรูปภาพ ถ้าแขกส่งมารูปจะเด้งขึ้นหน้าจอแอดมินทันที
    const photoChannel = supabase.channel('live_photos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_photos' }, () => { fetchLivePhotos(); })
      .subscribe();

    return () => { supabase.removeChannel(agendaChannel); supabase.removeChannel(photoChannel); };
  }, [eventId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX - monitorPos.x, startY: e.clientY - monitorPos.y };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setMonitorPos({ x: e.clientX - dragRef.current.startX, y: e.clientY - dragRef.current.startY });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging]);

  const handleSaveStartTime = async () => {
    if (!startTime) return alert('กรุณาเลือกเวลาก่อนครับ');
    await supabase.from('screen_state').update({ ticker_text: `⏱️ เวลาเริ่มกิจกรรมอย่างเป็นทางการ: ${startTime}` }).eq('id', 'current');
    alert('บันทึกเวลาเปิดพิกัดงานเรียบร้อย!');
  };

  const handleSetLiveCue = async (id: string, forceMedia: string) => {
    if (!eventId) return;
    try {
      await supabase.from('event_agenda_items').update({ is_live_now: false }).eq('event_id', eventId).neq('id', id);
      await supabase.from('event_agenda_items').update({ is_live_now: true }).eq('id', id);
      if (forceMedia && forceMedia !== 'idle') {
        await supabase.from('screen_state').update({ mode: 'video', single_video_url: forceMedia, video_playlist: [] }).eq('id', 'current');
      }
      fetchAgendaData();
    } catch (err) { console.error(err); }
  };

  const handleSaveScriptChanges = async (id: string) => {
    const { error } = await supabase.from('event_agenda_items').update({ main_script: editMainScript }).eq('id', id);
    if (!error) {
      alert('💾 บันทึกการแก้ไขสคริปท์พิธีกรลงฐานข้อมูลสำเร็จ!');
      setEditingAgendaId(null);
      fetchAgendaData();
    }
  };

  const updateScreen = async (updates: any) => {
    const { error } = await supabase.from('screen_state').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 'current');
    if (error) alert("ส่งคำสั่งไปที่จอไม่สำเร็จ: " + error.message);
  };

  const handleStartGame = async (gameParams: any) => {
    if (confirm('ระบบจะทำการล้างคำตอบเก่าทั้งหมด และเริ่มส่งโจทย์ข้อใหม่ขึ้นจอ ยืนยันหรือไม่?')) {
      try {
        await supabase.from('live_messages').delete().not('id', 'is', null);
      } catch (e) { console.error(e); }
      updateScreen(gameParams);
    }
  };

  const handleRevealAndScore = async () => {
    if (!eventId) return;
    updateScreen({ game_phase: 'reveal', quiz_correct_answer: localAnswer });

    const { data: messages, error: msgErr } = await supabase.from('live_messages').select('*');
    if (msgErr || !messages || messages.length === 0) return;

    const safeAnswer = (localAnswer || '').toLowerCase().trim();
    const correctMsgs = messages.filter(m => (m.message || '').toLowerCase().includes(safeAnswer));
    if (correctMsgs.length === 0) return;

    const { data: existingScores } = await supabase.from('player_scores').select('*').eq('event_id', eventId);
    const scoreMap = new Map();
    existingScores?.forEach(s => scoreMap.set(s.nickname, s.score));

    const uniqueWinners = new Map();
    correctMsgs.forEach(m => {
      if (!uniqueWinners.has(m.nickname)) {
        uniqueWinners.set(m.nickname, {
          event_id: eventId, nickname: m.nickname, team_color: m.team_color,
          score: (scoreMap.get(m.nickname) || 0) + 10
        });
      }
    });

    const upsertData = Array.from(uniqueWinners.values());
    await supabase.from('player_scores').upsert(upsertData, { onConflict: 'event_id, nickname' });
  };

  const toggleMediaSelection = (url: string) => {
    setSelectedPlaylist(prev => prev.includes(url) ? prev.filter(i => i !== url) : [...prev, url]);
  };

  const handleDeleteMedia = async (fileName: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์ "${fileName}"?\n(ลบแล้วไม่สามารถกู้คืนได้)`)) {
      try {
        const { error } = await supabase.storage.from('event-media').remove([fileName]);
        if (error) throw error;
        setAvailableMedia(prev => prev.filter(f => f.name !== fileName));
        setSelectedPlaylist(prev => prev.filter(url => !url.includes(fileName)));
      } catch (error: any) {
        alert('เกิดข้อผิดพลาดในการลบไฟล์: ' + error.message);
      }
    }
  };

  // ==========================================
  // 🌟 ฟังก์ชันจัดการ Live Photo
  // ==========================================
  const togglePhotoApproval = async (id: string, currentStatus: boolean) => {
    await supabase.from('live_photos').update({ is_approved: !currentStatus }).eq('id', id);
    fetchLivePhotos();
  };

  const handleDeletePhoto = async (id: string, imageUrl: string) => {
    if (confirm('ยืนยันลบรูปภาพนี้ออกจากแกลเลอรีอย่างถาวร? (รวมถึงลบไฟล์ภาพด้วย)')) {
      try {
        // 1. ลบข้อมูลจาก Database
        await supabase.from('live_photos').delete().eq('id', id);
        // 2. ดึงชื่อไฟล์จาก URL แล้วลบจาก Storage
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          await supabase.storage.from('guest-uploads').remove([fileName]);
        }
        fetchLivePhotos();
      } catch (e: any) {
        alert('เกิดข้อผิดพลาดในการลบรูป: ' + e.message);
      }
    }
  };

  const handleSavePhotoEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto) return;
    try {
      await supabase.from('live_photos').update({
        nickname: editingPhoto.nickname,
        caption: editingPhoto.caption
      }).eq('id', editingPhoto.id);
      setIsPhotoModalOpen(false);
      setEditingPhoto(null);
      fetchLivePhotos();
    } catch (e: any) {
      alert('เกิดข้อผิดพลาด: ' + e.message);
    }
  };
  const handleUploadMedia = async () => {
    try {
      // 1. เช็คข้อมูลเบื้องต้น
      if (!uploadFile) {
        alert("กรุณาเลือกไฟล์ก่อนอัปโหลดครับ");
        return;
      }
      if (!eventId) {
        alert("ไม่พบรหัสงาน (eventId) ในระบบ");
        return;
      }

      setIsUploading(true);

      // 2. ดึง screen_id ของงานนี้มาอัตโนมัติ (แก้ปัญหาหน้า Controller ไม่มีค่านี้)
      let targetScreenId = null;
      const { data: screenData } = await supabase
        .from('social_screens')
        .select('id')
        .eq('event_id', eventId)
        .single();

      if (screenData?.id) {
        targetScreenId = screenData.id;
      } else {
        throw new Error("ไม่พบข้อมูลหน้าจอ (social_screens) สำหรับงานนี้");
      }

      // 3. จัดระเบียบชื่อไฟล์และ Path ป้องกันโฟลเดอร์ undefined
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${eventId}/${uploadCategory}/${fileName}`;

      // 4. อัปโหลดไฟล์เข้า Storage 'background-media'
      const { error: uploadError } = await supabase.storage
        .from('background-media')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // 5. ดึงลิงก์ Public URL
      const { data: publicUrlData } = supabase.storage
        .from('background-media')
        .getPublicUrl(filePath);

      // 6. บันทึกลงตาราง screen_background_media
      const isVideo = uploadFile.type.startsWith('video/');
      const { error: dbError } = await supabase.from('screen_background_media').insert({
        screen_id: targetScreenId,
        pool_key: uploadCategory,
        media_type: isVideo ? 'video' : 'image',
        media_url: publicUrlData.publicUrl,
        media_name: uploadFile.name
      });

      if (dbError) throw dbError;

      // 7. สำเร็จ
      alert('✅ อัปโหลดและเพิ่มสื่อเข้าสู่ระบบเรียบร้อยแล้ว! (ภาพจะไปแสดงที่หน้าจออัตโนมัติ)');
      setShowUploadModal(false);
      setUploadFile(null);

    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  const simulateAnswer = async (t: string) => { await supabase.from('live_messages').insert([{ nickname: `ผู้เล่น_${t}_${Math.floor(Math.random() * 100)}`, message: Math.random() > 0.4 ? localAnswer : 'ตอบผิดจ้า', team_color: t }]); };

  const handleSelectQuestion = (q: QuizQuestion) => {
    setSelectedQuestionId(q.id);
    setLocalQuestion(q.question_text);
    setLocalAnswer(q.correct_answer);
    setLocalQuestionType(q.question_type);
    setLocalOptions(q.options || []);
  };

  const handleEditClick = (e: React.MouseEvent, q: QuizQuestion) => {
    e.stopPropagation();
    setEditingQId(q.id);
    setNewQ({
      type: q.question_type as any,
      text: q.question_text,
      answer: q.correct_answer,
      explanation: q.explanation || '',
      opt1: q.options?.[0] || '', opt2: q.options?.[1] || '',
      opt3: q.options?.[2] || '', opt4: q.options?.[3] || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคำถามข้อนี้? (ลบแล้วลบเลย)')) {
      const { error } = await supabase.from('event_quiz_questions').delete().eq('id', id);
      if (!error) {
        fetchQuestions();
        if (selectedQuestionId === id) {
          setSelectedQuestionId(null);
          setLocalQuestion('กรุณาเลือกคำถามจากคลังด้านบน...');
        }
      } else {
        alert('ลบข้อมูลไม่สำเร็จ: ' + error.message);
      }
    }
  };

  const handleSubmitNewQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !newQ.text || !newQ.answer) return alert('กรุณากรอกโจทย์และคำตอบให้ครบ');
    setIsSubmittingQ(true);

    // 🌟 เปลี่ยนโครงสร้างเป็น Object ให้เหมือนฝั่ง SmartExam
    let optionsArray: any[] = [];
    if (newQ.type === 'multiple_choice') {
      const rawOptions = [newQ.opt1, newQ.opt2, newQ.opt3, newQ.opt4];
      const optionIds = ['ก', 'ข', 'ค', 'ง']; // หรือใช้ A, B, C, D ตามต้องการ

      rawOptions.forEach((optText, index) => {
        if (optText.trim() !== '') {
          optionsArray.push({
            id: optionIds[index],
            text: optText.trim()
          });
        }
      });
    }

    const questionData = {
      event_id: eventId,
      question_type: newQ.type,
      question_text: newQ.text,
      options: optionsArray, // 🌟 โยนเป็น Object Array เข้าไป
      correct_answer: newQ.answer,
      explanation: newQ.explanation || ''
    };

    try {
      if (editingQId) {
        await supabase.from('event_quiz_questions').update(questionData).eq('id', editingQId);
        alert('แก้ไขคำถามเรียบร้อยแล้ว!');
      } else {
        await supabase.from('event_quiz_questions').insert([questionData]);
        alert('บันทึกคำถามใหม่สำเร็จ!');
      }
      handleCloseModal();
      fetchQuestions();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmittingQ(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQId(null);
    setNewQ({ type: 'multiple_choice', text: '', answer: '', explanation: '', opt1: '', opt2: '', opt3: '', opt4: '' });
  };

  const openImportModal = async () => {
    setIsImportModalOpen(true);
    setIsFetchingBank(true);
    try {
      const { data, error } = await supabase.from('exam_questions').select(`*, exams ( title, subject_category )`).order('created_at', { ascending: false });
      if (error) throw error;
      setSmartExamQuestions(data || []);
    } catch (error: any) {
      alert("ไม่สามารถโหลดคลังข้อสอบได้: " + error.message);
    } finally {
      setIsFetchingBank(false);
    }
  };

  const toggleImportSelection = (q: any) => {
    setSelectedImports(prev => {
      const isSelected = prev.some(item => item.id === q.id);
      if (isSelected) return prev.filter(item => item.id !== q.id);
      if (prev.length >= 5) {
        alert("เลือกนำเข้าได้สูงสุดครั้งละ 5 ข้อครับ");
        return prev;
      }
      return [...prev, q];
    });
  };

  const handleExecuteImport = async () => {
    if (selectedImports.length === 0) return alert('กรุณาเลือกข้อสอบอย่างน้อย 1 ข้อ');
    setIsImporting(true);
    try {
      const importData = selectedImports.map(q => {

        // 🌟 ลอจิกเช็คประเภทคำถาม: ถ้าไม่ใช่ตอบสั้น ให้บังคับเป็น multiple_choice เพื่อให้ระบบจอมือถือทำงานถูกต้อง
        const isShortAnswer = q.question_type === 'short_answer' || q.question_type === 'เขียนตอบ';
        const finalType = isShortAnswer ? 'short_answer' : 'multiple_choice';

        return {
          event_id: eventId,
          question_type: finalType,
          question_text: q.question_text,
          options: q.options || [], // 🌟 โยน Object ก, ข, ค, ง เข้าไปตรงๆ ได้เลย เพราะโครงสร้างเราเหมือนกันแล้ว!
          correct_answer: q.correct_answer,
          explanation: q.explanation || ''
        };
      });

      const { error } = await supabase.from('event_quiz_questions').insert(importData);
      if (error) throw error;

      alert(`นำเข้าข้อสอบ ${selectedImports.length} ข้อ สำเร็จ!`);
      setIsImportModalOpen(false);
      setSelectedImports([]);
      fetchQuestions();
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredSmartExam = smartExamQuestions.filter(q =>
    q.question_text.toLowerCase().includes(searchImport.toLowerCase()) ||
    (q.exams?.title || "").toLowerCase().includes(searchImport.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 font-sans flex flex-col gap-4 relative overflow-hidden">
      <div className="flex justify-between items-center bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-md flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-cyan-400 tracking-wider">NiiVaa MASTER CONTROL ROOM</h1>
          <p className="text-xs text-zinc-500">ระบบสลับคิวงาน กราฟิก และ Game Collection ไร้สาย</p>
        </div>
        <Link
          href={`/eventdashboard/media?event_id=${eventId}`} // ⚠️ แก้ไข Path ให้ตรงกับ URL หน้า Hub ของคุณ
          className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
        >
          <UploadCloud className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold">ศูนย์จัดการคลังสื่อ</span>
        </Link>
        {/* โซนปุ่มเมนู */}

        {/* 🌟 1. ปุ่มเรียกคู่มือ (เพิ่มใหม่) */}
        <button
          onClick={() => setShowGuideDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-xl text-sm font-black shadow-lg transition-transform active:scale-95"
        >
          <BookOpen className="w-4 h-4" /> คู่มือการใช้งาน
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowMiniMonitor(!showMiniMonitor)} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border font-bold text-sm shadow-sm ${showMiniMonitor ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}>
            <Tv className="w-4 h-4" /> {showMiniMonitor ? 'ปิดมอนิเตอร์' : 'เปิดมอนิเตอร์จอเวที'}
          </button>
          <Link href={`/events/event-dashboard/${eventId}`} className="group flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50">
            <LayoutGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
          </Link>
          <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-zinc-800 ml-2">
            <span className="text-xs font-bold text-zinc-400">⏱️ ตั้งเวลา:</span>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white outline-none" />
            <button onClick={handleSaveStartTime} className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">บันทึก</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 h-full min-h-0">
        <div className="xl:col-span-3 space-y-4 flex flex-col min-h-0">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-black text-zinc-300 uppercase tracking-wider mb-3 border-b border-zinc-800 pb-2 shrink-0">📦 คลังสื่ออัจฉริยะ</h2>

            <div className="flex-1 overflow-y-auto bg-black/40 border border-zinc-800 rounded-xl p-2 mb-3 scrollbar-thin flex flex-col gap-1">
              {availableMedia.map(file => {
                const isSelected = selectedPlaylist.includes(file.url);
                return (
                  <div key={file.name} className="flex items-center justify-between p-2 hover:bg-zinc-800/60 rounded-xl border border-transparent hover:border-zinc-700 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleMediaSelection(file.url)} className="accent-cyan-500 w-4 h-4 shrink-0 cursor-pointer" />

                      {file.type === 'image' ? (
                        <img src={file.url} alt="thumb" className="w-10 h-10 object-cover rounded-lg shrink-0 border border-zinc-700" loading="lazy" />
                      ) : (
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-900/30 flex items-center justify-center border border-blue-800/50">
                          <span className="text-[10px] font-black text-blue-400">VID</span>
                        </div>
                      )}

                      <div className="flex flex-col truncate">
                        <span className="truncate text-xs font-bold text-zinc-300" title={file.name}>{file.name.substring(0, 16)}...</span>
                        <span className="text-[9px] text-zinc-500 uppercase">{file.type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {file.type === 'video' && (
                        <button
                          onClick={() => updateScreen({ mode: 'video', single_video_url: file.url, video_playlist: [] })}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 rounded text-[10px] flex items-center gap-1"
                        >
                          ▶️ <span className="hidden xl:inline">เล่นเดี่ยว</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMedia(file.name)}
                        className="bg-zinc-900 hover:bg-red-950 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg border border-zinc-800 hover:border-red-900/50 transition-colors"
                        title="ลบไฟล์สื่อนี้"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {availableMedia.length === 0 && (
                <div className="text-center text-xs text-zinc-500 py-4">ยังไม่มีสื่อในคลัง</div>
              )}
            </div>

            <div className="space-y-2 shrink-0">
              <button
                onClick={() => updateScreen({ mode: 'standby', single_video_url: '', video_playlist: [] })}
                className="w-full bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/50 py-3 rounded-xl text-xs font-black shadow-lg transition-transform active:scale-95"
              >
                🛑 STOP ฉุกเฉิน / พักสื่อสแตนด์บาย
              </button>

              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const imgs = availableMedia.filter(f => f.type === 'image' && selectedPlaylist.includes(f.url)).map(f => f.url);
                    if (imgs.length === 0) return alert('กรุณาเลือกรูปภาพอย่างน้อย 1 รูป');
                    updateScreen({ mode: 'slideshow', playlist: imgs });
                  }}
                  className="flex-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-400 border border-emerald-800/60 py-2.5 rounded-xl text-[11px] font-bold"
                >
                  🖼️ ฉายสไลด์
                </button>
                <button
                  onClick={() => {
                    const vids = availableMedia.filter(f => f.type === 'video' && selectedPlaylist.includes(f.url)).map(f => f.url);
                    if (vids.length === 0) return alert('กรุณาเลือกวิดีโออย่างน้อย 1 คลิป');
                    updateScreen({ mode: 'video', single_video_url: vids[0], video_playlist: vids });
                  }}
                  className="flex-1 bg-blue-900/60 hover:bg-blue-800 text-blue-400 border border-blue-800/60 py-2.5 rounded-xl text-[11px] font-bold"
                >
                  🎬 เล่นคิววิดีโอ
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <UploadCloud size={16} /> อัปโหลดไฟล์สื่อพื้นหลัง (BG)
          </button>
          <button
            onClick={() => setShowSmsModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <MessageSquare size={16} /> จัดการข้อความ SMS ทั้งหมด
          </button>
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md shrink-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-black text-zinc-300">💬 ข้อความวิ่งฉุกเฉิน</h2>
              {/* 🌟 จานสีอิสระ (Color Pickers) */}
              <div className="flex items-center gap-2 bg-black/40 px-2 py-1 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-1" title="เลือกสีพื้นหลังแถบข้อความ">
                  <span className="text-[10px] text-zinc-500 font-bold">พื้น:</span>
                  <input type="color" value={tickerBgColor} onChange={e => setTickerBgColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0 outline-none" />
                </div>
                <div className="w-px h-3 bg-zinc-700 mx-0.5"></div>
                <div className="flex items-center gap-1" title="เลือกสีตัวอักษร">
                  <span className="text-[10px] text-zinc-500 font-bold">อักษร:</span>
                  <input type="color" value={tickerColor} onChange={e => setTickerColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0 outline-none" />
                </div>
              </div>
            </div>
            <input type="text" value={tickerMsg} onChange={e => setTickerMsg(e.target.value)} placeholder="พิมพ์คำประกาศ..." className="w-full bg-black border border-zinc-800 text-xs text-white p-2.5 rounded-lg outline-none mb-2 focus:border-cyan-500 transition-colors" />
            <div className="flex gap-1.5">
              <button
                onClick={() => updateScreen({ ticker_text: tickerMsg, ticker_direction: tickerDirection, ticker_color: tickerColor, ticker_bg_color: tickerBgColor })}
                className="flex-1 bg-cyan-700 hover:bg-cyan-600 py-2 rounded text-xs font-bold transition-colors"
              >
                ส่งขึ้นจอ
              </button>
              <button
                onClick={() => updateScreen({ ticker_text: '' })}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2 rounded text-xs font-bold transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md flex flex-col min-h-0">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-3 shrink-0">
            <h2 className="text-base font-black text-cyan-400 tracking-wide flex items-center gap-2">📋 ตารางคิวงาน (Timeline Table)</h2>
            <span className="text-xs text-zinc-500 font-bold">รวม: {agendaItems.length} คิว</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-3">
            {agendaItems.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-12">ไม่พบข้อมูลคิวงาน</p>
            ) : (
              agendaItems.map((item, idx) => (
                <div key={item.id} className={`p-3.5 rounded-xl border transition-all duration-300 relative flex flex-col gap-2.5 ${item.is_live_now ? 'bg-gradient-to-r from-cyan-950/60 to-zinc-950 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-black/40 border-zinc-800/80 hover:border-zinc-700'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border shrink-0 ${item.is_live_now ? 'bg-cyan-500 text-black border-cyan-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{idx + 1}</div>
                      <div>
                        <h3 className="font-black text-sm text-white flex items-center gap-2 flex-wrap">
                          {item.title}
                          <span className="text-[10px] font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">⏱️ {item.duration_minutes} นาที</span>
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">รับผิดชอบ: <b className="text-zinc-400">{item.responsible_person || '-'}</b> | สื่อ: <b className="text-amber-500/80">{item.visual_audio_cue || '-'}</b></p>
                      </div>
                    </div>
                    <button onClick={() => handleSetLiveCue(item.id, item.force_media_trigger)} className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all transform active:scale-95 flex items-center gap-1 border shrink-0 ${item.is_live_now ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                      {item.is_live_now ? '🔴 LIVE' : '🎬 สลับคิว'}
                    </button>
                  </div>
                  <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-900/50 text-xs">
                    <div className="flex justify-between items-center mb-1 text-zinc-500 font-bold">
                      <span>🎤 บทพูดพิธีกร:</span>
                      {editingAgendaId === item.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveScriptChanges(item.id)} className="text-emerald-400 hover:underline">💾 เซฟ</button>
                          <button onClick={() => setEditingAgendaId(null)} className="text-zinc-500 hover:underline">ยกเลิก</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingAgendaId(item.id); setEditMainScript(item.main_script || ''); }} className="text-cyan-500 hover:underline">✍️ แก้ไข</button>
                      )}
                    </div>
                    {editingAgendaId === item.id ? (
                      <textarea value={editMainScript} onChange={e => setEditMainScript(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-1.5 outline-none font-bold text-xs resize-none" />
                    ) : (
                      <p className="text-zinc-300 whitespace-pre-line leading-relaxed font-medium">{item.main_script || '-'}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-md flex flex-col gap-4 min-h-0">
          <div className="flex flex-col flex-1 min-h-0 border-b border-zinc-800 pb-4">
            <div className="flex justify-between items-center mb-2 shrink-0">
              <h2 className="text-sm font-black text-indigo-400 uppercase tracking-wider">📚 คลังคำถามเกม</h2>
              <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1 font-bold">
                <Plus className="w-3 h-3" /> เพิ่มคำถาม
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/40 border border-zinc-800 rounded-xl p-1.5 space-y-1.5 scrollbar-thin">
              {questionBank.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-4">ยังไม่มีคำถาม กดปุ่มเพิ่มคำถามได้เลย</div>
              ) : (
                questionBank.map(q => (
                  <div key={q.id} onClick={() => handleSelectQuestion(q)} className={`p-2 rounded-lg cursor-pointer transition-all border text-xs flex justify-between items-center gap-2
                    ${selectedQuestionId === q.id ? 'bg-indigo-900/40 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80'}
                  `}>
                    <div className="truncate flex-1">
                      <span className="font-bold text-zinc-200 block truncate">{q.question_text}</span>
                      <span className="text-[9px] text-zinc-500">{q.question_type === 'multiple_choice' ? 'ตัวเลือก' : 'เขียนตอบ'} • ตอบ: {q.correct_answer}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => handleEditClick(e, q)} className="text-zinc-500 hover:text-cyan-400 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 transition-colors" title="แก้ไขคำถาม"><Edit2 className="w-3 h-3" /></button>
                      <button onClick={(e) => handleDeleteClick(e, q.id)} className="text-zinc-500 hover:text-red-400 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 transition-colors" title="ลบคำถาม"><Trash2 className="w-3 h-3" /></button>
                      {selectedQuestionId === q.id && <CheckCircle2 className="w-5 h-5 text-indigo-400 ml-1" />}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-900/50 shrink-0">
              <span className="text-[10px] font-bold text-indigo-400 block mb-1">🎯 คำถามที่เตรียมยิงขึ้นจอ:</span>
              <p className="text-xs text-white font-medium line-clamp-2">{localQuestion}</p>
              <p className="text-[10px] text-emerald-400 mt-1 font-bold">เฉลย: {localAnswer}</p>
            </div>
          </div>

          <div className="space-y-2 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500 font-bold block">🚀 ส่งคำถามไปยังหน้าจอ:</span>
              <button
                onClick={async () => {
                  if (confirm('ล้างคิวคำตอบทั้งหมด และเปิดจอ Standby สีเขียว?')) {
                    try { await supabase.from('live_messages').delete().not('id', 'is', null); } catch (e) { }
                    updateScreen({ mode: 'get_ready', game_phase: 'get_ready', quiz_question: 'รอสักครู่...' });
                  }
                }}
                className="bg-red-950 border border-red-900 text-red-400 text-[10px] px-3 py-1 rounded font-bold hover:bg-red-900 transition-colors"
              >
                ล้างคิว & เตรียมพร้อม
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => handleStartGame({ mode: 'game', quiz_question: localQuestion, quiz_correct_answer: localAnswer, quiz_question_type: 'short_answer', quiz_options: [], game_phase: 'brainstorm' })} className="col-span-2 bg-pink-700/80 hover:bg-pink-600 text-white text-xs font-bold py-2 rounded-lg">1. เปิดโหมดรับข้อความอิสระ</button>
              <button onClick={() => handleStartGame({ mode: 'quiz', quiz_question: localQuestion, quiz_correct_answer: localAnswer, quiz_question_type: localQuestionType, quiz_options: localOptions, game_phase: 'brainstorm' })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-2 rounded-lg">🥇 2. จัดอันดับ</button>
              <button onClick={() => handleStartGame({ mode: 'tug_of_war', quiz_question: localQuestion, quiz_correct_answer: localAnswer, quiz_question_type: localQuestionType, quiz_options: localOptions, game_phase: 'brainstorm' })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-2 rounded-lg">🪢 3. ชักเย่อทีม</button>
              <button onClick={() => handleStartGame({ mode: 'leaderboard', quiz_question: localQuestion, quiz_correct_answer: localAnswer, quiz_question_type: localQuestionType, quiz_options: localOptions, game_phase: 'brainstorm' })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-2 rounded-lg">📊 4. กราฟ 4 ทัพ</button>
              <button onClick={() => handleStartGame({ mode: 'sudden_death', quiz_question: localQuestion, quiz_correct_answer: localAnswer, quiz_question_type: localQuestionType, quiz_options: localOptions, game_phase: 'brainstorm' })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold py-2 rounded-lg">⚡ 5. ใครไวใครได้</button>
            </div>

            <div className="flex gap-1.5 mt-1">
              <button onClick={() => updateScreen({ game_phase: 'show_answers' })} className="w-1/2 bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 rounded-lg text-xs shadow active:scale-95 transition-transform">
                👀 เปิดดูคำตอบทั้งหมด
              </button>
              <button onClick={handleRevealAndScore} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-lg text-xs shadow active:scale-95 transition-transform">
                💥 ประกาศผล & บวกคะแนน!
              </button>
            </div>
          </div>
          {/* ========================================== */}
          {/* 🏆 โหมดประกาศผลแชมป์ (Grand Finale) */}
          {/* ========================================== */}
          <div className="pt-4 border-t-2 border-dashed border-zinc-800 shrink-0">
            <span className="text-xs text-yellow-500 font-black block mb-2 uppercase tracking-widest">🏆 โหมดประกาศผลแชมป์ (Grand Finale)</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => updateScreen({ mode: 'grand_leaderboard', reveal_step: 0, game_phase: 'reveal' })}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-yellow-600/50 text-yellow-400 font-bold py-2 rounded-lg text-xs transition-colors shadow-inner"
              >
                1. เปิดหน้าจอสรุปคะแนน (ซ่อนคะแนนไว้ก่อน)
              </button>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const { data } = await supabase.from('screen_state').select('reveal_step').eq('id', 'current').single();
                    const nextStep = (data?.reveal_step || 0) + 1;
                    updateScreen({ reveal_step: nextStep });
                  }}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-black py-2.5 rounded-lg text-xs active:scale-95 transition-transform shadow-[0_0_15px_rgba(202,138,4,0.4)]"
                >
                  🔼 เผยคะแนน (ทีละ 1 อันดับ)
                </button>
                <button
                  onClick={async () => {
                    if (confirm('ล้างคะแนนสะสมทั้งหมด เริ่มการแข่งขันใหม่?')) {
                      await supabase.from('player_scores').delete().not('id', 'is', null);
                      alert('ล้างคะแนนสะสมเรียบร้อยแล้ว');
                    }
                  }}
                  className="bg-red-950 border border-red-900 hover:bg-red-900 text-red-400 font-bold px-4 rounded-lg text-xs transition-colors"
                >
                  ล้างคะแนน
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl border border-indigo-500/30 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-950 p-2 rounded-xl border border-indigo-500/50">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">QR Code เข้าเล่นเกม (Live Player)</h3>
                <p className="text-zinc-400 text-xs">แสดง QR ผูกกับ Event ID อัตโนมัติบนเวที</p>
              </div>
            </div>

            {/* สวิตช์เปิด/ปิด */}
            <button
              onClick={toggleLiveQr}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${showLiveQr ? 'bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]' : 'bg-zinc-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${showLiveQr ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="bg-zinc-900 p-4 rounded-2xl border border-cyan-500/30 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-950 p-2 rounded-xl border border-cyan-500/50">
                <span className="text-2xl">📸</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">QR Code ส่งภาพ (Live Gallery)</h3>
                <p className="text-zinc-400 text-xs">แสดง QR สำหรับส่งรูปภาพขึ้นจอบนเวที</p>
              </div>
            </div>

            {/* สวิตช์เปิด/ปิด สำหรับ QR ส่งรูป */}
            <button
              onClick={togglePhotoQr}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${showPhotoQr ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-zinc-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${showPhotoQr ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* ========================================== */}
          {/* 📸 แผงควบคุมระบบ Live Photo Wall */}
          {/* ========================================== */}
          <div className="pt-4 border-t border-zinc-800 shrink-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-purple-400 font-black uppercase tracking-widest">📸 แกลเลอรีภาพสด</span>

              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1 bg-black/40 px-2 py-1.5 rounded border border-zinc-700">
                  <span className="text-[10px] text-zinc-400 font-bold">สลับรูปทุก:</span>
                  <input type="number" min="1" max="60" value={galleryInterval} onChange={e => setGalleryInterval(Number(e.target.value))} className="w-10 bg-zinc-900 border border-zinc-600 rounded text-white text-xs text-center outline-none focus:border-cyan-500" />
                  <span className="text-[10px] text-zinc-400 font-bold">วินาที</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-3">
              <button onClick={() => updateScreen({ mode: 'live_gallery', gallery_interval_sec: galleryInterval })} className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-2.5 rounded-lg text-xs active:scale-95 transition-transform shadow-[0_0_15px_rgba(147,51,234,0.4)]">
                🚀 ฉาย Photo Wall ขึ้นจอ
              </button>
            </div>

            {/* ระบบจัดการ Live Photos (Edit / Delete / Approve) */}
            <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
              {livePhotos.map(photo => (
                <div key={photo.id} className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${photo.is_approved ? 'bg-zinc-900/80 border-zinc-700' : 'bg-red-950/30 border-red-900/50 opacity-50'}`}>
                  <img src={photo.image_url} className="w-12 h-12 object-cover rounded-lg border border-zinc-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-bold truncate">{photo.nickname}</p>
                    <p className="text-zinc-400 text-[10px] truncate">{photo.caption}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => togglePhotoApproval(photo.id, photo.is_approved)} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title={photo.is_approved ? "กดเพื่อซ่อนไม่ให้ขึ้นจอ" : "กดเพื่อแสดงภาพบนจอ"}>
                      {photo.is_approved ? <Eye size={14} /> : <EyeOff size={14} className="text-red-400" />}
                    </button>
                    <button onClick={() => { setEditingPhoto(photo); setIsPhotoModalOpen(true); }} className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-cyan-400 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeletePhoto(photo.id, photo.image_url)} className="p-1.5 rounded-md hover:bg-red-950 text-zinc-500 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {livePhotos.length === 0 && <div className="text-[10px] text-zinc-500 text-center py-2 font-bold bg-black/30 rounded-lg border border-zinc-800/50">ยังไม่มีรูปภาพจากแขกในงาน</div>}
            </div>
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* 🌟 Modal แก้ไข Live Photo (ชื่อ / คำบรรยาย) */}
      {/* ========================================== */}
      {isPhotoModalOpen && editingPhoto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950">
              <h2 className="text-sm font-black text-purple-400">✏️ แก้ไขข้อมูลรูปภาพ</h2>
              <button onClick={() => { setIsPhotoModalOpen(false); setEditingPhoto(null); }} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleSavePhotoEdit} className="p-5 flex flex-col gap-4">
              <div className="flex justify-center mb-2">
                <img src={editingPhoto.image_url} alt="Editing" className="h-32 rounded-lg border border-zinc-700 object-contain bg-black" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">ชื่อ / ตำแหน่ง (แยกด้วย _ หรือ -)</label>
                <input
                  type="text"
                  value={editingPhoto.nickname}
                  onChange={e => setEditingPhoto({ ...editingPhoto, nickname: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">คำบรรยายสั้นๆ</label>
                <textarea
                  value={editingPhoto.caption || ''}
                  onChange={e => setEditingPhoto({ ...editingPhoto, caption: e.target.value })}
                  rows={2}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-purple-500 resize-none"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setIsPhotoModalOpen(false)} className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg font-bold">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg shadow-lg">บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal อื่นๆ ที่มีอยู่แล้ว... */}
      {showMiniMonitor && eventId && (
        <div className="fixed z-50 bg-zinc-950 border-2 border-cyan-600/50 shadow-[0_0_40px_rgba(6,182,212,0.2)] rounded-xl flex flex-col resize overflow-hidden" style={{ left: monitorPos.x, top: monitorPos.y, width: '40vw', height: '22.5vw', minWidth: '320px', minHeight: '180px', maxWidth: '90vw', maxHeight: '90vh' }}>
          <div onMouseDown={handleMouseDown} className="bg-zinc-900 border-b border-zinc-800 p-2 cursor-move flex justify-between items-center select-none">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs pl-1"><MonitorPlay className="w-4 h-4 animate-pulse" /> <span>LIVE DISPLAY MONITOR</span></div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setIframeRefreshKey(prev => prev + 1); }} className="text-zinc-400 hover:text-cyan-300 hover:bg-cyan-900/30 p-1 rounded transition-all text-xs">🔄</button>
              <button onClick={(e) => { e.stopPropagation(); setShowMiniMonitor(false); }} className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1 rounded transition-all text-xs">❌</button>
            </div>
          </div>
          <div className="flex-1 relative bg-black">
            {isDragging && <div className="absolute inset-0 z-10 cursor-move bg-transparent" />}
            <iframe key={iframeRefreshKey} src={`/eventdashboard/showtime/display?event_id=${eventId}`} className="w-full h-full border-none pointer-events-auto" title="Mini Monitor" />
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 bg-transparent pointer-events-none z-20" title="ดึงเพื่อขยายขนาด"></div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-950">
              <h2 className="text-base font-black text-indigo-400">{editingQId ? '✏️ แก้ไขคำถาม' : '➕ เพิ่มคำถามเข้าระบบ'}</h2>
              <button onClick={handleCloseModal} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {!editingQId && (
              <div className="px-5 pt-4">
                <button onClick={() => { handleCloseModal(); openImportModal(); }} className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"><DownloadCloud className="w-5 h-5" /> นำเข้าจากคลัง NiiVaa SmartExam (ด่วน)</button>
                <div className="flex items-center gap-4 my-4"><div className="h-px bg-zinc-800 flex-1"></div><span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">หรือพิมพ์เอง</span><div className="h-px bg-zinc-800 flex-1"></div></div>
              </div>
            )}
            <form onSubmit={handleSubmitNewQuestion} className="p-5 pt-0 space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div><label className="block text-xs font-bold text-zinc-400 mb-1">ประเภทคำถาม <span className="text-red-500">*</span></label><select value={newQ.type} onChange={e => setNewQ({ ...newQ, type: e.target.value })} className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-indigo-500"><option value="multiple_choice">โหมดตัวเลือก (Multiple Choice)</option><option value="short_answer">โหมดพิมพ์ตอบสั้น (Short Answer)</option></select></div>
              <div><label className="block text-xs font-bold text-zinc-400 mb-1">โจทย์คำถาม <span className="text-red-500">*</span></label><textarea required value={newQ.text} onChange={e => setNewQ({ ...newQ, text: e.target.value })} rows={3} placeholder="เช่น เมืองหลวงของประเทศไทยคือ?" className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-indigo-500 resize-none" /></div>
              {newQ.type === 'multiple_choice' && (<div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800"><label className="block text-xs font-bold text-indigo-400 mb-2">ตัวเลือก (กรอกอย่างน้อย 2 ช่อง)</label><div className="grid grid-cols-2 gap-2"><input type="text" placeholder="ตัวเลือกที่ 1" value={newQ.opt1} onChange={e => setNewQ({ ...newQ, opt1: e.target.value })} className="bg-black border border-zinc-700 rounded p-2 text-xs text-white" /><input type="text" placeholder="ตัวเลือกที่ 2" value={newQ.opt2} onChange={e => setNewQ({ ...newQ, opt2: e.target.value })} className="bg-black border border-zinc-700 rounded p-2 text-xs text-white" /><input type="text" placeholder="ตัวเลือกที่ 3 (ไม่บังคับ)" value={newQ.opt3} onChange={e => setNewQ({ ...newQ, opt3: e.target.value })} className="bg-black border border-zinc-700 rounded p-2 text-xs text-white" /><input type="text" placeholder="ตัวเลือกที่ 4 (ไม่บังคับ)" value={newQ.opt4} onChange={e => setNewQ({ ...newQ, opt4: e.target.value })} className="bg-black border border-zinc-700 rounded p-2 text-xs text-white" /></div></div>)}
              <div><label className="block text-xs font-bold text-emerald-400 mb-1">คำตอบที่ถูกต้อง (เฉลย) <span className="text-red-500">*</span></label><input required type="text" value={newQ.answer} onChange={e => setNewQ({ ...newQ, answer: e.target.value })} placeholder={newQ.type === 'multiple_choice' ? 'พิมพ์ให้ตรงกับตัวเลือกด้านบนเป๊ะๆ' : 'พิมพ์คำตอบสั้นๆ'} className="w-full bg-black border border-emerald-900 rounded-lg p-2.5 text-sm text-emerald-300 outline-none focus:border-emerald-500" /></div>
              <div><label className="block text-xs font-bold text-zinc-400 mb-1">คำอธิบายเพิ่มเติม (ไม่บังคับ)</label><textarea value={newQ.explanation} onChange={e => setNewQ({ ...newQ, explanation: e.target.value })} rows={2} placeholder="เช่น กรุงเทพมหานครเป็นเมืองที่ใหญ่ที่สุด..." className="w-full bg-black border border-zinc-700 rounded-lg p-2.5 text-xs text-zinc-300 outline-none focus:border-indigo-500 resize-none" /></div>
            </form>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-2"><button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm text-zinc-400 hover:text-white font-bold">ยกเลิก</button><button type="button" onClick={handleSubmitNewQuestion} disabled={isSubmittingQ} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg disabled:opacity-50">{isSubmittingQ ? 'กำลังบันทึก...' : 'บันทึกคำถาม'}</button></div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50"><div className="flex items-center gap-3"><div className="bg-sky-500/20 p-2 rounded-xl text-sky-400"><Library size={24} /></div><div><h2 className="text-xl font-black text-white leading-none">NiiVaa SmartExam Library</h2><p className="text-xs text-slate-400 mt-1">คลังข้อสอบส่วนกลาง (เลือกนำเข้าได้ครั้งละ 5 ข้อ)</p></div></div><button onClick={() => { setIsImportModalOpen(false); setSelectedImports([]); }} className="text-slate-500 hover:text-white transition-colors bg-slate-900 hover:bg-slate-800 p-2 rounded-full"><X size={20} /></button></div>
            <div className="p-4 border-b border-slate-800/50 bg-slate-900/20"><div className="bg-black border border-slate-800 rounded-xl p-3 flex gap-3 items-center focus-within:border-sky-500 transition-colors shadow-inner"><Search className="text-slate-500 w-5 h-5 ml-1" /><input type="text" placeholder="ค้นหาข้อสอบจากคลังด้วยชื่อคำถาม หรือหมวดหมู่..." value={searchImport} onChange={(e) => setSearchImport(e.target.value)} className="w-full bg-transparent border-none text-white focus:outline-none placeholder:text-slate-600 font-medium" /></div></div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-950 custom-scrollbar">{isFetchingBank ? (<div className="flex flex-col items-center justify-center h-full text-sky-400"><Loader2 className="animate-spin mb-4" size={40} /><p className="font-bold">กำลังเชื่อมต่อฐานข้อมูลส่วนกลาง...</p></div>) : filteredSmartExam.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-slate-600"><p className="font-medium">ไม่พบข้อสอบในคลังส่วนกลาง</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-3">{filteredSmartExam.map((q) => { const isSelected = selectedImports.some(item => item.id === q.id); return (<div key={q.id} onClick={() => toggleImportSelection(q)} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex gap-4 ${isSelected ? 'bg-sky-950/40 border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.2)]' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}><div className={`mt-0.5 w-6 h-6 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-sky-500 border-sky-500 text-black' : 'border-slate-600 text-transparent'}`}><CheckSquare size={16} className={isSelected ? 'opacity-100' : 'opacity-0'} /></div><div className="flex-1 space-y-2 overflow-hidden"><p className={`font-bold line-clamp-2 leading-snug ${isSelected ? 'text-white' : 'text-slate-300'}`}>{q.question_text}</p><div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider"><span className="bg-black text-sky-400 px-2 py-1 rounded border border-sky-900/50 truncate max-w-[150px]">{q.exams?.title || "ทั่วไป"}</span><span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">{q.question_type === 'multiple_choice' ? 'ตัวเลือก' : 'เขียนตอบ'}</span></div></div></div>); })}</div>)}</div>
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center"><div className="flex items-center gap-2 font-bold text-sm text-slate-300">เลือกนำเข้าแล้ว: <span className="text-sky-400 text-xl font-black">{selectedImports.length}</span> <span className="text-slate-500">/ 5 ข้อ</span></div><div className="flex gap-2"><button onClick={() => { setIsImportModalOpen(false); setSelectedImports([]); }} className="px-6 py-3 text-slate-400 hover:text-white font-bold text-sm">ยกเลิก</button><button onClick={handleExecuteImport} disabled={selectedImports.length === 0 || isImporting} className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg transition-transform active:scale-95">{isImporting ? <Loader2 className="animate-spin w-5 h-5" /> : <DownloadCloud className="w-5 h-5" />}{isImporting ? 'กำลังนำเข้า...' : 'ยืนยันการนำเข้า'}</button></div></div>
          </div>
        </div>
      )}
      {/* 🚫 POPUP WINDOW: จัดการข้อความ SMS ทั้งหมด */}
      {showSmsModal && (
        <div className="fixed inset-0 z-[300] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { setShowSmsModal(false); setEditingSmsId(null); }}>
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

            {/* ส่วนหัว Modal */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MessageSquare size={20} className="text-indigo-400" /> ระบบจัดการคลังข้อความ SMS
                </h3>
                <p className="text-xs text-slate-400 mt-1">แก้ไขหรือลบข้อความอวยพรทั้งหมดที่ส่งเข้ามาในระบบ</p>
              </div>
              <button onClick={() => { setShowSmsModal(false); setEditingSmsId(null); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>

            {/* รายการข้อความ */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {allSms.length === 0 ? (
                <div className="text-center text-slate-500 py-10 italic text-sm">ยังไม่มีข้อความในระบบ</div>
              ) : (
                allSms.map((msg) => (
                  <div key={msg.id} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800/50 border border-slate-700 p-3 rounded-xl gap-3 hover:bg-slate-800 transition-colors">

                    {/* โซนแสดง/แก้ไข ข้อความ */}
                    <div className="flex-1 w-full">
                      <p className="text-[10px] text-cyan-400 font-bold mb-1">
                        จาก: {msg.sender_name || msg.author || 'ไม่ระบุชื่อ'}
                        <span className="text-slate-500 ml-2 font-normal">{new Date(msg.created_at).toLocaleTimeString('th-TH')}</span>
                      </p>

                      {editingSmsId === msg.id ? (
                        <textarea
                          value={editSmsText}
                          onChange={(e) => setEditSmsText(e.target.value)}
                          className="w-full bg-slate-950 border border-indigo-500 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none h-16"
                        />
                      ) : (
                        <p className="text-sm text-slate-200">{msg.message_text}</p>
                      )}
                    </div>

                    {/* โซนปุ่มเครื่องมือ */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {editingSmsId === msg.id ? (
                        <>
                          <button onClick={() => handleSaveEditSms(msg.id)} className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-all border border-emerald-500/30">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingSmsId(null)} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-all">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleStartEditSms(msg)} className="p-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-all border border-indigo-500/30">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteSms(msg.id)} className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-all border border-rose-500/30">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* 🚫 POPUP WINDOW: อัปโหลดสื่อพื้นหลัง */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[300] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !isUploading && setShowUploadModal(false)}>
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>

            <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <UploadCloud size={20} className="text-emerald-400" /> เพิ่มสื่อพื้นหลังใหม่
              </h3>
              <button onClick={() => !isUploading && setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* เลือกหมวดหมู่ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">เลือกหมวดหมู่ที่ต้องการเพิ่ม (Pool Key)</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {mediaCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* เลือกไฟล์ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ไฟล์รูปภาพ หรือ วิดีโอ</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600/20 file:text-emerald-400 hover:file:bg-emerald-600/30 cursor-pointer"
                />
              </div>

              {/* ปุ่มยืนยัน */}
              <button
                onClick={handleUploadMedia}
                disabled={!uploadFile || isUploading}
                className={`w-full py-3 mt-2 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${!uploadFile || isUploading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  }`}
              >
                {isUploading ? (
                  <><RefreshCw size={16} className="animate-spin" /> กำลังอัปโหลด...</>
                ) : (
                  <><UploadCloud size={16} /> อัปโหลดเข้าสู่ระบบ</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* 🌟 คู่มือ Slide-over Drawer (คู่มือการใช้งาน) */}
      {/* ========================================== */}

      {/* Backdrop (พื้นหลังดำเบลอ) */}
      <div
        className={`fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${showGuideDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowGuideDrawer(false)}
      />

      {/* แผง Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-zinc-950 border-l border-zinc-800 z-[510] shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transform transition-transform duration-500 ease-in-out flex flex-col ${showGuideDrawer ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* ส่วนหัว Drawer */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg"><BookOpen className="text-cyan-400 w-6 h-6" /></div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">คู่มือการควบคุมระบบ</h2>
              <p className="text-xs text-zinc-400">NiiVaa Master Control Room</p>
            </div>
          </div>
          <button onClick={() => setShowGuideDrawer(false)} className="text-zinc-500 hover:text-white bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* เนื้อหาคู่มือ (Accordion) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

          <details className="group bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer list-none outline-none text-amber-400 hover:bg-zinc-800/50 transition-colors">
              <span>⚠️ 0. ข้อควรระวังสำคัญก่อนเริ่มงาน</span>
              <ChevronDown className="w-5 h-5 text-zinc-500 group-open:-rotate-180 transition-transform duration-300" />
            </summary>
            <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50 mt-2 bg-zinc-950/50">
              <p className="font-bold text-white mt-2">🎵 การเปิดเสียงเพลง BGM:</p>
              <p>ผู้ควบคุมจะต้อง <strong>"ใช้เมาส์คลิกที่หน้าจอโปรเจกเตอร์เวที (Display) 1 ครั้ง"</strong> ก่อนเริ่มงาน เพื่อให้เว็บเบราว์เซอร์อนุญาตเล่นเสียงเพลงประกอบและเอฟเฟกต์ <span className="text-red-400">หากไม่คลิก เสียงจะไม่ดัง</span></p>
              <p className="font-bold text-white mt-4">📺 มอนิเตอร์จำลอง (Mini Monitor):</p>
              <p>กดปุ่มเปิดมอนิเตอร์ด้านบนเพื่อดูกล้องวงจรปิดจำลอง (Real-time) ว่าภาพบนเวทีแสดงผลอะไรอยู่ สามารถลากย้ายหน้าต่างได้อิสระ</p>
            </div>
          </details>

          <details className="group bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer list-none outline-none text-cyan-400 hover:bg-zinc-800/50 transition-colors">
              <span>📦 โซน 1: คลังสื่อ & ข้อความวิ่ง (คอลัมน์ซ้าย)</span>
              <ChevronDown className="w-5 h-5 text-zinc-500 group-open:-rotate-180 transition-transform duration-300" />
            </summary>
            <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50 mt-2 bg-zinc-950/50">
              <ul className="space-y-3 mt-2 list-disc pl-4 marker:text-cyan-600">
                <li><strong>ฉายสไลด์ภาพ:</strong> ติ๊กเลือกภาพหลายๆ รูป แล้วกดปุ่มสีเขียว 🖼️ ฉายสไลด์</li>
                <li><strong>เล่นวิดีโอ:</strong> ติ๊กเลือกวิดีโอ แล้วกดปุ่มสีฟ้า 🎬 เล่นคิววิดีโอ (หรือกด ▶️ หลังไฟล์)</li>
                <li><strong className="text-red-400">STOP ฉุกเฉิน:</strong> กดปุ่มสีแดงเพื่อหยุดสื่อทุกอย่างและกลับสู่หน้า Standby ทันที</li>
                <li><strong>ข้อความวิ่ง:</strong> พิมพ์ข้อความด้านล่าง เลือกสีพื้น/ฟอนต์ แล้วกดส่งขึ้นจอ</li>
              </ul>
            </div>
          </details>

          <details className="group bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer list-none outline-none text-indigo-400 hover:bg-zinc-800/50 transition-colors">
              <span>📋 โซน 2: ตารางคิวงาน (คอลัมน์กลาง)</span>
              <ChevronDown className="w-5 h-5 text-zinc-500 group-open:-rotate-180 transition-transform duration-300" />
            </summary>
            <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50 mt-2 bg-zinc-950/50">
              <p>สคริปต์จำลองของพิธีกร ช่วยติดตามความเคลื่อนไหว:</p>
              <ul className="space-y-3 mt-2 list-disc pl-4 marker:text-indigo-600">
                <li>กด <strong>🎬 สลับคิว</strong> เพื่อไฮไลท์รายการปัจจุบันเป็น <span className="text-red-400 font-bold">🔴 LIVE</span> ให้ทีมงานทุกคนรู้จังหวะตรงกัน</li>
                <li>กด <strong>✍️ แก้ไข</strong> เพื่อปรับเปลี่ยนบทพูดพิธีกรด่วนหน้างาน</li>
              </ul>
            </div>
          </details>

          <details className="group bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden" open>
            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer list-none outline-none text-emerald-400 hover:bg-zinc-800/50 transition-colors">
              <span>🎯 โซน 3: เกม & กิจกรรม (คอลัมน์ขวา)</span>
              <ChevronDown className="w-5 h-5 text-zinc-500 group-open:-rotate-180 transition-transform duration-300" />
            </summary>
            <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50 mt-2 bg-zinc-950/50 space-y-4">
              <div>
                <strong className="text-white block mb-1">🎮 การรันระบบเกม:</strong>
                <p>เลือกคำถามจากคลัง กดล้างคิวคำตอบเก่าทิ้ง แล้วเลือกโหมดเกม (1-5) เพื่อส่งขึ้นจอ</p>
              </div>
              <div className="pl-2 border-l-2 border-emerald-500/30">
                <strong className="text-emerald-400 text-xs uppercase block mb-1">สเต็ปการเฉลยคำตอบ:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-xs text-zinc-400">
                  <li>กด <span className="text-white font-bold">"👀 เปิดดูคำตอบทั้งหมด"</span> (โชว์คำตอบแต่ยังไม่ระบุว่าถูกผิด)</li>
                  <li>กด <span className="text-white font-bold">"💥 ประกาศผล & บวกคะแนน"</span> (จอจะเปลี่ยนสีบอกข้อถูก และบันทึกคะแนน)</li>
                </ol>
              </div>
              <div>
                <strong className="text-white block mb-1">🏆 โหมดประกาศผลแชมป์ (Grand Finale):</strong>
                <p>กด "1. เปิดหน้าจอสรุปคะแนน" (จอจะปิดรายชื่อไว้) แล้วให้ MC บิ้วอารมณ์ ก่อนกดปุ่ม "🔼 เผยคะแนน (ทีละ 1 อันดับ)"</p>
              </div>
              <div>
                <strong className="text-white block mb-1">📸 แกลเลอรีภาพสด (Live Photo):</strong>
                <p>ตั้งเวลากระพริบและเปิดฉาย Photo Wall รูปจะถูกดึงมาแสดงอัตโนมัติ หากเจอภาพไม่เหมาะสม กดที่รูปดวงตา (👁️) เพื่อซ่อน</p>
              </div>
            </div>
          </details>

          <details className="group bg-zinc-900 rounded-xl border border-amber-500/30 overflow-hidden shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <summary className="flex justify-between items-center p-4 font-bold cursor-pointer list-none outline-none text-yellow-300 hover:bg-zinc-800/50 transition-colors">
              <span>🛠️ เมนูลับ หน้าจอเวที (Display)</span>
              <ChevronDown className="w-5 h-5 text-amber-500 group-open:-rotate-180 transition-transform duration-300" />
            </summary>
            <div className="p-4 pt-0 text-sm text-zinc-300 leading-relaxed border-t border-zinc-800/50 mt-2 bg-zinc-950/50">
              <p>ที่หน้าจอโปรเจกเตอร์หลัก (Display) ให้นำเมาส์ไปชี้ที่ <strong>"มุมขวาบนของจอภาพเวที"</strong> จะมีแผงควบคุมปรากฏขึ้น:</p>
              <ul className="space-y-2 mt-2 list-disc pl-4 marker:text-yellow-500">
                <li><strong>จัด Layout ข้อความ:</strong> ปรับเป็นคอลัมน์ หรือแนวตั้ง ลด/ขยาย ฟอนต์</li>
                <li><strong>หยุดข้อความวิ่ง:</strong> สั่งหยุด (Scroll Pause) เพื่อให้อ่านทัน</li>
                <li><strong>แกลเลอรีซ่อนชื่อ:</strong> สั่งเปิด/ปิด โชว์ชื่อหรือคำอวยพรของแขก</li>
              </ul>
            </div>
          </details>

        </div>
      </div>

    </div>
  );
}

export default function DirectorController() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400">กำลังโหลดระบบควบคุม...</div>}>
      // 🌟 หุ้มด้วย RouteGuard และอนุญาตให้ admin และ controller เข้าใช้งานได้
      <RouteGuard allowedRoles={['admin', 'controller']}>
        <DirectorControllerContent />
      </RouteGuard>
    </Suspense>
  );
}