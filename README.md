
# 🚀 ombor.uz - Netlify-ga Noldan Joylash Qo'llanmasi

Ushbu loyihani internetga mutlaqo BEPUL va karta talab qilmasdan chiqarish uchun quyidagi qadamlarni bajaring:

---

## 1-Qadam: Kodni GitHub-ga yuklash
Agar sizda hali GitHub-da repo bo'lmasa:
1. [GitHub.com](https://github.com) saytida yangi loyiha (repository) yarating.
2. Terminalga (Studio pastidagi qora oyna) quyidagi buyruqlarni ketma-ket yozing:

```bash
git add .
git commit -m "feat: initial commit for netlify"
git remote add origin https://github.com/SIZNING_PROFIL/LOYIHA_NOMI.git
git push -u origin main
```

---

## 2-Qadam: Netlify-da loyihani ochish
1. [Netlify.com](https://www.netlify.com) saytiga kiring va GitHub orqali ro'yxatdan o'ting.
2. **"Add New Site" -> "Import an existing project"** tugmasini bosing.
3. GitHub-ni tanlang va yaratgan loyihangizni qidiring.
4. **Build Settings** bo'limida (odatda o'zi avtomatik to'ladi):
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`

---

## 3-Qadam: AI Kalitini (Environment Variable) qo'shish
Sayt ishlashi uchun AI kalitini Netlify-ga tanitish shart:
1. Netlify-da loyiha sozlamalariga kiring: **"Site configuration" -> "Environment variables"**.
2. **"Add a variable"** tugmasini bosing:
   - **Key:** `GOOGLE_GENAI_API_KEY`
   - **Value:** (Siz Google AI Studio-dan olgan uzun kalit)
3. "Save" tugmasini bosing.

---

## 4-Qadam: Yakuniy ishga tushirish (Deploy)
1. **"Deploys"** bo'limiga o'ting.
2. **"Deploy site"** yoki **"Trigger deploy"** tugmasini bosing.
3. Bir necha daqiqa kuting. Saytingiz tayyor bo'lgach, Netlify sizga maxsus havola (URL) beradi.

---

## 🔑 AI Kalitini qayerdan olaman?
Agar sizda hali kalit bo'lmasa, uni bu yerdan mutlaqo tekinga oling:
[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

Created by **X e M team** © 2026
