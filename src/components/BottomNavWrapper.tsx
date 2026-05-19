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
      {/* Configuration PWA globale injectée dans le Head invisible du site */}
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#76D7B1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="B2S" />
        <link rel="apple-touch-icon" href="/appstore-images/ios/180.png" />
      </Head>

      {/* Rendu de l'application */}
      <div className="min-h-screen bg-white">
        {/* Affichage du contenu de la page actuelle */}
        <main>{children}</main>

        {/* La barre de navigation ne s'affiche que si on n'est pas sur une page d'authentification */}
        {!shouldHideNav && <BottomNav />}
      </div>
    </>
  );
}