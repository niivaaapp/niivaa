"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Printer, FileText, Plus, Trash2, 
  Save, CheckCircle, GripVertical, Calendar, MapPin, Sun
} from 'lucide-react';

// --- Types ---
interface ScheduleItem {
  id: string;
  time: string;
  description: string;
  isHighlight?: boolean;
}

// --- Default Schedule Data (มาตรฐานพิธีทำบุญตักบาตรภาคเช้า) ---
const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { id: '1', time: '06.30 น.', description: 'ข้าราชการ ศาล ทหาร ตำรวจ องค์กรปกครองส่วนท้องถิ่น พนักงานรัฐวิสาหกิจ ภาคเอกชน และประชาชน ลงทะเบียน ณ จุดลงทะเบียน' },
  { id: '2', time: '07.00 น.', description: 'พระสงฆ์ (จำนวน ๗๓ รูป) เดินทางมาถึงบริเวณพิธี และขึ้นนั่งอาสน์สงฆ์' },
  { id: '3', time: '07.30 น.', description: 'ประธานในพิธี (ผู้ว่าราชการจังหวัดสุรินทร์) เดินทางมาถึงบริเวณพิธี (วงดุริยางค์บรรเลงเพลงมหาฤกษ์)', isHighlight: true },
  { id: '4', time: '07.35 น.', description: 'ประธานในพิธี จุดธูปเทียนบูชาพระรัตนตรัย และจุดธูปเทียนเครื่องทองน้อยหน้าพระบรมฉายาลักษณ์' },
  { id: '5', time: '07.40 น.', description: 'เจ้าหน้าที่ปฏิบัติพิธีสงฆ์อาราธนาศีล / พระสงฆ์ให้ศีล' },
  { id: '6', time: '07.45 น.', description: 'เจ้าหน้าที่ปฏิบัติพิธีสงฆ์อาราธนาพระปริตร / พระสงฆ์เจริญพระพุทธมนต์' },
  { id: '7', time: '08.15 น.', description: 'ประธานในพิธี พร้อมด้วยหัวหน้าส่วนราชการ ถวายเครื่องไทยธรรมแด่พระสงฆ์ / พระสงฆ์อนุโมทนา / ประธานกรวดน้ำ' },
  { id: '8', time: '08.30 น.', description: 'ประธานในพิธี นำข้าราชการและประชาชน ร่วมพิธีทำบุญตักบาตรพระสงฆ์ (จำนวน ๗๓ รูป) ณ บริเวณลานพิธี เป็นอันเสร็จพิธีภาคเช้า', isHighlight: true },
];

