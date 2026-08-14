import { _decorator, Component } from 'cc';

const { ccclass } = _decorator;

export type BoosterRewardType = 'bomb' | 'hammer' | 'rainbow';

export type RewardedAdReward =
    | { readonly kind: 'coin'; readonly amount: number }
    | {
        readonly kind: 'booster';
        readonly booster: BoosterRewardType;
        readonly amount: number;
    };

export interface RewardedAdCallbacks {
    readonly onCountdown?: (secondsRemaining: number) => void;
    readonly onComplete: (reward: RewardedAdReward) => void;
}

interface ActiveRewardedAd {
    readonly reward: RewardedAdReward;
    readonly callbacks: RewardedAdCallbacks;
    secondsRemaining: number;
}

interface CocosJavaAdBridge {
    showRewardedAd?: (requestId: string) => boolean;
}

interface NativeAdWindow {
    cocosJava?: CocosJavaAdBridge;
    __cocosNativeAdRewardComplete?: (requestId: string) => void;
    __cocosNativeAdRewardFailed?: (requestId: string) => void;
}

let rewardedAdRequestSequence = 0;

@ccclass('AdManager')
export class AdManager extends Component {
    private activeAd: ActiveRewardedAd | null = null;
    private nativeRequestId: string | null = null;

    protected override onLoad(): void {
        this.installNativeCallbacks();
    }

    public showRewardedAd(
        reward: RewardedAdReward,
        callbacks: RewardedAdCallbacks,
    ): boolean {
        if (this.activeAd !== null) {
            return false;
        }

        this.activeAd = {
            reward,
            callbacks,
            secondsRemaining: 5,
        };
        callbacks.onCountdown?.(5);

        const nativeBridge = this.getNativeBridge();
        if (nativeBridge?.showRewardedAd !== undefined) {
            this.installNativeCallbacks();
            const requestId = `reward_${Date.now()}_${rewardedAdRequestSequence += 1}`;
            this.nativeRequestId = requestId;
            try {
                if (nativeBridge.showRewardedAd(requestId) !== false) {
                    return true;
                }
            } catch (error: unknown) {
                console.warn('[AdManager] Native rewarded ad call failed', error);
            }
            this.nativeRequestId = null;
            this.activeAd = null;
            return false;
        }

        this.schedule(this.tickCountdown, 1, 4, 0);
        return true;
    }

    public rewardComplete(): void {
        const activeAd = this.activeAd;
        if (activeAd === null) {
            return;
        }
        this.unschedule(this.tickCountdown);
        this.nativeRequestId = null;
        this.activeAd = null;
        activeAd.callbacks.onComplete(activeAd.reward);
    }

    public isShowingAd(): boolean {
        return this.activeAd !== null;
    }

    protected override onDestroy(): void {
        this.unschedule(this.tickCountdown);
        const nativeWindow = this.getNativeWindow();
        if (nativeWindow.__cocosNativeAdRewardComplete === this.onNativeRewardComplete) {
            delete nativeWindow.__cocosNativeAdRewardComplete;
        }
        if (nativeWindow.__cocosNativeAdRewardFailed === this.onNativeRewardFailed) {
            delete nativeWindow.__cocosNativeAdRewardFailed;
        }
        this.nativeRequestId = null;
        this.activeAd = null;
    }

    private installNativeCallbacks(): void {
        const nativeWindow = this.getNativeWindow();
        nativeWindow.__cocosNativeAdRewardComplete = this.onNativeRewardComplete;
        nativeWindow.__cocosNativeAdRewardFailed = this.onNativeRewardFailed;
    }

    private getNativeWindow(): NativeAdWindow {
        return globalThis as unknown as NativeAdWindow;
    }

    private getNativeBridge(): CocosJavaAdBridge | null {
        return this.getNativeWindow().cocosJava ?? null;
    }

    private readonly onNativeRewardComplete = (requestId: string): void => {
        if (requestId !== this.nativeRequestId) {
            return;
        }
        this.rewardComplete();
    };

    private readonly onNativeRewardFailed = (requestId: string): void => {
        if (requestId !== this.nativeRequestId) {
            return;
        }
        this.nativeRequestId = null;
        this.activeAd = null;
    };

    private readonly tickCountdown = (): void => {
        if (this.activeAd === null) {
            return;
        }
        this.activeAd.secondsRemaining -= 1;
        if (this.activeAd.secondsRemaining <= 0) {
            this.rewardComplete();
            return;
        }
        this.activeAd.callbacks.onCountdown?.(this.activeAd.secondsRemaining);
    };
}
