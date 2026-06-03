"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Clock, Music, CheckCircle, Zap, FileSpreadsheet, Sparkles } from 'lucide-react';

function LyricMapperContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const trackId = searchParams.get('track_id'); 

    const [songTitle, setSongTitle] = useState('กำลังโหลดข้อมูลคีย์เพลง...');
    const [lines, setLines] = useState<{ index: number; text: string; second: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [resolvedTrackUuid, setResolvedTrackUuid] = useState<string>(''); 
    
    const [excelRawInput, setExcelRawInput] = useState('');
    const [showExcelBox, setShowExcelBox] = useState(false);
    const [fixedDiff, setFixedDiff] = useState<number | null>(null); 

    useEffect(() => {
        if (!trackId) return;

        const loadLyricMappingData = async () => {
            try {
                let targetVideoId = '';
                let trackUuid = '';

                // ตรวจสอบพิกัด UUID จากตารางคลังแทร็กจริงของพี่
                if (trackId.length === 11 || !trackId.includes('-')) {
                    targetVideoId = trackId;
                    const { data: trackData } = await supabase.from('tracks').select('id').eq('video_id', trackId).maybeSingle();
                    if (trackData?.id) trackUuid = trackData.id;
                } else {
                    trackUuid = trackId;
                    const { data: trackData } = await supabase.from('tracks').select('video_id').eq('id', trackId).maybeSingle();
                    if (trackData?.video_id) targetVideoId = trackData.video_id;
                }

                if (trackUuid) {
                    setResolvedTrackUuid(trackUuid);
                    
                    // ดึงประวัติชื่อเพลงผ่านข้อมูลสารบบหลัก
                    if (targetVideoId) {
                        const { data: masterData } = await supabase.from('master_songs').select('title, lyrics').eq('video_id', targetVideoId).maybeSingle();
                        if (masterData) setSongTitle(masterData.title);
                    }

                    // ค้นหาประวัติเวลาปักหมุดเดิมโดยใช้ UUID นำทางที่ปลอดภัยสูงสุด 100%
                    const { data: existingTimings } = await supabase
                        .from('track_lyric_timings')
                        .select('line_index, lyric_text, target_second')
                        .eq('track_id', trackUuid)
                        .order('line_index', { ascending: true });

                    if (existingTimings && existingTimings.length > 0) {
                        setLines(existingTimings.map(t => ({
                            index: t.line_index,
                            text: t.lyric_text,
                            second: t.target_second ? String(t.target_second) : '0'
                        })));
                        if (existingTimings.length >= 2) {
                            const d = Number(existingTimings[1].target_second) - Number(existingTimings[0].target_second);
                            if (d > 0) setFixedDiff(d);
                        }
                    } else if (targetVideoId) {
                        const { data: masterData } = await supabase.from('master_songs').select('lyrics').eq('video_id', targetVideoId).maybeSingle();
                        const rawLines = masterData?.lyrics ? masterData.lyrics.split('\n') : [];
                        setLines(rawLines.map((line: string, idx: number) => ({
                            index: idx,
                            text: line.trim(),
                            second: '0'
                        })).filter((l: any) => l.text !== ''));
                    }
                }
            } catch (err) {
                console.error("Error inside lyric mapper:", err);
                setSongTitle('เกิดข้อผิดพลาดในการโหลดข้อมูลบทเรียน');
            }
        };

        loadLyricMappingData();
    }, [trackId]);

    // ⚡ คำนวณล็อกค่าผลต่างคงที่เริ่มต้นระหว่างแถว 1-2
    const handleApplyAutoSeries = () => {
        if (lines.length < 2) return;
        const firstSec = parseFloat(lines[0].second);
        const secondSec = parseFloat(lines[1].second);

        if (isNaN(firstSec) || isNaN(secondSec) || secondSec <= firstSec) {
            alert('⚠️ พี่ต้องคีย์เวลาในแถวที่ 1 และ 2 ก่อนครับ ผลต่างถึงจะล็อกอนุกรมได้ถูกต้อง');
            return;
        }

        const diff = secondSec - firstSec;
        setFixedDiff(diff); 

        setLines(prev => prev.map((line, idx) => {
            if (idx < 2) return line;
            return { ...line, second: String(parseFloat((firstSec + (idx * diff)).toFixed(2))) };
        }));
    };

    // ⚡ กระจายค่าวินาทีที่คัดลอกจาก Excel รวดเดียวเด็ดขาด
    const handleApplyExcelImport = () => {
        if (!excelRawInput.trim()) return;
        const parsedSeconds = excelRawInput.split(/[\n\r\t]+/).map(val => val.trim()).filter(val => val !== '' && !isNaN(Number(val)));

        if (parsedSeconds.length === 0) return;

        const newLines = lines.map((line, idx) => {
            if (idx < parsedSeconds.length) return { ...line, second: String(parseFloat(parsedSeconds[idx])) };
            return line;
        });

        if (parsedSeconds.length >= 2) {
            const d = parseFloat(parsedSeconds[1]) - parseFloat(parsedSeconds[0]);
            if (d > 0) setFixedDiff(d);
        }

        setLines(newLines);
        setExcelRawInput('');
        setShowExcelBox(false);
    };

    // 🔄 🧠 [เอนจิ้นรันต่อเนื่องอัตโนมัติ]: เมื่อพี่แก้แถวใด ๆ ก็ตาม แถวใต้ล่างทั้งหมดจะคำนวณปรับบวกต่อกันไปเองทันทีชิดซ้าย
    const handleCellChangeAndCascade = (targetIndex: number, newValue: string) => {
        setLines(prev => {
            const updatedLines = prev.map(line => line.index === targetIndex ? { ...line, second: newValue } : line);
            const currentParsed = parseFloat(newValue);
            if (fixedDiff === null || isNaN(currentParsed)) return updatedLines;

            return updatedLines.map((line, idx) => {
                if (idx <= targetIndex) return line; 
                const stepsFromTarget = idx - targetIndex;
                return {
                    ...line,
                    second: String(parseFloat((currentParsed + (stepsFromTarget * fixedDiff)).toFixed(2)))
                };
            });
        });
    };

    // 💾 บันทึกแผนผังเวลาถาวรการันตีสิทธิ์ผ่านและปลอดภัยลงตารางจริง
    const handleSaveMapping = async () => {
        if (!resolvedTrackUuid) {
            alert('⚠️ ระบบกำลังตรวจค้นหาความปลอดภัยรหัสโครงสร้างแทร็ก โปรดลองกดใหม่อีกครั้งครับพี่');
            return;
        }
        
        setIsSaving(true);
        try {
            // สั่งล้างข้อมูลโดยใช้ UUID แท้จริงในการล็อกเป้าทำลาย ปลอดภัยร้อยเปอร์เซ็นต์
            const { error: delErr } = await supabase.from('track_lyric_timings').delete().eq('track_id', resolvedTrackUuid);
            if (delErr) throw delErr;

            const rowsToInsert = lines.map(line => ({
                track_id: resolvedTrackUuid, // ฝังค่าคีย์หลักสากล UUID ตรงเงื่อนไขฐานข้อมูลเป๊ะๆ
                line_index: line.index,
                lyric_text: line.text,
                target_second: parseFloat(line.second) || 0.00
            }));

            const { error: insErr } = await supabase.from('track_lyric_timings').insert(rowsToInsert);
            if (insErr) throw insErr;

            alert('💾 ระบบฝังจำพิกัดเวลาแบบ Dynamic Velocity เรียบร้อยครับพี่!');
            router.push('/studio'); 
        } catch (err) {
            console.error("Save failed with:", err);
            alert('เกิดข้อผิดพลาดสิทธิ์ตารางฐานข้อมูล โปรดเปิดปลดล็อก RLS ในขั้นตอนที่ 1 ครับพี่');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#030712] text-white p-6 select-none font-sans">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5 mb-4">
                <div className="space-y-1">
                    <button onClick={() => router.push('/studio')} className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-bold hover:underline mb-1">
                        <ArrowLeft size={12} /> ย้อนกลับหน้าคลังจัดคิว
                    </button>
                    <div className="flex items-center gap-2">
                        <Clock size={18} className="text-cyan-400" />
                        <h1 className="text-lg font-black tracking-wide text-gray-100">สตูดิโอป้อนพิกัดเวลา (Dynamic Lyric Mapper)</h1>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-xl font-medium">🎯 เพลง: {songTitle}</p>
                </div>

                <button
                    onClick={handleSaveMapping} disabled={isSaving}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-95 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                >
                    <Save size={14} strokeWidth={3} /> {isSaving ? 'กำลังบันทึก...' : 'ฝังจำผังเวลาถาวร'}
                </button>
            </div>

            <div className="max-w-5xl mx-auto mb-4 bg-[#0a1224] border border-cyan-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400"><Sparkles size={16} /></div>
                    <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-wider">แผงเครื่องมือช่วยกรอกข้อมูลอัจฉริยะ</h3>
                        <p className="text-[10px] text-gray-400">
                            {fixedDiff !== null ? `🟢 เปิดระบบอนุกรมหน่วงโซ่ต่อเนื่อง ผลต่างสะสมคงที่อยู่ที่: [ ${fixedDiff} วินาที ]` : 'พิมพ์เฉพาะแถว 1 และ 2 เพื่อใช้ระบบล็อกอนุกรม'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        type="button" onClick={handleApplyAutoSeries}
                        className="flex-1 md:flex-none px-4 py-2 bg-cyan-500 text-black text-[10px] font-black tracking-wider uppercase rounded-xl hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                        <Zap size={12} fill="currentColor" /> ล็อกค่ารันอนุกรมเริ่มต้น (แถว 1-2)
                    </button>

                    <button
                        type="button" onClick={() => setShowExcelBox(!showExcelBox)}
                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-400 hover:text-white text-[10px] font-black tracking-wider uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                        <FileSpreadsheet size={12} /> {showExcelBox ? 'ปิดช่องนำเข้า' : 'นำเข้าจาก Excel'}
                    </button>
                </div>
            </div>

            {showExcelBox && (
                <div className="max-w-5xl mx-auto mb-4 bg-[#051611] border border-emerald-500/30 p-4 rounded-2xl space-y-3 shadow-inner">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">📋 วางเฉพาะคอลัมน์ค่าวินาทีที่คัดลอกมาจาก Excel ลงในกล่องนี้:</div>
                    <textarea
                        rows={3} value={excelRawInput} onChange={(e) => setExcelRawInput(e.target.value)}
                        placeholder="ตัวอย่างชิ้นงาน:&#10;21&#10;29&#10;37"
                        className="w-full bg-black/50 border border-emerald-500/20 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-400 transition-all no-scrollbar"
                    />
                    <div className="flex justify-end">
                        <button
                            type="button" onClick={handleApplyExcelImport}
                            className="px-4 py-1.5 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:opacity-90 transition-all"
                        >
                            ⚡ สั่งกระจายค่าวินาทีลงตาราง
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto bg-[#080f1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-12 bg-[#0d162b] border-b border-white/10 p-3 text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                    <div className="col-span-2 text-center border-r border-white/5">แถวที่</div>
                    <div className="col-span-3 text-center border-r border-white/5">⏰ เวลาเป้าหมาย (วินาที)</div>
                    <div className="col-span-7 pl-6">🎤 ข้อความเนื้อหาคำร้อง / ประโยคบทเรียน</div>
                </div>

                <div className="divide-y divide-white/5 max-h-[58vh] overflow-y-auto no-scrollbar">
                    {lines.map((line, idx) => (
                        <div key={line.index} className="grid grid-cols-12 items-center p-2.5 hover:bg-white/[0.02] transition-colors group">
                            <div className="col-span-2 text-center font-mono text-xs text-gray-500 font-bold border-r border-white/5">
                                {idx + 1}
                            </div>

                            <div className="col-span-3 px-3 border-r border-white/5">
                                <div className="relative flex items-center">
                                    <input 
                                        type="number" step="0.1" min="0" placeholder="0.0"
                                        value={line.second === '0' ? '' : line.second}
                                        onChange={(e) => handleCellChangeAndCascade(line.index, e.target.value)}
                                        className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl py-1.5 px-3 pl-8 text-xs font-mono font-black text-center text-amber-400 focus:outline-none transition-all"
                                    />
                                    <Clock size={12} className="absolute left-2.5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                                    <span className="absolute right-2.5 font-mono text-[9px] font-bold text-gray-600">วิ</span>
                                </div>
                            </div>

                            <div className="col-span-7 pl-6 text-sm font-bold text-gray-200 group-hover:text-white transition-colors tracking-wide">
                                {line.text}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function LyricMapperPage() {
    return (
        <Suspense fallback={<div className="p-6 text-cyan-400 font-mono">Loading dynamic system layout...</div>}>
            <LyricMapperContent />
        </Suspense>
    );
}