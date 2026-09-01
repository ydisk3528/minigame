import { MahjongSave } from "./MahjongSave";

export interface ThemeDefinition { id: string; titleZh: string; titleEn: string; cost: number; background: [number, number, number]; tile: [number, number, number]; button?: [number, number, number]; bonusProp?: keyof import("./MahjongSave").SaveData["props"]; unlockAchievement?: string; }
interface ThemeConfig { themes: ThemeDefinition[]; }

export class ThemeSystem {
    private static themes: ThemeDefinition[] = [];
    public static async initialize(): Promise<void> {
        const resource = await Laya.loader.load("resources/config/themes.json", Laya.Loader.JSON) as Laya.TextResource;
        this.themes = (resource.data as ThemeConfig).themes ?? [];
        if (!this.themes.some(theme => theme.id === MahjongSave.selectedTheme())) MahjongSave.selectTheme("classic");
    }
    public static all(): readonly ThemeDefinition[] { return this.themes; }
    public static current(): ThemeDefinition { return this.themes.find(theme => theme.id === MahjongSave.selectedTheme()) ?? this.themes[0]; }
    public static bonusProp(): ThemeDefinition["bonusProp"] { return this.current()?.bonusProp; }
    public static unlock(theme: ThemeDefinition): boolean { return MahjongSave.unlockTheme(theme.id, theme.cost); }
    public static select(theme: ThemeDefinition): void { if (MahjongSave.themeUnlocked(theme.id)) MahjongSave.selectTheme(theme.id); }
    public static applyScene(scene: Laya.Scene): void {
        this.apply(scene.getChildByName("Background") as Laya.Sprite, this.current()?.background);
        const root = scene.getChildByName("ContentRoot") as Laya.Sprite;
        for (const name of ["HeroTile1", "HeroTile2", "HeroTile3"]) this.apply(root?.getChildByName(name) as Laya.Sprite, this.current()?.tile);
        this.applyButtons(root);
    }
    public static applyTile(tile: Laya.Sprite): void { this.apply(tile, this.current()?.tile); }
    public static applyPreview(target: Laya.Sprite, theme: ThemeDefinition, background = false): void { this.apply(target, background ? theme.background : theme.tile); }
    public static applyButtonPreview(target: Laya.Sprite, theme: ThemeDefinition): void { this.apply(target, theme.button); }
    private static applyButtons(root: Laya.Node | null): void {
        if (!root) return;
        if (root.name.endsWith("Button")) this.apply(root as Laya.Sprite, this.current()?.button);
        for (let index = 0; index < root.numChildren; index++) this.applyButtons(root.getChildAt(index));
    }
    private static apply(target: Laya.Sprite | null, rgb?: [number, number, number]): void {
        if (!target) return;
        if (!rgb || rgb.every(value => value === 1)) { target.filters = null; return; }
        target.filters = [new Laya.ColorFilter([rgb[0],0,0,0,0, 0,rgb[1],0,0,0, 0,0,rgb[2],0,0, 0,0,0,1,0])];
    }
}
