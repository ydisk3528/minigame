import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Component,
    EditBox,
    Graphics,
    Label,
    Layers,
    Node,
    UITransform,
} from 'cc';
import { BlockFactory } from '../block/BlockFactory';
import { BoosterManager } from '../booster/BoosterManager';
import { BoardManager } from '../core/BoardManager';
import { ScoreManager } from '../core/ScoreManager';
import { LevelManager } from '../level/LevelManager';
import { MatchBoardManager, type SpecialGemType } from '../match/MatchBoardManager';
import { GAME_CONFIG } from '../utils/Config';

const { ccclass } = _decorator;
const UI_LAYER = Layers.Enum.UI_2D;

@ccclass('BoardDebugPanel')
export class BoardDebugPanel extends Component {
    private boardManager: BoardManager | null = null;
    private matchBoardManager: MatchBoardManager | null = null;
    private blockFactory: BlockFactory | null = null;
    private levelManager: LevelManager | null = null;
    private scoreManager: ScoreManager | null = null;
    private boosterManager: BoosterManager | null = null;
    private panel: Node | null = null;
    private dataLabel: Label | null = null;
    private debugLevelLabel: Label | null = null;
    private debugLevelInput: EditBox | null = null;

    public initialize(
        boardManager: BoardManager,
        matchBoardManager: MatchBoardManager,
        blockFactory: BlockFactory,
        levelManager: LevelManager,
        scoreManager: ScoreManager,
        boosterManager: BoosterManager,
    ): void {
        this.boardManager = boardManager;
        this.matchBoardManager = matchBoardManager;
        this.blockFactory = blockFactory;
        this.levelManager = levelManager;
        this.scoreManager = scoreManager;
        this.boosterManager = boosterManager;
        this.buildButton();
        this.buildPanel();
    }

    private buildButton(): void {
        const button = this.createNode('DebugDataButton', this.node, 210, 62, 835, -490);
        this.drawBox(button, 210, 68, new Color(122, 28, 61, 245), new Color(255, 115, 148, 255), 14);
        this.createLabel(button, 'DEBUG DATA', 25, 190, 54, 0, 0);
        button.addComponent(Button);
        button.on(Node.EventType.TOUCH_END, () => this.show());
    }

