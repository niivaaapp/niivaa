'use client';
import RouteGuard from '@/components/RouteGuard';
import { useState, useEffect, CSSProperties, Suspense } from "react";
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
// 🌟 นำเข้า Icon HelpCircle และ BookOpen เพิ่มเติม
import { RefreshCw, Settings, X, Radio, Palette, Trash2, ListFilter, Play, Pause, ToggleLeft, ToggleRight, Megaphone, Image, QrCode, HelpCircle, BookOpen } from "lucide-react";

// ==========================================
// 🎨 คลังแสง Themes & Media 
// ==========================================
const themeConfigs: any = {
    elegantWhite: { name: "ขาวมินิมอล (งานแต่ง)", bg: "#ffffff", btnBg: "#f8fafc", border: "border-slate-200", text: "#1e293b", accent: "#d4af37" },
    roseGold: { name: "โรสโกลด์ (หรูหรา)", bg: "#fff1f2", btnBg: "#ffe4e6", border: "border-rose-200", text: "#881337", accent: "#f43f5e" },
    skyBlue: { name: "ฟ้าสว่าง (โปร่งสบาย)", bg: "#f0f9ff", btnBg: "#e0f2fe", border: "border-sky-200", text: "#0c4a6e", accent: "#0284c7" },
    matchaGreen: { name: "มัทฉะกรีน (ธรรมชาติ)", bg: "#f0fdf4", btnBg: "#dcfce7", border: "border-green-200", text: "#14532d", accent: "#16a34a" },
    royalPurple: { name: "ม่วงราชสำนัก", bg: "#4c1d95", btnBg: "#5b21b6", border: "border-purple-400/30", text: "#f3e8ff", accent: "#c084fc" },
    sunsetWarm: { name: "ส้มอบอุ่น (ซันเซ็ต)", bg: "#fff7ed", btnBg: "#ffedd5", border: "border-orange-200", text: "#7c2d12", accent: "#ea580c" },
    midnightBlue: { name: "กรมท่าคลาสสิก", bg: "#1e3a8a", btnBg: "#1e40af", border: "border-blue-400/30", text: "#eff6ff", accent: "#60a5fa" },
    champagne: { name: "แชมเปญ (งานเลี้ยง)", bg: "#fcf6e3", btnBg: "#fef3c7", border: "border-amber-200", text: "#52472b", accent: "#d97706" },
    cyberNeon: { name: "นีออนล้ำยุค (ปาร์ตี้)", bg: "#09090b", btnBg: "#18181b", border: "border-cyan-500/30", text: "#a5f3fc", accent: "#22d3ee" },
    earthTone: { name: "เอิร์ธโทน (อบอุ่น)", bg: "#f5f5f4", btnBg: "#e7e5e4", border: "border-stone-300", text: "#44403c", accent: "#8b5cf6" },
    crimsonRed: { name: "แดงเบอร์กันดี", bg: "#7f1d1d", btnBg: "#991b1b", border: "border-red-400/30", text: "#fef2f2", accent: "#fca5a5" },
    mintBreeze: { name: "มิ้นต์สดใส", bg: "#ccfbf1", btnBg: "#a7f3d0", border: "border-teal-200", text: "#134e4a", accent: "#14b8a6" },
    lavender: { name: "ลาเวนเดอร์ (นุ่มนวล)", bg: "#faf5ff", btnBg: "#f3e8ff", border: "border-purple-200", text: "#581c87", accent: "#a855f7" },
    peach: { name: "พีชละมุน", bg: "#fff1f2", btnBg: "#ffe4e6", border: "border-rose-200", text: "#9f1239", accent: "#fb7185" },
    monotone: { name: "เทาโมเดิร์น (วิชาการ)", bg: "#f8fafc", btnBg: "#f1f5f9", border: "border-slate-300", text: "#334155", accent: "#64748b" },
    goldenBrown: { name: "น้ำตาลทอง", bg: "#451a03", btnBg: "#78350f", border: "border-amber-500/30", text: "#fef3c7", accent: "#f59e0b" },
    emerald: { name: "เขียวมรกต (ทรงพลัง)", bg: "#064e3b", btnBg: "#065f46", border: "border-emerald-400/30", text: "#ecfdf5", accent: "#34d399" },
    pinkMilk: { name: "นมชมพู (น่ารัก)", bg: "#fdf2f8", btnBg: "#fce7f3", border: "border-pink-200", text: "#831843", accent: "#f472b6" },
    navyGold: { name: "เนวี่-โกลด์ (ผู้บริหาร)", bg: "#0f172a", btnBg: "#1e293b", border: "border-slate-500/30", text: "#fef08a", accent: "#eab308" },
    classicBlack: { name: "ดำคลาสสิก (ดั้งเดิม)", bg: "#000000", btnBg: "#111111", border: "border-white/10", text: "#ffffff", accent: "#cbd5e1" }
};

const fallbackMediaPools: any = {
    seaPool: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
        "https://images.unsplash.com/photo-1473116763269-255ea7604bb6?auto=format&fit=crop&w=1920&q=80"
    ],
    skyPool: [
        "https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?auto=format&fit=crop&w=1920&q=80",
        "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1920&q=80"
    ],
    cyberVideoPool: [
        "https://assets.mixkit.co/videos/preview/mixkit-tunnel-of-futuristic-blue-lights-42081-large.mp4"
    ],
    waveVideoPool: [
        "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-ocean-near-a-shore-from-above-41838-large.mp4"
    ]
};

