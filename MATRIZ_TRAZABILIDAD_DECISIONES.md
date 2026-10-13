# Matriz de trazabilidad de decisiones — Simulador de Negocios V5.2

Generada automáticamente desde `frontend/motor.js` (arreglos `D` y `EV`, tabla contable `CONT` y textos, efectos y registros propios de cada modalidad en `BIZ[...].tx`). Revisión 5.2: auditoría de textos, personal, contabilidad e impuestos. Contiene **35 decisiones** y **13 eventos**, con **174 opciones**. Cada partida usa 25: en 12 meses, 20 decisiones y 5 eventos (meses 3, 5, 7, 9 y 11). El número de decisiones por partida no cambió respecto a la V4.

## Cómo leer esta matriz

- **S** = ventas anuales de referencia de la partida: al inicio, 12 × las ventas del primer mes; luego, 12 × el promedio de los últimos 3 meses cerrados (mínimo 40 % de las iniciales).
- **Dinero de las decisiones**: en la V4 un gasto de “6 %” era el 6 % de las ventas anuales y se pagaba con cinco años de flujo. En la V5 el horizonte es de 12 meses, así que todo el dinero puntual de las decisiones (caja, préstamos, pagos de deuda) se multiplica por **0,2** (supuesto de calibración documentado en el informe). En esta matriz ya se muestra multiplicado: “caja − 0,012·S” significa 1,2 % de las ventas anuales. Los gastos fijos recurrentes no se reducen: se expresan por año y se cobran por mes.
- **Registro contable**: cada opción indica cómo se registra el dinero que mueve (gasto del mes, inversión en activo fijo con su vida útil, financiamiento, aporte, anticipo, cuentas por cobrar o por pagar, reparto de utilidades). Con este registro se cumple Activo = Pasivo + Patrimonio después de cada decisión (prueba automática).
- **Precio y demanda**: las opciones que cambian el precio ya no traen un cambio fijo de clientes. Los clientes los calcula la **regla de demanda** del motor: clientes activos = clientes al precio de referencia × máx(0; 1 − ε·(precio ÷ precio de referencia − 1)), con ε = elasticidad de la modalidad (1,4 delivery; 2,0 venta de productos; 1,6 comida) × (1,5 − (satisfacción + reputación) ÷ 200). Excepción documentada: la marca económica de *segundaMarca* suma clientes de un segmento nuevo.
- **Modalidad**: las decisiones sirven para las tres modalidades salvo las excluidas en Comida rápida (estructura, talento, fondo, adquisicion, capacitar, rotacion), que no tienen sentido para un carrito sin empleados. Donde una modalidad usa un texto, un efecto o un registro contable propio, se indica debajo de la opción (Comida rápida o Taxi y delivery). Ningún texto menciona directorio, junta o gerencias, y ninguno supone empleados cuando el dueño trabaja solo (prueba automática en `auditoria.test.js`).
- **Categorías**: **A** regla contable o financiera (se cumple por definición); **B** mecanismo económico (la dirección se apoya en principios generales, la magnitud no); **C** supuesto pedagógico pendiente de validación (magnitudes, probabilidades, puntos, retrasos).
- **Competencia**: correspondencia propuesta con las áreas del marco de la Comisión Europea y OECD-INFE (2022). No es una evaluación validada.
- **Pruebas**: `backend/test/v5.e2e.js` aplica las opciones de las tres modalidades (con sus efectos propios) y comprueba que cada variable se mueve en la dirección documentada y que el balance sigue cuadrando; `backend/test/motor.test.js` prueba la regla de demanda, el inventario, los impuestos y el registro contable; `backend/test/auditoria.test.js` revisa los textos, el personal, las provisiones y el detalle contable; `backend/test/regresion.sim.js` juega 1.512 partidas completas.

## Reglas comunes (cierre de cada mes)

| ID | Regla | Fórmula | Categoría | Prueba |
|---|---|---|---|---|
| R1 | Ventas del mes | unidades = mín(demanda del mes; capacidad del mes; insumos disponibles); ventas = unidades × precio efectivo | A + B | motor.test.js |
| R2 | Regla de demanda por precio | factor = máx(0; 1 − ε·(p ÷ p_ref − 1)), tope 1,8 | B (dirección) + C (ε) | motor.test.js |
| R3 | Inventario | inventario inicial + compras − costo de lo vendido − mermas = inventario final (costo promedio ponderado) | A | motor.test.js (identidad en cada cierre) |
| R4 | Compras por ciclos | comida 4 compras semanales; productos 2 quincenales; cada compra con la caja disponible; lo vendido financia la siguiente | C | motor.test.js |
| R5 | Mermas | merma = sobrante × tasa (comida 50 %, productos 1 %) × (1 − (productividad − 50) ÷ 200) | C | motor.test.js |
| R6 | IUE (régimen general) | provisión = 25 % × máx(0; resultado acumulado de la gestión + multas no deducibles) − lo ya provisionado; queda como pasivo y se paga dentro de los 120 días posteriores al cierre de la gestión (fuera de la partida). El IVA y el IT no se calculan (se informa en el detalle contable) | A (Ley 843; DS 24051 art. 14) | motor.test.js, auditoria.test.js |
| R7 | Régimen Tributario Simplificado (comida) | capital = inventario + activo fijo neto (sin efectivo). Hasta Bs 12.000: excluido del régimen (DS 27924). Desde Bs 12.001: cuota bimestral de la tabla del DS 3698, fijada al empezar cada bimestre; la mitad se reconoce cada mes como gasto y pasivo, y se paga al cerrar el primer mes del bimestre siguiente. Si se superan Bs 184.000 de ventas del año, Bs 60.000 de capital o Bs 148 por plato, se avisa que el régimen general rige desde la gestión siguiente (DS 24484 art. 13) | A | motor.test.js, auditoria.test.js |
| R8 | Intereses y amortización | interés = deuda × (tasa + recargo por apalancamiento, máx. 15 puntos) ÷ 12; amortización = 20 % anual ÷ 12 | A + C (recargo) | motor.test.js |
| R9 | Depreciación | costo ÷ vida útil en meses (equipos 96, computación 48; DS 24051) | A | motor.test.js |
| R10 | Crédito de emergencia y quiebra | si la caja queda en rojo: el banco cubre el faltante y un ciclo de compras con 10 % de comisión; quiebra si la deuda supera 85 % de las ventas anuales o ya hubo 3 rescates | A + C (umbrales) | regresion.sim.js |
| R11 | Retiro del propietario | caja − R; dinero personal + R; patrimonio − R; no es gasto | A | finanzas.test.js, navegador.e2e.js |
| R12 | Rendimiento de la caja | si la caja supera el 10 % de las ventas anuales: caja × 3 % ÷ 12, como ingreso financiero del resultado (en la V4 no pasaba por el resultado) | A + C (tasa) | navegador.e2e.js |
| R14 | Personal | sueldos = (personas contratadas) × sueldo mensual + bonos y aumentos; aportes patronales = 17,21 % de los sueldos; aguinaldo = 1/12 de los sueldos (provisión que se paga al cerrar el mes 12). El dueño de Comida rápida no cobra sueldo. Sueldo mínimo de referencia: Bs 3.300 (DS 5516) | A (montos legales) + C (plantilla inicial) | auditoria.test.js |
| R15 | Flujo de caja del mes | caja inicial + cobros − pagos ± decisiones − retiros del dueño = caja final (diferencia cero en cada cierre) | A | auditoria.test.js, detalle.e2e.js |
| R13 | Escena del negocio | clientes visibles = 4 × unidades del mes ÷ unidades iniciales; equipos según capacidad e inversiones; cajas según inventario | C | ilustraciones.test.js, v5.e2e.js |

## Decisiones

