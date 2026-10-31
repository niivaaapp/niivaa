import { NextResponse } from "next/server"; 
import { GoogleGenerativeAI } from "@google/generative-ai";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ==========================================
// 🧹 ฟังก์ชันสำหรับทำความสะอาด JSON จาก AI โดยเฉพาะ
// ==========================================
function cleanAndParseJSON(rawText: string) {
    try {
        // 1. ตัด ```json และ ``` ออกให้หมด
        let cleanedText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        
        // 2. ดึงเฉพาะส่วนที่เป็น JSON 
        const startIndex = cleanedText.indexOf('{');
        const endIndex = cleanedText.lastIndexOf('}');
        
        if (startIndex === -1 || endIndex === -1) {
             throw new Error("AI ไม่ได้ตอบกลับมาเป็นรูปแบบ JSON");
        }
        cleanedText = cleanedText.substring(startIndex, endIndex + 1);

        // 3. ลบ Trailing Comma (คอมมาที่เกินมาตรงท้าย Array หรือ Object) 
        cleanedText = cleanedText.replace(/,(?=\s*[\]}])/g, '');
        
        // 4. แปลงเป็น JSON Object
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("🔥 JSON Parse Error, Raw Text was:", rawText);
        throw new Error("AI ส่งรูปแบบข้อมูลมาไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
}

export async function POST(req: Request) {
  try {
    const { originalQuestion } = await req.json();

    if (!originalQuestion) {
      return NextResponse.json({ success: false, error: "ไม่มีข้อมูลต้นฉบับ" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      // ปิด responseMimeType ไว้ก่อน เผื่อ AI พยายามครอบ Markdown มาให้
      // generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `
      คุณคือผู้เชี่ยวชาญด้านการวัดผลทางการศึกษา 
      จงสร้าง "ข้อสอบคู่ขนาน" 1 ข้อ จากข้อสอบต้นฉบับ โดยคงจุดประสงค์และความยากเดิม แต่เปลี่ยนสถานการณ์และตัวเลือกใหม่
      
      ข้อบังคับสูงสุด: คุณต้องตอบกลับเป็นโค้ด JSON โครงสร้างนี้เท่านั้น ห้ามมีข้อความอื่นปน (ไม่ต้องมีเครื่องหมาย \`\`\`json นำหน้า)
      และห้ามมีเครื่องหมาย Comma (,) เกินมาในส่วนท้ายของ Array หรือ Object เด็ดขาด:
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

    // 🌟 ใช้ฟังก์ชันที่เราสร้างขึ้นเพื่อทำความสะอาดและแปลง JSON
    const generatedQuestion = cleanAndParseJSON(aiRawText);

    return NextResponse.json({ success: true, data: generatedQuestion });

  } catch (error: any) {
    console.error("🔴 Backend Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" 
    }, { status: 500 });
  }
}