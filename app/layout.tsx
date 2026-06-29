import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Stoxy - ระบบคลังไฟฟ้า",
    template: "%s | Stoxy",
  },
  description: "ระบบบริหารจัดการคลังอุปกรณ์ไฟฟ้า สำหรับทีมช่างและวิศวกร",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stoxy",
  },
  keywords: ["electrical warehouse", "inventory", "คลังไฟฟ้า", "สต็อก"],
};

export const viewport: Viewport = {
  themeColor: "#1D4ED8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${sarabun.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
