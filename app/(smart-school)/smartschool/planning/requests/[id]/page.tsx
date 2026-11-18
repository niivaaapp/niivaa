'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, Edit3, Save, Settings2, CalendarDays, Plus, Minus, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getActivityRequestById } from '../new/actions' // 🌟 นำเข้าฟังก์ชันดึงข้อมูล

// --- Helper Functions ---
const toThaiDate = (dateString: string, shortMonth = true) => {
    if (!dateString) return ''
    const d = new Date(dateString)
    const monthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
    const monthsFull = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
    return `${d.getDate()} ${shortMonth ? monthsShort[d.getMonth()] : monthsFull[d.getMonth()]} ${d.getFullYear() + 543}`
}

const addBusinessDays = (dateString: string, daysToAdd: number) => {
    const d = new Date(dateString)
    let added = 0
    while (added < daysToAdd) {
        d.setDate(d.getDate() + 1)
        if (d.getDay() !== 0 && d.getDay() !== 6) added++
    }
    return d.toISOString().split('T')[0]
}

const ThaiBahtText = (num: number): string => {
    const thb = num.toFixed(2).split('.')
    const numText = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"]
    const digitText = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"]
    let result = "", baht = thb[0], satang = thb[1]
    
    if (Number(baht) === 0) result = "ศูนย์"
    else {
        let len = baht.length
        for (let i = 0; i < len; i++) {
            const digit = parseInt(baht.charAt(i)), position = len - i - 1
            if (digit !== 0) {
                if (position === 0 && digit === 1 && len > 1) result += "เอ็ด"
                else if (position === 1 && digit === 1) result += ""
                else if (position === 1 && digit === 2) result += "ยี่"
                else result += numText[digit]
                result += digitText[position]
            }
        }
    }
    result += "บาท"
    
    if (Number(satang) === 0) result += "ถ้วน"
    else {
        let len = satang.length
        for (let i = 0; i < len; i++) {
            const digit = parseInt(satang.charAt(i)), position = len - i - 1
            if (digit !== 0) {
                if (position === 0 && digit === 1 && len > 1) result += "เอ็ด"
                else if (position === 1 && digit === 1) result += ""
                else if (position === 1 && digit === 2) result += "ยี่"
                else result += numText[digit]
                result += digitText[position]
            }
        }
        result += "สตางค์"
    }
    return result
}

