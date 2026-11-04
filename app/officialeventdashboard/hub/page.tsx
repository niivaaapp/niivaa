"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ClipboardPen,Mic, FileText, ListOrdered, Settings, CalendarDays, ExternalLink,
    ChevronRight, LayoutDashboard, MonitorPlay, FileImage,MonitorSpeaker, Users,Tv,
    BookOpen, Edit3, Save, Type, FileSignature, CheckSquare,
    Sun, Moon, Loader2, ArrowLeft, Building2, MapPin, Key, LogOut, FileEdit, User
} from 'lucide-react';

function HubContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // 🌟 ดึง event_id จาก URL
    const eventId = searchParams.get('event_id');

    const [eventData, setEventData] = useState<any>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState<string>('กำลังโหลด...');

    // 🌟 ดึงข้อมูลงานและผู้ใช้จากฐานข้อมูลเมื่อโหลดหน้า
    useEffect(() => {
        if (!eventId) {
            alert("ไม่พบรหัสงานอีเวนต์ กรุณาเข้าผ่านหน้า Dashboard");
            router.push('/eventdashboard?type=official');
            return;
        }

        const fetchData = async () => {
            try {
                // 1. ดึงข้อมูล User ปัจจุบัน
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name, username')
                        .eq('id', user.id)
                        .maybeSingle();
                    setUserName(profile?.full_name || profile?.username || user.email || 'ผู้ดูแลระบบ');
                }

                // 2. ดึงข้อมูล Event
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', eventId)
                    .single();

                if (error) throw error;
                
                setEventData(data);
                setTempTitle(data.title || 'ไม่ระบุชื่องาน');
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
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

            setEventData({ ...eventData, title: tempTitle });
            setIsEditingTitle(false);
        } catch (error: any) {
            alert("บันทึกไม่สำเร็จ: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // 🌟 ฟังก์ชันออกจากระบบ (กลับไปหน้า eventhub)
    const handleLogout = async () => {
        if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            await supabase.auth.signOut();
            router.push('/eventhub');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a1128] flex items-center justify-center text-amber-400">
                <Loader2 className="w-10 h-10 animate-spin mr-2" />
                <span className="font-bold text-lg">กำลังโหลดข้อมูลงานรัฐพิธี...</span>
            </div>
        );
    }

    // 🌟 Component สร้างการ์ดเมนูแบบเดียวกับฝั่ง Dashboard หลัก
    const MenuCard = ({ href, icon: Icon, title, desc, colorClass, isExternal }: any) => {
        const linkProps = isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};
        const Comp = isExternal ? 'a' : Link;
        
        return (
            <Comp href={href} {...linkProps} className="group relative bg-[#111827] border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] hover:-translate-y-1 overflow-hidden block cursor-pointer">
                <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`}></div>
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors">
                        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                        <h3 className="text-slate-200 font-bold text-base mb-1 group-hover:text-amber-300 transition-colors">{title}</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                    </div>
                </div>
            </Comp>
        );
    };

    return (
        <div className="min-h-screen bg-[#020617] text-gray-200 font-sans pb-20 selection:bg-amber-500/30">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

                {/* ================= HEADER SECTION ================= */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 bg-[#0f172a] p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden shadow-lg">
                    {/* Gradient Line โทน น้ำเงิน-เหลืองอำพัน-เหลือง */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-amber-500 to-yellow-400"></div>

                    <div className="flex items-start gap-5 w-full md:w-auto flex-1">
                        <Link href="/eventdashboard?type=official" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700 mt-1 shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex-1 w-full max-w-3xl">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-500/30">
                                    งานรัฐพิธี (OFFICIAL)
                                </span>
                                <span className="flex items-center gap-1.5 bg-blue-900/40 text-blue-300 text-xs px-2.5 py-1 rounded-md border border-blue-800">
                                    <User size={12} /> {userName}
                                </span>
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Active
                                </span>
                            </div>
                            
                            {/* 🌟 ส่วนแก้ไขชื่องาน (Inline Editing) */}
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2 mb-1 w-full mt-2">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={tempTitle}
                                        onChange={(e) => setTempTitle(e.target.value)}
                                        className="w-full bg-slate-900 border border-amber-500 text-white text-xl sm:text-2xl font-black rounded-lg px-4 py-2 focus:outline-none focus:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                    />
                                    <button 
                                        onClick={handleSaveTitle} 
                                        disabled={isSaving}
                                        className="bg-amber-500 hover:bg-amber-400 text-black p-2.5 rounded-lg font-bold disabled:opacity-50 transition-colors shrink-0"
                                        title="บันทึก"
                                    >
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setIsEditingTitle(false);
                                            setTempTitle(eventData?.title || '');
                                        }} 
                                        className="bg-slate-700 hover:bg-slate-600 text-white p-2.5 rounded-lg transition-colors shrink-0"
                                        title="ยกเลิก"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3 group">
                                    {eventData?.title || 'ไม่ได้ระบุชื่องาน'}
                                    <button 
                                        onClick={() => setIsEditingTitle(true)} 
                                        className="text-slate-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="แก้ไขชื่องาน"
                                    >
                                        <Edit3 className="w-5 h-5" />
                                    </button>
                                </h1>
                            )}

                            {/* 🌟 ข้อมูล วันที่, หน่วยงาน, สถานที่ แถวเดียวกัน */}
                            <p className="text-slate-400 text-sm mt-2 flex items-center gap-x-4 gap-y-2 flex-wrap">
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays className="w-4 h-4 text-blue-400" />
                                    {eventData?.event_date ? new Date(eventData.event_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ยังไม่ระบุวันที่'}
                                </span>
                                {eventData?.brand_name && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-yellow-400" /> {eventData.brand_name}
                                    </span>
                                )}
                                {eventData?.location_hotel && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-amber-500" /> ณ {eventData.location_hotel}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* 🌟 ปุ่มควบคุมด้านขวาบน */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-start md:justify-end border-t border-slate-700/50 md:border-none pt-4 md:pt-0 mt-2 md:mt-0">
                        {/* ปุ่ม แก้ไขข้อมูลงาน (ใช้ร่วมกับหน้า Dashboard ปกติได้) */}
                        <Link
                            href={`/events/event-dashboard/edit?event_id=${eventId}&source=hub`} 
                            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all font-bold text-xs sm:text-sm"
                            title="แก้ไขข้อมูลพื้นฐาน"
                        >
                            <FileEdit className="w-4 h-4" />
                            <span className="hidden xl:inline">แก้ไขข้อมูลงาน</span>
                        </Link>

                        {/* ปุ่ม จัดการสิทธิ์ทีมงาน */}
                        <Link
                            href={`/officialeventdashboard/staff?event_id=${eventId}`}
                            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-xl transition-all font-bold text-xs sm:text-sm"
                            title="จัดการสิทธิ์ PIN Code"
                        >
                            <Key className="w-4 h-4" />
                            <span className="hidden xl:inline">จัดการสิทธิ์ทีมงาน</span>
                        </Link>

                        {/* ปุ่ม ออกจากระบบ */}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all font-bold text-xs sm:text-sm"
                            title="ออกจากระบบ"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden lg:inline">ออกจากระบบ</span>
                        </button>
                    </div>
                </div>

                {/* ================= MAIN CONTENT (MENU GRID) ================= */}
                <div className="space-y-10">

                    {/* หมวดที่ 1: กำหนดการจัดงาน */}
                    <section>
                        <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
                            <CalendarDays className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-bold text-slate-200">1. กำหนดการจัดงาน (Schedules)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MenuCard
                                href={`#`}
                                icon={Sun} title="พิธีทำบุญตักบาตร (ภาคเช้า)" colorClass="bg-blue-400"
                                desc="กำหนดการและรายละเอียดพิธีการในช่วงเช้า"
                            />
                            <MenuCard
                                href={`#`}
                                icon={Moon} title="พิธีถวายพระพร (ภาคค่ำ)" colorClass="bg-blue-400"
                                desc="กำหนดการและรายละเอียดพิธีการในช่วงค่ำ"
                            />
                        </div>
                    </section>

                    {/* หมวดที่ 2: สคริปต์ & คำกล่าวประธาน */}
                    <section>
                        <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
                            <FileSignature className="w-5 h-5 text-amber-400" />
                            <h2 className="text-lg font-bold text-slate-200">2. สคริปต์ & คำกล่าวประธาน (Scripts)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MenuCard
                                href={`/officialeventdashboard/script-builder?event_id=${eventId}`}
                                icon={ClipboardPen} title="เตรียมสคริปต์พิธีกร (MC)" colorClass="bg-amber-400"
                                desc="จัดการร่างสคริปต์พิธีกรแบบทางการ (MC Script-Builder)"
                            />
                            <MenuCard
                                href={`/officialeventdashboard/mc-script?event_id=${eventId}`}
                                icon={Mic} title="สคริปต์พิธีการ(MC-SCRIPT)" colorClass="bg-amber-400"
                                desc="หน้าจอสำหรับพิธีกรอ่านสคริปต์พิธีการ"
                            />
                            <MenuCard
                                href={`/officialeventdashboard/mc-view?event_id=${eventId}`}
                                icon={Mic} title="พิธีกรอ่านชื่อหน่วยงาน(MC-VIEW)" colorClass="bg-amber-400"
                                desc="หน้าจอสำหรับพิธีกรอ่านรายชื่อหน่วยงานเข้าวางพุ่มเงิน-พุ่มทอง ถวายราชสักการะ รายชื่อผู้วาง/ผู้เชิญพุ่ม"
                            />
                            <MenuCard
                                href={`/officialeventdashboard/speech-builder?event_id=${eventId}`}
                                icon={BookOpen} title="คำกล่าวถวายพระพรชัยมงคล" colorClass="bg-amber-400"
                                desc="ร่างและตั้งค่าคำกล่าวสำหรับประธานในพิธี"
                            />
                            <MenuCard
                                href={`#`}
                                icon={CheckSquare} title="คำกล่าวถวายสัตย์ปฏิญาณตนฯ" colorClass="bg-amber-400"
                                desc="ร่างและตั้งค่าคำกล่าวนำสำหรับพิธีถวายสัตย์ปฏิญาณ"
                            />
                            {/* 🌟 เพิ่มเมนู: พิธีกรแนะนำ VIP */}
                            <MenuCard
                                href={`/eventdashboard/showtime/vip?event_id=${eventId}&source=hub`}
                                icon={MonitorSpeaker} title="พิธีกรแนะนำ VIP (VIP Live)" colorClass="bg-amber-400"
                                desc="หน้าจอสำหรับพิธีกรอ่านประวัติและสั่งแสดงภาพ VIP ขึ้นจอ"
                            />

                        </div>
                    </section>

                    {/* หมวดที่ 3: จัดการผู้ร่วมงาน (Phan Phum & Guests) */}
                    <section>
                        <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
                            <ListOrdered className="w-5 h-5 text-yellow-400" />
                            <h2 className="text-lg font-bold text-slate-200">3. จัดการผู้ร่วมงาน (Guests & Phan Phum)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* 🌟 เพิ่มเมนู: ลงทะเบียนแขกเข้าร่วมงาน */}
                            <MenuCard
                                href={`/eventdashboard/attendees?event_id=${eventId}&source=hub`}
                                icon={Users} title="ลงทะเบียน & จัดการแขก" colorClass="bg-yellow-400"
                                desc="ระบบจุดลงทะเบียน และจัดการข้อมูลรายชื่อผู้เข้าร่วมงานทั้งหมด"
                            />
                            <MenuCard
                                href={`/officialeventdashboard/phan-phum-registration?event_id=${eventId}`}
                                icon={LayoutDashboard} title="แผงควบคุมคิว (Dashboard)" colorClass="bg-yellow-400"
                                desc="ระบบบริหารจัดการคิวการวางพานพุ่มตามลำดับเกียรติยศ"
                            />
                            <MenuCard
                                href={`/register/${eventId}`}
                                icon={ExternalLink} title="ฟอร์มลงทะเบียนหน่วยงาน" colorClass="bg-yellow-400"
                                desc="แชร์ลิงก์ให้หน่วยงานภายนอกลงทะเบียนเข้าร่วมพิธี"
                                isExternal={true}
                            />
                        </div>
                    </section>

                    {/* หมวดที่ 4: ระบบควบคุมหน้าจอสื่อ */}
                    <section>
                        <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
                            <MonitorPlay className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-bold text-slate-200">4. ระบบควบคุมหน้าจอสื่อ (Media Control)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MenuCard
                                href={`/officialeventdashboard/media-control?event_id=${eventId}`}
                                icon={MonitorPlay} title="แผงควบคุมสื่อและอักษรวิ่ง" colorClass="bg-blue-400"
                                desc="ควบคุม VTR, สไลด์ภาพ และข้อความ CG บนจอภาพหลัก"
                            />
                            {/* 🌟 เพิ่มเมนู: จอเวทีแสดงภาพ VIP (ใช้ Path Param /live/[eventId]) */}
                            <MenuCard
                                href={`/eventdashboard/live/${eventId}`}
                                icon={Tv} title="จอเวทีแสดงภาพ VIP" colorClass="bg-blue-400"
                                desc="หน้าจอแสดงผลบนเวที (รับสัญญาณจากหน้าจอพิธีกรแนะนำ VIP)"
                            />
                        </div>
                    </section>

                    {/* หมวดที่ 5: สรุปผลและรายงาน */}
                    <section>
                        <div className="flex items-center gap-3 mb-5 border-b border-slate-700/50 pb-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            <h2 className="text-lg font-bold text-slate-200">5. สรุปผลและรายงาน (Reports)</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MenuCard
                                href={`#`}
                                icon={FileImage} title="เทมเพลตรายงานจัดงานรัฐพิธี" colorClass="bg-amber-500"
                                desc="สรุปข้อมูลและออกรายงานเป็นรูปแบบไฟล์ PDF อัตโนมัติ"
                            />
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}

export default function SettingsHubPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a1128] flex items-center justify-center text-amber-400">
                <Loader2 className="w-10 h-10 animate-spin mr-2" />
                <span className="font-bold text-lg">กำลังโหลดหน้ากระดานควบคุม...</span>
            </div>
        }>
            <HubContent />
        </Suspense>
    );
}