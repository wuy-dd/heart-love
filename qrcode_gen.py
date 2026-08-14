#!/usr/bin/env python3
"""生成一张漂亮的二维码图片，扫码即可打开表白页面。

用法：
    python qrcode_gen.py                 # 自动用本机局域网地址
    python qrcode_gen.py --port 8765     # 指定端口（要和 server.py 一致）
    python qrcode_gen.py --url https://xxx.trycloudflare.com   # 用公网地址

生成的图片：qr_love.png
"""

import argparse
import os
import socket

import segno
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))

PINK = (255, 95, 126)
DEEP = (200, 60, 95)
CARD = (255, 248, 246)
INK = (110, 60, 78)


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


def load_font(size, bold=False):
    names = [
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/simkai.ttf",
    ]
    for name in names:
        if os.path.exists(name):
            try:
                return ImageFont.truetype(name, size)
            except Exception:
                continue
    return ImageFont.load_default()


def centered(draw, text, font, cx, y, fill):
    box = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (box[2] - box[0]) / 2 - box[0], y), text, font=font, fill=fill)
    return box[3] - box[1]


def build(url, out, title, sub):
    qr_img = segno.make(url, error="h")
    tmp = os.path.join(HERE, "._qr_tmp.png")
    qr_img.save(tmp, scale=18, border=2, dark="#c83c5f", light="#fff8f6")
    code = Image.open(tmp).convert("RGB")

    side = code.width
    pad = int(side * 0.14)
    head = int(side * 0.30)
    foot = int(side * 0.26)
    W = side + pad * 2
    H = head + side + foot

    canvas = Image.new("RGB", (W, H), CARD)
    draw = ImageDraw.Draw(canvas)

    # 顶部柔和粉色渐变
    for y in range(head):
        u = y / max(1, head - 1)
        r = int(PINK[0] + (CARD[0] - PINK[0]) * u)
        g = int(PINK[1] + (CARD[1] - PINK[1]) * u)
        b = int(PINK[2] + (CARD[2] - PINK[2]) * u)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    draw.rounded_rectangle([6, 6, W - 7, H - 7], radius=int(side * 0.06),
                           outline=(255, 200, 214), width=4)

    f_title = load_font(int(side * 0.085), bold=True)
    f_sub = load_font(int(side * 0.05))
    f_url = load_font(int(side * 0.038))

    cx = W / 2
    y = int(head * 0.20)
    y += centered(draw, title, f_title, cx, y, (255, 255, 255)) + int(side * 0.055)
    centered(draw, sub, f_sub, cx, y, (255, 235, 240))

    canvas.paste(code, (pad, head))

    fy = head + side + int(foot * 0.16)
    fy += centered(draw, "\u2661  \u626b\u4e00\u626b", f_sub, cx, fy, PINK) + int(side * 0.05)
    centered(draw, url, f_url, cx, fy, INK)

    canvas.save(out, "PNG")
    os.remove(tmp)
    return out


def main():
    p = argparse.ArgumentParser(description="生成表白页二维码")
    p.add_argument("--url", help="完整网址，留空则用局域网地址")
    p.add_argument("--port", type=int, default=8765, help="端口，默认 8765")
    p.add_argument("--out", default="qr_love.png", help="输出文件名")
    p.add_argument("--title", default="\u7ed9 \u59d0\u59d0\u5927\u4eba", help="标题")
    p.add_argument("--sub", default="\u6709\u4e00\u5c01\u4fe1\uff0c\u5728\u91cc\u9762\u7b49\u4f60", help="副标题")
    a = p.parse_args()

    url = a.url or "http://%s:%d/" % (lan_ip(), a.port)
    out = a.out if os.path.isabs(a.out) else os.path.join(HERE, a.out)
    build(url, out, a.title, a.sub)
    print("")
    print("  二维码已生成：%s" % out)
    print("  指向地址：%s" % url)
    print("  提醒：手机要和电脑连同一个 Wi-Fi，并且 server.py 用 --share 启动。")
    print("")


if __name__ == "__main__":
    main()
