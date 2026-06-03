"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronUp, ChevronDown, Clock, Music, Image as ImageIcon, Settings, Timer, Sliders, Palette } from 'lucide-react';

const THEMES = [
    { name: 'Gray', bg: 'from-[#09090B] via-[#57534D] to-[#0C0A09]', text: '#C81CDE' },
    { name: 'Blue', bg: 'from-[#432DD7] via-[#193CB8] to-[#024A70]', text: '#46ECD5' },
    { name: 'Teal Neon', bg: 'from-[#008080] via-[#004040] to-[#011a1a]', text: '#00FFFF' },
    { name: 'Classic Navy', bg: 'from-[#000080] via-[#000044] to-[#000011]', text: '#9999FF' },
    { name: 'Earth Tone', bg: 'from-[#1B3C53] via-[#102431] to-[#081218]', text: '#D2C1B6' },
    { name: 'Ocean Mint', bg: 'from-[#16476A] via-[#0b2537] to-[#05121b]', text: '#91C6BC' },
    { name: 'Electric Cyber', bg: 'from-[#4300FF] via-[#210080] to-[#0a0026]', text: '#00CAFF' }
];

interface FloatingNote {
    id: number;
    char: string;
    left: number;
    size: number;
    duration: number;
    color: string;
}

interface IntermissionItem {
    id: number;
    media_url: string;
    media_type: string;
}

const TRANSITIONS = [
    { initial: { opacity: 0, scale: 1.05 }, animate: { opacity: 1, scale: 1.0 }, exit: { opacity: 0 } },
    { initial: { opacity: 0, scale: 0.98 }, animate: { opacity: 1, scale: 1.02 }, exit: { opacity: 0 } },
    { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } },
    { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -15 } }
];

