#!/usr/bin/env python3
"""Opcional: instala Three.js 0.180.0 local sin npm. Requiere Internet UNA vez."""
from pathlib import Path, PurePosixPath
import io
import json
import re
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parent
VERSION = '0.180.0'
URL = f'https://registry.npmjs.org/three/-/three-{VERSION}.tgz'


def main():
    print(f'Descargando Three.js {VERSION} desde su paquete npm…', flush=True)
    request = urllib.request.Request(URL, headers={'User-Agent': 'FortinMinero-OfflineInstaller/3.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read(40 * 1024 * 1024 + 1)
    if len(raw) > 40 * 1024 * 1024:
        raise ValueError('Paquete mayor del tamaño esperado.')
    target = ROOT / 'vendor' / 'three'
    target.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as archive:
        pkg = json.load(archive.extractfile('package/package.json'))
        if pkg.get('version') != VERSION:
            raise ValueError('La versión recibida no coincide.')
        queue = ['build/three.module.js', 'LICENSE']
        for file in (ROOT / 'src').glob('*.js'):
            queue.extend('examples/jsm/' + match for match in re.findall(r"['\"]three/addons/([^'\"]+\.js)['\"]", file.read_text(encoding='utf-8')))
        copied = set()
        while queue:
            relative = queue.pop()
            if relative in copied:
                continue
            pure = PurePosixPath(relative)
            if pure.is_absolute() or '..' in pure.parts:
                raise ValueError('Ruta de dependencia no válida.')
            item = archive.getmember('package/' + relative)
            if not item.isfile():
                raise ValueError('El paquete contiene una entrada no regular.')
            data = archive.extractfile(item).read()
            dest = target / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            copied.add(relative)
            if relative.endswith('.js'):
                text = data.decode('utf-8')
                for path in re.findall(r"(?:from\s*|import\s*)['\"]([^'\"]+)['\"]", text):
                    if path.startswith('.'):
                        full = (dest.parent / path).resolve()
                        queue.append(full.relative_to(target.resolve()).as_posix())
                    elif path == 'three':
                        queue.append('build/three.module.js')
                    elif path.startswith('three/addons/'):
                        queue.append('examples/jsm/' + path[len('three/addons/'):])
                    else:
                        raise ValueError(f'Dependencia no prevista: {path}')
        if 'build/three.core.js' not in copied:
            raise ValueError('La instalación no incluye el núcleo esperado.')
    (ROOT / 'src/runtime.js').write_text('// Three.js local instalado por preparar_offline.py\nwindow.FORTIN_LOCAL_THREE = true;\n', encoding='utf-8')
    print(f'Listo: {len(copied)} archivos instalados. Ejecuta python run.py. El paseo ya no necesita CDN.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit(f'No se completó la instalación: {error}\nLa configuración anterior no se ha cambiado. Reintenta con conexión a Internet.')