export default function MemoDocumentPreview() {
    const params = useParams()
    const router = useRouter()
    
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [requestMode, setRequestMode] = useState<1 | 2 | 3>(1)
    const [approvalMode, setApprovalMode] = useState<1 | 2 | 3>(2) 
    const [dateMode, setDateMode] = useState<'SAME' | 'NEXT_DAY' | 'MANUAL'>('SAME')
    const [showBrandInAttachment, setShowBrandInAttachment] = useState(true)
    const [pageConfig, setPageConfig] = useState({ marginTop: 25, marginBottom: 20, marginLeft: 30, marginRight: 20, lineHeight: 1.15 })

    // 🌟 โครงสร้างข้อมูลตั้งต้น (รอรับข้อมูลจริงจาก DB)
    const [docData, setDocData] = useState<any>({
        schoolName: 'กำลังโหลด...', docNo: 'รอออกเลข', docDate: new Date().toISOString().split('T')[0],
        subject: 'ขออนุญาตดำเนินงานตามโครงการ/กิจกรรม และขออนุมัติใช้เงินงบประมาณ', to: 'ผู้อำนวยการโรงเรียน',
        reqName: '', reqPosition: '', reqSubDept: '', reqDept: '',
        projectName: '', activityName: '', activityCode: '', planPage: '-',
        budgetAllocated: 0, budgetRequested: 0, budgetCategory: '', startDate: '',
        fundingSources: '-', mode3Reason: '',
        isRegisteredByPlan: false, receiveNo: 'รอรับเรื่อง', receiveDate: '',
        materialExpenses: [], generalExpenses: []
    })

    // 🌟 ฟังก์ชันดึงข้อมูลจาก Database เมื่อโหลดหน้า
    useEffect(() => {
        const loadData = async () => {
            if (!params.id) return;
            const res = await getActivityRequestById(params.id as string);
            
            if (res.success && res.data) {
                const { req, activity, project, employee, school, expenses, transfers, deptInfo } = res.data;
                
                // แยกพัสดุ และ ค่าใช้จ่ายทั่วไป
                const materials = expenses.filter((e:any) => e.expense_type === 'MATERIAL').map((e:any) => ({
                    id: e.id, item_code: e.item_code || '', item_name: e.item_name, brand: e.brand || '',
                    qty: e.qty_a, unit: e.unit_a, unit_price: e.unit_price, total: e.total_price
                }));
                const generals = expenses.filter((e:any) => e.expense_type === 'GENERAL').map((e:any) => ({
                    id: e.id, expense_category: e.expense_category, item_name: e.item_name,
                    qty_a: e.qty_a, unit_a: e.unit_a, qty_b: e.qty_b || '', unit_b: e.unit_b || '',
                    unit_price: e.unit_price, total: e.total_price
                }));

                // สร้างข้อความโอนงบ (ถ้ามี)
                let fundingText = '-';
                if (transfers && transfers.length > 0) {
                    fundingText = transfers.map((t:any) => `กิจกรรม${t.from_activity?.activity_name} จำนวน ${Number(t.transfer_amount).toLocaleString()} บาท`).join(' และ ');
                    setRequestMode(2); // ถ้ามีการโอนงบ ปรับโหมดเป็นแบบที่ 2 ชั่วคราว (หรือ 3 ถ้าเป็นกิจกรรมนอกแผน)
                }

                setDocData({
                    schoolName: school?.school_name || 'โรงเรียน...',
                    docNo: req.request_no || 'รอออกเลข',
                    docDate: req.request_date,
                    subject: 'ขออนุญาตดำเนินงานตามโครงการ/กิจกรรม และขออนุมัติใช้เงินงบประมาณ',
                    to: `ผู้อำนวยการ${school?.school_name || 'โรงเรียน'}`,
                    reqName: `${employee?.prefix || ''}${employee?.first_name || ''} ${employee?.last_name || ''}`,
                    reqPosition: employee?.position_title || employee?.academic_standing || 'ครู',
                    reqSubDept: deptInfo?.subdepartment_name || 'กลุ่มงาน...',
                    reqDept: deptInfo?.department_name || 'กลุ่มบริหาร...',
                    projectName: project?.project_name || '-',
                    activityName: activity?.activity_name || '-',
                    activityCode: activity?.activity_code || '-',
                    planPage: '-',
                    budgetAllocated: Number(activity?.budget_allocated) || 0,
                    budgetRequested: Number(req.requested_budget) || 0,
                    budgetCategory: activity?.fund_type || '-',
                    startDate: req.start_date ? toThaiDate(req.start_date, false) : '-',
                    fundingSources: fundingText,
                    mode3Reason: req.target_others || '-', // ดึงเหตุผลมาแสดง
                    isRegisteredByPlan: req.status !== 'DRAFT',
                    receiveNo: req.status !== 'DRAFT' ? 'รอลงรับ' : '-',
                    receiveDate: req.status !== 'DRAFT' ? toThaiDate(new Date().toISOString()) : '-',
                    materialExpenses: materials,
                    generalExpenses: generals
                });
            } else {
                alert('ไม่พบข้อมูลเอกสาร หรือเกิดข้อผิดพลาด');
            }
            setIsLoading(false);
        };
        loadData();
    }, [params.id]);

    const grandTotal = docData.budgetRequested;
    const hasMaterials = docData.materialExpenses.length > 0;
    const hasGeneralExpenses = docData.generalExpenses.length > 0;
    
    const approvers = {
        step1: { name: 'ชื่อหัวหน้างาน', title: `หัวหน้า${docData.reqSubDept}` },
        step2: { name: 'ชื่อรองผู้อำนวยการ', title: `รองผู้อำนวยการ${docData.reqDept}` },
        step3: { name: 'ชื่อหัวหน้าแผนงาน', title: 'หัวหน้างานแผนงาน' },
        step4: { name: 'ชื่อหัวหน้างบประมาณ', title: 'หัวหน้ากลุ่มบริหารงบประมาณ' },
        step5: { name: 'ชื่อรองฯงบประมาณ', title: 'รองผู้อำนวยการกลุ่มบริหารงบประมาณ' },
        step6: { name: 'ชื่อผู้อำนวยการโรงเรียน', title: `ผู้อำนวยการ${docData.schoolName}` }
    }

    const [manualDates, setManualDates] = useState({
        step1: docData.docDate, step2: docData.docDate, step3: addBusinessDays(docData.docDate, 1), 
        step4: addBusinessDays(docData.docDate, 1), step5: addBusinessDays(docData.docDate, 1), step6: addBusinessDays(docData.docDate, 1),
    })

    const handlePrint = () => { setIsEditing(false); setTimeout(() => window.print(), 100) }

    const renderAutoData = (content: React.ReactNode) => (<span className={isEditing ? "text-blue-600 font-bold bg-blue-50/50 px-1 rounded transition-colors" : "font-bold"}>{content}</span>)
    const renderEditable = (field: keyof typeof docData, placeholder = "") => {
        const value = String(docData[field] || '')
        if (!isEditing) return <span>{value}</span>
        return (
            <input type="text" value={value} onChange={e => setDocData((prev:any) => ({...prev, [field]: e.target.value}))} placeholder={placeholder}
                className="bg-yellow-100 border-b border-yellow-400 text-black px-1 outline-none font-bold focus:bg-yellow-200 transition-colors"
                style={{ width: `${Math.max(value.length * 8, 50)}px`, minWidth: '50px' }}
            />
        )
    }

    const generatePreviewText = (exp: any, idx: number) => {
        let t = `${idx + 1}. ${exp.item_name} `
        if (exp.expense_category === 'TRANSPORT' && exp.unit_a === 'กม.') t += `ระยะทาง ไป-กลับ ${exp.qty_a || 0} ${exp.unit_a}ต่อเที่ยว ` + (exp.unit_b ? `จำนวน ${exp.qty_b || 0} ${exp.unit_b} ` : '') + `อัตรา ${exp.unit_price || 0} บาท/${exp.unit_a} `
        else {
            if (exp.unit_a) t += `จำนวน ${exp.qty_a || 0} ${exp.unit_a} `
            if (exp.unit_b) t += (exp.unit_a === 'คน' && (exp.unit_b === 'วัน' || exp.unit_b === 'คืน') ? 'คนละ ' : 'จำนวน ') + `${exp.qty_b || 0} ${exp.unit_b} `
            t += `อัตรา ${exp.unit_price || 0} บาท` + (exp.unit_b && exp.unit_a ? `/${exp.unit_b}/${exp.unit_a} ` : exp.unit_b ? `/${exp.unit_b} ` : exp.unit_a && exp.unit_a !== 'งาน' ? `/${exp.unit_a} ` : ' ')
        }
        t += `เป็นเงิน ${exp.total.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท`
        return t
    }

    const adjustDate = (step: keyof typeof manualDates, direction: 1 | -1) => {
        setManualDates(prev => {
            const d = new Date(prev[step])
            d.setDate(d.getDate() + direction)
            return { ...prev, [step]: d.toISOString().split('T')[0] }
        })
    }

    const ApprovalBox = ({ title, comment, name, stepKey }: { title: string, comment: string, name: string, stepKey: keyof typeof manualDates }) => {
        let displayDate = ''
        if (dateMode === 'SAME') displayDate = toThaiDate(docData.docDate)
        else if (dateMode === 'NEXT_DAY') displayDate = (stepKey === 'step1' || stepKey === 'step2') ? toThaiDate(docData.docDate) : toThaiDate(addBusinessDays(docData.docDate, 1))
        else if (dateMode === 'MANUAL') displayDate = toThaiDate(manualDates[stepKey])

        return (
            <div className="flex flex-col text-center text-[12pt] leading-tight mt-2">
                <div className="font-bold mb-1 text-left">{title}</div>
                {approvalMode === 1 ? (
                    <div className="text-gray-400 my-4 italic border-2 border-dashed border-gray-200 rounded p-2">(รอการพิจารณาในระบบ)</div>
                ) : (
                    <>
                        <div className="mb-4 text-left ml-4">{comment}</div>
                        <div className="mb-2">(ลงชื่อ)........................................................</div>
                        <div>( {name} )</div>
                        {approvalMode === 2 ? <div className="mt-1">วันที่ ......./......./.......</div> : (
                            <div className="mt-1 flex items-center justify-center gap-2 group">
                                {isEditing && dateMode === 'MANUAL' && <button onClick={() => adjustDate(stepKey, -1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 print:hidden"><Minus className="w-3 h-3"/></button>}
                                <span className={isEditing && dateMode === 'MANUAL' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : ''}>{displayDate}</span>
                                {isEditing && dateMode === 'MANUAL' && <button onClick={() => adjustDate(stepKey, 1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 print:hidden"><Plus className="w-3 h-3"/></button>}
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }

    if (isLoading) return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังโหลดข้อมูลเอกสาร...</div>

    return (
        <div className="min-h-screen bg-[#0B1528] p-4 md:p-8 flex flex-col items-center font-sans pb-20">
            
            {/* แถบเครื่องมือควบคุม */}
            <div className="w-full max-w-[210mm] mb-4 flex flex-col gap-4 bg-[#002B49] p-4 rounded-xl print:hidden shadow-lg border border-[#008080]/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="text-white font-medium flex items-center gap-4">
                        <span className="text-[#98FB98]">โหมดเอกสาร: </span>
                        <select value={requestMode} onChange={e => setRequestMode(Number(e.target.value) as 1|2|3)} className="bg-gray-800 border border-gray-600 focus:border-[#98FB98] text-white rounded px-3 py-1.5 text-sm outline-none">
                            <option value={1}>1: แผนปกติ</option>
                            <option value={2}>2: ขอเพิ่มงบ (โอนงบ)</option>
                            <option value={3}>3: นอกแผน (โอนงบ)</option>
                        </select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Link href="/smartschool/planning/requests/new" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm border border-gray-600 transition-colors flex items-center">
                            <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าแบบฟอร์ม
                        </Link>
                        <button onClick={() => setIsEditing(prev => !prev)} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${isEditing ? 'bg-[#008080] hover:bg-[#006666]' : 'bg-amber-600 hover:bg-amber-500'} text-white`}>
                            {isEditing ? <><Save className="w-4 h-4" /> ปิดโหมดแก้ไข</> : <><Edit3 className="w-4 h-4" /> โหมดแก้ไขเอกสาร</>}
                        </button>
                        <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm transition-all shadow-lg">
                            <Printer className="w-4 h-4" /> พิมพ์ / PDF
                        </button>
                    </div>
                </div>

                {isEditing && (
                    <div className="flex flex-col gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-sm text-gray-300">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="font-bold text-amber-400 flex items-center gap-2">สายการอนุมัติ:</span>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="appMode" checked={approvalMode === 1} onChange={() => setApprovalMode(1)} /> 1. ว่างไว้ (รอระบบ)</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="appMode" checked={approvalMode === 2} onChange={() => setApprovalMode(2)} /> 2. เว้นวันที่ (เซ็นสด)</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="appMode" checked={approvalMode === 3} onChange={() => setApprovalMode(3)} /> 3. พิมพ์วันที่ (Hybrid)</label>
                        </div>
                        {approvalMode === 3 && (
                            <div className="flex flex-wrap items-center gap-4 bg-gray-800 p-2 rounded border border-gray-600">
                                <span className="font-bold text-blue-300 flex items-center gap-2"><CalendarDays className="w-4 h-4"/> รูปแบบวันที่:</span>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dMode" checked={dateMode === 'SAME'} onChange={() => setDateMode('SAME')} /> วันเดียวกันหมด</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dMode" checked={dateMode === 'NEXT_DAY'} onChange={() => setDateMode('NEXT_DAY')} /> ต้นเรื่อง/วันถัดไป</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dMode" checked={dateMode === 'MANUAL'} onChange={() => setDateMode('MANUAL')} /> ปรับเองอิสระ (+/-)</label>
                            </div>
                        )}
                        <div className="w-full h-px bg-gray-700 my-1"></div>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-teal-400 flex items-center gap-2"><Settings2 className="w-4 h-4"/> ปรับขอบกระดาษ (มม.):</span>
                                <label>บน: <input type="number" value={pageConfig.marginTop} onChange={e => setPageConfig({...pageConfig, marginTop: Number(e.target.value)})} className="w-12 bg-gray-800 border border-gray-600 rounded px-1 py-1 text-center outline-none" /></label>
                                <label>ล่าง: <input type="number" value={pageConfig.marginBottom} onChange={e => setPageConfig({...pageConfig, marginBottom: Number(e.target.value)})} className="w-12 bg-gray-800 border border-gray-600 rounded px-1 py-1 text-center outline-none" /></label>
                            </div>
                            {hasMaterials && (
                                <button onClick={() => setShowBrandInAttachment(!showBrandInAttachment)} className="flex items-center gap-2 px-3 py-1.5 bg-teal-900/50 hover:bg-teal-800 border border-teal-500 rounded text-teal-300 font-bold transition-colors">
                                    {showBrandInAttachment ? <EyeOff size={16}/> : <Eye size={16}/>} 
                                    {showBrandInAttachment ? 'ซ่อนยี่ห้อในใบแนบ' : 'แสดงยี่ห้อในใบแนบ'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ==================================================== */}
            {/* 📄 หน้าที่ 1: บันทึกข้อความขออนุมัติ (A4) */}
            {/* ==================================================== */}
            <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto print:shadow-none print:bg-transparent overflow-hidden mb-8 flex flex-col justify-between"
                style={{ fontFamily: "'TH SarabunPSK', 'TH Sarabun New', serif", paddingTop: `${pageConfig.marginTop}mm`, paddingBottom: `${pageConfig.marginBottom}mm`, paddingLeft: `${pageConfig.marginLeft}mm`, paddingRight: `${pageConfig.marginRight}mm`, lineHeight: pageConfig.lineHeight }}
            >
                <div>
                    <div className="absolute top-[18mm] right-[20mm] w-[5.5cm] z-10 text-[12pt] leading-tight text-left">
                        {docData.isRegisteredByPlan ? (
                            <div className={`${isEditing ? 'bg-blue-50/50 p-1 -m-1 rounded transition-colors' : ''}`}>
                                <p className="font-bold">งานแผนงาน กลุ่มบริหารงบประมาณ</p>
                                <p>เลขรับที่: {renderAutoData(docData.receiveNo)}</p>
                                <p>วันที่: {renderAutoData(docData.receiveDate)}</p>
                            </div>
                        ) : (
                            <div className={`border-2 border-dashed border-gray-300 text-gray-400 p-2 text-center ${!isEditing && 'print:hidden'}`}>รอเจ้าหน้าที่แผนงาน<br/>ลงทะเบียนรับเรื่อง</div>
                        )}
                    </div>

                    <div className="text-[16pt]">
                        <div className="relative h-[1.5cm] flex items-end mb-4">
                            <div className="absolute left-0 bottom-0 h-[1.5cm] z-20"><img src="/krut.png" alt="ตราครุฑ" className="h-[1.5cm] w-auto object-contain fallback-krut" /></div>
                            <div className="w-full text-center"><h1 className="font-bold tracking-wide leading-none" style={{ fontSize: '35pt', marginBottom: '-5px' }}>บันทึกข้อความ</h1></div>
                        </div>

                        <div className="space-y-1 mb-4">
                            <div className="flex items-baseline gap-4"><span className="font-bold text-[20pt]">ส่วนราชการ</span>{renderEditable('schoolName')}</div>
                            <div className="flex items-baseline justify-between">
                                <div className="flex items-baseline gap-4"><span className="font-bold text-[20pt]">ที่</span>{renderAutoData(docData.docNo)}</div>
                                <div className="flex items-baseline gap-4 w-[50%]"><span className="font-bold text-[20pt]">วันที่</span><span className={isEditing ? "text-blue-600 font-bold bg-blue-50 px-1 rounded" : "font-bold"}>{toThaiDate(docData.docDate, false)}</span></div>
                            </div>
                            <div className="flex items-baseline gap-4"><span className="font-bold text-[20pt]">เรื่อง</span>{renderEditable('subject')}</div>
                            <div className="flex items-baseline gap-4"><span className="font-bold text-[20pt]">เรียน</span>{renderEditable('to')}</div>
                        </div>

                        <div className="mb-4 text-justify">
                            <div className="indent-[2.5cm]">ด้วยข้าพเจ้า {renderAutoData(docData.reqName)} ปฏิบัติหน้าที่{renderAutoData(docData.reqPosition)} มีความประสงค์จะดำเนินงานโครงการ {renderAutoData(docData.projectName)} กิจกรรม {renderAutoData(docData.activityName)}</div>

                            <div className="indent-[2.5cm]">
                                {requestMode === 1 && (
                                    <>กิจกรรมนี้อยู่ในแผนปฏิบัติการประจำปีงบประมาณ หน้าที่ {renderAutoData(docData.planPage)} รหัสกิจกรรม {renderAutoData(docData.activityCode)} ได้รับจัดสรรงบประมาณ {renderAutoData(docData.budgetAllocated.toLocaleString())} บาท คงเหลือ {renderAutoData(docData.budgetAllocated.toLocaleString())} บาท ครั้งนี้ขอใช้ {renderAutoData(docData.budgetRequested.toLocaleString())} บาท จาก{renderAutoData(docData.budgetCategory)} กำหนดจัดกิจกรรมในวันที่ {renderAutoData(docData.startDate)} โดยมีรายละเอียดประมาณการค่าใช้จ่าย ดังนี้</>
                                )}
                                {requestMode === 2 && (
                                    <>กิจกรรมนี้อยู่ในแผนปฏิบัติการประจำปีงบประมาณ รหัสกิจกรรม {renderAutoData(docData.activityCode)} แต่งบประมาณที่ได้รับจัดสรรคงเหลือ จำนวน {renderAutoData(docData.budgetAllocated.toLocaleString())} บาท ไม่เพียงพอ จึงขออนุมัติเพิ่มวงเงิน โดยขอเปลี่ยนแปลงโอนงบประมาณจาก {renderAutoData(docData.fundingSources)} รวมเป็นจำนวนเงินที่ขอใช้ครั้งนี้ {renderAutoData(docData.budgetRequested.toLocaleString())} บาท จาก{renderAutoData(docData.budgetCategory)} กำหนดจัดกิจกรรมในวันที่ {renderAutoData(docData.startDate)} โดยมีรายละเอียดประมาณการค่าใช้จ่าย ดังนี้</>
                                )}
                                {requestMode === 3 && (
                                    <>กิจกรรมนี้ไม่มีในแผนปฏิบัติการประจำปีงบประมาณ แต่มีความจำเป็นต้องดำเนินการ เนื่องจาก{renderAutoData(docData.mode3Reason)} จึงขออนุญาตจัดกิจกรรมใหม่ โดยขอโอนงบประมาณจาก {renderAutoData(docData.fundingSources)} จำนวน {renderAutoData(docData.budgetRequested.toLocaleString())} บาท กำหนดจัดกิจกรรมในวันที่ {renderAutoData(docData.startDate)} โดยมีรายละเอียดประมาณการค่าใช้จ่าย ดังนี้</>
                                )}
                            </div>

                            <div className="ml-[2.5cm] mt-2 mb-2">
                                {hasGeneralExpenses && docData.generalExpenses.map((exp:any, idx:number) => (
                                    <div key={exp.id} className="flex">
                                        <span className={isEditing ? "text-blue-600 font-bold bg-blue-50 px-1 rounded mb-1" : ""}>{generatePreviewText(exp, idx)}</span>
                                    </div>
                                ))}
                                {hasMaterials && (
                                    <div className="mt-1 flex items-start">
                                        <span className={isEditing ? "text-blue-600 font-bold bg-blue-50 px-1 rounded" : ""}>
                                            {hasGeneralExpenses ? `${docData.generalExpenses.length + 1}. ` : '1. '}
                                            รายการพัสดุ (วัสดุ/ครุภัณฑ์/จ้างเหมา) จำนวน {docData.materialExpenses.length} รายการ เป็นเงิน {docData.materialExpenses.reduce((s:any,i:any)=>s+i.total,0).toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท <span className="font-bold underline">(ดังรายละเอียดตามเอกสารแนบ)</span>
                                        </span>
                                    </div>
                                )}
                                <div className="font-bold mt-2">รวมเป็นเงินทั้งสิ้น <span className={isEditing ? "text-blue-600 font-bold bg-blue-50 px-1" : ""}>{grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span> บาท </div>
                                <div className="font-bold text-gray-700 italic">({ThaiBahtText(grandTotal)})</div>
                            </div>

                            <div className="indent-[2.5cm]">จึงเรียนมาเพื่อโปรดพิจารณาอนุญาตให้ดำเนินกิจกรรม และอนุมัติให้ใช้งบประมาณ</div>
                        </div>

                        <div className="flex justify-end mb-4">
                            <div className="w-[45%] text-center text-[14pt]">
                                <p className="mb-4">(ลงชื่อ)........................................................</p>
                                <p>( {renderAutoData(docData.reqName)} )</p>
                                <p>{renderAutoData(docData.reqPosition)}</p>
                            </div>
                        </div>

                        {/* Grid 4 ตำแหน่งในหน้าแรก */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1 pl-4">
                            <ApprovalBox title={`ความเห็น${approvers.step1.title}`} comment="เห็นควรอนุญาต/อนุมัติ" name={approvers.step1.name} stepKey="step1" />
                            <ApprovalBox title={`ความเห็น${approvers.step2.title}`} comment="เห็นควรอนุญาต/อนุมัติ" name={approvers.step2.name} stepKey="step2" />
                            <ApprovalBox title={`ความเห็น${approvers.step3.title}`} comment="ตรวจสอบแล้ว ถูกต้องตามแผน" name={approvers.step3.name} stepKey="step3" />
                            <ApprovalBox title={`ความเห็น${approvers.step4.title}`} comment="เห็นควรอนุญาต/อนุมัติ" name={approvers.step4.name} stepKey="step4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================================================== */}
            {/* 📄 หน้าที่ 2: สายการอนุมัติส่วนที่เหลือ */}
            {/* ==================================================== */}
            <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto print:shadow-none print:bg-transparent overflow-hidden mb-8 print:break-before-page flex flex-col justify-start"
                style={{ fontFamily: "'TH SarabunPSK', 'TH Sarabun New', serif", paddingTop: `${pageConfig.marginTop}mm`, paddingBottom: `${pageConfig.marginBottom}mm`, paddingLeft: `${pageConfig.marginLeft}mm`, paddingRight: `${pageConfig.marginRight}mm`, lineHeight: pageConfig.lineHeight }}
            >
                <div className="text-[16pt]">
                    <div className="text-right text-sm text-gray-500 mb-8 italic">-- อนุมัติโครงการ (ต่อ) --</div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-8 pl-4">
                        <ApprovalBox 
                            title={`ความเห็น${approvers.step5.title}`} 
                            comment={`เห็นควรอนุญาต/อนุมัติ จำนวน ${grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท`} 
                            name={approvers.step5.name} 
                            stepKey="step5" 
                        />
                        
                        <div className="flex flex-col text-center text-[12pt] leading-tight mt-2">
                            <div className="font-bold mb-1 text-left">คำสั่งผู้อำนวยการโรงเรียน</div>
                            {approvalMode === 1 ? <div className="text-gray-400 my-4 italic border-2 border-dashed border-gray-200 rounded p-2">(รอการพิจารณาในระบบ)</div> : (
                                <>
                                    <div className="mb-4 text-left ml-4 font-bold">[ &nbsp; ] อนุญาต/อนุมัติ &nbsp;&nbsp; [ &nbsp; ] ไม่อนุมัติ</div>
                                    <div className="mb-2">(ลงชื่อ)........................................................</div>
                                    <div>( {approvers.step6.name} )</div>
                                    {approvalMode === 2 ? <div className="mt-1">วันที่ ......./......./.......</div> : (
                                        <div className="mt-1 flex items-center justify-center gap-2 group">
                                            {isEditing && dateMode === 'MANUAL' && <button onClick={() => adjustDate('step6', -1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 print:hidden"><Minus className="w-3 h-3"/></button>}
                                            <span className={isEditing && dateMode === 'MANUAL' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : ''}>
                                                {dateMode === 'SAME' ? toThaiDate(docData.docDate) : dateMode === 'NEXT_DAY' ? toThaiDate(addBusinessDays(docData.docDate, 1)) : toThaiDate(manualDates.step6)}
                                            </span>
                                            {isEditing && dateMode === 'MANUAL' && <button onClick={() => adjustDate('step6', 1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 print:hidden"><Plus className="w-3 h-3"/></button>}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ==================================================== */}
            {/* 📄 หน้าที่ 3: ใบแนบรายละเอียดพัสดุ */}
            {/* ==================================================== */}
            {hasMaterials && (
                <div className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto print:shadow-none print:break-before-page p-[2cm]"
                    style={{ fontFamily: "'TH SarabunPSK', 'TH Sarabun New', serif" }}
                >
                    <div className="text-[16pt]">
                        <h2 className="text-center font-bold text-[18pt] mb-2">รายละเอียดประมาณการค่าใช้จ่าย (รายการพัสดุ/จ้างเหมา)</h2>
                        <h3 className="text-center mb-6">แนบท้ายบันทึกข้อความ ที่ {renderAutoData(docData.docNo)} ลงวันที่ {toThaiDate(docData.docDate, false)}</h3>
                        
                        <table className="w-full border-collapse border border-black text-center text-[14pt]">
                            <thead>
                                <tr>
                                    <th className="border border-black p-2 w-[10%]">ลำดับ</th>
                                    <th className="border border-black p-2">รายการพัสดุ</th>
                                    {showBrandInAttachment && <th className="border border-black p-2 w-[15%]">ยี่ห้อ</th>}
                                    <th className="border border-black p-2 w-[10%]">จำนวน</th>
                                    <th className="border border-black p-2 w-[10%]">หน่วย</th>
                                    <th className="border border-black p-2 w-[15%]">ราคาต่อหน่วย</th>
                                    <th className="border border-black p-2 w-[15%]">รวมเงิน (บาท)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {docData.materialExpenses.map((exp:any, idx:number) => (
                                    <tr key={exp.id}>
                                        <td className="border border-black p-2">{idx + 1}</td>
                                        <td className="border border-black p-2 text-left">{exp.item_name}</td>
                                        {showBrandInAttachment && <td className="border border-black p-2">{exp.brand || '-'}</td>}
                                        <td className="border border-black p-2">{exp.qty}</td>
                                        <td className="border border-black p-2">{exp.unit}</td>
                                        <td className="border border-black p-2 text-right">{exp.unit_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                        <td className="border border-black p-2 text-right">{exp.total.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={showBrandInAttachment ? 5 : 4} className="border border-black p-2 text-right font-bold">รวมค่าพัสดุทั้งสิ้น</td>
                                    <td colSpan={2} className="border border-black p-2 text-center font-bold underline decoration-double">
                                        {docData.materialExpenses.reduce((s:any,i:any)=>s+i.total,0).toLocaleString('th-TH', {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div className="mt-2 text-center font-bold text-gray-700 italic">
                            ({ThaiBahtText(docData.materialExpenses.reduce((s:any,i:any)=>s+i.total,0))})
                        </div>

                        <div className="mt-8 flex justify-between px-10 text-[14pt] text-center">
                            <div>
                                <p className="mb-8">(ลงชื่อ)........................................................ผู้เสนอโครงการ</p>
                                <p>( {renderAutoData(docData.reqName)} )</p>
                            </div>
                            <div>
                                <p className="mb-8">(ลงชื่อ)........................................................ผู้อนุมัติ</p>
                                <p>( {approvers.step6.name} )</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .fallback-krut { background-color: #f3f4f6; color: #9ca3af; font-size: 10px; display: flex; align-items: center; justify-content: center; }
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    )
}