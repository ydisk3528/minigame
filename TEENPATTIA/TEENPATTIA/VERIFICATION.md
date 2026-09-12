# 验证记录

## 已完成

- 修复启动时 `quickSettingRoot` 为空导致访问 `active` 报错：面板引用丢失时按名称恢复已有场景节点，旧场景缺少节点时加载对应的已绑定预制体。回归覆盖三项引用置空、缺失节点加载、避免重复实例及资源加载错误传播；编辑器现场重现仍需实际预览确认。

- 原版 quickSetting 静态预制体接入启动/选房流程；回归覆盖启动显示、Switch Table 不扣底注、Play Now 开始牌局，类型检查和七个场景/可玩预制体引用检查通过。最终浏览器视觉检查仍受下述工具问题阻挡。

- WINNER / LOSE 独立预制体和场景实例已绑定；回归覆盖真实胜负结算入口、金额/手牌显示、面板互斥、关闭、继续、返回大厅及防重复结算。原版图片重新编排，未标为原厂原样面板。

- Cocos Creator 3.8.6 Web Mobile 构建成功；输出 `build/web-mobile`，日志 `build-client.log`。
- TypeScript 类型检查通过。
- 修复动画导入名带 UUID 后缀时无法按原名播放的问题；回归检查覆盖原名、导入后名称及特效父节点启用。
- 恢复后发现 `Clip_SendPoker_Blind` 的导入缓存为 0 字节，重新导入完好的源动画后修复 CCON 格式错误。构建脚本同时检查失败日志和 Creator 退出码（其内置定义中成功为 36），避免仅凭末尾成功字样误判。
- `tools/rules.test.cjs`：遍历全部 22,100 种三张牌组合，检查六类牌型数量；运行 1,000 局固定随机种子的牌局，验证筹码守恒、发牌不重复、动作限制、比牌平局、侧比牌拒绝及结算幂等性。
- `tools/scene-flow.test.cjs`：读取实际 `TeenPatti.scene` 的节点和引用，用无渲染组件替身运行真实控制器，检查大厅入房、规则确认、发牌、看牌、弃牌、电脑结算、继续下一局、退出确认、静音及 Native/LocalStorage 存档路径。此项是场景绑定和逻辑检查，不是浏览器视觉或 Android 运行证明。
- `tools/audit_assets.py`：六个场景/可玩预制体文件没有悬空 UUID 或对象索引引用；资产 UUID 唯一；52 张牌面、8 张头像、16 个音频引用完整；场景实例关联实际预制体。
- 下载清单中的所有文件存在且 SHA-256 一致；共享 ZIP 的 CRC 和路径检查通过。

## 浏览器检查状态

初轮本地浏览器能够启动并绘制大厅。该轮发现了原版自定义 layer 与动态背景、人物和 Logo 绑定问题；已在恢复/作者工具中修正，并重新构建。

最终浏览器视觉验收尚未完成：原版试玩标签页曾失去响应，两个浏览器进程分别占用约 17 GB 私有内存，导致系统资源不足。2026-09-12 恢复后内存占用已回落，本地预览服务已重启，但浏览器控制与 Computer Use 的 JavaScript 内核均报 `failed to write kernel assets: 系统找不到指定的路径。 (os error 3)`；重置内核后仍失败，因此不能继续自动截图和点击验收。

因此不能把当前检查表述为最终画面、动画播放及完整牌局的浏览器验收通过。浏览器控制组件恢复后应重新加载 `http://127.0.0.1:8798/`，核对大厅人物/背景/金额、牌桌五座、看牌牌面、比牌双方、倒计时、赢家效果、继续下一局及退出。不要同时重新打开曾失去响应的原站试玩标签。

## 未验证或未还原

- Android 实机、宿主 `cocosJava` 注入与跨启动持久化。
- 原厂联网账号、钱包、匹配、彩金/任务/充值等服务器功能。
- 原厂服务器牌局算法与收益分布；本地牌局不代表服务器实现。
- 所有动画逐帧与原版一致性、不同屏幕尺寸的最终视觉验收。

## 复查命令

```powershell
tsc --noEmit --skipLibCheck --lib 'es2020,dom'
tsc assets\scripts\TeenPattiApp.ts assets\scripts\TeenPattiRules.ts --target es2020 --module commonjs --experimentalDecorators --skipLibCheck --outDir tools\test-build --types ./temp/declarations/cc --lib 'es2020,dom'
node tools\rules.test.cjs
node tools\scene-flow.test.cjs
python tools\audit_assets.py
.\build.ps1
python tools\serve.py
```

## 按需加载改造（当前版本）

当前启动场景不再包含大厅、牌桌、WINNER/LOSE 节点，控制器相关引用和资源数组均为空。它们移至 `assets/resources/deferred`；此前记录中的整场景初始化和 `restorePanel` 检查已被本次按需加载测试替代。

类型检查和资产引用审计通过；无渲染场景回归验证：首屏无 deferred 请求、模拟网络失败不扣款、重试成功才开局、看牌弃牌和电脑结算、胜负按需加载、继续和回大厅复用缓存、原生桥接存档。Loading 的浏览器动画与真实服务器网络耗时仍未完成现场验证。

最新启动流程修正：启动异步加载大厅；选房后加载牌桌并弹出 quickSetting，Play Now 才开始牌局。回归覆盖启动不弹窗、入房下载失败不弹窗不扣款、重试进入牌桌显示确认面板、确认后发牌。
