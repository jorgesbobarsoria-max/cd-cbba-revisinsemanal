// Modelo de permisos por rol, alineado con las políticas RLS de la base de datos.
// La UI usa esto solo para ocultar acciones; el servidor y RLS son la barrera real.

export type AppRole = "admin" | "tecnico" | "viewer";

export type Permisos = {
  rol: AppRole;
  esAdmin: boolean;
  esTecnico: boolean;
  /** Crear/editar inspecciones y mantenimientos propios. */
  puedeCapturar: boolean;
  /** Editar el catálogo de equipos y sus parámetros de medición. */
  puedeGestionarCatalogo: boolean;
  /** Editar un registro ya finalizado. */
  puedeEditarFinalizado: boolean;
  /** Eliminar registros. */
  puedeEliminar: boolean;
  /** Declarar excepciones manuales sobre el semáforo automático. */
  puedeExcepcionar: boolean;
  /** Entrar al panel de administración de usuarios. */
  puedeAdministrarUsuarios: boolean;
};

export function rolPrincipal(roles: string[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("tecnico")) return "tecnico";
  return "viewer";
}

export function permisosDe(roles: string[]): Permisos {
  const rol = rolPrincipal(roles);
  const esAdmin = rol === "admin";
  const esTecnico = rol === "tecnico" || esAdmin;
  return {
    rol,
    esAdmin,
    esTecnico,
    puedeCapturar: esTecnico,
    puedeGestionarCatalogo: esAdmin,
    puedeEditarFinalizado: esAdmin,
    puedeEliminar: esTecnico,
    puedeExcepcionar: esTecnico,
    puedeAdministrarUsuarios: esAdmin,
  };
}

export const ETIQUETA_ROL: Record<AppRole, string> = {
  admin: "Administrador",
  tecnico: "Técnico",
  viewer: "Consulta",
};
