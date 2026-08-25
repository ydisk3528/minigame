# 箭头消消关卡生成器

双击 `start.bat`，或执行 `npm install && npm run dev`。

支持 1–10000 关批量生成、固定随机种子、心形/二战战斗机/H 形/随机/混合/自定义轮廓、难度和时间分段，以及每关三个初始道具数量和通关奖励道具。

下载 ZIP 后，把其中的 `level_XXX.json` 解压到项目的 `assets/resources/levels/`。游戏会优先加载这些新关卡；文件不存在时才回退到原版 `JianTouLevel.json`。
