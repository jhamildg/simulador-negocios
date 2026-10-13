# Informe técnico — Simulador de Negocios V5 (revisión V5.2)

> **Actualización V5.2** (auditoría contable y tributaria): textos de las situaciones sin estructuras inexistentes (directorio, gerencias, socios) ni empleados inexistentes; «horas pico»; costo laboral completo (salario mínimo 2026, aportes patronales y aguinaldo); RTS devengado mes a mes con pago al bimestre siguiente y salida del régimen desde la gestión siguiente; multas no deducibles; patentes y tasas en línea propia; venta de activos limitada a lo registrado; y la nueva opción «Detalle contable». Las cifras de este informe (§6, §8, §11, §12 y §14) están actualizadas a la V5.2. Detalle en `CHANGELOG_V5_2.md` y `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md`.

> **Actualización V5.1** (correcciones): se quitaron de la interfaz las referencias visibles a Fernando (queda solo como caso de referencia de los datos iniciales en este informe), se corrigieron los costos de Comida rápida para un pequeño emprendimiento y se agregaron estados de desempeño animados a las ilustraciones. El detalle está en `CORRECCIONES_V5_1.md`; las cifras de Comida rápida de las §6 y §10 ya están actualizadas.

**Base**: V4 (`simulador-negocios-v4.zip`, la misma versión entregada en la ronda anterior; el ZIP no se volvió a adjuntar en este pedido y se trabajó sobre la copia de esa entrega).
**Fecha**: octubre de 2026.
**Documentos relacionados**: `MATRIZ_TRAZABILIDAD_DECISIONES.md` (las 174 opciones, generada desde el código), `CHANGELOG_V5.md`, `INFORME_V4.md` e `INFORME_V3.md` (versiones anteriores).

> Nota de honestidad. Lo que este informe da por comprobado se ejecutó en esta versión, con los números reales obtenidos. Las cifras del simulador son **supuestos**, no datos de negocios reales. Los Bs 8.000 de ventas y Bs 3.000 de ganancia mensual del caso Fernando son **supuestos hipotéticos configurables**: no son datos de Fernando ni promedios del sector gastronómico boliviano. **No se hicieron pruebas con usuarios reales.**

---

## 1. Objetivo de la V5

1. Darle al proyecto una identidad visual propia a partir del logo entregado.
2. Agregar una navegación inferior con cuatro secciones: Inicio, Simulación, Finanzas y Progreso.
3. Mostrar indicadores propios de cada tipo de negocio, sin inventar métricas que el motor no calcule.
4. Hacer coherentes los precios y la demanda con una regla documentada.
5. Adaptar Comida rápida al caso Fernando, con inventario de ingredientes real.
6. Hacer que la ilustración cambie después de cada decisión según sus consecuencias reales.
7. Evaluar y aplicar un horizonte de 12 meses en lugar de 5 años, conservando las 25 situaciones.
8. Actualizar la documentación y las pruebas.

## 2. Punto de partida y problemas encontrados en la V4

Al revisar la V4 para esta versión se encontraron problemas que no eran solo de presentación:

| Problema en la V4 | Consecuencia | Solución en la V5 |
|---|---|---|
| Los gastos puntuales de las decisiones (publicidad, capacitación, multas) bajaban la caja pero **no pasaban por el resultado** | La utilidad estaba sobrestimada; un estudiante de Contaduría podía notar que el dinero “desaparecía” | Cada decisión se registra como gasto, inversión, financiamiento, etc. (§8.4) |
| Las inversiones no quedaban como activo ni se depreciaban | No había balance que cuadrar | Activo fijo con depreciación (DS 24051) y balance completo (§8.5) |
| Cada opción de precio traía un cambio fijo de clientes, más un freno adicional al crecimiento | Doble efecto del precio y sin regla explícita | Regla de demanda única y documentada (§7) |
| El 3 % de rendimiento de la caja se sumaba a la caja pero no al resultado | Inconsistencia documentada en la V4 | Ahora es ingreso financiero del resultado (§8.2) |
| Comida rápida tenía escala de local con 5 empleados (≈ Bs 56.000 al mes) y la imagen era un carrito | Incoherencia entre imagen y números | Caso Fernando a escala de carrito (§10) |
| Sin inventario | No se podía enseñar la reposición de insumos | Inventario con costo promedio y mermas (§9) |

## 3. Identidad visual

- **Logo** (el entregado): en la portada, en tamaño completo y legible (WebP de 100 KB con respaldo PNG). En celulares de 360 px se muestra a 328 px de ancho; en escritorio a 560 px.
- **Versión horizontal para el encabezado**: ícono compacto + “Simulador de *Negocios*” + lema “Decide · Aprende · Crece”, con los colores del logo (azul marino y amarillo).
- **Ícono de la aplicación**: versión simplificada del logo (barras de colores y flecha ascendente sobre fondo amarillo), porque el personaje y el texto del logo original no se leen en tamaños de 16 a 32 px. Se entrega en SVG y en PNG de 32, 180, 192 y 512 px, con manifiesto web (`manifest.webmanifest`) para instalarla en el celular.
- **Colores**: se mantienen los tokens luminosos de la V4 (coral, celeste, turquesa, amarillo, naranja); se agregó `--marca` (azul marino del logo) solo para el nombre. No hay fondos oscuros ni verde oscuro. La prueba de contraste de la V4 (16 pares, WCAG 2.2 ≥ 4,5:1) sigue pasando.

