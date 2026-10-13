# Correcciones V5.1: pruebas, parámetros modificados y pendientes

> Documento histórico de la V5.1. Algunas cifras cambiaron en la V5.2 (sueldos, cargas sociales, RTS devengado, número de pruebas). Las cifras vigentes están en `CHANGELOG_V5_2.md`, `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md` y `RESULTADOS_PRUEBAS_V5_2.md`.

Complementa `CHANGELOG_V5_1.md`. Las cifras económicas son **supuestos pedagógicos del simulador**: no son precios de mercado verificados ni datos de un negocio real.

---

## 1. Dónde se originaban los problemas

| Problema | Origen en el código |
|---|---|
| Frase «Dirige un negocio durante 12 meses…» | `inicioHTML()` → `<p>` dentro de `.hero` (`frontend/index.html`) |
| Bloque «BIENVENIDO A TU NEGOCIO / El carrito de Fernando» | `introHTML()`, mes 1: banner con `s.name`, que en Comida era `BIZ.comida.def` = «El carrito de Fernando» |
| Referencias visibles a Fernando | `BIZ.comida` (descripción, presentación, nombre por defecto, supuestos) en `motor.js`; dueño por defecto en `newGame()`; indicador `pf`; `personalTxt()`, `introHTML()`, `finHTML()`, `dineroHTML()` y el campo «Tu nombre» en `index.html` |
| Costos de negocio grande en Comida | `fixedO` de Bs 19.200 al año (Bs 1.600 al mes, con Bs 500 de «espacio»); `rd` calculado sobre toda la innovación inicial; gas mezclado con envases en el costo por plato |
| Ilustraciones sin movimiento | `ilustraciones.js` dibujaba SVG estáticos; no había hojas de estilo de animación ni estados de desempeño |

## 2. Parámetros económicos de Comida rápida

| Concepto | V5 | V5.1 | Justificación |
|---|---|---|---|
| Precio por plato | Bs 15 | Bs 15 (sin cambio) | Supuesto; es coherente con el resto del modelo y no hay fuente para cambiarlo |
| Ingredientes por plato | Bs 5,10 | Bs 5,10 (sin cambio) | Supuesto; 34 % del precio. Se inventaría y se registra como costo al vender |
| Envases por plato | Bs 0,90 (envases y gas) | **Bs 0,60** (solo envases, servilletas y bolsa) | El gas no depende de cada plato vendido: pasa a gastos operativos |
| Demanda | 200 comensales × 32 platos al año (≈ 534 al mes) | sin cambio | ≈ 22 platos por día en 24 días hábiles; coherente con un carrito |
| Capacidad | 700 platos al mes, el dueño solo | sin cambio | Una persona preparando y atendiendo |
| Gastos operativos | Bs 1.600 al mes (espacio 500, transporte 450, mantenimiento 250, teléfono 100, limpieza y otros 300) | **Bs 650 al mes**: permiso municipal 100, gas 70, transporte de insumos 250, agua 40, limpieza 60, mantenimiento 80, teléfono o QR 50 | Un carrito en la vía pública con permiso no paga alquiler de local; los Bs 500 de «espacio» y el transporte de Bs 450 correspondían a un negocio mayor |
| Costo de innovación | 7 % de las ventas × innovación (15) ÷ 100 ≈ Bs 84 al mes desde el inicio | **Bs 0 al nivel inicial**; solo cuesta la innovación agregada con decisiones | Un carrito no sostiene un área de innovación; el costo aparece si el jugador decide innovar. Solo afecta a esta modalidad |
| Mano de obra | Sin sueldos; ayudante solo si se contrata | sin cambio | El dueño vive de sus retiros, que no son gastos; la ayuda se paga por fracción de jornada (referencia: salario mínimo 2025, DS 5383) |
| Activo fijo | Bs 5.000, una pieza a 8 años (Bs 52 al mes) | **Carrito con plancha Bs 4.200 (8 años) + utensilios y vajilla Bs 800 (4 años)** = Bs 60 al mes | Plazos del DS 24051 (equipos 8 años; herramientas 4 años) |
| Caja inicial | Bs 4.000 | sin cambio | Capital de trabajo: ≈ 6 semanas de ingredientes, o un mes de compras y gastos |
| Compras | semanales, stock de seguridad 5 % | sin cambio | Se compra ≈ lo que se vende (prueba: compra = venta esperada × 1,05) |
| Mermas | 50 % de lo que sobra | sin cambio | Perecibles |
| Impuesto | Régimen Tributario Simplificado | sin cambio | Capital de Bs 5.000 < Bs 12.000: sin cuota |
| Nombre y dueño por defecto | «El carrito de Fernando», «Fernando» | «Mi carrito de comida», «Tú» | Sin protagonista visible |

