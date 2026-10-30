"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Printer, Save, Image as ImageIcon, FileText, Edit3,
  CheckCircle, UploadCloud, Download, Mail, Building, Building2, Users
} from 'lucide-react';

// --- Types ---
interface ImageEntry { id: string; fileUrl: string | null; caption: string; suggestedShot: string; }
interface ReportSection { title: string; prefix: string; images: ImageEntry[]; }

export default function EventReportPage() {
  // --- States: General ---
  const [activeTab, setActiveTab] = useState<'report' | 'cover_letter'>('report');
  const [isSaved, setIsSaved] = useState(false);
  const [reportMode, setReportMode] = useState<'district' | 'province'>('district');

  // --- States: Event Stats ---
  const [eventStats, setEventStats] = useState({
    agencyCount: '๕๐',
    participantCount: '๑,๐๐๐'
  });

  // --- States: Report Data ---
  const [reportInfo, setReportInfo] = useState({
    eventName: 'งานเฉลิมพระเกียรติพระบาทสมเด็จพระเจ้าอยู่หัว เนื่องในโอกาสวันเฉลิมพระชนมพรรษา',
    eventDateFull: '๒๘ กรกฎาคม ๒๕๖๙',
    eventDay: 'วันพุธที่ ๒๘ กรกฎาคม ๒๕๖๙',
    agencyName: 'ที่ทำการอำเภอท่าตูม',
    location: 'ลานหน้าที่ว่าการอำเภอท่าตูม',
    president: 'นายอำเภอท่าตูม',
    attendees1: 'หัวหน้าส่วนราชการ ข้าราชการ ศาล ทหาร ตำรวจ',
    attendees2: 'ผู้บริหารสถานศึกษา ครู และบุคลากรทางการศึกษา',
    attendees3: 'ประชาชนจิตอาสา และพสกนิกรชาวอำเภอท่าตูม',
  });

  // --- States: Reporter Signature (หน้าสุดท้าย) ---
  const [reporter, setReporter] = useState({
    name: '(นาย....................................)',
    title: 'ผู้อำนวยการกลุ่มงาน (ขึ้นไป)...............................',
    phone: '๐๘x-xxxxxxx'
  });

  // --- States: Image Sections ---
  const [sections, setSections] = useState<ReportSection[]>([
    {
      title: 'ภาพการจัดพิธีเจริญพระพุทธมนต์และทำบุญตักบาตรถวายพระราชกุศล', prefix: '๔.',
      images: [
        { id: 'm1', fileUrl: null, suggestedShot: '(ประธานจุดธูปเทียน)', caption: 'ประธานในพิธีประกอบพิธีจุดธูปเทียนบูชาพระรัตนตรัย และจุดเครื่องทองน้อย' },
        { id: 'm2', fileUrl: null, suggestedShot: '(พระสงฆ์สวดมนต์)', caption: 'พระสงฆ์เจริญพระพุทธมนต์ และประธานในพิธีถวายเครื่องไทยธรรม' },
        { id: 'm3', fileUrl: null, suggestedShot: '(มุมกว้างตักบาตร)', caption: 'ประธานในพิธี นำหัวหน้าส่วนราชการร่วมทำบุญตักบาตรพระสงฆ์' },
        { id: 'm4', fileUrl: null, suggestedShot: '(มุมเจาะผู้ร่วมงาน)', caption: 'ข้าราชการและประชาชนร่วมพิธีทำบุญตักบาตรอย่างพร้อมเพรียง' },
      ]
    },
    {
      title: 'ภาพการจัดพิธีถวายเครื่องราชสักการะและวางพานพุ่ม', prefix: '๕.',
      images: [
        { id: 'e1', fileUrl: null, suggestedShot: '(หน่วยงานวางพาน)', caption: 'ผู้แทนหน่วยงาน ถวายพานพุ่มทอง-พุ่มเงิน เบื้องหน้าพระบรมฉายาลักษณ์' },
        { id: 'e2', fileUrl: null, suggestedShot: '(ประธานวางพาน)', caption: 'ประธานในพิธี วางพานพุ่มถวายราชสักการะ และเปิดกรวยกระทงดอกไม้' },
        { id: 'e3', fileUrl: null, suggestedShot: '(ประธานกล่าวนำ)', caption: 'ประธานในพิธีกล่าวนำถวายพระพรชัยมงคล ด้วยความจงรักภักดี' },
        { id: 'e4', fileUrl: null, suggestedShot: '(มุมกว้างผู้ร่วมงาน)', caption: 'ผู้เข้าร่วมพิธี ยืนตรงถวายความเคารพอย่างสมพระเกียรติ' },
      ]
    },
    {
      title: 'ภาพการจัดพิธีจุดเทียนถวายพระพรชัยมงคล', prefix: '๖.',
      images: [
        { id: 'c1', fileUrl: null, suggestedShot: '(ประธานจุดเทียนต่อ)', caption: 'ประธานในพิธี จุดเทียนมหามงคล พร้อมส่งต่อให้แก่ผู้เข้าร่วมพิธี' },
        { id: 'c2', fileUrl: null, suggestedShot: '(แสงเทียนสว่างไสว)', caption: 'ผู้เข้าร่วมพิธีร่วมจุดเทียนถวายพระพรชัยมงคล สว่างไสวทั่วทั้งมณฑลพิธี' },
        { id: 'c3', fileUrl: null, suggestedShot: '(ร้องเพลงสรรเสริญ)', caption: 'ผู้เข้าร่วมพิธีร่วมร้องเพลงสรรเสริญพระบารมี และเพลงสดุดีจอมราชันย์' },
        { id: 'c4', fileUrl: null, suggestedShot: '(เปล่งเสียงทรงพระเจริญ)', caption: 'ผู้เข้าร่วมพิธี เปล่งเสียง "ทรงพระเจริญ" อย่างกึกก้อง' },
      ]
    },
    {
      title: 'ภาพการจัดกิจกรรมจิตอาสาบำเพ็ญสาธารณประโยชน์และบำเพ็ญสาธารณกุศล', prefix: '๗.',
      images: [
        { id: 'v1', fileUrl: null, suggestedShot: '(ประธานเปิดกิจกรรม)', caption: 'ประธานในพิธี นำกล่าวคำปฏิญาณ "เราทำความ ดี ด้วยหัวใจ"' },
        { id: 'v2', fileUrl: null, suggestedShot: '(มุมกว้างจิตอาสา)', caption: 'จิตอาสาพระราชทาน และประชาชนจิตอาสา ร่วมกิจกรรมอย่างพร้อมเพรียง' },
        { id: 'v3', fileUrl: null, suggestedShot: '(ปฏิบัติงาน 1)', caption: 'กิจกรรมทำความสะอาด ปรับปรุงภูมิทัศน์ บริเวณพื้นที่สาธารณะ' },
        { id: 'v4', fileUrl: null, suggestedShot: '(ปฏิบัติงาน 2)', caption: 'หน่วยงานและประชาชนร่วมใจบำเพ็ญสาธารณกุศลเพื่อส่วนรวม' },
      ]
    }
  ]);

  // --- States: Cover Letter (หนังสือนำส่ง) ---
  const [coverLetter, setCoverLetter] = useState({
    docNo: 'สร ๐๔xxx/xxxx',
    dateText: '๒๙ กรกฎาคม ๒๕๖๙',
    receiver: 'ผู้ว่าราชการจังหวัดสุรินทร์',
    refDoc: 'หนังสือจังหวัดสุรินทร์ ด่วนที่สุด ที่ สร ๐๐๑๗.๓/ว... ลงวันที่...',
    senderTitle: 'นายอำเภอท่าตูม',
    signatoryName: '(นาย....................................)',
    signatureImage: null as string | null,
  });

  // --- Auto Update based on Mode ---
  useEffect(() => {
    if (reportMode === 'district') {
      setReportInfo(prev => ({ ...prev, agencyName: 'ที่ทำการอำเภอท่าตูม', president: 'นายอำเภอท่าตูม', location: 'ลานหน้าที่ว่าการอำเภอท่าตูม', attendees3: 'ประชาชนจิตอาสา และพสกนิกรชาวอำเภอท่าตูม' }));
      setCoverLetter(prev => ({ ...prev, receiver: 'ผู้ว่าราชการจังหวัดสุรินทร์', refDoc: 'หนังสือจังหวัดสุรินทร์ ด่วนที่สุด ที่ สร ๐๐๑๗.๓/ว... ลงวันที่...', senderTitle: 'นายอำเภอท่าตูม' }));
    } else {
      setReportInfo(prev => ({ ...prev, agencyName: 'จังหวัดสุรินทร์', president: 'ผู้ว่าราชการจังหวัดสุรินทร์', location: 'ลานหน้าศาลากลางจังหวัดสุรินทร์', attendees3: 'ประชาชนจิตอาสา และพสกนิกรชาวจังหวัดสุรินทร์' }));
      setCoverLetter(prev => ({ ...prev, receiver: 'ปลัดกระทรวงมหาดไทย', refDoc: 'หนังสือกระทรวงมหาดไทย ด่วนที่สุด ที่ มท ๐๒๐๑.๓/ว... ลงวันที่...', senderTitle: 'ผู้ว่าราชการจังหวัดสุรินทร์' }));
    }
  }, [reportMode]);

  // --- Handlers ---
  const handlePrintPDF = () => window.print();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, sectionIndex: number, imageIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newSections = [...sections];
        newSections[sectionIndex].images[imageIndex].fileUrl = reader.result as string;
        setSections(newSections);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverLetter({ ...coverLetter, signatureImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptionChange = (sectionIndex: number, imageIndex: number, value: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].images[imageIndex].caption = value;
    setSections(newSections);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans print:bg-white print:text-black">
      
      {/* ================= HEADER ================= */}
      <header className="bg-gray-900 border-b border-green-900/50 sticky top-0 z-50 shadow-md print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-green-400 rounded-lg transition-colors border border-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-gray-800 mx-2"></div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-green-500" /> ระบบรายงานผล (เอกสาร ๕ หน้า)
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrintPDF} className="flex items-center px-6 py-2 bg-green-600 hover:bg-green-500 text-black rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)]">
              <Printer className="w-4 h-4 mr-2" /> Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-[1400px] mx-auto px-4 py-6 print:p-0 print:m-0 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ================= ซ้าย: แผงควบคุม (EDITOR) ================= */}
        <div className="lg:col-span-5 space-y-6 print:hidden h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar pr-2 pb-12">
          
          {/* TABS */}
          <div className="flex bg-black rounded-xl p-1 border border-gray-800 sticky top-0 z-10 shadow-lg">
            <button onClick={() => setActiveTab('cover_letter')} className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'cover_letter' ? 'bg-blue-950/80 text-blue-400 border border-blue-500 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              <Mail className="w-4 h-4 mr-2" /> หนังสือนำส่ง
            </button>
            <button onClick={() => setActiveTab('report')} className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-green-950/80 text-green-400 border border-green-500 shadow-md' : 'text-gray-400 hover:text-white'}`}>
              <ImageIcon className="w-4 h-4 mr-2" /> รูปเล่มรายงาน
            </button>
          </div>

          {/* TAB 1: COVER LETTER ENTRY */}
          {activeTab === 'cover_letter' && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* โหมดรายงาน */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center border-b border-gray-800 pb-2">
                  <Building2 className="w-4 h-4 mr-2" /> ระดับการรายงาน
                </h3>
                <div className="flex bg-black p-1 rounded-xl border border-gray-700">
                  <button onClick={() => setReportMode('district')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all ${reportMode === 'district' ? 'bg-blue-900/50 text-blue-300 border border-blue-500/50' : 'text-gray-500'}`}><Building className="w-3 h-3 mr-2"/> อำเภอ ➜ จังหวัด</button>
                  <button onClick={() => setReportMode('province')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-xs font-bold transition-all ${reportMode === 'province' ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50' : 'text-gray-500'}`}><Building2 className="w-3 h-3 mr-2"/> จังหวัด ➜ กระทรวง</button>
                </div>
              </div>

              {/* ข้อมูลหนังสือนำส่ง */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-blue-400 uppercase mb-4 flex items-center border-b border-gray-800 pb-2">
                  <Mail className="w-4 h-4 mr-2" /> ข้อมูลหนังสือราชการ
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-gray-400 font-bold">ที่ (เลขหนังสือ)</label><input type="text" value={coverLetter.docNo} onChange={e=>setCoverLetter({...coverLetter, docNo: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none" /></div>
                    <div><label className="text-xs text-gray-400 font-bold">วันที่ (ลงนาม)</label><input type="text" value={coverLetter.dateText} onChange={e=>setCoverLetter({...coverLetter, dateText: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none" /></div>
                  </div>
                  <div><label className="text-xs text-gray-400 font-bold">เรียน (ผู้รับ)</label><input type="text" value={coverLetter.receiver} onChange={e=>setCoverLetter({...coverLetter, receiver: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-bold">อ้างถึง</label><input type="text" value={coverLetter.refDoc} onChange={e=>setCoverLetter({...coverLetter, refDoc: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none" /></div>
                  
                  <div className="pt-4 border-t border-gray-800">
                    <label className="text-xs text-blue-300 font-bold mb-2 flex items-center"><Users className="w-4 h-4 mr-1"/> สถิติผู้เข้าร่วมงาน (สรุปตัวเลข)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] text-gray-400">จำนวนหน่วยงาน (แห่ง)</label><input type="text" value={eventStats.agencyCount} onChange={e=>setEventStats({...eventStats, agencyCount: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:border-blue-500 outline-none" /></div>
                      <div><label className="text-[10px] text-gray-400">รวมจำนวนคน (คน)</label><input type="text" value={eventStats.participantCount} onChange={e=>setEventStats({...eventStats, participantCount: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:border-blue-500 outline-none" /></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <label className="text-xs text-gray-400 font-bold block mb-2">ข้อมูลผู้ลงนาม (หน้าแรก)</label>
                    <div className="space-y-3">
                      <input type="text" placeholder="ชื่อ-สกุล" value={coverLetter.signatoryName} onChange={e=>setCoverLetter({...coverLetter, signatoryName: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none" />
                      <input type="text" placeholder="ตำแหน่ง" value={coverLetter.senderTitle} onChange={e=>setCoverLetter({...coverLetter, senderTitle: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <label className="text-xs text-gray-400 font-bold block mb-2">อัปโหลดลายเซ็น (หน้าแรก)</label>
                    <label className="flex items-center justify-center w-full h-20 bg-gray-900 border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg cursor-pointer transition-colors overflow-hidden relative">
                      <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      {coverLetter.signatureImage ? (
                        <img src={coverLetter.signatureImage} alt="Signature" className="h-full object-contain mix-blend-screen" />
                      ) : (
                        <div className="text-center">
                          <UploadCloud className="w-5 h-5 text-gray-500 mx-auto mb-1" />
                          <span className="text-[10px] text-gray-400">คลิกเพื่ออัปโหลดรูปลายเซ็น</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REPORT DATA ENTRY */}
          {activeTab === 'report' && (
            <div className="space-y-6 animate-in fade-in">
              {/* ข้อมูลส่วนหัว */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-green-400 uppercase mb-4 flex items-center border-b border-gray-800 pb-2">
                  <FileText className="w-4 h-4 mr-2" /> ข้อมูลทั่วไป (แบบรายงาน)
                </h3>
                <div className="space-y-3">
                  <div><label className="text-xs text-gray-400 font-bold">หน่วยงานผู้จัด</label><input type="text" value={reportInfo.agencyName} onChange={e=>setReportInfo({...reportInfo, agencyName: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-green-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-bold">สถานที่จัดพิธี</label><input type="text" value={reportInfo.location} onChange={e=>setReportInfo({...reportInfo, location: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-green-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-bold">ประธานในพิธี</label><input type="text" value={reportInfo.president} onChange={e=>setReportInfo({...reportInfo, president: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-green-500 outline-none" /></div>
                </div>
              </div>

              {/* อัปโหลดรูปภาพ ทั้ง 4 หัวข้อ */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-green-400 uppercase mb-4 flex items-center border-b border-gray-800 pb-2">
                  <ImageIcon className="w-4 h-4 mr-2" /> อัปโหลดรูปภาพกิจกรรม
                </h3>
                
                <div className="space-y-8">
                  {sections.map((section, sIndex) => (
                    <div key={sIndex} className="bg-black/50 p-4 rounded-xl border border-gray-800">
                      <h4 className="text-xs font-bold text-green-300 mb-3">{section.prefix} {section.title}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {section.images.map((img, iIndex) => (
                          <div key={img.id} className="space-y-2">
                            <label className="relative block aspect-[4/3] bg-gray-900 border-2 border-dashed border-gray-700 hover:border-green-500 rounded-lg overflow-hidden cursor-pointer group transition-colors">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, sIndex, iIndex)} />
                              {img.fileUrl ? (
                                <img src={img.fileUrl} alt="uploaded" className="w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                                  <UploadCloud className="w-6 h-6 text-gray-600 group-hover:text-green-500 mb-1" />
                                  <span className="text-[9px] text-gray-500 font-bold">{img.suggestedShot}</span>
                                </div>
                              )}
                            </label>
                            <textarea 
                              rows={2} 
                              value={img.caption}
                              onChange={(e) => handleCaptionChange(sIndex, iIndex, e.target.value)}
                              className="w-full bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-[10px] text-gray-300 focus:border-green-500 outline-none resize-none leading-relaxed"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ข้อมูลผู้รายงาน (หน้าสุดท้าย) */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold text-yellow-400 uppercase mb-4 flex items-center border-b border-gray-800 pb-2">
                  <Edit3 className="w-4 h-4 mr-2" /> ผู้จัดทำรายงาน (หน้าสุดท้าย)
                </h3>
                <div className="space-y-3">
                  <div><label className="text-xs text-gray-400 font-bold">ชื่อ-สกุล</label><input type="text" value={reporter.name} onChange={e=>setReporter({...reporter, name: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-yellow-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-bold">ตำแหน่ง</label><input type="text" value={reporter.title} onChange={e=>setReporter({...reporter, title: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-yellow-500 outline-none" /></div>
                  <div><label className="text-xs text-gray-400 font-bold">หมายเลขโทรศัพท์</label><input type="text" value={reporter.phone} onChange={e=>setReporter({...reporter, phone: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-yellow-500 outline-none" /></div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* ================= ขวา: หน้าจอ A4 พรีวิว (LIVE PREVIEW & PRINT) ================= */}
        <div className="lg:col-span-7 h-[calc(100vh-120px)] overflow-y-auto print:overflow-visible print:h-auto bg-gray-800 p-4 md:p-8 rounded-2xl print:p-0 print:bg-transparent custom-scrollbar flex flex-col items-center gap-8">
          
          {/* ===== หน้า 1: หนังสือนำส่ง (Cover Letter) ===== */}
          <div className="bg-white text-black shadow-2xl shrink-0 print:shadow-none print:break-after-page page-a4 relative">
            <div className="absolute top-[20mm] left-[25mm] right-[25mm] bottom-[20mm] font-serif" style={{ fontSize: '16pt', fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif', lineHeight: '1.2' }}>
              <div className="flex justify-center mb-4">
                <div className="w-[1.5in] h-[1.5in] opacity-40 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Garuda_Emblem_of_Thailand.svg/200px-Garuda_Emblem_of_Thailand.svg.png')] bg-contain bg-no-repeat bg-center"></div>
              </div>
              <div className="flex justify-between mt-[-30px]">
                <div>ที่ {coverLetter.docNo}</div>
                <div className="w-[50%] text-center ml-20">{reportInfo.agencyName}<br/>(ที่ตั้งหน่วยงาน) จ.สุรินทร์ ๓๒๐๐๐</div>
              </div>
              <div className="text-center mt-4 mb-4 ml-[50%] w-[50%]">{coverLetter.dateText}</div>
              
              <div className="space-y-2 mb-6 text-justify">
                <div><span className="inline-block w-20">เรื่อง</span>นำส่งรายงานผลการจัดกิจกรรมเฉลิมพระเกียรติฯ</div>
                <div><span className="inline-block w-20">เรียน</span>{coverLetter.receiver}</div>
                <div><span className="inline-block w-20">อ้างถึง</span>{coverLetter.refDoc}</div>
                <div><span className="inline-block w-20 flex items-start">สิ่งที่ส่งมาด้วย</span><div>รายงานผลการจัดงานเฉลิมพระเกียรติฯ จำนวน ๑ ฉบับ<br/>(รายละเอียดพร้อมภาพถ่ายกิจกรรม จำนวน ๔ หน้า)</div></div>
              </div>

              <div className="indent-[2.5cm] text-justify mb-4">
                ตามที่ {reportMode === 'district' ? 'จังหวัดสุรินทร์' : 'กระทรวงมหาดไทย'} ได้มอบหมายให้ส่วนราชการ หน่วยงานรัฐวิสาหกิจ องค์กรปกครองส่วนท้องถิ่น และภาคเอกชน ร่วมดำเนินการจัดกิจกรรมเฉลิมพระเกียรติพระบาทสมเด็จพระเจ้าอยู่หัว เนื่องในโอกาสวันเฉลิมพระชนมพรรษา ๒๘ กรกฎาคม ๒๕๖๙ ใน{reportInfo.eventDay} {reportInfo.location} นั้น
              </div>
              <div className="indent-[2.5cm] text-justify mb-8">
                บัดนี้ การจัดกิจกรรมดังกล่าวได้ดำเนินการเสร็จสิ้น สำเร็จลุล่วงไปด้วยความเรียบร้อย และสมพระเกียรติทุกประการ <span className="font-bold">โดยมีส่วนราชการ องค์กร และกลุ่มพลังมวลชน มาร่วมงานจำนวน {eventStats.agencyCount} แห่ง รวมทั้งสิ้นประมาณ {eventStats.participantCount} คน</span> {reportInfo.agencyName} จึงขอนำส่งรายงานผลการจัดกิจกรรมฯ พร้อมภาพถ่ายการดำเนินงาน รายละเอียดตามสิ่งที่ส่งมาด้วยพร้อมนี้
              </div>
              <div className="indent-[2.5cm] text-justify mb-16">
                จึงเรียนมาเพื่อโปรดทราบ
              </div>

              <div className="flex flex-col items-center ml-[50%] w-[50%]">
                <div className="mb-6 text-center">ขอแสดงความนับถือ</div>
                <div className="h-16 relative w-full flex justify-center items-center mb-2">
                  {coverLetter.signatureImage ? <img src={coverLetter.signatureImage} alt="sign" className="h-16 object-contain absolute z-10 mix-blend-multiply opacity-90" /> : null}
                  <span className="border-b border-dotted border-gray-400 w-48 block absolute bottom-2 z-0"></span>
                </div>
                <div className="text-center">{coverLetter.signatoryName}</div>
                <div className="text-center">{coverLetter.senderTitle}</div>
              </div>

              <div className="absolute bottom-0 left-0" style={{ fontSize: '14pt' }}>
                กลุ่มงานบริหารงานทั่วไป<br/>
                โทร. ๐ ๔๔xx xxxx<br/>
                โทรสาร ๐ ๔๔xx xxxx
              </div>
            </div>
          </div>

          {/* ===== หน้า 2: แบบรายงาน (ข้อมูลทั่วไป + ตักบาตร) ===== */}
          <div className="bg-white text-black shadow-2xl shrink-0 print:shadow-none print:break-after-page page-a4 relative">
            <div className="absolute top-[20mm] left-[25mm] right-[25mm] bottom-[20mm] font-serif" style={{ fontSize: '16pt', fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif', lineHeight: '1.2' }}>
              <div className="text-center font-bold mb-6" style={{ fontSize: '18pt' }}>
                รายงานการจัดงานเฉลิมพระเกียรติพระบาทสมเด็จพระเจ้าอยู่หัว<br/>
                เนื่องในโอกาสวันเฉลิมพระชนมพรรษา {reportInfo.eventDateFull}<br/>
                {reportInfo.eventDay}<br/>
                ของ {reportInfo.agencyName}
              </div>
              <div className="text-center mb-4">***************************</div>

              <div className="space-y-1 mb-8">
                <div><span className="font-bold">๑. สถานที่จัดพิธี:</span> {reportInfo.location}</div>
                <div><span className="font-bold">๒. ประธานในพิธี:</span> {reportInfo.president}</div>
                <div><span className="font-bold">๓. ผู้ร่วมพิธี ประกอบด้วย:</span></div>
                <div className="pl-8">๓.๑ {reportInfo.attendees1}</div>
                <div className="pl-8">๓.๒ {reportInfo.attendees2}</div>
                <div className="pl-8">๓.๓ {reportInfo.attendees3} ฯลฯ</div>
              </div>

              <div className="font-bold mb-4">{sections[0].prefix} {sections[0].title} (จำนวน ๔ ภาพ)</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-8">
                {sections[0].images.map((img, idx) => (
                  <div key={img.id} className="flex flex-col items-center text-center">
                    <div className="w-full aspect-[4/3] border border-gray-400 flex items-center justify-center overflow-hidden mb-2">
                      {img.fileUrl ? <img src={img.fileUrl} alt={`img-${idx}`} className="w-full h-full object-cover"/> : <span className="text-gray-300">ภาพ {idx+1}</span>}
                    </div>
                    <div className="text-[14pt] leading-tight border-b border-dotted border-gray-400 pb-1 w-full">{img.caption || `คำบรรยายภาพที่ ${idx+1}..............................`}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== หน้า 3: แบบรายงาน (วางพานพุ่ม) ===== */}
          <div className="bg-white text-black shadow-2xl shrink-0 print:shadow-none print:break-after-page page-a4 relative flex items-center">
            <div className="absolute top-[25mm] left-[25mm] right-[25mm] bottom-[20mm] font-serif" style={{ fontSize: '16pt', fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif', lineHeight: '1.2' }}>
              <div className="font-bold mb-8">{sections[1].prefix} {sections[1].title} (จำนวน ๔ ภาพ)</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-12">
                {sections[1].images.map((img, idx) => (
                  <div key={img.id} className="flex flex-col items-center text-center">
                    <div className="w-full aspect-[4/3] border border-gray-400 flex items-center justify-center overflow-hidden mb-3">
                      {img.fileUrl ? <img src={img.fileUrl} alt={`img-${idx}`} className="w-full h-full object-cover"/> : <span className="text-gray-300">ภาพ {idx+1}</span>}
                    </div>
                    <div className="text-[14pt] leading-tight border-b border-dotted border-gray-400 pb-1 w-full">{img.caption || `คำบรรยายภาพที่ ${idx+1}..............................`}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== หน้า 4: แบบรายงาน (จุดเทียนถวายพระพร) ===== */}
          <div className="bg-white text-black shadow-2xl shrink-0 print:shadow-none print:break-after-page page-a4 relative flex items-center">
            <div className="absolute top-[25mm] left-[25mm] right-[25mm] bottom-[20mm] font-serif" style={{ fontSize: '16pt', fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif', lineHeight: '1.2' }}>
              <div className="font-bold mb-8">{sections[2].prefix} {sections[2].title} (จำนวน ๔ ภาพ)</div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-12">
                {sections[2].images.map((img, idx) => (
                  <div key={img.id} className="flex flex-col items-center text-center">
                    <div className="w-full aspect-[4/3] border border-gray-400 flex items-center justify-center overflow-hidden mb-3">
                      {img.fileUrl ? <img src={img.fileUrl} alt={`img-${idx}`} className="w-full h-full object-cover"/> : <span className="text-gray-300">ภาพ {idx+1}</span>}
                    </div>
                    <div className="text-[14pt] leading-tight border-b border-dotted border-gray-400 pb-1 w-full">{img.caption || `คำบรรยายภาพที่ ${idx+1}..............................`}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== หน้า 5: แบบรายงาน (จิตอาสา + ลงชื่อผู้รายงาน) ===== */}
          <div className="bg-white text-black shadow-2xl shrink-0 print:shadow-none page-a4 relative">
            <div className="absolute top-[25mm] left-[25mm] right-[25mm] bottom-[20mm] font-serif flex flex-col h-full" style={{ fontSize: '16pt', fontFamily: '"Th Sarabun PSK", "Th Sarabun New", serif', lineHeight: '1.2' }}>
              
              <div className="font-bold mb-8">{sections[3].prefix} {sections[3].title} (จำนวน ๔ ภาพ)</div>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-10 mb-auto">
                {sections[3].images.map((img, idx) => (
                  <div key={img.id} className="flex flex-col items-center text-center">
                    <div className="w-full aspect-[4/3] border border-gray-400 flex items-center justify-center overflow-hidden mb-3">
                      {img.fileUrl ? <img src={img.fileUrl} alt={`img-${idx}`} className="w-full h-full object-cover"/> : <span className="text-gray-300">ภาพ {idx+1}</span>}
                    </div>
                    <div className="text-[14pt] leading-tight border-b border-dotted border-gray-400 pb-1 w-full">{img.caption || `คำบรรยายภาพที่ ${idx+1}..............................`}</div>
                  </div>
                ))}
              </div>

              {/* ส่วนลงลายมือชื่อผู้รายงาน (ตามต้นฉบับ) */}
              <div className="flex flex-col items-end mt-12 w-full pr-12">
                <div className="flex items-end gap-2 mb-2">
                  <span>ลงชื่อ</span>
                  <span className="border-b border-dotted border-gray-500 w-48 block"></span>
                  <span>ผู้รายงาน</span>
                </div>
                <div className="w-64 text-center mb-2">{reporter.name}</div>
                <div className="flex items-end gap-2 mb-2">
                  <span>ตำแหน่ง</span>
                  <span className="border-b border-dotted border-gray-500 w-64 block text-center pb-1">{reporter.title}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span>หมายเลขโทรศัพท์</span>
                  <span className="border-b border-dotted border-gray-500 w-48 block text-center pb-1">{reporter.phone}</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        
        .page-a4 { width: 210mm; height: 297mm; background: white; }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background: white !important; }
          .page-a4 { box-shadow: none; width: 100%; height: 297mm; page-break-after: always; }
        }
      `}} />
    </div>
  );
}