# RummyB — Cocos 工程还原

使用 **Cocos Creator 3.8.6** 打开本目录，打开 `assets/scenes/RummyB.scene`。
原始发布客户端 `../codesoures/.../fa00246/src/settings.json` 明确标注 **CocosEngine 3.8.2**，设计分辨率为 **1344 × 756**。


## 大厅优先加载（当前部署方式）

`RummyB.scene` 现在只包含大厅、菜单、状态提示和轻量加载遮罩。`assets/resources/deferred` 内的 TableView、ResultView、Help、ChangeAvatorView、AudioBank 都是完整可编辑的预制体，内部图片和动画仍直接绑定。DeferredAssets 保存随牌桌/音频预制体加载的卡面和音频引用，首场景不再直接引用这些资源。

大厅显示后启动音频下载与牌桌预加载。点击房间时等待牌桌准备完成；帮助、头像选择及结算第一次打开时加载，之后复用。网络失败显示可点击的重试提示。返回大厅或选择另一入口会使旧导航请求失效，避免迟到的请求把界面切回去。测试 WIN/LOSE 入口保持隐藏。

正常 UI 编辑请修改 `assets/scenes/RummyB.scene` 或 `assets/resources/deferred/*.prefab`。`assets/prefabs/OfflineApp.prefab` 保留为完整布局的恢复来源，不要再挂回首场景。`tools/split_loading.py` 从该完整来源重新生成轻量场景及分拆预制体；它会覆盖这些生成文件，日常修改后不要随意重跑。assemble_b.py 完整重新生成时会调用此拆分。

构建使用 Release，关闭 Source Maps，并启用 MD5 文件名。运行 `./build.ps1` 后，将 **build/web-mobile 整个目录的内容**上传到同一个部署目录，必须包含 assets/resources。先上传新资源再替换 index.html，可让仍打开旧页面的用户继续访问旧版本资源；不要立即清理旧哈希资源。index.html 建议重新校验缓存，带哈希的静态资源可长缓存；服务器支持时为 JS/JSON/WASM 开启 Brotli/Gzip。服务器响应头未由本工程修改。

`python tools/check_loading.py` 检查首屏隔离并更新 tools/loading-report.json。首场景引用的原始 PNG/MP3 从完整布局的 342 个、24.81 MiB 降至 69 个、3.18 MiB；该统计不包含引擎代码、JSON、网络压缩与缓存，不是远程服务器首屏耗时。

本轮实际验证：大厅进入牌桌、帮助和头像选择首次加载通过。用 tools/loading_probe_server.py 暂停牌桌独占图片下载时大厅仍显示，放行后进入牌桌。独立测试构建验证了按需加载后的 WIN、LOSE、返回大厅、Continue 开局，未捕获 warning/error。正式版测试按钮保持隐藏。静态引用检查、TypeScript 检查及 Release 构建通过。

## 工程内容

- `assets/art`：从 B 图集中恢复的 426 张独立图片，包含旋转、裁剪偏移、原尺寸和九宫格边距的还原。
- `assets/prefabs`：32 个 B 原始预制体，以及带离线交互和预置手牌节点的 `OfflineApp.prefab`。大厅、牌桌、扑克牌、玩家、菜单和弹窗均有真实 SpriteFrame 引用。
- `assets/animations`：30 段从 CCONB 解包的动画，二进制曲线已转回可导入数据。
- `assets/spine/Base_Dealer`：原荷官的 Spine JSON、图集和贴图。
- `assets/audio`：16 个原始音频；音乐和发牌音效通过组件属性直接绑定。
- `assets/scripts/OfflineGame.ts`：本地交互适配器；使用序列化节点和图片引用，不通过路径加载资源，不在运行时创建 UI 节点。
- `assets/scripts/Rules.ts`、`Round.ts`：独立的本地五人牌局。复用了工作区已有的通用离线 Rummy 规则实现；B 的图片、布局和预制体没有使用 A 的界面素材。
- `tools/reference`：原始解码布局和从 B 的客户端包提取的 248 个编译模块，供逐项对照；这些不是原始 TypeScript 源文件。

## 运行

运行 `build.ps1` 构建，结果在 `build/web-mobile`。
运行 `python tools/serve.py`，打开 <http://127.0.0.1:18034/>。

离线牌局支持选择房间、摸牌、弃牌、多选分组、自动理牌、声明、弃局、机器人回合和本地余额保存。
所有筹码为本机数据，不连接账号、支付或线上牌局服务。

## 恢复边界

