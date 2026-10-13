/* Finanzas personales del propietario (V3).
   Módulo sin dependencias: funciona en el navegador (window.FinanzasPersonales) y en Node (require) para las pruebas.

   Modelo:
   - El negocio tiene su propia caja: `estado.cash` (la misma variable que ya usa el motor del simulador).
   - El propietario tiene su propio dinero: `estado.pf`, con saldo disponible, ahorro, presupuesto e historial.
   - Retiro: sale de la caja del negocio y entra al saldo personal. No es costo ni gasto del negocio, así que no cambia la utilidad.
   - Gasto personal: sale solo del saldo personal. La caja del negocio no se toca otra vez.
   - Ahorro: pasa dinero del saldo disponible a la cuenta de ahorro; nunca se cuenta en los dos lados.
   - Cada operación valida todo antes de cambiar nada: si falla, el estado queda exactamente igual.
   Todos los importes se guardan en bolivianos (Bs). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FinanzasPersonales = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Presupuesto mensual inicial: parámetro educativo editable, no un dato real de ninguna persona.
  const PRESUPUESTO_INICIAL = 2500;
  const MAX_IMPORTE = 1e9;
  const MAX_HISTORIAL = 300;
  const CATEGORIAS = ['Alimentación', 'Transporte', 'Vivienda', 'Estudios', 'Salud', 'Ocio', 'Otros'];
  const TIPOS = { retiro: 'Retiro del negocio', gasto: 'Gasto personal', ahorro: 'Ahorro', desahorro: 'Uso del ahorro', presupuesto: 'Cambio de presupuesto' };

  const r2 = v => Math.round(v * 100) / 100;
  const err = error => ({ ok: false, error });

  function inicial(presupuestoMensual) {
    const p = presupuestoMensual === undefined ? PRESUPUESTO_INICIAL : presupuestoMensual;
    return { saldo: 0, ahorro: 0, presupuestoMensual: p, recibido: 0, gastado: 0, seq: 0, mov: [] };
  }

  // Asegura que el estado tenga la sección personal (las partidas guardadas antes de V3 no la tienen).
  function asegurar(estado) {
    if (!estado.pf || typeof estado.pf !== 'object') estado.pf = inicial();
    const pf = estado.pf;
    for (const k of ['saldo', 'ahorro', 'recibido', 'gastado', 'seq']) if (typeof pf[k] !== 'number' || !isFinite(pf[k])) pf[k] = 0;
    if (typeof pf.presupuestoMensual !== 'number' || !isFinite(pf.presupuestoMensual) || pf.presupuestoMensual < 0) pf.presupuestoMensual = PRESUPUESTO_INICIAL;
    if (!Array.isArray(pf.mov)) pf.mov = [];
    return pf;
  }

  function validarImporte(importe) {
    if (typeof importe !== 'number' || !isFinite(importe)) return 'Escribe un importe válido.';
    if (importe <= 0) return 'El importe debe ser mayor que cero.';
    if (importe > MAX_IMPORTE) return 'El importe es demasiado grande.';
    if (Math.abs(r2(importe) - importe) > 1e-9) return 'Usa como máximo dos decimales.';
    return null;
  }

  // Máximo que el negocio puede entregar: solo el efectivo que tiene. Sin crédito ni saldos negativos.
  function maximoRetiro(estado) {
    return Math.max(0, Math.floor((estado.cash || 0) * 100) / 100);
  }

  function registrar(estado, tipo, importe, concepto, antes) {
    const pf = estado.pf;
    pf.seq += 1;
    pf.mov.push({
      id: pf.seq, tipo, importe: r2(importe), concepto: String(concepto || TIPOS[tipo]).slice(0, 60),
      anio: estado.year || 1, mes: estado.month || null, decision: (estado.qi || 0) + 1,
      cajaAntes: r2(antes.caja), cajaDespues: r2(estado.cash), saldoAntes: r2(antes.saldo), saldoDespues: r2(pf.saldo),
    });
    if (pf.mov.length > MAX_HISTORIAL) pf.mov.splice(0, pf.mov.length - MAX_HISTORIAL);
  }

  function retirar(estado, importe, concepto) {
    const pf = asegurar(estado), e = validarImporte(importe);
    if (e) return err(e);
    const max = maximoRetiro(estado);
    if (max <= 0) return err('El negocio no tiene efectivo disponible para retirar.');
    if (importe > max) return err('El negocio solo tiene Bs ' + max.toLocaleString('es-BO') + ' en caja. No puedes retirar más de lo que hay.');
    const antes = { caja: estado.cash, saldo: pf.saldo };
    estado.cash = estado.cash - importe; // sin redondear la caja del negocio: el importe ya tiene 2 decimales
    pf.saldo = r2(pf.saldo + importe);
    pf.recibido = r2(pf.recibido + importe);
    registrar(estado, 'retiro', importe, concepto || 'Retiro para uso personal', antes);
    return { ok: true };
  }

  function gastar(estado, importe, categoria, concepto) {
    const pf = asegurar(estado), e = validarImporte(importe);
    if (e) return err(e);
    if (!CATEGORIAS.includes(categoria)) return err('Elige una categoría de gasto.');
    if (importe > pf.saldo) return err('Tu saldo personal es Bs ' + pf.saldo.toLocaleString('es-BO') + '. Retira dinero del negocio o usa tu ahorro antes de gastar más.');
    const antes = { caja: estado.cash, saldo: pf.saldo };
    pf.saldo = r2(pf.saldo - importe);
    pf.gastado = r2(pf.gastado + importe);
    registrar(estado, 'gasto', importe, categoria + (concepto ? ': ' + String(concepto).trim() : ''), antes);
    return { ok: true };
  }

  function ahorrar(estado, importe) {
    const pf = asegurar(estado), e = validarImporte(importe);
    if (e) return err(e);
    if (importe > pf.saldo) return err('No tienes ese importe disponible en tu saldo personal.');
    const antes = { caja: estado.cash, saldo: pf.saldo };
    pf.saldo = r2(pf.saldo - importe);
    pf.ahorro = r2(pf.ahorro + importe);
    registrar(estado, 'ahorro', importe, 'Paso a ahorro', antes);
    return { ok: true };
  }

  function usarAhorro(estado, importe) {
    const pf = asegurar(estado), e = validarImporte(importe);
    if (e) return err(e);
    if (importe > pf.ahorro) return err('Tu ahorro es Bs ' + pf.ahorro.toLocaleString('es-BO') + '.');
    const antes = { caja: estado.cash, saldo: pf.saldo };
    pf.ahorro = r2(pf.ahorro - importe);
    pf.saldo = r2(pf.saldo + importe);
    registrar(estado, 'desahorro', importe, 'Uso del ahorro', antes);
    return { ok: true };
  }

  function fijarPresupuesto(estado, mensual) {
    const pf = asegurar(estado);
    if (typeof mensual !== 'number' || !isFinite(mensual) || mensual < 0) return err('Escribe un presupuesto válido (cero o más).');
    if (mensual > MAX_IMPORTE) return err('El presupuesto es demasiado grande.');
    const antes = { caja: estado.cash, saldo: pf.saldo };
    pf.presupuestoMensual = r2(mensual);
    registrar(estado, 'presupuesto', mensual, 'Presupuesto mensual: Bs ' + r2(mensual).toLocaleString('es-BO'), antes);
    return { ok: true };
  }

  // Resumen del período en curso. V5 (partidas por meses, estado.month): presupuesto del mes y del año.
  // V3/V4 (partidas por años, estado.year): cada año del simulador equivale a 12 meses de presupuesto.
  function resumen(estado) {
    const pf = asegurar(estado);
    if (typeof estado.month === 'number') {
      const mes = estado.month, delMes = t => pf.mov.filter(m => m.mes === mes && m.tipo === t).reduce((a, m) => a + m.importe, 0);
      const total = t => pf.mov.filter(m => m.tipo === t).reduce((a, m) => a + m.importe, 0);
      const gastadoMes = r2(delMes('gasto')), presupuestoAnual = r2(pf.presupuestoMensual * 12), gastadoAnio = r2(total('gasto'));
      return {
        mensual: true, saldo: pf.saldo, ahorro: pf.ahorro, total: r2(pf.saldo + pf.ahorro), recibido: pf.recibido, gastado: pf.gastado,
        presupuestoMensual: pf.presupuestoMensual, gastadoMes, retiradoMes: r2(delMes('retiro')), presupuestoDisponibleMes: r2(pf.presupuestoMensual - gastadoMes), excedidoMes: gastadoMes > pf.presupuestoMensual,
        presupuestoAnual, gastadoAnio, retiradoAnio: r2(total('retiro')), presupuestoDisponible: r2(presupuestoAnual - gastadoAnio), excedido: gastadoAnio > presupuestoAnual, maximoRetiro: maximoRetiro(estado),
      };
    }
    const anio = estado.year || 1;
    const delAnio = t => pf.mov.filter(m => m.anio === anio && m.tipo === t).reduce((a, m) => a + m.importe, 0);
    const presupuestoAnual = r2(pf.presupuestoMensual * 12), gastadoAnio = r2(delAnio('gasto'));
    return {
      saldo: pf.saldo, ahorro: pf.ahorro, total: r2(pf.saldo + pf.ahorro), recibido: pf.recibido, gastado: pf.gastado,
      presupuestoMensual: pf.presupuestoMensual, presupuestoAnual, gastadoAnio, retiradoAnio: r2(delAnio('retiro')),
      presupuestoDisponible: r2(presupuestoAnual - gastadoAnio), excedido: gastadoAnio > presupuestoAnual, maximoRetiro: maximoRetiro(estado),
    };
  }

  // Comprobación de coherencia: el saldo personal debe poder reconstruirse a partir del historial.
  function verificar(estado) {
    const pf = asegurar(estado);
    let saldo = 0, ahorro = 0, recibido = 0, gastado = 0;
    for (const m of pf.mov) {
      if (m.tipo === 'retiro') { saldo += m.importe; recibido += m.importe; }
      else if (m.tipo === 'gasto') { saldo -= m.importe; gastado += m.importe; }
      else if (m.tipo === 'ahorro') { saldo -= m.importe; ahorro += m.importe; }
      else if (m.tipo === 'desahorro') { saldo += m.importe; ahorro -= m.importe; }
    }
    const completo = pf.seq === pf.mov.length; // si el historial se recortó, no se puede reconstruir desde cero
    const ok = !completo || (Math.abs(r2(saldo) - pf.saldo) < 0.01 && Math.abs(r2(ahorro) - pf.ahorro) < 0.01 && Math.abs(r2(recibido) - pf.recibido) < 0.01 && Math.abs(r2(gastado) - pf.gastado) < 0.01);
    return { ok: ok && pf.saldo >= 0 && pf.ahorro >= 0, completo };
  }

  return { PRESUPUESTO_INICIAL, CATEGORIAS, TIPOS, inicial, asegurar, maximoRetiro, retirar, gastar, ahorrar, usarAhorro, fijarPresupuesto, resumen, verificar };
});
