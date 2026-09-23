import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.keys = new Set();
    this.velocity = new THREE.Vector3();
    this.collider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1.55, 0), 0.35);
    this.spawn = new THREE.Vector3();
    this.onFloor = false;
    this.octree = null;
    this.blockers = [];
    this.direction = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.side = new THREE.Vector3();
    this.step = new THREE.Vector3();
    this.minY = -30;
  }
  clear() { this.keys.clear(); this.velocity.set(0, 0, 0); }
  teleport(feet, target) {
    this.clear();
    this.collider.start.copy(feet).y += 0.35;
    this.collider.end.copy(feet).y += 1.55;
    this.camera.position.copy(this.collider.end);
    if (target) this.camera.lookAt(target);
    this.onFloor = false;
  }
  update(delta) {
    const steps = 5;
    for (let i = 0; i < steps; i++) this.integrate(delta / steps);
    if (this.collider.end.y < this.minY) this.teleport(this.spawn);
    this.camera.position.copy(this.collider.end);
  }
  integrate(dt) {
    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.side.crossVectors(this.forward, this.camera.up).normalize();
    this.direction.set(0, 0, 0);
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.direction.add(this.forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.direction.sub(this.forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.direction.add(this.side);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.direction.sub(this.side);
    this.direction.normalize();
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 10 : 5.6;
    const lerp = 1 - Math.exp(-(this.onFloor ? 12 : 3) * dt);
    this.velocity.x += (this.direction.x * speed - this.velocity.x) * lerp;
    this.velocity.z += (this.direction.z * speed - this.velocity.z) * lerp;
    if (this.onFloor && this.keys.has('Space')) {
      this.velocity.y = 8;
      this.onFloor = false;
      this.keys.delete('Space');
    }
    this.velocity.y -= 24 * dt;
    this.step.copy(this.velocity).multiplyScalar(dt);
    this.collider.translate(this.step);
    const hit = this.octree?.capsuleIntersect(this.collider);
    this.onFloor = false;
    if (hit) {
      this.onFloor = hit.normal.y > 0.5;
      const inward = hit.normal.dot(this.velocity);
      if (inward < 0) this.velocity.addScaledVector(hit.normal, -inward);
      this.collider.translate(hit.normal.multiplyScalar(hit.depth));
    }
    // Colisionadores simples para no atravesar las mascotas. No añadimos sus
    // mallas de alta densidad al Octree del escenario.
    for (const b of this.blockers) {
      if (this.collider.start.y > b.y + b.height || this.collider.end.y < b.y) continue;
      const dx = this.collider.end.x - b.x;
      const dz = this.collider.end.z - b.z;
      const d = Math.hypot(dx, dz);
      const minimum = b.radius + this.collider.radius;
      if (d < minimum) {
        const nx = d > 0.0001 ? dx / d : 1;
        const nz = d > 0.0001 ? dz / d : 0;
        this.step.set(nx * (minimum - d), 0, nz * (minimum - d));
        this.collider.translate(this.step);
        const toward = nx * this.velocity.x + nz * this.velocity.z;
        if (toward < 0) { this.velocity.x -= nx * toward; this.velocity.z -= nz * toward; }
      }
    }
  }
}
