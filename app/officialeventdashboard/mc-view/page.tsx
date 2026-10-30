'use client';
import RouteGuard from '@/components/RouteGuard';
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
    ArrowLeft, CheckCircle2, Clock, PlayCircle, Loader2,
    AlertTriangle, MessageSquare, X, Send, Save, Mic,
    FileText, Users, Bell, Palette, FastForward, ListChecks
} from 'lucide-react';

interface Bearer {
    id: string;
    sequence_order: number;
    agency_name: string;
    placer_name: string;
    placer_position: string;
    gold_bearer_name: string;
    gold_bearer_position: string;
    silver_bearer_name: string;
    silver_bearer_position: string;
    status: 'pending' | 'ready' | 'completed';
}

type IncomingMsg = {
    id: string;
    time: string;
    text: string;
    isShowingOnMarquee: boolean;
};

function MCScreenContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // 🌟 รองรับทั้ง query string แบบ eventId และ event_id
    const paramEventId = searchParams.get('eventId') || searchParams.get('event_id') || 'current';

    // ==========================================
    // 🌟 STATES พื้นฐาน & ข้อมูล
    // ==========================================
    const [activeEventId, setActiveEventId] = useState<string | null>(null);
    const [eventData, setEventData] = useState<any>(null);
    const [agencies, setAgencies] = useState<Bearer[]>([]);
    const [activeAgency, setActiveAgency] = useState<Bearer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // แก้ไข Hydration Error ของเวลา
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // --- UI States (ซูม & ธีม Marquee) ---
    const [textScale, setTextScale] = useState<number>(1.0);
    const [marqueeTheme, setMarqueeTheme] = useState<number>(0); // 0 = น้ำเงิน/ทอง, 1 = ม่วง/ขาว

    // --- Message, Inbox & Marquee States ---
    const [isInboxOpen, setIsInboxOpen] = useState<boolean>(false);
    const [incomingMessages, setIncomingMessages] = useState<IncomingMsg[]>([]);
    const [urgentSms, setUrgentSms] = useState<{ text: string, sender: string } | null>(null);
    const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
    const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);

    // --- SOS States ---
    const [showSosModal, setShowSosModal] = useState(false);
    const [sosText, setSosText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [quickSosMessages, setQuickSosMessages] = useState([
        "ลำดับคิวนี้หายไปไหน?", "ขอเปลี่ยนไมโครโฟนด่วน", "พิธีกรขอพัก 2 นาที", "ข้ามคิวถัดไปเลยไหม?"
    ]);

    const supabase = createClient();

    // ==========================================
    // 🌟 EFFECTS & DATA FETCHING
    // ==========================================
    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ดึงข้อมูล Event (เพื่องาน Marquee) และ คิวพานพุ่ม
    const fetchInitialData = async () => {
        setIsLoading(true);
        try {
            let actualEventId = paramEventId;

            // 1. ดึงข้อมูล Event
            if (paramEventId === 'current') {
                const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false }).limit(1).single();
                if (data) { setEventData(data); setActiveEventId(data.id); actualEventId = data.id; }
            } else {
                const { data } = await supabase.from('events').select('*').eq('id', paramEventId).single();
                if (data) { setEventData(data); setActiveEventId(data.id); }
            }

            // 2. ดึงข้อมูลคิวพานพุ่ม
            if (actualEventId) {
                const { data: qData } = await supabase.from('event_ceremony_bearers')
                    .select('*').eq('event_id', actualEventId).order('sequence_order', { ascending: true });

                if (qData) {
                    setAgencies(qData as Bearer[]);
                    if (!activeAgency) {
                        const nextUnread = qData.find((a: Bearer) => a.status !== 'completed');
                        if (nextUnread) setActiveAgency(nextUnread);
                    }
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [paramEventId]);

    // เปิด Realtime
    useEffect(() => {
        if (!activeEventId) return;

        // ฟังการเปลี่ยนคิวพานพุ่มจากหน้าลงทะเบียน
        const queueChannel = supabase.channel(`phanphum_updates_${activeEventId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_ceremony_bearers', filter: `event_id=eq.${activeEventId}` },
                () => { fetchInitialData(); }
            ).subscribe();

        // ฟัง SMS จากหน้า SM
        const smsChannel = supabase.channel(`receive-sms-phanphum-${activeEventId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_live_messages', filter: `event_id=eq.${activeEventId}` },
                (payload) => {
                    const newMsg = payload.new;
                    const isFromSM = newMsg.sender_role === 'sm' || newMsg.sender_role === 'admin';
                    const isForUs = !newMsg.target_screen || ['all', 'mc_phan_phum', 'mc_view'].includes(newMsg.target_screen);

                    if (isFromSM && isForUs) {
                        const finalMessage = newMsg.message_text || "ไม่มีข้อความ";
                        const finalSender = newMsg.sender_name || "ศูนย์อำนวยการ";
                        const timeStr = new Date(newMsg.created_at || Date.now()).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                        setUrgentSms({ text: finalMessage, sender: finalSender });
                        setUrgentIntercomMsg(finalMessage);
                        setShowUrgentBanner(true);

                        setIncomingMessages(prev => [{
                            id: newMsg.id || Date.now().toString(),
                            time: timeStr,
                            text: finalMessage,
                            isShowingOnMarquee: true
                        }, ...prev]);
                        setIsInboxOpen(true);
                    }
                }).subscribe();

        return () => {
            supabase.removeChannel(queueChannel);
            supabase.removeChannel(smsChannel);
        };
    }, [activeEventId]);

    // ==========================================
    // 🌟 ระบบ MARQUEE & INBOX
    // ==========================================
    const marqueeDisplayText = useMemo(() => {
        const activeMessages = incomingMessages.filter(msg => msg.isShowingOnMarquee);
        if (activeMessages.length > 0) {
            return activeMessages.map(msg => `🔴 ประกาศด่วน [เวลา ${msg.time}]: ${msg.text}`).join('  ✦✦✦  ');
        }
        // ถ้าไม่มี SMS ให้โชว์ชื่องาน + หน่วยงาน
        return `${eventData?.title || 'งานพิธีวางพานพุ่ม'} | ${eventData?.brand_name || 'NiiVaa SmartEvent'}`;
    }, [incomingMessages, eventData]);

    const toggleMarqueeTheme = () => setMarqueeTheme(prev => prev === 0 ? 1 : 0);
    const toggleMarquee = (id: string) => setIncomingMessages(prev => prev.map(msg => msg.id === id ? { ...msg, isShowingOnMarquee: !msg.isShowingOnMarquee } : msg));
    const resolveMessage = (id: string) => setIncomingMessages(prev => prev.filter(msg => msg.id !== id));

    // ==========================================
    // 🌟 ระบบ SOS
    // ==========================================
    const handleVoiceInput = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return alert("เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง");

        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => setSosText(prev => prev + " " + event.results[0][0].transcript);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        recognition.start();
    };

    const handleSaveSosMessage = () => {
        if (!sosText.trim()) return;
        if (!quickSosMessages.includes(sosText)) setQuickSosMessages(prev => [sosText, ...prev]);
    };

    const handleDeleteSosMessage = (msgToDelete: string) => {
        if (window.confirm(`ต้องการลบข้อความ "${msgToDelete}" ใช่หรือไม่?`)) {
            setQuickSosMessages(prev => prev.filter(msg => msg !== msgToDelete));
        }
    };

    const handleSendSOS = async (presetText?: string) => {
        const messageToSend = typeof presetText === 'string' ? presetText : sosText;
        if (!messageToSend || !messageToSend.trim() || !activeEventId) return;

        try {
            await supabase.from('event_live_messages').insert({
                event_id: activeEventId,
                sender_name: 'พิธีกร (พานพุ่ม)',
                sender_role: 'mc',
                message_text: `🚨 SOS ด่วน: ${messageToSend.trim()}`,
                is_approved: true,
                target_screen: 'staff'
            });
            setShowSosModal(false);
            setSosText('');
        } catch (err) { console.error("ส่ง SOS ล้มเหลว:", err); }
    };

    // ==========================================
    // 🌟 การจัดการคิว
    // ==========================================
    const markAsReadAndNext = async (id: string) => {
        const updatedAgencies = agencies.map(a => a.id === id ? { ...a, status: 'completed' as const } : a);
        setAgencies(updatedAgencies);

        const currentIndex = updatedAgencies.findIndex(a => a.id === id);
        const nextAgency = updatedAgencies.slice(currentIndex + 1).find(a => a.status !== 'completed');
        setActiveAgency(nextAgency || null);

        await supabase.from('event_ceremony_bearers').update({ status: 'completed' }).eq('id', id);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-500">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="text-xl font-bold">กำลังโหลดกระดานคิวพิธีพานพุ่ม...</p>
            </div>
        );
    }

    // ธีมสี Marquee
    const marqueeThemes = [
        { bg: 'bg-blue-950/80', border: 'border-blue-500/50', text: 'text-amber-400', badgeBg: 'bg-blue-600', badgeText: 'text-white' }, // 0: น้ำเงิน/ทอง
        { bg: 'bg-purple-950/80', border: 'border-purple-500/50', text: 'text-white', badgeBg: 'bg-purple-600', badgeText: 'text-white' }  // 1: ม่วง/ขาว
    ];
    const currTheme = marqueeThemes[marqueeTheme];

    return (
        <div className="h-screen bg-[#020617] text-gray-200 font-sans flex flex-col overflow-hidden selection:bg-cyan-500/30">

            {/* 🚨 แบนเนอร์ฉุกเฉินกลางจอ */}
            {showUrgentBanner && urgentIntercomMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-3xl bg-red-600/95 backdrop-blur-md border-2 border-red-400 text-white p-5 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.6)] animate-in slide-in-from-top-10 flex flex-col items-center text-center">
                    <div className="flex items-center gap-3 mb-2 text-amber-300">
                        <AlertTriangle className="w-7 h-7 animate-pulse" />
                        <h2 className="text-xl font-black tracking-wider">คำสั่งด่วนจากผู้กำกับเวที (SM)</h2>
                        <AlertTriangle className="w-7 h-7 animate-pulse" />
                    </div>
                    <p className="text-2xl font-bold leading-relaxed">{urgentIntercomMsg}</p>
                    <button onClick={() => setShowUrgentBanner(false)} className="mt-4 px-6 py-2 bg-white text-red-600 font-bold rounded-xl hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2">
                        <X size={16} /> รับทราบและปิดข้อความ
                    </button>
                </div>
            )}

            {/* ========================================= */}
            {/* 🚀 HEADER & NAVBAR */}
            {/* ========================================= */}
            <header className="bg-[#0A1326]/95 backdrop-blur-md border-b border-cyan-900/50 shrink-0 shadow-lg z-50">
                {/* แถบส่วนบน: โลโก้ และ ปุ่มนำทาง */}
                <div className="px-6 py-3 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center space-x-6">
                        <Link href="/officialeventdashboard?type=official" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-cyan-400 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Image src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" width={140} height={40} className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" priority />
                        <div className="hidden lg:flex items-center bg-cyan-950/40 border border-cyan-800/50 px-4 py-1.5 rounded-xl ml-2">
                            <PlayCircle className="w-4 h-4 text-cyan-400 mr-2 animate-pulse" />
                            <span className="text-cyan-300 text-xs font-bold tracking-wide">PHAN-PHUM PROMPTER</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* ป้าย SMS */}
                        {urgentSms && (
                            <div className="hidden sm:flex bg-red-600/90 border border-red-400 text-white px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-in fade-in zoom-in items-center gap-2 mr-2">
                                <AlertTriangle size={16} className="animate-pulse text-amber-300" />
                                <div className="flex flex-col text-left mr-2">
                                    <span className="text-[9px] font-black uppercase text-amber-300">จาก: {urgentSms.sender}</span>
                                    <span className="text-xs font-bold truncate max-w-[150px]">{urgentSms.text}</span>
                                </div>
                                <button onClick={() => setUrgentSms(null)} className="p-1 hover:bg-black/30 rounded-lg transition-colors"><X size={14} /></button>
                            </div>
                        )}
                        {/* 🌟 ปุ่มลิงก์ใหม่ */}
                        <button onClick={() => router.push(`/officialeventdashboard/phan-phum-registration?eventId=${activeEventId}`)} className="flex items-center gap-2 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                            <Users size={14} /> ลงทะเบียนพานพุ่ม
                        </button>
                        <button onClick={() => router.push(`/officialeventdashboard/mc-script?event_id=${activeEventId}`)} className="flex items-center gap-2 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                            <FileText size={14} /> สคริปต์พิธีการ
                        </button>
                    </div>
                </div>

                {/* แถบส่วนล่าง: Marquee & Controls */}
                <div className="px-6 py-2.5 flex justify-between items-center relative">
                    <div className="flex items-center gap-3 flex-1 overflow-hidden pr-4">
                        {/* 🌟 MARQUEE */}
                        <div className={`flex-1 flex items-center border rounded-lg px-4 py-1.5 overflow-hidden transition-colors ${currTheme.bg} ${currTheme.border}`}>
                            <span className={`${currTheme.badgeBg} ${currTheme.badgeText} text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 mr-3 flex items-center gap-1 shadow-sm`}>
                                <Bell size={12} className={incomingMessages.some(m => m.isShowingOnMarquee) ? "animate-pulse text-amber-300" : ""} /> INFO
                            </span>
                            <div className="flex-1 overflow-hidden relative flex items-center">
                                <style>{`
                                    @keyframes scroll-text { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
                                    .animate-scroll { display: inline-block; white-space: nowrap; animation: scroll-text 20s linear infinite; }
                                `}</style>
                                <div className={`animate-scroll text-sm font-bold tracking-wider ${currTheme.text}`}>
                                    {marqueeDisplayText}
                                </div>
                            </div>
                        </div>
                        {/* ปุ่มเปลี่ยนธีม Marquee */}
                        <button onClick={toggleMarqueeTheme} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-white/10 transition-colors shrink-0" title="เปลี่ยนสีแถบวิ่ง">
                            <Palette size={16} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <button onClick={() => setShowSosModal(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                            <AlertTriangle size={14} /> SOS
                        </button>
                        <div className="flex items-center space-x-2 text-fuchsia-400 bg-fuchsia-950/30 px-4 py-1.5 rounded-xl border border-fuchsia-900/50 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
                            <Clock className="w-4 h-4" />
                            <span className="text-xl font-bold font-mono tracking-wider">
                                {mounted ? currentTime.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ========================================= */}
            {/* MAIN CONTENT (Split Screen) */}
            {/* ========================================= */}
            <main className="flex-1 flex overflow-hidden p-4 gap-4">

                {/* 🌟 ฝั่งซ้าย 65%: Focus Reader */}
                <div className="w-[65%] bg-[#0A1326]/50 rounded-3xl border border-[#1E3A68] flex flex-col shadow-2xl relative overflow-hidden">
                    {/* ของประดับ Background */}
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"></div>

                    {/* 🌟 แถบเครื่องมือควบคุม (ซูม & ถัดไป) ย้ายมามุมขวาบน */}
                    <div className="absolute top-5 right-5 flex items-start gap-4 z-20">
                        {/* ปุ่มซูม A-/A+ */}
                        <div className="flex gap-2 bg-[#020617]/80 p-1.5 rounded-xl border border-cyan-500/30 shadow-lg">
                            <button onClick={() => setTextScale(s => Math.max(0.5, s - 0.1))} className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors">A-</button>
                            <button onClick={() => setTextScale(s => Math.min(2.0, s + 0.1))} className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 px-4 py-2 rounded-lg text-sm font-bold transition-colors">A+</button>
                        </div>

                        {/* ปุ่มอ่านแล้ว ย้ายมาอยู่บน */}
                        <button
                            disabled={!activeAgency}
                            onClick={() => activeAgency && markAsReadAndNext(activeAgency.id)}
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-lg font-black py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-30 disabled:cursor-not-allowed group border border-cyan-400/50"
                        >
                            <CheckCircle2 size={24} />
                            อ่านแล้ว & ถัดไป
                            <FastForward size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* 🌟 กล่องสคริปต์ จัดเนื้อหาชิดบน (justify-start) */}
                    <div className="p-8 pt-6 flex-1 flex flex-col justify-start relative z-10 overflow-y-auto custom-scrollbar pr-10">
                        {activeAgency ? (
                            <div className="animate-in fade-in slide-in-from-right-8 duration-500 w-full mt-20">
                                {/* ครอบด้วย Zoom Scale */}
                                <div style={{ transform: `scale(${textScale})`, transformOrigin: 'top left' }} className="transition-transform duration-200 w-full max-w-4xl mx-auto space-y-6">

                                    {/* ชื่อหน่วยงาน */}
                                    <div className="border-l-[6px] border-cyan-500 pl-6 py-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-3 py-1 rounded-lg text-xs font-bold tracking-widest uppercase">
                                                ลำดับที่ {activeAgency.sequence_order}
                                            </span>
                                            {activeAgency.status === 'pending' && (
                                                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 px-3 py-1 rounded-lg text-xs font-bold tracking-widest uppercase animate-pulse">
                                                    ⏳ ยังไม่มารายงานตัว
                                                </span>
                                            )}
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-md">
                                            {activeAgency.agency_name}
                                        </h1>
                                    </div>

                                    <div className="bg-gray-900/60 border border-gray-800 p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-md">
                                        {/* ผู้วางพาน */}
                                        <div className="space-y-1">
                                            <p className="text-cyan-400 text-sm font-bold flex items-center mb-2 uppercase tracking-wider">
                                                <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span> ผู้วางพานพุ่ม
                                            </p>
                                            <p className="text-3xl font-black text-white pl-4">{activeAgency.placer_name || '-'}</p>
                                            {activeAgency.placer_position && (
                                                <p className="text-xl text-gray-400 pl-4 font-medium mt-1">{activeAgency.placer_position}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 border-t border-gray-800 pt-6">
                                            {/* พุ่มทอง */}
                                            <div className="space-y-1 bg-yellow-950/20 p-4 rounded-2xl border border-yellow-900/30">
                                                <p className="text-yellow-500 text-xs font-bold flex items-center mb-2 uppercase tracking-wider">
                                                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span> ผู้เชิญพุ่มทอง
                                                </p>
                                                <p className="text-xl font-bold text-yellow-100 pl-4">{activeAgency.gold_bearer_name || '-'}</p>
                                                <p className="text-sm text-yellow-600/80 pl-4 mt-1">{activeAgency.gold_bearer_position}</p>
                                            </div>

                                            {/* พุ่มเงิน */}
                                            <div className="space-y-1 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                                                <p className="text-gray-400 text-xs font-bold flex items-center mb-2 uppercase tracking-wider">
                                                    <span className="w-2 h-2 rounded-full bg-gray-400 mr-2 shadow-[0_0_8px_rgba(156,163,175,0.8)]"></span> ผู้เชิญพุ่มเงิน
                                                </p>
                                                <p className="text-xl font-bold text-gray-200 pl-4">{activeAgency.silver_bearer_name || '-'}</p>
                                                <p className="text-sm text-gray-500 pl-4 mt-1">{activeAgency.silver_bearer_position}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <CheckCircle2 className="w-20 h-20 mb-4 opacity-20 text-cyan-500" />
                                <h2 className="text-3xl font-black text-cyan-900/50">จบรายการคิวทั้งหมด</h2>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🌟 ฝั่งขวา 35%: Queue List */}
                <div className="w-[35%] bg-[#0A1326] rounded-3xl border border-[#1E3A68] shadow-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-zinc-900/30 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-2">
                            <ListChecks className="text-cyan-400" size={20} />
                            <h3 className="font-black text-base text-white">ลำดับคิวทั้งหมด</h3>
                        </div>
                        <span className="bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-lg text-xs font-bold">
                            {agencies.length} หน่วยงาน
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {agencies.map((agency) => {
                            const isActive = activeAgency?.id === agency.id;
                            const isCompleted = agency.status === 'completed';
                            const isPending = agency.status === 'pending';

                            // 🌟 ระบบสีขอบซ้าย: ส้ม (pending), ฟ้า (พร้อม/กำลังอ่าน), เทา (อ่านแล้ว)
                            let borderClass = "border-l-[5px] border-gray-700";
                            if (isActive) borderClass = "border-l-[5px] border-cyan-400";
                            else if (isPending) borderClass = "border-l-[5px] border-orange-500";
                            else if (!isCompleted) borderClass = "border-l-[5px] border-blue-500";

                            return (
                                <div
                                    key={agency.id}
                                    onClick={() => setActiveAgency(agency)}
                                    className={`cursor-pointer p-3 rounded-2xl transition-all duration-200 flex items-center border-y border-r border-transparent ${borderClass}
                                        ${isActive ? 'bg-cyan-950/40 border-y-cyan-900 border-r-cyan-900 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.01]'
                                            : isCompleted ? 'bg-zinc-900/30 opacity-40 hover:opacity-100 grayscale'
                                                : 'bg-zinc-900/80 hover:bg-zinc-800 hover:border-y-white/10 hover:border-r-white/10'
                                        }
                                    `}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm mr-3 shrink-0
                                        ${isActive ? 'bg-cyan-500 text-black' : isCompleted ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-800 text-zinc-300'}
                                    `}>
                                        {isCompleted ? <CheckCircle2 size={18} className="text-emerald-500" /> : agency.sequence_order}
                                    </div>

                                    <div className="overflow-hidden flex-1">
                                        <p className={`font-bold text-sm truncate ${isActive ? 'text-white' : isCompleted ? 'text-zinc-500 line-through' : isPending ? 'text-orange-200' : 'text-zinc-200'}`}>
                                            {agency.agency_name}
                                        </p>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p className={`text-[10px] truncate ${isActive ? 'text-cyan-300' : 'text-zinc-500'}`}>
                                                {agency.placer_name || 'ไม่มีข้อมูลชื่อ'}
                                            </p>
                                            {isPending && !isCompleted && !isActive && (
                                                <span className="text-[9px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded ml-2">รอเช็คอิน</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </main>

            {/* 🚨 MODAL: SOS */}
            {showSosModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#020617] border border-red-500/30 rounded-3xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-red-950/40">
                            <h2 className="text-xl font-black text-white flex items-center gap-2"><AlertTriangle className="text-red-500" /> ส่งสัญญาณฉุกเฉิน (SOS)</h2>
                            <button onClick={() => setShowSosModal(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <p className="text-sm text-zinc-400 font-medium">ส่งข้อความด่วนไปยังหน้าจอ Monitor หลัก (สามารถสร้างและบันทึกข้อความเตรียมไว้ได้)</p>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                                {quickSosMessages.map((msg, i) => (
                                    <div key={i} className="flex items-center bg-zinc-800/80 border border-white/5 rounded-xl overflow-hidden group">
                                        <button onClick={() => handleSendSOS(msg)} className="hover:bg-red-600 hover:text-white text-zinc-300 text-xs px-3 py-1.5 transition-colors font-medium flex items-center gap-1.5" title="กดส่งทันที">{msg}</button>
                                        <button onClick={() => handleDeleteSosMessage(msg)} className="px-2 py-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/50 transition-colors border-l border-white/5" title="ลบข้อความนี้"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="relative mt-2">
                                <textarea value={sosText} onChange={(e) => setSosText(e.target.value)} placeholder="พิมพ์ หรือ พูด ข้อความที่ต้องการ..." className="w-full h-32 bg-black border border-white/10 rounded-2xl p-4 text-white resize-none outline-none focus:border-red-500 text-base" />
                                <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                    <button onClick={handleVoiceInput} className={`p-2 rounded-lg transition-all border ${isListening ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-zinc-800 border-white/10 text-zinc-400 hover:text-white'}`}><Mic size={16} /></button>
                                    <button onClick={handleSaveSosMessage} disabled={!sosText.trim()} className="p-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:text-amber-400 disabled:opacity-50 disabled:hover:text-zinc-400 transition-all"><Save size={16} /></button>
                                </div>
                            </div>
                            <button onClick={() => handleSendSOS(sosText)} disabled={!sosText.trim()} className="w-full bg-red-900/80 hover:bg-red-700 text-red-200 font-black text-lg py-4 rounded-xl mt-2 transition-all flex items-center justify-center gap-2 border border-red-500/50 disabled:opacity-50">
                                <Send size={20} /> ส่งออกไปยัง Live Monitor
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🌟 กล่อง Inbox มุมขวาล่าง */}
            <div className="fixed bottom-6 right-6 z-[999] flex flex-col items-end">
                {isInboxOpen && (
                    <div className="mb-4 w-80 bg-blue-900/95 backdrop-blur-xl border border-blue-400/50 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="px-4 py-3 border-b border-blue-400/30 flex justify-between items-center bg-black/20">
                            <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={16} className="text-blue-400" /> กล่องข้อความ SM</h3>
                            <button onClick={() => setIsInboxOpen(false)} className="text-blue-300 hover:text-white p-1 bg-white/10 hover:bg-red-500 rounded-md transition-colors"><X size={16} /></button>
                        </div>
                        <div className="p-3 flex flex-col gap-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                            {incomingMessages.length > 0 ? incomingMessages.map((msg) => (
                                <div key={msg.id} className={`border rounded-xl p-3 transition-colors ${msg.isShowingOnMarquee ? 'bg-blue-900/40 border-blue-400' : 'bg-black/40 border-white/5'}`}>
                                    <div className="text-[10px] text-blue-300 font-bold mb-1 flex items-center gap-1"><Clock size={10} /> เวลา {msg.time}</div>
                                    <p className="text-sm text-white font-medium mb-3">{msg.text}</p>
                                    <div className="flex gap-2 border-t border-white/10 pt-2 mt-auto">
                                        <button onClick={() => toggleMarquee(msg.id)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-colors flex justify-center items-center gap-1 ${msg.isShowingOnMarquee ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
                                            {msg.isShowingOnMarquee ? '👀 ซ่อนจากแถบวิ่ง' : '📢 โชว์บนแถบวิ่ง'}
                                        </button>
                                        <button onClick={() => resolveMessage(msg.id)} className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] font-bold rounded-lg transition-colors">✅ รับทราบ</button>
                                    </div>
                                </div>
                            )) : <div className="text-xs text-center text-blue-300/50 py-6 font-bold">ไม่มีข้อความใหม่</div>}
                        </div>
                    </div>
                )}
                <button onClick={() => setIsInboxOpen(!isInboxOpen)} className="relative bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] transition-all transform hover:scale-110 border-2 border-blue-400/50">
                    <MessageSquare size={24} />
                    {incomingMessages.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-[#020617] animate-bounce">{incomingMessages.length}</span>}
                </button>
            </div>

        </div>
    );
}

export default function MCScreenPage() {
    return (
        // 🌟 หุ้มด้วย RouteGuard และให้สิทธิ์เฉพาะ admin และ mc
        <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-500"><Loader2 className="w-10 h-10 animate-spin" /></div>}>
            <RouteGuard allowedRoles={['admin', 'mc']}>
                <MCScreenContent />
            </RouteGuard>
        </Suspense>
    );
}