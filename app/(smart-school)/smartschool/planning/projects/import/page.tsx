'use client'

import { useState } from 'react'
import { ArrowLeft, UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { importPlanData } from './actions' 

export default function ImportProjects() {
    const [file, setFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setUploadStatus('idle')
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
                const worksheet = workbook.Sheets[workbook.SheetNames[0]]
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
                
                if (rawRows.length < 3) throw new Error("รูปแบบไฟล์ไม่ถูกต้อง")

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

                const result = await importPlanData(jsonData)
                if (result.success) setUploadStatus('success')
                else throw new Error(result.message)

            } catch (error: any) {
                setUploadStatus('error')
                setErrorMessage(error.message || "เกิดข้อผิดพลาดในการประมวลผล")
            } finally {
                setIsUploading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    return (
        <div className="min-h-screen bg-[#0B1325] text-white p-6 font-sans">
            <header className="max-w-4xl mx-auto mb-8 border-b border-[#0D9488]/30 pb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">NiiVaa SmartSchool</h1>
                        <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">NiiVaa Simplify Your Work Life</p>
                    </div>
                </div>
                <Link href="/smartschool/planning" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <ArrowLeft className="w-4 h-4" /> ย้อนกลับไปหน้าแผนงาน
                </Link>
            </header>

            <main className="max-w-4xl mx-auto space-y-6">
                <div className="bg-[#111A2E] border border-[#10B981] rounded-2xl p-8 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-[#10B981]/10 rounded-xl text-[#10B981]"><UploadCloud className="w-6 h-6" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1">อัปโหลดข้อมูลแผนปฏิบัติการ</h2>
                            <p className="text-sm text-gray-400">รองรับไฟล์ .xlsx (เริ่มอ่านข้อมูลแถวที่ 3 เป็นต้นไป)</p>
                        </div>
                    </div>
                    <div className="border-2 border-dashed border-gray-600 hover:border-[#10B981] bg-[#0B1325] rounded-xl p-10 text-center relative group">
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <UploadCloud className="w-12 h-12 text-gray-500 group-hover:text-[#10B981] mx-auto mb-4 transition-colors" />
                        {file ? <div className="text-[#10B981] font-medium">เลือกไฟล์แล้ว: {file.name}</div> : <p className="text-gray-300">คลิกที่นี่เพื่อเลือกไฟล์</p>}
                    </div>

                    {uploadStatus === 'success' && (
                        <div className="mt-6 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4 flex gap-3 text-sm text-[#10B981]"><CheckCircle2 className="w-5 h-5" /><p>นำเข้าข้อมูลสำเร็จ!</p></div>
                    )}
                    {uploadStatus === 'error' && (
                        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3 text-sm text-red-400"><AlertCircle className="w-5 h-5" /><p>{errorMessage}</p></div>
                    )}
                    
                    <div className="mt-8 flex justify-end">
                        <button onClick={handleUpload} disabled={!file || isUploading} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-[#0D9488] hover:brightness-110 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all">
                            {isUploading ? 'กำลังประมวลผลข้อมูล...' : 'ยืนยันการนำเข้าข้อมูล'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}