export interface ProductData {
  name: string;
  sku: string;
  unit: 'pcs' | 'kg' | 'g' | 'm' | 'cm' | 'l' | 'ml' | 'm2' | 'm3' | 'set' | 'bag' | 'box' | 'pack';
}

/**
 * Ushbu ro'yxat vaqtinchalik tozalangan.
 */
export const productsList1: ProductData[] = [];
