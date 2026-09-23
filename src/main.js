import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GALLERY, STATIONS, WORLDS, THEME } from './config.js';
import { loadAsset, fitModel, prepareMaterials, disposeGenerated } from './assets.js';
import { createStation, createVitrine, createPathway, createParticles, updateStation, createPortalDisc, label } from './visuals.js';
import { RevealState } from './reveal-state.js';
import { Player } from './player.js';
import { chime } from './media.js';
import { readPreference, writePreference, validDiscoveries } from './preferences.js';
import { createIdentityBanner } from './visuals.js';

const $ = id => document.getElementById(id);
const coarse = matchMedia('(pointer: coarse)').matches;
let reduced = readPreference('reducedMotion', matchMedia('(prefers-reduced-motion: reduce)').matches) === true;
document.body.classList.toggle('reduce-motion', reduced);
$('motionToggle').checked = reduced;
const scene = new THREE.Scene();
scene.background = new THREE.Color(THEME.background);
scene.fog = new THREE.FogExp2(0x0a101a, 0.0036);
const camera = new THREE.PerspectiveCamera(59, innerWidth / innerHeight, 0.09, 600);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.09;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
renderer.domElement.setAttribute('aria-label', 'Cancha Media: arrastra para mirar o haz clic para controlar el ratón.');
renderer.domElement.tabIndex = 0;
$('app').append(renderer.domElement);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.26, 0.35, 0.93);
composer.addPass(bloom);
composer.addPass(new OutputPass()); 
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xbcdcff, 0x20190e, 1.8));
const sun = new THREE.DirectionalLight(0xffefce, 2.5);
sun.position.set(18, 52, 38); sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { near: 1, far: 160, left: -72, right: 72, top: 65, bottom: -65 });
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.045;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x66aaff, 1.1); rim.position.set(-25, 24, -30); scene.add(rim);
const front = new THREE.DirectionalLight(0xf0e7d4, 0.5); front.position.set(0, 10, 30); scene.add(front);

const worldRoot = new THREE.Group();
const galleryRoot = new THREE.Group();
const temporaryRoot = new THREE.Group();
scene.add(worldRoot, galleryRoot, temporaryRoot);
const particles = createParticles(); galleryRoot.add(particles);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enabled = false; orbit.enableDamping = true; orbit.dampingFactor = 0.065;
orbit.enablePan = false; orbit.minDistance = 10; orbit.maxDistance = 210;
orbit.minPolarAngle = 0.12; orbit.maxPolarAngle = Math.PI / 2.13;
const player = new Player(camera);
const ray = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);
const pointerForward = new THREE.Vector3();
const candidateVector = new THREE.Vector3();
const groundNormal = new THREE.Vector3();
const stationMap = new Map();
const worldCache = new Map();
const groundCache = new Map();
const clock = new THREE.Clock();
let worldId = 'hub';
let current = null;
let started = false;
let ready = false;
let transitioning = false;
let highQuality = readPreference('highQuality', !coarse) === true;
let overview = false;
let director = null;
let candidate = null;
let displayedCandidate = '';
let panelStationId = null;
let activeModal = document.querySelector('.modal-backdrop.open');
let auxiliaryOpen = $('audioModal').classList.contains('open');
let completeAnnounced = false;
let completeTimer;
let modalReturnFocus = null;
let returnPortal = null;
let frameCount = 0;
let toastTimer;
let lookPointer = null;
let lastLookX = 0, lastLookY = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4200);
}
function setBoot(progress, message) {
  const p = Math.round(Math.max(0, Math.min(100, progress)));
  $('bootProgress').style.width = `${p}%`;
  $('bootPercent').textContent = `${p}%`;
  document.querySelector('.boot-progress').setAttribute('aria-valuenow', String(p));
  if ($('bootStatus').textContent !== message) $('bootStatus').textContent = message;
}
function setQuality(high, announce = false) {
  highQuality = high;
  const ratio = Math.min(devicePixelRatio || 1, high ? 1.4 : 0.85);
  renderer.setPixelRatio(ratio);
  composer.setPixelRatio(ratio);
  renderer.shadowMap.enabled = high;
  bloom.enabled = high;
  particles.visible = high;
  particles.material.uniforms.pixelRatio.value = ratio;
  $('qualityButton').textContent = high ? 'HQ' : 'LQ';
  $('qualityButton').title = high ? 'Calidad alta · Cambiar a ligera' : 'Calidad ligera · Cambiar a alta';
  if (announce) writePreference('highQuality', high);
  if (announce) toast(high ? 'Calidad alta: sombras y brillo activados.' : 'Calidad ligera: menos resolución, sin sombras ni bloom.');
}
setQuality(highQuality);

