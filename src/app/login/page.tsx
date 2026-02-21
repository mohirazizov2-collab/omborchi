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
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [bgItems, setBgItems] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden font-body transition-colors duration-700">
      {/* Dynamic Warehouse Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '48px 48px' }} />
        
        {mounted && bgItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{ 
              top: item.top, 
              left: item.left, 
              opacity: 0,
              scale: 0.6
            }}
            animate={{ 
              y: [0, -150, 0, 150, 0],
              x: [0, 100, 0, -100, 0],
              rotate: [0, 180, 360],
              opacity: [0, 0.4, 0.4, 0], 
              scale: [0.6, 1.1, 1.1, 0.6]
            }}
            transition={{ 
              duration: item.duration, 
              repeat: Infinity, 
              delay: item.delay, 
              ease: "linear" 
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
            <Button variant="outline" size="sm" className="gap-2 h-10 px-4 uppercase font-black text-[10px] tracking-widest border-border/40 rounded-2xl backdrop-blur-xl bg-background/30 shadow-sm">
              <Globe className="w-3.5 h-3.5" /> {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl border-border/40 bg-popover/80 backdrop-blur-2xl p-2 min-w-[140px]">
            <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => setLanguage('uz')}>🇺🇿 O'zbek</DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => setLanguage('ru')}>🇷🇺 Русский</DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => setLanguage('en')}>🇺🇸 English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-md p-6 z-20 relative">
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-primary-foreground shadow-[0_20px_40px_-10px_rgba(var(--primary),0.3)] mb-8"
          >
            <Warehouse className="w-10 h-10" />
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-headline font-black text-5xl tracking-tighter text-foreground"
          >
            omborchi.uz
          </motion.h1>
          <p className="text-muted-foreground/50 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Advanced Warehouse Management</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/30 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] bg-card/40 backdrop-blur-3xl rounded-[3rem] overflow-hidden">
            <CardHeader className="space-y-2 pb-2 pt-10 text-center">
              <CardTitle className="text-2xl font-black font-headline tracking-tight text-foreground">
                {t.auth.loginTitle}
              </CardTitle>
              <CardDescription className="text-muted-foreground/70 font-medium px-10 text-sm">{t.auth.loginDescription}</CardDescription>
            </CardHeader>
            
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-6 pt-8 px-10">
                {error && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-4 rounded-[1.5rem] bg-rose-500/10 text-rose-500 text-[11px] font-bold border border-rose-500/20 flex items-center gap-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </motion.div>
                )}
                <div className="space-y-2.5">
                  <Label className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest pl-2">{t.auth.emailLabel}</Label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="email" 
                      className="flex h-14 w-full pl-12 rounded-[1.5rem] bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest pl-2">{t.auth.passwordLabel}</Label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                    <input 
                      type="password" 
                      className="flex h-14 w-full pl-12 rounded-[1.5rem] bg-background/50 border border-border/40 text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm transition-all font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-6 pb-12 px-10">
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-[1.5rem] text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-primary/25 bg-primary hover:bg-primary/90 hover:translate-y-[-2px] transition-all active:scale-95 border-none" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.auth.loginButton} <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </motion.div>

        <p className="text-center mt-12 text-muted-foreground/40 text-[11px] font-black uppercase tracking-[0.5em] select-none">
          omborchi.uz by X e M team © 2026
        </p>
      </div>
    </div>
  );
}