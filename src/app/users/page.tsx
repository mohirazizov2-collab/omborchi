"use client";
 
import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Loader2, UserPlus, Pencil, Trash2, Search, ShieldCheck, X } from "lucide-react";
import { doc, setDoc, getDocs, collection, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
 
// ─── Types ────────────────────────────────────────────────────────────────────
type Role = "SuperAdmin" | "Admin" | "Kassir" | "Seller";
 
interface UserRecord {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  position: string;
  role: Role;
  permissions: Record<string, any>;
  createdAt: any;
}
 
// ─── Role config ──────────────────────────────────────────────────────────────
const ROLES: { value: Role; label: string; color: string; bg: string; border: string }[] = [
  { value: "SuperAdmin", label: "Super Admin", color: "#7c3aed", bg: "#ede9fe", border: "#c4b5fd" },
  { value: "Admin",      label: "Admin",       color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  { value: "Kassir",     label: "Kassir",      color: "#0e7490", bg: "#cffafe", border: "#67e8f9" },
  { value: "Seller",     label: "Seller",      color: "#15803d", bg: "#dcfce7", border: "#86efac" },
];
 
const POSITIONS = ["Menejer", "Kassir", "Sotuvchi", "Omborchi", "Hisobchi"];
 
function buildPermissions(role: Role) {
  switch (role) {
    case "SuperAdmin":
      return {
        tizim:       { foydalanuvchilar: true,  sozlamalar: true },
        inventar:    { mahsulotlar: true },
        moliya:      { xarajatlar: true,  hisobot: true },
        nakladnolar: { kirim: true,  chiqim: true },
        analitika:   { dashboard: true },
        kassa:       { operatsiya: true },
      };
    case "Admin":
      return {
        tizim:       { foydalanuvchilar: true,  sozlamalar: false },
        inventar:    { mahsulotlar: true },
        moliya:      { xarajatlar: true,  hisobot: true },
        nakladnolar: { kirim: true,  chiqim: true },
        analitika:   { dashboard: true },
        kassa:       { operatsiya: false },
      };
    case "Kassir":
      return {
        tizim:       { foydalanuvchilar: false, sozlamalar: false },
        inventar:    { mahsulotlar: true },
        moliya:      { xarajatlar: false, hisobot: false },
        nakladnolar: { kirim: false, chiqim: false },
        analitika:   { dashboard: true },
        kassa:       { operatsiya: true },
      };
    case "Seller":
    default:
      return {
        tizim:       { foydalanuvchilar: false, sozlamalar: false },
        inventar:    { mahsulotlar: true },
        moliya:      { xarajatlar: false, hisobot: false },
        nakladnolar: { kirim: false, chiqim: false },
        analitika:   { dashboard: true },
        kassa:       { operatsiya: false },
      };
  }
}
 
function getRoleConfig(role: Role) {
  return ROLES.find(r => r.value === role) ?? ROLES[3];
}
 
function countPermissions(perms: Record<string, any>) {
  let yes = 0, total = 0;
  for (const section of Object.values(perms)) {
    for (const v of Object.values(section as Record<string, boolean>)) {
      total++;
      if (v) yes++;
    }
  }
  return { yes, total };
}
 
// ─── Shared styles ────────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 11px", borderRadius: 7, border: "1.5px solid #e5e7eb",
  background: "#f9fafb", fontSize: 13, color: "#111827", outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
 
// ─── RoleBadge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: Role }) {
  const cfg = getRoleConfig(role);
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 4,
      fontSize: 10, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em",
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
}
 
// ─── Add User Modal ───────────────────────────────────────────────────────────
function UserModal({ onClose, onSaved, db }: { onClose: () => void; onSaved: () => void; db: any }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ lastName: "", firstName: "", email: "", password: "", position: "Sotuvchi", role: "Seller" as Role });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
 
  const handleSave = async () => {
    if (!db) return;
    if (!form.email.includes("@") || !form.email.includes(".")) {
      toast({ variant: "destructive", title: "Xato", description: "Email formatini to'g'ri kiriting" });
      return;
    }
    if (form.password.length < 6) {
      toast({ variant: "destructive", title: "Xato", description: "Parol kamida 6 ta belgi bo'lsin!" });
      return;
    }
    const adminPassword = prompt("Admin parolini kiriting (Sessiyani saqlash uchun):");
    if (!adminPassword) return;
 
    setSaving(true);
    const auth = getAuth();
    const adminEmail = auth.currentUser?.email;
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "users", uid), {
        lastName: form.lastName, firstName: form.firstName, email: form.email,
        position: form.position, role: form.role,
        fullName: `${form.lastName} ${form.firstName}`.trim(),
        permissions: buildPermissions(form.role),
        createdAt: serverTimestamp(),
      });
      if (adminEmail) await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      toast({ title: "Muvaffaqiyatli!", description: `${form.firstName} tizimga qo'shildi.` });
      onSaved(); onClose();
    } catch (e: any) {
      let msg = e.message;
      if (e.code === "auth/email-already-in-use") msg = "Bu email allaqachon band!";
      if (e.code === "auth/invalid-email") msg = "Email formati noto'g'ri!";
      toast({ variant: "destructive", title: "Xato", description: msg });
    } finally { setSaving(false); }
  };
 
  const selRole = getRoleConfig(form.role);
  const permsInfo = countPermissions(buildPermissions(form.role));
 
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden", animation: "modalUp 0.22s cubic-bezier(.34,1.56,.64,1)" }}>
 
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#f97316,#ef4444)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserPlus size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>Yangi foydalanuvchi</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>4 ta rol: SuperAdmin, Admin, Kassir, Seller</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "6px 8px", cursor: "pointer", color: "#6b7280" }}><X size={14} /></button>
        </div>
 
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ label: "Familiya", field: "lastName", ph: "Karimov" }, { label: "Ism", field: "firstName", ph: "Ali" }].map(({ label, field, ph }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input style={inputStyle} placeholder={ph} value={(form as any)[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })} />
              </div>
            ))}
          </div>
 
          {/* Email & Password */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Email (Login)</label>
              <input style={inputStyle} type="email" placeholder="ali@company.uz" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Parol</label>
              <div style={{ position: "relative" }}>
                <input style={{ ...inputStyle, paddingRight: 36 }} type={showPw ? "text" : "password"}
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} />
                <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          </div>
 
          {/* Position */}
          <div>
            <label style={labelStyle}>Lavozim</label>
            <div style={{ position: "relative" }}>
              <select style={{ ...inputStyle, paddingRight: 28, cursor: "pointer", appearance: "none" as any }}
                value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#9ca3af", pointerEvents: "none" }}>▾</span>
            </div>
          </div>
 
          {/* Role cards */}
          <div>
            <label style={labelStyle}>Tizimdagi roli</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginTop: 6 }}>
              {ROLES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                  style={{
                    padding: "10px 14px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                    border: `2px solid ${form.role === r.value ? r.color : "#e5e7eb"}`,
                    background: form.role === r.value ? r.bg : "#f9fafb", transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: form.role === r.value ? r.color : "#374151" }}>{r.label}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, padding: "7px 12px", borderRadius: 6, background: selRole.bg, border: `1px solid ${selRole.border}`, fontSize: 11, color: selRole.color, fontWeight: 600 }}>
              ✓ <strong>{selRole.label}</strong> — {permsInfo.yes}/{permsInfo.total} ruxsat berilgan
            </div>
          </div>
        </div>
 
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 8, background: "#f9fafb" }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid #d1d5db", background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
            Bekor qilish
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 22px", borderRadius: 7, border: "none", fontSize: 12, fontWeight: 700,
            background: saving ? "#c4b5fd" : "linear-gradient(135deg,#f97316,#ef4444)",
            color: "#fff", cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px rgba(239,68,68,0.28)",
          }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}
 
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersManagementPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [filterStatus, setFilterStatus] = useState("Barchasi");
  const [mounted, setMounted] = useState(false);
 
  useEffect(() => { setMounted(true); }, []);
 
  const fetchUsers = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserRecord)));
    } catch {
      toast({ variant: "destructive", title: "Xato", description: "Foydalanuvchilarni yuklashda xato" });
    } finally { setLoading(false); }
  }, [db]);
 
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
 
  const handleDelete = async (u: UserRecord) => {
    if (!db || !confirm(`${u.fullName || u.email} ni o'chirasizmi?`)) return;
    try {
      await deleteDoc(doc(db, "users", u.id));
      toast({ title: "O'chirildi", description: `${u.fullName} o'chirildi` });
      fetchUsers();
    } catch {
      toast({ variant: "destructive", title: "Xato", description: "O'chirishda xato" });
    }
  };
 
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const ms = !q || (u.fullName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    const mr = filterRole === "all" || u.role === filterRole;
    return ms && mr;
  });
 
  if (!mounted) return null;
 
  return (
    <>
      <style>{`
        @keyframes modalUp { from{opacity:0;transform:translateY(16px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        .um-row:hover { background:#f8faff !important; }
        .um-icon-btn { transition: opacity 0.12s, transform 0.12s !important; }
        .um-icon-btn:hover { opacity:0.7 !important; transform:scale(1.1) !important; }
        .um-add:hover { opacity:0.9; transform:translateY(-1px); box-shadow:0 6px 20px rgba(239,68,68,0.38) !important; }
        select { appearance:none; }
      `}</style>
 
      <div style={{ minHeight: "100vh", background: "#f1f3f7", padding: "24px 28px", fontFamily: "'Outfit','Segoe UI',sans-serif" }}>
 
        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={19} color="#7c3aed" />
            </div>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: "-0.3px" }}>
                Xodimlar va foydalanuvchilar
              </h1>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Tizim kirish huquqlarini boshqaring</p>
            </div>
          </div>
          <button className="um-add" onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
              background: "linear-gradient(135deg,#f97316,#ef4444)", color: "#fff",
              border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 3px 12px rgba(239,68,68,0.3)", transition: "all 0.15s",
            }}>
            <UserPlus size={15} />
            Foydalanuvchi qo'shish
          </button>
        </div>
 
        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Jami xodim",  value: users.length,                                    icon: "👥", color: "#6366f1" },
            { label: "Faol",        value: users.length,                                    icon: "✅", color: "#10b981" },
            { label: "Logini bor",  value: users.filter(u => u.email).length,               icon: "🔑", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: "monospace", lineHeight: 1.1 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>
 
        {/* ── Filters ── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
            <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 30, background: "#f9fafb" }} />
          </div>
          {/* Role */}
          <div style={{ position: "relative" }}>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)}
              style={{ ...inputStyle, width: 155, paddingRight: 26, background: "#f9fafb", cursor: "pointer" }}>
              <option value="all">Barcha rollar</option>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#9ca3af", pointerEvents: "none" }}>▾</span>
          </div>
          {/* Status */}
          <div style={{ position: "relative" }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ ...inputStyle, width: 130, paddingRight: 26, background: "#f9fafb", cursor: "pointer" }}>
              {["Barchasi", "Faol", "Nofaol"].map(s => <option key={s}>{s}</option>)}
            </select>
            <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 9, color: "#9ca3af", pointerEvents: "none" }}>▾</span>
          </div>
        </div>
 
        {/* ── Table ── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
 
          {/* Table Head */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1.1fr 1.6fr 0.85fr 0.85fr 0.7fr",
            padding: "9px 16px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
            fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            <span>XODIM</span><span>LAVOZIM</span><span>ROL</span>
            <span>EMAIL</span><span>HOLAT</span><span>RUXSATLAR</span><span>AMALLAR</span>
          </div>
 
          {/* Rows */}
          {loading ? (
            <div style={{ padding: "50px", textAlign: "center", color: "#9ca3af" }}>
              <Loader2 size={22} style={{ margin: "0 auto 10px", display: "block", animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: 13 }}>Yuklanmoqda...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>👤</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Foydalanuvchilar topilmadi</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {search ? `"${search}" bo'yicha natija yo'q` : "Birinchi foydalanuvchini qo'shing"}
              </div>
            </div>
          ) : filtered.map((u, i) => {
            const cfg = getRoleConfig(u.role);
            const perms = countPermissions(u.permissions || buildPermissions(u.role));
            const initials = (u.fullName || u.email || "?")[0].toUpperCase();
            return (
              <div key={u.id} className="um-row" style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.1fr 1.6fr 0.85fr 0.85fr 0.7fr",
                padding: "12px 16px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid #f3f4f6" : "none",
                transition: "background 0.1s",
              }}>
                {/* Name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: cfg.color,
                  }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{u.fullName || "—"}</div>
                    <div style={{ fontSize: 10, color: "#c4b5fd", marginTop: 1, fontFamily: "monospace" }}>#{u.id.slice(-6)}</div>
                  </div>
                </div>
 
                {/* Position */}
                <div style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}>{u.position || "—"}</div>
 
                {/* Role */}
                <RoleBadge role={u.role} />
 
                {/* Email */}
                <div style={{ fontSize: 11, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || "—"}</div>
 
                {/* Status */}
                <div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "3px 9px", borderRadius: 18, fontSize: 10, fontWeight: 700,
                    background: "#f0fdf4", color: "#15803d", border: "1px solid #86efac",
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    Faol
                  </span>
                </div>
 
                {/* Perms */}
                <div>
                  <span style={{
                    display: "inline-block", padding: "3px 9px", borderRadius: 5,
                    background: "#ede9fe", color: "#6d28d9", fontSize: 10, fontWeight: 700,
                    cursor: "default", fontFamily: "monospace",
                  }}>
                    {perms.yes}/{perms.total} modul
                  </span>
                </div>
 
                {/* Actions */}
                <div style={{ display: "flex", gap: 5 }}>
                  <button className="um-icon-btn" style={{ width: 28, height: 28, borderRadius: 6, background: "#eff6ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Pencil size={12} color="#3b82f6" />
                  </button>
                  <button className="um-icon-btn" onClick={() => handleDelete(u)}
                    style={{ width: 28, height: 28, borderRadius: 6, background: "#fef2f2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Trash2 size={12} color="#ef4444" />
                  </button>
                </div>
              </div>
            );
          })}
 
          {/* Footer */}
          {!loading && (
            <div style={{ padding: "9px 16px", borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#9ca3af" }}>
              Jami: {filtered.length} ta foydalanuvchi ko'rsatilmoqda
            </div>
          )}
        </div>
      </div>
 
      {showModal && <UserModal db={db} onClose={() => setShowModal(false)} onSaved={fetchUsers} />}
    </>
  );
}
 
