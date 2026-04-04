import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
import "./globals.css";

import BottomNav from "../src/BottomNav"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "B2S - Aide aux devoirs",
  description: "Plateforme mobile d'aide aux devoirs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-white text-gray-900`}>
      
        <main className="min-h-full pb-20 overflow-y-auto">
          {children}
        </main>
        
       
        <BottomNav />
      </body>
    </html>
  );
};