const particleElements = Array.from({ length: 15 }).map((_, idx) => ({
    id: idx,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 6 + 3}px`,
    delay: `${Math.random() * 10}s`,
    duration: `${Math.random() * 12 + 12}s`,
    maxOp: Math.random() * 0.25 + 0.1
}));

// ==========================================
// ⚙️ ENGINE: ระบบควบคุมหน้าจอหลัก
// ==========================================
function MarqueeDisplayContent() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get("event_id");

    const [isAdmin, setIsAdmin] = useState(false);
    const [screenSettings, setScreenSettings] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [heldMessages, setHeldMessages] = useState<any[]>([]);
    const [dbBackgroundMedia, setDbBackgroundMedia] = useState<any[]>([]);
    const [modalTab, setModalTab] = useState("live");
    const [loading, setLoading] = useState(true);
    const [showControls, setShowControls] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [localIsPaused, setLocalIsPaused] = useState(false);
    const [showQr, setShowQr] = useState(true);
    const [currentBg, setCurrentBg] = useState({ url: "", type: "color" });
    const [prevBg, setPrevBg] = useState({ url: "", type: "color" });
    const [crossfadeTrigger, setCrossfadeTrigger] = useState(true);
    const [tick, setTick] = useState(0);

    // 🌟 State ควบคุมแถบ Slide-over Drawer คู่มือ
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const role = localStorage.getItem('niivaa_event_role');
        if (role === 'admin' || role === 'controller') setIsAdmin(true);

        const styleTag = document.createElement("style");
        styleTag.innerHTML = `
      @keyframes cssMarqueeH { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(-50%,0,0); } }
      @keyframes cssMarqueeV { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(0,-50%,0); } }
      @keyframes tickerAnimation { 0% { transform: translate3d(0,0,0); } 100% { transform: translate3d(-50%,0,0); } }
      @keyframes ambientFloat {
        0% { transform: translateY(105vh) translateX(0); opacity: 0; }
        10% { opacity: var(--p-max-op); }
        90% { opacity: var(--p-max-op); }
        100% { transform: translateY(-10vh) translateX(45px); opacity: 0; }
      }
      .animate-css-marquee-horiz { animation: cssMarqueeH var(--marquee-duration, 20s) linear infinite; }
      .animate-css-marquee-vert { animation: cssMarqueeV var(--marquee-duration, 20s) linear infinite; }
      .animate-bottom-ticker { animation: tickerAnimation 25s linear infinite; }
      .ambient-star { position: absolute; background: white; border-radius: 50%; pointer-events: none; opacity: 0; animation: ambientFloat var(--p-duration) linear infinite; animation-delay: var(--p-delay); }
    `;
        document.head.appendChild(styleTag);
        return () => { document.head.removeChild(styleTag); };
    }, []);

    const fetchAllData = async (currentEventId: string) => {
        const { data: approved } = await supabase.from("event_live_messages")
            .select("*")
            .eq("event_id", currentEventId)
            .eq("is_approved", true)
            .in("target_screen", ['all', 'marquee'])
            .order("created_at", { ascending: false })
            .limit(100);
        if (approved) setMessages(approved);

        const { data: held } = await supabase.from("event_live_messages")
            .select("*")
            .eq("event_id", currentEventId)
            .eq("is_approved", false)
            .in("target_screen", ['all', 'marquee'])
            .order("created_at", { ascending: false })
            .limit(100);
        if (held) setHeldMessages(held);

        const { data: screenInfo } = await supabase.from('social_screens').select('id').eq('event_id', currentEventId).single();
        if (screenInfo?.id) {
            const { data: media } = await supabase.from("screen_background_media").select("*").eq("screen_id", screenInfo.id);
            if (media) setDbBackgroundMedia(media);
        }
    };

    useEffect(() => {
        if (!eventId) return;
        const loadCore = async () => {
            try {
                setLoading(true);
                await fetchAllData(eventId);
                const channel = supabase.channel("live-msg-" + eventId)
                    .on("postgres_changes", { event: "*", schema: "public", table: "event_live_messages", filter: "event_id=eq." + eventId },
                        async () => { await fetchAllData(eventId); }).subscribe();

                return () => { supabase.removeChannel(channel); };
            } catch (err) { console.error(err); } finally { setLoading(false); }
        };
        loadCore();
    }, [eventId]);

    useEffect(() => {
        if (!eventId || !screenSettings?.id) return;
        const pChannel = supabase.channel("panel-" + eventId).on("postgres_changes", { event: "UPDATE", schema: "public", table: "social_screens", filter: "id=eq." + screenSettings.id }, (payload) => setScreenSettings(payload.new)).subscribe();
        return () => { supabase.removeChannel(pChannel); };
    }, [eventId, screenSettings?.id]);

    const updateSettings = async (updates: any) => {
        setScreenSettings((prev: any) => ({ ...prev, ...updates }));
        await supabase.from("social_screens").update(updates).eq("event_id", eventId);
    };

    const handleSelectPresetTheme = async (themeKey: string) => {
        const th = themeConfigs[themeKey];
        if (!th) return;
        await updateSettings({ theme: themeKey, bg_type: "color", bg_color: th.bg, box_color: th.btnBg, text_color: th.text });
    };

    const handleRejectMessage = async (msgId: string) => { await supabase.from("event_live_messages").delete().eq("id", msgId); };
    const handleHoldMessage = async (msgId: string) => { await supabase.from("event_live_messages").update({ is_approved: false }).eq("id", msgId); };
    const handleResumeMessage = async (msgId: string) => { await supabase.from("event_live_messages").update({ is_approved: true }).eq("id", msgId); };

    const handleToggleClearOrShowAll = async () => {
        if (!screenSettings?.id) return;
        if (messages.length > 0) {
            await supabase.from("social_messages").update({ status: "held" }).eq("screen_id", screenSettings.id).eq("status", "approved");
        } else if (heldMessages.length > 0) {
            await supabase.from("social_messages").update({ status: "approved" }).eq("screen_id", screenSettings.id).eq("status", "held");
        }
    };

    const sortedPool = [...messages, ...heldMessages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const calculatedSets: any[] = [];
    for (let i = 0; i < sortedPool.length; i += 20) {
        const setGroup = sortedPool.slice(i, i + 20);
        const isFullyHeld = setGroup.filter(m => m.status === "held").length === setGroup.length;
        calculatedSets.push({ setIndex: (i / 20) + 1, rangeLabel: (i + 1) + " - " + Math.min(i + 20, sortedPool.length), items: setGroup, isFullyHeld: isFullyHeld });
    }

    const handleToggleSetStatus = async (setObj: any) => {
        const nextStatus = setObj.isFullyHeld ? "approved" : "held";
        const targetIds = setObj.items.map((m: any) => m.id);
        await supabase.from("social_messages").update({ status: nextStatus }).in("id", targetIds);
    };

    const speed = screenSettings?.speed || 80;
    const currentThemeKey = screenSettings?.theme || "cyanCyber";
    const theme = themeConfigs[currentThemeKey] || themeConfigs.cyanCyber;
    const isHorizontal = screenSettings?.direction !== "vertical";
    const cssSpeedDuration = ((255 - speed) * 0.85) + "s";

    const bgType = screenSettings?.bg_type || "color";
    const keyUrl = screenSettings?.bg_url || "";
    const tickerTextContent = screenSettings?.ticker_text || "✨ ยินดีต้อนรับสู่ระบบประกาศข้อความเรียลไทม์ ✨";
    const boxOpacityValue = screenSettings?.box_opacity !== undefined ? screenSettings.box_opacity : 15;

    const hexTextColor = screenSettings?.text_color || "#ffffff";
    const hexBoxColor = screenSettings?.box_color || "#000812";
    const hexBgColor = screenSettings?.bg_color || "#000d1a";

    let activeMediaUrl = keyUrl;
    let dynamicBgType = bgType;
    const filteredDbMedia = dbBackgroundMedia.filter(m => m.pool_key === keyUrl);

    if (filteredDbMedia.length > 0) {
        const rotateIdx = Math.floor(Date.now() / (10 * 1000)) % filteredDbMedia.length;
        activeMediaUrl = filteredDbMedia[rotateIdx].media_url;
        dynamicBgType = filteredDbMedia[rotateIdx].media_type;
    } else if (fallbackMediaPools[keyUrl]) {
        const targetPool = fallbackMediaPools[keyUrl];
        const rotateIdx = Math.floor(Date.now() / (10 * 1000)) % targetPool.length;
        activeMediaUrl = targetPool[rotateIdx];
    }

    useEffect(() => {
        if (activeMediaUrl !== currentBg.url || dynamicBgType !== currentBg.type) {
            setPrevBg(currentBg);
            setCurrentBg({ url: activeMediaUrl, type: dynamicBgType });
            setCrossfadeTrigger(false);
            const timer = setTimeout(() => setCrossfadeTrigger(true), 40);
            return () => clearTimeout(timer);
        }
    }, [activeMediaUrl, dynamicBgType, currentBg]);

    const renderBackgroundNode = (mediaObj: { url: string; type: string }) => {
        if (mediaObj.type === "image" && mediaObj.url) {
            return <img key={mediaObj.url} src={mediaObj.url} alt="BGM" className="absolute inset-0 w-full h-full object-cover" />;
        }
        if (mediaObj.type === "video" && mediaObj.url) {
            return <video key={mediaObj.url} src={mediaObj.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />;
        }
        return null;
    };

    const hexToRgbJson = (hexStr: string) => {
        const cleanHex = hexStr.replace("#", "");
        return { r: parseInt(cleanHex.substring(0, 2), 16) || 0, g: parseInt(cleanHex.substring(2, 4), 16) || 0, b: parseInt(cleanHex.substring(4, 6), 16) || 0 };
    };
    const rgbObj = hexToRgbJson(hexBoxColor);

    const dynamicBoxStyle = {
        backgroundColor: "rgba(" + rgbObj.r + ", " + rgbObj.g + ", " + rgbObj.b + ", " + (boxOpacityValue / 100) + ")",
        borderColor: "rgba(255, 255, 255, " + (boxOpacityValue === 0 ? 0 : boxOpacityValue / 300) + ")",
        borderWidth: boxOpacityValue === 0 ? "0px" : "1px",
        boxShadow: boxOpacityValue > 0 ? "0 0 25px rgba(" + rgbObj.r + "," + rgbObj.g + "," + rgbObj.b + ", 0.4)" : "none",
        backdropFilter: boxOpacityValue === 0 ? "none" : "blur(12px)"
    };

    const currentFontSize = screenSettings?.font_size || 112;

    const dynamicTextStyle = {
        color: hexTextColor,
        textShadow: "0 0 15px rgba(255,255,255,0.2), 0 0 30px " + hexTextColor + "40",
        fontSize: `${currentFontSize}px`,
        lineHeight: '1.2'
    };
    const dynamicMainBgStyle = { backgroundColor: dynamicBgType === "color" ? hexBgColor : "#000000" };

    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const generatedQrUrl = originUrl ? "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(originUrl + "/attendee-view?event_id=" + eventId) : '';

    const mainClass = "relative w-full h-screen overflow-hidden font-prompt select-none transition-colors duration-1000 text-white";
    const liveBadgeClass = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border border-white/10 text-cyan-400";
    const navTitleClass = "text-base font-black italic tracking-tighter text-white";
    const updateBtnClass = "flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-slate-100 to-slate-300 text-slate-900 font-black text-xs py-3 rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer";
    const configBtnClass = "bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-3 rounded-xl text-white cursor-pointer transition-all flex items-center justify-center";
    const marqueeClass = "flex gap-16 whitespace-nowrap will-change-transform " + (isHorizontal ? "animate-css-marquee-horiz" : "flex-col animate-css-marquee-vert h-full justify-center");
    const boxCardClass = "inline-flex flex-col items-center justify-center border rounded-[3.5rem] mx-6 px-20 py-14 min-w-[600px] transition-all duration-300";

    const horizBtnClass = "py-2 rounded-xl border cursor-pointer " + (isHorizontal ? "bg-blue-600 border-blue-400 text-white" : "bg-white/5 text-slate-400 border-transparent opacity-40");
    const vertBtnClass = "py-2 rounded-xl border cursor-pointer " + (!isHorizontal ? "bg-blue-600 border-blue-400 text-white" : "bg-white/5 text-slate-400 border-transparent opacity-40");
    const blackoutBtnClass = "w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer " + (screenSettings?.blackout_mode ? "bg-rose-600 text-white" : "bg-white/10 text-slate-300");

    const tabLiveClass = "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer " + (modalTab === "live" ? "bg-white text-slate-950 border-white" : "bg-white/5 text-slate-400 border-transparent");
    const tabPausedClass = "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer " + (modalTab === "paused" ? "bg-white text-slate-950 border-white" : "bg-white/5 text-slate-400 border-transparent");
    const tabSetsClass = "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer " + (modalTab === "sets" ? "bg-white text-slate-950 border-white" : "bg-white/5 text-slate-400 border-transparent");

    const clearToggleBtnClass = "w-full py-2.5 border text-xs font-black tracking-widest active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 mb-3 rounded-xl " +
        (messages.length > 0 ? "bg-rose-600/20 border-rose-500/40 text-rose-400 hover:bg-rose-600 hover:text-white" : "bg-green-600/20 border-green-500/40 text-green-400 hover:bg-green-600 hover:text-white");

    const preloadItems = [
        ...dbBackgroundMedia.map(m => ({ url: m.media_url, type: m.media_type })),
        ...Object.values(fallbackMediaPools).flat().map((url: any) => ({
            url, type: url.includes('.mp4') ? 'video' : 'image'
        }))
    ];
    const uniquePreloadItems = Array.from(new Map(preloadItems.map(item => [item.url, item])).values());

    if (!eventId) return <div className="min-h-screen bg-black flex items-center justify-center text-red-400 font-bold text-xl">⚠️ กรุณาระบุ event_id ใน URL</div>;

    const poolItems = dbBackgroundMedia.filter(m => m.pool_key === keyUrl);
    const selectedLoopItems = poolItems.filter(m => m.is_selected_for_loop);
    const activePoolSource = selectedLoopItems.length > 0 ? selectedLoopItems : poolItems;

    if (activePoolSource.length > 0) {
        const rotateIdx = Math.floor(Date.now() / (5 * 1000)) % activePoolSource.length;
        activeMediaUrl = activePoolSource[rotateIdx].media_url;
        dynamicBgType = activePoolSource[rotateIdx].media_type;
    } else if (fallbackMediaPools[keyUrl]) {
        const targetPool = fallbackMediaPools[keyUrl];
        const rotateIdx = Math.floor(Date.now() / (5 * 1000)) % targetPool.length;
        activeMediaUrl = targetPool[rotateIdx];
    }
    return (
        <main className={mainClass} style={dynamicMainBgStyle}>

            {/* 🌟 Slide-over Drawer (คู่มือการใช้งาน) */}
            <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
                <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl transform transition-transform duration-500 ease-in-out flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                    <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                        <h2 className="text-2xl font-black text-cyan-400 flex items-center gap-2"><BookOpen size={24} /> คู่มือการใช้งาน</h2>
                        <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"><X size={20} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-300 custom-scrollbar">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Settings size={18} className="text-cyan-400" /> 1. การตั้งค่าหน้าจอ (Settings)</h3>
                            <p>คลิกที่ปุ่ม <b>ฟันเฟือง (⚙️)</b> มุมขวาบนเพื่อปรับแต่งจอแสดงผล คุณสามารถปรับ <b className="text-cyan-300">ความเร็วสายพานข้อความ</b>, <b className="text-cyan-300">ขนาดตัวอักษร</b> และ <b className="text-cyan-300">ความโปร่งแสงของกล่องข้อความ</b> ได้ทันทีตามความเหมาะสมของหน้าจอโปรเจคเตอร์</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><QrCode size={18} className="text-green-400" /> 2. ระบบคิวอาร์โค้ด (QR Code)</h3>
                            <p>ในเมนูตั้งค่า จะมีปุ่ม <b>👁️ แสดง/ซ่อน QR Code</b> เมื่อเปิดใช้งาน ระบบจะสร้าง QR Code มุมซ้ายล่างโดยอัตโนมัติ เพื่อให้ผู้ร่วมงานสามารถ <b className="text-green-300">"สแกนเพื่อเข้าสู่หน้าจอพิมพ์ส่งคำอวยพร"</b> (Attendee View) และส่งข้อความขึ้นจอได้ทันทีจากมือถือของตนเอง</p>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Palette size={18} className="text-pink-400" /> 3. ธีมและพื้นหลัง (Backgrounds)</h3>
                            <p className="mb-2">ในเมนูตั้งค่า คุณสามารถเลือกเปลี่ยนพื้นหลังหน้าจอได้ 3 รูปแบบ:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b>คลังภาพ/วิดีโอสำเร็จรูป:</b> เช่น ทะเล, ท้องฟ้า, ธรรมชาติ หรือธีมไซเบอร์</li>
                                <li><b>สลับเฉดสีตั้งต้น 20 ธีม:</b> จับคู่สีสวยงามให้เหมาะกับงานหลากหลายประเภท (เช่น งานแต่ง, งานปาร์ตี้, งานวิชาการ)</li>
                                <li><b>สลักสีอิสระ:</b> สามารถกำหนดแม่สีตัวอักษร สีกล่อง และสีพื้นหลังได้เองผ่าน Color Picker</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><ListFilter size={18} className="text-amber-400" /> 4. ศูนย์คัดกรองข้อความ (Moderation)</h3>
                            <p className="mb-2">ปุ่ม <b>🗂️ ศูนย์คัดกรองและแบ่งเซ็ตข้อความ</b> ใช้บริหารข้อความที่ผู้ร่วมงานส่งเข้ามา:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><b className="text-amber-300">กำลังวิ่ง:</b> ตรวจสอบข้อความที่วิ่งอยู่บนจอ สามารถกดลบทิ้ง หรือกดปุ่ม ⏸️ เพื่อสั่งพักข้อความ (Hold) ชั่วคราว</li>
                                <li><b className="text-amber-300">พักสายอยู่:</b> ดูข้อความที่ถูกซ่อนไว้ และกดปุ่ม ▶️ เพื่อนำกลับไปวิ่งบนจอใหม่</li>
                                <li><b className="text-amber-300">จัดเวรเป็นเซ็ต:</b> หากมีข้อความจำนวนมาก ระบบจะแบ่งข้อความเป็นเซ็ตละ 20 ข้อความ คุณสามารถเปิด/ปิดการแสดงผลทีละเซ็ต เพื่อไม่ให้หน้าจอโหลดหนักหรือแสดงข้อความเดิมซ้ำๆ นานเกินไป</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><ToggleLeft size={18} className="text-rose-400" /> 5. โหมดจอดำ (Blackout Mode)</h3>
                            <p>ปุ่มด้านล่างสุดของเมนูตั้งค่า ใช้สำหรับ <b>ปิดหน้าจอข้อความชั่วคราว</b> (จะขึ้นคำว่า Waiting for Ceremony) เหมาะสำหรับเปิดค้างไว้ในช่วงประธานกำลังกล่าวเปิดงาน หรือระหว่างรอพิธีการสำคัญ เพื่อไม่ให้สายตาคนในงานถูกรบกวนจากข้อความวิ่งครับ</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🎞️ เลเยอร์ชั้นล่างสุด: แสดงภาพเก่าตัวที่กำลังเฟดตัวจางออก */}
            <div className="absolute inset-0 z-0 opacity-100">{renderBackgroundNode(prevBg)}</div>

            {/* 🎞️ เลเยอร์ชั้นบน: ครอบคลาสเร่งความสว่างของภาพชิ้นใหม่ลอยนุ่ม ๆ ทับขึ้นมา */}
            <div className={"absolute inset-0 z-0 transition-opacity duration-1000 " + (crossfadeTrigger ? "opacity-100" : "opacity-0")}>
                {renderBackgroundNode(currentBg)}
            </div>

            {dynamicBgType !== "color" && <div className="absolute inset-0 bg-black/15 z-[5] pointer-events-none" />}

            {/* ✨ เลเยอร์เอฟเฟกต์ม่านหมอกละอองเวทมนตร์ฉากหน้า */}
            <div className="absolute inset-0 z-[6] overflow-hidden pointer-events-none">
                {particleElements.map((p) => (
                    <div
                        key={"star-" + p.id}
                        className="ambient-star"
                        style={{
                            left: p.left, width: p.size, height: p.size,
                            "--p-delay": p.delay, "--p-duration": p.duration, "--p-max-op": p.maxOp
                        } as CSSProperties}
                    />
                ))}
            </div>

            {screenSettings?.blackout_mode && (
                <div className="absolute inset-0 z-[200] bg-black flex items-center justify-center">
                    <p className="text-2xl opacity-40 tracking-widest uppercase font-bold animate-pulse">Waiting for Ceremony</p>
                </div>
            )}

            {/* 📱 ป้ายกล่อง QR Code อัจฉริยะดาร์กนีออนมุมซ้ายล่าง */}
            {showQr && generatedQrUrl && (
                <div className="absolute bottom-16 left-6 z-[130] p-3 bg-black/75 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 transition-all hover:scale-105">
                    <div className="bg-white p-1.5 rounded-xl shadow-inner">
                        <img src={generatedQrUrl} alt="Scan QR code to wish" className="w-24 h-24 select-none" />
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-cyan-400">
                        <QrCode size={11} className="animate-pulse" />
                        <span>สแกนส่งคำอวยพร</span>
                    </div>
                </div>
            )}

            {/* ⚡ แผงควบคุมสวิตช์มุมขวาบน */}
            <div className="absolute top-6 right-8 z-[150] w-[380px] flex flex-col gap-3 p-5">
                <div className="flex justify-between items-center w-full">
                    <div className={liveBadgeClass}>
                        <Radio size={10} className="animate-pulse" />
                        <span>NiiVaa REAL-TIME ACTIVE</span>
                    </div>
                    <h1 className={navTitleClass}>NiiVaa <span className="text-cyan-400">Live</span></h1>
                </div>

                <div className="flex items-center justify-end gap-2 w-full">
                    <button
                        onClick={() => window.location.reload()}
                        className={`${updateBtnClass} opacity-0 hover:opacity-100 transition-opacity duration-300`}
                    >
                        <RefreshCw size={12} /><span>⚡ UPDATE DATA</span>
                    </button>

                    {/* 🌟 ปุ่มเปิด Slide-over Drawer คู่มือ */}
                    <button onClick={() => setIsGuideOpen(true)} className={configBtnClass} title="คู่มือการใช้งาน">
                        <HelpCircle size={14} />
                    </button>

                    {isAdmin && (
                        <button onClick={() => setShowControls(!showControls)} className={configBtnClass} title="ตั้งค่าระบบ">
                            {showControls ? <X size={14} /> : <Settings size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {/* 💿 ENGINE: LINEAR MARQUEE LOOP */}
            <div className="relative w-full h-[calc(100vh-48px)] flex items-center justify-center overflow-hidden z-10 pb-12">
                {loading ? (
                    <div className="text-cyan-400 font-bold tracking-widest text-xs animate-pulse">CONNECTING...</div>
                ) : (
                    <div className="w-full flex items-center overflow-hidden py-12">
                        {!localIsPaused && !screenSettings?.blackout_mode && (
                            <div className={marqueeClass} style={{ "--marquee-duration": cssSpeedDuration } as React.CSSProperties}>
                                {messages.length === 0 ? (
                                    <div className="w-full text-center opacity-10 text-3xl italic">รอข้อความอวยพรส่งเข้ามาสดๆ...</div>
                                ) : (
                                    [...messages, ...messages].map((msg, i) => (
                                        <div key={msg.id + "-" + i} className={boxCardClass} style={dynamicBoxStyle}>
                                            <p className="text-6xl md:text-[7rem] font-black leading-tight tracking-tighter" style={dynamicTextStyle}>
                                                {msg.message_text}
                                            </p>
                                            <div className="mt-8 flex items-center gap-6 opacity-80">
                                                <div className="h-[2px] w-12 bg-current text-cyan-400" />
                                                <span className="text-3xl md:text-5xl font-light text-cyan-300">{msg.author}</span>
                                                <div className="h-[2px] w-12 bg-current text-cyan-400" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 📺 แถบประกาศวิ่งแถวล่างสุดดักดึงคอลัมน์ ticker_text */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-black/90 border-t border-white/10 z-[140] flex items-center overflow-hidden text-sm font-medium tracking-wide">
                <div className="absolute left-0 top-0 h-full bg-slate-900 px-4 z-20 border-r border-white/10 flex items-center gap-2 text-xs font-black tracking-widest text-amber-400">
                    <Megaphone size={14} className="animate-bounce" />
                    <span>INFO</span>
                </div>
                <div className="flex whitespace-nowrap will-change-transform animate-bottom-ticker pl-[100px]">
                    <span className="text-slate-300 mx-12">{tickerTextContent}</span>
                    <span className="text-slate-300 mx-12">{tickerTextContent}</span>
                </div>
            </div>

            {/* 🎛 แผงควบคุม CONFIG DROPDOWN */}
            {showControls && isAdmin && (
                <div className="fixed inset-0 z-[240]" onClick={() => setShowControls(false)}>
                    <div className="absolute top-[110px] right-8 w-[380px] p-5 rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl space-y-3 max-h-[75vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>SPEED (ปรับความเร็วสายพาน)</span>
                                <span className="text-white font-mono">{speed} Px</span>
                            </div>
                            <input type="range" min="5" max="230" value={speed} onChange={(e) => updateSettings({ speed: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg cursor-pointer" />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>FONT SIZE (ปรับขนาดตัวอักษร)</span>
                                <span className="text-white font-mono">{currentFontSize} px</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateSettings({ font_size: Math.max(40, currentFontSize - 10) })}
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-white/5 font-black text-sm transition-all active:scale-95"
                                >
                                    A-
                                </button>
                                <button
                                    onClick={() => updateSettings({ font_size: Math.min(300, currentFontSize + 10) })}
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-white/5 font-black text-lg transition-all active:scale-95"
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>BOX OPACITY (ความโปร่งแสงกล่อง)</span>
                                <span className="text-cyan-400 font-mono font-bold">{boxOpacityValue}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={boxOpacityValue} onChange={(e) => updateSettings({ box_opacity: parseInt(e.target.value) })} className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer" />
                        </div>

                        <div className="space-y-1 mt-4">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>QR CODE DISPLAY</span>
                                <span className="text-white font-mono">{showQr ? 'ON' : 'OFF'}</span>
                            </div>
                            <button
                                onClick={() => setShowQr(!showQr)}
                                className={`w-full py-2 rounded-lg border font-black text-sm transition-all active:scale-95 flex justify-center items-center gap-2 ${showQr ? 'bg-cyan-600 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'bg-slate-800 border-white/5 text-slate-500'}`}
                            >
                                {showQr ? '👁️ แสดง QR Code' : '🙈 ซ่อน QR Code'}
                            </button>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl space-y-2">
                            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">🔮 สลักเฉดสีอิสระด้วยวงสีหลังบ้าน</span>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="flex flex-col items-center gap-1 bg-black/30 p-2 rounded-lg border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold">อักษรหลัก</span>
                                    <input type="color" value={hexTextColor} onChange={(e) => updateSettings({ text_color: e.target.value })} className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent" />
                                </div>
                                <div className="flex flex-col items-center gap-1 bg-black/30 p-2 rounded-lg border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold">สีกระจกกล่อง</span>
                                    <input type="color" value={hexBoxColor} onChange={(e) => updateSettings({ box_color: e.target.value })} className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent" />
                                </div>
                                <div className="flex flex-col items-center gap-1 bg-black/30 p-2 rounded-lg border border-white/5">
                                    <span className="text-[9px] text-slate-400 font-bold">สีพื้นจอหลัก</span>
                                    <input type="color" value={hexBgColor} onChange={(e) => updateSettings({ bg_type: "color", bg_color: e.target.value })} className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase">
                                <Image size={12} /><span>คลังเซ็ตมีเดียเคลื่อนไหว (Auto-5 Sec)</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase">
                                    <Image size={12} /><span>คลังเซ็ตมีเดีย (ดึงภาพ/วิดีโอจากระบบอัปโหลด)</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[9px] font-black">
                                    <button
                                        onClick={() => updateSettings({ bg_type: "image", bg_url: "seaPool" })}
                                        className={`py-2.5 rounded-lg border text-center transition-all duration-300 ${screenSettings?.bg_url === 'seaPool' ? 'bg-slate-800 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] text-cyan-300 scale-[1.02]' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                        🌊 เซ็ตภาพวิวทะเลชายหาด
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ bg_type: "image", bg_url: "skyPool" })}
                                        className={`py-2.5 rounded-lg border text-center transition-all duration-300 ${screenSettings?.bg_url === 'skyPool' ? 'bg-slate-800 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] text-sky-300 scale-[1.02]' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                        ☁️ เซ็ตภาพท้องฟ้าปุยเมฆ
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ bg_type: "image", bg_url: "naturePool" })}
                                        className={`py-2.5 rounded-lg border text-center transition-all duration-300 ${screenSettings?.bg_url === 'naturePool' ? 'bg-slate-800 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.4)] text-green-300 scale-[1.02]' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                        🌲 เซ็ตภาพธรรมชาติ (ป่า/เขา)
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ bg_type: "image", bg_url: "cityPool" })}
                                        className={`py-2.5 rounded-lg border text-center transition-all duration-300 ${screenSettings?.bg_url === 'cityPool' ? 'bg-slate-800 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] text-amber-300 scale-[1.02]' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                        🏙️ เซ็ตภาพเมือง/อาคาร
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ bg_type: "video", bg_url: "cyberVideoPool" })}
                                        className={`py-2.5 rounded-lg border text-center transition-all duration-300 ${screenSettings?.bg_url === 'cyberVideoPool' ? 'bg-slate-800 border-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.4)] text-indigo-300 scale-[1.02]' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                        🌌 เซ็ตวิดีโอนีออนไซเบอร์
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ bg_type: "video", bg_url: "waveVideoPool" })}
                                        className={`py-2.5 rounded-lg border text-center transition-all duration-300 ${screenSettings?.bg_url === 'waveVideoPool' ? 'bg-slate-800 border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.4)] text-teal-300 scale-[1.02]' : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'}`}>
                                        🌊 เซ็ตวิดีโอคลื่นทะเล
                                    </button>
                                    <button
                                        onClick={() => updateSettings({ bg_type: "color", bg_url: "" })}
                                        className={`col-span-2 py-2 rounded-lg border border-dashed transition-all duration-300 ${!screenSettings?.bg_url || screenSettings?.bg_url === '' ? 'bg-slate-800 border-pink-400 shadow-[0_0_15px_rgba(244,114,182,0.4)] text-pink-300 scale-[1.02]' : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                        🎨 ถอดกราฟิก (ใช้เฉดสีสีพื้น 20 ธีมด้านล่าง)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase">
                                <Palette size={12} /><span>สลับเฉดสีตั้งต้น (20 เฉดสีแมตช์ธีมจริง)</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 max-h-[85px] overflow-y-auto pr-1 custom-scrollbar">
                                {Object.keys(themeConfigs).map((k) => {
                                    const isAct = currentThemeKey === k;
                                    const btnThemeClass = "text-[9px] py-1.5 rounded-lg border text-center transition-all cursor-pointer truncate px-0.5 " + "bg-black/40 " + (isAct ? "text-white border-white font-black ring-1 ring-white shadow-md" : "text-slate-300 border-white/5 hover:border-white/20");
                                    return (
                                        <button key={k} onClick={() => handleSelectPresetTheme(k)} className={btnThemeClass} style={{ color: themeConfigs[k].accent }}>
                                            {themeConfigs[k].name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        <button onClick={() => { setShowManageModal(true); setShowControls(false); }} className="w-full py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all">
                            <ListFilter size={14} /><span>🗂️ ศูนย์คัดกรองและแบ่งเซ็ตข้อความ</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                            <button onClick={() => updateSettings({ direction: "horizontal" })} className={horizBtnClass}>HORIZONTAL</button>
                            <button onClick={() => updateSettings({ direction: "vertical" })} className={vertBtnClass}>VERTICAL</button>
                        </div>

                        <button onClick={() => updateSettings({ blackout_mode: !screenSettings?.blackout_mode })} className={blackoutBtnClass}>
                            {screenSettings?.blackout_mode ? "TURN ON DISPLAY" : "BLACKOUT (ปิดหน้าจอชั่วคราวกลางพิธี)"}
                        </button>
                    </div>
                </div>
            )}

            {/* 🚫 POPUP WINDOW (หน้าต่างคัดกรอง) */}
            {showManageModal && isAdmin && (
                <div className="fixed inset-0 z-[250] bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowManageModal(false)}>
                    <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>

                        <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                            <div className="space-y-0.5">
                                <h3 className="text-sm font-black text-white tracking-wide">🗂️ ศูนย์บริหารจัดเวรข้อความหน้างาน</h3>
                                <p className="text-[10px] text-slate-400">ควบคุมรายข้อความ หรือสลับเวรแบบยกกลุ่มแพ็คละ 20 คิว</p>
                            </div>
                            <button onClick={() => setShowManageModal(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"><X size={16} /></button>
                        </div>

                        <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                            <button onClick={() => setModalTab("live")} className={tabLiveClass}>กำลังวิ่ง ({messages.length})</button>
                            <button onClick={() => setModalTab("paused")} className={tabPausedClass}>พักสายอยู่ ({heldMessages.length})</button>
                            <button onClick={() => setModalTab("sets")} className={tabSetsClass}>จัดเวรเป็นเซ็ต ({calculatedSets.length})</button>
                        </div>

                        <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">

                            {modalTab === "live" && (
                                <div className="space-y-2">
                                    {(messages.length > 0 || heldMessages.length > 0) && (
                                        <button onClick={handleToggleClearOrShowAll} className={clearToggleBtnClass}>
                                            {messages.length > 0 ? "🛑 CLEAR ALL LIVE (ส่งข้อความทั้งหมดไปพักชั่วคราว)" : "▶️ SHOW ALL HELD (ดึงข้อความที่พักทั้งหมดกลับขึ้นจอ)"}
                                        </button>
                                    )}
                                    {messages.length === 0 ? (
                                        <div className="text-center text-xs text-slate-500 py-10 italic">ไม่มีข้อความแสดงผลอยู่บนจอขณะนี้</div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div key={"live-row-" + msg.id} className="flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-xl gap-2">
                                                <div className="min-w-0 flex-1 space-y-0.5">
                                                    <p className="text-xs text-white font-bold leading-tight truncate">{msg.message_text}</p>
                                                    <p className="text-[10px] text-cyan-400 font-light">โดย: {msg.author}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <button onClick={() => handleHoldMessage(msg.id)} className="p-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 rounded-xl transition-all border border-amber-500/20 active:scale-95 flex items-center justify-center cursor-pointer"><Pause size={13} /></button>
                                                    <button onClick={() => handleRejectMessage(msg.id)} className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/20 active:scale-95 flex items-center justify-center cursor-pointer"><Trash2 size={13} /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {modalTab === "paused" && (
                                heldMessages.length === 0 ? (
                                    <div className="text-center text-xs text-slate-500 py-10 italic">ไม่มีข้อความถูกพักเบรคไว้ชั่วคราว</div>
                                ) : (
                                    heldMessages.map((msg) => (
                                        <div key={"held-row-" + msg.id} className="flex justify-between items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl gap-2 opacity-80 hover:opacity-100 transition-all">
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <p className="text-xs text-slate-300 leading-tight truncate">{msg.message_text}</p>
                                                <p className="text-[10px] text-amber-400/70 font-light">พักสายจาก: {msg.author}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button onClick={() => handleResumeMessage(msg.id)} className="p-2.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-slate-950 rounded-xl transition-all border border-green-500/20 active:scale-95 flex items-center justify-center cursor-pointer"><Play size={13} /></button>
                                                <button onClick={() => handleRejectMessage(msg.id)} className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all border border-rose-500/20 active:scale-95 flex items-center justify-center cursor-pointer"><Trash2 size={13} /></button>
                                            </div>
                                        </div>
                                    ))
                                )
                            )}

                            {modalTab === "sets" && (
                                calculatedSets.length === 0 ? (
                                    <div className="text-center text-xs text-slate-500 py-10 italic">ระบบยังไม่มีปริมาณข้อความเพียงพอในการแบ่งเซ็ต</div>
                                ) : (
                                    calculatedSets.map((chunk: any) => {
                                        const statusText = chunk.isFullyHeld ? "🟡 พักยกกลุ่ม (ซ่อนคิวเซ็ตนี้แล้ว)" : "🟢 ออนแอร์สด (กำลังวิ่งเข้าเวรบนจอ)";
                                        const cardBorder = chunk.isFullyHeld ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-green-500/30 bg-green-500/[0.02]";
                                        return (
                                            <div key={"set-chunk-" + chunk.setIndex} className={"flex justify-between items-center border p-4 rounded-xl gap-4 " + cardBorder}>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-black text-white">📦 เซ็ตข้อความคิวที่ {chunk.setIndex} (ลำดับ {chunk.rangeLabel})</p>
                                                    <p className={"text-[10px] font-bold " + (chunk.isFullyHeld ? "text-amber-400" : "text-green-400")}>{statusText}</p>
                                                </div>
                                                <button onClick={() => handleToggleSetStatus(chunk)} className="flex items-center justify-center p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer text-slate-300 hover:text-white">
                                                    {chunk.isFullyHeld ? <ToggleRight size={34} className="text-amber-500" /> : <ToggleLeft size={34} className="text-slate-600" />}
                                                </button>
                                            </div>
                                        );
                                    })
                                )
                            )}

                        </div>

                        <div className="pt-2 border-t border-white/5 flex justify-end">
                            <button onClick={() => setShowManageModal(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all">ปิดหน้าต่าง</button>
                        </div>

                    </div>
                </div>
            )}

            {/* 🌟 ซ่อนไฟล์สื่อทั้งหมดไว้หลังจอ เพื่อบังคับให้เบราว์เซอร์ดาวน์โหลดแคชเก็บไว้ล่วงหน้าทันที */}
            <div className="hidden">
                {uniquePreloadItems.map((item: any, idx) =>
                    item.type === 'video' ? (
                        <video key={`preload-${idx}`} src={item.url} preload="auto" />
                    ) : (
                        <img key={`preload-${idx}`} src={item.url} alt="preload" />
                    )
                )}
            </div>
        </main >
    );
}

// ==========================================
// 🚀 คอมโพเนนต์หลักสำหรับ Next.js
// ==========================================
// ==========================================
// 🚀 คอมโพเนนต์หลักสำหรับ Next.js (พร้อมระบบจำกัดสิทธิ์)
// ==========================================
export default function MarqueeDisplay() {
    return (
        // 🌟 หุ้มด้วย RouteGuard กำหนดสิทธิ์ให้ admin, controller, และ mc
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-cyan-400">Loading Display...</div>}>
            <RouteGuard allowedRoles={['admin', 'controller', 'mc']}>
                <MarqueeDisplayContent />
            </RouteGuard>
        </Suspense>
    );
}