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
  PlusCircle,
  Database,
  BarChart3,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Warehouses", href: "/warehouses", icon: Warehouse },
  { name: "Products", href: "/products", icon: Package },
  { name: "Stock In", href: "/stock-in", icon: Archive },
  { name: "Stock Out", href: "/stock-out", icon: Archive, rotate: 180 },
  { name: "Transfers", href: "/transfers", icon: ArrowRightLeft },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "System Gen", href: "/system-gen", icon: Database },
];

const adminNavigation = [
  { name: "User Management", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function OmniSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      <div className="flex items-center gap-2 px-6 h-16 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-headline font-bold">
          OS
        </div>
        <span className="font-headline font-bold text-xl tracking-tight text-primary">OmniStock</span>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div>
          <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-headline">
            Menu
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
            Administration
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