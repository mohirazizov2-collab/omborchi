# ombor.uz - Advanced Inventory Management

Bu NextJS va Firebase yordamida yaratilgan zamonaviy ombor boshqaruvi tizimi.

## GitHub-ga yuklash (1 daqiqalik qadam):

Men (AI) barcha fayllarni tayyorladim. Endi siz faqat quyidagilarni bajaring:

1. [GitHub](https://github.com/new)-da yangi repository yarating (nomini `ombor-uz` deb qo'yishingiz mumkin).
2. Terminalni oching va quyidagi buyruqlarni kiriting:

```bash
# Gitni sozlash
git init
git add .
git commit -m "Initial commit: ombor.uz full setup"
git branch -M main

# O'zingiz ochgan repository URL-ni ulaymiz 
# (URL-ni o'zingiznikiga almashtiring)
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPO_NOMI.git

# Kodni yuklash
git push -u origin main
```

## Imkoniyatlar:
- **Dashboard**: Real-vaqtda zaxira tahlili.
- **AI Tahlil**: Hisobotlarni Gemini AI yordamida tahlil qilish.
- **Stock Management**: Kirim, chiqim va transfer operatsiyalari.
- **Role Based Access**: Super Admin, Admin va Omborchi rollari.
- **Barcode Scanner**: Kamera orqali shtrix-kodlarni skanerlash.
- **Financial Analysis**: Haftalik va oylik foyda/xarajat hisoboti.

## AI Funksiyalari
Tizimda AI chat va hisobot tahlili ishlashi uchun Gemini API kaliti sozlangan.
API kaliti `.env` faylida `GOOGLE_GENAI_API_KEY` nomi ostida saqlanadi.

---
Created by X e M team © 2026
