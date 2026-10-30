'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { parseRawSpeechWithTags } from '@/lib/speechParser';
import {LayoutGrid, Save, Play, FileText, CheckCircle2, Printer, X, ZoomIn, ZoomOut, HelpCircle, Users, Tag, Monitor, Share2, Copy, ImagePlus, Trash2, Loader2, PlusCircle, LayoutDashboard } from 'lucide-react';
import PinGuard from '@/components/PinGuard';

interface AttendeeVIP {
    prefix?: string;
    fullname: string;
    position: string;
}

function ScriptEditorContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const eventId = searchParams.get('event_id') || searchParams.get('eventId') || '';

    const [rawText, setRawText] = useState<string>('');
    const [includeVip, setIncludeVip] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

    const [eventName, setEventName] = useState<string>('');
    const [vipList, setVipList] = useState<AttendeeVIP[]>([]);

    const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
    const [printFontSize, setPrintFontSize] = useState<number>(18);

    const isShared = searchParams.get('shared') === 'true';
    const isReadOnly = searchParams.get('mode') === 'view' || isShared;

    const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
    const [shareInfo, setShareInfo] = useState<{ pin: string, link: string } | null>(null);

    // 🌟 State สำหรับระบบอัปโหลด Mind Map
    const [mindmapUrl, setMindmapUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const placeholderText = `<ทักทาย>
เรียน คณะผู้บริหาร และแขกผู้มีเกียรติทุกท่าน
ผมมีความยินดีอย่างยิ่งที่ได้มาเป็นประธานในวันนี้

<นโยบาย>
การพัฒนาการศึกษา เป็นรากฐานสำคัญของประเทศ
เราต้องร่วมมือกันเพื่ออนาคตของเยาวชน

<เปิดงาน>
บัดนี้ได้เวลาอันสมควรแล้ว ขอเปิดงานอย่างเป็นทางการครับ`;

    useEffect(() => {
        async function fetchScript() {
            if (!eventId) return;
            const { data } = await supabase
                .from('event_scripts')
                .select('content_chunks, mindmap_url')
                .eq('event_id', eventId)
                .eq('script_type', 'opening')
                .maybeSingle();

            if (data) {
                if (data.mindmap_url) setMindmapUrl(data.mindmap_url);

                if (data.content_chunks) {
                    const chunks = data.content_chunks;
                    const hasVip = chunks.some((c: any) => c.type === 'vip_greeting');
                    setIncludeVip(hasVip);

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
        async function fetchVips() {
            if (!eventId) return;
            const { data, error } = await supabase
                .from('event_attendees')
                .select('prefix, fullname, position')
                .eq('event_id', eventId)
                .order('priority_level', { ascending: true })
                .range(1, 5); // 🌟 เริ่มคนที่ 2 (ข้ามประธาน)

            if (data && !error) setVipList(data);
        }
        fetchVips();
    }, [eventId]);

    // 🌟 ฟังก์ชันอัปโหลดรูปภาพ
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !eventId) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${eventId}_${Date.now()}.${fileExt}`;
            const filePath = `speeches-mindmap/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('event-media')
                .upload(filePath, file, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event-media')
                .getPublicUrl(filePath);

            setMindmapUrl(publicUrl);
        } catch (err: any) {
            alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ' + err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // 🌟 ฟังก์ชันแทรกรูปลงใน Textarea
    const insertImageToScript = () => {
        if (!mindmapUrl) return;
        const imgTag = `\n<ทบทวนประเด็น>\n[IMG=${mindmapUrl}]\n`;

        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const textBefore = rawText.substring(0, start);
            const textAfter = rawText.substring(start);
            setRawText(textBefore + imgTag + textAfter);
            textareaRef.current.focus();
        } else {
            setRawText(prev => prev + imgTag);
        }
    };

    const handleSave = async () => {
        if (!eventId) return alert('ไม่พบรหัสงาน (event_id)');
        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const { chunks } = parseRawSpeechWithTags(rawText);
            const finalChunks = includeVip
                ? [{ id: 'chunk-vip-intro', type: 'vip_greeting', tag: 'ทักทาย VIP', tagIndex: 0 }, ...chunks]
                : chunks;

            const { error } = await supabase
                .from('event_scripts')
                .upsert({
                    event_id: eventId,
                    script_type: 'opening',
                    title: 'คำกล่าวเปิดงาน (ประธาน)',
                    content_chunks: finalChunks,
                    mindmap_url: mindmapUrl,
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

    const generateShareLink = async () => {
        if (!eventId) return alert('ไม่พบรหัสงาน');
        const newPin = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 24);

        const { error } = await supabase.from('events').update({
            share_pin: newPin,
            share_expiry: expiry.toISOString()
        }).eq('id', eventId);

        if (error) {
            alert('เกิดข้อผิดพลาดในการสร้างลิงก์แชร์');
            return;
        }

        const link = `${window.location.origin}${window.location.pathname}?event_id=${eventId}&shared=true`;
        setShareInfo({ pin: newPin, link });
    };

    const content = (
        <>
            {shareInfo && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-amber-500/30 p-6 rounded-2xl max-w-md w-full text-center shadow-2xl">
                        <h3 className="text-xl font-bold text-amber-400 mb-2">แชร์ให้ประธาน / เลขาฯ</h3>
                        <p className="text-zinc-400 text-sm mb-6">คัดลอกข้อมูลด้านล่าง ปลายทางจะสามารถเปิดดูและพิมพ์ได้ แต่ไม่สามารถแก้ไขข้อความได้ (ลิงก์มีอายุ 24 ชม.)</p>

                        <div className="bg-black p-3 rounded-lg mb-4 flex items-center justify-between border border-white/10 text-left">
                            <span className="truncate text-zinc-300 text-xs mr-2 select-all">{shareInfo.link}</span>
                            <button onClick={() => navigator.clipboard.writeText(shareInfo.link)} className="text-amber-400 hover:text-amber-300 shrink-0"><Copy size={18} /></button>
                        </div>
                        <div className="text-zinc-400 text-sm mb-1">รหัส PIN สำหรับเข้าดู:</div>
                        <div className="text-4xl font-mono font-black text-amber-500 tracking-[0.2em] mb-6 select-all">
                            {shareInfo.pin}
                        </div>
                        <button onClick={() => setShareInfo(null)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">ปิดหน้าต่าง</button>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
                <div className={`absolute right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-amber-500/30 shadow-2xl transform transition-transform duration-300 flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-950">
                        <h2 className="text-lg font-black text-amber-400 flex items-center gap-2">
                            <HelpCircle size={20} /> คู่มือการใช้งานระบบสคริปต์
                        </h2>
                        <button onClick={() => setIsGuideOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-zinc-300">
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><Users className="text-amber-400" size={16} /> 1. ส่วนทักทาย VIP อัตโนมัติ</h3>
                            <p className="leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                                ระบบจะนำรายชื่อ <b>"VIP ลำดับความสำคัญสูงสุด"</b> มาสร้างเป็นการ์ดหน้าจอให้ประธานเอ่ยทักทายทีละท่าน และดึงรายชื่อแนบลงในกระดาษพิมพ์ให้อัตโนมัติ
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><ImagePlus className="text-amber-400" size={16} /> 2. การแนบภาพ Mind Map</h3>
                            <p className="leading-relaxed">
                                อัปโหลดรูปภาพแผนผัง แล้วกด <b>แทรกลงในสคริปต์</b> ระบบจะวางโค้ด <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded">[IMG=ลิงก์]</code> ลงในช่องข้อความ ซึ่งจะแปลงเป็นรูปภาพขนาดใหญ่บนจอ Teleprompter ทันที
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><Tag className="text-amber-400" size={16} /> 3. การใช้ &lt;แท็กหัวข้อ&gt;</h3>
                            <p className="leading-relaxed">
                                พิมพ์ <code className="text-amber-300 bg-black px-1.5 py-0.5 rounded">&lt;ชื่อหัวข้อ&gt;</code> ไว้บรรทัดบนสุดของเนื้อหา ระบบจะสร้างเป็นป้ายสีบนจอ Prompter และแสดงเป็น [ หัวข้อ ] สีจางบนกระดาษพิมพ์
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><Printer className="text-amber-400" size={16} /> 4. การพิมพ์กระดาษสำรอง</h3>
                            <p className="leading-relaxed">
                                กด <b>พิมพ์สำรอง</b> เพื่อเข้าสู่หน้ากระดาษขาว-ดำ สามารถปรับขนาดอักษร (แนะนำ 16-18pt) ก่อนสั่งพิมพ์ได้
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-bold text-white flex items-center gap-2"><Share2 className="text-amber-400" size={16} /> 5. การแชร์ให้ผู้บริหารตรวจสอบ</h3>
                            <p className="leading-relaxed">
                                กดปุ่ม <b>แชร์สคริปต์</b> ระบบจะสร้างลิงก์พร้อม <b>PIN 6 หลัก</b> ปลายทางจะสามารถเปิดเข้ามาดูสคริปต์ ดูหน้า Prompter และสั่งพรินต์ได้ แต่ไม่สามารถแก้ไขข้อมูลได้ (ลิงก์มีอายุ 24 ชม.)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`min-h-screen bg-[#070b14] text-white p-6 md:p-10 ${showPrintPreview ? 'hidden' : 'block'}`}>
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-10 object-contain hidden md:block" />
                            <div>
                                <h1 className="text-2xl font-black text-amber-400 flex items-center gap-2">
                                    <FileText className="text-amber-500" />
                                    {isShared ? 'คำกล่าวประธาน (โหมดอ่านอย่างเดียว)' : 'ร่างคำกล่าวประธาน (Script Editor)'}
                                </h1>
                                {!isShared && <p className="text-zinc-400 text-sm mt-1">พิมพ์ข้อความและใส่แท็กหัวข้อ เช่น &lt;ทักทาย&gt; เพื่อแบ่งตอนการอ่าน</p>}
                            </div>
                        </div>

                        {/* 🌟 กล่องปุ่มแบบป้องกันการบีบ (shrink-0 whitespace-nowrap) */}
                        <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3 mt-2 xl:mt-0">
                            <button onClick={() => setIsGuideOpen(true)} className="shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-sm font-bold text-amber-400 transition-colors shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                                <HelpCircle size={16} className="animate-pulse" /> คู่มือ
                            </button>

                            {!isShared && (
                                <button onClick={generateShareLink} className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-white/5">
                                    <Share2 size={16} className="text-amber-400" /> แชร์สคริปต์
                                </button>
                            )}

                            <button onClick={() => setShowPrintPreview(true)} className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-white/5">
                                <Printer size={16} className="text-zinc-300" /> พิมพ์สำรอง
                            </button>

                            <Link
                                href={`/officialeventdashboard/grand-pressider-teleprompter?event_id=${eventId}${isShared ? '&shared=true' : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors"
                            >
                                <Play size={16} className="text-cyan-400" /> จอ Prompter
                            </Link>

                            {!isReadOnly && (
                                <button onClick={handleSave} disabled={isSaving} className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${saveSuccess ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}>
                                    {isSaving ? 'กำลังบันทึก...' : saveSuccess ? <><CheckCircle2 size={16} /> สำเร็จ!</> : <><Save size={16} /> บันทึกสคริปต์</>}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <Link href={`/events/event-dashboard/${eventId}`} className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md" > <LayoutGrid size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">กลับศูนย์กลาง</span> </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="includeVip"
                                checked={includeVip}
                                onChange={(e) => setIncludeVip(e.target.checked)}
                                disabled={isReadOnly}
                                className="w-5 h-5 accent-amber-500 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            />
                            <label htmlFor="includeVip" className={`font-medium select-none flex-1 ${isReadOnly ? 'text-zinc-500' : 'text-zinc-300 cursor-pointer'}`}>
                                แสดงสไลด์รายชื่อทักทาย VIP อัตโนมัติ <span className="text-amber-400/80 ml-1 text-sm">(ในกระดาษพิมพ์ดึง 5 ลำดับแรก)</span>
                            </label>
                        </div>

                        {!isReadOnly && (
                            <div className="bg-zinc-900/50 border border-white/10 p-3 rounded-2xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                                        {isUploading ? <Loader2 className="text-amber-400 animate-spin" size={18} /> : <ImagePlus className="text-amber-400" size={18} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-zinc-300 truncate">{mindmapUrl ? 'มีรูปภาพแผนผังแล้ว' : 'แนบภาพแผนผังประเด็น (Mind Map)'}</p>
                                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" id="mindmap-upload" />
                                        <label htmlFor="mindmap-upload" className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer underline">
                                            {mindmapUrl ? 'เปลี่ยนรูปภาพ' : 'คลิกเพื่ออัปโหลด (.jpg, .png)'}
                                        </label>
                                    </div>
                                </div>

                                {mindmapUrl && (
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={insertImageToScript} className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors flex items-center gap-1.5" title="แทรกโค้ดรูปภาพลงในข้อความสคริปต์">
                                            <PlusCircle size={16} /> <span className="text-xs font-bold">แทรกลงสคริปต์</span>
                                        </button>
                                        <button onClick={() => setMindmapUrl(null)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition-colors" title="ลบภาพนี้">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl">
                        <textarea
                            ref={textareaRef}
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            placeholder={placeholderText}
                            readOnly={isReadOnly}
                            className={`w-full h-[55vh] border border-white/5 rounded-xl p-5 text-white text-lg leading-relaxed focus:outline-none transition-colors resize-y font-sans custom-scrollbar ${isReadOnly ? 'bg-black/30 opacity-70 cursor-not-allowed focus:border-white/5' : 'bg-black/50 focus:border-amber-500/50'}`}
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
                                <X size={16} /> กลับหน้าเดิม
                            </button>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors">
                                <Printer size={16} /> สั่งพิมพ์กระดาษ
                            </button>
                        </div>
                    </div>
                    <div className="max-w-4xl mx-auto p-8 md:p-12 print:p-0">
                        <h1 className="text-center font-black mb-2" style={{ fontSize: `${printFontSize + 6}pt` }}>คำกล่าวของประธานในพิธี</h1>
                        <div className="text-center font-bold mb-8 text-zinc-700" style={{ fontSize: '14pt' }}>{eventName || 'งานพิธีการ'}</div>
                        <div style={{ fontSize: `${printFontSize}pt`, lineHeight: '1.8' }} className="font-sans">
                            {includeVip && (
                                <div className="mb-6 pb-6 border-b-2 border-zinc-200">
                                    <div className="italic mb-4 text-zinc-400 flex items-center gap-2 font-medium" style={{ fontSize: `${printFontSize - 2}pt` }}>
                                        <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></div>
                                        [ ทักทาย VIP ]
                                    </div>
                                    {vipList.length > 0 ? (
                                        <div className="space-y-3 pl-6">
                                            {vipList.map((vip, idx) => (
                                                <div key={idx} className="flex gap-2 text-zinc-800">
                                                    <span className={`font-bold shrink-0 w-12 ${idx === 0 ? '' : 'invisible'}`}>เรียน</span>
                                                    <div>
                                                        <span className="font-bold block">{vip.prefix ? `${vip.prefix}${vip.fullname}` : vip.fullname}</span>
                                                        {vip.position && <span className="text-zinc-600 block">{vip.position}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="pl-6 text-zinc-500 italic">- ยังไม่มีรายชื่อบุคคลสำคัญในระบบ -</div>}
                                </div>
                            )}
                            {rawText.split('\n').map((line, idx) => {
                                const trimmedLine = line.trim();
                                const tagMatch = trimmedLine.match(/^<(.+?)>$/);

                                if (tagMatch) return (
                                    <div key={idx} className="italic mt-8 mb-2 text-zinc-400 flex items-center gap-2 font-medium" style={{ fontSize: `${printFontSize - 2}pt` }}>
                                        <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full"></div>
                                        [ {tagMatch[1]} ]
                                    </div>
                                );

                                if (trimmedLine.startsWith('[IMG=')) return (
                                    <div key={idx} className="mb-4 text-center text-zinc-400 italic text-sm border border-dashed border-zinc-300 p-2 rounded-lg bg-zinc-50">
                                        (มีแผนภาพประกอบ Mind Map บนจอ Teleprompter)
                                    </div>
                                );

                                if (trimmedLine === '') return <div key={idx} className="h-4"></div>;
                                return <div key={idx} className="mb-2 text-justify indent-10">{trimmedLine}</div>;
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    if (isShared) {
        return <PinGuard eventId={eventId}>{content}</PinGuard>;
    }

    return content;
}

export default function ScriptEditorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center">กำลังโหลด...</div>}>
            <ScriptEditorContent />
        </Suspense>
    );
}