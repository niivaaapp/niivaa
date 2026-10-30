"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertTriangle, Loader2, Receipt, CalendarDays, PackageOpen } from 'lucide-react';
import { useEffect, useState, Suspense, useRef } from 'react';
import Confetti from 'react-confetti';
import { createBrowserClient } from '@supabase/ssr';
// 🌟 1. อย่าลืม Import Action เข้ามาไว้ด้านบนสุด
import { executeSilentOnboardingServer } from '@/app/actions/onboarding-actions';

// 🌟 1. สร้าง Configuration สำหรับทุกแอปพลิเคชัน
const APP_CONFIGS = {
  media: {
    appId: 'a1111111-1111-1111-1111-111111111111',
    serviceCode: 'SMART_MEDIA',
    workspaceName: 'SmartMedia Studio',
    title: 'NiiVaa SmartMedia',
    dashboardUrl: '/smart-media-dashboard',
    themeColor: 'from-cyan-600 to-blue-600',
  },
  event: {
    appId: 'b2222222-2222-2222-2222-222222222222',
    serviceCode: 'SMART_EVENT',
    workspaceName: 'SmartEvent Manager',
    title: 'NiiVaa SmartEvent',
    dashboardUrl: '/events/event-dashboard/[eventid]',
    themeColor: 'from-blue-600 to-indigo-600',
  },
  exam: {
    appId: 'c3333333-3333-3333-3333-333333333333',
    serviceCode: 'SMART_EXAM',
    workspaceName: 'SmartExam Center',
    title: 'NiiVaa SmartExam',
    dashboardUrl: '/smart-exam-dashboard',
    themeColor: 'from-purple-600 to-fuchsia-600',
  }
};

