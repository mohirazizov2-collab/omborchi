
# 🚀 ombor.uz - GitHub + Netlify Yo'riqnomasi

Loyihani GitHub-ga yuklash va Netlify-da bir umrga "tiriltirish" uchun ushbu qadamlarni bajaring:

---

## 1-Bosqich: Kodni GitHub-ga yuborish
Terminalga (pastdagi qora oyna) ushbu buyruqlarni birma-bir yozing:

```bash
git add .
git commit -m "feat: optimized search and netlify config"
git push origin main
```

---

## 2-Bosqich: Netlify-da GitHub-ni ulash
1.  [Netlify.com](https://app.netlify.com/) sahifasiga kiring.
2.  **"Add new site"** -> **"Import an existing project"** tugmasini bosing.
3.  **GitHub**-ni tanlang va loyihangizni ro'yxatdan toping.
4.  Sozlamalarni o'zi avtomatik tanlaydi:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `.next`
5.  **"Deploy"** tugmasini bosing.

---

## 3-Bosqich: AI ishlashi uchun (Muhim!)
Netlify panelida:
1.  **Site configuration** -> **Environment variables** bo'limiga kiring.
2.  **Add a variable** tugmasini bosing.
3.  **Key**: `GOOGLE_GENAI_API_KEY`
4.  **Value**: (Sizning Google AI kalitingiz)
5.  Keyin **Deploys** menyusidan **"Trigger deploy"** -> **"Clear cache and deploy site"**-ni tanlang.

---

## 🛠️ Muammo bormi?
Agar sayt ochilmasa yoki "Page not found" desa, Netlify-da **Next.js Runtime** plagini o'rnatilganini tekshiring (odatda u avtomatik o'rnatiladi).

Created by **X e M team** © 2026