## 4. Navegación inferior

| Icono | Muestra | Si no hay partida |
|---|---|---|
| Inicio | Logo, las tres modalidades, partida en curso o guardada | — |
| Simulación | Mes y trimestre, escena del negocio, indicadores breves, la situación del momento | Deshabilitado; al tocarlo se queda en Inicio con un aviso |
| Finanzas | Indicadores de la modalidad, estado de resultados, balance, inventario, dinero personal, punto de equilibrio, evolución mensual, supuestos | Deshabilitado; mismo comportamiento |
| Progreso | Índice, estilo de dirección, metas, logros, historia de decisiones y partidas guardadas | Muestra los 9 logros y el botón para empezar, nunca una pantalla vacía |

Funciona igual en computadora y celular (botones de 48 px o más, fija abajo, respeta la zona segura del teléfono).

## 5. Indicadores por modalidad

Todos salen del motor (`indicadores()` en `motor.js`) y cada uno muestra su fórmula en la pantalla.

**Comida rápida (Fernando)**: platos vendidos (= comensales atendidos, suponiendo 1 plato por visita); precio promedio por plato = ventas ÷ platos; ventas; costo de ingredientes (costo promedio ponderado); mermas; otros gastos operativos (envases y gas, gastos fijos, ayudantes, depreciación); resultado del negocio; caja disponible; dinero personal de Fernando; capacidad de reposición = caja ÷ costo de una semana de ingredientes; inventario de ingredientes.

**Taxi y delivery**: pedidos y viajes atendidos; comisión promedio por pedido (el ingreso de la plataforma, no la tarifa completa del viaje); ingresos por comisiones; costos operativos por pedido; gastos fijos y sueldos; uso de la capacidad de la red; pedidos no atendidos; resultado; caja.
*Pendiente*: **conductores y repartidores activos**. El motor modela la capacidad de la red en pedidos, no en personas. Para mostrarlo haría falta una variable de afiliados y una regla de pedidos por afiliado; no se inventó.

**Venta de productos**: unidades vendidas; precio promedio; costo de compra de lo vendido; ingresos; inventario disponible (unidades y Bs); resultado; efectivo disponible para reposición = caja ÷ costo de compra de un mes de ventas; caja.

## 6. Parámetros iniciales

Todos son **supuestos del simulador** y se muestran en la presentación de cada negocio y en Finanzas.

| Parámetro | Taxi y delivery | Venta de productos | Comida rápida (Fernando) |
|---|---|---|---|
| Precio de referencia | Bs 6 de comisión por pedido | Bs 180 por unidad | Bs 15 por plato |
| Costo variable por unidad | Bs 2,60 (operativo) | Bs 115 = 90 de compra + 25 de envío y comisión | Bs 5,70 = 5,10 de ingredientes + 0,60 de envases |
| Clientes × frecuencia anual | 4.000 × 30 | 1.000 × 3 | 200 × 32 |
| Capacidad | 135.000 pedidos/año | 3.400 unidades/año | 700 platos/mes (8.400/año), Fernando solo |
| Gastos operativos | Bs 150.000/año | Bs 62.000/año | Bs 550/mes + Bs 100 de permiso municipal (tasa), sin alquiler |
| Personal (V5.2) | 4 personas × Bs 3.500 + aportes patronales 17,21 % + aguinaldo | 1,5 jornadas × Bs 3.300 (salario mínimo 2026, DS 5516) + aportes y aguinaldo | El dueño solo, sin sueldo; la ayuda que contrate se paga al salario mínimo con cargas |
| Activo fijo inicial | — | — | Carrito con plancha Bs 4.200 (8 años) + utensilios Bs 800 (4 años) |
| Caja inicial | Bs 150.000 | Bs 50.000 | Bs 4.000 |
| Mercado potencial | 33.000 usuarios | 8.500 clientes | 2.000 comensales |
| Elasticidad base (ε) | 1,4 | 2,0 | 1,6 |
| Impuesto | IUE (régimen general) | IUE (régimen general) | Régimen Tributario Simplificado |

Primer mes proyectado (medido con el motor):

