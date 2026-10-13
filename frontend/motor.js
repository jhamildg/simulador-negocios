/* Motor del Simulador de Negocios (V5).
   Archivo sin dependencias que se carga en el navegador (script clásico: sus constantes y `s` quedan en el ámbito global
   compartido con index.html) y en Node (require) para las pruebas automáticas.

   Cambios de fondo respecto a la V4 (documentados en INFORME_EVOLUCION_SIMULADOR.md):
   - Calendario de 12 meses con las mismas 25 situaciones (20 decisiones + 5 eventos).
   - Todos los flujos se calculan por mes: ventas, costos, sueldos, intereses, amortización, impuestos y depreciación.
   - Regla de demanda por precio explícita (lineal, con elasticidad documentada por modalidad).
   - Inventario con costo promedio ponderado, mermas y capacidad de reposición (Comida rápida y Venta de productos).
   - Registro contable mínimo: activo fijo y depreciación, anticipos, cuentas por cobrar y por pagar, aportes,
     distribuciones, retiros del dueño e impuesto por pagar. En cada momento se cumple Activo = Pasivo + Patrimonio.
   - Comida rápida: un carrito frente a la universidad, sin empleados al inicio (datos de referencia del caso de estudio).
   Todas las cifras iniciales son SUPUESTOS DEL SIMULADOR, no datos reales de ningún negocio. */

/* ===== utilidades (compartidas con la interfaz) ===== */
let CUR = 'Bs', TC = 12;
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const rate = () => CUR === 'USD' ? TC : 1;
const nf = (x, d = 0) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: d }).format(x);
const sym = () => CUR === 'USD' ? '$us ' : 'Bs ';
const money = (x, d = 0) => { const y = x / rate(); return (y < 0 ? '−' : '') + sym() + nf(Math.abs(y), d) };
const smoney = x => (x >= 0 ? '+' : '') + money(x);
const short = x => { const y = x / rate(), a = Math.abs(y); return (y < 0 ? '−' : '') + (a >= 1e6 ? nf(a / 1e6, 1) + ' M' : a >= 1e3 ? nf(a / 1e3, a < 1e4 ? 1 : 0) + ' mil' : nf(a)) };
const pct = (x, d = 0) => nf(x * 100, d) + '%';
const rnd = () => Math.random();
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a };
const r2 = v => Math.round(v * 100) / 100;

