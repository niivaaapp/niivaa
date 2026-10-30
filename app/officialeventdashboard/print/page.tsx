// app/officialeventdashboard/print/page.tsx
'use client';

import Link from 'next/link';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft, Users, Loader2, Download } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// กำหนด Type ของข้อมูล
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
}

// ==========================================
// 1. คอมโพเนนต์เนื้อหาหลัก (เปลี่ยนชื่อเป็น PrintReportContent)
// ==========================================
function PrintReportContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [agencies, setAgencies] = useState<Bearer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('event_ceremony_bearers')
        .select('*')
        .eq('event_id', eventId)
        .order('sequence_order', { ascending: true });

      if (!error && data) {
        setAgencies(data as Bearer[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [eventId]);

  // ฟังก์ชันสั่งพิมพ์ (บราวเซอร์จะเปิดหน้าต่าง Print ซึ่งสามารถเลือก "Save as PDF" ได้ด้วย)
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-cyan-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>กำลังเตรียมข้อมูลสำหรับพิมพ์...</p>
      </div>
    );
  }

  return (
    /* สังเกตคลาส print:bg-white print:text-black ที่จะทำงานเฉพาะตอนสั่งพิมพ์เท่านั้น */
    <div className="min-h-screen bg-gray-950 text-gray-200 print:bg-white print:text-black font-sans">
      {/* ================= HEADER & TOOLBAR (ซ่อนตอนพิมพ์) ================= */}
      <div className="print:hidden bg-gray-900 border-b border-gray-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-white hidden sm:block">
              ตัวอย่างก่อนพิมพ์ (Print Preview)
            </h1>
          </div>

          {/* กลุ่มปุ่มคำสั่ง */}
          <div className="flex items-center gap-3">
            {/* ปุ่มกลับไปแก้ไขจัดลำดับ */}
            <Link
              href="/officialeventdashboard/phan-phum-registration"
              className="flex items-center px-4 py-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 border border-blue-700/50 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              ลงทะเบียนและจัดลำดับ
            </Link>
          </div>
        </div>
      </div>
      {/* ========================================= */}
      {/* 1. แถบเครื่องมือ (จะถูกซ่อนเวลาสั่งพิมพ์ด้วย print:hidden) */}
      {/* ========================================= */}
      <div className="print:hidden sticky top-0 bg-gray-900 border-b border-gray-800 p-4 shadow-lg flex justify-between items-center z-10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center px-4 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> กลับไปหน้า Dashboard
        </button>

        <div className="flex space-x-4">
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all font-medium"
          >
            <Download className="w-5 h-5 mr-2" /> บันทึก PDF / พิมพ์
          </button>
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. พื้นที่กระดาษ (Printable Area) */}
      {/* ========================================= */}
      <div className="p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">

        {/* หัวกระดาษ */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-cyan-400 print:text-black mb-2">
            รายชื่อหน่วยงานและผู้แทนถวายเครื่องราชสักการะ (พานพุ่มทอง-พุ่มเงิน)
          </h1>
          <p className="text-gray-400 print:text-gray-800">
            ประจำวันที่ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* ตารางข้อมูล */}
        <table className="w-full border-collapse border border-gray-700 print:border-black text-sm">
          <thead>
            <tr className="bg-gray-800 print:bg-gray-200 text-gray-300 print:text-black">
              <th className="border border-gray-700 print:border-black py-3 px-2 w-16 text-center">ลำดับ</th>
              <th className="border border-gray-700 print:border-black py-3 px-4 w-64 text-left">หน่วยงาน / องค์กร</th>
              <th className="border border-gray-700 print:border-black py-3 px-4 text-left">รายชื่อผู้แทน (ผู้วาง / ผู้เชิญพุ่มทอง / ผู้เชิญพุ่มเงิน)</th>
              <th className="border border-gray-700 print:border-black py-3 px-4 w-32 text-center">หมายเหตุ<br /><span className="text-xs font-normal">(ตรวจสอบหน้างาน)</span></th>
            </tr>
          </thead>
          <tbody>
            {agencies.length === 0 ? (
              <tr>
                <td colSpan={4} className="border border-gray-700 print:border-black py-8 text-center text-gray-500">
                  ไม่มีข้อมูลรายชื่อ
                </td>
              </tr>
            ) : (
              agencies.map((agency) => (
                <tr key={agency.id} className="hover:bg-gray-900/50 print:hover:bg-transparent">

                  {/* คอลัมน์ 1: ลำดับ */}
                  <td className="border border-gray-700 print:border-black py-4 px-2 text-center font-bold text-lg">
                    {agency.sequence_order === 999 ? '-' : agency.sequence_order}
                  </td>

                  {/* คอลัมน์ 2: หน่วยงาน */}
                  <td className="border border-gray-700 print:border-black py-4 px-4 font-bold text-base text-cyan-300 print:text-black">
                    {agency.agency_name}
                  </td>

                  {/* คอลัมน์ 3: รายชื่อผู้แทน (รวมไว้ในคอลัมน์เดียว แยกบรรทัด) */}
                  <td className="border border-gray-700 print:border-black py-4 px-4 space-y-2">
                    <div>
                      <span className="font-semibold text-gray-300 print:text-gray-800 inline-block w-24">ผู้วางพานพุ่ม:</span>
                      <span className="text-gray-100 print:text-black">{agency.placer_name || '-'}</span>
                      {agency.placer_position && <span className="text-gray-400 print:text-gray-600 text-xs ml-2">({agency.placer_position})</span>}
                    </div>
                    <div>
                      <span className="font-semibold text-yellow-500 print:text-gray-800 inline-block w-24">ผู้เชิญพุ่มทอง:</span>
                      <span className="text-gray-100 print:text-black">{agency.gold_bearer_name || '-'}</span>
                      {agency.gold_bearer_position && <span className="text-gray-400 print:text-gray-600 text-xs ml-2">({agency.gold_bearer_position})</span>}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-400 print:text-gray-800 inline-block w-24">ผู้เชิญพุ่มเงิน:</span>
                      <span className="text-gray-100 print:text-black">{agency.silver_bearer_name || '-'}</span>
                      {agency.silver_bearer_position && <span className="text-gray-400 print:text-gray-600 text-xs ml-2">({agency.silver_bearer_position})</span>}
                    </div>
                  </td>

                  {/* คอลัมน์ 4: หมายเหตุ/จุดเช็คชื่อ */}
                  <td className="border border-gray-700 print:border-black py-4 px-4">
                    {/* พื้นที่ว่างสำหรับติ๊กถูกด้วยปากกา */}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 🚀 2. คอมโพเนนต์หลักที่ Export (หุ้ม Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function PrintReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-cyan-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>กำลังโหลดหน้าพิมพ์...</p>
      </div>
    }>
      <PrintReportContent />
    </Suspense>
  );
}