'use client'
import Link from 'next/link';
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Play, Search, Mic, Trash2, Maximize, Settings, Music, Zap, Plus,
  CheckCircle2, ToggleLeft, ToggleRight, ListMusic, X, SkipForward,
  Headphones, Mic2, Minimize, ChevronDown, Save, Globe, User
} from 'lucide-react';

// --- [PRE-INITIALIZATION] ---
// ตรวจสอบและโหลด YouTube API ครั้งเดียว
if (typeof window !== 'undefined' && !document.getElementById('youtube-api')) {
  const tag = document.createElement('script');
  tag.id = 'youtube-api';
  tag.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(tag);
}

export default function SmartKaraokePage({ params }: { params: any }) {
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  // 1. การรับค่าพารามิเตอร์
  const { id: playlistId } = React.use(params) as any;
  const router = useRouter();

  // --- [STATES - ระบบเล่นเพลง] ---
  const [isAppStarted, setIsAppStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [playlistInfo, setPlaylistInfo] = useState<any>(null);
  const [allPlaylists, setAllPlaylists] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNextQueue, setShowNextQueue] = useState(false);
  const playerRef = useRef<any>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null); // 🎯 [เพิ่มใหม่]: คุมแท็กวิดีโอของระบบ Storage

  // 🎯 [ปรับใหม่]: เปลี่ยนจาก ID ยูทูป มาใส่ลิงก์ URL วิดีโอ MP4 จากตู้เก็บไฟล์ promo-videos ของพี่ครับ (ใส่ได้หลายตัวระบบจะสุ่มให้เอง)
  const PROMO_VIDEOS = [
    'https://[โปรดแก้เป็น URL ของพี่]/storage/v1/object/public/promo-videos/promo_v1.mp4',
    'https://[โปรดแก้เป็น URL ของพี่]/storage/v1/object/public/promo-videos/promo_v2.mp4'
  ];

  // --- [STATES - ระบบค้นหาและข้อมูลเพลง] ---
  const [query, setQuery] = useState(''); // ข้อความในช่องค้นหา
  const [results, setResults] = useState<any[]>([]); // ผลลัพธ์จากการค้นหา (UI)
  const [allMasterSongs, setAllMasterSongs] = useState<any[]>([]); // คลังเพลงทั้งหมดสำหรับ AI ค้นหา
  const [selectedResults, setSelectedResults] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false); // สถานะไมค์ 1
  const [isSmartListening, setIsSmartListening] = useState(false); // สถานะไมค์ 2
  const [isInstantListening, setIsInstantListening] = useState(false);//6มิย69ไมค์ค้นเล่นทันที
  // --- [STATES - โหมดและประกาศ] ---
  const [isKaraokeMode, setKaraokeMode] = useState(false);
  const [isListeningMode, setListeningMode] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [announcement, setAnnouncement] = useState('ยินดีต้อนรับสู่ NiiVaa SmartKaraoke');
  const [isLooping, setIsLooping] = useState(true);
  const [editingTrack, setEditingTrack] = useState<any | null>(null);

  // วางฟังก์ชันนี้ไว้ใน Playlist Component
  const triggerLyrics = async (v_id: string) => {
    await supabase
      .from('current_playing')
      .update({
        video_id: v_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);
  };

  // ตอนที่พี่สั่งเล่นเพลง (ในปุ่ม Play หรือฟังก์ชันเปิดวิดีโอ)
  const handlePlay = (track: any) => {
    setPlayingVideoId(track.video_id); // เล่นเพลงในหน้าปัจจุบัน
    triggerLyrics(track.video_id);    // ส่งสัญญาณไปที่หน้า Lyrics (Tab อื่น)
  };

  // ฟังก์ชันสำหรับส่งสัญญาณเปลี่ยนเพลงไปที่หน้า Lyrics อัตโนมัติ
  const syncCurrentPlaying = async (video_id: string, title: string) => {
    try {
      console.log("📡 กำลังส่งสัญญาณเปลี่ยนเพลงไปที่หน้า Lyrics...");

      const { error } = await supabase
        .from('current_playing')
        .update({
          video_id: video_id,
          title: title,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1); // บังคับอัปเดตที่ id 1 เสมอ

      if (error) throw error;
      console.log("✅ ส่งสัญญาณสำเร็จ!");
    } catch (err: any) {
      console.error("❌ ส่งสัญญาณพลาด:", err.message);
    }
  };

  // --- [FETCH DATA - โหลดข้อมูลจาก Database] ---
  const fetchAllData = useCallback(async () => {
    try {
      // 1. ดึง Playlist พร้อมให้นับจำนวน tracks ที่เชื่อมอยู่มาด้วย
      // ใช้คำสั่ง '*, tracks(count)' เพื่อให้ Supabase ไปนับเพลงมาให้
      const { data: allP, error: pError } = await supabase
        .from('playlists')
        .select('*, tracks(count)');

      if (pError) throw pError;

      // 2. จัดรูปแบบข้อมูลใหม่ (Mapping) ให้มีฟิลด์ tracks_count เพื่อไปแสดงใน UI
      if (allP) {
        const formattedPlaylists = allP.map(p => ({
          ...p,
          // Supabase จะส่งค่ากลับมาเป็น tracks: [{ count: 5 }]
          // เราจึงดึงค่าออกมาใส่ใน tracks_count
          tracks_count: p.tracks?.[0]?.count || 0
        }));
        setAllPlaylists(formattedPlaylists);

        // 🎯 [เพิ่มใหม่]: ค้นหาข้อมูลของเพลย์ลิสต์ปัจจุบัน เพื่อซิงค์ชื่อป้าย, สวิตช์บอร์ด และโลโก้หน่วยงานจริงมาใช้งาน
        const currentPlay = formattedPlaylists.find(p => p.id === playlistId);
        if (currentPlay) setPlaylistInfo(currentPlay);
      }

      // 3. ดึงคลังเพลงทั้งหมด (Master Songs) เพื่อใช้กับระบบ Smart Search
      const { data: mData } = await supabase.from('master_songs').select('*');
      if (mData) setAllMasterSongs(mData);

      // 4. ดึงคิวเพลงใน Playlist ปัจจุบัน
      const { data: tData } = await supabase.from('tracks')
        .select('*, master_songs(*)')
        .eq('playlist_id', playlistId)
        .order('created_at', { ascending: true });
      setTracks(tData || []);


      // ตั้งค่าเพลงโปรโมทตอนเริ่มต้น
      // 🎯 [ปรับใหม่]: ดึงวิดีโอโปรโมทจากคลังตารางส่วนกลางบน Supabase มาสุ่มเล่นแทนแบบ Dynamic
      const { data: promoData } = await supabase.from('promo_videos').select('video_url');
      if (promoData && promoData.length > 0) {
        const globalUrls = promoData.map(v => v.video_url);

        if (!currentVideoId && !promoId) {
          const randomPromo = globalUrls[Math.floor(Math.random() * globalUrls.length)];
          setPromoId(randomPromo);
        }
      }

    } catch (err) {
      console.error("Fetch Error:", err);
    }
  }, [playlistId, currentVideoId, promoId]);


  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- [AI VOICE RESPONSE - ระบบเสียงตอบรับ] ---
  const speakResponse = (message: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // หยุดเสียงเก่าก่อนพูดใหม่
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'th-TH';
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- [LOGIC - ระบบการเล่นเพลง] ---
  const startApp = (videoId: string, isFast = false) => {
    setIsAppStarted(true);
    if (isFast) {
      setIsTransitioning(false);
      setCurrentVideoId(videoId);
    } else {
      setCurrentVideoId(null);
      setIsTransitioning(true);
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentVideoId(videoId);
      }, 5000);
    }
  };

  // --- [เพิ่ม States ใหม่] ---
  const [isAutoDJ, setIsAutoDJ] = useState(false); // ระบบ Auto DJ

  // --- [1. แก้ไขปุ่มกรอง (Karaoke/Listening) ให้ทำงานทันที] ---
  // ใช้ useEffect เพื่อให้เมื่อกดปุ่ม Mode แล้ว รายการที่ค้นหาค้างไว้จะถูกกรองใหม่ทันที
  useEffect(() => {
    if (query) handleSearch(query);
  }, [isKaraokeMode, isListeningMode]);

  // 🎯 [เพิ่มใหม่]: สเตตัสควบคุม Pop-up แผงปรับสี และหน่วยความจำเก็บสไตล์พรีเมียม
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [theme, setTheme] = useState({
    bg: '#000a12',
    border: '#006666',
    text: '#22d3ee',
    glow: 15,
    pulse: 2
  });
  // 🎯 [เพิ่มใหม่]: ตัวนับรอบการทำงานของวิดีโอโปรโมทส่วนกลาง
  const [promoLoopCount, setPromoLoopCount] = useState(0);

  // 🎯 [เพิ่มใหม่]: ลอจิกรีเซ็ตตัวนับรอบกลับไปเป็น 0 ทันทีที่มีเพลงหลักถูกเปิดขึ้นมาเล่น
  useEffect(() => {
    if (currentVideoId) {
      setPromoLoopCount(0);
    }
  }, [currentVideoId]);
  // 🎯 [เพิ่มใหม่]: ซิงค์ค่าสีจากฐานข้อมูลมาลง State ทันทีที่ข้อมูลเพลย์ลิสต์โหลดเสร็จ
  useEffect(() => {
    if (playlistInfo?.theme_config) {
      setTheme(playlistInfo.theme_config);
    }
  }, [playlistInfo]);

  // --- [2. ระบบ Auto DJ Logic] ---
  const triggerAutoDJ = useCallback(async () => {
    if (!isAutoDJ || allMasterSongs.length === 0) return;

    // สุ่มเพลงจากคลัง (กรองตามโหมดปัจจุบันถ้าต้องการ)
    const pool = allMasterSongs.filter(s => {
      const isK = s.title.toLowerCase().includes('karaoke') || s.title.includes('คาราโอเกะ');
      if (isKaraokeMode) return isK;
      if (isListeningMode) return !isK;
      return true;
    });

    if (pool.length > 0) {
      const randomSong = pool[Math.floor(Math.random() * pool.length)];
      // เพิ่มลงคิวและ AI แจ้งเตือน
      handleAddToQueue(randomSong);
      speakResponse(`คิวหมดแล้วครับ ออโต้ดีเจจัดเพลง ${randomSong.title} ให้ต่อเลย`);
    }
  }, [isAutoDJ, allMasterSongs, isKaraokeMode, isListeningMode]);

  // --- [3. ปรับปรุง playNextSong ให้รองรับ Auto DJ] ---
  const playNextSong = useCallback(() => {
    const currentIndex = tracks.findIndex(t => t.video_id === currentVideoId);

    if (currentIndex !== -1 && currentIndex < tracks.length - 1) {
      startApp(tracks[currentIndex + 1].video_id, true);
    } else {
      // ถ้าคิวเพลงหมด
      if (isAutoDJ) {
        triggerAutoDJ();
      } else {
        setIsAppStarted(false);
        setCurrentVideoId(null);
        speakResponse("จบการเล่นคิวเพลงแล้วครับ");
      }
    }
  }, [isAppStarted, tracks, currentVideoId, isAutoDJ, triggerAutoDJ]);

  const playNextRef = useRef(playNextSong);
  useEffect(() => { playNextRef.current = playNextSong; }, [playNextSong]);

  // --- [LOGIC - ระบบค้นหาปกติ (Mic 1)] ---
  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val) { setResults([]); return; }

    setIsListening(true);
    try {
      // 1. ค้นหาในคลังเพลง (Database) ก่อน
      const { data: stockData, error: dbError } = await supabase
        .from('master_songs')
        .select('*')
        .ilike('title', `%${val}%`)
        .limit(15);

      if (dbError) console.error("Database Error:", dbError);

      // 2. กรองข้อมูลในคลังตามโหมด (Karaoke / Listening)
      let filteredStock = [];
      if (stockData) {
        filteredStock = stockData.filter(s => {
          const title = s.title.toLowerCase();
          const isK = title.includes("คาราโอเกะ") || title.includes("karaoke");
          if (isKaraokeMode) return isK;
          if (isListeningMode) return !isK;
          return true;
        });
      }

      // 3. 🚩 ตัดสินใจ: ถ้าเจอในคลัง ให้แสดงผลจากคลัง แต่ถ้า "ไม่เจอ" ให้ไป YouTube
      if (filteredStock.length > 0) {
        console.log("พบเพลงในคลัง:", filteredStock.length);
        setResults(filteredStock.map(s => ({ ...s, source: 'stock' })));
        // ถ้าอยากให้หา YouTube ด้วยแม้จะเจอในคลังแล้ว ให้ลบบรรทัด return ด้านล่างออกครับ
        setIsListening(false);
        return;
      }

      // 4. 🚀 [YOUTUBE FALLBACK] ถ้าในคลังไม่มีเพลงที่ตรงโหมด ให้เริ่มค้นหาใน YouTube
      console.log("ไม่พบในคลัง... กำลังค้นหาใน YouTube");

      // ⚠️ ตรวจสอบ API KEY ตรงนี้ (ต้องเป็นคีย์จริงและไม่มีช่องว่าง)
      const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg";
      const searchSuffix = isKaraokeMode ? " คาราโอเกะ" : isListeningMode ? "" : "";
      const finalQuery = val + searchSuffix;

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(finalQuery)}&type=video&key=${apiKey}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("YouTube API Error:", errorData);
        return;
      }

      const ytData = await res.json();
      const ytResults = ytData.items?.map((i: any) => ({
        video_id: i.id.videoId,
        title: i.snippet.title,
        thumbnail_url: i.snippet.thumbnails.default.url,
        source: 'youtube'
      })) || [];

      setResults(ytResults);

    } catch (err) {
      console.error("Search System Failed:", err);
    } finally {
      setIsListening(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("เบราว์เซอร์ไม่รองรับ");
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => handleSearch(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  // --- [LOGIC - ระบบ SMART VOICE SEARCH (Mic 2)] ---
  const processSmartCommand = async (transcript: string) => {
    const command = transcript.trim().toLowerCase();
    let action = "search";
    let songName = command;

    // 1. ตรวจจับคำสั่ง (Keywords)
    const queueWords = /(ขอเพลง|เอาเพลง|จองเพลง|คิว|ต่อคิว)/;
    const playWords = /(ร้องเลย|เปิดเลย|จัดมา|เล่นเลย|เล่นเดี๋ยวนี้)/;

    if (queueWords.test(command)) {
      action = "queue";
      songName = command.replace(queueWords, "").trim();
    } else if (playWords.test(command)) {
      action = "play";
      songName = command.replace(playWords, "").trim();
    }

    setQuery(songName); // โชว์ชื่อเพลงในช่องค้นหา

    // 2. ค้นหาในคลัง (Stock) ก่อน
    let targetSong = allMasterSongs.find(s => {
      const isK = s.title.includes("คาราโอเกะ") || s.title.toLowerCase().includes("karaoke");
      const match = s.title.toLowerCase().includes(songName);
      if (isKaraokeMode) return match && isK;
      if (isListeningMode) return match && !isK;
      return match;
    });

    // 3. 🚀 [หัวใจสำคัญ] ถ้าในคลังไม่มี ให้ไปดึงจาก YouTube มา "เดี๋ยวนี้"
    if (!targetSong) {
      speakResponse(`กำลังค้นหา ${songName} จากยูทูปให้ครับ`);
      const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg"; // 🚩 ใส่ Key จริงของพี่
      const searchSuffix = isKaraokeMode ? " karaoke" : "";

      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(songName + searchSuffix)}&type=video&key=${apiKey}`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          // แปลงข้อมูล YouTube ให้เป็นรูปแบบเดียวกับ Master Song
          targetSong = {
            video_id: item.id.videoId,
            title: item.snippet.title,
            thumbnail_url: item.snippet.thumbnails.default.url
          };

          // 🚩 บันทึกลงคลัง Master_songs ก่อน เพื่อให้ Database ยอมให้เพิ่มคิว
          await supabase.from('master_songs').upsert(targetSong, { onConflict: 'video_id' });
        }
      } catch (err) {
        console.error("YouTube Smart Search Error:", err);
      }
    }

    // 4. สั่งการ (Action)
    if (targetSong) {
      if (action === "queue") {
        // สั่งเพิ่มคิว
        const { data } = await supabase.from('tracks').insert({
          playlist_id: playlistId,
          video_id: targetSong.video_id
        }).select();

        if (data) {
          speakResponse(`เพิ่มเพลง ${targetSong.title} ลงคิวเรียบร้อยครับ`);
          fetchAllData(); // อัปเดตรายการคิวด้านข้าง
        }
      } else if (action === "play") {
        // สั่งเล่นทันที
        // 1. เพิ่มเข้าคิวแบบเงียบๆ ก่อน
        await supabase.from('tracks').insert({ playlist_id: playlistId, video_id: targetSong.video_id });
        // 2. สั่ง Player เริ่มเล่น
        startApp(targetSong.video_id, true);
        speakResponse(`จัดไปครับ ร้องเพลง ${targetSong.title} เลย`);
        fetchAllData();
      }

      const handlePlaySong = async (song: any) => {
        // 1. สั่งเล่นในหน้าจอตัวเอง (โค้ดเดิมของพี่)
        setPlayingVideoId(song.video_id);

        // 2. ⚡ แทรกคำสั่งส่งสัญญาณ (เพิ่มเข้าไปตรงนี้ครับพี่)
        await syncCurrentPlaying(song.video_id, song.title);
      };

      // เคลียร์ UI การค้นหา (เลียนแบบปุ่ม Esc)
      setResults([]);
      setQuery('');
    } else {
      speakResponse(`หาเพลง ${songName} ไม่เจอจริงๆ ครับ ลองเปลี่ยนชื่อเพลงดูนะ`);
    }
  };

  const startSmartVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setIsSmartListening(true);
    recognition.onresult = (event: any) => processSmartCommand(event.results[0][0].transcript);
    recognition.onend = () => setIsSmartListening(false);
    recognition.start();
  };

  // --- [SYSTEM - การจัดการเพลงใน Database] ---
  const handleAddToQueue = async (song: any) => {
    const { data } = await supabase.from('tracks').insert([{ playlist_id: playlistId, video_id: song.video_id }]).select();
    if (data) fetchAllData();
  };

  const handleRemoveTrack = async (id: string) => {
    const { error } = await supabase.from('tracks').delete().eq('id', id);
    if (!error) setTracks(prev => prev.filter(t => t.id !== id));
  };

  const updateTrackSettings = async (id: string, updates: any) => {
    // 1. อัปเดตใน Local State ทันที (เพื่อให้เลขเปลี่ยนเดี๋ยวนั้น)
    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    // 2. ส่งข้อมูลไปที่ Supabase
    const { error } = await supabase.from('tracks').update(updates).eq('id', id);

    if (error) {
      alert("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      fetchAllData(); // ดึงค่าเก่ากลับมาถ้า Error
    }
  };

  const handleReorder = async (draggedIdx: number, targetIdx: number) => {
    const newTracks = [...tracks];
    const [movedItem] = newTracks.splice(draggedIdx, 1);
    newTracks.splice(targetIdx, 0, movedItem);
    setTracks(newTracks);
    // 💡 อัปเดต DB ได้ที่นี่ถ้ามีฟิลด์ลำดับ
  };

  const handleBulkAction = async (playNow: boolean) => {
    if (selectedResults.length === 0 || !playlistId) {
      console.error("ไม่มีข้อมูลเพลงที่เลือก หรือ playlistId หายไป");
      return;
    }

    try {
      // ขั้นตอนที่ 1: ลงทะเบียนเพลงลงในคลังหลัก (master_songs) ก่อน
      // ต้องทำเพื่อให้ Foreign Key ในตาราง tracks ทำงานได้
      const masters = selectedResults.map(s => ({
        video_id: s.video_id,
        title: s.title,
        thumbnail_url: s.thumbnail_url
      }));

      const { error: upsertError } = await supabase
        .from('master_songs')
        .upsert(masters, { onConflict: 'video_id' });

      if (upsertError) throw upsertError;

      // ขั้นตอนที่ 2: เพิ่มเพลงลงใน Playlist (tracks)
      const trackEntries = selectedResults.map(s => ({
        playlist_id: playlistId,
        video_id: s.video_id
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('tracks')
        .insert(trackEntries)
        .select();

      if (insertError) throw insertError;

      // ขั้นตอนที่ 3: สั่งเล่นทันที (ถ้าเลือกปุ่มเล่นเลย)
      if (playNow && inserted && inserted.length > 0) {
        startApp(inserted[0].video_id, true);
        speakResponse(`จัดไปครับ เริ่มเล่นเพลง ${selectedResults[0].title}`);
      } else {
        speakResponse(`เพิ่มเพลง ${selectedResults.length} รายการลงคิวแล้วครับ`);
      }

      // ขั้นตอนที่ 4: เคลียร์ค่าและโหลดข้อมูลใหม่
      setSelectedResults([]);
      setResults([]);
      setQuery('');
      fetchAllData(); // 🚩 สำคัญ: ต้องเรียกเพื่อให้ UI อัปเดตคิวเพลงด้านข้าง

    } catch (err) {
      console.error("Bulk Action Failed:", err);
      alert("ไม่สามารถเพิ่มเพลงได้ กรุณาตรวจสอบการเชื่อมต่อ Database");
    }
  };

  // --- [PLAYER CONTROL - YouTube API & Time Sensors] ---
  useEffect(() => {
    if (isTransitioning) return;
    const vidToPlay = currentVideoId; // 🎯 [ปรับใหม่]: ให้ YouTube สนใจเฉพาะคิวเพลงหลักเท่านั้น ปล่อยให้วิดีโอโปรโมทเป็นหน้าที่ของแท็ก Video 
    if (!vidToPlay || !(window as any).YT) return;

    if (!playerRef.current) {
      playerRef.current = new (window as any).YT.Player('main-player', {
        videoId: vidToPlay,
        playerVars: { 'autoplay': 1, 'rel': 0, 'controls': 1, 'modestbranding': 1 },
        events: { 'onStateChange': (e: any) => { if (e.data === 0) playNextRef.current(); } }
      });
    } else if (playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById({
        videoId: vidToPlay,
        startSeconds: tracks.find(t => t.video_id === vidToPlay)?.start_time || 0
      });
    }
  }, [currentVideoId, promoId, isTransitioning]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        const track = tracks.find(t => t.video_id === currentVideoId);
        if (!track || duration === 0) return;

        const endTime = track.end_time || duration;
        setShowNextQueue(endTime - time <= 20 && isAppStarted);
        if (time >= endTime && isAppStarted) playNextSong();
        if (track.skip_start && time >= track.skip_start && time < (track.skip_end || 0)) {
          playerRef.current.seekTo(track.skip_end);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentVideoId, tracks, isAppStarted, playNextSong]);
  // ฟังก์ชันที่เรียกเมื่อกดเล่นเพลง
  const playSong = async (song: any) => {
    // 1. อัปเดตตาราง current_playing ว่าตอนนี้เล่นเพลงนี้อยู่
    const { error } = await supabase
      .from('current_playing')
      .update({
        video_id: song.video_id,
        title: song.title,
        updated_at: new Date()
      })
      .eq('id', 1);

    if (!error) {
      // 2. สั่งเล่นเพลงในเครื่องนี้ตามปกติ (เช่นเปิด YouTube Embed)
      setCurrentVideoId(song.video_id);
    }
  };

  // --- [KEYBOARD SHORTCUTS] ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Home') { e.preventDefault(); playerRef.current?.seekTo(tracks.find(t => t.video_id === currentVideoId)?.start_time || 0); }
      if (e.key === 'End') { e.preventDefault(); playNextSong(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentVideoId, tracks, playNextSong]);

  // --- [4. ระบบปุ่มลัด ESC และการจัดการคีย์บอร์ด] ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('');
        setResults([]);
        setSelectedResults([]);
        setEditingTrack(null);
      }
      if (e.key === 'Home') {
        e.preventDefault();
        playerRef.current?.seekTo(tracks.find(t => t.video_id === currentVideoId)?.start_time || 0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        playNextSong();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [query, tracks, currentVideoId, playNextSong]);

  // 🚩 เพิ่มโค้ดชุดนี้ใน Component หน้าที่ใช้แสดงคิวเพลง
  useEffect(() => {
    if (!playlistId) return;

    // 1. สร้าง Channel สำหรับฟังการเปลี่ยนแปลง
    const channel = supabase
      .channel('realtime-tracks') // ชื่อแชนแนล (ตั้งอะไรก็ได้)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // ฟังเฉพาะตอนที่มีการเพิ่มข้อมูลใหม่
          schema: 'public',
          table: 'tracks',
          filter: `playlist_id=eq.${playlistId}` // ฟังเฉพาะชุดเพลงที่เปิดอยู่
        },
        (payload) => {
          console.log('พบเพลงใหม่เข้าคิว!', payload);
          // 2. ⚡ สั่งให้โหลดข้อมูลใหม่ทันทีโดยไม่ต้องรีเฟรช
          fetchAllData();

          // (Option) อาจจะเพิ่มเสียงแจ้งเตือนสั้นๆ หรือแจ้งเตือนบนหน้าจอ
          // toast.success("มีเพื่อนส่งเพลงใหม่เข้ามา!");
        }
      )
      .subscribe();

    // 3. ปิดการเชื่อมต่อเมื่อออกจากหน้า
    return () => {
      supabase.removeChannel(channel);
    };
  }, [playlistId, fetchAllData]);
  // ⚡ ระบบรีโมทอัจฉริยะ: ส่งสัญญาณทุกครั้งที่ Video ID เปลี่ยน (ไม่ว่าจะกดเองหรือ Auto-Next)
  useEffect(() => {
    const syncLyricsSignal = async () => {
      if (!currentVideoId) return;

      // ค้นหาข้อมูลเพลงจากรายการ tracks เพื่อเอา Title
      const currentTrack = tracks.find(t => t.video_id === currentVideoId);

      console.log("📡 กำลังซิงค์เพลงใหม่ไปหน้า Lyrics:", currentTrack?.master_songs?.title);

      const { error } = await supabase
        .from('current_playing')
        .update({
          video_id: currentVideoId,
          title: currentTrack?.master_songs?.title || 'Unknown Title',
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) console.error("❌ ส่งสัญญาณไม่สำเร็จ:", error.message);
    };

    syncLyricsSignal();
  }, [currentVideoId]); // <--- ทำงานทุกครั้งที่ตัวแปรนี้เปลี่ยนค่า

  // --- [RENDER UI SET F - FULL FEATURE & NEON STYLE] ---
  return (
    <main className="flex h-screen overflow-hidden bg-[var(--user-bg)] font-prompt">
      {/* ⚡ [เพิ่มใหม่]: แผงฝังตัวแปรสไตล์ CSS Variables เพื่อลอนช์ค่าสีและ Slide bar วิ่งกระจายไปทั่วทั้งหน้าจอ */}
      <style>{`
          :root {
            --user-bg: ${theme.bg};
            --user-border: ${theme.border};
            --user-neon: ${theme.text};
            --user-glow: 0 0 ${theme.glow}px ${theme.text};
            --user-pulse-speed: ${theme.pulse}s;
          }
          /* คลาสแอนิเมชันกระพริบวูบวาบอัจฉริยะแบบไดนามิก ปรับความเร็วตามสไลด์บาร์ */
          .premium-pulse {
            animation: premium-pulse-anim var(--user-pulse-speed) cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          @keyframes premium-pulse-anim {
            0%, 100% { opacity: 1; filter: drop-shadow(0 0 ${theme.glow}px ${theme.text}); }
            50% { opacity: .5; filter: drop-shadow(0 0 ${theme.glow / 3}px ${theme.text}); }
          }
        `}</style>
      <div className={`flex-1 bg-[#000a12] text-white flex flex-col overflow-hidden relative ${isFullscreen ? 'p-0' : 'p-2'}`}>

        {/* 1. MARQUEE SECTION - ควบคุมโดย Announce & Loop */}
        {showAnnouncement && announcement && (
          <div className={`absolute left-0 right-0 z-[10002] transition-all duration-700 ${isFullscreen ? 'top-4 bg-black/40 backdrop-blur-sm py-2' : 'top-0 bg-black/20 py-1'}`}>
            <div className="overflow-hidden flex items-center">
              <div className={`whitespace-nowrap flex gap-10 ${isLooping ? 'animate-marquee' : 'animate-marquee-once'}`}>
                <span className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-4 text-lg">
                  <Music size={20} /> {announcement}
                </span>
                {isLooping && (
                  <span className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-4 text-lg">
                    <Music size={20} /> {announcement}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. MAIN LAYOUT */}
        <div className={`flex flex-1 gap-4 p-4 overflow-hidden ${isFullscreen ? 'flex-col' : ''}`}>

          {/* --- [LEFT SIDE: VIDEO & SEARCH] --- */}
          <section className={`flex flex-col gap-4 transition-all duration-500 ${isFullscreen ? 'flex-1 h-screen w-full fixed inset-0 z-[9999] bg-black' : 'flex-[4] h-full'}`}>

            {/* VIDEO CONTAINER (ฉบับอัปเดตระบบ Hybrid Player: เสถียรสูง ป้องกันปัญหาลบ Node และรองรับการค้างหน้าจอโปรโมท) */}
            <div className={`relative bg-black overflow-hidden transition-all duration-700 ${isFullscreen ? 'h-screen w-screen' : 'h-[480px] rounded-[2rem] border-2 border-[var(--user-border)] shadow-[var(--user-glow)]'}`}>

              {/* 🎬 1. ตู้เล่น YouTube: บังคับให้สแตนบายอยู่ใน DOM ตลอดเวลาเพื่อป้องกันระบบลบ Node พัง แต่ใช้สไตล์คุมเปิด/ปิดการมองเห็น */}
              <div
                id="main-player"
                className={`w-full h-full ${currentVideoId ? 'block' : 'hidden'}`}
              ></div>

              {/* 📺 2. ตู้เล่นวิดีโอโปรโมทส่วนกลาง: คุมลอจิกรอบที่ 1-2 มีเสียง รอบที่ 3 ขึ้นไปเงียบสนิท */}
              {!currentVideoId && (
                <video
                  ref={videoPlayerRef}
                  src={promoId || PROMO_VIDEOS[0]}
                  autoPlay
                  playsInline
                  // 🔊 รอบที่ 1 และ 2 (ค่า count เป็น 0 และ 1) จะเปิดเสียงปกติ พอขึ้นรอบที่ 3 (ค่า count >= 2) จะเปิดระบบ Muted ทันที
                  muted={promoLoopCount >= 2}
                  controls={false}
                  onEnded={() => {
                    // เมื่อเล่นจบ 1 รอบ ให้เพิ่มแต้มตัวนับรอบขึ้นไป 1 แต้ม
                    setPromoLoopCount(prev => prev + 1);

                    // สั่งให้วิดีโอเริ่มรันเล่นรอบถัดไปทันทีแบบแมนนวล
                    if (videoPlayerRef.current) {
                      videoPlayerRef.current.play();
                    }

                    if (isAutoDJ) {
                      triggerAutoDJ();
                    }
                  }}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}

              {/* Popup รายชื่อเพลงถัดไป (Next Queue) */}
              {showNextQueue && isAppStarted && tracks.length > 0 && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[85] w-auto max-w-[80%] animate-in fade-in zoom-in slide-in-from-top-4 duration-500">
                  <div className="bg-blue-900/80 backdrop-blur-xl border border-blue-400/30 px-6 py-2 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center gap-6 text-white">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-tighter shrink-0 border-r border-white/10 pr-4">Next Tracks</span>
                    <div className="flex gap-6 overflow-hidden">
                      {tracks.slice(tracks.findIndex(t => t.video_id === currentVideoId) + 1, tracks.findIndex(t => t.video_id === currentVideoId) + 3).map((t, idx) => (
                        <div key={t.id} className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-[10px] font-black bg-white/10 w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</span>
                          <span className={`text-xs font-bold ${idx === 0 ? 'text-white' : 'text-white/50'}`}>{t.master_songs?.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setIsFullscreen(!isFullscreen)} className="absolute bottom-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-2xl z-[100] backdrop-blur-md border border-white/10">
                {isFullscreen ? <Minimize size={24} className="text-[var(--user-neon)]" /> : <Maximize size={24} />}
              </button>
            </div>

            {/* [SEARCH & MODE SECTION] */}
            {!isFullscreen && (
              <div className="bg-[#001a33]/40 p-6 rounded-[2rem] border border-white/5 shadow-2xl shrink-0">
                <div className="flex gap-4 items-center">
                  {/* 🤖ปุ่ม Auto DJ (Neon Green/Amber) */}
                  <button
                    onClick={() => {
                      setIsAutoDJ(!isAutoDJ);
                      speakResponse(isAutoDJ ? "ปิดระบบออโต้ดีเจ" : "เปิดระบบออโต้ดีเจ เตรียมสนุกต่อเนื่องครับ");
                    }}
                    className={`p-3 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 ${isAutoDJ
                      ? 'border-amber-500 text-amber-400 shadow-[0_0_15px_#f59e0b] scale-105'
                      : 'border-white/10 text-white/20'
                      }`}
                  >
                    <Zap size={20} />
                    <span className="text-[8px] font-black uppercase">Auto DJ</span>
                  </button>

                  {/* 🎤 NEON MODE BUTTONS */}
                  <div className="flex gap-3 shrink-0">
                    {/* 🎛️ ปุ่ม Toggle สลับโหมดชิ้นเดียว (ขนาด บล็อก และขอบนีออน เท่าเดิม 100%) */}
                    <button
                      onClick={() => {
                        if (isKaraokeMode) {
                          setKaraokeMode(false);
                          setListeningMode(true);
                        } else {
                          setKaraokeMode(true);
                          setListeningMode(false);
                        }
                      }}
                      className={`p-3 rounded-xl border-2 transition-all duration-300 shrink-0 ${isKaraokeMode
                        ? 'border-purple-500 text-purple-400 shadow-[0_0_15px_#a855f7] scale-105'
                        : 'border-blue-500 text-blue-400 shadow-[0_0_15px_#3b82f6] scale-105'
                        }`}
                      title={isKaraokeMode ? "โหมดคาราโอเกะ (สีม่วง) - คลิกเพื่อสลับเป็นฟังเพลง" : "โหมดฟังเพลง (สีฟ้า) - คลิกเพื่อสลับเป็นร้องเพลง"}
                    >
                      {isKaraokeMode ? (
                        <Mic size={28} strokeWidth={2.5} />
                      ) : (
                        <Headphones size={28} strokeWidth={2.5} />
                      )}
                    </button>
                  </div>

                  {/* SEARCH INPUT (Synced with Mic 1, 2 & 3) */}
                  <div className="relative flex-1 group">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${isListening || isSmartListening || isInstantListening ? 'text-cyan-400 animate-pulse' : 'text-white/20'}`} size={22} />
                    <input
                      value={query}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="ค้นหาชื่อเพลง หรือ ศิลปิน..."
                      // ปรับขยาย pr-32 เป็น pr-44 เพื่อไม่ให้ตัวหนังสือที่พิมพ์วิ่งไปซ้อนทับกลุ่มปุ่มไมค์ทั้ง 3 ตัว
                      className="w-full bg-black/40 p-5 pl-14 pr-44 rounded-2xl outline-none focus:border-cyan-400/50 border border-white/5 transition-all font-bold text-lg text-white"
                    />

                    {/* กลุ่มปุ่มไมค์ควบคุมการสั่งการด้วยเสียง */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">

                      {/* ปุ่มไมค์ตัวที่ 1: ค้นหาปกติ (Voice Search - สีแดง) */}
                      <button
                        type="button"
                        onClick={startSpeechRecognition}
                        className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-bounce shadow-[0_0_15px_#ef4444]' : 'text-white/20 hover:text-white/60'}`}
                        title="ค้นหาปกติ"
                      >
                        <Mic size={22} />
                      </button>

                      {/* ปุ่มไมค์ตัวที่ 2: Smart Search (สีเขียวนีออน) */}
                      <button
                        type="button"
                        onClick={startSmartVoiceSearch}
                        className={`p-2 rounded-xl transition-all duration-300 ${isSmartListening ? 'bg-green-500 text-white shadow-[0_0_20px_#22c55e] scale-110' : 'text-green-500/40 hover:text-green-400'}`}
                        title="Smart Command (คิว/เล่นเลย/ลบ)"
                      >
                        <Mic size={22} className={isSmartListening ? 'animate-pulse' : ''} />
                      </button>

                      {/* ปุ่มไมค์ตัวที่ 3: พูดปุ๊บเล่นปั๊บ (Instant Autoplay - สีส้มอัมพันนีออน รองรับคลัง + YouTube เต็มรูปแบบ) */}
              <button
                type="button"
                onClick={async () => {
                  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (!SpeechRecognition) {
                    alert("อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการสั่งงานด้วยเสียงครับ");
                    return;
                  }

                  const recognition = new SpeechRecognition();
                  recognition.lang = 'th-TH';
                  recognition.interimResults = false;

                  recognition.onstart = () => {
                    setIsInstantListening(true);
                  };

                  recognition.onresult = async (event: any) => {
                    setIsInstantListening(false);
                    const voiceText = event.results[0][0].transcript.trim();
                    setQuery(voiceText); // โชว์ข้อความในช่องค้นหา

                    try {
                      // 1. ค้นหาในคลัง (Stock) ก่อน
                      let targetSong = allMasterSongs.find(s => {
                        const isK = s.title.includes("คาราโอเกะ") || s.title.toLowerCase().includes("karaoke");
                        const match = s.title.toLowerCase().includes(voiceText.toLowerCase());
                        if (isKaraokeMode) return match && isK;
                        if (isListeningMode) return match && !isK;
                        return match;
                      });

                      // 2. ถ้าไม่มีในคลัง ให้ไปดึงจาก YouTube
                      if (!targetSong) {
                        const apiKey = "AIzaSyC3SFBRAazRzbkP1COhhkyQK2JTG6wHiTg"; // 🚩 ใส่ Key จริงของพี่ตรงนี้นะครับ
                        const searchSuffix = isKaraokeMode ? " karaoke" : "";
                        
                        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(voiceText + searchSuffix)}&type=video&key=${apiKey}`);
                        const data = await res.json();

                        if (data.items && data.items.length > 0) {
                          const item = data.items[0];
                          targetSong = {
                            video_id: item.id.videoId,
                            title: item.snippet.title,
                            thumbnail_url: item.snippet.thumbnails.default.url
                          };

                          // 🚩 บันทึกลงคลัง Master_songs ก่อน เพื่อให้ Database ยอมให้เพิ่มคิว
                          await supabase.from('master_songs').upsert(targetSong, { onConflict: 'video_id' });
                        }
                      }

                      // 3. สั่งการ (Action - เล่นทันที)
                      if (targetSong) {
                        // 3.1 เพิ่มเข้าคิวแบบเงียบๆ
                        await supabase.from('tracks').insert({ playlist_id: playlistId, video_id: targetSong.video_id });
                        
                        // 3.2 สั่ง Player เริ่มเล่น
                        if (typeof startApp === 'function') {
                          startApp(targetSong.video_id, true);
                        }
                        
                        // 3.3 ส่งสัญญาณ Sync ไปที่จอหลัก
                        await supabase.from('current_playing').update({ 
                          video_id: targetSong.video_id, 
                          title: targetSong.title || 'Unknown Title',
                          updated_at: new Date().toISOString() 
                        }).eq('id', 1);

                        // เคลียร์ UI การค้นหา
                        setResults([]);
                        setQuery('');
                      } else {
                        alert(`หาเพลง "${voiceText}" ไม่เจอทั้งในคลังและบน YouTube ครับ`);
                      }
                    } catch (err) {
                      console.error("Instant Voice Error:", err);
                      alert("เกิดข้อผิดพลาดในการดึงข้อมูลจาก YouTube");
                    }
                  };

                  recognition.onerror = () => {
                    setIsInstantListening(false);
                  };

                  recognition.onend = () => {
                    setIsInstantListening(false);
                  };

                  recognition.start();
                }}
                className={`p-2 rounded-xl transition-all duration-300 ${isInstantListening ? 'bg-amber-500 text-white shadow-[0_0_20px_#f59e0b] scale-110' : 'text-amber-500/40 hover:text-amber-400'}`}
                title="พูดชื่อเพลงแล้วเล่นทันที (ค้นหา YouTube อัตโนมัติ)"
              >
                <Mic size={22} className={isInstantListening ? 'animate-pulse' : ''} />
              </button>

                    </div>
                  </div>

                  {/* [BULK ACTIONS] - แสดงเมื่อมีการเลือกหลายเพลง */}
                  {selectedResults.length > 0 && (
                    <div className="flex gap-2 animate-in slide-in-from-right duration-300">
                      <button
                        type="button"
                        onClick={() => handleBulkAction(false)}
                        className="bg-teal-600 hover:bg-teal-500 p-4 rounded-2xl font-bold text-xs"
                      >
                        เพิ่มเข้าคิว ({selectedResults.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBulkAction(true)}
                        className="bg-blue-600 hover:bg-blue-500 p-4 rounded-2xl font-bold text-xs"
                      >
                        แทรกเล่นทันที
                      </button>
                      <button type="button" onClick={() => setSelectedResults([])} className="bg-red-600 p-4 h-14 rounded-2xl hover:bg-red-500">
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* SEARCH RESULTS GRID */}
                {results.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto custom-scrollbar p-2 bg-black/20 rounded-2xl">
                    {results.map((s) => {
                      const isSelected = selectedResults.some(r => r.video_id === s.video_id);
                      return (
                        <div
                          key={s.video_id}
                          onClick={() => isSelected ? setSelectedResults(selectedResults.filter(r => r.video_id !== s.video_id)) : setSelectedResults([...selectedResults, s])}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                        >
                          <div className="relative shrink-0">
                            <img src={s.thumbnail_url} className="w-12 h-12 rounded-xl object-cover" alt="" />
                            <span className={`absolute -top-1 -right-1 px-1 rounded text-[8px] font-black ${s.source === 'stock' ? 'bg-orange-500' : 'bg-red-600'}`}>
                              {s.source === 'stock' ? 'STK' : 'YT'}
                            </span>
                          </div>
                          <div className="flex-1 overflow-hidden text-[11px] font-bold truncate">{s.title}</div>
                          {isSelected && <CheckCircle2 size={18} className="text-blue-500" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* --- [RIGHT SIDE: ASIDE] --- */}
          {!isFullscreen && (
            <aside className="w-[380px] h-full flex flex-col overflow-hidden bg-[#000a12] border-l border-white/5 relative shadow-[0_0_20px_rgba(34,211,238,0.05)]">



              {/* 1. Banner & Neon Control Panel (ฉบับอัปเดตระบบ White-Label ติดแบรนด์หน่วยงาน) */}
              <div className="bg-[#000a1a] p-4 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-center gap-3 mb-5">

                  {/* 🏢 [ส่วนที่ 1 - โลโก้]: แสดงรูปโลโก้หน่วยงานจริง หรือแสดงตัวอักษรแบรนด์ NIIVAA ทันสมัยหากไม่มีรูป */}
                  {playlistInfo?.logo_url ? (
                    <img
                      src={playlistInfo.logo_url}
                      alt="Logo"
                      className="w-8 h-8 rounded-lg object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                    />
                  ) : (
                    <div className="text-sm font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#CCFFFF] to-[#3333FF] drop-shadow-[0_0_5px_rgba(51,51,255,0.4)] italic">
                      NIIVAA
                    </div>
                  )}

                  <div className="flex flex-col items-start">
                    {/* 📝 [ส่วนที่ 2 - ป้ายชื่อ]: แสดงชื่อหน่วยงานที่ผู้ใช้พิมพ์กำหนดเอง หรือใช้ชื่อระบบมาตรฐานหากเว้นว่าง */}
                    <h1 className="text-white font-black tracking-wider italic text-xs uppercase">
                      {playlistInfo?.custom_banner || "SMARTKARAOKE"}
                    </h1>

                    {/* 🏷️ [ส่วนที่ 3 - สวิตช์ป้ายเล็ก]: ตรวจเช็คสวิตช์ ON/OFF ถ้าเปิดอยู่ให้เรืองแสงสแตนบายไว้เบาๆ */}
                    {playlistInfo?.show_niivaa_badge !== false && (
                      <span className="text-[7px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 uppercase tracking-widest font-bold mt-0.5 animate-pulse">
                        NiiVaa Academy
                      </span>
                    )}
                  </div>

                </div>

                {/* 🟢 NEON BUTTONS: Announce & Loop */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowAnnouncement(!showAnnouncement)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all duration-300 ${showAnnouncement ? 'border-green-500 text-green-400 shadow-[0_0_10px_#22c55e]' : 'border-white/10 text-white/20'
                      }`}
                  >
                    Announce {showAnnouncement ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border-2 transition-all duration-300 ${isLooping ? 'border-cyan-500 text-cyan-400 shadow-[0_0_10px_#06b6d4]' : 'border-white/10 text-white/20'
                      }`}
                  >
                    Loop {isLooping ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* 🛡️ [เพิ่มใหม่]: แผงปุ่มวิเศษตรวจสิทธิ์พรีเมียมองค์กร จะดีดโผล่ขึ้นมาให้เฉพาะสิทธิ์ Premium เท่านั้น */}
                {/* เติม || true เข้าไปท้ายเงื่อนไข เพื่อสั่งเปิดเผยปุ่มจานสีออกมาให้ทดสอบก่อนชั่วคราวครับ */}
                {(playlistInfo?.is_premium === true || true) && (
                  <button
                    type="button"
                    onClick={() => setShowThemeModal(true)}
                    className="mt-3 w-full py-2 rounded-lg text-[10px] font-black uppercase border border-amber-500/40 text-amber-400 bg-amber-500/5 hover:bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all flex items-center justify-center gap-1.5 premium-pulse"
                  >
                    🎨 ปรับแต่งสีบอร์ดพรีเมียม (Premium Theme)
                  </button>
                )}
              </div>

              {/* 💿 Playlist Selection Section */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2">
                <label className="text-[9px] font-black text-cyan-400/40 uppercase tracking-widest leading-none">
                  Select Playlist
                </label>

                <Link href="/create-playlist">
                  <button className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-cyan-400 hover:text-white transition-all bg-white/5 hover:bg-cyan-500/20 px-2 py-1 sm:px-3 sm:py-1 rounded-lg border border-white/10 hover:border-cyan-500/50 shadow-lg whitespace-nowrap">
                    <Plus size={12} strokeWidth={3} />
                    <span className="hidden xs:inline">CREATE PLAYLIST</span>
                    <span className="xs:hidden">CREATE</span>
                  </button>
                </Link>
              </div>

              <div className="relative mb-4">
                <select
                  value={playlistId}
                  onChange={(e) => router.push(`/playlist/${e.target.value}`)}
                  className="w-full bg-[#001a33] border border-white/10 p-3 sm:p-4 rounded-2xl text-cyan-400 font-bold outline-none text-sm appearance-none cursor-pointer hover:border-cyan-400/30 transition-all"
                >
                  {allPlaylists.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tracks_count || 0} เพลง)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={16} />
              </div>

              {/* 3. QUEUE LIST (ปรับปรุงให้รองรับมือถือ) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-24 space-y-2">
                {tracks
                  .filter(t => {
                    const isK = t.master_songs?.title.toLowerCase().includes('karaoke') || t.master_songs?.title.includes('คาราโอเกะ');
                    return (isKaraokeMode || isListeningMode) ? isK : true;
                  })
                  .map((track, i) => {
                    const isPlaying = track.video_id === currentVideoId;
                    return (
                      <div
                        key={track.id}
                        draggable
                        onDoubleClick={async () => {
                          startApp(track.video_id, true);
                          try {
                            await supabase.from('current_playing').update({
                              video_id: track.video_id,
                              title: track.master_songs?.title || 'Unknown Title',
                              updated_at: new Date().toISOString()
                            }).eq('id', 1);
                          } catch (err) { console.error(err); }
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('trackId', track.id);
                          e.dataTransfer.setData('draggedIndex', i.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleReorder(parseInt(e.dataTransfer.getData('draggedIndex')), i);
                        }}
                        className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-2xl border transition-all duration-300 cursor-pointer min-w-0 ${isPlaying
                          ? 'bg-green-900/60 border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.7)] sticky top-0 z-20 scale-[1.01]'
                          : 'bg-white/5 border-transparent hover:bg-white/10'
                          }`}
                      >
                        {/* 1. เลขคิว (ย่อขนาดเล็กน้อยในมือถือ) */}
                        <div className={`w-5 sm:w-6 text-center font-black text-[10px] sm:text-[11px] shrink-0 ${isPlaying ? 'text-white' : 'text-cyan-400'
                          }`}>
                          {isPlaying ? '▶️' : i}
                        </div>

                        {/* 2. รูปหน้าปก (เล็กลงในมือถือ) */}
                        <img
                          src={track.master_songs?.thumbnail_url}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl object-cover shrink-0"
                          alt=""
                        />

                        {/* 3. ชื่อเพลง (บังคับตัดคำให้เหลือพื้นที่ให้ปุ่มทางขวา) */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-[10px] sm:text-[11px] font-bold truncate text-white/90">
                            {track.master_songs?.title}
                          </p>
                          {track.category && (
                            <span className="text-[7px] sm:text-[8px] bg-cyan-400/20 text-cyan-400 px-1 py-0.5 rounded uppercase font-black tracking-tighter inline-block">
                              {track.category}
                            </span>
                          )}
                        </div>

                        {/* 4. S M E Status และปุ่ม Settings (จับกลุ่มให้ไม่แตกแถว) */}
                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          <div className="flex gap-0.5">
                            {track.start_time > 0 && <span className="bg-green-500 text-[7px] px-1 rounded text-white font-black">S</span>}
                            {track.end_time > 0 && <span className="bg-red-500 text-[7px] px-1 rounded text-white font-black">E</span>}
                            {track.skip_start > 0 && <span className="bg-yellow-500 text-black text-[7px] px-1 rounded font-black">M</span>}
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingTrack(track); }}
                            className="text-white/20 hover:text-cyan-400 p-1 transition-colors shrink-0"
                          >
                            <Settings size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

                  {/* 4. TRASH ZONE (ปุ่มถังขยะลอยทรงกลมเล็ก สีแดงนีออน ถาวรทุกอุปกรณ์) */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleRemoveTrack(e.dataTransfer.getData('trackId'));
                }}
                className="fixed bottom-4 right-4 w-12 h-12 bg-red-950/90 backdrop-blur-xl border-2 border-dashed border-red-500/60 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:border-red-400 hover:bg-red-900/80 transition-transform hover:scale-110 cursor-pointer z-[100]"
                title="ลากเพลงในคิวมาปล่อยที่นี่เพื่อลบทิ้ง"
              >
                <Trash2 size={20} className="text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
              

            </aside>
          )}
        </div>

        {/* 🎛️ [เพิ่มใหม่]: หน้าต่าง Pop-up คุมสไลด์บาร์ปรับแต่งสีกระพริบนีออนอิสระเฉพาะสมาชิกพรีเมียม */}
        {/* PREMIUM THEME SETTING MODAL (Turbopack Bug-Free Version) */}
        {showThemeModal && (
          <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#000d1a] border border-[var(--user-border)] p-6 rounded-[2.5rem] w-full max-w-xs shadow-[var(--user-glow)]">
              <h3 className="text-[var(--user-neon)] premium-pulse font-black text-xs uppercase tracking-wider mb-6 text-center">🎨 PREMIUM THEME CONTROL</h3>

              <div className="space-y-4">
                {/* 1. Background Color */}
                <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 font-bold">Background Color</span>
                  <input type="color" value={theme.bg} onChange={(e) => setTheme({ ...theme, bg: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                </div>

                {/* 2. Neon Glow Color */}
                <div className="flex justify-between items-center bg-black/30 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 font-bold">Neon & Font Color</span>
                  <input type="color" value={theme.text} onChange={(e) => setTheme({ ...theme, text: e.target.value })} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                </div>

                {/* 3. Slider: Glow Radius */}
                <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                    <span>Glow Radius</span>
                    <span className="text-[var(--user-neon)] font-black">{theme.glow}px</span>
                  </div>
                  <input type="range" min="0" max="35" value={theme.glow} onChange={(e) => setTheme({ ...theme, glow: parseInt(e.target.value) })} className="w-full accent-cyan-400 cursor-pointer h-1" />
                </div>

                {/* 4. Slider: Pulse Speed */}
                <div className="space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="flex justify-between text-[9px] text-gray-400 font-bold">
                    <span>Neon Pulse Speed</span>
                    <span className="text-cyan-400 font-black">{theme.pulse === 0 ? 'STILL' : `${theme.pulse}s`}</span>
                  </div>
                  <input type="range" min="0" max="4" step="0.5" value={theme.pulse} onChange={(e) => setTheme({ ...theme, pulse: parseFloat(e.target.value) })} className="w-full accent-cyan-400 cursor-pointer h-1" />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.from('playlists').update({ theme_config: theme }).eq('id', playlistId);
                    setShowThemeModal(false);
                    alert('Theme saved successfully!');
                  }}
                  className="flex-1 py-3 bg-cyan-500 text-black font-black text-[10px] tracking-wider rounded-xl hover:bg-cyan-400 transition-all active:scale-95"
                >
                  SAVE THEME
                </button>
                <button type="button" onClick={() => setShowThemeModal(false)} className="px-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-gray-400 hover:text-white">
                  CLOSE
                </button>
              </div>

              {/* RESET DEFAULT BUTTON */}
              <button
                type="button"
                onClick={async () => {
                  const defaultTheme = {
                    bg: '#000a12',
                    border: '#006666',
                    text: '#22d3ee',
                    glow: 15,
                    pulse: 2
                  };

                  if (window.confirm('Do you want to reset theme to default?')) {
                    setTheme(defaultTheme);
                    await supabase.from('playlists').update({ theme_config: defaultTheme }).eq('id', playlistId);
                    setShowThemeModal(false);
                    alert('Theme reset successfully!');
                  }
                }}
                className="w-full mt-3 py-2 bg-red-950/20 hover:bg-red-950/50 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                ↩️ RESET DEFAULT THEME
              </button>
            </div>
          </div>
        )}
        {/* ORIGINAL SME TRACK SETTING MODAL */}
        {/* --- 3. MODAL POPUP SETTINGS SME --- */}
        {editingTrack && (
          <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingTrack(null)}>
            <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
              <h3 className="text-cyan-400 font-black text-center mb-6 text-sm italic uppercase tracking-wider">⚙️ ตั้งค่า: {editingTrack.master_songs?.title}</h3>

              <div className="space-y-6">
                {/* S และ E */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-2 uppercase font-bold">เริ่ม (Start)</label>
                    <input type="number" defaultValue={editingTrack.start_time || 0} onBlur={(e) => updateTrackSettings(editingTrack.id, { start_time: parseInt(e.target.value) || 0 })} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 block mb-2 uppercase font-bold">จบ (End)</label>
                    <input type="number" defaultValue={editingTrack.end_time || 0} onBlur={(e) => updateTrackSettings(editingTrack.id, { end_time: parseInt(e.target.value) || 0 })} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all" />
                  </div>
                </div>

                {/* M (Skip Middle - ช่องไม่ล้นกรอบ) */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[10px] text-yellow-500 block mb-2 uppercase font-bold">⏭️ ข้ามท่อนกลาง (Skip)</label>
                  <div className="flex gap-2">
                    <input placeholder="เริ่มข้าม" type="number" defaultValue={editingTrack.skip_start || 0} onBlur={(e) => updateTrackSettings(editingTrack.id, { skip_start: parseInt(e.target.value) || 0 })} className="w-24 bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-center" />
                    <div className="flex items-center text-white/20">-</div>
                    <input placeholder="สิ้นสุด" type="number" defaultValue={editingTrack.skip_end || 0} onBlur={(e) => updateTrackSettings(editingTrack.id, { skip_end: parseInt(e.target.value) || 0 })} className="w-24 bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-center" />
                  </div>
                </div>

                {/* Tag Category */}
                <div className="pt-2 border-t border-white/5">
                  <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold">🏷️ แท็ก (Category)</label>
                  <input type="text" list="category-list" defaultValue={editingTrack.category || ''} onBlur={(e) => updateTrackSettings(editingTrack.id, { category: e.target.value })} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all" placeholder="เช่น ลูกทุ่ง, สตริง..." />
                  <datalist id="category-list">
                    {[...new Set(tracks.map(t => t.category).filter(Boolean))].map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>

                <button onClick={() => setEditingTrack(null)} className="w-full py-4 bg-cyan-600 text-black font-black rounded-2xl hover:bg-cyan-400 transition-colors uppercase text-xs tracking-widest shadow-lg">บันทึกและปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        )}

        {/* --- 4. GLOBAL NEON STYLES & ANIMATIONS --- */}
        <style jsx global>{`
          @keyframes marquee { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
          @keyframes marquee-once { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
          .animate-marquee { animation: marquee 25s linear infinite; }
          .animate-marquee-once { animation: marquee-once 25s linear forwards; }
          .shadow-neon { box-shadow: 0 0 15px rgba(34,211,238,0.4); }
          .drop-shadow-neon { filter: drop-shadow(0 0 8px rgba(34,211,238,0.8)); }
          
          /* Custom Scrollbar */
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.6); }
          
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: #000a12; }
          ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; border: 2px solid #000a12; }
        `}</style>
      </div>
    </main >
  );
}