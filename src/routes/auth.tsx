import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Server, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acceso · DC Inspect" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/" });
  }, [user, loading, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de autenticación";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-16 rounded-2xl bg-primary/15 border border-primary/40 grid place-items-center mb-4 shadow-[0_0_40px_oklch(0.78_0.17_175_/_0.25)]">
            <Server className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">DC <span className="text-gradient">Inspect</span></h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-[0.18em]">Cochabamba · Uptime M&O</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="mb-4 text-center">
            <h2 className="text-base font-semibold">Iniciar sesión</h2>
            <p className="text-[11px] text-muted-foreground mt-1">
              Acceso restringido al personal autorizado. Solicita una cuenta al administrador.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="input" placeholder="tecnico@dc.bo" />
            </Field>
            <Field label="Contraseña">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="input" placeholder="••••••••" />
            </Field>

            <button type="submit" disabled={busy}
              className="w-full mt-2 h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-[0_0_30px_oklch(0.78_0.17_175_/_0.35)] disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </button>
          </form>
        </div>

        <p className="text-[11px] text-center text-muted-foreground mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3" />
          Datos cifrados — Auditoría Tier Standard
        </p>
      </div>

      <style>{`
        .input { width:100%; height:42px; padding:0 12px; border-radius:10px;
          background: var(--surface-1); border:1px solid var(--border);
          color: var(--foreground); font-size:14px; outline:none;
          transition: border-color .15s, box-shadow .15s; }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px oklch(0.78 0.17 175 / 0.18); }
      `}</style>
    </div>
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
