import type { ReactNode } from "react";
import type { Metadata } from "next";
import { UserProvider } from "../contexts/user-context"; 
import "./globals.css";

// 💡 优化：移除了对 next/font/google 的依赖，直接使用系统默认字体
export const metadata: Metadata = {
  title: "AI.Tube - Global AI Video Community", 
  description: "Share and discover AI videos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning={true} 
        这个属性告诉 React：如果在 body 上发现服务器端没有的属性（比如浏览器插件注入的 mpa-version），
        请忽略它，不要报错。这不会影响你的应用功能。
      */}
      <body 
        suppressHydrationWarning={true}
        className="antialiased font-sans bg-[#0A0A0A] text-white"
      >
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}