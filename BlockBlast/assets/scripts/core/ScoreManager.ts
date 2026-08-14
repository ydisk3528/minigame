import { _decorator, Component, Label, tween, Tween, Vec3 } from 'cc';
import type { LineClearResult } from './BoardManager';
import { StorageManager } from '../utils/StorageManager';

const { ccclass } = _decorator;

@ccclass('ScoreManager')
export class ScoreManager extends Component {
    private scoreLabel: Label | null = null;
    private score = 0;
    private displayedScore = 0;
    private animationStartScore = 0;
    private animationElapsed = 0;
    private animationDuration = 0;
    private scoreAnimating = false;
    private combo = 0;
    private matchMultiplier = 10;
    private matchMultiplierPrepared = false;
    private onScoreChanged: ((score: number) => void) | null = null;
    private onMatchMultiplierRolled: ((multiplier: number) => Promise<void> | void) | null = null;

    public initialize(scoreLabel: Label): void {
        this.scoreLabel = scoreLabel;
        this.displayedScore = this.score;
        this.renderScore(this.displayedScore);
    }

    public setScoreChangedCallback(callback: ((score: number) => void) | null): void {
        this.onScoreChanged = callback;
    }

    public setMatchMultiplierCallback(
        callback: ((multiplier: number) => Promise<void> | void) | null,
    ): void {
        this.onMatchMultiplierRolled = callback;
    }

    public async prepareMatchClear(): Promise<void> {
        if (this.combo !== 0 || this.matchMultiplierPrepared) {
            return;
        }
        this.matchMultiplierPrepared = true;
        this.matchMultiplier = 10 + Math.floor(Math.random() * 21);
        await this.onMatchMultiplierRolled?.(this.matchMultiplier);
    }

    public recordPlacement(placedCellCount: number, clearResult: LineClearResult): number {
        const lineCount = clearResult.completedRows.length
            + clearResult.completedColumns.length;
        const placementScore = this.applyLuckBonus(placedCellCount * 10);

        if (lineCount === 0) {
            this.combo = 0;
            this.score += placementScore;
            this.animateScoreTo(this.score, placementScore);
            this.onScoreChanged?.(this.score);
            return placementScore;
        }

        this.combo += 1;
        const lineScore = this.applyLuckBonus(
            clearResult.clearedCells.length * 10 * lineCount,
        );
        const comboBonus = this.applyLuckBonus(Math.max(0, this.combo - 1) * 50);
        const gainedScore = placementScore + lineScore + comboBonus;
        this.score += gainedScore;
        this.animateScoreTo(this.score, gainedScore);
        this.onScoreChanged?.(this.score);
        return gainedScore;
    }

    public recordMatchClear(clearedCellCount: number, cascade: number): number {
        const normalizedCascade = Math.max(1, Math.floor(cascade));
        this.combo = normalizedCascade;
        const baseScore = Math.max(0, Math.floor(clearedCellCount)) * 25;
        const chainBonus = Math.max(0, normalizedCascade - 1) * 75;
        const gainedScore = this.applyLuckBonus(
            (baseScore * normalizedCascade + chainBonus) * this.matchMultiplier,
        );
        this.score += gainedScore;
        this.animateScoreTo(this.score, gainedScore);
        this.onScoreChanged?.(this.score);
        return gainedScore;
    }

    public resetCombo(): void {
        this.combo = 0;
        this.matchMultiplierPrepared = false;
    }

    public getScore(): number {
        return this.score;
    }

    public getCombo(): number {
        return this.combo;
    }

    public resetScore(): void {
        this.score = 0;
        this.combo = 0;
        this.matchMultiplierPrepared = false;
        this.scoreAnimating = false;
        this.displayedScore = 0;
        this.animationStartScore = 0;
        this.animationElapsed = 0;
        this.animationDuration = 0;
        if (this.scoreLabel !== null) {
            Tween.stopAllByTarget(this.scoreLabel.node);
            this.scoreLabel.node.setScale(Vec3.ONE);
        }
        this.renderScore(0);
        this.onScoreChanged?.(this.score);
    }

    protected override update(deltaTime: number): void {
        if (!this.scoreAnimating) {
            return;
        }
        this.animationElapsed += Math.max(0, deltaTime);
        const progress = Math.min(1, this.animationElapsed / this.animationDuration);
        const eased = 1 - (1 - progress) ** 3;
        this.displayedScore = Math.floor(
            this.animationStartScore + (this.score - this.animationStartScore) * eased,
        );
        if (progress >= 1) {
            this.displayedScore = this.score;
            this.scoreAnimating = false;
        }
        this.renderScore(this.displayedScore);
    }

    private animateScoreTo(targetScore: number, gainedScore: number): void {
        this.animationStartScore = this.displayedScore;
        this.animationElapsed = 0;
        this.animationDuration = Math.min(
            0.65,
            0.2 + Math.sqrt(Math.max(1, gainedScore)) * 0.01,
        );
        this.scoreAnimating = this.animationStartScore !== targetScore;
        this.playScorePulse();
    }

    private applyLuckBonus(score: number): number {
        return StorageManager.isBuffActive('luck')
            ? Math.floor(score * 1.25)
            : score;
    }

    private playScorePulse(): void {
        if (this.scoreLabel === null) {
            return;
        }
        const labelNode = this.scoreLabel.node;
        Tween.stopAllByTarget(labelNode);
        labelNode.setScale(Vec3.ONE);
        tween(labelNode)
            .to(0.08, { scale: new Vec3(1.12, 1.12, 1) }, { easing: 'sineOut' })
            .to(0.16, { scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    private renderScore(value: number): void {
        if (this.scoreLabel !== null) {
            this.scoreLabel.string = Math.max(0, Math.floor(value)).toLocaleString('en-US');
        }
    }
}
