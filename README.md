
# 🚀 omborchi.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://omborchi.uz](https://omborchi.uz)

---

## 🛠️ GitLab Repozitoriyasiga ulash

Loyihangizni GitLab-ga (`omborchi-group/omborchi-project`) yuklash uchun quyidagi buyruqlarni terminalda ketma-ket bajaring:

### 1. Loyihani tayyorlash
```bash
git init
git add .
git commit -m "Initial commit: Professional Warehouse Management System"
```

### 2. GitLab-ga bog'lash va yuklash
```bash
git remote add origin https://gitlab.com/omborchi-group/omborchi-project.git
git branch -M main
git push -u origin main
```

---

## 🌐 Domen va Hosting sozlamalari

### 1. Tekin subdomen
Firebase Hosting sizga avtomatik ravishda bepul SSL sertifikati bilan `project-id.web.app` subdomenini beradi.

### 2. Custom Domen (omborchi.uz) ulanishi
Agar sizda xususiy domen bo'lsa, Firebase Console -> Hosting bo'limiga o'ting va quyidagi DNS yozuvlarini kiriting:

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
