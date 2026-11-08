'use server'

import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI, Type } from '@google/genai';

// 1. ตั้งค่า Gemini Client (ใช้ SDK ตัวใหม่)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 2. กำหนดโครงสร้าง JSON บังคับให้ AI ตอบกลับมาในรูปแบบที่ตายตัว
const batchQuestionSchema = {
    type: Type.ARRAY,
    description: "รายการข้อสอบแบบปรนัย 4 ตัวเลือก",
    items: {
        type: Type.OBJECT,
        properties: {
            question: { 
                type: Type.STRING, 
                description: "โจทย์ข้อสอบ" 
            },
            options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "ตัวเลือก 4 ข้อ (ไม่ต้องใส่ ก. ข. ค. ง. นำหน้า)"
            },
            correctAnswerIndex: { 
                type: Type.INTEGER, 
                description: "Index ของคำตอบที่ถูกต้อง (0, 1, 2, หรือ 3)" 
            },
            explanation: { 
                type: Type.STRING, 
                description: "คำอธิบายเหตุผลของเฉลยข้อนี้อย่างละเอียด" 
            }
        },
        required: ["question", "options", "correctAnswerIndex", "explanation"]
    }
};

export async function generateAndSaveBatchItem(
    topic: string, 
    count: number, 
    config: { subject: string; grade_level: string; difficulty: string; exam_title: string; },
    examCodePrefix: string, // 🌟 เพิ่มพารามิเตอร์ Prefix รหัส
    jobIndex: number        // 🌟 เพิ่มพารามิเตอร์ Index ลำดับ
) {
    try {
        const supabase = await createClient();
        
        // 1. ตรวจสอบสิทธิ์ผู้ใช้งาน (Auth & RLS)
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            throw new Error('กรุณาเข้าสู่ระบบก่อนทำรายการ (Unauthorized)');
        }

        // 2. สั่ง Gemini ออกข้อสอบด้วย Prompt เชิงลึก
        const prompt = `คุณคือผู้เชี่ยวชาญการออกข้อสอบ ${config.subject} ระดับชั้น ${config.grade_level}
        จงสร้างข้อสอบปรนัย 4 ตัวเลือก จำนวน ${count} ข้อ
        
        หัวข้อ/ตัวชี้วัด: "${topic}"
        ระดับความยาก: "${config.difficulty}"
        
        เงื่อนไขสำคัญ:
        1. เน้นการคิดวิเคราะห์ ประยุกต์ใช้ หรือแก้ปัญหา ตาม Test Blueprint
        2. ตัวลวงต้องมีความสมเหตุสมผลและท้าทาย
        3. คำอธิบายเฉลยต้องชี้ชัดว่าทำไมข้อถูกจึงถูก และทำไมตัวลวงอื่นจึงผิด`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: batchQuestionSchema,
                temperature: 0.7, 
            }
        });

        if (!response.text) {
            throw new Error('AI ไม่สามารถสร้างข้อมูลได้');
        }

        const generatedQuestions = JSON.parse(response.text);

        // 🌟 สร้างรหัสข้อสอบแบบรันลำดับ (เช่น -001, -002)
        const formattedIndex = String(jobIndex + 1).padStart(3, '0');
        const finalExamCode = `${examCodePrefix}-${formattedIndex}`;

        // 3. สร้างข้อมูลชุดข้อสอบ (Exam Container) ลงตาราง exams
        const examTitle = `${config.exam_title} - ${topic}`;
        const { data: examData, error: examError } = await supabase.from('exams').insert([{
            creator_id: user.id,
            title: examTitle,
            exam_code: finalExamCode, // 🌟 บันทึกรหัสข้อสอบลงตาราง
            education_level: config.grade_level,
            subject_category: config.subject,
            topic: topic,
            difficulty_level: config.difficulty,
            status: 'published',
            total_score: generatedQuestions.length
        }]).select().single();

        if (examError) {
            console.error("Exam DB Error:", examError);
            throw new Error('บันทึกแฟ้มข้อสอบหลัก (Exam) ไม่สำเร็จ');
        }

        // 4. แปลงโครงสร้างข้อสอบให้ตรงกับฐานข้อมูล NiiVaa SmartExam
        const optionLabels = ['1', '2', '3', '4']; 
        
        const formattedQuestions = generatedQuestions.map((q: any, idx: number) => {
            const optionsToSave = q.options.map((text: string, i: number) => ({
                id: optionLabels[i] || String(i + 1),
                text: text
            }));

            const safeCorrectIndex = q.correctAnswerIndex >= 0 && q.correctAnswerIndex < 4 ? q.correctAnswerIndex : 0;
            const correctAnswerId = optionLabels[safeCorrectIndex];

            return {
                exam_id: examData.id,
                creator_id: user.id, 
                question_number: idx + 1,
                question_type: 'mcq',
                question_text: q.question,
                options: optionsToSave,
                correct_answer: correctAnswerId,
                solution_text: q.explanation,
                score: 1.0,
                is_bank_item: true, 
                education_level: config.grade_level,
                subject_category: config.subject,
                tags: [config.difficulty, 'mcq', topic, 'AI-Batch-Generator']
            };
        });

        // 5. บันทึกคำถามทั้งหมดลงตาราง exam_questions แบบ Bulk Insert
        const { error: questionsError } = await supabase
            .from('exam_questions')
            .insert(formattedQuestions);

        if (questionsError) {
            console.error("Questions DB Error:", questionsError);
            throw new Error('บันทึกคำถามลงฐานข้อมูลไม่สำเร็จ: ' + questionsError.message);
        }

        // สำเร็จ คืนค่ารหัสข้อสอบที่สร้างไปพร้อมกับสถานะ
        return { success: true, count: generatedQuestions.length, examCode: finalExamCode };

    } catch (error: any) {
        console.error(`Batch Error on topic "${topic}":`, error);
        return { success: false, error: error.message };
    }
}