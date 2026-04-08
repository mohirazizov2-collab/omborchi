"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { OmniSidebar } from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, Search, Loader2, UserPlus, 
  ShieldCheck, Trash2, Edit2, MoreHorizontal,
  UserCheck, UserMinus, Key
} from "lucide-react";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function IikoStaffPage() {
  const { toast } = useToast();
  const db = useFirestore();
  const { role, isUserLoading } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Xodimlarni yuklash
  const usersQuery = useMemoFirebase(() => db ? collection(db, "users") : null, [db]);
  const { data: employees, isLoading } = useCollection(usersQuery);

  const filteredEmployees = useMemo(() => {
    return employees?.filter(emp => 
      emp.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [employees, searchQuery]);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    if (!db) return;
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      toast({ title: "Status yangilandi", description: `Xodim hozirda ${newStatus}` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik" });
    }
  };

  if (isUserLoading || isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex min-h-screen bg-[#f1f5f9]">
      <OmniSidebar />
      <main className="flex-1 p-6">
        
        {/* iiko style Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-sm">
              <Users className="w-6 h-6 text-slate-700" />
            </div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Xodimlar va ruxsatnomalar</h1>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl h-10 px-5 font-bold shadow-sm">
            <UserPlus className="w-4 h-4 mr-2" /> Xodim qo'shish
          </Button>
        </div>

        {/* Action Bar */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Qidirish (ism, email, lavozim)..." 
              className="pl-10 h-10 bg-slate-50 border-none rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <Button variant="ghost" size="sm" className="text-slate-500 font-bold">
            <Key className="w-4 h-4 mr-2" /> Huquqlar
          </Button>
        </div>

        {/* iiko style Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-6 py-4">F.I.SH va Email</th>
                <th className="px-6 py-4">Lavozim</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEmployees?.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                        {emp.displayName?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{emp.displayName || "Noma'lum"}</p>
                        <p className="text-[11px] text-slate-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-bold text-slate-600">{emp.role || "Xodim"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div 
                      onClick={() => toggleStatus(emp.id, emp.status || "Active")}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black cursor-pointer transition-all",
                        emp.status === "Inactive" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                      )}
                    >
                      {emp.status === "Inactive" ? <UserMinus className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                      {emp.status === "Inactive" ? "BLOCK" : "ACTIVE"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredEmployees?.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm font-bold text-slate-300 uppercase tracking-tighter">Hech kim topilmadi</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
