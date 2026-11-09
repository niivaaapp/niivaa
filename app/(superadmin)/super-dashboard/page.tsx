'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { deleteWorkspace } from '@/app/actions/super-admin';
import { Trash2, Loader2, Search, PlusCircle, FileText } from 'lucide-react'; // 🌟 เพิ่มไอคอน PlusCircle, FileText
import Link from 'next/link'; // 🌟 นำเข้า Link สำหรับทำปุ่มเปลี่ยนหน้า

export default function SuperDashboardPage() {
  const supabase = createClient();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    setLoading(true);
    // ดึงข้อมูล Workspace พร้อมชื่อเจ้าของจากตาราง profiles
    const { data, error } = await supabase
      .from('workspaces')
      .select('*, profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWorkspaces(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`⚠️ คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${name}"?\nข้อมูลที่เกี่ยวข้องทั้งหมดจะถูกลบถาวร`)) return;
    
    setDeletingId(id);
    const result = await deleteWorkspace(id);
    setDeletingId(null);

    if (result.success) {
      alert('✅ ลบข้อมูลสำเร็จ');
      fetchWorkspaces(); // รีเฟรชตาราง
    } else {
      alert('❌ ลบไม่สำเร็จ: ' + result.message);
    }
  };

  if (loading) return <div className="text-center py-20 text-teal-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 🌟 ปรับปรุงส่วน Header เพิ่มกลุ่มปุ่มกดด้านขวา */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">ภาพรวม Workspaces</h2>
          <p className="text-slate-400">โปรเจกต์ทั้งหมดที่เปิดใช้งานในระบบ NiiVaa</p>
        </div>
        
        {/* 🌟 เพิ่มปุ่มทั้ง 2 ปุ่มตรงนี้ */}
        <div className="flex flex-wrap items-center gap-3">
          <Link 
            href="/admin/create-template" 
            className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-bold transition-all shadow-md"
          >
            <PlusCircle size={18} />
            สร้างเทมเพลตชุดสื่อ
          </Link>
          
          <Link 
            href="/admin/templates" 
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/30 rounded-xl text-sm font-bold transition-all shadow-md"
          >
            <FileText size={18} />
            สร้างเทมเพลตสคริปต์พิธีกร
          </Link>
        </div>
      </div>

      {/* 🌟 ตารางข้อมูล Workspaces */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-bold text-xs">
              <tr>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Workspace Name</th>
                <th className="px-6 py-4">Owner (Profile)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {workspaces.map((ws) => (
                <tr key={ws.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-md text-[10px] font-bold border border-blue-500/20">
                      {ws.service_code || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{ws.workspace_name}</td>
                  <td className="px-6 py-4">
                    {ws.profiles ? `${ws.profiles.first_name || ''} ${ws.profiles.last_name || ''}` : 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    {ws.is_private ? (
                      <span className="text-amber-400 text-xs flex items-center gap-1">🔒 Private</span>
                    ) : (
                      <span className="text-emerald-400 text-xs flex items-center gap-1">🌐 Public</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(ws.id, ws.workspace_name)}
                      disabled={deletingId === ws.id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                      title="ลบโปรเจกต์"
                    >
                      {deletingId === ws.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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