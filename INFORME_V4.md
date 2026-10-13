# Informe de evolución del Simulador de Negocios — V4

**Proyecto**: Simulador de Negocios (juego de gestión empresarial de 5 años).
**Versión**: V4, construida sobre `simulador-negocios-v3.zip`.
**Fecha del informe**: octubre de 2026.
**Documentos relacionados**: `MATRIZ_TRAZABILIDAD_DECISIONES.md` (todas las decisiones, opción por opción) y `CHANGELOG_V4.md` (lista de cambios y archivos).

> Nota de honestidad. Todo lo que este informe da por “comprobado” se ejecutó en esta versión y sus resultados se reportan con los números reales obtenidos. Lo que no se pudo comprobar se dice expresamente. **No se hicieron pruebas con usuarios reales.** Las cifras del juego son parámetros de diseño, no datos de empresas bolivianas.

---

## 1. Objetivo

Convertir la V3 (simulador funcional con cuentas, partidas guardadas y finanzas personales) en una herramienta educativa más visual, más fácil de entender a la primera, pensada primero para el celular y con una fundamentación académica explícita de cada decisión, **sin cambiar el motor de cálculo, el número de decisiones (25: 4 decisiones + 1 evento por año) ni la duración (5 años)**.

Objetivos concretos de la V4:

1. Que el estudiante elija su negocio en una pantalla simple con tres tarjetas ilustradas.
2. Que antes de jugar sepa qué va a aprender y qué retos enfrentará.
3. Que vea su negocio cambiar con ilustraciones que dependen de indicadores reales, no del paso del tiempo.
4. Que la interfaz use una paleta clara y sea cómoda en un teléfono.
5. Que cada decisión pueda rastrearse hasta su fórmula, su supuesto y su prueba.

## 2. Problema educativo

En la formación contable y financiera, el estudiante aprende reglas (partida doble, devengo, costo de ventas, impuesto sobre utilidades) y conceptos económicos (demanda, capacidad, margen) por separado. Lo difícil es ver **cómo se combinan en una decisión real**, con consecuencias que llegan tarde y con información incompleta. Tres confusiones frecuentes que el simulador ataca directamente:

- **Caja no es utilidad**: una empresa puede ganar y quedarse sin efectivo, o tener efectivo y estar perdiendo.
- **El dinero del negocio no es del dueño**: un retiro reduce la caja pero no es un gasto del negocio (principio de entidad, incorporado en la V3).
- **Crecer no siempre conviene**: crecer con deuda o sin capacidad puede destruir valor.

La V3 ya modelaba esto, pero la entrada al juego era densa (un formulario de configuración largo) y la imagen del negocio cambiaba por etapas poco explicadas. La V4 trabaja sobre esa barrera de entrada y sobre la explicación de lo que se ve.

## 3. Perfil de usuario

- **Usuario principal**: estudiante de Contaduría Pública, Administración o Economía, en los primeros años de la carrera, en Bolivia. Usa sobre todo el celular.
- **Usuario secundario**: docente que usa el simulador en clase o como tarea y necesita saber qué enseña cada decisión.
- **Supuestos sobre el usuario** (no validados con personas reales): conoce lo básico de ingresos, costos y utilidad; no domina todavía flujo de caja, apalancamiento ni valoración; tiene poco tiempo por sesión (una partida dura entre 15 y 30 minutos según el ritmo de lectura, estimación del equipo sin medición con usuarios).

## 4. Las tres modalidades

| Modalidad | Qué representa | Qué enseña sobre todo | Parámetros iniciales del motor (sin cambios en V4) |
|---|---|---|---|
| **Taxi y delivery** | Una **plataforma** (app) que conecta clientes con conductores y repartidores afiliados y gana una comisión por pedido. No es un taxista independiente. | Volumen, comisión, capacidad de la red, caja mientras la plataforma no es rentable. | 4.000 usuarios, 30 pedidos al año por usuario, Bs 6 de ingreso por pedido, costo variable Bs 2,6; caja inicial Bs 150.000. |
| **Venta de productos** | Comprar productos a proveedores y venderlos por internet. | Margen por unidad, publicidad, competencia en precios, despacho. | 1.000 clientes, precio Bs 180, costo variable Bs 115; caja Bs 50.000. |
| **Comida rápida** | Empieza con un carrito frente a una universidad (narrativa e ilustración). | Separar el dinero del negocio y el personal; reponer insumos; decidir cuándo reinvertir. | 780 comensales, 24 visitas al año, precio Bs 35, costo variable Bs 14,5; caja Bs 60.000. |

