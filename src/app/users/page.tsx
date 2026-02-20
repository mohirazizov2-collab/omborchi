"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, MoreHorizontal, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

const users = [
  { id: 1, name: "Azamat Sharipov", role: "Warehouse Manager", email: "azamat@omnistock.uz", status: "Active", hub: "Main Hub" },
  { id: 2, name: "Nodira Rahimova", role: "Operator", email: "nodira@omnistock.uz", status: "Active", hub: "Fergana Regional" },
  { id: 3, name: "John Doe", role: "Admin", email: "admin@omnistock.uz", status: "Active", hub: "All Hubs" },
  { id: 4, name: "Sardor Alimov", role: "Warehouse Manager", email: "sardor@omnistock.uz", status: "Inactive", hub: "Samarkand Hub" },
];

export default function UsersPage() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.users.title}</h1>
            <p className="text-muted-foreground mt-1">{t.users.description}</p>
          </div>
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" /> {t.users.invite}
          </Button>
        </header>

        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">{t.users.role}</th>
                    <th className="px-6 py-4 font-semibold">{t.users.assignedHub}</th>
                    <th className="px-6 py-4 font-semibold">{t.users.status}</th>
                    <th className="px-6 py-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-accent/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-500" />
                          <span>{user.role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.hub}</td>
                      <td className="px-6 py-4">
                        <Badge variant={user.status === "Active" ? "default" : "outline"}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
