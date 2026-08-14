# BlockBlast MVP structure

Target: Cocos Creator 3.8.6, TypeScript, Android, portrait 1080 x 1920.

## Runtime modules

- `assets/scripts/core`: game flow, board state, scoring, and events
- `assets/scripts/block`: block data, shapes, factory, and drag component
- `assets/scripts/effect`: code-driven effects and particles
- `assets/scripts/level`: JSON level data and progression
- `assets/scripts/booster`: bomb, hammer, and rainbow boosters
- `assets/scripts/ui`: game and result UI components
- `assets/scripts/ad`: SDK-independent rewarded-ad facade
- `assets/scripts/utils`: configuration and local storage

## Assets

- `assets/resources/prefabs/block`: draggable block prefab
- `assets/resources/prefabs/effect`: runtime effect prefabs
- `assets/resources/prefabs/ui`: UI and result prefabs
- `assets/resources/images/block`: block and gem art
- `assets/resources/images/booster`: booster icons
- `assets/resources/images/common`: shared UI art
- `assets/resources/images/ui`: game, tutorial, and result UI art
- `assets/resources/audio`: music and sound clips
- `assets/resources/levels`: level JSON resources
- `assets/resources/config.json`: shared game configuration

The MVP intentionally has no `assets/animations` directory. All motion is produced in TypeScript with tweens, transforms, opacity, and particles.
