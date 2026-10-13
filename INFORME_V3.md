# Informe técnico: Simulador de Negocios V3

Fecha: 11/10/2026.

## 1. Punto de partida

- **Archivo recibido:** `simulador-negocios-app.zip` (SHA-256 `5182fb74…a502`). Es idéntico, byte a byte, a la versión publicada en GitHub antes del ajuste de `render.yaml`.
- **No es una V2 con finanzas personales:** el código no contenía retiros, gastos personales, presupuesto ni saldo personal. La V3 se construyó sobre este archivo, con la autorización del usuario. No se afirma que exista una V2 con esas funciones.
- **El original no se modificó:** se trabajó sobre una copia.

Estructura del proyecto recibido: `frontend/index.html` (motor del juego y pantallas de cuenta en un solo archivo), `backend/` (servidor Node.js sin dependencias externas, salvo `pg` para PostgreSQL), `render.yaml`, `Dockerfile`, `README.md`, `.gitignore`, `backend/.env.example`.

## 2. Cambios implementados

### Finanzas personales (nuevo módulo `frontend/finanzas-personales.js`)

Módulo sin dependencias, cargado por la página y por las pruebas de Node. Guarda su estado en `s.pf`, dentro del estado de la partida.

| Regla | Implementación |
|---|---|
| 1. Separación | La caja del negocio sigue siendo `s.cash` (la misma variable del motor). El dinero personal vive en `s.pf.saldo` y `s.pf.ahorro`. |
| 2. Retiros | `retirar`: resta de `s.cash`, suma a `s.pf.saldo` y `s.pf.recibido`, y registra el movimiento. No toca costos, gastos ni utilidad. |
| 3. Gastos personales | `gastar`: resta solo de `s.pf.saldo`, exige categoría y registra el movimiento. La caja del negocio no se toca otra vez. |
| 4. Liquidez | La caja cambia solo por las reglas del motor (utilidad, interés, deuda, decisiones) y por los retiros. Una prueba lo comprueba en 200 secuencias aleatorias. |
| 5. Presupuesto | Presupuesto mensual editable. El valor inicial de Bs 2.500 es un parámetro educativo, no un dato real. Cada año del simulador cuenta como 12 meses y la pantalla avisa si se excede. |
| 6. Dinero insuficiente | Solo se puede retirar el efectivo que tiene el negocio (`maximoRetiro = max(0, caja)`). No hay crédito para retiros ni saldos negativos. Si la caja es cero o negativa (crédito de emergencia pendiente), el retiro se rechaza. |
| 7. Reservas | El ahorro personal se mueve entre «saldo» y «ahorro»: nunca está en los dos a la vez y no se puede gastar sin pasarlo antes al saldo. No se creó una reserva empresarial nueva, para no tocar la liquidez del motor. |
| 8. Persistencia | `s.pf` se guarda dentro del estado que ya se enviaba al servidor. Al cargar se restaura el mismo estado (no se vuelven a aplicar operaciones), así que no hay duplicados. Las partidas anteriores a V3 se cargan con finanzas personales en cero. |

Todas las operaciones validan primero y cambian el estado después: un error no deja nada registrado a medias. Se rechazan importes en cero, negativos, no numéricos, infinitos, con más de dos decimales o desmesurados.

### Interfaz (`frontend/index.html`)

En el tablero, debajo de los indicadores, hay dos paneles nuevos:

- **Mi negocio:** caja empresarial, ingresos, costos y gastos (costo variable, gastos fijos, intereses e IUE), resultado del período y deudas. Usa las mismas fórmulas del motor, sin cálculos nuevos.
- **Mi dinero:**
  - Muestra saldo personal, ahorro, retiros recibidos, gastos personales y presupuesto disponible del año.
  - Formulario con importe, categoría y detalle; los importes se escriben en Bs o USD según el selector de moneda y se guardan en Bs.
  - Botones Retirar del negocio, Registrar gasto personal, Ahorrar y Usar ahorro.
  - Presupuesto editable, avisos de error claros e historial de los últimos 8 movimientos.

Cada operación guarda la partida automáticamente si hay sesión iniciada. En pantalla de teléfono los paneles pasan a una columna, sin desplazamiento horizontal.

### Resultado de la partida y servidor

- **Resultado final:** incluye un resumen personal (`pf`: saldo, ahorro, retiros y gastos).
- **Servidor:** `backend/server.js` acepta y valida ese resumen opcional (4 números) al guardar una partida terminada. Antes lo descartaba.
- **Detalle de partida:** «Ver partida» muestra las finanzas personales.

