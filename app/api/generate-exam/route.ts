import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🌟 ตั้งค่า Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ==========================================
// 🧹 ฟังก์ชันสำหรับทำความสะอาด JSON จาก AI โดยเฉพาะ
// ==========================================
function cleanAndParseJSON(rawText: string) {
    try {
        // 1. ตัด ```json และ ``` ออกให้หมด
        let cleanedText = rawText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        
        // 2. ลบ Trailing Comma (คอมมาที่เกินมาตรงท้าย Array หรือ Object) 
        // เช่น [1, 2, 3,] ให้เหลือ [1, 2, 3] หรือ {"a": 1,} ให้เหลือ {"a": 1}
        cleanedText = cleanedText.replace(/,(?=\s*[\]}])/g, '');
        
        // 3. แปลงเป็น JSON Object
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("🔥 JSON Parse Error, Raw Text was:", rawText);
        throw new Error("AI ส่งรูปแบบข้อมูลมาไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
        sourceType, sourceText, imageBase64, 
        level, subject, difficulty, mcqCount, 
        generateParallelSets, questionType 
    } = body;

    // ใช้ Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let promptContext = '';
    let promptInstruction = '';
    const imageParts: any[] = [];

    // ==========================================
    // 🟢 กรณี 1: สร้างจากรูปภาพ (Image)
    // ==========================================
    if (sourceType === 'image' && imageBase64) {
      const matches = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ success: false, error: 'รูปแบบไฟล์รูปภาพไม่ถูกต้อง' }, { status: 400 });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      imageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });

      promptContext = `
        ฉันได้แนบ "ภาพถ่ายข้อสอบวิชา ${subject} ระดับชั้น ${level}" มาให้คุณ 
        หน้าที่ของคุณคือ "แปลงข้อสอบจากในภาพนี้ให้อยู่ในรูปแบบดิจิทัล (Digitize)"
        
        ⚠️ กฎเหล็กที่ห้ามฝ่าฝืน:
        1. สกัดข้อความ คำถาม ตัวเลือก และเฉลย (ถ้ามีรอยกากบาท) จากในรูปภาพ "เท่านั้น"
        2. "ห้าม" คิดเนื้อหาแต่งเติม หรือสร้างข้อสอบเรื่องอื่นขึ้นมาเองเด็ดขาด
        3. ดึงมาให้ได้มากที่สุดเท่าที่เห็นในภาพ (สูงสุด ${mcqCount} ข้อ หากในภาพมีน้อยกว่าก็ให้ดึงมาเท่าที่มี)
        4. รูปแบบข้อสอบเป้าหมาย: ${questionType} (ปรนัย 4 ตัวเลือก / จับคู่ / ถูกผิด)
        5. สร้างคำอธิบาย (explanation) สั้นๆ ว่าทำไมข้อนี้ถึงตอบข้อนี้ อิงจากหลักวิชาการ
      `;
    } 
    // ==========================================
    // 🟢 กรณี 2: สร้างจากข้อความ (Document)
    // ==========================================
    else if (sourceType === 'document' && sourceText) {
      promptContext = `
        จงสร้างข้อสอบจำนวน ${mcqCount} ข้อ จาก "เนื้อหาด้านล่างนี้เท่านั้น":
        ---
        ${sourceText}
        ---
        วิชา: ${subject}, ระดับชั้น: ${level}, ความยาก: ${difficulty}, รูปแบบ: ${questionType}
        ห้ามนำเนื้อหานอกเหนือจากที่ให้ไปมาออกข้อสอบ
      `;
    } 
    // ==========================================
    // 🟢 กรณี 3: สร้างจากหัวข้อ (Scratch)
    // ==========================================
    else {
      promptContext = `
        จงสร้างข้อสอบจำนวน ${mcqCount} ข้อ ในหัวข้อเรื่อง "${sourceText}"
        วิชา: ${subject}, ระดับชั้น: ${level}, ความยาก: ${difficulty}, รูปแบบ: ${questionType}
        คุณสามารถใช้ความรู้ทั้งหมดของคุณในการสร้างโจทย์ที่ท้าทายและตรงตามระดับชั้นได้เลย
      `;
    }

    // ==========================================
    // 📦 โครงสร้าง JSON ที่บังคับให้ AI ตอบกลับมา
    // ==========================================
    promptInstruction = `
      คุณต้องตอบกลับเป็นข้อมูล JSON เท่านั้น ห้ามมีข้อความอื่นปน (ไม่ต้องมีเครื่องหมาย \`\`\`json นำหน้า)
      และห้ามมีเครื่องหมาย Comma (,) เกินมาในส่วนท้ายของ Array หรือ Object เด็ดขาด
      
      โครงสร้าง JSON ที่ต้องการ:
      ${generateParallelSets ? `
      {
        "set_a": [ { "id": 1, "text": "คำถาม...", "type": "${questionType}", "options": [{"id": "ก", "text": "ตัวเลือก"}], "correct": "ก", "explanation": "อธิบาย", "score": 1 } ],
        "set_b": [ { "id": 1, "text": "คำถามชุด B ที่วัดผลเรื่องเดียวกัน...", "type": "${questionType}", "options": [{"id": "ก", "text": "ตัวเลือก"}], "correct": "ก", "explanation": "อธิบาย", "score": 1 } ]
      }
      ` : `
      {
        "questions": [
          { 
            "id": 1, 
            "text": "โจทย์คำถาม...", 
            "type": "${questionType}", 
            "options": [
              {"id": "ก", "text": "ตัวเลือก 1"},
              {"id": "ข", "text": "ตัวเลือก 2"},
              {"id": "ค", "text": "ตัวเลือก 3"},
              {"id": "ง", "text": "ตัวเลือก 4"}
            ], 
            "correct": "ก", 
            "explanation": "อธิบายเหตุผล", 
            "score": 1 
          }
        ]
      }
      `}
    `;

    // 🚀 ส่งคำสั่งและรูปภาพ (ถ้ามี) ไปให้ Gemini AI
    const result = await model.generateContent([promptContext + "\n\n" + promptInstruction, ...imageParts]);
    const responseText = result.response.text();

    // 🌟 ใช้ฟังก์ชันที่เราสร้างขึ้นเพื่อทำความสะอาดและแปลง JSON
    const jsonData = cleanAndParseJSON(responseText);

    return NextResponse.json({ success: true, data: jsonData });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Unknown Error' }, { status: 500 });
  }
}