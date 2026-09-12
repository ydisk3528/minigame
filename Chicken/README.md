# Chicken Dash 10000 — Cocos 本地还原工程

工程目录：`E:\wg\cocos\minigame\Chicken`。使用 **Cocos Creator 3.8.6** 打开，入口为 `assets/scenes/Chicken.scene`。

当前可玩版本已改为 **1136 × 640 横屏**：启动页、道路视野、底部操作栏、设置、规则、胜负和转盘面板统一适配，Web 构建方向为 landscape。`tools/landscape.py` 可对现有预制体应用横屏布局，初次生成脚本也会自动执行此步骤。

参考页面：https://jiligames.com/PlusIntro/748?showGame=true 。公开试玩发布包使用 Cocos 3.8.5，画面设计尺寸为 640 × 1136。

## 目录

| 路径 | 内容 |
| --- | --- |
| `coderesoures/` | 下载的原始发布文件、入口页面、脚本和资源清单 |
| `coderesoures/manifest.json` | 146 个文件的源 URL、大小、SHA256；当前无下载失败 |
| `coderesoures/analysis/classes/` | 按类名拆分的原客户端代码，供对照分析 |
| `assets/art/` | 从图集中恢复的 207 张独立图片，保留 SpriteFrame 绑定 |
| `assets/spine/` | 15 组原始二进制 Spine、atlas 和纹理 |
| `assets/audio/` | 38 个原始音频 |
| `assets/animations/` | 恢复的 17 段 Cocos 动画 |
| `assets/prefabs/` | 42 个恢复的原始预制体，作编辑参考；原站私有组件未运行 |
| `assets/resources/deferred/` | 5 个已接入本地逻辑的可编辑预制体 |
| `assets/scripts/` | 本地玩法、存档与加载控制器 |
| `tools/` | 资源解包、工程生成、检查和回归脚本 |

## 已接入的玩法

- 三档难度、下注选择、开始、连续跳跃、碰撞失败与随时兑现。
- 小鸡、车辆、路障使用原始 Spine；道路、按钮及面板图片直接绑定在预制体中。
- 胜负结算、记录、规则、声音和加速控制。
- 自动游戏可设置回合数、兑现步数、亏损上限和盈利目标；停止后当前回合交回玩家操作。
- 奖励袋和转盘；三个等级的转盘数值来自公开客户端，奖励与主回合分开结算。
- 两位小数金额；本地余额不足时可主动领取虚拟试玩积分。
- 存档使用 RummyA 相同的 localStorage / `window.cocosJava.getGameSave()` / `setGameSave(json)` 桥接模式。游戏标识与存储键独立。
- 下注、步数结果、待领取奖励和最终结算均及时保存。刷新会恢复未结束回合，不能重复抽取已确定的奖励或重复结算。

## 动态加载

`Chicken.scene` 只包含相机、Canvas、Logo、加载提示及重试按钮，不静态引用游戏预制体和音效。

`ChickenBoot.ts` 通过 `resources.load('deferred/ChickenGame')` 加载主玩法并显示进度。以下面板在第一次打开时单独加载，随后复用：

- `ChickenAuto.prefab`：自动游戏设置。
- `ChickenBonus.prefab`：奖励转盘。
- `ChickenResult.prefab`：胜负结算。
- `ChickenDialog.prefab`：规则、记录和虚拟积分提示。

主场景所在的 `main` 构建包约 25 KB；这是场景包大小，**不是首次访问的总下载量**。浏览器仍需下载 Cocos 引擎和基础内置资源。具体构建体积见 `tools/asset-audit.json`。

## 与原站的边界

美术、音频、骨骼和参考节点来自下载的公开客户端；没有接入原站账户、支付或服务器。

客户端从服务器接收难度倍率表、碰撞结果和奖励结果，下载文件不包含完整服务器算法。本工程的概率、倍率、奖励触发与自动结算是**本地实现**，集中在 `ChickenRound.ts`，不代表原站 RTP 或开奖规则。道路数量和奖励流程按客户端线索组织；原站的道具卡、转盘升级演出、通用活动入口等未完整重建。当前转盘使用原始转盘图片配合本地转动动画，原始 Wheel Spine 也保留在奖励预制体中供继续编辑。

主要布局从原始节点恢复后重新排为横屏，补充面板使用原图重新组合；没有声称逐像素复刻。窗口保持横屏设计比例，游戏根 Mask 裁切道路，避免道路溢出。

## 构建与检查

在本目录 PowerShell 执行：

```powershell
tsc --noEmit --skipLibCheck --lib 'es2020,dom'
.\build.ps1
C:\Python314\python.exe tools\audit_assets.py
C:\Python314\python.exe tools\serve.py
```

本地预览：http://127.0.0.1:8799/ 。Web 输出为 `build/web-mobile`，部署时上传整个目录。资源都是相对 URL，可放在服务器子目录中。

控制器回归（不包含渲染器）：

```powershell
tsc assets\scripts\ChickenRound.ts assets\scripts\GameSave.ts assets\scripts\ChickenGame.ts assets\scripts\ChickenBoot.ts --target es2020 --module commonjs --experimentalDecorators --skipLibCheck --outDir tools\test-build --types ./temp/declarations/cc --lib 'es2020,dom'
node tools\rules.test.cjs
node tools\flow.test.cjs
```

`flow.test.cjs` 读取实际预制体节点并运行实际控制器，覆盖加载失败/重试、快速连点、胜负、奖励重复领取和自动停止。故意注入的网络失败会打印 `simulated failure`，最终应输出 `PASS`。

资源恢复可运行 `coderesoures/download.py` 和 `tools/recover.py`。**手动修改预制体后不要直接运行 `tools/author.py`**：它是初次工程生成脚本，会重写已生成的玩法预制体和场景。

浏览器已进行主界面、小鸡/车辆骨骼、首轮过路和兑现面板检查；更多验证记录见 `tools/verification.md`。构建通过不代表已在真机或实际服务器环境验证。
