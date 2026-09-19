#!/usr/bin/env python3
"""Run the browser app with Python's standard library. No pip installation needed."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import argparse
import threading
import webbrowser

APP=Path(__file__).with_name('CardTruth.html')
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] not in ('/','/CardTruth.html'):
            self.send_error(404);return
        payload=APP.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(payload)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('X-Frame-Options','DENY')
        self.end_headers();self.wfile.write(payload)
    def log_message(self,format,*args):pass

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=8765);p.add_argument('--no-open',action='store_true');args=p.parse_args()
    if not 1024<=args.port<=65535:p.error('Port must be 1024..65535')
    if not APP.is_file():p.error('Keep launch.py next to CardTruth.html')
    try:server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    except OSError as e:p.error(f'Cannot open port {args.port}: {e}. Try --port 8766')
    url=f'http://127.0.0.1:{args.port}/'
    print(f'CardTruth is running at {url}\nImages stay in the browser. Press Ctrl+C to stop.',flush=True)
    if not args.no_open:threading.Timer(.5,lambda:webbrowser.open(url)).start()
    try:server.serve_forever()
    except KeyboardInterrupt:print('\nStopped.')
    finally:server.server_close()
if __name__=='__main__':main()
