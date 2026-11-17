import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Toaster } from "sonner";
import { PowerSyncProvider } from "../components/providers/PowerSyncProvider";
import { VersionChecker } from "@/components/system/version-checker";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

export const viewport: Viewport = {
  themeColor: "#039D4A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Jiddah Islamic Schools | Academic Assessment & Staff Portal",
  description: "Official Academic Assessment & Terminal Reporting Engine for Jiddah Islamic Nursery & Primary School",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jiddah Islamic Schools",
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
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var stored = localStorage.getItem('jiddah_theme_mode') || localStorage.getItem('jiddah_theme_mode_v1') || localStorage.getItem('theme');
                var theme = 'light';
                if (stored === 'dark') {
                  theme = 'dark';
                } else if (stored === 'light' || stored === 'hybrid') {
                  theme = 'light';
                } else if (stored === 'system') {
                  var mq = window.matchMedia('(prefers-color-scheme: dark)');
                  theme = mq.matches ? 'dark' : 'light';
                }
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg-canvas,#F8FAFC)] text-[var(--text-primary,#0F172A)] transition-colors duration-150">
        <PowerSyncProvider>
          {children}
          <VersionChecker />
          <Toaster position="bottom-right" richColors />
        </PowerSyncProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}