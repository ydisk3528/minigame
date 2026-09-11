# Rummy Cocos 工程

使用 Cocos Creator **3.8.6** 打开本目录，然后打开 `assets/scenes/Rummy.scene` 预览。

## 编辑入口

- `assets/prefabs/playable/RummyLobby.prefab`：大厅、五档房间和底栏。
- `assets/resources/deferred/RummyTable.prefab`：原版牌桌层级、座位、按钮、手牌分组和结算面板。
- `assets/prefabs/playable/PlayingCard.prefab`：牌面、点数、花色、人物牌图片引用。
- `assets/prefabs/playable/CardGroup.prefab`：组内 Layout、底条和牌型标签。
- `assets/prefabs/original`：23 个恢复出的原始预制体，作为布局参考。
- `assets/art`、`assets/animations`、`assets/audio`：恢复的图片、123 段动画及 29 个音频资源。

图片的 SpriteFrame、节点位置和尺寸都保存在场景/预制体里。运行时仅实例化重复牌预制体，并按牌局状态更换牌面、调整 Layout 和按钮状态。

`RummyApp.ts` 负责大厅、音效、余额和历史；`TableController.ts` 负责交互；`Round.ts` / `Rules.ts` 负责本地五人牌局。

## 构建与运行

运行 `build.ps1`，或使用 Creator 的 Web Mobile 构建面板。输出到 `build/web-mobile`。

运行 `python tools/serve.py`，打开 <http://127.0.0.1:8796/>。已有工作区服务时也可打开 <http://127.0.0.1:8795/RummaAPorject/build/web-mobile/>。

不要用 file:// 直接打开构建后的 HTML。

## 恢复依据及边界

原始资源保留在上级 `raw` 目录。`../analysis/source/classes` 是从原始客户端拆出的 100 段类代码索引，原始层级记录在 `../analysis/original-layout.json`。

大厅房间坐标和样式来自 Lobby 的 BTN_POS_L / BTN_TYPE_L；牌桌和按钮位置来自原 GameView；手牌宽度、组间距和重叠公式来自 CardMain。场景采用 1136×640 横屏，窄窗口等比留边。

这是基于原始资源与布局恢复的可编辑本地客户端。目前牌局由本地逻辑和四位电脑玩家驱动，房间档位、倒计时、余额是本地配置，未接原版服务器。匹配/账号、部分原版动画事件和竖屏切换尚未恢复，不能标为完整 1:1 原版。

头像追踪已确认原版 `GameView` 调用 `randomAvatar()`，随后 `MainGame` 调用公共模块 `setPlayerIconImg()`。现有下载文件中没有找到人物头像，因此不能把缺失原因直接归为服务端未返回头像；公共模块的具体图片路径仍需追踪。

已接入原动画：开局提示、对手四座摸牌/弃牌、回合光圈、理牌、结算进场/等待/退场。动画节点及引用保存在预制体，`TableController` 只控制播放时机和完成事件；`CardView` 播放原始理牌曲线。结算彩带的两个粒子轨道因发射器/材质未恢复而暂时不绑定，原始 CCONB 保留，遗漏记录见 `tools/original-motion-source.json`。发牌整体流程、本人出牌飞行等仍待接入。

## 工具注意事项

`tools/author-client.py` 是资源恢复阶段的生成工具，会重写场景和 playable 预制体。**在 Creator 中编辑后不要随意运行它**；正常构建不需要运行恢复工具。

规则检查：`tsc assets/scripts/Round.ts assets/scripts/Rules.ts --target ES2022 --module commonjs --outDir temp/round-check --skipLibCheck` 后运行 `node tools/round.test.cjs`。

实际 Creator 构建代码检查：PowerShell 设置 `$env:RUMMY_BUILT='1'` 后运行 `node tools/round.test.cjs`。

## 大厅优先加载与发布

首场景仅保留大厅和小面板。进入房间时加载 `assets/resources/deferred/RummyTable.prefab` 整个牌桌预制体，牌面、动画、结算及音效仍在预制体内绑定。已加载的牌桌可重复使用。

`assets/prefabs/playable/LoadingOverlay.prefab` 是可编辑的图片绑定转圈预制体。等待时显示 `Loading… N%`，按 Cocos 完成资源项/总资源项更新，不代表下载字节比例；成功后隐藏，失败显示点击重试，期间阻止重复进房间。

大厅出现后加载当前玩家的 `resources/deferred/AvatarN.prefab` 和 `LobbyMusic.prefab`，不阻塞大厅交互。头像下载完成前保留头像框。

首场景源图片/音频引用从约 19.10 MiB / 240 项降到 1.38 MiB / 68 项（不包括引擎、JSON、脚本，不等于网络传输量）。`python tools/check_loading.py` 检查首场景隔离；`python tools/check-motion.py` 检查动画绑定。

发布配置为 Release，关闭 source maps，开启 MD5 缓存名。部署时上传整个 `build/web-mobile`，包括 `assets/resources`，不能只替换 index.html 或 main。当前仅生成本地构建，未上传服务器。

`author-client.py` 恢复生成的最后一步会调用 `split_loading.py`，保持首场景优化；不要在编辑器手工调整后随意运行恢复工具。

Auto Sort：手牌顺序、分组未变化时使用现有 Confirmation 预制体显示 Already sorted 提示，仅一个 OK；有变化时正常理牌。
