# Refuerzo integral de DC Inspect

El pedido cubre 13 áreas (seguridad, integridad de datos, informes, UX, pruebas, despliegue). Es demasiado para una sola pasada segura sobre una app con datos reales en producción, así que lo ejecuto en 4 fases dentro de esta misma línea de trabajo, sin borrar datos y con migraciones aditivas. Cada fase queda funcional por sí sola.

## Fase 1 — Seguridad, permisos y auditoría

Base de datos (migración aditiva):
- Tabla `audit_log` (actor, acción, entidad, entidad_id, datos_antes/después, fecha) con lectura solo para administradores.
- Políticas RLS por rol usando `has_role`:
  - `equipos`, `puntos_inspeccion`, `plantilla_parametros`, `equipos_externos`: lectura para todos los autenticados; escritura/borrado solo administrador.
  - `inspecciones`, `inspeccion_items`: técnico crea/edita las propias en estado borrador; administrador todo; viewer solo lectura de finalizadas.
  - `mantenimientos`: mismo criterio (hoy cualquier autenticado puede borrar todo).
  - `profiles`: el usuario ya no puede tocar `must_change_password` ni `is_active` (trigger que rechaza el cambio salvo administrador).
- Trigger de auditoría en inspecciones, mantenimientos, equipos y roles.

Servidor y UI:
- Servidor: verificación de rol en cada server function sensible; desactivar usuario invalida sus sesiones.
- UI: ocultar y deshabilitar acciones no permitidas (crear, editar, borrar, finalizar, administrar) según rol; rutas `/equipos`, `/admin`, `/mantenimiento/parametros` protegidas.

## Fase 2 — Integridad de inspecciones y mantenimientos

- Módulo único de cálculo (`src/lib/evaluacion.ts`) usado por dashboard, detalle e informes: estados correcto / alerta / falla / N/A / pendiente, disponibilidad sobre puntos esperados (no solo guardados), % de avance y pendientes.
- Bloqueo de finalización con puntos sin responder; N/A exige justificación; Stand By exige observación.
- Excepciones manuales: motivo obligatorio, se guarda valor original, estado automático, estado manual, usuario y fecha; marca visual y registro en auditoría.
- Sí/No en mantenimiento: cada parámetro declara respuesta esperada y severidad; se elimina la deducción por la palabra. Se aplica en hallazgos, conclusiones y recomendaciones.
- Guardado transaccional vía función de base de datos (no se borra lo anterior hasta confirmar lo nuevo), protección contra doble envío y contra sobrescritura de ediciones concurrentes; autoguardado de borrador y aviso al salir con cambios sin guardar.

## Fase 3 — Informes, fotografías y administración

- Gráficas generadas dentro del sistema (SVG propio embebido en el Word), sin servicio externo.
- Informes con completitud, pendientes, N/A, excepciones, alertas, fallas y trazabilidad; separación de observación, hallazgo, acción correctiva, responsable y fecha prevista; referencias técnicas sin presentarlas como certificación.
- Campos que hoy solo aparecen en el informe (supervisor, cargo, turno, condiciones ambientales) pasan a solicitarse en la interfaz.
- Fotografías: validación de formato y tamaño, progreso y reintento por archivo, descripción opcional, limpieza de huérfanos, acceso restringido.
- Administración: contraseñas de 12+ caracteres, temporales ocultas por defecto, diálogos accesibles en lugar de ventanas del navegador, confirmación reforzada para eliminaciones, protección del último administrador.

## Fase 4 — Diseño móvil, calidad, pruebas y despliegue

- Ajuste visual manteniendo el estilo oscuro industrial: legibilidad desde 360 px, texto base 14 px, áreas táctiles de 44 px, menos vidrio, dashboard más corto (alertas y acciones primero, gráficas en sección desplegable), pestañas de equipo más evidentes, estados de carga/error/vacío/reintento, foco y contraste.
- Unificación de marca y terminología (Administrador / Técnico / Consulta, "Mantenimiento", sin abreviaciones ni emojis), logotipo real en acceso, encabezado e informes.
- Rendimiento: carga diferida de gráficas y del generador de informes, división de módulos grandes, limpieza de dependencias sin uso, corrección de tipado y dependencias de efectos.
- Pruebas con Vitest sobre la lógica crítica: permisos por rol, disponibilidad y estados, rangos y excepciones, interpretación Sí/No, guardado interrumpido, cálculos de informe; más verificación en navegador a 360 px.
- Configuración por variables de entorno para dirección pública y dominio; sin credenciales en el proyecto.

## Detalles técnicos

- Stack sin cambios: TanStack Start, Lovable Cloud, server functions con `requireSupabaseAuth`.
- Todas las migraciones son aditivas (nuevas columnas con valor por defecto y nuevas tablas); no se elimina ninguna fila existente. Los registros previos sin datos de completitud se marcan como "sin verificar", no como incompletos.
- `.env` sale del repositorio y se añade a `.gitignore`; se informa qué claves rotar.
- No se publica nada al terminar.
