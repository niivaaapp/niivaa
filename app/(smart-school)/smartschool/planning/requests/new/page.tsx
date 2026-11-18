'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation' // 🌟 เพิ่มสำหรับเปลี่ยนหน้า
import { ArrowLeft, Save, Search, Plus, Trash2, CheckCircle2, Building, MapPin, FileText, AlertTriangle, GitMerge, Info, X, ShoppingCart, ListChecks, PackageOpen, Mic, Eye, EyeOff, Filter, ArrowUpDown, Sparkles, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import { getRequestMasterData, saveActivityRequest } from './actions' // 🌟 ดึงฟังก์ชันบันทึกมา

// Type สำหรับพัสดุ
interface MaterialItem {
    id: string; item_code: string; item_name: string; brand: string; qty: number | ''; unit: string; unit_price: number | ''; total: number;
}
// Type สำหรับค่าใช้จ่ายอื่น
interface GeneralExpenseItem {
    id: string; expense_category: string; item_name: string; qty_a: number | ''; unit_a: string; qty_b: number | ''; unit_b: string; unit_price: number | ''; total: number;
}

// 🌟 แก้ไข Type ให้ price เป็น number | '' ชัดเจน
const EXPENSE_TEMPLATES: { cat: string, name: string, unit_a: string, unit_b: string, price: number | '' }[] = [
    { cat: 'FOOD', name: 'ค่าอาหารว่างและเครื่องดื่ม', unit_a: 'คน', unit_b: 'มื้อ', price: 35 },
    { cat: 'FOOD', name: 'ค่าอาหาร', unit_a: 'คน', unit_b: 'มื้อ', price: 80 },
    { cat: 'ALLOWANCE', name: 'ค่าเบี้ยเลี้ยงสำหรับครู บุคลากร', unit_a: 'คน', unit_b: 'วัน', price: 240 },
    { cat: 'ACCOMMODATION', name: 'ค่าเช่าที่พักลักษณะจ่ายจริง', unit_a: 'คน', unit_b: 'คืน', price: '' },
    { cat: 'ACCOMMODATION', name: 'ค่าเช่าที่พักลักษณะเหมาจ่าย', unit_a: 'คน', unit_b: 'คืน', price: '' },
    { cat: 'TRANSPORT', name: 'เงินชดเชยการใช้พาหนะรถยนต์ส่วนตัวในการเดินทางไปราชการ', unit_a: 'กม.', unit_b: 'เที่ยว', price: 4 },
    { cat: 'TRANSPORT', name: 'เงินชดเชยการใช้พาหนะรถจักรยานยนต์ส่วนตัวในการเดินทางไปราชการ', unit_a: 'กม.', unit_b: 'เที่ยว', price: 2 },
    { cat: 'TRANSPORT', name: 'ค่าโดยสารรถประจำทาง', unit_a: 'คน', unit_b: 'เที่ยว', price: '' },
    { cat: 'TRANSPORT', name: 'ค่ารถรับจ้าง', unit_a: 'คน', unit_b: 'เที่ยว', price: '' },
    { cat: 'FEE', name: 'ค่าตอบแทนวิทยากร', unit_a: 'คน', unit_b: 'ชม.', price: 600 },
    { cat: 'FEE', name: 'ค่าสมนาคุณกรรมการ', unit_a: 'คน', unit_b: '', price: '' },
    { cat: 'CONTRACT', name: 'ค่าจ้างเหมาบริการ', unit_a: 'งาน', unit_b: '', price: '' },
]

export default function NewActivityRequestForm() {
    const router = useRouter() // 🌟 สำหรับเปลี่ยนหน้า
    const [isLoading, setIsLoading] = useState(true)
    const [masterData, setMasterData] = useState<any>(null)
    const [requestMode, setRequestMode] = useState<1 | 2 | 3>(1)
    const [isSavingDraft, setIsSavingDraft] = useState(false)
    const [currentUserCode] = useState('T009')
    const [showBrandColumn, setShowBrandColumn] = useState(true)

    const [formData, setFormData] = useState({
        activity_id: '', request_iteration: 1, request_date: new Date().toISOString().split('T')[0],
        start_date: '', end_date: '', location: '', target_executives: '', target_teachers: '', target_students: '', target_student_level: '', target_others: '', target_others_count: '', mode3Reason: ''
    })

    const [materialExpenses, setMaterialExpenses] = useState<MaterialItem[]>([])
    const [generalExpenses, setGeneralExpenses] = useState<GeneralExpenseItem[]>([])
    const [budgetSources, setBudgetSources] = useState([{ id: Date.now(), fromActivityId: '', fundType: '', max: 0, amount: 0 }])

    const [isMaterialCartOpen, setIsMaterialCartOpen] = useState(false)
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])

    const [materialSearchQuery, setMaterialSearchQuery] = useState('')
    const [materialCategoryFilter, setMaterialCategoryFilter] = useState('')
    const [materialSortBy, setMaterialSortBy] = useState<'name_asc' | 'name_desc' | 'price_asc' | 'price_desc'>('name_asc')
    const [isSearchListening, setIsSearchListening] = useState(false)

    const [isAutoPickModalOpen, setIsAutoPickModalOpen] = useState(false)
    const [autoPickTargetAmount, setAutoPickTargetAmount] = useState<number | ''>(5000)
    const [autoPickApproxItems, setAutoPickApproxItems] = useState<number | ''>(5)
    const [autoPickCategories, setAutoPickCategories] = useState<string[]>([])
    const [autoPickedResults, setAutoPickedResults] = useState<any[]>([])

    const [mockMaterials] = useState([
        { id: 'M1', item_code: '01-0001', item_name: 'กระดาษ A4 80 แกรม', category: 'วัสดุสำนักงาน', brand: 'Double A', unit_name: 'รีม', default_price: 120 },
        { id: 'M2', item_code: '01-0002', item_name: 'แฟ้มสันกว้าง', category: 'วัสดุสำนักงาน', brand: 'ตราช้าง', unit_name: 'แฟ้ม', default_price: 65 },
        { id: 'M3', item_code: '03-0001', item_name: 'หมึกพิมพ์ HP 85A', category: 'วัสดุคอมพิวเตอร์', brand: 'HP', unit_name: 'กล่อง', default_price: 2150 },
        { id: 'M4', item_code: '04-0001', item_name: 'ไม้กวาดดอกหญ้า', category: 'วัสดุงานบ้านงานครัว', brand: '', unit_name: 'อัน', default_price: 45 },
        { id: 'M5', item_code: '01-0003', item_name: 'ปากกาน้ำเงิน (50ด้าม)', category: 'วัสดุสำนักงาน', brand: 'Lancer', unit_name: 'กระบอก', default_price: 250 },
        { id: 'M6', item_code: '01-0004', item_name: 'คลิปหนีบกระดาษ', category: 'วัสดุสำนักงาน', brand: '', unit_name: 'กล่อง', default_price: 15 },
        { id: 'M7', item_code: '03-0002', item_name: 'แฟลชไดร์ฟ 32GB', category: 'วัสดุคอมพิวเตอร์', brand: 'SanDisk', unit_name: 'อัน', default_price: 150 },
    ])

    useEffect(() => {
        const loadData = async () => {
            const res = await getRequestMasterData()
            if (res.success) setMasterData(res.data)
            setIsLoading(false)
        }
        loadData()
    }, [])

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value })
    const handleActivitySelect = (e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, activity_id: e.target.value, request_iteration: 1 }))

    // ==========================================
    // ระบบสุ่มจัดพัสดุอัตโนมัติ (AI Auto-Picker)
    // ==========================================
    const baseMaterials = masterData?.materials?.length > 0 ? masterData.materials : mockMaterials;
    const uniqueCategories = Array.from(new Set(baseMaterials.map((m: any) => m.category).filter(Boolean))) as string[];

    const generateAutoPick = () => {
        if (!autoPickTargetAmount || Number(autoPickTargetAmount) <= 0) return alert('กรุณาระบุวงเงินให้ถูกต้อง');
        let pool = baseMaterials;
        if (autoPickCategories.length > 0) pool = pool.filter((m: any) => autoPickCategories.includes(m.category));
        if (pool.length === 0) return alert('ไม่พบพัสดุในหมวดหมู่ที่ระบุ');

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const selectedTypes = shuffled.slice(0, Math.min(Number(autoPickApproxItems) || 5, pool.length));

        let budgetLeft = Number(autoPickTargetAmount);
        let results = selectedTypes.map(m => ({ ...m, generatedQty: 0 }));
        
        let iterations = 0;
        while (budgetLeft > 0 && iterations < 10000) {
            const affordable = results.filter(m => m.default_price <= budgetLeft);
            if (affordable.length === 0) break; 
            const randItem = affordable[Math.floor(Math.random() * affordable.length)];
            const itemIndex = results.findIndex(m => m.id === randItem.id);
            results[itemIndex].generatedQty += 1;
            budgetLeft -= randItem.default_price;
            iterations++;
        }
        setAutoPickedResults(results.filter(m => m.generatedQty > 0));
    }

    const confirmAutoPick = () => {
        const newMaterials: MaterialItem[] = autoPickedResults.map(mat => ({
            id: `MAT-${Date.now()}-${mat.id}`, item_code: mat.item_code || 'NON-CATALOG', item_name: mat.item_name, brand: mat.brand || '',
            qty: mat.generatedQty, unit: mat.unit_name || 'ชิ้น', unit_price: mat.default_price || 0, total: mat.generatedQty * (mat.default_price || 0)
        }))
        setMaterialExpenses([...materialExpenses, ...newMaterials]);
        setIsAutoPickModalOpen(false);
        setIsMaterialCartOpen(false);
    }

    // ==========================================
    // จัดการตารางพัสดุ (Material) 
    // ==========================================
    const handleMaterialChange = (id: string, field: keyof MaterialItem, value: string) => {
        setMaterialExpenses(materialExpenses.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value }
                if (field === 'item_name') updated.item_code = 'NON-CATALOG'
                if (field === 'qty' || field === 'unit_price') updated.total = (Number(updated.qty) || 0) * (Number(updated.unit_price) || 0)
                return updated
            }
            return item
        }))
    }
    const removeMaterial = (id: string) => setMaterialExpenses(materialExpenses.filter(e => e.id !== id))
    const materialTotal = materialExpenses.reduce((sum, item) => sum + item.total, 0)
    
    const filteredModalMaterials = baseMaterials
        .filter((m: any) => {
            const matchesSearch = (m.item_name || '').toLowerCase().includes(materialSearchQuery.toLowerCase()) || (m.item_code || '').toLowerCase().includes(materialSearchQuery.toLowerCase());
            const matchesCategory = materialCategoryFilter === '' || m.category === materialCategoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a: any, b: any) => {
            if (materialSortBy === 'name_asc') return (a.item_name || '').localeCompare(b.item_name || '');
            if (materialSortBy === 'name_desc') return (b.item_name || '').localeCompare(a.item_name || '');
            if (materialSortBy === 'price_asc') return (a.default_price || 0) - (b.default_price || 0);
            if (materialSortBy === 'price_desc') return (b.default_price || 0) - (a.default_price || 0);
            return 0;
        });

    const confirmMaterialSelection = () => {
        const newMaterials: MaterialItem[] = selectedMaterialIds.map(matId => {
            const mat = baseMaterials.find((m: any) => m.id === matId)
            return { id: `MAT-${Date.now()}-${matId}`, item_code: mat.item_code || 'NON-CATALOG', item_name: mat.item_name, brand: mat.brand || '', qty: 1, unit: mat.unit_name || 'ชิ้น', unit_price: mat.default_price || 0, total: mat.default_price || 0 }
        })
        setMaterialExpenses([...materialExpenses, ...newMaterials])
        setSelectedMaterialIds([])
        setIsMaterialCartOpen(false)
        setMaterialSearchQuery('')
    }
    const toggleMaterialSelection = (id: string) => setSelectedMaterialIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])

    // ==========================================
    // ตาราง General & โอนงบ
    // ==========================================
    // 🌟 แก้ไข Type ให้ถูกต้อง
    const addExpenseFromTemplate = (tmpl: typeof EXPENSE_TEMPLATES[0]) => { 
        setGeneralExpenses([...generalExpenses, { 
            id: `GEN-${Date.now()}`, 
            expense_category: tmpl.cat, 
            item_name: tmpl.name, 
            qty_a: 1, 
            unit_a: tmpl.unit_a, 
            qty_b: tmpl.unit_b ? 1 : '', 
            unit_b: tmpl.unit_b, 
            unit_price: tmpl.price, 
            total: Number(tmpl.price) || 0 
        }]); 
        setIsExpenseModalOpen(false) 
    }
    const handleGeneralChange = (id: string, field: keyof GeneralExpenseItem, value: string) => { setGeneralExpenses(generalExpenses.map(item => { if (item.id === id) { const updated = { ...item, [field]: value }; if (field === 'qty_a' || field === 'qty_b' || field === 'unit_price') { updated.total = (Number(updated.qty_a) || 0) * (updated.unit_b ? (Number(updated.qty_b) || 1) : 1) * (Number(updated.unit_price) || 0) }; return updated }; return item })) }
    const removeGeneral = (id: string) => setGeneralExpenses(generalExpenses.filter(e => e.id !== id))
    const generalTotal = generalExpenses.reduce((sum, item) => sum + item.total, 0)
    
    // ยอดรวมสุดท้าย
    const grandTotal = materialTotal + generalTotal

    const generatePreviewText = (exp: GeneralExpenseItem, idx: number) => { let t = `${idx + 1}. ${exp.item_name} `; if (exp.expense_category === 'TRANSPORT' && exp.unit_a === 'กม.') t += `ระยะทาง ไป-กลับ ${exp.qty_a || 0} ${exp.unit_a}ต่อเที่ยว ` + (exp.unit_b ? `จำนวน ${exp.qty_b || 0} ${exp.unit_b} ` : '') + `อัตรา ${exp.unit_price || 0} บาท/${exp.unit_a} `; else { if (exp.unit_a) t += `จำนวน ${exp.qty_a || 0} ${exp.unit_a} `; if (exp.unit_b) t += (exp.unit_a === 'คน' && (exp.unit_b === 'วัน' || exp.unit_b === 'คืน') ? 'คนละ ' : 'จำนวน ') + `${exp.qty_b || 0} ${exp.unit_b} `; t += `อัตรา ${exp.unit_price || 0} บาท` + (exp.unit_b && exp.unit_a ? `/${exp.unit_b}/${exp.unit_a} ` : exp.unit_b ? `/${exp.unit_b} ` : exp.unit_a && exp.unit_a !== 'งาน' ? `/${exp.unit_a} ` : ' ') }; t += `เป็นเงิน ${exp.total.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท`; return t }

    const handleAddBudgetSource = () => setBudgetSources([...budgetSources, { id: Date.now(), fromActivityId: '', fundType: '', max: 0, amount: 0 }])
    const handleRemoveBudgetSource = (id: number) => setBudgetSources(budgetSources.filter(s => s.id !== id))
    const handleSourceChange = (id: number, field: string, value: string | number) => { setBudgetSources(budgetSources.map(s => { if (s.id === id) { let updated = { ...s, [field]: value }; if (field === 'fromActivityId') { const act = masterData?.activities.find((a: any) => a.id === value); updated.fundType = act?.fund_type || ''; updated.max = act ? Number(act.budget_allocated) : 0; updated.amount = 0 }; if (field === 'amount') updated.amount = Number(value) > s.max ? s.max : Number(value); return updated }; return s })) }
    const totalTransferredBudget = budgetSources.reduce((sum, src) => sum + Number(src.amount || 0), 0)

    const selectedActivity = masterData?.activities.find((a: any) => a.id === formData.activity_id)
    const parentProject = selectedActivity ? masterData?.projects.find((p: any) => p.id === selectedActivity.project_id) : null
    const projOwner = parentProject ? masterData?.employees.find((e: any) => e.emp_code === parentProject.emp_code) : null 
    const activityOwner = selectedActivity ? masterData?.employees.find((e: any) => e.emp_code === selectedActivity.emp_code) : null
    const reqFullName = activityOwner ? `${activityOwner.prefix}${activityOwner.first_name} ${activityOwner.last_name}` : 'รอเลือกกิจกรรม...'
    const reqRole = activityOwner?.role_name || '-'
    const actDeptInfo = selectedActivity ? masterData?.departments.find((d: any) => d.subdepartment_id === selectedActivity.subdepartment_id) : null
    const step1Name = actDeptInfo?.subdepartment_name ? `หัวหน้า${actDeptInfo.subdepartment_name}` : 'หัวหน้างานย่อยต้นเรื่อง'
    const step2Name = actDeptInfo?.department_name ? `หัวหน้า${actDeptInfo.department_name}` : 'หัวหน้ากลุ่มบริหาร'
    const step3Name = actDeptInfo?.department_name ? `รองผู้อำนวยการ${actDeptInfo.department_name}` : 'รองผู้อำนวยการกลุ่มบริหาร'

    // ==========================================
    // 🌟 ฟังก์ชันบันทึกข้อมูล (Save)[cite: 8]
    // ==========================================
    const handleSave = async (saveStatus: 'DRAFT' | 'PENDING') => {
        if (!formData.activity_id) {
            alert('กรุณาเลือกกิจกรรมที่ต้องการดำเนินการก่อนบันทึก')
            return
        }
        if (grandTotal <= 0) {
            if (!confirm('เอกสารนี้ไม่มียอดการใช้จ่ายงบประมาณ ต้องการบันทึกต่อหรือไม่?')) return
        }

        setIsSavingDraft(true)
        try {
            const payload = {
                formData,
                materialExpenses,
                generalExpenses,
                budgetSources,
                requestMode,
                status: saveStatus,
                grandTotal: grandTotal,
                projectId: selectedActivity?.project_id,
                empCode: currentUserCode
            }
            
            // เรียกใช้งาน Server Action บันทึกข้อมูล
            const res = await saveActivityRequest(payload)
            
            if (res.success) {
                alert(`บันทึกข้อมูลสำเร็จ! (ID: ${res.id})`)
                // Redirect สลับไปหน้า Print Preview 
                router.push(`/smartschool/planning/requests/${res.id}`)
            } else {
                alert('เกิดข้อผิดพลาดในการบันทึก: ' + res.error)
            }
        } catch (error) {
            console.error(error)
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
        } finally {
            setIsSavingDraft(false)
        }
    }

    const startSearchListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง (แนะนำ Google Chrome)')
            return
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.lang = 'th-TH'
        recognition.continuous = false
        recognition.interimResults = false

        recognition.onstart = () => setIsSearchListening(true)
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript
            setMaterialSearchQuery(prev => prev ? `${prev} ${transcript}` : transcript)
        }
        recognition.onerror = () => setIsSearchListening(false)
        recognition.onend = () => setIsSearchListening(false)
        recognition.start()
    }

    const DictationInput = ({ value, onChange, placeholder, isMaterial, expId }: { value: string, onChange: (val: string) => void, placeholder: string, isMaterial?: boolean, expId?: string }) => {
        const [isListening, setIsListening] = useState(false)
        const [showSuggestions, setShowSuggestions] = useState(false)
        const wrapperRef = useRef<HTMLDivElement>(null)

        const startListening = () => {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert('เบราว์เซอร์ของคุณไม่รองรับการพิมพ์ด้วยเสียง')
                return
            }
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            const recognition = new SpeechRecognition()
            recognition.lang = 'th-TH'
            recognition.onstart = () => setIsListening(true)
            recognition.onresult = (event: any) => onChange(value ? `${value} ${event.results[0][0].transcript}` : event.results[0][0].transcript) 
            recognition.onerror = () => setIsListening(false)
            recognition.onend = () => setIsListening(false)
            recognition.start()
        }

        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false) }
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }, [])

        const filtered = isMaterial ? baseMaterials.filter((m:any) => m.item_name.toLowerCase().includes(value.toLowerCase())) : []

        return (
            <div className="relative w-full flex items-center group" ref={wrapperRef}>
                <input 
                    type="text" value={value} 
                    onChange={e => { onChange(e.target.value); if(isMaterial) setShowSuggestions(true); }}
                    onFocus={() => { if(isMaterial) setShowSuggestions(true) }}
                    placeholder={placeholder}
                    className={`w-full font-bold px-3 py-1.5 rounded-l outline-none transition-colors border ${isMaterial ? 'bg-[#001f3f] text-[#98FB98] border-[#008080] focus:border-[#98FB98]' : 'bg-[#E8F8F5] text-[#002B49] border-transparent focus:border-amber-500'}`} 
                />
                <button onClick={startListening} title="กดเพื่อพูด" className={`px-3 py-1.5 border-y border-r rounded-r flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 border-red-500 text-white animate-pulse' : isMaterial ? 'bg-[#001f3f] border-[#008080] text-teal-400 hover:bg-teal-900' : 'bg-[#E8F8F5] border-transparent text-gray-500 hover:text-amber-600'}`}><Mic className="w-4 h-4" /></button>
                {isMaterial && showSuggestions && (
                    <div className="absolute top-full left-0 w-[400px] mt-1 bg-[#0B1528] border border-teal-500/50 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                        <div className="text-[10px] text-teal-400 font-bold px-3 py-2 bg-teal-900/30 flex items-center gap-1 border-b border-teal-500/30"><PackageOpen size={12}/> เลือกพัสดุ (หรือพิมพ์อิสระ/กดไมค์)</div>
                        {filtered.length > 0 ? filtered.map((m:any) => (
                            <div key={m.id} onClick={() => { onChange(m.item_name); handleMaterialChange(expId!, 'item_code', m.item_code || 'NON-CATALOG'); handleMaterialChange(expId!, 'brand', m.brand || ''); handleMaterialChange(expId!, 'unit', m.unit_name || 'ชิ้น'); handleMaterialChange(expId!, 'unit_price', m.default_price || 0); setShowSuggestions(false); }} className="px-3 py-2 hover:bg-teal-900/50 cursor-pointer text-sm text-white flex justify-between items-center transition-colors">
                                <div>
                                    <div className="font-bold flex items-center gap-2">{m.item_name} <span className="text-[10px] font-mono bg-[#002B49] border border-teal-500 text-teal-400 px-1 rounded">{m.item_code || 'NON-CATALOG'}</span></div>
                                    {m.brand && <div className="text-[10px] text-gray-400">ยี่ห้อ: {m.brand} | หมวด: {m.category || '-'}</div>}
                                </div>
                                <span className="text-xs text-teal-400 bg-teal-900/40 px-2 py-0.5 rounded border border-teal-500/30">{m.default_price} บ./{m.unit_name}</span>
                            </div>
                        )) : <div className="px-3 py-3 text-sm text-gray-400 italic">พิมพ์ชื่อใหม่ หรือกดไอคอนไมค์เพื่อพูดได้เลย (ระบบจะบันทึกเป็น NON-CATALOG)</div>}
                    </div>
                )}
            </div>
        )
    }

    if (isLoading) return <div className="min-h-screen bg-[#0B1528] text-teal-400 flex justify-center items-center font-bold">กำลังเชื่อมต่อฐานข้อมูล...</div>

    return (
        <div className="min-h-screen bg-[#0B1528] text-white p-4 font-sans pb-20">
            <header className="max-w-7xl mx-auto mb-6 flex justify-between items-center bg-[#002B49] p-4 rounded-xl shadow-lg border-b-4 border-[#008080]">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="w-6 h-6 text-[#98FB98]" /> สร้างบันทึกข้อความขออนุญาตดำเนินโครงการ</h1>
                    <p className="text-sm text-teal-300 mt-1">ผู้เบิก (อ้างอิงตามกิจกรรม): <span className="text-white font-bold">{reqFullName}</span> ({reqRole})</p>
                </div>
                <Link href="/smartschool/planning" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-600 transition-colors">ย้อนกลับ</Link>
            </header>

            <main className="max-w-7xl mx-auto space-y-6">
                
                {/* 1. รูปแบบ */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl p-6 shadow-xl">
                    <h2 className="text-sm font-bold text-teal-400 mb-4 tracking-wide">1. รูปแบบการขออนุมัติ</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => setRequestMode(1)} className={`p-4 rounded-xl border text-left transition-all ${requestMode === 1 ? 'bg-[#008080]/30 border-[#008080] shadow-[0_0_15px_rgba(0,128,128,0.2)]' : 'bg-[#0B1528] border-gray-700 hover:border-gray-500'}`}><h3 className={`font-bold ${requestMode === 1 ? 'text-teal-300' : 'text-gray-300'}`}>แบบ 1: ขอใช้เงินในแผน</h3><p className="text-xs text-gray-400 mt-1">ใช้งบปกติที่ได้รับจัดสรร</p></button>
                        <button onClick={() => setRequestMode(2)} className={`p-4 rounded-xl border text-left transition-all ${requestMode === 2 ? 'bg-amber-900/30 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#0B1528] border-gray-700 hover:border-gray-500'}`}><h3 className={`font-bold ${requestMode === 2 ? 'text-amber-400' : 'text-gray-300'}`}>แบบ 2: ขอเพิ่มวงเงิน</h3><p className="text-xs text-gray-400 mt-1">กิจกรรมเดิม ขอตัดงบอื่นมาสมทบ</p></button>
                        <button onClick={() => setRequestMode(3)} className={`p-4 rounded-xl border text-left transition-all ${requestMode === 3 ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-[#0B1528] border-gray-700 hover:border-gray-500'}`}><h3 className={`font-bold ${requestMode === 3 ? 'text-blue-400' : 'text-gray-300'}`}>แบบ 3: โครงการใหม่</h3><p className="text-xs text-gray-400 mt-1">ตั้งใหม่ นอกแผนประจำปี</p></button>
                    </div>
                </div>

                {/* 2. ข้อมูลโครงการ */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-6 py-3 font-bold text-white flex items-center gap-2"><Search className="w-5 h-5" /> 2. เลือกกิจกรรมที่ต้องการดำเนินการ</div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="col-span-12 md:col-span-6 bg-[#0B1528] p-4 rounded-lg border border-gray-700"><label className="text-sm text-gray-400 block mb-1">เรียน (ส่งถึง)</label><div className="text-lg font-bold text-white">ผู้อำนวยการ{masterData?.schoolName || 'โรงเรียน...'}</div></div>
                        <div className="col-span-12 md:col-span-3"><label className="text-sm text-gray-400 block mb-1">เลขที่คำขอ</label><input type="text" readOnly value="ออกอัตโนมัติ" className="w-full bg-[#0B1528] border border-gray-700 rounded p-2.5 text-gray-500 text-sm text-center" /></div>
                        <div className="col-span-12 md:col-span-3"><label className="text-sm text-gray-400 block mb-1">ลงวันที่</label><input type="date" name="request_date" value={formData.request_date} onChange={handleFormChange} className="w-full bg-[#E8F8F5] border border-[#008080] text-[#002B49] rounded p-2.5 outline-none font-bold" /></div>

                        <div className="col-span-12">
                            <label className="text-sm text-teal-400 font-bold block mb-1">พิมพ์ค้นหา หรือ เลือกกิจกรรมอ้างอิง</label>
                            <select name="activity_id" value={formData.activity_id} onChange={handleActivitySelect} className="w-full bg-[#E8F8F5] border-2 border-[#008080] text-[#002B49] rounded-lg p-3 outline-none font-bold text-lg shadow-inner">
                                <option value="">-- กรุณาเลือกกิจกรรม --</option>
                                {masterData?.activities.map((a: any) => <option key={a.id} value={a.id}>[{a.activity_code}] {a.activity_name}</option>)}
                            </select>
                        </div>

                        {selectedActivity && (
                            <div className="col-span-12 grid grid-cols-2 md:grid-cols-5 gap-4 bg-[#0B1528] p-5 rounded-lg border border-[#008080]/30">
                                <div className="col-span-2 md:col-span-1"><span className="text-xs text-gray-400 block">โครงการอ้างอิง</span><span className="text-sm text-white">{parentProject?.project_name || '-'}</span></div>
                                <div className="col-span-2 md:col-span-1"><span className="text-xs text-gray-400 block">ผู้รับผิดชอบโครงการ</span><span className="text-sm font-bold text-amber-400">{projOwner ? `${projOwner.first_name} ${projOwner.last_name}` : '-'}</span></div>
                                <div><span className="text-xs text-gray-400 block">ผู้รับผิดชอบกิจกรรม</span><span className="text-sm text-[#98FB98] font-bold">{reqFullName}</span></div>
                                <div><span className="text-xs text-gray-400 block">ประเภทเงิน</span><span className="text-sm text-white">{selectedActivity.fund_type || 'เงินอุดหนุน'}</span></div>
                                <div><span className="text-xs text-gray-400 block">งบจัดสรร / คงเหลือ</span><span className="text-sm font-mono text-white">{Number(selectedActivity.budget_allocated).toLocaleString()} / <span className="text-[#98FB98] font-bold">{Number(selectedActivity.budget_allocated).toLocaleString()}</span></span></div>
                            </div>
                        )}

                        {/* โอนงบ (Mode 2 และ 3) */}
                        {(requestMode === 2 || requestMode === 3) && selectedActivity && (
                            <div className="col-span-12 bg-amber-900/10 border border-amber-500/50 p-5 rounded-xl mt-2">
                                <h3 className="text-amber-400 font-bold mb-3 flex items-center gap-2"><GitMerge className="w-5 h-5" /> ระบุกิจกรรมต้นทาง ที่จะขอตัดแบ่งเงินมาสมทบ</h3>
                                <div className="space-y-3">
                                    {budgetSources.map((source, index) => (
                                        <div key={source.id} className="flex flex-col lg:flex-row gap-3 p-4 bg-[#0B1528] border border-amber-500/30 rounded-lg">
                                            <div className="flex-1">
                                                <select value={source.fromActivityId} onChange={(e) => handleSourceChange(source.id, 'fromActivityId', e.target.value)} className="w-full bg-[#E8F8F5] border border-[#008080] text-[#002B49] rounded px-3 py-2 outline-none text-sm">
                                                    <option value="">-- เลือกกิจกรรมที่มีงบเหลือ --</option>
                                                    {masterData?.activities.filter((a:any) => a.id !== formData.activity_id).map((a:any) => {
                                                        const owner = masterData?.employees.find((e:any) => e.emp_code === a.emp_code)
                                                        const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : '-'
                                                        return <option key={a.id} value={a.id}>[{a.activity_code}] {a.activity_name} (จัดสรร {Number(a.budget_allocated).toLocaleString()} | เหลือ {Number(a.budget_allocated).toLocaleString()} | {a.fund_type} | โดย {ownerName})</option>
                                                    })}
                                                </select>
                                            </div>
                                            <div className="w-full lg:w-40 flex items-end gap-2">
                                                <div className="flex-1">
                                                    <input type="number" value={source.amount || ''} onChange={(e) => handleSourceChange(source.id, 'amount', e.target.value)} className="w-full bg-[#002B49] border border-amber-500 rounded px-3 py-2 text-sm text-white text-right outline-none font-bold" placeholder="ยอดเงินโอน" />
                                                </div>
                                                {index > 0 && <button onClick={() => setBudgetSources(budgetSources.filter(s => s.id !== source.id))} className="p-2 text-gray-500 hover:text-red-400 bg-gray-800 rounded border border-gray-600"><Trash2 className="w-4 h-4" /></button>}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center mt-2">
                                        <button onClick={handleAddBudgetSource} className="text-sm text-amber-400 hover:text-amber-300 font-bold px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-1"><Plus className="w-4 h-4" /> เพิ่มกิจกรรมต้นทาง</button>
                                        <div className="text-right text-sm">รวมโอนเพิ่ม: <span className="text-xl font-bold text-amber-400 font-mono ml-2">{totalTransferredBudget.toLocaleString()}</span> บาท</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {requestMode === 3 && (
                            <div className="col-span-12 bg-blue-900/20 border border-blue-500/30 p-5 rounded-lg mt-2">
                                <label className="text-sm text-blue-300 font-bold block mb-2">เหตุผลความจำเป็น (เนื่องจาก...)</label>
                                <textarea name="mode3Reason" value={formData.mode3Reason} onChange={handleFormChange} rows={2} placeholder="ระบุเหตุผลที่ต้องจัดกิจกรรมใหม่นอกแผน..." className="w-full bg-[#0B1528] border border-blue-500/50 focus:border-blue-400 text-white rounded p-3 outline-none resize-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. เป้าหมายและสถานที่ */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-[#008080] px-6 py-3 font-bold text-white flex items-center gap-2"><MapPin className="w-5 h-5" /> 3. กำหนดการและกลุ่มเป้าหมาย</div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="md:col-span-1"><label className="text-xs text-gray-400 block mb-1">วันที่เริ่ม</label><input type="date" name="start_date" value={formData.start_date} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 focus:border-[#98FB98] text-white rounded p-2.5 outline-none" /></div>
                        <div className="md:col-span-1"><label className="text-xs text-gray-400 block mb-1">ถึงวันที่</label><input type="date" name="end_date" value={formData.end_date} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 focus:border-[#98FB98] text-white rounded p-2.5 outline-none" /></div>
                        <div className="md:col-span-2"><label className="text-xs text-gray-400 block mb-1">สถานที่จัดกิจกรรม</label><input type="text" name="location" value={formData.location} onChange={handleFormChange} placeholder="ห้องประชุม..." className="w-full bg-[#E8F8F5] border border-[#008080] text-[#002B49] font-bold rounded p-2.5 outline-none" /></div>
                        
                        <div className="md:col-span-4 mt-2 border-t border-gray-700 pt-4"><p className="text-sm text-teal-300 font-bold mb-3">จำนวนผู้เข้าร่วมกิจกรรม</p></div>
                        <div><label className="text-xs text-gray-400 block mb-1">ผู้บริหาร (คน)</label><input type="number" name="target_executives" value={formData.target_executives} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2 text-center" /></div>
                        <div><label className="text-xs text-gray-400 block mb-1">ครู/บุคลากร (คน)</label><input type="number" name="target_teachers" value={formData.target_teachers} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2 text-center" /></div>
                        <div className="flex gap-2 w-full md:col-span-2">
                            <div className="w-1/2"><label className="text-xs text-gray-400 block mb-1">นักเรียน (ระดับชั้น)</label><input type="text" name="target_student_level" value={formData.target_student_level} onChange={handleFormChange} placeholder="ม.ปลาย" className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2" /></div>
                            <div className="w-1/2"><label className="text-xs text-gray-400 block mb-1">จำนวน (คน)</label><input type="number" name="target_students" value={formData.target_students} onChange={handleFormChange} className="w-full bg-[#0B1528] border border-gray-600 text-white rounded p-2 text-center" /></div>
                        </div>
                    </div>
                </div>

                {/* 4. ตารางพัสดุ */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-teal-800 px-6 py-3 font-bold text-white flex justify-between items-center border-b border-teal-500">
                        <div className="flex items-center gap-2"><PackageOpen className="w-5 h-5" /> 4. รายการพัสดุ (จัดซื้อ/จัดจ้าง)</div>
                        <button onClick={() => setShowBrandColumn(!showBrandColumn)} className="flex items-center gap-1 text-xs bg-teal-900/50 hover:bg-teal-700 px-3 py-1.5 rounded border border-teal-400/50 transition-colors">
                            {showBrandColumn ? <EyeOff size={14}/> : <Eye size={14}/>} {showBrandColumn ? 'ซ่อนคอลัมน์ยี่ห้อ' : 'แสดงคอลัมน์ยี่ห้อ'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#001f3f] text-[#98FB98] border-b-2 border-[#008080]">
                                <tr>
                                    <th className="px-3 py-3 text-center w-10">ที่</th>
                                    <th className="px-2 py-3 text-center w-24">รหัสพัสดุ</th> 
                                    <th className="px-2 py-3 w-[35%]">รายการพัสดุ (ค้นหา/พิมพ์ด้วยเสียงได้)</th>
                                    {showBrandColumn && <th className="px-2 py-3 text-center w-[15%]">ยี่ห้อ/Brand</th>}
                                    <th className="px-2 py-3 text-center w-20">ปริมาณ</th>
                                    <th className="px-2 py-3 text-center w-20">หน่วยนับ</th>
                                    <th className="px-2 py-3 text-right w-24">ราคา/หน่วย</th>
                                    <th className="px-3 py-3 text-right w-28">รวมเงิน</th>
                                    <th className="px-2 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 bg-[#0B1528]">
                                {materialExpenses.map((exp, index) => (
                                    <tr key={exp.id}>
                                        <td className="px-3 py-2 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-2 py-2 text-center"><span className={`text-[11px] font-mono px-2 py-1 rounded ${exp.item_code === 'NON-CATALOG' ? 'bg-amber-900/50 text-amber-400 border border-amber-600/50' : 'bg-[#002B49] text-teal-400 border border-[#008080]'}`}>{exp.item_code}</span></td>
                                        <td className="px-2 py-2"><DictationInput value={exp.item_name} onChange={(val:any) => handleMaterialChange(exp.id, 'item_name', val)} placeholder="ชื่อพัสดุ..." isMaterial={true} expId={exp.id} /></td>
                                        {showBrandColumn && <td className="px-2 py-2"><input type="text" value={exp.brand || ''} onChange={e => handleMaterialChange(exp.id, 'brand', e.target.value)} placeholder="ยี่ห้อ..." className="w-full bg-gray-800 text-white px-2 py-1.5 rounded outline-none border border-transparent focus:border-teal-500" /></td>}
                                        <td className="px-2 py-2"><input type="number" value={exp.qty} onChange={e => handleMaterialChange(exp.id, 'qty', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-1.5 rounded text-center outline-none" /></td>
                                        <td className="px-2 py-2"><input type="text" value={exp.unit} onChange={e => handleMaterialChange(exp.id, 'unit', e.target.value)} className="w-full bg-gray-800 text-gray-300 px-2 py-1.5 rounded text-center outline-none" /></td>
                                        <td className="px-2 py-2"><input type="number" value={exp.unit_price} onChange={e => handleMaterialChange(exp.id, 'unit_price', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-1.5 rounded text-right outline-none font-bold" /></td>
                                        <td className="px-3 py-2 text-right font-mono text-[#98FB98] font-bold bg-[#001f3f]/50">{exp.total.toLocaleString('th-TH')}</td>
                                        <td className="px-2 py-2 text-center"><button onClick={() => removeMaterial(exp.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-[#0B1528] flex items-center justify-between">
                        <button onClick={() => setIsMaterialCartOpen(true)} className="px-4 py-2 bg-gradient-to-r from-teal-900 to-teal-700 hover:from-teal-800 hover:to-teal-600 border border-teal-400 text-white font-bold text-sm rounded-lg shadow flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5"/> ค้นหา/เลือกพัสดุเข้าตะกร้า
                        </button>
                        <div className="text-lg font-bold text-teal-400">รวมค่าพัสดุ: {materialTotal.toLocaleString('th-TH')} บาท</div>
                    </div>
                </div>

                {/* 5. ตารางค่าใช้จ่ายอื่นๆ */}
                <div className="bg-[#002B49] border border-[#008080]/50 rounded-xl overflow-hidden shadow-xl">
                    <div className="bg-amber-900/80 px-6 py-3 font-bold text-white flex justify-between items-center border-b border-amber-600">
                        <div className="flex items-center gap-2"><Building className="w-5 h-5" /> 5. รายการค่าใช้จ่ายอื่นๆ (เบี้ยเลี้ยง/ที่พัก/พาหนะ)</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-[#001f3f] text-amber-400 border-b-2 border-amber-600">
                                <tr>
                                    <th className="px-3 py-3 text-center w-10">ที่</th>
                                    <th className="px-2 py-3 w-[30%]">รายการ (พิมพ์ด้วยเสียงได้)</th>
                                    <th className="px-2 py-3 text-center">ปริมาณ(1)</th>
                                    <th className="px-2 py-3 text-center">หน่วย</th>
                                    <th className="px-2 py-3 text-center">ปริมาณ(2)</th>
                                    <th className="px-2 py-3 text-center">หน่วย</th>
                                    <th className="px-2 py-3 text-right">อัตรา(บาท)</th>
                                    <th className="px-3 py-3 text-right">รวมเงิน</th>
                                    <th className="px-2 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700 bg-[#0B1528]">
                                {generalExpenses.map((exp, index) => (
                                    <tr key={exp.id}>
                                        <td className="px-3 py-2 text-center text-gray-500">{index + 1}</td>
                                        <td className="px-2 py-2"><DictationInput value={exp.item_name} onChange={(val:any) => handleGeneralChange(exp.id, 'item_name', val)} placeholder="รายละเอียด..." /></td>
                                        <td className="px-2 py-2"><input type="number" value={exp.qty_a} onChange={e => handleGeneralChange(exp.id, 'qty_a', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-1.5 rounded text-center outline-none" /></td>
                                        <td className="px-2 py-2"><input type="text" value={exp.unit_a} onChange={e => handleGeneralChange(exp.id, 'unit_a', e.target.value)} className="w-16 bg-gray-800 text-gray-300 px-2 py-1.5 rounded text-center outline-none" /></td>
                                        <td className="px-2 py-2">{exp.unit_b !== '' && <input type="number" value={exp.qty_b} onChange={e => handleGeneralChange(exp.id, 'qty_b', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-1.5 rounded text-center outline-none" />}</td>
                                        <td className="px-2 py-2">{exp.unit_b !== '' && <input type="text" value={exp.unit_b} onChange={e => handleGeneralChange(exp.id, 'unit_b', e.target.value)} className="w-16 bg-gray-800 text-gray-300 px-2 py-1.5 rounded text-center outline-none" />}</td>
                                        <td className="px-2 py-2"><input type="number" value={exp.unit_price} onChange={e => handleGeneralChange(exp.id, 'unit_price', e.target.value)} className="w-full bg-gray-800 text-white px-2 py-1.5 rounded text-right outline-none font-bold" /></td>
                                        <td className="px-3 py-2 text-right font-mono text-amber-400 font-bold bg-[#001f3f]/50">{exp.total.toLocaleString('th-TH')}</td>
                                        <td className="px-2 py-2 text-center"><button onClick={() => removeGeneral(exp.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-[#0B1528] flex items-center justify-between border-b border-[#008080]/30">
                        <button onClick={() => setIsExpenseModalOpen(true)} className="px-4 py-2 bg-amber-900/50 hover:bg-amber-800 border border-amber-600 text-amber-300 font-bold text-sm rounded-lg shadow flex items-center gap-2"><ListChecks className="w-5 h-5"/> เพิ่มค่าใช้จ่าย (เลือกจากระเบียบ)</button>
                        <div className="text-lg font-bold text-amber-400">รวมค่าใช้จ่ายอื่น: {generalTotal.toLocaleString('th-TH')} บาท</div>
                    </div>
                    
                    {generalExpenses.length > 0 && (
                        <div className="p-6 bg-white text-black border-t-4 border-amber-500">
                            <p className="text-sm font-bold text-amber-700 mb-3 border-b pb-1">ข้อความที่จะแทรกในเนื้อหาบันทึกข้อความ</p>
                            <div className="font-serif text-[16px] leading-relaxed pl-4 space-y-1">
                                {generalExpenses.map((exp, idx) => <div key={exp.id}>{generatePreviewText(exp, idx)}</div>)}
                            </div>
                        </div>
                    )}
                </div>

                {/* ยอดรวมสุทธิ และ Routing */}
                <div className="bg-[#001f3f] border border-[#98FB98]/50 rounded-xl p-6 shadow-xl text-center">
                    <h3 className="text-lg text-teal-100 mb-2">รวมวงเงินที่ขออนุมัติทั้งสิ้น (พัสดุ + ค่าใช้จ่ายอื่น)</h3>
                    <div className="text-4xl font-black text-[#98FB98] font-mono">{grandTotal.toLocaleString('th-TH')} <span className="text-xl">บาท</span></div>
                </div>

                <div className="bg-[#0B1528] border border-gray-700 rounded-xl p-6">
                    <h3 className="text-[#98FB98] font-bold mb-4">เส้นทางการเสนอเรื่อง (Approval Routing)</h3>
                    {!selectedActivity ? <div className="text-gray-500 text-sm italic">รอการเลือกกิจกรรมอ้างอิง...</div> : (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
                            <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">{step1Name}</div><ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                            <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">{step2Name}</div><ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                            <div className="px-3 py-2 bg-gray-800 rounded border border-gray-600 font-medium">{step3Name}</div><div className="w-full h-px bg-gray-700 my-2"></div>
                            <div className="px-3 py-2 bg-amber-900/30 rounded border border-amber-500 text-amber-400 font-bold">งานแผนงาน (ลงรับเรื่อง)</div><ArrowLeft className="w-4 h-4 rotate-180 text-[#008080]" />
                            <div className="px-3 py-2 bg-[#008080] rounded border border-[#98FB98] text-white font-bold shadow-lg">ผู้อำนวยการโรงเรียน (อนุมัติ)</div>
                        </div>
                    )}
                </div>

                {/* 🌟 ฟังก์ชันจัดการปุ่ม Save ด้านล่างสุด[cite: 8] */}
                <div className="flex justify-end gap-4 pt-4 pb-10">
                    <button 
                        type="button" 
                        onClick={() => handleSave('DRAFT')}
                        disabled={isSavingDraft}
                        className="px-6 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700 disabled:opacity-50"
                    >
                        {isSavingDraft ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => handleSave('PENDING')}
                        disabled={isSavingDraft}
                        className="flex items-center gap-2 bg-[#008080] hover:bg-[#006666] text-white px-8 py-3 rounded-lg font-bold shadow-lg border border-[#98FB98] disabled:opacity-50"
                    >
                        <CheckCircle2 className="w-5 h-5" /> {isSavingDraft ? 'กำลังประมวลผล...' : 'สร้างบันทึกและส่งอนุมัติ'}
                    </button>
                </div>
            </main>

            {/* MODAL 1: ตะกร้าพัสดุ */}
            {isMaterialCartOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#002B49] border border-[#008080] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-5 bg-gradient-to-r from-teal-800 to-[#008080] flex justify-between items-center text-white border-b border-teal-500">
                            <h2 className="font-bold text-xl flex items-center gap-2"><ShoppingCart /> คลังพัสดุส่วนกลาง</h2>
                            <div className="flex gap-2 items-center">
                                {/* 🌟 ปุ่มเปิดผู้ช่วยสุ่มจัดพัสดุ */}
                                <button onClick={() => { setIsAutoPickModalOpen(true); setIsMaterialCartOpen(false); }} className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-amber-900 font-bold text-sm rounded flex items-center gap-1 shadow">
                                    <Sparkles className="w-4 h-4"/> สุ่มพัสดุอัตโนมัติ (AI Auto-Picker)
                                </button>
                                <button onClick={() => setIsMaterialCartOpen(false)} className="hover:text-red-200 ml-2"><X className="w-6 h-6"/></button>
                            </div>
                        </div>
                        
                        {/* แถบค้นหา เรียงลำดับ และ กรองประเภท */}
                        <div className="p-4 bg-[#0B1528] border-b border-[#008080]/30 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex items-center">
                                <input type="text" placeholder="พิมพ์หรือค้นหาด้วยเสียง..." value={materialSearchQuery} onChange={(e) => setMaterialSearchQuery(e.target.value)} className="w-full bg-[#001f3f] text-[#98FB98] border border-[#008080] font-bold px-3 py-2 rounded-l outline-none focus:border-[#98FB98]" />
                                <button onClick={startSearchListening} className="px-4 py-2 border-y border-r rounded-r bg-[#001f3f] border-[#008080] text-teal-400 hover:bg-teal-900 flex justify-center"><Mic className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="md:w-1/4 relative flex items-center">
                                <Filter className="w-5 h-5 text-teal-400 absolute left-3" />
                                <select value={materialCategoryFilter} onChange={(e) => setMaterialCategoryFilter(e.target.value)} className="w-full bg-[#001f3f] text-teal-300 border border-[#008080] rounded px-3 py-2 pl-10 outline-none font-bold">
                                    <option value="">-- กรองทุกประเภท --</option>
                                    {uniqueCategories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            {/* Dropdown เรียงลำดับ */}
                            <div className="md:w-1/4 relative flex items-center">
                                <ArrowUpDown className="w-5 h-5 text-amber-400 absolute left-3" />
                                <select value={materialSortBy} onChange={(e:any) => setMaterialSortBy(e.target.value)} className="w-full bg-[#001f3f] text-amber-300 border border-amber-600/50 rounded px-3 py-2 pl-10 outline-none font-bold">
                                    <option value="name_asc">ชื่อ (ก-ฮ)</option>
                                    <option value="name_desc">ชื่อ (ฮ-ก)</option>
                                    <option value="price_asc">ราคา (ถูก-แพง)</option>
                                    <option value="price_desc">ราคา (แพง-ถูก)</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 bg-[#0B1528]">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-[#001f3f] text-teal-400"><tr><th className="p-3 w-10 text-center"><ShoppingCart className="w-4 h-4 mx-auto"/></th><th className="p-3">รหัสพัสดุ</th><th className="p-3">ชื่อพัสดุ</th><th className="p-3 text-center">ประเภท</th><th className="p-3 text-center">ยี่ห้อ</th><th className="p-3 text-center">หน่วยนับ</th><th className="p-3 text-right">ราคาประเมิน</th></tr></thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredModalMaterials.length > 0 ? filteredModalMaterials.map((mat: any) => (
                                        <tr key={mat.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="p-3 text-center"><input type="checkbox" checked={selectedMaterialIds.includes(mat.id)} onChange={() => toggleMaterialSelection(mat.id)} className="w-5 h-5 accent-teal-500 cursor-pointer" /></td>
                                            <td className="p-3 font-mono text-teal-400">{mat.item_code}</td>
                                            <td className="p-3 font-medium text-white">{mat.item_name}</td>
                                            <td className="p-3 text-center text-gray-400 text-xs">{mat.category || '-'}</td>
                                            <td className="p-3 text-center text-gray-400">{mat.brand || '-'}</td>
                                            <td className="p-3 text-center">{mat.unit_name}</td>
                                            <td className="p-3 text-right font-mono text-teal-300">{Number(mat.default_price).toLocaleString()} บาท</td>
                                        </tr>
                                    )) : <tr><td colSpan={7} className="text-center p-8 text-gray-500 italic">ไม่พบรายการพัสดุที่ตรงกับการค้นหา</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-[#001f3f] border-t border-[#008080] flex justify-between items-center">
                            <span className="text-teal-400 font-bold">เลือกแล้ว {selectedMaterialIds.length} รายการ</span>
                            <button onClick={confirmMaterialSelection} disabled={selectedMaterialIds.length === 0} className="px-6 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold rounded-lg shadow flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> นำเข้าสู่ตารางพัสดุ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ผู้ช่วยจัดพัสดุอัตโนมัติ (Auto-Picker) */}
            {isAutoPickModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0B1528] border border-amber-500 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-5 bg-gradient-to-r from-amber-700 to-amber-500 flex justify-between items-center text-white border-b border-amber-400">
                            <h2 className="font-bold text-xl flex items-center gap-2"><Sparkles /> ผู้ช่วยสุ่มจัดพัสดุอัตโนมัติ</h2>
                            <button onClick={() => setIsAutoPickModalOpen(false)} className="hover:text-red-900"><X className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="p-5 bg-gray-900 flex flex-col gap-4 border-b border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-amber-400 font-bold text-sm block mb-1">วงเงินที่ต้องการจัด (บาท):</label>
                                    <input type="number" value={autoPickTargetAmount} onChange={e => setAutoPickTargetAmount(Number(e.target.value))} className="w-full bg-[#001f3f] border border-amber-500 text-white font-bold rounded px-4 py-2 outline-none focus:border-amber-300" />
                                </div>
                                <div>
                                    <label className="text-amber-400 font-bold text-sm block mb-1">ต้องการประมาณกี่รายการ:</label>
                                    <input type="number" value={autoPickApproxItems} onChange={e => setAutoPickApproxItems(Number(e.target.value))} className="w-full bg-[#001f3f] border border-amber-500 text-white font-bold rounded px-4 py-2 outline-none focus:border-amber-300" />
                                </div>
                            </div>
                            <div>
                                <label className="text-amber-400 font-bold text-sm block mb-2">เลือกหมวดหมู่ที่ต้องการ (ไม่เลือก = สุ่มทุกหมวด):</label>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueCategories.map(cat => (
                                        <label key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer border transition-all ${autoPickCategories.includes(cat) ? 'bg-amber-900/50 border-amber-500 text-amber-300' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                                            <input type="checkbox" className="hidden" checked={autoPickCategories.includes(cat)} onChange={() => {
                                                setAutoPickCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
                                            }} />
                                            {cat}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button onClick={generateAutoPick} className="mt-2 w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-lg shadow flex items-center justify-center gap-2 transition-colors text-lg">
                                <RefreshCcw className="w-5 h-5"/> {autoPickedResults.length > 0 ? 'สุ่มจัดรายการใหม่ (Recalculate)' : 'เริ่มจัดพัสดุอัตโนมัติ'}
                            </button>
                        </div>

                        {/* ตารางแสดงผลลัพธ์การจัด */}
                        <div className="p-4 overflow-y-auto flex-1 bg-[#0B1528]">
                            <table className="w-full text-left text-sm text-gray-300">
                                <thead className="bg-[#001f3f] text-amber-400"><tr><th className="p-3 w-10 text-center">ที่</th><th className="p-3">รหัสพัสดุ</th><th className="p-3">ชื่อพัสดุ</th><th className="p-3 text-center">ประเภท</th><th className="p-3 text-center">จำนวนชิ้นที่จัดให้</th><th className="p-3 text-right">ราคาประเมิน</th><th className="p-3 text-right">รวมเงิน</th></tr></thead>
                                <tbody className="divide-y divide-gray-700">
                                    {autoPickedResults.length > 0 ? autoPickedResults.map((mat: any, idx: number) => (
                                        <tr key={mat.id} className="hover:bg-gray-800/50">
                                            <td className="p-3 text-center">{idx + 1}</td>
                                            <td className="p-3 font-mono text-amber-400">{mat.item_code}</td>
                                            <td className="p-3 font-medium text-white">{mat.item_name}</td>
                                            <td className="p-3 text-center text-gray-400 text-xs">{mat.category || '-'}</td>
                                            <td className="p-3 text-center font-bold text-white bg-amber-900/30">{mat.generatedQty} {mat.unit_name}</td>
                                            <td className="p-3 text-right font-mono">{Number(mat.default_price).toLocaleString()}</td>
                                            <td className="p-3 text-right font-mono font-bold text-amber-300">{(mat.generatedQty * mat.default_price).toLocaleString()}</td>
                                        </tr>
                                    )) : <tr><td colSpan={7} className="text-center p-8 text-gray-500 italic">กดปุ่ม "เริ่มจัดพัสดุอัตโนมัติ" ด้านบนเพื่อดูผลลัพธ์</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="p-4 bg-[#001f3f] border-t border-amber-600 flex justify-between items-center">
                            <span className="text-amber-400 font-bold">รวมยอดจัดได้: <span className="text-2xl text-white ml-2">{autoPickedResults.reduce((sum, item) => sum + (item.generatedQty * item.default_price), 0).toLocaleString()}</span> บาท</span>
                            <button onClick={confirmAutoPick} disabled={autoPickedResults.length === 0} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-amber-900 font-bold rounded-lg shadow flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> ยืนยันนำรายการเข้าตาราง</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* MODAL 2: ค่าใช้จ่ายอื่น */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0B1528] border border-gray-600 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 bg-gray-800 flex justify-between items-center text-white border-b border-gray-700">
                            <h2 className="font-bold text-lg flex items-center gap-2"><ListChecks className="text-amber-400" /> แม่แบบค่าใช้จ่าย (ระเบียบการเงิน)</h2>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="hover:text-red-400"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-2">
                            {EXPENSE_TEMPLATES.map((tmpl, idx) => (
                                <button key={idx} onClick={() => addExpenseFromTemplate(tmpl)} className="w-full flex items-center justify-between p-3 bg-gray-900/50 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-lg text-left transition-colors">
                                    <div><div className="text-white font-bold text-sm">{tmpl.name}</div><div className="text-xs text-gray-400 mt-1">โครงสร้างอัตรา: {tmpl.unit_a} {tmpl.unit_b && `/ ${tmpl.unit_b}`} {tmpl.price && <span className="text-amber-400 ml-2">แนะนำ: {tmpl.price} บ.</span>}</div></div>
                                    <Plus className="w-5 h-5 text-gray-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}