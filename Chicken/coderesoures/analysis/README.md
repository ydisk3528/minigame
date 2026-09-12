# 原始发布包分析

- 产品页：`https://jiligames.com/PlusIntro/748?showGame=true`，Chicken Dash 10000，游戏 ID 748。
- 试玩入口：`https://jiligames.com/PlusTrial/748/en-us`；最终发布根路径为 `https://casino-wbgame.jiligames.com/chickendash10000/`。
- 引擎为 Cocos 3.8.5。`src/settings.abcad.json` 声明 main、internal、game 三个 bundle，设计尺寸 640 × 1136。
- game bundle 版本 b7ec4。`assets/game/index.b7ec4.js` 包含原始玩法脚本，`classes/` 按类名拆分以便检索。
- `Stage` 是主界面；`Display/UI` 内包含 BGLayer、Character、TopLayer、ButtonLayer、GameDataLayer、ListLayer 和 UILayer。主道路按 roadItem 预制体展开。
- `MineGame` 管理下注、前进、兑现和结果回调；`GameCtrl` 连接协议；`UICtrl` 管理小鸡/道路/轮盘演出；`roadItem` 管理车辆皮肤、路障和每一步倍率。
- `Game.difficultyRate`、`Game.difficultyData` 在客户端初始化为 null，随后由服务端配置填充。客户端调用 firstJump / continue 并接收成功或碰撞结果，因此无法仅凭美术包还原服务器概率。
- 代码包含三组难度线索和三组转盘数字。更高等级转盘、金币袋、道具卡及通用 FastGame 活动 UI 的资源均保留在下载目录，但本地玩法仅接入主流程及独立奖励转盘。
- 路面与车辆采用动态横向偏移模拟前进，小鸡原始动画包括 Idle / Idle1 / Idle2 / Start1 / Win1 / Hit1 等，车辆有独立 Car_01-1 等皮肤。

## 恢复方式

`tools/recover.py` 解码 Cocos 压缩 JSON 资源包与 CCONB 动画；根据 SpriteFrame rect、旋转标记、裁剪偏移及原始尺寸从图集中拆图。保留原资源 UUID 映射和 9-slice 边距。

Spine 使用发布包内的二进制 `.bin` 恢复为 `.skel`，并配对原 atlas 与 PNG。atlas 按原始换行写入，避免导入器误把 `size:` 行当成纹理名。原图是非预乘 alpha，运行骨骼使用 `premultipliedAlpha=false`。

字体原生资源使用 `uuid.hash/字体文件名.ttf` 路径；不能把它当成 `uuid.hash.ttf`。两种字体已成功下载。当前本地 UI 使用系统字体，便于在编辑器直接调整文字。

`tools/recovery-report.json` 记录 207 张拆分图片、42 个原始预制体、17 段动画和被移除的私有组件类型。缺失引用记录包括原自定义组件/材料/字体等；可运行预制体已经过单独整理，`tools/audit_assets.py` 检查其实际引用，无悬空资源 UUID。
