'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, Search, Edit, Trash2, X, Building, UploadCloud } from 'lucide-react'
import { getDepartments, saveDepartment, deleteDepartment } from './actions'

export default function DepartmentManagementPage() {
    const [departments, setDepartments] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    
    // State สำหรับ Modal
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState<any>({})
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [searchQuery])

    const loadData = async () => {
        setIsLoading(true)
        const data = await getDepartments(searchQuery)
        setDepartments(data)
        setIsLoading(false)
    }

    const handleOpenModal = (dept: any = null) => {
        if (dept) {
            setFormData(dept) // แก้ไข
        } else {
            setFormData({ department_id: '', department_name: '', subdepartment_id: '', subdepartment_name: '', subdepartment_role_id: '', subdepartment_role_name: '' }) // เพิ่มใหม่
        }
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setFormData({})
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const result = await saveDepartment(formData)
        if (result.success) {
            handleCloseModal()
            loadData()
        } else {
            alert(result.message)
        }
        setIsSaving(false)
    }

    const handleDelete = async (id: string, roleName: string) => {
        if (window.confirm(`ยืนยันการลบหน้าที่: "${roleName}" ออกจากระบบ?`)) {
            const result = await deleteDepartment(id)
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
                        <h1 className="text-2xl font-bold text-white tracking-wide">จัดการโครงสร้างหน่วยงาน</h1>
                        <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">Department & Roles Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/smartschool/settings/departments/import" className="flex items-center gap-2 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors text-sm px-4 py-2.5 rounded-lg border border-teal-500/30">
                        <UploadCloud className="w-4 h-4" /> นำเข้าจาก Excel
                    </Link>
                    <Link href="/smartschool/settings" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm bg-gray-800/50 hover:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700">
                        <ArrowLeft className="w-4 h-4" /> กลับหน้าตั้งค่า
                    </Link>
                </div>
            </header>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shrink-0">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input 
                        type="text" placeholder="ค้นหากลุ่มบริหาร, งานย่อย, ตำแหน่ง..." 
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#111A2E] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:brightness-110 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg transition-all w-full md:w-auto justify-center"
                >
                    <Plus className="w-5 h-5" /> เพิ่มงาน/หน้าที่ใหม่
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-[#111A2E] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex-1 min-h-0 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                        <thead className="bg-[#1A233A] text-gray-300 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-semibold">กลุ่มบริหาร (Department)</th>
                                <th className="px-6 py-4 font-semibold">งานย่อย (Sub-department)</th>
                                <th className="px-6 py-4 font-semibold">รหัสหน้าที่</th>
                                <th className="px-6 py-4 font-semibold text-teal-400">บทบาทหน้าที่ (Role)</th>
                                <th className="px-6 py-4 font-semibold text-center w-32">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-8">กำลังโหลดข้อมูล...</td></tr>
                            ) : departments.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500">ไม่พบข้อมูลโครงสร้างหน่วยงาน</td></tr>
                            ) : (
                                departments.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4"><span className="text-gray-500 mr-2">{dept.department_id}</span>{dept.department_name}</td>
                                        <td className="px-6 py-4"><span className="text-gray-500 mr-2">{dept.subdepartment_id}</span>{dept.subdepartment_name}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-400">{dept.subdepartment_role_id}</td>
                                        <td className="px-6 py-4 font-medium text-white">{dept.subdepartment_role_name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <button onClick={() => handleOpenModal(dept)} className="text-gray-400 hover:text-teal-400 transition-colors"><Edit className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(dept.id, dept.subdepartment_role_name)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111A2E] border border-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#1A233A]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Building className="w-5 h-5 text-teal-400" />
                                {formData.id ? 'แก้ไขข้อมูลหน่วยงาน/หน้าที่' : 'เพิ่มหน่วยงาน/หน้าที่ใหม่'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <form id="deptForm" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-gray-800/20 border border-gray-800 rounded-xl">
                                    <div><label className="block text-xs text-gray-400 mb-1">รหัสกลุ่มบริหาร (เช่น D01) *</label><input type="text" name="department_id" required value={formData.department_id || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                                    <div><label className="block text-xs text-gray-400 mb-1">ชื่อกลุ่มบริหาร (เช่น กลุ่มบริหารวิชาการ) *</label><input type="text" name="department_name" required value={formData.department_name || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-gray-800/20 border border-gray-800 rounded-xl">
                                    <div><label className="block text-xs text-gray-400 mb-1">รหัสงานย่อย (เช่น S01-01) *</label><input type="text" name="subdepartment_id" required value={formData.subdepartment_id || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                                    <div><label className="block text-xs text-gray-400 mb-1">ชื่องานย่อย (เช่น สำนักงานวิชาการ) *</label><input type="text" name="subdepartment_name" required value={formData.subdepartment_name || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-teal-900/10 border border-teal-500/20 rounded-xl">
                                    <div><label className="block text-xs text-teal-400 mb-1">รหัสบทบาทหน้าที่ (เช่น PS01-01-1) *ต้องไม่ซ้ำ</label><input type="text" name="subdepartment_role_id" required value={formData.subdepartment_role_id || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                                    <div><label className="block text-xs text-teal-400 mb-1">ชื่อบทบาทหน้าที่ (เช่น หัวหน้ากลุ่มวิชาการ) *</label><input type="text" name="subdepartment_role_name" required value={formData.subdepartment_role_name || ''} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" /></div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-gray-800 bg-[#1A233A] flex justify-end gap-3">
                            <button onClick={handleCloseModal} type="button" className="px-6 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">ยกเลิก</button>
                            <button form="deptForm" type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-500 text-white px-8 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                                {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}