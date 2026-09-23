/** Preferencias locales, sin cuentas, cookies ni peticiones a servidores externos. */
const PREFIX = 'fortin-minero:v3:';
export function readPreference(key, fallback) {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value === null ? fallback : JSON.parse(value);
  } catch { return fallback; }
}
export function writePreference(key, value) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export function validDiscoveries(value, ids) {
  return Array.isArray(value) ? [...new Set(value.filter(id => ids.includes(id)))] : [];
}
export function boundedVolume(value, fallback = 0.32) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}
