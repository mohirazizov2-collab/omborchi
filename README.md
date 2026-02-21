# ombor.uz - Advanced Inventory Management

Bu NextJS va Firebase yordamida yaratilgan zamonaviy ombor boshqaruvi tizimi.

## GitHub-ga yuklash bo'yicha yo'riqnoma:

Loyihani GitHub-ga yuklash uchun quyidagi qadamlarni bajaring:

1. [GitHub](https://github.com/new)-da yangi repository yarating.
2. Terminalni oching va quyidagi buyruqlarni ketma-ket kiriting:

```bash
# Gitni initsializatsiya qilish
git init

# Fayllarni qo'shish
git add .

# Birinchi commit
git commit -m "Initial commit: ombor.uz base setup"

# Main branch-ga o'tish
git branch -M main

# GitHub repository-ni ulash (URL-ni o'zingiznikiga almashtiring)
git remote add origin https://github.com/FOYDALANUVCHI_NOMI/REPOS_NOMI.git

# Kodni yuklash
git push -u origin main
```

## AI Funksiyalari

Tizimda AI chat va hisobot tahlili ishlashi uchun Gemini API kaliti sozlangan.

### API Kalitini sozlash:
API kaliti `.env` faylida `GOOGLE_GENAI_API_KEY` nomi ostida saqlanadi.

### Imkoniyatlar:
- **Dashboard**: Real-vaqtda zaxira tahlili.
- **AI Tahlil**: Hisobotlarni Gemini AI yordamida tahlil qilish.
- **Stock Management**: Kirim, chiqim va transfer operatsiyalari.
- **Role Based Access**: Super Admin, Admin va Omborchi rollari.
- **Barcode Scanner**: Kamera orqali shtrix-kodlarni skanerlash.
