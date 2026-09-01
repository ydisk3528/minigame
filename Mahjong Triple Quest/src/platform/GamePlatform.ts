export interface ShareOptions { title?: string; imageUrl?: string; query?: string; }

interface PlatformAdapter {
    readonly name: "android" | "wechat" | "douyin" | "browser";
    canShare(): boolean;
    share(options?: ShareOptions): boolean;
    showRewardVideo(): Promise<boolean>;
    canOpenPrivacyContract(): boolean;
    openPrivacyContract(): boolean;
    exitGame(): boolean;
    showBanner(): void;
    hideBanner(): void;
}

interface RewardedVideoAd {
    onClose(callback: (result?: { isEnded?: boolean }) => void): void;
    offClose?(callback: (result?: { isEnded?: boolean }) => void): void;
    onError(callback: (error?: unknown) => void): void;
    offError?(callback: (error?: unknown) => void): void;
    show(): Promise<void>;
    load(): Promise<void>;
}

interface MiniGameApi {
    createRewardedVideoAd?: (options: { adUnitId: string }) => RewardedVideoAd;
    shareAppMessage?: (options: ShareOptions & { success?: () => void; fail?: (error?: unknown) => void }) => void;
    openPrivacyContract?: (options?: { success?: () => void; fail?: (error?: unknown) => void }) => void;
    exitMiniProgram?: (options?: { success?: () => void; fail?: (error?: unknown) => void }) => void;
}

interface AndroidBridge {
    showVideo?: () => void;
    showBanner?: () => void;
    hideBanner?: () => void;
    share?: () => void;
    shareGame?: (title: string) => void;
    exitGame?: () => void;
}

interface RewardWindow extends Window {
    cocosJava?: AndroidBridge;
    onReward?: () => void;
    onAdClosed?: () => void;
    onAdFailed?: (message?: string) => void;
}

declare const wx: MiniGameApi | undefined;
declare const tt: MiniGameApi | undefined;

export const GAME_PLATFORM_CONFIG = {
    wechatRewardedAdUnitId: "",
    douyinRewardedAdUnitId: "",
    shareTitle: "Mahjong Triple Quest",
    shareEnabled: false,
};

class BrowserPlatform implements PlatformAdapter {
    public readonly name = "browser" as const;
    public canShare(): boolean { return false; }
    public share(): boolean { return false; }
    public showRewardVideo(): Promise<boolean> { return Promise.resolve(false); }
    public canOpenPrivacyContract(): boolean { return false; }
    public openPrivacyContract(): boolean { return false; }
    public exitGame(): boolean { return false; }
    public showBanner(): void { }
    public hideBanner(): void { }
}

class AndroidPlatform implements PlatformAdapter {
    public readonly name = "android" as const;
    public canShare(): boolean { const java = this.bridge(); return typeof java?.shareGame === "function" || typeof java?.share === "function"; }
    public share(options?: ShareOptions): boolean {
        const java = this.bridge();
        if (!java?.shareGame && !java?.share) return false;
        try { java.shareGame ? java.shareGame(options?.title ?? GAME_PLATFORM_CONFIG.shareTitle) : java.share!(); return true; }
        catch (error) { console.warn("Android share failed", error); return false; }
    }
    public showRewardVideo(): Promise<boolean> {
        const java = this.bridge();
        if (!java?.showVideo) return Promise.resolve(false);
        return new Promise((resolve) => {
            const scope = window as RewardWindow; let completed = false;
            const previous = [scope.onReward, scope.onAdClosed, scope.onAdFailed] as const;
            const timeout = window.setTimeout(() => finish(false), 120000);
            const finish = (rewarded: boolean): void => {
                if (completed) return; completed = true; window.clearTimeout(timeout);
                [scope.onReward, scope.onAdClosed, scope.onAdFailed] = previous; resolve(rewarded);
            };
            scope.onReward = () => finish(true); scope.onAdClosed = () => finish(false); scope.onAdFailed = () => finish(false);
            try { java.showVideo(); } catch (error) { console.warn("Android rewarded ad failed", error); finish(false); }
        });
    }
    public canOpenPrivacyContract(): boolean { return false; }
    public openPrivacyContract(): boolean { return false; }
    public exitGame(): boolean { try { const exit = this.bridge()?.exitGame; if (!exit) return false; exit(); return true; } catch { return false; } }
    public showBanner(): void { this.call("showBanner"); }
    public hideBanner(): void { this.call("hideBanner"); }
    private bridge(): AndroidBridge | undefined { return (window as RewardWindow).cocosJava; }
    private call(method: "showBanner" | "hideBanner"): void { try { this.bridge()?.[method]?.(); } catch (error) { console.warn(`Android ${method} failed`, error); } }
}

