# Resultados de las pruebas — V5.2

## Cómo se ejecutaron

Todas las pruebas se ejecutaron el 13 de octubre de 2026 sobre una **copia limpia** del ZIP entregado (`simulador-negocios-v5.2.zip`). Se descomprimió en una carpeta vacía y se probó ahí.

Entorno:

- Node.js 22;
- Chromium (Playwright) en Linux;
- base SQLite en memoria.

Las cifras de este documento son las que salieron en esa ejecución.

## Resultados

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `api.test.js` | Cuentas, sesiones, permisos, partidas, administrador | **30 / 30** |
| `finanzas.test.js` | Retiros, gastos, ahorro y presupuesto personal | **31 / 31** |
| `motor.test.js` | Calendario, demanda, inventario, registro contable, IUE, RTS devengado y pagado, tasas, cargas sociales, Comida rápida, indicadores, guardar y continuar | **75 / 75** |
| `auditoria.test.js` (nueva) | Contenido, personal, registro contable, impuestos, 10 escenarios del detalle contable, guardar y continuar, migración desde la V5.1. Ver la lista siguiente. | **54 / 54** |
| `ilustraciones.test.js` | Etapas, escenas y estados de desempeño | **42 / 42** |
| `diseno.test.js` | Paleta, tokens y contraste | **30 / 30** |
| `regresion.sim.js 20` (dentro de `npm test`) | 420 partidas completas | **0 errores**; diferencia máxima de balance 1,16 × 10⁻¹⁰ |
| `regresion.sim.js 72` | 1.512 partidas completas con 7 estilos de juego | **0 errores**; diferencia máxima de balance 1,75 × 10⁻¹⁰; 0 valores no numéricos |
| `v5.e2e.js` (navegador) | Logo e ícono; navegación de 5 secciones en 5 anchos de pantalla; Finanzas y Progreso; escenas; plan de compras; dirección de **499 opciones aplicadas** (174 opciones × 3 modalidades, con sus efectos propios) con el balance cuadrado; partidas completas; capturas 01–13 | **99 / 99** |
| `detalle.e2e.js` (nueva, navegador) | Detalle contable en escritorio y en celulares de 360 y 390 px. Ver la lista siguiente. | **22 / 22** |
| `navegador.e2e.js` | Finanzas personales en las tres modalidades; cierre con y sin retiro; guardar y continuar con cuenta | **31 / 31** |
| Servidor | `/`, `motor.js`, `finanzas-personales.js`, `ilustraciones.js`, manifiesto, logo e ícono servidos | **200** en todos |

Qué cubre `auditoria.test.js`:

- **Contenido**: 5.852 textos de situaciones y 7.199 mensajes de cierre.
- **Personal**:
  - estado inicial;
  - salario mínimo;
  - cargas sociales;
  - contratar con y sin falta de capacidad;
  - no contratar dos veces;
  - segundo carrito;
  - jornada propia;
  - conflicto laboral sin ayudante;
  - despidos;
  - bonos.
- **Registro contable**:
  - venta de activos sin equipos;
  - tasas;
  - multas no deducibles;
  - comisión de emergencia;
  - aguinaldo;
  - flujo de caja en 1.439 meses;
  - partidas por decisión;
  - balance guardado;
  - identidad del estado de resultados.
- **Impuestos**:
  - tabla del RTS;
  - categorías;
  - capital;
  - límites;
  - IUE pendiente.
- **Detalle contable**: 10 escenarios.
- **Guardar y continuar** y **migración desde la V5.1**.

Qué cubre `detalle.e2e.js`:

- cifras en pantalla iguales a las del motor;
- secciones;
- selector de período;
- actualización después de una decisión y de un retiro;
- navegación entre las 5 secciones;
- impuestos de Delivery;
- textos corregidos de las situaciones;
- recorrido de 4 meses por modalidad sin textos prohibidos;
- celular sin desplazamiento horizontal;
- guardar, recargar y continuar con el detalle idéntico;
- partida de la V5.1;
- consola sin errores;
- capturas 15–21.

