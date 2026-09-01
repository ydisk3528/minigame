export type MatchKind = "triple" | "sequence" | "special";
export interface MatchResult { indices: number[]; kind: MatchKind; }
const SPECIAL = ["honor_zhong", "honor_fa", "honor_bai"];

export class MatchSystem {
    public static find(types: string[], sequenceEnabled: boolean, specialEnabled: boolean): MatchResult | null {
        const windows = Array.from({ length: Math.max(0, types.length - 2) }, (_, index) => ({ index, values: types.slice(index, index + 3) }));
        const triple = windows.find(({ values }) => values[0] === values[1] && values[1] === values[2]);
        if (triple) return { indices: [triple.index, triple.index + 1, triple.index + 2], kind: "triple" };
        const special = specialEnabled ? windows.find(({ values }) => SPECIAL.every(type => values.includes(type))) : undefined;
        if (special) return { indices: [special.index, special.index + 1, special.index + 2], kind: "special" };
        if (sequenceEnabled) for (const { index, values } of windows) for (const suit of ["wan", "tong", "tiao"]) for (let start = 1; start <= 7; start++) {
            const keys = [start, start + 1, start + 2].map(number => `${suit}_${number}`);
            if (keys.every(key => values.includes(key))) return { indices: [index, index + 1, index + 2], kind: "sequence" };
        }
        return null;
    }
    public static selfCheck(): void {
        if (this.find(["wan_1", "wan_1", "wan_1"], false, false)?.kind !== "triple") throw new Error("triple check failed");
        if (this.find(["wan_1", "wan_2", "wan_3"], true, false)?.kind !== "sequence") throw new Error("sequence check failed");
        if (this.find(SPECIAL, false, true)?.kind !== "special") throw new Error("special check failed");
        if (this.find(["wan_1", "wan_1", "wan_2", "wan_1"], false, false)) throw new Error("separated triple must not match");
        if (this.find(["wan_1", "wan_2", "tong_9", "wan_3"], true, false)) throw new Error("separated sequence must not match");
        if (this.find(["honor_zhong", "honor_fa", "wan_1", "honor_bai"], false, true)) throw new Error("separated special must not match");
        const later = this.find(["wan_2", "wan_1", "wan_1", "wan_1"], false, false);
        if (later?.indices.join(",") !== "1,2,3") throw new Error("adjacent triple index check failed");
    }
}
