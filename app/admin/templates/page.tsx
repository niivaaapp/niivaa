"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutTemplate, Plus, Edit, Trash2, Eye, EyeOff, Loader2, ArrowLeft, Tag } from 'lucide-react';

export default function AdminTemplatesDashboard() {
    const supabase = createClient();
    const router = useRouter();
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State สำหรับ Modal สร้างใหม่
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('official');
    const [isCreating, setIsCreating] = useState(false);

    const fetchTemplates = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('script_templates')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (!error && data) setTemplates(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle) return alert('กรุณาตั้งชื่อเทมเพลต');
        
        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('script_templates')
                .insert([{ 
                    title: newTitle, 
                    category: newCategory,
                    content_chunks: [] 
                }])
                .select('id')
                .single();

            if (error) throw error;
            
            // นำทางไปยังหน้า Builder เพื่อเขียนสคริปต์
            router.push(`/admin/templates/builder?template_id=${data.id}`);
        } catch (error: any) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const toggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('script_templates')
            .update({ is_active: !currentStatus })
            .eq('id', id);
            
        if (!error) fetchTemplates();
    };

    const deleteTemplate = async (id: string, title: string) => {
        if (confirm(`แน่ใจหรือไม่ว่าต้องการลบเทมเพลต "${title}"?`)) {
            const { error } = await supabase.from('script_templates').delete().eq('id', id);
            if (!error) fetchTemplates();
        }
    };

    return (
        <div className="min-h-screen bg-[#050B14] text-gray-200 font-sans p-6 md:p-10 selection:bg-amber-500/30">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <Link href="/admin" className="flex items-center text-sm text-gray-400 hover:text-white mb-2 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้า Admin
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
                            <LayoutTemplate className="text-amber-500" /> จัดการเทมเพลตสคริปต์
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">คลังสคริปต์กลางสำหรับผู้ใช้งาน NiiVaa SmartEvent</p>
                    </div>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-black px-5 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                        <Plus className="w-5 h-5" /> สร้างเทมเพลตใหม่
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-amber-500" /></div>
                ) : (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-black/50 border-b border-gray-800 text-gray-400 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-bold">ชื่อเทมเพลต</th>
                                    <th className="px-6 py-4 font-bold">หมวดหมู่ (Category)</th>
                                    <th className="px-6 py-4 font-bold">สถานะ</th>
                                    <th className="px-6 py-4 font-bold text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {templates.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-10 text-gray-500">ยังไม่มีเทมเพลตในระบบ</td></tr>
                                ) : (
                                    templates.map(tpl => (
                                        <tr key={tpl.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-white">{tpl.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-gray-800 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-xs">
                                                    {tpl.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => toggleActive(tpl.id, tpl.is_active)}
                                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${tpl.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700'}`}
                                                >
                                                    {tpl.is_active ? <><Eye className="w-3 h-3"/> เปิดใช้งาน</> : <><EyeOff className="w-3 h-3"/> ซ่อนไว้</>}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Link 
                                                        href={`/admin/templates/builder?template_id=${tpl.id}`}
                                                        className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors border border-blue-500/30"
                                                        title="แก้ไขสคริปต์"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button 
                                                        onClick={() => deleteTemplate(tpl.id, tpl.title)}
                                                        className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors border border-red-500/30"
                                                        title="ลบเทมเพลต"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal สร้างเทมเพลตใหม่ */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleCreateTemplate} className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">สร้างเทมเพลตใหม่</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 font-bold block mb-1">ชื่อเทมเพลต</label>
                                <input type="text" autoFocus required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="เช่น สคริปต์งานสัมมนา (แบบทางการ)" className="w-full bg-black border border-gray-700 focus:border-amber-500 rounded-xl px-4 py-3 text-white outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 font-bold block mb-1">หมวดหมู่งาน</label>
                                <div className="relative">
                                    <Tag className="w-4 h-4 text-gray-500 absolute left-4 top-3.5" />
                                    <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-black border border-gray-700 focus:border-amber-500 rounded-xl pl-10 pr-4 py-3 text-white outline-none appearance-none">
                                        <option value="official">งานรัฐพิธี / พิธีการทางการ</option>
                                        <option value="farewell_welcome">งานพิธีแสดงความยินดี / การต้อนรับ</option>
                                        <option value="seminar">งานสัมมนา / การประชุม</option>
                                        <option value="wedding">งานแต่งงาน</option>
                                        <option value="sport">การแข่งขันกีฬา</option>
                                        <option value="other">อื่นๆ</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition-colors">ยกเลิก</button>
                            <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                                {isCreating ? <Loader2 className="w-5 h-5 animate-spin"/> : 'สร้างและไปหน้าเขียน'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}