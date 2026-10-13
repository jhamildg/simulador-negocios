# Informe de auditoría contable y tributaria — Simulador de Negocios V5.2

**Versión auditada**: V5.1 (la entregada en la ronda anterior). **Versión resultante**: V5.2, una revisión de la V5. No es una V6.
**Fecha**: octubre de 2026.
**Alcance**:

- Las 25 situaciones que pueden salir en una partida (35 decisiones y 13 eventos posibles, 174 opciones).
- La lógica del personal.
- El estado de resultados y el cierre mensual.
- Los impuestos de las tres modalidades.
- El balance y el flujo de caja.

**Método**: se leyó el código del motor (`frontend/motor.js`) línea por línea. Las fórmulas se probaron con partidas automáticas. Las reglas tributarias se contrastaron con los textos oficiales disponibles en línea. Cada hallazgo indica qué se cambió y qué prueba lo demuestra.

> **Advertencia**: el simulador es un modelo educativo. Sus importes de impuestos son estimaciones del juego, no una liquidación ni una declaración tributaria. Que las sumas cuadren no prueba que el tratamiento tributario sea completo. Este informe dice expresamente qué está verificado con la norma, qué es una simplificación y qué no se modela.

---

## 1. Resumen de hallazgos

| # | Área | Hallazgo en la V5.1 | Gravedad | Corrección en la V5.2 | Prueba |
|---|---|---|---|---|---|
| 1 | Impuestos (RTS) | La cuota bimestral se cargaba entera en los meses pares, en el mismo mes en que se pagaba. No había gasto devengado en los meses impares ni deuda tributaria. | Media | La cuota se fija al empezar cada bimestre. La mitad se reconoce cada mes como gasto y como pasivo («cuota del RTS por pagar»). Se paga al cerrar el primer mes del bimestre siguiente, porque vence el día 10 del mes siguiente. El pago baja la caja y cancela el pasivo sin volver a registrar el gasto. | `motor.test.js`, `auditoria.test.js` (escenario «obligación pagada») |
| 2 | Impuestos (RTS) | Al superar un límite, el negocio pasaba al régimen general **desde el mes siguiente**. Además, el límite de ventas se medía con «ventas del mes × 12». | Media | El DS 24484 (art. 13) dice que, si al 31 de diciembre no se cumplen los requisitos, el cambio rige desde el 1 de enero siguiente. Ahora se suman las ventas reales del año. Si se supera un límite (Bs 184.000 de ventas, Bs 60.000 de capital o Bs 148 por plato), el juego avisa que el cambio rige desde la gestión siguiente y mantiene el RTS hasta el mes 12. | `auditoria.test.js` |
| 3 | Impuestos (RTS) | El texto decía que con capital de hasta Bs 12.000 «no paga cuota». | Baja (texto) | En realidad queda **excluido** del régimen (DS 27924 art. 2 num. 5). Se corrigió el texto en los supuestos, el detalle y el glosario. | `auditoria.test.js` |
| 4 | Impuestos (IUE) | Las multas se restaban como gasto deducible para el IUE. | Media | Las multas siguen siendo gasto del resultado, pero no se deducen: la base del IUE es la utilidad acumulada más las multas. La multa por errores en las declaraciones es una multa tributaria (DS 24051 art. 14, modificado por el DS 29512). La multa ambiental se trata igual: es un supuesto prudente del simulador. | `auditoria.test.js` |
| 5 | Impuestos (IVA e IT) | No se calculan, y la aplicación solo lo decía en una nota. | Media (transparencia) | No se agregaron, para no cambiar el modelo sin pedido; quedan pendientes. El detalle contable los muestra como «No modelado», con la tasa, la base y, en el caso del IT, el importe de referencia que no se incluye. | `detalle.e2e.js` |
| 6 | Personal | Venta de productos pagaba Bs 2.500 al mes por persona, menos que el salario mínimo (Bs 2.750 en 2025 y Bs 3.300 en 2026). | Alta | Sueldo de Bs 3.300 (DS 5516) y 1,5 jornadas. | `auditoria.test.js` |
| 7 | Personal | El costo laboral era solo el sueldo: no incluía aportes patronales ni aguinaldo. | Alta | Ahora el costo laboral es sueldo + aportes patronales (17,21 %) + provisión de aguinaldo (1/12). El aguinaldo es una deuda («aguinaldo por pagar») que se paga al cerrar el mes 12. Taxi y delivery pasa de 5 a 4 personas, con el mismo sueldo de Bs 3.500, para mantener un costo laboral parecido (Bs 17.576 al mes contra Bs 17.500). | `auditoria.test.js` |
| 8 | Personal | Los bonos, las horas extra y los aumentos se sumaban a los **gastos operativos**. | Media (clasificación) | Pasan a gasto de personal, con sus cargas, y se ajustan en proporción si hay despidos. | `auditoria.test.js` |
| 9 | Personal | Contratar ayuda daba más clientes (+3 % de impulso comercial) aunque la capacidad alcanzara. | Media | Ahora solo da impulso comercial si la demanda ya usaba al menos el 90 % de la capacidad. Si no, la ayuda mejora la atención y el mensaje lo explica. | `auditoria.test.js` |
| 10 | Personal | En Comida rápida aparecían «tu ayudante», «tu equipo» u «horas extra» sin que hubiera empleados. | Alta (coherencia) | Textos según el estado del negocio. El conflicto laboral no puede salir si no hay ayudante. Alargar tu propia jornada no cobra horas extra. | `auditoria.test.js`, `detalle.e2e.js` |
| 11 | Venta de activos | Se podía «vender equipos» sin tener ninguno registrado (Taxi y delivery, Venta de productos), y esa venta generaba dinero y ganancia de la nada. | Alta | Solo se puede vender lo registrado, a no más del 10 % sobre su valor en libros. Si no hay equipos, la opción avisa en pantalla que no generaría dinero. | `auditoria.test.js`, `v5.e2e.js` |
| 12 | Gastos financieros | La comisión del crédito de emergencia caía en «gastos por decisiones» cuando el crédito se pedía al empezar el cierre, y en «intereses» cuando se pedía al final. | Baja (clasificación) | En ambos casos va a «comisión del crédito de emergencia», dentro de los gastos financieros. | `auditoria.test.js` |
| 13 | Tributos municipales | El evento «Cambio en impuestos» subía los gastos operativos. | Baja (clasificación) | Pasa a «patentes y tasas municipales», en una línea propia. El permiso municipal de Comida (Bs 100) se muestra en esa línea. | `auditoria.test.js` |
| 14 | Estado de resultados | En el historial, «gastos fijos» mezclaba gastos operativos, sueldos e innovación. | Baja | Cada mes cerrado guarda por separado: gastos operativos, tasas, innovación, sueldos, aportes, aguinaldo, comisión, partidas por decisión, provisión o cuota, pagos, flujo de caja y balance. | `auditoria.test.js` |
| 15 | Reparto de utilidades | Sin socios, el redondeo dejaba hasta Bs 0,005 como «pagado a socios». | Muy baja | Sin socios, todo va al dueño. | flujo de caja con diferencia 0 |

