import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./print.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Jiddah Smart Report Engine",
  description: "Smart Report Engine for Jiddah",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jiddah",
  },
};

import { PowerSyncProvider } from "../components/providers/PowerSyncProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PowerSyncProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </PowerSyncProvider>
      </body>
    </html>
  );
}
