'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Search, Edit, Trash2, X, Users, UploadCloud, Filter } from 'lucide-react'
import { getEmployees, saveEmployee, deleteEmployee } from './actions'

export default function HRManagementPage() {
    const [employees, setEmployees] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    
    // State สำหรับตัวกรอง
    const [filters, setFilters] = useState({ gender: '', academic_standing: '', education_level: '' })
    const [isLoading, setIsLoading] = useState(true)
    
    // State สำหรับ Modal ฟอร์ม
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [searchQuery, filters])

    const loadData = async () => {
        setIsLoading(true)
        const data = await getEmployees(searchQuery, filters)
        setEmployees(data)
        setIsLoading(false)
    }

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value })
    }

    const handleOpenModal = (employee: any = null) => {
        if (employee) {
            setFormData(employee)
        } else {
            setFormData({ emp_code: '', prefix: 'นาย', first_name: '', last_name: '', gender: 'ชาย' }) 
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setFormData({})
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const result = await saveEmployee(formData)
        if (result.success) {
            alert(result.message)
            handleCloseModal()
            loadData()
        } else {
            alert(result.message)
        }
        setIsSaving(false)
    }

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`ยืนยันการลบข้อมูลของ ${name}?`)) {
            const result = await deleteEmployee(id)
            if (result.success) loadData()
            else alert(result.message)
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-[90rem] mx-auto w-full font-sans text-white h-full flex flex-col">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">จัดการข้อมูลบุคลากร</h1>
                        <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">HR Management System</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/smartschool/hr/import" className="flex items-center gap-2 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 px-4 py-2.5 rounded-lg border border-teal-500/30 text-sm transition-colors">
                        <UploadCloud className="w-4 h-4" /> นำเข้าจาก Excel
                    </Link>
                    <Link href="/smartschool" className="flex items-center gap-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                    </Link>
                </div>
            </header>

            {/* Toolbar: ค้นหา & กรอง */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 shrink-0 bg-[#111A2E] p-4 rounded-2xl border border-gray-800">
                <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1">
                    <div className="relative w-full md:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" placeholder="ค้นหาชื่อ, รหัส..." 
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0B1325] border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-teal-500 focus:outline-none"
                        />
                    </div>
                    <select name="gender" value={filters.gender} onChange={handleFilterChange} className="bg-[#0B1325] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:border-teal-500 focus:outline-none">
                        <option value="">เพศทั้งหมด</option>
                        <option value="ชาย">ชาย</option>
                        <option value="หญิง">หญิง</option>
                    </select>
                    <select name="academic_standing" value={filters.academic_standing} onChange={handleFilterChange} className="bg-[#0B1325] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:border-teal-500 focus:outline-none">
                        <option value="">วิทยฐานะทั้งหมด</option>
                        <option value="ครูผู้ช่วย">ครูผู้ช่วย</option>
                        <option value="ชำนาญการ">ชำนาญการ</option>
                        <option value="ชำนาญการพิเศษ">ชำนาญการพิเศษ</option>
                        <option value="เชี่ยวชาญ">เชี่ยวชาญ</option>
                    </select>
                    <select name="education_level" value={filters.education_level} onChange={handleFilterChange} className="bg-[#0B1325] border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:border-teal-500 focus:outline-none">
                        <option value="">วุฒิการศึกษาทั้งหมด</option>
                        <option value="ต่ำกว่าปริญญาตรี">ต่ำกว่าปริญญาตรี</option>
                        <option value="ปริญญาตรี">ปริญญาตรี</option>
                        <option value="ปริญญาโท">ปริญญาโท</option>
                        <option value="ปริญญาเอก">ปริญญาเอก</option>
                    </select>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:brightness-110 text-white px-5 py-2 rounded-xl text-sm font-medium shadow-lg w-full xl:w-auto justify-center shrink-0">
                    <Plus className="w-4 h-4" /> เพิ่มบุคลากร
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-[#111A2E] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex-1 min-h-0 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                        <thead className="bg-[#1A233A] text-gray-300 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-semibold">รหัส</th>
                                <th className="px-6 py-4 font-semibold">ชื่อ - นามสกุล</th>
                                <th className="px-6 py-4 font-semibold">เพศ</th>
                                <th className="px-6 py-4 font-semibold">ตำแหน่ง / วิทยฐานะ</th>
                                <th className="px-6 py-4 font-semibold">ระดับการศึกษา</th>
                                <th className="px-6 py-4 font-semibold text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-8">กำลังโหลดข้อมูล...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">ไม่พบข้อมูลบุคลากร</td></tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-teal-400">{emp.emp_code}</td>
                                        <td className="px-6 py-4 text-white">{emp.prefix || ''}{emp.first_name} {emp.last_name}</td>
                                        <td className="px-6 py-4">{emp.gender || '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white">{emp.position_title || '-'}</span>
                                                <span className="text-xs text-gray-500">{emp.academic_standing || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300">{emp.education_level || '-'}</span>
                                                {emp.education_degree && <span className="text-xs text-teal-500">{emp.education_degree} ({emp.education_major || '-'})</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => handleOpenModal(emp)} className="text-gray-400 hover:text-teal-400 transition-colors"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(emp.id, emp.first_name)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form (Comprehensive) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111A2E] border border-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#1A233A]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-teal-400" /> {formData.id ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <form id="employeeForm" onSubmit={handleSubmit} className="space-y-8">
                                {/* Section 1: ข้อมูลส่วนตัว */}
                                <div>
                                    <h3 className="text-sm font-semibold text-teal-400 mb-4 border-b border-gray-800 pb-2">1. ข้อมูลส่วนตัว (Personal Info)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">รหัสพนักงาน *</label>
                                            <input type="text" name="emp_code" required value={formData.emp_code || ''} onChange={handleChange} disabled={!!formData.id} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">เลขบัตรประชาชน</label>
                                            <input type="text" name="national_id" value={formData.national_id || ''} onChange={handleChange} maxLength={13} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">คำนำหน้า (พิมพ์หรือเลือก)</label>
                                            <input list="prefix-options" name="prefix" value={formData.prefix || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="เช่น นาย, ว่าที่ ร.ต." />
                                            <datalist id="prefix-options">
                                                <option value="นาย" />
                                                <option value="นาง" />
                                                <option value="นางสาว" />
                                                <option value="ว่าที่ ร.ต." />
                                                <option value="ดร." />
                                                <option value="พล.อ." />
                                            </datalist>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">ชื่อจริง *</label>
                                            <input type="text" name="first_name" required value={formData.first_name || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">นามสกุล *</label>
                                            <input type="text" name="last_name" required value={formData.last_name || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">เพศ</label>
                                            <select name="gender" value={formData.gender || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                                                <option value="ชาย">ชาย</option>
                                                <option value="หญิง">หญิง</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">วัน/เดือน/ปีเกิด</label>
                                            <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: ข้อมูลการศึกษา */}
                                <div>
                                    <h3 className="text-sm font-semibold text-teal-400 mb-4 border-b border-gray-800 pb-2">2. ข้อมูลการศึกษา (Education Info)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">ระดับการศึกษา</label>
                                            <select name="education_level" value={formData.education_level || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                                                <option value="">- เลือกระดับ -</option>
                                                <option value="ต่ำกว่าปริญญาตรี">ต่ำกว่าปริญญาตรี</option>
                                                <option value="ปริญญาตรี">ปริญญาตรี</option>
                                                <option value="ปริญญาโท">ปริญญาโท</option>
                                                <option value="ปริญญาเอก">ปริญญาเอก</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">วุฒิการศึกษาย่อ (เช่น ค.บ.)</label>
                                            <input type="text" name="education_degree" value={formData.education_degree || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">วิชาเอก (เช่น คณิตศาสตร์)</label>
                                            <input type="text" name="education_major" value={formData.education_major || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: ข้อมูลการทำงาน */}
                                <div>
                                    <h3 className="text-sm font-semibold text-teal-400 mb-4 border-b border-gray-800 pb-2">3. ข้อมูลการทำงาน (Employment Info)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">ตำแหน่ง</label>
                                            <input type="text" name="position_title" value={formData.position_title || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">วิทยฐานะ</label>
                                            <select name="academic_standing" value={formData.academic_standing || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                                                <option value="">- เลือก -</option>
                                                <option value="ครูผู้ช่วย">ครูผู้ช่วย</option>
                                                <option value="ชำนาญการ">ชำนาญการ</option>
                                                <option value="ชำนาญการพิเศษ">ชำนาญการพิเศษ</option>
                                                <option value="เชี่ยวชาญ">เชี่ยวชาญ</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">วันที่เริ่มปฏิบัติงาน (บรรจุ)</label>
                                            <input type="date" name="start_date" value={formData.start_date || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">เลขใบประกอบวิชาชีพ</label>
                                            <input type="text" name="license_no" value={formData.license_no || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: ข้อมูลการติดต่อ */}
                                <div>
                                    <h3 className="text-sm font-semibold text-teal-400 mb-4 border-b border-gray-800 pb-2">4. ข้อมูลการติดต่อ (Contact Info)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">เบอร์โทรศัพท์</label>
                                            <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">อีเมล</label>
                                            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-400 mb-1">ที่อยู่</label>
                                            <textarea name="address" value={formData.address || ''} onChange={handleChange} rows={2} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none"></textarea>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-gray-800 bg-[#1A233A] flex justify-end gap-3">
                            <button onClick={handleCloseModal} type="button" className="px-6 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">ยกเลิก</button>
                            <button form="employeeForm" type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}