import {
    _decorator,
    Component,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import { GAME_CONFIG } from '../utils/Config';
import type { BlockShape } from '../block/BlockShape';
import type { GridCoordinate } from './LineClearResolver';

const { ccclass } = _decorator;

export const BOARD_CELL_SIZE = 141;
export const BOARD_CELL_GAP = 12;
export const BOARD_CELL_STEP = BOARD_CELL_SIZE + BOARD_CELL_GAP;
const SHOW_BOARD_CELLS = false;
const BOARD_BACKPLATE_PADDING = 78;
const GRID_PIXEL_WIDTH = BOARD_CELL_SIZE * GAME_CONFIG.boardColumns
    + BOARD_CELL_GAP * (GAME_CONFIG.boardColumns - 1);
const GRID_PIXEL_HEIGHT = BOARD_CELL_SIZE * GAME_CONFIG.boardRows
    + BOARD_CELL_GAP * (GAME_CONFIG.boardRows - 1);
const FIRST_CELL_X = -GRID_PIXEL_WIDTH / 2 + BOARD_CELL_SIZE / 2;
const FIRST_CELL_Y = GRID_PIXEL_HEIGHT / 2 - BOARD_CELL_SIZE / 2;
const BLOCK_MATCH_LENGTH = 4;

export interface BoardCellState {
    readonly row: number;
    readonly column: number;
    readonly node: Node;
    active: boolean;
    occupied: boolean;
    blockNode: Node | null;
    colorId: number | null;
}

export interface PlacementCandidate {
    readonly row: number;
    readonly column: number;
    readonly center: Readonly<Vec3>;
    readonly valid: boolean;
}

export type BoardCoordinate = GridCoordinate;

export interface LineClearResult {
    readonly completedRows: readonly number[];
    readonly completedColumns: readonly number[];
    readonly clearedCells: readonly BoardCoordinate[];
    readonly clearedVisualNodes: readonly Node[];
}

export interface BoardCellRelocation {
    readonly from: BoardCoordinate;
    readonly to: BoardCoordinate;
    readonly duration: number;
}

@ccclass('BoardManager')
export class BoardManager extends Component {
    private cellLayer: Node | null = null;
    private blockLayer: Node | null = null;
    private backplateLayer: Node | null = null;
    private backplateFrame: SpriteFrame | null = null;
    private readonly cells: BoardCellState[][] = [];
    private initialized = false;

    public initialize(
        cellLayer: Node,
        blockLayer: Node,
        cellSpriteFrame: SpriteFrame | null,
        backplateLayer: Node,
        backplateFrame: SpriteFrame | null,
    ): void {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.cellLayer = cellLayer;
        this.blockLayer = blockLayer;
        this.backplateLayer = backplateLayer;
        this.backplateFrame = backplateFrame;
        this.createBoardCells();
        if (SHOW_BOARD_CELLS) {
            this.applyCellSprite(cellSpriteFrame);
        }
        this.rebuildBackplates();
    }

    public getCell(row: number, column: number): BoardCellState | null {
        if (!this.isValidCoordinate(row, column)) {
            return null;
        }
        return this.cells[row][column];
    }

    public getCellLocalPosition(row: number, column: number): Readonly<Vec3> | null {
        const cell = this.getCell(row, column);
        return cell?.node.position ?? null;
    }

    public getCellLayer(): Node | null {
        return this.cellLayer;
    }

    public getBlockLayer(): Node | null {
        if (this.blockLayer === null || !this.blockLayer.isValid) {
            const replacement = new Node('BlockLayer');
            replacement.layer = this.node.layer;
            replacement.setParent(this.node);
            replacement.addComponent(UITransform).setContentSize(GRID_PIXEL_WIDTH, GRID_PIXEL_HEIGHT);
            this.blockLayer = replacement;
            console.warn('[BoardManager] BlockLayer was missing and has been rebuilt.');
        }
        return this.blockLayer;
    }

    public findNearestCell(localPosition: Readonly<Vec3>): BoardCoordinate | null {
        const column = Math.round((localPosition.x - FIRST_CELL_X) / BOARD_CELL_STEP);
        const row = Math.round((FIRST_CELL_Y - localPosition.y) / BOARD_CELL_STEP);
        const cell = this.getCell(row, column);
        if (cell === null || !cell.active
            || Vec3.distance(localPosition, cell.node.position) > BOARD_CELL_STEP * 0.7) {
            return null;
        }
        return { row, column };
    }

    public getColorAt(row: number, column: number): number | null {
        return this.getCell(row, column)?.colorId ?? null;
    }

    public setCellOccupant(
        row: number,
        column: number,
        blockNode: Node | null,
        colorId: number | null,
    ): void {
        const cell = this.getCell(row, column);
        if (cell === null || !cell.active) {
            return;
        }
        cell.blockNode = blockNode;
        cell.colorId = colorId;
        cell.occupied = blockNode !== null && colorId !== null;
    }

    public getOccupiedCoordinatesByColor(colorId: number): readonly BoardCoordinate[] {
        const coordinates: BoardCoordinate[] = [];
        for (const row of this.cells) {
            for (const cell of row) {
                if (cell.occupied && cell.colorId === colorId) {
                    coordinates.push({ row: cell.row, column: cell.column });
                }
            }
        }
        return coordinates;
    }

    public clearCells(coordinates: readonly BoardCoordinate[]): LineClearResult {
        const uniqueCoordinates = new Map<string, BoardCoordinate>();
        for (const coordinate of coordinates) {
            const cell = this.getCell(coordinate.row, coordinate.column);
            if (cell?.occupied) {
                uniqueCoordinates.set(
                    `${coordinate.row}:${coordinate.column}`,
                    coordinate,
                );
            }
        }

        const clearedCells = Array.from(uniqueCoordinates.values());
        const clearedVisualNodes: Node[] = [];
        for (const coordinate of clearedCells) {
            const cell = this.cells[coordinate.row][coordinate.column];
            if (cell.blockNode !== null) {
                clearedVisualNodes.push(cell.blockNode);
            }
            cell.occupied = false;
            cell.blockNode = null;
            cell.colorId = null;
        }

        return {
            completedRows: [],
            completedColumns: [],
            clearedCells,
            clearedVisualNodes,
        };
    }

    /** Permanently turns active board cells into holes for the current level. */
    public destroyBoardCells(coordinates: readonly BoardCoordinate[]): readonly BoardCoordinate[] {
        const destroyed = new Map<string, BoardCoordinate>();
        for (const coordinate of coordinates) {
            const cell = this.getCell(coordinate.row, coordinate.column);
            if (cell === null || !cell.active) {
                continue;
            }
            cell.active = false;
            cell.occupied = false;
            cell.blockNode = null;
            cell.colorId = null;
            cell.node.active = false;
            destroyed.set(`${coordinate.row}:${coordinate.column}`, { ...coordinate });
        }
        // Runtime holes only hide their cell tiles. Keep the backplate generated
        // from the level's original mask so explosions never resize/resegment it.
        return Array.from(destroyed.values());
    }

    /** Assigns each new hole the nearest surviving cell, without moving the backplate. */
    public planCellRelocations(
        vacancies: readonly BoardCoordinate[],
    ): readonly BoardCellRelocation[] {
        const targets = vacancies.filter((coordinate) =>
            this.getCell(coordinate.row, coordinate.column)?.active === false);
        const sources: BoardCoordinate[] = [];
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
                if (this.getCell(row, column)?.active === true) {
                    sources.push({ row, column });
                }
            }
        }

        const candidates: Array<{
            readonly from: BoardCoordinate;
            readonly to: BoardCoordinate;
            readonly distanceSquared: number;
            readonly distance: number;
        }> = [];
        for (const to of targets) {
            for (const from of sources) {
                const rowDistance = Math.abs(from.row - to.row);
                const columnDistance = Math.abs(from.column - to.column);
                candidates.push({
                    from,
                    to,
                    distanceSquared: rowDistance * rowDistance
                        + columnDistance * columnDistance,
                    distance: Math.max(rowDistance, columnDistance),
                });
            }
        }
        candidates.sort((first, second) =>
            first.distanceSquared - second.distanceSquared
            || first.distance - second.distance);

        const usedSources = new Set<string>();
        const filledTargets = new Set<string>();
        const relocations: BoardCellRelocation[] = [];
        for (const candidate of candidates) {
            const sourceKey = `${candidate.from.row}:${candidate.from.column}`;
            const targetKey = `${candidate.to.row}:${candidate.to.column}`;
            if (usedSources.has(sourceKey) || filledTargets.has(targetKey)) {
                continue;
            }
            usedSources.add(sourceKey);
            filledTargets.add(targetKey);
            relocations.push({
                from: { ...candidate.from },
                to: { ...candidate.to },
                duration: Math.min(0.42, 0.2 + Math.max(0, candidate.distance - 1) * 0.045),
            });
        }
        return relocations;
    }

    /** Starts visible cell movement and immediately updates the logical mask. */
    public animateCellRelocations(relocations: readonly BoardCellRelocation[]): number {
        let longestDuration = 0;
        for (const relocation of relocations) {
            const source = this.getCell(relocation.from.row, relocation.from.column);
            const target = this.getCell(relocation.to.row, relocation.to.column);
            if (source === null || target === null || !source.active || target.active) {
                continue;
            }
            longestDuration = Math.max(longestDuration, relocation.duration);
            target.active = true;
            target.occupied = source.occupied;
            target.blockNode = source.blockNode;
            target.colorId = source.colorId;
            source.active = false;
            source.occupied = false;
            source.blockNode = null;
            source.colorId = null;

            target.node.active = false;
            source.node.active = true;
            Tween.stopAllByTarget(source.node);
            tween(source.node)
                .to(relocation.duration, { position: new Vec3(target.node.position) }, {
                    easing: 'sineInOut',
                })
                .start();
        }
        return longestDuration;
    }

    /** Snaps visual cells after the awaited movement, including interrupted tweens. */
    public completeCellRelocations(relocations: readonly BoardCellRelocation[]): void {
        for (const relocation of relocations) {
            const source = this.getCell(relocation.from.row, relocation.from.column);
            const target = this.getCell(relocation.to.row, relocation.to.column);
            if (source === null || target === null) {
                continue;
            }
            Tween.stopAllByTarget(source.node);
            source.node.setPosition(
                FIRST_CELL_X + source.column * BOARD_CELL_STEP,
                FIRST_CELL_Y - source.row * BOARD_CELL_STEP,
            );
            source.node.active = false;
            target.node.active = target.active;
        }
    }

    public findNearestPlacement(
        shape: BlockShape,
        blockCenter: Readonly<Vec3>,
    ): PlacementCandidate | null {
        const topLeftX = blockCenter.x - (shape.width - 1) * BOARD_CELL_STEP / 2;
        const topLeftY = blockCenter.y + (shape.height - 1) * BOARD_CELL_STEP / 2;
        const column = Math.round((topLeftX - FIRST_CELL_X) / BOARD_CELL_STEP);
        const row = Math.round((FIRST_CELL_Y - topLeftY) / BOARD_CELL_STEP);
        const center = this.getPlacementCenter(shape, row, column);

        if (center === null || Vec3.distance(blockCenter, center) > BOARD_CELL_STEP * 0.85) {
            return null;
        }

        return {
            row,
            column,
            center,
            valid: this.canPlace(shape, row, column),
        };
    }

    public getPlacementCenter(
        shape: BlockShape,
        row: number,
        column: number,
    ): Readonly<Vec3> | null {
        if (!this.isValidCoordinate(row, column)) {
            return null;
        }
        return new Vec3(
            FIRST_CELL_X + column * BOARD_CELL_STEP
                + (shape.width - 1) * BOARD_CELL_STEP / 2,
            FIRST_CELL_Y - row * BOARD_CELL_STEP
                - (shape.height - 1) * BOARD_CELL_STEP / 2,
        );
    }

    public canPlace(shape: BlockShape, row: number, column: number): boolean {
        return shape.cells.every((offset) => {
            const cell = this.getCell(row + offset.row, column + offset.column);
            return cell !== null && cell.active && !cell.occupied;
        });
    }

    public applyBoardMask(mask?: readonly string[]): void {
        const validMask = mask !== undefined
            && mask.length === GAME_CONFIG.boardRows
            && mask.every((line) => new RegExp(`^[01]{${GAME_CONFIG.boardColumns}}$`).test(line));
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
                const cell = this.cells[row]?.[column];
                if (cell === undefined) {
                    continue;
                }
                cell.active = validMask ? mask[row][column] === '1' : true;
                cell.node.active = cell.active;
                if (!cell.active) {
                    cell.occupied = false;
                    cell.blockNode = null;
                    cell.colorId = null;
                }
            }
        }
        this.rebuildBackplates();
        this.fitBoardToLandscape();
    }

    public placeShape(
        shape: BlockShape,
        row: number,
        column: number,
        visualCells: readonly Node[],
        colorIds: number | readonly number[],
    ): LineClearResult | null {
        if (visualCells.length !== shape.cells.length || !this.canPlace(shape, row, column)) {
            return null;
        }

        const placedCoordinates: BoardCoordinate[] = [];
        shape.cells.forEach((offset, index) => {
            const cell = this.getCell(row + offset.row, column + offset.column);
            if (cell !== null) {
                cell.occupied = true;
                cell.blockNode = visualCells[index];
                cell.colorId = typeof colorIds === 'number'
                    ? colorIds
                    : colorIds[index] ?? colorIds[0] ?? 0;
                placedCoordinates.push({ row: cell.row, column: cell.column });
            }
        });
        return this.clearColorMatches(placedCoordinates);
    }

    private clearColorMatches(placedCoordinates: readonly BoardCoordinate[]): LineClearResult {
        const placedKeys = new Set(
            placedCoordinates.map((coordinate) => `${coordinate.row}:${coordinate.column}`),
        );
        const matched = new Map<string, BoardCoordinate>();
        const completedRows = new Set<number>();
        const completedColumns = new Set<number>();
        const collectRun = (
            run: readonly BoardCellState[],
            axis: 'row' | 'column',
            axisIndex: number,
        ): void => {
            if (run.length < BLOCK_MATCH_LENGTH) {
                return;
            }
            const hasNewCell = run.some((cell) => placedKeys.has(`${cell.row}:${cell.column}`));
            const hasExistingCell = run.some((cell) => !placedKeys.has(`${cell.row}:${cell.column}`));
            // 新放下的直线块不能在空棋盘上自消，必须与棋盘原有同色块连接。
            if (!hasNewCell || !hasExistingCell) {
                return;
            }
            if (axis === 'row') {
                completedRows.add(axisIndex);
            } else {
                completedColumns.add(axisIndex);
            }
            for (const cell of run) {
                matched.set(`${cell.row}:${cell.column}`, {
                    row: cell.row,
                    column: cell.column,
                });
            }
        };
        const scan = (
            cells: readonly BoardCellState[],
            axis: 'row' | 'column',
            axisIndex: number,
        ): void => {
            let run: BoardCellState[] = [];
            let runColor: number | null = null;
            const flush = (): void => {
                collectRun(run, axis, axisIndex);
                run = [];
                runColor = null;
            };
            for (const cell of cells) {
                if (!cell.active || !cell.occupied || cell.colorId === null) {
                    flush();
                    continue;
                }
                if (runColor !== null && cell.colorId !== runColor) {
                    flush();
                }
                runColor = cell.colorId;
                run.push(cell);
            }
            flush();
        };
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            scan(this.cells[row], 'row', row);
        }
        for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
            scan(this.cells.map((row) => row[column]), 'column', column);
        }

        // 有效四连触发后，把与它上下左右连通的同色方块全部并入本次消除。
        const queue = Array.from(matched.values());
        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ] as const;
        for (let cursor = 0; cursor < queue.length; cursor += 1) {
            const coordinate = queue[cursor];
            const sourceColor = this.getCell(coordinate.row, coordinate.column)?.colorId;
            if (sourceColor === null || sourceColor === undefined) {
                continue;
            }
            for (let index = 0; index < directions.length; index += 1) {
                const [rowOffset, columnOffset] = directions[index];
                const neighbor = this.getCell(
                    coordinate.row + rowOffset,
                    coordinate.column + columnOffset,
                );
                if (neighbor === null || !neighbor.active || !neighbor.occupied
                    || neighbor.colorId !== sourceColor) {
                    continue;
                }
                const key = `${neighbor.row}:${neighbor.column}`;
                if (matched.has(key)) {
                    continue;
                }
                const connected = { row: neighbor.row, column: neighbor.column };
                matched.set(key, connected);
                queue.push(connected);
            }
        }

        const clearedCells = Array.from(matched.values());
        const clearedVisualNodes: Node[] = [];
        for (const coordinate of clearedCells) {
            const cell = this.cells[coordinate.row][coordinate.column];
            if (cell.blockNode !== null) {
                clearedVisualNodes.push(cell.blockNode);
            }
            cell.occupied = false;
            cell.blockNode = null;
            cell.colorId = null;
        }

        return {
            completedRows: Array.from(completedRows),
            completedColumns: Array.from(completedColumns),
            clearedCells,
            clearedVisualNodes,
        };
    }

    public hasAnyPlacement(shape: BlockShape): boolean {
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
                if (this.canPlace(shape, row, column)) {
                    return true;
                }
            }
        }
        return false;
    }

    public getOccupiedCellCount(): number {
        let occupiedCount = 0;
        for (const row of this.cells) {
            for (const cell of row) {
                if (cell.occupied) {
                    occupiedCount += 1;
                }
            }
        }
        return occupiedCount;
    }

    public isValidCoordinate(row: number, column: number): boolean {
        return Number.isInteger(row)
            && Number.isInteger(column)
            && row >= 0
            && row < GAME_CONFIG.boardRows
            && column >= 0
            && column < GAME_CONFIG.boardColumns;
    }

    public resetBoardState(): void {
        for (const row of this.cells) {
            for (const cell of row) {
                cell.occupied = false;
                cell.blockNode = null;
                cell.colorId = null;
            }
        }
        const blockLayer = this.getBlockLayer();
        if (blockLayer !== null) {
            const children = blockLayer.children as readonly Node[] | null;
            for (let index = (children?.length ?? 0) - 1; index >= 0; index -= 1) {
                const child = children?.[index];
                if (child === undefined) {
                    continue;
                }
                child.removeFromParent();
                child.destroy();
            }
        }
    }

    private createBoardCells(): void {
        if (this.cellLayer === null) {
            return;
        }

        this.cellLayer.removeAllChildren();
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            const rowCells: BoardCellState[] = [];
            for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
                const cellNode = this.createCellNode(row, column);
                this.cellLayer.addChild(cellNode);
                rowCells.push({
                    row,
                    column,
                    node: cellNode,
                    active: true,
                    occupied: false,
                    blockNode: null,
                    colorId: null,
                });
            }
            this.cells.push(rowCells);
        }
    }

    private createCellNode(row: number, column: number): Node {
        const cellNode = new Node(`Cell_${row}_${column}`);
        cellNode.layer = Layers.Enum.UI_2D;
        cellNode.setPosition(
            FIRST_CELL_X + column * BOARD_CELL_STEP,
            FIRST_CELL_Y - row * BOARD_CELL_STEP,
        );
        cellNode.addComponent(UITransform).setContentSize(BOARD_CELL_SIZE, BOARD_CELL_SIZE);

        if (SHOW_BOARD_CELLS) {
            const sprite = cellNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        return cellNode;
    }

    private applyCellSprite(frame: SpriteFrame | null): void {
        if (frame === null) {
            console.warn('[BoardManager] Board Cell Frame is not assigned on GameUI.');
            return;
        }
        for (const row of this.cells) {
            for (const cell of row) {
                const sprite = cell.node.getComponent(Sprite);
                if (sprite !== null) {
                    sprite.spriteFrame = frame;
                }
            }
        }
    }

    private rebuildBackplates(): void {
        if (this.backplateLayer === null) {
            return;
        }
        this.backplateLayer.removeAllChildren();
        if (this.backplateFrame === null) {
            console.warn('[BoardManager] Board Backplate Frame is not assigned on GameUI.');
            return;
        }
        const visited = new Set<string>();
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
        let regionIndex = 0;
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
                const start = this.cells[row]?.[column];
                const startKey = `${row}:${column}`;
                if (start === undefined || !start.active || visited.has(startKey)) {
                    continue;
                }
                let minRow = row;
                let maxRow = row;
                let minColumn = column;
                let maxColumn = column;
                const queue: Array<{ row: number; column: number }> = [{ row, column }];
                visited.add(startKey);
                for (let cursor = 0; cursor < queue.length; cursor += 1) {
                    const current = queue[cursor];
                    minRow = Math.min(minRow, current.row);
                    maxRow = Math.max(maxRow, current.row);
                    minColumn = Math.min(minColumn, current.column);
                    maxColumn = Math.max(maxColumn, current.column);
                    for (const [rowOffset, columnOffset] of directions) {
                        const nextRow = current.row + rowOffset;
                        const nextColumn = current.column + columnOffset;
                        const next = this.getCell(nextRow, nextColumn);
                        const key = `${nextRow}:${nextColumn}`;
                        if (next === null || !next.active || visited.has(key)) {
                            continue;
                        }
                        visited.add(key);
                        queue.push({ row: nextRow, column: nextColumn });
                    }
                }
                const first = this.getCellLocalPosition(minRow, minColumn);
                const last = this.getCellLocalPosition(maxRow, maxColumn);
                if (first === null || last === null) {
                    continue;
                }
                const width = (maxColumn - minColumn) * BOARD_CELL_STEP
                    + BOARD_CELL_SIZE + BOARD_BACKPLATE_PADDING;
                const height = (maxRow - minRow) * BOARD_CELL_STEP
                    + BOARD_CELL_SIZE + BOARD_BACKPLATE_PADDING;
                const node = new Node(`BoardBackplate_${regionIndex++}`);
                node.layer = Layers.Enum.UI_2D;
                node.setParent(this.backplateLayer);
                node.setPosition((first.x + last.x) / 2, (first.y + last.y) / 2);
                node.addComponent(UITransform).setContentSize(width, height);
                const sprite = node.addComponent(Sprite);
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                sprite.spriteFrame = this.backplateFrame;
            }
        }
    }

    private fitBoardToLandscape(): void {
        let minRow: number = GAME_CONFIG.boardRows;
        let maxRow = -1;
        let minColumn: number = GAME_CONFIG.boardColumns;
        let maxColumn = -1;
        for (const row of this.cells) {
            for (const cell of row) {
                if (!cell.active) continue;
                minRow = Math.min(minRow, cell.row);
                maxRow = Math.max(maxRow, cell.row);
                minColumn = Math.min(minColumn, cell.column);
                maxColumn = Math.max(maxColumn, cell.column);
            }
        }
        if (maxRow < minRow || maxColumn < minColumn) {
            this.node.setScale(1, 1, 1);
            return;
        }
        const contentWidth = (maxColumn - minColumn) * BOARD_CELL_STEP
            + BOARD_CELL_SIZE + BOARD_BACKPLATE_PADDING;
        const contentHeight = (maxRow - minRow) * BOARD_CELL_STEP
            + BOARD_CELL_SIZE + BOARD_BACKPLATE_PADDING;
        const scale = Math.min(1, 1400 / contentWidth, 820 / contentHeight);
        this.node.setScale(scale, scale, 1);
    }
}
