"use client";
import { usePathname } from "next/navigation";
import Head from 'next/head';
import BottomNav from "../BottomNav";

export default function BottomNavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Liste des pages SANS menu de navigation (Connexion, etc.)
  const hideOnPaths = ["/", "/login", "/change-password"];
  const shouldHideNav = hideOnPaths.includes(pathname);

  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#76D7B1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="B2S" />
        <link rel="apple-touch-icon" href="/appstore-images/ios/180.png" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Contenu de tes pages (Assistant, etc.) */}
        <main>{children}</main>

        {/* Menu visible uniquement hors connexion */}
        {!shouldHideNav && <BottomNav />}
      </div>
    </>
  );
}