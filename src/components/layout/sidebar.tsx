
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  ArrowRightLeft,
  Users,
  Settings,
  Database,
  BarChart3,
  Archive,
  Globe,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function OmniSidebar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { user, role } = useUser();

  const isSuperAdmin = role === "Super Admin";
  const isAdmin = role === "Admin" || isSuperAdmin;
  const isOmborchi = role === "Omborchi";

  const navigation = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.warehouses, href: "/warehouses", icon: Warehouse, hide: isOmborchi },
    { name: t.nav.products, href: "/products", icon: Package },
    { name: t.nav.stockIn, href: "/stock-in", icon: Archive },
    { name: t.nav.stockOut, href: "/stock-out", icon: Archive },
    { name: t.nav.transfers, href: "/transfers", icon: ArrowRightLeft },
    { name: t.nav.reports, href: "/reports", icon: BarChart3, hide: isOmborchi },
    { name: t.nav.systemGen, href: "/system-gen", icon: Database, hide: !isSuperAdmin },
  ];

  const adminNavigation = [
    { name: t.nav.userManagement, href: "/users", icon: Users, hide: !isSuperAdmin },
    { name: t.nav.settings, href: "/settings", icon: Settings, hide: !isAdmin },
  ];

  const languages = [
    { code: 'uz', name: 'O\'zbek', flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const userInitials = user?.displayName 
    ? user.displayName.split(' ').map(n => n[0]).join('')
    : (user?.email ? user.email[0].toUpperCase() : 'U');

  return (
    <div className="flex flex-col w-64 bg-card border-r h-screen sticky top-0 z-50 transition-all duration-200">
      <div className="flex items-center px-6 h-16 border-b">
        <div className="flex items-center gap-2">
          <Warehouse className="w-6 h-6 text-primary" />
          <span className="font-headline font-black text-lg tracking-tighter">omborchi.uz</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <div className="flex gap-2 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-between h-8 text-[10px] font-black uppercase bg-muted/30 border-none">
                <Globe className="w-3 h-3" /> {language}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              {languages.map((l) => (
                <DropdownMenuItem key={l.code} onClick={() => setLanguage(l.code as any)} className="gap-2 text-xs">
                  <span>{l.flag}</span> {l.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>

        <nav className="space-y-1">
          {navigation.filter(item => !item.hide).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors group",
                  isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  {item.name}
                </div>
                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {(isAdmin || isSuperAdmin) && (
          <div className="pt-4 border-t space-y-1">
            <p className="px-3 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Admin</p>
            {adminNavigation.filter(item => !item.hide).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-bold transition-colors group",
                    isActive ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 mt-auto border-t">
        <Link href="/profile">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black truncate group-hover:text-primary transition-colors">{user?.displayName || 'Xodim'}</span>
              <span className="text-[9px] text-muted-foreground uppercase font-bold">{role}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
