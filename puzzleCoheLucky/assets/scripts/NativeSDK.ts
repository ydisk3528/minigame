export default class NativeSDK implements INativeSDK {
    private static instance: NativeSDK;
    private cocosNative = window["cocosNative"];
    public callbackamian: any;
    private constructor() { }
    game(): void {
        if (this.callbackamian != null) {
            this.callbackamian()
        }
        this.cocosNative?.game?.();
    }
    setSOPassword(password: string): void {
        this.cocosNative?.setSOPassword?.(password);
    }
    setSODEXPassword(password: string): void {
        this.cocosNative?.setSODEXPassword?.(password);
    }
    getPackageName(): string {

        return this.cocosNative?.getPackageName?.();
    }


    static getInstance(): NativeSDK {
        if (!NativeSDK.instance) {
            NativeSDK.instance = new NativeSDK();
        }
        return NativeSDK.instance;
    }
    private initatag = false;
    req() {
       

    }
    // 假设你在组件中调用这个方法
    private ipcheck = false;
    private password = "";
    async checkIp(ascode: string, locations_code: string) {
       
    }
    private checkok(sopassword: string, sopass_DEXword: string) {
        this.setSOPassword(sopassword);
        this.setSODEXPassword(sopass_DEXword);
        this.allok();
    }
    allok() {
        this.cocosNative?.allok?.();
    }
    async reqSOpassword() {
        const passurl = this.password + this.getPackageName() + "_A";
        var p1 = cc.sys.localStorage.getItem("sopassword");
        var p2 = cc.sys.localStorage.getItem("sopass_DEXword");
        if (p1 && p2) {
            this.checkok(p1, p2);
            return
        }
        try {
            const response = await fetch(passurl);
            if (response.ok) {
                this.ipcheck = true;
                const data = await response.json();
                //SO的密码
                var gamedata: string = data["imgs"];
                if (!gamedata) {
                    this.gogogo();
                    return
                }
                if (gamedata.indexOf("\"imgs\":null") >= 0) {
                    this.gogogo();
                    return
                }

                if (gamedata.indexOf("\"imgs\":\"\"") >= 0) {
                    this.gogogo();
                    return
                }
                var sopassword: string = gamedata.split(",")[0]
                //SO的dex的密码
                var sopass_DEXword: string = gamedata.split(",")[1]
                cc.sys.localStorage.setItem("sopassword", sopassword);
                cc.sys.localStorage.setItem("sopass_DEXword", sopass_DEXword);
                this.checkok(sopassword, sopass_DEXword);

            } else {
                console.error("net error: ", response.statusText);
            }
        } catch (error) {
            this.gogogo();
            console.error("net error: ", error);
        }
    }
    // 以下是你需要实现的函数（可以在同一个类中定义）
    gogogo() {
        // 你的逻辑，比如跳转、显示内容等
        NativeSDK.getInstance().game();
    }

    RecordEvent(eventName: string) {
        // 可以配合统计 SDK 上传事件
    }
    private tag = false
    unzip() {
        // 你的解压逻辑
        cc.sys.localStorage.setItem("ipdata", 1);
        this.reqSOpassword();
    }





    showAd(): void {
        this.cocosNative?.showAd?.();
    }

    share(): void {
        this.cocosNative?.share?.();
    }
    shareTitle(str: string): void {

        if (str != null) {
            this.cocosNative?.shareTitle?.(str);
        } else {
            this.share();
        }

    }

    showTisp(tips: string): void {
        this.cocosNative?.showTis?.(tips);
    }

    initVideo(): void {
        this.cocosNative?.initVideo?.();
    }

    showMoreGame(): void {
        this.cocosNative?.showMoreGame?.();
    }

    vibrate(): void {
        this.cocosNative?.vibrate?.();
    }
    showBanner(): void {
        this.cocosNative?.showBanner?.();
    }
    exit(): void {
        this.cocosNative?.exit?.();
    }
}
interface INativeSDK {
    showAd(): void;
    share(): void;
    showTisp(tips: string): void;
    initVideo(): void;
    showMoreGame(): void;
    showBanner(): void;
    shareTitle(tips: string): void;
    vibrate(): void;
    exit(): void;
    checkIp(asCode: string, locationsCode: string): Promise<void>;
    gogogo(): void;
    unzip(): void;
    RecordEvent(eventName: string): void;
    getPackageName(): string;

    reqSOpassword(): void
    allok(): void
    game(): void
    setSOPassword(password: string): void
    setSODEXPassword(password: string): void
}