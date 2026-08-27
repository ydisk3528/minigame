import { GameConfig } from "./GameConfig";
import { GameSave } from "./GameSave";
import { Gem, SpecialType } from "./Gem";
import { ShaderPulse, SpecialEffectShader } from "./SpecialEffectShader";

export interface ClearEffectItem {
    row: number;
    column: number;
    type: number;
    specialType: SpecialType;
    texture: Laya.Texture;
}

export class MatchEffects {
    private specialTip: Laya.Sprite | null = null;
    private static readonly PARTICLE_DIRECTIONS = [
        [-58, -42], [-18, -68], [30, -58], [66, -12],
        [58, 42], [16, 70], [-34, 60], [-68, 14],
    ] as const;
    private static readonly COLORS = [
        [1, 0.2, 0.32], [0.12, 0.66, 1], [0.2, 1, 0.48],
        [1, 0.78, 0.12], [0.68, 0.25, 1], [1, 0.43, 0.12],
    ] as const;

    public static selfCheck(): void {
        if (this.effectTier(3, false, 1) !== "quiet"
            || this.effectTier(4, false, 1) !== "highlight"
            || this.effectTier(3, true, 1) !== "special"
            || GameConfig.effectTextures.hideFrames.length !== 8
            || GameConfig.effectTextures.skillRangeFrames.length !== 11) {
            throw new Error("Match effect tier self-check failed.");
        }
    }

    private static effectTier(count: number, specialAttack: boolean, cascade: number): "quiet" | "highlight" | "special" {
        if (specialAttack) return "special";
        return count === 3 && cascade === 1 ? "quiet" : "highlight";
    }

    public constructor(
        private readonly effectLayer: Laya.Sprite,
        private readonly gemLayer: Laya.Sprite,
        private readonly goalTarget: Laya.GTextField,
        private readonly rows: number,
        private readonly columns: number,
        private readonly goalGemType?: number,
    ) {}

    public async initialize(): Promise<void> {
        await Promise.all([
            ...Object.values(GameConfig.effectPrefabs).map((path) => Laya.loader.load(path, Laya.Loader.HIERARCHY)),
            Laya.loader.load(GameConfig.effectTextures.burst),
            Laya.loader.load(GameConfig.effectTextures.skillLineTrail),
            Laya.loader.load(GameConfig.effectTextures.skillTipArrow),
            Laya.loader.load(GameConfig.effectTextures.skillTipRange),
            ...GameConfig.effectTextures.hideFrames.map((path) => Laya.loader.load(path)),
            ...GameConfig.effectTextures.skillRangeFrames.map((path) => Laya.loader.load(path)),
        ]);
    }

    public showSpecialTip(gem: Gem): void {
        this.clearSpecialTip();
        if (gem.specialType === SpecialType.None || gem.specialType === SpecialType.Rainbow) return;
        const root = new Laya.Sprite();
        root.name = "SpecialRangeTip";
        root.pos(GameConfig.tileSize * 0.5, GameConfig.tileSize * 0.5);
        root.mouseEnabled = false;
        root.alpha = 0.72;
        root.scale(0.82, 0.82);
        root.zOrder = 20;
        gem.view.addChild(root);
        this.specialTip = root;
        if (gem.specialType === SpecialType.Bomb) {
            root.addChild(this.tipImage(GameConfig.effectTextures.skillTipRange, 128, 128, 0, 0));
        } else {
            root.rotation = gem.specialType === SpecialType.RocketVertical ? 90 : 0;
            root.addChild(this.tipImage(GameConfig.effectTextures.skillTipArrow, 49, 59, 48, 0));
            const left = this.tipImage(GameConfig.effectTextures.skillTipArrow, 49, 59, -48, 0);
            left.scaleX = -1;
            root.addChild(left);
        }
        this.pulseSpecialTip(root, true);
    }

    public clearSpecialTip(): void {
        if (!this.specialTip) return;
        Laya.Tween.clearAll(this.specialTip);
        this.specialTip.destroy();
        this.specialTip = null;
    }

    private tipImage(path: string, width: number, height: number, x: number, y: number): Laya.GImage {
        const image = new Laya.GImage();
        image.texture = Laya.loader.getRes(path) as Laya.Texture;
        image.autoSize = false;
        image.size(width, height);
        image.pivot(width * 0.5, height * 0.5);
        image.pos(x, y);
        image.mouseEnabled = false;
        return image;
    }

