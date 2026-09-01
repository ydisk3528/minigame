const { regClass } = Laya;

/** Keep the full-screen background proportional and center-cropped. */
@regClass()
export class BackgroundAdapter extends Laya.Script {
    private image: Laya.Sprite;
    private sourceWidth = 0;
    private sourceHeight = 0;

    public onAwake(): void {
        this.image = this.owner as Laya.Sprite;
        this.sourceWidth = this.image.width;
        this.sourceHeight = this.image.height;
    }
    public onEnable(): void { Laya.stage.on(Laya.Event.RESIZE, this, this.fit); this.fit(); }
    public onDisable(): void { Laya.stage.off(Laya.Event.RESIZE, this, this.fit); }
    private fit(): void {
        if (!this.sourceWidth || !this.sourceHeight) return;
        const scale = Math.max(Laya.stage.width / this.sourceWidth, Laya.stage.height / this.sourceHeight);
        this.image.pivot(this.sourceWidth / 2, this.sourceHeight / 2);
        this.image.pos(Laya.stage.width / 2, Laya.stage.height / 2);
        this.image.scale(scale, scale);
    }
}
