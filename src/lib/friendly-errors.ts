// Convierte errores crudos de la base de datos en mensajes genéricos para el usuario.
// Los detalles reales se registran en la consola del servidor/cliente para diagnóstico.

type MaybeError = { message?: string; code?: string } | null | undefined;

export function friendlyDbError(err: MaybeError, fallback = "No se pudo completar la operación. Inténtalo de nuevo."): string {
  if (!err) return fallback;
  // Log detallado sólo en consola (no visible al usuario final en producción)
  try { console.error("[db-error]", err); } catch { /* noop */ }

  const code = err.code;
  switch (code) {
    case "23505": return "Ya existe un registro con esos datos.";
    case "23503": return "No se puede completar: hay datos relacionados.";
    case "23502": return "Falta información obligatoria.";
    case "23514": return "Los datos no cumplen las validaciones.";
    case "42501":
    case "PGRST301":
      return "No tienes permisos para realizar esta acción.";
    case "PGRST116": return "No se encontró el registro.";
    default: return fallback;
  }
}
