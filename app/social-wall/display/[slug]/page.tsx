"use client";

import { useState, useEffect, CSSProperties } from "react";
// 📡 ปรับปรุง: เปลี่ยนท่อเชื่อมดาต้าเบสให้ชี้ไปหาไฟล์โมดูลกลางของ Next.js ตัวหลัก
import { supabase } from "@/lib/supabase";
import { RefreshCw, Settings, X, Radio, Palette, Trash2, ListFilter, Play, Pause, ToggleLeft, ToggleRight, Megaphone, Image, QrCode } from "lucide-react";

// 🎨 คลังแสง 20 Themes มาตรฐานพรีเมียม
const themeConfigs: any = {
  cyanCyber: { name: "ฟ้านีออน", bg: "#000d1a", btnBg: "bg-[#001a33]", border: "border-cyan-400/20", text: "text-white", accent: "#06b6d4" },
  skyLight: { name: "ฟ้าพาสเทล", bg: "#0b132b", btnBg: "bg-[#1c2541]", border: "border-cyan-500/20", text: "#f1f5f9", accent: "#7dd3fc" },
  glacierIce: { name: "ฟ้าธารน้ำแข็ง", bg: "#091522]", btnBg: "bg-[#112233]", border: "border-sky-400/20", text: "#ffffff", accent: "#93c5fd" },
  oceanDeep: { name: "น้ำเงินลึก", bg: "#020c1b", btnBg: "bg-[#0a192f]", border: "border-blue-500/20", text: "#f0fdf4", accent: "#3b82f6" },
  sapphire: { name: "แซฟไฟร์", bg: "#060b26", btnBg: "bg-[#0f143c]", border: "border-indigo-500/20", text: "#f5f3ff", accent: "#6366f1" },
  cobaltBold: { name: "โคบอลต์", bg: "#020826", btnBg: "bg-[#0a1442]", border: "border-blue-600/30", text: "#ffffff", accent: "#1d4ed8" },
  tealMint: { name: "เทลมิ้นต์", bg: "#041211", btnBg: "bg-[#0a2421]", border: "border-teal-500/20", text: "#f0fdf4", accent: "#2dd4bf" },
  softTeal: { name: "เทลคุมโทน", bg: "#07191d", btnBg: "bg-[#0f2d35]", border: "border-teal-600/20", text: "#e0f2fe", accent: "#14b8a6" },
  seafoam: { name: "เทลจาง", bg: "#031713", btnBg: "bg-[#0a2922]", border: "border-emerald-400/20", text: "#f8fafc", accent: "#a7f3d0" },
  auroraGlow: { name: "เขียวออโรร่า", bg: "#030c08", btnBg: "bg-[#0a1f14]", border: "border-green-500/20", text: "#f0fdf4", accent: "#4ade80" },
  emerald: { name: "เขียวมรกต", bg: "#022419", btnBg: "bg-[#053d2b]", border: "border-emerald-500/20", text: "#ecfdf5", accent: "#10b981" },
  deepMoss: { name: "เขียวไพร", bg: "#0a1c12", btnBg: "bg-[#142e1f]", border: "border-green-600/10", text: "#d1fae5", accent: "#059669" },
  sunsetGlow: { name: "ส้มซันเซ็ต", bg: "#1e0f05", btnBg: "bg-[#331a0a]", border: "border-orange-500/20", text: "#fff7ed", accent: "#f97316" },
  vintageGold: { name: "ทองวินเทจ", bg: "#141103", btnBg: "bg-[#292206]", border: "border-yellow-600/20", text: "#fefce8", accent: "#eab308" },
  roseGold: { name: "โรสโกลด์", bg: "#1c0d12", btnBg: "bg-[#30161f]", border: "border-rose-400/20", text: "#fff1f2", accent: "#f43f5e" },
  sakuraPastel: { name: "ชมพูซากุระ", bg: "#1f1015", btnBg: "bg-[#331b23]", border: "border-pink-300/20", text: "#ffffff", accent: "#fbcfe8" },
  crimsonNeon: { name: "แดงนีออน", bg: "#1a0206", btnBg: "bg-[#33040c]", border: "border-red-500/20", text: "#fef2f2", accent: "#ef4444" },
  amethyst: { name: "ม่วงอเมทิส", bg: "#0f051d", btnBg: "bg-[#1d0b38]", text: "#faf5ff", accent: "#a855f7" },
  indigoNight: { name: "ครามราตรี", bg: "#03071e", btnBg: "bg-[#0f143a]", text: "#e0e7ff", accent: "#4f46e5" },
  platinumMonox: { name: "เทาเงินหรู", bg: "#0f172a", btnBg: "bg-[#1e293b]", border: "border-slate-400/20", text: "#ffffff", accent: "#94a3b8" }
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

// 🌌 อาเรย์สร้างอนุภาคละอองดาว 15 ดวงลอยเอื่อยฉากหน้า
const particleElements = Array.from({ length: 15 }).map((_, idx) => ({
  id: idx,
  left: `${Math.random() * 100}%`,
  size: `${Math.random() * 6 + 3}px`,
  delay: `${Math.random() * 10}s`,
  duration: `${Math.random() * 12 + 12}s`,
  maxOp: Math.random() * 0.25 + 0.1
}));

export default function DisplayPage() {
  const [slug, setSlug] = useState("");
  const [screenSettings, setScreenSettings] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [heldMessages, setHeldMessages] = useState<any[]>([]);
  const [dbBackgroundMedia, setDbBackgroundMedia] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState("live"); 
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [localIsPaused, setLocalIsPaused] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🎞️ State ระบบเลเยอร์คู่ Crossfade ภาพพื้นหลังละมุนตา
  const [currentBg, setCurrentBg] = useState({ url: "", type: "color" });
  const [prevBg, setPrevBg] = useState({ url: "", type: "color" });
  const [crossfadeTrigger, setCrossfadeTrigger] = useState(true);

  useEffect(() => {
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

  // 📡 ปรับปรุง: ถอดระบบส่องพารามิเตอร์แบบเก่าออก แล้วเปลี่ยนมาแกะรอย Slug จาก URL ของ Next.js แทน
  useEffect(() => {
    if (typeof window !== "undefined") {
      const pathSegments = window.location.pathname.split("/");
      const urlSlug = pathSegments[pathSegments.length - 1];
      if (urlSlug && urlSlug.trim() !== "") {
        setSlug(urlSlug);
      }
      // สแกนหา admin โหมดกรณีทีมเทคนิคแอบส่องหลังเวที
      const params = new URLSearchParams(window.location.search);
      setIsAdmin(params.get("admin") === "true");
    }
  }, []);

  const fetchAllData = async (screenId: string) => {
    const { data: approved } = await supabase.from("social_messages").select("*").eq("screen_id", screenId).eq("status", "approved").order("created_at", { ascending: false }).limit(100);
    if (approved) setMessages(approved);
    const { data: held } = await supabase.from("social_messages").select("*").eq("screen_id", screenId).eq("status", "held").order("created_at", { ascending: false }).limit(100);
    if (held) setHeldMessages(held);
    const { data: media } = await supabase.from("screen_background_media").select("*").eq("screen_id", screenId);
    if (media) setDbBackgroundMedia(media);
  };

  useEffect(() => {
    if (!slug) return;
    const loadCore = async () => {
      try {
        setLoading(true);
        const { data: screen } = await supabase.from("social_screens").select("*").eq("slug", slug).maybeSingle();
        if (screen) {
          setScreenSettings(screen);
          await fetchAllData(screen.id);
          const channel = supabase.channel("live-msg-" + screen.id).on("postgres_changes", { event: "*", schema: "public", table: "social_messages", filter: "screen_id=eq." + screen.id }, async () => { await fetchAllData(screen.id); }).subscribe();
          const mediaChannel = supabase.channel("live-media-" + screen.id).on("postgres_changes", { event: "*", schema: "public", table: "screen_background_media", filter: "screen_id=eq." + screen.id }, async () => { await fetchAllData(screen.id); }).subscribe();
          return () => { supabase.removeChannel(channel); supabase.removeChannel(mediaChannel); };
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadCore();
  }, [slug]);

  useEffect(() => {
    if (!slug || !screenSettings?.id) return;
    const pChannel = supabase.channel("panel-" + slug).on("postgres_changes", { event: "UPDATE", schema: "public", table: "social_screens", filter: "id=eq." + screenSettings.id }, (payload) => setScreenSettings(payload.new)).subscribe();
    return () => { supabase.removeChannel(pChannel); };
  }, [slug, screenSettings?.id]);

  const updateSettings = async (updates: any) => {
    setScreenSettings((prev: any) => ({ ...prev, ...updates }));
    await supabase.from("social_screens").update(updates).eq("slug", slug);
  };

  const handleSelectPresetTheme = async (themeKey: string) => {
    const th = themeConfigs[themeKey];
    if (!th) return;
    await updateSettings({ theme: themeKey, bg_type: "color", bg_color: th.bg, box_color: th.box, text_color: th.text });
  };

  const handleRejectMessage = async (msgId: string) => { await supabase.from("social_messages").update({ status: "rejected" }).eq("id", msgId); };
  const handleHoldMessage = async (msgId: string) => { await supabase.from("social_messages").update({ status: "held" }).eq("id", msgId); };
  const handleResumeMessage = async (msgId: string) => { await supabase.from("social_messages").update({ status: "approved" }).eq("id", msgId); };

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
    const rotateIdx = Math.floor(Date.now() / (90 * 1000)) % filteredDbMedia.length;
    activeMediaUrl = filteredDbMedia[rotateIdx].media_url;
    dynamicBgType = filteredDbMedia[rotateIdx].media_type;
  } else if (fallbackMediaPools[keyUrl]) {
    const targetPool = fallbackMediaPools[keyUrl];
    const rotateIdx = Math.floor(Date.now() / (90 * 1000)) % targetPool.length;
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
  }, [activeMediaUrl, dynamicBgType]);

  const renderBackgroundNode = (mediaObj: { url: string; type: string }) => {
    if (mediaObj.type === "image" && mediaObj.url) {
      return <img src={mediaObj.url} alt="BGM" className="absolute inset-0 w-full h-full object-cover" />;
    }
    if (mediaObj.type === "video" && mediaObj.url) {
      return <video src={mediaObj.url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />;
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

  const dynamicTextStyle = { color: hexTextColor, textShadow: "0 0 15px rgba(255,255,255,0.2), 0 0 30px " + hexTextColor + "40" };
  const dynamicMainBgStyle = { backgroundColor: dynamicBgType === "color" ? hexBgColor : "#000000" };

  // 📱 ดึงค่าโดเมนปลายทางอัตโนมัติเพื่อให้ระบบเจนเนอเรท QR Code รองรับทั้งตอนทดสอบ Local และตอนขึ้น Vercel จริงแบบไร้รอยต่อ
  const [originUrl, setOriginUrl] = useState("https://niivaa.vercel.app");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOriginUrl(window.location.origin);
    }
  }, []);
  const generatedQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(originUrl + "/vote?slug=" + slug);

  const mainClass = "relative w-full h-screen overflow-hidden font-prompt select-none transition-colors duration-1000 text-white";
  const liveBadgeClass = "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border border-white/10 text-cyan-400";
  const navTitleClass = "text-base font-black italic tracking-tighter text-white"; 
  const updateBtnClass = "flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-slate-100 to-slate-300 text-slate-900 font-black text-xs py-3 rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer";
  const configBtnClass = "bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-3 rounded-xl text-white cursor-pointer transition-all";
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

  return (
    <main className={mainClass} style={dynamicMainBgStyle}>
      
      <div className="absolute inset-0 z-0 opacity-100">{renderBackgroundNode(prevBg)}</div>

      <div className={"absolute inset-0 z-0 transition-opacity duration-1000 " + (crossfadeTrigger ? "opacity-100" : "opacity-0")}>
        {renderBackgroundNode(currentBg)}
      </div>

      {dynamicBgType !== "color" && <div className="absolute inset-0 bg-black/15 z-[5] pointer-events-none" />}

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

      <div className="absolute bottom-16 left-6 z-[130] p-3 bg-black/75 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 transition-all hover:scale-105">
        <div className="bg-white p-1.5 rounded-xl shadow-inner">
          <img src={generatedQrUrl} alt="Scan QR code to wish" className="w-24 h-24 select-none" />
        </div>
        <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-cyan-400">
          <QrCode size={11} className="animate-pulse" />
          <span>สแกนส่งคำอวยพร</span>
        </div>
      </div>

      {/* ⚡ แผงควบคุมสวิตช์มุมขวาบน (จะเปิดส่องสิทธิ์เฉพาะตอนพ่วงท้าย URL ด้วย &admin=true เท่านั้น) */}
      {isAdmin && (
        <div className="absolute top-6 right-8 z-[150] w-[380px] flex flex-col gap-3 bg-black/60 p-5 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="flex justify-between items-center w-full">
            <div className={liveBadgeClass}>
              <Radio size={10} className="animate-pulse" />
              <span>NEXT.JS DEPLOY LIVE</span>
            </div>
            <h1 className={navTitleClass}>NiiVaa <span className="text-cyan-400">Live</span></h1>
          </div>

          <div className="flex items-center gap-2 w-full">
            <button onClick={() => window.location.reload()} className={updateBtnClass}>
              <RefreshCw size={12} /><span>⚡ UPDATE DATA</span>
            </button>
            <button onClick={() => setShowControls(!showControls)} className={configBtnClass}>
              {showControls ? <X size={14} /> : <Settings size={14} />}
            </button>
          </div>
        </div>
      )}

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
                        {msg.text}
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

      {showControls && isAdmin && (
        <div className="fixed inset-0 z-[240]" onClick={() => setShowControls(false)}>
          <div className="absolute top-[195px] right-8 w-[380px] p-5 rounded-2xl bg-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>SPEED (ปรับความเร็วสายพาน)</span>
                <span className="text-white font-mono">{speed} Px</span>
              </div>
              <input type="range" min="5" max="230" value={speed} onChange={(e) => updateSettings({ speed: parseInt(e.target.value) })} className="w-full accent-blue-500 h-1.5 bg-white/10 rounded-lg cursor-pointer" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-400">
                <span>BOX OPACITY (ความโปร่งแสงกล่อง)</span>
                <span className="text-cyan-400 font-mono font-bold">{boxOpacityValue}%</span>
              </div>
              <input type="range" min="0" max="100" value={boxOpacityValue} onChange={(e) => updateSettings({ box_opacity: parseInt(e.target.value) })} className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer" />
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
                <Image size={12} /><span>คลังเซ็ตมีเดียเคลื่อนไหว (Auto-90 Sec)</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-black">
                <button onClick={() => updateSettings({ bg_type: "image", bg_url: "seaPool" })} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 text-center text-cyan-300 cursor-pointer">🌄 เซ็ตภาพวิวทะเลชายหาด</button>
                <button onClick={() => updateSettings({ bg_type: "image", bg_url: "skyPool" })} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 text-center text-sky-300 cursor-pointer">☁️ เซ็ตภาพท้องฟ้าปุยเมฆ</button>
                <button onClick={() => updateSettings({ bg_type: "video", bg_url: "cyberVideoPool" })} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 text-center text-indigo-300 cursor-pointer">🌌 เซ็ตวิดีโอนีออนไซเบอร์</button>
                <button onClick={() => updateSettings({ bg_type: "video", bg_url: "waveVideoPool" })} className="py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-white/5 text-center text-teal-300 cursor-pointer">🌊 เซ็ตวิดีโอคลื่นทะเลลูป</button>
                <button onClick={() => updateSettings({ bg_type: "color", bg_url: "" })} className="col-span-2 py-1.5 bg-slate-950 border border-dashed border-white/10 text-center text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer rounded-lg">🎨 ถอดกราฟิก (ใช้เฉดสีสีพื้นด้านล่าง)</button>
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
                          <p className="text-xs text-white font-bold leading-tight truncate">{msg.text}</p>
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
                        <p className="text-xs text-slate-300 leading-tight truncate">{msg.text}</p>
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
    </main>
  );
}