
2026-09-12 RummyB 新手引导 / 排序动画：
- Creator 3.8.6 Release 构建、TypeScript、2216 个动画曲线键及首场景隔离通过。源模型重新编译后的 round.test.cjs 通过；仓库缺少 built-model.cjs，因此本次不声称运行了构建 JS 模型测试。
- 四个图片绑定遮罩 Alpha 180、BlockInputEvents 静态检查通过。手指与白色贴图复用自 RummyA，保存在 assets/tutorial。
- 浏览器 localhost:18034 首次 LV1 实测三步：摸牌 -> 选择高亮手牌 -> Discard。菜单点击被遮罩拦截；等待期间牌局不自动推进。
- 手动弃牌后关闭并重新打开页面，进入 LV2 没有重复引导。
- LV2 摸牌后点击 AutoSort，捕获抬牌中间状态；新摸到的黑桃 8 从末尾移到黑桃 4 与 9 之间。再次点击出现原游戏内无变化提示。
- 音乐保留场景 AudioSource 的 _loop=true，移除脚本 loop 覆盖。未进行完整周期听测或 Android 真机验证。

2026-09-12 荷官 Spine 绑定修正：
- 在牌桌 Base_Dealer 下绑定 DealerSpine，移除原静态 Sprite；复用 Base_Dealer.json，默认 idle 循环。按骨骼导出边界居中并缩放到原荷官区域。
- 移除大厅画面外的同一骨骼实例；同步普通 TableView、deferred/TableView、OfflineApp 和场景。assemble_b 序列化已接入 dealer_spine.py，避免重新生成时恢复静态图。
- 静态验证：三份含牌桌的预制体各有一个正确绑定的 Spine，首场景无 Spine；2216 个动画曲线键检查通过。首场景源资源为 68 项 / 2.62 MiB。
- 按用户要求未编译、未打包，实际动画位置及播放效果待用户在 Creator 中预览。