async function fetchWorld(id, onProgress) {
  if (!worldCache.has(id)) {
    const job = (async () => {
      const gltf = await loadAsset(WORLDS[id].file, onProgress);
      const object = gltf.scene;
      prepareMaterials(object);
      object.updateMatrixWorld(true);
      let bounds = new THREE.Box3().setFromObject(object);
      if (id !== 'hub') {
        // Plataforma de seguridad para los accesos heredados de V1.
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const floor = new THREE.Mesh(new THREE.BoxGeometry(size.x + 22, 0.25, size.z + 22), new THREE.MeshStandardMaterial({ color: 0x182331, roughness: 0.82 }));
        floor.position.set(center.x, bounds.min.y - 0.23, center.z);
        floor.receiveShadow = true; object.add(floor); object.updateMatrixWorld(true);
        bounds = new THREE.Box3().setFromObject(object);
      }
      const octree = new Octree().fromGraphNode(object);
      return { object, octree, bounds };
    })().catch(error => { worldCache.delete(id); throw error; });
    worldCache.set(id, job);
  }
  return worldCache.get(id);
}
function groundAt(x, z, fallback) {
  if (!current) return fallback ?? 0;
  const key = `${x.toFixed(3)},${z.toFixed(3)}`;
  if (groundCache.has(key)) return groundCache.get(key);
  ray.set(new THREE.Vector3(x, current.bounds.max.y + 5, z), down);
  ray.far = current.bounds.max.y - current.bounds.min.y + 30;
  const hits = ray.intersectObject(current.object, true);
  const hit = hits.find(h => {
    if (!h.face) return false;
    groundNormal.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    return Math.abs(groundNormal.y) > 0.45;
  });
  const y = hit ? hit.point.y : (fallback ?? current.bounds.min.y);
  groundCache.set(key, y);
  return y;
}
function setCurrentWorld(id, data) {
  if (current) current.object.removeFromParent();
  worldId = id; current = data; groundCache.clear();
  worldRoot.add(data.object); data.object.updateMatrixWorld(true);
  player.octree = data.octree; player.minY = data.bounds.min.y - 15;
  galleryRoot.visible = id === 'hub';
  while (temporaryRoot.children.length) disposeGenerated(temporaryRoot.children[0]);
  returnPortal = null;
  player.blockers = id === 'hub' ? STATIONS.filter(s => s.mascot).map(s => ({ x: s.x, y: groundAt(s.x, GALLERY.z), z: GALLERY.z, radius: s.id === 'racing' ? 1.65 : 1.25, height: s.height + 0.3 })) : [];
  if (id === 'hub') {
    player.spawn.set(0, groundAt(0, GALLERY.z + 9) + 0.09, GALLERY.z + 9);
  } else {
    const c = data.bounds.getCenter(new THREE.Vector3());
    player.spawn.set(c.x, groundAt(c.x, c.z) + 0.09, c.z);
    createReturnPortal(c);
  }
  player.teleport(player.spawn, new THREE.Vector3(player.spawn.x, player.spawn.y + 1.55, player.spawn.z - 6));
  $('locationName').textContent = WORLDS[id].name.toUpperCase();
  $('sceneTitle').textContent = id === 'hub' ? 'Donde la pasión cobra vida.' : WORLDS[id].name;
  $('sceneSubtitle').innerHTML = id === 'hub' ? 'Acércate a una mascota y pulsa <kbd>E</kbd>.' : 'Explora la zona. El portal azul te lleva de vuelta al paseo.';
  $('homeButton').classList.toggle('active', id === 'hub');
  $('zonesButton').classList.toggle('active', id !== 'hub');
  document.body.classList.toggle('away', id !== 'hub');
}
function createReturnPortal(center) {
  const x = center.x + 7, z = center.z;
  const root = new THREE.Group(); root.position.set(x, groundAt(x, z) + 2.1, z);
  const portal = createPortalDisc(); root.add(portal);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(2.06, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: THEME.blue }));
  frame.userData.generated = true; root.add(frame);
  const title = label('VOLVER AL PASEO', 'E · CANCHA MEDIA', '#64aeff', 4.8); title.position.y = 2.8; root.add(title);
  temporaryRoot.add(root); returnPortal = { root, portal };
}
async function loadMascot(station, onProgress) {
  if (station.ready) return;
  if (station.loadingPromise) return station.loadingPromise;
  station.loadingPromise = (async () => {
    const gltf = await loadAsset(station.def.mascot, onProgress);
    const fit = fitModel(gltf, station.def.height);
    fit.object.position.y = GALLERY.pedestalHeight;
    fit.object.rotation.y = station.def.yaw;
    if (station.def.id === 'serrafin') {
      // El busto es muy denso: conserva su detalle, pero no repite su dibujo en el mapa de sombras.
      fit.object.traverse(o => { if (o.isMesh) o.castShadow = false; });
    }
    station.root.add(fit.object); station.model = fit.object; station.ready = true;
  })().catch(error => {
    station.loadingPromise = null;
    console.warn(`No se pudo cargar la mascota ${station.def.name}:`, error);
    throw error;
  });
  return station.loadingPromise;
}
function buildGallery() {
  for (const def of STATIONS) {
    const y = groundAt(def.x, GALLERY.z);
    const station = createStation(def, y);
    galleryRoot.add(station.root);
    if (def.logo) {
      station.cube = createVitrine(def, y);
      galleryRoot.add(station.cube.root);
    }
    stationMap.set(def.id, station);
  }
  galleryRoot.add(createPathway(groundAt));
  galleryRoot.add(createIdentityBanner(groundAt(0, GALLERY.z)));
  particles.position.y = groundAt(0, GALLERY.z);
}