## Escenarios del detalle contable (todos ejecutados)

| Escenario | Prueba | Resultado |
|---|---|---|
| Negocio sin ventas | `auditoria.test.js` | Aprobado |
| Ventas normales | `auditoria.test.js` | Aprobado |
| Con pérdidas | `auditoria.test.js` | Aprobado |
| Personal contratado | `auditoria.test.js` | Aprobado |
| Con inventario | `auditoria.test.js` | Aprobado |
| Sin inventario (delivery) | `auditoria.test.js` | Aprobado |
| Con deuda | `auditoria.test.js` | Aprobado |
| Con retiros personales | `auditoria.test.js` y `detalle.e2e.js` | Aprobado |
| Impuestos pendientes (IUE) | `auditoria.test.js` y `detalle.e2e.js` | Aprobado |
| Obligación tributaria pagada (RTS) | `auditoria.test.js` | Aprobado |

## Pruebas de interfaz

| Prueba | Resultado |
|---|---|
| Escritorio (1280 px) | Aprobado (`detalle.e2e.js`, `v5.e2e.js`) |
| Celular (360 y 390 px) | Aprobado: sin desplazamiento horizontal, 5 botones de 44 px o más |
| Navegación Inicio → Simulación → Finanzas → Detalle → Progreso | Aprobado |
| Partidas guardadas y continuación | Aprobado: detalle idéntico tras recargar; la partida sigue cuadrando |
| Actualización de los importes después de una decisión | Aprobado |
| Errores de consola | Ninguno (`detalle.e2e.js` registra `pageerror` y los errores de consola; las fuentes externas se bloquean a propósito durante la prueba) |

## Estabilidad

En una de cuatro ejecuciones previas de `v5.e2e.js` apareció el error intermitente que ya se había documentado en la V5.1: Playwright no podía hacer clic porque la opción «no estaba estable».

**Causa**: al pasar el cursor, la tarjeta subía 3 px. Si el cursor quedaba en el borde, la tarjeta oscilaba entre «con cursor» y «sin cursor».

**Corrección**: se quitó ese desplazamiento.

Antes de corregirlo había pasado en 3 de 4 ejecuciones. Después de la corrección, `v5.e2e.js` pasó 99/99 en las dos ejecuciones que se hicieron: una en la carpeta de trabajo y otra en la copia limpia. Dos ejecuciones no bastan para descartar del todo un fallo intermitente.

## Lo que no se probó

- No hubo pruebas con estudiantes, docentes ni usuarios reales.
- No se usaron teléfonos físicos ni Safari: solo Chromium, emulando las pantallas.
- El guion de cuentas del equipo (24 pruebas, fuera del ZIP) no se volvió a ejecutar en esta ronda. El flujo de cuentas sí se cubre con `api.test.js`, `navegador.e2e.js` y `detalle.e2e.js`.
- **Verificación tributaria**: se verificaron con la norma la tabla del RTS, la exclusión, los límites, la periodicidad y la tasa del IUE. Lo que no se pudo confirmar o no se modela está en `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md` §4 y en `PENDIENTES_V5_2.md`. **El sistema tributario del simulador no está «completamente verificado»**: el IVA y el IT no se calculan y hay simplificaciones declaradas.

## Capturas (`docs/capturas/`)

**01–13**: las capturas de la V5.1, regeneradas con la barra de 5 secciones.

**Nuevas**:

| N.º | Captura |
|---|---|
| 15 | Detalle contable en escritorio (página completa) |
| 16 | Detalle contable en celular de 390 px (página completa) |
| 17 | Movimientos de la caja |
| 18 | Impuestos en Taxi y delivery (IUE e IVA/IT «No modelado») |
| 19 | Situación de riesgos en Comida, sin directorio |
| 20 | Situación de contratación con «horas pico» |
| 21 | Barra de navegación con 5 secciones en celular |
