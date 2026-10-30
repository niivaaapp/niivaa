"use client";
import Link from 'next/link';
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Printer, ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

function GiftReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('event_id');
  const supabase = createClient();

  const [eventData, setEventData] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      try {
        // 1. ดึงข้อมูลอีเวนต์สำหรับหัวกระดาษ
        const { data: evt } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        if (evt) setEventData(evt);

        // 2. ดึงข้อมูลแขกสำหรับทำรายงานของที่ระลึกทั้งหมดของงานนี้
        const { data: att, error: attError } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('event_id', eventId);

        if (attError) throw attError;
        
        if (att) {
          // กรองเอาเฉพาะคนที่มีข้อมูลเกี่ยวกับของที่ระลึก
          const giftAttendees = att.filter(a => 
            (a.gift_number && String(a.gift_number).trim() !== '') || 
            (a.gift_image_url && String(a.gift_image_url).trim() !== '') || 
            (a.gift_style && String(a.gift_style).trim() !== '')
          );

          // เรียงลำดับตาม action_sequence (ถ้ามี)
          giftAttendees.sort((a, b) => {
            if (a.action_sequence !== null && b.action_sequence !== null) {
              return a.action_sequence - b.action_sequence;
            }
            if (a.action_sequence !== null) return -1;
            if (b.action_sequence !== null) return 1;
            return 0;
          });

          setAttendees(giftAttendees);
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, supabase]);

  // ฟังก์ชันสั่งพิมพ์
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center text-cyan-600">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-bold">กำลังจัดเตรียมหน้ารายงาน...</p>
      </div>
    );
  }

  // แปลงวันที่ให้อ่านง่าย
  const formattedDate = eventData?.event_date 
    ? new Date(eventData.event_date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : 'ไม่ได้ระบุวันที่';

  return (
    <>
      {/* CSS สำหรับการตั้งค่าหน้ากระดาษพิมพ์ */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}} />

      <div className="min-h-screen bg-gray-200 py-8 px-4 print:p-0 print:bg-white text-black font-sans">
        
        {/* แถบเครื่องมือ (ซ่อนตอนพิมพ์) */}
        <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
          <Link 
            href={`/eventdashboard/attendees?event_id=${eventId}`}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm font-bold text-gray-700 hover:bg-gray-50 transition border border-gray-200"
          >
            <ArrowLeft size={18} /> กลับไปหน้าผู้ร่วมงาน
          </Link>
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md font-bold transition"
          >
            <Printer size={18} /> พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>

        {/* กระดาษ A4 Container */}
        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[15mm] shadow-xl print:shadow-none print:m-0 print:p-0 relative">
          
          {/* Header รายงาน */}
          <header className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">บัญชีของที่ระลึก (Gift Registry)</h1>
              <div className="text-sm text-gray-700 space-y-0.5">
                <p><strong>ชื่องาน:</strong> {eventData?.title || '-'}</p>
                <p><strong>สถานที่:</strong> {eventData?.location_hotel || ''} {eventData?.location_province || ''}</p>
                <p><strong>วันที่:</strong> {formattedDate}</p>
              </div>
            </div>
            
            <div className="text-right flex flex-col items-end">
              <div className="flex items-center select-none mb-1">
                <img 
                  src="/niivaasmartevent_logo.png" 
                  alt="NiiVaa SmartEvent Logo" 
                  className="h-10 w-auto object-contain print:h-10" 
                />
              </div>
              <p className="text-xs text-gray-500 font-medium tracking-widest mt-1">niivaa.com</p>
            </div>
          </header>

          {/* Body รายการของที่ระลึก (แสดงแบบ 2 คอลัมน์) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            {attendees.map((attendee) => (
              <div 
                key={attendee.id} 
                className="flex gap-4 border border-gray-300 rounded-xl p-3 page-break-avoid bg-gray-50/50"
              >
                {/* ฝั่งซ้าย: รูปภาพ */}
                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center">
                  {attendee.gift_image_url ? (
                    <img 
                      src={attendee.gift_image_url} 
                      alt={`Gift for ${attendee.fullname}`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={24} className="mb-1 opacity-50" />
                      <span className="text-[10px]">ไม่มีภาพ</span>
                    </div>
                  )}
                </div>

                {/* ฝั่งขวา: ข้อมูล */}
                <div className="flex flex-col justify-center flex-1 text-sm">
                  <div className="font-bold text-gray-900 leading-tight mb-1">
                    {attendee.action_sequence && <span className="mr-1">{attendee.action_sequence}.</span>}
                    {attendee.prefix}{attendee.fullname}
                    {attendee.position && <span className="text-gray-600 font-normal ml-2">{attendee.position}</span>}
                  </div>

                  <div className="text-gray-600 text-xs mb-2 leading-tight">
                    {attendee.organization || '-'}
                  </div>

                  <div className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block w-fit text-xs border border-blue-100">
                    <span className="text-gray-800 font-normal mr-1">รหัส:</span> 
                    {attendee.gift_number || '-'} 
                    {attendee.gift_style && <span className="text-gray-600 ml-1 font-normal">({attendee.gift_style})</span>}
                  </div>
                </div>
              </div>
            ))}

            {attendees.length === 0 && (
              <div className="col-span-2 text-center py-10 text-gray-500">
                ไม่มีข้อมูลของที่ระลึกในระบบสำหรับงานนี้
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default function GiftRegistryReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-600" />
      </div>
    }>
      <GiftReportContent />
    </Suspense>
  );
}