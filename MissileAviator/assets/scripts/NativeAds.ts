import { sys } from 'cc';

type VideoResult = boolean | number | void;
type JavaBridge = { showBanner?: () => void; hideBanner?: () => void; showVideo?: () => VideoResult | Promise<VideoResult> };

export class NativeAds {
  private static pending: ((success: boolean) => void) | null = null;

  static showBanner(): void {
    try { (globalThis as { cocosJava?: JavaBridge }).cocosJava?.showBanner?.(); }
    catch (error) { console.warn('showBanner failed', error); }
  }

  static hideBanner(): void {
    try { (globalThis as { cocosJava?: JavaBridge }).cocosJava?.hideBanner?.(); }
    catch (error) { console.warn('hideBanner failed', error); }
  }

  static showVideo(done: (success: boolean) => void): void {
    const bridge = (globalThis as { cocosJava?: JavaBridge }).cocosJava;
    if (!bridge?.showVideo) { done(sys.isBrowser); return; }
    this.pending = done;
    const finish = (result: VideoResult): void => this.finish(result === true || result === 1);
    (globalThis as Record<string, unknown>).onVideoResult = finish;
    (globalThis as Record<string, unknown>).onRewardVideoResult = finish;
    (globalThis as Record<string, unknown>).onReward = () => this.finish(true);
    (globalThis as Record<string, unknown>).onAdClosed = () => this.finish(false);
    (globalThis as Record<string, unknown>).onAdFailed = () => this.finish(false);
    try {
      const result = bridge.showVideo();
      if (result instanceof Promise) result.then(finish).catch(() => this.finish(false));
      else if (typeof result === 'boolean' || typeof result === 'number') finish(result);
    } catch (error) { console.warn('showVideo failed', error); this.finish(false); }
  }

  private static finish(success: boolean): void {
    const callback = this.pending; this.pending = null; callback?.(success);
  }
}
