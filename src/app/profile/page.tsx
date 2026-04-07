"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  User as UserIcon,
  Mail,
  Shield,
  Clock,
  LogOut,
  Loader2,
  Calendar,
  Fingerprint,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, isUserLoading, role } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const userInitials = user?.displayName
    ? user.displayName.split(" ").map((n) => n[0]).join("")
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen bg-[#f8fafc]">
        <OmniSidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Yuklanmoqda...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-body">
      <OmniSidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* HEADER SECTION */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-black font-headline tracking-tighter text-slate-900">
              {t.profile.title}
            </h1>
            <p className="text-slate-500 font-medium mt-1">{t.profile.description}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut}
            className="rounded-2xl border-rose-100 hover:bg-rose-50 hover:text-rose-600 transition-all gap-2 h-12 px-6 font-bold text-xs tracking-widest uppercase"
          >
            <LogOut className="w-4 h-4" /> {t.profile.signOut}
          </Button>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN - USER CARD */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4 space-y-6"
          >
            <Card className="border-none shadow-2xl shadow-blue-500/5 rounded-[2.5rem] overflow-hidden bg-white">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-end justify-center pb-0">
                <div className="w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              </div>
              <CardContent className="pt-0 text-center relative px-8 pb-8">
                <div className="flex justify-center -mt-16 mb-6">
                  <Avatar className="h-32 w-32 border-[6px] border-white shadow-2xl shadow-blue-500/20">
                    <AvatarImage src={user?.photoURL || ""} />
                    <AvatarFallback className="bg-blue-50 text-blue-600 text-4xl font-black">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="mb-6">
                  <h2 className="text-2xl font-black font-headline text-slate-900 mb-1">
                    {user?.displayName || (user?.email?.split("@")[0] || "User")}
                  </h2>
                  <p className="text-slate-400 font-medium text-sm flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3" /> {user?.email || "Anonim foydalanuvchi"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  <Badge className="rounded-xl px-4 py-1.5 bg-blue-50 text-blue-700 border-none font-bold text-[10px] uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> {role || "Foydalanuvchi"}
                  </Badge>
                  {user?.emailVerified && (
                    <Badge className="rounded-xl px-4 py-1.5 bg-emerald-50 text-emerald-700 border-none font-bold text-[10px] uppercase tracking-wider">
                      Tasdiqlangan
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-sm font-bold text-emerald-500 flex items-center justify-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                      </p>
                   </div>
                   <div className="text-center border-l border-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tizimda</p>
                      <p className="text-sm font-bold text-slate-700">Premium</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions / Tips */}
            <Card className="border-none bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <Zap className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                <h3 className="font-black text-xl mb-2 relative z-10">AI Yordamchi</h3>
                <p className="text-blue-100 text-sm mb-6 leading-relaxed relative z-10">
                  Omborchi-AI orqali mahsulotlaringiz tahlilini yanada chuqurroq o'rganishingiz mumkin.
                </p>
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-black text-[11px] uppercase tracking-widest h-12 relative z-10">
                  Tahlilni ko'rish
                </Button>
            </Card>
          </motion.div>

          {/* RIGHT COLUMN - DETAILS */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-8 space-y-6"
          >
            <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black font-headline tracking-tight text-slate-900">
                      Hisob ma'lumotlari
                    </CardTitle>
                    <CardDescription className="text-slate-400 font-medium">
                      Barcha texnik va xavfsizlik ma'lumotlari
                    </CardDescription>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Fingerprint className="w-3.5 h-3.5" /> {t.profile.userId}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-3.5 rounded-2xl bg-slate-50 font-mono text-xs text-slate-600 border border-slate-100 truncate">
                        {user?.uid}
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100" onClick={() => {
                        navigator.clipboard.writeText(user?.uid || "");
                        alert("ID nusxalandi!");
                      }}>
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Elektron pochta
                    </Label>
                    <div className="p-3.5 rounded-2xl bg-slate-50 font-bold text-sm text-slate-700 border border-slate-100">
                      {user?.email || "Pochta kiritilmagan"}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Oxirgi kirish vaqti
                    </Label>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-sm text-slate-700">
                        {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString("uz-UZ") : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Hisob turi
                    </Label>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-bold text-sm text-slate-700">
                        {user?.isAnonymous ? "Mehmon (Guest)" : "Doimiy a'zo (Member)"}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Account Security Banner */}
                <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-100 flex items-start gap-4">
                   <div className="p-3 rounded-2xl bg-amber-100 text-amber-600">
                      <ShieldCheck className="w-6 h-6" />
                   </div>
                   <div>
                      <h4 className="font-black text-amber-900 text-sm uppercase tracking-tight mb-1">Xavfsizlik eslatmasi</h4>
                      <p className="text-amber-700 text-sm leading-relaxed">
                        Hisobingiz xavfsizligini ta'minlash uchun parolingizni muntazam ravishda yangilab turing va begona qurilmalardan kirmaslikka harakat qiling.
                      </p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty / Achievements Section (Optional Visuals) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Yuklanganlar", value: "1,240", icon: Activity, color: "text-blue-500" },
                  { label: "Omborlar", value: "3 ta", icon: Zap, color: "text-amber-500" },
                  { label: "A'zolik", value: "6 oy", icon: Calendar, color: "text-indigo-500" }
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm rounded-3xl p-6 bg-white flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-slate-50 ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-lg font-black text-slate-900">{stat.value}</p>
                    </div>
                  </Card>
                ))}
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
