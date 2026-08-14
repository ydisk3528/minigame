@echo off
chcp 65001

echo Creating Cocos Block Blast structure...

cd assets

:: 创建目录
mkdir scenes

mkdir scripts
mkdir scripts\core
mkdir scripts\block
mkdir scripts\level
mkdir scripts\booster
mkdir scripts\ui
mkdir scripts\ad
mkdir scripts\utils

mkdir prefabs
mkdir prefabs\block
mkdir prefabs\board
mkdir prefabs\effect
mkdir prefabs\ui

mkdir textures
mkdir textures\blocks
mkdir textures\ui
mkdir textures\effect

mkdir resources
mkdir resources\levels


:: 创建场景
type nul > scenes\Game.scene


:: 创建核心脚本
type nul > scripts\core\GameManager.ts
type nul > scripts\core\BoardManager.ts
type nul > scripts\core\ScoreManager.ts
type nul > scripts\core\EventManager.ts


:: 创建方块脚本
type nul > scripts\block\Block.ts
type nul > scripts\block\BlockShape.ts
type nul > scripts\block\BlockData.ts
type nul > scripts\block\BlockFactory.ts


:: 创建关卡
type nul > scripts\level\LevelManager.ts
type nul > scripts\level\LevelData.ts


:: 创建道具
type nul > scripts\booster\BoosterManager.ts
type nul > scripts\booster\BombBooster.ts
type nul > scripts\booster\HammerBooster.ts
type nul > scripts\booster\RainbowBooster.ts


:: 创建UI
type nul > scripts\ui\UIManager.ts
type nul > scripts\ui\GameUI.ts
type nul > scripts\ui\ResultUI.ts


:: 创建广告
type nul > scripts\ad\AdManager.ts


:: 工具
type nul > scripts\utils\StorageManager.ts
type nul > scripts\utils\Config.ts


:: 创建配置
type nul > resources\config.json

type nul > resources\levels\level_001.json
type nul > resources\levels\level_002.json
type nul > resources\levels\level_003.json


echo.
echo Done!
pause