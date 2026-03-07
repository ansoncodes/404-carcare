import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "404 CarCare",
  description: "Airport-adjacent car wash and coating management platform",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body className="app-fade-in bg-[var(--bg-base)] text-[var(--text-secondary)]">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