/* ===== calendario ===== */
const MESES = 12;
// Situaciones por mes: el mes 1 tiene 3 decisiones; los meses 3, 5, 7, 9 y 11 tienen 1 decisión + 1 evento; los demás, 2 decisiones.
const PLAN = [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
const MES_EVENTO = { 3: 1, 5: 1, 7: 1, 9: 1, 11: 1 };
const NOMBRE_MES = ['', 'Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5', 'Mes 6', 'Mes 7', 'Mes 8', 'Mes 9', 'Mes 10', 'Mes 11', 'Mes 12'];
const trimestre = m => Math.min(4, Math.ceil(Math.max(1, m) / 3));
const RETRASO_MESES = 3; // un efecto que antes llegaba "el año siguiente" ahora llega 3 meses después (y:2 → 6 meses)

/* ===== impuestos ===== */
const IUE = 0.25; // Ley 843, Impuesto sobre las Utilidades de las Empresas: 25 % de la utilidad neta anual
// Régimen Tributario Simplificado (DS 24484, tabla del art. 17 sustituida por el DS 3698 de 2018): cuota bimestral según capital.
const RTS = { capitalMin: 12000, capitalMax: 60000, ventasMax: 184000, tabla: [[12001, 15000, 47], [15001, 18700, 90], [18701, 23500, 147], [23501, 29500, 158], [29501, 37000, 200], [37001, 60000, 350]] };
const cuotaRTS = capital => { for (const [a, b, c] of RTS.tabla) if (capital >= a && capital <= b) return c; return 0 };
// Régimen simplificado: excluidos con capital hasta Bs 12.000 (DS 27924 art. 2 num. 5); precio unitario máximo de vivanderos Bs 148 (DS 27924 art. 2 num. 3).
// Si al 31 de diciembre se superan los límites, se pasa al régimen general desde el 1 de enero siguiente (DS 24484 art. 13).
RTS.excluidoHasta = 12000; RTS.precioMaxVivandero = 148;
const capitalRTS = st => valorInv(st) + afNeto(st); // activo circulante (mercaderías e insumos) + activo fijo neto; el efectivo no se cuenta (DS 24484 art. 3)
const categoriaRTS = capital => { let i = 0; for (const [a, b] of RTS.tabla) { i++; if (capital >= a && capital <= b) return i } return 0 };
// Vida útil (DS 24051, anexo del art. 22): maquinaria y equipos 8 años (12,5 % anual); equipos de computación 4 años (25 %).
const VIDA = { equipos: 96, computacion: 48 };

/* ===== personal =====
   Salario mínimo nacional 2026: Bs 3.300 al mes (DS 5516). Costo para el empleador, además del sueldo:
   aportes patronales 17,21 % (Caja Nacional de Salud 10 %, riesgo profesional 1,71 %, pro vivienda 2 %, aporte patronal solidario 3,5 % según Ley 1582)
   y aguinaldo de un sueldo por año (se provisiona 1/12 cada mes y se paga al cerrar el mes 12).
   Los aportes laborales del trabajador (AFP, RC-IVA) se descuentan de su sueldo: no son costo del negocio. */
const SMN = 3300;
const CARGAS = { cns: .10, riesgo: .0171, vivienda: .02, solidario: .035 };
const CARGAS_T = Object.values(CARGAS).reduce((a, b) => a + b, 0); // 0,1721
const AGUINALDO = 1 / 12;

/* ===== tipos de negocio =====
   Unidades: cust = clientes habituales al precio de referencia; freq = compras al año por cliente; price y vc en Bs por unidad;
   fixedO y sal en Bs al año (el motor los divide entre 12); cap en unidades al año. */
const BIZ = {
 delivery: { name: 'Taxi y delivery', desc: 'Tu app conecta clientes con conductores y repartidores', def: 'RápidoYa',
  intro: 'Diriges una plataforma: la app recibe pedidos y viajes y los asigna a conductores y repartidores afiliados. La plataforma cobra una comisión por cada servicio; los vehículos son de los afiliados.',
  objetivo: 'Entender cómo la comisión, el volumen de pedidos y la capacidad de la red determinan si una plataforma gana o pierde dinero.',
  retos: ['Cobrar una comisión que deje margen sin espantar a usuarios ni afiliados', 'Crecer en pedidos sin quedarte sin capacidad de red', 'Cuidar la caja mientras la plataforma aún gana poco'],
  c: 'usuarios', u: 'pedidos', uS: 'pedido', prov: 'los conductores afiliados', nuevo: 'un servicio de envíos para empresas', suc: 'operar en una segunda ciudad', inv: 'la red de conductores', ext: 'Perú', prod: 'la app',
  cust: 4000, freq: 30, price: 6, vc: 2.6, fixedO: 150000, emp: 4, sal: 42000, cap: 135000, cash: 150000, M: 33000, inno: 35,
  duenoTrabaja: false, inventario: null, af0: [], impuesto: 'general', elast: 1.4,
  etiquetas: { price: 'Comisión por pedido', vc: 'Costo operativo por pedido', cap: 'Capacidad de la red' },
  pro: 'La demanda crece sola y el negocio escala rápido', con: 'Depende del personal y de la red; la capacidad se agota y hay más conflictos laborales',
  tx: { inventario: { o: [null, null, 'Reducir la red de conductores en las horas de poca demanda', null], oe: [null, null, { fixed: -.01, cap: -.05, sat: -4 }, null], ot: [null, null, 'gasto', null] } },
  p: { g0: .03, upe: 1.25, noise: .08, ev: { huelga: 2.2, proveedor: 1.6, boom: 1.4 } },
  supuestos: [
   ['Comisión por pedido', 'Bs 6', 'Ingreso que se queda la plataforma por cada servicio (no la tarifa completa del viaje).'],
   ['Costo operativo por pedido', 'Bs 2,60', 'Incentivos a afiliados, pasarela de pago y soporte, por pedido.'],
   ['Usuarios habituales y frecuencia', '4.000 usuarios × 30 pedidos al año', '≈ 10.000 pedidos al mes.'],
   ['Capacidad de la red', '135.000 pedidos al año', 'Pedidos que la red puede atender; el número de conductores no se modela por separado.'],
   ['Gastos fijos', 'Bs 150.000 al año', 'Oficina, servidores, licencias y servicios.'],
   ['Personal', '4 personas × Bs 3.500 de sueldo al mes', 'Más aportes patronales (17,21 %) y aguinaldo (un sueldo al año). Costo total ≈ Bs 4.394 por persona al mes.'],
   ['Caja inicial', 'Bs 150.000', 'Capital aportado por el dueño.']] },
 ecommerce: { name: 'Venta de productos', desc: 'Compras productos y los vendes por internet', def: 'TiendaClic',
  intro: 'Compras productos a proveedores, los guardas en inventario y los vendes en línea. Cada venta deja la diferencia entre el precio y lo que pagaste por el producto, el envío y la comisión de pago.',
  objetivo: 'Aprender a fijar precios, controlar el inventario y el costo por unidad, y decidir cuánto invertir en publicidad sin perder margen.',
  retos: ['Mantener el margen cuando la competencia baja precios', 'Tener inventario suficiente sin inmovilizar toda la caja', 'Despachar a tiempo cuando los pedidos crecen'],
  c: 'clientes', u: 'unidades', uS: 'unidad', prov: 'tu proveedor mayorista', nuevo: 'una línea de productos con marca propia', suc: 'abrir un punto de entrega en otra ciudad', inv: 'el depósito', ext: 'Chile', prod: 'la tienda en línea',
  cust: 1000, freq: 3, price: 180, vc: 115, fixedO: 62000, emp: 1.5, sal: SMN * 12, cap: 3400, cash: 50000, M: 8500, inno: 20,
  duenoTrabaja: false, inventario: { share: 90 / 115, merma: .01, seguridad: .25, ciclo: .5, unidad: 'productos', unidadS: 'producto' }, af0: [], impuesto: 'general', elast: 2.0,
  etiquetas: { price: 'Precio de venta', vc: 'Costo por unidad (compra + envío)', cap: 'Capacidad de despacho' },
  pro: 'Ampliar capacidad es barato y la innovación rinde más', con: 'Sin marketing pierdes clientes; mucha competencia y clientes sensibles al precio y a la reputación',
  p: { g0: -.025, repK: 1.6, mkK: 1.25, capK: 1.4, innoK: 1.6, upe: 1.7, noise: .06, ev: { competidor: 2.2, reputacion: 1.8, tecno: 1.5 } },
  supuestos: [
   ['Precio de venta', 'Bs 180 por unidad', 'Precio de referencia del mercado al empezar.'],
   ['Costo por unidad', 'Bs 115 = Bs 90 de compra al proveedor + Bs 25 de envío y comisión de pago', 'Solo los Bs 90 entran al inventario.'],
   ['Clientes y frecuencia', '1.000 clientes × 3 compras al año', '≈ 250 unidades al mes.'],
   ['Inventario de seguridad', '25 % sobre la venta esperada del mes', 'Política de compra automática; puede cambiarse a manual.'],
   ['Reposición', 'Dos compras al mes', 'Con la caja se financia media compra mensual; el resto se repone con lo vendido.'],
   ['Mermas', '1 % de lo que sobra cada mes', 'Productos dañados o que ya no se venden.'],
   ['Personal', '1,5 jornadas al salario mínimo (Bs 3.300 al mes, DS 5516)', 'Una persona a tiempo completo para depósito y despachos y otra a medio tiempo para atención. Más aportes patronales (17,21 %) y aguinaldo.'],
   ['Caja inicial', 'Bs 50.000', 'Capital aportado por el dueño.']] },
 comida: { name: 'Comida rápida', desc: 'Un carrito de comida frente a la universidad', def: 'Mi carrito de comida',
  intro: 'Diriges un pequeño carrito de comida rápida frente a una universidad. Al comenzar trabajas solo: compras los ingredientes, preparas, atiendes y cobras. Lo que vendes debe alcanzar para reponer ingredientes, pagar los gastos del carrito y cubrir lo que retiras para vivir.',
  objetivo: 'Separar el dinero del negocio de las finanzas personales, comprar ingredientes sin desperdiciar y no quedarse sin caja para reponer insumos.',
  retos: ['Que la venta alcance para volver a comprar ingredientes', 'No gastar en lo personal el dinero que el carrito necesita', 'Decidir cuándo reinvertir en el carrito y cuándo contratar ayuda'],
  c: 'comensales', u: 'platos', uS: 'plato', prov: 'tus proveedores de alimentos', nuevo: 'una línea de platos saludables', suc: 'poner un segundo carrito en otra facultad', inv: 'el carrito', ext: 'la feria gastronómica de otra ciudad', prod: 'el menú',
  cust: 200, freq: 32, price: 15, vc: 5.7, fixedO: 6600, tribO: 1200, emp: 1, sal: SMN * 12, cap: 8400, cash: 4000, M: 2000, inno: 15,
  duenoTrabaja: true, inventario: { share: 5.1 / 5.7, merma: .5, seguridad: .05, ciclo: .25, unidad: 'porciones de ingredientes', unidadS: 'porción' },
  af0: [{ n: 'Carrito con plancha y garrafa', costo: 4200, vida: VIDA.equipos }, { n: 'Utensilios y vajilla', costo: 800, vida: VIDA.computacion }], impuesto: 'rts', elast: 1.6,
  etiquetas: { price: 'Precio por plato', vc: 'Costo por plato (ingredientes + envases)', cap: 'Platos que puede preparar' },
  pro: 'Buen margen por plato y poca inversión', con: 'Una sola persona limita cuánto se atiende; los ingredientes se echan a perder si sobran',
  excluir: ['estructura', 'talento', 'fondo', 'adquisicion', 'capacitar', 'rotacion'],
  /* Textos y, cuando hace falta, efectos propios de esta modalidad. o: etiquetas de las opciones (null = la general);
     oe: efectos que reemplazan a los generales en esa opción; ot: tipo contable de esa opción. */
  tx: {
   contratar: { s: d => d.emp - 1 < .05 ? 'Atiendes solo y en las horas pico los {c} se cansan de esperar.' : 'Aun con tu ayuda actual, en las horas pico los {c} se cansan de esperar.',
    o: ['Contratar un ayudante para las horas pico (20 % de una jornada)', 'Pagar a un familiar para que ayude algunos días (10 % de una jornada)', 'Seguir como estás y alargar tu jornada', 'Comprar porciones ya preparadas a otro proveedor'] },
   control: { s: 'Llevas las cuentas del carrito en un cuaderno y no sabes con exactitud cuánto ganas.' },
   quejas: { o: ['Contratar a alguien por horas para atender pedidos por WhatsApp', null, null, null] },
   faltaPersonal: { s: d => d.emp - 1 < .05 ? 'Tu carrito ya puede preparar más platos, pero trabajas solo: la demanda que podrías atender supera lo que tus manos alcanzan a hacer.' : 'Tu carrito puede preparar más platos de los que tú y tu ayuda alcanzan a atender.',
    o: ['Contratar ayuda por horas (30 % de una jornada)', 'Alargar tu propia jornada (sin pago extra, con más cansancio)', 'Comprar equipos para preparar por adelantado (conservadora y recipientes): {$0.06}', 'Seguir como estás'],
    oe: [null, { upe: .12, sat: -2 }, null, null], ot: [null, null, 'inversion', null] },
   prestamo: { o: ['Tomarlo todo: ampliar el carrito y contratar ayuda por horas', null, null, null] },
   sinCapacidad: { o: ['Ampliar el carrito y contratar ayuda por horas: {$0.08}', 'Subir el precio para moderar los pedidos', 'Comprar porciones ya preparadas para el excedente', 'Seguir igual'] },
   ventasCaen: { o: [null, null, null, 'Reducir gastos del carrito'] },
   credito: { s: 'Una oficina cercana quiere pedirte almuerzos para su personal todos los días, pero pagando a fin de mes.', o: ['Aceptar y cobrar a fin de mes', 'Aceptar solo con 50% de adelanto', 'Vender solo al contado'] },
   costos: { s: 'Tus gastos del carrito crecieron más rápido que tus ventas.', o: ['Recortar gastos en general', 'Renegociar el gas, el transporte y otros servicios', 'Ordenar y simplificar la preparación: {$0.04}', 'Mantener los gastos'], ot: [null, null, 'gasto', null] },
   riesgos: { s: 'A otro vendedor de la zona le robaron su carrito y perdió casi todo. Te preguntas qué pasaría si te ocurriera a ti.', o: ['Contratar un seguro contra robo e incendio: {$m0.012} al mes', 'Tener más de un proveedor y diversificar clientes: {$0.02}', null, null] },
   tecnologia: { s: 'Una aplicación en el celular integraría tus cobros con QR, tus compras de ingredientes y tu inventario.', o: ['Implementarla completa: {$0.08}', 'Versión básica: {$0.03}', 'Encargar una versión a medida con un préstamo de {$0.12}', 'Seguir anotando a mano'] },
   nuevoProd: { o: [null, 'Probar unos días en el carrito: {$0.03}', 'Copiar los platos que ya venden otros puestos', null] },
   segundaMarca: { s: 'Puedes ofrecer una segunda línea de platos para otro tipo de cliente.', o: ['Línea económica: {$0.08}', 'Línea especial a mayor precio: {$0.08}', 'Mantener un solo menú'] },
   marca: { s: 'Te proponen auspiciar la feria de bienvenida de la universidad.', o: ['Auspicio principal: {$0.07}', 'Publicidad en redes con resultados medibles: {$0.03}', 'Apoyar una actividad solidaria del barrio: {$0.02}', 'No participar'] },
   competidor: { s: 'Una cadena de comida rápida abre un local cerca de la universidad, con mucha publicidad.' },
   clienteClave: { s: 'Un grupo de estudiantes que te compraba todos los días se cambia a otro puesto.', o: ['Ofrecerles un descuento para que vuelvan: {$0.01}', 'Salir a buscar clientes nuevos: {$0.04}', 'Ajustar tus compras y gastos al nuevo tamaño'] },
   remate: { s: 'Un puesto vecino cierra y remata sus equipos.', o: ['Comprar todos sus equipos: {$0.08}', 'Comprar solo lo indispensable: {$0.03}', 'Dejar pasar'] },
   falla: { s: 'Se daña la plancha y no puedes cocinar con normalidad.', o: ['Reparación urgente: {$0.04}', 'Aprovechar para cambiar el equipo: {$0.09}', 'Trabajar con lo que queda'] },
   impuestos: { s: 'La alcaldía sube la tasa por el permiso de venta en la vía pública.', o: ['Revisar con un asesor tus pagos y tu categoría: {$0.01}', 'Trasladarlo al precio', 'Absorberlo'] },
   sostenible: { s: 'Tus clientes y la alcaldía exigen envases biodegradables y un manejo responsable de la basura.' },
   angel: { s: 'Alguien con ahorros quiere entrar como socio en tu carrito.' },
   planta: { s: 'Una cocina mejor equipada (freidora industrial, conservadora) bajaría tu costo por plato.', o: ['Comprarla con un préstamo de {$0.25}', 'Alquilar el equipo: {$m0.05} al mes', 'Mejorar el equipo que ya tienes: {$0.06}', 'No invertir'] },
   internacional: { s: 'Te invitan a llevar tu carrito a {ext} durante una temporada.', o: ['Ir con un carrito propio y un préstamo de {$0.40}, y contratar ayuda por horas para el carrito de aquí', 'Ir como invitado de otro puesto: {$0.05}', 'Quedarte y reforzar tu clientela: {$0.05}', 'No ir'] },
   sucursal: { o: ['Comprar el segundo carrito, atendido por un vendedor a medio tiempo, con un préstamo de {$0.35}', 'Comprarlo con caja propia y contratar un vendedor a medio tiempo: {$0.35}', 'Prestar tu marca a otro vendedor a cambio de un pago', 'No por ahora'],
    oe: [{ debt: .35, cap: .6, fixed: .06, empN: .5, cust: .12, g: .12 }, { cash: -.35, cap: .6, fixed: .06, empN: .5, cust: .12, g: .12 }, null, null] },
   inventario: { s: 'En las horas de más gente se te acaban las porciones preparadas y pierdes ventas.', o: ['Ampliar el carrito (más plancha y conservadora): {$0.06}', 'Anotar y prever cuánto se vende cada día: {$0.02}', null, 'Dejarlo así'] },
   huelga: { s: 'Tu ayudante pide mejores condiciones y amenaza con dejar el trabajo.', o: ['Subirle el pago: {$m0.02} al mes', 'Darle un bono único: {$0.025}', 'Mantenerte firme'] },
   dividendos: { s: 'Hay que decidir qué hacer con lo que el carrito ha ganado.', o: [null, null, 'Llevarte una parte extra para ti: {$0.08}', 'Guardarlo como reserva del carrito'] } },
  p: { g0: 0, mkK: .85, capK: .7, vcK: 1.3, sat: 2.1, upe: 1, noise: .03, rdBase: true, ev: { proveedor: 1.8, falla: 1.6, huelga: .5 } },
  supuestos: [
   ['Precio por plato', 'Bs 15', 'Supuesto del simulador (no es un precio de mercado verificado).'],
   ['Ingredientes por plato', 'Bs 5,10', 'Pan, carne o pollo, papas, verduras, condimentos y aceite. Entran al inventario.'],
   ['Envases por plato', 'Bs 0,60', 'Plato o bolsa descartable y servilletas. Se pagan al vender; no se inventarían.'],
   ['Comensales habituales y frecuencia', '200 comensales × 32 platos al año', '≈ 534 platos al mes (≈ 22 al día en 24 días hábiles).'],
   ['Capacidad atendiendo solo', '700 platos al mes', 'Máximo que una persona prepara y atiende en el carrito.'],
   ['Gastos operativos', 'Bs 650 al mes', 'Permiso municipal de venta Bs 100 (se muestra aparte como tasa municipal), gas Bs 70, transporte para comprar insumos Bs 250, agua Bs 40, limpieza Bs 60, mantenimiento Bs 80 y teléfono o cobro con QR Bs 50. Sin alquiler: el carrito trabaja en la vía pública con permiso.'],
   ['Mano de obra', 'Sin sueldos al inicio', 'El dueño trabaja solo y no cobra sueldo: vive de sus retiros, que no son gastos. Si decide contratar ayuda, paga la fracción de jornada al salario mínimo nacional 2026 (Bs 3.300 al mes, DS 5516), más aportes patronales (17,21 %) y aguinaldo.'],
   ['Inversión inicial', 'Bs 5.000', 'Carrito con plancha y garrafa Bs 4.200 (8 años) y utensilios y vajilla Bs 800 (4 años), según los plazos del DS 24051. Depreciación ≈ Bs 60 al mes.'],
   ['Caja inicial (capital de trabajo)', 'Bs 4.000', 'Alcanza para unas 6 semanas de ingredientes o para un mes de compras y gastos.'],
   ['Compra de ingredientes', 'Semanal; stock de seguridad 5 %', 'Con la caja se compra una semana; lo vendido financia la compra siguiente.'],
   ['Mermas', '50 % de las porciones que sobran a fin de mes', 'Los ingredientes son perecibles.'],
   ['Innovación', 'Sin costo al nivel inicial', 'Solo cuesta mantener la innovación que se agregue con decisiones.'],
   ['Impuestos', 'Régimen Tributario Simplificado', 'Capital = ingredientes en inventario + equipos (sin el efectivo). Con capital de hasta Bs 12.000 queda excluido del régimen (DS 27924) y no paga cuota; desde Bs 12.001, cuota bimestral según la tabla del DS 3698. La cuota reemplaza al IVA, el IT y el IUE.'],
   ['Resultado esperado del primer mes', '≈ Bs 4.200 antes de retiros', 'Resulta de los supuestos anteriores; no está fijado. Incluye lo que el dueño gana por su trabajo, porque no cobra sueldo.']] }
};
const LEVELS = [null,
 { n: 'Emprendedor', d: 'Primer trimestre: precio, primeros clientes y orden en las cuentas.' },
 { n: 'Gerente', d: 'Segundo trimestre: deuda, costos, competencia y servicio.' },
 { n: 'Director', d: 'Tercer trimestre: crecer, invertir en tecnología y nuevos productos.' },
 { n: 'CEO', d: 'Último trimestre: lo que decidas ahora define cómo termina el año.' }];

/* ===== registro contable de cada opción =====
   Por defecto el tipo se deduce de los efectos (ver tipoContable). Aquí van las excepciones: una lista por decisión,
   con el tipo de cada opción en orden. 'computacion' = inversión en sistemas (vida útil 4 años).
   Tipos: gasto, inversion, computacion, financiamiento, aporte, distribucion (al dueño y socios), socio (solo a un socio),
   anticipo, cxp, cxc, ingreso, ventaActivo, conversion, incobrable. */
const CONT = {
 proveedor1: ['anticipo', 'cxp', 'gasto', null],
 credito: ['cxc', 'cxc', null],
 control: ['computacion', null, null, null],
 inventario: ['inversion', 'computacion', 'ventaActivo', null],
 costos: [null, null, 'computacion', null],
 tecnologia: ['computacion', 'computacion', 'computacion', null],
 estructura: [null, null, 'computacion', null],
 faltaPersonal: [null, null, 'computacion', null],
 sucursal: ['inversion', 'inversion', 'ingreso', null],
 dividendos: [null, null, 'distribucion', null],
 cajaRoja: ['financiamiento', 'ventaActivo', null, 'aporte'],
 deudaAlta: ['gasto', 'ventaActivo', 'conversion', null],
 tecno: ['computacion', 'gasto', null],
 falla: ['gasto', 'inversion', null],
 adquisicion: ['inversion', 'inversion', 'gasto', null],
 internacional: ['inversion', 'gasto', 'gasto', null]
};
// Tipo contable de los efectos diferidos y de los resultados inciertos que mueven dinero.
// 'multa': gasto que no se deduce para el IUE (multas tributarias: DS 24051 art. 14, modificado por DS 29512; la multa ambiental se trata igual, como supuesto).
const CONT_LATER = { 'prestamo.2': 'socio', 'angel.0': 'socio', 'sucursal.2': 'ingreso', 'cajaOciosa.2': 'ingreso', 'control.3': 'multa' };
const CONT_ALT = { 'credito.0': 'incobrable', 'sostenible.2': 'multa' };


/* ===== decisiones =====
 Efectos (e): cash, debt y pay se miden como fracción de las ventas anuales de referencia (S) y se multiplican por dineroK (0,2);
 fixed es un gasto ANUAL como fracción de S (el motor lo cobra por mes). cust, price, vc, cap, upe, pref son cambios porcentuales.
 emp suma 10 % del personal por unidad; empP porcentaje. rep, sat, prod, inno son puntos. g es impulso comercial. rate cambia la tasa de interés.
 later: efectos que llegan y × 3 meses después. f(s): ajuste según el estado. alt: resultado incierto con probabilidad p(s).
 El efecto del precio sobre los clientes NO está en las opciones: lo calcula la regla de demanda (factorDemanda). */
const D=[
/* --- Nivel 1 --- */
{id:'precio1',a:'Precios',lv:1,c:'margen',s:'Tus primeros {c} dicen que tu precio es bueno. Un asesor cree que estás cobrando muy poco.',o:[
 {l:'Subir el precio 8%',e:{price:.08},w:'Subir el precio mejora lo que ganas por cada venta, pero algunos clientes sensibles al precio se van. Con buena reputación se van menos.'},
 {l:'Mantener el precio',e:{},w:'No cambiar nada conserva tu situación actual: ni ganas margen ni arriesgas clientes.'},
 {l:'Bajar el precio 8% para ganar mercado',e:{price:-.08},w:'Un precio menor atrae clientes, pero cada venta deja menos. Solo conviene si el volumen extra compensa el margen perdido.'},
 {l:'Crear una versión básica y otra premium: {$0.02}',e:{cash:-.02,price:.04,cust:.07,fixed:.015,inno:3},w:'Segmentar permite cobrar más a quien valora más, sin perder a quien busca precio. Cuesta un poco más de gestionar.'}]},
{id:'mkt1',a:'Marketing',lv:1,c:'clientes',s:'Casi nadie te conoce fuera de tu zona. Necesitas decidir cuánto invertir en darte a conocer.',o:[
 {l:'Campaña fuerte: {$0.06} ahora',mk:1,e:{cash:-.06,g:.10,rep:3},later:[{y:1,e:{cust:.04},t:'La campaña de hace unos meses sigue trayendo {c}.'}],flag:'mktBig',w:'La publicidad gasta caja hoy y trae clientes durante varios meses. El riesgo es crecer más rápido de lo que puedes atender.'},
 {l:'Redes sociales propias: {$m0.01} al mes',mk:1,e:{fixed:.01,g:.04},w:'Un gasto pequeño y constante construye audiencia de a poco, sin comprometer la caja.'},
 {l:'Programa de referidos: {$0.01}',e:{cash:-.01,g:.03,sat:3},w:'Premiar a quien te recomienda cuesta poco y trae clientes que ya confían en ti.'},
 {l:'No invertir todavía',e:{g:-.02},later:[{y:1,e:{cust:-.03},t:'Tu competidor ganó la visibilidad que tú no buscaste.'}],w:'Conservas el efectivo, pero el mercado no espera: quien sí se promociona se queda con los clientes nuevos.'}]},
{id:'credito',a:'Flujo de caja',lv:1,c:'flujo',s:'Una empresa grande quiere comprarte todos los meses, pero pagando a 60 días.',o:[
 {l:'Aceptar la venta a crédito',e:{cust:.06,cash:-.04},alt:{p:s=>.6+(s.flags.sistema||s.flags.contador?.25:0),ok:{t:'El cliente paga puntual, aunque tu dinero queda atrapado 60 días.'},no:{e:{cash:-.03},t:'El cliente se atrasó y una parte quedó incobrable.'}},w:'Vender a crédito sube las ventas, pero el dinero tarda en llegar. Mientras tanto tú sí pagas sueldos y proveedores.'},
 {l:'Aceptar solo con 50% de adelanto',e:{cust:.03,cash:-.01},w:'El adelanto reduce el dinero atrapado y filtra a los clientes que no piensan pagar.'},
 {l:'Vender solo al contado',e:{},w:'Proteges tu caja a costa de renunciar a una venta grande.'}]},
{id:'contratar',a:'Contratación',lv:1,c:'capacidad',s:'No das abasto: tú y tu equipo hacen de todo y los {c} empiezan a esperar.',o:[
 {l:'Ampliar el equipo 20%',e:{emp:2,cap:.20,prod:4,sat:4},f:(s,c)=>c.uso0>=.9?{e:{g:.03},t:'Antes atendías a casi el límite de tu capacidad: con más manos recuperas a {c} que se iban por la espera.'}:{t:'Hoy tu capacidad todavía alcanza para la demanda: la ayuda mejora la atención, pero por sí sola no trae más ventas.'},later:[{y:1,e:{prod:3},t:'Las personas que contrataste ya dominan su trabajo.'}],w:'Más personal sube tu capacidad, pero también tus costos fijos: los sueldos se pagan aunque las ventas bajen.'},
 {l:'Ampliar el equipo 10%',e:{emp:1,cap:.10,sat:2},w:'Un paso prudente: amplías capacidad sin subir demasiado el punto de equilibrio.'},
 {l:'Seguir igual y hacer horas extra',e:{prod:-5,sat:-3},later:[{y:1,e:{sat:-4,prod:-3},t:'El cansancio acumulado ya se nota en el servicio.'}],w:'A corto plazo ahorras; a mediano plazo el cansancio baja la calidad y los clientes lo sienten.'},
 {l:'Tercerizar parte del trabajo',e:{vc:.04,cap:.15},w:'Tercerizar convierte un costo fijo en variable: pagas solo cuando vendes, pero cada venta deja menos.'}]},
{id:'proveedor1',a:'Compras',lv:1,c:'fijos',s:'{Prov} te ofrecen 8% de descuento si pagas por adelantado tus próximas compras.',o:[
 {l:'Pagar por adelantado: {$0.08}',e:{cash:-.08,vc:-.08},w:'Bajas tu costo por unidad, pero inmovilizas efectivo. Es buena idea solo si la caja aguanta.'},
 {l:'Pedir 30 días de plazo en vez del descuento',e:{cash:.03},w:'El plazo de pago es financiamiento gratis: mejora tu caja sin endeudarte.'},
 {l:'Buscar un segundo proveedor',e:{cash:-.005,vc:-.03},flag:'dosProv',w:'Tener dos proveedores te da poder de negociación y te protege si uno falla.'},
 {l:'Seguir como estás',e:{},w:'No cambias nada: ni ahorras ni te expones.'}]},
{id:'control',a:'Finanzas',lv:1,c:'utilidad',s:'Llevas las cuentas en un cuaderno y no sabes con exactitud cuánto ganas.',o:[
 {l:'Comprar un sistema de ventas y contabilidad: {$0.02}',e:{cash:-.02,prod:6,inno:5},flag:'sistema',later:[{y:1,e:{fixed:-.01},t:'Con tu sistema de control detectaste gastos innecesarios y los cortaste.'}],w:'Saber tus números reales permite detectar fugas y decidir con datos en vez de intuición.'},
 {l:'Contratar un contador externo: {$m0.012} al mes',e:{fixed:.012,prod:4},flag:'contador',w:'Un contador ordena tus obligaciones y evita multas, a cambio de un gasto fijo.'},
 {l:'Armar una planilla de Excel',e:{prod:2},w:'Es mejor que nada y no cuesta, pero depende de que la actualices con disciplina.'},
 {l:'Seguir con el cuaderno',e:{},flag:'sinControl',later:[{y:1,e:{cash:-.02,rep:-2},t:'Sin registros ordenados, te llegó una multa por errores en tus declaraciones.'}],w:'Sin registros confiables, los problemas se descubren tarde.'}]},
/* --- Nivel 2 --- */
{id:'ventasCaen',a:'Ventas',lv:2,c:'ventas',s:'Las ventas de los últimos meses bajaron 12%. Tienes que decidir cómo responder.',pre:s=>({e:{cust:-.04},t:'Ya perdiste parte de tus {c} este trimestre.'}),o:[
 {l:'Aumentar la publicidad: {$0.04}',mk:1,e:{cash:-.04,g:.07},w:'La publicidad recupera clientes si el problema era visibilidad. Si el problema es el producto, solo acelera el gasto.'},
 {l:'Reducir los precios 7%',e:{price:-.07},w:'Bajar precios recupera volumen rápido, pero es difícil volver a subirlos después.'},
 {l:'Lanzar {nuevo}: {$0.07}',e:{cash:-.07,inno:10},alt:{p:s=>.4+s.inno/200,ok:{e:{cust:.16,price:.03},t:'El lanzamiento gusta y atrae {c} nuevos.'},no:{e:{cust:.02},t:'El lanzamiento pasa casi desapercibido.'}},w:'Un producto nuevo puede reactivar la demanda, pero su éxito no está garantizado. Las empresas más innovadoras aciertan más seguido.'},
 {l:'Reducir gastos operativos',e:{fixed:-.03,sat:-3,prod:-2},w:'Recortar protege la utilidad hoy, pero no ataca la causa de la caída y puede dañar el servicio.'}]},
{id:'prestamo',a:'Endeudamiento',lv:2,c:'deuda',s:'El banco te ofrece un préstamo de {$0.25} para crecer.',o:[
 {l:'Tomarlo todo y ampliar la capacidad',e:{debt:.25,cash:.08,cap:.30,emp:2,g:.05},f:s=>met(s).risk>40?{e:{rate:.04},t:'El banco te ve como cliente riesgoso y te subió la tasa de interés.'}:null,flag:'prestamo',w:'El préstamo te da capacidad para vender más, pero pagarás intereses y capital cada mes. Si las ventas no crecen, la deuda pesa.'},
 {l:'Tomar la mitad como colchón de caja',e:{debt:.12,cash:.12},w:'Tener reserva te protege en una crisis, aunque pagar intereses por dinero quieto tiene un costo.'},
 {l:'Buscar un socio en lugar del banco',e:{cash:.20,own:-.2},flag:'socio',later:[{y:2,e:{cash:-.05},t:'Tu socio cobró su parte de las utilidades.'}],w:'Un socio no cobra intereses, pero comparte las ganancias futuras y opina en las decisiones.'},
 {l:'No endeudarse',e:{},w:'Creces más lento, pero sin compromisos fijos con el banco.'}]},
{id:'inventario',a:'Inventarios',lv:2,c:'capacidad',s:'En las horas y fechas de más demanda no alcanzas a atender y pierdes ventas.',o:[
 {l:'Ampliar {inv}: {$0.06}',e:{cash:-.06,cap:.25,sat:4},w:'Más capacidad evita ventas perdidas, pero es dinero inmovilizado si la demanda no llega.'},
 {l:'Usar un sistema de pronóstico de demanda: {$0.02}',e:{cash:-.02,cap:.10,prod:5,inno:4},w:'Anticipar la demanda permite atender más con lo mismo.'},
 {l:'Vender equipos que casi no usas para liberar caja',e:{cash:.03,cap:-.05,sat:-4},w:'Menos recursos parados mejora la caja, pero cualquier pico de demanda te deja sin poder atender.'},
 {l:'Dejarlo así',e:{sat:-3},w:'Los clientes que no logras atender se acuerdan.'}]},
{id:'capacitar',a:'Capacitación',lv:2,c:'productividad',s:'Tu equipo comete errores que cuestan dinero y tiempo.',o:[
 {l:'Programa de capacitación: {$0.02}',e:{cash:-.02,prod:8,sat:3},f:s=>s.flags.despidos?(delete s.flags.despidos,{e:{sat:4,rep:3},t:'Después de los despidos, invertir en tu gente recompuso el ambiente y tu imagen como empleador.'}):null,later:[{y:1,e:{prod:4},t:'La capacitación maduró: tu equipo trabaja mejor.'}],w:'Capacitar cuesta hoy y rinde durante meses, aunque contablemente es un gasto del período.'},
 {l:'Bonos por desempeño: {$m0.015} al mes',e:{pers:.015,prod:6},w:'Los incentivos alinean al equipo con los resultados, pero se vuelven un costo permanente.'},
 {l:'Reemplazar a quienes rinden menos',e:{cash:-.015,prod:5,sat:-5,rep:-2},flag:'despidos',later:[{y:1,e:{prod:-3,rep:-2},t:'Tras los despidos de hace unos meses, hubo renuncias y se habla mal de la empresa como empleador.'}],w:'Mejora el rendimiento rápido, pero daña el ambiente laboral y puede provocar renuncias.'},
 {l:'No hacer nada',e:{prod:-3},w:'Los errores se repiten y se vuelven costumbre.'}]},
{id:'quejas',a:'Clientes',lv:2,c:'reputacion',s:'Las quejas en redes sociales están aumentando.',o:[
 {l:'Crear un puesto de atención al cliente',e:{emp:1,sat:10,rep:4},w:'Atender bien retiene clientes, y retener es más barato que conseguir nuevos.'},
 {l:'Compensar a los afectados: {$0.015}',e:{cash:-.015,sat:5,rep:3},w:'Resuelve el momento, pero no cambia la causa de las quejas.'},
 {l:'Programa de fidelización: {$m0.012} al mes',e:{fixed:.012,sat:7,g:.03},w:'Premiar la recompra hace que tus clientes vuelvan y te recomienden.'},
 {l:'Ignorarlas',e:{sat:-6,rep:-6},later:[{y:1,e:{cust:-.05},t:'Las quejas sin respuesta espantaron a {c}.'}],w:'Una queja ignorada en público la leen cientos de posibles clientes.'}]},
{id:'copia',a:'Competencia',lv:2,pre:s=>({e:{pref:-.05},t:'El precio de referencia del mercado bajó 5%: tu precio ahora se ve más caro.'}),c:'share',s:'Un competidor copia tu oferta y cobra 10% menos.',o:[
 {l:'Entrar en guerra de precios',e:{price:-.10},later:[{y:1,e:{price:-.02},t:'El mercado se acostumbró a los precios bajos de la guerra de precios.'}],w:'Igualar precios defiende clientes, pero reduce el margen de todos. Gana quien tiene costos más bajos.'},
 {l:'Diferenciarte por calidad: {$0.03}',e:{cash:-.03,vc:.02,rep:6,sat:5},w:'Competir por calidad protege tu precio y construye reputación.'},
 {l:'Aliarte con él para comprar juntos',e:{vc:-.04,inno:-2},w:'Comprar en conjunto baja costos para ambos, aunque te vuelve más parecido a tu rival.'},
 {l:'No reaccionar',e:{},w:'Los clientes sensibles al precio se cambian.'}]},
{id:'costos',a:'Reducción de costos',lv:2,c:'fijos',s:'Tus gastos fijos crecieron más rápido que tus ventas.',o:[
 {l:'Recorte general de gastos',e:{fixed:-.05,prod:-4,sat:-3},later:[{y:1,e:{cust:-.03},t:'El recorte de gastos se notó en el servicio y algunos {c} se fueron.'}],w:'El recorte parejo es rápido, pero corta también lo que sí generaba valor.'},
 {l:'Renegociar alquiler y servicios',e:{fixed:-.02},w:'Negociar contratos baja costos sin afectar la operación.'},
 {l:'Automatizar tareas: {$0.04}',e:{cash:-.04,fixed:-.03,inno:6,prod:3},w:'Automatizar exige inversión inicial y reduce costos todos los meses siguientes.'},
 {l:'Mantener los gastos',e:{},w:'Tu punto de equilibrio sigue alto.'}]},
/* --- Nivel 3 --- */
{id:'sucursal',a:'Apertura de sucursales',lv:3,c:'equilibrio',s:'Aparece la oportunidad de {suc}.',o:[
 {l:'Hacerlo con un préstamo de {$0.35}',e:{debt:.35,cap:.6,fixed:.06,emp:3,cust:.12,g:.12},flag:'sucursal',later:[{y:1,e:{cust:.08},t:'La nueva sede ya tiene clientela propia.'}],w:'Expandirse con deuda acelera el crecimiento, pero duplica los compromisos: más costos fijos y cuotas al banco.'},
 {l:'Hacerlo con caja propia: {$0.35}',e:{cash:-.35,cap:.6,fixed:.06,emp:3,cust:.12,g:.12},flag:'sucursal',later:[{y:1,e:{cust:.08},t:'La nueva sede ya tiene clientela propia.'}],f:s=>s.cash<0?{t:'No tenías caja suficiente: quedaste en rojo y tendrás que cubrirlo con crédito caro.'}:null,w:'Usar tu propio dinero evita intereses, pero te deja sin colchón si algo sale mal.'},
 {l:'Dar una franquicia a un tercero',e:{cash:.05,g:.08,rep:-2},flag:'franquicia',later:[{y:1,e:{cash:.04,sat:-3},t:'La franquicia te pagó regalías, pero su servicio es disparejo.'}],w:'La franquicia crece con dinero ajeno; a cambio pierdes control sobre la calidad.'},
 {l:'No expandirse por ahora',e:{},w:'Consolidar lo que tienes es válido, aunque otro puede ocupar ese espacio.'}]},
{id:'nuevoProd',a:'Nuevos productos',lv:3,c:'ventas',s:'Ves la oportunidad de lanzar {nuevo}.',o:[
 {l:'Desarrollo completo: {$0.10}',e:{cash:-.10,inno:15},alt:{p:s=>.35+s.inno/150,ok:{e:{cust:.22,price:.05,rep:5},t:'El lanzamiento es un éxito.'},no:{e:{rep:-2},t:'El producto no encontró su público.'}},w:'Innovar a fondo puede cambiar el tamaño de la empresa, pero es una apuesta. La experiencia innovando mejora las probabilidades.'},
 {l:'Piloto pequeño: {$0.03}',e:{cash:-.03,inno:7,cust:.03},w:'Probar en pequeño limita la pérdida y enseña qué quiere el cliente.'},
 {l:'Copiar lo que ya funciona en el mercado',e:{cash:-.02,cust:.04,inno:-3},w:'Imitar es barato y seguro, pero no te diferencia.'},
 {l:'No lanzar nada',e:{},w:'Tu oferta envejece mientras la de otros se renueva.'}]},
{id:'tecnologia',a:'Tecnología',lv:3,c:'productividad',s:'Una plataforma de gestión integraría ventas, compras y finanzas de toda la empresa.',o:[
 {l:'Implementarla completa: {$0.08}',e:{cash:-.08,prod:10,inno:8},later:[{y:1,e:{fixed:-.02,sat:4},t:'La plataforma redujo errores y gastos administrativos.'}],w:'La tecnología cuesta al inicio y luego ahorra todos los meses.'},
 {l:'Versión básica: {$0.03}',e:{cash:-.03,prod:4},w:'Resuelve lo urgente con poco dinero.'},
 {l:'Desarrollo a medida con un préstamo de {$0.12}',e:{debt:.12,prod:12,inno:12,cap:.10},w:'Una solución propia puede ser una ventaja competitiva, pagada con deuda.'},
 {l:'Seguir con los procesos actuales',e:{},later:[{y:1,e:{prod:-4},t:'Tus procesos quedaron lentos frente a los de la competencia.'}],w:'No invertir en tecnología no es gratis: el atraso se acumula.'}]},
{id:'riesgos',a:'Gestión de riesgos',lv:3,c:'riesgo',s:'Un comerciante de tu zona perdió buena parte de su negocio por un imprevisto (un robo, un incendio, una inundación). Te preguntas qué pasaría si te ocurriera a ti.',o:[
 {l:'Contratar un seguro integral: {$m0.012} al mes',e:{fixed:.012},flag:'seguro',w:'El seguro es un costo seguro que evita una pérdida grande e incierta.'},
 {l:'Diversificar proveedores y clientes: {$0.02}',e:{cash:-.02,vc:.01},flag:'dosProv',w:'No depender de uno solo reduce el daño cuando alguno falla.'},
 {l:'Pagar deuda por adelantado',e:{pay:.15},w:'Menos deuda significa menos intereses y más resistencia ante una crisis.'},
 {l:'No hacer nada',e:{},w:'El riesgo no desaparece por no mirarlo.'}]},
{id:'talento',a:'Recursos humanos',lv:3,c:'productividad',s:'Tu empleado con más experiencia recibió una oferta de la competencia.',o:[
 {l:'Igualar la oferta: {$m0.015} al mes',e:{pers:.015,prod:2},w:'Retener cuesta menos que reemplazar, pero otros pedirán lo mismo.'},
 {l:'Ofrecerle un bono según los resultados',e:{pers:.008,prod:6,sat:2},w:'Quien gana cuando la empresa gana, cuida la empresa.'},
 {l:'Dejarlo ir',e:{prod:-8},alt:{p:s=>.25+s.sat/200,ok:{t:'Se va en buenos términos.'},no:{e:{cust:-.05},t:'Se llevó a varios {c} con él.'}},w:'Perder a alguien clave se paga en conocimiento y, a veces, en clientes.'},
 {l:'Plan de carrera para todo el equipo: {$0.02}',e:{cash:-.02,prod:5,sat:2},w:'Un plan de carrera reduce la rotación de todos, no solo de uno.'}]},
{id:'inflacion',a:'Precios',lv:3,c:'margen',s:'La inflación subió tus costos en los últimos meses.',pre:s=>({e:{vc:.06,pref:.04},t:'Tu costo por unidad subió 6% y los precios del mercado subieron 4%.'}),o:[
 {l:'Trasladar todo el aumento al precio',e:{price:.06},w:'Clientes satisfechos toleran mejor un aumento de precio.'},
 {l:'Trasladar la mitad',e:{price:.03},w:'Compartes el golpe entre tu margen y tu cliente.'},
 {l:'Absorber el aumento',e:{rep:3,sat:3},w:'Ganas simpatía y pierdes margen.'},
 {l:'Rediseñar la oferta para bajar costos: {$0.03}',e:{cash:-.03,vc:-.04,inno:4},w:'Cambiar cómo produces ataca la causa en vez de pasar la factura.'}]},
{id:'marca',a:'Publicidad',lv:3,c:'reputacion',s:'Te proponen auspiciar el principal evento de la ciudad.',o:[
 {l:'Gran auspicio: {$0.07}',mk:1,e:{cash:-.07,rep:10,g:.06},later:[{y:1,e:{cust:.03},t:'Tu marca quedó en la memoria de la gente tras el auspicio.'}],w:'La publicidad de marca construye reputación, aunque su efecto en ventas es difícil de medir.'},
 {l:'Marketing digital con resultados medibles: {$0.03}',mk:1,e:{cash:-.03,g:.06},w:'Pagar por resultado permite saber qué funciona.'},
 {l:'Programa de responsabilidad social: {$0.02}',e:{cash:-.02,rep:7,sat:2},w:'Aportar a la comunidad mejora la imagen de forma duradera.'},
 {l:'No participar',e:{},w:'Ahorras hoy; tu marca sigue igual de conocida.'}]},
/* --- Nivel 4 --- */
{id:'internacional',a:'Expansión',lv:4,c:'riesgo',s:'Un empresario de {ext} te propone llevar tu negocio allá.',o:[
 {l:'Entrar con operación propia y un préstamo de {$0.40}',e:{debt:.40,fixed:.08,cap:.30,emp:2},flag:'export',alt:{p:s=>.3+s.rep/200+s.inno/400,ok:{e:{cust:.45,rep:5},t:'El nuevo mercado respondió muy bien.'},no:{e:{cust:.15,rep:-3},t:'El mercado resultó más difícil de lo esperado.'}},w:'Salir del país multiplica el mercado y el riesgo. Una marca fuerte e innovadora tiene más probabilidad de lograrlo.'},
 {l:'Entrar con un distribuidor local: {$0.05}',e:{cash:-.05,cust:.12},flag:'export',later:[{y:1,e:{cust:.05},t:'Tu distribuidor en el exterior amplió su cobertura.'}],w:'Un distribuidor local reduce la inversión y el riesgo, a cambio de un crecimiento menor.'},
 {l:'Reforzar el mercado local: {$0.05}',e:{cash:-.05,g:.08,rep:3},w:'Ser fuerte en casa antes de salir es una estrategia válida.'},
 {l:'Rechazar la propuesta',e:{},w:'Evitas el riesgo y también la oportunidad.'}]},
{id:'adquisicion',a:'Inversiones',lv:4,c:'valor',s:'Tu competidor más pequeño está en venta por {$0.30}.',o:[
 {l:'Comprarlo con deuda',e:{debt:.30,cust:.25,cap:.25,emp:2,fixed:.03,prod:-5},w:'Comprar un competidor da clientes de inmediato, pero integrar dos empresas es difícil y la deuda queda.'},
 {l:'Comprarlo con caja propia',e:{cash:-.30,cust:.25,cap:.25,emp:2,fixed:.03,prod:-5},w:'Sin deuda nueva, pero con la caja comprometida.'},
 {l:'Contratar solo a su mejor personal: {$0.06}',e:{cash:-.06,cust:.06,prod:3,emp:1},w:'Te llevas el talento sin cargar con toda la empresa.'},
 {l:'No comprar',e:{},later:[{y:1,e:{cust:-.06},t:'Un rival grande compró a ese competidor y ahora te quita {c}.'}],w:'Lo que tú no compras, lo puede comprar otro.'}]},
{id:'planta',a:'Producción',lv:4,c:'fijos',s:'Un centro de operaciones automatizado bajaría tus costos por unidad.',o:[
 {l:'Construirlo con un préstamo de {$0.25}',e:{debt:.25,vc:-.15,cap:.40,upe:.3,inno:8},later:[{y:1,e:{vc:-.04},t:'El equipo ya domina el centro automatizado y los costos bajaron más.'}],w:'Una gran inversión baja el costo unitario para siempre, si hay volumen suficiente para aprovecharla.'},
 {l:'Alquilarlo: {$m0.05} al mes',e:{fixed:.05,vc:-.07,cap:.30},w:'Alquilar evita la deuda, pero sube tus costos fijos.'},
 {l:'Mejorar lo que ya tienes: {$0.06}',e:{cash:-.06,vc:-.03,cap:.10},w:'Mejoras graduales con riesgo bajo.'},
 {l:'No invertir',e:{},w:'Tus costos quedan donde están.'}]},
{id:'estructura',a:'Contratación y despidos',lv:4,c:'productividad',s:'Con más pedidos y más tareas, las decisiones del día a día se volvieron lentas.',o:[
 {l:'Reestructurar y despedir al 20% del personal',e:{empP:-.2,fixed:-.03,prod:6,sat:-6,rep:-4},flag:'despidos',later:[{y:1,e:{prod:-5},t:'Tras los despidos, varios buenos empleados renunciaron.'}],w:'Reducir personal baja costos de inmediato, pero golpea la moral y la reputación como empleador.'},
 {l:'Contratar asesoría externa de gestión: {$m0.03} al mes',e:{fixed:.03,prod:12},w:'Un asesor externo ordena procesos y responsabilidades. Es un servicio que se paga cada mes, no un empleado más.'},
 {l:'Digitalizar los procesos: {$0.07}',e:{cash:-.07,prod:9,inno:8},w:'Menos trámites manuales, más velocidad.'},
 {l:'Dejar todo como está',e:{prod:-4},w:'La burocracia crece sola si nadie la corta.'}]},
{id:'fondo',a:'Finanzas',lv:4,c:'valor',s:'Un fondo de inversión ofrece {$0.40} a cambio de una parte de la empresa.',o:[
 {l:'Aceptar la inversión',e:{cash:.40,g:.05,own:-.3},flag:'socio',later:[{y:1,e:{fixed:.03},t:'El fondo exigió crecer: subieron tus gastos de expansión.'}],w:'El capital fresco da fuerza para crecer, pero el inversionista exigirá resultados.'},
 {l:'Negociar la mitad',e:{cash:.20,own:-.15},flag:'socio',w:'Menos dinero y menos presión.'},
 {l:'Usar la oferta para conseguir mejor crédito',e:{rate:-.03},w:'Demostrar que hay interesados mejora tu posición frente al banco.'},
 {l:'Rechazar',e:{},w:'Mantienes el control total.'}]},
{id:'sostenible',a:'Innovación',lv:4,c:'reputacion',s:'Clientes y autoridades exigen prácticas más responsables con el medio ambiente.',o:[
 {l:'Programa completo: {$0.05} y {$m0.01} al mes',e:{cash:-.05,fixed:.01,rep:12,inno:5},w:'Adelantarse a la exigencia convierte una obligación en ventaja de marca.'},
 {l:'Cumplir el mínimo legal: {$0.01}',e:{cash:-.01,rep:2},w:'Evitas sanciones sin diferenciarte.'},
 {l:'Ignorarlo',e:{},alt:{p:s=>.75-met(s).risk/200,ok:{t:'Por ahora nadie te fiscalizó.'},no:{e:{cash:-.05,rep:-10},t:'Llegó una multa y la noticia circuló en redes.'}},w:'Ahorrar en cumplimiento es una apuesta contra una multa y contra tu reputación.'}]},
{id:'segundaMarca',a:'Nuevos productos',lv:4,c:'share',s:'Puedes crear una segunda marca para llegar a otro tipo de cliente.',o:[
 {l:'Marca económica: {$0.08}',e:{cash:-.08,cust:.12,price:-.04,rep:-2},w:'Una marca barata gana volumen y participación, pero baja el precio promedio.'},
 {l:'Marca premium: {$0.08}',e:{cash:-.08,price:.08,cust:.15,rep:5},w:'Una marca premium sube el margen con pocos clientes más.'},
 {l:'Mantener una sola marca',e:{},w:'El foco también es una estrategia.'}]},
{id:'dividendos',a:'Flujo de caja',lv:4,c:'liquidez',s:'Hay que decidir qué hacer con las utilidades acumuladas.',o:[
 {l:'Reinvertir en crecimiento: {$0.06}',e:{cash:-.06,g:.08,inno:5},w:'Reinvertir sacrifica efectivo hoy por una empresa más grande mañana.'},
 {l:'Pagar deuda',e:{pay:.20},w:'Cada boliviano de deuda pagado deja de generar intereses.'},
 {l:s=>s.flags.socio?'Repartir utilidades entre tú y tus socios: {$0.08}':'Retirar utilidades para ti: {$0.08}',e:{cash:-.08,sat:0},w:'Repartir utilidades premia a los dueños, pero saca del negocio el dinero que lo protege. Tu parte pasa a tus finanzas personales; no es un gasto del negocio.'},
 {l:'Guardar la caja como reserva',e:{},w:'La liquidez es un seguro contra lo inesperado.'}]},
/* --- Situaciones que aparecen según el estado de la empresa --- */
{id:'faltaPersonal',a:'Contratación',lv:2,c:'capacidad',when:s=>s.emp*s.upe<s.cap*.92,s:'Tienes instalaciones para atender más, pero no la gente: tu equipo es el cuello de botella.',o:[
 {l:'Ampliar el equipo 30%',e:{emp:3,prod:-2},later:[{y:1,e:{prod:4},t:'El personal nuevo ya rinde a pleno.'}],w:'Cada persona nueva tarda en rendir: al inicio baja la productividad del equipo y luego sube.'},
 {l:'Pagar horas extra: {$m0.012} al mes',e:{pers:.012,upe:.12,sat:-2},later:[{y:1,e:{prod:-4},t:'Meses de jornadas largas ya se notan en el cansancio y en el servicio.'}],w:'Las horas extra resuelven hoy y desgastan mañana.'},
 {l:'Automatizar tareas repetitivas: {$0.06}',e:{cash:-.06,upe:.25,inno:6},w:'Automatizar permite que cada persona atienda más, sin subir la planilla.'},
 {l:'Seguir con el equipo actual',e:{},w:'La capacidad que no puedes operar es dinero parado.'}]},
{id:'sinCapacidad',a:'Producción',lv:2,c:'capacidad',when:s=>s.flags.sinCap,s:'El mes pasado la demanda superó tu capacidad y dejaste {c} sin atender.',o:[
 {l:'Ampliar y contratar: {$0.08}',e:{cash:-.08,cap:.30,emp:2},w:'Cuando la demanda ya existe, ampliar capacidad es la inversión más segura.'},
 {l:'Subir precios para moderar la demanda',e:{price:.07},w:'Si no puedes atender a todos, cobrar más a los que sí atiendes mejora el margen.'},
 {l:'Tercerizar el excedente',e:{vc:.05,cap:.25},w:'Atiendes más sin invertir, con menor margen por venta.'},
 {l:'Seguir igual',e:{sat:-5},w:'Seguirás perdiendo ventas y clientes molestos.'}]},
{id:'cajaRoja',a:'Flujo de caja',lv:1,c:'liquidez',when:s=>s.cash<s.S*.03,s:'La caja está casi vacía y hay pagos que vencen pronto.',o:[
 {l:'Préstamo de emergencia de {$0.15}',e:{debt:.15,cash:.15,rate:.03},w:'El crédito urgente siempre es el más caro.'},
 {l:'Vender activos',e:{cash:.10,cap:-.15},w:'Consigues efectivo sacrificando capacidad futura.'},
 {l:'Recortar gastos de inmediato',e:{fixed:-.04,prod:-4,sat:-4},w:'Alivia la caja, con costo en servicio y equipo.'},
 {l:s=>s.flags.socio?'Pedir un aporte a tus socios':'Conseguir un socio que aporte dinero',e:{cash:.12,own:-.1},flag:'socio',w:'Un aporte de capital no cobra intereses, pero quien aporta se queda con una parte del negocio.'}]},
{id:'cajaOciosa',a:'Inversiones',lv:2,c:'liquidez',when:s=>s.cash>s.S*.45,s:'Tienes mucha caja acumulada sin usar.',o:[
 {l:'Invertir en crecer: {$0.15}',e:{cash:-.15,cap:.20,g:.10},w:'El dinero quieto pierde valor; invertido puede multiplicarse.'},
 {l:'Pagar toda la deuda posible',e:{pay:.40},w:'Sin deuda, la empresa resiste casi cualquier crisis.'},
 {l:'Depósito a plazo fijo',e:{},later:[{y:1,e:{cash:.02},t:'Tu depósito a plazo fijo generó intereses.'}],w:'Rendimiento bajo y seguro.'},
 {l:'Mantener la reserva',e:{},w:'Mucha liquidez da tranquilidad, pero no hace crecer la empresa.'}]},
{id:'deudaAlta',a:'Endeudamiento',lv:3,c:'deuda',when:s=>s.debt>s.S*.35,s:'Las cuotas de la deuda se comen buena parte de lo que ganas.',o:[
 {l:'Refinanciar con otro banco',e:{rate:-.03,cash:-.01},w:'Una tasa menor reduce los intereses de todos los meses siguientes.'},
 {l:'Vender activos para pagar',e:{cap:-.15,debt:-.20},w:'Bajas la deuda achicando la empresa.'},
 {l:'Que un socio pague parte de la deuda a cambio de una participación',e:{debt:-.20,own:-.15},flag:'socio',w:'Cambias un acreedor por un socio: baja la deuda y sube el capital, pero ya no eres el único dueño.'},
 {l:'Seguir pagando como hasta ahora',e:{},w:'La deuda baja sola, lentamente, si no ocurre nada malo.'}]},
{id:'crisisServicio',a:'Clientes',lv:2,c:'clientes',when:s=>s.sat<40,s:'Tus {c} están molestos y se nota: cada mes vuelven menos.',o:[
 {l:'Plan de recuperación del servicio: {$0.05}',e:{cash:-.05,sat:15,rep:5},w:'Recuperar la confianza cuesta más que no haberla perdido.'},
 {l:'Disculpa pública y descuentos',e:{price:-.04,sat:8,rep:3},w:'Reconocer el error ayuda; el descuento lo pagas con margen.'},
 {l:'Enfocarte en conseguir clientes nuevos',mk:1,e:{cash:-.04,g:.05},w:'Llenar un balde con huecos: entran clientes y se siguen yendo.'}]},
{id:'rotacion',a:'Recursos humanos',lv:2,c:'productividad',when:s=>s.flags.despidos&&s.prod<55,s:'Después de los despidos el ambiente es tenso y hay renuncias.',o:[
 {l:'Aumento general de sueldos: {$m0.02} al mes',e:{pers:.02,prod:7,sat:3},w:'Subir sueldos frena las renuncias y eleva tus costos fijos.'},
 {l:'Mejorar el clima laboral: {$0.015}',e:{cash:-.015,prod:5},w:'El trato y las condiciones importan tanto como el sueldo.'},
 {l:'Reemplazar a quien se vaya',e:{prod:-4,cash:-.01},w:'Cada reemplazo tarda meses en rendir como el anterior.'}]}
];

/* ===== eventos inesperados ===== */
const EV=[
{id:'crisis',a:'Crisis económica',w:s=>s.month>=4?1.5:.6,s:'La economía del país se frena y la gente gasta menos.',c:'liquidez',
 pre:s=>{const dr=s.debt/s.S,m=months(s);let hit=.06+dr*.12,t='Perdiste '+pct(hit)+' de tus {c}.';if(m>3){hit*=.5;t='Tu buena liquidez amortiguó el golpe: solo perdiste '+pct(hit)+' de tus {c}.'}else if(dr>.3)t+=' Tu deuda alta hizo que te afecte más.';return{e:{cust:-hit},t}},o:[
 {l:'Promociones para sostener las ventas',e:{price:-.05},w:'En crisis el cliente busca precio.'},
 {l:'Recortar costos y esperar',e:{fixed:-.04,prod:-3},w:'Proteger la caja es la prioridad cuando no sabes cuánto durará.'},
 {l:'Invertir mientras los demás se achican: {$0.06}',mk:1,e:{cash:-.06,g:.08},w:'Quien invierte en la crisis sale adelante cuando termina, si la caja aguanta.'}]},
{id:'proveedor',a:'Problemas con un proveedor',w:s=>1,s:'{Prov} suben sus precios de un día para otro.',c:'fijos',
 pre:s=>s.flags.dosProv?{e:{vc:.04},t:'Como tienes más de un proveedor, tu costo solo subió 4%.'}:{e:{vc:.10},t:'Tu costo por unidad subió 10%.'},o:[
 {l:'Cambiar de proveedor',e:{vc:-.05},alt:{p:s=>.45+s.prod/250,ok:{t:'El nuevo proveedor cumple.'},no:{e:{sat:-5},t:'La calidad bajó y los {c} lo notaron.'}},w:'Cambiar ahorra, pero un proveedor nuevo es una incógnita.'},
 {l:'Trasladar el aumento al precio',e:{price:.05},w:'Proteges el margen y arriesgas clientes.'},
 {l:'Firmar un contrato de largo plazo: {$0.03}',e:{cash:-.03,vc:-.03},w:'Un contrato fija el precio y te quita flexibilidad.'}]},
{id:'competidor',a:'Nuevo competidor',w:s=>s.month>=4?1.3:.5,s:'Una cadena grande entra a tu mercado con mucha publicidad.',c:'share',
 pre:s=>s.rep>65?{e:{cust:-.04},t:'Tu buena reputación retuvo a la mayoría: perdiste solo 4% de tus {c}.'}:{e:{cust:-.09},t:'Perdiste 9% de tus {c}.'},o:[
 {l:'Publicidad defensiva: {$0.05}',mk:1,e:{cash:-.05,cust:.05},w:'Recordarle al cliente por qué te elige.'},
 {l:'Bajar precios 6%',e:{price:-.06},w:'Contra un grande, la guerra de precios suele ganarla el grande.'},
 {l:'Especializarte en un nicho',e:{price:.05,rep:5,inno:4},w:'Ser el mejor para pocos puede rendir más que ser uno más para todos.'}]},
{id:'reputacion',a:'Crisis de reputación',w:s=>s.sat<50?2:.8,s:'Una mala experiencia de un cliente se vuelve viral.',c:'reputacion',
 pre:s=>s.sat>65?{e:{rep:-6},t:'Tus {c} satisfechos salieron a defenderte: la reputación bajó poco.'}:{e:{rep:-13},t:'Tu reputación cayó con fuerza.'},o:[
 {l:'Disculpa pública y compensación: {$0.03}',e:{cash:-.03,rep:8,sat:3},w:'Responder rápido y con hechos corta la crisis.'},
 {l:'Campaña de imagen: {$0.05}',e:{cash:-.05,rep:5},w:'La publicidad sin corregir el problema convence a pocos.'},
 {l:'Guardar silencio',e:{},later:[{y:1,e:{cust:-.05},t:'El silencio ante la crisis te costó {c}.'}],w:'En redes, el silencio se lee como culpa.'}]},
{id:'falla',a:'Problemas de producción',w:s=>1,s:'Una falla grave detiene parte de la operación.',c:'capacidad',
 pre:s=>s.flags.seguro?{e:{cap:-.04},t:'El seguro cubrió la mayor parte: tu capacidad bajó solo 4%.'}:{e:{cap:-.12},t:'Tu capacidad bajó 12%.'},o:[
 {l:'Reparación urgente: {$0.04}',e:{cash:-.04,cap:.12},w:'Recuperas la capacidad pagando la urgencia.'},
 {l:'Aprovechar para modernizar: {$0.09}',e:{cash:-.09,cap:.20,prod:5},w:'Una crisis puede ser el momento de renovar.'},
 {l:'Operar con lo que queda',e:{},w:'Sin gasto, con menos capacidad.'}]},
{id:'huelga',a:'Conflicto laboral',w:s=>BIZ[s.biz].duenoTrabaja&&s.emp-1<.05?0:(s.flags.despidos?2.5:.7),s:'El personal paraliza actividades y exige mejores condiciones.',c:'productividad',
 pre:s=>({e:{prod:-8},t:'La productividad cayó 8 puntos.'}),o:[
 {l:'Negociar un aumento: {$m0.02} al mes',e:{pers:.02,prod:8,sat:2},w:'La paz laboral tiene un costo fijo.'},
 {l:'Bono único: {$0.025}',e:{cash:-.025,prod:5},w:'Resuelve el momento sin elevar los costos permanentes.'},
 {l:'Mantenerte firme',e:{},alt:{p:s=>.2+s.sat/160,ok:{e:{prod:2},t:'El conflicto se disolvió.'},no:{e:{prod:-6,rep:-4},t:'El conflicto escaló y salió en la prensa.'}},w:'Puede salir bien o empeorar.'}]},
{id:'impuestos',a:'Suben patentes y tasas',w:s=>1,s:'La alcaldía actualiza las patentes y tasas que pagan los negocios: tus obligaciones fijas suben.',c:'utilidad',
 pre:s=>s.flags.contador?{e:{trib:.006},t:'Tu contador lo anticipó y el aumento de patentes y tasas fue menor.'}:{e:{trib:.015},t:'Tus patentes y tasas municipales subieron.'},o:[
 {l:'Revisar tu categoría y tus pagos con un asesor: {$0.01}',e:{cash:-.01,trib:-.008},w:'Revisar en qué categoría estás y qué pagas, dentro de la ley, suele reducir lo que pagas.'},
 {l:'Trasladarlo al precio',e:{price:.02},w:'El cliente paga el impuesto si acepta el precio.'},
 {l:'Absorberlo',e:{},w:'Tu utilidad lo paga.'}]},
{id:'tecno',a:'Nueva tecnología',w:s=>1,s:'Aparece una tecnología que cambia cómo se trabaja en tu rubro.',c:'productividad',o:[
 {l:'Adoptarla ya: {$0.05}',e:{cash:-.05,inno:12,prod:5},alt:{p:s=>.35+s.inno/120,ok:{e:{cust:.05},t:'Fuiste de los primeros y atrajiste {c}.'},no:{t:'La tecnología todavía no convence al cliente.'}},w:'Llegar primero da ventaja, y también el costo de los errores iniciales.'},
 {l:'Hacer una prueba: {$0.02}',e:{cash:-.02,inno:5},w:'Aprendes sin apostar la empresa.'},
 {l:'Esperar',e:{},later:[{y:1,e:{inno:-5,cust:-.03},t:'Los competidores que adoptaron la nueva tecnología te sacaron ventaja.'}],w:'Esperar es barato hasta que el mercado cambia.'}]},
{id:'boom',good:1,a:'Aumento de demanda',w:s=>s.rep>60?2:.8,s:'Tu rubro se pone de moda y llegan muchos {c} nuevos.',c:'capacidad',
 pre:s=>({e:{cust:.10},t:'Tus {c} aumentaron 10%.'}),o:[
 {l:'Ampliar capacidad rápido: {$0.06}',e:{cash:-.06,cap:.25},w:'Sin capacidad, la demanda extra se la lleva otro.'},
 {l:'Subir precios 6%',e:{price:.06,sat:-3},w:'Cuando sobra demanda, el precio puede subir sin perder clientes.'},
 {l:'No cambiar nada',e:{},w:'Si tu capacidad no alcanza, perderás parte de esta ola.'}]},
{id:'angel',good:1,a:'Oferta de inversión',w:s=>1,s:'Un inversionista quiere entrar como socio en tu negocio.',c:'valor',o:[
 {l:'Aceptar: {$0.15}',e:{cash:.15,own:-.15},flag:'socio',later:[{y:2,e:{cash:-.04},t:'Tu socio cobró su parte de las utilidades.'}],w:'Caja inmediata a cambio de compartir el futuro.'},
 {l:'Pedirle un préstamo en vez de sociedad',e:{debt:.10,cash:.10},w:'Mantienes la propiedad y asumes la obligación de pagar.'},
 {l:'Rechazar',e:{},w:'Sigues solo.'}]},
{id:'remate',good:1,a:'Oportunidad de expansión',w:s=>1,s:'Un negocio vecino cierra y remata sus equipos y su local.',c:'capacidad',o:[
 {l:'Comprar todo: {$0.08}',e:{cash:-.08,cap:.20,g:.04},w:'Comprar barato en el momento justo, si tienes caja.'},
 {l:'Comprar solo los equipos: {$0.03}',e:{cash:-.03,cap:.08},w:'Una mejora pequeña y segura.'},
 {l:'Dejar pasar',e:{},w:'No toda oportunidad es para ti.'}]},
{id:'clienteClave',a:'Pérdida de un cliente importante',w:s=>1,s:'Tu cliente más grande anuncia que se va con la competencia.',c:'clientes',
 pre:s=>s.sat>65?{e:{cust:-.03},t:'Como tus {c} están satisfechos, logró irse solo una parte: perdiste 3%.'}:{e:{cust:-.08},t:'Perdiste 8% de tus {c} de un día para otro.'},o:[
 {l:'Hacerle una contraoferta con descuento: {$0.01}',e:{cash:-.01},alt:{p:s=>.3+s.rep/160,ok:{e:{cust:.06},t:'Aceptó quedarse.'},no:{t:'No aceptó: bajaste el precio sin recuperarlo.'}},w:'Retener con descuento funciona mejor cuando el cliente valora tu marca.'},
 {l:'Salir a buscar clientes nuevos: {$0.04}',mk:1,e:{cash:-.04,g:.06},w:'Depender de pocos clientes es un riesgo; diversificar cuesta, pero protege.'},
 {l:'Ajustar la empresa al nuevo tamaño',e:{fixed:-.03,prod:-2},w:'Achicar costos protege la utilidad, aunque renuncias a recuperar lo perdido.'}]},
{id:'bloqueo',a:'Caída inesperada de ventas',w:s=>1,s:'Bloqueos y paros dificultan que tus {c} lleguen o reciban sus pedidos.',c:'ventas',
 pre:s=>({e:{cust:-.05},t:'Perdiste 5% de tus {c} por semanas sin operar con normalidad.'}),o:[
 {l:'Crear un canal alternativo de venta: {$0.02}',e:{cash:-.02,cust:.03,inno:3},w:'Tener más de un canal protege de cierres.'},
 {l:'Promociones de reactivación',e:{price:-.03},w:'Recuperas clientes pagando con margen.'},
 {l:'Esperar a que pase',e:{},w:'Sin gasto y sin recuperación.'}]}
];



/* ===== estado ===== */
let s = null, ui = { biz: 'comida', metric: 'sales', setup: {}, tab: 'inicio' };
const FPm = typeof FinanzasPersonales !== 'undefined' ? FinanzasPersonales : (typeof require === 'function' ? require('./finanzas-personales.js') : null);
const DINERO_K = (typeof globalThis !== 'undefined' && globalThis.__K) || .2; // dinero de las decisiones (cash, debt, pay) × 0,2: fracciones de ≈ 2,4 meses de ventas (calibrado con la regresión; ver informe)
const FIJO_K = (typeof globalThis !== 'undefined' && globalThis.__FK) || 1;   // gastos fijos recurrentes de las decisiones (fixed) × este factor
const dineroK = st => DINERO_K * (BIZ[st.biz].p.dineroK || 1);

/* ===== textos ===== */
// {$x}: x veces las ventas anuales de referencia (S), escalado por modalidad. {$mx}: lo mismo dividido entre 12 (por mes).
const T = t => { const b = BIZ[s.biz]; return String(t).replace(/\{\$m([\d.]+)\}/g, (_, x) => money(+x * s.S * FIJO_K / 12)).replace(/\{\$([\d.]+)\}/g, (_, x) => money(+x * s.S * dineroK(s)))
  .replace(/\{(\w+)\}/g, (m, k) => { const lo = k.toLowerCase(); if (!(lo in b) || typeof b[lo] !== 'string') return m; const v = b[lo]; return k[0] !== lo[0] ? v[0].toUpperCase() + v.slice(1) : v }) };
// Texto propio de la modalidad si existe. Los textos pueden depender del estado (por ejemplo, si el dueño trabaja solo o hay socios).
const txM = d => (BIZ[s.biz].tx || {})[d.id] || {};
const txV = x => typeof x === 'function' ? x(s) : x;
function txD(d) { const t = txM(d); return txV(t.s || d.s) }
function txO(d, k) { const t = txM(d); return txV(t.o && t.o[k] ? t.o[k] : d.o[k].l) }
// Opción efectiva: efectos (oe) y tipo contable (ot) propios de la modalidad, cuando la opción general no corresponde a ese negocio.
function opcion(d, k) { const t = txM(d), o = d.o[k]; return t.oe && t.oe[k] ? { ...o, e: t.oe[k] } : o }
function tipoOpcion(d, k) { const t = txM(d); return (t.ot && t.ot[k]) || (CONT[d.id] || [])[k] || null }

/* ===== regla de demanda por precio =====
   Supuesto pedagógico documentado (categoría C) con dirección respaldada por la ley de la demanda (categoría B):
   clientes efectivos = clientes al precio de referencia × max(0, 1 − ε·(precio/precio de referencia − 1)), con tope 1,8.
   ε = elasticidad de la modalidad × (1,5 − (satisfacción + reputación)/200): clientes contentos son menos sensibles al precio. */
function elasticidad(st) { return BIZ[st.biz].elast * (1.5 - (st.sat + st.rep) / 200) }
function factorDemanda(st, precio) { const p = precio == null ? st.price : precio; return clamp(1 - elasticidad(st) * (p / st.pref - 1), 0, 1.8) }

/* ===== activos fijos ===== */
const afNeto = st => st.af.reduce((a, x) => a + Math.max(0, x.costo - x.acum), 0);
const depMes = st => st.af.reduce((a, x) => a + Math.min(Math.max(0, x.costo - x.acum), x.costo / x.vida), 0);
const valorInv = st => st.inv ? st.inv.u * st.inv.c : 0;

/* ===== proyección de un mes =====
   Devuelve los flujos del mes en curso con el estado actual (sin modificarlo). noise: variación aleatoria de la demanda. */
function proj(st, noise = 0, compraPlan) {
  const b = BIZ[st.biz], P = b.p, inv = b.inventario;
  const gE = st.g > 0 ? st.g / (1 + 1.5 * st.g) : st.g; // el impulso comercial tiene rendimientos decrecientes
  const ga = .03 + (P.g0 || 0) + (st.rep - 50) * .003 * (P.repK || 1) + (st.sat - 50) * .003 + Math.max(-.02, ((st.inno || 30) - 30) * .001 * (P.innoK || 1)) - ((st.idle || 0) >= 2 ? .025 : 0);
  let gm = Math.pow(1 + ga, 1 / 12) - 1 + .25 * gE + noise; // crecimiento orgánico mensual + un cuarto del impulso comercial pendiente
  const fd = factorDemanda(st);
  if (gm > 0 && st.M) gm *= Math.max(0, 1 - st.cust * fd / st.M * (P.sat || 1.6)); // saturación del mercado
  const custB = Math.max(0, st.cust * (1 + gm)), custEf = custB * fd;
  const demand = custEf * st.freq / 12;
  const staff = st.upe ? st.emp * st.upe : Infinity, capE = Math.min(st.cap, staff) * (.75 + st.prod / 200) / 12;
  const ef = 1 - (st.prod - 50) / 400 - Math.max(0, (st.inno || 0) - 30) / 230 * (P.innoK || 1); // eficiencia operativa
  const vendible = Math.min(demand, capE);
  let units, cmv = 0, merma = 0, compra = 0, compraU = 0, stockFin = 0, cu = 0, faltaInsumos = 0, mermaU = 0, cc = 0, maxCompraU = Infinity, objetivoU = 0;
  if (inv) {
    /* Compras por ciclos dentro del mes (comida: 4 semanales; venta de productos: 2 quincenales).
       En cada ciclo se compra con la caja disponible y lo vendido en ese ciclo financia la compra siguiente. */
    cc = st.vc * inv.share;
    const k = Math.max(1, Math.round(1 / inv.ciclo)), venta = vendible / k;
    objetivoU = Math.max(0, vendible * (1 + inv.seguridad) - st.inv.u);
    const plan = compraPlan != null ? compraPlan : (st.compraManual != null ? st.compraManual : objetivoU);
    let caja = Math.max(0, st.cash) + st.anticipo, stock = st.inv.u, costoStock = st.inv.u * st.inv.c, porComprar = plan;
    units = 0;
    for (let i = 0; i < k; i++) {
      const falta = Math.max(0, venta * (1 + inv.seguridad) - stock), puede = cc > 0 ? caja / cc : Infinity;
      const q = Math.max(0, Math.min(i === k - 1 ? porComprar : Math.min(porComprar, falta), puede));
      porComprar -= q; caja -= q * cc; stock += q; costoStock += q * cc; compraU += q;
      const c = stock > 0 ? costoStock / stock : cc, v = Math.min(venta, stock);
      stock -= v; costoStock -= v * c; units += v; cmv += v * c; caja += v * st.price;
    }
    maxCompraU = compraU + (cc > 0 ? caja / cc : 0);
    faltaInsumos = Math.max(0, vendible - units);
    cu = stock > 0 ? costoStock / stock : cc; // costo promedio ponderado del inventario que queda
    const tm = clamp(inv.merma * (1 - (st.prod - 50) / 200), 0, 1);
    mermaU = stock * tm; merma = mermaU * cu; stockFin = stock - mermaU; compra = compraU * cc;
  } else units = vendible;
  const sales = units * st.price;
  const otrosVar = units * st.vc * (1 - (inv ? inv.share : 0)) * ef; // delivery: todo el costo por pedido; otros: envío, envases, gas
  const innoCosto = P.rdBase ? Math.max(0, (st.inno || 0) - (st.inno0 ?? b.inno)) : (st.inno || 0);
  const rd = sales * innoCosto / 100 * .07; // sostener la innovación cuesta cada mes (comida: solo la que se agrega sobre el nivel inicial)
  // Personal contratado (el dueño que trabaja no cobra sueldo): sueldos + pagos adicionales (bonos, horas extra, aumentos),
  // aportes patronales y provisión de aguinaldo.
  const sueldos = Math.max(0, st.emp - (b.duenoTrabaja ? 1 : 0)) * st.sal / 12 + (st.persO || 0) / 12;
  const cargas = sueldos * CARGAS_T, aguinaldo = sueldos * AGUINALDO, personal = sueldos + cargas + aguinaldo;
  const fijos = st.fixedO / 12, trib = (st.tribO || 0) / 12, dep = depMes(st);
  const anual = sales * 12, lev = st.debt / Math.max(anual, st.S * .5, 1), tasa = st.rate + Math.min(.15, Math.max(0, lev - .3) * .3), int = st.debt * tasa / 12; // recargo por apalancamiento, máximo +15 puntos
  const finIng = st.cash > anual * .1 ? st.cash * .03 / 12 : 0; // rendimiento de la caja en el banco (ingreso financiero)
  const otrosIng = st.mesIng || 0, gastosDec = st.mesGasto || 0, comision = st.mesFin || 0, noDed = st.mesNoDed || 0;
  const ebt = sales - cmv - merma - otrosVar - rd - personal - fijos - trib - dep - int - comision + finIng + otrosIng - gastosDec;
  /* impuestos
     Régimen general: provisión del IUE = 25 % de la utilidad acumulada de la gestión (más las multas, que no se deducen) − lo ya provisionado.
     Régimen simplificado: la cuota bimestral se fija al empezar cada bimestre (meses impares) según el capital; se reconoce la mitad
     cada mes como gasto y se paga al cerrar el primer mes del bimestre siguiente (vence el día 10 del mes siguiente al bimestre). */
  let tax = 0, cuota = 0, cuotaBim = 0, capRTS = 0, pagoRTS = 0;
  if (st.regimen === 'general') { const prov = IUE * Math.max(0, st.ebtAnio + (st.noDedAnio || 0) + ebt + noDed); tax = prov - st.iueProv }
  else { capRTS = capitalRTS(st); cuotaBim = st.month % 2 === 1 ? cuotaRTS(capRTS) : (st.rtsCuotaBim || 0); cuota = cuotaBim / 2; tax = cuota; pagoRTS = st.month % 2 === 1 ? (st.rtsPorPagar || 0) : 0 }
  const profit = ebt - tax;
  const pagoAgui = st.month >= MESES ? (st.aguiPorPagar || 0) + aguinaldo : 0; // el aguinaldo se paga al cerrar el mes 12
  const mc = st.price - st.vc * ((inv ? inv.share : 0) + (1 - (inv ? inv.share : 0)) * ef); // margen de contribución por unidad
  const fijosMes = rd + personal + fijos + trib + dep + int;
  return { gm, custB, cust: custEf, fd, demand, capE, vendible, units, lost: Math.max(0, demand - units), lostCap: Math.max(0, demand - capE), faltaInsumos, staffShort: staff < st.cap * .98,
    sales, cmv, merma, mermaU, compra, compraU, objetivoU, maxCompraU, stockFin, cu, cc, otrosVar, rd, sueldos, cargas, aguinaldo, personal, fijos, trib, dep, int, comision, tasa, finIng, otrosIng, gastosDec, noDed,
    ebt, tax, cuota, cuotaBim, capRTS, pagoRTS, pagoAgui, profit,
    varc: cmv + merma + otrosVar, fix: fijosMes, be: mc > 0 ? fijosMes / mc : Infinity, mc };
}
function months(st) { const p = proj(st); return st.cash / Math.max(1, p.compra + p.otrosVar + p.sueldos + p.cargas + p.fijos + p.trib + p.rd + p.int) }

/* ===== indicadores generales ===== */
function met(st) {
  const p = proj(st), anual = p.sales * 12, share = p.cust / st.M, dr = st.debt / Math.max(anual, 1);
  // Resultado recurrente: sin los gastos e ingresos puntuales de las decisiones del mes (no se repiten cada mes).
  const rec = p.profit + (p.gastosDec - p.otrosIng) * (st.regimen === 'general' && p.ebt > 0 ? 1 - IUE : 1);
  const costoCaja = Math.max(1, (st.biz && BIZ[st.biz].inventario ? p.cc * p.vendible : 0) + p.otrosVar + p.sueldos + p.cargas + p.fijos + p.trib + p.rd + p.int), m = st.cash / costoCaja;
  const risk = clamp(Math.min(60, dr * 75) + (m < 1 ? 25 : m < 2 ? 15 : m < 3 ? 8 : 0) + (rec < 0 ? 15 : 0) + (st.rep < 35 ? 8 : 0) + (st.cash < 0 ? 10 : 0) + (st.inno > 55 && m < 3 ? 8 : 0));
  const idleCash = (st.idle || 0) >= 2 ? Math.max(0, st.cash - costoCaja * 6) * .6 : 0; // la caja ociosa por meses vale menos para un comprador
  const trabajo = valorInv(st) + st.cxc + st.anticipo - st.cxp - st.iueProv - (st.rtsPorPagar || 0) - (st.aguiPorPagar || 0);
  const value = Math.max(0, rec * 12 * 3.5 + anual * .65 + st.cash - idleCash + trabajo - st.debt) * (1 + (st.rep - 50) / 200 + st.inno / 120) * (1 - Math.min(.2, Math.max(0, (st.stag || 0) - 1) * .07)) * (st.own || 1);
  const margin = p.sales ? rec / p.sales : 0;
  const sc = { Finanzas: clamp(50 + (margin - (st.mg0 || 0)) * 200 + clamp(m, 0, (st.idle || 0) >= 2 ? 3 : 6) * 3 - dr * 45 + (st.start ? clamp((value / Math.max(st.start.value, 1) - 1) * 12, -10, 15) : 0)),
    Ventas: clamp(40 + (anual / st.S0 - 1) * 60 + share * 100), 'Gestión': clamp(st.prod * .7 + (p.units / Math.max(p.capE, 1)) * 30), 'Innovación': clamp(st.inno), Riesgo: 100 - risk, 'Satisfacción': (st.sat + st.rep) / 2 };
  const index = Object.values(sc).reduce((a, b) => a + b, 0) / 6;
  return { ...p, recurrente: rec, anual, share, dr, months: m, costoCaja, risk, value, margin, sc, index };
}
function snap(st) { const m = met(st); return { cash: st.cash, debt: st.debt, cust: m.cust, price: st.price, vc: st.vc, fix: m.fix, cap: st.cap, emp: st.emp, rep: st.rep, sat: st.sat, prod: st.prod, inno: st.inno, sales: m.sales, profit: m.profit, units: m.units, risk: m.risk, value: m.value, share: m.share, index: m.index, inv: valorInv(st), custP: m.cust } }

/* ===== balance =====
   Activo = caja + inventario + cuentas por cobrar + anticipos + activo fijo neto.
   Pasivo = deuda bancaria + proveedores por pagar + IUE por pagar + cuota del RTS por pagar + aguinaldo por pagar.
   Patrimonio = capital aportado + resultados acumulados + resultado del mes en curso aún no cerrado − retiros del dueño − distribuciones. */
function balance(st) {
  const retiros = st.pf ? st.pf.recibido : 0;
  const activo = { caja: st.cash, inventario: valorInv(st), cxc: st.cxc, anticipo: st.anticipo, af: afNeto(st) };
  const pasivo = { deuda: st.debt, cxp: st.cxp, impuesto: st.iueProv, rts: st.rtsPorPagar || 0, aguinaldo: st.aguiPorPagar || 0 };
  const patrimonio = { capital: st.capital, resultados: st.resAcum + (st.mesIng || 0) - (st.mesGasto || 0) - (st.mesFin || 0) + (st.mesAjuste || 0), retiros: -retiros, distribuciones: -st.distrib };
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0), A = sum(activo), Pa = sum(pasivo), Pn = sum(patrimonio);
  return { activo, pasivo, patrimonio, A, P: Pa, PN: Pn, dif: A - Pa - Pn };
}

