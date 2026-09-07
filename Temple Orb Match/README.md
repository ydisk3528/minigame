# Temple Orb Match · 遗迹灵珠消消乐

由 `Match 3 Puzzle` 当前工程复制的独立 LayaAir 3.4.0 工程。
使用 1080 × 1920 竖屏画布，保留交换三消、100 关、特殊宝石、道具和关卡编辑器。
界面已改为低对比背景、独立目标区和更大的棋盘。

## 打开与运行

用 LayaAir IDE 3.4.0 打开 `Temple Orb Match.laya`，启动场景为 `assets/Start.ls`。

```powershell
& 'C:\Users\ROG\.layaair\layaair.cmd' run -p 'E:\wg\cocos\minigame\Temple Orb Match'
& 'C:\Users\ROG\.layaair\layaair.cmd' build web -p 'E:\wg\cocos\minigame\Temple Orb Match'
```

Web 构建输出：`release/web`。请通过 HTTP 服务访问，不能直接双击 HTML。
当前预览服务器：`http://127.0.0.1:18094/`（仅本机，服务器运行期间可访问）。
需要重新启动发布包预览时可执行：

```powershell
python -m http.server 18094 --bind 127.0.0.1 --directory 'E:\wg\cocos\minigame\Temple Orb Match\release\web'
```

## 主题资源

- `assets/textures/backgrounds/default/game_background.png`：低对比、柔和石柱背景。
- `assets/textures/gems/default/`：珊瑚橙、宝石蓝、月光银、琥珀金、紫罗兰、玫瑰粉六色圆珠；保留原文件名与 UUID，保证场景与关卡映射兼容。
- `assets/textures/common/ui/`：简洁哑光 HUD、独立目标卡片、砂岩按钮、低对比结算面板。
- `assets/textures/common/special/`：哑光横向/纵向箭头、爆破圆珠和六色花瓣圆珠，与普通圆珠统一风格。
- `assets/Start.ls`、`Level.ls`、`Scene.ls`：首页、选关和游戏场景。
- `assets/resources/prefabs/`：原有道具、障碍、特殊消除和界面预制体。
- `assets/resources/levels/`：100 个关卡与目录。
- `level-editor/`：独立 Vue 关卡编辑器，六色名称与游戏类型对应。

圆珠原图保留透明通道，自动图集以 0.2 比例导出，仅降低贴图分辨率。
游戏内格子为 120 × 120，圆珠为 108 × 108，8 列棋盘宽 960；点击区域、障碍和特殊宝石尺寸同步调整。
原版格子为 108 × 108、圆珠为 96 × 96。新圆珠直径增加 12.5%，移除常驻外发光。
顶部信息与目标分离，960 宽目标区可同时容纳三个目标。新增位图由内置 imagegen 生成，采用柔和石柱背景、哑光圆珠、低对比细边面板。

网页存档使用 `temple-orb-match-save-v1`，不会读取旧游戏的网页进度。
Android 的 `cocosJava` 接口继续保留，原生存档由宿主 App 管理；部署为独立 App 时需配置自己的包名和宿主。

## 关卡编辑器

```powershell
cd 'E:\wg\cocos\minigame\Temple Orb Match\level-editor'
npm ci
npm run dev
```

检查：`npm run check`、`npm run validate`；编辑器构建：`npm run build`。
生成关卡时只选择此新工程的关卡目录。

## 验证记录

2026-09-07：TypeScript 检查、LayaAir 场景验证、100 关数据验证、编辑器自检与构建、Web 完整构建通过。
浏览器竖屏试玩已验证首页、选关、交换与连消、步数/分数/目标计数、锤子道具和新手引导。
胜利结算通过开发调试入口触发检查，不代表 100 关逐关通关。
未构建 Android 安装包，未执行手机设备测试。
预览图片保存在 `preview/`。

柔和版复测：`node tests/check-layout.mjs`、TypeScript 检查和完整 Web 构建通过；浏览器 405 × 720 下确认三个目标同时可见，交换连消、锤子命中和横向特殊消除正常，控制台无警告或错误。新版截图为 `preview/start-calm.png`、`preview/game-calm.png`、`preview/result-calm.png`。
