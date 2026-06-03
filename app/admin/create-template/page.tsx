'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Library } from 'lucide-react'

// กำหนด Interface เพื่อป้องกัน Error: Unexpected any
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
  const [name, setName] = useState(''); 
  const [description, setDescription] = useState('');
  const [selection, setSelection] = useState('ฟังเพลง'); 
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('playlists')
      .select('*, tracks(count)')
      .eq('is_global', true)
      .order('created_at', { ascending: false });

    // แก้ไขการ map ข้อมูลให้ตรงกับ Interface
    setTemplates((data || []).map((p: any) => ({ 
      ...p, 
      song_count: p.tracks?.[0]?.count || 0 
    })));
  }

  useEffect(() => { fetchTemplates() }, [])

  const filtered = useMemo(() => 
    filter === 'ทั้งหมด' ? templates : templates.filter(t => t.category === filter), 
  [templates, filter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const cat = isAddingNew ? newCat : selection;
    const type = selection === 'คาราโอเกะ' ? 'karaoke' : 'music';
    
    const payload = { name, description, type, category: cat, is_global: true };
    
    if (editingId) {
      await supabase.from('playlists').update(payload).eq('id', editingId);
    } else {
      await supabase.from('playlists').insert([payload]);
    }
    
    // รีเซ็ตค่าให้ครบถ้วนหลังบันทึก
    setName(''); 
    setDescription(''); 
    setSelection('ฟังเพลง');
    setNewCat('');
    setIsAddingNew(false);
    setEditingId(null);
    fetchTemplates();
  }

  return (
    <div className="min-h-screen bg-[#001122] text-white p-8">
      {/* ส่วนหัวและ Filter คงเดิม */}
      <header className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-black text-cyan-400">Admin: Media Template Center</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">จัดการคลังสื่อและแผนการสอนส่วนกลาง</p>
        </div>
        <select onChange={(e) => setFilter(e.target.value)} className="bg-black/40 border border-cyan-500/30 p-2 rounded-xl text-xs">
            <option>ทั้งหมด</option>
            {SELECTION_LIST.map(c => <option key={c}>{c}</option>)}
        </select>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 bg-[#003366]/20 p-6 rounded-3xl border border-[#006666]/30 h-fit">
          <h2 className="text-sm font-bold mb-4">{editingId ? 'แก้ไขชุดสื่อ' : 'สร้างชุดสื่อใหม่'}</h2>
          <form onSubmit={handleSave} className="space-y-3">
            <input placeholder="ชื่อชุดสื่อ..." value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 text-sm" />
            
            <select value={selection} onChange={(e) => { setSelection(e.target.value); setIsAddingNew(e.target.value === '+ เพิ่มหมวดหมู่ใหม่'); }} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 text-sm">
                {SELECTION_LIST.map(c => <option key={c}>{c}</option>)}
            </select>
            {isAddingNew && <input placeholder="ชื่อหมวด..." value={newCat} onChange={(e) => setNewCat(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-cyan-500 text-sm" />}

            <textarea placeholder="คำอธิบาย..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-black/40 p-3 rounded-xl border border-gray-700 h-20 text-sm" />
            <button className="w-full py-3 bg-cyan-600 rounded-xl font-bold text-sm">บันทึกข้อมูล</button>
          </form>
        </div>

        <div className="lg:col-span-8 space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="bg-[#003366]/10 p-5 rounded-2xl flex items-center justify-between border border-[#006666]/20">
              <div className="flex items-center gap-4">
                 <div className="text-center w-12"><div className="text-xl font-black text-cyan-400">{t.song_count}</div><div className="text-[8px] text-gray-500">สื่อ</div></div>
                 <div>
                    <h3 className="font-bold text-sm">{t.name}</h3>
                    <p className="text-[10px] text-cyan-300">{t.category} | {t.type}</p>
                 </div>
              </div>
              <div className="flex items-center gap-1">
                {/* แก้ไขปุ่ม Edit ให้โหลดครบทุกค่า */}
                <button onClick={() => { 
                    setEditingId(t.id); 
                    setName(t.name); 
                    setDescription(t.description || ''); 
                    setSelection(t.category); 
                    setIsAddingNew(false);
                }} className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-xl"><Pencil size={16}/></button>
                
                <button onClick={() => { if(confirm('ลบ?')) supabase.from('playlists').delete().eq('id', t.id).then(fetchTemplates); }} className="p-2 text-red-400 hover:bg-red-500/20 rounded-xl"><Trash2 size={16}/></button>
                <button onClick={() => router.push(`/playlist/${t.id}`)} className="px-3 py-2 bg-[#006666] rounded-xl text-xs font-bold flex items-center gap-1"><Library size={14}/> จัดการคิว</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}