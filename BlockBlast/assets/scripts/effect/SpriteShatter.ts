import {
    BoxCollider2D,
    ERigidBody2DType,
    isValid,
    Layers,
    Node,
    PhysicsSystem2D,
    Rect,
    RigidBody2D,
    Size,
    Sprite,
    SpriteFrame,
    tween,
    UITransform,
    UIOpacity,
    Vec2,
} from 'cc';

export interface SpriteShatterOptions {
    readonly rows?: number;
    readonly columns?: number;
    readonly lifetime?: number;
    readonly fadeDuration?: number;
    readonly gravityScale?: number;
    readonly minSpeed?: number;
    readonly maxSpeed?: number;
    readonly upwardSpeed?: number;
    readonly angularSpeed?: number;
    readonly angleJitter?: number;
    readonly splitMode?: 'spread' | 'horizontalSplit';
    readonly horizontalSplitSpeed?: number;
}

/** Adapted from mayaslots6/assets/code/SpriteShatter.ts. */
export class SpriteShatter {
    public static canPlay(sprite: Sprite): boolean {
        const frame = sprite.spriteFrame;
        return frame !== null
            && !frame.rotated
            && sprite.node.parent !== null
            && sprite.node.getComponent(UITransform) !== null;
    }

    public static play(sprite: Sprite, options: SpriteShatterOptions = {}): Promise<void> {
        const frame = sprite.spriteFrame;
        const owner = sprite.node;
        const ownerTransform = owner.getComponent(UITransform);
        const parent = owner.parent;
        if (frame === null || ownerTransform === null || parent === null || frame.rotated) {
            return Promise.resolve();
        }

        const columns = Math.max(1, Math.floor(options.columns ?? 4));
        const rows = Math.max(1, Math.floor(options.rows ?? 4));
        const lifetime = Math.max(0.05, options.lifetime ?? 0.75);
        const fadeDuration = Math.max(0.01, options.fadeDuration ?? 0.25);
        const gravityScale = Math.max(0, options.gravityScale ?? 5);
        const minSpeed = Math.max(0, options.minSpeed ?? 3);
        const maxSpeed = Math.max(minSpeed, options.maxSpeed ?? 9);
        const upwardSpeed = Math.max(0, options.upwardSpeed ?? 7);
        const angularSpeed = Math.max(0, options.angularSpeed ?? 540);
        const angleJitter = Math.max(0, options.angleJitter ?? 24);
        const splitMode = options.splitMode ?? 'spread';
        const horizontalSplitSpeed = Math.max(0, options.horizontalSplitSpeed ?? 14);
        const pieces: Node[] = [];
        const pieceFrames: SpriteFrame[] = [];

        PhysicsSystem2D.instance.enable = true;

        const ownerSize = ownerTransform.contentSize;
        const sourceRect = frame.rect;
        const pieceWidth = ownerSize.width / columns;
        const pieceHeight = ownerSize.height / rows;
        const rectWidth = sourceRect.width / columns;
        const rectHeight = sourceRect.height / rows;
        const ownerWorld = owner.worldPosition.clone();
        sprite.enabled = false;

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const pieceFrame = this.createPieceFrame(
                    frame,
                    sourceRect,
                    column,
                    row,
                    rectWidth,
                    rectHeight,
                );
                pieceFrames.push(pieceFrame);

                const pieceNode = new Node(`bomb_piece_${row}_${column}`);
                pieceNode.layer = owner.layer || Layers.Enum.UI_2D;
                pieceNode.setParent(parent);
                pieceNode.setWorldPosition(ownerWorld);
                pieceNode.setScale(owner.worldScale);
                pieceNode.angle = owner.angle + (Math.random() * 2 - 1) * angleJitter;

                const localX = -ownerSize.width * 0.5 + pieceWidth * (column + 0.5);
                const localY = ownerSize.height * 0.5 - pieceHeight * (row + 0.5);
                pieceNode.setPosition(
                    pieceNode.position.x + localX,
                    pieceNode.position.y + localY,
                    owner.position.z + 2,
                );

                pieceNode.addComponent(UITransform).setContentSize(pieceWidth, pieceHeight);
                const pieceSprite = pieceNode.addComponent(Sprite);
                pieceSprite.sizeMode = Sprite.SizeMode.CUSTOM;
                pieceSprite.spriteFrame = pieceFrame;

                const opacity = pieceNode.addComponent(UIOpacity);
                opacity.opacity = 255;

                const body = pieceNode.addComponent(RigidBody2D);
                body.type = ERigidBody2DType.Dynamic;
                body.gravityScale = gravityScale;
                body.linearDamping = 0.05;
                body.angularDamping = 0.02;
                body.linearVelocity = this.randomVelocity(
                    column,
                    columns,
                    minSpeed,
                    maxSpeed,
                    upwardSpeed,
                    splitMode,
                    horizontalSplitSpeed,
                );
                body.angularVelocity = (Math.random() * 2 - 1) * angularSpeed;

                const collider = pieceNode.addComponent(BoxCollider2D);
                collider.size = new Size(pieceWidth, pieceHeight);
                collider.density = 0.2;
                collider.friction = 0.2;
                collider.restitution = 0.15;
                collider.apply();
                pieces.push(pieceNode);
            }
        }

        return new Promise((resolve) => {
            for (const piece of pieces) {
                const opacity = piece.getComponent(UIOpacity);
                if (opacity !== null) {
                    tween(opacity)
                        .delay(Math.max(0, lifetime - fadeDuration))
                        .to(fadeDuration, { opacity: 0 }, { easing: 'quadIn' })
                        .start();
                }
            }
            setTimeout(() => {
                for (const piece of pieces) {
                    if (isValid(piece, true)) {
                        piece.destroy();
                    }
                }
                for (const pieceFrame of pieceFrames) {
                    if (isValid(pieceFrame, true)) {
                        pieceFrame.destroy();
                    }
                }
                resolve();
            }, lifetime * 1000);
        });
    }

    private static createPieceFrame(
        frame: SpriteFrame,
        sourceRect: Rect,
        column: number,
        row: number,
        width: number,
        height: number,
    ): SpriteFrame {
        const pieceFrame = new SpriteFrame(`${frame.name}_piece_${row}_${column}`);
        pieceFrame.reset({
            texture: frame.texture,
            rect: new Rect(
                sourceRect.x + column * width,
                sourceRect.y + row * height,
                width,
                height,
            ),
            originalSize: new Size(width, height),
            offset: new Vec2(0, 0),
        });
        return pieceFrame;
    }

    private static randomVelocity(
        column: number,
        columns: number,
        minSpeed: number,
        maxSpeed: number,
        upwardSpeed: number,
        splitMode: 'spread' | 'horizontalSplit',
        horizontalSplitSpeed: number,
    ): Vec2 {
        if (splitMode === 'horizontalSplit') {
            const side = column < columns * 0.5 ? -1 : 1;
            const edgeBoost = columns <= 1
                ? 1
                : Math.abs(column / (columns - 1) - 0.5) * 2;
            return new Vec2(
                side * (horizontalSplitSpeed + edgeBoost * maxSpeed + Math.random() * minSpeed),
                upwardSpeed * 0.35 + Math.random() * maxSpeed * 0.35,
            );
        }
        const centerOffset = columns <= 1 ? 0 : (column / (columns - 1) - 0.5) * 2;
        const spread = centerOffset * maxSpeed + (Math.random() - 0.5) * minSpeed;
        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        return new Vec2(spread, upwardSpeed + speed * 0.5);
    }
}
