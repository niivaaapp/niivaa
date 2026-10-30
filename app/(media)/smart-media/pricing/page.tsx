import { createClient } from '@/utils/supabase/server'; 
import Link from 'next/link';

// 🌟 กำหนดสไตล์นีออนและโทนสีของ NiiVaa สำหรับแต่ละระดับ (Tier)
const tierStyles: Record<string, any> = {
  free: {
    badge: 'bg-blue-950/60 text-blue-300 border border-blue-800/50',
    border: 'border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:border-blue-400 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)]',
    button: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600',
    icon: '🎁',
    subtitle: 'สำหรับทดลองระบบเบื้องต้น / Free Trial'
  },
  standard: {
    badge: 'bg-teal-950/60 text-teal-300 border border-teal-800/50',
    border: 'border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.2)] hover:border-teal-400 hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]',
    button: 'bg-gradient-to-r from-blue-900 to-teal-700 hover:from-blue-800 hover:to-teal-600 text-white border border-white/40',
    icon: '⭐',
    subtitle: 'จัดคิวและเล่นสื่อเต็มรูปแบบ / Standard Pack'
  },
  premium: {
    badge: 'bg-green-950/80 text-green-300 border border-green-500/50',
    border: 'border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.4)] ring-1 ring-green-400/30 hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] animate-pulse-subtle',
    button: 'bg-gradient-to-r from-blue-800 to-teal-600 hover:from-blue-700 hover:to-teal-500 text-white font-bold border border-white shadow-[0_0_15px_rgba(20,184,166,0.4)]',
    icon: '👑',
    subtitle: 'ระบบขั้นสูงระดับมืออาชีพ / Premium SmartBoard'
  }
};

