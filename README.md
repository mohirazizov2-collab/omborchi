
# ombor.uz - Advanced Inventory Management

Bu NextJS, Firebase va Gemini AI yordamida yaratilgan zamonaviy ombor boshqaruvi tizimi.

## 🚀 Loyihani internetga chiqarish (Deploy)

Agar "Publish" tugmasini bosganda xatolik yuz bersa, Netlify orqali bepul va tez deploy qiling:

### 1. Netlify orqali (Tavsiya etiladi)
1. Loyihangizni GitHub-ga yuklang (pastdagi Git buyruqlari yordamida).
2. [Netlify.com](https://www.netlify.com/)-da ro'yxatdan o'ting.
3. "Add new site" -> "Import from GitHub" ni tanlang.
4. `GOOGLE_GENAI_API_KEY` ni "Environment variables" bo'limiga qo'shing.
5. Deploy tugmasini bosing.

### 2. Git buyruqlari (GitHub-ga yuklash uchun)
Terminalga quyidagilarni ketma-ket kiriting:
```bash
git init
git add .
git commit -m "Initial commit: ombor.uz ready"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPO_NOMI.git
git push -u origin main
```

## ✨ Imkoniyatlar:
- **Dashboard**: Real-vaqt statistikasi va PDF hisobot yuklash.
- **Shtrix-kod Skaneri**: Kamera orqali mahsulotlarni tanib olish.
- **Inventarizatsiya**: Tizimdagi zaxirani haqiqiy qoldiq bilan solishtirish (Faqat Adminlar uchun).
- **PDF Check**: Har bir Kirim/Chiqim amaliyoti uchun professional logo va ma'lumotlar bilan chek.
- **Excel Eksport**: Barcha zaxira ma'lumotlarini bir zumda yuklash.
- **AI Assistant**: Tizimdan foydalanish bo'yicha aqlli yordamchi.

---
Created by **X e M team** © 2026
