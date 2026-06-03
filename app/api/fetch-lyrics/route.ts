import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { videoId, songTitle } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) return NextResponse.json({ error: "ไม่พบ API KEY" }, { status: 500 });

    // 🧹 ล้างชื่อเพลง และบังคับเติมคำค้นหาให้เจาะจง
    const queryTitle = `${songTitle.replace(/\[.*?\]|\(.*?\)/g, '').trim()} เนื้อเพลง lyrics`;

    console.log(`--- [NiiVaa Force Search] กำลังค้นหาข้อมูลจริงสำหรับ: ${queryTitle} ---`);

    const MODEL_NAME = "gemini-2.5-flash"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ 
            text: `คำสั่งเด็ดขาด: ห้ามใช้ความรู้เดิมของคุณ ห้ามแต่งเพลงใหม่ 
            จงไปที่ Google Search ค้นหาเว็บเนื้อเพลง แล้ว 'คัดลอก' เนื้อเพลงของ "${songTitle}" มาแสดง 
            หากผลการค้นหาไม่พบเนื้อเพลงที่ตรงเป๊ะ ให้ตอบว่า NOT_FOUND เท่านั้น` 
          }]
        }],
        // 🚩 ปรับจูนเครื่องมือค้นหาให้ทำงานหนักขึ้น
        tools: [{
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: "UNSPECIFIED", // หรือใช้ "ALWAYS" ถ้า API ของพี่รองรับ เพื่อบังคับ search 100%
              dynamic_threshold: 0.1 // ยิ่งค่าน้อย ยิ่งบังคับให้ไป search บ่อยขึ้น
            }
          }
        }], 
        generationConfig: {
          temperature: 0.0,
        }
      })
    });

    const data = await response.json();
    
    // ตรวจสอบว่ามีข้อมูล Search Metadata กลับมาด้วยหรือไม่
    if (data.candidates?.[0]?.groundingMetadata) {
      console.log("🌐 AI ใช้ข้อมูลจาก Google Search จริงๆ แล้วครับ");
    }

    const lyricsText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    // 🔍 ระบบป้องกันเพลงมโน (ตรวจสอบคำในเนื้อเพลง)
    // ถ้า AI แต่งเอง มักจะไม่มีชื่อศิลปิน หรือไม่มีเนื้อเพลงที่ยาวพอ
    if (!lyricsText || lyricsText.includes("NOT_FOUND") || lyricsText.length < 80) {
      return NextResponse.json({ lyrics: "ขออภัย ไม่พบเนื้อเพลงจริงในฐานข้อมูลออนไลน์" });
    }

    // ✅ บันทึกลง Supabase
    await supabase.from('master_songs').update({ lyrics: lyricsText }).eq('video_id', videoId);

    return NextResponse.json({ lyrics: lyricsText });

  } catch (err: any) {
    return NextResponse.json({ error: "Server Error", detail: err.message }, { status: 500 });
  }
}