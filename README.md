
# ombor.uz - Advanced Inventory Management

Bu NextJS, Firebase va Gemini AI yordamida yaratilgan zamonaviy ombor boshqaruvi tizimi.

## 🚀 GitHub-ga yuklash (Terminal buyruqlari)

Loyihangizni GitHub-ga joylash uchun terminalga (pastdagi qora oyna) quyidagi buyruqlarni ketma-ket nusxalab kiritishingiz kerak:

1.  **Git-ni ishga tushirish:**
    ```bash
    git init
    ```
2.  **Fayllarni tayyorlash:**
    ```bash
    git add .
    ```
3.  **Saqlash (Commit):**
    ```bash
    git commit -m "Initial commit: ombor.uz ready for launch"
    ```
4.  **GitHub-dagi yangi ochgan omboringizga (Repo) ulanish:**
    *(ESLATMA: Quyidagi havolani O'ZINGIZ ochgan GitHub repo havolasi bilan almashtiring)*
    ```bash
    git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ombor-uz.git
    ```
5.  **Kodlarni yuborish:**
    ```bash
    git push -u origin main
    ```

## 🌐 Netlify-da bepul ishga tushirish (Deploy)

Agar Firebase Publish-da muammo bo'lsa, Netlify-dan foydalaning:

1. Loyihani GitHub-ga yuklang (tepadagi ko'rsatma).
2. [Netlify.com](https://www.netlify.com/)-ga kiring va GitHub orqali ro'yxatdan o'ting.
3. **"Add new site"** -> **"Import from GitHub"** ni tanlang va loyihangizni tanlang.
4. **Build settings** qismini quyidagicha to'ldiring:
   - **Base directory**: (Bo'sh qolsin)
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. **Environment variables** bo'limiga quyidagilarni qo'shing:
   - `GOOGLE_GENAI_API_KEY`: *(Sizning AI kalitingiz)*
6. **Deploy** tugmasini bosing. 2 daqiqada saytingiz tayyor!

## ✨ Imkoniyatlar:
- **Dashboard**: Real-vaqt statistikasi va PDF hisobot.
- **Shtrix-kod Skaneri**: Mahsulotlarni kamera orqali aniqlash.
- **Inventarizatsiya**: Adminlar uchun zaxiralarni solishtirish va to'g'rilash.
- **Professional PDF Chek**: Har bir Kirim/Chiqim uchun logo va shtrix-kodli cheklar.
- **Excel Eksport**: Zaxira ma'lumotlarini yuklab olish.
- **AI Assistant**: Tizim ichidagi aqlli yordamchi (Har bir sahifada).

---
Created by **X e M team** © 2026
