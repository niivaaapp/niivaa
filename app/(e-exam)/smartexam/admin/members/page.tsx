import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Users, Mail, Shield, User, ArrowLeft, PlusCircle, Trash2 } from 'lucide-react';
import { inviteMemberAction } from '@/app/actions/member-actions';

export default async function AdminMembersPage() {
  const supabase = await createClient();

  // 1. ตรวจสอบ Auth Session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login?next=/smartexam/admin/members');

  // 2. ตรวจสอบสิทธิ์ว่าต้องเป็น 'admin' เท่านั้น
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role, org_id')
    .eq('profile_id', user.id)
    .eq('app_id', 'c3333333-3333-3333-3333-3333-333333333333')
    .maybeSingle();

  // ป้องกันกรณี userRole เป็น null หรือไม่มี org_id
  if (!userRole || userRole.role !== 'admin' || !userRole.org_id) {
    redirect('/smart-exam-dashboard'); // ถ้าไม่ใช่แอดมินหรือไม่มีองค์กร เตะกลับ Dashboard
  }

  // กำหนด org_id ให้เป็น string ที่ปลอดภัยแน่นอน
  const currentOrgId = userRole.org_id as string;

  // 3. ดึงข้อมูลสมาชิกทั้งหมดในองค์กรนี้
  const { data: members } = await supabase
    .from('organization_members')
    .select('profile_id, org_role, created_at')
    .eq('org_id', currentOrgId)
    .order('created_at', { ascending: true });

  // ผูก Action ด้วย .bind โดยระบุ Type ให้ชัดเจน (หรือใช้วิธีซ่อน input ในฟอร์มด้านล่างแทนก็ได้ครับ)
  // 📌 ==========================================
  // 👉 นำฟังก์ชัน handleInvite มาวางไว้ตรงนี้ครับ!
  // ==========================================
  async function handleInvite(formData: FormData) {
    'use server';
    await inviteMemberAction(formData, currentOrgId);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-12 relative overflow-hidden">
      {/* Background Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-900/10 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <div className="max-w-5xl mx-auto px-6 pt-12 relative z-10">

        {/* Header */}
        <div className="mb-8">
          <Link href="/smartexam/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-rose-400 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปหน้าแผงควบคุม
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Users size={24} />
            </div>
            <h1 className="text-3xl font-black text-white tracking-wide">จัดการสมาชิกในโรงเรียน</h1>
          </div>
          <p className="text-slate-400">เพิ่มและกำหนดสิทธิ์คุณครูท่านอื่นเพื่อเข้าใช้งานคลังข้อสอบและแผงควบคุมเดียวกัน</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ส่วนฟอร์มเชิญสมาชิก (Sidebar) */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-fuchsia-400" /> เชิญสมาชิกใหม่
              </h2>

              <form action={handleInvite} className="space-y-4">
                {/* ไม่จำเป็นต้องใช้ hidden input แล้ว เพราะเราส่งผ่านพารามิเตอร์ตรงๆ ได้เลย */}
                <div>
                  <label htmlFor="email" className="block text-sm text-slate-400 mb-1.5">อีเมลของคุณครู</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    placeholder="teacher@school.ac.th"
                    className="w-full px-4 py-2.5 bg-[#020617] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm text-slate-400 mb-1.5">สิทธิ์การใช้งาน (Role)</label>
                  <select
                    id="role"
                    name="role"
                    className="w-full px-4 py-2.5 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
                  >
                    <option value="teacher">คุณครู / ผู้สอน (Teacher)</option>
                    <option value="admin">ผู้บริหารระบบ (Admin)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-rose-600 to-fuchsia-600 hover:from-rose-500 hover:to-fuchsia-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] mt-2"
                >
                  <PlusCircle size={18} /> ส่งคำเชิญ (Invite)
                </button>
              </form>

              <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 leading-relaxed">
                <strong>หมายเหตุ:</strong> ระบบจะส่งอีเมลพร้อมลิงก์ยืนยันตัวตนไปยังผู้ถูกเชิญ เมื่อผู้ใช้ตั้งรหัสผ่านสำเร็จ จะถูกดึงเข้าสู่ระบบของโรงเรียนโดยอัตโนมัติ
              </div>
            </div>
          </div>

          {/* ส่วนแสดงรายชื่อสมาชิก (Main Content) */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">รายชื่อสมาชิกปัจจุบัน</h2>
                <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-full border border-slate-700">
                  {members?.length || 0} คน
                </span>
              </div>

              <div className="divide-y divide-slate-800/50">
                {members?.map((member) => (
                  <div key={member.profile_id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-0.5 font-mono">
                          ID: {member.profile_id.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          {member.org_role === 'owner' || member.org_role === 'admin' ? (
                            <span className="text-rose-400 flex items-center gap-1"><Shield size={12} /> ผู้ดูแลระบบ</span>
                          ) : (
                            <span>คุณครู / ผู้สอน</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {member.profile_id !== user.id && (
                      <button className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="นำออกจากองค์กร">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}

                {(!members || members.length === 0) && (
                  <div className="px-6 py-12 text-center text-slate-500">
                    ไม่พบข้อมูลสมาชิกในระบบ
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}