| | Ventas | Unidades | Costo de lo vendido / operativo | Mermas | Gastos operativos, tasas e innovación | Personal (sueldos + aportes + aguinaldo) | Impuesto | Resultado |
|---|---|---|---|---|---|---|---|---|
| Taxi y delivery | Bs 60.311 | 10.052 pedidos | Bs 25.567 | — | Bs 13.978 | Bs 17.576 (14.000 + 2.409 + 1.167) | Bs 891 (provisión IUE) | Bs 2.674 |
| Venta de productos | Bs 45.012 | 250 | Bs 22.506 + 6.252 | Bs 56 | Bs 5.797 | Bs 6.214 (4.950 + 852 + 413) | Bs 1.047 (provisión IUE) | Bs 3.140 |
| Comida rápida | Bs 8.016 | 534 platos | Bs 2.725 + 321 de envases | Bs 68 | Bs 650 + depreciación 60 | Bs 0 | Bs 0 (excluido del RTS) | Bs 4.191 |

En la V5.1 los resultados eran Bs 2.731 (Delivery) y Bs 4.051 (Productos). La diferencia viene del costo laboral legal y completo (§8.1).

En Comida rápida, los Bs 8.016 y Bs 4.191 **resultan** de los parámetros. En la V5.1 el resultado sube respecto a la referencia hipotética de Bs 3.000 porque se quitaron costos propios de un negocio más grande (espacio de Bs 500 al mes y costo de innovación). Incluye lo que el dueño gana por su trabajo, porque no cobra sueldo.

## 7. Regla de demanda por precio

**Regla** (categoría B en su dirección, C en su magnitud):

clientes activos = clientes al precio de referencia × máx(0; 1 − ε × (precio ÷ precio de referencia − 1)), con tope de 1,8
ε = elasticidad de la modalidad × (1,5 − (satisfacción + reputación) ÷ 200)

- **Dirección**: ley de la demanda (Mankiw, 2021): si sube el precio, se compra menos. La elasticidad es mayor cuando hay muchos sustitutos cercanos; por eso Venta de productos (compras por internet, fáciles de comparar) tiene la más alta.
- **Magnitud**: supuesto pedagógico. Se eligió una regla lineal y no de elasticidad constante porque con elasticidad constante cercana a 1 subir el precio sin límite casi no cambia los ingresos y siempre aumenta la utilidad. Con la regla lineal, el precio que maximiza la ganancia queda cerca del precio de referencia (+1 % en Comida rápida, +7 % en las otras dos). Subir o bajar mucho el precio no conviene.
- **Ingresos**: siempre ventas = unidades realmente vendidas × precio efectivo. Si el usuario cambia el precio inicial, la demanda del primer mes se ajusta con la misma regla.
- **Precio de referencia del mercado**: dos situaciones lo mueven: un competidor que copia tu oferta (−5 %) y la inflación (+4 %). Por eso “absorber la inflación” ahora te vuelve relativamente más barato.
- **Cambios en las decisiones**: se quitaron 15 cambios fijos de clientes que eran solo consecuencia del precio. Se mantuvieron, documentados, los que corresponden a otra causa: un segmento nuevo (versión premium, segunda marca) o un lanzamiento exitoso.

## 8. Fórmulas financieras (por mes)

### 8.1 Ventas y costos
- unidades = mín(demanda del mes; capacidad del mes; insumos disponibles)
- demanda del mes = clientes activos × frecuencia anual ÷ 12
- capacidad del mes = mín(instalaciones; personal × unidades por persona) × (0,75 + productividad ÷ 200) ÷ 12
- costo de lo vendido = unidades × costo promedio ponderado del inventario (Comida y Venta de productos)
- otros costos variables = unidades × parte no inventariable del costo × eficiencia
- gastos operativos = gastos operativos anuales ÷ 12; patentes y tasas = tasas anuales ÷ 12; innovación = 7 % × ventas × innovación ÷ 100 ÷ 12 (en Comida, solo la innovación agregada)
- personal (V5.2) = sueldos (personas contratadas × sueldo mensual + bonos, horas extra y aumentos) + aportes patronales 17,21 % + provisión de aguinaldo 1/12; el aguinaldo se paga al cerrar el mes 12. En Comida el dueño no cobra sueldo: vive de sus retiros

### 8.2 Resultado del mes
Resultado antes de impuestos = ventas − costo de lo vendido − mermas − otros costos variables − gastos operativos − patentes y tasas − innovación − personal − gastos por decisiones − depreciación − intereses − comisión del crédito de emergencia + ingresos financieros y otros ingresos. La pantalla «Detalle contable» muestra este cálculo con los subtotales de margen de contribución y resultado operativo.

### 8.3 Impuestos
- **IUE** (Ley 843): 25 % de la utilidad neta. Cada mes se registra una provisión igual a 25 % × máx(0; resultado acumulado de la gestión + multas, que no se deducen) menos lo ya provisionado. Un mes con pérdida reduce la provisión. No sale de la caja durante los 12 meses (vence a los 120 días del cierre de la gestión) y aparece como “IUE por pagar”.
- **Régimen Tributario Simplificado** (DS 24484, DS 27924 y DS 3698, verificados en LexiVox): el dueño del carrito es vivandero. El capital es inventario más equipos netos, sin el efectivo. Con capital de hasta Bs 12.000 queda **excluido** del régimen; de Bs 12.001 a 15.000 paga Bs 47 bimestrales, y así hasta Bs 350 para 37.001–60.000. V5.2: la cuota se fija al empezar cada bimestre, se reconoce la mitad cada mes (gasto y “cuota del RTS por pagar”) y se paga al cerrar el primer mes del bimestre siguiente. Si las ventas acumuladas superan Bs 184.000, el capital Bs 60.000 o el precio Bs 148 por plato, se avisa que el régimen general rige desde la gestión siguiente (art. 13).
- Simplificación declarada: el simulador no calcula IVA ni IT en el régimen general (los precios se tratan como netos, coherente con el precio neto de la Ley 1733 de 2026). El detalle contable lo indica y muestra el IT de referencia. Tabla completa en `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md`.

