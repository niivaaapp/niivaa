'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Printer, ArrowLeft, CheckSquare, Square } from 'lucide-react'
import { getWor119SetupData } from '../actions'

// ฟังก์ชันแปลงวันที่ไทย
const toThaiDate = (dateStr?: string | null, short = false) => {
    if (!dateStr) return '........................'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '........................'
    const monthsFull = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
    const monthsShort = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    const day = d.getDate()
    const month = short ? monthsShort[d.getMonth()] : monthsFull[d.getMonth()]
    const year = d.getFullYear() + 543
    return short ? `${day}/${month}/${year}` : `${day} ${month} ${year}`
}

// ฟังก์ชันแปลงตัวเลขเป็นบาทถ้วน
const ThaiBahtText = (num: number): string => {
    if (!num || isNaN(num)) return 'ศูนย์บาทถ้วน'
    const textNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
    const textDigit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
    const convertInt = (nStr: string) => {
        let res = ''
        const len = nStr.length
        for (let i = 0; i < len; i++) {
            const n = parseInt(nStr[i])
            const pos = len - i - 1
            if (n !== 0) {
                if (pos === 0 && n === 1 && len > 1) res += 'เอ็ด'
                else if (pos === 1 && n === 2) res += 'ยี่'
                else if (pos === 1 && n === 1) res += ''
                else res += textNum[n]
                res += textDigit[pos % 6]
                if (pos >= 6 && pos % 6 === 0) res += 'ล้าน'
            }
        }
        return res
    }
    const [intPart, decPart] = num.toFixed(2).split('.')
    let out = (parseInt(intPart) === 0 ? 'ศูนย์' : convertInt(intPart)) + 'บาท'
    out += parseInt(decPart) === 0 ? 'ถ้วน' : convertInt(decPart) + 'สตางค์'
    return out
}

