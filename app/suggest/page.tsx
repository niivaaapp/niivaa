'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Search, Plus, Play, Music, Send, CheckCircle2, 
  Loader2, X, Mic, MicOff, ListMusic, ArrowLeft 
} from 'lucide-react'

export default function SmartSuggestPage() {
  const router = useRouter()
  
  // --- [1. STATES] ---
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState('')
  
  const [isSearching, setIsSearching] = useState(false)
  const [isListening, setIsListening] = useState(false)
  
  const [showYoutubeForm, setShowYoutubeForm] = useState(false)
  const [ytUrl, setYtUrl] = useState('')
  const [ytTitle, setYtTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<any>(null)

  // --- [2. FETCH DATA] ---
  const fetchPlaylists = useCallback(async () => {
    const { data, error } = await supabase
      .from('playlists')
      .select('*, tracks(count)')
    
    if (data) {
      const formatted = data.map(p => ({
        ...p,
        tracks_count: p.tracks?.[0]?.count || 0
      }))
      setPlaylists(formatted)
    }
  }, [])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  // --- [3. SEARCH LOGIC] ---
  useEffect(() => {
    const searchMaster = async () => {
      if (query.trim().length < 1) { setResults([]); return; }
      setIsSearching(true)
      const { data } = await supabase
        .from('master_songs')
        .select('*')
        .ilike('title', `%${query}%`)
        .limit(10)
      
      setResults(data || [])
      setIsSearching(false)
    }
    const timer = setTimeout(searchMaster, 400)
    return () => clearTimeout(timer)
  }, [query])

  // ดึงชื่อจาก YouTube oEmbed
  useEffect(() => {
    const fetchYtTitle = async () => {
      const vId = ytUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1]
      if (!vId) return
      try {
        const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`)
        const data = await res.json()
        if (data.title) setYtTitle(data.title)
      } catch (e) { console.error(e) }
    }
    if (ytUrl.includes("youtube.com") || ytUrl.includes("youtu.be")) fetchYtTitle()
  }, [ytUrl])

  // --- [4. VOICE CONTROL] ---
  const startVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return alert("เบราว์เซอร์ไม่รองรับระบบเสียง")
    
    const rec = new SpeechRecognition()
    rec.lang = 'th-TH'
    rec.onstart = () => setIsListening(true)
    rec.onend = () => setIsListening(false)
    rec.onresult = (e: any) => {
      const txt = e.results[0][0].transcript
      setQuery(txt)
      setShowYoutubeForm(false)
    }
    rec.start()
  }

  // --- [5. ADD TO QUEUE ACTION] ---
  const handleAddToQueue = async (song: any) => {
    if (!selectedPlaylist) {
      setStatus({ type: 'error', msg: 'กรุณาคลิกเลือกชุดเพลงด้านบนก่อนครับ' })
      return
    }

    setIsSubmitting(true)
    try {
      // 1. ลง Master_songs
      await supabase.from('master_songs').upsert({
        video_id: song.video_id,
        title: song.title,
        thumbnail_url: song.thumbnail_url || `https://img.youtube.com/vi/${song.video_id}/mqdefault.jpg`
      }, { onConflict: 'video_id' })

      // 2. ลง Tracks
      const { error } = await supabase.from('tracks').insert({
        playlist_id: selectedPlaylist,
        video_id: song.video_id
      })

      if (error) throw error

      setStatus({ type: 'success', msg: `เพิ่ม "${song.title}" เข้าคิวแล้ว!` })
      setQuery(''); setYtUrl(''); setYtTitle(''); setResults([]); setShowYoutubeForm(false)
      fetchPlaylists() // อัปเดตจำนวนเพลงในชุด
    } catch (e) {
      setStatus({ type: 'error', msg: 'ผิดพลาด ลองใหม่อีกครั้ง' })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setStatus(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[#000a12] text-white p-4 md:p-10 font-sans pb-32">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* --- Header & Navigation --- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-500/30">
              <Music className="text-cyan-400" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter italic">NiiVaa <span className="text-cyan-400">Hub</span></h1>
              <p className="text-[9px] text-white/30 font-bold tracking-[0.3em] uppercase">Smart Suggestion System</p>
            </div>
          </div>
          
          {/* ปุ่มไปหน้า Playlists สวยงาม */}
          <button 
            onClick={() => router.push('/playlist/')}
            className="group flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-cyan-500 hover:text-black transition-all duration-500"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back to Player</span>
          </button>
        </div>

        {/* --- Playlist Selection (Clickable Grid) --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.2em]">1. คลิกเลือกชุดเพลงที่กำลังเปิด</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {playlists.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPlaylist(p.id)}
                className={`relative p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden group ${
                  selectedPlaylist === p.id 
                  ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                  : 'bg-white/5 border-white/10 text-white hover:border-cyan-500/50'
                }`}
              >
                <ListMusic size={16} className={`mb-2 ${selectedPlaylist === p.id ? 'text-black' : 'text-cyan-400'}`} />
                <p className="text-xs font-black truncate">{p.name}</p>
                <span className={`text-[9px] font-bold ${selectedPlaylist === p.id ? 'text-black/60' : 'text-white/40'}`}>
                  {p.tracks_count} เพลง
                </span>
                {selectedPlaylist === p.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 size={14} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* --- Search Bar & Voice --- */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.2em] px-1">2. ค้นหาหรือพูดชื่อเพลง</h3>
          <div className="relative group">
            <div className="absolute inset-y-0 left-5 flex items-center">
              {isSearching ? <Loader2 className="text-cyan-400 animate-spin" size={18} /> : <Search className="text-white/20" size={18} />}
            </div>
            <input 
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowYoutubeForm(false); }}
              placeholder="พิมพ์ชื่อเพลง..."
              className={`w-full bg-white/5 border p-5 pl-14 pr-24 rounded-3xl text-white outline-none transition-all duration-500 ${isListening ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-500/5' : 'border-white/10 focus:border-cyan-500/50'}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                onClick={startVoiceSearch}
                className={`p-3 rounded-2xl transition-all duration-500 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black'}`}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              {query && <button onClick={() => setQuery('')} className="p-2 text-white/20 hover:text-white"><X size={18} /></button>}
            </div>
          </div>
        </section>

        {/* --- Results & YouTube Fallback --- */}
        <section className="space-y-3">
          {results.length > 0 && (
            <div className="bg-[#001a33]/50 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
              {results.map((song) => (
                <div key={song.video_id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <img src={song.thumbnail_url} className="w-14 h-14 rounded-xl object-cover shadow-lg" alt="" />
                    <span className="text-sm font-bold truncate pr-4">{song.title}</span>
                  </div>
                  <button 
                    onClick={() => handleAddToQueue(song)}
                    className="p-4 bg-cyan-500 rounded-2xl text-black hover:scale-110 active:scale-95 transition-all shadow-lg"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fallback to YouTube */}
          {!isSearching && query.length >= 2 && results.length === 0 && !showYoutubeForm && (
            <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-[3rem] space-y-5">
               <p className="text-sm text-white/30">ไม่พบในคลัง ค้นหาจาก YouTube แทนไหม?</p>
               <button 
                onClick={() => setShowYoutubeForm(true)}
                className="flex items-center gap-2 mx-auto px-8 py-4 bg-red-600/20 border border-red-500/40 text-red-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-lg"
               >
                 <Play size={16} className="fill-current" /> Manual Add from YouTube
               </button>
            </div>
          )}

          {/* YouTube Form */}
          {showYoutubeForm && (
            <div className="bg-gradient-to-b from-[#1a0505] to-[#000a12] border border-red-500/20 p-8 rounded-[3rem] space-y-5 animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-3 text-red-500">
                <Play size={24} className="fill-current" />
                <span className="text-xs font-black uppercase tracking-[0.3em]">Direct Link Add</span>
              </div>
              <input 
                type="text"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="วางลิงก์ YouTube ที่นี่..."
                className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-sm outline-none focus:border-red-500/40"
              />
              {ytTitle && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[10px] text-white/40 uppercase mb-1">Song Detected:</p>
                  <p className="text-cyan-400 font-bold text-sm">{ytTitle}</p>
                </div>
              )}
              <button 
                onClick={() => {
                  const vId = ytUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1]
                  if (vId) handleAddToQueue({ video_id: vId, title: ytTitle })
                }}
                disabled={!ytUrl || !ytTitle || isSubmitting || !selectedPlaylist}
                className="w-full py-5 bg-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-20"
              >
                <Send size={18} /> {isSubmitting ? 'Sending...' : 'Confirm & Add to Queue'}
              </button>
            </div>
          )}
        </section>

        {/* --- Status & Alerts --- */}
        {status && (
          <div className={`fixed bottom-10 left-6 right-6 p-5 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-bottom-10 ${status.type === 'success' ? 'bg-cyan-500 text-black shadow-cyan-500/20' : 'bg-red-600 text-white'}`}>
            {status.msg}
          </div>
        )}
      </div>
    </div>
  )
}