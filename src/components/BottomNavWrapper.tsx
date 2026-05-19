"use client";
import { usePathname } from "next/navigation";
import BottomNav from "../BottomNav";

export default function BottomNavWrapper({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const hideOnPaths = ["/", "/login", "/change-password"];
  const shouldHideNav = hideOnPaths.includes(pathname);

  return (
    <>
      {children}
      {!shouldHideNav && <BottomNav />}
    </>
  );
}