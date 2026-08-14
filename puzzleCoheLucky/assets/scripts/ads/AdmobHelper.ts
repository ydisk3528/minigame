import { Director, Scene, director, game, sys } from "cc";
import { _decorator, Component, Node, Prefab, SpriteFrame, Sprite, instantiate } from 'cc';
import NativeSDK from "../NativeSDK";
const { ccclass, property } = _decorator;
declare global {
    interface Window {
        sxwb: {
            postMessage: (message: { function: string, params?: { [key: string]: any }, callback?: string } | string) => void;
        };
        native_api_header_cbk: (message: any) => void;
        native_api_req_lan_cbk: (message: any) => void;
        set_navi_bar_hidden_cbk: (message: any) => void;
        set_content_inset_adjustment_cbk: (message: any) => void;
        on_safe_area_change_cbk: (message: any) => void;
        onAdInterstitialShow: () => void;
        take_screen_shot: () => void;
        onAdRewardsCallBack: (ewardAmount: number, rewardType: string) => void;
        availHeightPx: number,
        availWidthPx: number,
        avail_height_px: number,
        avail_width_px: number,
        safe_top: number,
        safe_bottom: number,
        vConsole: {
            showSwitch(): void;
            hideSwitch(): void;
        }
    }
}
window.onAdInterstitialShow = function () {

}
window.onAdRewardsCallBack = function (rewardAmount: number, rewardType: string) {
}
let admobConfig = {
    bannerId: "ca-app-pub-9981907143439102/5464453126",
    interstitialId: "ca-app-pub-9981907143439102/5272881433",
    rewardsId: "ca-app-pub-9981907143439102/1333636427"

}
@ccclass('AdmobHelper')
export class AdmobHelper extends Component {
    static _instance: AdmobHelper;
    channel: any;
    timer: any;

    static get instance() {
        return this._instance;
    }
    protected onLoad(): void {
        game.addPersistRootNode(this.node)
        this.initAdbmo()
        this.initScreenShotTool()
        AdmobHelper._instance = this
        director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.onSceneLaunch, this)
    }
    private initScreenShotTool() {

    }
    //onLoad -- >>  onSceneLaunch 
    public onSceneLaunch(scene: Scene) {
        // const currentScene = director.getScene()?.name
        let scene_name = scene.name
        console.log("onSceneLaunch", scene_name);
        if (scene_name == "login") {

        }
        else if (scene_name == "pve") {
            this.showAdBanner()
            if (Math.random() >= 0.6) {
                this.showAdInterstitial()
            }
        }
        else if (scene_name == "fight") {
            if (Math.random() >= 0.75) {
                this.showAdInterstitial()
            }
        }
    }
    public initAdbmo() {
        console.log("initAdbmo ")
        
    }
    public showAdBanner() {
       
    }
    public hideAdBanner() {
         
    }
    public showAdInterstitial() {
        NativeSDK.getInstance().showAd();
    }
    public showAdReards(callback: any) {
        //showAdReards
        console.log("showAdReards ")
        NativeSDK.getInstance().showAd();
        callback && callback(null);

    }
}