function WelcomeContent() {
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const planId = searchParams.get('plan_id');

  const appParam = searchParams.get('app') as keyof typeof APP_CONFIGS;
  const eventIdFromUrl = searchParams.get('eventid') || '';
  const currentApp = APP_CONFIGS[appParam] || APP_CONFIGS.media;

  const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<'existing' | 'new_free' | 'error' | 'normal' | 'payment_success'>('normal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // 🌟 เพิ่ม State สำหรับเก็บรหัส Workspace/Event ที่เพิ่งสร้างสำเร็จ
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const hasRun = useRef(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setWindowDimension({ width: window.innerWidth, height: window.innerHeight });

    if (status === 'payment_success') {
      if (hasRun.current) return;
      hasRun.current = true;
      fetchPaymentInfo();
    } else if (source === 'cross_sell' || source === 'signup') {
      if (hasRun.current) return;
      hasRun.current = true;
      executeSilentOnboarding();
    } else {
      setLoading(false);
    }
  }, [source, status]);

  // 🌟 ฟังก์ชันคำนวณ URL โดยใช้ ID ที่ดึงมาจากฐานข้อมูลสดๆ ร้อนๆ
  const getFinalDashboardUrl = () => {
    let finalUrl = currentApp.dashboardUrl;

    if (finalUrl.includes('[eventid]')) {
      // 🎯 ลำดับความสำคัญ: 1. ID จาก URL -> 2. ID ของ Workspace ที่เพิ่งสร้าง 
      const targetId = eventIdFromUrl || workspaceId;

      if (targetId) {
        finalUrl = finalUrl.replace('[eventid]', targetId);
      } else {
        // Fallback กันเหนียวเผื่อเกิดเหตุไม่คาดฝัน
        finalUrl = finalUrl.replace('/[eventid]', '');
      }
    }

    return finalUrl;
  };

  const fetchPaymentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลเซสชัน");

      // ดึงข้อมูลบิล
      const { data, error } = await supabase
        .from('payments')
        .select(`amount, subscriptions (valid_until, plans (name))`)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      // 🌟 ดึงข้อมูล Workspace ID สำหรับกรณีจ่ายเงินสำเร็จ เพื่อเอาไปทำปุ่ม
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .eq('service_code', currentApp.serviceCode)
        .maybeSingle();

      if (wsData) setWorkspaceId(wsData.id);

      if (data) {
        setPaymentInfo(data);
        setAccessStatus('payment_success');
      } else {
        setAccessStatus('normal');
      }
    } catch (error: any) {
      console.error("Fetch Payment Error:", error);
      setAccessStatus('normal');
    } finally {
      setLoading(false);
    }
  };

  const executeSilentOnboarding = async () => {
    try {
      // 🌟 1. ดึงข้อมูล User ปัจจุบันจาก Session ก่อน
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลเซสชัน กรุณาเข้าสู่ระบบใหม่");

      // 🌟 2. Smart Retry Logic: วนลูปเช็ค Profile สูงสุด 5 รอบ (รอบละ 1 วินาที)
      let profileReady = false;
      for (let i = 0; i < 5; i++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          profileReady = true;
          break; // เจอ Profile แล้ว ทะลุออกจากลูปทันที
        }
        
        // ถ้ายิงไปแล้วยังไม่เจอ ให้หยุดรอ 1 วินาทีแล้วค่อยถามฐานข้อมูลใหม่
        console.log(`รอบที่ ${i + 1}: กำลังรอฐานข้อมูลสร้าง Profile...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!profileReady) {
        throw new Error("ระบบเตรียมข้อมูลโปรไฟล์ล่าช้ากว่าปกติ (Timeout) กรุณากดปุ่มลองเชื่อมต่อใหม่อีกครั้ง");
      }

      // 🌟 3. เมื่อมั่นใจว่ามี Profile 100% แล้ว ค่อยโยนงานให้ Server ทำแบบทะลุ RLS
      const result = await executeSilentOnboardingServer(currentApp, planId);

      // 2. ถ้า Server แจ้งว่ามี Error ให้โยนเข้า catch
      if (!result.success) {
        throw new Error(result.error);
      }

      // 3. นำผลลัพธ์ (ID) ที่ได้จาก Server มาจัดการแสดงผลปุ่ม
      if (result.workspaceId) {
        setWorkspaceId(result.workspaceId);
      }
      
      setAccessStatus(result.status as 'new_free' | 'existing');

    } catch (error: any) {
      console.error("Silent Onboarding Error Details:", error);
      
      // ถ้า Error เกิดจากการหมดอายุของ Session ให้เตะกลับไปหน้า Login
      if (error.message.includes('กรุณาเข้าสู่ระบบ')) {
        const currentUrl = window.location.pathname + window.location.search;
        window.location.href = `/login?next=${encodeURIComponent(currentUrl)}`;
        return;
      }
      
      setErrorMessage(error.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
      setAccessStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] z-20 relative">
        <Loader2 className="w-14 h-14 text-cyan-400 animate-spin mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 animate-pulse">กำลังจัดเตรียมพื้นที่ทำงาน...</p>
      </div>
    );
  }

  if (accessStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] z-20 relative px-4">
        <div className="bg-red-950/40 border border-red-500/50 p-8 md:p-10 rounded-[2rem] text-center max-w-lg backdrop-blur-xl shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">การจัดเตรียมระบบถูกขัดจังหวะ</h2>
          <div className="bg-black/40 p-4 rounded-xl text-left border border-red-900/50 mb-8 overflow-x-auto">
            <p className="text-xs text-slate-400 font-mono mt-1">{errorMessage}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
          >
            ลองเชื่อมต่อใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {windowDimension.width > 0 && <Confetti width={windowDimension.width} height={windowDimension.height} recycle={false} numberOfPieces={300} />}
      <div className="max-w-2xl w-full bg-[#111827]/80 backdrop-blur-2xl border border-white/10 p-10 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10">
        <div className="text-center mb-8">
          <CheckCircle size={70} className="text-emerald-400 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 pb-2">
            {status === 'payment_success' ? 'ชำระเงินและเปิดระบบสำเร็จ!' : 'สร้างบัญชีและจัดเตรียมระบบสำเร็จ!'}
          </h1>
          <p className="text-lg text-slate-300 mt-2 font-medium">ยินดีต้อนรับสู่ {currentApp.title}</p>
        </div>

        {status === 'payment_success' && paymentInfo && (
          <div className="bg-[#1e293b]/80 border border-slate-700/50 rounded-2xl p-6 mb-8 text-left shadow-inner">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <PackageOpen size={20} className="text-cyan-400" />
                  <span>แพ็กเกจที่ใช้งาน</span>
                </div>
                <span className="font-bold text-cyan-300 text-lg">
                  {paymentInfo.subscriptions?.plans?.name || 'Premium Package'}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div className="flex items-center gap-3 text-slate-300">
                  <Receipt size={20} className="text-slate-400" />
                  <span>ยอดชำระ</span>
                </div>
                <span className="font-bold text-white text-lg">{paymentInfo.amount} ฿</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-300">
                  <CalendarDays size={20} className="text-emerald-400" />
                  <span>ใช้งานได้ถึง</span>
                </div>
                <span className="font-bold text-emerald-400">
                  {new Date(paymentInfo.subscriptions?.valid_until).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 ลิงก์ปุ่มจะวิ่งไปที่ Dashboard พร้อม UUID ที่ถูกต้องแล้วครับ */}
        <Link
          href={getFinalDashboardUrl()}
          className={`w-full py-4 bg-gradient-to-r ${currentApp.themeColor} hover:opacity-90 text-white text-lg font-black rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg`}
        >
          เข้าสู่แผงควบคุม (Dashboard)
        </Link>
      </div>
    </>
  );
}

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[#0a1128] flex items-center justify-center relative overflow-hidden font-sans p-4">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <Suspense fallback={<Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />}>
        <WelcomeContent />
      </Suspense>
    </div>
  );
}