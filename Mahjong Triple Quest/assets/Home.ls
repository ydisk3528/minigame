{
  "_$ver": 1,
  "_$id": "home-root",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "HomeScene",
  "width": 750,
  "height": 1334,
  "_$child": [
    {
      "_$id": "bg",
      "_$type": "GImage",
      "name": "Background",
      "x": 0,
      "y": 0,
      "width": 750,
      "height": 1334,
      "src": "res://fe6bf0e3-8228-4700-9aba-8dd500606484",
      "autoSize": false,
      "_$comp": [
        {
          "_$type": "6362a082-575f-45b7-ae5e-3f8dad126985",
          "scriptPath": "../src/game/BackgroundAdapter.ts"
        }
      ]
    },
    {
      "_$id": "home-bgm",
      "_$type": "SoundNode",
      "name": "HomeBgm",
      "source": "res://9f20100b-a111-4b11-8111-00000000000b",
      "isMusic": true,
      "loop": 0,
      "autoPlay": true
    },
    {
      "_$id": "home-click",
      "_$type": "SoundNode",
      "name": "ButtonClick",
      "source": "res://9f20100a-a111-4b11-8111-00000000000a",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "home-coin-reward",
      "_$type": "SoundNode",
      "name": "CoinReward",
      "source": "res://9f201003-a111-4b11-8111-000000000003",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "home-root-content",
      "_$type": "GBox",
      "name": "ContentRoot",
      "width": 750,
      "height": 1334,
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "home-root"
          },
          "data": [
            6,
            0,
            13,
            0
          ]
        }
      ],
      "_$child": [
        {
          "_$id": "coin-chip",
          "_$type": "GImage",
          "name": "CoinChip",
          "x": 510,
          "y": 34,
          "width": 190,
          "height": 70,
          "src": "res://e44fdeb6-c4f6-46ea-8644-35b14259aeb8",
          "autoSize": false
        },
        {
          "_$id": "coin-icon",
          "_$type": "GImage",
          "name": "CoinIcon",
          "x": 530,
          "y": 43,
          "width": 52,
          "height": 52,
          "src": "res://8656b09e-9024-4155-bf89-dfd38f230338",
          "autoSize": false
        },
        {
          "_$id": "coin-text",
          "_$type": "GTextField",
          "name": "CoinText",
          "x": 578,
          "y": 42,
          "width": 100,
          "height": 48,
          "text": "0",
          "fontSize": 28,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "title-a",
          "_$type": "GTextField",
          "name": "TitleA",
          "x": 70,
          "y": 174,
          "width": 610,
          "height": 84,
          "text": "MAHJONG",
          "fontSize": 56,
          "color": "#345D4D",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "title-b",
          "_$type": "GTextField",
          "name": "TitleB",
          "x": 70,
          "y": 252,
          "width": 610,
          "height": 58,
          "text": "TRIPLE QUEST",
          "fontSize": 31,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "hero-panel",
          "_$type": "GImage",
          "name": "HeroPanel",
          "x": 95,
          "y": 350,
          "width": 560,
          "height": 292,
          "src": "res://e94d7915-732b-4325-baab-ee9fc5db3d85",
          "autoSize": false
        },
        {
          "_$id": "hero-caption",
          "_$type": "GTextField",
          "name": "HeroCaption",
          "x": 215,
          "y": 374,
          "width": 320,
          "height": 36,
          "text": "PICK · SLOT · MATCH",
          "fontSize": 20,
          "color": "#71887A",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "hero-1",
          "_$type": "Sprite",
          "name": "HeroTile1",
          "x": 204,
          "y": 438,
          "width": 105,
          "height": 139,
          "_$child": [
            {
              "_$id": "hero-1-base",
              "_$type": "GImage",
              "name": "Base",
              "x": 0,
              "y": 0,
              "width": 105,
              "height": 139,
              "src": "res://b5000001-1111-4111-8111-000000000001",
              "autoSize": false
            },
            {
              "_$id": "hero-1-face",
              "_$type": "GImage",
              "name": "Face",
              "x": 0,
              "y": 0,
              "width": 105,
              "height": 139,
              "src": "res://a1773e95-f617-465e-a2ce-12ed71d874f3",
              "autoSize": false
            }
          ]
        },
        {
          "_$id": "hero-2",
          "_$type": "Sprite",
          "name": "HeroTile2",
          "x": 323,
          "y": 414,
          "width": 105,
          "height": 139,
          "_$child": [
            {
              "_$id": "hero-2-base",
              "_$type": "GImage",
              "name": "Base",
              "x": 0,
              "y": 0,
              "width": 105,
              "height": 139,
              "src": "res://b5000001-1111-4111-8111-000000000001",
              "autoSize": false
            },
            {
              "_$id": "hero-2-face",
              "_$type": "GImage",
              "name": "Face",
              "x": 0,
              "y": 0,
              "width": 105,
              "height": 139,
              "src": "res://9bc4a408-239d-4c0e-b8f4-3d951f882cba",
              "autoSize": false
            }
          ]
        },
        {
          "_$id": "hero-3",
          "_$type": "Sprite",
          "name": "HeroTile3",
          "x": 442,
          "y": 438,
          "width": 105,
          "height": 139,
          "_$child": [
            {
              "_$id": "hero-3-base",
              "_$type": "GImage",
              "name": "Base",
              "x": 0,
              "y": 0,
              "width": 105,
              "height": 139,
              "src": "res://b5000001-1111-4111-8111-000000000001",
              "autoSize": false
            },
            {
              "_$id": "hero-3-face",
              "_$type": "GImage",
              "name": "Face",
              "x": 0,
              "y": 0,
              "width": 105,
              "height": 139,
              "src": "res://3fac357c-8e2b-473d-8259-f1f8369f0675",
              "autoSize": false
            }
          ]
        },
        {
          "_$id": "play",
          "_$type": "Sprite",
          "name": "PlayButton",
          "x": 165,
          "y": 700,
          "width": 420,
          "height": 126,
          "_$child": [
            {
              "_$id": "playi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 420,
              "height": 126,
              "src": "res://45e8bb45-9082-4a67-9af1-69fdddbae031",
              "autoSize": false
            },
            {
              "_$id": "playt",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 420,
              "height": 118,
              "text": "PLAY",
              "fontSize": 42,
              "color": "#FFF9E9",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "level",
          "_$type": "GTextField",
          "name": "LevelText",
          "x": 215,
          "y": 835,
          "width": 320,
          "height": 52,
          "text": "LEVEL 1",
          "fontSize": 28,
          "color": "#4D705F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "settings",
          "_$type": "Sprite",
          "name": "SettingsButton",
          "x": 45,
          "y": 960,
          "width": 200,
          "height": 92,
          "_$child": [
            {
              "_$id": "settingsi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 92,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "settingst",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 84,
              "text": "SETTINGS",
              "fontSize": 18,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "shop",
          "_$type": "Sprite",
          "name": "ShopButton",
          "x": 275,
          "y": 960,
          "width": 200,
          "height": 92,
          "_$child": [
            {
              "_$id": "shopi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 92,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "shopt",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 84,
              "text": "SHOP",
              "fontSize": 20,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "daily",
          "_$type": "Sprite",
          "name": "DailyButton",
          "x": 505,
          "y": 960,
          "width": 200,
          "height": 92,
          "_$child": [
            {
              "_$id": "dailyi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 92,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "dailyt",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 84,
              "text": "DAILY",
              "fontSize": 18,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "tasks",
          "_$type": "Sprite",
          "name": "TasksButton",
          "x": 45,
          "y": 1075,
          "width": 200,
          "height": 92,
          "_$child": [
            {
              "_$id": "tasksi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 92,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "taskst",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 84,
              "text": "TASKS",
              "fontSize": 18,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "challenge",
          "_$type": "Sprite",
          "name": "ChallengeButton",
          "x": 275,
          "y": 1075,
          "width": 200,
          "height": 92,
          "_$child": [
            {
              "_$id": "challengei",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 92,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "challenget",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 84,
              "text": "CHALLENGE",
              "fontSize": 16,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "themes",
          "_$type": "Sprite",
          "name": "ThemesButton",
          "x": 505,
          "y": 1075,
          "width": 200,
          "height": 92,
          "_$child": [
            {
              "_$id": "themesi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 92,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "themest",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 200,
              "height": 84,
              "text": "DECOR",
              "fontSize": 18,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "share",
          "_$type": "Sprite",
          "name": "ShareButton",
          "x": 545,
          "y": 1190,
          "width": 170,
          "height": 82,
          "_$child": [
            {
              "_$id": "sharei",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 170,
              "height": 82,
              "src": "res://dc3998cf-766e-493d-83c3-2a271bab9f07",
              "autoSize": false
            },
            {
              "_$id": "sharet",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 170,
              "height": 74,
              "text": "SHARE",
              "fontSize": 18,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "foot",
          "_$type": "GTextField",
          "name": "Footnote",
          "x": 100,
          "y": 1210,
          "width": 550,
          "height": 38,
          "text": "CLEAR EVERY MAHJONG STACK",
          "fontSize": 18,
          "color": "#71887A",
          "bold": false,
          "align": "center",
          "valign": "middle"
        }
      ]
    }
  ]
}