这是以 B 发布资源和布局为依据恢复的可编辑工程，不是找回了丢失的原始源码，也不是原服务端的复制品。
原服务器会话、账号、联机协议和在线牌局改为独立本地实现。
原自定义组件保留在参考资料中，编辑器预制体移除了不可直接运行的脚本引用。手牌按钮、菜单、帮助和结算现已接到本地逻辑；部分字体以系统字体替代，尚有部分演出时序、音效和边缘交互需与线上版本逐项比对。不要将其标为完整 1:1 复刻。

检查过的图像是正常 PNG/WebP/JPG；Cocos 的压缩 JSON、UUID 和 CCONB 是编码/序列化格式，不能笼统称为加密。未修改输入目录中的原始资源。

## 校验与恢复工具

`python tools/check_recovery.py` 检查组件归属、父子引用、资源 UUID；只允许加载已制作好的 deferred 预制体，不允许运行时拼 UI 或加载外部图片。

```powershell
tsc assets/scripts/Round.ts assets/scripts/Rules.ts --target ES2022 --module commonjs --outDir temp/round-check --skipLibCheck
node tools/round.test.cjs
```

`recover_b.py`、`import_audio.py`、`assemble_b.py` 是一次性恢复/编辑器资产生成工具。
**它们会覆盖生成的图片、场景和预制体；在 Creator 中手工修改后不要随意重新运行。** 正常预览、编辑和构建不需要这些脚本。

当前恢复记录：`tools/recovery-report.json`。其中未保留的旧组件和默认材质/字体引用记录用于后续继续还原；实际交付的场景和预制体另由引用校验脚本验证。

## 本次验证（2026-09-11）

Creator 3.8.6 Web 构建通过；场景/预制体引用校验和离线规则测试通过。浏览器实际验证了大厅进入房间、摸牌、选牌、弃牌及四位电脑轮转后返回玩家；该轮运行日志没有 warning/error。原版全部弹窗和动画事件尚未逐项运行验证。

## 原版交互恢复（第二轮）

删除了临时操作按钮条。使用 B 原有 Drop、AutoSort、Discard、Group、Declare 节点及图片，依选牌数和回合状态切换；摸牌直接点击牌堆。恢复原版摸牌/弃牌提示、百搭牌皇冠、玩家积分/余额及回合光圈。菜单提供返回大厅、帮助和声音开关。原始 Help 图片页和 ResultView 五人结算及继续/返回按钮接入本地状态。手牌支持点击多选、拖动排序和拖到弃牌区出牌。所有节点在预制体中预先存在。

对照 `tools/reference/HandSettingView.decoded.js` 的按钮互斥逻辑、`Card.decoded.js` 的花色/人物显示和 `TableView.decoded.js` 的牌堆位置。原版帮助页明确为两副各带一张 Joker 的牌，共 106 张；本地牌组已修正。`decode_strings.cjs` 仅在隔离 JS 上下文中提取字符串表，`decode_modules.py` 输出静态代码参考。

本轮验证：Creator 3.8.6 构建、TypeScript 检查、资源引用检查和 106 张牌的规则测试通过。浏览器实际验证了原版菜单与帮助分页、点牌堆摸牌、多选/分组、拖到弃牌区出牌、电脑轮转、弃局后的五人结算和 Continue 开新局。运行中未捕获 warning/error。

## 演出与资料恢复（第三轮）

- 24 个头像直接绑定到原版头像选择预制体，支持选中、取消、确认与本地保存；大厅、牌桌、倒计时和结算同步头像。
- 原版 RoomMenu 提供五档换桌，校验扣除当前牌局弃局成本后的余额，取消旧牌局回调再发新牌。
- 接回 Base_GameStart、Base_PlayerWin、Base_OtherWin、Base_Result_Win/Lose/WinLoop；发牌移动复用预置手牌节点，不动态创建 UI。离开牌桌会停止动画并让旧延迟回调失效。
- 从 B 原包恢复两份加法叠加材质和 43 类图片/节点绑定，修正开局、胜利等光效的黑色底块。工具为 tools/import_materials.py；原包省略的材质 technique 索引在编辑器资产中补为 0。
- 过滤动画片段中不存在于当前节点的目标路径，例如 StartGame 上残留的 Base_Poker 片段。

构建脚本现会检查资源/脚本错误，避免 Creator 输出 build success 但存在无效材质时误报通过。

