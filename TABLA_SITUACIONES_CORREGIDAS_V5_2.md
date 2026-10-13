# Situaciones y decisiones corregidas — V5.2

## Qué se revisó

Se revisaron las 25 situaciones que pueden salir en una partida: 35 decisiones y 13 eventos posibles, con 174 opciones. La revisión cubrió cada parte de cada situación:

- el título;
- la descripción;
- el impacto previo (cuando lo hay);
- cada opción;
- su explicación («¿Qué significa?»);
- los resultados inciertos;
- las consecuencias posteriores;
- los mensajes del cierre de mes.

Se revisó en las tres modalidades. En Comida rápida se revisó con el dueño solo y con ayuda contratada, y en todas, con y sin socios.

La revisión no se limitó a buscar palabras: `auditoria.test.js` genera todos esos textos con el estado real del juego y busca:

- estructuras que el negocio no tiene: directorio, junta, gerencias, socios inexistentes;
- personal inexistente: «tu equipo», «tu ayudante», «tu personal», «una sola persona»;
- la expresión «horas punta» (o «pado»).

En total revisa 5.852 textos de las situaciones y 7.199 mensajes de cierre de 75 partidas. `detalle.e2e.js` repite la búsqueda en las pantallas reales del navegador, durante 4 meses por modalidad.

## Sobre «hora pado»

En el código no existe la palabra «pado». La expresión que había era **«horas punta»** (dos veces, en la contratación de Comida rápida). Es la forma usada en España; en Bolivia se dice **«horas pico»**. Se reemplazó, y además se revisó que la decisión tenga una consecuencia coherente:

- contratar ayuda para las horas pico solo trae más clientes si el carrito ya trabajaba al 90 % o más de su capacidad;
- si no, mejora la atención, pero no aumenta las ventas por sí sola, y el mensaje lo dice.

## Tabla de cambios