### 8.4 Registro contable de cada decisión
Cada opción tiene un tipo contable, explícito o deducido de sus efectos:

| Tipo | Registro | Ejemplo |
|---|---|---|
| Gasto | caja − ; resultado del mes − | campaña publicitaria, capacitación, multa |
| Inversión | caja − (o deuda +) ; activo fijo + (vida 8 años) | ampliar el carrito, comprar equipos |
| Computación | igual, con vida de 4 años | sistema de ventas y contabilidad |
| Financiamiento | caja + ; deuda + | préstamo como colchón |
| Aporte | caja + ; capital + | socio o inversionista |
| Anticipo | caja − ; anticipo a proveedores + (se consume con las compras) | pago adelantado al proveedor |
| Cuentas por cobrar / por pagar | caja − ; CxC + / caja + ; CxP + | venta a 60 días / plazo del proveedor |
| Reparto de utilidades | la parte del dueño pasa a su dinero personal; la de los socios sale | repartir utilidades; en Comida: “Llevarte una parte extra para ti” |
| Venta de activo | caja + ; activo fijo − (valor en libros); diferencia a resultado. V5.2: precio de hasta 10 % sobre el valor en libros; sin equipos no hay venta | vender equipos que casi no usas |
| Multa (V5.2) | caja − ; gasto del mes que no se deduce para el IUE | multa por errores en declaraciones, multa ambiental |

En la pantalla de resultado de cada decisión hay un desplegable “Cómo se registra en las cuentas” con el movimiento de cada cuenta.

### 8.5 Balance
Activo (caja + inventario + cuentas por cobrar + anticipos + activo fijo neto) = Pasivo (deuda + proveedores por pagar + IUE por pagar + cuota del RTS por pagar + aguinaldo por pagar) + Patrimonio (capital + resultados acumulados − retiros del dueño − utilidades pagadas a socios). Se comprueba después de cada paso en 1.512 partidas: la diferencia máxima fue Bs 0,000000000175. Desde la V5.2 también se comprueba el flujo de caja de cada mes: caja inicial + movimientos − retiros = caja final.

### 8.6 Otros
- Intereses del mes = deuda × (tasa anual + recargo por apalancamiento, máximo 15 puntos) ÷ 12. Amortización = 20 % anual ÷ 12 de la deuda.
- Depreciación = costo ÷ vida útil en meses (DS 24051: maquinaria y equipos 8 años; equipos de computación 4 años).
- Rendimiento de la caja: si la caja supera el 10 % de las ventas anuales, 3 % anual ÷ 12, como ingreso financiero.
- Crédito de emergencia: si la caja queda en rojo, el banco cubre el faltante y, en negocios con inventario, una compra más (capital de trabajo), con 10 % de comisión. Hay quiebra si la deuda supera el 85 % de las ventas anuales o si ya hubo 3 rescates.
- Valor estimado del negocio: indicador del simulador (3,5 × resultado recurrente anualizado + 0,65 × ventas anuales + caja y capital de trabajo − deudas, ajustado por reputación e innovación). Usa el resultado **recurrente**, sin los gastos puntuales de las decisiones. No es una valuación profesional.

## 9. Sistema de inventario

Aplica a Comida rápida y Venta de productos (Taxi y delivery es una plataforma de servicios: no tiene inventario).

- **Estado**: unidades en inventario y costo promedio ponderado; plan de compra automático o manual.
- **Compra por ciclos**: Comida compra 4 veces al mes (semanal) y Venta de productos 2 (quincenal). En cada ciclo se compra con la caja disponible (más el anticipo al proveedor, si hay) y lo vendido financia la compra siguiente. Así, con poca caja se vende algo, pero menos.
- **Compra automática**: lo que se espera vender en el mes más un stock de seguridad (Comida 5 %, Productos 25 %), menos lo que ya hay.
- **Costo de lo vendido**: unidades × costo promedio ponderado.
- **Mermas**: una parte de lo que sobra a fin de mes se pierde (Comida 50 %, perecible; Productos 1 %), y la productividad la reduce.
- **Control contable**: inventario inicial + compras − costo de lo vendido − mermas = inventario final. Se prueba en cada cierre.
- **Capacidad de reposición**: si Fernando retira o gasta el dinero que necesita para comprar ingredientes, vende menos aunque tenga clientes. La pantalla avisa cuando un retiro deja la caja por debajo de un ciclo de compras.

