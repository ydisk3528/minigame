import { _decorator, Component, Node, ResolutionPolicy, view } from 'cc';
import { GAME_HEIGHT, GAME_WIDTH } from '../core/GameTypes';
const { ccclass, property } = _decorator;

@ccclass('LevelSelectScene')
export class LevelSelectScene extends Component {
    @property(Node) cloudLayer: Node | null = null;
    @property(Node) distantTreeLayer: Node | null = null;
    @property(Node) grassLayer: Node | null = null;
    private cloudTiles: Node[] = [];
    private treeTiles: Node[] = [];
    private grassTiles: Node[] = [];

    onLoad() {
        view.setDesignResolutionSize(GAME_WIDTH, GAME_HEIGHT, ResolutionPolicy.FIXED_HEIGHT);
        this.cloudTiles = this.cloudLayer?.children ?? [];
        this.treeTiles = this.distantTreeLayer?.children ?? [];
        this.grassTiles = this.grassLayer?.children ?? [];
    }

    update(dt: number) {
        this.scroll(this.cloudTiles, 12, dt); this.scroll(this.treeTiles, 24, dt); this.scroll(this.grassTiles, 72, dt);
    }

    private scroll(tiles: Node[], speed: number, dt: number) {
        for (const tile of tiles) tile.setPosition(tile.position.x - speed * dt, tile.position.y);
        for (const tile of tiles) if (tile.position.x < -810) {
            const right = tiles.reduce((best, other) => other.position.x > best.position.x ? other : best);
            tile.setPosition(right.position.x + 900, tile.position.y);
        }
    }
}
