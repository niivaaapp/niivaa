"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    Mic, FileText, ListOrdered, Settings, CalendarDays, ExternalLink,
    ChevronRight, LayoutDashboard, MonitorPlay, FileImage,
    BookOpen, Edit3, Save, Type, FileSignature, CheckSquare,
    Sun, Moon, Loader2
} from 'lucide-react';

function HubContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // 🌟 ดึง event_id จาก URL
    const eventId = searchParams.get('event_id');

    const [eventTitle, setEventTitle] = useState('กำลังโหลดชื่องาน...');
    const [eventData, setEventData] = useState<any>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 🌟 ดึงข้อมูลงานจากฐานข้อมูลเมื่อโหลดหน้า
    useEffect(() => {
        if (!eventId) {
            alert("ไม่พบรหัสงานอีเวนต์ กรุณาเข้าผ่านหน้า Dashboard");
            router.push('/eventdashboard?type=official');
            return;
        }

        const fetchEvent = async () => {
            try {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single();

                if (error) throw error;
                
                setEventData(data);
                setEventTitle(data.title || 'ไม่ระบุชื่องาน');
                setTempTitle(data.title || 'ไม่ระบุชื่องาน');
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvent();
    }, [eventId, router]);

    // 🌟 ฟังก์ชันบันทึกชื่องาน
    const handleSaveTitle = async () => {
        if (!tempTitle.trim()) {
            alert('ชื่องานไม่สามารถเว้นว่างได้');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('events')
                .update({ title: tempTitle })
                .eq('id', eventId);

            if (error) throw error;

            setEventTitle(tempTitle);
            setIsEditingTitle(false);
        } catch (error: any) {
            alert("บันทึกไม่สำเร็จ: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const neonCardStyle = "bg-gray-900 border border-green-400/40 rounded-2xl p-6 shadow-[0_0_12px_rgba(74,222,128,0.15)] hover:border-green-400/80 hover:shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all duration-300";

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-green-400">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-20">

            {/* ================= HEADER ================= */}
            <header className="bg-gray-900 border-b border-green-400/30 sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-auto">
                            <Image src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" width={160} height={50} className="h-full object-contain drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]" priority />
                        </div>
                        <div className="h-8 w-px bg-gray-800 mx-2"></div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-green-400" /> Settings Hub
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-300">NiiVaa Administrator</p>
                            <p className="text-xs text-green-400">ระบบจัดการงานรัฐพิธี</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-900/30 border border-green-400 flex items-center justify-center text-green-400 font-bold shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                            AD
                        </div>
                    </div>
                </div>
            </header>

            {/* ================= MAIN CONTENT ================= */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                
                <button 
                    onClick={() => router.push('/eventdashboard?type=official')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" /> กลับหน้ารายการงาน
                </button>

                {/* แบนเนอร์ชื่องาน (แก้ไขได้) */}
                <div className="bg-gradient-to-r from-gray-900 to-black border border-green-400/50 rounded-2xl p-8 mb-10 flex flex-col items-start shadow-[0_0_20px_rgba(74,222,128,0.2)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <span className="bg-green-950/50 text-green-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block border border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.3)]">
                        Active Event
                    </span>

                    <div className="w-full flex justify-between items-start">
                        <div className="w-full max-w-4xl z-10">
                            {isEditingTitle ? (
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={tempTitle}
                                        onChange={(e) => setTempTitle(e.target.value)}
                                        className="w-full bg-black border border-green-400 text-white text-2xl font-bold rounded-lg px-4 py-2 focus:outline-none focus:shadow-[0_0_15px_rgba(74,222,128,0.4)]"
                                    />
                                    <button onClick={handleSaveTitle} disabled={isSaving} className="bg-green-600 hover:bg-green-500 text-black p-2.5 rounded-lg font-bold disabled:opacity-50">
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    </button>
                                </div>
                            ) : (
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-4 group">
                                    {eventTitle}
                                    <button onClick={() => setIsEditingTitle(true)} className="text-gray-500 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit3 className="w-5 h-5" />
                                    </button>
                                </h2>
                            )}
                            <p className="text-gray-400 flex items-center mt-2">
                                <CalendarDays className="w-4 h-4 mr-2 text-green-500" /> 
                                {eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ยังไม่ระบุวันที่'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ================= GRID เมนูหลัก ================= */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* หมวดที่ 1: กำหนดการจัดงาน */}
                    <div className={neonCardStyle}>
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
                            <div className="p-2.5 bg-gray-800 border border-green-400/30 text-green-400 rounded-lg"><CalendarDays className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold text-white">กำหนดการจัดงาน</h3>
                        </div>
                        <div className="space-y-3">
                            <Link href={`#`} className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <Sun className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">พิธีทำบุญตักบาตร (ภาคเช้า)</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-400" />
                            </Link>
                            <Link href={`#`} className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <Moon className="w-4 h-4 text-blue-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">พิธีถวายพระพร (ภาคค่ำ)</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-400" />
                            </Link>
                        </div>
                    </div>

                    {/* หมวดที่ 2: สคริปต์ & คำกล่าวประธาน */}
                    <div className={neonCardStyle}>
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
                            <div className="p-2.5 bg-gray-800 border border-green-400/30 text-green-400 rounded-lg"><FileSignature className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold text-white">สคริปต์ & คำกล่าวประธาน</h3>
                        </div>
                        <div className="space-y-3">
                            {/* 🌟 แนบ ?event_id= ไปกับทุกลิงก์ */}
                            <Link href={`/officialeventdashboard/script-builder?event_id=${eventId}`} className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <Mic className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">เตรียมสคริปต์พิธีกร (MC Script-Builder)</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-400" />
                            </Link>

                            <Link href={`/officialeventdashboard/speech-builder?event_id=${eventId}`} className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <BookOpen className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">คำกล่าวถวายพระพรชัยมงคล</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-400" />
                            </Link>

                            <Link href="#" className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <CheckSquare className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">คำกล่าวถวายสัตย์ปฏิญาณตนฯ</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* หมวดที่ 3: ระบบควบคุมสื่อบนเวที */}
                    <div className={neonCardStyle}>
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
                            <div className="p-2.5 bg-gray-800 border border-green-400/30 text-green-400 rounded-lg"><MonitorPlay className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold text-white">ระบบควบคุมหน้าจอสื่อ</h3>
                        </div>
                        <div className="space-y-3">
                            <Link href={`/officialeventdashboard/media-control?event_id=${eventId}`} className="flex items-center justify-between p-4 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group shadow-md">
                                <div className="flex items-center gap-4">
                                    <MonitorPlay className="w-6 h-6 text-gray-400 group-hover:text-green-400" />
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-300 group-hover:text-white">แผงควบคุมสื่อและอักษรวิ่ง</h4>
                                        <p className="text-xs text-gray-500">ควบคุม VTR, สไลด์, และ CG บนจอภาพ</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400" />
                            </Link>
                        </div>
                    </div>

                    {/* หมวดที่ 4: จัดการผู้ร่วมงาน (พานพุ่ม) */}
                    <div className={neonCardStyle}>
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
                            <div className="p-2.5 bg-gray-800 border border-green-400/30 text-green-400 rounded-lg"><ListOrdered className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold text-white">จัดการผู้ร่วมงาน (พานพุ่ม)</h3>
                        </div>
                        <div className="space-y-3">
                            <Link href={`/officialeventdashboard/phan-phum-registration?event_id=${eventId}`} className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <LayoutDashboard className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">แผงควบคุมคิว (Dashboard)</span>
                                </div>
                            </Link>
                            <a href={`/register/${eventId}`} target="_blank" className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">ฟอร์มลงทะเบียนหน่วยงาน</span>
                                </div>
                            </a>
                        </div>
                    </div>

                    {/* หมวดที่ 5: สรุปผลและรายงาน */}
                    <div className={`${neonCardStyle} md:col-span-2 lg:col-span-1`}>
                        <div className="flex items-center gap-3 mb-5 border-b border-gray-800 pb-3">
                            <div className="p-2.5 bg-gray-800 border border-green-400/30 text-green-400 rounded-lg"><FileText className="w-5 h-5" /></div>
                            <h3 className="text-lg font-bold text-white">สรุปผลและรายงาน</h3>
                        </div>
                        <div className="space-y-3">
                            <Link href="#" className="flex items-center justify-between p-3 bg-black hover:bg-gray-800 border border-gray-800 hover:border-green-400/50 rounded-xl transition-all group">
                                <div className="flex items-center gap-3">
                                    <FileImage className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                                    <span className="text-sm font-medium text-gray-300 group-hover:text-white">เทมเพลตรายงานจัดงานรัฐพิธี</span>
                                </div>
                                <span className="text-[10px] bg-green-900/40 border border-green-400/50 text-green-400 px-2 py-0.5 rounded uppercase">Export PDF</span>
                            </Link>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default function SettingsHubPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-950 flex items-center justify-center text-green-400">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        }>
            <HubContent />
        </Suspense>
    );
}