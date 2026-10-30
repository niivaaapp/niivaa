import { createClient } from '@/utils/supabase/server';
import CheckoutForm from './checkout-form';
import Link from 'next/link';
import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ sub_id: string }>;
}) {
  const { sub_id: planId } = await params;
  const supabase = await createClient();

  // 1. ดึงข้อมูล User
  const { data: { user } } = await supabase.auth.getUser();

  // 2. ดึงข้อมูลแพ็กเกจ
  const { data: plan, error } = await supabase
    .from('plans')
    .select('id, name, price, tier, app_id')
    .eq('id', planId)
    .maybeSingle();

  // 3. หากคิวรีติด Error หรือหาแพ็กเกจไม่พบ
  if (error || !plan) {
    console.error('Checkout Query Error:', error);
    return (
      <div className="min-h-screen bg-[#0a1128] flex items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="max-w-lg w-full bg-[#111827]/90 backdrop-blur-xl border border-red-500/40 rounded-3xl p-8 shadow-[0_0_30px_rgba(239,68,68,0.2)] relative z-10">
          <div className="inline-block px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-400 text-xs font-bold uppercase mb-4">
            ⚠️ Checkout Debug Error
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-2">ไม่พบข้อมูลแพ็กเกจนี้</h1>
          <p className="text-sm text-slate-400 mb-6">รหัสอ้างอิง: <code className="text-teal-300 bg-slate-950 px-2 py-0.5 rounded">{planId}</code></p>
          <Link href="/smart-media/pricing" className="block w-full text-center bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3 px-4 rounded-xl transition duration-200">
            กลับไปเลือกแพ็กเกจใหม่
          </Link>
        </div>
      </div>
    );
  }

  if (plan.price === 0 || plan.tier === 'free') {
    return (
      <div className="min-h-screen bg-[#0a1128] flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-teal-400 mb-2">กำลังพาคุณไปยังสตูดิโอ...</h2>
        <meta httpEquiv="refresh" content={`0; url=/welcome?source=signup`} />
      </div>
    );
  }

  const planName = plan.name || 'แพ็กเกจ NiiVaa SmartMedia';
  const planPrice = plan.price ?? 0;
  const orgName = user?.user_metadata?.full_name
    ? `พื้นที่ทำงานของ ${user.user_metadata.full_name}`
    : 'NiiVaa Workspace';

  // 🌟 4. สร้าง Payload สำหรับ PromptPay QR Code
  // แก้ไขเบอร์โทรศัพท์หรือเลขบัตรประชาชนตรงนี้ให้เป็นบัญชีรับเงินของคุณ
  const PROMPTPAY_ID = "0611422454";
  const qrPayload = generatePayload(PROMPTPAY_ID, { amount: planPrice });

  return (
    <div className="min-h-screen bg-[#0a1128] py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">

        {/* ฝั่งซ้าย: สรุปยอดเงิน */}
        <div className="bg-[#111827]/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-teal-400 tracking-wider uppercase bg-teal-950/60 px-3 py-1 rounded-full border border-teal-800/40">
              Checkout / ชำระเงิน
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-4 tracking-tight">สรุปคำสั่งซื้อแพ็กเกจ</h2>

            <div className="mt-8 space-y-4 border-t border-b border-slate-800 py-6">
              <div className="flex justify-between">
                <span className="text-slate-400">บัญชีผู้ใช้:</span>
                <span className="text-white font-medium">{user?.email || 'กรุณาล็อกอิน'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">พื้นที่ทำงาน:</span>
                <span className="text-white font-medium">{orgName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">แพ็กเกจ:</span>
                <span className="text-teal-300 font-semibold">{planName}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-0">
            <p className="text-sm text-slate-400">ยอดชำระทั้งสิ้น</p>
            <p className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mt-2">
              {planPrice.toLocaleString('th-TH')} <span className="text-xl font-medium text-slate-400">บาท</span>
            </p>
          </div>
        </div>

        {/* ฝั่งขวา: QR Code & ฟอร์มอัปโหลดสลิป */}
        <div className="bg-[#111827]/85 backdrop-blur-xl p-8 md:p-10 rounded-3xl border-2 border-green-500/50 shadow-[0_0_25px_rgba(34,197,94,0.2)]">

          {/* 🌟 กล่องแสดง QR Code และเลขพร้อมเพย์ */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm mb-8 text-center relative overflow-hidden">

            {/* โบว์กำกับด้านบน */}
            <div className="absolute top-0 left-0 w-full bg-cyan-600 text-white text-xs font-bold py-1">
              สแกน หรือ คัดลอกเบอร์เพื่อโอนเงิน
            </div>

            <h3 className="text-lg font-bold text-slate-800 mt-4 mb-2">QR Code พร้อมเพย์</h3>

            {/* กล่อง QR */}
            <div className="p-2 border-4 border-cyan-500 rounded-xl bg-white shadow-sm mb-4 relative group">
              <QRCodeSVG value={qrPayload} size={200} level="M" includeMargin={false} />
            </div>

            {/* ยอดเงินที่ต้องโอน (เน้นตัวใหญ่ๆ สีแดง/ส้ม เตือนให้โอนเป๊ะๆ) */}
            <div className="bg-orange-50 border border-orange-200 w-full rounded-xl p-3 mb-4">
              <p className="text-xs text-orange-600 font-bold mb-1">กรุณาโอนยอดนี้ให้ตรงเป๊ะ (เพื่อระบบตรวจสอบอัตโนมัติ)</p>
              <p className="font-black text-3xl text-orange-600">
                {planPrice.toLocaleString('th-TH')} <span className="text-lg">บาท</span>
              </p>
            </div>

            {/* เลขพร้อมเพย์เผื่อคนใช้มือถือเครื่องเดียว */}
            <div className="w-full text-left bg-slate-50 border border-slate-200 rounded-xl p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">หรือโอนเข้าพร้อมเพย์หมายเลข:</p>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-800 text-lg">{PROMPTPAY_ID}</p>
                  <p className="text-xs text-slate-500">ชื่อบัญชี: นิวัติ ภัคภูริวัฒน์</p>
                </div>
                {/* ถ้าใช้ Client Component สามารถทำปุ่ม Copy to Clipboard ได้ตรงนี้ */}
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">
                  (กดค้างเพื่อคัดลอก)
                </span>
              </div>
            </div>

          </div>

          <CheckoutForm
            planId={plan.id}
            appId={plan.app_id}
            amount={planPrice}
          />
        </div>

      </div>
    </div>
  );
}