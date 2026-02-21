
# 🚀 ombor.uz - Netlify-da ishga tushirish (Yakuniy qo'llanma)

Agar Netlify-da "Page not found" xatosi chiqsa yoki loyiha ishlamasa, quyidagi amallarni bajaring:

## 🛠 1-qadam: Kodni GitHub-ga yuklash (Qaytadan)
Terminalga (pastdagi qora oyna) quyidagi buyruqlarni kiriting:

1. **O'zgarishlarni saqlash:**
   ```bash
   git add .
   git commit -m "Fix: Netlify configuration update"
   git push origin main
   ```

## 🌐 2-qadam: Netlify Sozlamalarini Tekshirish
Netlify saytida loyihangizga kiring va **Site configuration** -> **Build & deploy** bo'limida quyidagilar to'g'riligiga ishonch hosil qiling:

- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Base directory:** (bo'sh qoldiring)

## 🔑 3-qadam: AI Kalitini kiritish (Muhim!)
AI funksiyalari ishlashi uchun Netlify-da:
1. **Site configuration** -> **Environment variables** bo'limiga o'ting.
2. **"Add a variable"** tugmasini bosing:
   - **Key:** `GOOGLE_GENAI_API_KEY`
   - **Value:** [Google AI Studio](https://aistudio.google.com/app/apikey) dan olgan kalitingizni qo'ying.
3. Saqlab bo'lgach, **"Deploys"** bo'limiga o'tib, **"Trigger deploy"** -> **"Clear cache and deploy site"** tugmasini bosing.

---
Created by **X e M team** © 2026
