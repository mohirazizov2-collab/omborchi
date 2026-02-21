
"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Muvaffaqiyatli",
        description: "Sozlamalar saqlandi.",
      });
    }, 800);
  };

  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">{t.settings.title}</h1>
          <p className="text-muted-foreground mt-1">{t.settings.description}</p>
        </header>

        <div className="max-w-4xl space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-lg">{t.settings.general}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t.settings.companyName}</Label>
                  <Input defaultValue="ombor.uz Logistics" />
                </div>
                <div className="space-y-2">
                  <Label>{t.settings.currency}</Label>
                  <Input defaultValue="so'm (UZS)" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-accent/10 py-3">
              <Button size="sm" onClick={handleSave} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t.settings.save}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> {t.settings.notifications}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t.settings.lowStockAlerts}</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