Resultado proyectado del año 1 con esos parámetros (medido en el navegador con `met(s)` al iniciar cada modalidad):

| Modalidad | Ventas | Costo variable | Gastos fijos | IUE | Utilidad | Margen | Meses de caja |
|---|---|---|---|---|---|---|---|
| Taxi y delivery | Bs 766.429 | Bs 324.899 | Bs 378.778 | Bs 15.688 | Bs 47.064 | 6,1 % | 2,56 |
| Venta de productos | Bs 541.753 | Bs 346.120 | Bs 129.585 | Bs 16.512 | Bs 49.536 | 9,1 % | 1,26 |
| Comida rápida | Bs 669.903 | Bs 277.531 | Bs 305.034 | Bs 21.834 | Bs 65.503 | 9,8 % | 1,24 |

**Advertencia de escala (Comida rápida).** El motor modela la comida rápida a escala de un local con 5 empleados (≈ Bs 55.800 de ventas al mes). La ilustración y la narrativa de la V4 empiezan con un **carrito**, que en la realidad vende bastante menos. Esta diferencia ya existía en el motor y **no se corrigió**, porque cambiarla altera el equilibrio de todo el juego y la instrucción fue no tocar el motor sin aprobación. La sección 12 y la propuesta del apartado 9.4 explican cómo resolverlo.

## 5. Fundamentación del aprendizaje por simulación

- **Aprendizaje experiencial.** Kolb (2015) describe el aprendizaje como un ciclo de experiencia concreta, observación reflexiva, conceptualización abstracta y experimentación activa. El simulador recorre ese ciclo en cada decisión: el estudiante decide (experiencia), ve qué cambió y por qué en la pantalla de resultado (reflexión), lee la regla o el concepto que explica el cambio (conceptualización) y lo aplica en la siguiente decisión (experimentación). En la V4 se añadió un paso más de reflexión visible: el desplegable **“¿Por qué se ve así?”**, que lista los 8 criterios de la etapa visual y cuáles se cumplen.
- **Evidencia sobre juegos de simulación.** El metaanálisis de Sitzmann (2011) sobre juegos de simulación por computadora encontró, frente a grupos de comparación, mejores resultados en autoeficacia, conocimiento declarativo, conocimiento procedimental y retención; el efecto fue mayor cuando el juego transmitía el contenido de forma activa, cuando se podía jugar las veces que se quisiera y cuando complementaba otras formas de enseñanza. Por eso el simulador se plantea como **complemento** de la clase, no como sustituto, y permite repetir partidas sin límite.
- **Revisión en educación superior.** Vlachopoulos y Makri (2017) revisaron estudios sobre juegos y simulaciones en educación superior e informan efectos positivos sobre objetivos de aprendizaje cognitivos, conductuales y afectivos, con la advertencia de que dependen del diseño y de su integración en el curso.
- **Lo que esta evidencia NO dice.** Ninguna de estas fuentes evaluó *este* simulador. Que los juegos de simulación puedan funcionar no demuestra que este funcione. Hace falta una prueba con estudiantes (sección 16).

## 6. Competencias financieras

El simulador se relaciona con dos marcos internacionales:

- **OECD (2018)**, *OECD/INFE Core Competencies Framework on financial literacy for MSMEs*: marco de competencias de educación financiera para dueños y potenciales dueños de micro, pequeñas y medianas empresas. Es el marco más cercano al usuario del simulador, que dirige una empresa pequeña.
- **European Commission y OECD-INFE (2022)**, *Financial competence framework for adults in the European Union*, organizado en cuatro áreas: dinero y transacciones; planificar y gestionar las finanzas; riesgo y rendimiento; panorama financiero.

Correspondencia propuesta por el equipo (no validada por expertos externos):

