'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Disc, Mic2, Headphones, Plus, Music, ArrowRight, Settings, Pencil, Trash2, Image, Library } from 'lucide-react'

export default function CreatePlaylistPage() {
  const [playlists, setPlaylists] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('music')
  const [isSaving, setIsSaving] = useState(false)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  // 🏛️ White-Label Branding States (คงไว้ตามเดิม)
  const [customBanner, setCustomBanner] = useState('')
  const [showNiivaaBadge, setShowNiivaaBadge] = useState(true)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState('')

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*, tracks(count)') 
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
    setIsSaving(true)
    
    try {
      let finalLogoUrl = logoUrl
      if (logoFile) finalLogoUrl = await uploadLogoProcess(logoFile)

      const payload = { 
        name, description, type, 
        custom_banner: customBanner, 
        show_niivaa_badge: showNiivaaBadge, 
        logo_url: finalLogoUrl 
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
  }

  const handleCancelEdit = () => {
    setEditingId(null); setName(''); setDescription(''); setType('music');
    setCustomBanner(''); setShowNiivaaBadge(true); setLogoFile(null); setLogoUrl('');
  }

  const handleDeletePlaylist = async (id: string, playlistName: string) => {
    if (!window.confirm(`ลบ "${playlistName}" ใช่หรือไม่?`)) return
    await supabase.from('playlists').delete().eq('id', id)
    fetchPlaylists()
  }

  return (
    <div className="min-h-screen bg-[#001122] text-white p-12">
        {/* ตรงนี้คงโค้ดส่วน Header และ UI เดิมที่พี่ชอบไว้ครบถ้วน */}
        {/* พี่สามารถนำส่วน Form และ List เดิมมาวางต่อได้เลยครับ */}
        {/* ผมปรับปรุงฟังก์ชันหลักให้รองรับ Database Schema เดิมที่พี่มีอยู่ครับ */}
        
        {/* (โค้ดส่วนเหลือของหน้า ให้ใช้โครงสร้าง UI เดิมที่พี่ส่งมาได้เลยครับ เพื่อให้หน้าตาเหมือนเดิมเป๊ะ) */}

         {/* Background Neon Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#006666] blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3333FF] blur-[120px] opacity-20"></div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12">
        {/* Header */}
        {/* 🎬 Header ฉบับโมเดิร์น (กล่องซีดีวางในชั้น เรืองแสงนีออนล้ำสมัย) */}
        <header className="flex items-center justify-between mb-12 border-b border-[#006666]/30 pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#CCFFFF] to-[#3333FF] drop-shadow-[0_0_10px_rgba(51,51,255,0.5)]">
              NiiVaaApp
            </h1>
            <p className="text-[#006666] font-medium mt-2 tracking-widest uppercase text-[10px]">Digital Media Command Center</p>
          </div>
          
          {/* 🌟 กล่องบรรจุไอคอนยุคใหม่ (มีกรอบโปร่งแสง + เรืองแสงจังหวะลมหายใจ Pulse + ออร่าเบ่งออกเมื่อเมาส์ชี้) */}
          <div className="relative group cursor-pointer p-3.5 bg-[#003366]/10 rounded-2xl border border-[#006666]/20 transition-all duration-300 hover:border-[#CCFFFF]/40 hover:bg-[#003366]/30 shadow-xl hover:shadow-[0_0_25px_rgba(204,255,255,0.25)]">
            <Library className="w-8 h-8 text-[#CCFFFF] animate-pulse transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_10px_rgba(204,255,255,0.6)]" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* คอลัมน์ซ้าย: ฟอร์มจัดการชุดเพลง */}
          <div className="lg:col-span-5">
            <section className="bg-[#003366]/20 backdrop-blur-xl p-8 rounded-[2.5rem] border border-[#006666]/30 shadow-2xl sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                {editingId ? (
                  <Pencil className="text-yellow-400 w-6 h-6 p-1 bg-yellow-500/20 rounded-lg" />
                ) : (
                  <Plus className="text-[#CCFFFF] w-6 h-6 p-1 bg-[#006666]/40 rounded-lg" />
                )}
                <h3 className="text-xl font-bold text-[#CCFFFF]">
                  {editingId ? 'แก้ไขชุดเพลงพรีเมียม' : 'สร้างชุดเพลงใหม่'}
                </h3>
              </div>

              <form onSubmit={handleCreatePlaylist} className="space-y-5">
                {/* 1. ช่องกรอกชื่อชุดเพลงหลัก */}
                <input
                  type="text" placeholder="ชื่อชุดเพลง..." value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#001122]/50 border border-[#006666]/40 p-4 rounded-2xl focus:border-[#3333FF] outline-none transition-all placeholder:text-gray-600 font-medium"
                />
                
                {/* 2. ช่องกรอกชื่อป้ายบอร์ด */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1">
                    ชื่อป้ายแสดงบนบอร์ดเล่นเพลง (Custom Banner)
                  </label>
                  <input
                    type="text" 
                    placeholder="เช่น NiiVaa Academy, บทเรียนของฉัน..." 
                    value={customBanner}
                    onChange={(e) => setCustomBanner(e.target.value)}
                    className="w-full bg-[#001122]/50 border border-[#006666]/40 p-4 rounded-2xl focus:border-cyan-400 outline-none transition-all placeholder:text-gray-600 text-sm font-medium text-cyan-300"
                  />
                </div>

                {/* 3. 🎯 [เพิ่มใหม่]: ช่องอัปโหลดไฟล์รูปภาพโลโก้หน่วยงาน */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-wider px-1">
                    รูปภาพโลโก้หน่วยงาน (Organization Logo)
                  </label>
                  <div className="relative flex items-center justify-between p-4 bg-[#001122]/50 border border-[#006666]/40 rounded-2xl hover:border-cyan-400/50 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden pr-2">
                      <Image size={18} className="text-cyan-400 shrink-0" />
                      <span className="text-xs text-gray-400 truncate font-medium">
                        {logoFile ? logoFile.name : logoUrl ? 'มีรูปโลโก้เดิมอยู่แล้ว' : 'ยังไม่ได้เลือกรูปภาพ (ใช้ค่าเริ่มต้น)'}
                      </span>
                    </div>
                    <label className="shrink-0 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors">
                      เลือกรูป
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0])
                        }} 
                      />
                    </label>
                  </div>
                </div>

                {/* 4. สวิตช์ปุ่มเปิด-ปิด */}
                <div className="flex items-center justify-between p-4 bg-[#001122]/40 border border-[#006666]/30 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">แสดงป้ายสัญลักษณ์สถาบัน</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">เปิด/ปิด โลโก้ NiiVaa Academy ตัวเล็ก</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNiivaaBadge(!showNiivaaBadge)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-widest border transition-all active:scale-95 ${
                      showNiivaaBadge 
                        ? 'bg-[#006666] text-white border-[#CCFFFF] shadow-[0_0_10px_rgba(0,102,102,0.6)]' 
                        : 'bg-transparent border-[#006666]/30 text-gray-600'
                    }`}
                  >
                    {showNiivaaBadge ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* 5. ช่องกรอกคำอธิบายชุดเพลง */}
                <textarea
                  placeholder="คำอธิบาย..." value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#001122]/50 border border-[#006666]/40 p-4 rounded-2xl focus:border-[#3333FF] h-20 outline-none transition-all placeholder:text-gray-600 text-sm"
                />

                {/* 6. ส่วนเลือก Mode */}
                <div className="grid grid-cols-2 gap-4">
                   <button 
                    type="button" onClick={() => setType('music')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'music' ? 'bg-[#3333FF] border-[#CCFFFF] shadow-[0_0_10px_#3333FF]' : 'bg-transparent border-[#006666]/30 text-gray-500'}`}
                   >
                     <Headphones size={18} /> <span className="text-xs">ฟังเพลง</span>
                   </button>
                   <button 
                    type="button" onClick={() => setType('karaoke')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'karaoke' ? 'bg-[#006666] border-[#CCFFFF] shadow-[0_0_10px_#006666]' : 'bg-transparent border-[#006666]/30 text-gray-500'}`}
                   >
                     <Mic2 size={18} /> <span className="text-xs">คาราโอเกะ</span>
                   </button>
                </div>

                {/* 7. ปุ่มส่งข้อมูลบันทึก */}
                <div className="flex gap-3">
                  <button 
                    type="submit" disabled={isSaving}
                    className={`flex-1 py-4 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${
                      editingId 
                        ? 'bg-gradient-to-r from-yellow-600 to-amber-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]' 
                        : 'bg-gradient-to-r from-[#006666] to-[#3333FF] hover:shadow-[0_0_20px_rgba(51,51,255,0.4)]'
                    }`}
                  >
                    {isSaving ? 'LAUNCHING...' : editingId ? 'บันทึกการแก้ไข' : 'สร้างอัลบั้มเพลง'}
                  </button>
                  
                  {editingId && (
                    <button
                      type="button" onClick={handleCancelEdit}
                      className="px-6 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl font-bold transition-all text-sm text-gray-300"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>
              </form>
            </section>
          </div>

          {/* คอลัมน์ขวา: รายการแสดงผลชุดเพลง */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-8">
              <Music className="w-5 h-5 text-[#3333FF]" />
              <h3 className="text-xl font-bold text-[#CCFFFF]">อัลบั้มในคลัง ({playlists.length})</h3>
            </div>

            <div className="grid gap-4">
              {playlists.map((item) => (
                <div key={item.id} className="group relative bg-[#003366]/10 hover:bg-[#003366]/30 p-6 rounded-[2rem] border border-[#006666]/20 hover:border-[#3333FF]/50 transition-all duration-300">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-3 max-w-[80%]">
                      
                      <div className="shrink-0">
                        {item.type === 'karaoke' ? (
                          <Mic2 size={16} className="text-[#006666]" />
                        ) : (
                          <Headphones size={16} className="text-[#3333FF]" />
                        )}
                      </div>

                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                          className="p-1.5 rounded-xl bg-[#001122]/90 border border-[#006666]/40 text-gray-400 hover:text-cyan-400 transition-all active:scale-95"
                        >
                          <Settings size={14} className={activeMenuId === item.id ? 'animate-spin' : ''} />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute left-0 top-full mt-2 flex items-center gap-1 bg-[#001122] border border-[#006666] rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.5)] z-50 p-1 animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={() => { handleEditClick(item); setActiveMenuId(null); }}
                              className="px-3 py-1.5 text-xs font-bold text-yellow-400 hover:bg-[#003366]/60 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                              <Pencil size={12} /> แก้ไข
                            </button>
                            
                            <div className="w-[1px] h-4 bg-[#006666]/40 mx-0.5" />
                            
                            <button
                              type="button"
                              onClick={() => { handleDeletePlaylist(item.id, item.name); setActiveMenuId(null); }}
                              className="px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 hover:bg-[#003366]/60 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                              <Trash2 size={12} /> ลบ
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 truncate">
                        <h4 className="text-lg font-bold text-white group-hover:text-[#CCFFFF] transition-colors truncate">
                          {item.name}
                          <span className="text-xs font-semibold text-cyan-400/80 ml-2">
                            ({item.song_count || 0} เพลง)
                          </span>
                        </h4>
                        <p className="text-sm text-gray-500 line-clamp-1">{item.description || 'ไม่มีข้อมูลคำอธิบาย'}</p>
                      </div>
                    </div>

                    <Link href={`/playlist/${item.id}?type=${item.type || 'music'}`}>
                      <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#001122] border border-[#006666]/40 group-hover:bg-[#3333FF] group-hover:border-[#CCFFFF] transition-all text-white shadow-xl">
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#3333FF]/5 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity -z-0"></div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}