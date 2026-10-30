'use client'; // <-- เพิ่มบรรทัดนี้

import React, { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UploadCloud, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RosterImport() {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // * สมมติว่านี่คือ ID ของหน่วยงานหลัก (สพม. หรือ อำเภอ) ที่กำลังใช้งานอยู่
  // ในการใช้งานจริง ควรดึงมาจากระบบ Login
  const currentOrgId = "11111111-2222-4333-8444-555555555555"; 

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        
        // 1. แยกบรรทัด (รองรับทั้ง Windows \r\n และ Mac/Linux \n)
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        
        // 2. แปลงข้อความเป็นรูปแบบ Object เพื่อส่งเข้า Supabase
        const uploadData = rows.map((row) => {
          const [agencyName, sequence] = row.split(','); // แยกคอลัมน์ด้วยเครื่องหมายจุลภาค (,)
          
          return {
            org_id: currentOrgId,
            agency_name: agencyName?.trim(),
            default_sequence: parseInt(sequence?.trim()) || 999
          };
        }).filter(item => item.agency_name); // กรองเอาเฉพาะแถวที่มีชื่อ

        // 3. นำเข้าข้อมูลจำนวนมาก (Bulk Insert)
        const { error } = await supabase
          .from('org_agency_rosters')
          .insert(uploadData);

        if (error) throw error;

        alert(`นำเข้าข้อมูลสำเร็จจำนวน ${uploadData.length} หน่วยงาน`);
        
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ โปรดตรวจสอบรูปแบบไฟล์ CSV (ห้ามมีหัวตาราง และใช้ลูกน้ำคั่น)');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = ''; // ล้างค่า input
      }
    };

    reader.readAsText(file); // เริ่มอ่านไฟล์
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-8">
      <div className="max-w-xl mx-auto">
        {/* ปุ่มย้อนกลับไปหน้า Dashboard */}
        <Link 
          href="/officialeventdashboard" 
          className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับไปหน้าจัดการคิว
        </Link>

        <div className="p-8 bg-gray-900 border border-gray-800 shadow-[0_0_20px_rgba(6,182,212,0.1)] rounded-2xl">
          <h3 className="text-2xl font-bold text-gray-100 mb-2 flex items-center">
            <UploadCloud className="w-6 h-6 mr-3 text-cyan-400" />
            นำเข้าทำเนียบหน่วยงาน
          </h3>
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            อัปโหลดไฟล์ตาราง Excel ที่บันทึกเป็นนามสกุล <strong className="text-gray-200">.CSV</strong> <br/>
            โดยไม่ต้องมีหัวตาราง และจัดข้อมูล 2 คอลัมน์ดังนี้: <br/>
            <span className="text-cyan-400 bg-cyan-950/30 px-3 py-1 rounded-md inline-block mt-2 border border-cyan-900/50">
              ชื่อหน่วยงาน <strong className="text-white">,</strong> ลำดับคิวมาตรฐาน
            </span>
          </p>

          {/* ซ่อน input file จริงๆ ไว้ และใช้ปุ่มสวยๆ กดเรียกแทน */}
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white text-lg font-medium rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
          >
            {isUploading ? (
              <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> กำลังนำเข้าข้อมูลเข้าสู่ระบบ...</>
            ) : (
              <><UploadCloud className="w-6 h-6 mr-3" /> เลือกไฟล์ .CSV นำเข้าข้อมูล</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}