/* ===== efectos de las decisiones ===== */
// Tipo contable deducido de los efectos cuando no hay uno explícito en CONT.
function tipoContable(e) {
  const cash = e.cash || 0, debt = e.debt || 0;
  if (e.own < 0 && (cash > 0 || debt < 0)) return debt < 0 && !cash ? 'conversion' : 'aporte';
  if (debt > 0 && cash >= debt - 1e-9) return 'financiamiento';
  if (debt - cash > 1e-9) return (e.cap > 0 || e.upe > 0) ? 'inversion' : 'gasto';
  if (cash > 0) return e.cap < 0 ? 'ventaActivo' : 'ingreso';
  return null;
}
/* Partidas del resultado que nacen de decisiones (para el detalle contable). cat: gasto, ingreso, multa, incobrable, venta de activo. */
function partida(st, l, v, cat) { if (Math.abs(v) < .005) return; (st.mesItems || (st.mesItems = [])).push({ l: String(l || 'Decisión').slice(0, 90), v, cat, mes: st.month }) }
function aviso(st, t) { (st._avisos || (st._avisos = [])).push(t) }
/* Aplica un efecto al estado y lo registra contablemente. tipo: tipo contable (o null para deducirlo). etiqueta: nombre del activo o gasto. */
function apply(st, e, tipo, etiqueta) {
  if (!e) return;
  const S = st.S, K = dineroK(st), P = BIZ[st.biz].p;
  const t = tipo || tipoContable(e);
  const cashD = (e.cash || 0) * S * K, debtD = (e.debt || 0) * S * K;
  const gasto = (x, cat = 'gasto') => { st.mesGasto += x; if (cat === 'multa') st.mesNoDed = (st.mesNoDed || 0) + x; partida(st, etiqueta, -x, cat) };
  const ingreso = x => { st.mesIng += x; partida(st, etiqueta, x, 'ingreso') };
  // movimientos de dinero según su naturaleza contable
  if (t === 'incobrable') { const x = Math.min(st.cxc, -cashD); st.cxc -= x; gasto(x, 'incobrable') }
  else if (t === 'distribucion') { distribuir(st, -cashD) }
  else if (t === 'socio') { const x = Math.max(0, -cashD); st.cash -= x; st.distrib += x } // utilidades que cobra un socio (no el dueño)
  else {
    st.cash += cashD;
    if (debtD > 0) st.debt += debtD;
    let pagado = 0; if (debtD < 0) { pagado = Math.min(st.debt, -debtD); st.debt -= pagado; if (t === 'conversion') st.capital += pagado; }
    const usado = Math.max(0, debtD - cashD); // dinero gastado o invertido (propio o prestado)
    if (t === 'inversion' || t === 'computacion') { if (usado > 0) st.af.push({ n: etiqueta || 'Inversión', costo: usado, vida: t === 'computacion' ? VIDA.computacion : VIDA.equipos, acum: 0, mes: st.month }) }
    else if (t === 'gasto' || t === 'multa' || t === 'financiamiento' && usado > 0) { if (usado > 0) gasto(usado, t === 'multa' ? 'multa' : 'gasto') }
    else if (t === 'aporte') { if (cashD > 0) st.capital += cashD }
    else if (t === 'anticipo') st.anticipo += -cashD;
    else if (t === 'cxp') st.cxp += cashD;
    else if (t === 'cxc') st.cxc += -cashD;
    else if (t === 'ingreso') { if (cashD > 0) ingreso(cashD); else if (cashD < 0) gasto(-cashD) }
    else if (t === 'ventaActivo') { // se vende una parte de los equipos (proporcional a la capacidad que se pierde)
      const frac = clamp(-(e.cap || 0), 0, 1), libro = st.af.reduce((a, x) => { const v = (x.costo - x.acum) * frac; x.costo -= x.costo * frac; x.acum -= x.acum * frac; return a + v }, 0);
      // Solo se puede vender lo que está registrado: el precio de venta no supera en más de 10 % el valor en libros.
      const pedido = cashD > 0 ? cashD : pagado, cobro = Math.min(pedido, libro * 1.1);
      if (cobro < pedido) { if (cashD > 0) st.cash -= pedido - cobro; else st.debt += pedido - cobro; aviso(st, libro < 1 ? 'No tenías equipos registrados para vender: la operación no generó dinero.' : `Tus equipos valían ${money(libro)} en libros: solo pudiste obtener ${money(cobro)} por ellos.`) }
      const r = cobro - libro; if (r >= 0) { if (r > .005) ingreso(r) } else gasto(-r) }
    else if (t === null && cashD < 0) gasto(-cashD);
  }
  if (e.pay) { const pay = Math.max(0, Math.min(st.debt, e.pay * S * K, st.cash)); st.cash -= pay; st.debt -= pay }
  for (const k in e) {
    let v = e[k]; if (v > 0 && k === 'cap') v *= P.capK || 1; if (v > 0 && k === 'vc') v *= P.vcK || 1;
    if (k === 'fixed') st.fixedO = Math.max(0, st.fixedO + v * S * FIJO_K);
    else if (k === 'pers') st.persO = Math.max(0, (st.persO || 0) + v * S * FIJO_K); // bonos, horas extra y aumentos: gasto de personal
    else if (k === 'trib') st.tribO = Math.max(0, (st.tribO || 0) + v * S * FIJO_K); // patentes y tasas municipales
    else if (k === 'cust' || k === 'price' || k === 'vc' || k === 'cap' || k === 'upe') st[k] = Math.max(0, st[k] * (1 + v));
    else if (k === 'pref') st.pref = Math.max(.01, st.pref * (1 + v));
    else if (k === 'empN') st.emp += v; // personas contratadas (jornadas completas)
    else if (k === 'emp') st.emp = Math.max(1, st.emp * (1 + v * .1)); else if (k === 'empP') { const e0 = st.emp; st.emp = Math.max(1, st.emp * (1 + v)); st.persO = (st.persO || 0) * st.emp / e0 } // emp: cada unidad es 10 % del equipo actual
    else if (k === 'rep' || k === 'sat' || k === 'prod' || k === 'inno') st[k] = clamp(st[k] + v);
    else if (k === 'g') st.g += v; else if (k === 'own') st.own *= 1 + v; else if (k === 'rate') st.rate = clamp(st.rate + v, .06, .35);
  }
}
// Reparto de utilidades: la parte del dueño pasa a su dinero personal (retiro); la de los socios sale de la empresa.
function distribuir(st, monto) {
  monto = Math.floor(Math.max(0, Math.min(monto, Math.max(0, st.cash))) * 100) / 100; if (monto <= 0) return;
  const propio = (st.own || 1) >= .9999 ? monto : r2(monto * st.own), socios = monto - propio; // sin socios, todo es del dueño
  if (propio > 0 && FPm) { const r = FPm.retirar(st, propio, 'Reparto de utilidades'); if (!r.ok) st.distrib += 0 }
  st.cash -= socios; st.distrib += socios;
}

