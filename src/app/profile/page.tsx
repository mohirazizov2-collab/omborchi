
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Clock, 
  LogOut, 
  Loader2,
  Calendar,
  Fingerprint
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { user, isUserLoading } = useUser();
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
    ? user.displayName.split(' ').map(n => n[0]).join('')
    : (user?.email ? user.email[0].toUpperCase() : 'U');

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen">
        <OmniSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto bg-background">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.profile.title}</h1>
          <p className="text-muted-foreground mt-1">{t.profile.description}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="h-24 bg-primary" />
              <CardContent className="pt-0 text-center relative">
                <div className="flex justify-center -mt-12 mb-4">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-3xl font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <h2 className="text-xl font-bold font-headline">{user?.displayName || (user?.email?.split('@')[0] || 'User')}</h2>
                <p className="text-sm text-muted-foreground mb-4">{user?.email || (user?.isAnonymous ? t.profile.anonymous : '')}</p>
                <Badge variant={user?.isAnonymous ? "outline" : "default"}>
                  {user?.isAnonymous ? t.profile.anonymous : t.profile.authenticated}
                </Badge>
              </CardContent>
              <CardFooter className="flex-col gap-2 pt-0">
                <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" /> {t.profile.signOut}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> {t.profile.personalInfo}
                </CardTitle>
                <CardDescription>
                  Sizning hisobingiz bo'yicha batafsil ma'lumotlar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Fingerprint className="w-4 h-4" /> {t.profile.userId}
                    </Label>
                    <div className="p-2 rounded bg-muted font-code text-xs break-all">
                      {user?.uid}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" /> {t.profile.email}
                    </Label>
                    <Input readOnly value={user?.email || t.profile.anonymous} />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" /> {t.profile.lastLogin}
                    </Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      {user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'N/A'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="w-4 h-4" /> {t.profile.accountType}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {user?.isAnonymous ? 'Guest' : 'Member'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm border-l-4 border-l-primary bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold font-headline mb-1">Xavfsizlik eslatmasi</h3>
                    <p className="text-sm text-muted-foreground">
                      Hozirda siz anonim hisobdan foydalanmoqdasiz. Ma'lumotlaringizni doimiy saqlab qolish uchun kelajakda elektron pochta orqali ro'yxatdan o'tishingiz mumkin.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
