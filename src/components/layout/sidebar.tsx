
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="flex flex-col w-72 bg-card/40 backdrop-blur-2xl border-r h-screen sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 h-20">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20"
          >
            <Warehouse className="w-6 h-6 text-white" />
          </motion.div>
          <div className="flex flex-col">
            <span className="font-headline font-black text-xl tracking-tighter text-foreground leading-none">omborchi.uz</span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-black mt-1">Enterprise Edition</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div className="flex gap-2 px-2">
          <div className="flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between gap-2 bg-muted/40 border-none h-10 hover:bg-muted/60 rounded-xl premium-button">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-black uppercase tracking-wider">{language}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 rounded-xl border-none shadow-2xl bg-popover/80 backdrop-blur-xl">
                {languages.map((l) => (
                  <DropdownMenuItem 
                    key={l.code} 
                    onClick={() => setLanguage(l.code as any)}
                    className={cn("gap-2 rounded-lg py-2 cursor-pointer transition-all", language === l.code && "bg-primary/10 text-primary font-bold")}
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

        <div className="space-y-6">
          <section>
            <h3 className="px-4 mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] font-headline opacity-50">
              {t.nav.menu}
            </h3>
            <nav className="space-y-1">
              {navigation.filter(item => !item.hide).map((item, idx) => {
                const isActive = pathname === item.href;
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all relative group",
                        isActive
                          ? "text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)] bg-primary/5"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <AnimatePresence>
                        {isActive && (
                          <motion.div 
                            layoutId="sidebar-active"
                            className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          />
                        )}
                      </AnimatePresence>
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <item.icon
                            className={cn(
                              "w-5 h-5 transition-colors",
                              item.rotate && "rotate-180",
                              isActive ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary"
                            )}
                          />
                        </motion.div>
                        {item.name}
                      </div>
                      {isActive && (
                        <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 0.5, x: 0 }}>
                          <ChevronRight className="w-4 h-4" />
                        </motion.div>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>
          </section>

          {isAdmin && (
            <section className="pt-2">
              <h3 className="px-4 mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] font-headline opacity-50">
                {t.nav.administration}
              </h3>
              <nav className="space-y-1">
                {adminNavigation.filter(item => !item.hide).map((item, idx) => {
                  const isActive = pathname === item.href;
                  return (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (navigation.length + idx) * 0.03 }}
                    >
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all relative group",
                          isActive
                            ? "text-primary shadow-[inset_0_0_0_1px_rgba(var(--primary),0.1)] bg-primary/5"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <AnimatePresence>
                          {isActive && (
                            <motion.div 
                              layoutId="sidebar-active"
                              className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                            />
                          )}
                        </AnimatePresence>
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ x: 3 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            <item.icon
                              className={cn(
                                "w-5 h-5 transition-colors",
                                isActive ? "text-primary" : "text-muted-foreground/50 group-hover:text-primary"
                              )}
                            />
                          </motion.div>
                          {item.name}
                        </div>
                        {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>
            </section>
          )}
        </div>
      </div>

      <div className="p-4 mt-auto">
        <Link href="/profile">
          <motion.div 
            whileHover={{ scale: 1.02, y: -2 }}
            className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-all border border-white/5 hover:border-primary/20 group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-background shadow-xl">
                <AvatarFallback className="bg-primary/10 text-primary font-black">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-black truncate group-hover:text-primary transition-colors text-foreground">{user?.displayName || (user?.email?.split('@')[0] || 'User')}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{role}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
