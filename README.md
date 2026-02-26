
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

Domeningizni tizimga bog'lash uchun quyidagi yozuvlarni domen boshqaruv paneliga kiriting:

### 1. A Record (Asosiy IP manzil):
*   **Type (Turi)**: A Record
*   **Host/Name**: `@` yoki `ombor.uz`
*   **Value (Qiymati)**: `199.36.158.100`

### 2. TXT Record (Egalikni tasdiqlash uchun):
Firebase loyihangizni tanishi uchun ushbu TXT yozuvini albatta kiritishingiz kerak:
*   **Type**: TXT
*   **Host**: `@`
*   **Value**: `hosting-site-studio-4209846898-d5885`

---

## 🌍 Loyihani internetga chiqarish (Deploy)

Saytingizdagi o'zgarishlarni yangilash uchun terminalda quyidagi buyruqlarni ketma-ket yozing:

1.  `firebase login` (agar kirmagan bo'lsangiz)
2.  `firebase deploy`

**Eslatma:** DNS sozlamalari yangilangandan so'ng, sayt to'liq ishga tushishi uchun odatda 1 soatdan 24 soatgacha vaqt talab qilinishi mumkin.

Created by **X e M team** © 2026