Pruebas: identidad del inventario, costo promedio, plan manual, mermas por compras excesivas, ventas limitadas por falta de caja, financiamiento entre ciclos (`motor.test.js`).

## 10. Comida rápida (pequeño emprendimiento; datos de referencia del caso Fernando)

- Empieza **solo** (sin empleados), con un carrito y utensilios por Bs 5.000 frente a una universidad y Bs 4.000 de caja propia. En la aplicación no aparece ningún nombre de personaje: el negocio se llama «Mi carrito de comida» y el dueño es el jugador.
- Administra la compra de ingredientes, el precio por plato, los comensales, los costos de preparación (ingredientes, envases y gas), los gastos del carrito, las mermas, la caja y la reposición, y en Finanzas sus retiros, gastos personales, ahorro y presupuesto.
- Si contrata ayuda, paga solo la fracción de jornada, al salario mínimo nacional 2026 (Bs 3.300, DS 5516), más aportes patronales y aguinaldo. El cartel muestra “Tú + 0,2 jornada de ayuda”. Sin ayuda contratada no aparecen conflictos laborales ni horas extra (V5.2).
- Tributa en el Régimen Tributario Simplificado (§8.3).
- Seis situaciones que no aplican a un carrito sin empleados no aparecen en esta modalidad (despidos por reestructuración, retener al mejor gerente, fondo de inversión, compra de un competidor, capacitación y rotación de personal). Desde la V5.2, 27 situaciones usan textos propios: ayudante para las horas pico, segundo carrito en otra facultad, feria gastronómica de otra ciudad, cocina mejor equipada, entre otras.
- El dinero de las decisiones es proporcional a sus ventas, así que todo queda a escala de carrito: por ejemplo, la campaña fuerte cuesta ≈ Bs 1.150.

## 11. Evolución visual

**Después de cada decisión** (lo inmediato) la escena se dibuja con variables reales del motor:

| Elemento | Depende de |
|---|---|
| Clientes en la fila (comida) | 4 × unidades del mes ÷ unidades iniciales |
| Pedidos en el mapa (delivery) | 4 × pedidos del mes ÷ iniciales |
| Paquetes saliendo (productos) | 3 × unidades del mes ÷ iniciales |
| Plancha extra, conservadora, toldo, mesas, puesto | capacidad (1,1 / 1,25 / 1,4 / 1,6 × la inicial) e inversiones registradas |
| Ayudante | personal además de Fernando ≥ 0,15 jornada |
| Cajas de ingredientes o productos | lo que se puede reponer con la caja (o el inventario) |
| Repartidores, autos, central | capacidad de la red |
| QR de cobro, estrellas, cartel de promoción | innovación o sistema comprado, reputación ≥ 60, impulso comercial vigente |
| Cielo gris, tormenta y aviso | dificultades (caja negativa, riesgo ≥ 60, pérdida con menos de medio mes de caja, quiebra) |

Por eso una buena decisión que no aumenta la demanda no agrega clientes, y una mala con poco efecto no vacía la escena. Ambas cosas están probadas. La pantalla de resultado muestra la escena nueva y la lista de lo que cambió (por ejemplo, “Clientes en la escena: 4 → 5”, “Aparece: plancha extra”).

**Evolución acumulada**: la etapa general (Inicial, En desarrollo, Estable, Consolidado) sigue usando 8 criterios, recalibrados para 12 meses: ventas ≥ 1,15 y ≥ 1,4 veces las iniciales; capacidad ≥ 1,15 y ≥ 1,4; reputación ≥ 60; riesgo < 35; caja para 1 mes; al menos 3 meses cerrados con resultado acumulado positivo. Consolidado exige además ventas y capacidad de 1,4 veces las iniciales; un negocio en dificultades nunca se muestra consolidado.

Distribución al final del año en 1.512 partidas simuladas:

| | Inicial | En desarrollo | Estable | Consolidado | En dificultades |
|---|---|---|---|---|---|
| Taxi y delivery | 2,8 % | 30,0 % | 48,2 % | 19,0 % | 3,0 % |
| Venta de productos | 23,6 % | 40,9 % | 33,3 % | 2,2 % | 35,1 % |
| Comida rápida | 2,4 % | 43,3 % | 45,6 % | 8,7 % | 15,5 % |

(V5.2; regresión de 1.512 partidas, `work/regresion_v52.txt`.)

## 12. Horizonte temporal: de 5 años a 12 meses

**Evaluación.** Se decidió cambiar el horizonte por tres razones. Primero, el caso Fernando (carrito, compras semanales, retiros para vivir) se entiende mes a mes. Segundo, el presupuesto personal de la V3 ya era mensual. Tercero, las 25 situaciones caben en un año sin perder variedad. En contra: en un año el negocio crece menos y las inversiones tienen menos tiempo para recuperarse. Por eso se recalibraron los montos de las decisiones y los umbrales.

