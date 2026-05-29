import type { Metadata } from "next";
import { Rajdhani, Share_Tech_Mono, Inter } from 'next/font/google'
import "./globals.css";
import { Providers } from "@/components/providers";

const rajdhani = Rajdhani({ 
  variable: '--font-rajdhani', 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const shareTechMono = Share_Tech_Mono({ 
  variable: '--font-share-tech-mono', 
  subsets: ['latin'],
  weight: ['400'],
})

const inter = Inter({ 
  variable: '--font-inter', 
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: "SecureTeam - Hệ thống nhắn tin nội bộ",
  description: "Ứng dụng nhắn tin nội bộ bảo mật cho doanh nghiệp",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${rajdhani.variable} ${shareTechMono.variable} ${inter.variable} antialiased bg-background text-foreground relative overflow-hidden`}
      >
        {/* Tactical Grid Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 bg-tactical-grid opacity-20" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
