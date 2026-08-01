import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Öğrenci Yemek Takip",
  description: "Öğrenci yemek ve ödeme takip sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