export default function MorningSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>(DEFAULT_SCHEDULE);
  const [eventDate, setEventDate] = useState('วันพุธที่ ๒๘ กรกฎาคม ๒๕๖๙');
  const [eventLocation, setEventLocation] = useState('ณ ลานหน้าศาลากลางจังหวัดสุรินทร์');
  const [isSaved, setIsSaved] = useState(false);

  // --- Handlers ---
  const handlePrint = () => window.print();

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleUpdateItem = (id: string, field: 'time' | 'description', value: string) => {
    setSchedule(schedule.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const toggleHighlight = (id: string) => {
    setSchedule(schedule.map(item => item.id === id ? { ...item, isHighlight: !item.isHighlight } : item));
  };

  const handleDeleteItem = (id: string) => {
    if(confirm('ต้องการลบกำหนดการนี้หรือไม่?')) {
      setSchedule(schedule.filter(item => item.id !== id));
    }
  };

  const handleAddItem = () => {
    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      time: 'xx.xx น.',
      description: 'รายละเอียดกำหนดการใหม่...'
    };
    setSchedule([...schedule, newItem]);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newSchedule = [...schedule];
      [newSchedule[index - 1], newSchedule[index]] = [newSchedule[index], newSchedule[index - 1]];
      setSchedule(newSchedule);
    } else if (direction === 'down' && index < schedule.length - 1) {
      const newSchedule = [...schedule];
      [newSchedule[index + 1], newSchedule[index]] = [newSchedule[index], newSchedule[index + 1]];
      setSchedule(newSchedule);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans print:bg-white print:text-black">
      
      {/* ================= HEADER ================= */}
      <header className="bg-gray-900 border-b border-orange-900/50 sticky top-0 z-50 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-orange-400 rounded-lg transition-colors border border-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-gray-800 mx-2"></div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sun className="w-6 h-6 text-orange-500" /> จัดทำกำหนดการภาคเช้า
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleSave} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              {isSaved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaved ? 'บันทึกแล้ว' : 'บันทึกร่าง'}
            </button>
            <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-gray-200 hover:bg-white text-gray-900 rounded-xl text-sm font-bold transition-all shadow-md">
              <Printer className="w-4 h-4 mr-2" /> พิมพ์ (PDF)
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 print:p-0 print:m-0 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* === ซ้าย: แผงควบคุมและแก้ไข (EDITOR) === */}
        <div className="lg:col-span-6 space-y-6 print:hidden">
          
          {/* ข้อมูลหัวกระดาษ */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2" /> ข้อมูลส่วนหัวกำหนดการ
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> วันที่จัดงาน</label>
                <input 
                  type="text" 
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> สถานที่จัดงาน</label>
                <input 
                  type="text" 
                  value={eventLocation} 
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:border-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* รายการกำหนดการ (Timeline Editor) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
              <h3 className="text-sm font-bold text-orange-400 uppercase tracking-widest flex items-center">
                <Sun className="w-4 h-4 mr-2" /> ลำดับพิธีการ (Timeline)
              </h3>
              <button onClick={handleAddItem} className="bg-orange-950/50 hover:bg-orange-900 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-800 flex items-center transition-colors">
                <Plus className="w-3 h-3 mr-1" /> เพิ่มคิวใหม่
              </button>
            </div>

            <div className="space-y-3">
              {schedule.map((item, index) => (
                <div key={item.id} className={`flex gap-3 items-start p-3 rounded-xl border transition-all ${item.isHighlight ? 'bg-orange-950/20 border-orange-800/50' : 'bg-black border-gray-800'}`}>
                  
                  {/* ปุ่มเลื่อนคิว */}
                  <div className="flex flex-col gap-1 pt-1">
                    <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="text-gray-600 hover:text-white disabled:opacity-30"><GripVertical className="w-4 h-4 rotate-90" /></button>
                  </div>

                  {/* เวลา */}
                  <div className="w-24 shrink-0">
                    <input 
                      type="text" 
                      value={item.time} 
                      onChange={(e) => handleUpdateItem(item.id, 'time', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-xs text-white font-bold text-center focus:border-orange-500 outline-none"
                    />
                  </div>

                  {/* รายละเอียด */}
                  <div className="flex-1">
                    <textarea 
                      rows={2}
                      value={item.description} 
                      onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                      className={`w-full bg-gray-900 border rounded px-3 py-1.5 text-sm outline-none resize-none custom-scrollbar 
                        ${item.isHighlight ? 'text-orange-300 border-orange-800 focus:border-orange-400' : 'text-gray-300 border-gray-700 focus:border-gray-400'}`}
                    />
                  </div>

                  {/* Tools */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => toggleHighlight(item.id)} className={`p-1.5 rounded-lg transition-colors ${item.isHighlight ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`} title="เน้นข้อความ (ประธาน)">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 bg-gray-800 text-gray-400 hover:bg-red-900/50 hover:text-red-500 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === ขวา: กระดาษพรีวิว และ หน้าพิมพ์ (LIVE PREVIEW & PRINT) === */}
        <div className="lg:col-span-6">
          <div className="sticky top-28 bg-white text-black shadow-2xl print:shadow-none mx-auto" style={{ width: '100%', maxWidth: '210mm', minHeight: '297mm' }}>
            
            <div className="px-[25mm] py-[25mm] font-serif" style={{ fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif' }}>
              
              {/* ตราครุฑ (จำลอง) */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300 print:border-black">
                  <span className="text-[10px] text-gray-500 print:text-black">ตราครุฑ</span>
                </div>
              </div>

              {/* หัวข้อ */}
              <div className="text-center font-bold mb-8 space-y-1" style={{ fontSize: '18pt' }}>
                <p>กำหนดการ</p>
                <p>พิธีเจริญพระพุทธมนต์และทำบุญตักบาตรถวายพระราชกุศล</p>
                <p>{eventDate}</p>
                <p>{eventLocation}</p>
                <p className="border-b border-black pb-4 w-32 mx-auto"></p>
              </div>

              {/* ลำดับเวลา */}
              <div className="space-y-4" style={{ fontSize: '16pt', lineHeight: '1.4' }}>
                {schedule.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-start">
                    <div className="w-20 shrink-0 font-bold whitespace-nowrap">
                      เวลา {item.time}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <span className="shrink-0">-</span>
                      <span className={item.isHighlight ? 'font-bold' : ''}>
                        {item.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* หมายเหตุ */}
              <div className="mt-12 pt-6 border-t border-gray-300" style={{ fontSize: '14pt' }}>
                <p className="font-bold underline mb-1">การแต่งกาย:</p>
                <ul className="list-none space-y-1">
                  <li>- ประธานในพิธี: เครื่องแบบปกติขาว</li>
                  <li>- ข้าราชการ/พนักงานรัฐวิสาหกิจ: เครื่องแบบปกติขาว</li>
                  <li>- ประชาชนทั่วไป: ชุดสุภาพโทนสีที่เหมาะสมกับงานพิธี</li>
                  <li><span className="font-bold">*หมายเหตุ:</span> ควรสวมหน้ากากอนามัยสีขาว หรือสีอ่อน</li>
                </ul>
              </div>

            </div>
          </div>
        </div>

      </main>
      
      {/* ซ่อน Scrollbar สำหรับ Textarea */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}} />
    </div>
  );
}