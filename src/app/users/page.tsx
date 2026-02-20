
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MoreHorizontal, ShieldCheck, Loader2, UserX } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useCollection, useFirestore, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

export default function UsersPage() {
  const { t } = useLanguage();
  const db = useFirestore();
  const { user, isUserLoading: authLoading } = useUser();

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, "users");
  }, [db, user]);
  
  const { data: usersList, isLoading } = useCollection(usersQuery);

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto bg-background">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.users.title}</h1>
            <p className="text-muted-foreground mt-1">{t.users.description}</p>
          </div>
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" /> {t.users.invite}
          </Button>
        </header>

        {(isLoading || authLoading) ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Foydalanuvchi</th>
                      <th className="px-6 py-4 font-semibold">{t.users.role}</th>
                      <th className="px-6 py-4 font-semibold">UID</th>
                      <th className="px-6 py-4 font-semibold">{t.users.status}</th>
                      <th className="px-6 py-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {usersList && usersList.map((u: any) => (
                      <tr key={u.id} className="hover:bg-accent/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {u.displayName ? u.displayName.split(' ').map((n: string) => n[0]).join('') : (u.email ? u.email[0].toUpperCase() : 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium">{u.displayName || 'Noma\'lum foydalanuvchi'}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                            <span>{u.role || 'Operator'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-code text-[10px]">{u.id}</td>
                        <td className="px-6 py-4">
                          <Badge variant={u.status === "Active" ? "default" : "outline"}>
                            {u.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!usersList || usersList.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <UserX className="w-10 h-10 opacity-20" />
                            <p>Hozircha foydalanuvchilar yo'q.</p>
                            <p className="text-xs">Foydalanuvchilar ro'yxati bazada 'users' kolleksiyasida saqlanadi.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
