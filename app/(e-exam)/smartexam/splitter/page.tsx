"use client";

import { useState, useRef, MouseEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, X, LayoutList, MonitorUp, Upload, Scissors, Trash2, Save, Image as ImageIcon, CheckCircle2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase } from '@/lib/supabase';


// ตั้งค่า Worker ของ PDF.js ผ่าน CDN เพื่อไม่ให้เกิด Error ใน Next.js
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface CroppedItem {
    id: string;
    dataUrl: string;
    questionNumber: number;
    score: number;
    optionsCount: number;
}

export default function SmartSplitterPage() {
    const router = useRouter();

    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // 🌟 State สำหรับจัดการ PDF
    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentBox, setCurrentBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

    const [croppedItems, setCroppedItems] = useState<CroppedItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // 🌟 กำหนดรายการตัวเลือกเริ่มต้น
    const LEVELS = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6', 'ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2', 'สอบเข้า ม.1', 'สอบเข้า ม.4', 'สอบเข้าสถาบัน', 'แนวข้อสอบ ก.พ.', 'แนวข้อสอบ ครูผู้ช่วย', 'แนวข้อสอบ พนักงานท้องถิ่น', 'แนวข้อสอบตำรวจ', 'แนวข้อสอบทหาร'];
    const SUBJECTS = ['ภาษาไทย', 'คณิตศาสตร์', 'วิทยาศาสตร์', 'เทคโนโลยี', 'สังคมศึกษา', 'ภาษาอังกฤษ', 'สุขศึกษา', 'พลศึกษา', 'ศิลปศึกษา', 'การงานอาชีพ', 'ฟิสิกส์', 'เคมี', 'ชีววิทยา'];

    const [isGuideOpen, setIsGuideOpen] = useState(false); // 🌟 State ของ Drawer คู่มือ
    // 🌟 State สำหรับเก็บแท็กหมวดหมู่และระดับชั้นของข้อสอบเซ็ตนี้
    const [subjectCategory, setSubjectCategory] = useState('คณิตศาสตร์');
    const [educationLevel, setEducationLevel] = useState('มัธยมศึกษาตอนปลาย');

    // 🌟 ฟังก์ชันแปลงภาพ Base64 เป็นไฟล์ Blob (ไฟล์รูปภาพจริง) เพื่อเตรียมอัปโหลด
    const dataURLtoBlob = (dataurl: string) => {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    // 🌟 ฟังก์ชันจัดการอัปโหลด (รองรับทั้ง Image และ PDF)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            // กรณีเป็นไฟล์ PDF
            setIsPdfLoading(true);
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(pdf);
            setTotalPages(pdf.numPages);
            setCurrentPage(1);
            await renderPdfPageToImage(pdf, 1);
            setIsPdfLoading(false);
        } else if (file.type.startsWith('image/')) {
            // กรณีเป็นไฟล์รูปภาพ
            const reader = new FileReader();
            reader.onload = (event) => {
                setSourceImage(event.target?.result as string);
                setPdfDoc(null); // เคลียร์สถานะ PDF ทิ้ง
            };
            reader.readAsDataURL(file);
        } else {
            alert('กรุณาอัปโหลดไฟล์รูปภาพหรือ PDF เท่านั้นครับ');
        }
    };
    // 🌟 ฟังก์ชันดึงภาพหน้าจอ (Screen Capture)
    const handleScreenCapture = async () => {
        try {
            // 1. ขออนุญาตแชร์หน้าจอจากเบราว์เซอร์
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "window" }
            });

            // 2. สร้างวิดีโอจำลองเพื่ออ่านสตรีมภาพ
            const video = document.createElement('video');
            video.srcObject = stream;

            video.onloadedmetadata = () => {
                video.play();
                // หน่วงเวลาเล็กน้อยเพื่อให้ภาพเฟรมแรกโหลดเสร็จสมบูรณ์
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const capturedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

                        // 🌟 นำภาพที่แคปได้ไปใส่ใน State รูปภาพหลักของหน้า Splitter
                        // (หมายเหตุ: เปลี่ยนคำว่า setMainImage เป็นชื่อ State ที่คุณใช้เก็บรูปภาพในโค้ดปัจจุบันของคุณ)
                        setSourceImage(capturedDataUrl);

                        // หยุดการแชร์หน้าจอทันทีเมื่อได้ภาพแล้ว
                        stream.getTracks().forEach(track => track.stop());
                    }
                }, 500);
            };
        } catch (error) {
            console.error("ยกเลิกการแคปหน้าจอ หรือเกิดข้อผิดพลาด:", error);
        }
    };
    // 🌟 ฟังก์ชันดึงหน้า PDF มาแปลงเป็นรูปภาพ
    const renderPdfPageToImage = async (pdf: any, pageNum: number) => {
        try {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 }); // Scale 2.0 เพื่อให้ภาพชัดเวลาหั่น

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (ctx) {
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                setSourceImage(canvas.toDataURL('image/jpeg', 0.9));
            }
        } catch (error) {
            console.error("Error rendering PDF page:", error);
        }
    };

    // เปลี่ยนหน้า PDF
    const handleNextPage = async () => {
        if (pdfDoc && currentPage < totalPages) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            await renderPdfPageToImage(pdfDoc, nextPage);
        }
    };

    const handlePrevPage = async () => {
        if (pdfDoc && currentPage > 1) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            await renderPdfPageToImage(pdfDoc, prevPage);
        }
    };

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (!imgRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setIsDrawing(true);
        setStartPos({ x, y });
        setCurrentBox({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !imgRef.current) return;
        const rect = imgRef.current.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        setCurrentBox({
            x: Math.min(startPos.x, currentX),
            y: Math.min(startPos.y, currentY),
            w: Math.abs(currentX - startPos.x),
            h: Math.abs(currentY - startPos.y)
        });
    };

    const handleMouseUp = () => {
        setIsDrawing(false);
        if (!currentBox || currentBox.w < 20 || currentBox.h < 20 || !imgRef.current) {
            setCurrentBox(null);
            return;
        }

        const image = imgRef.current;
        const canvas = document.createElement('canvas');

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = currentBox.w * scaleX;
        canvas.height = currentBox.h * scaleY;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(
                image,
                currentBox.x * scaleX,
                currentBox.y * scaleY,
                currentBox.w * scaleX,
                currentBox.h * scaleY,
                0, 0, canvas.width, canvas.height
            );

            const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);

            // 🌟 แก้ไขตรงนี้: ให้ระบบจำค่าของข้อล่าสุด
            setCroppedItems(prev => {
                // เช็คว่ามีข้อก่อนหน้าหรือไม่ ถ้ามีให้จำค่ามาใช้ ถ้าไม่มีให้เริ่มที่ 4 ตัวเลือก / 1 คะแนน
                const lastItem = prev.length > 0 ? prev[prev.length - 1] : null;
                const nextOptionsCount = lastItem ? lastItem.optionsCount : 4;
                const nextScore = lastItem ? lastItem.score : 1;

                return [...prev, {
                    id: Date.now().toString(),
                    dataUrl: croppedDataUrl,
                    questionNumber: prev.length + 1,
                    score: nextScore,
                    optionsCount: nextOptionsCount
                }];
            });
        }
        setCurrentBox(null);
    };

    const handleRemoveItem = (id: string) => {
        setCroppedItems(prev => prev.filter(item => item.id !== id).map((item, idx) => ({ ...item, questionNumber: idx + 1 })));
    };
    // 🌟 เพิ่มฟังก์ชันนี้ สำหรับอัปเดตจำนวนตัวเลือกและคะแนน
    const handleUpdateItem = (id: string, field: keyof CroppedItem, value: any) => {
        setCroppedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const clearSource = () => {
        setSourceImage(null);
        setPdfDoc(null);
        setCurrentPage(1);
        setTotalPages(0);
    };

    // 🌟 ฟังก์ชันหลักสำหรับปุ่ม "นำเข้าข้อสอบ"
    // 🌟 อัปเดตฟังก์ชันบันทึก ให้รองรับการโยนเข้าตะกร้าแล้วไปหน้า Builder
    const handleSaveToDatabase = async (goToBuilder: boolean = false) => {
        if (croppedItems.length === 0) return alert("กรุณาหั่นภาพข้อสอบอย่างน้อย 1 ข้อครับ");
        
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");

            const formattedQuestions = [];

            for (let i = 0; i < croppedItems.length; i++) {
                const item = croppedItems[i];
                const imageBlob = dataURLtoBlob(item.dataUrl);
                const fileName = `cropped_${Date.now()}_${i}.jpg`;
                const filePath = `images/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('exam-assets').upload(filePath, imageBlob);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('exam-assets').getPublicUrl(filePath);
                const imageUrl = publicUrlData.publicUrl;

                const generatedOptions = [];
                const prefix = ["ก", "ข", "ค", "ง", "จ"];
                for (let opt = 1; opt <= item.optionsCount; opt++) {
                    generatedOptions.push({ id: opt.toString(), text: `ตัวเลือก ${prefix[opt - 1]}` });
                }

                formattedQuestions.push({
                    creator_id: user.id,
                    image_url: imageUrl, 
                    question_text: `อิงจากภาพข้อสอบต้นฉบับ`, 
                    question_number: item.questionNumber,
                    display_label: `${item.questionNumber}`, 
                    question_type: item.optionsCount === 0 ? 'short_answer' : 'mcq',
                    options: item.optionsCount > 0 ? generatedOptions : [],
                    correct_answer: item.optionsCount > 0 ? "1" : "-",
                    score: item.score,
                    is_bank_item: true, 
                    education_level: educationLevel,
                    subject_category: subjectCategory
                });
            }

            // 🌟 ใช้ .select() เพื่อให้คืนค่าข้อมูลที่เพิ่ง insert กลับมาด้วย
            const { data: insertedData, error: insertError } = await supabase
                .from('exam_questions')
                .insert(formattedQuestions)
                .select();

            if (insertError) throw insertError;

            // 🌟 ถ้าผู้ใช้กด "บันทึก & นำไปจัดชุด"
            if (goToBuilder && insertedData) {
                // โยนข้อสอบที่เพิ่งสร้างเข้า LocalStorage (ตะกร้า)
                const existingCart = JSON.parse(localStorage.getItem('smart_exam_cart') || '[]');
                const newCart = [...existingCart, ...insertedData];
                localStorage.setItem('smart_exam_cart', JSON.stringify(newCart));
                
                alert(`โยนข้อสอบ ${croppedItems.length} ข้อ เข้าตะกร้าเรียบร้อย กำลังไปหน้าจัดชุดสอบครับ`);
                router.push('/smartexam/builder');
            } else {
                alert(`บันทึกข้อสอบ ${croppedItems.length} ข้อ เข้าสู่คลังเรียบร้อยแล้วครับ!`);
                router.push('/smartexam/bank');
            }

        } catch (error: any) {
            console.error("Save error:", error);
            alert("บันทึกไม่สำเร็จ: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-6 font-sans">
            {/* 🟢 HEADER / NAVBAR */}
            <div className="max-w-7xl mx-auto flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full"><ArrowLeft size={20} /></button>
                    <h1 className="text-xl font-bold flex items-center gap-2"><Scissors className="text-amber-500" /> Smart Image & PDF Splitter</h1>
                </div>
                
                {/* 🌟 จุดที่ 3: ปุ่มเปิดคู่มือ และ ปุ่มบันทึกแบบใหม่ (แยก 2 ทางเลือก) */}
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsGuideOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors" title="คู่มือการใช้งาน">
                        <HelpCircle size={20} />
                    </button>
                    
                    <div className="flex bg-slate-800 rounded-lg overflow-hidden border border-emerald-600/30 shadow-lg shadow-emerald-500/10">
                        <button 
                            onClick={() => handleSaveToDatabase(false)}
                            disabled={isSaving || croppedItems.length === 0}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold text-sm text-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2"
                            title="บันทึกเข้าคลังเก็บไว้ก่อน"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div> : <Save size={16}/>} 
                            บันทึกลงคลัง
                        </button>
                        <div className="w-[1px] bg-emerald-600/30"></div>
                        <button 
                            onClick={() => handleSaveToDatabase(true)}
                            disabled={isSaving || croppedItems.length === 0}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2"
                            title="บันทึกแล้วนำไปจัดเป็นชุดข้อสอบทันที"
                        >
                            {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <LayoutList size={16}/>} 
                            ไปจัดชุดสอบ
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold flex items-center gap-2">
                            <ImageIcon className="text-blue-400" />
                            1. อัปโหลดและลากคลุมโจทย์ทีละข้อ
                        </h2>

                        <button
                            onClick={handleScreenCapture}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900/50 hover:bg-indigo-800 text-sm font-medium rounded-lg border border-indigo-500/30 transition-colors text-indigo-300 hover:text-white"
                        >
                            <MonitorUp size={16} />
                            จับภาพหน้าจอ
                        </button>
                        {!sourceImage && (
                            <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-bold rounded-lg cursor-pointer flex items-center gap-2">
                                <Upload size={16} /> เลือกไฟล์ (Image หรือ PDF)
                                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
                            </label>
                        )}
                    </div>

                    {isPdfLoading && (
                        <div className="text-center py-10 text-amber-500 font-bold animate-pulse">กำลังแปลงไฟล์ PDF...</div>
                    )}

                    {sourceImage && !isPdfLoading ? (
                        <div className="relative border-2 border-dashed border-slate-600 rounded-xl overflow-hidden bg-slate-950 select-none">
                            {pdfDoc && (
                                <div className="absolute top-0 left-0 w-full bg-slate-900/90 backdrop-blur-sm border-b border-white/10 p-2 flex justify-between items-center z-20">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                        <FileText size={14} className="text-red-400" /> PDF Viewer
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button onClick={handlePrevPage} disabled={currentPage === 1} className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronLeft size={18} /></button>
                                        <span className="text-xs font-bold">หน้า {currentPage} / {totalPages}</span>
                                        <button onClick={handleNextPage} disabled={currentPage === totalPages} className="p-1 hover:bg-white/10 rounded disabled:opacity-30"><ChevronRight size={18} /></button>
                                    </div>
                                </div>
                            )}

                            <div
                                className={`relative inline-block cursor-crosshair w-full ${pdfDoc ? 'mt-10' : ''}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <img
                                    ref={imgRef}
                                    src={sourceImage}
                                    alt="Source"
                                    className="w-full h-auto block pointer-events-none"
                                />

                                {currentBox && (
                                    <div
                                        className="absolute border-2 border-red-500 bg-red-500/20 pointer-events-none"
                                        style={{ left: currentBox.x, top: currentBox.y, width: currentBox.w, height: currentBox.h }}
                                    />
                                )}
                            </div>

                            <div className="absolute top-4 right-4 flex gap-2 z-20">
                                <button onClick={clearSource} className={`px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-xs font-bold rounded-lg border border-white/10 shadow-lg backdrop-blur-md ${pdfDoc ? 'mt-10' : ''}`}>
                                    เปลี่ยนไฟล์ใหม่
                                </button>
                            </div>
                        </div>
                    ) : !sourceImage && !isPdfLoading ? (
                        <div className="h-96 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 bg-slate-950/50">
                            <ImageIcon size={48} className="mb-4 opacity-50" />
                            <p>รองรับไฟล์รูปภาพ (.jpg, .png) และไฟล์ .PDF</p>
                        </div>
                    ) : null}
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col max-h-[calc(100vh-120px)]">
                    <h2 className="font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-4"><CheckCircle2 className="text-emerald-400" /> 2. รายการข้อสอบ ({croppedItems.length})</h2>
                    
                    {/* 🌟 จุดที่ 3: ส่วนตั้งค่าแท็กแบบ Input พิมพ์ได้ + เลือกได้ */}
                    {/* 🌟 จุดที่ 3: ส่วนตั้งค่าแท็ก (ปรับปรุงใหม่เป็นแบบ Hybrid: เลือกได้ + พิมพ์เองได้ ชัวร์ 100%) */}
                    <div className="bg-slate-950 border border-white/5 rounded-xl p-3 mb-4 grid grid-cols-2 gap-3 shrink-0">
                        {/* 📚 หมวดหมู่วิชา */}
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold block mb-1">หมวดหมู่วิชา:</label>
                            <div className="space-y-1.5">
                                <select
                                    value={SUBJECTS.includes(subjectCategory) ? subjectCategory : 'custom'}
                                    onChange={(e) => {
                                        if (e.target.value !== 'custom') setSubjectCategory(e.target.value);
                                        else setSubjectCategory(''); // เคลียร์ค่าเพื่อให้โชว์ช่องพิมพ์ใหม่
                                    }}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-cyan-500/50 transition-colors"
                                >
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="custom" className="bg-slate-800 font-bold text-cyan-400">➕ พิมพ์ระบุวิชาเอง...</option>
                                </select>

                                {/* กล่องพิมพ์เอง จะโชว์เมื่อเลือก "พิมพ์ระบุเอง..." หรือค่าที่พิมพ์ไม่ตรงกับในลิสต์ */}
                                {!SUBJECTS.includes(subjectCategory) && (
                                    <input
                                        type="text"
                                        autoFocus
                                        value={subjectCategory}
                                        onChange={(e) => setSubjectCategory(e.target.value)}
                                        placeholder="พิมพ์ชื่อวิชาที่ต้องการ..."
                                        className="w-full bg-slate-800 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 animate-in fade-in slide-in-from-top-1"
                                    />
                                )}
                            </div>
                        </div>

                        {/* 🎓 ระดับชั้น */}
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold block mb-1">ระดับชั้น:</label>
                            <div className="space-y-1.5">
                                <select
                                    value={LEVELS.includes(educationLevel) ? educationLevel : 'custom'}
                                    onChange={(e) => {
                                        if (e.target.value !== 'custom') setEducationLevel(e.target.value);
                                        else setEducationLevel('');
                                    }}
                                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-cyan-500/50 transition-colors"
                                >
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                    <option value="custom" className="bg-slate-800 font-bold text-cyan-400">➕ พิมพ์ระบุระดับชั้นเอง...</option>
                                </select>

                                {!LEVELS.includes(educationLevel) && (
                                    <input
                                        type="text"
                                        autoFocus
                                        value={educationLevel}
                                        onChange={(e) => setEducationLevel(e.target.value)}
                                        placeholder="พิมพ์ระดับชั้นที่ต้องการ..."
                                        className="w-full bg-slate-800 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 animate-in fade-in slide-in-from-top-1"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                        {croppedItems.length === 0 ? (
                            <div className="text-center text-slate-500 py-10 text-sm">
                                ลากเมาส์คลุมโจทย์ในภาพซ้ายมือ<br />เพื่อสร้างข้อสอบ
                            </div>
                        ) : (
                            croppedItems.map((item) => (
                                <div key={item.id} className="bg-slate-950 border border-white/5 rounded-xl p-3 relative group">
                                    <div className="absolute top-2 left-2 bg-amber-500 text-black text-xs font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md z-10">
                                        {item.questionNumber}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors z-10 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    <div className="w-full bg-white rounded-lg overflow-hidden border border-white/10 mb-3 flex items-center justify-center p-2 min-h-[80px]">
                                        <img src={item.dataUrl} alt={`Q${item.questionNumber}`} className="max-w-full max-h-32 object-contain" />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-white/5 px-2 py-1.5 rounded-lg">
                                            <span className="text-[10px] text-gray-500 font-bold">ตัวเลือก:</span>
                                            <select
                                                value={item.optionsCount}
                                                onChange={(e) => handleUpdateItem(item.id, 'optionsCount', Number(e.target.value))}
                                                className="bg-transparent text-xs text-white outline-none w-full"
                                            >
                                                <option value={3} className="bg-slate-900 text-white">3 ตัวเลือก (ก-ค)</option>
                                                <option value={4} className="bg-slate-900 text-white">4 ตัวเลือก (ก-ง)</option>
                                                <option value={5} className="bg-slate-900 text-white">5 ตัวเลือก (ก-จ)</option>
                                                <option value={0} className="bg-slate-900 text-white">เติมคำตอบ</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* 🌟 จุดที่ 4: Slide-over Drawer คู่มือการใช้งาน */}
            <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isGuideOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsGuideOpen(false)}></div>
                
                {/* Drawer Panel */}
                <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl transition-transform duration-300 transform ${isGuideOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                    <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                        <h2 className="font-bold text-lg text-white flex items-center gap-2">
                            <HelpCircle className="text-cyan-400" size={20}/> คู่มือ Smart Splitter
                        </h2>
                        <button onClick={() => setIsGuideOpen(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={16}/>
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-300">
                        <div className="space-y-2">
                            <h3 className="text-cyan-400 font-bold flex items-center gap-2"><Upload size={16}/> 1. นำเข้าข้อสอบ</h3>
                            <p>รองรับการอัปโหลดไฟล์ภาพ (JPG, PNG) หรือไฟล์ PDF ระบบจะแสดงผลบนพื้นที่ทำงานให้ทันที หากเป็น PDF สามารถกดเปลี่ยนหน้าได้</p>
                            <p><strong>💡 ทริค:</strong> ใช้ปุ่ม "จับภาพหน้าจอ" เพื่อแคปโจทย์จากโปรแกรมอื่น (เช่น Word) เข้ามาหั่นได้โดยตรง</p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-amber-400 font-bold flex items-center gap-2"><Scissors size={16}/> 2. ลากหั่นข้อสอบ</h3>
                            <p>ใช้เมาส์ <strong>"คลิกค้างแล้วลากกรอบ"</strong> คลุมข้อสอบทีละข้อบนรูปภาพ ระบบจะตัดภาพนั้นไปเรียงไว้ที่แผงด้านขวาโดยอัตโนมัติ</p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-indigo-400 font-bold flex items-center gap-2"><LayoutList size={16}/> 3. ตั้งค่ารายข้อ</h3>
                            <p>ในแผงด้านขวา คุณสามารถระบุจำนวนตัวเลือก (3-5 ตัวเลือก หรือ เติมคำตอบ) และกำหนดคะแนนได้ ระบบจะจำค่าล่าสุดไปใช้กับข้อถัดไปเพื่อความรวดเร็ว</p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-emerald-400 font-bold flex items-center gap-2"><Save size={16}/> 4. การบันทึกและนำไปใช้</h3>
                            <ul className="list-disc pl-4 space-y-1 text-slate-400">
                                <li><strong>บันทึกลงคลัง:</strong> เก็บข้อสอบเข้า Item Bank อย่างเดียว</li>
                                <li><strong>ไปจัดชุดสอบ:</strong> บันทึกเข้าคลังและโยนเข้าตะกร้า เพื่อนำไปตั้งชื่อชุดข้อสอบ ใส่คำชี้แจง และเรียงข้อในหน้า Builder ทันที</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
}