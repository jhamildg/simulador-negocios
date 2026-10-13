/* Ilustraciones del negocio (V5): reaccionan a los resultados del motor después de cada decisión.
   Módulo sin dependencias: navegador (window.Ilustraciones) y Node (require) para las pruebas.

   1) etapa(datos): etapa general acumulada (Inicial, En desarrollo, Estable, Consolidado, y "en dificultades"),
      a partir de 8 criterios del motor. Nunca depende del tiempo transcurrido.
   2) describir(negocio, datos): traduce variables reales del motor en lo que se dibuja: clientes visibles según las
      unidades vendidas, equipos según la capacidad y las inversiones registradas, inventario según el stock, etc.
   3) svg(negocio, descripción): dibuja la escena. 4) cambios(antes, después): lista legible de lo que cambió en la escena.
   Las ilustraciones solo leen el estado: no cambian ningún cálculo del juego. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Ilustraciones = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const NIVELES = ['Inicial', 'En desarrollo', 'Estable', 'Consolidado'];
  const NOMBRES = {
    delivery: ['Plataforma inicial', 'Plataforma en crecimiento', 'Operación organizada', 'Plataforma consolidada'],
    ecommerce: ['Tienda desde casa', 'Tienda en crecimiento', 'Centro de despacho', 'Comercio consolidado'],
    comida: ['Carrito sencillo', 'Carrito equipado', 'Puesto de comida', 'Emprendimiento consolidado'],
  };
  const num = (d, k) => (d && typeof d[k] === 'number' && isFinite(d[k]) ? d[k] : 0);
  const lim = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- 1. Etapa general (evolución acumulada) ----------
     Puntos (máximo 8), calibrados para un horizonte de 12 meses:
       +1 ventas ≥ 1,15 × iniciales     +1 ventas ≥ 1,4 × iniciales
       +1 capacidad ≥ 1,15 × inicial    +1 capacidad ≥ 1,4 × inicial
       +1 reputación ≥ 60               +1 riesgo < 35
       +1 caja para 1 mes de costos o más
       +1 al menos 3 meses cerrados, resultado acumulado > 0 y resultado del mes > 0
     Nivel: 0-2 Inicial · 3-4 En desarrollo · 5-6 Estable · 7-8 Consolidado (exige ventas y capacidad ≥ 1,4).
     En dificultades: quiebra, caja negativa, riesgo ≥ 60, o pérdida con caja para menos de medio mes. Nivel máximo: Estable. */
  function etapa(d) {
    const n = k => num(d, k);
    const criterios = [
      ['Ventas al menos 15% sobre las iniciales', n('ventasRatio') >= 1.15],
      ['Ventas al menos 40% sobre las iniciales', n('ventasRatio') >= 1.4],
      ['Capacidad 15% mayor que la inicial', n('capRatio') >= 1.15],
      ['Capacidad 40% mayor que la inicial', n('capRatio') >= 1.4],
      ['Reputación de 60 o más', n('reputacion') >= 60],
      ['Riesgo bajo (menos de 35)', n('riesgo') < 35],
      ['Caja para 1 mes de costos o más', n('mesesCaja') >= 1],
      ['Resultados acumulados positivos (3 meses o más)', n('mesesCerrados') >= 3 && n('utilidadAcum') > 0 && n('utilidad') > 0],
    ].map(([texto, cumple]) => ({ texto, cumple }));
    const puntos = criterios.filter(c => c.cumple).length;
    let nivel = puntos >= 7 ? 3 : puntos >= 5 ? 2 : puntos >= 3 ? 1 : 0;
    if (nivel === 3 && !(n('ventasRatio') >= 1.4 && n('capRatio') >= 1.4)) nivel = 2;
    const motivos = [];
    if (d && d.quiebra) motivos.push('La empresa quebró');
    if (n('caja') < 0) motivos.push('Caja negativa');
    if (n('riesgo') >= 60) motivos.push('Riesgo muy alto');
    if (n('utilidad') < 0 && n('mesesCaja') < .5) motivos.push('Pérdidas con muy poca caja');
    const dificultades = motivos.length > 0;
    if (dificultades && nivel > 2) nivel = 2;
    return { nivel, dificultades, puntos, criterios, motivos, nombreNivel: dificultades ? 'En dificultades' : NIVELES[nivel] };
  }

  /* ---------- 2. Qué se dibuja, a partir de variables reales ----------
     datos: nivel, dificultades (de etapa) y
       actividad   unidades del mes / unidades del mes inicial (proyección con las decisiones tomadas)
       capRatio    capacidad / capacidad inicial
       cobertura   inventario / venta esperada del período de reposición (comida: semanas; productos: meses)
       personal    personas además del dueño (comida) o personal total (otros)
       inversiones número de inversiones en equipos registradas como activo fijo
       tecnologia  innovación ≥ 35 o sistema de control comprado
       promo       impulso comercial vigente ≥ 3 %
       reputacion, internacional, sucursal */
  /* Estado del desempeño (determinista, sin azar), a partir de datos reales del motor:
       crítico       dificultades (quiebra, caja negativa, riesgo ≥ 60 o pérdida con muy poca caja)
       desfavorable  resultado negativo, unidades < 95 % del mes anterior o < 85 % de las iniciales
       favorable     resultado positivo y unidades ≥ 103 % del mes anterior o ≥ 115 % de las iniciales, con riesgo < 35
       inicial       sin meses cerrados y sin cambios
       estable       el resto
     Así un negocio con pérdidas nunca se ve favorable y uno que crece con resultado positivo nunca se ve desfavorable. */
  const ESTADOS = { inicial: 'En marcha', favorable: 'Favorable', estable: 'Estable', desfavorable: 'Desfavorable', critico: 'Crítico' };
  function estadoDe(d) {
    d = d || {};
    const dif = !!d.dificultades, act = d.actividad == null ? 1 : num(d, 'actividad'), ten = d.tendencia == null ? 1 : num(d, 'tendencia'), u = d.utilidad == null ? 1 : num(d, 'utilidad');
    if (dif) return 'critico';
    if (u < 0 || ten < .95 || act < .85) return 'desfavorable';
    if (u > 0 && (ten >= 1.03 || act >= 1.15) && num(d, 'riesgo') < 35) return 'favorable';
    if (!num(d, 'mesesCerrados') && Math.abs(act - 1) < .03) return 'inicial';
    return 'estable';
  }
  const VEL = { inicial: 1, favorable: 1.35, estable: 1, desfavorable: .65, critico: .3 };
  function describir(negocio, d) {
    d = d || {};
    const e = { nivel: lim(Math.round(num(d, 'nivel')), 0, 3), dificultades: !!d.dificultades };
    const act = d.actividad == null ? 1 : num(d, 'actividad'), cap = d.capRatio == null ? 1 : num(d, 'capRatio');
    const inv = num(d, 'inversiones'), cob = d.cobertura == null ? 1 : num(d, 'cobertura');
    const v = { negocio, nivel: e.nivel, dificultades: e.dificultades, internacional: !!d.internacional, sucursal: !!d.sucursal,
      promo: !!d.promo, estrellas: num(d, 'reputacion') >= 60, tecnologia: !!d.tecnologia, equipos: [], estado: estadoDe(d) };
    v.vel = VEL[v.estado]; v.cara = v.estado === 'favorable' ? 'feliz' : v.estado === 'desfavorable' || v.estado === 'critico' ? 'triste' : 'normal';
    const eq = (k, c) => { if (c) v.equipos.push(k) };
    if (negocio === 'comida') {
      v.clientes = lim(Math.round(4 * act), 0, 10);
      v.cajas = lim(Math.round(cob * 1.5), 0, 4);
      v.ayudante = num(d, 'personal') >= .15;
      v.vapor = act > .3 && !e.dificultades;
      v.puesto = cap >= 1.6 || (e.nivel >= 3);
      eq('plancha extra', cap >= 1.1 || inv >= 1); eq('conservadora', cap >= 1.25 || inv >= 2); eq('toldo grande', cap >= 1.25);
      eq('mesas', cap >= 1.4); eq('cobro con QR', v.tecnologia); eq('luces', v.estrellas); eq('segundo carrito', v.sucursal);
    } else if (negocio === 'delivery') {
      v.pedidos = lim(Math.round(4 * act), 1, 9);
      v.motos = lim(Math.round(3 * cap), 1, 9);
      v.autos = cap >= 1.6 ? 3 : cap >= 1.25 ? 2 : 1;
      v.central = e.nivel >= 2 || cap >= 1.5;
      v.equipo = lim(Math.round(num(d, 'personal') / 2), 1, 5);
      eq('central de despacho', v.central); eq('app con calificaciones', v.estrellas); eq('promoción en la app', v.promo);
    } else {
      v.paquetes = lim(Math.round(3 * act), 0, 8);
      v.cajas = lim(Math.round(cob * 4), 0, 8);
      v.estantes = cap >= 1.4 ? 3 : cap >= 1.15 ? 2 : 1;
      v.deposito = e.nivel >= 2 || cap >= 1.5;
      v.furgon = cap >= 1.3;
      v.pantallas = v.tecnologia ? 2 : 1;
      v.personas = lim(Math.round(num(d, 'personal')), 1, 4);
      eq('estantes', v.estantes > 1); eq('depósito', v.deposito); eq('furgoneta', v.furgon); eq('segunda pantalla', v.pantallas > 1);
    }
    return v;
  }
  // Lo que cambió en la escena, en palabras. Solo compara lo que se dibuja (no inventa causas).
  function cambios(a, b) {
    if (!a || !b) return [];
    const out = [], n = (k, l, s = '') => { if (a[k] !== undefined && a[k] !== b[k]) out.push(`${l}: ${a[k]} → ${b[k]}${s}`) };
    n('clientes', 'Clientes en la escena'); n('pedidos', 'Pedidos en el mapa'); n('paquetes', 'Paquetes saliendo'); n('motos', 'Repartidores'); n('cajas', 'Cajas de inventario');
    for (const x of b.equipos) if (!a.equipos.includes(x)) out.push('Aparece: ' + x);
    for (const x of a.equipos) if (!b.equipos.includes(x)) out.push('Desaparece: ' + x);
    if (a.dificultades !== b.dificultades) out.push(b.dificultades ? 'Aparecen señales de dificultad' : 'Desaparecen las señales de dificultad');
    if (a.nivel !== b.nivel) out.push(`Etapa: ${NIVELES[a.nivel]} → ${NIVELES[b.nivel]}`);
    if (a.estado && a.estado !== b.estado) out.push(`Desempeño: ${ESTADOS[a.estado]} → ${ESTADOS[b.estado]}`);
    return out;
  }

  /* ---------- 3. Piezas de dibujo ---------- */
  const C = { coral: '#FF6B5B', coralD: '#E0503F', amarillo: '#FFC93C', naranja: '#FF9F43', turquesa: '#2EC4B6', celeste: '#4FB3E8', azul: '#2F80D0',
    verde: '#7BD389', blanco: '#FFFFFF', piel: '#F2C9A0', pielB: '#C98F5F', tinta: '#2C3E50', gris: '#C9D3DC', carton: '#E3A35E', cartonD: '#B97A3A', madera: '#C98B4E', hielo: '#9ED8F5' };
  const R = (x, y, w, h, f, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${extra}/>`;
  const Ci = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${extra}/>`;
  const P = (d, f, extra = '') => `<path d="${d}" fill="${f}" ${extra}/>`;
  const T = (x, y, txt, size, f, anchor = 'middle', w = 700) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${w}" fill="${f}" text-anchor="${anchor}" font-family="system-ui,sans-serif">${txt}</text>`;
  const persona = (x, y, ropa, piel = C.piel, s = 1, cara = '') => `<g transform="translate(${x},${y}) scale(${s})">${R(-6, -2, 12, 18, ropa, 5)}${Ci(0, -8, 6, piel)}${P('M-6 -10a6 6 0 0 1 12 0z', C.tinta)}${cara ? Ci(-2.2, -8, .9, C.tinta) + Ci(2.2, -8, .9, C.tinta) + P(cara === 'feliz' ? 'M-2.4 -5.6 q2.4 2.4 4.8 0' : cara === 'triste' ? 'M-2.4 -4.4 q2.4 -2.2 4.8 0' : 'M-2 -5 h4', 'none', `stroke="${C.tinta}" stroke-width=".9" stroke-linecap="round"`) : ''}</g>`;
  const anim = (cls, contenido, i = 0) => `<g class="an ${cls}" style="animation-delay:${(i * .23).toFixed(2)}s">${contenido}</g>`;
  const caja = (x, y, w = 16, h = 13) => `${R(x, y, w, h, C.carton, 1.5)}${R(x + w / 2 - 1.5, y, 3, h, C.cartonD)}`;
  const arbol = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">${R(-3, 0, 6, 18, C.madera)}${Ci(0, -6, 14, C.verde)}${Ci(-8, 2, 9, C.verde)}${Ci(9, 2, 9, C.verde)}</g>`;
  const sombrilla = (x, y, a = C.coral, b = C.amarillo, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">${R(-1.5, 0, 3, 34, C.tinta)}${P('M-26 2 A26 18 0 0 1 26 2 Z', a)}${P('M-9 2 A26 18 0 0 1 9 2 L0 -16 Z', b)}${P('M-26 2 A26 18 0 0 1 -18 -9 L-9 2 Z', b)}${P('M26 2 A26 18 0 0 0 18 -9 L9 2 Z', b)}</g>`;
  const mesa = (x, y) => `${sombrilla(x, y - 30, C.turquesa, C.blanco, .8)}${R(x - 14, y, 28, 4, C.madera, 2)}${R(x - 2, y + 4, 4, 12, C.madera)}${R(x - 22, y + 6, 6, 10, C.naranja, 2)}${R(x + 16, y + 6, 6, 10, C.naranja, 2)}`;
  const moto = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">${Ci(-12, 10, 6, C.tinta)}${Ci(14, 10, 6, C.tinta)}${Ci(-12, 10, 2.5, C.gris)}${Ci(14, 10, 2.5, C.gris)}${P('M-14 6 L8 6 L14 -2 L18 4 L16 8 Z', C.coral)}${R(-20, -8, 14, 12, C.amarillo, 2)}${R(-2, -10, 7, 12, C.azul, 3)}${Ci(1, -14, 5, C.piel)}${P('M-4 -15a5 5 0 0 1 10 0z', C.coral)}</g>`;
  const auto = (x, y, f = C.amarillo, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">${P('M-26 8 L-26 -2 Q-24 -8 -16 -8 L-10 -16 L12 -16 L20 -8 Q26 -8 26 -2 L26 8 Z', f)}${R(-8, -14, 9, 7, '#DDF3FF', 1)}${R(3, -14, 9, 7, '#DDF3FF', 1)}${Ci(-14, 9, 6, C.tinta)}${Ci(14, 9, 6, C.tinta)}${Ci(-14, 9, 2.5, C.gris)}${Ci(14, 9, 2.5, C.gris)}</g>`;
  const furgon = (x, y, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">${R(-34, -26, 46, 32, C.blanco, 3, `stroke="${C.gris}"`)}${P('M12 -18 L26 -18 L34 -6 L34 6 L12 6 Z', C.turquesa)}${R(16, -15, 9, 8, '#DDF3FF', 1)}${T(-11, -7, 'ENVÍOS', 8, C.coral)}${Ci(-22, 8, 6, C.tinta)}${Ci(22, 8, 6, C.tinta)}</g>`;
  const telefono = (x, y, w, h, contenido = '') => `${R(x, y, w, h, C.tinta, 8)}${R(x + 4, y + 8, w - 8, h - 16, '#EAF7FF', 3)}${contenido}${R(x + w / 2 - 8, y + 3, 16, 2, C.gris, 1)}`;
  const pin = (x, y, f = C.coral) => `${P(`M${x} ${y} c-6 -8 -8 -11 -8 -14 a8 8 0 0 1 16 0 c0 3 -2 6 -8 14z`, f)}${Ci(x, y - 14, 3, C.blanco)}`;
  const laptop = (x, y) => `${R(x, y, 34, 22, C.tinta, 2)}${R(x + 3, y + 3, 28, 16, C.celeste)}${R(x - 4, y + 22, 42, 4, C.gris, 2)}`;
  const nube = (x, y, f, s = 1) => `<g transform="translate(${x},${y}) scale(${s})">${Ci(0, 0, 12, f)}${Ci(14, -4, 15, f)}${Ci(30, 0, 12, f)}${R(0, 0, 30, 12, f)}</g>`;
  const ROPA = [C.azul, C.naranja, C.turquesa, C.coral, C.amarillo, C.celeste];
  const fila = (x, y, n, paso = 14) => { let g = ''; for (let i = 0; i < n; i++) g += anim('an-bob', persona(x + i * paso, y, ROPA[i % ROPA.length], i % 3 === 2 ? C.pielB : C.piel), i); return g };
  const cartel = (x, y, txt, f = C.coral) => `${R(x, y, txt.length * 6 + 10, 14, f, 3)}${T(x + (txt.length * 6 + 10) / 2, y + 10, txt, 8, C.blanco)}`;
  const qr = (x, y) => `${R(x, y, 16, 16, C.blanco, 1, `stroke="${C.tinta}" stroke-width="1"`)}${R(x + 2, y + 2, 4, 4, C.tinta)}${R(x + 10, y + 2, 4, 4, C.tinta)}${R(x + 2, y + 10, 4, 4, C.tinta)}${R(x + 9, y + 9, 2, 2, C.tinta)}${R(x + 12, y + 12, 2, 2, C.tinta)}`;

  function fondo(v) {
    const crit = v.estado === 'critico' || v.dificultades, malo = v.estado === 'desfavorable';
    const cielo = crit ? '#E4E6EB' : malo ? '#E3EEF5' : '#D6F1FF', suelo = crit ? '#DCD7CC' : '#C9EDB4';
    let g = R(0, 0, 360, 200, cielo) + R(0, 150, 360, 50, suelo);
    if (crit) {
      g += `${nube(40, 30, '#9AA5B1', 1.1)}${P('M64 46 l-7 13 h7 l-4 11 l12 -16 h-7 l4 -8z', C.amarillo)}`;
      g += anim('an-lluvia', [...Array(8)].map((_, i) => R(30 + i * 8 + (i % 2) * 3, 50 + (i % 3) * 6, 1.5, 7, '#7C8B99', 1)).join(''));
    } else {
      if (v.estado === 'favorable') g += anim('an-sol', `<g transform="translate(44,34)">${[...Array(8)].map((_, i) => `<rect x="-1.5" y="-24" width="3" height="7" rx="1.5" fill="${C.amarillo}" transform="rotate(${i * 45})"/>`).join('')}</g>`);
      g += Ci(44, 34, 14, C.amarillo);
      g += malo ? nube(26, 30, '#C3CED8', 1) : anim('an-nube', nube(250, 26, C.blanco, .9));
      if (v.estado === 'favorable') g += anim('an-brillo', `${P('M300 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z', C.amarillo)}${P('M150 30 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z', C.naranja)}`);
    }
    return g;
  }
  // Señal del desempeño (forma + flecha, no solo color)
  function senal(v) {
    if (v.estado === 'critico' || v.dificultades) return `<g transform="translate(96,20)">${P('M0 -12 L12 8 L-12 8 Z', C.amarillo, `stroke="${C.tinta}" stroke-width="1.5"`)}${T(0, 5, '!', 12, C.tinta)}</g>`;
    if (v.estado === 'favorable') return `<g transform="translate(96,20)">${Ci(0, 0, 10, '#2E9E5B')}${P('M0 -6 L6 2 H2 V6 H-2 V2 H-6 Z', C.blanco)}</g>`;
    if (v.estado === 'desfavorable') return `<g transform="translate(96,20)">${Ci(0, 0, 10, C.naranja)}${P('M0 6 L6 -2 H2 V-6 H-2 V-2 H-6 Z', C.blanco)}</g>`;
    return '';
  }
  function insignias(v) {
    let g = '';
    if (v.internacional) g += `<g transform="translate(330,28)">${Ci(0, 0, 15, C.blanco)}${Ci(0, 0, 13, C.celeste)}${P('M-6 -8 q6 2 4 8 q-4 3 0 9 M4 -11 q-2 6 4 10', 'none', `stroke="${C.verde}" stroke-width="4" stroke-linecap="round"`)}</g>`;
    if (v.sucursal && v.negocio !== 'comida') g += `<g transform="translate(${v.internacional ? 292 : 330},28)">${R(-12, -10, 24, 20, C.blanco, 4)}${T(0, 4, '×2', 11, C.coralD)}</g>`;
    return g;
  }

  /* ---------- 4. Escenas ---------- */
  const universidad = () => `${R(200, 62, 150, 88, '#F4EFE6')}${P('M194 64 L275 30 L356 64 Z', '#E9E1D3')}${T(275, 58, 'UNIVERSIDAD', 10, '#8A7A63')}${[214, 240, 266, 292, 318].map(x => R(x, 70, 9, 70, '#FFFFFF')).join('')}${R(196, 140, 158, 10, '#E9E1D3')}${R(266, 112, 20, 28, '#B9A88E', 2)}`;
  const tiene = (v, k) => v.equipos.includes(k);
  function comida(v) {
    let g = universidad() + arbol(186, 128, .9);
    if (tiene(v, 'segundo carrito')) g += `<g transform="translate(300,132) scale(.45)">${R(0, 0, 80, 30, C.turquesa, 6)}${R(-3, -5, 86, 7, C.amarillo, 3)}${Ci(14, 36, 7, C.tinta)}${Ci(66, 36, 7, C.tinta)}${T(40, 20, '2', 16, C.blanco)}</g>`;
    if (!v.puesto) {
      const grande = tiene(v, 'toldo grande'), x = 52, y = 112, w = grande ? 112 : 92;
      g += sombrilla(x + w / 2, y - 40, C.coral, C.amarillo, grande ? 1.3 : 1.05);
      if (tiene(v, 'luces')) g += P(`M${x - 6} ${y - 48} Q${x + w / 2} ${y - 30} ${x + w + 6} ${y - 48}`, 'none', `stroke="${C.tinta}" stroke-width="1" fill="none"`) + [0, 1, 2, 3, 4].map(i => Ci(x + i * (w + 12) / 4 - 6, y - 45 + (i % 4 === 0 ? 0 : 6), 3, i % 2 ? C.amarillo : C.naranja)).join('');
      g += R(x, y, w, 36, C.coral, 6) + R(x - 4, y - 6, w + 8, 8, C.amarillo, 3) + R(x + 8, y + 8, w - 16, 18, '#FFE3DF', 4) + T(x + w / 2, y + 22, v.promo ? 'PROMO' : 'COMIDA', 11, C.coralD);
      g += R(x + 8, y - 14, 30, 8, C.tinta, 2) + (tiene(v, 'plancha extra') ? R(x + 42, y - 14, 26, 8, C.tinta, 2) : '');
      if (v.vapor && v.estado !== 'critico') g += anim('an-vapor', P(`M${x + 14} ${y - 18} q4 -6 0 -12 M${x + 26} ${y - 18} q4 -6 0 -12`, 'none', `stroke="${C.gris}" stroke-width="2" fill="none"`));
      g += Ci(x + 14, y + 42, 8, C.tinta) + Ci(x + w - 14, y + 42, 8, C.tinta) + Ci(x + 14, y + 42, 3, C.gris) + Ci(x + w - 14, y + 42, 3, C.gris);
      g += persona(x + w - 22, y - 14, C.turquesa, C.piel, 1, v.cara) + (v.ayudante ? persona(x + w - 46, y - 14, C.naranja, C.piel, 1, v.cara) : '');
      if (tiene(v, 'conservadora')) g += R(x + w + 4, y + 16, 24, 20, C.hielo, 3) + R(x + w + 4, y + 16, 24, 5, C.blanco, 2);
      if (tiene(v, 'cobro con QR')) g += qr(x + 6, y + 10);
      for (let i = 0; i < v.cajas; i++) g += caja(x + 4 + (i % 2) * 17, y - 28 - Math.floor(i / 2) * 13, 15, 12);
      if (tiene(v, 'mesas')) g += mesa(x + w + 54, 142);
      const n = v.clientes, izq = Math.min(n, 2);
      g += fila(10, 166, izq, 15) + (n > izq ? fila(x + w + (tiene(v, 'mesas') ? 82 : 36), 166, n - izq, 14) : '');
    } else {
      const x = 20, y = 86, w = 160;
      g += R(x, y, w, 64, v.nivel >= 3 ? C.blanco : '#FFF4D6', 4, `stroke="${C.coral}" stroke-width="2"`);
      g += [...Array(Math.round(w / 15))].map((_, i) => P(`M${x + i * 15} ${y} h15 v14 q-7.5 8 -15 0z`, i % 2 ? C.blanco : C.coral)).join('');
      g += R(x + 10, y + 26, w - 20, 22, '#BFE6F5', 3) + R(x + 6, y + 48, w - 12, 6, C.madera, 2);
      g += persona(x + 34, y + 36, C.turquesa, C.piel, 1, v.cara) + (v.ayudante ? persona(x + 64, y + 36, C.naranja, C.piel, 1, v.cara) : '');
      g += R(x + w / 2 - 38, y - 26, 76, 18, C.amarillo, 5) + T(x + w / 2, y - 13, v.estrellas ? '★ COMIDA ★' : (v.promo ? 'PROMO' : 'COMIDA RÁPIDA'), 9, C.tinta);
      if (tiene(v, 'cobro con QR')) g += qr(x + w - 30, y + 28);
      for (let i = 0; i < v.cajas; i++) g += caja(x + w - 40 + (i % 2) * 17, y + 62 - Math.floor(i / 2) * 14, 15, 12);
      if (tiene(v, 'mesas')) g += mesa(x + w + 30, 142);
      g += fila(x + 4, 168, Math.min(v.clientes, 7), 15) + (v.clientes > 7 ? fila(x + w + 58, 168, v.clientes - 7, 14) : '');
    }
    return g;
  }
  function delivery(v) {
    let g = R(0, 158, 360, 22, '#B8C4CE') + [...Array(12)].map((_, i) => R(8 + i * 30, 168, 14, 2, C.blanco)).join('');
    if (v.central) {
      const bw = 100, bx = 168, bh = 76;
      if (v.nivel >= 3) g += R(300, 60, 40, 98, '#A9D8F2') + R(250, 82, 40, 76, '#BDE3F7');
      g += R(bx, 150 - bh, bw, bh, C.blanco, 4, `stroke="${C.celeste}" stroke-width="2"`) + R(bx, 150 - bh, bw, 16, C.celeste, 4) + T(bx + bw / 2, 150 - bh + 12, 'CENTRAL', 10, C.blanco);
      g += [0, 1, 2].map(i => R(bx + 10 + i * (bw - 20) / 3, 150 - 52, (bw - 40) / 3, 18, '#DDF3FF', 2)).join('') + R(bx + bw / 2 - 9, 128, 18, 22, C.tinta, 2);
      for (let i = 0; i < Math.min(3, v.equipo); i++) g += Ci(bx + 16 + i * (bw - 20) / 3, 150 - 44, 4, C.piel);
    }
    const ph = 100, pins = [[.25, .6], [.7, .3], [.55, .8], [.8, .7], [.35, .25], [.15, .85], [.62, .55], [.88, .18], [.45, .45]].slice(0, v.pedidos);
    const mapa = (x, y, w, h) => R(x, y, w, h, '#DDF4E4', 2) + P(`M${x} ${y + h * .4} H${x + w} M${x + w * .45} ${y} V${y + h}`, 'none', `stroke="${C.blanco}" stroke-width="3"`) + pins.map(([a, b], i) => v.estado === 'critico' ? pin(x + a * w, y + b * h, C.gris) : anim('an-pulso', pin(x + a * w, y + b * h, i % 2 ? C.turquesa : C.coral), i)).join('');
    g += telefono(24, 150 - ph - 6, 66, ph, mapa(30, 150 - ph + 4, 54, ph - 34) + (v.estrellas ? T(57, 150 - 14, '★★★★★', 9, C.naranja) : '') + (v.promo ? cartel(30, 150 - ph + 6, 'PROMO') : ''));
    g += P(`M90 110 Q130 80 165 120`, 'none', `stroke="${C.coral}" stroke-width="2" stroke-dasharray="4 4" fill="none"`) + pin(165, 122, C.turquesa);
    const mover = v.estado !== 'critico';
    for (let i = 0; i < v.motos; i++) { const m = moto(110 + (i % 6) * 40 + (i >= 6 ? 20 : 0), 158 - (i % 2) * 2 - (i >= 6 ? 14 : 0), .85); g += mover ? anim('an-ruta', m, i) : m }
    for (let i = 0; i < v.autos; i++) { const a = auto(330 - i * 56, 184, [C.amarillo, C.turquesa, C.coral][i % 3], .8); g += mover ? anim('an-ruta2', a, i) : a }
    return g;
  }
  function ecommerce(v) {
    let g = '';
    if (!v.deposito) {
      g += R(0, 40, 360, 110, '#FFF6E8') + R(0, 146, 360, 4, '#EBDCC4') + R(240, 50, 70, 40, '#BFE6F5', 3, `stroke="${C.blanco}" stroke-width="4"`);
      if (v.promo) g += cartel(250, 56, 'OFERTA');
      g += R(30, 112, 120, 6, C.madera, 2) + R(38, 118, 6, 32, C.madera) + R(136, 118, 6, 32, C.madera) + laptop(46, 90) + (v.pantallas > 1 ? laptop(92, 90) : '');
      for (let i = 0; i < v.personas; i++) g += persona(132 - i * 22, 102, ROPA[(i + 3) % ROPA.length], C.piel, 1, v.cara);
      for (let k = 0; k < v.estantes; k++) { const ex = 236 + k * 0 - (k ? 0 : 0), ey = 100 - k * 0; g += R(ex + k * 6, ey + 46 - k * 22, 100, 3, C.madera) }
      g += R(236, 98, 3, 50, C.madera) + R(339, 98, 3, 50, C.madera);
      for (let i = 0; i < v.cajas; i++) g += caja(244 + (i % 5) * 19, 132 - Math.floor(i / 5) * 22 - (v.estantes > 1 ? 0 : 0), 15, 12);
    } else {
      const ancho = v.nivel >= 3 ? 230 : 200;
      g += R(10, 46, ancho, 106, '#F2F6FA', 4, `stroke="${C.celeste}" stroke-width="3"`) + P(`M4 50 L${10 + ancho / 2} 22 L${16 + ancho} 50 Z`, C.celeste) + T(10 + ancho / 2, 44, 'DESPACHO', 11, C.blanco);
      for (let k = 0; k < v.estantes; k++) g += R(20, 140 - k * 26, 86, 3, C.madera);
      g += R(20, 70, 3, 73, C.madera) + R(103, 70, 3, 73, C.madera);
      for (let i = 0; i < v.cajas; i++) g += caja(24 + (i % 4) * 20, 126 - Math.floor(i / 4) * 26, 15, 12);
      g += R(120, 118, 70, 6, C.madera, 2) + laptop(126, 94) + (v.pantallas > 1 ? laptop(162, 94) : '');
      for (let i = 0; i < v.personas; i++) g += persona(196 + i * 14, 104, ROPA[(i + 1) % ROPA.length], C.piel, 1, v.cara);
      if (v.promo) g += cartel(150, 54, 'OFERTA');
    }
    for (let i = 0; i < v.paquetes; i++) { const c = caja(150 + i * 17, 160 + (i % 2) * 6, 14, 11); g += v.estado === 'critico' ? c : anim('an-paquete', c, i) }
    if (v.furgon) g += furgon(318, 186, .8);
    if (v.dificultades) g += R(0, 0, 360, 200, '#FFFFFF', 0, 'opacity=".25"');
    return g;
  }

  // svg(negocio, descripción) — también acepta {nivel, dificultades} (V4) y la completa con valores neutros.
  function svg(negocio, e, opciones = {}) {
    const v = e && e.equipos ? e : describir(negocio, { ...(e || {}), internacional: opciones.internacional, sucursal: opciones.sucursal });
    const dib = negocio === 'delivery' ? delivery : negocio === 'ecommerce' ? ecommerce : comida;
    const nombre = (NOMBRES[negocio] || NOMBRES.comida)[v.nivel] + (v.dificultades ? ', en dificultades' : '') + ', desempeño ' + ESTADOS[v.estado || 'estable'].toLowerCase();
    const visibles = negocio === 'comida' ? v.clientes : negocio === 'delivery' ? v.pedidos : v.paquetes;
    return `<svg class="${opciones.clase || 'scene'}" viewBox="0 0 360 200" role="img" aria-label="${nombre}" data-biz="${negocio}" data-nivel="${v.nivel}" data-dificultades="${v.dificultades}" data-clientes="${visibles}" data-equipos="${v.equipos.join('|')}" data-cajas="${v.cajas ?? ''}" data-estado="${v.estado || 'estable'}" style="--v:${v.vel || 1}" xmlns="http://www.w3.org/2000/svg">${fondo(v)}${dib(v)}${insignias(v)}${senal(v)}</svg>`;
  }

  return { NIVELES, NOMBRES, ESTADOS, etapa, estadoDe, describir, cambios, svg };
});
