export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createClient } from '@/utils/supabase/server' // เปลี่ยน Path ให้ตรงกับระบบใหม่
import { Hexagon, FolderPlus, BarChart3, PieChart, Coins, ArrowUpRight, Activity, ArrowLeft, UploadCloud } from 'lucide-react'
import Link from 'next/link'

export default async function BudgetPlansOverview() {
    const supabase = await createClient()

    // ดึงข้อมูล Master Data และ Transaction จากฐานข้อมูล
    // *หมายเหตุ: ต้องมั่นใจว่าสร้างตาราง projects และ activities ใน schema core ไว้แล้ว
    // ดึงข้อมูล Master Data และ Transaction จากฐานข้อมูล
    const [
        { data: departments },
        { data: projects },
        { data: activities }
    ] = await Promise.all([
        supabase.schema('core').from('departments').select('department_id, department_name').order('department_id'),
        supabase.schema('core').from('projects').select('*'),
        supabase.schema('core').from('activities').select('*')
    ])

    // กรองกลุ่มบริหารให้เหลือเฉพาะชื่อหลัก (ไม่เอา Subdepartment) เพื่อลดความซ้ำซ้อน
    const uniqueDepartments = Array.from(new Set(departments?.map(d => d.department_name)))
        .map(name => {
            return departments?.find(d => d.department_name === name)
        }).filter(Boolean);

    const totalProjects = projects?.length || 0
    const totalActivities = activities?.length || 0
    const totalAllocatedBudget = activities?.reduce((sum, act) => sum + Number(act.budget_allocated || 0), 0) || 0

    return (
        <div className="min-h-screen bg-[#0B1325] text-white p-6 md:p-8 font-sans">
            {/* Header: แบรนดิ้งและชื่อโมดูล */}
            <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-gray-800 pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/smartschool" className="p-2.5 bg-gray-800/50 hover:bg-gray-700 rounded-xl border border-gray-700 text-gray-400 hover:text-white transition-all shadow-lg">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2.5 mb-1">
                            <Hexagon className="w-6 h-6 text-[#0D9488] animate-pulse" />
                            <h1 className="text-2xl font-bold tracking-tight">NiiVaa SmartSchool</h1>
                        </div>
                        <p className="text-xs text-gray-400 uppercase tracking-widest">ระบบบริหารงบประมาณและแผนปฏิบัติการประจำปี</p>
                    </div>
                </div>
                
                {/* ปุ่มลัด (Call to Action) */}
                <div className="flex gap-3 mt-4 md:mt-0">
                    <Link href="/smartschool/planning/projects/import" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-teal-400 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-gray-700">
                        <UploadCloud className="w-4 h-4" /> นำเข้าแผน Excel
                    </Link>
                    <Link href="/smartschool/planning/projects/new" className="flex items-center gap-2 bg-[#0D9488] hover:bg-[#0F766E] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-[#0D9488]/20">
                        <FolderPlus className="w-4 h-4" /> เสนอโครงการใหม่
                    </Link>
                </div>
            </header>

            {/* Main Content: การ์ดตัวชี้วัด (KPIs) */}
            <main className="max-w-7xl mx-auto space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* การ์ด 1: งบประมาณรวม */}
                    <div className="bg-[#111A2E] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group hover:border-[#0D9488]/50 transition-all shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-[#0D9488]/10 rounded-2xl text-[#0D9488]"><Coins className="w-6 h-6" /></div>
                            <span className="text-[10px] bg-gray-800/80 text-gray-400 px-3 py-1 rounded-full uppercase tracking-widest font-semibold border border-gray-700">ปีงบประมาณ 2569</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1 font-medium">งบประมาณจัดสรรตามแผนทั้งหมด</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {totalAllocatedBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-sm font-normal text-gray-500">บาท</span>
                        </h3>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#0D9488]/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    {/* การ์ด 2: จำนวนโครงการ */}
                    <div className="bg-[#111A2E] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-all shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400"><BarChart3 className="w-6 h-6" /></div>
                        </div>
                        <p className="text-xs text-gray-400 mb-1 font-medium">โครงการหลักในแผน</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {totalProjects} <span className="text-sm font-normal text-gray-500">โครงการ</span>
                        </h3>
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>

                    {/* การ์ด 3: จำนวนกิจกรรมย่อย */}
                    <div className="bg-[#111A2E] border border-gray-800 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/50 transition-all shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400"><PieChart className="w-6 h-6" /></div>
                        </div>
                        <p className="text-xs text-gray-400 mb-1 font-medium">กิจกรรมดำเนินการ</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight mt-2">
                            {totalActivities} <span className="text-sm font-normal text-gray-500">กิจกรรม</span>
                        </h3>
                        <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    </div>
                </section>

                {/* Section: โครงสร้างการจัดสรรงบประมาณ */}
                <section className="bg-[#111A2E] border border-gray-800 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
                        <Activity className="w-5 h-5 text-[#0D9488]" />
                        <div>
                            <h2 className="text-lg font-bold text-white">โครงสร้างงบประมาณจำแนกตามกลุ่มบริหาร</h2>
                            <p className="text-xs text-gray-400 mt-1">สัดส่วนโครงการและการตั้งงบประมาณรายฝ่าย</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {uniqueDepartments.map((dept: any, idx: number) => {
                            const deptProjects = projects?.filter(p => p.department_id === dept.department_id).length || 0
                            
                            return (
                                <Link href={`/smartschool/planning/${dept.department_id}`} key={idx} className="block">
                                    <div className="bg-[#0B1325] border border-gray-800 p-5 rounded-2xl hover:border-[#0D9488] hover:bg-[#0D9488]/5 transition-all flex flex-col justify-between group h-full">
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-200 group-hover:text-[#0D9488] transition-colors">{dept.department_name}</h4>
                                            <p className="text-[11px] text-gray-500 mt-2 line-clamp-1">คลิกเพื่อดูทะเบียนโครงการ</p>
                                        </div>
                                        <div className="flex justify-between items-end mt-8 pt-4 border-t border-gray-800/50">
                                            <div>
                                                <p className="text-[10px] text-gray-500 mb-1">รหัส</p>
                                                <span className="text-xs font-mono text-gray-400 bg-gray-800/50 px-2 py-1 rounded">{dept.department_id}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-gray-300">{deptProjects}</span>
                                                <span className="text-[10px] text-gray-500 ml-1">โครงการ</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>
            </main>
        </div>
    )
}