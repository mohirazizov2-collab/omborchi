
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
  ShieldCheck,
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
  
  // AI System Gen States
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
      toast({
        title: "Muvaffaqiyatli",
        description: "Sozlamalar saqlandi.",
      });
    }, 800);
  };

  const handleImportProducts = async () => {
    if (!db) return;
    setImporting(true);
    try {
      // Barcha mahsulotlarni parallel yuklash uchun chunking yoki for loop
      for (const product of PREDEFINED_PRODUCTS) {
        const productId = doc(collection(db, "products")).id;
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
        description: `${PREDEFINED_PRODUCTS.length} ta mahsulot muvaffaqiyatli qo'shildi.`,
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

      setResults({
        db: dbSchema,
        structure: structure,
        api: api,
      });
      setActiveStep("");
    } catch (error: any) {
      console.error(error);
      if (error?.message?.includes('429')) {
        setError("AI limitidan oshib ketdingiz. Iltimos, 1 daqiqa kutib turing.");
      } else {
        setError("AI bilan bog'lanishda xatolik yuz berdi.");
      }
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
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">
              {t.settings.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">
            {t.settings.description}
          </p>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-muted/20 p-1.5 rounded-2xl mb-8 border border-border/10">
            <TabsTrigger value="general" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              {t.settings.general}
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Ma'lumotlar Importi
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="systemgen" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
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

              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" /> {t.settings.notifications}
                  </CardTitle>
                  <CardDescription>Tizim xabarnomalarini sozlash</CardDescription>
                </CardHeader>
                <CardContent className="px-8 space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm">{t.settings.lowStockAlerts}</Label>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Zaxira kam qolganda ogohlantirish</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 opacity-50">
                    <div className="space-y-0.5">
                      <Label className="font-bold text-sm">Elektron pochta hisoboti</Label>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Haftalik tahlilni emailga yuborish</p>
                    </div>
                    <Switch disabled />
                  </div>
                </CardContent>
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
                  Tizimda oldindan tayyorlangan {PREDEFINED_PRODUCTS.length} ta mahsulotni (santexnika, isitish va filtrlar) avtomatik ravishda katalogga qo'shish.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
                  <p className="text-xs font-bold text-foreground/70 mb-4 uppercase tracking-widest">Import qilinadigan mahsulotlar namunasi:</p>
                  <ul className="grid grid-cols-2 gap-2">
                    {PREDEFINED_PRODUCTS.slice(0, 4).map(p => (
                      <li key={p.sku} className="text-[11px] font-black text-primary/60">
                        #{p.sku} - {p.name}
                      </li>
                    ))}
                    <li className="text-[11px] font-black text-primary/40 italic">...</li>
                    {PREDEFINED_PRODUCTS.slice(119, 123).map(p => (
                      <li key={p.sku} className="text-[11px] font-black text-primary/60">
                        #{p.sku} - {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
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
              {error && (
                <Alert variant="destructive" className="mb-8 rounded-[2rem] border-rose-500/20 bg-rose-500/5 p-6">
                  <AlertCircle className="h-5 w-5" />
                  <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-1">Xatolik yuz berdi</AlertTitle>
                  <AlertDescription className="font-bold">{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <Card className="lg:col-span-5 border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden self-start">
                  <CardHeader className="p-8">
                    <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                      <Sparkles className="text-primary w-5 h-5" />
                      {t.systemGen.inputReqs}
                    </CardTitle>
                    <CardDescription className="font-medium">Yangi tizim arxitekturasini AI orqali yarating.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6">
                    <div className="relative">
                      <Textarea 
                        placeholder="Masalan: Mebel do'koni uchun ombor tizimi kerak. Mahsulotlar, xaridorlar va yetkazib beruvchilar jadvali bo'lsin..."
                        className="min-h-[220px] rounded-[2rem] bg-background/50 border-border/40 focus:ring-primary/40 focus:border-primary/40 p-6 font-medium text-sm leading-relaxed transition-all"
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                      />
                      <div className="absolute bottom-4 right-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                        Powered by Gemini 1.5 Flash
                      </div>
                    </div>
                    
                    <Button 
                      className={cn(
                        "w-full h-16 rounded-[1.5rem] gap-3 text-[12px] font-black uppercase tracking-[0.2em] transition-all premium-button shadow-2xl",
                        genLoading ? "bg-muted text-muted-foreground" : "bg-primary text-white shadow-primary/25"
                      )}
                      onClick={handleGenerate} 
                      disabled={genLoading || !requirements}
                    >
                      {genLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {activeStep}
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          {t.systemGen.generate}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <div className="lg:col-span-7">
                  {!results && !genLoading && (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 rounded-[3rem] border-2 border-dashed border-border/40 bg-muted/5 opacity-40">
                      <Rocket className="w-16 h-16 mb-6 text-muted-foreground" />
                      <p className="text-center font-black uppercase tracking-[0.3em] text-[11px] max-w-[240px]">
                        Talablarni kiriting va AI orqali tizimni yarating
                      </p>
                    </div>
                  )}

                  {genLoading && (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 rounded-[3rem] bg-primary/5 border border-primary/10 animate-pulse">
                      <RefreshCw className="w-12 h-12 mb-6 text-primary animate-spin" />
                      <p className="text-xl font-black font-headline text-primary mb-2">Gidravlika ishlamoqda...</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{activeStep}</p>
                    </div>
                  )}

                  {results && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="h-full">
                      <Tabs defaultValue="db" className="w-full flex flex-col h-full">
                        <TabsList className="grid grid-cols-4 gap-2 bg-muted/20 p-1.5 rounded-2xl mb-6">
                          <TabsTrigger value="db" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 font-black uppercase text-[9px] tracking-widest h-10">
                            <Database className="w-3.5 h-3.5" /> DB
                          </TabsTrigger>
                          <TabsTrigger value="structure" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 font-black uppercase text-[9px] tracking-widest h-10">
                            <Layout className="w-3.5 h-3.5" /> Tuzilma
                          </TabsTrigger>
                          <TabsTrigger value="api" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 font-black uppercase text-[9px] tracking-widest h-10">
                            <Code className="w-3.5 h-3.5" /> API
                          </TabsTrigger>
                          <TabsTrigger value="endpoints" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 font-black uppercase text-[9px] tracking-widest h-10">
                            <FileText className="w-3.5 h-3.5" /> Docs
                          </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-hidden space-y-6">
                          <TabsContent value="db" className="mt-0 space-y-6">
                            <CodeBlock 
                              title="PostgreSQL SQL DDL" 
                              code={results.db.postgresqlSchema} 
                              onCopy={() => handleCopy(results.db.postgresqlSchema, 'sql')}
                              isCopied={copiedId === 'sql'}
                            />
                            <CodeBlock 
                              title="Prisma Schema Model" 
                              code={results.db.prismaSchema} 
                              onCopy={() => handleCopy(results.db.prismaSchema, 'prisma')}
                              isCopied={copiedId === 'prisma'}
                            />
                          </TabsContent>

                          <TabsContent value="structure" className="mt-0">
                            <CodeBlock 
                              title="Backend Folder Structure" 
                              code={results.structure.folderStructure} 
                              onCopy={() => handleCopy(results.structure.folderStructure, 'struct')}
                              isCopied={copiedId === 'struct'}
                              fullHeight
                            />
                          </TabsContent>

                          <TabsContent value="api" className="mt-0">
                            <CodeBlock 
                              title="Stock Movement Logic (Transaction)" 
                              code={results.api.stockMovementServiceExample} 
                              onCopy={() => handleCopy(results.api.stockMovementServiceExample, 'api-logic')}
                              isCopied={copiedId === 'api-logic'}
                              fullHeight
                            />
                          </TabsContent>

                          <TabsContent value="endpoints" className="mt-0">
                            <CodeBlock 
                              title="API Endpoint List" 
                              code={results.api.apiEndpoints} 
                              onCopy={() => handleCopy(results.api.apiEndpoints, 'endpoints-list')}
                              isCopied={copiedId === 'endpoints-list'}
                              fullHeight
                            />
                          </TabsContent>
                        </div>
                      </Tabs>
                    </motion.div>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

function CodeBlock({ title, code, onCopy, isCopied, fullHeight }: any) {
  return (
    <Card className={cn(
      "border-none glass-card bg-card/40 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden flex flex-col",
      fullHeight ? "h-full" : ""
    )}>
      <CardHeader className="px-8 py-5 border-b border-border/10 flex flex-row items-center justify-between shrink-0 bg-muted/10">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{title}</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={onCopy}
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden relative">
        <pre className={cn(
          "p-8 text-[11px] font-code overflow-auto whitespace-pre custom-scrollbar h-full bg-black/5 dark:bg-white/5 selection:bg-primary/20",
          fullHeight ? "min-h-[400px]" : "max-h-[400px]"
        )}>
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
