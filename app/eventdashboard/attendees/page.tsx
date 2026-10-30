"use client";
import AttendeesManualDrawer from '@/components/AttendeesManualDrawer';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';
import { AlertTriangle, Bell, BellOff, Camera, CheckCircle, Utensils, LayoutTemplate, CheckCircle2, Clock, Download, Edit, FileSpreadsheet, Filter, Gift, Image as ImageIcon, ImagePlus, Link, Loader2, Megaphone, MessageSquare, Mic, Mic2, MonitorPlay, PlusCircle, Printer, QrCode, Radio, RotateCcw, Save, ScrollText, Search, Send, Trash2, Upload, LayoutGrid, UserCheck, UserPlus, Users, X, Info, Armchair } from 'lucide-react';
import * as XLSX from 'xlsx';
import { checkAttendeeQuota } from '@/app/(event)/events/event-dashboard/actions/quota-checker';
interface Attendee {
  id: string;
  profile_id?: string;
  prefix: string;
  fullname: string;
  position: string;
  organization: string;
  guest_district?: string;
  guest_province?: string;
  contact_info?: string;
  attendee_type: string;
  created_at: string;
  bio_note?: string;
  role_in_event?: string;
  gift_number?: string;
  gift_style?: string;
  status?: string;
  special_act1?: string;
  special_act2?: string;
  priority_level?: number;
  is_present?: boolean;
  action_sequence?: number;
  seat_number?: string;
}

