# Changelog V5.1 (correcciones sobre la V5)

> Documento histórico de la V5.1. Algunas cifras cambiaron en la V5.2 (sueldos, cargas sociales, RTS devengado, número de pruebas). Las cifras vigentes están en `CHANGELOG_V5_2.md`, `AUDITORIA_CONTABLE_TRIBUTARIA_V5_2.md` y `RESULTADOS_PRUEBAS_V5_2.md`.

Se conserva la V5: las tres modalidades, el calendario de 12 meses con 25 situaciones, las finanzas personales, el inventario, las cuentas, las partidas guardadas, el balance y el sistema de quiebra y recuperación. No se cambió a V6.

## 1. Página principal
- Se eliminó la frase «Dirige un negocio durante 12 meses: 25 situaciones, cuentas reales del negocio y de tu bolsillo.» del bloque del logo (`inicioHTML` en `index.html`). No se reemplazó por otro texto.
- Se eliminó el encabezado «BIENVENIDO A TU NEGOCIO» con el nombre del negocio («El carrito de Fernando»), que aparecía al comenzar una partida (`introHTML`, mes 1). La tarjeta empieza directamente con los datos iniciales y no queda ningún contenedor vacío.
- Las tarjetas de las tres modalidades no cambiaron.

## 2. Referencias visibles a Fernando eliminadas
| Dónde | Antes | Ahora |
|---|---|---|
| Tarjeta de Comida rápida | «Fernando y su carrito frente a la universidad» | «Un carrito de comida frente a la universidad» |
| Presentación | «Fernando vende comida rápida… Trabaja solo…» | «Diriges un pequeño carrito… Al comenzar trabajas solo…» |
| Nombre del negocio en partidas nuevas | «El carrito de Fernando» | «Mi carrito de comida» |
| Dueño en partidas nuevas | «Fernando» | «Tú» (como en las otras modalidades) |
| Marcador de personal | «Fernando trabaja solo» / «Fernando + 0,2 jornada de ayuda» | «Trabajas solo» / «Tú + 0,2 jornada de ayuda» |
| Inicio del mes 1 | «Fernando trabaja solo: compra, cocina…» | «Al comenzar trabajas solo: compras, cocinas…» |
| Panel personal | «Dinero personal de Fernando» | «Finanzas personales» |
| Indicador | «Dinero personal de Fernando» | «Finanzas personales del dueño» |
| Indicadores (nota) | «caso Fernando» | «emprendimiento atendido por su dueño» |
| Campo «Tu nombre» | sugería «Fernando» | «Tu nombre» |
| Supuestos visibles | «…del caso Fernando», «Capacidad de Fernando solo», «Ahorros de Fernando» | textos neutrales |

El nombre se conserva solo en documentación histórica (informes V3 y V4, matriz de decisiones) y en comentarios internos, como caso de referencia de los datos.

## 3. Costos de Comida rápida (pequeño emprendimiento)
- Gastos operativos: de Bs 1.600 a Bs 650 al mes, desglosados (permiso municipal, gas, transporte de insumos, agua, limpieza, mantenimiento, teléfono o QR). Sin alquiler.
- Envases: Bs 0,60 por plato (antes Bs 0,90 «envases y gas»; el gas pasa a gastos operativos).
- Innovación: sin costo al nivel inicial; solo cuesta la innovación agregada con decisiones (antes Bs 84 al mes desde el inicio). Este cambio solo se aplica a Comida rápida (`p.rdBase`).
- Activo fijo: carrito con plancha Bs 4.200 (8 años) y utensilios Bs 800 (4 años), antes un solo activo de Bs 5.000.
- Resultado del primer mes: de Bs 3.005 a Bs 4.191 (sale de los supuestos; no está fijado).
- Detalle y justificación de cada parámetro en `CORRECCIONES_V5_1.md`.

## 4. Animación y estados de desempeño de las ilustraciones
- Nuevos estados deterministas a partir del motor: **inicial, favorable, estable, desfavorable, crítico** (`estadoDe` en `ilustraciones.js`). Dependen del resultado del mes, de las unidades frente al mes anterior y frente al inicio, del riesgo y de las dificultades. Nunca de valores aleatorios.
- Cada estado cambia más que el color:
  - velocidad de la animación (favorable 1,35×; desfavorable 0,65×; crítico 0,3×);
  - gesto de los vendedores (sonrisa, neutral, tristeza);
  - entorno: sol con rayos y destellos; nube tapando el sol; tormenta con lluvia;
  - señal con flecha ↑/↓ o «!»;
  - en estado crítico los vehículos de delivery se detienen y los pines del mapa se apagan.
- Animaciones ligeras, solo de posición y opacidad, en CSS: vapor de la plancha, fila de clientes, motos y autos en ruta, pines del mapa, paquetes saliendo, sol, nubes, lluvia y destellos.
- Se respeta «reducir movimiento» del sistema (todas se detienen).
- Siguen funcionando al cambiar de pantalla y al cargar una partida.
- Etiqueta visible «Desempeño: …» junto a la etapa.
- La lista «Lo que cambió en tu negocio» informa el cambio de desempeño.
- Ajustes de composición: el carrito se movió para que la fila de clientes no tape la rueda; la señal de estado y la de peligro pasaron al cielo; las cajas de ingredientes van sobre el mostrador.

## 4b. Corrección adicional
- «Capacidad de reposición» (Comida) y «Efectivo disponible para reposición» (Productos) ya no se disparan cuando la demanda cae a cero.

## 5. Pruebas
- `motor.test.js`: 64 → 74 pruebas (parámetros de Comida, consecuencias de malas decisiones, retiros que dejan sin insumos).
- `ilustraciones.test.js`: 31 → 42 pruebas (estados).
- `v5.e2e.js`: 81 → 99 pruebas:
  - portada sin los textos eliminados;
  - recorrido de 4 meses por modalidad buscando «Fernando» en todas las pantallas;
  - animaciones en curso y movimiento reducido;
  - estados que siguen al motor;
  - animación después de cargar una partida.
- Arreglos de las propias pruebas:
  - espera por cambio de fase en lugar de una espera fija (causaba fallos intermitentes);
  - selector de logros (una notificación usa la misma clase);
  - la prueba del logo espera a que cargue la imagen.

## Archivos modificados
`frontend/motor.js`, `frontend/ilustraciones.js`, `frontend/index.html`, `backend/package.json` (5.1.0), `backend/test/motor.test.js`, `backend/test/ilustraciones.test.js`, `backend/test/v5.e2e.js`, `backend/test/navegador.e2e.js`, `INFORME_EVOLUCION_SIMULADOR.md` (cifras de Comida y nota de actualización), `README.md`, `docs/capturas/*` (14 capturas regeneradas).
Nuevos: `CHANGELOG_V5_1.md`, `CORRECCIONES_V5_1.md`.
