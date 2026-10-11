/* =========================================================
   AUTH (DEMO)
   Backend ulanganda faqat loginCompany va loginAdmin
   ichidagi "DEMO" qismini fetch(...) bilan almashtiring.
========================================================= */

export type Session =
  | { role: "admin"; login: string }
  | {
      role: "company";
      companyId: string;
      companyName: string;
      login: string;
    };

const SESSION_KEY = "omborchi_session";

/* ---------- DEMO MA'LUMOTLAR ---------- */

const demoCompanies = [
  {
    id: "1001",
    name: "Farrux Mebel",
    status: "active",
    users: [{ login: "farrux", password: "123456" }],
  },
  {
    id: "1002",
    name: "Ideal Mebel",
    status: "active",
    users: [{ login: "azizbek", password: "123456" }],
  },
  {
    id: "1004",
    name: "Mega Decor",
    status: "suspended",
    users: [{ login: "bekzod", password: "123456" }],
  },
];

const demoAdmin = { login: "admin", password: "admin123" };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- LOGIN: KORXONA XODIMI ---------- */

export async function loginCompany(
  companyId: string,
  login: string,
  password: string
): Promise<Session> {
  // DEMO
  await wait(600);

  const company = demoCompanies.find((c) => c.id === companyId.trim());
  if (!company) throw new Error("Bunday korxona ID topilmadi");

  if (company.status === "suspended")
    throw new Error("Korxona to'xtatilgan. Administrator bilan bog'laning");

  const user = company.users.find(
    (u) => u.login === login.trim() && u.password === password
  );
  if (!user) throw new Error("Login yoki parol noto'g'ri");

  const session: Session = {
    role: "company",
    companyId: company.id,
    companyName: company.name,
    login: user.login,
  };
  saveSession(session);
  return session;
}

/* ---------- LOGIN: ADMIN PANEL ---------- */

export async function loginAdmin(
  login: string,
  password: string
): Promise<Session> {
  // DEMO
  await wait(600);

  if (login.trim() !== demoAdmin.login || password !== demoAdmin.password)
    throw new Error("Login yoki parol noto'g'ri");

  const session: Session = { role: "admin", login: demoAdmin.login };
  saveSession(session);
  return session;
}

/* ---------- SESSIYA ---------- */

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}
