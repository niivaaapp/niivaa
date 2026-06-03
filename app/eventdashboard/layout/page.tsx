"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function EventDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // ไม่มีสิทธิ์ เตะกลับไปหน้าล็อกอินพร้อมแนบ URL ปัจจุบันไปด้วยเผื่อล็อกอินเสร็จให้เด้งกลับมา
        router.push(`/login?redirectedFrom=${pathname}`);
      } else {
        // มีสิทธิ์ อนุญาตให้เรนเดอร์หน้าข้างในได้
        setIsAuthorized(true);
      }
    };

    checkUserSession();
  }, [router, pathname]);

  // ระหว่างรอเช็คสิทธิ์ ให้ขึ้นหน้าโหลดดิ้งก่อน เพื่อป้องกันหน้า Dashboard แวบขึ้นมา
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050b1a] flex flex-col items-center justify-center text-purple-400">
        <Loader2 size={32} className="animate-spin mb-4" />
        <span className="text-xs font-black tracking-widest uppercase">กำลังตรวจสอบสิทธิ์ความปลอดภัย...</span>
      </div>
    );
  }

  // ถ้าผ่านแล้ว ก็เรนเดอร์ระบบต่างๆ ภายใน /eventdashboard ต่อได้เลย
  return <>{children}</>;
}