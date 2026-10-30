"use client";
import RouteGuard from '@/components/RouteGuard';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mic, Clock, ArrowLeft, ToggleLeft, ToggleRight, Bell,
  HelpCircle, Send, Save, AlertTriangle, Palette, Info,
  Settings, MonitorPlay, MessageSquare, Video, Music, Image as ImageIcon, ExternalLink, Type, Plus, Minus, X, Activity,
  ListVideo, LayoutGrid, Crown
} from 'lucide-react';

// --- ชุดคู่สี 20 แบบสำหรับสคริปต์หลัก ---
const SCRIPT_THEMES = [
  { id: 'july', name: 'เฉลิมพระชนมพรรษา ร.๑๐ (ก.ค.)', bg: '#003192', text: '#E6E100' },
  { id: 'june', name: 'เฉลิมพระชนมพรรษา ราชินี (มิ.ย.)', bg: '#B235CB', text: '#FFFFFF' },
  { id: 't01', name: 'Classic Dark (ดำ/ขาว)', bg: '#020617', text: '#F8FAFC' },
  { id: 't02', name: 'Night Cyan (ดำ/ฟ้าคราม)', bg: '#000000', text: '#22D3EE' },
  { id: 't03', name: 'Emerald Forest (เขียวเข้ม/ขาว)', bg: '#064E3B', text: '#ECFDF5' },
  { id: 't04', name: 'Royal Crimson (แดงเข้ม/ทอง)', bg: '#7F1D1D', text: '#FEF08A' },
  { id: 't05', name: 'Midnight Sun (น้ำเงินลึก/เหลือง)', bg: '#0F172A', text: '#FDE047' },
  { id: 't06', name: 'Charcoal Orange (เทาดำ/ส้ม)', bg: '#1F2937', text: '#FB923C' },
  { id: 't07', name: 'Deep Purple (ม่วงเข้ม/ชมพูอ่อน)', bg: '#3B0764', text: '#FBCFE8' },
  { id: 't08', name: 'Ocean Blue (ฟ้าทะเล/ขาว)', bg: '#0C4A6E', text: '#FFFFFF' },
  { id: 't09', name: 'Coffee Brown (น้ำตาล/ครีม)', bg: '#451A03', text: '#FEF3C7' },
  { id: 't10', name: 'Slate Green (เทาอมเขียว/เขียวตอง)', bg: '#1E293B', text: '#BEF264' },
  { id: 't11', name: 'Pitch Black / Green (ดำสนิท/เขียว)', bg: '#000000', text: '#4ADE80' },
  { id: 't12', name: 'Pitch Black / Pink (ดำสนิท/ชมพู)', bg: '#000000', text: '#F472B6' },
  { id: 't13', name: 'Navy Silver (กรมท่า/เงิน)', bg: '#172554', text: '#E2E8F0' },
  { id: 't14', name: 'Maroon Peach (เลือดหมู/พีช)', bg: '#4C0519', text: '#FFEDD5' },
  { id: 't15', name: 'Dark Teal (เขียวอมฟ้า/ขาว)', bg: '#134E4A', text: '#F0FDFA' },
  { id: 't16', name: 'Warm Gray (เทาอุ่น/เหลืองอ่อน)', bg: '#27272A', text: '#FEF9C3' },
  { id: 't17', name: 'Indigo Sky (อินดิโก้/ฟ้าสว่าง)', bg: '#312E81', text: '#BAE6FD' },
  { id: 't18', name: 'Plum Rose (ม่วงพลัม/โรสโกลด์)', bg: '#500724', text: '#FDA4AF' },
  { id: 't19', name: 'Olive Lime (มะกอก/มะนาว)', bg: '#3F6212', text: '#D9F99D' },
  { id: 't20', name: 'High Contrast (ดำ/เหลืองสว่าง)', bg: '#000000', text: '#FFFF00' },
];

interface AgendaItem {
  id: string;
  title: string;
  duration_minutes: number;
  sort_order: number;
  is_live_now: boolean;
  start_time?: string;
  main_script?: string;
  sub_script?: string;
  speaker_role?: string;
  responsible_person?: string;
  media_type?: string;
  media_url?: string;
  visual_audio_cue?: string;
  reference_url?: string;
}

// ---------------------------------------------------------------------------
// ฟังก์ชันคำนวณสีคอมเมนต์ให้ตัดกับพื้นหลัง (Dynamic Contrast)
// ---------------------------------------------------------------------------
const getCommentColor = (bgHex: string) => {
  if (!bgHex) return '#FDE047';
  let hex = bgHex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#991B1B' : '#FDE047';
};

