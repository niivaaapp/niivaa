'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { parseRawSpeechWithTags } from '@/lib/speechParser';
import Link from 'next/link';
import { LayoutGrid, UserCheck, Save, Play, FileText, CheckCircle2, Printer, X, ZoomIn, ZoomOut, HelpCircle, Info, Tag, Monitor } from 'lucide-react';

interface AttendeeVIP {
  prefix?: string;
  fullname: string;
  position: string;
}

function ReportScriptEditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('event_id') || searchParams.get('eventId') || '';

  const [rawText, setRawText] = useState<string>('');
  const [includePresident, setIncludePresident] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [eventName, setEventName] = useState<string>('');
  const [president, setPresident] = useState<AttendeeVIP | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [printFontSize, setPrintFontSize] = useState<number>(18);
  const isReadOnly = searchParams.get('mode') === 'view';

  // 🌟 State สำหรับเปิด/ปิด คู่มือ (Drawer)
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const placeholderText = `<เรียนประธาน>
เรียน ท่านประธานในพิธีที่เคารพ
ในนามของคณะกรรมการจัดงาน ผมขอขอบพระคุณท่านเป็นอย่างยิ่งที่ให้เกียรติมาเป็นประธาน

<วัตถุประสงค์>
การจัดงานในครั้งนี้ มีวัตถุประสงค์เพื่อ...
1. เพื่อส่งเสริม...
2. เพื่อพัฒนา...

<สรุปการดำเนินงาน>
บัดนี้ ได้เวลาอันสมควรแล้ว ขอเรียนเชิญท่านประธานได้กล่าวเปิดงานต่อไปครับ`;

  useEffect(() => {
    async function fetchScript() {
      if (!eventId) return;
      const { data } = await supabase
        .from('event_scripts')
        .select('content_chunks')
        .eq('event_id', eventId)
        .eq('script_type', 'report')
        .maybeSingle();

      if (data && data.content_chunks) {
        const chunks = data.content_chunks;
        const hasPresident = chunks.some((c: any) => c.type === 'president_greeting');
        setIncludePresident(hasPresident);

        const textLines = chunks
          .filter((c: any) => c.type === 'text')
          .map((c: any, index: number, arr: any[]) => {
            const prevTag = index > 0 ? arr[index - 1].tag : null;
            if (c.tag && c.tag !== prevTag) {
              return `\n<${c.tag}>\n${c.text}`;
            }
            return c.text;
          });
        setRawText(textLines.join('\n').trim());
      }
    }
    fetchScript();
  }, [eventId]);

  useEffect(() => {
    async function fetchEventName() {
      if (!eventId) return;
      const { data } = await supabase.from('events').select('title').eq('id', eventId).maybeSingle();
      if (data) setEventName(data.title);
    }
    fetchEventName();
  }, [eventId]);

  useEffect(() => {
    async function fetchPresident() {
      if (!eventId) return;
      const { data, error } = await supabase
        .from('event_attendees')
        .select('prefix, fullname, position')
        .eq('event_id', eventId)
        .order('priority_level', { ascending: true })
        .limit(1);

      if (data && data.length > 0 && !error) setPresident(data[0]);
    }
    fetchPresident();
  }, [eventId]);

  const handleSave = async () => {
    if (!eventId) return alert('ไม่พบรหัสงาน (event_id)');
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { chunks } = parseRawSpeechWithTags(rawText);
      const finalChunks = includePresident
        ? [{ id: 'chunk-president-intro', type: 'president_greeting', tag: 'เรียนประธาน', tagIndex: 0 }, ...chunks]
        : chunks;

      const { error } = await supabase
        .from('event_scripts')
        .upsert({
          event_id: eventId,
          script_type: 'report',
          title: 'คำกล่าวรายงาน (ประธานจัดงาน)',
          content_chunks: finalChunks,
          updated_at: new Date().toISOString()
        }, { onConflict: 'event_id,script_type' });

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* 🌟 Slide-over Drawer คู่มือการใช้งาน */}
      <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>

        <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-cyan-500/30 shadow-2xl transform transition-transform duration-300 flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-950">
            <h2 className="text-lg font-black text-cyan-400 flex items-center gap-2">
              <HelpCircle size={20} /> คู่มือการเตรียมสคริปต์
            </h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-zinc-300">
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><UserCheck className="text-cyan-400" size={16} /> 1. ส่วนทักทายประธานอัตโนมัติ</h3>
              <p className="leading-relaxed bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20">
                ระบบจะนำรายชื่อ <b>"ประธานในพิธี"</b> (ผู้ที่มี Priority ลำดับ 1) มาแสดงเป็นสไลด์เด่นหน้าจอ และแนบลงในกระดาษพิมพ์ให้อัตโนมัติ โดยที่คุณไม่ต้องพิมพ์ชื่อเองในช่องสคริปต์
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Tag className="text-cyan-400" size={16} /> 2. การใช้ &lt;แท็กหัวข้อ&gt;</h3>
              <p className="leading-relaxed">
                พิมพ์ <code className="text-cyan-300 bg-black px-1.5 py-0.5 rounded">&lt;ชื่อหัวข้อ&gt;</code> ไว้บรรทัดบนสุดของประเด็นนั้นๆ (เช่น &lt;วัตถุประสงค์&gt;) ระบบจะเปลี่ยนเป็นป้ายสีสวยงามบนจอ Prompter ช่วยให้ทราบว่ากำลังพูดถึงช่วงใด
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Monitor className="text-cyan-400" size={16} /> 3. การแบ่งหน้าจอ (เคาะ Enter)</h3>
              <p className="leading-relaxed">
                การกด Enter เพื่อขึ้นบรรทัดใหม่ จะทำให้ข้อความถูกแยกหน้าจอ (Chunk) ช่วยให้ประธานอ่านง่าย ตัวหนังสือใหญ่ และไม่ตาลาย
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Printer className="text-cyan-400" size={16} /> 4. การพิมพ์กระดาษสำรอง</h3>
              <p className="leading-relaxed">
                กดปุ่ม <b>พิมพ์กระดาษสำรอง</b> ระบบจะตัดสีดำออก จัดเป็นกระดาษขาว-ดำ คุณสามารถกดซูม (+A / -A) เพื่อปรับขนาดอักษรก่อนสั่งพิมพ์ได้ทันที
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={`min-h-screen bg-[#070b14] text-white p-6 md:p-10 ${showPrintPreview ? 'hidden' : 'block'}`}>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-cyan-400 flex items-center gap-2">
                <FileText className="text-cyan-500" />
                ร่างคำกล่าวรายงาน (ประธานจัดงาน)
              </h1>
              <p className="text-zinc-400 text-sm mt-1">เตรียมสคริปต์สำหรับประธานจัดงานกล่าวรายงานต่อประธานในพิธี</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">

              {/* 🌟 ปุ่มเปิดคู่มือเรืองแสง */}
              <button
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-sm font-bold text-cyan-400 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.15)]"
              >
                <HelpCircle size={16} className="animate-pulse" />
                คู่มือ
              </button>

              <button
                onClick={() => setShowPrintPreview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-white/5"
              >
                <Printer size={16} className="text-zinc-300" />
                พิมพ์สำรอง
              </button>

              <button
                onClick={() => router.push(`/officialeventdashboard/report-teleprompter?event_id=${eventId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors"
              >
                <Play size={16} className="text-cyan-400" />
                จอ Prompter
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'
                    }`}
                >
                  {isSaving ? 'กำลังบันทึก...' : saveSuccess ? <><CheckCircle2 size={16} /> สำเร็จ!</> : <><Save size={16} /> บันทึกสคริปต์</>}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
          <Link href={`/events/event-dashboard/${eventId}`} className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md" > <LayoutGrid size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">กลับศูนย์กลาง</span> </Link>
          </div>
          <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
            <input
              type="checkbox"
              id="includePresident"
              checked={includePresident}
              onChange={(e) => setIncludePresident(e.target.checked)}
              className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
            />
            <label htmlFor="includePresident" className="cursor-pointer font-medium text-zinc-300 select-none flex-1">
              แสดงสไลด์ข้อมูล "ประธานในพิธี" ก่อนเริ่มอ่านคำกล่าวรายงาน
              <span className="text-cyan-400/80 ml-2 text-sm">(จะแนบชื่อประธานลงในกระดาษพิมพ์อัตโนมัติ)</span>
            </label>
          </div>

          <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={placeholderText}
              className={`w-full h-[60vh] ... ${isReadOnly ? 'bg-black/30 cursor-not-allowed' : 'bg-black/50'}`}
            ></textarea>
          </div>
        </div>
      </div>

      {showPrintPreview && (
        <div className="min-h-screen bg-white text-black print:bg-white">
          <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between p-4 bg-zinc-100 border-b border-zinc-300 print:hidden shadow-sm">
            <div className="flex items-center gap-4">
              <span className="font-bold text-zinc-700">ตั้งค่าหน้ากระดาษ:</span>
              <div className="flex items-center gap-2 bg-white border border-zinc-300 px-2 py-1 rounded-lg">
                <button onClick={() => setPrintFontSize(p => Math.max(12, p - 2))} className="p-1 hover:bg-zinc-100 rounded text-zinc-600"><ZoomOut size={18} /></button>
                <span className="font-mono font-bold w-12 text-center text-sm">{printFontSize} pt</span>
                <button onClick={() => setPrintFontSize(p => Math.min(36, p + 2))} className="p-1 hover:bg-zinc-100 rounded text-zinc-600"><ZoomIn size={18} /></button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowPrintPreview(false)} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-bold transition-colors">
                <X size={16} /> กลับไปแก้ไข
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors">
                <Printer size={16} /> สั่งพิมพ์กระดาษ
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto p-8 md:p-12 print:p-0">
            <h1 className="text-center font-black mb-2" style={{ fontSize: `${printFontSize + 6}pt` }}>คำกล่าวรายงานของประธานจัดงาน</h1>
            <div className="text-center font-bold mb-8 text-zinc-700" style={{ fontSize: '14pt' }}>{eventName || 'งานพิธีการ'}</div>
            <div style={{ fontSize: `${printFontSize}pt`, lineHeight: '1.8' }} className="font-sans">
              {includePresident && (
                <div className="mb-6 pb-6 border-b-2 border-zinc-200">
                  <div className="font-bold mb-4 text-zinc-800 flex items-center gap-2"><div className="w-2 h-2 bg-cyan-500 rounded-full"></div>เรียนประธานในพิธี</div>
                  {president ? (
                    <div className="flex gap-2 text-zinc-800 pl-6">
                      <span className="font-bold shrink-0 w-12">เรียน</span>
                      <div>
                        <span className="font-bold block">{president.prefix ? `${president.prefix}${president.fullname}` : president.fullname}</span>
                        {president.position && <span className="text-zinc-600 block">{president.position}</span>}
                      </div>
                    </div>
                  ) : <div className="pl-6 text-zinc-500 italic">- ยังไม่ได้ระบุชื่อประธานในระบบ -</div>}
                </div>
              )}
              {rawText.split('\n').map((line, idx) => {
                const trimmedLine = line.trim();
                const tagMatch = trimmedLine.match(/^<(.+?)>$/);
                if (tagMatch) return <div key={idx} className="font-bold mt-8 mb-3 text-zinc-800 flex items-center gap-2"><div className="w-2 h-2 bg-zinc-800 rounded-full"></div>{tagMatch[1]}</div>;
                if (trimmedLine === '') return <div key={idx} className="h-4"></div>;
                return <div key={idx} className="mb-2 text-justify indent-10">{trimmedLine}</div>;
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ReportScriptEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">กำลังโหลด...</div>}>
      <ReportScriptEditorContent />
    </Suspense>
  );
}