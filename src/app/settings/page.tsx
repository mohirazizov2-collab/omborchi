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
  serverTimestamp,
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

  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // QO'SHILDI: Tasdiqlash uchun
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  // ─── EXCEL HANDLERS ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        // codepage: 1251 Kirill shriftlari uchun juda muhim
        const workbook = XLSX.read(bstr, { type: "binary", codepage: 1251 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        setExcelData(data);
        
        toast({ title: "Fayl o'qildi", description: `${data.length} ta mahsulot tayyor.` });
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
        const findVal = (keys: string[]) => {
          const foundKey = Object.keys(item).find(k => keys.includes(k.trim().toLowerCase()));
          return foundKey ? item[foundKey] : null;
        };

        const skuVal = findVal(["sku", "артикул", "kod"]);
        // ID ni stringga o'girish (Firestore talabi)
        const productId = skuVal ? String(skuVal) : Math.random().toString(36).substr(2, 9);
        const docRef = doc(db, "products", productId);

        batch.set(docRef, {
          id: productId,
          name: findVal(["nomi", "name", "наименование", "название", "товар"]) || "Nomsiz mahsulot",
          sku: productId,
          unit: findVal(["birligi", "unit", "ед.изм", "ед.изм."]) || "dona",
          stock: Number(findVal(["qoldiq", "stock", "количество", "остаток"])) || 0,
          salePrice: Number(findVal(["narxi", "price", "цена", "стоимость"])) || 0,
          isDeleted: false,
          createdAt: serverTimestamp(), // To'g'ri Firestore vaqti
          updatedAt: serverTimestamp(),
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Muvaffaqiyatli ✅", description: "Ma'lumotlar yuklandi." });
      setExcelData([]);
    } catch (err: any) {
      console.error(err);
      toast({ 
        variant: "destructive", 
        title: "Xatolik", 
        description: err.message.includes("permission") 
          ? "Ruxsat yo'q! Firebase Rules-ni tekshiring." 
          : "Bazaga yozishda xato yuz berdi." 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ variant: "destructive", title: "Xato", description: "Barcha maydonlarni to'ldiring." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Xato", description: "Yangi parollar bir-biriga mos kelmadi." });
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) return;
    setPwdLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      toast({ title: "Yangilandi", description: "Parol muvaffaqiyatli o'zgartirildi." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Xato", description: "Eski parol noto'g'ri." });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!db || !confirm("DIQQAT! Barcha mahsulotlarni o'chirib yubormoqchisiz. Tasdiqlaysizmi?")) return;
    setClearing(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      // Batch o'chirish kattaroq bazalar uchun xavfsizroq
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      
      toast({ title: "Tozalandi", description: "Barcha mahsulotlar o'chirildi." });
    } catch (err) {
      toast({ variant: "destructive", title: "Xato", description: "O'chirishda xatolik." });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-10 flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Tizim sozlamalari</h1>
        </header>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="bg-white border p-1 rounded-xl mb-8">
            <TabsTrigger value="general" className="px-6 font-semibold">UMUMIY</TabsTrigger>
            <TabsTrigger value="data" className="px-6 font-semibold">IMPORT</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="max-w-md border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" /> Xavfsizlik
                </CardTitle>
                <CardDescription>Profil parolini yangilash</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Eski parol</Label>
                  <div className="relative">
                    <Input 
                      type={showCurrentPwd ? "text" : "password"} 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                    />
                    <button onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-3">
                      {showCurrentPwd ? <EyeOff className="w-4 h-4 text-slate-500" /> : <Eye className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Yangi parol</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Yangi parolni tasdiqlang</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={pwdLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                  {pwdLoading ? <Loader2 className="animate-spin" /> : "PAROLNI SAQLASH"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-500" /> Ommaviy yuklash
                </CardTitle>
                <CardDescription>Excel (Ruscha/Kirill qo'llab-quvvatlanadi)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center hover:bg-slate-50 transition-all">
                  <input type="file" accept=".xlsx" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Upload className="w-10 h-10 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-600 text-center">
                    {excelData.length > 0 ? `${excelData.length} ta tovar tanlandi` : "Excel faylni yuklang (.xlsx)"}
                  </span>
                </div>
                <Button onClick={handleBulkImport} disabled={importing || excelData.length === 0} className="w-full h-12 bg-blue-500 hover:bg-blue-600 font-bold">
                  {importing ? <Loader2 className="animate-spin mr-2" /> : <Download className="mr-2" />} IMPORTNI BOSHLASH
                </Button>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl border-rose-100">
              <CardHeader>
                <CardTitle className="text-rose-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Bazani tozalash
                </CardTitle>
                <CardDescription>Barcha mahsulotlarni butunlay o'chirib tashlash</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleClearAllData} disabled={clearing} className="w-full h-12 font-bold">
                  {clearing ? <Loader2 className="animate-spin" /> : "HAMMASINI O'CHIRISH"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
