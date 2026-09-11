"""Local-only test: hold table-exclusive images while first-screen assets load.

Run check_loading.py first. Create temp/hold-table.flag before launching;
remove that file to allow queued table downloads to continue.
"""
import json,time
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FLAG=ROOT/'temp/hold-table.flag'
TABLE=json.loads((ROOT/'tools/loading-report.json').read_bytes())['tableOnlyNativeUuids']
state={'heldRequests':0,'releasedRequests':0}

class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store');super().end_headers()
    def do_GET(self):
        if self.path=='/__probe':
            body=json.dumps(dict(state,holding=FLAG.exists())).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body);return
        if FLAG.exists() and any(uid in self.path for uid in TABLE):
            state['heldRequests']+=1
            deadline=time.monotonic()+120
            while FLAG.exists() and time.monotonic()<deadline:time.sleep(.1)
            if FLAG.exists():self.send_error(503,'Test: table assets held');return
            state['releasedRequests']+=1
        super().do_GET()

if __name__=='__main__':
    print('http://127.0.0.1:18038/ (table hold controlled by temp/hold-table.flag)',flush=True)
    ThreadingHTTPServer(('127.0.0.1',18038),partial(Handler,directory=str(ROOT/'build/web-mobile'))).serve_forever()
