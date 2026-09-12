# 验证记录（2026-09-11）

- Creator 3.8.6 Web Mobile 构建日志：`motion-4-build.log`。
- `tsc --noEmit --pretty false` 通过。
- 对实际 Creator 构建 JS 执行 `RUMMY_BUILT=1 node tools/round.test.cjs` 通过：108 张牌守恒、明牌取牌限制、五座回合、分组、退局罚分、合法/非法宣告及结算收支相抵。
- 场景与 playable 预制体的资源 UUID 引用检查没有缺失项。
- 浏览器实际点击通过：进房、单选、多选、Group、摸牌到 14 张、弃牌到 13 张、交给下家、帮助弹窗开关、Drop 确认。
- 浏览器验证中修正：手牌透明遮罩拦截、Set 转数组的构建差异、大厅 Widget 目标丢失、弹窗背景锚点、一次性回调重用导致回合链中断、旧结算牌节点延迟销毁。
- 已在浏览器复查帮助弹窗背景居中、文字可读。计时采用实际经过时间，避免预览窗口降帧导致回合等待被拉长。
- 实际构建的牌局模型完成一次退局后自动牌局：41 次对手行动后宣告结束，结算为 [-20,110,-12,-23,-55]，总和为 0。此项为模型执行，不能代替结算面板浏览器验证。
- 未验证：真机、竖屏、原版联网服务器、全部原动画事件。恢复动画文件不代表每段动画都已接入运行时。

## 动画继续恢复

- `python tools/check-motion.py`：33 个动画绑定的节点和组件路径检查通过。
- 浏览器已看到 START 开局动画和回合金色光圈，开局结束后 Drop 操作正常；确认退局后看到牌背沿原轨迹移动到对手座位。
- 本次接回的动画包括开局提示、四座摸牌/弃牌、回合提示、理牌及结算的开始/循环/关闭阶段。
- 补齐结算动画引用的 add_Win02～04 光效层；未恢复的两个彩带粒子轨道记录在 `tools/original-motion-source.json`，原始 CCONB 未修改。
- 头像调用链已定位到原始 GameView.randomAvatar → 公共 setPlayerIconImg。47 张尺寸接近头像的已下载图片经缩略图检查，没有人物头像，尚未定位公共模块实际头像 URL。
- 浏览器完整跑过一次退局后的对手牌局，进入 LOSE 结算，点击 Back to Lobby 后退场动画完成并返回大厅，余额从 10285 更新为 10265；过程中没有控制台警告/错误。
- 最后修正了结算牌面重复缩放和牌背占位叠加，隐藏结算时残留的牌桌状态文字。最终构建浏览器复查通过：五行牌面清晰且无占位牌背；点击 Continue 完成退场后进入新局，13 张手牌、玩家摸牌阶段恢复正常，控制台无错误/警告。


## 规则、发牌和牌组继续恢复（motion=5）

- 最新构建日志为 `build-client.log`，Creator 3.8.6 构建成功；TypeScript 检查通过。
- 接回原 Shuffle 动画，13 张发牌牌面由场景内的 CardView 引用显示本局手牌；位置、图片引用和动画轨道保存在预制体与场景中。浏览器看到逐张牌背发出、结束后正常呈现 13 张手牌。
- 原 Card_set 的 Add_Btn 已保存 Button 组件并绑定控制器。浏览器实测单选方块 A 后点击目标组 Add，牌从原组移入目标组、清空选择，仍为 13 张；不是只显示按钮。
- MOST_ACTION_DELAY 改为原客户端的 20 秒；剩余 5 秒触发原 Sound_HurryUp。超时摸牌后保留 14 张并进入弃牌阶段，首次超时弃牌，连续无人操作时退局；实际构建模型测试通过，浏览器已验证自动摸牌后停在 14 张弃牌阶段。
- 明牌 Joker 限制由 canDrawJ 控制，默认 false 与原回放初始化一致；在线服务何时授权 canDrawJ 尚未恢复。本地超时摸牌固定从暗牌堆取牌，尚未复现服务端 isShiny 对明牌的选择策略。
- 修正零/负余额刷新恢复成 10000，以及 Continue 绕过进房最低余额。此两项完成代码检查和构建，未篡改用户余额做浏览器边界验证。
- `RUMMY_BUILT=1 node tools/round.test.cjs` 新增规则、自动操作恢复和已有牌组合并测试通过。`python tools/check-motion.py` 为 34 个绑定通过。
- 用户要求静音：已通过大厅按钮关闭音乐与音效，保存本地设置。
- 仍未完成：本人摸牌/弃牌飞行动画、牌组扫光、完整结算粒子、逐步回放、竖屏。106/108 张差异待确认；当前仍为本地 108 张，不能称为已完全恢复原版规则。头像等用户提供。


