# Ring AviatorX

基于 Cocos Creator 3.8.6 + TypeScript 的 2D 像素风飞机钻圈小游戏。

## 运行

1. 用 Cocos Creator 3.8.6 打开本目录。
2. 打开 `assets/scenes/Main.scene`，点击预览。
3. 点击/拖动控制飞机高度；松手后飞机下落。

游戏对象由 `GameManager` 在单场景中装配，飞机和圆环从 `assets/resources/prefabs` 的预制体实例化并复用。关卡数据来自 `assets/resources/levels/levels.json`。

## Vue 关卡编辑器

```powershell
cd level-editor
npm install
npm run dev
```

编辑器支持关卡增删、参数校验、实时航线预览、导入与导出 JSON。导出的文件可直接覆盖 `assets/resources/levels/levels.json`。

## 结构

- `GameManager.ts`：状态、输入、碰撞、主循环
- `PlayerController.ts`：飞行手感、倾斜、螺旋桨帧表现
- `RingSpawner.ts` / `RingController.ts`：生成、移动、变体与穿环判定
- `ScoreManager.ts`：分数、Combo、Perfect、最高分
- `LevelManager.ts`：JSON 关卡读取
- `UIManager.ts`：菜单、HUD、结算
- `ObjectPoolManager.ts`：圆环/玩家对象复用
- `BackgroundScroller.ts` / `EffectManager.ts`：循环背景与像素特效

运行版会从 `assets/resources/art` 加载飞机、圆环和天空像素 Sprite，并强制使用最近邻过滤；Graphics 仅在图片资源加载失败时作为兜底。
