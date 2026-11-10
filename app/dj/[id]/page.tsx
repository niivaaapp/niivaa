'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
// ⚠️ แก้ไข path ของ supabase ให้ตรงกับโปรเจกต์ (เช่น '@/lib/supabase')
import { supabase } from '@/lib/supabase';
// นำเข้า Icon สำหรับ UI
import { X, Info, ListMusic, Settings, Link as LinkIcon, MonitorPlay, PlusCircle } from 'lucide-react';

export default function DJManagerPage() {
    const params = useParams();
    const router = useRouter();
    const playlistId = params.id as string;

    // --- [STATES] ---
    const [searchQuery, setSearchQuery] = useState('');
    const [tracks, setTracks] = useState<any[]>([]);
    const [playlistName, setPlaylistName] = useState('กำลังโหลด...');
    const [editingTrack, setEditingTrack] = useState<any>(null); // สำหรับเปิด Modal SME
    const [allPlaylists, setAllPlaylists] = useState<any[]>([]);
    const [isManualOpen, setIsManualOpen] = useState(false); // State สำหรับเปิดคู่มือ
    const [currentSelectId, setCurrentSelectId] = useState("");
    // States สำหรับฟอร์มเพิ่มเพลง
    const [requestUrl, setRequestUrl] = useState('');
    const [fetchedTitle, setFetchedTitle] = useState('=== ดึงชื่อเพลงแสดงที่นี่ ===');
    const [isFetchingTitle, setIsFetchingTitle] = useState(false);
    const [requestAlias, setRequestAlias] = useState('');
    const [requestSinger, setRequestSinger] = useState('');

    // --- [1. ดึงข้อมูลคิวเพลง และตั้งค่าการเลือกอัตโนมัติ] ---
    const fetchAllData = useCallback(async () => {
        try {
            // 🌟 1. ดึงข้อมูลผู้ใช้ (User) ปัจจุบันที่ล็อกอินอยู่
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.error("No user logged in");
                return;
            }

            // 🌟 2. โหลดรายชื่อ Playlist เฉพาะของ User คนนี้เท่านั้น
            const { data: allPData, error: playlistError } = await supabase
                .from('playlists')
                .select('id, name')
                .eq('user_id', user.id) // <--- กรองเอาเฉพาะเพลย์ลิสต์ของตัวเอง
                .order('name', { ascending: true });

            if (playlistError) throw playlistError;

            if (allPData && allPData.length > 0) {
                setAllPlaylists(allPData);

                // 🌟 ตรวจสอบว่า ID จาก URL (ถ้ามีและไม่ใช่คำว่า selector) ตรงกับเพลย์ลิสต์ของตัวเองไหม
                const foundPlaylist = (playlistId && playlistId !== 'selector')
                    ? allPData.find(p => p.id === playlistId)
                    : null;

                if (foundPlaylist) {
                    // ถ้าเจอ: ให้ล็อก State เป็น ID นี้ (ช่อง Select จะแสดงชื่อนี้ทันที)
                    setCurrentSelectId(foundPlaylist.id);
                    setPlaylistName(foundPlaylist.name);

                    // 3. ดึงข้อมูลคิวเพลง (Tracks) เมื่อได้เพลย์ลิสต์ที่ถูกต้องแล้ว
                    const { data: tData, error: trackError } = await supabase
                        .from('tracks')
                        .select(`*, master_songs(*)`)
                        .eq('playlist_id', foundPlaylist.id)
                        .order('order_index', { ascending: true });

                    if (!trackError && tData) {
                        setTracks(tData);
                    }
                } else {
                    // 🌟 ถ้าไม่เจอ (เช่น เข้าผ่าน /dj/selector หรือเอา ID คนอื่นมาใส่): 
                    // ให้ล็อกเป็น "รายการแรกสุดของตัวเอง" แล้วเด้ง URL ไปหา
                    setCurrentSelectId(allPData[0].id);
                    setPlaylistName(allPData[0].name);
                    router.replace(`/dj/${allPData[0].id}`);
                    return; // หยุดทำงานเพื่อรอโหลดหน้าใหม่ตาม URL ที่ถูกต้อง
                }
            } else {
                // กรณี User สมัครใหม่และยังไม่เคยสร้าง Playlist เลย
                setAllPlaylists([]);
                setTracks([]);
                // หากต้องการให้เด้งไปหน้าสร้างเพลย์ลิสต์ สามารถเปิดคอมเมนต์ด้านล่างได้ครับ
                // router.replace('/create-playlist');
            }

        } catch (err) {
            console.error("Error fetching data:", err);
        }
    }, [playlistId, router]);

    useEffect(() => {
        fetchAllData();

        const channel = supabase.channel('dj_queue_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks', filter: `playlist_id=eq.${playlistId}` }, () => {
                fetchAllData();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchAllData, playlistId]);

    // --- [2. ระบบแก้ไขเลขคิว (Auto Reorder)] ---
    const handleReorder = async (oldIndex: number, newIndex: number) => {
        if (oldIndex === newIndex) return;

        const newTracks = [...tracks];
        const [movedItem] = newTracks.splice(oldIndex, 1);
        newTracks.splice(newIndex, 0, movedItem);
        setTracks(newTracks);

        const updates = newTracks.map((t, i) => ({
            id: t.id,
            playlist_id: t.playlist_id,
            video_id: t.video_id,
            order_index: i
        }));

        try {
            const { error } = await supabase.from('tracks').upsert(updates);
            if (error) console.error("Reorder Error:", error);
        } catch (err) {
            console.error("System Error during reorder:", err);
        }
    };

    // --- [3. ฟังก์ชันลบเพลง] ---
    const deleteTrack = async (id: string) => {
        if (!confirm('ยืนยันการลบคิวเพลงนี้?')) return;
        await supabase.from('tracks').delete().eq('id', id);
        fetchAllData();
    };

    // --- [4. ระบบฟอร์มดึงชื่อเพลงอัตโนมัติ] ---
    const extractYouTubeVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    useEffect(() => {
        const fetchTitle = async () => {
            if (!requestUrl) {
                setFetchedTitle('=== ดึงชื่อเพลงแสดงที่นี่ ===');
                return;
            }
            const videoId = extractYouTubeVideoId(requestUrl);
            if (!videoId) {
                setFetchedTitle('❌ รูปแบบลิงก์ไม่ถูกต้อง');
                return;
            }

            setIsFetchingTitle(true);
            setFetchedTitle('⏳ กำลังดึงข้อมูลเพลง...');
            try {
                const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
                if (res.ok) {
                    const data = await res.json();
                    setFetchedTitle(`🎵 ${data.title}`);
                } else {
                    setFetchedTitle('⚠️ ดึงชื่อเพลงไม่ได้ (แต่บันทึกได้)');
                }
            } catch (err) {
                setFetchedTitle('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อ');
            } finally {
                setIsFetchingTitle(false);
            }
        };

        const timer = setTimeout(() => fetchTitle(), 500);
        return () => clearTimeout(timer);
    }, [requestUrl]);

    const handleSaveRequest = async () => {
        const videoId = extractYouTubeVideoId(requestUrl);
        if (!videoId) return alert('กรุณาวางลิงก์ YouTube ให้ถูกต้อง');

        try {
            const cleanTitle = fetchedTitle.replace(/^(🎵|⏳|❌|⚠️)\s*/, '');
            await supabase.from('master_songs').upsert({
                video_id: videoId,
                title: cleanTitle === 'ดึงชื่อเพลงแสดงที่นี่ ===' ? `YouTube Video (${videoId})` : cleanTitle,
                thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            }, { onConflict: 'video_id' });

            await supabase.from('tracks').insert({
                playlist_id: playlistId,
                video_id: videoId,
                alias_name: requestAlias.trim(),
                singer_name: requestSinger.trim() || 'แขกในงาน',
                order_index: tracks.length
            });

            alert('เพิ่มคิวเพลงสำเร็จ!');
            setRequestUrl('');
            setRequestAlias('');
            setRequestSinger('');
            setFetchedTitle('=== ดึงชื่อเพลงแสดงที่นี่ ===');
            fetchAllData();
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    // --- [5. ฟังก์ชันตั้งค่า SME] ---
    const updateTrackSettings = async (id: string, updates: any, videoId?: string) => {
        try {
            await supabase.from('tracks').update(updates).eq('id', id);
            if (updates.category !== undefined && videoId) {
                await supabase.from('master_songs').update({ category: updates.category }).eq('video_id', videoId);
            }
            fetchAllData();
        } catch (err) {
            console.error(err);
        }
    };

    // --- [ฟังก์ชันเคลียร์เพลงซ้ำ (เช็ก S, M, E)] ---
    const handleClearDuplicates = async () => {
        if (!confirm('ยืนยันการลบเพลงที่ "ซ้ำกัน" ออกจากคิว?\n(ระบบจะเก็บเพลงที่มีการตั้งค่า S, M, E แตกต่างกันไว้)')) return;

        try {
            // 1. ดึงข้อมูลเพลงทั้งหมดในอัลบั้มนี้
            const { data: allTracks, error: fetchError } = await supabase
                .from('tracks')
                .select('*')
                .eq('playlist_id', playlistId)
                .order('order_index', { ascending: true }); // ดึงตามลำดับคิว

            if (fetchError) throw fetchError;
            if (!allTracks || allTracks.length === 0) return alert('ไม่มีเพลงในคิวให้เคลียร์ครับ');

            const uniqueKeys = new Set();
            const tracksToDelete: string[] = [];
            const tracksToKeep: any[] = [];

            // 2. คัดแยกเพลงว่าอันไหนซ้ำ อันไหนไม่ซ้ำ
            allTracks.forEach(track => {
                // ดึงค่า SME (ถ้าไม่มีค่า ให้เป็น 0 เพื่อให้เทียบกันได้)
                const st = track.start_time || 0;
                const et = track.end_time || 0;
                const ss = track.skip_start || 0;
                const se = track.skip_end || 0;

                // สร้างรหัสอ้างอิง เช่น "vId123_0_0_0_0" หรือ "vId123_10_60_0_0"
                const key = `${track.video_id}_${st}_${et}_${ss}_${se}`;

                if (uniqueKeys.has(key)) {
                    // ถ้ามีรหัสนี้แล้ว แปลว่าซ้ำ 100% -> เตรียมลบทิ้ง
                    tracksToDelete.push(track.id);
                } else {
                    // ถ้ารหัสนี้เพิ่งเจอครั้งแรก -> จดจำไว้ และเก็บเพลงนี้ไว้ใช้งาน
                    uniqueKeys.add(key);
                    tracksToKeep.push(track);
                }
            });

            if (tracksToDelete.length === 0) {
                return alert('✨ ไม่มีเพลงซ้ำที่ต้องเคลียร์ครับ คิวเพลงสะอาดเรียบร้อยดี!');
            }

            // 3. สั่งลบเพลงที่ซ้ำทั้งหมดออกจาก Database
            const { error: deleteError } = await supabase
                .from('tracks')
                .delete()
                .in('id', tracksToDelete); // ลบทีละหลายๆ ID ได้ในคำสั่งเดียว

            if (deleteError) throw deleteError;

            // 4. อัปเดต order_index ใหม่ให้เพลงที่เหลือเรียงลำดับสวยงาม
            const updates = tracksToKeep.map((t, i) => ({
                id: t.id,
                playlist_id: t.playlist_id,
                video_id: t.video_id,
                order_index: i
            }));
            await supabase.from('tracks').upsert(updates);

            alert(`🧹 เคลียร์เพลงซ้ำสำเร็จ! ลบออกไปทั้งหมด ${tracksToDelete.length} รายการ`);
            fetchAllData(); // โหลดหน้าจอใหม่

        } catch (err: any) {
            console.error('Error clearing duplicates:', err);
            alert('เกิดข้อผิดพลาดในการเคลียร์เพลงซ้ำ: ' + err.message);
        }
    };
    // 🌟 [เพิ่มตรงนี้] ท่าไม้ตายตามที่คุณแนะนำ: จับคู่ ID กับข้อมูลเพลย์ลิสต์ให้เสร็จสรรพก่อน
    const activePlaylist = allPlaylists.find(p => String(p.id) === String(playlistId));
    const isPlaylistsLoaded = allPlaylists.length > 0;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 font-sans max-w-5xl mx-auto relative overflow-hidden">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-cyan-500/30 pb-4 mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-cyan-400">NiiVaa SmartMedia & SmartKaraoke</h1>
                    <h2 className="text-sm text-gray-400 mt-1">จัดการคิวเพลงและตั้งค่าการเล่นเพลง (โหมด DJ เบื้องหลัง)</h2>
                </div>

                {/* 🌟 ปุ่มนำทางย้ายมาฝั่งขวา และจัดรูปแบบใหม่ */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button onClick={() => router.push(`/playlist/${playlistId}`)} className="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2">
                        <MonitorPlay size={16} /> ไปหน้าจอแสดงผล
                    </button>
                    <button onClick={() => router.push(`/create-playlist`)} className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                        <PlusCircle size={16} /> สร้างชุดเพลงใหม่
                    </button>
                    {/* 🌟 [เพิ่มใหม่] ปุ่มล้างเพลงซ้ำ */}
                    <button
                        onClick={handleClearDuplicates}
                        className="px-4 py-2 bg-orange-900/30 text-orange-400 border border-orange-500/40 rounded-xl text-xs font-bold hover:bg-orange-800/50 hover:text-orange-200 transition-all shadow-md ml-auto"
                        title="ลบเพลงที่ซ้ำกัน (ยกเว้นเพลงที่มีการตั้งค่า S,M,E แตกต่างกัน)"
                    >
                        🧹 ล้างเพลงซ้ำ
                    </button>
                    <button onClick={() => setIsManualOpen(true)} className="p-2.5 bg-slate-800 border border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-slate-700 transition-all shadow-[0_0_10px_rgba(34,211,238,0.2)]" title="คู่มือการใช้งาน">
                        <Info size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* --- ซ้าย: QUEUE LIST (8 ส่วน) --- */}
                <div className="lg:col-span-8 flex flex-col h-full">
                    {/* 🌟 [เพิ่มใหม่] ข้อความแจ้งเตือน */}
                    <div className="mb-2">
                        <span className="text-amber-400 text-[11px] sm:text-xs font-bold bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20 inline-flex items-center gap-2">
                            💡 โปรดตรวจสอบ เลือกอัลบั้ม หรือชุดสื่อที่ต้องการปรับปรุงก่อนเสมอ
                        </span>
                    </div>

                    {/* ส่วนเลือก Playlist และค้นหา */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">

                        {/* 🌟 3. ผูกช่อง Select เข้ากับ State ตัวใหม่ของเรา */}
                        <select
                            value={currentSelectId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                if (newId) {
                                    setCurrentSelectId(newId); // เปลี่ยนชื่อที่หน้าจอทันที
                                    router.push(`/dj/${newId}`); // สั่งเปลี่ยน URL
                                }
                            }}
                            className="flex-1 bg-black/60 border border-cyan-500/50 p-3 rounded-xl text-cyan-300 font-bold outline-none text-sm cursor-pointer"
                        >
                            {allPlaylists.length === 0 ? (
                                <option value="">⏳ กำลังโหลดข้อมูลอัลบั้ม...</option>
                            ) : (
                                allPlaylists.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))
                            )}
                        </select>

                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อเพลง, ผู้จอง หรือ Alias..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-cyan-500/30 focus:border-cyan-400 p-3 pl-10 rounded-xl text-white text-sm outline-none transition-all"
                            />
                            <span className="absolute left-3 top-3.5 text-cyan-500/50">🔍</span>
                        </div>
                    </div>

                    <div className="flex-1 h-[40vh] sm:h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar bg-white/5 p-3 rounded-2xl border border-white/5">
                        {tracks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2">
                                <ListMusic size={40} className="opacity-20" />
                                <p className="text-xs">ยังไม่มีคิวเพลงในรายการนี้</p>
                            </div>
                        ) : (
                            tracks.map((track, i) => {
                                const query = searchQuery.toLowerCase();
                                const title = track.master_songs?.title?.toLowerCase() || '';
                                const alias = track.alias_name?.toLowerCase() || '';
                                const singer = track.singer_name?.toLowerCase() || '';
                                const isMatch = title.includes(query) || alias.includes(query) || singer.includes(query);

                                if (searchQuery && !isMatch) return null;

                                return (
                                    <div key={track.id} className="flex items-center gap-3 bg-[#121212] border border-white/5 p-2 rounded-2xl hover:border-cyan-500/30 transition-all group">
                                        <input
                                            type="number"
                                            min="1"
                                            max={tracks.length}
                                            defaultValue={i + 1}
                                            key={`q-${track.id}-${i}`}
                                            title="พิมพ์เลขใหม่เพื่อย้ายคิว"
                                            className="w-10 bg-black/40 border border-white/10 hover:border-cyan-500/50 focus:border-cyan-400 focus:bg-cyan-950/40 text-center font-black text-xs text-cyan-400 rounded-lg outline-none transition-all py-1.5 shrink-0"
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            onBlur={(e) => {
                                                const newVal = parseInt(e.target.value);
                                                if (!isNaN(newVal) && newVal !== i + 1) {
                                                    let newIndex = newVal - 1;
                                                    if (newIndex < 0) newIndex = 0;
                                                    if (newIndex >= tracks.length) newIndex = tracks.length - 1;
                                                    handleReorder(i, newIndex);
                                                } else {
                                                    e.target.value = (i + 1).toString();
                                                }
                                            }}
                                        />

                                        <div className="relative w-12 h-10 shrink-0 rounded-lg overflow-hidden border border-white/10">
                                            <img src={track.master_songs?.thumbnail_url} alt="ปกเพลง" className="object-cover w-full h-full opacity-80" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate text-white/90">{track.master_songs?.title}</p>
                                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                {track.alias_name && (
                                                    <span className="text-[9px] bg-cyan-500/25 text-cyan-300 px-1.5 py-0.5 rounded font-black tracking-tighter truncate max-w-[80px]">{track.alias_name}</span>
                                                )}
                                                {track.singer_name && (
                                                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold truncate max-w-[100px]">🎤 {track.singer_name}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-1 shrink-0">
                                            <div className="flex items-center gap-1">
                                                {track.start_time > 0 && (
                                                    <span className="flex items-center justify-center w-4 h-4 bg-green-500 text-[9px] rounded-sm text-white font-black leading-none" title="ตั้งค่าจุดเริ่ม (Start) ไว้">S</span>
                                                )}
                                                {track.skip_start > 0 && (
                                                    <span className="flex items-center justify-center w-4 h-4 bg-yellow-500 text-black text-[9px] rounded-sm font-black leading-none" title="ตั้งค่าข้ามท่อนกลาง (Skip) ไว้">M</span>
                                                )}
                                                {track.end_time > 0 && (
                                                    <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-[9px] rounded-sm text-white font-black leading-none" title="ตั้งค่าจุดตัดท้าย (Cut Tail) ไว้">E</span>
                                                )}
                                            </div>
                                            <button onClick={() => setEditingTrack(track)} className="p-2 bg-white/5 hover:bg-cyan-600/30 text-cyan-400 rounded-xl transition-all" title="ตั้งค่าการเล่น (SME)">
                                                <Settings size={16} />
                                            </button>
                                            <button onClick={() => deleteTrack(track.id)} className="p-2 bg-white/5 hover:bg-red-600/30 text-red-400 rounded-xl transition-all" title="ลบเพลง">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* --- ขวา: FORM SECTION (4 ส่วน) --- */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                    <div className="bg-[#121212] border border-cyan-500/30 rounded-[2rem] p-6 shadow-[0_0_20px_rgba(34,211,238,0.05)] space-y-4">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                            <LinkIcon size={20} className="text-cyan-400" />
                            <h3 className="font-bold text-cyan-400">เพิ่มเพลงใหม่เข้าคิว</h3>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">1. วาง URL YouTube</label>
                            <input type="text" placeholder="https://www.youtube.com/watch?v=..." value={requestUrl} onChange={(e) => setRequestUrl(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-cyan-500 p-3.5 rounded-xl text-white text-xs outline-none transition-all" />
                        </div>

                        <div className={`text-center text-[11px] font-black tracking-wide py-1 ${isFetchingTitle ? 'text-yellow-400 animate-pulse' : fetchedTitle.startsWith('🎵') ? 'text-green-400' : fetchedTitle.startsWith('❌') ? 'text-red-400' : 'text-cyan-300'}`}>
                            {fetchedTitle}
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">2. นามแฝง / ชื่อเวอร์ชัน (Alias)</label>
                            <input type="text" placeholder="เช่น ร้องคู่, ตัดเกริ่น..." value={requestAlias} onChange={(e) => setRequestAlias(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-cyan-500 p-3.5 rounded-xl text-white text-xs outline-none transition-all" />
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 font-bold block mb-1 uppercase">3. ระบุชื่อผู้จองคิวร้องเพลง</label>
                            <input type="text" placeholder="เช่น โต๊ะ 5, คุณเอ..." value={requestSinger} onChange={(e) => setRequestSinger(e.target.value)} className="w-full bg-black/60 border border-white/10 focus:border-cyan-500 p-3.5 rounded-xl text-white text-xs outline-none transition-all" />
                        </div>

                        <button
                            onClick={handleSaveRequest}
                            disabled={!extractYouTubeVideoId(requestUrl) || isFetchingTitle}
                            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-white/20 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all mt-4 shadow-lg shadow-cyan-900/50"
                        >
                            บันทึกส่งเพลงเข้าต่อคิว
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODAL SME --- */}
            {editingTrack && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingTrack(null)}>
                    <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                        <h3 className="text-cyan-400 font-black text-center mb-6 text-sm italic uppercase tracking-wider">
                            ⚙️ ตั้งค่า: {editingTrack?.master_songs?.title || 'ไม่ทราบชื่อเพลง'}
                        </h3>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                updateTrackSettings(editingTrack.id, {
                                    singer_name: formData.get('singer_name')?.toString() || '',
                                    alias_name: formData.get('alias_name')?.toString() || '',
                                    start_time: parseInt(formData.get('start_time')?.toString() || '0') || 0,
                                    end_time: parseInt(formData.get('end_time')?.toString() || '0') || 0,
                                    repeat_count: parseInt(formData.get('repeat_count')?.toString() || '1') || 1,
                                    skip_start: parseInt(formData.get('skip_start')?.toString() || '0') || 0,
                                    skip_end: parseInt(formData.get('skip_end')?.toString() || '0') || 0,
                                    category: formData.get('category')?.toString() || ''
                                }, editingTrack.video_id);
                                setEditingTrack(null);
                            }}
                            className="space-y-6"
                        >
                            <div>
                                <label className="text-[10px] text-amber-400 block mb-2 uppercase font-bold tracking-widest">🎤 ชื่อผู้จองคิวร้อง (SINGER NAME)</label>
                                <input type="text" name="singer_name" placeholder="เช่น โต๊ะ 5, คุณเอ..." defaultValue={editingTrack?.singer_name || ''} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-amber-100 outline-none focus:border-amber-500 transition-all text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold tracking-widest">ชื่อเฉพาะ (ALIAS NAME)</label>
                                <input type="text" name="alias_name" defaultValue={editingTrack?.alias_name || ''} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] text-white/40 block mb-2 uppercase font-bold text-center">เริ่ม (วิ)</label><input type="number" name="start_time" defaultValue={editingTrack?.start_time || 0} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-center" /></div>
                                {/* 🌟 เปลี่ยน Label และปรับ Title ตรงนี้ ให้เข้ากับลอจิก "ตัดท้าย" หน้า Player */}
                                <div><label className="text-[10px] text-red-400/80 block mb-2 uppercase font-bold text-center">✂️ ตัดท้าย(วิ)</label><input type="number" name="end_time" defaultValue={editingTrack?.end_time || 0} title="ระบุจำนวนวินาทีที่ต้องการตัดทิ้งก่อนจบ" className="w-full bg-black/40 border border-red-500/30 p-3 rounded-xl text-white outline-none focus:border-red-500 text-center" /></div>
                                <div><label className="text-[10px] text-purple-400 block mb-2 uppercase font-bold text-center">🔁 ซ้ำ</label><input type="number" name="repeat_count" min="1" defaultValue={editingTrack?.repeat_count || 1} className="w-full bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl text-purple-300 outline-none focus:border-purple-500 text-center font-black" /></div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <label className="text-[10px] text-yellow-500 block mb-2 uppercase font-bold">⏭️ ข้ามท่อนกลาง (SKIP)</label>
                                <div className="flex gap-2">
                                    <input name="skip_start" placeholder="เริ่มข้าม" type="number" defaultValue={editingTrack?.skip_start || 0} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white text-center" />
                                    <div className="flex items-center text-white/20">-</div>
                                    <input name="skip_end" placeholder="สิ้นสุด" type="number" defaultValue={editingTrack?.skip_end || 0} className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white text-center" />
                                </div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                                <label className="text-[10px] text-cyan-400 block mb-2 uppercase font-bold">🏷️ หมวดหมู่ (CATEGORY)</label>
                                <input
                                    type="text"
                                    name="category"
                                    list={`category-options-${editingTrack?.id}`}
                                    placeholder="คลิกเพื่อเลือก หรือพิมพ์หมวดหมู่ใหม่..."
                                    defaultValue={editingTrack?.category || editingTrack?.master_songs?.category || ''}
                                    onClick={(e) => {
                                        if (typeof e.currentTarget.showPicker === 'function') {
                                            e.currentTarget.showPicker();
                                        }
                                    }}
                                    className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-white outline-none focus:border-cyan-500 transition-all text-sm cursor-pointer"
                                />
                                <datalist id={`category-options-${editingTrack?.id}`}>
                                    <option value="ลูกทุ่ง" /><option value="ลูกทุ่งเพลงคู่" /><option value="ลูกทุ่งเพลงแหล่" /><option value="ลูกทุ่งอีสาน" />
                                    <option value="หมอลำ" /><option value="กันตรึม" /><option value="เพื่อชีวิต" /><option value="เพื่อชีวิตเพลงคู่" />
                                    <option value="สตริง" /><option value="พื้นเมือง" /><option value="ไทยสากล" /><option value="สากล" />
                                    <option value="จีน" /><option value="บทสวด" /><option value="งานช่าง" /><option value="บทเรียน" />
                                </datalist>
                            </div>
                            <button type="submit" className="w-full py-4 bg-cyan-600 text-black font-black rounded-2xl hover:bg-cyan-400 transition-colors uppercase text-xs tracking-widest shadow-lg">บันทึกและปิดหน้าต่าง</button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MANUAL DRAWER (ฝังในหน้านี้) --- */}
            {isManualOpen && (
                <div className="fixed inset-0 z-[20000] flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsManualOpen(false)} />
                    <div className="relative w-full max-w-md bg-[#0f172a] h-full shadow-[-10px_0_30px_rgba(0,0,0,0.5)] border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-300">

                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="bg-cyan-500/20 p-2 rounded-lg"><Info className="text-cyan-400" size={24} /></div>
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-wide">คู่มือการใช้งาน</h2>
                                    <p className="text-xs text-cyan-400/80">ระบบผู้จัดการคิว (DJ Mode)</p>
                                </div>
                            </div>
                            <button onClick={() => setIsManualOpen(false)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-gray-300">

                            <section>
                                <h3 className="text-cyan-400 font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-3"><LinkIcon size={16} /> 1. การเพิ่มเพลงด้วยลิงก์ (URL)</h3>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li>คัดลอกลิงก์จากหน้าเว็บ YouTube <span className="text-gray-500 text-xs">(รองรับทั้งลิงก์ยาวและ youtu.be)</span></li>
                                    <li>นำมาวางในช่อง <strong>วาง URL YouTube</strong></li>
                                    <li>รอสักครู่ ระบบจะดึงชื่อเพลงอัตโนมัติ <span className="text-green-400 font-bold">(ขึ้น 🎵 สีเขียว)</span></li>
                                    <li>ระบุ <strong className="text-white">Alias Name</strong> (ชื่อช่วยจำ) และ <strong className="text-white">ชื่อผู้จองร้อง</strong></li>
                                    <li>กดปุ่มสีฟ้า <strong>"บันทึกส่งเพลงเข้าต่อคิว"</strong> เพลงจะไปอยู่ท้ายคิวทันที</li>
                                </ol>
                            </section>

                            <section>
                                <h3 className="text-cyan-400 font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-3"><ListMusic size={16} /> 2. การจัดการคิว (Queue)</h3>
                                <ul className="space-y-2">
                                    <li><strong className="text-white">สลับ/ย้ายคิว:</strong> คลิกที่ตัวเลขด้านหน้าสุดของเพลง พิมพ์เลขคิวลำดับใหม่ที่ต้องการ แล้วคลิกพื้นที่ว่าง (หรือกด Enter) ระบบจะจัดเรียงใหม่ทันที</li>
                                    <li><strong className="text-white">ลบเพลง:</strong> คลิกไอคอนถังขยะ 🗑️ ขวามือสุด</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-cyan-400 font-bold flex items-center gap-2 border-b border-white/10 pb-2 mb-3"><Settings size={16} /> 3. การตั้งค่าตัดต่อเพลง (SME)</h3>
                                <p className="mb-2">คลิกไอคอนฟันเฟือง ⚙️ ที่เพลงเพื่อเปิดหน้าต่างตั้งค่า:</p>
                                <ul className="list-disc pl-5 space-y-2 text-xs text-gray-400">
                                    <li><strong className="text-white">เริ่ม (วิ):</strong> วินาทีเริ่มต้นของเพลง (ข้าม Intro ยาวๆ)</li>
                                    <li><strong className="text-red-400">✂️ ตัดท้าย (วิ):</strong> ระบุ "จำนวนวินาทีที่ต้องการตัดทิ้งก่อนวิดีโอจบ" <br />(เช่น วิดีโอยาว 100 วิ ใส่ 10 วิ ระบบจะตัดจบที่วินาทีที่ 90)</li>
                                    <li><strong className="text-purple-400">🔁 ซ้ำ:</strong> จำนวนรอบที่ต้องการให้เล่นวน (เหมาะกับเพลงเดินแบบ)</li>
                                    <li><strong className="text-yellow-500">⏭️ ข้ามท่อนกลาง:</strong> ระบุ "เริ่มข้าม" ถึง "สิ้นสุด" เพื่อข้ามเนื้อเรื่องหรือบทพูดกลางเพลง</li>
                                    <li><strong className="text-cyan-400">🏷️ หมวดหมู่:</strong> เลือกหรือพิมพ์ใหม่เพื่อจัดกลุ่มให้ค้นหาง่าย</li>
                                </ul>
                            </section>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}