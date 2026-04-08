// 1. Qidiruv logikasini xavfsizroq qilish (Optional chaining qo'shildi)
const filteredStaff = useMemo(() => {
  if (!staffList) return [];
  return staffList.filter(s => {
    // Ma'lumotlar undefined bo'lishi ehtimolini hisobga olamiz
    const fullName = `${s?.name || ""} ${s?.surname || ""}`.toLowerCase();
    const email = (s?.email || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query);
  });
}, [staffList, searchQuery]);

// ... (handleSubmit va boshqa funksiyalar o'zgarishsiz qoladi)

// 2. Jadval qismini quyidagicha yangilang (Ma'lumot yo'qligida "Topilmadi" yozuvi bilan)
<tbody className="divide-y divide-slate-50">
  {filteredStaff.length > 0 ? (
    filteredStaff.map((worker) => (
      <tr key={worker.id} className="hover:bg-slate-50/50 transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-600">
              {/* Ism va Familiya bo'lmasa xato bermasligi uchun ? qo'shildi */}
              {worker.name?.[0] || ""}{worker.surname?.[0] || ""}
            </div>
            <div>
              <p className="font-bold text-slate-800">
                {worker.surname || "Familiya yo'q"} {worker.name || "Ism yo'q"}
              </p>
              <p className="text-[10px] text-slate-400 uppercase">
                {worker.position || "Lavozim belgilanmagan"}
              </p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded text-[9px] font-bold ${worker.email === 'f2472839@gmail.com' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
            {worker.role || "Sotuvchi"}
          </span>
        </td>
        <td className="px-6 py-4 text-slate-500">{worker.email || "—"}</td>
        <td className="px-6 py-4 text-center">
          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-[9px] font-black">
            {worker.permissions?.length || 0} BO'LIM
          </span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => openEditModal(worker)} className="hover:text-blue-600">
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              disabled={worker.email === 'f2472839@gmail.com'}
              onClick={() => handleDelete(worker.id)} 
              className="hover:text-rose-600"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    // Foydalanuvchilar bo'sh bo'lsa chiqadigan holat
    <tr>
      <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
        {isLoading ? "Yuklanmoqda..." : "Foydalanuvchilar topilmadi yoki ro'yxat bo'sh."}
      </td>
    </tr>
  )}
</tbody>
