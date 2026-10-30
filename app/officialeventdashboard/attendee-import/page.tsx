"use client";
import RouteGuard from '@/components/RouteGuard';
import imageCompression from 'browser-image-compression';
import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { 
  ArrowLeft, UploadCloud, UserPlus, Database, 
  FileSpreadsheet, Save, CheckCircle, AlertCircle, X, Search, UserCheck, Home, Users
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// ประเภทข้อมูลสำหรับการแสดงผล
interface PreviewData {
  person_type: string;
  prefix: string;
  first_name: string;
  last_name: string;
  position: string;
  organization: string;
  district: string;
  province: string;
  phone_number: string;
  contact_channels: any;
  honors_info: string;
  break_drink_pref: string;
  isDuplicate?: boolean;
}

// 🌟 เปลี่ยนชื่อฟังก์ชันหลักเป็น Content เพื่อเตรียมห่อหุ้มด้วย Suspense ด้านล่างสุด
function AttendeeImportContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  // 🌟 ดึงค่า event_id จาก URL ปัจจุบัน เพื่อเอาไปแนบต่อในปุ่ม
  const eventId = searchParams.get('event_id') || '';

  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  
  // State สำหรับ Modal ตรวจสอบชื่อซ้ำ (Manual)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateProfiles, setDuplicateProfiles] = useState<any[]>([]);

  // State สำหรับเก็บค่าจากฟอร์ม Manual
  const [manualForm, setManualForm] = useState({
    personType: 'layperson',
    prefix: '',
    firstName: '',
    lastName: '',
    position: '',
    organization: '',
    phoneNumber: '',
    honorsInfo: '',
    profileImage: null as File | null 
  });

  // ==========================================
  // ส่วนที่ 1: ระบบนำเข้า Excel (Bulk Import)
  // ==========================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedData: PreviewData[] = data.map((row: any) => {
          let parsedContact = {};
          if (row.contact_channels) {
            try {
              parsedContact = typeof row.contact_channels === 'string' ? JSON.parse(row.contact_channels) : row.contact_channels;
            } catch (err) {
              console.warn("แปลง contact_channels ไม่สำเร็จ");
            }
          }

          return {
            person_type: row.person_type || 'layperson',
            prefix: row.prefix || '',
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            position: row.position || '',
            organization: row.organization || '',
            district: row.district || '',
            province: row.province || '',
            phone_number: row.phone_number?.toString() || '',
            contact_channels: parsedContact,
            honors_info: row.honors_info || '',
            break_drink_pref: row.break_drink_pref || '',
            isDuplicate: false
          };
        });

        const validData = formattedData.filter(d => d.first_name !== '');

        const firstNames = validData.map(d => d.first_name);
        const { data: existingDb } = await supabase
          .from('global_profiles')
          .select('first_name, last_name')
          .in('first_name', firstNames);

        if (existingDb && existingDb.length > 0) {
          validData.forEach(row => {
            const isDup = existingDb.some(db => db.first_name === row.first_name && db.last_name === row.last_name);
            row.isDuplicate = isDup;
          });
        }
        
        setPreviewData(validData);
        setIsUploading(false);
      } catch (error) {
        console.error("Error parsing file:", error);
        alert("❌ เกิดข้อผิดพลาดในการอ่านไฟล์");
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveToDatabase = async () => {
    if (previewData.length === 0) return;

    const duplicateCount = previewData.filter(d => d.isDuplicate).length;
    if (duplicateCount > 0) {
      const confirmProceed = window.confirm(`⚠️ พบรายชื่อที่อาจซ้ำซ้อนจำนวน ${duplicateCount} รายการ\nหากกดตกลง ระบบจะสร้างรหัส NiiVaa ใหม่ให้ทุกคน คุณต้องการดำเนินการต่อหรือไม่?`);
      if (!confirmProceed) return;
    }

    try {
      const { data, error } = await supabase
        .from('global_profiles')
        .insert(previewData.map(({ isDuplicate, ...rest }) => rest))
        .select('niivaa_code');

      if (error) throw error;
      alert(`✅ นำเข้าข้อมูลสำเร็จจำนวน ${previewData.length} รายการ!`);
      setPreviewData([]);
    } catch (error) {
      alert("❌ ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  // ==========================================
  // ส่วนที่ 2: ระบบเพิ่มข้อมูลรายบุคคล (Manual Entry)
  // ==========================================
  const handleSaveManualData = async (bypassCheck = false) => {
    if (!manualForm.firstName) {
      alert("กรุณากรอกชื่อก่อนบันทึกครับ");
      return;
    }

    try {
      if (!bypassCheck) {
        const { data: existingProfiles } = await supabase
          .from('global_profiles')
          .select('id, first_name, last_name, niivaa_code, phone_number, organization')
          .eq('first_name', manualForm.firstName)
          .eq('last_name', manualForm.lastName || '');

        if (existingProfiles && existingProfiles.length > 0) {
          setDuplicateProfiles(existingProfiles);
          setShowDuplicateModal(true);
          return;
        }
      }

      let profileImageUrl = null;
      if (manualForm.profileImage) {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(manualForm.profileImage, options);
        const fileExt = compressedFile.name.split('.').pop() || 'jpg';
        const fileName = `vip_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `profiles/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('vip-profiles').upload(filePath, compressedFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('vip-profiles').getPublicUrl(filePath);
        profileImageUrl = publicUrlData.publicUrl;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('global_profiles')
        .insert([{
          person_type: manualForm.personType,
          prefix: manualForm.prefix,
          first_name: manualForm.firstName,
          last_name: manualForm.lastName,
          position: manualForm.position,
          organization: manualForm.organization,
          phone_number: manualForm.phoneNumber,
          honors_info: manualForm.honorsInfo,
          profile_image_url: profileImageUrl,
        }])
        .select('id, niivaa_code')
        .single();

      if (profileError) throw profileError;

      alert(`✅ บันทึกสำเร็จ! รหัส NiiVaa Code คือ: ${profileData.niivaa_code}`);
      
      setManualForm({ 
        personType: 'layperson', prefix: '', firstName: '', lastName: '', 
        position: '', organization: '', phoneNumber: '', honorsInfo: '', profileImage: null 
      });
      setShowDuplicateModal(false);
      
      const customInput = document.getElementById('custom_prefix') as HTMLInputElement;
      if(customInput) customInput.value = '';

    } catch (error) {
      console.error(error);
      alert("❌ ไม่สามารถบันทึกข้อมูลได้");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-gray-200 font-sans selection:bg-cyan-500/30 pb-20">
      
      {/* 🚀 HEADER */}
      <header className="bg-gray-900/80 backdrop-blur-xl border-b border-cyan-900/50 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* ฝั่งซ้าย: ปุ่ม Back และชื่อหน้า */}
          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 rounded-xl transition-all border border-gray-700 shadow-sm" title="กลับหน้า Hub ศูนย์กลาง">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-gray-800 mx-2"></div>
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2 tracking-wide">
                <Database className="w-6 h-6 text-cyan-400" /> 
                ระบบจัดการฐานข้อมูล VIP (Master Directory)
              </h1>
              <p className="text-xs text-gray-400 font-medium mt-1">นำเข้าและอัปเดตข้อมูลผู้ร่วมงานเข้าสู่ NiiVaa Global System</p>
            </div>
          </div>

          {/* ฝั่งขวา: โลโก้ NiiVaa, ปุ่มจัดการผู้ร่วมงาน และปุ่มไป Event Hub */}
          <div className="flex items-center gap-3">
            
            {/* โลโก้ NiiVaa */}
            <div className="hidden lg:flex items-center select-none mr-2">
              <img 
                src="/niivaasmartevent_logo.png" 
                alt="NiiVaa SmartEvent Logo" 
                className="h-12 w-auto object-contain drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
              />
            </div>

            {/* 🌟 ปุ่ม 1: จัดการรายชื่อผู้ร่วมงาน (ลิงก์พร้อม event_id) */}
            <Link 
              href={`/eventdashboard/attendees?event_id=${eventId}`} 
              className="flex items-center gap-2 bg-emerald-900/40 hover:bg-emerald-600/60 border border-emerald-500/30 text-emerald-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
            >
              <Users className="w-4 h-4" /> ผู้ร่วมงาน
            </Link>

            {/* 🌟 ปุ่ม 2: กลับหน้า Event Hub */}
            <Link 
              href="/eventhub" 
              className="flex items-center gap-2 bg-indigo-900/40 hover:bg-indigo-600/60 border border-indigo-500/30 text-indigo-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
            >
              <Home className="w-4 h-4" /> หน้าหลัก
            </Link>

          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1200px] mx-auto px-6 py-8">
        
        {/* TABS */}
        <div className="flex p-1 bg-gray-900 border border-gray-800 rounded-2xl w-fit mb-8 shadow-lg">
          <button 
            onClick={() => setActiveTab('upload')} 
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center ${activeTab === 'upload' ? 'bg-cyan-900/50 text-cyan-300 shadow-md border border-cyan-800/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> นำเข้าจากไฟล์ Excel/CSV
          </button>
          <button 
            onClick={() => setActiveTab('manual')} 
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center ${activeTab === 'manual' ? 'bg-fuchsia-900/50 text-fuchsia-300 shadow-md border border-fuchsia-800/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <UserPlus className="w-4 h-4 mr-2" /> เพิ่มข้อมูลรายบุคคล
          </button>
        </div>

        {/* TAB 1: UPLOAD FILE */}
        {activeTab === 'upload' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gray-900 border-2 border-dashed border-cyan-900/50 hover:border-cyan-500/50 transition-colors rounded-[2rem] p-10 flex flex-col items-center justify-center text-center shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 bg-gray-950 border border-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner relative z-10">
                <UploadCloud className={`w-10 h-10 ${isUploading ? 'text-cyan-400 animate-bounce' : 'text-gray-500 group-hover:text-cyan-400'} transition-colors`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อค้นหาไฟล์</h3>
              <p className="text-sm text-gray-500 mb-8 relative z-10">รองรับไฟล์ .CSV หรือ .XLSX (ขนาดไม่เกิน 10MB)</p>
              
              <label className="relative z-10 cursor-pointer bg-cyan-700 hover:bg-cyan-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center">
                <Search className="w-4 h-4 mr-2"/> เลือกไฟล์จากเครื่อง
                <input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {previewData.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
                <div className="bg-gray-950 px-6 py-4 flex items-center justify-between border-b border-gray-800">
                  <h3 className="font-bold text-white flex items-center"><CheckCircle className="w-5 h-5 mr-2 text-emerald-500"/> ตรวจสอบข้อมูลก่อนบันทึก ({previewData.length} รายการ)</h3>
                  <button onClick={handleSaveToDatabase} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors flex items-center">
                    <Save className="w-4 h-4 mr-2"/> ยืนยันการนำเข้า
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs text-cyan-400 uppercase bg-gray-900/50 border-b border-gray-800">
                      <tr>
                        <th className="px-6 py-4">สถานะ</th>
                        <th className="px-6 py-4">ชื่อ - สกุล</th>
                        <th className="px-6 py-4">ตำแหน่ง/หน่วยงาน</th>
                        <th className="px-6 py-4">เบอร์โทร</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((data, index) => (
                        <tr key={index} className={`border-b border-gray-800/50 transition-colors ${data.isDuplicate ? 'bg-amber-950/20' : 'hover:bg-gray-800/30'}`}>
                          <td className="px-6 py-4">
                            {data.isDuplicate ? (
                              <span className="flex items-center text-amber-500 text-xs font-bold"><AlertCircle size={14} className="mr-1"/> ซ้ำในระบบ</span>
                            ) : (
                              <span className="flex items-center text-emerald-500 text-xs font-bold"><CheckCircle size={14} className="mr-1"/> ปกติ</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-white">{data.prefix}{data.first_name} {data.last_name}</td>
                          <td className="px-6 py-4">
                            <div className="text-gray-300">{data.position}</div>
                            <div className="text-xs text-gray-500">{data.organization}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{data.phone_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MANUAL ENTRY */}
        {activeTab === 'manual' && (
          <div className="bg-gray-900 border border-gray-800 rounded-[2rem] p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">เพิ่มข้อมูลบุคคล / พระสงฆ์ (Manual Entry)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">ประเภทบุคคล</label>
                <select 
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500"
                  value={manualForm.personType}
                  onChange={(e) => setManualForm({...manualForm, personType: e.target.value})}
                >
                  <option value="layperson">บุคคลทั่วไป</option>
                  <option value="monk">พระภิกษุสงฆ์</option>
                </select>
              </div>

              <div className="space-y-2 relative group">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">คำนำหน้า / สมณศักดิ์</label>
                <div className="flex gap-2">
                  <select 
                    className="w-1/2 bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500"
                    onChange={(e) => {
                      const customInput = document.getElementById('custom_prefix') as HTMLInputElement;
                      if (e.target.value === 'other') {
                        customInput.value = '';
                        setManualForm({...manualForm, prefix: ''});
                        customInput.focus();
                      } else {
                        customInput.value = e.target.value;
                        setManualForm({...manualForm, prefix: e.target.value});
                      }
                    }}
                  >
                    <option value="">-- เลือก --</option>
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="พระ">พระ</option>
                    <option value="พระครู">พระครู</option>
                    <option value="other">อื่นๆ (พิมพ์ระบุ)</option>
                  </select>
                  <input 
                    id="custom_prefix" type="text" placeholder="ระบุคำนำหน้า..." 
                    className="w-1/2 bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500" 
                    value={manualForm.prefix}
                    onChange={(e) => setManualForm({...manualForm, prefix: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">ชื่อ (หรือ ฉายา)</label>
                <input 
                  type="text" placeholder="ระบุชื่อ..." 
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500" 
                  value={manualForm.firstName}
                  onChange={(e) => setManualForm({...manualForm, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">นามสกุล <span className="text-gray-600 font-normal">(เว้นว่างได้หากเป็นพระ)</span></label>
                <input 
                  type="text" placeholder="ระบุนามสกุล..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500" 
                  value={manualForm.lastName}
                  onChange={(e) => setManualForm({...manualForm, lastName: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide text-cyan-400">เบอร์โทรศัพท์ (ช่วยยืนยันตัวตน)</label>
                <input 
                  type="text" placeholder="เช่น 081-234-5678"
                  className="w-full bg-black border border-cyan-900/50 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" 
                  value={manualForm.phoneNumber}
                  onChange={(e) => setManualForm({...manualForm, phoneNumber: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">หน่วยงาน / วัดที่สังกัด</label>
                <input 
                  type="text" placeholder="เช่น สำนักงานศึกษาธิการ หรือ วัด..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500" 
                  value={manualForm.organization}
                  onChange={(e) => setManualForm({...manualForm, organization: e.target.value})}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">ตำแหน่ง</label>
                <input 
                  type="text" placeholder="เช่น ผู้อำนวยการ, เจ้าอาวาส..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500" 
                  value={manualForm.position}
                  onChange={(e) => setManualForm({...manualForm, position: e.target.value})}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide">เกียรติประวัติ / ข้อมูลสำหรับการประกาศ</label>
                <textarea 
                  rows={3} placeholder="ข้อมูลสำคัญที่พิธีกรต้องใช้อ่านประกาศเกียรติคุณ..."
                  className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-fuchsia-500 resize-none custom-scrollbar" 
                  value={manualForm.honorsInfo}
                  onChange={(e) => setManualForm({...manualForm, honorsInfo: e.target.value})}
                />
              </div>

              {/* อัปโหลดรูปภาพ */}
              <div className="space-y-2 md:col-span-2 bg-gray-950/50 p-6 rounded-2xl border border-gray-800 border-dashed">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wide flex items-center mb-2">
                  รูปภาพประจำตัว (Profile Picture) <span className="ml-2 text-[10px] text-fuchsia-400 font-normal bg-fuchsia-900/30 px-2 py-0.5 rounded">สำหรับขึ้นจอ LED</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-black border border-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {manualForm.profileImage ? (
                      <img src={URL.createObjectURL(manualForm.profileImage)} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-600 text-xs">No Image</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" accept="image/*"
                      className="w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-gray-800 file:text-cyan-400 hover:file:bg-gray-700 transition-colors cursor-pointer"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setManualForm({...manualForm, profileImage: e.target.files[0]});
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => handleSaveManualData(false)} 
                className="bg-fuchsia-700 hover:bg-fuchsia-600 text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(192,38,211,0.3)] transition-colors flex items-center"
              >
                <Save className="w-5 h-5 mr-2"/> บันทึกข้อมูล
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 🌟 MODAL: ตรวจสอบรายชื่อซ้ำ */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-amber-500/10 p-6 flex flex-col items-center border-b border-amber-500/20 text-center">
              <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <UserCheck size={32} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">พบรายชื่อนี้ในระบบแล้ว</h3>
              <p className="text-sm text-gray-300">ระบบพบว่ามีข้อมูลของ <span className="font-bold text-amber-400">"{manualForm.firstName} {manualForm.lastName}"</span> อยู่ในฐานข้อมูลแล้ว นี่คือบุคคลเดียวกันหรือไม่?</p>
            </div>
            
            <div className="p-6 bg-gray-950/50">
              <p className="text-xs text-gray-500 font-bold uppercase mb-3">ข้อมูลในระบบเดิม:</p>
              <div className="space-y-3 mb-6 max-h-48 overflow-y-auto custom-scrollbar">
                {duplicateProfiles.map((profile) => (
                  <div key={profile.id} className="bg-gray-900 border border-gray-700 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{profile.first_name} {profile.last_name}</p>
                      <p className="text-xs text-gray-400 mt-1">{profile.organization || 'ไม่ระบุหน่วยงาน'}</p>
                      <p className="text-xs text-cyan-400 mt-1">📞 {profile.phone_number || 'ไม่มีเบอร์โทร'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 block mb-1">NiiVaa Code</span>
                      <span className="bg-gray-800 border border-gray-600 px-2 py-1 rounded text-xs font-mono text-gray-300">{profile.niivaa_code}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDuplicateModal(false)}
                  className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  ยกเลิก (ใช้ข้อมูลเดิม)
                </button>
                <button 
                  onClick={() => handleSaveManualData(true)}
                  className="py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(217,119,6,0.4)]"
                >
                  ยืนยันสร้างรหัสใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// 🌟 สร้างหน้าหลักห่อด้วย Suspense เพื่อป้องกัน Next.js 15 Hydration Error
export default function AttendeeImportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-500">
        <Database className="w-12 h-12 mb-4 animate-pulse" />
        <p className="font-bold">กำลังเตรียมฐานข้อมูล VIP...</p>
      </div>
    }>
      {/* 🌟 หุ้มด้วย RouteGuard และให้สิทธิ์ admin, mc และ registration ไว้ด้านใน Suspense */}
      <RouteGuard allowedRoles={['admin', 'mc', 'registration']}>
        <AttendeeImportContent />
      </RouteGuard>
    </Suspense>
  );
}