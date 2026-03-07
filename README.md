
# 🚀 omborchi.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://mohirazizov2-collab.github.io/omborchi/](https://mohirazizov2-collab.github.io/omborchi/)

---

## 🌐 GitHub Pages Deployment

Loyihangiz GitHub Pages-da `/omborchi/` sub-path ostida ishlashi uchun sozlangan. Har qanday o'zgarishdan keyin quyidagi amallarni bajaring:

1.  **Build va Export**:
    Terminalda loyihani build qiling:
    ```bash
    npm run build
    ```
    Bu buyruq `out` nomli papka yaratadi. GitHub Pages aynan shu papka ichidagi fayllarni ko'rsatishi kerak.

2.  **GitHub Settings**:
    - GitHub-da loyiha sozlamalariga (Settings) kiring.
    - **Pages** bo'limiga o'ting.
    - **Build and deployment** qismida "Static HTML" yoki "GitHub Actions" orqali deployment-ni tanlang.
    - Agar statik yuklayotgan bo'lsangiz, `out` papkasini `gh-pages` branchiga yuklang.

### 🛠️ GitHub-ga yuklash buyruqlari:

```bash
git add .
git commit -m "Update: GitHub Pages configuration and bug fixes"
git push origin main
```

---

## 🚀 Texnologiyalar
*   **Frontend**: Next.js 15 (App Router, Static Export)
*   **Backend**: Firebase Auth & Firestore
*   **AI**: Google Gemini (Genkit)
*   **PDF/Excel**: Professional Multilingual Support

**Eslatma**: GitHub Pages faqat statik fayllarni qo'llab-quvvatlaydi. Genkit AI funksiyalari (Server Actions) ishlashi uchun Firebase App Hosting-dan foydalanish tavsiya etiladi.

Created by **X e M team** © 2026
