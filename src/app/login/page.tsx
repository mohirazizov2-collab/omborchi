"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useLanguage } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Phone, Building2, Globe, AlertCircle, Warehouse, ArrowRight, Box, Package, Truck, Layers, Eye, EyeOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { companyLoginEmail, isFounder } from "@/lib/tenancy";

/* Kirgandan keyin korxona bo'limiga o'tish manzili */
const REDIRECT_AFTER_LOGIN = "/";

const inputClass =
  "flex h-14 w-full pl-12 rounded-[1.5rem] bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all font-medium";

const labelClass =
  "text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest pl-2";

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [companyId, setCompanyId] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [adminLogin, setAdminLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [bgItems, setBgItems] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    setAdminLogin(new URLSearchParams(window.location.search).get("returnTo") === "/admin-panel");
    const icons = [Box, Package, Truck, Layers, Warehouse];
    const items = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      Icon: icons[i % icons.length],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: 40 + Math.random() * 80,
      duration: 25 + Math.random() * 35,
      delay: Math.random() * 10,
    }));
    setBgItems(items);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if ((!adminLogin && !companyId.trim()) || !login.trim() || !password) {
      setError(adminLogin ? "Email yoki login va parolni kiriting." : "Korxona ID, login va parolni kiriting.");
      return;
    }

    setLoading(true);

    try {
      const authEmail = adminLogin
        ? login.trim()
        : companyLoginEmail(companyId.trim(), login.trim());
      const credential = await signInWithEmailAndPassword(auth, authEmail, password);

      if (adminLogin) {
        if (!isFounder(credential.user.email)) {
          await signOut(auth);
          setError("Bu hisobda Super Admin huquqi yo'q.");
          return;
        }

        toast({
          title: "Tizimga kirildi",
          description: "Super Admin paneliga yo'naltirilmoqdasiz...",
        });
        router.replace("/admin-panel");
        return;
      }

      toast({
        title: "Tizimga kirildi",
        description: "Korxona bo'limiga yo'naltirilmoqdasiz...",
      });

      router.push(REDIRECT_AFTER_LOGIN);
    } catch (err: any) {
      console.error(err);

      if (err?.code === "auth/too-many-requests") {
        setError("Juda ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring.");
      } else if (err?.code === "auth/network-request-failed") {
        setError("Internet bilan aloqa yo'q. Ulanishni tekshiring.");
      } else if (err?.code === "auth/user-disabled") {
        setError("Bu hisob o'chirilgan. Administrator bilan bog'laning.");
      } else {
        setError(adminLogin
          ? "Email, login yoki parol noto'g'ri."
          : "Korxona ID, login yoki parol noto'g'ri.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-body transition-colors duration-700">
      {/* Dynamic Warehouse Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.1]"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)",
            backgroundSize: "48px 48px",
          }}
        />

        {mounted &&
          bgItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ top: item.top, left: item.left, opacity: 0, scale: 0.6 }}
              animate={{
                y: [0, -150, 0, 150, 0],
                x: [0, 100, 0, -100, 0],
                rotate: [0, 180, 360],
                opacity: [0, 0.4, 0.4, 0],
                scale: [0.6, 1.1, 1.1, 0.6],
              }}
              transition={{
                duration: item.duration,
                repeat: Infinity,
                delay: item.delay,
                ease: "linear",
              }}
              className="absolute text-foreground/40 dark:text-foreground/60"
            >
              <item.Icon size={item.size} strokeWidth={0.6} />
            </motion.div>
          ))}

        <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] bg-primary/10 dark:bg-primary/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-[160px]" />
      </div>

      {/* Floating Controls */}
      <div className="absolute top-8 right-8 z-50 flex items-center gap-3">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-10 px-4 uppercase font-black text-[10px] tracking-widest border-border/40 rounded-2xl backdrop-blur-xl bg-background/30 shadow-sm"
            >
              <Globe className="w-3.5 h-3.5" /> {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="rounded-2xl border-border/40 bg-popover/80 backdrop-blur-2xl p-2 min-w-[140px]"
          >
            <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => setLanguage("uz")}>
              🇺🇿 O'zbek
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => setLanguage("ru")}>
              🇷🇺 Русский
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => setLanguage("en")}>
              🇺🇸 English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md p-6 z-20 relative">
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-24 h-24 rounded-[2rem] bg-[#3b82f6] flex items-center justify-center text-white shadow-[0_20px_40px_-10px_rgba(59,130,246,0.5)] mb-8"
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 10L12 4L21 10V20H3V10Z" />
              <path d="M8 12H16" />
              <path d="M8 15H16" />
              <path d="M8 18H16" />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-headline font-black text-6xl tracking-tighter text-foreground"
          >
            omborchi-ai.uz
          </motion.h1>
          <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.4em] mt-3">
            Advanced Warehouse Management
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/30 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
            <CardHeader className="space-y-2 pb-2 pt-10 text-center">
              <CardTitle className="text-2xl font-black font-headline tracking-tight text-foreground">
                {t.auth.loginTitle}
              </CardTitle>
              <CardDescription className="text-muted-foreground/70 font-medium px-10 text-sm">
                {t.auth.loginDescription}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleLogin}>
              <CardContent className="space-y-6 pt-8 px-10">
                {error && (
                  <motion.div
                    role="alert"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 rounded-[1.5rem] bg-rose-500/10 text-rose-500 text-[11px] font-bold border border-rose-500/20 flex items-center gap-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </motion.div>
                )}

                {!adminLogin && (
                  <div className="space-y-2.5">
                    <Label className={labelClass}>Korxona ID</Label>
                    <div className="relative group">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        autoComplete="organization"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="AI-01-hojiaksesuar"
                        className={inputClass}
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <Label className={labelClass}>{adminLogin ? "Email yoki login" : "Login"}</Label>
                  <div className="relative group">
                    {adminLogin
                      ? <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                      : <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />}
                    <input
                      type={adminLogin ? "text" : "tel"}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={adminLogin ? "Email yoki login" : "+998900680077"}
                      className={inputClass}
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Parol */}
                <div className="space-y-2.5">
                  <Label className={labelClass}>{t.auth.passwordLabel}</Label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••"
                      className={`${inputClass} pr-12`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-6 pb-10 px-10">
                <div className="w-full space-y-3">
                  <Button
                    type="submit"
                    className="w-full h-14 rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-primary/25 bg-primary hover:bg-primary/90 hover:translate-y-[-2px] transition-all active:scale-95 border-none"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {t.auth.loginButton} <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => {
                      setAdminLogin(!adminLogin);
                      setError("");
                      router.replace(adminLogin ? "/login" : "/login?returnTo=%2Fadmin-panel");
                    }}
                  >
                    {adminLogin ? "Korxona sifatida kirish" : "Super Admin sifatida kirish"}
                  </button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </motion.div>

        <p className="text-center mt-12 text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.5em] select-none">
          omborchi-ai.uz by xem team © 2026
        </p>
      </div>
    </div>
  );
}