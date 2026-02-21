
# 🚀 ombor.uz - Netlify-da ishga tushirish (Yakuniy qo'llanma)

Agar Firebase Studio-dagi "Publish" tugmasi billing (to'lov) so'rasa, quyidagi mutlaqo bepul yo'ldan foydalaning:

## 🛠 1-qadam: Kodni GitHub-ga yuklash
Pastdagi terminalga (qora oyna) ushbu buyruqlarni ketma-ket kiriting:

1. **Git-ni sozlash:**
   ```bash
   git init
   git add .
   git commit -m "ombor.uz: Ready for Netlify"
   ```
2. **GitHub-ga ulanish:**
   *(GitHub-da yangi bo'sh repo oching va uning linkini pastdagisiga almashtiring)*
   ```bash
   git remote add origin https://github.com/FOYDALANUVCHI_NOMI/ombor-uz.git
   git push -u origin main
   ```

## 🌐 2-qadam: Netlify-da Deploy qilish
1. [Netlify.com](https://app.netlify.com/) ga kiring va GitHub orqali ro'yxatdan o'ting.
2. **"Add new site"** -> **"Import an existing project"** tugmasini bosing.
3. GitHub-dagi `ombor-uz` loyihangizni tanlang.
4. **Sozlamalar:**
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

## 🔑 3-qadam: AI Kalitini kiritish (Muhim!)
AI funksiyalari ishlashi uchun Netlify-da:
1. **Site configuration** -> **Environment variables** bo'limiga o'ting.
2. **"Add a variable"** tugmasini bosing:
   - **Key:** `GOOGLE_GENAI_API_KEY`
   - **Value:** [Google AI Studio](https://aistudio.google.com/app/apikey) dan olgan kalitingizni qo'ying.
3. Saqlab bo'lgach, **"Deploy site"** tugmasini bosing.

---
Created by **X e M team** © 2026
