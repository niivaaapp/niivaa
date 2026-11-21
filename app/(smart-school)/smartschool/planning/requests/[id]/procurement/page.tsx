'use client'

// === บล็อกที่ 1: IMPORTS ===
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Save, FileText, Users, ShieldCheck,
    Building2, HardHat, CheckCircle2, AlertCircle, Package, CalendarClock
} from 'lucide-react'
import { getProcurementSetupData, saveProcurementData } from './actions'

export default function ProcurementSetupPage() {
    const params = useParams()
    const router = useRouter()
    const requestId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [master, setMaster] = useState<any>(null)
    const [procurementId, setProcurementId] = useState<string | null>(null)

    const today = new Date().toISOString().split('T')[0]


    // === บล็อกที่ 2: FORM STATES ===
    const [form, setForm] = useState({
        procurement_type: 'BUY',       // BUY | HIRE | CONSTRUCTION
        is_wor_119: false,
        procurement_method: 'SPECIFIC',
        price_source: 'STANDARD',
        median_price: 0,
        total_budget: 0,
        reason_text: '',
        delivery_due_date: '',
        consider_days: 2,
        inspect_days: 5,
        inspector_type: 'COMMITTEE',   // SINGLE | COMMITTEE
        officer_emp_code: '',
        head_officer_emp_code: '',

        // ข้อมูลเลขที่และวันที่ (เรียงตามลำดับเวลา)
        median_order_no: '',
        median_order_date: today,      // 1. คำสั่งกำหนดราคากลาง (เฉพาะก่อสร้าง)
        median_report_date: today,     // 2. รายงานกำหนดราคากลาง (เฉพาะก่อสร้าง)
        report_no: '',
        report_date: today,            // 3. รายงานขอซื้อขอจ้าง
        order_no: '',
        order_date: today              // 4. คำสั่งแต่งตั้งคณะกรรมการจัดซื้อจัดจ้าง
    })

    // รายชื่อคณะกรรมการ 4 กลุ่ม
    const [medianComm, setMedianComm] = useState(['', '', ''])     // คณะกรรมการกำหนดราคากลาง (3 คน - เฉพาะก่อสร้าง)
    const [purchaseComm, setPurchaseComm] = useState(['', '', '']) // คณะกรรมการจัดซื้อจัดจ้าง (3 คน - ทุกกรณี)
    const [supervisors, setSupervisors] = useState(['', ''])       // ผู้ควบคุมงาน (1-2 คน - เฉพาะก่อสร้าง)
    const [inspectComm, setInspectComm] = useState(['', '', ''])   // ตรวจรับพัสดุ (1 หรือ 3 คน - ทุกกรณี)

    const isConstruction = form.procurement_type === 'CONSTRUCTION'
    const isOver100k = Number(form.total_budget) > 100000

    // === บล็อกที่ 3: ลอจิกควบคุมลำดับวันที่ (ไม่ให้ย้อนสลับกัน) ===
    const handleDateChange = (
        field: 'median_order_date' | 'median_report_date' | 'report_date' | 'order_date',
        value: string
    ) => {
        if (!value) return
        setForm(prev => {
            const next = { ...prev, [field]: value }
            if (prev.procurement_type === 'CONSTRUCTION') {
                // ลำดับ: median_order_date <= median_report_date <= report_date <= order_date
                if (field === 'median_order_date') {
                    if (next.median_report_date < value) next.median_report_date = value
                    if (next.report_date < next.median_report_date) next.report_date = next.median_report_date
                    if (next.order_date < next.report_date) next.order_date = next.report_date
                } else if (field === 'median_report_date') {
                    if (value < next.median_order_date) next.median_report_date = next.median_order_date
                    if (next.report_date < next.median_report_date) next.report_date = next.median_report_date
                    if (next.order_date < next.report_date) next.order_date = next.report_date
                } else if (field === 'report_date') {
                    if (value < next.median_report_date) next.report_date = next.median_report_date
                    if (next.order_date < next.report_date) next.order_date = next.report_date
                } else if (field === 'order_date') {
                    if (value < next.report_date) next.order_date = next.report_date
                }
            } else {
                // ลำดับทั่วไป: report_date <= order_date
                if (field === 'report_date' && next.order_date < value) {
                    next.order_date = value
                } else if (field === 'order_date' && value < next.report_date) {
                    next.order_date = next.report_date
                }
            }
            return next
        })
    }

    // === บล็อกที่ 4: โหลดข้อมูลตั้งต้นจากฐานข้อมูล ===
    useEffect(() => {
        const load = async () => {
            if (!requestId) return
            const res = await getProcurementSetupData(requestId)
            if (res.success && res.data) {
                setMaster(res.data)
                const { req, activity, materials, employees, existingProcurement, existingCommittees } = res.data
                const matTotal = materials.reduce((sum: number, m: any) => sum + Number(m.total_price || 0), 0)

                const defaultOfficer = employees.find((e: any) => (e.role_name || '').includes('พัสดุ'))?.emp_code || ''
                const defaultHead = employees.find((e: any) => (e.role_name || '').includes('หัวหน้าเจ้าหน้าที่'))?.emp_code || ''

                if (existingProcurement) {
                    setProcurementId(existingProcurement.id)
                    setForm({
                        procurement_type: existingProcurement.procurement_type || 'BUY',
                        is_wor_119: Boolean(existingProcurement.is_wor_119),
                        procurement_method: existingProcurement.procurement_method || 'SPECIFIC',
                        price_source: existingProcurement.price_source || 'STANDARD',
                        median_price: Number(existingProcurement.median_price) || matTotal,
                        total_budget: Number(existingProcurement.total_budget) || matTotal,
                        reason_text: existingProcurement.reason_text || `เพื่อใช้ในกิจกรรม${activity?.activity_name || ''}`,
                        delivery_due_date: existingProcurement.delivery_due_date || req.start_date || '',
                        consider_days: existingProcurement.consider_days || 2,
                        inspect_days: existingProcurement.inspect_days || 5,
                        inspector_type: existingProcurement.inspector_type || (matTotal > 100000 ? 'COMMITTEE' : 'SINGLE'),
                        officer_emp_code: existingProcurement.officer_emp_code || defaultOfficer,
                        head_officer_emp_code: existingProcurement.head_officer_emp_code || defaultHead,
                        median_order_no: existingProcurement.median_order_no || '',
                        median_order_date: existingProcurement.median_order_date || today,
                        median_report_date: existingProcurement.median_report_date || existingProcurement.median_order_date || today,
                        report_no: existingProcurement.report_no || '',
                        report_date: existingProcurement.report_date || today,
                        order_no: existingProcurement.order_no || '',
                        order_date: existingProcurement.order_date || existingProcurement.report_date || today
                    })

                    const mList = existingCommittees.filter((c: any) => c.committee_group === 'MEDIAN_PRICE_COMMITTEE').map((c: any) => c.emp_code)
                    const pList = existingCommittees.filter((c: any) => c.committee_group === 'PURCHASE_COMMITTEE').map((c: any) => c.emp_code)
                    const sList = existingCommittees.filter((c: any) => c.committee_group === 'SUPERVISOR').map((c: any) => c.emp_code)
                    const iList = existingCommittees.filter((c: any) => c.committee_group === 'INSPECTION').map((c: any) => c.emp_code)

                    setMedianComm([mList[0] || '', mList[1] || '', mList[2] || ''])
                    setPurchaseComm([pList[0] || '', pList[1] || '', pList[2] || ''])
                    setSupervisors([sList[0] || '', sList[1] || ''])
                    setInspectComm([iList[0] || '', iList[1] || '', iList[2] || ''])
                } else {
                    setForm(prev => ({
                        ...prev,
                        median_price: matTotal,
                        total_budget: matTotal,
                        reason_text: `เพื่อใช้ในกิจกรรม${activity?.activity_name || ''}`,
                        delivery_due_date: req.start_date || '',
                        inspector_type: matTotal > 100000 ? 'COMMITTEE' : 'SINGLE',
                        officer_emp_code: defaultOfficer,
                        head_officer_emp_code: defaultHead
                    }))
                }
            } else {
                alert('ไม่สามารถโหลดข้อมูลได้: ' + res.error)
            }
            setIsLoading(false)
        }
        load()
    }, [requestId])

    // === บล็อกที่ 5: ฟังก์ชันบันทึกข้อมูล ===
    const handleSave = async () => {
        if (!purchaseComm[0] || !purchaseComm[1] || !purchaseComm[2]) {
            return alert('กรุณาระบุรายชื่อคณะกรรมการจัดซื้อจัดจ้างให้ครบ 3 ท่าน')
        }
        if (isConstruction) {
            if (!medianComm[0] || !medianComm[1] || !medianComm[2]) {
                return alert('กรุณาระบุรายชื่อคณะกรรมการกำหนดราคากลางให้ครบ 3 ท่าน')
            }
            if (!supervisors[0]) {
                return alert('กรุณาระบุรายชื่อผู้ควบคุมงานอย่างน้อย 1 ท่าน')
            }
        }
        if (!inspectComm[0]) return alert('กรุณาระบุชื่อผู้ตรวจรับพัสดุ / ประธานกรรมการตรวจรับ')
        if (form.inspector_type === 'COMMITTEE' && (!inspectComm[1] || !inspectComm[2])) {
            return alert('กรุณาระบุรายชื่อคณะกรรมการตรวจรับพัสดุให้ครบ 3 ท่าน')
        }

        setIsSaving(true)
        try {
            const committees: any[] = []

            // 1. คณะกรรมการกำหนดราคากลาง (เฉพาะงานก่อสร้าง)
            if (isConstruction) {
                medianComm.forEach((emp_code, idx) => {
                    if (emp_code) {
                        committees.push({
                            committee_group: 'MEDIAN_PRICE_COMMITTEE',
                            emp_code,
                            role_in_committee: idx === 0 ? 'CHAIRMAN' : 'MEMBER',
                            seq_no: idx + 1
                        })
                    }
                })
            }

            // 2. คณะกรรมการจัดซื้อจัดจ้าง 3 คน (ทุกกรณี)
            purchaseComm.forEach((emp_code, idx) => {
                if (emp_code) {
                    committees.push({
                        committee_group: 'PURCHASE_COMMITTEE',
                        emp_code,
                        role_in_committee: idx === 0 ? 'CHAIRMAN' : 'MEMBER',
                        seq_no: idx + 1
                    })
                }
            })

            // 3. ผู้ควบคุมงาน 1-2 คน (เฉพาะงานก่อสร้าง)
            if (isConstruction) {
                supervisors.forEach((emp_code, idx) => {
                    if (emp_code) {
                        committees.push({
                            committee_group: 'SUPERVISOR',
                            emp_code,
                            role_in_committee: 'SUPERVISOR',
                            seq_no: idx + 1
                        })
                    }
                })
            }

            // 4. ผู้ตรวจรับ / คณะกรรมการตรวจรับพัสดุ (ทุกกรณี)
            if (form.inspector_type === 'SINGLE') {
                committees.push({
                    committee_group: 'INSPECTION',
                    emp_code: inspectComm[0],
                    role_in_committee: 'SINGLE_INSPECTOR',
                    seq_no: 1
                })
            } else {
                inspectComm.forEach((emp_code, idx) => {
                    if (emp_code) {
                        committees.push({
                            committee_group: 'INSPECTION',
                            emp_code,
                            role_in_committee: idx === 0 ? 'CHAIRMAN' : 'MEMBER',
                            seq_no: idx + 1
                        })
                    }
                })
            }

            const officerEmp = (master?.employees || []).find((e: any) => e.emp_code === form.officer_emp_code)
            const ownerName = officerEmp ? `${officerEmp.prefix || ''}${officerEmp.first_name} ${officerEmp.last_name}` : '-'

            const res = await saveProcurementData({
                procurementId,
                schoolId: master.req.school_id,
                requestId,
                form,
                committees,
                meta: {
                    activityName: master?.activity?.activity_name || '-',
                    subdepartmentName: master?.deptInfo?.subdepartment_name || 'งานพัสดุ',
                    departmentName: master?.deptInfo?.department_name || 'กลุ่มบริหารงบประมาณ',
                    ownerName
                }
            })

            if (res.success) {
                setProcurementId(res.id)
                alert('บันทึกข้อมูลเรียบร้อยแล้ว!')
                router.push(`/smartschool/planning/requests/${requestId}/procurement/preview`)
            } else {
                alert('บันทึกไม่สำเร็จ: ' + res.error)
            }
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังโหลดข้อมูลงานพัสดุ...</div>
    }

    const employees = master?.employees || []
    const materials = master?.materials || []

    return (
        <div className="min-h-screen bg-[#0B1528] text-white p-4 md:p-6 font-sans pb-20">
            {/* === บล็อกที่ 6: HEADER พร้อมโลโก้ NiiVaa SmartSchool === */}
            <header className="max-w-5xl mx-auto mb-6 bg-[#002B49] p-4 rounded-xl shadow-lg border-b-4 border-[#008080] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-[#0B1528] px-3 py-2 rounded-lg border border-teal-500/50 shadow-inner">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-[#008080] flex items-center justify-center font-black text-[#0B1528] text-lg shadow">
                            N
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-black tracking-wide text-white">NiiVaa</div>
                            <div className="text-[11px] font-bold text-[#98FB98] tracking-wider">SmartSchool</div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#98FB98]" /> ตั้งค่ารายงานขอซื้อขอจ้าง &amp; คำสั่งแต่งตั้งคณะกรรมการ
                        </h1>
                        <p className="text-xs md:text-sm text-teal-300 mt-0.5">
                            กิจกรรม: <span className="text-white font-bold">{master?.activity?.activity_name || '-'}</span> | วงเงินพัสดุ:{' '}
                            <span className="text-[#98FB98] font-mono font-bold">{Number(form.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span>
                        </p>
                    </div>
                </div>
                <Link
                    href={`/smartschool/planning/requests/${requestId}`}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-600 flex items-center gap-1 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> กลับหน้าบันทึกขออนุมัติ
                </Link>
            </header>

            <main className="max-w-5xl mx-auto space-y-6">

                {/* === ข้อ 1: ประเภทการจัดซื้อจัดจ้าง & ว 119 === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-5 py-3 font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> 1. ประเภทและเงื่อนไขการจัดซื้อจัดจ้าง
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                { val: 'BUY', label: 'จัดซื้อวัสดุ/พัสดุทั่วไป', desc: 'รายงานขอซื้อ → คำสั่งแต่งตั้งคณะกรรมการ' },
                                { val: 'HIRE', label: 'จ้างเหมาบริการ (มิใช่งานก่อสร้าง)', desc: 'รายงานขอจ้าง → คำสั่งแต่งตั้งคณะกรรมการ' },
                                { val: 'CONSTRUCTION', label: 'จัดจ้างงานก่อสร้าง', desc: 'แต่งตั้ง กก.ราคากลาง → รายงานราคากลาง → รายงานขอจ้าง → คำสั่งจัดจ้าง' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    type="button"
                                    onClick={() => setForm({ ...form, procurement_type: opt.val })}
                                    className={`p-3.5 rounded-lg border text-left transition-all ${form.procurement_type === opt.val
                                        ? 'bg-teal-900/50 border-[#98FB98] text-white shadow'
                                        : 'bg-[#0B1528] border-gray-700 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    <div className="font-bold text-sm flex items-center gap-2">
                                        {opt.val === 'CONSTRUCTION' && <HardHat className="w-4 h-4 text-amber-400" />}
                                        {opt.label}
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-1">{opt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="bg-[#0B1528] p-3.5 rounded-lg border border-amber-500/40 flex items-center gap-3">
                            <input
                                id="wor119"
                                type="checkbox"
                                checked={form.is_wor_119}
                                onChange={e => setForm({ ...form, is_wor_119: e.target.checked })}
                                className="w-5 h-5 accent-amber-500 cursor-pointer"
                            />
                            <label htmlFor="wor119" className="cursor-pointer text-sm">
                                <span className="font-bold text-amber-400">เป็นการจัดซื้อจัดจ้างตามหนังสือเวียน ว 119</span>
                                <span className="text-xs text-gray-400 ml-2">(ระบบจะปรับข้อความอ้างอิงตามแนวทาง ว 119 ในรายงาน)</span>
                            </label>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 block mb-1">วิธีจัดซื้อจัดจ้าง (ตาม พ.ร.บ. 2560)</label>
                            <select
                                value={form.procurement_method}
                                onChange={e => setForm({ ...form, procurement_method: e.target.value })}
                                className="w-full bg-[#0B1528] border border-teal-500/60 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]"
                            >
                                <option value="SPECIFIC">วิธีเฉพาะเจาะจง</option>
                                <option value="E_MARKET">วิธีตลาดอิเล็กทรอนิกส์ (e-market)</option>
                                <option value="E_BIDDING">วิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)</option>
                                <option value="SELECTION">วิธีคัดเลือก</option>
                            </select>
                        </div>
                    </div>

                </section>

                {/* === ข้อ 2: ข้อมูลเอกสาร เลขที่ และลำดับวันที่ (ควบคุมไม่ให้ย้อนหลัง) === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-5 py-3 font-bold text-white flex items-center justify-between">
                        <div className="flex items-center gap-2"><Building2 className="w-5 h-5" /> 2. ข้อมูลรายงานขอซื้อขอจ้าง &amp; ลำดับวันที่เอกสาร</div>
                        <span className="text-xs font-normal text-teal-100 flex items-center gap-1"><CalendarClock className="w-4 h-4" /> ระบบควบคุมวันที่ไม่ให้ย้อนลำดับอัตโนมัติ</span>
                    </div>
                    <div className="p-5 space-y-4">
                        {/* แถบแสดงลำดับวันที่ */}
                        <div className="bg-[#0B1528] p-4 rounded-lg border border-teal-500/30">
                            <div className="text-xs font-bold text-teal-300 mb-3">
                                ลำดับวันที่เอกสาร: {isConstruction
                                    ? '1) คำสั่ง กก.ราคากลาง  →  2) รายงานกำหนดราคากลาง  →  3) รายงานขอซื้อขอจ้าง  →  4) คำสั่งแต่งตั้ง กก.จัดซื้อจัดจ้าง'
                                    : '1) รายงานขอซื้อขอจ้าง  →  2) คำสั่งแต่งตั้ง กก.จัดซื้อจัดจ้าง'}
                            </div>
                            <div className={`grid grid-cols-1 ${isConstruction ? 'md:grid-cols-4' : 'md:grid-cols-2'} gap-3`}>
                                {isConstruction && (
                                    <>
                                        <div>
                                            <label className="text-xs text-amber-300 block mb-1">1. วันที่คำสั่ง กก.ราคากลาง</label>
                                            <input type="date" value={form.median_order_date} onChange={e => handleDateChange('median_order_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold border border-amber-500 rounded px-3 py-2 text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-amber-300 block mb-1">2. วันที่รายงานกำหนดราคากลาง</label>
                                            <input type="date" min={form.median_order_date} value={form.median_report_date} onChange={e => handleDateChange('median_report_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold border border-amber-500 rounded px-3 py-2 text-sm outline-none" />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="text-xs text-teal-300 block mb-1">{isConstruction ? '3.' : '1.'} วันที่รายงานขอซื้อขอจ้าง</label>
                                    <input type="date" min={isConstruction ? form.median_report_date : undefined} value={form.report_date} onChange={e => handleDateChange('report_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold border border-[#008080] rounded px-3 py-2 text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-teal-300 block mb-1">{isConstruction ? '4.' : '2.'} วันที่คำสั่งแต่งตั้ง กก.จัดซื้อจัดจ้าง</label>
                                    <input type="date" min={form.report_date} value={form.order_date} onChange={e => handleDateChange('order_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold border border-[#008080] rounded px-3 py-2 text-sm outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* เลขที่เอกสาร และรายละเอียด */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">เลขที่รายงานขอซื้อขอจ้าง</label>
                                <input type="text" value={form.report_no} onChange={e => setForm({ ...form, report_no: e.target.value })} placeholder="งปม. ..." className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">เลขที่คำสั่งแต่งตั้ง กก.จัดซื้อฯ</label>
                                <input type="text" value={form.order_no} onChange={e => setForm({ ...form, order_no: e.target.value })} placeholder=".../2569" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">กำหนดแล้วเสร็จภายในวันที่ (ข้อ 5)</label>
                                <input type="date" value={form.delivery_due_date} onChange={e => setForm({ ...form, delivery_due_date: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">แหล่งที่มาของราคาในตาราง</label>
                                <select value={form.price_source} onChange={e => setForm({ ...form, price_source: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none">
                                    <option value="STANDARD">ราคามาตรฐาน</option>
                                    <option value="PREVIOUS_HIRE">ราคาที่เคยซื้อ/เคยจ้าง</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-300 block mb-1">เหตุผลและความจำเป็น (ข้อ 1)</label>
                                <input type="text" value={form.reason_text} onChange={e => setForm({ ...form, reason_text: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">เจ้าหน้าที่พัสดุ</label>
                                <select value={form.officer_emp_code} onChange={e => setForm({ ...form, officer_emp_code: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none">
                                    <option value="">-- เลือกเจ้าหน้าที่ --</option>
                                    {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">หัวหน้าเจ้าหน้าที่</label>
                                <select value={form.head_officer_emp_code} onChange={e => setForm({ ...form, head_officer_emp_code: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none">
                                    <option value="">-- เลือกหัวหน้าเจ้าหน้าที่ --</option>
                                    {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* === ข้อ 3 (เฉพาะงานก่อสร้าง): การแต่งตั้งคณะกรรมการกำหนดราคากลาง 3 คน === */}
                {isConstruction && (
                    <section className="bg-[#002B49] border border-amber-500/60 rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-amber-700/90 px-5 py-3 font-bold text-white flex items-center gap-2">
                            <HardHat className="w-5 h-5" /> 3. การแต่งตั้งคณะกรรมการกำหนดราคากลาง (เฉพาะงานก่อสร้าง)
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-amber-200 block mb-1">เลขที่คำสั่งแต่งตั้ง กก.กำหนดราคากลาง</label>
                                    <input type="text" value={form.median_order_no} onChange={e => setForm({ ...form, median_order_no: e.target.value })} placeholder=".../2569" className="w-full bg-[#0B1528] border border-amber-500/60 rounded px-3 py-2 text-sm text-white outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0B1528] p-4 rounded-lg border border-amber-500/30">
                                {['ประธานกรรมการกำหนดราคากลาง', 'กรรมการ (คนที่ 1)', 'กรรมการ (คนที่ 2)'].map((roleLabel, idx) => (
                                    <div key={idx}>
                                        <label className="text-xs text-amber-300 block mb-1">{roleLabel}</label>
                                        <select
                                            value={medianComm[idx]}
                                            onChange={e => {
                                                const updated = [...medianComm]
                                                updated[idx] = e.target.value
                                                setMedianComm(updated)
                                            }}
                                            className="w-full bg-[#001f3f] border border-amber-500/50 rounded px-3 py-2 text-sm text-white outline-none"
                                        >
                                            <option value="">-- เลือกบุคลากร --</option>
                                            {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* === ข้อ 4 (ก่อสร้าง) / ข้อ 3 (ทั่วไป): คำสั่งแต่งตั้งคณะกรรมการจัดซื้อจัดจ้าง === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-teal-800 px-5 py-3 font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5" /> {isConstruction ? '4.' : '3.'} การแต่งตั้งคณะกรรมการจัดซื้อจัดจ้าง
                    </div>
                    <div className="p-5 space-y-5">

                        {/* ส่วนที่ 1: คณะกรรมการจัดซื้อจัดจ้าง 3 คน (ต้องมีทุกกรณี) */}
                        <div className="bg-[#0B1528] p-4 rounded-lg border border-gray-700">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                                <h3 className="text-sm font-bold text-amber-400">ส่วนที่ 1: คณะกรรมการจัดซื้อจัดจ้าง (3 ท่าน)</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <span>พิจารณาผลเสนอราคาภายใน</span>
                                    <input type="number" value={form.consider_days} onChange={e => setForm({ ...form, consider_days: Number(e.target.value) })} className="w-14 bg-[#001f3f] border border-gray-600 rounded px-2 py-1 text-center text-white" />
                                    <span>วัน</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {['ประธานกรรมการ', 'กรรมการ (คนที่ 1)', 'กรรมการ (คนที่ 2)'].map((roleLabel, idx) => (
                                    <div key={idx}>
                                        <label className="text-xs text-gray-400 block mb-1">{roleLabel}</label>
                                        <select
                                            value={purchaseComm[idx]}
                                            onChange={e => {
                                                const updated = [...purchaseComm]
                                                updated[idx] = e.target.value
                                                setPurchaseComm(updated)
                                            }}
                                            className="w-full bg-[#001f3f] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
                                        >
                                            <option value="">-- เลือกบุคลากร --</option>
                                            {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ส่วนที่ 2 (เฉพาะงานก่อสร้าง): ผู้ควบคุมงาน (รองรับ 1-2 คน) */}
                        {isConstruction && (
                            <div className="bg-amber-900/20 p-4 rounded-lg border border-amber-500/40">
                                <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                                    <HardHat className="w-4 h-4" /> ส่วนที่ 2: ผู้ควบคุมงาน (รองรับ 1-2 ท่าน - เฉพาะงานก่อสร้าง)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['ผู้ควบคุมงาน (คนที่ 1 - จำเป็น)', 'ผู้ควบคุมงาน (คนที่ 2 - ถ้ามี)'].map((roleLabel, idx) => (
                                        <div key={idx}>
                                            <label className="text-xs text-amber-200/80 block mb-1">{roleLabel}</label>
                                            <select
                                                value={supervisors[idx]}
                                                onChange={e => {
                                                    const updated = [...supervisors]
                                                    updated[idx] = e.target.value
                                                    setSupervisors(updated)
                                                }}
                                                className="w-full bg-[#0B1528] border border-amber-500/60 rounded px-3 py-2 text-sm text-white outline-none"
                                            >
                                                <option value="">-- เลือกบุคลากร --</option>
                                                {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ส่วนที่ 3 (ก่อสร้าง) / ส่วนที่ 2 (ทั่วไป): ตรวจรับพัสดุ + ปุ่มเลือก 1 คน / 3 คน ใกล้จุดเลือกรายชื่อ */}
                        <div className="bg-[#0B1528] p-4 rounded-lg border border-teal-500/40 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-[#98FB98]">
                                        ส่วนที่ {isConstruction ? '3' : '2'}: การแต่งตั้งคณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับพัสดุ
                                    </h3>
                                    {isOver100k && <span className="text-xs text-amber-400">* วงเงินเกิน 100,000 บาท บังคับแต่งตั้งคณะกรรมการ 3 ท่าน</span>}
                                </div>

                                {/* กล่องเลือก 1 คน / 3 คน วางติดกับจุดเลือกรายชื่อ */}
                                <div className="flex items-center gap-2 bg-[#001f3f] p-1 rounded-lg border border-teal-600/50">
                                    <button
                                        type="button"
                                        disabled={isOver100k}
                                        onClick={() => setForm({ ...form, inspector_type: 'SINGLE' })}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all disabled:opacity-40 ${form.inspector_type === 'SINGLE' ? 'bg-[#008080] text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        ผู้ตรวจรับพัสดุ (1 คน)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, inspector_type: 'COMMITTEE' })}
                                        className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${form.inspector_type === 'COMMITTEE' ? 'bg-[#008080] text-white shadow' : 'text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        คณะกรรมการตรวจรับ (3 คน)
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(form.inspector_type === 'SINGLE'
                                    ? ['ผู้ตรวจรับพัสดุ']
                                    : ['ประธานกรรมการตรวจรับพัสดุ', 'กรรมการตรวจรับ (คนที่ 1)', 'กรรมการตรวจรับ (คนที่ 2)']
                                ).map((roleLabel, idx) => (
                                    <div key={idx}>
                                        <label className="text-xs text-gray-400 block mb-1">{roleLabel}</label>
                                        <select
                                            value={inspectComm[idx]}
                                            onChange={e => {
                                                const updated = [...inspectComm]
                                                updated[idx] = e.target.value
                                                setInspectComm(updated)
                                            }}
                                            className="w-full bg-[#001f3f] border border-teal-600/60 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]"
                                        >
                                            <option value="">-- เลือกบุคลากร --</option>
                                            {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                                <span>กำหนดระยะเวลาตรวจรับพัสดุให้แล้วเสร็จภายใน</span>
                                <input type="number" value={form.inspect_days} onChange={e => setForm({ ...form, inspect_days: Number(e.target.value) })} className="w-14 bg-[#001f3f] border border-gray-600 rounded px-2 py-1 text-center text-white" />
                                <span>วัน นับถัดจากวันส่งมอบ</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* === สรุปรายการพัสดุ === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl p-5 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-teal-300 text-sm flex items-center gap-2">
                            <Package className="w-4 h-4" /> รายการพัสดุจากบันทึกขออนุมัติ ({materials.length} รายการ)
                        </h3>
                        <span className="font-mono font-bold text-[#98FB98]">
                            รวม {Number(form.total_budget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                        </span>
                    </div>
                    {materials.length === 0 ? (
                        <div className="text-sm text-amber-400 flex items-center gap-2 bg-amber-900/20 p-3 rounded border border-amber-500/30">
                            <AlertCircle className="w-4 h-4" /> ไม่พบรายการพัสดุในบันทึกขออนุมัตินี้
                        </div>
                    ) : (
                        <div className="text-xs text-gray-300 max-h-40 overflow-y-auto bg-[#0B1528] rounded p-3 space-y-1">
                            {materials.map((m: any, i: number) => (
                                <div key={m.id} className="flex justify-between border-b border-gray-800 pb-1">
                                    <span>{i + 1}. {m.item_name} ({m.qty_a} {m.unit_a})</span>
                                    <span className="font-mono text-teal-300">{Number(m.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บ.</span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ปุ่มบันทึก */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-[#008080] hover:bg-[#006666] disabled:opacity-50 text-white font-bold rounded-lg shadow-lg border border-[#98FB98] flex items-center gap-2 transition-all"
                    >
                        {isSaving ? <Save className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกและไปหน้า Print Preview (รายงาน + คำสั่ง)'}
                    </button>
                </div>
            </main>
        </div>
    )
}