    private buildPanel(): void {
        const panel = this.createNode('BoardDebugOverlay', this.node, 1920, 1280, 0, 0);
        panel.addComponent(BlockInputEvents);
        const dim = panel.addComponent(Graphics);
        dim.fillColor = new Color(1, 6, 22, 238);
        dim.rect(-960, -640, 1920, 1280);
        dim.fill();

        const card = this.createNode('DebugCard', panel, 1500, 940, 0, 0);
        this.drawBox(card, 1500, 940, new Color(6, 20, 49, 255), new Color(60, 210, 255, 255), 24);
        this.createLabel(card, 'BOARD DEBUG SNAPSHOT', 36, 1360, 60, 0, 405);
        this.dataLabel = this.createLabel(card, '', 22, 1380, 720, 0, 5);
        this.dataLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.dataLabel.verticalAlign = Label.VerticalAlign.TOP;
        this.dataLabel.lineHeight = 31;
        this.dataLabel.overflow = Label.Overflow.SHRINK;

        const minusTen = this.createNode('DebugMinusTen', card, 120, 64, -620, -405);
        this.drawBox(minusTen, 120, 68, new Color(80, 49, 120, 255), new Color(183, 132, 255, 255), 14);
        this.createLabel(minusTen, '-10', 27, 105, 54, 0, 0);
        minusTen.addComponent(Button);
        minusTen.on(Node.EventType.TOUCH_END, () => this.jumpLevel(-10));

        const previous = this.createNode('DebugPreviousLevel', card, 145, 64, -475, -405);
        this.drawBox(previous, 145, 68, new Color(38, 75, 137, 255), new Color(99, 190, 255, 255), 14);
        this.createLabel(previous, 'PREV', 24, 130, 54, 0, 0);
        previous.addComponent(Button);
        previous.on(Node.EventType.TOUCH_END, () => this.jumpLevel(-1));

        const levelBox = this.createNode('DebugCurrentLevel', card, 180, 64, -305, -405);
        this.drawBox(levelBox, 180, 68, new Color(17, 37, 78, 255), new Color(255, 220, 91, 255), 14);
        this.debugLevelLabel = this.createLabel(levelBox, '1', 24, 165, 54, 0, 0);
        this.debugLevelInput = levelBox.addComponent(EditBox);
        this.debugLevelInput.textLabel = this.debugLevelLabel;
        this.debugLevelInput.inputMode = EditBox.InputMode.DECIMAL;
        this.debugLevelInput.maxLength = 5;
        this.debugLevelInput.string = '1';
        levelBox.on(EditBox.EventType.EDITING_DID_ENDED, () => {
            const requested = Number.parseInt(this.debugLevelInput?.string ?? '', 10);
            if (Number.isFinite(requested)) {
                this.jumpToLevel(requested);
            }
        });

        const next = this.createNode('DebugNextLevel', card, 145, 64, -135, -405);
        this.drawBox(next, 145, 68, new Color(38, 75, 137, 255), new Color(99, 190, 255, 255), 14);
        this.createLabel(next, 'NEXT', 24, 130, 54, 0, 0);
        next.addComponent(Button);
        next.on(Node.EventType.TOUCH_END, () => this.jumpLevel(1));

        const plusTen = this.createNode('DebugPlusTen', card, 120, 64, 10, -405);
        this.drawBox(plusTen, 120, 68, new Color(80, 49, 120, 255), new Color(183, 132, 255, 255), 14);
        this.createLabel(plusTen, '+10', 27, 105, 54, 0, 0);
        plusTen.addComponent(Button);
        plusTen.on(Node.EventType.TOUCH_END, () => this.jumpLevel(10));

        const exportButton = this.createNode('ExportDebugText', card, 220, 64, 220, -405);
        this.drawBox(exportButton, 220, 68, new Color(28, 116, 91, 255), new Color(99, 255, 198, 255), 14);
        this.createLabel(exportButton, 'EXPORT TXT', 25, 200, 54, 0, 0);
        exportButton.addComponent(Button);
        exportButton.on(Node.EventType.TOUCH_END, () => this.exportText());

        const close = this.createNode('CloseDebug', card, 170, 64, 455, -405);
        this.drawBox(close, 170, 68, new Color(26, 91, 156, 255), new Color(102, 218, 255, 255), 14);
        this.createLabel(close, 'CLOSE', 27, 150, 54, 0, 0);
        close.addComponent(Button);
        close.on(Node.EventType.TOUCH_END, () => {
            if (this.panel !== null) {
                this.panel.active = false;
            }
        });
        panel.active = false;
        this.panel = panel;
    }

    private show(): void {
        const report = this.createReport();
        if (this.dataLabel !== null) {
            this.dataLabel.string = report;
        }
        if (this.debugLevelLabel !== null) {
            this.debugLevelLabel.string = `${this.levelManager?.getCurrentLevel()?.id ?? 1}`;
        }
        if (this.debugLevelInput !== null) {
            this.debugLevelInput.string = `${this.levelManager?.getCurrentLevel()?.id ?? 1}`;
        }
        if (this.panel !== null) {
            this.panel.active = true;
            this.panel.setSiblingIndex(Math.max(0, (this.node.children?.length ?? 1) - 1));
        }
        console.info(`[BoardDebugSnapshot]\n${report}`);
    }

    private jumpLevel(offset: number): void {
        const manager = this.levelManager;
        if (manager === null) {
            return;
        }
        const current = manager.getCurrentLevel()?.id ?? 1;
        this.jumpToLevel(current + offset);
    }

    private jumpToLevel(levelId: number): void {
        const manager = this.levelManager;
        if (manager === null) {
            return;
        }
        const current = manager.getCurrentLevel()?.id ?? 1;
        const target = Math.max(
            1,
            Math.min(manager.getPublishedLevelCount(), Math.floor(levelId)),
        );
        if (target === current) {
            return;
        }
        if (this.panel !== null) {
            this.panel.active = false;
        }
        manager.debugJumpToLevel(target);
    }

    private exportText(): void {
        const report = this.createReport();
        const levelId = this.levelManager?.getCurrentLevel()?.id ?? 0;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `board-debug-level-${levelId}-${timestamp}.txt`;
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        console.info(`[BoardDebugSnapshot] Exported ${fileName}`);
    }

