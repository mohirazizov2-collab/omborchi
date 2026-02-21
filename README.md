
# 🚀 ombor.uz - Tekin Hostingga Joylash Qo'llanmasi

Ushbu loyihani internetga mutlaqo BEPUL chiqarish uchun eng yaxshi variantlar:

## 🌐 1-Variant: Vercel (Tavsiya etiladi - Eng osoni)
Next.js loyihalari uchun eng optimal platforma.
1. [Vercel.com](https://vercel.com) saytiga kiring va GitHub orqali ro'yxatdan o'ting.
2. **"Add New" -> "Project"** tugmasini bosing.
3. GitHub-dagi ushbu loyihani tanlang.
4. **Environment Variables** bo'limiga:
   - Key: `GOOGLE_GENAI_API_KEY`
   - Value: `SIZNING_AI_KALITINGIZ` (Google AI Studio-dan olingan)
5. "Deploy" tugmasini bosing. Bo'ldi!

## 🌐 2-Variant: Netlify
1. [Netlify.com](https://www.netlify.com) saytiga kiring.
2. GitHub-ni ulab, loyihani tanlang.
3. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `.next`
4. **Environment Variables** bo'limiga `GOOGLE_GENAI_API_KEY` ni qo'shing.

---

## 🛠 Terminal Buyruqlari (Kodni GitHub-ga yuborish)
Agar loyihani yangilamoqchi bo'lsangiz, terminalga ketma-ket yozing:

```bash
git add .
git commit -m "fix: genkit server-side initialization"
git push origin main
```

## 🔑 AI Kalitini olish
AI funksiyalari ishlashi uchun kalitni bu yerdan oling:
[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## 🔗 Firebase Boshqaruvi
Ma'lumotlar bazasini (Firestore) kuzatish uchun:
[Firebase Console](https://console.firebase.google.com/project/studio-4209846898-d5885)

Created by **X e M team** © 2026
