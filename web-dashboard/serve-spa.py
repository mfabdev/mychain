#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='build', **kwargs)
    
    def do_GET(self):
        # Serve index.html for all routes (except static assets)
        if self.path.startswith('/static/') or self.path == '/favicon.ico' or self.path.endswith('.json'):
            # Serve the file normally
            super().do_GET()
        else:
            # For all other routes, serve index.html
            self.path = '/index.html'
            super().do_GET()

PORT = 3000

with socketserver.TCPServer(("", PORT), SPAHTTPRequestHandler) as httpd:
    print(f"Server running at http://localhost:{PORT}/")
    httpd.serve_forever()