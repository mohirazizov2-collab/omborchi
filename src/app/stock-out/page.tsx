"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2, Plus, Loader2, Search, Download,
  CheckCircle2, FileOutput, AlertTriangle, ArrowRight, Info,
  RefreshCw, X, Save, LogOut,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { generateInvoicePDF } from "@/services/pdf-service";

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

async function getNextOrderNumber(db: any): Promise<string> {
  const counterRef = doc(db, "counters", "stockOut");
  try {
    const next = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(counterRef);
      const current = snap.exists() ? (snap.data().lastNumber || 0) : 0;
      const nextNum = current + 1;
      transaction.set(counterRef, { lastNumber: nextNum }, { merge: true });
      return nextNum;
    });
    return `AO-${String(next).padStart(4, "0")}`;
  } catch {
    return `AO-${Date.now().toString().slice(-4)}`;
  }
}

// iiko product tabs
const PRODUCT_TABS = [
  { key: "all", label: "Все" },
  { key: "goods", label: "Товары" },
  { key: "dishes", label: "Блюда" },
  { key: "preparations", label: "Заготовки" },
  { key: "services", label: "Услуги" },
  { key: "modifiers", label: "Модификаторы" },
] as const;

type ProductTab = typeof PRODUCT_TABS[number]["key"];

// VAT rates
const VAT_RATES = ["0%", "12%", "20%", "Без НДС"];

// Concept options
const CONCEPTS = ["Столовая", "Ресторан", "Кафе", "Бар", "Фастфуд"];

// Revenue / expense accounts
const REVENUE_ACCOUNTS = ["Торговая выручка", "Прочие доходы", "Оптовая выручка"];
const EXPENSE_ACCOUNTS = ["Расход продуктов", "Себестоимость продаж", "Прочие расходы"];

interface StockItem {
  id: string;
  productId: string;
  searchQuery: string;
  size: string;
  inPackage: number;
  inUnit: number;
  pricePerPackage: number;
  price: number;
  discount: number;
  vatRate: string;
  writeoffCoeff: number;
  itemComment: string;
}

