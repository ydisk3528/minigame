import {
    _decorator,
    Button,
    Component,
    instantiate,
    isValid,
    JsonAsset,
    Label,
    Node,
    Prefab,
    resources,
    SpriteFrame,
    tween,
    Tween,
    Vec3,
} from 'cc';
import { BoosterManager } from '../booster/BoosterManager';
import { AudioManager } from '../core/AudioManager';
import {
    StorageManager,
    type SaveData,
    type TimedBuffType,
} from '../utils/StorageManager';
import { getPopupFitScale } from '../utils/ResponsiveUI';
import { ShopItem, type ShopProduct } from './ShopItem';

const { ccclass, property } = _decorator;

/**
 * Controller for the editor-authored ShopPanel prefab.
 *
 * The component intentionally does not create visual nodes. Build the layout in
 * the prefab, then drag its labels/buttons/nodes into the fields below.
 */
@ccclass('ShopManager')
export class ShopManager extends Component {
    @property(Node)
    public modalRoot: Node | null = null;

    @property(Node)
    public panelNode: Node | null = null;

    @property(Label)
    public balanceLabel: Label | null = null;

    @property(Label)
    public messageLabel: Label | null = null;

    @property(Button)
    public closeButton: Button | null = null;

    @property(Node)
    public itemsContainer: Node | null = null;

    @property(Prefab)
    public itemPrefab: Prefab | null = null;

    @property(JsonAsset)
    public configAsset: JsonAsset | null = null;

    @property(SpriteFrame)
    public bombIcon: SpriteFrame | null = null;

    @property(SpriteFrame)
    public hammerIcon: SpriteFrame | null = null;

    @property(SpriteFrame)
    public rainbowIcon: SpriteFrame | null = null;

    @property(SpriteFrame)
    public luckIcon: SpriteFrame | null = null;

    @property(SpriteFrame)
    public freeGiftIcon: SpriteFrame | null = null;

    @property
    public configPath = 'config';

    @property(Node)
    public luckIndicator: Node | null = null;

    @property(Label)
    public luckTimerLabel: Label | null = null;

    @property(Node)
    public giftIndicator: Node | null = null;

    @property(Label)
    public giftTimerLabel: Label | null = null;

    private boosterManager: BoosterManager | null = null;
    private shopButton: Node | null = null;
    private mainCoinLabel: Label | null = null;
    private refreshElapsed = 0;
    private prepared = false;
    private configLoaded = false;
    private readonly items: ShopItem[] = [];
    private currentData: SaveData | null = null;

    public initialize(
        boosterManager: BoosterManager,
        shopButton: Node,
        mainCoinLabel: Label | null,
    ): void {
        this.boosterManager = boosterManager;
        this.mainCoinLabel = mainCoinLabel;
        StorageManager.offChanged(this.onStorageChanged, this);
        StorageManager.onChanged(this.onStorageChanged, this);
        this.bindShopButton(shopButton);
        this.prepareBindings();
        this.loadProducts();
        if (this.modalRoot !== null) {
            this.modalRoot.active = false;
        }
        this.refreshState();
    }

