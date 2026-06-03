'use client';

import { useState, useEffect } from 'react';

interface CloudSchedule {
  id: string;
  time: string;
  label: string;
  videoId: string;
  played: boolean;
}

export default function CloudNexusScheduler() {
  const [currentTime, setCurrentTime] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('AWAITING CLOUD SYNC');
  const [schedule, setSchedule] = useState<CloudSchedule[]>([]);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);

  // 🔴 เอาลิงก์ CSV ที่ได้จาก Google Sheets มาใส่ในเครื่องหมายคำพูดด้านล่างนี้ครับ 🔴
  const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTf0ICEFwI0ZDbNjyNE8kQ5FmXCymKUrrnWDV0bGcVLYRBXYXe8FEf3Go6IX196uEb-s9i0uPOLd1xu/pub?output=csv";

  // 1. Digital Heartbeat & Task Execution
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeFull = now.toLocaleTimeString('th-TH', { hour12: false });
      setCurrentTime(timeFull);

      if (!isActive) return;

      const [h, m] = timeFull.split(':');
      const nowShort = `${h}:${m}`;

      const task = schedule.find(item => item.time === nowShort && !item.played);
      if (task) triggerYouTube(task);
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, schedule]);

  // 2. ฟังก์ชันดูดข้อมูลจาก Google Sheets
  const syncWithCloud = async () => {
    try {
      setStatus('DOWNLOADING CLOUD DATA...');
      const response = await fetch(GOOGLE_SHEET_CSV_URL);
      const csvText = await response.text();
      
      // แปลง CSV เป็น Array (แยกแต่ละบรรทัด)
      const rows = csvText.split('\n').map(row => row.split(','));
      
      const newSchedule: CloudSchedule[] = [];
      
      // เริ่มอ่านจากบรรทัดที่ 2 (ข้าม Header)
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 8 && row[7].trim() !== '') { 
          newSchedule.push({
            id: `cloud_${i}`,
            time: row[7].trim(),     // Column H (Index 7) = เวลา
            label: row[1].trim(),    // Column B (Index 1) = ชื่อเพลง
            videoId: row[3].trim(),  // Column D (Index 3) = Video ID
            played: false
          });
        }
      }

      // เรียงลำดับตามเวลา
      newSchedule.sort((a, b) => a.time.localeCompare(b.time));
      setSchedule(newSchedule);
      setStatus('CLOUD SYNC COMPLETE');
      
    } catch (error) {
      console.error("Sync Failed:", error);
      setStatus('ERROR: CLOUD CONNECTION FAILED');
      alert("ไม่สามารถดึงข้อมูลได้ โปรดตรวจสอบลิงก์ CSV");
    }
  };

  // 3. เริ่มระบบ
  const startSystem = () => {
    if (schedule.length === 0) return alert("ERROR: NO TASKS. PLEASE SYNC FIRST.");
    setIsActive(true);
    setStatus('NEXUS AI: MONITORING ENGAGED');
  };

  // 4. สั่งเล่น YouTube
  const triggerYouTube = (task: CloudSchedule) => {
    setStatus(`BROADCASTING: ${task.label}`);
    setCurrentVideo(task.videoId); // เอารหัสวิดีโอไปใส่ใน Iframe
    
    setSchedule(prev => prev.map(item => item.id === task.id ? { ...item, played: true } : item));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* === TOP DASHBOARD === */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-black/40 p-8 md:p-12 rounded-[2rem] border border-white/5 shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div className="text-center md:text-left z-10">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tighter mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              CLOUD <span className="text-slate-100 italic font-light">LINK</span>
            </h1>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)] ${isActive ? 'bg-cyan-400 shadow-cyan-400/80 animate-pulse' : 'bg-red-500 shadow-red-500/80'}`}></div>
              <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase">{status}</p>
            </div>
          </div>

          <div className="mt-8 md:mt-0 relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative text-6xl md:text-8xl font-mono font-bold text-white bg-black/60 px-8 py-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
              <span className="drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tighter">
                {currentTime || '00:00:00'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* === LEFT: COMMAND TERMINAL & VIDEO PLAYER === */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Cloud Sync Button */}
            <button onClick={syncWithCloud}
              className="w-full py-6 bg-white/5 hover:bg-white/10 border border-cyan-500/50 text-cyan-400 rounded-[2rem] font-mono font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.1)] hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] active:scale-95 flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              SYNC WITH GOOGLE SHEETS
            </button>

            {/* Main Action Button */}
            <button onClick={startSystem} disabled={isActive}
              className={`w-full py-8 rounded-[2rem] font-black text-2xl tracking-widest uppercase transition-all duration-300 relative overflow-hidden group ${
                isActive 
                ? 'bg-black/40 text-cyan-600 border border-cyan-900 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
                : 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] active:scale-95 border border-white/20'
              }`}>
              <span className="relative z-10">{isActive ? 'SYSTEM ACTIVE' : 'INITIALIZE SYSTEM'}</span>
            </button>

            {/* HOLOGRAPHIC VIDEO PLAYER */}
            <div className="bg-black/40 p-4 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden group min-h-[250px] flex flex-col justify-center items-center">
              <h2 className="text-xs font-mono font-bold mb-4 text-slate-500 uppercase tracking-widest w-full text-left flex items-center gap-2">
                <span className="text-purple-500">{'//'}</span> BROADCAST MONITOR
              </h2>
              
              {currentVideo ? (
                <div className="w-full aspect-video rounded-xl overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`} 
                    title="YouTube video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="w-full aspect-video border border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-700">
                  <span className="font-mono text-xs uppercase tracking-widest animate-pulse">NO SIGNAL</span>
                </div>
              )}
            </div>

          </div>

          {/* === RIGHT: QUEUE MONITOR === */}
          <div className="lg:col-span-7">
            <div className="bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-xl h-full min-h-[600px] flex flex-col relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="font-mono text-slate-500 tracking-[0.2em] text-xs font-bold">
                  DATABASE QUEUE <span className="text-cyan-500 ml-2">[{schedule.length}]</span>
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {schedule.map((item) => (
                  <div key={item.id} className={`flex items-center p-5 rounded-2xl border transition-all duration-300 ${
                    item.played 
                    ? 'bg-black/20 border-transparent opacity-30 grayscale' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                  }`}>
                    <div className="w-28 text-3xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 to-blue-600">
                      {item.time}
                    </div>
                    <div className="flex-1 px-4 border-l border-white/10 ml-2 pl-6">
                      <div className="text-white font-bold text-xl uppercase tracking-wide">{item.label}</div>
                      <div className="text-slate-500 text-xs font-mono mt-1 flex items-center gap-2">
                        <span className="text-red-400">YT-ID:</span> {item.videoId}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {item.played ? (
                        <span className="text-slate-600 text-[10px] font-mono border border-slate-700 px-3 py-1 rounded">PLAYED</span>
                      ) : (
                        <span className="text-cyan-400 text-[10px] font-mono border border-cyan-900 bg-cyan-900/20 px-3 py-1 rounded animate-pulse">QUEUED</span>
                      )}
                    </div>
                  </div>
                ))}

                {schedule.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 py-20">
                    <div className="text-6xl mb-6">🗄️</div>
                    <p className="font-mono text-sm tracking-widest uppercase">DATABASE EMPTY</p>
                    <p className="font-mono text-[10px] mt-2">CLICK "SYNC WITH GOOGLE SHEETS" TO LOAD DATA</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}