### D-precio1 · Precios

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3)
- **Modalidad**: las tres
- **Situación**: Tus primeros clientes dicen que tu precio es bueno. Un asesor cree que estás cobrando muy poco.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Subir el precio 8% | precio × 1,08 (+8 %) → clientes según la regla de demanda | Sin movimiento de dinero | Subir el precio mejora lo que ganas por cada venta, pero algunos clientes sensibles al precio se van. Con buena reputación se van menos. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| B. Mantener el precio | sin cambios directos | Sin movimiento de dinero | No cambiar nada conserva tu situación actual: ni ganas margen ni arriesgas clientes. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |
| C. Bajar el precio 8% para ganar mercado | precio × 0,92 (−8 %) → clientes según la regla de demanda | Sin movimiento de dinero | Un precio menor atrae clientes, pero cada venta deja menos. Solo conviene si el volumen extra compensa el margen perdido. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| D. Crear una versión básica y otra premium: 0,4 % de S | caja − 0,004·S; precio × 1,04 (+4 %) → clientes según la regla de demanda; clientes × 1,07 (+7 %); gastos operativos + 0,015·S al año (÷ 12 por mes); innovación +3 puntos (0–100) | Gasto del mes | Segmentar permite cobrar más a quien valora más, sin perder a quien busca precio. Cuesta un poco más de gestionar. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Ley de la demanda: dirección cualitativa (Mankiw, 2021) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-mkt1 · Marketing

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3)
- **Modalidad**: las tres
- **Situación**: Casi nadie te conoce fuera de tu zona. Necesitas decidir cuánto invertir en darte a conocer.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Campaña fuerte: 1,2 % de S ahora | caja − 0,012·S; impulso comercial +10 % (se realiza un 25 % por mes); reputación +3 puntos (0–100)<br>· efecto comercial × (0,5 + reputación/100)<br>· mes +3: clientes × 1,04 (+4 %)<br>· activa la marca «mktBig» (habilita decisiones o finales posteriores) | Gasto del mes | La publicidad gasta caja hoy y trae clientes durante varios meses. El riesgo es crecer más rápido de lo que puedes atender. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| B. Redes sociales propias: 0,08 % de S al mes | gastos operativos + 0,01·S al año (÷ 12 por mes); impulso comercial +4 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100) | Sin movimiento de dinero | Un gasto pequeño y constante construye audiencia de a poco, sin comprometer la caja. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| C. Programa de referidos: 0,2 % de S | caja − 0,002·S; impulso comercial +3 % (se realiza un 25 % por mes); satisfacción +3 puntos (0–100) | Gasto del mes | Premiar a quien te recomienda cuesta poco y trae clientes que ya confían en ti. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| D. No invertir todavía | impulso comercial −2 % (se realiza un 25 % por mes)<br>· mes +3: clientes × 0,97 (−3 %) | Sin movimiento de dinero | Conservas el efectivo, pero el mercado no espera: quien sí se promociona se queda con los clientes nuevos. | B+C | Decisión de crecimiento y capacidad (gestión empresarial) | La publicidad desplaza la demanda; magnitud = supuesto |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-credito · Flujo de caja

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3)
- **Modalidad**: las tres
- **Situación**: Una empresa grande quiere comprarte todos los meses, pero pagando a 60 días.<br>Comida rápida: Una oficina cercana quiere pedirte almuerzos para su personal todos los días, pero pagando a fin de mes.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Aceptar la venta a crédito<br><i>Comida: Aceptar y cobrar a fin de mes</i> | clientes × 1,06 (+6 %); caja − 0,008·S<br>· resultado incierto: probabilidad de éxito = `.6+(s.flags.sistema//s.flags.contador?.25:0)`<br>· si falla: caja − 0,006·S | Cuentas por cobrar (activo) | Vender a crédito sube las ventas, pero el dinero tarda en llegar. Mientras tanto tú sí pagas sueldos y proveedores. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Aceptar solo con 50% de adelanto<br><i>Comida: Aceptar solo con 50% de adelanto</i> | clientes × 1,03 (+3 %); caja − 0,002·S | Cuentas por cobrar (activo) | El adelanto reduce el dinero atrapado y filtra a los clientes que no piensan pagar. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Vender solo al contado<br><i>Comida: Vender solo al contado</i> | sin cambios directos | Sin movimiento de dinero | Proteges tu caja a costa de renunciar a una venta grande. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-contratar · Contratación

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3)
- **Modalidad**: las tres
- **Situación**: No das abasto: tú y tu equipo hacen de todo y los clientes empiezan a esperar.<br>Comida rápida: Atiendes solo y en las horas pico los clientes se cansan de esperar.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Ampliar el equipo 20%<br><i>Comida: Contratar un ayudante para las horas pico (20 % de una jornada)</i> | personal × 1,2 (+20 %); capacidad × 1,2 (+20 %); productividad +4 puntos (0–100); satisfacción +4 puntos (0–100)<br>· regla condicional: `c.uso0>=.9` → efecto adicional<br>· mes +3: productividad +3 puntos (0–100) | Sin movimiento de dinero | Más personal sube tu capacidad, pero también tus costos fijos: los sueldos se pagan aunque las ventas bajen. | B+C | Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Ampliar el equipo 10%<br><i>Comida: Pagar a un familiar para que ayude algunos días (10 % de una jornada)</i> | personal × 1,1 (+10 %); capacidad × 1,1 (+10 %); satisfacción +2 puntos (0–100) | Sin movimiento de dinero | Un paso prudente: amplías capacidad sin subir demasiado el punto de equilibrio. | B+C | Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Seguir igual y hacer horas extra<br><i>Comida: Seguir como estás y alargar tu jornada</i> | productividad −5 puntos (0–100); satisfacción −3 puntos (0–100)<br>· mes +3: satisfacción −4 puntos (0–100), productividad −3 puntos (0–100) | Sin movimiento de dinero | A corto plazo ahorras; a mediano plazo el cansancio baja la calidad y los clientes lo sienten. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |
| D. Tercerizar parte del trabajo<br><i>Comida: Comprar porciones ya preparadas a otro proveedor</i> | costo variable unitario × 1,04 (+4 %); capacidad × 1,15 (+15 %) | Sin movimiento de dinero | Tercerizar convierte un costo fijo en variable: pagas solo cuando vendes, pero cada venta deja menos. | B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Las ventas no pueden superar la capacidad (restricción física del modelo); Margen de contribución = precio − costo variable (Mankiw, 2021) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-proveedor1 · Compras

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3)
- **Modalidad**: las tres
- **Situación**: Los proveedores te ofrecen 8% de descuento si pagas por adelantado tus próximas compras.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Pagar por adelantado: 1,6 % de S | caja − 0,016·S; costo variable unitario × 0,92 (−8 %) | Anticipo a proveedores (activo) | Bajas tu costo por unidad, pero inmovilizas efectivo. Es buena idea solo si la caja aguanta. | A+B | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| B. Pedir 30 días de plazo en vez del descuento | caja + 0,006·S | Proveedores por pagar (pasivo) | El plazo de pago es financiamiento gratis: mejora tu caja sin endeudarte. | A | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Buscar un segundo proveedor | caja − 0,001·S; costo variable unitario × 0,97 (−3 %)<br>· activa la marca «dosProv» (habilita decisiones o finales posteriores) | Gasto del mes | Tener dos proveedores te da poder de negociación y te protege si uno falla. | A+B | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| D. Seguir como estás | sin cambios directos | Sin movimiento de dinero | No cambias nada: ni ahorras ni te expones. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-control · Finanzas

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3)
- **Modalidad**: las tres
- **Situación**: Llevas las cuentas en un cuaderno y no sabes con exactitud cuánto ganas.<br>Comida rápida: Llevas las cuentas del carrito en un cuaderno y no sabes con exactitud cuánto ganas.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Comprar un sistema de ventas y contabilidad: 0,4 % de S | caja − 0,004·S; productividad +6 puntos (0–100); innovación +5 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad<br>· mes +3: gastos operativos − 0,01·S al año (÷ 12 por mes)<br>· activa la marca «sistema» (habilita decisiones o finales posteriores) | Inversión: sistemas (4 años) | Saber tus números reales permite detectar fugas y decidir con datos en vez de intuición. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Contratar un contador externo: 0,1 % de S al mes | gastos operativos + 0,012·S al año (÷ 12 por mes); productividad +4 puntos (0–100)<br>· activa la marca «contador» (habilita decisiones o finales posteriores) | Sin movimiento de dinero | Un contador ordena tus obligaciones y evita multas, a cambio de un gasto fijo. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Armar una planilla de Excel | productividad +2 puntos (0–100) | Sin movimiento de dinero | Es mejor que nada y no cuesta, pero depende de que la actualices con disciplina. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |
| D. Seguir con el cuaderno | sin cambios directos<br>· mes +3: caja − 0,004·S, reputación −2 puntos (0–100)<br>· activa la marca «sinControl» (habilita decisiones o finales posteriores) | Sin movimiento de dinero | Sin registros confiables, los problemas se descubren tarde. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-ventasCaen · Ventas

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres
- **Situación**: Las ventas de los últimos meses bajaron 12%. Tienes que decidir cómo responder.
- **Golpe previo (antes de elegir)**: `({e:{cust:-.04},t:'Ya perdiste parte de tus {c} este trimestre.'})`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Aumentar la publicidad: 0,8 % de S | caja − 0,008·S; impulso comercial +7 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100) | Gasto del mes | La publicidad recupera clientes si el problema era visibilidad. Si el problema es el producto, solo acelera el gasto. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| B. Reducir los precios 7% | precio × 0,93 (−7 %) → clientes según la regla de demanda | Sin movimiento de dinero | Bajar precios recupera volumen rápido, pero es difícil volver a subirlos después. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Lanzar un producto nuevo: 1,4 % de S | caja − 0,014·S; innovación +10 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad<br>· resultado incierto: probabilidad de éxito = `.4+s.inno/200`<br>· si falla: clientes × 1,02 (+2 %)<br>· si sale bien: clientes × 1,16 (+16 %), precio × 1,03 (+3 %) → clientes según la regla de demanda | Gasto del mes | Un producto nuevo puede reactivar la demanda, pero su éxito no está garantizado. Las empresas más innovadoras aciertan más seguido. | A+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. Reducir gastos operativos<br><i>Comida: Reducir gastos del carrito</i> | gastos operativos − 0,03·S al año (÷ 12 por mes); satisfacción −3 puntos (0–100); productividad −2 puntos (0–100) | Sin movimiento de dinero | Recortar protege la utilidad hoy, pero no ataca la causa de la caída y puede dañar el servicio. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-prestamo · Endeudamiento

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres
- **Situación**: El banco te ofrece un préstamo de 5 % de S para crecer.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Tomarlo todo y ampliar la capacidad<br><i>Comida: Tomarlo todo: ampliar el carrito y contratar ayuda por horas</i> | deuda + 0,05·S; caja + 0,016·S; capacidad × 1,3 (+30 %); personal × 1,2 (+20 %); impulso comercial +5 % (se realiza un 25 % por mes)<br>· regla condicional: `met(s).risk>40` → efecto adicional<br>· activa la marca «prestamo» (habilita decisiones o finales posteriores) | Inversión: activo fijo (8 años) | El préstamo te da capacidad para vender más, pero pagarás intereses y capital cada mes. Si las ventas no crecen, la deuda pesa. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto; Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Tomar la mitad como colchón de caja | deuda + 0,024·S; caja + 0,024·S | Financiamiento (deuda) | Tener reserva te protege en una crisis, aunque pagar intereses por dinero quieto tiene un costo. | A | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Buscar un socio en lugar del banco | caja + 0,04·S; participación del dueño × 0,8<br>· mes +6: caja − 0,01·S<br>· activa la marca «socio» (habilita decisiones o finales posteriores) | Aporte de capital | Un socio no cobra intereses, pero comparte las ganancias futuras y opina en las decisiones. | A+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Dilución de la propiedad al entrar un socio (regla financiera) |
| D. No endeudarse | sin cambios directos | Sin movimiento de dinero | Creces más lento, pero sin compromisos fijos con el banco. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-inventario · Inventarios

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres
- **Situación**: En las horas y fechas de más demanda no alcanzas a atender y pierdes ventas.<br>Comida rápida: En las horas de más gente se te acaban las porciones preparadas y pierdes ventas.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Ampliar el inventario: 1,2 % de S<br><i>Comida: Ampliar el carrito (más plancha y conservadora): 1,2 % de S</i> | caja − 0,012·S; capacidad × 1,25 (+25 %); satisfacción +4 puntos (0–100) | Inversión: activo fijo (8 años) | Más capacidad evita ventas perdidas, pero es dinero inmovilizado si la demanda no llega. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Usar un sistema de pronóstico de demanda: 0,4 % de S<br><i>Comida: Anotar y prever cuánto se vende cada día: 0,4 % de S</i> | caja − 0,004·S; capacidad × 1,1 (+10 %); productividad +5 puntos (0–100); innovación +4 puntos (0–100) | Inversión: sistemas (4 años) | Anticipar la demanda permite atender más con lo mismo. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Vender equipos que casi no usas para liberar caja<br><i>Delivery: Reducir la red de conductores en las horas de poca demanda</i><br><i>Delivery, efecto propio: gastos operativos − 0,01·S al año (÷ 12 por mes); capacidad × 0,95 (−5 %); satisfacción −4 puntos (0–100)</i> | caja + 0,006·S; capacidad × 0,95 (−5 %); satisfacción −4 puntos (0–100) | Venta de activo (ganancia o pérdida) | Menos recursos parados mejora la caja, pero cualquier pico de demanda te deja sin poder atender. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| D. Dejarlo así<br><i>Comida: Dejarlo así</i> | satisfacción −3 puntos (0–100) | Sin movimiento de dinero | Los clientes que no logras atender se acuerdan. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-capacitar · Capacitación

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres, excepto Comida rápida
- **Situación**: Tu equipo comete errores que cuestan dinero y tiempo.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Programa de capacitación: 0,4 % de S | caja − 0,004·S; productividad +8 puntos (0–100); satisfacción +3 puntos (0–100)<br>· regla condicional: `s.flags.despidos?(delete s.flags.despidos,{e:{sat:4,rep:3},t:'Después de los despidos, invertir en tu gente recompuso el ambiente y tu imagen como empleador.'}):null` → efecto adicional<br>· mes +3: productividad +4 puntos (0–100) | Gasto del mes | Capacitar cuesta hoy y rinde durante meses, aunque contablemente es un gasto del período. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Bonos por desempeño: 0,12 % de S al mes | pagos al personal (bonos, horas extra o aumentos) + 0,015·S al año, más aportes patronales 17,21 % y aguinaldo; productividad +6 puntos (0–100) | Sin movimiento de dinero | Los incentivos alinean al equipo con los resultados, pero se vuelven un costo permanente. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582) |
| C. Reemplazar a quienes rinden menos | caja − 0,003·S; productividad +5 puntos (0–100); satisfacción −5 puntos (0–100); reputación −2 puntos (0–100)<br>· mes +3: productividad −3 puntos (0–100), reputación −2 puntos (0–100)<br>· activa la marca «despidos» (habilita decisiones o finales posteriores) | Gasto del mes | Mejora el rendimiento rápido, pero daña el ambiente laboral y puede provocar renuncias. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. No hacer nada | productividad −3 puntos (0–100) | Sin movimiento de dinero | Los errores se repiten y se vuelven costumbre. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-quejas · Clientes

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres
- **Situación**: Las quejas en redes sociales están aumentando.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Crear un puesto de atención al cliente<br><i>Comida: Contratar a alguien por horas para atender pedidos por WhatsApp</i> | personal × 1,1 (+10 %); satisfacción +10 puntos (0–100); reputación +4 puntos (0–100) | Sin movimiento de dinero | Atender bien retiene clientes, y retener es más barato que conseguir nuevos. | B+C | Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Compensar a los afectados: 0,3 % de S | caja − 0,003·S; satisfacción +5 puntos (0–100); reputación +3 puntos (0–100) | Gasto del mes | Resuelve el momento, pero no cambia la causa de las quejas. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Programa de fidelización: 0,1 % de S al mes | gastos operativos + 0,012·S al año (÷ 12 por mes); satisfacción +7 puntos (0–100); impulso comercial +3 % (se realiza un 25 % por mes) | Sin movimiento de dinero | Premiar la recompra hace que tus clientes vuelvan y te recomienden. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| D. Ignorarlas | satisfacción −6 puntos (0–100); reputación −6 puntos (0–100)<br>· mes +3: clientes × 0,95 (−5 %) | Sin movimiento de dinero | Una queja ignorada en público la leen cientos de posibles clientes. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-copia · Competencia

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres
- **Situación**: Un competidor copia tu oferta y cobra 10% menos.
- **Golpe previo (antes de elegir)**: `({e:{pref:-.05},t:'El precio de referencia del mercado bajó 5%: tu precio ahora se ve más caro.'})`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Entrar en guerra de precios | precio × 0,9 (−10 %) → clientes según la regla de demanda<br>· mes +3: precio × 0,98 (−2 %) → clientes según la regla de demanda | Sin movimiento de dinero | Igualar precios defiende clientes, pero reduce el margen de todos. Gana quien tiene costos más bajos. | B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| B. Diferenciarte por calidad: 0,6 % de S | caja − 0,006·S; costo variable unitario × 1,02 (+2 %); reputación +6 puntos (0–100); satisfacción +5 puntos (0–100) | Gasto del mes | Competir por calidad protege tu precio y construye reputación. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| C. Aliarte con él para comprar juntos | costo variable unitario × 0,96 (−4 %); innovación −2 puntos (0–100) | Sin movimiento de dinero | Comprar en conjunto baja costos para ambos, aunque te vuelve más parecido a tu rival. | B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Margen de contribución = precio − costo variable (Mankiw, 2021) |
| D. No reaccionar | sin cambios directos | Sin movimiento de dinero | Los clientes sensibles al precio se cambian. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-costos · Reducción de costos

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6)
- **Modalidad**: las tres
- **Situación**: Tus gastos fijos crecieron más rápido que tus ventas.<br>Comida rápida: Tus gastos del carrito crecieron más rápido que tus ventas.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Recorte general de gastos<br><i>Comida: Recortar gastos en general</i> | gastos operativos − 0,05·S al año (÷ 12 por mes); productividad −4 puntos (0–100); satisfacción −3 puntos (0–100)<br>· mes +3: clientes × 0,97 (−3 %) | Sin movimiento de dinero | El recorte parejo es rápido, pero corta también lo que sí generaba valor. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Renegociar alquiler y servicios<br><i>Comida: Renegociar el gas, el transporte y otros servicios</i> | gastos operativos − 0,02·S al año (÷ 12 por mes) | Sin movimiento de dinero | Negociar contratos baja costos sin afectar la operación. | A | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Automatizar tareas: 0,8 % de S<br><i>Comida: Ordenar y simplificar la preparación: 0,8 % de S</i><br><i>Comida, registro: Gasto del mes</i> | caja − 0,008·S; gastos operativos − 0,03·S al año (÷ 12 por mes); innovación +6 puntos (0–100); productividad +3 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Inversión: sistemas (4 años) | Automatizar exige inversión inicial y reduce costos todos los meses siguientes. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. Mantener los gastos<br><i>Comida: Mantener los gastos</i> | sin cambios directos | Sin movimiento de dinero | Tu punto de equilibrio sigue alto. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-sucursal · Apertura de sucursales

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres
- **Situación**: Aparece la oportunidad de abrir una sucursal.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Hacerlo con un préstamo de 7 % de S<br><i>Comida: Comprar el segundo carrito, atendido por un vendedor a medio tiempo, con un préstamo de 7 % de S</i><br><i>Comida, efecto propio: deuda + 0,07·S; capacidad × 1,6 (+60 %); gastos operativos + 0,06·S al año (÷ 12 por mes); personal + 0,5 jornada(s) completa(s); clientes × 1,12 (+12 %); impulso comercial +12 % (se realiza un 25 % por mes)</i> | deuda + 0,07·S; capacidad × 1,6 (+60 %); gastos operativos + 0,06·S al año (÷ 12 por mes); personal × 1,3 (+30 %); clientes × 1,12 (+12 %); impulso comercial +12 % (se realiza un 25 % por mes)<br>· mes +3: clientes × 1,08 (+8 %)<br>· activa la marca «sucursal» (habilita decisiones o finales posteriores) | Inversión: activo fijo (8 años) | Expandirse con deuda acelera el crecimiento, pero duplica los compromisos: más costos fijos y cuotas al banco. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto; Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Hacerlo con caja propia: 7 % de S<br><i>Comida: Comprarlo con caja propia y contratar un vendedor a medio tiempo: 7 % de S</i><br><i>Comida, efecto propio: caja − 0,07·S; capacidad × 1,6 (+60 %); gastos operativos + 0,06·S al año (÷ 12 por mes); personal + 0,5 jornada(s) completa(s); clientes × 1,12 (+12 %); impulso comercial +12 % (se realiza un 25 % por mes)</i> | caja − 0,07·S; capacidad × 1,6 (+60 %); gastos operativos + 0,06·S al año (÷ 12 por mes); personal × 1,3 (+30 %); clientes × 1,12 (+12 %); impulso comercial +12 % (se realiza un 25 % por mes)<br>· regla condicional: `s.cash<0` → efecto adicional<br>· mes +3: clientes × 1,08 (+8 %)<br>· activa la marca «sucursal» (habilita decisiones o finales posteriores) | Inversión: activo fijo (8 años) | Usar tu propio dinero evita intereses, pero te deja sin colchón si algo sale mal. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto; Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Dar una franquicia a un tercero<br><i>Comida: Prestar tu marca a otro vendedor a cambio de un pago</i> | caja + 0,01·S; impulso comercial +8 % (se realiza un 25 % por mes); reputación −2 puntos (0–100)<br>· mes +3: caja + 0,008·S, satisfacción −3 puntos (0–100)<br>· activa la marca «franquicia» (habilita decisiones o finales posteriores) | Ingreso del mes | La franquicia crece con dinero ajeno; a cambio pierdes control sobre la calidad. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| D. No expandirse por ahora<br><i>Comida: No por ahora</i> | sin cambios directos | Sin movimiento de dinero | Consolidar lo que tienes es válido, aunque otro puede ocupar ese espacio. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-nuevoProd · Nuevos productos

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres
- **Situación**: Ves la oportunidad de lanzar un producto nuevo.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Desarrollo completo: 2 % de S | caja − 0,02·S; innovación +15 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad<br>· resultado incierto: probabilidad de éxito = `.35+s.inno/150`<br>· si falla: reputación −2 puntos (0–100)<br>· si sale bien: clientes × 1,22 (+22 %), precio × 1,05 (+5 %) → clientes según la regla de demanda, reputación +5 puntos (0–100) | Gasto del mes | Innovar a fondo puede cambiar el tamaño de la empresa, pero es una apuesta. La experiencia innovando mejora las probabilidades. | A+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Piloto pequeño: 0,6 % de S<br><i>Comida: Probar unos días en el carrito: 0,6 % de S</i> | caja − 0,006·S; innovación +7 puntos (0–100); clientes × 1,03 (+3 %)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Gasto del mes | Probar en pequeño limita la pérdida y enseña qué quiere el cliente. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Copiar lo que ya funciona en el mercado<br><i>Comida: Copiar los platos que ya venden otros puestos</i> | caja − 0,004·S; clientes × 1,04 (+4 %); innovación −3 puntos (0–100) | Gasto del mes | Imitar es barato y seguro, pero no te diferencia. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. No lanzar nada | sin cambios directos | Sin movimiento de dinero | Tu oferta envejece mientras la de otros se renueva. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-tecnologia · Tecnología

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres
- **Situación**: Una plataforma de gestión integraría ventas, compras y finanzas de toda la empresa.<br>Comida rápida: Una aplicación en el celular integraría tus cobros con QR, tus compras de ingredientes y tu inventario.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Implementarla completa: 1,6 % de S<br><i>Comida: Implementarla completa: 1,6 % de S</i> | caja − 0,016·S; productividad +10 puntos (0–100); innovación +8 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad<br>· mes +3: gastos operativos − 0,02·S al año (÷ 12 por mes), satisfacción +4 puntos (0–100) | Inversión: sistemas (4 años) | La tecnología cuesta al inicio y luego ahorra todos los meses. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Versión básica: 0,6 % de S<br><i>Comida: Versión básica: 0,6 % de S</i> | caja − 0,006·S; productividad +4 puntos (0–100) | Inversión: sistemas (4 años) | Resuelve lo urgente con poco dinero. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Desarrollo a medida con un préstamo de 2,4 % de S<br><i>Comida: Encargar una versión a medida con un préstamo de 2,4 % de S</i> | deuda + 0,024·S; productividad +12 puntos (0–100); innovación +12 puntos (0–100); capacidad × 1,1 (+10 %)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Inversión: sistemas (4 años) | Una solución propia puede ser una ventaja competitiva, pagada con deuda. | A+B+C | Riesgo y rendimiento; crédito y deuda; Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| D. Seguir con los procesos actuales<br><i>Comida: Seguir anotando a mano</i> | sin cambios directos<br>· mes +3: productividad −4 puntos (0–100) | Sin movimiento de dinero | No invertir en tecnología no es gratis: el atraso se acumula. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-riesgos · Gestión de riesgos

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres
- **Situación**: Un comerciante de tu zona perdió buena parte de su negocio por un imprevisto (un robo, un incendio, una inundación). Te preguntas qué pasaría si te ocurriera a ti.<br>Comida rápida: A otro vendedor de la zona le robaron su carrito y perdió casi todo. Te preguntas qué pasaría si te ocurriera a ti.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Contratar un seguro integral: 0,1 % de S al mes<br><i>Comida: Contratar un seguro contra robo e incendio: 0,1 % de S al mes</i> | gastos operativos + 0,012·S al año (÷ 12 por mes)<br>· activa la marca «seguro» (habilita decisiones o finales posteriores) | Sin movimiento de dinero | El seguro es un costo seguro que evita una pérdida grande e incierta. | A | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Diversificar proveedores y clientes: 0,4 % de S<br><i>Comida: Tener más de un proveedor y diversificar clientes: 0,4 % de S</i> | caja − 0,004·S; costo variable unitario × 1,01 (+1 %)<br>· activa la marca «dosProv» (habilita decisiones o finales posteriores) | Gasto del mes | No depender de uno solo reduce el daño cuando alguno falla. | A+B | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| C. Pagar deuda por adelantado | caja − P y deuda − P, con P = mín(deuda; 0,03·S; caja) | Sin movimiento de dinero | Menos deuda significa menos intereses y más resistencia ante una crisis. | A | Riesgo y rendimiento; crédito y deuda | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. No hacer nada | sin cambios directos | Sin movimiento de dinero | El riesgo no desaparece por no mirarlo. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-talento · Recursos humanos

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres, excepto Comida rápida
- **Situación**: Tu empleado con más experiencia recibió una oferta de la competencia.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Igualar la oferta: 0,12 % de S al mes | pagos al personal (bonos, horas extra o aumentos) + 0,015·S al año, más aportes patronales 17,21 % y aguinaldo; productividad +2 puntos (0–100) | Sin movimiento de dinero | Retener cuesta menos que reemplazar, pero otros pedirán lo mismo. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582) |
| B. Ofrecerle un bono según los resultados | pagos al personal (bonos, horas extra o aumentos) + 0,008·S al año, más aportes patronales 17,21 % y aguinaldo; productividad +6 puntos (0–100); satisfacción +2 puntos (0–100) | Sin movimiento de dinero | Quien gana cuando la empresa gana, cuida la empresa. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582) |
| C. Dejarlo ir | productividad −8 puntos (0–100)<br>· resultado incierto: probabilidad de éxito = `.25+s.sat/200`<br>· si falla: clientes × 0,95 (−5 %) | Sin movimiento de dinero | Perder a alguien clave se paga en conocimiento y, a veces, en clientes. | C | Riesgo y rendimiento; crédito y deuda | Sin evidencia empírica específica |
| D. Plan de carrera para todo el equipo: 0,4 % de S | caja − 0,004·S; productividad +5 puntos (0–100); satisfacción +2 puntos (0–100) | Gasto del mes | Un plan de carrera reduce la rotación de todos, no solo de uno. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-inflacion · Precios

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres
- **Situación**: La inflación subió tus costos en los últimos meses.
- **Golpe previo (antes de elegir)**: `({e:{vc:.06,pref:.04},t:'Tu costo por unidad subió 6% y los precios del mercado subieron 4%.'})`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Trasladar todo el aumento al precio | precio × 1,06 (+6 %) → clientes según la regla de demanda | Sin movimiento de dinero | Clientes satisfechos toleran mejor un aumento de precio. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| B. Trasladar la mitad | precio × 1,03 (+3 %) → clientes según la regla de demanda | Sin movimiento de dinero | Compartes el golpe entre tu margen y tu cliente. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Absorber el aumento | reputación +3 puntos (0–100); satisfacción +3 puntos (0–100) | Sin movimiento de dinero | Ganas simpatía y pierdes margen. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |
| D. Rediseñar la oferta para bajar costos: 0,6 % de S | caja − 0,006·S; costo variable unitario × 0,96 (−4 %); innovación +4 puntos (0–100) | Gasto del mes | Cambiar cómo produces ataca la causa en vez de pasar la factura. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Margen de contribución = precio − costo variable (Mankiw, 2021) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-marca · Publicidad

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9)
- **Modalidad**: las tres
- **Situación**: Te proponen auspiciar el principal evento de la ciudad.<br>Comida rápida: Te proponen auspiciar la feria de bienvenida de la universidad.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Gran auspicio: 1,4 % de S<br><i>Comida: Auspicio principal: 1,4 % de S</i> | caja − 0,014·S; reputación +10 puntos (0–100); impulso comercial +6 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100)<br>· mes +3: clientes × 1,03 (+3 %) | Gasto del mes | La publicidad de marca construye reputación, aunque su efecto en ventas es difícil de medir. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| B. Marketing digital con resultados medibles: 0,6 % de S<br><i>Comida: Publicidad en redes con resultados medibles: 0,6 % de S</i> | caja − 0,006·S; impulso comercial +6 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100) | Gasto del mes | Pagar por resultado permite saber qué funciona. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| C. Programa de responsabilidad social: 0,4 % de S<br><i>Comida: Apoyar una actividad solidaria del barrio: 0,4 % de S</i> | caja − 0,004·S; reputación +7 puntos (0–100); satisfacción +2 puntos (0–100) | Gasto del mes | Aportar a la comunidad mejora la imagen de forma duradera. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. No participar<br><i>Comida: No participar</i> | sin cambios directos | Sin movimiento de dinero | Ahorras hoy; tu marca sigue igual de conocida. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-internacional · Expansión

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres
- **Situación**: Un empresario de otro país te propone llevar tu negocio allá.<br>Comida rápida: Te invitan a llevar tu carrito a otro país durante una temporada.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Entrar con operación propia y un préstamo de 8 % de S<br><i>Comida: Ir con un carrito propio y un préstamo de 8 % de S, y contratar ayuda por horas para el carrito de aquí</i> | deuda + 0,08·S; gastos operativos + 0,08·S al año (÷ 12 por mes); capacidad × 1,3 (+30 %); personal × 1,2 (+20 %)<br>· resultado incierto: probabilidad de éxito = `.3+s.rep/200+s.inno/400`<br>· si falla: clientes × 1,15 (+15 %), reputación −3 puntos (0–100)<br>· si sale bien: clientes × 1,45 (+45 %), reputación +5 puntos (0–100)<br>· activa la marca «export» (habilita decisiones o finales posteriores) | Inversión: activo fijo (8 años) | Salir del país multiplica el mercado y el riesgo. Una marca fuerte e innovadora tiene más probabilidad de lograrlo. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Entrar con un distribuidor local: 1 % de S<br><i>Comida: Ir como invitado de otro puesto: 1 % de S</i> | caja − 0,01·S; clientes × 1,12 (+12 %)<br>· mes +3: clientes × 1,05 (+5 %)<br>· activa la marca «export» (habilita decisiones o finales posteriores) | Gasto del mes | Un distribuidor local reduce la inversión y el riesgo, a cambio de un crecimiento menor. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Reforzar el mercado local: 1 % de S<br><i>Comida: Quedarte y reforzar tu clientela: 1 % de S</i> | caja − 0,01·S; impulso comercial +8 % (se realiza un 25 % por mes); reputación +3 puntos (0–100) | Gasto del mes | Ser fuerte en casa antes de salir es una estrategia válida. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| D. Rechazar la propuesta<br><i>Comida: No ir</i> | sin cambios directos | Sin movimiento de dinero | Evitas el riesgo y también la oportunidad. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-adquisicion · Inversiones

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres, excepto Comida rápida
- **Situación**: Tu competidor más pequeño está en venta por 6 % de S.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Comprarlo con deuda | deuda + 0,06·S; clientes × 1,25 (+25 %); capacidad × 1,25 (+25 %); personal × 1,2 (+20 %); gastos operativos + 0,03·S al año (÷ 12 por mes); productividad −5 puntos (0–100) | Inversión: activo fijo (8 años) | Comprar un competidor da clientes de inmediato, pero integrar dos empresas es difícil y la deuda queda. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Comprarlo con caja propia | caja − 0,06·S; clientes × 1,25 (+25 %); capacidad × 1,25 (+25 %); personal × 1,2 (+20 %); gastos operativos + 0,03·S al año (÷ 12 por mes); productividad −5 puntos (0–100) | Inversión: activo fijo (8 años) | Sin deuda nueva, pero con la caja comprometida. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Contratar solo a su mejor personal: 1,2 % de S | caja − 0,012·S; clientes × 1,06 (+6 %); productividad +3 puntos (0–100); personal × 1,1 (+10 %) | Gasto del mes | Te llevas el talento sin cargar con toda la empresa. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| D. No comprar | sin cambios directos<br>· mes +3: clientes × 0,94 (−6 %) | Sin movimiento de dinero | Lo que tú no compras, lo puede comprar otro. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-planta · Producción

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres
- **Situación**: Un centro de operaciones automatizado bajaría tus costos por unidad.<br>Comida rápida: Una cocina mejor equipada (freidora industrial, conservadora) bajaría tu costo por plato.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Construirlo con un préstamo de 5 % de S<br><i>Comida: Comprarla con un préstamo de 5 % de S</i> | deuda + 0,05·S; costo variable unitario × 0,85 (−15 %); capacidad × 1,4 (+40 %); unidades por empleado × 1,3 (+30 %); innovación +8 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad<br>· mes +3: costo variable unitario × 0,96 (−4 %) | Inversión: activo fijo (8 años) | Una gran inversión baja el costo unitario para siempre, si hay volumen suficiente para aprovecharla. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| B. Alquilarlo: 0,42 % de S al mes<br><i>Comida: Alquilar el equipo: 0,42 % de S al mes</i> | gastos operativos + 0,05·S al año (÷ 12 por mes); costo variable unitario × 0,93 (−7 %); capacidad × 1,3 (+30 %) | Sin movimiento de dinero | Alquilar evita la deuda, pero sube tus costos fijos. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| C. Mejorar lo que ya tienes: 1,2 % de S<br><i>Comida: Mejorar el equipo que ya tienes: 1,2 % de S</i> | caja − 0,012·S; costo variable unitario × 0,97 (−3 %); capacidad × 1,1 (+10 %) | Inversión: activo fijo (8 años) | Mejoras graduales con riesgo bajo. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| D. No invertir<br><i>Comida: No invertir</i> | sin cambios directos | Sin movimiento de dinero | Tus costos quedan donde están. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-estructura · Contratación y despidos

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres, excepto Comida rápida
- **Situación**: Con más pedidos y más tareas, las decisiones del día a día se volvieron lentas.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Reestructurar y despedir al 20% del personal | personal × 0,8; gastos operativos − 0,03·S al año (÷ 12 por mes); productividad +6 puntos (0–100); satisfacción −6 puntos (0–100); reputación −4 puntos (0–100)<br>· mes +3: productividad −5 puntos (0–100)<br>· activa la marca «despidos» (habilita decisiones o finales posteriores) | Sin movimiento de dinero | Reducir personal baja costos de inmediato, pero golpea la moral y la reputación como empleador. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Contratar asesoría externa de gestión: 0,25 % de S al mes | gastos operativos + 0,03·S al año (÷ 12 por mes); productividad +12 puntos (0–100) | Sin movimiento de dinero | Un asesor externo ordena procesos y responsabilidades. Es un servicio que se paga cada mes, no un empleado más. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Digitalizar los procesos: 1,4 % de S | caja − 0,014·S; productividad +9 puntos (0–100); innovación +8 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Inversión: sistemas (4 años) | Menos trámites manuales, más velocidad. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. Dejar todo como está | productividad −4 puntos (0–100) | Sin movimiento de dinero | La burocracia crece sola si nadie la corta. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-fondo · Finanzas

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres, excepto Comida rápida
- **Situación**: Un fondo de inversión ofrece 8 % de S a cambio de una parte de la empresa.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Aceptar la inversión | caja + 0,08·S; impulso comercial +5 % (se realiza un 25 % por mes); participación del dueño × 0,7<br>· mes +3: gastos operativos + 0,03·S al año (÷ 12 por mes)<br>· activa la marca «socio» (habilita decisiones o finales posteriores) | Aporte de capital | El capital fresco da fuerza para crecer, pero el inversionista exigirá resultados. | A+B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto; Dilución de la propiedad al entrar un socio (regla financiera) |
| B. Negociar la mitad | caja + 0,04·S; participación del dueño × 0,85<br>· activa la marca «socio» (habilita decisiones o finales posteriores) | Aporte de capital | Menos dinero y menos presión. | A | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Dilución de la propiedad al entrar un socio (regla financiera) |
| C. Usar la oferta para conseguir mejor crédito | tasa de interés −3 puntos % (límites 6 %–35 %) | Sin movimiento de dinero | Demostrar que hay interesados mejora tu posición frente al banco. | A | Riesgo y rendimiento; crédito y deuda | El interés es costo financiero del período (regla contable) |
| D. Rechazar | sin cambios directos | Sin movimiento de dinero | Mantienes el control total. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-sostenible · Innovación

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres
- **Situación**: Clientes y autoridades exigen prácticas más responsables con el medio ambiente.<br>Comida rápida: Tus clientes y la alcaldía exigen envases biodegradables y un manejo responsable de la basura.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Programa completo: 1 % de S y 0,08 % de S al mes | caja − 0,01·S; gastos operativos + 0,01·S al año (÷ 12 por mes); reputación +12 puntos (0–100); innovación +5 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Gasto del mes | Adelantarse a la exigencia convierte una obligación en ventaja de marca. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Cumplir el mínimo legal: 0,2 % de S | caja − 0,002·S; reputación +2 puntos (0–100) | Gasto del mes | Evitas sanciones sin diferenciarte. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Ignorarlo | sin cambios directos<br>· resultado incierto: probabilidad de éxito = `.75-met(s).risk/200`<br>· si falla: caja − 0,01·S, reputación −10 puntos (0–100) | Sin movimiento de dinero | Ahorrar en cumplimiento es una apuesta contra una multa y contra tu reputación. | C | Riesgo y rendimiento; crédito y deuda; Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-segundaMarca · Nuevos productos

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres
- **Situación**: Puedes crear una segunda marca para llegar a otro tipo de cliente.<br>Comida rápida: Puedes ofrecer una segunda línea de platos para otro tipo de cliente.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Marca económica: 1,6 % de S<br><i>Comida: Línea económica: 1,6 % de S</i> | caja − 0,016·S; clientes × 1,12 (+12 %); precio × 0,96 (−4 %) → clientes según la regla de demanda; reputación −2 puntos (0–100) | Gasto del mes | Una marca barata gana volumen y participación, pero baja el precio promedio. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| B. Marca premium: 1,6 % de S<br><i>Comida: Línea especial a mayor precio: 1,6 % de S</i> | caja − 0,016·S; precio × 1,08 (+8 %) → clientes según la regla de demanda; clientes × 1,15 (+15 %); reputación +5 puntos (0–100) | Gasto del mes | Una marca premium sube el margen con pocos clientes más. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Mantener una sola marca<br><i>Comida: Mantener un solo menú</i> | sin cambios directos | Sin movimiento de dinero | El foco también es una estrategia. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-dividendos · Flujo de caja

