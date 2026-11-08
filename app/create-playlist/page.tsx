'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowUpDown, Copy, Disc, Mic2, Headphones, Plus, Music, ArrowRight,
  Pencil, Trash2, Image, Library, Search, LayoutDashboard, SlidersHorizontal,
  BookOpen, X, ChevronDown, Filter
} from 'lucide-react'

export default function CreatePlaylistPage() {
  const [playlists, setPlaylists] = useState<any[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  // State สำหรับการจัดเรียง (Sorting)
  const [sortBy, setSortBy] = useState('newest');
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('music')
  const [isSaving, setIsSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)

  const [customBanner, setCustomBanner] = useState('')
  const [showNiivaaBadge, setShowNiivaaBadge] = useState(true)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState('')

  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  // 🌟 เพิ่ม State สำหรับเก็บ userEmail เพื่อใช้แสดงผล
  
  const [userEmail, setUserEmail] = useState<string>('');

  const fetchPlaylists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         router.push('/smart-media-dashboard');
         return;
      }
      setUserId(user.id);
      setUserEmail(user.email || 'ไม่พบอีเมล'); // 🌟 เก็บ Email ไว้แสดงผล

      const { data, error } = await supabase
        .from('playlists')
        .select('*, tracks(count)')
        .eq('user_id', user.id) // ดึงเฉพาะของบัญชีนี้
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        const formattedPlaylists = data.map(p => ({
          ...p,
          song_count: p.tracks?.[0]?.count || 0
        }));
        setPlaylists(formattedPlaylists)
      }
    } catch (err: any) { console.error("Error:", err.message) }
  }

  useEffect(() => { fetchPlaylists() }, [])

  const filteredPlaylists = useMemo(() => {
    // 1. คัดกรอง (Filter) ตามคำค้นหาและโหมดก่อน
    let result = playlists.filter(playlist => {
      const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (playlist.description && playlist.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || playlist.type === filterType;
      return matchesSearch && matchesType;
    });

    // 2. จัดเรียง (Sort) ตามเงื่อนไขที่เลือก
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'th'); // เรียง ก-ฮ
      } else if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, 'th'); // เรียง ฮ-ก
      } else if (sortBy === 'tracks-desc') {
        return (b.song_count || 0) - (a.song_count || 0); // เรียงตามจำนวนเพลง
      }
      return 0;
    });

    return result;
  }, [playlists, searchQuery, filterType, sortBy]); // 👈 เพิ่ม sortBy เข้ามาใน Array

  const uploadLogoProcess = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const { error } = await supabase.storage.from('playlist-logos').upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('playlist-logos').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return alert('กรุณาระบุชื่อชุดสื่อ')
    if (!userId) return alert('กรุณาล็อกอินก่อนสร้างชุดสื่อ'); // 🌟 เช็ค User
    setIsSaving(true)

    try {
      let finalLogoUrl = logoUrl
      if (logoFile) finalLogoUrl = await uploadLogoProcess(logoFile)

      const payload = {
        name, description, type,
        custom_banner: customBanner,
        show_niivaa_badge: showNiivaaBadge,
        logo_url: finalLogoUrl,
        user_id: userId // 🌟 ประทับตราความเป็นเจ้าของ
      }

      if (editingId) {
        await supabase.from('playlists').update(payload).eq('id', editingId)
      } else {
        await supabase.from('playlists').insert([payload])
      }
      handleCancelEdit()
      fetchPlaylists()
    } catch (err: any) { alert('Error: ' + err.message) }
    finally { setIsSaving(false) }
  }

  const handleEditClick = (item: any) => {
    setEditingId(item.id)
    setName(item.name)
    setDescription(item.description || '')
    setType(item.type || 'music')
    setCustomBanner(item.custom_banner || '')
    setShowNiivaaBadge(item.show_niivaa_badge ?? true)
    setLogoUrl(item.logo_url || '')
    setLogoFile(null)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancelEdit = () => {
    setEditingId(null); setName(''); setDescription(''); setType('music');
    setCustomBanner(''); setShowNiivaaBadge(true); setLogoFile(null); setLogoUrl('');
  }

  const handleDeletePlaylist = async (id: string, playlistName: string) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบอัลบั้ม "${playlistName}" อย่างถาวร?`)) return
    await supabase.from('playlists').delete().eq('id', id)
    fetchPlaylists()
  }

  // ฟังก์ชันสำหรับคัดลอกชุดสื่อ (โคลน Playlist และ Tracks ทั้งหมด)
  const handleClonePlaylist = async (playlist: any) => {
    // 1. ถามชื่อชุดสื่อใหม่
    const newName = window.prompt(`ตั้งชื่อชุดสื่อใหม่ (สำเนาจาก: ${playlist.name})`, `${playlist.name} (Copy)`);
    if (!newName) return; // ถ้ายกเลิก หรือไม่กรอกชื่อ ให้หยุดการทำงาน
    if (!userId) return alert('กรุณาล็อกอินก่อนทำสำเนา'); // 🌟 เช็ค User
    try {
      // 2. สร้างชุดสื่อ (Playlist) ใหม่ด้วยข้อมูลเดิม แต่ชื่อใหม่
      const payload = {
        name: newName,
        description: playlist.description,
        type: playlist.type,
        custom_banner: playlist.custom_banner,
        show_niivaa_badge: playlist.show_niivaa_badge,
        logo_url: playlist.logo_url,
        user_id: userId // 🌟 ประทับตราความเป็นเจ้าของให้อัลบั้มสำเนาด้วย
      };

      const { data: newPlaylist, error: pError } = await supabase
        .from('playlists')
        .insert([payload])
        .select()
        .single();

      if (pError) throw pError;

      // 3. ดึงรายการสื่อ/เพลง (Tracks) จากอัลบั้มต้นฉบับ
      const { data: oldTracks, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('playlist_id', playlist.id);

      if (fetchError) throw fetchError;

      // 4. ถ้ามีเพลงอยู่ ให้คัดลอกเพลงไปใส่อัลบั้มใหม่
      if (oldTracks && oldTracks.length > 0) {
        const newTracks = oldTracks.map(track => {
          // ลบ id และ created_at ของเดิมออก เพื่อให้ระบบสร้างใหม่
          const { id, created_at, ...restTrackData } = track;
          return {
            ...restTrackData,
            playlist_id: newPlaylist.id // ผูกกับ ID ของอัลบั้มใหม่
          };
        });

        const { error: insertError } = await supabase.from('tracks').insert(newTracks);
        if (insertError) throw insertError;
      }

      alert('ทำสำเนาชุดสื่อ และคัดลอกคิวเพลงเรียบร้อยแล้ว!');
      fetchPlaylists(); // รีเฟรชรายการใหม่
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการทำสำเนา: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#001122] text-white flex flex-col font-sans relative">

      {/* ========================================== */}
      {/* 🌟 คู่มือ Slide-over Drawer (Accordion) */}
      {/* ========================================== */}
      <div className={`fixed inset-0 z-[1000] transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-full max-w-md h-full bg-[#001122] border-l border-[#006666]/50 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] transform transition-transform duration-500 ease-in-out flex flex-col ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-[#006666]/50 flex justify-between items-center bg-[#003366]/20 shrink-0">
            <h2 className="text-xl font-black text-cyan-400 flex items-center gap-2"><BookOpen size={20} /> คู่มือสร้างชุดสื่อ</h2>
            <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-sm">

            {/* หมวดที่ 1: ภาพรวมการใช้งาน */}
            <details className="group bg-[#003366]/20 rounded-xl border border-[#006666]/30 overflow-hidden" open>
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-[#CCFFFF] hover:bg-[#003366]/40 transition-colors">
                <span className="flex items-center gap-2"><Library size={16} className="text-cyan-400" /> ภาพรวมของระบบ</span>
                <ChevronDown className="w-4 h-4 text-cyan-600 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-cyan-100/80 border-t border-[#006666]/30 bg-[#001122]/50 space-y-3 text-xs leading-relaxed">
                <div className="flex items-start gap-3 bg-[#006666]/10 p-3 rounded-lg border border-[#006666]/30">
                  <span className="text-xl bg-white/10 p-1.5 rounded-lg shadow-sm">📺</span>
                  <p>หน้านี้เป็นส่วนควบคุมหลักในการสร้าง <b>"ชุดสื่อ"</b> หรือ <b>"อัลบั้ม"</b> เพื่อใช้สำหรับจัดหมวดหมู่สื่อ และ เพลงต่างๆ ที่ดึงมาจาก <span className="text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded">YouTube</span> ให้เป็นระเบียบตามหมวดหมู่งาน</p>
                </div>
              </div>
            </details>

            {/* หมวดที่ 2: การสร้างและการตั้งค่า */}
            <details className="group bg-[#003366]/20 rounded-xl border border-[#006666]/30 overflow-hidden">
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-[#CCFFFF] hover:bg-[#003366]/40 transition-colors">
                <span className="flex items-center gap-2"><Plus size={16} className="text-emerald-400" /> การสร้างและการตั้งค่าอัลบั้ม</span>
                <ChevronDown className="w-4 h-4 text-cyan-600 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-cyan-100/80 border-t border-[#006666]/30 bg-[#001122]/50 space-y-3 text-xs leading-relaxed">
                <ul className="space-y-4">
                  <li className="flex items-start gap-2.5">
                    <Image size={16} className="text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-purple-300 block mb-1">การแสดงผลหน่วยงาน (Branding)</b>
                      กรณีเป็นหน่วยงาน สามารถอัปโหลด <b>รูปโลโก้</b> และเพิ่ม <b>ชื่อหน่วยงาน</b> ลงในช่องป้ายแสดงบนบอร์ด เพื่อให้ข้อมูลไปแสดงผลอย่างสวยงามบนจอเครื่องเล่นได้
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Pencil size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <b className="text-amber-300 block mb-1">คำอธิบายเพิ่มเติม</b>
                      เพิ่มข้อความช่วยจำลักษณะเด่นของอัลบั้ม เช่น "ใช้สำหรับงานสัมมนาเช้า" หรือ "รวมเพลงฮิตปี 2026"
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 bg-[#001122] p-3 rounded-xl border border-white/5 shadow-inner">
                    <div className="flex flex-col gap-2 w-full">
                      <b className="text-cyan-300">เลือกโหมดของอัลบั้ม:</b>
                      <div className="flex items-center gap-2 text-blue-300"><span className="bg-blue-900/40 p-1.5 rounded-lg border border-blue-500/30"><Headphones size={14} /></span> <b>สื่อ/ฟังเพลง:</b> โหมดสำหรับสื่อบทเรียน ความรู้ ข่าว ประชาสัมพันธ์ ฟังเพลง ต่างๆ</div>
                      <div className="flex items-center gap-2 text-teal-300"><span className="bg-teal-900/40 p-1.5 rounded-lg border border-teal-500/30"><Mic2 size={14} /></span> <b>คาราโอเกะ:</b> โหมดสำหรับร้องเพลงที่มีระบบเนื้อร้อง</div>
                    </div>
                  </li>
                  <li className="bg-gradient-to-r from-[#006666]/30 to-[#3333FF]/30 p-3 rounded-xl border border-cyan-500/40 text-center font-black text-cyan-200 shadow-md">
                    เมื่อเลือกโหมดเสร็จแล้ว ให้กดปุ่ม "สร้างอัลบั้ม"
                  </li>
                </ul>
              </div>
            </details>

            {/* หมวดที่ 3: การจัดการและการเล่นสื่อ */}
            <details className="group bg-[#003366]/20 rounded-xl border border-[#006666]/30 overflow-hidden">
              <summary className="flex justify-between items-center p-4 font-bold cursor-pointer outline-none text-[#CCFFFF] hover:bg-[#003366]/40 transition-colors">
                <span className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-pink-400" /> การจัดการ และ การเปิดจอเล่น</span>
                <ChevronDown className="w-4 h-4 text-cyan-600 group-open:-rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-0 text-cyan-100/80 border-t border-[#006666]/30 bg-[#001122]/50 space-y-3 text-xs leading-relaxed">
                <p className="mb-2 text-cyan-300/80">เมื่อสร้างอัลบั้มเสร็จแล้ว ข้อมูลจะมาปรากฏที่รายการทางด้านขวามือ:</p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 bg-[#001122] p-2.5 rounded-xl border border-[#006666]/20">
                    <span className="bg-gradient-to-tr from-[#006666] to-[#3333FF] text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-md shrink-0 border border-cyan-400/30"><ArrowRight size={16} /></span>
                    <span className="flex-1"><b>ปุ่มลูกศรสีฟ้า (ท้ายชื่ออัลบั้ม):</b><br /> กดเพื่อเข้าไปจัดคิวสื่อและ <b>เปิดจอเล่นสื่อ/เปิดเพลง</b></span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><Copy size={14} /></span>
                    <span><b>การทำสำเนา (Clone):</b> คลิกปุ่มไอคอนสำเนาสีเขียว เพื่อคัดลอกชุดสื่อและรายการเพลงทั้งหมดไปสร้างเป็นอัลบั้มใหม่ทันที</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><Pencil size={14} /></span>
                    <span><b>การแก้ไข:</b> คลิกปุ่มรูปปากกา เพื่อนำข้อมูลของอัลบั้มนั้นกลับมาแก้ไขในฟอร์ม</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-red-500/20 text-red-500 border border-red-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><Trash2 size={14} /></span>
                    <span><b>การลบ:</b> คลิกปุ่มรูปถังขยะสีแดง เพื่อลบชุดสื่อนั้นทิ้งออกจากระบบ</span>
                  </li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Background Neon Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#006666] blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3333FF] blur-[120px] opacity-20"></div>
      </div>

      {/* ========================================== */}
      {/* 🌟 Sticky Header ฉบับแบ่ง 2 แถว */}
      {/* ========================================== */}
      <header className="sticky top-0 z-50 bg-[#001122]/90 backdrop-blur-xl border-b border-[#006666]/30 px-6 py-4 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,17,34,0.8)]">

        {/* แถวที่ 1: โลโก้ และ ปุ่มลิงก์ (ปล่อยให้โลโก้มีพื้นที่อิสระ ไม่ถูกขังในกล่องดำ) */}
        <div className="flex items-center justify-between w-full border-b border-[#006666]/20 pb-4 sm:pb-3">
          {/* โลโก้ปรับให้กว้างและสูงแบบอิสระ drop-shadow สว่างขึ้น */}
          <div className="h-10 sm:h-12 flex items-center shrink-0">
            <img src="/SMK.png" alt="NiiVaa SMK" className="h-full w-auto object-contain drop-shadow-[0_0_12px_rgba(204,255,255,0.4)]" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* 🌟 [เพิ่มใหม่] ป้ายแสดง Email ผู้ใช้งานที่ล็อกอินอยู่ */}
            {userEmail && (
              <div className="hidden md:flex items-center gap-2 bg-[#003366]/40 border border-cyan-500/30 px-3 py-1.5 rounded-full shadow-inner">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                 <span className="text-xs font-bold text-cyan-300">{userEmail}</span>
              </div>
            )}
            <Link
              href="/smart-media-dashboard"
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
            >
              <LayoutDashboard size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">กลับศูนย์กลาง</span>
            </Link>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-cyan-900/30 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-500/40 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
            >
              <BookOpen size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">คู่มือ</span>
            </button>
          </div>
        </div>

        {/* แถวที่ 2: ไอคอนซีดีเรืองแสง + ชื่อหน้า */}
        <div className="flex items-center gap-3 w-full">
          <Disc className="w-8 h-8 md:w-10 md:h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-[spin_8s_linear_infinite]" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#CCFFFF] to-[#3333FF] drop-shadow-[0_0_10px_rgba(51,51,255,0.4)] leading-tight">
              สร้างชุดสื่อ ชุดเพลง ชุดซาวด์ดนตรีคาราโอเกะ
            </h1>
            <p className="text-[#006666] font-bold tracking-widest uppercase text-[9px] sm:text-[11px] mt-0.5">
              NiiVaa SmartMedia & Karaoke Control
            </p>
          </div>
        </div>

      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 relative z-10">

        {/* ========================================== */}
        {/* คอลัมน์ซ้าย: ฟอร์มจัดการชุดเพลง */}
        {/* ========================================== */}
        <div className="lg:col-span-4 xl:col-span-4 order-2 lg:order-1">
          <section className="bg-[#003366]/20 backdrop-blur-xl p-6 rounded-[2rem] border border-[#006666]/30 shadow-2xl sticky top-44">
            <div className="flex items-center gap-3 mb-6">
              {editingId ? (
                <Pencil className="text-yellow-400 w-6 h-6 p-1 bg-yellow-500/20 rounded-lg" />
              ) : (
                <Plus className="text-[#CCFFFF] w-6 h-6 p-1 bg-[#006666]/40 rounded-lg" />
              )}
              <h3 className="text-lg font-black text-[#CCFFFF]">
                {editingId ? 'แก้ไขชุดสื่อ' : 'สร้างชุดสื่อใหม่'}
              </h3>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">

              <input
                type="text" placeholder="ชื่อชุดเพลง / อัลบั้ม..." value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#001122]/50 border border-[#006666]/40 p-3.5 rounded-xl focus:border-[#3333FF] outline-none transition-all placeholder:text-gray-600 font-bold text-sm"
              />

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1">
                  ชื่อป้ายแสดงบนบอร์ด (Custom Banner)
                </label>
                <input
                  type="text"
                  placeholder="เช่น NiiVaa Academy..."
                  value={customBanner}
                  onChange={(e) => setCustomBanner(e.target.value)}
                  className="w-full bg-[#001122]/50 border border-[#006666]/40 p-3 rounded-xl focus:border-cyan-400 outline-none transition-all placeholder:text-gray-600 text-xs font-bold text-cyan-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1">
                  รูปภาพโลโก้หน่วยงาน (Logo)
                </label>
                <div className="relative flex items-center justify-between p-3 bg-[#001122]/50 border border-[#006666]/40 rounded-xl hover:border-cyan-400/50 transition-all">
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <Image size={14} className="text-cyan-400 shrink-0" />
                    <span className="text-[10px] text-gray-400 truncate font-medium">
                      {logoFile ? logoFile.name : logoUrl ? 'มีรูปโลโก้เดิมอยู่' : 'ไม่ได้เลือกรูป'}
                    </span>
                  </div>
                  <label className="shrink-0 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors">
                    เลือกรูป
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0])
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#001122]/40 border border-[#006666]/30 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white">แสดงป้ายสถาบัน (NiiVaa)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNiivaaBadge(!showNiivaaBadge)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border transition-all active:scale-95 ${showNiivaaBadge
                    ? 'bg-[#006666] text-white border-[#CCFFFF] shadow-[0_0_10px_rgba(0,102,102,0.6)]'
                    : 'bg-transparent border-[#006666]/30 text-gray-600'
                    }`}
                >
                  {showNiivaaBadge ? 'ON' : 'OFF'}
                </button>
              </div>

              <textarea
                placeholder="คำอธิบายอัลบั้ม..." value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#001122]/50 border border-[#006666]/40 p-3.5 rounded-xl focus:border-[#3333FF] h-20 outline-none transition-all placeholder:text-gray-600 text-xs resize-none custom-scrollbar"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button" onClick={() => setType('music')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${type === 'music' ? 'bg-[#3333FF] border-[#CCFFFF] shadow-[0_0_10px_#3333FF]' : 'bg-transparent border-[#006666]/30 text-gray-500'}`}
                >
                  <Headphones size={14} /> <span className="text-[10px] font-bold">สื่อ/เพลงฟัง</span>
                </button>
                <button
                  type="button" onClick={() => setType('karaoke')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${type === 'karaoke' ? 'bg-[#006666] border-[#CCFFFF] shadow-[0_0_10px_#006666]' : 'bg-transparent border-[#006666]/30 text-gray-500'}`}
                >
                  <Mic2 size={14} /> <span className="text-[10px] font-bold">คาราโอเกะ</span>
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit" disabled={isSaving}
                  className={`flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 ${editingId
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                    : 'bg-gradient-to-r from-[#006666] to-[#3333FF] hover:shadow-[0_0_20px_rgba(51,51,255,0.4)]'
                    }`}
                >
                  {isSaving ? 'SAVING...' : editingId ? 'บันทึกแก้ไข' : 'สร้างอัลบั้ม'}
                </button>

                {editingId && (
                  <button
                    type="button" onClick={handleCancelEdit}
                    className="px-4 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 rounded-xl font-bold transition-all text-[10px] text-gray-400 uppercase tracking-widest"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>

        {/* ========================================== */}
        {/* คอลัมน์ขวา: รายการอัลบั้ม (Shorter Row Layout) */}
        {/* ========================================== */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col order-1 lg:order-2 h-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 shrink-0">
              <Music className="w-6 h-6 text-[#3333FF]" />
              <h3 className="text-xl font-black text-[#CCFFFF]">อัลบั้มในคลัง <span className="text-cyan-400 text-sm ml-1">({filteredPlaylists.length})</span></h3>
            </div>

            {/* 🌟 กล่องค้นหาที่ยาวขึ้น & Dropdown Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-80 md:w-96"> {/* 👈 ขยายความยาวกล่องค้นหา */}
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#006666]" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่ออัลบั้ม หรือ รายละเอียด..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#003366]/20 border border-[#006666]/50 rounded-xl py-2 pl-9 pr-3 text-xs focus:outline-none focus:border-[#CCFFFF] transition-colors placeholder:text-[#006666]"
                />
              </div>

              <div className="relative w-full sm:w-auto shrink-0">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-[#003366]/30 border border-[#006666]/50 rounded-xl py-2 pl-3 pr-8 text-xs text-cyan-100 font-bold focus:outline-none focus:border-[#CCFFFF] transition-colors cursor-pointer"
                >
                  <option value="all" className="bg-[#001122]">ทั้งหมด (All)</option>
                  <option value="music" className="bg-[#001122]">สื่อและเพลงฟัง</option>
                  <option value="karaoke" className="bg-[#001122]">คาราโอเกะ</option>
                </select>
                <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-500 pointer-events-none" />
              </div>
              {/* 3. 🌟 [เพิ่มใหม่] กล่อง Sorting (การจัดเรียง) */}
              <div className="relative w-full sm:w-auto shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-[#3333FF]/10 border border-[#3333FF]/40 rounded-xl py-2 pl-3 pr-8 text-xs text-blue-200 font-bold focus:outline-none focus:border-[#CCFFFF] transition-colors cursor-pointer"
                >
                  <option value="newest" className="bg-[#001122]">🕒 สร้างล่าสุด</option>
                  <option value="oldest" className="bg-[#001122]">⏳ เก่าสุด</option>
                  <option value="name-asc" className="bg-[#001122]">🔤 ชื่อ (ก-ฮ)</option>
                  <option value="name-desc" className="bg-[#001122]">🔠 ชื่อ (ฮ-ก)</option>
                  <option value="tracks-desc" className="bg-[#001122]">🎵 จำนวนเพลงมากสุด</option>
                </select>
                <ArrowUpDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 🌟 โครงสร้าง List แบบแถวที่เตี้ยลง 20% */}
          <div className="bg-[#001122]/30 border border-[#006666]/20 rounded-[2rem] p-4 w-full min-h-[500px] lg:h-[600px] overflow-hidden flex flex-col shrink-0">
            <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar pr-2">
              <div className="flex flex-col gap-2.5 pb-10">
                {filteredPlaylists.map((item) => (
                  // 🌟 ลด Padding เหลือ p-3 (หรือ px-4 py-2.5) เพื่อให้เตี้ยลง
                  <div key={item.id} className="group flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-2.5 bg-[#003366]/10 hover:bg-[#003366]/30 rounded-2xl border border-[#006666]/20 hover:border-[#3333FF]/50 transition-all duration-300 relative shadow-md">

                    {/* ไอคอนเรืองแสงขนาดเล็กลง (w-8 h-8) */}
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(0,102,102,0.4)] ${item.type === 'karaoke' ? 'bg-[#002222] border-[#006666]/50' : 'bg-[#001133] border-[#3333FF]/30'}`}>
                      {item.type === 'karaoke' ? (
                        <Mic2 size={14} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                      ) : (
                        <Headphones size={14} className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                      )}
                    </div>

                    {/* ข้อมูลชื่อและคำอธิบาย */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#CCFFFF] transition-colors truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {item.description || 'ไม่มีข้อมูลคำอธิบาย'}
                      </p>
                    </div>

                    {/* แถบเครื่องมือและปุ่มลิงก์ด้านขวา */}
                    <div className="flex items-center justify-end gap-2 w-full sm:w-auto border-t border-[#006666]/20 sm:border-none pt-2 sm:pt-0 shrink-0">
                      {/* 🌟 ปุ่มโคลน (เพิ่มใหม่) */}
                      <button
                        type="button" onClick={() => handleClonePlaylist(item)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 transition-colors"
                        title="ทำสำเนา (Clone)"
                      >
                        <Copy size={12} />
                      </button>
                      {/* ปุ่มลบ/แก้ไข (ซ่อนบนจอคอมถ้าไม่ Hover) */}
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          type="button" onClick={() => handleEditClick(item)}
                          className="p-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button" onClick={() => handleDeletePlaylist(item.id, item.name)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* ปุ่ม DJ และ Music Count จัดให้กระชับขึ้น */}
                      <button
                        type="button"
                        onClick={() => router.push(`/dj/${item.id}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-900/20 border border-purple-500/30 hover:bg-purple-800/40 text-purple-300 transition-all font-bold text-[9px] uppercase tracking-widest flex items-center gap-1"
                      >
                        <SlidersHorizontal size={10} /> DJ
                      </button>

                      <div className="flex items-center gap-1.5 bg-[#001122] px-2 py-1.5 rounded-lg border border-[#006666]/40 shrink-0 min-w-[3rem] justify-center">
                        <Music size={10} className="text-cyan-600" />
                        <span className="text-[9px] font-bold text-cyan-400">{item.song_count || 0}</span>
                      </div>

                      {/* ปุ่มลูกศรเข้าหน้าเล่นเพลง */}
                      <Link href={`/playlist/${item.id}?type=${item.type || 'music'}`}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-tr from-[#006666] to-[#3333FF] hover:opacity-80 transition-all text-white shadow-lg shrink-0">
                          <ArrowRight size={12} />
                        </button>
                      </Link>
                    </div>

                  </div>
                ))}

                {filteredPlaylists.length === 0 && (
                  <div className="py-20 text-center text-[#006666] font-bold text-xs">
                    ไม่พบอัลบั้มที่ค้นหา หรือตรงกับตัวกรอง
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}