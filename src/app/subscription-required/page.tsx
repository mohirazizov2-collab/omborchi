"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Clock3, LogOut } from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";

export default function SubscriptionRequiredPage() {
  const auth = useAuth();
  const router = useRouter();
  const { subscriptionExpired } = useUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Clock3 className="mx-auto mb-4 h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold">Obuna faol emas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Korxona obunasini davom ettirish uchun omborchi.uz administratori bilan bog‘laning.
        </p>
        {!subscriptionExpired && <Button className="mt-6" onClick={() => router.replace("/")}>Bosh sahifaga qaytish</Button>}
        <Button variant="outline" className="mt-6 w-full" onClick={() => signOut(auth)}>
          <LogOut className="mr-2 h-4 w-4" /> Tizimdan chiqish
        </Button>
      </div>
    </main>
  );
}
