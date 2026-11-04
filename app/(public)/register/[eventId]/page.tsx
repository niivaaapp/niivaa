'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // 🌟 1. นำเข้า useRouter
import { createClient } from '@/utils/supabase/client';
import { Send, CheckCircle2, Loader2, FileText, X } from 'lucide-react'; // 🌟 2. นำเข้าไอคอน X

export default function PublicRegistrationForm() {
  const params = useParams();
  const router = useRouter(); // 🌟 เรียกใช้ router สำหรับเปลี่ยนหน้า
  const eventId = params.eventId as string;
  const supabase = createClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    agency_name: '',
    placer_name: '',
    placer_position: '',
    gold_bearer_name: '',
    gold_bearer_position: '',
    silver_bearer_name: '',
    silver_bearer_position: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agency_name.trim()) return alert('กรุณาระบุชื่อหน่วยงาน');
    setIsSubmitting(true);

    try {
      const agencyNameTrimmed = formData.agency_name.trim();
      
      const { data: rosterData } = await supabase
        .from('org_agency_rosters')
        .select('default_sequence')
        .eq('agency_name', agencyNameTrimmed)
        .single(); 

      const finalSequence = rosterData ? rosterData.default_sequence : 999;

      const { error: insertError } = await supabase.from('event_ceremony_bearers').insert([{
        event_id: eventId,
        sequence_order: finalSequence,
        agency_name: agencyNameTrimmed,
        placer_name: formData.placer_name,
        placer_position: formData.placer_position,
        gold_bearer_name: formData.gold_bearer_name,
        gold_bearer_position: formData.gold_bearer_position,
        silver_bearer_name: formData.silver_bearer_name,
        silver_bearer_position: formData.silver_bearer_position,
        status: 'pending' 
      }]);

      if (insertError) throw insertError;

      setIsSuccess(true);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌟 ฟังก์ชันสำหรับปุ่มปิด / ยกเลิกการลงทะเบียน
 const handleClose = () => {
    // กลับไปยังหน้า Official Hub ของงานนี้
    router.push(`/officialeventdashboard/hub?event_id=${eventId}`); 
  };

  // หน้าจอเมื่อส่งข้อมูลสำเร็จ
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 border border-cyan-500/30 p-8 rounded-2xl w-full max-w-md text-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative">
          {/* 🌟 ปุ่ม X ปิดหน้าต่าง */}
          <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white bg-gray-800 rounded-full transition-colors">
             <X className="w-5 h-5" />
          </button>

          <CheckCircle2 className="w-20 h-20 text-cyan-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-100 mb-2">ส่งข้อมูลสำเร็จ!</h2>
          <p className="text-gray-400 mb-6">ระบบได้รับข้อมูลรายชื่อของ "{formData.agency_name}" เรียบร้อยแล้ว</p>
          
          <div className="flex flex-col gap-3">
             <button 
               onClick={() => window.location.reload()} 
               className="w-full px-6 py-3 bg-gray-800 text-cyan-400 font-bold rounded-xl hover:bg-gray-700 transition-colors"
             >
               ส่งข้อมูลหน่วยงานอื่นเพิ่มเติม
             </button>
             {/* 🌟 ปุ่มกลับหน้าแรกเมื่อเสร็จสิ้น */}
             <button 
               onClick={handleClose} 
               className="w-full px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-900/50"
             >
               เสร็จสิ้น / ปิดหน้าต่าง
             </button>
          </div>
        </div>
      </div>
    );
  }

  // หน้าจอแบบฟอร์ม
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 py-10 px-4 font-sans relative">
      
      {/* 🌟 ปุ่มปิดมุมขวาบน สำหรับกรณีเปลี่ยนใจ */}
      <button 
         onClick={handleClose}
         className="absolute top-4 right-4 md:top-8 md:right-8 p-3 bg-gray-900 hover:bg-red-900/40 border border-gray-800 hover:border-red-500/50 text-gray-500 hover:text-red-400 rounded-xl transition-all shadow-md flex items-center gap-2 group"
      >
         <span className="text-sm font-bold hidden md:block group-hover:text-red-400">ยกเลิก</span>
         <X className="w-5 h-5" />
      </button>

      <div className="max-w-2xl mx-auto pt-8 md:pt-0">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 mb-2 flex items-center justify-center">
            <FileText className="w-8 h-8 mr-3" /> แบบฟอร์มลงทะเบียนรายชื่อ
          </h1>
          <p className="text-gray-400">ผู้แทนถวายเครื่องราชสักการะ (พานพุ่มทอง-พุ่มเงิน)</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 md:p-8 rounded-2xl shadow-xl relative">
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ชื่อหน่วยงาน (สำคัญที่สุดในการ Auto-match) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                ชื่อหน่วยงาน / องค์กร <span className="text-fuchsia-400">*</span>
              </label>
              <input 
                required 
                type="text" 
                value={formData.agency_name} 
                onChange={e => setFormData({...formData, agency_name: e.target.value})} 
                className="w-full bg-gray-950 border border-cyan-900/50 rounded-xl px-4 py-3 text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-gray-600" 
                placeholder="โปรดระบุชื่อเต็ม (เช่น โรงเรียนสุรินทร์วิทยา)" 
              />
              <p className="text-xs text-gray-500 mt-2">
                * กรุณาพิมพ์ชื่อให้ถูกต้องตรงตามทำเนียบของหน่วยงาน เพื่อการจัดลำดับคิวอัตโนมัติ
              </p>
            </div>
            
            <hr className="border-gray-800" />

            {/* ข้อมูลผู้วางพานพุ่ม */}
            <div className="bg-cyan-950/20 p-5 rounded-xl border border-cyan-900/30">
              <label className="block text-sm font-bold text-cyan-400 mb-4">1. ผู้วางพานพุ่ม</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="ชื่อ-สกุล" value={formData.placer_name} onChange={e => setFormData({...formData, placer_name: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200" />
                <input type="text" placeholder="ตำแหน่ง" value={formData.placer_position} onChange={e => setFormData({...formData, placer_position: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-400" />
              </div>
            </div>

            {/* ข้อมูลผู้เชิญพุ่มทอง */}
            <div className="bg-yellow-950/20 p-5 rounded-xl border border-yellow-900/30">
              <label className="block text-sm font-bold text-yellow-500 mb-4">2. ผู้เชิญพุ่มทอง</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="ชื่อ-สกุล" value={formData.gold_bearer_name} onChange={e => setFormData({...formData, gold_bearer_name: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200" />
                <input type="text" placeholder="ตำแหน่ง" value={formData.gold_bearer_position} onChange={e => setFormData({...formData, gold_bearer_position: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-400" />
              </div>
            </div>

            {/* ข้อมูลผู้เชิญพุ่มเงิน */}
            <div className="bg-gray-800/40 p-5 rounded-xl border border-gray-700/50">
              <label className="block text-sm font-bold text-gray-400 mb-4">3. ผู้เชิญพุ่มเงิน</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="ชื่อ-สกุล" value={formData.silver_bearer_name} onChange={e => setFormData({...formData, silver_bearer_name: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200" />
                <input type="text" placeholder="ตำแหน่ง" value={formData.silver_bearer_position} onChange={e => setFormData({...formData, silver_bearer_position: e.target.value})} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-400" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full mt-6 flex items-center justify-center px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Send className="w-6 h-6 mr-3" />}
              ยืนยันการส่งข้อมูล
            </button>
            
          </form>
        </div>
      </div>
    </div>
  );
}