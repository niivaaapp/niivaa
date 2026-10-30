import { NextResponse } from "next/server"; // 🟢 แก้ไข: ต้องดึงจาก next/server เท่านั้น
import { GoogleGenerativeAI } from "@google/generative-ai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 🟢 แก้ไข: ใช้ GEMINI_API_KEY ให้ตรงกับไฟล์อื่นในโปรเจกต์
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { originalQuestion } = await req.json();

    if (!originalQuestion) {
      return NextResponse.json({ success: false, error: "ไม่มีข้อมูลต้นฉบับ" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      คุณคือผู้เชี่ยวชาญด้านการวัดผลทางการศึกษา 
      จงสร้าง "ข้อสอบคู่ขนาน" 1 ข้อ จากข้อสอบต้นฉบับ โดยคงจุดประสงค์และความยากเดิม แต่เปลี่ยนสถานการณ์และตัวเลือกใหม่
      
      ข้อบังคับสูงสุด: คืนค่าเป็น JSON โครงสร้างนี้เท่านั้น ห้ามมีข้อความอื่นปนเด็ดขาด:
      {
        "question_text": "โจทย์...",
        "options": [
          { "id": "ก", "text": "ตัวเลือก 1" },
          { "id": "ข", "text": "ตัวเลือก 2" },
          { "id": "ค", "text": "ตัวเลือก 3" },
          { "id": "ง", "text": "ตัวเลือก 4" }
        ],
        "correct_answer": "ก",
        "explanation": "อธิบาย..."
      }
    `;

    const prompt = `${systemPrompt}\n\nข้อสอบต้นฉบับ:\n${JSON.stringify(originalQuestion)}`;

    let aiRawText = "";
    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        aiRawText = response.text();
        success = true;
      } catch (aiCallError: any) {
        attempt++;
        console.warn(`[Retry ${attempt}/${maxRetries}] Gemini Error:`, aiCallError.message);
        
        if (aiCallError.message.includes('503') || aiCallError.message.includes('429')) {
          if (attempt >= maxRetries) {
            throw new Error("เซิร์ฟเวอร์ AI หนาแน่นเกินไป กรุณาลองใหม่ภายหลัง");
          }
          await delay(2000 * attempt);
        } else {
          throw aiCallError; 
        }
      }
    }

    // ทำความสะอาดข้อความ JSON
    let cleanText = aiRawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIndex = cleanText.indexOf('{');
    const endIndex = cleanText.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("AI ไม่ได้ตอบกลับมาเป็นรูปแบบ JSON");
    }

    cleanText = cleanText.substring(startIndex, endIndex + 1);
    const generatedQuestion = JSON.parse(cleanText);

    return NextResponse.json({ success: true, data: generatedQuestion });

  } catch (error: any) {
    console.error("🔴 Backend Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" 
    }, { status: 500 });
  }
}