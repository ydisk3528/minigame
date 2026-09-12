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
- 翻牌奖励：收集三个相同花色，支持 ×2/×5 叠乘、移除梅花卡；设置中的 BONUS DEMO 可直接预览。
- 余额、投注、声音和最近记录保存在本机浏览器。

## 编辑位置

- `assets/prefabs/playable/CloverGame.prefab`：主界面，含 20 个可见符号和 10 个缓冲符号节点、5 个列遮罩和底部按钮。
- `assets/prefabs/playable/CloverDialog.prefab`：设置和规则弹窗。
- `assets/prefabs/playable/CloverBonus.prefab`：15 张可编辑翻牌按钮，内嵌原版 CardArt 层级和 7 个动画剪辑。
- `assets/prefabs/playable/SlotSymbol.prefab`：图片已绑定的独立符号模板。
- `assets/prefabs/*.prefab`：27 个原客户端恢复预制体，已展开嵌套实例。
- `assets/art`、`assets/spine`、`assets/animations`、`assets/audio`：恢复后的美术、骨骼、动画与音频。
- `assets/scripts/CloverApp.ts`：交互与表现控制，界面来自场景/预制体，不通过脚本创建 UI。
- `assets/scripts/ReelMotion.ts`：连续带状滚轴的位置、整圈停轴和回弹公式。
- `assets/prefabs/playable/Symbol_*.prefab`、`WaysRunEffect.prefab`、`FXEffect.prefab`：图片/骨骼引用已绑定的特效预制体。
- `assets/scripts/SlotRules.ts`：原版线路、本地演示结算和牌组逻辑。

场景中的界面节点已关联对应的主界面/弹窗/奖励预制体。切换符号使用控制器 Inspector 中绑定的 SpriteFrame 数组。按钮图片、位置、尺寸可以直接在预制体中修改。

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
```

`skipLibCheck` 仅跳过 Cocos 随附声明库中的第三方类型问题，工程 TypeScript 仍做检查。

## 表现回归入口

普通入口不带参数。下列入口只用于检查表现，不写入余额存档：

- `/?qa=wild`：点击 SPIN，固定触发中间三列 Wild、中奖线和 Mega Win。
- `/?qa=cards`：设置 → BONUS DEMO，前 3 张依次是 ×2、×5、移除梅花；第 4/8/12 张为黑桃。
- `/?qa=gallery`：展示全部 10 种符号的原版 Spine Win 动画。
- `/?qa=symbol7`：点击 SPIN，触发 Super Win；可用 symbol0～symbol8 检查对应符号。
- `/?qa=intro`：重播 GameIntro。

## 还原范围

这是恢复资源后重新编写离线控制逻辑的 Cocos 工程，不是原始 TypeScript 源码工程。按用户确认保留本地随机、赔付、奖励触发和翻牌结算。翻牌已实现三同花色奖励、×2/×5 叠乘及移除所有梅花卡；本地洗牌不能代替原版服务端的预先指定奖励序列。

官网文案写 5×3，但官方截图和客户端 `COL=5 / ROW=4` 一致，因此按 5×4 还原。官网试玩在本次浏览器环境卡在加载阶段；没有取得完整原版运行过程对照，运行验证针对本地还原工程。

`tools/author.py` 是一次性场景生成工具，会重写生成的场景和预制体；手工编辑之后不要随意重跑。`tools/recover.py` 会重写恢复资源。分析材料及来源见 `coderesoures/分析报告.md`。
