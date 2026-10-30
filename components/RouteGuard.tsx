'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles: string[]; // ตำแหน่งที่อนุญาตให้เข้าหน้านี้ เช่น ['admin', 'mc']
}

export default function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event_id');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 🌟 ดึงสิทธิ์ที่ถูกบันทึกไว้ตอนล็อคอิน
    const staffRole = localStorage.getItem('niivaa_event_role');
    
    if (!eventId) {
        alert(' Error: ไม่พบรหัสงานอีเวนต์');
        router.push('/'); // ส่งไปหน้าแรก
        return;
    }

    // 🌟 ถ้าไม่มีสิทธิ์ หรือ Role ไม่อยู่ในรายชื่อที่อนุญาต
    if (!staffRole || !allowedRoles.includes(staffRole)) {
      alert('🔒 สิทธิ์ของคุณไม่ได้รับอนุญาตให้เข้าหน้านี้ กรุณากรอกรหัส PIN');
      router.push(`/live/login?event_id=${eventId}`); // ส่งกลับหน้า Login
    } else {
      setAuthorized(true);
    }
  }, [router, allowedRoles, eventId]);

  return authorized ? <>{children}</> : null;
}