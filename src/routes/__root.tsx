import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "DC Inspect · Revisión Semanal Data Center" },
      { name: "description", content: "App de inspección semanal de infraestructura crítica del Data Center alineada a Uptime Institute M&O." },
      { name: "theme-color", content: "#1a2230" },
      { property: "og:title", content: "DC Inspect · Revisión Semanal Data Center" },
      { name: "twitter:title", content: "DC Inspect · Revisión Semanal Data Center" },
      { property: "og:description", content: "App de inspección semanal de infraestructura crítica del Data Center alineada a Uptime Institute M&O." },
      { name: "twitter:description", content: "App de inspección semanal de infraestructura crítica del Data Center alineada a Uptime Institute M&O." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9208d810-fd74-448b-8d19-30b8fabac4d8/id-preview-18bcf37d--e1b8e60e-9d74-4d2d-8e4a-80c5d7c17369.lovable.app-1782230286864.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9208d810-fd74-448b-8d19-30b8fabac4d8/id-preview-18bcf37d--e1b8e60e-9d74-4d2d-8e4a-80c5d7c17369.lovable.app-1782230286864.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-6xl font-bold text-gradient">404</h1>
        <p className="mt-2 text-muted-foreground">Página no encontrada</p>
        <a href="/" className="mt-4 inline-block text-primary underline">Volver al inicio</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}
