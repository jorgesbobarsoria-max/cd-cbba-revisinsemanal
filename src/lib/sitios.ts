// Sitios (ciudades) donde opera la infraestructura.
export const CIUDADES = ["Cochabamba", "La Paz"];

/** ¿El usuario puede registrar datos en esta ciudad? */
export function puedeEscribirEnSitio(
  opts: { esAdmin: boolean; esTecnico: boolean; sitios: string[] },
  ciudad?: string | null,
): boolean {
  if (opts.esAdmin) return true;
  if (!opts.esTecnico) return false;
  if (!ciudad || !ciudad.trim()) return true;
  const c = ciudad.trim().toLowerCase();
  return opts.sitios.some((s) => s.trim().toLowerCase() === c);
}
