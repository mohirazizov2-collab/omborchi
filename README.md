# 🚀 omborchi-ai.uz - Professional Ombor Boshqaruvi Tizimi
Rasmiy havola: [https://omborchi-ai.uz](https://omborchi-ai.uz)
---
## 🌐 GitHub Pages Deployment
Loyihangiz GitHub Pages-da `/omborchi/` sub-path ostida ishlashi uchun sozlangan. Har qanday o'zgarishdan keyin quyidagi amallarni bajaring:
1.  **Build va Export**:
    Terminalda loyihani build qiling:
```bash
    npm run build
```
    Bu buyruq `out` nomli papka yaratadi. GitHub Pages aynan shu papka ichidagi fayllarni ko'rsatishi kerak.
2.  **GitHub Settings**:
    - GitHub-da loyiha sozlamalariga (Settings) kiring.
    - **Pages** bo'limiga o'ting.
    - **Build and deployment** qismida "Static HTML" yoki "GitHub Actions" orqali deployment-ni tanlang.
    - Agar statik yuklayotgan bo'lsangiz, `out` papkasini `gh-pages` branchiga yuklang.
### 🛠️ GitHub-ga yuklash buyruqlari:
```bash
git add .
git commit -m "Fix: Preview and GitHub Pages configurations"
git push origin main
```
---
## 🚀 Texnologiyalar
*   **Frontend**: Next.js 15 (App Router, Static Export)
*   **Backend**: Firebase Auth & Firestore
*   **AI**: Google Gemini (Genkit)
*   **PDF/Excel**: Professional Multilingual Support
**Eslatma**: GitHub Pages faqat statik fayllarni qo'llab-quvvatlaydi. Genkit AI funksiyalari (Server Actions) ishlashi uchun Firebase App Hosting-dan foydalanish tavsiya etiladi. Preview rejimida muammo bo'lmasligi uchun `next.config.ts` faylida `basePath` shartli ravishda sozlangan.

## Super Admin, korxonalar va obunalar
- Super Admin paneli `/admin-panel` sahifasida: korxonani ID, login va boshlang'ich parol bilan yaratish, kompaniyani alohida yoqish/o'chirish, obunani yoqish/to'xtatish yoki uzaytirish mumkin.
- Korxona foydalanuvchilari tizimga **korxona ID + login + parol** bilan kiradi. Avvalgi email orqali kirish ham saqlangan.
- Har bir yangi korxonaning ombor ma'lumotlari Firestore'da `companies/{companyId}` ostida alohida saqlanadi. Mavjud korxonaning eski ma'lumotlari ko'chirilmaydi va avvalgi hisoblar uchun ildiz kolleksiyalarida qoladi.
- `/admin-panel` orqali yaratilgan korxona, egasi va telefon ma'lumotlari `companies/{companyId}` va `companies/{companyId}/users/{uid}` ga; obuna tarixi `companies/{companyId}/subscriptions` ga saqlanadi. Yangi korxonada boshlang'ich obuna standart holatda o'chiq; Super Admin sinov/pullik obunani o'zi tanlaydi. To'lovlar `companies/{companyId}/payments` da yoziladi va `totalPaid` atomik ravishda yangilanadi. Obunani uzaytirish korxona hujjatidagi muddatni va obuna tarixini bir batch'da saqlaydi.
- Kompaniya akkauntlarini boshqarish `/api/admin/companies` va `/api/admin/companies/{companyId}/users` API'lari orqali bajariladi. Har bir so'rov Firebase ID tokenini tekshiradi va Super Admin emailini serverda tasdiqlaydi; Firebase Admin SDK serverda Auth akkauntlarini yaratadi, tahrirlaydi, bloklaydi va parolni tiklaydi. Parollar Firestore'ga yozilmaydi yoki API javobida qaytarilmaydi. O'zgarishlar `companies/{companyId}/accountAuditLogs` da qayd etiladi.
- Kompaniya a'zolari `companies/{companyId}/users/{uid}` hujjatlaridir. Eski hujjatlarda `status` yoki `companyStatus` bo'lmasa, avvalgi ishlashni saqlash uchun faol deb qaraladi. Akkauntni o'chirish Firebase Auth, login gate va Firestore qoidalarida bir xil qo'llanadi.
- Server API `firebase.json` dagi Next.js framework backend yoki Firebase App Hosting kabi server muhitida ishlashi kerak; GitHub Pages statik exporti API route'larni ishlatmaydi. Deploy qilish uchun Firebase CLI orqali `firebase deploy --only hosting,firestore:rules` buyrug'ini bajaring; `npm run deploy`/GitHub Pages API'ni joylamaydi. Hosting runtime service account'iga Firebase Authentication foydalanuvchilarini boshqarish (`roles/firebaseauth.admin`) va Firestore (`roles/datastore.user`) huquqlarini bering. Local ishlab chiqishda service account qiymatlarini faqat private environment secret sifatida `FIREBASE_ADMIN_CLIENT_EMAIL` va `FIREBASE_ADMIN_PRIVATE_KEY` orqali sozlang. Service account fayli yoki maxfiy kalitni repository'ga commit qilmang.
- Admin paneldagi “Faol (30 kun)” — oxirgi 30 kunda kirgan foydalanuvchi hisoblari. Faollik va obuna muddatini Firestore qoidalari ham tekshiradi.
- Xavfsiz kirish va admin-panel yozuvlari ishlashi uchun yangilangan Firestore qoidalarini Firebase loyihasiga chiqarish shart: `firebase deploy --only firestore:rules`.
- Admin panel va yangi korxona oqimini ishga tushirishdan oldin Firebase Console'da Email/Password sign-in yoqilganini tekshiring.

Created by **X e M team** © 2026

Last updated: 2026-03-24 v2
