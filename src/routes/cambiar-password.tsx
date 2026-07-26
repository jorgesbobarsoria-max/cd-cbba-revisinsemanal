import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { markPasswordChanged } from "@/lib/admin.functions";
import { AppShell } from "@/components/app-shell";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cambiar-password")({
  head: () => ({ meta: [{ title: "Cambiar contraseña · DC Inspect" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const nav = useNavigate();
  const { user, loading } = useProfile();
  const markFn = useServerFn(markPasswordChanged);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [user, loading, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Mínimo 6 caracteres.");
    if (pw !== pw2) return toast.error("Las contraseñas no coinciden.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      await markFn();
      toast.success("Contraseña actualizada");
      nav({ to: "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return null;

  return (
    <AppShell title="Cambiar contraseña">
      <div className="max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-14 rounded-2xl bg-primary/15 border border-primary/40 grid place-items-center mb-3">
            <KeyRound className="size-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Define tu contraseña</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Es tu primer inicio de sesión: cambia la contraseña genérica por una propia.
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass rounded-2xl p-5 space-y-3">
          <Field label="Nueva contraseña">
            <input
              type="password"
              required
              minLength={6}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar contraseña">
            <input
              type="password"
              required
              minLength={6}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_oklch(0.78_0.17_175_/_0.35)] disabled:opacity-60"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Guardar contraseña
          </button>
          <p className="text-[11px] text-center text-muted-foreground pt-1 flex items-center justify-center gap-1.5">
            <ShieldCheck className="size-3" /> Datos cifrados
          </p>
        </form>
      </div>

      <style>{`
        .input { width:100%; height:42px; padding:0 12px; border-radius:10px;
          background: var(--surface-1); border:1px solid var(--border);
          color: var(--foreground); font-size:14px; outline:none; }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px oklch(0.78 0.17 175 / 0.18); }
      `}</style>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