**Primer mes (motor, sin decisiones):**

| Concepto | V5 | V5.1 |
|---|---|---|
| Platos vendidos | 534 | 534 |
| Ventas | Bs 8.016 | Bs 8.016 |
| Ingredientes (costo de lo vendido) | Bs 2.725 | Bs 2.725 |
| Mermas | Bs 68 | Bs 68 |
| Envases (y gas en V5) | Bs 481 | Bs 321 |
| Innovación | Bs 84 | Bs 0 |
| Gastos operativos | Bs 1.600 | Bs 650 |
| Depreciación | Bs 52 | Bs 60 |
| Impuesto | Bs 0 | Bs 0 |
| **Resultado** | **Bs 3.005** | **Bs 4.191** |
| Compra de ingredientes | Bs 2.862 | Bs 2.862 |

El resultado incluye lo que el dueño gana por su trabajo (no tiene sueldo). Ya no coincide con la referencia hipotética de Bs 3.000 de la ronda anterior. No se fijó una cifra: es la consecuencia de quitar costos que no corresponden a un carrito.

**Efecto en 1.512 partidas simuladas (Comida rápida, 7 estilos):**

| | V5 | V5.1 |
|---|---|---|
| Quiebras | 1,6 % | 0,2 % |
| Final «Empresa en riesgo» | 20,2 % | 2,4 % |
| Índice promedio | 51,0 | 56,6 |
| Etapa visual «en dificultades» al final | 24,4 % | 2,6 % |

Las otras dos modalidades no cambiaron (mismas cifras que en la V5). El negocio **no es siempre rentable**. Las pruebas comprueban tres casos:
- subir el precio 50 % deja el resultado del mes en menos de un tercio;
- con +70 % el mes da pérdida;
- un dueño que retira toda la caja cada mes se queda sin insumos en 11 de 12 meses y vende menos en el año.

## 3. Pruebas ejecutadas y resultados

Todas se ejecutaron en esta versión, desde una extracción limpia del ZIP (§4).

### 3.1 Automatizadas

| Prueba | Resultado |
|---|---|
| `api.test.js` (cuentas, sesiones, permisos, partidas) | 30 / 30 |
| `finanzas.test.js` (finanzas personales) | 31 / 31 |
| `motor.test.js` (calendario, demanda, inventario, contabilidad, impuestos, Comida rápida, indicadores, guardado) | 74 / 74 |
| `ilustraciones.test.js` (etapas, escenas, estados de desempeño) | 42 / 42 |
| `diseno.test.js` (paleta y contraste) | 30 / 30 |
| `regresion.sim.js 20` (dentro de `npm test`) | 420 partidas, 0 errores, balance cuadrado (máx. 1,3 × 10⁻¹⁰) |
| `regresion.sim.js 72` | 1.512 partidas, 0 errores, balance cuadrado (máx. 1,75 × 10⁻¹⁰) |
| `navegador.e2e.js` (finanzas personales en navegador, guardado y continuación con cuenta) | 31 / 31 |
| `v5.e2e.js` (navegador: portada, 5 anchos, 3 modalidades, textos, animaciones, estados, capturas) | 99 / 99 |
| Script de cuentas del equipo (fuera del ZIP) | 24 / 24 |

**Fallos intermitentes encontrados y corregidos en las pruebas** (no en la aplicación):
- la prueba del logo a veces medía antes de que cargara la imagen;
- una notificación de logro usa la misma clase que las insignias y alteraba el conteo;
- se esperaba un tiempo fijo después de elegir una opción.

Tras corregirlos, `v5.e2e.js` pasó 99/99 en 7 de 8 ejecuciones completas. En una ejecución desde la copia limpia hubo un clic que no se completó en 30 s sobre una opción de decisión. Se ajustó la espera y se agregó más detalle al registro de errores, y no volvió a aparecer en las 4 ejecuciones siguientes, la última después de la corrección del indicador de reposición. Sigue anotado como posible fallo intermitente de la prueba.

### 3.2 Funcionales (incluidas en las pruebas anteriores)

