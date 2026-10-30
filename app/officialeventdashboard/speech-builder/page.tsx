"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Edit3, Printer, MonitorPlay, Palette,
  Save, FileText, ZoomIn, ZoomOut, CheckCircle,
  Play, Square, RotateCcw, FastForward, Clock, Minus, Plus
} from 'lucide-react';

// --- ชุดคู่สีมาตรฐาน (อิงตามงานรัฐพิธี) ---
const SPEECH_THEMES = [
  { id: 'july', name: 'ร.๑๐ (ก.ค.)', bg: '#DBD600', text: '#1E1E78' },
  { id: 'june', name: 'ราชินี (มิ.ย.)', bg: '#B235CB', text: '#CEFFFE' },
  { id: 'august', name: 'พระพันปีหลวง (ส.ค.)', bg: '#38BDF8', text: '#FFFFFF' },
  { id: 'mourning', name: 'พิธีไว้อาลัย (ดำ/ขาว)', bg: '#111827', text: '#F9FAFB' },
  { id: 'classic', name: 'กระดาษทางการ (ขาว/ดำ)', bg: '#FFFFFF', text: '#000000' },
];

const DEFAULT_SPEECH = `ขอเดชะฝ่าละอองธุลีพระบาทปกเกล้าปกกระหม่อม

ข้าพระพุทธเจ้า [ชื่อ-นามสกุล ประธานในพิธี] [ตำแหน่ง] พร้อมด้วยข้าราชการ ศาล ทหาร ตำรวจ องค์กรปกครองส่วนท้องถิ่น และพสกนิกรชาวไทยทุกหมู่เหล่า ที่ได้มาชุมนุมอย่างพร้อมเพรียงกัน ณ มณฑลพิธีแห่งนี้ ล้วนมีความปลาบปลื้มปีติเป็นล้นพ้น ที่ได้มาร่วมกันแสดงความจงรักภักดี และสำนึกในพระมหากรุณาธิคุณ เนื่องในโอกาสวันเฉลิมพระชนมพรรษา

ปวงข้าพระพุทธเจ้า ล้วนสำนึกในพระมหากรุณาธิคุณหาที่สุดมิได้ ที่ใต้ฝ่าละอองธุลีพระบาท ทรงบำเพ็ญพระราชกรณียกิจนานัปการ ด้วยพระราชวิริยอุตสาหะ เพื่อบำบัดทุกข์บำรุงสุขแก่ราษฎร ทรงสืบสาน รักษา และต่อยอด แนวพระราชดำริ ทั้งปวง เพื่อความร่มเย็นเป็นสุขของพสกนิกรชาวไทย

ในศุภวาระมหามงคลเฉลิมพระชนมพรรษา ข้าพระพุทธเจ้าขอพระราชทานนำผู้มาประชุมพร้อมกัน ณ ที่แห่งนี้ กล่าวถวายพระพรชัยมงคล ดังต่อไปนี้...

"ข้าพระพุทธเจ้าทั้งหลาย ขอพระราชทานถวายพระพรชัยมงคล ขออานุภาพแห่งคุณพระศรีรัตนตรัย และสิ่งศักดิ์สิทธิ์ทั้งหลายในสากลโลก ตลอดจนพระบารมีแห่งพระสยามเทวาธิราช โปรดอภิบาลและดลบันดาลประทานพร ให้ใต้ฝ่าละอองธุลีพระบาท ทรงพระเจริญพร้อมด้วยจตุรพิธพรชัย ทรงพระเกษมสำราญ พระเกียรติคุณแผ่ไพศาลไปทั่วทิศานุทิศ สถิตเป็นมิ่งขวัญร่มเกล้าของพสกนิกรชาวไทย ตลอดจิรัฐิติกาล เทอญ"

ด้วยเกล้าด้วยกระหม่อม ขอเดชะ`;