    private createReport(): string {
        const level = this.levelManager?.getCurrentLevel();
        const match = this.matchBoardManager?.getDebugState();
        const isMatch = level?.gameMode === 'match3' && match?.active === true;
        const lines = [
            `LEVEL=${level?.id ?? '?'} MODE=${level?.gameMode ?? '?'}`,
            `SCORE=${this.scoreManager?.getScore() ?? 0} TARGET=${level?.targetScore ?? 0}`,
            `OCCUPIED=${this.boardManager?.getOccupiedCellCount() ?? 0}`,
            `BOOSTER_AIM=${this.boosterManager?.getActiveBooster() ?? 'NONE'}`,
            isMatch
                ? `MATCH_LENGTH=${match.matchLength} MOVES=${match.movesRemaining} LEFT=${match.remainingGems} COLORS=${match.remainingColors} RESCUE_DROPS=${match.rescueDrops} RESOLVING=${match.resolving} CLEAR_PHASE=${match.clearingPhase} FINAL_HAMMER=${match.finalHammerActive}`
                : 'MATCH_STATE=INACTIVE',
            isMatch
                ? `POTENTIAL=${this.formatMove(match.potentialMove)}`
                : `PREVIEWS=${this.formatPreviews()}`,
            '',
            'GRID  (. empty, X inactive, color + special):',
        ];
        for (let row = 0; row < GAME_CONFIG.boardRows; row += 1) {
            const cells: string[] = [];
            for (let column = 0; column < GAME_CONFIG.boardColumns; column += 1) {
                const boardCell = this.boardManager?.getCell(row, column);
                if (boardCell === null || boardCell === undefined || !boardCell.active) {
                    cells.push(' X ');
                    continue;
                }
                if (!boardCell.occupied) {
                    cells.push(' . ');
                    continue;
                }
                const matchCell = match?.cells[row]?.[column] ?? null;
                const colorId = matchCell?.colorId ?? boardCell.colorId ?? -1;
                const value = `${colorId}${this.specialCode(matchCell?.special ?? 'none')}`;
                cells.push(value.length >= 3 ? value : `${value}${'   '.slice(value.length)}`);
            }
            lines.push(`R${row}: ${cells.join(' ')}`);
        }
        lines.push('', 'SPECIAL: H horizontal, V vertical, B bomb, R rainbow');
        lines.push(`TIME=${new Date().toISOString()}`);
        return lines.join('\n');
    }

    private formatMove(move: { readonly first: { row: number; column: number }; readonly second: { row: number; column: number } } | null): string {
        return move === null
            ? 'NONE'
            : `(${move.first.row},${move.first.column})->(${move.second.row},${move.second.column})`;
    }

    private formatPreviews(): string {
        const previews = this.blockFactory?.getDebugPreviewData() ?? [];
        return previews.map((preview) =>
            `S${preview.shapeId}/C${preview.colorId}/CELL_COLORS=${preview.cellColorIds.join(',')}[${preview.cells.map((cell) => `${cell.row},${cell.column}`).join('|')}]`,
        ).join('  ') || 'NONE';
    }

    private specialCode(type: SpecialGemType): string {
        switch (type) {
            case 'rocketHorizontal': return 'H';
            case 'rocketVertical': return 'V';
            case 'bomb': return 'B';
            case 'rainbow': return 'R';
            default: return ' ';
        }
    }

    private createNode(name: string, parent: Node, width: number, height: number, x: number, y: number): Node {
        const node = new Node(name);
        node.layer = UI_LAYER;
        node.setParent(parent);
        node.setPosition(x, y);
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private createLabel(parent: Node, text: string, fontSize: number, width: number, height: number, x: number, y: number): Label {
        const node = this.createNode('Label', parent, width, height, x, y);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.15);
        label.color = new Color(218, 245, 255, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        return label;
    }

    private drawBox(node: Node, width: number, height: number, fill: Readonly<Color>, stroke: Readonly<Color>, radius: number): void {
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = fill;
        graphics.strokeColor = stroke;
        graphics.lineWidth = 3;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        graphics.stroke();
    }
}