// ============================================================================
// 📖 Component: คู่มือการใช้งาน (Manual Drawer) ฝังในหน้านี้
// ============================================================================
function McScriptManualDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-[#020617] h-full shadow-[-10px_0_40px_rgba(0,0,0,0.8)] border-l border-cyan-900/50 flex flex-col animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-900/30 p-2.5 rounded-xl border border-cyan-800/50">
              <HelpCircle className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">คู่มือหน้าสคริปต์พิธีการ</h2>
              <p className="text-xs text-cyan-400 mt-0.5">MC-Script Prompter Manual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar text-sm text-gray-300">

          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <ToggleRight className="w-5 h-5" /> 1. โหมดการอ่านสคริปต์
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-4">
              <p className="text-gray-400">หน้าจอนี้ออกแบบมาเพื่อพิธีกรโดยเฉพาะ สามารถสลับโหมดการทำงานได้ตามสถานการณ์หน้างาน:</p>
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded border border-emerald-800/50 text-xs font-black shrink-0 mt-0.5">REAL-TIME SYNC</div>
                  <div>
                    <strong className="text-white block mb-1">โหมดซิงค์อัตโนมัติ</strong>
                    ระบบจะเลื่อนสคริปต์ให้โดยอัตโนมัติ เมื่อถึงเวลาที่ระบุไว้ตามกำหนดการ (เหมาะสำหรับงานที่มีการรันคิวเวลาเป๊ะ)
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded border border-yellow-800/50 text-xs font-black shrink-0 mt-0.5">MANUAL OVERRIDE</div>
                  <div>
                    <strong className="text-white block mb-1">โหมดควบคุมเอง</strong>
                    มีความยืดหยุ่นสูง ช่วยให้ปรับเปลี่ยนตามสถานการณ์จริงได้ โดยคุณสามารถเรียกใช้ Script Block ไหนก็ได้ เพียง <strong className="text-cyan-400">แตะที่รายการคิวงานด้านขวามือ</strong> สคริปต์ฝั่งซ้ายจะเปลี่ยนตามทันที
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <MessageSquare className="w-5 h-5" /> 2. การสื่อสารกับทีมงาน (SM)
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-4">
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <strong className="text-white block">ปุ่ม SOS (ฉุกเฉิน)</strong>
                    ใช้ส่งข้อความด่วน เพื่อแจ้งสื่อสารปัญหาไปยังผู้ควบคุมเวที (SM) เช่น ขอเวลาเพิ่ม หรือไมค์มีปัญหา
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <strong className="text-white block">แถบข้อความวิ่ง (Marquee)</strong>
                    แสดงข้อความประกาศแจ้งจากผู้ควบคุมเวที (SM) หรือข้อความสื่อสารระหว่าง Staff แผนกต่างๆ เพื่อให้พิธีกรรับรู้สถานการณ์ล่าสุด
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-600 border border-blue-400 shrink-0"></div>
                  <div>
                    <strong className="text-white block">กล่องข้อความมุมขวาล่าง</strong>
                    กดเพื่อเปิดดูประวัติข้อความ หรือประกาศทั้งหมดที่ส่งมาจากทีมงาน
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-fuchsia-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Palette className="w-5 h-5" /> 3. การปรับแต่งหน้าจอ
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong className="text-white flex items-center gap-2 mb-2"><Palette className="w-4 h-4 text-fuchsia-400" /> เปลี่ยนสีธีม</strong>
                <p className="text-gray-400 text-xs">เลือกชุดสีพื้นหลังสำเร็จรูปที่ออกแบบมาให้อ่านง่าย หรือตั้งค่า <span className="text-white">สีพื้น / สีฟอนต์</span> อย่างอิสระตามความต้องการของสายตาแต่ละคน</p>
              </div>
              <div>
                <strong className="text-white flex items-center gap-2 mb-2"><Type className="w-4 h-4 text-fuchsia-400" /> ขนาดอักษร (+ / -)</strong>
                <p className="text-gray-400 text-xs">ปรับเพิ่มหรือลดขนาดตัวอักษรในสคริปต์หลักฝั่งซ้าย เพื่อให้อ่านจากระยะไกลได้สะดวกที่สุด</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-teal-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <ListVideo className="w-5 h-5" /> 4. เครื่องมือสนับสนุนพิธีกร
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-4">
              <ul className="space-y-4 text-gray-400">
                <li className="flex items-start gap-3">
                  <ListVideo className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">ปุ่ม คิวเทคนิค & สื่อ</strong>
                    เปิดหน้าต่างแสดงข้อมูลสื่อ (VTR/เสียง) และคิวเวทีที่ใช้ในขั้นตอนนั้นๆ เพื่อให้พิธีกรรับทราบจังหวะ และทำงานร่วมกับฝ่ายควบคุมสื่อได้อย่างราบรื่น
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">ปุ่ม พิธีกรแนะนำ VIP</strong>
                    หากจะแนะนำแขกสำคัญ ให้กดปุ่มนี้ที่เมนูด้านบน เพื่อเปิดแท็บใหม่สำหรับสลับไปอ่านรายชื่อ ตำแหน่ง และข้อมูลแขก VIP โดยเฉพาะ
                  </div>
                </li>
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component เนื้อหาหลัก (MC Script Prompter)
// ============================================================================
function EmceeShowtimeScriptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';
  const supabase = createClient();

  // --- State ---
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [currentLiveItem, setCurrentLiveItem] = useState<AgendaItem | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const [readParagraphs, setReadParagraphs] = useState<Record<string, boolean>>({});

  const [editMainScript, setEditMainScript] = useState<string>('');
  const [editSubScript, setEditSubScript] = useState<string>('');
  const [activeTheme, setActiveTheme] = useState(SCRIPT_THEMES[2]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // 🌟 State ควบคุมคู่มือ
  const [isManualOpen, setIsManualOpen] = useState<boolean>(false);

  const [marqueeText, setMarqueeText] = useState<string>("พร้อมใช้งานระบบอ่านสคริปต์อเนกประสงค์ | หากพบปัญหาแจ้ง SOS ได้ทันที");
  const [showMarquee, setShowMarquee] = useState<boolean>(true);
  const [detailModalCue, setDetailModalCue] = useState<AgendaItem | null>(null);
  const [fontSize, setFontSize] = useState<number>(16);

  // --- SOS / SMS State ---
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [sosMessage, setSosMessage] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [sosPresets, setSosPresets] = useState<string[]>([
    'ขอน้ำดื่มด่วน', 'ขอข้ามคิวนี้ก่อน', 'ไมโครโฟนมีปัญหา', 'ขอเวลาเพิ่ม 3 นาที'
  ]);
  const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
  const [incomingMessages, setIncomingMessages] = useState<{ id: string, time: string, text: string }[]>([]);

  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);
  const [urgentSms, setUrgentSms] = useState<{ text: string, sender: string } | null>(null);

  const activeRowRef = useRef<HTMLDivElement | null>(null);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentMonth = new Date().getMonth();
    if (currentMonth === 6) setActiveTheme(SCRIPT_THEMES[0]);
    else if (currentMonth === 5) setActiveTheme(SCRIPT_THEMES[1]);
  }, []);

  const fetchScriptData = async () => {
    let targetEventId = eventId;
    if (targetEventId === 'current') {
      const { data: latestEvent } = await supabase.from('events').select('id').order('created_at', { ascending: false }).limit(1).single();
      if (latestEvent) targetEventId = latestEvent.id;
      else return;
    }

    const { data, error } = await supabase.from('event_agenda_items').select('*').eq('event_id', targetEventId).order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      setAgendaItems([]);
      return;
    }

    setAgendaItems(data);
    const liveItem = data.find((item) => item.is_live_now === true);
    if (isRealtimeActive) {
      const activeItem = liveItem || data[0] || null;
      setCurrentLiveItem(activeItem);
      if (activeItem) {
        setEditMainScript(activeItem.main_script || '');
        setEditSubScript(activeItem.sub_script || '');
      }
    }
  };

  useEffect(() => {
    fetchScriptData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, isRealtimeActive]);

  const handleSelectManualCue = (item: AgendaItem) => {
    if (isRealtimeActive) return;
    setCurrentLiveItem(item);
    setEditMainScript(item.main_script || '');
    setEditSubScript(item.sub_script || '');
  };

  const handleCustomColorChange = (type: 'bg' | 'text', value: string) => {
    setActiveTheme(prev => ({ ...prev, id: 'custom', name: 'กำหนดสีเอง (Custom)', [type]: value }));
  };

  const getMediaIcon = (type: string | undefined) => {
    if (type === 'video') return <Video className="w-4 h-4" />;
    if (type === 'audio') return <Music className="w-4 h-4" />;
    if (type === 'image') return <ImageIcon className="w-4 h-4" />;
    return null;
  };

  const handleSavePreset = () => {
    if (sosMessage.trim() && !sosPresets.includes(sosMessage.trim())) {
      setSosPresets([sosMessage.trim(), ...sosPresets]);
      setSosMessage('');
    }
  };

  const handleDeletePreset = (presetToDelete: string) => {
    if (window.confirm(`ต้องการลบข้อความ "${presetToDelete}" ใช่หรือไม่?`)) {
      setSosPresets(prev => prev.filter(preset => preset !== presetToDelete));
    }
  };

  const handleMicClick = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSosMessage(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSendSos = async (textToSend: string) => {
    if (!textToSend.trim() || !eventId) return;
    try {
      await supabase.from('event_live_messages').insert({
        event_id: eventId,
        sender_name: 'พิธีกร (หน้าสคริปต์)',
        sender_role: 'mc',
        message_text: `🚨 SOS ด่วน: ${textToSend}`,
        is_approved: true,
        target_screen: 'staff'
      });
      setIsSosModalOpen(false);
      setSosMessage('');
      alert('ส่งสัญญาณ SOS แจ้งทีมงานเรียบร้อยแล้ว!');
    } catch (err) {
      console.error("ส่ง SOS ล้มเหลว:", err);
    }
  };

  const renderParagraphsWithColors = (text: string | undefined, itemId: string) => {
    if (!text) return <span className="text-zinc-500 italic font-medium">ไม่มีบทสคริปต์ในคิวนี้...</span>;
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    const currentCommentColor = getCommentColor(activeTheme.bg);

    return (
      <div className="space-y-6 text-left py-4 px-2">
        {paragraphs.map((para, index) => {
          const paragraphKey = `${itemId}-${index}`;
          const isParagraphRead = readParagraphs[paragraphKey];
          const parts = para.split(/([\(（].*?[\)）])/g);

          return (
            <p
              key={index}
              onClick={() => setReadParagraphs(prev => ({ ...prev, [paragraphKey]: !prev[paragraphKey] }))}
              style={{ color: isParagraphRead ? '#9CA3AF' : activeTheme.text, fontSize: `${fontSize}pt` }}
              className={`cursor-pointer transition-all duration-500 font-bold leading-[1.6] select-text tracking-wide drop-shadow-md hover:brightness-110
                ${isParagraphRead ? 'opacity-40 font-medium' : 'opacity-100'}`}
              title="แตะเพื่อไฮไลต์ว่าอ่านจบแล้ว"
            >
              {parts.map((part, i) => {
                if (/^[\(（].*[\)）]$/.test(part)) {
                  return (
                    <span
                      key={i}
                      className="italic mx-1"
                      style={{ color: isParagraphRead ? '#6B7280' : currentCommentColor, fontSize: '0.9em' }}
                    >
                      {part}
                    </span>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase.channel(`receive-sms-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'event_live_messages',
        filter: `event_id=eq.${eventId}`
      }, (payload) => {
        const newMsg = payload.new;
        if (newMsg.sender_role === 'sm' && (newMsg.target_screen === 'all' || newMsg.target_screen === 'mc_script')) {
          const finalMessage = newMsg.message_text || "⚠️ ดึงข้อความล้มเหลว (message_text is empty)";
          const finalSender = newMsg.sender_name || "ศูนย์อำนวยการ";

          setUrgentSms({ text: finalMessage, sender: finalSender });
          setUrgentIntercomMsg(finalMessage);
          setShowUrgentBanner(true);
          setMarqueeText(`🔴 ประกาศด่วน [เวลา ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}]: ${finalMessage}`);

          setIncomingMessages(prev => [
            {
              id: newMsg.id || Date.now().toString(),
              time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
              text: finalMessage
            },
            ...prev
          ]);
          setIsInboxOpen(true);
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  return (
    <div className="h-screen bg-[#020617] text-white font-sans flex flex-col select-none relative overflow-hidden">

      {/* 🌟 แสดง Component คู่มือที่เขียนไว้ด้านบน */}
      <McScriptManualDrawer isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      {showUrgentBanner && urgentIntercomMsg && (
        <div className="fixed top-4 left-4 right-4 z-[9999] bg-gradient-to-r from-red-600 via-red-700 to-amber-600 border-2 border-white text-white p-4 rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.5)] flex items-center justify-between gap-4 animate-in slide-in-from-top-6">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-3 bg-black/30 rounded-xl text-white animate-bounce shrink-0"><AlertTriangle size={32} /></div>
            <div className="min-w-0 flex-1">
              <span className="bg-white text-red-700 font-black px-2 py-1 rounded text-xs uppercase tracking-wider">SMS ด่วนจากผู้กำกับเวที (SM)</span>
              <p className="text-xl md:text-2xl font-black tracking-wide text-white mt-1 break-words leading-snug animate-pulse">{urgentIntercomMsg}</p>
            </div>
          </div>
          <button onClick={() => setShowUrgentBanner(false)} className="bg-black/30 hover:bg-black/50 px-6 py-4 rounded-xl font-bold text-lg transition-colors shrink-0">รับทราบ (ปิด)</button>
        </div>
      )}

      {urgentSms && (
        <div className="absolute top-4 right-4 z-50 bg-red-600 text-white p-4 rounded-xl shadow-2xl animate-bounce">
          <div className="font-bold text-xs uppercase">{urgentSms.sender}</div>
          <div className="text-lg font-black">{urgentSms.text}</div>
          <button onClick={() => setUrgentSms(null)} className="mt-2 text-xs underline">ปิด</button>
        </div>
      )}

      {/* ================= HEADER (ตรึงแน่น 100%) ================= */}
      <header className="shrink-0 z-50 bg-[#020617]/95 backdrop-blur-2xl border-b border-cyan-900/40 p-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/officialeventdashboard/hub" className="p-3 bg-gray-800/50 rounded-xl text-zinc-400 hover:text-white transition-colors" title="กลับหน้าแรก (Hub)">
              <ArrowLeft size={20} />
            </Link>

            <div className="h-9 w-auto flex items-center justify-center">
              <Image src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" width={130} height={32} className="h-full object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" priority />
            </div>

            <span className="font-bold text-white tracking-wide border-l border-gray-700 pl-3 ml-1">
              พิธีกรหน้างาน <span className="text-cyan-400 text-xs hidden md:inline">(MC-PROMPTER)</span>
            </span>

            <div className="h-6 w-px bg-gray-800 mx-1 hidden lg:block"></div>

            <Link href={`/officialeventdashboard/script-builder${eventId !== 'current' ? `?event_id=${eventId}` : ''}`} className="hidden lg:flex items-center px-3 py-2 bg-gray-900 hover:bg-purple-900/40 text-purple-400 rounded-xl text-xs font-bold transition-all border border-gray-800">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> สร้าง/แก้ไขสคริปต์
            </Link>

            <Link href={`/officialeventdashboard/media-control${eventId !== 'current' ? `?event_id=${eventId}` : ''}`} className="hidden lg:flex items-center px-3 py-2 bg-gray-900 hover:bg-pink-900/40 text-pink-400 rounded-xl text-xs font-bold transition-all border border-gray-800">
              <MonitorPlay className="w-3.5 h-3.5 mr-1.5" /> ควบคุมสื่อ
            </Link>

            <Link href="/officialeventdashboard?type=official" className="hidden lg:flex items-center px-3 py-2 bg-gray-900 hover:bg-blue-900/40 text-blue-400 rounded-xl text-xs font-bold transition-all border border-gray-800">
              <Activity className="w-3.5 h-3.5 mr-1.5" /> ศูนย์ประสานงาน
            </Link>
            <Link
              href={`/events/event-dashboard/${eventId}`}
              className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
            >
              <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
            </Link>
            <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 ml-2">
              <button type="button" onClick={() => setIsRealtimeActive(!isRealtimeActive)} className="flex items-center gap-2 text-xs font-black tracking-wider transition-all focus:outline-none">
                {isRealtimeActive ?
                  <span className="text-emerald-400 flex items-center gap-1"><ToggleRight size={20} className="text-emerald-500" /> REAL-TIME SYNC</span> :
                  <span className="text-yellow-400 flex items-center gap-1"><ToggleLeft size={20} className="text-yellow-500" /> MANUAL OVERRIDE</span>
                }
              </button>
            </div>
            {/* ปุ่ม Toggle ซ่อน/แสดง แถบวิ่ง */}
            <button
              onClick={() => setShowMarquee(!showMarquee)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showMarquee
                ? 'bg-blue-900/40 border-blue-500/50 text-blue-300 hover:bg-blue-800/50'
                : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'
                }`}
            >
              <Bell size={14} className={showMarquee ? 'animate-bounce' : ''} />
              {showMarquee ? 'ซ่อนแถบ SMS' : 'เปิดแถบ SMS'}
            </button>

            {/* 🌟 ปุ่ม พิธีกรแนะนำVIP */}
            <Link
              href={`/eventdashboard/showtime/vip${eventId !== 'current' ? `?event_id=${eventId}` : ''}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border bg-indigo-950/60 border-indigo-700/50 text-indigo-200 hover:bg-indigo-900 hover:text-white shadow-sm"
            >
              <Crown size={14} />
              พิธีกรแนะนำVIP
            </Link>

            {/* 🌟 ปุ่มเปิดคู่มือ */}
            <button
              onClick={() => setIsManualOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-900/40 hover:bg-cyan-800/60 text-cyan-400 border border-cyan-800/50 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <HelpCircle size={14} />
              คู่มือ
            </button>

          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <div className="flex items-center bg-gray-900 rounded-xl border border-gray-700 p-1">
              <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="p-1.5 text-gray-400 hover:text-white rounded" title="ลดขนาดฟอนต์"><Minus className="w-4 h-4" /></button>
              <div className="px-2 text-xs font-bold text-fuchsia-400 flex items-center"><Type className="w-3 h-3 mr-1" /> {fontSize}pt</div>
              <button onClick={() => setFontSize(Math.min(36, fontSize + 2))} className="p-1.5 text-gray-400 hover:text-white rounded" title="เพิ่มขนาดฟอนต์"><Plus className="w-4 h-4" /></button>
            </div>

            <button onClick={() => setIsInboxOpen(!isInboxOpen)} className="relative p-2.5 bg-blue-900/30 text-blue-400 hover:bg-blue-800/50 rounded-xl border border-blue-700/50 transition-colors">
              <MessageSquare className="w-5 h-5" />
              {incomingMessages.length > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg animate-pulse">{incomingMessages.length}</span>}
            </button>

            <button onClick={() => setIsSosModalOpen(true)} className="flex items-center px-3 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_10px_rgba(239,68,68,0.4)]">
              <AlertTriangle className="w-4 h-4 mr-1" /> SOS
            </button>

            <div className="bg-gray-900/80 px-4 py-2 rounded-2xl border border-gray-700 text-center shadow-inner hidden md:block">
              <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-widest">LOCAL TIME</span>
              <span className="text-xl font-mono font-black text-fuchsia-400">
                {time ? time.toLocaleTimeString('th-TH') : '00:00:00'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* 🌟 แถบข้อความวิ่ง (Marquee) 🌟 */}
      {/* ========================================== */}
      {showMarquee && (
        <div className="bg-blue-950/90 border-y border-blue-500/50 px-4 py-2 flex items-center w-full shadow-inner relative z-40">
          <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 mr-3 flex items-center gap-1 shadow-[0_0_10px_rgba(37,99,235,0.5)]">
            <Bell size={12} className="animate-pulse" /> SMS UPDATE
          </span>
          <div className="flex-1 overflow-hidden relative flex items-center">
            <style>{`
              @keyframes scroll-text {
                0% { transform: translateX(100vw); }
                100% { transform: translateX(-100%); }
              }
              .animate-scroll {
                display: inline-block;
                white-space: nowrap;
                animation: scroll-text 30s linear infinite;
              }
            `}</style>
            <div className="animate-scroll text-amber-300 text-sm md:text-base font-bold tracking-wider">
              {marqueeText}
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ฝั่งซ้าย: DUAL PROMPTER */}
          <div className="lg:col-span-9 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] flex flex-col shadow-2xl relative overflow-hidden border-l-4 border-l-fuchsia-500 shadow-[-5px_0_25px_rgba(217,70,239,0.2)]">

              <div className="bg-gray-950 border-b border-gray-800 px-8 py-5 flex justify-between items-start relative">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-xs font-black uppercase tracking-widest ${currentLiveItem?.is_live_now ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                      {currentLiveItem?.is_live_now ? '🔴 ON-AIR NOW' : '📖 DRAFT MODE'}
                    </span>
                    {currentLiveItem && (
                      <span className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded text-xs font-black border border-purple-700/50 shadow-sm">
                        {`CUE #${currentLiveItem.sort_order} : ${currentLiveItem.speaker_role || 'MC'}`}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-black text-white mt-4">{currentLiveItem?.title || 'ไม่มีคิวงาน'}</h2>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDetailModalCue(currentLiveItem)}
                    className="px-4 py-3 bg-cyan-900/30 hover:bg-cyan-900/60 text-cyan-400 font-bold text-sm rounded-xl flex items-center gap-2 transition-all border border-cyan-800/50 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  >
                    <ListVideo size={18} /> คิวเทคนิค & สื่อ
                  </button>
                  <button onClick={() => setShowThemeSelector(!showThemeSelector)} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm rounded-xl flex items-center gap-2 transition-all border border-gray-700">
                    <Palette size={18} /> เปลี่ยนสี
                  </button>
                </div>
              </div>

              {showThemeSelector && (
                <div className="bg-gray-950 p-6 border-b border-gray-800 animate-in fade-in slide-in-from-top-4">
                  <p className="text-sm font-bold text-gray-400 mb-4">เลือกคู่สีสคริปต์หลัก:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {SCRIPT_THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => { setActiveTheme(theme); setShowThemeSelector(false); }}
                        className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all text-left truncate ${activeTheme.id === theme.id ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] scale-105' : 'border-gray-700 hover:border-gray-500'}`}
                        style={{ backgroundColor: theme.bg, color: theme.text }}
                      >
                        {theme.name}
                      </button>
                    ))}
                    <div className="col-span-2 flex items-center justify-center md:justify-end gap-4 md:gap-6 px-4 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 font-bold text-sm">สีอักษร</span>
                        <input type="color" value={activeTheme.text} onChange={(e) => handleCustomColorChange('text', e.target.value)} className="w-10 h-8 rounded cursor-pointer border-none p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 font-bold text-sm">สีพื้น</span>
                        <input type="color" value={activeTheme.bg} onChange={(e) => handleCustomColorChange('bg', e.target.value)} className="w-10 h-8 rounded cursor-pointer border-none p-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-8 md:p-12 transition-colors duration-500 min-h-[300px]" style={{ backgroundColor: activeTheme.bg }}>
                {renderParagraphsWithColors(isRealtimeActive ? currentLiveItem?.main_script : editMainScript, currentLiveItem?.id || 'manual')}
              </div>

              <div className="p-8 bg-black border-t border-gray-800 text-left space-y-4 relative overflow-hidden">
                <div className="flex items-center text-cyan-500 mb-2">
                  <Info size={20} className="mr-2" />
                  <span className="text-sm font-black uppercase tracking-widest">ข้อมูลเพิ่มเติม / หมายเหตุคิวนี้</span>
                </div>
                <div
                  className="font-medium text-gray-400 leading-relaxed whitespace-pre-line pl-7"
                  style={{ fontSize: `${Math.max(12, fontSize - 4)}pt` }}
                >
                  {isRealtimeActive ? (
                    currentLiveItem?.sub_script || <span className="text-gray-700 italic">- ไม่มีข้อมูลสำรอง -</span>
                  ) : (
                    editSubScript || '- ไม่มีข้อมูลสำรอง -'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: QUEUE LIST */}
          <div className="lg:col-span-3 bg-gray-900 border border-gray-800 p-6 rounded-[2rem] flex flex-col h-[calc(100vh-120px)] shadow-xl sticky top-0">
            <div className="text-sm font-black text-cyan-500 uppercase tracking-widest border-b border-gray-800 pb-4 mb-4 flex items-center justify-between shrink-0">
              <span>Timeline</span>
              <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-lg text-xs">{agendaItems.length} คิว</span>
            </div>

            <div className="space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {agendaItems.map((item, idx) => {
                const isItemLive = item.is_live_now;
                const isManualFocused = currentLiveItem?.id === item.id;

                let cardStyle = "bg-black/50 border-gray-800 opacity-60";
                if (!isRealtimeActive) cardStyle = isManualFocused ? "bg-gray-800 border-yellow-500 opacity-100 shadow-md" : "bg-black/60 hover:border-gray-600 cursor-pointer opacity-80";
                else if (isItemLive) cardStyle = "bg-cyan-950/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)] opacity-100";

                return (
                  <div key={item.id} ref={isItemLive && isRealtimeActive ? activeRowRef : null} onClick={() => handleSelectManualCue(item)} className={`p-4 rounded-2xl border transition-all text-left ${cardStyle}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded ${isItemLive ? "bg-cyan-500 text-black animate-pulse" : "bg-gray-800 text-gray-400"}`}>
                        {isItemLive ? "ON AIR" : `CUE #${item.sort_order}`}
                      </span>
                      <span className="font-mono text-gray-400 text-sm"><Clock size={12} className="inline mr-1 mb-0.5" />{item.start_time || '00:00'}</span>
                    </div>
                    <h4 className={`text-base font-bold truncate ${isItemLive ? 'text-white' : isManualFocused ? 'text-yellow-400' : 'text-gray-400'}`}>{item.title}</h4>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* ================= แผงข้อมูลเทคนิคและสื่อ ================= */}
      {detailModalCue && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[96%] max-w-7xl z-[100] animate-in slide-in-from-top-6 fade-in duration-300">
          <div className="bg-[#080B12] rounded-[2rem] shadow-[0_0_25px_rgba(45,212,191,0.15)] border border-gray-600 overflow-hidden relative">
            <button
              onClick={() => setDetailModalCue(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600 p-2 rounded-full transition-all z-10 shadow-sm border border-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-6 md:p-8">
              <h3 className="text-gray-200 font-bold text-xl md:text-2xl mb-5 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-teal-400" />
                แผงแสดงรายการคิวเวที เทคนิค และสื่อ (CUE #{detailModalCue.sort_order})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700 shadow-inner">
                  <div className="text-teal-400 text-[10px] font-black mb-2 uppercase tracking-widest">คิวเวที / เทคนิค (Stage Cues)</div>
                  <div className="text-lg text-orange-400 font-medium italic leading-relaxed">{(detailModalCue as any).details || '- ไม่มีคิวเทคนิค -'}</div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700 flex-1 shadow-inner">
                    <div className="text-teal-400 text-[10px] font-black mb-2 uppercase tracking-widest">ผู้รับผิดชอบ (Responsible)</div>
                    <div className="text-lg text-gray-300 font-bold">{detailModalCue.responsible_person || '-'}</div>
                  </div>
                  {detailModalCue.reference_url && (
                    <button onClick={() => window.open(detailModalCue.reference_url, '_blank')} className="flex items-center justify-center w-full py-3.5 bg-blue-700 hover:bg-blue-600 text-white rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.2)] border border-blue-500/50">
                      <ExternalLink className="w-4 h-4 mr-2" /> เปิดเอกสาร / รายชื่อ
                    </button>
                  )}
                </div>
                <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700 flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="text-teal-400 text-[10px] font-black mb-3 uppercase tracking-widest">
                      สื่อ (Media: {detailModalCue.media_type && detailModalCue.media_type !== 'none' ? detailModalCue.media_type.toUpperCase() : 'NONE'})
                    </div>
                    {detailModalCue.media_type && detailModalCue.media_type !== 'none' ? (
                      <div className="flex items-start gap-3 mb-4 text-gray-300 bg-black/40 p-3 rounded-xl border border-gray-800">
                        <div className="p-2 bg-teal-900/50 text-teal-400 rounded-lg shrink-0 border border-teal-800/50">
                          {getMediaIcon(detailModalCue.media_type)}
                        </div>
                        <span className="font-medium text-sm leading-snug text-gray-300">
                          หมายเหตุ: {detailModalCue.visual_audio_cue || '-'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm font-medium italic py-2">ไม่มีคิวสื่อสำหรับคิวนี้</div>
                    )}
                  </div>
                  {detailModalCue.media_type && detailModalCue.media_type !== 'none' && detailModalCue.media_url && (
                    <button onClick={() => window.open(detailModalCue.media_url, '_blank')} className="flex items-center justify-center w-full py-3.5 bg-teal-700 hover:bg-teal-600 text-white rounded-2xl font-bold transition-all shadow-[0_0_15px_rgba(15,118,110,0.3)] border border-teal-500/50 mt-2">
                      <MonitorPlay className="w-4 h-4 mr-2" /> เปิดสื่อ / ดันขึ้นจอ
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SOS MODAL --- */}
      {isSosModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_40px_rgba(239,68,68,0.2)] relative animate-in zoom-in-95">
            <div className="bg-red-600 p-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 animate-pulse" />
                ส่งสัญญาณความช่วยเหลือ (SOS)
              </h3>
              <button onClick={() => setIsSosModalOpen(false)} className="text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/40 p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">ส่งข้อความด่วนไปยังหน้าจอ Monitor หลัก (สามารถสร้างและบันทึกข้อความเตรียมไว้ได้)</p>

              <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
                {sosPresets.map(preset => (
                  <div key={preset} className="flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden group shadow-sm">
                    <button
                      onClick={() => handleSendSos(preset)}
                      className="hover:bg-red-600 hover:text-white text-gray-300 px-3 py-1.5 text-xs transition-colors flex items-center gap-1.5"
                      title="กดเพื่อส่งข้อความนี้ทันที"
                    >
                      <Send className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      {preset}
                    </button>
                    <button
                      onClick={() => handleDeletePreset(preset)}
                      className="px-2 py-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 transition-colors border-l border-gray-700"
                      title="ลบข้อความนี้"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="relative">
                <textarea
                  rows={3}
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  placeholder="พิมพ์ หรือ พูด ข้อความที่ต้องการ..."
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 pr-24 text-white outline-none focus:border-red-500 resize-none transition-colors"
                />

                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button
                    onClick={handleMicClick}
                    title="พูดเพื่อพิมพ์ข้อความ"
                    className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSavePreset}
                    title="บันทึกเป็นข้อความด่วน"
                    disabled={!sosMessage.trim()}
                    className="p-2 bg-gray-800 text-gray-400 hover:text-amber-400 disabled:opacity-50 disabled:hover:text-gray-400 rounded-lg transition-colors flex items-center"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleSendSos(sosMessage)}
                disabled={!sosMessage.trim()}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                <Send className="w-4 h-4 mr-2" /> ส่งออกไปยัง Live Monitor
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d946ef; border-radius: 4px; }
      `}} />

      {/* ========================================== */}
      {/* 🌟 ปุ่มลอย Inbox และกล่องข้อความสีน้ำเงิน 🌟 */}
      {/* ========================================== */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
        {isInboxOpen && (
          <div className="mb-4 w-80 bg-blue-900/95 backdrop-blur-xl border border-blue-400/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="px-4 py-3 border-b border-blue-400/30 flex justify-between items-center bg-black/20">
              <h3 className="font-bold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-400" /> กล่องข้อความ SM
              </h3>
              <button onClick={() => setIsInboxOpen(false)} className="text-blue-300 hover:text-white p-1 bg-white/10 hover:bg-red-500 rounded-md transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {incomingMessages.length > 0 ? incomingMessages.map((msg) => (
                <div key={msg.id} className="bg-black/40 border border-white/5 rounded-xl p-3">
                  <div className="text-[10px] text-blue-400 font-bold mb-1 flex items-center gap-1">
                    <Clock size={10} /> เวลา {msg.time}
                  </div>
                  <p className="text-sm text-white font-medium">{msg.text}</p>
                </div>
              )) : <div className="text-xs text-center text-blue-300/50 py-6 font-bold">ไม่มีข้อความใหม่</div>}
            </div>
          </div>
        )}
        <button
          onClick={() => setIsInboxOpen(!isInboxOpen)}
          className="relative bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all transform hover:scale-110 border-2 border-blue-400/50"
        >
          <MessageSquare size={24} />
          {incomingMessages.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#020617] animate-bounce">
              {incomingMessages.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// Export ตัวแปรหลักเพื่อครอบด้วย Suspense
export default function McScriptPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#020617] text-white flex items-center justify-center">Loading...</div>}>
       // 🌟 หุ้มด้วย RouteGuard และอนุญาตให้ admin และ mc (พิธีกร) เข้าใช้งานได้
      <RouteGuard allowedRoles={['admin', 'mc']}>
        <EmceeShowtimeScriptContent />
      </RouteGuard>
    </Suspense>
  );
}