"""Serve the complete build on localhost without changing working directories."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'build/web-mobile'
if not (root/'index.html').exists():raise SystemExit('Run build.ps1 first')
print('Teen Patti: http://127.0.0.1:8798/',flush=True)
ThreadingHTTPServer(('127.0.0.1',8798),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
