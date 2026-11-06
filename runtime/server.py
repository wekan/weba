#!/usr/bin/env python3
"""Local Gambas CGI host preserving runtime and database environment settings."""
import argparse
import errno
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import subprocess
import urllib.parse


def handler(application, runner, environment):
    class GambasHandler(BaseHTTPRequestHandler):
        def do_GET(self): self.run_cgi()
        def do_POST(self): self.run_cgi()
        def log_message(self, *args): pass  # Gambas update URLs can contain passwords.
        def run_cgi(self):
            try:
                self._run_cgi()
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                self.close_connection = True

        def _run_cgi(self):
            url = urllib.parse.urlsplit(self.path)
            env = environment.copy()
            env.update(REQUEST_METHOD=self.command, SCRIPT_NAME='/', PATH_INFO=url.path,
                       QUERY_STRING=url.query, SERVER_NAME=self.server.server_address[0],
                       SERVER_PORT=str(self.server.server_port), SERVER_PROTOCOL='HTTP/1.1',
                       REMOTE_ADDR=self.client_address[0], GATEWAY_INTERFACE='CGI/1.1')
            for key in ['Host', 'Cookie', 'User-Agent', 'Accept', 'Accept-Language']:
                if key in self.headers: env['HTTP_' + key.upper().replace('-', '_')] = self.headers[key]
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 <= length <= 20 * 1024 * 1024:
                    self.send_error(413); return
                env.update(CONTENT_LENGTH=str(length), CONTENT_TYPE=self.headers.get('Content-Type', ''))
                result = subprocess.run([runner, str(application)], input=self.rfile.read(length),
                                        env=env, capture_output=True, timeout=30)
                headers, separator, body = result.stdout.partition(b'\r\n\r\n')
                if not separator: headers, separator, body = result.stdout.partition(b'\n\n')
                if result.returncode or not separator: raise RuntimeError('CGI failed')
                parsed = []
                status = 200
                for header in headers.splitlines():
                    if b':' not in header: continue
                    key, value = header.decode().split(':', 1)
                    if key.lower() == 'status': status = int(value.strip().split()[0])
                    elif key.lower() not in ['content-length', 'connection', 'transfer-encoding']:
                        parsed.append((key, value.strip()))
                self.send_response(status)
                for key, value in parsed: self.send_header(key, value)
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                raise
            except (ValueError, OSError, RuntimeError, subprocess.TimeoutExpired):
                self.send_error(500, 'Gambas request failed')
    return GambasHandler


def bind_server(host, port, request_handler, preferred_port=8080):
    """Prefer 8080 by default; let the OS atomically choose a free fallback.

    Explicit ports (including Docker's mapped port) must not silently change.
    """
    try:
        return ThreadingHTTPServer((host, preferred_port if port is None else port), request_handler)
    except OSError as error:
        if port is not None or error.errno != errno.EADDRINUSE:
            raise
        return ThreadingHTTPServer((host, 0), request_handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', required=True, type=Path)
    parser.add_argument('--runner', default='gbr3')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=None,
                        help='Explicit port (0 selects a free port); default prefers 8080 and falls back to a free port')
    parser.add_argument('--data', type=Path, default=Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share'))) / 'weba')
    args = parser.parse_args()
    args.data.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env.setdefault('WEBA_DB_HOST', str(args.data.resolve()))
    server = bind_server(args.host, args.port, handler(args.app.resolve(), args.runner, env))
    print(f'WeBa: http://{args.host}:{server.server_port} — data: {args.data}', flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == '__main__': main()
