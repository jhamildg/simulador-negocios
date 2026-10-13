# Changelog V4

Base: `simulador-negocios-v3.zip`. El motor de cálculo, el número de decisiones (25 por partida: 4 decisiones + 1 evento por año), la duración (5 años), las cuentas, las partidas guardadas, los logros y las finanzas personales de la V3 **no cambiaron**.

## Añadido
- **Portada con tres tarjetas ilustradas** (Taxi y delivery, Venta de productos, Comida rápida): ilustración, nombre, una línea de descripción y «Entrar».
- **Pantalla de presentación** de cada negocio: ilustración grande, explicación, objetivo de aprendizaje, tres retos, «Comenzar» y «Volver». La configuración inicial de la V3 se conserva plegada en «Ajustar el punto de partida (opcional)».
- **`frontend/ilustraciones.js`**: ilustraciones SVG evolutivas por modalidad (4 etapas + estado «En dificultades»), decididas por 8 criterios de indicadores reales; nunca por el tiempo. Insignias de exportación y sucursal.
- Bloque **«Etapa: …»** y desplegable **«¿Por qué se ve así?»** con los criterios cumplidos.
- Pruebas: `backend/test/ilustraciones.test.js` (42), `backend/test/diseno.test.js` (30), `backend/test/v4.e2e.js` (45, requiere Playwright).
- Script `npm run test:v4`; `npm test` incluye ahora las pruebas de ilustraciones y diseño.
- Capturas en `docs/capturas/`.
- Documentos: `INFORME_EVOLUCION_SIMULADOR.md`, `MATRIZ_TRAZABILIDAD_DECISIONES.md`, este archivo.

## Cambiado
- **Paleta**: tema claro único con variables CSS (`--color-principal`, `--color-secundario`, `--color-acento`, `--fondo`, `--fondo-tarjeta`, `--texto`, `--texto-secundario`, `--exito`, `--advertencia`, `--error`, `--borde`, `--sombra`). Se eliminó el modo oscuro y el verde oscuro. Tablero superior blanco con borde coral.
- **Nombres y textos de las modalidades**: «Taxi y delivery» (plataforma que conecta clientes con conductores y repartidores), «Venta de productos», «Comida rápida» (carrito frente a la universidad). Los parámetros numéricos de cada modalidad no cambiaron.
- La etapa del negocio (`stageOf`, `STAGES`, `scene`) ahora proviene de `Ilustraciones.etapa()`; los nombres de etapa son propios de cada modalidad.
- **Móvil (≤ 760 px)**: tarjetas en una columna, botones ≥ 44 px, encabezado compacto, aviso de invitado debajo de las tarjetas, notificaciones a lo ancho abajo (máximo 2 y sin bloquear toques).
- Aviso de invitado más corto.
- `backend/package.json`: versión 4.0.0.

## Corregido (encontrado durante la V4)
- Conflicto de acción `pick` entre las tarjetas de negocio y las opciones de decisión (al elegir una opción se volvía a la presentación). Ahora la tarjeta usa `negocio`.
- Contraste del azul secundario: `#2F80D0` (4,10:1) → `#246FB8` (≥ 4,5:1).
- Al salir o reiniciar una partida se volvía a la presentación en vez de a la portada.
- Notificaciones superpuestas a los botones en el celular.
- Insignia de sucursal «2ª» mal espaciada → «×2».

## Pruebas existentes adaptadas
- `backend/test/navegador.e2e.js`: un paso ahora elige el negocio antes de «Comenzar» (nuevo flujo). Mismas 31 comprobaciones.

## Archivos modificados
- `frontend/index.html`
- `backend/package.json`
- `backend/test/navegador.e2e.js`
- `README.md`

## Archivos nuevos
- `frontend/ilustraciones.js`
- `backend/test/ilustraciones.test.js`
- `backend/test/diseno.test.js`
- `backend/test/v4.e2e.js`
- `docs/capturas/*.png` (8)
- `INFORME_EVOLUCION_SIMULADOR.md`, `MATRIZ_TRAZABILIDAD_DECISIONES.md`, `CHANGELOG_V4.md`

## Sin cambios (a propósito)
- `backend/server.js`, `backend/db.js`, `backend/env.js`, `backend/make-admin.js`, `frontend/finanzas-personales.js`, `Dockerfile`, `render.yaml`.
- Motor: fórmulas, decisiones, eventos, probabilidades.

## Pendiente de aprobación
- Inventario de insumos para Comida rápida (caso Fernando) y escenario «carrito» con ventas de Bs 8.000 y ganancia de Bs 3.000 al mes como supuestos hipotéticos configurables (ver informe, §9.4).
- Corregir la inconsistencia del 3 % de rendimiento de la caja (se suma a la caja, no a la utilidad).
