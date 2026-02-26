"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bell, 
  Loader2, 
  Database, 
  Code, 
  FileText, 
  Layout, 
  Wand2, 
  AlertCircle, 
  Copy, 
  Check, 
  Download, 
  Zap,
  Sparkles,
  RefreshCw,
  Rocket,
  Settings as SettingsIcon,
  PackagePlus
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { generateDatabaseSchema } from "@/ai/flows/generate-database-schema";
import { generateBackendProjectStructure } from "@/ai/flows/generate-backend-project-structure";
import { generateBackendApiBoilerplate } from "@/ai/flows/generate-backend-api-boilerplate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PREDEFINED_PRODUCTS } from "@/lib/predefined-products";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { role } = useUser();
  const db = useFirestore();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [genLoading, setGenLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isSuperAdmin = role === "Super Admin";

  const handleSaveGeneral = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Muvaffaqiyatli", description: "Sozlamalar saqlandi." });
    }, 800);
  };

  const handleImportProducts = async () => {
    if (!db) return;
    setImporting(true);
    try {
      for (const product of PREDEFINED_PRODUCTS) {
        // ID sifatida SKU kodi ishlatiladi
        const productId = product.sku;
        const productRef = doc(db, "products", productId);
        await setDoc(productRef, {
          id: productId,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          stock: 0,
          salePrice: 0,
          lowStockThreshold: 10,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      toast({
        title: "Import yakunlandi",
        description: `${PREDEFINED_PRODUCTS.length} ta mahsulot SKU kodlari bilan ID-lashtirildi.`,
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Mahsulotlarni yuklashda xato." });
    } finally {
      setImporting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Nusxalandi", description: "Kod buferga saqlandi." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    if (!requirements) return;
    setGenLoading(true);
    setError(null);
    setResults(null);
    try {
      setActiveStep("Bazani loyihalash...");
      const dbSchema = await generateDatabaseSchema({ requirements });
      setActiveStep("Loyiha tuzilmasini qurish...");
      const structure = await generateBackendProjectStructure({ projectName: "OmniStock" });
      setActiveStep("API-larni generatsiya qilish...");
      const api = await generateBackendApiBoilerplate({});
      setResults({ db: dbSchema, structure: structure, api: api });
      setActiveStep("");
    } catch (error: any) {
      console.error(error);
      setError("AI bilan bog'lanishda xatolik yuz berdi.");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary"><SettingsIcon className="w-6 h-6" /></div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">{t.settings.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">{t.settings.description}</p>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-muted/20 p-1.5 rounded-2xl mb-8 border border-border/10">
            <TabsTrigger value="general" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10">{t.settings.general}</TabsTrigger>
            <TabsTrigger value="data" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10">Ma'lumotlar Importi</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="systemgen" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10 gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> {t.systemGen.title}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight">{t.settings.general}</CardTitle>
                  <CardDescription>Asosiy tizim parametrlari</CardDescription>
                </CardHeader>
                <CardContent className="px-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.settings.companyName}</Label>
                    <Input className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold" defaultValue="ombor.uz Logistics" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">{t.settings.currency}</Label>
                    <Input className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold" defaultValue="so'm (UZS)" />
                  </div>
                </CardContent>
                <CardFooter className="px-8 pb-8 pt-2">
                  <Button className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary text-white border-none shadow-xl shadow-primary/20" onClick={handleSaveGeneral} disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t.settings.save}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden max-w-2xl">
              <CardHeader className="p-8">
                <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                  <PackagePlus className="text-primary w-6 h-6" />
                  Ommaviy mahsulot yuklash
                </CardTitle>
                <CardDescription>
                  Tizimda oldindan tayyorlangan mahsulotlarni SKU kodlarini ID sifatida ishlatgan holda katalogga qo'shish.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <Button 
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
                  onClick={handleImportProducts}
                  disabled={importing}
                >
                  {importing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                  Importni boshlash ({PREDEFINED_PRODUCTS.length} ta tavar)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="systemgen" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-5 border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden self-start">
                  <CardHeader className="p-8">
                    <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                      <Sparkles className="text-primary w-5 h-5" />
                      {t.systemGen.inputReqs}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6">
                    <Textarea 
                      placeholder="Biznes talablaringiz..."
                      className="min-h-[220px] rounded-[2rem] bg-background/50 border-border/40 p-6 font-medium text-sm"
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                    />
                    <Button 
                      className="w-full h-16 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-[0.2em] shadow-2xl"
                      onClick={handleGenerate} 
                      disabled={genLoading || !requirements}
                    >
                      {genLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Wand2 className="w-5 h-5 mr-2" />}
                      {t.systemGen.generate}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}