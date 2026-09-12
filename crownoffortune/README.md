# Crown of Fortune · Cocos Creator 3.8.6

工程目录：`E:\wg\cocos\minigame\crownoffortune`。
用 **Cocos Creator 3.8.6** 打开，运行 `assets/scenes/Crown.scene`。设计分辨率 **1136 × 640，横屏**；按完整画面缩放，超宽屏保留两侧留边。

## 已实现

- 原版宫殿背景、皇冠转轴框、8 种符号、符号中奖 Spine、18 段音频。
- 5 列 × 3 行、原版 20 条线的路径、15 个下注档位、连续转轴滚动、逐列减速停下、快速转动。
- Wild 替代、整列扩展、锁列免费重转、中奖高亮、普通结算、Big / Super / Mega Win 面板。
- 原版 PLAY 按钮和 GameIntro_L 开场 Spine、首次功能介绍、设置、音效开关、自动游戏局数/止损/止盈、帮助/赔率表/线型、最近 30 局记录。
- `GameSave.ts` 使用独立存档键 `crownoffortune.local.v1`，对接 localStorage 和 RummyA 同样的 `window.cocosJava.getGameSave / setGameSave` 接口。扣款后立即保存整局结果，刷新续播，完成后结算一次。自动游戏不会跨刷新自动恢复。

## Loading 与动态加载

启动场景只有 Logo、转动提示、进度文字和重试按钮，静态引用两张小图，**没有游戏预制体或声音引用**。

`CrownBoot.ts` 分阶段动态加载 `CrownOpening` 和 `CrownGame`；资源就绪后显示 PLAY，点击播放原版开场 Spine，结束后激活游戏。其余面板首次打开时分别加载，带进度、失败重试和取消；本次会话再次打开时复用。

`assets/resources/deferred/` 中有 9 个可编辑预制体：

| 预制体 | 用途 |
| --- | --- |
| CrownGame | 主游戏、转轴符号、底部操作区 |
| CrownOpening | 原版 PLAY 和开场 Spine |
| CrownIntro | 首次功能介绍 |
| CrownBet | 原版三列下注菜单和选中态 |
| CrownHelp | 游戏内规则、图标赔率表、20 条线路图 |
| CrownSettings | 原版图标浮层：声音、帮助、历史、自动设置 |
| CrownAuto | 自动游戏局数、止损、止盈 |
| CrownDialog | 历史分页 |
| CrownWin | 大奖结算和原版大奖 Spine |

界面节点、SpriteFrame、Spine、音效引用均已序列化，可直接在编辑器调整。运行时代码只切换图片、文字、动画和实例化已编辑的面板。

更新后 `main` 资源约 27 KB，完整构建约 18 MB；**27 KB 不包含引擎、内置资源和随后下载的游戏资源**。精确尺寸见 `tools/asset-audit.json`。部署整个 `build/web-mobile` 目录，不要只传 index.html。当前资源使用相对地址，同源即可；服务器建议启用 gzip/Brotli 和带 hash 静态文件缓存。这里尚未部署到远程服务器。

## 原版分析资料与还原边界

参考：[JILI Crown of Fortune](https://jiligames.com/PlusIntro/621?showGame=true)。
`coderesoures/` 保存已下载发布资源，`manifest.json` 记录 480 个文件及 SHA256。资源恢复报告在 `tools/recovery-report.json`，源预制体解析结果在 `tools/reference/`。

源客户端为 Cocos 3.6.2；这里迁移为 3.8.6 工程。恢复出 407 个独立图片条目、14 个原始预制体条目、39 段动画，并保留 Spine 原始数据。源包同时含 Dice 和普通水果素材，本工程使用普通水果样式。

**本工程是本地可玩还原，不连接原版下注服务器。** 原始 20 条线路和主要展示流程可由客户端核对；随机权重、赔付表以及“没有新增锁列则结束重转”的本地规则写在 `CrownRules.ts`，不能当作原版服务器概率、RTP 或全部特殊规则的精确复制。最高总赔付限制为 1000 倍总下注。Wild 采用逐列高亮和整列符号展示，未完整复刻原版连续 3–5 列合体巨型 Wild 的所有演出。

原始资源解析仍记录 4 个未恢复引用和 14 类被移除的原版私有组件类型，详见恢复报告；**这些原始参考预制体不作为游戏入口**。新编写的上述 9 个可玩预制体已独立检查引用完整性。私有服务通信和原版混淆程序没有加入工程执行。

## 检查和构建

在此目录运行：

```powershell
tsc --noEmit -p tsconfig.json
tsc -p tools/tsconfig.test.json
node tools/flow.test.cjs
.\build.ps1
python tools/audit_assets.py
```

流程测试读取真实预制体节点图，使用引擎模拟接口检查按钮绑定、重复点击、输赢、重转、封顶、自动停止、断线加载重试、原生存档失败回退和刷新续局，并覆盖 1000 个固定种子的整局结果。测试会故意输出模拟加载/原生桥失败日志，最终应有 `PASS`。

已执行 TypeScript 检查、Creator Web 构建、文件哈希/资源引用检查和本地浏览器显示检查。模拟流程测试不等同于真机或 Android 原生桥验证；Android 真机、远程服务器与原版服务器一致性尚未验证。

`tools/author.py` 是初次生成预制体的脚本，**编辑器手动调整后不要随意重跑**，会覆盖已生成的场景和预制体。`tools/recover.py` 用于资源恢复，同样只在需要重新生成参考资源时使用。下载入口中的会话参数文件已加入 Git 忽略规则。

已知兼容提示：在 Creator 3.8.6 Web 的中奖 Spine 初始化时，浏览器曾记录一条空名称的 “attachment 纹理不存在” 警告。已核对所有 Spine 图集页名与导入纹理对应完整，实际大奖文字、光效和金币可显示；没有修改引擎或屏蔽该日志。

## 本次界面修正

底栏设置、金币下注、闪电、AUTO、JILI 字样及网络图标来自原版共用资源。点击 AUTO 启动 10 局，长按 0.55 秒打开设置；设置菜单也提供自动设置入口。转动中点击旋转会加速停下，仍按已保存结果完成结算。

共用框架资源下载在 `coderesoures/remote/`，清单独立于原游戏的 480 个文件；恢复暂存在 `coderesoures/recovered-common/`，仅选中的 UI 图片进入工程。`tools/refine_ui.py` 在基础生成后补充这些预制体。帮助采用游戏内分页，图文和线路可用；赔付内容对应本地规则，尚未证明与在线帮助所有页面完全一致。原站本次在加载阶段报 SetProgress 未定义，因此本次在线交互核验未完成。

共用下载清单当前共 1085 条，1078 条已下载，7 个非本游戏必需的共用音频候选地址返回 404，清单保留错误记录；可玩预制体引用检查无缺失。

AUTO 修正：`CrownAuto.prefab` 直接恢复共用 `AutoPlaySettingPanel` 的节点和图片，包含滚动内容、50/100/200/500/999 快捷局数、下注和停止条件。停止图标使用原始 `btn_autostop/Icon` 的 34×34 方形图案，避免英文同名素材误配。`tools/restore_auto.py` 仅重写 AUTO 面板和主界面的 AUTO 引用，保留其余预制体编辑。