| Comprobación | Cómo | Resultado |
|---|---|---|
| La frase de la portada ya no aparece | texto visible de la portada en 5 anchos | aprobado |
| No aparece «BIENVENIDO A TU NEGOCIO» ni su banner | al empezar cada modalidad | aprobado |
| No aparece «Fernando» en la aplicación | texto visible de cada pantalla durante 4 meses en las 3 modalidades: inicio del mes, decisiones, resultados, cierres, Finanzas y Progreso (más de 15 pantallas por modalidad); además la portada y la presentación | aprobado |
| Partida nueva en cada modalidad, varios meses y cierres | `v5.e2e.js`, `navegador.e2e.js`, partidas completas | aprobado |
| Compras, ventas, gastos, inventario y retiros | `motor.test.js`, `navegador.e2e.js` | aprobado |
| Animaciones que responden al desempeño real | mismas condiciones con más clientes → favorable; precio que espanta → desfavorable; caja en rojo → crítico; cambia la velocidad y la etiqueta | aprobado |
| Escritorio y celular | 360, 390, 412, 768 y 1280 px; partidas completas en 1280 | aprobado |
| Movimiento reducido | emulación de «reducir movimiento»: 0 animaciones en curso | aprobado |
| Animación después de cargar una partida | guardar → restaurar → animaciones en curso | aprobado |

### 3.3 Financieras de Comida rápida
- Ventas = platos × Bs 15; ingredientes = platos × Bs 5,10; envases = platos × Bs 0,60; gastos Bs 650; depreciación = 4.200 ÷ 96 + 800 ÷ 48.
- Resultado = ventas − ingredientes − mermas − envases − gastos − depreciación (sin impuesto RTS).
- Compra de ingredientes = venta esperada × 1,05, sin faltantes con la caja inicial.
- Inventario inicial + compras − costo de lo vendido − mermas = inventario final en cada cierre.
- Los retiros bajan la caja y el patrimonio, pero no los gastos ni el resultado.
- El balance cuadra después de cada paso: 90 partidas con retiros y 1.512 de la regresión.
- Partidas automáticas y situaciones extremas: retirar toda la caja, precio +70 %, 60 partidas al azar.

### 3.4 Visuales (capturas en `docs/capturas/`, generadas con esta versión)

| Captura | Muestra |
|---|---|
| `01-portada-movil-390.png`, `01-portada-escritorio-1280.png` | portada sin los textos eliminados y con las tres tarjetas |
| `02-presentacion-comida-movil-390.png` | Comida rápida con los parámetros corregidos (supuestos desplegados) |
| `03-simulacion-comida-movil-390.png` | inicio de la partida sin el bloque de bienvenida |
| `11-estado-favorable-comida-movil-390.png` | ilustración en estado favorable |
| `12-estado-desfavorable-comida-movil-390.png` | ilustración en estado desfavorable |
| `13-estado-critico-delivery-movil-390.png` | ilustración en estado crítico (vehículos detenidos) |
| `04` a `10` | resultado de decisión, cierre de mes, finanzas, progreso y escritorio |

Las animaciones se comprobaron en el navegador midiendo las animaciones en curso; una captura no puede mostrar el movimiento.

### 3.5 Pruebas no ejecutadas
- No se probó con usuarios reales.
- No se probó en teléfonos físicos ni en Safari; solo en Chromium con emulación de pantalla.
- No se midió el rendimiento en teléfonos de baja potencia. Las animaciones usan solo posición y opacidad, y hay 86 en curso en el peor caso (15 escenas a la vez).

## 3.6 Error encontrado al revisar las capturas
- El indicador «Capacidad de reposición de insumos» mostraba 3.396 semanas cuando la demanda caía a cero (dividía entre casi nada). Ahora usa como mínimo la compra semanal normal del inicio: con o sin demanda, la caja inicial alcanza para ≈ 6,4 semanas. Mismo arreglo en Venta de productos.

## 4. Extracción limpia
El ZIP se descomprimió en una carpeta nueva y desde ahí se ejecutaron `npm test`, `navegador.e2e.js` y `v5.e2e.js`, y el servidor arrancó sirviendo la página, el motor, el logo, el ícono y el manifiesto (resultados en §3.1).

## 5. Pendientes
1. **Riesgo de Comida rápida tras la corrección**: con jugadas al azar casi nunca termina «en riesgo» (2,4 %). El riesgo ahora viene sobre todo de los retiros personales, los precios y las decisiones costosas. Conviene revisarlo con docentes; se puede reducir la caja inicial o subir la demanda mínima para sostener el carrito.
2. **«Empresa pequeña pero muy rentable» casi no aparece en Comida rápida (0,2 %)**: el umbral exige mejorar 2 puntos el margen inicial, que ya es alto (52 %). Ajustarlo cambia una regla compartida, por eso no se tocó.
3. Los precios de insumos y gastos son supuestos sin fuente verificada; sería ideal reemplazarlos por un relevamiento local.
4. Conductores y repartidores activos en Taxi y delivery: siguen pendientes (falta una variable en el motor).
5. Pruebas con estudiantes y docentes, en teléfonos físicos y en Safari.
6. Las partidas guardadas con la V4 (5 años) se pueden ver pero no continuar.
7. La documentación histórica (informes V3 y V4, matriz de decisiones) conserva el nombre del caso de referencia; no forma parte de la aplicación.
