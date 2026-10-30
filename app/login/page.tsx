'use client';

import { useState, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

// 🌟 1. สร้างชุดการตั้งค่า (Config) ธีมและเส้นทางสำหรับแต่ละแอป
const APP_CONFIGS = {
  media: {
    title: 'NiiVaa SmartMedia',
    redirectUrl: '/smart-media-dashboard',
    gradientText: 'from-cyan-400 to-blue-500',
    buttonBg: 'from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500',
    glowBg: 'bg-cyan-600/20',
    shadow: 'shadow-[0_0_20px_rgba(8,145,178,0.4)]',
    linkColor: 'text-cyan-400 hover:text-cyan-300',
  },
  event: {
    title: 'NiiVaa SmartEvent',
    redirectUrl: '/eventhub',
    gradientText: 'from-purple-400 to-indigo-400',
    buttonBg: 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500',
    glowBg: 'bg-purple-600/20',
    shadow: 'shadow-[0_0_20px_rgba(147,51,234,0.4)]',
    linkColor: 'text-purple-400 hover:text-purple-300',
  },
  exam: {
    title: 'NiiVaa SmartExam',
    redirectUrl: '/smartexam',
    gradientText: 'from-fuchsia-400 to-purple-400',
    buttonBg: 'from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500',
    glowBg: 'bg-fuchsia-600/20',
    shadow: 'shadow-[0_0_20px_rgba(192,38,211,0.4)]',
    linkColor: 'text-fuchsia-400 hover:text-fuchsia-300',
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

// 🌟 2. แยกฟอร์มออกมาเพื่อให้รองรับ Suspense และอ่านค่าจาก URL ได้
function LoginForm() {
  const searchParams = useSearchParams();
  const appParam = searchParams.get('app') as keyof typeof APP_CONFIGS;
  const nextUrl = searchParams.get('next'); // รับค่า URL เดิมเผื่อโดนระบบ Guard เตะมา

  // เลือกการตั้งค่าตามแอป ถ้าไม่มีให้ใช้ค่าเริ่มต้น (default)
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
        // 🌟 3. ลำดับความสำคัญการเปลี่ยนหน้า: 1. ค่า next (ถ้ามี) -> 2. หน้าหลักของแอปนั้นๆ
        router.push(nextUrl || currentApp.redirectUrl);
        router.refresh(); // รีเฟรชสถานะให้แอปอัปเดตข้อมูลผู้ใช้ล่าสุด
      }, 1500);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);

    // กำหนดเส้นทางที่จะให้ตีกลับมา (พุ่งไปที่ API Callback ที่เราเพิ่งสร้าง)
    // และพ่วง parameter ?next= ไปด้วย เพื่อให้รู้ว่าล็อกอินเสร็จต้องพาไปแอปไหน
    const redirectTo = `${window.location.origin}/auth/callback?next=${nextUrl || currentApp.redirectUrl}`;

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
      {/* 🌟 เอฟเฟกต์แสงออร่าพื้นหลัง (เปลี่ยนสีตามแอป) */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full blur-[100px] pointer-events-none ${currentApp.glowBg}`}></div>

      {/* 📦 กล่อง Login Card (Glassmorphism) */}
      <div className="w-full max-w-md p-8 sm:p-10 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-10 relative animate-in fade-in zoom-in duration-500">

        {/* Header (เปลี่ยนชื่อและสีตามแอป) */}
        <div className="text-center mb-8">
          <h2 className={`text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${currentApp.gradientText} tracking-tight`}>
            {currentApp.title}
          </h2>
          <p className="text-sm text-zinc-400 font-medium mt-2">
            ยินดีต้อนรับกลับเข้าสู่ระบบครับ
          </p>
        </div>

        {/* Message Alert Box */}
        {message.text && (
          <div className={`flex items-center gap-2 p-3 rounded-xl mb-6 text-xs font-bold ${message.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-500/50 text-emerald-400'
              : 'bg-red-950/50 border border-red-500/50 text-red-400'
            }`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* 🌟 ปุ่ม Login with Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 mb-5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm tracking-wide rounded-2xl flex justify-center items-center gap-3 transition-all shadow-md disabled:opacity-50"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
            เข้าสู่ระบบด้วย Google
          </button>

          {/* เส้นคั่นกลาง */}
          <div className="flex items-center gap-4 mb-5">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">หรือใช้อีเมล</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* ... (จากนั้นค่อยเป็น Form กรอก Email/Password แบบเดิมของคุณ) ... */}

          {/* Email Input */}
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

          {/* Password Input */}
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

          {/* Submit Button (เปลี่ยนสีตามแอป) */}
          <button
            disabled={loading}
            type="submit"
            className={`w-full py-3.5 mt-2 bg-gradient-to-r ${currentApp.buttonBg} text-white font-black text-sm tracking-wide rounded-2xl flex justify-center items-center gap-2 transition-all ${currentApp.shadow} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {loading ? 'กำลังตรวจสอบสิทธิ์...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-xs text-zinc-500 font-medium">
            ยังไม่มีบัญชี NiiVaa ID?{' '}
            {/* 🌟 4. ส่งค่าแอปกลับไปหน้า Signup ด้วย เผื่อเปลี่ยนใจไปสมัครใหม่ */}
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

// 🌟 3. คอมโพเนนต์หลักที่ทำหน้าที่ครอบ Suspense เพื่อป้องกัน Error ตอนดึง URL Parameters
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