    private pulseSpecialTip(root: Laya.Sprite, outward: boolean): void {
        if (this.specialTip !== root || root.destroyed) return;
        Laya.Tween.to(root, {
            scaleX: outward ? 1.02 : 0.82,
            scaleY: outward ? 1.02 : 0.82,
            alpha: outward ? 1 : 0.72,
        }, 420, Laya.Ease.sineInOut, Laya.Handler.create(this, () => this.pulseSpecialTip(root, !outward)));
    }

    public async playClear(items: ClearEffectItem[], specialAttack: boolean, cascade: number): Promise<void> {
        const unique = new Map(items.map((item) => [`${item.row}:${item.column}`, item]));
        const values = [...unique.values()];
        const tier = MatchEffects.effectTier(values.length, specialAttack, cascade);
        const quiet = tier === "quiet";
        const burstItems = values.length > 24 ? values.filter((_, index) => index % 2 === 0) : values;
        const burstScale = quiet ? 0.46 : values.length > 24 ? 0.46 : values.length > 16 ? 0.64 : 1;
        const effects = quiet
            ? burstItems.map((item, index) => this.playHide(item, index))
            : burstItems.map((item, index) => this.playBurst(item, index < 2, burstScale));
        const goalItems = this.goalGemType == null ? [] : values.filter((item) => item.type === this.goalGemType).slice(0, quiet ? 1 : 3);
        for (let index = 0; index < goalItems.length; index++) {
            void this.playGoalFly(goalItems[index], index).catch((error) => console.warn("Goal fly effect failed", error));
        }
        if (cascade >= 2) {
            void this.playComboBanner(cascade).catch((error) => console.warn("Combo banner effect failed", error));
        }
        if (tier === "special") {
            effects.push(this.playSpecialOverlay(values), this.shakeBoard());
            GameSave.vibrate(values.length >= 12 ? 45 : 25);
        } else if (tier === "highlight") {
            effects.push(this.shakeBoard(3));
            GameSave.vibrate(15);
        }
        await Promise.all(effects);
    }

    public async playSpecialCreated(item: ClearEffectItem, gem: Laya.GImage): Promise<void> {
        gem.alpha = 0;
        gem.scale(0.16, 0.16);
        gem.rotation = item.specialType === SpecialType.RocketHorizontal ? -18
            : item.specialType === SpecialType.RocketVertical ? 18 : -28;
        await Promise.all([
            this.playBurst(item, true, 1.25),
            this.tween(gem, { alpha: 1, scaleX: 1.24, scaleY: 1.24, rotation: 0 }, 240, Laya.Ease.backOut),
            this.shakeBoard(4),
        ]);
        await this.tween(gem, { scaleX: 1, scaleY: 1 }, 110, Laya.Ease.backOut);
    }

    public attachBoardReceiver(view: Laya.GImage): void {
        const receiver = view.getChildByName("LightReceiver") as Laya.Sprite;
        if (!receiver || !view.texture || !Laya.Mesh2DRender) return;
        const renderer = this.configureReceiver(receiver, view.texture, GameConfig.tileSize, 0.24);
        renderer.lightReceive = true;
        renderer.layer = 1;
    }

    private async playHide(item: ClearEffectItem, index: number): Promise<void> {
        await this.delay(index * 12);
        const view = new Laya.GImage();
        view.autoSize = false;
        view.size(128, 128);
        view.pivot(64, 64);
        view.pos(item.column * GameConfig.cellSize + 54, item.row * GameConfig.cellSize + 54);
        view.alpha = 0.68;
        view.blendMode = "add";
        view.mouseEnabled = false;
        this.effectLayer.addChild(view);
        for (const path of GameConfig.effectTextures.hideFrames) {
            view.texture = Laya.loader.getRes(path) as Laya.Texture;
            await this.delay(28);
        }
        view.destroy();
    }

