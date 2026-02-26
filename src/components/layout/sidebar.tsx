
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
  BarChart3,
  UserRound,
  History,
  ClipboardCheck,
  FileInput,
  FileOutput,
  FileText,
  Globe,
  ChevronDown,
  WalletCards,
  Coins
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

  // Nakladnolar Guruhi
  const invoiceNavigation = useMemo(() => [
    { name: t.nav.stockIn, href: "/stock-in", icon: FileInput },
    { name: t.nav.stockOut, href: "/stock-out", icon: FileOutput },
  ], [t]);

  // Inventar Boshqaruvi Guruhi
  const inventoryNavigation = useMemo(() => [
    { name: t.nav.products, href: "/products", icon: Package },
    { name: t.nav.warehouses, href: "/warehouses", icon: Warehouse },
    { name: t.nav.inventoryAudit, href: "/inventory-audit", icon: ClipboardCheck, hide: !isAdmin },
  ], [t, isAdmin]);

  // Moliya Guruhi (Omborchi uchun butunlay yashiriladi)
  const financeNavigation = useMemo(() => [
    { name: t.nav.expenses, href: "/expenses", icon: WalletCards, hide: isOmborchi },
    { name: t.nav.employees, href: "/employees", icon: UserRound, hide: !isAdmin },
  ], [t, isAdmin, isOmborchi]);

  // Ma'muriyat Guruhi
  const adminNavigation = useMemo(() => [
    { name: t.nav.userManagement, href: "/users", icon: Users, hide: !isSuperAdmin },
    { name: t.nav.settings, href: "/settings", icon: Settings, hide: !isAdmin },
  ], [t, isAdmin, isSuperAdmin]);

  const userInitials = useMemo(() => user?.displayName 
    ? user.displayName.split(' ').map(n => n[0]).join('')
    : (user?.email ? user.email[0].toUpperCase() : 'U'), [user]);

  // Qaysi guruh ochiq turishini aniqlash
  const activeGroup = useMemo(() => {
    if (analyticsNavigation.some(i => pathname === i.href)) return "analytics";
    if (invoiceNavigation.some(i => pathname === i.href)) return "invoices";
    if (inventoryNavigation.some(i => pathname === i.href)) return "inventory";
    if (financeNavigation.some(i => pathname === i.href)) return "finance";
    if (adminNavigation.some(i => pathname === i.href)) return "admin";
    return "";
  }, [pathname, analyticsNavigation, invoiceNavigation, inventoryNavigation, financeNavigation, adminNavigation]);

  const renderAccordionItem = (value: string, label: string, icon: any, items: any[]) => {
    const visibleItems = items.filter(i => !i.hide);
    if (visibleItems.length === 0) return null;

    const Icon = icon;
    const isGroupActive = activeGroup === value;

    return (
      <AccordionItem key={value} value={value} className="border-none">
        <AccordionTrigger className={cn(
          "flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:no-underline hover:bg-muted group mb-1",
          isGroupActive ? "text-primary bg-primary/5" : "text-muted-foreground"
        )}>
          <div className="flex items-center gap-3">
            <Icon className={cn("w-5 h-5", isGroupActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
            {label}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-2 pt-1 pl-4 space-y-1">
          {visibleItems.map((item) => {
            const isSubActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200",
                  isSubActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-4 h-4", isSubActive ? "text-white" : "text-muted-foreground/60")} />
                {item.name}
              </Link>
            );
          })}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <div className="flex flex-col w-64 bg-card border-r h-screen sticky top-0 z-50 transition-all duration-200">
      <div className="flex items-center px-6 h-20 border-b shrink-0">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-[0.9rem] bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10L12 4L21 10V20H3V10Z" />
              <path d="M8 12H16" />
              <path d="M8 15H16" />
              <path d="M8 18H16" />
            </svg>
          </div>
          <span className="font-headline font-black text-2xl tracking-tighter text-foreground">omborchi.uz</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-hide">
        <div className="flex gap-2 px-2 mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 justify-between h-9 text-[10px] font-black uppercase bg-muted/30 border-none rounded-xl">
                <Globe className="w-3.5 h-3.5" /> {language}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => setLanguage('uz')} className="gap-2 text-xs font-bold">🇺🇿 O'zbek</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('ru')} className="gap-2 text-xs font-bold">🇷🇺 Русский</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className="gap-2 text-xs font-bold">🇺🇸 English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>

        <Accordion type="multiple" defaultValue={[activeGroup]} className="space-y-2">
          {renderAccordionItem("analytics", t.nav.analyticsGroup, BarChart3, analyticsNavigation)}
          {renderAccordionItem("invoices", t.nav.invoices, FileText, invoiceNavigation)}
          {renderAccordionItem("inventory", t.nav.inventoryGroup, Package, inventoryNavigation)}
          {renderAccordionItem("finance", t.nav.financeGroup, Coins, financeNavigation)}
          {renderAccordionItem("admin", t.nav.systemGroup, Settings, adminNavigation)}
        </Accordion>
      </div>

      <div className="p-4 border-t shrink-0">
        <Link href="/profile">
          <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all cursor-pointer group bg-muted/20">
            <Avatar className="h-9 w-9 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black truncate group-hover:text-primary transition-colors">{user?.displayName || 'Xodim'}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">{role}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
