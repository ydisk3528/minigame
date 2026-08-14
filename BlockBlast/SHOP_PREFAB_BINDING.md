# 商店预制体绑定说明

## 1. 商品预制体

打开：`assets/resources/prefabs/ui/ShopItem.prefab`

在根节点下面拼一次商品 UI，然后把根节点 `ShopItem` 组件的属性拖好：

| 属性 | 拖入内容 |
|---|---|
| Icon | 商品图标 Sprite |
| Title Label | 商品名 Label |
| Description Label | 商品描述 Label |
| Price Label | 价格 Label |
| State Label | `OWNED 2` / `ACTIVE 09:59` 状态 Label，可留空 |
| Buy Button | 购买按钮 Button |
| Active Mark | Buff 生效标记节点，可留空 |

商品项会根据配置动态生成。商品名称、说明、价格和图标都会覆盖编辑器中的占位内容。

## 2. 商店面板预制体

打开：`assets/resources/prefabs/ui/ShopPanel.prefab`

在 `Panel` 内拼商店界面。商品列表容器使用现有的 `ItemsContainer`，可以在该节点上添加 `Layout`、`ScrollView` 等组件。

根节点 `ShopManager` 组件：

| 属性 | 拖入内容 |
|---|---|
| Panel Node | 商店主体面板节点（已预绑） |
| Balance Label | 商店内金币余额 Label |
| Message Label | 购买结果提示 Label，可留空 |
| Close Button | 关闭按钮 Button |
| Items Container | 动态商品的父节点（已预绑） |
| Item Prefab | `ShopItem.prefab`（已预绑） |
| Config Path | 默认 `config`，读取 `resources/config.json` |
| Luck/Gift Indicator | 主界面 Buff 状态引用，可留空 |

## 3. 商品配置

配置位置：`assets/resources/config.json` 中的 `shop.products`。

字段：

- `id`：商品唯一 ID。
- `kind`：`booster` 或 `buff`。
- `storageKey`：当前支持 `bomb`、`hammer`、`rainbow`、`luck`、`freeGift`。
- `title`、`description`、`price`：显示和购买数据。
- `iconPath`：相对 `resources` 的 SpriteFrame 路径。
- `order`：显示顺序，小的在前。
- `enabled`：设为 `false` 时不生成。

`Game.scene` 的 `GameUI > Shop Panel Prefab` 已绑定商店面板。商店按钮会自动打开，无需配置 Button ClickEvents。
