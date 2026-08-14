import { _decorator, Component, JsonAsset, Label, Node, resources } from 'cc';
import { BlockFactory } from '../block/BlockFactory';
import {
    BoosterManager,
    type GrantedBoosterReward,
} from '../booster/BoosterManager';
import type { BoosterRewardType } from '../ad/AdManager';
import { AudioManager } from '../core/AudioManager';
import { BoardManager, type LineClearResult } from '../core/BoardManager';
import { ScoreManager } from '../core/ScoreManager';
import { MatchBoardManager } from '../match/MatchBoardManager';
import { LevelSelectionState } from '../ui/LevelSelectionState';
import { LevelTransitionUI } from '../ui/LevelTransitionUI';
import { ResultUI } from '../ui/ResultUI';
import { TutorialManager } from '../ui/TutorialManager';
import { StorageManager, type SaveData } from '../utils/StorageManager';
import {
    createDefaultBoardMask,
    generateLevelData,
    isLevelData,
    MAX_LEVEL_COUNT,
    type LevelData,
} from './LevelData';

const { ccclass } = _decorator;

@ccclass('LevelManager')
export class LevelManager extends Component {
    private scoreManager: ScoreManager | null = null;
    private boardManager: BoardManager | null = null;
    private blockFactory: BlockFactory | null = null;
    private resultUI: ResultUI | null = null;
    private levelLabel: Label | null = null;
    private bestScoreLabel: Label | null = null;
    private currentLevel: LevelData | null = null;
    private boosterManager: BoosterManager | null = null;
    private matchBoardManager: MatchBoardManager | null = null;
    private bottomBlockArea: Node | null = null;
    private transitionUI: LevelTransitionUI | null = null;
    private completed = false;
    private winPending = false;
    private levelSessionVersion = 0;
    private loadVersion = 0;
    private publishedLevelCount = 10;

    public initialize(
        scoreManager: ScoreManager,
        boardManager: BoardManager,
        blockFactory: BlockFactory,
        resultUI: ResultUI,
        levelLabel: Label,
        bestScoreLabel: Label,
        boosterManager: BoosterManager,
        matchBoardManager: MatchBoardManager,
        bottomBlockArea: Node,
        transitionUI: LevelTransitionUI,
        publishedLevelCount: number,
    ): void {
        this.scoreManager = scoreManager;
        this.boardManager = boardManager;
        this.blockFactory = blockFactory;
        this.resultUI = resultUI;
        this.levelLabel = levelLabel;
        this.bestScoreLabel = bestScoreLabel;
        this.boosterManager = boosterManager;
        this.matchBoardManager = matchBoardManager;
        this.bottomBlockArea = bottomBlockArea;
        this.transitionUI = transitionUI;
        this.publishedLevelCount = Math.max(1, Math.min(MAX_LEVEL_COUNT, Math.floor(publishedLevelCount)));
        blockFactory.setNoMovesCallback(() => this.onGameLost());
        matchBoardManager.setOutOfMovesCallback(() => this.onGameLost());
        matchBoardManager.setBoardSettledCallback(() => {
            this.onScoreChanged(this.scoreManager?.getScore() ?? 0, true);
            this.updateObjectiveLabel();
        });
        boosterManager.setBoardClearCallback((result: LineClearResult) => {
            this.matchBoardManager?.handleExternalClear(result);
        });
        scoreManager.setScoreChangedCallback((score) => this.onScoreChanged(score));
        const save = StorageManager.load();
        bestScoreLabel.string = save.bestScore.toLocaleString('en-US');
        const selected = LevelSelectionState.consume() ?? save.level;
        void this.loadLevel(Math.min(this.publishedLevelCount, selected));
    }

    public restartCurrentLevel(): boolean {
        if (this.currentLevel === null) return false;
        this.playLevelTransition(this.currentLevel);
        return true;
    }

    public getCurrentLevel(): LevelData | null { return this.currentLevel; }

    public selectLevel(levelId: number): void {
        const unlocked = StorageManager.load().level;
        void this.loadLevel(Math.max(1, Math.min(this.publishedLevelCount, unlocked, Math.floor(levelId))));
    }

    public debugJumpToLevel(levelId: number): void {
        void this.loadLevel(Math.max(1, Math.min(this.publishedLevelCount, Math.floor(levelId))));
    }

    public getPublishedLevelCount(): number { return this.publishedLevelCount; }

    private async loadLevel(levelId: number): Promise<void> {
        const version = ++this.loadVersion;
        const id = Math.min(this.publishedLevelCount, Math.max(1, Math.floor(levelId)));
        const level = await this.loadJsonOrGenerate(id);
        if (this.node.isValid && version === this.loadVersion) this.playLevelTransition(level);
    }

    private playLevelTransition(level: LevelData): void {
        if (this.transitionUI === null) this.applyLevel(level);
        else this.transitionUI.play(level.id, level.gameMode, () => this.applyLevel(level));
    }

