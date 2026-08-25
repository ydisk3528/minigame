import { _decorator } from 'cc';
import { ArrowPath } from '../board/ArrowPath';
const { ccclass } = _decorator;

/** Cocos Creator 3.8 TypeScript port of the old Line.js component. */
@ccclass('Line')
export class Line extends ArrowPath {}
