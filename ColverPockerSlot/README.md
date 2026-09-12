# ColverPockerSlot — Cocos Creator 3.8.6

在 Cocos Dashboard 中添加当前目录，打开 `assets/scenes/CloverSlot.scene`，点击预览即可运行。

## 已完成

- 5 列 × 4 行、原客户端的 100 条中奖线路。
- 原图背景、转轴框、符号、四个奖池、Logo，以及原版 Clover 角色、符号、Wild、中奖线、大赢及奖励 Spine。
- 每列 6 个连续滚动符号（上下缓冲），逐列停轴、下压回弹、手动停轴、加速停轴。
- 原版符号 Win、Wild Action/Expand 和列光效、收集飞行、角色收集、WinLine 骨骼连线。
- Big/Mega/Super Win 金币 Spine 和金额滚动；奖励入场、卡牌结算 Spine。
- 投注调整、25 次自动转动/停止、加速、空格转动。
- 设置、声音开关、规则、演示赔付表、最近记录、演示余额重置。
- 翻牌奖励：收集三个相同花色，支持 ×2/×5 叠乘、移除梅花卡；设置中的 BONUS 可直接预览。
- 余额、投注、声音和最近记录保存在本机浏览器。

## 编辑位置

- `assets/scenes/CloverSlot.scene`：轻量启动场景，只保留相机和加载控制器。
- `assets/clover/core/CloverMain.prefab`：当前运行使用的主界面与 CloverApp，含转轴、符号、奖池和按钮。修改主界面请编辑这里；旧 `assets/prefabs/playable/CloverGame.prefab` 仅为参考副本。
- `assets/clover/panels/CloverDialog.prefab`：设置和规则弹窗。
- `assets/clover/panels/CloverBonus.prefab`：15 张可编辑翻牌按钮，内嵌原版 CardArt 层级和 7 个动画剪辑。
- `assets/prefabs/playable/SlotSymbol.prefab`：图片已绑定的独立符号模板。
- `assets/prefabs/*.prefab`：27 个原客户端恢复预制体，已展开嵌套实例。
- `assets/art`、`assets/spine`、`assets/animations`、`assets/clover/audio`：恢复后的美术、骨骼、动画与音频。
- `assets/scripts/CloverApp.ts`：交互与表现控制，游戏界面来自预制体，按钮首次使用时异步加载。
- `assets/scripts/CloverLoading.ts`：统一黑底 loading、真实资源完成项进度、失败重试和已加载资源复用。
- `assets/loading/spinner.png`：128×128 的 loading 图，3,421 字节；运行时旋转，百分比使用 Label。
- `build-templates/web-mobile/index.ejs`：引擎下载期间即可显示的网页 loading，内嵌同一张小图。
- `assets/scripts/ReelMotion.ts`：连续带状滚轴的位置、整圈停轴和回弹公式。
- `assets/clover/effects/Symbol_*.prefab`、`WaysRunEffect.prefab`、`FXEffect.prefab`：图片/骨骼引用已绑定的特效预制体。
- `assets/scripts/SlotRules.ts`：原版线路、本地演示结算和牌组逻辑。

`clover` 是按需加载的 Asset Bundle。启动场景不绑定主界面/弹窗预制体；主界面仅保留首屏依赖。

- 进入页面：黑底 loading → 下载主界面 → 完成初始化后显示。
- Settings：首次点击加载共用弹窗；Rules、Paytable、History、声音和余额重置共用该实例。
- SPIN：首次点击先准备符号特效与必要音频，成功后才扣除本次投注并开始转动。
- BONUS / 实际奖励触发：加载翻牌预制体、牌面、奖励动画和音频。
- BigWin：实际触发时加载。GameIntro 不再自动播放，不进入启动依赖。
- 未打开的界面不后台预加载。首次加载失败保留操作状态，显示 RETRY；成功后缓存，本次会话再次打开不重新下载。

资源阶段百分比按完成资源项统计，并非网络字节百分比；初始化结束才显示 100%。引擎启动阶段尚无可用的统一进度，显示 Loading 0% 和持续动画，不伪造进度。

## 构建和验证

```powershell
.\build.ps1
python tools/serve.py
```

浏览器打开 `http://127.0.0.1:8770/`。构建文件在 `build/web-mobile`，不能直接双击 HTML 使用 file 协议运行。

```powershell
tsc --noEmit --project . --lib 'es2020,dom' --skipLibCheck
tsc assets/scripts/SlotRules.ts assets/scripts/ReelMotion.ts --target es2020 --module commonjs --outDir tools/test-output --skipLibCheck
node tools/rules.test.cjs
node tools/reels.test.cjs
python tools/audit_assets.py
python tools/loading_audit.py
```

`skipLibCheck` 仅跳过 Cocos 随附声明库中的第三方类型问题，工程 TypeScript 仍做检查。

## 表现回归入口

普通入口不带参数。下列入口只用于检查表现，不写入余额存档：

- `/?qa=wild`：点击 SPIN，固定触发中间三列 Wild、中奖线和 Mega Win。
- `/?qa=cards`：设置 → BONUS，前 3 张依次是 ×2、×5、移除梅花；第 4/8/12 张为黑桃。
- `/?qa=gallery`：展示全部 10 种符号的原版 Spine Win 动画。
- `/?qa=symbol7`：点击 SPIN，触发 Super Win；可用 symbol0～symbol8 检查对应符号。

## 还原范围

这是恢复资源后重新编写离线控制逻辑的 Cocos 工程，不是原始 TypeScript 源码工程。按用户确认保留本地随机、赔付、奖励触发和翻牌结算。翻牌已实现三同花色奖励、×2/×5 叠乘及移除所有梅花卡；本地洗牌不能代替原版服务端的预先指定奖励序列。

官网文案写 5×3，但官方截图和客户端 `COL=5 / ROW=4` 一致，因此按 5×4 还原。官网试玩在本次浏览器环境卡在加载阶段；没有取得完整原版运行过程对照，运行验证针对本地还原工程。

`tools/author.py` 是旧的一次性场景生成工具，检测到新的加载结构后会主动退出，防止覆盖当前编辑。`tools/migrate_loading.py` 是已经执行过的一次性拆分工具，不应重复执行。`tools/recover.py` 会重写恢复资源。分析材料及来源见 `coderesoures/分析报告.md`。

## 加载回归

启动 `python tools/serve.py --port 8771` 后，使用安装有 Playwright 的 Node 环境运行 `node tools/loading.test.cjs`。可用 `CLOVER_TEST_URL` 和 `CHROME_PATH` 指定地址、Chrome 路径；若使用外部依赖目录，设置 `NODE_PATH`。截图和网络/资源记录输出到 `tools/test-output/`。

测试实际点击按钮，覆盖启动不加载弹窗、规则/赔付表/重复打开、翻牌及领取、请求失败后重试、加载完成前不扣余额、Wild 与 BigWin。默认使用独立无头 Chrome 上下文，不修改日常浏览器存档。生产服务器和真机表现需要单独验证。

loading 图片使用内置 imagegen 生成，提示为：纯黑背景、居中的小型白灰渐变圆环、极简平面 UI、无文字无装饰、用于代码旋转。生成结果作为 128×128 游戏素材导出，百分比不绘入图片。
