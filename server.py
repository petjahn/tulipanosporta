#!/usr/bin/env python3
"""
Tulipános Porta - Local Development Server
Serves static files and proxies Google Calendar iCal requests (mirroring Netlify's _redirects).

Usage:
    python3 server.py [PORT]
Default port: 3000
"""

import sys
import http.server
import urllib.request
import urllib.parse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000

class NetlifyDevHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Mirror Netlify's /api/calendar/:calendarId rewrite rule
        if self.path.startswith('/api/calendar/'):
            raw_target = self.path[len('/api/calendar/'):].split('?')[0]
            # Decode to get pure calendar ID
            cal_id = urllib.parse.unquote(raw_target)
            
            # Target Google Calendar iCal address
            if cal_id.startswith('http'):
                gcal_url = cal_id
            elif '/private-' in cal_id:
                gcal_url = f"https://calendar.google.com/calendar/ical/{cal_id}"
            elif 'private-' in cal_id:
                gcal_url = f"https://calendar.google.com/calendar/ical/{cal_id}/basic.ics"
            else:
                gcal_url = f"https://calendar.google.com/calendar/ical/{urllib.parse.quote(cal_id)}/public/basic.ics"
            
            try:
                req = urllib.request.Request(
                    gcal_url,
                    headers={'User-Agent': 'Mozilla/5.0 (compatible; TulipanosPortaServer/1.0)'}
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'text/calendar; charset=utf-8')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    self.end_headers()
                    self.wfile.write(data)
                    return
            except urllib.error.HTTPError as e:
                self.send_response(e.code)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f"Google Calendar upstream error: {e.reason}".encode('utf-8'))
                return
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f"Proxy error: {str(e)}".encode('utf-8'))
                return

        # Default static file serving
        return super().do_GET()

if __name__ == '__main__':
    # Allow address reuse
    http.server.HTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NetlifyDevHandler)
    print(f"============================================================")
    print(f" Tulipános Porta Dev Server running at http://localhost:{PORT}")
    print(f" Proxying /api/calendar/* -> Google Calendar iCal")
    print(f"============================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
