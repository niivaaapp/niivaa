'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ปรับการเก็บสถานะ Message ให้แยกประเภทได้ชัดเจนเพื่อเปลี่ยนสี UI
  const [message, setMessage] = useState({ text: '', type: '' }); 
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage({ text: `เข้าสู่ระบบไม่สำเร็จ: ${error.message}`, type: 'error' });
      setLoading(false);
    } else {
      setMessage({ text: 'เข้าสู่ระบบสำเร็จ! กำลังพาท่านเข้าสู่ระบบ...', type: 'success' });
      
      // ดึงสิทธิ์ User เพื่อแยกเส้นทาง (Routing) ไปยัง Launchpad หรือ EventDashboard ตามสิทธิ์
      setTimeout(() => {
        router.push('/launchpad');
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050b1a] via-[#0c1633] to-[#050b1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* 🌟 เอฟเฟกต์แสงออร่าพื้นหลัง (Glowing Background) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* 📦 กล่อง Login Card (Glassmorphism) */}
      <div className="w-full max-w-md p-8 sm:p-10 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative animate-in fade-in zoom-in duration-500">
        
        {/* Header */}
        <div className="text-center mb-8">
          {/* นำโลโก้มาใส่ตรงนี้ได้ถ้ามี <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-4" /> */}
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
            NiiVaa Smart Media
          </h2>
          <p className="text-sm text-zinc-400 font-medium mt-2">
            ยินดีต้อนรับกลับเข้าสู่ระบบครับ
          </p>
        </div>

        {/* Message Alert Box */}
        {message.text && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-6 text-xs font-bold ${
            message.type === 'success' 
              ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-400' 
              : 'bg-red-950/50 border border-red-500/50 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">อีเมลผู้ใช้งาน</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
              <input 
                required 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@mail.com" 
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-cyan-500 focus:bg-black/60 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">รหัสผ่าน</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
              <input 
                required 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white outline-none focus:border-cyan-500 focus:bg-black/60 transition-all placeholder:text-zinc-600"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            disabled={loading} 
            type="submit" 
            className="w-full py-3.5 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-sm tracking-wide rounded-2xl flex justify-center items-center gap-2 transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-xs text-zinc-500 font-medium">
            ยังไม่มีบัญชี NiiVaa ID?{' '}
            <a href="/register" className="text-cyan-400 font-bold hover:text-cyan-300 hover:underline transition-all">
              สมัครสมาชิกใหม่
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}