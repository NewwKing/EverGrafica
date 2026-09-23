import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GALLERY, STATIONS, WORLDS } from '../src/config.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('CanchaMedia sigue siendo el escenario principal', () => {
  assert.equal(WORLDS.hub.file, './models/CanchaMedia.glb');
});
test('cinco estaciones ordenadas y separadas uniformemente en una sola fila', () => {
  assert.equal(STATIONS.length, 5); assert.equal(GALLERY.z, 0);
  const x = STATIONS.map(s => s.x);
  for (let i = 1; i < x.length; i++) assert.equal(x[i] - x[i - 1], GALLERY.spacing);
  const source = fs.readFileSync(path.join(root, 'src/visuals.js'), 'utf8');
  assert.match(source, /root\.position\.set\(def\.x, y, GALLERY\.z\)/);
});
test('los cuatro escudos corresponden a sus mascotas explícitas', () => {
  assert.deepEqual(STATIONS.filter(s => s.logo).map(s => [s.id, s.mascot, s.logo]), [
    ['marzo', './models/mascota-23-marzo.glb', './models/logo-23-marzo.glb'],
    ['ballivian', './models/mascota-ballivian.glb', './models/logo-ballivian.glb'],
    ['racing', './models/mascota-racing.glb', './models/logo-racing.glb'],
    ['asociacion', null, './models/logo-asociacion.glb'],
  ]);
});
test('Serrafín queda independiente; Asociación utiliza su nuevo escudo', () => {
  assert.equal(STATIONS.find(s => s.id === 'serrafin').logo, null);
  assert.equal(STATIONS.find(s => s.id === 'asociacion').logo, './models/logo-asociacion.glb');
});
test('todas las rutas de modelos existen y son GLB 2.0 íntegros y autocontenidos', () => {
  const urls = new Set([...Object.values(WORLDS).map(w => w.file), ...STATIONS.flatMap(s => [s.mascot, s.logo]).filter(Boolean)]);
  assert.equal(urls.size, 13);
  for (const url of urls) {
    const buf = fs.readFileSync(path.join(root, url));
    assert.equal(buf.toString('ascii', 0, 4), 'glTF', url);
    assert.equal(buf.readUInt32LE(4), 2, url);
    assert.equal(buf.readUInt32LE(8), buf.length, url);
    assert.equal(buf.readUInt32LE(16), 0x4E4F534A, url);
    const json = JSON.parse(buf.toString('utf8', 20, 20 + buf.readUInt32LE(12)));
    for (const obj of [...(json.images || []), ...(json.buffers || [])]) {
      assert.ok(!obj.uri || obj.uri.startsWith('data:'), `Recurso externo ausente en ${url}: ${obj.uri}`);
    }
  }
});
test('todas las miniaturas de mascotas existen', () => {
  for (const s of STATIONS.filter(s => s.mascot)) assert.ok(fs.statSync(path.join(root, `assets/${s.id}.webp`)).size > 1000);
});
test('la vitrina completa nace invisible y sólo la apertura validada la muestra', () => {
  const v = fs.readFileSync(path.join(root, 'src/visuals.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.match(v, /root\.visible = false/);
  assert.match(main, /if \(state\.status === 'open'\)/);
  assert.equal((main.match(/root\.visible = true/g) || []).length, 1);
  assert.match(main, /loadAsset\(station\.def\.logo\)/);
});
test('las teclas repetidas no alternan la vitrina por cada frame', () => {
  const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  assert.ok(main.indexOf('if (e.repeat) return;') < main.indexOf("if (e.code === 'KeyE')"));
});
