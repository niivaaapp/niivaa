'use client';

import { useState, useEffect } from 'react';

interface ScheduleItem {
  id: string;
  time: string;
  fileName: string;
  label: string;
  played: boolean;
}

export default function NeonCyberScheduler() {
  const [currentTime, setCurrentTime] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('SYSTEM STANDBY');
  
  const availableFiles = [
    { name: 'แผนงานและคำที่ใช้_Charon.wav', path: 'แผนงานและคำที่ใช้_Charon.wav' },
    { name: 'SYSTEM_ALERT_01', path: 'bell.mp3' },
  ];

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [newTime, setNewTime] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState(availableFiles[0].path);
  const [customFile, setCustomFile] = useState('');

  // 1. Digital Heartbeat
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeFull = now.toLocaleTimeString('th-TH', { hour12: false });
      setCurrentTime(timeFull);

      if (!isActive) return;

      const [h, m] = timeFull.split(':');
      const nowShort = `${h}:${m}`;

      const task = schedule.find(item => item.time === nowShort && !item.played);
      if (task) triggerSound(task);
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, schedule]);

  const addSchedule = () => {
    if (!newTime || !newLabel) return alert("REQUIRED: TIME & LABEL");
    let finalFile = customFile ? customFile.replace(/^\/+/, '') : selectedFile;

    const newItem: ScheduleItem = {
      id: Date.now().toString(),
      time: newTime,
      label: newLabel,
      fileName: finalFile,
      played: false
    };

    setSchedule(prev => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)));
    setNewTime('');
    setNewLabel('');
    setCustomFile('');
    setStatus(`QUEUE ADDED: ${newLabel}`);
  };

  const removeSchedule = (id: string) => setSchedule(schedule.filter(item => item.id !== id));

  const startSystem = () => {
    if (schedule.length === 0) return alert("ERROR: NO TASKS IN QUEUE");
    setIsActive(true);
    setStatus('NEXUS AI: MONITORING ENGAGED');
  };

  const triggerSound = (task: ScheduleItem) => {
    const audioUrl = `/${task.fileName}`;
    const alertAudio = new Audio(audioUrl);
    
    alertAudio.play().then(() => {
        setStatus(`EXECUTING: ${task.label}`);
        setSchedule(prev => prev.map(item => item.id === task.id ? { ...item, played: true } : item));
    }).catch(e => {
        setStatus(`ERROR 404: ${task.fileName}`);
        setSchedule(prev => prev.map(item => item.id === task.id ? { ...item, played: true } : item));
    });
  };

  const testAudioFile = () => {
    let finalFile = customFile ? customFile.replace(/^\/+/, '') : selectedFile;
    const testPlayer = new Audio(`/${finalFile}`);
    testPlayer.play()
      .then(() => alert(`AUDIO LINK: STABLE [/${finalFile}]`))
      .catch(() => alert(`AUDIO LINK: FAILED [/${finalFile}]`));
  };

  return (
    // เปลี่ยนพื้นหลังเป็นสีดำสนิท (Cyberpunk vibe)
    <div className="min-h-screen bg-[#050505] text-slate-200 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Background Decorative Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* === TOP NEON DASHBOARD === */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-black/40 p-8 md:p-12 rounded-[2rem] border border-slate-800 shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-xl relative overflow-hidden">
          {/* Cyber Edge decoration */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div className="text-center md:text-left z-10">
            <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 tracking-tighter mb-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
              NEXUS <span className="text-slate-100 italic font-light">CORE</span>
            </h1>
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)] ${isActive ? 'bg-cyan-400 shadow-cyan-400/80 animate-pulse' : 'bg-red-500 shadow-red-500/80'}`}></div>
              <p className="text-cyan-400 font-mono text-sm tracking-widest uppercase">{status}</p>
            </div>
          </div>

          <div className="mt-8 md:mt-0 relative group">
            {/* Holographic Clock Effect */}
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative text-6xl md:text-8xl font-mono font-bold text-white bg-black/60 px-8 py-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md flex items-center justify-center">
              <span className="drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] tracking-tighter">
                {currentTime || '00:00:00'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* === LEFT: COMMAND TERMINAL === */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-black/50 p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <h2 className="text-lg font-mono font-bold mb-8 text-white uppercase tracking-widest flex items-center gap-2">
                <span className="text-cyan-500">{'//'}</span> Input Parameters
              </h2>
              
              <div className="space-y-6 relative z-10">
                <div className="group/input">
                  <input type="time" value={newTime} onChange={(e)=>setNewTime(e.target.value)}
                    className="w-full bg-slate-900/50 p-4 rounded-xl border border-white/10 text-3xl font-mono text-cyan-300 outline-none focus:border-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"/>
                </div>

                <div>
                  <input type="text" placeholder="TASK IDENTIFIER" value={newLabel} onChange={(e)=>setNewLabel(e.target.value)}
                    className="w-full bg-slate-900/50 p-4 rounded-xl border border-white/10 text-white placeholder-slate-600 font-mono outline-none focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all uppercase"/>
                </div>

                <div>
                  <select 
                    className="w-full bg-slate-900/50 p-4 rounded-xl border border-white/10 text-slate-300 font-mono outline-none focus:border-cyan-500 mb-3 appearance-none"
                    value={selectedFile}
                    onChange={(e) => { setSelectedFile(e.target.value); setCustomFile(''); }}
                  >
                    {availableFiles.map(f => <option key={f.path} value={f.path} className="bg-slate-900">{f.name}</option>)}
                    <option value="custom" className="bg-slate-900"> MANUAL INPUT</option>
                  </select>
                  
                  {selectedFile === 'custom' && (
                    <input type="text" placeholder="filename.wav" value={customFile} onChange={(e)=>setCustomFile(e.target.value)}
                      className="w-full bg-slate-900/80 p-4 rounded-xl border border-purple-500/50 outline-none text-cyan-300 font-mono text-sm mb-3 shadow-[0_0_10px_rgba(168,85,247,0.2)]" />
                  )}
                  
                  <button onClick={testAudioFile} className="text-[10px] text-cyan-600 hover:text-cyan-400 font-mono tracking-widest w-full text-right uppercase transition-colors">
                    [ VERIFY AUDIO LINK ]
                  </button>
                </div>

                <button onClick={addSchedule} className="w-full py-4 mt-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-mono font-bold tracking-widest uppercase transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95">
                  Append to Queue +
                </button>
              </div>
            </div>

            {/* Giant Action Button */}
            <button onClick={startSystem} disabled={isActive}
              className={`w-full py-8 rounded-[2rem] font-black text-2xl tracking-widest uppercase transition-all duration-300 relative overflow-hidden group ${
                isActive 
                ? 'bg-black/40 text-cyan-600 border border-cyan-900 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
                : 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] active:scale-95 border border-white/20'
              }`}>
              <span className="relative z-10">{isActive ? 'SYSTEM ACTIVE' : 'INITIALIZE'}</span>
            </button>
          </div>

          {/* === RIGHT: QUEUE MONITOR === */}
          <div className="lg:col-span-8">
            <div className="bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-xl h-full min-h-[600px] flex flex-col relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none"></div>

              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="font-mono text-slate-500 tracking-[0.2em] text-xs font-bold">
                  ACTIVE QUEUE <span className="text-cyan-500 ml-2">[{schedule.length}]</span>
                </h2>
                <button onClick={() => setSchedule([])} className="text-[10px] font-mono text-red-500/50 hover:text-red-400 tracking-widest uppercase transition-colors">
                  [ PURGE ALL ]
                </button>
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
                        <span className="text-purple-400">SRC:</span> {item.fileName}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {item.played ? (
                        <span className="text-slate-600 text-[10px] font-mono border border-slate-700 px-3 py-1 rounded">COMPLETED</span>
                      ) : (
                        <span className="text-cyan-400 text-[10px] font-mono border border-cyan-900 bg-cyan-900/20 px-3 py-1 rounded animate-pulse">PENDING</span>
                      )}
                      <button onClick={()=>removeSchedule(item.id)} className="text-slate-600 hover:text-red-500 p-2 rounded-full hover:bg-red-500/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {schedule.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 py-20">
                    <div className="text-6xl mb-6">∅</div>
                    <p className="font-mono text-sm tracking-widest uppercase">QUEUE IS EMPTY</p>
                    <p className="font-mono text-[10px] mt-2">AWAITING INPUT PARAMETERS</p>
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