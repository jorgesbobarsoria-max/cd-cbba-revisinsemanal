import { describe, expect, it } from "vitest";
import { datosTecnico, datosSupervisor } from "./responsables";

describe("responsables de revisión semanal", () => {
  it("autocompleta nombre y cargo del perfil del técnico", () => {
    expect(datosTecnico({ full_name: "Ana Pérez", cargo: "Técnica de operaciones" }, "cuenta")).toEqual({ tecnico: "Ana Pérez", cargo: "Técnica de operaciones" });
  });
  it("seleccionar supervisor completa su nombre y cargo", () => {
    expect(datosSupervisor({ id: "123", nombre: "Luis García", cargo: "Supervisor" })).toEqual({ supervisor_id: "123", supervisor: "Luis García", cargo_supervisor: "Supervisor" });
  });
  it("retirar supervisor limpia todos sus datos", () => {
    expect(datosSupervisor(null)).toEqual({ supervisor_id: "", supervisor: "", cargo_supervisor: "" });
  });
});