| Competencia trabajada | Dónde aparece en el juego | Área del marco UE/OECD-INFE (2022) |
|---|---|---|
| Separar dinero del negocio y personal | Panel «Mi dinero» (V3): retiros, gastos, ahorro, presupuesto | Dinero y transacciones; planificar y gestionar las finanzas |
| Leer caja vs. utilidad | Panel «Mi negocio», resumen anual, meses de caja | Planificar y gestionar las finanzas |
| Fijar precios y entender el margen | Decisiones de precios, proveedores, costos | Planificar y gestionar las finanzas |
| Usar deuda con criterio | Préstamos, deuda alta, crédito de emergencia | Riesgo y rendimiento |
| Evaluar riesgos e imprevistos | 13 eventos, seguros, fondo de reserva | Riesgo y rendimiento |
| Entender el entorno | Inflación, impuestos, competidores, crisis | Panorama financiero |

La matriz de trazabilidad asigna una competencia a cada una de las 174 opciones.

## 7. Justificación del diseño visual

**Paleta clara.** La V3 tenía tema oscuro y verde oscuro como identidad. La V4 usa un solo tema claro con variables CSS en `:root`:

| Variable | Valor | Uso |
|---|---|---|
| `--color-principal` | `#0A7894` (turquesa profundo) | Botones principales, enlaces |
| `--color-secundario` | `#246FB8` (azul) | Información, selección |
| `--color-acento` | `#FF6B5B` (coral) | Detalles, borde superior del tablero |
| `--fondo` | `#F5FAFD` | Fondo general |
| `--fondo-tarjeta` | `#FFFFFF` | Tarjetas |
| `--texto` | `#1F2A37` | Texto principal |
| `--texto-secundario` | `#4B5B6B` | Texto de apoyo |
| `--exito` | `#1F8551` | Valores positivos |
| `--advertencia` | `#9A5800` | Avisos |
| `--error` | `#C2392B` | Pérdidas, errores |
| `--borde` | `#DCE7EF` | Bordes |
| `--sombra` | sombra azulada suave | Profundidad |

Los colores vivos (coral, amarillo, celeste, turquesa, naranja, verde claro) se usan en ilustraciones, fondos suaves y botones grandes; **el texto siempre usa los tonos oscuros** de la tabla para cumplir el contraste. El turquesa y el azul se oscurecieron respecto de sus versiones puras precisamente por esto (el azul `#2F80D0` daba 4,10:1 y se cambió a `#246FB8`).

**Contraste.** WCAG 2.2 (W3C, 2024), criterio 1.4.3, pide al menos 4,5:1 para texto normal. La prueba `diseno.test.js` calcula el contraste de 16 pares de colores de texto y fondo usados en la interfaz: todos pasan (resultados en la sección 15).

**Flujo en dos pantallas.**
1. **Portada**: solo tres tarjetas, cada una con ilustración, nombre, una línea de descripción y el botón «Entrar».
2. **Presentación del negocio**: ilustración grande, explicación, objetivo de aprendizaje, tres retos, botón «Comenzar» y «Volver». El formulario de configuración de la V3 (nombre, director, caja, precio, clientes) **se conservó**, plegado en «Ajustar el punto de partida (opcional)».

Este flujo reduce las decisiones de la primera pantalla de ~8 campos a 1 elección, y pone el objetivo de aprendizaje antes de la primera decisión.

## 8. Adaptación móvil

Requisitos aplicados (WCAG 2.2): **reflujo** (1.4.10) sin desplazamiento horizontal desde 320 px de ancho, y **tamaño de objetivo** (2.5.8, nivel AA: mínimo 24 × 24 px). El proyecto apunta más alto: los botones miden al menos 44 px de alto, que es la recomendación de nivel AAA (2.5.5). Harrison, Flood y Duce (2013) proponen el modelo PACMAD de usabilidad móvil (eficacia, eficiencia, satisfacción, facilidad de aprendizaje, memorabilidad, errores y carga cognitiva); la V4 trabajó sobre todo la **carga cognitiva** (pantallas con menos elementos, detalles plegados) y la **facilidad de aprendizaje** (objetivo y retos antes de empezar).

Cambios concretos en pantallas de hasta 760 px:
- Tarjetas de negocio en una columna, con la ilustración a la izquierda y el texto a la derecha.
- Botones principales a ancho completo; encabezado compacto.
- Aviso de invitado debajo de las tarjetas (antes empujaba las tarjetas hacia abajo).
- Notificaciones (toasts) a lo ancho de la parte inferior, máximo 2 a la vez y sin bloquear toques (se corrigió en esta versión: en la captura previa se apilaban sobre los botones).

