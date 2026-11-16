'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Search, Plus, Trash2, CheckCircle2, Building, MapPin, FileText, AlertTriangle, GitMerge, Info } from 'lucide-react'
import Link from 'next/link'
import { getRequestMasterData } from './actions'

interface MixedExpenseItem {
    id: string;
    expense_type: 'MATERIAL' | 'ALLOWANCE' | 'TRANSPORT' | 'ACCOMMODATION' | 'CONTRACT';
    item_name: string;
    pax_count: number | '';
    day_or_room_count: number | '';
    unit_price: number | '';
    total: number;
}

interface BudgetSource {
    id: number;
    fromActivityId: string;
    fundType: string;
    max: number;
    amount: number;
}

export default function NewActivityRequestForm() {
    const [isLoading, setIsLoading] = useState(true)
    const [masterData, setMasterData] = useState<any>(null)
    const [requestMode, setRequestMode] = useState<1 | 2 | 3>(1)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [currentUserCode] = useState('EMP001') // จำลองผู้ใช้

    // จำลองข้อมูลกิจกรรมในแผน (แทนข้อมูลจริงระหว่างรอเชื่อม DB)
    const [mockActivities] = useState([
        { id: 'A69-01-01', code: '1601', name: 'กิจกรรมการวิจัยในชั้นเรียน', project_name: 'โครงการพัฒนาผู้เรียน', fund_type: 'เงินอุดหนุนรายหัว', allocated: 35000, remaining: 35000, request_count: 1 },
        { id: 'A69-01-02', code: '1602', name: 'กิจกรรมศึกษาดูงาน', project_name: 'โครงการพัฒนาบุคลากร', fund_type: 'รายได้สถานศึกษา', allocated: 50000, remaining: 15000, request_count: 3 },
        { id: 'A69-01-03', code: '1603', name: 'กิจกรรมอบรมทักษะไอที', project_name: 'โครงการพัฒนาผู้เรียน', fund_type: 'เงินอุดหนุนรายหัว', allocated: 20000, remaining: 8000, request_count: 1 }
    ])

    const [formData, setFormData] = useState({
        activity_id: '', request_iteration: 1, request_date: new Date().toISOString().split('T')[0],
        start_date: '', end_date: '', location: '',
        target_executives: '', target_teachers: '', target_students: '', target_student_level: '', target_others: '', target_others_count: '',
        mode3Reason: ''
    })

    const [expenses, setExpenses] = useState<MixedExpenseItem[]>([
        { id: '1', expense_type: 'ALLOWANCE', item_name: 'ค่าเบี้ยเลี้ยงครู บุคลากร', pax_count: 2, day_or_room_count: 1, unit_price: 240, total: 480 }
    ])

    // State สำหรับโอนงบ (เฉพาะแบบ 2)
    const [budgetSources, setBudgetSources] = useState<BudgetSource[]>([{ id: Date.now(), fromActivityId: '', fundType: '', max: 0, amount: 0 }])

    useEffect(() => {
        const loadData = async () => {
            const res = await getRequestMasterData()
            if (res.success) setMasterData(res.data)
            setIsLoading(false)
        }
        loadData()
    }, [])

    const handleActivitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const actId = e.target.value
        const act = mockActivities.find(a => a.id === actId)
        setFormData(prev => ({ ...prev, activity_id: actId, request_iteration: act ? act.request_count + 1 : 1 }))
    }

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // ฟังก์ชันจัดการรายการประมาณการค่าใช้จ่าย
    const handleAddExpense = (type: 'MATERIAL' | 'ALLOWANCE' | 'TRANSPORT' | 'ACCOMMODATION' | 'CONTRACT') => setExpenses([...expenses, { id: Date.now().toString(), expense_type: type, item_name: '', pax_count: 1, day_or_room_count: 1, unit_price: '', total: 0 }])
    const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id))
    const handleExpenseChange = (id: string, field: keyof MixedExpenseItem, value: string) => {
        setExpenses(expenses.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }
                if (field === 'pax_count' || field === 'day_or_room_count' || field === 'unit_price') {
                    const pax = Number(updated.pax_count) || 0
                    const multiplier = updated.expense_type === 'MATERIAL' || updated.expense_type === 'TRANSPORT' ? 1 : (Number(updated.day_or_room_count) || 1)
                    const price = Number(updated.unit_price) || 0
                    updated.total = pax * multiplier * price
                }
                return updated
            }
            return item
        }))
    }
    const grandTotal = expenses.reduce((sum, item) => sum + item.total, 0)
    const hasProcurement = expenses.some(e => e.expense_type === 'MATERIAL' || e.expense_type === 'CONTRACT')

    // ฟังก์ชันจัดการโอนงบประมาณ (สำหรับแบบ 2)
    const handleAddBudgetSource = () => setBudgetSources([...budgetSources, { id: Date.now(), fromActivityId: '', fundType: '', max: 0, amount: 0 }])
    const handleRemoveBudgetSource = (id: number) => setBudgetSources(budgetSources.filter(s => s.id !== id))
    const handleSourceChange = (id: number, field: string, value: string | number) => {
        setBudgetSources(budgetSources.map(s => {
            if (s.id === id) {
                let updated = { ...s, [field]: value }
                if (field === 'fromActivityId') {
                    const act = mockActivities.find(a => a.id === value)
                    updated.fundType = act ? act.fund_type : ''
                    updated.max = act ? Number(act.remaining) : 0
                    updated.amount = 0
                }
                if (field === 'amount') {
                    const numValue = Number(value)
                    updated.amount = numValue > s.max ? s.max : numValue
                }
                return updated
            }
            return s
        }))
    }
    const totalTransferredBudget = budgetSources.reduce((sum, src) => sum + Number(src.amount || 0), 0)

    const selectedActivity = mockActivities.find(a => a.id === formData.activity_id)

    // ข้อมูลผู้ขอ (จำลอง)
    const currentUserInfo = {
        name: 'นางมุ่งงาน การกุศล',
        position: 'ครูชำนาญการพิเศษ',
        sub_dept_name: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
        dept_name: 'กลุ่มบริหารวิชาการ'
    }

    if (isLoading) return <div className="min-h-screen bg-[#001f3f] text-teal-400 flex justify-center items-center">กำลังโหลด...</div>

    return (
        <div className="min-h-screen bg-[#0B1528] text-white p-4 font-sans pb-20">
            
            <header className="max-w-7xl mx-auto mb-6 flex justify-between items-center bg-[#002B49] p-4 rounded-xl shadow-lg border-b-4 border-[#008080]">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6 text-[#98FB98]" /> สร้างบันทึกข้อความขออนุญาตดำเนินโครงการ
                    </h1>
                    <p className="text-sm text-teal-300 mt-1">ผู้เบิก: {currentUserInfo.name} ({currentUserInfo.sub_dept_name})</p>
                </div>
                <Link href="/smartschool/planning" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-600 transition-colors">ย้อนกลับ</Link>
            </header>

            <main className="max-w-7xl mx-auto space-y-6">
                
                {/* เลือก Mode */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl p-6 shadow-xl">
                    <h2 className="text-sm font-bold text-teal-400 mb-4 uppercase tracking-wide">รูปแบบการขออนุมัติ</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => setRequestMode(1)} className={`p-4 rounded-xl border text-left transition-all ${requestMode === 1 ? 'bg-teal-900/40 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'bg-[#0B1528] border-gray-700 hover:border-gray-500'}`}>
                            <h3 className={`font-bold ${requestMode === 1 ? 'text-teal-300' : 'text-gray-300'}`}>แบบ 1: ขอใช้เงินในแผน</h3>
                            <p className="text-xs text-gray-400 mt-1">ใช้งบปกติที่ได้รับจัดสรร</p>
                        </button>
                        <button onClick={() => setRequestMode(2)} className={`p-4 rounded-xl border text-left transition-all ${requestMode === 2 ? 'bg-amber-900/40 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#0B1528] border-gray-700 hover:border-gray-500'}`}>
                            <h3 className={`font-bold ${requestMode === 2 ? 'text-amber-400' : 'text-gray-300'}`}>แบบ 2: ขอเพิ่มวงเงิน</h3>
                            <p className="text-xs text-gray-400 mt-1">กิจกรรมเดิม ขอตัดงบอื่นมาสมทบ</p>
                        </button>
                        <button onClick={() => setRequestMode(3)} className={`p-4 rounded-xl border text-left transition-all ${requestMode === 3 ? 'bg-blue-900/40 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-[#0B1528] border-gray-700 hover:border-gray-500'}`}>
                            <h3 className={`font-bold ${requestMode === 3 ? 'text-blue-400' : 'text-gray-300'}`}>แบบ 3: โครงการใหม่</h3>
                            <p className="text-xs text-gray-400 mt-1">ตั้งใหม่ นอกแผนประจำปี</p>
                        </button>
                    </div>

                    {/* การแจ้งเตือน (Smart Warnings) เฉพาะแบบที่ 3 เท่านั้น */}
                    {requestMode === 3 && (
                        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-blue-400 font-bold text-sm">จำเป็นต้องตั้งรหัสกิจกรรมใหม่ก่อน</p>
                                    <p className="text-xs text-blue-200/70 mt-1">
                                        ระบบตรวจพบว่าคุณกำลังขอตั้งโครงการ/กิจกรรมใหม่ (นอกแผน) กรุณาตรวจสอบให้แน่ใจว่าได้ทำการ <b>สร้างรหัสกิจกรรมใหม่</b> ไว้ในระบบแผนเรียบร้อยแล้ว
                                    </p>
                                </div>
                            </div>
                            <Link href="/smartschool/planning/projects/new" className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2">
                                <GitMerge className="w-4 h-4" /> ไปหน้าตั้งโครงการ/กิจกรรมใหม่
                            </Link>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 1: หัวบันทึก */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-6 py-3 font-bold text-white flex items-center gap-2">
                        <Search className="w-5 h-5" /> 1. เลือกกิจกรรมและข้อมูลบันทึกข้อความ
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                        
                        <div className="col-span-12 md:col-span-6 bg-[#0B1528] p-4 rounded-lg border border-gray-700">
                            <label className="text-sm text-gray-400 block mb-1">เรียน (ส่งถึง)</label>
                            {/* ดึงชื่อโรงเรียนจาก DB ตามที่อัปเดต */}
                            <div className="text-lg font-bold text-white">ผู้อำนวยการ{masterData?.schoolName || 'โรงเรียน...'}</div>
                        </div>
                        
                        <div className="col-span-12 md:col-span-3">
                            <label className="text-sm text-gray-400 block mb-1">เลขที่คำขอ</label>
                            <input type="text" readOnly value="ออกอัตโนมัติ" className="w-full bg-[#0B1528] border border-gray-700 rounded p-2.5 text-gray-500 text-sm text-center" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                            <label className="text-sm text-gray-400 block mb-1">ลงวันที่</label>
                            <input type="date" name="request_date" value={formData.request_date} onChange={handleFormChange} className="w-full bg-[#E8F8F5] border border-[#008080] text-[#002B49] rounded p-2.5 outline-none font-bold" />
                        </div>

                        {/* เลือกกิจกรรมหลัก */}
                        <div className="col-span-12">
                            <label className="text-sm text-teal-400 font-bold block mb-1">กิจกรรมอ้างอิง (ที่จะดำเนินการ)</label>
                            <select name="activity_id" value={formData.activity_id} onChange={handleActivitySelect} className="w-full bg-[#E8F8F5] border-2 border-[#008080] text-[#002B49] rounded-lg p-3 outline-none font-bold text-lg shadow-inner">
                                <option value="">-- พิมพ์ค้นหา หรือ เลือกกิจกรรม --</option>
                                {mockActivities.map(a => <option key={a.id} value={a.id}>[{a.code}] {a.name}</option>)}
                            </select>
                        </div>

                        {selectedActivity && (
                            <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0B1528] p-5 rounded-lg border border-[#008080]/30">
                                <div><span className="text-xs text-gray-400 block">โครงการ</span><span className="text-sm text-white">{selectedActivity.project_name}</span></div>
                                <div><span className="text-xs text-gray-400 block">ประเภทเงิน</span><span className="text-sm text-white">{selectedActivity.fund_type}</span></div>
                                <div><span className="text-xs text-gray-400 block">งบจัดสรร / คงเหลือ</span><span className="text-sm font-mono text-white">{selectedActivity.allocated.toLocaleString()} / <span className="text-[#98FB98] font-bold">{selectedActivity.remaining.toLocaleString()}</span></span></div>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* ส่วนเพิ่มเติมสำหรับ แบบที่ 2: ขอโอนงบจากกิจกรรมอื่นมาสมทบ */}
                        {/* ========================================================= */}
                        {requestMode === 2 && selectedActivity && (
                            <div className="col-span-12 bg-amber-900/20 border border-amber-500/50 p-5 rounded-xl mt-2">
                                <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                                    <Plus className="w-5 h-5" /> ระบุกิจกรรมต้นทาง ที่จะขอตัดแบ่งเงินมาสมทบ
                                </h3>
                                
                                <div className="space-y-3">
                                    {budgetSources.map((source, index) => (
                                        <div key={source.id} className="flex flex-col lg:flex-row gap-3 p-4 bg-[#0B1528] border border-amber-500/30 rounded-lg">
                                            <div className="flex-1">
                                                <label className="block text-xs text-gray-400 mb-1">เลือกกิจกรรมที่มีงบเหลือ</label>
                                                <select 
                                                    value={source.fromActivityId} 
                                                    onChange={(e) => handleSourceChange(source.id, 'fromActivityId', e.target.value)} 
                                                    className="w-full bg-[#E8F8F5] border border-[#008080] text-[#002B49] rounded px-3 py-2 outline-none font-medium text-sm"
                                                >
                                                    <option value="">-- กิจกรรมต้นทาง --</option>
                                                    {/* ไม่แสดงกิจกรรมที่กำลังดำเนินการอยู่ (ห้ามโอนให้ตัวเอง) */}
                                                    {mockActivities.filter(a => a.id !== formData.activity_id).map(a => 
                                                        <option key={a.id} value={a.id}>[{a.code}] {a.name} (เหลือ {a.remaining.toLocaleString()})</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="w-full lg:w-32">
                                                <label className="block text-xs text-gray-400 mb-1">ประเภทเงิน</label>
                                                <input type="text" readOnly value={source.fundType} className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-400" />
                                            </div>
                                            <div className="w-full lg:w-40 flex items-end gap-2">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-amber-400 mb-1">ยอดเงินที่ขอตัดมา (บาท)</label>
                                                    <input 
                                                        type="number" value={source.amount || ''} 
                                                        onChange={(e) => handleSourceChange(source.id, 'amount', e.target.value)} 
                                                        className="w-full bg-[#002B49] border border-amber-500 rounded px-3 py-2 text-sm text-white text-right outline-none font-bold" 
                                                        placeholder="0" 
                                                    />
                                                </div>
                                                {index > 0 && (
                                                    <button onClick={() => handleRemoveBudgetSource(source.id)} className="p-2 text-gray-500 hover:text-red-400 bg-gray-800 rounded border border-gray-600"><Trash2 className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <div className="flex justify-between items-center mt-2">
                                        <button onClick={handleAddBudgetSource} className="text-sm text-amber-400 hover:text-amber-300 font-bold px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-1">
                                            <Plus className="w-4 h-4" /> เพิ่มกิจกรรมต้นทางอีก
                                        </button>
                                        <div className="text-right text-sm">
                                            รวมวงเงินโอนมาเพิ่ม: <span className="text-xl font-bold text-amber-400 font-mono ml-2">{totalTransferredBudget.toLocaleString()}</span> บาท
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* เหตุผลสำหรับ แบบที่ 3 */}
                        {requestMode === 3 && (
                            <div className="col-span-12 bg-blue-900/20 border border-blue-500/30 p-5 rounded-lg mt-2">
                                <label className="text-sm text-blue-300 font-bold block mb-2">เหตุผลความจำเป็น (เนื่องจาก...)</label>
                                <textarea name="mode3Reason" value={formData.mode3Reason} onChange={handleFormChange} rows={2} placeholder="ระบุเหตุผลที่ต้องจัดกิจกรรมใหม่นอกแผน..." className="w-full bg-[#0B1528] border border-blue-500/50 focus:border-blue-400 text-white rounded p-3 outline-none resize-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ส่วนที่ 2: เป้าหมาย สถานที่ และเวลา (เหมือนเดิมทุกประการ) */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-6 py-3 font-bold text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> 2. กำหนดการและกลุ่มเป้าหมาย (เว้นว่างได้ถ้าไม่มี)
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="md:col-span-1"><label className="text-xs text-gray-400 block mb-1">วันที่เริ่ม</label><input type="date" name="start_date" value={formData.start_date} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 focus:border-[#98FB98] text-white rounded p-2.5 outline-none" /></div>
                        <div className="md:col-span-1"><label className="text-xs text-gray-400 block mb-1">ถึงวันที่</label><input type="date" name="end_date" value={formData.end_date} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 focus:border-[#98FB98] text-white rounded p-2.5 outline-none" /></div>
                        <div className="md:col-span-2"><label className="text-xs text-gray-400 block mb-1">สถานที่จัดกิจกรรม</label><input type="text" name="location" value={formData.location} onChange={handleFormChange} placeholder="ห้องประชุม..." className="w-full bg-[#E8F8F5] border border-[#008080] text-[#002B49] font-bold rounded p-2.5 outline-none" /></div>
                        
                        <div className="md:col-span-4 mt-2 border-t border-gray-700 pt-4"><p className="text-sm text-teal-300 font-bold mb-3">จำนวนผู้เข้าร่วม</p></div>
                        <div><label className="text-xs text-gray-400 block mb-1">ผู้บริหาร</label><input type="number" name="target_executives" value={formData.target_executives} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2 text-center" /></div>
                        <div><label className="text-xs text-gray-400 block mb-1">ครู/บุคลากร</label><input type="number" name="target_teachers" value={formData.target_teachers} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2 text-center" /></div>
                        <div className="flex gap-2 w-full md:col-span-2">
                            <div className="w-1/2"><label className="text-xs text-gray-400 block mb-1">นักเรียน(ระดับชั้น)</label><input type="text" name="target_student_level" value={formData.target_student_level} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2" /></div>
                            <div className="w-1/2"><label className="text-xs text-gray-400 block mb-1">จำนวน(คน)</label><input type="number" name="target_students" value={formData.target_students} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2 text-center" /></div>
                        </div>
                    </div>
                </div>

                {/* ส่วนที่ 3: ประมาณการค่าใช้จ่าย */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl relative">
                    <div className="bg-[#008080] px-6 py-3 font-bold text-white flex justify-between items-center">
                        <div className="flex items-center gap-2"><Building className="w-5 h-5" /> 3. รายละเอียดประมาณการค่าใช้จ่าย</div>
                        <div className="text-sm bg-[#002B49] px-3 py-1 rounded text-[#98FB98]">ขอใช้ครั้งที่ <input type="number" name="request_iteration" value={formData.request_iteration} onChange={handleFormChange} className="w-12 bg-transparent text-center border-b border-[#98FB98] outline-none" /></div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#001f3f] text-[#98FB98] border-b-2 border-[#008080]">
                                <tr>
                                    <th className="px-4 py-3 text-center w-12">ที่</th>
                                    <th className="px-4 py-3">รายการ (พัสดุ/การเงิน)</th>
                                    <th className="px-2 py-3 text-center w-24">จำนวน</th>
                                    <th className="px-2 py-3 text-center w-24">วัน/มื้อ/ห้อง</th>
                                    <th className="px-4 py-3 text-right w-32">ราคา/อัตรา</th>
                                    <th className="px-4 py-3 text-right w-32">รวมเงิน</th>
                                    <th className="px-4 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 bg-[#0B1528]">
                                {expenses.map((exp, index) => (
                                    <tr key={exp.id}>
                                        <td className="px-4 py-2 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-2 py-2"><input type="text" value={exp.item_name} onChange={e => handleExpenseChange(exp.id, 'item_name', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-semibold px-3 py-2 rounded outline-none" /></td>
                                        <td className="px-2 py-2"><input type="number" value={exp.pax_count} onChange={e => handleExpenseChange(exp.id, 'pax_count', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-2 rounded text-center outline-none" /></td>
                                        <td className="px-2 py-2">{exp.expense_type !== 'MATERIAL' && exp.expense_type !== 'TRANSPORT' ? <input type="number" value={exp.day_or_room_count} onChange={e => handleExpenseChange(exp.id, 'day_or_room_count', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-2 rounded text-center outline-none" /> : <div className="text-center text-gray-600">-</div>}</td>
                                        <td className="px-2 py-2"><input type="number" value={exp.unit_price} onChange={e => handleExpenseChange(exp.id, 'unit_price', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-2 rounded text-right outline-none" /></td>
                                        <td className="px-4 py-2 text-right font-mono text-[#98FB98] font-bold text-base bg-[#001f3f]/50">{exp.total.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                        <td className="px-4 py-2 text-center"><button onClick={() => removeExpense(exp.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#001f3f] border-t-2 border-[#008080]">
                                <tr>
                                    <td colSpan={5} className="px-4 py-4 text-right font-bold text-white text-lg">รวมวงเงินที่ขอใช้ครั้งนี้</td>
                                    <td className="px-4 py-4 text-right font-bold text-[#98FB98] font-mono text-xl">{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    
                    <div className="p-4 bg-[#0B1528] flex flex-wrap gap-2">
                        <button onClick={() => handleAddExpense('ALLOWANCE')} className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800 border border-blue-500/50 text-blue-300 text-sm rounded-lg flex items-center gap-1"><Plus className="w-4 h-4"/> ค่าเบี้ยเลี้ยง/อาหาร</button>
                        <button onClick={() => handleAddExpense('TRANSPORT')} className="px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-300 text-sm rounded-lg flex items-center gap-1"><Plus className="w-4 h-4"/> ค่าพาหนะ</button>
                        <button onClick={() => handleAddExpense('ACCOMMODATION')} className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800 border border-purple-500/50 text-purple-300 text-sm rounded-lg flex items-center gap-1"><Plus className="w-4 h-4"/> ค่าที่พัก</button>
                        <button onClick={() => handleAddExpense('CONTRACT')} className="px-3 py-1.5 bg-amber-900/50 hover:bg-amber-800 border border-amber-500/50 text-amber-300 text-sm rounded-lg flex items-center gap-1"><Plus className="w-4 h-4"/> ค่าจ้างเหมา</button>
                        <button onClick={() => handleAddExpense('MATERIAL')} className="px-3 py-1.5 bg-teal-900/50 hover:bg-teal-800 border border-teal-500/50 text-teal-300 text-sm rounded-lg flex items-center gap-1 ml-auto"><Plus className="w-4 h-4"/> ค่าวัสดุ (พัสดุ)</button>
                    </div>

                    {hasProcurement && (
                        <div className="bg-amber-900/30 border-t border-amber-500/30 p-3 flex items-start gap-2 text-sm text-amber-300">
                            <Info className="w-5 h-5 shrink-0 mt-0.5" />
                            <p><b>ข้อควรระวัง:</b> เนื่องจากมีรายการเบิกจ่ายที่อิงตามระเบียบพัสดุ กรุณาตรวจสอบให้แน่ใจว่าได้ระบุรายการวัสดุ (พัสดุ) ครบถ้วนแล้ว</p>
                        </div>
                    )}
                </div>

                {/* ส่วนที่ 4: เส้นทางการเสนอเรื่อง (Dynamic Routing) */}
                <div className="bg-[#0B1528] border border-gray-700 rounded-xl p-6">
                    <h3 className="text-[#98FB98] font-bold mb-4">เส้นทางการเสนอเรื่อง (Approval Routing) อิงตามตำแหน่งผู้เบิก</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                        <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">หัวหน้า{currentUserInfo.sub_dept_name}</div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                        <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">หัวหน้า{currentUserInfo.dept_name}</div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                        <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">รองผู้อำนวยการ{currentUserInfo.dept_name}</div>
                        
                        <div className="w-full h-px bg-gray-700 my-2"></div>

                        <div className="px-3 py-2 bg-amber-900/30 rounded border border-amber-500 text-amber-400 font-bold shadow-[0_0_10px_rgba(245,158,11,0.1)]">งานแผนงาน (ลงรับเรื่อง)</div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                        <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">หัวหน้ากลุ่มบริหารงบประมาณ</div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                        <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">รองผู้อำนวยการกลุ่มบริหารงบประมาณ</div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-[#98FB98]" />
                        <div className="px-3 py-2 bg-[#008080] rounded border border-[#98FB98] text-white font-bold shadow-lg">ผู้อำนวยการโรงเรียน (อนุมัติ)</div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={() => setIsSavingDraft(true)} className="px-6 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700">
                        {isSavingDraft ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                    </button>
                    <button type="button" className="flex items-center gap-2 bg-[#008080] hover:bg-[#006666] text-white px-8 py-3 rounded-lg font-bold shadow-lg transition-all border border-[#98FB98]">
                        <CheckCircle2 className="w-5 h-5" /> สร้างบันทึกและส่งอนุมัติ
                    </button>
                </div>

            </main>
        </div>
    )
}