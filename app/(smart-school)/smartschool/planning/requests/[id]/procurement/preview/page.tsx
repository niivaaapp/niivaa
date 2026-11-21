'use client'

// === บล็อกที่ 1: IMPORTS & HELPER FUNCTIONS ===
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, ArrowLeft, FileText, FileCheck, HardHat, Settings2, CalendarDays, Plus, Minus, Edit3, Save } from 'lucide-react'
import { getProcurementSetupData } from '../actions'

const toThaiDate = (dateString: string, shortMonth = false) => {
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

// ฟังก์ชันลบชื่อยี่ห้อออกจากชื่อพัสดุอัตโนมัติ (ค่าเริ่มต้นไม่แสดงยี่ห้อ)
const getCleanMaterialName = (itemName: string, brand?: string | null) => {
    if (!brand || !brand.trim()) return itemName
    const escapedBrand = brand.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`\\s*${escapedBrand}\\s*`, 'gi')
    return itemName.replace(regex, ' ').replace(/\s{2,}/g, ' ').trim()
}

// แปลงรหัสวิธีจัดซื้อจัดจ้างเป็นข้อความภาษาไทยแบบไดนามิก
const getMethodLabel = (method?: string) => {
    switch (method) {
        case 'SPECIFIC': return 'วิธีเฉพาะเจาะจง'
        case 'SELECTION': return 'วิธีคัดเลือก'
        case 'E_BIDDING': return 'วิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)'
        case 'INVITATION': return 'วิธีประกาศเชิญชวนทั่วไป'
        default: return method || 'วิธีเฉพาะเจาะจง'
    }
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

export default function ProcurementPreviewPage() {
    const params = useParams()
    const requestId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'ALL' | 'REPORT' | 'ORDER' | 'MEDIAN_ORDER'>('ALL')

    // ระบบจัดการวันที่เสนอเรื่อง (ค่าเริ่มต้นวันเดียวกัน และปรับอิสระได้)
    const [isEditingDates, setIsEditingDates] = useState(false)
    const [dateMode, setDateMode] = useState<'SAME' | 'MANUAL'>('SAME')
    const [manualDates, setManualDates] = useState({
        headOfficer: '',
        headBudget: '',
        director: ''
    })

    // เกณฑ์ขอบกระดาษมาตรฐานงานสารบรรณ (บน 25, ล่าง 20, ซ้าย 30, ขวา 20 มม.)
    const [pageConfig] = useState({
        marginTop: 25,
        marginBottom: 20,
        marginLeft: 30,
        marginRight: 20
    })

    // === บล็อกที่ 2: โหลดข้อมูลจาก Database ===
    useEffect(() => {
        const load = async () => {
            if (!requestId) return
            const res = await getProcurementSetupData(requestId)
            if (res.success && res.data) {
                setData(res.data)
                const baseDate = res.data.existingProcurement?.report_date || new Date().toISOString().split('T')[0]
                setManualDates({
                    headOfficer: baseDate,
                    headBudget: baseDate,
                    director: baseDate
                })
            } else {
                alert('ไม่พบข้อมูลการจัดซื้อจัดจ้าง: ' + res.error)
            }
            setIsLoading(false)
        }
        load()
    }, [requestId])

    // ลอจิกปรับวันที่ (+/- ข้ามเสาร์-อาทิตย์ และล็อกไม่ให้ย้อนหลังลำดับก่อนหน้า)
    const adjustBusinessDate = (step: 'headOfficer' | 'headBudget' | 'director', direction: 1 | -1) => {
        const baseReportDate = data?.existingProcurement?.report_date || new Date().toISOString().split('T')[0]
        setManualDates(prev => {
            const keys: ('headOfficer' | 'headBudget' | 'director')[] = ['headOfficer', 'headBudget', 'director']
            const idx = keys.indexOf(step)

            const d = new Date(prev[step] || baseReportDate)
            do {
                d.setDate(d.getDate() + direction)
            } while (d.getDay() === 0 || d.getDay() === 6)

            const newDateStr = d.toISOString().split('T')[0]

            // ห้ามลดวันจนน้อยกว่าลำดับก่อนหน้า หรือวันที่รายงาน
            if (direction === -1) {
                const minDate = idx === 0 ? baseReportDate : prev[keys[idx - 1]]
                if (newDateStr < minDate) return prev
            }

            const next = { ...prev, [step]: newDateStr }
            // ถ้าเพิ่มวันจนล้ำหน้าลำดับถัดไป ให้ดันลำดับถัดไปตามไปด้วย
            if (direction === 1) {
                for (let i = idx + 1; i < keys.length; i++) {
                    if (next[keys[i]] < next[keys[i - 1]]) {
                        next[keys[i]] = next[keys[i - 1]]
                    }
                }
            }
            return next
        })
    }

    if (isLoading) {
        return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังสร้างเอกสาร A4...</div>
    }

    if (!data?.existingProcurement) {
        return (
            <div className="min-h-screen bg-[#0B1528] text-white flex flex-col justify-center items-center gap-4">
                <p className="text-amber-400 font-bold">ยังไม่ได้ตั้งค่าข้อมูลรายงานขอซื้อขอจ้างสำหรับรายการนี้</p>
                <Link href={`/smartschool/planning/requests/${requestId}/procurement`} className="px-5 py-2 bg-[#008080] rounded-lg font-bold">
                    ไปหน้าตั้งค่าข้อมูลพัสดุ
                </Link>
            </div>
        )
    }

    // === บล็อกที่ 3: เตรียมตัวแปรและแมปรายชื่อบุคลากร ===
    const { activity, school, deptInfo, employees, materials, existingProcurement: proc, existingCommittees: committees } = data
    const schoolName = school?.name || 'โรงเรียน...'

    // งานต้นเรื่อง: subdepartment_role_name ต่อด้วย department_name
    const originDeptName = [deptInfo?.subdepartment_name, deptInfo?.department_name]
        .filter(Boolean)
        .join(' ') || 'งานต้นเรื่อง'

    const isConstruction = proc.procurement_type === 'CONSTRUCTION'
    const isHire = proc.procurement_type === 'HIRE'
    const isBuy = proc.procurement_type === 'BUY'
    const methodLabel = getProcurementMethodLabel(proc.procurement_method)

    const getEmp = (empCode: string) => {
        const emp = employees.find((e: any) => e.emp_code === empCode)
        if (!emp) return { fullName: '........................................', position: 'ครู' }
        return {
            fullName: `${emp.prefix || ''}${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
            position: emp.position_title || emp.academic_standing || 'ครู'
        }
    }

    const directorEmp = employees.find((e: any) => (e.role_name || '') === 'ผู้อำนวยการโรงเรียน')
    const directorName = directorEmp ? `${directorEmp.prefix || ''}${directorEmp.first_name} ${directorEmp.last_name}` : '........................................'

    const headBudgetEmp = employees.find((e: any) => (e.role_name || '').includes('หัวหน้า') && (e.role_name || '').includes('งบประมาณ'))
    const headBudgetName = headBudgetEmp ? `${headBudgetEmp.prefix || ''}${headBudgetEmp.first_name} ${headBudgetEmp.last_name}` : '........................................'

    const officer = getEmp(proc.officer_emp_code)
    const headOfficer = getEmp(proc.head_officer_emp_code)

    const medianList = committees.filter((c: any) => c.committee_group === 'MEDIAN_PRICE_COMMITTEE')
    const purchaseList = committees.filter((c: any) => c.committee_group === 'PURCHASE_COMMITTEE')
    const supervisorList = committees.filter((c: any) => c.committee_group === 'SUPERVISOR')
    const inspectList = committees.filter((c: any) => c.committee_group === 'INSPECTION')

    const totalBudget = Number(proc.total_budget || 0)
    const showInlineTable = !isConstruction && materials.length > 0 && materials.length <= 5
    const showAttachmentTable = !isConstruction && materials.length > 5

    // ข้อความภาษาทางการตามประเภทงาน
    const actionWord = isBuy ? 'จัดซื้อพัสดุ' : isHire ? 'จัดจ้างเหมาบริการ' : 'จัดจ้างงานก่อสร้าง'
    const itemTypeWord = isBuy ? 'วัสดุ' : isHire ? 'จ้างเหมา' : 'จ้างเหมาก่อสร้าง'
    const specText = isBuy
        ? 'รายละเอียดคุณลักษณะเฉพาะของพัสดุ ดังเอกสารรายการพัสดุที่แนบ'
        : isHire
            ? 'รายละเอียดขอบเขตของงาน (TOR) และคุณลักษณะการจ้างเหมาบริการ ดังเอกสารที่แนบ'
            : 'แบบรูปรายการงานก่อสร้างและรายละเอียดการกำหนดราคากลาง (แบบ ปร.4, ปร.5, ปร.6) ดังเอกสารที่แนบ'
    const methodDetail = proc.is_wor_119
        ? `${methodLabel} ตามแนวทางปฏิบัติหนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119`
        : `${methodLabel} เนื่องจากเป็นการ${actionWord}ที่มีการผลิต จำหน่าย ก่อสร้าง หรือให้บริการทั่วไป และมีวงเงินในการจัดซื้อจัดจ้างครั้งหนึ่งไม่เกิน 500,000 บาท`

    const inspectTitleWord = proc.inspector_type === 'SINGLE' ? 'ผู้ตรวจรับพัสดุ' : 'คณะกรรมการตรวจรับพัสดุ'
    const inspectLawClause = isConstruction ? 'ข้อ 176' : 'ข้อ 175'

    const pageStyle = {
        fontFamily: "'TH SarabunPSK', 'TH Sarabun New', serif",
        paddingTop: `${pageConfig.marginTop}mm`,
        paddingBottom: `${pageConfig.marginBottom}mm`,
        paddingLeft: `${pageConfig.marginLeft}mm`,
        paddingRight: `${pageConfig.marginRight}mm`
    }

    // คอมโพเนนต์แสดงวันที่พร้อมปุ่ม +/- เมื่อเปิดโหมดแก้ไข
    const SignerDate = ({ step }: { step: 'headOfficer' | 'headBudget' | 'director' }) => {
        const displayDate = dateMode === 'SAME' ? toThaiDate(proc.report_date, true) : toThaiDate(manualDates[step], true)
        return (
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
                {isEditingDates && dateMode === 'MANUAL' && (
                    <button onClick={() => adjustBusinessDate(step, -1)} className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center print:hidden">
                        <Minus className="w-3 h-3" />
                    </button>
                )}
                <span className={isEditingDates && dateMode === 'MANUAL' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : ''}>
                    {displayDate}
                </span>
                {isEditingDates && dateMode === 'MANUAL' && (
                    <button onClick={() => adjustBusinessDate(step, 1)} className="w-4 h-4 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center print:hidden">
                        <Plus className="w-3 h-3" />
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B1528] p-4 md:p-6 flex flex-col items-center font-sans pb-20">

            {/* === บล็อกที่ 4: TOOLBAR ควบคุมการแสดงผล วันที่ และการพิมพ์ === */}
            <div className="w-full max-w-[210mm] mb-6 bg-[#002B49] p-4 rounded-xl border border-[#008080]/50 shadow-xl print:hidden space-y-3">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[#0B1528] px-2.5 py-1.5 rounded-lg border border-teal-500/50">
                            <div className="w-7 h-7 rounded bg-gradient-to-br from-teal-400 to-[#008080] flex items-center justify-center font-black text-[#0B1528] text-sm">N</div>
                            <span className="text-xs font-bold text-[#98FB98]">NiiVaa SmartSchool</span>
                        </div>
                        <span className="text-white font-bold text-sm">Print Preview เอกสารพัสดุ (A4)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/smartschool/planning/requests/${requestId}/procurement`} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs border border-gray-600 flex items-center gap-1">
                            <Settings2 className="w-4 h-4" /> แก้ไขตั้งค่า
                        </Link>
                        <button
                            onClick={() => setIsEditingDates(prev => !prev)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${isEditingDates ? 'bg-[#008080] text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
                        >
                            {isEditingDates ? <><Save className="w-4 h-4" /> ปิดจัดการวันที่</> : <><Edit3 className="w-4 h-4" /> จัดการวันที่เสนอ</>}
                        </button>
                        <Link href={`/smartschool/planning/requests/${requestId}`} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs border border-gray-600 flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> บันทึกขออนุมัติ
                        </Link>
                        <button onClick={() => { setIsEditingDates(false); setTimeout(() => window.print(), 100) }} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg">
                            <Printer className="w-4 h-4" /> พิมพ์ / บันทึก PDF
                        </button>
                    </div>
                </div>

                {/* แถบตั้งค่าวันที่ผู้ลงนาม */}
                {isEditingDates && (
                    <div className="flex flex-wrap items-center gap-4 bg-[#0B1528] p-2.5 rounded-lg border border-teal-500/40 text-xs text-gray-200">
                        <span className="font-bold text-teal-300 flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> วันที่ผู้ลงนามในรายงาน:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="pDateMode" checked={dateMode === 'SAME'} onChange={() => setDateMode('SAME')} />
                            วันเดียวกันทั้งหมด (ค่าเริ่มต้น)
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="radio" name="pDateMode" checked={dateMode === 'MANUAL'} onChange={() => setDateMode('MANUAL')} />
                            แก้ไขอิสระ (+/- ข้ามวันหยุดและล็อกลำดับ)
                        </label>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                    <button onClick={() => setActiveTab('ALL')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'ALL' ? 'bg-[#008080] text-white' : 'bg-[#0B1528] text-gray-400'}`}>
                        แสดงทั้งหมด
                    </button>
                    {isConstruction && (
                        <button onClick={() => setActiveTab('MEDIAN_ORDER')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${activeTab === 'MEDIAN_ORDER' ? 'bg-amber-600 text-white' : 'bg-[#0B1528] text-gray-400'}`}>
                            <HardHat className="w-3.5 h-3.5" /> คำสั่ง กก.ราคากลาง
                        </button>
                    )}
                    <button onClick={() => setActiveTab('REPORT')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${activeTab === 'REPORT' ? 'bg-[#008080] text-white' : 'bg-[#0B1528] text-gray-400'}`}>
                        <FileText className="w-3.5 h-3.5" /> รายงานขอซื้อขอจ้าง {showAttachmentTable ? '(+ใบแนบ)' : ''}
                    </button>
                    <button onClick={() => setActiveTab('ORDER')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${activeTab === 'ORDER' ? 'bg-[#008080] text-white' : 'bg-[#0B1528] text-gray-400'}`}>
                        <FileCheck className="w-3.5 h-3.5" /> คำสั่งแต่งตั้ง กก.จัดซื้อจัดจ้าง
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* === บล็อกที่ 5: เอกสารฉบับที่ 1 (เฉพาะงานก่อสร้าง) คำสั่งแต่งตั้ง กก.ราคากลาง === */}
            {/* ========================================================================= */}
            {isConstruction && (activeTab === 'ALL' || activeTab === 'MEDIAN_ORDER') && (
                <div
                    className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page"
                    style={{ ...pageStyle, fontSize: '16pt', lineHeight: 1.15 }}
                >
                    <div className="flex flex-col items-center mb-4">
                        <img src="/krut.png" alt="ตราครุฑ" style={{ height: '3cm', width: 'auto', display: 'block', margin: '0 auto 10px auto', objectFit: 'contain' }} />
                        <div className="font-bold">คำสั่ง{schoolName}</div>
                        <div className="font-bold">ที่ {proc.median_order_no || '......../........'}</div>
                        <div className="font-bold text-center">เรื่อง แต่งตั้งคณะกรรมการกำหนดราคากลาง</div>
                        <div style={{ width: '6cm', borderBottom: '1px solid black', marginTop: '8px' }}></div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-4">
                        ด้วย{schoolName} มีความประสงค์จะดำเนินการจัดจ้างงานก่อสร้าง สำหรับกิจกรรม{activity?.activity_name || '-'} เพื่อให้การกำหนดราคากลางเป็นไปตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และหลักเกณฑ์การคำนวณราคากลางงานก่อสร้างของทางราชการ จึงแต่งตั้งคณะกรรมการกำหนดราคากลาง ประกอบด้วย
                    </div>

                    <table className="w-full mb-4 ml-6">
                        <tbody>
                            {medianList.map((c: any, idx: number) => {
                                const emp = getEmp(c.emp_code)
                                return (
                                    <tr key={c.id}>
                                        <td className="w-[45%] py-0.5">{idx + 1}. {emp.fullName}</td>
                                        <td className="w-[25%] py-0.5">{emp.position}</td>
                                        <td className="w-[30%] py-0.5">{idx === 0 ? 'ประธานกรรมการ' : 'กรรมการ'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    <div className="mb-6">
                        <div className="font-bold">หน้าที่</div>
                        <div className="pl-8">
                            1. ดำเนินการคำนวณและกำหนดราคากลางงานก่อสร้าง (แบบ ปร.4, ปร.5, ปร.6) ให้ถูกต้องตามหลักเกณฑ์ของทางราชการ<br />
                            2. รายงานผลการกำหนดราคากลางต่อผู้อำนวยการโรงเรียนเพื่อพิจารณาให้ความเห็นชอบต่อไป
                        </div>
                    </div>

                    <div className="indent-[2.5cm] mb-6">ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป</div>
                    <div className="mb-10" style={{ paddingLeft: '4.5cm' }}>
                        สั่ง ณ วันที่ {toThaiDate(proc.median_order_date)}
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

            {/* ========================================================================= */}
            {/* === บล็อกที่ 6: เอกสารฉบับที่ 2 รายงานขอซื้อขอจ้าง (A4 บันทึกข้อความ) === */}
            {/* ========================================================================= */}
            {(activeTab === 'ALL' || activeTab === 'REPORT') && (
                <>
                    <div
                        className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page"
                        style={{ ...pageStyle, fontSize: '15.5pt', lineHeight: 1.15 }}
                    >
                        {/* หัวบันทึกข้อความ: ล็อกครุฑสูง 1.5 ซม. */}
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
                                <div className="w-[50%]"><span className="font-bold text-[19pt] mr-3">วันที่</span>{toThaiDate(proc.report_date)}</div>
                            </div>
                            <div><span className="font-bold text-[19pt] mr-3">เรื่อง</span>รายงานขอซื้อขอจ้าง</div>
                            <div><span className="font-bold text-[19pt] mr-3">เรียน</span>ผู้อำนวยการ{schoolName}</div>
                        </div>

                        {/* ย่อหน้าที่ 1: งานต้นเรื่อง (subdepartment_role_name + department_name) */}
                        <div className="indent-[2.5cm] text-justify mb-1">
                            ด้วย{originDeptName} มีความประสงค์จะขอให้{actionWord} เพื่อใช้ในกิจกรรม{activity?.activity_name || '-'} ดังนี้
                        </div>

                        {/* ย่อหน้าที่ 2: แสดงตาราง (ถ้าไม่เกิน 5 รายการ) หรือ ข้อความสรุป (ถ้าแยกใบแนบ/ก่อสร้าง) */}
                        {showInlineTable ? (
                            <table className="w-full border-collapse border border-black text-[13.5pt] my-2">
                                <thead>
                                    <tr className="text-center">
                                        <th rowSpan={2} className="border border-black p-1 w-[8%]">ลำดับ</th>
                                        <th rowSpan={2} className="border border-black p-1">รายการพัสดุ</th>
                                        <th rowSpan={2} className="border border-black p-1 w-[8%]">จำนวน</th>
                                        <th rowSpan={2} className="border border-black p-1 w-[9%]">หน่วย</th>
                                        <th className="border border-black p-1 w-[15%] text-[12pt] font-normal">
                                            ({proc.price_source === 'STANDARD' ? '✓' : ' '}) ราคามาตรฐาน<br />
                                            ({proc.price_source === 'PREVIOUS_HIRE' ? '✓' : ' '}) ราคาที่เคยจ้าง
                                        </th>
                                        <th colSpan={2} className="border border-black p-1">จำนวนเงินที่ขอซื้อขอจ้างครั้งนี้</th>
                                    </tr>
                                    <tr className="text-center text-[12pt]">
                                        <th className="border border-black p-1 font-normal">โดยประมาณ (บาท)</th>
                                        <th className="border border-black p-1 w-[12%] font-normal">ราคาต่อหน่วย</th>
                                        <th className="border border-black p-1 w-[14%] font-normal">จำนวนเงิน (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {materials.map((m: any, idx: number) => (
                                        <tr key={m.id}>
                                            <td className="border border-black px-1 py-0.5 text-center">{idx + 1}</td>
                                            <td className="border border-black px-1.5 py-0.5">{getCleanMaterialName(m.item_name, m.brand)}</td>
                                            <td className="border border-black px-1 py-0.5 text-center">{m.qty_a}</td>
                                            <td className="border border-black px-1 py-0.5 text-center">{m.unit_a}</td>
                                            <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            <td className="border border-black px-1.5 py-0.5 text-right">{Number(m.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-bold">
                                        <td colSpan={6} className="border border-black px-2 py-1 text-right">รวมเงิน ({ThaiBahtText(totalBudget)})</td>
                                        <td className="border border-black px-1.5 py-1 text-right">{totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                        ) : (
                            <div className="indent-[2.5cm] text-justify mb-2 font-bold">
                                {itemTypeWord} จำนวน {materials.length || 1} รายการ ประมาณการราคารวมเป็นเงินทั้งสิ้น {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({ThaiBahtText(totalBudget)}) ดังรายละเอียดที่แนบมาพร้อมนี้
                            </div>
                        )}

                        {/* ย่อหน้าอ้างอิงกฎหมายและข้อ 1-8 */}
                        <div className="indent-[2.5cm] text-justify mb-1">
                            งานพัสดุได้ตรวจสอบแล้วเห็นควรดำเนินการตามเสนอ และเพื่อให้เป็นไปตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 56 วรรคหนึ่ง (2) (ข) และระเบียบกระทรวงการคลัง ว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 22 จึงขอรายงานขอซื้อขอจ้าง ดังนี้
                        </div>

                        <div className="space-y-0.5 text-justify pl-4">
                            <div>1. เหตุผลและความจำเป็น {proc.reason_text || `เพื่อใช้ในกิจกรรม${activity?.activity_name || ''}`}</div>
                            <div>2. {specText} </div>
                            <div>3. ราคากลางของพัสดุที่จะ{isBuy ? 'จัดซื้อ' : 'จัดจ้าง'} เป็นเงิน {Number(proc.median_price || totalBudget).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>
                            <div>4. วงเงินที่ขอซื้อ/จ้าง ครั้งนี้ {totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({ThaiBahtText(totalBudget)}) โดยขอใช้เงิน {activity?.fund_type || 'เงินอุดหนุนรายหัว'}</div>
                            <div>5. กำหนดเวลาที่ต้องใช้พัสดุหรือให้งานแล้วเสร็จภายในวันที่ {toThaiDate(proc.delivery_due_date)}</div>
                            <div>6. วิธีที่จะซื้อหรือจ้างโดย{methodDetail}</div>
                            <div>7. หลักเกณฑ์การพิจารณาคัดเลือกข้อเสนอ โดยใช้เกณฑ์ราคา</div>
                            <div>
                                8. ข้อเสนออื่นๆ เห็นควรแต่งตั้ง{inspectTitleWord} {proc.inspector_type === 'SINGLE' ? 'คือ' : 'ประกอบด้วย'}
                            </div>
                        </div>

                        {/* ตารางรายชื่อผู้ตรวจรับ / คณะกรรมการตรวจรับ */}
                        <table className="w-full my-1 text-[14.5pt]" style={{ marginLeft: '1.2cm', width: 'calc(100% - 1.2cm)' }}>
                            <tbody>
                                {inspectList.map((c: any, idx: number) => {
                                    const emp = getEmp(c.emp_code)
                                    const roleLabel = proc.inspector_type === 'SINGLE'
                                        ? 'ผู้ตรวจรับพัสดุ'
                                        : (idx === 0 ? 'ประธานกรรมการตรวจรับพัสดุ' : 'กรรมการ')
                                    return (
                                        <tr key={c.id}>
                                            <td className="w-[35%] py-0.5">
                                                {proc.inspector_type === 'SINGLE' ? '' : `${idx + 1}. `}{emp.fullName}
                                            </td>
                                            <td className="w-[30%] py-0.5">{emp.position}</td>
                                            <td className="w-[35%] py-0.5">{roleLabel}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* แยกย่อหน้า "จึงเรียนมา..." ออกจากข้อ 1-2 เพื่อไม่ให้ text-indent ซ้อนกัน */}
                        <div className="mt-2">
                            <div style={{ textIndent: '2.5cm' }}>จึงเรียนมาเพื่อโปรดทราบและพิจารณา</div>
                            <div style={{ paddingLeft: '3.2cm' }}>
                                <div>1. ให้ความเห็นชอบรายงานขอซื้อขอจ้างดังกล่าวข้างต้น</div>
                                <div>2. อนุมัติแต่งตั้งบุคคลตามเสนอ</div>
                            </div>
                        </div>

                        {/* บล็อกลายเซ็น: จัดชื่อและวันที่ให้อยู่กึ่งกลางใต้เส้นประพอดี */}
                        <div className="mt-4 text-[14pt] space-y-4">
                            {/* แถวที่ 1: เจ้าหน้าที่ */}
                            <div className="flex items-start" style={{ paddingLeft: '0.5cm' }}>
                                <span className="mr-1 whitespace-nowrap">ลงชื่อ</span>
                                <div className="text-center" style={{ width: '4.5cm' }}>
                                    <div>..............................................</div>
                                    <div>({officer.fullName})</div>
                                </div>
                                <span className="ml-1 whitespace-nowrap">เจ้าหน้าที่</span>
                            </div>

                            {/* แถวที่ 2: หัวหน้าเจ้าหน้าที่ และ หัวหน้ากลุ่มบริหารงบประมาณ */}
                            {/* แถวที่ 2: หัวหน้าเจ้าหน้าที่ และ หัวหน้ากลุ่มบริหารงบประมาณ */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-start justify-center">
                                    <span className="mr-1 whitespace-nowrap">ลงชื่อ</span>
                                    <div className="flex flex-col items-center text-center" style={{ width: '3.8cm' }}>
                                        <div>......................................</div>
                                        <div className="whitespace-nowrap">({headOfficer.fullName})</div>
                                        <SignerDate step="headOfficer" />
                                    </div>
                                    <span className="ml-1 whitespace-nowrap">หัวหน้าเจ้าหน้าที่</span>
                                </div>

                                <div className="flex items-start justify-center">
                                    <span className="mr-1 whitespace-nowrap">ลงชื่อ</span>
                                    <div className="flex flex-col items-center text-center" style={{ width: '3.6cm' }}>
                                        <div>....................................</div>
                                        <div className="whitespace-nowrap">({headBudgetName})</div>
                                        <SignerDate step="headBudget" />
                                    </div>
                                    <span className="ml-1 whitespace-nowrap">หัวหน้ากลุ่มบริหารงบประมาณ</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center pt-1">
                                <div className="text-left mb-1.5">
                                    <div>( &nbsp; ) 1. เห็นชอบ</div>
                                    <div>( &nbsp; ) 2. อนุมัติ</div>
                                </div>
                                <p>ลงชื่อ .......................................................</p>
                                <p>({directorName})</p>
                                <p>ผู้อำนวยการ{schoolName}</p>
                                <SignerDate step="director" />
                            </div>
                        </div>
                    </div>

                    {/* ใบแนบรายการพัสดุ (สร้างหน้าใหม่เมื่อมีมากกว่า 5 รายการ) */}
                    {showAttachmentTable && (
                        <div
                            className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page"
                            style={{ ...pageStyle, fontSize: '15pt', lineHeight: 1.15 }}
                        >
                            <h2 className="text-center font-bold text-[18pt]">รายละเอียดแนบท้ายรายงานขอซื้อขอจ้าง</h2>
                            <p className="text-center mb-4">ที่ {proc.report_no || 'งปม. ............'} ลงวันที่ {toThaiDate(proc.report_date)}</p>

                            <table className="w-full border-collapse border border-black text-[14pt]">
                                <thead>
                                    <tr className="text-center">
                                        <th rowSpan={2} className="border border-black p-1.5 w-[8%]">ลำดับ</th>
                                        <th rowSpan={2} className="border border-black p-1.5">รายการพัสดุ</th>
                                        <th rowSpan={2} className="border border-black p-1.5 w-[8%]">จำนวน</th>
                                        <th rowSpan={2} className="border border-black p-1.5 w-[9%]">หน่วย</th>
                                        <th className="border border-black p-1 w-[15%] text-[12pt] font-normal">
                                            ({proc.price_source === 'STANDARD' ? '✓' : ' '}) ราคามาตรฐาน<br />
                                            ({proc.price_source === 'PREVIOUS_HIRE' ? '✓' : ' '}) ราคาที่เคยจ้าง
                                        </th>
                                        <th colSpan={2} className="border border-black p-1">จำนวนเงินที่ขอซื้อขอจ้างครั้งนี้</th>
                                    </tr>
                                    <tr className="text-center text-[12pt]">
                                        <th className="border border-black p-1 font-normal">โดยประมาณ (บาท)</th>
                                        <th className="border border-black p-1 w-[12%] font-normal">ราคาต่อหน่วย</th>
                                        <th className="border border-black p-1 w-[14%] font-normal">จำนวนเงิน (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {materials.map((m: any, idx: number) => (
                                        <tr key={m.id}>
                                            <td className="border border-black px-1.5 py-1 text-center">{idx + 1}</td>
                                            <td className="border border-black px-2 py-1">{getCleanMaterialName(m.item_name, m.brand)}</td>
                                            <td className="border border-black px-1.5 py-1 text-center">{m.qty_a}</td>
                                            <td className="border border-black px-1.5 py-1 text-center">{m.unit_a}</td>
                                            <td className="border border-black px-2 py-1 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            <td className="border border-black px-2 py-1 text-right">{Number(m.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            <td className="border border-black px-2 py-1 text-right">{Number(m.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-bold">
                                        <td colSpan={6} className="border border-black px-2 py-1.5 text-right">รวมเงินทั้งสิ้น ({ThaiBahtText(totalBudget)})</td>
                                        <td className="border border-black px-2 py-1.5 text-right">{totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* ลายเซ็นเจ้าหน้าที่พัสดุกำกับท้ายตารางใบแนบ */}
                            <div className="mt-10 flex justify-end pr-6 text-[14.5pt]">
                                <div className="text-center w-[50%]">
                                    <p className="mb-5">ลงชื่อ .................................................... เจ้าหน้าที่</p>
                                    <p>({officer.fullName})</p>
                                    <p>เจ้าหน้าที่พัสดุ</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ========================================================================= */}
            {/* === บล็อกที่ 7: เอกสารฉบับที่ 3 คำสั่งแต่งตั้งคณะกรรมการจัดซื้อจัดจ้าง (จบใน 1 หน้า A4) === */}
            {/* ========================================================================= */}
            {(activeTab === 'ALL' || activeTab === 'ORDER') && (
                <div
                    className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0"
                    style={{ ...pageStyle, fontSize: '15pt', lineHeight: 1.12 }}
                >
                    {/* หัวคำสั่ง: ล็อกครุฑสูง 3 ซม. อยู่กลางหน้ากระดาษ */}
                    <div className="flex flex-col items-center mb-3">
                        <img src="/krut.png" alt="ตราครุฑ" style={{ height: '3cm', width: 'auto', display: 'block', margin: '0 auto 8px auto', objectFit: 'contain' }} />
                        <div className="font-bold">คำสั่ง{schoolName}</div>
                        <div className="font-bold">ที่ {proc.order_no || '......../........'}</div>
                        <div className="font-bold text-center">
                            เรื่อง แต่งตั้งคณะกรรมการซื้อหรือจ้างโดย{methodLabel}{isConstruction ? ' ผู้ควบคุมงาน ' : ' '}และ{inspectTitleWord}
                        </div>
                        <div style={{ width: '6cm', borderBottom: '1px solid black', marginTop: '6px' }}></div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-2">
                        ด้วย{schoolName} มีความประสงค์จะดำเนินการ{actionWord} สำหรับกิจกรรม{activity?.activity_name || '-'} เพื่อให้เป็นไปตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 และระเบียบกระทรวงการคลัง ว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 25(4) (5) จึงแต่งตั้งคณะกรรมการซื้อหรือจ้างโดย{methodLabel}{isConstruction ? ' ผู้ควบคุมงาน ' : ' '}และ{inspectTitleWord} ดังนี้
                    </div>

                    {/* ข้อ 1: คณะกรรมการซื้อหรือจ้าง */}
                    <div className="mb-2">
                        <div className="font-bold">1. คณะกรรมการซื้อหรือจ้างโดย{methodLabel} &nbsp;&nbsp;&nbsp;&nbsp; ประกอบด้วย</div>
                        <table className="w-full ml-6 my-0.5">
                            <tbody>
                                {purchaseList.map((c: any, idx: number) => {
                                    const emp = getEmp(c.emp_code)
                                    return (
                                        <tr key={c.id}>
                                            <td className="w-[45%]">{idx + 1}. {emp.fullName}</td>
                                            <td className="w-[25%]">{emp.position}</td>
                                            <td className="w-[30%]">{idx === 0 ? 'ประธานกรรมการ' : 'กรรมการ'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="ml-4">
                            <div className="font-bold">หน้าที่</div>
                            <div className="ml-4">
                                1. พิจารณาคุณสมบัติของผู้ประกอบการที่มายื่นข้อเสนอให้เป็นไปตามเงื่อนไขที่กำหนดในหนังสือเชิญชวน<br />
                                2. พิจารณาคัดเลือกผู้ประกอบการตามหลักเกณฑ์การพิจารณาข้อเสนอที่กำหนดไว้ในหนังสือเชิญชวน<br />
                                3. รายงานผลการพิจารณาและเสนอความเห็นต่อผู้อำนวยการโรงเรียนผ่านหัวหน้าเจ้าหน้าที่<br />
                                <span className="font-bold">การกำหนดระยะเวลาในการพิจารณาผลการเสนอราคา</span> กำหนดให้แล้วเสร็จภายใน {proc.consider_days || 2} วัน นับถัดจากวันเสนอราคา
                            </div>
                        </div>
                    </div>

                    {/* ข้อ 2 (เฉพาะงานก่อสร้าง): ผู้ควบคุมงาน */}
                    {isConstruction && (
                        <div className="mb-2">
                            <div className="font-bold">2. ผู้ควบคุมงาน &nbsp;&nbsp;&nbsp;&nbsp; ประกอบด้วย</div>
                            <table className="w-full ml-6 my-0.5">
                                <tbody>
                                    {supervisorList.map((c: any, idx: number) => {
                                        const emp = getEmp(c.emp_code)
                                        return (
                                            <tr key={c.id}>
                                                <td className="w-[45%]">{supervisorList.length > 1 ? `${idx + 1}. ` : ''}{emp.fullName}</td>
                                                <td className="w-[25%]">{emp.position}</td>
                                                <td className="w-[30%]">ผู้ควบคุมงาน</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            <div className="ml-4">
                                <span className="font-bold">หน้าที่</span> ควบคุมงานก่อสร้างให้เป็นไปตามแบบรูปรายละเอียด แนบสัญญาการจ้าง/ใบสั่งจ้าง
                            </div>
                        </div>
                    )}

                    {/* ข้อ 2 (ทั่วไป) หรือ ข้อ 3 (งานก่อสร้าง): คณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับพัสดุ */}
                    <div className="mb-3">
                        <div className="font-bold">{isConstruction ? '3.' : '2.'} {inspectTitleWord} &nbsp;&nbsp;&nbsp;&nbsp; ประกอบด้วย</div>
                        <table className="w-full ml-6 my-0.5">
                            <tbody>
                                {inspectList.map((c: any, idx: number) => {
                                    const emp = getEmp(c.emp_code)
                                    const roleLabel = proc.inspector_type === 'SINGLE'
                                        ? 'ผู้ตรวจรับพัสดุ'
                                        : (idx === 0 ? 'ประธานกรรมการ' : 'กรรมการ')
                                    return (
                                        <tr key={c.id}>
                                            <td className="w-[45%]">{proc.inspector_type === 'SINGLE' ? '' : `${idx + 1}. `}{emp.fullName}</td>
                                            <td className="w-[25%]">{emp.position}</td>
                                            <td className="w-[30%]">{roleLabel}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        <div className="ml-4 text-justify">
                            <div className="font-bold">หน้าที่</div>
                            <div className="indent-[1.5cm]">
                                ตรวจรับพัสดุให้เป็นไปตามเงื่อนไขของสัญญาหรือข้อตกลงนั้น โดยให้ดำเนินการให้แล้วเสร็จภายใน {proc.inspect_days || 5} วัน นับถัดจากวันที่มีผู้ขาย/ผู้รับจ้าง ส่งมอบของ/ส่งมอบงาน และถือปฏิบัติตามระเบียบกระทรวงการคลัง ว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 {inspectLawClause}
                            </div>
                        </div>
                    </div>

                    <div className="indent-[2.5cm] mb-3">ทั้งนี้ ตั้งแต่บัดนี้เป็นต้นไป</div>
                    <div className="mb-6" style={{ paddingLeft: '4.5cm' }}>
                        สั่ง ณ วันที่ {toThaiDate(proc.order_date)}
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

            <style jsx>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    )
}