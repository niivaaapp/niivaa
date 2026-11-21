'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Plus, Trash2, Store, ListChecks, Save,
    AlertTriangle, CheckCircle2, X, FileText
} from 'lucide-react'
import { getWor119SetupData, saveWor119Receipts } from './actions'

interface ReceiptItem {
    item_name: string
    qty: number
    unit: string
    unit_price: number
    total_price: number
}

interface Wor119Receipt {
    expense_category: 'BUY' | 'HIRE'
    title_label: string
    vendor_id: string
    vendor_name: string
    vendor_address: string
    receipt_book_no: string
    receipt_no: string
    receipt_date: string
    items: ReceiptItem[]
    total_amount: number
}

export default function Wor119SetupPage() {
    const params = useParams()
    const router = useRouter()
    const requestId = params.id as string
    const today = new Date().toISOString().split('T')[0]

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [master, setMaster] = useState<any>(null)
    const [receipts, setReceipts] = useState<Wor119Receipt[]>([])

    // Modal เลือกรายการพัสดุจากโครงการ
    const [pickerReceiptIdx, setPickerReceiptIdx] = useState<number | null>(null)
    const [checkedMaterialIds, setCheckedMaterialIds] = useState<string[]>([])

    // Pop-up แจ้งเตือนวงเงินเกิน 10,000 บาท
    const [showLimitAlert, setShowLimitAlert] = useState(false)
    const [catalogSearch, setCatalogSearch] = useState('')

    useEffect(() => {
        const load = async () => {
            if (!requestId) return
            const res = await getWor119SetupData(requestId)
            if (res.success && res.data) {
                setMaster(res.data)
                if (res.data.receipts && res.data.receipts.length > 0) {
                    setReceipts(res.data.receipts.map((r: any) => ({
                        expense_category: r.expense_category || 'BUY',
                        title_label: r.title_label || 'ค่าวัสดุ',
                        vendor_id: r.vendor_id || '',
                        vendor_name: r.vendor_name || '',
                        vendor_address: r.vendor_address || '',
                        receipt_book_no: r.receipt_book_no || '',
                        receipt_no: r.receipt_no || '',
                        receipt_date: r.receipt_date || today,
                        items: Array.isArray(r.items) ? r.items : [],
                        total_amount: Number(r.total_amount) || 0
                    })))
                } else {
                    // เริ่มต้นสร้าง 1 ร้านค้าว่างไว้ให้
                    setReceipts([{
                        expense_category: 'BUY',
                        title_label: 'ค่าวัสดุ',
                        vendor_id: '',
                        vendor_name: '',
                        vendor_address: '',
                        receipt_book_no: '',
                        receipt_no: '',
                        receipt_date: today,
                        items: [],
                        total_amount: 0
                    }])
                }
            }
            setIsLoading(false)
        }
        load()
    }, [requestId])

    const grandTotal = receipts.reduce((sum, r) => sum + Number(r.total_amount || 0), 0)

    // ตรวจสอบวงเงินเกิน 10,000 บาทอัตโนมัติ
    useEffect(() => {
        if (grandTotal > 10000) {
            setShowLimitAlert(true)
        }
    }, [grandTotal])

    const addReceipt = () => {
        setReceipts(prev => [...prev, {
            expense_category: 'BUY',
            title_label: 'ค่าวัสดุ',
            vendor_id: '',
            vendor_name: '',
            vendor_address: '',
            receipt_book_no: '',
            receipt_no: '',
            receipt_date: today,
            items: [],
            total_amount: 0
        }])
    }

    const removeReceipt = (idx: number) => {
        if (receipts.length === 1) return alert('ต้องมีอย่างน้อย 1 ร้านค้า/ใบเสร็จ')
        setReceipts(prev => prev.filter((_, i) => i !== idx))
    }

    const updateReceiptField = (idx: number, field: keyof Wor119Receipt, value: any) => {
        setReceipts(prev => prev.map((r, i) => {
            if (i !== idx) return r
            const updated = { ...r, [field]: value }
            if (field === 'expense_category') {
                updated.title_label = value === 'HIRE' ? 'ค่าจ้าง' : 'ค่าวัสดุ'
            }
            if (field === 'vendor_id' && value) {
                const v = (master?.vendors || []).find((x: any) => x.id === value)
                if (v) {
                    updated.vendor_name = v.vendor_name
                    updated.vendor_address = v.address || ''
                }
            }
            return updated
        }))
    }

    // จัดการรายการพัสดุภายในแต่ละร้านค้า
    const recalcItems = (idx: number, newItems: ReceiptItem[]) => {
        const total = newItems.reduce((s, it) => s + Number(it.total_price || 0), 0)
        setReceipts(prev => prev.map((r, i) => i === idx ? { ...r, items: newItems, total_amount: Number(total.toFixed(2)) } : r))
    }

    const addBlankItem = (recIdx: number) => {
        const current = receipts[recIdx].items
        recalcItems(recIdx, [...current, { item_name: '', qty: 1, unit: 'ชิ้น', unit_price: 0, total_price: 0 }])
    }

    const updateItem = (recIdx: number, itemIdx: number, field: keyof ReceiptItem, value: any) => {
        const updated = receipts[recIdx].items.map((it, i) => {
            if (i !== itemIdx) return it
            const next = { ...it, [field]: value }
            if (field === 'qty' || field === 'unit_price') {
                next.total_price = Number((Number(next.qty || 0) * Number(next.unit_price || 0)).toFixed(2))
            }
            return next
        })
        recalcItems(recIdx, updated)
    }

    const removeItem = (recIdx: number, itemIdx: number) => {
        recalcItems(recIdx, receipts[recIdx].items.filter((_, i) => i !== itemIdx))
    }

    // นำเข้ารายการพัสดุที่ติ๊กเลือกจาก Modal
    const handleImportMaterials = () => {
        if (pickerReceiptIdx === null) return
        const sourceList = (master?.catalogMaterials && master.catalogMaterials.length > 0)
            ? master.catalogMaterials
            : (master?.materials || [])

        const selected = sourceList.filter((m: any) => checkedMaterialIds.includes(m.id))
        const mapped: ReceiptItem[] = selected.map((m: any) => {
            const qty = Number(m.qty_a || 1)
            const unitPrice = Number(m.unit_price || m.standard_price || m.price || 0)
            return {
                item_name: m.item_name || m.material_name || m.name || '',
                qty,
                unit: m.unit_a || m.unit || m.default_unit || 'หน่วย',
                unit_price: unitPrice,
                total_price: Number((qty * unitPrice).toFixed(2))
            }
        })
        recalcItems(pickerReceiptIdx, [...receipts[pickerReceiptIdx].items, ...mapped])
        setPickerReceiptIdx(null)
        setCheckedMaterialIds([])
        setCatalogSearch('')
    }

    const handleSave = async () => {
        if (grandTotal > 10000) {
            setShowLimitAlert(true)
            return
        }
        if (receipts.some(r => !r.vendor_name.trim())) {
            return alert('กรุณาระบุชื่อร้านค้า/ผู้รับจ้างให้ครบทุกข้อ')
        }
        setIsSaving(true)
        try {
            const res = await saveWor119Receipts({
                schoolId: master.req.school_id,
                procurementId: master.procurement.id,
                receipts
            })
            if (res.success) {
                alert('บันทึกข้อมูล ว 119 เรียบร้อย!')
                router.push(`/smartschool/planning/requests/${requestId}/procurement/wor119/preview`)
            } else {
                alert('บันทึกไม่สำเร็จ: ' + res.error)
            }
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังโหลดข้อมูล ว 119...</div>
    if (!master?.procurement) {
        return (
            <div className="min-h-screen bg-[#0B1528] text-white flex flex-col justify-center items-center gap-4">
                <p className="text-amber-400 font-bold">กรุณาตั้งค่ารายงานขอซื้อขอจ้างเบื้องต้นก่อน</p>
                <Link href={`/smartschool/planning/requests/${requestId}/procurement`} className="px-5 py-2 bg-[#008080] rounded-lg font-bold">ไปหน้าตั้งค่ารายงาน</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B1528] text-white p-4 md:p-6 font-sans pb-24">
            {/* HEADER */}
            <header className="max-w-5xl mx-auto mb-6 bg-[#002B49] p-4 rounded-xl shadow-lg border-b-4 border-[#008080] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#98FB98]" /> จัดการใบเสร็จ / ร้านค้า (แนวทาง ว 119 — ไม่เกิน 10,000 บาท)
                    </h1>
                    <p className="text-xs text-teal-300">
                        กิจกรรม: <span className="text-white font-bold">{master.activity?.activity_name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`px-4 py-1.5 rounded-lg border font-mono text-sm font-bold ${grandTotal > 10000 ? 'bg-red-950 border-red-500 text-red-300' : 'bg-teal-950 border-[#98FB98]/60 text-[#98FB98]'}`}>
                        ยอดรวมทั้งสิ้น: {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} / 10,000.00 บาท
                    </div>
                    <Link href={`/smartschool/planning/requests/${requestId}/procurement`} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs border border-gray-600 flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> กลับ
                    </Link>
                </div>
            </header>

            {/* รายการร้านค้า/ใบเสร็จ */}
            <main className="max-w-5xl mx-auto space-y-6">
                {receipts.map((rec, rIdx) => (
                    <section key={rIdx} className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                        <div className="bg-[#008080] px-4 py-2.5 flex justify-between items-center">
                            <span className="font-bold text-sm flex items-center gap-2">
                                <Store className="w-4 h-4" /> ข้อที่ {rIdx + 1}: {rec.title_label} {rec.vendor_name ? `— ${rec.vendor_name}` : ''}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono bg-[#0B1528] px-2.5 py-1 rounded text-[#98FB98]">
                                    รวม {rec.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                </span>
                                <button onClick={() => removeReceipt(rIdx)} className="text-red-200 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {/* ข้อมูลร้านค้า & ใบเสร็จ */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <label className="text-gray-300 block mb-1">ประเภท</label>
                                    <select value={rec.expense_category} onChange={e => updateReceiptField(rIdx, 'expense_category', e.target.value)} className="w-full bg-[#0B1528] border border-gray-600 rounded px-2.5 py-2 text-white">
                                        <option value="BUY">ค่าวัสดุ (ซื้อ)</option>
                                        <option value="HIRE">ค่าจ้าง (จ้างทำ/จ้างเหมา)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-300 block mb-1">คำนำหน้ารายการ (ในรายงาน)</label>
                                    <input type="text" value={rec.title_label} onChange={e => updateReceiptField(rIdx, 'title_label', e.target.value)} placeholder="เช่น ค่าวัสดุ, ค่าจ้างทำป้าย" className="w-full bg-[#0B1528] border border-gray-600 rounded px-2.5 py-2 text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 block mb-1">เลือกร้านค้าจากทะเบียน (หรือพิมพ์เองด้านล่าง)</label>
                                    <select value={rec.vendor_id} onChange={e => updateReceiptField(rIdx, 'vendor_id', e.target.value)} className="w-full bg-[#0B1528] border border-teal-500/60 rounded px-2.5 py-2 text-white">
                                        <option value="">-- เลือกจากทะเบียนร้านค้า --</option>
                                        {(master?.vendors || []).map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-gray-300 block mb-1">ชื่อผู้ขาย / ผู้รับจ้าง *</label>
                                    <input type="text" value={rec.vendor_name} onChange={e => updateReceiptField(rIdx, 'vendor_name', e.target.value)} placeholder="เช่น ร้านอักษรภัณฑ์" className="w-full bg-[#0B1528] border border-gray-600 rounded px-2.5 py-2 text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 block mb-1">ที่อยู่ร้านค้า (เช่น อ.รัตนบุรี จ.สุรินทร์)</label>
                                    <input type="text" value={rec.vendor_address} onChange={e => updateReceiptField(rIdx, 'vendor_address', e.target.value)} className="w-full bg-[#0B1528] border border-gray-600 rounded px-2.5 py-2 text-white" />
                                </div>

                                <div>
                                    <label className="text-gray-300 block mb-1">ใบเสร็จ/ใบส่งของ เล่มที่</label>
                                    <input type="text" value={rec.receipt_book_no} onChange={e => updateReceiptField(rIdx, 'receipt_book_no', e.target.value)} placeholder="เช่น 01" className="w-full bg-[#0B1528] border border-gray-600 rounded px-2.5 py-2 text-white" />
                                </div>
                                <div>
                                    <label className="text-gray-300 block mb-1">เลขที่</label>
                                    <input type="text" value={rec.receipt_no} onChange={e => updateReceiptField(rIdx, 'receipt_no', e.target.value)} placeholder="เช่น 0045" className="w-full bg-[#0B1528] border border-gray-600 rounded px-2.5 py-2 text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 block mb-1">ลงวันที่ใบเสร็จ</label>
                                    <input type="date" value={rec.receipt_date} onChange={e => updateReceiptField(rIdx, 'receipt_date', e.target.value)} className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2.5 py-1.5" />
                                </div>
                            </div>

                            {/* ตารางรายการพัสดุ/งานจ้างของร้านนี้ */}
                            <div className="bg-[#0B1528] p-3 rounded-lg border border-gray-700 space-y-2">
                                <div className="flex flex-wrap justify-between items-center gap-2">
                                    <span className="text-xs font-bold text-teal-300">รายการพัสดุ / งานจ้างในใบเสร็จนี้ ({rec.items.length} รายการ)</span>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setPickerReceiptIdx(rIdx); setCheckedMaterialIds([]) }} className="px-3 py-1 bg-teal-800 hover:bg-teal-700 text-white text-xs rounded flex items-center gap-1">
                                            <ListChecks className="w-3.5 h-3.5" /> เลือกรายการพัสดุจากโครงการ
                                        </button>
                                        <button type="button" onClick={() => addBlankItem(rIdx)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded flex items-center gap-1">
                                            <Plus className="w-3.5 h-3.5" /> เพิ่มแถวเอง
                                        </button>
                                    </div>
                                </div>

                                {rec.items.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="text-gray-400 border-b border-gray-700 text-left">
                                                    <th className="py-1.5 w-8 text-center">#</th>
                                                    <th className="py-1.5">รายการ</th>
                                                    <th className="py-1.5 w-20 text-center">จำนวน</th>
                                                    <th className="py-1.5 w-24 text-center">หน่วย</th>
                                                    <th className="py-1.5 w-28 text-right">ราคา/หน่วย</th>
                                                    <th className="py-1.5 w-28 text-right">รวม (บาท)</th>
                                                    <th className="py-1.5 w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {rec.items.map((it, iIdx) => (
                                                    <tr key={iIdx}>
                                                        <td className="py-1 text-center text-gray-400">{iIdx + 1}</td>
                                                        <td className="py-1 pr-1"><input type="text" value={it.item_name} onChange={e => updateItem(rIdx, iIdx, 'item_name', e.target.value)} className="w-full bg-[#002B49] border border-gray-700 rounded px-2 py-1 text-white" /></td>
                                                        <td className="py-1 px-1"><input type="number" value={it.qty} onChange={e => updateItem(rIdx, iIdx, 'qty', Number(e.target.value))} className="w-full bg-[#002B49] border border-gray-700 rounded px-2 py-1 text-center text-white" /></td>
                                                        <td className="py-1 px-1"><input type="text" value={it.unit} onChange={e => updateItem(rIdx, iIdx, 'unit', e.target.value)} className="w-full bg-[#002B49] border border-gray-700 rounded px-2 py-1 text-center text-white" /></td>
                                                        <td className="py-1 px-1"><input type="number" step="0.01" value={it.unit_price} onChange={e => updateItem(rIdx, iIdx, 'unit_price', Number(e.target.value))} className="w-full bg-[#002B49] border border-gray-700 rounded px-2 py-1 text-right text-white font-mono" /></td>
                                                        <td className="py-1 px-1 text-right font-mono text-[#98FB98]">{Number(it.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                        <td className="py-1 text-center"><button onClick={() => removeItem(rIdx, iIdx)} className="text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5" /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                ))}

                {/* ปุ่มเพิ่มร้านค้า + ปุ่มบันทึก */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-2">
                    <button type="button" onClick={addReceipt} className="w-full md:w-auto px-5 py-2.5 bg-[#002B49] hover:bg-teal-900 border border-[#98FB98]/60 text-[#98FB98] font-bold rounded-lg text-sm flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> เพิ่มร้านค้า / ใบเสร็จอีก 1 ราย
                    </button>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || grandTotal > 10000}
                        className="w-full md:w-auto px-8 py-3 bg-[#008080] hover:bg-[#006666] disabled:opacity-40 text-white font-bold rounded-lg shadow-lg border border-[#98FB98] flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Save className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล ว 119 และไปหน้าพิมพ์ A4'}
                    </button>
                </div>
            </main>

            {/* === MODAL เลือกรายการพัสดุจากโครงการ === */}
            {/* === MODAL เลือกรายการพัสดุจากคลังพัสดุกลาง === */}
            {pickerReceiptIdx !== null && (() => {
                const sourceList = (master?.catalogMaterials && master.catalogMaterials.length > 0)
                    ? master.catalogMaterials
                    : (master?.materials || [])
                const filteredList = sourceList.filter((m: any) =>
                    (m.item_name || m.name || '').toLowerCase().includes(catalogSearch.trim().toLowerCase())
                )

                return (
                    <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
                        <div className="bg-[#002B49] border border-[#008080] rounded-xl w-full max-w-2xl p-5 space-y-3 shadow-2xl max-h-[85vh] flex flex-col">
                            <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                                <h3 className="font-bold text-[#98FB98]">
                                    เลือกพัสดุจากคลังกลางใส่ในข้อที่ {pickerReceiptIdx + 1} ({filteredList.length} รายการ)
                                </h3>
                                <button onClick={() => { setPickerReceiptIdx(null); setCatalogSearch('') }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>

                            {/* ช่องค้นหาพัสดุ */}
                            <input
                                type="text"
                                value={catalogSearch}
                                onChange={e => setCatalogSearch(e.target.value)}
                                placeholder="พิมพ์ชื่อพัสดุเพื่อค้นหา เช่น กระดาษ, ปากกา, หมึก..."
                                className="w-full bg-[#0B1528] border border-teal-500/60 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#98FB98]"
                            />

                            {/* รายการพัสดุ (เลื่อนขึ้นลงได้) */}
                            <div className="overflow-y-auto min-h-0 max-h-[52vh] flex-1 space-y-1.5 text-xs pr-1">
                                {filteredList.map((m: any) => {
                                    const name = m.item_name || m.name || '-'
                                    const unit = m.unit_a || m.unit || 'หน่วย'
                                    const price = Number(m.unit_price || m.price || 0)
                                    return (
                                        <label key={m.id} className="flex items-center justify-between bg-[#0B1528] p-2.5 rounded border border-gray-700 cursor-pointer hover:border-teal-500">
                                            <div className="flex items-center gap-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={checkedMaterialIds.includes(m.id)}
                                                    onChange={e => setCheckedMaterialIds(prev => e.target.checked ? [...prev, m.id] : prev.filter(id => id !== m.id))}
                                                    className="w-4 h-4 accent-teal-500"
                                                />
                                                <span className="text-white font-bold">{name}</span>
                                                <span className="text-gray-400">({unit})</span>
                                            </div>
                                            <span className="font-mono text-[#98FB98]">{price.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                                        </label>
                                    )
                                })}
                                {filteredList.length === 0 && (
                                    <div className="text-center text-gray-400 py-8">ไม่พบรายการพัสดุที่ค้นหา</div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                                <button onClick={() => { setPickerReceiptIdx(null); setCatalogSearch('') }} className="px-4 py-2 bg-gray-700 rounded text-xs">ยกเลิก</button>
                                <button onClick={handleImportMaterials} className="px-5 py-2 bg-[#008080] hover:bg-[#006666] rounded text-xs font-bold text-white">นำเข้าที่เลือก ({checkedMaterialIds.length})</button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* === POP-UP แจ้งเตือนวงเงินเกิน 10,000 บาท === */}
            {showLimitAlert && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-[#002B49] border-2 border-red-500 rounded-xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
                        <AlertTriangle className="w-14 h-14 text-red-400 mx-auto" />
                        <h3 className="text-lg font-bold text-red-300">วงเงินรวมเกิน 10,000 บาท!</h3>
                        <p className="text-sm text-gray-200">
                            ยอดรวมปัจจุบันคือ <span className="font-bold text-red-300 font-mono">{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span> ซึ่งเกินเกณฑ์การจัดซื้อจัดจ้างตามหนังสือเวียน <span className="font-bold text-amber-300">ว 119 (ไม่เกิน 10,000 บาท)</span> กรุณาปรับลดรายการหรือใช้วิธีจัดซื้อจัดจ้างปกติแทน
                        </p>
                        <button onClick={() => setShowLimitAlert(false)} className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm">
                            รับทราบและกลับไปแก้ไข
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}