# Changelog V5.2 (auditoría sobre la V5.1)

Esta versión se trabajó sobre la V5.1. Se conservan:

- las tres modalidades;
- 12 meses con 25 situaciones;
- las finanzas personales;
- el inventario;
- las cuentas y las partidas guardadas;
- las ilustraciones con estados de desempeño;
- la quiebra y la recuperación.

Es una revisión de la V5: el número de versión no pasa a V6. Las partidas guardadas con la V5 o la V5.1 se abren y continúan (§6).

Documentos de esta revisión:

- `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md`: hallazgos, tablas de impuestos por modalidad y personal.
- `TABLA_SITUACIONES_CORREGIDAS_V5_2.md`: textos antes y después.
- `DETALLE_CONTABLE.md`: la nueva opción.
- `RESULTADOS_PRUEBAS_V5_2.md`.
- `PENDIENTES_V5_2.md`.

## 1. Situaciones sin estructuras que no existen

- Ya no aparece «el directorio». La situación de riesgos ahora parte de un imprevisto real (un robo o un incendio a otro comerciante).
- Tampoco aparecen «gerente» ni «gerencias»: se usa «tu empleado con más experiencia» y «asesoría externa de gestión».
- Ya no se habla de socios que no existen. Las opciones dicen «Retirar utilidades para ti» o «Repartir entre tú y tus socios», y «Conseguir un socio» o «Pedir un aporte a tus socios», según el estado de la partida.
- Ya no aparecen «el equipo espera» ni «tu equipo propone» en un negocio sin equipo.
- Comida rápida tiene ahora textos propios en 27 situaciones (antes 9), a la escala de un carrito: crédito, costos, riesgos, tecnología, segunda línea de platos, auspicio, competidor, cliente importante, remate, falla, tributos, sostenibilidad, inversionista, falta de personal y otras.
- Textos que dependen del estado: el motor admite textos de situaciones y opciones que cambian según haya ayuda contratada o socios.

## 2. Personal

- «Horas punta» pasó a «horas pico». La palabra «pado» no existía en el código.
- Contratar ayuda solo trae más clientes si ya faltaba capacidad (90 % de uso o más). Si no, mejora la atención y lo explica.
- En Comida rápida, con el dueño solo:
  - el conflicto laboral no puede salir;
  - «alargar tu jornada» no paga horas extra;
  - los mensajes dicen «trabajas solo» y proponen contratar ayuda o moderar los pedidos;
  - el segundo carrito lleva un vendedor a medio tiempo;
  - las opciones que contratan ayuda lo dicen.
- Costo laboral completo: sueldo + aportes patronales (17,21 %) + provisión de aguinaldo (1/12), que se paga al cerrar el mes 12.
- Salario mínimo nacional 2026: Bs 3.300 (DS 5516).
  - Venta de productos: 1,5 jornadas al salario mínimo (antes 2 × Bs 2.500, por debajo del mínimo legal).
  - Taxi y delivery: 4 personas × Bs 3.500 (antes 5), con un costo laboral total parecido al anterior.
- Los bonos, las horas extra y los aumentos son gasto de personal, ya no gasto operativo. Bajan en proporción si hay despidos.
- Nuevo efecto `empN` (personas contratadas en jornadas completas) y efectos propios por modalidad (`oe`) y por registro contable (`ot`).

## 3. Contabilidad e impuestos

- **RTS**:
  - la cuota se devenga mes a mes (la mitad de la cuota bimestral), queda como «cuota del RTS por pagar» y se paga al cerrar el primer mes del bimestre siguiente;
  - con capital de hasta Bs 12.000 el negocio queda **excluido** del régimen;
  - si supera los límites (ventas acumuladas, capital o precio por plato), el aviso dice que el régimen general rige **desde la gestión siguiente** (DS 24484 art. 13).
