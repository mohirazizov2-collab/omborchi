
# 🚀 ombor.uz - Boshqaruv va Deploy Qo'llanmasi

Ushbu loyihani internetga chiqarish (Hosting) uchun quyidagi qadamlarni bajaring:

## 1️⃣ Kodni GitHub-ga yuklash (Shart!)
Firebase App Hosting GitHub bilan ishlaydi. Terminalga ushbu buyruqlarni yozing:
```bash
git init
git add .
git commit -m "firebase hosting update"
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPOS_NOMI.git
git push -u origin main
```

## 2️⃣ Firebase Hosting-ni yoqish (2 xil usul)

### A) Firebase App Hosting (Tavsiya etiladi - Next.js uchun maxsus)
1. **Firebase Console**-ga kiring: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Chap menyudan **"Build"** -> **"App Hosting"** bo'limini tanlang.
3. **"Get Started"** tugmasini bosing.
4. GitHub repozitoriyangizni ulang va loyihani tanlang.
5. Sozlamalarda hech narsani o'zgartirmang (avtomatik `apphosting.yaml` dan oladi).
6. **Deploy** tugmasini bosing.

### B) Netlify orqali (Agar Firebase-da Billing/Karta so'rasa)
Firebase ba'zan karta talab qilishi mumkin. Netlify esa mutlaqo bepul:
1. [Netlify.com](https://www.netlify.com/) ga kiring.
2. GitHub orqali ro'yxatdan o'ting.
3. **"Add new site"** -> **"Import an existing project"** ni tanlang.
4. GitHub-dagi loyihangizni tanlang.
5. **Build command:** `npm run build`, **Publish directory:** `.next` deb yozing.
6. **Environment variables** bo'limiga `GOOGLE_GENAI_API_KEY` ni o'z kalitingiz bilan qo'shing.

---
**Eslatma:** Siz yuborgan rasmdagi "AI Cloud Free Trial" bu Google Cloud-ning reklamasidir. Sizga faqat Firebase Console kerak.

Created by **X e M team** © 2026
