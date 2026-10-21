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
  title: "Jiddah Smart Report Engine",
  description: "Smart Report Engine for Jiddah",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jiddah",
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
