import {
    _decorator,
    Color,
    Component,
    instantiate,
    isValid,
    Label,
    Layers,
    Node,
    ParticleAsset,
    ParticleSystem2D,
    Prefab,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import type { LineClearResult } from '../core/BoardManager';
import { AudioManager } from '../core/AudioManager';

const { ccclass } = _decorator;

const UI_LAYER = Layers.Enum.UI_2D;
const MATCH_CELL_INTERVAL = 0.13;
const VICTORY_CELL_INTERVAL = 0.085;
interface EffectPrefabs {
    destroy: Prefab | null;
    combo: Prefab | null;
    score: Prefab | null;
}

export interface EffectAssetReferences {
    readonly destroyPrefab: Prefab | null;
    readonly comboPrefab: Prefab | null;
    readonly scorePrefab: Prefab | null;
    readonly particleSpriteFrame: SpriteFrame | null;
    readonly particleColorAssets: readonly (ParticleAsset | null)[];
    readonly textFrames: {
        readonly great: SpriteFrame | null;
        readonly amazing: SpriteFrame | null;
        readonly gemBlast: SpriteFrame | null;
        readonly combo: SpriteFrame | null;
        readonly boardCleared: SpriteFrame | null;
    };
    readonly blackHoleFrames: readonly SpriteFrame[];
}

const PARTICLE_REFERENCE_COLORS: readonly Color[] = Object.freeze([
    new Color(65, 181, 255, 255),
    new Color(65, 227, 150, 255),
    new Color(255, 217, 65, 255),
    new Color(255, 129, 63, 255),
    new Color(180, 97, 255, 255),
    new Color(255, 97, 180, 255),
]);

@ccclass('EffectManager')
export class EffectManager extends Component {
    private effectLayer: Node | null = null;
    private shakeTarget: Node | null = null;
    private shakeOrigin = new Vec3();
    private particleSpriteFrame: SpriteFrame | null = null;
    private particleColorAssets: readonly (ParticleAsset | null)[] = [];
    private blackHoleFrames: readonly SpriteFrame[] = [];
    private textFrames: EffectAssetReferences['textFrames'] = {
        great: null,
        amazing: null,
        gemBlast: null,
        combo: null,
        boardCleared: null,
    };
    private readonly prefabs: EffectPrefabs = {
        destroy: null,
        combo: null,
        score: null,
    };

    public initialize(
        effectLayer: Node,
        shakeTarget: Node,
        assets: EffectAssetReferences,
    ): void {
        this.effectLayer = effectLayer;
        this.shakeTarget = shakeTarget;
        this.shakeOrigin.set(shakeTarget.position);
        this.prefabs.destroy = assets.destroyPrefab;
        this.prefabs.combo = assets.comboPrefab;
        this.prefabs.score = assets.scorePrefab;
        this.particleSpriteFrame = assets.particleSpriteFrame;
        this.particleColorAssets = assets.particleColorAssets;
        this.textFrames = assets.textFrames;
        this.blackHoleFrames = assets.blackHoleFrames;
    }

    public playLineClear(
        clearResult: LineClearResult,
        gainedScore: number,
        combo: number,
    ): void {
        if (clearResult.clearedCells.length === 0) {
            return;
        }
        AudioManager.instance?.playClear();

        clearResult.clearedVisualNodes.forEach((visualNode, index) => {
            this.playDestroyEffect(visualNode, index * 0.012);
        });
        this.playComboText(combo);
        this.playScoreText(gainedScore);
        this.playScreenShake();
    }

    public playBoosterClear(
        clearResult: LineClearResult,
        boosterLabel: string,
    ): void {
        if (clearResult.clearedCells.length === 0) {
            return;
        }
        AudioManager.instance?.playClear();
        clearResult.clearedVisualNodes.forEach((visualNode, index) => {
            this.playDestroyEffect(visualNode, index * 0.016);
        });
        this.createFloatingLabel(
            this.prefabs.combo,
            'BoosterText',
            boosterLabel,
            68,
            new Vec3(0, 220),
            new Color(255, 232, 83, 255),
            1.15,
        );
        this.playScreenShake();
    }

    public playMatchClear(
        clearResult: LineClearResult,
        gainedScore: number,
        cascade: number,
    ): number {
        if (clearResult.clearedCells.length === 0) {
            return 0;
        }
        AudioManager.instance?.playClear();
        clearResult.clearedVisualNodes.forEach((visualNode, index) => {
            this.playDestroyEffect(visualNode, index * MATCH_CELL_INTERVAL);
        });
        for (let index = 1; index < clearResult.clearedVisualNodes.length; index += 1) {
            this.scheduleOnce(() => AudioManager.instance?.playClear(), index * MATCH_CELL_INTERVAL);
        }
        const comboAmazing = cascade >= 3;
        if (cascade > 1) {
            this.playComboImage(cascade);
        }
        if (clearResult.clearedCells.length >= 5) {
            const isBlast = clearResult.clearedCells.length >= 8;
            // A cascade can already display AMAZING. Avoid spawning the same
            // image and playing its sound twice for one clear.
            if (isBlast || !comboAmazing) {
                this.createFloatingImage(
                    isBlast ? this.textFrames.gemBlast : this.textFrames.amazing,
                    isBlast ? 'GEM BLAST!' : 'AMAZING!',
                    new Vec3(0, 155),
                    Math.min(1.5, 1.05 + clearResult.clearedCells.length * 0.035),
                );
                if (!isBlast) {
                    this.playAmazingSoundAfterImage();
                }
            }
        }
        this.playScoreText(gainedScore);
        this.playScreenShake();
        return Math.max(
            0.38,
            (clearResult.clearedVisualNodes.length - 1) * MATCH_CELL_INTERVAL + 0.38,
        );
    }

    public playVictoryBoardClear(clearResult: LineClearResult): number {
        if (clearResult.clearedCells.length === 0) {
            return 0;
        }
        AudioManager.instance?.playClear();
        clearResult.clearedVisualNodes.forEach((visualNode, index) => {
            this.playDestroyEffect(visualNode, index * VICTORY_CELL_INTERVAL);
        });
        for (let index = 3; index < clearResult.clearedVisualNodes.length; index += 3) {
            this.scheduleOnce(() => AudioManager.instance?.playClear(), index * VICTORY_CELL_INTERVAL);
        }
        const lastDelay = Math.max(
            0,
            (clearResult.clearedVisualNodes.length - 1) * VICTORY_CELL_INTERVAL,
        );
        this.scheduleOnce(() => {
            this.createFloatingImage(
                this.textFrames.boardCleared,
                'BOARD CLEARED!',
                new Vec3(0, 235),
                1.22,
            );
        }, lastDelay);
        this.playScreenShake();
        return lastDelay + 0.4;
    }

    public playBlackHoleAbsorb(
        clearResult: LineClearResult,
        centerWorldPosition: Readonly<Vec3>,
        gainedScore: number,
    ): number {
        const duration = 3;
        this.startBlackHoleAbsorption(centerWorldPosition, duration);
        this.playBlackHoleWave(clearResult, centerWorldPosition, gainedScore, duration);
        return duration;
    }

    public startBlackHoleAbsorption(
        centerWorldPosition: Readonly<Vec3>,
        duration = 3,
    ): number {
        AudioManager.instance?.startBlackHoleLoop();
        this.createBlackHoleSequence(centerWorldPosition, duration);
        this.createFloatingImage(
            this.textFrames.gemBlast,
            'BLACK HOLE!',
            new Vec3(0, 190),
            1.3,
        );
        this.scheduleOnce(() => {
            this.createFlash(centerWorldPosition, new Color(255, 236, 120, 255));
            this.createParticleBurst(centerWorldPosition, new Color(181, 102, 255, 255));
            this.playScreenShake();
            AudioManager.instance?.playClear();
            AudioManager.instance?.stopBlackHoleLoop();
        }, duration);
        return duration;
    }

    public playBlackHoleWave(
        clearResult: LineClearResult,
        centerWorldPosition: Readonly<Vec3>,
        gainedScore: number,
        duration = 0.72,
    ): void {
        if (gainedScore > 0) {
            this.playScoreText(gainedScore);
        }
        clearResult.clearedVisualNodes.forEach((visualNode, index) => {
            this.animateGemIntoBlackHole(visualNode, centerWorldPosition, index, duration);
        });
    }

    /** Stop callbacks which belong to the current scene before loadScene().
     * Node lifetime remains entirely owned by Cocos scene switching.
     */
    public prepareForSceneSwitch(): void {
        this.unscheduleAllCallbacks();
        AudioManager.instance?.stopBlackHoleLoop();
        const effectLayer = this.effectLayer;
        if (effectLayer !== null && isValid(effectLayer, true)) {
            const nodes: Node[] = [effectLayer];
            for (let index = 0; index < nodes.length; index += 1) {
                const node = nodes[index];
                Tween.stopAllByTarget(node);
                const opacity = node.getComponent(UIOpacity);
                if (opacity !== null) {
                    Tween.stopAllByTarget(opacity);
                }
                nodes.push(...node.children);
            }
        }
        if (this.shakeTarget !== null && isValid(this.shakeTarget, true)) {
            Tween.stopAllByTarget(this.shakeTarget);
        }
    }

    private playDestroyEffect(visualNode: Node, delay: number): void {
        if (!visualNode.isValid) {
            return;
        }

        const worldPosition = visualNode.worldPosition.clone();
        const color = visualNode.getComponent(Sprite)?.color.clone() ?? Color.WHITE.clone();
        const opacity = visualNode.getComponent(UIOpacity) ?? visualNode.addComponent(UIOpacity);
        opacity.opacity = 255;

        tween(visualNode)
            .delay(delay)
            .to(0.09, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineOut' })
            .to(0.2, {
                scale: Vec3.ZERO,
                angle: visualNode.angle + (Math.random() > 0.5 ? 18 : -18),
            }, { easing: 'quadIn' })
            .call(() => this.destroyVisualNode(visualNode))
            .start();
        tween(opacity)
            .delay(delay + 0.08)
            .to(0.21, { opacity: 0 })
            .start();

        this.scheduleOnce(() => {
            this.createFlash(worldPosition, color);
            this.createParticleBurst(worldPosition, color);
        }, delay);
    }

    private createBlackHoleSequence(
        centerWorldPosition: Readonly<Vec3>,
        duration: number,
    ): void {
        if (this.effectLayer === null || this.blackHoleFrames.length === 0) {
            return;
        }
        const root = new Node('BlackHoleEffect');
        root.layer = UI_LAYER;
        root.setParent(this.effectLayer);
        root.setPosition(this.worldToEffectPosition(centerWorldPosition));
        root.addComponent(UITransform).setContentSize(285, 285);
        const sprite = root.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = this.blackHoleFrames[0];
        const opacity = root.addComponent(UIOpacity);
        opacity.opacity = 0;
        root.setScale(0.2, 0.2, 1);

        let frameIndex = 0;
        const updateFrame = (): void => {
            if (!root.isValid) {
                this.unschedule(updateFrame);
                return;
            }
            frameIndex = (frameIndex + 1) % this.blackHoleFrames.length;
            sprite.spriteFrame = this.blackHoleFrames[frameIndex];
        };
        this.schedule(updateFrame, 0.075);
        tween(root)
            .to(0.3, { scale: new Vec3(0.62, 0.62, 1), angle: 55 }, { easing: 'backOut' })
            .to(duration - 0.62, { scale: new Vec3(1.82, 1.82, 1), angle: 800 }, { easing: 'sineIn' })
            .to(0.32, { scale: Vec3.ZERO, angle: 900 }, { easing: 'backIn' })
            .call(() => {
                this.unschedule(updateFrame);
                if (isValid(root, true)) {
                    root.destroy();
                }
            })
            .start();
        tween(opacity)
            .to(0.14, { opacity: 255 })
            .delay(duration - 0.38)
            .to(0.24, { opacity: 0 })
            .start();
    }

    private animateGemIntoBlackHole(
        visualNode: Node,
        centerWorldPosition: Readonly<Vec3>,
        index: number,
        duration: number,
    ): void {
        if (!visualNode.isValid) {
            return;
        }
        const parentTransform = visualNode.parent?.getComponent(UITransform);
        if (parentTransform === null || parentTransform === undefined) {
            this.destroyVisualNode(visualNode);
            return;
        }
        const center = parentTransform.convertToNodeSpaceAR(centerWorldPosition);
        center.z = 0;
        const source = visualNode.position.clone();
        const dx = source.x - center.x;
        const dy = source.y - center.y;
        const delay = Math.min(0.34, index * 0.025);
        const travelDuration = duration - delay - 0.08;
        const direction = index % 2 === 0 ? 1 : -1;
        const rotatePoint = (angle: number, radiusScale: number): Vec3 => {
            const radians = angle * direction * Math.PI / 180;
            return new Vec3(
                center.x + (dx * Math.cos(radians) - dy * Math.sin(radians)) * radiusScale,
                center.y + (dx * Math.sin(radians) + dy * Math.cos(radians)) * radiusScale,
                0,
            );
        };
        const opacity = visualNode.getComponent(UIOpacity) ?? visualNode.addComponent(UIOpacity);
        opacity.opacity = 255;
        Tween.stopAllByTarget(visualNode);
        tween(visualNode)
            .delay(delay)
            .to(travelDuration * 0.22, {
                position: rotatePoint(72, 0.92),
                angle: visualNode.angle + 150 * direction,
                scale: new Vec3(0.94, 0.94, 1),
            }, { easing: 'sineIn' })
            .to(travelDuration * 0.22, {
                position: rotatePoint(155, 0.72),
                angle: visualNode.angle + 320 * direction,
                scale: new Vec3(0.78, 0.78, 1),
            }, { easing: 'sineInOut' })
            .to(travelDuration * 0.2, {
                position: rotatePoint(255, 0.48),
                angle: visualNode.angle + 500 * direction,
                scale: new Vec3(0.58, 0.58, 1),
            }, { easing: 'sineInOut' })
            .to(travelDuration * 0.18, {
                position: rotatePoint(380, 0.22),
                angle: visualNode.angle + 700 * direction,
                scale: new Vec3(0.3, 0.3, 1),
            }, { easing: 'sineInOut' })
            .to(travelDuration * 0.18, {
                position: center,
                angle: visualNode.angle + 920 * direction,
                scale: Vec3.ZERO,
            }, { easing: 'quadIn' })
            .call(() => this.destroyVisualNode(visualNode))
            .start();
        tween(opacity)
            .delay(delay + travelDuration * 0.72)
            .to(travelDuration * 0.28, { opacity: 0 })
            .start();
    }

    private createFlash(worldPosition: Readonly<Vec3>, color: Readonly<Color>): void {
        if (this.effectLayer === null || this.particleSpriteFrame === null) {
            return;
        }
        const flash = new Node('ClearFlash');
        flash.layer = UI_LAYER;
        flash.setParent(this.effectLayer);
        flash.setPosition(this.worldToEffectPosition(worldPosition));
        flash.addComponent(UITransform).setContentSize(92, 92);
        const sprite = flash.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = this.particleSpriteFrame;
        sprite.color = new Color(
            Math.min(255, color.r + 80),
            Math.min(255, color.g + 80),
            Math.min(255, color.b + 80),
            255,
        );
        const opacity = flash.addComponent(UIOpacity);
        opacity.opacity = 230;
        flash.setScale(0.75, 0.75, 1);

        tween(flash)
            .to(0.2, { scale: new Vec3(1.65, 1.65, 1), angle: 30 }, { easing: 'quadOut' })
            .call(() => {
                if (isValid(flash, true)) {
                    flash.destroy();
                }
            })
            .start();
        tween(opacity).to(0.2, { opacity: 0 }).start();
    }

    private createParticleBurst(worldPosition: Readonly<Vec3>, color: Readonly<Color>): void {
        const particleAsset = this.getParticleAsset(color);
        if (this.effectLayer === null
            || (particleAsset === null && this.particleSpriteFrame === null)) {
            return;
        }
        const particleNode = this.createPrefabNode(this.prefabs.destroy, 'DestroyEffect');
        particleNode.setParent(this.effectLayer);
        particleNode.setPosition(this.worldToEffectPosition(worldPosition));
        const transform = particleNode.getComponent(UITransform) ?? particleNode.addComponent(UITransform);
        transform.setContentSize(96, 96);

        const particles = particleNode.getComponent(ParticleSystem2D) ?? particleNode.addComponent(ParticleSystem2D);
        particles.playOnLoad = false;
        particles.autoRemoveOnFinish = true;
        if (particleAsset !== null) {
            particles.file = particleAsset;
            particles.resetSystem();
            return;
        }
        particles.custom = true;
        particles.spriteFrame = this.particleSpriteFrame;
        particles.totalParticles = 18;
        particles.duration = 0.08;
        particles.emissionRate = 225;
        particles.life = 0.42;
        particles.lifeVar = 0.12;
        particles.angle = 90;
        particles.angleVar = 360;
        particles.speed = 230;
        particles.speedVar = 90;
        particles.gravity = new Vec2(0, -360);
        particles.startSize = 30;
        particles.startSizeVar = 10;
        particles.endSize = 3;
        particles.startSpinVar = 180;
        particles.endSpin = 360;
        particles.endSpinVar = 180;
        particles.startColor = color;
        particles.startColorVar = new Color(28, 28, 28, 0);
        particles.endColor = new Color(
            color.r,
            color.g,
            color.b,
            0,
        );
        particles.resetSystem();
    }

    private getParticleAsset(color: Readonly<Color>): ParticleAsset | null {
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < PARTICLE_REFERENCE_COLORS.length; index += 1) {
            const reference = PARTICLE_REFERENCE_COLORS[index];
            const red = color.r - reference.r;
            const green = color.g - reference.g;
            const blue = color.b - reference.b;
            const distance = red * red + green * green + blue * blue;
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        }
        return this.particleColorAssets[nearestIndex] ?? null;
    }

    private playComboText(combo: number): void {
        if (combo <= 1) {
            this.createFloatingImage(
                this.textFrames.great,
                'GREAT!',
                new Vec3(0, 250),
                1.16,
            );
            if (this.textFrames.great !== null) {
                this.scheduleOnce(() => AudioManager.instance?.playGreat(), 0.09);
            }
            return;
        }
        this.playComboImage(combo);
    }

    private playComboImage(combo: number): void {
        const isAmazing = combo >= 3;
        this.createFloatingImage(
            isAmazing ? this.textFrames.amazing : this.textFrames.combo,
            isAmazing ? 'AMAZING!' : 'COMBO',
            new Vec3(0, 250),
            Math.min(1.55, 1.12 + combo * 0.1),
            `x${combo}`,
        );
        if (isAmazing) {
            this.playAmazingSoundAfterImage();
        }
    }

    private playAmazingSoundAfterImage(): void {
        if (this.textFrames.amazing === null) {
            return;
        }
        // Opacity reaches a clearly visible value during the first 0.14 s.
        this.scheduleOnce(() => AudioManager.instance?.playAmazing(), 0.09);
    }

    private playScoreText(score: number): void {
        this.createFloatingLabel(
            this.prefabs.score,
            'ScoreText',
            `+${score.toLocaleString('en-US')}`,
            54,
            new Vec3(0, 145),
            new Color(104, 246, 255, 255),
            1,
        );
    }

    private createFloatingLabel(
        prefab: Prefab | null,
        fallbackName: string,
        text: string,
        fontSize: number,
        position: Readonly<Vec3>,
        color: Readonly<Color>,
        peakScale: number,
    ): void {
        if (this.effectLayer === null) {
            return;
        }
        const labelNode = this.createPrefabNode(prefab, fallbackName);
        labelNode.setParent(this.effectLayer);
        labelNode.setPosition(position);
        const transform = labelNode.getComponent(UITransform) ?? labelNode.addComponent(UITransform);
        transform.setContentSize(600, 110);
        const label = labelNode.getComponent(Label) ?? labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.15);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = color;
        label.enableOutline = true;
        label.outlineColor = new Color(18, 38, 102, 230);
        label.outlineWidth = 4;
        const opacity = labelNode.getComponent(UIOpacity) ?? labelNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        labelNode.setScale(0.55, 0.55, 1);

        tween(labelNode)
            .to(0.14, { scale: new Vec3(peakScale, peakScale, 1) }, { easing: 'backOut' })
            .delay(0.22)
            .to(0.32, {
                position: new Vec3(position.x, position.y + 95),
                scale: new Vec3(0.92, 0.92, 1),
            }, { easing: 'sineOut' })
            .call(() => {
                if (isValid(labelNode, true)) {
                    labelNode.destroy();
                }
            })
            .start();
        tween(opacity)
            .to(0.08, { opacity: 255 })
            .delay(0.34)
            .to(0.26, { opacity: 0 })
            .start();
    }

    private createFloatingImage(
        frame: SpriteFrame | null,
        fallbackText: string,
        position: Readonly<Vec3>,
        peakScale: number,
        suffix?: string,
    ): void {
        if (frame === null || this.effectLayer === null) {
            this.createFloatingLabel(
                this.prefabs.combo,
                'EffectText',
                suffix === undefined ? fallbackText : `${fallbackText} ${suffix}`,
                70,
                position,
                new Color(255, 232, 83, 255),
                peakScale,
            );
            return;
        }
        const root = new Node('EffectTextImage');
        root.layer = UI_LAYER;
        root.setParent(this.effectLayer);
        root.setPosition(position);
        const frameWidth = Math.max(1, frame.rect.width);
        const frameHeight = Math.max(1, frame.rect.height);
        const fitScale = Math.min(700 / frameWidth, 285 / frameHeight);
        const displayWidth = frameWidth * fitScale;
        const displayHeight = frameHeight * fitScale;
        root.addComponent(UITransform).setContentSize(displayWidth, displayHeight);
        const sprite = root.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        const opacity = root.addComponent(UIOpacity);
        opacity.opacity = 0;
        root.setScale(0.45, 0.45, 1);

        if (suffix !== undefined) {
            const suffixNode = new Node('ComboMultiplier');
            suffixNode.layer = UI_LAYER;
            suffixNode.setParent(root);
            suffixNode.setPosition(0, -displayHeight * 0.55 - 28);
            suffixNode.addComponent(UITransform).setContentSize(300, 95);
            const label = suffixNode.addComponent(Label);
            label.string = suffix;
            label.fontSize = 68;
            label.lineHeight = 76;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.color = new Color(255, 244, 125, 255);
            label.enableOutline = true;
            label.outlineColor = new Color(5, 49, 145, 255);
            label.outlineWidth = 6;
        }

        tween(root)
            .to(0.14, { scale: new Vec3(peakScale, peakScale, 1) }, { easing: 'backOut' })
            .delay(0.25)
            .to(0.32, {
                position: new Vec3(position.x, position.y + 105),
                scale: new Vec3(0.92, 0.92, 1),
            }, { easing: 'sineOut' })
            .call(() => {
                if (isValid(root, true)) {
                    root.destroy();
                }
            })
            .start();
        tween(opacity)
            .to(0.08, { opacity: 255 })
            .delay(0.37)
            .to(0.26, { opacity: 0 })
            .start();
    }

    private playScreenShake(): void {
        if (this.shakeTarget === null) {
            return;
        }
        Tween.stopAllByTarget(this.shakeTarget);
        this.shakeTarget.setPosition(this.shakeOrigin);
        tween(this.shakeTarget)
            .to(0.035, { position: new Vec3(this.shakeOrigin.x - 9, this.shakeOrigin.y + 5) })
            .to(0.035, { position: new Vec3(this.shakeOrigin.x + 8, this.shakeOrigin.y - 4) })
            .to(0.035, { position: new Vec3(this.shakeOrigin.x - 5, this.shakeOrigin.y + 2) })
            .to(0.045, { position: this.shakeOrigin.clone() }, { easing: 'sineOut' })
            .start();
    }

    private destroyVisualNode(visualNode: Node): void {
        if (!isValid(visualNode, true)) {
            return;
        }
        const parent = visualNode.parent;
        visualNode.removeFromParent();
        visualNode.destroy();
        const siblings = parent?.children as readonly Node[] | null | undefined;
        // 只清理 Block Blast 玩法生成的临时 Block_x 容器。
        // 消消乐宝石直接属于固定 BlockLayer，绝不能把棋盘层一起销毁。
        if (parent !== null && isValid(parent, true)
            && parent.name.startsWith('Block_')
            && siblings !== null && siblings !== undefined && siblings.length === 0) {
            parent.destroy();
        }
    }

    private worldToEffectPosition(worldPosition: Readonly<Vec3>): Vec3 {
        const transform = this.effectLayer?.getComponent(UITransform);
        if (transform === null || transform === undefined) {
            return new Vec3();
        }
        const position = transform.convertToNodeSpaceAR(worldPosition);
        position.z = 0;
        return position;
    }

    private createPrefabNode(prefab: Prefab | null, fallbackName: string): Node {
        const node = prefab === null ? new Node(fallbackName) : instantiate(prefab);
        node.layer = UI_LAYER;
        return node;
    }

}
