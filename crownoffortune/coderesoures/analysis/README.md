# 来源与分析索引

- 官方介绍：https://jiligames.com/PlusIntro/621?showGame=true
- 试玩发布根地址：https://casino-wbgame.jiligames.com/cof/
- 源客户端 Cocos 3.6.2；主游戏 bundle `df5e3`，main bundle `bb4a5`。
- `../manifest.json`：480 个已保存发布文件，URL、相对路径、大小与 SHA256。
- `game-readable.js`：仅解码字符串表后的客户端文本，用于静态分析；没有运行其游戏初始化或联网代码。
- `classes/Game_Define.js`：5×3、8 类符号、20 条线路、Respin 状态标记、音频名称。
- `classes/FeatureAck.js`：客户端功能演示中的锁列和重转示例数据。
- `classes/CheckState.js`、`ExpandWildState.js`：展示层的重转和扩展状态流程。是否继续重转由服务器 AwardTypeFlag 决定，本地工程采用明确的模拟规则。
- `classes/SlotReels.js`、`SymbolSpine.js`、`WildSymbolSpine.js`：转轴、符号动画及巨型 Wild 演出参考。
- `../../tools/recovery-report.json`：恢复资源统计、原版私有组件移除记录与未恢复引用。

新工程只使用恢复美术与自行实现的本地玩法，不执行这里归档的原版混淆脚本。
