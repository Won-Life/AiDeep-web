import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist에는 한글 글리프가 없어 기기별 기본 폰트로 대체된다. 채팅 답변 PNG 카드가
// 어느 기기에서든 같은 모양으로 나오도록 한글 웹폰트를 폴백 체인에 넣는다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  // 구글은 CJK 글리프를 subset 파라미터와 무관하게 항상 내려준다 — "latin"으로도 한글이 들어온다.
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const DESCRIPTION =
  "기록을 그래프로 구조화하며 회의를 실시간으로 정리해줍니다.";

export const metadata: Metadata = {
  metadataBase: new URL("https://aideep.ai.kr"),
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
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
