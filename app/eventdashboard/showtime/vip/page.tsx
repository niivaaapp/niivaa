"use client";
import RouteGuard from '@/components/RouteGuard';
import Link from 'next/link';
import { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  UserCheck, ArrowLeft, ArrowUp, ArrowDown, Bell, CheckCircle2, HelpCircle, Mic,
  Send, AlertTriangle, LayoutGrid, MessageSquare, Camera, Loader2, X, ImageIcon, Clock,
  UserPlus, Upload, Users, Save, ChevronDown, ChevronsUp, ChevronsDown, MonitorUp, MonitorOff
} from 'lucide-react';

// 🌟 Import ตัวคู่มือ (ปรับ Path ให้ตรงกับโฟลเดอร์ของคุณ)
import McShowtimeManualDrawer from '@/components/McShowtimeManualDrawer';

interface Attendee {
  id: string;
  profile_id?: string;
  prefix?: string;
  fullname: string;
  position: string;
  organization: string;
  bio_note?: string;
  attendee_type: string;
  is_present?: boolean;
  status: 'pending' | 'arrived' | 'seated' | string;
  is_read: boolean;
  priority_level: number;
  action_sequence: number;
  special_act1?: string;
  special_act2?: string;
  global_profiles?: {
    profile_image_url?: string;
  };
}

function McShowtimeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const eventId = searchParams.get('event_id') || 'current';

  // ==========================================
  // 🌟 STATES จัดการข้อมูลพื้นฐาน
  // ==========================================
  const [activeEventId, setActiveEventId] = useState<string | null>(null); 
  const [eventData, setEventData] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [time, setTime] = useState<Date | null>(null);

  // 🌟 State ควบคุมคู่มือ
  const [isManualOpen, setIsManualOpen] = useState(false);

  // ==========================================
  // 🌟 STATES ระบบรับ-ส่งข้อความ (SMS / SOS)
  // ==========================================
  const [urgentSms, setUrgentSms] = useState<{ text: string, sender: string } | null>(null);
  const [showMsgBox, setShowMsgBox] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const unreadCount = messages.length;
  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [incomingMessages, setIncomingMessages] = useState<{ id: string, time: string, text: string, isShowingOnMarquee: boolean }[]>([]);

  const marqueeDisplayText = useMemo(() => {
    const activeMessages = incomingMessages.filter(msg => msg.isShowingOnMarquee);
    if (activeMessages.length === 0) return "พร้อมใช้งานหน้าจอ VIP | หากพบปัญหาแจ้ง SOS ได้ทันที";
    return activeMessages.map(msg => `🔴 ประกาศด่วน [เวลา ${msg.time}]: ${msg.text}`).join(' ✦✦✦ ');
  }, [incomingMessages]);

  const toggleMarquee = (id: string) => {
    setIncomingMessages(prev => prev.map(msg => msg.id === id ? { ...msg, isShowingOnMarquee: !msg.isShowingOnMarquee } : msg));
  };
  const resolveMessage = (id: string) => {
    setIncomingMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const [marqueeText, setMarqueeText] = useState<string>("พร้อมใช้งานหน้าจอ VIP | หากพบปัญหาแจ้ง SOS ได้ทันที");
  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);

  // 5. ระบบส่ง SOS หา SM
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosText, setSosText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [sosPresets, setSosPresets] = useState(["ขอเวลาเตรียมตัว 2 นาที", "ข้ามคิวถัดไปเลยไหม?", "ขอคิวด่วนให้ประธาน", "ไมค์มีปัญหา"]);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState(false);
  const [assistantInputText, setAssistantInputText] = useState<string>('');
  const [mcUploadFile, setMcUploadFile] = useState<File | null>(null);
  const [isMcUploading, setIsMcUploading] = useState(false);

  // ==========================================
  // 🌟 STATES จัดการหน้าจอและ UI
  // ==========================================
  const [showImagePopup, setShowImagePopup] = useState<string | null>(null);
  const [isLiveSync, setIsLiveSync] = useState<boolean>(false);
  const [graphicMode, setGraphicMode] = useState<'classic' | 'dynamic'>('dynamic');
  const [slideInterval, setSlideInterval] = useState<number>(5);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPosition, setQuickPosition] = useState('');
  const [quickOrg, setQuickOrg] = useState('');
  const [quickBio, setQuickBio] = useState('');
  const [quickFile, setQuickFile] = useState<File | null>(null);
  const [isSavingQuickVip, setIsSavingQuickVip] = useState(false);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<string>('Present');

  const filterLabels = [
    { id: 'All', label: '📋 ทั้งหมด (All)', group: 1 },
    { id: 'Present', label: '🎤 ประกาศแนะนำตัว (Present)', group: 1 },
    { id: 'VIP', label: '🌟 เฉพาะ VIP', group: 2 },
    { id: 'Staff', label: '🎧 เฉพาะ Staff', group: 2 },
    { id: 'General', label: '👥 เฉพาะ General', group: 2 },
    { id: 'Speaker', label: '🗣️ เฉพาะ Speaker', group: 2 },
    { id: 'Guest', label: '🤝 เฉพาะ Guest', group: 2 },
    { id: 'Pending', label: '⏳ สถานะ: รอยืนยัน (Pending)', group: 3 },
    { id: 'Arrived', label: '✅ สถานะ: เช็คอินแล้ว (Arrived)', group: 3 },
    { id: 'Act1', label: '🎭 คิวพิเศษ 1', group: 4 },
    { id: 'Act2', label: '🎬 คิวพิเศษ 2', group: 4 },
    { id: 'HasGift', label: '🎁 ผู้ที่มีของที่ระลึก', group: 4 },
  ];
  const currentFilterConfig = filterLabels.find(f => f.id === filterMode) || filterLabels[0];
  const isGroup1 = currentFilterConfig.group === 1;

  const [startTime, setStartTime] = useState<number | null>(null);
  const [passedCount, setPassedCount] = useState<number>(0);
  const [avgMinutesPerPerson, setAvgMinutesPerPerson] = useState<number>(2);
  const [customStartTime, setCustomStartTime] = useState<string>("10:09");
  const [showStartTimeModal, setShowStartTimeModal] = useState<boolean>(false);
  const [hasStartedLiveClick, setHasStartedLiveClick] = useState<boolean>(false);

  // ==========================================
  // 🌟 EFFECTS & DATA FETCHING
  // ==========================================
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowImagePopup(null); };
    window.addEventListener('keydown', handleEsc);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => { setSelectedAttendeeId(null); }, [filterMode]);

  const fetchData = async () => {
    let query = supabase.from('event_attendees').select(`*, global_profiles (id, profile_image_url)`);
    if (eventId !== 'current') query = query.eq('event_id', eventId);

    const { data, error } = await query;
    if (!error && data) setAttendees(data as any[]);
  };

  const fetchEventData = async () => {
    try {
      let query = supabase.from('events').select('id, title, brand_name, location_hotel, event_date');
      if (eventId && eventId !== 'current') query = query.eq('id', eventId);
      else query = query.order('priority_level', { ascending: false }).limit(1);

      const { data, error } = await query.single();
      if (!error && data) {
        setEventData(data);
        setActiveEventId(data.id); 
      }
    } catch (err) { console.error("Fetch event error:", err); }
  };

  useEffect(() => {
    fetchEventData();
    fetchData();

    const attendeesChannel = supabase.channel('vip_attendees_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendees' }, () => {
          fetchData(); 
      }).subscribe();

    return () => { supabase.removeChannel(attendeesChannel); };
  }, [eventId]);

  useEffect(() => {
    if (!activeEventId) return;

    const channel = supabase.channel(`receive-sms-vip-${activeEventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${activeEventId}`
      }, (payload) => {
        const newMsg = payload.new;
        const isFromSM = newMsg.sender_role === 'sm' || newMsg.sender_role === 'admin';
        const isForVIP = !newMsg.target_screen || ['all', 'mc_vip', 'vip', 'mc_prompter'].includes(newMsg.target_screen);

        if (isFromSM && isForVIP) {
          const finalMessage = newMsg.message_text || "ไม่มีข้อความ";
          const finalSender = newMsg.sender_name || "ศูนย์อำนวยการ";
          const timeStr = new Date(newMsg.created_at || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

          setMessages(prev => [{ time: timeStr, text: finalMessage }, ...prev]); 
          setUrgentSms({ text: finalMessage, sender: finalSender }); 
          setUrgentIntercomMsg(finalMessage); 
          setShowUrgentBanner(true);

          setIncomingMessages(prev => [{
            id: newMsg.id || Date.now().toString(),
            time: timeStr,
            text: finalMessage,
            isShowingOnMarquee: true 
          }, ...prev]);

          setIsInboxOpen(true);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeEventId]);

  const filteredAttendees = useMemo(() => {
    let result = [...attendees];
    const getType = (val: any) => val ? String(val).trim().toUpperCase() : '';

    switch (filterMode) {
      case 'Present':
        result = result.filter(a => a.is_present === true || String(a.is_present).toUpperCase() === 'Y' || String(a.is_present).toUpperCase() === 'TRUE');
        break;
      case 'Act1': result = result.filter(a => a.special_act1 && a.special_act1.trim() !== ''); break;
      case 'Act2': result = result.filter(a => a.special_act2 && a.special_act2.trim() !== ''); break;
      case 'VIP': case 'Staff': case 'General':
        result = result.filter(a => getType(a.attendee_type) === filterMode.toUpperCase());
        break;
      case 'Pending': result = result.filter(a => a.status === 'pending'); break;
      case 'Arrived': result = result.filter(a => a.status === 'arrived' || a.status === 'seated'); break;
      case 'HasGift':
       result = result.filter((a: any) => a.gift_number !== null && a.gift_number !== undefined && String(a.gift_number).trim() !== '');
        break;
      case 'All': default: break;
    }

    result.sort((a, b) => isGroup1 ? (a.priority_level || 50) - (b.priority_level || 50) : (a.action_sequence || 9999) - (b.action_sequence || 9999));
    return result;
  }, [attendees, filterMode, isGroup1]);

  const unreadAttendees = filteredAttendees.filter(v => !v.is_read);
  const currentReadingAtt = (selectedAttendeeId ? filteredAttendees.find(a => a.id === selectedAttendeeId) : unreadAttendees[0]) || filteredAttendees[0] || null;
  const currentIndex = currentReadingAtt ? filteredAttendees.findIndex(a => a.id === currentReadingAtt.id) : -1;
  const nextReadingAtt = currentIndex !== -1 && currentIndex + 1 < filteredAttendees.length ? filteredAttendees[currentIndex + 1] : null;

  // ==========================================
  // 🌟 ฟังก์ชันจัดการข้อมูล (Handlers)
  // ==========================================
  const getAttendeeImageUrl = (att: Attendee | null) => {
    if (!att) return null;
    let rawUrl = att.global_profiles?.profile_image_url || (att as any).profile_image_url || (att as any).image_url;
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
    rawUrl = rawUrl.trim();
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    const cleanPath = rawUrl.startsWith('/') ? rawUrl.substring(1) : rawUrl;
    return supabase.storage.from('event-media').getPublicUrl(cleanPath).data?.publicUrl || null;
  };

  const sendToStageScreen = async (att: Attendee) => {
    if (!activeEventId) return;
    try {
      const { data, error } = await supabase.from('screen_state').update({
        mode: 'mc_vip',
        media_url: getAttendeeImageUrl(att) || '',
        payload: {
          fullname: `${att.prefix || ''}${att.fullname}`,
          position: att.position || '',
          role: (att as any).role_in_event || '',
          graphic_mode: graphicMode
        },
        updated_at: new Date().toISOString()
      }).eq('id', 'current').select();

      if (error) console.error("❌ ติด Error จาก Supabase:", error);
    } catch (err) { console.error("❌ ส่งขึ้นจอผิดพลาดระดับโค้ด/เน็ตเวิร์ก:", err); }
  };

  // 🌟 ยุบรวมลอจิกการแตะรายชื่อ เพื่อใช้ร่วมกับ Remote Clicker ได้
  const handleSelectAttendee = useCallback((att: Attendee, index: number) => {
    setSelectedAttendeeId(att.id);
    if (isLiveSync) sendToStageScreen(att);

    const now = Date.now();
    setHasStartedLiveClick(true);
    if (!startTime) {
      setStartTime(now);
      setPassedCount(1);
    } else if (currentIndex !== -1 && index > currentIndex) {
      const elapsedMinutes = (now - startTime) / (1000 * 60);
      const newCount = passedCount + 1;
      setPassedCount(newCount);
      setAvgMinutesPerPerson(elapsedMinutes / newCount);
    }
  }, [isLiveSync, startTime, passedCount, currentIndex, graphicMode]);

  // ==========================================
  // 🌟 ระบบรองรับ Remote Pointer (Clicker)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ยกเว้นกรณีพิมพ์ใน input/textarea จะได้ไม่เลื่อนคิว
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (['PageDown', 'ArrowRight', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
        if (currentIndex < filteredAttendees.length - 1) {
          const nextIndex = currentIndex + 1;
          handleSelectAttendee(filteredAttendees[nextIndex], nextIndex);
        }
      } else if (['PageUp', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        if (currentIndex > 0) {
          const prevIndex = currentIndex - 1;
          handleSelectAttendee(filteredAttendees[prevIndex], prevIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, filteredAttendees, handleSelectAttendee]);


  const handleToggleReadStatus = async (att: Attendee) => {
    await supabase.from('event_attendees').update({ is_read: !att.is_read }).eq('id', att.id);
  };

  const handleGroup1Move = async (index: number, direction: 'up' | 'down') => {
    const currentAtt = filteredAttendees[index];
    const swapAtt = filteredAttendees[direction === 'up' ? index - 1 : index + 1];
    const currP = currentAtt.priority_level || 50;
    const swapP = swapAtt.priority_level || 50;

    await supabase.from('event_attendees').update({ priority_level: swapP }).eq('id', currentAtt.id);
    await supabase.from('event_attendees').update({ priority_level: currP }).eq('id', swapAtt.id);
  };

  const handleQuickMove = async (att: Attendee, direction: 'top' | 'bottom') => {
    if (isGroup1) {
      const vals = filteredAttendees.map(a => a.priority_level || 50);
      const newP = direction === 'top' ? Math.min(...vals) - 10 : Math.max(...vals) + 10;
      await supabase.from('event_attendees').update({ priority_level: newP }).eq('id', att.id);
    } else {
      const vals = filteredAttendees.map(a => a.action_sequence || 9999);
      const newS = direction === 'top' ? Math.min(...vals) - 10 : Math.max(...vals) + 10;
      await supabase.from('event_attendees').update({ action_sequence: newS }).eq('id', att.id);
    }
  };

  const handleSavePreset = () => {
    if (sosText.trim() && !sosPresets.includes(sosText.trim())) {
      setSosPresets([sosText.trim(), ...sosPresets]);
      setSosText('');
    }
  };

  const handleDeletePreset = (presetToDelete: string) => {
    if (window.confirm(`ต้องการลบข้อความ "${presetToDelete}" ใช่หรือไม่?`)) {
      setSosPresets(prev => prev.filter(preset => preset !== presetToDelete));
    }
  };

  const handleSendSOS = async (presetText?: string) => {
    const messageToSend = typeof presetText === 'string' ? presetText : sosText;
    if (!messageToSend || !messageToSend.trim() || !activeEventId) return;

    try {
      await supabase.from('event_live_messages').insert({
        event_id: activeEventId,
        sender_name: 'พิธีกร (หน้า VIP)',
        sender_role: 'mc',
        message_text: `🚨 SOS ด่วน: ${messageToSend.trim()}`,
        is_approved: true,
        target_screen: 'staff'
      });
      setShowSosModal(false);
      setSosText('');
    } catch (err) { console.error("ส่ง SOS ล้มเหลว:", err); }
  };

  const handleMicClick = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียง แนะนำให้ใช้ Google Chrome บนคอมพิวเตอร์ครับ');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'th-TH';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => setSosText(prev => prev ? prev + ' ' + event.results[0][0].transcript : event.results[0][0].transcript);
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') alert('ถูกบล็อกการใช้ไมโครโฟน! กรุณาอนุญาตด้านบน');
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) { setIsListening(false); }
  };

  const handleSendHelpRequest = async () => {
    if (!assistantInputText.trim() && !mcUploadFile) return;
    setIsMcUploading(true);
    try {
      let imageUrl = '';
      if (mcUploadFile) {
        const ext = mcUploadFile.name.split('.').pop();
        const fileName = `mc_req_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('intercom-media').upload(`mc_requests/${fileName}`, mcUploadFile);
        if (!upErr) imageUrl = supabase.storage.from('intercom-media').getPublicUrl(`mc_requests/${fileName}`).data.publicUrl;
      }
      await supabase.from('screen_state').update({ mc_help_request: assistantInputText.trim(), mc_help_image: imageUrl, updated_at: new Date().toISOString() }).eq('id', 'current');
      setAssistantInputText('');
      setMcUploadFile(null);
      setIsHelpPanelOpen(false);
      alert('ส่งภาพถ่ายและข้อความด่วนสำเร็จ!');
    } catch (err) { alert('ระบบส่งสัญญาณภาพขัดข้อง'); }
    setIsMcUploading(false);
  };

  const handleSaveQuickVip = async () => {
    if (!quickName.trim()) { alert('กรุณากรอกชื่อ-นามสกุล VIP'); return; }
    setIsSavingQuickVip(true);
    try {
      let imageUrl = '';
      let profileId = null;

      if (quickFile) {
        const ext = quickFile.name.split('.').pop();
        const fileName = `quick_vip_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('event-media').upload(`profiles/${fileName}`, quickFile);
        if (!upErr) imageUrl = supabase.storage.from('event-media').getPublicUrl(`profiles/${fileName}`).data.publicUrl;
      }

      const { data: profile } = await supabase.from('global_profiles').insert([{
        first_name: quickName, position: quickPosition, organization: quickOrg, bio_note: quickBio, profile_image_url: imageUrl, person_type: 'layperson'
      }]).select('id').single();

      if (profile) profileId = profile.id;

      const nextOrder = filteredAttendees.length > 0 ? Math.max(...filteredAttendees.map(v => v.priority_level || 0)) + 10 : 10;

      await supabase.from('event_attendees').insert([{
        event_id: activeEventId, profile_id: profileId, fullname: quickName, position: quickPosition || 'ผู้มีเกียรติ', organization: quickOrg || 'ไม่ระบุหน่วยงาน', bio_note: quickBio, status: 'arrived', is_present: true, attendee_type: 'VIP', priority_level: nextOrder, action_sequence: nextOrder
      }]);

      alert(`✅ แทรกรายชื่อด่วนสำเร็จ!`);
      setQuickName(''); setQuickPosition(''); setQuickOrg(''); setQuickBio(''); setQuickFile(null);
      setIsAddModalOpen(false);

    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึก'); }
    setIsSavingQuickVip(false);
  };

  const startAutoSlideshow = async (allAttendees: Attendee[]) => {
    if (!activeEventId) return;
    try {
      await supabase.from('screen_state').update({
        mode: 'mc_vip_auto',
        media_url: '', 
        payload: {
          attendees: allAttendees.map(att => ({
            fullname: `${att.prefix || ''}${att.fullname}`,
            position: att.position || '',
            role:(att as any).role_in_event || '',
            media_url: getAttendeeImageUrl(att) || ''
          })),
          interval: slideInterval, 
          graphic_mode: graphicMode
        },
        updated_at: new Date().toISOString()
      }).eq('id', 'current'); 

      console.log("เริ่มโหมด Auto Slideshow");
    } catch (err) { console.error("ส่งคำสั่ง Auto ผิดพลาด:", err); }
  };

  const handleStopStage = async () => {
    if (!activeEventId) return;
    try {
      await supabase.from('screen_state').update({
        mode: 'standby', media_url: '', payload: {}, updated_at: new Date().toISOString()
      }).eq('id', 'current'); 
    } catch (err) { console.error(err); }
  };

  const calculateETA = (idx: number, currentSelectedIndex: number) => {
    if (currentSelectedIndex !== -1 && idx <= currentSelectedIndex) return "ผ่านแล้ว";
    const baseIndex = currentSelectedIndex !== -1 ? currentSelectedIndex : 0;
    if (idx <= baseIndex && currentSelectedIndex === -1) return "-";
    const distance = idx - baseIndex;

    if (!hasStartedLiveClick) {
      const [hours, minutes] = customStartTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const defaultSecondsPerPerson = 30; 
      const estimatedTimeMs = startDate.getTime() + (idx * defaultSecondsPerPerson * 1000);
      return new Date(estimatedTimeMs).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    } else {
      const estimatedMinutesFromNow = distance * avgMinutesPerPerson;
      const targetTime = new Date(Date.now() + estimatedMinutesFromNow * 60000);
      return targetTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    }
  };

  // ==========================================
  // 🌟 UI RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1633] via-[#17244d] to-[#0c1633] text-white flex flex-col font-sans select-none overflow-hidden relative">

      {/* 🌟 Component คู่มือ */}
      <McShowtimeManualDrawer isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      {/* แบนเนอร์ฉุกเฉิน */}
      {showUrgentBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-4xl bg-red-600/95 backdrop-blur-md border-2 border-red-400 text-white p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-in slide-in-from-top-10 flex flex-col items-center text-center">
          <div className="flex items-center gap-3 mb-2 text-amber-300">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
            <h2 className="text-2xl font-black tracking-wider">ข้อความด่วนจากผู้กำกับเวที (SM)</h2>
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <p className="text-3xl font-bold leading-relaxed">{urgentIntercomMsg}</p>
          <button onClick={() => setShowUrgentBanner(false)} className="mt-6 px-8 py-3 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2">
            <X size={18} /> รับทราบและปิดข้อความ
          </button>
        </div>
      )}

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 bg-[#0b1430]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl flex flex-col w-full">
        <div className="px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors shrink-0">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                <UserCheck size={24} className="text-amber-400" /> พิธีกรอเนกประสงค์ (MC Prompter)
              </h1>
              <div className="text-[10px] text-amber-400/80 font-bold uppercase tracking-widest mt-0.5 truncate max-w-sm md:max-w-xl">
                {eventData?.title ? [eventData.title, eventData.brand_name, eventData.location_hotel, eventData.event_date].filter(Boolean).join(' | ') : 'Smart Prompter System'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            {urgentSms && (
              <div className="hidden sm:flex bg-red-600/90 border border-red-400 text-white px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-in fade-in zoom-in items-center gap-2">
                <AlertTriangle size={16} className="animate-pulse text-amber-300" />
                <div className="flex flex-col text-left mr-2">
                  <span className="text-[9px] font-black uppercase text-amber-300">จาก: {urgentSms.sender}</span>
                  <span className="text-xs font-bold truncate max-w-[150px]">{urgentSms.text}</span>
                </div>
                <button onClick={() => setUrgentSms(null)} className="p-1 hover:bg-black/30 rounded-lg transition-colors"><X size={14} /></button>
              </div>
            )}

            <div className="relative">
              <button onClick={() => setShowMsgBox(!showMsgBox)} className={`relative p-2.5 rounded-xl border transition-all ${showMsgBox ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}>
                <MessageSquare size={18} />
                {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0b1430]">{unreadCount}</span>}
              </button>

              {showMsgBox && (
                <div className="absolute top-full right-0 mt-3 w-80 bg-blue-900/95 backdrop-blur-xl border border-blue-400/50 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-blue-400/30 flex justify-between items-center bg-black/20">
                    <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={16} /> ข้อความล่าสุด</h3>
                    <button onClick={() => setShowMsgBox(false)} className="text-blue-300 hover:text-white p-1 bg-white/5 rounded-md"><X size={16} /></button>
                  </div>
                  <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {messages.length > 0 ? messages.map((msg, i) => (
                      <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-3">
                        <div className="text-[10px] text-blue-300 font-bold mb-1">เวลา {msg.time}</div><p className="text-sm text-white font-medium">{msg.text}</p>
                      </div>
                    )) : <div className="text-xs text-center text-blue-300/50 py-6 font-bold">ไม่มีข้อความใหม่</div>}
                  </div>
                </div>
              )}
            </div>
            <a
              href={`/eventdashboard/attendees?event_id=${eventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-emerald-950/40 hover:bg-emerald-700/60 border border-emerald-600/50 text-emerald-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span className="whitespace-nowrap">ลงทะเบียนผู้ร่วมงาน</span>
            </a>
            {/* 🌟 กรณีที่ 1: เข้ามาจากหน้า Hub (Official) -> แสดงปุ่ม "กลับหน้าหลัก" */}
            {source === 'hub' && (
              <Link
                href={`/officialeventdashboard/hub?event_id=${eventId}`}
                className="group flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all border border-slate-700 w-max cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="whitespace-nowrap">กลับหน้าหลัก</span>
              </Link>
            )}

            {/* 🌟 กรณีที่ 2: เข้ามาจากหน้าอื่นๆ หรือ Dashboard -> แสดงปุ่ม "กลับหน้าศูนย์กลาง" */}
            {source !== 'hub' && (
              <Link
                href={`/events/event-dashboard/${eventId}`} 
                className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
              >
                <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
              </Link>
            )}

            {/* 🌟 ปุ่มเปิดคู่มือ */}
            <button 
              onClick={() => setIsManualOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-400 border border-amber-800/50 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <HelpCircle size={18} />
              คู่มือ
            </button>

            <div className="text-right hidden sm:block border-l border-white/10 pl-4">
              <div className="text-xl font-mono font-black text-cyan-400 leading-none">{time ? time.toLocaleTimeString('th-TH') : '00:00:00'}</div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
            </div>
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 md:h-10 object-contain ml-2 border-l border-white/10 pl-4 hidden md:block" />
          </div>
        </div>

        {/* แถบข้อความวิ่ง Marquee */}
        <div className="bg-blue-950/80 border-y border-blue-500/30 px-4 md:px-6 py-1.5 flex items-center w-full shadow-inner relative z-40">
          <span className="bg-blue-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 mr-3 flex items-center gap-1 shadow-[0_0_10px_rgba(37,99,235,0.5)]">
            <Bell size={12} className="animate-pulse" /> SYSTEM UPDATE
          </span>
          <div className="flex-1 overflow-hidden relative flex items-center">
            <style>{`
            @keyframes scroll-text { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
           .animate-scroll { display: inline-block; white-space: nowrap; animation: scroll-text 20s linear infinite; }
         `}</style>

            <div className="animate-scroll text-amber-300 text-sm md:text-base font-bold tracking-wider">
              {marqueeDisplayText}
            </div>
          </div>
        </div>

        {/* แถบเครื่องมือ */}
        <div className="px-4 py-2.5 md:px-6 bg-black/30 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="appearance-none bg-[#0b1430] border border-white/20 text-white font-bold text-[10px] rounded-xl pl-3 pr-8 py-2 outline-none focus:border-amber-500 cursor-pointer shadow-inner">
                {filterLabels.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-2 text-zinc-400 pointer-events-none" />
            </div>
            <button onClick={() => router.push(`/officialeventdashboard/mc-script?event_id=${eventId}`)} className="bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-400 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"><Mic size={12} /> สคริปต์พิธีการ</button>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-400 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"><UserPlus size={12} /> เพิ่มชื่อด่วน</button>
            <button onClick={() => setIsHelpPanelOpen(!isHelpPanelOpen)} className="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-300 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all hidden sm:flex"><Camera size={12} /> ส่งรูปหา SM</button>
            <button onClick={() => setShowSosModal(true)} className="bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all"><AlertTriangle size={12} /> SOS</button>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 bg-gray-950/80 p-1.5 rounded-xl border border-white/10 shadow-inner w-full xl:w-auto">
            <button onClick={() => setIsLiveSync(!isLiveSync)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md ${isLiveSync ? 'bg-[#00E676] text-black shadow-[0_0_15px_rgba(0,230,118,0.5)] animate-pulse' : 'bg-zinc-800 text-zinc-400 border border-white/10 hover:bg-zinc-700'}`}>
              {isLiveSync ? <MonitorUp size={14} /> : <MonitorOff size={14} />} {isLiveSync ? 'ON AIR' : 'OFF'}
            </button>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold ml-1 mr-1 hidden sm:block">GRAPHIC:</span>
              <button onClick={() => setGraphicMode('classic')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${graphicMode === 'classic' ? 'bg-amber-500 text-black shadow-md' : 'bg-black/50 text-gray-400 hover:text-white border border-white/5'}`}>คลาสสิก</button>
              <button onClick={() => setGraphicMode('dynamic')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${graphicMode === 'dynamic' ? 'bg-amber-500 text-black shadow-md' : 'bg-black/50 text-gray-400 hover:text-white border border-white/5'}`}>เคลื่อนไหว</button>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[9px] text-purple-400 uppercase tracking-widest font-bold hidden sm:block">🎵 AUTO:</span>
              <div className="flex items-center bg-black border border-gray-700 px-2 py-1 rounded-md">
                <input type="number" min="3" max="60" value={slideInterval} onChange={(e) => setSlideInterval(Number(e.target.value))} className="w-8 bg-transparent text-amber-400 text-center text-[10px] font-bold outline-none focus:text-white" />
                <span className="text-[9px] text-gray-500 ml-1">วิ</span>
              </div>
              <button onClick={() => startAutoSlideshow(attendees)} className="bg-purple-900/80 hover:bg-purple-600 text-purple-200 hover:text-white px-3 py-1.5 rounded-md text-[10px] font-bold transition-all shadow-md">▶ เล่น</button>
              <button onClick={handleStopStage} className="bg-red-950/80 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded-md text-[10px] font-bold transition-all">■ หยุด</button>
            </div>
          </div>
        </div>
      </div>

      {/* DISPLAY WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-4 overflow-y-auto pb-6 pr-1 custom-scrollbar">
          {currentReadingAtt ? (
            <div className="bg-[#14234c]/90 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 active:scale-[0.995]" onClick={() => handleToggleReadStatus(currentReadingAtt)}>
              <div className="p-5 flex flex-col sm:flex-row gap-5 items-center flex-1">
                <div className="flex flex-row sm:flex-col items-center justify-center bg-black/30 px-5 sm:px-3 py-3 sm:py-5 rounded-2xl shrink-0 min-w-[70px] gap-2">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">ลำดับ</span>
                  <span className="text-3xl font-mono font-black text-amber-400">{filteredAttendees.findIndex(v => v.id === currentReadingAtt.id) + 1}</span>
                </div>
                {(() => {
                  const imgUrl = getAttendeeImageUrl(currentReadingAtt);
                  return imgUrl ? (
                    <img src={imgUrl} alt={currentReadingAtt.fullname} onClick={(e) => { e.stopPropagation(); setShowImagePopup(imgUrl); }} className="w-24 h-28 md:w-28 md:h-32 object-cover rounded-2xl border-2 border-amber-400/60 shadow-lg bg-zinc-900 shrink-0 cursor-pointer hover:scale-105 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all duration-300" />
                  ) : (
                    <div className="w-24 h-28 md:w-28 md:h-32 bg-black/40 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-zinc-600 shrink-0 gap-1"><ImageIcon size={32} /><span className="text-[9px] text-zinc-600 font-bold">ไม่มีรูปภาพ</span></div>
                  );
                })()}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <span className="text-[9px] bg-amber-500 text-black font-black px-2 py-0.5 rounded uppercase tracking-wider">🔥 คิวปัจจุบัน (READING NOW)</span>
                  <h2 className="text-2xl md:text-3xl font-black text-amber-400 tracking-wide mt-2 leading-tight">{currentReadingAtt.prefix}{currentReadingAtt.fullname}</h2>
                  <p className="text-base font-bold text-zinc-200 mt-1 leading-snug">{currentReadingAtt.position}</p>
                  <p className="text-sm text-cyan-400 font-medium mt-0.5">{currentReadingAtt.organization}</p>
                </div>
              </div>
              <div className="bg-[#243565] border-t border-white/5 px-5 py-4 text-left">
                <span className="text-[9px] text-cyan-400 font-black uppercase tracking-widest block mb-1">หมายเหตุพิเศษ / คำกล่าวแนะนำ (BIO_NOTE)</span>
                <p className="text-zinc-300 text-sm font-semibold whitespace-pre-wrap">{currentReadingAtt.bio_note || 'ไม่มีหมายเหตุกำกับเพิ่มเติม'}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-dashed border-white/10 bg-black/10 rounded-3xl flex flex-col items-center justify-center text-zinc-500 p-8 min-h-[300px]">
              <CheckCircle2 size={48} className="text-zinc-600 mb-2" />
              <p className="text-lg font-black uppercase">ไม่มีคิวรายชื่อค้างอ่านแนะนำในบอร์ด</p>
            </div>
          )}

          {nextReadingAtt && (
            <div className="bg-[#14234c]/50 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between opacity-50 scale-[0.99] transition-all" onClick={() => handleToggleReadStatus(nextReadingAtt)}>
              <div className="p-4 flex gap-5 items-center flex-1">
                <div className="flex flex-col items-center justify-center bg-black/20 px-3 py-3 rounded-xl shrink-0 min-w-[55px]">
                  <span className="text-[8px] font-bold text-zinc-600 uppercase">ลำดับ</span>
                  <span className="text-xl font-mono font-black text-zinc-400">{filteredAttendees.findIndex(v => v.id === nextReadingAtt.id) + 1}</span>
                </div>
                {nextReadingAtt.global_profiles?.profile_image_url ? (
                  <img src={nextReadingAtt.global_profiles.profile_image_url} alt="VIP" className="w-16 h-20 object-cover rounded-lg border border-white/10 grayscale" />
                ) : (
                  <div className="w-16 h-20 bg-black/40 rounded-lg border border-white/5 flex items-center justify-center text-zinc-700 shrink-0"><ImageIcon size={20} /></div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">คิวถัดไป (UP NEXT PREPARE)</span>
                  <h3 className="text-xl font-black text-zinc-300 truncate mt-0.5">{nextReadingAtt.prefix}{nextReadingAtt.fullname}</h3>
                  <p className="text-xs font-bold text-zinc-500 truncate mt-0.5">{nextReadingAtt.position} • <span className="text-cyan-600">{nextReadingAtt.organization}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 xl:col-span-4 bg-black/30 border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md h-[calc(100vh-170px)]">
          <div className="p-3.5 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
            <span className="font-black text-xs text-zinc-400 uppercase tracking-widest">บอร์ดรายชื่อรวมหลังบ้าน</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStartTimeModal(true)}
                className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-amber-500/30 transition-colors shadow"
                title="ตั้งเวลาเริ่มต้นงานล่วงหน้า"
              >
                <span>⏰ ST: {customStartTime}</span>
              </button>
            </div>

            {showStartTimeModal && (
              <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4">
                  <h3 className="text-white font-bold text-sm">ตั้งเวลากำหนดการเริ่มต้น (Start Time)</h3>
                  <p className="text-xs text-zinc-400">กำหนดเวลาเริ่มอ่านตามสคริปต์ เพื่อให้ระบบคำนวณ ETA ล่วงหน้า (อัตรา 30 วิ/คน)</p>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full bg-black/60 border border-amber-500/50 rounded-xl px-4 py-2 text-center text-white text-lg font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowStartTimeModal(false)}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      บันทึก / ปิด
                    </button>
                  </div>
                </div>
              </div>
            )}
            <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">รวม {filteredAttendees.length} รายชื่อ</span>
          </div>

          <div className="grid grid-cols-[10px_30px_1fr_65px] gap-3 px-4 py-2 bg-black/40 border-b border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-wider shrink-0">
            <span></span><span className="text-center">คิว</span><span>ชื่อ - สังกัดหน่วยงาน / เวลาคาดการณ์ (ETA)</span><span className="text-center">จัดการ</span>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 overflow-x-hidden custom-scrollbar">
            {filteredAttendees.map((att, idx) => {
              const isSelected = currentReadingAtt?.id === att.id;
              const selectedIndex = filteredAttendees.findIndex(item => item.id === currentReadingAtt?.id);

              let statusBorder = "border-l-zinc-700";
              if (att.status === 'pending') statusBorder = "border-l-orange-500";
              else if (att.status === 'arrived' || att.status === 'seated') statusBorder = "border-l-emerald-500";

              return (
                <div
                  key={att.id}
                  onClick={() => handleSelectAttendee(att, idx)}
                  className={`grid grid-cols-[10px_35px_1fr_65px] gap-2 items-center p-2 rounded-xl transition-all duration-200 border-y border-r border-l-[4px] cursor-pointer ${statusBorder} ${isSelected
                    ? 'bg-[#2E8B57]/30 border-y-[#2E8B57]/70 border-r-[#2E8B57]/70 shadow-md scale-[1.01]'
                    : att.is_read
                      ? 'bg-black/20 border-y-transparent border-r-transparent opacity-30 saturate-0 hover:opacity-80'
                      : 'bg-[#14234c]/40 border-y-white/5 border-r-white/5 hover:bg-[#14234c]/60'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400 animate-pulse' : 'bg-transparent'}`} />
                  <div className="text-xs font-mono font-black text-cyan-400 text-center flex items-center justify-center">
                    <span>{idx + 1}</span>
                  </div>

                  <div className="min-w-0 text-left">
                    {isSelected && (
                      <div className="relative flex items-center justify-center shrink-0">
                        <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                        <div className="relative w-2 h-2 bg-red-600 rounded-full"></div>
                      </div>
                    )}
                    <div className={`text-xs font-black truncate tracking-wide transition-colors ${att.is_read ? 'text-zinc-500 line-through' : isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>{att.fullname}</div>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">
                      {att.position} {att.status === 'pending' && <span className="text-orange-500 font-bold">(รอเช็คอิน)</span>}
                    </div>

                    {selectedIndex !== -1 && idx > selectedIndex && (
                      <div className="mt-1">
                        <span className="text-[9px] font-mono font-bold text-amber-400/90 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/20">
                          ⏱️ เวลาถึงคิว: {calculateETA(idx, selectedIndex)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {isGroup1 ? (
                      <div className="flex gap-1 items-center">
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => handleQuickMove(att, 'top')} className="bg-black/40 hover:bg-zinc-800 rounded p-0.5 text-zinc-400 hover:text-white transition-colors"><ChevronsUp size={11} /></button>
                          <button onClick={() => handleQuickMove(att, 'bottom')} className="bg-black/40 hover:bg-zinc-800 rounded p-0.5 text-zinc-400 hover:text-white transition-colors"><ChevronsDown size={11} /></button>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <button onClick={() => handleGroup1Move(idx, 'up')} disabled={idx === 0} className="bg-black/40 hover:bg-zinc-800 disabled:opacity-10 rounded p-0.5 text-zinc-400 hover:text-white transition-colors"><ArrowUp size={11} /></button>
                          <button onClick={() => handleGroup1Move(idx, 'down')} disabled={idx === filteredAttendees.length - 1} className="bg-black/40 hover:bg-zinc-800 disabled:opacity-10 rounded p-0.5 text-zinc-400 hover:text-white transition-colors"><ArrowDown size={11} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5 justify-center">
                        <button onClick={() => handleQuickMove(att, 'top')} className="bg-black/40 hover:bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 hover:text-white text-[8px] font-bold border border-white/5 flex items-center gap-0.5"><ChevronsUp size={8} /> บนสุด</button>
                        <button onClick={() => handleQuickMove(att, 'bottom')} className="bg-black/40 hover:bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400 hover:text-white text-[8px] font-bold border border-white/5 flex items-center gap-0.5"><ChevronsDown size={8} /> ล่างสุด</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isHelpPanelOpen && (
        <div className="fixed top-24 right-6 z-[9999] w-[340px] bg-[#0c1633]/95 border-2 border-cyan-500/50 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><Camera size={14} /> ส่งภาพ/ข้อความด่วนหา SM</span>
            <button onClick={() => setIsHelpPanelOpen(false)} className="text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-cyan-400 font-black uppercase text-left block">1. เลือกหรือถ่ายภาพกระดาษโน้ตด่วน:</span>
            {mcUploadFile ? (
              <div className="relative border border-cyan-500/30 rounded-xl p-1 bg-black/40 flex justify-center items-center">
                <img src={URL.createObjectURL(mcUploadFile)} alt="Preview" className="max-h-36 w-auto rounded-lg object-contain" />
                <button onClick={() => setMcUploadFile(null)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-md transition-colors"><X size={12} /></button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/10 hover:border-cyan-400/50 bg-black/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-28 text-center group">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setMcUploadFile(e.target.files?.[0] || null)} />
                <Camera size={24} className="text-zinc-500 group-hover:text-cyan-400 transition-colors animate-pulse" />
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-bold">กดเพื่อเปิดกล้องมือถือ/แท็บเล็ต ถ่ายรูปทันที</span>
              </label>
            )}
          </div>
          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
            <span className="text-[10px] text-cyan-400 font-black uppercase text-left block">2. พิมพ์ข้อความคำอธิบายใต้ภาพ:</span>
            <textarea rows={2} value={assistantInputText} onChange={e => setAssistantInputText(e.target.value)} placeholder="พิมพ์คำอธิบายประกอบภาพฉุกเฉินชิ้นนี้..." className="w-full bg-black border border-white/10 px-3 py-2 text-xs rounded-xl outline-none focus:border-cyan-500 text-white font-bold" />
          </div>
          <button onClick={handleSendHelpRequest} disabled={isMcUploading || (!assistantInputText.trim() && !mcUploadFile)} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex justify-center items-center gap-1.5">
            {isMcUploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={12} />} ส่งข้อมูลเข้าศูนย์ SM
          </button>
        </div>
      )}

      {showImagePopup && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowImagePopup(null)}>
          <button onClick={() => setShowImagePopup(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-colors z-[10001]"><X size={28} /></button>
          <img src={showImagePopup} alt="Enlarged Profile" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showSosModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="bg-red-600 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> ส่งสัญญาณความช่วยเหลือ (SOS)</h3>
              <button onClick={() => setShowSosModal(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">ส่งข้อความด่วนไปยังหน้าจอ Monitor หลัก (สามารถสร้างและบันทึกข้อความเตรียมไว้ได้)</p>
              <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                {sosPresets.map(preset => (
                  <div key={preset} className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden group shadow-sm">
                    <button onClick={() => handleSendSOS(preset)} className="hover:bg-red-600 hover:text-white text-gray-300 px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5" title="กดเพื่อส่งข้อความนี้ทันที">
                      <Send className="w-3 h-3 opacity-50 group-hover:opacity-100" />{preset}
                    </button>
                    <button onClick={() => handleDeletePreset(preset)} className="px-2 py-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors border-l border-gray-700" title="ลบข้อความนี้"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="relative">
                <textarea rows={3} value={sosText} onChange={(e) => setSosText(e.target.value)} placeholder="พิมพ์ หรือ พูด ข้อความที่ต้องการ..." className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 pr-24 text-white outline-none focus:border-red-500 resize-none transition-colors" />
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button onClick={handleMicClick} title="พูดเพื่อพิมพ์ข้อความ" className={`p-2 rounded-lg transition-colors flex items-center justify-center ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                    <Mic className="w-4 h-4" />
                  </button>
                  <button onClick={handleSavePreset} title="บันทึกเป็นข้อความสำรอง" disabled={!sosText.trim()} className="p-2 bg-gray-800 text-gray-400 hover:text-amber-400 disabled:opacity-50 disabled:hover:text-gray-400 rounded-lg transition-colors flex items-center">
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button onClick={() => handleSendSOS(sosText)} disabled={!sosText.trim()} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <Send className="w-4 h-4 mr-2" /> ส่งออกไปยัง Live Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-black text-sm text-amber-400 flex items-center gap-1.5"><UserPlus size={16} /> บันทึกเพิ่มรายชื่อด่วนหน้างาน</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block">📷 ถ่ายภาพ/แนบรูป (บันทึกลง Global Profiles):</span>
                <label className="border border-dashed border-white/10 hover:border-amber-500/50 bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer h-20 text-center">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setQuickFile(e.target.files?.[0] || null)} />
                  {quickFile ? <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><Upload size={14} /> {quickFile.name.substring(0, 20)}</span> : <><Camera size={20} className="text-zinc-500" /><span className="text-[10px] text-zinc-500 font-bold">เปิดกล้องถ่ายสด หรือเลือกไฟล์รูป</span></>}
                </label>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block">ชื่อ-นามสกุล (พร้อมคำนำหน้า):</span>
                <input type="text" value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="เช่น สมชาย ใจดี" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold block">ตำแหน่ง:</span>
                  <input type="text" value={quickPosition} onChange={e => setQuickPosition(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-medium" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold block">สังกัดหน่วยงาน:</span>
                  <input type="text" value={quickOrg} onChange={e => setQuickOrg(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-medium" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 font-bold text-xs rounded-xl">ยกเลิก</button>
              <button onClick={handleSaveQuickVip} disabled={isSavingQuickVip} className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-black text-xs rounded-xl flex justify-center items-center gap-1">
                {isSavingQuickVip ? <Loader2 size={14} className="animate-spin text-black" /> : '💾 บันทึกและสแตนบายคิว'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full text-center py-2 border-t border-white/5 bg-black/10 mt-auto shrink-0">
        <span className="text-[10px] text-white/10 font-bold tracking-widest uppercase">POWERED BY NIIVAA SMARTEVENT</span>
      </div>

      {/* ปุ่มลอย Inbox และกล่องข้อความสีน้ำเงิน */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
        {isInboxOpen && (
          <div className="mb-4 w-80 bg-blue-900/95 backdrop-blur-xl border border-blue-400/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-4 py-3 border-b border-blue-400/30 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={16} className="text-blue-400" /> กล่องข้อความ SM</h3>
              <button onClick={() => setIsInboxOpen(false)} className="text-blue-300 hover:text-white p-1 bg-white/10 hover:bg-red-500 rounded-md transition-colors"><X size={16} /></button>
            </div>
            <div className="p-3 flex flex-col gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {incomingMessages.length > 0 ? incomingMessages.map((msg) => (
                <div key={msg.id} className={`border rounded-xl p-3 transition-colors ${msg.isShowingOnMarquee ? 'bg-blue-900/40 border-blue-400' : 'bg-black/40 border-white/5'}`}>

                  <div className="text-[10px] text-blue-300 font-bold mb-1 flex items-center gap-1">
                    <Clock size={10} /> เวลา {msg.time}
                  </div>
                  <p className="text-sm text-white font-medium mb-3">{msg.text}</p>

                  <div className="flex gap-2 border-t border-white/10 pt-2 mt-auto">
                    <button
                      onClick={() => toggleMarquee(msg.id)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex justify-center items-center gap-1 ${msg.isShowingOnMarquee ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                    >
                      {msg.isShowingOnMarquee ? '👀 ซ่อนจากแถบวิ่ง' : '📢 โชว์บนแถบวิ่ง'}
                    </button>

                    <button
                      onClick={() => resolveMessage(msg.id)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-colors"
                      title="จัดการเสร็จสิ้นแล้ว ลบทิ้งได้"
                    >
                      ✅ รับทราบ
                    </button>
                  </div>

                </div>
              )) : <div className="text-xs text-center text-blue-300/50 py-6 font-bold">ไม่มีข้อความใหม่</div>}
            </div>
          </div>
        )}
        <button onClick={() => setIsInboxOpen(!isInboxOpen)} className="relative bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all transform hover:scale-110 border-2 border-blue-400/50">
          <MessageSquare size={24} />
          {incomingMessages.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#020617] animate-bounce">{incomingMessages.length}</span>}
        </button>
      </div>

    </div>
  );
}

export default function McShowtimePrompter() {
  return (
    // 🌟 หุ้มด้วย RouteGuard และให้สิทธิ์เฉพาะ admin และ mc
          <Suspense fallback={<div className="min-h-screen bg-[#0c1633] flex items-center justify-center text-white font-mono animate-pulse">Loading MC Prompter...</div>}>
    <RouteGuard allowedRoles={['admin', 'mc']}>
        <McShowtimeContent />
        </RouteGuard>
      </Suspense>
    
  );
}