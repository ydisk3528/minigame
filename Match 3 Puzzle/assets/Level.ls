{
  "_$ver": 1,
  "_$id": "levelscene01",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "LevelScene",
  "width": 1080,
  "height": 1920,
  "_$child": [
    {
      "_$id": "levelbg01",
      "_$type": "GImage",
      "name": "Background",
      "width": 1080,
      "height": 1920,
      "autoSize": false,
      "_$comp": [
        {
          "_$type": "96d5357c-4e16-4a5a-8163-a9f21c1d9704",
          "scriptPath": "../src/game/BackgroundAdapter.ts"
        }
      ]
    },
    {
      "_$id": "leveltitle01",
      "_$type": "GTextField",
      "name": "Title",
      "x": 90,
      "y": 100,
      "width": 900,
      "height": 120,
      "text": "SELECT LEVEL",
      "fontSize": 58,
      "color": "#FFFFFF",
      "bold": true,
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "stroke": 6,
      "strokeColor": "#4C2B88"
    },
    {
      "_$id": "levelcount01",
      "_$type": "GTextField",
      "name": "LevelCountText",
      "x": 120,
      "y": 235,
      "width": 840,
      "height": 55,
      "text": "100 LEVELS · SWIPE TO BROWSE",
      "fontSize": 24,
      "color": "#D6F7D1",
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "stroke": 3,
      "strokeColor": "#173E31"
    },
    {
      "_$id": "levelviewport01",
      "_$type": "Sprite",
      "name": "LevelViewport",
      "x": 120,
      "y": 310,
      "width": 840,
      "height": 1120
    },
    {
      "_$id": "backbutton01",
      "_$type": "Sprite",
      "name": "BackButton",
      "x": 270,
      "y": 1600,
      "width": 540,
      "height": 180,
      "_$child": [
        {
          "_$id": "backimage01",
          "_$type": "GImage",
          "name": "ButtonImage",
          "width": 540,
          "height": 180,
          "src": "res://7cc468e7-e519-447c-811b-b7159288160e",
          "autoSize": false
        },
        {
          "_$id": "backlabel01",
          "_$type": "GTextField",
          "name": "ButtonLabel",
          "x": 40,
          "y": 42,
          "width": 460,
          "height": 90,
          "text": "BACK",
          "fontSize": 42,
          "color": "#FFFFFF",
          "bold": true,
          "align": "center",
          "valign": "middle",
          "letterSpacing": 0,
          "stroke": 5,
          "strokeColor": "#3A237D"
        }
      ]
    },
    {
      "_$id": "yu59dle3",
      "_$type": "SoundNode",
      "name": "Sound",
      "x": 496,
      "y": 1290,
      "width": 100,
      "height": 100,
      "source": "res://03402a39-12db-433a-bc21-28f5e26bdf95",
      "isMusic": true,
      "autoPlay": true
    }
  ]
}
