# 心跳

一个用 HTML + Python 写的全屏心跳粒子动画。

## 运行

```bash
python server.py
```

或者用 `py server.py`。启动后浏览器会自动打开 `http://127.0.0.1:8000/`。

不想起服务也可以直接双击 `index.html`。

想让姐姐大人用手机看：

```bash
python server.py --share
```

然后手机连同一个 WiFi，打开终端里显示的地址。

正式使用已经部署到公网，所有网络都能打开：

```text
https://wuy-dd.github.io/heart-love/
```

## 更新内容并重新发布

1. 照片放进 `photos/`，命名 `01.jpg`、`02.jpg`……；视频命名 `01.mp4`、`02.mp4`……
2. 长信正文、照片配文、便利贴情话都在 `content.js` 里改。
3. 本地预览：

```bash
python server.py
```

4. 生成新的公网二维码（可选）：

```bash
python qrcode_gen.py --url https://wuy-dd.github.io/heart-love/
```

5. 发布到 GitHub Pages：

```bash
git add -A
git commit -m "update love page"
git push origin main
```

等一两分钟，访问上面的公网地址即可看到最新内容。

## 秘密

完整流程：

1. 打开页面，先看到一封信封，点开信封是一封长信和照片流。
2. 看到底后点“还有些小纸条，想给你看”，飞出一堆写满情话的便利贴。
3. 点“还有一颗心，想给你看”，进入爱心动画。
4. 触发第一句藏在心跳里的话，方式二选一：

1. 在页面上按顺序输入 `5201314`；或
2. 按住爱心中心约 1.2 秒。

5. 第一句话散回后，再按 `5201314` 或长按爱心，会出现“可以做我的女朋友吗？”。
6. 点“不愿意”会让“我愿意”越来越大、自己越来越小；点“我愿意”会出现庆祝画面。
7. 庆祝画面点一下或等 8 秒，会回到最开始的那封信，可以重新看一遍。

这句话在 `heart.js` 里以 Unicode 码点保存，普通打开源码也看不到明文。