**Calendario**: 12 meses; el mes 1 tiene 3 decisiones y cada uno de los demás tiene 2 situaciones. Los meses 3, 5, 7, 9 y 11 combinan 1 decisión y 1 evento. En total son 20 decisiones y 5 eventos, sin repeticiones (probado en 120 partidas). Los niveles pasan a trimestres: Emprendedor (meses 1–3), Gerente (4–6), Director (7–9) y CEO (10–12).

**No se cambió solo el texto. Conversiones aplicadas:**

| Concepto | V4 (anual) | V5 (mensual) |
|---|---|---|
| Ventas, costos, sueldos, gastos fijos | por año | ÷ 12, cada mes |
| Crecimiento orgánico | g anual | (1 + g)^(1/12) − 1 |
| Impulso comercial (publicidad) | se aplicaba año a año y decaía × 0,6 | se realiza 25 % por mes |
| Intereses | deuda × tasa | deuda × tasa ÷ 12 |
| Amortización | 20 % por año | 20 % ÷ 12 por mes |
| IUE | 25 % al cierre del año | provisión mensual del 25 % del acumulado |
| Mercado, sueldos, gastos | +3 %, +2,5 %, +2 % por año | potencia 1/12 cada mes |
| Convergencia de reputación, pérdida de innovación | por año | equivalente mensual |
| Efectos diferidos | “el año siguiente” | 3 meses después (6 si eran 2 años) |
| Estancamiento y caja ociosa | por año | revisión trimestral |
| Presupuesto personal | anual (12 × mensual) | mensual |

**Movimientos duplicados u omitidos**: cada movimiento de dinero ocurre una sola vez: en la decisión (gastos, inversiones, préstamos, retiros) o en el cierre (ventas, compras, operación, intereses, amortización, cuotas). Lo comprueban la identidad del balance en cada paso y la prueba de guardar a mitad de partida (el resultado final es idéntico al de una partida sin interrupción).

**Calibración del dinero de las decisiones**: con 12 meses, los gastos de las decisiones (medidos como fracción de las ventas anuales) consumían la caja. Se probaron combinaciones con la regresión:

| Factor del dinero de las decisiones | Gastos fijos de las decisiones | Quiebras en Comida | Quiebras del estilo “crecimiento” |
|---|---|---|---|
| 0,3 | 100 % | 10 % | 19 % |
| 0,3 | 50 % | 11 % | 15 % |
| **0,2 (elegido)** | **100 %** | **1 %** | **0 %** |
| 0,2 | 50 % | 1 % | 0 % |

Se eligió 0,2 manteniendo los gastos fijos recurrentes completos: el dinero puntual de una decisión equivale a fracciones de unos 2,4 meses de ventas. Es un **supuesto de calibración**.

**Comparación con el modelo anterior** (regresión: 1.500 partidas en la V4 y 1.512 en la V5, 7 estilos de juego automáticos):

| Estilo | Índice V4 | Índice V5 | Índice V5.2 | Quiebra V4 | Quiebra V5 | Quiebra V5.2 |
|---|---|---|---|---|---|---|
| Al azar | 60,2 | 56,4 | 55,2 | 3,7 % | 0,5 % | 1,9 % |
| Crecimiento | 58,8 | 59,4 | 58,7 | 6,0 % | 1,4 % | 0 % |
| Crecimiento prudente | 63,1 | 51,8 | 53,1 | 0 % | 1,4 % | 0 % |
| Innovación | 62,0 | 54,2 | 56,0 | 0,9 % | 0 % | 0,9 % |
| Rentabilidad (subir precios) | 63,1 | 48,9 | 49,8 | 0 % | 0 % | 0 % |
| Conservador | 66,1 | 65,6 | 64,9 | 0 % | 0 % | 0 % |
| Mixto prudente | 72,1 | 59,7 | 60,6 | 0 % | 0,9 % | 0,5 % |

| Final | V4 (por modalidad) | V5.1 (por modalidad) | V5.2 (por modalidad) |
|---|---|---|---|
| Quiebra | 1,2 / 1,0 / 2,4 % | 0,0 / 0,2 / 0,2 % | 0,0 / 0,8 / 0,6 % |
| Empresa en riesgo | 9,4 / 9,6 / 13,0 % | 25,4 / 36,5 / 2,4 % | 21,4 / 51,0 / 15,3 % |
| Pequeña pero muy rentable | 29,4 / 32,6 / 32,4 % | 16,5 / 15,5 / 0,2 % | 14,1 / 12,5 / 0,2 % |

(orden: Taxi y delivery / Venta de productos / Comida rápida)

