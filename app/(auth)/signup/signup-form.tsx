'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup } from './actions'
import { createBrowserClient } from '@supabase/ssr'

export default function SignupForm({ planId, isFree, app }: { planId?: string, isFree?: boolean, app?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // 🌟 ฟังก์ชันจัดการ Google Login 
  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);
    
    // สร้าง URL ให้เด้งไปที่หน้า Welcome พร้อมแนบ app และ plan_id
    let nextUrl = `/welcome?source=signup`;
    if (app) nextUrl += `&app=${app}`;
    if (planId) nextUrl += `&plan_id=${planId}`;
    
    // ให้ Supabase เด้งกลับมาที่หน้า /auth/callback ก่อน เพื่อตั้งค่า Session ให้เรียบร้อย
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
      },
    });

    if (error) {
      setError(`Google Signup Error: ${error.message}`);
      setLoading(false);
    }
  };

  // 🌟 ฟังก์ชันจัดการ Email/Password Signup
  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    
    try {
      const result = await signup(formData, planId)
      
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      if (planId && !isFree) {
        router.push(`/checkout/${planId}`)
      } else {
        let url = `/welcome?source=signup`;
        if (app) url += `&app=${app}`;
        if (planId) url += `&plan_id=${planId}`;
        
        router.push(url);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl text-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          {error}
        </div>
      )}

      {/* 🌟 ปุ่ม Signup with Google */}
      <button 
        type="button" 
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm tracking-wide rounded-2xl flex justify-center items-center gap-3 transition-all shadow-md disabled:opacity-50"
      >
        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
        สมัครสมาชิกด้วย Google
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px bg-white/10 flex-1"></div>
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">หรือใช้อีเมล</span>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          {/* ช่อง Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-white">
              ชื่อ-นามสกุล หรือ องค์กร <span className="text-slate-400 text-xs font-normal ml-1">/ Full Name or Org.</span>
            </label>
            <div className="mt-1 relative">
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 bg-[#0a1128]/60 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:shadow-[0_0_15px_rgba(20,184,166,0.4)]"
                placeholder="Nattapakal Bunbuchha"
              />
            </div>
          </div>

          {/* ช่อง Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              อีเมล <span className="text-slate-400 text-xs font-normal ml-1">/ Email Address</span>
            </label>
            <div className="mt-1 relative">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none block w-full px-4 py-3 bg-[#0a1128]/60 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:shadow-[0_0_15px_rgba(59,130,246,0.4)]"
                placeholder="your@email.com"
              />
            </div>
          </div>

          {/* ช่อง Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              รหัสผ่าน <span className="text-slate-400 text-xs font-normal ml-1">/ Password</span>
            </label>
            <div className="mt-1 relative flex items-center">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                className="appearance-none block w-full pl-4 pr-12 py-3 bg-[#0a1128]/60 border border-slate-600 rounded-xl text-white placeholder-slate-500 transition-all shadow-inner focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-white transition-colors focus:outline-none p-1"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex flex-col items-center justify-center py-3.5 px-4 rounded-xl text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/80 hover:border-white bg-gradient-to-r from-blue-900 to-teal-600 hover:from-blue-800 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a1128] focus:ring-teal-500 shadow-[0_0_15px_rgba(13,148,136,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)]"
          >
            {loading ? (
              <span className="flex items-center text-sm font-bold">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                กำลังจัดเตรียมระบบ... (Provisioning...)
              </span>
            ) : (
              <>
                <span className="text-sm font-bold">เริ่มต้นใช้งาน NiiVaa</span>
                <span className="text-xs font-medium text-white/80 mt-0.5">Get Started</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}