import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Toaster } from "sonner";
import { PowerSyncProvider } from "../components/providers/PowerSyncProvider";

export const viewport: Viewport = {
  themeColor: "#FDFBF7",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "JIDDAH ISLAMIC SCHOOLS - Management & Reporting Engine",
  description: "Official Management & Smart Reporting Engine for Jiddah Islamic Schools",
  icons: {
    icon: [
      { url: '/school_logo.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/school_logo.svg' },
      { url: '/apple-touch-icon.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JIDDAH ISLAMIC SCHOOLS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-[#FDFBF7] text-[#1C1917]">
        <PowerSyncProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </PowerSyncProvider>
      </body>
    </html>
  );
}
