
# 🚀 omborchi.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://omborchi.uz](https://omborchi.uz)

---

## 🛠️ Git Provayderiga (GitHub/GitLab) ulash

Loyihangizni Git repozitoriyasiga yuklash uchun terminalda quyidagi buyruqlarni bajaring:

### 1. Loyihani tayyorlash
```bash
git init
git add .
git commit -m "Initial commit: Advanced Warehouse Management System"
```

### 2. Masofaviy repozitoriyaga bog'lash (GitLab misolida)
```bash
git remote add origin https://gitlab.com/omborchi-group/omborchi-project.git
git branch -M main
git push -u origin main
```

---

## 🌐 Domen va Hosting sozlamalari

Firebase Hosting sizga avtomatik ravishda bepul SSL sertifikati bilan `project-id.web.app` subdomenini beradi.

### Custom Domen (omborchi.uz) ulash tartibi:
1. **Domen sotib olish**: Uzinfocom, GoDaddy yoki Namecheap orqali domen sotib oling.
2. **Firebase Console**: Hosting bo'limiga o'ting va "Add Custom Domain" tugmasini bosing.
3. **DNS Sozlamalari**: Domen provayderingiz panelida quyidagi yozuvlarni kiriting:

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
