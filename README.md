
# 🚀 ombor.uz - GitHub + Netlify To'liq Yo'riqnomasi

Loyihani GitHub-ga yuklash va Netlify-da bir umrga bepul ishga tushirish uchun ushbu qadamlarni aniq bajaring:

---

## 1-Bosqich: Kodni GitHub-ga yuborish
Terminalga (pastdagi qora oyna) ushbu buyruqlarni birma-bir yozing:

```bash
git add .
git commit -m "feat: finalized build config for netlify"
git push origin main
```

---

## 2-Bosqich: Netlify-da sozlash (Rasmga asosan)
1.  [Netlify.com](https://app.netlify.com/) sahifasiga kiring.
2.  **"Add new site"** -> **"Import an existing project"** tugmasini bosing.
3.  **GitHub**-ni tanlang va loyihangizni ro'yxatdan toping.
4.  **Site configuration** oynasida quyidagilarni kiriting:
    *   **Base directory**: (Bo'sh qoldiring)
    *   **Build command**: `npm run build`
    *   **Publish directory**: `.next`
    *   **Functions directory**: `netlify/functions`
5.  **"Deploy site"** tugmasini bosing.

---

## 3-Bosqich: AI ishlashi uchun (MUHIM!)
Netlify panelida saytingiz qurilayotgan vaqtda:
1.  **Site configuration** -> **Environment variables** bo'limiga kiring.
2.  **Add a variable** tugmasini bosing.
3.  **Key**: `GOOGLE_GENAI_API_KEY`
4.  **Value**: (Sizning Google AI kalitingiz)
5.  O'zgarishni saqlang va **Deploys** menyusidan **"Trigger deploy"** -> **"Clear cache and deploy site"**-ni tanlang.

---

## 🛠️ Muammo bormi?
Agar Netlify-da "Page not found" yoki "Build failed" xatosi chiqsa, `netlify.toml` fayli borligini va unda `[[plugins]] package = "@netlify/plugin-nextjs"` qatori mavjudligini tekshiring (hozirgi kodda bu tayyor).

Created by **X e M team** © 2026
