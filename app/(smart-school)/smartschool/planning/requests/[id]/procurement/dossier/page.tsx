'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, Settings2, CheckSquare, Square, FileText, Calculator } from 'lucide-react'
import { getProcurementSetupData } from '../actions'
import { getExecutionSetupData } from '../execution/actions'

const toThaiDate = (dateString?: string | null, shortMonth = false) => {
    if (!dateString) return '......../......../........'
    const d = new Date(dateString)
    const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const monthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    return `${d.getDate()} ${shortMonth ? monthsShort[d.getMonth()] : monthsFull[d.getMonth()]} ${d.getFullYear() + 543}`
}
const ThaiBahtText = (num: number): string => {
    const thb = num.toFixed(2).split('.')
    const numText = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
    const digitText = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
    let result = '', baht = thb[0], satang = thb[1]

    if (Number(baht) === 0) result = 'ศูนย์'
    else {
        const len = baht.length
        for (let i = 0; i < len; i++) {
            const digit = parseInt(baht.charAt(i)), position = len - i - 1
            if (digit !== 0) {
                if (position === 0 && digit === 1 && len > 1) result += 'เอ็ด'
                else if (position === 1 && digit === 1) result += ''
                else if (position === 1 && digit === 2) result += 'ยี่'
                else result += numText[digit]
                result += digitText[position]
            }
        }
    }
    result += 'บาท'
    if (Number(satang) === 0) result += 'ถ้วน'
    else {
        const len = satang.length
        for (let i = 0; i < len; i++) {
            const digit = parseInt(satang.charAt(i)), position = len - i - 1
            if (digit !== 0) {
                if (position === 0 && digit === 1 && len > 1) result += 'เอ็ด'
                else if (position === 1 && digit === 1) result += ''
                else if (position === 1 && digit === 2) result += 'ยี่'
                else result += numText[digit]
                result += digitText[position]
            }
        }
        result += 'สตางค์'
    }
    return result
}

// แปลงเลขที่ใบตรวจรับให้เป็นรูปแบบ "ร 001/2569" เสมอ
const formatInspectionNo = (rawNo?: string | null) => {
    if (!rawNo) return 'ร ......../........'
    if (rawNo.startsWith('ร ')) return rawNo
    const parts = rawNo.split('/')
    if (parts.length === 2 && !isNaN(Number(parts[0]))) {
        return `ร ${String(Number(parts[0])).padStart(3, '0')}/${parts[1]}`
    }
    return `ร ${rawNo}`
}
// แปลงเลขที่ใบเบิกพัสดุให้เป็นรูปแบบ "บ 001/2569" เสมอ
const formatRequisitionNo = (rawNo?: string | null) => {
    if (!rawNo) return 'บ ......../........'
    if (rawNo.startsWith('บ ')) return rawNo
    const parts = rawNo.split('/')
    if (parts.length === 2 && !isNaN(Number(parts[0]))) {
        return `บ ${String(Number(parts[0])).padStart(3, '0')}/${parts[1]}`
    }
    return `บ ${rawNo}`
}

