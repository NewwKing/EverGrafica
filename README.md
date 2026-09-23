# El Fortín Minero · V3

**Fútbol · Identidad · Pasión**

Esta edición continúa el paseo de la V2: conserva los colores grafito, dorado y azul, las cinco estaciones alineadas y Cancha Media como escenario principal. Incorpora tu logo A.F.LL, tu música y el nuevo escudo 3D de Asociación.

## Abrir la página

Descomprime el ZIP **en una carpeta nueva**. No mezcles sus archivos con la V2. Dentro de la carpeta que contiene `index.html`, ejecuta:

```bash
python run.py
```

En macOS o Linux, el comando puede ser `python3 run.py`. En Windows puedes abrir `INICIAR-WINDOWS.bat`, con Python 3 instalado.

El servidor abre el navegador y muestra la dirección en la terminal, normalmente:

```text
http://127.0.0.1:8080
```

Si ese puerto está ocupado, utiliza el siguiente disponible. Mantén la terminal abierta durante el recorrido. Pulsa Ctrl+C para cerrar el servidor. No abras `index.html` con doble clic.

También funciona con un servidor estático como el usado en la V2. `run.py` incluye soporte de rangos de audio para adelantar y retroceder la canción, tipos MIME explícitos y respuestas sin caché persistente para no mezclar versiones.

**Conexión:** en la configuración incluida, el motor Three.js se descarga de Internet. Los 13 modelos, la música, el logo y las miniaturas sí están dentro del ZIP. No hay que ejecutar `npm install` para abrir la página.

## Lo nuevo

### La identidad del Fortín

La portada, el encabezado, el título de la pestaña y el icono utilizan el nombre **El Fortín Minero**. Tu logo se utiliza con su diseño original, sin sustituirlo por uno generado. También se añadió un cartel con la identidad del Fortín dentro del escenario.

Se mantuvieron las miniaturas de las mascotas de la V2: los modelos que acabas de enviar para esas tres mascotas tienen los mismos bytes que sus versiones anteriores. No se han inventado fotografías, historias de los clubes ni nombres de canciones o artistas.

### Música con control

La portada ofrece **Entrar con música** y **Entrar en silencio**. También puedes escucharla antes de entrar. No empieza a sonar por el simple hecho de cargar la página.

El botón de la nota musical abre un reproductor con reproducción/pausa, volumen, silencio, barra de posición y retroceso de diez segundos. **M** pausa o continúa la música. El mismo elemento de audio se reutiliza durante los cambios de zona, sin reiniciar ni superponer la pista.

Se recuerda el volumen elegido. Al ocultar la pestaña, la música se pausa; al volver se intenta reanudar sólo si el usuario la estaba escuchando. Si el navegador exige otra interacción, el reproductor lo indica. Algunos dispositivos móviles administran el volumen mediante sus controles físicos.

El archivo utilizado es `musicaPaginaWeb.m4a`. El otro M4A adjunto es idéntico, por lo que no se añadió una segunda pista. El original se conserva en `assets/audio/`; los MP3 y OGG son conversiones del mismo audio para ofrecer alternativas de reproducción. La duración comprobada es aproximadamente **3:29**. “Sonido del Fortín” es el nombre del reproductor, no una identificación del título original de la canción.

El aviso al descubrir un escudo es opcional e independiente de la música; empieza apagado.

### Cuatro escudos por descubrir

| Estación | Modelo que se revela con E |
|---|---|
| 23 de Marzo | `23LogoOficial(2).glb` |
| Ballivián | `BallibiamLogoOficial(2).glb` |
| Racing | `RacingLogoOficial(2).glb` |
| Asociación | `LogoAsociasion.glb` |

La cuarta vitrina aparece junto a la estación de Asociación. Su panel conserva el botón para visitar la zona. **Serrafín continúa independiente**: no se le asignó el escudo de Asociación.

Los cubos completos empiezan ocultos y los modelos de los escudos sólo se solicitan al interactuar. Sólo hay una vitrina abierta a la vez. E, Esc, cerrar la ficha, cambiar de estación o alejarse la ocultan. El menú y las teclas 1–5 acercan la cámara: no revelan automáticamente ningún escudo.

La colección ahora cuenta **0/4** y se guarda localmente. Recuperar una colección guardada no abre las vitrinas: éstas siguen requiriendo E. Hay un aviso al completar la colección y un botón **Reiniciar colección** dentro de Ayuda.

### Pequeños detalles del recorrido