const reveal = new RevealState({
  load: async id => {
    const station = stationMap.get(id);
    if (!station?.def.logo) throw new Error('La estación no tiene escudo asociado.');
    if (station.cube.attached) return station.cube;
    const gltf = await loadAsset(station.def.logo);
    const fit = fitModel(gltf, 1.96, 2.0, 1.25);
    // La respuesta puede llegar después de cerrar: el cubo sigue invisible.
    if (!station.cube.attached) {
      station.cube.holder.add(fit.object);
      station.cube.attached = true;
    }
    return station.cube;
  },
  onChange: state => {
    // Exclusividad estricta: sólo la vitrina de la mascota activada se ve.
    for (const s of stationMap.values()) if (s.cube) s.cube.root.visible = false;
    if (state.status === 'closed') { hideInfo(); return; }
    const s = stationMap.get(state.id);
    showInfo(s, state.status === 'loading');
    if (state.status === 'open') {
      const c = s.cube;
      c.elapsed = 0; c.root.scale.setScalar(0.001); c.root.visible = true;
      c.holder.rotation.y = c.yaw;
      updateDiscoveries(); chime();
      // Orientación hacia la pareja completa, sin mover al jugador a través del suelo.
      if (!reduced) aimAt(new THREE.Vector3(s.def.x + (camera.aspect < 0.85 ? 3.1 : 2.15), s.root.position.y + 2.1, GALLERY.z));
    }
  },
  onError: (_error, id) => toast(`No se pudo cargar el escudo de ${stationMap.get(id)?.def.name || id}. Pulsa E para reintentar.`),
});
function showInfo(station, loading = false) {
  if (!station) return;
  const def = station.def; panelStationId = def.id;
  document.body.classList.add('info-open');
  $('infoPanel').dataset.hasLogo = String(Boolean(def.logo));
  if (document.pointerLockElement) document.exitPointerLock();
  $('panelKicker').textContent = def.logo ? (loading ? 'PREPARANDO VITRINA' : 'VITRINA ABIERTA') : 'PIEZA DEL PASEO';
  $('panelNumber').textContent = `ESTACIÓN ${def.number}`;
  $('infoTitle').textContent = def.name;
  $('panelPortrait').src = def.id === 'asociacion' ? './assets/logo-afll.png' : `./assets/${def.id}.webp`;
  $('panelPortrait').hidden = !def.mascot && def.id !== 'asociacion';
  $('infoDescription').textContent = def.description || 'Todavía no hay una descripción para este modelo.';
  $('logoStatus').hidden = !def.logo;
  $('logoStatus').querySelector('span').textContent = loading ? 'Cargando el escudo… Puedes cerrar con E.' : 'Escudo original · Modelo 3D';
  $('visitZone').hidden = !def.world;
  $('rotationButton').hidden = !def.logo || loading;
  $('rotationButton').textContent = station.cube?.rotate ? 'Pausar movimiento del escudo  Ⅱ' : 'Animar escudo  ▷';
  document.querySelector('.panel-foot span').textContent = def.logo ? 'Ocultar vitrina. Al alejarte también se cierra.' : 'Cerrar esta ficha.';
  $('infoPanel').inert = false; $('infoPanel').setAttribute('aria-hidden', 'false'); $('infoPanel').classList.add('open');
}
function hideInfo() {
  if (started && $('infoPanel').contains(document.activeElement)) renderer.domElement.focus({ preventScroll: true });
  document.body.classList.remove('info-open');
  panelStationId = null;
  $('infoPanel').classList.remove('open'); $('infoPanel').setAttribute('aria-hidden', 'true'); $('infoPanel').inert = true;
}
function closeVitrine() { reveal.close(); }
function updateDiscoveries(announce = true) {
  const ids = STATIONS.filter(s => s.logo).map(s => s.id);
  const discovered = [...reveal.discovered];
  $('discoveryCount').textContent = String(discovered.length);
  for (const id of ids) {
    const found = reveal.discovered.has(id);
    document.querySelector(`[data-discovery="${id}"]`)?.classList.toggle('found', found);
    document.querySelector(`[data-station="${id}"]`)?.classList.toggle('discovered', found);
  }
  $('discoveryDots').setAttribute('aria-label', `${discovered.length} de ${ids.length} escudos descubiertos`);
  writePreference('discoveries', discovered);
  if (announce && discovered.length === ids.length && !completeAnnounced) {
    completeAnnounced = true; $('completionToast').hidden = false;
    clearTimeout(completeTimer); completeTimer = setTimeout(() => $('completionToast').hidden = true, 6500);
  }
}

