# 验证记录

## 2026-09-12 按需加载调整

- Creator 3.8.6 web-mobile 构建成功；导入与构建任务无错误。引擎的 Windows 网络检测提示及旧构建配置版本警告仍在，不影响此构建完成。
- TypeScript、原规则与滚轴测试、全部预制体 UUID 引用检查、加载结构检查通过。
- 启动场景为 7,611 字节，仅保留相机和加载控制器；运行主预制体为 245,368 字节、46 个图片绑定。以上为源文件大小，不代表实际网络传输量。
- loading 图片为 128×128 PNG、3,421 字节。网页入口和引擎内均为纯黑底、小圆环、动态百分比。
- Chrome 浏览器实际点击回归通过：启动阻塞时显示黑底 loading；首次进入没有自动介绍或弹窗；资源缓存没有 Rules/Bonus/BigWin/GameIntro/牌面/音频资源；Settings 首次点击加载，重复打开没有新请求。
- Rules、Paytable、翻牌（×2/×5/移除梅花/三张黑桃）、结算与 Collect 返回通过。
- 主动阻断首次 SPIN 资源请求：显示 RETRY，余额保持不变；恢复请求后点击 RETRY，加载并完成转动。
- 固定 Wild 盘面实际完成扩展、收集、中奖线与首次 BigWin 加载；无未处理 JavaScript 错误。
- 最新测试在本地无头 Chrome 上运行，初始页面共 113 个请求（含引擎），Settings 首次新增 3 个请求。没有旧版本同条件测速，不声明提速比例。
- 结果见 `tools/test-output/loading-browser-report.json` 和 `loading-*.png`；可重跑 `tools/loading.test.cjs`、`tools/loading_audit.py`。
- 当前主界面编辑入口为 `assets/clover/core/CloverMain.prefab`，GameIntro 不再自动播放。未上传生产服务器，未完成 Android/iOS 真机或音频听觉验收。

以下为此次调整之前的表现验证记录，不能视为当前加载结构的验证结果。

## 历史记录：表现补全版

## 已完成检查

- Cocos Creator 3.8.6 web-mobile 构建成功，记录见 build.log。
- 项目 TypeScript 检查通过（跳过引擎附带声明库）。
- 本地赔付/100 条线路/300 个盘面/翻牌状态回归通过。
- 六符号滚动带的均匀间距、整圈回绕、下压与回弹、普通/加速/手动停轴单元检查通过。
- 场景及可玩预制体外部 UUID 全部存在；场景 226 个图片绑定，另有独立符号 Spine 预制体。
- 10 种符号 Win 动画均通过浏览器实际渲染验证，包括瓢虫与 Wild。
- 普通滚轴实际中间帧可见连续移动、上下裁切；逐列停轴记录约 1.031 / 1.215 / 1.398 / 1.565 / 1.749 秒。
- 手动停轴五列约 0.501 秒进入回弹；加速五列约 0.367 秒进入回弹，随后恢复精确落点。
- 三列 Wild 的 Action/Expand、Symbol_Wild_Fx、收集飞行、角色 T1_Collect、WinLine、Mega Win 金币与金额计数均实际运行。
- GameIntro_L 与 BG_Declare_L 入场动画实际显示。
- 原版卡牌 Open_Start/Open_Loop/Remove/Win_Start/Win_Loop 实际运行。
- 固定牌组实测 ×2 → ×5 → ×10、同时移除三张梅花、三张黑桃、BG_Compliment 金币结算、COLLECT 返回；测试入口不写余额存档。
- 最终玩法检查未见新的 JavaScript 错误。旧的卡牌剪辑名称错误已修复：根据导入后的剪辑名称播放，保留原来的动画轨道。

## 资源提示与验证边界

- 诊断入口加载 GameIntro 数据时，引擎输出一条空纹理名的 Spine 警告。全部具名附件路径均存在于 atlas，介绍画面已显示。引擎 spine-wasm.cpp 的 updateAttachmentVerticesTextureId 对非图像附件没有初始化 attachmentVertices，可能产生该提示；没有修改全局引擎或屏蔽日志。
- 本地规则按用户确认保留。卷轴采用原客户端 SpinMoving 的六符号回绕与两段回弹结构；时间参数集中在 ReelMotion.ts，不能用本地实测代替原版逐帧对照。
- 官网试玩此前卡在加载阶段，尚未取得完整原版运行录像，因此不声明逐帧完全一致。
- 未做 Android/iOS 真机或音频听觉验收。

复现入口和编辑位置见 README.md。普通游戏入口为 http://127.0.0.1:8770/。
