"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  ArrowRightLeft,
  FileText,
  Users,
  Settings,
  Database,
  BarChart3,
  Archive,
  Globe,
  User as UserIcon,
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

  const isAdmin = role === "Super Admin" || role === "Admin";

  const navigation = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.warehouses, href: "/warehouses", icon: Warehouse, hide: !isAdmin },
    { name: t.nav.products, href: "/products", icon: Package },
    { name: t.nav.stockIn, href: "/stock-in", icon: Archive },
    { name: t.nav.stockOut, href: "/stock-out", icon: Archive, rotate: 180 },
    { name: t.nav.transfers, href: "/transfers", icon: ArrowRightLeft },
    { name: t.nav.reports, href: "/reports", icon: BarChart3, hide: !isAdmin },
    { name: t.nav.systemGen, href: "/system-gen", icon: Database, hide: role !== "Super Admin" },
  ];

  const adminNavigation = [
    { name: t.nav.userManagement, href: "/users", icon: Users, hide: !isAdmin },
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
    <div className="flex flex-col w-72 bg-card/50 backdrop-blur-xl border-r h-screen sticky top-0 transition-all duration-300">
      <div className="flex items-center justify-between px-6 h-20 border-b/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
            <Warehouse className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-bold text-xl tracking-tight text-foreground leading-none">omborchi.uz</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mt-1">Enterprise Solution</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-none">
        <div className="flex gap-2 px-2">
          <div className="flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between gap-2 bg-muted/40 border-none h-10 hover:bg-muted/60 transition-all rounded-xl">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider">{language}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-xl border-none shadow-2xl">
                {languages.map((l) => (
                  <DropdownMenuItem 
                    key={l.code} 
                    onClick={() => setLanguage(l.code as any)}
                    className={cn("gap-2 rounded-lg py-2 cursor-pointer transition-colors", language === l.code && "bg-primary/10 text-primary font-bold")}
                  >
                    <span className="text-lg">{l.flag}</span> 
                    <span className="text-sm font-medium">{l.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ThemeToggle />
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="px-4 mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-headline">
              {t.nav.menu}
            </h3>
            <nav className="space-y-1">
              {navigation.filter(item => !item.hide).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={cn(
                          "w-5 h-5 transition-transform group-hover:scale-110",
                          item.rotate && "rotate-180",
                          isActive ? "text-primary-foreground" : "text-muted-foreground/70 group-hover:text-primary"
                        )}
                      />
                      {item.name}
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          {isAdmin && (
            <div className="pt-2 border-t border-muted/30">
              <h3 className="px-4 mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-headline">
                {t.nav.administration}
              </h3>
              <nav className="space-y-1">
                {adminNavigation.filter(item => !item.hide).map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all group",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            "w-5 h-5 transition-transform group-hover:scale-110",
                            isActive ? "text-primary-foreground" : "text-muted-foreground/70 group-hover:text-primary"
                          )}
                        />
                        {item.name}
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <Link href="/profile" className="block p-3 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-all border border-transparent hover:border-primary/20 group">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-background shadow-md">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold truncate group-hover:text-primary transition-colors">{user?.displayName || (user?.email?.split('@')[0] || 'User')}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{role}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}