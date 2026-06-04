"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search,CheckCircle2,QrCode, PlusCircle, MessageSquare, ScrollText, Radio, Users, Loader2, X, Save, Send, ImagePlus, Gift, Filter } from 'lucide-react';

interface Attendee {
  id: string;
  prefix: string;
  fullname: string;
  position: string;
  organization: string;
  contact_info?: string;
  phone?: string;
  attendee_type: string;
  created_at: string;
  // ฟิลด์ใหม่ที่เพิ่มเข้ามา
  bio_note?: string;
  role_in_event?: string;
  gift_number?: string;
  gift_style?: string;
  status?: string;
  special_act1?: string;
  special_act2?: string;
}

// 1. แยกเนื้อหาหลักออกมาเป็น Component ย่อย
function AttendeesReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [time, setTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data States
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 🎛️ Toggle States
  const [showGift, setShowGift] = useState(false);
  const [filterMode, setFilterMode] = useState<number>(0); // 0:VIP, 1:Staff, 2:Act1, 3:Act2
  const filterLabels = [
    { id: 'VIP', label: '🌟 กรอง: เฉพาะ VIP' },
    { id: 'Staff', label: '🎧 กรอง: เฉพาะ Staff' },
    { id: 'Act1', label: '🎭 กรอง: Special Act 1' },
    { id: 'Act2', label: '🎬 กรอง: Special Act 2' }
  ];

  // 🎛️ Modal States (ระบบควบคุมการเปิด-ปิดหน้าต่าง Pop-up)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  // 📝 Form States สำหรับเพิ่มรายชื่อใหม่
  const [formData, setFormData] = useState({
    prefix: '', fullname: '', position: '', organization: '', contact_info: '', attendee_type: 'VIP', priority_level: 50
  });

  // 💬 Form States สำหรับส่ง SMS ด่วน
  const [smsData, setSmsData] = useState({ message: '', imageUrl: '' });

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Data
  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error("Fetch Error:", error);
      else if (data) {
        setAttendees(data);
        // การตั้งค่าเริ่มต้นตอนโหลดเสร็จ จะถูกจัดการใน useEffect ของ Search Logic
      }
    } catch (err) { console.error("System Error:", err); }
    setLoading(false);
  };

  useEffect(() => { fetchAttendees(); }, []);

  // 🔍 Search & Filter Logic (รวม 2 เงื่อนไขเข้าด้วยกัน)
  useEffect(() => {
    let result = attendees;

    // 1. กรองตามหมวดหมู่ (Toggle 2)
    if (filterMode === 0) {
      result = result.filter(a => a.attendee_type?.toUpperCase() === 'VIP');
    } else if (filterMode === 1) {
      result = result.filter(a => a.attendee_type?.toUpperCase() === 'STAFF' || a.attendee_type === 'Staff');
    } else if (filterMode === 2) {
      result = result.filter(a => a.special_act1 && a.special_act1.trim() !== '');
    } else if (filterMode === 3) {
      result = result.filter(a => a.special_act2 && a.special_act2.trim() !== '');
    }

    // 2. กรองตามคำค้นหา (Search Box)
    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase().replace(/\s+/g, '');
      result = result.filter(a => {
        const combined = `${a.prefix || ''}${a.fullname || ''}${a.organization || ''}`.toLowerCase().replace(/\s+/g, '');
        return combined.includes(keyword);
      });
    }

    setFilteredAttendees(result);
    // อัปเดตคนที่ถูกเลือกให้สัมพันธ์กับรายการที่กรอง (ถ้ามีรายการ)
    if (result.length > 0 && !result.find(r => r.id === selectedAttendee?.id)) {
      setSelectedAttendee(result[0]);
    } else if (result.length === 0) {
      setSelectedAttendee(null);
    }
  }, [searchTerm, attendees, filterMode]);

  // ฟังก์ชันสลับกลุ่มกรอง
  const handleCycleFilter = () => setFilterMode(prev => (prev + 1) % 4);

  // 💾 ฟังก์ชันบันทึกรายชื่อใหม่ลงฐานข้อมูล
  const handleSaveNewAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullname) return alert("กรุณากรอกชื่อ-นามสกุล");

    try {
      const { error } = await supabase.from('event_attendees').insert([{
        event_id: eventId !== 'current' ? eventId : null,
        ...formData,
        status: 'arrived' // ให้คนที่เพิ่มหน้าโต๊ะมีสถานะเป็นมาถึงแล้วทันที
      }]);

      if (error) throw error;

      alert("✅ บันทึกรายชื่อใหม่สำเร็จ!");
      setShowAddModal(false);

      setFormData({
        prefix: '', fullname: '', position: '', organization: '', contact_info: '', attendee_type: 'VIP', priority_level: 50
      });

      fetchAttendees(); // รีเฟรชตาราง
    } catch (err: any) {
      alert("❌ บันทึกผิดพลาด: " + err.message);
    }
  };

  // 🚀 ฟังก์ชันส่ง SMS ฉุกเฉินไปหน้าจอพิธีกร/โปรเจกเตอร์
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

      alert("📡 ส่งข้อความด่วน (SMS) ไปยังระบบกลางสำเร็จแล้ว!");
      setShowSmsModal(false);
      setSmsData({ message: '', imageUrl: '' });
    } catch (err: any) {
      alert("❌ ส่งข้อความล้มเหลว: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1128] via-[#111a36] to-[#0a1128] text-white flex flex-col font-sans overflow-hidden relative">

      {/* 🌟 HEADER BAR */}
      <div className="bg-zinc-950/80 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-40 shadow-xl sticky top-0 shrink-0">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-lg md:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
            <Users size={22} className="text-cyan-400" /> ตรวจสอบรายชื่อแขกผู้มีเกียรติ คณะทำงาน และผู้ร่วมงาน
          </h1>
          <p className="text-[10px] md:text-xs text-zinc-400 mt-0.5 font-medium">ฝ่ายบันทึกข้อมูล: ทวนสอบความถูกต้องและแก้ไขข้อมูลบุคคล</p>
        </div>

        <div className="flex items-center gap-5 justify-end shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-xl font-mono font-black text-cyan-400 leading-none">{time.toLocaleTimeString('th-TH')}</div>
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
          </div>
          <div className="h-10 w-px bg-white/10 hidden md:block"></div>
          <div className="flex flex-col items-center md:items-end justify-center text-right">
            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 object-contain" />
            <span className="text-[8px] text-cyan-400 font-black tracking-widest mt-1 uppercase">ระบบบริหารการจัดงานดิจิทัลอัจฉริยะ</span>
          </div>
        </div>
      </div>

      {/* 🗂️ MAIN CONTENT AREA */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-4">

        {/* ⬅️ คอลัมน์ซ้าย: กล่องพรีวิวข้อมูล & เครื่องมือด่วน */}
        <div className="w-full md:w-1/3 flex flex-col gap-4 shrink-0">

          {/* 🎛️ ปุ่ม Toggle เครื่องมือพิเศษ */}
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
              🔍 ข้อมูลบุคคลเชิงลึก (คลิกที่ตารางเพื่อดู)
            </h2>

            {selectedAttendee ? (
              <div className="flex flex-col gap-2 z-10 overflow-y-auto custom-scrollbar pr-2">
                <div className="text-sm">
                  <span className="text-zinc-400 mr-2">ลำดับที่:</span>
                  <span className="font-mono text-white font-bold bg-white/10 px-2 py-0.5 rounded">{selectedAttendee.id.substring(0, 8)}...</span>
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
                
                {/* ข้อมูลที่เพิ่มใหม่ */}
                <div className="text-sm flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">บทบาท:</span>
                  <span className="text-blue-400 font-bold">{selectedAttendee.role_in_event || '-'}</span>
                </div>
                <div className="text-sm flex items-start gap-2">
                  <span className="text-zinc-400 w-16 shrink-0 mt-0.5">ประวัติ:</span>
                  <span className="text-emerald-400 font-bold whitespace-pre-wrap">{selectedAttendee.bio_note || '-'}</span>
                </div>

                {/* กล่องแสดงของที่ระลึก (Toggle 1) */}
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
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 font-bold text-sm">
                -- กรุณาเลือกรายชื่อจากตาราง --
              </div>
            )}
          </div>

          {/* แผงเครื่องมือและปุ่มนำทาง */}
          <div className="bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex-1 flex flex-col gap-3">

            {/* 🌟 โซนปุ่ม Modal ควบคุมด่วน */}
            <div className="flex gap-2 mb-2">
              <button onClick={() => setShowAddModal(true)} className="flex-1 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 py-3 transition-all shadow-lg border border-emerald-400/50 text-xs shadow-emerald-900/50">
                <PlusCircle size={16} /> ลงทะเบียนรายชื่อใหม่
              </button>
              <button onClick={() => setShowQrModal(true)} className="w-14 bg-white hover:bg-zinc-200 text-black rounded-xl flex items-center justify-center transition-all shadow-lg">
                <QrCode size={20} />
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

        {/* ➡️ คอลัมน์ขวา: ตารางรายชื่อ (Data Table - ปรับให้เลื่อนแนวนอน และล็อกหัวตารางได้) */}
        <div className="w-full md:w-2/3 bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">

          <div className="p-4 md:p-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900/30 shrink-0">
            <div className="flex items-center bg-black/50 border border-white/10 rounded-xl px-3 py-2 w-full sm:w-72 focus-within:border-cyan-500 transition-colors">
              <Search className="text-zinc-500 mr-2 shrink-0" size={16} />
              <input
                type="text" placeholder="ค้นหาชื่อ, หน่วยงาน..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-white text-sm outline-none w-full placeholder:text-zinc-600"
              />
            </div>

            <div className="flex items-center gap-2 bg-cyan-950/30 border border-cyan-500/30 px-4 py-2 rounded-xl shrink-0">
              <Users size={16} className="text-cyan-400" />
              <span className="text-xs font-bold text-zinc-300">จำนวนในกลุ่มนี้:</span>
              <span className="text-lg font-black text-cyan-400 leading-none">{filteredAttendees.length}</span>
              <span className="text-xs font-bold text-zinc-500">ท่าน</span>
            </div>
          </div>

          {/* 🎯 ส่วนคอนเทนเนอร์หลักที่ควบคุม Scroll 2 แกน */}
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-cyan-500 bg-zinc-950/50 z-20"><Loader2 className="animate-spin mr-2" size={24} /> กำลังโหลดข้อมูล...</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm min-w-max">
                <thead className="sticky top-0 bg-zinc-900/95 backdrop-blur-md z-10 shadow-md text-xs font-black text-zinc-400 uppercase tracking-wider">
                  <tr>
                    {/* หัวตารางมีการเพิ่ม whitespace-nowrap เพื่อไม่ให้ข้อความตกบรรทัด และดันตารางให้กว้างขึ้น */}
                    <th className="p-4 w-16 text-center border-b border-white/10">ลำดับ</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10">คำนำหน้า</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10">ชื่อ - นามสกุล</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10">ตำแหน่ง</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10">หน่วยงาน</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10">บทบาทในงาน</th>
                    <th className="p-4 min-w-[200px] border-b border-white/10">เกียรติประวัติ (Bio Note)</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10 text-center">Gift No.</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10 text-center">Gift Style</th>
                    <th className="p-4 whitespace-nowrap border-b border-white/10 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttendees.length > 0 ? (
                    filteredAttendees.map((att, index) => (
                      <tr key={att.id} onClick={() => setSelectedAttendee(att)} className={`cursor-pointer transition-colors group ${selectedAttendee?.id === att.id ? 'bg-cyan-900/20 border-l-2 border-cyan-400' : 'hover:bg-white/5 border-l-2 border-transparent'}`}>
                        <td className="p-4 text-center font-mono text-zinc-500 whitespace-nowrap">{index + 1}</td>
                        <td className="p-4 text-zinc-400 whitespace-nowrap">{att.prefix || '-'}</td>
                        <td className={`p-4 font-bold whitespace-nowrap ${selectedAttendee?.id === att.id ? 'text-cyan-400' : 'text-zinc-200 group-hover:text-white'}`}>{att.fullname}</td>
                        <td className="p-4 text-amber-200/70 whitespace-nowrap">{att.position || '-'}</td>
                        <td className="p-4 text-purple-300/70 whitespace-nowrap">{att.organization || '-'}</td>
                        
                        {/* ข้อมูลใหม่ในตาราง */}
                        <td className="p-4 text-blue-300/80 whitespace-nowrap">{att.role_in_event || '-'}</td>
                        <td className="p-4 text-emerald-200/70 text-xs">
                          <div className="line-clamp-2 max-w-sm" title={att.bio_note}>{att.bio_note || '-'}</div>
                        </td>
                        <td className="p-4 text-center text-yellow-400 font-mono font-bold whitespace-nowrap">{att.gift_number || '-'}</td>
                        <td className="p-4 text-center text-pink-300/70 whitespace-nowrap">{att.gift_style || '-'}</td>
                        
                        <td className="p-4 text-center whitespace-nowrap">
                          {att.status === 'arrived' ? (
                            <span className="bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 w-fit mx-auto">
                              <CheckCircle2 size={12} /> มาถึงแล้ว
                            </span>
                          ) : (
                            <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit mx-auto block">
                              {att.status || 'รอยืนยัน'}
                            </span>
                          )}
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
          📦 MODAL 1: ฟอร์มเพิ่มรายชื่อใหม่ (Entry Form)
          ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="font-black text-xl text-white flex items-center gap-2"><PlusCircle className="text-emerald-400" /> ลงทะเบียนรายชื่อผู้ร่วมงานใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-zinc-900 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveNewAttendee} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">คำนำหน้า (Prefix)</label>
                  <input type="text" value={formData.prefix} onChange={e => setFormData({ ...formData, prefix: e.target.value })} placeholder="เช่น นาย, นาง, ดร." className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-zinc-400">ชื่อ - นามสกุล <span className="text-red-400">*</span></label>
                  <input type="text" required value={formData.fullname} onChange={e => setFormData({ ...formData, fullname: e.target.value })} placeholder="ชื่อและนามสกุลจริง" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">ตำแหน่ง (Position)</label>
                  <input type="text" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} placeholder="ตำแหน่งงาน" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">หน่วยงาน/สังกัด (Organization)</label>
                  <input type="text" value={formData.organization} onChange={e => setFormData({ ...formData, organization: e.target.value })} placeholder="ชื่อหน่วยงาน" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">เบอร์โทรศัพท์ (Phone)</label>
                  <input type="text" value={formData.contact_info} onChange={e => setFormData({ ...formData, contact_info: e.target.value })} placeholder="08X-XXX-XXXX" className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">ประเภทบุคคล (Type)</label>
                  <select value={formData.attendee_type} onChange={e => setFormData({ ...formData, attendee_type: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none">
                    <option value="VIP">VIP (แขกผู้มีเกียรติ)</option>
                    <option value="Speaker">Speaker (วิทยากร)</option>
                    <option value="Staff">Staff (คณะทำงาน)</option>
                    <option value="General">General (ผู้เข้าร่วมทั่วไป)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400">ระดับความสำคัญ (1=สูงสุด)</label>
                  <input type="number" value={formData.priority_level} onChange={e => setFormData({ ...formData, priority_level: parseInt(e.target.value) || 50 })} className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none font-mono text-center" />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-900/30">
                  <Save size={18} /> บันทึกและเช็คอินเข้างานทันที
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          📦 MODAL 2: สแกน QR Code เพื่อลงทะเบียนด้วยตัวเอง
          ======================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl flex flex-col items-center text-center relative">
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors"><X size={20} /></button>
            <h3 className="font-black text-2xl text-zinc-900 mb-1">จุดลงทะเบียนออนไลน์</h3>
            <p className="text-xs text-zinc-500 font-bold mb-6">สแกน QR Code เพื่อกรอกข้อมูลเข้างานด้วยโทรศัพท์ของท่าน</p>

            <div className="p-4 border-4 border-dashed border-zinc-200 rounded-3xl mb-6 bg-white">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://niivaa.com/register')}`} alt="Register QR Code" className="w-48 h-48 mix-blend-multiply" />
            </div>

            <p className="text-xs font-mono font-bold text-zinc-400 bg-zinc-100 px-4 py-2 rounded-lg w-full truncate">🔗 https://niivaa.com/register</p>
          </div>
        </div>
      )}

      {/* ========================================================
          📦 MODAL 3: ส่ง SMS และรูปภาพฉุกเฉิน
          ======================================================== */}
      {showSmsModal && (
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
                <p className="text-[9px] text-zinc-500">หากต้องการขึ้นสไลด์ภาพด่วน ให้วางลิงก์รูปภาพในช่องนี้</p>
              </div>

              <button type="submit" className="mt-2 w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-900/50">
                <Send size={18} /> สั่งยิงข้อความขึ้นจอระบบกลาง
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// 2. Component หลักที่ห่อหุ้มด้วย Suspense เพื่อแก้บั๊กตอน Build
export default function AttendeesReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a1128] flex items-center justify-center text-cyan-400 font-mono">Loading Attendees Page...</div>}>
      <AttendeesReportContent />
    </Suspense>
  );
}