**Cosas que estaban bien y se confirmaron:**

- Ventas = unidades realmente vendidas × precio.
- Costo de lo vendido por costo promedio ponderado.
- Las compras de inventario no se registran como gasto.
- La depreciación no sale de la caja.
- Los intereses se calculan una sola vez y aparte de la amortización.
- Las inversiones van al activo fijo.
- Los retiros del dueño no son gastos.
- El balance cuadra después de cada paso.
- Guardar y continuar da el mismo resultado.

## 2. Estado de resultados

### 2.1 Conceptos y momento de registro (las tres modalidades)

| Concepto | Delivery | Productos | Comida | Fórmula en el motor | Cuándo se registra |
|---|---|---|---|---|---|
| Ventas | Comisiones | Sí | Sí | unidades vendidas × precio | Al cerrar el mes |
| Costo de lo vendido | — | Sí | Ingredientes | unidades × costo promedio ponderado | Al vender (cierre) |
| Mermas | — | 1 % de lo que sobra | 50 % de lo que sobra | sobrante × tasa × costo promedio | Al cierre |
| Costos variables no inventariables | Incentivos, pasarela y soporte | Envío y comisión de pago | Envases | unidades × costo × eficiencia | Al cierre |
| Gastos operativos | Oficina, servidores | Plataforma, depósito | Gas, transporte, agua… | gastos anuales ÷ 12 | Cada mes |
| Patentes y tasas municipales | Solo si las sube un evento | Solo si las sube un evento | Bs 100 de permiso | tasas anuales ÷ 12 | Cada mes |
| Innovación | Sí | Sí | Solo la agregada | 7 % × ventas × innovación ÷ 100 | Cada mes |
| Sueldos | 4 personas | 1,5 jornadas | Solo ayuda contratada | personas × sueldo + bonos | Cada mes |
| Aportes patronales | Sí | Sí | Si hay ayuda | 17,21 % de los sueldos | Cada mes (pagados) |
| Aguinaldo | Sí | Sí | Si hay ayuda | 1/12 de los sueldos | Provisión mensual, pago en el mes 12 |
| Depreciación | Si invierte | Si invierte | Carrito y utensilios | costo ÷ vida útil (DS 24051) | Cada mes (no es pago) |
| Intereses | Si hay deuda | Si hay deuda | Si hay deuda | deuda × tasa ÷ 12 | Cada mes |
| Comisión de emergencia | Si la hay | Si la hay | Si la hay | 10 % del crédito | Al cierre |
| Ingresos financieros | Caja > 10 % de las ventas anuales | Ídem | Ídem | caja × 3 % ÷ 12 | Cada mes |
| Ingresos y gastos por decisiones | Sí | Sí | Sí | lista de partidas | En el mes de la decisión |
| Impuesto | Provisión del IUE | Provisión del IUE | Cuota del RTS (mitad por mes) | ver §4 | Cada mes |

