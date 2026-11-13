'use client'

import { useState } from 'react'
import { UploadCloud, Users, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { importPersonnelData } from './actions'

export default function ImportPersonnel() {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setUploadStatus('idle')
            setErrorMessage('')
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setIsUploading(true)
        setUploadStatus('idle')

        const reader = new FileReader()
        
        reader.onload = async (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
                
                if (rawRows.length < 3) throw new Error("รูปแบบไฟล์ไม่ถูกต้อง หรือไม่มีข้อมูลในตาราง")

                const headers = rawRows[0] as string[]
                const jsonData = []

                for (let i = 2; i < rawRows.length; i++) {
                    const row = rawRows[i] as any[]
                    if (!row || row.length === 0 || !row[0]) continue

                    const rowData: any = {}
                    headers.forEach((header, index) => {
                        if (header) rowData[header] = row[index]
                    })
                    jsonData.push(rowData)
                }

                const result = await importPersonnelData(jsonData)

                if (result.success) {
                    setUploadStatus('success')
                } else {
                    throw new Error(result.message)
                }

            } catch (error: any) {
                console.error("Parse Error:", error)
                setUploadStatus('error')
                setErrorMessage(error.message || "เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel")
            } finally {
                setIsUploading(false)
            }
        }

        reader.readAsBinaryString(file)
    }

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto w-full">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">นำเข้าข้อมูลบุคลากร (HR Import)</h1>
                <p className="text-gray-400">อัปโหลดไฟล์ Excel เพื่อเพิ่มหรืออัปเดตฐานข้อมูลบุคลากรของสถานศึกษา</p>
            </header>

            <div className="space-y-6">
                <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white mb-1">ขั้นตอนที่ 1: เตรียมข้อมูลบุคลากร</h2>
                            <p className="text-sm text-gray-400 mb-4">
                                ดาวน์โหลดไฟล์เทมเพลตและกรอกประวัติบุคลากร (รหัสพนักงานห้ามซ้ำ)
                            </p>
                            <a href="/templates/HR_Template.xlsx" download className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-lg text-sm transition-colors border border-gray-700">
                                <Download className="w-4 h-4" /> ดาวน์โหลดเทมเพลตครู (HR_Template.xlsx)
                            </a>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111A2E] border border-[#8B5CF6] rounded-2xl p-8 shadow-[0_0_15px_rgba(139,92,246,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-[#8B5CF6]"></div>

                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1">ขั้นตอนที่ 2: อัปโหลดข้อมูลเข้าระบบ</h2>
                            <p className="text-sm text-gray-400">รองรับเฉพาะไฟล์เทมเพลต .xlsx</p>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-gray-600 hover:border-purple-500 bg-[#0B1325] rounded-xl p-10 text-center transition-colors relative group">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls, .csv" 
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        />
                        <UploadCloud className="w-12 h-12 text-gray-500 group-hover:text-purple-500 mx-auto mb-4 transition-colors" />
                        
                        {file ? (
                            <div className="text-purple-400 font-medium">เลือกไฟล์แล้ว: {file.name}</div>
                        ) : (
                            <div>
                                <p className="text-gray-300 font-medium mb-1">คลิกที่นี่เพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
                            </div>
                        )}
                    </div>

                    {uploadStatus === 'success' && (
                        <div className="mt-6 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4 flex gap-3 text-sm text-[#10B981]">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <p>นำเข้าข้อมูลสำเร็จ! ข้อมูลบุคลากรถูกอัปเดตลงฐานข้อมูลเรียบร้อยแล้ว</p>
                        </div>
                    )}
                    
                    {uploadStatus === 'error' && (
                        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 text-sm text-red-400">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>เกิดข้อผิดพลาด: {errorMessage}</p>
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <button 
                            onClick={handleUpload}
                            disabled={!file || isUploading}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 border-2 border-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(139,92,246,0.39)] transition-all"
                        >
                            {isUploading ? 'กำลังประมวลผลข้อมูล...' : 'ยืนยันการนำเข้าข้อมูลบุคลากร'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}