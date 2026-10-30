// app/(public)/share/event/[eventId]/page.tsx
'use client';

import React, { useState } from 'react';
import { Lock, ShieldCheck, Users, Send, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client'; // นำเข้า Supabase Client
import { useParams } from 'next/navigation'; // เพิ่มบรรทัดนี้
// ลบ { params } ออกจากวงเล็บ
export default function PublicAgencyRegistration() {
    const params = useParams();
    const currentEventId = params?.eventId as string; // ดึงค่าจาก Hook

    // ... State ต่างๆ คงเดิม ...
    // States สำหรับจัดการหน้าจอและข้อมูล
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // สถานะกำลังบันทึกข้อมูล

    // States สำหรับฟอร์มกรอกข้อมูล
    const [formData, setFormData] = useState({
        agencyName: '',
        placerName: '',
        placerPosition: '',
        goldBearerName: '',
        goldBearerPosition: '',
        silverBearerName: '',
        silverBearerPosition: '',
    });

    // ฟังก์ชันตรวจสอบรหัสผ่าน
    const handleVerifyCode = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: ในอนาคตสามารถต่อ API ตรวจสอบ access_code กับตาราง event_details ได้
        if (accessCode === 'SURIN-2026') {
            setIsAuthorized(true);
            setErrorMsg('');
        } else {
            setErrorMsg('รหัสการเข้าถึงไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
        }
    };

    // ฟังก์ชันบันทึกข้อมูลลง Supabase
    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMsg('');

        const supabase = createClient();

        try {
            const { error } = await supabase
                .from('event_ceremony_bearers')
                .insert([
                    {
                        event_id: currentEventId, // <--- ใช้ตัวแปรใหม่ตรงนี้
                        sequence_order: 999, // ตั้งให้ไปต่อท้ายคิว เพื่อให้ Admin จัดลำดับเอง
                        agency_name: formData.agencyName,
                        placer_name: formData.placerName,
                        placer_position: formData.placerPosition,
                        gold_bearer_name: formData.goldBearerName,
                        gold_bearer_position: formData.goldBearerPosition,
                        silver_bearer_name: formData.silverBearerName,
                        silver_bearer_position: formData.silverBearerPosition,
                        status: 'pending', // สถานะรอยืนยันหน้างาน
                        is_self_registered: true // ยืนยันว่าหน่วยงานย่อยกรอกมาเอง
                    }
                ]);

            if (error) throw error;

            // บันทึกสำเร็จ เปลี่ยนหน้าจอเป็นหน้า Success
            setIsSubmitted(true);

        } catch (error: any) {
            console.error('Error inserting data:', error);
            setErrorMsg('ไม่สามารถบันทึกข้อมูลได้: ' + (error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // ฟังก์ชันจัดการเมื่อพิมพ์ข้อมูลลงฟอร์ม
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ==========================================
    // หน้าจอที่ 3: บันทึกข้อมูลสำเร็จ
    // ==========================================
    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 selection:bg-cyan-500/30">
                <div className="bg-gray-900 border border-cyan-500/40 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <CheckCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold text-gray-100 mb-2">ส่งข้อมูลสำเร็จ</h2>
                    <p className="text-gray-400 mb-6">
                        ระบบได้รับข้อมูลผู้แทนจาก <span className="text-cyan-300">{formData.agencyName}</span> เรียบร้อยแล้ว กรุณาแจ้งผู้แทนให้มารายงานตัว ณ จุดลงทะเบียนในวันงาน
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================
    // หน้าจอที่ 1: ตรวจสอบ Access Code
    // ==========================================
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 selection:bg-fuchsia-500/30">
                <div className="bg-gray-900 border border-fuchsia-500/30 p-8 rounded-2xl max-w-md w-full shadow-[0_0_30px_rgba(217,70,239,0.1)]">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-fuchsia-500/10 rounded-full border border-fuchsia-500/30">
                            <Lock className="w-8 h-8 text-fuchsia-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center text-gray-100 mb-2">เข้าสู่ระบบลงทะเบียน</h1>
                    <p className="text-center text-gray-400 text-sm mb-6">กรุณากรอกรหัสการเข้าถึง (Access Code) เพื่อส่งรายชื่อผู้เชิญพานพุ่ม</p>

                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                                placeholder="ระบุรหัส 6-8 หลัก"
                                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-center text-lg text-fuchsia-300 font-mono tracking-widest focus:outline-none focus:border-fuchsia-400 transition-colors uppercase"
                                required
                            />
                        </div>
                        {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}
                        <button
                            type="submit"
                            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)] flex items-center justify-center"
                        >
                            <ShieldCheck className="w-5 h-5 mr-2" /> ยืนยันรหัสผ่าน
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ==========================================
    // หน้าจอที่ 2: ฟอร์มกรอกข้อมูลรายชื่อ (Authorized)
    // ==========================================
    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <header className="mb-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                        แบบฟอร์มแจ้งรายชื่อผู้แทนหน่วยงาน
                    </h1>
                    <p className="text-gray-400">สำหรับพิธีถวายเครื่องราชสักการะและวางพานพุ่ม</p>
                </header>

                <form onSubmit={handleSubmitForm} className="space-y-6">

                    {/* ข้อมูลหน่วยงาน */}
                    <div className="bg-gray-900 border border-cyan-500/20 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-cyan-50 mb-4 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-cyan-400" /> ข้อมูลหน่วยงาน/องค์กร
                        </h2>
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">ชื่อหน่วยงาน (เช่น โรงเรียน... / กลุ่มสาระการเรียนรู้...)</label>
                            <input
                                type="text" name="agencyName" required
                                value={formData.agencyName} onChange={handleInputChange}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                                placeholder="ระบุชื่อหน่วยงานของคุณ"
                            />
                        </div>
                    </div>

                    {/* ผู้วางเครื่องราชสักการะ */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                        <h2 className="text-lg font-semibold text-gray-100 mb-4 border-b border-gray-800 pb-2">1. ผู้วางพานพุ่ม (ตัวแทนหลัก)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">ยศ/คำนำหน้า/ชื่อ-สกุล</label>
                                <input type="text" name="placerName" required value={formData.placerName} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">ตำแหน่ง</label>
                                <input type="text" name="placerPosition" required value={formData.placerPosition} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-cyan-500" />
                            </div>
                        </div>
                    </div>

                    {/* ผู้เชิญพุ่มทอง */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-yellow-500/30 transition-colors">
                        <h2 className="text-lg font-semibold text-yellow-500 mb-4 border-b border-gray-800 pb-2">2. ผู้เชิญพุ่มทอง</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">ชื่อ-สกุล</label>
                                <input type="text" name="goldBearerName" required value={formData.goldBearerName} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-yellow-500" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">ตำแหน่ง</label>
                                <input type="text" name="goldBearerPosition" required value={formData.goldBearerPosition} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-yellow-500" />
                            </div>
                        </div>
                    </div>

                    {/* ผู้เชิญพุ่มเงิน */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-400/50 transition-colors">
                        <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-800 pb-2">3. ผู้เชิญพุ่มเงิน</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">ชื่อ-สกุล</label>
                                <input type="text" name="silverBearerName" required value={formData.silverBearerName} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-gray-400" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">ตำแหน่ง</label>
                                <input type="text" name="silverBearerPosition" required value={formData.silverBearerPosition} onChange={handleInputChange} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* แสดง Error Message ถ้าบันทึกไม่สำเร็จ */}
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center mt-4">
                            {errorMsg}
                        </div>
                    )}

                    {/* ปุ่ม Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center text-lg mt-8
              ${isSubmitting
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                            }`}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> กำลังบันทึกข้อมูล...</>
                        ) : (
                            <><Send className="w-5 h-5 mr-2" /> บันทึกและส่งข้อมูลรายชื่อ</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}