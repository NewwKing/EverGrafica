import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Soundtrack, formatTime } from '../src/audio-core.js';
import { boundedVolume, validDiscoveries } from '../src/preferences.js';
class FakeAudio extends EventTarget {
  constructor() { super(); this.paused=true; this.volume=1; this.muted=false; this.duration=209; this.currentTime=0; this.plays=0; }
  async play() { this.plays++; this.paused=false; this.dispatchEvent(new Event('playing')); }
  pause() { this.paused=true; this.dispatchEvent(new Event('pause')); }
}
test('la música no se reproduce al cargar el documento', () => {
  const a=new FakeAudio(); const p=new Soundtrack(a); assert.equal(a.plays,0); assert.equal(a.paused,true); assert.equal(p.desired,false); assert.equal(a.loop,true);
});
test('play y pausa reutilizan el mismo audio conservando la posición', async () => {
  const a=new FakeAudio(); const p=new Soundtrack(a); await p.play(); p.seek(42); p.pause(); await p.play(); assert.equal(a.currentTime,42); assert.equal(a.plays,2); assert.equal(a.paused,false);
});
test('ocultar pestaña pausa, volver reanuda sólo si el usuario estaba escuchando', async () => {
  const a=new FakeAudio(); const p=new Soundtrack(a); await p.play(); p.setHidden(true); assert.equal(a.paused,true); assert.equal(p.desired,true); await p.setHidden(false); assert.equal(a.paused,false);
  p.pause(); p.setHidden(true); await p.setHidden(false); assert.equal(a.paused,true);
});
test('un play pendiente no vuelve a sonar tras pausar', async () => {
  const a=new FakeAudio(); let release; a.play=()=>new Promise(resolve=>{ release=()=>{a.paused=false;resolve();}; }); const p=new Soundtrack(a); const pending=p.play(); p.pause(); release(); await pending; assert.equal(a.paused,true); assert.equal(p.desired,false);
});
test('un rechazo de autoplay se captura sin bloquear el resto de la página', async () => {
  const a=new FakeAudio(); a.play=async()=>{const e=new Error('blocked');e.name='NotAllowedError';throw e;};let msg='';const p=new Soundtrack(a,{onError:m=>msg=m});await p.play(); assert.match(msg,/Toca reproducir/); assert.equal(p.desired,false);
});
test('volumen y posición se mantienen en su rango válido', () => {
  const a=new FakeAudio();const p=new Soundtrack(a,{volume:20});assert.equal(a.volume,1);p.setVolume(-2);assert.equal(a.volume,0);p.seek(999);assert.equal(a.currentTime,209);p.seek(-30);assert.equal(a.currentTime,0);p.setMuted(true);assert.equal(a.muted,true);
});
test('preferencias defectuosas no crean escudos ni volumen inválido', () => {
  assert.equal(boundedVolume(NaN),.32);assert.equal(boundedVolume('0.9'),.32);assert.deepEqual(validDiscoveries(['marzo','marzo','fantasma',5],['marzo','racing']),['marzo']);assert.deepEqual(validDiscoveries(null,['marzo']),[]);
});
test('tiempos legibles sin segundos fuera de rango', () => {
  assert.equal(formatTime(209.1),'3:29');assert.equal(formatTime(0),'0:00');assert.equal(formatTime(NaN),'—:—');
});

test('las preferencias se guardan sin peticiones de red', async () => {
  const { readPreference, writePreference } = await import('../src/preferences.js');
  const cache = new Map();
  globalThis.localStorage = { getItem:key=>cache.get(key) ?? null, setItem:(key,value)=>cache.set(key,value) };
  assert.equal(writePreference('volume',.17),true);
  assert.equal(readPreference('volume',.32),.17);
  writePreference('discoveries',['marzo','asociacion']);
  assert.deepEqual(readPreference('discoveries',[]),['marzo','asociacion']);
  globalThis.localStorage = { getItem:()=>{throw new Error('blocked');}, setItem:()=>{throw new Error('blocked');} };
  assert.equal(readPreference('volume',.32),.32);assert.equal(writePreference('volume',.17),false);
  delete globalThis.localStorage;
});

test('buscar una posición NaN no rompe el reproductor', () => {
  const a=new FakeAudio();const p=new Soundtrack(a);p.seek(NaN);assert.equal(a.currentTime,0);
});
