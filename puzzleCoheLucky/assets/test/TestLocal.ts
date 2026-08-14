
import { _decorator, Component, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;

/**
 * Predefined variables
 * Name = TestLocal
 * DateTime = Mon Nov 06 2023 20:12:59 GMT+0800 (China Standard Time)
 * Author = wanglang3081
 * FileBasename = TestLocal.ts
 * FileBasenameNoExtension = TestLocal
 * URL = db://assets/test/TestLocal.ts
 * ManualUrl = https://docs.cocos.com/creator/3.3/manual/en/
 *
 */
 
@ccclass('TestLocal')
export class TestLocal extends Component {
    
    @property(Sprite)
    testlocal:Sprite=null!

    start () {
        // [3]
        console.log("testlocal ",this.testlocal.spriteFrame?._uuid)
    }
 
}