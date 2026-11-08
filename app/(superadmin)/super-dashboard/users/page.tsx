'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { deleteUserAccount } from '@/app/actions/super-admin';
import { Trash2, Loader2, User, Mail, ShieldAlert } from 'lucide-react';

export default function ManageUsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    // ดึงข้อมูลจากตาราง profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!window.confirm(`⚠️ คำเตือนขั้นสูงสุด: ยืนยันการลบผู้ใช้ "${name}" หรือไม่?\nหากคุณตั้งค่า ON DELETE CASCADE ไว้ ข้อมูลโปรเจกต์และองค์กรทั้งหมดของผู้ใช้นี้จะถูกลบทิ้งอย่างถาวร!`)) return;
    
    setDeletingId(userId);
    const result = await deleteUserAccount(userId);
    setDeletingId(null);

    if (result.success) {
      alert('✅ ลบบัญชีผู้ใช้สำเร็จ');
      fetchUsers(); // รีเฟรชตาราง
    } else {
      alert('❌ ลบไม่สำเร็จ: ' + result.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-teal-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-teal-400" /> จัดการผู้ใช้งาน (Users)
          </h2>
          <p className="text-slate-400">รายชื่อบัญชีผู้ใช้ทั้งหมดที่ลงทะเบียนในระบบ NiiVaa</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4">Profile Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">
                    {user.first_name || ''} {user.last_name || 'ไม่ระบุชื่อ'}
                  </td>
                  <td className="px-6 py-4 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" /> {user.email || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-800 px-3 py-1 rounded-full text-xs border border-slate-700">
                      {user.role || 'Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(user.created_at).toLocaleDateString('th-TH')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDeleteUser(user.id, `${user.first_name || ''} ${user.last_name || ''}`)}
                      disabled={deletingId === user.id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                      title="ลบบัญชีถาวร"
                    >
                      {deletingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}