import type { Gem } from "./Gem";
import type { Obstacle } from "./Obstacle";

export class BoardCell {
    public gem: Gem | null = null;
    public obstacle: Obstacle | null = null;
    public get isBlocked(): boolean { return !this.active || (this.obstacle?.isBlocked ?? false); }
    public constructor(public readonly row: number, public readonly column: number, public readonly active = true) {}
}