**Lectura.**
- El estilo “rentabilidad” baja mucho porque ahora subir el precio una y otra vez cuesta clientes según la regla de demanda (sus ventas terminan en 0,63 veces las iniciales). Es el efecto buscado en §7.
- “Pequeña pero muy rentable” es menos frecuente: ahora exige mejorar el margen respecto al inicial, y los gastos puntuales ya pasan por el resultado.
- “Empresa en riesgo” es más frecuente porque en 12 meses las inversiones tienen menos tiempo para recuperarse, y porque Venta de productos y Comida empiezan con poca caja en relación con sus costos mensuales.
- V5.2: Venta de productos termina más veces «en riesgo» (51 %) porque su costo laboral ahora es legal y completo (antes pagaba Bs 2.500 sin cargas). Comida rápida sube de 2,4 % a 15,3 % porque contratar ayuda ahora cuesta lo que corresponde. No se bajaron otros costos para compensar: hacerlo sería maquillar el resultado. Si se quiere otra dificultad, hay que revisar los supuestos de gastos fijos con datos o con un docente (ver `PENDIENTES_V5_2.md`).
- Esta calibración es razonable para un juego, pero no está validada con estudiantes.

## 13. Cambios en las decisiones

- No cambió el número de decisiones (35), de eventos (13) ni de opciones (174), ni las 25 situaciones por partida.
- Se eliminaron los cambios de clientes fijados en opciones de precio (§7). La contraoferta al cliente clave pasó a ser un descuento puntual (gasto) en lugar de bajar el precio a todos.
- Dos situaciones ahora mueven el precio de referencia del mercado (competidor que copia, inflación).
- Los gastos recurrentes se muestran “al mes” y los textos con años se adaptaron a meses.
- Se agregó el tipo contable de cada opción (§8.4).
- Se aplicaron las exclusiones y los textos del caso Fernando (§10).
- El dinero puntual se multiplica por 0,2 (§12).
- V5.2: textos sin estructuras ni empleados inexistentes, efectos y registros propios por modalidad, gastos de personal y tributos en líneas propias. Detalle en `TABLA_SITUACIONES_CORREGIDAS_V5_2.md`.

El detalle opción por opción está en la matriz.

## 14. Pruebas y resultados

### 14.1 Automatizadas (V5.2, ejecutadas sobre una copia limpia del ZIP)

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `api.test.js` | Cuentas, sesiones, permisos, partidas, administrador | **30 / 30** |
| `finanzas.test.js` | Retiros, gastos, ahorro, presupuesto | **31 / 31** |
| `motor.test.js` | Calendario, regla de demanda, inventario, retiros, registro contable, IUE, RTS devengado y pagado, tasas, cargas sociales, Comida rápida, indicadores, guardar y continuar | **75 / 75** |
| `auditoria.test.js` (V5.2) | Textos de las situaciones, personal, provisiones, flujo de caja, impuestos, 10 escenarios del detalle contable, migración | **54 / 54** |
| `ilustraciones.test.js` | Etapas, escenas, estados de desempeño | **42 / 42** |
| `diseno.test.js` | Paleta clara, tokens, contraste | **30 / 30** |
| `regresion.sim.js` | Partidas completas con 7 estilos | **1.512 partidas, 0 errores**, diferencia máxima de balance 1,75 × 10⁻¹⁰ |
| `navegador.e2e.js` | Finanzas personales en el navegador, guardado y continuación con cuenta | **31 / 31** |
| `v5.e2e.js` | Identidad, navegación de 5 secciones en 5 anchos, escenas, dirección de 499 opciones aplicadas (3 modalidades) con balance cuadrado, partidas completas, capturas | **99 / 99** |
| `detalle.e2e.js` (V5.2) | Detalle contable en escritorio y celular, una sola fuente de datos, guardar y continuar, partida de la V5.1, capturas | **22 / 22** |

Detalle en `RESULTADOS_PRUEBAS_V5_2.md`.

### 14.2 Inspección visual
Se revisaron las capturas de `docs/capturas/` (portada, presentación, simulación, resultado de decisión, cierre de mes, finanzas, progreso, escritorio y resultado final). Se corrigieron:
- el encabezado amontonado en celular;
- la barra de 12 meses comprimida;
- una etiqueta que debía ser solo para lectores de pantalla;
- los importes que se partían en dos líneas;
- el gráfico demasiado alto en escritorio;
- la caída del valor de la empresa por un gasto puntual (§8.6).

### 14.3 Verificación manual por modalidad (guía)
1. En Inicio, revisa el logo, elige la modalidad, abre “Parámetros iniciales y supuestos” y pulsa Comenzar.
2. En Simulación: lee la compra de insumos (Comida y Productos), toma la decisión y abre “Cómo se registra en las cuentas”. Mira “Lo que cambió en tu negocio”.
3. Al cerrar el mes, revisa el estado de resultados y el aviso “Activo = Pasivo + Patrimonio”.
4. En Finanzas: compara los indicadores con el estado de resultados. Haz un retiro grande en Comida y verifica que baja la capacidad de reposición y las ventas proyectadas.
5. Cambia el plan de compra a manual con 0 y verifica que el carrito queda sin clientes. Vuelve a automático.
6. En Progreso revisa metas, logros e historia.
7. En el celular, comprueba que no haya desplazamiento lateral y que la barra inferior no tape botones.

### 14.4 Usuarios reales
**No se hicieron pruebas con estudiantes ni docentes.**

