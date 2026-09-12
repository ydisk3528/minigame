# Teen Patti 发布资源与分析

来源：<https://jiligames.com/PlusIntro/72?showGame=true>。
试玩跳转到 `casino-wbgame.jiligames.com/teenpatti/`，游戏 ID 72，发布引擎 Cocos 3.8.5。

## 下载结果

| 清单 | 条目 | 字节 | 结果 |
| --- | ---: | ---: | --- |
| `manifest.json` | 163 | 13,338,570 | 本体与引擎，下载成功，逐文件 SHA-256 一致 |
| `common-manifest.json` | 10 | 3,057,878 | 公共框架脚本、配置及三个 ZIP，下载成功 |
| `common-assets-manifest.json` | 739 | 37,099,816 | 公共框架导入数据、图片、音频、骨骼等，下载成功，SHA-256 一致 |

不同清单可能包含配置文件的重叠记录，条目数不是去重后的目录文件数。ZIP 已检查 CRC 和解压路径安全，原 ZIP 与解压数据均保留。

清单记录每个文件的源 URL、路径、字节数和 SHA-256。复核结果保存在 `acquisition-verification.json`。

## 目录

- `assets/game`：本体资源包，包括打包序列化数据、71 段 CCONB 动画、原始图集及音频。
- `assets/main`：主要发布脚本、启动数据、大厅背景和标题图。
- `assets/internal`：原始引擎内部资产。
- `cocos-js`、`src`：原始引擎模块、WASM、加载器和设置。
- `common`：Entry 加载流程引用的 Annin 3.8 公共框架资源。
- `lang-en-us.json`、`lang-common-en-us.json`：游戏及公共英文文本。
- `analysis/classes`：按 `_RF.push` 类标记从发布 bundle 中提取的类代码；发布代码不能等同于原工程 TypeScript 源码。
- `reference-table.png`、`reference-lobby.png`：源站介绍页的牌桌及入桌说明截图。
- `source-page.html`、`trial-page.html`：分析时取得的入口 HTML。

## 主要发现

原版横屏设计尺寸为 1136×640。Lobby 类定义房间按钮布局；GameView、MainGame_PrefabControl、TP_Define 负责客户端状态与显示。底注、加注、弃牌、看牌、侧比牌及 SHOW 在客户端有动作枚举，但结果通过服务器消息传入。

动态资源绑定已追溯：大厅背景与标题来自 main 包，人物骨骼为 IndiaGirl；这些绑定已写入可编辑工程预制体。图集可恢复为独立 SpriteFrame，CCONB 曲线已解码为可编辑动画关键帧。

原厂服务器、账号、钱包和匹配逻辑不在下载资源中。新工程使用本地牌局替代联网游戏过程；原始发布目录不保证脱离官方服务即可独立运行。

## 可重复执行的工具

`download.py` 下载游戏本体，`download_common.py` 下载共享脚本/ZIP，`download_common_assets.py` 补齐共享资源。均以已经观察到的发布配置和资源清单为依据，保留原始文件，不会修改可编辑工程。

工程在相邻 `../TEENPATTIA` 目录；工程 README 说明编辑与构建方式。
