"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../src/lib/supabase"; 

import { Home, BookOpenText, Calendar, FolderClosed, User, Users, MessageSquareQuote } from "lucide-react";

const BottomNav = () => {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function getUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (data) {
          setRole(data.role);
        }
      }
    }
    getUserRole();
  }, []);

  const isStaff = role === "Benevole" || role === "Admin";
  const isParent = role === "Parent";

  const getCentralItem = () => {
    if (isStaff) {
      return { name: "Élèves", href: "/eleves", icon: Users };
    } else if (isParent) {
      return { name: "Enfants", href: "/parents", icon: Users };
    } else {
      return { name: "Devoirs", href: "/devoirs", icon: BookOpenText };
    }
  };

  const centralItem = getCentralItem();

  // Liste complète avec les 6 onglets
  const navItems = [
    { name: "Accueil", href: "/accueil", icon: Home },
    { name: "Chatbot", href: "/chat", icon: MessageSquareQuote },
    centralItem,
    { name: "Planning", href: "/calendrier", icon: Calendar }, 
    { name: "Outils", href: "/ressources", icon: FolderClosed },
    { name: "Profil", href: "/profil", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-white border-t border-gray-100 flex items-center justify-around px-1 pb-safe-area font-sans max-w-md mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full text-center transition-colors ${
              isActive ? "text-[#76D7B1]" : "text-gray-400"
            }`}
          >
            <Icon 
              className={`w-5 h-5 ${isActive ? "text-[#76D7B1]" : "text-gray-400"}`} 
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className="text-[9px] font-black uppercase tracking-tight leading-none">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;