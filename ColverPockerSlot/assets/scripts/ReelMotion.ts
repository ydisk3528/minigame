// Shipped SpinMoving geometry: six symbols per column, one full belt per cycle.
export const REEL = { height: 102.5, cycle: .18, rise: .025, up: 20, down: 30, buffer: .05 };
export function reelStop(column: number, turbo: boolean): number { return turbo ? .36 : .9 + column * REEL.cycle; }
export function reelFrame(time: number, column: number, row: number, turbo: boolean, stopOverride?: number) {
    const rise = turbo ? 0 : REEL.rise, start = rise * 5;
    const stop = start + Math.min(reelStop(column, turbo), stopOverride ?? Infinity), base = 153.75 - row * REEL.height;
    if (time < start) {
        return { y: base + REEL.up * Math.max(0, Math.min(1, (time - column * rise) / rise)), wrap: -1, final: false, stopped: false };
    }
    if (time < stop) {
        const cycles = (time - start) / REEL.cycle, distance = (cycles % 1) * REEL.height * 6;
        const wrapped = distance >= REEL.height * (4 - row + .5);
        return { y: base - distance + (wrapped ? REEL.height * 6 : 0), wrap: Math.floor(cycles) + (wrapped ? 1 : 0), final: time >= stop - REEL.cycle, stopped: false };
    }
    const t = time - stop;
    const displacement = t < REEL.buffer ? -REEL.down * t / REEL.buffer : t < REEL.buffer * 2 ? -REEL.down * (2 - t / REEL.buffer) : 0;
    return { y: base + displacement, wrap: 100, final: true, stopped: t >= REEL.buffer * 2 };
}
