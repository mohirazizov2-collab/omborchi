
# 🚀 ombor.uz - Yakuniy ishga tushirish yo'riqnomasi

Ushbu loyiha NextJS, Firebase va Gemini AI yordamida yaratilgan zamonaviy ombor boshqaruvi tizimidir.

## 🛠 1-qadam: Loyihani GitHub-ga joylash
Terminalga (pastki qismdagi qora oyna) quyidagi buyruqlarni ketma-ket kiriting:

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
   git commit -m "Initial commit: ombor.uz ready"
   ```
4. **GitHub-ga ulanish:**
   *(ESLATMA: Quyidagi havolani o'zingiz ochgan GitHub repo havolasi bilan almashtiring)*
   ```bash
   git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ombor-uz.git
   ```
5. **Yuborish:**
   ```bash
   git push -u origin main
   ```

## 🌐 2-qadam: Netlify-da Deploy qilish
Netlify-ga kiring va GitHub-dagi loyihani tanlang. Sozlamalarni quyidagicha to'ldiring:

- **Build command:** `npm run build`
- **Publish directory:** `.next`

## 🔑 3-qadam: AI Kalitini kiritish (Muhim!)
Netlify-da **"Site configuration" -> "Environment variables"** bo'limiga o'ting va quyidagilarni qo'shing:

- **Key:** `GOOGLE_GENAI_API_KEY`
- **Value:** *(Sizning Gemini AI API kalitingiz)*

## ✨ Tizim imkoniyatlari:
- **Dashboard:** Real-vaqt statistikasi va PDF professional hisobot.
- **Inventarizatsiya:** Tizim va haqiqiy qoldiqni solishtirish (Adminlar uchun).
- **PDF Cheklar:** Kirim va Chiqim operatsiyalari uchun logotipli avtomatik cheklar.
- **Excel:** Barcha zaxira ma'lumotlarini yuklab olish.
- **AI Assistant:** Har bir sahifada yordam beruvchi aqlli chatbot.

---
Created by **X e M team** © 2026