Comprobado automáticamente en 360, 390, 412, 768 y 1280 px de ancho (sección 15). **Limitación:** se probó en Chromium con emulación de pantalla, no en teléfonos físicos.

## 9. Ilustraciones evolutivas

### 9.1 Principio

La ilustración **solo lee** el estado del juego; no modifica ningún cálculo. Está en un módulo separado, `frontend/ilustraciones.js`, que también se puede cargar desde Node para probarlo.

### 9.2 Etapas por modalidad

| Nivel | Taxi y delivery | Venta de productos | Comida rápida |
|---|---|---|---|
| 0 Inicial | Plataforma inicial: celular con la app y pocos repartidores | Tienda desde casa: escritorio, laptop y cajas | Carrito sencillo frente a la universidad |
| 1 En desarrollo | Plataforma en crecimiento: más motos y autos | Tienda en crecimiento: estante y más pedidos | Carrito equipado: sombrilla, plancha, menú, luces |
| 2 Estable | Operación organizada: edificio CENTRAL de despacho | Centro de despacho: almacén y furgonetas | Puesto de comida con toldo, mesas y fila |
| 3 Consolidado | Plataforma consolidada: flota grande y ciudad de noche | Comercio consolidado | Emprendimiento consolidado |
| En dificultades (encima de cualquier nivel) | Cielo gris, nube de tormenta, aviso y menos actividad | ídem | ídem |

Insignias adicionales: globo si la empresa exporta; «×2» si abrió sucursal o franquicia.

### 9.3 Reglas (verificables)

Se suman puntos (máximo 8):

| # | Criterio | Fuente del dato |
|---|---|---|
| 1 | Ventas ≥ 1,3 × ventas iniciales | `met(s).sales` o ventas del año cerrado |
| 2 | Ventas ≥ 1,8 × ventas iniciales | ídem |
| 3 | Capacidad ≥ 1,25 × capacidad inicial | `s.cap / BIZ.cap` |
| 4 | Capacidad ≥ 1,6 × capacidad inicial | ídem |
| 5 | Reputación ≥ 60 | `s.rep` |
| 6 | Riesgo < 35 | `met(s).risk` |
| 7 | Caja para 2 meses o más de costos | `met(s).months` |
| 8 | Al menos un año cerrado, utilidad acumulada > 0 y utilidad del año > 0 | `s.hist` |

- **Nivel**: 0–2 puntos Inicial; 3–4 En desarrollo; 5–6 Estable; 7–8 Consolidado.
- **Consolidado exige además** ventas ≥ 1,8 y capacidad ≥ 1,6: no se llega solo con prudencia.
- **En dificultades** si hay quiebra, caja negativa, riesgo ≥ 60, o utilidad negativa con caja para menos de 2 meses. En ese caso el nivel mostrado **nunca pasa de Estable**: una empresa en problemas nunca se ve consolidada.
- **El tiempo no cuenta**: ningún criterio usa el año. Adelantar el año sin cambiar indicadores no cambia la imagen (probado).
- **La imagen puede retroceder**: si los indicadores empeoran, baja de etapa.

Medición en 1.200 partidas con decisiones al azar (400 por modalidad):

| Modalidad | Inicial | En desarrollo | Estable | Consolidado | En dificultades al final | Quiebras mostradas como “en dificultades” | Partidas en que la imagen retrocedió algún año |
|---|---|---|---|---|---|---|---|
| Taxi y delivery | 6,3 % | 26,8 % | 44,0 % | 23,0 % | 16,3 % | 8 de 8 | 31,0 % |
| Venta de productos | 8,8 % | 29,8 % | 40,3 % | 21,3 % | 17,5 % | 12 de 12 | 27,5 % |
| Comida rápida | 19,5 % | 30,8 % | 39,0 % | 10,8 % | 22,8 % | 16 de 16 | 31,8 % |

Ninguna partida en quiebra se mostró como Consolidado (0 de 36). Los umbrales son **supuestos pedagógicos** elegidos para que las cuatro etapas aparezcan y para que Consolidado sea difícil; no están calibrados con empresas reales.

