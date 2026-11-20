export type Responsable = { id: string; nombre: string; cargo: string };

export function datosTecnico(profile: { full_name?: string | null; cargo?: string | null } | null, fallback: string) {
  return { tecnico: profile?.full_name?.trim() || fallback, cargo: profile?.cargo?.trim() || "" };
}

export function datosSupervisor(persona: Responsable | null) {
  return { supervisor_id: persona?.id ?? "", supervisor: persona?.nombre ?? "", cargo_supervisor: persona?.cargo ?? "" };
}