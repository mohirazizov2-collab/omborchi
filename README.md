
# 🚀 ombor.uz - Netlify-ga Joylashning Yakuniy Qo'llanmasi

Ushbu loyihani Netlify-da muammosiz ishga tushirish uchun quyidagi 3 ta bosqichni ketma-ket bajaring:

---

## 1-Bosqich: Kodni GitHub-ga yangilash
Terminalga (Studio pastidagi qora oyna) quyidagi buyruqlarni birma-bir yozing:

```bash
git add .
git commit -m "fix: netlify deployment configuration"
git push origin main
```

---

## 2-Bosqich: Netlify Sozlamalari (Muhim!)
Netlify panelida loyihangizga kiring va **"Site configuration" -> "Build & deploy"** bo'limida quyidagilar to'g'ri ekanligini tekshiring:

1.  **Build command**: `npm run build`
2.  **Publish directory**: `.next`
3.  **Environment variables** (AI ishlashi uchun):
    *   **Key**: `GOOGLE_GENAI_API_KEY`
    *   **Value**: (Siz Google AI Studio-dan olgan kalit)

---

## 3-Bosqich: Qayta ishga tushirish (Redeploy)
Agar saytingiz hali ham "Page not found" ko'rsatayotgan bo'lsa:
1. Netlify-da **"Deploys"** menyusiga kiring.
2. **"Trigger deploy"** tugmasini bosing va ichidan **"Clear cache and deploy site"** variantini tanlang.

---

## 🔑 AI Kalitini qayerdan olaman?
Agar sizda hali kalit bo'lmasa, uni bu yerdan mutlaqo tekinga oling:
[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### ⚠️ "Page not found" nega chiqadi?
Bu xato odatda Netlify saytni qurishni (build) tugatmasidan oldin yoki `Publish directory` noto'g'ri sozlanganida chiqadi. Yuqoridagi `netlify.toml` va `README` bu muammoni hal qiladi.

Created by **X e M team** © 2026