/* Campos agregados en la revisión 5.2 (auditoría contable). migrarEstado los completa en partidas guardadas antes. */
function camposV52(b) { return { rev: '5.2', persO: 0, tribO: b.tribO || 0, aguiPorPagar: 0, rtsPorPagar: 0, rtsCuotaBim: 0, noDedAnio: 0, mesNoDed: 0, mesFin: 0, mesItems: [], ventasAnio: 0 } }
function migrarEstado(o) {
  if (o.rev === '5.2') return o;
  const b = BIZ[o.biz], c = camposV52(b);
  for (const k in c) if (o[k] === undefined) o[k] = c[k];
  if (b.tribO && o.fixedO >= b.tribO) { o.fixedO -= b.tribO } else o.tribO = 0; // el permiso municipal pasa de gastos operativos a tasas (mismo total)
  if (o.regimen === 'rts') o.rtsCuotaBim = cuotaRTS(capitalRTS(o));
  o.ventasAnio = (o.hist || []).slice(1).reduce((a, h) => a + h.sales, 0);
  if (!o.flujo) o.flujo = nuevoFlujo(o, true); // el mes en curso empezó antes de esta revisión: su flujo queda incompleto
  o.rev = '5.2'; o.migrada = '5.1'; return o;
}
/* ===== flujo de caja del mes (para el detalle contable) =====
   Cada movimiento de la caja del negocio se registra en una categoría. Al cerrar el mes:
   caja inicial + suma de movimientos − retiros del dueño = caja final (la diferencia debe ser cero). */
