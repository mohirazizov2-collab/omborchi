
# 🚀 ombor.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://ombor.uz](https://ombor.uz)

---

## 🛠️ Texnologiyalar
Ushbu tizim eng zamonaviy texnologiyalar asosida qurilgan:
*   **Frontend**: Next.js 15 (App Router)
*   **Backend**: Firebase Auth & Firestore
*   **AI**: Google Gemini (Genkit)
*   **Hosting**: Firebase Hosting

---

## 🌐 Domenni (ombor.uz) ulash uchun DNS sozlamalari

Firebase Console-dagi so'rovga asosan, domeningiz DNS paneliga quyidagi yozuvlarni kiriting:

### 1. O'chirish kerak bo'lgan eski yozuv:
*   **Type**: A
*   **Value**: `92.255.111.71` (Buni o'chiring)

### 2. Qo'shish kerak bo'lgan yangi yozuvlar:
*   **Record 1 (A Record)**:
    *   **Host/Name**: `@` yoki `ombor.uz`
    *   **Value**: `199.36.158.100`
*   **Record 2 (TXT Record)**:
    *   **Host/Name**: `@` yoki `ombor.uz`
    *   **Value**: `hosting-site-studio-4209846898-d5885`

---

## 🌍 Loyihani internetga chiqarish (Deploy)

Saytingizdagi o'zgarishlarni yangilash uchun:

1.  Terminalda tizimga kiring: `firebase login`
2.  Loyihani internetga chiqaring: `firebase deploy`

Deploy bo'lgandan so'ng va DNS yozuvlar tarqalgach (1-24 soat), saytingiz `ombor.uz` manzilida ishlay boshlaydi.

Created by **X e M team** © 2026
