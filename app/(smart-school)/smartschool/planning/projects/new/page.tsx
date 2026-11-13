'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, PlusCircle, ArrowRightLeft, Landmark, FolderPlus, Plus, Trash2, Calculator, FileText } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { getPlanningMasterData } from './actions'

export default function NewProjectActivityForm() {
    const [creationMode, setCreationMode] = useState<1 | 2 | 3>(1)
    
    // 1. State เก็บข้อมูลจริงจากฐานข้อมูล
    const [projectsList, setProjectsList] = useState<any[]>([])
    const [activitiesList, setActivitiesList] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // 2. State สำหรับฟอร์มหลัก
    const [formData, setFormData] = useState({
        projectId: '',
        projectName: '',
        activityCode: '',
        activityName: '',
        departmentId: '',
        objective: '',
        refAgency: '',
        refDocNo: '',
        refDocTitle: '',
        refDocDate: '',
        budgetCategory: '',
        expensePurpose: '',
        newBudgetAmount: ''
    })

    const [budgetSources, setBudgetSources] = useState([{ id: Date.now(), fromActivityId: '', fundType: '', max: 0, amount: 0 }])

    // 3. โหลดข้อมูลเมื่อเปิดหน้าเว็บ
    useEffect(() => {
        const loadData = async () => {
            const res = await getPlanningMasterData()
            if (res.success) {
                setProjectsList(res.projects)
                setActivitiesList(res.activities)
            }
            setIsLoading(false)
        }
        loadData()
    }, [])

    // 4. เมื่อมีการเลือกโครงการ ให้หารหัสกิจกรรมถัดไปอัตโนมัติ
    const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value // ได้ UUID ของโปรเจกต์มา
        const proj = projectsList.find(p => p.id === pid)
        let nextCode = ''

        if (proj) {
            // หากิจกรรมทั้งหมดที่อยู่ในโครงการนี้
            const projActs = activitiesList.filter(a => a.project_id === pid)
            
            if (projActs.length > 0) {
                // เอารหัสมาเรียงลำดับ แล้วดึงตัวล่าสุดมาเพิ่มค่าไปอีก 1
                const codes = projActs.map(a => a.activity_code)
                codes.sort()
                const lastCode = codes[codes.length - 1] // เช่น A69-01-08
                const parts = lastCode.split('-')
                const lastNum = parseInt(parts[parts.length - 1])
                const nextNum = (lastNum + 1).toString().padStart(2, '0')
                parts[parts.length - 1] = nextNum
                nextCode = parts.join('-') // จะได้ A69-01-09
            } else {
                // ถ้ายังไม่มีกิจกรรมเลย ให้แปลงรหัสโครงการ P เป็น A แล้วต่อด้วย -01
                nextCode = proj.project_code.replace('P', 'A') + '-01'
            }
        }
        setFormData({ ...formData, projectId: pid, activityCode: nextCode })
    }

    // เมื่อเปลี่ยนโหมดการทำงาน
    useEffect(() => {
        if (creationMode === 2) {
            // สมมติรหัสโครงการใหม่ (ในระบบจริงอาจต้อง Query หารหัสโครงการล่าสุดอีกที)
            setFormData(prev => ({ ...prev, projectId: 'P69-XX', activityCode: 'A69-XX-01' }))
        } else if (creationMode === 1) {
            setFormData(prev => ({ ...prev, projectId: '', activityCode: '', projectName: '' }))
        }
    }, [creationMode])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleAddBudgetSource = () => setBudgetSources([...budgetSources, { id: Date.now(), fromActivityId: '', fundType: '', max: 0, amount: 0 }])
    const handleRemoveBudgetSource = (id: number) => setBudgetSources(budgetSources.filter(s => s.id !== id))

    // เมื่อมีการเลือกกิจกรรมต้นทางเพื่อตัดยอด
    const handleSourceChange = (id: number, field: string, value: string | number) => {
        setBudgetSources(budgetSources.map(s => {
            if (s.id === id) {
                let updated = { ...s, [field]: value }
                if (field === 'fromActivityId') {
                    // ดึงข้อมูลประเภทเงินและยอดคงเหลือมาจากฐานข้อมูลจริง
                    const act = activitiesList.find(a => a.id === value)
                    updated.fundType = act ? act.fund_type : ''
                    updated.max = act ? Number(act.budget_allocated) : 0 // (ในอนาคต: ต้องเป็นยอดหักจ่ายแล้ว)
                    updated.amount = 0
                }
                if (field === 'amount') {
                    const numValue = Number(value)
                    updated.amount = numValue > s.max ? s.max : numValue // กันไม่ให้กรอกเกินยอดคงเหลือ
                }
                return updated
            }
            return s
        }))
    }

    const totalGatheredBudget = budgetSources.reduce((sum, src) => sum + Number(src.amount || 0), 0)

    if (isLoading) return <div className="min-h-screen bg-[#0B1325] text-teal-400 flex items-center justify-center">กำลังโหลดข้อมูล...</div>

    return (
        <div className="min-h-screen bg-[#0B1325] text-white p-6 font-sans">
            {/* Header */}
            <header className="max-w-5xl mx-auto mb-8 border-b border-[#0D9488]/30 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">ตั้งกิจกรรม/โครงการใหม่</h1>
                        <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">Budget Reallocation & New Planning</p>
                    </div>
                </div>
                <Link href="/smartschool/planning" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm bg-gray-800/50 hover:bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <ArrowLeft className="w-4 h-4" /> ย้อนกลับไปหน้าแผนงาน
                </Link>
            </header>

            <main className="max-w-5xl mx-auto space-y-6">
                
                {/* 1. เลือกแนวทางการทำงาน */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => setCreationMode(1)} className={`p-4 rounded-xl border text-left transition-all ${creationMode === 1 ? 'bg-teal-900/30 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'bg-[#111A2E] border-gray-800 hover:border-gray-600'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <ArrowRightLeft className={`w-5 h-5 ${creationMode === 1 ? 'text-teal-400' : 'text-gray-500'}`} />
                            <h3 className="font-bold text-sm">แบบที่ 1 (แนะนำ)</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">เพิ่มกิจกรรมใหม่ใน <span className="text-teal-400">โครงการเดิม</span> โดยขอโอน/ตัดแบ่งงบจากกิจกรรมอื่น</p>
                    </button>

                    <button onClick={() => setCreationMode(2)} className={`p-4 rounded-xl border text-left transition-all ${creationMode === 2 ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-[#111A2E] border-gray-800 hover:border-gray-600'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <FolderPlus className={`w-5 h-5 ${creationMode === 2 ? 'text-blue-400' : 'text-gray-500'}`} />
                            <h3 className="font-bold text-sm">แบบที่ 2</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">ตั้ง <span className="text-blue-400">โครงการใหม่</span> และกิจกรรมใหม่ โดยขอโอน/ตัดแบ่งงบจากกิจกรรมอื่น</p>
                    </button>

                    <button onClick={() => setCreationMode(3)} className={`p-4 rounded-xl border text-left transition-all ${creationMode === 3 ? 'bg-amber-900/30 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#111A2E] border-gray-800 hover:border-gray-600'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <Landmark className={`w-5 h-5 ${creationMode === 3 ? 'text-amber-400' : 'text-gray-500'}`} />
                            <h3 className="font-bold text-sm">แบบที่ 3</h3>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">เพิ่มกิจกรรมรับ <span className="text-amber-400">งบประมาณจัดสรรใหม่</span> ตามหนังสือสั่งการ</p>
                    </button>
                </div>

                {/* 2. ฟอร์มรายละเอียดข้อมูล */}
                <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-lg">
                    <h2 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-3 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-teal-500" /> ข้อมูลโครงการและกิจกรรมใหม่
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {creationMode === 1 || creationMode === 3 ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">เลือกโครงการหลัก</label>
                                <select value={formData.projectId} onChange={handleProjectSelect} className="w-full bg-[#0B1325] border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500">
                                    <option value="">-- เลือกโครงการเดิม --</option>
                                    {projectsList.map(p => <option key={p.id} value={p.id}>[{p.project_code}] {p.project_name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">ชื่อโครงการใหม่</label>
                                <div className="flex gap-2">
                                    <input type="text" name="projectId" value={formData.projectId} onChange={handleChange} className="w-1/3 bg-[#0B1325] border border-teal-500/50 rounded-lg px-3 py-2.5 text-teal-400 font-mono text-sm" placeholder="รหัส" />
                                    <input type="text" name="projectName" value={formData.projectName} onChange={handleChange} placeholder="ระบุชื่อโครงการ" className="w-2/3 bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-2.5 text-white" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">รหัส และ ชื่อกิจกรรมใหม่</label>
                            <div className="flex gap-2">
                                <input type="text" name="activityCode" value={formData.activityCode} onChange={handleChange} className="w-1/3 bg-[#0B1325] border border-teal-500/50 rounded-lg px-3 py-2.5 text-teal-400 font-mono text-sm" placeholder="รหัสอัตโนมัติ" />
                                <input type="text" name="activityName" value={formData.activityName} onChange={handleChange} placeholder="ระบุชื่อกิจกรรม" className="w-2/3 bg-[#0B1325] border border-gray-700 focus:border-teal-500 rounded-lg px-3 py-2.5 text-white outline-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. ส่วนจัดการงบประมาณ */}
                <div className={`bg-[#111A2E] border rounded-2xl p-6 md:p-8 shadow-lg ${creationMode === 3 ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-teal-500/30'}`}>
                    <h2 className="text-lg font-bold text-white mb-6 border-b border-gray-800 pb-3 flex items-center gap-2">
                        {creationMode === 3 ? <FileText className="w-5 h-5 text-amber-500" /> : <Calculator className="w-5 h-5 text-teal-500" />} 
                        {creationMode === 3 ? 'รายละเอียดหนังสือสั่งการ/การจัดสรรงบประมาณ' : 'การขอโอนเปลี่ยนแปลง/ตัดแบ่งงบประมาณ'}
                    </h2>

                    {creationMode === 3 ? (
                        /* ฟอร์มแบบที่ 3 (หนังสือสั่งการ) */
                        <div className="space-y-5 bg-[#0B1325] p-6 rounded-xl border border-gray-800">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                <h3 className="font-semibold text-amber-400">ได้รับจัดสรรงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ. {new Date().getFullYear() + 543}</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">อ้างอิง จากหน่วยงาน</label>
                                    <input type="text" name="refAgency" value={formData.refAgency} onChange={handleChange} placeholder="เช่น สพฐ. / สพม. / อบจ." className="w-full bg-[#111A2E] border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors" />
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-1/2">
                                        <label className="block text-sm text-gray-400 mb-1">เลขที่หนังสือ</label>
                                        <input type="text" name="refDocNo" value={formData.refDocNo} onChange={handleChange} placeholder="เช่น ศธ 04001/ว123" className="w-full bg-[#111A2E] border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors" />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="block text-sm text-gray-400 mb-1">ลงวันที่</label>
                                        <input type="date" name="refDocDate" value={formData.refDocDate} onChange={handleChange} className="w-full bg-[#111A2E] border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-gray-400 mb-1">เรื่อง</label>
                                <input type="text" name="refDocTitle" value={formData.refDocTitle} onChange={handleChange} placeholder="ระบุเรื่องตามหนังสืออ้างอิง" className="w-full bg-[#111A2E] border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-800">
                                <div className="md:col-span-1">
                                    <label className="block text-sm text-gray-400 mb-1">ประเภทงบประมาณ</label>
                                    <select name="budgetCategory" value={formData.budgetCategory} onChange={handleChange} className="w-full bg-[#111A2E] border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors">
                                        <option value="">-- เลือกประเภทงบ --</option>
                                        <option value="งบดำเนินงาน">งบดำเนินงาน</option>
                                        <option value="งบลงทุน">งบลงทุน (ค่าครุภัณฑ์ ที่ดินและสิ่งก่อสร้าง)</option>
                                        <option value="งบบุคลากร">งบบุคลากร</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm text-gray-400 mb-1">เพื่อเป็นค่า</label>
                                    <input type="text" name="expensePurpose" value={formData.expensePurpose} onChange={handleChange} placeholder="เช่น ค่าวัสดุการศึกษา" className="w-full bg-[#111A2E] border border-gray-700 focus:border-amber-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors" />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm text-gray-400 mb-1">จำนวนเงิน (บาท)</label>
                                    <input type="number" name="newBudgetAmount" value={formData.newBudgetAmount} onChange={handleChange} placeholder="0.00" className="w-full bg-[#111A2E] border border-amber-500/50 focus:border-amber-400 rounded-lg px-4 py-2.5 text-amber-400 font-bold text-lg text-right outline-none transition-colors shadow-inner" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ฟอร์มแบบที่ 1 และ 2 (ตัดยอด) */
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400 mb-4">เลือกกิจกรรมที่มีงบประมาณคงเหลือ เพื่อโอนมาใช้สำหรับกิจกรรมใหม่นี้ (แนะนำให้เลือกประเภทเงินเดียวกัน)</p>
                            
                            {budgetSources.map((source, index) => (
                                <div key={source.id} className="flex flex-col xl:flex-row gap-3 p-4 bg-[#0B1325] border border-gray-700 rounded-xl relative group">
                                    <div className="w-full xl:w-5/12">
                                        <label className="block text-xs text-gray-500 mb-1">ตัดยอดจากกิจกรรม</label>
                                        <select value={source.fromActivityId} onChange={(e) => handleSourceChange(source.id, 'fromActivityId', e.target.value)} className="w-full bg-[#111A2E] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                                            <option value="">-- เลือกกิจกรรมต้นทาง --</option>
                                            {/* ดึงรายการกิจกรรมทั้งหมดที่อัปโหลดไว้มาแสดงแบบ Dropdown */}
                                            {activitiesList.map(a => <option key={a.id} value={a.id}>[{a.activity_code}] {a.activity_name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-full xl:w-3/12">
                                        <label className="block text-xs text-gray-500 mb-1">ประเภทเงิน (ต้นทาง)</label>
                                        <input type="text" readOnly value={source.fundType} className="w-full bg-[#1A233A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400" placeholder="-" />
                                    </div>
                                    <div className="w-full xl:w-2/12">
                                        <label className="block text-xs text-gray-500 mb-1">ยอดคงเหลือ (Max)</label>
                                        <input type="text" readOnly value={source.max.toLocaleString()} className="w-full bg-[#1A233A] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 text-right" placeholder="0" />
                                    </div>
                                    <div className="w-full xl:w-2/12 flex items-end gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs text-teal-400 mb-1">ยอดเงินที่ขอตัด</label>
                                            <input type="number" value={source.amount || ''} onChange={(e) => handleSourceChange(source.id, 'amount', e.target.value)} className="w-full bg-[#111A2E] border border-teal-500/50 rounded-lg px-3 py-2 text-sm text-white text-right outline-none focus:border-teal-400" placeholder="0" />
                                        </div>
                                        {index > 0 && (
                                            <button onClick={() => handleRemoveBudgetSource(source.id)} className="p-2 text-gray-500 hover:text-red-400 bg-gray-800 rounded-lg border border-gray-700"><Trash2 className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-between items-center mt-4 border-t border-gray-800 pt-4">
                                <button onClick={handleAddBudgetSource} className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20">
                                    <Plus className="w-4 h-4" /> เพิ่มกิจกรรมต้นทางอีก
                                </button>
                                
                                <div className="text-right">
                                    <span className="text-sm text-gray-400 mr-3">รวมงบประมาณที่ได้รับจัดสรร:</span>
                                    <span className="text-2xl font-bold text-white tracking-tight">{totalGatheredBudget.toLocaleString()} <span className="text-sm text-gray-500 font-normal">บาท</span></span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button type="button" className={`flex items-center gap-2 ${creationMode === 3 ? 'bg-gradient-to-r from-amber-600 to-orange-500' : 'bg-gradient-to-r from-teal-600 to-emerald-600'} hover:brightness-110 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all`}>
                        <Save className="w-4 h-4" /> บันทึกและทำรายการต่อ
                    </button>
                </div>
            </main>
        </div>
    )
}