    private applyLevel(level: LevelData): void {
        this.levelSessionVersion += 1;
        this.currentLevel = level;
        this.completed = false;
        this.winPending = false;
        this.resultUI?.hide();
        this.matchBoardManager?.deactivate();
        this.boardManager?.resetBoardState();
        this.boardManager?.applyBoardMask(level.boardMask);
        this.scoreManager?.resetScore();
        const matchMode = level.gameMode === 'match3' && level.match3Config !== undefined;
        if (this.bottomBlockArea !== null) this.bottomBlockArea.active = !matchMode;
        const colorCount = level.difficulty === 'easy' ? 3 : level.difficulty === 'normal' ? 4 : 5;
        this.blockFactory?.setGameplayActive(
            !matchMode,
            level.availableShapes,
            colorCount,
            level.difficulty === 'hard' ? 0.35 : 0,
        );
        this.boosterManager?.setCurrentLevel(level.id);
        this.boosterManager?.setMatchMode(matchMode);
        if (matchMode && level.match3Config !== undefined) {
            this.matchBoardManager?.activate(level.match3Config, level.targetScore);
            const levelId = level.id;
            this.scheduleOnce(() => {
                if (this.currentLevel?.id === levelId && !this.completed) {
                    TutorialManager.instance?.showFirstMatch(this.boardManager?.node ?? this.node);
                }
            }, 0.55);
        }
        AudioManager.instance?.playGameStart();
        this.updateObjectiveLabel();
    }

    private onScoreChanged(score: number, allowCompletion = false): void {
        this.updateBestScore(score);
        this.updateObjectiveLabel(score);
        if (this.currentLevel === null || this.completed || this.winPending) return;
        if (this.currentLevel.gameMode === 'match3') {
            if (score < this.currentLevel.targetScore
                || !allowCompletion
                || !this.matchBoardManager?.isBoardEmpty()) return;
        } else if (score < this.currentLevel.targetScore) return;
        const level = this.currentLevel;
        const session = this.levelSessionVersion;
        this.winPending = true;
        this.scheduleOnce(() => {
            if (!this.completed && this.winPending && session === this.levelSessionVersion
                && this.currentLevel === level) {
                this.completeWin(level, this.scoreManager?.getScore() ?? score);
            }
        }, level.gameMode === 'match3' ? 0.48 : 0.68);
    }

    private completeWin(level: LevelData, score: number): void {
        this.winPending = false;
        this.completed = true;
        const stars = this.calculateStars(level, score);
        let rewardGranted = false;
        let grantedBoosters: GrantedBoosterReward[] = [];
        StorageManager.update((data) => {
            data.bestScore = Math.max(data.bestScore, score);
            const key = level.id.toString();
            if (data.claimedLevelRewards[key] !== true) {
                data.claimedLevelRewards[key] = true;
                data.coin += level.reward;
                grantedBoosters = this.applyBoosterReward(data, level.boosterReward);
                rewardGranted = true;
            }
            data.levelStars[key] = Math.max(data.levelStars[key] ?? 0, stars);
            if (level.id < this.publishedLevelCount) data.level = Math.max(data.level, level.id + 1);
        });
        const freeGift = StorageManager.tryGrantFreeGift();
        if (freeGift !== null) grantedBoosters.push({ type: freeGift, amount: 1 });
        AudioManager.instance?.playWin();
        if ((rewardGranted && level.boosterReward !== undefined) || freeGift !== null) {
            this.boosterManager?.reloadInventory();
            this.scheduleOnce(() => AudioManager.instance?.playItemReady(), 0.08);
        }
        const delay = this.boosterManager?.playGrantedRewardAnimation(grantedBoosters) ?? 0;
        if (delay > 0) {
            this.scheduleOnce(() => {
                if (this.currentLevel === level) this.showResult(level, score, stars, true, rewardGranted);
            }, delay);
        } else {
            this.showResult(level, score, stars, true, rewardGranted);
        }
    }

    private onGameLost(): void {
        if (this.completed || this.winPending || this.currentLevel === null) return;
        this.completed = true;
        AudioManager.instance?.playLost();
        this.showResult(this.currentLevel, this.scoreManager?.getScore() ?? 0, 0, false, false);
    }

    private showResult(
        level: LevelData,
        score: number,
        stars: number,
        won: boolean,
        rewardGranted = false,
    ): void {
        this.resultUI?.show({
            levelId: level.id,
            score,
            stars,
            won,
            completionReward: level.reward,
            rewardGranted,
            hasPrevious: level.id > 1,
            hasNext: level.id < this.publishedLevelCount,
            onPrevious: () => void this.loadLevel(Math.max(1, level.id - 1)),
            onReplay: () => this.playLevelTransition(level),
            onNext: () => void this.loadLevel(Math.min(this.publishedLevelCount, level.id + 1)),
        });
    }

    private calculateStars(level: LevelData, score: number): number {
        if (score < level.targetScore) return 0;
        if (level.gameMode === 'match3') {
            const initial = Math.max(1, this.matchBoardManager?.getInitialMoves() ?? 1);
            const ratio = (this.matchBoardManager?.getMovesRemaining() ?? 0) / initial;
            return ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
        }
        const ratio = score / Math.max(1, level.targetScore);
        return ratio >= 1.45 ? 3 : ratio >= 1.15 ? 2 : 1;
    }