- **Tipo**: Decisión (nivel 4: aparece sobre todo en los meses 10 a 12)
- **Modalidad**: las tres
- **Situación**: Hay que decidir qué hacer con las utilidades acumuladas.<br>Comida rápida: Hay que decidir qué hacer con lo que el carrito ha ganado.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Reinvertir en crecimiento: 1,2 % de S | caja − 0,012·S; impulso comercial +8 % (se realiza un 25 % por mes); innovación +5 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Gasto del mes | Reinvertir sacrifica efectivo hoy por una empresa más grande mañana. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| B. Pagar deuda | caja − P y deuda − P, con P = mín(deuda; 0,04·S; caja) | Sin movimiento de dinero | Cada boliviano de deuda pagado deja de generar intereses. | A | Riesgo y rendimiento; crédito y deuda | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Retirar utilidades para ti: 1,6 % de S / con socios: Repartir utilidades entre tú y tus socios: 1,6 % de S<br><i>Comida: Llevarte una parte extra para ti: 1,6 % de S</i> | caja − 0,016·S; satisfacción −0 puntos (0–100) | Reparto de utilidades (dueño → dinero personal) | Repartir utilidades premia a los dueños, pero saca del negocio el dinero que lo protege. Tu parte pasa a tus finanzas personales; no es un gasto del negocio. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. Guardar la caja como reserva<br><i>Comida: Guardarlo como reserva del carrito</i> | sin cambios directos | Sin movimiento de dinero | La liquidez es un seguro contra lo inesperado. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-faltaPersonal · Contratación

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6) · solo si se cumple: `s.emp*s.upe<s.cap*.92`
- **Modalidad**: las tres
- **Situación**: Tienes instalaciones para atender más, pero no la gente: tu equipo es el cuello de botella.<br>Comida rápida: Tu carrito ya puede preparar más platos, pero trabajas solo: la demanda que podrías atender supera lo que tus manos alcanzan a hacer.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Ampliar el equipo 30%<br><i>Comida: Contratar ayuda por horas (30 % de una jornada)</i> | personal × 1,3 (+30 %); productividad −2 puntos (0–100)<br>· mes +3: productividad +4 puntos (0–100) | Sin movimiento de dinero | Cada persona nueva tarda en rendir: al inicio baja la productividad del equipo y luego sube. | B+C | Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Pagar horas extra: 0,1 % de S al mes<br><i>Comida: Alargar tu propia jornada (sin pago extra, con más cansancio)</i><br><i>Comida, efecto propio: unidades por empleado × 1,12 (+12 %); satisfacción −2 puntos (0–100)</i> | pagos al personal (bonos, horas extra o aumentos) + 0,012·S al año, más aportes patronales 17,21 % y aguinaldo; unidades por empleado × 1,12 (+12 %); satisfacción −2 puntos (0–100)<br>· mes +3: productividad −4 puntos (0–100) | Sin movimiento de dinero | Las horas extra resuelven hoy y desgastan mañana. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Automatizar tareas repetitivas: 1,2 % de S<br><i>Comida: Comprar equipos para preparar por adelantado (conservadora y recipientes): 1,2 % de S</i><br><i>Comida, registro: Inversión: activo fijo (8 años)</i> | caja − 0,012·S; unidades por empleado × 1,25 (+25 %); innovación +6 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Inversión: sistemas (4 años) | Automatizar permite que cada persona atienda más, sin subir la planilla. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| D. Seguir con el equipo actual<br><i>Comida: Seguir como estás</i> | sin cambios directos | Sin movimiento de dinero | La capacidad que no puedes operar es dinero parado. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-sinCapacidad · Producción

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6) · solo si se cumple: `s.flags.sinCap`
- **Modalidad**: las tres
- **Situación**: El mes pasado la demanda superó tu capacidad y dejaste clientes sin atender.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Ampliar y contratar: 1,6 % de S<br><i>Comida: Ampliar el carrito y contratar ayuda por horas: 1,6 % de S</i> | caja − 0,016·S; capacidad × 1,3 (+30 %); personal × 1,2 (+20 %) | Inversión: activo fijo (8 años) | Cuando la demanda ya existe, ampliar capacidad es la inversión más segura. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582); Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Subir precios para moderar la demanda<br><i>Comida: Subir el precio para moderar los pedidos</i> | precio × 1,07 (+7 %) → clientes según la regla de demanda | Sin movimiento de dinero | Si no puedes atender a todos, cobrar más a los que sí atiendes mejora el margen. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Tercerizar el excedente<br><i>Comida: Comprar porciones ya preparadas para el excedente</i> | costo variable unitario × 1,05 (+5 %); capacidad × 1,25 (+25 %) | Sin movimiento de dinero | Atiendes más sin invertir, con menor margen por venta. | B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Las ventas no pueden superar la capacidad (restricción física del modelo); Margen de contribución = precio − costo variable (Mankiw, 2021) |
| D. Seguir igual<br><i>Comida: Seguir igual</i> | satisfacción −5 puntos (0–100) | Sin movimiento de dinero | Seguirás perdiendo ventas y clientes molestos. | C | Gestión de intangibles: reputación, servicio, productividad, innovación | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-cajaRoja · Flujo de caja

