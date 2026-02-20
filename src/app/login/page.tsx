"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLanguage } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, Globe, AlertCircle, ShieldCheck, Copy, CheckCircle2, Database, Key, Warehouse, ArrowRight, Box, Package, Truck, Layers } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Pre-defined background elements to ensure full screen coverage and avoid hydration clustering
  const bgElements = [
    { Icon: Box, size: 140, top: "10%", left: "5%", duration: 25, delay: 0 },
    { Icon: Package, size: 180, top: "40%", left: "85%", duration: 35, delay: 2 },
    { Icon: Truck, size: 220, top: "70%", left: "15%", duration: 30, delay: 5 },
    { Icon: Layers, size: 160, top: "20%", left: "65%", duration: 40, delay: 1 },
    { Icon: Warehouse, size: 200, top: "85%", left: "80%", duration: 32, delay: 3 },
    { Icon: Box, size: 120, top: "5%", left: "45%", duration: 28, delay: 4 },
    { Icon: Package, size: 150, top: "55%", left: "5%", duration: 38, delay: 6 },
    { Icon: Truck, size: 190, top: "15%", left: "90%", duration: 42, delay: 2 },
    { Icon: Box, size: 130, top: "45%", left: "40%", duration: 26, delay: 7 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden font-body">
      {/* Sklad mavzusidagi animatsion orqa fon */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#02040a]">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />
        
        {/* Floating Warehouse Icons - Spread across screen */}
        {mounted && bgElements.map((el, idx) => (
          <motion.div
            key={idx}
            initial={{ 
              top: el.top, 
              left: el.left,
              opacity: 0,
              scale: 0.8,
              rotate: 0 
            }}
            animate={{ 
              y: [0, -40, 0, 40, 0],
              x: [0, 30, 0, -30, 0],
              opacity: [0, 0.07, 0.07, 0],
              rotate: [0, 90, 180, 270, 360],
              scale: [0.8, 1, 1, 0.8]
            }}
            transition={{ 
              duration: el.duration, 
              repeat: Infinity, 
              delay: el.delay,
              ease: "linear" 
            }}
            className="absolute text-white"
          >
            <el.Icon size={el.size} strokeWidth={0.3} />
          </motion.div>
        ))}

        {/* Cinematic Blur gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[140px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>
      
      <div className="absolute top-6 right-6 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 uppercase font-black text-[10px] tracking-widest text-white/70 hover:text-white hover:bg-white/10 transition-all rounded-xl border border-white/10">
              <Globe className="w-3 h-3" /> {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-white/10 bg-black/80 backdrop-blur-xl text-white">
            <DropdownMenuItem onClick={() => setLanguage('uz')} className="cursor-pointer py-2">🇺🇿 O'zbek</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('ru')} className="cursor-pointer py-2">🇷🇺 Русский</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer py-2">🇺🇸 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md p-6 z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-6 transition-transform"
          >
            <Warehouse className="w-9 h-9" />
          </motion.div>
          <h1 className="font-headline font-black text-4xl tracking-tighter text-white">omborchi.uz</h1>
          <div className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 mt-2">
            <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">Enterprise Edition</p>
          </div>
        </div>

        <Card className="border-white/5 shadow-2xl bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-1 pb-2 pt-8">
            <CardTitle className="text-2xl font-black font-headline text-center text-white">
              {t.auth.loginTitle}
            </CardTitle>
            <CardDescription className="text-center text-white/50 font-medium px-6">{t.auth.loginDescription}</CardDescription>
          </CardHeader>
          
          {!userUid ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 pt-6 px-8">
                {error && (
                  <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20 flex items-center gap-3 animate-in zoom-in-95 duration-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/40 text-[10px] font-black uppercase tracking-widest pl-1">{t.auth.emailLabel}</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      className="h-12 pl-11 rounded-2xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/10 focus:ring-primary/40 focus:bg-white/[0.07] transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/40 text-[10px] font-black uppercase tracking-widest pl-1">{t.auth.passwordLabel}</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      className="h-12 pl-11 rounded-2xl bg-white/[0.04] border-white/10 text-white placeholder:text-white/10 focus:ring-primary/40 focus:bg-white/[0.07] transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 pb-10 px-8">
                <Button type="submit" className="w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all duration-300 bg-primary" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <>{t.auth.loginButton} <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6 pt-6 pb-12 px-8">
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.8rem] space-y-4">
                <div className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5" /> Autentifikatsiya muvaffaqiyatli!
                </div>
                <p className="text-[11px] text-white/60 font-medium leading-relaxed">
                  Hisobingiz tayyor, lekin siz hali <b>rolesAdmin</b> ro'yxatida yo'qsiz. UID-ni nusxalab Firestore-da sozlang:
                </p>
                <div className="flex items-center gap-3 bg-black/60 p-3.5 rounded-xl border border-white/10 font-code text-[10px] shadow-inner">
                  <span className="flex-1 truncate font-black text-primary tracking-tight">{userUid}</span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/20 text-white/70 hover:text-white" onClick={copyUid}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex gap-4">
                  <div className="flex-none w-8 h-8 rounded-xl bg-white/5 text-white/70 flex items-center justify-center text-[10px] font-black">1</div>
                  <div>
                    <p className="font-black text-white/90 text-[10px] uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" /> Firestore-ga kiring
                    </p>
                    <p className="text-white/40 text-[10px] font-medium mt-1">
                      Firebase Console-da <b>rolesAdmin</b> kolleksiyasini oching.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-none w-8 h-8 rounded-xl bg-white/5 text-white/70 flex items-center justify-center text-[10px] font-black">2</div>
                  <div>
                    <p className="font-black text-white/90 text-[10px] uppercase tracking-wider flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" /> Hujjat yarating
                    </p>
                    <p className="text-white/40 text-[10px] font-medium mt-1">
                      <b>Document ID</b> joyiga yuqoridagi <b>UID</b>-ni qo'ying.
                    </p>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full mt-6 h-11 rounded-2xl border-white/10 text-white/70 hover:text-white hover:bg-white/5 font-bold text-xs" onClick={() => window.location.reload()}>
                  Bajarib bo'ldim, qayta yuklash
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-10 text-white/20 text-[10px] font-black uppercase tracking-[0.4em] select-none"
        >
          omborchi.uz by X e M team © 2026
        </motion.p>
      </div>
    </div>
  );
}