export default async function PricingPage() {
  const supabase = await createClient();
  
  // 1. ตรวจสอบสถานะการเข้าสู่ระบบของผู้ใช้ (User Auth State)
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. ดึงข้อมูลแผนราคาจากฐานข้อมูล
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .eq('app_id', 'a1111111-1111-1111-1111-111111111111') 
    .order('price', { ascending: true });

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center text-red-400 font-semibold">
        เกิดข้อผิดพลาดในการโหลดข้อมูล / Error loading packages
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1128] py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-teal-300">
            เลือกแพ็กเกจที่เหมาะกับคุณ
          </h1>
          <p className="text-2xl font-semibold text-teal-400 mt-2 tracking-wide">
            Choose Your Perfect Plan
          </p>
          <p className="mt-4 text-base text-slate-400 max-w-2xl mx-auto">
            ปลดล็อกขีดความสามารถการจัดการสื่อและคิวเพลงอย่างเต็มรูปแบบร่วมกับเครือข่าย NiiVaa <br/>
            <span className="text-xs text-slate-500">Unlock full capabilities with the NiiVaa Smart Media network.</span>
          </p>
        </div>

        {/* Grid แสดงการ์ดสไตล์นีออนโทนเข้ม */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {plans?.map((plan) => {
            const style = tierStyles[plan.tier] || tierStyles.standard;
            const features = plan.features || {};

           // 🌟 3. ลอจิกคำนวณเส้นทาง (Dynamic Routing)
            let targetUrl = `/signup?plan_id=${plan.id}`; // ค่าเริ่มต้น
            
            // เพิ่ม: ถ้าเป็นแพ็กเกจฟรี ให้แนบพารามิเตอร์ is_free=true ส่งไปให้หน้า Signup ด้วย
            if (plan.tier === 'free' || plan.price === 0) {
              targetUrl = `/signup?plan_id=${plan.id}&is_free=true`;
            }
            
            if (user) {
              // ถ้าล็อกอินอยู่แล้ว
              if (plan.tier === 'free' || plan.price === 0) {
                targetUrl = `/welcome?source=signup`; // รับสิทธิ์ฟรีทันที (ข้าม Signup และ Checkout)
              } else {
                targetUrl = `/checkout/${plan.id}`; // ไปหน้าชำระเงิน (ข้าม Signup)
              }
            }

            return (
              <div 
                key={plan.id} 
                className={`rounded-3xl p-8 flex flex-col bg-[#111827]/70 backdrop-blur-xl border-2 text-white transition-all duration-300 ${style.border}`}
              >
                {/* ส่วนหัวของการ์ด */}
                <div className="mb-6 border-b border-slate-800 pb-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{plan.name}</h2>
                    <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{style.icon}</span>
                  </div>
                  <p className={`mt-2 inline-block px-3 py-1 text-xs font-semibold rounded-full ${style.badge}`}>
                    {style.subtitle}
                  </p>
                  
                  <div className="mt-6 flex items-baseline">
                    <span className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                      {plan.price}
                    </span>
                    <span className="ml-2 text-lg font-medium text-slate-400">บาท / THB</span>
                    {plan.billing_cycle !== 'custom' && (
                      <span className="ml-1 text-xs text-teal-400 font-mono">
                        /{plan.billing_cycle === 'monthly' ? 'เดือน (Mo)' : plan.billing_cycle === 'yearly' ? 'ปี (Yr)' : 'รอบบิล'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* ส่วนรายการฟีเจอร์ */}
                <ul className="space-y-4 flex-1 text-sm text-slate-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3 text-base">✓</span>
                    <div>
                      <p>ใช้งานได้สูงสุด <strong className="text-white">{plan.max_devices} อุปกรณ์</strong></p>
                      <p className="text-xs text-slate-500">Up to {plan.max_devices} active devices</p>
                    </div>
                  </li>
                  
                  {plan.duration_days && (
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 text-base">✓</span>
                      <div>
                        <p>ระยะเวลาใช้งาน <strong className="text-white">{plan.duration_days} วัน</strong></p>
                        <p className="text-xs text-slate-500">Valid for {plan.duration_days} days</p>
                      </div>
                    </li>
                  )}
                  
                  {features.max_playlists === -1 ? (
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 text-base">✓</span>
                      <div>
                        <p>จัดชุดสื่อคิวเพลงได้<strong className="text-white">ไม่จำกัด</strong></p>
                        <p className="text-xs text-slate-500">Unlimited media playlists</p>
                      </div>
                    </li>
                  ) : features.max_playlists ? (
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 text-base">✓</span>
                      <div>
                        <p>จัดชุดสื่อคิวเพลงได้ {features.max_playlists} ชุด</p>
                        <p className="text-xs text-slate-500">Limited to {features.max_playlists} playlists</p>
                      </div>
                    </li>
                  ) : null}

                  {features.has_ads === false && (
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 text-base">✓</span>
                      <div>
                        <p>ไม่มีโฆษณาคั่นรบกวน</p>
                        <p className="text-xs text-slate-500">Completely Ad-free experience</p>
                      </div>
                    </li>
                  )}
                  
                  {features.smartboard && (
                    <li className="flex items-start border-t border-slate-800/60 pt-3">
                      <span className="text-green-400 mr-3 text-base">✦</span>
                      <div>
                        <p className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-teal-300">
                          รองรับระบบ SmartBoard ขั้นสูง
                        </p>
                        <p className="text-xs text-slate-400">Advanced SmartBoard features (Scrolling text/Dual screen)</p>
                      </div>
                    </li>
                  )}

                  {features.background_play && (
                    <li className="flex items-start">
                      <span className="text-teal-400 mr-3 text-base">✓</span>
                      <div>
                        <p>เล่นเนื้อหาเบื้องหลัง (Background Playback)</p>
                        <p className="text-xs text-slate-500">Supports background audio playback</p>
                      </div>
                    </li>
                  )}
                </ul>

                {/* 🌟 4. อัปเดตลิงก์ตามเส้นทางที่ประมวลผลไว้ (targetUrl) */}
                <Link 
                  href={targetUrl}
                  className={`mt-8 block w-full text-center px-4 py-3.5 rounded-xl font-bold transition-all text-sm tracking-wide ${style.button}`}
                >
                  <div>{user ? (plan.price === 0 ? 'รับสิทธิ์ใช้งานฟรี' : 'ดำเนินการชำระเงิน') : '선택하기 / เลือกแพ็กเกจนี้'}</div>
                  <div className="text-xs font-normal opacity-80 mt-0.5">
                    {user ? (plan.price === 0 ? 'Get Free Access' : 'Proceed to Checkout') : 'Select This Plan'}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        
        {/* 🌟 Corporate / Group Package Banner (คงเดิม) */}
        <div className="mt-16 bg-gradient-to-r from-[#0d1b3e] to-[#0f2a28] rounded-3xl p-1 relative overflow-hidden shadow-[0_0_20px_rgba(20,184,166,0.15)] border border-slate-700/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-green-400"></div>
          <div className="bg-[#0a1128]/90 backdrop-blur-md rounded-[22px] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between relative z-10">
            <div className="flex-1 mb-8 md:mb-0 md:pr-8">
              <div className="inline-flex items-center space-x-2 bg-slate-800/50 rounded-full px-3 py-1 border border-slate-700 mb-4">
                <span className="text-teal-400 text-sm">🏢</span>
                <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">For Enterprise & Organizations</span>
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">Group / Corporate Plan</h3>
              <p className="text-slate-400 text-sm mb-6">
                โซลูชันแบบปรับแต่งได้สำหรับองค์กรและเครือข่ายขนาดใหญ่ <br/>
                <span className="text-xs text-slate-500">Customizable solutions for large organizations and networks.</span>
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-300">
                <li className="flex items-center"><span className="text-teal-400 mr-2">✓</span> 1 บัญชีหลัก / สมาชิกย่อยไม่จำกัด</li>
                <li className="flex items-center"><span className="text-teal-400 mr-2">✓</span> เลือกระดับ Standard หรือ Premium ได้</li>
                <li className="flex items-center"><span className="text-teal-400 mr-2">✓</span> ระบบจัดการสิทธิ์บุคลากรแบบรวมศูนย์</li>
                <li className="flex items-center"><span className="text-teal-400 mr-2">✓</span> รองรับการออกใบเสนอราคา/ใบเสร็จองค์กร</li>
              </ul>
            </div>
            
            <div className="w-full md:w-auto flex flex-col items-center justify-center p-6 bg-slate-900/50 rounded-2xl border border-slate-800/80 min-w-[250px]">
              <div className="text-center mb-6">
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                  Custom Pricing
                </p>
                <p className="text-xs text-teal-400 mt-1">ประเมินราคาตามขนาดองค์กร</p>
              </div>
              <Link 
                href="/contact-sales" 
                className="w-full text-center px-6 py-3.5 rounded-xl font-bold transition-all text-sm tracking-wide bg-slate-100 hover:bg-white text-slate-900 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
              >
                <div>ติดต่อทีมดูแลลูกค้าองค์กร</div>
                <div className="text-xs font-normal opacity-80 mt-0.5">Contact Sales Team</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}