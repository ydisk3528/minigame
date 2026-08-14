import {
    _decorator,
    Camera,
    Canvas,
    Color,
    Component,
    EventTouch,
    Label,
    Node,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import {
    AdManager,
    type BoosterRewardType,
    type RewardedAdReward,
} from '../ad/AdManager';
import {
    BoardManager,
    type BoardCoordinate,
    type LineClearResult,
} from '../core/BoardManager';
import { EffectManager } from '../effect/EffectManager';
import { AudioManager } from '../core/AudioManager';
import { TutorialManager } from '../ui/TutorialManager';
import { StorageManager, type SaveData } from '../utils/StorageManager';
import { BombBooster } from './BombBooster';
import { HammerBooster } from './HammerBooster';
import { RainbowBooster } from './RainbowBooster';

const { ccclass } = _decorator;

export interface BoosterButtonBinding {
    readonly type: BoosterRewardType;
    readonly node: Node;
    readonly countLabel: Label;
    readonly adIcon?: Node;
}

export interface GrantedBoosterReward {
    readonly type: BoosterRewardType;
    readonly amount: number;
}

type BoosterInventory = SaveData['boosters'];

const BOOSTER_LABELS: Readonly<Record<BoosterRewardType, string>> = Object.freeze({
    bomb: 'BOMB!',
    hammer: 'HAMMER!',
    rainbow: 'RAINBOW!',
});

@ccclass('BoosterManager')
export class BoosterManager extends Component {
    private boardManager: BoardManager | null = null;
    private effectManager: EffectManager | null = null;
    private adManager: AdManager | null = null;
    private statusLabel: Label | null = null;
    private buttonBindings: readonly BoosterButtonBinding[] = [];
    private inventory: BoosterInventory = { bomb: 0, hammer: 0, rainbow: 0 };
    private activeBooster: BoosterRewardType | null = null;
    private uiCamera: Camera | null = null;
    private bombBooster: BombBooster | null = null;
    private hammerBooster: HammerBooster | null = null;
    private rainbowBooster: RainbowBooster | null = null;
    private matchMode = false;
    private currentLevelId = 1;
    private onBoardCleared: ((clearResult: LineClearResult) => void) | null = null;

    public initialize(
        boardManager: BoardManager,
        effectManager: EffectManager,
        adManager: AdManager,
        buttonBindings: readonly BoosterButtonBinding[],
        statusLabel: Label,
    ): void {
        this.boardManager = boardManager;
        this.effectManager = effectManager;
        this.adManager = adManager;
        this.buttonBindings = buttonBindings;
        this.statusLabel = statusLabel;
        const saveData = StorageManager.load();
        if (!saveData.starterBoostersGranted) {
            const updated = StorageManager.update((data) => {
                data.boosters.bomb = Math.max(1, data.boosters.bomb);
                data.boosters.hammer = Math.max(1, data.boosters.hammer);
                data.boosters.rainbow = Math.max(1, data.boosters.rainbow);
                data.starterBoostersGranted = true;
            });
            this.inventory = { ...updated.boosters };
        } else {
            this.inventory = { ...saveData.boosters };
        }
        this.uiCamera = this.findUICamera();
        this.bombBooster = this.node.addComponent(BombBooster);
        this.hammerBooster = this.node.addComponent(HammerBooster);
        this.rainbowBooster = this.node.addComponent(RainbowBooster);

        for (const binding of buttonBindings) {
            binding.node.on(Node.EventType.TOUCH_END, () => this.selectBooster(binding.type));
        }
        this.node.on(Node.EventType.TOUCH_START, this.captureBoardTouch, this, true);
        this.node.on(Node.EventType.TOUCH_MOVE, this.captureBoardTouch, this, true);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.captureBoardTouch, this, true);
        this.node.on(Node.EventType.TOUCH_END, this.onBoardTouchEnd, this, true);
        this.updateCountLabels();
        this.setStatus('CONNECT 3 OF THE SAME COLOR');
    }

    public reloadInventory(): void {
        this.inventory = { ...StorageManager.load().boosters };
        this.updateCountLabels();
    }

    public playGrantedRewardAnimation(
        rewards: readonly GrantedBoosterReward[],
    ): number {
        if (rewards.length === 0) {
            return 0;
        }
        rewards.forEach((reward, index) => {
            this.scheduleOnce(() => {
                const binding = this.buttonBindings.find((item) => item.type === reward.type);
                if (binding === undefined) return;
                this.setStatus(`REWARD  +${reward.amount} ${reward.type.toUpperCase()}!`);
                const icon = binding.node.getChildByName(`${reward.type}Icon`);
                if (icon !== null) {
                    const origin = icon.position.clone();
                    Tween.stopAllByTarget(icon);
                    icon.setPosition(origin.x, origin.y + 190, origin.z);
                    icon.setScale(0.18, 0.18, 1);
                    icon.angle = -160;
                    tween(icon)
                        .to(0.38, {
                            position: origin,
                            scale: new Vec3(1.5, 1.5, 1),
                            angle: 18,
                        }, { easing: 'backOut' })
                        .to(0.16, { scale: Vec3.ONE, angle: 0 }, { easing: 'sineOut' })
                        .start();
                }
                Tween.stopAllByTarget(binding.node);
                binding.node.setScale(0.82, 0.82, 1);
                tween(binding.node)
                    .to(0.22, { scale: new Vec3(1.32, 1.32, 1) }, { easing: 'backOut' })
                    .to(0.18, { scale: Vec3.ONE }, { easing: 'sineOut' })
                    .start();
                Tween.stopAllByTarget(binding.countLabel.node);
                tween(binding.countLabel.node)
                    .to(0.16, { scale: new Vec3(1.75, 1.75, 1) }, { easing: 'backOut' })
                    .to(0.22, { scale: Vec3.ONE }, { easing: 'sineOut' })
                    .start();
            }, index * 0.24);
        });
        return 0.75 + Math.max(0, rewards.length - 1) * 0.24;
    }

    public setCurrentLevel(levelId: number): void {
        this.currentLevelId = Math.max(1, Math.floor(levelId));
        this.updateAdAvailability();
    }

    public setMatchMode(active: boolean): void {
        this.matchMode = active;
        this.activeBooster = null;
        this.setStatus(active ? 'SWAP GEMS · MATCH SAME COLORS' : 'CONNECT SAME-COLOR GEMS');
    }

    public setBoardClearCallback(
        callback: ((clearResult: LineClearResult) => void) | null,
    ): void {
        this.onBoardCleared = callback;
    }

    public getActiveBooster(): BoosterRewardType | null {
        return this.activeBooster;
    }

    private selectBooster(type: BoosterRewardType): void {
        const tutorialTarget = this.buttonBindings.find((binding) => binding.type === type)?.node;
        if (tutorialTarget !== undefined
            && TutorialManager.instance?.showFirstBooster(tutorialTarget, this.node)) {
            return;
        }
        if (this.adManager?.isShowingAd()) {
            return;
        }
        if (this.inventory[type] <= 0) {
            this.requestRewardedBooster(type);
            return;
        }
        if ((this.boardManager?.getOccupiedCellCount() ?? 0) === 0) {
            this.activeBooster = null;
            this.setStatus('BOARD IS EMPTY · PLACE A BLOCK FIRST');
            return;
        }

        this.activeBooster = this.activeBooster === type ? null : type;
        if (this.activeBooster === null) {
            this.setStatus('BOOSTER CANCELLED');
            return;
        }
        this.setStatus(
            type === 'bomb'
                ? 'TAP BOARD • CLEAR 3×3'
                : type === 'hammer'
                    ? 'TAP ONE BLOCK'
                    : 'TAP A COLOR',
        );
        this.pulseButton(type);
    }

    private requestRewardedBooster(type: BoosterRewardType): void {
        const levelId = this.currentLevelId;
        if (StorageManager.load().claimedLevelAdRewards[levelId.toString()] === true) {
            this.setStatus('AD REWARD ALREADY CLAIMED');
            this.updateAdAvailability();
            return;
        }
        const started = this.adManager?.showRewardedAd(
            { kind: 'booster', booster: type, amount: 1 },
            {
                onCountdown: (seconds) => this.setStatus(`AD • ${seconds}s`),
                onComplete: (reward) => this.onRewardComplete(reward, levelId),
            },
        ) ?? false;
        if (!started) {
            this.setStatus('AD NOT READY');
        }
    }

    private onRewardComplete(reward: RewardedAdReward, levelId: number): void {
        let granted = false;
        if (reward.kind === 'coin') {
            StorageManager.update((data) => {
                const rewardKey = levelId.toString();
                if (data.claimedLevelAdRewards[rewardKey] === true) {
                    return;
                }
                data.claimedLevelAdRewards[rewardKey] = true;
                data.coin += reward.amount;
                granted = true;
            });
            if (!granted) {
                this.setStatus('AD REWARD ALREADY CLAIMED');
                return;
            }
            AudioManager.instance?.playItemReady();
            this.updateAdAvailability();
            this.setStatus(`+${reward.amount} COINS`);
            return;
        }

        const updated = StorageManager.update((data) => {
            const rewardKey = levelId.toString();
            if (data.claimedLevelAdRewards[rewardKey] === true) {
                return;
            }
            data.claimedLevelAdRewards[rewardKey] = true;
            data.boosters[reward.booster] += reward.amount;
            granted = true;
        });
        if (!granted) {
            this.setStatus('AD REWARD ALREADY CLAIMED');
            this.updateAdAvailability();
            return;
        }
        AudioManager.instance?.playItemReady();
        this.inventory = { ...updated.boosters };
        this.updateCountLabels();
        this.updateAdAvailability();
        this.setStatus(`REWARD • +${reward.amount} ${reward.booster.toUpperCase()}`);
        this.activeBooster = reward.booster;
        this.scheduleOnce(() => {
            if (this.activeBooster === reward.booster) {
                this.setStatus(
                    reward.booster === 'rainbow' ? 'TAP A COLOR' : 'TAP BOARD',
                );
            }
        }, 0.8);
    }

    private captureBoardTouch(event: EventTouch): void {
        if (this.activeBooster !== null) {
            event.propagationStopped = true;
        }
    }

    private onBoardTouchEnd(event: EventTouch): void {
        if (this.activeBooster === null || this.boardManager === null) {
            return;
        }
        event.propagationStopped = true;
        const coordinate = this.getTouchedCoordinate(event);
        if (coordinate === null) {
            this.setStatus('TAP INSIDE THE BOARD');
            return;
        }

        const targets = this.getTargets(this.activeBooster, coordinate);
        if (targets.length === 0) {
            if (this.boardManager.getOccupiedCellCount() === 0) {
                this.activeBooster = null;
                this.setStatus('BOARD IS EMPTY · BOOSTER CANCELLED');
            } else {
                this.setStatus('CHOOSE A FILLED BLOCK');
            }
            return;
        }

        const usedBooster = this.activeBooster;
        const clearResult = this.boardManager.clearCells(targets);
        if (clearResult.clearedCells.length === 0) {
            return;
        }
        this.inventory[usedBooster] = Math.max(0, this.inventory[usedBooster] - 1);
        this.activeBooster = null;
        this.saveInventory();
        this.updateCountLabels();
        if (usedBooster === 'bomb') {
            AudioManager.instance?.playBomb();
        } else if (usedBooster === 'hammer') {
            AudioManager.instance?.playHammer();
        } else if (usedBooster === 'rainbow') {
            AudioManager.instance?.playRainbow();
        }
        this.effectManager?.playBoosterClear(clearResult, BOOSTER_LABELS[usedBooster]);
        if (this.matchMode) {
            this.onBoardCleared?.(clearResult);
        }
        this.setStatus(`${clearResult.clearedCells.length} BLOCKS CLEARED`);
    }

    private getTargets(
        type: BoosterRewardType,
        coordinate: BoardCoordinate,
    ): readonly BoardCoordinate[] {
        if (this.boardManager === null) {
            return [];
        }
        switch (type) {
            case 'bomb':
                return this.bombBooster?.getTargets(
                    this.boardManager,
                    coordinate.row,
                    coordinate.column,
                ) ?? [];
            case 'hammer':
                return this.hammerBooster?.getTargets(
                    this.boardManager,
                    coordinate.row,
                    coordinate.column,
                ) ?? [];
            case 'rainbow':
                return this.rainbowBooster?.getTargets(
                    this.boardManager,
                    coordinate.row,
                    coordinate.column,
                ) ?? [];
        }
    }

    private getTouchedCoordinate(event: EventTouch): BoardCoordinate | null {
        const blockLayer = this.boardManager?.getBlockLayer();
        const transform = blockLayer?.getComponent(UITransform);
        if (transform === null || transform === undefined || this.uiCamera === null) {
            return null;
        }
        const location = event.getLocation();
        const worldPosition = this.uiCamera.screenToWorld(new Vec3(location.x, location.y, 0));
        const localPosition = transform.convertToNodeSpaceAR(worldPosition);
        localPosition.z = 0;
        return this.boardManager?.findNearestCell(localPosition) ?? null;
    }

    private saveInventory(): void {
        const inventory = this.inventory;
        StorageManager.update((data) => {
            data.boosters = { ...inventory };
        });
    }

    private updateCountLabels(): void {
        for (const binding of this.buttonBindings) {
            binding.countLabel.string = this.inventory[binding.type].toString();
        }
    }

    private updateAdAvailability(): void {
        const claimed = StorageManager.load()
            .claimedLevelAdRewards[this.currentLevelId.toString()] === true;
        for (const binding of this.buttonBindings) {
            if (binding.adIcon !== undefined) {
                binding.adIcon.active = !claimed;
            }
        }
    }

    private setStatus(text: string): void {
        if (this.statusLabel === null) {
            return;
        }
        this.statusLabel.string = text;
        Tween.stopAllByTarget(this.statusLabel.node);
        this.statusLabel.node.setScale(0.92, 0.92, 1);
        tween(this.statusLabel.node)
            .to(0.12, { scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    private pulseButton(type: BoosterRewardType): void {
        const buttonNode = this.buttonBindings.find((binding) => binding.type === type)?.node;
        if (buttonNode === undefined) {
            return;
        }
        Tween.stopAllByTarget(buttonNode);
        tween(buttonNode)
            .to(0.1, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'backOut' })
            .to(0.12, { scale: Vec3.ONE }, { easing: 'sineOut' })
            .start();
    }

    private findUICamera(): Camera | null {
        let current: Node | null = this.node;
        while (current !== null) {
            const canvas = current.getComponent(Canvas);
            if (canvas?.cameraComponent !== null && canvas?.cameraComponent !== undefined) {
                return canvas.cameraComponent;
            }
            current = current.parent;
        }
        return null;
    }
}
