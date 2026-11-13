'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { ArrowLeft, UploadCloud, FileDown, CheckCircle2, AlertCircle } from 'lucide-react'
import { importDepartmentData } from '../actions'

export default function DepartmentImportPage() {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })

    // ฟังก์ชันสร้างและดาวน์โหลดเทมเพลต Excel เปล่า
    const handleDownloadTemplate = () => {
        const templateData = [
            {
                department_id: 'D01',
                department_name: 'กลุ่มบริหารวิชาการ',
                subdepartment_id: 'S01-01',
                subdepartment_name: 'กลุ่มบริหารวิชาการ',
                subdepartment_role_id: 'PS01-01-1',
                subdepartment_role_name: 'รองผู้อำนวยการกลุ่มบริหารวิชาการ'
            },
            {
                department_id: 'D01',
                department_name: 'กลุ่มบริหารวิชาการ',
                subdepartment_id: 'S01-02',
                subdepartment_name: 'สำนักงานบริหารวิชาการ',
                subdepartment_role_id: 'PS01-02-1',
                subdepartment_role_name: 'หัวหน้ากลุ่มบริหารวิชาการ'
            }
        ]
        
        const ws = XLSX.utils.json_to_sheet(templateData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Departments")
        XLSX.writeFile(wb, "Department_Template.xlsx")
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0])
            setStatus({ type: null, message: '' })
        }
    }

    const handleUpload = async () => {
        if (!file) return setStatus({ type: 'error', message: 'กรุณาเลือกไฟล์ Excel' })

        setIsUploading(true)
        setStatus({ type: null, message: '' })

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet)

                const result = await importDepartmentData(jsonData)
                
                if (result.success) {
                    setStatus({ type: 'success', message: result.message })
                    setFile(null) // เคลียร์ไฟล์หลังจากอัปโหลดสำเร็จ
                } else {
                    setStatus({ type: 'error', message: result.message })
                }
            } catch (error: any) {
                setStatus({ type: 'error', message: 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + error.message })
            } finally {
                setIsUploading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full font-sans text-white">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#0D9488]/30 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">ตั้งค่าโครงสร้างหน่วยงาน</h1>
                    <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">Department Structure Import</p>
                </div>
                <Link href="/smartschool/settings" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <ArrowLeft className="w-4 h-4" /> กลับหน้าตั้งค่า
                </Link>
            </header>

            <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-[#0D9488]"></div>

                <div className="mb-8 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <h2 className="text-lg font-bold text-teal-400 mb-2">คำแนะนำการนำเข้าข้อมูล</h2>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                        <li>ดาวน์โหลดเทมเพลต Excel ด้านล่างนี้</li>
                        <li>กรอกข้อมูลโครงสร้างกลุ่มบริหาร งานย่อย และบทบาทหน้าที่ ตามรูปแบบในไฟล์</li>
                        <li>บันทึกไฟล์และอัปโหลดกลับเข้าระบบ</li>
                    </ul>
                    <button onClick={handleDownloadTemplate} className="mt-4 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-teal-400 px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700">
                        <FileDown className="w-4 h-4" /> ดาวน์โหลดเทมเพลต
                    </button>
                </div>

                <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-teal-500/50 transition-colors">
                    <input type="file" id="file-upload" accept=".xlsx, .xls" onChange={handleFileChange} className="hidden" />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        <UploadCloud className="w-10 h-10 text-gray-400" />
                        <span className="text-gray-300 font-medium">คลิกเพื่อเลือกไฟล์ Excel</span>
                        {file && <span className="text-teal-400 text-sm mt-2 font-medium bg-teal-500/10 px-3 py-1 rounded-full">{file.name}</span>}
                    </label>
                </div>

                {status.type === 'success' && (
                    <div className="mt-6 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4 flex gap-3 text-sm text-[#10B981]">
                        <CheckCircle2 className="w-5 h-5 shrink-0" /> <p>{status.message}</p>
                    </div>
                )}
                {status.type === 'error' && (
                    <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 text-sm text-red-400">
                        <AlertCircle className="w-5 h-5 shrink-0" /> <p>{status.message}</p>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button onClick={handleUpload} disabled={!file || isUploading} className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all">
                        <UploadCloud className="w-5 h-5" />
                        {isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์'}
                    </button>
                </div>
            </div>
        </div>
    )
}