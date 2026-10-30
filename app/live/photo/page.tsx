'use client';
import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UploadCloud, Image as ImageIcon, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function GuestPhotoUpload() {
  const [nickname, setNickname] = useState('');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('กรุณาเลือกรูปภาพก่อนครับ!');
    if (!nickname.trim()) return alert('กรุณาใส่ชื่อของคุณด้วยครับ');
    
    setIsUploading(true);
    try {
      // 1. อัปโหลดรูปลง Storage (โฟลเดอร์ guest-uploads)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage.from('guest-uploads').upload(fileName, file);
      
      if (uploadError) throw uploadError;

      // 2. ดึง URL ของรูปภาพ
      const { data: { publicUrl } } = supabase.storage.from('guest-uploads').getPublicUrl(fileName);

      // 3. บันทึกลงฐานข้อมูล
      const { error: dbError } = await supabase.from('live_photos').insert([{
        nickname,
        caption,
        image_url: publicUrl,
        event_id: 'current' // ปรับตามจริง
      }]);

      if (dbError) throw dbError;

      setIsSuccess(true);
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-6 animate-bounce" />
        <h1 className="text-3xl font-black text-white mb-2">ส่งรูปสำเร็จ!</h1>
        <p className="text-zinc-400">รูปภาพของคุณกำลังเดินทางไปที่หน้าจอหลัก รอชมได้เลยครับ 🎉</p>
        <button onClick={() => { setIsSuccess(false); setFile(null); setPreview(''); setCaption(''); }} className="mt-8 bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold">ส่งรูปภาพเพิ่ม</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans flex flex-col max-w-md mx-auto">
      <div className="text-center py-6">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Live Photo Gallery</h1>
        <p className="text-xs text-zinc-400 mt-1">แบ่งปันความทรงจำดีๆ ขึ้นจอภาพหลัก</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
        {/* เลือกรูปภาพ */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all ${preview ? 'border-cyan-500' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'}`}
        >
          {preview ? (
            <>
              <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <ImageIcon className="w-10 h-10 text-white mb-2" />
                <span className="font-bold">แตะเพื่อเปลี่ยนรูป</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-zinc-500">
              <UploadCloud className="w-12 h-12 mb-3" />
              <span className="font-bold text-lg">แตะเพื่อเลือกรูปภาพ</span>
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        {/* ข้อมูล */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 ml-2">ชื่อของคุณ <span className="text-red-500">*</span></label>
            <input required type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="พิมพ์ชื่อของคุณ..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500 mt-1" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-400 ml-2">คำบรรยายภาพ (สั้นๆ)</label>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} placeholder="เขียนข้อความถึงงานนี้..." className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500 mt-1 resize-none" />
          </div>
        </div>

        <button disabled={isUploading} type="submit" className="mt-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50">
          {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          {isUploading ? 'กำลังส่งภาพขึ้นจอ...' : 'ส่งรูปขึ้นจอเลย!'}
        </button>
      </form>
    </div>
  );
}