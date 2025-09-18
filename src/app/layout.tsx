import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./ClientLayout";

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
      <body className="antialiased h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
