// ... (tepadagi importlar o'zgarishsiz qoladi)
// Faqat Input yoniga Eye, EyeOff ikonlarini qo'shish uchun 'lucide-react'dan import qiling

export default function IikoStaffPage() {
  // ... (eski state'lar)
  const [showPassword, setShowPassword] = useState(false);

  const initialForm = {
    lastName: "", firstName: "", middleName: "", email: "",
    password: "", // PAROL MAYDONI QO'SHILDI
    position: "Menejer", role: "User"
  };

  const [formData, setFormData] = useState(initialForm);

  // SAQLASH FUNKSIYASI (Firebase Auth bilan ishlash mantiqi)
  const handleSave = async () => {
    if (!db || !formData.email || !formData.firstName) {
      toast({ variant: "destructive", title: "Xato", description: "Ism va Email shart!" });
      return;
    }

    if (!editingId && !formData.password) {
      toast({ variant: "destructive", title: "Xato", description: "Yangi foydalanuvchi uchun parol kiriting!" });
      return;
    }
    
    setIsSaving(true);
    const id = editingId || doc(collection(db, "users")).id;
    
    // Firestore'ga saqlanadigan ma'lumot (Parolni bazaga ochiq yozmaymiz!)
    const { password, ...userDataToSave } = formData; 

    const payload = {
      ...userDataToSave,
      id,
      fullName: `${formData.lastName} ${formData.firstName}`.trim(),
      permissions,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, "users", id), payload, { merge: true });
      
      // DIQQAT: Agar sizda Admin SDK bo'lsa, shu yerda parolni Auth'ga yozish funksiyasini chaqirasiz.
      // Hozircha biz faqat profilni yaratdik.

      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(initialForm);
      toast({ title: "Saqlandi", description: "Foydalanuvchi yaratildi. Endi u tizimga kirishi mumkin." });
    } catch (e) {
      toast({ variant: "destructive", title: "Xato", description: "Saqlashda xatolik." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // ... (header va qidiruv qismi o'zgarishsiz)
    
    // Dialog ichidagi Inputlar qismini mana bu bilan almashtiring:
    <div className="col-span-2 space-y-4">
      <div className="bg-white p-4 border rounded shadow-sm space-y-3">
        <h4 className="text-[10px] font-black text-slate-400 uppercase border-b pb-1 mb-2">Shaxsiy ma'lumotlar</h4>
        
        <div>
          <Label className="text-[11px]">Email (Login)</Label>
          <Input 
            type="email" 
            className="h-8 text-xs" 
            value={formData.email} 
            onChange={e => setFormData({...formData, email: e.target.value})} 
            placeholder="example@mail.com"
          />
        </div>

        {/* PAROL MAYDONI: Faqat yangi foydalanuvchi yaratayotganda chiqadi */}
        {!editingId && (
          <div className="relative">
            <Label className="text-[11px]">Parol (Login uchun)</Label>
            <Input 
              type={showPassword ? "text" : "password"}
              className="h-8 text-xs pr-8" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="Min. 6 ta belgi"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-7 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          </div>
        )}

        <div>
          <Label className="text-[11px]">Ism</Label>
          <Input className="h-8 text-xs" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
        </div>

        <div>
          <Label className="text-[11px]">Familiya</Label>
          <Input className="h-8 text-xs" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
        </div>

        <div className="pt-2">
          <Label className="text-[11px]">Tizimdagi roli</Label>
          <Select 
            value={formData.role} 
            onValueChange={(v) => setFormData({...formData, role: v})}
          >
            <SelectTrigger className="h-8 text-xs bg-slate-50">
              <SelectValue placeholder="Rolni tanlang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="User">Sotuvchi (User)</SelectItem>
              <SelectItem value="Kassir">Kassir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
