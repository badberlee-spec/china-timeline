[README.md](https://github.com/user-attachments/files/34324777/README.md)
# 中共党史专业刷题

**一张能拖动、能变色的中国历史地图，点开考点就能刷题。**

面向中共党史（含党的学说与党的建设）考研：76 个考点落在时间与空间上，680 道题按考点挂载。支持三种用法：在线网页、DSH 插件、离线单文件。

👉 **在线使用**：<https://badgerlee-spec.github.io/china-timeline/>

> 手机上打开后点「分享 → 添加到主屏幕」，可以当 App 用。

---

## 它长什么样

- **地图**：墨卡托投影，中国省级边界 + 全球底图，能拖能缩能全屏
- **年代图层**：拖年份滑杆 1840→2026，各省按当时势力范围变色
- **时间线**：1840–2026，点圆点选考点，点色带只看某一段
- **刷题**：选择题 / 名词解释 / 简答题 / 论述题，主观题可打字对照
- **错题本**：做错自动收，答对自动移出
- **统计**：分科目、分题型、最近七天的练习量

## 三种用法

| 用法 | 适合 | 怎么用 |
|---|---|---|
| 在线网页 | 手机、别人的电脑 | 打开上面的网址，或添加到主屏幕 |
| DSH 插件 | 本机常驻 | 见下方「安装为插件」 |
| 离线单文件 | 没网、U 盘拷贝 | 下载 `standalone/中共党史刷题-单文件.html`，双击打开 |

### 安装为插件

```bash
plugin_manager  action=install_bundle  target=<仓库目录的绝对路径>
```

装完刷新页面，左侧栏出现「中共党史专业刷题」。

## 快捷键

`← →` 上下考点 · `+ -` 缩放 · `空格` 切换年代图层 · `/` 搜索考点 · `Esc` 退出全屏

## 目录结构

```
.
├── index.html            在线版（单文件，给 GitHub Pages 用）
├── package.json          DSH 插件清单
├── cordis.patch.yml      插件装载补丁
├── index.js              Host 半边
├── client.js             插件构建产物
├── client.src.js         客户端源码
├── icon.svg              侧边栏图标
├── data/                 题库与地图数据
├── tools/                生成脚本（gen_map / merge / build）
└── standalone/           离线版
```

## 改题

题目在 `data/content.json`，直接改；或用 `data/quiz_*.json` 分片，然后：

```bash
python tools/merge.py    # 合并题库（按 id 去重）
python tools/build.py    # 重新生成 client.js
```

离线版的 `app.js` 和根目录的 `index.html` 由插件构建产物转换而来，重新生成见 `standalone/使用说明.txt`。

## 数据来源与声明

详见 [NOTICE.md](NOTICE.md)。

- 中国省级边界与九段线：阿里云 DataV.GeoAtlas
- 世界国家边界：Natural Earth（公有领域）
- 势力范围与行军路线：作者按公开史料整理的示意

⚠️ 地图为**教学示意图，不是标准地图**，不作为测绘、导航或出版依据。公开使用中国地图请遵守《地图管理条例》。

## License

代码 MIT，见 [LICENSE](LICENSE)。题库与数据说明见 NOTICE。
