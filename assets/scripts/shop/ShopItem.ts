import {
    _decorator,
    Button,
    Color,
    Component,
    Label,
    Node,
    resources,
    Sprite,
    SpriteFrame,
} from 'cc';
import type { SaveData, StoredBoosterType, TimedBuffType } from '../utils/StorageManager';

const { ccclass, property } = _decorator;

interface ShopProductBase {
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly price: number;
    readonly iconPath?: string;
    readonly order?: number;
    readonly enabled?: boolean;
}

export type ShopProduct = ShopProductBase & (
    | { readonly kind: 'booster'; readonly storageKey: StoredBoosterType }
    | { readonly kind: 'buff'; readonly storageKey: TimedBuffType }
);

@ccclass('ShopItem')
export class ShopItem extends Component {
    public static readonly SUCCESS_COLOR = new Color(113, 244, 183, 255);
    public static readonly ERROR_COLOR = new Color(255, 131, 131, 255);

    @property(Sprite)
    public icon: Sprite | null = null;

    @property(Label)
    public titleLabel: Label | null = null;

    @property(Label)
    public descriptionLabel: Label | null = null;

    @property(Label)
    public priceLabel: Label | null = null;

    @property(Label)
    public stateLabel: Label | null = null;

    @property(Button)
    public buyButton: Button | null = null;

    @property(Node)
    public activeMark: Node | null = null;

    private product: ShopProduct | null = null;
    private purchaseCallback: ((product: Readonly<ShopProduct>) => void) | null = null;
    private boundButton: Button | null = null;
    private iconLoadVersion = 0;

    public configure(
        product: Readonly<ShopProduct>,
        callback: (product: Readonly<ShopProduct>) => void,
        assignedIcon: SpriteFrame | null = null,
    ): void {
        this.product = { ...product } as ShopProduct;
        this.purchaseCallback = callback;
        this.node.name = `ShopItem_${product.id}`;
        this.applyStaticContent();
        if (this.icon !== null && assignedIcon !== null) {
            this.iconLoadVersion += 1;
            this.icon.spriteFrame = assignedIcon;
        } else {
            this.loadIcon();
        }
        this.bindButton();
    }

    public refresh(data: Readonly<SaveData>): void {
        const product = this.product;
        if (product === null) {
            return;
        }
        if (product.kind === 'booster') {
            const count = data.boosters[product.storageKey];
            if (this.stateLabel !== null) {
                this.stateLabel.string = `OWNED ${count}`;
            }
            if (this.activeMark !== null) {
                this.activeMark.active = false;
            }
            if (this.buyButton !== null) {
                this.buyButton.interactable = true;
            }
            return;
        }

        this.refreshTimer(data);
    }

    public refreshTimer(data: Readonly<SaveData>): void {
        const product = this.product;
        if (product === null || product.kind !== 'buff') {
            return;
        }

        const expiresAt = product.storageKey === 'luck'
            ? data.buffs.luckUntil
            : data.buffs.freeGiftUntil;
        const remaining = Math.max(0, expiresAt - Date.now());
        const active = remaining > 0;
        if (this.stateLabel !== null) {
            this.stateLabel.string = active ? `ACTIVE ${ShopItem.formatDuration(remaining)}` : '';
        }
        if (this.activeMark !== null) {
            this.activeMark.active = active;
        }
        if (this.buyButton !== null) {
            this.buyButton.interactable = !active;
        }
    }

    public static formatDuration(remainingMs: number): string {
        const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    protected override onDestroy(): void {
        this.iconLoadVersion += 1;
        this.boundButton = null;
        this.purchaseCallback = null;
    }

    private applyStaticContent(): void {
        const product = this.product;
        if (product === null) {
            return;
        }
        if (this.titleLabel !== null) {
            this.titleLabel.string = product.title;
        }
        if (this.descriptionLabel !== null) {
            this.descriptionLabel.string = product.description;
        }
        if (this.priceLabel !== null) {
            this.priceLabel.string = product.price.toLocaleString('en-US');
        }
    }

    private loadIcon(): void {
        const path = this.product?.iconPath;
        if (this.icon === null || path === undefined || path.length === 0) {
            return;
        }
        const version = ++this.iconLoadVersion;
        resources.load(path, SpriteFrame, (error, frame) => {
            if (version !== this.iconLoadVersion || !this.node.isValid) {
                return;
            }
            if (error !== null && error !== undefined) {
                console.warn(`[ShopItem] Failed to load icon: ${path}`, error);
                return;
            }
            if (this.icon !== null) {
                this.icon.spriteFrame = frame;
            }
        });
    }

    private bindButton(): void {
        if (this.boundButton === this.buyButton) {
            return;
        }
        this.boundButton?.node?.off(Node.EventType.TOUCH_END, this.onBuyPressed, this);
        this.boundButton = this.buyButton;
        this.boundButton?.node?.on(Node.EventType.TOUCH_END, this.onBuyPressed, this);
    }

    private onBuyPressed(): void {
        if (this.product !== null) {
            this.purchaseCallback?.(this.product);
        }
    }
}
