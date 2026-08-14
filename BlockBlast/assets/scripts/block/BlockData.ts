export interface CellPosition {
    readonly row: number;
    readonly column: number;
}

export enum BlockColorId {
    Blue = 0,
    Green,
    Yellow,
    Orange,
    Purple,
    Pink,
}

export interface BlockData {
    readonly shapeId: number;
    readonly colorId: BlockColorId;
    readonly cellColorIds?: readonly BlockColorId[];
}
