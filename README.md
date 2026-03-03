
# 🚀 omborchi.uz - Professional Ombor Boshqaruvi Tizimi

Rasmiy havola: [https://omborchi.uz](https://omborchi.uz)

---

## 🌐 Domen olish va ulash bo'yicha qo'llanma

### 1. Domen sotib olish (Getting a Domain)
Firebase domenlarni to'g'ridan-to'g'ri sotmaydi. Domen sotib olish uchun quyidagi xizmatlardan foydalanishingiz mumkin:
*   **O'zbekistonda**: [uzinfocom.uz](https://cctld.uz), [webname.uz](https://webname.uz), [arsenal-d.uz](https://www.as.uz) ( .UZ domenlar uchun).
*   **Xalqaro**: [Namecheap](https://namecheap.com), [GoDaddy](https://godaddy.com) ( .COM, .NET, .ORG uchun).

### 2. Domenni Firebase-ga ulash
Domen sotib olganingizdan so'ng:
1.  Firebase Console-ga kiring -> **Hosting** bo'limini tanlang.
2.  **Add Custom Domain** tugmasini bosing.
3.  O'z domeningizni (`omborchi.uz`) yozing.
4.  Firebase sizga **TXT** va **A record** ma'lumotlarini beradi.

### 3. DNS sozlamalari (omborchi.uz uchun)
Domen sotib olgan joyingizdagi boshqaruv paneliga quyidagi 2 ta yozuvni kiriting:

**A Record (Asosiy IP):**
*   **Type**: `A`
*   **Host**: `@`
*   **Value**: `199.36.158.100`

**TXT Record (Egalikni tasdiqlash):**
*   **Type**: `TXT`
*   **Host**: `@`
*   **Value**: `hosting-site=studio-4209846898-d5885`

---

## 🛠️ Texnologiyalar
*   **Frontend**: Next.js 15 (App Router)
*   **Backend**: Firebase Auth & Firestore
*   **AI**: Google Gemini (Genkit)
*   **Hosting**: Firebase Hosting

Created by **X e M team** © 2026
