// app/welcome/page.tsx
"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, Loader2, Receipt, CalendarDays, PackageOpen, Sparkles } from 'lucide-react';
import { useEffect, useState, Suspense, useRef } from 'react';
import Confetti from 'react-confetti';
import { createBrowserClient } from '@supabase/ssr';
import { executeSilentOnboardingServer } from '@/app/actions/onboarding-actions';

// 🌟 Configuration สำหรับทุกแอปพลิเคชันในระบบ NiiVaa
const APP_CONFIGS = {
  media: {
    appId: 'a1111111-1111-1111-1111-111111111111',
    serviceCode: 'SMART_MEDIA',
    workspaceName: 'SmartMedia Studio',
    title: 'NiiVaa SmartMedia&Karaoke',
    dashboardUrl: '/smart-media-dashboard',
    themeColor: 'from-cyan-600 to-blue-600',
  },
  event: {
    appId: 'b2222222-2222-2222-2222-222222222222',
    serviceCode: 'SMART_EVENT',
    workspaceName: 'SmartEvent Manager',
    title: 'NiiVaa SmartEvent',
    dashboardUrl: '/eventhub',
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

type AccessStatus = 'existing' | 'new_free' | 'error' | 'normal' | 'payment_success' | 'returning_user';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const planId = searchParams.get('plan_id');

  const appParam = searchParams.get('app') as keyof typeof APP_CONFIGS;
  const eventIdFromUrl = searchParams.get('eventid') || '';
  const currentApp = APP_CONFIGS[appParam] || APP_CONFIGS.media;

  const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('normal');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // State สำหรับเก็บรหัส Workspace/Event ที่เพิ่งสร้างสำเร็จ
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const hasRun = useRef(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setWindowDimension({ width: window.innerWidth, height: window.innerHeight });

    // 🌟 กรณีผู้ใช้มีแพ็กเกจอยู่แล้ว (มาจากหน้า Pricing ที่โดน Redirect มา)
    if (status === 'returning_user') {
      setAccessStatus('returning_user');
      setLoading(false);
      // หน่วงเวลาให้เห็นข้อความต้อนรับ 2.5 วินาที แล้วเด้งเข้า Dashboard
      setTimeout(() => {
        router.push(getFinalDashboardUrl());
      }, 2500);
      return;
    }

    if (status === 'payment_success') {
      if (hasRun.current) return;
      hasRun.current = true;
      fetchPaymentInfo();
    } else if (source === 'cross_sell' || source === 'signup') {
      if (hasRun.current) return;
      hasRun.current = true;
      executeSilentOnboarding();
    } else {
      // 🌟 [จุดที่แก้ไข] เมื่อเข้ามาแบบปกติ (เช่น คลิกการ์ดจากหน้าหลัก) ให้เช็กสิทธิ์เลย
      if (hasRun.current) return;
      hasRun.current = true;
      checkAccessAndRedirect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, status]);

  // 🌟 [ฟังก์ชันใหม่] ตรวจสอบสิทธิ์จากตาราง Workspaces
  const checkAccessAndRedirect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // ถ้ายังไม่ล็อกอิน ให้ส่งไปหน้า Login
      if (!user) {
        router.push('/login');
        return;
      }

      // ตรวจสอบว่าผู้ใช้มี Workspace ของแอปนี้ (serviceCode) หรือยัง?
      const { data: wsData, error: wsError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .eq('service_code', currentApp.serviceCode)
        .maybeSingle();

      if (wsError && wsError.code !== 'PGRST116') {
        throw wsError;
      }

      if (wsData) {
        // 🟢 มี Workspace แล้ว -> โชว์ข้อความต้อนรับ 2.5 วินาที แล้วไป Dashboard
        setWorkspaceId(wsData.id);
        setAccessStatus('returning_user');
        setLoading(false);
        
        setTimeout(() => {
          router.push(getFinalDashboardUrl());
        }, 2500);
      } else {
        // 🔴 ยังไม่มี Workspace -> ดีดไปหน้า Pricing ของแอปนั้นๆ
        const targetApp = appParam || 'media';
        let pricingUrl = '/';
        
        if (targetApp === 'media') pricingUrl = '/smart-media/pricing';
        else if (targetApp === 'event') pricingUrl = '/eventdashboard/pricing';
        else if (targetApp === 'exam') pricingUrl = '/smartexam/pricing';
        
        router.push(pricingUrl);
      }

    } catch (error) {
      console.error("Check Access Error:", error);
      setAccessStatus('error');
      setLoading(false);
    }
  };

  // 🌟 ฟังก์ชันคำนวณ URL ให้แม่นยำที่สุด
  const getFinalDashboardUrl = () => {
    let finalUrl = currentApp.dashboardUrl;

    if (finalUrl.includes('[eventid]')) {
      const targetId = eventIdFromUrl || workspaceId;
      if (targetId) {
        finalUrl = finalUrl.replace('[eventid]', targetId);
      } else {
        finalUrl = finalUrl.replace('/[eventid]', '');
      }
    }
    return finalUrl;
  };

  const fetchPaymentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลเซสชัน");

      const { data, error } = await supabase
        .from('payments')
        .select(`amount, subscriptions (valid_until, plans (name))`)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ไม่พบข้อมูลเซสชัน กรุณาเข้าสู่ระบบใหม่");

      // Smart Retry Logic รอ Profile Database Trigger ทำงาน
      let profileReady = false;
      for (let i = 0; i < 5; i++) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          profileReady = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!profileReady) {
        throw new Error("ระบบเตรียมข้อมูลโปรไฟล์ล่าช้ากว่าปกติ (Timeout) กรุณากดปุ่มลองเชื่อมต่อใหม่อีกครั้ง");
      }

      const result = await executeSilentOnboardingServer(currentApp, planId);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.workspaceId) {
        setWorkspaceId(result.workspaceId);
      }
      
      const resultingStatus = result.status as AccessStatus;
      setAccessStatus(resultingStatus);

      // 🌟 หากพบว่ามีบัญชี/สิทธิ์เดิมอยู่แล้ว ให้เข้าสู่โหมด "ผู้ใช้เดิม" และ Redirect อัตโนมัติ
      if (resultingStatus === 'existing') {
        setTimeout(() => {
          router.push(getFinalDashboardUrl());
        }, 2500);
      }

    } catch (error: any) {
      console.error("Silent Onboarding Error Details:", error);
      if (error.message?.includes('กรุณาเข้าสู่ระบบ')) {
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

  // --------------------------------------------------------
  // ส่วนแสดงผล UI (Rendering Views)
  // --------------------------------------------------------

  // 1. หน้าโหลดข้อมูล
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] z-20 relative">
        <Loader2 className="w-14 h-14 text-cyan-400 animate-spin mb-6 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 animate-pulse">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
      </div>
    );
  }

  // 2. หน้าเกิดข้อผิดพลาด
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
            className="w-full px-6 py-3.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          >
            ลองเชื่อมต่อใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // 3. หน้าต้อนรับผู้ใช้เก่า (Auto-redirect)
  if (accessStatus === 'returning_user' || accessStatus === 'existing') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] z-20 relative px-4 text-center">
        <Sparkles size={60} className="text-teal-400 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(45,212,191,0.6)]" />
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-400 pb-2">
          ยินดีต้อนรับกลับสู่
        </h1>
        <h2 className="text-2xl font-bold text-white mt-2">{currentApp.title}</h2>
        <div className="mt-8 flex items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="font-medium tracking-wide">กำลังพาคุณเข้าสู่ระบบ...</span>
        </div>
      </div>
    );
  }

  // 4. หน้าสำเร็จ (ผู้ใช้ใหม่ หรือ ชำระเงินเสร็จ)
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

        <Link
          href={getFinalDashboardUrl()}
          className={`w-full py-4 bg-gradient-to-r ${currentApp.themeColor} hover:opacity-90 text-white text-lg font-black rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]`}
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