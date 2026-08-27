import { GameConfig } from "./GameConfig";

export enum SpecialType {
    None,
    RocketHorizontal,
    RocketVertical,
    Bomb,
    Rainbow,
}

export class Gem {
    public constructor(
        public readonly id: number, public readonly type: number,
        public row: number, public column: number, public readonly view: Laya.GImage,
        public readonly specialType = SpecialType.None,
    ) {}

    public setGridPosition(row: number, column: number): void {
        this.row = row;
        this.column = column;
        this.view.pos(column * GameConfig.cellSize + GameConfig.tileInset,
            row * GameConfig.cellSize + GameConfig.tileInset);
    }

    public setSelected(selected: boolean): void {
        Laya.Tween.clearAll(this.view);
        Laya.Tween.to(this.view, { scaleX: selected ? 1.14 : 1, scaleY: selected ? 1.14 : 1 }, 90, Laya.Ease.quadOut);
        const glow = this.view.getChildByName("IdleGlow") as Laya.GImage;
        if (glow) {
            Laya.Tween.clearAll(glow);
            Laya.Tween.to(glow, { alpha: selected ? 0.62 : 0.28, scaleX: selected ? 1.12 : 1,
                scaleY: selected ? 1.12 : 1 }, 120, Laya.Ease.quadOut);
        }
    }
}
