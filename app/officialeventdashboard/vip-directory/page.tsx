"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Edit, Trash2, Users, ArrowLeft, Filter, 
  MapPin, Building2, Phone, X, Save, Image as ImageIcon
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import imageCompression from 'browser-image-compression'; // อย่าลืม import ตัวบีบอัดภาพ

export default function VipDirectoryPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // --- State สำหรับ Modal แก้ไขข้อมูล ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null); // เก็บข้อมูลคนที่จะแก้
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null); // เก็บไฟล์รูปใหม่ (ถ้ามีการเปลี่ยน)
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleDeleteProfile = async (id: string, fullName: string) => {
    const isConfirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ "${fullName}"?\n(คำเตือน: การกระทำนี้ไม่สามารถกู้คืนได้)`);
    if (isConfirmed) {
      try {
        const { error } = await supabase.from('global_profiles').delete().eq('id', id);
        if (error) throw error;
        setProfiles(profiles.filter(profile => profile.id !== id));
        alert("✅ ลบข้อมูลสำเร็จ");
      } catch (error) {
        console.error("Error deleting profile:", error);
        alert("❌ ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      }
    }
  };

  // --- ฟังก์ชันเปิด Modal พร้อมโหลดข้อมูลเดิม ---
  const openEditModal = (profile: any) => {
    setEditForm({ ...profile }); // โคลนข้อมูลมาใส่ฟอร์ม
    setNewProfileImage(null); // เคลียร์รูปใหม่ที่อาจค้างอยู่
    setIsEditModalOpen(true);
  };

  // --- ฟังก์ชันบันทึกการอัปเดตข้อมูล ---
  const handleUpdateProfile = async () => {
    if (!editForm.first_name) {
      alert("กรุณาระบุชื่อ");
      return;
    }

    setIsSaving(true);
    try {
      let profileImageUrl = editForm.profile_image_url;

      // ถ้ามีการเลือกรูปใหม่ ให้อัปโหลดทับ
      if (newProfileImage) {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(newProfileImage, options);
        
        const fileExt = compressedFile.name.split('.').pop() || 'jpg';
        const fileName = `vip_update_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('vip-profiles').upload(filePath, compressedFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('vip-profiles').getPublicUrl(filePath);
        profileImageUrl = publicUrlData.publicUrl;
      }

      // อัปเดตข้อมูลลง Database
      const { error: updateError } = await supabase
        .from('global_profiles')
        .update({
          prefix: editForm.prefix,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          position: editForm.position,
          organization: editForm.organization,
          district: editForm.district,
          province: editForm.province,
          phone_number: editForm.phone_number,
          honors_info: editForm.honors_info,
          profile_image_url: profileImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editForm.id); // กำหนด ID ของคนที่จะแก้

      if (updateError) throw updateError;

      alert("✅ อัปเดตข้อมูลสำเร็จ!");
      setIsEditModalOpen(false); // ปิด Modal
      fetchProfiles(); // รีเฟรชตารางใหม่

    } catch (error) {
      console.error("Error updating profile:", error);
      alert("❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => 
    profile.first_name?.includes(searchTerm) || 
    profile.last_name?.includes(searchTerm) ||
    profile.niivaa_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.organization?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-[#050B14] text-gray-200 font-sans selection:bg-[#00E676]/30">
      
      {/* HEADER ... (เหมือนเดิม) ... */}
      <header className="bg-[#0A1326]/90 backdrop-blur-xl border-b border-[#00E676]/50 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,230,118,0.15)]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2.5 bg-[#0B1A30] hover:bg-[#122A4F] text-gray-300 hover:text-[#00E676] rounded-xl transition-all border border-[#1E3A68]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-[#1E3A68] mx-2"></div>
            <div className="flex items-center gap-3">
              <img src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(0,230,118,0.4)]" />
              <div>
                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00E676] tracking-wide uppercase">NiiVaa SmartEvent</h1>
                <p className="text-[10px] text-[#00E676]/80 font-medium mt-0.5 tracking-widest">MASTER VIP DIRECTORY</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/officialeventdashboard/attendee-import">
                <button className="bg-gradient-to-r from-[#0B2447] to-[#0A4D3C] hover:from-[#123C69] hover:to-[#0F6E55] text-white border-2 border-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,230,118,0.3)] transition-all flex items-center">
                  <Users className="w-4 h-4 mr-2" /> เพิ่มรายชื่อใหม่
                </button>
             </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        
        {/* SEARCH BAR */}
        <div className="bg-[#0A1326] border border-[#00E676]/40 rounded-2xl p-4 mb-8 shadow-[0_0_15px_rgba(0,230,118,0.05)] flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#00E676]/70" />
            <input 
              type="text" 
              placeholder="ค้นหาด้วย รหัส NiiVaa, ชื่อ, นามสกุล หรือ หน่วยงาน..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl pl-12 pr-4 py-3 text-white outline-none transition-colors placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-[#0A1326] border border-[#1E3A68] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#050B14] border-b border-[#00E676]/30 text-[#00E676] uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-5 font-bold">โปรไฟล์ & รหัส</th>
                  <th className="px-6 py-5 font-bold">ชื่อ - สกุล</th>
                  <th className="px-6 py-5 font-bold">ตำแหน่ง / หน่วยงาน</th>
                  <th className="px-6 py-5 font-bold">พื้นที่</th>
                  <th className="px-6 py-5 font-bold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A68]/50">
                {/* ... (ส่วนแสดง loading เหมือนเดิม) ... */}
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-20 text-gray-500">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-20 text-gray-500">ไม่พบข้อมูล</td></tr>
                ) : (
                  filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-[#122A4F]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full border border-[#00E676] bg-[#050B14] p-0.5 overflow-hidden flex items-center justify-center shrink-0">
                            {profile.profile_image_url ? (
                              <img src={profile.profile_image_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <Users className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500 mb-0.5">NiiVaa ID</div>
                            <div className="font-bold text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/20 inline-block tracking-wider">
                              {profile.niivaa_code || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-base">{profile.prefix} {profile.first_name} {profile.last_name}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5 text-gray-500"/> {profile.phone_number || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-200 font-medium">{profile.position || '-'}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center"><Building2 className="w-3.5 h-3.5 mr-1.5 text-[#00E676]/60"/> {profile.organization || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        <div className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-fuchsia-400"/>{profile.district} {profile.province ? `จ.${profile.province}` : ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* แก้ไข onClick ให้เรียก openEditModal */}
                          <button 
                            className="bg-[#0B3B60] hover:bg-[#125B96] text-white border border-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(11,59,96,0.5)] flex items-center"
                            onClick={() => openEditModal(profile)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> แก้ไข
                          </button>
                          
                          <button 
                            className="bg-[#600B0B] hover:bg-[#961212] text-white border border-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(96,11,11,0.5)] flex items-center"
                            onClick={() => handleDeleteProfile(profile.id, `${profile.first_name} ${profile.last_name}`)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ================= MODAL แก้ไขข้อมูล ================= */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          
          {/* กรอบ Modal */}
          <div className="bg-[#0A1326] border border-[#00E676]/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(0,230,118,0.15)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#1E3A68] flex items-center justify-between bg-[#050B14]">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Edit className="w-5 h-5 mr-2 text-[#00E676]" />
                แก้ไขข้อมูล VIP: <span className="text-[#00E676] ml-2">{editForm.niivaa_code}</span>
              </h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-white bg-[#1E3A68]/50 hover:bg-[#1E3A68] p-2 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* คำนำหน้า & ชื่อ */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">คำนำหน้า</label>
                  <input type="text" value={editForm.prefix || ''} onChange={(e) => setEditForm({...editForm, prefix: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">ชื่อ <span className="text-red-500">*</span></label>
                  <input type="text" value={editForm.first_name || ''} onChange={(e) => setEditForm({...editForm, first_name: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>

                {/* นามสกุล & เบอร์โทร */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">นามสกุล</label>
                  <input type="text" value={editForm.last_name || ''} onChange={(e) => setEditForm({...editForm, last_name: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">เบอร์โทรศัพท์</label>
                  <input type="text" value={editForm.phone_number || ''} onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>

                {/* ตำแหน่ง & หน่วยงาน */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">ตำแหน่ง</label>
                  <input type="text" value={editForm.position || ''} onChange={(e) => setEditForm({...editForm, position: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">หน่วยงาน</label>
                  <input type="text" value={editForm.organization || ''} onChange={(e) => setEditForm({...editForm, organization: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>

                {/* พื้นที่ */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">อำเภอ</label>
                  <input type="text" value={editForm.district || ''} onChange={(e) => setEditForm({...editForm, district: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[#00E676] font-bold">จังหวัด</label>
                  <input type="text" value={editForm.province || ''} onChange={(e) => setEditForm({...editForm, province: e.target.value})} className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-2.5 text-sm text-white outline-none" />
                </div>
              </div>

              {/* เกียรติประวัติ */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#00E676] font-bold">เกียรติประวัติ / ข้อมูลสำหรับการประกาศ</label>
                <textarea 
                  rows={3} 
                  value={editForm.honors_info || ''} 
                  onChange={(e) => setEditForm({...editForm, honors_info: e.target.value})} 
                  className="w-full bg-[#050B14] border border-[#1E3A68] focus:border-[#00E676] rounded-xl px-4 py-3 text-sm text-white outline-none resize-none custom-scrollbar" 
                />
              </div>

              {/* เปลี่ยนรูปภาพ */}
              <div className="bg-[#050B14] border border-[#1E3A68] p-4 rounded-xl flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border border-[#00E676] bg-[#0A1326] flex items-center justify-center overflow-hidden shrink-0">
                  {newProfileImage ? (
                    <img src={URL.createObjectURL(newProfileImage)} className="w-full h-full object-cover" />
                  ) : editForm.profile_image_url ? (
                    <img src={editForm.profile_image_url} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#00E676] font-bold block mb-1">อัปเดตรูปภาพโปรไฟล์ (ถ้ามี)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => { if (e.target.files && e.target.files[0]) setNewProfileImage(e.target.files[0]) }}
                    className="w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1E3A68] file:text-white hover:file:bg-[#2A508C] cursor-pointer outline-none"
                  />
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#1E3A68] bg-[#050B14] flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-transparent border border-gray-700 hover:bg-gray-800 transition-colors"
              >
                ยกเลิก
              </button>
              
              {/* ปุ่มบันทึก สี Navy+Green ขอบขาว */}
              <button 
                onClick={handleUpdateProfile}
                disabled={isSaving}
                className="bg-gradient-to-r from-[#0B2447] to-[#0A4D3C] hover:from-[#123C69] hover:to-[#0F6E55] text-white border-2 border-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(0,230,118,0.3)] transition-all flex items-center disabled:opacity-50"
              >
                {isSaving ? (
                  <span className="flex items-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> กำลังบันทึก...</span>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> บันทึกการแก้ไข</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}