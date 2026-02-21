
# 🚀 ombor.uz - GitHub + Netlify To'liq Yo'riqnomasi

Loyihani Netlify-da mutlaqo bepul ishga tushirish uchun ushbu qadamlarni bajaring:

---

## 1-Bosqich: Kodni GitHub-ga yuborish
Terminalga ushbu buyruqlarni ketma-ket yozing:

```bash
git add .
git commit -m "feat: finalized deployment config"
git push origin main
```

---

## 2-Bosqich: Netlify-da sozlash (Siz ko'rib turgan oyna)
Netlify-da loyihani tanlagandan so'ng, quyidagi ma'lumotlarni kiriting:

1.  **Build settings**:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `.next`
2.  **Environment Variables (Siz yuborgan rasm qismi)**:
    *   **"Contents of .env file"** oynasiga quyidagilarni yozing:
    ```text
    GOOGLE_GENAI_API_KEY=Sizning_Google_AI_Kalitingiz
    ```
    *(Eslatma: Kalitni `https://aistudio.google.com/` saytidan olishingiz mumkin)*

3.  **Tugmalarni tanlang**:
    *   **Scopes**: `All scopes` (tanlangan bo'lsin)
    *   **Deploy contexts**: `All deploy contexts` (tanlangan bo'lsin)

4.  **"Import variables"** tugmasini bosing va pastdagi **"Deploy site"** ni bosing.

---

## 3-Bosqich: AI ishlashi uchun muhim!
Agar sayt qurilib bo'lgandan keyin AI (chat) ishlamasa:
1.  Netlify panelida **Site configuration** -> **Environment variables** bo'limiga kiring.
2.  `GOOGLE_GENAI_API_KEY` borligini tekshiring.
3.  **Deploys** menyusidan **"Trigger deploy"** -> **"Clear cache and deploy site"** ni tanlang.

---

## 🛠️ Muammo bormi?
Agar sayt ochilmasa, `netlify.toml` fayli loyiha ildizida borligiga ishonch hosil qiling. Hozirgi kodda bu fayl tayyor holatda.

Created by **X e M team** © 2026
