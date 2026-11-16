'use client'

import { useState } from 'react'
import { Printer, Edit3, Save, Settings2, CalendarDays, Plus, Minus } from 'lucide-react'

// --- Helper Functions สำหรับจัดการวันที่ภาษาไทย ---
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
        if (d.getDay() !== 0 && d.getDay() !== 6) added++ // ข้ามเสาร์-อาทิตย์
    }
    return d.toISOString().split('T')[0]
}

export default function MemoDocumentPreview() {
    const [isEditing, setIsEditing] = useState(false)
    const [requestMode, setRequestMode] = useState<1 | 2 | 3>(1)

    // --- State สำหรับ Approval Routing ---
    const [approvalMode, setApprovalMode] = useState<1 | 2 | 3>(2) // 1=E-Doc, 2=Paper(เว้นวันที่), 3=Hybrid(พิมพ์วันที่)
    const [dateMode, setDateMode] = useState<'SAME' | 'NEXT_DAY' | 'MANUAL'>('SAME')
    
    // ตั้งค่าหน้ากระดาษ
    const [pageConfig, setPageConfig] = useState({
        marginTop: 25, marginBottom: 20, marginLeft: 30, marginRight: 20, lineHeight: 1.15
    })

    // ข้อมูลเอกสารจำลอง (ดึงจากหน้าสร้างบันทึกข้อความ)
    const [docData, setDocData] = useState({
        schoolName: 'โรงเรียนตัวอย่าง สพม.แสนเจริญ',
        docNo: 'วก.01/1',
        docDate: new Date().toISOString().split('T')[0], // วันที่เสนอเรื่อง (YYYY-MM-DD)
        subject: 'ขออนุญาตดำเนินงานตามโครงการ/กิจกรรม และขออนุมัติใช้เงินงบประมาณ',
        to: 'ผู้อำนวยการโรงเรียนตัวอย่าง สพม.แสนเจริญ',
        
        reqName: 'นางมุ่งงาน การกุศล',
        reqPosition: 'ครูชำนาญการพิเศษ',
        reqSubDept: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์ฯ',
        reqDept: 'กลุ่มบริหารวิชาการ',

        projectName: 'โครงการพัฒนาผู้เรียน',
        activityName: 'กิจกรรมการวิจัยในชั้นเรียน',
        activityCode: '1601',
        planPage: '67',
        budgetAllocated: 35000,
        budgetRequested: 38000,
        budgetCategory: 'เงินอุดหนุนรายหัว',
        startDate: '25 พฤศจิกายน 2568',
        
        fundingSources: 'กิจกรรมการบริการเทคโนโลยีฯ จำนวน 3,000 บาท',
        
        isRegisteredByPlan: true, 
        receiveNo: '15', 
        receiveDate: toThaiDate(new Date().toISOString()),
    })

    // ข้อมูลวันที่สำหรับการลงนามใน Mode 3 (MANUAL)
    const [manualDates, setManualDates] = useState({
        step1: docData.docDate, // หัวหน้าต้นเรื่อง
        step2: docData.docDate, // รองฯ ต้นเรื่อง
        step3: addBusinessDays(docData.docDate, 1), // แผนงาน
        step4: addBusinessDays(docData.docDate, 1), // หัวหน้างบ
        step5: addBusinessDays(docData.docDate, 1), // รองฯ งบ
        step6: addBusinessDays(docData.docDate, 1), // ผอ.
    })

    const handlePrint = () => {
        setIsEditing(false)
        setTimeout(() => window.print(), 100)
    }

    // --- Helper Functions สำหรับ Render ข้อความ ---
    const renderAutoData = (content: React.ReactNode) => (
        <span className={isEditing ? "text-blue-600 font-bold bg-blue-50/50 px-1 rounded transition-colors" : "font-bold"}>{content}</span>
    )

    const renderEditable = (field: keyof typeof docData, placeholder = "") => {
        const value = String(docData[field])
        if (!isEditing) return <span>{value}</span>
        return (
            <input 
                type="text" value={value} onChange={e => setDocData(prev => ({...prev, [field]: e.target.value}))} placeholder={placeholder}
                className="bg-yellow-100 border-b border-yellow-400 text-black px-1 outline-none font-bold focus:bg-yellow-200 transition-colors"
                style={{ width: `${Math.max(value.length * 8, 50)}px`, minWidth: '50px' }}
            />
        )
    }

    // ฟังก์ชันช่วยจัดการเพิ่มลดวัน (Manual Mode)
    const adjustDate = (step: keyof typeof manualDates, direction: 1 | -1) => {
        setManualDates(prev => {
            const d = new Date(prev[step])
            d.setDate(d.getDate() + direction)
            return { ...prev, [step]: d.toISOString().split('T')[0] }
        })
    }

    // --- Component สำหรับสร้างกล่องลงนาม ---
    const ApprovalBox = ({ title, comment, name, stepKey }: { title: string, comment: string, name: string, stepKey: keyof typeof manualDates }) => {
        
        let displayDate = ''
        if (dateMode === 'SAME') displayDate = toThaiDate(docData.docDate)
        else if (dateMode === 'NEXT_DAY') {
            displayDate = (stepKey === 'step1' || stepKey === 'step2') 
                ? toThaiDate(docData.docDate) 
                : toThaiDate(addBusinessDays(docData.docDate, 1))
        } else if (dateMode === 'MANUAL') {
            displayDate = toThaiDate(manualDates[stepKey])
        }

        return (
            <div className="flex flex-col text-center text-[12pt] leading-tight mt-2">
                <div className="font-bold mb-1 text-left">{title}</div>
                
                {approvalMode === 1 ? (
                    // Mode 1: รอเข้าระบบ
                    <div className="text-gray-400 my-4 italic border-2 border-dashed border-gray-200 rounded p-2">(รอการพิจารณาในระบบ)</div>
                ) : (
                    // Mode 2 & 3: ปริ้นท์กระดาษ
                    <>
                        <div className="mb-4 text-left ml-4">{comment}</div>
                        <div className="mb-2">(ลงชื่อ)........................................................</div>
                        <div>( {name} )</div>
                        
                        {approvalMode === 2 ? (
                            <div className="mt-1">วันที่ ......./......./.......</div>
                        ) : (
                            <div className="mt-1 flex items-center justify-center gap-2 group">
                                {isEditing && dateMode === 'MANUAL' && (
                                    <button onClick={() => adjustDate(stepKey, -1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 print:hidden"><Minus className="w-3 h-3"/></button>
                                )}
                                <span className={isEditing && dateMode === 'MANUAL' ? 'text-blue-600 font-bold bg-blue-50 px-1 rounded' : ''}>
                                    {displayDate}
                                </span>
                                {isEditing && dateMode === 'MANUAL' && (
                                    <button onClick={() => adjustDate(stepKey, 1)} className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 print:hidden"><Plus className="w-3 h-3"/></button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0B1528] p-4 md:p-8 flex flex-col items-center font-sans pb-20">
            
            {/* แถบเครื่องมือควบคุม */}
            <div className="w-full max-w-[210mm] mb-4 flex flex-col gap-4 bg-[#002B49] p-4 rounded-xl print:hidden shadow-lg border border-[#008080]/50">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="text-white font-medium flex items-center gap-4">
                        <span className="text-[#98FB98]">เนื้อหาบันทึก: </span>
                        <select value={requestMode} onChange={e => setRequestMode(Number(e.target.value) as 1|2|3)} className="bg-gray-800 border border-gray-600 focus:border-[#98FB98] text-white rounded px-3 py-1.5 text-sm outline-none">
                            <option value={1}>1: แผนปกติ</option>
                            <option value={2}>2: ขอเพิ่มงบ</option>
                            <option value={3}>3: นอกแผน</option>
                        </select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={() => setIsEditing(prev => !prev)} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${isEditing ? 'bg-[#008080] hover:bg-[#006666]' : 'bg-amber-600 hover:bg-amber-500'} text-white`}>
                            {isEditing ? <><Save className="w-4 h-4" /> ปิดโหมดแก้ไข</> : <><Edit3 className="w-4 h-4" /> โหมดแก้ไขเอกสาร</>}
                        </button>
                        <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm transition-all shadow-lg">
                            <Printer className="w-4 h-4" /> พิมพ์ / PDF
                        </button>
                    </div>
                </div>

                {/* การตั้งค่า Approval Routing */}
                {isEditing && (
                    <div className="flex flex-col gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-sm text-gray-300">
                        
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="font-bold text-amber-400 flex items-center gap-2">สายการอนุมัติ (Approval Mode):</span>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="appMode" checked={approvalMode === 1} onChange={() => setApprovalMode(1)} /> 1. ว่างไว้ (รอระบบ E-Doc)</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="appMode" checked={approvalMode === 2} onChange={() => setApprovalMode(2)} /> 2. พิมพ์ข้อความ + เว้นวันที่ (เซ็นสด)</label>
                            <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="appMode" checked={approvalMode === 3} onChange={() => setApprovalMode(3)} /> 3. พิมพ์ข้อความ + พิมพ์วันที่ (Hybrid)</label>
                        </div>

                        {approvalMode === 3 && (
                            <div className="flex flex-wrap items-center gap-4 bg-gray-800 p-2 rounded border border-gray-600">
                                <span className="font-bold text-blue-300 flex items-center gap-2"><CalendarDays className="w-4 h-4"/> รูปแบบวันที่:</span>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dMode" checked={dateMode === 'SAME'} onChange={() => setDateMode('SAME')} /> วันเดียวกันหมด</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dMode" checked={dateMode === 'NEXT_DAY'} onChange={() => setDateMode('NEXT_DAY')} /> แบ่งต้นเรื่อง / วันถัดไป</label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="dMode" checked={dateMode === 'MANUAL'} onChange={() => setDateMode('MANUAL')} /> ปรับเองอิสระ (+/-)</label>
                            </div>
                        )}

                        <div className="w-full h-px bg-gray-700 my-1"></div>

                        <div className="flex flex-wrap items-center gap-4">
                            <span className="font-bold text-teal-400 flex items-center gap-2"><Settings2 className="w-4 h-4"/> ปรับขอบกระดาษ (มม.):</span>
                            <label>บน: <input type="number" value={pageConfig.marginTop} onChange={e => setPageConfig({...pageConfig, marginTop: Number(e.target.value)})} className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center outline-none" /></label>
                            <label>ล่าง: <input type="number" value={pageConfig.marginBottom} onChange={e => setPageConfig({...pageConfig, marginBottom: Number(e.target.value)})} className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center outline-none" /></label>
                            <label>บรรทัด: <input type="number" step="0.1" value={pageConfig.lineHeight} onChange={e => setPageConfig({...pageConfig, lineHeight: Number(e.target.value)})} className="w-14 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-center outline-none" /></label>
                        </div>
                    </div>
                )}
            </div>

            {/* 📄 หน้ากระดาษ A4 */}
            <div 
                className="bg-white text-black w-full max-w-[210mm] min-h-[297mm] shadow-2xl relative mx-auto print:shadow-none print:bg-transparent overflow-hidden"
                style={{ 
                    fontFamily: "'TH SarabunPSK', 'TH Sarabun New', 'TH SarabunIT๙', serif",
                    paddingTop: `${pageConfig.marginTop}mm`, paddingBottom: `${pageConfig.marginBottom}mm`,
                    paddingLeft: `${pageConfig.marginLeft}mm`, paddingRight: `${pageConfig.marginRight}mm`,
                    lineHeight: pageConfig.lineHeight
                }}
            >
                {/* 📝 Stamp รับหนังสือมุมขวาบน (ปรับไร้กรอบ, ชิดซ้าย 3 บรรทัด) */}
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
                    {/* ส่วนหัว: ตราครุฑ */}
                    <div className="relative h-[1.5cm] flex items-end mb-4">
                        <div className="absolute left-0 bottom-0 h-[1.5cm] z-20">
                            <img src="/krut.png" alt="ตราครุฑ" className="h-[1.5cm] w-auto object-contain fallback-krut" />
                        </div>
                        <div className="w-full text-center">
                            <h1 className="font-bold tracking-wide leading-none" style={{ fontSize: '35pt', marginBottom: '-5px' }}>บันทึกข้อความ</h1>
                        </div>
                    </div>

                    {/* ส่วนราชการ วันที่ เรื่อง */}
                    <div className="space-y-1 mb-4">
                        <div className="flex items-baseline gap-4">
                            <span className="font-bold text-[20pt]">ส่วนราชการ</span>
                            {renderEditable('schoolName')}
                        </div>
                        <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-4">
                                <span className="font-bold text-[20pt]">ที่</span>
                                {renderAutoData(docData.docNo)}
                            </div>
                            <div className="flex items-baseline gap-4 w-[50%]">
                                <span className="font-bold text-[20pt]">วันที่</span>
                                <span className={isEditing ? "text-blue-600 font-bold bg-blue-50 px-1 rounded" : "font-bold"}>{toThaiDate(docData.docDate, false)}</span>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="font-bold text-[20pt]">เรื่อง</span>
                            {renderEditable('subject')}
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="font-bold text-[20pt]">เรียน</span>
                            {renderEditable('to')}
                        </div>
                    </div>

                    {/* เนื้อความ 3 รูปแบบ */}
                    <div className="mb-6 text-justify">
                        <div className="indent-[2.5cm]">
                            ด้วยข้าพเจ้า {renderAutoData(docData.reqName)} ปฏิบัติหน้าที่{renderAutoData(docData.reqPosition)} 
                            มีความประสงค์จะดำเนินงานโครงการ {renderAutoData(docData.projectName)} กิจกรรม {renderAutoData(docData.activityName)}
                        </div>

                        <div className="indent-[2.5cm]">
                            {requestMode === 1 && (
                                <>
                                    กิจกรรมนี้อยู่ในแผนปฏิบัติการประจำปีงบประมาณ หน้าที่ {renderAutoData(docData.planPage)} รหัสกิจกรรม {renderAutoData(docData.activityCode)} 
                                    ได้รับจัดสรรงบประมาณ {renderAutoData(docData.budgetAllocated.toLocaleString())} บาท คงเหลือ {renderAutoData(docData.budgetAllocated.toLocaleString())} บาท 
                                    ครั้งนี้ขอใช้ {renderAutoData(docData.budgetRequested.toLocaleString())} บาท 
                                    จาก{renderAutoData(docData.budgetCategory)} กำหนดจัดกิจกรรมในวันที่ {renderAutoData(docData.startDate)} โดยได้แนบรายละเอียดประมาณการค่าใช้จ่ายมาพร้อมนี้แล้ว
                                </>
                            )}
                            {requestMode === 2 && (
                                <>
                                    กิจกรรมนี้อยู่ในแผนปฏิบัติการประจำปีงบประมาณ หน้าที่ {renderAutoData(docData.planPage)} รหัสกิจกรรม {renderAutoData(docData.activityCode)} 
                                    แต่งบประมาณที่ได้รับจัดสรรคงเหลือ จำนวน {renderAutoData(docData.budgetAllocated.toLocaleString())} บาท ไม่เพียงพอ 
                                    จึงขออนุมัติเพิ่มวงเงิน โดยขอเปลี่ยนแปลงโอนตัดแบ่งงบประมาณจาก {renderAutoData(docData.fundingSources)} 
                                    รวมเป็นจำนวนเงินที่ขอใช้ครั้งนี้ {renderAutoData(docData.budgetRequested.toLocaleString())} บาท 
                                    จาก{renderAutoData(docData.budgetCategory)} กำหนดจัดกิจกรรมในวันที่ {renderAutoData(docData.startDate)} โดยได้แนบรายละเอียดประมาณการค่าใช้จ่ายมาพร้อมนี้แล้ว
                                </>
                            )}
                            {requestMode === 3 && (
                                <>
                                    กิจกรรมนี้ไม่มีในแผนปฏิบัติการประจำปีงบประมาณ แต่มีความจำเป็นต้องดำเนินการ เนื่องจากเพื่อพัฒนานักเรียน
                                    จึงขออนุญาตดำเนินการ โดยขอใช้งบประมาณจาก {renderAutoData(docData.fundingSources)}
                                    กำหนดจัดกิจกรรม {renderAutoData(docData.activityName)} ณ โรงเรียน ระหว่างวันที่ {renderAutoData(docData.startDate)} 
                                    จึงขออนุญาตจัดกิจกรรม และขออนุมัติใช้งบประมาณ {renderAutoData(docData.budgetCategory)} ดังรายละเอียดแนบ
                                </>
                            )}
                        </div>

                        <div className="indent-[2.5cm]">
                            จึงเรียนมาเพื่อโปรดพิจารณาอนุญาตให้ดำเนินกิจกรรม และอนุมัติให้ใช้งบประมาณ
                        </div>
                    </div>

                    {/* ลายเซ็นผู้ขอ */}
                    <div className="flex justify-end mb-4">
                        <div className="w-[45%] text-center text-[14pt]">
                            <p className="mb-4">(ลงชื่อ)........................................................</p>
                            <p>( {renderAutoData(docData.reqName)} )</p>
                            <p>{renderAutoData(docData.reqPosition)}</p>
                        </div>
                    </div>

                    {/* ======================================================= */}
                    {/* Grid สายการอนุมัติ 6 ตำแหน่ง (ปรับ Layout ให้ลงตัวใน A4) */}
                    {/* ======================================================= */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 pl-4">
                        
                        {/* สายงานต้นเรื่อง */}
                        <ApprovalBox title={`ความเห็นประธาน/หัวหน้า${docData.reqSubDept}`} comment="เห็นควรอนุญาต/อนุมัติ" name="ชื่อหัวหน้างาน" stepKey="step1" />
                        <ApprovalBox title={`ความเห็นรองผู้อำนวยการ${docData.reqDept}`} comment="เห็นควรอนุญาต/อนุมัติ" name="ชื่อรองผู้อำนวยการ" stepKey="step2" />
                        
                        {/* งานแผน และ งบประมาณ */}
                        <ApprovalBox title="ความเห็นหัวหน้างานแผนงาน" comment="เห็นควรอนุญาต/อนุมัติ" name="ชื่อหัวหน้าแผนงาน" stepKey="step3" />
                        <ApprovalBox title="ความเห็นหัวหน้ากลุ่มบริหารงบประมาณ" comment="ตรวจสอบแล้ว งบประมาณถูกต้อง" name="ชื่อหัวหน้างบประมาณ" stepKey="step4" />
                        
                        {/* ผู้บริหารระดับสูง */}
                        <ApprovalBox title="ความเห็นรองผู้อำนวยการกลุ่มบริหารงบประมาณ" comment="เห็นควรอนุญาต/อนุมัติ" name="ชื่อรองฯงบประมาณ" stepKey="step5" />
                        <div className="flex flex-col text-center text-[12pt] leading-tight mt-2">
                            <div className="font-bold mb-1 text-left">คำสั่งผู้อำนวยการโรงเรียน</div>
                            {approvalMode === 1 ? (
                                <div className="text-gray-400 my-4 italic border-2 border-dashed border-gray-200 rounded p-2">(รอการพิจารณาในระบบ)</div>
                            ) : (
                                <>
                                    <div className="mb-4 text-left ml-4 font-bold">[ &nbsp; ] อนุญาต/อนุมัติ &nbsp;&nbsp; [ &nbsp; ] ไม่อนุมัติ</div>
                                    <div className="mb-2">(ลงชื่อ)........................................................</div>
                                    <div>( ชื่อผู้อำนวยการโรงเรียน )</div>
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

            <style jsx>{`
                .fallback-krut { background-color: #f3f4f6; color: #9ca3af; font-size: 10px; display: flex; align-items: center; justify-content: center; }
                @media print {
                    @page { margin: 0; size: A4; }
                    body { background: white; }
                }
            `}</style>
        </div>
    )
}