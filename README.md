
# 🚀 ombor.uz - Boshqaruv va Deploy Qo'llanmasi

Ushbu loyihani internetga chiqarish uchun barcha kerakli manzillar va qadamlar:

## 🔗 Muhim Havolalar
1. **Firebase Console (Asosiy):** [https://console.firebase.google.com/project/studio-4209846898-d5885](https://console.firebase.google.com/project/studio-4209846898-d5885)
2. **App Hosting (Deploy qilish joyi):** [https://console.firebase.google.com/project/studio-4209846898-d5885/apphosting](https://console.firebase.google.com/project/studio-4209846898-d5885/apphosting)
3. **Firestore Database (Ma'lumotlar):** [https://console.firebase.google.com/project/studio-4209846898-d5885/firestore](https://console.firebase.google.com/project/studio-4209846898-d5885/firestore)

---

## 1️⃣ Kodni GitHub-ga yuklash
Terminalga (pastdagi qora oyna) ushbu buyruqlarni ketma-ket yozing:
```bash
git init
git add .
git commit -m "firebase hosting update"
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPOS_NOMI.git
git push -u origin main
```

## 2️⃣ Firebase Hosting-ni yoqish
1. [App Hosting](https://console.firebase.google.com/project/studio-4209846898-d5885/apphosting) sahifasiga kiring.
2. **"Get Started"** tugmasini bosing.
3. GitHub hisobingizni ulang va loyihangizni (repository) tanlang.
4. Deploy tugmasini bosing. 

## 3️⃣ AI Kalitini Sozlash (Muhim!)
Deploy tugallangandan so'ng, Firebase Console-da:
1. **App Hosting** -> **Settings** -> **Environment Variables** bo'limiga kiring.
2. **Key**: `GOOGLE_GENAI_API_KEY`
3. **Value**: Sizning Google AI Studio kalitingiz.

---
**Eslatma:** Agar Firebase-da billing (karta) bilan muammo bo'lsa, mutlaqo bepul bo'lgan [Netlify.com](https://www.netlify.com/) orqali GitHub-ni ulab ishlatishingiz mumkin.

Created by **X e M team** © 2026