- **IUE**: las multas no se deducen.
- **IVA e IT**: siguen sin calcularse, y ahora se dice expresamente en el detalle.
- **Patentes y tasas municipales**: tienen una línea propia (el permiso de Comida, Bs 100, sale de los gastos operativos con el mismo total). El evento «Suben patentes y tasas» las afecta.
- **Venta de activos**: solo se vende lo registrado, a no más del 10 % sobre el valor en libros.
- **Comisión del crédito de emergencia**: siempre como gasto financiero.
- **Reparto de utilidades sin socios**: todo va al dueño (sin restos por redondeo).
- **Cada cierre guarda**: desglose de gastos, partidas por decisión, provisión o cuota, pagos de impuestos y aguinaldo, flujo de caja del mes y balance.

## 4. Nueva opción «Detalle contable»

- Quinta sección de la barra inferior.
- Contenido:
  - resumen;
  - ingresos;
  - costos y gastos;
  - cálculo del resultado;
  - situación financiera;
  - impuestos;
  - movimientos de la caja;
  - evolución mensual (gráfico y tabla).
- Selector de período: meses cerrados y mes en curso.
- Usa una sola fuente de datos: `detalleContable()` del motor.
- Enlaces desde Finanzas y desde la pantalla final, que ahora también muestra las obligaciones tributarias pendientes.
- Glosario nuevo: «Aportes patronales y aguinaldo» y «Provisión». El de «Impuestos» se actualizó.

## 5. Interfaz

- La barra inferior tiene 5 secciones, con botones de 44 px o más en celulares de 360 px.
- Se quitó el desplazamiento de 3 px al pasar el cursor sobre las opciones y las tarjetas de la portada. Hacía temblar el elemento cuando el cursor quedaba en el borde, y era la causa de un fallo intermitente de las pruebas (`element is not stable`).
- Las opciones de vender equipos avisan cuando no hay equipos registrados.
- Se corrigió la etiqueta «Costo por plato (ingredientes + envases y gas)»: el gas está en los gastos operativos desde la V5.1.
- Supuesto de Taxi y delivery: la caja inicial es «capital aportado por el dueño» (antes decía «por los socios», pero el dueño tiene el 100 %).

## 6. Compatibilidad

- `migrarEstado()` completa los campos nuevos de las partidas de la V5 y la V5.1:
  - mueve el permiso municipal de Comida a tasas, con el mismo total;
  - recalcula la cuota del RTS del bimestre;
  - suma las ventas del año.
- Los meses cerrados antes se muestran sin desglose, con un aviso. El balance sigue cuadrando (prueba automática).
- Las partidas guardadas conservan su plantilla (por ejemplo, 5 personas en Delivery), pero desde ahora pagan aportes y aguinaldo.
- Si se migra a mitad de un bimestre del RTS, solo se registra la mitad de esa cuota. Es una diferencia de transición.

## 7. Pruebas nuevas o modificadas

- `auditoria.test.js` (nueva, 54 pruebas). Ya forma parte de `npm test`.
- `detalle.e2e.js` (nueva, 22 pruebas). Ejecutar después de `v5.e2e.js`.
- `motor.test.js` (75): actualizada por el RTS devengado, las tasas y las cargas sociales.
- `v5.e2e.js` (99): 5 secciones, y la dirección de las opciones con los efectos propios de cada modalidad (499 opciones aplicadas).
- `navegador.e2e.js` (31): el resumen guardado ahora compara con los retiros reales, incluido un reparto de utilidades si salió al azar.

## 8. Archivos modificados

- `frontend/motor.js`, `frontend/index.html`;
- `backend/package.json` (5.2.0);
- `backend/test/motor.test.js`, `v5.e2e.js`, `navegador.e2e.js`;
- `INFORME_EVOLUCION_SIMULADOR.md`, `README.md`, `MATRIZ_TRAZABILIDAD_DECISIONES.md` (regenerada);
- `docs/capturas/` (regeneradas, con 7 nuevas).

Archivos nuevos:

- `backend/test/auditoria.test.js`, `backend/test/detalle.e2e.js`;
- los cinco documentos listados al inicio.

Sin cambios: `frontend/ilustraciones.js`, `frontend/finanzas-personales.js`, `backend/server.js` y `backend/db.js`.
