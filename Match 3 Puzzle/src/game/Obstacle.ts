export enum ObstacleType {
    Ice = 1,
    Chain,
    Crate,
    Stone,
}

export class Obstacle {
    public constructor(
        public readonly type: ObstacleType,
        public hitPoints: number,
        public readonly view: Laya.GImage,
    ) {}

    public get isBlocked(): boolean {
        return this.type === ObstacleType.Crate || this.type === ObstacleType.Stone;
    }
}
