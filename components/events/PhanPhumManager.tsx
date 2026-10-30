'use client';

import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Share2, CheckCircle, Clock, Lock, Edit3, Loader2, Save, Printer } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface Bearer {
  id: string;
  sequence_order: number;
  agency_name: string;
  placer_name: string;
  placer_position: string;
  gold_bearer_name: string;
  gold_bearer_position: string;
  silver_bearer_name: string;
  silver_bearer_position: string;
  status: 'pending' | 'ready' | 'completed';
}

export default function PhanPhumManager({ eventId }: { eventId: string }) {
  const [agencies, setAgencies] = useState<Bearer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // เช็คว่ามีการแก้ตัวเลขคิวหรือไม่
  const hasUnassigned = agencies.some(a => a.sequence_order === 999);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgency, setNewAgency] = useState({
    agency_name: '',
    placer_name: '',
    placer_position: '',
    gold_bearer_name: '',
    gold_bearer_position: '',
    silver_bearer_name: '',
    silver_bearer_position: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const supabase = createClient();
  // --- States สำหรับการแก้ไขข้อมูล ---
  const [editingItem, setEditingItem] = useState<any>(null); // เก็บข้อมูลแถวที่กำลังจะแก้
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // ควบคุมการเปิด/ปิด Modal
  const [isUpdating, setIsUpdating] = useState(false); // สถานะกำลังบันทึก

  // 1. โหลดข้อมูลเริ่มต้นและเปิด Real-time
  useEffect(() => {
    if (!eventId) return;

    const fetchAgencies = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('event_ceremony_bearers')
        .select('*')
        .eq('event_id', eventId)
        .order('sequence_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data) {
        setAgencies(data as Bearer[]);
      }
      setIsLoading(false);
      setHasUnsavedChanges(false);
    };

    fetchAgencies();

    const channel = supabase
      .channel('public:event_ceremony_bearers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_ceremony_bearers', filter: `event_id=eq.${eventId}` },
        () => { fetchAgencies(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  // 2. ฟังก์ชันเมื่อผู้ใช้พิมพ์เปลี่ยนตัวเลขคิว
  const handleSequenceChange = (id: string, newSequence: string) => {
    const seqNumber = parseInt(newSequence) || 999;
    setAgencies(agencies.map(a => a.id === id ? { ...a, sequence_order: seqNumber } : a));
    setHasUnsavedChanges(true); // แจ้งเตือนว่ามีข้อมูลรอเซฟ
  };

  // 3. ฟังก์ชันบันทึกลำดับทั้งหมดรวดเดียว (แก้ไขปัญหา Upsert Block)
  const saveNewOrder = async () => {
    setIsSavingOrder(true);

    // จัดเรียง Array ใหม่: เอาเลขคิวน้อยขึ้นก่อน
    const sortedAgencies = [...agencies].sort((a, b) => a.sequence_order - b.sequence_order);

    // บังคับรันเลขใหม่เป็น 1, 2, 3...
    const normalizedAgencies = sortedAgencies.map((item, index) => ({
      ...item,
      sequence_order: index + 1
    }));

    // อัปเดตหน้าจอทันที
    setAgencies(normalizedAgencies);

    // พระเอกตัวจริง: ใช้ Promise.all เพื่อส่งคำสั่ง Update เฉพาะคอลัมน์ sequence_order ทีละแถว
    const updatePromises = normalizedAgencies.map(a =>
      supabase
        .from('event_ceremony_bearers')
        .update({ sequence_order: a.sequence_order })
        .eq('id', a.id)
    );

    // รอให้การอัปเดตทั้งหมดเสร็จสิ้นพร้อมกัน
    const results = await Promise.all(updatePromises);

    // ตรวจสอบหา Error
    const hasError = results.some(res => res.error);

    if (!hasError) {
      setHasUnsavedChanges(false);
      console.log('บันทึกลำดับใหม่สำเร็จและอัปเดตฐานข้อมูลแล้ว');
    } else {
      console.error('Error saving new order:', results);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    }

    setIsSavingOrder(false);
  };
  // 5. ฟังก์ชันเพิ่มหน่วยงานแบบ Manual
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgency.agency_name) return alert('กรุณาระบุชื่อหน่วยงาน');

    setIsAdding(true);
    const { error } = await supabase.from('event_ceremony_bearers').insert([{
      event_id: eventId,
      sequence_order: 999, // ให้เป็น 999 ไปก่อน เพื่อให้แอดมินกดปุ่ม "จัดลำดับอัตโนมัติ" ทีหลัง
      agency_name: newAgency.agency_name,
      placer_name: newAgency.placer_name,
      placer_position: newAgency.placer_position,
      gold_bearer_name: newAgency.gold_bearer_name,
      gold_bearer_position: newAgency.gold_bearer_position,
      silver_bearer_name: newAgency.silver_bearer_name,
      silver_bearer_position: newAgency.silver_bearer_position,
      status: 'ready' // ถ้าแอดมินคีย์เองหน้างาน ถือว่ามารายงานตัวแล้ว
    }]);

    if (!error) {
      setShowAddModal(false);
      setNewAgency({ agency_name: '', placer_name: '', placer_position: '', gold_bearer_name: '', gold_bearer_position: '', silver_bearer_name: '', silver_bearer_position: '' });
      // ไม่ต้องเรียก fetchAgencies() เพราะ Real-time subscription จะดึงข้อมูลมาให้เอง
    } else {
      console.error('Error adding agency:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
    setIsAdding(false);
  };

  // ฟังก์ชันบันทึกการแก้ไข
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('event_ceremony_bearers')
        .update({
          agency_name: editingItem.agency_name,
          placer_name: editingItem.placer_name, // <--- เพิ่มบรรทัดนี้
          gold_bearer_name: editingItem.gold_bearer_name,
          silver_bearer_name: editingItem.silver_bearer_name,
          sequence_order: editingItem.sequence_order
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      // ปิด Modal และรีเฟรชข้อมูล (เรียกฟังก์ชันดึงข้อมูลของคุณใหม่ เช่น fetchBearers())
      setIsEditModalOpen(false);
      setEditingItem(null);
      // fetchBearers(); // <-- อย่าลืมเรียกฟังก์ชันโหลดข้อมูลซ้ำเพื่อให้หน้าจออัปเดต

    } catch (error) {
      console.error('Error updating item:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsUpdating(false);
    }
  };
// ฟังก์ชันสำหรับเปลี่ยนสถานะรายงานตัวหน้างาน
  const toggleStatus = async (id: string, currentStatus: string) => {
    // สลับสถานะระหว่าง ready (รายงานตัวแล้ว) กับ pending (รอยืนยัน)
    const newStatus = currentStatus === 'ready' ? 'pending' : 'ready';
    
    try {
      const { error } = await supabase
        .from('event_ceremony_bearers')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      // ไม่ต้องใช้ setAgencies อัปเดต State เอง เพราะอาจารย์ทำระบบ Real-time (Supabase Channel) ไว้แล้ว 
      // พอบันทึกเสร็จ หน้าจอจะอัปเดตสถานะให้เองอัตโนมัติครับ
    } catch (error) {
      console.error('Error updating status:', error);
      alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ กรุณาลองใหม่อีกครั้ง');
    }
  };
  return (
    <div className="w-full flex flex-col space-y-4 font-sans text-gray-200">
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-cyan-500/20 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">จัดการหน่วยงานและผู้เชิญพานพุ่ม</h2>
            <p className="text-sm text-cyan-400/70">จำนวนทั้งหมด {agencies.length} หน่วยงาน</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* ปุ่มเซฟลำดับ จะแสดงเด่นขึ้นมาเมื่อมีการแก้ตัวเลข หรือ มีคิว 999 ค้างอยู่ */}
          {(hasUnsavedChanges || hasUnassigned) && (
            <button
              onClick={saveNewOrder}
              disabled={isSavingOrder}
              className="flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all animate-pulse"
            >
              {isSavingOrder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {hasUnassigned ? 'จัดลำดับอัตโนมัติ' : 'บันทึกลำดับใหม่'}
            </button>
          )}

          <Link href={`/officialeventdashboard/print?eventId=${eventId}`} target="_blank" className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg border border-gray-600 transition-colors">
            <Printer className="w-4 h-4 mr-2 text-cyan-400" /> พิมพ์รายงาน
          </Link>

          <button onClick={() => setShowShareModal(true)} className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm rounded-lg border border-gray-600 transition-colors">
            <Share2 className="w-4 h-4 mr-2 text-fuchsia-400" /> แชร์คิวงาน
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" /> เพิ่มหน่วยงาน
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 text-cyan-500">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>กำลังเชื่อมต่อข้อมูล...</p>
        </div>
      ) : agencies.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-dashed border-gray-700">
          <p className="text-gray-500">ยังไม่มีรายชื่อหน่วยงานในระบบ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {agencies.map((agency) => (
            <div key={agency.id} className={`p-4 rounded-xl border transition-all duration-300 flex flex-col lg:flex-row gap-4 items-center ${agency.status === 'ready' ? 'bg-cyan-900/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-gray-900 border-gray-800'}`}>

              {/* 1. จัดลำดับ (Manual Input) */}
              <div className="flex flex-col items-center justify-center w-16 shrink-0">
                <label className="text-[10px] text-gray-500 mb-1">คิวที่</label>
                <input
                  type="number"
                  min="1"
                  value={agency.sequence_order === 999 ? '' : agency.sequence_order}
                  onChange={(e) => handleSequenceChange(agency.id, e.target.value)}
                  placeholder="รอจัด"
                  className="w-full text-center bg-gray-950 border border-gray-700 rounded-lg py-2 text-cyan-400 font-bold focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-gray-600 placeholder:text-xs"
                />
              </div>

              {/* 2. ข้อมูลผู้เชิญ */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="md:col-span-3">
                  <h3 className="text-lg font-bold text-gray-100 flex items-center">
                    {agency.agency_name}
                    <button
                      onClick={() => {
                        setEditingItem(agency);
                        setIsEditModalOpen(true);
                      }}
                      className="ml-2 p-1 text-gray-500 hover:text-fuchsia-400 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </h3>
                </div>

                <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-fuchsia-400 mb-1">ผู้วางพานพุ่ม</p>
                  <p className="text-sm font-medium text-gray-200">{agency.placer_name || '-'}</p>
                  <p className="text-[10px] text-gray-500">{agency.placer_position || 'ยังไม่ระบุ'}</p>
                </div>

                <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-yellow-500 mb-1">ผู้เชิญพุ่มทอง</p>
                  <p className="text-sm font-medium text-gray-200">{agency.gold_bearer_name || '-'}</p>
                  <p className="text-[10px] text-gray-500">{agency.gold_bearer_position || 'ยังไม่ระบุ'}</p>
                </div>

                <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800">
                  <p className="text-xs text-gray-300 mb-1">ผู้เชิญพุ่มเงิน</p>
                  <p className="text-sm font-medium text-gray-200">{agency.silver_bearer_name || '-'}</p>
                  <p className="text-[10px] text-gray-500">{agency.silver_bearer_position || 'ยังไม่ระบุ'}</p>
                </div>
              </div>

              {/* 3. สถานะรายงานตัว */}
              <div className="w-full lg:w-48 shrink-0 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-800 pt-4 lg:pt-0 lg:pl-4">
                <button
                  onClick={() => toggleStatus(agency.id, agency.status)}
                  className={`w-full flex items-center justify-center py-3 rounded-lg border transition-all ${agency.status === 'ready'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400'
                    }`}
                >
                  {agency.status === 'ready' ? (
                    <><CheckCircle className="w-5 h-5 mr-2" /> รายงานตัวแล้ว</>
                  ) : (
                    <><Clock className="w-5 h-5 mr-2" /> รอยืนยันหน้างาน</>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Share Modal (คงเดิม) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-fuchsia-500/30 p-6 rounded-2xl w-full max-w-md shadow-[0_0_30px_rgba(217,70,239,0.15)]">
            <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center">
              <Share2 className="w-5 h-5 mr-2 text-fuchsia-400" />
              แชร์ลิงก์แจ้งคิวงานและข้อมูล
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">ลิงก์เข้าระบบ (คัดลอก)</label>
                <input type="text" readOnly value={`http://localhost:3000/share/event/${eventId}`} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 flex items-center"><Lock className="w-3 h-3 mr-1" /> รหัสการเข้าถึง (Access Code)</label>
                <input type="text" readOnly value="SURIN-2026" className="w-full bg-gray-950 border border-fuchsia-500/50 rounded-lg px-3 py-2 text-sm text-fuchsia-300 font-mono focus:outline-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">ปิด</button>
            </div>
          </div>
        </div>
      )}
      {/* Add Agency Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 p-6 rounded-2xl w-full max-w-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-bold text-gray-100 mb-6 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-cyan-400" />
              เพิ่มหน่วยงาน (Walk-in)
            </h3>

            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">ชื่อหน่วยงาน <span className="text-red-400">*</span></label>
                <input required type="text" value={newAgency.agency_name} onChange={e => setNewAgency({ ...newAgency, agency_name: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-cyan-300 focus:outline-none focus:border-cyan-500" placeholder="เช่น โรงเรียนสุรินทร์วิทยา" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-950/50 p-4 rounded-xl border border-gray-800">
                <div className="md:col-span-2">
                  <label className="text-xs text-cyan-400 mb-1 block">ผู้วางพานพุ่ม</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="ชื่อ-สกุล" value={newAgency.placer_name} onChange={e => setNewAgency({ ...newAgency, placer_name: e.target.value })} className="w-1/2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
                    <input type="text" placeholder="ตำแหน่ง" value={newAgency.placer_position} onChange={e => setNewAgency({ ...newAgency, placer_position: e.target.value })} className="w-1/2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-yellow-500 mb-1 block">ผู้เชิญพุ่มทอง</label>
                  <input type="text" placeholder="ชื่อ-สกุล" value={newAgency.gold_bearer_name} onChange={e => setNewAgency({ ...newAgency, gold_bearer_name: e.target.value })} className="w-full mb-2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
                  <input type="text" placeholder="ตำแหน่ง" value={newAgency.gold_bearer_position} onChange={e => setNewAgency({ ...newAgency, gold_bearer_position: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">ผู้เชิญพุ่มเงิน</label>
                  <input type="text" placeholder="ชื่อ-สกุล" value={newAgency.silver_bearer_name} onChange={e => setNewAgency({ ...newAgency, silver_bearer_name: e.target.value })} className="w-full mb-2 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200" />
                  <input type="text" placeholder="ตำแหน่ง" value={newAgency.silver_bearer_position} onChange={e => setNewAgency({ ...newAgency, silver_bearer_position: e.target.value })} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400" />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">ยกเลิก</button>
                <button type="submit" disabled={isAdding} className="flex items-center px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg">
                  {isAdding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================= EDIT MODAL ================= */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">แก้ไขข้อมูลหน่วยงาน</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveChanges} className="p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 block">ลำดับคิว</label>
                <input 
                  type="number" 
                  value={editingItem.sequence_order || ''}
                  onChange={(e) => setEditingItem({...editingItem, sequence_order: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 block">ชื่อหน่วยงาน</label>
                <input 
                  type="text" 
                  value={editingItem.agency_name || ''}
                  onChange={(e) => setEditingItem({...editingItem, agency_name: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              {/* ================= เพิ่มโค้ดส่วนนี้ ================= */}
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 block">ผู้วางพานพุ่ม</label>
                <input 
                  type="text" 
                  value={editingItem.placer_name || ''}
                  onChange={(e) => setEditingItem({...editingItem, placer_name: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                  placeholder="ชื่อ-สกุล ผู้วาง"
                />
              </div>
              {/* ================================================== */}
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 block">ผู้เชิญพานพุ่มทอง</label>
                <input 
                  type="text" 
                  value={editingItem.gold_bearer_name || ''}
                  onChange={(e) => setEditingItem({...editingItem, gold_bearer_name: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-yellow-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-bold mb-1 block">ผู้เชิญพานพุ่มเงิน</label>
                <input 
                  type="text" 
                  value={editingItem.silver_bearer_name || ''}
                  onChange={(e) => setEditingItem({...editingItem, silver_bearer_name: e.target.value})}
                  className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-gray-400 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700">ยกเลิก</button>
                <button type="submit" disabled={isUpdating} className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50">
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </div>
  );
}