    public show(): void {
        this.prepareBindings();
        if (this.modalRoot !== null) {
            this.modalRoot.active = true;
        }
        this.refreshState();
        this.setMessage('', true);

        const panel = this.panelNode ?? this.node;
        const fitScale = getPopupFitScale(1500, 900);
        Tween.stopAllByTarget(panel);
        panel.setScale(fitScale * 0.72, fitScale * 0.72, 1);
        tween(panel)
            .to(0.22, { scale: new Vec3(fitScale * 1.04, fitScale * 1.04, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(fitScale, fitScale, 1) }, { easing: 'sineOut' })
            .start();
    }

    public hide(): void {
        if (this.modalRoot !== null) {
            this.modalRoot.active = false;
        }
    }

    protected override update(deltaTime: number): void {
        this.refreshElapsed += Math.max(0, deltaTime);
        if (this.refreshElapsed >= 1) {
            this.refreshElapsed = 0;
            this.refreshTimers();
        }
    }

    protected override onDestroy(): void {
        // Node event listeners are released by Cocos together with the scene.
        // Calling Node.off() here is unsafe because the node event processor may
        // already have been disposed before this component's onDestroy().
        StorageManager.offChanged(this.onStorageChanged, this);
    }

    private prepareBindings(): void {
        if (this.prepared) {
            return;
        }
        this.prepared = true;
        this.closeButton?.node.on(Node.EventType.TOUCH_END, this.onClosePressed, this);

    }

    private loadProducts(): void {
        if (this.configLoaded) {
            return;
        }
        this.configLoaded = true;
        if (this.configAsset !== null) {
            this.applyConfig(this.configAsset);
            return;
        }
        resources.load(this.configPath, JsonAsset, (error, asset) => {
            if (!this.node.isValid) {
                return;
            }
            if (error !== null && error !== undefined) {
                console.error(`[ShopManager] Failed to load ${this.configPath}.json`, error);
                this.setMessage('SHOP CONFIG LOAD FAILED', false);
                return;
            }
            this.applyConfig(asset);
        });
    }

    private applyConfig(asset: JsonAsset): void {
        const products = this.readProducts(asset.json);
        this.buildProducts(products);
        this.refreshState();
    }

    private readProducts(config: unknown): ShopProduct[] {
        if (typeof config !== 'object' || config === null) {
            console.error('[ShopManager] Shop config root must be an object.');
            return [];
        }
        const shop = (config as { shop?: unknown }).shop;
        if (typeof shop !== 'object' || shop === null) {
            console.error('[ShopManager] Missing shop config.');
            return [];
        }
        const products = (shop as { products?: unknown }).products;
        if (!Array.isArray(products)) {
            console.error('[ShopManager] shop.products must be an array.');
            return [];
        }
        return products
            .filter((value): value is ShopProduct => this.isProduct(value))
            .filter((product) => product.enabled !== false)
            .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
    }

    private isProduct(value: unknown): value is ShopProduct {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const product = value as Record<string, unknown>;
        const key = product.storageKey;
        const kind = product.kind;
        const validKey = kind === 'booster'
            ? key === 'bomb' || key === 'hammer' || key === 'rainbow'
            : kind === 'buff' && (key === 'luck' || key === 'freeGift');
        const valid = typeof product.id === 'string'
            && product.id.length > 0
            && typeof product.title === 'string'
            && typeof product.description === 'string'
            && typeof product.price === 'number'
            && Number.isFinite(product.price)
            && product.price >= 0
            && validKey
            && (product.iconPath === undefined || typeof product.iconPath === 'string')
            && (product.order === undefined || typeof product.order === 'number')
            && (product.enabled === undefined || typeof product.enabled === 'boolean');
        if (!valid) {
            console.warn('[ShopManager] Ignoring invalid shop product:', value);
        }
        return valid;
    }

    private buildProducts(products: readonly ShopProduct[]): void {
        if (this.itemsContainer === null || this.itemPrefab === null) {
            console.error('[ShopManager] Items Container or Item Prefab is not assigned.');
            return;
        }
        for (const item of this.items) {
            if (isValid(item.node, true)) {
                item.node.destroy();
            }
        }
        this.items.length = 0;
        for (const product of products) {
            const node = instantiate(this.itemPrefab);
            node.setParent(this.itemsContainer);
            node.active = true;
            const item = node.getComponent(ShopItem) ?? node.addComponent(ShopItem);
            item.configure(
                product,
                (selectedProduct) => this.purchase(selectedProduct),
                this.getAssignedIcon(product),
            );
            this.items.push(item);
        }
    }

    private getAssignedIcon(product: Readonly<ShopProduct>): SpriteFrame | null {
        switch (product.storageKey) {
            case 'bomb':
                return this.bombIcon;
            case 'hammer':
                return this.hammerIcon;
            case 'rainbow':
                return this.rainbowIcon;
            case 'luck':
                return this.luckIcon;
            case 'freeGift':
                return this.freeGiftIcon;
            default:
                return null;
        }
    }

    private bindShopButton(shopButton: Node): void {
        this.shopButton?.off(Button.EventType.CLICK, this.onOpenPressed, this);
        this.shopButton = shopButton;
        this.shopButton.on(Button.EventType.CLICK, this.onOpenPressed, this);
    }

    private onOpenPressed(): void {
        this.show();
    }

    private onClosePressed(): void {
        AudioManager.instance?.playClick();
        this.hide();
    }

    private purchase(product: Readonly<ShopProduct>): void {
        AudioManager.instance?.playClick();
        const data = StorageManager.load();
        if (product.kind === 'buff'
            && StorageManager.isBuffActive(product.storageKey as TimedBuffType, data)) {
            this.setMessage('BUFF ALREADY ACTIVE', false);
            return;
        }
        if (data.coin < product.price) {
            this.setMessage('NOT ENOUGH COINS', false);
            return;
        }

        data.coin -= product.price;
        if (product.kind === 'booster') {
            data.boosters[product.storageKey] += 1;
        } else if (product.storageKey === 'luck') {
            data.buffs.luckUntil = Date.now() + StorageManager.BUFF_DURATION_MS;
        } else {
            data.buffs.freeGiftUntil = Date.now() + StorageManager.BUFF_DURATION_MS;
            data.buffs.freeGiftClaimed = false;
        }
        StorageManager.save(data);
        this.boosterManager?.reloadInventory();
        AudioManager.instance?.playItemReady();
        this.setMessage(`${product.title} PURCHASED!`, true);
        this.refreshState();
    }

    private refreshState(): void {
        const data = StorageManager.load();
        this.applyState(data);
    }

    private onStorageChanged(data: Readonly<SaveData>): void {
        this.applyState(data);
    }

    private applyState(data: Readonly<SaveData>): void {
        this.currentData = data as SaveData;
        const formattedCoins = data.coin.toLocaleString('en-US');
        if (this.balanceLabel !== null) {
            this.balanceLabel.string = `COINS :  ${formattedCoins}`;
        }
        if (this.mainCoinLabel !== null) {
            this.mainCoinLabel.string = formattedCoins;
        }
        for (const item of this.items) {
            item.refresh(data);
        }

        this.refreshTimers();
    }

    private refreshTimers(): void {
        const data = this.currentData;
        if (data === null) {
            return;
        }
        for (const item of this.items) {
            item.refreshTimer(data);
        }

        const now = Date.now();
        this.updateBuffIndicator(
            this.luckIndicator,
            this.luckTimerLabel,
            Math.max(0, data.buffs.luckUntil - now),
        );
        this.updateBuffIndicator(
            this.giftIndicator,
            this.giftTimerLabel,
            Math.max(0, data.buffs.freeGiftUntil - now),
        );
    }

    private updateBuffIndicator(root: Node | null, label: Label | null, remainingMs: number): void {
        if (root !== null) {
            root.active = remainingMs > 0;
        }
        if (label !== null && remainingMs > 0) {
            label.string = ShopItem.formatDuration(remainingMs);
        }
    }

    private setMessage(message: string, success: boolean): void {
        if (this.messageLabel === null) {
            return;
        }
        this.messageLabel.string = message;
        this.messageLabel.color = success
            ? ShopItem.SUCCESS_COLOR
            : ShopItem.ERROR_COLOR;
    }
}
