# Corrección por sitio y editor fotográfico en una sola vista

## Objetivo
Corregir la finalización de revisiones para que solo valide los equipos y parámetros del sitio de la revisión, y adaptar el editor de fotos a la altura real del dispositivo sin desplazar la pantalla.

## Cambios
- Limitar desde la carga los parámetros de revisión a los equipos pertenecientes a la ciudad guardada en el registro.
- Usar ese mismo conjunto por sitio para pendientes obligatorios, errores numéricos, progreso, resumen y navegación entre equipos.
- Mantener la exclusión de equipos en **Stand By** dentro del sitio seleccionado.
- Ajustar la alerta de finalización para mostrar únicamente los pendientes reales del sitio y abrir el primer equipo incompleto.
- Reorganizar el editor fotográfico como una vista fija de altura completa:
  - cabecera compacta con cancelar, contador y guardar siempre visibles;
  - imagen centrada y escalada automáticamente al espacio disponible, conservando su proporción;
  - controles de la herramienta activa y barra de herramientas compactos dentro de la misma pantalla;
  - acciones de restablecer y usar original siempre accesibles;
  - soporte para áreas seguras y teclado móvil sin provocar desplazamiento de toda la página.
- Conservar recorte, giro, ajustes, filtros, dibujo, texto, mosaico y edición secuencial de varias fotos.

## Verificación
- Probar una revisión de Cochabamba y otra de La Paz, confirmando que cada una contabiliza solo sus parámetros.
- Confirmar que una revisión completa finaliza sin alertas de puntos pertenecientes al otro sitio.
- Confirmar que Stand By excluye correctamente sus parámetros obligatorios.
- Probar el editor en tamaños Android pequeños y grandes, en vertical, verificando que imagen, herramientas y Guardar aparezcan simultáneamente sin desplazamiento de página.
- Probar guardar, usar original y cancelar con una y varias imágenes.

## Detalles técnicos
La corrección reutilizará los identificadores de los equipos filtrados por la ciudad de la inspección para filtrar `puntos_inspeccion`. El editor usará una distribución de filas con altura `100dvh`, zonas flexibles con `min-height: 0` y límites calculados por el espacio disponible, sin cambiar el procesamiento local mediante canvas ni el formato JPEG de salida.