- **Tipo**: Decisión (nivel 1: aparece sobre todo en los meses 1 a 3) · solo si se cumple: `s.cash<s.S*.03`
- **Modalidad**: las tres
- **Situación**: La caja está casi vacía y hay pagos que vencen pronto.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Préstamo de emergencia de 3 % de S | deuda + 0,03·S; caja + 0,03·S; tasa de interés +3 puntos % (límites 6 %–35 %) | Financiamiento (deuda) | El crédito urgente siempre es el más caro. | A | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); El interés es costo financiero del período (regla contable) |
| B. Vender activos | caja + 0,02·S; capacidad × 0,85 (−15 %) | Venta de activo (ganancia o pérdida) | Consigues efectivo sacrificando capacidad futura. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Recortar gastos de inmediato | gastos operativos − 0,04·S al año (÷ 12 por mes); productividad −4 puntos (0–100); satisfacción −4 puntos (0–100) | Sin movimiento de dinero | Alivia la caja, con costo en servicio y equipo. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| D. Conseguir un socio que aporte dinero / con socios: Pedir un aporte a tus socios | caja + 0,024·S; participación del dueño × 0,9<br>· activa la marca «socio» (habilita decisiones o finales posteriores) | Aporte de capital | Un aporte de capital no cobra intereses, pero quien aporta se queda con una parte del negocio. | A | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Dilución de la propiedad al entrar un socio (regla financiera) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-cajaOciosa · Inversiones

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6) · solo si se cumple: `s.cash>s.S*.45`
- **Modalidad**: las tres
- **Situación**: Tienes mucha caja acumulada sin usar.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Invertir en crecer: 3 % de S | caja − 0,03·S; capacidad × 1,2 (+20 %); impulso comercial +10 % (se realiza un 25 % por mes) | Inversión: activo fijo (8 años) | El dinero quieto pierde valor; invertido puede multiplicarse. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto; Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Pagar toda la deuda posible | caja − P y deuda − P, con P = mín(deuda; 0,08·S; caja) | Sin movimiento de dinero | Sin deuda, la empresa resiste casi cualquier crisis. | A | Riesgo y rendimiento; crédito y deuda | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Depósito a plazo fijo | sin cambios directos<br>· mes +3: caja + 0,004·S | Sin movimiento de dinero | Rendimiento bajo y seguro. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |
| D. Mantener la reserva | sin cambios directos | Sin movimiento de dinero | Mucha liquidez da tranquilidad, pero no hace crecer la empresa. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-deudaAlta · Endeudamiento