function aimAt(target) {
  if (director || overview || transitioning) return;
  const start = camera.quaternion.clone();
  camera.lookAt(target); const end = camera.quaternion.clone(); camera.quaternion.copy(start);
  director = { elapsed: 0, duration: 0.5, start: camera.position.clone(), end: camera.position.clone(), qStart: start, qEnd: end, onDone: null, aimOnly: true };
  player.clear();
}
function moveCamera(position, target, duration, onDone) {
  const start = camera.position.clone(), qStart = camera.quaternion.clone();
  camera.position.copy(position); camera.lookAt(target);
  const qEnd = camera.quaternion.clone();
  camera.position.copy(start); camera.quaternion.copy(qStart);
  director = { elapsed: 0, duration: reduced ? 0.01 : duration, start, end: position.clone(), qStart, qEnd, onDone };
  player.clear();
}
function animateDirector(dt) {
  if (!director) return;
  const d = director; d.elapsed += dt;
  const t = Math.min(1, d.elapsed / d.duration);
  const eased = t * t * (3 - 2 * t);
  camera.position.lerpVectors(d.start, d.end, eased);
  camera.quaternion.slerpQuaternions(d.qStart, d.qEnd, eased);
  if (t === 1) { director = null; d.onDone?.(); }
}
async function goToStation(id) {
  if (!started || transitioning) return;
  closeVitrine(); closeModal();
  if (worldId !== 'hub') { await travelTo('hub'); if (worldId !== 'hub') return; }
  const s = stationMap.get(id); if (!s) return;
  if (!s.ready && s.def.mascot) loadMascot(s).catch(() => toast(`No se pudo cargar ${s.def.name}. Comprueba los archivos del proyecto.`));
  setOverviewState(false);
  const target = new THREE.Vector3(s.def.x + (s.def.logo ? 0.9 : 0), s.root.position.y + 2.0, GALLERY.z);
  const feet = new THREE.Vector3(s.def.x + (s.def.logo ? 0.5 : 0), groundAt(s.def.x, GALLERY.z + 5.45) + 0.09, GALLERY.z + 5.45);
  const from = camera.position.clone(); const q = camera.quaternion.clone();
  player.teleport(feet, target);
  const end = camera.position.clone(); camera.position.copy(from); camera.quaternion.copy(q);
  moveCamera(end, target, 0.7);
  document.querySelectorAll('[data-station]').forEach(b => b.classList.toggle('active', b.dataset.station === id));
}
function setOverviewState(value) {
  overview = value; orbit.enabled = value && started;
  document.body.classList.toggle('overview', value);
  $('viewButton').innerHTML = value ? 'Volver a caminar <kbd>V</kbd>' : 'Vista general <kbd>V</kbd>';
  $('modeLabel').textContent = value ? 'VISTA GENERAL' : 'EXPLORACIÓN LIBRE';
  $('walkStatusText').textContent = value ? 'Arrastra para girar la cámara.' : 'Tú eliges el recorrido.';
}
function overviewTarget() {
  if (worldId === 'hub') {
    const y = groundAt(0, GALLERY.z);
    const distance = Math.max(39, 32 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    return { position: new THREE.Vector3(3, y + 2 + distance * 0.36, GALLERY.z + distance), target: new THREE.Vector3(0, y + 2, GALLERY.z) };
  }
  const c = current.bounds.getCenter(new THREE.Vector3());
  const size = current.bounds.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.z) * 0.78;
  return { position: c.clone().add(new THREE.Vector3(distance * 0.25, distance * 0.75, distance)), target: c };
}
function toggleOverview() {
  if (!started || transitioning || activeModal || auxiliaryOpen) return;
  closeVitrine(); player.clear(); director = null;
  if (!overview) {
    if (document.pointerLockElement) document.exitPointerLock();
    const view = overviewTarget();
    setOverviewState(true); orbit.target.copy(view.target);
    moveCamera(view.position, view.target, 0.95, () => orbit.update());
  } else {
    setOverviewState(false);
    const target = player.collider.end.clone().add(new THREE.Vector3(0, 0, -6));
    moveCamera(player.collider.end, target, 0.8);
  }
}
async function travelTo(id) {
  if (!started || transitioning || !WORLDS[id]) return;
  closeModal(); closeVitrine();
  if (id === worldId) return;
  transitioning = true; director = null; player.clear(); setOverviewState(false);
  if (document.pointerLockElement) document.exitPointerLock();
  $('transitionName').textContent = WORLDS[id].name;
  $('transitionStatus').textContent = 'Cargando la zona…';
  $('transition').classList.add('active'); $('transition').setAttribute('aria-hidden', 'false');
  try {
    await sleep(reduced ? 0 : 320);
    const next = await fetchWorld(id, fraction => { $('transitionStatus').textContent = `Cargando modelo… ${Math.round(fraction * 100)}%`; });
    setCurrentWorld(id, next);
    candidate = null;
    await sleep(reduced ? 0 : 150);
  } catch (error) {
    console.error('No se pudo visitar la zona:', error);
    toast(`No se pudo cargar ${WORLDS[id].name}. Permaneces en ${WORLDS[worldId].name}.`);
  } finally {
    $('transition').classList.remove('active'); $('transition').setAttribute('aria-hidden', 'true'); transitioning = false;
  }
}

