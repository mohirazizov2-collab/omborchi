"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLanguage } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Mail, Globe, AlertCircle, Warehouse, ArrowRight, Box, Package, Truck, Layers } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const { t, language, setLanguage } = useLanguage();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("f2472839@gmail.com");
  const [password, setPassword] = useState("Farrukh0077");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [bgItems, setBgItems] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const icons = [Box, Package, Truck, Layers, Warehouse];
    const items = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      Icon: icons[i % icons.length],
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: 80 + Math.random() * 160,
      duration: 25 + Math.random() * 25,
      delay: Math.random() * 5,
    }));
    setBgItems(items);
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
    } catch (err: any) {
      setError("Email yoki parol noto'g'ri. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-body transition-colors duration-500">
      {/* Animatsiyali Orqa Fon */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grid pattern for warehouse feel */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '48px 48px' }} />
        
        {mounted && bgItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ 
              top: item.top, 
              left: item.left, 
              opacity: 0,
              scale: 0.5
            }}
            animate={{ 
              y: [0, -100, 0, 100, 0],
              x: [0, 100, 0, -100, 0],
              rotate: [0, 180, 360],
              opacity: [0, 0.2, 0.2, 0], 
              scale: [0.5, 1.1, 1.1, 0.5]
            }}
            transition={{ 
              duration: item.duration, 
              repeat: Infinity, 
              delay: item.delay, 
              ease: "linear" 
            }}
            className="absolute text-primary/30"
          >
            <item.Icon size={item.size} strokeWidth={0.4} />
          </motion.div>
        ))}

        {/* Subtle glow effects */}
        <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[60%] bg-primary/5 dark:bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[150px]" />
      </div>
      
      {/* Top right controls */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 uppercase font-black text-[10px] tracking-widest border-border/40 rounded-xl backdrop-blur-md">
              <Globe className="w-3 h-3" /> {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl border-border/40 bg-popover/90 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => setLanguage('uz')}>🇺🇿 O'zbek</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('ru')}>🇷🇺 Русский</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>🇺🇸 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md p-6 z-10">
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/20 mb-6"
          >
            <Warehouse className="w-9 h-9" />
          </motion.div>
          <h1 className="font-headline font-black text-4xl tracking-tighter text-foreground">omborchi.uz</h1>
          <p className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Enterprise Edition</p>
        </div>

        <Card className="border-border/40 shadow-2xl bg-card/40 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="space-y-1 pb-2 pt-8">
            <CardTitle className="text-2xl font-black font-headline text-center text-foreground">
              {t.auth.loginTitle}
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground font-medium px-6">{t.auth.loginDescription}</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-5 pt-6 px-8">
              {error && (
                <div className="p-4 rounded-2xl bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest pl-1">{t.auth.emailLabel}</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <input 
                    type="email" 
                    className="flex h-12 w-full pl-11 rounded-2xl bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest pl-1">{t.auth.passwordLabel}</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <input 
                    type="password" 
                    className="flex h-12 w-full pl-11 rounded-2xl bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4 pb-10 px-8">
              <Button type="submit" className="w-full h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.auth.loginButton} <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center mt-10 text-muted-foreground/20 text-[10px] font-black uppercase tracking-[0.4em] select-none">
          omborchi.uz by X e M team © 2026
        </p>
      </div>
    </div>
  );
}
