'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Pencil, Trash2, Library, Image, Save, X } from 'lucide-react'

export default function AdminTemplateManager() {
  const [templates, setTemplates] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('music')
  const [category, setCategory] = useState('อื่นๆ')
  const [isSaving, setIsSaving] = useState(false)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // White-Label Branding States (คงเดิม)
  const [customBanner, setCustomBanner] = useState('')
  const [showNiivaaBadge, setShowNiivaaBadge] = useState(true)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState('')

  const fetchTemplates = async () => {
    try {
      // ดึงเฉพาะที่เป็น Global Template ที่ Admin สร้างไว้
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('is_global', true) 
        .order('created_at', { ascending: false })
        
      if (error) throw error
      setTemplates(data || [])
    } catch (err: any) { console.error("Error:", err.message) }
  }

  useEffect(() => { fetchTemplates() }, [])

  const uploadLogoProcess = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const { error } = await supabase.storage.from('playlist-logos').upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('playlist-logos').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      let finalLogoUrl = logoUrl
      if (logoFile) finalLogoUrl = await uploadLogoProcess(logoFile)

      const payload = { 
        name, description, type, category,
        custom_banner: customBanner, 
        show_niivaa_badge: showNiivaaBadge, 
        logo_url: finalLogoUrl,
        is_global: true, // 👈 บังคับว่าเป็น Global
        is_featured: true
      }

      if (editingId) {
        await supabase.from('playlists').update(payload).eq('id', editingId)
      } else {
        await supabase.from('playlists').insert([payload])
      }
      
      resetForm()
      fetchTemplates()
      alert('บันทึกชุดสื่อตัวอย่างสำเร็จ!')
    } catch (err: any) { alert('Error: ' + err.message) } 
    finally { setIsSaving(false) }
  }

  const resetForm = () => {
    setEditingId(null); setName(''); setDescription(''); setType('music'); 
    setCategory('อื่นๆ'); setCustomBanner(''); setShowNiivaaBadge(true); 
    setLogoFile(null); setLogoUrl('');
  }

  return (
    <div className="min-h-screen bg-[#001122] text-white p-12">
      <header className="mb-12 border-b border-[#006666]/30 pb-8">
        <h1 className="text-4xl font-black text-cyan-400">Admin: Template Manager</h1>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-2">จัดการสื่อตัวอย่างสำหรับสมาชิกทั้งหมด</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Form */}
        <div className="lg:col-span-5 bg-[#003366]/20 p-8 rounded-[2rem] border border-[#006666]/30">
          <h2 className="text-lg font-bold mb-6">{editingId ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}</h2>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            <input type="text" placeholder="ชื่อชุดสื่อ..." value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 outline-none focus:border-cyan-500" />
            
            {/* Category Dropdown (ใช้ตัวแปรเดียวกับที่สมาชิกใช้) */}
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 text-sm">
                <option value="วิทยาศาสตร์">วิทยาศาสตร์</option>
                <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                <option value="ภาษาไทย">ภาษาไทย</option>
                <option value="อื่นๆ">อื่นๆ</option>
            </select>

            <textarea placeholder="คำอธิบาย..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 h-20" />
            
            <button type="submit" className="w-full py-4 bg-cyan-600 font-bold rounded-xl hover:bg-cyan-500 transition-all">
                {isSaving ? 'Saving...' : 'บันทึก Template สู่ระบบกลาง'}
            </button>
            {editingId && <button type="button" onClick={resetForm} className="w-full text-xs text-gray-400">ยกเลิก</button>}
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-7">
            <div className="grid gap-4">
                {templates.map((t) => (
                    <div key={t.id} className="bg-[#003366]/10 p-4 rounded-2xl flex items-center justify-between border border-[#006666]/20">
                        <div>
                            <h3 className="font-bold">{t.name}</h3>
                            <p className="text-xs text-gray-400">{t.category} | {t.type}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setEditingId(t.id); setName(t.name); setDescription(t.description); setCategory(t.category); }} className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl"><Pencil size={16}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  )
}