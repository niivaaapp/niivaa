'use client' // ต้องมีบรรทัดนี้เสมอสำหรับส่วนที่มีการพิมพ์หรือค้นหา

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, Mic, X, Zap, Plus, CheckCircle2 } from 'lucide-react'

interface SearchPanelProps {
  playlistId: string;
  youtubeApiKey: string;
  onAddSuccess: () => void;
  onPlayNow: (videoId: string) => void;
}

// ต้องใช้ export default function เท่านั้น เพื่อแก้ปัญหา Error: got object
export default function SearchPanel({ 
  playlistId, 
  youtubeApiKey, 
  onAddSuccess, 
  onPlayNow 
}: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // ข้อ 6: ค้นหาอัตโนมัติเมื่อพิมพ์ 2 อักษรขึ้นไป
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) handleSearch();
      else if (query.length === 0) setResults([]);
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  // ข้อ 5: ค้นหาใน Stock ก่อน ถ้าไม่พบหาต่อใน YouTube
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const { data: stockData } = await supabase
        .from('master_songs')
        .select('*')
        .ilike('title', `%${query}%`)
        .limit(10);

      if (stockData && stockData.length > 0) {
        setResults(stockData.map(s => ({ ...s, source: 'stock' })));
      } else {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query + " karaoke")}&type=video&key=${youtubeApiKey}`
        );
        const yt = await res.json();
        setResults(yt.items?.map((item: any) => ({
          video_id: item.id.videoId,
          title: item.snippet.title,
          thumbnail_url: item.snippet.thumbnails.default.url,
          source: 'youtube'
        })) || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // ข้อ 7: ค้นหาด้วยเสียง
  const startVoice = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return alert("เบราว์เซอร์ไม่รองรับ");
    const rec = new SpeechRec();
    rec.lang = 'th-TH';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e: any) => {
      setQuery(e.results[0][0].transcript);
      setIsListening(false);
    };
    rec.start();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // ข้อ 8 & 9: เพิ่มเพลงเข้าคิว หรือเล่นทันที
  const handleBulkAction = async (isPlayNow: boolean) => {
    if (selectedIds.size === 0) return;
    const selectedSongs = results.filter(r => selectedIds.has(r.video_id));
    
    await supabase.from('master_songs').upsert(
      selectedSongs.map(s => ({ video_id: s.video_id, title: s.title, thumbnail_url: s.thumbnail_url }))
    );

    const entries = selectedSongs.map((s, idx) => ({
      playlist_id: playlistId,
      video_id: s.video_id,
      created_at: isPlayNow ? new Date(Date.now() - 1000 * (selectedSongs.length - idx)).toISOString() : new Date().toISOString()
    }));

    const { error } = await supabase.from('tracks').insert(entries);
    if (!error) {
      if (isPlayNow) onPlayNow(selectedSongs[0].video_id);
      setSelectedIds(new Set());
      setQuery('');
      onAddSuccess();
    }
  };

  return (
    <div className="p-6 bg-[#001a33]/40 rounded-[2.5rem] border border-[#006666]/30">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 ค้นเพลง..." 
            className="w-full bg-black/50 p-4 rounded-2xl pl-12 border border-[#006666]/30 focus:border-[#3333FF] outline-none text-sm" 
          />
          {query && <X onClick={() => setQuery('')} className="absolute right-4 top-4 text-gray-500 cursor-pointer" size={20} />}
        </div>
        <button onClick={startVoice} className={`p-4 rounded-2xl border ${isListening ? 'bg-red-500' : 'bg-[#001122] border-[#006666]/50'}`}>
          <Mic size={24} />
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex gap-3 mb-4 animate-in slide-in-from-left">
          <button onClick={() => handleBulkAction(false)} className="flex-1 py-3 bg-[#006666]/30 border border-[#006666] rounded-xl text-xs font-bold font-prompt">
             เพิ่ม {selectedIds.size} เพลงเข้าคิว
          </button>
          <button onClick={() => handleBulkAction(true)} className="flex-1 py-3 bg-[#3333FF]/30 border border-[#3333FF] rounded-xl text-xs font-bold font-prompt">
             แทรกเล่นทันที ⚡
          </button>
        </div>
      )}

      <div className="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar">
        {results.map(song => (
          <div key={song.video_id} onClick={() => toggleSelect(song.video_id)} className={`flex items-center gap-4 p-3 rounded-2xl border ${selectedIds.has(song.video_id) ? 'bg-[#3333FF]/20 border-[#3333FF]' : 'bg-white/5 border-transparent'}`}>
            <img src={song.thumbnail_url} className="w-10 h-10 rounded-lg object-cover" />
            <div className="flex-1 text-sm font-bold truncate">{song.title}</div>
            {selectedIds.has(song.video_id) && <CheckCircle2 size={16} className="text-[#3333FF]" />}
          </div>
        ))}
      </div>
    </div>
  );
}