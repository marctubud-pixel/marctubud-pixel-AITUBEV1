import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 👈 关键：这里必须是 next/font/google
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>{children}</body>
    </html>
  );
}
