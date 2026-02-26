
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

Sizning so'rovingizga binoan, Firebase IP-manzili olib tashlandi va shaxsiy IP-manzilingizni kiritish uchun yo'riqnoma tayyorlandi.

### 1. DNS panelda kiritilishi kerak bo'lgan yozuvlar:
Domeningiz boshqaruv paneliga (DNS settings) kiring va quyidagi yozuvni qo'shing:

*   **Type (Turi)**: A Record
*   **Host/Name**: `@` yoki `ombor.uz`
*   **Value (Qiymati)**: `[BU YERGA O'ZINGIZNING IP MANZILINGIZNI YOZING]`

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

**Eslatma:** Agar siz o'zingizning shaxsiy IP-manzilingizni DNS-ga bog'lasangiz, Firebase Hosting orqali avtomatik ulanish uzilishi mumkin. Bunday holda saytni o'sha shaxsiy IP-ga ega serveringizda sozlashingiz kerak bo'ladi.

Created by **X e M team** © 2026
