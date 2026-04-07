"use client";

import { useState } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Wand2,
  AlertCircle,
  Check,
  Download,
  Zap,
  Sparkles,
  Settings as SettingsIcon,
  PackagePlus,
  Trash2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useFirestore, useUser } from "@/firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { generateDatabaseSchema } from "@/ai/flows/generate-database-schema";
import { generateBackendProjectStructure } from "@/ai/flows/generate-backend-project-structure";
import { generateBackendApiBoilerplate } from "@/ai/flows/generate-backend-api-boilerplate";
import { cn } from "@/lib/utils";
import { PREDEFINED_PRODUCTS } from "@/lib/predefined-products";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import * as XLSX from "xlsx";

// ─── MASTER ADMIN ─────────────────────────────────────────────────────────────
const MASTER_ADMIN_EMAIL = "f2472839@gmail.com";

const ALL_PERMISSIONS = {
  analytics: true,
  nakladnoy: true,
  inventory: true,
  production: true,
  finance: true,
  settings: true,
  systemGen: true,
  userManagement: true,
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { role } = useUser();
  const db = useFirestore();
  const auth = getAuth();

  // ─── States ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);

  // AI & Password States
  const [genLoading, setGenLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [results, setResults] = useState<any>(null);
  const [activeStep, setActiveStep] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  const isSuperAdmin = role === "Super Admin";

  // ─── EXCEL HANDLERS ──────────────────────────────────────────────────────────
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        setExcelData(data);
        toast({ 
          title: "Fayl o'qildi", 
          description: `${data.length} ta mahsulot yuklashga tayyor.` 
        });
      } catch (err) {
        toast({ 
          variant: "destructive", 
          title: "Xatolik", 
          description: "Excel faylni o'qishda xato yuz berdi." 
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkImport = async () => {
    if (!db || excelData.length === 0) return;
    setImporting(true);
    
    try {
      const batch = writeBatch(db);
      
      excelData.forEach((item: any) => {
        const productId = item.sku || item.artikul || Math.random().toString(36).substr(2, 9);
        const docRef = doc(db, "products", productId);
        
        batch.set(docRef, {
          id: productId,
          name: item.nomi || item.name || "Nomsiz mahsulot",
          sku: productId,
          unit: item.birligi || "dona",
          stock: Number(item.qoldiq) || 0,
          salePrice: Number(item.narxi) || 0,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Muvaffaqiyatli ✅", description: "Barcha ma'lumotlar bazaga yuklandi." });
      setExcelData([]);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Bazaga yozishda xato yuz berdi." });
    } finally {
      setImporting(false);
    }
  };

  // ─── OTHER HANDLERS ──────────────────────────────────────────────────────────
  
  const handleSaveGeneral = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Muvaffaqiyatli", description: "Sozlamalar saqlandi." });
    }, 800);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha maydonlarni to'ldiring." });
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;
    
    setPwdLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      toast({ title: "Muvaffaqiyatli ✅", description: "Parol yangilandi." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Parol noto'g'ri yoki tizimda xato." });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!db || !confirm("Barcha mahsulotlarni o'chirishni tasdiqlaysizmi?")) return;
    setClearing(true);
    try {
      const productSnap = await getDocs(collection(db, "products"));
      for (const d of productSnap.docs) await deleteDoc(doc(db, "products", d.id));
      toast({ title: "Tozalandi", description: "Baza bo'shatildi." });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "O'chirishda xato." });
    } finally {
      setClearing(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
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
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-muted/20 p-1.5 rounded-2xl mb-8 border border-border/10">
            <TabsTrigger value="general" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10">
              {t.settings.general}
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10">
              Ma'lumotlar Importi
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 — GENERAL */}
          <TabsContent value="general" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bu yerda sizning mavjud Card'laringiz (General & Password) turadi */}
             </div>
          </TabsContent>

          {/* TAB 2 — DATA IMPORT */}
          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Excel Import Card */}
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                    <FileSpreadsheet className="text-blue-500 w-6 h-6" />
                    Excel orqali yuklash
                  </CardTitle>
                  <CardDescription>
                    Mahsulotlar ro'yxatini `.xlsx` yoki `.csv` formatida yuklang.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-5">
                  <div className="group relative border-2 border-dashed border-primary/20 rounded-[2rem] p-10 flex flex-col items-center bg-primary/5 hover:bg-primary/10 transition-all duration-300">
                    <input 
                      type="file" 
                      accept=".xlsx, .xls, .csv" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    <div className="p-4 bg-white rounded-full shadow-lg mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                      {excelData.length > 0 ? `${excelData.length} ta qator tanlandi` : "Faylni shu yerga tashlang yoki tanlang"}
                    </span>
                  </div>

                  <Button
                    className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
                    onClick={handleBulkImport}
                    disabled={importing || excelData.length === 0}
                  >
                    {importing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                    IMPORTNI TASDIQLASH
                  </Button>
                </CardContent>
              </Card>

              {/* Clear Data Card */}
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3 text-rose-500">
                    <Trash2 className="w-6 h-6" />
                    Bazani tozalash
                  </CardTitle>
                  <CardDescription>
                    Ehtiyot bo'ling! Barcha mahsulotlar o'chib ketadi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <Button
                    variant="destructive"
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-rose-500/20"
                    onClick={handleClearAllData}
                    disabled={clearing}
                  >
                    {clearing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
                    HAMMASINI O'CHIRISH
                  </Button>
                </CardContent>
              </Card>

            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