### Otros

- `backend/package.json`: versión 3.0.0, `npm test` ejecuta también las pruebas de finanzas personales y se agregó `npm run test:navegador`.
- `render.yaml`: se agregó `plan: free` al servicio web y a la base de datos. El ZIP recibido no lo tenía; así coincide con lo que ya está en GitHub, y sin este cambio Render volvería a pedir tarjeta.
- `README.md`: estructura V3, cómo ejecutar las pruebas y cómo probar a mano.

### Lo que no se cambió

- **Motor:** fórmulas, decisiones, eventos, finales, logros, estilos y equilibrio. Del `index.html` original solo cambiaron 3 líneas, ninguna del motor: `restore` (completa `s.pf` en partidas antiguas), el envoltorio de `newGame` (crea `s.pf`) y `finalResult` (añade el resumen personal).
- **Modalidades:** se mantienen las tres, con sus parámetros: Delivery / Taxis (plataforma con comisión por pedido, no un taxista), Compra y venta por internet y Lugar de comida.
- **Cuentas e historial:** autenticación, sesiones, historial, logros, panel de administrador y partidas guardadas, sin cambios.

## 3. Archivos modificados

| Archivo | Estado |
|---|---|
| `frontend/finanzas-personales.js` | nuevo |
| `frontend/index.html` | modificado |
| `backend/server.js` | modificado (validación del resumen personal) |
| `backend/package.json` | modificado (versión y scripts de prueba) |
| `backend/test/finanzas.test.js` | nuevo |
| `backend/test/navegador.e2e.js` | nuevo |
| `render.yaml` | modificado (`plan: free`) |
| `README.md` | modificado |
| `INFORME_V3.md` | nuevo |

Sin cambios: `backend/db.js`, `backend/env.js`, `backend/make-admin.js`, `backend/.env.example`, `backend/test/api.test.js`, `Dockerfile`, `.gitignore`.

## 4. Resultados de las pruebas

Todas se ejecutaron en este entorno: Node.js 22.22, SQLite integrado y Chromium con Playwright.

| Conjunto | Ejecutadas | Pasaron | Fallaron |
|---|---|---|---|
| `test/api.test.js` (existente): cuentas, sesiones, permisos, partidas ajenas, administrador | 30 | 30 | 0 |
| `test/finanzas.test.js` (nuevo): reglas de finanzas personales con el módulo real | 27 | 27 | 0 |
| `test/navegador.e2e.js` (nuevo): juego real en navegador, tres modalidades, servidor real | 31 | 31 | 0 |
| Prueba completa de cuentas y juego en navegador (la misma de la entrega anterior, no incluida en el ZIP) | 24 | 24 | 0 |
| **Total** | **112** | **112** | **0** |

Correspondencia con lo pedido:

1. **Retiro reduce la caja:** prueba unitaria (10.000 → 9.000) y en navegador para las tres modalidades.
2. **Retiro aumenta el saldo personal:** saldo personal de 1.000, en ambos niveles.
3. **Retiro no reduce la utilidad:**
   - La utilidad y las ventas proyectadas no cambian tras el retiro.
   - Se cerró el mismo año dos veces con el mismo azar, con y sin retiro de Bs 1.000: la utilidad fue idéntica en las tres modalidades (Bs 39.316, 46.240 y 62.945 en esa ejecución).
   - La caja al cierre difirió en 1.000, o en 1.030 cuando el negocio tenía caja suficiente para cobrar el 3% de interés sobre ese dinero.
4. **Gasto personal reduce el saldo:** 1.000 − 700 = 300.
5. **Gasto no se descuenta dos veces:** la caja sigue en 9.000 tras el gasto.
6. **Retiro mayor que la caja:** se rechaza con aviso y sin cambios. También se probaron el retiro exacto de toda la caja, la caja en cero y la caja negativa.
7. **Caja sin inconsistencias:** 200 secuencias aleatorias de 60 pasos (10.031 operaciones personales, 2.693 rechazadas a propósito por validación, más flujos simulados del negocio). En todas, caja = inicial + flujo del negocio − retiros, el historial reconstruye los saldos y nada queda negativo.
8. **Guardar y cargar:**
   - En el módulo, un estado guardado y vuelto a cargar es idéntico.
   - En el navegador, con servidor y cuenta: recargar y continuar dos veces deja caja, saldos, presupuesto e historial idénticos y sin duplicados.
   - Las partidas anteriores a V3 cargan bien.
