
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

Domeningizni Firebase-ga bog'lash uchun DNS provayderingiz (masalan, Uzinfocom yoki boshqa panel)ga quyidagi 2 ta yozuvni kiriting. **Muhim:** Eski barcha `A` yoki `CNAME` yozuvlarini o'chirib tashlang!

### 1. A Record (Asosiy IP manzil):
*   **Type (Turi)**: `A`
*   **Host (Nomi)**: `@` (yoki bo'sh qoldiring)
*   **Value (Qiymati)**: `199.36.158.100`

### 2. TXT Record (Egalikni tasdiqlash uchun):
*   **Type (Turi)**: `TXT`
*   **Host (Nomi)**: `@` (yoki bo'sh qoldiring)
*   **Value (Qiymati)**: `hosting-site=studio-4209846898-d5885`  <-- **DIQQAT: `=` belgisi bo'lishi shart!**

---

## ⚠️ DNS Xatoligini hal qilish (Troubleshooting)

Agar "DNS request failed" yoki "Needs setup" xatosi chiqsa, quyidagilarni tekshiring:

1.  **Konfliktlar**: Paneldagi barcha eski IP manzillarni va ayniqsa `CNAME` yozuvlarini o'chirib tashlang. Root domenda (`omborchi.uz`) ham `A`, ham `CNAME` yozuvi bo'lishi mumkin emas.
2.  **Host qismi**: Ko'p panellarda "Host" degan joyga domen nomini emas, shunchaki `@` belgisini yozish kerak.
3.  **To'g'ri qiymat**: TXT qiymati aynan `hosting-site=...` ko'rinishida ekanini tekshiring.
4.  **Propagation**: DNS o'zgarishi butun dunyoga tarqalishi uchun **1 soatdan 24 soatgacha** vaqt ketishi mumkin.

---

## 🌍 Loyihani yangilash (Deploy)

Terminalda:
1. `firebase login`
2. `firebase deploy`

Created by **X e M team** © 2026
