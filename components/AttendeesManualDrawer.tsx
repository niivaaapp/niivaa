import React from 'react';
import { 
  X, Info, Users, PlusCircle, QrCode, FileSpreadsheet, 
  Search, MessageSquare, AlertTriangle, Edit, ListChecks, 
  Settings, MonitorPlay, Gift, Star, Mic, Camera, CheckSquare, 
  ListOrdered, CheckCircle2, UserCheck, ShieldAlert 
} from 'lucide-react';

interface AttendeesManualDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AttendeesManualDrawer({ isOpen, onClose }: AttendeesManualDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel - ขยายกว้างขึ้นเป็น max-w-3xl เพื่อรองรับเนื้อหาที่ละเอียดขึ้น */}
      <div className="relative w-full max-w-3xl bg-[#0a1128] h-full shadow-[-10px_0_30px_rgba(0,0,0,0.8)] border-l border-cyan-500/30 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/40 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2.5 rounded-xl border border-cyan-500/30">
              <Info className="text-cyan-400" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide">คู่มือการใช้งานระบบ</h2>
              <p className="text-xs text-cyan-400/80 mt-0.5">ตรวจสอบและลงทะเบียนผู้ร่วมงาน (Attendees Registration)</p>
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
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar text-sm text-gray-300">

          {/* =========================================
              1. บทนำและประเภทผู้ร่วมงาน
             ========================================= */}
          <section>
            <h3 className="text-lg font-black text-blue-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Users size={20} /> 1. ประเภทผู้ร่วมงาน (Attendee Types)
            </h3>
            <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
              <p className="mb-4 text-zinc-300 leading-relaxed">
                การลงทะเบียนผู้ร่วมงานรองรับ 2 รูปแบบ คือ <strong>การเพิ่มรายชื่อไว้ล่วงหน้า</strong> (ยืนยันการลงทะเบียนเมื่อเข้างาน) และ <strong>การแจ้งชื่อลงทะเบียนหน้างาน (Walk-in)</strong> โดยระบบได้จำแนกผู้ร่วมงานออกเป็นกลุ่มต่างๆ ดังนี้:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <span className="bg-blue-950/40 text-blue-300 px-3 py-2 rounded-lg border border-blue-500/20 font-bold">VIP (ประธาน/แขกผู้มีเกียรติ)</span>
                <span className="bg-purple-950/40 text-purple-300 px-3 py-2 rounded-lg border border-purple-500/20 font-bold">Speaker (วิทยากร)</span>
                <span className="bg-emerald-950/40 text-emerald-300 px-3 py-2 rounded-lg border border-emerald-500/20 font-bold">Guest (แขกรับเชิญ)</span>
                <span className="bg-zinc-800 text-zinc-300 px-3 py-2 rounded-lg border border-zinc-600 font-bold">Observer (ผู้สังเกตการณ์)</span>
                <span className="bg-pink-950/40 text-pink-300 px-3 py-2 rounded-lg border border-pink-500/20 font-bold">Media (สื่อมวลชน)</span>
                <span className="bg-amber-950/40 text-amber-300 px-3 py-2 rounded-lg border border-amber-500/20 font-bold">Staff (คณะทำงาน)</span>
                <span className="bg-slate-800 text-slate-300 px-3 py-2 rounded-lg border border-slate-600 font-bold col-span-2 md:col-span-1">General (ผู้เข้าร่วมทั่วไป)</span>
              </div>
            </div>
          </section>

          {/* =========================================
              2. การนำเข้าและลงทะเบียน
             ========================================= */}
          <section>
            <h3 className="text-lg font-black text-emerald-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <PlusCircle size={20} /> 2. การนำเข้ารายชื่อและลงทะเบียน (Registration)
            </h3>
            
            <div className="space-y-4">
              {/* นำเข้า Excel */}
              <div className="bg-emerald-950/10 rounded-xl p-5 border border-emerald-500/20">
                <p className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><FileSpreadsheet size={18} /> การนำเข้ารายชื่อผู้ร่วมงานจำนวนมากไว้ล่วงหน้า</p>
                <p className="text-zinc-400 leading-relaxed text-sm">
                  ดาวน์โหลดไฟล์ Excel แม่แบบ <strong>attendee_template_full.xlsx</strong> กรอกรายละเอียดในตารางให้ครบถ้วน แล้วคลิกปุ่ม <strong>นำเข้า Excel</strong> ระบบจะประมวลผลและดึงข้อมูลเข้าสู่ระบบอัตโนมัติ
                </p>
              </div>

              {/* ลงทะเบียนรายบุคคล */}
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                <p className="font-bold text-white mb-3 flex items-center gap-2"><PlusCircle size={18} className="text-emerald-500"/> การลงทะเบียนหรือนำเข้าข้อมูลเป็นรายบุคคล (Manual)</p>
                <ol className="list-decimal pl-5 space-y-3 text-zinc-400 text-sm leading-relaxed">
                  <li>คลิกปุ่ม <strong>ลงทะเบียนรายชื่อใหม่</strong></li>
                  <li><strong>ค้นหาล่วงหน้า:</strong> พิมพ์ชื่อ สกุล หรือเบอร์โทรศัพท์ (เบอร์โทรใช้ยืนยันตัวตน ป้องกันกรณีชื่อสกุลซ้ำกัน) แล้วคลิกปุ่มค้นหาในรายชื่อ เพื่อตรวจสอบว่ามีรายชื่อเตรียมไว้ล่วงหน้าแล้วหรือไม่</li>
                  <li><strong>หากไม่พบรายชื่อในงาน:</strong> ระบบจะแสดงปุ่ม <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-xs">ค้นหาในฐานระบบกลาง</span> สีส้ม เมื่อกดปุ่มนี้ หากพบรายชื่อแสดงว่าเป็นบุคคลที่มี NiiVaa ID อยู่แล้ว ให้ตรวจสอบข้อมูลและกดบันทึกเข้าระบบเช็คอินได้เลย</li>
                  <li>
                    <strong>การสร้าง NiiVaa ID ใหม่:</strong> สังเกตกล่อง <span className="text-[#00E676] font-bold">สร้าง NiiVaa ID ให้บุคคลนี้</span>
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                      <li><strong className="text-white">ติ๊กเป็นสีเขียว:</strong> หมายถึงต้องการให้เป็นบุคคลรายใหม่ ระบบจะออกรหัส NiiVaa ID ให้ใหม่ พร้อมบันทึกข้อมูลลงฐานข้อมูลกลางและตารางของงาน</li>
                      <li><strong className="text-white">ติ๊กออก (กล่องว่างสีขาว):</strong> เมื่อบันทึก รายชื่อจะถูกบันทึกเฉพาะในตารางรายชื่อของงานนี้เท่านั้น</li>
                    </ul>
                  </li>
                  <li><strong>ค้นหาจากฐานข้อมูลกลาง (เมนูหลัก):</strong> ปุ่มสีม่วงหน้าตาราง ใช้กรณีต้องการหารายชื่อบุคคลที่มีประวัติในฐานข้อมูลกลาง แล้วดึงรายชื่อเข้ามาในตารางผู้ร่วมงานของงานนี้โดยตรง</li>
                </ol>
              </div>

              {/* QR Code & รูปภาพ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                  <p className="font-bold text-white mb-2 flex items-center gap-2"><QrCode size={18} className="text-zinc-300"/> ให้แขกลงทะเบียนเอง (QR Code)</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">คลิกปุ่มรูป QR Code เพื่อแสดงป้ายให้ผู้ร่วมงานหรือเจ้าหน้าที่ สแกนกรอกข้อมูลลงทะเบียนผ่านโทรศัพท์ เป็นการเพิ่มความรวดเร็ว ลดความแออัดหน้างาน (ต่างคนต่างกรอกข้อมูลได้ด้วยตนเอง)</p>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                  <p className="font-bold text-white mb-2 flex items-center gap-2"><Camera size={18} className="text-cyan-400"/> การอัปโหลดรูปภาพ</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">หากยินดีอัปโหลดรูปภาพบุคคล จะเป็นประโยชน์ตอนประกาศแนะนำตัวนำภาพขึ้นจอเวทีกลาง หากส่งภาพของที่ระลึกด้วย เจ้าหน้าที่จะสามารถแตะดูภาพบุคคลคู่กับของที่ระลึกได้ในคลิกเดียว (กรณีเปลี่ยนภาพ ภาพเดิมจะถูกลบอัตโนมัติ)</p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================
              3. การกรอกข้อมูลเชิงลึก
             ========================================= */}
          <section>
            <h3 className="text-lg font-black text-amber-500 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Star size={20} /> 3. การกรอกข้อมูลเชิงลึกและการจัดการในงาน
            </h3>
            
            <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                <h4 className="font-bold text-white border-b border-white/10 pb-2 mb-3">1. ข้อมูลบุคคล (Personal Data)</h4>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li><strong>หน่วยงาน (Organization):</strong> ระบุหน่วยงาน ห้างร้าน บริษัท สมาคม หรือองค์กรที่สังกัด</li>
                  <li><strong>เบอร์โทรศัพท์:</strong> ใช้อ้างอิงและยืนยันจำแนกบุคคล กรณีฐานข้อมูลกลางมีชื่อ-สกุลซ้ำกัน และมีผลต่อการจำแนก NiiVaa ID</li>
                </ul>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                <h4 className="font-bold text-amber-400 border-b border-white/10 pb-2 mb-3">2. การจัดการในงาน (Event Management)</h4>
                <ul className="space-y-4">
                  <li>
                    <strong className="text-white block mb-1">ลำดับความสำคัญ (Priority)</strong>
                    <p className="text-zinc-400">เป็นตัวเลขที่เจ้าหน้าที่กำหนดให้ตามตำแหน่งหรือความอาวุโส เลขใดๆ ก็ได้ในเชิงเปรียบเทียบ <strong>เลขน้อยกว่า หมายถึง ลำดับความสำคัญสูงกว่า</strong> (เช่น 10 สำคัญกว่า 15) เลขไม่จำเป็นต้องเรียงต่อเนื่องกัน ปกติระบบกำหนดให้ <strong>50 เป็นค่าเริ่มต้น</strong> (ค่ากลางของ 1-100) เจ้าหน้าที่สามารถตรวจแก้ไขได้เสมอจนกว่ารายชื่อจะถูกใช้งานบนเวที</p>
                  </li>
                  <li>
                    <strong className="text-white block mb-1">เลขที่นั่ง (Seat No.)</strong>
                    <p className="text-zinc-400">ปกติจะกำหนดที่หน้าศูนย์บริหารผังเก้าอี้ VIP แต่สามารถพิมพ์ระบุได้ที่นี่</p>
                  </li>
                  <li>
                    <strong className="text-white block mb-1">บทบาทพิเศษ (Role)</strong>
                    <p className="text-zinc-400">ระบุบทบาทสำคัญที่อาจต้องกล่าวถึง เช่น ประธานในพิธีเปิด, ประธานจัดงาน, เลขานุการโครงการ ฯลฯ</p>
                  </li>
                  <li>
                    <strong className="text-white block mb-1">คิวขึ้นเวที (Action Seq.)</strong>
                    <p className="text-zinc-400">เลขลำดับที่ฝ่ายทะเบียนกำหนดให้สำหรับกิจกรรมพิเศษนั้นๆ เช่น คิวผู้เข้ารับประกาศนียบัตร หรือผู้รับวุฒิบัตร</p>
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                <h4 className="font-bold text-white border-b border-white/10 pb-2 mb-3">5. สคริปต์ประกาศ / เกียรติประวัติ (Bio Note)</h4>
                <p className="text-zinc-400">เป็นข้อมูลเพิ่มเติมในการประชาสัมพันธ์ช่วงแนะนำแขก เช่น ความสามารถพิเศษ ตำแหน่งอื่น รางวัลที่เคยได้รับ (ควรได้รับความยินยอมจากแขกในการประชาสัมพันธ์เพื่อเป็นการให้เกียรติ)</p>
              </div>
            </div>
          </section>

          {/* =========================================
              4. ของที่ระลึกและกิจกรรมพิเศษ
             ========================================= */}
          <section>
            <h3 className="text-lg font-black text-pink-500 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Gift size={20} /> 4. ของที่ระลึกและกิจกรรมพิเศษ (Gifts & Activities)
            </h3>
            <div className="space-y-4">
              {/* ของที่ระลึก */}
              <div className="bg-pink-950/10 rounded-xl p-5 border border-pink-500/20 text-zinc-300 text-sm leading-relaxed">
                <strong className="text-pink-400 text-base block mb-2 border-b border-pink-500/20 pb-2">3. ของที่ระลึก (Gifts)</strong>
                <ul className="list-disc pl-5 space-y-2 mt-2 text-zinc-400">
                  <li><strong>การทำงาน:</strong> เมื่อระบุลักษณะเด่น (เช่น แจกันขาว ดอกสีแดง+ขาว) ระบบจะออกหมายเลขรหัสอัตโนมัติ และประทับเวลาเข้างาน รหัสนี้จะผูกติดกับรายชื่อและรูปภาพของแขกรายนั้น</li>
                  <li><strong>การจัดเรียงของ:</strong> ของที่ระลึกตัวจริงจัดวางเรียงตามหมายเลขรหัส ส่วนลำดับการขึ้นมอบ เจ้าหน้าที่สามารถปรับเปลี่ยนในระบบตามความสำคัญของแขกได้ตลอดเวลา (ไม่ต้องย้ายตำแหน่งของจริง)</li>
                  <li><strong>Realtime Sync:</strong> พิธีกรและเจ้าหน้าที่จะเห็นข้อมูลและลำดับล่าสุดตรงกันแบบเรียลไทม์ ผู้ร่วมงานที่เข้าระบบก็สามารถทราบความเคลื่อนไหวคิวของตนได้</li>
                </ul>
                <div className="bg-black/40 p-3 rounded-lg flex items-start gap-3 border border-white/10 mt-4">
                  <Search size={18} className="text-pink-400 shrink-0 mt-0.5"/> 
                  <p className="text-xs"><strong>ฟีเจอร์ขยายภาพ (Zoom):</strong> เมื่อแตะที่ Thumbnail รูปภาพ จะมี Popup ขยายขนาดดูหมายเลขของที่ระลึก รูปภาพบุคคล และของที่ระลึกได้ในครั้งเดียว ช่วยให้เจ้าหน้าที่หยิบเชิญของส่งให้แขกได้ง่าย ไม่สับสน เป็นการให้เกียรติแขกผู้ใหญ่ได้อย่างเหมาะสม</p>
                </div>
              </div>

              {/* กิจกรรมพิเศษ */}
              <div className="bg-fuchsia-950/10 rounded-xl p-5 border border-fuchsia-500/20 text-zinc-300 text-sm leading-relaxed">
                <strong className="text-fuchsia-400 text-base block mb-2 border-b border-fuchsia-500/20 pb-2">4. กิจกรรมพิเศษ (Special Activities 1 & 2)</strong>
                <p className="text-zinc-400">ระบบเตรียมไว้รองรับการระบุกิจกรรมที่แขกเข้าร่วม เช่น ขึ้นมอบของ หรือ ขึ้นรับเกียรติบัตร</p>
                <ul className="list-disc pl-5 space-y-1.5 mt-2 text-zinc-400 text-xs">
                  <li>เมื่อกำหนดชื่อผู้ร่วมกิจกรรม ต้องกำหนด <strong>ลำดับคิวพิเศษ (Action Sequence)</strong> เสมอ</li>
                  <li>หากมีจำนวนมาก การจัดการข้อมูลในไฟล์ Excel แล้วอัปโหลด จะสะดวกรวดเร็วกว่า</li>
                  <li>สามารถตรวจสอบรายชื่อได้โดยกดปุ่ม <strong>⚙️ จัดการคอลัมน์</strong> แล้วติ๊กเลือก ลำดับคิวพิเศษ / กิจกรรมพิเศษ เพื่อตรวจสอบความถูกต้อง</li>
                </ul>
              </div>
            </div>
          </section>

          {/* =========================================
              5. การตรวจสอบ แก้ไข และตาราง
             ========================================= */}
          <section>
            <h3 className="text-lg font-black text-cyan-400 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <ListChecks size={20} /> 5. การตรวจสอบ แก้ไขข้อมูล และการจัดการตาราง
            </h3>
            
            <div className="space-y-4">
              {/* การตรวจสอบรายบุคคล */}
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5 text-sm text-zinc-300 leading-relaxed">
                <h4 className="font-bold text-white mb-2">การตรวจสอบและแก้ไขข้อมูลรายบุคคล</h4>
                <p className="mb-2">สามารถคลิกเลือกรายชื่อฝั่งขวา แล้วดูข้อมูลเชิงลึกทางฝั่งซ้ายได้:</p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400 text-xs">
                  <li><strong>NiiVaa ID (ถ้าเชื่อมต่อแล้ว):</strong> หมายถึงผู้ร่วมงานรายนี้มีข้อมูลในฐานข้อมูลกลาง สามารถใช้อ้างอิงเข้าระบบ NiiVaa SmartEvent ได้ทุกงาน</li>
                  <li><strong>การแก้ไข:</strong> เลื่อนลงล่างสุดของกล่องข้อมูล คลิกปุ่ม <strong>แก้ไขข้อมูล/บทบาท</strong> จะแสดงหน้าต่างแก้ไข รวมถึงการเปลี่ยนรูปภาพ</li>
                  <li><strong>ลบออกจากงาน:</strong> หมายถึงลบรายชื่อออกจากตารางงานนี้เท่านั้น ไม่กระทบตารางฐานข้อมูลส่วนกลาง</li>
                  <li>มีกล่อง Dropdown สำหรับ <strong>กรอง (Filter)</strong> และ <strong>เรียงลำดับ (Sort)</strong> รายชื่อตามเงื่อนไขต่างๆ และมีกล่อง <strong>ค้นหาบุคคล</strong> เพื่อความรวดเร็ว</li>
                </ul>
              </div>

              {/* การจัดการคอลัมน์และตาราง */}
              <div className="bg-blue-950/10 rounded-xl p-5 border border-blue-500/20 text-sm text-zinc-300 leading-relaxed">
                <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Settings size={16}/> การจัดการคอลัมน์และการแก้ไขด่วน</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 border-b border-white/5 pb-2">
                    <CheckSquare size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">ปุ่มจัดการคอลัมน์</strong>
                      <p className="text-zinc-400 text-xs mt-1">คลิกปุ่มนี้เพื่อเปิด Dropdown รายการหัวคอลัมน์ หากติ๊ก (/) คอลัมน์นั้นจะแสดงและพร้อมรับการแก้ไข (Inline Edit) <strong>หากมีการแก้ไข ต้องกดปุ่ม "💾 บันทึก" เสมอ</strong> ติ๊กซ้ำเพื่อซ่อนคอลัมน์</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 border-b border-white/5 pb-2">
                    <ListOrdered size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">คอลัมน์ "ลำดับ" (มี 2 โหมด)</strong>
                      <p className="text-zinc-400 text-xs mt-1"><strong>1. โหมดปกติ:</strong> แสดงตัวเลขเรียงลำดับต่อเนื่อง (1, 2, 3...) <br/><strong>2. โหมดอิสระ (ตัวเลขสีส้ม):</strong> แสดงค่าลำดับความสำคัญ (Priority) สามารถพิมพ์แก้เลขเพื่อจัดลำดับก่อนหลังได้ทันที (เช่น แก้ 55 เป็น 7 เพื่อเลื่อนขึ้น) ลำดับจะสลับตำแหน่งทันทีเมื่อกดเปลี่ยนกลับเป็นโหมดปกติ</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 border-b border-white/5 pb-2">
                    <Mic size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">คอลัมน์ ประกาศแนะนำ</strong>
                      <p className="text-zinc-400 text-xs mt-1">หมายถึง แขก VIP รายนั้นฝ่ายจัดการระบุให้พิธีกรประกาศชื่อแนะนำตัวในงาน</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <UserCheck size={16} className="text-cyan-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">สถานะการมาถึง</strong>
                      <p className="text-zinc-400 text-xs mt-1">กรณีนำเข้ารายชื่อล่วงหน้า สถานะจะเป็น "รอยืนยัน" เมื่อมาสแกนเข้างาน หรือลงทะเบียนหน้างาน สถานะจะเปลี่ยนเป็น "เช็คอินแล้ว" หรือ "มาถึงแล้ว" โดยเจ้าหน้าที่สามารถปรับปรุงข้อมูลตามจริงได้เสมอ</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* =========================================
              6. ระบบสื่อสารด่วน
             ========================================= */}
          <section>
            <h3 className="text-lg font-black text-red-500 flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <ShieldAlert size={20} /> 6. ระบบสื่อสารด่วนหน้างาน (Intercom & SOS)
            </h3>
            <p className="text-zinc-400 text-sm mb-3">หน้านี้มีปุ่มส่งข้อความ 2 แบบแยกกันอย่างชัดเจนตามวัตถุประสงค์การใช้งาน:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-red-950/20 rounded-xl p-5 border border-red-500/30">
                <p className="font-bold text-red-400 mb-2 flex items-center gap-1.5"><AlertTriangle size={16} /> ปุ่ม SOS สีแดง</p>
                <p className="text-xs text-zinc-400 leading-relaxed">ใช้สำหรับส่งข้อความฉุกเฉินหรือร้องขอความช่วยเหลือไปยัง <strong>"หน้าจอของผู้กำกับเวที (SM)"</strong> (ผ่านตาราง event_live_messages) รองรับระบบสั่งพิมพ์ด้วยเสียง</p>
              </div>
              <div className="bg-amber-950/20 rounded-xl p-5 border border-amber-500/30">
                <p className="font-bold text-amber-400 mb-2 flex items-center gap-1.5"><MonitorPlay size={16} /> ปุ่มส่ง SMS สีส้ม</p>
                <p className="text-xs text-zinc-400 leading-relaxed">ใช้สำหรับส่งข้อความ/ประกาศ หรือแนบรูปภาพด่วน ไปปรากฏที่ <strong>"หน้าจอแสดงผลหลัก (Main Screen)"</strong> โดยตรง (ผ่านตาราง screen_state)</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}