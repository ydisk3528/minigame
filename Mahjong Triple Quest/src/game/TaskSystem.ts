import { MahjongSave, SaveData } from "./MahjongSave";

export type TaskType = "complete_levels" | "earn_stars" | "matches" | "best_combo" | "use_prop";
export interface TaskDefinition { id: string; titleZh: string; titleEn: string; type: TaskType; prop?: keyof SaveData["props"]; target: number; reward: number; rewardDecoration?: string; day?: number; }
interface TaskConfig { daily: TaskDefinition[]; achievements: TaskDefinition[]; }

export class TaskSystem {
    private static config: TaskConfig = { daily: [], achievements: [] };
    public static async initialize(): Promise<void> {
        const resource = await Laya.loader.load("resources/config/tasks.json", Laya.Loader.JSON) as Laya.TextResource;
        const data = resource.data as TaskConfig;
        this.config = { daily: this.valid(data.daily), achievements: this.valid(data.achievements) };
    }
    public static tasks(daily: boolean): readonly TaskDefinition[] { if (!daily) return this.config.achievements; const day = ((new Date().getDay() + 6) % 7) + 1; return this.config.daily.filter(task => !task.day || task.day === day); }
    public static progress(task: TaskDefinition, daily: boolean): number { return Math.min(task.target, MahjongSave.taskProgress(task.type, task.prop, daily)); }
    public static claimed(task: TaskDefinition, daily: boolean): boolean { return MahjongSave.taskClaimed(task.id, daily); }
    public static claim(task: TaskDefinition, daily: boolean): boolean {
        const claimed = this.progress(task, daily) >= task.target && MahjongSave.claimTask(task.id, task.reward, daily);
        if (claimed && task.rewardDecoration) MahjongSave.grantTheme(task.rewardDecoration);
        return claimed;
    }
    private static valid(items: TaskDefinition[] | undefined): TaskDefinition[] {
        const types: TaskType[] = ["complete_levels", "earn_stars", "matches", "best_combo", "use_prop"];
        return (items ?? []).filter(item => !!item.id && types.includes(item.type) && Number(item.target) > 0 && Number(item.reward) >= 0);
    }
}
