'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowUpDown, Copy, Disc, Mic2, Headphones, Plus, Music, ArrowRight,
  Pencil, Trash2, Image, Library, Search, LayoutDashboard, SlidersHorizontal,
  BookOpen, X, ChevronDown, Filter, HelpCircle, AlertCircle, CheckCircle, ArrowDown, Edit3
} from 'lucide-react'

export default function CreatePlaylistPage() {
  const [playlists, setPlaylists] = useState<any[]>([])
  const [hasFetchedInitially, setHasFetchedInitially] = useState(false) // เช็คโหลดครั้งแรก

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
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
  
  const [userEmail, setUserEmail] = useState<string>('');

  // 🌟 1. States สำหรับจัดการ Pop-up UI/UX
  const [showEmptyPopup, setShowEmptyPopup] = useState(false)
  const [successPopupName, setSuccessPopupName] = useState<string | null>(null)
  const [editPopupData, setEditPopupData] = useState<any | null>(null)

  const fetchPlaylists = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         router.push('/smart-media-dashboard');
         return;
      }
      setUserId(user.id);
      setUserEmail(user.email || 'ไม่พบอีเมล');

      const { data, error } = await supabase
        .from('playlists')
        .select('*, tracks(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        const formattedPlaylists = data.map(p => ({
          ...p,
          song_count: p.tracks?.[0]?.count || 0
        }));
        setPlaylists(formattedPlaylists)
        
        // 🌟 เช็คกรณีโหลดครั้งแรกแล้วพบว่ายังไม่มีเพลย์ลิสต์เลย ให้แสดง Pop-up
        if (formattedPlaylists.length === 0 && !hasFetchedInitially) {
          setShowEmptyPopup(true)
        }
        setHasFetchedInitially(true)
      }
    } catch (err: any) { console.error("Error:", err.message) }
  }

  useEffect(() => { fetchPlaylists() }, [])

  const filteredPlaylists = useMemo(() => {
    let result = playlists.filter(playlist => {
      const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (playlist.description && playlist.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || playlist.type === filterType;
      return matchesSearch && matchesType;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'th');
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'th');
      if (sortBy === 'tracks-desc') return (b.song_count || 0) - (a.song_count || 0);
      return 0;
    });

    return result;
  }, [playlists, searchQuery, filterType, sortBy]);

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
    if (!userId) return alert('กรุณาล็อกอินก่อนสร้างชุดสื่อ');
    setIsSaving(true)

    try {
      let finalLogoUrl = logoUrl
      if (logoFile) finalLogoUrl = await uploadLogoProcess(logoFile)

      const payload = {
        name, description, type,
        custom_banner: customBanner,
        show_niivaa_badge: showNiivaaBadge,
        logo_url: finalLogoUrl,
        user_id: userId
      }

      if (editingId) {
        await supabase.from('playlists').update(payload).eq('id', editingId)
        alert('บันทึกการแก้ไขสำเร็จ')
      } else {
        await supabase.from('playlists').insert([payload])
        // 🌟 เมื่อสร้างใหม่สำเร็จ ให้เรียกแสดง Pop-up สีขาว
        setSuccessPopupName(name)
      }
      handleCancelEdit()
      fetchPlaylists()
    } catch (err: any) { alert('Error: ' + err.message) }
    finally { setIsSaving(false) }
  }

  // 🌟 2. เมื่อกดปุ่มแก้ไข ให้แสดง Pop-up ถามก่อนแทนการดึงฟอร์มทันที
  const handleEditClick = (item: any) => {
    setEditPopupData(item)
  }

  // 🌟 3. เมื่อกดยืนยันใน Pop-up แก้ไข ค่อยนำข้อมูลลงฟอร์มและเลื่อนจอไปหาฟอร์ม
  const confirmEdit = () => {
    if (!editPopupData) return;
    setEditingId(editPopupData.id)
    setName(editPopupData.name)
    setDescription(editPopupData.description || '')
    setType(editPopupData.type || 'music')
    setCustomBanner(editPopupData.custom_banner || '')
    setShowNiivaaBadge(editPopupData.show_niivaa_badge ?? true)
    setLogoUrl(editPopupData.logo_url || '')
    setLogoFile(null)
    setEditPopupData(null)
    
    // เลื่อนจอไปที่ฟอร์ม (ID: playlist-form) อย่างนุ่มนวล
    setTimeout(() => {
      document.getElementById('playlist-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

  const handleClonePlaylist = async (playlist: any) => {
    const newName = window.prompt(`ตั้งชื่อชุดสื่อใหม่ (สำเนาจาก: ${playlist.name})`, `${playlist.name} (Copy)`);
    if (!newName) return; 
    if (!userId) return alert('กรุณาล็อกอินก่อนทำสำเนา'); 
    try {
      const payload = {
        name: newName,
        description: playlist.description,
        type: playlist.type,
        custom_banner: playlist.custom_banner,
        show_niivaa_badge: playlist.show_niivaa_badge,
        logo_url: playlist.logo_url,
        user_id: userId 
      };

      const { data: newPlaylist, error: pError } = await supabase
        .from('playlists')
        .insert([payload])
        .select()
        .single();

      if (pError) throw pError;

      const { data: oldTracks, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('playlist_id', playlist.id);

      if (fetchError) throw fetchError;

      if (oldTracks && oldTracks.length > 0) {
        const newTracks = oldTracks.map(track => {
          const { id, created_at, ...restTrackData } = track;
          return {
            ...restTrackData,
            playlist_id: newPlaylist.id
          };
        });

        const { error: insertError } = await supabase.from('tracks').insert(newTracks);
        if (insertError) throw insertError;
      }

      alert('ทำสำเนาชุดสื่อ และคัดลอกคิวเพลงเรียบร้อยแล้ว!');
      fetchPlaylists(); 
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการทำสำเนา: ' + err.message);
    }
  };

  // เลื่อนจอลงไปที่ฟอร์มตอนกดตกลง Popup อันแรก
  const scrollToForm = () => {
    setShowEmptyPopup(false);
    setTimeout(() => {
      document.getElementById('playlist-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  return (
    <div className="min-h-screen bg-[#001122] text-white flex flex-col font-sans relative">

      {/* ========================================== */}
      {/* 🌟 1. Pop-up กรณีที่ยังไม่มี Playlist เลย (Empty State) */}
      {/* ========================================== */}
      {showEmptyPopup && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black p-8 rounded-[2rem] max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl border-4 border-cyan-400">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-blue-100">
              <AlertCircle size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">คุณยังไม่มีอัลบัมเลย</h3>
              <p className="text-sm font-bold text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl">
                แตะปุ่มตกลง แล้ว <span className="text-blue-600 font-black flex items-center justify-center gap-1 inline-flex mx-1"><ArrowDown size={14}/> เลื่อนลงไปด้านล่างสุด</span> <br/>เพื่อเริ่มสร้างอัลบัมใหม่ของคุณครับ
              </p>
            </div>
            <button onClick={scrollToForm} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              <CheckCircle size={20} /> ตกลง / รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🌟 2. Pop-up แจ้งเตือนเมื่อสร้าง Playlist สำเร็จ */}
      {/* ========================================== */}
      {successPopupName && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black p-8 rounded-[2rem] max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl border-4 border-emerald-400">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <CheckCircle size={44} />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">สร้างอัลบัมสำเร็จ!</h3>
              <p className="text-[13px] font-bold text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 text-left">
                สร้างอัลบัม <span className="text-emerald-600 font-black text-base">"{successPopupName}"</span> เรียบร้อยแล้ว <br/><br/>
                <span className="flex items-start gap-2">
                  <span className="bg-blue-100 text-blue-600 p-1 rounded-md shrink-0"><ArrowRight size={16}/></span>
                  <span>เลื่อนขึ้นบนเล็กน้อย แล้วแตะ <b>ปุ่มลูกศรสีฟ้า</b> ด้านขวาของชื่ออัลบัม เพื่อไปค้นหาและเพิ่มสื่อ/เพลงเข้าอัลบัมนั้นได้เลยครับ</span>
                </span>
              </p>
            </div>
            <button onClick={() => {
              setSuccessPopupName(null);
              window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนขึ้นไปดูรายการที่สร้างเสร็จ
            }} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
              ตกลง / เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🌟 3. Pop-up ยืนยันการแก้ไขและพาดึงฟอร์มมาให้ */}
      {/* ========================================== */}
      {editPopupData && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-black p-8 rounded-[2rem] max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-300 shadow-2xl border-4 border-amber-400">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-100">
              <Edit3 size={40} />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">ต้องการแก้ไขชุดสื่อ?</h3>
              <p className="text-sm font-bold text-gray-600 leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                คุณต้องการแก้ไขอัลบัม <span className="text-amber-600 font-black text-base block mt-1">"{editPopupData.name}"</span> ใช่หรือไม่?<br/><br/>
                แตะ <b className="text-amber-600">ตกลง</b> เพื่อให้ระบบพาเลื่อนหน้าจอไปยังฟอร์มแก้ไข และพิมพ์แก้ไขข้อมูลได้เลยครับ
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditPopupData(null)} className="flex-1 bg-gray-100 text-gray-600 font-black py-4 rounded-2xl hover:bg-gray-200 transition-colors">
                ยกเลิก
              </button>
              <button onClick={confirmEdit} className="flex-1 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
                <CheckCircle size={18}/> ตกลง
              </button>
            </div>
          </div>
        </div>
      )}


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
                      กรณีเป็นหน่วยงาน สามารถอัปโหลด <b>รูปโลโก้</b> และเพิ่ม <b>ชื่อหน่วยงาน</b> ลงในช่องป้ายแสดงบนบอร์ด เพื่อให้ข้อมูลไปแสดงผลอย่างสวยงามบนจอเครื่องเล่นได้ <br/><span className="text-gray-400 italic">*ส่วนนี้ไม่ระบุให้ข้ามได้</span>
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
                    เมื่อกรอกข้อมูลเสร็จแล้ว ให้กดปุ่ม "สร้างอัลบั้ม"
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
                  {/* 🌟 3. เพิ่มคำอธิบายปุ่ม DJ ตามที่ผู้ใช้รีเควส */}
                  <li className="flex items-start gap-3 bg-purple-900/10 p-2.5 rounded-xl border border-purple-500/20">
                    <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><SlidersHorizontal size={14} /></span>
                    <span className="flex-1">
                      <b className="text-purple-300">ปุ่ม DJ (จัดการคิว):</b><br/> 
                      เปิดหน้าวาง URL YouTube เพิ่มสื่อเข้าคิว จัดลำดับคิว ตั้งค่าข้ามการเล่นข้ามส่วนต้นคลิป กลางคลิป ท้ายคลิปตามต้องการ ระบุชื่อเฉพาะ ระบุผู้จองคิวร้องเพลง
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-gradient-to-tr from-[#006666] to-[#3333FF] text-white w-8 h-8 flex items-center justify-center rounded-lg shadow-md shrink-0 border border-cyan-400/30"><ArrowRight size={16} /></span>
                    <span className="flex-1"><b>ปุ่มลูกศรสีฟ้า (ท้ายชื่ออัลบั้ม):</b><br /> กดเพื่อ <b>เปิดจอเล่นสื่อ/เปิดเพลง</b> ในอัลบั้มนั้นๆ</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><Copy size={14} /></span>
                    <span><b>การทำสำเนา (Clone):</b> คลิกเพื่อคัดลอกชุดสื่อและรายการเพลงทั้งหมดไปสร้างเป็นอัลบั้มใหม่</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><Pencil size={14} /></span>
                    <span><b>การแก้ไข:</b> คลิกเพื่อนำข้อมูลของอัลบั้มนั้นกลับมาแก้ไขในฟอร์ม</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="bg-red-500/20 text-red-500 border border-red-500/30 w-8 h-8 flex items-center justify-center rounded-lg shrink-0 shadow-sm"><Trash2 size={14} /></span>
                    <span><b>การลบ:</b> คลิกลบชุดสื่อนั้นทิ้งออกจากระบบ (ข้อมูลเพลงในคิวจะหายไปด้วย)</span>
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
      {/* 🌟 Sticky Header */}
      {/* ========================================== */}
      <header className="sticky top-0 z-50 bg-[#001122]/90 backdrop-blur-xl border-b border-[#006666]/30 px-6 py-4 flex flex-col gap-4 shadow-[0_10px_30px_rgba(0,17,34,0.8)]">

        <div className="flex items-center justify-between w-full border-b border-[#006666]/20 pb-4 sm:pb-3">
          <div className="h-10 sm:h-12 flex items-center shrink-0">
            <img src="/SMK.png" alt="NiiVaa SMK" className="h-full w-auto object-contain drop-shadow-[0_0_12px_rgba(204,255,255,0.4)]" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
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
          </div>
          <button
              onClick={() => setIsGuideOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-cyan-900/30 hover:bg-cyan-800/60 text-cyan-300 border border-cyan-500/40 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
            >
              <BookOpen size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">คู่มือ</span>
            </button>
        </div>

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
          {/* 🌟 เพิ่ม ID ให้ฟอร์มเพื่อให้ระบบ Auto-scroll พุ่งมาหาได้ถูกต้อง */}
          <section id="playlist-form" className="bg-[#003366]/20 backdrop-blur-xl p-6 rounded-[2rem] border border-[#006666]/30 shadow-2xl sticky top-44 scroll-mt-48">
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {editingId ? (
                  <Pencil className="text-yellow-400 w-6 h-6 p-1 bg-yellow-500/20 rounded-lg animate-pulse" />
                ) : (
                  <Plus className="text-[#CCFFFF] w-6 h-6 p-1 bg-[#006666]/40 rounded-lg" />
                )}
                <h3 className="text-lg font-black text-[#CCFFFF]">
                  {editingId ? 'แก้ไขชุดสื่อ' : 'สร้างชุดสื่อใหม่'}
                </h3>
              </div>
              <button 
                onClick={() => setIsGuideOpen(true)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/40 px-2.5 py-1.5 rounded-lg transition-all"
              >
                <HelpCircle size={14} /> คู่มือ
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">

              {/* ส่วนบังคับกรอก */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-1">
                  ชื่อชุดสื่อ / อัลบั้ม <span className="text-red-400">*</span>
                </label>
                <input
                  type="text" placeholder="ระบุชื่อชุดเพลง..." value={name}
                  onChange={(e) => setName(e.target.value)} required
                  className={`w-full border p-3.5 rounded-xl outline-none transition-all placeholder:text-gray-600 font-bold text-sm ${editingId ? 'bg-[#001122] border-yellow-500 focus:border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-[#001122]/80 border-[#006666] focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]'}`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider px-1">
                  เลือกโหมดการเล่น <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button" onClick={() => setType('music')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${type === 'music' ? 'bg-[#3333FF] border-[#CCFFFF] shadow-[0_0_10px_#3333FF]' : 'bg-[#001122]/50 border-[#006666]/50 text-gray-400 hover:border-cyan-500/50'}`}
                  >
                    <Headphones size={14} /> <span className="text-[10px] font-bold">สื่อ/เพลงฟัง</span>
                  </button>
                  <button
                    type="button" onClick={() => setType('karaoke')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border transition-all ${type === 'karaoke' ? 'bg-[#006666] border-[#CCFFFF] shadow-[0_0_10px_#006666]' : 'bg-[#001122]/50 border-[#006666]/50 text-gray-400 hover:border-cyan-500/50'}`}
                  >
                    <Mic2 size={14} /> <span className="text-[10px] font-bold">คาราโอเกะ</span>
                  </button>
                </div>
              </div>

              <div className="relative mt-6 bg-[#001122]/40 border border-white/5 rounded-2xl p-4 pt-5 space-y-4">
                <div className="absolute -top-2.5 left-4 bg-[#001122] px-3 border border-white/10 rounded-full">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    ส่วนตกแต่งเพิ่มเติม (หากไม่ต้องการระบุ "ให้ข้ามได้")
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1 flex justify-between">
                    <span>ชื่อป้ายแสดงบนบอร์ด (Banner)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น NiiVaa Academy..."
                    value={customBanner}
                    onChange={(e) => setCustomBanner(e.target.value)}
                    className="w-full bg-black/40 border border-[#006666]/40 p-3 rounded-xl focus:border-cyan-400/70 outline-none transition-all placeholder:text-gray-700 text-xs font-bold text-cyan-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1">
                    รูปภาพโลโก้หน่วยงาน (Logo)
                  </label>
                  <div className="relative flex items-center justify-between p-2 bg-black/40 border border-[#006666]/40 rounded-xl hover:border-cyan-400/50 transition-all">
                    <div className="flex items-center gap-2 overflow-hidden px-2">
                      <Image size={14} className="text-cyan-600 shrink-0" />
                      <span className="text-[10px] text-gray-500 truncate font-medium">
                        {logoFile ? logoFile.name : logoUrl ? 'มีรูปโลโก้เดิมอยู่' : 'ไม่ได้เลือกรูป (ข้ามได้)'}
                      </span>
                    </div>
                    <label className="shrink-0 bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors">
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

                <div className="flex items-center justify-between p-3 bg-black/40 border border-[#006666]/30 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400">แสดงป้ายสถาบัน (NiiVaa) เล็กๆ ใต้โลโก้</span>
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1">
                    คำอธิบายชุดสื่อ (Description)
                  </label>
                  <textarea
                    placeholder="พิมพ์ข้อความช่วยจำลักษณะเด่นของอัลบั้ม (ข้ามได้)" value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-black/40 border border-[#006666]/40 p-3.5 rounded-xl focus:border-cyan-400/70 h-16 outline-none transition-all placeholder:text-gray-700 text-xs resize-none custom-scrollbar"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit" disabled={isSaving}
                  className={`flex-1 py-3.5 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 ${editingId
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] border border-yellow-400'
                    : 'bg-gradient-to-r from-[#006666] to-[#3333FF] hover:shadow-[0_0_20px_rgba(51,51,255,0.4)]'
                    }`}
                >
                  {isSaving ? 'SAVING...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างอัลบั้ม'}
                </button>

                {editingId && (
                  <button
                    type="button" onClick={handleCancelEdit}
                    className="px-5 bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 rounded-xl font-bold transition-all text-[10px] text-gray-400 uppercase tracking-widest"
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

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-80 md:w-96">
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

          <div className="bg-[#001122]/30 border border-[#006666]/20 rounded-[2rem] p-4 w-full min-h-[500px] lg:h-[600px] overflow-hidden flex flex-col shrink-0">
            <div className="overflow-y-auto overflow-x-hidden flex-1 custom-scrollbar pr-2">
              <div className="flex flex-col gap-2.5 pb-10">
                {filteredPlaylists.map((item) => (
                  <div key={item.id} className={`group flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 relative shadow-md ${editingId === item.id ? 'bg-amber-900/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#003366]/10 hover:bg-[#003366]/30 border-[#006666]/20 hover:border-[#3333FF]/50'}`}>

                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(0,102,102,0.4)] ${item.type === 'karaoke' ? 'bg-[#002222] border-[#006666]/50' : 'bg-[#001133] border-[#3333FF]/30'}`}>
                      {item.type === 'karaoke' ? (
                        <Mic2 size={14} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                      ) : (
                        <Headphones size={14} className="text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#CCFFFF] transition-colors truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {item.description || <span className="italic opacity-50">ไม่มีข้อมูลคำอธิบาย</span>}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 w-full sm:w-auto border-t border-[#006666]/20 sm:border-none pt-3 sm:pt-0 shrink-0">
                      <button
                        type="button" onClick={() => handleClonePlaylist(item)}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-500 hover:text-emerald-400 transition-colors"
                        title="ทำสำเนา (Clone)"
                      >
                        <Copy size={12} />
                      </button>
                      <div className="flex items-center gap-1 mr-1">
                        <button
                          type="button" onClick={() => handleEditClick(item)} // 🌟 เรียกเปิด Pop-up ยืนยันแก้ไข
                          className={`p-1.5 rounded-lg border transition-colors ${editingId === item.id ? 'bg-amber-500 text-white border-amber-400' : 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 text-yellow-400'}`}
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

                      <Link href={`/playlist/${item.id}?type=${item.type || 'music'}`}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-tr from-[#006666] to-[#3333FF] hover:opacity-80 transition-all text-white shadow-lg shrink-0" title="เปิดหน้าจอเล่นเพลง">
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