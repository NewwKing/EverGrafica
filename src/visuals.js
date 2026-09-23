import * as THREE from 'three';
import { GALLERY, THEME } from './config.js';

const gold = () => new THREE.MeshStandardMaterial({ color: THEME.gold, emissive: 0x886020, emissiveIntensity: 0.8, metalness: 0.72, roughness: 0.28 });
const dark = () => new THREE.MeshStandardMaterial({ color: 0x101720, metalness: 0.65, roughness: 0.38 });
const mark = o => { o.userData.generated = true; return o; };
function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const o = mark(new THREE.Mesh(geometry, material));
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

export function label(text, subtext = '', color = '#f6c75c', width = 4.3) {
  const canvas = document.createElement('canvas');
  canvas.width = 768; canvas.height = 192;
  const c = canvas.getContext('2d');
  c.fillStyle = 'rgba(6,9,14,0.92)'; roundRect(c, 14, 12, 740, 164, 24);
  c.strokeStyle = 'rgba(220,230,255,0.20)'; c.lineWidth = 2; c.stroke();
  c.fillStyle = color; c.fillRect(44, 40, 4, 96);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '600 39px system-ui, sans-serif'; c.fillStyle = '#f5f3ed';
  c.fillText(text.toUpperCase(), 400, subtext ? 72 : 96, 655);
  if (subtext) {
    c.font = '500 21px system-ui, sans-serif'; c.fillStyle = '#a6b2c4';
    c.fillText(subtext.toUpperCase(), 400, 126, 650);
  }
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
  const s = mark(new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, toneMapped: false })));
  s.scale.set(width, width / 4, 1);
  return s;
}

