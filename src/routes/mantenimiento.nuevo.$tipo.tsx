import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MantenimientoForm } from "@/components/mantenimiento-form";

export const Route = createFileRoute("/mantenimiento/nuevo/$tipo")({
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
