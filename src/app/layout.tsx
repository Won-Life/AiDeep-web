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

const DESCRIPTION =
  "아이디어를 마인드맵 형태의 그래프로 구조화하고, 팀이 실시간으로 함께 편집하는 협업 캔버스 도구";

export const metadata: Metadata = {
  title: "AiDeep",
  description: DESCRIPTION,
  openGraph: {
    title: "AiDeep",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary",
    title: "AiDeep",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