### 9.4 Adaptación del caso «Fernando» (propuesta, no implementada)

Se pidió adaptar el caso de un vendedor de comida rápida (Fernando) cuyo aprendizaje central es el manejo de insumos. **El motor actual no tiene inventario**: no registra stock de insumos, compras separadas del costo ni mermas; el costo variable se descuenta por plato vendido. Inventar esa mecánica sin aprobación habría cambiado el motor y el equilibrio. Por eso se presenta como propuesta:

**Estados nuevos** (solo para Comida rápida): `inv` (inventario de insumos en Bs), `porciones` (porciones disponibles), `tasaMerma` (fracción de lo no vendido que se pierde por ser perecible).

**Fórmulas (todas de categoría A, regla contable, salvo la tasa de merma que es supuesto C):**
1. Compra de insumos: caja − C; inventario + C. *No cambia la utilidad* (el insumo es activo hasta que se usa).
2. Venta: costo de ventas = platos vendidos × costo por plato; inventario − costo de ventas.
3. Merma: merma = (porciones compradas − porciones vendidas) × tasaMerma × costo por porción; inventario − merma; utilidad − merma; caja sin cambio.
4. Control: Inventario inicial + Compras − Costo de ventas − Mermas = Inventario final.
5. Restricción: platos vendidos ≤ mín(demanda; capacidad; porciones disponibles).

**Decisiones posibles**: comprar diario (más caro, poca merma) o por mayor (más barato, más merma y más caja inmovilizada).

**Pruebas propuestas**: (1) la compra baja caja y sube inventario en el mismo monto y no cambia la utilidad; (2) vender reconoce el costo y baja el inventario; (3) la merma baja inventario y utilidad, no la caja; (4) la identidad del punto 4 se cumple en 200 secuencias aleatorias; (5) no se venden más platos que porciones.

**Escala del caso.** Para un escenario «carrito» se usarían **ventas mensuales de Bs 8.000 y ganancia mensual de Bs 3.000** como **supuestos hipotéticos configurables**, no como datos reales de Fernando ni como promedios del sector gastronómico boliviano. Comparación con el motor actual: Bs 8.000 al mes son Bs 96.000 al año, unas 7 veces menos que las ventas iniciales de Comida rápida en el motor (Bs 669.903); y una ganancia de Bs 3.000 sobre Bs 8.000 es un margen de 37,5 %, frente al 9,8 % del motor (que incluye 5 empleados y gastos fijos de local). Activar ese escenario requiere un preajuste de parámetros y volver a equilibrar el juego: **pendiente de aprobación**.

## 10. Matriz de decisiones

La matriz completa está en `MATRIZ_TRAZABILIDAD_DECISIONES.md`, generada automáticamente desde el código para que no haya diferencias entre lo documentado y lo programado. Resumen:

- **35 decisiones** (28 normales en 4 niveles + 7 que aparecen solo si se da una condición, p. ej., caja en rojo o deuda alta) y **13 eventos**, con **174 opciones**. (El borrador de pruebas decía 34 decisiones; al exportar los datos se comprobó que son 35 y se corrigió.)
- En cada partida se juegan 25: 4 decisiones y 1 evento por año. **No se cambió.**
- Por categoría (una opción puede tener varias): 108 opciones con efectos de categoría A (contable/financiera), 82 de categoría B (mecanismo económico) y 132 de categoría C (supuesto pedagógico).

## 11. Fórmulas del motor (sin cambios en V4)

Notación: S = ventas de referencia; los porcentajes de las decisiones se aplican sobre S.

