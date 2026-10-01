import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/mantenimiento")({
  head: () => ({ meta: [
    { title: "Mantenimiento preventivo · DC Inspect" },
    { name: "description", content: "Gestión de mantenimientos preventivos del centro de datos." },
    { property: "og:title", content: "Mantenimiento preventivo · DC Inspect" },
    { property: "og:description", content: "Gestión de mantenimientos preventivos del centro de datos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Outlet />,
});
