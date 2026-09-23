import { Soundtrack, formatTime } from './audio-core.js';
import { readPreference, writePreference, boundedVolume } from './preferences.js';
const $ = id => document.getElementById(id);
let player;
let audioError = '';
let entered = false;
let returnFocus = null;
let audioContext = null;
let effects = readPreference('effects', false) === true;
const volume = boundedVolume(readPreference('volume', 0.32));
const audio = $('soundtrack');
export const soundtrack = player = new Soundtrack(audio, {
  volume,
  onUpdate: () => { if (player) update(); },
  onError: message => { audioError = message; update(); },
});
$('effectsToggle').checked = effects;
function update() {
  const playing = !audio.paused && !audio.ended;
  document.body.classList.toggle('music-playing', playing);
  $('musicToggle').textContent = playing || (player.desired && !player.suspended) ? 'Ⅱ' : '▶';
  $('musicToggle').setAttribute('aria-label', player.desired ? 'Pausar música' : 'Reproducir música');
  $('dockToggle').textContent = playing ? 'Ⅱ' : '▶';
  $('dockToggle').setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  $('musicDock').hidden = !entered;
  $('dockOpen').querySelector('small').textContent = playing ? 'ESTÁS ESCUCHANDO' : 'MÚSICA EN PAUSA';
  $('audioStatus').textContent = audioError || (playing ? 'Música del Fortín · Reproduciendo' : player.suspended && player.desired ? 'Pausada mientras estás en otra pestaña.' : 'A tu ritmo. Pulsa reproducir.');
  $('musicVolume').value = String(Math.round(audio.volume * 100));
  $('musicVolumeValue').textContent = `${Math.round(audio.volume * 100)}%`;
  $('musicVolume').setAttribute('aria-valuetext', `${Math.round(audio.volume * 100)} por ciento`);
  $('musicMute').setAttribute('aria-pressed', String(audio.muted));
  $('musicMute').setAttribute('aria-label', audio.muted ? 'Restaurar sonido' : 'Silenciar música');
  $('musicMute').textContent = audio.muted ? '×' : '♪';
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  $('musicSeek').disabled = duration === 0;
  $('musicSeek').max = String(duration || 100);
  if (document.activeElement !== $('musicSeek')) $('musicSeek').value = String(audio.currentTime || 0);
  $('musicSeek').setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} de ${formatTime(audio.duration)}`);
  $('musicCurrent').textContent = formatTime(audio.currentTime || 0);
  $('musicDuration').textContent = formatTime(audio.duration);
  document.querySelectorAll('.music-range').forEach(el => el.style.setProperty('--fill', `${Number(el.value) / Number(el.max) * 100}%`));
}
function openAudio() {
  returnFocus = document.activeElement;
  if (document.pointerLockElement) document.exitPointerLock();
  $('audioModal').inert = false; $('audioModal').setAttribute('aria-hidden', 'false'); $('audioModal').classList.add('open');
  document.dispatchEvent(new CustomEvent('fortin:overlay', { detail: { open: true } }));
  $('closeAudio').focus();
}
function closeAudio() {
  $('audioModal').classList.remove('open'); $('audioModal').setAttribute('aria-hidden', 'true'); $('audioModal').inert = true;
  document.dispatchEvent(new CustomEvent('fortin:overlay', { detail: { open: false } }));
  returnFocus?.focus?.(); returnFocus = null;
}
const toggle = () => { audioError = ''; player.toggle(); };
$('musicToggle').addEventListener('click', toggle);
$('dockToggle').addEventListener('click', toggle);
$('soundButton').addEventListener('click', openAudio);
$('dockOpen').addEventListener('click', openAudio);
$('introListen').addEventListener('click', () => { openAudio(); if (!player.desired) { audioError = ''; player.play(); } });
$('closeAudio').addEventListener('click', closeAudio);
$('audioModal').addEventListener('click', e => { if (e.target === $('audioModal')) closeAudio(); });
$('musicMute').addEventListener('click', () => player.setMuted(!audio.muted));
$('musicVolume').addEventListener('input', e => {
  const value = Number(e.target.value) / 100;
  player.setVolume(value); if (value > 0) player.setMuted(false); writePreference('volume', value);
});
$('musicSeek').addEventListener('input', e => player.seek(Number(e.target.value)));
$('musicBack').addEventListener('click', () => player.seek(audio.currentTime - 10));
$('effectsToggle').addEventListener('change', e => { effects = e.target.checked; writePreference('effects', effects); if (effects) chime(); });
document.addEventListener('fortin:entered', e => {
  entered = true; audioError = '';
  if (e.detail.withMusic) { player.setMuted(false); player.play(); } else player.pause();
  update();
});
document.addEventListener('visibilitychange', () => player.setHidden(document.hidden));
window.addEventListener('pagehide', () => player.setHidden(true));
window.addEventListener('pageshow', () => { if (!document.hidden) player.setHidden(false); });
window.addEventListener('keydown', e => {
  const open = $('audioModal').classList.contains('open');
  if (open && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeAudio(); return; }
  if (open && e.code === 'Tab') {
    const els = [...$('audioModal').querySelectorAll('button,input:not([disabled])')]; const first = els[0], last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (!e.repeat && e.code === 'KeyM' && !/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '') && !e.target?.isContentEditable) {
    e.preventDefault(); e.stopImmediatePropagation(); toggle();
  }
}, true);
export function chime() {
  if (!effects || document.hidden) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    [440, 660, 880].forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); const start = audioContext.currentTime + i * 0.085;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(0.014, start + 0.025); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + 0.36);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  } catch { /* La música y el paseo funcionan aunque no haya Web Audio. */ }
}
update();
