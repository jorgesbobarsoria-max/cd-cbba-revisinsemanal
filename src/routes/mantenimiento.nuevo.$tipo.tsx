import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MantenimientoForm } from "@/components/mantenimiento-form";

export const Route = createFileRoute("/mantenimiento/nuevo/$tipo")({
  head: () => ({ meta: [
    { title: "Nuevo mantenimiento · DC Inspect" },
    { name: "description", content: "Formulario técnico para registrar un mantenimiento preventivo." },
    { property: "og:title", content: "Nuevo mantenimiento · DC Inspect" },
    { property: "og:description", content: "Formulario técnico para registrar un mantenimiento preventivo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: NuevoMantPage,
});

function NuevoMantPage() {
  const { tipo } = Route.useParams();
  return (
    <AppShell title="Nuevo mantenimiento">
      <MantenimientoForm tipo={tipo} />
    </AppShell>
  );
}
