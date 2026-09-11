import {_decorator,Component,Node,SpriteFrame,AudioClip} from 'cc';
const {ccclass,property}=_decorator;

/** Bindings travel with the authored prefab instead of the first scene. */
@ccclass('DeferredAssets')
export class DeferredAssets extends Component {
    @property([Node]) cards:Node[]=[];
    @property([SpriteFrame]) blackRanks:SpriteFrame[]=[];
    @property([SpriteFrame]) redRanks:SpriteFrame[]=[];
    @property([SpriteFrame]) suits:SpriteFrame[]=[];
    @property([SpriteFrame]) portraits:SpriteFrame[]=[];
    @property(AudioClip) backgroundMusic:AudioClip=null!;
    @property(AudioClip) winMusic:AudioClip=null!;
    @property(AudioClip) cardSound:AudioClip=null!;
}