function nuevoFlujo(st, parcial) { return { ini: st.cash, rec0: st.pf ? st.pf.recibido : 0, parcial: !!parcial, decisiones: [], ventas: 0, compras: 0, anticipo: 0, otrosVar: 0, rd: 0, personal: 0, fijos: 0, finIng: 0, int: 0, impuestos: 0, amort: 0, emergencia: 0 } }
function regFlujo(st, l, v) { if (st.flujo && Math.abs(v) > 1e-9) st.flujo.decisiones.push({ l: String(l).slice(0, 90), v }) }
const FLUJO_OP = ['ventas', 'compras', 'anticipo', 'otrosVar', 'rd', 'personal', 'fijos', 'finIng', 'int', 'impuestos', 'amort', 'emergencia'];
function cerrarFlujo(F, st) {
  const retiros = (st.pf ? st.pf.recibido : 0) - F.rec0, dec = F.decisiones.reduce((a, x) => a + x.v, 0), op = FLUJO_OP.reduce((a, k) => a + F[k], 0);
  return { ...F, decisiones: F.decisiones.map(x => ({ ...x })), decTotal: dec, retiros: -retiros, fin: st.cash, dif: st.cash - (F.ini + dec + op - retiros) };
}

/* ===== creación de una partida ===== */
function newGame(biz = ui.biz, setup = ui.setup) {
  const b = BIZ[biz], u = setup || {};
  s = { v: 5, biz, name: u.name || b.def, director: u.dir || 'Tú', month: 1, cash: u.cash ?? b.cash, debt: 0, rate: .12,
    cust: b.cust, freq: b.freq, price: u.price ?? b.price, pref: b.price, vc: b.vc, fixedO: b.fixedO, emp: b.emp, sal: b.sal, cap: b.cap,
    upe: b.cap / b.emp * (b.p.upe || 1.3), fin: 1, own: 1, style: { G: 0, I: 0, R: 0, C: 0 }, ach: {}, rep: 50, sat: 55, prod: 50, inno: b.inno, inno0: b.inno, g: 0, M: b.M,
    flags: {}, later: [], hist: [], log: [], used: {}, queue: [], qi: 0, phase: 'intro', last: null, fired: [], prev: null, over: 0,
    inv: b.inventario ? { u: 0, c: b.vc * b.inventario.share } : null, compraManual: null, anticipo: 0, cxc: 0, cxp: 0,
    af: b.af0.map(x => ({ ...x, acum: 0, mes: 0 })), capital: 0, resAcum: 0, distrib: 0, iueProv: 0, ebtAnio: 0, regimen: b.impuesto, mesIng: 0, mesGasto: 0, mesAjuste: 0 };
  Object.assign(s, camposV52(b));
  if (u.cust) s.cust = u.cust; // clientes al precio de referencia
  s.capital = s.cash + afNeto(s); // patrimonio inicial = caja + equipos aportados
  if (FPm) FPm.asegurar(s);
  s.flujo = nuevoFlujo(s);
  const p0 = proj(s);
  s.S0 = s.S = p0.vendible * s.price * 12; // ventas anuales de referencia (sin límite de inventario)
  s.units0 = p0.vendible; s.custEf0 = p0.cust;
  const m = met(s); s.mg0 = m.margin; s.meses0 = m.months;
  s.start = snap(s);
  s.hist.push({ m: 0, sales: m.sales, profit: m.profit, units: m.units, cust: m.cust, debt: 0, value: m.value, share: m.share, cash: s.cash, index: m.index, inv: 0, cmv: m.cmv, merma: 0 });
  buildMonth();
  return s;
}
/* ===== situaciones del mes ===== */
function buildMonth() {
  const L = trimestre(s.month), b = BIZ[s.biz], excl = b.excluir || [], free = d => !s.used[d.id] && !excl.includes(d.id);
  const n = PLAN[s.month - 1], hayEv = !!MES_EVENTO[s.month], nDec = n - (hayEv ? 1 : 0);
  let q = s.month > 1 ? shuffle(D.filter(d => d.when && free(d) && d.when(s))).slice(0, 1) : [];
  const pool = shuffle(D.filter(d => !d.when && free(d) && d.lv === L)).concat(shuffle(D.filter(d => !d.when && free(d) && d.lv < L)), shuffle(D.filter(d => !d.when && free(d) && d.lv > L)));
  q = q.concat(pool).slice(0, nDec);
  if (hayEv) {
    const rk = met(s).risk, mg0 = met(s).margin, W = e => e.w(s) * (e.id === 'competidor' ? (mg0 > (s.mg0 || 0) + .05 ? 2.2 : 1) * (1 + (s.stag || 0) * .6) : 1) * ((e.id === 'remate' || e.id === 'boom') && (s.stag || 0) >= 2 ? .5 : 1) * (b.p.ev[e.id] || 1) * (e.good ? Math.max(.4, 1.5 - rk / 60) : .6 + rk / 50); // más riesgo: más probables los eventos negativos
    const evs = EV.filter(free).filter(e => W(e) > 0); let tot = evs.reduce((a, e) => a + W(e), 0), r = rnd() * tot, ev = evs[0];
    for (const e of evs) { r -= W(e); if (r <= 0) { ev = e; break } }
    q.splice(Math.min(1, q.length), 0, { ...ev, ev: true });
  }
  q.forEach(d => s.used[d.id] = 1);
  s.queue = q; s.qi = 0; s.pre = null;
}
function openDecision() {
  const d = s.queue[s.qi]; s.pre = null; s.prev = snap(s);
  if (d.pre) { const r = d.pre(s), a = snap(s), c0 = s.cash; apply(s, r.e, null, d.a); regFlujo(s, d.a + ' (impacto inmediato)', s.cash - c0); s.pre = { t: T(r.t), rows: diff(a, snap(s)), idx: a.index } }
  s.phase = 'dec';
}
function eff(o) { // efecto real de una opción según el estado actual de la empresa
  const e = { ...(o.e || {}) }, notes = [];
  const P = BIZ[s.biz].p; let later = null;
  if (e.inno >= 5) {
    const h = Math.round(e.inno / 2), le = { inno: h }; e.inno -= h; // la innovación madura: la mitad llega 3 meses después
    if (e.prod > 0) { le.prod = e.prod; delete e.prod } // y la mejora de productividad también tarda
    if (e.cash < 0) e.cash *= 1 + s.inno / 200; // cada salto de innovación cuesta más que el anterior
    later = { y: 1, e: le, t: 'Tu inversión en innovación de hace unos meses terminó de dar resultados.' };
  }
  if (o.mk) {
    const k = (.5 + s.rep / 100) * (P.mkK || 1); if (e.g > 0) e.g *= k; if (e.cust > 0) e.cust *= k;
    if (s.rep < 40) notes.push('Tu reputación es baja: la publicidad convenció a menos gente de la esperada.'); else if (s.rep >= 65) notes.push('Tu buena reputación multiplicó el efecto de la publicidad.');
  }
  if (e.price) { const f0 = factorDemanda(s), f1 = factorDemanda(s, s.price * (1 + e.price)); if (Math.abs(f1 / f0 - 1) > .001) notes.push(`Regla de demanda: con el precio ${e.price > 0 ? 'más alto' : 'más bajo'}, los ${BIZ[s.biz].c} activos cambian ${f1 > f0 ? '+' : '−'}${pct(Math.abs(f1 / f0 - 1), 1)} (elasticidad ${nf(elasticidad(s), 2)}).`) }
  return { e, notes, later };
}
// riesgo de ejecución de los proyectos de innovación: sube cuanto más innovas, con poca caja y con baja productividad
const execRisk = () => clamp(.20 + s.inno / 220 + (months(s) < 2 ? .18 : 0) - (s.prod - 50) / 200, .05, .6);
const isInno = o => o.e && o.e.inno >= 5 && (o.e.cash < 0 || o.e.debt > 0);
const prob = o => clamp(o.alt.p(s), .05, .95);
function styleOf(o) { const e = o.e || {}; if ((e.inno || 0) >= 5) return 'I'; if (e.debt > 0 || (e.g || 0) >= .05 || (e.cap || 0) >= .2 || (e.cust || 0) >= .08) return 'G'; if (e.vc < 0 || e.fixed < 0 || e.price > 0 || e.pay) return 'R'; return 'C' }
function choose(k) {
  const d = s.queue[s.qi], o = opcion(d, k), before = snap(s); s.prev = before;
  const label = T(txO(d, k)), x = eff(o), notes = x.notes, key = d.id + '.' + k;
  const tipo = tipoOpcion(d, k);
  const p0 = proj(s), ctx = { uso0: p0.demand / Math.max(1, p0.capE) }, caja0 = s.cash, rec0 = s.pf ? s.pf.recibido : 0; // uso de la capacidad antes de decidir
  s._avisos = [];
  let extra = 0;
  if (isInno(o)) { const pf = execRisk(); if (rnd() < pf) { extra = o.e.cash < 0 ? -o.e.cash * .5 : .025; x.e.inno = 0; notes.push('La ejecución se complicó: el proyecto costó más de lo previsto y sus resultados tardarán más (riesgo de ejecución: ' + pct(pf) + ').') } }
  // Caso especial: el dueño se lleva utilidades o se reparten a los socios.
  if (tipo === 'distribucion') { apply(s, { ...x.e, cash: 0 }, null, label); distribuir(s, -(x.e.cash || 0) * s.S * dineroK(s)) }
  else apply(s, x.e, tipo, label);
  if (extra) apply(s, { cash: -extra }, 'gasto', 'Sobrecosto del proyecto');
  if (x.later) s.later.push({ at: s.month + RETRASO_MESES, e: x.later.e, t: x.later.t, from: label });
  if (o.alt) { const pr = prob(o), ok = rnd() < pr, r = ok ? o.alt.ok : o.alt.no; apply(s, r.e, ok ? null : (CONT_ALT[key] || null), label); if (r.t) notes.push(T(r.t) + ' (probabilidad de éxito: ' + pct(pr) + ')') }
  if (o.f) { const r = o.f(s, ctx); if (r) { apply(s, r.e, null, label); if (r.t) notes.push(T(r.t)) } }
  if (o.flag) s.flags[o.flag] = 1;
  notes.push(...s._avisos); s._avisos = [];
  regFlujo(s, label, s.cash - caja0 + ((s.pf ? s.pf.recibido : 0) - rec0)); // la parte que pasa al dueño se cuenta como retiro
  (o.later || []).forEach(y => s.later.push({ at: s.month + RETRASO_MESES * y.y, e: y.e, t: y.t, from: label, tipo: CONT_LATER[key] || null }));
  s.style[styleOf(o)]++;
  const after = snap(s), di = after.index - (s.pre ? s.pre.idx : before.index), rows = diff(before, after);
  s.last = { d, label, notes, rows, why: T(o.w), future: (o.later || []).map(y => RETRASO_MESES * y.y).concat(x.later ? [RETRASO_MESES] : []), di, k, antes: before, despues: after };
  s.log.push({ y: s.month, a: d.a, l: label, di, ev: d.ev, rows, id: d.id, k });
  s.phase = 'res';
}
const ROWS = [['cash', '💰 Caja', 'm', 1], ['debt', '💳 Deuda', 'm', -1], ['cust', '👥 Clientes activos', 'n', 1], ['price', '🏷️ Precio', 'p', 0], ['vc', '📦 Costo por unidad', 'p', -1], ['fix', '🧾 Costos fijos del mes', 'm', -1],
 ['cap', '🏭 Capacidad', 'pc', 1], ['emp', '🧑‍💼 Personal', 'pc', 0], ['rep', '⭐ Reputación', 'pt', 1], ['sat', '😊 Satisfacción', 'pt', 1], ['prod', '⚙️ Productividad', 'pt', 1], ['inno', '💡 Innovación', 'pt', 1],
 ['units', '🧮 Unidades del mes (proyección)', 'n', 1], ['sales', '📈 Ventas del mes (proyección)', 'm', 1], ['profit', '💵 Resultado del mes (proyección)', 'm', 1], ['share', '📊 Participación', 'sh', 1], ['risk', '⚠️ Riesgo', 'pt', -1], ['value', '🏢 Valor de la empresa', 'm', 1]];
