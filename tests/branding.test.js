import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const base=new URL('../',import.meta.url);
const text=p=>fs.readFileSync(new URL(p,base),'utf8');

test('la marca, el icono y el logo original están referenciados',()=>{
  const html=text('index.html');assert.match(html,/<title>El Fortín Minero/);assert.match(html,/assets\/logo-afll\.png/);assert.match(html,/assets\/favicon\.ico/);
});
test('sólo hay un elemento audio y dos opciones de entrada',()=>{
  const html=text('index.html');assert.equal((html.match(/<audio\s/g)||[]).length,1);assert.match(html,/id="enterExperience"/);assert.match(html,/id="enterSilent"/);assert.ok(!/<audio[^>]*autoplay/.test(html));
});
test('modelos, logo y música original coinciden con el manifiesto',()=>{
  const map=JSON.parse(text('ASSET-MAP.json'));for(const item of [...map.models,map.logo,map.audio]){
    assert.equal(createHash('sha256').update(fs.readFileSync(new URL(item.project,base))).digest('hex'),item.sha256,item.project);
  }
});
test('todos los identificadores HTML son únicos',()=>{
  const ids=[...text('index.html').matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});