- **Crecimiento de clientes**: g = 0,03 + g₀(modalidad) + impulso/(1 + 1,5·impulso) + 0,003·(reputación − 50) + 0,003·(satisfacción − 50) + efecto de innovación + ruido − penalizaciones (caja ociosa, precio por encima del inicial). Si g > 0, se frena por saturación: g × máx(0; 1 − clientes/mercado × factor).
- **Capacidad efectiva** = mín(instalaciones; personal × unidades por empleado) × (0,75 + productividad/200).
- **Unidades vendidas** = mín(clientes × frecuencia; capacidad efectiva).
- **Ventas** = unidades × precio.
- **Costo variable** = unidades × costo unitario × (1 − (productividad − 50)/400 − efecto de innovación).
- **Gastos fijos** = gastos generales + empleados × sueldo + gasto de innovación (ventas × innovación/100 × 0,07).
- **Intereses** = deuda × (tasa + máx(0; deuda/ventas − 0,3) × 0,3).
- **Utilidad antes de impuestos** = ventas − costo variable − gastos fijos − intereses.
- **IUE** = 25 % de la utilidad antes de impuestos si es positiva (Ley 843, Bolivia).
- **Utilidad** = utilidad antes de impuestos − IUE.
- **Caja al cierre** = caja + utilidad − amortización (20 % de la deuda) (+ 3 % de rendimiento si la caja supera el 10 % de las ventas; ver Limitaciones).
- **Meses de caja** = caja / ((costo variable + gastos fijos)/12).
- **Riesgo (0–100)** = mín(60; deuda/ventas × 75) + recargo por pocos meses de caja (25/15/8) + 15 si hay pérdida + 8 si reputación < 35 + 10 si caja < 0 + 8 si innovación alta con poca caja.
- **Valor de la empresa** = máx(0; 3,5 × utilidad + 0,65 × ventas + caja − caja ociosa − deuda) × (1 + (reputación − 50)/200 + innovación/120) × penalización por estancamiento × participación del dueño.
- **Índice empresarial** = promedio de 6 puntajes (finanzas, ventas, gestión, innovación, 100 − riesgo, satisfacción).
- **Retiro del propietario (V3)**: caja − R; saldo personal + R; ventas, costos y utilidad sin cambio.

## 12. Supuestos

| # | Supuesto | Tipo | Estado |
|---|---|---|---|
| S1 | Todas las magnitudes de las decisiones y eventos (porcentajes, puntos, probabilidades) | Pedagógico (C) | Pendiente de validación con docentes y datos |
| S2 | Parámetros iniciales de cada modalidad (clientes, precio, costos, caja) | Pedagógico | No provienen de estadísticas bolivianas |
| S3 | Umbrales de la etapa visual (1,3 / 1,8 / 1,25 / 1,6 / 60 / 35 / 2 meses) | Pedagógico | Elegidos para que las etapas sean alcanzables y distinguibles |
| S4 | Tipo de cambio de 12 Bs/USD | Configurable | Pedido del usuario en una versión anterior; editable en la pantalla; no es el tipo de cambio oficial |
| S5 | Presupuesto personal inicial de Bs 2.500/mes | Configurable (V3) | Valor educativo, editable |
| S6 | Bs 8.000 de ventas y Bs 3.000 de ganancia mensual (caso Fernando) | Hipotético, configurable | Solo propuesta; no son datos reales |
| S7 | Un año del simulador = 12 meses; 5 decisiones por año | Diseño | Sin cambios |
| S8 | IUE 25 % sobre utilidad positiva, sin compensación de pérdidas de años anteriores | Simplificación de regla real | Documentado |

## 13. Bibliografía (APA 7)

European Commission & OECD-INFE. (2022). *Financial competence framework for adults in the European Union*. https://www.oecd.org/finance/financial-competence-framework-for-adults-in-the-european-union.htm

Harrison, R., Flood, D., & Duce, D. (2013). Usability of mobile applications: Literature review and rationale for a new usability model. *Journal of Interaction Science, 1*, Artículo 1. https://doi.org/10.1186/2194-0827-1-1

Kolb, D. A. (2015). *Experiential learning: Experience as the source of learning and development* (2.ª ed.). Pearson Education.

Ley N.º 843 de Reforma Tributaria [Bolivia], Título III, Impuesto sobre las Utilidades de las Empresas (texto ordenado vigente).

Mankiw, N. G. (2021). *Principles of economics* (9.ª ed.). Cengage Learning.

OECD. (2018). *OECD/INFE core competencies framework on financial literacy for MSMEs*. OECD Publishing. https://doi.org/10.1787/220101c9-en

Sitzmann, T. (2011). A meta-analytic examination of the instructional effectiveness of computer-based simulation games. *Personnel Psychology, 64*(2), 489–528. https://doi.org/10.1111/j.1744-6570.2011.01190.x

