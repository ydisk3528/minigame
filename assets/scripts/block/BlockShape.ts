export interface ShapeCell {
    readonly row: number;
    readonly column: number;
}

export interface BlockShape {
    readonly id: number;
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly cells: readonly ShapeCell[];
}

export enum BlockShapeId {
    Single = 1,
    DominoHorizontal,
    DominoVertical,
    Line3Horizontal,
    Line3Vertical,
    Line4Horizontal,
    Line4Vertical,
    Line5Horizontal,
    Line5Vertical,
    Square2,
    Rectangle3x2,
    Rectangle2x3,
    SmallL,
    SmallLMirrored,
    LargeL,
    LargeLMirrored,
    TUp,
    TDown,
    ZHorizontal,
    SHorizontal,
    ZVertical,
    SVertical,
    Plus,
    UShape,
    TriangleUp,
    TriangleDown,
    Diamond,
}

function createShape(
    id: BlockShapeId,
    name: string,
    coordinates: readonly (readonly [number, number])[],
): BlockShape {
    const cells = coordinates.map(([row, column]) => ({ row, column }));
    const width = Math.max(...cells.map((cell) => cell.column)) + 1;
    const height = Math.max(...cells.map((cell) => cell.row)) + 1;
    return Object.freeze({
        id,
        name,
        width,
        height,
        cells: Object.freeze(cells),
    });
}

export const BLOCK_SHAPES: readonly BlockShape[] = Object.freeze([
    createShape(BlockShapeId.Single, 'Single', [[0, 0]]),
    createShape(BlockShapeId.DominoHorizontal, 'Domino Horizontal', [[0, 0], [0, 1]]),
    createShape(BlockShapeId.DominoVertical, 'Domino Vertical', [[0, 0], [1, 0]]),
    createShape(BlockShapeId.Line3Horizontal, 'Line 3 Horizontal', [[0, 0], [0, 1], [0, 2]]),
    createShape(BlockShapeId.Line3Vertical, 'Line 3 Vertical', [[0, 0], [1, 0], [2, 0]]),
    createShape(BlockShapeId.Line4Horizontal, 'Line 4 Horizontal', [[0, 0], [0, 1], [0, 2], [0, 3]]),
    createShape(BlockShapeId.Line4Vertical, 'Line 4 Vertical', [[0, 0], [1, 0], [2, 0], [3, 0]]),
    createShape(BlockShapeId.Line5Horizontal, 'Line 5 Horizontal', [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]),
    createShape(BlockShapeId.Line5Vertical, 'Line 5 Vertical', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]),
    createShape(BlockShapeId.Square2, 'Square 2x2', [[0, 0], [0, 1], [1, 0], [1, 1]]),
    createShape(BlockShapeId.Rectangle3x2, 'Rectangle 3x2', [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]]),
    createShape(BlockShapeId.Rectangle2x3, 'Rectangle 2x3', [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]]),
    createShape(BlockShapeId.SmallL, 'Small L', [[0, 0], [1, 0], [1, 1]]),
    createShape(BlockShapeId.SmallLMirrored, 'Small L Mirrored', [[0, 1], [1, 0], [1, 1]]),
    createShape(BlockShapeId.LargeL, 'Large L', [[0, 0], [1, 0], [2, 0], [2, 1]]),
    createShape(BlockShapeId.LargeLMirrored, 'Large L Mirrored', [[0, 1], [1, 1], [2, 0], [2, 1]]),
    createShape(BlockShapeId.TUp, 'T Up', [[0, 0], [0, 1], [0, 2], [1, 1]]),
    createShape(BlockShapeId.TDown, 'T Down', [[0, 1], [1, 0], [1, 1], [1, 2]]),
    createShape(BlockShapeId.ZHorizontal, 'Z Horizontal', [[0, 0], [0, 1], [1, 1], [1, 2]]),
    createShape(BlockShapeId.SHorizontal, 'S Horizontal', [[0, 1], [0, 2], [1, 0], [1, 1]]),
    createShape(BlockShapeId.ZVertical, 'Z Vertical', [[0, 1], [1, 0], [1, 1], [2, 0]]),
    createShape(BlockShapeId.SVertical, 'S Vertical', [[0, 0], [1, 0], [1, 1], [2, 1]]),
    createShape(BlockShapeId.Plus, 'Plus', [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]]),
    createShape(BlockShapeId.UShape, 'U Shape', [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]]),
    createShape(BlockShapeId.TriangleUp, 'Triangle Up', [[0, 1], [1, 0], [1, 1], [1, 2]]),
    createShape(BlockShapeId.TriangleDown, 'Triangle Down', [[0, 0], [0, 1], [0, 2], [1, 1]]),
    createShape(BlockShapeId.Diamond, 'Diamond', [[0, 1], [1, 0], [1, 2], [2, 1]]),
]);

export function getBlockShape(shapeId: number): BlockShape | null {
    return BLOCK_SHAPES.find((shape) => shape.id === shapeId) ?? null;
}