### 2.2 Identidad comprobada

Resultado antes de impuestos = ventas − costo de lo vendido − mermas − costos variables − innovación − personal − gastos operativos − tasas − depreciación − intereses − comisión + ingresos financieros + ingresos por decisiones − gastos por decisiones.

Resultado = resultado antes de impuestos − impuesto reconocido.

**Prueba**: `auditoria.test.js` recalcula la fórmula en cada mes cerrado de partidas completas de las tres modalidades. La diferencia es siempre menor a Bs 0,01.

### 2.3 Lo que NO es gasto (y cómo se registra)

- **Compra de inventario**: activo. Pasa al resultado cuando se vende o se pierde.
- **Inversión en equipos o sistemas**: activo fijo que se deprecia en 8 o 4 años.
- **Retiro del dueño**: baja la caja y el patrimonio, sin pasar por el resultado. Es lo mismo cuando el dueño se lleva utilidades.
- **Pago de capital de la deuda**: baja la caja y la deuda.
- **Pago de la cuota del RTS o del aguinaldo**: cancela un pasivo que ya se había reconocido como gasto.

## 3. Cierre mensual

| Comprobación | Resultado | Cómo se comprobó |
|---|---|---|
| Ventas y gastos sin duplicar | Cada movimiento se registra una sola vez: en la decisión o en el cierre | Identidad del flujo de caja en 1.439 meses |
| Saldos iniciales | La caja inicial del mes es la caja final del mes anterior; los retiros hechos después del cierre cuentan en el mes siguiente | `auditoria.test.js` |
| Inventario actualizado | inventario inicial + compras − costo de lo vendido − mermas = inventario final | `motor.test.js` |
| Compras pendientes y proveedores por pagar | El plazo del proveedor y la venta a crédito son **saldos rotativos**: representan el financiamiento permanente que da un cliente o proveedor habitual y no se cancelan dentro del año. Es una simplificación documentada. | revisión del código |
| Intereses una sola vez | Se calculan sobre la deuda al empezar el cierre, antes de amortizar | revisión y `motor.test.js` |
| Impuestos sin repetir | IUE: provisión acumulada − lo ya provisionado. RTS: la mitad de la cuota del bimestre por mes; el pago no genera otro gasto. | `auditoria.test.js` |
| Pérdidas | Un mes con pérdida reduce el resultado acumulado y, en el régimen general, la provisión del IUE, que nunca queda negativa | `motor.test.js` |
| Guardar y continuar | Resultados idénticos a una partida sin interrupción en las tres modalidades | `auditoria.test.js`, `detalle.e2e.js` |
| Flujo de caja | caja inicial + cobros − pagos ± decisiones − retiros = caja final, en cada mes | 1.439 meses: diferencia máxima 2,9 × 10⁻¹¹ |
| Balance | Activo = Pasivo + Patrimonio en cada paso | 1.512 partidas: diferencia máxima 1,75 × 10⁻¹⁰ |

## 4. Impuestos

### 4.1 Fuentes consultadas (octubre de 2026)