## 头像与随机玩家（avatars=1）

- 内置 image_gen 按用户参考风格生成 4 女 4 男独立头像，原图及完整提示词保存于 source-art/avatars；工程图片为 assets/art/Avatar_female_01..04.png 和 Avatar_male_01..04.png。
- 原 Photo/mask/img 使用圆形 Mask 和预制体 Sprite 引用；场景、PlayerSeat1..5 和 RoundResult 都保存可编辑的默认图片。运行时代码只抽取身份并替换已绑定 SpriteFrame，不创建头像节点或设置布局。
- 每局五座从八个头像无放回抽样；男女名字池分别无放回抽样。牌桌与结算共享身份，本人也参与随机分配。
- tsc、Creator 3.8.6 构建、34 动画绑定检查通过。实际构建 JS 的 players.test.cjs 验证 200 局每局头像和名字唯一，并覆盖所有 8 个头像；round.test.cjs 回归通过。
- 浏览器实测本局 Owen/Chloe/Emma/Anna/Grace，头像索引 7/2/0/1/3；五个圆形头像正常显示，音乐与音效关闭，没有 console error/warn。结算身份图片绑定完成，未在此轮另跑完整结算动画。


## 截图差异与胜负测试入口

- 大厅增加 Test WIN / Test LOSE，另支持 ?result=win / ?result=lose。通过本地 Round 的其他玩家退局生成结算，preview 模式不调用 onSettlement，不写余额或历史。预览 Continue 返回大厅，正常 JOIN 恢复正常结算。
- 浏览器实际打开 WIN 与 LOSE，关闭后大厅余额均为 10,145；没有错误或警告。该入口验证结算 UI，不表示首局被操控为必胜。
- 恢复原 PlayerInfo PointsFrame/MoneyFrame，与实际本地余额和手牌分数绑定；Drop 金额按 20/40 分乘房间单价显示。
- 接回各头像原 CountDown 径向 Sprite，按 20 秒倒计时更新。对手行动前保留 3 秒展示回合状态。
- 接回原 DeckHint/DisHint 的 Clip_Hint_Card_Loop 箭头与边框，以及 PickHint 提示；修复原动画目标 TXT01/TXT02 与恢复节点 TXT1/TXT2 名称不符。40 个动画绑定静态检查通过。
- 通用提示为 Pick up a Card，只在本人摸牌阶段显示；明牌为禁止取用的 Joker 时不显示明牌提示。截图中的条件式 1st Life 推荐尚未接回，不能以通用提示替代后声称完全一致。
- 浏览器看到金币、Points、Drop 金额、黄色扇形计时和牌堆光框。最终小调整：信息栏靠近本人头像，隐藏常驻调试式状态文字，wildRank 牌背景淡黄。
- 仍有缺口：条件式需要牌提示、本人摸牌/弃牌完整飞行动画、牌组扫光、金币喷泉与彩带粒子、逐步回放、原服务端规则和 106/108 张差异。现有 123 个动画文件并非全部接入。


## 四项补齐（fx=4）

- 五座拥有独立 SeatClock 数字与原 CountDown 扇形 Sprite，当前行动座位显示，中央数字隐藏；修复选择手牌导致扇形重置为整圆的问题。浏览器捕获对手 Sophie 座位 20 秒及黄色扇形，其余座位不显示计时。
- 本人摸牌/弃牌使用可编辑 CardFlight 预制体和 FlyingCard 引用，0.32 秒移动/缩放。动画期间锁定重复输入；完成后推进状态；超时自动摸弃也复用该流程。浏览器完成 13→14→13 张并进入对手回合，无错误/警告。
- 接回七个 Card_set 原 Wipes 动画，牌组内容/类型改变、理牌和发牌结束后触发。绑定检查扩展至 47 个动画。条件式明牌提示根据本地牌型分析显示 First Life / Declare，并高亮参与成组的手牌；不是假定服务端推荐已完整恢复。
- 本人继续显示账户余额；各对手显示本地模拟的本局起始金币并按本地结算更新。未连接原服务端，不能把这些数值称为在线玩家余额。
- WinCelebration 预制体保存 20 个金币与 36 个彩带节点、图片引用、初始位置与颜色。动态下落/旋转由脚本播放，胜利时启动，失败时关闭，退出/禁用时停止。使用现有金币素材与纯色彩带贴图补做效果，并非声称找回原版缺失粒子材质。
- 浏览器看到金币下落，退出 WIN 返回大厅后没有残留特效；音乐/音效继续关闭。最后将原先过细的光点替换为清晰的矩形彩带。
- TypeScript 检查、Creator 3.8.6 构建和原有实际构建 JS 牌局/随机身份回归通过；真机及原服务器未测试。

