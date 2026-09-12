import { _decorator, Component, SpriteFrame, AudioClip, CCString } from 'cc';
const { ccclass, property } = _decorator;
@ccclass('DeferredAssets')
export class DeferredAssets extends Component {
    @property([SpriteFrame]) faces: SpriteFrame[] = [];
    @property([SpriteFrame]) portraits: SpriteFrame[] = [];
    @property([AudioClip]) sounds: AudioClip[] = [];
    @property([CCString]) soundNames: string[] = [];
}
