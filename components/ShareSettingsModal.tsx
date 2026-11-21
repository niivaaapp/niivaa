'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Save,
  Share2,
  Hash,
  User,
  FileText,
} from 'lucide-react';
// ⚠️ ปรับ Path ให้ตรงกับไฟล์เชื่อมต่อ Supabase ในโปรเจกต์ของคุณ (เช่น '@/utils/supabase/client')
import { supabase } from '@/lib/supabase';

export interface PlaylistShareTarget {
  id: string;
  name: string;
  is_public?: boolean;
  share_code?: string | null;
  description?: string | null;
  creator_name?: string | null;
}

interface ShareSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistShareTarget | null;
  onSaved?: (updated: PlaylistShareTarget) => void;
}

export default function ShareSettingsModal({
  isOpen,
  onClose,
  playlist,
  onSaved,
}: ShareSettingsModalProps) {
  const [isPublic, setIsPublic] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [description, setDescription] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // โหลดค่าเดิมของอัลบั้มเข้าฟอร์มทุกครั้งที่เปิด Modal
  useEffect(() => {
    if (playlist && isOpen) {
      setIsPublic(Boolean(playlist.is_public));
      setShareCode(playlist.share_code || '');
      setCreatorName(playlist.creator_name || '');
      setDescription(playlist.description || '');
      setErrorMsg(null);
      setSuccessMsg(null);
      setCopied(false);
    }
  }, [playlist, isOpen]);

  if (!isOpen || !playlist) return null;

  // สร้างลิงก์แชร์พร้อม ?openExternalBrowser=1 (กัน LINE บล็อก Google Login)
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://niivaa.com';
  const shareUrl = `${origin}/share/${playlist.id}?openExternalBrowser=1`;

  // สุ่มรหัสชุดสื่ออัตโนมัติ เช่น NSP-4829
  const handleGenerateCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setShareCode(`NSP-${randomNum}`);
    setErrorMsg(null);
  };

  // บันทึกการตั้งค่าลง Supabase
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = shareCode.trim().toUpperCase() || null;

    try {
      const { error } = await supabase
        .from('playlists')
        .update({
          is_public: isPublic,
          share_code: cleanCode,
          creator_name: creatorName.trim() || null,
          description: description.trim() || null,
        })
        .eq('id', playlist.id);

      if (error) {
        // ดักจับกรณีรหัส share_code ซ้ำกับอัลบั้มอื่น
        if (error.code === '23505') {
          setErrorMsg('รหัสชุดสื่อนี้ถูกใช้งานแล้ว กรุณาเปลี่ยนรหัสใหม่ครับ');
        } else {
          setErrorMsg(`บันทึกไม่สำเร็จ: ${error.message}`);
        }
        return;
      }

      setSuccessMsg('บันทึกการตั้งค่าการแชร์เรียบร้อยแล้ว');
      onSaved?.({
        ...playlist,
        is_public: isPublic,
        share_code: cleanCode,
        creator_name: creatorName.trim() || null,
        description: description.trim() || null,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSaving(false);
    }
  };

  // คัดลอกลิงก์แชร์
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(`คัดลอกลิงก์นี้:\n${shareUrl}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0a1128] border border-cyan-500/40 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#060b1e] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Share2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                ตั้งค่าการแชร์สาธารณะ
              </h3>
              <p className="text-[11px] text-cyan-300/80 truncate">
                {playlist.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* 1. สวิตช์เปิด/ปิด is_public */}
          <div
            onClick={() => setIsPublic(!isPublic)}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
              isPublic
                ? 'bg-emerald-950/30 border-emerald-500/50'
                : 'bg-slate-900/60 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isPublic
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isPublic ? <Globe size={20} /> : <Lock size={20} />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {isPublic ? 'เปิดแชร์สาธารณะแล้ว' : 'ปิดการแชร์ (ส่วนตัว)'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isPublic
                    ? 'ผู้ที่ได้รับลิงก์สามารถเปิดรับชมชุดสื่อนี้ได้โดยไม่ต้องล็อกอิน'
                    : 'มีเพียงคุณเท่านั้นที่มองเห็นอัลบั้มนี้'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors shrink-0 ${
                isPublic ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* 2. รหัสชุดสื่อ (share_code) */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Hash size={14} className="text-cyan-400" />
                รหัสชุดสื่อ (Share Code)
              </span>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
              >
                <Sparkles size={12} />
                สุ่มรหัสอัตโนมัติ
              </button>
            </label>
            <input
              type="text"
              value={shareCode}
              onChange={(e) => setShareCode(e.target.value.toUpperCase())}
              placeholder="เช่น NSP001 หรือ NSP-KRU01"
              maxLength={20}
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 focus:border-cyan-400 rounded-xl text-sm font-bold text-cyan-300 placeholder:text-slate-600 outline-none uppercase tracking-wider"
            />
          </div>

          {/* 3. ชื่อผู้จัดทำ (creator_name) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1.5">
              <User size={14} className="text-cyan-400" />
              ชื่อผู้จัดทำ / วิทยากร (แสดงบนหน้าแชร์)
            </label>
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="เช่น ทีมงาน NiiVaa หรือ ชื่อของคุณ"
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 focus:border-cyan-400 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          {/* 4. คำอธิบายแนะนำสื่อ (description) */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1.5">
              <FileText size={14} className="text-cyan-400" />
              คำอธิบายแนะนำชุดสื่อสั้นๆ
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="พิมพ์คำแนะนำสั้นๆ สำหรับผู้รับลิงก์..."
              className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 focus:border-cyan-400 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none resize-none"
            />
          </div>

          {/* 5. กล่องคัดลอกลิงก์แชร์ (แสดงเมื่อเปิด is_public) */}
          {isPublic && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-cyan-300">
                  ลิงก์สำหรับส่งต่อ (รองรับเปิดจาก LINE อัตโนมัติ)
                </span>
                <a
                  href={`/share/${playlist.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                >
                  <span>เปิดดูตัวอย่าง</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-xl text-xs text-slate-300 outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    copied
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#2d728f] hover:bg-[#3886a6] text-[#f4f1de]'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ข้อความแจ้งเตือน Error / Success */}
          {errorMsg && (
            <p className="text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/30 px-3 py-2 rounded-xl">
              ⚠️ {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 rounded-xl">
              ✅ {successMsg}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#060b1e] border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
          >
            ปิดหน้าต่าง
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#2d728f] hover:bg-[#3886a6] disabled:opacity-50 text-[#f4f1de] text-xs font-black transition-all flex items-center gap-1.5 shadow-lg"
          >
            <Save size={15} />
            <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}