import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RevealState } from '../src/reveal-state.js';
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
test('ningún escudo se carga ni se revela al iniciar', () => {
  let loads = 0;
  const state = new RevealState({ load: () => { loads++; } });
  assert.equal(state.status, 'closed'); assert.equal(state.activeId, null); assert.equal(loads, 0);
});
test('primera E carga únicamente el escudo de la mascota seleccionada', async () => {
  const requests = []; const events = [];
  const state = new RevealState({ load: async id => { requests.push(id); return { id }; }, onChange: e => events.push(e) });
  await state.toggle('marzo');
  assert.deepEqual(requests, ['marzo']); assert.equal(state.status, 'open'); assert.equal(state.activeId, 'marzo');
  assert.deepEqual(events.map(e => e.status), ['loading', 'open']);
  assert.deepEqual([...state.discovered], ['marzo']);
});
test('segunda E cierra, sin volver a descargar el logo', async () => {
  let loads = 0;
  const state = new RevealState({ load: async () => ++loads });
  await state.toggle('racing'); await state.toggle('racing');
  assert.equal(loads, 1); assert.equal(state.status, 'closed'); assert.equal(state.activeId, null);
});
test('cerrar durante la descarga impide una apertura tardía', async () => {
  const d = deferred(); const events = [];
  const state = new RevealState({ load: () => d.promise, onChange: e => events.push(e) });
  const work = state.toggle('marzo'); state.close(); d.resolve('modelo'); await work;
  assert.equal(state.status, 'closed'); assert.equal(state.activeId, null);
  assert.equal(events.some(e => e.status === 'open'), false);
  assert.equal(state.discovered.size, 0);
});
test('otra E durante la descarga cancela esa apertura', async () => {
  const d = deferred();
  const state = new RevealState({ load: () => d.promise });
  const work = state.toggle('ballivian'); await state.toggle('ballivian'); d.resolve(); await work;
  assert.equal(state.activeId, null); assert.equal(state.status, 'closed');
});
test('cambiar de mascota descarta el resultado de la anterior', async () => {
  const a = deferred(), b = deferred(); const opened = [];
  const state = new RevealState({ load: id => id === 'marzo' ? a.promise : b.promise,
    onChange: e => { if (e.status === 'open') opened.push(e.id); } });
  const first = state.toggle('marzo'); const second = state.toggle('racing');
  b.resolve(); await second; a.resolve(); await first;
  assert.equal(state.activeId, 'racing'); assert.deepEqual(opened, ['racing']);
});
test('viajar o alejarse cierra la vitrina mediante close()', async () => {
  const state = new RevealState({ load: async id => id });
  await state.toggle('racing'); state.close();
  assert.equal(state.status, 'closed'); assert.equal(state.activeId, null);
  assert.deepEqual([...state.discovered], ['racing']);
});
test('un error deja todo cerrado y permite reintentar', async () => {
  let attempt = 0; const errors = [];
  const state = new RevealState({ load: async () => { if (++attempt === 1) throw new Error('fallo'); return {}; }, onError: (e, id) => errors.push(id) });
  await state.toggle('ballivian');
  assert.equal(state.activeId, null); assert.equal(state.status, 'closed'); assert.deepEqual(errors, ['ballivian']);
  await state.toggle('ballivian'); assert.equal(state.status, 'open');
});
test('los descubrimientos cuentan una sola vez por escudo', async () => {
  const state = new RevealState({ load: async () => ({}) });
  for (const id of ['marzo', 'ballivian', 'racing', 'marzo']) { await state.toggle(id); state.close(); }
  assert.equal(state.discovered.size, 3);
});
test('identificadores vacíos no activan la carga', async () => {
  let calls = 0; const state = new RevealState({ load: async () => calls++ });
  await state.toggle(null); await state.toggle(''); assert.equal(calls, 0);
});
