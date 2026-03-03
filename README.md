
# 🚀 omborchi.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://omborchi.uz](https://omborchi.uz)

---

## 🛠️ Loyihani Git-provayderga yuklash (GitHub/GitLab)

Loyihangizni GitHub yoki boshqa provayderga yuklash uchun quyidagi buyruqlarni Terminalda bajaring:

### 1. Git-ni ishga tushirish
```bash
git init
git add .
git commit -m "Initial commit: Professional Warehouse Management System"
```

### 2. GitHub-da yangi repozitoriya oching va bog'lang
```bash
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## 🌐 Domen va Hosting sozlamalari

### 1. Tekin subdomen
Firebase Hosting sizga avtomatik ravishda bepul SSL sertifikati bilan `project-id.web.app` subdomenini beradi.

### 2. Custom Domen (omborchi.uz) ulanishi
Agar sizda xususiy domen bo'lsa, Firebase Console -> Hosting -> "Add Custom Domain" bo'limiga o'ting va quyidagi DNS yozuvlarini kiriting:

**A Record:**
*   **Host**: `@`
*   **Value**: `199.36.158.100`

**TXT Record (Tasdiqlash):**
*   **Host**: `@`
*   **Value**: `hosting-site=studio-4209846898-d5885`

---

## 🚀 Texnologiyalar
*   **Frontend**: Next.js 15 (App Router)
*   **Backend**: Firebase Auth & Firestore
*   **AI**: Google Gemini (Genkit)
*   **Kutubxonalar**: ShadCN UI, Lucide Icons, Recharts, jsPDF, XLSX

Created by **X e M team** © 2026
