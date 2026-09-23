import { boundedVolume } from './preferences.js';
/** Un único audio. Pausar o cerrar la pestaña nunca crea pistas superpuestas. */
export class Soundtrack {
  constructor(audio, { volume = 0.32, onUpdate = () => {}, onError = () => {} } = {}) {
    this.audio = audio;
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.desired = false;
    this.suspended = false;
    this.serial = 0;
    audio.loop = true;
    this.setVolume(volume);
    for (const type of ['playing', 'pause', 'waiting', 'timeupdate', 'durationchange', 'loadedmetadata', 'volumechange', 'ended']) audio.addEventListener(type, () => this.onUpdate());
    audio.addEventListener('error', () => {
      this.desired = false;
      this.onError('No se pudo abrir la música. Comprueba la carpeta assets/audio.');
      this.onUpdate();
    });
  }
  async play() {
    this.desired = true;
    if (this.suspended) return;
    const ticket = ++this.serial;
    try {
      // Se llama en el mismo gesto del botón, antes de cualquier espera externa.
      await this.audio.play();
      if (ticket !== this.serial && (!this.desired || this.suspended)) this.audio.pause();
      this.onUpdate();
    } catch (error) {
      if (ticket !== this.serial) return;
      this.desired = false;
      this.onError(error?.name === 'NotAllowedError' ? 'Toca reproducir para activar la música.' : 'No se pudo reproducir el audio. Prueba otra vez.');
      this.onUpdate();
    }
  }
  pause() { this.desired = false; this.serial++; this.audio.pause(); this.onUpdate(); }
  toggle() { return this.desired ? this.pause() : this.play(); }
  setVolume(value) { this.audio.volume = boundedVolume(value); this.onUpdate(); }
  setMuted(value) { this.audio.muted = Boolean(value); this.onUpdate(); }
  seek(seconds) {
    if (!Number.isFinite(seconds) || !Number.isFinite(this.audio.duration) || this.audio.duration <= 0) return;
    this.audio.currentTime = Math.max(0, Math.min(this.audio.duration, seconds)); this.onUpdate();
  }
  setHidden(hidden) {
    this.suspended = Boolean(hidden);
    if (hidden) { this.serial++; this.audio.pause(); this.onUpdate(); }
    else if (this.desired) return this.play();
  }
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—:—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
