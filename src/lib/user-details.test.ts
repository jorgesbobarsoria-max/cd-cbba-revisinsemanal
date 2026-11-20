import { describe, expect, it } from "vitest";
import { atributosDesdeFilas, exigirAdministrador, userDetailsSchema } from "./user-details";

describe("datos administrativos de usuarios", () => {
  it("guarda cargo y atributos personalizados", () => {
    const atributos = atributosDesdeFilas([{ nombre: "Área", valor: "Operaciones" }, { nombre: "Teléfono", valor: "123456" }]);
    const parsed = userDetailsSchema.parse({ email: "usuario@example.org", full_name: "Técnico", cargo: "Supervisor", atributos });
    expect(parsed.cargo).toBe("Supervisor");
    expect(parsed.atributos).toEqual({ Área: "Operaciones", Teléfono: "123456" });
  });
  it("solo permite la autorización positiva de administrador", () => {
    expect(() => exigirAdministrador(true)).not.toThrow();
    for (const denied of [false, null, undefined, "admin"]) expect(() => exigirAdministrador(denied)).toThrow();
  });
  it("no interpreta atributos como roles ni permisos", () => {
    const p = userDetailsSchema.parse({ email: "usuario@example.org", full_name: "", cargo: "Administrador", atributos: { role: "admin" }, role: "admin" });
    expect(p).not.toHaveProperty("role");
    expect(p.atributos.role).toBe("admin");
  });
  it("rechaza atributos duplicados y vacíos", () => {
    expect(() => atributosDesdeFilas([{ nombre: "Cargo", valor: "A" }, { nombre: "cargo", valor: "B" }])).toThrow();
    expect(() => atributosDesdeFilas([{ nombre: " ", valor: "A" }])).toThrow();
  });
});