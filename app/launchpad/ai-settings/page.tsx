'use client';
import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
if (typeof window !== 'undefined') {
  console.log("--- ตรวจสอบกุญแจผ่านหน้าจอ ---");
  console.log("1. URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ มีค่า" : "❌ ว่างเปล่า");
  console.log("2. Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ มีค่า" : "❌ ว่างเปล่า");
  console.log("---------------------------");
}
export default function AISettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAiActive, setIsAiActive] = useState(false);
  const [policyText, setPolicyText] = useState('');
  const [personality, setPersonality] = useState('professional');
  const [message, setMessage] = useState('');

// ค้นหาจุดที่สร้าง supabase แล้วเปลี่ยนเป็นแบบนี้ครับ
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '', // เพิ่ม .trim() เพื่อลบเว้นวรรคที่อาจติดมา
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '' // เพิ่ม .trim() เช่นกันครับ
);


  // 1. ดึงข้อมูลการตั้งค่าเดิม
  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('service_code', 'MUSIC') // ในที่นี้ขอยกตัวอย่างโมดูลเพลง
        .single();

      if (data) {
        setIsAiActive(data.is_ai_active);
        setPolicyText(data.ai_policy_text);
        setPersonality(data.ai_personality_type);
      }
    };
    fetchSettings();
  }, [supabase]);

  // 2. บันทึกการตั้งค่า (มอบนโยบาย)
  const saveSettings = async () => {
    setLoading(true);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('ai_settings')
      .upsert({
        user_id: user?.id,
        service_code: 'MUSIC',
        is_ai_active: isAiActive,
        ai_policy_text: policyText,
        ai_personality_type: personality,
        updated_at: new Date()
      }, { onConflict: 'user_id, service_code' });

    if (error) {
      setMessage('❌ เกิดข้อผิดพลาดในการบันทึก');
    } else {
      setMessage('✅ บันทึกนโยบาย AI เรียบร้อยแล้ว');
      setTimeout(() => setMessage(''), 3000);
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ color: '#00ccff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🤖 ศูนย์บัญชาการ AI  NiiVaaApp
        </h2>

        {/* ส่วนเปิด-ปิด AI */}
        <div style={settingRow}>
          <div>
            <div style={{ fontWeight: 'bold' }}>สถานะระบบ AI</div>
            <div style={{ fontSize: '0.8em', color: '#888' }}>เปิดใช้งานเพื่อให้ AI ช่วยจัดการคิวเพลง</div>
          </div>
          <button 
            onClick={() => setIsAiActive(!isAiActive)}
            style={{
              ...toggleStyle,
              background: isAiActive ? '#00ccff' : '#333'
            }}
          >
            {isAiActive ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* ส่วนมอบนโยบายบุคลิก */}
        <div style={{ marginTop: '30px' }}>
          <label style={labelStyle}>เลือกบุคลิกของ AI</label>
          <select 
            value={personality} 
            onChange={(e) => setPersonality(e.target.value)}
            style={inputStyle}
          >
            <option value="professional">พิธีกรทางการ (Official)</option>
            <option value="entertainer">ดีเจสายเอนเตอร์เทน (Fun)</option>
            <option value="chill">ดีเจคาเฟ่ (Chill)</option>
          </select>
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={labelStyle}>นโยบาย AI (Policy Instruction)</label>
          <textarea 
            rows={5}
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            placeholder="พิมพ์คำสั่งหรือนโยบายที่ต้องการให้ AI ปฏิบัติตาม..."
            style={{ ...inputStyle, resize: 'none' }}
          />
          <p style={{ fontSize: '0.75em', color: '#555', marginTop: '5px' }}>
            * ตัวอย่าง: "พูดจาสุภาพ แนะนำชื่อเพลง และคั่นด้วยเกร็ดความรู้สั้นๆ"
          </p>
        </div>

        <button 
          disabled={loading}
          onClick={saveSettings}
          style={saveButtonStyle}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกนโยบาย AI'}
        </button>

        {message && <div style={messageStyle}>{message}</div>}
        
        <button 
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#555', marginTop: '20px', cursor: 'pointer' }}
        >
          ← ย้อนกลับ
        </button>
      </div>
    </div>
  );
}

// --- Styles ---
const containerStyle: React.CSSProperties = {
  minHeight: '100vh', background: '#000033', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
};

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: '600px', background: 'rgba(255,255,255,0.03)', padding: '40px', borderRadius: '24px',
  border: '1px solid rgba(0,204,255,0.1)', backdropFilter: 'blur(10px)'
};

const settingRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px'
};

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.9em', color: '#00ccff', marginBottom: '8px', fontWeight: 'bold' };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px', background: '#000', border: '1px solid #333', borderRadius: '10px', color: '#fff', outline: 'none'
};

const toggleStyle: React.CSSProperties = {
  width: '60px', padding: '8px', border: 'none', borderRadius: '20px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s'
};

const saveButtonStyle: React.CSSProperties = {
  width: '100%', padding: '15px', marginTop: '30px', background: 'linear-gradient(45deg, #0066cc, #00ccff)',
  color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,204,255,0.3)'
};

const messageStyle: React.CSSProperties = { textAlign: 'center', marginTop: '15px', fontSize: '0.9em' };