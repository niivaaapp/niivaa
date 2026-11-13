'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ShieldCheck, UserCheck, Briefcase, ChevronRight, ChevronLeft, Save, Plus, Trash2 } from 'lucide-react'
import { getOnboardingData, completeOnboarding } from './actions'

export default function OnboardingWizard() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    
    const [employee, setEmployee] = useState<any>({})
    const [departmentsData, setDepartmentsData] = useState<any>({})
    const [schoolId, setSchoolId] = useState<string>('')
    
    // รูปแบบข้อมูล Assignment ใหม่ (3 ระดับ)
    const [assignments, setAssignments] = useState<any[]>([])

    const [formData, setFormData] = useState({
        new_password: '', confirm_password: '',
        pin_code: '', confirm_pin: '',
        prefix: '', first_name: '', last_name: '', phone: '',
        education_level: '', education_degree: '', education_major: ''
    })

    useEffect(() => {
        const loadData = async () => {
            const result = await getOnboardingData()
            if (result.success) {
                setEmployee(result.employee)
                setDepartmentsData(result.groupedDepartments || {})
                setSchoolId(result.school_id)
                setFormData(prev => ({
                    ...prev,
                    prefix: result.employee.prefix || '',
                    first_name: result.employee.first_name || '',
                    last_name: result.employee.last_name || '',
                    phone: result.employee.phone || '',
                    education_level: result.employee.education_level || '',
                }))
                // ค่าเริ่มต้นของ Assignment
                setAssignments([{ id: Date.now(), department_name: '', subdepartment_name: '', role_id: '', role_name: '', is_primary: true }])
            } else {
                alert(result.message)
            }
            setIsLoading(false)
        }
        loadData()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleAddAssignment = () => {
        setAssignments([...assignments, { id: Date.now(), department_name: '', subdepartment_name: '', role_id: '', role_name: '', is_primary: false }])
    }

    const handleRemoveAssignment = (id: number) => {
        setAssignments(assignments.filter(a => a.id !== id))
    }

    const handleAssignmentChange = (id: number, field: string, value: string, extraData?: any) => {
        setAssignments(assignments.map(a => {
            if (a.id === id) {
                let updated = { ...a, [field]: value }
                // ถ้าเปลี่ยนกลุ่มบริหารหลัก ให้รีเซ็ตงานย่อยและบทบาท
                if (field === 'department_name') {
                    updated.subdepartment_name = ''
                    updated.role_id = ''
                    updated.role_name = ''
                }
                // ถ้าเปลี่ยนงานย่อย ให้รีเซ็ตบทบาท
                if (field === 'subdepartment_name') {
                    updated.role_id = ''
                    updated.role_name = ''
                }
                // ถ้าเลือกบทบาท ให้เก็บชื่อบทบาทไว้ด้วย
                if (field === 'role_id' && extraData) {
                    updated.role_name = extraData.role_name
                }
                return updated
            }
            return a
        }))
    }

    const handleNext = () => {
        if (step === 1) {
            if (formData.new_password !== formData.confirm_password) return alert("รหัสผ่านใหม่ไม่ตรงกัน")
            if (formData.new_password.length < 6 && formData.new_password.length > 0) return alert("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
            if (formData.pin_code !== formData.confirm_pin) return alert("รหัส PIN ไม่ตรงกัน")
            if (formData.pin_code.length !== 6 && formData.pin_code.length > 0) return alert("รหัส PIN ต้องเป็นตัวเลข 6 หลัก")
        }
        setStep(step + 1)
    }

    const handleSubmit = async () => {
        setIsSaving(true)
        // กรองเอาเฉพาะหน้าที่ที่เลือกครบ 3 ระดับ
        const validAssignments = assignments.filter(a => a.department_name && a.subdepartment_name && a.role_id)
        
        if (validAssignments.length === 0) {
            setIsSaving(false)
            return alert("กรุณาระบุสังกัดและหน้าที่ให้ครบถ้วนอย่างน้อย 1 รายการ")
        }

        const submitData = { ...employee, ...formData, school_id: schoolId }
        const result = await completeOnboarding(submitData, validAssignments)
        
        if (result.success) {
            alert("ยินดีต้อนรับ! ตั้งค่าบัญชีเสร็จสมบูรณ์")
            router.push('/smartschool')
        } else {
            alert(result.message)
            setIsSaving(false)
        }
    }

    if (isLoading) return <div className="min-h-screen bg-[#0B1325] flex items-center justify-center text-teal-400">กำลังเตรียมระบบ...</div>

    return (
        <div className="min-h-screen bg-[#0B1325] text-white flex flex-col items-center py-10 px-4">
            
            {/* Header / Logo */}
            <div className="mb-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                    <Image src="/niivaa_SmartSchool.png" alt="NiiVaa" fill className="object-contain" unoptimized />
                </div>
                <h1 className="text-2xl font-bold">ยินดีต้อนรับสู่ NiiVaa SmartSchool</h1>
                <p className="text-gray-400 mt-2">กรุณาตั้งค่าบัญชีและข้อมูลส่วนตัวสำหรับการเข้าใช้งานครั้งแรก</p>
            </div>

            {/* Stepper Progress */}
            <div className="w-full max-w-3xl mb-8 flex justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -z-10 -translate-y-1/2"></div>
                <div className={`absolute top-1/2 left-0 h-1 bg-teal-500 -z-10 -translate-y-1/2 transition-all duration-500`} style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
                {[1, 2, 3].map((num) => (
                    <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-[#0B1325] transition-colors ${step >= num ? 'bg-teal-500 text-[#0B1325]' : 'bg-gray-800 text-gray-500'}`}>{num}</div>
                ))}
            </div>

            {/* Form Container */}
            <div className="w-full max-w-4xl bg-[#111A2E] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl">
                
                {/* Step 1: Security (คงเดิม) */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-teal-400"><ShieldCheck className="w-6 h-6" /> 1. ตั้งค่าความปลอดภัย</h2>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm text-gray-400 mb-1">รหัสผ่านใหม่ (ล็อกอิน)</label><input type="password" name="new_password" value={formData.new_password} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none" placeholder="อย่างน้อย 6 ตัวอักษร (เว้นว่างได้ถ้าไม่ต้องการเปลี่ยน)" /></div>
                                <div><label className="block text-sm text-gray-400 mb-1">ยืนยันรหัสผ่านใหม่</label><input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none" /></div>
                            </div>
                            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                                <h3 className="font-semibold text-teal-400 mb-2">รหัส PIN 6 หลัก (Digital Signature)</h3>
                                <p className="text-xs text-gray-400 mb-4">ใช้สำหรับยืนยันตัวตนเมื่อต้องการ "เซ็นอนุมัติเอกสาร" ในระบบ</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><input type="password" name="pin_code" maxLength={6} value={formData.pin_code} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none text-center tracking-[0.5em] text-lg font-mono" placeholder="------" /></div>
                                    <div><input type="password" name="confirm_pin" maxLength={6} value={formData.confirm_pin} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none text-center tracking-[0.5em] text-lg font-mono" placeholder="ยืนยันรหัส PIN" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Personal Info (คงเดิม) */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-teal-400"><UserCheck className="w-6 h-6" /> 2. ตรวจสอบข้อมูลส่วนตัว</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div><label className="block text-sm text-gray-400 mb-1">คำนำหน้า</label><input type="text" name="prefix" value={formData.prefix} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">ชื่อจริง</label><input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">นามสกุล</label><input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">เบอร์โทรศัพท์</label><input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none" /></div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">ระดับการศึกษา</label>
                                <select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full bg-[#0B1325] border border-gray-700 rounded-xl px-4 py-2.5 focus:border-teal-500 outline-none text-white">
                                    <option value="">- เลือกระดับ -</option>
                                    <option value="ปริญญาตรี">ปริญญาตรี</option>
                                    <option value="ปริญญาโท">ปริญญาโท</option>
                                    <option value="ปริญญาเอก">ปริญญาเอก</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">วุฒิย่อ / วิชาเอก</label>
                                <div className="flex gap-2">
                                    <input type="text" name="education_degree" placeholder="ค.บ." value={formData.education_degree} onChange={handleChange} className="w-1/3 bg-[#0B1325] border border-gray-700 rounded-xl px-3 py-2.5 focus:border-teal-500 outline-none" />
                                    <input type="text" name="education_major" placeholder="คณิตศาสตร์" value={formData.education_major} onChange={handleChange} className="w-2/3 bg-[#0B1325] border border-gray-700 rounded-xl px-3 py-2.5 focus:border-teal-500 outline-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Assignments (อัปเดตใหม่ 3 ระดับ) */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-2 text-teal-400"><Briefcase className="w-6 h-6" /> 3. ระบุสังกัดและหน้าที่ (Role Assignments)</h2>
                        <p className="text-sm text-gray-400 mb-6">ระบุกลุ่มบริหาร งานย่อย และบทบาทของคุณอย่างละเอียด (สามารถเพิ่มได้หลายหน้าที่)</p>
                        
                        <div className="space-y-4 mb-6">
                            {assignments.map((assignment, index) => (
                                <div key={assignment.id} className={`p-5 rounded-xl border ${assignment.is_primary ? 'bg-teal-900/20 border-teal-500/50' : 'bg-[#0B1325] border-gray-700'} flex flex-col xl:flex-row gap-4 relative group`}>
                                    
                                    {/* 1. เลือกกลุ่มบริหาร */}
                                    <div className="w-full xl:w-1/3">
                                        <label className="block text-xs text-gray-400 mb-1">1. กลุ่มบริหาร (Department)</label>
                                        <select 
                                            value={assignment.department_name} 
                                            onChange={(e) => handleAssignmentChange(assignment.id, 'department_name', e.target.value)}
                                            className="w-full bg-[#111A2E] border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none text-white focus:border-teal-500"
                                        >
                                            <option value="">- เลือกกลุ่มบริหาร -</option>
                                            {Object.keys(departmentsData).map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 2. เลือกงานย่อย */}
                                    <div className="w-full xl:w-1/3">
                                        <label className="block text-xs text-gray-400 mb-1">2. งานย่อย / กลุ่มสาระ (Sub-department)</label>
                                        <select 
                                            value={assignment.subdepartment_name} 
                                            onChange={(e) => handleAssignmentChange(assignment.id, 'subdepartment_name', e.target.value)}
                                            disabled={!assignment.department_name}
                                            className="w-full bg-[#111A2E] border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none disabled:opacity-50 text-white focus:border-teal-500"
                                        >
                                            <option value="">- เลือกงานย่อย -</option>
                                            {assignment.department_name && Object.keys(departmentsData[assignment.department_name] || {}).map(sub => (
                                                <option key={sub} value={sub}>{sub}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 3. เลือกบทบาทหน้าที่ */}
                                    <div className="w-full xl:w-1/3 flex items-end gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-400 mb-1">3. บทบาทหน้าที่ (Role)</label>
                                            <select 
                                                value={assignment.role_id} 
                                                onChange={(e) => {
                                                    const selectedRole = departmentsData[assignment.department_name][assignment.subdepartment_name].find((r: any) => r.role_id === e.target.value);
                                                    handleAssignmentChange(assignment.id, 'role_id', e.target.value, selectedRole);
                                                }}
                                                disabled={!assignment.subdepartment_name}
                                                className="w-full bg-[#111A2E] border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none disabled:opacity-50 text-teal-400 font-medium focus:border-teal-500"
                                            >
                                                <option value="">- เลือกบทบาทหน้าที่ -</option>
                                                {assignment.subdepartment_name && departmentsData[assignment.department_name]?.[assignment.subdepartment_name]?.map((r: any) => (
                                                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        {!assignment.is_primary && (
                                            <button onClick={() => handleRemoveAssignment(assignment.id)} className="p-2.5 text-gray-500 hover:text-red-400 transition-colors bg-gray-800 rounded-lg border border-gray-700">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleAddAssignment} className="flex items-center gap-2 text-teal-400 text-sm font-medium hover:text-teal-300 transition-colors bg-teal-900/20 px-4 py-2 rounded-lg border border-teal-500/30">
                            <Plus className="w-4 h-4" /> เพิ่มหน้าที่เพิ่มเติม
                        </button>
                    </div>
                )}

                {/* Footer Controls (คงเดิม) */}
                <div className="mt-10 pt-6 border-t border-gray-800 flex justify-between items-center">
                    {step > 1 ? (
                        <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-xl transition-colors">
                            <ChevronLeft className="w-5 h-5" /> ย้อนกลับ
                        </button>
                    ) : <div></div>}

                    {step < 3 ? (
                        <button onClick={handleNext} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg transition-colors">
                            ถัดไป <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSaving} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50">
                            {isSaving ? 'กำลังบันทึก...' : <><Save className="w-5 h-5" /> ยืนยันข้อมูล</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}