function glow(color, size) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  const g = c.createRadialGradient(64, 64, 1, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(0.35, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const m = new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const o = mark(new THREE.Mesh(new THREE.PlaneGeometry(size, size), m));
  o.rotation.x = -Math.PI / 2;
  return o;
}

export function createStation(def, y) {
  const root = new THREE.Group();
  root.name = `estacion-${def.id}`;
  root.position.set(def.x, y, GALLERY.z);
  const base = mesh(new THREE.BoxGeometry(4.4, GALLERY.pedestalHeight, 3.8), dark(), root, 0, GALLERY.pedestalHeight / 2, 0);
  base.receiveShadow = true; base.castShadow = true;
  const trimMat = new THREE.MeshBasicMaterial({ color: def.accent, toneMapped: false });
  mesh(new THREE.BoxGeometry(4.38, 0.022, 0.025), trimMat, root, 0, GALLERY.pedestalHeight - 0.045, 1.908);
  mesh(new THREE.BoxGeometry(0.024, 0.022, 3.8), trimMat, root, -2.205, GALLERY.pedestalHeight - 0.045, 0);
  mesh(new THREE.BoxGeometry(0.024, 0.022, 3.8), trimMat, root, 2.205, GALLERY.pedestalHeight - 0.045, 0);
  const aura = glow(def.accent, 6.5); aura.position.y = 0.025; root.add(aura);
  const ringMat = new THREE.MeshStandardMaterial({ color: def.accent, emissive: def.accent, emissiveIntensity: 0.28, metalness: 0.6, roughness: 0.36 });
  const arch = mesh(new THREE.TorusGeometry(2.1, 0.026, 8, 90, Math.PI * 1.73), ringMat, root, 0, 2.25, -0.62);
  arch.rotation.z = -Math.PI * 0.365;
  const arc = mesh(new THREE.TorusGeometry(2.22, 0.013, 6, 90, Math.PI * 0.6), new THREE.MeshBasicMaterial({ color: def.accent, transparent: true, opacity: 0.32 }), root, 0, 2.25, -0.65);
  arc.rotation.z = 0.1;
  const title = label(`${def.number}   ${def.name}`, def.logo ? 'E · Revelar escudo' : def.mascot ? 'E · Conocer la pieza' : 'E · Entrar a la zona', `#${def.accent.toString(16).padStart(6, '0')}`);
  title.position.set(0, 5.0, 0); root.add(title);
  let portalDisc = null;
  if (!def.mascot) {
    portalDisc = createPortalDisc(); portalDisc.position.set(0, 2.22, 0); root.add(portalDisc);
    const word = label('ASOCIACIÓN', def.logo ? 'E · DESCUBRIR ESCUDO' : 'ACCESO A LA ZONA', '#64aeff', 3.6); word.position.set(0, 2.22, 0.12); root.add(word);
  }
  return { root, base, aura, title, arch, arc, def, model: null, cube: null, portalDisc, ready: !def.mascot, progress: 0 };
}

export function createPortalDisc() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time; varying vec2 vUv;
      void main(){vec2 p=vUv-.5; float r=length(p)*2.; float a=atan(p.y,p.x);
      float band=pow(.5+.5*sin(r*35.-time*2.+a*2.),5.);
      float edge=pow(smoothstep(.7,1.,r),2.);
      float alpha=(.055+band*.08+edge*.32)*(1.-smoothstep(.97,1.,r));
      gl_FragColor=vec4(mix(vec3(.14,.40,.85),vec3(.46,.72,1.),edge),alpha);}`,
  });
  return mark(new THREE.Mesh(new THREE.CircleGeometry(1.97, 64), mat));
}

/** El grupo completo (cristal + escudo + base + etiquetas) nace invisible. */
export function createVitrine(def, mascotFloorY) {
  const root = new THREE.Group(); root.name = `vitrina-${def.id}`;
  root.position.set(def.x + GALLERY.cubeOffsetX, mascotFloorY + 0.18, GALLERY.z);
  root.visible = false; root.scale.setScalar(0.001);
  const s = GALLERY.cubeSize;
  mesh(new THREE.BoxGeometry(s + 0.26, 0.16, s + 0.26), dark(), root, 0, 0.08, 0);
  const cage = new THREE.Group(); cage.position.y = s / 2 + 0.18; root.add(cage);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xb1d5fc, metalness: 0.02, roughness: 0.14,
    transparent: true, opacity: 0.065, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1,
  });
  mesh(new THREE.BoxGeometry(s, s, s), glassMat, cage);
  const edgeMat = gold();
  for (const x of [-s / 2, s / 2]) for (const z of [-s / 2, s / 2]) mesh(new THREE.BoxGeometry(0.025, s, 0.025), edgeMat, cage, x, 0, z);
  for (const y of [-s / 2, s / 2]) for (const z of [-s / 2, s / 2]) mesh(new THREE.BoxGeometry(s, 0.025, 0.025), edgeMat, cage, 0, y, z);
  for (const x of [-s / 2, s / 2]) for (const y of [-s / 2, s / 2]) mesh(new THREE.BoxGeometry(0.025, 0.025, s), edgeMat, cage, x, y, 0);
  const cornerMat = new THREE.MeshBasicMaterial({ color: THEME.gold, toneMapped: false });
  for (const x of [-s / 2, s / 2]) for (const y of [-s / 2, s / 2]) for (const z of [-s / 2, s / 2]) mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), cornerMat, cage, x, y, z);
  const halo = glow(def.accent, s * 1.5); halo.position.y = 0.19; root.add(halo);
  const scanner = mesh(new THREE.PlaneGeometry(s - 0.12, s - 0.12), new THREE.MeshBasicMaterial({ color: 0x67b7ff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), root, 0, 0.3, 0);
  scanner.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.position.y = 0.48; root.add(holder);
  const caption = label('ESCUDO REVELADO', def.name, '#f6c75c', 3.1);
  caption.position.set(0, s + 0.86, 0); root.add(caption);
  return { root, holder, scanner, cage, halo, elapsed: 0, yaw: def.logoYaw || 0, rotate: true, attached: false };
}

export function createPathway(groundAt) {
  const root = new THREE.Group(); root.name = 'paseo-lineal';
  const mat = new THREE.MeshStandardMaterial({ color: 0x0c121d, roughness: 0.48, metalness: 0.36 });
  // Suelo fino sin alterar ni tapar toda la cancha original.
  for (let i = -32; i <= 32; i += 4) {
    const y = groundAt(i, GALLERY.z + 4.4);
    const tile = mesh(new THREE.BoxGeometry(3.94, 0.035, 2.8), mat, root, i, y + 0.035, GALLERY.z + 4.4);
    tile.receiveShadow = true;
    const lineMat = new THREE.MeshBasicMaterial({ color: THEME.gold, transparent: true, opacity: 0.6 });
    mesh(new THREE.BoxGeometry(2.4, 0.007, 0.035), lineMat, root, i, y + 0.059, GALLERY.z + 5.85);
    mesh(new THREE.BoxGeometry(0.42, 0.008, 0.035), new THREE.MeshBasicMaterial({ color: THEME.blue, transparent: true, opacity: 0.4 }), root, i, y + 0.06, GALLERY.z + 2.98);
  }
  return root;
}

export function createParticles() {
  const count = 140;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  // Semilla fija: la composición no cambia al recargar.
  let seed = 92317;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < count; i++) {
    positions.set([(random() - 0.5) * 70, 0.6 + random() * 8, (random() - 0.5) * 15], i * 3);
    phases[i] = random() * 6.28;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pixelRatio: { value: 1 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time; uniform float pixelRatio; attribute float phase; varying float alpha;
      void main(){vec3 p=position;p.y+=sin(time*.3+phase)*.5;p.x+=sin(time*.17+phase)*.22;
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      gl_PointSize=clamp(42./max(3.,-mv.z),1.2,3.)*pixelRatio;alpha=.16+sin(time*.7+phase)*.1;}`,
    fragmentShader: `varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(1.,.81,.42,alpha*(1.-smoothstep(.1,.5,d)));}`,
  });
  return mark(new THREE.Points(geo, mat));
}

