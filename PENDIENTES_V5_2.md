# Limitaciones que siguen pendientes — V5.2

Ninguna de estas limitaciones impide jugar ni rompe la contabilidad. El balance y el flujo de caja cuadran en todas las pruebas. Pero conviene conocerlas antes de usar el simulador en clase.

## Impuestos

1. **IVA (13 %) e IT (3 %) no se calculan** en Taxi y delivery ni en Venta de productos. Los precios se tratan como netos. El detalle contable lo dice e informa el IT de referencia.
   - Modelarlos bajaría el margen de esas modalidades y obligaría a recalibrar.
   - Es una decisión que conviene tomar con un docente.
2. **IUE**:
   - La utilidad contable se usa como utilidad imponible. Solo se ajustan las multas.
   - No hay compensación de pérdidas de gestiones anteriores (Ley 169), porque la partida dura una gestión.
   - El IUE no vence dentro de la partida: termina como pasivo.
3. **RTS** (simplificaciones):
   - La categoría se recalcula al empezar cada bimestre.
   - Los equipos se valúan al valor en libros, no al valor de mercado menos la depreciación del art. 3.
   - La «gestión» de la partida no coincide necesariamente con el año calendario.
   - La forma de pago vigente la fija el SIN por reglamento. Se usó el vencimiento del texto original: día 10 del mes siguiente al bimestre.
4. **Fuentes secundarias**: las tasas de la CNS (10 %), el riesgo profesional (1,71 %) y la vivienda (2 %), el aguinaldo de un sueldo y el vencimiento del IUE a los 120 días se tomaron de fuentes secundarias. Que no se deduzca la **multa ambiental** es un supuesto del simulador: la norma citada (DS 24051 art. 14) se refiere a las multas tributarias.
5. **Proyecto de nuevo régimen**: en 2026 había un proyecto de «Régimen Tributario Especial» que podría reemplazar o convivir con el RTS. Hasta octubre de 2026 no se encontró una norma que lo apruebe. Si se aprueba, hay que revisar la modalidad de Comida rápida.

## Personal

6. **Aportes patronales**: se pagan el mismo mes; en la realidad, el mes siguiente.
7. **Despidos**: no tienen indemnización ni desahucio, porque el simulador no lleva la antigüedad de cada trabajador.
8. **Aportes del trabajador**: los aportes laborales (AFP) y el RC-IVA del trabajador no se muestran, porque no son costo del negocio.
9. **Partidas guardadas antes de la V5.2**: conservan su plantilla (por ejemplo, 5 personas en Delivery), pero ahora pagan aportes y aguinaldo.

## Calibración

10. **Venta de productos** termina «en riesgo» en el 51 % de las partidas automáticas (antes 36,5 %). La causa es que su costo laboral ahora es legal y completo.
11. **Comida rápida** pasa de 2,4 % a 15,3 % «en riesgo», porque contratar ayuda ahora cuesta lo que corresponde.

No se bajaron otros costos para compensar. Si se quiere otra dificultad, hay que revisar con datos o con un docente el supuesto de gastos fijos de Venta de productos (Bs 62.000 al año).

12. El final «Empresa pequeña pero muy rentable» sigue siendo casi inalcanzable en Comida rápida (0,2 %).

## Modelo

13. **Saldos rotativos**: las cuentas por cobrar (venta a crédito) y por pagar (plazo del proveedor) no se cobran ni se pagan dentro del año.
14. **Conductores y repartidores**: en Taxi y delivery no se modelan como personas.
15. **Precios y montos iniciales**: son supuestos del simulador, no precios de mercado verificados.

## Pruebas

16. No hubo pruebas con estudiantes, docentes ni usuarios reales.
17. No se usaron teléfonos físicos ni Safari.
18. El fallo intermitente de clic de las pruebas en navegador se corrigió. Después de la corrección, las pruebas pasaron en dos ejecuciones: es poca evidencia para descartarlo del todo.
