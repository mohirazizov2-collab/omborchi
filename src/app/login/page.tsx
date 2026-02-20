
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
import { Loader2, Lock, Mail, Globe, AlertCircle, ShieldCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const auth = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState("f2472839@gmail.com");
  const [password, setPassword] = useState("Farrukh0077");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Login muvaffaqiyatli bo'lsa, FirebaseClientProvider avtomatik ravishda Dashboardga o'tkazadi
      router.push("/");
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(t.auth.errorInvalid || "Email yoki parol noto'g'ri.");
      } else {
        setError("Tizimga kirishda xatolik yuz berdi. Iltimos, Firebase Console-da foydalanuvchi yaratilganligiga ishonch hosil qiling.");
      }
    } finally {
      setLoading(false);
    }
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                </div>
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
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-11 text-lg font-semibold" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : t.auth.loginButton}
              </Button>
              <div className="text-center space-y-2">
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-[11px] text-muted-foreground leading-relaxed shadow-inner">
                  <p className="font-bold text-primary mb-2 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Super Adminni aktivlashtirish:
                  </p>
                  <ol className="text-left space-y-1 ml-2 list-decimal">
                    <li><b>Firebase Console</b>-da ushbu email/parol bilan user yarating.</li>
                    <li>O'sha userni <b>UID</b> raqamini nusxalang.</li>
                    <li>Firestore-da <b>'rolesAdmin'</b> kolleksiyasiga kiring.</li>
                    <li>Yangi hujjat yarating va ID-siga o'sha <b>UID</b>-ni qo'ying.</li>
                  </ol>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
