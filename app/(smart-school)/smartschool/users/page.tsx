'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Search, UserPlus, ShieldAlert, KeyRound, Unlock, Power, Users } from 'lucide-react'
import { getUsersList, generateUserAccounts, updateUserAccess } from './actions'

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        loadUsers()
    }, [searchQuery])

    const loadUsers = async () => {
        setIsLoading(true)
        const data = await getUsersList(searchQuery)
        setUsers(data)
        setIsLoading(false)
    }

    const handleGenerateAccounts = async () => {
        if (!window.confirm("ระบบจะสร้างบัญชีและรหัสผ่านตั้งต้นให้กับบุคลากรที่ยังไม่มีบัญชี คุณต้องการดำเนินการต่อหรือไม่?")) return;
        
        setIsGenerating(true)
        const result = await generateUserAccounts()
        alert(result.message)
        if (result.success) loadUsers()
        setIsGenerating(false)
    }

    const handleRoleChange = async (id: string, newRole: string) => {
        const result = await updateUserAccess(id, 'system_role', newRole)
        if (result.success) loadUsers()
    }

    const handleStatusChange = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
        const confirmMsg = newStatus === 'INACTIVE' ? 'ต้องการระงับบัญชีนี้ใช่หรือไม่?' : 'ต้องการเปิดใช้งานบัญชีนี้ใช่หรือไม่?';
        
        if (window.confirm(confirmMsg)) {
            const result = await updateUserAccess(id, 'account_status', newStatus)
            if (result.success) loadUsers()
        }
    }

    // ฟังก์ชันช่วยแสดงสีของสถานะบัญชี
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium">เปิดใช้งาน</span>;
            case 'PENDING_ONBOARDING': return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium">รอเข้าสู่ระบบครั้งแรก</span>;
            case 'INACTIVE': return <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium">ถูกระงับ</span>;
            default: return <span className="px-2.5 py-1 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-lg text-xs font-medium">ไม่มีบัญชี</span>;
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-[90rem] mx-auto w-full font-sans text-white h-full flex flex-col">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">จัดการสิทธิ์ผู้ใช้งาน</h1>
                        <p className="text-xs text-[#0D9488] tracking-widest font-medium mt-0.5">Access Control & Security</p>
                    </div>
                </div>
                <Link href="/smartschool" className="flex items-center gap-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 px-4 py-2.5 rounded-lg border border-gray-700 text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4" /> กลับหน้าหลัก
                </Link>
            </header>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shrink-0 bg-[#111A2E] p-4 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-blue-600"></div>
                
                <div className="relative w-full md:w-80 ml-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                        type="text" placeholder="ค้นหาชื่อ, รหัสพนักงาน..." 
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0B1325] border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-teal-500 focus:outline-none"
                    />
                </div>
                
                <button 
                    onClick={handleGenerateAccounts}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg w-full md:w-auto justify-center transition-all"
                >
                    <UserPlus className="w-4 h-4" /> 
                    {isGenerating ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีผู้ใช้งานอัตโนมัติ'}
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-[#111A2E] border border-gray-800 rounded-2xl overflow-hidden shadow-lg flex-1 min-h-0 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-gray-400 whitespace-nowrap">
                        <thead className="bg-[#1A233A] text-gray-300 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-semibold">รหัสพนักงาน</th>
                                <th className="px-6 py-4 font-semibold">ชื่อ - นามสกุล</th>
                                <th className="px-6 py-4 font-semibold">บัญชีเข้าใช้งาน (Email)</th>
                                <th className="px-6 py-4 font-semibold">ระดับสิทธิ์ (Role)</th>
                                <th className="px-6 py-4 font-semibold text-center">สถานะบัญชี</th>
                                <th className="px-6 py-4 font-semibold text-center">จัดการความปลอดภัย</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {isLoading ? (
                                <tr><td colSpan={6} className="text-center py-10">กำลังโหลดข้อมูล...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-500 flex flex-col items-center gap-3">
                                    <Users className="w-8 h-8 text-gray-600" />
                                    ยังไม่มีข้อมูลบุคลากร กรุณานำเข้าจากเมนู HR ก่อน
                                </td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-800/40 transition-colors">
                                        <td className="px-6 py-4 font-medium text-blue-400">{user.emp_code}</td>
                                        <td className="px-6 py-4 text-white flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                                                {user.first_name?.charAt(0)}
                                            </div>
                                            {user.prefix || ''}{user.first_name} {user.last_name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">
                                            {user.user_id ? user.email : <span className="text-gray-600 italic">ยังไม่ได้สร้างบัญชี</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={user.system_role || 'User'} 
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                disabled={!user.user_id}
                                                className="bg-[#0B1325] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50"
                                            >
                                                <option value="Admin">Admin (ผู้ดูแลระบบ)</option>
                                                <option value="HR">HR (งานบุคลากร)</option>
                                                <option value="Finance">Finance (การเงิน/พัสดุ)</option>
                                                <option value="User">User (ครูทั่วไป)</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(user.user_id ? (user.account_status || 'PENDING_ONBOARDING') : 'NO_ACCOUNT')}
                                            {user.failed_pin_attempts > 0 && (
                                                <div className="text-[10px] text-red-400 mt-1 flex items-center justify-center gap-1">
                                                    <ShieldAlert className="w-3 h-3" /> PIN ผิด {user.failed_pin_attempts} ครั้ง
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    disabled={!user.user_id}
                                                    title="รีเซ็ตรหัสผ่าน (กลับไปเป็นรหัสตั้งต้น)" 
                                                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-blue-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                                                >
                                                    <KeyRound className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    disabled={user.failed_pin_attempts === 0}
                                                    title="ปลดล็อครหัส PIN" 
                                                    className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-amber-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
                                                >
                                                    <Unlock className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    disabled={!user.user_id}
                                                    onClick={() => handleStatusChange(user.id, user.account_status)}
                                                    title={user.account_status === 'INACTIVE' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} 
                                                    className={`p-2 rounded-lg bg-gray-800 transition-colors disabled:opacity-30 ${user.account_status === 'INACTIVE' ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-gray-400 hover:text-red-400 hover:bg-red-500/20'}`}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}