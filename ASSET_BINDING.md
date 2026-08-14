# BlockBlast 资源拖拽说明

所有需要拖入 Inspector 的资源现在都统一放在 `assets/resources`。

## GameUI 组件

选中场景中的 `GameRoot`，找到 `GameUI` 组件。图片要展开后拖入里面的 `SpriteFrame`，不要拖 `Texture2D`。

| GameUI 属性 | 拖入资源 |
|---|---|
| Background Frame | `assets/resources/images/ui/game-background.png` → SpriteFrame |
| Best Crown Frame | `assets/resources/images/ui/best-crown.png` → SpriteFrame |
| Settings Gear Frame | `assets/resources/images/ui/settings-gear.png` → SpriteFrame |
| Board Cell Frame | `assets/resources/images/ui/board-cell.png` → SpriteFrame |
| Board Backplate Frame | `assets/resources/images/ui/board-backplate.png` → SpriteFrame |
| Gem Tile Frame | `assets/resources/images/block/gem-tile.png` → SpriteFrame |
| Bomb Icon Frame | `assets/resources/images/booster/bomb-icon.png` → SpriteFrame |
| Hammer Icon Frame | `assets/resources/images/booster/hammer-icon.png` → SpriteFrame |
| Rainbow Icon Frame | `assets/resources/images/booster/rainbow-icon.png` → SpriteFrame |
| Ad Icon Frame | `assets/resources/images/ui/icon_ad.png` → SpriteFrame |
| Block Prefab | `assets/resources/prefabs/block/Block.prefab` |
| Destroy Effect Prefab | `assets/resources/prefabs/effect/DestroyEffect.prefab` |
| Combo Text Prefab | `assets/resources/prefabs/effect/ComboText.prefab` |
| Score Text Prefab | `assets/resources/prefabs/effect/ScoreText.prefab` |
| Next Panel Prefab | `assets/resources/prefabs/ui/NextPanl.prefab` |
| Tutorial Pointer Frame | `assets/resources/images/ui/tutorial/tutorial_pointer.png` → SpriteFrame |

## AudioManager 组件

仍然选中 `GameRoot`，找到 `AudioManager` 组件。

| AudioManager 属性 | 拖入资源 |
|---|---|
| Background Music | `assets/resources/audio/bg.mp3` |
| Clear Sound | `assets/resources/audio/bubble_collide.mp3` |
| Click Sound | `assets/resources/audio/clickbtn.mp3` |
| Game Lost Sound | `assets/resources/audio/game_lost.mp3` |
| Game Win Sound | `assets/resources/audio/game_win.mp3` |
| Game Start Sound | `assets/resources/audio/go.mp3` |
| Item Ready Sound | `assets/resources/audio/item_ready.mp3` |

`air_bubble_exp.mp3` 当前没有对应字段，可以先不拖。

## 不需要手动拖入

- `assets/resources/levels/level_001.json` 至 `level_100.json`：由 `LevelManager` 自动加载。
- `assets/resources/config.json`：配置文件。
- `assets/resources/images/ui/nextlevel`：已经被 `NextPanl.prefab` 引用，不需要逐张拖入。

三个特效 Prefab 在编辑器里看起来比较空是正常的，粒子、文字内容和 Tween 动画会在运行时代码配置。
