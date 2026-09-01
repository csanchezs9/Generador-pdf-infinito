import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infinito - Generador de Catálogos",
  description: "Genera catálogos PDF de productos Infinito Body Piercing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fafafa] text-neutral-900 font-[family-name:var(--font-geist-sans)]">
        {children}
      </body>
    </html>
  );
}