## 15. Limitaciones

1. Sin pruebas con usuarios reales; la claridad y el aprendizaje no están medidos.
2. Calibración por simulación con jugadores automáticos (factor 0,2, umbrales de etapas y finales), no con datos ni docentes.
3. Todas las cifras iniciales son supuestos; el caso Fernando usa supuestos hipotéticos.
4. No se modelan IVA ni IT en el régimen general (el detalle contable lo indica). La tabla del RTS se verificó con los DS 24484, 27924 y 3698. La Ley 1733 (2026) no modifica el RTS. Lista completa en `PENDIENTES_V5_2.md`.
5. Conductores y repartidores activos: pendiente (§5).
6. El “valor del negocio” es un indicador del simulador, no una valuación.
7. Las partidas guardadas en la V4 (5 años) no se pueden continuar en la V5: se pueden ver, pero no reanudar. Las de la V5 y la V5.1 sí continúan en la V5.2.
8. Probado en Chromium emulando pantallas, no en teléfonos físicos ni en Safari.
9. El juego se calcula en el navegador, como en versiones anteriores.

## 16. Bibliografía (APA 7)

Decreto Supremo N.º 24051 [Bolivia]. (1995). *Reglamento del Impuesto sobre las Utilidades de las Empresas* (anexo del art. 22: coeficientes de depreciación).

Decreto Supremo N.º 24484 [Bolivia]. (1997, 29 de enero). *Régimen Tributario Simplificado*. https://www.lexivox.org/norms/BO-DS-24484.html

Decreto Supremo N.º 27924 [Bolivia]. (2004, 20 de diciembre). *Modificaciones al Régimen Tributario Simplificado*. https://www.lexivox.org/norms/BO-DS-27924.html

Decreto Supremo N.º 3698 [Bolivia]. (2018, 25 de octubre). *Modificaciones al Régimen Tributario Simplificado*. https://www.lexivox.org/norms/BO-DS-N3698.html

Decreto Supremo N.º 5516 [Bolivia]. (2026). *Salario mínimo nacional para la gestión 2026* (Bs 3.300). Publicado en la Gaceta Oficial de Bolivia el 13 de enero de 2026.

Decreto Supremo N.º 5383 [Bolivia]. (2025, 1 de mayo). *Incremento salarial y salario mínimo nacional para la gestión 2025*. https://www.lexivox.org/norms/BO-DS-N5383.html

European Commission & OECD-INFE. (2022). *Financial competence framework for adults in the European Union*. https://www.oecd.org/finance/financial-competence-framework-for-adults-in-the-european-union.htm

Harrison, R., Flood, D., & Duce, D. (2013). Usability of mobile applications: Literature review and rationale for a new usability model. *Journal of Interaction Science, 1*, Artículo 1. https://doi.org/10.1186/2194-0827-1-1

Kolb, D. A. (2015). *Experiential learning: Experience as the source of learning and development* (2.ª ed.). Pearson Education.

Ley N.º 1582 [Bolivia]. (2024, 1 de octubre). *Modificación del aporte patronal solidario* (art. 87 de la Ley 065). https://bolivia.infoleyes.com/norma/8275/ley-1582

Ley N.º 1733 [Bolivia]. (2026, 27 de mayo). https://www.impuestos.gob.bo/wp-content/uploads/2026/05/L17332051NCPP.pdf

Ley N.º 843 de Reforma Tributaria [Bolivia], Título III, Impuesto sobre las Utilidades de las Empresas (texto ordenado vigente).

Mankiw, N. G. (2021). *Principles of economics* (9.ª ed.). Cengage Learning.

OECD. (2018). *OECD/INFE core competencies framework on financial literacy for MSMEs*. OECD Publishing. https://doi.org/10.1787/220101c9-en

Sitzmann, T. (2011). A meta-analytic examination of the instructional effectiveness of computer-based simulation games. *Personnel Psychology, 64*(2), 489–528. https://doi.org/10.1111/j.1744-6570.2011.01190.x

Vlachopoulos, D., & Makri, A. (2017). The effect of games and simulations on higher education: A systematic literature review. *International Journal of Educational Technology in Higher Education, 14*, Artículo 22. https://doi.org/10.1186/s41239-017-0062-1

W3C. (2024). *Web Content Accessibility Guidelines (WCAG) 2.2* (W3C Recommendation). https://www.w3.org/TR/WCAG22/

**Verificación**: los decretos 24484, 27924 y 3698 se consultaron en LexiVox en la V5.2 (exclusión por capital, tabla del RTS, límites de capital, ventas y precio, y salida del régimen). El salario mínimo 2026 (DS 5516), la Ley 1582 y la Ley 1733 se verificaron en las fuentes citadas en `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md`. El DS 5383 (2025) queda como antecedente. La tabla de depreciación del DS 24051 se consultó en una fuente secundaria especializada; conviene cotejarla con el texto oficial. Los DOI y las referencias de la V4 se habían verificado en Crossref.
