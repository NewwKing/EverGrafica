#!/usr/bin/env python3
"""Servidor local para El Fortín Minero; sin dependencias, con Range para audio."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import re
import threading
import webbrowser

ROOT = Path(__file__).resolve().parent

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary',
        '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
        '.webp': 'image/webp', '.ico': 'image/x-icon'}

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def send_head(self):
        self.byte_range = None
        path = Path(self.translate_path(self.path))
        header = self.headers.get('Range')
        if not header or not path.is_file():
            return super().send_head()
        size = path.stat().st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', header.strip())
        if not match or not any(match.groups()) or size == 0:
            self.send_error(416, 'Invalid byte range')
            return None
        left, right = match.groups()
        if not left:
            count = int(right)
            start, end = max(0, size - count), size - 1
        else:
            start, end = int(left), min(int(right), size - 1) if right else size - 1
        if start >= size or end < start:
            self.send_response(416)
            self.send_header('Content-Range', f'bytes */{size}')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return None
        try:
            stream = path.open('rb')
        except OSError:
            self.send_error(404)
            return None
        self.send_response(206)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        self.byte_range = (start, end)
        return stream

    def copyfile(self, source, outputfile):
        if self.byte_range is None:
            try:
                return super().copyfile(source, outputfile)
            except (BrokenPipeError, ConnectionResetError):
                return
        start, end = self.byte_range
        source.seek(start)
        remaining = end - start + 1
        try:
            while remaining:
                chunk = source.read(min(128 * 1024, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt, *args):
        if len(args) < 2 or str(args[1]) not in ('200', '206', '304'):
            super().log_message(fmt, *args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('El puerto debe estar entre 1 y 65535.')
    server = None
    for port in range(args.port, min(args.port + 10, 65536)):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(ROOT)))
            break
        except OSError:
            continue
    if server is None:
        raise SystemExit('No hay un puerto disponible. Prueba: python run.py --port 9090')
    server.daemon_threads = True
    url = f'http://127.0.0.1:{server.server_port}/'
    print(f'\n EL FORTÍN MINERO\n {url}\n\n Mantén esta ventana abierta. Ctrl+C para terminar.\n', flush=True)
    if not args.no_browser:
        timer = threading.Timer(0.5, lambda: webbrowser.open(url))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nPaseo cerrado.')
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
