"use client";
import { usePathname } from "next/navigation";
import BottomNav from "../BottomNav"; // Ton composant actuel

export default function BottomNavWrapper() {
  const pathname = usePathname();

  // Liste des pages SANS menu
  // Si ton login est à la racine, laisse "/"
  const hideOnPaths = ["/", "/login", "/change-password"]; 

  if (hideOnPaths.includes(pathname)) {
    return null;
  }

  return <BottomNav />;
}