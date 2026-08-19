export class ScoreManager {
  score = 0;
  combo = 0;
  best = Number(globalThis.localStorage?.getItem('ring-aviatorx-best') ?? 0);

  reset(): void { this.score = 0; this.combo = 0; }

  pass(perfect: boolean): number {
    this.combo++;
    this.score += perfect ? 2 : 1;
    if (this.score > this.best) {
      this.best = this.score;
      globalThis.localStorage?.setItem('ring-aviatorx-best', String(this.best));
    }
    return perfect ? 2 : 1;
  }

  fail(): void { this.combo = 0; }
}

