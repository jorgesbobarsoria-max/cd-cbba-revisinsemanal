# Editor móvil de fotografías

## Objetivo
Reemplazar el editor actual por una experiencia móvil similar a la referencia, conservando el flujo existente de cámara y galería.

## Cambios
- Crear una cabecera fija con cancelar, contador de fotos y botón **Guardar**.
- Mostrar la imagen en un área amplia, oscura y sin elementos que la tapen.
- Añadir una barra inferior desplazable con estas herramientas: **Recortar**, **Ajustar**, **Filtros**, **Dibujar**, **Texto** y **Mosaico**.
- Hacer funcionales todas las herramientas antes de guardar:
  - recorte por selección y giro;
  - brillo, contraste y color;
  - filtros predefinidos;
  - dibujo con color y grosor;
  - texto posicionable;
  - mosaico aplicado sobre un área seleccionada.
- Incluir restablecer y permitir continuar sin cambios.
- Mantener la edición secuencial cuando se seleccionen varias fotos.

## Verificación
- Comprobar el editor en pantalla móvil.
- Probar abrir una imagen, cambiar herramientas, guardar y cancelar.
- Confirmar que la foto editada se devuelve como JPEG al flujo actual.

## Detalles técnicos
La edición seguirá realizándose localmente en el navegador mediante canvas; no se enviará la imagen hasta pulsar **Guardar**.
