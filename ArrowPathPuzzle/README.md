# Arrow Path Puzzle

Cocos Creator 3.8.x + TypeScript 版，直接移植自 `E:\wg\cocos\jiantou`。

## 运行

1. 用 Cocos Creator 3.8.6 打开本目录。
2. 打开 `assets/scenes/Game.scene`，点击预览。

## 移植内容

- 默认使用原版第 2 关：25×38 网格、65 条箭头路径，数据来自原始 `JianTouLevel.json`。
- 原版 SubGame 图片和 LYFrame 音乐/音效位于 `assets/resources/ported`。
- `Level.js`、`Line.js`、`GameMenu.js`、`Emoji.js`、`MadeLevel.js` 的 3.8 TypeScript 对应实现位于 `assets/scripts/ported`。
- 保留 750×1334 布局、750×950 棋盘可视区、拖动/双指缩放、底部缩放条、倒计时、生命、阻挡反馈和箭头飞出。

路径仍复用 `assets/prefabs/gameplay/ArrowPath.prefab`，线宽和箭头大小已改为原版的 8/16 像素。

## 关卡生成器与道具

- 独立 Vue 生成器位于 `tools/level-generator`，支持自定义轮廓、心形、二战战斗机、H 形和批量随机关卡。
- 橡皮擦：任选一条路径直接消除；灯泡：提示当前可消除路径；炸弹：清除目标附近的路径。
- 三张道具图均为带透明通道的 128×128 PNG，单张约 17–26 KB。
- 三步新手引导首次进入自动显示；三张低对比竖屏背景按关卡循环使用，每张约 31–37 KB。
