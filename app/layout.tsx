import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

// 💡 优化：移除了对 next/font/google 的依赖，直接使用系统默认字体
// 这样 Vercel 构建时就不会因为网络问题下载字体失败

export const metadata: Metadata = {
  title: "AI Video Platform",
  description: "Share and discover AI videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 💡 直接在 body 使用标准的系统无衬线字体栈 */}
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}