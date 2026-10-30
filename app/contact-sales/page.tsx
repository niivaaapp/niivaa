// app/contact-sales/page.tsx
import ContactForm from './contact-form';

export default function ContactSalesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1128] py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Radial Glow Layer */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[110px] pointer-events-none"></div>

      {/* 🌟 NiiVaa Container - ตีกรอบด้วย Green นีออนเด่นชัดและไม่มีฟอนต์สีดำ */}
      <div className="max-w-3xl w-full space-y-8 bg-[#111827]/85 backdrop-blur-xl p-8 md:p-12 rounded-3xl relative z-10 
        border-2 border-green-500/50 
        shadow-[0_0_25px_rgba(34,197,94,0.25)] 
        transition-all duration-300 hover:shadow-[0_0_40px_rgba(34,197,94,0.35)]"
      >
        <div className="text-center border-b border-slate-800 pb-6">
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-teal-300 tracking-tight leading-tight">
            ติดต่อรับใบเสนอราคาองค์กร
          </h2>
          <p className="text-xl font-semibold text-teal-400 mt-1">
            Contact Enterprise Sales
          </p>
          <p className="mt-4 text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            โปรดกรอกรายละเอียดเบื้องต้นเพื่อให้ทีมงานเตรียมข้อเสนอที่เหมาะสมและคุ้มค่าที่สุดสำหรับหน่วยงานของคุณ ผู้เชี่ยวชาญของเราจะติดต่อกลับทางโทรศัพท์หรือ LINE โดยเร็วที่สุดปกติภายในวันเดียวกัน
          </p>
        </div>

        {/* เรียกใช้งาน Client Form */}
        <ContactForm />
      </div>
    </div>
  );
}