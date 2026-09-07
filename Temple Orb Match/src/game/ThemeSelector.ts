import { ThemeConfig } from "./ThemeConfig";

const { regClass, property } = Laya;

/** Attach to StartScene and select the gem/background theme for this build. */
@regClass()
export class ThemeSelector extends Laya.Script {
    @property({ type: String, enumSource: ["default", "mahjong"] })
    public theme = "default";

    public onAwake(): void {
        ThemeConfig.setTheme(this.theme);
    }
}
