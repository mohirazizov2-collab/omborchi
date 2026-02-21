
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { ClipboardCheck, Search, ScanLine, Loader2, Save, AlertTriangle, CheckCircle2, History } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Html5QrcodeScanner } from "html5-qrcode";
import { cn } from "@/lib/utils";

export default function InventoryAuditPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [auditData, setAuditData] = useState<Record<string, number>>({});
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const isAdmin = role === "Super Admin" || role === "Admin";

  const productsQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "products");
  }, [db, user]);
  const { data: products, isLoading } = useCollection(productsQuery);

  const filteredProducts = useMemo(() => {
    return products?.filter(p => {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];
  }, [products, searchQuery]);

  const handleAuditChange = (productId: string, val: string) => {
    const num = parseInt(val) || 0;
    setAuditData(prev => ({ ...prev, [productId]: num }));
  };

  const handleReconcile = (product: any) => {
    if (!db || !user) return;
    const physicalCount = auditData[product.id];
    if (physicalCount === undefined) return;

    const discrepancy = physicalCount - (product.stock || 0);
    if (discrepancy === 0) {
      toast({ title: "Xabar", description: "Zaxira allaqachon to'g'ri." });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Log the adjustment movement
      const movementData = {
        productId: product.id,
        warehouseId: "Central", // Ideally select warehouse
        quantityChange: discrepancy,
        movementType: "Adjustment",
        movementDate: new Date().toISOString(),
        responsibleUserId: user.uid,
        description: `Inventory Audit Adjustment. System: ${product.stock}, Physical: ${physicalCount}`
      };
      addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

      // 2. Update product stock
      const productRef = doc(db, "products", product.id);
      updateDocumentNonBlocking(productRef, {
        stock: physicalCount,
        updatedAt: new Date().toISOString()
      });

      toast({
        title: t.inventoryAudit.success,
        description: `${product.name} zaxirasi ${physicalCount} ga o'zgartirildi.`,
      });

      // Clear local state for this product
      const newAuditData = { ...auditData };
      delete newAuditData[product.id];
      setAuditData(newAuditData);
    } finally {
      setIsSaving(false);
    }
  };

  // Barcode Scanning logic
  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader-audit",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          const product = products?.find(p => p.sku === decodedText);
          if (product) {
            setSearchQuery(product.sku);
            toast({ title: "Mahsulot topildi", description: product.name });
            scanner.clear();
            setIsScannerOpen(false);
          } else {
            toast({ variant: "destructive", title: "Xatolik", description: "Topilmadi: " + decodedText });
          }
        },
        (error) => {}
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Scanner error", e));
      }
    };
  }, [isScannerOpen, products]);

  if (!isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 p-6 md:p-10 overflow-y-auto page-transition"
      >
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black font-headline tracking-tighter text-foreground">{t.inventoryAudit.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">{t.inventoryAudit.description}</p>
          </div>
          
          <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl premium-button shadow-xl shadow-primary/20 bg-primary text-white border-none">
                <ScanLine className="w-4 h-4" /> {t.inventoryAudit.scanToAudit}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-md p-8 shadow-2xl">
              <DialogHeader>
                <DialogTitle>{t.inventoryAudit.scanToAudit}</DialogTitle>
              </DialogHeader>
              <div id="reader-audit" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/20"></div>
            </DialogContent>
          </Dialog>
        </header>

        <Card className="border-none glass-card mb-8 bg-card/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                placeholder={t.products.search} 
                className="pl-12 h-12 rounded-2xl bg-background/50 border-border/40 focus:border-primary/50 transition-all font-medium" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((p: any, idx) => {
                const physical = auditData[p.id] ?? p.stock;
                const discrepancy = physical - (p.stock || 0);
                
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[2rem] hover:bg-card/60 transition-all group overflow-hidden">
                      <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <ClipboardCheck className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-lg tracking-tight truncate max-w-[200px]">{p.name}</h3>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">{p.sku}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-center md:text-right">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.inventoryAudit.systemStock}</p>
                            <p className="text-xl font-black font-headline">{p.stock || 0}</p>
                          </div>

                          <div className="w-32">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.inventoryAudit.physicalStock}</p>
                            <Input 
                              type="number"
                              className="h-10 rounded-xl bg-background/50 border-border/40 font-black text-center"
                              value={auditData[p.id] ?? ""}
                              placeholder={p.stock.toString()}
                              onChange={(e) => handleAuditChange(p.id, e.target.value)}
                            />
                          </div>

                          <div className="text-center md:text-right min-w-[80px]">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{t.inventoryAudit.discrepancy}</p>
                            <p className={cn(
                              "text-xl font-black font-headline",
                              discrepancy > 0 ? "text-emerald-500" : discrepancy < 0 ? "text-rose-500" : "text-muted-foreground opacity-30"
                            )}>
                              {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
                            </p>
                          </div>

                          <Button 
                            onClick={() => handleReconcile(p)}
                            disabled={discrepancy === 0 || isSaving}
                            className={cn(
                              "rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] transition-all",
                              discrepancy !== 0 ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground opacity-20"
                            )}
                          >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> {t.inventoryAudit.reconcile}</>}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredProducts.length === 0 && (
              <div className="py-32 text-center opacity-10">
                <ClipboardCheck className="w-20 h-20 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.5em]">Mahsulotlar topilmadi</p>
              </div>
            )}
          </div>
        )}
      </motion.main>
    </div>
  );
}
