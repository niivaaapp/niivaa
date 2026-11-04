"use client";

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, Save, Plus, Trash2, CheckCircle,
    Mic, AlignLeft, LayoutTemplate, Loader2, Users, Video, ExternalLink
} from 'lucide-react';

function TemplateBuilderContent() {
    const supabase = createClient();
    const searchParams = useSearchParams();
    const templateId = searchParams.get('template_id');

    const [templateData, setTemplateData] = useState<any>(null);
    const [cues, setCues] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!templateId) {
            setIsLoading(false); // 🌟 สั่งปิดโหลดทันทีถ้าไม่มี ID
            return;
        }

        const fetchTemplate = async () => {
            try {
                const { data, error } = await supabase
                    .from('script_templates')
                    .select('*')
                    .eq('id', templateId)
                    .single();

                if (error) throw error;

                if (data) {
                    setTemplateData(data);
                    if (data.content_chunks && data.content_chunks.length > 0) {
                        setCues(data.content_chunks);
                    } else {
                        // ค่าเริ่มต้นถ้ายังไม่มีสคริปต์
                        setCues([{
                            id: crypto.randomUUID(), sort_order: 1, duration_minutes: 5,
                            title: 'เริ่มกิจกรรม', main_script: '', sub_script: '',
                            details: '', start_time: '09:00 น.', speaker_role: 'MC',
                            responsible_person: '', reference_url: '', media_type: 'none',
                            media_url: '', visual_audio_cue: ''
                        }]);
                    }
                }
            } catch (err) {
                console.error("Error fetching template:", err);
            } finally {
                setIsLoading(false); // 🌟 วางใน finally เพื่อให้ปิดโหลดเสมอไม่ว่าจะสำเร็จหรือ Error
            }
        };

        fetchTemplate();
    }, [templateId]);

    // 🌟 1. หน้าจอตอนกำลังโหลด
    if (isLoading) {
        return <div className="min-h-screen bg-[#050B14] flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>;
    }

    // 🌟 2. หน้าจอแจ้งเตือนกรณีไม่มี Template ID ใน URL
    if (!templateId) {
        return (
            <div className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center text-white gap-4">
                <div className="text-red-400 font-bold text-xl">ไม่พบรหัสเทมเพลต (Template ID)</div>
                <p className="text-gray-400">กรุณาเลือกแก้ไข หรือสร้างเทมเพลตใหม่จากหน้าจัดการ</p>
                <Link href="/admin/templates" className="mt-2 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold transition-colors">
                    กลับหน้าจัดการเทมเพลต
                </Link>
            </div>
        );
    }

    const handleSaveTemplate = async () => {
        if (!templateId) return;
        setIsSaving(true);
        try {
            // บันทึก JSON ลงใน content_chunks โดยตรง
            const { error } = await supabase
                .from('script_templates')
                .update({
                    title: templateData.title,
                    content_chunks: cues,
                    updated_at: new Date().toISOString()
                })
                .eq('id', templateId);

            if (error) throw error;
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error saving:', error);
            alert('บันทึกไม่สำเร็จ');
        } finally {
            setIsSaving(false);
        }
    };

    const updateCue = (id: string, field: string, value: any) => {
        setCues(prev => prev.map(cue => cue.id === id ? { ...cue, [field]: value } : cue));
    };

    const addCue = () => {
        const nextOrder = cues.length > 0 ? Math.max(...cues.map(c => c.sort_order)) + 1 : 1;
        setCues([...cues, {
            id: crypto.randomUUID(), sort_order: nextOrder, duration_minutes: 5,
            title: 'บล็อกสคริปต์ใหม่', main_script: '', sub_script: '', details: '',
            start_time: '09:00 น.', speaker_role: 'MC', responsible_person: '',
            reference_url: '', media_type: 'none', media_url: '', visual_audio_cue: ''
        }]);
    };

    const deleteCue = (id: string) => {
        if (confirm('ต้องการลบ Script Block นี้หรือไม่?')) {
            setCues(prev => prev.filter(c => c.id !== id).map((c, i) => ({ ...c, sort_order: i + 1 })));
        }
    };

    if (isLoading) {
        return <div className="min-h-screen bg-[#050B14] flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>;
    }

    return (
        <div className="min-h-screen bg-[#050B14] text-gray-200 font-sans pb-20 selection:bg-amber-500/30">

            <header className="bg-gray-900 border-b border-amber-500/30 sticky top-0 z-40 shadow-md">
                <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/templates" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="h-8 w-px bg-gray-800 mx-1"></div>
                        <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-amber-500" /> สร้างเทมเพลต (Template Builder)
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSaveTemplate} disabled={isSaving} className="flex items-center px-6 h-10 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50">
                            {isSaved ? <CheckCircle className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            {isSaving ? 'กำลังบันทึก...' : isSaved ? 'บันทึกสำเร็จ' : 'บันทึกเทมเพลต'}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8">

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 w-full">
                        <label className="text-xs text-gray-500 font-bold block mb-1">ชื่อเทมเพลต (แสดงให้ผู้ใช้เห็น)</label>
                        <input type="text" value={templateData?.title || ''} onChange={(e) => setTemplateData({ ...templateData, title: e.target.value })} className="w-full bg-black border border-gray-700 rounded-xl px-4 py-3 text-lg text-white font-bold outline-none focus:border-amber-500" />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="text-xs text-gray-500 font-bold block mb-1">หมวดหมู่</label>
                        <div className="bg-black border border-gray-700 rounded-xl px-4 py-3 text-gray-400 text-sm font-bold">
                            {templateData?.category}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {cues.map((cue, index) => (
                        <div key={cue.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg relative">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-black text-amber-500 font-black px-3 py-1.5 rounded-lg border border-gray-800">
                                        ลำดับ {cue.sort_order}
                                    </div>
                                </div>
                                <button onClick={() => deleteCue(cue.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2 bg-gray-950 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                {/* ฝั่งตั้งค่า */}
                                <div className="md:col-span-4 space-y-4">
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold block mb-1">ชื่อสคริปต์บล็อก (Title)</label>
                                        <input type="text" value={cue.title} onChange={(e) => updateCue(cue.id, 'title', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-amber-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">เวลา (นาที)</label>
                                            <input type="number" value={cue.duration_minutes} onChange={(e) => updateCue(cue.id, 'duration_minutes', Number(e.target.value))} className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-yellow-500 font-bold outline-none text-center focus:border-amber-500" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold block mb-1">ผู้พูด (Speaker)</label>
                                            <select value={cue.speaker_role} onChange={(e) => updateCue(cue.id, 'speaker_role', e.target.value)} className="w-full bg-black border border-gray-700 rounded-lg px-2 py-2 text-sm text-fuchsia-400 font-bold outline-none focus:border-amber-500">
                                                <option value="MC">MC</option><option value="MC1">MC 1</option><option value="MC2">MC 2</option><option value="MC(Both)">MC(Both)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold block mb-1">ผู้เกี่ยวข้อง (ตัวแปร)</label>
                                        <div className="relative">
                                            <Users className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
                                            <input type="text" value={cue.responsible_person || ''} onChange={(e) => updateCue(cue.id, 'responsible_person', e.target.value)} placeholder="เช่น [ชื่อตัวแทน]" className="w-full bg-black border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-amber-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 font-bold block mb-1">คิวเวที / เทคนิค (Details)</label>
                                        <textarea rows={2} value={cue.details} onChange={(e) => updateCue(cue.id, 'details', e.target.value)} placeholder="(เช่น ไฟแสงสว่าง)" className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-xs text-cyan-300 outline-none focus:border-amber-500 resize-none italic custom-scrollbar" />
                                    </div>
                                </div>

                                {/* ฝั่งเนื้อหาสคริปต์ */}
                                <div className="md:col-span-8 space-y-4 flex flex-col">
                                    <div>
                                        <label className="text-[10px] text-purple-400 font-bold mb-1 flex items-center bg-purple-950/30 w-fit px-2 py-0.5 rounded"><Mic className="w-3 h-3 mr-1" /> บทพูดหลัก (ใช้ [ตัวแปร] แทนชื่อคน)</label>
                                        <textarea rows={4} value={cue.main_script} onChange={(e) => updateCue(cue.id, 'main_script', e.target.value)} placeholder="คำกล่าว เช่น ขอเรียนเชิญ [ตำแหน่งประธาน]..." className="w-full bg-black border border-purple-900/50 rounded-lg px-4 py-3 text-base text-gray-100 outline-none focus:border-purple-500 resize-none custom-scrollbar leading-relaxed" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-orange-400 font-bold mb-1 flex items-center bg-orange-950/30 w-fit px-2 py-0.5 rounded"><AlignLeft className="w-3 h-3 mr-1" /> ข้อมูลสำรอง (Sub Script)</label>
                                        <textarea rows={2} value={cue.sub_script} onChange={(e) => updateCue(cue.id, 'sub_script', e.target.value)} placeholder="หมายเหตุเพิ่มเติม..." className="w-full bg-gray-950 border border-orange-900/30 rounded-lg px-4 py-3 text-sm text-orange-200/80 outline-none focus:border-orange-500 resize-none custom-scrollbar" />
                                    </div>

                                    {/* รองรับ Media สำหรับเทมเพลต */}
                                    <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex gap-2">
                                            <div className="w-1/3">
                                                <label className="text-[10px] text-pink-400 font-bold mb-1 flex items-center"><Video className="w-3 h-3 mr-1" /> สื่อ (Media)</label>
                                                <select value={cue.media_type || 'none'} onChange={(e) => updateCue(cue.id, 'media_type', e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg px-2 py-2 text-xs text-pink-400 font-bold outline-none focus:border-pink-500">
                                                    <option value="none">ไม่มี</option><option value="video">วิดีโอ (VTR)</option><option value="audio">เสียง</option><option value="image">ภาพ</option>
                                                </select>
                                            </div>
                                            <div className="w-2/3">
                                                <label className="text-[10px] text-gray-500 font-bold mb-1 block">หมายเหตุการเปิดสื่อ</label>
                                                <input type="text" value={cue.visual_audio_cue || ''} onChange={(e) => updateCue(cue.id, 'visual_audio_cue', e.target.value)} placeholder="เช่น เล่น VTR แนะนำประวัติ..." className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-pink-500 disabled:opacity-30" disabled={!cue.media_type || cue.media_type === 'none'} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-blue-400 font-bold mb-1 flex items-center"><ExternalLink className="w-3 h-3 mr-1" /> ลิงก์อ้างอิง</label>
                                            <input type="text" value={cue.reference_url || ''} onChange={(e) => updateCue(cue.id, 'reference_url', e.target.value)} placeholder="ลิงก์เอกสารอ้างอิง..." className="w-full bg-black border border-gray-800 rounded-lg px-3 py-2 text-xs text-blue-300 outline-none focus:border-blue-500" />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ))}

                    <button onClick={addCue} className="w-full py-5 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500 hover:text-amber-500 hover:border-amber-900/50 hover:bg-amber-950/10 transition-all font-bold flex items-center justify-center shadow-lg">
                        <Plus className="w-5 h-5 mr-2" /> เพิ่มบล็อกสคริปต์ลงในเทมเพลต
                    </button>
                </div>
            </main>
        </div>
    );
}

export default function TemplateBuilderPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#050B14] flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>}>
            <TemplateBuilderContent />
        </Suspense>
    );
}