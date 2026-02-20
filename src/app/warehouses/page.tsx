
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Warehouse as WarehouseIcon, MapPin, Phone, User, MoreVertical, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export default function WarehousesPage() {
  const { t } = useLanguage();

  const warehouses = [
    { id: 1, name: "Main Hub - Tashkent", address: "Bunyodkor St. 12, Tashkent", manager: "Azamat Sharipov", phone: "+998 90 123 45 67", capacity: "92%" },
    { id: 2, name: "Fergana Regional", address: "Mustaqillik Blvd 45, Fergana", manager: "Nodira Rahimova", phone: "+998 93 456 78 90", capacity: "45%" },
    { id: 3, name: "Samarkand Hub", address: "Registan St. 88, Samarkand", manager: "Sardor Alimov", phone: "+998 97 789 01 23", capacity: "78%" },
    { id: 4, name: "Bukhara Distribution", address: "Old City 12, Bukhara", manager: "Umida Karimova", phone: "+998 99 234 56 78", capacity: "12%" },
  ];

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.warehouses.title}</h1>
            <p className="text-muted-foreground mt-1">{t.warehouses.description}</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> {t.warehouses.addNew}
          </Button>
        </header>

        <div className="mb-6 flex gap-4">
          <Input placeholder={t.warehouses.search} className="max-w-md bg-card" />
          <Button variant="outline">{t.actions.filter}</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {warehouses.map((w) => (
            <Card key={w.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg font-headline font-bold">{w.name}</CardTitle>
                  <div className="flex items-center text-xs text-muted-foreground gap-1">
                    <MapPin className="w-3 h-3" /> {w.address}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" /> <span>{t.warehouses.manager}:</span>
                    </div>
                    <span className="font-medium">{w.manager}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" /> <span>{t.warehouses.contact}:</span>
                    </div>
                    <span className="font-medium">{w.phone}</span>
                  </div>
                  <div className="pt-4 border-t mt-4 flex justify-between items-center">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t.warehouses.utilization}</p>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            parseInt(w.capacity) > 80 ? "bg-red-500" : parseInt(w.capacity) > 50 ? "bg-orange-500" : "bg-green-500"
                          )} 
                          style={{ width: w.capacity }} 
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-bold">{w.capacity}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
