'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Library, Loader2 } from 'lucide-react'

interface Playlist {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  song_count: number;
}

const SELECTION_LIST = [
  "ฟังเพลง", "คาราโอเกะ", 
  "ภาษาไทย", "ภาษาอังกฤษ", "ภาษาจีน", "ภาษาญี่ปุ่น", "ภาษาเกาหลี",
  "คณิตศาสตร์", "วิทยาศาสตร์", "ฟิสิกส์", "เคมี", "ชีววิทยา", "วิทยาศาสตร์โลกและอวกาศ",
  "สังคมศึกษา", "เทคโนโลยีคอมพิวเตอร์", "สุขภาพและการออกกำลังกาย",
  "การเลี้ยงดูลูก", "การทำอาหาร", "การเกษตร", "งานช่าง", "สวดมนต์", "ตลก-ขำขัน", "ข่าวสาร",
  "+ เพิ่มหมวดหมู่ใหม่"
];

export default function AdminTemplateManager() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Playlist[]>([])
  const [filter, setFilter] = useState('ทั้งหมด')
  
  // States สำหรับฟอร์ม
  const [name, setName] = useState(''); 
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState('ฟังเพลง'); 
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State สำหรับ UI
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fetchTemplates = async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('*, tracks(count)')
        .eq('is_global', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTemplates((data || []).map((p: any) => ({ 
        ...p, 
        song_count: p.tracks?.[0]?.count || 0 
      })));
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  // รวมหมวดหมู่พื้นฐานเข้ากับหมวดหมู่ที่มีอยู่ในฐานข้อมูล (ป้องกันบั๊กตอนกดแก้ไข)
  const uniqueCategories = useMemo(() => {
    const dbCats = templates.map(t => t.category).filter(Boolean);
    return Array.from(new Set([...SELECTION_LIST.filter(c => c !== '+ เพิ่มหมวดหมู่ใหม่'), ...dbCats, '+ เพิ่มหมวดหมู่ใหม่']));
  }, [templates]);

  const filtered = useMemo(() => 
    filter === 'ทั้งหมด' ? templates : templates.filter(t => t.category === filter), 
  [templates, filter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("กรุณาระบุชื่อชุดสื่อ");
    
    const cat = isAddingNew ? newCat.trim() : selection;
    if (!cat) return alert("กรุณาระบุหมวดหมู่");

    setIsLoading(true);
    try {
      // 🌟 ดึงข้อมูล user_id ของ Admin ที่กำลังล็อกอินอยู่
      const { data: { user } } = await supabase.auth.getUser();

      const type = cat.includes('คาราโอเกะ') ? 'karaoke' : 'music';
      
      // 🌟 นำ user_id แนบเข้าไปใน payload ด้วย
      const payload: any = { 
        name, 
        description, 
        type, 
        category: cat, 
        is_global: true 
      };

      if (editingId) {
        const { error } = await supabase.from('playlists').update(payload).eq('id', editingId);
        if (error) throw error;
        alert("✅ แก้ไขข้อมูลสำเร็จ");
      } else {
        // หากเป็นการสร้างใหม่ ให้ใส่ user_id ลงไป
        if (user) payload.user_id = user.id;
        
        const { error } = await supabase.from('playlists').insert([payload]);
        if (error) throw error;
        alert("✅ บันทึกข้อมูลใหม่สำเร็จ");
      }
      
      // รีเซ็ตค่าให้ครบถ้วนหลังบันทึก
      setName(''); 
      setDescription(''); 
      setSelection('ฟังเพลง');
      setNewCat('');
      setIsAddingNew(false);
      setEditingId(null);
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      alert("❌ เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDelete = async (id: string, templateName: string) => {
    if (!confirm(`⚠️ ยืนยันการลบชุดสื่อ "${templateName}"?\nข้อมูลนี้จะถูกลบถาวร`)) return;
    
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) throw error;
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      alert("❌ ลบข้อมูลไม่สำเร็จ: " + err.message);
    }
  }

  const handleEdit = (t: Playlist) => {
    setEditingId(t.id); 
    setName(t.name); 
    setDescription(t.description || ''); 
    
    // ตรวจสอบว่าหมวดหมู่ของเทมเพลตนี้อยู่ในลิสต์ปกติหรือไม่
    if (uniqueCategories.includes(t.category)) {
      setSelection(t.category); 
      setIsAddingNew(false);
    } else {
      setSelection('+ เพิ่มหมวดหมู่ใหม่');
      setNewCat(t.category);
      setIsAddingNew(true);
    }
  }

  return (
    <div className="min-h-screen bg-[#001122] text-white p-8">
      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-cyan-400">Admin: Media Template Center</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">จัดการคลังสื่อและแผนการสอนส่วนกลาง</p>
        </div>
        <select onChange={(e) => setFilter(e.target.value)} value={filter} className="bg-black/40 border border-cyan-500/30 p-2 rounded-xl text-xs outline-none focus:border-cyan-400">
            <option value="ทั้งหมด">ทั้งหมด</option>
            {uniqueCategories.filter(c => c !== '+ เพิ่มหมวดหมู่ใหม่').map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ฝั่งซ้าย: FORM */}
        <div className="lg:col-span-4 bg-[#003366]/20 p-6 rounded-3xl border border-[#006666]/30 h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-cyan-300">{editingId ? '✏️ แก้ไขชุดสื่อ' : '✨ สร้างชุดสื่อใหม่'}</h2>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setName(''); setDescription(''); setSelection('ฟังเพลง'); setIsAddingNew(false); }} className="text-[10px] text-gray-400 hover:text-white underline">
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>
          
          <form onSubmit={handleSave} className="space-y-3">
            <input required placeholder="ชื่อชุดสื่อ..." value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none text-sm" />
            
            <select value={selection} onChange={(e) => { setSelection(e.target.value); setIsAddingNew(e.target.value === '+ เพิ่มหมวดหมู่ใหม่'); }} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none text-sm">
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            {isAddingNew && (
              <input required autoFocus placeholder="พิมพ์ชื่อหมวดหมู่ใหม่..." value={newCat} onChange={(e) => setNewCat(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-cyan-500 outline-none text-sm" />
            )}

            <textarea placeholder="คำอธิบายเพิ่มเติม..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 focus:border-cyan-500 outline-none h-20 text-sm" />
            
            <button disabled={isLoading} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 disabled:text-gray-400 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2">
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มลงคลังส่วนกลาง'}
            </button>
          </form>
        </div>

        {/* ฝั่งขวา: LIST */}
        <div className="lg:col-span-8 space-y-3 h-[75vh] overflow-y-auto custom-scrollbar pr-2">
          {isFetching ? (
            <div className="text-center py-10 text-cyan-600 flex justify-center"><Loader2 className="animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">ไม่พบข้อมูลชุดสื่อในหมวดหมู่นี้</div>
          ) : (
            filtered.map((t) => (
              <div key={t.id} className="bg-[#003366]/10 p-5 rounded-2xl flex items-center justify-between border border-[#006666]/20 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-4">
                   <div className="text-center w-12 shrink-0">
                     <div className="text-xl font-black text-cyan-400">{t.song_count}</div>
                     <div className="text-[8px] text-gray-500 uppercase">items</div>
                   </div>
                   <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate">{t.name}</h3>
                      <p className="text-[10px] text-cyan-300 truncate">{t.category} | {t.type}</p>
                   </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleEdit(t)} className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-xl transition-colors" title="แก้ไขข้อมูล">
                    <Pencil size={16}/>
                  </button>
                  
                  <button onClick={() => handleDelete(t.id, t.name)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors" title="ลบชุดสื่อ">
                    <Trash2 size={16}/>
                  </button>
                  
                  <button onClick={() => router.push(`/dj/${t.id}`)} className="px-3 py-2 bg-[#006666] hover:bg-[#008888] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ml-2 shadow-md">
                    <Library size={14}/> จัดการคิวสื่อ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}