export function updateStation(s, time, dt, near, reducedMotion) {
  const target = near ? 1.7 : 0.45;
  s.arch.material.emissiveIntensity += (target - s.arch.material.emissiveIntensity) * (1 - Math.exp(-5 * dt));
  s.aura.material.opacity += ((near ? 0.8 : 0.32) - s.aura.material.opacity) * (1 - Math.exp(-4 * dt));
  if (!reducedMotion) s.arc.rotation.z = time * 0.075 + s.def.x * 0.08;
  if (s.portalDisc) s.portalDisc.material.uniforms.time.value = reducedMotion ? 0 : time;
  if (!s.cube?.root.visible) return;
  const c = s.cube; c.elapsed += dt;
  const t = reducedMotion ? 1 : Math.min(c.elapsed / 0.65, 1);
  const eased = 1 - (1 - t) ** 3;
  c.root.scale.set(0.85 + 0.15 * eased, Math.max(0.001, eased), 0.85 + 0.15 * eased);
  if (!reducedMotion) {
    if (c.rotate) {
      c.motionTime = (c.motionTime || 0) + dt;
      c.holder.rotation.y = c.yaw + Math.sin(c.motionTime * 0.42) * 0.37;
      c.holder.position.y = 0.48 + Math.sin(c.motionTime * 1.25) * 0.07;
    }
    c.scanner.position.y = 0.24 + ((time * 0.55) % (GALLERY.cubeSize - 0.12));
  }
}

/** Cartel del lugar. El logo se usa tal como fue proporcionado, sin redibujarlo. */
export function createIdentityBanner(floorY) {
  const root = new THREE.Group(); root.name = 'identidad-fortin';
  root.position.set(0, floorY + 9.3, GALLERY.z - 5.5);
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 340;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const logo = new Image();
  function paint() {
    ctx.clearRect(0, 0, 1600, 340);
    const bg = ctx.createLinearGradient(0, 0, 1600, 340); bg.addColorStop(0, '#101820'); bg.addColorStop(1, '#07090d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1600, 340);
    ctx.strokeStyle = '#d0a347'; ctx.lineWidth = 3; ctx.strokeRect(7, 7, 1586, 326);
    if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, 62, 42, 236, 256);
    ctx.fillStyle = '#f6c75c'; ctx.font = '500 25px system-ui'; ctx.fillText('CANCHA MEDIA  /  EXPERIENCIA 3D', 365, 98);
    ctx.fillStyle = '#f3f2ed'; ctx.font = '650 88px system-ui'; ctx.fillText('EL FORTÍN MINERO', 356, 199, 1175);
    ctx.fillStyle = '#9aaac0'; ctx.font = '500 26px system-ui'; ctx.fillText('FÚTBOL  ·  IDENTIDAD  ·  PASIÓN', 365, 264);
    texture.needsUpdate = true;
  }
  paint(); logo.onload = paint; logo.src = './assets/logo-afll.png';
  const panel = mesh(new THREE.PlaneGeometry(14.5, 3.08), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), root);
  panel.renderOrder = 0;
  return root;
}
