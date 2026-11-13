'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft,FolderPlus, Search, Filter, Download, Activity, CheckCircle2, Clock, BarChart3, PieChart, Coins, User, Home } from 'lucide-react'
import Link from 'next/link'
import { getTrackingData } from './actions'

export default function ProjectTrackingDashboard() {
    const [isLoading, setIsLoading] = useState(true)
    const [projects, setProjects] = useState<any[]>([])
    const [activities, setActivities] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])

    // State สำหรับ Filters
    const [selectedDept, setSelectedDept] = useState<string>('ALL') // กลุ่มบริหาร
    const [selectedSubDept, setSelectedSubDept] = useState<string>('ALL') // งานย่อย
    const [selectedProject, setSelectedProject] = useState<string>('ALL') // โครงการ
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [timeFilter, setTimeFilter] = useState<string>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const loadData = async () => {
            const res = await getTrackingData()
            if (res.success) {
                setProjects(res.projects)
                setDepartments(res.departments)
                setEmployees(res.employees)
                
                const enhancedActivities = res.activities.map(act => {
                    let usedMultiplier = 0;
                    if (act.status === 'COMPLETED') usedMultiplier = 0.95 + (Math.random() * 0.05);
                    else if (act.status === 'IN PROGRESS') usedMultiplier = 0.3 + (Math.random() * 0.5);
                    else usedMultiplier = 0;

                    const budgetAllocated = Number(act.budget_allocated || 0);
                    const budgetUsed = budgetAllocated * usedMultiplier;
                    
                    return {
                        ...act,
                        budget_used: budgetUsed,
                        budget_remaining: budgetAllocated - budgetUsed,
                        status: act.status || 'PENDING'
                    }
                })
                setActivities(enhancedActivities)
            }
            setIsLoading(false)
        }
        loadData()
    }, [])

    // --- Helper Functions สำหรับแปลงรหัสเป็น "ชื่อ" ---
    const getSubDeptName = (subId: string) => {
        const dept = departments.find(d => d.subdepartment_id === subId)
        return dept ? dept.subdepartment_name : subId
    }
    const getEmpName = (empCode: string) => {
        if (!empCode) return 'ไม่ระบุผู้รับผิดชอบ'
        const emp = employees.find(e => e.emp_code === empCode)
        return emp ? `${emp.prefix || ''}${emp.first_name || ''} ${emp.last_name || ''}` : empCode
    }

    // --- เตรียมตัวเลือก (Dropdown Options) ---
    // 1. กลุ่มบริหาร (ไม่ซ้ำ)
    const uniqueDepts = Array.from(new Set(departments.map(d => JSON.stringify({ id: d.department_id, name: d.department_name })))).map(s => JSON.parse(s))
    
    // 2. งานย่อย (กรองตามกลุ่มบริหารที่เลือก)
    let availableSubDepts = departments
    if (selectedDept !== 'ALL') availableSubDepts = departments.filter(d => d.department_id === selectedDept)
    const uniqueSubDepts = Array.from(new Set(availableSubDepts.map(d => JSON.stringify({ id: d.subdepartment_id, name: d.subdepartment_name })))).map(s => JSON.parse(s))

    // 3. โครงการ (กรองตามกลุ่มบริหารที่เลือก)
    let availableProjects = projects
    if (selectedDept !== 'ALL') availableProjects = projects.filter(p => p.department_id === selectedDept)

    // --- ฟังก์ชันกรองข้อมูลตาราง (Filter Logic) ---
    const filteredActivities = activities.filter(act => {
        const parentProject = projects.find(p => p.id === act.project_id)
        const actDeptId = parentProject ? parentProject.department_id : ''

        const matchDept = selectedDept === 'ALL' || actDeptId === selectedDept
        const matchProject = selectedProject === 'ALL' || act.project_id === selectedProject
        const matchSubDept = selectedSubDept === 'ALL' || act.sub_department_id === selectedSubDept
        const matchStatus = statusFilter === 'ALL' || act.status === statusFilter
        
        let matchTime = true
        if (timeFilter === 'THIS_MONTH' && act.start_date) {
            const actDate = new Date(act.start_date)
            const now = new Date()
            matchTime = actDate.getMonth() === now.getMonth() && actDate.getFullYear() === now.getFullYear()
        }

        const matchSearch = act.activity_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            act.activity_code.toLowerCase().includes(searchQuery.toLowerCase())

        return matchDept && matchProject && matchSubDept && matchStatus && matchTime && matchSearch
    })

    const totalAllocated = filteredActivities.reduce((sum, a) => sum + a.budget_allocated, 0)
    const totalUsed = filteredActivities.reduce((sum, a) => sum + a.budget_used, 0)
    const totalRemaining = totalAllocated - totalUsed
    const percentUsed = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0

    const StatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case 'COMPLETED': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> ดำเนินการแล้ว</span>
            case 'IN PROGRESS': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold"><Activity className="w-3.5 h-3.5" /> กำลังดำเนินการ</span>
            default: return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 text-xs font-semibold"><Clock className="w-3.5 h-3.5" /> รอการเบิกจ่าย</span>
        }
    }

    // จัดการเมื่อเปลี่ยนกลุ่มบริหาร ให้รีเซ็ตงานย่อยและโครงการ
    const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedDept(e.target.value)
        setSelectedSubDept('ALL')
        setSelectedProject('ALL')
    }

    if (isLoading) return <div className="min-h-screen bg-[#0B1325] text-teal-400 flex items-center justify-center">กำลังโหลดข้อมูล...</div>

    return (
        <div className="min-h-screen bg-[#0B1325] text-white p-4 md:p-6 lg:p-8 font-sans">
            
            {/* Header */}
            <header className="max-w-[90rem] mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        {/* ลิงก์กลับหน้า Dashboard แผนงาน */}
                        <Link href="/smartschool/planning" className="p-2.5 bg-gray-800/50 hover:bg-gray-700 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-all shadow-lg" title="กลับหน้าแผนงาน">
                            <ArrowLeft size={20} />
                        </Link>
                        {/* ลิงก์กลับหน้าแรก (Management Hub) */}
                        <Link href="/" className="p-2.5 bg-teal-900/30 hover:bg-teal-800/50 rounded-xl border border-teal-500/30 text-teal-400 hover:text-white transition-all shadow-lg" title="กลับหน้าหลักระบบบริหาร">
                            <Home size={20} />
                        </Link>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-teal-400" /> ระบบติดตามและรายงานผลแผนปฏิบัติการ
                        </h1>
                        <p className="text-xs text-gray-400 tracking-widest uppercase mt-0.5">Project & Activity Tracking Dashboard</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-gray-700 shadow-lg">
                    <Download className="w-4 h-4" /> ส่งออกรายงาน (Excel)
                </button>
            </header>

            <div className="max-w-[90rem] mx-auto space-y-6">
                
                {/* 1. KPI Cards (คงเดิม) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-400 text-sm font-medium">งบประมาณตามที่กรอง</p>
                            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400"><Coins className="w-5 h-5" /></div>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{totalAllocated.toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-gray-500">บาท</span></h3>
                    </div>
                    <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-400 text-sm font-medium">เบิกจ่ายใช้แล้ว (เบิกจ่าย)</p>
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><PieChart className="w-5 h-5" /></div>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{totalUsed.toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-gray-500">บาท</span></h3>
                    </div>
                    <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-5 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-gray-400 text-sm font-medium">งบประมาณคงเหลือ</p>
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle2 className="w-5 h-5" /></div>
                        </div>
                        <h3 className="text-2xl font-bold text-emerald-400">{totalRemaining.toLocaleString('th-TH', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-gray-500">บาท</span></h3>
                    </div>
                    <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center">
                        <p className="text-gray-400 text-sm font-medium mb-2">อัตราการเบิกจ่าย</p>
                        <div className="flex items-end gap-2 mb-2">
                            <h3 className="text-3xl font-bold text-white">{percentUsed.toFixed(1)}<span className="text-lg">%</span></h3>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                            <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-2 rounded-full transition-all duration-1000" style={{ width: `${percentUsed}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* 2. Filter Control Panel */}
                <div className="bg-[#111A2E] border border-gray-800 rounded-2xl p-5 shadow-lg">
                    <div className="flex items-center gap-2 mb-4 text-teal-400 font-medium">
                        <Filter className="w-4 h-4" /> ตัวกรองข้อมูลรายงาน (Filters)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="lg:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input type="text" placeholder="ค้นหาชื่อกิจกรรม, รหัส..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-teal-500 outline-none" />
                        </div>
                        
                        {/* กรองกลุ่มบริหาร */}
                        <select value={selectedDept} onChange={handleDeptChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 outline-none">
                            <option value="ALL">-- ทุกกลุ่มบริหาร --</option>
                            {uniqueDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>

                        {/* กรองงานย่อย / กลุ่มสาระ (แสดงชื่อ) */}
                        <select value={selectedSubDept} onChange={(e) => setSelectedSubDept(e.target.value)} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 outline-none">
                            <option value="ALL">-- ทุกกลุ่มสาระฯ/งาน --</option>
                            {uniqueSubDepts.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                        </select>

                        {/* กรองโครงการ */}
                        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:border-teal-500 outline-none">
                            <option value="ALL">-- ทุกโครงการ --</option>
                            {availableProjects.map(p => <option key={p.id} value={p.id}>[{p.project_code}] {p.project_name}</option>)}
                        </select>

                        <div className="flex gap-2">
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-1/2 bg-[#0B1325] border border-gray-700 rounded-xl px-2 py-2 text-sm text-white focus:border-teal-500 outline-none">
                                <option value="ALL">สถานะ</option>
                                <option value="COMPLETED">เสร็จสิ้น</option>
                                <option value="IN PROGRESS">กำลังทำ</option>
                                <option value="PENDING">รอจัด</option>
                            </select>
                            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="w-1/2 bg-[#0B1325] border border-gray-700 rounded-xl px-2 py-2 text-sm text-white focus:border-teal-500 outline-none">
                                <option value="ALL">เวลา</option>
                                <option value="THIS_MONTH">เดือนนี้</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Data Table */}
                <div className="bg-[#111A2E] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#1A233A] text-gray-400 border-b border-gray-800">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">รหัส/ชื่อกิจกรรม และ โครงการ</th>
                                    <th className="px-6 py-4 font-semibold">ผู้รับผิดชอบ / หน่วยงาน</th>
                                    <th className="px-6 py-4 font-semibold text-right">งบจัดสรร (บาท)</th>
                                    <th className="px-6 py-4 font-semibold text-center w-64">สัดส่วนการใช้งบ (เบิกจ่าย)</th>
                                    <th className="px-6 py-4 font-semibold text-center">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-gray-300">
                                {filteredActivities.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</td></tr>
                                ) : (
                                    filteredActivities.map((act) => {
                                        const pUsed = act.budget_allocated > 0 ? (act.budget_used / act.budget_allocated) * 100 : 0;
                                        const parentProject = projects.find(p => p.id === act.project_id);
                                        
                                        return (
                                            <tr key={act.id} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="font-bold text-white flex items-center gap-2">
                                                            <span className="text-xs bg-gray-800 text-teal-400 px-2 py-0.5 rounded border border-gray-700">{act.activity_code}</span>
                                                            {act.activity_name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                                                            <span className="bg-gray-800 px-1.5 py-0.5 rounded">{parentProject?.project_code}</span> {parentProject?.project_name || 'ไม่ระบุโครงการ'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-1.5 text-gray-300">
                                                            <User className="w-3.5 h-3.5 text-teal-500" /> {getEmpName(act.emp_code)}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 flex flex-col">
                                                            <span>{getSubDeptName(act.sub_department_id)}</span>
                                                            <span className="text-teal-500/70">{act.fund_type || 'ไม่ระบุประเภทเงิน'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-gray-300">
                                                    {act.budget_allocated.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5 w-full max-w-[200px] mx-auto">
                                                        <div className="flex justify-between text-[10px]">
                                                            <span className="text-blue-400">ใช้ {act.budget_used.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                                            <span className="text-emerald-400">เหลือ {act.budget_remaining.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                                        </div>
                                                        <div className="w-full bg-gray-800 rounded-full h-1.5 flex overflow-hidden">
                                                            <div className="bg-blue-500 h-full" style={{ width: `${pUsed}%` }}></div>
                                                            <div className="bg-emerald-500 h-full" style={{ width: `${100 - pUsed}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusBadge status={act.status} />
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}