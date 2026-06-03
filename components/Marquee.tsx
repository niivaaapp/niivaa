'use client' // สำคัญมาก: ต้องมีบรรทัดนี้ที่แถวแรกสุดครับ

import React from 'react'

interface MarqueeProps {
  text: string;
  isVisible: boolean;
  isLoop: boolean;
}

export default function Marquee({ text, isVisible, isLoop }: MarqueeProps) {
  // ถ้าไม่ให้โชว์ หรือไม่มีข้อความ ไม่ต้องวาดอะไรเลย
  if (!isVisible || !text) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: '10px 0',
        zIndex: 9999,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        borderBottom: '1px solid rgba(0, 102, 102, 0.3)'
      }}
    >
      <div 
        className={isLoop ? 'animate-marquee' : ''}
        style={{
          display: 'inline-block',
          color: '#CCFFFF',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          paddingLeft: '100%' // ให้เริ่มวิ่งจากขวาสุด
        }}
      >
        {text}
      </div>

      {/* ใส่ CSS Animation แบบดิบๆ ตรงนี้เพื่อให้ชัวร์ว่าทำงานได้ทุกเบราว์เซอร์ */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </div>
  );
}