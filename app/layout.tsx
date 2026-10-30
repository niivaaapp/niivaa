import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🌟 ปรับปรุงชื่อเว็บเวลาแสดงบนแท็บเบราว์เซอร์ให้ด้วยครับ
export const metadata: Metadata = {
  title: "NiiVaa Smart System",
  description: "ระบบบริหารจัดการและศูนย์รวมสื่อ NiiVaa Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th" // 🌟 เปลี่ยนเป็น "th" สำหรับเว็บภาษาไทย
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* 🌟 แทรกคำสั่งบังคับ HTTPS เพื่อแก้ปัญหา (!) บนมือถือ ตรงนี้ครับ */}
      <head>
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}