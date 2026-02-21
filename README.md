
# 🚀 ombor.uz - Boshqaruv Qo'llanmasi

Ushbu loyihani ikki xil usulda ishlatishingiz mumkin:

## 1️⃣ Lokal (Preview) rejimida ishlatish
Hozirgi oyna (Firebase Studio) orqali tizimni to'liq ishlatishingiz mumkin. 
- Barcha kiritilgan ma'lumotlar bazaga saqlanadi.
- AI funksiyalari ishlashi uchun `.env` fayliga kalitni qo'shing.

## 2️⃣ Ommaga chiqazish (Deployment)

### A) Netlify orqali (Tavsiya etiladi - Mutlaqo bepul)
1. **GitHub-ga yuklang:**
```bash
git init
git add .
git commit -m "ombor.uz update"
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPOS_NOMI.git
git push -u origin main
```
2. **Netlify-ga ulaning:** GitHub loyihangizni tanlang.
3. **Sozlamalar:** `Build command: npm run build`, `Publish directory: .next`.
4. **AI Kalit:** `Environment variables` bo'limiga `GOOGLE_GENAI_API_KEY` ni qo'shing.

### B) Firebase App Hosting orqali (Billing/Karta talab qiladi)
1. Firebase Console-ga kiring.
2. **App Hosting** bo'limiga o'ting.
3. GitHub repozitoriyangizni ulang.
4. Avtomatik ravishda `.next` papkasini tanib oladi va deploy qiladi.

---
**Eslatma:** Tizimga kirish uchun o'z parolingizdan foydalaning. Yangi foydalanuvchi kerak bo'lsa, Super Admin orqali "Foydalanuvchilar" bo'limidan qo'shing.

Created by **X e M team** © 2026