function updateInteraction() {
  candidate = null;
  camera.getWorldDirection(pointerForward);
  if (!overview && !director && !activeModal && !auxiliaryOpen && !transitioning) {
    if (worldId === 'hub') {
      let nearest = GALLERY.interactionRadius;
      for (const s of stationMap.values()) {
        candidateVector.set(s.def.x, s.root.position.y + 1.75, GALLERY.z).sub(camera.position);
        const horizontal = Math.hypot(candidateVector.x, candidateVector.z);
        const facing = candidateVector.normalize().dot(pointerForward);
        if (horizontal < nearest && facing > 0.32 && s.ready) { nearest = horizontal; candidate = s; }
      }
    } else if (returnPortal && camera.position.distanceTo(returnPortal.root.position) < 6) candidate = { return: true };
  }
  if (worldId === 'hub' && reveal.activeId) {
    const s = stationMap.get(reveal.activeId);
    if (Math.hypot(player.collider.end.x - s.def.x, player.collider.end.z - GALLERY.z) > GALLERY.hideDistance) closeVitrine();
  }
  if (panelStationId && !reveal.activeId) {
    const s = stationMap.get(panelStationId);
    if (s && Math.hypot(player.collider.end.x - s.def.x, player.collider.end.z - GALLERY.z) > GALLERY.hideDistance) hideInfo();
  }
  const id = candidate?.return ? 'return' : candidate?.def.id || '';
  const status = `${id}:${reveal.status}:${reveal.activeId}:${panelStationId}`;
  if (status !== displayedCandidate) {
    displayedCandidate = status;
    let title = '', eyebrow = 'MASCOTA';
    if (reveal.activeId || panelStationId) { title = reveal.status === 'loading' ? 'Cancelar apertura' : 'Ocultar vitrina / ficha'; eyebrow = 'INTERACCIÓN ACTIVA'; }
    else if (candidate?.return) { title = 'Volver a Cancha Media'; eyebrow = 'PORTAL'; }
    else if (candidate) {
      const d = candidate.def;
      eyebrow = `${d.number} / ${d.name.toUpperCase()}`;
      title = d.logo ? 'Revelar escudo' : d.mascot ? 'Conocer esta pieza' : 'Entrar a Asociación';
    }
    $('interactionText').textContent = title;
    $('interactionEyebrow').textContent = eyebrow;
    $('interactionPrompt').classList.toggle('show', Boolean(title) && !overview && !activeModal && !auxiliaryOpen);
    $('crosshair').classList.toggle('near', Boolean(candidate));
    document.querySelectorAll('[data-station]').forEach(b => b.classList.toggle('active', b.dataset.station === id));
  }
}
function interact() {
  if (!started || transitioning || overview || activeModal || auxiliaryOpen || director) return;
  if (reveal.activeId) { reveal.close(); return; }
  if (panelStationId) { hideInfo(); return; }
  updateInteraction();
  if (candidate?.return) { travelTo('hub'); return; }
  if (!candidate) { toast('Acércate a una mascota y mírala para interactuar.'); return; }
  const s = candidate;
  if (s.def.logo) reveal.toggle(s.def.id);
  else if (!s.def.mascot && s.def.world) travelTo(s.def.world);
  else showInfo(s);
}
function buildNavigation() {
  for (const d of STATIONS) {
    const b = document.createElement('button'); b.className = 'station-btn'; b.dataset.station = d.id;
    b.title = `Ir a ${d.name} · Tecla ${Number(d.number)}`;
    b.innerHTML = `${d.mascot ? `<img src="./assets/${d.id}.webp" alt="" width="36" height="48">` : '<span class="station-symbol" aria-hidden="true">◇</span>'}<span><small>${d.number}</small><strong>${d.short}</strong></span><i class="found-indicator"></i>`;
    b.addEventListener('click', () => goToStation(d.id)); $('stationNav').append(b);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(16 + (d.x + 24) / 48 * 128)); circle.setAttribute('cy', '19'); circle.setAttribute('r', '3'); circle.setAttribute('fill', d.accent === THEME.blue ? '#64aeff' : '#f6c75c'); $('mapStations').append(circle);
  }
  Object.values(WORLDS).forEach((w, index) => {
    const b = document.createElement('button'); b.className = 'zone-button';
    b.innerHTML = `<span><small>0${index + 1}</small><strong>${w.name}</strong></span><span>↗</span>`;
    b.addEventListener('click', () => travelTo(w.id)); $('zoneList').append(b);
  });
}
function requestLook() {
  if (!started || transitioning || overview || activeModal || auxiliaryOpen || coarse) return;
  if (document.pointerLockElement === renderer.domElement) return;
  try {
    const result = renderer.domElement.requestPointerLock?.();
    result?.catch(() => { toast('También puedes arrastrar sobre la cancha para mirar.'); });
  } catch { toast('Arrastra sobre la cancha para mirar.'); }
}
function setModal(id) {
  closeModal(); player.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  modalReturnFocus = document.activeElement;
  const modal = $(id); activeModal = modal;
  modal.inert = false; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
  modal.querySelector('button')?.focus();
  $('interactionPrompt').classList.remove('show'); displayedCandidate = '';
}
function closeModal() {
  if (!activeModal && !auxiliaryOpen) return;
  activeModal.classList.remove('open'); activeModal.setAttribute('aria-hidden', 'true'); activeModal.inert = true;
  activeModal = null; modalReturnFocus?.focus?.(); modalReturnFocus = null;
  displayedCandidate = ''; player.clear();
}
function start(withMusic = true) {
  if (!ready || started) return;
  started = true;
  document.body.classList.add('entered');
  document.dispatchEvent(new CustomEvent('fortin:entered', { detail: { withMusic } }));
  $('boot').classList.add('done'); $('boot').inert = true;
  $('experienceUI').classList.remove('is-hidden'); $('experienceUI').inert = false;
  setOverviewState(false);
  // El botón de entrada cuenta como gesto del usuario para Pointer Lock.
  requestLook();
  const feet = player.spawn.clone(); const from = camera.position.clone(); const q = camera.quaternion.clone();
  player.teleport(feet);
  const destination = camera.position.clone(); camera.position.copy(from); camera.quaternion.copy(q);
  moveCamera(destination, new THREE.Vector3(0.9, groundAt(0, GALLERY.z) + 2.1, GALLERY.z), 1.2);
  loadMascot(stationMap.get('serrafin')).catch(() => toast('Serrafín no se pudo cargar. El resto del paseo sigue disponible.'));
}

