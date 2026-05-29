import type { Metadata } from "next";
import { Rajdhani, JetBrains_Mono, DM_Sans } from 'next/font/google'
import "./globals.css";
import { Providers } from "@/components/providers";

const rajdhani = Rajdhani({ 
  variable: '--font-rajdhani', 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({ 
  variable: '--font-jetbrains-mono', 
  subsets: ['latin'],
  weight: ['400', '500'],
})

const dmSans = DM_Sans({ 
  variable: '--font-dm-sans', 
  subsets: ['latin'],
  weight: ['300', '400', '500'],
})

export const metadata: Metadata = {
  title: "SecureTeam - Hệ thống nhắn tin nội bộ",
  description: "Ứng dụng nhắn tin nội bộ bảo mật cho doanh nghiệp",
  icons: {
    icon: "/—Pngtree—letter v icon_8627704.png",
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
        className={`${rajdhani.variable} ${jetbrainsMono.variable} ${dmSans.variable} antialiased bg-background text-foreground relative overflow-hidden`}
      >
        {/* Tactical Grid Background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 bg-tactical-grid opacity-20" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

