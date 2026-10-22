import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Toaster } from "sonner";
import { PowerSyncProvider } from "../components/providers/PowerSyncProvider";
import { VersionChecker } from "@/components/system/version-checker";

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
                } else if (stored === 'light') {
                  theme = 'light';
                } else {
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
      </body>
    </html>
  );
}
