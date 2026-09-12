# Teen Patti 可编辑 Cocos 工程

使用 **Cocos Creator 3.8.6** 打开当前目录，打开 `assets/scenes/TeenPatti.scene`。
主场景只保留 quickSetting、通用小弹窗和 Loading。大厅、牌桌及结算预制体按需下载并实例化，图片、布局、按钮、牌面和动画引用仍直接绑定在预制体内。

## 编辑入口

- `assets/prefabs/playable/TeenPattiQuickSetting.prefab`：恢复的原版 quickSetting 底板、布局、图标和按钮。在大厅选房、加载牌桌后显示它；Switch Table 返回大厅，Play Now 才扣底注并发牌。后续选房也显示对应四项参数，不再使用通用说明弹窗。

- `assets/resources/deferred/TeenPattiLobby.prefab`：原版大厅背景、人物骨骼、五档房间、余额和底栏。
- `assets/resources/deferred/TeenPattiTable.prefab`：原版牌桌、五个座位、手牌、倒计时圈、下注按钮、比牌与赢家效果。
- `assets/prefabs/playable/TeenPattiDialog.prefab`：规则和比牌确认。
- `assets/resources/deferred/TeenPattiWinner.prefab` / `TeenPattiLose.prefab`：独立胜负结算面板，已静态绑定背景、皇冠/缎带、牌面和按钮；显示净输赢、余额、牌型与赢家，支持继续、回大厅和关闭。
- `assets/prefabs/original`：26 个恢复的原始预制体，保留作对照。
- `assets/art`：385 张从原始图集恢复的独立图片，另含 8 张本地替代头像。
- `assets/animations`：71 段从 CCONB 恢复的动画及可编辑曲线。
- `assets/spine/IndiaGirl`：原始人物骨骼、图集、图片。
- `assets/audio`：16 个原始音频。
- `assets/scripts/TeenPattiRules.ts`：可独立检查的牌型和本地五人牌局。
- `assets/scripts/TeenPattiApp.ts`：界面交互、电脑玩家、动画调度及存档。

## 已接入的本地流程

入房规则说明、发牌、看牌、盲注/看牌跟注、加注、弃牌、侧比牌请求和接受/拒绝、两人比牌、倒计时弃牌、四轮盲注后自动看牌、底池封顶、胜负结算、继续下一局、退出确认、音效开关及余额/战绩保存。

每桌头像不重复。头像复用了工作区此前生成的 RummyA 人物素材，来源记录在 `tools/avatar-provenance.json`，没有将其标为原版 Teen Patti 头像。

初始练习币 10,000；不足最低房间门槛时，可在大厅 Rules 中补充练习币。没有测试胜负按钮。

存档同时支持浏览器 `localStorage` 和已有 Android 宿主的 `window.cocosJava.getGameSave()` / `setGameSave(json)`。Native 桥接需要宿主提供，当前不是 Android 实机验证结果。

## 构建和运行

```powershell
.\build.ps1
python tools\serve.py
```

预览地址：<http://127.0.0.1:8798/>。完整构建输出位于 `build/web-mobile`，不能用 `file://` 直接运行。

## 资源分析与恢复依据

源站：<https://jiligames.com/PlusIntro/72?showGame=true>，游戏 ID 72，原发布引擎 3.8.5，横屏设计尺寸 1136×640。

原始发布文件保存在 `../coderesoures`，包括本体 JS、JSON、CCONB、图集、音频、引擎 JS/WASM，以及公共框架脚本、ZIP 和图片资源。下载清单保存 URL、字节数、SHA-256，具体见该目录的 README。

`../coderesoures/analysis/classes` 是从发布 bundle 中按类标记拆出的代码片段，仍是发布代码，不是原始 TypeScript 源文件。`tools/reference/game` 保留解码后的原始序列化对象；`tools/recovery-report.json` 记录图片、预制体、动画以及未迁移的组件和引用。

## 边界

这是基于原始界面与资源恢复的**本地可编辑客户端**。服务端源码不会包含在浏览器资源中，牌局由新写的本地逻辑和电脑玩家驱动，没有接原厂账号、匹配、钱包、彩金、任务或充值服务。牌型排序、平局和封顶处理采用 README 对应代码中的本地规则，不能据此声称还原了服务器算法或收益分布。

预制体保留原版布局与资源；本地规则、帮助和结算说明使用新写的控制逻辑。不能标为原始完整源码或已经逐帧确认的 1:1 复刻。

WINNER / LOSE 面板使用恢复的原版图片重新编排，标题为可编辑文字，入场为本地滑入效果。下载资源和原始 `playResult/resultPlayer` 调用中没有找到独立的同名面板，不能将这两套界面描述为原厂完整预制体或原版结算动画。它们替换了之前的通用文字结算弹窗。

`tools/author.py`、`tools/recover.py` 是一次性恢复工具，会重写生成的资产。在 Creator 中手动修改后，不要随意再次执行；正常构建无需运行它们。

验证范围及仍需确认的项目见 `VERIFICATION.md`。

## 网络分批加载

- 启动只异步加载大厅并显示大厅，不弹 quickSetting、不加载牌桌及结算面板。
- 大厅选房后调用 `resources.load('deferred/TeenPattiTable')`，加载成功进入牌桌并显示 quickSetting；Play Now 才扣底注、发牌。牌面、头像与 16 个音频由牌桌的 `DeferredAssets` 组件携带。
- 启动加载 `deferred/TeenPattiLobby`，Switch Table 直接返回已加载的大厅，包括大厅背景、人物骨骼和头像。大厅音乐不会提前下载，首次加载牌桌后开始使用。
- 结算时只加载实际需要的 `TeenPattiWinner` 或 `TeenPattiLose`。结算及存档先完成，下载失败重试不会重复奖励。
- Loading 显示转圈和资源完成数量百分比（不是字节百分比）；失败显示 Retry / Back。已加载界面在本次页面会话内复用。
- 服务器只需部署完整 `build/web-mobile` 静态目录，包括 `assets/resources` 等子目录，无需额外下载接口。分批加载减少首屏依赖，不减少完整游戏的总资源量。
- 构建采用 `debug: false`、`sourceMaps: false`。主场景源文件约 107 KB、43 个节点、13 个不同的直接资产引用；原来约 4.58 MB、1,512 个节点、290 个引用。这是源资产静态统计，不是实测网络流量或首屏耗时。

`tools/defer_assets.py` 为一次性迁移工具，已运行。正常打开工程和构建不需要再次执行恢复/作者工具；手动编辑后不要重新生成覆盖资产。
