'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Disc, Mic2, Headphones, Plus, Music, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const [playlists, setPlaylists] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('music') // music หรือ karaoke
  const [isSaving, setIsSaving] = useState(false)

  const fetchPlaylists = async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      if (data) setPlaylists(data)
    } catch (err) {
      console.error("ดึงข้อมูลไม่สำเร็จ:", err)
    }
  }

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return alert('กรุณาระบุชื่อชุดเพลง')
    setIsSaving(true)
    try {
      // บันทึกค่า type ลงในฐานข้อมูลด้วย
      const { error } = await supabase
        .from('playlists')
        .insert([{ name, description, type }]) 
      if (error) throw error
      setName(''); setDescription(''); fetchPlaylists();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#001122] text-white font-sans selection:bg-[#3333FF]">
      {/* Background Neon Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#006666] blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#3333FF] blur-[120px] opacity-20"></div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-12 border-b border-[#006666]/30 pb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#CCFFFF] to-[#3333FF] drop-shadow-[0_0_10px_rgba(51,51,255,0.5)]">
              NiiVaaApp
            </h1>
            <p className="text-[#006666] font-medium mt-2 tracking-widest uppercase text-[10px]">Digital Media Command Center</p>
          </div>
          <Disc className="w-14 h-14 text-[#CCFFFF] animate-[spin_8s_linear_infinite] drop-shadow-[0_0_15px_rgba(204,255,255,0.4)]" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* คอลัมน์ซ้าย: ฟอร์มสร้าง (Input) */}
          <div className="lg:col-span-5">
            <section className="bg-[#003366]/20 backdrop-blur-xl p-8 rounded-[2.5rem] border border-[#006666]/30 shadow-2xl sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                <Plus className="text-[#CCFFFF] w-6 h-6 p-1 bg-[#006666]/40 rounded-lg" />
                <h3 className="text-xl font-bold text-[#CCFFFF]">สร้างชุดเพลงใหม่</h3>
              </div>

              <form onSubmit={handleCreatePlaylist} className="space-y-6">
                <input
                  type="text" placeholder="ชื่อชุดเพลง..." value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#001122]/50 border border-[#006666]/40 p-4 rounded-2xl focus:border-[#3333FF] outline-none transition-all placeholder:text-gray-600"
                />
                
                <textarea
                  placeholder="คำอธิบาย..." value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#001122]/50 border border-[#006666]/40 p-4 rounded-2xl focus:border-[#3333FF] h-24 outline-none transition-all placeholder:text-gray-600"
                />

                {/* ส่วนเลือก Mode: ฟัง หรือ ร้อง */}
                <div className="grid grid-cols-2 gap-4">
                   <button 
                    type="button"
                    onClick={() => setType('music')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'music' ? 'bg-[#3333FF] border-[#CCFFFF] shadow-[0_0_10px_#3333FF]' : 'bg-transparent border-[#006666]/30 text-gray-500'}`}
                   >
                     <Headphones size={18} /> <span className="text-xs">ฟังเพลง</span>
                   </button>
                   <button 
                    type="button"
                    onClick={() => setType('karaoke')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${type === 'karaoke' ? 'bg-[#006666] border-[#CCFFFF] shadow-[0_0_10px_#006666]' : 'bg-transparent border-[#006666]/30 text-gray-500'}`}
                   >
                     <Mic2 size={18} /> <span className="text-xs">คาราโอเกะ</span>
                   </button>
                </div>

                <button 
                  type="submit" disabled={isSaving}
                  className="w-full py-4 bg-gradient-to-r from-[#006666] to-[#3333FF] text-white font-bold rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(51,51,255,0.4)] transition-all active:scale-95"
                >
                  {isSaving ? 'LAUNCHING...' : 'สร้างอัลบั้มเพลง'}
                </button>
              </form>
            </section>
          </div>

          {/* คอลัมน์ขวา: รายการ (Display) */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-8">
              <Music className="w-5 h-5 text-[#3333FF]" />
              <h3 className="text-xl font-bold text-[#CCFFFF]">อัลบั้มในคลัง ({playlists.length})</h3>
            </div>

            <div className="grid gap-4">
              {playlists.map((item) => (
                <div key={item.id} className="group relative bg-[#003366]/10 hover:bg-[#003366]/30 p-6 rounded-[2rem] border border-[#006666]/20 hover:border-[#3333FF]/50 transition-all duration-300">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {/* ไอคอนแสดงโหมด */}
                        {item.type === 'karaoke' ? (
                          <Mic2 size={16} className="text-[#006666]" />
                        ) : (
                          <Headphones size={16} className="text-[#3333FF]" />
                        )}
                        <h4 className="text-lg font-bold text-white group-hover:text-[#CCFFFF]">{item.name}</h4>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{item.description || 'ไม่มีข้อมูลคำอธิบาย'}</p>
                    </div>

                    {/* ปุ่มส่งค่า ID และ Type ผ่าน URL */}
                    <Link href={`/playlist/${item.id}?type=${item.type || 'music'}`}>
                      <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#001122] border border-[#006666]/40 group-hover:bg-[#3333FF] group-hover:border-[#CCFFFF] transition-all">
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#3333FF]/5 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity"></div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}