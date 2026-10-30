'use client';
import RouteGuard from '@/components/RouteGuard';
import React, { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
// 🌟 นำเข้าไอคอน Eye และ EyeOff
import { Users, UserPlus, Trash2, ShieldCheck, KeyRound, Copy, CheckCircle2, Power, LayoutGrid, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';

function StaffManagementContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  
  // 🌟 State สำหรับเก็บ ID ของคนที่เรากด "เปิดตา" ดูรหัส PIN
  const [visiblePins, setVisiblePins] = useState<string[]>([]);

  // Form State
  const [form, setForm] = useState({ display_name: '', event_role: 'mc', passcode: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = async () => {
    if (!eventId) return;
    const { data } = await supabase.from('event_staff').select('*').eq('event_id', eventId).order('created_at', { ascending: true });
    if (data) setStaffList(data);
  };

  useEffect(() => {
    fetchStaff();
  }, [eventId]);

  // สุ่มรหัส PIN 4 หลัก
  const generatePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setForm(prev => ({ ...prev, passcode: randomPin }));
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setIsSubmitting(true);
    try {
      const { data: existing } = await supabase.from('event_staff').select('id').eq('event_id', eventId).eq('passcode', form.passcode).single();
      if (existing) {
        alert('รหัส PIN นี้มีคนใช้แล้ว กรุณาเปลี่ยนใหม่ครับ');
        setIsSubmitting(false);
        return;
      }

      await supabase.from('event_staff').insert([{
        event_id: eventId,
        display_name: form.display_name,
        event_role: form.event_role,
        passcode: form.passcode
      }]);
      
      setIsModalOpen(false);
      setForm({ display_name: '', event_role: 'mc', passcode: '' });
      fetchStaff();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('event_staff').update({ is_active: !currentStatus }).eq('id', id);
    fetchStaff();
  };

  const deleteStaff = async (id: string, name: string) => {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบสิทธิ์ของ "${name}" อย่างถาวร?`)) {
      await supabase.from('event_staff').delete().eq('id', id);
      fetchStaff();
    }
  };

  const copyToClipboard = (pin: string) => {
    // ถึงแม้จะถูกซ่อนไว้ แต่เวลากด Copy ก็จะได้รหัสจริงไปใช้งานครับ
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  // 🌟 ฟังก์ชัน: กดปุ่มเพื่อเปิด/ปิดตารายบุคคล
  const toggleSinglePinVisibility = (id: string) => {
    setVisiblePins(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  // 🌟 ฟังก์ชัน: เปิด/ปิดตาทุกคนพร้อมกัน (Global Toggle)
  const isAllVisible = staffList.length > 0 && visiblePins.length === staffList.length;
  const toggleAllPins = () => {
    if (isAllVisible) {
      setVisiblePins([]); // ซ่อนทั้งหมด
    } else {
      setVisiblePins(staffList.map(s => s.id)); // แสดงทั้งหมด
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return { label: 'ผู้จัดการงาน (Admin)', color: 'bg-purple-900/50 text-purple-400 border-purple-500/50' };
      case 'controller': return { label: 'ควบคุมสื่อ (Controller)', color: 'bg-blue-900/50 text-blue-400 border-blue-500/50' };
      case 'mc': return { label: 'พิธีกร (MC)', color: 'bg-cyan-900/50 text-cyan-400 border-cyan-500/50' };
      case 'registration': return { label: 'จุดลงทะเบียน', color: 'bg-emerald-900/50 text-emerald-400 border-emerald-500/50' };
      default: return { label: role, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  if (!eventId) return <div className="min-h-screen bg-black text-white flex items-center justify-center">ไม่พบรหัสงานอีเวนต์</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex gap-2 mb-6">
          <Link href={`/events/event-dashboard/${eventId}`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm">
            <LayoutGrid size={16} /> หน้าศูนย์กลาง (Dashboard)
          </Link>
          <Link href={`/eventdashboard/showtime/controller?event_id=${eventId}`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm">
            <SlidersHorizontal size={16} /> แผงควบคุม (Controller)
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-xl mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-950 rounded-2xl flex items-center justify-center border border-blue-800/50">
              <ShieldCheck className="text-cyan-400 w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-cyan-400 tracking-wider">จัดการสิทธิ์ทีมงาน (Staff Management)</h1>
              <p className="text-zinc-500 font-bold mt-1">กำหนดบทบาทและสร้างรหัส PIN เข้างานสำหรับทีมงาน</p>
            </div>
          </div>
          <div className="flex gap-3">
            {/* 🌟 ปุ่ม Global Toggle (เปิด/ปิดตาทุกคน) */}
            <button 
              onClick={toggleAllPins}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
              title={isAllVisible ? 'ซ่อนรหัสทั้งหมด' : 'แสดงรหัสทั้งหมด'}
            >
              {isAllVisible ? <EyeOff size={20} /> : <Eye size={20} />} 
              <span className="hidden sm:inline">{isAllVisible ? 'ซ่อน PIN ทั้งหมด' : 'แสดง PIN ทั้งหมด'}</span>
            </button>
            <button 
              onClick={() => { generatePin(); setIsModalOpen(true); }}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <UserPlus size={20} /> เพิ่มทีมงาน
            </button>
          </div>
        </div>

        {/* Staff List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map(staff => {
            const roleInfo = getRoleName(staff.event_role);
            const isPinVisible = visiblePins.includes(staff.id); // 🌟 เช็คว่าตานี้เปิดอยู่ไหม

            return (
              <div key={staff.id} className={`bg-zinc-900 border-2 rounded-2xl p-5 transition-all ${staff.is_active ? 'border-zinc-800' : 'border-red-900/50 opacity-60'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">{staff.display_name}</h2>
                    <span className={`inline-block px-3 py-1 mt-2 rounded-lg text-[10px] font-black tracking-widest uppercase border ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                  </div>
                  <button 
                    onClick={() => toggleStatus(staff.id, staff.is_active)}
                    title={staff.is_active ? 'ระงับสิทธิ์ชั่วคราว' : 'เปิดใช้งานสิทธิ์'}
                    className={`p-2 rounded-xl transition-colors ${staff.is_active ? 'bg-emerald-950 text-emerald-400 hover:bg-red-950 hover:text-red-400' : 'bg-red-950 text-red-400 hover:bg-emerald-950 hover:text-emerald-400'}`}
                  >
                    <Power size={18} />
                  </button>
                </div>
                
                <div className="bg-black border border-zinc-800 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-zinc-500" />
                    <span className="text-zinc-400 text-xs font-bold">PIN:</span>
                    {/* 🌟 แสดงรหัสจริง หรือ เครื่องหมายจุด ตามสถานะ */}
                    <span className="text-xl font-black text-white tracking-widest mt-1">
                      {isPinVisible ? staff.passcode : '•'.repeat(staff.passcode.length)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {/* 🌟 ปุ่มเปิด/ปิดตา รายบุคคล */}
                    <button onClick={() => toggleSinglePinVisibility(staff.id)} className="text-zinc-500 hover:text-cyan-400 p-1.5 bg-zinc-900 rounded-lg transition-colors">
                      {isPinVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    {/* ปุ่ม Copy */}
                    <button onClick={() => copyToClipboard(staff.passcode)} className="text-zinc-500 hover:text-cyan-400 p-1.5 bg-zinc-900 rounded-lg transition-colors" title="คัดลอกรหัส PIN">
                      {copiedPin === staff.passcode ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-end">
                  <button onClick={() => deleteStaff(staff.id, staff.display_name)} className="text-zinc-500 hover:text-red-400 flex items-center gap-1 text-xs font-bold transition-colors">
                    <Trash2 size={14} /> ลบออกจากงาน
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal เพิ่มทีมงาน (โค้ดเดิม) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-zinc-800 bg-zinc-950">
              <h2 className="text-xl font-black text-cyan-400">➕ เพิ่มทีมงานเข้าสู่ระบบ</h2>
            </div>
            
            <form onSubmit={handleAddStaff} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2">ชื่อทีมงาน / นามแฝง <span className="text-red-500">*</span></label>
                <input required type="text" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} placeholder="เช่น MC สมชาย" className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2">หน้าที่ความรับผิดชอบ (Role) <span className="text-red-500">*</span></label>
                <select value={form.event_role} onChange={e => setForm({...form, event_role: e.target.value})} className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500">
                  <option value="mc">🎙️ พิธีกร (MC) - คุมรูปภาพสไลด์</option>
                  <option value="controller">🎛️ ควบคุมเวที (Controller) - คุมสคริปต์/เกม/สื่อ</option>
                  <option value="admin">👑 ผู้จัดการงาน (Admin) - เข้าได้ทุกหน้า</option>
                  <option value="registration">📝 จุดลงทะเบียน (Registration)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2">รหัส PIN 4 หลัก (Login Passcode) <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input required type="text" value={form.passcode} onChange={e => setForm({...form, passcode: e.target.value})} maxLength={6} className="flex-1 bg-black border border-zinc-700 rounded-xl p-3 text-white font-black text-xl tracking-widest text-center outline-none focus:border-cyan-500" />
                  <button type="button" onClick={generatePin} className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 px-4 rounded-xl font-bold text-xs transition-colors">
                    สุ่มรหัสใหม่
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-zinc-400 hover:text-white font-bold bg-zinc-950 rounded-xl border border-zinc-800 transition-colors">ยกเลิก</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl shadow-lg disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกทีมงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffManagement() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-cyan-400">Loading...</div>}>
      {/* 🌟 ยามเฝ้าประตูสำหรับหน้า Staff: อนุญาตเฉพาะ admin เท่านั้น (เพื่อความปลอดภัยสูงสุด) */}
      <RouteGuard allowedRoles={['admin']}>
        <StaffManagementContent />
      </RouteGuard>
    </Suspense>
  );
}