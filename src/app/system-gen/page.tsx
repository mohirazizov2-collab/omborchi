
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
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
  
} from "lucide-react";
import { generateDatabaseSchema } from "@/ai/flows/generate-database-schema";
import { generateBackendProjectStructure } from "@/ai/flows/generate-backend-project-structure";
import { generateBackendApiBoilerplate } from "@/ai/flows/generate-backend-api-boilerplate";
import { useLanguage } from "@/lib/i18n/context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SystemGenPage() {
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Nusxalandi", description: "Kod buferga saqlandi." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerate = async () => {
    if (!requirements) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto page-transition">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Zap className="w-6 h-6 fill-primary/20" />
            </div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-foreground">
              {t.systemGen.title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">
            {t.systemGen.description} Ushbu modul biznes talablaringiz asosida tayyor backend arxitekturasini yaratib beradi.
          </p>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-8 rounded-[2rem] border-rose-500/20 bg-rose-500/5 p-6 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-black uppercase tracking-widest text-[10px] mb-1">Xatolik yuz berdi</AlertTitle>
            <AlertDescription className="font-bold">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
          <Card className="lg:col-span-5 border-none glass-card bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                <Sparkles className="text-primary w-5 h-5" />
                {t.systemGen.inputReqs}
              </CardTitle>
              <CardDescription className="font-medium">Tizim qanday ishlashi kerakligini batafsil yozing.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-6">
              <div className="relative">
                <Textarea 
                  placeholder="Masalan: Mebel do'koni uchun ombor tizimi kerak. Mahsulotlar, xaridorlar va yetkazib beruvchilar jadvali bo'lsin. Sotuvlar tarixi saqlansin..."
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
                  loading ? "bg-muted text-muted-foreground" : "bg-primary text-white shadow-primary/25"
                )}
                onClick={handleGenerate} 
                disabled={loading || !requirements}
              >
                {loading ? (
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
            {!results && !loading && (
              <ArchitecturePreview />
            )}

            {loading && (
              <div className="h-full flex flex-col items-center justify-center p-12 rounded-[3rem] bg-primary/5 border border-primary/10 animate-pulse">
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

                  <div className="flex-1 overflow-hidden">
                    <TabsContent value="db" className="mt-0 h-full">
                      <div className="space-y-6 h-full overflow-y-auto pr-2 custom-scrollbar">
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
                      </div>
                    </TabsContent>

                    <TabsContent value="structure" className="mt-0 h-full">
                      <CodeBlock 
                        title="Backend Folder Structure" 
                        code={results.structure.folderStructure} 
                        onCopy={() => handleCopy(results.structure.folderStructure, 'struct')}
                        isCopied={copiedId === 'struct'}
                        fullHeight
                      />
                    </TabsContent>

                    <TabsContent value="api" className="mt-0 h-full">
                      <CodeBlock 
                        title="Stock Movement Logic (Transaction)" 
                        code={results.api.stockMovementServiceExample} 
                        onCopy={() => handleCopy(results.api.stockMovementServiceExample, 'api-logic')}
                        isCopied={copiedId === 'api-logic'}
                        fullHeight
                      />
                    </TabsContent>

                    <TabsContent value="endpoints" className="mt-0 h-full">
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
      </main>
    </div>
  );
}

function ArchitecturePreview() {
  return (
    <section className="relative h-full min-h-[520px] overflow-hidden rounded-[3rem] border border-slate-800 bg-[#080b10] px-5 py-8 text-white shadow-2xl shadow-slate-950/20 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_5%,rgba(92,116,147,0.2),transparent_35%)]" />
      <div className="relative mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Tizim arxitekturasi</p>
          <h2 className="mt-1 font-headline text-lg font-black tracking-tight text-white">Omborchi AI</h2>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-300">Tayyor</div>
      </div>

      <div className="relative mx-auto h-[510px] w-full max-w-[660px] text-center">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 660 510" fill="none" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#9ca3af" />
            </marker>
          </defs>
          <path d="M330 66V92M330 92H145V126M330 92H515V126" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#architecture-arrow)" />
          <path d="M145 190V222H330V256M515 190V222H330" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#architecture-arrow)" />
          <path d="M330 320V348M330 348H92V379M330 348H330V379M330 348H568V379" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#architecture-arrow)" />
          <path d="M92 415V445" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#architecture-arrow)" />
        </svg>

        <ArchitectureNode className="left-1/2 top-0 w-[220px] -translate-x-1/2 border-slate-300/60 bg-[#4a4a49]" title="Omborchi AI" />
        <ArchitectureNode className="left-0 top-[126px] w-[40%] border-blue-300/60 bg-[#174f86]" title="Web ilova" subtitle="omborchi-ai.uz" />
        <ArchitectureNode className="right-0 top-[126px] w-[40%] border-blue-300/60 bg-[#174f86]" title="Mobil ilova" subtitle="Android / iOS" />
        <ArchitectureNode className="left-1/2 top-[256px] w-[220px] -translate-x-1/2 border-emerald-300/60 bg-[#075d4d]" title="API / Backend" />
        <ArchitectureNode className="left-0 top-[379px] w-[28%] border-orange-300/60 bg-[#7b2d14]" title="Database" />
        <ArchitectureNode className="left-1/2 top-[379px] w-[28%] -translate-x-1/2 border-orange-300/60 bg-[#7b2d14]" title="Storage" />
        <ArchitectureNode className="right-0 top-[379px] w-[28%] border-orange-300/60 bg-[#7b2d14]" title="AI" />
        <ArchitectureNode className="left-0 top-[445px] w-[28%] border-pink-300/60 bg-[#7f234d]" title="Authentication" />
      </div>
      <p className="relative mt-5 text-center text-[10px] font-bold text-slate-400">Talablarni kiriting — AI ushbu tuzilma uchun backend artefaktlarini tayyorlaydi.</p>
    </section>
  );
}

function ArchitectureNode({ title, subtitle, className }: { title: string; subtitle?: string; className: string }) {
  return (
    <div className={cn("absolute rounded-2xl border px-3 py-3 shadow-lg shadow-black/30", className)}>
      <p className="text-sm font-black tracking-tight sm:text-base">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs font-medium text-blue-200/90 sm:text-sm">{subtitle}</p>}
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
