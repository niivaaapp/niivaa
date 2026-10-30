"use client";

import React, { useEffect, useState, ChangeEvent, useRef, Suspense } from "react";
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
// หากไม่มี PinGuard ให้คอมเมนต์บรรทัดล่างนี้ทิ้งได้ครับ
import PinGuard from '@/components/PinGuard';
import html2canvas from 'html2canvas'; // <-- เพิ่มบรรทัดนี้
import Link from 'next/link';
import { LayoutGrid, LayoutDashboard } from 'lucide-react';

// ==========================================
// [1] ข้อมูลตั้งค่า (Configuration Data)
// ==========================================
const BG_PRESETS = [
    { id: "p1", name: "1. ขาวสะอาด (Clean White)", bg: "#ffffff", color: "#1f2937", accent: "#2563eb", isLinear: true },
    { id: "p2", name: "2. คลาสสิกดอท (Classic Dots)", bg: "radial-gradient(#cbd5e1 1.5px, #ffffff 1.5px)", bgSize: "20px 20px", color: "#1e293b", accent: "#0284c7", isLinear: false },
    { id: "p3", name: "3. กราฟตาราง (Grid Graph)", bg: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", bgSize: "20px 20px", color: "#334155", accent: "#0f766e", isLinear: true },
    { id: "p4", name: "4. เทามินิมอล (Minimal Grey)", bg: "linear-gradient(to bottom right, #f8f9fa, #e9ecef)", color: "#212529", accent: "#495057", isLinear: true },
    { id: "s1", name: "5. แสงรุ่งอรุณ (Center Soft Glow)", bg: "radial-gradient(circle at center, #ffffff 40%, #f1f5f9 100%)", color: "#1e293b", accent: "#0ea5e9", isLinear: false },
    { id: "s2", name: "6. อุ่นจางๆ (Faded Warmth)", bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)", color: "#451a03", accent: "#d97706", isLinear: true },
    { id: "p5", name: "7. พาสเทลฟ้า-ชมพู (Cotton Candy)", bg: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)", color: "#1e3a8a", accent: "#9d174d", isLinear: true },
    { id: "p11", name: "8. เทาดำหรูหรา (Elegant Dark)", bg: "linear-gradient(to bottom, #334155 0%, #0f172a 100%)", color: "#e5e7eb", accent: "#fbbf24", isLinear: true },
    { id: "p12", name: "9. น้ำเงินคอร์ปอเรท (Corporate Deep)", bg: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", color: "#ffffff", accent: "#60a5fa", isLinear: true },
    { id: "p14", name: "10. เอิร์ธโทนทราย (Warm Sand)", bg: "linear-gradient(to right, #d4b895, #eeddbf)", color: "#3e2723", accent: "#5d4037", isLinear: true },
    { id: "p15", name: "15. พาสเทลเขียวมิ้นท์ (Mint Breeze)", bg: "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)", color: "#064e3b", accent: "#047857" },
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
    { id: "p28", name: "28. วงแหวนออโรร่า (Aurora Rings)", bg: "radial-gradient(circle at 50% 0%, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", color: "#4c1d95", accent: "#e11d48" },
    { id: "p29", name: "29. มิ้นท์อ่อน (Soft Mint)", bg: "#d5f4e6", color: "#1f2937", accent: "#0d9488" },
    { id: "p30", name: "30. ฟ้าพาสเทล (Pastel Blue)", bg: "#80ced6", color: "#1f2937", accent: "#0369a1" },
    { id: "p31", name: "31. ครีมวานิลลา (Vanilla Cream)", bg: "#fefbd8", color: "#1f2937", accent: "#d97706" },
    { id: "p32", name: "32. เทาอมเขียว (Teal Gray)", bg: "#618685", color: "#ffffff", accent: "#a5f3fc" },
    { id: "p33", name: "33. เหลืองอ่อน (Soft Yellow)", bg: "#ffef96", color: "#1f2937", accent: "#b45309" },
    { id: "p34", name: "34. ม่วงพลัม (Plum Dark)", bg: "#50394c", color: "#ffffff", accent: "#fbcfe8" },
    { id: "p35", name: "35. เทาเงิน (Silver Gray)", bg: "#b2b2b2", color: "#1f2937", accent: "#475569" },
    { id: "p36", name: "36. พีชอ่อน (Soft Peach)", bg: "#f4e1d2", color: "#1f2937", accent: "#be123c" },

    // --- กลุ่มสีพื้นจากภาพที่ 2[cite: 6] ---
    { id: "p37", name: "37. ฟ้าหม่น (Dusty Blue)", bg: "#a2b9bc", color: "#1f2937", accent: "#1d4ed8" },
    { id: "p38", name: "38. เขียวมะกอก (Dusty Olive)", bg: "#b2ad7f", color: "#1f2937", accent: "#15803d" },
    { id: "p39", name: "39. เทาสเลท (Slate Gray)", bg: "#878f99", color: "#ffffff", accent: "#bae6fd" },
    { id: "p40", name: "40. ม่วงตุ่น (Muted Purple)", bg: "#6b5b95", color: "#ffffff", accent: "#e9d5ff" },
    { id: "p41", name: "41. ส้มมัสตาร์ด (Warm Mustard)", bg: "#feb236", color: "#1f2937", accent: "#9a3412" },
    { id: "p42", name: "42. ชมพูอมแดง (Muted Red)", bg: "#d64161", color: "#ffffff", accent: "#fecdd3" },
    { id: "p43", name: "43. ส้มสดใส (Bright Orange)", bg: "#ff7b25", color: "#ffffff", accent: "#ffedd5" },

    // --- กลุ่มสีพื้นจากภาพที่ 3 (W3.CSS Colors)[cite: 7] ---
    { id: "p44", name: "44. กากี (W3 Khaki)", bg: "#f0e68c", color: "#1f2937", accent: "#854d0e" },
    { id: "p45", name: "45. เหลือง (W3 Yellow)", bg: "#ffeb3b", color: "#1f2937", accent: "#a16207" },
    { id: "p46", name: "46. เหลืองอำพัน (W3 Amber)", bg: "#ffc107", color: "#1f2937", accent: "#9a3412" },
    { id: "p47", name: "47. ส้ม (W3 Orange)", bg: "#ff9800", color: "#1f2937", accent: "#7c2d12" },
    { id: "p48", name: "48. ส้มเข้ม (W3 Deep Orange)", bg: "#ff5722", color: "#ffffff", accent: "#ffedd5" },
    { id: "p49", name: "49. ฟ้าน้ำเงินเทา (W3 Blue Gray)", bg: "#607d8b", color: "#ffffff", accent: "#e0f2fe" },
    { id: "p50", name: "50. น้ำตาล (W3 Brown)", bg: "#795548", color: "#ffffff", accent: "#ffedd5" }
];

const DECORATIONS = [
    { id: "none", name: "ไม่มีลวดลาย (None)" },
    { id: "stationary", name: "เครื่องเขียน (Stationary)", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.05'%3E%3Cpath d='M20 20 h40 v60 h-40 z' fill='none' stroke='%23000' stroke-width='4'/%3E%3Cline x1='28' y1='35' x2='52' y2='35' stroke='%23000' stroke-width='3'/%3E%3Cline x1='28' y1='50' x2='52' y2='50' stroke='%23000' stroke-width='3'/%3E%3Cpath d='M75 25 L85 35 L70 80 L60 70 Z' fill='none' stroke='%23000' stroke-width='3'/%3E%3C/svg%3E\")" },
    { id: "financial", name: "การเงิน/สถิติ (Financial)", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.06'%3E%3Crect x='10' y='60' width='15' height='30' fill='%23000'/%3E%3Crect x='40' y='40' width='15' height='50' fill='%23000'/%3E%3Crect x='70' y='20' width='15' height='70' fill='%23000'/%3E%3Cpath d='M 17 55 L 47 30 L 77 10' fill='none' stroke='%23000' stroke-width='4'/%3E%3C/svg%3E\")" },
    { id: "education", name: "การศึกษา (Education)", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.05'%3E%3Cpath d='M10 40 L50 25 L90 40 L50 55 Z' fill='none' stroke='%23000' stroke-width='4'/%3E%3Cpath d='M25 48 v20 c0 10, 50 10, 50 0 v-20' fill='none' stroke='%23000' stroke-width='4'/%3E%3Cline x1='90' y1='40' x2='90' y2='70' stroke='%23000' stroke-width='3'/%3E%3C/svg%3E\")" },
    { id: "technology", name: "เทคโนโลยี (Technology)", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' opacity='0.05'%3E%3Ccircle cx='20' cy='50' r='8' fill='%23000'/%3E%3Ccircle cx='80' cy='30' r='8' fill='%23000'/%3E%3Ccircle cx='70' cy='80' r='8' fill='%23000'/%3E%3Cpath d='M28 50 L72 32 M28 50 L64 76 M78 37 L72 72' stroke='%23000' stroke-width='3'/%3E%3C/svg%3E\")" },
    { id: "building", name: "อาคาร/องค์กร (Cityscape)", url: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 50' opacity='0.05'%3E%3Crect x='0' y='20' width='20' height='30' fill='%23000'/%3E%3Crect x='22' y='10' width='15' height='40' fill='%23000'/%3E%3Crect x='40' y='25' width='25' height='25' fill='%23000'/%3E%3Crect x='68' y='5' width='20' height='45' fill='%23000'/%3E%3C/svg%3E\")" },
];

function ArticleContent() {
    // =======================================================
    // 📍 [2] เขต Top Level Hooks (ต้องอยู่บนสุดเสมอ)
    // =======================================================
    const printRef = useRef<HTMLDivElement>(null); // <-- เพิ่มบรรทัดนี้ไว้บนสุด เพื่ออ้างอิงถึงหน้ากระดาษ A4
    // ดึงข้อมูลจาก URL
    const searchParams = useSearchParams();
    const eventId = searchParams.get('event_id');
    const docId = searchParams.get('doc_id');
    const isShared = searchParams.get('shared') === 'true';

    // State ควบคุม UI
    const [isSaving, setIsSaving] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [isPinVerified, setIsPinVerified] = useState(false);

    // State สำหรับข้อมูลฟอร์ม
    const [formData, setFormData] = useState({
        title: "นวัตกรรม AI กับการพัฒนา Web Application",
        author: "สมชาย พัฒนาดี",
        content: "พิมพ์ข้อความที่นี่... \n\nระบบสามารถจัดหน้าเอกสารได้อย่างมีประสิทธิภาพ ช่วยให้นักพัฒนาโฟกัสกับ **Logic ทางธุรกิจ** ได้มากขึ้น",
        layout: "mid-right",
        illusWidth: 90, illusHeight: 60,
        presetId: "p1", lightDir: "default", decorationId: "none",
        customTextColor: "", customAccentColor: "",
        footerText: "รายงานประจำปี 2569",
        showPageNumber: true, pageNumber: 1, pageNumberPosition: "right",
    });

    // State สำหรับเก็บรูปภาพ
    const [authorFile, setAuthorFile] = useState<File | null>(null);
    const [illusFile, setIllusFile] = useState<File | null>(null);
    const [authorImgPreview, setAuthorImgPreview] = useState("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop");
    const [illusImgPreview, setIllusImgPreview] = useState("https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop");

    // โหลดข้อมูลเก่ามาใส่ฟอร์ม (ถ้ามีการแนบ docId เข้ามา)
    useEffect(() => {
        if (docId) {
            const fetchExistingDocument = async () => {
                try {
                    const { data, error } = await supabase.from('documents').select('*').eq('id', docId).single();
                    if (error) throw error;

                    if (data) {
                        setFormData({
                            title: data.title || "",
                            author: data.author || "",
                            content: data.content || "",
                            layout: data.layout || "mid-right",
                            presetId: data.bg_pattern || "p1",
                            decorationId: data.decoration_id || "none",
                            customTextColor: data.custom_text_color || "",
                            customAccentColor: data.custom_accent_color || "",
                            footerText: data.footer_text || "",
                            showPageNumber: data.show_page_number ?? true,
                            pageNumber: data.page_number || 1,
                            pageNumberPosition: data.page_number_position || "right",
                            illusWidth: data.illus_width || 90,
                            illusHeight: data.illus_height || 60,
                            lightDir: data.light_dir || "default",
                        });

                        if (data.author_img_url) setAuthorImgPreview(data.author_img_url);
                        if (data.illustrate_url) setIllusImgPreview(data.illustrate_url);
                    }
                } catch (error) {
                    console.error("Error fetching doc:", error);
                }
            };
            fetchExistingDocument();
        }
    }, [docId]);

    // ==========================================
    // ⛔ สิ้นสุดเขต Hooks
    // ==========================================

    // การคำนวณธีมสี
    const selectedPreset = BG_PRESETS.find(p => p.id === formData.presetId) || BG_PRESETS[0];
    const selectedDecor = DECORATIONS.find(d => d.id === formData.decorationId) || DECORATIONS[0];
    const finalTextColor = formData.customTextColor || selectedPreset.color;
    const finalAccentColor = formData.customAccentColor || selectedPreset.accent;

    const getDynamicBackground = () => {
        let bg = selectedPreset.bg;
        if (formData.lightDir === 'default' || !bg.includes('gradient')) return bg;
        if (selectedPreset.isLinear) {
            const dirMap: Record<string, string> = { 'top-left': 'to bottom right', 'center': 'to bottom', 'bottom-right': 'to top left' };
            return bg.replace(/linear-gradient\([^,]+,/, `linear-gradient(${dirMap[formData.lightDir] || 'to bottom'},`);
        } else {
            const dirMap: Record<string, string> = { 'top-left': 'top left', 'center': 'center', 'bottom-right': 'bottom right' };
            return bg.replace(/radial-gradient\((circle at )?[^,]+,/, `radial-gradient(circle at ${dirMap[formData.lightDir] || 'center'},`);
        }
    };

    // ==========================================
    // [3] Event Handlers 
    // ==========================================
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setFormData((prev) => ({ ...prev, [name]: val }));
    };

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, type: "author" | "illustrate") => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const objectUrl = URL.createObjectURL(file);
            if (type === "author") {
                setAuthorFile(file);
                setAuthorImgPreview(objectUrl);
            } else {
                setIllusFile(file);
                setIllusImgPreview(objectUrl);
            }
        }
    };

    const handleResetColors = () => setFormData(prev => ({ ...prev, customTextColor: "", customAccentColor: "" }));

    const handlePrintPDF = () => window.print();

    // ฟังก์ชันใหม่: แปลงหน้าเว็บเป็นภาพ PNG แล้วดาวน์โหลดทันที
    const handleDownloadPNG = async () => {
        if (!printRef.current) return;

        try {
            // จับภาพกระดาษ A4 (scale 2 เพื่อให้ภาพคมชัด)
            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true, // สำคัญมาก เพื่อให้อ่านรูปจากอินเทอร์เน็ตได้
            });

            const image = canvas.toDataURL("image/png");

            // สั่งดาวน์โหลดไฟล์
            const link = document.createElement("a");
            link.href = image;
            link.download = `Article_${Date.now()}.png`; // นามสกุล .png ชัดเจน
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error generating PNG:", error);
            alert("เกิดข้อผิดพลาดในการสร้างไฟล์รูปภาพ");
        }
    };

    // ==========================================
    // [4] โลจิกบันทึกข้อมูล Database
    // ==========================================
    const uploadImageToSupabase = async (file: File, folderName: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const { error } = await supabase.storage.from('journal-assets').upload(fileName, file);
        if (error) throw error;
        const { data: publicUrlData } = supabase.storage.from('journal-assets').getPublicUrl(fileName);
        return publicUrlData.publicUrl;
    };

    const handleSave = async () => {
        if (!eventId) return alert("ไม่พบรหัส Event (event_id) ใน URL ระบบไม่สามารถบันทึกข้อมูลได้");
        setIsSaving(true);
        try {
            let finalAuthorImgUrl = authorImgPreview;
            let finalIllusImgUrl = illusImgPreview;

            if (authorFile) finalAuthorImgUrl = await uploadImageToSupabase(authorFile, 'authors');
            if (illusFile) finalIllusImgUrl = await uploadImageToSupabase(illusFile, 'illustrations');

            const insertData = {
                ...(docId ? { id: docId } : {}), // ใส่ id เฉพาะกรณีอัปเดต
                title: formData.title,
                author: formData.author,
                content: formData.content,
                layout: formData.layout,
                bg_pattern: formData.presetId,
                decoration_id: formData.decorationId,
                footer_text: formData.footerText,
                show_page_number: formData.showPageNumber,
                page_number: formData.pageNumber,

                author_img_url: finalAuthorImgUrl?.includes('unsplash') && !authorFile ? null : finalAuthorImgUrl,
                illustrate_url: finalIllusImgUrl?.includes('unsplash') && !illusFile ? null : finalIllusImgUrl,

                event_id: eventId,
                user_id: '00000000-0000-0000-0000-000000000000'
            };

            const { error } = await supabase.from('documents').upsert([insertData]);
            if (error) throw error;
            alert(docId ? "อัปเดตข้อมูลสำเร็จ!" : "บันทึกข้อมูลและอัปโหลดภาพสำเร็จ!");

        } catch (error: any) {
            console.error("Save process failed:", error);
            alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message || "ไม่ทราบสาเหตุ"}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ==========================================
    // [5] ฟังก์ชันจัดเรียงข้อความ (Text Parser)
    // ==========================================
    const parseText = (text: string) => {
        let parsed = text;

        // 1. ตัวหนา: **ข้อความ**
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<span class="txt-bold">$1</span>');
        // 2. ตัวเอียง: //ข้อความ//
        parsed = parsed.replace(/\/\/(.*?)\/\//g, '<span class="txt-italic">$1</span>');
        // 3. ไฮไลต์เรืองแสง: [h]ข้อความ[/h]
        parsed = parsed.replace(/\[h\](.*?)\[\/h\]/g, '<span class="txt-highlight txt-glow">$1</span>');
        // 4. ฟอนต์ใหญ่ขึ้น: ++ข้อความ++
        parsed = parsed.replace(/\+\+(.*?)\+\+/g, '<span class="txt-large">$1</span>');
        // 5. แท็บเว้นวรรคยาว: [tab]
        parsed = parsed.replace(/\[tab\]/g, '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;');

        return parsed;
    };

    const renderContent = () => {
        const paragraphs = formData.content.split("\n").filter(p => p.trim() !== "");
        const midIndex = Math.floor(paragraphs.length / 2);
        const botIndex = paragraphs.length - 1;

        return (
            <div className="content relative z-10 mt-6">
                {paragraphs.map((pText, index) => {
                    const htmlContent = parseText(pText);
                    let imgToInject = null;
                    if (formData.layout !== "none" && formData.layout !== "center-large") {
                        if ((formData.layout.includes("mid") && index === midIndex) || (formData.layout.includes("bot") && index === botIndex)) {
                            imgToInject = (
                                <img src={illusImgPreview} alt="Illustration"
                                    className={`illus-img layout-${formData.layout}`}
                                    style={{ width: `${formData.illusWidth}mm`, height: `${formData.illusHeight}mm` }} />
                            );
                        }
                    }
                    return (
                        <React.Fragment key={index}>
                            {index === 0 && <img src={authorImgPreview} alt="Author" className="author-img" />}
                            {imgToInject}
                            <p dangerouslySetInnerHTML={{ __html: htmlContent }} />
                        </React.Fragment>
                    );
                })}
                {formData.layout === "center-large" && (
                    <img src={illusImgPreview} alt="Illustration" className="illus-img layout-center-large"
                        style={{ width: `${formData.illusWidth * 1.5}mm`, height: `${formData.illusHeight * 1.5}mm` }} />
                )}
            </div>
        );
    };

    const inputClass = "w-full bg-teal-950/40 text-teal-50 placeholder-teal-300/50 border border-teal-700/50 focus:border-teal-400 focus:ring-1 focus:ring-teal-400 p-2.5 rounded-lg font-medium outline-none transition-all";

    // 🚨 PinGuard Check (วางเหนือ UI ปกติ)
    if (isShared && !isPinVerified && eventId) {
        return <PinGuard eventId={eventId} onSuccess={() => setIsPinVerified(true)} />;
    }
    // ฟังก์ชันสั่งพิมพ์ PDF ปกติ

    // ฟังก์ชันแคปเจอร์หน้าจอเป็นรูปภาพ
    const handleDownloadImage = async () => {
        if (!printRef.current) return;

        try {
            // จับภาพหน้ากระดาษ A4
            const canvas = await html2canvas(printRef.current, {
                scale: 2, // ความละเอียด 2 เท่า
                useCORS: true,
                backgroundColor: null,
            });

            // แปลงเป็น JPG และสั่งดาวน์โหลด
            const image = canvas.toDataURL("image/jpeg", 0.9);
            const link = document.createElement("a");
            link.href = image;
            // ตั้งชื่อไฟล์เป็น .jpg ให้อัตโนมัติ!
            link.download = `Article_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error generating image:", error);
            alert("ไม่สามารถสร้างไฟล์รูปภาพได้ ลองเช็คการเชื่อมต่ออินเทอร์เน็ต");
        }
    };
    // ==========================================
    // [6] UI
    // ==========================================
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row font-sans relative overflow-hidden">

            {/* ---------------- ซ้าย: เครื่องมือตั้งค่า ---------------- */}
            <div className="w-full md:w-[420px] xl:w-[450px] p-6 bg-gradient-to-b from-teal-950 via-teal-900 to-slate-900 text-teal-50 shadow-[5px_0_15px_rgba(0,0,0,0.5)] overflow-y-auto h-screen z-20 shrink-0 border-r border-teal-800/50 custom-scrollbar">

                {/* Header พร้อมปุ่ม คู่มือ */}
                <div className="flex items-center justify-between border-b border-teal-700/50 pb-4 mb-6">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        สร้างเอกสาร A4
                    </h2>
                    <Link
                        href={`/events/event-dashboard/${eventId}`}
                        className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#003366]/40 hover:bg-[#003366]/80 text-[#CCFFFF] border border-[#006666]/50 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-md"
                    >
                        <LayoutGrid size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">กลับศูนย์กลาง</span>
                    </Link>
                    <button
                        onClick={() => setIsManualOpen(true)}
                        className="flex items-center gap-1.5 bg-teal-800/50 hover:bg-teal-700/80 text-teal-100 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border border-teal-600/50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        คู่มือ
                    </button>
                </div>
                <Link
                    href={`/events/event-dashboard/${eventId}`}
                    className="group flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-teal-500/10 text-slate-400 hover:text-teal-400 rounded-xl transition-all duration-300 border border-slate-700 hover:border-teal-500/50 shrink-0"
                >
                    <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold">กลับหน้าศูนย์กลาง</span>
                </Link>

                <div className="space-y-6 text-sm pb-10">
                    {/* ข้อมูลทั่วไป */}
                    <div className="space-y-3 p-5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 1. ข้อมูลทั่วไป
                        </h3>
                        <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="หัวข้อเรื่อง" className={inputClass} />
                        <input type="text" name="author" value={formData.author} onChange={handleChange} placeholder="ชื่อผู้เขียน" className={inputClass} />
                    </div>

                    {/* รูปภาพ & ขนาด */}
                    <div className="space-y-4 p-5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> 2. รูปภาพ & ขนาด
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div><label className="text-xs font-semibold text-teal-200 mb-1 block">ภาพผู้เขียน</label><input type="file" onChange={(e) => handleImageUpload(e, "author")} className="w-full text-[11px] text-teal-100 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-teal-600 file:text-white file:cursor-pointer hover:file:bg-teal-500" /></div>
                            <div><label className="text-xs font-semibold text-teal-200 mb-1 block">ภาพประกอบ</label><input type="file" onChange={(e) => handleImageUpload(e, "illustrate")} className="w-full text-[11px] text-teal-100 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-teal-600 file:text-white file:cursor-pointer hover:file:bg-teal-500" /></div>
                        </div>
                        <select name="layout" value={formData.layout} onChange={handleChange} className={`${inputClass} mt-2`}>
                            <option value="none" className="bg-teal-900 text-white">ซ่อนรูปภาพประกอบ</option>
                            <option value="mid-left" className="bg-teal-900 text-white">ภาพประกอบ กลางหน้า-ซ้าย</option>
                            <option value="mid-right" className="bg-teal-900 text-white">ภาพประกอบ กลางหน้า-ขวา</option>
                            <option value="bot-left" className="bg-teal-900 text-white">ภาพประกอบ ท้ายหน้า-ซ้าย</option>
                            <option value="bot-right" className="bg-teal-900 text-white">ภาพประกอบ ท้ายหน้า-ขวา</option>
                            <option value="center-large" className="bg-teal-900 text-white">ภาพประกอบ ขยายกลางล่าง</option>
                        </select>

                        {formData.layout !== "none" && (
                            <div className="pt-4 border-t border-teal-700/50">
                                <label className="block text-sm font-bold mb-2 text-white">ปรับขนาดภาพประกอบ</label>
                                <div className="flex items-center gap-3 mb-2 text-xs">
                                    <span className="w-14 text-teal-200">ความกว้าง</span>
                                    <input type="range" name="illusWidth" min="40" max="150" value={formData.illusWidth} onChange={handleChange} className="flex-1 h-2 bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-400" />
                                    <span className="w-8 text-right font-mono">{formData.illusWidth}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="w-14 text-teal-200">ความสูง</span>
                                    <input type="range" name="illusHeight" min="40" max="150" value={formData.illusHeight} onChange={handleChange} className="flex-1 h-2 bg-teal-800 rounded-lg appearance-none cursor-pointer accent-teal-400" />
                                    <span className="w-8 text-right font-mono">{formData.illusHeight}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ดีไซน์ & แสงเงา */}
                    <div className="space-y-4 p-5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path></svg> 3. ดีไซน์ & แสงเงา
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[11px] font-semibold text-teal-200 mb-2">เลือกโทนสี (Color Preset)</label>

                                {/* กรอบแสดงตัวเลือกสีแบบ Custom Scrollable List */}
                                <div className="w-full bg-slate-900/50 border border-teal-700/50 rounded-lg p-2 h-40 overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-1 gap-1">
                                        {BG_PRESETS.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, presetId: p.id }))}
                                                className={`flex items-center gap-3 w-full p-2 rounded-md transition-all text-left text-[11px] 
            ${formData.presetId === p.id
                                                        ? 'bg-teal-600/30 border border-teal-400 text-white'
                                                        : 'hover:bg-teal-800/30 border border-transparent text-slate-300'
                                                    }`}
                                            >
                                                {/* Thumbnail สี่เหลี่ยมแสดงสี */}
                                                <div
                                                    className="w-6 h-6 rounded-md shadow-sm border border-slate-600 shrink-0"
                                                    style={{ background: p.bg }}
                                                    title={p.name}
                                                ></div>

                                                <span className="truncate">{p.name}</span>

                                                {/* ติ๊กถูกถ้าเลือกตัวนี้อยู่ */}
                                                {formData.presetId === p.id && (
                                                    <svg className="w-4 h-4 text-teal-400 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-teal-200 mb-1">ทิศทางแสง</label>
                                <select name="lightDir" value={formData.lightDir} onChange={handleChange} className={`${inputClass} text-[11px] px-1`}>
                                    <option value="default" className="bg-teal-900 text-white">ค่าเริ่มต้น</option>
                                    <option value="top-left" className="bg-teal-900 text-white">แสงมุมซ้ายบน</option>
                                    <option value="center" className="bg-teal-900 text-white">แสงตรงกลาง</option>
                                    <option value="bottom-right" className="bg-teal-900 text-white">แสงมุมขวาล่าง</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-teal-200 mb-1">สัญลักษณ์ตกแต่งมุม (ลายน้ำ)</label>
                            <select name="decorationId" value={formData.decorationId} onChange={handleChange} className={inputClass}>
                                {DECORATIONS.map(decor => <option key={decor.id} value={decor.id} className="bg-teal-900 text-white">{decor.name}</option>)}
                            </select>
                        </div>

                        <div className="pt-3 border-t border-teal-700/50">
                            <label className="block text-sm font-bold text-white mb-2">ปรับแต่งสีฟอนต์อิสระ</label>
                            <div className="flex items-center justify-between text-xs mb-2">
                                <span className="text-teal-100">สีข้อความ (Text):</span>
                                <input type="color" name="customTextColor" value={finalTextColor} onChange={handleChange} className="w-10 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-teal-100">สีไฮไลต์ (Glow):</span>
                                <input type="color" name="customAccentColor" value={finalAccentColor} onChange={handleChange} className="w-10 h-8 rounded cursor-pointer border-none p-0 bg-transparent" />
                            </div>
                            {(formData.customTextColor || formData.customAccentColor) && (
                                <button onClick={handleResetColors} className="text-xs text-rose-300 hover:text-rose-200 underline mt-2 block w-full text-right transition-colors">คืนค่าสีตาม Preset เดิม</button>
                            )}
                        </div>
                    </div>

                    {/* ข้อความท้ายกระดาษ */}
                    <div className="space-y-3 p-5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg> 4. ข้อความท้ายกระดาษ
                        </h3>
                        <input type="text" name="footerText" value={formData.footerText} onChange={handleChange} className={inputClass} placeholder="เช่น รายงานประจำปี..." />

                        <label className="flex items-center font-bold text-sm mt-4 cursor-pointer text-white">
                            <input type="checkbox" name="showPageNumber" checked={formData.showPageNumber} onChange={handleChange} className="mr-3 w-5 h-5 bg-teal-900 border-teal-600 text-teal-400 rounded focus:ring-0 focus:ring-offset-0" />
                            เปิดแสดงเลขหน้า
                        </label>
                        {formData.showPageNumber && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div><label className="text-xs text-teal-200 mb-1 block">ระบุเลข</label><input type="number" name="pageNumber" value={formData.pageNumber} onChange={handleChange} className={`${inputClass} text-center font-bold`} /></div>
                                <div><label className="text-xs text-teal-200 mb-1 block">ตำแหน่ง</label>
                                    <select name="pageNumberPosition" value={formData.pageNumberPosition} onChange={handleChange} className={inputClass}>
                                        <option value="right" className="bg-teal-900 text-white">ชิดขวา</option>
                                        <option value="left" className="bg-teal-900 text-white">ชิดซ้าย</option>
                                        <option value="center" className="bg-teal-900 text-white">ตรงกลาง</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* เนื้อหา */}
                    <div className="space-y-3 p-5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-lg">
                        <h3 className="font-bold text-lg text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> 5. เนื้อหา
                        </h3>
                        <span className="text-[11px] text-teal-300/80 block mb-2">Tip: ใช้ **หนา**, //เอียง//, [h]สีเน้นเรืองแสง[/h], ++ใหญ่ขึ้น++</span>
                        <textarea name="content" value={formData.content} onChange={handleChange} className={`${inputClass} h-48 resize-y leading-relaxed`} />
                    </div>

                    {/* ปุ่ม Action */}
                    <div className="flex flex-col gap-3 pt-4">
                        <button onClick={handleSave} disabled={isSaving} className={`w-full text-teal-900 p-4 rounded-xl font-bold flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(45,212,191,0.2)] transition-all ${isSaving ? "bg-teal-600 opacity-50" : "bg-teal-400 hover:bg-teal-300 hover:scale-[1.02]"}`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                            {isSaving ? "กำลังอัปโหลดและบันทึก..." : "บันทึกข้อมูลเข้าสู่ระบบ (Save)"}
                        </button>

                        <button onClick={handlePrintPDF} className="w-full bg-slate-800 text-white border border-slate-600 p-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-700 transition-colors">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                            พิมพ์ / บันทึกเป็น PDF
                        </button>
                    </div>

                </div>
            </div>

            {/* ---------------- ขวา: กระดาษ A4 (Live Preview) ---------------- */}
            <div className="flex-1 bg-[#2C3E50] flex justify-center items-start overflow-y-auto p-10 relative">
                <div
                    ref={printRef} /* 🌟 [สำคัญมาก] เพิ่ม printRef ตรงนี้เพื่อให้แคปเจอร์ภาพได้! */
                    className="page-a4 relative overflow-hidden"
                    style={{
                        background: getDynamicBackground(),
                        backgroundSize: selectedPreset.bgSize || "auto",
                        color: finalTextColor,
                        "--accent-color": finalAccentColor,
                        "--glow-color": `${finalAccentColor}50`
                    } as React.CSSProperties}
                >
                    {/* ลายตกแต่ง (Decorations Overlay) */}
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
                        <h1 className="title txt-glow mb-4 text-[26pt] font-bold leading-tight">{formData.title}</h1>
                        <div className="author text-[14pt] font-medium" style={{ color: finalAccentColor }}>โดย: {formData.author}</div>
                    </div>

                    {renderContent()}

                    {/* ลายน้ำตรงกลางล่างสุด POWERED BY NIIVAA.COM */}
                    <div className="absolute bottom-[8mm] left-0 right-0 text-center text-[8pt] font-black tracking-[0.25em] opacity-20 z-0 pointer-events-none uppercase">
                        POWERED BY NIIVAA.COM
                    </div>

                    {/* Footer & เลขหน้า */}
                    <div className="footer-area absolute bottom-[15mm] left-[20mm] right-[20mm] flex justify-between items-end z-10 text-[11pt]">
                        {formData.pageNumberPosition === 'right' ? (
                            <>
                                <div className="footer-text opacity-70 w-3/4">{formData.footerText}</div>
                                {formData.showPageNumber && <div className="page-number font-bold text-[12pt]" style={{ color: finalAccentColor }}>{formData.pageNumber}</div>}
                            </>
                        ) : formData.pageNumberPosition === 'left' ? (
                            <>
                                {formData.showPageNumber && <div className="page-number font-bold text-[12pt]" style={{ color: finalAccentColor }}>{formData.pageNumber}</div>}
                                <div className="footer-text opacity-70 w-3/4 text-right">{formData.footerText}</div>
                            </>
                        ) : (
                            <div className="w-full flex flex-col items-center gap-1">
                                <div className="footer-text opacity-70 text-center">{formData.footerText}</div>
                                {formData.showPageNumber && <div className="page-number font-bold text-[12pt]" style={{ color: finalAccentColor }}>{formData.pageNumber}</div>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ---------------- Slide-over Drawer (คู่มือ) ---------------- */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${isManualOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsManualOpen(false)}
            ></div>
            <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isManualOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-teal-50">
                    <h2 className="text-xl font-black text-teal-900 flex items-center gap-2">คู่มือการใช้งาน</h2>
                    <button onClick={() => setIsManualOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6 text-slate-700 text-sm bg-slate-50 custom-scrollbar">
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-teal-700 mb-2 border-b pb-2">🖼️ 1. การจัดการรูปภาพ (ระบบ Cloud)</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>การเก็บรูปภาพ:</strong> รูปภาพที่ผู้ใช้อัปโหลด จะถูกนำไปเก็บไว้อย่างปลอดภัยบน Cloud Storage</li>
                            <li>ผู้ใช้สามารถใช้สไลเดอร์เพื่อย่อขยายภาพให้ข้อความไหลล้อมรอบ (Text Wrap) ได้อย่างสวยงาม</li>
                        </ul>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-teal-700 mb-2 border-b pb-2">✍️ 2. การตกแต่งเนื้อหา (Text Format)</h4>
                        <p className="mb-2 text-xs text-slate-500">พิมพ์สัญลักษณ์เหล่านี้ครอบข้อความ เพื่อตกแต่งโดยไม่ทำให้หน้าเอกสารเสียทรง:</p>
                        <ul className="bg-slate-50 p-3 rounded-lg space-y-2 font-mono text-xs">
                            <li>พิมพ์ <span className="text-teal-600 font-bold">**ข้อความ**</span> จะได้ <span className="font-bold">ตัวหนา</span></li>
                            <li>พิมพ์ <span className="text-teal-600 font-bold">//ข้อความ//</span> จะได้ <span className="italic">ตัวเอียง</span></li>
                            <li>พิมพ์ <span className="text-teal-600 font-bold">[h]ข้อความ[/h]</span> จะได้ สีไฮไลต์เรืองแสง</li>
                            <li>พิมพ์ <span className="text-teal-600 font-bold">++ข้อความ++</span> จะได้ ขนาดฟอนต์ใหญ่ขึ้น 15%</li>
                            <li>พิมพ์ <span className="text-teal-600 font-bold">[tab]</span> เพื่อเว้นวรรคยาว (ย่อหน้าพิเศษ)</li>
                        </ul>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-teal-700 mb-2 border-b pb-2">🖨️ 3. การพิมพ์ PDF</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>เมื่อกดปุ่มสีดำ เบราว์เซอร์จะเด้งหน้าต่าง Print ขึ้นมา ให้เลือก <strong>Destination เป็น "Save as PDF"</strong> ระบบจะลบแถบเครื่องมือออกและดึงเฉพาะกระดาษ A4 ไปเซฟให้เรียบร้อย</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* ---------------- CSS Styles ---------------- */}
            <style dangerouslySetInnerHTML={{
                __html: `
        /* สไตล์ Scrollbar ของ Sidebar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(45,212,191,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(45,212,191,0.6); }

        /* การตั้งค่าหน้ากระดาษพรีวิวบนเว็บ */
        .page-a4 { 
          width: 210mm; 
          min-height: 297mm; 
          padding: 20mm; 
          box-sizing: border-box; 
          font-family: 'Sarabun', 'Kanit', sans-serif; 
          position: relative; 
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); 
          transition: background 0.5s ease, color 0.5s ease; 

          /* เวทมนตร์ 1: บังคับให้เบราว์เซอร์ปริ้นท์สีพื้นหลังและลวดลายเสมอ */
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* =========================================
           สไตล์การจัดการเนื้อหา (Typography & Format)
           ========================================= */
        .content { 
            font-size: 12pt; 
            line-height: 1.8; 
            text-align: justify; /* กระจายข้อความให้ชิดซ้ายขวา */
        }
        
        /* 🌟 สั่งให้บรรทัดแรกของ 'ทุกย่อหน้า (p)' ย่อหน้าเข้าไป 12mm */
        .content p { 
            margin-bottom: 6mm; 
            text-indent: 12mm; 
        }
        
        /* สไตล์ลูกเล่นตัวอักษรที่เราเขียนใน parseText */
        .txt-bold { font-weight: 700; }
        .txt-italic { font-style: italic; opacity: 0.9; }
        .txt-highlight { color: var(--accent-color); font-weight: 700; }
        .txt-glow { text-shadow: 0 0 12px var(--glow-color), 0 0 24px var(--glow-color); }
        
        /* 🌟 [ใหม่] สไตล์ของข้อความที่ถูกครอบด้วย ++ข้อความ++ ให้ใหญ่ขึ้น 15% */
        .txt-large {
            font-size: 115%;
            font-weight: 600;
            color: var(--accent-color);
        }

        .author-img { float: right; width: 40mm; height: 40mm; object-fit: cover; border-radius: 8px; margin: 0 0 5mm 10mm; border: 2px solid var(--accent-color); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .illus-img { object-fit: cover; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid var(--accent-color); transition: width 0.3s, height 0.3s; }
        
        .layout-mid-left, .layout-bot-left { float: left; margin: 5mm 10mm 5mm 0; }
        .layout-mid-right, .layout-bot-right { float: right; margin: 5mm 0 5mm 10mm; }
        .layout-center-large { display: block; float: none; margin: 15mm auto 0 auto; }

        .content::after { content: ""; clear: both; display: table; }

        /* =======================================================
           เวทมนตร์สำหรับการสั่งพิมพ์ (Print CSS Hacks)
           ======================================================= */
        @media print {
          /* เวทมนตร์ 2: บังคับขอบให้เป็น 0 เพื่อเตะ URL และวันที่ ของ Browser ทิ้งไป */
          @page { 
            size: A4 portrait;
            margin: 0mm !important; 
          }

          body { margin: 0; padding: 0; background: none; }
          
          /* ซ่อน Sidebar ฝั่งซ้าย และ Modal คู่มือ */
          body > div > div:first-child, body > div > div.fixed { display: none !important; }
          
          /* ซ่อนพื้นหลังของหน้าจอ UI */
          .bg-\[\#2C3E50\] { background: none !important; padding: 0 !important; }

          /* จัดทรง A4 ให้พอดีหน้ากระดาษ */
          .page-a4 { 
            box-shadow: none !important; 
            position: absolute; 
            left: 0; 
            top: 0; 
            margin: 0 !important; 
            width: 210mm !important; 
            min-height: 297mm !important; 
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
export default function ArticlePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-cyan-500 font-bold">กำลังโหลดบทความ...</div>}>
            {/* 🌟 ถ้าหน้านี้มี <RouteGuard> ก็ครอบไว้ด้านในนี้เหมือนเดิมครับ */}
            <ArticleContent />
        </Suspense>
    );
}