document.addEventListener('fortin:overlay', event => {
  auxiliaryOpen = event.detail.open; player.clear();
  if (auxiliaryOpen) { closeModal(); if (document.pointerLockElement) document.exitPointerLock(); }
  displayedCandidate = '';
  $('interactionPrompt').classList.remove('show');
});
$('motionToggle').addEventListener('change', event => {
  reduced = event.target.checked; writePreference('reducedMotion', reduced);
  document.body.classList.toggle('reduce-motion', reduced);
});
$('resetCollection').addEventListener('click', () => {
  if (!confirm('¿Reiniciar los cuatro escudos descubiertos? Las vitrinas volverán a estar por descubrir.')) return;
  closeVitrine(); reveal.discovered.clear(); completeAnnounced = false;
  $('completionToast').hidden = true; updateDiscoveries(false);
  toast('Colección reiniciada. Los escudos te esperan.');
});
$('closeCompletion').addEventListener('click', () => $('completionToast').hidden = true);
function capturePostcard() {
  if (!started || transitioning) return;
  try {
    composer.render();
    const source = renderer.domElement;
    const picture = document.createElement('canvas'); picture.width = source.width; picture.height = source.height;
    const ctx = picture.getContext('2d'); ctx.drawImage(source, 0, 0);
    const width = picture.width, height = picture.height;
    const band = Math.max(72, height * 0.115), margin = width * 0.028;
    ctx.fillStyle = 'rgba(7,9,13,.91)'; ctx.fillRect(0, height - band, width, band);
    ctx.fillStyle = '#f6c75c'; ctx.fillRect(margin, height - band, width - margin * 2, 2);
    const logo = document.querySelector('.brand-emblem img');
    const logoHeight = band * 0.66, logoWidth = logoHeight * 775 / 842;
    if (logo?.complete && logo.naturalWidth) ctx.drawImage(logo, margin, height - band * 0.82, logoWidth, logoHeight);
    const tx = margin + logoWidth + band * 0.22;
    ctx.fillStyle = '#f4f2ed'; ctx.font = `600 ${Math.max(15, band * 0.23)}px system-ui, sans-serif`;
    ctx.fillText('EL FORTÍN MINERO', tx, height - band * 0.48);
    ctx.fillStyle = '#a8b5c9'; ctx.font = `${Math.max(10, band * 0.15)}px system-ui, sans-serif`;
    ctx.fillText(`${WORLDS[worldId].name} · Tu postal del paseo`, tx, height - band * 0.23);
    picture.toBlob(blob => {
      if (!blob) return toast('No se pudo guardar la postal.');
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `el-fortin-minero-${worldId}-${Date.now()}.png`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000); toast('Postal guardada con el sello del Fortín.');
    }, 'image/png');
  } catch (error) { console.warn('Postal:', error); toast('No se pudo guardar la postal en este navegador.'); }
}
$('captureButton').addEventListener('click', capturePostcard);

