import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutDashboard, Users, Server, Settings, LogOut } from 'lucide-react';

// 🌟 นำเข้า Supabase สำหรับฝั่ง Server (แก้ไข Path ให้ตรงกับโฟลเดอร์ utils ของคุณถ้าจำเป็น)
import { createClient } from '@/utils/supabase/server';

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // 🛡️ 1. ตรวจสอบว่าผู้ใช้ล็อกอินอยู่หรือไม่
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login'); // ยังไม่ล็อกอิน ดีดไปหน้า Login
  }

  // 🛡️ 2. ตรวจสอบสิทธิ์ (Role) จากตาราง profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single();

  // 🛡️ 3. ถ้าไม่ใช่ super_admin ให้ดีดกลับไปหน้า Dashboard ของผู้ใช้ทั่วไป
  if (profile?.system_role !== 'super_admin') {
    redirect('/smart-media-dashboard'); 
  }

  // 🟢 ผ่านการตรวจสอบสิทธิ์: แสดงผลหน้า Dashboard ของ Super Admin
  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200 font-sans">
      {/* 🌟 Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
            NiiVaa SuperAdmin
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/super-dashboard" className="flex items-center gap-3 px-4 py-3 bg-teal-500/10 text-teal-400 rounded-xl font-bold border border-teal-500/20">
            <LayoutDashboard size={20} /> ภาพรวมระบบ
          </Link>
          <Link href="/super-dashboard/users" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <Users size={20} /> จัดการผู้ใช้
          </Link>
          <Link href="/super-dashboard/workspaces" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <Server size={20} /> จัดการ Workspaces
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-800">
          {/* หมายเหตุ: ปุ่ม Logout ใน Server Component มักจะต้องใช้ <form> Action หรือ Client Component */}
          <form action="/auth/signout" method="post">
            <button type="submit" className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-bold">
              <LogOut size={20} /> ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>

      {/* 🌟 Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}