class WeChatPlatform implements PlatformAdapter {
    public readonly name = "wechat" as const;
    public canShare(): boolean { return typeof wx.shareAppMessage === "function"; }
    public share(options?: ShareOptions): boolean { return shareMiniGame(wx, options); }
    public showRewardVideo(): Promise<boolean> {
        if (!GAME_PLATFORM_CONFIG.wechatRewardedAdUnitId) { console.warn("WeChat rewarded ad is using success fallback"); return Promise.resolve(true); }
        return showMiniGameReward(wx, GAME_PLATFORM_CONFIG.wechatRewardedAdUnitId);
    }
    public canOpenPrivacyContract(): boolean { return typeof wx.openPrivacyContract === "function"; }
    public openPrivacyContract(): boolean { return callMiniGameApi(wx.openPrivacyContract, "open privacy contract"); }
    public exitGame(): boolean { return callMiniGameApi(wx.exitMiniProgram, "exit mini game"); }
    public showBanner(): void { }
    public hideBanner(): void { }
}

class DouyinPlatform implements PlatformAdapter {
    public readonly name = "douyin" as const;
    public canShare(): boolean { return typeof tt.shareAppMessage === "function"; }
    public share(options?: ShareOptions): boolean { return shareMiniGame(tt, options); }
    public showRewardVideo(): Promise<boolean> { return showMiniGameReward(tt, GAME_PLATFORM_CONFIG.douyinRewardedAdUnitId); }
    public canOpenPrivacyContract(): boolean { return false; }
    public openPrivacyContract(): boolean { return false; }
    public exitGame(): boolean { return callMiniGameApi(tt.exitMiniProgram, "exit mini game"); }
    public showBanner(): void { }
    public hideBanner(): void { }
}

function shareMiniGame(api: MiniGameApi, options?: ShareOptions): boolean {
    if (!api.shareAppMessage) return false;
    try { api.shareAppMessage({ title: options?.title ?? GAME_PLATFORM_CONFIG.shareTitle, imageUrl: options?.imageUrl, query: options?.query }); return true; }
    catch (error) { console.warn("Mini game share failed", error); return false; }
}

function callMiniGameApi(method: MiniGameApi["openPrivacyContract"] | MiniGameApi["exitMiniProgram"], name: string): boolean {
    if (!method) return false;
    try { method({ fail: (error) => console.warn(`Mini game ${name} failed`, error) }); return true; }
    catch (error) { console.warn(`Mini game ${name} failed`, error); return false; }
}

function showMiniGameReward(api: MiniGameApi, adUnitId: string): Promise<boolean> {
    if (!adUnitId) { console.warn("Rewarded ad unit ID is not configured"); return Promise.resolve(false); }
    if (!api.createRewardedVideoAd) { console.warn("Rewarded ads are not supported by this runtime"); return Promise.resolve(false); }
    return new Promise((resolve) => {
        let ad: RewardedVideoAd;
        try { ad = api.createRewardedVideoAd({ adUnitId }); }
        catch (error) { console.warn("Rewarded ad creation failed", error); resolve(false); return; }
        let completed = false;
        const finish = (rewarded: boolean): void => {
            if (completed) return; completed = true; window.clearTimeout(timeout);
            ad.offClose?.(onClose); ad.offError?.(onError); resolve(rewarded);
        };
        const onClose = (result?: { isEnded?: boolean }): void => finish(result?.isEnded !== false);
        const onError = (error?: unknown): void => { console.warn("Rewarded ad failed", error); finish(false); };
        const timeout = window.setTimeout(() => finish(false), 120000);
        ad.onClose(onClose); ad.onError(onError);
        void ad.show().catch(() => ad.load().then(() => ad.show())).catch(onError);
    });
}

function createPlatform(): PlatformAdapter {
    if (typeof tt !== "undefined") return new DouyinPlatform();
    if (typeof wx !== "undefined") return new WeChatPlatform();
    if (typeof window !== "undefined" && (window as RewardWindow).cocosJava) return new AndroidPlatform();
    return new BrowserPlatform();
}

export class GamePlatform {
    private static readonly adapter = createPlatform();
    public static platformName(): PlatformAdapter["name"] { return this.adapter.name; }
    public static canShare(): boolean { return GAME_PLATFORM_CONFIG.shareEnabled && this.adapter.canShare(); }
    public static share(options?: ShareOptions): boolean { return this.adapter.share(options); }
    public static showRewardVideo(): Promise<boolean> { return this.adapter.showRewardVideo(); }
    public static canOpenPrivacyContract(): boolean { return this.adapter.canOpenPrivacyContract(); }
    public static openPrivacyContract(): boolean { return this.adapter.openPrivacyContract(); }
    public static exitGame(): boolean { return this.adapter.exitGame(); }
    public static showBanner(): void { this.adapter.showBanner(); }
    public static hideBanner(): void { this.adapter.hideBanner(); }
}