- **Tipo**: Decisión (nivel 3: aparece sobre todo en los meses 7 a 9) · solo si se cumple: `s.debt>s.S*.35`
- **Modalidad**: las tres
- **Situación**: Las cuotas de la deuda se comen buena parte de lo que ganas.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Refinanciar con otro banco | tasa de interés −3 puntos % (límites 6 %–35 %); caja − 0,002·S | Gasto del mes | Una tasa menor reduce los intereses de todos los meses siguientes. | A | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); El interés es costo financiero del período (regla contable) |
| B. Vender activos para pagar | capacidad × 0,85 (−15 %); deuda − 0,04·S | Venta de activo (ganancia o pérdida) | Bajas la deuda achicando la empresa. | A+B | Riesgo y rendimiento; crédito y deuda; Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Que un socio pague parte de la deuda a cambio de una participación | deuda − 0,04·S; participación del dueño × 0,85<br>· activa la marca «socio» (habilita decisiones o finales posteriores) | Deuda convertida en capital | Cambias un acreedor por un socio: baja la deuda y sube el capital, pero ya no eres el único dueño. | A | Riesgo y rendimiento; crédito y deuda | Identidad contable A = P + PN y devengo de gastos (regla contable); Dilución de la propiedad al entrar un socio (regla financiera) |
| D. Seguir pagando como hasta ahora | sin cambios directos | Sin movimiento de dinero | La deuda baja sola, lentamente, si no ocurre nada malo. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-crisisServicio · Clientes

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6) · solo si se cumple: `s.sat<40`
- **Modalidad**: las tres
- **Situación**: Tus clientes están molestos y se nota: cada mes vuelven menos.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Plan de recuperación del servicio: 1 % de S | caja − 0,01·S; satisfacción +15 puntos (0–100); reputación +5 puntos (0–100) | Gasto del mes | Recuperar la confianza cuesta más que no haberla perdido. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Disculpa pública y descuentos | precio × 0,96 (−4 %) → clientes según la regla de demanda; satisfacción +8 puntos (0–100); reputación +3 puntos (0–100) | Sin movimiento de dinero | Reconocer el error ayuda; el descuento lo pagas con margen. | B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Enfocarte en conseguir clientes nuevos | caja − 0,008·S; impulso comercial +5 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100) | Gasto del mes | Llenar un balde con huecos: entran clientes y se siguen yendo. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### D-rotacion · Recursos humanos

