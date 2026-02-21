
# 🚀 ombor.uz - Yakuniy ishga tushirish yo'riqnomasi (Netlify uchun)

Agar Firebase App Hosting-da xatolik yuz bersa, quyidagi mutlaqo bepul va oson yo'ldan foydalaning:

## 🛠 1-qadam: Loyihani GitHub-ga joylash
Firebase Studio-dagi terminalga (pastki qismdagi qora oyna) quyidagi buyruqlarni ketma-ket nusxalab kiriting:

1. **Git-ni ishga tushirish:**
   ```bash
   git init
   ```
2. **Fayllarni tayyorlash:**
   ```bash
   git add .
   ```
3. **Saqlash:**
   ```bash
   git commit -m "Initial commit: ombor.uz ready for Netlify"
   ```
4. **GitHub-ga ulanish:**
   *(GitHub-da yangi repo oching va uning havolasini pastdagisiga almashtiring)*
   ```bash
   git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ombor-uz.git
   ```
5. **Yuborish:**
   ```bash
   git push -u origin main
   ```

## 🌐 2-qadam: Netlify-da bepul Deploy qilish
1. [Netlify](https://app.netlify.com/) saytiga kiring.
2. **"Add new site"** -> **"Import an existing project"** tugmasini bosing.
3. GitHub-dagi `ombor-uz` loyihangizni tanlang.
4. **Sozlamalar (avtomatik chiqishi kerak):**
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

## 🔑 3-qadam: AI Kalitini kiritish (Muhim!)
AI funksiyalari ishlashi uchun Netlify panelida:
1. **Site configuration** -> **Environment variables** bo'limiga o'ting.
2. **"Add key/value pairs"** tugmasini bosing.
3. Quyidagilarni kiriting:
   - **Key:** `GOOGLE_GENAI_API_KEY`
   - **Value:** [Google AI Studio](https://aistudio.google.com/app/apikey) dan olgan kalitingiz.
4. Saqlab bo'lgach, **"Deploy site"** qiling.

---
Created by **X e M team** © 2026