$('enterExperience').addEventListener('click', () => start(true));
$('enterSilent').addEventListener('click', () => start(false));
$('brandButton').addEventListener('click', async () => { if (worldId !== 'hub') await travelTo('hub'); else goToStation('racing'); });
$('homeButton').addEventListener('click', async () => { if (worldId !== 'hub') await travelTo('hub'); else goToStation('racing'); });
$('viewButton').addEventListener('click', toggleOverview);
$('zonesButton').addEventListener('click', () => setModal('zonesModal'));
$('closeZones').addEventListener('click', closeModal);
$('helpButton').addEventListener('click', () => setModal('helpModal'));
// Sustituye las acciones de ayuda independientes instaladas por bootstrap.js.
$('introHelp').onclick = () => setModal('helpModal');
$('closeHelp').onclick = closeModal;
$('resumeButton').onclick = () => { closeModal(); if (started) requestLook(); };
$('closeInfo').addEventListener('click', closeVitrine);
//$('visitZone').addEventListener('click', () => { const d = stationMap.get(panelStationId)?.def; if (d?.world) travelTo(d.world); });
$('rotationButton').addEventListener('click', () => {
  const s = stationMap.get(reveal.activeId); if (!s?.cube) return;
  s.cube.rotate = !s.cube.rotate;
  $('rotationButton').textContent = s.cube.rotate ? 'Pausar movimiento del escudo  Ⅱ' : 'Animar escudo  ▷';
});
$('qualityButton').addEventListener('click', () => setQuality(!highQuality, true));
$('resumeHint').addEventListener('click', requestLook);
$('mobileInteract').addEventListener('click', interact);
$('mobileJump').addEventListener('pointerdown', e => { e.preventDefault(); player.keys.add('Space'); });
$('mobileJump').addEventListener('pointerup', () => player.keys.delete('Space'));
$('mobileJump').addEventListener('pointercancel', () => player.keys.delete('Space'));
renderer.domElement.addEventListener('click', requestLook);
document.addEventListener('pointerlockchange', () => {
  player.clear();
  $('resumeHint').classList.toggle('is-hidden', document.pointerLockElement === renderer.domElement);
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement || !started || transitioning || overview || activeModal || auxiliaryOpen || director) return;
  camera.rotation.y -= e.movementX * 0.002;
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - e.movementY * 0.00185, -1.35, 1.35);
});
renderer.domElement.addEventListener('pointerdown', e => {
  if (!started || overview || activeModal || auxiliaryOpen || director || transitioning || document.pointerLockElement) return;
  lookPointer = e.pointerId; lastLookX = e.clientX; lastLookY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (e.pointerId !== lookPointer || overview || activeModal || auxiliaryOpen || director || transitioning || document.pointerLockElement) return;
  camera.rotation.y -= (e.clientX - lastLookX) * (coarse ? 0.005 : 0.004);
  camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x - (e.clientY - lastLookY) * 0.004, -1.35, 1.35);
  lastLookX = e.clientX; lastLookY = e.clientY;
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) renderer.domElement.addEventListener(event, e => { if (e.pointerId === lookPointer) lookPointer = null; });
document.querySelectorAll('.dpad button').forEach(b => {
  const code = b.dataset.key;
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); if (!overview) player.keys.add(code); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(event, () => player.keys.delete(code));
});
window.addEventListener('keydown', e => {
  if (auxiliaryOpen) return;
  if (activeModal) {
    if (e.code === 'Escape') { e.preventDefault(); closeModal(); }
    if (e.code === 'Tab') {
      const focusables = [...activeModal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')].filter(el => !el.hidden);
      const first = focusables[0], last = focusables.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
  if (!started) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') { closeVitrine(); player.clear(); return; }
  if (e.repeat) return;
  if (e.code === 'KeyE') { e.preventDefault(); interact(); return; }
  if (e.code === 'KeyP') { e.preventDefault(); capturePostcard(); return; }
  if (e.code === 'KeyV') { e.preventDefault(); toggleOverview(); return; }
  if (/^Digit[1-5]$/.test(e.code)) { goToStation(STATIONS[Number(e.code.slice(-1)) - 1].id); return; }
  if (!overview && !transitioning && !director) player.keys.add(e.code);
});
window.addEventListener('keyup', e => player.keys.delete(e.code));
window.addEventListener('blur', () => player.clear());
document.addEventListener('visibilitychange', () => { player.clear(); clock.getDelta(); });
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
for (const id of ['helpModal', 'zonesModal']) $(id).addEventListener('click', e => { if (e.target === $(id)) closeModal(); });
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault(); player.clear(); renderer.setAnimationLoop(null);
  $('experienceUI').inert = true; $('boot').inert = false; $('boot').classList.remove('done');
  $('enterExperience').disabled = true; $('enterSilent').disabled = true;
  window.showBootError?.('Se perdió el contexto gráfico. Cierra otras pestañas y pulsa Reintentar; luego usa el modo LQ.');
});

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05); const time = clock.elapsedTime;
  if (document.hidden) return;
  if (started && !transitioning && !activeModal && !auxiliaryOpen) {
    if (director) animateDirector(dt);
    else if (overview) orbit.update();
    else player.update(dt);
    updateInteraction();
  }
  for (const s of stationMap.values()) updateStation(s, time, dt, candidate === s || reveal.activeId === s.def.id, reduced);
  particles.material.uniforms.time.value = reduced ? 0 : time;
  if (returnPortal) returnPortal.portal.material.uniforms.time.value = reduced ? 0 : time;
  if (started && ++frameCount % 6 === 0 && worldId === 'hub') {
    const pos = player.collider.end;
    const x = THREE.MathUtils.clamp(16 + (pos.x + 24) / 48 * 128, 7, 153);
    const y = THREE.MathUtils.clamp(19 + (pos.z - GALLERY.z) * 2.3, 5, 51);
    const rotation = -camera.rotation.y * 180 / Math.PI;
    $('mapPlayer').setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation.toFixed(1)})`);
  }
  composer.render();
}

buildNavigation();
const savedDiscoveries = validDiscoveries(readPreference('discoveries', []), STATIONS.filter(s => s.logo).map(s => s.id));
savedDiscoveries.forEach(id => reveal.discovered.add(id));
completeAnnounced = savedDiscoveries.length === STATIONS.filter(s => s.logo).length;
updateDiscoveries(false);
renderer.setAnimationLoop(animate);
async function initialize() {
  try {
    setBoot(4, 'Cargando Cancha Media…');
    const hub = await fetchWorld('hub', p => setBoot(4 + p * 37, 'Cargando el escenario principal…'));
    setCurrentWorld('hub', hub);
    buildGallery();
    const view = overviewTarget(); camera.position.copy(view.position); camera.lookAt(view.target); orbit.target.copy(view.target);
    setBoot(42, 'Preparando las tres mascotas…');
    const progress = [0, 0, 0]; const core = STATIONS.filter(s => s.logo && s.mascot);
    const results = await Promise.allSettled(core.map((d, i) => loadMascot(stationMap.get(d.id), p => {
      progress[i] = p;
      setBoot(42 + progress.reduce((a, b) => a + b, 0) * 17, 'Preparando las tres mascotas…');
    }).then(() => { progress[i] = 1; })));
    const failures = results.filter(r => r.status === 'rejected').length;
    setBoot(98, 'Ajustando iluminación y materiales…');
    await sleep(60);
    // La compilación es una mejora; no bloquea la entrada si el navegador no la soporta.
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera).catch(error => console.warn('Compilación anticipada no disponible:', error));
    ready = true;
    document.dispatchEvent(new Event('fortin:ready'));
    setBoot(100, failures ? `${failures} mascota(s) no se pudieron cargar; el paseo está disponible.` : 'Paseo listo. Los escudos esperan a que los descubras.');
    $('bootButtonText').textContent = 'Entrar con música'; $('enterExperience').disabled = false; $('enterSilent').disabled = false;
  } catch (error) {
    console.error('Error al preparar el paseo:', error);
    window.showBootError?.('No se pudo cargar CanchaMedia.glb. Conserva la carpeta models junto a index.html y abre el proyecto desde un servidor local.');
  }
}
await initialize();
// Diagnóstico opcional y de sólo lectura. No revela escudos ni mueve la cámara.
if (new URLSearchParams(location.search).has('debug')) window.paseoDebug = () => ({
  world: worldId, ready, started, overview, transitioning,
  player: player.collider.end.toArray(), candidate: candidate?.def?.id,
  reveal: { activeId: reveal.activeId, status: reveal.status, discovered: [...reveal.discovered] },
  stations: [...stationMap.values()].map(s => ({ id: s.def.id, position: s.root.position.toArray(), ready: s.ready, cubeVisible: s.cube?.root.visible || false })),
  reducedMotion: reduced, highQuality, auxiliaryOpen,
  drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
});
