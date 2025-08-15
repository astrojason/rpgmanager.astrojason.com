import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SideNavigation from "@/components/SideNavigation";
import "./globals.css";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RPG Manager",
  description: "Interactive RPG campaign management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}
      >
        <div className="flex">
          <SideNavigation className="flex-shrink-0" />
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800">
            <Suspense>{children}</Suspense>
          </main>
        </div>
      </body>
    </html>
  );
}
