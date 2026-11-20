import { z } from "zod";

export const userDetailsSchema = z.object({
  email: z.string().trim().email().max(255),
  full_name: z.string().trim().max(120),
  cargo: z.string().trim().max(120),
  atributos: z.record(z.string().trim().min(1).max(80), z.string().trim().max(500)),
});
export type UserDetails = z.infer<typeof userDetailsSchema>;

export function atributosDesdeFilas(rows: { nombre: string; valor: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  const names = new Set<string>();
  for (const row of rows) {
    const nombre = row.nombre.trim();
    if (!nombre) throw new Error("Cada atributo necesita un nombre");
    const normalized = nombre.toLocaleLowerCase("es");
    if (names.has(normalized)) throw new Error("Los nombres de atributos no deben repetirse");
    if (["__proto__", "constructor", "prototype"].includes(normalized)) throw new Error("Nombre de atributo no válido");
    names.add(normalized);
    Object.defineProperty(result, nombre, { value: row.valor.trim(), enumerable: true, configurable: true, writable: true });
  }
  return result;
}

export function exigirAdministrador(allowed: unknown) {
  if (allowed !== true) throw new Error("Solo administradores pueden editar usuarios");
}