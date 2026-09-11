"""Serve the existing Cocos build without modifying scene or prefab assets."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'build/web-mobile'
    if not (root / 'index.html').exists():
        raise SystemExit('Build the Cocos project first with build.ps1.')
    print('http://127.0.0.1:8796/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8796), partial(Handler, directory=str(root))).serve_forever()