- **Tipo**: Decisión (nivel 2: aparece sobre todo en los meses 4 a 6) · solo si se cumple: `s.flags.despidos&&s.prod<55`
- **Modalidad**: las tres, excepto Comida rápida
- **Situación**: Después de los despidos el ambiente es tenso y hay renuncias.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Aumento general de sueldos: 0,17 % de S al mes | pagos al personal (bonos, horas extra o aumentos) + 0,02·S al año, más aportes patronales 17,21 % y aguinaldo; productividad +7 puntos (0–100); satisfacción +3 puntos (0–100) | Sin movimiento de dinero | Subir sueldos frena las renuncias y eleva tus costos fijos. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582) |
| B. Mejorar el clima laboral: 0,3 % de S | caja − 0,003·S; productividad +5 puntos (0–100) | Gasto del mes | El trato y las condiciones importan tanto como el sueldo. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Reemplazar a quien se vaya | productividad −4 puntos (0–100); caja − 0,002·S | Gasto del mes | Cada reemplazo tarda meses en rendir como el anterior. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

## Eventos

### EV-crisis · Crisis económica

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: La economía del país se frena y la gente gasta menos.
- **Golpe previo (antes de elegir)**: `{const dr=s.debt/s.S,m=months(s);let hit=.06+dr*.12,t='Perdiste '+pct(hit)+' de tus {c}.';if(m>3){hit*=.5;t='Tu buena liquidez amortiguó el golpe: solo perdiste '+pct(hit)+' de tus {c}.'}else if(dr>.3)t+=' Tu deuda alta hizo que te afecte m`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Promociones para sostener las ventas | precio × 0,95 (−5 %) → clientes según la regla de demanda | Sin movimiento de dinero | En crisis el cliente busca precio. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| B. Recortar costos y esperar | gastos operativos − 0,04·S al año (÷ 12 por mes); productividad −3 puntos (0–100) | Sin movimiento de dinero | Proteger la caja es la prioridad cuando no sabes cuánto durará. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Invertir mientras los demás se achican: 1,2 % de S | caja − 0,012·S; impulso comercial +8 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100) | Gasto del mes | Quien invierte en la crisis sale adelante cuando termina, si la caja aguanta. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-proveedor · Problemas con un proveedor

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Los proveedores suben sus precios de un día para otro.
- **Golpe previo (antes de elegir)**: `s.flags.dosProv?{e:{vc:.04},t:'Como tienes más de un proveedor, tu costo solo subió 4%.'}:{e:{vc:.10},t:'Tu costo por unidad subió 10%.'}`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Cambiar de proveedor | costo variable unitario × 0,95 (−5 %)<br>· resultado incierto: probabilidad de éxito = `.45+s.prod/250`<br>· si falla: satisfacción −5 puntos (0–100) | Sin movimiento de dinero | Cambiar ahorra, pero un proveedor nuevo es una incógnita. | B+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Margen de contribución = precio − costo variable (Mankiw, 2021) |
| B. Trasladar el aumento al precio | precio × 1,05 (+5 %) → clientes según la regla de demanda | Sin movimiento de dinero | Proteges el margen y arriesgas clientes. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Firmar un contrato de largo plazo: 0,6 % de S | caja − 0,006·S; costo variable unitario × 0,97 (−3 %) | Gasto del mes | Un contrato fija el precio y te quita flexibilidad. | A+B | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Margen de contribución = precio − costo variable (Mankiw, 2021) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-competidor · Nuevo competidor

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Una cadena grande entra a tu mercado con mucha publicidad.<br>Comida rápida: Una cadena de comida rápida abre un local cerca de la universidad, con mucha publicidad.
- **Golpe previo (antes de elegir)**: `s.rep>65?{e:{cust:-.04},t:'Tu buena reputación retuvo a la mayoría: perdiste solo 4% de tus {c}.'}:{e:{cust:-.09},t:'Perdiste 9% de tus {c}.'}`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Publicidad defensiva: 1 % de S | caja − 0,01·S; clientes × 1,05 (+5 %)<br>· efecto comercial × (0,5 + reputación/100) | Gasto del mes | Recordarle al cliente por qué te elige. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| B. Bajar precios 6% | precio × 0,94 (−6 %) → clientes según la regla de demanda | Sin movimiento de dinero | Contra un grande, la guerra de precios suele ganarla el grande. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Especializarte en un nicho | precio × 1,05 (+5 %) → clientes según la regla de demanda; reputación +5 puntos (0–100); innovación +4 puntos (0–100) | Sin movimiento de dinero | Ser el mejor para pocos puede rendir más que ser uno más para todos. | B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-reputacion · Crisis de reputación

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Una mala experiencia de un cliente se vuelve viral.
- **Golpe previo (antes de elegir)**: `s.sat>65?{e:{rep:-6},t:'Tus {c} satisfechos salieron a defenderte: la reputación bajó poco.'}:{e:{rep:-13},t:'Tu reputación cayó con fuerza.'}`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Disculpa pública y compensación: 0,6 % de S | caja − 0,006·S; reputación +8 puntos (0–100); satisfacción +3 puntos (0–100) | Gasto del mes | Responder rápido y con hechos corta la crisis. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Campaña de imagen: 1 % de S | caja − 0,01·S; reputación +5 puntos (0–100) | Gasto del mes | La publicidad sin corregir el problema convence a pocos. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Guardar silencio | sin cambios directos<br>· mes +3: clientes × 0,95 (−5 %) | Sin movimiento de dinero | En redes, el silencio se lee como culpa. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-falla · Problemas de producción

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Una falla grave detiene parte de la operación.<br>Comida rápida: Se daña la plancha y no puedes cocinar con normalidad.
- **Golpe previo (antes de elegir)**: `s.flags.seguro?{e:{cap:-.04},t:'El seguro cubrió la mayor parte: tu capacidad bajó solo 4%.'}:{e:{cap:-.12},t:'Tu capacidad bajó 12%.'}`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Reparación urgente: 0,8 % de S<br><i>Comida: Reparación urgente: 0,8 % de S</i> | caja − 0,008·S; capacidad × 1,12 (+12 %) | Gasto del mes | Recuperas la capacidad pagando la urgencia. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Aprovechar para modernizar: 1,8 % de S<br><i>Comida: Aprovechar para cambiar el equipo: 1,8 % de S</i> | caja − 0,018·S; capacidad × 1,2 (+20 %); productividad +5 puntos (0–100) | Inversión: activo fijo (8 años) | Una crisis puede ser el momento de renovar. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Operar con lo que queda<br><i>Comida: Trabajar con lo que queda</i> | sin cambios directos | Sin movimiento de dinero | Sin gasto, con menos capacidad. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-huelga · Conflicto laboral

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: El personal paraliza actividades y exige mejores condiciones.<br>Comida rápida: Tu ayudante pide mejores condiciones y amenaza con dejar el trabajo.
- **Golpe previo (antes de elegir)**: `({e:{prod:-8},t:'La productividad cayó 8 puntos.'})`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Negociar un aumento: 0,17 % de S al mes<br><i>Comida: Subirle el pago: 0,17 % de S al mes</i> | pagos al personal (bonos, horas extra o aumentos) + 0,02·S al año, más aportes patronales 17,21 % y aguinaldo; productividad +8 puntos (0–100); satisfacción +2 puntos (0–100) | Sin movimiento de dinero | La paz laboral tiene un costo fijo. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Costo laboral: sueldo + aportes patronales (17,21 %) + aguinaldo (DS 5516, Ley 1582) |
| B. Bono único: 0,5 % de S<br><i>Comida: Darle un bono único: 0,5 % de S</i> | caja − 0,005·S; productividad +5 puntos (0–100) | Gasto del mes | Resuelve el momento sin elevar los costos permanentes. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Mantenerte firme<br><i>Comida: Mantenerte firme</i> | sin cambios directos<br>· resultado incierto: probabilidad de éxito = `.2+s.sat/160`<br>· si falla: productividad −6 puntos (0–100), reputación −4 puntos (0–100)<br>· si sale bien: productividad +2 puntos (0–100) | Sin movimiento de dinero | Puede salir bien o empeorar. | C | Riesgo y rendimiento; crédito y deuda; Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-impuestos · Suben patentes y tasas

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: La alcaldía actualiza las patentes y tasas que pagan los negocios: tus obligaciones fijas suben.<br>Comida rápida: La alcaldía sube la tasa por el permiso de venta en la vía pública.
- **Golpe previo (antes de elegir)**: `s.flags.contador?{e:{trib:.006},t:'Tu contador lo anticipó y el aumento de patentes y tasas fue menor.'}:{e:{trib:.015},t:'Tus patentes y tasas municipales subieron.'}`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Revisar tu categoría y tus pagos con un asesor: 0,2 % de S<br><i>Comida: Revisar con un asesor tus pagos y tu categoría: 0,2 % de S</i> | caja − 0,002·S; patentes y tasas municipales − 0,008·S al año | Gasto del mes | Revisar en qué categoría estás y qué pagas, dentro de la ley, suele reducir lo que pagas. | A | Planificar y gestionar las finanzas (costos, margen, caja) | Patentes y tasas municipales: gasto tributario del período; Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Trasladarlo al precio<br><i>Comida: Trasladarlo al precio</i> | precio × 1,02 (+2 %) → clientes según la regla de demanda | Sin movimiento de dinero | El cliente paga el impuesto si acepta el precio. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Absorberlo<br><i>Comida: Absorberlo</i> | sin cambios directos | Sin movimiento de dinero | Tu utilidad lo paga. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-tecno · Nueva tecnología

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Aparece una tecnología que cambia cómo se trabaja en tu rubro.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Adoptarla ya: 1 % de S | caja − 0,01·S; innovación +12 puntos (0–100); productividad +5 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad<br>· resultado incierto: probabilidad de éxito = `.35+s.inno/120`<br>· si sale bien: clientes × 1,05 (+5 %) | Inversión: sistemas (4 años) | Llegar primero da ventaja, y también el costo de los errores iniciales. | A+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Hacer una prueba: 0,4 % de S | caja − 0,004·S; innovación +5 puntos (0–100)<br>· la mitad de la innovación (y la mejora de productividad) llega 3 meses después<br>· riesgo de ejecución 5 %–60 % según innovación, caja y productividad | Gasto del mes | Aprendes sin apostar la empresa. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Esperar | sin cambios directos<br>· mes +3: innovación −5 puntos (0–100), clientes × 0,97 (−3 %) | Sin movimiento de dinero | Esperar es barato hasta que el mercado cambia. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-boom · Aumento de demanda

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Tu rubro se pone de moda y llegan muchos clientes nuevos.
- **Golpe previo (antes de elegir)**: `({e:{cust:.10},t:'Tus {c} aumentaron 10%.'})`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Ampliar capacidad rápido: 1,2 % de S | caja − 0,012·S; capacidad × 1,25 (+25 %) | Inversión: activo fijo (8 años) | Sin capacidad, la demanda extra se la lleva otro. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Subir precios 6% | precio × 1,06 (+6 %) → clientes según la regla de demanda; satisfacción −3 puntos (0–100) | Sin movimiento de dinero | Cuando sobra demanda, el precio puede subir sin perder clientes. | B+C | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. No cambiar nada | sin cambios directos | Sin movimiento de dinero | Si tu capacidad no alcanza, perderás parte de esta ola. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-angel · Oferta de inversión

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Un inversionista quiere entrar como socio en tu negocio.<br>Comida rápida: Alguien con ahorros quiere entrar como socio en tu carrito.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Aceptar: 3 % de S | caja + 0,03·S; participación del dueño × 0,85<br>· mes +6: caja − 0,008·S<br>· activa la marca «socio» (habilita decisiones o finales posteriores) | Aporte de capital | Caja inmediata a cambio de compartir el futuro. | A+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable); Dilución de la propiedad al entrar un socio (regla financiera) |
| B. Pedirle un préstamo en vez de sociedad | deuda + 0,02·S; caja + 0,02·S | Financiamiento (deuda) | Mantienes la propiedad y asumes la obligación de pagar. | A | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| C. Rechazar | sin cambios directos | Sin movimiento de dinero | Sigues solo. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-remate · Oportunidad de expansión

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Un negocio vecino cierra y remata sus equipos y su local.<br>Comida rápida: Un puesto vecino cierra y remata sus equipos.

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Comprar todo: 1,6 % de S<br><i>Comida: Comprar todos sus equipos: 1,6 % de S</i> | caja − 0,016·S; capacidad × 1,2 (+20 %); impulso comercial +4 % (se realiza un 25 % por mes) | Inversión: activo fijo (8 años) | Comprar barato en el momento justo, si tienes caja. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto; Las ventas no pueden superar la capacidad (restricción física del modelo) |
| B. Comprar solo los equipos: 0,6 % de S<br><i>Comida: Comprar solo lo indispensable: 0,6 % de S</i> | caja − 0,006·S; capacidad × 1,08 (+8 %) | Inversión: activo fijo (8 años) | Una mejora pequeña y segura. | A+B | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); Las ventas no pueden superar la capacidad (restricción física del modelo) |
| C. Dejar pasar<br><i>Comida: Dejar pasar</i> | sin cambios directos | Sin movimiento de dinero | No toda oportunidad es para ti. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-clienteClave · Pérdida de un cliente importante

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Tu cliente más grande anuncia que se va con la competencia.<br>Comida rápida: Un grupo de estudiantes que te compraba todos los días se cambia a otro puesto.
- **Golpe previo (antes de elegir)**: `s.sat>65?{e:{cust:-.03},t:'Como tus {c} están satisfechos, logró irse solo una parte: perdiste 3%.'}:{e:{cust:-.08},t:'Perdiste 8% de tus {c} de un día para otro.'}`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Hacerle una contraoferta con descuento: 0,2 % de S<br><i>Comida: Ofrecerles un descuento para que vuelvan: 0,2 % de S</i> | caja − 0,002·S<br>· resultado incierto: probabilidad de éxito = `.3+s.rep/160`<br>· si sale bien: clientes × 1,06 (+6 %) | Gasto del mes | Retener con descuento funciona mejor cuando el cliente valora tu marca. | A+C | Riesgo y rendimiento; crédito y deuda; Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Salir a buscar clientes nuevos: 0,8 % de S<br><i>Comida: Salir a buscar clientes nuevos: 0,8 % de S</i> | caja − 0,008·S; impulso comercial +6 % (se realiza un 25 % por mes)<br>· efecto comercial × (0,5 + reputación/100) | Gasto del mes | Depender de pocos clientes es un riesgo; diversificar cuesta, pero protege. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable); La publicidad desplaza la demanda; magnitud = supuesto |
| C. Ajustar la empresa al nuevo tamaño<br><i>Comida: Ajustar tus compras y gastos al nuevo tamaño</i> | gastos operativos − 0,03·S al año (÷ 12 por mes); productividad −2 puntos (0–100) | Sin movimiento de dinero | Achicar costos protege la utilidad, aunque renuncias a recuperar lo perdido. | A+C | Planificar y gestionar las finanzas (costos, margen, caja) | Identidad contable A = P + PN y devengo de gastos (regla contable) |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