Vlachopoulos, D., & Makri, A. (2017). The effect of games and simulations on higher education: A systematic literature review. *International Journal of Educational Technology in Higher Education, 14*, Artículo 22. https://doi.org/10.1186/s41239-017-0062-1

W3C. (2024). *Web Content Accessibility Guidelines (WCAG) 2.2* (W3C Recommendation). https://www.w3.org/TR/WCAG22/

Verificación: los cuatro DOI se consultaron en Crossref durante este trabajo y coinciden en título, autores, año y revista. La página del marco de la UE se localizó en el sitio de la OCDE. Kolb (2015), Mankiw (2021), WCAG 2.2 y la Ley 843 son obras de referencia conocidas; no se citan páginas porque no se consultaron páginas concretas.

## 14. Cambios por etapa (fases del trabajo)

| Fase | Qué se hizo | Archivos |
|---|---|---|
| 1. Diagnóstico | Revisión de la V3: tema oscuro, formulario largo al inicio, etapas visuales por umbrales de tamaño, falta de trazabilidad documentada | — |
| 2. Paleta | Tema claro único con 12 variables obligatorias + alias; eliminación del modo oscuro; tablero blanco con borde coral | `frontend/index.html` |
| 3. Flujo de inicio | Portada con 3 tarjetas ilustradas; pantalla de presentación con objetivo y retos; configuración plegada | `frontend/index.html` |
| 4. Ilustraciones | Módulo nuevo con reglas de 8 criterios y escenas SVG por modalidad y etapa; estado «en dificultades» | `frontend/ilustraciones.js`, `frontend/index.html` |
| 5. Móvil | Reglas CSS para ≤ 760 px; botones ≥ 44 px; notificaciones abajo y sin bloquear | `frontend/index.html` |
| 6. Textos | Nombres: «Taxi y delivery» (plataforma), «Venta de productos», «Comida rápida» (carrito frente a la universidad) | `frontend/index.html` |
| 7. Pruebas | 3 archivos de prueba nuevos; 2 pruebas existentes adaptadas al nuevo flujo; regresiones | `backend/test/*` |
| 8. Documentación | Este informe, matriz, changelog, README | raíz del proyecto |

Errores encontrados por las pruebas y corregidos durante la V4:
- La acción del botón de las tarjetas de negocio se llamaba igual que la de las opciones de decisión (`pick`): al elegir una opción, el juego volvía a la presentación del negocio. **Se renombró a `negocio`.** Lo detectó `v4.e2e.js`.
- Contraste insuficiente del azul secundario (4,10:1) → `#246FB8`.
- Al salir de una partida, la pantalla quedaba en la presentación en vez de la portada → se reinicia `ui.info`.
- Notificaciones apiladas sobre los botones en el celular → máximo 2, a lo ancho abajo, sin capturar toques.
- La insignia «2ª» de sucursal se veía separada → «×2».

## 15. Pruebas y resultados

### 15.1 Pruebas automatizadas (ejecutadas en esta versión)

| Prueba | Qué verifica | Resultado |
|---|---|---|
| `api.test.js` | Registro, sesión, permisos, partidas, administrador | **30 / 30** |
| `finanzas.test.js` | Retiros, gastos, ahorro, presupuesto, 200 secuencias aleatorias, guardado | **27 / 27** |
| `ilustraciones.test.js` (nuevo) | Reglas de etapa, tiempo no cambia la etapa, Consolidado exige ventas y capacidad, dificultades, 24 variantes SVG válidas | **42 / 42** |
| `diseno.test.js` (nuevo) | Sin tema oscuro, 12 variables obligatorias, 16 pares de contraste ≥ 4,5:1 | **30 / 30** |
| `navegador.e2e.js` (V3, adaptado) | Finanzas personales en las 3 modalidades, partida completa, guardar y continuar | **31 / 31** |
| `v4.e2e.js` (nuevo) | Portada y presentación en 5 anchos; escena y finanzas en celular en las 3 modalidades; reglas de etapa sobre el estado real; dirección de las 174 opciones; partida completa en escritorio; sin errores JS | **45 / 45** |
| Prueba de cuentas en navegador (script del equipo, fuera del ZIP) | Invitado, registro, sesión, continuar, aislamiento entre usuarios, administrador, hashes | **24 / 24** |
| Regresión de 1.500 partidas (7 estilos de juego × 3 modalidades) | Que el motor siga igual | 0 errores, 0 valores no numéricos; distribución de finales igual a la V3 dentro de la variación aleatoria (p. ej., quiebra en Comida rápida 2,2 % en V3 y 2,4 % en V4) |
| Distribución de etapas (1.200 partidas al azar) | Sección 9.3 | 0 quiebras mostradas como Consolidado |