export default function SpeechBuilderPage() {
  // --- States: General ---
  const [speechText, setSpeechText] = useState(DEFAULT_SPEECH);
  const [viewMode, setViewMode] = useState<'editor' | 'live'>('editor');
  const [isSaved, setIsSaved] = useState(false);
  const [time, setTime] = useState(new Date());

  // --- States: Theme & Colors ---
  const [activeThemeId, setActiveThemeId] = useState('july');
  const [customBg, setCustomBg] = useState('#DBD600');
  const [customText, setCustomText] = useState('#1E1E78');

  // --- States: Prompter Control ---
  const [fontSizePx, setFontSizePx] = useState(42);
  const [scrollSpeed, setScrollSpeed] = useState(3); // ระดับความเร็ว (1-10)
  const [startDelay, setStartDelay] = useState(8);
  const [isScrolling, setIsScrolling] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Refs สำหรับแก้ปัญหาการปัดเศษทศนิยมของการเลื่อนจอ (Ultra-Smooth Scroll)
  const exactScrollTop = useRef<number>(0);
  const prompterRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Settings
  useEffect(() => {
    const month = new Date().getMonth();
    if (month === 6) setActiveThemeId('july');
    else if (month === 5) setActiveThemeId('june');
    else if (month === 7) setActiveThemeId('august');

    const savedSpeed = localStorage.getItem('prompter_speed');
    const savedDelay = localStorage.getItem('prompter_delay');
    if (savedSpeed) setScrollSpeed(Number(savedSpeed));
    if (savedDelay) setStartDelay(Number(savedDelay));
  }, []);

  const currentBg = activeThemeId === 'custom' ? customBg : SPEECH_THEMES.find(t => t.id === activeThemeId)?.bg;
  const currentText = activeThemeId === 'custom' ? customText : SPEECH_THEMES.find(t => t.id === activeThemeId)?.text;

  // --- Handlers ---
  const handlePrint = () => window.print();

  const handleSaveSettings = () => {
    localStorage.setItem('prompter_speed', scrollSpeed.toString());
    localStorage.setItem('prompter_delay', startDelay.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // --- Auto Scroll Logic (Ultra Smooth) ---
  const smoothScroll = () => {
    if (prompterRef.current && isScrolling) {
      // แฟคเตอร์: สเกล 1-10 แปลงเป็นความเร็ว 0.1 - 1.0 พิกเซล/เฟรม
      const actualSpeed = scrollSpeed * 0.1;

      exactScrollTop.current += actualSpeed; // สะสมค่าทศนิยม
      prompterRef.current.scrollTop = exactScrollTop.current; // ส่งค่ากลับไปที่ Scroll bar

      const maxScroll = prompterRef.current.scrollHeight - prompterRef.current.clientHeight;
      if (prompterRef.current.scrollTop >= maxScroll - 10) {
        setIsScrolling(false);
        return;
      }
      requestRef.current = requestAnimationFrame(smoothScroll);
    }
  };

  useEffect(() => {
    if (isScrolling) {
      // ดึงค่าตำแหน่งปัจจุบันมาก่อนเริ่มแอนิเมชัน เพื่อไม่ให้กระตุกเวลาหยุดแล้วเล่นต่อ
      if (prompterRef.current) {
        exactScrollTop.current = prompterRef.current.scrollTop;
      }
      requestRef.current = requestAnimationFrame(smoothScroll);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrolling, scrollSpeed]);

  // --- Start / Stop Controls ---
  const handleStartPrompter = () => {
    if (startDelay > 0) {
      setCountdown(startDelay);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev && prev > 1) return prev - 1;
          clearInterval(countdownIntervalRef.current as any);
          setIsScrolling(true);
          return null;
        });
      }, 1000);
    } else {
      setIsScrolling(true);
    }
  };

  const handlePausePrompter = () => {
    setIsScrolling(false);
    setCountdown(null);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleResetPrompter = () => {
    handlePausePrompter();
    if (prompterRef.current) {
      exactScrollTop.current = 0;
      prompterRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans print:bg-white print:text-black">

      {/* ================= HEADER ================= */}
      <header className="bg-gray-900 border-b border-cyan-900/50 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)] print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-cyan-400 rounded-lg transition-colors border border-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-gray-800 mx-2"></div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-500" /> Speech Builder
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[11px] text-gray-300 font-bold uppercase tracking-widest mb-0.5">
                {time.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <div className="bg-black/50 px-3 py-1 rounded-lg border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <span className="text-lg font-mono font-black text-cyan-400 animate-pulse">
                  {time.toLocaleTimeString('th-TH', { hour12: false })}
                </span>
              </div>
            </div>
            <div className="h-10 w-auto hidden sm:block">
              <Image src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" width={140} height={40} className="h-full object-contain opacity-90 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 print:p-0 print:m-0">

        {/* ================= CONTROL PANEL ================= */}
        <div className="print:hidden bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6 shadow-xl">

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">

            {/* สลับโหมด Editor / Live */}
            <div className="flex bg-black rounded-xl p-1 border border-gray-800 shrink-0">
              <button
                onClick={() => { setViewMode('editor'); handlePausePrompter(); }}
                className={`flex items-center justify-center px-5 py-2 rounded-lg text-sm font-bold transition-all 
                  ${viewMode === 'editor' ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'text-gray-400 hover:text-white'}`}
              >
                <Edit3 className="w-4 h-4 mr-2" /> โหมดแก้ไข
              </button>
              <button
                onClick={() => setViewMode('live')}
                className={`flex items-center justify-center px-5 py-2 rounded-lg text-sm font-bold transition-all 
                  ${viewMode === 'live' ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-gray-400 hover:text-white'}`}
              >
                <MonitorPlay className="w-4 h-4 mr-2" /> หน้าจอประธานอ่าน
              </button>
            </div>

            {/* แผงเครื่องมือ (เปลี่ยนตามโหมด) */}
            <div className="flex-1 w-full flex flex-wrap items-center justify-end gap-3">
              {viewMode === 'editor' ? (
                <>
                  <button onClick={handleSaveSettings} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    {isSaved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} บันทึกร่าง
                  </button>
                  <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-gray-200 hover:bg-white text-gray-900 rounded-xl text-sm font-bold transition-all shadow-md">
                    <Printer className="w-4 h-4 mr-2" /> พิมพ์ (PDF)
                  </button>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-3 bg-gray-950/50 p-2 rounded-xl border border-gray-700 w-full lg:w-auto">

                  {/* หน่วงเวลา */}
                  <div className="flex items-center gap-2 px-3 border-r border-gray-700">
                    <Clock className="w-4 h-4 text-gray-300" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-300 uppercase font-bold">หน่วงเวลา (วิ)</span>
                      <input type="number" min="0" max="60" value={startDelay} onChange={(e) => setStartDelay(Number(e.target.value))} className="w-12 bg-transparent text-white font-bold text-sm outline-none" />
                    </div>
                  </div>

                  {/* ความเร็ว (เปลี่ยนเป็นปุ่มคลิก - / + สเกล 1-10) */}
                  <div className="flex items-center gap-1 px-3 border-r border-gray-700">
                    <span className="text-[10px] text-gray-300 uppercase font-bold mr-1">ความเร็ว</span>
                    <button onClick={() => setScrollSpeed(prev => Math.max(1, prev - 1))} className="p-1 hover:bg-gray-700 rounded text-gray-300 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-mono font-bold text-cyan-400 w-6 text-center">{scrollSpeed}</span>
                    <button onClick={() => setScrollSpeed(prev => Math.min(10, prev + 1))} className="p-1 hover:bg-gray-700 rounded text-gray-300 transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ขนาดฟอนต์ */}
                  <div className="flex items-center gap-1 px-3">
                    <span className="text-[10px] text-gray-300 uppercase font-bold mr-1">ขนาด</span>
                    <button onClick={() => setFontSizePx(prev => Math.max(20, prev - 2))} className="p-1 hover:bg-gray-700 rounded text-gray-300 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-sm font-mono font-bold text-white w-8 text-center">{fontSizePx}</span>
                    <button onClick={() => setFontSizePx(prev => Math.min(80, prev + 2))} className="p-1 hover:bg-gray-700 rounded text-gray-300 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                  </div>

                  {/* ปุ่มบันทึกค่า (มีขอบเรืองแสง) */}
                  <button
                    onClick={handleSaveSettings}
                    className="ml-auto bg-gray-900 border border-cyan-400 text-cyan-400 hover:bg-cyan-900 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                  >
                    {isSaved ? 'บันทึกแล้ว' : 'บันทึกค่า'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* แผงเปลี่ยนสีและปุ่มควบคุม (แสดงเฉพาะโหมด Live) */}
          {viewMode === 'live' && (
            <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest mr-2 flex items-center">
                <Palette className="w-4 h-4 mr-1 text-gray-400" /> เลือกคู่สีหน้าจอ:
              </span>

              {SPEECH_THEMES.map(theme => (
                <button key={theme.id} onClick={() => setActiveThemeId(theme.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeThemeId === theme.id ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] scale-105' : 'border-gray-700 opacity-70 hover:opacity-100'}`} style={{ backgroundColor: theme.bg, color: theme.text }}>
                  {theme.name}
                </button>
              ))}
              <button onClick={() => setActiveThemeId('custom')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeThemeId === 'custom' ? 'border-cyan-400 bg-gray-800 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)] scale-105' : 'border-gray-700 text-gray-300'}`}>
                กำหนดเอง
              </button>
              {activeThemeId === 'custom' && (
                <div className="flex items-center gap-3 ml-2 bg-black px-3 py-1 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2"><label className="text-xs text-gray-300">Bg:</label><input type="color" value={customBg} onChange={(e) => setCustomBg(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" /></div>
                  <div className="flex items-center gap-2"><label className="text-xs text-gray-300">Text:</label><input type="color" value={customText} onChange={(e) => setCustomText(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" /></div>
                </div>
              )}

              {/* ย้ายปุ่ม Start/Pause/Reset มาไว้ตรงนี้ (ฝั่งขวาสุด แบบสถิต) */}
              <div className="ml-auto flex items-center gap-2 bg-black p-1.5 rounded-xl border border-gray-700 shadow-inner">
                {!isScrolling && !countdown && (
                  <button onClick={handleStartPrompter} className="flex items-center px-4 py-1.5 bg-green-600 hover:bg-green-500 text-black rounded-lg text-sm font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.4)]">
                    <Play className="w-4 h-4 mr-1.5" /> เริ่มอ่าน
                  </button>
                )}
                {countdown && (
                  <div className="flex items-center px-4 py-1.5 bg-yellow-500 text-black rounded-lg text-sm font-black animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                    เตรียมตัว... {countdown}
                  </div>
                )}
                {isScrolling && (
                  <button onClick={handlePausePrompter} className="flex items-center px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                    <Square className="w-4 h-4 mr-1.5" /> หยุด
                  </button>
                )}
                <div className="w-px h-5 bg-gray-700 mx-1"></div>
                <button onClick={handleResetPrompter} className="flex items-center px-3 py-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors" title="กลับไปบรรทัดแรก">
                  <RotateCcw className="w-4 h-4 mr-1" /> รีเซท
                </button>
              </div>

            </div>
          )}
        </div>

        {/* ================= WORKSPACE ================= */}
        <div className="relative shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:rounded-none">

          {viewMode === 'editor' && (
            <div className="print:hidden">
              <div className="bg-[#E0F2FE] p-6 md:p-10 rounded-2xl border border-blue-200">
                <label className="text-sm font-bold text-blue-900/60 uppercase tracking-widest mb-4 block flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> พื้นที่แก้ไขข้อความ
                </label>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  className="w-full min-h-[60vh] bg-transparent text-[#1E1E78] text-lg md:text-xl font-medium leading-loose outline-none resize-y custom-scrollbar"
                  placeholder="พิมพ์คำกล่าวถวายพระพรที่นี่..."
                />
              </div>
            </div>
          )}

          {/* 2. โหมดประธานอ่าน (Pro Teleprompter Mode) */}
          {viewMode === 'live' && (
            <div className="print:hidden relative border-4 border-gray-800 rounded-2xl bg-black overflow-hidden" style={{ height: '65vh' }}>

              {/* ========================================================= */}
              {/* 1. FOCUS BAND OVERLAY (ขยายแถบไฮไลต์ และล็อคตำแหน่ง) */}
              {/* ========================================================= */}
              {/* เงามืดด้านบน (25%) */}
              <div className="absolute pointer-events-none z-30" style={{ top: 0, left: 0, right: 0, height: '10%', backgroundColor: 'rgba(0,0,0,0.5)' }}></div>

              {/* แถบไฮไลต์ตรงกลาง (ขยายเป็น 50%) */}
              <div className="absolute pointer-events-none z-30 flex items-center" style={{ top: '15%', left: 0, right: 0, height: '25%', borderTop: '2px solid rgba(255,255,255,0.2)', borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                <div className="absolute left-4 w-0 h-0 border-t-8 border-t-transparent border-l-[16px] border-l-red-500 border-b-8 border-b-transparent animate-pulse"></div>
                <div className="absolute right-4 w-0 h-0 border-t-8 border-t-transparent border-r-[16px] border-r-red-500 border-b-8 border-b-transparent animate-pulse"></div>
              </div>

              {/* เงามืดด้านล่าง (25%) */}
              <div className="absolute pointer-events-none z-30" style={{ top: '55%', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}></div>


              {/* ========================================================= */}
              {/* 2. SCROLLING CONTENT (พื้นที่ตัวอักษรวิ่ง) */}
              {/* ========================================================= */}
              <div
                ref={prompterRef}
                className="w-full h-full overflow-y-auto no-scrollbar relative z-20"
                style={{ backgroundColor: currentBg, scrollBehavior: 'auto' }}
              >
                <div className="relative px-12 md:px-24">

                  {/* ระยะดันบรรทัดแรก: ความสูงจอ 65vh * เงามืดบน 25% = 16.25vh */}
                  <div style={{ height: '8.5vh' }}></div>

                  <div
                    className="whitespace-pre-wrap font-bold text-center leading-[2] drop-shadow-lg"
                    style={{ color: currentText, fontSize: `${fontSizePx}px`, fontFamily: '"Sarabun", "Th Sarabun New", sans-serif' }}
                  >
                    {speechText}
                  </div>

                  {/* ระยะเผื่อด้านล่างตอนจบสคริปต์ */}
                  <div style={{ height: '60vh' }}></div>
                </div>
              </div>

            </div>
          )}

          {/* ================= PRINT LAYOUT ================= */}
          <div className="hidden print:block bg-white text-black font-serif">
            <div className="max-w-[210mm] mx-auto pt-[20mm] pb-[20mm] px-[25mm]">
              <div className="whitespace-pre-wrap font-bold leading-[2] text-justify" style={{ fontSize: '18pt', fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif' }}>
                {speechText}
              </div>
            </div>
          </div>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{
        __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}