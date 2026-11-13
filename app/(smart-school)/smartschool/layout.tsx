'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Briefcase, Settings, LogOut, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

export default function SmartSchoolLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // รายการเมนูหลัก
    const navItems = [
        { name: 'แดชบอร์ด', href: '/smartschool', icon: LayoutDashboard },
        { name: 'บุคลากร (HR)', href: '/smartschool/hr', icon: Users },
        { name: 'แผนปฏิบัติการ', href: '/smartschool/budget/projects', icon: Briefcase },
        { name: 'ตั้งค่าโรงเรียน', href: '/smartschool/settings', icon: Settings },
    ]

    return (
        <div className="flex h-screen bg-[#0B1325] text-white font-sans overflow-hidden">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-[#111A2E] border-r border-gray-800">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="relative w-10 h-10">
                        {/* ดึงโลโก้จาก public ได้เลย */}
                        <Image src="/niivaa_SmartSchool.png" alt="NiiVaa Logo" fill className="object-contain" unoptimized />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">NiiVaa</h1>
                        <p className="text-[10px] text-[#0D9488] tracking-widest uppercase">SmartSchool</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                        const Icon = item.icon
                        return (
                            <Link 
                                key={item.href} 
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-gradient-to-r from-teal-500/20 to-emerald-500/10 text-[#10B981] border border-teal-500/30 font-medium' 
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm">{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm">ออกจากระบบ</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header & Menu Toggle */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#111A2E] border-b border-gray-800 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 relative"><Image src="/niivaa_SmartSchool.png" alt="Logo" fill className="object-contain" unoptimized/></div>
                    <span className="font-bold text-white">SmartSchool</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400 hover:text-white">
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-16 bg-[#111A2E] z-40 p-4 border-b border-gray-800 shadow-2xl">
                    <nav className="flex flex-col space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            return (
                                <Link 
                                    key={item.href} 
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800"
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-sm">{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative overflow-y-auto overflow-x-hidden md:pt-0 pt-16">
                {children}
            </main>
        </div>
    )
}