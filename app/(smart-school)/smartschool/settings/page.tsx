'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Save, Building, CheckCircle2, AlertCircle } from 'lucide-react'
import { getSchoolSettings, saveSchoolSettings } from './actions'

export default function SchoolSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
    const [formData, setFormData] = useState({
        school_name: '',
        district: '',
        province: '',
        educational_service_area: '',
        current_academic_year: '2569',
        current_term: '1'
    });

    useEffect(() => {
        async function loadData() {
            const data = await getSchoolSettings();
            if (data) {
                setFormData({
                    school_name: data.school_name || '',
                    district: data.district || '',
                    province: data.province || '',
                    educational_service_area: data.educational_service_area || '',
                    current_academic_year: data.current_academic_year || '2569',
                    current_term: data.current_term || '1'
                });
            }
            setIsLoading(false);
        }
        loadData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus({ type: null, message: '' });

        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => data.append(key, value));

        const result = await saveSchoolSettings(data);
        setStatus({ type: result.success ? 'success' : 'error', message: result.message });
        setIsSaving(false);
    }

    if (isLoading) {
        return <div className="p-8 text-white">กำลังโหลดข้อมูล...</div>;
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full font-sans text-white">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#0D9488]/30 pb-6">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">ตั้งค่าสถานศึกษา</h1>
                        <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">NiiVaa SmartSchool Configuration</p>
                    </div>
                </div>
                <Link href="/smartschool" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                </Link>
            </header>

            <form onSubmit={handleSubmit} className="bg-[#111A2E] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-[#0D9488]"></div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400">
                        <Building className="w-6 h-6" />
                    </div>
                    <h2 className="text-lg font-bold text-white">ข้อมูลพื้นฐานโรงเรียน</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">ชื่อสถานศึกษา (ไม่ต้องใส่คำว่าโรงเรียน) <span className="text-red-500">*</span></label>
                        <input type="text" name="school_name" required value={formData.school_name} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors" placeholder="เช่น สุรวิทยาคาร" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">อำเภอ</label>
                        <input type="text" name="district" value={formData.district} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" placeholder="เช่น เมืองสุรินทร์" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">จังหวัด</label>
                        <input type="text" name="province" value={formData.province} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" placeholder="เช่น สุรินทร์" />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">สำนักงานเขตพื้นที่การศึกษาที่สังกัด</label>
                        <input type="text" name="educational_service_area" value={formData.educational_service_area} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" placeholder="เช่น สพม.สุรินทร์" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">ปีการศึกษาปัจจุบัน</label>
                        <input type="number" name="current_academic_year" required value={formData.current_academic_year} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">ภาคเรียนปัจจุบัน</label>
                        <select name="current_term" value={formData.current_term} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500">
                            <option value="1">ภาคเรียนที่ 1</option>
                            <option value="2">ภาคเรียนที่ 2</option>
                        </select>
                    </div>
                </div>

                {status.type === 'success' && (
                    <div className="mb-6 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4 flex gap-3 text-sm text-[#10B981]">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <p>{status.message}</p>
                    </div>
                )}
                {status.type === 'error' && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 text-sm text-red-400">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{status.message}</p>
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-800">
                    <button type="submit" disabled={isSaving || !formData.school_name} className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 border-2 border-transparent hover:border-white disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all">
                        <Save className="w-5 h-5" />
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสถานศึกษา'}
                    </button>
                </div>
            </form>
        </div>
    )
}