type ThemeDefinition = {
    folder: string;
    backgroundFolder: string;
    labels: readonly string[];
};

const FILES = [
    "gem_red.png", "gem_blue.png", "gem_green.png",
    "gem_yellow.png", "gem_purple.png", "gem_orange.png",
] as const;

const THEMES: Record<string, ThemeDefinition> = {
    default: {
        folder: "textures/gems/default",
        backgroundFolder: "textures/backgrounds/default",
        labels: ["RED GEMS", "BLUE GEMS", "GREEN GEMS", "YELLOW GEMS", "PURPLE GEMS", "ORANGE GEMS"],
    },
    mahjong: {
        folder: "textures/gems/mahjong",
        backgroundFolder: "textures/backgrounds/default",
        labels: ["RED DRAGON", "BLUE DOT", "GREEN DRAGON", "GOLD WAN", "PURPLE FLOWER", "ORANGE BAMBOO"],
    },
};

export class ThemeConfig {
    private static currentTheme = "default";

    public static setTheme(theme: string): void {
        const normalized = theme.trim().toLowerCase();
        if (!THEMES[normalized]) {
            console.warn(`[ThemeConfig] Unknown theme '${theme}', using default.`);
            this.currentTheme = "default";
            return;
        }
        this.currentTheme = normalized;
        console.info(`[ThemeConfig] Active theme: ${normalized}`);
    }

    public static get theme(): string {
        return this.currentTheme;
    }

    public static get texturePaths(): readonly string[] {
        const folder = THEMES[this.currentTheme].folder;
        return FILES.map((file) => `${folder}/${file}`);
    }

    public static texture(type: number): string {
        const path = this.texturePaths[type];
        if (!path) throw new Error(`[ThemeConfig] Invalid gem type: ${type}`);
        return path;
    }

    public static label(type: number): string {
        return THEMES[this.currentTheme].labels[type] ?? "GEMS";
    }

    public static async applyScene(scene: Laya.Scene): Promise<void> {
        const folder = THEMES[this.currentTheme].backgroundFolder;
        const backgroundPath = `${folder}/game_background.png`;
        const foregroundPath = `${folder}/warrior.png`;
        await Laya.loader.loadPackage(folder);
        const [backgroundTexture, foregroundTexture] = await Promise.all([
            Laya.loader.load(backgroundPath),
            Laya.loader.load(foregroundPath),
        ]);
        const background = scene.getChildByName("Background") as Laya.GImage;
        if (background) background.texture = backgroundTexture;
        const foreground = scene.getChildByName("ThemeForeground") as Laya.Sprite;
        if (foreground) foreground.texture = foregroundTexture;
    }

    public static async preload(): Promise<void> {
        await Laya.loader.loadPackage(THEMES[this.currentTheme].folder);
        await Promise.all(this.texturePaths.map((path) => Laya.loader.load(path)));
    }
}
