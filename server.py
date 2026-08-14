#!/usr/bin/env python3
"""Serve the heartbeat page with a tiny stdlib-only HTTP server."""

import argparse
import os
import socket
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write("[server] " + fmt % args + "\n")


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def main():
    parser = argparse.ArgumentParser(description="启动心跳页面")
    parser.add_argument("--port", type=int, default=8000, help="端口，默认 8000")
    parser.add_argument("--share", action="store_true", help="允许同一局域网的设备访问")
    parser.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    os.chdir(HERE)
    host = "0.0.0.0" if args.share else "127.0.0.1"
    port = args.port
    try:
        server = ThreadingHTTPServer((host, port), QuietHandler)
    except OSError:
        port = None
        for candidate in range(args.port + 1, args.port + 21):
            try:
                server = ThreadingHTTPServer((host, candidate), QuietHandler)
                port = candidate
                break
            except OSError:
                continue
        if port is None:
            sys.exit("端口 %d-%d 都不可用" % (args.port + 1, args.port + 20))

    if args.share:
        url = "http://%s:%d/" % (lan_ip(), port)
    else:
        url = "http://127.0.0.1:%d/" % port

    print("")
    print("  心跳页面已启动：%s" % url)
    print("  按 Ctrl+C 停止服务。")
    print("  秘密触发方式写在 README.md 里。")
    print("")

    if not args.no_open:
        webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
