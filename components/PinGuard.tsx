'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

interface PinGuardProps {
  eventId: string;
  children?: React.ReactNode;
  onSuccess?: () => void; // 👈 เพิ่มรองรับ Callback เมื่อปลดล็อกสำเร็จ
}

export default function PinGuard({ eventId, children, onSuccess }: PinGuardProps) {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // เช็กว่าเคยกรอกรหัสผ่านไปแล้วหรือยังใน Session นี้
    if (sessionStorage.getItem(`unlocked_${eventId}`) === 'true') {
      setIsLocked(false);
      if (onSuccess) onSuccess(); // เรียก callback ถ้ามี
    }
  }, [eventId, onSuccess]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('share_pin, share_expiry')
        .eq('id', eventId)
        .single();

      if (fetchError || !data) throw new Error('ไม่พบข้อมูลงานจัดแสดง');
      
      // ตรวจสอบ PIN
      if (data.share_pin !== pin) {
        throw new Error('รหัส PIN ไม่ถูกต้อง');
      }

      // ตรวจสอบเวลาหมดอายุ
      if (data.share_expiry && new Date() > new Date(data.share_expiry)) {
        throw new Error('รหัสผ่านนี้หมดอายุแล้ว โปรดขอลิงก์ใหม่');
      }

      // ผ่านเงื่อนไขทั้งหมด ปลดล็อกและจำไว้ใน Session
      sessionStorage.setItem(`unlocked_${eventId}`, 'true');
      setIsLocked(false);
      
      // ถ้ามีการส่งฟังก์ชัน onSuccess มา ให้เรียกใช้งานด้วย
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-xl font-black text-white mb-2">กรอกรหัสเพื่อเข้าดูสคริปต์</h2>
        <p className="text-zinc-400 text-sm mb-6">ลิงก์นี้มีการป้องกัน กรุณากรอกรหัส PIN 6 หลักที่ได้รับจากผู้จัดงาน</p>

        <form onSubmit={handleUnlock} className="space-y-4">
          <input
            type="text"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} // รับเฉพาะตัวเลข
            placeholder="รหัส PIN 6 หลัก"
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-mono text-amber-400 tracking-[0.5em] focus:border-amber-500 outline-none"
          />
          {error && (
            <div className="flex items-center justify-center gap-2 text-rose-400 text-sm font-bold bg-rose-500/10 p-2 rounded-lg">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || pin.length < 6}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'กำลังตรวจสอบ...' : <><Unlock size={18} /> เข้าสู่ระบบ</>}
          </button>
        </form>
      </div>
    </div>
  );
}