    private updateObjectiveLabel(score = this.scoreManager?.getScore() ?? 0): void {
        if (this.levelLabel === null || this.currentLevel === null) return;
        const level = this.currentLevel;
        const progress = `${score.toLocaleString('en-US')}/${level.targetScore.toLocaleString('en-US')}`;
        if (level.gameMode === 'match3') {
            const moves = this.matchBoardManager?.getMovesRemaining() ?? level.match3Config?.moveLimit ?? 0;
            const remaining = this.matchBoardManager?.getRemainingGemCount() ?? 0;
            if (this.matchBoardManager?.isClearingBoardPhase()) {
                this.levelLabel.string = `LEVEL ${level.id}  ·  TARGET REACHED  ·  CLEAR BOARD  ·  MOVES ${moves}  ·  LEFT ${remaining}`;
                return;
            }
            const length = this.matchBoardManager?.getMatchLength() ?? level.match3Config?.matchLength ?? 4;
            this.levelLabel.string = `LEVEL ${level.id}  ·  MATCH ${length}  ·  ${progress}  ·  MOVES ${moves}  ·  LEFT ${remaining}`;
            return;
        }
        const combo = this.scoreManager?.getCombo() ?? 0;
        this.levelLabel.string = `LEVEL ${level.id}  ·  BLOCK  ·  ${progress}${combo > 1 ? `  ·  COMBO x${combo}` : ''}`;
    }

    private applyBoosterReward(
        data: SaveData,
        reward: LevelData['boosterReward'],
    ): GrantedBoosterReward[] {
        if (reward === undefined) return [];
        if (reward.type === 'all') {
            data.boosters.bomb += reward.amount;
            data.boosters.hammer += reward.amount;
            data.boosters.rainbow += reward.amount;
            return [
                { type: 'bomb', amount: reward.amount },
                { type: 'hammer', amount: reward.amount },
                { type: 'rainbow', amount: reward.amount },
            ];
        }
        const type: BoosterRewardType = reward.type === 'random'
            ? (['bomb', 'hammer', 'rainbow'] as const)[Math.floor(Math.random() * 3)]
            : reward.type;
        data.boosters[type] += reward.amount;
        return [{ type, amount: reward.amount }];
    }

    private updateBestScore(score: number): void {
        const save = StorageManager.load();
        if (score <= save.bestScore) return;
        save.bestScore = score;
        StorageManager.save(save);
        if (this.bestScoreLabel !== null) this.bestScoreLabel.string = score.toLocaleString('en-US');
    }

    private loadJsonOrGenerate(levelId: number): Promise<LevelData> {
        const padded = levelId < 10 ? `00${levelId}` : levelId < 100 ? `0${levelId}` : `${levelId}`;
        return new Promise((resolve) => resources.load(`levels/level_${padded}`, JsonAsset, (error, asset) => {
            if (error || !isLevelData(asset?.json)) {
                resolve(generateLevelData(levelId));
                return;
            }
            const generated = generateLevelData(levelId);
            const difficulty = asset.json.difficulty ?? generated.difficulty ?? 'easy';
            const gameMode = asset.json.gameMode ?? generated.gameMode ?? 'match3';
            resolve({
                id: levelId,
                gameMode,
                targetScore: asset.json.targetScore,
                availableShapes: [...asset.json.availableShapes],
                reward: Math.max(100, Math.min(500, Math.floor(asset.json.reward))),
                difficulty,
                boosterReward: asset.json.boosterReward === undefined
                    ? undefined : { ...asset.json.boosterReward },
                boardMask: this.normalizeBoardMask(asset.json.boardMask, difficulty, levelId),
                ...(gameMode === 'match3' ? {
                    match3Config: asset.json.match3Config === undefined
                        ? generated.match3Config
                        : {
                            ...asset.json.match3Config,
                            guaranteedFeatures: asset.json.match3Config.guaranteedFeatures === undefined
                                ? undefined : [...asset.json.match3Config.guaranteedFeatures],
                        },
                } : {}),
            });
        }));
    }

    private normalizeBoardMask(
        mask: readonly string[] | undefined,
        difficulty: NonNullable<LevelData['difficulty']>,
        levelId: number,
    ): readonly string[] {
        if (mask === undefined) return createDefaultBoardMask(difficulty, levelId);
        if (mask.every((row) => row.length === 26)) return [...mask];
        if (levelId > 100 && mask.every((row) => row.length === 12 || row.length === 8)) {
            return createDefaultBoardMask(difficulty, levelId);
        }
        if (mask.every((row) => row.length === 12)) return mask.map((row) => `0000000${row}0000000`);
        if (mask.every((row) => row.length === 8)) return mask.map((row) => `000000000${row}000000000`);
        return createDefaultBoardMask(difficulty, levelId);
    }
}
