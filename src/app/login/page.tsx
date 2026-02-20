
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLanguage } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, Globe, AlertCircle, ShieldCheck, Copy, CheckCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("f2472839@gmail.com");
  const [password, setPassword] = useState("Farrukh0077");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userUid, setUserUid] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUserUid("");

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUserUid(result.user.uid);
      toast({
        title: "Tizimga kirildi",
        description: "Endi quyidagi UID orqali Super Adminni faollashtiring.",
      });
      // Muvaffaqiyatli bo'lsa, FirebaseClientProvider avtomatik ravishda Dashboardga o'tkazadi
      // Agar rolesAdmin-da bo'lmasa, quyida ko'rsatma chiqadi.
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Email yoki parol noto'g'ri. Firebase Console-da user yaratganingizga ishonch hosil qiling.");
      } else {
        setError("Xatolik: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyUid = () => {
    navigator.clipboard.writeText(userUid);
    toast({
      title: "Nusxalandi",
      description: "UID buferga olindi.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 uppercase font-bold text-xs">
              <Globe className="w-4 h-4" /> {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('uz')}>🇺🇿 O'zbek</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('ru')}>🇷🇺 Русский</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>🇺🇸 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-headline font-bold text-xl shadow-lg shadow-primary/20">
              O
            </div>
            <span className="font-headline font-bold text-2xl tracking-tight text-primary">omborchi.uz</span>
          </div>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold font-headline text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" /> {t.auth.loginTitle}
            </CardTitle>
            <CardDescription className="text-center">{t.auth.loginDescription}</CardDescription>
          </CardHeader>
          
          {!userUid ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.emailLabel}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="admin@omborchi.uz" 
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full h-11 text-lg font-semibold" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : t.auth.loginButton}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6 pt-2">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-bold">
                  <CheckCircle2 className="w-5 h-5" /> Autentifikatsiya muvaffaqiyatli!
                </div>
                <p className="text-sm text-green-600">
                  Lekin siz hali <b>rolesAdmin</b> ro'yxatida yo'qsiz. Quyidagi UID-ni nusxalab, Firestore-da sozlang:
                </p>
                <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200 font-code text-xs">
                  <span className="flex-1 truncate">{userUid}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyUid}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <p className="font-bold text-primary flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</div>
                  Firestore-ga kiring
                </p>
                <p className="ml-7 text-muted-foreground">
                  <b>rolesAdmin</b> nomli kolleksiya oching.
                </p>

                <p className="font-bold text-primary flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">2</div>
                  Hujjat (Document) yarating
                </p>
                <p className="ml-7 text-muted-foreground">
                  <b>Document ID</b> degan joyiga yuqoridagi <b>UID</b>-ni qo'ying.
                </p>
                
                <Button variant="outline" className="w-full mt-4" onClick={() => window.location.reload()}>
                  Sozlab bo'ldim, qayta yuklash
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
