"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserCheck, ArrowLeft, ArrowUp, ArrowDown, CheckCircle2, HelpCircle, Send, AlertTriangle, MessageSquare, Camera, Loader2, X, Image as ImageIcon, RefreshCw, UserPlus, Upload } from 'lucide-react';

interface VipGuest {
  id: string;
  attendee_id?: string;
  prefix?: string;
  full_name: string;
  position: string;
  organization: string;
  bio_note?: string;
  profile_image_url?: string;
  arrival_status: 'pending' | 'arrived' | 'seated'; 
  is_read: boolean; 
  sort_order: number;
  priority_level: number;
}

// แยก Component หลักออกมาเพื่อรองรับการดึง Search Params
function VipShowtimeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id') || 'current';

  const [vipList, setVipList] = useState<VipGuest[]>([]);
  const [time, setTime] = useState(new Date());

  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // States สำหรับฟอร์มเพิ่มรายชื่อด่วน
  const [quickName, setQuickName] = useState('');
  const [quickPosition, setQuickPosition] = useState('');
  const [quickOrg, setQuickOrg] = useState('');
  const [quickBio, setQuickBio] = useState('');
  const [quickFile, setQuickFile] = useState<File | null>(null);
  const [isSavingQuickVip, setIsSavingQuickVip] = useState(false);

  // Intercom States (SM <-> MC)
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState<boolean>(false);
  const [urgentIntercomMsg, setUrgentIntercomMsg] = useState<string>('');
  const [urgentIntercomImage, setUrgentIntercomImage] = useState<string>('');
  const [showUrgentBanner, setShowUrgentBanner] = useState<boolean>(false);
  const [assistantInputText, setAssistantInputText] = useState<string>('');
  const [mcUploadFile, setMcUploadFile] = useState<File | null>(null);
  const [isMcUploading, setIsMcUploading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchVipData = async () => {
    const { data, error } = await supabase
      .from('event_vips')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('priority_level', { ascending: true });

    if (!error && data) {
      setVipList(data);
    }
  };

  const fetchIntercomState = async () => {
    const { data } = await supabase.from('screen_state').select('sm_intercom_msg, sm_intercom_image').eq('id', 'current').single();
    if (data && (data.sm_intercom_msg || data.sm_intercom_image)) {
      setUrgentIntercomMsg(data.sm_intercom_msg || '');
      setUrgentIntercomImage(data.sm_intercom_image || '');
      setShowUrgentBanner(true);
    }
  };

  useEffect(() => {
    fetchVipData();
    fetchIntercomState();

    const vipChannel = supabase.channel('vip_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_vips' }, fetchVipData)
      .subscribe();

    const intercomSub = supabase.channel('vip_intercom_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'screen_state', filter: 'id=eq.current' }, (payload: any) => {
        if (payload.new && (payload.new.sm_intercom_msg !== undefined || payload.new.sm_intercom_image !== undefined)) {
          setUrgentIntercomMsg(payload.new.sm_intercom_msg || '');
          setUrgentIntercomImage(payload.new.sm_intercom_image || '');
          setShowUrgentBanner(!!(payload.new.sm_intercom_msg || payload.new.sm_intercom_image));
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(vipChannel);
      supabase.removeChannel(intercomSub);
    };
  }, [eventId]);

  const handleToggleReadStatus = async (vip: VipGuest) => {
    const newStatus = !vip.is_read;
    setVipList(prev => prev.map(v => v.id === vip.id ? { ...v, is_read: newStatus } : v));
    await supabase.from('event_vips').update({ is_read: newStatus }).eq('id', vip.id);
  };

  const handleSyncVipFromAttendees = async () => {
    setIsSyncing(true);
    try {
      const { data: attendees, error: fetchErr } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('attendee_type', 'vip');

      if (fetchErr) {
        alert(`❌ ดึงข้อมูลล้มเหลว: ${fetchErr.message}`);
        setIsSyncing(false);
        return;
      }

      if (!attendees || attendees.length === 0) {
        alert('📢 ไม่พบรายชื่อคุณสมบัติ "vip" ในตารางทะเบียนหลัก');
        setIsSyncing(false);
        return;
      }

      const { data: existingVips } = await supabase.from('event_vips').select('attendee_id');
      const existingIds = new Set(existingVips?.map(v => v.attendee_id) || []);
      const newAttendees = attendees.filter(a => !existingIds.has(a.id));

      if (newAttendees.length === 0) {
        alert('✅ รายชื่อบนบอร์ดอัปเดตตรงกับระบบลงทะเบียนเป็นปัจจุบันแล้วครับ');
        setIsSyncing(false);
        return;
      }

      const insertRows = newAttendees.map((att, idx) => {
        let finalEventId = null;
        if (att.event_id) finalEventId = att.event_id;
        else if (eventId && eventId !== 'current') finalEventId = eventId;

        return {
          event_id: finalEventId, 
          attendee_id: att.id,
          prefix: att.prefix || '',
          full_name: `${att.prefix || ''}${att.fullname}`.trim(),
          position: att.position || 'ผู้มีเกียรติ',
          organization: att.organization || 'ไม่ระบุหน่วยงาน',
          bio_note: att.bio_note || '',
          role_in_event: att.role_in_event || 'VIP',
          priority_level: att.priority_level || 50,
          sort_order: (vipList.length + idx + 1) * 10, 
          arrival_status: att.is_present ? 'arrived' : 'pending' 
        };
      });

      const { error: insertError } = await supabase.from('event_vips').insert(insertRows);
      if (!insertError) {
        alert(`🔄 ดึงรายชื่อ VIP รายใหม่เข้ามาแสตนบายคิวสำเร็จ ${insertRows.length} ท่าน!`);
        fetchVipData();
      } else {
        alert(`❌ ฐานข้อมูลปฏิเสธ: ${insertError.message}`);
      }
    } catch (err: any) { alert(`❌ ขัดข้อง: ${err.message}`); }
    setIsSyncing(false);
  };

  const handleSaveQuickVip = async () => {
    if (!quickName.trim()) { alert('กรุณากรอกชื่อ-นามสกุล VIP'); return; }
    setIsSavingQuickVip(true);
    try {
      let imageUrl = '';
      if (quickFile) {
        const ext = quickFile.name.split('.').pop();
        const fileName = `quick_vip_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('event-media').upload(`vips/${fileName}`, quickFile);
        if (!upErr) imageUrl = supabase.storage.from('event-media').getPublicUrl(`vips/${fileName}`).data.publicUrl;
      }

      const nextOrder = vipList.length > 0 ? Math.max(...vipList.map(v => v.sort_order || 0)) + 10 : 10;
      let finalEventId = eventId !== 'current' ? eventId : null;

      const { error } = await supabase.from('event_vips').insert([{
        event_id: finalEventId,
        full_name: quickName,
        position: quickPosition || 'ผู้มีเกียรติ',
        organization: quickOrg || 'ไม่ระบุหน่วยงาน',
        bio_note: quickBio,
        profile_image_url: imageUrl,
        arrival_status: 'arrived', 
        sort_order: nextOrder,
        priority_level: 10 
      }]);

      if (!error) {
        alert(`✅ แทรกคิว VIP ด่วนหน้างานสำเร็จ!`);
        setQuickName(''); setQuickPosition(''); setQuickOrg(''); setQuickBio(''); setQuickFile(null);
        setIsAddModalOpen(false);
        fetchVipData();
      }
    } catch (err) { alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลด่วน'); }
    setIsSavingQuickVip(false);
  };

  const handleMoveVip = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === vipList.length - 1) return;

    const currentVip = vipList[index];
    const swapVip = vipList[direction === 'up' ? index - 1 : index + 1];

    const newCurrentOrder = swapVip.sort_order || (direction === 'up' ? currentVip.sort_order - 1 : currentVip.sort_order + 1);
    const newSwapOrder = currentVip.sort_order || (direction === 'up' ? swapVip.sort_order + 1 : swapVip.sort_order - 1);

    setVipList(prev => {
      const updated = prev.map(v => {
        if (v.id === currentVip.id) return { ...v, sort_order: newCurrentOrder };
        if (v.id === swapVip.id) return { ...v, sort_order: newSwapOrder };
        return v;
      });
      return updated.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    await supabase.from('event_vips').update({ sort_order: newCurrentOrder }).eq('id', currentVip.id);
    await supabase.from('event_vips').update({ sort_order: newSwapOrder }).eq('id', swapVip.id);
  };

  const handleSendHelpRequest = async () => {
    if (!assistantInputText.trim() && !mcUploadFile) return;
    setIsMcUploading(true);
    try {
      let imageUrl = '';
      if (mcUploadFile) {
        const ext = mcUploadFile.name.split('.').pop();
        const fileName = `mc_req_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('intercom-media').upload(`mc_requests/${fileName}`, mcUploadFile);
        if (!upErr) {
          imageUrl = supabase.storage.from('intercom-media').getPublicUrl(`mc_requests/${fileName}`).data.publicUrl;
        }
      }

      await supabase.from('screen_state').update({ 
        mc_help_request: assistantInputText.trim(), 
        mc_help_image: imageUrl, 
        updated_at: new Date().toISOString() 
      }).eq('id', 'current');

      setAssistantInputText(''); 
      setMcUploadFile(null); 
      setIsHelpPanelOpen(false);
      alert('🚀 ส่งภาพถ่ายและข้อความด่วน ไปกะพริบแจ้งเตือนที่ศูนย์ SM สำเร็จแล้วครับ!');
    } catch (err) { 
      alert('ระบบส่งสัญญาณภาพขัดข้อง'); 
    }
    setIsMcUploading(false);
  };

  const unreadVips = vipList.filter(v => !v.is_read);
  const currentReadingVip = unreadVips[0] || null;
  const nextReadingVip = unreadVips[1] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c1633] via-[#17244d] to-[#0c1633] text-white flex flex-col font-sans select-none overflow-hidden relative">
      
      {/* แบนเนอร์รับประกาศด่วนจาก SM */}
      {showUrgentBanner && (urgentIntercomMsg || urgentIntercomImage) && (
        <div className="absolute top-4 left-4 right-4 z-[9999] bg-gradient-to-r from-red-700 to-amber-600 border-2 border-white/20 p-4 rounded-2xl shadow-2xl flex items-start justify-between gap-4 animate-in slide-in-from-top-6">
          <div className="flex gap-4 flex-1 text-left">
            <AlertTriangle size={28} className="text-white animate-bounce mt-1" />
            <div>
              <span className="bg-white text-red-700 font-black px-2 py-0.5 rounded text-[10px] uppercase">ประกาศด่วนจากผู้กำกับเวที (SM)</span>
              {urgentIntercomMsg && <p className="text-base md:text-lg font-black text-white mt-1">{urgentIntercomMsg}</p>}
              {urgentIntercomImage && <img src={urgentIntercomImage} alt="SM Alert" className="mt-3 max-h-40 rounded-xl border border-white/50" />}
            </div>
          </div>
          <button onClick={() => { setShowUrgentBanner(false); supabase.from('screen_state').update({ sm_intercom_msg: '', sm_intercom_image: '' }).eq('id', 'current'); }} className="bg-black/30 hover:bg-black/50 px-3 py-2 rounded-xl font-bold text-xs border border-white/20">รับทราบ</button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-[#0b1430]/90 backdrop-blur-2xl border-b border-white/10 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-40 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"><ArrowLeft size={20}/></button>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <UserCheck size={24} className="text-amber-400" /> รายชื่อแนะนำประธานและแขกผู้มีเกียรติ
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <button onClick={handleSyncVipFromAttendees} disabled={isSyncing} className="bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-400 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all">
                {isSyncing ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />} ปรับปรุงรายชื่อ VIP
              </button>

              <button onClick={() => setIsAddModalOpen(true)} className="bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-400 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all">
                <UserPlus size={12} /> เพิ่มรายชื่อด่วนหน้างาน
              </button>

              {/* ปุ่มเปิดห้องส่ง Intercom ข้อความใต้ภาพ */}
              <button onClick={() => setIsHelpPanelOpen(!isHelpPanelOpen)} className="bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-300 font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all">
                <MessageSquare size={12} /> 💬 เปิดกล้อง INTERCOM ส่ง SMS หา SM
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 self-end md:self-center">
          <div className="text-right hidden lg:block">
            <div className="text-2xl font-mono font-black text-cyan-400 leading-none">{time.toLocaleTimeString('th-TH')}</div>
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">เวลาปัจจุบัน</div>
          </div>
          <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 object-contain" />
        </div>
      </div>

      {/* DISPLAY WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* ซ้าย: โพยการ์ดใหญ่คู่ */}
        <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pb-6 pr-1 custom-scrollbar">
          
          {currentReadingVip ? (
            <div className="bg-[#14234c]/90 border border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 active:scale-[0.995]" onClick={() => handleToggleReadStatus(currentReadingVip)}>
              <div className="p-5 flex gap-5 items-center flex-1">
                <div className="flex flex-col items-center justify-center bg-black/30 px-3 py-5 rounded-2xl shrink-0 min-w-[65px]">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">ลำดับ</span>
                  <span className="text-3xl font-mono font-black text-amber-400">{vipList.findIndex(v => v.id === currentReadingVip.id) + 1}</span>
                </div>
                {currentReadingVip.profile_image_url ? (
                  <img src={currentReadingVip.profile_image_url} alt="VIP" className="w-24 h-28 object-cover rounded-xl border-2 border-amber-400/60 shadow-md bg-zinc-800" />
                ) : (
                  <div className="w-24 h-28 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center text-zinc-600"><ImageIcon size={28} /></div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-[9px] bg-amber-500 text-black font-black px-2 py-0.5 rounded uppercase tracking-wider">🔥 คิวปัจจุบัน (READING NOW)</span>
                  <h2 className="text-2xl md:text-3xl font-black text-amber-400 tracking-wide truncate mt-1">{currentReadingVip.full_name}</h2>
                  <p className="text-base font-bold text-zinc-200 mt-0.5">{currentReadingVip.position}</p>
                  <p className="text-xs text-cyan-400 font-medium mt-0.5">{currentReadingVip.organization}</p>
                </div>
              </div>
              <div className="bg-[#243565] border-t border-white/5 px-5 py-2.5 text-left">
                <span className="text-[9px] text-cyan-400 font-black uppercase tracking-widest block">หมายเหตุพิเศษ / คำกล่าวแนะนำ (BIO_NOTE)</span>
                <p className="text-zinc-300 text-xs font-semibold mt-0.5 truncate">{currentReadingVip.bio_note || 'ไม่มีหมายเหตุกำกับเพิ่มเติม'}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 border border-dashed border-white/10 bg-black/10 rounded-3xl flex flex-col items-center justify-center text-zinc-500 p-8">
              <CheckCircle2 size={48} className="text-zinc-600 mb-2" />
              <p className="text-lg font-black uppercase">ไม่มีคิวรายชื่อค้างอ่านแนะนำในบอร์ด</p>
            </div>
          )}

          {/* ลำดับที่ 2 (คิวถัดไป) */}
          {nextReadingVip && (
            <div className="bg-[#14234c]/50 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between opacity-50 scale-[0.99] transition-all" onClick={() => handleToggleReadStatus(nextReadingVip)}>
              <div className="p-4 flex gap-5 items-center flex-1">
                <div className="flex flex-col items-center justify-center bg-black/20 px-3 py-3 rounded-xl shrink-0 min-w-[55px]">
                  <span className="text-[8px] font-bold text-zinc-600 uppercase">ลำดับ</span>
                  <span className="text-xl font-mono font-black text-zinc-400">{vipList.findIndex(v => v.id === nextReadingVip.id) + 1}</span>
                </div>
                {nextReadingVip.profile_image_url ? (
                  <img src={nextReadingVip.profile_image_url} alt="VIP" className="w-16 h-20 object-cover rounded-lg border border-white/10 grayscale" />
                ) : (
                  <div className="w-16 h-20 bg-black/40 rounded-lg border border-white/5 flex items-center justify-center text-zinc-700"><ImageIcon size={20} /></div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">คิวถัดไป (UP NEXT PREPARE)</span>
                  <h3 className="text-xl font-black text-zinc-300 truncate mt-0.5">{nextReadingVip.full_name}</h3>
                  <p className="text-xs font-bold text-zinc-500 truncate mt-0.5">{nextReadingVip.position} • <span className="text-cyan-600">{nextReadingVip.organization}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ขวา: บอร์ดรายชื่อรวม */}
        <div className="lg:col-span-5 bg-black/30 border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl backdrop-blur-md h-[calc(100vh-170px)]">
          <div className="p-3.5 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
            <span className="font-black text-xs text-zinc-400 uppercase tracking-widest">บอร์ดรายชื่อรวมหลังบ้าน</span>
            <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">รวม {vipList.length} รายชื่อ</span>
          </div>

          <div className="grid grid-cols-[10px_30px_1fr_40px] gap-3 px-4 py-2 bg-black/40 border-b border-white/10 text-[9px] font-black text-zinc-500 uppercase tracking-wider shrink-0">
            <span>ไฟ</span>
            <span className="text-center">คิว</span>
            <span>ชื่อแนะนำ - สังกัดหน่วยงาน</span>
            <span className="text-center">สลับ</span>
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-1 overflow-x-hidden custom-scrollbar">
            {vipList.map((vip, idx) => {
              const isReadingNow = currentReadingVip?.id === vip.id;
              let lightColor = "bg-zinc-700"; 
              if (vip.arrival_status === 'arrived' || vip.arrival_status === 'seated') lightColor = "bg-emerald-500"; 
              if (isReadingNow) lightColor = "bg-amber-400 animate-pulse"; 

              return (
                <div key={vip.id} className={`grid grid-cols-[10px_30px_1fr_40px] gap-3 items-center p-2 rounded-xl border transition-all duration-200
                  ${vip.is_read 
                    ? 'bg-black/20 border-transparent opacity-20 saturate-0 scale-[0.98]' 
                    : isReadingNow ? 'bg-amber-500/10 border-amber-500/30 shadow-md scale-[1.01]' : 'bg-[#14234c]/40 border-white/5 hover:border-zinc-700'}
                `}>
                  <div className={`w-2 h-2 rounded-full ${lightColor}`} />
                  <div className="text-xs font-mono font-black text-zinc-600 text-center">{idx + 1}</div>
                  
                  <div className="min-w-0 cursor-pointer text-left" onClick={() => handleToggleReadStatus(vip)}>
                    <div className={`text-xs font-black truncate tracking-wide transition-colors ${vip.is_read ? 'text-zinc-600 line-through' : isReadingNow ? 'text-amber-400' : 'text-zinc-200'}`}>
                      {vip.full_name}
                    </div>
                    <div className="text-[9px] text-zinc-500 truncate mt-0.5">{vip.position} {vip.arrival_status === 'pending' && <span className="text-zinc-600 font-bold">(รอเช็คอิน)</span>}</div>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMoveVip(idx, 'up')} disabled={idx === 0 || vip.is_read} className="bg-black/40 hover:bg-zinc-800 disabled:opacity-10 rounded p-0.5 text-zinc-500 flex justify-center"><ArrowUp size={11}/></button>
                    <button onClick={() => handleMoveVip(idx, 'down')} disabled={idx === vipList.length - 1 || vip.is_read} className="bg-black/40 hover:bg-zinc-800 disabled:opacity-10 rounded p-0.5 text-zinc-500 flex justify-center"><ArrowDown size={11}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP INTERCOM */}
      {isHelpPanelOpen && (
        <div className="fixed top-24 right-6 z-[9999] w-[340px] bg-[#0c1633]/95 border-2 border-cyan-500/50 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5"><HelpCircle size={14}/> ส่งภาพและข้อความด่วนหา SM</span>
            <button onClick={() => setIsHelpPanelOpen(false)} className="text-zinc-500 hover:text-white"><X size={16}/></button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-cyan-400 font-black uppercase text-left block">1. เลือกหรือถ่ายภาพกระดาษโน้ตด่วน:</span>
            
            {mcUploadFile ? (
              <div className="relative border border-cyan-500/30 rounded-xl p-1 bg-black/40 flex justify-center items-center">
                <img src={URL.createObjectURL(mcUploadFile)} alt="Preview" className="max-h-36 w-auto rounded-lg object-contain" />
                <button onClick={() => setMcUploadFile(null)} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 shadow-md transition-colors"><X size={12}/></button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-white/10 hover:border-cyan-400/50 bg-black/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-28 text-center group">
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setMcUploadFile(e.target.files?.[0] || null)} />
                <Camera size={24} className="text-zinc-500 group-hover:text-cyan-400 transition-colors animate-pulse" />
                <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-bold">กดเพื่อเปิดกล้องมือถือ/แท็บเล็ต ถ่ายรูปทันที</span>
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
            <span className="text-[10px] text-cyan-400 font-black uppercase text-left block">2. พิมพ์ข้อความคำอธิบายใต้ภาพ:</span>
            <textarea 
              rows={2}
              value={assistantInputText} 
              onChange={e => setAssistantInputText(e.target.value)} 
              placeholder="พิมพ์คำอธิบายประกอบภาพฉุกเฉินชิ้นนี้..." 
              className="w-full bg-black border border-white/10 px-3 py-2 text-xs rounded-xl outline-none focus:border-cyan-500 text-white font-bold placeholder-zinc-600" 
            />
          </div>

          <button 
            onClick={handleSendHelpRequest} 
            disabled={isMcUploading || (!assistantInputText.trim() && !mcUploadFile)} 
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex justify-center items-center gap-1.5"
          >
            {isMcUploading ? <Loader2 size={14} className="animate-spin"/> : <Send size={12}/>} ยิงรูปและข้อความเข้าศูนย์ควบคุม SM
          </button>
        </div>
      )}

      {/* POPUP MODAL: เพิ่มรายชื่อด่วน */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#111827] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-black text-sm text-amber-400 flex items-center gap-1.5"><UserPlus size={16}/> บันทึกเพิ่มรายชื่อประธาน/VIP ด่วนหน้างาน</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block">📷 ถ่ายภาพ/แนบรูป VIP (ลงถัง event-media):</span>
                <label className="border border-dashed border-white/10 hover:border-amber-500/50 bg-black/40 rounded-xl p-3 flex flex-col items-center justify-center gap-1 cursor-pointer h-20 text-center">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setQuickFile(e.target.files?.[0] || null)} />
                  {quickFile ? <span className="text-xs text-emerald-400 font-bold flex items-center gap-1"><Upload size={14}/> {quickFile.name.substring(0,20)}</span> : <><Camera size={20} className="text-zinc-500"/><span className="text-[10px] text-zinc-500 font-bold">เปิดกล้องถ่ายสด หรือเลือกไฟล์รูป</span></>}
                </label>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 font-bold block">ชื่อ-นามสกุล (พร้อมคำนำหน้า):</span>
                <input type="text" value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="เช่น พล.ต.ต.รักชาติ เก่งกาจ" className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold block">ตำแหน่ง/ยศ:</span>
                  <input type="text" value={quickPosition} onChange={e => setQuickPosition(e.target.value)} placeholder="ผู้บังคับการ..." className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-medium" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold block">สังกัดหน่วยงาน:</span>
                  <input type="text" value={quickOrg} onChange={e => setQuickOrg(e.target.value)} placeholder="ตำรวจภูธรภาค..." className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500 text-white font-medium" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 font-bold text-xs rounded-xl">ยกเลิก</button>
              <button onClick={handleSaveQuickVip} disabled={isSavingQuickVip} className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-500 text-black font-black text-xs rounded-xl flex justify-center items-center gap-1">
                {isSavingQuickVip ? <Loader2 size={14} className="animate-spin text-black"/> : '💾 บันทึกและสแตนบายคิว'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER WATERMARK */}
      <div className="w-full text-center py-2 border-t border-white/5 bg-black/10 mt-auto shrink-0">
        <span className="text-[10px] text-white/10 font-bold tracking-widest uppercase">POWERED BY NIIVAA SMARTEVENT</span>
      </div>
      
    </div>
  );
}

// ห่อหุ้ม Component หลักด้วย Suspense เสมอตามข้อกำหนด Next.js (ป้องกัน Error ตอน Build)
export default function VipShowtimePrompter() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c1633] flex items-center justify-center text-white font-mono animate-pulse">Loading VIP Prompter...</div>}>
      <VipShowtimeContent />
    </Suspense>
  );
}