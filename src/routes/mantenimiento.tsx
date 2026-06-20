import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/mantenimiento")({
  component: () => <Outlet />,
});
