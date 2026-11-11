// app/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// 🌟 ปรับปรุง redirectUrl และธีมสี
const APP_CONFIGS = {
  media: {
    title: 'NiiVaa SmartMedia',
    redirectUrl: '/welcome?status=returning_user&app=media',
    gradientText: 'from-cyan-400 to-blue-500',
    buttonBg: 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
    glowBg: 'bg-cyan-600/20',
    shadow: 'shadow-[0_0_20px_rgba(8,145,178,0.4)]',
    linkColor: 'text-cyan-400 hover:text-cyan-300',
  },
  event: {
    title: 'NiiVaa SmartEvent',
    redirectUrl: '/welcome?status=returning_user&app=event',
    gradientText: 'from-purple-400 to-indigo-400',
    buttonBg: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500',
    glowBg: 'bg-purple-600/20',
    shadow: 'shadow-[0_0_20px_rgba(147,51,234,0.4)]',
    linkColor: 'text-purple-400 hover:text-purple-300',
  },
  exam: {
    title: 'NiiVaa SmartExam',
    redirectUrl: '/welcome?status=returning_user&app=exam',
    // 🌟 เปลี่ยนสีตามความต้องการ: Dark Navy (slate-900) ไล่ไป Amber (amber-500)
    gradientText: 'from-slate-900 to-amber-500', 
    buttonBg: 'from-slate-900 to-amber-500 hover:from-slate-800 hover:to-amber-400',
    glowBg: 'bg-amber-500/20',
    shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    linkColor: 'text-amber-500 hover:text-amber-400',
  },
  default: {
    title: 'NiiVaa Workspace',
    redirectUrl: '/',
    gradientText: 'from-blue-400 to-emerald-400',
    buttonBg: 'from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500',
    glowBg: 'bg-blue-600/20',
    shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.4)]',
    linkColor: 'text-blue-400 hover:text-blue-300',
  }
};

function LoginForm() {
  const searchParams = useSearchParams();
  const appParam = searchParams.get('app') as keyof typeof APP_CONFIGS;
  const nextUrl = searchParams.get('next'); 

  const currentApp = APP_CONFIGS[appParam] || APP_CONFIGS.default;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

      setTimeout(() => {
        router.push(nextUrl || currentApp.redirectUrl);
        router.refresh(); 
      }, 1500);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl || currentApp.redirectUrl)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
      },
    });

    if (error) {
      setMessage({ text: `Google Login Error: ${error.message}`, type: 'error' });
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full blur-[100px] pointer-events-none ${currentApp.glowBg}`}></div>

      <div className="w-full max-w-md p-8 sm:p-10 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative animate-in fade-in zoom-in duration-500">

        <div className="text-center mb-8">
            {/* 🌟 แสดงรูปโลโก้ที่ถูกต้องจากโฟลเดอร์ public */}
            {appParam === 'exam' ? (
              <img 
                src="/niivaa_smartexam_logo.png" 
                alt="NiiVaa SmartExam" 
                className="h-14 mx-auto object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]" 
              />
            ) : (
              <h2 className={`text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentApp.gradientText} tracking-tight`}>
                {currentApp.title}
              </h2>
            )}
          <p className="text-sm text-zinc-400 font-medium mt-3">
            ยินดีต้อนรับกลับเข้าสู่ระบบครับ
          </p>
        </div>

        {message.text && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-6 text-xs font-bold ${message.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-400'
              : 'bg-red-950/50 border border-red-500/50 text-red-400'
            }`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 mb-5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm tracking-wide rounded-2xl flex justify-center items-center gap-3 transition-all shadow-md disabled:opacity-50"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            เข้าสู่ระบบด้วย Google
          </button>

          <div className="flex items-center gap-4 mb-5">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">หรือใช้อีเมล</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">อีเมลผู้ใช้งาน</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white outline-none focus:border-white/30 focus:bg-black/60 transition-all placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 font-black uppercase tracking-widest pl-1">รหัสผ่าน</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-12 py-3.5 text-sm text-white outline-none focus:border-white/30 focus:bg-black/60 transition-all placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className={`w-full py-3.5 mt-2 bg-gradient-to-r ${currentApp.buttonBg} text-white font-black text-sm tracking-wide rounded-2xl flex justify-center items-center gap-2 transition-all ${currentApp.shadow} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-xs text-zinc-500 font-medium">
            ยังไม่มีบัญชี NiiVaa ID?{' '}
            <Link
              href={`/signup${appParam ? `?app=${appParam}` : ''}`}
              className={`${currentApp.linkColor} font-bold transition-all underline decoration-transparent hover:decoration-current`}
            >
              สมัครสมาชิกใหม่
            </Link>
          </p>
        </div>

      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050b1a] via-[#0c1633] to-[#050b1a] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center z-10">
          <Loader2 className="w-10 h-10 text-white/50 animate-spin mb-4" />
          <p className="text-white/50 text-sm">กำลังเตรียมระบบลงชื่อเข้าใช้...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}