# Flappy AviatorX

A portrait 2D pixel game project for Cocos Creator 3.8. Open `assets/scenes/Game.scene` and start Preview to play.

## Runtime structure

`GameManager` creates the background, obstacle, item, effect, player, HUD, and menu layers. Gameplay objects and interface panels are instantiated from prefabs. The player handles gravity, flap velocity, tilt, propeller frames, and exhaust. Pipes move through configurable gaps. The game manager owns state, spawning, scoring, pooling, dash collision rules, level completion, and unlock progression.

## Prefabs

- `assets/prefabs/gameplay/Player.prefab`: aircraft and flight behavior.
- `assets/prefabs/gameplay/PipePair.prefab`: upper and lower pipe pair.
- `assets/prefabs/gameplay/DashItem.prefab`: dash collectible.
- `assets/prefabs/ui/ScoreHUD.prefab`: in-game score.
- `assets/prefabs/ui/MainMenu.prefab`: title and main navigation.
- `assets/prefabs/ui/GameOverPanel.prefab`: result, retry, and menu actions.
- `assets/prefabs/ui/LevelSelect.prefab`: mission list, targets, and lock state.
- `assets/prefabs/ui/LevelCompletePanel.prefab`: completion and next-mission flow.

## Art and background

All gameplay PNG files are stored in `assets/resources/art` and referenced by actual SpriteFrame properties. Runtime scenery uses `Background.prefab` with separate sky, cloud, distant-tree, and grass images. Each scrolling layer contains three recycled tiles with mirrored neighbors for seamless edges and independent parallax speed. Simple Graphics drawing remains only as a safe fallback if the prefab is missing. Texture filtering is set to Nearest.

## Levels and progression

Level data lives in `assets/resources/config/levels.json`. Each entry configures pipe speed, spawn interval, gap size and range, background speed, item chance, dash duration, target score, and the special-obstacle flag. Completing a mission unlocks only the next mission. Selected and unlocked missions are stored with Cocos local storage.

## Dash and effects

The dash multiplier increases world speed, changes the aircraft effect, strengthens the exhaust, and enables speed lines. Pipe collisions during dash trigger pixel debris and recycle the obstacle instead of ending the run. Pipes, collectibles, and debris are pooled.

## Vue level editor

The editor is located in `tools/level-editor`. It supports adding, copying, deleting, editing, previewing, and directly saving level JSON in Chrome or Edge.

```bash
npm install --prefix tools/level-editor
npm run dev --prefix tools/level-editor
```

## Validation

```bash
node tools/validate-project.mjs
npm run build --prefix tools/level-editor
```
