"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Home, BookOpenText, Compass, FolderClosed, User } from "lucide-react";

const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    { name: "Accueil", href: "/accueil", icon: Home },
    { name: "Devoirs", href: "/devoirs", icon: BookOpenText },
    { name: "Séances", href: "/seances", icon: Compass }, 
    { name: "Ressources", href: "/ressources", icon: FolderClosed },
    { name: "Profil", href: "/profil", icon: User },
  ];

  return (
  
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-white border-t border-gray-100 flex items-center justify-around px-2 pb-safe-area font-sans max-w-md mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1.5 w-full h-full text-center transition-colors ${
              isActive ? "text-[#76D7B1]" : "text-gray-400"
            }`}
          >
            
            <Icon 
              className={`w-6 h-6 ${isActive ? "text-[#76D7B1]" : "text-gray-400"}`} 
              strokeWidth={isActive ? 2 : 1.5}
            />
          
            <span className="text-[11px] font-medium leading-none tracking-tight">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;