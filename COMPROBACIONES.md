# Comprobaciones de entrega · V3

## Resultado: 32 pruebas automáticas superadas

Ejecutadas con `node --test tests/*.test.js`. Cubren encabezado GLB 2.0 y longitud del archivo, ausencia de recursos externos en los modelos, existencia de miniaturas y modelos, hashes del manifiesto, la fila de cinco estaciones, cuatro emparejamientos explícitos, Serrafín independiente, una única vitrina abierta, cierre mientras carga un logo, ausencia de revelación por teclas repetidas y deduplicación de descubrimientos.

También cubren un único elemento de audio sin autoplay inicial, play/pausa sin perder la posición, pausa por visibilidad, invalidación de respuestas de reproducción tardías, rechazo de autoplay, límites de volumen/posición, datos persistidos y almacenamiento bloqueado.

Sintaxis: todos los módulos `src/*.js` pasaron `node --check`; `run.py` y `preparar_offline.py` pasaron `py_compile`.

## Interfaz y audio aislados

Chromium, cuatro tamaños: 1440×900, 1366×768, 390×844 y 360×800. HTML/CSS y los módulos reales del reproductor, con imágenes y audio locales incrustados mediante URLs de datos exclusivamente para la prueba. No se usó un motor 3D simulado.

El audio MP3 derivado del M4A aportado se decodificó y avanzó en reproducción. Se verificaron volumen, salto a 1:00, silencio, pausa, M, Esc y eventos de entrada con música/sin música. Portada sin desbordamiento horizontal y tarjeta del reproductor dentro del área visible en los cuatro tamaños. No se registraron excepciones JavaScript en estas pruebas de componentes.

Las vistas previas de portada se identifican como interfaz sin escena 3D. El estado de carga de dichas vistas previas se fijó para inspeccionar la maquetación; no constituye evidencia de una carga real de Three.js.

## Servidor HTTP

Desde Python/urllib se comprobaron las rutas HTML, JavaScript, logo, escenario principal, escudo nuevo y MP3. Respuestas 200 y MIME esperados. Se comprobaron rangos de 200 bytes de MP3 y M4A mediante respuestas 206; los bytes recibidos coinciden con los archivos locales. Rango fuera del archivo: respuesta 416.

## Recursos

13 GLB. Los adjuntos más recientes sustituyen las rutas de sus equivalentes anteriores, conservando los bytes originales. Los modelos reenviados salvo el nuevo logo de Asociación coinciden con los de V2, por lo que las miniaturas anteriores siguen correspondiendo a las mismas mascotas. Los dos M4A recibidos son idénticos: se conserva una pista original y sus conversiones MP3/OGG. Se inspeccionaron el códec y la duración de los audios con ffprobe.

## Límites de verificación

La navegación HTTP de Chromium devuelve `ERR_BLOCKED_BY_ADMINISTRATOR` en este entorno. La red del contenedor tampoco resuelve los CDN. Se mantuvo la configuración Three.js fija de V2, con selección alternativa de CDN y un instalador local opcional.

**No verificado en ejecución:** recorrido WebGL completo, colisiones finales, rendimiento FPS en equipos reales, encuadre del cartel nuevo, apertura visible de Asociación, generación de la postal 3D, compatibilidad en dispositivos físicos iOS/Android y descarga del instalador offline. Las pruebas de componentes no sustituyen esos controles.

## Revisión breve en tu navegador

1. Entrar en silencio y, en otra carga, entrar con música. Abrir el reproductor; probar volumen y M.
2. Usar 1–5: la cámara debe ir a cada estación sin abrir ningún cubo.
3. En 23 de Marzo, Ballivián, Racing y Asociación, pulsar E. Debe aparecer sólo su vitrina; E o Esc deben ocultarla. Serrafín sigue sin escudo.
4. Recargar después de descubrir un escudo: el contador debe recordarlo, pero el cubo debe seguir oculto hasta pulsar E.
5. Probar caminar, saltar, volver de otra zona, V, HQ/LQ y guardar una postal con P.

La V2 original no fue sobrescrita.
