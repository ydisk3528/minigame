{
  "_$ver": 1,
  "_$id": "game-root",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "GameScene",
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
      "_$id": "game-bgm",
      "_$type": "SoundNode",
      "name": "GameBgm",
      "source": "res://9f201006-a111-4b11-8111-000000000006",
      "isMusic": true,
      "loop": 0,
      "autoPlay": true
    },
    {
      "_$id": "game-button-click",
      "_$type": "SoundNode",
      "name": "ButtonClick",
      "source": "res://9f20100a-a111-4b11-8111-00000000000a",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-tile-click",
      "_$type": "SoundNode",
      "name": "TileClick",
      "source": "res://9f201002-a111-4b11-8111-000000000002",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-undo",
      "_$type": "SoundNode",
      "name": "Undo",
      "source": "res://9f201001-a111-4b11-8111-000000000001",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-hint",
      "_$type": "SoundNode",
      "name": "Hint",
      "source": "res://9f201007-a111-4b11-8111-000000000007",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-shuffle",
      "_$type": "SoundNode",
      "name": "Shuffle",
      "source": "res://9f201008-a111-4b11-8111-000000000008",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-move-out",
      "_$type": "SoundNode",
      "name": "MoveOut",
      "source": "res://9f201009-a111-4b11-8111-000000000009",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-freeze",
      "_$type": "SoundNode",
      "name": "Freeze",
      "source": "res://aa4f01c0-1003-4003-8003-000000000003",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-coin-reward",
      "_$type": "SoundNode",
      "name": "CoinReward",
      "source": "res://9f201003-a111-4b11-8111-000000000003",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-victory",
      "_$type": "SoundNode",
      "name": "Victory",
      "source": "res://9f201004-a111-4b11-8111-000000000004",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-failure",
      "_$type": "SoundNode",
      "name": "Failure",
      "source": "res://9f201005-a111-4b11-8111-000000000005",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "game-root-content",
      "_$type": "GBox",
      "name": "ContentRoot",
      "width": 750,
      "height": 1334,
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "game-root"
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
          "_$id": "home",
          "_$type": "Sprite",
          "name": "HomeButton",
          "x": 24,
          "y": 22,
          "width": 88,
          "height": 88,
          "_$child": [
            {
              "_$id": "homei",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 88,
              "height": 88,
              "src": "res://f1d4595f-5ec4-4622-bd6a-ec9528625754",
              "autoSize": false
            },
            {
              "_$id": "homet",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 88,
              "height": 80,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "restart",
          "_$type": "Sprite",
          "name": "RestartButton",
          "x": 638,
          "y": 22,
          "width": 88,
          "height": 88,
          "_$child": [
            {
              "_$id": "restarti",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 88,
              "height": 88,
              "src": "res://a77394ad-c339-473b-bd32-4863d6250c10",
              "autoSize": false
            },
            {
              "_$id": "restartt",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 88,
              "height": 80,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "level-chip",
          "_$type": "GImage",
          "name": "LevelChip",
          "x": 120,
          "y": 30,
          "width": 175,
          "height": 76,
          "src": "res://e44fdeb6-c4f6-46ea-8644-35b14259aeb8",
          "autoSize": false
        },
        {
          "_$id": "level-text",
          "_$type": "GTextField",
          "name": "LevelText",
          "x": 120,
          "y": 32,
          "width": 175,
          "height": 64,
          "text": "LEVEL 1",
          "fontSize": 22,
          "color": "#456856",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "limit-chip",
          "_$type": "GImage",
          "name": "LimitChip",
          "x": 305,
          "y": 30,
          "width": 140,
          "height": 76,
          "src": "res://e44fdeb6-c4f6-46ea-8644-35b14259aeb8",
          "autoSize": false
        },
        {
          "_$id": "limit-text",
          "_$type": "GTextField",
          "name": "LimitText",
          "x": 305,
          "y": 32,
          "width": 140,
          "height": 64,
          "text": "TIME 3:00",
          "fontSize": 20,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "score-chip",
          "_$type": "GImage",
          "name": "ScoreChip",
          "x": 455,
          "y": 30,
          "width": 175,
          "height": 76,
          "src": "res://e44fdeb6-c4f6-46ea-8644-35b14259aeb8",
          "autoSize": false
        },
        {
          "_$id": "score-label",
          "_$type": "GTextField",
          "name": "ScoreLabel",
          "x": 460,
          "y": 37,
          "width": 55,
          "height": 50,
          "text": "SCORE",
          "fontSize": 15,
          "color": "#71887A",
          "bold": false,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "score-text",
          "_$type": "GTextField",
          "name": "ScoreText",
          "x": 515,
          "y": 34,
          "width": 100,
          "height": 56,
          "text": "0",
          "fontSize": 24,
          "color": "#456856",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "board",
          "_$type": "Sprite",
          "name": "BoardLayer",
          "x": 0,
          "y": 0,
          "width": 750,
          "height": 850,
          "_$child": []
        },
        {
          "_$id": "effects",
          "_$type": "Sprite",
          "name": "EffectLayer",
          "x": 0,
          "y": 0,
          "width": 750,
          "height": 850,
          "_$child": [
            {
              "_$id": "merge-template",
              "_$type": "Sprite",
              "name": "MergeEffectTemplate",
              "x": 0,
              "y": 0,
              "width": 240,
              "height": 240,
              "_$child": [
                {
                  "_$id": "merge-template-0",
                  "_$type": "GImage",
                  "name": "Spark1",
                  "x": 20,
                  "y": 102,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-1",
                  "_$type": "GImage",
                  "name": "Spark2",
                  "x": 42,
                  "y": 42,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-2",
                  "_$type": "GImage",
                  "name": "Spark3",
                  "x": 102,
                  "y": 16,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-3",
                  "_$type": "GImage",
                  "name": "Spark4",
                  "x": 162,
                  "y": 42,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-4",
                  "_$type": "GImage",
                  "name": "Spark5",
                  "x": 184,
                  "y": 102,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-5",
                  "_$type": "GImage",
                  "name": "Spark6",
                  "x": 162,
                  "y": 162,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-6",
                  "_$type": "GImage",
                  "name": "Spark7",
                  "x": 102,
                  "y": 188,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-7",
                  "_$type": "GImage",
                  "name": "Spark8",
                  "x": 42,
                  "y": 162,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-8",
                  "_$type": "GImage",
                  "name": "Spark9",
                  "x": 60,
                  "y": 84,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-9",
                  "_$type": "GImage",
                  "name": "Spark10",
                  "x": 144,
                  "y": 84,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-10",
                  "_$type": "GImage",
                  "name": "Spark11",
                  "x": 144,
                  "y": 140,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                },
                {
                  "_$id": "merge-template-11",
                  "_$type": "GImage",
                  "name": "Spark12",
                  "x": 60,
                  "y": 140,
                  "width": 36,
                  "height": 36,
                  "src": "res://aa300001-b222-4c22-8222-000000000001",
                  "autoSize": false
                }
              ],
              "visible": false
            }
          ]
        },
        {
          "_$id": "status",
          "_$type": "GTextField",
          "name": "StatusText",
          "x": 125,
          "y": 720,
          "width": 500,
          "height": 90,
          "text": "",
          "fontSize": 42,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "extra",
          "_$type": "Sprite",
          "name": "ExtraLayer",
          "x": 180,
          "y": 806,
          "width": 300,
          "height": 96,
          "_$child": []
        },
        {
          "_$id": "tray-panel",
          "_$type": "GImage",
          "name": "TrayPanel",
          "x": 35,
          "y": 900,
          "width": 680,
          "height": 150,
          "src": "res://e94d7915-732b-4325-baab-ee9fc5db3d85",
          "autoSize": false
        },
        {
          "_$id": "slot-bg",
          "_$type": "Sprite",
          "name": "SlotBackplates",
          "x": 67,
          "y": 920,
          "width": 616,
          "height": 108,
          "_$child": []
        },
        {
          "_$id": "slot",
          "_$type": "Sprite",
          "name": "SlotLayer",
          "x": 67,
          "y": 920,
          "width": 616,
          "height": 108,
          "_$child": []
        },
        {
          "_$id": "freeze-overlay",
          "_$type": "GImage",
          "name": "FreezeOverlay",
          "x": -18,
          "y": -26,
          "width": 786,
          "height": 1386,
          "src": "res://aa4f01c0-1001-4001-8001-000000000001",
          "autoSize": false,
          "visible": false,
          "mouseEnabled": false,
          "mouseThrough": true
        },
        {
          "_$id": "undo-button",
          "_$type": "Sprite",
          "name": "UndoButton",
          "x": 47,
          "y": 1105,
          "width": 92,
          "height": 92,
          "_$child": [
            {
              "_$id": "undo-buttoni",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 92,
              "src": "res://16a009d9-1f7f-4f62-a1a2-c7500de85fc9",
              "autoSize": false
            },
            {
              "_$id": "undo-buttont",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 84,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "undo-label",
          "_$type": "GTextField",
          "name": "UndoLabel",
          "x": 38,
          "y": 1193,
          "width": 110,
          "height": 30,
          "text": "UNDO",
          "fontSize": 15,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "undo-count",
          "_$type": "GTextField",
          "name": "UndoCount",
          "x": 106,
          "y": 1095,
          "width": 42,
          "height": 32,
          "text": "×3",
          "fontSize": 16,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "undo-ad",
          "_$type": "GImage",
          "name": "UndoAdIcon",
          "x": 106,
          "y": 1097,
          "width": 36,
          "height": 36,
          "src": "res://aa300003-b222-4c22-8222-000000000003",
          "autoSize": false,
          "visible": false
        },
        {
          "_$id": "shuffle-button",
          "_$type": "Sprite",
          "name": "ShuffleButton",
          "x": 179,
          "y": 1105,
          "width": 92,
          "height": 92,
          "_$child": [
            {
              "_$id": "shuffle-buttoni",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 92,
              "src": "res://52badd95-8edd-4f9d-8aa2-7633bcf1b1c9",
              "autoSize": false
            },
            {
              "_$id": "shuffle-buttont",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 84,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "shuffle-label",
          "_$type": "GTextField",
          "name": "ShuffleLabel",
          "x": 170,
          "y": 1193,
          "width": 110,
          "height": 30,
          "text": "SHUFFLE",
          "fontSize": 15,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "shuffle-count",
          "_$type": "GTextField",
          "name": "ShuffleCount",
          "x": 238,
          "y": 1095,
          "width": 42,
          "height": 32,
          "text": "×3",
          "fontSize": 16,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "shuffle-ad",
          "_$type": "GImage",
          "name": "ShuffleAdIcon",
          "x": 238,
          "y": 1097,
          "width": 36,
          "height": 36,
          "src": "res://aa300003-b222-4c22-8222-000000000003",
          "autoSize": false,
          "visible": false
        },
        {
          "_$id": "move-button",
          "_$type": "Sprite",
          "name": "MoveButton",
          "x": 311,
          "y": 1105,
          "width": 92,
          "height": 92,
          "_$child": [
            {
              "_$id": "move-buttoni",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 92,
              "src": "res://86e9d779-ed2a-47f2-b3d4-a6f8a645dd03",
              "autoSize": false
            },
            {
              "_$id": "move-buttont",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 84,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "move-label",
          "_$type": "GTextField",
          "name": "MoveLabel",
          "x": 302,
          "y": 1193,
          "width": 110,
          "height": 30,
          "text": "MOVE OUT",
          "fontSize": 15,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "move-count",
          "_$type": "GTextField",
          "name": "MoveCount",
          "x": 370,
          "y": 1095,
          "width": 42,
          "height": 32,
          "text": "×3",
          "fontSize": 16,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "move-ad",
          "_$type": "GImage",
          "name": "MoveAdIcon",
          "x": 370,
          "y": 1097,
          "width": 36,
          "height": 36,
          "src": "res://aa300003-b222-4c22-8222-000000000003",
          "autoSize": false,
          "visible": false
        },
        {
          "_$id": "hint-button",
          "_$type": "Sprite",
          "name": "HintButton",
          "x": 443,
          "y": 1105,
          "width": 92,
          "height": 92,
          "_$child": [
            {
              "_$id": "hint-buttoni",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 92,
              "src": "res://325ea7b3-38b0-4a9c-8a23-c56652f3281e",
              "autoSize": false
            },
            {
              "_$id": "hint-buttont",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 84,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "hint-label",
          "_$type": "GTextField",
          "name": "HintLabel",
          "x": 434,
          "y": 1193,
          "width": 110,
          "height": 30,
          "text": "HINT",
          "fontSize": 15,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "hint-count",
          "_$type": "GTextField",
          "name": "HintCount",
          "x": 502,
          "y": 1095,
          "width": 42,
          "height": 32,
          "text": "×3",
          "fontSize": 16,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "hint-ad",
          "_$type": "GImage",
          "name": "HintAdIcon",
          "x": 502,
          "y": 1097,
          "width": 36,
          "height": 36,
          "src": "res://aa300003-b222-4c22-8222-000000000003",
          "autoSize": false,
          "visible": false
        },
        {
          "_$id": "freeze-button",
          "_$type": "Sprite",
          "name": "FreezeButton",
          "x": 575,
          "y": 1105,
          "width": 92,
          "height": 92,
          "_$child": [
            {
              "_$id": "freeze-buttoni",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 92,
              "src": "res://aa4f01c0-1002-4002-8002-000000000002",
              "autoSize": false
            },
            {
              "_$id": "freeze-buttont",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 92,
              "height": 84,
              "text": "",
              "fontSize": 1,
              "color": "#3F6555",
              "bold": true,
              "align": "center",
              "valign": "middle"
            }
          ]
        },
        {
          "_$id": "freeze-label",
          "_$type": "GTextField",
          "name": "FreezeLabel",
          "x": 566,
          "y": 1193,
          "width": 110,
          "height": 30,
          "text": "FREEZE",
          "fontSize": 15,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "freeze-count",
          "_$type": "GTextField",
          "name": "FreezeCount",
          "x": 634,
          "y": 1095,
          "width": 42,
          "height": 32,
          "text": "×3",
          "fontSize": 16,
          "color": "#A64B3F",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "freeze-ad",
          "_$type": "GImage",
          "name": "FreezeAdIcon",
          "x": 634,
          "y": 1097,
          "width": 36,
          "height": 36,
          "src": "res://aa300003-b222-4c22-8222-000000000003",
          "autoSize": false,
          "visible": false
        }
      ]
    }
  ]
}
