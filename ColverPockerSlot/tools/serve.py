"""Local-only preview server; silence per-asset logging to avoid pipe backpressure."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8770);args=p.parse_args()
root=Path(__file__).resolve().parents[1]/'build/web-mobile'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*args):pass
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
print(f'Preview http://127.0.0.1:{args.port}',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
