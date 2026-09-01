{
  "_$ver": 1,
  "_$id": "level-root",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "LevelScene",
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
      "_$id": "level-bgm",
      "_$type": "SoundNode",
      "name": "LevelBgm",
      "source": "res://9f20100c-a111-4b11-8111-00000000000c",
      "isMusic": true,
      "loop": 0,
      "autoPlay": true
    },
    {
      "_$id": "level-click",
      "_$type": "SoundNode",
      "name": "ButtonClick",
      "source": "res://9f20100a-a111-4b11-8111-00000000000a",
      "isMusic": false,
      "loop": 1,
      "autoPlay": false
    },
    {
      "_$id": "level-root-content",
      "_$type": "GBox",
      "name": "ContentRoot",
      "width": 750,
      "height": 1334,
      "relations": [
        {
          "_$type": "Relation",
          "target": {
            "_$ref": "level-root"
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
          "_$id": "back",
          "_$type": "Sprite",
          "name": "BackButton",
          "x": 34,
          "y": 34,
          "width": 104,
          "height": 104,
          "_$child": [
            {
              "_$id": "backi",
              "_$type": "GImage",
              "name": "ButtonImage",
              "x": 0,
              "y": 0,
              "width": 104,
              "height": 104,
              "src": "res://f1d4595f-5ec4-4622-bd6a-ec9528625754",
              "autoSize": false
            },
            {
              "_$id": "backt",
              "_$type": "GTextField",
              "name": "Label",
              "x": 0,
              "y": 0,
              "width": 104,
              "height": 96,
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
          "_$id": "title",
          "_$type": "GTextField",
          "name": "Title",
          "x": 150,
          "y": 46,
          "width": 450,
          "height": 70,
          "text": "SELECT LEVEL",
          "fontSize": 40,
          "color": "#345D4D",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "panel",
          "_$type": "GImage",
          "name": "ListPanel",
          "x": 35,
          "y": 155,
          "width": 680,
          "height": 970,
          "src": "res://b4cd53be-76ca-45aa-9e80-455b6c6c12cf",
          "autoSize": false
        },
        {
          "_$id": "list",
          "_$type": "GList",
          "name": "LevelList",
          "x": 78,
          "y": 210,
          "width": 594,
          "height": 810,
          "clipping": true
        },
        {
          "_$id": "level-count",
          "_$type": "GTextField",
          "name": "LevelCountText",
          "x": 185,
          "y": 1040,
          "width": 380,
          "height": 42,
          "text": "20 LEVELS · SWIPE TO SCROLL",
          "fontSize": 19,
          "color": "#496958",
          "bold": true,
          "align": "center",
          "valign": "middle"
        },
        {
          "_$id": "tip",
          "_$type": "GTextField",
          "name": "Tip",
          "x": 75,
          "y": 1125,
          "width": 600,
          "height": 44,
          "text": "CLEAR THIS LEVEL TO UNLOCK THE NEXT",
          "fontSize": 19,
          "color": "#71887A",
          "bold": false,
          "align": "center",
          "valign": "middle"
        }
      ]
    }
  ]
}
