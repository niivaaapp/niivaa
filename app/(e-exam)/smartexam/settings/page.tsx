'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Save, UploadCloud, Palette, Type, Image as ImageIcon, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [workspaceId, setWorkspaceId] = useState<string>('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#14b8a6'); // Default Teal
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // สีแนะนำสำหรับ Theme
  const colorSwatches = [
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Blue', value: '#3b82f6' },
  ];

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('service_code', 'SMART_EXAM')
        .single();

      if (error) throw error;
      if (data) {
        setWorkspaceId(data.id);
        setWorkspaceName(data.workspace_name);
        setLogoUrl(data.logo_url);
        if (data.theme_config && data.theme_config.primary_color) {
          setPrimaryColor(data.theme_config.primary_color);
        }
      }
    } catch (error: any) {
      console.error('Error fetching workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'ขนาดไฟล์โลโก้ต้องไม่เกิน 2MB' });
        return;
      }
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file)); // Preview ทันที
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      let finalLogoUrl = logoUrl;

      // ถ้ามีการเลือกไฟล์ใหม่ ให้อัปโหลดไปที่ Supabase Storage ก่อน
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${workspaceId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('workspace-assets')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        // ดึง URL สาธารณะของรูปภาพ
        const { data: publicUrlData } = supabase.storage
          .from('workspace-assets')
          .getPublicUrl(fileName);
          
        finalLogoUrl = publicUrlData.publicUrl;
      }

      // อัปเดตข้อมูลลงตาราง workspaces
      const { error: updateError } = await supabase
        .from('workspaces')
        .update({
          workspace_name: workspaceName,
          logo_url: finalLogoUrl,
          theme_config: { primary_color: primaryColor }
        })
        .eq('id', workspaceId);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' });
      setLogoFile(null); // เคลียร์ไฟล์ชั่วคราวหลังอัปโหลดเสร็จ

    } catch (error: any) {
      console.error('Error saving workspace:', error);
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans pb-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-6 pt-12 relative z-10">
        <Link href="/smartexam/dashboard" className="inline-flex items-center text-sm text-slate-400 hover:text-fuchsia-400 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าแผงควบคุม
        </Link>

        <h1 className="text-3xl font-black text-white mb-2">ตั้งค่าพื้นที่ทำงาน (Workspace Settings)</h1>
        <p className="text-slate-400 mb-8">ปรับแต่งชื่อ โลโก้ และสีสันระบบให้ตรงกับเอกลักษณ์องค์กรของคุณ</p>

        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : null}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl">
          
          {/* 1. โลโก้ */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><ImageIcon className="w-5 h-5 text-indigo-400" /> โลโก้องค์กร</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[#020617] rounded-2xl border border-slate-800">
              <div className="w-24 h-24 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Workspace Logo" className="w-full h-full object-contain" />
                ) : (
                  <UploadCloud className="w-8 h-8 text-slate-600" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm text-slate-400 mb-4">รองรับไฟล์ PNG, JPG ขนาดไม่เกิน 2MB แนะนำสัดส่วน 1:1</p>
                <label className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
                  เลือกรูปภาพใหม่
                  <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={handleFileChange} />
                </label>
              </div>
            </div>
          </div>

          {/* 2. ชื่อพื้นที่ทำงาน */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Type className="w-5 h-5 text-fuchsia-400" /> ชื่อพื้นที่ทำงาน</h3>
            <input 
              type="text" 
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#020617] border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition-all"
              placeholder="เช่น โรงเรียนมัธยมศึกษา..."
            />
          </div>

          {/* 3. สี Theme หลัก */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Palette className="w-5 h-5 text-rose-400" /> สีธีมหลัก (Primary Color)</h3>
            <div className="flex flex-wrap items-center gap-4">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => setPrimaryColor(swatch.value)}
                  className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${primaryColor === swatch.value ? 'ring-4 ring-slate-700 ring-offset-2 ring-offset-[#020617]' : ''}`}
                  style={{ backgroundColor: swatch.value }}
                  title={swatch.name}
                />
              ))}
              <div className="h-8 w-px bg-slate-700 mx-2"></div>
              <div className="flex items-center gap-2 bg-[#020617] px-3 py-1.5 border border-slate-700 rounded-xl">
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-sm font-mono text-slate-400 uppercase">{primaryColor}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}