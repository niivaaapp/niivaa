'use client'

import { useState } from 'react'
import { ArrowLeft, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, PackageSearch } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { importMaterialData } from './actions'

export default function ImportMaterialCatalog() {
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
                if (rawRows.length < 3) throw new Error("รูปแบบไฟล์ไม่ถูกต้อง (ต้องมีข้อมูลตั้งแต่แถวที่ 3)")

                const jsonData = []
                for (let i = 2; i < rawRows.length; i++) {
                    const row = rawRows[i] as any[]
                    if (!row || !row[2]) continue // ข้ามถ้าไม่มีชื่อพัสดุ
                    
                    jsonData.push({
                        item_name: String(row[2] || '').trim(),        // คอลัมน์ C: รายการพัสดุ
                        category: String(row[3] || '').trim(),         // คอลัมน์ D: ประเภท
                        unit_name: String(row[4] || '').trim(),        // คอลัมน์ E: หน่วย
                        default_price: parseFloat(row[5]) || 0,        // คอลัมน์ F: ราคา
                        brand: String(row[7] || '').trim()             // คอลัมน์ H: ยี่ห้อ
                    })
                }

                if (jsonData.length === 0) throw new Error("ไม่พบรายการพัสดุที่สามารถนำเข้าได้")

                const result = await importMaterialData(jsonData)
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
        <div className="min-h-screen bg-[#0B1325] text-white p-6 font-sans">
            <header className="max-w-4xl mx-auto mb-8 border-b border-blue-500/30 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">จัดการฐานข้อมูลพัสดุ</h1>
                        <p className="text-xs text-blue-400 tracking-widest font-medium mt-0.5">Material Catalog Management</p>
                    </div>
                </div>
                {/* อัปเดต Link ชี้กลับไปที่หน้า Procurement */}
                <Link href="/smartschool/procurement" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <ArrowLeft className="w-4 h-4" /> ย้อนกลับไประบบพัสดุ
                </Link>
            </header>

            <main className="max-w-4xl mx-auto space-y-6">
                
                <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white mb-1">ขั้นตอนที่ 1: เตรียมไฟล์ Excel ทะเบียนพัสดุ</h2>
                            <p className="text-sm text-gray-400 mb-2">
                                กรุณาใช้ไฟล์ Excel ที่มีโครงสร้างตามมาตรฐาน <span className="text-blue-400">(ระบบจะเริ่มอ่านข้อมูลจากแถวที่ 3 เป็นต้นไป)</span>
                            </p>
                            <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
                                <li>คอลัมน์ C: รายการพัสดุ (ต้องระบุ)</li>
                                <li>คอลัมน์ D: ประเภท</li>
                                <li>คอลัมน์ E: หน่วย</li>
                                <li>คอลัมน์ F: ราคาประเมิน/ราคากลาง</li>
                                <li>คอลัมน์ H: ยี่ห้อ (ใช้สำหรับใบตรวจรับและช่วยค้นหา แต่จะถูกตัดออกในรายงานขอซื้อ)</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111A2E] border border-blue-500/50 rounded-2xl p-8 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600"></div>

                    <div className="flex items-start gap-4 mb-6">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
                            <PackageSearch className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1">ขั้นตอนที่ 2: อัปโหลดข้อมูลเข้าระบบ</h2>
                            <p className="text-sm text-gray-400">การอัปโหลดไฟล์ใหม่ จะเป็นการ <span className="text-red-400">แทนที่</span> รายการพัสดุเดิมทั้งหมดในระบบ</p>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-gray-600 hover:border-blue-500 bg-[#0B1325] rounded-xl p-10 text-center transition-colors relative group">
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        />
                        <UploadCloud className="w-12 h-12 text-gray-500 group-hover:text-blue-400 mx-auto mb-4 transition-colors" />
                        
                        {file ? (
                            <div className="text-blue-400 font-medium">เลือกไฟล์แล้ว: {file.name}</div>
                        ) : (
                            <div>
                                <p className="text-gray-300 font-medium mb-1">คลิกที่นี่เพื่อเลือกไฟล์ หรือลากไฟล์มาวาง</p>
                                <p className="text-gray-500 text-xs">รองรับไฟล์ .xlsx หรือ .xls</p>
                            </div>
                        )}
                    </div>

                    {uploadStatus === 'success' && (
                        <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex gap-3 text-sm text-emerald-400">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <p>นำเข้าฐานข้อมูลพัสดุสำเร็จ! ข้อมูลพร้อมสำหรับการทำประมาณการแล้ว</p>
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
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 border border-blue-400/50 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all"
                        >
                            {isUploading ? 'กำลังประมวลผลข้อมูล...' : 'ยืนยันการนำเข้าพัสดุ'}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}