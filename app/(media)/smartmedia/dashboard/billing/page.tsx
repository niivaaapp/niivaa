import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { CreditCard, CalendarDays, Clock, CheckCircle, Receipt, ArrowLeft } from 'lucide-react';
import Link from 'next/link';


export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. ดึงข้อมูลองค์กรของผู้ใช้ (เพื่อเอา org_id ไปหา Subscription)
  const { data: member } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('profile_id', user.id)
    .eq('org_role', 'owner')
    .limit(1)
    .maybeSingle();

  let currentSub = null;
  if (member?.org_id) {
    // ดึงข้อมูล Subscription ปัจจุบันที่ Active อยู่ พร้อมชื่อ Plan
    const { data: subData } = await supabase
      .from('subscriptions')
      .select(`
        *,
        plans ( name, tier )
      `)
      .eq('org_id', member.org_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    currentSub = subData;
  }

  // 2. ดึงประวัติการชำระเงินทั้งหมดของผู้ใช้คนนี้
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  // 3. คำนวณวันคงเหลือ
  let daysRemaining = 0;
  if (currentSub?.valid_until) {
    const today = new Date();
    const expireDate = new Date(currentSub.valid_until);
    const diffTime = expireDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="min-h-screen bg-[#0a1128] text-slate-200 p-6 md:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ปุ่มกลับ Dashboard */}
        <div>
          <Link 
            href="/smart-media-dashboard" 
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            กลับสู่หน้า Dashboard
          </Link>
          
          {/* Header เดิม */}
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            <CreditCard className="text-cyan-400" size={32} />
            แพ็กเกจและการชำระเงิน
          </h1>
          <p className="text-slate-400">จัดการข้อมูลแพ็กเกจ NiiVaa SmartMedia ของคุณและดูประวัติการทำรายการ</p>
        </div>

        {/* 🌟 Section 1: สรุปแพ็กเกจปัจจุบัน */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-slate-400 mb-1 text-sm">แพ็กเกจปัจจุบันของคุณ</p>
              <h2 className="text-3xl font-bold text-cyan-300 mb-4">
                {currentSub?.plans?.name || 'ไม่มีแพ็กเกจที่ใช้งานอยู่'}
              </h2>
              
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle size={18} className="text-emerald-400" />
                  สถานะ: <span className="text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-400/10 rounded-full">ใช้งานได้ (Active)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CalendarDays size={18} className="text-slate-400" />
                  ใช้งานได้ถึง: {currentSub?.valid_until ? new Date(currentSub.valid_until).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                </div>
              </div>
            </div>

            {/* กล่องแสดงวันคงเหลือ */}
            <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-center min-w-[200px]">
              <Clock size={24} className="mx-auto text-cyan-400 mb-2" />
              <div className="text-4xl font-black text-white mb-1">
                {daysRemaining > 0 ? daysRemaining : 0}
              </div>
              <div className="text-slate-400 text-sm">วันคงเหลือ</div>
            </div>
          </div>

          {/* ปุ่มต่ออายุ (ลิงก์ไปหน้า Pricing) */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <Link 
              href="/smartmedia/pricing" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-cyan-600/20"
            >
              ต่ออายุแพ็กเกจ
            </Link>
          </div>
        </div>

        {/* 🌟 Section 2: ประวัติการชำระเงิน */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Receipt className="text-slate-400" size={24} />
            ประวัติการทำรายการ
          </h3>

          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="pb-4 font-medium px-4">วันที่ทำรายการ</th>
                    <th className="pb-4 font-medium px-4">รหัสอ้างอิง (Ref)</th>
                    <th className="pb-4 font-medium px-4">ช่องทาง</th>
                    <th className="pb-4 font-medium px-4 text-right">จำนวนเงิน</th>
                    <th className="pb-4 font-medium px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 text-slate-300">
                        {new Date(payment.created_at).toLocaleDateString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute:'2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-400">
                        {payment.trans_ref}
                      </td>
                      <td className="py-4 px-4 text-slate-300">
                        {payment.payment_channel === 'promptpay_slip' ? 'สแกนจ่าย (QR Slip)' : payment.payment_channel}
                      </td>
                      <td className="py-4 px-4 font-semibold text-white text-right">
                        {payment.amount} ฿
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          สำเร็จ
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
              <Receipt size={40} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">ยังไม่มีประวัติการชำระเงิน</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}