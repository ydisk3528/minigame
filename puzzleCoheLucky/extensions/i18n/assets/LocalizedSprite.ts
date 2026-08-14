
import * as i18n from './LanguageData';

import { _decorator, Component, SpriteFrame, Sprite } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('LocalizedSpriteItem')
class LocalizedSpriteItem {
    @property
    language: string = 'en';
    @property({
        type: SpriteFrame,
    })
    spriteFrame: SpriteFrame = null!;
}

@ccclass('LocalizedSprite')
@executeInEditMode
export class LocalizedSprite extends Component {
    sprite: Sprite = null!;

    @property({
        type: [LocalizedSpriteItem],
    })
    spriteList:LocalizedSpriteItem[] = [];

    onLoad() {
        if (!i18n.ready) {
            i18n.init('zh');
        }
        this.fetchRender();
    }

    fetchRender () {
        console.log("fetchRender===>>>")
        let sprite = this.getComponent('cc.Sprite') as Sprite;
        if (sprite) {
            this.sprite = sprite;
            this.updateSprite();
            return;
        } 
    }

    updateSprite () {
        for (let i = 0; i < this.spriteList.length; i++) {
            const item = this.spriteList[i];
            if (item.language === i18n._language) {
                this.sprite.spriteFrame = item.spriteFrame;
                break;
            }
        }
    }
}