function diff(a, b) {
  const out = []; for (const [k, l, t, dir] of ROWS) {
    const d = b[k] - a[k]; if (Math.abs(d) < 1e-6) continue; let txt;
    if (t === 'm') { if (Math.abs(d / rate()) < .5) continue; txt = smoney(d) }
    else if (t === 'n') { if (Math.abs(d) < .5) continue; txt = (d > 0 ? '+' : '−') + nf(Math.abs(d)) + (a[k] ? ' (' + (d > 0 ? '+' : '−') + pct(Math.abs(d / a[k]), 1) + ')' : '') }
    else if (t === 'p' || t === 'pc') { const r = d / a[k]; if (Math.abs(r) < .0005) continue; txt = (r > 0 ? '+' : '−') + pct(Math.abs(r), 1) }
    else if (t === 'sh') { if (Math.abs(d) < .0005) continue; txt = (d > 0 ? '+' : '−') + nf(Math.abs(d) * 100, 1) + ' pts' }
    else { if (Math.abs(d) < .5) continue; txt = (d > 0 ? '+' : '−') + nf(Math.abs(d)) + ' pts' }
    out.push({ l, txt, cls: dir === 0 ? 'neu' : (d * dir > 0 ? 'up' : 'down') });
  } return out;
}

/* ===== crédito de emergencia =====
   Si la caja queda en rojo, el banco cubre el faltante y, en negocios con inventario, un ciclo de compras (capital de trabajo),
   con una comisión del 10 % (gasto financiero). Si la deuda resultante supera el 85 % de las ventas anuales o ya hubo 3 rescates: quiebra. */
