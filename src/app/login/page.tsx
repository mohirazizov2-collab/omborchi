"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useLanguage } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, Globe, AlertCircle, ShieldCheck, Copy, CheckCircle2, Database, Key, Warehouse, ArrowRight, Box, Package, Truck, Layers, Wand2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("f2472839@gmail.com");
  const [password, setPassword] = useState("Farrukh0077");
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
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
        description: "Super Admin huquqini faollashtirishingiz mumkin.",
      });
    } catch (err: any) {
      console.error(err);
      setError("Email yoki parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const activateSuperAdmin = async () => {
    if (!userUid || !db) return;
    setActivating(true);
    try {
      await setDoc(doc(db, "rolesAdmin", userUid), {
        uid: userUid,
        email: email,
        assignedAt: new Date().toISOString()
      });
      toast({
        title: "Tabriklaymiz!",
        description: "Siz endi Super Adminsiz. Tizim qayta yuklanmoqda...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: "Huquqni faollashtirib bo'lmadi: " + err.message,
      });
    } finally {
      setActivating(false);
    }
  };

  const copyUid = () => {
    navigator.clipboard.writeText(userUid);
    toast({
      title: "Nusxalandi",
      description: "UID buferga olindi.",
    });
  };

  const bgElements = [
    { Icon: Box, top: "15%", left: "10%", duration: 25, delay: 0 },
    { Icon: Package, top: "45%", left: "80%", duration: 35, delay: 2 },
    { Icon: Truck, top: "75%", left: "20%", duration: 30, delay: 5 },
    { Icon: Layers, top: "25%", left: "70%", duration: 40, delay: 1 },
    { Icon: Warehouse, top: "85%", left: "75%", duration: 32, delay: 3 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden font-body">
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#02040a]">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />
        
        {mounted && bgElements.map((el, idx) => (
          <motion.div
            key={idx}
            initial={{ top: el.top, left: el.left, opacity: 0 }}
            animate={{ 
              y: [0, -40, 0, 40, 0],
              x: [0, 30, 0, -30, 0],
              opacity: [0, 0.05, 0.05, 0],
            }}
            transition={{ duration: el.duration, repeat: Infinity, delay: el.delay, ease: "linear" }}
            className="absolute text-white"
          >
            <el.Icon size={180} strokeWidth={0.2} />
          </motion.div>
        ))}

        <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>
      
      <div className="absolute top-6 right-6 z-20">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 uppercase font-black text-[10px] tracking-widest text-white/50 hover:text-white border border-white/5 rounded-xl">
              <Globe className="w-3 h-3" /> {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-white/10 bg-black/90 text-white">
            <DropdownMenuItem onClick={() => setLanguage('uz')}>🇺🇿 O'zbek</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('ru')}>🇷🇺 Русский</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>🇺🇸 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md p-6 z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/20 mb-6">
            <Warehouse className="w-9 h-9" />
          </div>
          <h1 className="font-headline font-black text-4xl tracking-tighter text-white">omborchi.uz</h1>
          <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Enterprise Edition</p>
        </div>

        <Card className="border-white/5 shadow-2xl bg-white/[0.02] backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-1 pb-2 pt-8">
            <CardTitle className="text-2xl font-black font-headline text-center text-white">
              {t.auth.loginTitle}
            </CardTitle>
            <CardDescription className="text-center text-white/40 font-medium px-6">{t.auth.loginDescription}</CardDescription>
          </CardHeader>
          
          {!userUid ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-5 pt-6 px-8">
                {error && (
                  <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-white/30 text-[10px] font-black uppercase tracking-widest pl-1">{t.auth.emailLabel}</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input 
                      type="email" 
                      className="h-12 pl-11 rounded-2xl bg-white/[0.03] border-white/5 text-white placeholder:text-white/10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/30 text-[10px] font-black uppercase tracking-widest pl-1">{t.auth.passwordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input 
                      type="password" 
                      className="h-12 pl-11 rounded-2xl bg-white/[0.03] border-white/5 text-white placeholder:text-white/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 pb-10 px-8">
                <Button type="submit" className="w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl shadow-primary/10 bg-primary hover:bg-primary/90" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.auth.loginButton} <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6 pt-6 pb-12 px-8">
              <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[1.8rem] space-y-4">
                <div className="flex items-center gap-3 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5" /> Autentifikatsiya muvaffaqiyatli!
                </div>
                <p className="text-[11px] text-white/50 font-medium leading-relaxed">
                  Hisobingiz tayyor. Super Admin huquqini bir bosish bilan faollashtirishingiz mumkin:
                </p>
                
                <Button 
                  onClick={activateSuperAdmin} 
                  disabled={activating}
                  className="w-full h-11 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 gap-2"
                >
                  {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> Super Admin huquqini faollashtirish</>}
                </Button>

                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 font-code text-[9px]">
                  <span className="flex-1 truncate font-black text-primary/60">{userUid}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-white/40 hover:text-white" onClick={copyUid}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Button variant="ghost" className="text-[10px] text-white/30 font-black uppercase tracking-widest hover:text-white" onClick={() => window.location.href = "/"}>
                  Hozircha davom etish <ArrowRight className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <p className="text-center mt-10 text-white/10 text-[10px] font-black uppercase tracking-[0.4em] select-none">
          omborchi.uz by X e M team © 2026
        </p>
      </div>
    </div>
  );
}
