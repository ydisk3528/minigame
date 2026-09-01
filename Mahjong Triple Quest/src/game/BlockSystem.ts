import { TilePlacement } from "./LevelData";

/** Recalculate blocking only after board changes; 18% overlap blocks a tile. */
export class BlockSystem {
    public static calculate(tiles: TilePlacement[], width = 92, height = 122): Set<number> {
        const blocked = new Set<number>();
        for (const tile of tiles) for (const upper of tiles) {
            if (upper.layer <= tile.layer) continue;
            const overlapX = Math.max(0, Math.min(tile.x + width, upper.x + width) - Math.max(tile.x, upper.x));
            const overlapY = Math.max(0, Math.min(tile.y + height, upper.y + height) - Math.max(tile.y, upper.y));
            if (overlapX * overlapY >= width * height * 0.18) { blocked.add(tile.id); break; }
        }
        return blocked;
    }
    public static selfCheck(): void {
        const lower = { id: 1, type: "wan_1", x: 0, y: 0, layer: 0 };
        const upper = { id: 2, type: "wan_1", x: 20, y: 20, layer: 1 };
        if (!this.calculate([lower, upper]).has(1) || this.calculate([lower]).has(1)) throw new Error("BlockSystem self-check failed");
    }
}
