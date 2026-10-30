"use client";
import RouteGuard from '@/components/RouteGuard'; // 👈 นำไปวางรวมกับ import ด้านบนสุด
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    ArrowRightCircle, Map, Save, ChefHat, LayoutGrid, Wand2, Lock, Unlock,
    Settings2, Plus, ArrowDownToLine, ArrowRightToLine, PenTool,
    Users, Trash2, CheckCircle2, Sparkles, BookOpen, X, AlertTriangle, Info, UserPlus
} from 'lucide-react';

interface Zone {
    id: string;
    name: string;
    rows: number;
    cols: number;
    walkway_col: number;
    walkway_row: number;
}

interface Table {
    id: string;
    zone_id: string;
    table_number: number;
    row: number;
    col: number;
    group_name: string;
    is_pinned: boolean;
    seated_names: string[];
}

interface Attendee {
    id: string;
    fullname: string;
    guest_faction: string;
    attendee_type: string;
    gender?: string;         // 🟢 เพิ่ม
    organization?: string;   // 🟢 เพิ่ม
    global_profiles?: {
        profile_image_url: string;
    } | null;
}

function MealPlannerContent() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event_id') || '';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [eventName, setEventName] = useState("กำลังโหลด...");

    const [mealInfo, setMealInfo] = useState({ id: '', room_name: 'Main Grand Ballroom', meal_name: 'Gala Dinner', seats_per_table: 8, expected_attendees: 0 });
    const [zones, setZones] = useState<Zone[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [attendees, setAttendees] = useState<Attendee[]>([]);

    const [activeTableId, setActiveTableId] = useState<string | null>(null);

    // 🎯 State สำหรับ Auto-Assign Modal
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assignMode, setAssignMode] = useState<'separate' | 'mixed'>('separate');
    const [assignStats, setAssignStats] = useState({ manualTables: 0, manualPeople: 0, pendingHost: 0, pendingVisitor: 0, totalPending: 0 });
    // 🔄 State สำหรับ Table Management Modal
    const [manageTableId, setManageTableId] = useState<string | null>(null);

    // 📖 State ควบคุม Drawer คู่มือ
    const [isManualOpen, setIsManualOpen] = useState(false);
    // ค้นหาข้อมูลโต๊ะที่กำลังจัดการอยู่
    const activeManageTable = tables.find(t => t.id === manageTableId);
    // หารายชื่อแขกที่นั่งอยู่โต๊ะนี้ (เทียบ ID)
    const seatedAttendeesInActiveTable = attendees.filter(a => activeManageTable?.seated_names.includes(a.id));

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const role = localStorage.getItem('niivaa_event_role');
        if (role === 'admin') setIsAdmin(true);
    }, []);

    // 🟢 1. โหลดข้อมูลทั้งหมด (Optimized with Promise.all)
    const loadData = async () => {
        if (!eventId) return;
        setLoading(true);
        try {
            // 🌟 จุดที่ 1: โหลด Event, Attendees และ Meal "พร้อมกัน" เพราะไม่ได้ขึ้นต่อกัน
            const [
                { data: eventData },
                { data: attendeesData },
                { data: mealData }
            ] = await Promise.all([
                supabase.from('events').select('title').eq('id', eventId).maybeSingle(),
                supabase.from('event_attendees').select(`
                    id, fullname, guest_faction, attendee_type, gender, organization, global_profiles ( profile_image_url )
                `).eq('event_id', eventId),
                supabase.from('event_meals').select('*').eq('event_id', eventId).maybeSingle()
            ]);

            if (eventData) setEventName(eventData.title);
            if (attendeesData) setAttendees(attendeesData as any[]);

            if (mealData) {
                setMealInfo({
                    id: mealData.id,
                    room_name: mealData.room_name || 'Grand Ballroom',
                    meal_name: mealData.meal_name,
                    seats_per_table: mealData.seats_per_table || 8,
                    expected_attendees: mealData.expected_attendees || 0
                });

                // 🌟 จุดที่ 2: โหลด Zone และ Tables "พร้อมกัน" เพราะใช้ mealData.id เหมือนกัน
                const [
                    { data: zonesData },
                    { data: tablesData }
                ] = await Promise.all([
                    supabase.from('event_meal_zones').select('*').eq('meal_id', mealData.id).order('created_at'),
                    supabase.from('event_meal_tables').select('*').eq('meal_id', mealData.id).order('table_number')
                ]);

                // จัดการข้อมูล Zone
                if (zonesData && zonesData.length > 0) {
                    setZones(zonesData.map(z => ({
                        id: z.id, name: z.zone_name, rows: z.grid_rows, cols: z.grid_cols,
                        walkway_col: z.walkway_col || 0, walkway_row: z.walkway_row || 0
                    })));
                } else {
                    setZones([{ id: crypto.randomUUID(), name: 'โซน VIP หลัก', rows: 3, cols: 5, walkway_col: 0, walkway_row: 0 }]);
                }

                // จัดการข้อมูล Table
                if (tablesData && tablesData.length > 0) {
                    setTables(tablesData.map(t => ({
                        id: t.id,
                        zone_id: t.zone_id,
                        table_number: t.table_number,
                        row: t.grid_row_index,
                        col: t.grid_col_index,
                        group_name: t.group_name || '',
                        is_pinned: t.is_pinned || false,
                        seated_names: Array.isArray(t.seated_names) ? t.seated_names : []
                    })));
                }
            } else {
                setMealInfo(prev => ({ ...prev, id: crypto.randomUUID() }));
                setZones([{ id: crypto.randomUUID(), name: 'โซน VIP หลัก', rows: 3, cols: 5, walkway_col: 0, walkway_row: 0 }]);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
        setLoading(false);
    };

    // เรียกใช้ผ่าน useEffect 
    useEffect(() => { loadData(); }, [eventId]);

    // 👑 State สำหรับ VIP Modal
    const [isVipModalOpen, setIsVipModalOpen] = useState(false);
    const [vipTargetTable, setVipTargetTable] = useState('');
    const [selectedVips, setSelectedVips] = useState<string[]>([]);

    // 👑 กรองเฉพาะ VIP/Speaker ที่ยังไม่มีโต๊ะ (ป้องกันช่องว่างซ่อนเร้น และเช็ค Array ให้ชัวร์)
    const assignedAttendeeIds = tables.flatMap(t => Array.isArray(t.seated_names) ? t.seated_names : []);

    const availableVips = attendees.filter(a => {
        // บังคับแปลงเป็น String, ตัดช่องว่างหัวท้ายทิ้ง และแปลงเป็นตัวพิมพ์เล็ก
        const type = String(a.attendee_type || '').trim().toLowerCase();
        const isTargetType = type === 'vip' || type === 'speaker';
        const isNotAssigned = !assignedAttendeeIds.includes(a.id);

        return isTargetType && isNotAssigned;
    });

    const targetTableData = tables.find(t => t.id === vipTargetTable);
    const currentSeatsUsed = targetTableData?.seated_names?.length || 0;
    const seatsAvailable = mealInfo.seats_per_table - currentSeatsUsed;

    useEffect(() => { loadData(); }, [eventId]);

    // 🟢 2. ซิงค์ผังและรันเลขโต๊ะต่อเนื่อง
    useEffect(() => {
        if (loading) return;
        setTables(prevTables => {
            const newTables: Table[] = [];
            let currentTableNum = 1;
            zones.forEach(zone => {
                for (let r = 0; r < zone.rows; r++) {
                    for (let c = 0; c < zone.cols; c++) {
                        const existing = prevTables.find(t => t.zone_id === zone.id && t.row === r && t.col === c);
                        newTables.push({
                            id: existing ? existing.id : crypto.randomUUID(),
                            zone_id: zone.id, table_number: currentTableNum++, row: r, col: c,
                            group_name: existing ? existing.group_name : '',
                            is_pinned: existing ? existing.is_pinned : false,
                            seated_names: existing ? existing.seated_names : []
                        });
                    }
                }
            });
            return newTables;
        });
    }, [zones, loading]);

    // 🟢 อัปเดตจำนวนจัดเลี้ยงจริง (Auto-save)
    const handleUpdateExpectedAttendees = async (val: number) => {
        setMealInfo(prev => ({ ...prev, expected_attendees: val }));

        // บันทึกลงฐานข้อมูลทันทีถ้ามี ID แล้ว
        if (mealInfo.id && mealInfo.id.length > 20) {
            const { error } = await supabase
                .from('event_meals')
                .update({ expected_attendees: val })
                .eq('id', mealInfo.id);

            if (error) console.error("Error updating expected attendees:", error);
        }
    };

    // 🟢 3. บันทึกข้อมูลแบบสมบูรณ์
    const handleSaveLayout = async () => {
        if (!eventId || saving) return;
        setSaving(true);
        try {
            const { data: savedMeal, error: mealErr } = await supabase.from('event_meals').upsert({
                id: mealInfo.id, event_id: eventId, meal_name: mealInfo.meal_name, room_name: mealInfo.room_name, seats_per_table: mealInfo.seats_per_table, expected_attendees: mealInfo.expected_attendees
            }).select().single();
            if (mealErr) throw mealErr;

            const zonesToUpsert = zones.map(z => ({
                id: z.id, meal_id: savedMeal.id, zone_name: z.name, grid_rows: z.rows, grid_cols: z.cols, walkway_col: z.walkway_col, walkway_row: z.walkway_row
            }));
            const { error: zErr } = await supabase.from('event_meal_zones').upsert(zonesToUpsert);
            if (zErr) throw zErr;

            const validZoneIds = zones.map(z => z.id);
            await supabase.from('event_meal_zones').delete().eq('meal_id', savedMeal.id).not('id', 'in', `(${validZoneIds.join(',')})`);

            const tablesToUpsert = tables.map(t => ({
                id: t.id, meal_id: savedMeal.id, zone_id: t.zone_id, table_number: t.table_number, group_name: t.group_name, is_pinned: t.is_pinned, grid_row_index: t.row, grid_col_index: t.col, table_capacity: mealInfo.seats_per_table, seated_names: t.seated_names
            }));
            const { error: tErr } = await supabase.from('event_meal_tables').upsert(tablesToUpsert);
            if (tErr) throw tErr;

            const validTableIds = tables.map(t => t.id);
            if (validTableIds.length > 0) await supabase.from('event_meal_tables').delete().eq('meal_id', savedMeal.id).not('id', 'in', `(${validTableIds.join(',')})`);

            alert('✅ บันทึกผังโต๊ะเรียบร้อยแล้ว!');
        } catch (err: any) { alert('❌ เกิดข้อผิดพลาด: ' + err.message); }
        setSaving(false);
    };

    // 🟢 4. การจัดการ Auto-Assign
    const handlePrepareAutoAssign = (mode: 'separate' | 'mixed') => {
        const assignedIds = tables.flatMap(t => t.seated_names || []);
        const manualTablesCount = tables.filter(t => (t.seated_names && t.seated_names.length > 0) || t.group_name).length;
        const pendingAttendees = attendees.filter(a => !assignedIds.includes(a.id));

        const hostCount = pendingAttendees.filter(a => a.guest_faction === 'host').length;
        const visitorCount = pendingAttendees.filter(a => a.guest_faction === 'visitor').length;

        setAssignStats({
            manualTables: manualTablesCount, manualPeople: assignedIds.length,
            pendingHost: hostCount, pendingVisitor: visitorCount, totalPending: hostCount + visitorCount
        });
        setAssignMode(mode);
        setIsAssignModalOpen(true);
    };
    // ⚙️ ตั้งค่าเงื่อนไขการสุ่ม (Zoning & Grouping)
    const [assignOptions, setAssignOptions] = useState({
        genderZoning: 'none', // 'none' | 'male-left' | 'female-left'
        groupOrg: true        // จับกลุ่มคนองค์กรเดียวกัน
    });
    const executeAutoAssign = () => {
        // 1. หาคนที่ยังไม่มีโต๊ะทั้งหมด (รวม VIP ที่ตกค้าง)
        const assignedIds = tables.flatMap(t => t.seated_names || []);
        let pendingGuests = attendees.filter(a => !assignedIds.includes(a.id));

        // 2. จัดกลุ่มตามองค์กร (ถ้าเปิดใช้)
        if (assignOptions.groupOrg) {
            pendingGuests.sort((a, b) => (a.organization || '').localeCompare(b.organization || ''));
        }

        // 3. กรองโต๊ะที่ยังว่าง และไม่ได้ถูกล็อค (Pinned)
        let availableTables = tables.filter(t => !t.is_pinned && (t.seated_names?.length || 0) < mealInfo.seats_per_table);

        // คัดลอก tables เดิมมาเตรียมแก้ไข
        let newTables = [...tables];

        // 4. ฟังก์ชันยัดคนลงโต๊ะ (ทีละคน)
        const assignToTable = (guest: Attendee, targetTables: Table[]) => {
            // หาโต๊ะที่ยังมีที่ว่าง
            let targetTable = targetTables.find(t => (t.seated_names?.length || 0) < mealInfo.seats_per_table);
            if (targetTable) {
                // อัปเดต newTables
                newTables = newTables.map(t => {
                    if (t.id === targetTable!.id) {
                        return { ...t, seated_names: [...(t.seated_names || []), guest.id] };
                    }
                    return t;
                });
                // อัปเดต availableTables ในลูปด้วย
                availableTables = availableTables.map(t => t.id === targetTable!.id ? { ...t, seated_names: [...(t.seated_names || []), guest.id] } : t);
                return true;
            }
            return false;
        };

        // 5. เริ่มแจกแจงที่นั่ง
        pendingGuests.forEach(guest => {
            let allowedTables = availableTables;

            // 🎯 ลอจิกแยกเพศ ซ้าย-ขวา (อิงจากกึ่งกลางของโซน)
            if (assignOptions.genderZoning !== 'none' && guest.gender) {
                allowedTables = availableTables.filter(t => {
                    const zone = zones.find(z => z.id === t.zone_id);
                    if (!zone) return true;

                    const midCol = Math.floor(zone.cols / 2);
                    const isLeft = t.col < midCol;

                    if (assignOptions.genderZoning === 'male-left') {
                        return guest.gender === 'male' ? isLeft : !isLeft;
                    } else { // female-left
                        return guest.gender === 'female' ? isLeft : !isLeft;
                    }
                });

                // ถ้าฝั่งที่ต้องการเต็มแล้ว ก็ยอมให้ไปนั่งฝั่งตรงข้ามได้
                if (allowedTables.filter(t => (t.seated_names?.length || 0) < mealInfo.seats_per_table).length === 0) {
                    allowedTables = availableTables;
                }
            }

            assignToTable(guest, allowedTables);
        });

        setTables(newTables);
        setIsAssignModalOpen(false);
        alert('✅ ระบบได้จัดที่นั่งอัตโนมัติตามเงื่อนไขที่กำหนดเรียบร้อยแล้ว!');
    };

    // 🟢 Helper
    const getExcelColLetter = (colIdx: number) => {
        let letter = "";
        let temp = colIdx;
        while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter;
            temp = Math.floor(temp / 26) - 1;
        }
        return letter;
    };

    const handleTableClick = (tableId: string) => {
        setActiveTableId(tableId);
        const inputEl = document.getElementById(`input-${tableId}`);
        if (inputEl) {
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputEl.focus();
        }
    };

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-amber-500 font-bold tracking-widest animate-pulse">Initializing Banquet Matrix...</div>;

    const getRoleName = (role: string) => {
        switch (role) {
            case 'admin': return { label: 'ผู้จัดการงาน (Admin)', color: 'bg-purple-900/50 text-purple-400 border-purple-500/50' };
            case 'controller': return { label: 'ควบคุมสื่อ (Controller)', color: 'bg-blue-900/50 text-blue-400 border-blue-500/50' };
            case 'mc': return { label: 'พิธีกร (MC)', color: 'bg-cyan-900/50 text-cyan-400 border-cyan-500/50' };
            case 'registration': return { label: 'จุดลงทะเบียน', color: 'bg-emerald-900/50 text-emerald-400 border-emerald-500/50' };
            // 🌟 เพิ่ม Role ฝ่ายต้อนรับ/ปฏิคม ตรงนี้
            case 'reception': return { label: 'ฝ่ายต้อนรับ (Reception)', color: 'bg-rose-900/50 text-rose-400 border-rose-500/50' };
            default: return { label: role, color: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0f172a] to-[#050505] text-white p-4 flex flex-col font-sans selection:bg-amber-500/30">

            {/* 🌟 Luxury Header */}
            <div className="bg-black/60 backdrop-blur-2xl p-4 md:p-5 rounded-3xl border border-white/10 mb-5 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sticky top-4 z-40">
                <div className="flex items-center gap-3">
                    <img src="/niivaasmartevent_logo.png" alt="NiiVaa" className="h-8 md:h-10 object-contain shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
                    <div>
                        <h1 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500 flex items-center gap-2 tracking-tight">
                            <Sparkles size={20} className="text-amber-400" /> Matrix Banquet Planner
                        </h1>
                        <p className="text-[10px] md:text-sm text-zinc-400 mt-0.5 font-medium truncate max-w-[250px] sm:max-w-md">Project: <span className="text-zinc-200">{eventName}</span></p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                    {/* 📝 ปุ่ม: ลงทะเบียนผู้ร่วมงาน (สีเขียว/Emerald) */}
                    <a
                        href={`/eventdashboard/attendees?event_id=${eventId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-emerald-950/40 hover:bg-emerald-700/60 border border-emerald-600/50 text-emerald-400 hover:text-white font-bold text-sm px-5 py-3 rounded-xl transition-all w-max cursor-pointer shrink-0"
                    >
                        <UserPlus className="w-5 h-5 shrink-0" />
                        <span className="whitespace-nowrap">ลงทะเบียนผู้ร่วมงาน</span>
                    </a>
                    <Link href={`/events/event-dashboard/${eventId}`} className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900/80 hover:bg-teal-900/40 text-zinc-400 hover:text-teal-400 rounded-2xl transition-all border border-white/5 hover:border-teal-500/50 flex-1 xl:flex-none">
                        <LayoutGrid className="w-4 h-4 group-hover:scale-110 transition-transform" /> <span className="text-xs font-bold">ศูนย์กลาง</span>
                    </Link>
                    <Link href={`/eventdashboard/venue/builder?event_id=${eventId}`} className="group flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900/80 hover:bg-blue-900/40 text-zinc-400 hover:text-blue-400 rounded-2xl transition-all border border-white/5 hover:border-blue-500/50 flex-1 xl:flex-none">
                        <PenTool className="w-4 h-4 group-hover:scale-110 transition-transform" /> <span className="text-xs font-bold">วาดผังอิสระ</span>
                    </Link>
                    <button onClick={handleSaveLayout} disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex-1 xl:flex-none xl:ml-2">
                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                        <span className="text-xs">{saving ? 'Saving...' : 'บันทึกผังรวม'}</span>
                    </button>
                    {/* 🟢 ตัวอย่างการวางปุ่มเปิดคู่มือ ไว้มุมขวาบนของ Header */}
                    {/* 🟢 ปุ่มเปิดคู่มือ (Slide-over Drawer) */}

                    <button
                        onClick={() => setIsManualOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 font-bold transition-all shadow-inner"
                    >
                        <BookOpen size={16} />
                        <span className="hidden sm:inline">คู่มือ</span>
                    </button>

                    <div className="flex justify-between items-center mb-6">
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-5 flex-1">

                {/* 1️⃣ แผงตั้งค่าโครงสร้าง (Left) */}
                <div className="w-full lg:w-72 shrink-0 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 overflow-auto max-h-[calc(100vh-140px)] custom-scrollbar flex flex-col gap-6 shadow-inner">
                    <div className="space-y-4">
                        <h3 className="font-black text-amber-400 text-sm flex items-center gap-2 uppercase tracking-widest"><Settings2 size={16} /> Venue Setup</h3>
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">ชื่อห้อง / สถานที่</label>
                            <input type="text" value={mealInfo.room_name} onChange={(e) => setMealInfo({ ...mealInfo, room_name: e.target.value })} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-2.5 text-sm text-white font-medium outline-none focus:border-amber-500 transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">มื้ออาหาร</label>
                                <input type="text" value={mealInfo.meal_name} onChange={(e) => setMealInfo({ ...mealInfo, meal_name: e.target.value })} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-2.5 text-sm text-white font-medium outline-none focus:border-amber-500 transition-colors" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">ความจุ (คน/โต๊ะ)</label>
                                <input type="number" min="1" value={mealInfo.seats_per_table} onChange={(e) => setMealInfo({ ...mealInfo, seats_per_table: parseInt(e.target.value) || 8 })} className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-center text-sm text-amber-400 font-black outline-none focus:border-amber-400 transition-colors" />
                            </div>
                        </div>
                        {/* =========================================
                    📊 สถิติเป้าหมาย (Ultra-Compact)
                    ========================================= */}
                        <div className="bg-zinc-900/60 p-3 rounded-xl border border-white/5 space-y-2 w-full overflow-hidden shrink-0">
                            {/* 1. ยอดลงทะเบียน */}
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-zinc-400">จำนวนลงทะเบียน</span>
                                <span className="text-sm font-black text-white">{attendees.length}</span>
                            </div>

                            {/* 2. ยอดจัดเลี้ยงจริง */}
                            <div className="flex justify-between items-center">
                                <span className="text-[11px] font-bold text-emerald-400">จำนวนจัดเลี้ยงจริง</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={mealInfo.expected_attendees || ''}
                                    onChange={(e) => handleUpdateExpectedAttendees(parseInt(e.target.value) || 0)}
                                    className="w-16 bg-black border border-emerald-500/30 rounded-md py-0.5 px-1 text-right text-sm font-black text-emerald-400 outline-none focus:border-emerald-500"
                                    placeholder="0"
                                />
                            </div>

                            {/* คำนวณโต๊ะเป้าหมาย (เล็กพิเศษ) */}
                            {(mealInfo.expected_attendees || 0) > 0 && (
                                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-zinc-500">เป้าหมายโต๊ะ</span>
                                    <span className="font-black text-amber-400">
                                        {Math.ceil((mealInfo.expected_attendees || 0) / mealInfo.seats_per_table)} โต๊ะ
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>

                    <h3 className="font-black text-cyan-400 text-sm flex items-center gap-2 uppercase tracking-widest"><LayoutGrid size={16} /> Zone Builder</h3>
                    <div className="space-y-4">
                        {zones.map((zone) => (
                            <div key={zone.id} className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl space-y-3 relative group hover:border-cyan-500/30 transition-colors">
                                {zones.length > 1 && (
                                    <button onClick={() => setZones(zones.filter(z => z.id !== zone.id))} className="absolute top-3 right-3 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1.5 rounded-lg"><Trash2 size={12} /></button>
                                )}
                                <input type="text" value={zone.name} onChange={(e) => setZones(zones.map(z => z.id === zone.id ? { ...z, name: e.target.value } : z))} className="bg-transparent border-none outline-none text-sm font-black text-cyan-300 w-[85%] placeholder-zinc-700" placeholder="ชื่อโซน..." />

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase">คอลัมน์ (X)</label>
                                        <input type="number" min="1" value={zone.cols} onChange={(e) => setZones(zones.map(z => z.id === zone.id ? { ...z, cols: parseInt(e.target.value) || 1 } : z))} className="w-full bg-black/50 border border-white/5 rounded-xl p-2 text-center text-xs text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase">แถว (Y)</label>
                                        <input type="number" min="1" value={zone.rows} onChange={(e) => setZones(zones.map(z => z.id === zone.id ? { ...z, rows: parseInt(e.target.value) || 1 } : z))} className="w-full bg-black/50 border border-white/5 rounded-xl p-2 text-center text-xs text-white outline-none focus:border-cyan-500/50 transition-colors" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3 mt-1">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-zinc-500 font-bold flex items-center gap-1 uppercase"><ArrowRightToLine size={10} /> ทางเดินตั้ง</label>
                                        <input type="number" min="0" value={zone.walkway_col} onChange={(e) => setZones(zones.map(z => z.id === zone.id ? { ...z, walkway_col: parseInt(e.target.value) || 0 } : z))} className="w-full bg-black/50 border border-white/5 rounded-xl p-2 text-center text-xs text-zinc-400 outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-zinc-500 font-bold flex items-center gap-1 uppercase"><ArrowDownToLine size={10} /> ทางเดินนอน</label>
                                        <input type="number" min="0" value={zone.walkway_row} onChange={(e) => setZones(zones.map(z => z.id === zone.id ? { ...z, walkway_row: parseInt(e.target.value) || 0 } : z))} className="w-full bg-black/50 border border-white/5 rounded-xl p-2 text-center text-xs text-zinc-400 outline-none" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setZones([...zones, { id: crypto.randomUUID(), name: `Zone ${zones.length + 1}`, rows: 2, cols: 4, walkway_col: 0, walkway_row: 0 }])} className="w-full py-3 bg-cyan-950/20 border border-dashed border-cyan-900/50 hover:border-cyan-500/50 rounded-2xl text-xs font-bold text-cyan-500 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> Add New Zone
                    </button>
                </div>

                {/* 2️⃣ พื้นที่วาดผังโต๊ะรวม (Center Bird's-eye View) */}
                <div className="flex-1 min-w-0 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl overflow-auto max-h-[calc(100vh-140px)] custom-scrollbar relative shadow-inner">

                    {/* 🟢 เลเยอร์ช่วยแก้ปัญหาขอบซ้ายแหว่ง (w-fit min-w-full) */}
                    <div className="w-fit min-w-full p-8 flex flex-col items-center min-h-full">

                        <div className="w-[70%] min-w-[300px] h-10 bg-gradient-to-b from-zinc-800 to-[#0a0a0a] rounded-b-3xl border-b-2 border-amber-500/50 flex items-center justify-center mb-12 shadow-[0_15px_30px_rgba(0,0,0,0.8)] relative shrink-0">
                            <span className="text-[10px] font-black text-zinc-400 tracking-[0.3em] uppercase">Stage Area</span>
                            <div className="absolute -bottom-8 w-24 h-4 bg-amber-500/20 blur-xl rounded-full"></div>
                        </div>

                        {zones.map((zone) => {
                            const zoneTables = tables.filter(t => t.zone_id === zone.id);
                            if (zoneTables.length === 0) return null;

                            return (
                                <div key={zone.id} className="relative mb-16 p-8 rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.02] shrink-0">
                                    <div className="absolute -top-4 left-8 bg-[#0a0a0a] px-4 py-1 border border-white/10 rounded-full text-[10px] font-black text-cyan-400 uppercase tracking-widest shadow-lg">
                                        {zone.name}
                                    </div>
                                    <div className="flex flex-col items-center min-w-max">
                                        {Array.from({ length: zone.rows }).map((_, r) => (
                                            <div key={r} className={`flex justify-center ${r === zone.walkway_row && zone.walkway_row > 0 ? 'mb-16' : 'mb-5'}`}>
                                                {Array.from({ length: zone.cols }).map((_, c) => {
                                                    const table = zoneTables.find(t => t.row === r && t.col === c);
                                                    if (!table) return null;
                                                    const isActive = activeTableId === table.id;
                                                    const isPinned = table.is_pinned;
                                                    const seatedCount = table.seated_names?.length || 0;
                                                    const isFull = seatedCount >= mealInfo.seats_per_table;
                                                    const isPartial = seatedCount > 0 && !isFull;
                                                    const hasGroup = !!table.group_name || seatedCount > 0;

                                                    let bgClass = "bg-[#0f0f0f] border-zinc-800 text-zinc-600 hover:border-zinc-600";
                                                    if (isActive) bgClass = "bg-amber-500 border-white text-white shadow-[0_0_20px_rgba(245,158,11,0.6)] scale-110 z-20";
                                                    else if (isPinned) bgClass = "bg-purple-950/80 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]";
                                                    else if (isFull) bgClass = "bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-md";
                                                    else if (isPartial) bgClass = "bg-blue-950/80 border-blue-500 border-dashed text-blue-400";
                                                    else if (hasGroup) bgClass = "bg-zinc-800 border-zinc-500 text-zinc-400";

                                                    return (
                                                        <div
                                                            key={c} onClick={() => handleTableClick(table.id)}
                                                            className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-[2px] flex flex-col items-center justify-center transition-all cursor-pointer ${bgClass} ${c === zone.walkway_col && zone.walkway_col > 0 ? 'mr-16' : 'mr-5'}`}
                                                        >
                                                            <span className="font-black text-sm sm:text-base font-mono">{table.table_number}</span>
                                                            <span className="text-[8px] text-white/40 tracking-wider font-medium">{getExcelColLetter(c)}{r + 1}</span>
                                                            {hasGroup && !isActive && (
                                                                <div className="absolute -bottom-6 w-max max-w-[180%] text-center text-[9px] font-bold text-zinc-300 bg-black/90 border border-white/10 px-2 py-0.5 rounded-md truncate pointer-events-none shadow-lg">
                                                                    {table.group_name || 'Assigned'}
                                                                </div>
                                                            )}
                                                            {seatedCount > 0 && (
                                                                <span className="text-[9px] font-black bg-black/50 px-1.5 py-0.5 rounded-md mt-0.5 border border-white/10">
                                                                    {seatedCount}/{mealInfo.seats_per_table}
                                                                </span>
                                                            )}
                                                            {isPinned && <div className="absolute -top-1 -right-1 bg-black p-1 rounded-full border border-purple-500/30"><Lock size={10} className="text-purple-400" /></div>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* พื้นที่ดันเนื้อหาให้สุด */}
                        <div className="flex-1"></div>

                        {/* กล่องสรุปจำนวน (วางไว้ล่างสุดของ Scroll เสมอ) */}
                        <div className="sticky bottom-0 mt-8 bg-black/80 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl flex gap-8 text-[11px] font-black tracking-widest uppercase shadow-2xl z-40 shrink-0">
                            <span className="text-zinc-500 flex items-center gap-2"><CheckCircle2 size={14} /> Total Tables: <span className="text-amber-400 text-sm">{tables.length}</span></span>
                            <div className="w-px h-4 bg-white/10 self-center"></div>
                            <span className="text-zinc-500 flex items-center gap-2"><Users size={14} /> Capacity: <span className="text-emerald-400 text-sm">{(tables.length * mealInfo.seats_per_table).toLocaleString()}</span></span>
                        </div>

                    </div>
                </div>

                {/* 3️⃣ แผงจัดการรายชื่อแขกฝั่งขวา Right (Seat Assignment) */}
                <div className="w-full lg:w-72 shrink-0 bg-black/40 backdrop-blur-md border border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-inner max-h-[calc(100vh-140px)]">

                    <div className="p-5 border-b border-white/5 bg-[#0a0a0a]/50 space-y-4">
                        <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center gap-2"><Users size={16} className="text-blue-400" /> Seat Assignment</h3>
                        {/* 👑 ปุ่มเปิดจัดโต๊ะ VIP */}
                        <button
                            onClick={() => {
                                setVipTargetTable('');
                                setSelectedVips([]);
                                setIsVipModalOpen(true);
                            }}
                            className="w-full py-2.5 mb-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-[10px] font-black transition-all shadow-[0_5px_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2"
                        >
                            👑 จัดโต๊ะแขกสำคัญ (VIP / Speaker)
                        </button>
                        <div className="grid grid-cols-2 gap-2">

                            <button onClick={() => handlePrepareAutoAssign('separate')} className="py-2.5 bg-zinc-900 border border-white/5 hover:border-amber-500/50 text-zinc-300 hover:text-amber-400 rounded-xl text-[10px] font-black transition-all">
                                จัดแบบแยกกลุ่ม
                            </button>

                            <button onClick={() => handlePrepareAutoAssign('mixed')} className="py-2.5 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black transition-all shadow-[0_5px_15px_rgba(37,99,235,0.2)]">
                                ผสมผสาน (Network)
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-zinc-700">
                        {zones.map(zone => {
                            const zoneTables = tables.filter(t => t.zone_id === zone.id);
                            if (zoneTables.length === 0) return null;
                            return (
                                <div key={`list-${zone.id}`} className="mb-6">
                                    <div className="text-[10px] font-black text-cyan-500 mb-3 px-2 border-b border-white/5 pb-2 uppercase tracking-widest">{zone.name}</div>
                                    <div className="space-y-1.5">
                                        {zoneTables.map(t => {
                                            const isActive = activeTableId === t.id;
                                            return (
                                                <div key={t.id} className={`flex items-center gap-3 p-2 rounded-xl transition-all border ${isActive ? 'bg-amber-950/30 border-amber-500/30 shadow-lg' : 'border-transparent hover:bg-white/[0.02]'}`}>
                                                    <div className={`w-9 h-9 flex items-center justify-center font-mono font-black text-xs rounded-lg ${isActive ? 'bg-amber-500 text-black' : t.is_pinned ? 'bg-purple-900/40 text-purple-400 border border-purple-500/20' : 'bg-[#0f0f0f] text-zinc-500 border border-white/5'}`}>
                                                        {t.table_number}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            id={`input-${t.id}`} type="text" value={t.group_name}
                                                            onChange={(e) => setTables(tables.map(tbl => tbl.id === t.id ? { ...tbl, group_name: e.target.value } : tbl))}
                                                            onFocus={() => setActiveTableId(t.id)}
                                                            placeholder={`${getExcelColLetter(t.col)}${t.row + 1} - ชื่อกลุ่ม/ระบุ...`}
                                                            className={`w-full bg-transparent border-none outline-none text-xs font-bold ${isActive ? 'text-amber-400 placeholder-amber-700/50' : 'text-zinc-200 placeholder-zinc-700'}`}
                                                        />
                                                    </div>
                                                    {/* ปุ่มล็อคโต๊ะเดิม */}
                                                    <button onClick={() => setTables(tables.map(tbl => tbl.id === t.id ? { ...tbl, is_pinned: !tbl.is_pinned } : tbl))} className={`p-2 rounded-lg transition-colors ${t.is_pinned ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}>
                                                        {t.is_pinned ? <Lock size={14} /> : <Unlock size={14} />}
                                                    </button>

                                                    {/* 🔄 ปุ่มใหม่: จัดการรายชื่อในโต๊ะ */}
                                                    <button
                                                        onClick={() => setManageTableId(t.id)}
                                                        className="p-2 rounded-lg text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-colors ml-1"
                                                        title="จัดการรายชื่อแขกในโต๊ะนี้"
                                                    >
                                                        <Users size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* =========================================
                🎯 POP-UP Modal: ยืนยัน Auto-Assign
                ========================================= */}
            {isAssignModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                        {/* 🟢 ส่วนหัว (เพิ่ม shrink-0 เพื่อป้องกันการถูกบีบ) */}
                        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-6 border-b border-white/5 flex items-start gap-4 shrink-0">
                            <div className="bg-blue-500/20 text-blue-400 p-3.5 rounded-2xl shrink-0 shadow-inner">
                                <Wand2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">ยืนยันการจัดโต๊ะอัตโนมัติ</h3>
                                <p className="text-xs text-blue-400 mt-1 font-bold uppercase tracking-widest">
                                    โหมด: {assignMode === 'separate' ? 'นั่งแยกกลุ่ม (Separate)' : 'ผสมผสาน (Networking)'}
                                </p>
                            </div>
                        </div>

                        {/* 🟢 ส่วนเนื้อหาตรงกลาง (เพิ่ม overflow-y-auto และ custom-scrollbar เพื่อให้ไถเลื่อนได้) */}
                        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                            <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-3">
                                <h4 className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">📌 สรุปยอดเจาะจง (Manual & Pinned)</h4>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-zinc-400">จำนวนโต๊ะที่ใช้งานแล้ว</span>
                                    <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">{assignStats.manualTables} โต๊ะ</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-zinc-400">แขกที่ถูกล็อกที่นั่งแล้ว</span>
                                    <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">{assignStats.manualPeople} คน</span>
                                </div>

                                {/* ⚙️ แผงตั้งค่าพิเศษ */}
                                <div className="bg-zinc-900/80 rounded-2xl p-5 border border-white/10 space-y-4">
                                    <h4 className="text-[10px] font-black text-amber-500 tracking-widest uppercase flex items-center gap-2">
                                        <Settings2 size={14} /> เงื่อนไขพิเศษทางสังคม (Social Context)
                                    </h4>

                                    {/* 1. จัดกลุ่มตามสังกัด */}
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${assignOptions.groupOrg ? 'bg-amber-500 border-amber-500 text-black' : 'bg-black border-white/20 text-transparent group-hover:border-white/40'}`}>
                                            ✓
                                        </div>
                                        <input type="checkbox" className="hidden" checked={assignOptions.groupOrg} onChange={(e) => setAssignOptions({ ...assignOptions, groupOrg: e.target.checked })} />
                                        <div>
                                            <p className="text-sm font-bold text-white">จัดกลุ่มตามสังกัด/องค์กร</p>
                                            <p className="text-[10px] text-zinc-500">พยายามให้คนมาจากหน่วยงานเดียวกัน นั่งโต๊ะเดียวกัน</p>
                                        </div>
                                    </label>

                                    {/* 2. จัดโซนเพศ */}
                                    <div className="space-y-2 pt-2 border-t border-white/5">
                                        <p className="text-xs font-bold text-zinc-400">การจัดโซนตามเพศ (ซ้าย-ขวา ของเวที)</p>
                                        <select
                                            value={assignOptions.genderZoning}
                                            onChange={(e) => setAssignOptions({ ...assignOptions, genderZoning: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-xl p-2.5 text-xs text-white font-bold outline-none focus:border-amber-500 cursor-pointer"
                                        >
                                            <option value="none">อิสระ (ไม่แยกฝั่งชาย-หญิง)</option>
                                            <option value="male-left">ชายอยู่ฝั่งซ้าย - หญิงอยู่ฝั่งขวา</option>
                                            <option value="female-left">หญิงอยู่ฝั่งซ้าย - ชายอยู่ฝั่งขวา</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-950/10 rounded-2xl p-5 border border-blue-500/20 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                                <h4 className="text-[10px] font-black text-blue-500 tracking-widest uppercase">⏳ ยอดรอจัดอัตโนมัติ (Pending Queue)</h4>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-zinc-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div> ฝ่ายเจ้าภาพ (Host)</span>
                                    <span className="text-white">{assignStats.pendingHost} คน</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-zinc-300 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]"></div> ฝ่ายผู้มาเยือน (Visitor)</span>
                                    <span className="text-white">{assignStats.pendingVisitor} คน</span>
                                </div>
                                <div className="pt-3 mt-3 border-t border-blue-500/20 flex justify-between items-center">
                                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">ยอดสุทธิรอจัด</span>
                                    <span className="text-2xl font-black text-blue-400 drop-shadow-md">{assignStats.totalPending} <span className="text-sm">คน</span></span>
                                </div>
                            </div>
                        </div>

                        {/* 🟢 ส่วนปุ่มด้านล่าง (เพิ่ม shrink-0) */}
                        <div className="p-5 border-t border-white/5 flex gap-3 bg-[#050505] shrink-0">
                            <button onClick={() => setIsAssignModalOpen(false)} className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white rounded-xl text-xs font-black transition-all">
                                ยกเลิกทบทวนใหม่
                            </button>
                            <button onClick={executeAutoAssign} className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-[0_5px_20px_rgba(37,99,235,0.3)]">
                                ยืนยันเริ่มจัดที่นั่ง
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* =========================================
          👑 POP-UP: จัดที่นั่งแขกสำคัญ (VIP / Speaker)
          ========================================= */}
            {isVipModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-amber-500/30 rounded-[2rem] w-full max-w-2xl shadow-[0_20px_50px_rgba(245,158,11,0.15)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">

                        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 p-6 border-b border-amber-500/20 flex items-start gap-4 shrink-0">
                            <div className="bg-amber-500/20 text-amber-400 p-3.5 rounded-2xl shrink-0 shadow-inner">👑</div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-amber-500 tracking-tight">จัดโต๊ะแขกสำคัญ (Manual VIP Assign)</h3>
                                <p className="text-xs text-amber-200/60 mt-1 font-bold">เลือกโต๊ะเป้าหมาย และติ๊กเลือกรายชื่อ VIP ลงโต๊ะ</p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                            {/* 🎯 ส่วนเลือกโต๊ะ */}
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">1. เลือกโต๊ะเป้าหมาย</label>
                                <select
                                    value={vipTargetTable}
                                    onChange={(e) => { setVipTargetTable(e.target.value); setSelectedVips([]); }}
                                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-amber-400 font-bold outline-none focus:border-amber-500 cursor-pointer"
                                >
                                    <option value="" disabled>-- คลิกเพื่อเลือกโต๊ะ --</option>
                                    {tables.map(t => {
                                        const available = mealInfo.seats_per_table - (t.seated_names?.length || 0);
                                        if (available <= 0) return null; // ซ่อนโต๊ะที่เต็มแล้ว
                                        return (
                                            <option key={t.id} value={t.id}>
                                                โต๊ะ {t.table_number} {t.group_name ? `(${t.group_name})` : ''} - ว่าง {available} ที่นั่ง
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* 👥 ส่วนเลือกรายชื่อ */}
                            <div className={`transition-opacity ${!vipTargetTable ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                <div className="flex justify-between items-end mb-3">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">2. เลือกรายชื่อ (เลือกได้อีก {seatsAvailable - selectedVips.length} คน)</label>
                                    <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                                        เลือกแล้ว {selectedVips.length} / {seatsAvailable}
                                    </span>
                                </div>

                                {availableVips.length === 0 ? (
                                    <div className="text-center p-8 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-500 font-bold text-sm">
                                        ✅ ไม่มีแขก VIP / Speaker ที่ตกค้างแล้ว
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {availableVips.map(vip => {
                                            const isSelected = selectedVips.includes(vip.id);
                                            const isDisabled = !isSelected && selectedVips.length >= seatsAvailable;

                                            return (
                                                <label
                                                    key={vip.id}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer 
                            ${isSelected ? 'bg-amber-950/40 border-amber-500 shadow-md' : isDisabled ? 'opacity-50 grayscale cursor-not-allowed border-transparent bg-zinc-900/30' : 'border-white/5 bg-zinc-900/50 hover:bg-zinc-800'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isSelected}
                                                        disabled={isDisabled}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedVips([...selectedVips, vip.id]);
                                                            else setSelectedVips(selectedVips.filter(id => id !== vip.id));
                                                        }}
                                                    />
                                                    {/* 🖼️ Placeholder สำหรับ Thumbnail (หากมี URL จริงเปลี่ยน src ได้เลย) */}
                                                    {/* 🖼️ แสดง Thumbnail ถ้ามีรูป ไม่งั้นใช้ Placeholder */}
                                                    {vip.global_profiles?.profile_image_url ? (
                                                        <img
                                                            src={vip.global_profiles.profile_image_url}
                                                            alt={vip.fullname}
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/50 shrink-0 shadow-md bg-zinc-900"
                                                            onError={(e) => {
                                                                e.currentTarget.outerHTML = '<div class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] border border-white/10 shrink-0">👤</div>';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] border border-white/10 shrink-0">
                                                            👤
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-amber-400' : 'text-white'}`}>{vip.fullname}</p>
                                                        <p className="text-[9px] text-zinc-500 uppercase font-black">{vip.attendee_type}</p>
                                                    </div>
                                                    {isSelected && <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-black text-[10px] font-black shrink-0">✓</div>}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-5 border-t border-white/5 flex gap-3 bg-[#050505] shrink-0">
                            <button onClick={() => setIsVipModalOpen(false)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black transition-all">
                                ยกเลิก
                            </button>
                            <button
                                disabled={!vipTargetTable || selectedVips.length === 0}
                                onClick={() => {
                                    // บันทึกรายชื่อลงโต๊ะ
                                    setTables(tables.map(t =>
                                        t.id === vipTargetTable
                                            ? { ...t, seated_names: [...(t.seated_names || []), ...selectedVips], is_pinned: true }
                                            : t
                                    ));
                                    setIsVipModalOpen(false);
                                }}
                                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-black transition-all shadow-lg"
                            >
                                บันทึกลงโต๊ะ และล็อก (Pin)
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* =========================================
          🔄 POP-UP: จัดการรายชื่อในโต๊ะ (Reassign / Remove)
          ========================================= */}
            {manageTableId && activeManageTable && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-blue-500/30 rounded-[2rem] w-full max-w-xl shadow-[0_20px_50px_rgba(59,130,246,0.15)] overflow-hidden animate-in zoom-in-95 duration-200">

                        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-6 border-b border-blue-500/20 flex items-start gap-4 shrink-0">
                            <div className="bg-blue-500/20 text-blue-400 p-3.5 rounded-2xl shrink-0 shadow-inner">
                                <Users size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-blue-400 tracking-tight">จัดการโต๊ะ {activeManageTable.table_number}</h3>
                                <p className="text-xs text-blue-200/60 mt-1 font-bold">ความจุ: {seatedAttendeesInActiveTable.length} / {mealInfo.seats_per_table} ที่นั่ง</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">

                            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-white/5 pb-2">รายชื่อแขกที่นั่งโต๊ะนี้</h4>

                            {seatedAttendeesInActiveTable.length === 0 ? (
                                <div className="text-center p-6 bg-zinc-900/50 rounded-2xl border border-white/5 text-zinc-500 font-bold text-sm">
                                    ยังไม่มีแขกนั่งโต๊ะนี้
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {seatedAttendeesInActiveTable.map(guest => (
                                        <div key={guest.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-white/5 hover:bg-zinc-800 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {guest.global_profiles?.profile_image_url ? (
                                                    <img src={guest.global_profiles.profile_image_url} alt={guest.fullname} className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] border border-white/10 shrink-0">👤</div>
                                                )}
                                                <div>
                                                    <p className="text-xs font-bold text-white">{guest.fullname}</p>
                                                    <p className="text-[9px] text-zinc-500 uppercase font-black">{guest.attendee_type}</p>
                                                </div>
                                            </div>

                                            {/* ปุ่มเตะออก (Remove) */}
                                            <button
                                                onClick={() => {
                                                    setTables(tables.map(t =>
                                                        t.id === activeManageTable.id
                                                            ? { ...t, seated_names: (t.seated_names || []).filter(id => id !== guest.id) }
                                                            : t
                                                    ));
                                                }}
                                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-black transition-colors border border-red-500/20"
                                            >
                                                นำออก
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-white/5 flex gap-3 bg-[#050505]">
                            <button onClick={() => setManageTableId(null)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black transition-all">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* =========================================
                📖 SLIDE-OVER DRAWER: คู่มือการใช้งาน (ปรับปรุงเนื้อหาครอบคลุม)
                ========================================= */}
            {isManualOpen && (
                <div className="fixed inset-0 z-[9999] flex justify-end">
                    {/* ฉากหลังสีดำเบลอ */}
                    <div
                        className="absolute inset-0 bg-black/10 animate-in fade-in duration-200 cursor-pointer"
                        onClick={() => setIsManualOpen(false)}
                    ></div>

                    {/* ตัวแผง Drawer */}
                    <div className="relative w-full max-w-md bg-[#050505] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] h-full flex flex-col animate-in slide-in-from-right duration-300">

                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-zinc-900 to-[#0a0a0a] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><BookOpen size={20} /></div>
                                <div>
                                    <h2 className="text-lg font-black text-white">คู่มือการใช้งาน</h2>
                                    <p className="text-[10px] text-zinc-400 tracking-widest uppercase">Matrix Banquet Planner</p>
                                </div>
                            </div>
                            <button onClick={() => setIsManualOpen(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* เนื้อหาคู่มือ */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">

                            {/* ก่อนเริ่มใช้งาน */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-black text-zinc-300 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <CheckCircle2 size={14} className="text-zinc-400" /> ก่อนเริ่มใช้งาน (Prerequisites)
                                </h3>
                                <ul className="space-y-2 text-xs text-zinc-400 list-disc pl-4">
                                    <li>สร้างโปรเจกต์งานอีเวนต์และกำหนดรายละเอียดพื้นฐานเรียบร้อยแล้ว</li>
                                    <li>นำเข้ารายชื่อผู้เข้าร่วมงาน (Import Attendees) ลงในระบบ โดยควรระบุ <strong>คำนำหน้าชื่อ (Prefix)</strong>, <strong>ประเภทแขก (VIP/General)</strong> และ <strong>สังกัด (Organization)</strong> ให้ครบถ้วน เพื่อให้ระบบวิเคราะห์เพศและจัดกลุ่มได้เต็มประสิทธิภาพ</li>
                                </ul>
                            </section>

                            {/* ขั้นตอนที่ 1 */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <Settings2 size={14} /> ขั้นตอนที่ 1: ตั้งค่าพื้นที่จัดเลี้ยง
                                </h3>
                                <ul className="space-y-2 text-xs text-zinc-400 list-disc pl-4">
                                    <li>ระบุชื่อสถานที่ รูปแบบมื้ออาหาร และกำหนด <strong>ความจุ (คน/โต๊ะ)</strong> ในแผงควบคุมซ้ายมือ</li>
                                    <li>ตัวเลข <strong> จำนวนลงทะเบียน ระบบนำมาจากบัญชีรายชื่อผู้ลงทะเบียนเข้างาน <span className="text-[11px] font-bold text-emerald-400">จำนวนจัดเลี้ยงจริง</span>
                                        ให้ป้อนจำนวนคนที่จะร่วมงานจัดเลี้ยงจริง อาจมากกว่า หรือน้อยกว่าจำนวนลงทะเบียน  เป็นไปตามสภาพจริง </strong> เพื่อเปรียบเทียบกับยอดลงทะเบียน ระบบจะคำนวณ "เป้าหมายจำนวนโต๊ะ" ที่ต้องสร้างเพื่อรองรับแขกทั้งหมดให้อัตโนมัติ</li>
                                </ul>
                            </section>

                            {/* ขั้นตอนที่ 2 */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <Map size={14} /> ขั้นตอนที่ 2: สร้างและวาดผังโซน
                                </h3>
                                <ul className="space-y-2 text-xs text-zinc-400 list-disc pl-4">
                                    <li>สร้างโซนที่นั่งตามความเหมาะสม โดยคลิกเปลี่ยนตัวเลขจำนวน คอลัมน์(x) แถว(y) (เช่น โซน VIP ด้านหน้า, โซนทั่วไป) กำหนดขนาดพื้นที่ด้วยระบบตาราง (Grid Rows x Cols)</li>
                                    <li>ระบุพิกัดทางเดิน (Walkway) เพื่อเว้นระยะห่าง โดยคลิกเปลี่ยนค่าตัวเลข ทางเดินแนวตั้ง ทางเดินแนวนอน จากนั้นกดสร้างโต๊ะลงบนผัง</li>
                                    <li>
                                        ตรวจสอบความถูกต้องจากสีของโต๊ะบนผังตรงกลาง:
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#0f0f0f] border border-zinc-600"></div> ว่าง (Empty)</div>
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-950 border border-blue-500 border-dashed"></div> ไม่เต็ม (Partial)</div>
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-950 border border-emerald-500"></div> เต็ม (Full)</div>
                                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-950 border border-purple-500"></div> ล็อกโต๊ะ (Pinned)</div>
                                        </div>
                                    </li>
                                </ul>
                                <h3 className="text-xs font-black text-emerald-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <Map size={14} /> การลบผังโซน
                                </h3>
                                <ul className="space-y-2 text-xs text-zinc-400 list-disc pl-4">
                                    <li>คลิกที่รูปถังขยะ มุมขวาชื่อโซน </li>
                                </ul>
                            </section>

                            {/* ขั้นตอนที่ 3 */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-black text-amber-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <Users size={14} /> ขั้นตอนที่ 3: จัดที่นั่ง (Seat Assignment)
                                </h3>
                                <ul className="space-y-4 text-xs text-zinc-400 list-disc pl-4">
                                    <li>
                                        <strong className="text-white">จัดแบบเจาะจง (Manual):</strong> คลิกที่โต๊ะบนผังเพื่อเปิดแผงข้อมูลฝั่งขวา ค้นหาและติ๊กเลือกรายชื่อ VIP ลงโต๊ะ พิมพ์ชื่อหน่วยงานหรือชื่อกลุ่มบุคคล จากนั้นกดไอคอนกุญแจ <Lock size={16} className="inline text-purple-400" /> เพื่อ <strong>"ล็อกโต๊ะ"</strong> ป้องกันไม่ให้ระบบสุ่มนำคนอื่นมาแทรก
                                        กล่าวคือจำกัดผู้นั่งร่วมโต๊ะ กรณีโต๊ะนั้นมีคนนั่งยังไม่เต็ม ภายหลังต้องการเพิ่มคนในโต๊ะที่ล็อกแล้ว ให้กดปุ่มรูปกุญแจซ้ำ <Lock size={16} className="inline text-purple-400" /> ให้เป็น <Unlock size={16} className="inline text-purple-400" /> เพื่อปลดล็อก</li>
                                    <li>
                                        <strong className="text-white">ย้ายหรือจัดการที่นั่ง:</strong> คลิกไอคอน <Users size={16} className="inline text-blue-400" /> ที่ด้านขวาสุดของแถวรายชื่อโต๊ะ(ฝั่งขวา) เพื่อเปิดหน้าต่างดูรายชื่อปัจจุบัน และสามารถกด <strong>"นำออก"</strong> เพื่อส่งแขกกลับไปอยู่สถานะรอจัดโต๊ะได้ทันที
                                    </li>
                                    <li>
                                        <strong className="text-white">สุ่มจัดอัตโนมัติ (Auto-Assign):</strong> กดปุ่ม <Wand2 size={10} className="inline text-amber-400" /> เพื่อสุ่มที่นั่งให้แขกที่เหลือ ตั้งค่าให้ระบบจับกลุ่มตามหน่วยงาน หรือแยกโซนซ้าย-ขวาตามเพศได้ตามบริบทงาน
                                        <div className="grid grid-cols-2 gap-2 mt-2 ml-[-1rem]">
                                            <div className="bg-zinc-900 border border-white/10 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-bold text-white mb-0.5">แยกกลุ่ม (Separate)</p>
                                                <p className="text-[8px] text-zinc-500">สังกัดเดียวกันนั่งด้วยกัน</p>
                                            </div>
                                            <div className="bg-zinc-900 border border-white/10 p-2 rounded-lg text-center">
                                                <p className="text-[10px] font-bold text-white mb-0.5">ผสมผสาน (Networking)</p>
                                                <p className="text-[8px] text-zinc-500">คละสังกัดสร้างเครือข่าย</p>
                                            </div>
                                        </div>
                                    </li>
                                </ul>
                            </section>

                            {/* ขั้นตอนต่อไป */}
                            <section className="space-y-3">
                                <h3 className="text-xs font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <ArrowRightCircle size={14} /> กรณีเพิ่มห้องหรือมีกั้นแยกโซน กดปุ่ม + Add New Zone
                                </h3>
                                <h3 className="text-xs font-black text-cyan-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-2">
                                    <ArrowRightCircle size={14} /> ขั้นตอนต่อไป (Next Steps)
                                </h3>
                                <ul className="space-y-2 text-xs text-zinc-400 list-disc pl-4">
                                    <li>ล็อกดาวน์ผังที่นั่งทั้งหมดเมื่อได้รายชื่อที่ลงตัว</li>
                                    <li>เข้าสู่ระบบ <strong>ส่งคำเชิญและตั๋ว (Invitation & Ticketing)</strong> เพื่อสร้าง E-Ticket หรือ QR Code ที่ระบุหมายเลขโต๊ะ (เช่น โซน VIP โต๊ะ V1) ส่งให้แขกแต่ละท่าน</li>
                                    <li>เตรียมระบบสแกน Check-in หน้างาน</li>
                                </ul>
                            </section>

                            {/* คำเตือน */}
                            <section className="mt-8">
                                <div className="bg-red-950/30 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-red-400">อย่าลืมบันทึกข้อมูล!</p>
                                        <p className="text-xs text-red-200/70 mt-1">
                                            การตั้งค่าจัดการโต๊ะและจัดแขกลงนั่งแล้ว ให้คลิกปุ่ม
                                            <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-emerald-600 text-white rounded font-bold text-[9px]">
                                                <Save size={10} /> บันทึกผังที่นั่ง
                                            </span>
                                            ทุกครั้งเพื่อให้ระบบจดจำสถานะล่าสุด
                                        </p>
                                    </div>
                                </div>
                            </section>

                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-white/5 bg-[#050505] shrink-0">
                            <button
                                onClick={() => setIsManualOpen(false)}
                                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl transition-colors"
                            >
                                เข้าใจแล้ว ปิดคู่มือ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function MealPlannerPage() {
    return (
        // 🌟 หุ้มด้วย RouteGuard และอนุญาตให้ admin และ reception เข้าใช้งานได้

        <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-amber-500 font-bold tracking-widest animate-pulse">Initializing Data...</div>}>
            <RouteGuard allowedRoles={['admin', 'reception']}>
                <MealPlannerContent />
            </RouteGuard>
        </Suspense>
    );
}