function emergencia(st, ventasMes) {
  const b = BIZ[st.biz], need = -st.cash, ct = b.inventario ? st.vc * b.inventario.share * proj(st).vendible * b.inventario.ciclo : 0;
  if (st.debt + need > Math.max(ventasMes * 12, st.S0 * .3) * .85 || st.over >= 3) return { quiebra: true, need, ct: 0, fee: 0 };
  const fee = (need + ct) * .1; st.debt += (need + ct) * 1.1; st.cash = ct; st.fin = 0; st.overM = st.month; st.rep = clamp(st.rep - 4); st.rate = clamp(st.rate + .02, .06, .35); st.over++;
  return { quiebra: false, need, ct, fee };
}
/* ===== cierre del mes ===== */
function closeMonth() {
  const b = BIZ[s.biz], P = b.p, before = met(s), prevH = s.hist[s.hist.length - 1], why = [], u = b.u;
  const F = s.flujo || (s.flujo = nuevoFlujo(s, true));
  const noise = (rnd() - .5) * (P.noise || .06) / Math.sqrt(12) * 2;
  let pre = null, feePre = 0;
  if (s.cash < 0 && b.inventario) { // la caja ya está en rojo antes de comprar insumos: se pide el crédito al empezar el cierre
    const c0 = s.cash; pre = emergencia(s, prevH.sales || s.S / 12);
    if (!pre.quiebra) { feePre = pre.fee; s.mesFin = (s.mesFin || 0) + pre.fee; F.emergencia += s.cash - c0; why.push(`Empezaste el cierre con la caja en rojo: el banco cubrió ${money(pre.need)} y ${money(pre.ct)} para reponer ${b.inventario.unidad} (comisión ${money(pre.fee)}).`) }
  }
  const p = proj(s, noise);
  const cust0 = before.cust;
  // 1. clientes y ventas
  s.cust = p.custB;
  why.push(`Atendiste ${nf(p.units)} ${u} a ${money(s.price, 2)} en promedio: ventas por ${money(p.sales)}.`);
  // 2. inventario: compra, costo de lo vendido y mermas
  if (b.inventario) {
    const usaAnt = Math.min(s.anticipo, p.compra); s.anticipo -= usaAnt;
    s.cash -= p.compra - usaAnt; F.compras -= p.compra - usaAnt;
    s.inv.u = p.stockFin; s.inv.c = p.cu;
    why.push(`Compraste ${nf(p.compraU)} ${b.inventario.unidad} por ${money(p.compra)}${usaAnt > 0 ? ` (${money(usaAnt)} con el anticipo al proveedor)` : ''}; el costo de lo vendido fue ${money(p.cmv)}.`);
    if (p.mermaU > .5) why.push(`Se perdieron ${nf(p.mermaU)} ${b.inventario.unidad} por mermas (${money(p.merma)}). Quedan ${nf(p.stockFin)} en inventario.`);
    if (p.faltaInsumos > p.vendible * .02) { why.push(`No alcanzó la caja para reponer suficientes ${b.inventario.unidad}: dejaste de vender ${nf(p.faltaInsumos)} ${u}.`); s.sat = clamp(s.sat - 3); s.flags.sinInsumos = 1 } else delete s.flags.sinInsumos;
  } else {
    const usaAnt = Math.min(s.anticipo, p.otrosVar); s.anticipo -= usaAnt; s.cash += usaAnt; F.anticipo += usaAnt; // el anticipo cubre parte de los pagos a afiliados
  }
  // 3. capacidad
  if (p.lostCap > p.demand * .03) { why.push(`La demanda superó tu capacidad: no atendiste ${nf(p.lostCap)} ${u} (${money(p.lostCap * s.price)}) y parte de esos ${b.c} no volverá.`); s.cust -= p.lostCap / (s.freq / 12) * .5 / Math.max(.05, p.fd); s.sat = clamp(s.sat - 2); s.rep = clamp(s.rep - .7); s.flags.sinCap = 1 } else delete s.flags.sinCap;
  if (p.staffShort && p.lostCap > p.demand * .03) why.push(!b.duenoTrabaja ? 'Tenías instalaciones de sobra, pero tu personal no alcanzó a atender todo.' : s.emp - 1 < .05 ? 'Trabajas solo y la demanda superó lo que puedes preparar y atender: puedes contratar ayuda por horas o moderar los pedidos.' : 'Entre tú y tu ayuda contratada no alcanzaron a atender toda la demanda.');
  if (p.custB > cust0 * 1.04 && p.custB > 0) { s.sat = clamp(s.sat - 1.5); s.prod = clamp(s.prod - 1); why.push('Creciste más de 4% en un mes: la operación se desordenó un poco.') }
  // 4. dinero del mes: ventas cobradas y pagos de operación (el aguinaldo se provisiona; los impuestos se pagan cuando vencen)
  s.cash += p.sales - p.otrosVar - p.rd - p.sueldos - p.cargas - p.fijos - p.trib - p.int + p.finIng;
  F.ventas += p.sales; F.otrosVar -= p.otrosVar; F.rd -= p.rd; F.personal -= p.sueldos + p.cargas; F.fijos -= p.fijos + p.trib; F.int -= p.int; F.finIng += p.finIng;
  if (p.sueldos > 0) why.push(`Personal contratado: sueldos ${money(p.sueldos)}, aportes patronales ${money(p.cargas)} y provisión de aguinaldo ${money(p.aguinaldo)}.`);
  let pagoRTS = 0, pagoAgui = 0;
  if (p.pagoRTS > 0) { pagoRTS = p.pagoRTS; s.cash -= pagoRTS; s.rtsPorPagar -= pagoRTS; F.impuestos -= pagoRTS; why.push(`Pagaste la cuota del Régimen Tributario Simplificado del bimestre anterior: ${money(pagoRTS)}. Ese pago cancela la deuda tributaria; el gasto ya se había reconocido.`) }
  s.aguiPorPagar = (s.aguiPorPagar || 0) + p.aguinaldo;
  if (s.month >= MESES && s.aguiPorPagar > .005) { pagoAgui = s.aguiPorPagar; s.cash -= pagoAgui; s.aguiPorPagar = 0; F.personal -= pagoAgui; why.push(`Pagaste el aguinaldo del año: ${money(pagoAgui)} (se había provisionado mes a mes).`) }
  for (const x of s.af) x.acum = Math.min(x.costo, x.acum + x.costo / x.vida);
  if (p.finIng > 0) why.push(`Tu caja en el banco rindió ${money(p.finIng)} de intereses (ingreso financiero).`);
  if (p.dep > 0) why.push(`Depreciación del mes: ${money(p.dep)}. Es un gasto que no sale de la caja: reparte el costo de tus equipos en su vida útil.`);
  if (p.gastosDec > 0) why.push(`Gastos por decisiones de este mes: ${money(p.gastosDec)}.`);
  // 5. deuda: amortización mensual del 20 % anual
  let am = s.debt * .2 / 12;
  if (s.debt > 0) { if (s.debt - am < 1) am = s.debt; why.push(`Pagaste ${money(p.int)} de intereses y ${money(am)} de capital de tu deuda.`); s.cash -= am; s.debt -= am; F.amort -= am }
  // 6. crédito de emergencia o quiebra
  let bankrupt = false, fee = 0;
  if (s.cash < 0) {
    const c0 = s.cash, r = emergencia(s, p.sales), need = r.need, ct = r.ct;
    if (r.quiebra) { bankrupt = true; why.push(`Te faltaron ${money(need)} y nadie quiso prestarte más.`) }
    else { fee = r.fee; s.mesFin = (s.mesFin || 0) + fee; F.emergencia += s.cash - c0; why.push(`La caja no alcanzó: cubriste ${money(need)}${ct ? ` y ${money(ct)} para reponer ${BIZ[s.biz].inventario.unidad}` : ''} con un crédito de emergencia caro (comisión de ${money(fee)}). Los bancos ahora te cobran más interés.`) }
  }
  // 7. resultado del mes e impuestos
  const ebt = p.ebt - fee, noDed = s.mesNoDed || 0;
  let tax = 0;
  if (s.regimen === 'general') { s.ebtAnio += ebt; s.noDedAnio = (s.noDedAnio || 0) + noDed; const prov = IUE * Math.max(0, s.ebtAnio + s.noDedAnio); tax = prov - s.iueProv; s.iueProv = prov }
  else { if (s.month % 2 === 1) s.rtsCuotaBim = p.cuotaBim; tax = p.cuota; s.rtsPorPagar = (s.rtsPorPagar || 0) + tax }
  const profit = ebt - tax, items = s.mesItems || [];
  s.resAcum += profit; s.mesIng = 0; s.mesGasto = 0; s.mesFin = 0; s.mesNoDed = 0; s.mesItems = [];
  s.ventasAnio = (s.ventasAnio || 0) + p.sales;
  why.push(profit >= 0 ? `Resultado del mes: ${money(profit)}. De cada ${sym()}100 vendidos quedaron ${sym()}${nf(p.sales ? profit / p.sales * 100 : 0, 1)}.` : `Los costos y gastos superaron a las ventas: el mes cerró con pérdida de ${money(-profit)}.`);
  if (s.regimen === 'general' && Math.abs(tax) > 1) why.push(`IUE del mes (provisión): ${money(tax)}. Es el 25 % de la utilidad acumulada de la gestión${s.noDedAnio > 0 ? ', sumando las multas, que no son deducibles,' : ''} menos lo ya provisionado. Se paga dentro de los 120 días posteriores al cierre de la gestión, así que todavía no sale de la caja.`);
  if (s.regimen === 'rts') {
    const cat = categoriaRTS(p.capRTS);
    if (p.cuotaBim > 0) why.push(`Régimen Tributario Simplificado: capital de ${money(p.capRTS)} (categoría ${cat}), cuota bimestral ${money(p.cuotaBim)}. Gasto del mes: ${money(tax)}; se paga al terminar el bimestre.`);
    else if (s.month % 2 === 1) why.push(`Tu capital (ingredientes y equipos: ${money(p.capRTS)}) no supera Bs 12.000: quedas fuera del Régimen Tributario Simplificado y no pagas cuota en este bimestre.`);
    // Límites del régimen: si se superan, el cambio al régimen general rige desde la gestión siguiente (DS 24484 art. 13).
    const exc = []; if (s.ventasAnio > RTS.ventasMax) exc.push('ventas del año mayores a Bs 184.000'); if (capitalRTS(s) > RTS.capitalMax) exc.push('capital mayor a Bs 60.000'); if (s.price > RTS.precioMaxVivandero) exc.push('precio por plato mayor a Bs 148');
    if (exc.length && !s.rtsExcede) { s.rtsExcede = { mes: s.month, motivos: exc }; why.push(`Superaste un límite del Régimen Tributario Simplificado (${exc.join(', ')}). Según el DS 24484 (art. 13), desde la gestión siguiente debes tributar en el régimen general (IVA, IT e IUE). En esta partida sigues pagando la cuota hasta el mes 12.`) }
  }
  if (!(profit > 0 && s.debt <= p.sales * 12 * .3 && months(s) >= 1.5)) { if (s.month >= 3) s.fin = 0 }
  // 8. lo que cambia con el tiempo (tasas anuales convertidas a mensuales)
  if (s.inno > 30) { s.prod = clamp(s.prod + (s.inno - 30) / 144); if (s.inno >= 50) { s.rep = clamp(s.rep + .12); s.sat = clamp(s.sat + .08) } }
  if (s.month % 3 === 0) { // revisión trimestral: estancamiento y caja ociosa
    const sum = a => a.reduce((x, h) => x + h.sales, 0), qa = sum(s.hist.slice(-2)) + p.sales, q1 = s.month === 3 ? s.hist[0].sales * 3 : sum(s.hist.slice(-5, -2));
    if (qa < q1 * 1.0075) { s.stag = (s.stag || 0) + 1; if (s.stag >= 2) { s.rep = clamp(s.rep - 2); why.push(`Llevas ${s.stag} trimestres casi sin crecer: pierdes relevancia frente a tus competidores.`) } } else s.stag = Math.max(0, (s.stag || 0) - 1);
    if (months(s) > 6) { s.idle = (s.idle || 0) + 1; if (s.idle >= 2) why.push('Tienes caja para más de seis meses sin usar: te protege, pero no hace crecer el negocio.') } else s.idle = 0;
  }
  s.M *= Math.pow(1.03, 1 / 12); s.sal *= Math.pow(1.025, 1 / 12); s.fixedO *= Math.pow(1.02, 1 / 12);
  s.g *= .75; s.rep = clamp(s.rep + (s.sat - s.rep) * (1 - Math.pow(.85, 1 / 12))); s.inno = clamp(s.inno - 2 / 12); s.cust = Math.min(s.cust, s.M * .6 / Math.max(.05, p.fd));
  const ult = s.hist.slice(-2).map(h => h.sales).concat([p.sales]); s.S = Math.max(ult.reduce((a, b) => a + b, 0) / ult.length * 12, s.S0 * .4);
  const m = met(s), bal = balance(s), fl = cerrarFlujo(F, s);
  const h = { m: s.month, sales: p.sales, profit, units: p.units, cust: p.cust, debt: s.debt, value: m.value, share: p.cust / s.M, cash: s.cash, index: m.index,
    cmv: p.cmv, merma: p.merma, compra: p.compra, inv: valorInv(s), invU: s.inv ? s.inv.u : 0, otrosVar: p.otrosVar,
    fijos: p.fijos + p.trib + p.personal + p.rd, // total de gastos fijos del mes (compatibilidad con la V5.1); el detalle va en los campos siguientes
    fijosOp: p.fijos, trib: p.trib, rd: p.rd, sueldos: p.sueldos, cargas: p.cargas, aguinaldo: p.aguinaldo, personal: p.personal, emp: s.emp,
    dep: p.dep, int: p.int, comision: feePre + fee, finIng: p.finIng, otrosIng: p.otrosIng, gastosDec: p.gastosDec, noDed, items, tax, ebt, regimen: s.regimen,
    iueProv: s.iueProv, ebtAnio: s.ebtAnio, noDedAnio: s.noDedAnio || 0,
    rts: s.regimen === 'rts' ? { capital: p.capRTS, cat: categoriaRTS(p.capRTS), cuotaBim: p.cuotaBim, gasto: tax, pagado: pagoRTS, porPagar: s.rtsPorPagar } : null,
    pagoRTS, pagoAgui, aguiPorPagar: s.aguiPorPagar, amort: am, price: s.price, demand: p.demand, capE: p.capE, ventasAnio: s.ventasAnio,
    bal: { activo: bal.activo, pasivo: bal.pasivo, patrimonio: bal.patrimonio, A: bal.A, P: bal.P, PN: bal.PN }, flujo: fl, retirosAcum: s.pf ? s.pf.recibido : 0 };
  s.hist.push(h); s.bankrupt = bankrupt; s.phase = 'month'; s.prev = null; s.flujo = nuevoFlujo(s);
  s.report = { h, prevH, why, bankrupt, p };
  s.log.push({ y: s.month, yr: true, l: `Cierre del mes ${s.month}: resultado ${money(profit)}`, di: h.index - prevH.index });
  return s.report;
}
function nextMonth() {
  if (s.bankrupt || s.month >= MESES) { s.phase = 'end'; return }
  s.month++; const due = s.later.filter(x => x.at <= s.month); s.later = s.later.filter(x => x.at > s.month);
  const a = snap(s); s._avisos = []; s.fired = due.map(x => { const c0 = s.cash; apply(s, x.e, x.tipo || null, x.from); regFlujo(s, x.from + ' (efecto posterior)', s.cash - c0); return T(x.t) }); s.fired.push(...s._avisos); s._avisos = []; s.firedRows = diff(a, snap(s));
  buildMonth(); s.phase = 'intro';
}
function avanzar() { if (s.qi < s.queue.length - 1) { s.qi++; openDecision() } else closeMonth() }

/* ===== resultado final =====
   Umbrales calibrados para 12 meses con la simulación de miles de partidas (ver informe). r: ventas anualizadas finales / iniciales. */
function ending() {
  // Se evalúa el último trimestre (3 meses), no un solo mes: los gastos puntuales de una decisión no deciden el final.
  const H = s.hist.slice(1), uq = H.slice(-3), q = k => uq.reduce((a, h) => a + h[k], 0) / Math.max(1, uq.length);
  const h = s.hist[s.hist.length - 1], m = met(s), ventasQ = q('sales'), resQ = q('profit'), r = ventasQ * 12 / s.S0, mg = ventasQ ? resQ / ventasQ : 0, dr = s.debt / Math.max(ventasQ * 12, 1), b = BIZ[s.biz];
  const mg0 = s.mg0 || 0, anual = H.reduce((a, x) => a + x.profit, 0);
  if (s.bankrupt) return ['📉', 'Quiebra', 'Las decisiones tomadas llevaron a una situación financiera insostenible: la caja se agotó y nadie quiso prestar más.', 'Caja negativa y deuda mayor al 85% de las ventas anuales.'];
  if (m.risk >= 60 || (resQ < 0 && m.months < Math.min(1.5, (s.meses0 || 1.5) * .75))) return ['⚠️', 'Empresa en riesgo', 'La empresa sigue operando, pero enfrenta problemas de liquidez o de endeudamiento. Unos meses malos más podrían ser los últimos.', `Nivel de riesgo ${nf(m.risk)}/100; resultado promedio del último trimestre ${money(resQ)} al mes.`];
  if (r >= 1.4 && dr >= .2) return ['🏗️', 'Empresa grande con mucha deuda', 'Creciste rápido usando dinero prestado. El tamaño impresiona, pero buena parte de lo que ganas se va al banco.', `Ventas ${nf(r, 2)} veces las iniciales y deuda de ${pct(dr)} de las ventas anuales.`];
  if (h.share >= .25) return ['🏆', 'Empresa líder del mercado', 'Lograste convertir la empresa en líder: ninguna otra tiene tantos clientes del mercado como la tuya.', `Participación de mercado de ${pct(h.share)}.`];
  if (s.flags.export && r >= 1.25) return ['🚀', b.duenoTrabaja ? 'Marca conocida fuera de la zona' : 'Empresa en expansión internacional', b.duenoTrabaja ? 'Tu carrito ya es conocido más allá de la universidad.' : 'La empresa cruzó la frontera y vende en nuevos mercados.', `Operación fuera de tu mercado inicial y ventas ${nf(r, 2)} veces las iniciales.`];
  if (s.inno >= 60) return ['💡', 'Empresa innovadora', 'Tu empresa es referente por hacer las cosas de otra manera. Otros la miran para copiarla.', `Innovación ${nf(s.inno)}/100.`];
  if (mg >= mg0 + .02 && anual > 0 && r < 1.5) return ['💰', 'Empresa pequeña pero muy rentable', 'Mantuviste un crecimiento moderado y mejoraste lo que queda de cada venta.', `Margen del último trimestre ${pct(mg, 1)} (al inicio: ${pct(mg0, 1)}).`];
  if (r >= 1.2) return ['📈', 'Empresa en crecimiento', 'La empresa creció de forma sostenida y está lista para dar un salto mayor.', `Ventas ${nf(r, 2)} veces las iniciales.`];
  return ['🏪', 'Empresa estable', 'La empresa terminó el año sin grandes sobresaltos ni grandes saltos. Sigue siendo parecida a como empezó.', `Ventas ${nf(r, 2)} veces las iniciales; resultado del año ${money(anual)}.`];
}

/* ===== indicadores propios de cada modalidad =====
   Solo se muestran variables que el motor calcula. Cada indicador dice de dónde sale. período: 'mes' (proyección del mes en curso) o un registro del historial. */
function indicadores(st, h) {
  const b = BIZ[st.biz], p = h ? null : proj(st), x = h || p, pf = st.pf || { saldo: 0, ahorro: 0 };
  const units = x.units, sales = x.sales, precioProm = units > 0 ? sales / units : st.price, costoOp = (h ? h.otrosVar + h.fijos + h.dep : p.otrosVar + p.rd + p.personal + p.fijos + p.trib + p.dep);
  const res = h ? h.profit : p.profit, I = [];
  const add = (k, l, v, t, f) => I.push({ k, l, v, t, f });
  if (st.biz === 'comida') {
    const cc = st.vc * b.inventario.share, semana = cc * Math.max(st.units0 || 1, (h ? h.demand : p.demand)) / 4.33; // una semana de compras normales (no se dispara si la demanda cae a cero)
    add('units', 'Platos vendidos (comensales atendidos)', units, 'n', 'mín(demanda, capacidad, porciones disponibles); se supone 1 plato por visita');
    add('price', 'Precio promedio por plato', precioProm, 'm2', 'ventas ÷ platos vendidos');
    add('sales', 'Ventas del período', sales, 'm', 'platos vendidos × precio');
    add('cmv', 'Costo de ingredientes', x.cmv, 'm', 'platos vendidos × costo promedio ponderado de los ingredientes');
    add('merma', 'Ingredientes desperdiciados (mermas)', x.merma, 'm', 'porciones sobrantes × tasa de merma × costo promedio');
    add('op', 'Otros gastos operativos', costoOp, 'm', 'envases + gastos operativos y tasas + personal contratado (con cargas sociales) + depreciación');
    add('res', 'Resultado del negocio', res, 'm', 'ventas − todos los costos y gastos − impuesto');
    add('cash', 'Caja disponible del negocio', st.cash, 'm', 'saldo de caja después de los movimientos registrados');
    add('pf', 'Finanzas personales del dueño', pf.saldo + pf.ahorro, 'm', 'saldo personal + ahorro (retiros − gastos personales)');
    add('repo', 'Capacidad de reposición de insumos', st.cash / Math.max(1, semana), 'sem', 'caja ÷ costo de una semana de ingredientes (al menos la del inicio)');
    add('stock', 'Inventario de ingredientes', valorInv(st), 'm', `${nf(st.inv.u)} ${b.inventario.unidad} × costo promedio`);
  } else if (st.biz === 'delivery') {
    add('units', 'Pedidos y viajes atendidos', units, 'n', 'mín(demanda, capacidad de la red)');
    add('price', 'Comisión promedio por pedido', precioProm, 'm2', 'ingresos de la plataforma ÷ pedidos');
    add('sales', 'Ingresos por comisiones', sales, 'm', 'pedidos × comisión');
    add('var', 'Costos operativos por pedidos', h ? h.otrosVar : p.otrosVar, 'm', 'pedidos × costo operativo por pedido (incentivos, pasarela, soporte)');
    add('fix', 'Gastos fijos y de personal', h ? h.fijos + h.dep : p.rd + p.personal + p.fijos + p.trib + p.dep, 'm', 'oficina, servidores, personal (con cargas sociales y aguinaldo), innovación y depreciación');
    add('capu', 'Uso de la capacidad de la red', units / Math.max(1, x.capE || (p && p.capE) || 1), '%', 'pedidos atendidos ÷ capacidad de la red');
    add('lost', 'Pedidos no atendidos', Math.max(0, (x.demand || 0) - units), 'n', 'demanda − pedidos atendidos');
    add('res', 'Resultado', res, 'm', 'ingresos − costos − impuesto (provisión de IUE)');
    add('cash', 'Caja', st.cash, 'm', 'saldo de caja');
  } else {
    const cc = st.vc * b.inventario.share;
    add('units', 'Unidades vendidas', units, 'n', 'mín(demanda, capacidad, inventario disponible)');
    add('price', 'Precio promedio de venta', precioProm, 'm2', 'ingresos ÷ unidades');
    add('cmv', 'Costo de compra de lo vendido', x.cmv, 'm', 'unidades × costo promedio ponderado');
    add('sales', 'Ingresos', sales, 'm', 'unidades × precio');
    add('stock', 'Inventario disponible', valorInv(st), 'm', `${nf(st.inv.u)} ${b.inventario.unidad} × costo promedio`);
    add('res', 'Resultado', res, 'm', 'ingresos − costos − impuesto (provisión de IUE)');
    add('repo', 'Efectivo disponible para reposición', st.cash / Math.max(1, cc * Math.max(st.units0 || 1, (h ? h.demand : p.demand))), 'mes', 'caja ÷ costo de compra de un mes de ventas (al menos las del inicio)');
    add('cash', 'Caja', st.cash, 'm', 'saldo de caja');
  }
  return I;
}
// Indicadores que el usuario pidió y el motor todavía no puede calcular (se muestran como pendientes, no como datos).
const PENDIENTES = { delivery: ['Conductores y repartidores activos: el motor modela la capacidad de la red en pedidos, no personas. Falta una variable de afiliados y una regla de pedidos por afiliado.'], ecommerce: [], comida: [] };


