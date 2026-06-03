'use client';
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // 💡 ต้อง import supabase ของจริงเข้ามา

export default function MediaAssetHub() {
  const [isUploading, setIsUploading] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 🔄 ฟังก์ชันดึงรายการไฟล์ทั้งหมดจาก Bucket 'event-media' เมื่อเปิดหน้าจอ
  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const fetchMediaFiles = async () => {
    try {
      // ดึงรายชื่อไฟล์จากบักเก็ต event-media
      const { data, error } = await supabase.storage.from('event-media').list();

      if (error) throw error;
      if (data) {
        // กรองเอาเฉพาะไฟล์ที่มีอยู่จริง (ตัด folder เปล่าทิ้ง)
        const files = data.filter(file => file.name !== '.emptyFolderPlaceholder');

        // สร้างข้อมูล Asset พร้อมดึงลิงก์ Public URL
        const assets = files.map(file => {
          const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(file.name);

          return {
            id: file.id,
            name: file.name,
            // คาดเดาประเภทไฟล์จากนามสกุล
            type: file.name.match(/\.(mp4|mov|webm)$/i) ? 'video' : file.name.match(/\.(mp3|wav)$/i) ? 'audio' : 'image',
            size: ((file.metadata?.size || 0) / (1024 * 1024)).toFixed(2) + ' MB',
            url: urlData.publicUrl,
            date: new Date(file.created_at || Date.now()).toISOString().split('T')[0]
          };
        });

        // เรียงไฟล์ล่าสุดขึ้นก่อน
        setMediaAssets(assets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (err: any) {
      console.error("Error fetching media:", err.message);
    }
  };

  // 2. ☁️ ฟังก์ชันอัปโหลดไฟล์ของจริงเข้า Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // สร้างชื่อไฟล์ใหม่ไม่ให้ซ้ำกัน (ใส่ timestamp ไว้ข้างหน้า)
      const fileExt = file.name.split('.').pop();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // เคลียร์อักษรแปลกๆ
      const fileName = `${Date.now()}_${safeName}`;

      // 🚀 ยิงไฟล์ขึ้น Supabase Bucket 'event-media'
      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false // ไม่เขียนทับไฟล์เดิม
        });

      if (uploadError) throw uploadError;

      alert(`✅ อัปโหลดไฟล์ ${file.name} เข้าสู่คลังส่วนกลางสำเร็จ!`);
      fetchMediaFiles(); // โหลดรายการไฟล์ใหม่มาแสดง

    } catch (err: any) {
      alert(`❌ อัปโหลดล้มเหลว: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; // เคลียร์ค่า input
    }
  };

  // 3. 🗑️ ฟังก์ชันลบไฟล์ของจริงออกจาก Supabase
  const handleDeleteMedia = async (fileName: string) => {
    if (!confirm(`ต้องการลบไฟล์ ${fileName} ออกจากระบบอย่างถาวรหรือไม่? (หากมีสคริปต์ไหนใช้อยู่ ภาพจะหายไปทันที)`)) return;

    try {
      const { error } = await supabase.storage.from('event-media').remove([fileName]);
      if (error) throw error;

      alert('🗑️ ลบไฟล์สำเร็จแล้ว');
      fetchMediaFiles(); // โหลดรายการใหม่
    } catch (err: any) {
      alert(`❌ ลบไฟล์ล้มเหลว: ${err.message}`);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('📋 คัดลอก "ลิงก์ตรง (Direct URL)" สำเร็จ!\nนำไปวางในช่องสื่อของ ฝ่าย 4 ได้เลยครับ');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans p-6">

      {/* 🌟 HEADER */}
      <div className="max-w-7xl mx-auto bg-zinc-950 border border-white/10 rounded-3xl p-6 shadow-2xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-cyan-400 flex items-center gap-2">
            📂 ศูนย์จัดการคลังสื่อมัลติมีเดียส่วนกลาง (Media Asset Pool)
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            เชื่อมต่อตรงกับ Supabase Bucket <span className="text-amber-400 font-mono text-xs">['event-media']</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${isUploading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 hover:scale-105 text-white'}`}
          >
            {isUploading ? '⏳ กำลังอัปโหลดขึ้นเซิร์ฟเวอร์...' : '☁️ อัปโหลดไฟล์สื่อใหม่'}
          </button>
        </div>
      </div>

      {/* 📁 คลังสื่อ (MEDIA GRID) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {mediaAssets.map((asset) => (
          <div key={asset.id || asset.name} className="bg-zinc-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-cyan-500/50 transition-colors group flex flex-col">

            {/* โซน Preview สื่อ */}
            <div className="aspect-video bg-black relative flex items-center justify-center border-b border-white/5 overflow-hidden">
              {asset.type === 'video' && (
                <video src={asset.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
              )}
              {asset.type === 'image' && (
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              )}
              {asset.type === 'audio' && (
                <div className="text-6xl animate-pulse">🎵</div>
              )}

              <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-black uppercase text-zinc-300 border border-white/10">
                {asset.type}
              </span>
            </div>

            {/* โซนรายละเอียดและปุ่มเครื่องมือ */}
            <div className="p-4 flex flex-col flex-1 justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm truncate text-white" title={asset.name}>{asset.name}</h3>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1 font-mono">
                  <span>💾 {asset.size}</span>
                  <span>📅 {asset.date}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => copyToClipboard(asset.url)}
                  className="flex-1 bg-zinc-800 hover:bg-cyan-900 hover:text-cyan-400 text-zinc-300 py-2 rounded-lg text-xs font-bold transition-colors border border-white/5 flex justify-center items-center gap-1.5"
                >
                  📋 คัดลอกลิงก์
                </button>
                <button
                  onClick={() => window.open(asset.url, '_blank')}
                  className="w-10 bg-zinc-800 hover:bg-zinc-700 flex justify-center items-center rounded-lg border border-white/5 transition-colors"
                  title="เปิดดูไฟล์เต็ม"
                >
                  👁️
                </button>
                <button
                  onClick={() => handleDeleteMedia(asset.name)}
                  className="w-10 bg-zinc-800 hover:bg-red-900/80 hover:text-red-400 text-zinc-500 flex justify-center items-center rounded-lg border border-white/5 transition-colors"
                  title="ลบสื่อทิ้ง"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}

        {mediaAssets.length === 0 && !isUploading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
            <span className="text-5xl mb-3">🗄️</span>
            <p className="font-bold text-base text-zinc-400">บักเก็ต event-media ของคุณยังว่างเปล่า</p>
            <p className="text-xs mt-1">อัปโหลดไฟล์วิดีโอหรือรูปภาพเพื่อสร้างลิงก์สำหรับใช้ในงานอีเวนต์</p>
          </div>
        )}
      </div>

    </div>
  );
}