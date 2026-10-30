// src/components/McShowtimeManualDrawer.tsx
"use client";

import React from 'react';
import { HelpCircle, X, MonitorUp, Clock, Users, ArrowUp, ArrowDown, Image as ImageIcon, Mic, UserPlus, Camera, AlertTriangle, MessageSquare, Filter } from 'lucide-react';

interface McShowtimeManualDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function McShowtimeManualDrawer({ isOpen, onClose }: McShowtimeManualDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-[#0b1430] h-full shadow-[-10px_0_40px_rgba(0,0,0,0.8)] border-l border-amber-500/30 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/50">
              <HelpCircle className="text-amber-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">คู่มือพิธีกรอเนกประสงค์</h2>
              <p className="text-xs text-amber-400 mt-0.5 uppercase tracking-widest">MC Showtime & VIP Manual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar text-sm text-zinc-300">
          
          <section>
            <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Users className="w-5 h-5" /> 1. วัตถุประสงค์และการจัดการรายชื่อ
            </h3>
            <div className="bg-black/30 rounded-xl p-5 border border-white/5 space-y-4">
              <ul className="space-y-2 text-zinc-300 mb-4">
                <li><strong className="text-white">1.</strong> อ่านรายชื่อ แนะนำแขกสำคัญ (VIP) พร้อมกับแสดงภาพกราฟิกสวยงามขึ้นหน้าจอเวที</li>
                <li><strong className="text-white">2.</strong> อ่านรายชื่อผู้ร่วมงานเพื่อจัดลำดับเข้าทำกิจกรรม เช่น รับเกียรติบัตร รับรางวัล</li>
                <li><strong className="text-white">3.</strong> ฉายสไลด์ (Auto Slideshow) วนแสดงภาพและข้อมูลผู้ร่วมงาน <br/>
                <span className="text-xs text-cyan-400 mt-1 inline-block">🔗 หน้าจอเวที: localhost:3000/eventdashboard/live/[event_id]</span></li>
              </ul>

              {/* คำเตือนเรื่องการ Filter */}
              <div className="bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded-r-lg">
                <strong className="text-white flex items-center gap-1.5 mb-1"><Filter size={14}/> คำเตือนก่อนเริ่มงาน!</strong>
                <p className="text-xs text-blue-200">ตรวจสอบให้แน่ใจว่าพิธีกรได้เลือก <strong className="text-amber-400">"กรองหมวดหมู่รายชื่อ"</strong> (ปุ่มมุมซ้ายบน) ให้ตรงกับจุดประสงค์ที่กำลังจะใช้งานแล้ว เพื่อป้องกันการอ่านชื่อผิดกลุ่มครับ</p>
              </div>

              <ul className="space-y-4 pt-2">
                <li className="flex gap-3 items-start">
                  <div className="flex flex-col gap-0.5 shrink-0 mt-0.5 bg-black/50 p-1 rounded border border-white/10">
                    <ArrowUp size={12} className="text-zinc-400"/>
                    <ArrowDown size={12} className="text-zinc-400"/>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">การเรียงลำดับรายชื่อ (มีผลกับทุกเครื่อง)</strong>
                    หากต้องการเปลี่ยนลำดับ ให้ <strong className="text-amber-400">คลิกลูกศรสีดำเล็กๆ</strong> ด้านขวาของรายชื่อ (มีผลกับหน้าจอแอดมินลงทะเบียนแบบ Real-time ทันที!)
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/40 text-emerald-400 text-[10px] font-black shrink-0 mt-0.5 flex items-center gap-1">
                    <UserPlus size={12}/> เพิ่มชื่อด่วน
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">ปุ่มเพิ่มชื่อด่วน (VIP Walk-in)</strong>
                    ใช้ในกรณีที่แขก VIP Walk-in เข้ามาหน้างานโดยไม่ผ่านระบบลงทะเบียนหลัก สามารถกดปุ่มนี้เพื่อถ่ายภาพและพิมพ์ชื่อแทรกคิวได้ทันที
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-1.5 h-10 bg-gradient-to-b from-orange-500 to-emerald-500 rounded-full shrink-0"></div>
                  <div>
                    <strong className="text-white block mb-0.5">แถบสีสถานะ (ซ้ายมือของบอร์ดรายชื่อ)</strong>
                    ช่วยให้พิธีกรทราบว่าแขกมาถึงหรือยัง:
                    <br/><span className="text-orange-400 font-bold">• แถบสีส้ม = ยังไม่มา / รอเข้างาน</span>
                    <br/><span className="text-emerald-400 font-bold">• แถบสีเขียว = มาถึงแล้ว (Check-in แล้ว)</span>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-[#00E676] flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <MonitorUp className="w-5 h-5" /> 2. การควบคุมภาพขึ้นจอเวที (Stage Monitor)
            </h3>
            <div className="bg-black/30 rounded-xl p-5 border border-white/5 space-y-4">
              <ul className="space-y-4">
                <li className="flex gap-3 items-start">
                  <div className="bg-[#00E676] text-black px-2 py-1 rounded border border-emerald-500 text-[10px] font-black shrink-0 mt-0.5 flex items-center gap-1 shadow-[0_0_10px_rgba(0,230,118,0.4)]">
                    <MonitorUp size={12}/> ON AIR
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">ส่งภาพขึ้นจอ (On/Off)</strong>
                    หากเปิดสวิตช์เป็นโหมด <strong className="text-[#00E676]">ON AIR</strong> เมื่อพิธีกรแตะเปลี่ยนรายชื่อ ภาพจะไปโชว์ที่จอเวทีอัตโนมัติ
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="bg-zinc-800 p-1.5 rounded-lg border border-white/10 shrink-0 mt-0.5">
                    <ImageIcon className="text-amber-400 w-4 h-4"/>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">ขยายรูปภาพ (Image Popup)</strong>
                    คิวปัจจุบันด้านซ้ายมือ หากพิธีกรมองไม่ชัด สามารถ <strong className="text-amber-400">คลิกที่รูปภาพ</strong> เพื่อขยายภาพให้ใหญ่ขึ้น (Popup) แบบเต็มหน้าจอได้
                  </div>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="bg-purple-900/80 px-2 py-1.5 rounded border border-purple-600 text-purple-200 text-[10px] font-black shrink-0 mt-0.5 flex items-center gap-1">
                    ▶ เล่น
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">ปุ่มเล่นสไลด์โชว์อัตโนมัติ (Auto)</strong>
                    สำหรับเริ่มเล่นสไลด์รายชื่อในหมวดหมู่นั้นแบบต่อเนื่อง <strong>(เปลี่ยนรูปทุก 5 วินาที - ตั้งค่าเวลาได้)</strong> เมื่อกดเริ่มเล่น ระบบจะทำการ <strong className="text-cyan-400">เปิดเสียงเพลง Background Music เบาๆ</strong> ให้โดยอัตโนมัติ
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <AlertTriangle className="w-5 h-5" /> 3. ระบบสื่อสารกับทีมงาน (SM & Staff)
            </h3>
            <div className="bg-black/30 rounded-xl p-5 border border-white/5 space-y-4">
              <ul className="space-y-4 text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 px-2 py-1 rounded-xl text-[10px] font-black shrink-0 mt-0.5 flex items-center gap-1">
                    <Camera size={12}/> ส่งรูปหา SM
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">ปุ่มส่งรูปหา SM</strong>
                    กรณีเร่งด่วนที่ต้องการส่ง "ภาพเอกสารคิว", "ภาพบุคคล", หรือภาพใดๆ ไปยัง Stage Management (ผู้จัดการรันคิว) เพื่อช่วยตรวจสอบความถูกต้องอย่างรวดเร็ว
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-1 rounded-xl text-[10px] font-black shrink-0 mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={12}/> SOS
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">ปุ่ม SOS (ขอความช่วยเหลือ)</strong>
                    ใช้ส่งข้อความด่วนหา Staff สามารถเตรียมข้อความไว้ล่วงหน้า หรือพิมพ์/พูดข้อความสดใหม่ได้ ข้อความนี้จะไปแจ้งเตือนและโชว์บนแถบข้อความวิ่งของทุกหน้าจอทีมงาน
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-blue-600 p-2 rounded-full border border-blue-400/50 shrink-0 mt-0.5">
                    <MessageSquare size={14} className="text-white"/>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5">กล่องรับข้อความ (มุมขวาล่าง)</strong>
                    เปิดเพื่อดูประวัติข้อความย้อนหลังทั้งหมด พิธีกรสามารถ <strong className="text-emerald-400">กดรับทราบ (✅)</strong> เพื่อปิดข้อความที่ปฏิบัติตามเสร็จแล้ว ไม่ให้กวนใจบนแถบวิ่งด้านบนจอ
                  </div>
                </li>
              </ul>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}