9. **Historial:** cada movimiento guarda caja y saldo antes y después, y aparece en pantalla y en «Ver partida».
10. **Tres modalidades:** cada una se jugó completa en el navegador, con retiros cada año.
11. **Errores sin registros parciales:** cada operación rechazada se comparó con el estado anterior y era idéntico.
12. **Funciones anteriores:** pasaron las 30 pruebas de API y las 24 de cuentas y juego, más la regresión del motor (abajo).

Ninguna prueba falló durante el desarrollo por un error del programa. Hubo dos fallos de los propios scripts de prueba, corregidos en ellos y no en el programa:

- La primera versión de la prueba de navegador buscaba `window.ACC`, pero `ACC` es una constante global que no cuelga de `window`; se cambió la comprobación.
- La prueba antigua de cuentas apuntaba a la carpeta del proyecto anterior.

### Regresión del motor (simulaciones sintéticas, no partidas de personas)

- **Qué se ejecutó:** 1.500 partidas completas (500 por modalidad), con jugadores automáticos que llaman directamente a las funciones del motor en la página V3 servida por el backend. Siete estilos: al azar, crecimiento puro y con control, innovación pura, rentable, conservador, y mixto innovación + crecimiento. No usan las finanzas personales.
- **Resultado:**
  - Cero errores y cero valores no numéricos o infinitos.
  - Las distribuciones de finales y los índices por estilo están dentro de la variación aleatoria de las corridas anteriores: mixto 72,1 de índice, conservador 65,3, innovación pura 62,4, crecimiento con control 62,3, rentable 61,7, crecimiento puro 59,9 y al azar 58,2.
  - Quiebras: 1,4% en delivery, 2,8% en venta por internet y 2,2% en comida.
- **Limitación:** son jugadores automáticos con reglas fijas, no personas. Prueban que el motor no cambió ni falla, no cómo juegan los estudiantes.

## 5. Revisión de las fórmulas financieras

Se revisó el motor (`proj`, `met`, `closeYear`, `apply` y las decisiones). No se cambió ninguna fórmula. Esto es lo que representan:

- **Ingresos:**
  - Ingresos = unidades vendidas × precio.
  - Unidades = mínimo entre demanda (clientes × frecuencia) y capacidad efectiva.
  - Capacidad efectiva = mínimo entre instalaciones y personal × productividad.
- **Costo variable:**
  - Costo variable = unidades × costo unitario × (1 − efecto de la productividad − efecto de la innovación).
  - En delivery es el costo por pedido de la plataforma. En venta por internet incluye compra, envío y comisión de pasarela. En comida representa los insumos.
- **Gastos fijos:** gastos fijos + sueldos + mantenimiento de la innovación (7% × innovación/100 × ventas).
- **Intereses:** deuda × (tasa + recargo si la deuda supera el 30% de las ventas).
- **Impuesto:** IUE del 25% sobre la utilidad antes de impuestos, solo si es positiva.
- **Utilidad:** ventas − costo variable − gastos fijos − intereses − impuesto.
- **Caja al cierre del año:**
  - Más el 3% de interés si la caja supera el 10% de las ventas.
  - Más la utilidad.
  - Menos el 20% del capital de la deuda.
  - Las inversiones de las decisiones salen de la caja en el momento de decidir.
- **Quiebra:** al cierre con caja negativa:
  - Hay quiebra si deuda + faltante supera el 85% de las ventas o si ya hubo 3 créditos de emergencia.
  - Si no, el faltante se cubre con un crédito de emergencia (deuda + 10%) y suben la tasa y el riesgo.
- **Valor de la empresa:** 3,5 × utilidad + 0,65 × ventas + caja − caja ociosa − deuda, ajustado por reputación, innovación, estancamiento y participación del dueño. **Por eso un retiro baja el valor de la empresa y la nota de finanzas (menos caja), aunque no baja la utilidad.** Es correcto: el dinero salió del negocio.
- **Eventos y demanda:** el crecimiento de clientes depende del impulso comercial, la reputación, la satisfacción, la innovación, el precio y la saturación del mercado. Los eventos se eligen con pesos que dependen del riesgo.

### Supuestos de diseño (documentados, no son errores)

