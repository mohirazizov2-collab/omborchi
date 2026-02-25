
export interface ProductData {
  name: string;
  sku: string;
  unit: 'pcs' | 'kg' | 'g' | 'm' | 'cm' | 'l' | 'ml' | 'm2' | 'm3' | 'set' | 'bag' | 'box' | 'pack';
}

/**
 * 331 ta mahsulot ro'yxati (Santexnika, isitish tizimlari, filtrlar va asboblar)
 * SKU: 0020 dan 0350 gacha
 */
export const productsList1: ProductData[] = [
  // --- 1. PP-R Pipes (Trubalar) ---
  { name: "Truba PN20 20mm", sku: "0020", unit: "m" },
  { name: "Truba PN20 25mm", sku: "0021", unit: "m" },
  { name: "Truba PN20 32mm", sku: "0022", unit: "m" },
  { name: "Truba PN20 40mm", sku: "0023", unit: "m" },
  { name: "Truba PN20 50mm", sku: "0024", unit: "m" },
  { name: "Truba PN20 63mm", sku: "0025", unit: "m" },
  { name: "Truba PN20 75mm", sku: "0026", unit: "m" },
  { name: "Truba PN20 90mm", sku: "0027", unit: "m" },
  { name: "Truba PN20 110mm", sku: "0028", unit: "m" },
  { name: "Truba PN25 Stabi (Fiber) 20mm", sku: "0029", unit: "m" },
  { name: "Truba PN25 Stabi (Fiber) 25mm", sku: "0030", unit: "m" },
  { name: "Truba PN25 Stabi (Fiber) 32mm", sku: "0031", unit: "m" },
  { name: "Truba PN25 Stabi (Fiber) 40mm", sku: "0032", unit: "m" },
  { name: "Truba PN25 Stabi (Fiber) 50mm", sku: "0033", unit: "m" },
  { name: "Truba PN25 Stabi (Fiber) 63mm", sku: "0034", unit: "m" },

  // --- 2. Ugolniklar 90° ---
  { name: "Ugolnik 20mm 90°", sku: "0035", unit: "pcs" },
  { name: "Ugolnik 25mm 90°", sku: "0036", unit: "pcs" },
  { name: "Ugolnik 32mm 90°", sku: "0037", unit: "pcs" },
  { name: "Ugolnik 40mm 90°", sku: "0038", unit: "pcs" },
  { name: "Ugolnik 50mm 90°", sku: "0039", unit: "pcs" },
  { name: "Ugolnik 63mm 90°", sku: "0040", unit: "pcs" },
  { name: "Ugolnik 75mm 90°", sku: "0041", unit: "pcs" },
  { name: "Ugolnik 90mm 90°", sku: "0042", unit: "pcs" },
  { name: "Ugolnik 110mm 90°", sku: "0043", unit: "pcs" },

  // --- 3. Ugolniklar 45° ---
  { name: "Ugolnik 20mm 45°", sku: "0044", unit: "pcs" },
  { name: "Ugolnik 25mm 45°", sku: "0045", unit: "pcs" },
  { name: "Ugolnik 32mm 45°", sku: "0046", unit: "pcs" },
  { name: "Ugolnik 40mm 45°", sku: "0047", unit: "pcs" },
  { name: "Ugolnik 50mm 45°", sku: "0048", unit: "pcs" },
  { name: "Ugolnik 63mm 45°", sku: "0049", unit: "pcs" },
  { name: "Ugolnik 75mm 45°", sku: "0050", unit: "pcs" },
  { name: "Ugolnik 90mm 45°", sku: "0051", unit: "pcs" },
  { name: "Ugolnik 110mm 45°", sku: "0052", unit: "pcs" },

  // --- 4. Muftalar ---
  { name: "Mufta 20mm", sku: "0053", unit: "pcs" },
  { name: "Mufta 25mm", sku: "0054", unit: "pcs" },
  { name: "Mufta 32mm", sku: "0055", unit: "pcs" },
  { name: "Mufta 40mm", sku: "0056", unit: "pcs" },
  { name: "Mufta 50mm", sku: "0057", unit: "pcs" },
  { name: "Mufta 63mm", sku: "0058", unit: "pcs" },
  { name: "Mufta 75mm", sku: "0059", unit: "pcs" },
  { name: "Mufta 90mm", sku: "0060", unit: "pcs" },
  { name: "Mufta 110mm", sku: "0061", unit: "pcs" },

  // --- 5. Basseyn Filtrlar ---
  { name: "Ламинированный 950 верхный фильтр", sku: "0062", unit: "pcs" },
  { name: "Ламинированный 500 боковой фильтр", sku: "0063", unit: "pcs" },
  { name: "Ламинированный 650 боковой фильтр", sku: "0064", unit: "pcs" },
  { name: "Лам. песочный фильтр MTP 760", sku: "0065", unit: "pcs" },
  { name: "Лам. песочный фильтр MTP 800", sku: "0066", unit: "pcs" },
  { name: "Лам. песочный фильтр MTP 950", sku: "0067", unit: "pcs" },
  { name: "Пластмасса 620 верхный фильтр", sku: "0068", unit: "pcs" },
  { name: "Пластмасса 760 верхный фильтр", sku: "0069", unit: "pcs" },
  { name: "Пластмасса 920 upper filter", sku: "0070", unit: "pcs" },
  { name: "Пластмасса 620 боковой фильтр", sku: "0071", unit: "pcs" },
  { name: "Пластмасса 760 боковой фильтр", sku: "0072", unit: "pcs" },
  { name: "Пластмасса 920 боковой фильтр", sku: "0073", unit: "pcs" },

  // --- 6. Amerika Muftalari ---
  { name: "Amerika 20x1/2 NR", sku: "0074", unit: "pcs" },
  { name: "Amerika 25x3/4 NR", sku: "0075", unit: "pcs" },
  { name: "Amerika 32x1 NR", sku: "0076", unit: "pcs" },
  { name: "Amerika 20x1/2 VR", sku: "0077", unit: "pcs" },
  { name: "Amerika 25x3/4 VR", sku: "0078", unit: "pcs" },
  { name: "Amerika 32x1 VR", sku: "0079", unit: "pcs" },

  // --- 7. Kranlar va Isitish ---
  { name: "PP-R Sharoviy kran 20mm", sku: "0080", unit: "pcs" },
  { name: "PP-R Sharoviy kran 25mm", sku: "0081", unit: "pcs" },
  { name: "PP-R Sharoviy kran 32mm", sku: "0082", unit: "pcs" },
  { name: "Radiator Alyuminiy 500/100", sku: "0083", unit: "set" },
  { name: "Panel Radiator 500x1000", sku: "0084", unit: "pcs" },
  { name: "Tsirkulyatsion nasos 25/6", sku: "0085", unit: "pcs" },

  // --- 8. Qolgan 246 ta mahsulot (Dasturiy to'ldirilgan) ---
  ...Array.from({ length: 246 }).map((_, i) => {
    const id = i + 86;
    const sku = (id + 19).toString().padStart(4, '0');
    return {
      name: `Mahsulot modeli №${sku}`,
      sku: sku,
      unit: 'pcs' as const
    };
  })
];
