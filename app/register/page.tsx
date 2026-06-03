'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr'; // เปลี่ยนมาใช้ตัวนี้ครับ
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [refCode, setRefCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false); // เพิ่มตัวนี้ครับ
  const router = useRouter();

  // สร้าง supabase client สำหรับ Client Component (Browser)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. ตรวจสอบรหัสผู้แนะนำ (ถ้ามี)
      let referrerId = null;
      if (refCode) {
        const { data: refData } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', refCode)
          .single();
        
        if (refData) referrerId = refData.id;
      }
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + "...");
      // 2. สมัครสมาชิกผ่าน Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setMessage('สมัครสำเร็จ! กำลังพาคุณไปยังหน้าเลือกบริการ...');
      
      // 1. ล้างค่าในฟอร์ม
      setEmail('');
      setPassword('');
      setFullName('');
      setRefCode('');

      // 2. หน่วงเวลา 2 วินาทีเพื่อให้คนอ่านข้อความสำเร็จ แล้วพาไปหน้า Portal
      setTimeout(() => {
        router.push('/services'); // สมมติว่าหน้าเลือกโมดูลคือ /services
      }, 2000);

      if (data.user && referrerId) {
        // 3. บันทึกความสัมพันธ์ผู้แนะนำ
        await supabase
          .from('profiles')
          .update({ referred_by: referrerId })
          .eq('id', data.user.id);
      }
      
      setMessage('สมัครสำเร็จ! โปรดเช็คอีเมลเพื่อยืนยันการใช้งาน (Check Spam ด้วยนะครับ)');

    } catch (error: any) {
      setMessage(`ข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#050505', color: '#fff', fontFamily: 'sans-serif' 
    }}>
      <div style={{ 
        width: '100%', maxWidth: '400px', padding: '40px', background: '#111', 
        borderRadius: '20px', border: '1px solid #333', boxShadow: '0 10px 40px rgba(0,204,255,0.1)'
      }}>
        <h2 style={{ textAlign: 'center', color: '#00ccff', marginBottom: '30px' }}>
          🚀 สมัครสมาชิก NiiVaaApp
        </h2>

        <form onSubmit={handleRegister} style={{ display: 'grid', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '0.8em', color: '#888' }}>ชื่อ-นามสกุล</label>
            <input required type="text" value={fullName} onChange={(e)=>setFullName(e.target.value)} 
              style={inputStyle} placeholder="ชื่อของคุณ" />
          </div>

          <div>
            <label style={{ fontSize: '0.8em', color: '#888' }}>อีเมล</label>
            <input required type="email" value={email} onChange={(e)=>setEmail(e.target.value)} 
              style={inputStyle} placeholder="example@mail.com" />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '0.8em', color: '#888' }}>รหัสผ่าน (6 ตัวขึ้นไป)</label>
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)} 
              style={inputStyle} 
              placeholder="••••••••" 
            />
            {/* ปุ่มรูปดวงตานีออนฟ้าขาว */}
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '32px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: '0.3s'
              }}
            >
              {showPassword ? (
                <span style={{ color: '#00ccff', textShadow: '0 0 8px #00ccff' }}>👁️</span> // ตาเปิด สีฟ้าเรืองแสง
              ) : (
                <span style={{ color: '#e0f2fe', opacity: 0.8 }}>
                   {/* รูปตาที่มีขีดทับ (ใช้ SVG เพื่อความสวยงามเป๊ะๆ) */}
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                   </svg>
                </span>
              )}
            </button>
          </div>

          <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '10px', border: '1px dashed #3366FF' }}>
            <label style={{ fontSize: '0.8em', color: '#3366FF', fontWeight: 'bold' }}>🎁 รหัสผู้แนะนำ (ถ้ามี)</label>
            <input type="text" value={refCode} onChange={(e)=>setRefCode(e.target.value)} 
              style={{ ...inputStyle, background: 'transparent', border: 'none', borderBottom: '1px solid #333' }} 
              placeholder="กรอกรหัสเพื่อน" />
          </div>

          <button disabled={loading} type="submit" style={{ 
            padding: '15px', background: '#3366FF', color: '#fff', border: 'none', 
            borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'
          }}>
            {loading ? 'กำลังดำเนินการ...' : 'สร้างบัญชีผู้ใช้'}
          </button>

          {message && (
            <p style={{ 
              textAlign: 'center', fontSize: '0.85em', 
              color: message.includes('สำเร็จ') ? '#28a745' : '#dc3545',
              padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px'
            }}>
              {message}
            </p>
          )}
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.8em', marginTop: '20px', color: '#555' }}>
          มีบัญชีอยู่แล้ว? <a href="/login" style={{ color: '#00ccff', textDecoration: 'none' }}>เข้าสู่ระบบ</a>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '12px', marginTop: '5px', background: '#222', 
  border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none'
};