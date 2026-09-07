export interface GridPosition { row: number; column: number; }
export type MatchOrientation = "horizontal" | "vertical";
export interface MatchGroup {
    type: number;
    orientation: MatchOrientation;
    positions: GridPosition[];
}

export class MatchDetector {
    public static findGroups(grid: ReadonlyArray<ReadonlyArray<number>>, matchLength = 3): MatchGroup[] {
        if (!grid.length || !grid[0].length) return [];
        const rows = grid.length;
        const columns = grid[0].length;
        const runs: MatchGroup[] = [];

        for (let row = 0; row < rows; row++) {
            for (let start = 0; start < columns;) {
                const type = grid[row][start];
                let end = start + 1;
                while (end < columns && grid[row][end] === type) end++;
                if (type >= 0 && end - start >= matchLength) {
                    runs.push({
                        type,
                        orientation: "horizontal",
                        positions: Array.from({ length: end - start }, (_, index) => ({ row, column: start + index })),
                    });
                }
                start = end;
            }
        }

        for (let column = 0; column < columns; column++) {
            for (let start = 0; start < rows;) {
                const type = grid[start][column];
                let end = start + 1;
                while (end < rows && grid[end][column] === type) end++;
                if (type >= 0 && end - start >= matchLength) {
                    runs.push({
                        type,
                        orientation: "vertical",
                        positions: Array.from({ length: end - start }, (_, index) => ({ row: start + index, column })),
                    });
                }
                start = end;
            }
        }

        const groups: MatchGroup[] = [];
        for (const run of runs) {
            const runKeys = new Set(run.positions.map((position) => `${position.row}:${position.column}`));
            const intersections: number[] = [];
            for (let index = 0; index < groups.length; index++) {
                const group = groups[index];
                if (group.type === run.type
                    && group.positions.some((position) => runKeys.has(`${position.row}:${position.column}`))) {
                    intersections.push(index);
                }
            }
            if (!intersections.length) {
                groups.push(run);
                continue;
            }

            const target = groups[intersections[0]];
            const merged = new Map(target.positions.map((position) => [`${position.row}:${position.column}`, position]));
            for (const position of run.positions) merged.set(`${position.row}:${position.column}`, position);
            for (const index of intersections.slice(1)) {
                for (const position of groups[index].positions) merged.set(`${position.row}:${position.column}`, position);
            }
            target.positions = [...merged.values()];
            for (let index = intersections.length - 1; index >= 1; index--) groups.splice(intersections[index], 1);
        }
        return groups;
    }

    public static find(grid: ReadonlyArray<ReadonlyArray<number>>, matchLength = 3): GridPosition[] {
        const matched = new Set<string>();
        for (const group of MatchDetector.findGroups(grid, matchLength)) {
            for (const position of group.positions) matched.add(`${position.row}:${position.column}`);
        }
        return [...matched].map((key) => {
            const [row, column] = key.split(":").map(Number);
            return { row, column };
        });
    }

    public static selfCheck(): void {
        if (MatchDetector.find([[1, -1, -1], [-1, 1, -1], [-1, -1, 1]]).length !== 0) {
            throw new Error("Diagonal gems must not match.");
        }
        if (MatchDetector.find([[1, 1, 1]]).length !== 3) throw new Error("Horizontal match failed.");
        if (MatchDetector.find([[1], [1], [1]]).length !== 3) throw new Error("Vertical match failed.");
        const cross = MatchDetector.findGroups([[-1, 1, -1], [1, 1, 1], [-1, 1, -1]]);
        if (cross.length !== 1 || cross[0].positions.length !== 5) throw new Error("Cross match merge failed.");
        if (MatchDetector.find([[1, 1, 1, 2]], 4).length !== 0) throw new Error("Configurable match length failed.");
    }
}
