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
  PackagePlus,
  Trash2,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { generateDatabaseSchema } from "@/ai/flows/generate-database-schema";
import { generateBackendProjectStructure } from "@/ai/flows/generate-backend-project-structure";
import { generateBackendApiBoilerplate } from "@/ai/flows/generate-backend-api-boilerplate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PREDEFINED_PRODUCTS } from "@/lib/predefined-products";

// Firebase Auth imports
import { 
  getAuth, 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  getUserByEmail
} from "firebase/auth";

// ─── SUPER ADMIN EMAIL ────────────────────────────────────────────────────────
const SUPER_ADMIN_EMAIL = "f2472839@gmail.com";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { role, user } = useUser();  // user — Firebase Auth user ob'ekti
  const db = useFirestore();
  const auth = getAuth();

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // ─── AI System gen ───────────────────────────────────────────────────────────
  const [genLoading, setGenLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ─── Password change state ───────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // ─── Super Admin assignment state ────────────────────────────────────────────
  const [adminLoading, setAdminLoading] = useState(false);

  const isSuperAdmin = role === "Super Admin";

  // ─── Save general settings ───────────────────────────────────────────────────
  const handleSaveGeneral = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "Muvaffaqiyatli", description: "Sozlamalar saqlandi." });
    }, 800);
  };

  // ─── Change Password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Xatolik", description: "Barcha maydonlarni to'ldiring." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Xatolik", description: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Xatolik", description: "Yangi parollar mos kelmadi." });
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      toast({ variant: "destructive", title: "Xatolik", description: "Foydalanuvchi topilmadi. Qaytadan kiring." });
      return;
    }

    setPwdLoading(true);
    try {
      // Re-authenticate before password change
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);

      toast({ title: "Muvaffaqiyatli ✅", description: "Parol muvaffaqiyatli o'zgartirildi." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        toast({ variant: "destructive", title: "Xatolik", description: "Joriy parol noto'g'ri." });
      } else if (err.code === "auth/too-many-requests") {
        toast({ variant: "destructive", title: "Xatolik", description: "Juda ko'p urinish. Biroz kutib qayta urinib ko'ring." });
      } else {
        toast({ variant: "destructive", title: "Xatolik", description: "Parolni o'zgartirishda xatolik yuz berdi." });
      }
    } finally {
      setPwdLoading(false);
    }
  };

  // ─── Assign Super Admin to f2472839@gmail.com ────────────────────────────────
  // Bu funksiya Firestore'da users kolleksiyasida email bo'yicha userni qidiradi
  // va uning rolini "Super Admin" ga o'zgartiradi.
  const handleAssignSuperAdmin = async () => {
    if (!db) return;

    // Faqat mavjud Super Admin bu amalni bajarishi mumkin
    if (!isSuperAdmin) {
      toast({ variant: "destructive", title: "Ruxsat yo'q", description: "Bu amalni faqat Super Admin bajarishi mumkin." });
      return;
    }

    setAdminLoading(true);
    try {
      // 1. users kolleksiyasidan emailga mos foydalanuvchini qidirish
      const usersSnap = await getDocs(collection(db, "users"));
      let targetUserId: string | null = null;

      for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        if (data.email === SUPER_ADMIN_EMAIL) {
          targetUserId = userDoc.id;
          break;
        }
      }

      if (!targetUserId) {
        // Agar user hali tizimga kirmagan bo'lsa, email bilan yangi yozuv yaratamiz
        // Firebase Auth UID bilan mos kelishi uchun email asosida ID qo'yamiz
        toast({ 
          variant: "destructive", 
          title: "Foydalanuvchi topilmadi", 
          description: `${SUPER_ADMIN_EMAIL} tizimda ro'yxatdan o'tmagan. Avval shu email bilan tizimga kirsin.` 
        });
        return;
      }

      // 2. Rolini Super Admin ga yangilash + barcha permissions ochish
      await setDoc(doc(db, "users", targetUserId), {
        role: "Super Admin",
        permissions: {
          analytics: true,
          nakladnoy: true,
          inventory: true,
          production: true,
          finance: true,
          settings: true,
          systemGen: true,
          userManagement: true,
        },
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      toast({ 
        title: "Super Admin tayinlandi ✅", 
        description: `${SUPER_ADMIN_EMAIL} foydalanuvchisi Super Admin bo'ldi va barcha funksiyalar ochildi.` 
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Super Admin tayinlashda xatolik yuz berdi." });
    } finally {
      setAdminLoading(false);
    }
  };

  // ─── Import products ─────────────────────────────────────────────────────────
  const handleImportProducts = async () => {
    if (!db) return;
    if (PREDEFINED_PRODUCTS.length === 0) {
      toast({ variant: "destructive", title: "Xabar", description: "Import qilish uchun tayyor mahsulotlar yo'q." });
      return;
    }
    setImporting(true);
    try {
      for (const product of PREDEFINED_PRODUCTS) {
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
        description: `${PREDEFINED_PRODUCTS.length} ta mahsulot yuklandi.`,
      });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Mahsulotlarni yuklashda xato." });
    } finally {
      setImporting(false);
    }
  };

  // ─── Clear all data ──────────────────────────────────────────────────────────
  const handleClearAllData = async () => {
    if (!db || !confirm("DIQQAT! Barcha mahsulotlar va ombor qoldiqlari butunlay o'chiriladi. Ushbu amalni qaytarib bo'lmaydi. Tasdiqlaysizmi?")) return;
    
    setClearing(true);
    try {
      const productSnap = await getDocs(collection(db, "products"));
      for (const d of productSnap.docs) {
        await deleteDoc(doc(db, "products", d.id));
      }
      
      const invSnap = await getDocs(collection(db, "inventory"));
      for (const d of invSnap.docs) {
        await deleteDoc(doc(db, "inventory", d.id));
      }

      toast({ title: "Muvaffaqiyatli", description: "Barcha mahsulotlar bazadan tozalandi." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Xatolik", description: "Ma'lumotlarni o'chirishda xatolik yuz berdi." });
    } finally {
      setClearing(false);
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
            <TabsTrigger value="general" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10">
              {t.settings.general}
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10">
              Ma'lumotlar Importi
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="systemgen" className="rounded-xl px-8 font-black uppercase text-[10px] tracking-widest h-10 gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" /> {t.systemGen.title}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ─── GENERAL TAB ──────────────────────────────────────────────────── */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Company settings card */}
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight">
                    {t.settings.general}
                  </CardTitle>
                  <CardDescription>Asosiy tizim parametrlari</CardDescription>
                </CardHeader>
                <CardContent className="px-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      {t.settings.companyName}
                    </Label>
                    <Input
                      className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      defaultValue="omborchi.uz Logistics"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      {t.settings.currency}
                    </Label>
                    <Input
                      className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold"
                      defaultValue="so'm (UZS)"
                    />
                  </div>
                </CardContent>
                <CardFooter className="px-8 pb-8 pt-2">
                  <Button
                    className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary text-white border-none shadow-xl shadow-primary/20"
                    onClick={handleSaveGeneral}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t.settings.save}
                  </Button>
                </CardFooter>
              </Card>

              {/* ─── PASSWORD CHANGE CARD ─────────────────────────────────────── */}
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                    <KeyRound className="text-primary w-6 h-6" />
                    Parolni o'zgartirish
                  </CardTitle>
                  <CardDescription>
                    Hisob xavfsizligini oshirish uchun parolni yangilang
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 space-y-5">

                  {/* Current password */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      Joriy parol
                    </Label>
                    <div className="relative">
                      <Input
                        type={showCurrentPwd ? "text" : "password"}
                        className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold pr-12"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                      >
                        {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      Yangi parol
                    </Label>
                    <div className="relative">
                      <Input
                        type={showNewPwd ? "text" : "password"}
                        className="h-12 rounded-2xl bg-background/50 border-border/40 font-bold pr-12"
                        placeholder="Kamida 6 ta belgi"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                      >
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {newPassword.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {[1,2,3,4].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-all duration-300",
                              newPassword.length < 6
                                ? i === 1 ? "bg-rose-500" : "bg-border/30"
                                : newPassword.length < 10
                                ? i <= 2 ? "bg-amber-500" : "bg-border/30"
                                : newPassword.length < 14
                                ? i <= 3 ? "bg-blue-500" : "bg-border/30"
                                : "bg-emerald-500"
                            )}
                          />
                        ))}
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                          {newPassword.length < 6 ? "Zaif" : newPassword.length < 10 ? "O'rta" : newPassword.length < 14 ? "Yaxshi" : "Kuchli"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">
                      Yangi parolni tasdiqlang
                    </Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPwd ? "text" : "password"}
                        className={cn(
                          "h-12 rounded-2xl bg-background/50 border-border/40 font-bold pr-12",
                          confirmPassword && newPassword !== confirmPassword && "border-rose-500/60 focus-visible:ring-rose-500/30"
                        )}
                        placeholder="Parolni takrorlang"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Parollar mos kelmadi
                      </p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                      <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Parollar mos keldi
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="px-8 pb-8 pt-2">
                  <Button
                    className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] bg-primary text-white border-none shadow-xl shadow-primary/20"
                    onClick={handleChangePassword}
                    disabled={pwdLoading || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {pwdLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <KeyRound className="w-4 h-4 mr-2" />
                    )}
                    Parolni saqlash
                  </Button>
                </CardFooter>
              </Card>

              {/* ─── SUPER ADMIN ASSIGNMENT CARD (faqat Super Admin ko'radi) ──── */}
              {isSuperAdmin && (
                <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-violet-500/10 md:col-span-2">
                  <CardHeader className="p-8">
                    <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                      <ShieldCheck className="text-violet-500 w-6 h-6" />
                      Super Admin tayinlash
                    </CardTitle>
                    <CardDescription>
                      <span className="font-bold text-violet-400">{SUPER_ADMIN_EMAIL}</span> foydalanuvchisiga Super Admin roli va barcha funksiyalarga kirish huquqini berish
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-6">
                      <ShieldCheck className="w-10 h-10 text-violet-400 shrink-0" />
                      <div>
                        <p className="font-black text-sm text-foreground">{SUPER_ADMIN_EMAIL}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ushbu foydalanuvchiga quyidagi huquqlar beriladi: Analitika, Nakladnoy, Inventar, Ishlab chiqarish, Moliya, Sozlamalar, AI tizim generatsiyasi, Foydalanuvchilar boshqaruvi
                        </p>
                      </div>
                    </div>
                    <Button
                      className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-500/20"
                      onClick={handleAssignSuperAdmin}
                      disabled={adminLoading}
                    >
                      {adminLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 mr-2" />
                      )}
                      Super Admin qilish
                    </Button>
                  </CardContent>
                </Card>
              )}

            </div>
          </TabsContent>

          {/* ─── DATA TAB ─────────────────────────────────────────────────────── */}
          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3">
                    <PackagePlus className="text-primary w-6 h-6" />
                    Ommaviy mahsulot yuklash
                  </CardTitle>
                  <CardDescription>
                    Tizimda oldindan tayyorlangan mahsulotlarni katalogga qo'shish.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
                    onClick={handleImportProducts}
                    disabled={importing || PREDEFINED_PRODUCTS.length === 0}
                  >
                    {importing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Download className="w-5 h-5 mr-2" />}
                    Importni boshlash ({PREDEFINED_PRODUCTS.length} ta tavar)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none glass-card bg-card/40 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-rose-500/10">
                <CardHeader className="p-8">
                  <CardTitle className="font-headline font-black text-xl tracking-tight flex items-center gap-3 text-rose-500">
                    <Trash2 className="w-6 h-6" />
                    Katalogni tozalash
                  </CardTitle>
                  <CardDescription>
                    Bazadagi barcha mahsulotlar va qoldiqlarni butunlay o'chirib tashlash.
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
                    Barcha mahsulotlarni o'chirish
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── AI SYSTEM GEN TAB ────────────────────────────────────────────── */}
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
