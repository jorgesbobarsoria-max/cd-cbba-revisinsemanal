import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/hooks/use-profile";
import {
  listUsers,
  createUser,
  updateUserRole,
  setUserActive,
  deleteUser,
  resetUserPassword,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { UserPlus, Shield, Loader2, Trash2, KeyRound, Ban, Check, Users, Eye, EyeOff, Wand2 } from "lucide-react";
import { friendlyDbError } from "@/lib/friendly-errors";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Administración · DC Inspect" }] }),
  component: AdminPage,
});

type Role = "admin" | "tecnico" | "viewer";

/** Genera una contraseña temporal robusta de 16 caracteres. */
function generarPassword(): string {
  const abc = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  viewer: "Viewer",
};

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-primary/20 text-primary border-primary/40",
  tecnico: "bg-warn/20 text-warn border-warn/40",
  viewer: "bg-muted text-muted-foreground border-border",
};

function AdminPage() {
  const nav = useNavigate();
  const { user, isAdmin, loading } = useProfile();
  const qc = useQueryClient();

  const listFn = useServerFn(listUsers);
  const createFn = useServerFn(createUser);
  const updateRoleFn = useServerFn(updateUserRole);
  const setActiveFn = useServerFn(setUserActive);
  const deleteFn = useServerFn(deleteUser);
  const resetPwFn = useServerFn(resetUserPassword);

  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: "/auth" });
    else if (!isAdmin) nav({ to: "/" });
  }, [user, isAdmin, loading, nav]);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
    enabled: !!user && isAdmin,
  });

  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "viewer" as Role,
  });
  const [busy, setBusy] = useState(false);
  const [verPw, setVerPw] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ id: string; email: string } | null>(null);
  const [textoConfirm, setTextoConfirm] = useState("");
  const [resetTarget, setResetTarget] = useState<{ id: string; email: string } | null>(null);
  const [nuevaPw, setNuevaPw] = useState("");
  const [verNuevaPw, setVerNuevaPw] = useState(false);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createFn({
        data: {
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim() || undefined,
          role: form.role,
        },
      });
      toast.success("Usuario creado. Deberá cambiar su contraseña al primer inicio.");
      setOpenNew(false);
      setForm({ email: "", password: "", full_name: "", role: "viewer" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (userId: string, role: Role) => {
    try {
      await updateRoleFn({ data: { user_id: userId, role } });
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(friendlyDbError(err));
    }
  };

  const toggleActive = async (userId: string, is_active: boolean) => {
    try {
      await setActiveFn({ data: { user_id: userId, is_active } });
      toast.success(is_active ? "Usuario activado" : "Usuario desactivado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(friendlyDbError(err));
    }
  };

  const removeUser = async () => {
    if (!confirmDel) return;
    setBusy(true);
    try {
      await deleteFn({ data: { user_id: confirmDel.id } });
      toast.success("Usuario eliminado");
      setConfirmDel(null);
      setTextoConfirm("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      setBusy(false);
    }
  };

  const resetPw = async () => {
    if (!resetTarget) return;
    if (nuevaPw.length < 12) {
      toast.error("La contraseña temporal debe tener al menos 12 caracteres");
      return;
    }
    setBusy(true);
    try {
      await resetPwFn({ data: { user_id: resetTarget.id, new_password: nuevaPw } });
      toast.success("Contraseña restablecida. El usuario deberá cambiarla al ingresar.");
      setResetTarget(null);
      setNuevaPw("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      setBusy(false);
    }
  };


  if (loading || !user || !isAdmin) return null;

  return (
    <AppShell title="Administración">
      <section className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Panel Admin</p>
          <h2 className="text-xl font-bold mt-0.5 flex items-center gap-2">
            <Users className="size-5 text-primary" /> Usuarios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Alta, roles y estado de los usuarios de la app.
          </p>
        </div>
        <button
          onClick={() => setOpenNew(true)}
          className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-2 shadow-[0_0_24px_oklch(0.78_0.17_175_/_0.35)]"
        >
          <UserPlus className="size-4" /> Nuevo
        </button>
      </section>

      {isLoading ? (
        <div className="glass rounded-2xl p-8 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      ) : (
        <ul className="space-y-2">
          {(users ?? []).map((u) => {
            const primaryRole = (u.roles[0] ?? "viewer") as Role;
            const isSelf = u.id === user.id;
            return (
              <li key={u.id} className="glass rounded-2xl p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {u.full_name || u.email.split("@")[0]}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] text-primary font-mono">(tú)</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-semibold ${ROLE_BADGE[primaryRole]}`}
                  >
                    <Shield className="inline size-3 mr-0.5 -mt-0.5" />
                    {ROLE_LABELS[primaryRole]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground mb-2">
                  <div>
                    <span className="uppercase tracking-wider">Último acceso</span>
                    <p className="text-foreground font-mono text-[11px] mt-0.5">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("es-BO", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="uppercase tracking-wider">Estado</span>
                    <p
                      className={`font-mono text-[11px] mt-0.5 ${
                        u.is_active ? "text-ok" : "text-fail"
                      }`}
                    >
                      {u.is_active ? "Activo" : "Desactivado"}
                      {u.must_change_password && " · pend. cambio pwd"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
                  <select
                    value={primaryRole}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                    className="min-h-11 text-[11px] rounded-lg bg-secondary border border-border px-2"
                  >
                    <option value="admin">Administrador</option>
                    <option value="tecnico">Técnico</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => { setResetTarget({ id: u.id, email: u.email }); setNuevaPw(""); setVerNuevaPw(false); }}
                    className="min-h-11 px-3 rounded-lg bg-secondary hover:bg-muted text-[11px] flex items-center gap-1"
                    title="Restablecer contraseña"
                  >
                    <KeyRound className="size-3" /> Reset
                  </button>
                  {!isSelf && (
                    <button
                      onClick={() => toggleActive(u.id, !u.is_active)}
                      className={`min-h-11 px-3 rounded-lg text-[11px] flex items-center gap-1 ${
                        u.is_active
                          ? "bg-secondary hover:bg-muted"
                          : "bg-ok/20 text-ok hover:bg-ok/30"
                      }`}
                    >
                      {u.is_active ? (
                        <>
                          <Ban className="size-3" /> Desactivar
                        </>
                      ) : (
                        <>
                          <Check className="size-3" /> Activar
                        </>
                      )}
                    </button>
                  )}
                  {!isSelf && (
                    <button
                      onClick={() => { setConfirmDel({ id: u.id, email: u.email }); setTextoConfirm(""); }}
                      className="min-h-11 px-3 rounded-lg bg-fail/15 text-fail hover:bg-fail/25 text-[11px] flex items-center gap-1"
                    >
                      <Trash2 className="size-3" /> Eliminar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {openNew && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !busy && setOpenNew(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitNew}
            className="glass rounded-2xl p-5 w-full max-w-sm space-y-3"
          >
            <h3 className="font-semibold text-base flex items-center gap-2">
              <UserPlus className="size-4 text-primary" /> Nuevo usuario
            </h3>
            <Field label="Nombre completo">
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tecnico@dc.bo"
              />
            </Field>
            <Field label="Contraseña temporal (el usuario la cambiará al ingresar)">
              <div className="flex gap-1.5">
                <input
                  type={verPw ? "text" : "password"}
                  required
                  minLength={12}
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 12 caracteres"
                />
                <button type="button" onClick={() => setVerPw((v) => !v)}
                  aria-label={verPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="shrink-0 min-h-11 px-3 rounded-lg bg-secondary">
                  {verPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
                <button type="button" onClick={() => setForm({ ...form, password: generarPassword() })}
                  aria-label="Generar contraseña"
                  className="shrink-0 min-h-11 px-3 rounded-lg bg-secondary">
                  <Wand2 className="size-4" />
                </button>
              </div>
            </Field>

            <Field label="Rol">
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                <option value="admin">Administrador</option>
                <option value="tecnico">Técnico</option>
                <option value="viewer">Viewer</option>
              </select>
            </Field>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpenNew(false)}
                disabled={busy}
                className="flex-1 h-10 rounded-xl bg-secondary text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="size-4 animate-spin" />} Crear
              </button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div role="dialog" aria-modal="true" aria-label="Restablecer contraseña"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !busy && setResetTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <KeyRound className="size-4 text-primary" /> Restablecer contraseña
            </h3>
            <p className="text-xs text-muted-foreground">Se asignará una contraseña temporal a {resetTarget.email}. Deberá cambiarla en su próximo ingreso.</p>
            <div className="flex gap-1.5">
              <input
                type={verNuevaPw ? "text" : "password"}
                className="input"
                minLength={12}
                value={nuevaPw}
                onChange={(e) => setNuevaPw(e.target.value)}
                placeholder="Mínimo 12 caracteres"
              />
              <button type="button" onClick={() => setVerNuevaPw((v) => !v)}
                aria-label={verNuevaPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="shrink-0 min-h-11 px-3 rounded-lg bg-secondary">
                {verNuevaPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button type="button" onClick={() => setNuevaPw(generarPassword())}
                aria-label="Generar contraseña" className="shrink-0 min-h-11 px-3 rounded-lg bg-secondary">
                <Wand2 className="size-4" />
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setResetTarget(null)} className="flex-1 h-11 rounded-xl bg-secondary text-sm">Cancelar</button>
              <button type="button" disabled={busy || nuevaPw.length < 12} onClick={resetPw}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy && <Loader2 className="size-4 animate-spin" />} Restablecer
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div role="dialog" aria-modal="true" aria-label="Eliminar usuario"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !busy && setConfirmDel(null)}>
          <div onClick={(e) => e.stopPropagation()} className="glass rounded-2xl p-5 w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2 text-fail">
              <Trash2 className="size-4" /> Eliminar usuario
            </h3>
            <p className="text-xs text-muted-foreground">
              Esta acción es permanente. Para confirmar, escriba el correo <span className="font-mono text-foreground">{confirmDel.email}</span>.
            </p>
            <input className="input" value={textoConfirm} onChange={(e) => setTextoConfirm(e.target.value)} placeholder="Correo del usuario" />
            <div className="flex gap-2 pt-1">
              <button type="button" disabled={busy} onClick={() => setConfirmDel(null)} className="flex-1 h-11 rounded-xl bg-secondary text-sm">Cancelar</button>
              <button type="button" disabled={busy || textoConfirm.trim().toLowerCase() !== confirmDel.email.toLowerCase()}
                onClick={removeUser}
                className="flex-1 h-11 rounded-xl bg-fail text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy && <Loader2 className="size-4 animate-spin" />} Eliminar
              </button>
            </div>
          </div>
        </div>
      )}



      <style>{`
        .input { width:100%; height:40px; padding:0 12px; border-radius:10px;
          background: var(--surface-1); border:1px solid var(--border);
          color: var(--foreground); font-size:13px; outline:none; }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px oklch(0.78 0.17 175 / 0.18); }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
