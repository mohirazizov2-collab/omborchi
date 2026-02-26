
export interface PredefinedProduct {
  name: string;
  sku: string;
  unit: 'pcs' | 'kg' | 'g' | 'm' | 'cm' | 'l' | 'ml' | 'm2' | 'm3' | 'set' | 'bag' | 'box' | 'pack';
}

/**
 * Barcha oldindan tayyorlangan mahsulotlar o'chirildi.
 * Endi foydalanuvchi mahsulotlarni o'zi qo'shishi kerak.
 */
export const PREDEFINED_PRODUCTS: PredefinedProduct[] = [];
