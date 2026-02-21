
# ombor.uz - Advanced Inventory Management

Bu NextJS, Firebase va Gemini AI yordamida yaratilgan zamonaviy ombor boshqaruvi tizimi.

## 🚀 Loyihani internetga chiqarish (Deploy)

Agar Firebase Studio-dagi "Publish" tugmasini bosganda xatolik yuz bersa (billing yoki API ruxsati sababli), quyidagi usuldan foydalaning:

### 1. Netlify orqali (Eng oson va mutlaqo bepul)
1. Loyihangizni GitHub-ga yuklang (terminal buyruqlari pastda).
2. [Netlify.com](https://www.netlify.com/)-da ro'yxatdan o'ting.
3. **"Add new site"** -> **"Import from GitHub"** ni tanlang.
4. `GOOGLE_GENAI_API_KEY` ni Netlify-dagi "Environment variables" bo'limiga qo'shing.
5. **Deploy** tugmasini bosing. Loyihangiz 2 daqiqada tayyor bo'ladi!

### 2. Git orqali GitHub-ga yuklash
Terminalga quyidagilarni kiriting:
```bash
git init
git add .
git commit -m "Initial commit: ombor.uz ready for launch"
git branch -M main
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ombor-uz.git
git push -u origin main
```

## ✨ Imkoniyatlar:
- **Dashboard**: Real-vaqt statistikasi va PDF hisobot yuklash.
- **Shtrix-kod Skaneri**: Kamera orqali mahsulotlarni bir zumda aniqlash.
- **Inventarizatsiya**: Tizimdagi qoldiqni amaldagi zaxira bilan solishtirish (Faqat Adminlar uchun).
- **Professional PDF Chek**: Har bir Kirim/Chiqim uchun logo va shtrix-kodli cheklar.
- **Excel Eksport**: Barcha zaxira ma'lumotlarini bitta faylda yuklash.
- **AI Assistant**: Tizimdan foydalanish bo'yicha aqlli yordamchi (O'ng pastki burchakda).

---
Created by **X e M team** © 2026
