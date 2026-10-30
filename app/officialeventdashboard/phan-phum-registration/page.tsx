"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Users, Mic, Activity, CheckCircle, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import PhanPhumManager from '@/components/events/PhanPhumManager';

export default function PhanPhumRegistrationPage() {
  const supabase = createClient();
  const currentEventId = "e9e3ae75-4efc-43c0-9217-d4a52ab3ed83";

  // --- States สำหรับเก็บข้อมูลสถิติจริง ---
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(false);

  // --- ฟังก์ชันดึงจำนวนหน่วยงานทั้งหมด และ จำนวนที่รายงานตัวแล้ว ---
  const fetchStats = async () => {
    setIsLoadingStats(true);
    setStatsError(false);
    try {
      // 1. ดึงจำนวนหน่วยงานทั้งหมดใน event นี้
      const { count: total, error: totalErr } = await supabase
        .from('event_ceremony_bearers')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', currentEventId);

      if (totalErr) throw totalErr;

      // 2. ดึงจำนวนหน่วยงานที่รายงานตัวแล้ว (status = 'registered')
      const { count: registered, error: regErr } = await supabase
        .from('event_ceremony_bearers')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', currentEventId)
        .eq('status', 'registered');

      if (regErr) throw regErr;

      setTotalCount(total || 0);
      setRegisteredCount(registered || 0);

    } catch (error) {
      console.error('Error fetching bearer stats:', error);
      setStatsError(true);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-12">
      
      {/* ================= HEADER ================= */}
      <header className="bg-gray-900 border-b border-blue-900/50 sticky top-0 z-50 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-20 flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <Link href="/officialeventdashboard/hub" className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-blue-400 rounded-lg transition-colors border border-gray-700 shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-8 w-px bg-gray-800 mx-1 md:mx-2 hidden sm:block"></div>
            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
              ระบบลงทะเบียนและจัดลำดับถวายเครื่องราชสักการะ
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden lg:flex items-center gap-2">
              <Link href="/officialeventdashboard?type=official" className="flex items-center px-4 py-2 bg-gray-950 hover:bg-indigo-900/40 text-indigo-400 rounded-xl text-sm font-bold transition-all border border-gray-800 hover:border-indigo-500/50 shadow-sm">
                <Activity className="w-4 h-4 mr-2" /> ศูนย์ประสานงาน
              </Link>
              <Link href={`/officialeventdashboard/mc-view?eventId=${currentEventId}`} className="flex items-center px-4 py-2 bg-gray-950 hover:bg-purple-900/40 text-purple-400 rounded-xl text-sm font-bold transition-all border border-gray-800 hover:border-purple-500/50 shadow-sm">
                <Mic className="w-4 h-4 mr-2" /> พิธีกรหน้างาน
              </Link>
            </div>
            
            <div className="h-6 md:h-8 w-px bg-gray-800 mx-1 hidden lg:block"></div>
            
            <div className="h-8 w-auto hidden sm:block">
              <Image src="/niivaasmartevent_logo.png" alt="NiiVaa SmartEvent" width={130} height={32} className="h-full object-contain opacity-90 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-6">
        
        {/* ================= SUMMARY BANNER (แสดงทั้งสองตัวเลข) ================= */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
          
          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
            
            {/* 1. จำนวนหน่วยงานทั้งหมดที่แจ้งข้อมูลแล้ว */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30 text-blue-400 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  หน่วยงานในระบบทั้งหมด
                </h3>
                <div className="flex items-baseline gap-1.5">
                  {isLoadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  ) : statsError ? (
                    <span className="text-sm text-red-400">ขัดข้อง</span>
                  ) : (
                    <>
                      <span className="text-2xl md:text-3xl font-black text-white">{totalCount}</span>
                      <span className="text-xs text-gray-500">หน่วยงาน</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-gray-800 hidden sm:block"></div>

            {/* 2. จำนวนที่มา รายงานตัวแล้ว */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-900/30 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400 shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                  รายงานตัวแล้ว
                </h3>
                <div className="flex items-baseline gap-1.5">
                  {isLoadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  ) : statsError ? (
                    <span className="text-sm text-red-400">ขัดข้อง</span>
                  ) : (
                    <>
                      <span className="text-2xl md:text-3xl font-black text-emerald-400">{registeredCount}</span>
                      <span className="text-xs text-gray-500">/ {totalCount} หน่วยงาน</span>
                    </>
                  )}
                </div>
              </div>
            </div>

          </div>
          
          {/* ปุ่มรีเฟรชสถิติ */}
          <button 
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="text-xs text-gray-400 hover:text-blue-400 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg border border-gray-700 transition-colors flex items-center gap-1.5 mt-4 md:mt-0"
          >
            {isLoadingStats ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Activity className="w-3.5 h-3.5"/>}
            รีเฟรชสถิติ
          </button>
        </div>

        {/* ================= PHAN PHUM MANAGER COMPONENT ================= */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-6 shadow-xl min-h-[60vh]">
           <PhanPhumManager eventId={currentEventId} />
        </div>

      </main>
    </div>
  );
}