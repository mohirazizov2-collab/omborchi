
# 🚀 ombor.uz - Boshqaruv Qo'llanmasi

Ushbu loyihani ikki xil usulda ishlatishingiz mumkin:

## 1️⃣ Lokal (Preview) rejimida ishlatish
Hozirgi oyna (Firebase Studio) orqali tizimni to'liq ishlatishingiz mumkin. 
- Barcha kiritilgan ma'lumotlar bazaga saqlanadi.
- AI funksiyalari ishlashi uchun `.env` fayliga kalitni qo'shing.
- Bu rejim faqat siz uchun (ishlab chiqish uchun).

## 2️⃣ Ommaga (Netlify) chiqarish
Agar loyihani boshqalarga ko'rsatmoqchi bo'lsangiz, quyidagi amallarni bajaring:

### 🛠 1-qadam: Kodni GitHub-ga yuborish
Terminalga (pastdagi qora oyna) quyidagilarni kiriting:
```bash
git init
git add .
git commit -m "Final update"
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPOS_NOMI.git
git push -u origin main
```

### 🌐 2-qadam: Netlify Sozlamalari
Netlify-da loyihani ulaganingizda quyidagi qiymatlarni kiriting:
- **Build command:** `npm run build`
- **Publish directory:** `.next`

### 🔑 3-qadam: AI Kaliti (Muhim!)
Netlify-da **Environment variables** bo'limiga o'tib:
- **Key:** `GOOGLE_GENAI_API_KEY`
- **Value:** [AI Studio](https://aistudio.google.com/app/apikey) dan olingan kalit.

---
**Eslatma:** Tizimga kirish uchun o'z parolingizdan foydalaning. Agar yangi foydalanuvchi kerak bo'lsa, Super Admin orqali "Foydalanuvchilar" bo'limidan qo'shing.

Created by **X e M team** © 2026
