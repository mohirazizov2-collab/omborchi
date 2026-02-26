
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

**MUHIM:** Firebase-dagi eski `.web.app` domenlari o'chib ketmaydi, bu normal holat. Asosiysi `ombor.uz` ni sozlash.

Firebase Console-dagi so'rovga asosan, domeningiz DNS paneliga quyidagi yozuvlarni kiriting:

### 1. O'chirish kerak bo'lgan eski yozuv:
*   **Type**: A
*   **Value**: `92.255.111.71` (Buni albatta o'chiring, aks holda sayt ochilmaydi)

### 2. Qo'shish kerak bo'lgan yangi yozuvlar:
*   **Record 1 (A Record)**:
    *   **Host/Name**: `@` yoki `ombor.uz`
    *   **Value**: `199.36.158.100`
*   **Record 2 (TXT Record)**:
    *   **Host/Name**: `@` yoki `ombor.uz`
    *   **Value**: `hosting-site-studio-4209846898-d5885`

---

## 🌍 Loyihani internetga chiqarish (Deploy)

Saytingizdagi o'zgarishlarni yangilash uchun terminalda quyidagi buyruqlarni ketma-ket yozing:

1.  `firebase login` (agar kirmagan bo'lsangiz)
2.  `firebase deploy`

Deploy bo'lgandan so'ng va DNS yozuvlar tarqalgach (1-24 soat), saytingiz `ombor.uz` manzilida to'liq ishlay boshlaydi.

Created by **X e M team** © 2026
