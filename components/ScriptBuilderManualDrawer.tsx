"use client";

import React from 'react';
import { HelpCircle, X, Settings2, Mic, AlignLeft, Clock, Video, Save } from 'lucide-react';

interface ScriptBuilderManualDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================
// 📖 Component: Manual Drawer (คู่มือการใช้งาน)
// ==========================================
export default function ScriptBuilderManualDrawer({ isOpen, onClose }: ScriptBuilderManualDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-gray-950 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.8)] border-l border-purple-900/50 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-900/30 p-2.5 rounded-xl border border-purple-800/50">
              <HelpCircle className="text-purple-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">คู่มือการสร้างสคริปต์</h2>
              <p className="text-xs text-purple-400 mt-0.5">ระบบ Script Builder & Prompter</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar text-sm text-gray-300">
          
          <section>
            <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Settings2 className="w-5 h-5" /> 1. โหมดแก้ไขสคริปต์ (Script Editor)
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-4">
              <p className="text-gray-400">ใช้สำหรับร่างเค้าโครงพิธีการและกิจกรรมตลอดทั้งงาน โดยแบ่งเป็นหัวข้อย่อยแต่ละช่วง เรียกว่า <strong>"Script Block"</strong></p>
              
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <Mic className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">บทกล่าวหลัก (Main Script)</strong>
                    ข้อความที่พิธีกรต้องใช้อ่านจริงหน้างาน 
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-400">
                      <li>สามารถกด <code>Enter</code> เพื่อแบ่งย่อหน้าให้เป็นสัดส่วน</li>
                      <li><strong>เทคนิคพิเศษ:</strong> หากพิมพ์ข้อความไว้ในวงเล็บ เช่น <code>(โค้งคำนับ)</code> หรือ <code>(ปรบมือ)</code> ระบบจะปรับฟอนต์ให้เป็นตัวเอียง สีเทา และขนาดเล็กลงโดยอัตโนมัติ เพื่อแยกแยะว่าเป็นคิวกริยา ไม่ใช่คำพูด</li>
                      <li><strong>เทคนิคเน้นย้ำ:</strong> หากขึ้นต้นบรรทัดด้วยเครื่องหมายคำพูดเปิด <code>"</code> หรือ <code>“</code> ระบบจะแสดงจุด Bullet วงกลมสีน้ำเงินด้านหน้าข้อความให้อัตโนมัติ</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <AlignLeft className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-1">ข้อมูลสำรอง (Sub Script)</strong>
                    ข้อมูลขยายความ ประวัติ หรือประกาศเพิ่มเติม (พิธีกรสามารถเลือกพูดหรือไม่พูดก็ได้ ขึ้นอยู่กับเวลาและสถานการณ์หน้างาน)
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Clock className="w-5 h-5" /> 2. การตั้งเวลาและสลับลำดับคิว
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-3">
              <ul className="space-y-3 text-gray-400">
                <li>
                  <strong className="text-white">การรันเวลาอัตโนมัติ:</strong> กำหนดเวลาเริ่มต้นที่แผงควบคุมด้านบน (เช่น 08:00) และใส่ "เวลา (นาที)" ที่คาดว่าจะใช้ในแต่ละบล็อก ระบบจะคำนวณและรันเวลาเริ่มต้นของบล็อกถัดไปให้เองแบบอัติโนมัติ
                </li>
                <li>
                  <strong className="text-white">การสลับลำดับ (Reordering):</strong> กรณีหน้างานมีการสลับคิวฉุกเฉิน สามารถ <strong>กดปุ่มลูกศร ขึ้น/ลง ⬆️⬇️</strong> ข้างช่องลำดับที่ หรือ <strong>พิมพ์ตัวเลขลำดับใหม่</strong> ลงไปได้เลย สคริปต์จะถูกสลับตำแหน่งและคำนวณเวลาใหม่ทั้งตารางทันที
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-pink-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Video className="w-5 h-5" /> 3. การจัดการคิวเวทีและสื่อ
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-3">
               <ul className="space-y-3 text-gray-400">
                <li><strong className="text-white">ผู้พูด (Speaker):</strong> ระบุผู้รับผิดชอบการพูด เช่น MC1, MC2 หรือ <code>MC(Both)</code> สำหรับการกล่าวพร้อมกัน</li>
                <li><strong className="text-white">คิวเวที / เทคนิค (Details):</strong> คำสั่งประสานงานสำหรับทีมคุมเวที (Stage Manager) เช่น "เปิดไฟ Follow ประธาน", "เตรียมไมค์ 2 ตัวที่โพเดียม"</li>
                <li><strong className="text-white">การใช้สื่อ (Media):</strong> เลือกลักษณะสื่อ (วิดีโอ/เสียง/ภาพ) พร้อมแนบ URL และระบุ <strong>หมายเหตุการเปิดสื่อ (Visual/Audio Cue)</strong> เพื่อให้ทีมเทคนิคกดเพลย์สื่อได้ตรงจังหวะเป๊ะ</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
              <Save className="w-5 h-5" /> 4. การบันทึกและการพิมพ์
            </h3>
            <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 space-y-3">
              <ul className="space-y-3 text-gray-400">
                <li>
                  <strong className="text-emerald-400">การบันทึกข้อมูล (Save):</strong> เมื่อแก้ไข ปรับเวลา หรือสลับคิวเสร็จแล้ว <strong>ต้องกดปุ่ม "💾 บันทึกข้อมูล" ทุกครั้ง</strong> เพื่ออัปเดตข้อมูลขึ้น Cloud และส่งตรงไปยังหน้าจอ Prompter ของพิธีกรหน้างานทันที
                </li>
                <li>
                  <strong className="text-white">ตัวอย่างก่อนพิมพ์ (Preview):</strong> โหมดสำหรับตรวจสอบความเรียบร้อยของหน้ากระดาษ และสามารถสั่งพิมพ์ (Print) เป็น Hard Copy สำรองไว้ให้พิธีกรและทีมงานถือกรณีระบบอินเทอร์เน็ตหน้างานมีปัญหา
                </li>
              </ul>
            </div>
          </section>

        </div>
      </div>
      
      {/* Styles สำหรับ Scrollbar */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #6b21a8; border-radius: 4px; }
      `}</style>
    </div>
  );
}