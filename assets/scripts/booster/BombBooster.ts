import { _decorator, Component } from 'cc';
import { BoardManager, type BoardCoordinate } from '../core/BoardManager';

const { ccclass } = _decorator;

@ccclass('BombBooster')
export class BombBooster extends Component {
    public getTargets(
        boardManager: BoardManager,
        centerRow: number,
        centerColumn: number,
    ): readonly BoardCoordinate[] {
        const targets: BoardCoordinate[] = [];
        for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
            for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
                const row = centerRow + rowOffset;
                const column = centerColumn + columnOffset;
                if (boardManager.getCell(row, column)?.occupied) {
                    targets.push({ row, column });
                }
            }
        }
        return targets;
    }
}