export default function Wor119PreviewPage() {
    const params = useParams()
    const requestId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [selectedDocs, setSelectedDocs] = useState({
        memo119: true,
        detailTable: true,
        receiptAttach: true
    })

    useEffect(() => {
        const load = async () => {
            if (!requestId) return
            const res = await getWor119SetupData(requestId)
            if (res.success && res.data) setData(res.data)
            setIsLoading(false)
        }
        load()
    }, [requestId])

    if (isLoading) return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังจัดเตรียมเอกสาร ว 119...</div>
    if (!data?.procurement) return <div className="min-h-screen bg-[#0B1528] text-white flex justify-center items-center">ไม่พบข้อมูลการจัดซื้อจัดจ้าง</div>

    const { req, activity, school, deptInfo, employees = [], procurement: proc, receipts = [] } = data
    const schoolName = school?.school_name || 'โรงเรียน'
    const deptName = deptInfo?.department_name || 'กลุ่มบริหารงาน'
    const grandTotal = receipts.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0)

    const getEmp = (code?: string) => {
        const e = employees.find((x: any) => x.emp_code === code)
        return e ? `${e.prefix || ''}${e.first_name} ${e.last_name}` : '........................................'
    }
    const findByRole = (keyword: string) => {
        const e = employees.find((x: any) => (x.role_name || '').includes(keyword))
        return e ? `${e.prefix || ''}${e.first_name} ${e.last_name}` : '........................................'
    }

    const ownerName = getEmp(req?.requester_emp_code)
    const officerName = getEmp(proc?.officer_emp_code)
    const headOfficerName = getEmp(proc?.head_officer_emp_code)
    const financeName = findByRole('การเงิน')
    const deputyName = findByRole('รองผู้อำนวยการ')
    const directorName = school?.director_name || findByRole('ผู้อำนวยการ')

    const pageStyle = {
        fontFamily: "'TH SarabunPSK', 'TH Sarabun New', serif",
        paddingTop: '25mm',
        paddingBottom: '20mm',
        paddingLeft: '30mm',
        paddingRight: '20mm',
        fontSize: '15pt',
        lineHeight: 1.15
    }

    const toggleDoc = (key: keyof typeof selectedDocs) => {
        setSelectedDocs(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <div className="min-h-screen bg-[#0B1528] py-6 px-4 print:bg-white print:p-0">
            {/* TOOLBAR */}
            <div className="max-w-[210mm] mx-auto mb-6 bg-[#002B49] border border-[#008080] rounded-xl p-4 text-white shadow-xl print:hidden space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h1 className="font-bold text-base text-[#98FB98]">แฟ้มเอกสาร ว 119 (วงเงินไม่เกิน 10,000 บาท)</h1>
                        <p className="text-xs text-gray-300">จำนวน {receipts.length} ร้านค้า/ใบเสร็จ | รวมทั้งสิ้น {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/smartschool/planning/requests/${requestId}/procurement/wor119`} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs flex items-center gap-1">
                            <ArrowLeft className="w-4 h-4" /> แก้ไขร้านค้า/ใบเสร็จ
                        </Link>
                        <button onClick={() => window.print()} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold flex items-center gap-2 shadow">
                            <Printer className="w-4 h-4" /> พิมพ์ / บันทึก PDF
                        </button>
                    </div>
                </div>

                {/* เลือกฉบับที่ต้องการพิมพ์ */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700 text-xs">
                    {[
                        { key: 'memo119' as const, label: '1. บันทึกข้อความขอความเห็นชอบ (ว 119)' },
                        { key: 'detailTable' as const, label: '2. รายละเอียดพัสดุแนบท้าย (แยกตามร้าน)' },
                        { key: 'receiptAttach' as const, label: `3. แบบติดใบเสร็จรับเงิน (${receipts.length} ฉบับ)` }
                    ].map(opt => (
                        <button
                            key={opt.key}
                            onClick={() => toggleDoc(opt.key)}
                            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-bold ${
                                selectedDocs[opt.key] ? 'bg-teal-800 border-[#98FB98] text-white' : 'bg-[#0B1528] border-gray-600 text-gray-400'
                            }`}
                        >
                            {selectedDocs[opt.key] ? <CheckSquare className="w-3.5 h-3.5 text-[#98FB98]" /> : <Square className="w-3.5 h-3.5" />}
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ===================================================================== */}
            {/* === ฉบับที่ 1: บันทึกข้อความขอความเห็นชอบ (ว 119) === */}
            {/* ===================================================================== */}
            {selectedDocs.memo119 && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={{ ...pageStyle, fontSize: '14.5pt', lineHeight: 1.12 }}>
                    <div className="relative flex items-end mb-2" style={{ height: '1.5cm' }}>
                        <div className="absolute left-0 bottom-0">
                            <img src="/krut.png" alt="ตราครุฑ" style={{ height: '1.5cm', width: 'auto', objectFit: 'contain' }} />
                        </div>
                        <div className="w-full text-center">
                            <h1 className="font-bold leading-none" style={{ fontSize: '29pt', marginBottom: '-4px' }}>บันทึกข้อความ</h1>
                        </div>
                    </div>

                    <div className="space-y-0.5 mb-2">
                        <div><span className="font-bold text-[18pt] mr-2">ส่วนราชการ</span>{schoolName} {school?.affiliation || ''}</div>
                        <div className="flex justify-between">
                            <div><span className="font-bold text-[18pt] mr-2">ที่</span>{proc.report_no || '....................'}</div>
                            <div className="w-[50%]"><span className="font-bold text-[18pt] mr-2">วันที่</span>{toThaiDate(proc.report_date)}</div>
                        </div>
                        <div><span className="font-bold text-[18pt] mr-2">เรื่อง</span>ขอความเห็นชอบการจัดซื้อจัดจ้างพัสดุ และขออนุมัติเบิกงบประมาณ</div>
                        <div><span className="font-bold text-[18pt] mr-2">เรียน</span>ผู้อำนวยการ{schoolName}</div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-1">
                        ตามที่ {deptName} ได้รับอนุญาตให้ดำเนินโครงการ/กิจกรรม{activity?.activity_name || '-'} จึงมีความจำเป็นต้องจัดซื้อจัดจ้างพัสดุ มีรายละเอียดดังต่อไปนี้
                    </div>

                    <div className="pl-6 space-y-0.5 text-justify mb-1.5">
                        <div>1. เหตุผลและความจำเป็น {proc.reason || `เพื่อใช้ในกิจกรรม${activity?.activity_name || '-'}`}</div>
                        <div>2. รายละเอียดคุณลักษณะเฉพาะของพัสดุ ดังเอกสารรายการพัสดุที่แนบ</div>
                        <div>3. ราคากลางของพัสดุที่จะจัดซื้อจัดจ้าง {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</div>
                        <div>4. วงเงินที่ขอซื้อ/จ้าง ครั้งนี้ {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท โดยขอใช้เงิน{activity?.fund_type || 'อุดหนุนรายหัว'}</div>
                        <div>5. กำหนดเวลาที่ต้องใช้พัสดุหรือให้งานแล้วเสร็จภายในวันที่ {toThaiDate(proc.delivery_due_date)}</div>
                        <div>6. วิธีที่จะซื้อหรือจ้างโดยวิธีเฉพาะเจาะจง ตามแนวทางปฏิบัติสำหรับกรณีการจัดซื้อจัดจ้างพัสดุที่เกี่ยวกับค่าใช้จ่ายในการบริหารงานที่มีวงเงินการจัดซื้อจัดจ้างครั้งหนึ่งไม่เกิน 10,000 บาท ให้เจ้าหน้าที่หรือผู้ที่ได้รับมอบหมายดำเนินการจัดซื้อจัดจ้างพัสดุไปก่อน แล้วรีบรายงานขอความเห็นชอบ พร้อมด้วยหลักฐานการจัดซื้อจัดจ้างนั้นเสนอต่อหัวหน้าหน่วยงานของรัฐภายใน 5 วันทำการถัดไป</div>
                        <div>7. หลักเกณฑ์การพิจารณาคัดเลือกข้อเสนอ โดยใช้เกณฑ์ราคา</div>
                        <div>8. ในการจัดซื้อจัดจ้างครั้งนี้ เมื่อหัวหน้าหน่วยงานของรัฐให้ความเห็นชอบแล้ว ให้ถือว่ารายงานขอความเห็นชอบดังกล่าวเป็นหลักฐานในการตรวจรับโดยอนุโลม ตามนัยแห่งข้อ 3 หนังสือคณะกรรมการวินิจฉัยปัญหาการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว 119 ลงวันที่ 7 มีนาคม 2561</div>
                    </div>

                    <div className="indent-[2.5cm] text-justify mb-1">
                        ผู้รับผิดชอบโครงการได้ดำเนินการจัดซื้อจัดจ้างพัสดุไปก่อนแล้ว ดังรายละเอียดรายการพัสดุที่แนบ พร้อมนี้ได้แนบหลักฐานการจัดซื้อจัดจ้าง จำนวน {receipts.length} ฉบับ มาด้วยแล้ว ดังนี้
                    </div>

                    <div className="pl-6 space-y-0.5 mb-1.5">
                        {receipts.map((r: any, idx: number) => (
                            <div key={idx}>
                                <div>
                                    {idx + 1}. {r.title_label || (r.expense_category === 'HIRE' ? 'ค่าจ้าง' : 'ค่าวัสดุ')} {r.items?.length || 0} รายการ {r.expense_category === 'HIRE' ? 'จาก' : 'ซื้อจาก'}{r.vendor_name} {r.vendor_address || ''}
                                </div>
                                <div className="pl-4">
                                    ตามใบเสร็จรับเงินเล่มที่ {r.receipt_book_no || '-'} เลขที่ {r.receipt_no || '-'} ลงวันที่ {toThaiDate(r.receipt_date)} จำนวนเงิน {Number(r.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                </div>
                            </div>
                        ))}
                        <div className="font-bold pt-0.5">
                            รวมทั้งสิ้นเป็นเงิน {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({ThaiBahtText(grandTotal)}) ขออนุญาตจ่ายค่าพัสดุดังกล่าวจาก {deptName}
                        </div>
                    </div>

                    <div className="indent-[2.5cm] mb-2">
                        <div>จึงเรียนมาเพื่อโปรดพิจารณา</div>
                        <div className="pl-8">1. ให้ความเห็นชอบรายงานการขอซื้อขอจ้างพัสดุ และให้ถือว่ารายงานขอความเห็นชอบนี้เป็นหลักฐานในการตรวจรับโดยอนุโลม</div>
                        <div className="pl-8">2. อนุมัติจ่ายเงิน</div>
                    </div>

                    {/* ช่องลงนาม 6 ระดับ (จัด 2 คอลัมน์ให้พอดีหน้า A4) */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-center pt-1 text-[14pt]">
                        <div>
                            <p className="mb-3">ลงชื่อ ....................................... เจ้าหน้าที่/ผู้ได้รับมอบหมาย</p>
                            <p>({ownerName})</p>
                            <p>{toThaiDate(proc.report_date, true)}</p>
                        </div>
                        <div>
                            <p className="font-bold">เห็นควรให้ความเห็นชอบ</p>
                            <p className="mb-3">ลงชื่อ ....................................... เจ้าหน้าที่</p>
                            <p>({officerName})</p>
                            <p>{toThaiDate(proc.report_date, true)}</p>
                        </div>
                        <div>
                            <p className="font-bold">เห็นควรให้ความเห็นชอบ</p>
                            <p className="mb-3">ลงชื่อ ....................................... หัวหน้าเจ้าหน้าที่</p>
                            <p>({headOfficerName})</p>
                            <p>{toThaiDate(proc.report_date, true)}</p>
                        </div>
                        <div>
                            <p className="font-bold">เห็นควรอนุมัติจ่ายเงินตามเสนอ</p>
                            <p className="mb-3">ลงชื่อ ....................................... เจ้าหน้าที่การเงิน</p>
                            <p>({financeName})</p>
                            <p>......../......../........</p>
                        </div>
                        <div>
                            <p className="font-bold">เห็นควรให้ความเห็นชอบ และอนุมัติจ่ายเงิน</p>
                            <p className="mb-3">ลงชื่อ ....................................... รองผู้อำนวยการโรงเรียน</p>
                            <p>({deputyName})</p>
                            <p>......../......../........</p>
                        </div>
                        <div>
                            <p className="font-bold">เห็นชอบ และอนุมัติ</p>
                            <p className="mb-3">ลงชื่อ ....................................... ผู้อำนวยการโรงเรียน</p>
                            <p>({directorName})</p>
                            <p>......../......../........</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* === ฉบับที่ 2: รายละเอียดพัสดุที่จัดซื้อจัดจ้าง (แยกตารางตามร้านค้า) === */}
            {/* ===================================================================== */}
            {selectedDocs.detailTable && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page" style={pageStyle}>
                    <div className="font-bold text-center text-[16pt] mb-1">
                        รายละเอียดพัสดุที่จัดซื้อจัดจ้าง โครงการ/กิจกรรม {activity?.activity_name || '-'} จัดซื้อจัดจ้างจาก {receipts.length} ราย ดังนี้
                    </div>
                    <div className="text-center mb-4">
                        แนบบันทึกข้อความขอความเห็นชอบการจัดซื้อจัดจ้าง และขออนุมัติเบิกจ่ายงบประมาณ ลงวันที่ {toThaiDate(proc.report_date)}
                    </div>

                    <div className="space-y-4">
                        {receipts.map((r: any, idx: number) => (
                            <div key={idx} className="break-inside-avoid">
                                <div className="font-bold">
                                    {idx + 1}. {r.title_label || 'ค่าวัสดุ'} {r.items?.length || 0} รายการ {r.expense_category === 'HIRE' ? 'จาก' : 'ซื้อจาก'}{r.vendor_name} {r.vendor_address || ''}
                                </div>
                                <div className="mb-1">
                                    ตามใบเสร็จรับเงินเล่มที่ {r.receipt_book_no || '-'} เลขที่ {r.receipt_no || '-'} ลงวันที่ {toThaiDate(r.receipt_date)} จำนวนเงิน {Number(r.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                                </div>
                                <table className="w-full border-collapse border border-black text-[14.5pt]">
                                    <thead>
                                        <tr className="text-center font-bold">
                                            <th className="border border-black py-1 w-12">ลำดับที่</th>
                                            <th className="border border-black py-1">รายการ</th>
                                            <th className="border border-black py-1 w-16">จำนวน</th>
                                            <th className="border border-black py-1 w-20">หน่วย</th>
                                            <th className="border border-black py-1 w-24">ราคา</th>
                                            <th className="border border-black py-1 w-28">จำนวนเงิน</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(r.items || []).map((it: any, iIdx: number) => (
                                            <tr key={iIdx}>
                                                <td className="border border-black py-0.5 text-center">{iIdx + 1}</td>
                                                <td className="border border-black py-0.5 px-2">{it.item_name}</td>
                                                <td className="border border-black py-0.5 text-center">{it.qty}</td>
                                                <td className="border border-black py-0.5 text-center">{it.unit}</td>
                                                <td className="border border-black py-0.5 px-2 text-right">{Number(it.unit_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                                <td className="border border-black py-0.5 px-2 text-right">{Number(it.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                        <tr className="font-bold">
                                            <td colSpan={3} className="border border-black py-1 px-2 text-right">รวมเงิน</td>
                                            <td colSpan={2} className="border border-black py-1 px-2 text-center">{ThaiBahtText(Number(r.total_amount || 0))}</td>
                                            <td className="border border-black py-1 px-2 text-right">{Number(r.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 font-bold text-center text-[16pt]">
                        รวม {receipts.length} ราย เป็นเงินทั้งสิ้น {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท ({ThaiBahtText(grandTotal)})
                    </div>

                    <div className="mt-8 flex justify-end pr-8">
                        <div className="text-center">
                            <p className="mb-4">ลงชื่อ ............................................. ผู้รับผิดชอบโครงการ</p>
                            <p>({ownerName})</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================================================================== */}
            {/* === ฉบับที่ 3: แบบติดใบเสร็จรับเงิน / ใบส่งของ (แยกตามใบเสร็จ) === */}
            {/* ===================================================================== */}
            {selectedDocs.receiptAttach && receipts.map((r: any, idx: number) => (
                <div key={idx} className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl mx-auto mb-8 print:shadow-none print:mb-0 print:break-after-page flex flex-col justify-between" style={pageStyle}>
                    <div>
                        <div className="flex justify-end">
                            <div className="w-48 space-y-1 text-right">
                                <div>ใบสำคัญที่ ........................</div>
                                <div>ฎีกาที่ ........................</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 mb-6">
                            <div className="font-bold">หมวดรายจ่าย &nbsp;&nbsp; {r.title_label || 'ค่าวัสดุ'}</div>
                            <div>{schoolName}</div>
                        </div>
                        <div className="text-center text-gray-500 mt-10">
                            ..........ติดใบส่งของ, ใบเสร็จรับเงิน..........
                        </div>
                    </div>

                    {/* ส่วนรับรองการจ่ายเงินด้านล่าง */}
                    <div className="pt-6 border-t border-dashed border-gray-400">
                        <div className="font-bold text-center mb-2">
                            ขอรับรองว่าได้จ่ายเงิน {activity?.fund_type || 'อุดหนุนรายหัว'} ตามใบสำคัญนี้
                        </div>
                        <div className="space-y-1 mb-6">
                            <div>
                                เพื่อเป็น{r.title_label || 'ค่าวัสดุ'} {r.items?.length || 0} รายการ {r.expense_category === 'HIRE' ? 'จาก' : 'ซื้อจาก'}{r.vendor_name} {r.vendor_address || ''}
                            </div>
                            <div>
                                ตามใบเสร็จรับเงินเล่มที่ {r.receipt_book_no || '-'} เลขที่ {r.receipt_no || '-'} ลงวันที่ {toThaiDate(r.receipt_date)} จำนวนเงิน {Number(r.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                            </div>
                            <div>({ThaiBahtText(Number(r.total_amount || 0))})</div>
                        </div>

                        <div style={{ paddingLeft: '45%' }} className="text-center">
                            <p className="mb-4">ลงชื่อ ...........................................</p>
                            <p className="font-bold">({financeName})</p>
                            <p className="font-bold">ครู/เจ้าหน้าที่การเงิน</p>
                            <p>........../........../..........</p>
                        </div>
                    </div>
                </div>
            ))}

            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    )
}