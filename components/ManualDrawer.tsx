import React from 'react';
import { 
  X, Search, Mic, Settings, Zap, ListMusic, MonitorPlay, 
  Keyboard, Play, Trash2, Headphones, Link, Info
} from 'lucide-react';

interface ManualDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManualDrawer({ isOpen, onClose }: ManualDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-[#0f172a] h-full shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-lg">
              <Info className="text-cyan-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">คู่มือการใช้งาน</h2>
              <p className="text-sm text-cyan-400/80">NiiVaa SmartKaraoke Player</p>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

          {/* 1. เริ่มต้นใช้งาน */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <ListMusic size={20} /> 1. การเริ่มต้นและจัดการชุดเพลง
            </h3>
            <div className="bg-white/5 rounded-xl p-4 text-gray-300 text-sm space-y-3 leading-relaxed">
              <p>ระบบบริหารจัดการสื่อทุกประเภทรวมถึงซาวด์ดนตรีคาราโอเกะจาก YouTube</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>การเริ่มใช้งาน ต้องสร้างอัลบั้มหรือชื่อชุดเพลงก่อน ที่หน้า <strong>สร้างชุดเพลงใหม่</strong></li>
                <li>คลิกปุ่ม <button className="px-3 py-1 bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-cyan-400 rounded-lg text-xs mx-1 font-bold uppercase tracking-wide shadow-sm">+ Create Playlist</button> เพื่อเริ่มต้น</li>
                <li>เมื่อเปิดหน้า Player ขึ้นมา (หรือรีเฟรช) ระบบจะล้างคิวค้างเก่า และเข้าสู่ <strong>Standby Mode (เล่นวิดีโอโปรโมท)</strong> อัตโนมัติ</li>
              </ul>
            </div>
          </section>

          {/* 2. การค้นหาและเพิ่มคิว */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Search size={20} /> 2. การค้นหาและเพิ่มสื่อเข้าคิว
            </h3>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 space-y-3">
                <p className="font-bold text-white border-b border-white/10 pb-2">สลับโหมดการค้นหา</p>
                <div className="flex items-center gap-3">
                  <button className="p-2 bg-blue-900/50 text-blue-400 border border-blue-500/30 rounded-lg"><Mic size={16}/></button>
                  <span><strong>รูปไมค์:</strong> ค้นหาเฉพาะ "ซาวด์ดนตรีคาราโอเกะ"</span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="p-2 bg-purple-900/50 text-purple-400 border border-purple-500/30 rounded-lg"><Headphones size={16}/></button>
                  <span><strong>รูปหูฟัง:</strong> ค้นหาเฉพาะ "สื่อหรือเพลงที่มีเสียงร้องต้นฉบับ"</span>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 space-y-4">
                <p className="font-bold text-white border-b border-white/10 pb-2">4 รูปแบบการป้อนคำค้นหา</p>
                
                <div className="space-y-3">
                  <p><strong>1. พิมพ์ข้อความ:</strong> พิมพ์ในช่องค้นหาและเลือกผลลัพธ์</p>
                  
                  <div className="p-3 bg-black/40 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <button className="p-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-full"><Mic size={16}/></button>
                      <strong>2. สั่งงานด้วยเสียง (ไมค์สีแดง - ค้นหาทั่วไป)</strong>
                    </div>
                    <p className="text-xs text-gray-400 ml-10">พูดชื่อเพลง/นักร้อง เลื่อนดูผลลัพธ์ด้านล่าง หากคลิกเลือกจะมีเมนู Pop-up ขึ้นมา:<br/>
                    <span className="text-emerald-400">ปุ่มสีเขียว (แทรกเข้าคิว)</span> เพลงจะไปต่อท้ายคิว<br/>
                    <span className="text-blue-400">ปุ่มสีฟ้า (แทรกเล่นทันที)</span> เพลงจะลัดคิวเล่นทันที</p>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <button className="p-2 bg-orange-500/20 text-orange-400 border border-orange-500/50 rounded-full"><Mic size={16}/></button>
                      <strong>3. สั่งงานด้วยเสียง (ไมค์สีส้ม - คำสั่งลัด)</strong>
                    </div>
                    <p className="text-xs text-gray-400 ml-10">
                      พูดชื่อเพลงตามด้วยคำสั่ง:<br/>
                      - "ขอบคุณแฟนเพลง <strong>เล่นเลย</strong>" (สุ่มหาที่ตรงที่สุดและเล่นทันที)<br/>
                      - "ขอบคุณแฟนเพลง <strong>ต่อคิว</strong>" (นำไปต่อคิวให้ทันที)
                    </p>
                  </div>

                  <div className="p-3 bg-black/40 rounded-lg border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <button className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-full"><Mic size={16}/></button>
                      <strong>4. สั่งงานด้วยเสียง (ไมค์สีเขียว - กระชับ ฉับไว)</strong>
                    </div>
                    <p className="text-xs text-gray-400 ml-10">พูดคำค้นกระชับ (เช่น "หนุ่มทุ่งกระโจมทอง เสรี") ระบบจะจับรายการที่ตรงที่สุดเล่นทันที</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                  <button className="px-3 py-1.5 bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs flex items-center gap-1">
                    <Link size={14}/> เพิ่มลิงก์สำรอง
                  </button>
                  <p className="text-xs text-gray-400">ใช้เมื่อค้นหาไม่พบ ให้นำ URL จาก YouTube มาวางโดยตรง</p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. การจัดการคิว */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <ListMusic size={20} /> 3. การจัดการคิวเพลง (Queue)
            </h3>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>เลื่อนคิว (ย้ายลำดับ):</strong> ทำได้ 2 วิธี คือ 1. คลิกที่ตัวเลขหน้าคิวเพื่อพิมพ์เลขใหม่ หรือ 2. ลากแล้ววาง (Drag and Drop)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>ลัดคิวเล่นทันที:</strong> ดับเบิ้ลคลิกที่ชื่อเพลงในคิว</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span><strong>ลบเพลงออก:</strong> คลิกปุ่มถังขยะ <Trash2 size={14} className="inline text-red-400 mx-1"/> ด้านขวาของชื่อเพลง</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 4. SME (Smart Media Edit) */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Settings size={20} /> 4. เครื่องมือตัดต่อเพลงเฉพาะกิจ (SME)
            </h3>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 space-y-3">
              <p>คลิกปุ่มฟันเฟือง <Settings size={14} className="inline text-gray-400 mx-1"/> ด้านขวาของชื่อเพลงเพื่อตั้งค่าอย่างละเอียด:</p>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li><strong className="text-white">ชื่อเฉพาะ (Alias):</strong> ตั้งชื่อเวอร์ชันให้จำง่าย (เช่น บทนำ, ท่อนฮุค)</li>
                <li><strong className="text-white">ตัดตอนเริ่ม (Start):</strong> กำหนดวินาทีที่ต้องการให้เริ่มเล่น</li>
                <li><strong className="text-white">ตัดท้ายทิ้ง (Cut Tail):</strong> ระบุ "จำนวนวินาทีที่ต้องการตัดทิ้ง" ระบบจะคำนวณจุดจบให้ทันที</li>
                <li><strong className="text-white">ข้ามท่อนกลาง (Skip):</strong> กำหนดช่วงเวลา (เริ่ม-จบ) ที่ต้องการข้ามเนื้อเรื่อง/อินโทร</li>
                <li><strong className="text-white">เล่นซ้ำ (Repeat):</strong> สั่งให้เพลงวนลูปกี่รอบก็ได้ (เช่น เพลงเดินแบบ) ระบบจะลดจำนวนรอบลงเรื่อยๆ จนครบ</li>
                <li><strong className="text-white">หมวดหมู่:</strong> จัดกลุ่ม (ลูกทุ่ง, สากล) เพื่อง่ายต่อการค้นหา</li>
              </ul>
              <p className="text-xs text-amber-400/80 mt-2">* การตั้งค่าจะมีผลเมื่อเริ่มเล่นเพลงนั้นใหม่ในครั้งถัดไป</p>
            </div>
          </section>

          {/* 5. Auto DJ */}
          <section>
            <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Zap size={20} /> 5. ระบบ Auto DJ (ออโต้ดีเจ)
            </h3>
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-4 text-sm text-gray-300 space-y-4">
              <p>ระบบดีเจส่วนตัว ป้องกันแอร์เดด (ความเงียบ) โดยสุ่มเพลงมาเปิดให้อัตโนมัติเมื่อคิวว่าง</p>
              <div className="flex items-center gap-4 p-3 bg-black/40 rounded-lg">
                <button className="p-3 rounded-xl border-2 border-amber-500 text-amber-400 shadow-[0_0_15px_#f59e0b] shrink-0">
                  <Zap size={24} />
                </button>
                <p className="text-xs">คลิกที่ปุ่ม Auto DJ ที่แผงควบคุมเพื่อให้ปุ่มเรืองแสงสีเหลืองอำพัน พร้อมเสียง AI ตอบรับ</p>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-xs text-gray-400">
                <li><strong className="text-white">ทำงานตอนไหน?:</strong> 1. เมื่อคิวเพลงสุดท้ายเล่นจบ 2. เมื่อวิดีโอสแตนด์บายเล่นจบ 1 ลูป</li>
                <li><strong className="text-white">Smart Selection:</strong> ระบบจะเลือกเพลงให้ตรงกับโหมด (ถ้าอยู่โหมดคาราโอเกะ จะสุ่มเฉพาะเพลงคาราโอเกะ)</li>
              </ul>
            </div>
          </section>

          {/* 6. หน้าต่างลอย & ข้อความวิ่ง */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <MonitorPlay size={20} /> 6. การแสดงผล & หน้าต่างลอย (PiP)
            </h3>
            
            <div className="space-y-4">
              {/* PiP */}
              <div className="bg-fuchsia-950/20 border border-fuchsia-500/20 rounded-xl p-4 text-sm text-gray-300">
                <div className="flex items-center gap-4 mb-2">
                  <button className="p-3 rounded-xl border-2 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_15px_#d946ef] shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="14" x="3" y="8" rx="2" ry="2" /><line x1="15" x2="21" y1="2" y2="8" /><line x1="21" x2="21" y1="2" y2="8" /><line x1="15" x2="15" y1="2" y2="2" /></svg>
                  </button>
                  <div>
                    <strong className="text-white">โหมดหน้าต่างลอย (Picture-in-Picture)</strong>
                    <p className="text-xs text-gray-400 mt-1">กดปุ่มสีชมพูบานเย็น วิดีโอจะเด้งออกเป็นหน้าต่างลอย สามารถพับหน้าเว็บไปทำงานอื่นได้โดยที่เพลงไม่ดับ (รองรับ Chrome, Edge, Safari ล่าสุด)</p>
                  </div>
                </div>
              </div>

              {/* ข้อความวิ่ง */}
              <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 space-y-2">
                <strong className="text-white block mb-2">ข้อความวิ่งอัจฉริยะ & แจ้งเตือนคิว</strong>
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-400">
                  <li><strong>Next Tracks Popup:</strong> แสดงปุ่ม 2 คิวถัดไป พร้อมชื่อ "ผู้จองคิวขับร้อง" สีเหลืองอำพัน</li>
                  <li><strong>Marquee ปกติ:</strong> ข้อความต้อนรับสีฟ้า วิ่งความเร็วมาตรฐาน</li>
                  <li><strong>Marquee เตือนคิว:</strong> 15 วินาทีสุดท้ายก่อนจบเพลง จะสลับเป็น <span className="text-yellow-100 bg-black/50 px-1 rounded">✨ 3 คิวถัดไป ✨</span> (สีเหลืองนวล) เป็นเวลา 40 วินาที</li>
                  <li>ปุ่ม <span className="text-white">Announce ON/OFF</span> ใช้เปิด/ปิดการแสดงข้อความวิ่ง</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 7. ปุ่มลัด */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Keyboard size={20} /> 7. คีย์ลัด (Keyboard Shortcuts)
            </h3>
            <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-cyan-400 font-mono text-xs shadow">Home</kbd>
                  <span className="text-xs">เริ่มเพลงใหม่ (จุด Start)</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-cyan-400 font-mono text-xs shadow">End</kbd>
                  <span className="text-xs">ข้ามไปเพลงถัดไป (Skip)</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-cyan-400 font-mono text-xs shadow">ESC</kbd>
                  <span className="text-xs">ปิดหน้าต่างการค้นหา/ตั้งค่า</span>
                </div>
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-cyan-400 font-mono text-xs shadow">Fn + F11</kbd>
                  <span className="text-xs">เข้า/ออก โหมดเต็มจอ Window</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}