- **Modelo en efectivo:** no hay ventas a crédito, cuentas por cobrar ni depreciación; la utilidad del año entra en caja al cierre.
- **IUE sin pérdidas acumuladas:** se calcula año por año, sin compensar pérdidas de años anteriores.
- **Comisión del crédito de emergencia:** el 10% se suma a la deuda, no al gasto del año.
- **Sin inventario explícito:**
  - En venta por internet el costo de compra va dentro del costo unitario; no se modelan existencias ni reposición.
  - En comida no se modelan ingredientes por separado ni desperdicio: los insumos son un porcentaje del costo unitario.
  - El encargo los menciona como si existieran; **no existen en el código**, y no se agregaron para no inventar mecánicas fuera del alcance de esta versión.

### Inconsistencia detectada y no corregida

El interés del 3% sobre la caja se suma a la caja, pero **no forma parte de la utilidad ni paga IUE**. Contablemente es un ingreso financiero y debería figurar en el resultado.

No se corrigió porque cambia la utilidad, el valor y los finales de partidas con mucha caja, y el encargo pide no alterar el equilibrio sin aprobación. Su peso es pequeño (3% de la caja, solo si supera el 10% de las ventas). Se propone corregirlo en una versión posterior, volviendo a ejecutar la regresión.

## 6. Limitaciones y pendientes

- **Sin calendario mensual:** retiros y gastos ocurren al instante, dentro del año en curso. No hay calendario mensual ni gastos personales automáticos, así que el presupuesto se compara con lo gastado en el año.
- **Sin obligaciones personales:** el modelo no tiene deudas ni cuotas personales. No se inventaron.
- **Sin efecto en finales y logros:** las finanzas personales no influyen en el índice empresarial, los finales ni los logros, salvo a través de la menor caja del negocio. Es intencional, para no cambiar el equilibrio.
- **Sin tope de retiro por año:** el único límite es la caja disponible.
- **Caso de Fernando no implementado:** solo quedó preparado el terreno (presupuesto editable, modalidad Lugar de comida). Las cifras de Bs 8.000 de ventas y Bs 3.000 de ganancia mensuales no se usaron, por ser hipotéticas.
- **Prueba de navegador opcional:** requiere Playwright, que no es dependencia del proyecto; sin él, avisa que se omitió y no la cuenta como aprobada.
- **Resultados confiados al navegador:** el juego se calcula en el navegador; el servidor valida forma y propiedad de los datos, no los recalcula.

## 7. Ejecutar localmente

Requisito: Node.js 22.5 o superior.

```
cd backend
npm start          # http://localhost:3000, base SQLite en backend/data/
npm test           # API + finanzas personales (no requiere instalar nada)
```

Opcional, pruebas en navegador:

```
cd backend
npm install --no-save playwright
npx playwright install chromium
npm run test:navegador
```

Con PostgreSQL: definir `DATABASE_URL` y ejecutar `npm install` en `backend` antes de `npm start`.

## 8. Probar a mano

1. **Retiros:** abre una partida y la primera decisión. En «Mi dinero» escribe 1000 y pulsa «Retirar del negocio». En «Mi negocio» la caja baja 1.000 y el «Resultado del período» no cambia; en «Mi dinero» el saldo sube 1.000.
2. **Gastos personales:** escribe 700, elige una categoría y pulsa «Registrar gasto personal». El saldo personal baja a 300 y la caja del negocio no cambia.
3. **Validación:** intenta retirar más que la caja; aparece el aviso y nada cambia.
4. **Ahorro y presupuesto:** prueba «Ahorrar», «Usar ahorro» y cambia el presupuesto mensual.
5. **Guardado:** con una cuenta, recarga la página, pulsa «Continuar» y comprueba saldos e historial. Al terminar, «Mis partidas» → «Ver partida» muestra el resumen personal.
6. **Tres modalidades:** repite en Delivery / Taxis, Compra y venta por internet y Lugar de comida.

## 9. Estado de la versión

| Criterio | Estado |
|---|---|
| Tres modalidades presentes | Cumplido |
| Finanzas personales integradas | Cumplido |
| Retiros y gastos bien contabilizados | Cumplido (probado) |
| Persistencia | Cumplido (probado con servidor real) |
| Pruebas nuevas ejecutadas | Cumplido: 58 nuevas (27 + 31) |
| Pruebas anteriores ejecutadas | Cumplido: 30 de API + 24 de cuentas y juego + regresión de 1.500 partidas |
| Resultados documentados | Cumplido |
| Inicio con las instrucciones | Cumplido en este entorno |

**Pendientes que no impiden usar la versión:** la inconsistencia del interés sobre la caja, el inventario e ingredientes no modelados y el caso de Fernando (sección 6).

**No probado:** el despliegue de esta V3 en Render con PostgreSQL. Las pruebas usaron SQLite.