Se añadieron un movimiento discreto en las miniaturas de la portada, una opción para reducir las animaciones decorativas y un encuadre general que tiene en cuenta la proporción de la pantalla. Se conservan los modos HQ/LQ y los controles táctiles.

El botón de cámara, o la tecla **P**, genera una postal PNG del escenario visible con el logo y el nombre del Fortín. No incluye los paneles de la interfaz. Esta función está implementada, pero la captura final del escenario 3D no pudo verificarse en este entorno; consulta el alcance de las pruebas más abajo.

## Controles

| Acción | Control |
|---|---|
| Caminar y mirar | WASD / flechas; ratón o arrastre |
| Correr / saltar | Shift / Espacio |
| Revelar u ocultar una vitrina | E; botón E en móvil |
| Ir a una estación | 1–5 o barra inferior |
| Vista general / volver a caminar | V |
| Pausar / continuar música | M |
| Guardar una postal | P o botón de cámara |
| Cerrar ficha o ventana; liberar cursor | Esc |
| Calidad y movimiento reducido | HQ/LQ; opción dentro de Ayuda |

La fila sigue siendo: **23 de Marzo → Ballivián → Racing → Asociación → Serrafín**.

## Personalización

`src/config.js` contiene los nombres, las posiciones, las escalas, las orientaciones y las parejas de estación/escudo. `GALLERY.z` es la profundidad común de la fila. La posición X de cada estación se mantiene explícita para facilitar el ajuste.

`styles.css` contiene el diseño, con las mejoras V3 al final. `src/visuals.js` contiene las bases, los cubos y el cartel del Fortín. `src/media.js` gestiona la interfaz musical y `src/audio-core.js` su reproducción. `src/preferences.js` gestiona preferencias y colección; si el almacenamiento está bloqueado, la experiencia usa valores predeterminados y continúa.

Los GLB conservan sus bytes originales. Sólo se ajustan la escala y el centrado al mostrarlos. `ASSET-MAP.json` permite comprobar de qué adjunto procede cada modelo y conserva su SHA-256.

## Opción sin CDN

Incluí un instalador opcional para que puedas preparar una copia local de Three.js:

```bash
python preparar_offline.py
```

**Este paso necesita Internet.** Descarga el paquete fijo `three@0.180.0`, verifica su versión y copia únicamente el motor, los complementos utilizados y su licencia a `vendor/three/`. Sólo después cambia `src/runtime.js` a modo local. No modifica tus modelos ni tu música.

Una vez completado, ejecuta `python run.py` de nuevo. El paseo podrá utilizar esa copia local sin CDN. **La descarga de este instalador no se pudo ejecutar aquí** por las restricciones de red; su sintaxis sí fue comprobada. La entrega, tal como viene, utiliza el CDN igual que la V2.

## Qué se comprobó

Se ejecutaron **32 pruebas automáticas** de archivos, identidad, asociaciones, integridad de GLB, estado de vitrinas, cancelación de cargas tardías, reproducción y preferencias. Todas pasaron. También se comprobó la sintaxis de todos los módulos JavaScript y los dos scripts Python.

La portada y el reproductor se revisaron en Chromium a 1440×900, 1366×768, 390×844 y 360×800. Para esa revisión se cargaron los componentes y los recursos locales en un documento aislado, no el recorrido Three.js. Se comprobó la reproducción real del audio aportado, volumen, desplazamiento de la pista, silencio, pausa, tecla M y cierre con Esc. El servidor se probó por HTTP, incluyendo respuestas 206 y rangos de audio.

**No se pudo ejecutar la escena Three.js completa aquí:** la navegación HTTP del navegador está bloqueada por la administración del entorno y los CDN no son accesibles desde la red del contenedor. Por ello quedan sin verificar en ejecución el encuadre del nuevo cartel 3D, las colisiones, la cuarta vitrina y la postal del escenario. No se presentan las vistas previas de la portada como capturas de un recorrido 3D ejecutado.

Los detalles están en `COMPROBACIONES.md`. Con Node.js instalado, puedes repetir las pruebas locales:

```bash
npm test
```

## Referencias técnicas

Motor fijado a Three.js 0.180.0, sin afirmar que sea la última versión.

- Instalación y módulos: https://threejs.org/manual/pages/installation.html
- Código y licencia del motor: https://github.com/mrdoob/three.js/tree/r180
- Reproducción de audio: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play
- Volumen: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/volume

No se ha publicado la página en un dominio ni se han conectado cuentas externas. Esta entrega es el proyecto para ejecutar localmente o subir posteriormente a tu alojamiento.
