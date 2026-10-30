import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb', // 🌟 ปลดล็อกให้รับไฟล์สลิปได้สูงสุด 20MB
    },
  },
};

export default nextConfig;