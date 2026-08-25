import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

/** Small TS replacement for MadeLevel.js serialization used by the old level editor. */
@ccclass('MadeLevel')
export class MadeLevel extends Component {
    encode(width: number, height: number, paths: number[][], id = 1, time = 300): string {
        return JSON.stringify({ id, width, height, levelData: JSON.stringify(paths), time }, null, 2);
    }
}
