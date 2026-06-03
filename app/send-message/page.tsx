"use client";

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function SendMessageForm() {
  const searchParams = useSearchParams();
  const eventId = searchParams?.get?.('event_id') || '';
  
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !eventId) return;

    setStatus('sending');
    const { error } = await supabase.from('event_live_messages').insert([{
      event_id: eventId,
      sender_name: name || 'ผู้ร่วมงาน',
      sender_role: 'guest', // ค่าเริ่มต้นคือผู้ร่วมงานทั่วไป
      message_text: message.trim(),
      is_approved: true
    }]);

    if (!error) {
      setStatus('success');
      setMessage('');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center font-sans text-white">
      <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-6 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black italic">
            <span className="text-blue-500">Nii</span><span className="text-emerald-400">Vaa</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">พิมพ์ข้อความส่งขึ้นจอสัมมนา</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 font-bold mb-1 block">ชื่อของคุณ (ไม่บังคับ)</label>
            <input 
              type="text" 
              placeholder="เช่น น้องเอบีซี"
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 font-bold mb-1 block">ข้อความ / คำตอบ <span className="text-red-500">*</span></label>
            <textarea 
              required rows={3}
              placeholder="พิมพ์คำถาม หรือคำตอบร่วมสนุกที่นี่..."
              value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <button 
            type="submit" disabled={status === 'sending'}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black py-3 rounded-xl shadow-lg mt-4 disabled:opacity-50"
          >
            {status === 'sending' ? 'กำลังส่งข้อมูล...' : status === 'success' ? '✅ ส่งขึ้นจอสำเร็จ!' : '🚀 ส่งข้อความ'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MobileSenderApp() {
  return (
    <Suspense fallback={<div className="bg-black min-h-screen"></div>}>
      <SendMessageForm />
    </Suspense>
  );
}