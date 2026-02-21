
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

## 🔑 3-qadam: AI Kalitini olish va kiritish (Juda muhim!)
Tizimdagi AI funksiyalari ishlashi uchun sizga bepul Gemini API kaliti kerak:

1. **Kalitni bu yerdan oling:** [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Netlify-da **"Site configuration" -> "Environment variables"** bo'limiga o'ting.
3. **"Add key/value pairs"** tugmasini bosing.
4. Quyidagilarni kiriting:
   - **Key:** `GOOGLE_GENAI_API_KEY`
   - **Value:** *(Siz Google AI Studio-dan nusxalagan kalit)*
5. **"Save"** tugmasini bosing va qaytadan **"Deploy site"** qiling.

---
Created by **X e M team** © 2026