| Situación | Modalidad | Antes | Ahora | Motivo |
|---|---|---|---|---|
| Gestión de riesgos (D-riesgos) | Las tres | «El directorio pregunta qué pasaría si mañana ocurre un imprevisto grave.» | General: «Un comerciante de tu zona perdió buena parte de su negocio por un imprevisto (un robo, un incendio, una inundación). Te preguntas qué pasaría si te ocurriera a ti.» Comida: «A otro vendedor de la zona le robaron su carrito y perdió casi todo…». Opción A en Comida: «Contratar un seguro contra robo e incendio». | No existe un directorio. La causa real es un riesgo que el dueño decide cubrir. |
| Recursos humanos (D-talento) | Delivery y Productos | «Tu mejor gerente recibió una oferta…» | «Tu empleado con más experiencia recibió una oferta…». Bonos y salario: gasto de personal. | 4 personas y 1,5 jornadas no tienen gerentes. |
| Contratación y despidos (D-estructura) | Delivery y Productos | «La empresa creció…»; opción «Profesionalizar las gerencias» | «Con más pedidos y más tareas, las decisiones del día a día se volvieron lentas»; opción «Contratar asesoría externa de gestión» (servicio mensual, gasto operativo) | No hay gerencias. La asesoría externa sí existe en un negocio pequeño. |
| Expansión (D-internacional) | Delivery y Productos | «Un socio te propone…» | «Un empresario de {país} te propone llevar tu negocio allá»; «Un distribuidor local reduce…» | Hablaba de un socio que puede no existir. |
| Flujo de caja (D-dividendos) | Delivery y Productos | «Repartir utilidades a los socios» | Sin socios: «Retirar utilidades para ti». Con socios: «Repartir utilidades entre tú y tus socios». | El motor ya enviaba todo al dueño cuando no había socios. |
| Caja casi vacía (D-cajaRoja) | Las tres | «Pedir un aporte a los socios» | Sin socios: «Conseguir un socio que aporte dinero». Con socios: «Pedir un aporte a tus socios». | Ídem. |
| Deuda alta (D-deudaAlta) | Las tres | «Convertir deuda en participación de un socio» | «Que un socio pague parte de la deuda a cambio de una participación» | Más claro y sin suponer un socio. |
| Ventas caen (D-ventasCaen) | Las tres | «…El equipo espera tu respuesta.» | «Las ventas de los últimos meses bajaron 12%. Tienes que decidir cómo responder.» | En Comida no hay equipo. |
| Nuevos productos (D-nuevoProd) | Las tres | «Tu equipo propone lanzar…» | «Ves la oportunidad de lanzar…» | Ídem. |
| Contratación (D-contratar) | Comida | «Atiendes solo y en las horas punta…»; «Contratar un ayudante para las horas punta» | «Atiendes solo y en las horas pico…» (otro texto si ya hay ayuda). Opciones: «Contratar un ayudante para las horas pico (20 % de una jornada)», «Pagar a un familiar para que ayude algunos días (10 % de una jornada)». | Término y cuánto se contrata. |
| Contratación (D-contratar) | Las tres | La opción A daba +3 % de impulso comercial siempre | Solo si la demanda usaba ≥ 90 % de la capacidad; si no, mensaje explicativo | No conceder ventas sin falta de capacidad. |
| Falta de personal (D-faltaPersonal) | Comida | «…tu equipo es el cuello de botella»; horas extra pagadas | «…trabajas solo: la demanda que podrías atender supera lo que tus manos alcanzan…». Opciones: ayuda por horas (30 %), alargar tu jornada (sin pago extra), equipos para preparar por adelantado (inversión), seguir como estás. | Sin empleados no hay horas extra que pagar. |
| Falta de personal (D-faltaPersonal) | Delivery y Productos | Horas extra como gasto operativo | Horas extra como gasto de personal | Clasificación. |
| Conflicto laboral (EV-huelga) | Comida | Podía salir «Tu ayudante y otros vendedores paran…» sin ayudante | Sin ayuda contratada no sale. Con ayuda: «Tu ayudante pide mejores condiciones…» y opciones «Subirle el pago», «Darle un bono único», «Mantenerte firme». | Empleado inexistente. |
| Capacitación, bonos, aumentos, igualar oferta (D-capacitar, D-talento, D-rotacion, EV-huelga) | Delivery y Productos | Gastos fijos operativos | Gasto de personal (sueldo + aportes + aguinaldo) | Clasificación contable. |
| Segundo carrito (D-sucursal) | Comida | Sumaba 30 % de jornada | «…atendido por un vendedor a medio tiempo» (0,5 jornada) | Un segundo carrito necesita quien lo atienda. |
| Préstamo (D-prestamo), ampliar y contratar (D-sinCapacidad), feria (D-internacional) | Comida | Agregaban ayuda sin decirlo | La opción dice «y contratar ayuda por horas» | Transparencia del costo. |
| Atención al cliente (D-quejas) | Comida | «Contratar a alguien que atienda pedidos por WhatsApp» | «…por horas…» | Escala del negocio. |
| Reducción de costos (D-costos) | Comida | «Renegociar alquiler y servicios» | «Renegociar el gas, el transporte y otros servicios». Opción C: «Ordenar y simplificar la preparación» (gasto, no sistema informático). | El carrito no paga alquiler. |
| Remate (EV-remate) | Comida | «…remata sus equipos y su local» | «Un puesto vecino cierra y remata sus equipos» | Escala. |
| Auspicio (D-marca) | Comida | «principal evento de la ciudad» | «feria de bienvenida de la universidad» | Escala. |
| Tecnología (D-tecnologia) | Comida | «Plataforma de gestión de toda la empresa» | «Aplicación en el celular para cobros con QR, compras e inventario» | Escala. |
| Cliente importante (EV-clienteClave) | Comida | «Tu cliente más grande…» | «Un grupo de estudiantes que te compraba todos los días se cambia a otro puesto» | Escala. |
| Competidor (EV-competidor) | Comida | «Una cadena grande entra a tu mercado» | «Una cadena de comida rápida abre un local cerca de la universidad» | Escala. |
| Falla (EV-falla) | Comida | «Una falla grave detiene parte de la operación» | «Se daña la plancha y no puedes cocinar con normalidad» | Escala. |
| Venta a crédito (D-credito) | Comida | «Una empresa grande… a 60 días» | «Una oficina cercana quiere pedirte almuerzos… pagando a fin de mes» | Escala. |
| Segunda marca, sostenibilidad, inversionista (D-segundaMarca, D-sostenible, EV-angel) | Comida | Textos de empresa | «Segunda línea de platos», «envases biodegradables», «alguien con ahorros quiere entrar como socio en tu carrito» | Escala. |
| Tributos (EV-impuestos) | Las tres | «Cambian las normas tributarias…»; subía los gastos fijos | «La alcaldía actualiza las patentes y tasas…» (Comida: «tasa por el permiso de venta»). Línea propia «patentes y tasas municipales». | Con el RTS o el IUE fijados por ley, un aumento puntual corresponde a tributos municipales. Clasificación. |
| Inventario y capacidad (D-inventario), opción C | Delivery | «Vender equipos que casi no usas» (la plataforma no tiene equipos registrados) | «Reducir la red de conductores en las horas de poca demanda» (menos gasto, menos capacidad) | No se puede vender lo que no está en el balance. |
| Vender activos (D-cajaRoja B, D-deudaAlta B) | Las tres | Sin equipos, la venta generaba dinero y ganancia | Precio de venta de hasta 10 % sobre el valor en libros. Sin equipos, la opción avisa que no genera dinero. | Coherencia contable. |
| Mensaje de cierre por capacidad | Comida | «…una sola persona no alcanza…» (aun con ayuda) | Según el caso: trabajas solo (propone contratar o moderar pedidos) o «entre tú y tu ayuda contratada…» | Personal real. |
| Aviso de situación actual | Las tres | «…te faltan manos» | «La demanda supera tu capacidad para atender a los clientes trabajando solo. Debes decidir si contratas ayuda o limitas temporalmente los pedidos…» (con variantes) | Lo pidió el usuario. |

## Decisiones que se conservaron

No se eliminó ninguna decisión ni ninguna opción. Siguen siendo 35 decisiones, 13 eventos y 174 opciones, y 25 situaciones por partida. Las seis decisiones que ya no aparecían en Comida rápida siguen excluidas allí: capacitación, rotación, gerente, reestructuración, fondo de inversión y compra de un competidor.

El detalle de cada opción, con su fórmula y su registro contable por modalidad, está en `MATRIZ_TRAZABILIDAD_DECISIONES.md`, generada desde el código.
