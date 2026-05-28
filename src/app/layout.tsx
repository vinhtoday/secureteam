import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Roboto_Mono } from 'next/font/google'
import "./globals.css";
import { Providers } from "@/components/providers";

const plusJakarta = Plus_Jakarta_Sans({ 
  variable: '--font-plus-jakarta', 
  subsets: ['latin', 'vietnamese'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
})

const robotoMono = Roboto_Mono({ 
  variable: '--font-roboto-mono', 
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
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
        className={`${plusJakarta.variable} ${robotoMono.variable} antialiased bg-background text-foreground relative overflow-hidden`}
      >
        {/* Animated Background Mesh Blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 opacity-70 dark:opacity-40">
          <div className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] md:w-[35rem] md:h-[35rem] rounded-full bg-violet-400/20 dark:bg-violet-900/15 blur-[80px] md:blur-[120px] animate-pulse-glow" style={{ animationDelay: '0s', animationDuration: '20s' }} />
          <div className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] md:w-[40rem] md:h-[40rem] rounded-full bg-indigo-400/20 dark:bg-indigo-900/15 blur-[80px] md:blur-[120px] animate-pulse-glow" style={{ animationDelay: '-5s', animationDuration: '25s' }} />
          <div className="absolute top-[40%] right-[30%] w-[35vw] h-[35vw] md:w-[25rem] md:h-[25rem] rounded-full bg-fuchsia-400/10 dark:bg-fuchsia-900/5 blur-[80px] md:blur-[120px] animate-pulse-glow" style={{ animationDelay: '-10s', animationDuration: '18s' }} />
          <div className="absolute bottom-[20%] left-[20%] w-[40vw] h-[40vw] md:w-[30rem] md:h-[30rem] rounded-full bg-sky-400/15 dark:bg-sky-900/10 blur-[80px] md:blur-[120px] animate-pulse-glow" style={{ animationDelay: '-15s', animationDuration: '22s' }} />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
