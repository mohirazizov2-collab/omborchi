
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

export function OmniSidebar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();

  const navigation = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.warehouses, href: "/warehouses", icon: Warehouse },
    { name: t.nav.products, href: "/products", icon: Package },
    { name: t.nav.stockIn, href: "/stock-in", icon: Archive },
    { name: t.nav.stockOut, href: "/stock-out", icon: Archive, rotate: 180 },
    { name: t.nav.transfers, href: "/transfers", icon: ArrowRightLeft },
    { name: t.nav.reports, href: "/reports", icon: BarChart3 },
    { name: t.nav.systemGen, href: "/system-gen", icon: Database },
  ];

  const adminNavigation = [
    { name: t.nav.userManagement, href: "/users", icon: Users },
    { name: t.nav.settings, href: "/settings", icon: Settings },
  ];

  const languages = [
    { code: 'uz', name: 'O\'zbek', flag: '🇺🇿' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  return (
    <div className="flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      <div className="flex items-center justify-between px-6 h-16 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-headline font-bold">
            OS
          </div>
          <span className="font-headline font-bold text-xl tracking-tight text-primary">OmniStock</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        {/* Language Switcher */}
        <div className="px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2 bg-accent/20 border-none h-9">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase">{language}</span>
                </div>
                <span className="text-xs text-muted-foreground">Change</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {languages.map((l) => (
                <DropdownMenuItem 
                  key={l.code} 
                  onClick={() => setLanguage(l.code as any)}
                  className={cn(language === l.code && "bg-primary/10 text-primary")}
                >
                  <span className="mr-2">{l.flag}</span> {l.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-headline">
            {t.nav.menu}
          </h3>
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      item.rotate && "rotate-180",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-headline">
            {t.nav.administration}
          </h3>
          <nav className="space-y-1">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t bg-accent/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
            JD
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">John Doe</span>
            <span className="text-xs text-muted-foreground truncate">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