export default function LyricsPage() {
    const router = useRouter();
    const [song, setSong] = useState<any>(null);
    const [lyricsLines, setLyricsLines] = useState<string[]>([]);
    const [duration, setDuration] = useState(240);
    const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
    const [isPaused, setIsPaused] = useState(false);

    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [fontSettings, setFontSettings] = useState({ textColor: '#00FFFF', glowRadius: 15 });

    const [isScrolling, setIsScrolling] = useState(true);
    const [displaySongSeconds, setDisplaySongSeconds] = useState(0);
    const [bgMode, setBgMode] = useState<'theme' | 'image'>('theme');
    const [customBgImage, setCustomBgImage] = useState<string | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);

    const [lyricTimings, setLyricTimings] = useState<{ line_index: number; lyric_text: string; target_second: number }[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const [startDelay, setStartDelay] = useState(15);
    const [currentTrackId, setCurrentTrackId] = useState<string>('');
    const [isUsingTimeMapping, setIsUsingTimeMapping] = useState(false);

    const [floatingNotes, setFloatingNotes] = useState<FloatingNote[]>([]);
    const [lineEffects, setLineEffects] = useState<number[]>([]);

    // 📢 STATES คุมบอร์ดประกาศข้อความวิ่งบอร์ด Interactive
    const [announceActive, setAnnounceActive] = useState(false);
    const [announceMessage, setAnnounceMessage] = useState('');
    const [showLiveQrScreen, setShowLiveQrScreen] = useState(false);
    const [uploadedQrUrl, setUploadedQrUrl] = useState('');

    // 🎞️ STATES ระบบสไลด์คั่นจังหวะเปลี่ยนเพลงชิ้นพรีเมียม
    const [isIntermissionSwitchOn, setIsIntermissionSwitchOn] = useState(false);
    const [intermissionList, setIntermissionList] = useState<IntermissionItem[]>([]);
    const [currentIntermissionItem, setCurrentIntermissionItem] = useState<IntermissionItem | null>(null);
    const [showIntermissionLayer, setShowIntermissionLayer] = useState(false);
    const [randomAnimStyle, setRandomAnimStyle] = useState(0);

    // 🌧️💨 STATES ระบบสุ่มสลับพ่นควันหรือม่านสายฝน แพ็กคู่ขอบจอ
    const [activeEffect, setActiveEffect] = useState<'none' | 'rain' | 'smoke'>('none');

    const scrollRef = useRef<HTMLDivElement>(null);
    const accumulatedTimeRef = useRef(0);
    const lastFrameTimeRef = useRef<number | null>(null);
    const isLayerShowingRef = useRef(false);

    const textScrollRequestRef = useRef<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const songClockRef = useRef<NodeJS.Timeout | null>(null);
    const imageLoopRef = useRef<NodeJS.Timeout | null>(null);
    const effectDirectorRef = useRef<NodeJS.Timeout | null>(null);
    const currentLineIndexRef = useRef(-1);

    const formatSongTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (Math.floor(secs) % 60).toString().padStart(2, '0');
        return `${m}:${s} / ${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        setMounted(true);
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 🎯 [ระบบตัวนับเวลาตัวเพลงของข้อ 3]: นับวินาทีไหลไปข้างหน้าต่อเนื่องเป็นอิสระ ควบคู่กับการประมวลสถานะเปิดภาพคั่น 8 วินาทีอย่างเงียบเชียบกริบ
    useEffect(() => {
        if (songClockRef.current) clearInterval(songClockRef.current);
        if (!isPaused) {
            songClockRef.current = setInterval(() => {
                const cur = accumulatedTimeRef.current;
                const roundedSecs = Math.floor(cur);
                const clampedSecs = roundedSecs >= duration ? duration : roundedSecs;

                setDisplaySongSeconds(clampedSecs);

                // ตรวจรอยต่อเปลี่ยนเพลง 8 วินาทีจากท่อเวลากลาง เพื่อสลับสวิตช์อย่างปลอดภัย
                if (isIntermissionSwitchOn && intermissionList.length > 0) {
                    const isNearEnd = clampedSecs >= (duration - 4);
                    const isNearStart = clampedSecs <= 4;
                    const targetState = (isNearEnd || isNearStart);

                    if (targetState !== isLayerShowingRef.current) {
                        isLayerShowingRef.current = targetState;
                        setShowIntermissionLayer(targetState);
                    }
                }
            }, 1000);
        }
        return () => { if (songClockRef.current) clearInterval(songClockRef.current); };
    }, [duration, isPaused, isIntermissionSwitchOn, intermissionList]);

    // ผู้กำกับควบคุมการสุ่มปล่อยม่านสายฝนและควันเวทีฟุ้งเป็นระยะ (สุ่มเงียบเชียบ สบายสายตา ไม่ถี่จนเกินไป)
    useEffect(() => {
        if (effectDirectorRef.current) clearInterval(effectDirectorRef.current);

        if (!isPaused && !showIntermissionLayer) {
            const directShow = () => {
                const dice = Math.random();
                if (dice < 0.35) {
                    setActiveEffect('rain');
                } else if (dice < 0.70) {
                    setActiveEffect('smoke');
                } else {
                    setActiveEffect('none');
                }
            };

            directShow();
            effectDirectorRef.current = setInterval(directShow, 25000);
        } else {
            setActiveEffect('none');
        }

        return () => { if (effectDirectorRef.current) clearInterval(effectDirectorRef.current); };
    }, [isPaused, showIntermissionLayer]);

    // ตัวผลิตประจุฝูงตัวโน้ตดนตรีลอยฟุ้งอิสระแบบ Background Thread
    useEffect(() => {
        if (isPaused || !isScrolling) return;
        const noteChars = ['🎵', '🎶', '♪', '♩', '🎸', '🎹'];
        const colors = ['text-white/40', 'text-cyan-400/40', 'text-sky-300/35', 'text-white/30'];

        const noteInterval = setInterval(() => {
            const newNote: FloatingNote = {
                id: Date.now() + Math.random(),
                char: noteChars[Math.floor(Math.random() * noteChars.length)],
                left: Math.floor(Math.random() * 90) + 5,
                size: Math.floor(Math.random() * 12) + 12,
                duration: Math.floor(Math.random() * 4) + 6,
                color: colors[Math.floor(Math.random() * colors.length)]
            };
            setFloatingNotes(prev => [...prev.slice(-12), newNote]);
        }, 1500);

        return () => clearInterval(noteInterval);
    }, [isPaused, isScrolling]);

    // 📢 ดักจับข้อมูลประกาศและสวิตช์ระบบบอร์ดหลังบ้านเรียลไทม์
    useEffect(() => {
        const loadInitialAnnounceSetup = async () => {
            const { data } = await supabase.from('live_announcements').select('*').eq('id', 1).maybeSingle();
            if (data) {
                setAnnounceActive(data.is_announcement_active);
                setAnnounceMessage(data.announcement_text || '');
                setShowLiveQrScreen(data.show_live_qr);
                setUploadedQrUrl(data.qr_code_url || '');
                setIsIntermissionSwitchOn(!!data.is_intermission_active);
            }
        };
        loadInitialAnnounceSetup();

        const announceChannel = supabase.channel('realtime-live-announcements-final-v16')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_announcements', filter: 'id=eq.1' },
                (payload) => {
                    if (payload.new) {
                        setAnnounceActive(payload.new.is_announcement_active);
                        setAnnounceMessage(payload.new.announcement_text || '');
                        setShowLiveQrScreen(payload.new.show_live_qr);
                        setUploadedQrUrl(payload.new.qr_code_url || '');
                        setIsIntermissionSwitchOn(!!payload.new.is_intermission_active);
                    }
                })
            .subscribe();

        return () => { supabase.removeChannel(announceChannel); };
    }, []);

    // 🎞️ โหลดคลังรูปภาพ/วิดีโอเงียบสำหรับคั่นจังหวะเปลี่ยนเพลง
    const loadIntermissionMediaPool = async () => {
        const { data, error } = await supabase
            .from('intermission_media')
            .select('id, media_url, media_type')
            .eq('isselected_for_loop', true);

        if (!error && data && data.length > 0) {
            setIntermissionList(data);
            setCurrentIntermissionItem(data[Math.floor(Math.random() * data.length)]);
        }
    };

    useEffect(() => {
        loadIntermissionMediaPool();
    }, [isIntermissionSwitchOn]);

    const handleLiveTimeActionTrigger = () => {
        if (showConfigModal) return;
        setIsPaused(prev => !prev);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                handleLiveTimeActionTrigger();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused, showConfigModal]);

    // สุ่มภาพพื้นหลังแบคกราวน์หลัก
    // 🟢 [แก้ไขจุดโหลดภาพ]: เพิ่มการเช็กและบังคับโหลดใหม่ทันทีที่สลับโหมด
    const loadBackgroundImageLoop = async () => {
        try {
            console.log("Loading background images...");
            let { data: images, error } = await supabase.from('screen_background_media').select('media_url').eq('isselected_for_loop', true);

            if (error) throw error;

            if (images && images.length > 0) {
                const randomIndex = Math.floor(Math.random() * images.length);
                setCustomBgImage(images[randomIndex].media_url);
            } else {
                // ถ้าในตารางไม่มีภาพที่เลือกไว้ ให้ลองดึงภาพทั้งหมดมาเป็นสำรอง
                const { data: allImages } = await supabase.from('screen_background_media').select('media_url');
                if (allImages && allImages.length > 0) {
                    setCustomBgImage(allImages[0].media_url);
                }
            }
        } catch (err) { console.error("Error loading background:", err); }
    };

    useEffect(() => {
        if (imageLoopRef.current) clearInterval(imageLoopRef.current);

        if (bgMode === 'image') {
            loadBackgroundImageLoop(); // โหลดครั้งแรกทันทีที่สลับโหมด
            imageLoopRef.current = setInterval(() => { loadBackgroundImageLoop(); }, 60000);
        } else {
            setCustomBgImage(null);
        }
        return () => { if (imageLoopRef.current) clearInterval(imageLoopRef.current); };
    }, [bgMode]);

    // ดึงคลังข้อมูลเนื้อหาและคัดกรองผังข้อมูลเวลาเพลงหลัก
    const fetchLyrics = async (v_id: string) => {
        try {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (!v_id) return;

            const { data: track } = await supabase.from('tracks').select('*').eq('video_id', v_id).maybeSingle();
            const { data: master } = await supabase.from('master_songs').select('*').eq('video_id', v_id).maybeSingle();

            if (master) {
                setSong(master);
                const linesArray = master.lyrics ? master.lyrics.split('\n').filter((l: string) => l.trim() !== '') : [];
                setLyricsLines(linesArray);

                if (track) {
                    setCurrentTrackId(track.id);
                    setDuration(track.duration_seconds || 240);
                    setStartDelay(track.start_delay ? Number(track.start_delay) : 15);
                    setSpeedMultiplier(track.play_speed ? Number(track.play_speed) : 1.0);
                    if (track.glow_size) setFontSettings(p => ({ ...p, glowRadius: track.glow_size }));

                    const { data: timings } = await supabase
                        .from('track_lyric_timings')
                        .select('line_index, lyric_text, target_second')
                        .eq('track_id', track.id)
                        .order('line_index', { ascending: true });

                    const hasValidTimings = timings && timings.length > 0 && timings.some(t => parseFloat(String(t.target_second)) > 0);

                    if (hasValidTimings) {
                        setIsUsingTimeMapping(true);
                        setLyricTimings(timings.map(t => ({
                            line_index: Number(t.line_index),
                            lyric_text: t.lyric_text,
                            target_second: parseFloat(String(t.target_second))
                        })));
                        setLineEffects(timings.map(() => Math.floor(Math.random() * 3)));
                    } else {
                        setIsUsingTimeMapping(false);
                        setLyricTimings(linesArray.map((line: string, index: number) => ({ line_index: index, lyric_text: line, target_second: 0 })));
                        setLineEffects(linesArray.map(() => 0));
                    }
                } else {
                    setIsUsingTimeMapping(false);
                    setLyricTimings(linesArray.map((line: string, index: number) => ({ line_index: index, lyric_text: line, target_second: 0 })));
                    setLineEffects(linesArray.map(() => 0));
                }

                setIsPaused(false);
                setIsScrolling(true);
                setCurrentLineIndex(-1);
                currentLineIndexRef.current = -1;
                setDisplaySongSeconds(0);
                accumulatedTimeRef.current = 0;
                lastFrameTimeRef.current = null;
                if (scrollRef.current) scrollRef.current.scrollTop = 0;

                const actualDelay = track?.start_delay ? Number(track.start_delay) : 15;
                timerRef.current = setTimeout(() => { setIsScrolling(true); }, actualDelay * 1000);

                if (intermissionList.length > 0) {
                    setCurrentIntermissionItem(intermissionList[Math.floor(Math.random() * intermissionList.length)]);
                    setRandomAnimStyle(Math.floor(Math.random() * TRANSITIONS.length));
                }
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const init = async () => {
            const { data } = await supabase.from('current_playing').select('video_id').eq('id', 1).maybeSingle();
            if (data?.video_id) fetchLyrics(data.video_id);
        };
        init();

        const channel = supabase.channel('lyrics-reboot-secure')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'current_playing', filter: 'id=eq.1' },
                (payload) => { if (payload.new?.video_id) fetchLyrics(payload.new.video_id); })
            .subscribe();

        return () => { supabase.removeChannel(channel); if (timerRef.current) clearTimeout(timerRef.current); };
    }, [intermissionList]);

    // 🟢 [เอนจิ้นทองคำความเร็วสูงจากแผ่น v637R ดั้งเดิมตัวแท้]: ดันพิกเซลเลื่อนคำร้องอย่างเนียนตา ไหลสมูท 60 FPS ปราศจากการสะดุด
    useEffect(() => {
        if (isPaused || !isScrolling || lyricTimings.length === 0) return;

        const updateScrollPosition = (timestamp: number) => {
            if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
            const deltaTime = (timestamp - lastFrameTimeRef.current) / 1000;
            lastFrameTimeRef.current = timestamp;

            accumulatedTimeRef.current += deltaTime * speedMultiplier;
            const currentSec = accumulatedTimeRef.current;

            if (scrollRef.current) {
                const container = scrollRef.current;
                const containerHeight = container.clientHeight;

                if (isUsingTimeMapping) {
                    let activeIndex = -1;
                    for (let i = 0; i < lyricTimings.length; i++) {
                        if (currentSec >= lyricTimings[i].target_second) {
                            activeIndex = i;
                        } else { break; }
                    }

                    if (activeIndex !== currentLineIndexRef.current) {
                        currentLineIndexRef.current = activeIndex;
                        setCurrentLineIndex(activeIndex);
                    }

                    const rowElements = container.children[0]?.children;
                    if (rowElements && rowElements.length > 0) {
                        if (activeIndex === -1) {
                            const firstRow = rowElements[0] as HTMLElement;
                            if (firstRow) {
                                const firstTarget = firstRow.offsetTop - (containerHeight * 0.6) + (firstRow.clientHeight / 2);
                                const progressToFirst = Math.min(currentSec / Math.max(lyricTimings[0].target_second, 1), 1);
                                container.scrollTop = progressToFirst * firstTarget;
                            }
                        } else {
                            const currentLine = lyricTimings[activeIndex];
                            const nextLine = lyricTimings[activeIndex + 1];

                            const currentRowEl = rowElements[activeIndex] as HTMLElement;
                            const currentTargetScroll = currentRowEl.offsetTop - (containerHeight * 0.6) + (currentRowEl.clientHeight / 2);

                            if (nextLine && rowElements[activeIndex + 1]) {
                                const nextRowEl = rowElements[activeIndex + 1] as HTMLElement;
                                const nextTargetScroll = nextRowEl.offsetTop - (containerHeight * 0.6) + (nextRowEl.clientHeight / 2);
                                const timeGap = nextLine.target_second - currentLine.target_second;
                                const timeProgress = Math.min(Math.max((currentSec - currentLine.target_second) / Math.max(timeGap, 0.05), 0), 1);
                                container.scrollTop = currentTargetScroll + (timeProgress * (nextTargetScroll - currentTargetScroll));
                            } else {
                                container.scrollTop += (currentTargetScroll - container.scrollTop) * 0.08;
                            }
                        }
                    }
                } else {
                    const usableScrollHeight = container.scrollHeight - containerHeight;
                    const progress = Math.min(Math.max((currentSec - startDelay) / (duration - startDelay), 0), 1);
                    container.scrollTop = progress * usableScrollHeight;

                    const estimatedIndex = Math.floor(progress * lyricTimings.length);
                    if (estimatedIndex !== currentLineIndexRef.current) {
                        currentLineIndexRef.current = estimatedIndex;
                        setCurrentLineIndex(estimatedIndex);
                    }
                }

                if (currentSec >= duration) {
                    setIsScrolling(false);
                    return;
                }
            }

            textScrollRequestRef.current = requestAnimationFrame(updateScrollPosition);
        };

        lastFrameTimeRef.current = null;
        textScrollRequestRef.current = requestAnimationFrame(updateScrollPosition);

        return () => { if (textScrollRequestRef.current) cancelAnimationFrame(textScrollRequestRef.current); };
    }, [isPaused, isScrolling, isUsingTimeMapping, lyricTimings, duration, speedMultiplier, startDelay]);

    return (
        <div className="h-screen w-screen flex flex-col justify-between overflow-hidden relative select-none cursor-pointer bg-black">

            {/* LAYER 0: ฉากพื้นหลังวอลเปเปอร์หลัก (เปิดช่องไฟสว่างไสว ทะลุมิติเห็นรูปในคลังโหมด IMAGE LOOP สมบูรณ์แบบแล้วครับ) */}
            <div
                style={bgMode === 'image' && customBgImage ? { backgroundImage: `url(${customBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : undefined}
                className={`absolute inset-0 z-0 transition-all duration-1000 ${bgMode === 'theme' ? `bg-gradient-to-br ${THEMES.find(t => t.text === fontSettings.textColor)?.bg || 'from-[#020813] via-[#0a1931] to-[#15305b]'}` : 'bg-transparent'}`}
            >
                {bgMode === 'image' && customBgImage && <div className="absolute inset-0 bg-black/30" />}
            </div>

            {/* 🌧️ เลเยอร์เอฟเฟกต์ม่านสายฝนดนตรีนีออนพริ้วไหว ซ้าย-ขวาจอ */}
            <AnimatePresence>
                {activeEffect === 'rain' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} exit={{ opacity: 0 }} transition={{ duration: 2 }} className="absolute inset-0 z-5 pointer-events-none overflow-hidden flex justify-between px-2">
                        <div className="w-[12vw] h-full relative opacity-80 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
                            <div className="absolute top-0 left-[10%] w-0.5 h-16 animate-rain-fall" style={{ animationDelay: '0s', animationDuration: '1.2s', backgroundColor: fontSettings.textColor }} />
                            <div className="absolute top-0 left-[40%] w-0.5 h-12 animate-rain-fall" style={{ animationDelay: '0.4s', animationDuration: '0.9s', backgroundColor: fontSettings.textColor }} />
                            <div className="absolute top-0 left-[70%] w-0.5 h-20 animate-rain-fall" style={{ animationDelay: '0.2s', animationDuration: '1.5s', backgroundColor: fontSettings.textColor }} />
                        </div>
                        <div className="w-[12vw] h-full relative opacity-80 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent">
                            <div className="absolute top-0 left-[20%] w-0.5 h-14 animate-rain-fall" style={{ animationDelay: '0.1s', animationDuration: '1.1s', backgroundColor: fontSettings.textColor }} />
                            <div className="absolute top-0 left-[50%] w-0.5 h-22 animate-rain-fall" style={{ animationDelay: '0.5s', animationDuration: '1.6s', backgroundColor: fontSettings.textColor }} />
                            <div className="absolute top-0 left-[80%] w-0.5 h-10 animate-rain-fall" style={{ animationDelay: '0.3s', animationDuration: '0.8s', backgroundColor: fontSettings.textColor }} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 💨 เลเยอร์เอฟเฟกต์พ่นควันเวที Cinematic Smoke ซ้าย-ขวาจอ */}
            <AnimatePresence>
                {activeEffect === 'smoke' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.15 }} exit={{ opacity: 0 }} transition={{ duration: 3 }} className="absolute inset-0 z-5 pointer-events-none overflow-hidden flex justify-between">
                        <div className="absolute bottom-[-20px] left-[-50px] w-[350px] h-[350px] rounded-full filter blur-[60px] animate-stage-smoke-rise" style={{ backgroundColor: fontSettings.textColor }} />
                        <div className="absolute bottom-[-20px] right-[-50px] w-[350px] h-[350px] rounded-full filter blur-[60px] animate-stage-smoke-rise" style={{ backgroundColor: fontSettings.textColor, animationDelay: '2s' }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 🎞️ [ซ่อมแซมใหญ่โครงสร้างสลับชั้นเลเยอร์ทองคำ]: แยกส่วนเงื่อนไขภาพคั่น 8 วินาทีออกนอกแท็กครอบอย่างเด็ดขาด ตัวกล่อง z-[180] จะถูกสร้างขยายขึ้นมาฉายภาพวิวแม่น้ำโขงสไตล์คอนเสิร์ตใหญ่เฉพาะตอนรอยต่อเพลงจริงเท่านั้น และหดตัวสลายหายไปทันทีเมื่อเพลงรันวินาทีที่ 5 เป็นต้นไป ปลุกความเคลียร์ใสให้โหมดสุ่มภาพหลังใช้งานได้จริงอย่างสมบูรณ์แบบแล้วครับพี่! */}
            <AnimatePresence mode="wait">
                {showIntermissionLayer && currentIntermissionItem && (
                    <motion.div
                        key={currentIntermissionItem.id}
                        initial={TRANSITIONS[randomAnimStyle].initial}
                        animate={TRANSITIONS[randomAnimStyle].animate}
                        exit={TRANSITIONS[randomAnimStyle].exit}
                        transition={{ duration: 1.0, ease: "easeInOut" }}
                        className="absolute inset-0 z-[180] overflow-hidden flex items-center justify-center bg-black pointer-events-auto"
                    >
                        {currentIntermissionItem.media_type === 'video' ? (
                            <video src={currentIntermissionItem.media_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                            <img src={currentIntermissionItem.media_url} alt="Intermission Slide" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/50" />
                        <div className="absolute bottom-16 right-12 bg-black/50 border border-amber-500/30 px-4 py-2 rounded-2xl backdrop-blur-md flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span className="text-[10px] tracking-[0.3em] font-black font-sans text-amber-300 uppercase">NEXT TRACK COMING UP</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* เลเยอร์ฝูงตัวโน้ตลอยฟุ้ง */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                {floatingNotes.map(note => (
                    <span
                        key={note.id} className={`absolute font-bold opacity-0 animate-note-float ${note.color}`}
                        style={{ left: `${note.left}%`, fontSize: `${note.size}px`, bottom: `-50px`, animationDuration: `${note.duration}s` }}
                    >
                        {note.char}
                    </span>
                ))}
            </div>

            {/* LAYER 20: แถบชื่อเพลง และตัวประกาศข้อความวิ่งด้านบน */}
            <div className="w-full h-[15vh] pt-4 px-8 flex flex-col justify-between z-20 pointer-events-none relative" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between w-full">
                    <div className="bg-black/40 border border-white/10 px-4 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-2">
                        <h1 className="text-xs md:text-sm font-black italic tracking-widest text-white/90 uppercase">
                            ♪ {song ? song.title : 'กำลังเปิดรับข้อมูลคิวสื่อ...'}
                            {isPaused && <span className="text-red-500 animate-pulse ml-4">[PAUSED]</span>}
                        </h1>
                        <span className={`text-[8px] px-2 py-0.5 rounded-md font-mono font-bold border ${isUsingTimeMapping ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'}`}>
                            {isUsingTimeMapping ? '🎯 TIME MODE' : '⚡ SPEED MODE'}
                        </span>
                    </div>
                    <div className="bg-white/5 backdrop-blur-xl border border-cyan-400/40 px-6 py-2 rounded-2xl flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse">
                        <Music size={12} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                        <span className="text-[9px] font-black tracking-[0.4em] text-white/90">NIIVAA SMARTBOARD</span>
                    </div>
                </div>

                <AnimatePresence>
                    {announceActive && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="w-full bg-gradient-to-r from-cyan-950/80 via-black/70 to-blue-950/80 border border-cyan-500/30 py-1 px-4 rounded-xl flex items-center justify-between gap-4 backdrop-blur-md h-8 relative overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        >
                            <div className="flex-1 overflow-hidden relative w-full h-full flex items-center">
                                <div className="absolute whitespace-nowrap text-[11px] font-black font-sans tracking-wide text-amber-300 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)] animate-marquee-run">
                                    📢 ประกาศ: &nbsp;{announceMessage} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 📢 ประกาศ: &nbsp;{announceMessage}
                                </div>
                            </div>
                            {showLiveQrScreen && uploadedQrUrl && (
                                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-7 w-7 bg-white p-0.5 rounded shadow-[0_0_10px_rgba(6,182,212,0.4)] flex items-center justify-center shrink-0 border border-cyan-400 z-50 pointer-events-auto">
                                    <img src={uploadedQrUrl} alt="Scan Live QR" className="h-full w-full object-contain" />
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ส่วนตรงกลางแสดงสายพานเนื้อร้องโครงสร้างดั้งเดิมแผ่น v637R ยิงเรนเดอร์แกนสมูทแท้เลื่อนนิ่มนวลที่สุด */}
            <div
                ref={scrollRef} className="w-full max-w-5xl mx-auto h-[70vh] overflow-y-auto text-center px-12 z-20 no-scrollbar relative"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onClick={(e) => { e.stopPropagation(); handleLiveTimeActionTrigger(); }}
            >
                <div className="pt-[25vh] pb-[45vh] space-y-16 pointer-events-none">
                    {lyricTimings.map((line, index) => {
                        const isCurrent = isUsingTimeMapping ? (index === currentLineIndex) : false;
                        const isPast = isUsingTimeMapping ? (index < currentLineIndex) : false;
                        const secondsUntilLine = line.target_second - accumulatedTimeRef.current;
                        const isUpcomingAlert = isUsingTimeMapping && !isPast && !isCurrent && (secondsUntilLine > 0 && secondsUntilLine <= 3.0);

                        let opacityStyle = "opacity-100 scale-105 font-black";
                        let textGlow = `0 0 ${fontSettings.glowRadius}px ${fontSettings.textColor}, 0 0 ${Math.max(fontSettings.glowRadius / 2, 2)}px ${fontSettings.textColor}`;
                        let colorStyle = "#FFFFFF";

                        if (isUsingTimeMapping) {
                            if (isCurrent) { opacityStyle = "opacity-100 scale-110 font-black z-30"; }
                            else if (isPast) {
                                const effectType = lineEffects[index] || 0;
                                if (effectType === 1) {
                                    opacityStyle = "opacity-0 scale-130 filter blur-2xl text-white/5 transition-all duration-1000 origin-center";
                                    textGlow = `0 0 40px ${fontSettings.textColor}`;
                                } else if (effectType === 2) {
                                    opacityStyle = "opacity-0 translate-x-40 rotate-3 filter blur-[0.5px] transition-all duration-1000";
                                    textGlow = "none";
                                } else {
                                    opacityStyle = "opacity-5 scale-90 filter blur-[0.3px] transition-all duration-700";
                                    textGlow = "none";
                                }
                                colorStyle = fontSettings.textColor;
                            } else {
                                opacityStyle = isUpcomingAlert ? "opacity-95 scale-100 font-bold text-white transition-all duration-300" : "opacity-35 scale-95 font-bold filter blur-[0.3px]";
                                textGlow = "none";
                                colorStyle = fontSettings.textColor;
                            }
                        }

                        return (
                            <div
                                key={index} style={{ color: isUsingTimeMapping ? colorStyle : fontSettings.textColor, textShadow: isUsingTimeMapping ? textGlow : 'none' }}
                                className={`text-2xl md:text-5xl leading-tight tracking-tighter relative flex items-center justify-center gap-4 transition-all duration-500 ${opacityStyle}`}
                            >
                                {isUpcomingAlert && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-black tracking-widest font-mono shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse shrink-0">
                                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                                        <span>🎤 READY ({secondsUntilLine.toFixed(0)}s)</span>
                                    </div>
                                )}
                                <span className="text-center">{line.lyric_text}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ส่วนที่ 5 - ล่างสุด: SINGLE-ROW CONTROL DOCK */}
            <div className="w-full bg-gradient-to-r from-[#0a1931]/95 via-[#15305b]/90 to-[#0c2447]/95 backdrop-blur-2xl border-t border-cyan-500/20 py-3 px-5 flex items-center justify-between gap-2 text-white z-50" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={() => router.push('/studio')}
                    className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-xl flex items-center gap-2 font-black text-[10px] tracking-wider active:scale-95 transition-all"
                >
                    <Sliders size={13} strokeWidth={2.5} />
                    <span>STUDIO</span>
                </button>

                <div className="flex items-center gap-2 bg-teal-950/40 border border-teal-500/20 px-3 py-1.5 rounded-xl max-w-[180px] flex-1">
                    <span className="text-[7px] font-black text-cyan-400 tracking-wider opacity-80 whitespace-nowrap">GLOW:</span>
                    <input type="range" min="2" max="40" value={fontSettings.glowRadius} onChange={(e) => setFontSettings(p => ({ ...p, glowRadius: parseInt(e.target.value) }))} className="w-full accent-cyan-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none" />
                    <span className="text-[10px] font-black text-cyan-300 font-mono w-5 text-right">{fontSettings.glowRadius}</span>
                </div>

                <div className="flex items-center gap-1 bg-teal-950/40 border border-teal-500/20 px-2.5 py-1 rounded-xl mx-auto">
                    <button onClick={() => setSpeedMultiplier(p => Math.max(parseFloat((p - 0.1).toFixed(1)), 0.5))} className="p-1.5 text-cyan-300"><ChevronDown size={14} /></button>
                    <button onClick={handleLiveTimeActionTrigger} className={`p-2 rounded-xl transition-all ${isPaused ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20'}`}>
                        {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                    </button>
                    <button onClick={() => setSpeedMultiplier(p => Math.min(parseFloat((p + 0.1).toFixed(1)), 3.0))} className="p-1.5 text-cyan-300"><ChevronUp size={14} /></button>
                    <div className="flex flex-col items-center px-2 border-l border-white/10 text-center"><span className="text-[5px] font-black opacity-40">SPEED</span><span className="text-xs font-black text-cyan-400 font-mono">{speedMultiplier.toFixed(1)}x</span></div>
                </div>

                <div className="flex items-center gap-3 bg-teal-950/40 border border-teal-500/20 px-4 py-1.5 rounded-xl font-mono">
                    <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                        <Timer size={12} className="text-cyan-400" />
                        <span className="text-sm font-black tracking-wide text-cyan-300 tabular-nums">{formatSongTime(displaySongSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/50">
                        <Clock size={12} className="opacity-40" />
                        <span className="text-sm font-bold tracking-wider tabular-nums">
                            {mounted && currentTime ? currentTime.toLocaleTimeString('th-TH', { hour12: false }) : "--:--:--"}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setBgMode(bgMode === 'theme' ? 'image' : 'theme')} className={`py-1.5 px-3 rounded-xl text-[9px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5 border ${bgMode === 'image' ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-md' : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}>
                        <ImageIcon size={12} />
                        <span className="hidden md:inline">{bgMode === 'image' ? 'IMAGE LOOP' : 'THEME BG'}</span>
                    </button>
                    <div className="relative p-1.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group">
                        <Palette size={13} className="text-purple-400" />
                        <input type="color" value={fontSettings.textColor} onChange={(e) => setFontSettings(p => ({ ...p, textColor: e.target.value }))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                    <button onClick={() => setShowConfigModal(true)} className="p-1.5 bg-white/5 border border-white/10 rounded-xl text-amber-400"><Settings size={13} /></button>
                </div>
            </div>

            {/* CONFIG MASTER MODAL */}
            <AnimatePresence>
                {showConfigModal && (
                    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setShowConfigModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#1c120c] border border-amber-500/40 p-6 rounded-[2.5rem] w-full max-w-sm text-white space-y-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                                <h3 className="text-xs font-black text-amber-400 tracking-wider uppercase">⏱ CONFIG MASTER</h3>
                                <button onClick={() => setShowConfigModal(false)} className="text-gray-500 text-xs">✕</button>
                            </div>

                            <div className="space-y-1.5 bg-black/50 p-3 rounded-xl border border-amber-500/10">
                                <div className="flex justify-between items-center text-[10px] font-bold text-amber-200/70 uppercase">
                                    <span>วินาทีเริ่มเลื่อนคิว ({startDelay} วิ):</span>
                                    <input type="number" value={startDelay} onChange={(e) => setStartDelay(parseInt(e.target.value) || 0)} className="w-11 bg-black border border-amber-500/30 rounded text-center text-amber-400 text-xs font-bold" />
                                </div>
                                <input type="range" min="0" max="60" value={startDelay} onChange={(e) => setStartDelay(parseInt(e.target.value))} className="w-full accent-amber-500 h-1" />
                            </div>

                            <div className="space-y-1.5 bg-black/50 p-3 rounded-xl border border-amber-500/10">
                                <div className="flex justify-between items-center text-[10px] font-bold text-amber-200/70 uppercase">
                                    <span>ความเร็วเริ่มต้นคิวเพลง (Default Speed):</span>
                                    <span className="text-amber-400 font-mono text-xs font-bold">{speedMultiplier.toFixed(1)}x</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="range" min="0.5" max="3.0" step="0.1" value={speedMultiplier} onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))} className="w-full accent-cyan-500 h-1" />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={async () => {
                                    if (currentTrackId) {
                                        await supabase.from('tracks').update({
                                            start_delay: startDelay,
                                            play_speed: speedMultiplier,
                                            glow_size: fontSettings.glowRadius
                                        }).eq('id', currentTrackId);

                                        alert('⚙️ ล็อกบันทึกค่าหน่วงเวลา และความเร็ว Default ลงตารางสำเร็จ!');
                                        setShowConfigModal(false);
                                    }
                                }}
                                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs uppercase tracking-widest rounded-xl"
                            >
                                ฝังบันทึกจำค่าคิวเพลงนี้
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes marqueeAnimation { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
                .animate-marquee-run { animation: marqueeAnimation 22s linear infinite; }
                @keyframes noteFloatAnimation { 0% { transform: translateY(0) translateX(0) scale(0.6) rotate(0deg); opacity: 0; } 15% { opacity: 0.5; } 50% { transform: translateY(-40vh) translateX(45px) scale(1.1) rotate(15deg); opacity: 0.3; } 100% { transform: translateY(-85vh) translateX(-25px) scale(0.6) rotate(-15deg); opacity: 0; } }
                .animate-note-float { animation-name: noteFloatAnimation; animation-timing-function: ease-out; animation-iteration-count: 1; animation-fill-mode: forwards; }

                @keyframes rainFallAnimation {
                    0% { transform: translateY(-100%) rotate(15deg); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(100vh) rotate(15deg); opacity: 0; }
                }
                .animate-rain-fall {
                    animation-name: rainFallAnimation;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                }

                @keyframes stageSmokeRiseAnimation {
                    0% { transform: scale(1) translateY(10%) rotate(0deg); opacity: 0; }
                    20% { opacity: 1; }
                    60% { transform: scale(1.4) translateY(-15vh) rotate(45deg); opacity: 0.6; filter: blur(80px); }
                    100% { transform: scale(1.8) translateY(-40vh) rotate(90deg); opacity: 0; filter: blur(120px); }
                }
                .animate-stage-smoke-rise {
                    animation-name: stageSmokeRiseAnimation;
                    animation-timing-function: ease-out;
                    animation-iteration-count: infinite;
                    animation-duration: 14s;
                }
            `}</style>
        </div>
    );
}