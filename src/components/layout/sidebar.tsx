
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  Users,
  Settings,
  Database,
  BarChart3,
  ChevronRight,
  UserRound,
  History,
  ClipboardCheck,
  FileInput,
  FileOutput,
  FileText,
  Globe
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function OmniSidebar() {
  const pathname = usePathname();
  const { t, language, setLanguage } = useLanguage();
  const { user, role } = useUser();

  const isSuperAdmin = role === "Super Admin";
  const isAdmin = role === "Admin" || isSuperAdmin;
  const isOmborchi = role === "Omborchi";

  // Analitika Guruhi
  const analyticsNavigation = useMemo(() => [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.history, href: "/history", icon: History },
    { name: t.nav.reports, href: "/reports", icon: BarChart3, hide: isOmborchi },
  ], [t, isOmborchi]);

  // Operatsiyalar Guruhi (Nakladnolar)
  const invoiceNavigation = useMemo(() => [
    { name: t.nav.stockIn, href: "/stock-in", icon: FileInput },
    { name: t.nav.stockOut, href: "/stock-out", icon: FileOutput },
  ], [t]);

  // Inventar Boshqaruvi Guruhi
  const inventoryNavigation = useMemo(() => [
    { name: t.nav.products, href: "/products", icon: Package },
    { name: t.nav.warehouses, href: "/warehouses", icon: Warehouse, hide: isOmborchi },
    { name: t.nav.inventoryAudit, href: "/inventory-audit", icon: ClipboardCheck, hide: !isAdmin },
  ], [t, isAdmin, isOmborchi]);

  // HR Guruhi
  const hrNavigation = useMemo(() => [
    { name: t.nav.employees, href: "/employees", icon: UserRound, hide: !isAdmin },
  ], [t, isAdmin]);

  // Ma'muriyat Guruhi
  const adminNavigation = useMemo(() => [
    { name: t.nav.userManagement, href: "/users", icon: Users, hide: !isSuperAdmin },
    { name: t.nav.settings, href: "/settings", icon: Settings, hide: !isAdmin },
  ], [t, isAdmin, isSuperAdmin]);

  const userInitials = useMemo(() => user?.displayName 
    ? user.displayName.split(' ').map(n => n[0]).join('')
    : (user?.email ? user.email[0].toUpperCase() : 'U'), [user]);

  const isInvoiceActive = pathname === "/stock-in" || pathname === "/stock-out";

  const renderLinks = (items: any[]) => {
    return items.filter(item => !item.hide).map((item) => {
      const isActive = pathname === item.href;
      return (
        <Link
          key={item.name}
          href={item.href}
          className={cn(
            "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 group",
            isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
            {item.name}
          </div>
          {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
        </Link>
      );
    });
  };

  return (
    <div className="flex flex-col w-64 bg-card border-r h-screen sticky top-0 z-50 transition-all duration-200">
      <div className="flex items-center px-6 h-16 border-b shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-[0.8rem] bg-[#3b82f6] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10L12 4L21 10V20H3V10Z" />
              <path d="M8 12H16" />
              <path d="M8 15H16" />
              <path d="M8 18H16" />
            </svg>
          </div>
          <span className="font-headline font-black text-[22px] tracking-tighter text-foreground">ombor.uz</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-hide">
        <div className="flex gap-2 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-between h-8 text-[10px] font-black uppercase bg-muted/30 border-none">
                <Globe className="w-3 h-3" /> {language}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => setLanguage('uz')} className="gap-2 text-xs">🇺🇿 O'zbek</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ru')} className="gap-2 text-xs">🇷🇺 Русский</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="gap-2 text-xs">🇺🇸 English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>

        <nav className="space-y-6">
          {/* Analitika Guruhi */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{t.nav.analyticsGroup}</p>
            {renderLinks(analyticsNavigation)}
          </div>

          {/* Operatsiyalar Guruhi */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{t.nav.operationsGroup}</p>
            <Accordion type="single" collapsible defaultValue={isInvoiceActive ? "invoices" : ""}>
              <AccordionItem value="invoices" className="border-none">
                <AccordionTrigger className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 hover:no-underline hover:bg-muted group",
                  isInvoiceActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <div className="flex items-center gap-3">
                    <FileText className={cn("w-4 h-4", isInvoiceActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    {t.nav.invoices}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-1 pl-4 space-y-1">
                  {invoiceNavigation.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-bold transition-all duration-200",
                          isSubActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <subItem.icon className="w-3.5 h-3.5" />
                        {subItem.name}
                      </Link>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Inventar Guruhi */}
          <div className="space-y-1">
            <p className="px-3 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{t.nav.inventoryGroup}</p>
            {renderLinks(inventoryNavigation)}
          </div>

          {/* HR Guruhi */}
          {(isAdmin) && (
            <div className="space-y-1">
              <p className="px-3 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{t.nav.hrGroup}</p>
              {renderLinks(hrNavigation)}
            </div>
          )}

          {/* Ma'muriyat Guruhi */}
          {(isAdmin || isSuperAdmin) && (
            <div className="pt-4 border-t space-y-1">
              <p className="px-3 mb-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{t.nav.systemGroup}</p>
              {renderLinks(adminNavigation)}
            </div>
          )}
        </nav>
      </div>

      <div className="p-4 border-t shrink-0">
        <Link href="/profile">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition-all cursor-pointer group">
            <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
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
