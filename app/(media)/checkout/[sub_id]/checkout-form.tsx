'use client'

import { useState } from 'react';
import { verifySlipAction } from './actions';

export default function CheckoutForm({ planId, appId, amount }: { planId: string; appId: string; amount: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    // ส่ง planId และ appId ไปให้ Server Action ตรวจสอบและสร้างฐานข้อมูล
    const result = await verifySlipAction(formData, planId, appId, amount);

    if (!result.success) {
      setError(result.error || 'เกิดข้อผิดพลาดในการตรวจสอบสลิป');
      setLoading(false);
    }
    // หากสำเร็จ Server Action จะทำ Redirect ผู้ใช้ไปหน้าจัดเตรียม Workspace หรือ Dashboard อัตโนมัติ
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 flex flex-col items-center justify-center text-center w-full">
      
      {error && (
        <div className="w-full p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl">
          {error}
        </div>
      )}

      {/* ช่องอัปโหลดไฟล์รูปภาพสลิป */}
      <div className="w-full text-left">
        <label htmlFor="slip" className="block text-sm font-medium text-slate-200 mb-2">
          อัปโหลดสลิปโอนเงิน <span className="text-slate-400 text-xs">/ Upload Transfer Slip *</span>
        </label>
        <input
          id="slip"
          name="slip"
          type="file"
          accept="image/*"
          required
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer border border-slate-700 p-2 rounded-xl bg-[#0a1128]/50"
        />
      </div>

      {/* ปุ่มกดส่งตรวจสลิปสไตล์ NiiVaa */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex flex-col items-center justify-center py-3.5 px-4 rounded-xl text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed
          border border-white/80 hover:border-white
          bg-gradient-to-r from-blue-950 to-teal-700 hover:from-blue-900 hover:to-teal-600 
          shadow-[0_0_15px_rgba(20,184,166,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]"
      >
        {loading ? (
          <span className="flex items-center text-sm">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ระบบอัจฉริยะกำลังตรวจสอบสลิป... (Verifying...)
          </span>
        ) : (
          <>
            <span className="text-sm font-bold">ยืนยันการชำระเงิน</span>
            <span className="text-xs font-normal text-slate-300 mt-0.5">Confirm Payment & Activate</span>
          </>
        )}
      </button>
    </form>
  );
}