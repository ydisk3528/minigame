import { _decorator, Component } from 'cc';
import { BoardManager, type BoardCoordinate } from '../core/BoardManager';

const { ccclass } = _decorator;

@ccclass('HammerBooster')
export class HammerBooster extends Component {
    public getTargets(
        boardManager: BoardManager,
        row: number,
        column: number,
    ): readonly BoardCoordinate[] {
        return boardManager.getCell(row, column)?.occupied
            ? [{ row, column }]
            : [];
    }
}
