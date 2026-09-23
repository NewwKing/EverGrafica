// Este archivo no depende de Three.js: puede explicar fallos de conexión.
(() => {
  const status = document.getElementById('bootStatus');
  const button = document.getElementById('bootButtonText');
  const errorActions = document.getElementById('bootErrorActions');
  const fail = message => { status.textContent = message; button.textContent = 'No se pudo iniciar'; errorActions.hidden = false; };
  document.getElementById('retryBoot').onclick = () => location.reload();
  document.getElementById('mirrorBoot').onclick = () => {
    const url = new URL(location.href);
    url.searchParams.set('cdn', url.searchParams.get('cdn') === 'unpkg' ? 'jsdelivr' : 'unpkg');
    location.href = url.href;
  };
  window.showBootError = fail;
  let watchdog;
  document.addEventListener('fortin:ready', () => { clearTimeout(watchdog); errorActions.hidden = true; });
  // La ayuda funciona incluso cuando el motor 3D no consigue descargarse.
  document.getElementById('introHelp').onclick = () => {
    const modal = document.getElementById('helpModal');
    modal.inert = false; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.getElementById('closeHelp').focus();
  };
  const dismiss = () => {
    const modal = document.getElementById('helpModal');
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); modal.inert = true;
    document.getElementById('introHelp').focus();
  };
  document.getElementById('closeHelp').onclick = dismiss;
  document.getElementById('resumeButton').onclick = dismiss;
  if (location.protocol === 'file:') {
    fail('Abre este proyecto con un servidor local: python -m http.server 8080. Después entra en http://localhost:8080.');
    document.getElementById('mirrorBoot').hidden = true;
    return;
  }
  const alternative = new URL(location.href).searchParams.get('cdn') === 'unpkg';
  const base = window.FORTIN_LOCAL_THREE ? new URL('./vendor/three/', location.href).href : alternative ? 'https://unpkg.com/three@0.180.0/' : 'https://cdn.jsdelivr.net/npm/three@0.180.0/';
  if (window.FORTIN_LOCAL_THREE) document.getElementById('mirrorBoot').hidden = true;
  const importMap = document.createElement('script');
  importMap.type = 'importmap';
  importMap.textContent = JSON.stringify({ imports: { three: `${base}build/three.module.js`, 'three/addons/': `${base}examples/jsm/` } });
  document.head.append(importMap);
  watchdog = setTimeout(() => { if (document.getElementById('enterExperience').disabled) { status.textContent = 'La carga está tardando. Revisa tu conexión o prueba Cambiar conexión.'; errorActions.hidden = false; } }, 40000);
  import('./main.js').catch(error => {
    clearTimeout(watchdog);
    console.error('No se pudo iniciar el paseo:', error);
    fail(window.FORTIN_LOCAL_THREE ? 'No se pudo iniciar Three.js local. Revisa vendor/three y vuelve a ejecutar preparar_offline.py.' : 'No se pudo iniciar el motor 3D. Comprueba tu conexión a Internet y usa “Reintentar” o “Cambiar conexión”. La música y la ayuda siguen disponibles.');
  });
})();
