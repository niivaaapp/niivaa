export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { CheckCircle2, XCircle, Zap, Crown, Star } from 'lucide-react';

export default async function SmartEventPricingPage() {
    const supabase = await createClient();

    // 🌟 เอา .eq('tier', 'premium') ออก เพื่อให้ดึงแพ็กเกจ Free มาด้วย
    const { data: plans } = await supabase
        .from('plans')
        .select('*, apps!inner(name)')
        .eq('apps.name', 'NiiVaa SmartEvent')
        .eq('is_active', true)
        .order('price', { ascending: true });

    // แยกฟีเจอร์ของ Premium และ Free ออกจากกันให้ชัดเจน
    const premiumFeatures = [
        { text: "รับผู้เข้าร่วมงานได้ไม่จำกัดจำนวน", included: true },
        { text: "ระบบ MC-Prompter อ่านสคริปต์ไม่จำกัด", included: true },
        { text: "สคริปต์พิธีกร Script-Block 2 ระดับ", included: true },
        { text: "ระบบจอเวทีอเนกประสงค์ และสไลด์แนะนำ VIP", included: true },
        { text: "จัดผังที่นั่งห้องประชุม และโต๊ะจัดเลี้ยง", included: true },
        { text: "ทะเบียนของที่ระลึก พร้อมคิวอัจฉริยะ", included: true },
        { text: "แถมฟรี! ระบบเชื่อมต่อ SmartMedia & Karaoke", included: true }
    ];

    const freeFeatures = [
        { text: "รับผู้เข้าร่วมงานสูงสุด 20 ท่าน / งาน", included: true },
        { text: "ระบบลงทะเบียน และอัปโหลดรายชื่อล่วงหน้า", included: true },
        { text: "โหมดอ่านสคริปต์พิธีกร 5 งาน / เดือน", included: true },
        { text: "แกลเลอรีภาพ/วิดีโอ 100 ไฟล์", included: true },
        { text: "สคริปต์พิธีกร Script-Block 2 ระดับ", included: false },
        { text: "ระบบจอเวทีอเนกประสงค์ และจัดผังที่นั่ง", included: false },
        { text: "ระบบเชื่อมต่อ SmartMedia & Karaoke", included: false }
    ];

    return (
        <div className="min-h-screen bg-[#0a1128] py-20 px-4 relative overflow-hidden font-sans">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
                        แพ็กเกจ NiiVaa SmartEvent
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        เลือกแพ็กเกจที่เหมาะกับขนาดงานของคุณ ปลดล็อกขีดจำกัดการจัดงานระดับมืออาชีพ
                    </p>
                </div>

                {/* ปรับ Grid ให้รองรับ 4 กล่อง (Free + Premium 3 แบบ) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {plans?.map((plan, index) => {
                        const isFree = plan.price === 0 || plan.tier === 'free';
                        const isPopular = plan.duration_days === 90; // ให้แพ็ก 3 เดือนเป็นยอดนิยม
                        const displayFeatures = isFree ? freeFeatures : premiumFeatures;

                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col p-6 lg:p-8 rounded-3xl backdrop-blur-xl border transition-all duration-300 
                  ${isPopular
                                        ? 'bg-gradient-to-b from-[#111827] to-[#0d1b3e] border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] transform lg:-translate-y-4'
                                        : isFree
                                            ? 'bg-[#111827]/50 border-slate-700/50 opacity-90'
                                            : 'bg-[#111827]/80 border-slate-800 hover:border-slate-600 hover:shadow-xl hover:shadow-cyan-900/20 hover:-translate-y-2'}`}
                            >
                                {isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg whitespace-nowrap">
                                        🔥 ยอดนิยม (Best Value)
                                    </div>
                                )}

                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        {isFree ? <Zap className="text-slate-500" size={24} /> : isPopular ? <Star className="text-cyan-400" size={24} /> : <Crown className="text-amber-400" size={24} />}
                                        <h3 className={`text-lg font-bold ${isPopular ? 'text-white' : 'text-slate-300'}`}>
                                            {plan.name}
                                        </h3>
                                    </div>
                                    <div className="mt-4 flex items-baseline text-white">
                                        <span className="text-4xl font-black">{isFree ? 'ฟรี' : plan.price.toLocaleString('th-TH')}</span>
                                        {!isFree && <span className="text-slate-400 ml-2">บาท</span>}
                                    </div>
                                    <p className="text-slate-500 text-xs mt-2 min-h-[16px]">
                                        {!isFree && `เฉลี่ยเพียง ${Math.round(plan.price / (plan.duration_days / 30))} บาท/เดือน`}
                                    </p>
                                </div>

                                <ul className="space-y-3 mb-8 flex-1">
                                    {displayFeatures.map((feature, i) => (
                                        <li key={i} className={`flex items-start gap-3 text-sm ${feature.included ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {feature.included ? (
                                                <CheckCircle2 className="text-cyan-500 shrink-0 mt-0.5" size={16} />
                                            ) : (
                                                <XCircle className="text-slate-700 shrink-0 mt-0.5" size={16} />
                                            )}
                                            <span>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>

                                {isFree ? (
                                    <Link
                                        href="/welcome?source=signup&app=event" // 🌟 ชี้เป้าไปหน้า Welcome พร้อมส่ง Parameter ของแอป
                                        className="w-full py-3.5 rounded-xl font-bold text-center transition-all bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
                                    >
                                        เริ่มต้นใช้งานฟรี (Freemium)
                                    </Link>
                                ) : (
                                    <Link
                                        href={`/checkout/${plan.id}`}
                                        className={`w-full py-3.5 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2
                      ${isPopular
                                                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                                : 'bg-gradient-to-r from-blue-900 to-slate-800 hover:from-blue-800 hover:to-slate-700 text-white border border-slate-700'}`}
                                    >
                                        <Crown size={16} />
                                        อัปเกรดทันที
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-12 text-center">
                    <Link href="/eventdashboard" className="text-slate-500 hover:text-cyan-400 transition-colors text-sm font-medium">
                        ← กลับสู่หน้า Dashboard หลัก
                    </Link>
                </div>
            </div>
        </div>
    );
}