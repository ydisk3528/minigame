import { localizeTree, uiText } from "../platform/UiText";

/** Modal using the game's existing artwork; resolves when the player confirms. */
export async function showRewardNotice(root: Laya.Sprite, message: string): Promise<void> {
    const panel = await Laya.Prefab.instantiate<Laya.Sprite>("resources/prefabs/ui/NoticePanel.lh");
    if (root.destroyed) { panel.destroy(); return; }
    localizeTree(panel);
    const text = panel.getChildByName("MessageText") as Laya.GTextField;
    text.text = uiText(message);
    text.wordWrap = true;
    const overlay = new Laya.Sprite();
    overlay.size(750, 1334);
    overlay.graphics.drawRect(0, 0, 750, 1334, "rgba(0,0,0,0.45)");
    overlay.mouseEnabled = true;
    overlay.zOrder = 10000;
    overlay.on(Laya.Event.CLICK, null, (event: Laya.Event) => event.stopPropagation());
    overlay.addChild(panel);
    root.addChild(overlay);
    panel.alpha = 0;
    Laya.Tween.to(panel, { alpha: 1 }, 180);
    await new Promise<void>(resolve => {
        (panel.getChildByName("CloseButton") as Laya.Sprite).on(Laya.Event.CLICK, null, () => {
            overlay.destroy(true);
            resolve();
        });
    });
}
