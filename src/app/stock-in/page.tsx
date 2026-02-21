
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, FileText, Loader2, Truck, ArrowRight, ScanLine, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Html5QrcodeScanner } from "html5-qrcode";
import { cn } from "@/lib/utils";

// Unique ID helper
const generateId = () => Math.random().toString(36).substring(2, 11);

export default function StockInPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ id: generateId(), productId: "", quantity: 1, price: 0 }]);
  const [dnNumber, setDnNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const productsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "products");
  }, [db]);
  const { data: products, isLoading: productsLoading } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, "warehouses");
  }, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const addItem = () => {
    setItems([...items, { id: generateId(), productId: "", quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      setItems([{ id: generateId(), productId: "", quantity: 1, price: 0 }]);
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Barcode Scanning logic
  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          const product = products?.find(p => p.sku === decodedText);
          if (product) {
            const existingItem = items.find(i => i.productId === product.id);
            if (existingItem) {
              updateItem(existingItem.id, "quantity", (existingItem.quantity || 0) + 1);
            } else {
              const lastItem = items[items.length - 1];
              if (!lastItem.productId) {
                updateItem(lastItem.id, "productId", product.id);
                updateItem(lastItem.id, "price", product.salePrice || 0);
              } else {
                setItems([...items, { id: generateId(), productId: product.id, quantity: 1, price: product.salePrice || 0 }]);
              }
            }
            toast({ title: "Mahsulot topildi", description: `${product.name} ro'yxatga qo'shildi.` });
            scanner.clear();
            setIsScannerOpen(false);
          } else {
            toast({ variant: "destructive", title: "Xatolik", description: "Mahsulot topilmadi (SKU: " + decodedText + ")" });
          }
        },
        (error) => {}
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Scanner clear error", e));
      }
    };
  }, [isScannerOpen, products]);

  const generatePDF = (data: any) => {
    const doc = new jsPDF();
    
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(95, 10, 20, 20, 4, 4, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.8);
    doc.line(100, 20, 105, 15); 
    doc.line(105, 15, 110, 20);
    doc.line(101, 20, 109, 20);
    doc.line(102, 20, 102, 25);
    doc.line(108, 20, 108, 25);

    doc.setFontSize(24);
    doc.setTextColor(40);
    doc.text("ombor.uz", 105, 40, { align: "center" });
    
    doc.setFontSize(14);
    doc.text("KIRIM NAKLADNOYI (Goods Receipt)", 105, 50, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Nakladnoy #: ${data.dnNumber}`, 15, 65);
    doc.text(`Sana: ${new Date().toLocaleString()}`, 15, 72);
    doc.text(`Yetkazib beruvchi: ${data.supplier}`, 15, 79);
    doc.text(`Ombor: ${data.warehouseName}`, 15, 86);
    doc.text(`Mas'ul: ${user?.displayName || user?.email}`, 15, 93);

    const tableData = data.items.map((item: any, idx: number) => [
      idx + 1,
      item.productName,
      item.quantity,
      `${(item.price || 0).toLocaleString()} so'm`,
      `${((item.quantity || 0) * (item.price || 0)).toLocaleString()} so'm`
    ]);

    (doc as any).autoTable({
      startY: 100,
      head: [['#', 'Mahsulot', 'Miqdor', 'Narx', 'Jami']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], halign: 'center' },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`JAMI QIYMAT: ${data.totalValue.toLocaleString()} so'm`, 195, finalY, { align: "right" });
    
    doc.setFontSize(9);
    doc.text("Qabul qildi: ___________________", 15, finalY + 20);
    doc.text("Topshirdi: ___________________", 140, finalY + 20);

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("ombor.uz orqali avtomatik shakllantirildi.", 105, 285, { align: "center" });
    doc.save(`Kirim_${data.dnNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleProcess = () => {
    // Enhanced Validation
    if (!dnNumber) {
      toast({ variant: "destructive", title: "Xatolik", description: "Yuk xati raqamini kiriting." });
      return;
    }
    if (!supplier) {
      toast({ variant: "destructive", title: "Xatolik", description: "Yetkazib beruvchini kiriting." });
      return;
    }
    if (!warehouseId) {
      toast({ variant: "destructive", title: "Xatolik", description: "Maqsadli omborni tanlang." });
      return;
    }
    if (items.some(i => !i.productId)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Ro'yxatdagi barcha mahsulotlarni tanlang." });
      return;
    }
    if (items.some(i => (i.quantity || 0) <= 0)) {
      toast({ variant: "destructive", title: "Xatolik", description: "Miqdor 0 dan katta bo'lishi shart." });
      return;
    }

    setLoading(true);
    const warehouseName = warehouses?.find(w => w.id === warehouseId)?.name || "Noma'lum";
    const receiptData = {
      dnNumber,
      supplier,
      warehouseName,
      totalValue: items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0),
      items: items.map(item => ({
        ...item,
        productName: products?.find(p => p.id === item.productId)?.name || "Mahsulot"
      }))
    };

    try {
      items.forEach((item) => {
        const movementData = {
          productId: item.productId,
          warehouseId: warehouseId,
          quantityChange: item.quantity,
          movementType: "StockIn",
          movementDate: new Date().toISOString(),
          responsibleUserId: user?.uid,
          dnNumber: dnNumber,
          supplier: supplier,
          unitPrice: item.price,
          totalPrice: (item.quantity || 0) * (item.price || 0),
        };
        addDocumentNonBlocking(collection(db, "stockMovements"), movementData);

        const product = products?.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(db, "products", item.productId);
          updateDocumentNonBlocking(productRef, {
            stock: (product.stock || 0) + (item.quantity || 0),
            updatedAt: new Date().toISOString()
          });
        }
      });

      toast({
        title: "Muvaffaqiyatli",
        description: "Nakladnoy saqlandi. Check yuklanmoqda...",
      });

      generatePDF(receiptData);
      setItems([{ id: generateId(), productId: "", quantity: 1, price: 0 }]);
      setDnNumber("");
      setSupplier("");
      setWarehouseId("");
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Tizim xatosi", description: "Saqlashda xatolik yuz berdi." });
    } finally {
      setLoading(false);
    }
  };

  const totalValue = items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="flex justify-between items-center mb-10">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.stockIn.title}</h1>
            <p className="text-muted-foreground mt-1 font-medium text-sm">{t.stockIn.description}</p>
          </motion.div>
          
          <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-2xl h-12 px-6 border-primary/20 bg-primary/5 text-primary font-black uppercase tracking-widest text-[10px]">
                <ScanLine className="w-4 h-4" /> {t.stockIn.scanBarcode}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md rounded-[2rem]">
              <DialogHeader>
                <DialogTitle>{t.stockIn.scanBarcode}</DialogTitle>
              </DialogHeader>
              <div id="reader" className="w-full overflow-hidden rounded-xl"></div>
            </DialogContent>
          </Dialog>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  {t.stockIn.dnDetails}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.dnNumber}</Label>
                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      placeholder="DN-2026-001" 
                      className="flex h-14 w-full pl-12 rounded-[1.5rem] bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all font-bold" 
                      value={dnNumber}
                      onChange={(e) => setDnNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.supplier}</Label>
                  <div className="relative group">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      placeholder="Yetkazib beruvchi nomi" 
                      className="flex h-14 w-full pl-12 rounded-[1.5rem] bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all font-bold" 
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.targetWarehouse}</Label>
                  <Select onValueChange={setWarehouseId} value={warehouseId}>
                    <SelectTrigger className="h-14 rounded-2xl bg-background/50 border-border/40 font-bold">
                      <SelectValue placeholder="Omborni tanlang" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-50">{t.stockIn.receiptDate}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="date" className="pl-12 h-14 rounded-2xl bg-background/50 border-border/40 font-bold" defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
              <CardHeader className="p-8 flex flex-row items-center justify-between">
                <CardTitle className="font-headline font-black text-xl tracking-tight">{t.stockIn.productItems}</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-2 rounded-xl font-black uppercase text-[9px] tracking-widest border-border/40 h-9 px-4">
                  <Plus className="w-4 h-4" /> {t.actions.addItem}
                </Button>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div 
                      key={item.id} 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "flex flex-col md:flex-row gap-4 p-6 rounded-[2rem] bg-muted/10 border transition-all group relative",
                        !item.productId && "border-rose-500/20 bg-rose-500/[0.02]",
                        item.productId && "border-border/10"
                      )}
                    >
                      <div className="flex-1 space-y-3">
                        <Label className={cn(
                          "text-[10px] font-black uppercase tracking-widest pl-2",
                          !item.productId ? "text-rose-500 opacity-100" : "opacity-40"
                        )}>
                          {t.common.product} {!item.productId && "*"}
                        </Label>
                        <Select 
                          onValueChange={(val) => {
                            const p = products?.find(prod => prod.id === val);
                            updateItem(item.id, "productId", val);
                            if (p) updateItem(item.id, "price", p.salePrice || 0);
                          }}
                          value={item.productId}
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-background/50 border-none font-bold">
                            <SelectValue placeholder={productsLoading ? t.products.loadingProducts : t.common.product + "..."} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[300px]">
                            {products?.length === 0 && (
                              <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {t.products.noProducts}
                              </div>
                            )}
                            {products?.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-full md:w-32 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">{t.common.quantity}</Label>
                        <Input 
                          type="number" 
                          className="h-12 rounded-xl bg-background/50 border-none font-black"
                          placeholder="0" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-full md:w-32 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest pl-2 opacity-40">{t.common.price}</Label>
                        <Input 
                          type="number" 
                          className="h-12 rounded-xl bg-background/50 border-none font-black"
                          placeholder="0.00" 
                          value={item.price}
                          onChange={(e) => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-xl hover:bg-rose-500/10 text-rose-500 self-end md:self-auto"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="border-none glass-card bg-primary text-white rounded-[3rem] shadow-2xl shadow-primary/20 sticky top-8 overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText className="w-32 h-32 rotate-12" />
              </div>
              <CardHeader className="p-8 pb-4">
                <CardTitle className="font-headline font-black text-2xl tracking-tight">{t.common.summary}</CardTitle>
                <CardDescription className="text-white/60 font-medium">Nakladnoy yakuni</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                  <span className="text-white/60 text-xs font-black uppercase tracking-widest">{t.common.totalItems}</span>
                  <span className="text-2xl font-black">{items.filter(i => i.productId).length}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-white/60 text-xs font-black uppercase tracking-widest">{t.common.totalValue}</p>
                  <p className="text-4xl font-black font-headline tracking-tighter">{totalValue.toLocaleString()} so'm</p>
                </div>
                <div className="pt-4 space-y-3">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <Truck className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-sm truncate">{supplier || '---'}</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                         <FileText className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-sm truncate">{dnNumber || '---'}</p>
                   </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                <Button 
                  className="w-full h-16 rounded-2xl bg-white text-primary hover:bg-white/90 font-black uppercase tracking-[0.2em] text-[12px] shadow-xl border-none premium-button" 
                  onClick={handleProcess} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><ArrowRight className="w-5 h-5 mr-3" /> {t.stockIn.process}</>}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