    private async playBurst(item: ClearEffectItem, useLight: boolean, size: number, quiet = false): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.burst);
        view.pos(item.column * GameConfig.cellSize, item.row * GameConfig.cellSize);
        this.effectLayer.addChild(view);
        const burst = view.getChildByName("Burst") as Laya.GImage;
        const shards = view.getChildByName("Shards") as Laya.GImage;
        const particles = MatchEffects.PARTICLE_DIRECTIONS.map((_, index) => view.getChildByName(`Particle${index}`) as Laya.GImage);
        const animatedParticles = quiet ? particles.slice(0, 3) : particles;
        burst.blendMode = shards.blendMode = "normal";
        burst.scale(0.22 * size, 0.22 * size);
        shards.scale(0.38 * size, 0.38 * size);
        for (const particle of animatedParticles) {
            particle.blendMode = "normal";
            particle.alpha = quiet ? 0.26 : 0.5;
            particle.scale((quiet ? 0.24 : 0.38) * size, (quiet ? 0.24 : 0.38) * size);
        }
        const rig = useLight ? this.attachLight(view, item.type, 172, 150, 2.8) : null;

        await Promise.all([
            this.tween(burst, { scaleX: (quiet ? 0.68 : 0.92) * size, scaleY: (quiet ? 0.68 : 0.92) * size, alpha: quiet ? 0.2 : 0.42, rotation: 10 }, quiet ? 90 : 135),
            this.tween(shards, { scaleX: (quiet ? 0.55 : 0.86) * size, scaleY: (quiet ? 0.55 : 0.86) * size, alpha: quiet ? 0.14 : 0.48, rotation: -14 }, quiet ? 120 : 210),
            rig ? this.tween(rig.light, { intensity: rig.peakIntensity }, 85) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0.18, flash: 0.04 }, 85) : Promise.resolve(),
            ...animatedParticles.map((particle, index) => this.tween(particle, {
                x: 54 + MatchEffects.PARTICLE_DIRECTIONS[index][0] * size,
                y: 54 + MatchEffects.PARTICLE_DIRECTIONS[index][1] * size,
                scaleX: 0.12,
                scaleY: 0.12,
                alpha: 0,
                rotation: index % 2 === 0 ? 120 : -120,
            }, (quiet ? 135 : 245) + index * 7)),
        ]);
        await Promise.all([
            this.tween(burst, { scaleX: (quiet ? 0.82 : 1.35) * size, scaleY: (quiet ? 0.82 : 1.35) * size, alpha: 0 }, quiet ? 80 : 150),
            this.tween(shards, { scaleX: (quiet ? 0.72 : 1.3) * size, scaleY: (quiet ? 0.72 : 1.3) * size, alpha: 0 }, quiet ? 90 : 170),
            rig ? this.tween(rig.light, { intensity: 0 }, 145) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0, flash: 0 }, 145) : Promise.resolve(),
        ]);
        view.destroy();
        rig?.pulse.destroy();
    }

    private attachLight(view: Laya.Sprite, type: number, receiverSize: number, radius: number,
        peakIntensity: number): { light: Laya.SpotLight2D; pulse: ShaderPulse; peakIntensity: number } | null {
        const receiver = view.getChildByName("LightReceiver") as Laya.Sprite;
        const source = view.getChildByName("LightSource") as Laya.Sprite;
        const texture = Laya.loader.getRes(GameConfig.effectTextures.burst) as Laya.Texture;
        if (!receiver || !source || !texture || !Laya.Mesh2DRender || !Laya.SpotLight2D) return null;
        const renderer = this.configureReceiver(receiver, texture, receiverSize, 0.52);
        renderer.lightReceive = true;
        renderer.layer = 1;
        const light = source.addComponent(Laya.SpotLight2D);
        const color = MatchEffects.COLORS[Math.max(0, Math.min(MatchEffects.COLORS.length - 1, type))];
        light.color = new Laya.Color(color[0], color[1], color[2], 1);
        light.intensity = 0;
        light.innerRadius = radius * 0.18;
        light.outerRadius = radius;
        light.innerAngle = 300;
        light.outerAngle = 360;
        light.falloffIntensity = 1.4;
        light.layerMask = 1 << 1;
        light.lightMode = Laya.Light2DMode.Add;
        light.sceneMode = Laya.Light2DMode.Add;
        const material = SpecialEffectShader.createMaterial(light.color);
        renderer.sharedMaterial = material;
        return { light, pulse: new ShaderPulse(material), peakIntensity: peakIntensity * 0.24 };
    }

    private configureReceiver(receiver: Laya.Sprite, texture: Laya.Texture, size: number,
        alpha: number): Laya.Mesh2DRender {
        const renderer = receiver.addComponent(Laya.Mesh2DRender);
        renderer.useUnitQuad = true;
        renderer.size = new Laya.Vector2(size, size);
        const uv = texture.uv;
        const minU = Math.min(uv[0], uv[2], uv[4], uv[6]);
        const maxU = Math.max(uv[0], uv[2], uv[4], uv[6]);
        const minV = Math.min(uv[1], uv[3], uv[5], uv[7]);
        const maxV = Math.max(uv[1], uv[3], uv[5], uv[7]);
        renderer.texture = texture.bitmap;
        renderer.tilingOffset = new Laya.Vector4(minU, minV, maxU - minU, maxV - minV);
        renderer.color = new Laya.Color(1, 1, 1, alpha);
        return renderer;
    }

    private async playSpecialOverlay(items: ClearEffectItem[]): Promise<void> {
        if (items.some((item) => item.specialType === SpecialType.Rainbow)) {
            await this.playRainbowOverlay();
            return;
        }
        if (items.some((item) => item.specialType === SpecialType.Bomb)) {
            await Promise.all([this.playBombOverlay(items), this.playLineOverlay(items)]);
            return;
        }
        await this.playLineOverlay(items);
    }

    private async playLineOverlay(items: ClearEffectItem[]): Promise<void> {
        const rocketRows = [...new Set(items.filter((item) => item.specialType === SpecialType.RocketHorizontal)
            .map((item) => item.row))];
        const rocketColumns = [...new Set(items.filter((item) => item.specialType === SpecialType.RocketVertical)
            .map((item) => item.column))];
        if (rocketRows.length + rocketColumns.length > 0) {
            await Promise.all([
                ...rocketRows.map((row) => this.playBeam(row, false)),
                ...rocketColumns.map((column) => this.playBeam(column, true)),
            ]);
            return;
        }
        const rowCounts = new Map<number, number>();
        const columnCounts = new Map<number, number>();
        for (const item of items) {
            rowCounts.set(item.row, (rowCounts.get(item.row) ?? 0) + 1);
            columnCounts.set(item.column, (columnCounts.get(item.column) ?? 0) + 1);
        }
        const rows = [...rowCounts].filter(([, count]) => count >= this.columns).map(([row]) => row);
        const columns = [...columnCounts].filter(([, count]) => count >= this.rows).map(([column]) => column);
        if (rows.length + columns.length === 0 || rows.length + columns.length > 4) {
            await this.playWave(items);
            return;
        }
        await Promise.all([
            ...rows.map((row) => this.playBeam(row, false)),
            ...columns.map((column) => this.playBeam(column, true)),
        ]);
    }

    private async playBeam(index: number, vertical: boolean): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.beam);
        view.pos(vertical ? index * GameConfig.cellSize + 54 : 432,
            vertical ? 432 : index * GameConfig.cellSize + 54);
        view.rotation = vertical ? 90 : 0;
        this.effectLayer.addChild(view);
        const beam = view.getChildByName("Beam") as Laya.GImage;
        const trail = this.tipImage(GameConfig.effectTextures.skillLineTrail, 244, 44, 432, 54);
        trail.alpha = 0;
        trail.scale(0.35, 0.7);
        trail.blendMode = "add";
        view.addChild(trail);
        const rig = this.attachLight(view, 1, 540, 420, 6.2);
        beam.blendMode = "normal";
        beam.scale(0.05, 0.58);
        await Promise.all([
            this.tween(beam, { scaleX: 1, scaleY: 0.52, alpha: 0.52 }, 130),
            this.tween(trail, { scaleX: 3.25, scaleY: 0.82, alpha: 0.62 }, 130),
            rig ? this.tween(rig.light, { intensity: rig.peakIntensity }, 95) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0.22, flash: 0.06 }, 95) : Promise.resolve(),
        ]);
        await Promise.all([
            this.tween(beam, { scaleX: 1.08, scaleY: 0.38, alpha: 0 }, 170),
            this.tween(trail, { scaleX: 3.55, scaleY: 0.58, alpha: 0 }, 170),
            rig ? this.tween(rig.light, { intensity: 0 }, 170) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0, flash: 0 }, 170) : Promise.resolve(),
        ]);
        view.destroy();
        rig?.pulse.destroy();
    }

    private async playWave(items: ClearEffectItem[]): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.wave);
        const row = items.reduce((sum, item) => sum + item.row, 0) / items.length;
        const column = items.reduce((sum, item) => sum + item.column, 0) / items.length;
        view.pos(column * GameConfig.cellSize, row * GameConfig.cellSize);
        this.effectLayer.addChild(view);
        const wave = view.getChildByName("Wave") as Laya.GImage;
        const rig = this.attachLight(view, items[0]?.type ?? 4, 420, 330, 4.8);
        wave.blendMode = "normal";
        wave.scale(0.12, 0.12);
        await Promise.all([
            this.tween(wave, { scaleX: 1.2, scaleY: 1.2, alpha: 0.38, rotation: 12 }, 190),
            rig ? this.tween(rig.light, { intensity: rig.peakIntensity }, 130) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0.18, flash: 0.04 }, 130) : Promise.resolve(),
        ]);
        await Promise.all([
            this.tween(wave, { scaleX: 1.7, scaleY: 1.7, alpha: 0 }, 150),
            rig ? this.tween(rig.light, { intensity: 0 }, 150) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0, flash: 0 }, 150) : Promise.resolve(),
        ]);
        view.destroy();
        rig?.pulse.destroy();
    }

    private async playBombOverlay(items: ClearEffectItem[]): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.bomb);
        const center = items.find((item) => item.specialType === SpecialType.Bomb) ?? items[0];
        view.pos(center.column * GameConfig.cellSize + 54, center.row * GameConfig.cellSize + 54);
        this.effectLayer.addChild(view);
        const ring = view.getChildByName("Ring") as Laya.GImage;
        const core = view.getChildByName("Core") as Laya.GImage;
        const debris = view.getChildByName("Debris") as Laya.GImage;
        const rig = this.attachLight(view, center.type, 560, 390, 7.5);
        ring.blendMode = core.blendMode = debris.blendMode = "normal";
        ring.scale(0.12, 0.12); core.scale(0.18, 0.18); debris.scale(0.2, 0.2);
        const rangeFrames = this.playRangeFrames(center);
        await Promise.all([
            this.tween(ring, { scaleX: 0.95, scaleY: 0.95, alpha: 0.46, rotation: 18 }, 170),
            this.tween(core, { scaleX: 0.9, scaleY: 0.9, alpha: 0.42, rotation: -12 }, 135),
            this.tween(debris, { scaleX: 0.95, scaleY: 0.95, alpha: 0.48, rotation: 24 }, 190),
            rig ? this.tween(rig.light, { intensity: rig.peakIntensity }, 115) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0.28, flash: 0.08 }, 115) : Promise.resolve(),
        ]);
        await Promise.all([
            this.tween(ring, { scaleX: 1.8, scaleY: 1.8, alpha: 0 }, 180),
            this.tween(core, { scaleX: 1.65, scaleY: 1.65, alpha: 0 }, 145),
            this.tween(debris, { scaleX: 1.55, scaleY: 1.55, alpha: 0 }, 175),
            rig ? this.tween(rig.light, { intensity: 0 }, 175) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0, flash: 0 }, 175) : Promise.resolve(),
        ]);
        view.destroy();
        rig?.pulse.destroy();
        await rangeFrames;
    }

    private async playRangeFrames(center: ClearEffectItem): Promise<void> {
        const view = new Laya.GImage();
        view.autoSize = false;
        view.size(360, 360);
        view.pivot(180, 180);
        view.pos(center.column * GameConfig.cellSize + 54, center.row * GameConfig.cellSize + 54);
        view.alpha = 0.42;
        view.mouseEnabled = false;
        this.effectLayer.addChild(view);
        for (const path of GameConfig.effectTextures.skillRangeFrames) {
            view.texture = Laya.loader.getRes(path) as Laya.Texture;
            await this.delay(50);
        }
        view.destroy();
    }

    private async playRainbowOverlay(): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.rainbow);
        view.pos(432, 432);
        this.effectLayer.addChild(view);
        const aura = view.getChildByName("Aura") as Laya.GImage;
        const shards = view.getChildByName("Shards") as Laya.GImage;
        const crystal = view.getChildByName("Crystal") as Laya.GImage;
        const rig = this.attachLight(view, 4, 780, 520, 8.5);
        aura.blendMode = shards.blendMode = crystal.blendMode = "normal";
        aura.scale(0.16, 0.16); shards.scale(0.18, 0.18); crystal.scale(0.35, 0.35);
        await Promise.all([
            this.tween(aura, { scaleX: 1.05, scaleY: 1.05, alpha: 0.34, rotation: 45 }, 240),
            this.tween(shards, { scaleX: 0.9, scaleY: 0.9, alpha: 0.46, rotation: -35 }, 220),
            this.tween(crystal, { scaleX: 1.05, scaleY: 1.05, alpha: 0.72, rotation: 9 }, 180),
            rig ? this.tween(rig.light, { intensity: rig.peakIntensity }, 160) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0.3, flash: 0.1 }, 160) : Promise.resolve(),
        ]);
        await Promise.all([
            this.tween(aura, { scaleX: 1.55, scaleY: 1.55, alpha: 0, rotation: 145 }, 220),
            this.tween(shards, { scaleX: 1.4, scaleY: 1.4, alpha: 0, rotation: -120 }, 210),
            this.tween(crystal, { scaleX: 0.35, scaleY: 0.35, alpha: 0, rotation: 45 }, 180),
            rig ? this.tween(rig.light, { intensity: 0 }, 210) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0, flash: 0 }, 210) : Promise.resolve(),
        ]);
        view.destroy();
        rig?.pulse.destroy();
    }

    private async playComboBanner(cascade: number): Promise<void> {
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.comboBanner);
        const text = view.getChildByName("ComboText") as Laya.GTextField;
        text.text = cascade === 2 ? "GOOD!" : cascade === 3 ? "GREAT!" : cascade === 4 ? "AMAZING!" : "UNBELIEVABLE!";
        if (cascade >= 5) text.fontSize = 44;
        const rig = cascade >= 3 ? this.attachLight(view, Math.min(5, cascade), 680, 460, 0.7) : null;
        view.pos(432, 300);
        view.scale(0.55, 0.55);
        view.alpha = 0;
        this.effectLayer.addChild(view);
        await Promise.all([
            this.tween(view, { scaleX: 1, scaleY: 1, alpha: 1, y: 270 }, 190, Laya.Ease.backOut),
            rig ? this.tween(rig.light, { intensity: rig.peakIntensity }, 150) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0.14, flash: 0.03 }, 150) : Promise.resolve(),
        ]);
        await this.delay(120);
        await Promise.all([
            this.tween(view, { scaleX: 1.08, scaleY: 1.08, alpha: 0, y: 215 }, 210),
            rig ? this.tween(rig.light, { intensity: 0 }, 210) : Promise.resolve(),
            rig ? this.tween(rig.pulse, { glow: 0, flash: 0 }, 210) : Promise.resolve(),
        ]);
        view.destroy();
        rig?.pulse.destroy();
    }

    private async playGoalFly(item: ClearEffectItem, index: number): Promise<void> {
        await this.delay(index * 35);
        const view = await Laya.Prefab.instantiate<Laya.Sprite>(GameConfig.effectPrefabs.goalFly);
        const glow = view.getChildByName("Glow") as Laya.GImage;
        const icon = view.getChildByName("GemIcon") as Laya.GImage;
        icon.texture = item.texture;
        glow.blendMode = "normal";
        glow.alpha = 0.32;
        view.pos(item.column * GameConfig.cellSize + 54, item.row * GameConfig.cellSize + 54);
        view.scale(0.55, 0.55);
        this.effectLayer.addChild(view);
        await this.tween(view, { scaleX: 1.05, scaleY: 1.05, y: view.y - 30 }, 85, Laya.Ease.backOut);
        const globalTarget = this.goalTarget.localToGlobal(new Laya.Point(this.goalTarget.width * 0.5, this.goalTarget.height * 0.5));
        const target = this.effectLayer.globalToLocal(globalTarget);
        await this.tween(view, { x: target.x, y: target.y, scaleX: 0.32, scaleY: 0.32, alpha: 0.75, rotation: 210 }, 330, Laya.Ease.cubicIn);
        await this.tween(view, { scaleX: 0.05, scaleY: 0.05, alpha: 0 }, 70);
        view.destroy();
    }

    private async shakeBoard(intensity = 7): Promise<void> {
        const originX = this.gemLayer.x;
        const originY = this.gemLayer.y;
        await this.tween(this.gemLayer, { x: originX + intensity, y: originY - intensity * 0.6 }, 35);
        await this.tween(this.gemLayer, { x: originX - intensity * 0.7, y: originY + intensity * 0.45 }, 45);
        await this.tween(this.gemLayer, { x: originX, y: originY }, 45);
    }

    private delay(duration: number): Promise<void> {
        return new Promise((resolve) => Laya.timer.once(duration, this, resolve));
    }

    private tween(target: object, properties: object, duration: number, ease = Laya.Ease.quadOut): Promise<void> {
        return new Promise((resolve) => {
            Laya.Tween.to(target, properties, duration, ease, Laya.Handler.create(null, resolve));
        });
    }
}
