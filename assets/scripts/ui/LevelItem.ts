import { _decorator, Button, Component, Label, Node, Sprite, SpriteFrame, UITransform } from 'cc';

const { ccclass, property } = _decorator;

export interface LevelItemData {
    readonly levelId: number;
    readonly stars: number;
    readonly unlocked: boolean;
    readonly current: boolean;
}

@ccclass('LevelItem')
export class LevelItem extends Component {
    @property(Label)
    public levelLabel: Label | null = null;

    @property(Label)
    public starsLabel: Label | null = null;

    @property(Node)
    public unlockedRoot: Node | null = null;

    @property(Node)
    public lockedRoot: Node | null = null;

    @property(Node)
    public currentIndicator: Node | null = null;

    @property([Node])
    public starIndicators: Node[] = [];

    @property([Node])
    public litStarIndicators: Node[] = [];

    @property([Node])
    public unlitStarIndicators: Node[] = [];

    @property(SpriteFrame)
    public litStarFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    public unlitStarFrame: SpriteFrame | null = null;

    @property
    public starSpacing = 52;

    @property
    public starY = -43;

    @property
    public starSize = 50;

    private levelId = 0;
    private unlocked = false;
    private onSelected: ((levelId: number) => void) | null = null;
    private button: Button | null = null;

    protected override onLoad(): void {
        this.ensureImageStars();
        this.autoBind();
        this.button = this.node.getComponent(Button);
        if (this.button !== null) {
            this.node.on(Button.EventType.CLICK, this.handleTouchEnd, this);
        } else {
            this.node.on(Node.EventType.TOUCH_END, this.handleTouchEnd, this);
        }
    }

    public bind(data: LevelItemData, onSelected: (levelId: number) => void): void {
        this.ensureImageStars();
        this.autoBind();
        this.levelId = data.levelId;
        this.unlocked = data.unlocked;
        this.onSelected = onSelected;
        const displayedStars = data.unlocked ? Math.max(0, Math.min(3, data.stars)) : 0;
        this.node.name = `LevelItem_${data.levelId}`;
        if (this.levelLabel !== null) {
            this.levelLabel.string = data.levelId.toString();
            this.levelLabel.node.active = true;
        }
        if (this.starsLabel !== null) {
            this.starsLabel.string = Array.from(
                { length: 3 },
                (_, index) => index < displayedStars ? '★' : '☆',
            ).join('');
        }
        if (this.litStarIndicators.length > 0 || this.unlitStarIndicators.length > 0) {
            this.litStarIndicators.forEach((star, index) => {
                star.active = index < displayedStars;
            });
            this.unlitStarIndicators.forEach((star, index) => {
                star.active = index >= displayedStars;
            });
        } else {
            this.starIndicators.forEach((star, index) => {
                star.active = index < displayedStars;
            });
        }
        if (this.unlockedRoot !== null) this.unlockedRoot.active = data.unlocked;
        if (this.lockedRoot !== null) {
            this.lockedRoot.active = !data.unlocked;
            // Locked is a background/overlay skin. Keep it behind the common
            // level number and the three unlit stars so their content remains visible.
            if (!data.unlocked) this.lockedRoot.setSiblingIndex(0);
        }
        if (this.currentIndicator !== null) this.currentIndicator.active = data.current;
    }

    private readonly handleTouchEnd = (): void => {
        if (this.unlocked && this.levelId > 0) {
            this.onSelected?.(this.levelId);
        }
    };

    private autoBind(): void {
        this.levelLabel ??= this.findComponent(Label, ['LevelLabel', 'LevelNumber', 'Number']);
        this.starsLabel ??= this.findComponent(Label, ['StarsLabel', 'Stars']);
        this.unlockedRoot ??= this.findNode(['Unlocked', 'Unlock']);
        this.lockedRoot ??= this.findNode(['Locked', 'Lock']);
        this.currentIndicator ??= this.findNode(['Current', 'CurrentIndicator']);
        if (this.starIndicators.length === 0) {
            this.starIndicators = ['Star1', 'Star2', 'Star3']
                .map((name) => this.findNode([name]))
                .filter((node): node is Node => node !== null);
        }
        if (this.litStarIndicators.length === 0) {
            this.litStarIndicators = ['StarLit1', 'StarLit2', 'StarLit3']
                .map((name) => this.findNode([name]))
                .filter((node): node is Node => node !== null);
        }
        if (this.unlitStarIndicators.length === 0) {
            this.unlitStarIndicators = ['StarUnlit1', 'StarUnlit2', 'StarUnlit3']
                .map((name) => this.findNode([name]))
                .filter((node): node is Node => node !== null);
        }
    }

    /** Creates three overlapping lit/unlit pairs: six Sprite nodes in total. */
    private ensureImageStars(): void {
        const frames = this.resolveStarFrames();
        const litNodes: Node[] = [];
        const unlitNodes: Node[] = [];
        for (let index = 0; index < 3; index += 1) {
            const number = index + 1;
            const x = (index - 1) * this.starSpacing;
            const unlit = this.findNode([`StarUnlit${number}`])
                ?? this.createStarNode(`StarUnlit${number}`, x, frames.unlit);
            const lit = this.findNode([`StarLit${number}`])
                ?? this.createStarNode(`StarLit${number}`, x, frames.lit);
            const unlitSprite = unlit.getComponent(Sprite);
            const litSprite = lit.getComponent(Sprite);
            if (unlitSprite !== null) unlitSprite.spriteFrame = frames.unlit;
            if (litSprite !== null) litSprite.spriteFrame = frames.lit;
            unlitNodes.push(unlit);
            litNodes.push(lit);
        }
        this.unlitStarIndicators = unlitNodes;
        this.litStarIndicators = litNodes;
        if (this.starsLabel !== null) {
            this.starsLabel.node.active = false;
        }
    }

    private resolveStarFrames(): {
        readonly lit: SpriteFrame | null;
        readonly unlit: SpriteFrame | null;
    } {
        const configuredLit = this.litStarFrame;
        const configuredUnlit = this.unlitStarFrame;
        // Existing art naming: balanceStar01 is the blue/unlit image and
        // balanceStar02 is the yellow/lit image. Resolve by name as a guard
        // against legacy prefab bindings that had these two fields reversed.
        const firstName = configuredLit?.name.toLowerCase() ?? '';
        const secondName = configuredUnlit?.name.toLowerCase() ?? '';
        if (firstName.indexOf('star01') >= 0 && secondName.indexOf('star02') >= 0) {
            return { lit: configuredUnlit, unlit: configuredLit };
        }
        return { lit: configuredLit, unlit: configuredUnlit };
    }

    private createStarNode(name: string, x: number, frame: SpriteFrame | null): Node {
        const node = new Node(name);
        node.layer = this.node.layer;
        node.setParent(this.node);
        node.setPosition(x, this.starY);
        node.addComponent(UITransform).setContentSize(this.starSize, this.starSize);
        const sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        return node;
    }

    private findNode(names: readonly string[]): Node | null {
        const queue = [...this.node.children];
        while (queue.length > 0) {
            const child = queue.shift();
            if (child === undefined) continue;
            if (names.indexOf(child.name) >= 0) return child;
            queue.push(...child.children);
        }
        return null;
    }

    private findComponent(type: typeof Label, names: readonly string[]): Label | null {
        return this.findNode(names)?.getComponent(type) ?? null;
    }
}
