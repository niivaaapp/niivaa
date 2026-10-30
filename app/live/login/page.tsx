'use client';
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, X, Star } from 'lucide-react';

// 🌟 นำเข้าฟังก์ชันจาก Server Action (เดี๋ยวเราจะสร้างไฟล์นี้ในข้อ 2)
import { verifyStaffPasscode } from '@/app/actions/authActions';

function StaffLoginGateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ฟังค์ชันตรวจเช็ค PIN และแยกเส้นทาง (Routing)
  const handleSubmitPin = async (finalPin: string) => {
    if (!eventId || isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      // 🌟 ย้ายไปตรวจรหัส PIN ที่ฝั่ง Server (ปลอดภัย 100%)
      const result = await verifyStaffPasscode(eventId, finalPin);

      if (!result.success || !result.token) {
        setError(result.error || 'รหัส PIN ไม่ถูกต้อง หรือถูกระงับสิทธิ์');
        setPin(''); // ล้าง PIN
        setIsLoading(false);
        return;
      }

      // 🌟 บันทึก TOKEN สำหรับ RouteGuard (นี่คือหัวใจความปลอดภัย)
      localStorage.setItem('niivaa_staff_token', result.token);
      
      // เก็บแค่ชื่อและตำแหน่งไว้แสดงผลบนหน้าจอให้สวยงาม (ไม่ต้องใช้เช็คสิทธิ์แล้ว)
      if (result.role) localStorage.setItem('niivaa_event_role', result.role);
      if (result.name) localStorage.setItem('niivaa_event_name', result.name);

      // 🌟 แยกเส้นทางตาม Role
      switch (result.role) {
        case 'admin':
          router.replace(`/events/event-dashboard/${eventId}`);
          break;
        case 'mc':
          router.replace(`/officialeventdashboard/mc-script?event_id=${eventId}`);
          break;
        case 'controller':
          router.replace(`/officialeventdashboard?event_id=${eventId}`);
          break;
        case 'registration':
          router.replace(`/eventdashboard/attendees?event_id=${eventId}`);
          break;
        default:
          setError('ตำแหน่งของคุณยังไม่ได้รับอนุญาตให้เข้าหน้าควบคุม');
          setIsLoading(false);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
      setIsLoading(false);
    }
  };

  // จัดการการพิมพ์ PIN
  const handleKeyClick = (key: string) => {
    if (pin.length < 6) { // ตั้งค่าให้ PIN ยาวไม่เกิน 6 หลัก
      const newPin = pin + key;
      setPin(newPin);
      if (newPin.length >= 4) { // ถ้าพิมพ์ครบ 4 หลักแล้ว ให้ลองส่งข้อมูลเลย
        handleSubmitPin(newPin);
      }
    }
  };

  if (!eventId) return <div className="min-h-screen bg-black flex items-center justify-center text-red-400">Error: ไม่พบรหัสงานอีเวนต์</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* พื้นหลังละอองดาว + แสงสีฟ้าจางๆ */}
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-screen pointer-events-none"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-sm flex flex-col items-center z-10 animate-in zoom-in-95 duration-500">
        
        {/* โลโก้ NiiVaa */}
        <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-10 mb-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x50?text=NiiVaa+SmartMedia'; }} />

        {/* กล่องใส่ PIN */}
        <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-8 w-full shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-950 rounded-full flex items-center justify-center border border-blue-800/50 mb-4 shadow-inner">
            <KeyRound className="text-cyan-400 w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">กรุณาใส่รหัส PIN</h2>
          <p className="text-xs text-zinc-500 mt-1 mb-6">กรอกรหัสประจำตัว Staff ของงานนี้</p>
          
          {/* ช่องแสดงดาว (*) ตามจำนวนที่พิมพ์ */}
          <div className="flex gap-4 mb-3 h-12 items-center">
            {isLoading ? (
              <Loader2 className="animate-spin text-cyan-400 w-8 h-8" />
            ) : pin.length === 0 ? (
               <p className="text-3xl font-black text-zinc-700 tracking-wider">_ _ _ _</p>
            ) : (
              <div className="flex gap-3">
                {Array.from({ length: pin.length }).map((_, i) => (
                  <Star key={i} className="text-cyan-400 w-8 h-8 fill-cyan-400 animate-in zoom-in duration-300" />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs text-center border border-red-900 bg-red-950 p-2 rounded-lg mb-4 animate-in fade-in">{error}</p>}
          
          {/* Numeric Keypad (สำหรับจิ้มง่ายๆ บน iPad) */}
          <div className="grid grid-cols-3 gap-3 w-full mt-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'Clear', 0, 'Go'].map((key) => {
              if (key === 'Clear') {
                return <button key={key} onClick={() => setPin('')} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl h-16 font-bold flex items-center justify-center active:scale-95 transition-all"><X size={24} /></button>
              }
              if (key === 'Go') {
                return <button key={key} onClick={() => handleSubmitPin(pin)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl h-16 font-black text-xl flex items-center justify-center active:scale-95 transition-all">Go</button>
              }
              return (
                <button 
                  key={key} 
                  onClick={() => handleKeyClick(String(key))}
                  className="bg-zinc-950 border-2 border-zinc-800 hover:border-blue-800 rounded-2xl h-16 font-black text-3xl text-white flex items-center justify-center active:scale-95 transition-all focus:ring-4 ring-cyan-500/30 outline-none"
                >
                  {key}
                </button>
              )
            })}
          </div>
        </div>
        
        <p className="text-zinc-700 text-[10px] mt-10 uppercase tracking-widest">Powered by NiiVaa SmartMedia</p>
      </div>
    </div>
  );
}

export default function StaffLoginGate() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-cyan-400">Loading...</div>}>
      <StaffLoginGateContent />
    </Suspense>
  );
}