### EV-bloqueo · Caída inesperada de ventas

- **Tipo**: Evento (meses 3, 5, 7, 9 u 11)
- **Modalidad**: las tres (frecuencia ajustada por modalidad)
- **Situación**: Bloqueos y paros dificultan que tus clientes lleguen o reciban sus pedidos.
- **Golpe previo (antes de elegir)**: `({e:{cust:-.05},t:'Perdiste 5% de tus {c} por semanas sin operar con normalidad.'})`

| Opción | Variables y fórmula | Registro contable | Consecuencia que se explica | Cat. | Competencia | Fuente / evidencia |
|---|---|---|---|---|---|---|
| A. Crear un canal alternativo de venta: 0,4 % de S | caja − 0,004·S; clientes × 1,03 (+3 %); innovación +3 puntos (0–100) | Gasto del mes | Tener más de un canal protege de cierres. | A+B+C | Planificar y gestionar las finanzas (costos, margen, caja); Decisión de crecimiento y capacidad (gestión empresarial) | Identidad contable A = P + PN y devengo de gastos (regla contable) |
| B. Promociones de reactivación | precio × 0,97 (−3 %) → clientes según la regla de demanda | Sin movimiento de dinero | Recuperas clientes pagando con margen. | B | Planificar y gestionar las finanzas (costos, margen, caja) | Ley de la demanda: dirección cualitativa (Mankiw, 2021) |
| C. Esperar a que pase | sin cambios directos | Sin movimiento de dinero | Sin gasto y sin recuperación. | C | Evaluar el costo de no actuar (costo de oportunidad) | Sin evidencia empírica específica |

- **Supuesto**: las magnitudes son supuestos de diseño pendientes de validación con docentes y datos reales.

## Resumen por categoría

De 174 opciones: 109 contienen al menos un efecto de categoría A, 80 de categoría B y 131 de categoría C (una opción puede tener varias). Esto muestra que casi todas las opciones dependen, en su magnitud, de supuestos pedagógicos: el simulador enseña direcciones y relaciones causa-efecto, no predice resultados reales.