## Persistent profile and native save (save=1)
- TEST WIN/LOSE prefab nodes disabled; result query shortcut removed.
- Lobby avatar/name bound to saved player; table keeps identity and excludes duplicates.
- GameSave uses window.cocosJava.getGameSave()/setGameSave(json); browser localStorage fallback; migrates legacy balance/audio/history. Saves wallet, identity, audio and last 30 results. In-progress rounds are not resumed.
- tsc, 47 animation bindings, save.test.cjs, players.test.cjs and round.test.cjs passed. Native bridge tested with mocks, not an Android device.
- Creator build success 2026-09-11 15:18:29. Browser reload retained Ryan avatar, balance 10,065 and muted settings; test buttons absent.


2026-09-11 大厅按需加载验证：
- TypeScript 全工程检查通过，47 个原动画绑定通过。
- 首场景依赖隔离通过：无牌桌预制体、音频与 deferred 资源；源 PNG/音频 1.38 MiB / 68 项。
- Release + MD5 构建成功，无 .map 输出。实际构建脚本上的牌局、玩家身份、存档测试均通过；存档测试中的 expected failure 警告来自故意注入的失败案例。
- 浏览器 18038 人工暂缓牌桌专用资源：大厅可显示；点击 LV1 后转圈和 Loading… 58% 可见；解除暂缓后进入牌桌并完成发牌；退回大厅头像正常，再进入 LV2 直接复用牌桌。
- 尚未上传远端服务器；Google 审核结果不在本次验证范围内。

Auto Sort 无变化提示：源码及 Release 构建模型测试通过；浏览器实测已排序手牌点击 Auto Sort 显示游戏内单 OK 提示，关闭后普通 Drop 确认框恢复 Confirm/Cancel 两按钮。未使用 window.alert。

2026-09-12 首次游玩引导：
- 新增图片绑定 FirstPlayGuide 预制体及透明手指 PNG；四块黑色 Sprite Alpha 180，遮罩节点拦截点击。
- TypeScript 检查、47 个动画绑定、首场景隔离和 Creator Release 构建通过；实际构建 JS 的 round.test.cjs 通过。
- 浏览器独立测试来源 localhost:8797：首次 LV1 依次显示摸牌、选牌、Discard 三步；手动点击全部通过，选牌阶段仅高亮一张牌的可点击部分。
- 引导期间倒计时保持 20；点击高亮区域外的 Discard 被拦截。手动弃牌后遮罩消失，正常对手回合恢复。
- 完成后刷新页面再进入 LV2，不再显示引导，倒计时正常走到 17。完成标记保存在当前来源 localStorage；未做 Android 真机验证。

2026-09-12 Auto Sort 移动动画与音乐循环：
- Auto Sort 按牌 ID 记录旧世界位置，布局完成后让牌面抬起并滑到新位置，逐张延迟 15ms，总时长约 0.7 秒；动画中暂停操作和计时，退出清理 Tween。
- 浏览器实际捕获了手牌抬起的中间状态与排序后落位；再次无变化排序仍弹出游戏内提示。
- LobbyMusic.prefab 与 Rummy.scene 的 AudioSource 原本已有 _loop=true；RummyApp 加载音乐时现在明确同步预制体的 loop 到实际播放源，以预制体为配置来源。未进行完整音频周期听测。
- TypeScript、47 个动画绑定、首场景依赖隔离、Release 构建和实际构建 JS 牌局回归通过。

2026-09-12 默认音频 / Lobby 任意回合退出：
- 新存档音乐和音效默认 true；旧版 off 值与完整存档中的关闭设置仍保留。实际构建 JS 的 save.test.cjs 验证默认开启、旧 off 迁移和显式关闭保留通过。
- Lobby 独立 leaveTable，不受当前回合或 motionBusy 限制。确认后停止动画、清除 AI 调度，仅结算本人退出费用；不再调用会作用于当前 AI 座位的 Round.drop。
- Lobby 保持预制体原有层级，新手引导不对 Lobby 做特殊处理；确认弹窗置于牌桌根节点顶层。普通 Drop 保持原本人回合限制。
- 浏览器 AI Zoe 行动时点击 Lobby，确认后回大厅；余额 9960 -> 9920，未重复扣分。
- TypeScript、47 个动画绑定、存档及牌局模型回归通过。Android 真机未验证本次 Cocos 改动。

2026-09-12 层级修正：按要求移除 Lobby 的运行时重设父节点及置顶逻辑，保留任意回合退出逻辑。本次只改源码，未重新编译或打包。
