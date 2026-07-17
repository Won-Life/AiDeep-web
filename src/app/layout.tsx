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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