const getProcurementMethodLabel = (method?: string | null) => {
    switch (method) {
        case 'E_MARKET': return 'วิธีตลาดอิเล็กทรอนิกส์ (e-market)'
        case 'E_BIDDING': return 'วิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)'
        case 'SELECTION': return 'วิธีคัดเลือก'
        case 'SPECIFIC':
        default: return 'วิธีเฉพาะเจาะจง'
    }
}
export default function ProcurementDossierPage() {
    const params = useParams()
    const requestId = params.id as string
    const [useThaiNumFont, setUseThaiNumFont] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [procData, setProcData] = useState<any>(null)
    const [execData, setExecData] = useState<any>(null)

    const [selectedDocs, setSelectedDocs] = useState({
        quotation: true,
        evalReport: true,
        announce: true,
        po: true,
        inspection: true,
        requisition: true
    })

    // ตั้งค่าสำหรับส่วนเจ้าหน้าที่การเงิน & ผอ. อนุมัติจ่ายเงิน (แก้ไขได้อิสระ)
    const [hasWithholdingTax, setHasWithholdingTax] = useState(true) // ค่าเริ่มต้น: หักภาษี ณ ที่จ่าย 1%
    const [customWhtAmount, setCustomWhtAmount] = useState<number | null>(null)
    const [penaltyAmount, setPenaltyAmount] = useState<number>(0)
    const [financeDate, setFinanceDate] = useState<string>('')
    const [directorPayDate, setDirectorPayDate] = useState<string>('')

    useEffect(() => {
        const load = async () => {
            if (!requestId) return
            const [pRes, eRes] = await Promise.all([
                getProcurementSetupData(requestId),
                getExecutionSetupData(requestId)
            ])
            if (pRes.success) setProcData(pRes.data)
            if (eRes.success) {
                setExecData(eRes.data)
                const baseInspDate = eRes.data?.existingExecution?.inspection_date || new Date().toISOString().split('T')[0]
                setFinanceDate(baseInspDate)
                setDirectorPayDate(baseInspDate)
            }
            setIsLoading(false)
        }
        load()
    }, [requestId])

    if (isLoading) {
        return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังจัดเตรียมแฟ้มเอกสาร A4 ครบชุด...</div>
    }

    if (!procData?.existingProcurement || !execData?.existingExecution) {
        return (
            <div className="min-h-screen bg-[#0B1528] text-white flex flex-col justify-center items-center gap-4">
                <p className="text-amber-400 font-bold">ยังไม่ได้ตั้งค่าข้อมูลการดำเนินการสั่งซื้อ/สั่งจ้าง</p>
                <Link href={`/smartschool/planning/requests/${requestId}/procurement/execution`} className="px-5 py-2 bg-[#008080] rounded-lg font-bold">
                    ไปหน้าตั้งค่าข้อมูล 6 เอกสาร
                </Link>
            </div>
        )
    }

    const { activity, school, deptInfo, employees, materials, existingProcurement: proc, existingCommittees: committees } = procData
    const { existingExecution: exec, vendors } = execData

    const vendor = (vendors || []).find((v: any) => v.id === exec.vendor_id)
    const schoolName = school?.name || 'โรงเรียน...'
    const originDeptName = [deptInfo?.subdepartment_name, deptInfo?.department_name].filter(Boolean).join(' ') || 'งานต้นเรื่อง'

    const isBuy = proc.procurement_type === 'BUY'
    const isConstruction = proc.procurement_type === 'CONSTRUCTION'
    const methodLabel = getProcurementMethodLabel(proc.procurement_method) // <--- เพิ่มบรรทัดนี้ครับ
    const actionWord = isBuy ? 'ซื้อ' : 'จ้าง'
    const docTypePO = isBuy ? 'ใบสั่งซื้อ' : 'ใบสั่งจ้าง'
    const docTypeInspect = isBuy ? 'ใบตรวจรับพัสดุ' : 'ใบตรวจรับงานจ้าง'
    const inspectClause = isConstruction ? 'ข้อ 176(4)' : 'ข้อ 175(4)'

    const getEmp = (empCode?: string | null) => {
        const emp = (employees || []).find((e: any) => e.emp_code === empCode)
        if (!emp) return { fullName: '........................................', position: 'ครู' }
        return {
            fullName: `${emp.prefix || ''}${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            position: emp.position_title || emp.academic_standing || 'ครู'
        }
    }

    const directorEmp = (employees || []).find((e: any) => (e.role_name || '') === 'ผู้อำนวยการโรงเรียน')
    const directorName = directorEmp ? `${directorEmp.prefix || ''}${directorEmp.first_name} ${directorEmp.last_name}` : '........................................'

    const financeEmp = (employees || []).find((e: any) => (e.role_name || '').includes('การเงิน'))
    const financeName = financeEmp ? `${financeEmp.prefix || ''}${financeEmp.first_name} ${financeEmp.last_name}` : '........................................'

    const officer = getEmp(proc.officer_emp_code)
    const headOfficer = getEmp(proc.head_officer_emp_code)
    const requester = getEmp(exec.requester_emp_code)

    const purchaseList = (committees || []).filter((c: any) => c.committee_group === 'PURCHASE_COMMITTEE')
    const inspectList = (committees || []).filter((c: any) => c.committee_group === 'INSPECTION')

    // คำนวณยอดการเงิน (สำหรับหน้า 2 ใบตรวจรับ)
    const netAmount = Number(exec.net_amount || proc.total_budget || 0)
    const vatAmount = Number(exec.vat_amount || 0)
    const beforeVat = exec.vat_mode === 'INCLUDE_7' ? Number((netAmount - vatAmount).toFixed(2)) : Number(exec.quoted_total || netAmount)
    const autoWht = hasWithholdingTax ? Number((beforeVat * 0.01).toFixed(2)) : 0
    const whtAmount = hasWithholdingTax ? (customWhtAmount !== null ? customWhtAmount : autoWht) : 0
    const finalPayAmount = Math.max(0, Number((netAmount - whtAmount - penaltyAmount).toFixed(2)))


    const pageStyle = {
       fontFamily: useThaiNumFont
            ? "'TH Sarabun IT๙', 'TH SarabunIT๙', 'THSarabunIT9', 'TH SarabunIT9', 'TH SarabunPSK', serif"
            : "'TH SarabunPSK', 'TH Sarabun New', serif",
        paddingTop: '25mm',
        paddingBottom: '20mm',
        paddingLeft: '30mm',
        paddingRight: '20mm',
        fontSize: '15.5pt',
        lineHeight: 1.15
    }

    const toggleDoc = (key: keyof typeof selectedDocs) => {
        setSelectedDocs(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const docOptions: { key: keyof typeof selectedDocs; label: string; show: boolean }[] = [
        { key: 'quotation', label: '1. ใบเสนอราคา', show: true },
        { key: 'evalReport', label: '2. รายงานผลการพิจารณา', show: true },
        { key: 'announce', label: '3. ประกาศผู้ชนะฯ', show: true },
        { key: 'po', label: `4. ${docTypePO} (PO)`, show: true },
        { key: 'inspection', label: `5. ${docTypeInspect} (2 หน้า)`, show: true },
        { key: 'requisition', label: '6. ใบเบิกพัสดุ', show: isBuy }
    ]

    return (
        <div className="min-h-screen bg-[#0B1528] p-4 md:p-6 flex flex-col items-center font-sans pb-20">

            {/* === TOOLBAR ควบคุมการเลือกเอกสาร การเงิน และการพิมพ์ (ซ่อนเมื่อพิมพ์) === */}
            <div className="w-full max-w-[210mm] mb-6 bg-[#002B49] p-4 rounded-xl border border-[#008080]/50 shadow-xl print:hidden space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#0B1528] px-2.5 py-1.5 rounded-lg border border-teal-500/50">
                            <div className="w-7 h-7 rounded bg-gradient-to-br from-teal-400 to-[#008080] flex items-center justify-center font-black text-[#0B1528] text-sm">N</div>
                            <span className="text-xs font-bold text-[#98FB98]">NiiVaa SmartSchool</span>
                        </div>
                        <span className="text-white font-bold text-sm">แฟ้มเอกสารดำเนินการพัสดุ (A4)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/smartschool/planning/requests/${requestId}/procurement/execution`} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs border border-gray-600 flex items-center gap-1">
                            <Settings2 className="w-4 h-4" /> แก้ไขข้อมูล
                        </Link>
                        <Link href={`/smartschool/planning/requests/${requestId}/procurement/preview`} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs border border-gray-600 flex items-center gap-1">
                            <FileText className="w-4 h-4" /> รายงาน/คำสั่ง (ชุดที่ 1)
                        </Link>
                        <button
                            type="button"
                            onClick={() => setUseThaiNumFont(prev => !prev)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${useThaiNumFont
                                ? 'bg-amber-600 text-white border-amber-300'
                                : 'bg-[#0B1528] text-teal-300 border-teal-500/50 hover:bg-gray-800'
                                }`}
                        >
                            ฟอนต์: {useThaiNumFont ? 'TH SarabunIT๙ (เลขไทย)' : 'TH SarabunPSK (เลขอารบิก)'}
                        </button>
                        <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg">
                            <Printer className="w-4 h-4" /> พิมพ์ / บันทึก PDF
                        </button>
                    </div>
                </div>

                {/* แถบติ๊กเลือกเอกสาร */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                    {docOptions.filter(d => d.show).map(doc => (
                        <button
                            key={doc.key}
                            onClick={() => toggleDoc(doc.key)}
                            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 border ${selectedDocs[doc.key] ? 'bg-[#008080] text-white border-[#98FB98]/60' : 'bg-[#0B1528] text-gray-400 border-gray-700'}`}
                        >
                            {selectedDocs[doc.key] ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            {doc.label}
                        </button>
                    ))}
                </div>

                {/* แผงปรับแก้สำหรับเจ้าหน้าที่การเงิน & วันที่อนุมัติจ่ายเงิน (ใบตรวจรับ หน้า 2) */}
                {selectedDocs.inspection && (
                    <div className="bg-[#0B1528] p-3 rounded-lg border border-teal-500/40 text-xs text-gray-200 space-y-2">
                        <div className="font-bold text-[#98FB98] flex items-center gap-1.5">
                            <Calculator className="w-4 h-4" /> ตั้งค่าส่วนเจ้าหน้าที่การเงิน &amp; ผอ. อนุมัติจ่ายเงิน (ใบตรวจรับ หน้า 2)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <label className="flex items-center gap-2 cursor-pointer bg-[#002B49] px-2.5 py-2 rounded border border-gray-700">
                                <input
                                    type="checkbox"
                                    checked={hasWithholdingTax}
                                    onChange={e => { setHasWithholdingTax(e.target.checked); setCustomWhtAmount(null) }}
                                    className="w-4 h-4 accent-teal-500"
                                />
                                <span>หักภาษี ณ ที่จ่าย (1%)</span>
                            </label>
                            <div>
                                <span className="text-[11px] text-gray-400 block mb-0.5">ยอดภาษีหัก ณ ที่จ่าย (บาท)</span>
                                <input
                                    type="number" step="0.01" disabled={!hasWithholdingTax}
                                    value={hasWithholdingTax ? whtAmount : 0}
                                    onChange={e => setCustomWhtAmount(Number(e.target.value))}
                                    className="w-full bg-[#002B49] border border-gray-600 rounded px-2 py-1.5 text-white font-mono disabled:opacity-40"
                                />
                            </div>
                            <div>
                                <span className="text-[11px] text-gray-400 block mb-0.5">ค่าปรับ (บาท) — 0 = ไม่มีค่าปรับ</span>
                                <input
                                    type="number" step="0.01" min={0}
                                    value={penaltyAmount}
                                    onChange={e => setPenaltyAmount(Math.max(0, Number(e.target.value)))}
                                    className="w-full bg-[#002B49] border border-gray-600 rounded px-2 py-1.5 text-white font-mono"
                                />
                            </div>
                            <div>
                                <span className="text-[11px] text-amber-300 block mb-0.5">วันที่อนุมัติจ่ายเงิน (ผอ.)</span>
                                <input
                                    type="date"
                                    value={directorPayDate}
                                    onChange={e => { setDirectorPayDate(e.target.value); setFinanceDate(e.target.value) }}
                                    className="w-full bg-[#E8F8F5] text-[#002B49] font-bold rounded px-2 py-1"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ===================================================================== */}
            {/* === 1. ใบเสนอราคา (แสดงยี่ห้อพัสดุครบ) === */}
            {/* ===================================================================== */}
            {selectedDocs.quotation && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={pageStyle}>
                    <div className="text-center font-bold text-[20pt] mb-1">ใบเสนอราคา</div>
                    <div className="text-right mb-3">
                        <div>เขียนที่ {vendor?.vendor_name || '........................................'}</div>
                        <div>วันที่ {toThaiDate(exec.quotation_date)}</div>
                    </div>

                    <div className="mb-2">เรียน ผู้อำนวยการ{schoolName}</div>
                    <div className="indent-[2.5cm] text-justify mb-3">
                        ข้าพเจ้า {vendor?.vendor_name || '........................................'} อยู่บ้านเลขที่/ที่อยู่ {vendor?.address || '-'} เลขประจำตัวผู้เสียภาษี {vendor?.tax_id || '-'} โทรศัพท์ {vendor?.phone || '-'} ขอเสนอราคา{actionWord}พัสดุสำหรับกิจกรรม{activity?.activity_name || '-'} ดังรายการต่อไปนี้
                    </div>

                    <table className="w-full border-collapse border border-black text-[14pt] mb-3">
                        <thead>
                            <tr className="text-center">
                                <th className="border border-black p-1 w-[8%]">ลำดับ</th>
                                <th className="border border-black p-1">รายการ</th>
                                <th className="border border-black p-1 w-[10%]">จำนวน</th>
                                <th className="border border-black p-1 w-[10%]">หน่วย</th>
                                <th className="border border-black p-1 w-[15%]">ราคาต่อหน่วย</th>
                                <th className="border border-black p-1 w-[17%]">จำนวนเงิน (บาท)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map((m: any, idx: number) => (
                                <tr key={m.id}>
                                    <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                    <td className="border border-black px-1.5 py-0.5">{m.item_name}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.qty_a}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.unit_a}</td>
                                    <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {exec.vat_mode !== 'NONE' && (
                                <>
                                    <tr>
                                        <td colSpan={5} className="border border-black px-2 py-0.5 text-right">ราคาก่อนภาษีมูลค่าเพิ่ม</td>
                                        <td className="border border-black px-1.5 py-0.5 text-right">{beforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={5} className="border border-black px-2 py-0.5 text-right">ภาษีมูลค่าเพิ่ม 7%</td>
                                        <td className="border border-black px-1.5 py-0.5 text-right">{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </>
                            )}
                            <tr className="font-bold">
                                <td colSpan={5} className="border border-black px-2 py-1 text-right">รวมเป็นเงินทั้งสิ้น ({ThaiBahtText(netAmount)})</td>
                                <td className="border border-black px-1.5 py-1 text-right">{netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="indent-[2.5cm] mb-8">
                        ราคานี้เป็นราคาที่ยืนราคาอยู่ได้ไม่น้อยกว่า {exec.credit_days || 30} วัน นับแต่วันเสนอราคา และพร้อมส่งมอบภายในกำหนด
                    </div>

                    <div style={{ paddingLeft: '50%' }}>
                        <div className="inline-block text-center">
                            <p className="mb-5">ลงชื่อ ............................................. ผู้เสนอราคา</p>
                            <p>({vendor?.vendor_name || '........................................'})</p>
                            <p>วันที่ {toThaiDate(exec.quotation_date, true)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* === 2. รายงานผลการพิจารณาและขออนุมัติสั่งซื้อ/สั่งจ้าง === */}
            {/* ===================================================================== */}
            {selectedDocs.evalReport && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={{ ...pageStyle, fontSize: '15pt', lineHeight: 1.12 }}>
                    <div className="relative flex items-end mb-3" style={{ height: '1.5cm' }}>
                        <div className="absolute left-0 bottom-0">
                            <img src="/krut.png" alt="ตราครุฑ" style={{ height: '1.5cm', width: 'auto', objectFit: 'contain' }} />
                        </div>
                        <div className="w-full text-center">
                            <h1 className="font-bold leading-none" style={{ fontSize: '29pt', marginBottom: '-4px' }}>บันทึกข้อความ</h1>
                        </div>
                    </div>

                    <div className="space-y-0.5 mb-3">
                        <div><span className="font-bold text-[19pt] mr-3">ส่วนราชการ</span>{schoolName}</div>
                        <div className="flex justify-between">
                            <div><span className="font-bold text-[19pt] mr-3">ที่</span>{proc.report_no || 'งปม. ............'}</div>
                            <div className="w-[50%]"><span className="font-bold text-[19pt] mr-3">วันที่</span>{toThaiDate(exec.eval_report_date)}</div>
                        </div>
                        <div><span className="font-bold text-[19pt] mr-3">เรื่อง</span>รายงานผลการพิจารณาและขออนุมัติสั่ง{actionWord}</div>
                        <div><span className="font-bold text-[19pt] mr-3">เรียน</span>ผู้อำนวยการ{schoolName}</div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-2">
                        ตามที่ {schoolName} ได้เห็นชอบรายงานขอซื้อขอจ้าง ที่ {proc.report_no} ลงวันที่ {toThaiDate(proc.report_date)} และแต่งตั้งคณะกรรมการซื้อหรือจ้างโดย{methodLabel} ตามคำสั่ง ที่ {proc.order_no} ลงวันที่ {toThaiDate(proc.order_date)} เพื่อดำเนินการ{actionWord}พัสดุสำหรับกิจกรรม{activity?.activity_name || '-'} วงเงินงบประมาณ {Number(proc.total_budget || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท นั้น
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-2">
                        บัดนี้ คณะกรรมการฯ ได้ดำเนินการเจรจาตกลงราคากับ {vendor?.vendor_name || '........................................'} แล้ว ปรากฏว่าผู้เสนอราคาดังกล่าวมีคุณสมบัติถูกต้องครบถ้วน และเสนอราคาเป็นเงินทั้งสิ้น {netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({ThaiBahtText(netAmount)}) ซึ่งไม่เกินวงเงินงบประมาณและราคากลางที่กำหนดไว้ จึงเห็นควรรับราคาและอนุมัติสั่ง{actionWord}จากผู้เสนอราคาดังกล่าว
                    </div>

                    <div className="indent-[2.5cm] mb-3">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</div>

                    {/* ลายเซ็นคณะกรรมการซื้อหรือจ้าง (เลื่อนไปทางขวาเพิ่ม 2 cm -> 3.5cm) */}
                    <div className="space-y-2.5 mb-5" style={{ paddingLeft: '3.5cm' }}>
                        {purchaseList.map((c: any, idx: number) => {
                            const emp = getEmp(c.emp_code)
                            return (
                                <div key={c.id} className="flex items-start">
                                    <span className="mr-1 whitespace-nowrap">ลงชื่อ</span>
                                    <div className="flex flex-col items-center text-center" style={{ width: '4.5cm' }}>
                                        <div>..............................................</div>
                                        <div className="whitespace-nowrap">({emp.fullName})</div>
                                    </div>
                                    <span className="ml-2 whitespace-nowrap">{idx === 0 ? 'ประธานกรรมการ' : 'กรรมการ'}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* ความเห็นหัวหน้าเจ้าหน้าที่ + ผอ. อนุมัติ */}
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-400">
                        <div className="flex flex-col items-center text-center">
                            <div className="font-bold mb-3">โปรดทราบและพิจารณาอนุมัติ</div>
                            <p className="mb-4">ลงชื่อ .............................................</p>
                            <p>({headOfficer.fullName})</p>
                            <p>หัวหน้าเจ้าหน้าที่</p>
                            <p>{toThaiDate(exec.eval_report_date, true)}</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="font-bold mb-3">( &nbsp; ) เห็นชอบ / อนุมัติ</div>
                            <p className="mb-4">ลงชื่อ .............................................</p>
                            <p>({directorName})</p>
                            <p>ผู้อำนวยการ{schoolName}</p>
                            <p>{toThaiDate(exec.eval_report_date, true)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* === 3. ประกาศผู้ชนะการเสนอราคา (ครุฑ 3 ซม.) === */}
            {/* ===================================================================== */}
            {selectedDocs.announce && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={pageStyle}>
                    <div className="flex flex-col items-center mb-5">
                        <img src="/krut.png" alt="ตราครุฑ" style={{ height: '3cm', width: 'auto', display: 'block', margin: '0 auto 8px auto', objectFit: 'contain' }} />
                        <div className="font-bold text-[16.5pt]">ประกาศ{schoolName}</div>
                        <div className="font-bold text-center">เรื่อง ประกาศผู้ชนะการเสนอราคา {actionWord}พัสดุสำหรับกิจกรรม{activity?.activity_name || '-'} โดย{methodLabel}</div>
                        <div style={{ width: '6cm', borderBottom: '1px solid black', marginTop: '8px' }}></div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-4">
                        ตามที่ {schoolName} ได้มีโครงการ{actionWord}พัสดุสำหรับกิจกรรม{activity?.activity_name || '-'} โดย{methodLabel} นั้น
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-8">
                        {actionWord}พัสดุสำหรับกิจกรรม{activity?.activity_name || '-'} จำนวน {materials.length || 1} รายการ ผู้ได้รับการคัดเลือก ได้แก่ <span className="font-bold">{vendor?.vendor_name || '........................................'}</span> โดยเสนอราคา เป็นเงินทั้งสิ้น <span className="font-bold">{netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</span> ({ThaiBahtText(netAmount)}) {exec.vat_mode !== 'NONE' ? 'รวมภาษีมูลค่าเพิ่มและภาษีอื่น ค่าขนส่ง ค่าจดทะเบียน และค่าใช้จ่ายอื่นๆ ทั้งปวง' : 'ซึ่งเป็นราคาที่รวมค่าใช้จ่ายอื่นๆ ทั้งปวงแล้ว'}
                    </div>

                    <div className="mb-8" style={{ paddingLeft: '5cm' }}>
                        ประกาศ ณ วันที่ {toThaiDate(exec.announce_date)}
                    </div>

                    <div style={{ paddingLeft: '50%', marginTop: '4mm' }}>
                        <div className="inline-block text-center">
                            <p className="mb-5">ลงชื่อ .............................................</p>
                            <p>({directorName})</p>
                            <p>ผู้อำนวยการ{schoolName}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* === 4. ใบสั่งซื้อ / ใบสั่งจ้าง (PO) — แสดงยี่ห้อพัสดุครบ === */}
            {/* ===================================================================== */}
            {selectedDocs.po && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={pageStyle}>
                    <div className="text-center font-bold text-[20pt] mb-2">{docTypePO}</div>
                    <div className="flex justify-between mb-3">
                        <div>
                            <div><span className="font-bold">ผู้ขาย/ผู้รับจ้าง:</span> {vendor?.vendor_name || '-'}</div>
                            <div><span className="font-bold">ที่อยู่:</span> {vendor?.address || '-'}</div>
                            <div><span className="font-bold">เลขประจำตัวผู้เสียภาษี:</span> {vendor?.tax_id || '-'}</div>
                        </div>
                        <div className="text-right">
                            <div><span className="font-bold">เลขที่:</span> {exec.po_no || '......../........'}</div>
                            <div><span className="font-bold">วันที่:</span> {toThaiDate(exec.po_date)}</div>
                            <div><span className="font-bold">ส่วนราชการ:</span> {schoolName}</div>
                        </div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-2">
                        ตามที่ {vendor?.vendor_name || '-'} ได้เสนอราคาไว้ต่อ {schoolName} ซึ่งได้รับราคาและตกลง{actionWord} ตามรายการดังต่อไปนี้
                    </div>

                    <table className="w-full border-collapse border border-black text-[13.5pt] mb-3">
                        <thead>
                            <tr className="text-center">
                                <th className="border border-black p-1 w-[8%]">ลำดับ</th>
                                <th className="border border-black p-1">รายการ</th>
                                <th className="border border-black p-1 w-[10%]">จำนวน</th>
                                <th className="border border-black p-1 w-[10%]">หน่วย</th>
                                <th className="border border-black p-1 w-[15%]">ราคาต่อหน่วย</th>
                                <th className="border border-black p-1 w-[17%]">จำนวนเงิน (บาท)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map((m: any, idx: number) => (
                                <tr key={m.id}>
                                    <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                    <td className="border border-black px-1.5 py-0.5">{m.item_name}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.qty_a}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.unit_a}</td>
                                    <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            <tr className="font-bold">
                                <td colSpan={5} className="border border-black px-2 py-1 text-right">รวมเป็นเงินทั้งสิ้น ({ThaiBahtText(netAmount)})</td>
                                <td className="border border-black px-1.5 py-1 text-right">{netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="text-[14pt] space-y-0.5 mb-8">
                        <div className="font-bold">เงื่อนไขการ{actionWord}:</div>
                        <div>1. กำหนดส่งมอบภายในวันที่ {toThaiDate(proc.delivery_due_date)} ณ {schoolName}</div>
                        <div>2. หากส่งมอบล่าช้ากว่ากำหนด ผู้ขาย/ผู้รับจ้างต้องชำระค่าปรับเป็นรายวันตามระเบียบกระทรวงการคลังฯ</div>
                        {exec.warranty_days > 0 && <div>3. รับประกันความชำรุดบกพร่องเป็นเวลา {exec.warranty_days} วัน นับถัดจากวันที่ตรวจรับ</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center text-[14.5pt]">
                        <div>
                            <p className="mb-5">ลงชื่อ ............................................. ผู้สั่ง{actionWord}</p>
                            <p>({directorName})</p>
                            <p>ผู้อำนวยการ{schoolName}</p>
                            <p>วันที่ {toThaiDate(exec.po_date, true)}</p>
                        </div>
                        <div>
                            <p className="mb-5">ลงชื่อ ............................................. ผู้รับใบสั่ง{actionWord}</p>
                            <p>({vendor?.vendor_name || '........................................'})</p>
                            <p>ผู้ขาย / ผู้รับจ้าง</p>
                            <p>วันที่ {toThaiDate(exec.po_date, true)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* === 5. ใบตรวจรับพัสดุ (2 หน้า A4 — จัดวางลายเซ็นอัตโนมัติตามพื้นที่) === */}
            {/* ===================================================================== */}
            {selectedDocs.inspection && (() => {
                // ถ้ารายการพัสดุ <= 8 รายการ ถือว่าเหลือพื้นที่พอ ให้ดึงลายเซ็น กก.ตรวจรับ ไว้หน้า 1
                const fitInspectSignOnPage1 = materials.length <= 8

                return (
                    <>
                        {/* ใบตรวจรับ หน้า 1 */}
                        <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={{ ...pageStyle, fontSize: '15pt', lineHeight: 1.15 }}>
                            <div className="text-center font-bold text-[20pt] mb-1">{docTypeInspect}</div>
                            <div className="text-right font-bold">{formatInspectionNo(exec.inspection_no)}</div>
                            <div className="text-right">ที่ {schoolName}</div>
                            <div className="text-center mb-3">วันที่ {toThaiDate(exec.inspection_date)}</div>

                            <div className="space-y-0.5 mb-2 text-justify">
                                <div className="indent-[1.5cm]">
                                    ตามที่{schoolName} ได้สั่ง{actionWord}พัสดุ จาก {vendor?.vendor_name || '-'} เพื่อใช้ในกิจกรรม{activity?.activity_name || '-'} ตาม{docTypePO} เลขที่ {exec.po_no || '-'} ลงวันที่ {toThaiDate(exec.po_date)}
                                </div>
                                <div>
                                    ผู้ขาย/ผู้รับจ้าง ได้ส่งของตามใบส่งของ/ใบส่งมอบงาน เลขที่ {exec.delivery_note_no || '................'} ลงวันที่ {toThaiDate(exec.delivery_date)} ให้ไว้แก่{schoolName} เมื่อวันที่ {toThaiDate(exec.delivery_date)} ตามรายการต่อไปนี้
                                </div>
                            </div>

                            <table className="w-full border-collapse border border-black text-[14pt] mb-3">
                                <thead>
                                    <tr className="text-center">
                                        <th className="border border-black p-1 w-[8%]">ลำดับที่</th>
                                        <th className="border border-black p-1">รายการพัสดุ</th>
                                        <th className="border border-black p-1 w-[9%]">จำนวน</th>
                                        <th className="border border-black p-1 w-[10%]">หน่วย</th>
                                        <th className="border border-black p-1 w-[15%]">ราคาต่อหน่วย (บาท)</th>
                                        <th className="border border-black p-1 w-[16%]">จำนวนเงิน (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {materials.map((m: any, idx: number) => (
                                        <tr key={m.id}>
                                            <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                            <td className="border border-black px-1.5 py-0.5">{m.item_name}</td>
                                            <td className="border border-black px-1 py-0.5 text-center">{m.qty_a}</td>
                                            <td className="border border-black px-1 py-0.5 text-center">{m.unit_a}</td>
                                            <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-bold">
                                        <td colSpan={5} className="border border-black px-2 py-1 text-right">รวมเงิน ({ThaiBahtText(netAmount)})</td>
                                        <td className="border border-black px-1.5 py-1 text-right">{netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="space-y-1">
                                <div>พัสดุตามรายการข้างต้นนี้ ได้ตรวจรับพัสดุแล้ว ดังนี้</div>
                                <div className="pl-8 space-y-0.5">
                                    <div>1. ได้ทำการตรวจรับ ณ {schoolName}</div>
                                    <div>2. ได้ตรวจรับหรือทดลองถูกต้องแล้ว เมื่อวันที่ {toThaiDate(exec.inspection_date)}</div>
                                    <div>
                                        3. ให้ถือว่าพัสดุถูกต้องครบถ้วนเมื่อวันที่ {toThaiDate(exec.inspection_date)}{' '}
                                        <span className="font-bold">
                                            ({penaltyAmount > 0 ? `มีค่าปรับ เป็นเงิน ${penaltyAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : 'ไม่มีค่าปรับ'})
                                        </span>
                                    </div>
                                    <div>4. ได้มอบให้แก่เจ้าหน้าที่ ({officer.fullName}) ไว้แล้ว</div>
                                    <div>5. ได้เชิญผู้ชำนาญการหรือผู้ทรงคุณวุฒิมาปรึกษาด้วย คือ -</div>
                                </div>
                                <div className="indent-[1.5cm] pt-1 text-justify">
                                    จึงรายงานต่อผู้อำนวยการ{schoolName} เพื่อโปรดทราบผลการตรวจรับตามระเบียบกระทรวงการคลัง ว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 {inspectClause}
                                </div>
                            </div>

                            {/* กรณีเหลือพื้นที่ว่างพอ: นำลายเซ็นคณะกรรมการตรวจรับ / ผู้ตรวจรับ มาไว้ท้ายหน้า 1 */}
                            {fitInspectSignOnPage1 && (
                                <div className="mt-6 space-y-4" style={{ paddingLeft: '45%' }}>
                                    {inspectList.map((c: any, idx: number) => {
                                        const emp = getEmp(c.emp_code)
                                        const roleLabel = proc.inspector_type === 'SINGLE'
                                            ? 'ผู้ตรวจรับพัสดุ'
                                            : (idx === 0 ? 'ประธานกรรมการตรวจรับพัสดุ' : 'กรรมการตรวจรับพัสดุ')
                                        return (
                                            <div key={c.id} className="text-center">
                                                <p>ลงชื่อ ...................................................</p>
                                                <p>({emp.fullName})</p>
                                                <p>{roleLabel}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ใบตรวจรับ หน้า 2 */}
                        <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={{ ...pageStyle, fontSize: '14.5pt', lineHeight: 1.15 }}>
                            <div className="text-center font-bold border-b border-black pb-2 mb-4">
                                {docTypeInspect}ตามวันที่ในใบส่งของ/ใบส่งมอบงาน เลขที่ {exec.delivery_note_no || '................'} ลงวันที่ {toThaiDate(exec.delivery_date)} (หน้า 2)
                            </div>

                            {/* ครึ่งบน: ปรับตามเงื่อนไขพื้นที่หน้า 1 */}
                            {fitInspectSignOnPage1 ? (
                                /* กรณี กก.ตรวจรับอยู่หน้า 1 แล้ว: วาง เจ้าหน้าที่ (ซ้าย) คู่กับ หัวหน้าเจ้าหน้าที่ (ขวา) ไม่มีเส้นคั่นกลาง */
                                <div className="grid grid-cols-2 gap-6 border-b border-black pb-5 mb-4 text-center">
                                    <div className="flex flex-col justify-between">
                                        <div className="mb-5">ได้รับพัสดุข้างต้นจาก{proc.inspector_type === 'SINGLE' ? 'ผู้ตรวจรับพัสดุ' : 'คณะกรรมการตรวจรับพัสดุ'}ไว้แล้ว</div>
                                        <div>
                                            <p>ลงชื่อ ...................................................</p>
                                            <p>({officer.fullName})</p>
                                            <p>ครู/เจ้าหน้าที่</p>
                                            <p>{toThaiDate(exec.inspection_date, true)}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between">
                                        <div>
                                            <div className="mb-0.5">เรียน ผู้อำนวยการ{schoolName} ผ่านเจ้าหน้าที่การเงิน</div>
                                            <div className="mb-3">เพื่อโปรดทราบผลการตรวจรับ</div>
                                        </div>
                                        <div>
                                            <p>ลงชื่อ ...................................................</p>
                                            <p>({headOfficer.fullName})</p>
                                            <p>ครู/หัวหน้าเจ้าหน้าที่</p>
                                            <p>{toThaiDate(exec.inspection_date, true)}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* กรณีรายการเยอะ (>8 รายการ): วาง กก.ตรวจรับ (ซ้าย) คั่นกลางกับ จนท./หัวหน้า จนท. (ขวา) */
                                <div className="grid grid-cols-2 border-b border-black pb-4 mb-4">
                                    <div className="pr-4 border-r border-black flex flex-col justify-around space-y-4">
                                        {inspectList.map((c: any, idx: number) => {
                                            const emp = getEmp(c.emp_code)
                                            const roleLabel = proc.inspector_type === 'SINGLE'
                                                ? 'ผู้ตรวจรับพัสดุ'
                                                : (idx === 0 ? 'ประธานกรรมการตรวจรับพัสดุ' : 'กรรมการตรวจรับพัสดุ')
                                            return (
                                                <div key={c.id} className="text-center">
                                                    <p>ลงชื่อ ...................................................</p>
                                                    <p>({emp.fullName})</p>
                                                    <p>{roleLabel}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="pl-4 flex flex-col justify-between space-y-4 text-center">
                                        <div>
                                            <div className="mb-3">ได้รับพัสดุข้างต้นจากคณะกรรมการตรวจรับพัสดุไว้แล้ว</div>
                                            <p>ลงชื่อ ...................................................</p>
                                            <p>({officer.fullName})</p>
                                            <p>ครู/เจ้าหน้าที่</p>
                                            <p>{toThaiDate(exec.inspection_date, true)}</p>
                                        </div>
                                        <div className="border-t border-dashed border-gray-400 pt-3">
                                            <div className="text-left mb-1">เรียน ผู้อำนวยการ{schoolName} ผ่านเจ้าหน้าที่การเงิน</div>
                                            <div className="mb-3">เพื่อโปรดทราบผลการตรวจรับ</div>
                                            <p>ลงชื่อ ...................................................</p>
                                            <p>({headOfficer.fullName})</p>
                                            <p>ครู/หัวหน้าเจ้าหน้าที่</p>
                                            <p>{toThaiDate(exec.inspection_date, true)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ครึ่งล่าง: ส่วนเจ้าหน้าที่การเงิน */}
                            <div className="space-y-1.5">
                                {/* แถวบนสุด: รหัสกิจกรรม + เลขที่ใบตรวจรับพัสดุ แถวเดียวกันก่อนเริ่มความเห็น จนท.การเงิน */}
                                <div className="flex justify-between items-baseline mb-1">
                                    <div className="font-bold">เรียน ผู้อำนวยการ{schoolName}</div>
                                    <div className="font-bold text-[14pt]">
                                        รหัสกิจกรรม {activity?.activity_code || '-'} &nbsp;&nbsp;&nbsp; เลขที่ใบตรวจรับพัสดุ {formatInspectionNo(exec.inspection_no)}
                                    </div>
                                </div>

                                {/* บล็อกรายละเอียดเยื้องไปทางขวาให้เป็นระเบียบ */}
                                <div style={{ paddingLeft: '1.8cm' }} className="space-y-1">
                                    <div>ได้ตรวจสอบหลักฐานถูกต้องแล้ว</div>
                                    <div>
                                        เห็นสมควรอนุมัติให้จ่ายเงินจำนวน <span className="font-bold">{netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span> บาท ({activity?.fund_type || 'เงินอุดหนุนรายหัว'})
                                    </div>

                                    <div className="pt-1">
                                        <div className="font-bold mb-1">รายละเอียดดังนี้</div>
                                        <table className="w-[82%] ml-4">
                                            <tbody>
                                                <tr>
                                                    <td className="w-[55%]">มูลค่าสินค้า/บริการ</td>
                                                    <td className="text-right pr-2">{beforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td className="w-[12%]">บาท</td>
                                                </tr>
                                                <tr>
                                                    <td><span className="font-bold">บวก</span> ภาษีมูลค่าเพิ่ม 7%</td>
                                                    <td className="text-right pr-2">{vatAmount > 0 ? vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
                                                    <td>บาท</td>
                                                </tr>
                                                <tr className="border-t border-black">
                                                    <td>จำนวนเงินที่ขอเบิก</td>
                                                    <td className="text-right pr-2 font-bold">{netAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td>บาท</td>
                                                </tr>
                                                <tr>
                                                    <td><span className="font-bold">หัก</span> ภาษีเงินได้หัก ณ ที่จ่าย</td>
                                                    <td className="text-right pr-2">{whtAmount > 0 ? whtAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
                                                    <td>บาท</td>
                                                </tr>
                                                <tr>
                                                    <td>ค่าปรับ</td>
                                                    <td className="text-right pr-2">{penaltyAmount > 0 ? penaltyAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</td>
                                                    <td>บาท</td>
                                                </tr>
                                                <tr className="border-t border-b-2 border-black font-bold">
                                                    <td>คงเหลือจ่ายจริง</td>
                                                    <td className="text-right pr-2">{finalPayAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                    <td>บาท</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="text-center w-[82%] ml-4 mt-1 font-bold">({ThaiBahtText(finalPayAmount)})</div>
                                    </div>
                                </div>

                                {/* ลายเซ็นเจ้าหน้าที่การเงิน */}
                                <div className="pt-4" style={{ paddingLeft: '35%' }}>
                                    <div className="flex items-start">
                                        <span className="mr-1 whitespace-nowrap">ลงชื่อ</span>
                                        <div className="flex flex-col items-center text-center" style={{ width: '4.2cm' }}>
                                            <div>...........................................</div>
                                            <div className="whitespace-nowrap">({financeName})</div>
                                            <div>{toThaiDate(financeDate, true)}</div>
                                        </div>
                                        <span className="ml-1 whitespace-nowrap">ครู/เจ้าหน้าที่การเงิน</span>
                                    </div>
                                </div>

                                {/* ส่วน ผอ. อนุมัติจ่ายเงิน */}
                                <div className="pt-4 flex flex-col items-center">
                                    <div className="font-bold mb-2">
                                        <div>( &nbsp; ) 1. ทราบ</div>
                                        <div>( &nbsp; ) 2. อนุมัติจ่ายเงิน</div>
                                    </div>
                                    <div className="flex items-start mt-2">
                                        <span className="mr-1 whitespace-nowrap">ลงชื่อ</span>
                                        <div className="flex flex-col items-center text-center" style={{ width: '4.8cm' }}>
                                            <div>..................................................</div>
                                            <div className="whitespace-nowrap">({directorName})</div>
                                            <div>{toThaiDate(directorPayDate, true)}</div>
                                        </div>
                                        <span className="ml-1 whitespace-nowrap">ผู้อำนวยการ{schoolName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )
            })()}

            {/* ===================================================================== */}
            {/* === 6. ใบเบิกพัสดุ (เลขที่ บ 001/2569 + ส่วนท้าย 2 คอลัมน์ตามแบบ) === */}
            {/* ===================================================================== */}
            {isBuy && selectedDocs.requisition && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0" style={{ ...pageStyle, fontSize: '15pt', lineHeight: 1.15 }}>
                    <div className="text-center font-bold text-[20pt] mb-1">ใบเบิกพัสดุ</div>
                    <div className="flex justify-between mb-3">
                        <div>ส่วนราชการ: {schoolName}</div>
                        <div className="font-bold">เลขที่ {formatRequisitionNo(exec.requisition_no)} &nbsp;&nbsp; วันที่ {toThaiDate(exec.requisition_date)}</div>
                    </div>

                    <div className="indent-[2.5cm] mb-3">
                        ข้าพเจ้า {requester.fullName} ตำแหน่ง {requester.position} สังกัด {originDeptName} ขอเบิกพัสดุเพื่อใช้ในกิจกรรม{activity?.activity_name || '-'} ดังรายการต่อไปนี้
                    </div>

                    <table className="w-full border-collapse border border-black text-[14pt] mb-6">
                        <thead>
                            <tr className="text-center">
                                <th className="border border-black p-1 w-[8%]">ลำดับ</th>
                                <th className="border border-black p-1">รายการพัสดุ</th>
                                <th className="border border-black p-1 w-[12%]">จำนวนขอเบิก</th>
                                <th className="border border-black p-1 w-[12%]">จำนวนจ่ายจริง</th>
                                <th className="border border-black p-1 w-[10%]">หน่วย</th>
                                <th className="border border-black p-1 w-[18%]">หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {materials.map((m: any, idx: number) => (
                                <tr key={m.id}>
                                    <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                    <td className="border border-black px-1.5 py-0.5">{m.item_name}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.qty_a}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.qty_a}</td>
                                    <td className="border border-black px-1 py-0.5 text-center">{m.unit_a}</td>
                                    <td className="border border-black px-1.5 py-0.5"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ส่วนลงนามท้ายตารางใบเบิกพัสดุ (2 คอลัมน์มีเส้นคั่นกลางตามแบบ) */}
                    <div className="grid grid-cols-2 border-t border-black pt-4 text-[14.5pt]">
                        {/* คอลัมน์ซ้าย: ผู้สั่งจ่าย + เจ้าหน้าที่ตรวจหักจำนวน */}
                        <div className="pr-4 border-r border-black space-y-5">
                            <div className="space-y-1">
                                <div className="font-bold">อนุญาตให้เบิกได้</div>
                                <div className="text-center pt-2">
                                    <p>ลงชื่อ ....................................... ผู้สั่งจ่าย</p>
                                    <p>({headOfficer.fullName})</p>
                                    <p>ครู/หัวหน้าเจ้าหน้าที่ / {toThaiDate(exec.requisition_date, true)}</p>
                                </div>
                            </div>

                            <div className="text-center pt-2 space-y-1">
                                <div>ได้ตรวจหักจำนวนแล้ว</div>
                                <p className="pt-2">ลงชื่อ ...................................................</p>
                                <p>({officer.fullName})</p>
                                <p>ครู/เจ้าหน้าที่</p>
                                <p>{toThaiDate(exec.requisition_date, true)}</p>
                            </div>
                        </div>

                        {/* คอลัมน์ขวา: ผู้เบิก (ผู้รับผิดชอบโครงการ) + มอบให้ / ผู้รับของ */}
                        <div className="pl-4 space-y-5 flex flex-col justify-between">
                            <div className="text-center space-y-1">
                                <p>ลงชื่อ ....................................... ผู้เบิก</p>
                                <p>({requester.fullName})</p>
                                <p>{requester.position}</p>
                                <p>ผู้รับผิดชอบโครงการ/กิจกรรม</p>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div>ได้มอบให้ ...........................................................</div>
                                <div className="text-center pt-2 space-y-1">
                                    <div>ได้รับของไปถูกต้องแล้ว</div>
                                    <p className="pt-2">(ลงชื่อ) ....................................... ผู้รับของ</p>
                                    <p>{toThaiDate(exec.requisition_date, true)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    )
}