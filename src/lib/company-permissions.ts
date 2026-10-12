export const COMPANY_MODULES = [
  { key: "dashboard", label: "Bosh sahifa", group: "Umumiy" },
  { key: "sales", label: "Sotuvlar", group: "Savdo" },
  { key: "cash", label: "Kassa", group: "Savdo" },
  { key: "stockIn", label: "Kirim", group: "Ombor" },
  { key: "stockOut", label: "Chiqim", group: "Ombor" },
  { key: "products", label: "Tovarlar", group: "Ombor" },
  { key: "warehouses", label: "Omborlar", group: "Ombor" },
  { key: "inventoryAudit", label: "Inventarizatsiya", group: "Ombor" },
  { key: "transfers", label: "O‘tkazmalar", group: "Ombor" },
  { key: "recipes", label: "Retseptlar", group: "Ishlab chiqarish" },
  { key: "production", label: "Ishlab chiqarish", group: "Ishlab chiqarish" },
  { key: "expenses", label: "Xarajatlar", group: "Moliya" },
  { key: "employees", label: "Xodimlar", group: "Moliya" },
  { key: "reports", label: "Hisobotlar", group: "Moliya" },
  { key: "history", label: "Tarix", group: "Boshqaruv" },
  { key: "users", label: "Foydalanuvchilar", group: "Boshqaruv" },
  { key: "settings", label: "Sozlamalar", group: "Boshqaruv" },
  { key: "profile", label: "Profil", group: "Boshqaruv" },
] as const;

export type CompanyModule = (typeof COMPANY_MODULES)[number]["key"];
export type CompanyPermissions = Partial<Record<CompanyModule, boolean>>;

export const COMPANY_ROLE_OPTIONS = [
  "Admin",
  "Menejer",
  "Sotuvchi",
  "Ombor boshlig'i",
  "Omborchi",
  "Hisobchi",
  "Ishchi",
  "Kassir",
] as const;

const ROLE_MODULES: Record<string, CompanyModule[]> = {
  Admin: COMPANY_MODULES.map(({ key }) => key),
  Menejer: [
    "dashboard", "sales", "cash", "stockIn", "stockOut", "products",
    "warehouses", "inventoryAudit", "transfers", "recipes", "production",
    "expenses", "employees", "reports", "history", "users", "settings", "profile",
  ],
  Sotuvchi: ["dashboard", "sales", "stockOut", "products", "reports", "history", "profile"],
  "Ombor boshlig'i": [
    "dashboard", "stockIn", "stockOut", "products", "warehouses",
    "inventoryAudit", "transfers", "production", "history", "profile",
  ],
  Omborchi: ["dashboard", "stockIn", "stockOut", "products", "warehouses", "history", "profile"],
  Hisobchi: ["dashboard", "sales", "cash", "expenses", "employees", "reports", "history", "profile"],
  Ishchi: ["dashboard", "profile"],
  Kassir: ["dashboard", "sales", "cash", "products", "profile"],
};

export function defaultCompanyPermissions(role: string): CompanyPermissions {
  const enabled = new Set(ROLE_MODULES[role] ?? ROLE_MODULES.Ishchi);
  return Object.fromEntries(
    COMPANY_MODULES.map(({ key }) => [key, enabled.has(key)])
  ) as CompanyPermissions;
}

export function normalizeCompanyPermissions(value: unknown): CompanyPermissions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!COMPANY_MODULES.some(({ key }) => typeof record[key] === "boolean")) return null;
  return Object.fromEntries(
    COMPANY_MODULES.map(({ key }) => [key, record[key] === true])
  ) as CompanyPermissions;
}

export function companyModuleForPath(pathname: string): CompanyModule | null {
  const exact: Record<string, CompanyModule> = {
    "/": "dashboard",
    "/sales": "sales",
    "/pos": "cash",
    "/cash": "cash",
    "/stock-in": "stockIn",
    "/stock-out": "stockOut",
    "/products": "products",
    "/categories": "products",
    "/warehouses": "warehouses",
    "/inventory": "inventoryAudit",
    "/inventory-audit": "inventoryAudit",
    "/transfers": "transfers",
    "/recipes": "recipes",
    "/production": "production",
    "/expenses": "expenses",
    "/employees": "employees",
    "/staff": "employees",
    "/reports": "reports",
    "/history": "history",
    "/users": "users",
    "/settings": "settings",
    "/system-gen": "settings",
    "/admin": "users",
    "/profile": "profile",
    "/nakladnoy": "stockOut",
  };
  return exact[pathname]
    ?? Object.entries(exact)
      .filter(([path]) => path !== "/" && pathname.startsWith(`${path}/`))
      .sort(([left], [right]) => right.length - left.length)
      .map(([, module]) => module)[0]
    ?? null;
}

export function companyPathForModule(module: CompanyModule): string {
  const paths: Record<CompanyModule, string> = {
    dashboard: "/",
    sales: "/sales",
    cash: "/cash",
    stockIn: "/stock-in",
    stockOut: "/stock-out",
    products: "/products",
    warehouses: "/warehouses",
    inventoryAudit: "/inventory-audit",
    transfers: "/transfers",
    recipes: "/recipes",
    production: "/production",
    expenses: "/expenses",
    employees: "/employees",
    reports: "/reports",
    history: "/history",
    users: "/users",
    settings: "/settings",
    profile: "/profile",
  };
  return paths[module];
}

export function isCompanyModuleEnabled(
  permissions: CompanyPermissions | null | undefined,
  module: CompanyModule
) {
  return permissions?.[module] === true;
}
