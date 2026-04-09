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
  CheckCircle2,
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
 
// ─── O'LCHOV BIRLIKLARI ───────────────────────────────────────────────────────
const UNIT_OPTIONS = [
  "dona", "kg", "gramm", "litr",
  "metr", "sm", "quti", "paket", "м²",
];
 
const CURRENCY_OPTIONS = [
  { label: "so'm (UZS)", value: "so'm" },
  { label: "dollar ($)",  value: "$"     },
  { label: "euro (€)",    value: "€"     },
  { label: "rubl (₽)",    value: "₽"     },
];
 
// Excel ustun nomlarini tanish uchun map
const KNOWN_COLS: Record<string, string[]> = {
  nomi:      ["nomi", "name", "наименование", "название", "товар", "mahsulot"],
  sku:       ["sku", "артикул", "kod", "код", "article"],
  unit:      ["birligi", "unit", "ед.изм", "ед.изм.", "birlik", "o'lchov"],
  stock:     ["qoldiq", "stock", "количество", "остаток", "miqdor", "soni"],
  salePrice: ["narxi", "price", "цена", "стоимость", "narx", "summa"],
};
 
function matchColumns(headers: string[]) {
  const matched: Record<string, string> = {};
  Object.entries(KNOWN_COLS).forEach(([field, keys]) => {
    const found = headers.find((h) => keys.includes(h.trim().toLowerCase()));
    if (found) matched[field] = found;
  });
  return matched;
}
 
// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { role } = useUser();
  const db = useFirestore();
  const auth = getAuth();
 
  // --- Import state ---
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [importDone, setImportDone] = useState(false);
 
  // --- Unit & currency ---
  const [selectedUnit, setSelectedUnit] = useState("dona");
  const [customUnit, setCustomUnit] = useState("");
  const [currency, setCurrency] = useState("so'm");
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
 
  // --- Password state ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
 
  const activeUnit = customUnit.trim() || selectedUnit;
  const matchedCols = matchColumns(headers);
  const hasUnitCol = !!matchedCols.unit;
 
  // ─── EXCEL HANDLERS ────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };
 
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };
 
  const readFile = (file: File) => {
    setImportDone(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary", codepage: 1251 });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        const hdrs = data.length > 0 ? Object.keys(data[0] as object) : [];
        setExcelData(data);
        setHeaders(hdrs);
        setFileName(file.name);
        setFileSize((file.size / 1024).toFixed(1) + " KB");
        toast({ title: "Fayl o'qildi", description: `${data.length} ta mahsulot tayyor.` });
      } catch {
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
          const foundKey = Object.keys(item).find((k) =>
            keys.includes(k.trim().toLowerCase())
          );
          return foundKey ? item[foundKey] : null;
        };
 
        const skuVal = findVal(["sku", "артикул", "kod"]);
        const productId = skuVal
          ? String(skuVal)
          : Math.random().toString(36).substr(2, 9);
        const docRef = doc(db, "products", productId);
 
        // Birlik: excel'dan ol, yo'q bo'lsa tanlangan birlikni ishlataki
        const unitFromExcel = findVal(["birligi", "unit", "ед.изм", "ед.изм.", "birlik"]);
 
        batch.set(
          docRef,
          {
            id: productId,
            name:
              findVal(["nomi", "name", "наименование", "название", "товар"]) ||
              "Nomsiz mahsulot",
            sku: productId,
            unit: unitFromExcel || activeUnit,
            stock:
              Number(findVal(["qoldiq", "stock", "количество", "остаток"])) || 0,
            salePrice:
              Number(findVal(["narxi", "price", "цена", "стоимость"])) ||
              defaultPrice ||
              0,
            currency,
            isDeleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
 
      await batch.commit();
      setImportDone(true);
      toast({
        title: "Muvaffaqiyatli ✅",
        description: `${excelData.length} ta mahsulot yuklandi · birlik: ${activeUnit} · valyuta: ${currency}`,
      });
      clearImport();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: err.message?.includes("permission")
          ? "Ruxsat yo'q! Firebase Rules-ni tekshiring."
          : "Bazaga yozishda xato yuz berdi.",
      });
    } finally {
      setImporting(false);
    }
  };
 
  const clearImport = () => {
    setExcelData([]);
    setHeaders([]);
    setFileName("");
    setFileSize("");
  };
 
  // ─── PASSWORD ──────────────────────────────────────────────────────────────
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
    } catch {
      toast({ variant: "destructive", title: "Xato", description: "Eski parol noto'g'ri." });
    } finally {
      setPwdLoading(false);
    }
  };
 
  // ─── CLEAR ALL ─────────────────────────────────────────────────────────────
  const handleClearAllData = async () => {
    if (!db || !confirm("DIQQAT! Barcha mahsulotlarni o'chirib yubormoqchisiz. Tasdiqlaysizmi?")) return;
    setClearing(true);
    try {
      const snap = await getDocs(collection(db, "products"));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      toast({ title: "Tozalandi", description: "Barcha mahsulotlar o'chirildi." });
    } catch {
      toast({ variant: "destructive", title: "Xato", description: "O'chirishda xatolik." });
    } finally {
      setClearing(false);
    }
  };
 
  // ─── RENDER ────────────────────────────────────────────────────────────────
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
            <TabsTrigger value="data"    className="px-6 font-semibold">IMPORT</TabsTrigger>
          </TabsList>
 
          {/* ── UMUMIY TAB ── */}
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
                    <button
                      onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                      className="absolute right-3 top-3"
                    >
                      {showCurrentPwd
                        ? <EyeOff className="w-4 h-4 text-slate-500" />
                        : <Eye     className="w-4 h-4 text-slate-500" />}
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
                <Button
                  onClick={handleChangePassword}
                  disabled={pwdLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {pwdLoading ? <Loader2 className="animate-spin" /> : "PAROLNI SAQLASH"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
 
          {/* ── IMPORT TAB ── */}
          <TabsContent value="data" className="grid grid-cols-1 md:grid-cols-2 gap-6">
 
            {/* ── IMPORT CARD ── */}
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-500" /> Ommaviy yuklash
                </CardTitle>
                <CardDescription>Excel (Ruscha/Kirill qo'llab-quvvatlanadi)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
 
                {/* 1-qadam: O'lchov birligi */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    1-qadam — O'lchov birligi
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {UNIT_OPTIONS.map((unit) => (
                      <button
                        key={unit}
                        onClick={() => { setSelectedUnit(unit); setCustomUnit(""); }}
                        className={`
                          py-1.5 px-1 rounded-lg border text-xs font-medium transition-all
                          ${activeUnit === unit && !customUnit
                            ? "bg-blue-50 border-blue-400 text-blue-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}
                        `}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Boshqa birlik kiriting..."
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="text-sm h-9"
                  />
                  <p className="text-xs text-slate-400">
                    Tanlangan: <span className="font-semibold text-slate-600">{activeUnit}</span>
                    {" "}— Excel'da birlik ustuni bo'lmasa shu ishlatiladi
                  </p>
                </div>
 
                {/* 2-qadam: Narx formati */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    2-qadam — Narx formati
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs mb-1">Valyuta</Label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
                      >
                        {CURRENCY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1">Standart narx (bo'sh bo'lsa)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={defaultPrice || ""}
                        onChange={(e) => setDefaultPrice(Number(e.target.value))}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
 
                {/* 3-qadam: Fayl yuklash */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    3-qadam — Fayl yuklang
                  </Label>
 
                  {fileName ? (
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                      <FileSpreadsheet className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{fileName}</p>
                        <p className="text-xs text-slate-400">{fileSize} · {excelData.length} ta qator</p>
                      </div>
                      <button
                        onClick={clearImport}
                        className="text-slate-400 hover:text-slate-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      className="relative border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm text-slate-500 text-center">
                        Excel yoki CSV faylni yuklang
                      </p>
                      <p className="text-xs text-slate-400 mt-1">.xlsx · .xls · .csv</p>
                    </div>
                  )}
 
                  {/* Ustunlar ko'rinishi */}
                  {headers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">Aniqlangan ustunlar:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {headers.map((h) => {
                          const isMatched = Object.values(matchedCols).includes(h);
                          return (
                            <span
                              key={h}
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                isMatched
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200"
                              }`}
                            >
                              {h}{isMatched ? " ✓" : ""}
                            </span>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slate-400">
                        {hasUnitCol
                          ? "Birlik ustuni topildi ✓"
                          : `Birlik ustuni yo'q — "${activeUnit}" ishlatiladi`}
                      </p>
                    </div>
                  )}
                </div>
 
                {/* Muvaffaqiyat xabari */}
                {importDone && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-700 font-medium">
                      Muvaffaqiyatli yuklandi!
                    </p>
                  </div>
                )}
 
                <Button
                  onClick={handleBulkImport}
                  disabled={importing || excelData.length === 0}
                  className="w-full h-12 bg-blue-500 hover:bg-blue-600 font-bold"
                >
                  {importing
                    ? <Loader2 className="animate-spin mr-2" />
                    : <Download className="mr-2" />}
                  {excelData.length > 0
                    ? `IMPORTNI BOSHLASH (${excelData.length} ta)`
                    : "FAYL TANLANG"}
                </Button>
              </CardContent>
            </Card>
 
            {/* ── CLEAR CARD ── */}
            <Card className="border-none shadow-sm rounded-3xl border-rose-100">
              <CardHeader>
                <CardTitle className="text-rose-600 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" /> Bazani tozalash
                </CardTitle>
                <CardDescription>
                  Barcha mahsulotlarni butunlay o'chirib tashlash
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  onClick={handleClearAllData}
                  disabled={clearing}
                  className="w-full h-12 font-bold"
                >
                  {clearing ? <Loader2 className="animate-spin" /> : "HAMMASINI O'CHIRISH"}
                </Button>
              </CardContent>
            </Card>
 
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
