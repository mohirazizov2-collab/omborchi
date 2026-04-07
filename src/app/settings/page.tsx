"use client";

import { useState } from "react";
import { OmniSidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  FileSpreadsheet,
  Download,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useFirestore, useUser } from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import * as XLSX from "xlsx";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { role } = useUser();
  const db = useFirestore();
  const auth = getAuth();

  // ─── States ──────────────────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

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
        toast({ variant: "destructive", title: "Xatolik", description: "Faylni o'qishda xato!" });
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
      toast({ title: "Muvaffaqiyatli ✅", description: "Ma'lumotlar yuklandi." });
      setExcelData([]);
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Bazaga yozib bo'lmadi." });
    } finally {
      setImporting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    const user = auth.currentUser;
    if (!user?.email) return;
    setPwdLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      toast({ title: "Yangilandi", description: "Parol muvaffaqiyatli o'zgartirildi." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast({ variant: "destructive", title: "Xato", description: "Eski parol noto'g'ri." });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!db || !confirm("Barcha mahsulotlarni o'chirishni tasdiqlaysizmi?")) return;
    setClearing(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      for (const d of snap.docs) await deleteDoc(doc(db, "products", d.id));
      toast({ title: "Tozalandi", description: "Barcha mahsulotlar o'chirildi." });
    } catch (err) {
      toast({ variant: "destructive", title: "Xato", description: "O'chirishda xatolik." });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Tizim sozlamalari
            </h1>
          </div>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-white border p-1 rounded-xl mb-8">
            <TabsTrigger value="general" className="rounded-lg px-6 font-medium text-sm">
              UMUMIY CONFIGURATION
            </TabsTrigger>
            <TabsTrigger value="data" className="rounded-lg px-6 font-medium text-sm">
              MA'LUMOTLAR IMPORTI
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 — UMUMIY */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    Xavfsizlik
                  </CardTitle>
                  <CardDescription>Profil parolini yangilash</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <div className="space-y-2">
                    <Label>Eski parol</Label>
                    <div className="relative">
                      <Input 
                        type={showCurrentPwd ? "text" : "password"} 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="rounded-xl h-11"
                      />
                      <button onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-3">
                        {showCurrentPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Yangi parol</Label>
                    <Input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl h-11"
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={pwdLoading} className="w-full h-11 bg-blue-600 rounded-xl">
                    {pwdLoading ? <Loader2 className="animate-spin" /> : "PAROLNI SAQLASH"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2 — DATA IMPORT */}
          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    Ommaviy yuklash
                  </CardTitle>
                  <CardDescription>Excel fayl orqali mahsulotlarni qo'shing</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center hover:bg-slate-50 transition-colors">
                    <input type="file" accept=".xlsx" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-sm font-medium text-slate-600">
                      {excelData.length > 0 ? `${excelData.length} ta tavar tanlandi` : "Faylni tanlang"}
                    </span>
                  </div>
                  <Button onClick={handleBulkImport} disabled={importing || excelData.length === 0} className="w-full h-12 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold">
                    {importing ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />}
                    IMPORTNI BOSHLASH
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-xl font-bold text-rose-600 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Bazanani tozalash
                  </CardTitle>
                  <CardDescription>Barcha ma'lumotlarni o'chirib yuborish</CardDescription>
                </CardHeader>
                <CardContent className="px-8 pb-8 text-center">
                  <Button variant="destructive" onClick={handleClearAllData} disabled={clearing} className="w-full h-12 rounded-xl font-bold">
                    {clearing ? <Loader2 className="animate-spin" /> : "HAMMASINI O'CHIRISH"}
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
