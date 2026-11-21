'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Store, Plus, CalendarClock, Sparkles, FileCheck2,
    Save, CheckCircle2, X, Receipt, Shield
} from 'lucide-react'
import { getExecutionSetupData, createVendor, saveExecutionData } from './actions'

// ฟังก์ชันบวกวันทำการ (ข้ามเสาร์-อาทิตย์)
const addBusinessDays = (startDateStr: string, daysToAdd: number): string => {
    const d = new Date(startDateStr)
    let added = 0
    while (added < daysToAdd) {
        d.setDate(d.getDate() + 1)
        if (d.getDay() !== 0 && d.getDay() !== 6) added++
    }
    return d.toISOString().split('T')[0]
}

// ฟังก์ชันคำนวณ VAT และยอดสุทธิ
const calculateVat = (amount: number, mode: string) => {
    if (mode === 'INCLUDE_7') {
        const vat = Number(((amount * 7) / 107).toFixed(2))
        return { vat_amount: vat, net_amount: amount }
    }
    if (mode === 'EXCLUDE_7') {
        const vat = Number((amount * 0.07).toFixed(2))
        return { vat_amount: vat, net_amount: Number((amount + vat).toFixed(2)) }
    }
    return { vat_amount: 0, net_amount: amount }
}

export default function ProcurementExecutionPage() {
    const params = useParams()
    const router = useRouter()
    const requestId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [master, setMaster] = useState<any>(null)
    const [vendors, setVendors] = useState<any[]>([])

    // Modal เพิ่มร้านค้าใหม่
    const [showVendorModal, setShowVendorModal] = useState(false)
    const [newVendor, setNewVendor] = useState({
        vendor_name: '', vendor_type: 'SHOP', tax_id: '', address: '', phone: '',
        bank_name: '', bank_account_no: '', bank_account_name: '', is_vat_registered: false
    })

    const today = new Date().toISOString().split('T')[0]

    const [form, setForm] = useState({
        vendor_id: '',
        quoted_total: 0,
        vat_mode: 'NONE',
        vat_amount: 0,
        net_amount: 0,
        quotation_no: '',
        po_no: '',
        po_running_no: null as number | null,
        delivery_note_no: '',
        incoming_doc_no: '',
        incoming_doc_date: today,
        inspection_no: '',
        inspection_running_no: null as number | null,
        requisition_no: '',
        requisition_running_no: null as number | null,
        quotation_date: today,
        eval_report_date: today,
        announce_date: today,
        po_date: today,
        delivery_date: today,
        inspection_date: today,
        requisition_date: today,
        credit_days: 30,
        warranty_days: 0,
        guarantee_type: '',
        guarantee_amount: 0,
        requester_emp_code: ''
    })

    useEffect(() => {
        const load = async () => {
            if (!requestId) return
            const res = await getExecutionSetupData(requestId)
            if (res.success && res.data) {
                setMaster(res.data)
                setVendors(res.data.vendors || [])
                const { procurement, existingExecution, req } = res.data

                if (existingExecution) {
                    setForm({
                        vendor_id: existingExecution.vendor_id || '',
                        quoted_total: Number(existingExecution.quoted_total) || 0,
                        vat_mode: existingExecution.vat_mode || 'NONE',
                        vat_amount: Number(existingExecution.vat_amount) || 0,
                        net_amount: Number(existingExecution.net_amount) || 0,
                        quotation_no: existingExecution.quotation_no || '',
                        po_no: existingExecution.po_no || '',
                        po_running_no: existingExecution.po_running_no,
                        delivery_note_no: existingExecution.delivery_note_no || '',
                        incoming_doc_no: existingExecution.incoming_doc_no || '',
                        incoming_doc_date: existingExecution.incoming_doc_date || existingExecution.delivery_date || today,
                        inspection_no: existingExecution.inspection_no || '',
                        inspection_running_no: existingExecution.inspection_running_no,
                        requisition_no: existingExecution.requisition_no || '',
                        requisition_running_no: existingExecution.requisition_running_no,
                        quotation_date: existingExecution.quotation_date || today,
                        eval_report_date: existingExecution.eval_report_date || today,
                        announce_date: existingExecution.announce_date || today,
                        po_date: existingExecution.po_date || today,
                        delivery_date: existingExecution.delivery_date || today,
                        inspection_date: existingExecution.inspection_date || today,
                        requisition_date: existingExecution.requisition_date || today,
                        credit_days: existingExecution.credit_days ?? 30,
                        warranty_days: existingExecution.warranty_days ?? 0,
                        guarantee_type: existingExecution.guarantee_type || '',
                        guarantee_amount: Number(existingExecution.guarantee_amount) || 0,
                        requester_emp_code: existingExecution.requester_emp_code || req?.requester_emp_code || ''
                    })
                } else if (procurement) {
                    const baseDate = procurement.order_date || procurement.report_date || today
                    const budget = Number(procurement.total_budget || 0)
                    setForm(prev => ({
                        ...prev,
                        quoted_total: budget,
                        net_amount: budget,
                        quotation_date: baseDate,
                        eval_report_date: baseDate,
                        announce_date: baseDate,
                        po_date: baseDate,
                        delivery_date: baseDate,
                        incoming_doc_date: baseDate,
                        inspection_date: baseDate,
                        requisition_date: baseDate,
                        requester_emp_code: req?.requester_emp_code || ''
                    }))
                }
            } else {
                alert('โหลดข้อมูลไม่สำเร็จ: ' + res.error)
            }
            setIsLoading(false)
        }
        load()
    }, [requestId])

    // อัปเดตราคาและ VAT อัตโนมัติ
    const handlePricingChange = (newAmount: number, newVatMode: string) => {
        const { vat_amount, net_amount } = calculateVat(newAmount, newVatMode)
        setForm(prev => ({ ...prev, quoted_total: newAmount, vat_mode: newVatMode, vat_amount, net_amount }))
    }

    // จัดวันที่อัตโนมัติตามวันทำการ (ข้ามเสาร์-อาทิตย์)
    const handleAutoFillDates = () => {
        const start = master?.procurement?.order_date || master?.procurement?.report_date || today
        const d1 = addBusinessDays(start, 1) // เสนอราคา + รายงานผล + ประกาศ
        const d2 = addBusinessDays(d1, 1)    // ใบสั่งซื้อ/สั่งจ้าง
        const d3 = addBusinessDays(d2, 2)    // ส่งมอบ + ลงรับหนังสือ
        const d4 = addBusinessDays(d3, 1)    // ตรวจรับ + เบิกพัสดุ
        setForm(prev => ({
            ...prev,
            quotation_date: d1,
            eval_report_date: d1,
            announce_date: d1,
            po_date: d2,
            delivery_date: d3,
            incoming_doc_date: d3,
            inspection_date: d4,
            requisition_date: d4
        }))
    }

    // ควบคุมลำดับวันที่ไม่ให้ย้อนหลัง
    const dateOrder = [
        'quotation_date', 'eval_report_date', 'announce_date',
        'po_date', 'delivery_date', 'inspection_date', 'requisition_date'
    ] as const

    const handleDateChange = (field: typeof dateOrder[number], value: string) => {
        if (!value) return
        setForm(prev => {
            const next: any = { ...prev, [field]: value }
            const idx = dateOrder.indexOf(field)
            // ดันวันที่ลำดับถัดไปถ้าค่าน้อยกว่าวันที่เพิ่งแก้
            for (let i = idx + 1; i < dateOrder.length; i++) {
                if (next[dateOrder[i]] < next[dateOrder[i - 1]]) {
                    next[dateOrder[i]] = next[dateOrder[i - 1]]
                }
            }
            if (field === 'delivery_date') next.incoming_doc_date = value
            return next
        })
    }

    // บันทึกร้านค้าใหม่
    const handleCreateVendor = async () => {
        if (!newVendor.vendor_name.trim()) return alert('กรุณาระบุชื่อร้านค้า/ผู้รับจ้าง')
        const res = await createVendor({ ...newVendor, school_id: master.req.school_id })
        if (res.success && res.data) {
            setVendors(prev => [...prev, res.data].sort((a, b) => a.vendor_name.localeCompare(b.vendor_name)))
            setForm(prev => ({
                ...prev,
                vendor_id: res.data.id,
                vat_mode: res.data.is_vat_registered ? 'INCLUDE_7' : 'NONE',
                ...calculateVat(prev.quoted_total, res.data.is_vat_registered ? 'INCLUDE_7' : 'NONE')
            }))
            setShowVendorModal(false)
            setNewVendor({ vendor_name: '', vendor_type: 'SHOP', tax_id: '', address: '', phone: '', bank_name: '', bank_account_no: '', bank_account_name: '', is_vat_registered: false })
        } else {
            alert('เพิ่มร้านค้าไม่สำเร็จ: ' + res.error)
        }
    }

    // บันทึกทั้งหมด
    const handleSave = async () => {
        if (!form.vendor_id) return alert('กรุณาเลือกร้านค้า / ผู้รับจ้าง')
        setIsSaving(true)
        try {
            const res = await saveExecutionData({
                executionId: master?.existingExecution?.id,
                schoolId: master.req.school_id,
                procurementId: master.procurement.id,
                procurementType: master.procurement.procurement_type,
                form
            })
            if (res.success) {
                alert('บันทึกข้อมูลเรียบร้อย! กำลังไปหน้าแฟ้มเอกสารรวม (Print Preview)')
                router.push(`/smartschool/planning/requests/${requestId}/procurement/dossier`)
            } else {
                alert('บันทึกไม่สำเร็จ: ' + res.error)
            }
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังโหลดข้อมูลการดำเนินการพัสดุ...</div>
    if (!master?.procurement) {
        return (
            <div className="min-h-screen bg-[#0B1528] text-white flex flex-col justify-center items-center gap-4">
                <p className="text-amber-400 font-bold">กรุณาตั้งค่ารายงานขอซื้อขอจ้างและคำสั่งแต่งตั้งคณะกรรมการก่อน</p>
                <Link href={`/smartschool/planning/requests/${requestId}/procurement`} className="px-5 py-2 bg-[#008080] rounded-lg font-bold">ไปหน้าตั้งค่ารายงานขอซื้อขอจ้าง</Link>
            </div>
        )
    }

    const isBuy = master.procurement.procurement_type === 'BUY'
    const isConstruction = master.procurement.procurement_type === 'CONSTRUCTION'
    const employees = master.employees || []

    return (
        <div className="min-h-screen bg-[#0B1528] text-white p-4 md:p-6 font-sans pb-20">
            {/* HEADER */}
            <header className="max-w-5xl mx-auto mb-6 bg-[#002B49] p-4 rounded-xl shadow-lg border-b-4 border-[#008080] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#0B1528] px-3 py-2 rounded-lg border border-teal-500/50">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-400 to-[#008080] flex items-center justify-center font-black text-[#0B1528]">N</div>
                        <div className="leading-tight">
                            <div className="text-xs font-black text-white">NiiVaa</div>
                            <div className="text-[10px] font-bold text-[#98FB98]">SmartSchool</div>
                        </div>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileCheck2 className="w-5 h-5 text-[#98FB98]" /> ตั้งค่าชุดเอกสารสั่งซื้อ/สั่งจ้าง &amp; ตรวจรับพัสดุ (6 ฉบับ)
                        </h1>
                        <p className="text-xs text-teal-300">
                            กิจกรรม: <span className="text-white font-bold">{master.activity?.activity_name}</span> | รายงานเลขที่: <span className="text-[#98FB98]">{master.procurement.report_no}</span>
                        </p>
                    </div>
                </div>
                <Link href={`/smartschool/planning/requests/${requestId}/procurement/preview`} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs border border-gray-600 flex items-center gap-1">
                    <ArrowLeft className="w-4 h-4" /> กลับหน้ารายงาน/คำสั่ง
                </Link>
            </header>

            <main className="max-w-5xl mx-auto space-y-6">

                {/* === กล่องที่ 1: ผู้ขาย/ผู้รับจ้าง และราคาที่ตกลง === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-5 py-3 font-bold text-white flex justify-between items-center">
                        <span className="flex items-center gap-2"><Store className="w-5 h-5" /> 1. ผู้ขาย / ผู้รับจ้าง และยอดเงินที่ตกลง</span>
                        <button type="button" onClick={() => setShowVendorModal(true)} className="px-3 py-1 bg-[#0B1528] hover:bg-gray-900 text-[#98FB98] text-xs rounded-lg border border-[#98FB98]/50 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> เพิ่มร้านค้าใหม่
                        </button>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs text-gray-300 block mb-1">เลือกผู้ขาย / ผู้รับจ้าง (จากทะเบียนกลางโรงเรียน)</label>
                            <select
                                value={form.vendor_id}
                                onChange={e => {
                                    const v = vendors.find(x => x.id === e.target.value)
                                    const mode = v?.is_vat_registered ? 'INCLUDE_7' : 'NONE'
                                    setForm(prev => ({ ...prev, vendor_id: e.target.value, ...calculateVat(prev.quoted_total, mode), vat_mode: mode }))
                                }}
                                className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none focus:border-[#98FB98]"
                            >
                                <option value="">-- เลือกร้านค้า / บริษัท / ผู้รับจ้าง --</option>
                                {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.vendor_name} {v.tax_id ? `(Tax: ${v.tax_id})` : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 block mb-1">รูปแบบภาษีมูลค่าเพิ่ม (VAT 7%)</label>
                            <select
                                value={form.vat_mode}
                                onChange={e => handlePricingChange(form.quoted_total, e.target.value)}
                                className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white outline-none"
                            >
                                <option value="NONE">ไม่มี VAT (บุคคลธรรมดา/ร้านค้าทั่วไป)</option>
                                <option value="INCLUDE_7">ราคารวม VAT 7% แล้ว</option>
                                <option value="EXCLUDE_7">ราคาแยก VAT 7% (บวกเพิ่ม 7%)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs text-gray-300 block mb-1">ราคาที่เสนอ / ตกลง (บาท)</label>
                            <input
                                type="number" step="0.01"
                                value={form.quoted_total}
                                onChange={e => handlePricingChange(Number(e.target.value), form.vat_mode)}
                                className="w-full bg-[#0B1528] border border-teal-500/60 rounded px-3 py-2 text-sm font-mono text-white outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">ภาษีมูลค่าเพิ่ม 7% (คำนวณอัตโนมัติ)</label>
                            <input type="text" readOnly value={form.vat_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} className="w-full bg-[#0B1528]/60 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-amber-300" />
                        </div>
                        <div>
                            <label className="text-xs text-[#98FB98] font-bold block mb-1">ยอดเงินสุทธิ (บาท)</label>
                            <input type="text" readOnly value={form.net_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} className="w-full bg-teal-950/60 border border-[#98FB98] rounded px-3 py-2 text-sm font-mono font-bold text-[#98FB98]" />
                        </div>
                    </div>
                </section>

                {/* === กล่องที่ 2: ไทม์ไลน์วันที่และเลขที่เอกสาร === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-5 py-3 font-bold text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                        <span className="flex items-center gap-2"><CalendarClock className="w-5 h-5" /> 2. ลำดับวันที่เอกสาร (7 จุด) &amp; เลขที่ทะเบียนคุม</span>
                        <button type="button" onClick={handleAutoFillDates} className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-lg font-bold flex items-center gap-1 shadow">
                            <Sparkles className="w-3.5 h-3.5" /> จัดวันที่อัตโนมัติ (ข้ามเสาร์-อาทิตย์)
                        </button>
                    </div>
                    <div className="p-5 space-y-5">
                        {/* วันที่ 7 จุด */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#0B1528] p-4 rounded-lg border border-teal-500/30">
                            <div>
                                <label className="text-xs text-teal-300 block mb-1">1. วันที่ใบเสนอราคา</label>
                                <input type="date" value={form.quotation_date} onChange={e => handleDateChange('quotation_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-teal-300 block mb-1">2. วันที่รายงานผลพิจารณา</label>
                                <input type="date" min={form.quotation_date} value={form.eval_report_date} onChange={e => handleDateChange('eval_report_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-teal-300 block mb-1">3. วันที่ประกาศผู้ชนะ</label>
                                <input type="date" min={form.eval_report_date} value={form.announce_date} onChange={e => handleDateChange('announce_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-amber-300 block mb-1">4. วันที่ใบสั่งซื้อ/สั่งจ้าง (PO)</label>
                                <input type="date" min={form.announce_date} value={form.po_date} onChange={e => handleDateChange('po_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-teal-300 block mb-1">5. วันที่ร้านค้าส่งมอบ</label>
                                <input type="date" min={form.po_date} value={form.delivery_date} onChange={e => handleDateChange('delivery_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-teal-300 block mb-1">6. วันที่ตรวจรับพัสดุ</label>
                                <input type="date" min={form.delivery_date} value={form.inspection_date} onChange={e => handleDateChange('inspection_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                            </div>
                            {isBuy && (
                                <div>
                                    <label className="text-xs text-[#98FB98] block mb-1">7. วันที่เบิกพัสดุ</label>
                                    <input type="date" min={form.inspection_date} value={form.requisition_date} onChange={e => handleDateChange('requisition_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5 text-sm" />
                                </div>
                            )}
                        </div>

                        {/* เลขที่เอกสาร (รันอัตโนมัติเมื่อเว้นว่าง) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">เลขที่ใบสั่งซื้อ/สั่งจ้าง (PO)</label>
                                <input type="text" value={form.po_no} onChange={e => setForm({ ...form, po_no: e.target.value })} placeholder="ออกเลขอัตโนมัติเมื่อบันทึก" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">เลขที่ใบตรวจรับพัสดุ</label>
                                <input type="text" value={form.inspection_no} onChange={e => setForm({ ...form, inspection_no: e.target.value })} placeholder="ออกเลขอัตโนมัติเมื่อบันทึก" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                            </div>
                            {isBuy && (
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">เลขที่ใบเบิกพัสดุ</label>
                                    <input type="text" value={form.requisition_no} onChange={e => setForm({ ...form, requisition_no: e.target.value })} placeholder="ออกเลขอัตโนมัติเมื่อบันทึก" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">เลขที่ใบส่งของ / ใบเสร็จร้านค้า</label>
                                <input type="text" value={form.delivery_note_no} onChange={e => setForm({ ...form, delivery_note_no: e.target.value })} placeholder="เช่น IV-69001" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* === กล่องที่ 3: ทะเบียนหนังสือรับ หลักประกัน และผู้เบิกพัสดุ === */}
                <section className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-teal-800 px-5 py-3 font-bold text-white flex items-center gap-2">
                        <Receipt className="w-5 h-5" /> 3. ข้อมูลหนังสือรับ, เงื่อนไขสัญญา และผู้เบิกพัสดุ
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-gray-300 block mb-1">เลขรับหนังสือ (ใบส่งมอบ)</label>
                            <input type="text" value={form.incoming_doc_no} onChange={e => setForm({ ...form, incoming_doc_no: e.target.value })} placeholder="ระบุเลขรับ (ถ้ามี)" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 block mb-1">ยืนราคา / เครดิต (วัน)</label>
                            <input type="number" value={form.credit_days} onChange={e => setForm({ ...form, credit_days: Number(e.target.value) })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-300 block mb-1">รับประกันความชำรุด (วัน)</label>
                            <input type="number" value={form.warranty_days} onChange={e => setForm({ ...form, warranty_days: Number(e.target.value) })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-sm text-white" />
                        </div>
                        {isBuy && (
                            <div>
                                <label className="text-xs text-[#98FB98] block mb-1">ผู้เบิกพัสดุ (สำหรับใบเบิก)</label>
                                <select value={form.requester_emp_code} onChange={e => setForm({ ...form, requester_emp_code: e.target.value })} className="w-full bg-[#0B1528] border border-teal-500/60 rounded px-3 py-2 text-sm text-white">
                                    <option value="">-- เลือกผู้เบิกพัสดุ --</option>
                                    {employees.map((e: any) => <option key={e.emp_code} value={e.emp_code}>{e.prefix}{e.first_name} {e.last_name}</option>)}
                                </select>
                            </div>
                        )}
                        {isConstruction && (
                            <>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-amber-300 flex items-center gap-1 mb-1"><Shield className="w-3.5 h-3.5" /> ประเภทหลักประกันสัญญา (ถ้ามี)</label>
                                    <select value={form.guarantee_type} onChange={e => setForm({ ...form, guarantee_type: e.target.value })} className="w-full bg-[#0B1528] border border-amber-500/50 rounded px-3 py-2 text-sm text-white">
                                        <option value="">-- ไม่มีหลักประกันสัญญา --</option>
                                        <option value="เงินสด">เงินสด</option>
                                        <option value="เช็คที่ธนาคารเซ็นสั่งจ่าย">เช็คที่ธนาคารเซ็นสั่งจ่าย</option>
                                        <option value="หนังสือค้ำประกันของธนาคาร">หนังสือค้ำประกันของธนาคาร</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-amber-300 block mb-1">จำนวนเงินหลักประกัน (บาท)</label>
                                    <input type="number" value={form.guarantee_amount} onChange={e => setForm({ ...form, guarantee_amount: Number(e.target.value) })} className="w-full bg-[#0B1528] border border-amber-500/50 rounded px-3 py-2 text-sm text-white font-mono" />
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* ปุ่มบันทึก */}
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3 bg-[#008080] hover:bg-[#006666] disabled:opacity-50 text-white font-bold rounded-lg shadow-lg border border-[#98FB98] flex items-center gap-2"
                    >
                        {isSaving ? <Save className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกและไปหน้าพิมพ์แฟ้มเอกสารครบชุด (A4)'}
                    </button>
                </div>
            </main>

            {/* === MODAL เพิ่มร้านค้าใหม่ === */}
            {showVendorModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#002B49] border border-[#008080] rounded-xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                            <h3 className="font-bold text-[#98FB98] flex items-center gap-2"><Store className="w-5 h-5" /> เพิ่มร้านค้า / ผู้รับจ้างใหม่</h3>
                            <button onClick={() => setShowVendorModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">ชื่อร้านค้า / บริษัท / บุคคลธรรมดา *</label>
                                <input type="text" value={newVendor.vendor_name} onChange={e => setNewVendor({ ...newVendor, vendor_name: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">เลขประจำตัวผู้เสียภาษี 13 หลัก</label>
                                    <input type="text" value={newVendor.tax_id} onChange={e => setNewVendor({ ...newVendor, tax_id: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">เบอร์โทรศัพท์</label>
                                    <input type="text" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-300 block mb-1">ที่อยู่ร้านค้า</label>
                                <textarea rows={2} value={newVendor.address} onChange={e => setNewVendor({ ...newVendor, address: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">ธนาคาร (สำหรับโอนจ่าย)</label>
                                    <input type="text" value={newVendor.bank_name} onChange={e => setNewVendor({ ...newVendor, bank_name: e.target.value })} placeholder="เช่น กรุงไทย" className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-300 block mb-1">เลขที่บัญชี</label>
                                    <input type="text" value={newVendor.bank_account_no} onChange={e => setNewVendor({ ...newVendor, bank_account_no: e.target.value })} className="w-full bg-[#0B1528] border border-gray-600 rounded px-3 py-2 text-white" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input type="checkbox" checked={newVendor.is_vat_registered} onChange={e => setNewVendor({ ...newVendor, is_vat_registered: e.target.checked })} className="w-4 h-4 accent-teal-500" />
                                <span className="text-xs text-amber-300">จดทะเบียนภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                            <button onClick={() => setShowVendorModal(false)} className="px-4 py-2 bg-gray-700 rounded-lg text-xs">ยกเลิก</button>
                            <button onClick={handleCreateVendor} className="px-5 py-2 bg-[#008080] hover:bg-[#006666] rounded-lg text-xs font-bold text-white">บันทึกร้านค้า</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}