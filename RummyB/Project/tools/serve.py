from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1] / 'build/web-mobile'
    print('http://127.0.0.1:18034/', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 18034), partial(Handler, directory=str(root))).serve_forever()