export default function StockOutPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const { user, role, assignedWarehouseId } = useUser();

  // Tabs
  const [activeTab, setActiveTab] = useState<"properties" | "delivery">("properties");
  const [productTab, setProductTab] = useState<ProductTab>("all");

  // Loading
  const [loading, setLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  // iiko Основные свойства fields
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [concept, setConcept] = useState("");
  const [docComment, setDocComment] = useState("");

  // iiko right-side fields
  const [buyerType, setBuyerType] = useState("Поставщик");
  const [recipient, setRecipient] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [shipFromWarehouse, setShipFromWarehouse] = useState(true);
  const [revenueAccount, setRevenueAccount] = useState("Торговая выручка");
  const [expenseAccount, setExpenseAccount] = useState("Расход продуктов");

  // Items
  const [items, setItems] = useState<StockItem[]>([
    {
      id: generateId(), productId: "", searchQuery: "",
      size: "шт", inPackage: 1, inUnit: 1,
      pricePerPackage: 0, price: 0,
      discount: 0, vatRate: "Без НДС",
      writeoffCoeff: 1, itemComment: "",
    },
  ]);

  // Dialogs
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [processedInvoice, setProcessedInvoice] = useState<any>(null);

  const isAdmin = role === "Super Admin" || role === "Admin";

  useEffect(() => {
    if (!db) return;
    setOrderLoading(true);
    getNextOrderNumber(db).then((num) => setOrderNumber(num)).finally(() => setOrderLoading(false));
  }, [db]);

  useEffect(() => {
    if (!isAdmin && assignedWarehouseId) setWarehouseId(assignedWarehouseId);
  }, [isAdmin, assignedWarehouseId]);

  const productsQuery = useMemoFirebase(() => db ? collection(db, "products") : null, [db]);
  const { data: products } = useCollection(productsQuery);

  const warehousesQuery = useMemoFirebase(() => db ? collection(db, "warehouses") : null, [db]);
  const { data: warehouses } = useCollection(warehousesQuery);

  const inventoryQuery = useMemoFirebase(() => db ? collection(db, "inventory") : null, [db]);
  const { data: inventory } = useCollection(inventoryQuery);

  const formatMoney = (val: number) =>
    val.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStockForProduct = useCallback(
    (pId: string) => {
      if (!warehouseId || !pId || !inventory) return 0;
      const inv = inventory.find(i => i.warehouseId === warehouseId && i.productId === pId);
      return inv ? inv.stock || 0 : 0;
    },
    [warehouseId, inventory]
  );

  // Filter products by active tab
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (productTab === "all") return products;
    return products.filter(p => (p.category || "goods") === productTab);
  }, [products, productTab]);

  const addItem = () => setItems(prev => [...prev, {
    id: generateId(), productId: "", searchQuery: "",
    size: "шт", inPackage: 1, inUnit: 1,
    pricePerPackage: 0, price: 0,
    discount: 0, vatRate: "Без НДС",
    writeoffCoeff: 1, itemComment: "",
  }]);

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === "productId" && value) {
        const p = products?.find(prod => prod.id === value);
        if (p) {
          updated.price = p.salePrice || 0;
          updated.pricePerPackage = p.salePrice || 0;
          updated.size = p.unit || "шт";
        }
      }
      // inPackage => inUnit sync (1:1 default)
      if (field === "inPackage") updated.inUnit = value * updated.writeoffCoeff;
      if (field === "writeoffCoeff") updated.inUnit = updated.inPackage * value;
      return updated;
    }));
  };

  // Calculations per row
  const getRowCalc = (item: StockItem) => {
    const qty = item.inUnit || 0;
    const price = item.price || 0;
    const gross = qty * price;
    const discountAmt = (gross * (item.discount || 0)) / 100;
    const afterDiscount = gross - discountAmt;
    const vatPct = item.vatRate === "Без НДС" || item.vatRate === "0%"
      ? 0
      : parseFloat(item.vatRate) || 0;
    const vatAmt = (afterDiscount * vatPct) / (100 + vatPct);
    const amountNoVat = afterDiscount - vatAmt;
    const stock = getStockForProduct(item.productId);
    const stockAfter = stock - qty;
    const product = products?.find(p => p.id === item.productId);
    const costPerUnit = product?.costPrice || 0;
    const costTotal = qty * costPerUnit;
    return {
      gross, discountAmt, afterDiscount,
      vatAmt, amountNoVat,
      stockBefore: stock, stockAfter,
      costPerUnit, costTotal,
    };
  };

  const validation = useMemo(() => {
    const errors: string[] = [];
    const itemErrors: Record<string, string> = {};
    if (!warehouseId) errors.push("Omborni tanlang.");
    if (!recipient.trim()) errors.push("Mijoz nomini kiriting.");
    items.forEach(item => {
      if (!item.productId) {
        itemErrors[item.id] = "Mahsulot tanlanmagan";
      } else {
        const stock = getStockForProduct(item.productId);
        if (item.inUnit <= 0) itemErrors[item.id] = "Miqdor noto'g'ri";
        else if (item.inUnit > stock) itemErrors[item.id] = `Zaxira yetarli emas (Mavjud: ${stock})`;
      }
    });
    return { isValid: errors.length === 0 && Object.keys(itemErrors).length === 0, errors, itemErrors };
  }, [items, warehouseId, recipient, getStockForProduct]);

  const totals = useMemo(() => {
    let gross = 0, discount = 0, vat = 0, noVat = 0, cost = 0;
    items.forEach(item => {
      const c = getRowCalc(item);
      gross += c.gross;
      discount += c.discountAmt;
      vat += c.vatAmt;
      noVat += c.amountNoVat;
      cost += c.costTotal;
    });
    return { gross, discount, vat, noVat, net: gross - discount, cost };
  }, [items, getStockForProduct, products]);

  const handlePreDispatch = () => {
    if (!validation.isValid) {
      toast({ variant: "destructive", title: "Xatolik", description: validation.errors[0] || "Jadvaldagi xatoliklarni to'g'rilang." });
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleFinalProcess = async () => {
    setIsConfirmOpen(false);
    setLoading(true);
    const saleId = orderNumber;
    try {
      const invoiceItems: any[] = [];
      const currentUserName = user?.displayName || user?.email || "Noma'lum";

      for (const item of items) {
        const product = products?.find(p => p.id === item.productId);
        const { inUnit } = item;
        const invId = `${warehouseId}_${item.productId}`;
        const invRef = doc(db, "inventory", invId);
        const calc = getRowCalc(item);

        invoiceItems.push({
          name: product?.name || "Noma'lum",
          sku: product?.sku || "",
          quantity: inUnit,
          price: item.price,
          discount: item.discount,
          vatRate: item.vatRate,
          vatAmount: calc.vatAmt,
          total: calc.afterDiscount,
          unit: product?.unit || "шт",
          costPerUnit: calc.costPerUnit,
          costTotal: calc.costTotal,
        });

        addDocumentNonBlocking(collection(db, "stockMovements"), {
          productId: item.productId,
          productName: product?.name || "Noma'lum",
          warehouseId,
          warehouseName: warehouses?.find(w => w.id === warehouseId)?.name || "Noma'lum",
          quantityChange: -inUnit,
          movementType: "StockOut",
          movementDate: orderDate || new Date().toISOString(),
          responsibleUserId: user?.uid,
          responsibleUserName: currentUserName,
          orderNumber: saleId,
          recipient,
          buyerType,
          concept,
          revenueAccount,
          expenseAccount,
          saleId,
          unitPrice: item.price,
          discount: item.discount,
          vatRate: item.vatRate,
          totalPrice: calc.afterDiscount,
          unit: product?.unit || "шт",
        });

        if (product) {
          updateDocumentNonBlocking(doc(db, "products", item.productId), {
            stock: (product.stock || 0) - inUnit,
            updatedAt: new Date().toISOString(),
          });
        }

        const invSnap = await getDoc(invRef);
        if (invSnap.exists()) {
          updateDocumentNonBlocking(invRef, {
            stock: (invSnap.data().stock || 0) - inUnit,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await setDoc(invRef, {
            id: invId, warehouseId, productId: item.productId,
            stock: -inUnit, updatedAt: new Date().toISOString(),
          });
        }
      }

      setProcessedInvoice({
        orderNumber: saleId, recipient, buyerType, concept,
        warehouse: warehouses?.find(w => w.id === warehouseId)?.name,
        date: orderDate, items: invoiceItems,
        responsible: currentUserName, totals,
      });

      toast({ title: "Chiqim nakladnoyi", description: `${saleId} — muvaffaqiyatli bajarildi.` });
      setIsSuccessOpen(true);
      setItems([{
        id: generateId(), productId: "", searchQuery: "",
        size: "шт", inPackage: 1, inUnit: 1,
        pricePerPackage: 0, price: 0,
        discount: 0, vatRate: "Без НДС",
        writeoffCoeff: 1, itemComment: "",
      }]);
      setRecipient("");
      if (isAdmin) setWarehouseId("");
      const next = await getNextOrderNumber(db);
      setOrderNumber(next);
    } catch (err: any) {
      toast({
        variant: "destructive", title: "Xatolik",
        description: err?.code === "permission-denied" ? "Ruxsat yo'q." : "Chiqimni saqlashda xatolik.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!processedInvoice) return;
    const currencyStr = t.settings.currency.split(" ")[0];
    await generateInvoicePDF({
      title: "Расходная накладная", type: "out",
      docNumber: processedInvoice.orderNumber, date: processedInvoice.date,
      partyName: `${processedInvoice.recipient} (${processedInvoice.buyerType})`,
      partyTypeLabel: "Покупатель",
      warehouseName: processedInvoice.warehouse, responsibleName: processedInvoice.responsible,
      items: processedInvoice.items, currency: currencyStr,
      labels: {
        number: "Номер документа", date: "Дата", warehouse: "Склад",
        product: "Наименование", qty: "Кол-во", unit: "Ед.",
        price: "Цена", total: "Сумма", grandTotal: "Итого",
        shippedBy: "Отпустил", receivedBy: "Получил",
      },
    });
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* iiko-style header */}
        <div className="px-6 pt-5 pb-0 border-b border-border/20 bg-card/30">
          <h1 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2 mb-3">
            <FileOutput className="w-5 h-5 text-rose-600" />
            Расходная накладная №{orderLoading ? "..." : orderNumber}
            <span className="text-muted-foreground font-normal text-sm ml-1">
              от {new Date(orderDate).toLocaleDateString("ru-RU")}
            </span>
          </h1>

          {/* Tabs */}
          <div className="flex gap-0">
            {[
              { key: "properties", label: "Основные свойства" },
              { key: "delivery", label: "Доставка и оплата" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  "px-5 py-2.5 text-sm font-bold border-t border-x border-border/30 rounded-t-lg transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground border-b-transparent -mb-px z-10"
                    : "bg-muted/20 text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ===== TAB 1: Основные свойства ===== */}
          {activeTab === "properties" && (
            <div className="p-6 space-y-4">
              <Card className="border border-border/30 rounded-xl bg-card/50">
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                    {/* LEFT column */}
                    <div className="space-y-3">
                      {/* Номер документа */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Номер документа:</Label>
                        <div className="relative flex-1">
                          {orderLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-rose-500" />}
                          <Input
                            className="h-8 text-sm font-mono font-bold bg-background/80 border-border/40 rounded-lg"
                            value={orderNumber}
                            onChange={e => setOrderNumber(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Дата и время */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Дата и время выдачи:</Label>
                        <Input
                          type="datetime-local"
                          className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg"
                          value={orderDate}
                          onChange={e => setOrderDate(e.target.value)}
                        />
                      </div>

                      {/* Концепция */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Концепция:</Label>
                        <Select value={concept} onValueChange={setConcept}>
                          <SelectTrigger className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg">
                            <SelectValue placeholder="Выберите концепцию" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {CONCEPTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Комментарий */}
                      <div className="flex items-start gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0 mt-2">Комментарий:</Label>
                        <Select value={docComment} onValueChange={setDocComment}>
                          <SelectTrigger className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg">
                            <SelectValue placeholder="" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">—</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 shrink-0" />
                        <Select>
                          <SelectTrigger className="h-8 text-sm w-36 bg-background/80 border-border/40 rounded-lg font-bold">
                            <SelectValue placeholder="Действия" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="copy">Копировать</SelectItem>
                            <SelectItem value="print">Распечатать</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* RIGHT column */}
                    <div className="space-y-3">
                      {/* Тип покупателя */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Тип покупателя:</Label>
                        <Select value={buyerType} onValueChange={setBuyerType}>
                          <SelectTrigger className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {["Поставщик", "Сотрудник", "Гость", "Юридическое лицо", "Другое"].map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Покупатель */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Покупатель:</Label>
                        <div className="flex flex-1 gap-1">
                          <Input
                            className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg font-bold"
                            placeholder="Введите покупателя"
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                          />
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border/40 shrink-0">
                            <Search className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Отгрузить со склада */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Отгрузить со склада:</Label>
                        <div className="flex flex-1 items-center gap-2">
                          <Checkbox
                            checked={shipFromWarehouse}
                            onCheckedChange={v => setShipFromWarehouse(!!v)}
                            className="border-border/60"
                          />
                          <Select
                            value={warehouseId}
                            onValueChange={setWarehouseId}
                            disabled={!shipFromWarehouse || (!isAdmin && !!assignedWarehouseId)}
                          >
                            <SelectTrigger className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg">
                              <SelectValue placeholder="Выберите склад" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {warehouses?.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border/40 shrink-0">
                            <Search className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Счет выручки */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Счет выручки:</Label>
                        <div className="flex flex-1 gap-1">
                          <Select value={revenueAccount} onValueChange={setRevenueAccount}>
                            <SelectTrigger className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {REVENUE_ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border/40 shrink-0">
                            <Search className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Расходный счет */}
                      <div className="flex items-center gap-3">
                        <Label className="w-44 text-xs text-right text-muted-foreground shrink-0">Расходный счет:</Label>
                        <div className="flex flex-1 gap-1">
                          <Select value={expenseAccount} onValueChange={setExpenseAccount}>
                            <SelectTrigger className="h-8 text-sm flex-1 bg-background/80 border-border/40 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {EXPENSE_ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-border/40 shrink-0">
                            <Search className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ===== Product tabs ===== */}
              <Card className="border border-border/30 rounded-xl bg-card/50 overflow-hidden">
                {/* Tab strip */}
                <div className="flex border-b border-border/20 bg-muted/10 px-4 pt-3 gap-1 flex-wrap">
                  {PRODUCT_TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setProductTab(tab.key)}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x border-border/20",
                        productTab === tab.key
                          ? "bg-background text-foreground border-b-transparent -mb-px z-10"
                          : "bg-transparent text-muted-foreground hover:text-foreground border-transparent"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <div className="ml-auto pb-2">
                    <Button
                      onClick={addItem}
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px] font-black uppercase tracking-widest rounded-lg border-rose-600/20 text-rose-600 hover:bg-rose-600/5"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
                    </Button>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/30 border-b border-border/20">
                      <tr>
                        <th className="px-3 py-2.5 text-center font-black uppercase text-muted-foreground w-8">№</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-16">Код у нас</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24">Штрихкод</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground min-w-[200px]">Наименование</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-20">Размер</th>
                        {/* Уход со склада */}
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-20 text-center bg-blue-500/5">В таре</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-20 text-center bg-blue-500/5">В ед.</th>
                        {/* Реализовано */}
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24 text-right bg-emerald-500/5">Цена за ед.</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24 text-right bg-emerald-500/5">Сумма, р.</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-20 text-right bg-emerald-500/5">Скидка, р.</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-16 text-center bg-amber-500/5">НДС %</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-20 text-right bg-amber-500/5">НДС р.</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24 text-right bg-emerald-500/5">Без НДС</th>
                        {/* Себестоимость */}
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-16 text-center bg-purple-500/5">Коэф.</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24 text-right bg-purple-500/5">Себест. р.</th>
                        {/* Остатки */}
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24 text-center bg-rose-500/5">До отгр.</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-24 text-center bg-rose-500/5">После</th>
                        <th className="px-2 py-2.5 font-black uppercase text-muted-foreground w-28">Коммент.</th>
                        <th className="px-2 py-2.5 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      <AnimatePresence mode="popLayout">
                        {items.map((item, index) => {
                          const product = products?.find(p => p.id === item.productId);
                          const calc = getRowCalc(item);
                          const hasError = validation.itemErrors[item.id];

                          return (
                            <motion.tr
                              key={item.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className={cn(
                                "hover:bg-muted/5 group transition-colors",
                                hasError && "bg-rose-500/[0.03]"
                              )}
                            >
                              {/* № */}
                              <td className="px-3 py-1.5 text-center font-bold text-muted-foreground">{index + 1}</td>

                              {/* Код у нас (SKU) */}
                              <td className="px-2 py-1.5 font-mono text-muted-foreground text-[11px]">
                                {product?.sku || "—"}
                              </td>

                              {/* Штрихкод */}
                              <td className="px-2 py-1.5 font-mono text-muted-foreground text-[11px]">
                                {product?.barcode || "—"}
                              </td>

                              {/* Наименование */}
                              <td className="px-2 py-1.5">
                                <div className="space-y-0.5">
                                  <Select onValueChange={(val) => updateItem(item.id, "productId", val)} value={item.productId}>
                                    <SelectTrigger className={cn(
                                      "h-8 text-xs rounded-lg bg-background/50 border-border/40 font-bold",
                                      !item.productId && "border-dashed"
                                    )}>
                                      <SelectValue placeholder="Выберите товар" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl max-h-[300px]">
                                      <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border/10">
                                        <div className="relative">
                                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                          <Input
                                            placeholder="Поиск..."
                                            className="h-8 pl-8 text-xs rounded-lg"
                                            value={item.searchQuery}
                                            onChange={e => updateItem(item.id, "searchQuery", e.target.value)}
                                            onClick={e => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      {filteredProducts
                                        ?.filter(p =>
                                          p.name.toLowerCase().includes(item.searchQuery.toLowerCase()) ||
                                          (p.sku && p.sku.toLowerCase().includes(item.searchQuery.toLowerCase()))
                                        )
                                        .map(p => (
                                          <SelectItem key={p.id} value={p.id} className="text-xs font-bold">
                                            {p.name} {p.sku ? `(${p.sku})` : ""}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  {hasError && (
                                    <p className="text-[9px] font-black text-rose-600 flex items-center gap-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5" /> {hasError}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Размер */}
                              <td className="px-2 py-1.5">
                                <Input
                                  className="h-8 text-xs rounded-lg bg-background/50 border-border/40 font-bold w-16"
                                  value={item.size}
                                  onChange={e => updateItem(item.id, "size", e.target.value)}
                                />
                              </td>

                              {/* В таре */}
                              <td className="px-2 py-1.5 bg-blue-500/[0.02]">
                                <Input
                                  type="number" min={0}
                                  className="h-8 text-xs rounded-lg bg-background/50 border-border/40 font-black text-center w-18"
                                  value={item.inPackage}
                                  onChange={e => updateItem(item.id, "inPackage", parseFloat(e.target.value) || 0)}
                                />
                              </td>

                              {/* В ед. */}
                              <td className="px-2 py-1.5 bg-blue-500/[0.02]">
                                <Input
                                  type="number" min={0}
                                  className={cn(
                                    "h-8 text-xs rounded-lg bg-background/50 border-border/40 font-black text-center w-18",
                                    item.inUnit > calc.stockBefore && "border-rose-500 text-rose-600"
                                  )}
                                  value={item.inUnit}
                                  onChange={e => updateItem(item.id, "inUnit", parseFloat(e.target.value) || 0)}
                                />
                              </td>

                              {/* Цена за ед. */}
                              <td className="px-2 py-1.5 bg-emerald-500/[0.02]">
                                <Input
                                  type="number" min={0}
                                  className="h-8 text-xs rounded-lg bg-background/50 border-border/40 font-black text-right w-20"
                                  value={item.price}
                                  onChange={e => updateItem(item.id, "price", parseFloat(e.target.value) || 0)}
                                />
                              </td>

                              {/* Сумма */}
                              <td className="px-2 py-1.5 text-right font-black bg-emerald-500/[0.02]">
                                {formatMoney(calc.gross)}
                              </td>

                              {/* Скидка % */}
                              <td className="px-2 py-1.5 bg-emerald-500/[0.02]">
                                <Input
                                  type="number" min={0} max={100}
                                  className="h-8 text-xs rounded-lg bg-background/50 border-border/40 font-black text-right w-16"
                                  value={item.discount}
                                  onChange={e => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                                />
                              </td>

                              {/* НДС ставка */}
                              <td className="px-2 py-1.5 bg-amber-500/[0.02]">
                                <Select value={item.vatRate} onValueChange={v => updateItem(item.id, "vatRate", v)}>
                                  <SelectTrigger className="h-8 text-xs rounded-lg bg-background/50 border-border/40 font-bold w-20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    {VAT_RATES.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </td>

                              {/* НДС р. */}
                              <td className="px-2 py-1.5 text-right font-black text-amber-600 bg-amber-500/[0.02]">
                                {formatMoney(calc.vatAmt)}
                              </td>

                              {/* Сумма без НДС */}
                              <td className="px-2 py-1.5 text-right font-black bg-emerald-500/[0.02]">
                                {formatMoney(calc.amountNoVat)}
                              </td>

                              {/* Коэф. списания */}
                              <td className="px-2 py-1.5 bg-purple-500/[0.02]">
                                <Input
                                  type="number" min={0} step={0.001}
                                  className="h-8 text-xs rounded-lg bg-background/50 border-border/40 font-black text-center w-16"
                                  value={item.writeoffCoeff}
                                  onChange={e => updateItem(item.id, "writeoffCoeff", parseFloat(e.target.value) || 1)}
                                />
                              </td>

                              {/* Себестоимость */}
                              <td className="px-2 py-1.5 text-right font-black text-purple-600 bg-purple-500/[0.02]">
                                {formatMoney(calc.costTotal)}
                              </td>

                              {/* Остаток до */}
                              <td className="px-2 py-1.5 text-center bg-rose-500/[0.02]">
                                <span className={cn(
                                  "inline-block px-2 py-0.5 rounded-lg text-[11px] font-black",
                                  calc.stockBefore <= 0 ? "bg-rose-500/10 text-rose-600"
                                    : calc.stockBefore < 10 ? "bg-amber-500/10 text-amber-600"
                                      : "bg-emerald-500/10 text-emerald-600"
                                )}>
                                  {calc.stockBefore.toFixed(3)}
                                </span>
                              </td>

                              {/* Остаток после */}
                              <td className="px-2 py-1.5 text-center bg-rose-500/[0.02]">
                                <span className={cn(
                                  "inline-block px-2 py-0.5 rounded-lg text-[11px] font-black",
                                  calc.stockAfter < 0 ? "bg-rose-500/10 text-rose-600" : "bg-muted/30 text-muted-foreground"
                                )}>
                                  {calc.stockAfter.toFixed(3)}
                                </span>
                              </td>

                              {/* Комментарий */}
                              <td className="px-2 py-1.5">
                                <Input
                                  className="h-8 text-xs rounded-lg bg-background/50 border-border/40 w-24"
                                  placeholder="—"
                                  value={item.itemComment}
                                  onChange={e => updateItem(item.id, "itemComment", e.target.value)}
                                />
                              </td>

                              {/* Delete */}
                              <td className="px-2 py-1.5">
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>

                      {/* Totals row */}
                      <tr className="bg-muted/20 font-black text-xs border-t-2 border-border/30">
                        <td colSpan={8} className="px-3 py-2 text-right text-muted-foreground">Итого:</td>
                        <td className="px-2 py-2 text-right">{formatMoney(totals.gross)}</td>
                        <td className="px-2 py-2 text-right text-rose-600">{formatMoney(totals.discount)}</td>
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-right text-amber-600">{formatMoney(totals.vat)}</td>
                        <td className="px-2 py-2 text-right">{formatMoney(totals.noVat)}</td>
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-right text-purple-600">{formatMoney(totals.cost)}</td>
                        <td colSpan={4} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* ===== iiko-style bottom warning + totals ===== */}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-rose-600 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  * Не было приходов товаров/ингредиентов на склад
                </p>
                <p className="text-sm font-black">
                  Общая сумма: <span className="text-rose-600">{formatMoney(totals.net)} р.</span>
                  <span className="text-muted-foreground font-normal ml-3 text-xs">
                    в том числе НДС: {formatMoney(totals.vat)} р.
                  </span>
                </p>
              </div>

              {/* ===== iiko-style action buttons ===== */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/20">
                <Button
                  variant="outline"
                  className="h-9 px-4 text-xs font-bold rounded-lg gap-1.5"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Обновить
                </Button>
                <Button
                  variant="outline"
                  className="h-9 px-4 text-xs font-bold rounded-lg gap-1.5"
                  onClick={handlePreDispatch}
                  disabled={loading || !validation.isValid}
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Сохранить
                </Button>
                <Button
                  variant="outline"
                  className="h-9 px-4 text-xs font-bold rounded-lg gap-1.5"
                  onClick={() => window.history.back()}
                >
                  <LogOut className="w-3.5 h-3.5" /> Выйти без сохранения
                </Button>
                <Button
                  className="h-9 px-5 text-xs font-black rounded-lg gap-1.5 bg-rose-600 text-white hover:bg-rose-700 border-none shadow-lg shadow-rose-600/20"
                  onClick={handlePreDispatch}
                  disabled={loading || !validation.isValid}
                >
                  {loading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <FileOutput className="w-3.5 h-3.5" />
                  }
                  Сохранить и закрыть
                </Button>
              </div>
            </div>
          )}

          {/* ===== TAB 2: Доставка и оплата ===== */}
          {activeTab === "delivery" && (
            <div className="p-6">
              <Card className="border border-border/30 rounded-xl bg-card/50">
                <CardContent className="p-6">
                  <p className="text-muted-foreground text-sm font-medium">
                    Доставка и оплата sozlamalari bu yerda bo'ladi.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ===== Confirm Dialog ===== */}
        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground max-w-lg p-8 shadow-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3">
                <Info className="w-7 h-7" />
              </div>
              <DialogTitle className="text-xl font-black tracking-tight">Tasdiqlash</DialogTitle>
              <p className="text-muted-foreground font-medium text-sm pt-1">Operatsiyani yakunlashdan oldin tekshiring.</p>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="p-4 rounded-2xl bg-muted/20 space-y-2.5 text-sm">
                {[
                  ["Hujjat №", <span className="font-black font-mono text-rose-600">{orderNumber}</span>],
                  ["Sana", new Date(orderDate).toLocaleString("ru-RU")],
                  ["Покупатель", recipient],
                  ["Склад", warehouses?.find(w => w.id === warehouseId)?.name],
                  ["Концепция", concept || "—"],
                  ["Mahsulotlar", `${items.filter(i => i.productId).length} та`],
                ].map(([label, val], i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-muted-foreground font-bold">{label}:</span>
                    <span className="font-black">{val as any}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-rose-600 font-black uppercase text-[10px] tracking-widest">Общая сумма</span>
                  <span className="text-xl font-black text-rose-600">{formatMoney(totals.net)} р.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-bold text-xs">в том числе НДС</span>
                  <span className="font-black text-amber-600">{formatMoney(totals.vat)} р.</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="rounded-xl h-11 font-bold px-5">
                Bekor qilish
              </Button>
              <Button
                onClick={handleFinalProcess}
                disabled={loading}
                className="rounded-xl h-11 flex-1 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Tasdiqlash <ArrowRight className="w-4 h-4" /></>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ===== Success Dialog ===== */}
        <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
          <DialogContent className="rounded-[2rem] border-white/5 bg-card/40 backdrop-blur-3xl text-foreground p-8 shadow-2xl text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight mb-1">Расходная накладная сохранена!</DialogTitle>
              <p className="text-muted-foreground font-medium text-sm">Chiqim nakladnoyi muvaffaqiyatli rasmiylashtirildi.</p>
              <p className="text-rose-600 font-black text-2xl mt-2 font-mono">{processedInvoice?.orderNumber}</p>
              {processedInvoice && (
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p>Общая сумма: <span className="font-black text-foreground">{formatMoney(processedInvoice.totals?.net || 0)} р.</span></p>
                  <p>НДС: <span className="font-black text-amber-600">{formatMoney(processedInvoice.totals?.vat || 0)} р.</span></p>
                </div>
              )}
            </DialogHeader>
            <DialogFooter className="mt-6 flex-col gap-2">
              <Button
                onClick={handleDownloadPDF}
                className="w-full h-12 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] gap-2"
              >
                <Download className="w-4 h-4" /> Скачать PDF накладную
              </Button>
              <Button variant="ghost" onClick={() => setIsSuccessOpen(false)} className="w-full h-10 rounded-xl font-bold">
                <X className="w-4 h-4 mr-1" /> Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