Adaptaciones de pruebas existentes (no son regresiones): en `navegador.e2e.js` y en la prueba de cuentas, un paso pulsaba «Comenzar» directamente; con el flujo V4 primero hay que elegir el negocio. En la prueba de cuentas se añadió una espera de 0,8 s tras iniciar sesión porque el historial se carga justo después (condición de carrera del script de prueba, no de la aplicación).

### 15.2 Inspección visual (hecha por el equipo con capturas)

Capturas en `docs/capturas/`: portada (390 y 1280 px), presentación de Comida rápida (390 y 1280), partida de Comida rápida en celular, panel «Mi dinero» en celular, partida y resultado final de Taxi y delivery en escritorio. Se revisaron una por una; se encontraron y corrigieron las notificaciones superpuestas y la insignia «2ª».

### 15.3 Pruebas manuales por modalidad (guía para el docente)

Para cada modalidad (Taxi y delivery, Venta de productos, Comida rápida):
1. En la portada pulsa **Entrar** en la tarjeta. Comprueba que ves la ilustración grande, el objetivo, tres retos, **Comenzar** y **Volver**. Pulsa **Volver** y vuelve a entrar.
2. Pulsa **Comenzar** y luego la primera decisión. La escena del panel «Tu negocio» debe corresponder a la modalidad y mostrar «Etapa: Inicial».
3. Abre **¿Por qué se ve así?**: verás los 8 criterios y cuántos se cumplen.
4. En «Mi dinero», retira Bs 1.000 y registra un gasto de Bs 700: el saldo personal queda en Bs 300 y la utilidad no cambia.
5. Juega los 5 años. Comprueba que la imagen cambia solo cuando cambian los indicadores (puede retroceder) y que, si la empresa termina con problemas, la escena muestra la nube de tormenta y el aviso.
6. En el teléfono, comprueba que no hay que desplazarse hacia los lados.

### 15.4 Pruebas con usuarios reales

**No se hicieron.** Ningún estudiante ni docente ha usado la V4. Todas las afirmaciones sobre facilidad de uso son hipótesis de diseño.

## 16. Limitaciones

1. **Sin pruebas con usuarios reales**: no se sabe todavía si la V4 se entiende mejor que la V3. Siguiente paso recomendado: sesión con 5–8 estudiantes con tareas concretas y una pregunta de comprensión antes y después de jugar.
2. **Probado en Chromium emulando pantallas**, no en teléfonos físicos ni en Safari.
3. **Escala de Comida rápida**: el motor modela un local con 5 empleados; la imagen inicial es un carrito (sección 9.4). Pendiente de aprobación.
4. **Sin inventario**: el caso Fernando queda como propuesta.
5. **Inconsistencia conocida del motor (de la V3)**: el 3 % de rendimiento sobre la caja se suma a la caja pero no a la utilidad ni a la base del IUE. Se documenta y no se corrige porque cambiaría el motor.
6. **Magnitudes no calibradas**: todas las magnitudes son supuestos pedagógicos (matriz, categoría C).
7. **Imagen de referencia**: el pedido mencionaba una imagen de referencia, pero no llegó adjunta (solo estaba el ZIP original). El estilo visual se definió a partir de la descripción escrita.
8. **Playwright no es dependencia del proyecto**: las pruebas de navegador se omiten (con aviso) si no está instalado.
9. **Seguridad del cálculo**: el juego se calcula en el navegador; un usuario técnico podría falsear sus propios resultados (no afecta a otros usuarios). Sin cambios respecto de la V3.
10. **En el celular**, la decisión aparece antes que la ilustración del negocio (el panel «Tu negocio» queda debajo). Se priorizó la tarea; si se quiere la imagen arriba, es un cambio de orden de CSS sencillo.
