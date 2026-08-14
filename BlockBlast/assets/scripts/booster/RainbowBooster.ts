import { _decorator, Component } from 'cc';
import { BoardManager, type BoardCoordinate } from '../core/BoardManager';

const { ccclass } = _decorator;

@ccclass('RainbowBooster')
export class RainbowBooster extends Component {
    public getTargets(
        boardManager: BoardManager,
        row: number,
        column: number,
    ): readonly BoardCoordinate[] {
        const colorId = boardManager.getColorAt(row, column);
        return colorId === null
            ? []
            : boardManager.getOccupiedCoordinatesByColor(colorId);
    }
}
