
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Warehouse as WarehouseIcon, MapPin, Phone, User, MoreVertical, Plus, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

export default function WarehousesPage() {
  const { t } = useLanguage();
  const db = useFirestore();

  const warehousesQuery = useMemoFirebase(() => collection(db, "warehouses"), [db]);
  const { data: warehouses, isLoading } = useCollection(warehousesQuery);

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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {warehouses && warehouses.map((w: any) => (
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
                      <span className="font-medium">{w.responsibleUserId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" /> <span>{t.warehouses.contact}:</span>
                      </div>
                      <span className="font-medium">{w.phoneNumber}</span>
                    </div>
                    <div className="pt-4 border-t mt-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">{t.warehouses.utilization}</p>
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-primary"
                            style={{ width: "0%" }} 
                          />
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-bold">0%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!warehouses || warehouses.length === 0) && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl border-muted">
                <p className="text-muted-foreground">Hozircha omborlar yo'q. Birinchi omborni qo'shing!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
