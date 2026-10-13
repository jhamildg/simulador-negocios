# «Detalle contable»: la nueva opción para consultar los números

## Dónde está

Es una sección más de la barra inferior: **Inicio · Simulación · Finanzas · Detalle · Progreso**. En la barra se llama «Detalle», para que entre en celulares de 360 px; los lectores de pantalla la anuncian como «Detalle contable».

- Funciona igual en computadoras y celulares.
- Sin partida en curso aparece deshabilitada, como Simulación y Finanzas.
- Finanzas conserva todos sus paneles y tiene un enlace «Ver el detalle contable».
- La pantalla final y el estado de resultados también enlazan aquí.

Un selector de **Período** permite elegir:

- cualquier **mes cerrado**, con las cifras registradas al cerrarlo;
- el **mes en curso**, con la proyección de las decisiones tomadas hasta ese momento.

## Qué muestra

| Sección | Contenido |
|---|---|
| A. Resumen del período | Mes, ventas, costos variables, gastos, resultado del mes, resultado acumulado, efectivo, deudas (banco y proveedores) e impuestos pendientes. Muestra un aviso si el cálculo no coincide con el registro del motor. |
| B. Ingresos | Unidades vendidas (platos, pedidos o unidades), precio efectivo por unidad, total de ventas o de comisiones, ingresos por decisiones e intereses ganados, si los hay. |
| C. Costos y gastos | Cada concepto por separado, con cero cuando no corresponde, para que se vea el cálculo completo. Abajo, el desplegable «Ingresos y gastos por decisiones» lista cada partida con su nombre. Las multas se marcan como no deducibles. Los conceptos por modalidad están en la tabla siguiente. |
| D. Cálculo del resultado | Ventas − costo de ventas − costos variables = **margen de contribución** − gastos operativos, tasas e innovación − personal − depreciación ± decisiones = **resultado operativo** ± resultado financiero = **resultado antes de impuestos** − impuesto reconocido = **resultado neto**. Cada línea con «=» es la suma de las anteriores. |
| E. Situación financiera | **Activo**: efectivo, inventario, cuentas por cobrar, anticipos, activo fijo neto. **Pasivo**: deuda bancaria, proveedores por pagar, IUE por pagar, cuota del RTS por pagar, aguinaldo por pagar. **Patrimonio**: capital, resultados acumulados, retiros del dueño, utilidades pagadas a socios. Con el control «Activo = Pasivo + Patrimonio». |
| F. Impuestos | Una tarjeta por obligación: nombre, régimen, base, regla o cuota, importe calculado en el mes, pagado en el mes, saldo pendiente, período y estado («Modelado…» o «No modelado»). En el régimen general dice expresamente que el IVA y el IT no se calculan e informa el IT de referencia. Aclara que no es una declaración ni una liquidación oficial. |
| Movimientos de la caja | Caja inicial, cobros y pagos del mes por tipo, movimientos de cada decisión, retiros del dueño y caja final, con el control «la caja inicial más los movimientos da la caja final». En el mes en curso muestra lo ocurrido hasta ahora; las ventas, compras y pagos se registran al cerrar. |
| G. Evolución mensual | Gráfico de barras por mes con las ventas y con la suma de costos, gastos e impuestos; al tocar o pasar el cursor por una barra se ven los importes y el resultado. Debajo, una tabla con ventas, costos variables, gastos, impuesto reconocido, impuesto pagado, resultado, caja, deuda e inventario. Debajo de 900 px la tabla se convierte en tarjetas, sin desplazamiento horizontal. |

Conceptos de la sección C por modalidad:

- **Comida rápida**: ingredientes consumidos, mermas, envases, gas y otros gastos del carrito, permiso municipal, innovación, sueldos de la ayuda contratada, aportes, aguinaldo, depreciación, intereses, comisión de emergencia y gastos por decisiones.
- **Taxi y delivery**: costo operativo por pedido (incentivos a afiliados, pasarela y soporte), gastos operativos, sueldos, aportes y aguinaldo.
- **Venta de productos**: costo de compra de lo vendido, mermas, envío y comisión de pago, y el resto de gastos.

## Una sola fuente de datos

La pantalla no tiene un sistema contable propio. Todo sale de la función `detalleContable(estado, mes)` del motor (`frontend/motor.js`):

- **Mes cerrado**: usa el registro que el cierre (`closeMonth`) guarda en el historial, con las mismas variables del estado de resultados y del balance. En la V5.2, el cierre guarda además el desglose de cada concepto, las partidas de decisiones, el flujo de caja y una foto del balance.
- **Mes en curso**: usa la misma proyección (`proj`) que el resto de la interfaz.
- **Totales derivados**: los arma con esas cifras. «Gastos» de la evolución = ventas − costos variables − resultado antes de impuestos, para que cada fila cuadre por construcción.

Para registrar esos datos se agregaron al motor tres cosas:

- el desglose de los gastos en el cierre;
- la lista de partidas por decisión;
- el registro de los movimientos de caja.

Las pruebas comprueban que esos agregados no cambian el resultado económico:

- cada subtotal del detalle es igual al registro del motor;
- las partidas de decisiones suman exactamente los gastos e ingresos por decisiones;
- la caja inicial más los movimientos menos los retiros es igual a la caja final;
- guardar y continuar da el mismo detalle.

## Se actualiza con cada acción

| Acción | Qué cambia en el detalle |
|---|---|
| Tomar una decisión | Proyección del mes; la partida aparece en «Ingresos y gastos por decisiones» y en «Movimientos de la caja» |
| Comprar inventario (plan de compra) | Proyección de compras, costo de lo vendido e inventario |
| Vender (cierre del mes) | Ventas, costo de lo vendido, inventario y flujo |
| Contratar personal | Sueldos, aportes y aguinaldo |
| Retirar dinero en Finanzas | Caja, retiros del dueño y patrimonio |
| Cerrar el mes | El mes pasa a «cerrado» con sus cifras definitivas |

## Partidas guardadas antes de la V5.2

Se abren con normalidad:

- Los meses cerrados con versiones anteriores muestran los gastos fijos, de personal y de innovación juntos, con un aviso.
- Si el mes en curso ya había empezado, su flujo de caja queda marcado como incompleto.
- Desde el mes siguiente todo se registra con detalle.

## Pruebas

- `auditoria.test.js`, sección 5. Diez escenarios, cada uno con su comprobación de cuadre:
  - sin ventas;
  - ventas normales;
  - pérdidas;
  - personal contratado;
  - con inventario;
  - sin inventario;
  - deuda;
  - retiros;
  - impuestos pendientes;
  - obligación pagada.

  También prueba la actualización después de una decisión o un retiro, y la evolución mensual.
- `detalle.e2e.js`. En el navegador:
  - cifras en pantalla iguales a las del motor;
  - selector de período;
  - actualización después de una decisión y de un retiro;
  - navegación entre las 5 secciones;
  - impuestos de Delivery;
  - celular de 360 y 390 px sin desplazamiento horizontal;
  - guardar, recargar y continuar con el detalle idéntico;
  - partida de la V5.1;
  - consola sin errores.
