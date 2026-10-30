"use client";

import React, { useEffect, useState, Suspense } from "react";
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

// ==========================================
// 1. ธีมสี 
// ==========================================
const BG_PRESETS = [
    { id: "p1", bg: "#ffffff", color: "#1f2937", accent: "#2563eb", isLinear: true },
    { id: "p2", bg: "radial-gradient(#cbd5e1 1.5px, #ffffff 1.5px)", bgSize: "20px 20px", color: "#1e293b", accent: "#0284c7", isLinear: false },
    { id: "p3", bg: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", bgSize: "20px 20px", color: "#334155", accent: "#0f766e", isLinear: true },
    { id: "p4", bg: "linear-gradient(to bottom right, #f8f9fa, #e9ecef)", color: "#212529", accent: "#495057", isLinear: true },
    { id: "s1", bg: "radial-gradient(circle at center, #ffffff 40%, #f1f5f9 100%)", color: "#1e293b", accent: "#0ea5e9", isLinear: false },
    { id: "s2", bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)", color: "#451a03", accent: "#d97706", isLinear: true },
    { id: "p5", bg: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", color: "#1e3a8a", accent: "#9d174d", isLinear: true },
    { id: "p6", bg: "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)", color: "#064e3b", accent: "#047857", isLinear: true },
    { id: "p7", bg: "linear-gradient(120deg, #f6d365 0%, #fda085 100%)", color: "#451a03", accent: "#c2410c", isLinear: true },
    { id: "p8", bg: "linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)", color: "#312e81", accent: "#be185d", isLinear: true },
    { id: "p9", bg: "linear-gradient(to top, #accbee 0%, #e7f0fd 100%)", color: "#0c4a6e", accent: "#0284c7", isLinear: true },
    { id: "p10", bg: "linear-gradient(to right, #0f2027, #203a43, #2c5364)", color: "#f1f5f9", accent: "#38bdf8", isLinear: true },
    { id: "p11", bg: "linear-gradient(to bottom, #334155 0%, #0f172a 100%)", color: "#e5e7eb", accent: "#fbbf24", isLinear: true },
    { id: "p12", bg: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", color: "#ffffff", accent: "#60a5fa", isLinear: true },
    { id: "p13", bg: "radial-gradient(circle at center, #333333 0%, #000000 100%)", color: "#d1d5db", accent: "#a78bfa", isLinear: false },
    { id: "p14", bg: "linear-gradient(to right, #d4b895, #eeddbf)", color: "#3e2723", accent: "#5d4037", isLinear: true },
    { id: "p15", bg: "linear-gradient(to bottom, #134e5e, #71b280)", color: "#f0fdf4", accent: "#fde047", isLinear: true },
    { id: "p16", bg: "linear-gradient(to top, #09203f 0%, #537895 100%)", color: "#f8fafc", accent: "#38bdf8", isLinear: true },
    { id: "p17", bg: "linear-gradient(45deg, #ff00cc, #333399)", color: "#ffffff", accent: "#00ffcc", isLinear: true },
    { id: "p18", bg: "radial-gradient(circle at 50% 0%, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", color: "#4c1d95", accent: "#e11d48", isLinear: false },
    { id: "p15", name: "15. พาสเทลเขียวมิ้นท์ (Mint Breeze)", bg: "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)", color: "#064e3b", accent: "#047857", isLinear: true },
    { id: "p16", name: "16. พาสเทลพีช (Peach Sunset)", bg: "linear-gradient(120deg, #f6d365 0%, #fda085 100%)", color: "#451a03", accent: "#c2410c" },
    { id: "p17", name: "17. ม่วงละมุน (Soft Purple)", bg: "linear-gradient(to top, #fbc2eb 0%, #a6c1ee 100%)", color: "#312e81", accent: "#be185d" },
    { id: "p18", name: "18. ท้องฟ้าสว่าง (Clear Sky)", bg: "linear-gradient(to top, #accbee 0%, #e7f0fd 100%)", color: "#0c4a6e", accent: "#0284c7" },
    { id: "p19", name: "19. มิดไนท์บลู (Midnight Blue)", bg: "linear-gradient(to right, #0f2027, #203a43, #2c5364)", color: "#f1f5f9", accent: "#38bdf8" },
    { id: "p20", name: "20. เทาดำหรูหรา (Elegant Dark)", bg: "linear-gradient(to bottom, #434343 0%, #000000 100%)", color: "#e5e7eb", accent: "#fbbf24" },
    { id: "p21", name: "21. น้ำเงินคอร์ปอเรท (Corporate Deep)", bg: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", color: "#ffffff", accent: "#60a5fa" },
    { id: "p22", name: "22. แบล็คโฮล (Black Hole)", bg: "radial-gradient(circle at center, #333333 0%, #000000 100%)", color: "#d1d5db", accent: "#a78bfa" },
    { id: "p23", name: "23. เขียวป่าไม้ (Forest Canopy)", bg: "linear-gradient(to bottom, #134e5e, #71b280)", color: "#f0fdf4", accent: "#fde047" },
    { id: "p24", name: "24. ทะเลลึก (Deep Ocean)", bg: "linear-gradient(to top, #09203f 0%, #537895 100%)", color: "#f8fafc", accent: "#38bdf8" },
    { id: "p25", name: "25. นีออนไซเบอร์ (Cyber Neon)", bg: "linear-gradient(45deg, #ff00cc, #333399)", color: "#ffffff", accent: "#00ffcc" },
    { id: "p26", name: "26. โฮโลแกรม (Holographic)", bg: "linear-gradient(45deg, #85FFBD 0%, #FFFB7D 100%)", color: "#111827", accent: "#db2777" },
    { id: "p27", name: "27. ลายเส้นทแยง (Diagonal Stripes)", bg: "repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)", color: "#1e293b", accent: "#2563eb" },
    { id: "p28", name: "28. วงแหวนออโรร่า (Aurora Rings)", bg: "radial-gradient(circle at 50% 0%, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", color: "#4c1d95", accent: "#e11d48" }
];

const DECORATIONS = [
    { id: "none", url: "" },
    { id: "stationary", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.05'%3E%3Cpath d='M20 20 h40 v60 h-40 z' fill='none' stroke='%23000' stroke-width='4'/%3E%3Cline x1='28' y1='35' x2='52' y2='35' stroke='%23000' stroke-width='3'/%3E%3Cline x1='28' y1='50' x2='52' y2='50' stroke='%23000' stroke-width='3'/%3E%3Cpath d='M75 25 L85 35 L70 80 L60 70 Z' fill='none' stroke='%23000' stroke-width='3'/%3E%3C/svg%3E\")" },
    { id: "financial", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.06'%3E%3Crect x='10' y='60' width='15' height='30' fill='%23000'/%3E%3Crect x='40' y='40' width='15' height='50' fill='%23000'/%3E%3Crect x='70' y='20' width='15' height='70' fill='%23000'/%3E%3Cpath d='M 17 55 L 47 30 L 77 10' fill='none' stroke='%23000' stroke-width='4'/%3E%3C/svg%3E\")" },
    { id: "education", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.05'%3E%3Cpath d='M10 40 L50 25 L90 40 L50 55 Z' fill='none' stroke='%23000' stroke-width='4'/%3E%3Cpath d='M25 48 v20 c0 10, 50 10, 50 0 v-20' fill='none' stroke='%23000' stroke-width='4'/%3E%3Cline x1='90' y1='40' x2='90' y2='70' stroke='%23000' stroke-width='3'/%3E%3C/svg%3E\")" },
    { id: "technology", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.05'%3E%3Ccircle cx='20' cy='50' r='8' fill='%23000'/%3E%3Ccircle cx='80' cy='30' r='8' fill='%23000'/%3E%3Ccircle cx='70' cy='80' r='8' fill='%23000'/%3E%3Cpath d='M28 50 L72 32 M28 50 L64 76 M78 37 L72 72' stroke='%23000' stroke-width='3'/%3E%3C/svg%3E\")" },
    { id: "building", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50' opacity='0.05'%3E%3Crect x='0' y='20' width='20' height='30' fill='%23000'/%3E%3Crect x='22' y='10' width='15' height='40' fill='%23000'/%3E%3Crect x='40' y='25' width='25' height='25' fill='%23000'/%3E%3Crect x='68' y='5' width='20' height='45' fill='%23000'/%3E%3C/svg%3E\")" },
];

function BookViewerContent() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event_id');

    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isManualOpen, setIsManualOpen] = useState(false); // State สำหรับ Slide-over Drawer

    useEffect(() => {
        if (eventId) fetchDocuments();
    }, [eventId]);

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('event_id', eventId)
                .order('page_number', { ascending: true });
            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error("Error fetching docs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const parseText = (text: string) => {
        if (!text) return "";
        let parsed = text;
        // 1. แปลง **ข้อความ** เป็น ตัวหนา
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<span class="txt-bold">$1</span>');

        // 2. แปลง //ข้อความ// เป็น ตัวเอียง (บรรทัดนี้ที่แก้แล้ว)
        parsed = parsed.replace(/\/\/(.*?)\/\//g, '<span class="txt-italic">$1</span>');

        // 3. แปลง [h]ข้อความ[/h] เป็น ตัวไฮไลต์เรืองแสง
        parsed = parsed.replace(/\[h\](.*?)\[\/h\]/g, '<span class="txt-highlight txt-glow">$1</span>');

        return parsed;
    };

    const renderPageContent = (doc: any) => {
        const paragraphs = (doc.content || "").split("\n").filter((p: string) => p.trim() !== "");
        const midIndex = Math.floor(paragraphs.length / 2);
        const botIndex = paragraphs.length - 1;

        const illusWidth = doc.illusWidth || 90;
        const illusHeight = doc.illusHeight || 60;

        return (
            <div className="content relative z-10 mt-6">
                {paragraphs.map((pText: string, index: number) => {
                    const htmlContent = parseText(pText);
                    let imgToInject = null;

                    if (doc.layout !== "none" && doc.layout !== "center-large") {
                        if ((doc.layout.includes("mid") && index === midIndex) ||
                            (doc.layout.includes("bot") && index === botIndex)) {
                            if (doc.illustrate_url) {
                                imgToInject = (
                                    <img src={doc.illustrate_url} alt="Illustration"
                                        className={`illus-img layout-${doc.layout}`}
                                        style={{ width: `${illusWidth}mm`, height: `${illusHeight}mm` }} />
                                );
                            }
                        }
                    }

                    return (
                        <React.Fragment key={index}>
                            {index === 0 && doc.author_img_url && <img src={doc.author_img_url} alt="Author" className="author-img" />}
                            {imgToInject}
                            <p dangerouslySetInnerHTML={{ __html: htmlContent }} />
                        </React.Fragment>
                    );
                })}
                {doc.layout === "center-large" && doc.illustrate_url && (
                    <img src={doc.illustrate_url} alt="Illustration" className="illus-img layout-center-large"
                        style={{ width: `${illusWidth * 1.5}mm`, height: `${illusHeight * 1.5}mm` }} />
                )}
            </div>
        );
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-xl text-slate-500">กำลังโหลดรูปเล่ม...</div>;
    }

    if (documents.length === 0) {
        return <div className="min-h-screen flex items-center justify-center text-xl text-red-500">ไม่พบเอกสารใน Event นี้</div>;
    }

    return (
        <div className="book-viewer-container bg-slate-200 min-h-screen py-10 flex flex-col items-center relative overflow-hidden">

            {/* ส่วนควบคุม (จะถูกซ่อนตอน Print) */}
            <div className="no-print bg-white p-4 rounded-xl shadow-md mb-8 flex gap-4 items-center max-w-4xl w-full justify-between">
                <h2 className="font-bold text-lg text-slate-700">รูปเล่มรายงาน ({documents.length} หน้า)</h2>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsManualOpen(true)}
                        className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition-colors border border-slate-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        คู่มือ
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-700 shadow-md flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        พิมพ์ / บันทึกเป็น PDF ทั้งเล่ม
                    </button>
                </div>
            </div>

            {/* Render หน้ากระดาษแต่ละหน้า */}
            {documents.map((doc, idx) => {
                const selectedPreset = BG_PRESETS.find(p => p.id === doc.bg_pattern) || BG_PRESETS[0];
                const selectedDecor = DECORATIONS.find(d => d.id === doc.decoration_id) || DECORATIONS[0];

                const finalTextColor = doc.customTextColor || selectedPreset.color;
                const finalAccentColor = doc.customAccentColor || selectedPreset.accent;

                return (
                    <div
                        key={doc.id || idx}
                        className="page-a4 relative overflow-hidden mb-10 shadow-2xl"
                        style={{
                            background: selectedPreset.bg,
                            backgroundSize: selectedPreset.bgSize || "auto",
                            color: finalTextColor,
                            "--accent-color": finalAccentColor,
                            "--glow-color": `${finalAccentColor}50`
                        } as React.CSSProperties}
                    >
                        {/* ลายตกแต่ง */}
                        {selectedDecor.id !== "none" && (
                            <div
                                className="absolute inset-0 z-0 pointer-events-none"
                                style={{
                                    backgroundImage: selectedDecor.url,
                                    backgroundPosition: selectedDecor.id === 'building' ? 'bottom center' : 'bottom 10mm left 10mm',
                                    backgroundRepeat: selectedDecor.id === 'building' ? 'repeat-x' : 'no-repeat',
                                    backgroundSize: selectedDecor.id === 'building' ? '200px' : '250px',
                                    filter: selectedPreset.id.startsWith('p10') || selectedPreset.id.startsWith('p11') || selectedPreset.id.startsWith('p12') || selectedPreset.id.startsWith('p13') ? 'invert(1) opacity(0.3)' : 'none',
                                }}
                            />
                        )}

                        <div className="header relative z-10 text-center mb-8">
                            <h1 className="title txt-glow mb-4 text-[26pt] font-bold leading-tight">{doc.title}</h1>
                            <div className="author text-[14pt] font-medium" style={{ color: finalAccentColor }}>โดย: {doc.author}</div>
                        </div>

                        {renderPageContent(doc)}

                        {/* ลายน้ำ */}
                        <div className="absolute bottom-[8mm] left-0 right-0 text-center text-[8pt] font-black tracking-[0.25em] opacity-20 z-0 pointer-events-none uppercase">
                            POWERED BY NIIVAA.COM
                        </div>

                        {/* Footer */}
                        <div className="footer-area absolute bottom-[15mm] left-[20mm] right-[20mm] flex justify-between items-end z-10 text-[11pt]">
                            {doc.show_page_number !== false && (
                                <div className="w-full flex justify-between">
                                    <div className="footer-text opacity-70 w-3/4">{doc.footer_text || ""}</div>
                                    <div className="page-number font-bold text-[12pt]" style={{ color: finalAccentColor }}>{doc.page_number}</div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* ================= Slide-over Drawer (คู่มือการใช้งาน - ธีมสีเข้ม) ================= */}
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-40 transition-opacity duration-300 no-print ${isManualOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsManualOpen(false)}
            ></div>

            {/* Drawer Panel */}
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col no-print border-l border-slate-700 ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
                    <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                        <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        คู่มือการพิมพ์เล่ม
                    </h2>
                    <button onClick={() => setIsManualOpen(false)} className="text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors border border-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Drawer Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-sm bg-slate-900 custom-scrollbar">

                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm">
                        <h4 className="font-bold text-teal-300 mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            หลักการทำงานของหน้านี้
                        </h4>
                        <p className="mb-2 leading-relaxed">หน้านี้คือ <strong>"ตัวรวมเล่ม (Book Compiler)"</strong> ทำหน้าที่ดึงเอกสารของทีมงานทุกคนมาเรียงต่อกันตาม "เลขหน้า" ที่ตั้งไว้ เพื่อเตรียมพิมพ์เป็นเล่มเดียวกัน</p>
                    </div>

                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm">
                        <h4 className="font-bold text-teal-300 mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            การตั้งค่าตอนพิมพ์ PDF
                        </h4>
                        <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                            <li>คลิกปุ่ม <strong>"พิมพ์ / บันทึกเป็น PDF"</strong></li>
                            <li>ในหน้าต่าง Print เลือก Destination (เครื่องพิมพ์) เป็น <strong className="text-white bg-slate-700 px-1 rounded">Save as PDF</strong></li>
                            <li>การตั้งค่า Layout ให้เลือก <strong>Portrait (แนวตั้ง)</strong></li>
                            <li>กระดาษให้เลือก <strong>A4</strong></li>
                            <li><strong className="text-rose-400">สำคัญมาก:</strong> ในส่วน Options หรือ More Settings ต้อง <strong className="underline">เอาเครื่องหมายถูกออก</strong> จากช่อง <span className="text-white bg-slate-700 px-1 rounded">Headers and footers</span> เพื่อไม่ให้ติดวันที่และ URL ลงไปในเอกสาร</li>
                            <li>ต้อง <strong className="underline">ทำเครื่องหมายถูก</strong> ที่ช่อง <span className="text-white bg-slate-700 px-1 rounded">Background graphics</span> เสมอ เพื่อให้สีและภาพพื้นหลังถูกพิมพ์ลงไปด้วย</li>
                        </ul>
                    </div>

                    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700 shadow-sm">
                        <h4 className="font-bold text-teal-300 mb-3 border-b border-slate-600 pb-2 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            หากพบปัญหา
                        </h4>
                        <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                            <li><strong>ลำดับหน้าผิดเพี้ยน:</strong> ให้กลับไปที่หน้า Manager แล้วแก้ไขเลขหน้าของเอกสารแผ่นนั้น</li>
                            <li><strong>หน้าแหว่งหรือตกขอบ:</strong> ตรวจสอบว่าได้เลือกขนาดกระดาษเป็น A4 ในหน้าต่างการตั้งค่าการพิมพ์แล้ว</li>
                        </ul>
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(45,212,191,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(45,212,191,0.6); }

        .page-a4 { width: 210mm; height: 297mm; padding: 20mm; box-sizing: border-box; font-family: 'Sarabun', 'Kanit', sans-serif; position: relative; background-color: #fff; }
        .txt-glow { text-shadow: 0 0 12px var(--glow-color), 0 0 24px var(--glow-color); }
        .txt-highlight { color: var(--accent-color); font-weight: 700; }
        .txt-bold { font-weight: 700; }
        .txt-italic { font-style: italic; opacity: 0.9; }

        .author-img { float: right; width: 40mm; height: 40mm; object-fit: cover; border-radius: 8px; margin: 0 0 5mm 10mm; border: 2px solid var(--accent-color); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .illus-img { object-fit: cover; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid var(--accent-color); }
        
        .layout-mid-left, .layout-bot-left { float: left; margin: 5mm 10mm 5mm 0; }
        .layout-mid-right, .layout-bot-right { float: right; margin: 5mm 0 5mm 10mm; }
        .layout-center-large { display: block; float: none; margin: 15mm auto 0 auto; }

        .content { font-size: 12pt; line-height: 1.8; text-align: justify; }
        .content p { margin-bottom: 6mm; }
        .content::after { content: ""; clear: both; display: table; }

        @media print {
          body { background: none; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .book-viewer-container { background: none; padding: 0; }
          .page-a4 { 
            box-shadow: none; 
            margin: 0; 
            /* หัวใจสำคัญของการรวมเล่ม: บังคับให้กระดาษ 1 แผ่นจบแค่ตรงนี้เวลาปริ้นท์ */
            page-break-after: always; 
          }
        }
        `
            }} />
        </div>
    );
}
// ==========================================
// 🚀 Component หลักที่ Export (เอา Suspense ไว้ด้านนอกสุด)
// ==========================================
export default function BookViewerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดหน้าหนังสือรายงาน...</div>}>
      {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้ได้เลยครับ */}
      <BookViewerContent />
    </Suspense>
  );
}