本轮验证：头像选择/确认及刷新持久化、LV1→LV2 换桌、开局和发牌已实际验证；独立副本（tools/presentation_fixture.py，仅修改 temp/presentation-check）使用合法胡牌测试手牌验证 Declare→玩家胜利→WIN 结算，未捕获 warning/error。正式构建保持随机发牌。原服务器和完整线上演出时序仍不属于已恢复的源码。

## StartGame 动画静止修复

更正上轮演出验证：之前验证了显示/隐藏与发牌流程，但没有证明原版动画曲线在播放。原始 CCON 的 RealCurve/QuatCurve bytes 直接写入普通 .anim JSON 后，Creator 会忽略关键帧；导入后的片段名称又带 UUID 后缀，原控制器按完整名称查找失败。

`tools/editor_curves.py` 按引擎格式恢复可编辑的时间、数值、插值和切线；30 个片段共 2216 个关键帧，其中 StartGame 178 个。恢复入口 recover_b.py 同步调用转换，避免重新恢复时复发。控制器兼容导入名称后缀，StartGame 的 Animation 开启 playOnLoad，独立运行时可播放。普通预制体编辑视图不会自动播放，请在动画编辑器选择 Base_GameStart 片段并点击播放。

`python tools/check_animation_curves.py --imported` 已确认 Creator 导入后完整保留 StartGame 的 178 个关键帧时间和数值。构建、类型与资源引用检查通过；浏览器验证了开局动画显示后退出、发牌完成，未捕获 warning/error。尚未直接操作桌面编辑器的动画时间轴。

预制体编辑器打开报错 `Cannot read properties of null (reading 'instance')` 的另一个原因是生成工具删去了节点 `_prefab`。`tools/prefab_metadata.py` 为展开后的 33 个预制体补齐 PrefabInfo（根节点、自身资产引用、唯一 fileId）及 CompPrefabInfo，保留原节点和资源。assemble_b.py 在输出时同步生成这些信息。引用校验增加缺失元数据检查；Creator 导入后的 StartGame 根 PrefabInfo 已验证存在。桌面编辑器打开操作仍需重新打开该预制体验证。

## 背景音乐

对照原包 sound_data_map / AppMediator，Base_BG_01 为正常 BGM，Base_BG_02 为玩家获胜 BGM。场景和 OfflineApp 直接绑定这两份原始音频：大厅进入即请求循环播放正常音乐，牌桌沿用，玩家获胜切换胜利音乐，继续或返回大厅切回正常音乐。菜单声音开关同时控制背景音乐和现有音效。Web 首次播放受浏览器策略限制时，由 Cocos 在下一次用户点击后解锁。此前大厅没有触发播放且牌桌误用胜利音乐，现已修正。

## 大厅演出测试按钮

大厅底部提供“测试 WIN”和“测试 LOSE”，静态节点和按钮图片保存在 LobbyView、OfflineApp 预制体及 RummyB 场景中，生成入口为 tools/test_buttons.py。按钮直接进入演出与结算测试，固定示例分数，不修改保存余额；Continue 进入普通随机牌局。浏览器已验证两个入口、WIN 后返回大厅余额不变，运行日志无 warning/error。
`tools/test_buttons.py` 的 SHOW_TEST_BUTTONS 现为 False，测试入口暂时隐藏，节点及测试逻辑保留。需要恢复时改为 True 并运行该工具后重新构建。

## 明显加载提示

进入牌桌或首次打开窗口等待资源时，显示居中的十二段转圈动画，下方为 Loading…；半透明遮罩阻止重复操作。资源就绪后关闭；失败时停止转圈并显示 Unable to load / Tap to retry。LoadingOverlay.prefab 可在编辑器中查看，所有遮罩与转圈条直接绑定现有 2×2 白色图片；运行代码只旋转预置节点。tools/loading_overlay.py 负责生成并绑定到首场景，assemble_b.py/split_loading.py 同步保留它。

已验证延迟牌桌图片时显示遮罩和转圈，放行后进入牌桌且遮罩关闭；运行日志无 warning/error，Release 构建通过。

加载提示现显示 Loading… N%，使用 Cocos resources.load 的已完成资源项/总资源项回调（非下载字节比例），成功实例化后完成。背景音乐加载不会覆盖当前面板进度。已通过 TypeScript、资源引用检查及 Release 构建，并在浏览器暂缓牌桌资源时观察到 69% 加载提示。

Auto Sort 无变化提示：手牌顺序与分组均不变时，显示图片绑定的 NoticeDialog 预制体，点击 OK 关闭。弹窗期间暂停操作与倒计时；正常排序行为保留。源码排序判断、TypeScript、资源绑定及首屏隔离检查通过，已重新 Release 构建。
