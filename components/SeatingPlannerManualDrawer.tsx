import React from 'react';
import { 
  X, Info, LayoutTemplate, Settings, Users, ZoomIn, Search, 
  CheckCircle2, Coffee, Trash, BellRing, Droplet, Sparkles, 
  Save, ListOrdered, MousePointerClick, Zap, Armchair, Move
} from 'lucide-react';

interface SeatingPlannerManualDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SeatingPlannerManualDrawer({ isOpen, onClose }: SeatingPlannerManualDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel - ขยายความกว้างเป็น max-w-3xl ให้อ่านเนื้อหาได้เต็มตา */}
      <div className="relative w-full max-w-3xl bg-[#0a1128] h-full shadow-[-10px_0_30px_rgba(0,0,0,0.8)] border-l border-purple-500/30 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-purple-900/40 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-purple-500/20 p-2.5 rounded-xl border border-purple-500/30">
              <Info className="text-purple-400" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">คู่มือการใช้งานระบบ</h2>
              <p className="text-xs text-purple-400/80 mt-0.5">ศูนย์บริหารผังเก้าอี้ VIP (Dynamic Seating)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar text-sm text-gray-300">

          {/* 1. โครงสร้างและมุมมอง */}
          <section>
            <h3 className="text-lg font-black text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <LayoutTemplate size={20} /> 1. โครงสร้างและมุมมองผังที่นั่ง (Layout & View)
            </h3>
            <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5 space-y-3">
              <p className="mb-2 text-zinc-400">ระบบถูกออกแบบมาให้รองรับการจัดงานทุกขนาด ตั้งแต่งานขนาดเล็กไปจนถึง Hall ประชุมขนาดใหญ่:</p>
              <ul className="space-y-3 text-xs leading-relaxed text-zinc-300">
                <li className="flex items-start gap-2">
                  <Settings size={16} className="text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">กำหนดโซนที่นั่ง (Wing & Center)</strong>
                    ระบุความกว้าง (จำนวนเก้าอี้) และความลึก (จำนวนแถว) ของโซนปีกซ้าย, กลาง, และขวา ได้อย่างอิสระที่แผงควบคุมด้านบน หากโซนไหนไม่ใช้สามารถระบุเป็น 1 และกดย่อส่วนไว้ได้
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Move size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">ปลดล็อคจัดวางผัง (Unlock Layout)</strong>
                    คลิกปุ่ม <strong>"🔒 ปลดล็อคจัดวางผัง"</strong> เพื่อเข้าสู่โหมดแก้ไข ใช้เมาส์คลิกค้างที่ป้าย <span className="bg-amber-500 text-black px-1.5 rounded">จับเพื่อลาก</span> ของแต่ละโซน เพื่อลากย้ายตำแหน่งให้ตรงกับสถานที่จริง เมื่อจัดเสร็จแล้วให้คลิกปุ่มเดิมเพื่อล็อคผัง
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <ZoomIn size={16} className="text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">ย่อ/ขยายผัง (Zoom) และเปิด/ปิดโซน</strong>
                    ปรับสเกลซูมเข้า-ออกได้ละเอียดถึงระดับ 10% (0.1) และสามารถติ๊กเลือกแสดงผลเฉพาะโซนที่ต้องการโฟกัสจัดที่นั่งได้
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* 2. การจัดที่นั่ง */}
          <section>
            <h3 className="text-lg font-black text-blue-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Armchair size={20} /> 2. การจัดที่นั่งและการค้นหา (Seating & Search)
            </h3>
            <div className="space-y-4">
              <div className="bg-blue-950/10 rounded-xl p-5 border border-blue-500/20 text-zinc-300 text-xs leading-relaxed">
                <strong className="text-blue-400 text-sm block mb-2 border-b border-blue-500/20 pb-2">วิธีการนำรายชื่อลงที่นั่ง (3 รูปแบบ)</strong>
                <ul className="space-y-3 mt-3">
                  <li className="flex items-start gap-2">
                    <MousePointerClick size={16} className="text-white shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">1. จัดที่นั่งรายบุคคล (Manual):</strong> แตะที่รูปเก้าอี้บนผัง พิมพ์ค้นหาชื่อแขกในหน้าต่างที่ปรากฏ แล้วกดปุ่ม <strong>"เลือกนั่ง"</strong>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">2. จัดด่วนอัตโนมัติ (1-Click Auto Seat):</strong> คลิกปุ่ม <strong>"⚡ 1-Click Auto Seat"</strong> ระบบจะนำรายชื่อแขก VIP ที่ยังไม่มีที่นั่ง มาถมลงเก้าอี้ที่ว่างอยู่โดยอัตโนมัติ ตามลำดับความสำคัญ (Priority Level)
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <ListOrdered size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">3. จัดกลุ่มลงที่นั่งแบบละเอียด (Batch Seating):</strong> คลิกปุ่ม <strong>"จัดกลุ่มลงที่นั่ง (Batch)"</strong> เพื่อตั้งค่าการรันคิวขั้นสูง
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-zinc-400">
                        <li>กรองกลุ่มเป้าหมาย (เช่น เฉพาะ VIP หรือกลุ่มรับรางวัล)</li>
                        <li>ระบุจุดเริ่มต้นจัดที่นั่ง (เช่น ข้าม A ไปเริ่มที่ B1)</li>
                        <li>เลือก <strong>รูปแบบมาตรฐาน</strong> (ขึ้นแถวใหม่ฝั่งเดิม) หรือ <strong>สลับฟันปลา/งูเลื้อย</strong> (ขึ้นแถวใหม่แบบวนกลับ)</li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 flex items-start gap-3">
                <Search size={20} className="text-cyan-400 shrink-0 mt-1" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  <strong className="text-white text-sm block mb-1">การค้นหาที่นั่งของแขก (Find My Seat)</strong>
                  พิมพ์ชื่อแขกที่ช่องค้นหาด้านซ้ายมือ <strong>หากคลิกที่รายชื่อ</strong> (ของคนที่มีที่นั่งแล้ว) เก้าอี้ของแขกท่านนั้นบนผังจะ <strong className="text-cyan-400">เรืองแสงสีฟ้าและขยายขนาดขึ้น (Highlight) เป็นเวลา 4 วินาที</strong> เพื่อให้เจ้าหน้าที่มองเห็นพิกัดได้ทันที
                </p>
              </div>
            </div>
          </section>

          {/* 3. สถานะและเครื่องดื่ม */}
          <section>
            <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <CheckCircle2 size={20} /> 3. สถานะหน้างานและบริการเครื่องดื่ม
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* สถานะเข้างาน */}
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5 text-xs text-zinc-300">
                <strong className="text-white text-sm block mb-3 border-b border-white/10 pb-2">สถานะการเข้างาน (Live Presence)</strong>
                <div className="space-y-3">
                  <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-md bg-zinc-800 border border-zinc-600 shrink-0"></span> เก้าอี้ว่าง (ยังไม่ระบุชื่อ)</div>
                  <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-md bg-purple-600 border border-purple-400 shrink-0 shadow-[0_0_8px_rgba(147,51,234,0.5)]"></span> <strong>จอง/รอนั่ง</strong> (เจ้าตัวยังไม่มา)</div>
                  <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-md bg-emerald-600 border border-emerald-400 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> <strong className="text-emerald-400">มานั่งแล้ว</strong> (เข้าประจำที่)</div>
                  <div className="flex items-center gap-3"><span className="w-4 h-4 rounded-md bg-yellow-500 border border-yellow-300 shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.5)]"></span> <strong className="text-yellow-400">ลุกชั่วคราว</strong> (กันคนมานั่งทับ)</div>
                </div>
              </div>

              {/* เครื่องดื่ม */}
              <div className="bg-orange-950/10 rounded-xl p-5 border border-orange-500/20 text-xs text-zinc-300">
                <strong className="text-orange-400 text-sm block mb-3 border-b border-orange-500/20 pb-2">ระบบจัดการเครื่องดื่ม</strong>
                <div className="space-y-2.5 leading-relaxed">
                  <p>เมื่อคลิกที่เก้าอี้ จะมีเมนูสำหรับรับออเดอร์น้ำดื่มและกาแฟ:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2"><Coffee size={14} className="text-orange-400"/> <strong>ไอคอนส้มกระพริบ:</strong> สั่งแล้ว รอการเสิร์ฟ</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400"/> <strong>ไอคอนเขียว:</strong> เสิร์ฟเรียบร้อยแล้ว</li>
                  </ul>
                  <p className="mt-2 text-[11px] text-zinc-400 border-t border-white/5 pt-2">
                    *เมื่อดื่มเสร็จ กด <strong>"🧹 เก็บแก้วทั้งหมด"</strong> เพื่อซ่อนไอคอน<br/>
                    *หากมีเบรกรอบถัดไป กด <strong>"🔄 เริ่มเสิร์ฟรอบ 2"</strong> สถานะเครื่องดื่มจะรีเซ็ตกลับเป็นสีส้มรอเสิร์ฟอีกครั้ง
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. แจ้งเตือนเรียกพนักงาน */}
          <section>
            <h3 className="text-lg font-black text-rose-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <BellRing size={20} /> 4. ระบบแจ้งเตือนเรียกพนักงาน (Service Alerts)
            </h3>
            <div className="bg-rose-950/10 rounded-xl p-5 border border-rose-500/20">
              <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                หากแขกมีการกดปุ่มเรียกบริการ (จากมือถือ หรือพนักงานกดแทน) เก้าอี้บนผังจะ <strong>กระพริบเปลี่ยนสีอย่างชัดเจน</strong> พร้อมแสดงป้ายแจ้งเตือน (Pop-up) ที่ด้านบนหน้าจอ:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-blue-900/40 p-2.5 rounded-lg border border-blue-500/50 flex flex-col items-center text-center gap-1.5">
                  <Droplet size={18} className="text-blue-400"/>
                  <span className="text-blue-100">ขอน้ำดื่มเพิ่ม</span>
                </div>
                <div className="bg-zinc-800/80 p-2.5 rounded-lg border border-zinc-400 flex flex-col items-center text-center gap-1.5">
                  <Trash size={18} className="text-zinc-300"/>
                  <span className="text-zinc-100">เก็บภาชนะ/แก้ว</span>
                </div>
                <div className="bg-rose-900/40 p-2.5 rounded-lg border border-rose-500/50 flex flex-col items-center text-center gap-1.5">
                  <Sparkles size={18} className="text-rose-400"/>
                  <span className="text-rose-100">ทำความสะอาด</span>
                </div>
                <div className="bg-amber-900/40 p-2.5 rounded-lg border border-amber-500/50 flex flex-col items-center text-center gap-1.5">
                  <BellRing size={18} className="text-amber-400"/>
                  <span className="text-amber-100">เรียกพนักงาน</span>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-rose-300 text-center bg-rose-950/40 py-2 rounded-lg">
                *เมื่อพนักงานรับทราบปัญหา ให้กดปุ่ม <strong>"✅ รับเรื่อง"</strong> ที่ป้ายแจ้งเตือนด้านบน เพื่อดับไฟกระพริบที่เก้าอี้
              </p>
            </div>
          </section>

          {/* 5. การบันทึกและซิงค์ข้อมูล */}
          <section className="pb-8">
            <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Save size={20} /> 5. การบันทึกและซิงค์ข้อมูล (Save & Sync)
            </h3>
            <div className="bg-emerald-950/30 border border-emerald-500/50 p-5 rounded-2xl flex items-start gap-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
              <div className="p-3 bg-emerald-500/20 rounded-full shrink-0">
                <Save size={24} className="text-emerald-400" />
              </div>
              <div className="text-xs text-emerald-100 leading-relaxed">
                <strong className="text-sm text-emerald-300 block mb-1">สำคัญมาก! ห้ามลืมกดบันทึก</strong>
                ทุกครั้งที่มีการจัดที่นั่ง โยกย้าย โฟกัสคิว หรือล้างรายชื่อออกจากเก้าอี้ ข้อมูลจะยังคงอยู่แค่บนหน้าจอของคุณเท่านั้น <br/>
                คุณ <strong>ต้องกดปุ่ม "💾 บันทึกผัง" (ปุ่มสีเขียวด้านบน)</strong> เสมอ! การกดบันทึกจะเป็นการอัปเดตข้อมูลผังเก้าอี้เข้าสู่ฐานข้อมูลกลาง และซิงค์ข้อมูลที่นั่งไปยัง <strong>หน้าจอลงทะเบียน (Attendees)</strong> และ <strong>หน้าจอของพิธีกร (MC Prompter)</strong> แบบเรียลไทม์
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}