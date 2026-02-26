
# 🚀 omborchi.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://omborchi.uz](https://omborchi.uz)

---

## 🛠️ Texnologiyalar
Ushbu tizim eng zamonaviy texnologiyalar asosida qurilgan:
*   **Frontend**: Next.js 15 (App Router)
*   **Backend**: Firebase Auth & Firestore
*   **AI**: Google Gemini (Genkit)
*   **Hosting**: Firebase Hosting

---

## 🌐 Domenni (omborchi.uz) ulash uchun DNS sozlamalari

Domeningizni tizimga bog'lash uchun quyidagi yozuvlarni domen boshqaruv paneliga kiriting. **Muhim:** Eski IP manzillarni o'chirib tashlang!

### 1. A Record (Asosiy IP manzil):
*   **Type (Turi)**: A Record
*   **Host/Name**: `@` yoki `omborchi.uz`
*   **Value (Qiymati)**: `199.36.158.100`

### 2. TXT Record (Egalikni tasdiqlash uchun):
Firebase loyihangizni tanishi uchun ushbu TXT yozuvini albatta kiritishingiz kerak:
*   **Type**: TXT
*   **Host**: `@`
*   **Value**: `hosting-site-studio-4209846898-d5885`

---

## ⚠️ DNS Xatoligini hal qilish (DNS request failed)
Agar Firebase "DNS request failed" xatosini ko'rsatsa:
1. **Propagation**: DNS sozlamalari yangilanishi uchun 1-24 soat kuting.
2. **Conflict**: Paneldagi barcha boshqa A va CNAME yozuvlarini o'chiring.
3. **Verify**: Biroz vaqtdan so'ng Firebase Console-da "Verify" tugmasini qayta bosing.

---

## 🌍 Loyihani internetga chiqarish (Deploy)

Saytingizdagi o'zgarishlarni yangilash uchun terminalda quyidagi buyruqlarni ketma-ket yozing:

1.  `firebase login` (agar kirmagan bo'lsangiz)
2.  `firebase deploy`

Created by **X e M team** © 2026
