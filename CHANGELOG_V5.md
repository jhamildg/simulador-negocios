# Changelog V5

Base: V4. Se conservan las tres modalidades, las finanzas personales, las cuentas, las partidas guardadas, los logros, el panel de administrador, las 35 decisiones, los 13 eventos, las 174 opciones y las **25 situaciones por partida**.

## Añadido
- **Identidad visual**: logo en la portada (`assets/logo.webp` + `logo.png`), encabezado horizontal con ícono y lema, ícono simplificado de la aplicación (`assets/icono.svg` y PNG de 32, 180, 192 y 512 px) y `manifest.webmanifest`.
- **Navegación inferior**: Inicio, Simulación, Finanzas y Progreso. Simulación y Finanzas se deshabilitan sin partida; ningún ícono lleva a una pantalla vacía.
- **`frontend/motor.js`**: motor separado de la interfaz que también se carga desde Node para las pruebas.
- **Calendario de 12 meses**: 20 decisiones y 5 eventos (meses 3, 5, 7, 9 y 11); todos los flujos se calculan por mes.
- **Regla de demanda por precio**, lineal, con elasticidad por modalidad y precio de referencia del mercado.
- **Inventario** (Comida rápida y Venta de productos): compras por ciclos, costo promedio ponderado, mermas, plan de compra automático o manual y capacidad de reposición.
- **Registro contable**: activo fijo y depreciación (DS 24051), anticipos, cuentas por cobrar y por pagar, aportes, repartos, IUE por pagar; balance general que cuadra en cada paso.
- **Impuestos**: IUE como provisión mensual (Ley 843); Régimen Tributario Simplificado para Fernando (DS 24484, tabla del DS 3698).
- **Caso Fernando**: carrito, sin empleados, parámetros documentados como supuestos (los Bs 8.000 y Bs 3.000 son hipotéticos), textos propios y situaciones que no aplican excluidas.
- **Indicadores por modalidad** con su fórmula; los conductores activos quedan como pendiente declarado.
- **Escenas reactivas**: clientes, pedidos, paquetes, cajas de inventario y equipos según los resultados reales; “Lo que cambió en tu negocio” y “Cómo se registra en las cuentas” después de cada decisión.
- **Pantallas**: cierre de mes con estado de resultados; Finanzas con indicadores, estado de resultados, balance, inventario, dinero personal, punto de equilibrio y evolución mensual.
- **Pruebas**: `motor.test.js` (64), `regresion.sim.js` (partidas completas), `v5.e2e.js` (81).

## Cambiado
- Comida rápida pasó de un local con 5 empleados (≈ Bs 56.000 al mes) a un carrito (≈ Bs 8.000 al mes).
- El dinero puntual de las decisiones se multiplica por 0,2 (calibración para 12 meses); los gastos recurrentes se muestran “al mes”.
- Las opciones de precio ya no traen un cambio fijo de clientes (15 opciones); “competidor que copia” e “inflación” mueven el precio de referencia.
- Logros, metas, niveles (por trimestre), finales y etapas visuales se recalibraron para 12 meses.
- El valor estimado y los puntajes usan el resultado recurrente (sin gastos puntuales).
- `finanzas-personales.js`: modo mensual cuando la partida tiene meses; el modo anual de la V3/V4 se conserva.
- Servidor: período de partida de 1 a 12; tipos MIME `.webp` y `.webmanifest`.
- `navegador.e2e.js` adaptada al calendario mensual y a la pestaña Finanzas (mismas 31 comprobaciones); `ilustraciones.test.js` actualizada a las reglas V5.
- `package.json`: versión 5.0.0; `npm test` incluye motor, regresión e ilustraciones; nuevos `test:v5` y `regresion`.

## Corregido
- Gastos puntuales de las decisiones que no pasaban por el resultado (V4).
- Inversiones sin activo ni depreciación (V4).
- Rendimiento de la caja que no pasaba por el resultado (inconsistencia documentada en la V4).
- Redondeo de la caja en `FinanzasPersonales.retirar` que acumulaba diferencias de centavos con el balance.
- Quiebras en cadena con inventario: sin caja no se compraban insumos y el mes quedaba sin ventas. Ahora hay compras por ciclos y un crédito de emergencia que cubre también un ciclo de compras.
- Saldos negativos absurdos (−Bs 126 millones): el recargo de interés se calculaba dividiendo entre ventas de 0. Ahora tiene una base mínima y un tope de 15 puntos.
- Referencia de ventas (S) que saltaba cada mes: ahora es el promedio de los últimos 3 meses.
- Móvil: encabezado amontonado, barra de 12 meses en columna, importes partidos, etiqueta visible que debía ser solo para lectores de pantalla, gráfico demasiado alto en escritorio.

## Eliminado
- `backend/test/v4.e2e.js`: reemplazado por `v5.e2e.js`, que conserva sus comprobaciones.

## Archivos
- **Nuevos**: `frontend/motor.js`, `frontend/manifest.webmanifest`, `frontend/assets/*` (8), `backend/test/motor.test.js`, `backend/test/regresion.sim.js`, `backend/test/v5.e2e.js`, `CHANGELOG_V5.md`, `INFORME_V4.md` (el informe anterior, renombrado), `docs/capturas/*` (11).
- **Modificados**: `frontend/index.html`, `frontend/ilustraciones.js`, `frontend/finanzas-personales.js`, `backend/server.js`, `backend/package.json`, `backend/test/finanzas.test.js`, `backend/test/ilustraciones.test.js`, `backend/test/navegador.e2e.js`, `README.md`, `INFORME_EVOLUCION_SIMULADOR.md`, `MATRIZ_TRAZABILIDAD_DECISIONES.md`.

## Pendiente
- Conductores y repartidores activos en Taxi y delivery (falta una variable y una regla de pedidos por afiliado).
- Pruebas con estudiantes y docentes.
- Partidas de la V4 (5 años): se pueden ver pero no continuar.
