// app/contact-sales/contact-form.tsx
'use client'

import { useState } from 'react'
import { submitContactForm } from './actions'

export default function ContactForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await submitContactForm(formData)

    if (result.success) {
      setIsSubmitted(true)
    } else {
      setError(result.error || 'เกิดข้อผิดพลาด')
      setLoading(false)
    }
  }

  // หน้าจอแสดงผลเมื่อลูกค้าส่งข้อมูลสำเร็จ
  if (isSubmitted) {
    return (
      <div className="text-center py-12 px-4 bg-emerald-950/20 border border-emerald-500/40 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <div className="text-5xl mb-4">✨</div>
        <h3 className="text-2xl font-bold text-emerald-400">ส่งข้อมูลสำเร็จเรียบร้อยครับ</h3>
        <p className="text-lg text-white mt-1">Thank You! Your request has been sent.</p>
        <p className="text-sm text-slate-300 mt-4 max-w-sm mx-auto">
          เจ้าหน้าที่ผู้เชี่ยวชาญของ NiiVaa จะติดต่อกลับหาท่านเพื่อเจรจาและส่งใบเสนอราคาภายในวันทำการเดียวกันครับ
        </p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl text-center shadow-[0_0_15px_rgba(239,68,68,0.15)]">
          {error}
        </div>
      )}

      {/* แบ่งฟิลด์เป็น 2 คอลัมน์บนจอใหญ่ด้วย Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* คอลัมน์ฝั่งซ้าย: ข้อมูลผู้ติดต่อ */}
        <div className="space-y-5">
          <div>
            <label htmlFor="contact_name" className="block text-sm font-medium text-slate-200">
              ชื่อ-นามสกุล ผู้ติดต่อ <span className="text-slate-400 text-xs font-normal ml-1">/ Contact Name *</span>
            </label>
            <input
              id="contact_name"
              name="contact_name"
              type="text"
              required
              className="mt-1 block w-full px-4 py-3 bg-[#0a1128]/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
              placeholder="Nattapakal Bunbuchha"
            />
          </div>

          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-slate-200">
              หมายเลขโทรศัพท์ <span className="text-slate-400 text-xs font-normal ml-1">/ Phone Number *</span>
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              required
              className="mt-1 block w-full px-4 py-3 bg-[#0a1128]/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
              placeholder="081-XXX-XXXX"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-200">
              อีเมลติดต่อองค์กร <span className="text-slate-400 text-xs font-normal ml-1">/ Business Email *</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-4 py-3 bg-[#0a1128]/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
              placeholder="corporate@yourorg.com"
            />
          </div>
        </div>

        {/* คอลัมน์ฝั่งขวา: ข้อมูลองค์กรและการให้บริการ */}
        <div className="space-y-5">
          <div>
            <label htmlFor="organization_name" className="block text-sm font-medium text-slate-200">
              ชื่อหน่วยงาน หรือ องค์กร <span className="text-slate-400 text-xs font-normal ml-1">/ Organization Name *</span>
            </label>
            <input
              id="organization_name"
              name="organization_name"
              type="text"
              required
              className="mt-1 block w-full px-4 py-3 bg-[#0a1128]/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
              placeholder="Surin Provincial Sports Association"
            />
          </div>

          <div>
            <label htmlFor="team_size" className="block text-sm font-medium text-slate-200">
              จำนวนสมาชิกในหน่วยงาน <span className="text-slate-400 text-xs font-normal ml-1">/ Total Sub-members *</span>
            </label>
            <select
              id="team_size"
              name="team_size"
              required
              className="mt-1 block w-full px-4 py-3 bg-[#0a1128] border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="" className="text-slate-500">เลือกจำนวนสมาชิก / Select size</option>
              <option value="under-50">น้อยกว่า 50 คน / Less than 50</option>
              <option value="51-100">51 - 100 คน</option>
              <option value="101-500">101 - 500 คน</option>
              <option value="over-500">500 คนขึ้นไป / More than 500</option>
            </select>
          </div>

          <div>
            <label htmlFor="duration_months" className="block text-sm font-medium text-slate-200">
              ระยะเวลาแพ็กเกจที่สนใจ <span className="text-slate-400 text-xs font-normal ml-1">/ Plan Duration *</span>
            </label>
            <select
              id="duration_months"
              name="duration_months"
              required
              className="mt-1 block w-full px-4 py-3 bg-[#0a1128] border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            >
              <option value="12">แผนแบบ 12 เดือน / 12-Month Contract (แนะนำคุ้มค่าที่สุด)</option>
              <option value="6">แผนแบบ 6 เดือน / 6-Month Contract</option>
            </select>
          </div>
        </div>
      </div>

      {/* ฟิลด์เพิ่มเติมตรงกลาง: LINE ID (ไม่บังคับ) */}
      <div className="border-t border-slate-800/80 pt-4">
        <label htmlFor="line_id" className="block text-sm font-medium text-slate-200">
          LINE ID <span className="text-slate-400 text-xs font-normal ml-1">(สำหรับการติดต่อกลับที่รวดเร็วสะดวกยิ่งขึ้น - เผื่อเลือก / Optional)</span>
        </label>
        <input
          id="line_id"
          name="line_id"
          type="text"
          className="mt-1 block w-full px-4 py-3 bg-[#0a1128]/70 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-inner"
          placeholder="Line_ID_Or_PhoneNumber"
        />
      </div>

      {/* ปุ่มกด Submit: ธีม Dark Blue & Teal พร้อมเส้นขอบขาวเรืองแสง */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex flex-col items-center justify-center py-4 px-4 rounded-xl text-white font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed
            border border-white/80 hover:border-white
            bg-gradient-to-r from-blue-950 to-teal-700 hover:from-blue-900 hover:to-teal-600 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a1128] focus:ring-green-500
            shadow-[0_0_15px_rgba(20,184,166,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]"
        >
          {loading ? (
            <span className="flex items-center text-sm font-bold">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังส่งข้อมูลคำขอ... / Submitting Request...
            </span>
          ) : (
            <>
              <span className="text-base font-bold">ส่งข้อมูลขอรับใบเสนอราคาองค์กร</span>
              <span className="text-xs font-normal text-slate-300 mt-0.5">Request Enterprise Quotation</span>
            </>
          )}
        </button>
      </div>

      {/* คำรับรองสิทธิ์ความปลอดภัย PDPA */}
      <div className="text-center text-xs text-slate-500 flex items-center justify-center space-x-1.5 pt-2 border-t border-slate-900">
        <span>🔒</span>
        <p>
          <strong>NiiVaa PDPA Compliance:</strong> ข้อมูลทั้งหมดจะถูกเก็บรักษาเป็นความลับอย่างเคร่งครัดตามกฎหมายคุ้มครองข้อมูลส่วนบุคคลและใช้เพื่อส่งใบเสนอราคาเท่านั้น 
          <span className="block text-[10px] text-slate-600 mt-0.5">All details are confidential and processed in accordance with data privacy laws.</span>
        </p>
      </div>
    </form>
  )
}