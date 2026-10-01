import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { MantenimientoForm } from "@/components/mantenimiento-form";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/friendly-errors";

export const Route = createFileRoute("/mantenimiento/editar/$id")({
  head: () => ({ meta: [
    { title: "Editar mantenimiento · DC Inspect" },
    { name: "description", content: "Edición y finalización de un mantenimiento preventivo." },
    { property: "og:title", content: "Editar mantenimiento · DC Inspect" },
    { property: "og:description", content: "Edición y finalización de un mantenimiento preventivo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EditarMantPage,
});

function EditarMantPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [row, setRow] = useState<any>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("mantenimientos").select("*").eq("id", id).single();
      if (error) toast.error(friendlyDbError(error));
      setRow(data);
      setBusy(false);
    })();
  }, [id]);

  return (
    <AppShell title="Editar mantenimiento">
      {busy ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : !row ? (
        <p className="text-sm text-muted-foreground">No encontrado.</p>
      ) : (
        <MantenimientoForm tipo={row.tipo} existing={row} />
      )}
    </AppShell>
  );
}
