"use client";

import React, { useEffect, useState ,Suspense} from "react";
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {LayoutGrid,} from 'lucide-react';

function DocumentManagerDashboardContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');

  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // State สำหรับแชร์ลิงก์
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [pinExpiryHours, setPinExpiryHours] = useState(24); // ค่าเริ่มต้น 24 ชั่วโมง
  const [shareInfo, setShareInfo] = useState<{ pin: string, link: string } | null>(null);

  useEffect(() => {
    if (eventId) fetchDocuments();
  }, [eventId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('event_id', eventId)
        .order('page_number', { ascending: true });
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`แน่ใจหรือไม่ว่าต้องการลบหน้า "${title}"?`)) {
      try {
        await supabase.from('documents').delete().eq('id', id);
        fetchDocuments();
      } catch (error) {
        alert("เกิดข้อผิดพลาดในการลบ");
      }
    }
  };

  // นำไปสู่หน้า Article แบบ "มี doc_id" เพื่อดึงข้อมูลเดิมมาแก้ไข
  const handleEditPage = (id: string) => window.location.href = `/events/event-dashboard/annual-report/article?event_id=${eventId}&doc_id=${id}`;
  const handleOpenBookViewer = () => window.open(`/events/event-dashboard/annual-report/book-viewer?event_id=${eventId}`, '_blank');

  // ฟังก์ชันสร้าง PIN และ Link แชร์
  const generateShareLink = async () => {
    if (!eventId) return alert('ไม่พบรหัสงาน');

    // สร้าง PIN 6 หลัก
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + pinExpiryHours); // บวกเวลาตามที่แอดมินเลือก

    try {
      // อัปเดตลงตาราง events (ต้องแน่ใจว่าตาราง events มี 2 คอลัมน์นี้แล้ว)
      const { error } = await supabase.from('events').update({
        share_pin: newPin,
        share_expiry: expiry.toISOString()
      }).eq('id', eventId);

      if (error) throw error;

      // สร้าง Link ที่แนบ Parameter shared=true ไปด้วย (ให้ PinGuard จับ)
      const link = `${window.location.origin}/events/event-dashboard/annual-report/article?event_id=${eventId}&shared=true`;
      setShareInfo({ pin: newPin, link });
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการสร้างลิงก์แชร์ รบกวนตรวจสอบตาราง events ว่ามีคอลัมน์ share_pin หรือไม่');
    }
  };

  const copyToClipboard = () => {
    if (shareInfo) {
      navigator.clipboard.writeText(`ลิงก์สำหรับเขียนรายงาน:\n${shareInfo.link}\n\nรหัสเข้าใช้งาน (PIN): ${shareInfo.pin}`);
      alert("คัดลอกข้อมูลสำเร็จ ส่งให้ทีมงานได้เลย");
    }
  };

  if (!eventId) return <div className="p-10 text-center text-red-500 font-bold">ไม่พบรหัส Event ID</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans pb-20 text-slate-200">

      {/* --- Top Navbar --- */}
      <div className="flex justify-between items-center px-8 py-4 border-b border-slate-800 bg-[#0f172a] sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <img src="/niivaasmartevent_logo.png" alt="Logo" className="h-10 w-auto object-contain bg-white/10 p-1 rounded" />
          <h1 className="text-xl font-bold text-white tracking-wide">จัดการรายงานประจำปี <span className="text-teal-500 text-sm font-normal ml-2">ID: {eventId.split('-')[0]}</span></h1>
        </div>
        <Link
          href={`/events/event-dashboard/${eventId}`}
          className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
        >
          <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
        </Link>

        <button onClick={() => setIsManualOpen(true)} className="flex items-center gap-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-bold transition-all border border-slate-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          คู่มือใช้งาน
        </button>
      </div>

      {/* --- Action Bar --- */}
      <div className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-end mt-4">
        <div>
          <h2 className="text-2xl font-black text-white">ลำดับหน้าเอกสาร ({documents.length} หน้า)</h2>
          <p className="text-slate-400 text-sm mt-1">ทีมงานแก้ไขข้อมูลล่าสุด: {documents.length > 0 ? new Date(documents[documents.length - 1].updated_at || documents[documents.length - 1].created_at).toLocaleString('th-TH') : '-'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 bg-teal-600/20 text-teal-400 border border-teal-500/50 px-4 py-2.5 rounded-xl font-bold hover:bg-teal-600 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
            สร้างลิงก์แชร์ + PIN
          </button>
          <button onClick={handleOpenBookViewer} className="flex items-center gap-2 bg-teal-500 text-slate-900 px-5 py-2.5 rounded-xl font-black hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
            รวมเล่ม PDF
          </button>
        </div>
      </div>

      {/* --- List Cards (แบบแถวแนวยาว) --- */}
      <div className="max-w-5xl mx-auto px-6">
        {isLoading ? (
          <div className="text-center py-20 text-slate-500">กำลังโหลดข้อมูล...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 text-slate-400">
            ยังไม่มีเอกสาร กดแชร์ลิงก์ให้ทีมงานเริ่มเขียนได้เลย
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {documents.map((doc, index) => {
              // สลับสี Border ด้านซ้าย และสีชื่อ ให้เหมือนตัวอย่าง
              const isEven = index % 2 === 0;
              const borderColor = isEven ? "border-teal-400" : "border-amber-500";
              const titleColor = isEven ? "text-teal-400" : "text-amber-500";

              return (
                <div key={doc.id} className={`bg-[#1e293b] rounded-2xl border-l-[6px] ${borderColor} p-4 flex flex-col md:flex-row md:items-center justify-between shadow-lg hover:bg-slate-800 transition-colors`}>

                  <div className="flex items-center gap-6 mb-4 md:mb-0">
                    <div className={`text-2xl font-black ${titleColor} w-10 text-center`}>{doc.page_number}</div>

                    {/* Thumbnail ภาพผู้เขียน */}
                    <div className="relative shrink-0">
                      <img src={doc.author_img_url || 'https://via.placeholder.com/150'} className="w-14 h-14 rounded-full object-cover border-2 border-slate-600" alt="author" />
                      {/* จุดไข่ปลาจำลองสถานะ */}
                      <span className={`absolute top-0 right-0 w-3.5 h-3.5 border-2 border-[#1e293b] rounded-full ${isEven ? 'bg-teal-400' : 'bg-amber-500'}`}></span>
                    </div>

                    <div className="flex flex-col">
                      <h3 className={`font-bold text-lg tracking-wide ${titleColor}`}>{doc.author}</h3>
                      <p className="text-slate-400 text-sm truncate max-w-sm md:max-w-md mt-0.5">{doc.title}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 md:ml-4">
                    <button onClick={() => handleEditPage(doc.id)} className="bg-slate-700 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                      แก้ไข
                    </button>
                    <button onClick={() => handleDelete(doc.id, doc.title)} className="bg-slate-700 hover:bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= Modal สำหรับแชร์ลิงก์และกำหนดเวลา ================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h3 className="font-bold text-lg text-teal-400 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                สร้างลิงก์สำหรับทีมงาน
              </h3>
              <button onClick={() => { setIsShareModalOpen(false); setShareInfo(null); }} className="text-slate-400 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>

            <div className="p-6">
              {!shareInfo ? (
                <>
                  <label className="block text-slate-300 text-sm font-bold mb-2">กำหนดระยะเวลาเข้าใช้งาน (ชั่วโมง)</label>
                  <select value={pinExpiryHours} onChange={(e) => setPinExpiryHours(Number(e.target.value))} className="w-full bg-slate-900 text-white border border-slate-600 p-3 rounded-xl focus:border-teal-500 mb-6">
                    <option value={1}>24 ชั่วโมง (1 วัน)</option>
                    <option value={6}>48 ชั่วโมง (2 วัน)</option>
                    <option value={24}>72 ชั่วโมง (3 วัน)</option>
                    <option value={72}>168 ชั่วโมง (7 วัน)</option>
                    <option value={168}>360 ชั่วโมง (15 วัน)</option>
                    <option value={168}>720 ชั่วโมง (1 เดือน)</option>
                  </select>
                  <button onClick={generateShareLink} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-colors">
                    สร้างรหัส PIN & ลิงก์
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-slate-400 mb-2">รหัส PIN สำหรับเข้าเขียนเอกสาร (อายุ {pinExpiryHours} ชม.)</p>
                  <div className="text-5xl font-black text-teal-400 tracking-widest mb-6 bg-slate-900 py-4 rounded-xl border border-slate-700">
                    {shareInfo.pin}
                  </div>
                  <button onClick={copyToClipboard} className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl mb-3 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    คัดลอกข้อมูลทั้งหมด
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Drawer คู่มือ (คงโครงสร้างเดิมที่ให้ไปรอบที่แล้ว แต่ปรับสีให้เข้าชุด) --- */}
      <div className={`fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${isManualOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsManualOpen(false)}></div>
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-700 ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <h2 className="text-xl font-black text-teal-400">คู่มือ Admin</h2>
          <button onClick={() => setIsManualOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          <p><strong>การแชร์ลิงก์:</strong> กด "สร้างลิงก์แชร์ + PIN" กำหนดอายุ PIN แล้วก๊อปปี้ส่งให้ทีมงาน</p>
          <p><strong>การแก้ไข:</strong> หากพบคำผิด แอดมินสามารถกดปุ่ม "แก้ไข" ที่การ์ดเพื่อเข้าไปแก้เอกสารแทนลูกทีมได้ทันที</p>
          <p><strong>การพิมพ์รวมเล่ม:</strong> กดปุ่มสีเขียวด้านบนเพื่อแปลงหน้าทั้งหมดที่แสดงเป็นไฟล์ PDF เล่มเดียว</p>
        </div>
      </div>

    </div>
  );
}
// ==========================================
// 🚀 Component หลักที่ Export (เอา Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function DocumentManagerDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดเครื่องมือออกแบบปก...</div>}>
      {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้ได้เลยครับ */}
      <DocumentManagerDashboardContent />
    </Suspense>
  );
}