"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLanguage } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, Globe, AlertCircle, Warehouse, ArrowRight, Box, Package, Truck, Layers } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Tizimga kirildi",
        description: "Dashboardga yo'naltirilmoqdasiz...",
      });
      // onAuthStateChanged in client-provider handles redirect
    } catch (err: any) {
      console.error(err);
      setError("Email yoki parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const bgElements = [
    { Icon: Box, delay: 0 },
    { Icon: Package, delay: 2 },
    { Icon: Truck, delay: 5 },
    { Icon: Layers, delay: 1 },
    { Icon: Warehouse, delay: 3 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#02040a] relative overflow-hidden font-body">
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#02040a]">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />
        
        {mounted && bgElements.map((el, idx) => (
          <motion.div
            key={idx}
            initial={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`, 
              opacity: 0,
              scale: 0.5
            }}
            animate={{ 
              y: [0, -100, 0, 100, 0],
              x: [0, 100, 0, -100, 0],
              rotate: [0, 90, 180, 270, 360],
              opacity: [0, 0.05, 0.05, 0],
              scale: [0.5, 1, 1, 0.5]
            }}
            transition={{ 
              duration: 30 + Math.random() * 20, 
              repeat: Infinity, 
              delay: el.delay, 
              ease: "linear" 
            }}
            className="absolute text-white"
          >
            <el.Icon size={120 + Math.random() * 100} strokeWidth={0.2} />
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

      <div className="w-full max-w-md p-6 z-10">
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
                  <input 
                    type="email" 
                    className="flex h-12 w-full pl-11 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
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
                  <input 
                    type="password" 
                    className="flex h-12 w-full pl-11 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
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
        </Card>

        <p className="text-center mt-10 text-white/10 text-[10px] font-black uppercase tracking-[0.4em] select-none">
          omborchi.uz by X e M team © 2026
        </p>
      </div>
    </div>
  );
}
