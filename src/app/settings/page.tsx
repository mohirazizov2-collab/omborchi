"use client";

import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Globe, Bell, Lock, Smartphone } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen">
      <OmniSidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure OmniStock global parameters and security.</p>
        </header>

        <div className="max-w-4xl space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-lg">General Configuration</CardTitle>
              <CardDescription>Basic organizational settings for your system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="OmniStock Logistics" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input defaultValue="USD ($)" />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-generate SKUs</Label>
                  <p className="text-sm text-muted-foreground">Automatically create SKU codes for new products.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
            <CardFooter className="bg-accent/10 py-3">
              <Button size="sm">Save Changes</Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Notifications
              </CardTitle>
              <CardDescription>Configure when you want to be alerted.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Low stock alerts</Label>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Audit trail notifications</Label>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>System maintenance updates</Label>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}