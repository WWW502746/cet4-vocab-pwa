# 四级词汇学习 PWA

这是一个可直接上传到静态网站空间的手机端英语词汇学习程序，词库来自原始 Excel 文件。

## 本地预览

当前已启动本地服务：

```text
http://127.0.0.1:4173/
```

## 上传发布

把 `cet4-vocab-pwa` 文件夹里的全部文件上传到任意静态网站服务即可，例如 Netlify、Vercel、GitHub Pages、Cloudflare Pages 或普通虚拟主机。

需要一起上传的文件：

```text
index.html
styles.css
app.js
sw.js
manifest.webmanifest
assets/
data/
```

发布后，用手机浏览器打开网址。安卓 Chrome 通常会出现安装提示；iPhone Safari 可点分享按钮，再选择“添加到主屏幕”。
