
# ombor.uz - Advanced Inventory Management

Bu NextJS, Firebase va Gemini AI yordamida yaratilgan zamonaviy ombor boshqaruvi tizimi.

## 🚀 GitHub-ga yuklash (Terminal buyruqlari)

Loyihangizni GitHub-ga joylash uchun terminalga quyidagi buyruqlarni ketma-ket kiriting:

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
4.  **GitHub repo ulanishi:**
    *(ESLATMA: Havolani o'zingiz ochgan GitHub repo havolasi bilan almashtiring)*
    ```bash
    git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ombor-uz.git
    ```
5.  **Kodlarni yuborish:**
    ```bash
    git push -u origin main
    ```

## 🌐 Netlify-da sozlash (Deploy)

Netlify-da **"Site configuration" -> "Environment variables"** bo'limiga o'ting va quyidagi o'zgaruvchini qo'shing:

- **Key**: `GOOGLE_GENAI_API_KEY`
- **Value**: *(Sizning Gemini AI API kalitingiz)*

**Build Settings** (Qurish sozlamalari):
- **Build command**: `npm run build`
- **Publish directory**: `.next`

## ✨ Imkoniyatlar:
- **Dashboard**: Real-vaqt statistikasi va PDF hisobot.
- **Shtrix-kod Skaneri**: Mahsulotlarni kamera orqali aniqlash (Kirim/Chiqim/Audit).
- **Inventarizatsiya**: Zaxiralarni solishtirish va to'g'rilash (Adminlar uchun).
- **Professional PDF Chek**: Logo va shtrix-kodli avtomatik cheklar.
- **Excel Eksport**: Zaxira ma'lumotlarini yuklab olish.
- **AI Assistant**: Tizim ichidagi aqlli yordamchi (Har bir sahifada).

---
Created by **X e M team** © 2026