/* ===== datos para las ilustraciones (solo lectura) =====
   Todo sale del motor: la escena no inventa clientes ni equipos. */
function datosVisuales(st) {
  const m = met(st), b = BIZ[st.biz], cerrado = st.phase === 'month' || st.phase === 'end', h = st.hist[st.hist.length - 1], H = st.hist.slice(1);
  const units = cerrado && h.m > 0 ? h.units : m.units, ventas = cerrado && h.m > 0 ? h.sales : m.sales;
  return {
    ventasRatio: ventas * 12 / st.S0, capRatio: st.cap / b.cap, reputacion: st.rep, riesgo: m.risk, mesesCaja: m.months,
    utilidad: cerrado && h.m > 0 ? h.profit : m.profit, utilidadAcum: H.reduce((a, x) => a + x.profit, 0), mesesCerrados: H.length, caja: st.cash, quiebra: !!st.bankrupt,
    actividad: units / Math.max(1, st.units0),
    tendencia: (() => { const ref = cerrado && h.m > 0 ? st.hist[st.hist.length - 2] : h; return units / Math.max(1, ref ? ref.units : st.units0) })(), // unidades frente al mes anterior
    cobertura: b.inventario ? (st.inv.u + (cerrado ? 0 : m.compraU)) / Math.max(1, m.vendible) + (cerrado ? 1 : 0) * Math.min(1, m.maxCompraU / Math.max(1, m.vendible)) : 1,
    personal: b.duenoTrabaja ? st.emp - 1 : st.emp, inversiones: st.af.filter(x => x.mes > 0).length,
    tecnologia: st.inno >= 35 || !!st.flags.sistema, promo: st.g >= .03, internacional: !!st.flags.export, sucursal: !!(st.flags.sucursal || st.flags.franquicia)
  };
}

/* ===== detalle contable =====
   Explica los números del motor; no calcula resultados alternativos. Para un mes cerrado usa el registro del historial
   (lo que se guardó al cerrar); para el mes en curso usa la misma proyección que el resto de la interfaz (proj). */
const ETQ_VAR = { comida: 'Envases y servilletas', ecommerce: 'Envío y comisión de pago', delivery: 'Costo operativo por pedido (incentivos a afiliados, pasarela de pago y soporte)' };
const ETQ_FIJOS = { comida: 'Gas, transporte de insumos, agua, limpieza, mantenimiento y teléfono', ecommerce: 'Gastos operativos (plataforma, depósito, servicios)', delivery: 'Gastos operativos (oficina, servidores, licencias y servicios)' };
function mesDetalle(st, m) {
  const H = st.hist.slice(1);
  if (m != null && m !== 'actual') { const h = H.find(x => x.m === +m); if (h) return { h, cerrado: true, antiguo: h.personal === undefined } }
  const p = proj(st);
  return { cerrado: false, antiguo: false, h: { m: st.month, sales: p.sales, units: p.units, cmv: p.cmv, merma: p.merma, otrosVar: p.otrosVar, fijosOp: p.fijos, trib: p.trib, rd: p.rd, sueldos: p.sueldos, cargas: p.cargas, aguinaldo: p.aguinaldo, personal: p.personal,
    dep: p.dep, int: p.int, comision: p.comision, finIng: p.finIng, otrosIng: p.otrosIng, gastosDec: p.gastosDec, items: [...(st.mesItems || [])], noDed: p.noDed, ebt: p.ebt, tax: p.tax, profit: p.profit, emp: st.emp,
    rts: st.regimen === 'rts' ? { capital: p.capRTS, cat: categoriaRTS(p.capRTS), cuotaBim: p.cuotaBim, gasto: p.tax, pagado: p.pagoRTS, porPagar: (st.rtsPorPagar || 0) - p.pagoRTS + p.tax } : null,
    regimen: st.regimen, iueProv: st.iueProv + (st.regimen === 'general' ? p.tax : 0), ebtAnio: st.ebtAnio + p.ebt, noDedAnio: (st.noDedAnio || 0) + p.noDed, pagoRTS: p.pagoRTS, aguiPorPagar: (st.aguiPorPagar || 0) + p.aguinaldo, flujo: st.flujo ? cerrarFlujo(st.flujo, st) : null } };
}
function detalleContable(st, m) {
  const b = BIZ[st.biz], inv = !!b.inventario, { h, cerrado, antiguo } = mesDetalle(st, m), H = st.hist.slice(1);
  const L = (l, v, nota) => ({ l, v: v || 0, nota });
  const ingresos = [L(`${capM(b.u)} vendidos`, h.units, 'unidades'), L(`Precio efectivo por ${b.uS}`, h.units > 0 ? h.sales / h.units : st.price, 'precio'), L(st.biz === 'delivery' ? 'Ingresos por comisiones' : 'Total de ventas', h.sales)];
  if (h.otrosIng) ingresos.push(L('Ingresos por decisiones', h.otrosIng)); if (h.finIng) ingresos.push(L('Intereses ganados por la caja (ingreso financiero)', h.finIng));
  const costos = [];
  if (inv) costos.push(L(st.biz === 'comida' ? 'Ingredientes consumidos (costo de lo vendido)' : 'Costo de compra de lo vendido', h.cmv, 'costo promedio ponderado'), L(st.biz === 'comida' ? 'Mermas de ingredientes' : 'Mermas de productos', h.merma));
  costos.push(L(ETQ_VAR[st.biz], h.otrosVar, 'costo variable'));
  if (antiguo) costos.push(L('Gastos fijos, personal e innovación (mes cerrado antes de la revisión 5.2: sin desglose)', h.fijos));
  else {
    costos.push(L(ETQ_FIJOS[st.biz], h.fijosOp), L('Patentes y tasas municipales', h.trib), L('Innovación (costo de mantener la innovación agregada)', h.rd));
    costos.push(L(b.duenoTrabaja ? 'Sueldos del personal contratado (el dueño no cobra sueldo)' : 'Sueldos', h.sueldos), L('Aportes patronales (17,21 %)', h.cargas), L('Aguinaldo (provisión de 1/12)', h.aguinaldo));
  }
  costos.push(L('Depreciación de equipos (no sale de la caja)', h.dep), L('Intereses de la deuda', h.int));
  if (h.comision) costos.push(L('Comisión del crédito de emergencia', h.comision));
  costos.push(L('Gastos por decisiones', h.gastosDec));
  // cascada del resultado
  const costoVentas = inv ? h.cmv + h.merma : 0, margen = h.sales - costoVentas - h.otrosVar;
  const gOp = antiguo ? h.fijos : h.fijosOp + h.trib + h.rd, gPer = antiguo ? 0 : h.personal, dec = (h.otrosIng || 0) - (h.gastosDec || 0);
  const resOp = margen - gOp - gPer - h.dep + dec, fin = (h.finIng || 0) - h.int - (antiguo ? 0 : h.comision || 0), ebt = resOp + fin;
  const c = [L('Ventas', h.sales)];
  if (inv) c.push(L('− Costo de ventas (lo vendido + mermas)', -costoVentas));
  c.push(L('− ' + (inv ? 'Otros costos variables' : 'Costos variables por pedido'), -h.otrosVar), L('= Margen de contribución', margen, 'sub'));
  c.push(L(antiguo ? '− Gastos fijos, personal e innovación' : '− Gastos operativos, tasas e innovación', -gOp)); if (!antiguo) c.push(L('− Gastos de personal (sueldos, aportes y aguinaldo)', -gPer));
  c.push(L('− Depreciación', -h.dep), L('± Ingresos y gastos por decisiones', dec), L('= Resultado operativo', resOp, 'sub'), L('± Resultado financiero (intereses ganados − intereses y comisiones pagados)', fin), L('= Resultado antes de impuestos', ebt, 'sub'));
  c.push(L((h.regimen || st.regimen) === 'rts' ? '− Cuota del RTS reconocida como gasto' : '− IUE reconocido (provisión del mes)', -h.tax), L('= Resultado neto del período', ebt - h.tax, 'tot'));
  const cuadra = Math.abs(ebt - h.ebt) < .01 && Math.abs(ebt - h.tax - h.profit) < .01;
  // situación financiera
  const bal = cerrado && h.bal ? h.bal : balance(st), A = bal.activo, P = bal.pasivo, N = bal.patrimonio;
  const situacion = { activo: [L('Efectivo del negocio (caja)', A.caja), L('Inventario', A.inventario), L('Cuentas por cobrar', A.cxc), L('Anticipos a proveedores', A.anticipo), L('Activos fijos netos (equipos − depreciación acumulada)', A.af)],
    pasivo: [L('Deuda bancaria', P.deuda), L('Cuentas por pagar a proveedores', P.cxp), L('IUE por pagar (provisión)', P.impuesto), L('Cuota del RTS por pagar', P.rts || 0), L('Aguinaldo por pagar', P.aguinaldo || 0)],
    patrimonio: [L('Capital aportado', N.capital), L('Resultados acumulados', N.resultados), L('Retiros del dueño', N.retiros), L('Utilidades pagadas a socios', N.distribuciones)],
    A: bal.A, P: bal.P, PN: bal.PN, dif: bal.A - bal.P - bal.PN, fecha: cerrado ? 'al cierre del mes ' + h.m : 'en este momento' };
  // impuestos
  const imp = [], reg = h.regimen || st.regimen;
  if (reg === 'rts' && !h.rts) imp.push({ n: 'Cuota del Régimen Tributario Simplificado', reg: 'Régimen Tributario Simplificado', base: '—', regla: 'Cuota bimestral según el capital', calc: h.tax, pag: null, pend: null, per: 'Mes ' + h.m, est: 'Registrado sin desglose', nota: 'Mes cerrado antes de la revisión 5.2: en esa versión la cuota se registraba completa en los meses pares, sin provisión.' });
  else if (reg === 'rts') {
    const r = h.rts, excl = r.capital <= RTS.excluidoHasta, b1 = h.m % 2 === 1 ? h.m : h.m - 1;
    imp.push({ n: 'Cuota del Régimen Tributario Simplificado', reg: 'Régimen Tributario Simplificado (DS 24484, DS 27924, DS 3698)', base: `Capital: ingredientes en inventario + equipos netos = ${money(r.capital)} (el efectivo no se cuenta)`,
      regla: excl ? 'Capital de hasta Bs 12.000: excluido del régimen, sin cuota' : `Categoría ${r.cat}: cuota de ${money(r.cuotaBim)} por bimestre (la mitad se reconoce cada mes)`,
      calc: r.gasto, pag: r.pagado, pend: r.porPagar, per: `Bimestre de los meses ${b1} y ${b1 + 1}`, est: 'Modelado y verificado con la norma (tabla y límites)', nota: 'La cuota reemplaza al IVA, el IT y el IUE (DS 24484 art. 1). Se paga al cerrar el primer mes del bimestre siguiente. El simulador recalcula la categoría al empezar cada bimestre: es una simplificación.' });
    imp.push({ n: 'IVA, IT e IUE', reg: 'Incluidos en la cuota del RTS', base: '—', regla: 'No se pagan por separado mientras el negocio esté en el RTS', calc: 0, pag: 0, pend: 0, per: '—', est: 'No corresponde', nota: `Límites del régimen: ventas acumuladas ${money(h.ventasAnio ?? st.ventasAnio ?? 0)} de Bs 184.000; capital hasta Bs 60.000; precio por plato hasta Bs 148.${st.rtsExcede ? ' Superaste un límite: desde la gestión siguiente tributarías en el régimen general.' : ''}` });
  } else {
    imp.push({ n: 'Impuesto sobre las Utilidades de las Empresas (IUE)', reg: 'Régimen general (Ley 843)', base: `Utilidad acumulada de la gestión: ${money(h.ebtAnio || 0)}${h.noDedAnio > 0 ? ` + multas no deducibles ${money(h.noDedAnio)}` : ''}`,
      regla: '25 % de la utilidad neta; si hay pérdida acumulada, la provisión es cero', calc: h.tax, pag: 0, pend: h.iueProv || 0, per: `Gestión en curso (meses 1 a ${h.m})`, est: 'Modelado como provisión mensual',
      nota: 'Se paga dentro de los 120 días posteriores al cierre de la gestión (31 de diciembre para comercio y servicios), así que en esta partida no sale de la caja. La utilidad contable se usa como utilidad imponible: no se modelan otros ajustes tributarios ni la compensación de pérdidas de años anteriores.' });
    imp.push({ n: 'Impuesto a las Transacciones (IT)', reg: 'Régimen general (Ley 843)', base: `Ingresos brutos del mes: ${money(h.sales)}`, regla: '3 % de los ingresos', calc: 0, pag: 0, pend: 0, per: 'Mensual', est: 'No modelado',
      nota: `Referencia: el IT de este mes sería ${money(h.sales * .03)} y no está incluido en el resultado. El IUE pagado puede compensarse como pago a cuenta del IT de la gestión siguiente.` });
    imp.push({ n: 'Impuesto al Valor Agregado (IVA)', reg: 'Régimen general (Ley 843)', base: 'Ventas y compras', regla: '13 % (débito fiscal en ventas − crédito fiscal en compras)', calc: 0, pag: 0, pend: 0, per: 'Mensual', est: 'No modelado',
      nota: 'Los precios y costos del simulador se tratan como importes netos, sin IVA (la Ley 1733 de 2026 define el precio neto como el valor antes de impuestos). No se registran el IVA cobrado, el crédito fiscal ni su desfase de caja.' });
  }
  if (!antiguo) imp.push({ n: 'Patentes y tasas municipales', reg: 'Gobierno municipal', base: 'Supuesto del simulador', regla: 'Importe fijo mensual', calc: h.trib, pag: h.trib, pend: 0, per: 'Mensual', est: 'Modelado como gasto operativo', nota: 'Se paga el mismo mes.' });
  // flujo de caja
  const F = h.flujo, flujo = F ? { ini: F.ini, parcial: F.parcial || !cerrado, filas: [L('Cobro de ventas', F.ventas), L('Compras de inventario pagadas', F.compras), L('Anticipo aplicado', F.anticipo), L('Costos variables pagados', F.otrosVar),
    L('Personal (sueldos, aportes y aguinaldo pagado)', F.personal), L('Gastos operativos y tasas', F.fijos), L('Innovación', F.rd), L('Intereses pagados', F.int), L('Intereses cobrados', F.finIng), L('Impuestos pagados', F.impuestos), L('Pago de capital de la deuda', F.amort), L('Crédito de emergencia recibido', F.emergencia)].filter(x => Math.abs(x.v) > .004),
    decisiones: F.decisiones, retiros: F.retiros, fin: F.fin, dif: F.dif } : null;
  // evolución mensual (los totales se derivan de los mismos registros: gastos = ventas − costos − resultado antes de impuestos)
  const evol = H.map(x => { const cv = (inv ? x.cmv + x.merma : 0) + x.otrosVar; return { m: x.m, ventas: x.sales, costos: cv, gastos: x.sales - cv - x.ebt, ebt: x.ebt, impuesto: x.tax, pagado: x.pagoRTS || 0, resultado: x.profit, caja: x.cash, deuda: x.debt, inventario: x.inv || 0 } });
  const resAcum = H.reduce((a, x) => a + x.profit, 0) + (cerrado ? 0 : 0);
  const resumen = { mes: h.m, cerrado, ventas: h.sales, costos: costoVentas + h.otrosVar, gastos: h.sales - costoVentas - h.otrosVar - h.ebt, resultado: h.profit, resAcum: cerrado ? H.filter(x => x.m <= h.m).reduce((a, x) => a + x.profit, 0) : resAcum,
    caja: A.caja, deudas: P.deuda + P.cxp, impPend: P.impuesto + (P.rts || 0) };
  return { biz: st.biz, mes: h.m, cerrado, antiguo, regimen: reg, resumen, ingresos, costos, cascada: c, cuadra, situacion, impuestos: imp, flujo, items: h.items || [], evol, meses: H.map(x => x.m) };
}
const capM = t => t ? t[0].toUpperCase() + t.slice(1) : '';

/* ===== exportación para Node (pruebas) ===== */
if (typeof module === 'object' && module.exports) {
  module.exports = { BIZ, D, EV, LEVELS, PLAN, MES_EVENTO, MESES, CONT, RTS, IUE, VIDA, cuotaRTS, capitalRTS, categoriaRTS, SMN, CARGAS, CARGAS_T, AGUINALDO, opcion, tipoOpcion, migrarEstado, nuevoFlujo, cerrarFlujo, FLUJO_OP, detalleContable, mesDetalle, trimestre, newGame, buildMonth, openDecision, choose, closeMonth, nextMonth, avanzar, ending, proj, met, snap, balance, apply, eff, factorDemanda, elasticidad, indicadores, PENDIENTES, datosVisuales, afNeto, valorInv, depMes, T, txO, txD, tipoContable, distribuir,
    get s() { return s }, set s(v) { s = v }, ui, setRnd(f) { Math.random = f } };
}
