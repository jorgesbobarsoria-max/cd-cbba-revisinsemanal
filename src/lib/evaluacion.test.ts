import { describe, expect, it } from "vitest";
import {
  evaluarPunto,
  evaluarNumero,
  partirValores,
  peor,
  resumir,
  validarNumerico,
} from "@/lib/evaluacion";
import { permisosDe, rolPrincipal } from "@/lib/permisos";

describe("evaluarNumero", () => {
  const r = { tipo: "numerico", min_ok: 18, max_ok: 27, min_alerta: 15, max_alerta: 30 };
  it("marca verde dentro del rango OK", () => expect(evaluarNumero(22, r)).toBe("verde"));
  it("marca amarillo en la banda de alerta", () => expect(evaluarNumero(29, r)).toBe("amarillo"));
  it("marca rojo fuera de la banda de alerta", () => expect(evaluarNumero(40, r)).toBe("rojo"));
  it("usa solo la banda de alerta si no hay rango OK", () => {
    expect(evaluarNumero(5, { tipo: "numerico", min_alerta: 0, max_alerta: 10 })).toBe("verde");
    expect(evaluarNumero(11, { tipo: "numerico", min_alerta: 0, max_alerta: 10 })).toBe("rojo");
  });
});

describe("evaluarPunto", () => {
  it("respeta la excepción manual sobre el cálculo automático", () => {
    expect(evaluarPunto("999", { tipo: "numerico", max_ok: 10 }, "OK")).toBe("verde");
    expect(evaluarPunto("1", { tipo: "numerico", max_ok: 10 }, "NA")).toBe("gris");
  });

  it("evalúa binarios contra la respuesta esperada configurada", () => {
    const alertas = { tipo: "binario", respuesta_esperada: "No", severidad: "falla" };
    expect(evaluarPunto("No", alertas)).toBe("verde");
    expect(evaluarPunto("Sí", alertas)).toBe("rojo");

    const funciona = { tipo: "binario", respuesta_esperada: "Sí", severidad: "alerta" };
    expect(evaluarPunto("Sí", funciona)).toBe("verde");
    expect(evaluarPunto("No", funciona)).toBe("amarillo");
  });

  it("toma el peor semáforo de un parámetro trifásico", () => {
    const r = { tipo: "numerico", min_ok: 210, max_ok: 240, min_alerta: 200, max_alerta: 250, valores_count: 3 };
    expect(evaluarPunto("220|225|218", r)).toBe("verde");
    expect(evaluarPunto("220|245|218", r)).toBe("amarillo");
    expect(evaluarPunto("220|245|100", r)).toBe("rojo");
  });

  it("devuelve gris cuando no hay dato", () => {
    expect(evaluarPunto("", { tipo: "numerico" })).toBe("gris");
    expect(evaluarPunto(undefined, { tipo: "texto" })).toBe("gris");
  });
});

describe("validarNumerico", () => {
  const r = { tipo: "numerico", valores_count: 3, min_alerta: 200, max_alerta: 250 };

  it("exige las tres lecturas si se empezó a llenar", () => {
    const v = validarNumerico(r, "220||");
    expect(v.bloqueante).toBe(true);
    expect(v.global).toContain("3 lecturas");
  });

  it("acepta las tres lecturas completas", () => {
    expect(validarNumerico(r, "220|221|219").bloqueante).toBe(false);
  });

  it("rechaza formato no numérico", () => {
    expect(validarNumerico(r, "abc|221|219").porValor[0]).toContain("Formato");
  });

  it("rechaza valores absurdos fuera de rango razonable", () => {
    expect(validarNumerico(r, "9999|221|219").bloqueante).toBe(true);
  });

  it("no bloquea un punto totalmente vacío", () => {
    expect(validarNumerico(r, "").bloqueante).toBe(false);
  });
});

describe("resumir", () => {
  const items = [
    { equipo_id: "a", semaforo: "verde" },
    { equipo_id: "a", semaforo: "amarillo" },
    { equipo_id: "b", semaforo: "rojo" },
    { equipo_id: "c", semaforo: "gris" },
  ];

  it("calcula disponibilidad sobre puntos evaluados, no sobre el total", () => {
    const r = resumir(items, 10);
    expect(r.ok).toBe(1);
    expect(r.disponibilidad).toBe(33);
    expect(r.completitud).toBe(40);
  });

  it("excluye equipos en stand by", () => {
    const r = resumir(items, 10, ["b"]);
    expect(r.falla).toBe(0);
    expect(r.disponibilidad).toBe(50);
  });
});

describe("helpers", () => {
  it("peor devuelve el estado más crítico", () => {
    expect(peor(["verde", "amarillo", "gris"])).toBe("amarillo");
    expect(peor([])).toBe("gris");
  });
  it("partirValores ignora vacíos", () => {
    expect(partirValores("1||3")).toEqual(["1", "3"]);
  });
});

describe("permisos", () => {
  it("prioriza admin sobre otros roles", () => {
    expect(rolPrincipal(["viewer", "admin"])).toBe("admin");
  });
  it("viewer no puede capturar ni gestionar", () => {
    const p = permisosDe(["viewer"]);
    expect(p.puedeCapturar).toBe(false);
    expect(p.puedeGestionarCatalogo).toBe(false);
  });
  it("tecnico captura pero no gestiona el catálogo", () => {
    const p = permisosDe(["tecnico"]);
    expect(p.puedeCapturar).toBe(true);
    expect(p.puedeGestionarCatalogo).toBe(false);
    expect(p.puedeEditarFinalizado).toBe(false);
  });
  it("admin puede todo", () => {
    const p = permisosDe(["admin"]);
    expect(p.puedeGestionarCatalogo && p.puedeEditarFinalizado && p.puedeAdministrarUsuarios).toBe(true);
  });
});
