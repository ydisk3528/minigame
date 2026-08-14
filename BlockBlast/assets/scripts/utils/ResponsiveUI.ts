import { Node, UITransform, view } from 'cc';
import { GAME_CONFIG } from './Config';

export interface VisibleUiSize {
    readonly width: number;
    readonly height: number;
}

/** Returns the current visible area in Canvas/design coordinates. */
export function getVisibleUiSize(): VisibleUiSize {
    const visible = view.getVisibleSize();
    return {
        width: Math.max(1, visible.width || GAME_CONFIG.designWidth),
        height: Math.max(1, visible.height || GAME_CONFIG.designHeight),
    };
}

/** Makes a modal blocker/background cover the complete visible screen. */
export function fitNodeToVisibleScreen(node: Node, bleed = 8): VisibleUiSize {
    const visible = getVisibleUiSize();
    node.getComponent(UITransform)?.setContentSize(
        visible.width + bleed * 2,
        visible.height + bleed * 2,
    );
    node.setPosition(0, 0, 0);
    return visible;
}

/** Uniformly fits a popup inside the screen without stretching its artwork. */
export function getPopupFitScale(
    contentWidth: number,
    contentHeight: number,
    horizontalMargin = 96,
    verticalMargin = 72,
    maximumScale = 1,
): number {
    const visible = getVisibleUiSize();
    return Math.min(
        Math.max(0.1, maximumScale),
        Math.max(0.1, (visible.width - horizontalMargin * 2) / Math.max(1, contentWidth)),
        Math.max(0.1, (visible.height - verticalMargin * 2) / Math.max(1, contentHeight)),
    );
}
