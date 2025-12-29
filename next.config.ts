import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // 这是你的 Supabase 项目特定域名 (来自刚才的报错信息)
        hostname: 'muwpfhwzfxocqlcxbsoa.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;