| Norma | Qué se verificó | Estado |
|---|---|---|
| DS 24484 (1997), [LexiVox](https://www.lexivox.org/norms/BO-DS-24484.html) | Art. 1: la cuota consolida IVA, IT e IUE. Art. 3: el capital es activo circulante (mercaderías) + activo fijo, y no se distingue entre capital propio y ajeno. Art. 13: si al 31 de diciembre no se cumplen los requisitos, desde el 1 de enero siguiente rige el régimen general. Art. 19: seis cuotas bimestrales que vencen el día 10 de marzo, mayo, julio, septiembre, noviembre y enero. | Verificado (texto original) |
| DS 27924 (2004), [LexiVox](https://www.lexivox.org/norms/BO-DS-27924.html) | Exclusión con capital de hasta Bs 12.000 (antes Bs 5.000). Precio unitario máximo: Bs 148 para vivanderos y Bs 480 para comerciantes minoristas. Categorías 1 a 5 (47, 90, 147, 158 y 200). | Verificado |
| DS 3698 (2018, vigente desde 2019), [LexiVox](https://www.lexivox.org/norms/BO-DS-N3698.html) | Capital máximo Bs 60.000. Ventas anuales máximas Bs 184.000. Tabla completa con la categoría 6 (37.001–60.000 → Bs 350). La forma de pago la reglamenta el SIN. | Verificado |
| Ley 1733 (27/05/2026), [SIN](https://www.impuestos.gob.bo/wp-content/uploads/2026/05/L17332051NCPP.pdf) | No modifica el RTS. Cambia la base del IVA: el precio neto es el valor antes de impuestos. | Verificado por la investigación de esta ronda |
| SIN, semanario de marzo de 2026 | El RTS «continuará vigente»; el «Régimen Tributario Especial» seguía en proyecto | Verificado por la investigación de esta ronda; no se encontró una norma que lo apruebe hasta octubre de 2026 |
| Ley 843, Título III; [guía del IUE del SIN](https://www.impuestos.gob.bo/wp-content/uploads/2025/10/iue.pdf) | IUE del 25 % sobre la utilidad neta. Cierre de gestión el 31 de diciembre para comercio y servicios. | Verificado |
| DS 24051 art. 39 | El IUE vence a los 120 días del cierre de la gestión | Solo fuente secundaria |
| Ley 169 (vía RND 10-0008-13) | Compensación de pérdidas de gestiones anteriores, hasta 3 años | Verificado; **no se modela** (la partida dura una gestión) |
| DS 24051 art. 14 (modificado por DS 29512) | «No son deducibles las sanciones y las multas originadas en la morosidad de estos tributos» | Solo fuente secundaria ([boliviaimpuestos.com](https://boliviaimpuestos.com/b/3wv)). Aplicarlo también a la multa ambiental es un supuesto del simulador. |
| DS 5516 (2026) | Salario mínimo nacional de Bs 3.300 | Verificado (copia de la Gaceta Oficial y varias fuentes) |
| Ley 1582 (2024) | Aporte patronal solidario del 3,5 % | Verificado |
| CNS 10 %, riesgo profesional 1,71 %, pro vivienda 2 %, aguinaldo de un sueldo | Cargas patronales | Solo fuentes secundarias de planillas |

### 4.2 Régimen general: Taxi y delivery, y Venta de productos

| Concepto | Regla aplicada | Momento de registro | Efecto en el resultado | Efecto en caja | Estado de la verificación |
|---|---|---|---|---|---|
| IUE | 25 % × máx(0; utilidad acumulada de la gestión + multas no deducibles) − provisión anterior | Cada cierre mensual (provisión) | Gasto del mes; un mes con pérdida reduce la provisión | Ninguno dentro de la partida: se paga dentro de los 120 días posteriores al cierre de la gestión. Queda como «IUE por pagar». | Tasa y base: verificadas con la Ley 843. Plazo: fuente secundaria. **Simplificaciones**: utilidad contable = utilidad imponible (sin otros ajustes) y sin compensación de pérdidas de años anteriores. |
| IT | 3 % de los ingresos brutos | **No se registra** | Ninguno: el detalle muestra el importe de referencia y aclara que no está incluido | Ninguno | Tasa: solo fuente secundaria. **No modelado.** |
| IVA | 13 % (débito − crédito fiscal) | **No se registra** | Ninguno: los precios y costos se tratan como netos (coherente con el precio neto de la Ley 1733) | No se simula el desfase de caja | Tasa: solo fuente secundaria. **No modelado.** |
| Patentes y tasas municipales | Importe fijo anual ÷ 12, solo si un evento las sube | Cada mes | Gasto operativo («patentes y tasas») | Pago en el mismo mes | Supuesto del simulador |
| Aportes patronales | 17,21 % de los sueldos | Cada mes | Gasto de personal | Pago en el mismo mes (simplificación: en la realidad se pagan el mes siguiente) | CNS, riesgo y vivienda: fuente secundaria. Solidario 3,5 %: verificado. |
| Aguinaldo | 1/12 de los sueldos | Provisión mensual | Gasto de personal | Se paga al cerrar el mes 12 y cancela la provisión | Un sueldo al año: fuente secundaria |

### 4.3 Régimen Tributario Simplificado: Comida rápida

| Concepto | Regla aplicada | Momento de registro | Efecto en el resultado | Efecto en caja | Estado de la verificación |
|---|---|---|---|---|---|
| Categoría y cuota | Capital = inventario de ingredientes + equipos netos (sin efectivo). ≤ Bs 12.000: excluido, cuota 0. 12.001–15.000: Bs 47; …; 37.001–60.000: Bs 350 por bimestre. | Se fija al empezar cada bimestre (meses 1, 3, 5, 7, 9 y 11) | La mitad de la cuota como gasto cada mes | Ninguno en el mes del gasto | Tabla, exclusión y límites: **verificados** (DS 27924 y DS 3698). Recalcular la categoría cada bimestre y valuar el equipo al valor en libros (no al valor de mercado menos depreciación del art. 3) son **simplificaciones**. |
| Pago de la cuota | Cuota del bimestre anterior | Al cerrar el primer mes del bimestre siguiente | Ninguno (cancela el pasivo) | Baja la caja | Periodicidad bimestral y vencimiento el día 10 del mes siguiente: verificados con el texto original (art. 19). El DS 3698 delegó la forma de pago al SIN. |
| Cuota pendiente | Cuota del RTS por pagar | Al cierre | — | — | En el balance y en el detalle |
| Límites del régimen | Ventas acumuladas del año > Bs 184.000, capital > Bs 60.000 o precio por plato > Bs 148 | Al cierre en que se supera | Aviso: el régimen general rige desde la gestión siguiente. En la partida sigue el RTS. | — | Verificados (DS 24484 art. 13; DS 27924; DS 3698) |
| IVA, IT e IUE | Incluidos en la cuota | — | — | — | Verificado (DS 24484 art. 1) |
| Patentes y tasas (permiso de venta, Bs 100) | Importe fijo mensual | Cada mes | Gasto | Pago en el mes | Supuesto del simulador |

Con los datos iniciales (capital ≈ Bs 5.100), el carrito está excluido del RTS y no paga cuota. Si compra equipos y su capital pasa de Bs 12.000, paga la cuota que corresponda.

### 4.4 Distinciones que el detalle contable muestra

- **Impuesto calculado sobre resultados**: el IUE.
- **Obligación que depende de otro parámetro**: la cuota del RTS, que depende del capital.
- **Provisión contable**: el gasto reconocido en el mes.
- **Impuesto pagado**: la salida de caja, que solo ocurre en el RTS dentro de la partida.
- **Pasivo pendiente**: el IUE por pagar y la cuota del RTS por pagar.

## 5. Personal: revisión completa

| Situación | Modalidad | Personal inicial | Problema encontrado | Corrección realizada | Prueba |
|---|---|---|---|---|---|
| Estado inicial | Comida | Dueño solo (1 = el dueño; sin sueldo) | Ninguno en la lógica: el sueldo se calcula sobre emp − 1. La referencia salarial era la de 2025. | Referencia: salario mínimo 2026 (Bs 3.300) más cargas | `auditoria.test.js`: sin sueldos, aportes ni aguinaldo al inicio |
| Estado inicial | Productos | 2 × Bs 2.500 | Sueldo menor al salario mínimo y sin cargas | 1,5 jornadas × Bs 3.300 + cargas | `auditoria.test.js` |
| Estado inicial | Delivery | 5 × Bs 3.500 | Sin cargas sociales | 4 × Bs 3.500 + cargas (costo total parecido) | `auditoria.test.js` |
| Contratación (falta de capacidad en horas pico) | Las tres | — | Daba más clientes aunque sobrara capacidad | El impulso comercial solo aparece si se usaba ≥ 90 % de la capacidad; si no, el mensaje lo explica | `auditoria.test.js` (dos escenarios) |
| Contratación | Comida | Dueño solo | «Horas punta»; no aclaraba cuánto se contrata | «Horas pico», 20 % y 10 % de jornada dichos en la opción; texto distinto si ya hay ayuda | `auditoria.test.js`, `detalle.e2e.js` |
| Falta de personal | Comida | Dueño solo | Decía «tu equipo es el cuello de botella» y cobraba horas extra sin empleados | Texto: «trabajas solo: la demanda que podrías atender supera lo que tus manos alcanzan». Opciones: ayuda por horas, alargar tu jornada (sin pago), equipos para preparar por adelantado (inversión). | `auditoria.test.js` |
| Falta de personal | Delivery y Productos | Equipo | Horas extra como gasto operativo | Horas extra como gasto de personal | `auditoria.test.js` |
| Mensaje de cierre por falta de capacidad | Comida | — | «Una sola persona» aunque hubiera ayuda | Mensaje según haya o no ayuda contratada; propone contratar o moderar pedidos | `auditoria.test.js` (7.199 mensajes) |
| Aviso de situación actual | Las tres | — | «Te faltan manos» sin distinguir | «La demanda supera tu capacidad para atender a los clientes trabajando solo. Debes decidir si contratas ayuda o limitas temporalmente los pedidos.» | `detalle.e2e.js` (recorrido) |
| Conflicto laboral (evento) | Comida | Dueño solo | Podía aparecer «tu ayudante» sin ayudante | Peso 0 sin ayuda contratada; con ayuda, texto propio | `auditoria.test.js` (40 partidas) |
| Segundo carrito | Comida | — | Sumaba 30 % de jornada para atender otro carrito | Suma un vendedor a medio tiempo (0,5 jornada), dicho en la opción | `auditoria.test.js` |
| Préstamo para ampliar, feria en otra ciudad, ampliar y contratar | Comida | — | Agregaban personal sin decirlo | La opción dice «y contratar ayuda por horas» | revisión de textos |
| Atención por WhatsApp | Comida | — | — | Se aclara que es «por horas» | revisión de textos |
| Bonos, aumentos, igualar oferta, horas extra | Delivery y Productos (y Comida con ayuda) | — | Se registraban como gasto operativo | Gasto de personal con cargas | `auditoria.test.js` |
| Despidos (reestructurar) | Delivery y Productos | Equipo | Los bonos no bajaban con el personal | Bonos y aumentos bajan en la misma proporción | `auditoria.test.js` |
| «Tu mejor gerente», «profesionalizar las gerencias» | Productos (1,5 jornadas) y Delivery (4 personas) | Equipo pequeño | Estructura gerencial que no existe | «Tu empleado con más experiencia»; «Contratar asesoría externa de gestión» (servicio, gasto operativo) | `auditoria.test.js` |
| Capacitación, rotación, gerente, reestructuración, fondo, compra de competidor | Comida | — | — | Siguen excluidas en Comida | sin cambios |

**Comprobaciones generales**:

- No se cobran sueldos de personas que no existen.
- Contratar no incorpora a la persona dos veces.
- Toda contratación tiene su costo (sueldo, aportes y aguinaldo).
- Los despidos bajan los sueldos.

**Limitación**: no se modelan la indemnización ni el desahucio de los despidos. El simulador no lleva la antigüedad de cada trabajador.

## 6. Pendientes de esta auditoría

1. IVA e IT no se calculan; el detalle contable lo dice. Modelarlos cambiaría el margen de todas las modalidades de régimen general y requiere recalibrar.
2. No se modelan la compensación de pérdidas de años anteriores ni otros ajustes de la utilidad imponible.
3. En la partida no vence el IUE: queda como pasivo al terminar.
4. RTS:
   - la categoría se recalcula cada bimestre;
   - los equipos se valúan al valor en libros;
   - la gestión de la partida no coincide necesariamente con el año calendario.
5. Los aportes patronales se pagan en el mismo mes (en la realidad, el mes siguiente). No hay indemnizaciones ni desahucio.
6. Los saldos de cuentas por cobrar y por pagar son rotativos: no se cobran ni se pagan dentro del año.
7. Las tasas de la CNS, el riesgo profesional y la vivienda, y la regla del aguinaldo, se tomaron de fuentes secundarias. Conviene que un docente o contador las confirme.
8. Efecto de las correcciones en el juego (regresión de 1.512 partidas):
   - Venta de productos termina «en riesgo» en el 51 % de las partidas automáticas (antes 36,5 %), porque su costo laboral ahora es legal y completo.
   - Comida rápida pasa de 2,4 % a 15,3 %, porque contratar ayuda ahora cuesta lo que corresponde.
   - No se bajaron otros costos para compensar. Si se quiere otra dificultad, hay que revisar los supuestos de gastos fijos con datos o con un docente.
