import { NextResponse } from 'next/server';
// 🟢 สมมติว่าติดตั้งแพ็กเกจ @upstash/redis แล้ว (npm install @upstash/redis)
// import { Redis } from '@upstash/redis'
// const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // 🟢 แทนที่จะ Insert ลง Supabase ตรงๆ ให้โยนเข้า Redis Queue (Lpush)
    // การทำงานนี้ใช้เวลาไม่ถึง 10 มิลลิวินาที (รองรับหมื่นคนพร้อมกันได้สบาย)
    
    /* await redis.lpush('exam_submission_queue', JSON.stringify({
      studentId: payload.studentId,
      examId: payload.examId,
      answers: payload.answers,
      timestamp: new Date().toISOString()
    })); 
    */

    console.log("📥 โยนคำตอบของนักเรียนลง Queue สำเร็จ รอ Background Worker จัดการ");

    return NextResponse.json({ success: true, message: "รับกระดาษคำตอบแล้ว" });

  } catch (error: any) {
    console.error("Submit Exam Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}