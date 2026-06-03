'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ShieldAlert, Megaphone, Video, Users, CreditCard, 
  Plus, Trash2, MapPin, CheckCircle2, CloudLightning, Music 
} from 'lucide-react'

export default function PlatformAdminDashboard() {
  const [activeTab, setActiveTab] = useState('announcement')
  const [playlists, setPlaylists] = useState<any[]>([])

  // --- [STATES - 1. ระบบประกาศส่วนกลาง] ---
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [announcementText, setAnnouncementText] = useState('')
  const [announcementsList, setAnnouncementsList] = useState<any[]>([])
  const [isSendingMsg, setIsSendingMsg] = useState(false)

  // --- [STATES - 2. ระบบอัปโหลดวิดีโอโปรโมท] ---
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)

  // --- [STATES - 3 & 4. ระบบ Monitor และ บัญชี] ---
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])

  // 🔄 โหลดข้อมูลพื้นฐานที่จำเป็น
  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    // โหลดชุดเพลงมาให้เลือกผูกประกาศ
    const { data: pData } = await supabase.from('playlists').select('id, name')
    if (pData) setPlaylists(pData)

    // โหลดประวัติประกาศล่าสุดมาโชว์ในตารางมอนิเตอร์
    const { data: aData } = await supabase
      .from('announcements')
      .select('*, playlists(name)')
      .order('id', { ascending: false })
    if (aData) setAnnouncementsList(aData)

    // จำลองข้อมูลระบบมอนิเตอร์รายจังหวัด/อำเภอ และ บัญชีชำระเงิน
    setActiveUsers([
      { province: 'สุรินทร์', district: 'ท่าตูม', count: 12 },
      { province: 'สุรินทร์', district: 'เมืองสุรินทร์', count: 8 },
      { province: 'บุรีรัมย์', district: 'สตึก', count: 4 },
    ])

    setPayments([
      { id: 1, org: 'โรงเรียนท่าตูมประชาเสริมวิทย์', package: 'Premium Yearly', status: 'Approved', amount: '4,500 บ.' },
      { id: 2, org: 'ศูนย์การเรียนรู้อัจฉริยะ', package: 'Premium Monthly', status: 'Pending', amount: '450 บ.' },
    ])
  }

  // 📣 1. ลอจิกส่งประกาศส่วนกลาง (ผูกคอลัมน์ author_type = 'system')
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlaylistId || !announcementText) return alert('กรุณาเลือกชุดเพลงและกรอกข้อความ')
    setIsSendingMsg(true)

    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          playlist_id: selectedPlaylistId,
          content: announcementText,
          author_type: 'system', // 🎯 บังคับแทรกร่วมในนามแพลตฟอร์มส่วนกลาง
          is_active: true
        }])

      if (error) throw error
      alert('ส่งประกาศในระบบสำเร็จแล้วครับ')
      setAnnouncementText('')
      fetchInitialData()
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setIsSendingMsg(false)
    }
  }

  // 🗑️ ลบประกาศออกจากตาราง
  const handleDeleteAnnouncement = async (id: any) => {
    if (!confirm('ยืนยันที่จะลบประกาศนี้ใช่ไหมครับ?')) return
    await supabase.from('announcements').delete().eq('id', id)
    fetchInitialData()
  }

  // 📹 2. ลอจิกการส่งไฟล์วิดีโอเข้าคลัง promo-videos Bucket
  const handleUploadPromoVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile) return alert('กรุณาเลือกไฟล์วิดีโอก่อนครับ')
    setIsUploadingVideo(true)

    try {
      const fileExt = videoFile.name.split('.').pop()
      const fileName = `promo-${Date.now()}.${fileExt}`

      // 1. อัปโหลดไฟล์เข้าตู้ Storage
      const { data, error } = await supabase.storage
        .from('promo-videos')
        .upload(fileName, videoFile)

      if (error) throw error

      // 2. ดึง Public URL ของไฟล์ออกมา
      const { data: urlData } = supabase.storage
        .from('promo-videos')
        .getPublicUrl(fileName)

      // 🎯 [เพิ่มใหม่]: สั่งบันทึกลิงก์ URL นี้ลงไปในตารางคลังข้อมูลส่วนกลาง เพื่อให้หน้าจอเพลงดึงไปใช้ได้แบบอัตโนมัติ
      const { error: dbError } = await supabase
        .from('promo_videos')
        .insert([{ 
          video_url: urlData.publicUrl, 
          title: videoFile.name 
        }])

      if (dbError) throw dbError

      alert('คลังส่วนกลางบันทึกวิดีโอโปรโมทเรียบร้อยแล้วครับพี่!')
      setVideoFile(null)
    } catch (err: any) {
      alert('อัปโหลดพลาด: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#000a12] text-white font-sans flex flex-col md:flex-row">
      
      {/* 🧭 SIDEBAR เมนูบอร์ดควบคุมส่วนกลาง */}
      <aside className="w-full md:w-64 bg-[#000d1a] border-r border-white/5 p-6 shrink-0 space-y-8 shadow-[0_0_20px_rgba(6,182,212,0.05)]">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 flex items-center gap-2">
            <ShieldAlert className="text-cyan-400 w-5 h-5 animate-pulse" /> NIIVAA HQ
          </h2>
          <p className="text-[9px] font-bold text-gray-500 tracking-widest uppercase mt-1">Platform Control Center</p>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab('announcement')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all ${activeTab === 'announcement' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Megaphone size={16} /> จัดการประกาศระบบ
          </button>
          <button 
            onClick={() => setActiveTab('promo')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all ${activeTab === 'promo' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Video size={16} /> ส่งวิดีโอโปรโมท (Promo)
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all ${activeTab === 'monitor' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <Users size={16} /> รายงานสถิติการใช้งาน
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wider transition-all ${activeTab === 'billing' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <CreditCard size={16} /> บัญชีชำระเงินสมาชิก
          </button>
        </nav>
      </aside>

      {/* 💻 MAIN WORKSPACE พื้นที่จัดการตามแท็บเมนู */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        
        {/* 📣 แท็บที่ 1: จัดการข้อความประกาศส่วนกลาง */}
        {activeTab === 'announcement' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-black text-cyan-300">ส่งสัญญาณประกาศจากส่วนกลาง</h3>
              <p className="text-xs text-gray-500 mt-1">บังคับแทรกข้อความประกาศระบบร่วมกับผู้ใช้ทั่วไป แสดงผลแบบเรียลไทม์บนป้ายวิ่งหน้าจอหลัก</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form onSubmit={handleSendAnnouncement} className="lg:col-span-5 bg-[#001424] border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest">เลือกบอร์ด/ชุดเพลงปลายทาง</label>
                  <select 
                    value={selectedPlaylistId}
                    onChange={(e) => setSelectedPlaylistId(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 p-3 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">-- เลือกเพลย์ลิสต์เป้าหมาย --</option>
                    {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-cyan-400/60 uppercase tracking-widest">ระบุข้อความประกาศระบบ</label>
                  <textarea 
                    placeholder="พิมพ์ประกาศในนามแพลตฟอร์มส่วนกลาง..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full h-28 bg-black/40 border border-white/5 p-4 rounded-xl text-sm outline-none focus:border-cyan-400 transition-all font-medium"
                  />
                </div>

                <button 
                  type="submit" disabled={isSendingMsg}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all active:scale-95"
                >
                  {isSendingMsg ? 'BROADCASTING...' : 'ยิงสัญญาณประกาศสากล'}
                </button>
              </form>

              {/* ตารางประวัติรายการประกาศล่าสุดบนระบบ */}
              <div className="lg:col-span-7 bg-[#001424] border border-white/5 p-6 rounded-2xl">
                <h4 className="text-xs font-black tracking-wider text-cyan-400/60 mb-4 uppercase">ประวัติสถิติข้อความวิ่งล่าสุดบนระบบ</h4>
                <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-gray-500">
                        <th className="pb-2">ชุดเพลงเป้าหมาย</th>
                        <th className="pb-2">ข้อความประกาศ</th>
                        <th className="pb-2">ประเภทผู้ส่ง</th>
                        <th className="pb-2 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {announcementsList.map((item) => (
                        <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 font-bold text-gray-300">{item.playlists?.name || 'Global'}</td>
                          <td className="py-3 max-w-[200px] truncate text-white">{item.content}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.author_type === 'system' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-cyan-500/10 text-cyan-400'}`}>
                              {item.author_type}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <button onClick={() => handleDeleteAnnouncement(item.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📹 แท็บที่ 2: ส่งวิดีโอโปรโมทเข้าคลัง Storage */}
        {activeTab === 'promo' && (
          <div className="space-y-6 max-w-xl animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-black text-cyan-300">ตู้ฝากไฟล์สื่อส่วนกลาง (Promo-Video Vault)</h3>
              <p className="text-xs text-gray-500 mt-1">สตรีมมิ่งไฟล์วิดีโอสั้นเข้ากล่องจัดเก็บหลักแบบ Public เพื่อให้นำพาร์ทลิงก์ไปใช้งานประกอบบอร์ด</p>
            </div>

            <form onSubmit={handleUploadPromoVideo} className="bg-[#001424] border border-white/5 p-8 rounded-2xl space-y-6">
              <div className="border-2 border-dashed border-white/10 hover:border-cyan-500/40 rounded-2xl p-8 text-center transition-colors relative cursor-pointer group">
                <input 
                  type="file" accept="video/mp4,video/x-m4v,video/*"
                  onChange={(e) => { if(e.target.files && e.target.files[0]) setVideoFile(e.target.files[0]) }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <Video size={36} className="text-cyan-400 animate-bounce" />
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {videoFile ? videoFile.name : 'ลากไฟล์มาวางตรงนี้ หรือ กดค้นหาไฟล์วิดีโอ (.mp4)'}
                  </span>
                  <span className="text-[10px] text-gray-500">แนะนําขนาดไฟล์ไม่เกิน 50MB เพื่อเสถียรภาพการดาวน์โหลด</span>
                </div>
              </div>

              <button 
                type="submit" disabled={isUploadingVideo}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_#06b6d4] transition-all"
              >
                {isUploadingVideo ? 'LAUNCHING FILES TO STORAGE...' : 'เริ่มอัปโหลดไฟล์เข้าเก็บส่วนกลาง'}
              </button>
            </form>
          </div>
        )}

        {/* 📊 แท็บที่ 3: ระบบรายงานสถิติตรวจจับพื้นที่การใช้งาน */}
        {activeTab === 'monitor' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-black text-cyan-300">รายงานสถิติตำแหน่งการออนไลน์ (Realtime Geolocation Track)</h3>
              <p className="text-xs text-gray-500 mt-1">ตรวจสอบความเคลื่อนไหวการเปิดใช้งานเครื่องมัลติมีเดียคัดแยกจำแนกราย จังหวัด-อำเภอ</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeUsers.map((u, i) => (
                <div key={i} className="bg-[#001424] border border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-cyan-400/30 transition-all">
                  <div className="flex justify-between items-center relative z-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                        <MapPin size={10} /> {u.province}
                      </p>
                      <h4 className="text-lg font-bold text-white">อ. {u.district}</h4>
                    </div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-400">
                      {u.count} <span className="text-[10px] text-gray-500 font-bold">บอร์ด</span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💳 แท็บที่ 4: ข้อมูลบัญชีสมาชิกและการเงินสากล */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-2xl font-black text-cyan-300">ทะเบียนตรวจสอบการเงินและสมาชิกพรีเมียม</h3>
              <p className="text-xs text-gray-500 mt-1">คัดกรองข้อมูลยอดโอน ตรวจสอบสลิป หรืออนุมัติสิทธิ์การขยายขอบเขตความจุองค์กร</p>
            </div>

            <div className="bg-[#001424] border border-white/5 p-6 rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-gray-500">
                      <th className="pb-3">องค์กร/หน่วยงานย่อย</th>
                      <th className="pb-3">แพ็คเกจใช้งาน</th>
                      <th className="pb-3">ยอดชำระเงิน</th>
                      <th className="pb-3">สถานะตรวจหลักฐาน</th>
                      <th className="pb-3 text-center">คำสั่งกดอนุมัติสิทธิ์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-4 font-bold text-white flex items-center gap-2">
                          <CheckCircle2 size={14} className={p.status === 'Approved' ? 'text-green-400' : 'text-gray-600'} />
                          {p.org}
                        </td>
                        <td className="py-4 text-cyan-400 font-medium">{p.package}</td>
                        <td className="py-4 font-black text-white">{p.amount}</td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${p.status === 'Approved' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          {p.status === 'Pending' ? (
                            <button className="bg-cyan-500 text-black px-3 py-1 rounded-lg text-[10px] font-black hover:bg-cyan-400 transition-all">
                              APPROVE NOW
                            </button>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold">สิทธิ์เปิดสมบูรณ์</span>
                      )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}