import SignupForm from './signup-form';

export default async function SignupPage({
  searchParams,
}: {
  // รองรับ Next.js เวอร์ชันใหม่ที่ searchParams เป็น Promise
  searchParams: Promise<{ plan_id?: string; is_free?: string; app?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const planId = resolvedSearchParams.plan_id;
  const isFree = resolvedSearchParams.is_free === 'true';
  const appParam = resolvedSearchParams.app;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a1128] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Glow Effect */}
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-teal-500/15 rounded-full blur-[100px] pointer-events-none"></div>

      {/* NiiVaa Container */}
      <div className="max-w-md w-full space-y-8 bg-[#111827]/80 backdrop-blur-xl p-10 rounded-3xl relative z-10 
        border-2 border-green-500/50 
        shadow-[0_0_20px_rgba(34,197,94,0.3)] 
        transition-all hover:shadow-[0_0_35px_rgba(34,197,94,0.4)]"
      >
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 tracking-tight leading-tight">
            สร้างบัญชีใหม่ <br/>
            <span className="text-2xl font-semibold text-white">Create an Account</span>
          </h2>
          <div className="mt-4 text-center text-sm text-slate-300">
            {planId ? (
              <>
                <p>กรอกข้อมูลเพื่อเริ่มใช้งานแพ็กเกจที่คุณเลือก</p>
                <p className="text-xs text-slate-400 mt-1">Fill in the details to start your selected plan</p>
              </>
            ) : (
              <>
                <p>เข้าสู่ระบบเครือข่าย NiiVaa Workspace</p>
                <p className="text-xs text-slate-400 mt-1">Join the NiiVaa Network Ecosystem</p>
              </>
            )}
          </div>
        </div>
        
        {/* ส่งค่าลงไปให้ Client Component จัดการต่อ */}
        <SignupForm planId={planId} isFree={isFree} app={appParam} />
        
        <div className="mt-6 text-center text-sm text-slate-400 border-t border-slate-700/50 pt-6">
          <p>มีบัญชีอยู่แล้ว? / Already have an account?</p>
          <a href={`/login${appParam ? `?app=${appParam}` : ''}`} className="inline-block mt-2 text-blue-400 hover:text-green-400 font-semibold transition-colors">
            เข้าสู่ระบบ / Log in
          </a>
        </div>
      </div>
    </div>
  );
}