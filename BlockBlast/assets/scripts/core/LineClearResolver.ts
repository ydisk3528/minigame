export interface GridCoordinate {
    readonly row: number;
    readonly column: number;
}

export interface CompletedLines {
    readonly rows: readonly number[];
    readonly columns: readonly number[];
    readonly coordinates: readonly GridCoordinate[];
}

export function findCompletedLines(
    occupancy: readonly (readonly boolean[])[],
    activeMask?: readonly (readonly boolean[])[],
): CompletedLines {
    const rowCount = occupancy.length;
    const columnCount = occupancy[0]?.length ?? 0;
    const rows: number[] = [];
    const columns: number[] = [];
    const coordinates = new Map<string, GridCoordinate>();

    for (let row = 0; row < rowCount; row += 1) {
        const activeColumns: number[] = [];
        let complete = occupancy[row].length === columnCount && columnCount > 0;
        for (let column = 0; column < columnCount; column += 1) {
            const active = activeMask?.[row]?.[column] ?? true;
            if (!active) {
                continue;
            }
            activeColumns.push(column);
            if (!occupancy[row][column]) {
                complete = false;
            }
        }
        if (complete && activeColumns.length > 0) {
            rows.push(row);
            for (const column of activeColumns) {
                coordinates.set(`${row}:${column}`, { row, column });
            }
        }
    }

    for (let column = 0; column < columnCount; column += 1) {
        const activeRows: number[] = [];
        let complete = rowCount > 0;
        for (let row = 0; row < rowCount; row += 1) {
            const active = activeMask?.[row]?.[column] ?? true;
            if (!active) {
                continue;
            }
            activeRows.push(row);
            if (occupancy[row].length !== columnCount || !occupancy[row][column]) {
                complete = false;
            }
        }
        if (complete && activeRows.length > 0) {
            columns.push(column);
            for (const row of activeRows) {
                coordinates.set(`${row}:${column}`, { row, column });
            }
        }
    }

    return {
        rows,
        columns,
        coordinates: Array.from(coordinates.values()),
    };
}

export function collectClearedCoordinates(
    _rowCount: number,
    _columnCount: number,
    completedLines: CompletedLines,
): readonly GridCoordinate[] {
    return completedLines.coordinates;
}