// 1. แยกเนื้อหาหลักออกมาเป็น Component ย่อย
function AttendeesReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';
  // 🌟 นำ State สำหรับเปิด/ปิดคู่มือ มาวางแทรกตรงนี้เลยครับ
  const [isManualOpen, setIsManualOpen] = useState(false);

  // 🌟 State สำหรับรูปภาพที่ถูกคลิกขยาย (ของเดิมของคุณ)
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  // 🌟 State สำหรับเก็บชื่อหัวข้อกิจกรรมที่ดึงมาจาก Database (หรือตั้งค่า Default ไว้)
  const [act1Label, setAct1Label] = useState('กิจกรรมพิเศษ 1');
  const [act2Label, setAct2Label] = useState('กิจกรรมพิเศษ 2');
  // 📢 State สำหรับข้อความแจ้งเตือน Marquee (SMS)
  const [smAlert, setSmAlert] = useState<string>('');

  // 🌟 State เก็บตัวเลือกคิวพิเศษที่พิมพ์เพิ่มเข้ามาใหม่
  const [customOptions, setCustomOptions] = useState<string[]>([]);

  // 🌟 (อย่าลืมเพิ่มตัวแปรนี้ไว้ดึงตอนโหลดข้อมูลอีเวนต์)
  // ตอนที่คุณ fetch ข้อมูล events ให้เพิ่มบรรทัดนี้เพื่อดึงตัวเลือกที่เคยเซฟไว้
  // setCustomOptions(eventData.meta_data?.custom_act_options || []);

  // ฟังก์ชันลบตัวเลือกคิวพิเศษที่ไม่ได้ใช้แล้ว
  const handleDeleteOption = async (optionToDelete: string) => {
    if (window.confirm(`ต้องการลบตัวเลือก "${optionToDelete}" ออกจากรายการใช่หรือไม่?`)) {
      const newOptions = customOptions.filter(opt => opt !== optionToDelete);
      setCustomOptions(newOptions);

      // ล้างฟอร์มถ้ากำลังเลือกตัวที่ถูกลบอยู่
      if (bulkActForm.actValue === optionToDelete) {
        setBulkActForm(prev => ({ ...prev, actValue: '' }));
      }
      const [isManualOpen, setIsManualOpen] = useState(false);
      // บันทึกการลบลง DB
      const { data } = await supabase.from('events').select('meta_data').eq('id', eventId).single();
      const currentMeta = data?.meta_data || {};
      await supabase.from('events').update({ meta_data: { ...currentMeta, custom_act_options: newOptions } }).eq('id', eventId);
    }
  };
  // 🌟 ฟังก์ชันคำนวณหมายเลขของที่ระลึกคิวต่อไป (01, 02, 03...)
  const getNextGiftNumber = () => {
    // ถ้ายังไม่มีแขกเลยในงาน ให้เริ่มที่ 01
    if (!attendees || attendees.length === 0) return '01';

    // ดึงเฉพาะตัวเลขจากช่อง gift_number ของทุกคนมาหาค่าสูงสุด
    const existingNumbers = attendees
      .map(a => parseInt(a.gift_number || '0', 10))
      .filter(n => !isNaN(n)); // คัดเฉพาะที่เป็นตัวเลขจริงๆ

    if (existingNumbers.length === 0) return '01';

    const maxNumber = Math.max(...existingNumbers);
    const nextNumber = maxNumber + 1;

    // แปลงเป็น String และเติม '0' ด้านหน้าถ้าเป็นเลขหลักเดียว (เช่น 1 -> 01)
    return String(nextNumber).padStart(2, '0');
  };

  // 🌟 State สำหรับขยายดูรูปโปรไฟล์คู่กับรูปของที่ระลึก
  const [zoomImageContent, setZoomImageContent] = useState<{
    profileUrl: string | null;
    giftUrl: string | null;
    name: string;
    giftNumber: string;
  } | null>(null);
  // 🌟 State สำหรับสลับโหมดการแสดงผลลำดับ (true = แสดงแบบ index+1 เรียงสวย, false = แสดงค่า priority_level จริง)
  const [isAutoIndexMode, setIsAutoIndexMode] = useState<boolean>(true);

  // ==========================================
  // 📢 ระบบรับ-ส่งข้อความ (Inbox & SOS) ผ่าน event_live_messages
  // ==========================================
  const [incomingMessages, setIncomingMessages] = useState<any[]>([]);
  const [isSmsBoxOpen, setIsSmsBoxOpen] = useState<boolean>(false);
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(0);
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [sosMessage, setSosMessage] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);
  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  // ==========================================
  // 🌟 [ใหม่] State สำหรับระบบแก้ไขตาราง (Inline Editing)
  // ==========================================
  const [modifiedRows, setModifiedRows] = useState<{ [id: string]: Partial<Attendee> }>({});
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // ควบคุมการแสดงผลคอลัมน์พิเศษ
  const [visibleColumns, setVisibleColumns] = useState({
    // กลุ่ม 1: การจัดการคิวและสถานะ
    gender: false,
    action_sequence: false,
    priority_level: false,
    status: false,
    is_present: false,
    // กลุ่ม 2: ที่นั่งและของที่ระลึก
    seat_number: false,
    gift_number: false,
    gift_style: false,
    // กลุ่ม 3: ประเภทผู้ร่วมงานและกลุ่มพิเศษ
    attendee_type: false,
    role_in_event: false,
    special_act1: false,
    special_act2: false
  });

  // ฟังก์ชันรับค่าเมื่อมีการพิมพ์แก้ไขในตาราง
  const handleInlineChange = (id: string, field: keyof Attendee, value: any) => {
    // อัปเดตลงใน modifiedRows (ตะกร้าเตรียมเซฟ)
    setModifiedRows(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  // ฟังก์ชันบันทึกข้อมูล (Batch Update)
  const handleSaveInline = async () => {
    const idsToUpdate = Object.keys(modifiedRows);
    if (idsToUpdate.length === 0) return;

    setIsSavingInline(true);
    try {
      const dataToUpsert = idsToUpdate.map(id => {
        const original = attendees.find(a => a.id === id);
        return { ...original, ...modifiedRows[id] };
      });

      const { error } = await supabase.from('event_attendees').upsert(dataToUpsert, { onConflict: 'id' });
      if (error) throw error;

      alert(`บันทึกการเปลี่ยนแปลง ${idsToUpdate.length} รายการสำเร็จ!`);
      setModifiedRows({}); // ล้างตะกร้า
      if (typeof fetchAttendees === 'function') fetchAttendees(); // รีเฟรชตารางหลัก
    } catch (error: any) {
      console.error("Save Error:", error);
      alert("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setIsSavingInline(false);
    }
  };



  // 📝 ตัวแปรสำหรับ Marquee
  // 📝 ตัวแปรสำหรับรวบรวมข้อความ (เพิ่มเวลาไว้ด้านหน้า)
  const activeMarqueeTexts = incomingMessages
    .filter(m => m.isShowingOnMarquee)
    .map(m => `[เวลา ${m.time}] ${m.text}`) // 🌟 ดึงเวลามาแทรก
    .join(' ✦ ');

  // 🌟 ข้อความ Default เมื่อไม่มี SMS
  const defaultMarqueeText = "NiiVaa SmartEvent : Registration ระบบลงทะเบียนผู้ร่วมงาน นำเข้ารายชื่อผู้ร่วมงาน ลงทะเบียนของที่ระลึก พิมพ์บัญชีของที่ระลึก ค้นหา แก้ไขข้อมูล เพิ่มภาพแนะนำ VIP จัดกลุ่มกิจกรรม จัดลำดับแขกสำคัญในพิธีการ และประสานงานศูนย์ควบคุมเวทีกลาง";

  useEffect(() => {
    if (!eventId || eventId === 'current') return;

    const channel = supabase.channel(`receive-sms-reg-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${eventId}`
      }, (payload) => {
        const newMsg = payload.new;

        const isFromSM = newMsg.sender_role === 'sm' || newMsg.sender_role === 'admin';
        const isForReg = !newMsg.target_screen || ['all', 'registration'].includes(newMsg.target_screen);

        if (isFromSM && isForReg) {
          const finalMessage = newMsg.message_text || "ไม่มีข้อความ";
          const timeStr = new Date(newMsg.created_at || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

          // 🌟 1. เด้งป้ายแดงกลางจอ
          setUrgentIntercomMsg(finalMessage);
          setShowUrgentBanner(true);

          // 🌟 2. เข้ากล่อง Inbox และวิ่งบน Marquee
          setIncomingMessages(prev => [{
            id: newMsg.id || Date.now().toString(),
            time: timeStr,
            text: finalMessage,
            isShowingOnMarquee: true
          }, ...prev]);

          setUnreadSmsCount(prev => prev + 1);
          setIsInboxOpen(true); // สั่งเปิดกล่องมุมขวาล่างทันที
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const toggleMarqueeMessage = (id: string) => {
    setIncomingMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, isShowingOnMarquee: !msg.isShowingOnMarquee } : msg
    ));
  };


  // 📢 State สำหรับ Marquee และ SOS Modal

  const [isMarqueeVisible, setIsMarqueeVisible] = useState<boolean>(true);


  // 🎤 ฟังก์ชันพิมพ์ด้วยเสียง (Speech-to-Text)
  const handleSpeechToText = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการสั่งงานด้วยเสียงครับ (แนะนำให้ใช้ Google Chrome)');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; // รองรับภาษาไทย
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSosMessage(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // 🚀 3. ฟังก์ชันส่งข้อความ SOS กลับไปหา SM
  const handleSendSos = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sosMessage.trim()) return alert("กรุณาระบุข้อความก่อนส่งครับ");

    try {
      const { error } = await supabase
        .from('event_live_messages')
        .insert([{
          event_id: eventId !== 'current' ? eventId : null,
          message_text: `[จุดลงทะเบียน]: ${sosMessage}`,
          sender_name: 'ฝ่ายลงทะเบียน',
          sender_role: 'registration',
          target_screen: 'sm' // ส่งเจาะจงกลับไปให้จอ SM
        }]);

      if (error) throw error;

      alert("📡 ส่งข้อความ SOS ไปยังเวทีสำเร็จ!");
      setShowSosModal(false);
      setSosMessage('');
    } catch (err: any) {
      console.error("SOS Error:", err);
      alert("❌ ส่งข้อความล้มเหลว: " + err.message);
    }
  };

  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false); // 👈 เพิ่มบรรทัดนี้
  const [loading, setLoading] = useState(true);

  // Data States
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 🌟 States สำหรับการจัดการรูปภาพใน Modal แก้ไข
  const [editProfileImage, setEditProfileImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // 🌟 [ใหม่] State สำหรับเก็บตัวเลือกกลุ่มพิเศษที่มีอยู่แล้วในระบบ
  const [uniqueSpecialAct1, setUniqueSpecialAct1] = useState<string[]>([]);
  const [uniqueSpecialAct2, setUniqueSpecialAct2] = useState<string[]>([]);

  // 🌟 ดักจับเมื่อ attendees มีการเปลี่ยนแปลง เพื่อดึงเฉพาะชื่อกลุ่มที่ไม่ซ้ำกัน
  useEffect(() => {
    if (attendees && attendees.length > 0) {
      // ดึงค่า special_act1 ที่มีอยู่ (ตัดค่าว่าง/null ออก และทำให้ไม่ซ้ำกัน)
      const acts1 = Array.from(new Set(attendees.map(a => a.special_act1).filter(Boolean))) as string[];
      setUniqueSpecialAct1(acts1);

      // ดึงค่า special_act2 ที่มีอยู่ (ตัดค่าว่าง/null ออก และทำให้ไม่ซ้ำกัน)
      const acts2 = Array.from(new Set(attendees.map(a => a.special_act2).filter(Boolean))) as string[];
      setUniqueSpecialAct2(acts2);
    }
  }, [attendees]);

  // 🎛️ Toggle States
  const [showGift, setShowGift] = useState(false);
  // 🌟 ตั้งค่าเริ่มต้นที่ 0 เพื่อให้แสดง "ทั้งหมด" ทันทีที่เปิดหน้า
  const [filterMode, setFilterMode] = useState<number>(0);

  const filterLabels = [
    { id: 'All', label: '📋 กรอง: ทั้งหมด (All)' },         // 0
    { id: 'VIP', label: '🌟 กรอง: เฉพาะ VIP' },             // 1
    { id: 'Staff', label: '🎧 กรอง: เฉพาะ Staff' },         // 2
    { id: 'General', label: '👥 กรอง: เฉพาะ General' },     // 3
    { id: 'Speaker', label: '🗣️ กรอง: เฉพาะ Speaker' },     // 4
    { id: 'Guest', label: '🤝 กรอง: เฉพาะ Guest' },         // 5
    { id: 'Act1', label: '🎭 กรอง: Special Act 1' },        // 6
    { id: 'Act2', label: '🎬 กรอง: Special Act 2' },        // 7
    { id: 'Present', label: '🎤 กรอง: ประกาศชื่อ (Present)' }, // 8

    // 🌟 2 หมวดหมู่ที่เพิ่มใหม่สำหรับกรองสถานะการมางาน
    { id: 'Pending', label: '⏳ กรอง: ยังไม่มา (Pending)' },  // 9
    { id: 'Arrived', label: '✅ กรอง: มาแล้ว (Arrived)' },    // 10
    { id: 'HasGift', label: '🎁 กรอง: ผู้ที่มีของที่ระลึก' }
  ];

  // 🎛️ Modal States (ระบบควบคุมการเปิด-ปิดหน้าต่าง Pop-up)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  // 🆕 State สำหรับการแก้ไขข้อมูลแบบสมบูรณ์
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [requestNiiVaaCode, setRequestNiiVaaCode] = useState(false);

  // 🆕 State สำหรับการเลือกหลายคน (Bulk Selection)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkActModal, setShowBulkActModal] = useState(false);
  // 🌟 อัปเดต Form State ให้รองรับ statusAction
  const [bulkActForm, setBulkActForm] = useState({
    targetField: '',
    actValue: '',
    customActValue: '',
    isPresentAction: '',
    statusAction: '' // 🆕 เพิ่มฟิลด์สำหรับจัดการ Status
  });

  // 🌟 State สำหรับเก็บค่า Default Act ของงานนี้ และ Checkbox
  const [defaultActValue, setDefaultActValue] = useState<string>('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  // (💡 คำแนะนำ: ตอนคุณ fetch ข้อมูล events อย่าลืมดึง default_act มาเก็บไว้ด้วย)
  // setDefaultActValue(eventData.meta_data?.default_act || '');

  const [sortBy, setSortBy] = useState('priority_asc'); // 🆕 State จัดการการเรียงลำดับ

  // 📝 Form States สำหรับเพิ่มรายชื่อใหม่ (ครบทุกฟิลด์เหมือน Modal 4)
  const [formData, setFormData] = useState({
    personType: 'layperson',
    prefix: '',
    customPrefix: '',
    firstName: '',
    lastName: '',
    gender: '',
    position: '',
    organization: '',
    phoneNumber: '',
    guestDistrict: '',
    guestProvince: 'สุรินทร์', // Default
    attendeeType: 'VIP',
    roleInEvent: '',
    priorityLevel: 50,
    seatNumber: '',
    actionSequence: '',
    isPresent: false,
    giftNumber: '',
    giftStyle: '',
    specialAct1: '',
    specialAct2: '',
    honorsInfo: '',
    giftImage: null as File | null, // สำหรับเก็บไฟล์รูปก่อนอัปโหลด
    profileImage: null as File | null,
    profileImagePreview: null as string | null,
    saveToGlobal: true // Checkbox สำหรับเลือกว่าจะสร้าง NiiVaa Code (์ NiiVaa Id) หรือไม่
  });

  // 💬 Form States สำหรับส่ง SMS ด่วน
  const [smsData, setSmsData] = useState({ message: '', imageUrl: '' });

  // Clock
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Data (ดึงข้อมูลเฉพาะงานนี้)
  const fetchAttendees = async () => {
    setLoading(true);
    try {
      // 🌟 สร้าง Query เริ่มต้น และทำการ Join ตารางเพื่อดึงรูปโปรไฟล์มาด้วย
      let query = supabase
        .from('event_attendees')
        .select(`
          *,
          global_profiles (
            profile_image_url
          )
        `)
        .order('created_at', { ascending: false });

      // 🌟 ถ้ามี eventId ใน URL ให้ทำการกรองข้อมูล
      if (eventId && eventId !== 'current') {
        query = query.eq('event_id', eventId);
      }

      const { data, error } = await query;

      if (error) console.error("Fetch Error:", error);
      else if (data) {
        setAttendees(data);
      }
    } catch (err) { console.error("System Error:", err); }
    setLoading(false);
  };
  // 📥 ฟังก์ชันสร้างและดาวน์โหลดไฟล์ Excel Template (แบบครอบคลุมทุกคอลัมน์)
  const handleDownloadTemplate = () => {
    // 1. กำหนดข้อมูลตัวอย่าง (รวมทุกฟิลด์ที่ระบบรองรับ)
    const templateData = [
      {
        prefix: 'นาย',
        first_name: 'สมมติ',
        last_name: 'ทดสอบระบบ',
        gender: 'ชาย',
        position: 'ผู้อำนวยการ',
        organization: 'โรงเรียนตัวอย่างวิทยา',
        phone_number: '0812345678',
        guest_district: 'เมือง',
        guest_province: 'สุรินทร์',
        attendee_type: 'VIP',
        role_in_event: 'ประธานเปิดงาน',
        priority_level: 1,
        seat_number: 'A-01',
        action_sequence: 1,
        is_present: 'Y', // ใส่ Y ถ้าต้องการให้ขึ้นหน้า Prompter
        gift_number: 'G-001',
        gift_style: 'โล่เกียรติยศ',
        special_act1: 'ขึ้นรับรางวัล',
        special_act2: '',
        bio_note: 'ข้อมูลประวัติสำหรับพิธีกรอ่านแนะนำตัวบนเวที...',
        gen_niivaa_code: 'Y' // ใส่ Y เพื่อบันทึกลง Master Directory
      }
    ];

    // 2. แปลงข้อมูลเป็น Worksheet
    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 3. ปรับความกว้างของคอลัมน์ให้สวยงามและอ่านง่าย
    worksheet['!cols'] = [
      { wch: 10 }, // prefix
      { wch: 20 }, // first_name
      { wch: 20 }, // last_name
      { wch: 10 }, // gender
      { wch: 25 }, // position
      { wch: 30 }, // organization
      { wch: 15 }, // phone_number
      { wch: 15 }, // guest_district
      { wch: 15 }, // guest_province
      { wch: 15 }, // attendee_type
      { wch: 20 }, // role_in_event
      { wch: 15 }, // priority_level
      { wch: 15 }, // seat_number
      { wch: 15 }, // action_sequence
      { wch: 15 }, // is_present
      { wch: 15 }, // gift_number
      { wch: 15 }, // gift_style
      { wch: 20 }, // special_act1
      { wch: 20 }, // special_act2
      { wch: 40 }, // bio_note
      { wch: 15 }  // gen_niivaa_code
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "attendee_template_full.xlsx");
  };

  // 💾 ฟังก์ชันนำเข้าข้อมูลจาก Excel (ปรับปรุงระบบตรวจจับชื่อซ้ำ และแก้ปัญหา Query ในลูป)
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let attendeesToInsert = [];
      let newlyCreatedCount = 0;
      let linkedExistingCount = 0;
      let errorNames = [];

      // 🌟 1. ดึงรายชื่อ (first_name) ทั้งหมดจาก Excel เพื่อไปค้นหาในฐานข้อมูลรวดเดียว (ลดการโหลดช้า)
      const excelFirstNames = jsonData
        .map((row: any) => row.first_name ? String(row.first_name).trim() : '')
        .filter(Boolean);
      // ==========================================
      // 🛑 [ด่าน Gatekeeper สำหรับ Bulk Insert]
      // เช็คจำนวนคนในไฟล์ Excel เทียบกับที่นั่งที่เหลือ
      // ==========================================
      const newAttendeesCount = excelFirstNames.length;

      if (newAttendeesCount > 0) {
        const quota = await checkAttendeeQuota(eventId);

        if (!quota.success) {
          alert(`❌ ตรวจสอบโควตาล้มเหลว: ${quota.error}`);
          setLoading(false);
          return; // เบรก!
        }

        // ถ้าระบบไม่ได้ให้โควตาไม่จำกัด (maxAttendees !== -1) และคนในไฟล์เกินที่นั่งที่เหลือ
        if (quota.maxAttendees !== -1 && newAttendeesCount > (quota.remaining ?? 0)) {
          alert(`❌ อัปโหลดไม่ได้ครับ!\n\nไฟล์ Excel มีรายชื่อทั้งหมด ${newAttendeesCount} คน\nแต่โควตาของงานนี้รับเพิ่มได้อีกเพียง ${quota.remaining} คนเท่านั้น\n\n(แพ็กเกจ ${quota.tier} รับผู้เข้าร่วมรวมได้สูงสุด ${quota.maxAttendees} คน)`);

          // setShowUpgradeModal(true); // <-- เด้งป๊อปอัปเชียร์อัปเกรด
          setLoading(false);
          e.target.value = ''; // เคลียร์ไฟล์ที่เลือกไว้
          return; // ⛔ เบรกการทำงานทันที! ไม่เซฟลงฐานข้อมูล
        }
      }
      // ==========================================

      let existingDbProfiles: any[] = [];
      if (excelFirstNames.length > 0) {
        const { data: dbData } = await supabase
          .from('global_profiles')
          .select('id, first_name, last_name, niivaa_code')
          .in('first_name', excelFirstNames);
        if (dbData) existingDbProfiles = dbData;
      }

      // 🌟 2. วนลูปรายชื่อที่อ่านมาจาก Excel เพื่อเตรียมข้อมูลเข้างาน
      for (const row of jsonData as any[]) {
        let profileId = null;
        const firstName = row.first_name ? String(row.first_name).trim() : '';
        const lastName = row.last_name ? String(row.last_name).trim() : '';

        if (!firstName) continue;

        // ค้นหาว่าชื่อ-สกุลนี้ มีในฐานข้อมูลกลางแล้วหรือไม่
        const existingProfile = existingDbProfiles.find(
          p => p.first_name === firstName && p.last_name === lastName
        );

        if (existingProfile) {
          // 🎯 กรณีพบชื่อซ้ำ: นำ id เดิมมาใช้ดึงเข้าร่วมงานทันที (ไม่สร้างรหัสใหม่)
          profileId = existingProfile.id;
          linkedExistingCount++;
        } else if (row.gen_niivaa_code && String(row.gen_niivaa_code).toUpperCase() === 'Y') {
          // 🎯 กรณีไม่พบชื่อ และต้องการให้ออก NiiVaa Code  (NiiVaa ID)ใหม่
          const { data: newProfile, error: profileError } = await supabase
            .from('global_profiles')
            .insert([{
              first_name: firstName,
              last_name: lastName,
              prefix: row.prefix || '',
              gender: row.gender || '', // 👈 เพิ่มบรรทัดนี้
              position: row.position || '',
              organization: row.organization || '',
              phone_number: row.phone_number?.toString() || '',
              district: row.guest_district || '',
              province: row.guest_province || '',
              honors_info: row.bio_note || '',
              person_type: 'layperson'
            }])
            .select('id')
            .single();

          if (profileError) {
            console.error("Error creating profile:", profileError);
            errorNames.push(`${firstName} ${lastName}`);
            continue; // ข้ามการเอาเข้างานถ้าสร้างโปรไฟล์พัง
          }
          if (newProfile) {
            profileId = newProfile.id;
            newlyCreatedCount++;
          }
        }

        const isPresentBool = row.is_present && String(row.is_present).toUpperCase() === 'Y';
        const priorityNum = row.priority_level ? parseInt(row.priority_level) : 50;
        const actionSeqNum = row.action_sequence ? parseInt(row.action_sequence) : null;

        attendeesToInsert.push({
          event_id: eventId !== 'current' ? eventId : null,
          profile_id: profileId,
          prefix: row.prefix || '',
          gender: row.gender || '', // 👈 เพิ่มบรรทัดนี้
          fullname: `${firstName} ${lastName}`.trim(),
          position: row.position || '',
          organization: row.organization || '',
          contact_info: row.phone_number?.toString() || '',
          guest_district: row.guest_district || '',
          guest_province: row.guest_province || 'สุรินทร์',
          attendee_type: row.attendee_type || 'General',
          role_in_event: row.role_in_event || '',
          priority_level: priorityNum,
          seat_number: row.seat_number || '',
          action_sequence: actionSeqNum,
          is_present: isPresentBool,
          gift_number: row.gift_number || '',
          gift_style: row.gift_style || '',
          special_act1: row.special_act1 || '',
          special_act2: row.special_act2 || '',
          bio_note: row.bio_note || '',
          status: 'pending'
        });
      }

      // 🌟 3. บันทึกข้อมูลเข้างาน
      if (attendeesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('event_attendees')
          .insert(attendeesToInsert);

        if (insertError) throw insertError;
      }

      let resultMessage = `✅ นำเข้าสำเร็จ ${attendeesToInsert.length} รายชื่อ!\n`;
      resultMessage += `✨ สร้าง NiiVaa ID ใหม่: ${newlyCreatedCount} รายการ\n`;
      resultMessage += `🔄 ดึงประวัติเดิมมาร่วมงาน: ${linkedExistingCount} รายการ`;

      if (errorNames.length > 0) {
        resultMessage += `\n\n⚠️ ขัดข้อง (สร้างโปรไฟล์ไม่สำเร็จ): ${errorNames.length} รายการ`;
      }

      alert(resultMessage);
      fetchAttendees();

    } catch (error: any) {
      alert("❌ เกิดข้อผิดพลาดในการนำเข้าไฟล์ Excel: " + error.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // 🆕 State สำหรับเก็บข้อมูล Event
  const [eventData, setEventData] = useState<any>(null);

  // 🆕 ฟังก์ชันดึงข้อมูล Event
  const fetchEventDetails = async () => {
    if (!eventId || eventId === 'current') return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('title, brand_name, location_hotel, location_province, event_date')
        .eq('id', eventId)
        .single();

      if (error) throw error;
      if (data) setEventData(data);
    } catch (err) {
      console.error("Fetch Event Error:", err);
    }
  };

  // เรียกใช้เมื่อโหลดหน้าเว็บ และเปิดระบบ Real-time Sync
  useEffect(() => {
    fetchAttendees();
    fetchEventDetails();

    // 🌟 ดักจับ Real-time: ถ้าหน้า VIP มีการสลับคิว ให้หน้านี้ดึงข้อมูลมาเรียงใหม่ทันที
    const channel = supabase.channel('attendees_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendees' },
        (payload) => {
          console.log("🔄 ข้อมูลรายชื่อมีการเปลี่ยนแปลง (ซิงค์ใหม่แบบ Real-time)");
          fetchAttendees(); // สั่งรีเฟรชข้อมูลอัตโนมัติ
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]); // 👈 ผูกกับ eventId เพื่อให้โหลดใหม่ถ้าเปลี่ยนงาน

  // 🔍 Search, Filter & Sort Logic (Updated: Support NiiVaa= Code NiiVaa Code)
  useEffect(() => {
    let result = [...attendees];

    // 1. กรองตามหมวดหมู่ (Filter Mode)
    const currentFilterId = filterLabels[filterMode]?.id;
    const getType = (val: any) => val ? String(val).trim().toUpperCase() : '';

    switch (currentFilterId) {
      case 'All':
        break; // ไม่ต้องกรอง แสดงทุกคน
      case 'VIP':
      case 'Staff':
      case 'General':
      case 'Speaker':
      case 'Guest':
        result = result.filter(a => getType(a.attendee_type) === currentFilterId.toUpperCase());
        break;
      case 'Act1':
        result = result.filter(a => a.special_act1 && a.special_act1.trim() !== '');
        break;
      case 'Act2':
        result = result.filter(a => a.special_act2 && a.special_act2.trim() !== '');
        break;
      case 'Present': // กรองคนที่ถูกตั้งว่า "ให้ประกาศชื่อ"
        result = result.filter(a => a.is_present === true || String(a.is_present).toUpperCase() === 'TRUE' || String(a.is_present).toUpperCase() === 'Y');
        break;

      // 🌟 เพิ่มการกรองสถานะ มา/ยังไม่มา (Status)
      case 'Pending':
        result = result.filter(a => (a.status || '').toLowerCase() === 'pending');
        break;
      case 'Arrived':
        result = result.filter(a => (a.status || '').toLowerCase() === 'arrived');
        break;

      // 🌟 นำโค้ดนี้ไปวางต่อจาก case 'Arrived':
      case 'HasGift':
        result = result.filter(a => a.gift_number !== null && a.gift_number !== undefined && String(a.gift_number).trim() !== '');
        break;
    }

    // 2. กรองตามคำค้นหา (Search: เพิ่มการค้นหาด้วย NiiVaa ID, ตำแหน่ง, และชื่อ-หน่วยงาน)
    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase().replace(/\s+/g, '');
      result = result.filter(a => {
        const niivaaCode = ((a as any).global_profiles?.niivaa_code || (a as any).niivaa_code || '').toLowerCase().replace(/\s+/g, '');
        // 🟢 แทรก a.gender เข้าไปใน combined
        const combined = `${a.prefix || ''}${a.fullname || ''}${(a as any).gender || ''}${a.position || ''}${a.organization || ''}${niivaaCode}`.toLowerCase().replace(/\s+/g, '');

        return combined.includes(keyword);
      });
    }

    // 3. จัดเรียงข้อมูล (Sorting)
    switch (sortBy) {
      case 'seq_asc':
        result.sort((a, b) => (a.action_sequence ?? 9999) - (b.action_sequence ?? 9999));
        break;
      case 'priority_asc':
        result.sort((a, b) => (a.priority_level ?? 9999) - (b.priority_level ?? 9999));
        break;
      case 'seat_asc':
        result.sort((a, b) => (a.seat_number || 'ZZ').localeCompare(b.seat_number || 'ZZ'));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'latest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredAttendees(result);

    if (result.length > 0 && !result.find(r => r.id === selectedAttendee?.id)) {
      setSelectedAttendee(result[0]);
    } else if (result.length === 0) {
      setSelectedAttendee(null);
    }
  }, [searchTerm, attendees, filterMode, sortBy]);

  const handleCycleFilter = () => setFilterMode(prev => (prev + 1) % filterLabels.length);

  // 💾 ฟังก์ชันบันทึกรายชื่อใหม่ (เช็คชื่อซ้ำ + อัปโหลดรูป + จัดการ NiiVaa Code)
  const handleSaveNewAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName) return alert("กรุณากรอกชื่อ");
    // ==========================================
    // 🛑 [ด่าน Gatekeeper] ตรวจสอบโควตาผู้เข้าร่วม 
    // เช็คเฉพาะกรณีเพิ่มคนใหม่ (ยังไม่มี formData.id)
    // ==========================================
    if (!(formData as any).id) {
      try {
        const quota = await checkAttendeeQuota(eventId); // เรียกฟังก์ชันจาก actions

        if (!quota.success) {
          return alert(`❌ ตรวจสอบโควตาล้มเหลว: ${quota.error}`);
        }

        if (!quota.allowed) {
          // ถ้าโควตาเต็ม เด้งเตือนและเปิด Modal เสนอขาย (ถ้าคุณเตรียม State ไว้)
          alert(`ที่นั่งเต็มแล้ว! (แพ็กเกจ ${quota.tier} รับผู้เข้าร่วมได้สูงสุด ${quota.maxAttendees} คน)\nกรุณาอัปเกรดแพ็กเกจเพื่อรองรับผู้เข้าร่วมเพิ่มครับ`);

          // setShowUpgradeModal(true); // <-- ถ้าคุณทำหน้าต่าง Modal อัปเกรดไว้ เอาคอมเมนต์ออกได้เลย

          return; // ⛔ เบรกการทำงานทันที! ไม่ให้โค้ดส่วนอื่นทำงานต่อ
        }
      } catch (err) {
        console.error("Gatekeeper error:", err);
        return alert("เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ กรุณาลองใหม่ครับ");
      }
    }
    // ==========================================
    const finalPrefix = formData.prefix === 'other' ? formData.customPrefix : formData.prefix;
    const combinedFullName = `${formData.firstName} ${formData.lastName || ''}`.trim();

    try {
      // ==========================================
      // 🌟 0. เช็คชื่อซ้ำในงานนี้ก่อน (กันลงทะเบียนเบิ้ล)
      // ==========================================
      if (!(formData as any).id) { // เช็คเฉพาะกรณีเป็นรายชื่อใหม่ (ยังไม่มี ID)
        const { data: duplicateCheck, error: dupError } = await supabase
          .from('event_attendees')
          .select('id')
          .eq('event_id', eventId !== 'current' ? eventId : null)
          .eq('fullname', combinedFullName)
          .maybeSingle();

        if (duplicateCheck) {
          alert(`⚠️ มีชื่อ "${combinedFullName}" ลงทะเบียนในงานนี้เรียบร้อยแล้วครับ\n(ระบบได้ระงับการบันทึกเพื่อป้องกันข้อมูลซ้ำซ้อน)`);
          return; // หยุดการทำงานทันที
        }
      }

      let currentProfileId = (formData as any).profileId || null;
      let generatedCode = '';
      // ==========================================
      // 🌟 [เพิ่มใหม่] อัปโหลดรูปภาพโปรไฟล์ไปที่ Bucket 'vip-profiles'
      // ==========================================
      let uploadedProfileImageUrl = null;
      if (formData.profileImage) {
        try {
          let fileToUpload = formData.profileImage;
          if (typeof imageCompression === 'function') {
            fileToUpload = await imageCompression(formData.profileImage, { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true });
          }
          const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
          const fileName = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `profiles/${fileName}`;

          const { error: uploadError } = await supabase.storage.from('vip-profiles').upload(filePath, fileToUpload);
          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('vip-profiles').getPublicUrl(filePath);
          uploadedProfileImageUrl = publicUrlData.publicUrl;
        } catch (uploadErr) {
          console.error("Upload profile image failed:", uploadErr);
          alert("⚠️ ไม่สามารถอัปโหลดรูปโปรไฟล์ได้ แต่ระบบจะบันทึกข้อมูลส่วนอื่นตามปกติครับ");
        }
      }

      // ==========================================
      // 🌟 1. จัดการข้อมูล Master Directory (ปรับให้บันทึกรูปด้วย)
      // ==========================================
      if (formData.saveToGlobal && !currentProfileId) {
        const { data: existingProfile } = await supabase
          .from('global_profiles')
          .select('id, niivaa_code')
          .eq('first_name', formData.firstName)
          .eq('last_name', formData.lastName || '')
          .maybeSingle();

        if (existingProfile) {
          currentProfileId = existingProfile.id;
          generatedCode = existingProfile.niivaa_code;
          // 🟢 ถ้าเจอโปรไฟล์เก่า และถ่ายรูปใหม่หน้างาน ให้อัปเดตรูปใหม่เลย
          if (uploadedProfileImageUrl) {
            await supabase.from('global_profiles').update({ profile_image_url: uploadedProfileImageUrl }).eq('id', currentProfileId);
          }
        } else {
          // 🟢 สร้างโปรไฟล์ใหม่ พร้อมใส่รูปภาพ (ถ้ามี)
          const { data: profileData, error: profileError } = await supabase
            .from('global_profiles')
            .insert([{
              person_type: formData.personType || 'layperson',
              prefix: finalPrefix,
              first_name: formData.firstName,
              last_name: formData.lastName,
              gender: formData.gender,
              position: formData.position,
              organization: formData.organization,
              phone_number: formData.phoneNumber,
              honors_info: formData.honorsInfo,
              district: formData.guestDistrict,
              province: formData.guestProvince,
              profile_image_url: uploadedProfileImageUrl // 👈 แทรกฟิลด์นี้เข้าไป
            }])
            .select('id, niivaa_code')
            .single();

          if (profileError) throw profileError;
          currentProfileId = profileData.id;
          generatedCode = profileData.niivaa_code;
        }
      } else if (currentProfileId && uploadedProfileImageUrl) {
        // 🟢 กรณีดึงประวัติคนเก่ามา แต่หน้าโต๊ะถ่ายรูปอัปเดตให้ใหม่ ก็ให้บันทึกลงระบบกลางด้วย
        await supabase.from('global_profiles').update({ profile_image_url: uploadedProfileImageUrl }).eq('id', currentProfileId);
      }

      // ==========================================
      // 🌟 2. ระบบบีบอัดและอัปโหลดภาพของที่ระลึก (Modal 1)
      // ==========================================
      let uploadedGiftImageUrl = null;
      if (formData.giftImage) {
        try {
          let fileToUpload = formData.giftImage;

          // ตรวจสอบฟังก์ชันบีบอัดภาพ (เผื่อไลบรารียังโหลดไม่สมบูรณ์)
          if (typeof imageCompression === 'function') {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
            fileToUpload = await imageCompression(formData.giftImage, options);
          }

          const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
          const fileName = `gift_reg_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('attendee-gifts')
            .upload(fileName, fileToUpload);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('attendee-gifts')
            .getPublicUrl(fileName);

          uploadedGiftImageUrl = publicUrlData.publicUrl;
        } catch (uploadErr) {
          console.error("Upload gift image failed:", uploadErr);
          alert("⚠️ ไม่สามารถอัปโหลดรูปของที่ระลึกได้ แต่ระบบจะบันทึกข้อมูลส่วนอื่นตามปกติครับ");
        }
      }

      // ==========================================
      // 🌟 3. เตรียมก้อนข้อมูล Payload
      // ==========================================
      const payload: any = {
        profile_id: currentProfileId,
        prefix: finalPrefix,
        fullname: combinedFullName,
        gender: formData.gender, // 👈 เพิ่มบรรทัดนี้
        position: formData.position,
        organization: formData.organization,
        contact_info: formData.phoneNumber,
        bio_note: formData.honorsInfo,
        attendee_type: formData.attendeeType || 'General',
        role_in_event: formData.roleInEvent,
        priority_level: formData.priorityLevel || 50,
        seat_number: formData.seatNumber,
        action_sequence: formData.actionSequence ? parseInt(formData.actionSequence, 10) : null,
        is_present: formData.isPresent || false,
        guest_district: formData.guestDistrict,
        guest_province: formData.guestProvince,
        gift_number: formData.giftNumber,
        gift_style: formData.giftStyle,
        special_act1: formData.specialAct1 === '✏️_' ? '' : formData.specialAct1,
        special_act2: formData.specialAct2 === '✏️_' ? '' : formData.specialAct2,

        // ใช้ภาพที่เพิ่งอัปโหลด (ถ้ามี) หรือภาพเดิม หรือ null
        gift_image_url: uploadedGiftImageUrl || (formData as any).gift_image_url || null,
        status: 'arrived' // ลงทะเบียนหน้าโต๊ะ ถือว่ามาถึงแล้ว
      };

      // ==========================================
      // 🌟 4. บันทึกลงตารางงาน (Update หรือ Insert)
      // ==========================================
      if ((formData as any).id) {
        // Update ข้อมูลคนเก่าที่ค้นหาเจอ
        const { error: updateError } = await supabase
          .from('event_attendees')
          .update(payload)
          .eq('id', (formData as any).id);
        if (updateError) throw updateError;
      } else {
        // Insert ข้อมูลคนใหม่
        payload.event_id = eventId !== 'current' ? eventId : null;
        const { error: insertError } = await supabase
          .from('event_attendees')
          .insert([payload]);
        if (insertError) throw insertError;
      }
      // ==========================================
      // 🌟 เสริม: จัดการ "ค่าเริ่มต้น (Default Act)" และ Custom Options จากหน้าลงทะเบียน
      // ==========================================
      if ((formData as any).setAsDefaultAct || (formData as any).specialAct1 || (formData as any).specialAct2) {
        const { data } = await supabase.from('events').select('meta_data').eq('id', eventId).single();
        const currentMeta = data?.meta_data || {};
        let metaUpdated = false;

        if ((formData as any).setAsDefaultAct) {
          currentMeta.default_act = (formData as any).setAsDefaultAct;
          if (typeof setDefaultActValue === 'function') setDefaultActValue((formData as any).setAsDefaultAct);
          metaUpdated = true;
        }

        const allActs = [formData.specialAct1, formData.specialAct2];
        const defaultOpts = ["", "✏️_", "รับรางวัลผู้บริหารดีเด่น", "รับเกียรติบัตร", "ขึ้นมอบของที่ระลึก"];
        let newCustomOptions = [...(customOptions || [])];

        allActs.forEach(act => {
          if (act && !defaultOpts.includes(act) && !newCustomOptions.includes(act)) {
            newCustomOptions.push(act);
            metaUpdated = true;
          }
        });

        if (metaUpdated) {
          currentMeta.custom_act_options = newCustomOptions;
          if (typeof setCustomOptions === 'function') setCustomOptions(newCustomOptions);
          await supabase.from('events').update({ meta_data: currentMeta }).eq('id', eventId);
        }
      }
      // ==========================================
      // 🌟 5. แจ้งเตือนความสำเร็จ & รีเซ็ตฟอร์ม
      // ==========================================
      if (generatedCode) {
        alert(`✅ บันทึกและเช็คอินสำเร็จ!\n(ผู้ร่วมงานได้รหัส NiiVaa: ${generatedCode})`);
      } else {
        alert(`✅ บันทึกรายชื่อเข้าสู่งานสำเร็จ!`);
      }

      setShowAddModal(false);
      fetchAttendees(); // รีเฟรชตาราง

      // เคลียร์ค่าทั้งหมดให้กลับเป็นฟอร์มว่างเปล่า (พร้อมรับคนต่อไป)
      setFormData({
        personType: 'layperson', prefix: '', customPrefix: '', firstName: '', lastName: '', gender: '',
        position: '', organization: '', phoneNumber: '', guestDistrict: '', guestProvince: 'สุรินทร์',
        attendeeType: 'VIP', roleInEvent: '', priorityLevel: 50, seatNumber: '', actionSequence: '',
        isPresent: false, giftNumber: '', giftStyle: '', specialAct1: '', specialAct2: '', honorsInfo: '',
        saveToGlobal: true, id: null, profileId: null, giftImage: null, gift_image_url: null
      } as any);

    } catch (err: any) {
      console.error("Save Error:", err);
      alert("❌ บันทึกผิดพลาด: " + (err.message || "เกิดปัญหาในการเชื่อมต่อฐานข้อมูล"));
    }
  };

  // 🚀 ฟังก์ชันส่ง SMS ฉุกเฉิน
  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsData.message) return alert("กรุณาพิมพ์ข้อความก่อนส่งครับ");

    try {
      const payload = `${smsData.message} ${smsData.imageUrl ? '| IMG: ' + smsData.imageUrl : ''}`;
      const { error } = await supabase
        .from('screen_state')
        .update({ sm_urgent_alert: payload })
        .eq('id', 'current');

      if (error) throw error;

      alert("📡 ส่งข้อความด่วนไปยังหน้าจอหลักสำเร็จแล้ว!");
      setShowSmsModal(false);
      setSmsData({ message: '', imageUrl: '' });
    } catch (err: any) {
      alert("❌ ส่งข้อความล้มเหลว: " + err.message);
    }
  };
  // ✏️ ฟังก์ชันเปิดหน้าต่างแก้ไข (โหลดข้อมูลเดิมใส่ฟอร์ม)
  // ✏️ ฟังก์ชันเปิดหน้าต่างแก้ไข (ดึงรูปตรงจาก global_profiles เมื่อกดเปิด Modal)
  const handleOpenEditType = async () => {
    if (!selectedAttendee) return;

    // 1. โหลดข้อมูลลง Form ปกติ
    setEditForm({
      prefix: selectedAttendee.prefix || '',
      gender: (selectedAttendee as any).gender || '', // 👈 เพิ่มบรรทัดนี้
      fullname: selectedAttendee.fullname || '',
      position: selectedAttendee.position || '',
      organization: selectedAttendee.organization || '',
      bio_note: selectedAttendee.bio_note || '',
      attendee_type: selectedAttendee.attendee_type || 'VIP',
      role_in_event: selectedAttendee.role_in_event || '',
      gift_number: selectedAttendee.gift_number || '',
      gift_style: selectedAttendee.gift_style || '',
      gift_image_url: (selectedAttendee as any).gift_image_url || null,
      priority_level: selectedAttendee.priority_level || 50,
      guest_district: selectedAttendee.guest_district || '',
      guest_province: selectedAttendee.guest_province || 'สุรินทร์',
      special_act1: selectedAttendee.special_act1 || '',
      special_act2: selectedAttendee.special_act2 || '',
      is_present: selectedAttendee.is_present || false,
      contact_info: selectedAttendee.contact_info || '',
      action_sequence: selectedAttendee.action_sequence || '',
      seat_number: selectedAttendee.seat_number || ''
    });

    setEditProfileImage(null);
    setEditImagePreview(null);
    setRequestNiiVaaCode(false);
    setShowEditTypeModal(true);

    // 2. 🌟 ดึงรูปภาพจาก global_profiles โดยใช้ profile_id ของคนที่เลือก
    try {
      let rawImageUrl = (selectedAttendee as any).profile_image_url || null;

      if (!rawImageUrl && selectedAttendee.profile_id) {
        const { data: prof, error } = await supabase
          .from('global_profiles')
          .select('profile_image_url')
          .eq('id', selectedAttendee.profile_id)
          .maybeSingle();

        if (!error && prof?.profile_image_url) {
          rawImageUrl = prof.profile_image_url;
        }
      }

      // 3. จัดการแปลง Path หรือ Full URL
      if (rawImageUrl && typeof rawImageUrl === 'string' && rawImageUrl.trim()) {
        const cleanUrl = rawImageUrl.trim();
        if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
          setEditImagePreview(cleanUrl);
        } else {
          const path = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
          const { data } = supabase.storage.from('vip-profiles').getPublicUrl(path);
          setEditImagePreview(data?.publicUrl || null);
        }
      }
    } catch (e) {
      console.warn("Could not fetch profile image for modal:", e);
    }
  };

  // 💾 ฟังก์ชันบันทึกการแก้ไขทั้งหมด (รองรับการอัปโหลดรูปภาพใหม่ลง Storage)
  const handleSaveEditType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendee) return;

    if (typeof setIsUploadingImage === 'function') {
      setIsUploadingImage(true);
    }

    try {
      let currentProfileId = selectedAttendee.profile_id;
      let uploadedProfileImageUrl: string | null = null;
      let uploadedGiftImageUrl: string | null = null;

      // ==========================================
      // 🌟 1. อัปโหลดรูปภาพโปรไฟล์ (ถ้ามีการเปลี่ยน)
      // ==========================================
      if (editProfileImage) {
        let fileToUpload = editProfileImage;

        // ถ้ามี imageCompression ให้บีบอัดไฟล์ก่อนอัปโหลด
        try {
          if (typeof imageCompression === 'function') {
            const options = {
              maxSizeMB: 0.5,
              maxWidthOrHeight: 800,
              useWebWorker: true,
            };
            fileToUpload = await imageCompression(editProfileImage, options);
          }
        } catch (compErr) {
          console.warn("Image compression skipped:", compErr);
        }

        const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
        const fileName = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        // ส่งไฟล์ขึ้น Bucket 'vip-profiles'
        const { error: uploadError } = await supabase.storage
          .from('vip-profiles')
          .upload(filePath, fileToUpload);

        if (uploadError) throw uploadError;

        // ขอ Public URL
        const { data: publicUrlData } = supabase.storage
          .from('vip-profiles')
          .getPublicUrl(filePath);

        uploadedProfileImageUrl = publicUrlData.publicUrl;
      }

      // ==========================================
      // 🌟 2. อัปโหลดรูปของที่ระลึก (ถ้ามีการเปลี่ยน)
      // ==========================================
      if (editForm.giftImage) {
        let fileToUpload = editForm.giftImage;

        // ถ้ามี imageCompression ให้บีบอัดไฟล์ก่อนอัปโหลด
        try {
          if (typeof imageCompression === 'function') {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
            fileToUpload = await imageCompression(editForm.giftImage, options);
          }
        } catch (compErr) {
          console.warn("Gift image compression skipped:", compErr);
        }

        const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
        const fileName = `gift_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: giftUploadError } = await supabase.storage
          .from('attendee-gifts')
          .upload(fileName, fileToUpload);

        if (giftUploadError) throw giftUploadError;

        const { data: giftUrlData } = supabase.storage
          .from('attendee-gifts')
          .getPublicUrl(fileName);

        uploadedGiftImageUrl = giftUrlData.publicUrl;
      }

      // ==========================================
      // 🌟 3. จัดการ NiiVaa Code=NiiVaa ID และ โปรไฟล์กลาง
      // ==========================================
      if (!currentProfileId && requestNiiVaaCode) {
        const nameParts = (editForm.fullname || '').trim().split(' ');
        const fName = nameParts[0];
        const lName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        const { data: newProfile, error: profileError } = await supabase
          .from('global_profiles')
          .insert([{
            first_name: fName,
            last_name: lName,
            prefix: editForm.prefix,
            gender: editForm.gender, // 👈 เพิ่มบรรทัดนี้
            position: editForm.position,
            organization: editForm.organization,
            phone_number: editForm.contact_info,
            honors_info: editForm.bio_note,
            district: editForm.guest_district,
            province: editForm.guest_province,
            profile_image_url: uploadedProfileImageUrl || editImagePreview
          }])
          .select('id, niivaa_code')
          .single();

        if (profileError) throw profileError;
        currentProfileId = newProfile.id;
        alert(`🎉 สร้าง NiiVaa Code=NiiVaa ID สำเร็จ: ${newProfile.niivaa_code}`);
      } else if (currentProfileId && uploadedProfileImageUrl) {
        // กรณีมี profile_id อยู่แล้ว ให้อัปเดตรูปใหม่เข้า global_profiles โดยตรง
        await supabase
          .from('global_profiles')
          .update({ profile_image_url: uploadedProfileImageUrl })
          .eq('id', currentProfileId);
      }

      // ==========================================
      // 🌟 4. จัดการ "ค่าเริ่มต้น (Default Act)" และ Custom Options
      // ==========================================
      if (editForm.setAsDefaultAct || editForm.special_act1 || editForm.special_act2) {
        const { data } = await supabase.from('events').select('meta_data').eq('id', eventId).single();
        const currentMeta = data?.meta_data || {};
        let metaUpdated = false;

        // ตั้งค่า Default Act
        if (editForm.setAsDefaultAct) {
          currentMeta.default_act = editForm.setAsDefaultAct;
          if (typeof setDefaultActValue === 'function') setDefaultActValue(editForm.setAsDefaultAct);
          metaUpdated = true;
        }

        // เก็บศัพท์ใหม่ลง Dropdown
        const allActs = [editForm.special_act1, editForm.special_act2];
        const defaultOpts = ["", "✏️_", "รับรางวัลผู้บริหารดีเด่น", "รับเกียรติบัตร", "ขึ้นมอบของที่ระลึก"];
        let newCustomOptions = [...(customOptions || [])];

        allActs.forEach(act => {
          if (act && !defaultOpts.includes(act) && !newCustomOptions.includes(act)) {
            newCustomOptions.push(act);
            metaUpdated = true;
          }
        });

        if (metaUpdated) {
          currentMeta.custom_act_options = newCustomOptions;
          if (typeof setCustomOptions === 'function') setCustomOptions(newCustomOptions);
          await supabase.from('events').update({ meta_data: currentMeta }).eq('id', eventId);
        }
      }

      // ==========================================
      // 🌟 5. อัปเดตข้อมูลผู้ร่วมงานใน event_attendees
      // ==========================================
      const updatePayload: any = {
        profile_id: currentProfileId,
        prefix: editForm.prefix,
        gender: editForm.gender === '' ? null : editForm.gender, // 👈 แปลงสตริงว่างเป็น null
        fullname: editForm.fullname,
        position: editForm.position,
        organization: editForm.organization,
        contact_info: editForm.contact_info,
        guest_district: editForm.guest_district,
        guest_province: editForm.guest_province,

        attendee_type: editForm.attendee_type,
        role_in_event: editForm.role_in_event,

        // ✅ ดักค่าว่าง ป้องกัน Error (ถ้าเป็นค่าว่างให้ส่ง null, ถ้ามีค่าให้แปลงเป็นตัวเลข)
        priority_level: (editForm.priority_level === '' || editForm.priority_level === null) ? null : parseInt(editForm.priority_level, 10),
        action_sequence: (editForm.action_sequence === '' || editForm.action_sequence === null) ? null : parseInt(editForm.action_sequence, 10),

        seat_number: editForm.seat_number,
        is_present: editForm.is_present,

        gift_number: editForm.gift_number,
        gift_style: editForm.gift_style,

        special_act1: editForm.special_act1 === '✏️_' ? '' : editForm.special_act1,
        special_act2: editForm.special_act2 === '✏️_' ? '' : editForm.special_act2,

        bio_note: editForm.bio_note,
      };

      // 🌟 จัดการสถานะภาพของที่ระลึก (รองรับการเพิ่ม, แก้ไข, และลบ)
      if (uploadedGiftImageUrl) {
        // กรณี: มีการเลือกไฟล์ภาพใหม่และอัปโหลดสำเร็จ
        updatePayload.gift_image_url = uploadedGiftImageUrl;
      } else {
        // กรณี: ไม่ได้อัปโหลดใหม่ ให้ยึดตามค่าใน State 
        // (ถ้าสตาฟกดปุ่มลบ ค่า editForm.gift_image_url จะกลายเป็น null และถูกบันทึกลง DB เพื่อเคลียร์ภาพ)
        updatePayload.gift_image_url = editForm.gift_image_url;
      }

      const { error: updateError } = await supabase
        .from('event_attendees')
        .update(updatePayload)
        .eq('id', selectedAttendee.id);

      if (updateError) throw updateError;

      // ==========================================
      // ✅ 6. บันทึกสำเร็จ
      // ==========================================
      alert("✅ บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว!");

      // ดึงข้อมูลใหม่มาแสดง
      if (typeof fetchAttendees === 'function') fetchAttendees();

      // ปิด Modal
      if (typeof setShowEditTypeModal === 'function') setShowEditTypeModal(false);

    } catch (err: any) {
      console.error("Save Edit Error:", err);
      alert(`❌ เกิดข้อผิดพลาด: ${err.message || "ไม่สามารถบันทึกข้อมูลได้"}`);
    } finally {
      if (typeof setIsUploadingImage === 'function') {
        setIsUploadingImage(false);
      }
    }
  };

  // 🗑️ ฟังก์ชันลบแขกออกจากงาน (Delete)
  const handleRemoveAttendee = async () => {
    if (!selectedAttendee) return;

    // แจ้งเตือนยืนยันก่อนลบ (สำคัญมาก)
    const isConfirmed = window.confirm(`⚠️ ยืนยันการลบ "${selectedAttendee.fullname}" ออกจากงานนี้?\n\n(หมายเหตุ: ข้อมูลจะถูกลบออกจากงานนี้เท่านั้น ประวัติหลักในระบบ Global Profile จะยังคงอยู่)`);

    if (isConfirmed) {
      try {
        const { error } = await supabase
          .from('event_attendees')
          .delete()
          .eq('id', selectedAttendee.id);

        if (error) throw error;

        alert("✅ ลบรายชื่อออกจากงานสำเร็จ!");
        setSelectedAttendee(null); // เคลียร์กล่อง Detail
        fetchAttendees(); // รีเฟรชตารางใหม่
      } catch (err: any) {
        alert("❌ เกิดข้อผิดพลาดในการลบ: " + err.message);
      }
    }
  };

  // 🔲 ฟังก์ชันเลือกทั้งหมด
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredAttendees.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  // 🔲 ฟังก์ชันเลือกทีละคน
  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  // 💾 ฟังก์ชันบันทึก Special Act แบบกลุ่ม
  const handleSaveBulkAct = async (e: React.FormEvent) => {
    e.preventDefault();

    let updatePayload: any = {};

    // 1. จัดการ Status (มา/ยังไม่มา)
    if (bulkActForm.statusAction === 'arrived') updatePayload.status = 'arrived';
    else if (bulkActForm.statusAction === 'pending') updatePayload.status = 'pending';

    // 2. จัดการ is_present (ประกาศ/ไม่ประกาศ)
    if (bulkActForm.isPresentAction === 'Y') updatePayload.is_present = true;
    else if (bulkActForm.isPresentAction === 'N') updatePayload.is_present = false;

    // 3. จัดการ คิวพิเศษ (Special Act)
    if (bulkActForm.targetField) {
      const finalActValue = bulkActForm.actValue === 'other' ? bulkActForm.customActValue.trim() : bulkActForm.actValue;
      updatePayload[bulkActForm.targetField] = finalActValue === '' ? null : finalActValue;

      // 🌟 ระบบเรียนรู้คำใหม่ (เพิ่มลงตัวเลือก)
      if (bulkActForm.actValue === 'other' && finalActValue !== '') {
        const defaultOpts = ["รับรางวัลผู้บริหารดีเด่น", "รับเกียรติบัตร", "ขึ้นมอบของที่ระลึก", "ถ่ายภาพหมู่บนเวที"];
        if (!defaultOpts.includes(finalActValue) && !customOptions.includes(finalActValue)) {
          const newOptions = [...customOptions, finalActValue];
          setCustomOptions(newOptions);

          const { data } = await supabase.from('events').select('meta_data').eq('id', eventId).single();
          const currentMeta = data?.meta_data || {};
          await supabase.from('events').update({ meta_data: { ...currentMeta, custom_act_options: newOptions } }).eq('id', eventId);
        }
      }

      // 🌟 ระบบเซฟค่านี้เป็น "ค่าเริ่มต้น (Default)" ประจำงาน
      if (setAsDefault && finalActValue !== '') {
        const { data } = await supabase.from('events').select('meta_data').eq('id', eventId).single();
        const currentMeta = data?.meta_data || {};
        await supabase.from('events').update({ meta_data: { ...currentMeta, default_act: finalActValue } }).eq('id', eventId);
        setDefaultActValue(finalActValue); // อัปเดต State หน้าเว็บ
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      alert("กรุณาเลือกข้อมูลที่ต้องการอัปเดตอย่างน้อย 1 รายการ");
      return;
    }

    const { error } = await supabase.from('event_attendees').update(updatePayload).in('id', selectedIds);

    if (!error) {
      alert("✅ อัปเดตข้อมูลสำเร็จ!");
      setShowBulkActModal(false);
      setBulkActForm({ targetField: '', actValue: '', customActValue: '', isPresentAction: '', statusAction: '' });
      setSetAsDefault(false);
      fetchAttendees();
    } else {
      console.error("Bulk Update Error:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };
  // --- 🔍 State สำหรับดึงรายชื่อจาก Global Profiles ---
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // 1. ฟังก์ชันค้นหาประวัติจาก Global Profiles
  const handleSearchGlobalProfiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchTerm.trim()) return;

    setIsSearchingGlobal(true);
    try {
      // ค้นหาจากชื่อ นามสกุล หรือ หน่วยงาน
      const { data, error } = await supabase
        .from('global_profiles')
        .select('*')
        .or(`first_name.ilike.%${globalSearchTerm}%,last_name.ilike.%${globalSearchTerm}%,organization.ilike.%${globalSearchTerm}%`)
        .limit(20);

      if (error) throw error;
      setGlobalSearchResults(data || []);
    } catch (err) {
      console.error("Search Global Profile Error:", err);
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  // 2. ฟังก์ชันนำเข้ารายชื่อเข้าสู่งาน (ตั้งสถานะเป็น pending)
  const handleImportGlobalProfile = async (profile: any) => {
    // เช็คก่อนว่าเคยดึงคนนี้เข้ามาในงานนี้หรือยัง
    const isAlreadyAdded = attendees.some(a => a.profile_id === profile.id);
    if (isAlreadyAdded) {
      alert("❌ รายชื่อนี้ถูกเพิ่มเข้ามาในงานนี้แล้วครับ");
      return;
    }

    try {
      const newAttendee = {
        event_id: eventId !== 'current' ? eventId : null,
        profile_id: profile.id,
        prefix: profile.prefix || '',
        fullname: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        position: profile.position || '',
        organization: profile.organization || '',
        contact_info: profile.phone_number || '',
        guest_district: profile.district || '',
        guest_province: profile.province || '',
        attendee_type: 'General',
        status: 'pending' // 🌟 บังคับสถานะเป็น รอเช็คอิน
      };

      const { error } = await supabase
        .from('event_attendees')
        .insert([newAttendee]);

      if (error) throw error;

      alert("✅ ดึงรายชื่อสำเร็จ! (สถานะ: รอยืนยัน)");
      fetchAttendees(); // รีเฟรชตาราง
    } catch (err) {
      console.error("Import Error:", err);
      alert("❌ เกิดข้อผิดพลาดในการดึงรายชื่อ");
    }
  };

  // ⏪ ฟังก์ชันเปลี่ยนสถานะกลับเป็น Pending (ยกเลิกเช็คอิน)
  const handleRevertStatus = async (id: string) => {
    if (!confirm("ต้องการยกเลิกการเช็คอิน และเปลี่ยนสถานะกลับเป็น 'รอยืนยัน' ใช่หรือไม่?")) return;

    try {
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'pending' })
        .eq('id', id);

      if (error) throw error;
      fetchAttendees(); // รีเฟรชตาราง
    } catch (err) {
      console.error("Revert Status Error:", err);
      alert("❌ เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };
  // 🕒 State สำหรับนาฬิกา
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // ฟังก์ชันอัปเดตเวลาทุก 1 วินาที
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('th-TH', { hour12: false }));
    }, 1000);

    // ให้แสดงเวลาทันทีที่โหลดหน้าจอเสร็จ (ไม่ต้องรอ 1 วินาทีแรก)
    setCurrentTime(new Date().toLocaleTimeString('th-TH', { hour12: false }));

    return () => clearInterval(timer); // เคลียร์เวลาเมื่อเปลี่ยนหน้า
  }, []);
  // 🌟 State สำหรับระบบค้นหาแบบ 2 สเต็ป (Local -> Global)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState({ loading: false, message: '', type: '' });
  const [showGlobalSearchPrompt, setShowGlobalSearchPrompt] = useState(false); // ควบคุมปุ่มถามเพื่อค้นหา Global

  // 🔍 1. ค้นหาในงานนี้ก่อน (event_attendees)
  const handleSearchLocal = async () => {
    const queryTerm = searchQuery.trim();
    if (!queryTerm) return;

    setSearchStatus({ loading: true, message: 'กำลังค้นหาในรายชื่อของงานนี้...', type: 'info' });
    setShowGlobalSearchPrompt(false);

    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(queryTerm);
      let orQuery = `fullname.ilike.%${queryTerm}%,contact_info.ilike.%${queryTerm}%`;
      if (isUUID) orQuery += `,profile_id.eq.${queryTerm}`;

      // 🌟 แก้ไขบรรทัดนี้: สั่งให้ Join ตารางดึงรูปภาพจาก global_profiles มาด้วย
      const { data, error } = await supabase
        .from('event_attendees')
        .select('*, global_profiles(profile_image_url)')
        .eq('event_id', eventId)
        .or(orQuery);

      if (error) throw error;

      if (data && data.length > 0) {
        const person = data[0];
        const nameParts = (person.fullname || '').trim().split(' ');

        setFormData({
          ...formData,
          id: person.id,
          profileId: person.profile_id || null, // สำคัญ: เก็บ ID ไว้เผื่ออัปเดตรูป
          prefix: person.prefix || '',
          gender: person.gender || '',
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          position: person.position || '',
          organization: person.organization || '',
          phoneNumber: person.contact_info || '',
          guestDistrict: person.guest_district || '',
          guestProvince: person.guest_province || '',
          attendeeType: person.attendee_type || 'General',
          roleInEvent: person.role_in_event || '',
          priorityLevel: person.priority_level || 50,
          seatNumber: person.seat_number || '',
          actionSequence: person.action_sequence || '',
          isPresent: person.is_present || false,
          giftNumber: person.gift_number || getNextGiftNumber(),
          giftStyle: person.gift_style || '',
          specialAct1: person.special_act1 || '',
          specialAct2: person.special_act2 || '',
          honorsInfo: person.bio_note || '',
          // 🌟 ดึง URL รูปภาพมาโชว์ (ถ้าไม่มีในระบบกลาง ให้ลองดึงรูปของที่ระลึกแทน)
          profileImagePreview: person.global_profiles?.profile_image_url || person.gift_image_url || null
        } as any);
        setSearchStatus({ loading: false, message: '✅ พบรายชื่อที่เตรียมไว้ในงานนี้แล้ว (แก้ไขและเช็คอินได้เลย)', type: 'success' });
      } else {
        setSearchStatus({ loading: false, message: '⚠️ ไม่พบรายชื่อที่เตรียมไว้ในงานนี้', type: 'warning' });
        setShowGlobalSearchPrompt(true);
      }
    } catch (err) {
      console.error(err);
      setSearchStatus({ loading: false, message: '❌ เกิดข้อผิดพลาดในการค้นหา', type: 'error' });
    }
  };

  // 🔍 2. ค้นหาในฐานข้อมูลกลาง (global_profiles)
  const handleSearchGlobal = async () => {
    setSearchStatus({ loading: true, message: 'กำลังค้นหาในฐานข้อมูลส่วนกลาง (NiiVaa Directory)...', type: 'info' });
    setShowGlobalSearchPrompt(false);

    try {
      const { data, error } = await supabase
        .from('global_profiles')
        .select('*')
        .or(`niivaa_code.eq.${searchQuery},first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone_number.ilike.%${searchQuery}%`);

      if (data && data.length > 0) {
        const person = data[0];
        setFormData({
          ...formData,
          id: null,
          profileId: person.id,
          prefix: person.prefix || '',
          firstName: person.first_name || '',
          lastName: person.last_name || '',
          gender: person.gender || '',
          phoneNumber: person.phone_number || '',
          position: person.position || '',
          organization: person.organization || '',
          guestDistrict: person.district || '',
          guestProvince: person.province || '',
          // 🌟 ดึงข้อมูลจากคอลัมน์ profile_image_url
          profileImagePreview: person.profile_image_url || null
        } as any);
        setSearchStatus({ loading: false, message: '✅ พบประวัติในระบบ NiiVaa (ดึงข้อมูลพื้นฐานมาให้แล้ว)', type: 'success' });
      } else {
        setSearchStatus({ loading: false, message: '❌ ไม่พบข้อมูลในระบบเลย (กรุณากรอกข้อมูลสำหรับผู้ร่วมงานใหม่)', type: 'error' });
        if (isNaN(Number(searchQuery))) {
          setFormData({ ...formData, firstName: searchQuery, giftNumber: getNextGiftNumber() });
        }
      }
    } catch (err) {
      console.error(err);
      setSearchStatus({ loading: false, message: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูลกลาง', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1128] via-[#111a36] to-[#0a1128] text-white flex flex-col font-sans overflow-hidden relative">

      {/* 🌟 HEADER BAR */}
      {/* ฝั่งขวา: ปุ่มพิธีกร, นาฬิกา, โลโก้ */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 min-w-0">
        <h1 className="text-lg md:text-2xl font-black text-white flex items-center gap-2 tracking-tight truncate w-full">
          <Users size={22} className="text-cyan-400 shrink-0" />
          <span className="truncate">ตรวจสอบรายชื่อแขกผู้มีเกียรติ คณะทำงาน และผู้ร่วมงาน</span>
        </h1>
        <p className="text-[10px] md:text-xs text-zinc-400 mt-0.5 font-medium truncate w-full">ฝ่ายบันทึกข้อมูล: ทวนสอบความถูกต้องและแก้ไขข้อมูลบุคคล</p>
      </div>

      {/* ฝั่งขวา: เครื่องมือ (ห้ามหดเด็ดขาด) */}
      <div className="flex items-center gap-4 justify-end shrink-0 flex-none">
        {/* 🆕 ปุ่มลัดไปหน้า MC Prompter (สีน้ำเงิน) - ใช้ <a> tag ป้องกันปัญหาไม่ Active */}
        <a
          href={`/eventdashboard/showtime/mc-script?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/50 w-max cursor-pointer"
        >
          <Mic size={18} className="shrink-0" />
          <span className="whitespace-nowrap">พิธีกรแนะนำVIP</span>
        </a>

        <a
          href={`/events/event-dashboard/${eventId}`} // ⚠️ แก้ไข Path ให้ตรงกับ URL หน้า Hub ของคุณ
          className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
        >
          <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
        </a>

        {/* 🆕 ปุ่มลัดไปหน้า MC Prompter (สีน้ำเงิน) - ใช้ <a> tag ป้องกันปัญหาไม่ Active */}
        <a
          href={`/eventdashboard/showtime/mc_prompter?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/50 w-max cursor-pointer"
        >
          <Mic2 size={18} className="shrink-0" />
          <span className="whitespace-nowrap">พิธีกรหน้างาน</span>
        </a>

        <div className="text-right hidden md:block shrink-0">
          <div className="text-xl font-mono font-black text-cyan-400 leading-none">
            {mounted ? time.toLocaleTimeString('th-TH') : '--:--:--'}
          </div>
          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
        </div>

        <div className="h-10 w-px bg-white/10 hidden md:block shrink-0"></div>

        <div className="flex flex-col items-center md:items-end justify-center text-right shrink-0">
          <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 object-contain" />
          <span className="text-[8px] text-cyan-400 font-black tracking-widest mt-1 uppercase">ระบบบริหารการจัดงานดิจิทัลอัจฉริยะ</span>
        </div>

      </div>

      {/* 🆕 2. แถบแสดงข้อมูล Event อย่างย่อ (Event Info Banner) */}
      {eventData && (
        <div className="mx-4 mt-4 bg-zinc-900/60 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs shrink-0 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">ชื่องาน:</span>
            <span className="font-black text-white">{eventData.title || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">หน่วยงาน:</span>
            <span className="font-bold text-amber-400">{eventData.brand_name || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">สถานที่:</span>
            <span className="font-bold text-cyan-400">{eventData.location_hotel || ''} {eventData.location_province ? `จ.${eventData.location_province}` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-bold">วันที่:</span>
            <span className="font-bold text-pink-400">
              {eventData.event_date ? new Date(eventData.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
            </span>
          </div>
        </div>
      )}
      {/* ========================================= */}
      {/* 🌟 โซนควบคุม: Marquee และ ปุ่มเครื่องมือ */}
      {/* ========================================= */}
      <div className="mb-6 space-y-4">
        {/* 📢 แถบ Marquee */}
        <div className="flex w-full h-11 bg-black border border-gray-800 rounded-xl px-4 overflow-hidden items-center">
          {activeMarqueeTexts ? (
            /* 🔴 กรณีมีข้อความ SMS (สีส้ม) */
            <div className="w-full overflow-hidden whitespace-nowrap">
              <div className="inline-block animate-marquee text-amber-400 font-bold text-sm tracking-wide">
                {activeMarqueeTexts}
              </div>
            </div>
          ) : (
            /* 🟢 กรณีไม่มีข้อความ ให้วิ่งข้อความ Default (สีเขียว NiiVaa เรืองแสง) */
            <div className="w-full overflow-hidden whitespace-nowrap">
              <div className="inline-block animate-marquee text-emerald-400 font-bold text-sm tracking-widest drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                {defaultMarqueeText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🎛️ แถววางปุ่มเครื่องมือ (SOS, ทะเบียน, หน้า SM) */}
      <div className="flex flex-wrap items-center gap-3">

        <button
          onClick={() => setShowSosModal(true)}
          className="flex items-center gap-2 bg-red-950/40 hover:bg-red-700/60 border border-red-600/50 text-red-400 hover:text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)]"
        >
          <AlertTriangle className="w-5 h-5 animate-pulse" /> ส่งข้อความด่วน (SOS)
        </button>

        <a
          href={`/eventdashboard/attendees/gift-report?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-pink-950/40 hover:bg-pink-700/60 border border-pink-600/50 text-pink-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
        >
          <Printer className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">ทะเบียนของที่ระลึก</span>
        </a>

        <a
          href={`/officialeventdashboard?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-indigo-950/40 hover:bg-indigo-700/60 border border-indigo-600/50 text-indigo-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
        >
          <MonitorPlay className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">ควบคุมหน้าจอ SM</span>
        </a>
        {/* 💺 ปุ่ม: จัดผังที่นั่ง (สีม่วง/Violet) */}
        <a
          href={`/eventdashboard/venue/planner?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-violet-950/40 hover:bg-violet-700/60 border border-violet-600/50 text-violet-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
        >
          <Armchair className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">จัดผังที่นั่ง</span>
        </a>
        {/* 🍽️ ปุ่ม: จัดการห้องจัดเลี้ยง (สีส้ม/Amber) */}
        <a
          href={`/eventdashboard/venue/meal-planner?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-amber-950/40 hover:bg-amber-700/60 border border-amber-600/50 text-amber-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
        >
          <Utensils className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">จัดการห้องจัดเลี้ยง</span>
        </a>

        {/* 🗺️ ปุ่ม: สถานะโต๊ะอาหาร (สีเขียวอมฟ้า/Teal) */}
        <a
          href={`/eventdashboard/venue/builder?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-teal-950/40 hover:bg-teal-700/60 border border-teal-600/50 text-teal-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
        >
          <LayoutTemplate className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">สถานะโต๊ะอาหาร</span>
        </a>
        <a
          href={`/eventdashboard/showtime/vip?event_id=${eventId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/50 w-max cursor-pointer"
        >
          <Mic size={18} className="shrink-0" />
          <span className="whitespace-nowrap">พิธีกรแนะนำVIP</span>
        </a>
        <button
          onClick={() => setIsManualOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-500/30 rounded-xl transition-all shadow-[0_0_10px_rgba(34,211,238,0.1)] shrink-0"
        >
          <Info size={18} />
          <span className="text-sm font-bold hidden md:inline">คู่มือการใช้งาน</span>
        </button>
      </div>

      {/* 🗂️ MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4">

        {/* ⬅️ คอลัมน์ซ้าย */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 shrink-0">

          {/* 🎛️ ปุ่ม Toggle */}
          <div className="flex gap-2">
            <button onClick={handleCycleFilter} className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/30 text-cyan-400 font-bold text-xs py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5">
              <Filter size={14} /> {filterLabels[filterMode].label}
            </button>
            <button onClick={() => setShowGift(!showGift)} className={`px-4 bg-zinc-900 border text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 ${showGift ? 'border-pink-500/50 text-pink-400' : 'border-white/10 text-zinc-400 hover:bg-zinc-800'}`}>
              <Gift size={14} /> {showGift ? 'ซ่อน Gift' : 'โชว์ Gift'}
            </button>
          </div>

          {/* Detail Box */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-[22rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-600/10 rounded-full blur-3xl"></div>
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2 shrink-0">
              🔍 ข้อมูลบุคคลเชิงลึก
            </h2>

            {selectedAttendee ? (
              <div className="flex flex-col gap-2 z-10 overflow-y-auto custom-scrollbar pr-2">

                {/* 🌟 แถวบน: NiiVaa ID (ซ้าย) + รูปโปรไฟล์ (ขวา) */}
                {/* 🌟 แถวบน: NiiVaa ID (ซ้าย) + รูปโปรไฟล์และของที่ระลึก (ขวา) */}
                <div className="flex justify-between items-start">
                  <div className="text-sm mt-1">
                    <span className="text-zinc-400 mr-2">NiiVaa ID:</span>
                    <span className="font-mono text-[#00E676] font-bold bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/20">
                      {selectedAttendee.profile_id ? 'เชื่อมต่อแล้ว' : 'Walk-in'}
                    </span>
                  </div>

                  {/* 🌟 กลุ่มรูปภาพ: โปรไฟล์ + ของที่ระลึก (คลิกเพื่อขยายคู่) */}
                  <div
                    className="flex items-center -space-x-3 cursor-pointer hover:scale-105 transition-transform ml-2"
                    onClick={() => {
                      // ดึงเฉพาะชื่อแรก (ตัดนามสกุลออก)
                      const firstName = selectedAttendee.fullname ? selectedAttendee.fullname.split(' ')[0] : 'ไม่ระบุชื่อ';

                      // เรียกใช้ Modal ขยายภาพคู่ที่เราสร้างไว้
                      setZoomImageContent({
                        profileUrl: (selectedAttendee as any).profile_image_url || (selectedAttendee as any).global_profiles?.profile_image_url || null,
                        giftUrl: (selectedAttendee as any).gift_image_url || null,
                        name: firstName,
                        giftNumber: selectedAttendee.gift_number || ''
                      });
                    }}
                    title="คลิกเพื่อขยายดูรูปภาพ"
                  >
                    {/* 👤 วงกลมรูปโปรไฟล์ (อยู่ด้านหน้า) */}
                    <div className="w-12 h-12 rounded-full border-2 border-zinc-700 hover:border-cyan-400 bg-zinc-900 overflow-hidden relative z-10 shadow-md transition-colors">
                      {((selectedAttendee as any).profile_image_url || (selectedAttendee as any).global_profiles?.profile_image_url) ? (
                        <img
                          src={(selectedAttendee as any).profile_image_url || (selectedAttendee as any).global_profiles?.profile_image_url}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                          <Users size={20} />
                        </div>
                      )}
                    </div>

                    {/* 🎁 วงกลมรูปของที่ระลึก (ซ้อนอยู่ด้านหลัง) */}
                    {(selectedAttendee as any).gift_image_url && (
                      <div className="w-12 h-12 rounded-full border-2 border-pink-500/50 bg-pink-900/30 overflow-hidden relative z-0 shadow-md">
                        <img src={(selectedAttendee as any).gift_image_url} alt="Gift" className="w-full h-full object-cover opacity-90" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Gift size={16} className="text-white" />
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                <div className="text-2xl font-black mt-1">
                  <span className="text-zinc-300 text-lg mr-1">{selectedAttendee.prefix || ''}</span>
                  <span className="text-cyan-400">{selectedAttendee.fullname || 'ไม่ระบุชื่อ'}</span>
                </div>

                <div className="text-sm mt-3 flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">ตำแหน่ง:</span>
                  <span className="text-amber-400 font-bold">{selectedAttendee.position || '-'}</span>
                </div>

                <div className="text-sm flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">หน่วยงาน:</span>
                  <span className="text-purple-400 font-bold">{selectedAttendee.organization || '-'}</span>
                </div>

                {/* 🟢 [เพิ่มใหม่] ข้อมูลเลขที่นั่ง */}
                <div className="text-sm flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">เลขที่นั่ง:</span>
                  <span className="text-orange-400 font-bold">{selectedAttendee.seat_number || '-'}</span>
                </div>

                <div className="text-sm flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">บทบาท:</span>
                  <span className="text-blue-400 font-bold">{selectedAttendee.role_in_event || '-'}</span>
                </div>

                <div className="text-sm flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">ประวัติ:</span>
                  <span className="text-emerald-400 font-bold whitespace-pre-wrap">{selectedAttendee.bio_note || '-'}</span>
                </div>

                {showGift && (
                  <div className="mt-3 p-3 bg-pink-950/20 rounded-xl border border-pink-500/20 flex flex-col gap-1.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-2 border-b border-pink-500/10 pb-1.5 mb-1">
                      <Gift size={14} className="text-pink-400" />
                      <span className="text-xs font-black text-pink-400 uppercase tracking-widest">GIFT ASSIGNMENT</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400 text-xs">Number:</span>
                      <span className="text-yellow-400 font-mono font-black text-base bg-black/40 px-2 py-0.5 rounded">{selectedAttendee.gift_number || 'ไม่มีระบุ'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-400 text-xs">Style:</span>
                      <span className="text-pink-300 font-bold">{selectedAttendee.gift_style || '-'}</span>
                    </div>
                  </div>
                )}

                {/* 🆕 ปุ่ม Action: แก้ไข / ลบ (แสดงเมื่อมีการเลือกบุคคล) */}
                <div className="mt-4 pt-3 border-t border-white/10 flex gap-2 shrink-0">
                  <button
                    onClick={handleOpenEditType}
                    className="flex-1 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/30 text-blue-300 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Edit size={14} /> แก้ไขข้อมูล/บทบาท
                  </button>
                  <button
                    onClick={handleRemoveAttendee}
                    className="flex-1 bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 text-red-400 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} /> ลบออกจากงาน
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 font-bold text-sm">-- กรุณาเลือกรายชื่อจากตาราง --</div>
            )}
          </div>

          {/* แผงเครื่องมือและปุ่มนำทาง */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex-1 flex flex-col gap-3">
            {/* 🎛️ กลุ่มปุ่มเครื่องมือจัดการรายชื่อ (จัดเรียงใหม่แบบแนวตั้ง) */}
            <div className="flex flex-col gap-3 w-full mb-6">

              {/* แถวที่ 1: ลงทะเบียนใหม่ + สแกน QR */}
              <div className="flex gap-2">

                {/* 🌟 1. ปุ่มลงทะเบียนใหม่ (ผูก setShowAddModal) */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md"
                >
                  <PlusCircle size={18} />
                  <span className="text-sm">ลงทะเบียนรายชื่อใหม่</span>
                </button>

                {/* 🌟 2. ปุ่มสแกน QR (ผูก setShowQrModal) */}
                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-14 shrink-0 flex items-center justify-center bg-white hover:bg-gray-200 text-black rounded-xl transition-all shadow-md"
                  title="แสดง QR Code สำหรับลงทะเบียน"
                >
                  <QrCode size={20} />
                </button>

              </div>

              {/* แถวที่ 2: กลุ่มเครื่องมือ Excel (จัดให้อยู่ในกล่องเดียวกัน แบ่งครึ่งเท่าๆ กัน) */}
              <div className="flex items-center bg-zinc-900 border border-white/10 p-1.5 rounded-xl w-full shadow-inner">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex-1 flex items-center justify-center gap-2 bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                  title="ดาวน์โหลดไฟล์ต้นแบบสำหรับกรอกรายชื่อ"
                >
                  <Download size={14} /> โหลดเทมเพลต
                </button>

                <div className="w-px h-6 bg-white/10 mx-1 shrink-0"></div>

                <label className="flex-1 flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer">
                  <FileSpreadsheet size={14} /> นำเข้า Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleExcelUpload}
                    onClick={(e) => (e.currentTarget.value = '')}
                  />
                </label>

              </div>

              {/* แถวที่ 3: ค้นหาจากฐานข้อมูลกลาง (ปุ่มสีม่วง กางเต็มความกว้าง) */}
              <button
                onClick={() => setShowGlobalSearchModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded-xl transition-all shadow-md"
              >
                <Search size={18} /> ค้นหาจากฐานข้อมูลกลาง (Global)
              </button>

            </div>
            <button onClick={() => setShowSmsModal(true)} className="w-full bg-gradient-to-b from-amber-600 to-orange-700 hover:brightness-110 border border-amber-500/50 text-white font-black rounded-xl flex items-center justify-center gap-2 py-3 transition-all shadow-lg text-xs shadow-amber-900/30">
              <Send size={16} /> ส่ง SMS / แนบภาพขึ้นจอด่วน
            </button>
            <div className="h-px bg-white/10 my-1"></div>
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">จุดเชื่อมต่อระบบ (Ecosystem)</h3>
            <button onClick={() => router.push('/eventdashboard/showtime/script')} className="w-full bg-purple-900/30 hover:bg-purple-800/50 border border-purple-500/30 text-purple-300 font-bold rounded-xl flex items-center gap-3 px-4 py-3 transition-colors text-sm text-left">
              <ScrollText size={16} className="shrink-0" />
              <span>สคริปต์พิธีกร (Showtime Script)</span>
            </button>
            <button onClick={() => router.push('/eventdashboard/showtime/controller')} className="w-full bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 text-cyan-300 font-bold rounded-xl flex items-center gap-3 px-4 py-3 transition-colors text-sm text-left">
              <Radio size={16} className="shrink-0" />
              <span>คุมคิว Live SM (Smart Media)</span>
            </button>
          </div>
        </div>

        {/* ➡️ คอลัมน์ขวา: ตารางรายชื่อ */}
        <div className="w-full md:w-2/3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">

          {/* 🌟 Header ของตาราง (แบ่งเป็น 2 แถว) */}
          <div className="p-4 md:p-5 border-b border-white/10 bg-zinc-900/30 shrink-0 space-y-4">

            {/* 🔍 แถวที่ 1: กล่องค้นหา (กางเต็มพื้นที่ 100% เสมอ) */}
            <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 w-full focus-within:border-cyan-500 transition-colors shadow-inner">
              <Search className="text-zinc-500 mr-2 shrink-0" size={18} />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, หน่วยงาน, ตำแหน่ง หรือ รหัส NiiVaa Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-zinc-600"
              />
            </div>

            {/* 🎛️ แถวที่ 2: เครื่องมือจัดการ และ จำนวนคน */}
            <div className="flex flex-wrap items-center justify-between gap-3">

              {/* กลุ่ม Dropdown ตัวกรอง และ การจัดการคอลัมน์ (อยู่ซ้าย) */}
              <div className="flex flex-wrap items-center gap-2 relative">
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(Number(e.target.value))}
                  className="bg-indigo-900/50 border border-indigo-500/50 text-indigo-300 font-bold text-sm rounded-xl px-4 py-2 outline-none focus:border-indigo-400 cursor-pointer hidden md:block"
                >
                  {filterLabels.map((label, index) => (
                    <option key={label.id} value={index}>{label.label}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-900 border border-white/10 text-zinc-300 text-sm rounded-xl px-4 py-2 outline-none focus:border-cyan-500 cursor-pointer hidden md:block"
                >
                  <option value="latest">⏱️ เรียงตาม: ลงทะเบียนล่าสุด</option>
                  <option value="oldest">⏱️ เรียงตาม: ลงทะเบียนก่อนหน้า</option>
                  <option value="seq_asc">📋 เรียงตาม: คิวขึ้นเวที (1,2,3...)</option>
                  <option value="priority_asc">⭐ เรียงตาม: ความสำคัญ (VIP ขึ้นก่อน)</option>
                  <option value="seat_asc">🪑 เรียงตาม: เลขที่นั่ง (A-Z)</option>
                </select>

                {/* 🌟 [ใหม่] ปุ่มจัดการคอลัมน์ */}
                <div className="relative">
                  <button
                    onClick={() => setShowColumnManager(!showColumnManager)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${showColumnManager ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                  >
                    ⚙️ จัดการคอลัมน์
                  </button>

                  {/* 🌟 [ใหม่] Dropdown เมนูเปิด/ปิดคอลัมน์ */}
                  {showColumnManager && (
                    <div className="absolute top-10 left-0 w-64 bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-2xl z-[100] flex flex-col gap-2 max-h-[70vh] overflow-y-auto custom-scrollbar">

                      <p className="text-xs font-bold text-cyan-400 border-b border-white/10 pb-2 mb-1 mt-2">ข้อมูลบุคคล</p>
                      {/* 🟢 เพิ่มตัวเลือก เปิด/ปิด คอลัมน์เพศ */}
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.gender} onChange={(e) => setVisibleColumns({ ...visibleColumns, gender: e.target.checked })} className="accent-cyan-500" /> เพศ (Gender)
                      </label>

                      <p className="text-xs font-bold text-cyan-400 border-b border-white/10 pb-2 mb-1 mt-2">กลุ่มการจัดการคิวและสถานะ</p>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.action_sequence} onChange={(e) => setVisibleColumns({ ...visibleColumns, action_sequence: e.target.checked })} className="accent-cyan-500" /> ลำดับคิวพิเศษ (Action Seq.)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.priority_level} onChange={(e) => setVisibleColumns({ ...visibleColumns, priority_level: e.target.checked })} className="accent-cyan-500" /> ระดับความสำคัญ (Priority)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.status} onChange={(e) => setVisibleColumns({ ...visibleColumns, status: e.target.checked })} className="accent-cyan-500" /> สถานะการมาถึง (Status)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.is_present} onChange={(e) => setVisibleColumns({ ...visibleColumns, is_present: e.target.checked })} className="accent-cyan-500" /> ประกาศแนะนำ (Is Present)
                      </label>

                      <p className="text-xs font-bold text-emerald-400 border-b border-white/10 pb-2 mt-2 mb-1">กลุ่มที่นั่งและของที่ระลึก</p>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.seat_number} onChange={(e) => setVisibleColumns({ ...visibleColumns, seat_number: e.target.checked })} className="accent-emerald-500" /> เลขที่นั่ง (Seat No.)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.gift_number} onChange={(e) => setVisibleColumns({ ...visibleColumns, gift_number: e.target.checked })} className="accent-emerald-500" /> หมายเลขของขวัญ (Gift No.)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.gift_style} onChange={(e) => setVisibleColumns({ ...visibleColumns, gift_style: e.target.checked })} className="accent-emerald-500" /> ลักษณะของขวัญ (Gift Style)
                      </label>

                      <p className="text-xs font-bold text-amber-400 border-b border-white/10 pb-2 mt-2 mb-1">กลุ่มประเภทผู้ร่วมงาน</p>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.attendee_type} onChange={(e) => setVisibleColumns({ ...visibleColumns, attendee_type: e.target.checked })} className="accent-amber-500" /> ประเภทผู้ร่วมงาน (Type)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.role_in_event} onChange={(e) => setVisibleColumns({ ...visibleColumns, role_in_event: e.target.checked })} className="accent-amber-500" /> บทบาทในงาน (Role)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.special_act1} onChange={(e) => setVisibleColumns({ ...visibleColumns, special_act1: e.target.checked })} className="accent-amber-500" /> กลุ่มพิเศษ 1 (Special Act1)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                        <input type="checkbox" checked={visibleColumns.special_act2} onChange={(e) => setVisibleColumns({ ...visibleColumns, special_act2: e.target.checked })} className="accent-amber-500" /> กลุ่มพิเศษ 2 (Special Act2)
                      </label>

                      <button onClick={() => setShowColumnManager(false)} className="mt-4 bg-slate-800 text-white text-xs py-2 rounded border border-slate-700 hover:bg-slate-700 font-bold sticky bottom-0">ปิดหน้าต่าง</button>
                    </div>
                  )}
                </div>

                {/* 🌟 [ใหม่] ปุ่มบันทึกการแก้ไข (แสดงเฉพาะตอนที่มีการพิมพ์แก้) */}
                {Object.keys(modifiedRows).length > 0 && (
                  <div className="flex items-center gap-1 animate-in fade-in zoom-in ml-2">
                    <button onClick={() => setModifiedRows({})} className="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 font-bold">ยกเลิก</button>
                    <button onClick={handleSaveInline} disabled={isSavingInline} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
                      {isSavingInline ? "กำลังบันทึก..." : `💾 บันทึก (${Object.keys(modifiedRows).length} รายการ)`}
                    </button>
                  </div>
                )}
              </div>

              {/* ป้ายแสดงจำนวนคน (อยู่ขวา หรือ เต็มบรรทัดบนมือถือ) */}
              <div className="flex items-center justify-center gap-2 bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-xl shrink-0 w-full sm:w-auto">
                <Users size={16} className="text-cyan-400" />
                <span className="text-xs font-bold text-zinc-300">จำนวนในกลุ่มนี้:</span>
                <span className="text-lg font-black text-cyan-400 leading-none">{filteredAttendees.length}</span>
                <span className="text-xs font-bold text-zinc-500">ท่าน</span>
              </div>

            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-cyan-500 bg-zinc-950/50 z-20"><Loader2 className="animate-spin mr-2" size={24} /> กำลังโหลดข้อมูล...</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm min-w-max">
                <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10 shadow-md text-xs font-black text-zinc-400 uppercase tracking-wider">
                  <tr>
                    {/* 🌟 1. คอลัมน์ว่าง (Dummy) ไว้ดัน Header ให้ตรงกับแถบสีของ Body */}
                    <th className="w-4 border-b border-white/10 bg-zinc-900/95"></th>

                    {/* 2. Checkbox */}
                    <th className="p-4 w-12 text-center border-b border-white/10">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedIds.length === filteredAttendees.length && filteredAttendees.length > 0}
                        className="w-4 h-4 accent-[#00E676]"
                      />
                    </th>

                    {/* 2. ลำดับ */}
                    <th className="p-4 w-28 text-center border-b border-white/15 bg-zinc-900/95">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <span>ลำดับ</span>
                        {/* ปุ่ม Toggle โหมดเล็กๆ */}
                        <button
                          type="button"
                          onClick={() => setIsAutoIndexMode(!isAutoIndexMode)}
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono transition-colors border ${isAutoIndexMode
                            ? 'bg-blue-900/40 text-blue-300 border-blue-500/40 hover:bg-blue-800/50'
                            : 'bg-amber-900/40 text-amber-300 border-amber-500/40 hover:bg-amber-800/50'
                            }`}
                          title="คลิกเพื่อสลับโหมดการแสดงผลลำดับ"
                        >
                          {isAutoIndexMode ? '📌 โหมด: เรียงติดกัน' : '✏️ โหมด: ลำดับอิสระ'}
                        </button>
                      </div>
                    </th>
                    {/* 🌟 [ใหม่] ส่วนหัวของคอลัมน์พิเศษ (แทรกตรงนี้) */}
                    {/* 🌟 ส่วนหัวของคอลัมน์พิเศษ */}
                    {visibleColumns.action_sequence && <th className="p-4 text-center border-b border-white/10 bg-cyan-950/20 text-cyan-400 whitespace-nowrap">คิวพิเศษ</th>}
                    {visibleColumns.priority_level && <th className="p-4 text-center border-b border-white/10 bg-cyan-950/20 text-cyan-400 whitespace-nowrap">Priority (VIP)</th>}
                    {visibleColumns.status && <th className="p-4 text-center border-b border-white/10 bg-cyan-950/20 text-cyan-400 whitespace-nowrap">สถานะ</th>}
                    {visibleColumns.is_present && <th className="p-4 text-center border-b border-white/10 bg-cyan-950/20 text-cyan-400 whitespace-nowrap">ประกาศชื่อ</th>}

                    {visibleColumns.seat_number && <th className="p-4 text-center border-b border-white/10 bg-emerald-950/20 text-emerald-400 whitespace-nowrap">เลขที่นั่ง</th>}
                    {visibleColumns.gift_number && <th className="p-4 text-center border-b border-white/10 bg-emerald-950/20 text-emerald-400 whitespace-nowrap">Gift No.</th>}
                    {visibleColumns.gift_style && <th className="p-4 text-center border-b border-white/10 bg-emerald-950/20 text-emerald-400 whitespace-nowrap">Gift Style</th>}

                    {visibleColumns.attendee_type && <th className="p-4 text-left border-b border-white/10 bg-amber-950/20 text-amber-400 whitespace-nowrap">ประเภทแขก</th>}
                    {visibleColumns.role_in_event && <th className="p-4 text-left border-b border-white/10 bg-amber-950/20 text-amber-400 whitespace-nowrap">บทบาทในงาน</th>}
                    {visibleColumns.special_act1 && <th className="p-4 text-left border-b border-white/10 bg-amber-950/20 text-amber-400 whitespace-nowrap">กลุ่มพิเศษ 1</th>}
                    {visibleColumns.special_act2 && <th className="p-4 text-left border-b border-white/10 bg-amber-950/20 text-amber-400 whitespace-nowrap">กลุ่มพิเศษ 2</th>}
                    {/* 3. คำนำหน้า */}
                    <th className="p-4 text-left whitespace-nowrap border-b border-white/10 w-24">คำนำหน้า</th>
                    {/* 🟢 เพิ่มหัวตารางเพศ โดยผูกกับ visibleColumns */}
                    {visibleColumns.gender && (
                      <th className="px-3 py-3 text-left text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                        เพศ
                      </th>
                    )}
                    {/* 4. ชื่อ - นามสกุล */}
                    <th className="p-4 text-left whitespace-nowrap border-b border-white/10 min-w-[200px]">ชื่อ - นามสกุล</th>

                    {/* 5. ตำแหน่ง */}
                    <th className="p-4 text-left whitespace-nowrap border-b border-white/10 min-w-[250px]">ตำแหน่ง</th>

                    {/* 6. หน่วยงาน */}
                    <th className="p-4 text-left whitespace-nowrap border-b border-white/10 min-w-[200px]">หน่วยงาน</th>

                    {/* 7. บทบาทในงาน */}
                    <th className="p-4 text-left whitespace-nowrap border-b border-white/10 min-w-[150px]">บทบาทในงาน</th>

                    {/* 8. เกียรติประวัติ */}
                    <th className="p-4 text-left border-b border-white/10 min-w-[200px]">เกียรติประวัติ (Bio Note)</th>

                    {/* 9. Gift No. */}
                    <th className="p-4 text-center whitespace-nowrap border-b border-white/10 w-24">Gift No.</th>

                    {/* 10. Gift Style */}
                    <th className="p-4 text-center whitespace-nowrap border-b border-white/10 w-32">Gift Style</th>

                    {/* 11. สถานะ */}
                    <th className="p-4 text-center whitespace-nowrap border-b border-white/10 w-28">สถานะ</th>

                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttendees.length > 0 ? (
                    filteredAttendees.map((att, index) => (
                      <tr
                        key={att.id}
                        onClick={() => setSelectedAttendee(att)}
                        className={`cursor-pointer transition-colors group border-b border-white/5
      ${selectedAttendee?.id === att.id
                            ? 'bg-cyan-900/30'
                            : att.status === 'pending'
                              ? 'bg-orange-500/5 hover:bg-orange-500/10'
                              : 'hover:bg-white/5'
                          }`}
                      >
                        {/* 🌟 นำขอบสี (border-l-4) มาใส่ที่ช่อง td แรกสุดครับ */}
                        <td className={`p-4 whitespace-nowrap border-l-4 ${selectedAttendee?.id === att.id
                          ? 'border-cyan-400'
                          : att.status === 'pending'
                            ? 'border-orange-500'
                            : 'border-emerald-500/50'
                          }`}>

                        </td>
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={selectedIds.includes(att.id)} onChange={() => handleSelectOne(att.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-[#00E676]" />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            // 🌟 ใช้ key แบบนี้บังคับให้ React รีเซ็ตค่าใหม่ทันทีเมื่อโหมดเปลี่ยน
                            key={`${isAutoIndexMode}-${att.id}-${att.priority_level}`}
                            // 🌟 เปลี่ยนจาก value เป็น defaultValue เพื่อให้พิมพ์แก้ไขหน้าจอได้อิสระ
                            defaultValue={isAutoIndexMode ? (index + 1) : (att.priority_level ?? '')}
                            onBlur={async (e) => {
                              const newPriority = parseInt(e.target.value, 10);

                              if (isNaN(newPriority)) return;

                              // 1. บันทึกลงฐานข้อมูล Supabase ทันทีเมื่อพิมพ์เสร็จและคลิกออก
                              const { error } = await supabase
                                .from('event_attendees')
                                .update({ priority_level: newPriority })
                                .eq('id', att.id);

                              if (error) {
                                console.error("Update priority error:", error);
                                alert("บันทึกเลขลำดับไม่สำเร็จ");
                              } else {
                                // 2. ดึงข้อมูลใหม่เพื่อให้แถวดีดสลับตำแหน่งตาม Priority ทันที
                                if (typeof fetchAttendees === 'function') {
                                  fetchAttendees();
                                }
                              }
                            }}
                            className={`w-16 rounded px-1 py-1 text-center text-xs font-mono outline-none transition-all ${isAutoIndexMode
                              ? 'bg-zinc-900/50 border border-white/10 text-zinc-400 cursor-pointer'
                              : 'bg-zinc-900 border border-amber-500/50 text-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                              }`}
                            title={isAutoIndexMode ? "คลิกเพื่อแก้ไขลำดับแบบอิสระ" : "ค่า Priority จริงสำหรับจัดลำดับ"}
                          />
                        </td>

                        {/* 🌟 [ใหม่] ช่องป้อนข้อมูลของคอลัมน์พิเศษ (แทรกตรงนี้) */}

                        {/* 🌟 ช่องป้อนข้อมูลของคอลัมน์พิเศษ */}
                        {visibleColumns.action_sequence && (
                          <td className="p-2 text-center bg-black/20"><input type="number" value={modifiedRows[att.id]?.action_sequence ?? att.action_sequence ?? ''} onChange={(e) => handleInlineChange(att.id, 'action_sequence', parseInt(e.target.value) || null)} className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 text-center" /></td>
                        )}
                        {visibleColumns.priority_level && (
                          <td className="p-2 text-center bg-black/20"><input type="number" value={modifiedRows[att.id]?.priority_level ?? att.priority_level ?? ''} onChange={(e) => handleInlineChange(att.id, 'priority_level', parseInt(e.target.value) || null)} className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500 text-center" /></td>
                        )}
                        {visibleColumns.status && (
                          <td className="p-2 text-center bg-black/20">
                            <select value={modifiedRows[att.id]?.status ?? att.status ?? 'pending'} onChange={(e) => handleInlineChange(att.id, 'status', e.target.value)} className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500">
                              <option value="pending">รอยืนยัน</option>
                              <option value="checked_in">เช็คอินแล้ว</option>
                            </select>
                          </td>
                        )}
                        {visibleColumns.is_present && (
                          <td className="p-2 text-center bg-black/20">
                            <label className="flex items-center justify-center cursor-pointer"><input type="checkbox" checked={modifiedRows[att.id]?.is_present ?? att.is_present ?? false} onChange={(e) => handleInlineChange(att.id, 'is_present', e.target.checked)} className="w-4 h-4 accent-emerald-500" /></label>
                          </td>
                        )}

                        {visibleColumns.seat_number && (
                          <td className="p-2 text-center bg-black/20"><input type="text" value={modifiedRows[att.id]?.seat_number ?? att.seat_number ?? ''} onChange={(e) => handleInlineChange(att.id, 'seat_number', e.target.value)} className="w-20 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 text-center font-bold" placeholder="เช่น A1" /></td>
                        )}
                        {visibleColumns.gift_number && (
                          <td className="p-2 text-center bg-black/20"><input type="text" value={modifiedRows[att.id]?.gift_number ?? att.gift_number ?? ''} onChange={(e) => handleInlineChange(att.id, 'gift_number', e.target.value)} className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 text-center font-mono" /></td>
                        )}
                        {visibleColumns.gift_style && (
                          <td className="p-2 text-center bg-black/20"><input type="text" value={modifiedRows[att.id]?.gift_style ?? att.gift_style ?? ''} onChange={(e) => handleInlineChange(att.id, 'gift_style', e.target.value)} className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 text-center" placeholder="เช่นแจกันขาว ดอกสีแดง ขาว" /></td>
                        )}

                        {visibleColumns.attendee_type && (
                          <td className="p-2 text-left bg-black/20">
                            <select value={modifiedRows[att.id]?.attendee_type ?? att.attendee_type ?? 'general'} onChange={(e) => handleInlineChange(att.id, 'attendee_type', e.target.value)} className="w-28 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500">
                              <option value="general">แขกรับเชิญ</option>
                              <option value="VIP">VIP</option>
                              <option value="staff">Staff/ทีมงาน</option>
                              <option value="media">สื่อมวลชน</option>
                            </select>
                          </td>
                        )}
                        {visibleColumns.role_in_event && (
                          <td className="p-2 text-left bg-black/20">
                            {/* 🌟 ใช้ <input list="..."> คู่กับ <datalist> ทำให้พิมพ์เองได้ หรือกดเลือกจากลิสต์ได้ */}
                            <input list="role-options" type="text" value={modifiedRows[att.id]?.role_in_event ?? att.role_in_event ?? ''} onChange={(e) => handleInlineChange(att.id, 'role_in_event', e.target.value)} className="w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500" placeholder="พิมพ์/เลือก" />
                            <datalist id="role-options">
                              <option value="คณะทำงาน" />
                              <option value="ประธานในพิธี" />
                              <option value="ประธานจัดงาน" />
                              <option value="วิทยากร" />
                              <option value="พิธีกร" />
                              <option value="ฝ่ายต้อนรับ" />
                              <option value="แขกรับเชิญ" />
                            </datalist>
                          </td>
                        )}
                        {visibleColumns.special_act1 && (
                          <td className="p-2 text-left bg-black/20">
                            <input
                              list="special-act1-options"
                              type="text"
                              value={modifiedRows[att.id]?.special_act1 ?? att.special_act1 ?? ''}
                              onChange={(e) => handleInlineChange(att.id, 'special_act1', e.target.value)}
                              className="w-28 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                              placeholder="ระบุ/เลือกกลุ่ม"
                            />
                            {/* 🌟 ดึงข้อมูลจาก State มาสร้าง Option อัตโนมัติ */}
                            <datalist id="special-act1-options">
                              {uniqueSpecialAct1.map((act, index) => (
                                <option key={index} value={act} />
                              ))}
                            </datalist>
                          </td>
                        )}
                        {visibleColumns.special_act2 && (
                          <td className="p-2 text-left bg-black/20">
                            <input
                              list="special-act2-options"
                              type="text"
                              value={modifiedRows[att.id]?.special_act2 ?? att.special_act2 ?? ''}
                              onChange={(e) => handleInlineChange(att.id, 'special_act2', e.target.value)}
                              className="w-28 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                              placeholder="ระบุ/เลือกข้อมูล"
                            />
                            {/* 🌟 ดึงข้อมูลจาก State มาสร้าง Option อัตโนมัติ */}
                            <datalist id="special-act2-options">
                              {uniqueSpecialAct2.map((act, index) => (
                                <option key={index} value={act} />
                              ))}
                            </datalist>
                          </td>
                        )}
                        <td className="p-4 text-zinc-400 whitespace-nowrap">{att.prefix || '-'}</td>
                        {/* 🟢 คอลัมน์เพศ (Inline Edit แบบพักข้อมูลรอ Save) */}
                        {visibleColumns.gender && (
                          <td className="px-2 py-2 whitespace-nowrap text-sm text-zinc-300">
                            <select
                              value={
                                (att as any).gender === 'ชาย' ? 'male' :
                                  (att as any).gender === 'หญิง' ? 'female' :
                                    ((att as any).gender || '')
                              }
                              onChange={(e) => {
                                const newGender = e.target.value;
                                const payloadGender = newGender === '' ? null : newGender;

                                // 🌟 1. เก็บค่าการเปลี่ยนแปลงลงใน modifiedRows (จุดนี้จะทำให้ปุ่มบันทึกเด้งขึ้นมา)
                                setModifiedRows(prev => ({
                                  ...prev,
                                  [att.id]: {
                                    ...(prev[att.id] || {}), // ดึงข้อมูลคอลัมน์อื่นที่อาจจะถูกแก้พร้อมกันมาด้วย
                                    gender: payloadGender
                                  }
                                }));

                                // 🌟 2. อัปเดตหน้าจอทันที เพื่อให้ Dropdown แสดงค่าที่เพิ่งเลือก
                                setAttendees(prev => prev.map(a =>
                                  a.id === att.id ? { ...a, gender: payloadGender } : a
                                ));

                                // ❌ เอาโค้ด supabase.update ออกไป เพราะเราจะไปเซฟพร้อมกันที่ปุ่ม "บันทึก"
                              }}
                              className="bg-zinc-950 border border-white/10 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer hover:border-white/30 transition-colors"
                            >
                              <option value="">- ไม่ระบุ -</option>
                              <option value="male">ชาย</option>
                              <option value="female">หญิง</option>
                            </select>
                          </td>
                        )}
                        <td className={`p-4 font-bold whitespace-nowrap ${selectedAttendee?.id === att.id ? 'text-cyan-400' : 'text-zinc-200 group-hover:text-white'}`}>
                          {att.fullname}
                          {/* 🆕 แสดงป้ายกำกับหากติ๊ก is_present ไว้ */}
                          {(att.is_present === true || String(att.is_present).toLowerCase() === 'true') && (
                            <span className="ml-2 text-[9px] bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider font-black">
                              🎤 ประกาศชื่อ
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-amber-200/70 whitespace-nowrap">{att.position || '-'}</td>
                        <td className="p-4 text-purple-300/70 whitespace-nowrap">{att.organization || '-'}</td>
                        <td className="p-4 text-blue-300/80 whitespace-nowrap">{att.role_in_event || '-'}</td>
                        <td className="p-4 text-emerald-200/70 text-xs">
                          <div className="line-clamp-2 max-w-sm" title={att.bio_note}>{att.bio_note || '-'}</div>
                        </td>
                        <td className="p-4 text-center text-yellow-400 font-mono font-bold whitespace-nowrap">{att.gift_number || '-'}</td>
                        <td className="p-4 text-center text-pink-300/70 whitespace-nowrap">{att.gift_style || '-'}</td>
                        {/* คอลัมน์สถานะในตาราง */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {att.status === 'pending' ? (
                              <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded-md text-xs font-bold">
                                ⏳ รอยืนยัน
                              </span>
                            ) : (
                              // กรณีเช็คอินแล้ว
                              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 size={12} /> มาถึงแล้ว
                              </span>
                            )}

                            {/* 🆕 ปุ่ม Undo ยกเลิกเช็คอิน (แสดงเฉพาะคนที่สถานะไม่ใช่ pending) */}
                            {att.status !== 'pending' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // กันไม่ให้ไปทริกเกอร์การเลือกแถว (Select Row)
                                  handleRevertStatus(att.id);
                                }}
                                title="ยกเลิกการเช็คอิน"
                                className="text-zinc-500 hover:text-red-400 p-1 rounded-md hover:bg-zinc-800 transition-colors"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={10} className="p-16 text-center text-zinc-500 font-bold bg-black/20">ไม่พบข้อมูลรายชื่อในกลุ่มนี้</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="w-full text-center py-2 bg-black/60 shrink-0 border-t border-white/5">
        <span className="text-[9px] text-white/20 font-bold tracking-[0.2em] uppercase">POWERED BY NIIVAA SMARTEVENT</span>
      </div>

      {/* ========================================================
          📦 MODAL 1: ฟอร์มเพิ่มรายชื่อใหม่แบบสมบูรณ์ (Smart Registration)
          ======================================================== */}
      {
        showAddModal && (
          <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-zinc-950 border border-[#00E676]/50 rounded-3xl p-6 w-full max-w-4xl shadow-[0_0_40px_rgba(0,230,118,0.15)] flex flex-col gap-5 max-h-[95vh]">

              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0">
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <PlusCircle className="text-[#00E676]" /> ลงทะเบียนเข้างาน (Registration)
                </h3>
                <button onClick={() => { setShowAddModal(false); setShowGlobalSearchPrompt(false); setSearchStatus({ loading: false, message: '', type: '' }); }} className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-full transition-colors"><X size={20} /></button>
              </div>

              {/* 🌟 0. ระบบค้นหารายชื่อ (Smart Search) */}
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 shrink-0 flex flex-col gap-3">
                <label className="text-xs font-bold text-cyan-400">🔍 ค้นหารายชื่อล่วงหน้า (ชื่อ, นามสกุล หรือ เบอร์โทร)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="พิมพ์ข้อความ แล้วกดปุ่มค้นหา..."
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);

                        // 🌟 ลอจิกเคลียร์ฟอร์มเมื่อกล่องค้นหาว่างเปล่า
                        if (val.trim() === '') {
                          setSearchStatus({ loading: false, message: '', type: '' });
                          setShowGlobalSearchPrompt(false);
                          // รีเซ็ตฟอร์มกลับเป็นค่าเริ่มต้น (ปรับค่าเริ่มต้นให้ตรงกับ State ของคุณ)
                          setFormData({
                            prefix: '', customPrefix: '', gender: '', firstName: '', lastName: '',
                            position: '', organization: '', phoneNumber: '', guestDistrict: '',
                            guestProvince: '', attendeeType: 'General', roleInEvent: '',
                            priorityLevel: 50, seatNumber: '', actionSequence: '', isPresent: true,
                            giftNumber: '', giftStyle: '', giftImage: null, specialAct1: '',
                            specialAct2: '', honorsInfo: '', saveToGlobal: false
                          } as any);
                        }
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocal())}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:border-cyan-500 outline-none"
                    />

                    {/* 🌟 ปุ่ม (X) สำหรับกดเคลียร์ข้อความและฟอร์มทันที */}
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchStatus({ loading: false, message: '', type: '' });
                          setShowGlobalSearchPrompt(false);
                          setFormData({
                            prefix: '', customPrefix: '', gender: '', firstName: '', lastName: '',
                            position: '', organization: '', phoneNumber: '', guestDistrict: '',
                            guestProvince: '', attendeeType: 'General', roleInEvent: '',
                            priorityLevel: 50, seatNumber: '', actionSequence: '', isPresent: true,
                            giftNumber: '', giftStyle: '', giftImage: null, specialAct1: '',
                            specialAct2: '', honorsInfo: '', saveToGlobal: false
                          } as any);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchLocal}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-cyan-900/30 shrink-0"
                  >
                    ค้นหาในรายชื่อ
                  </button>
                </div>

                {/* ข้อความแจ้งเตือนสถานะการค้นหา */}
                {searchStatus.message && (
                  <div className={`text-xs font-bold p-2.5 rounded-lg border flex items-center justify-between ${searchStatus.type === 'success' ? 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20' : searchStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : searchStatus.type === 'warning' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    <span>{searchStatus.message}</span>

                    {/* 🌟 ปุ่มถาม: ค้นหาในฐานข้อมูลกลางไหม? (โชว์เมื่อหาในงานไม่เจอ) */}
                    {showGlobalSearchPrompt && (
                      <button
                        type="button"
                        onClick={handleSearchGlobal}
                        className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-md"
                      >
                        <Search size={14} /> ค้นหาในระบบกลาง (NiiVaa Directory)
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSaveNewAttendee} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-2">

                {/* 🌟 Section: NiiVaa Code Selection */}
                <div className="bg-[#00E676]/10 border border-[#00E676]/20 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#00E676]">Master Directory (NiiVaa ID)</h4>
                    <p className="text-xs text-zinc-400 mt-1">การสร้างฐานข้อมูลส่วนกลางเพื่ออำนวยความสะดวกในงานครั้งต่อไป</p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-4 py-2 rounded-xl transition-colors">
                      <input type="checkbox" checked={formData.saveToGlobal} onChange={e => setFormData({ ...formData, saveToGlobal: e.target.checked })} className="w-4 h-4 accent-[#00E676]" />
                      <span className="text-xs font-bold text-zinc-300">สร้าง NiiVaa Code ให้บุคคลนี้</span>
                    </label>
                  </div>
                </div>

                {/* 🌟 Section: 1. ข้อมูลส่วนบุคคล (Personal Info) */}
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">1. ข้อมูลบุคคล (Personal Data)</h4>
                  {/* 🌟 [เพิ่มใหม่] กล่องอัปโหลดรูปภาพประจำตัว */}
                  <div className="bg-zinc-900/60 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-5 mb-4">
                    <div className="w-24 h-28 bg-black/50 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 relative">
                      {formData.profileImagePreview ? (
                        <img src={formData.profileImagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600 gap-1">
                          <ImageIcon size={28} />
                          <span className="text-[9px]">ไม่มีรูป</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 text-left w-full">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Camera size={14} className="text-cyan-400" /> ถ่ายภาพ/อัปโหลดรูปประจำตัว
                      </h4>
                      <p className="text-[11px] text-zinc-400">ภาพจะถูกบันทึกลงฐานข้อมูลส่วนกลาง (Storage: vip-profiles)</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                          <Camera size={14} className="text-cyan-400" /> เปิดกล้อง
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setFormData({ ...formData, profileImage: file, profileImagePreview: URL.createObjectURL(file) }); } }} />
                        </label>
                        <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                          <Upload size={14} className="text-amber-400" /> เลือกไฟล์
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setFormData({ ...formData, profileImage: file, profileImagePreview: URL.createObjectURL(file) }); } }} />
                        </label>
                        {(formData.profileImage || formData.profileImagePreview) && (
                          <button type="button" onClick={() => setFormData({ ...formData, profileImage: null, profileImagePreview: null })} className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1.5">
                            ลบภาพออก
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    {/* 🟢 1. คำนำหน้า / สมณศักดิ์ (พร้อมระบบ Auto-detect Gender) */}
                    <div className="space-y-1.5 md:col-span-2 relative group">
                      <label className="text-[10px] font-bold text-[#00E676]">คำนำหน้า / สมณศักดิ์</label>
                      <div className="flex gap-2">
                        <select
                          className="w-1/2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00E676]"
                          value={formData.prefix}
                          onChange={(e) => {
                            const val = e.target.value;
                            let autoGender = formData.gender; // เก็บค่าเดิมไว้ก่อน

                            // ลอจิกปรับเพศอัตโนมัติ
                            if (['นาย', 'พระ', 'พระครู', 'เด็กชาย'].includes(val)) autoGender = 'ชาย';
                            else if (['นาง', 'นางสาว', 'เด็กหญิง'].includes(val)) autoGender = 'หญิง';

                            setFormData({ ...formData, prefix: val, gender: autoGender });
                          }}
                        >
                          <option value="">-- เลือก --</option>
                          <option value="นาย">นาย</option>
                          <option value="นาง">นาง</option>
                          <option value="นางสาว">นางสาว</option>
                          <option value="พระ">พระ</option>
                          <option value="พระครู">พระครู</option>
                          <option value="เด็กชาย">เด็กชาย</option>
                          <option value="เด็กหญิง">เด็กหญิง</option>
                          <option value="other">อื่นๆ (พิมพ์ระบุ)</option>
                        </select>
                        <input
                          type="text"
                          className="w-1/2 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00E676] disabled:opacity-50"
                          placeholder="ระบุคำนำหน้า..."
                          value={formData.customPrefix}
                          onChange={(e) => setFormData({ ...formData, customPrefix: e.target.value })}
                          disabled={formData.prefix !== 'other'}
                        />
                      </div>
                    </div>

                    {/* 🟢 2. กล่องเลือกเพศ (Gender) */}
                    <div className="space-y-1.5 md:col-span-2 relative group">
                      <label className="text-[10px] font-bold text-[#00E676]">เพศ (Gender)</label>
                      <select
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#00E676]"
                        value={formData.gender || ''}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        <option value="ชาย">ชาย</option>
                        <option value="หญิง">หญิง</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                    </div>

                    {/* --- ส่วนข้อมูลอื่นๆ คงเดิม --- */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#00E676]">ชื่อ (First Name) <span className="text-red-400">*</span></label>
                      <input type="text" required value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#00E676]">นามสกุล (Last Name)</label>
                      <input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">ตำแหน่ง (Position)</label>
                      <input type="text" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">หน่วยงาน (Organization)</label>
                      <input type="text" value={formData.organization} onChange={e => setFormData({ ...formData, organization: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">เบอร์โทร (Contact)</label>
                      <input type="text" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">อำเภอ</label>
                      <input type="text" value={formData.guestDistrict} onChange={e => setFormData({ ...formData, guestDistrict: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">จังหวัด</label>
                      <input type="text" value={formData.guestProvince} onChange={e => setFormData({ ...formData, guestProvince: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                  </div>
                </div>

                {/* 🌟 Section: 2. บทบาทและการจัดการในงาน */}
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">2. การจัดการในงาน (Event Management)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">ประเภทแขก (Attendee Type)</label>
                      <select value={formData.attendeeType} onChange={e => setFormData({ ...formData, attendeeType: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none">
                        <option value="VIP">VIP (ประธาน/แขกผู้มีเกียรติ)</option>
                        <option value="Speaker">Speaker (วิทยากร)</option>
                        <option value="Guest">Guest (แขกรับเชิญ)</option>
                        <option value="Observer">Observer (ผู้สังเกตการณ์)</option>
                        <option value="Media">Media (สื่อมวลชน)</option>
                        <option value="Staff">Staff (คณะทำงาน)</option>
                        <option value="General">General (ผู้เข้าร่วมทั่วไป)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">บทบาทพิเศษ (Role)</label>
                      <input type="text" placeholder="เช่น ผู้กล่าวรายงาน" value={formData.roleInEvent} onChange={e => setFormData({ ...formData, roleInEvent: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">ลำดับความสำคัญ (Priority)</label>
                      <input type="number" value={formData.priorityLevel} onChange={e => setFormData({ ...formData, priorityLevel: parseInt(e.target.value) || 50 })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none text-center" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">เลขที่นั่ง (Seat No.)</label>
                      <input type="text" placeholder="เช่น A1, V-01" value={formData.seatNumber} onChange={e => setFormData({ ...formData, seatNumber: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none text-center font-bold text-amber-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">คิวขึ้นเวที (Action Seq.)</label>
                      <input type="number" placeholder="ลำดับคิว..." value={formData.actionSequence} onChange={e => setFormData({ ...formData, actionSequence: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-[#00E676] outline-none text-center font-bold text-purple-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#00E676] flex items-center h-full pt-4 cursor-pointer">
                        <input type="checkbox" checked={formData.isPresent} onChange={e => setFormData({ ...formData, isPresent: e.target.checked })} className="w-5 h-5 mr-2 accent-[#00E676]" />
                        ประกาศแนะนำตัว
                      </label>
                    </div>
                  </div>
                </div>

                {/* 🌟 Section: 3. ของที่ระลึก (Gifts) */}
                <div>
                  <h4 className="text-xs font-black text-pink-500 uppercase tracking-widest mb-3 border-b border-pink-500/20 pb-2">3. ของที่ระลึก (Gifts)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <label className="text-[10px] font-bold text-zinc-400">หมายเลข / รหัสของที่ระลึก</label>
                          <span className="text-[9px] text-pink-400 bg-pink-900/30 px-1.5 rounded">สร้างอัตโนมัติเมื่อระบุรูปแบบ</span>
                        </div>
                        <input
                          type="text"
                          value={formData.giftNumber}
                          onChange={e => setFormData({ ...formData, giftNumber: e.target.value })}
                          className="w-full bg-zinc-900 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                          placeholder="เว้นว่างไว้เพื่อสร้างเลขอัตโนมัติ..."
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400">รูปแบบ / ชนิดของที่ระลึก</label>
                        <input
                          type="text"
                          value={formData.giftStyle}
                          onChange={async (e) => {
                            const val = e.target.value;
                            if (val.trim() === '') {
                              setFormData(prev => ({ ...prev, giftStyle: val, giftNumber: '' }));
                            } else {
                              setFormData(prev => ({ ...prev, giftStyle: val }));
                              if (!formData.giftNumber || formData.giftNumber === '') {
                                setFormData(prev => ({ ...prev, giftNumber: 'กำลังจัดเลข...' }));
                                try {
                                  const { data, error } = await supabase
                                    .from('event_attendees')
                                    .select('gift_number')
                                    .eq('event_id', eventId)
                                    .not('gift_number', 'is', null)
                                    .not('gift_number', 'eq', '');
                                  let nextNumber = "01";
                                  if (!error && data && data.length > 0) {
                                    const numbers = data.map(row => parseInt(row.gift_number, 10)).filter(n => !isNaN(n));
                                    if (numbers.length > 0) {
                                      const maxNumber = Math.max(...numbers);
                                      nextNumber = (maxNumber + 1).toString().padStart(2, '0');
                                    }
                                  }
                                  setFormData(prev => ({ ...prev, giftNumber: nextNumber }));
                                } catch (err) {
                                  console.error(err);
                                  setFormData(prev => ({ ...prev, giftNumber: '' }));
                                }
                              }
                            }
                          }}
                          className="w-full bg-zinc-900 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-pink-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* 📸 ถ่ายภาพของที่ระลึก */}
                    <div className="space-y-1.5 p-3 bg-pink-950/20 border border-pink-500/20 rounded-xl flex flex-col justify-center">
                      <label className="text-[10px] font-bold text-pink-400 flex items-center gap-1">📸 ถ่ายภาพของที่ระลึก (ระบบบีบอัดอัตโนมัติ)</label>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="w-14 h-14 rounded-lg bg-black border border-pink-500/30 overflow-hidden shrink-0 flex items-center justify-center">
                          {formData.giftImage ? (
                            <img src={URL.createObjectURL(formData.giftImage)} alt="Gift Preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-zinc-600 text-[9px] text-center leading-tight">No<br />Image</span>
                          )}
                        </div>
                        <div className="flex-1 relative">
                          <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files && e.target.files[0]) setFormData({ ...formData, giftImage: e.target.files[0] }); }} />
                          <div className="bg-pink-900/30 hover:bg-pink-800/50 border border-pink-500/50 text-pink-300 transition-colors rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 h-10 shadow-inner">
                            กดเพื่อเปิดกล้อง / เลือกรูป
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* 🌟 Section: 4. กิจกรรมพิเศษ (Special Acts) */}
                <div className="mt-2">
                  <h4 className="text-xs font-black text-fuchsia-500 uppercase tracking-widest mb-3 border-b border-fuchsia-500/20 pb-2">4. กิจกรรมพิเศษ (Special Activities)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* 🎤 คิวพิเศษ 1 */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-zinc-400">คิวพิเศษ 1 ({act1Label})</label>
                        {defaultActValue && <span className="text-[9px] text-fuchsia-300 bg-fuchsia-900/40 px-1.5 rounded">ค่าเริ่มต้น: {defaultActValue}</span>}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={['', 'รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...(customOptions || [])].includes(formData.specialAct1) ? formData.specialAct1 : (formData.specialAct1 ? 'other' : '')}
                          onChange={e => setFormData({ ...formData, specialAct1: e.target.value === 'other' ? '✏️_' : e.target.value })}
                          className="flex-1 bg-zinc-900 border border-fuchsia-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none"
                        >
                          <option value="">-- ไม่ระบุ --</option>
                          <option value="รับรางวัลผู้บริหารดีเด่น">🏆 รับรางวัลผู้บริหารดีเด่น</option>
                          <option value="รับเกียรติบัตร">📜 รับเกียรติบัตร</option>
                          <option value="ขึ้นมอบของที่ระลึก">🎁 ขึ้นมอบของที่ระลึก</option>
                          {(customOptions || []).length > 0 && (
                            <optgroup label="ตัวเลือกเพิ่มเติมของคุณ">
                              {customOptions.map((opt, idx) => <option key={`add-opt1-${idx}`} value={opt}>⭐ {opt}</option>)}
                            </optgroup>
                          )}
                          <option value="other">✏️ อื่นๆ (พิมพ์ระบุเอง)</option>
                        </select>

                        {(customOptions || []).includes(formData.specialAct1) && (
                          <button type="button" onClick={() => handleDeleteOption(formData.specialAct1)} className="bg-red-900/30 hover:bg-red-500 text-red-400 hover:text-white px-3 rounded-xl border border-red-500/30 transition-colors" title="ลบตัวเลือก">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* 🌟 ช่องกรอกข้อความและ Checkbox เมื่อเลือก "อื่นๆ" */}
                      {formData.specialAct1 && !['รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...(customOptions || [])].includes(formData.specialAct1) && (
                        <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                          <input
                            type="text"
                            placeholder="พิมพ์ระบุคิวพิเศษ 1..."
                            value={formData.specialAct1 === '✏️_' ? '' : formData.specialAct1}
                            onChange={e => setFormData({ ...formData, specialAct1: e.target.value })}
                            className="w-full bg-zinc-950 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none shadow-[0_0_10px_rgba(217,70,239,0.1)]"
                          />
                          <label className="flex items-center gap-2 text-xs text-fuchsia-300 cursor-pointer w-fit hover:text-fuchsia-200 p-1.5 bg-fuchsia-900/20 rounded-lg pr-3 border border-fuchsia-500/20">
                            <input
                              type="checkbox"
                              checked={(formData as any).setAsDefaultAct === (formData as any).specialAct1}
                              onChange={(e) => setFormData({ ...formData, setAsDefaultAct: e.target.checked ? (formData as any).specialAct1 : null } as any)}
                              className="w-4 h-4 rounded bg-zinc-900 border-fuchsia-500 text-fuchsia-600 focus:ring-fuchsia-500"
                            />
                            ⭐ บันทึกเป็น "ค่าเริ่มต้น" ของงาน
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 🎤 คิวพิเศษ 2 */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">คิวพิเศษ 2 ({act2Label})</label>
                      <div className="flex gap-2">
                        <select
                          value={['', 'รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...(customOptions || [])].includes(formData.specialAct2) ? formData.specialAct2 : (formData.specialAct2 ? 'other' : '')}
                          onChange={e => setFormData({ ...formData, specialAct2: e.target.value === 'other' ? '✏️_' : e.target.value })}
                          className="flex-1 bg-zinc-900 border border-fuchsia-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none"
                        >
                          <option value="">-- ไม่ระบุ --</option>
                          <option value="รับรางวัลผู้บริหารดีเด่น">🏆 รับรางวัลผู้บริหารดีเด่น</option>
                          <option value="รับเกียรติบัตร">📜 รับเกียรติบัตร</option>
                          <option value="ขึ้นมอบของที่ระลึก">🎁 ขึ้นมอบของที่ระลึก</option>
                          {(customOptions || []).length > 0 && (
                            <optgroup label="ตัวเลือกเพิ่มเติมของคุณ">
                              {customOptions.map((opt, idx) => <option key={`add-opt2-${idx}`} value={opt}>⭐ {opt}</option>)}
                            </optgroup>
                          )}
                          <option value="other">✏️ อื่นๆ (พิมพ์ระบุเอง)</option>
                        </select>

                        {(customOptions || []).includes(formData.specialAct2) && (
                          <button type="button" onClick={() => handleDeleteOption(formData.specialAct2)} className="bg-red-900/30 hover:bg-red-500 text-red-400 hover:text-white px-3 rounded-xl border border-red-500/30 transition-colors" title="ลบตัวเลือก">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* 🌟 ช่องกรอกข้อความและ Checkbox เมื่อเลือก "อื่นๆ" */}
                      {formData.specialAct2 && !['รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...(customOptions || [])].includes(formData.specialAct2) && (
                        <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                          <input
                            type="text"
                            placeholder="พิมพ์ระบุคิวพิเศษ 2..."
                            value={formData.specialAct2 === '✏️_' ? '' : formData.specialAct2}
                            onChange={e => setFormData({ ...formData, specialAct2: e.target.value })}
                            className="w-full bg-zinc-950 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none shadow-[0_0_10px_rgba(217,70,239,0.1)]"
                          />
                          <label className="flex items-center gap-2 text-xs text-fuchsia-300 cursor-pointer w-fit hover:text-fuchsia-200 p-1.5 bg-fuchsia-900/20 rounded-lg pr-3 border border-fuchsia-500/20">
                            <input
                              type="checkbox"
                              checked={(formData as any).setAsDefaultAct === (formData as any).specialAct2}
                              onChange={(e) => setFormData({ ...formData, setAsDefaultAct: e.target.checked ? (formData as any).specialAct2 : null } as any)}
                              className="w-4 h-4 rounded bg-zinc-900 border-fuchsia-500 text-fuchsia-600 focus:ring-fuchsia-500"
                            />
                            ⭐ บันทึกเป็น "ค่าเริ่มต้น" ของงาน
                          </label>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* 🌟 Section: 5. เกียรติประวัติ / สคริปต์ประกาศ */}
                <div>
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-3 border-b border-amber-500/20 pb-2">5. สคริปต์ประกาศ / เกียรติประวัติ (Bio Note)</h4>
                  <textarea
                    rows={3}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-amber-200 outline-none focus:border-amber-500 resize-none custom-scrollbar"
                    placeholder="ข้อมูลแนะนำตัว หรือผลงานที่พิธีกรต้องใช้อ่าน..."
                    value={formData.honorsInfo}
                    onChange={e => setFormData({ ...formData, honorsInfo: e.target.value })}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10 shrink-0 sticky bottom-0 bg-zinc-950 pb-2">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowGlobalSearchPrompt(false); setSearchStatus({ loading: false, message: '', type: '' }); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">ยกเลิก</button>
                  <button type="submit" className="flex-[2] py-3 bg-gradient-to-r from-[#0B2447] to-[#0A4D3C] hover:from-[#123C69] hover:to-[#0F6E55] text-white border border-[#00E676]/50 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,230,118,0.2)]">
                    <Save size={18} /> บันทึกเข้าระบบและเช็คอิน (Arrived)
                  </button>
                </div>

              </form>
            </div>
          </div>
        )
      }

      {/* ========================================================
          📦 MODAL 2 & 3 (QR Code และ SMS คงเดิม)
          ======================================================== */}
      {
        showQrModal && (
          <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center relative">
              <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"><X size={20} /></button>
              <h3 className="font-black text-2xl text-zinc-900 mb-1">จุดลงทะเบียนออนไลน์</h3>
              <p className="text-xs text-zinc-500 font-bold mb-6">สแกน QR Code เพื่อกรอกข้อมูลเข้างานด้วยโทรศัพท์ของท่าน</p>

              {/* 🌟 สร้าง URL ให้ผูกกับ event_id ปัจจุบันแบบ Dynamic */}
              {(() => {
                // สร้างลิงก์สำหรับให้สแกน (ดึง Origin จากหน้าเว็บจริง เช่น http://localhost:3000 หรือ https://niivaa.com)
                const registerUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://niivaa.com'}/register?event_id=${eventId}`;

                return (
                  <>
                    <div className="p-4 border-4 border-dashed border-zinc-200 rounded-3xl mb-6 bg-white">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(registerUrl)}`}
                        alt="Register QR Code"
                        className="w-48 h-48 mix-blend-multiply"
                      />
                    </div>
                    <p className="text-[11px] font-mono font-bold text-zinc-500 bg-zinc-100 px-3 py-2 rounded-lg w-full truncate border border-zinc-200" title={registerUrl}>
                      🔗 {registerUrl}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        )
      }

      {
        showSmsModal && (
          <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="font-black text-xl text-white flex items-center gap-2"><MessageSquare className="text-amber-400" /> ศูนย์ส่งข้อความด่วน (Intercom)</h3>
                <button onClick={() => setShowSmsModal(false)} className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSendSms} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1">ข้อความแจ้งเตือน / ประกาศด่วน <span className="text-red-400">*</span></label>
                  <textarea required value={smsData.message} onChange={e => setSmsData({ ...smsData, message: e.target.value })} rows={3} placeholder="พิมพ์ข้อความที่ต้องการส่งขึ้นหน้าจอ..." className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none resize-none"></textarea>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400 flex items-center gap-1"><ImagePlus size={14} /> แนบลิงก์รูปภาพด่วน (ถ้ามี)</label>
                  <input type="text" value={smsData.imageUrl} onChange={e => setSmsData({ ...smsData, imageUrl: e.target.value })} placeholder="https://... (URL รูปภาพ)" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 focus:border-amber-500 outline-none font-mono" />
                </div>
                <button type="submit" className="mt-2 w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/50">
                  <Send size={18} /> สั่งยิงข้อความขึ้นจอระบบกลาง
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* ========================================================
          📦 MODAL 4: แก้ไขข้อมูลผู้ร่วมงานฉบับสมบูรณ์ (Master Edit)
          ======================================================== */}
      {
        showEditTypeModal && selectedAttendee && (
          <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-zinc-950 border border-blue-500/30 rounded-3xl p-6 w-full max-w-4xl shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col gap-5 max-h-[95vh]">

              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4 shrink-0">
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <Edit className="text-blue-400" /> แก้ไขข้อมูล: <span className="text-blue-300">{selectedAttendee.fullname}</span>
                </h3>
                <button onClick={() => setShowEditTypeModal(false)} className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-full transition-colors"><X size={20} /></button>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleSaveEditType} className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-2">

                {/* 🌟 Section: NiiVaa Code */}
                <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-blue-400">Master Directory (NiiVaa ID)</h4>
                    <p className="text-xs text-zinc-400 mt-1">การเชื่อมโยงฐานข้อมูลส่วนกลาง</p>
                  </div>
                  <div>
                    {selectedAttendee.profile_id ? (
                      <span className="bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={14} /> เชื่อมต่อระบบกลางเรียบร้อย
                      </span>
                    ) : (
                      <label className="flex items-center gap-2 cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-4 py-2 rounded-xl transition-colors">
                        <input type="checkbox" checked={requestNiiVaaCode} onChange={e => setRequestNiiVaaCode(e.target.checked)} className="w-4 h-4 accent-[#00E676]" />
                        <span className="text-xs font-bold text-zinc-300">นำเข้าประวัติสู่ Master Directory (ขอรหัสใหม่)</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* 🌟 Section: อัปโหลดรูปภาพบุคคล (Profile Photo) */}
                <div className="bg-zinc-900/60 border border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                  <div className="w-24 h-28 bg-black/50 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 relative">
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600 gap-1">
                        <ImageIcon size={28} />
                        <span className="text-[9px]">ไม่มีรูป</span>
                      </div>
                    )}
                    {editProfileImage && (
                      <span className="absolute top-1 right-1 bg-emerald-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full">
                        ภาพใหม่
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-left w-full">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Camera size={14} className="text-amber-400" /> จัดการรูปภาพประจำตัว (Storage: vip-profiles)
                    </h4>
                    <p className="text-[11px] text-zinc-400">รองรับการเปิดกล้องถ่ายสด หรือเลือกไฟล์ภาพ (ระบบจะบีบอัดไม่เกิน 500KB อัตโนมัติ)</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                        <Camera size={14} className="text-cyan-400" /> เปิดกล้องถ่ายภาพ
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setEditProfileImage(file); setEditImagePreview(URL.createObjectURL(file)); } }} />
                      </label>
                      <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                        <Upload size={14} className="text-amber-400" /> เลือกไฟล์ภาพ
                        <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) { setEditProfileImage(file); setEditImagePreview(URL.createObjectURL(file)); } }} />
                      </label>
                      {editImagePreview && (
                        <button type="button" onClick={() => { setEditProfileImage(null); setEditImagePreview(null); }} className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1.5">
                          ลบภาพออก
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 🌟 Section: 1. ข้อมูลส่วนบุคคล (Personal Info) */}
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">1. ข้อมูลบุคคล (Personal Data)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">คำนำหน้า</label>
                      <input type="text" value={editForm.prefix || ''} onChange={e => setEditForm({ ...editForm, prefix: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>

                    {/* 🟢 [เพิ่มใหม่] ช่องเลือกเพศใน Modal แก้ไข */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">เพศ (Gender)</label>
                      <select
                        value={
                          editForm.gender === 'ชาย' ? 'male' :
                            editForm.gender === 'หญิง' ? 'female' :
                              (editForm.gender || '')
                        }
                        onChange={e => {
                          const val = e.target.value;
                          // แปลงสตริงว่างเป็น null ป้องกัน Error 400 จากฐานข้อมูล
                          setEditForm({ ...editForm, gender: val === '' ? null : val });
                        }}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      >
                        <option value="">- ไม่ระบุ -</option>
                        <option value="male">ชาย</option>
                        <option value="female">หญิง</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">ชื่อ-นามสกุล (Fullname)</label>
                      <input type="text" required value={editForm.fullname || ''} onChange={e => setEditForm({ ...editForm, fullname: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">ตำแหน่ง (Position)</label>
                      <input type="text" value={editForm.position || ''} onChange={e => setEditForm({ ...editForm, position: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">หน่วยงาน (Organization)</label>
                      <input type="text" value={editForm.organization || ''} onChange={e => setEditForm({ ...editForm, organization: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">เบอร์โทร (Contact)</label>
                      <input type="text" value={editForm.contact_info || ''} onChange={e => setEditForm({ ...editForm, contact_info: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">อำเภอ</label>
                      <input type="text" value={editForm.guest_district || ''} onChange={e => setEditForm({ ...editForm, guest_district: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">จังหวัด</label>
                      <input type="text" value={editForm.guest_province || ''} onChange={e => setEditForm({ ...editForm, guest_province: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                </div>

                {/* 🌟 Section: 2. บทบาทและการจัดการในงาน (Event Roles) */}
                <div>
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">2. การจัดการในงาน (Event Management)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">ประเภทแขก (Attendee Type)</label>
                      <select value={editForm.attendee_type || 'General'} onChange={e => setEditForm({ ...editForm, attendee_type: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none">
                        <option value="VIP">VIP (ประธาน/แขกผู้มีเกียรติ)</option>
                        <option value="Speaker">Speaker (วิทยากร)</option>
                        <option value="Guest">Guest (แขกรับเชิญ)</option>
                        <option value="Observer">Observer (ผู้สังเกตการณ์)</option>
                        <option value="Media">Media (สื่อมวลชน)</option>
                        <option value="Staff">Staff (คณะทำงาน)</option>
                        <option value="General">General (ผู้เข้าร่วมทั่วไป)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400">บทบาทพิเศษ (Role)</label>
                      <input type="text" placeholder="เช่น ผู้กล่าวรายงาน" value={editForm.role_in_event || ''} onChange={e => setEditForm({ ...editForm, role_in_event: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">ลำดับความสำคัญ (Priority)</label>
                      <input type="number" value={editForm.priority_level || 50} onChange={e => setEditForm({ ...editForm, priority_level: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none text-center" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">เลขที่นั่ง (Seat No.)</label>
                      <input type="text" placeholder="เช่น A1, V-01" value={editForm.seat_number || ''} onChange={e => setEditForm({ ...editForm, seat_number: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none text-center font-bold text-amber-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400">คิวขึ้นเวที (Action Seq.)</label>
                      <input type="number" placeholder="ลำดับคิว..." value={editForm.action_sequence || ''} onChange={e => setEditForm({ ...editForm, action_sequence: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none text-center font-bold text-purple-400" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#00E676] flex items-center h-full pt-4 cursor-pointer">
                        <input type="checkbox" checked={editForm.is_present || false} onChange={e => setEditForm({ ...editForm, is_present: e.target.checked })} className="w-5 h-5 mr-2 accent-[#00E676]" />
                        ประกาศแนะนำตัว (Introduce)
                      </label>
                    </div>
                  </div>
                </div>

                {/* 🌟 Section: 3. ของที่ระลึก และคิวพิเศษ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* 🎁 คอลัมน์ 1: ของที่ระลึก */}
                  <div>
                    <h4 className="text-xs font-black text-pink-500 uppercase tracking-widest mb-3 border-b border-pink-500/20 pb-2">3. ของที่ระลึก (Gifts)</h4>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400">หมายเลข / รหัสของที่ระลึก </label>
                        <input type="text" value={editForm.gift_number || ''} onChange={e => setEditForm({ ...editForm, gift_number: e.target.value })} className="w-full bg-zinc-900 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-pink-500 outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400">รูปแบบ / ลักษณะเด่นของที่ระลึก</label>
                        <input type="text" value={editForm.gift_style || ''} onChange={e => setEditForm({ ...editForm, gift_style: e.target.value })} className="w-full bg-zinc-900 border border-pink-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-pink-500 outline-none" />
                      </div>

                      {/* 📸 ส่วนถ่ายภาพของที่ระลึก */}
                      <div className="space-y-1.5 mt-2 p-3 bg-pink-950/20 border border-pink-500/20 rounded-xl">
                        <label className="text-[10px] font-bold text-pink-400 flex items-center gap-1">📸 ถ่ายภาพ/เปลี่ยนภาพของที่ระลึก</label>
                        <div className="flex items-start gap-3 mt-1">

                          <div className="w-14 h-14 rounded-lg bg-black border border-pink-500/30 overflow-hidden shrink-0 flex items-center justify-center relative">
                            {editForm.giftImage ? (
                              <img src={URL.createObjectURL(editForm.giftImage)} alt="New Preview" className="w-full h-full object-cover" />
                            ) : editForm.gift_image_url ? (
                              <img src={editForm.gift_image_url} alt="Current Gift" className="w-full h-full object-cover opacity-80" />
                            ) : (
                              <span className="text-zinc-600 text-[9px] text-center leading-tight">No<br />Image</span>
                            )}
                          </div>

                          <div className="flex-1 flex flex-col gap-2">
                            {/* ปุ่มเลือกไฟล์ */}
                            <div className="relative">
                              <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { if (e.target.files && e.target.files[0]) setEditForm({ ...editForm, giftImage: e.target.files[0] }); }} />
                              <div className="bg-pink-900/30 hover:bg-pink-800/50 border border-pink-500/50 text-pink-300 transition-colors rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 h-10 shadow-inner">
                                กดเพื่อเปลี่ยนรูปใหม่
                              </div>
                            </div>

                            {/* 🌟 ปุ่มลบภาพ (จะโชว์เมื่อมีรูปเดิมหรือเพิ่งเลือกรูปใหม่) */}
                            {(editForm.giftImage || editForm.gift_image_url) && (
                              <button
                                type="button"
                                onClick={() => setEditForm({ ...editForm, giftImage: null, gift_image_url: null })}
                                className="text-red-400 hover:text-white bg-red-900/20 hover:bg-red-500 border border-red-500/30 transition-colors rounded-lg px-3 py-1.5 text-[10px] font-bold w-fit flex items-center gap-1"
                              >
                                🗑️ ลบภาพของที่ระลึกออก
                              </button>
                            )}
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 🎤 คอลัมน์ 2: คิวพิเศษ (จัดเต็มด้วย Dynamic Options แบบ Modal 5) */}
                  <div>
                    <h4 className="text-xs font-black text-fuchsia-400 uppercase tracking-widest mb-3 border-b border-fuchsia-500/20 pb-2">4. คิวพิเศษ (Special Acts)</h4>
                    <div className="space-y-5">

                      {/* คิวพิเศษ 1 */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-zinc-400">คิวพิเศษ 1 ({act1Label})</label>
                          {defaultActValue && <span className="text-[9px] text-fuchsia-300 bg-fuchsia-900/40 px-1.5 rounded">ค่าเริ่มต้น: {defaultActValue}</span>}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={['', 'รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...customOptions].includes(editForm.special_act1) ? editForm.special_act1 : (editForm.special_act1 ? 'other' : '')}
                            onChange={e => setEditForm({ ...editForm, special_act1: e.target.value === 'other' ? '✏️_' : e.target.value })}
                            className="flex-1 bg-zinc-900 border border-fuchsia-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none"
                          >
                            <option value="">-- ไม่ระบุ --</option>
                            <option value="รับรางวัลผู้บริหารดีเด่น">🏆 รับรางวัลผู้บริหารดีเด่น</option>
                            <option value="รับเกียรติบัตร">📜 รับเกียรติบัตร</option>
                            <option value="ขึ้นมอบของที่ระลึก">🎁 ขึ้นมอบของที่ระลึก</option>
                            {customOptions.length > 0 && (
                              <optgroup label="ตัวเลือกเพิ่มเติมของคุณ">
                                {customOptions.map((opt, idx) => <option key={`edit-opt1-${idx}`} value={opt}>⭐ {opt}</option>)}
                              </optgroup>
                            )}
                            <option value="other">✏️ อื่นๆ (พิมพ์ระบุเอง)</option>
                          </select>
                          {customOptions.includes(editForm.special_act1) && (
                            <button type="button" onClick={() => handleDeleteOption(editForm.special_act1)} className="bg-red-900/30 hover:bg-red-500 text-red-400 hover:text-white px-3 rounded-xl border border-red-500/30 transition-colors" title="ลบตัวเลือก">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* ช่องกรอกข้อความเมื่อเลือก "อื่นๆ" */}
                        {editForm.special_act1 && !['รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...customOptions].includes(editForm.special_act1) && (
                          <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                            <input
                              type="text"
                              placeholder="พิมพ์ระบุคิวพิเศษ 1..."
                              value={editForm.special_act1 === '✏️_' ? '' : editForm.special_act1}
                              onChange={e => setEditForm({ ...editForm, special_act1: e.target.value })}
                              className="w-full bg-zinc-950 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none shadow-[0_0_10px_rgba(217,70,239,0.1)]"
                            />
                            <label className="flex items-center gap-2 text-xs text-fuchsia-300 cursor-pointer w-fit hover:text-fuchsia-200 p-1.5 bg-fuchsia-900/20 rounded-lg pr-3 border border-fuchsia-500/20">
                              <input
                                type="checkbox"
                                checked={editForm.setAsDefaultAct === editForm.special_act1}
                                onChange={(e) => setEditForm({ ...editForm, setAsDefaultAct: e.target.checked ? editForm.special_act1 : null })}
                                className="w-4 h-4 rounded bg-zinc-900 border-fuchsia-500 text-fuchsia-600 focus:ring-fuchsia-500"
                              />
                              ⭐ บันทึกเป็น "ค่าเริ่มต้น" ของงาน
                            </label>
                          </div>
                        )}
                      </div>

                      {/* คิวพิเศษ 2 */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400">คิวพิเศษ 2 ({act2Label})</label>
                        <div className="flex gap-2">
                          <select
                            value={['', 'รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...customOptions].includes(editForm.special_act2) ? editForm.special_act2 : (editForm.special_act2 ? 'other' : '')}
                            onChange={e => setEditForm({ ...editForm, special_act2: e.target.value === 'other' ? '✏️_' : e.target.value })}
                            className="flex-1 bg-zinc-900 border border-fuchsia-500/30 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none"
                          >
                            <option value="">-- ไม่ระบุ --</option>
                            <option value="รับรางวัลผู้บริหารดีเด่น">🏆 รับรางวัลผู้บริหารดีเด่น</option>
                            <option value="รับเกียรติบัตร">📜 รับเกียรติบัตร</option>
                            <option value="ขึ้นมอบของที่ระลึก">🎁 ขึ้นมอบของที่ระลึก</option>
                            {customOptions.length > 0 && (
                              <optgroup label="ตัวเลือกเพิ่มเติมของคุณ">
                                {customOptions.map((opt, idx) => <option key={`edit-opt2-${idx}`} value={opt}>⭐ {opt}</option>)}
                              </optgroup>
                            )}
                            <option value="other">✏️ อื่นๆ (พิมพ์ระบุเอง)</option>
                          </select>
                          {customOptions.includes(editForm.special_act2) && (
                            <button type="button" onClick={() => handleDeleteOption(editForm.special_act2)} className="bg-red-900/30 hover:bg-red-500 text-red-400 hover:text-white px-3 rounded-xl border border-red-500/30 transition-colors" title="ลบตัวเลือก">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        {/* ช่องกรอกข้อความเมื่อเลือก "อื่นๆ" (สำหรับคิวที่ 2) */}
                        {editForm.special_act2 && !['รับรางวัลผู้บริหารดีเด่น', 'รับเกียรติบัตร', 'ขึ้นมอบของที่ระลึก', ...customOptions].includes(editForm.special_act2) && (
                          <div className="pt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                            <input
                              type="text"
                              placeholder="พิมพ์ระบุคิวพิเศษ 2..."
                              value={editForm.special_act2 === '✏️_' ? '' : editForm.special_act2}
                              onChange={e => setEditForm({ ...editForm, special_act2: e.target.value })}
                              className="w-full bg-zinc-950 border border-fuchsia-500/50 rounded-xl px-3 py-2 text-sm text-white focus:border-fuchsia-500 outline-none shadow-[0_0_10px_rgba(217,70,239,0.1)]"
                            />
                            <label className="flex items-center gap-2 text-xs text-fuchsia-300 cursor-pointer w-fit hover:text-fuchsia-200 p-1.5 bg-fuchsia-900/20 rounded-lg pr-3 border border-fuchsia-500/20">
                              <input
                                type="checkbox"
                                checked={editForm.setAsDefaultAct === editForm.special_act2}
                                onChange={(e) => setEditForm({ ...editForm, setAsDefaultAct: e.target.checked ? editForm.special_act2 : null })}
                                className="w-4 h-4 rounded bg-zinc-900 border-fuchsia-500 text-fuchsia-600 focus:ring-fuchsia-500"
                              />
                              ⭐ บันทึกเป็น "ค่าเริ่มต้น" ของงาน
                            </label>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>

                {/* 🌟 Section: 5. เกียรติประวัติ / สคริปต์ประกาศ */}
                <div>
                  <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-3 border-b border-amber-500/20 pb-2">5. สคริปต์ประกาศ / เกียรติประวัติ (Bio Note)</h4>
                  <textarea
                    rows={3}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-amber-200 outline-none focus:border-amber-500 resize-none custom-scrollbar"
                    placeholder="ข้อมูลแนะนำตัว หรือผลงานที่พิธีกรต้องใช้อ่าน..."
                    value={editForm.honors_info || ''}
                    onChange={e => setEditForm({ ...editForm, honors_info: e.target.value })}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/10 shrink-0 sticky bottom-0 bg-zinc-950 pb-2">
                  <button type="button" onClick={() => setShowEditTypeModal(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">ยกเลิก</button>
                  <button type="submit" className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40">
                    <Save size={18} /> บันทึกการแก้ไขข้อมูล
                  </button>
                </div>

              </form>
            </div>
          </div>
        )
      }

      {/* ========================================================
          📦 MODAL 5: กำหนดคิวพิเศษแบบกลุ่ม (Bulk Special Act)
          ======================================================== */}
      {
        showBulkActModal && (
          <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-zinc-950 border border-blue-500/50 rounded-3xl p-6 w-full max-w-lg shadow-[0_0_40px_rgba(59,130,246,0.15)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar">

              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <Gift className="text-blue-400" /> อัปเดตข้อมูลแบบกลุ่ม
                </h3>
                <button onClick={() => setShowBulkActModal(false)} className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl flex justify-between items-center">
                <span className="text-sm font-bold text-blue-300">จำนวนที่เลือกแก้ไข:</span>
                <span className="text-xl font-black text-[#00E676]">{selectedIds.length} ท่าน</span>
              </div>

              <form onSubmit={handleSaveBulkAct} className="flex flex-col gap-4">

                {/* 🌟 1. สถานะการเข้างาน (Status) */}
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="text-sm font-bold text-pink-400 flex items-center gap-2">
                    <UserCheck size={16} /> อัปเดตสถานะการเข้างาน (เช็คอิน)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-xs font-bold transition-all ${bulkActForm.statusAction === '' ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-zinc-500'}`}>
                      <input type="radio" value="" className="hidden" checked={bulkActForm.statusAction === ''} onChange={(e) => setBulkActForm({ ...bulkActForm, statusAction: e.target.value })} />
                      ไม่เปลี่ยนแปลง
                    </label>
                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-xs font-bold transition-all ${bulkActForm.statusAction === 'arrived' ? 'bg-[#00E676]/20 border-[#00E676] text-[#00E676]' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-[#00E676]/50'}`}>
                      <input type="radio" value="arrived" className="hidden" checked={bulkActForm.statusAction === 'arrived'} onChange={(e) => setBulkActForm({ ...bulkActForm, statusAction: e.target.value })} />
                      ✅ มางานแล้ว
                    </label>
                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-xs font-bold transition-all ${bulkActForm.statusAction === 'pending' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-orange-500/50'}`}>
                      <input type="radio" value="pending" className="hidden" checked={bulkActForm.statusAction === 'pending'} onChange={(e) => setBulkActForm({ ...bulkActForm, statusAction: e.target.value })} />
                      ⏳ ยังไม่มา
                    </label>
                  </div>
                </div>

                {/* 🌟 2. ประกาศแนะนำตัวหน้าเวที (is_present) */}
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <label className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Mic size={16} /> กำหนดประกาศแนะนำตัวหน้าเวที?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-xs font-bold transition-all ${bulkActForm.isPresentAction === '' ? 'bg-zinc-700 border-zinc-500 text-white' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-zinc-500'}`}>
                      <input type="radio" value="" className="hidden" checked={bulkActForm.isPresentAction === ''} onChange={(e) => setBulkActForm({ ...bulkActForm, isPresentAction: e.target.value })} />
                      ไม่เปลี่ยนแปลง
                    </label>
                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-xs font-bold transition-all ${bulkActForm.isPresentAction === 'Y' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-amber-500/50'}`}>
                      <input type="radio" value="Y" className="hidden" checked={bulkActForm.isPresentAction === 'Y'} onChange={(e) => setBulkActForm({ ...bulkActForm, isPresentAction: e.target.value })} />
                      📢 ประกาศ (True)
                    </label>
                    <label className={`cursor-pointer border rounded-lg py-2 text-center text-xs font-bold transition-all ${bulkActForm.isPresentAction === 'N' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-zinc-900 border-white/10 text-zinc-500 hover:border-red-500/50'}`}>
                      <input type="radio" value="N" className="hidden" checked={bulkActForm.isPresentAction === 'N'} onChange={(e) => setBulkActForm({ ...bulkActForm, isPresentAction: e.target.value })} />
                      ❌ ไม่ประกาศ (False)
                    </label>
                  </div>
                </div>

                {/* 🌟 3. อัปเดตคิวพิเศษ */}
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-blue-400 flex items-center gap-2">
                      <Gift size={16} /> อัปเดตคิวพิเศษ (Special Act)
                    </label>
                    {defaultActValue && <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-500/30">ค่าเริ่มต้นปัจจุบัน: {defaultActValue}</span>}
                  </div>

                  <select
                    value={bulkActForm.targetField}
                    onChange={e => {
                      const target = e.target.value;
                      // ถ้าเลือกช่องเป้าหมาย ให้ดึงค่า Default มาใส่ให้เลยอัตโนมัติ
                      setBulkActForm({
                        ...bulkActForm,
                        targetField: target,
                        actValue: target && defaultActValue ? defaultActValue : bulkActForm.actValue
                      });
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 outline-none"
                  >
                    <option value="">-- ไม่เปลี่ยนแปลงคิวพิเศษ --</option>
                    <option value="special_act1">ช่องที่ 1 (หัวข้อ: {act1Label})</option>
                    <option value="special_act2">ช่องที่ 2 (หัวข้อ: {act2Label})</option>
                  </select>

                  {bulkActForm.targetField && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex gap-2">
                        <select
                          value={bulkActForm.actValue}
                          onChange={e => {
                            setBulkActForm({ ...bulkActForm, actValue: e.target.value });
                            if (e.target.value !== 'other') setBulkActForm(prev => ({ ...prev, customActValue: '' }));
                          }}
                          className="flex-1 bg-zinc-950 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 outline-none"
                        >
                          <option value="">-- ล้างค่า / ไม่ระบุ --</option>
                          <option value="รับรางวัลผู้บริหารดีเด่น">🏆 รับรางวัลผู้บริหารดีเด่น</option>
                          <option value="รับเกียรติบัตร">📜 รับเกียรติบัตร</option>
                          <option value="ขึ้นมอบของที่ระลึก">🎁 ขึ้นมอบของที่ระลึก</option>

                          {customOptions.length > 0 && <optgroup label="ตัวเลือกเพิ่มเติมของคุณ">
                            {customOptions.map((opt, idx) => (
                              <option key={idx} value={opt}>⭐ {opt}</option>
                            ))}
                          </optgroup>}
                          <option value="other">✏️ อื่นๆ (พิมพ์ระบุเอง)</option>
                        </select>

                        {customOptions.includes(bulkActForm.actValue) && (
                          <button type="button" onClick={() => handleDeleteOption(bulkActForm.actValue)} className="bg-red-900/30 hover:bg-red-500 text-red-400 hover:text-white px-3 rounded-xl border border-red-500/30 transition-colors" title="ลบตัวเลือก">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      {/* ช่องพิมพ์เอง & Checkbox ตั้งค่า Default */}
                      {bulkActForm.actValue === 'other' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <input
                            type="text"
                            required
                            value={bulkActForm.customActValue}
                            onChange={e => setBulkActForm({ ...bulkActForm, customActValue: e.target.value })}
                            placeholder="พิมพ์ข้อความที่นี่..."
                            className="w-full bg-zinc-950 border border-blue-500/50 rounded-xl p-2.5 text-sm text-white focus:border-blue-500 outline-none"
                          />
                        </div>
                      )}

                      {/* 🌟 Checkbox บันทึกเป็นค่าเริ่มต้น (โชว์เมื่อมีการเลือก Act) */}
                      {(bulkActForm.actValue || bulkActForm.customActValue) && (
                        <label className="flex items-center gap-2 text-sm text-blue-300 cursor-pointer w-fit hover:text-blue-200 p-1 bg-blue-900/20 rounded-lg pr-3 border border-blue-500/20">
                          <input
                            type="checkbox"
                            checked={setAsDefault}
                            onChange={(e) => setSetAsDefault(e.target.checked)}
                            className="w-4 h-4 rounded bg-zinc-900 border-blue-500 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-900 ml-1"
                          />
                          ⭐ บันทึกเป็น "ค่าเริ่มต้น" ของงานนี้
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* ปุ่มกดยืนยัน */}
                <div className="mt-2 flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowBulkActModal(false); setSetAsDefault(false); }} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">ยกเลิก</button>
                  <button
                    type="submit"
                    disabled={!bulkActForm.isPresentAction && !bulkActForm.targetField && !bulkActForm.statusAction}
                    className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/30 disabled:shadow-none"
                  >
                    <Save size={18} /> ยืนยันอัปเดตข้อมูล
                  </button>
                </div>
              </form>

            </div>
          </div>
        )
      }
      {/* 🚀 Floating Bulk Action Bar */}
      {
        selectedIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-900/90 backdrop-blur-xl border border-blue-500/50 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-10">
            <div className="font-bold">เลือกแล้ว <span className="text-[#00E676] text-xl mx-1">{selectedIds.length}</span> ท่าน</div>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkActModal(true)} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-full text-sm font-bold transition-colors">
                เลือกกำหนดคิวพิเศษ (Special Act) และระบุประกาศแนะนำตัว
              </button>
              <button onClick={() => setSelectedIds([])} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full text-sm font-bold transition-colors">
                ยกเลิก
              </button>
            </div>
          </div>
        )
      }
      {/* 🔍 MODAL: ค้นหาจาก Global Profiles */}
      {
        showGlobalSearchModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-white/10 flex justify-between items-center bg-zinc-950">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Search className="text-indigo-400" /> ค้นหาประวัติฐานข้อมูลกลาง
                </h2>
                <button onClick={() => setShowGlobalSearchModal(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="p-5 flex-1 overflow-hidden flex flex-col gap-4">
                <form onSubmit={handleSearchGlobalProfiles} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อ, นามสกุล หรือ หน่วยงาน..."
                    value={globalSearchTerm}
                    onChange={(e) => setGlobalSearchTerm(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-500">
                    {isSearchingGlobal ? 'กำลังหา...' : 'ค้นหา'}
                  </button>
                </form>

                <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-black/20">
                  {globalSearchResults.length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 font-medium">พิมพ์คำค้นหาเพื่อดึงข้อมูลประวัติ</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {globalSearchResults.map(profile => (
                        <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                          <div>
                            <div className="font-bold text-white">{profile.prefix || ''}{profile.first_name} {profile.last_name}</div>
                            <div className="text-xs text-zinc-500">{profile.position || ''} {profile.organization || ''}</div>
                          </div>
                          <button
                            onClick={() => handleImportGlobalProfile(profile)}
                            className="bg-zinc-800 hover:bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2"
                          >
                            <UserPlus size={14} /> ดึงเข้าร่วมงาน
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* 🔴 MODAL: ส่งข้อความด่วน SOS */}
      {
        showSosModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">

              {/* Header Modal */}
              <div className="bg-red-950/40 px-6 py-4 flex justify-between items-center border-b border-red-900/30">
                <h3 className="text-lg font-black text-red-500 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 animate-pulse" /> ส่งข้อความด่วน (SOS)
                </h3>
                <button onClick={() => setShowSosModal(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {/* ปุ่ม Preset ข้อความด่วน */}
                <div className="mb-4">
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 block">ข้อความด่วน (คลิกเพื่อเติมข้อความ)</label>
                  <div className="flex flex-wrap gap-2">
                    {['วีไอพีมาถึงแล้ว', 'ขอเก้าอี้เพิ่ม', 'รันคิวต่อไปได้เลย', 'ขออนุญาตเบรก 5 นาที'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setSosMessage(preset)}
                        className="bg-gray-800 hover:bg-red-900/50 border border-gray-700 hover:border-red-500/50 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ช่องพิมพ์ / สั่งด้วยเสียง */}
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="พิมพ์ข้อความที่ต้องการส่งไปยังเวที..."
                    className="w-full bg-black border border-gray-700 rounded-xl p-4 pr-14 text-sm text-white outline-none focus:border-red-500 resize-none"
                    value={sosMessage}
                    onChange={(e) => setSosMessage(e.target.value)}
                  />

                  {/* ปุ่มไมโครโฟน */}
                  <button
                    onClick={handleSpeechToText}
                    className={`absolute right-3 bottom-3 p-2 rounded-full transition-all ${isListening
                      ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse'
                      : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    title="พูดข้อความ (Speech to Text)"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>

                {isListening && <p className="text-[10px] text-red-400 mt-2 animate-pulse">กำลังรับฟัง... กรุณาพูดข้อความ</p>}

                {/* ปุ่มส่ง */}
                <button
                  onClick={() => handleSendSos()}
                  className="w-full mt-6 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-colors"
                >
                  <Send className="w-5 h-5" /> ยืนยันส่งข้อความ
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* ========================================== */}
      {/* 🌟 FLOATING UI: ระบบรับข้อความ (VIP Style) */}
      {/* ========================================== */}

      {/* 🔴 1. แบนเนอร์แดงกลางจอ (Urgent Banner) */}
      {
        showUrgentBanner && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-red-600 w-11/12 max-w-4xl rounded-[2rem] p-10 shadow-[0_0_80px_rgba(220,38,38,0.6)] text-center animate-in zoom-in duration-300 border-4 border-red-500">
              <h2 className="text-2xl md:text-3xl font-black text-amber-300 flex items-center justify-center gap-4 mb-6">
                <AlertTriangle className="w-8 h-8 animate-pulse" />
                ข้อความด่วนจากผู้กำกับเวที (SM)
                <AlertTriangle className="w-8 h-8 animate-pulse" />
              </h2>
              <p className="text-4xl md:text-6xl font-black text-white mb-10 drop-shadow-lg leading-tight">
                {urgentIntercomMsg}
              </p>
              <button
                onClick={() => setShowUrgentBanner(false)}
                className="bg-white text-red-600 hover:bg-gray-100 px-8 py-4 rounded-full text-lg font-bold transition-transform hover:scale-105 flex items-center justify-center gap-2 mx-auto shadow-xl"
              >
                <X className="w-6 h-6" /> รับทราบและปิดข้อความ
              </button>
            </div>
          </div>
        )
      }

      {/* 💬 2. กล่อง Inbox และปุ่มวงกลมมุมขวาล่าง */}
      <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end">

        {/* กล่องข้อความ (เปิด/ปิด) */}
        {isInboxOpen && (
          <div className="bg-[#1e293b] border border-blue-500/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-80 mb-4 overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="bg-blue-900/80 px-4 py-3 flex justify-between items-center border-b border-blue-800/50">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" /> กล่องข้อความ SM
              </h3>
              <button onClick={() => setIsInboxOpen(false)} className="text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 p-1 rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-[#0f172a]">
              {incomingMessages.length > 0 ? incomingMessages.map(msg => (
                <div key={msg.id} className="bg-blue-950/40 border border-blue-900/50 p-3 rounded-xl mb-2 last:mb-0">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
                    <Clock className="w-3 h-3" /> เวลา {msg.time}
                  </div>
                  <p className="text-white text-sm font-bold mb-4">{msg.text}</p>

                  {/* ปุ่มกดจัดการข้อความ */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMarqueeMessage(msg.id)}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors shadow-sm ${msg.isShowingOnMarquee ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                      {msg.isShowingOnMarquee ? 'ซ่อนจากแถบวิ่ง' : 'แสดงบนแถบวิ่ง'}
                    </button>
                    <button
                      onClick={() => {
                        setIncomingMessages(prev => prev.filter(m => m.id !== msg.id));
                        if (unreadSmsCount > 0) setUnreadSmsCount(prev => prev - 1);
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-sm"
                    >
                      <CheckCircle className="w-3 h-3" /> รับทราบ
                    </button>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500 text-xs py-6">ไม่มีข้อความ</p>
              )}
            </div>
          </div>
        )}

        {/* ปุ่มวงกลมสีน้ำเงินเปิด Inbox */}
        <button
          onClick={() => {
            setIsInboxOpen(!isInboxOpen);
            setUnreadSmsCount(0);
          }}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center relative transition-transform hover:scale-105 border-2 border-[#020617]"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadSmsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#020617] animate-bounce shadow-lg">
              {unreadSmsCount}
            </span>
          )}
        </button>
      </div>
      {/* ========================================== */}
      {/* 🌟 Popup ขยายรูปภาพ (ขนาด 60% และไม่เบลอพื้นหลัง) */}
      {/* ========================================== */}
      {
        enlargedImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" // ใช้แค่สีดำโปร่งแสง 40% ไม่มีคลาส backdrop-blur
            onClick={() => setEnlargedImage(null)} // คลิกที่ว่างเพื่อปิด
          >
            <div className="relative animate-in zoom-in duration-200">
              <img
                src={enlargedImage}
                alt="Enlarged Profile"
                className="max-w-[60vw] max-h-[60vh] object-contain rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.6)] border border-white/20"
              />
              {/* ปุ่มปิด (X) กากบาท มุมขวาบน */}
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute -top-4 -right-4 bg-red-600 hover:bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-white"
              >
                ✕
              </button>
            </div>
          </div>
        )
      }
      {/* ========================================================
          🔍 MODAL: ขยายภาพคู่ (Profile & Gift Zoom)
          ======================================================== */}
      {
        zoomImageContent && (
          <div
            className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in zoom-in duration-200"
            onClick={() => setZoomImageContent(null)} // คลิกพื้นหลังเพื่อปิด
          >
            <div className="flex flex-col md:flex-row gap-6 items-center justify-center max-w-5xl w-full cursor-default" onClick={e => e.stopPropagation()}>

              {/* 👤 กล่องรูปโปรไฟล์ */}
              {zoomImageContent.profileUrl && (
                <div className="relative group rounded-3xl overflow-hidden border-2 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.3)] animate-in slide-in-from-bottom-4">
                  <img src={zoomImageContent.profileUrl} alt="Profile" className="max-w-[85vw] md:max-w-[40vw] max-h-[70vh] object-contain bg-zinc-900" />

                  {/* ชื่อทับด้านล่าง */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-16">
                    <p className="text-white text-2xl md:text-3xl font-black text-center tracking-wide text-shadow-sm">
                      {zoomImageContent.name}
                    </p>
                  </div>
                </div>
              )}

              {/* 🎁 กล่องรูปของที่ระลึก */}
              {zoomImageContent.giftUrl && (
                <div className="relative group rounded-3xl overflow-hidden border-2 border-pink-500/50 shadow-[0_0_40px_rgba(236,72,153,0.3)] animate-in slide-in-from-bottom-4 delay-75">
                  <img src={zoomImageContent.giftUrl} alt="Gift" className="max-w-[85vw] md:max-w-[40vw] max-h-[70vh] object-contain bg-zinc-900" />

                  {/* เลขรหัสทับด้านมุมบนขวา */}
                  <div className="absolute top-0 right-0 bg-pink-600/90 backdrop-blur-sm text-white font-black text-xl md:text-2xl px-5 py-3 rounded-bl-3xl shadow-lg border-b-2 border-l-2 border-pink-400">
                    #{zoomImageContent.giftNumber || 'ไม่มีรหัส'}
                  </div>
                </div>
              )}

              {/* ปุ่มปิด (X) */}
              <button
                onClick={() => setZoomImageContent(null)}
                className="absolute top-6 right-6 p-3 bg-zinc-900/80 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 shadow-xl"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )
      }
      {/* Drawer คู่มือการใช้งาน */}
      <AttendeesManualDrawer
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </div >
  );
}

// 2. Component หลัก
export default function AttendeesReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1128] flex items-center justify-center text-cyan-400 font-mono">Loading Attendees Page...</div>}>
      <AttendeesReportContent />
    </Suspense>
  );
}