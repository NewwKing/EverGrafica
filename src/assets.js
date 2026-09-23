import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();

export function loadAsset(url, onProgress) {
  if (!cache.has(url)) {
    const job = loader.loadAsync(url, e => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    }).catch(error => { cache.delete(url); throw error; });
    cache.set(url, job);
  }
  return cache.get(url);
}

export function prepareMaterials(root, { shadows = true } = {}) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = shadows;
    o.receiveShadow = true;
    // No sustituimos texturas ni recoloreamos los escudos o las mascotas.
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if ('envMapIntensity' in m) m.envMapIntensity = 0.65;
      if ('roughness' in m) m.roughness = Math.max(0.3, m.roughness);
    }
  });
}

/** Centrado y ajuste por caja real, sin depender de las unidades de Blender. */
export function fitModel(gltf, height, maxWidth = 4, maxDepth = 3.8) {
  // Estos archivos no contienen esqueletos ni animaciones; compartimos buffers.
  const root = gltf.scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = Math.min(height / Math.max(size.y, 0.001),
    maxWidth / Math.max(size.x, 0.001), maxDepth / Math.max(size.z, 0.001));
  const normalized = new THREE.Group();
  root.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
  normalized.add(root);
  normalized.scale.setScalar(scale);
  prepareMaterials(normalized);
  return { object: normalized, height: size.y * scale };
}

/** Liberación de efectos generados; los modelos cacheados se reutilizan. */
export function disposeGenerated(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(o => {
    if (!o.userData.generated) return;
    if (o.geometry) geometries.add(o.geometry);
    for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
      materials.add(m);
      if (m.map) textures.add(m.map);
    }
  });
  root.removeFromParent();
  textures.forEach(t => t.dispose());
  materials.forEach(m => m.dispose());
  geometries.forEach(g => g.dispose());
}
