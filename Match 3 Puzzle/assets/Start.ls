{
  "_$ver": 1,
  "_$id": "startscene01",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "StartScene",
  "width": 1080,
  "height": 1920,
  "_$comp": [
    {
      "_$type": "4c2fd2a2-b886-41a0-8f8f-21925821fa7c",
      "scriptPath": "../src/game/ThemeSelector.ts",
      "theme": "mahjong"
    }
  ],
  "_$child": [
    {
      "_$id": "startbg01",
      "_$type": "GImage",
      "name": "Background",
      "width": 1080,
      "height": 1920,
      "src": "res://5536bfdb-a189-41a6-9ba9-f041ad55ab7c",
      "autoSize": false,
      "_$comp": [
        {
          "_$type": "96d5357c-4e16-4a5a-8163-a9f21c1d9704",
          "scriptPath": "../src/game/BackgroundAdapter.ts"
        }
      ]
    },
    {
      "_$id": "starttitle01",
      "_$type": "GTextField",
      "name": "Title",
      "x": 90,
      "y": 260,
      "width": 900,
      "height": 180,
      "text": "",
      "fontSize": 76,
      "color": "#FFFFFF",
      "bold": true,
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "stroke": 7,
      "strokeColor": "#4C2B88"
    },
    {
      "_$id": "startsub01",
      "_$type": "GTextField",
      "name": "Subtitle",
      "x": 140,
      "y": 470,
      "width": 800,
      "height": 100,
      "text": "",
      "fontSize": 30,
      "color": "#CDEBFF",
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "stroke": 3,
      "strokeColor": "#171448"
    },
    {
      "_$id": "playbutton01",
      "_$type": "Sprite",
      "name": "PlayButton",
      "x": 220,
      "y": 1250,
      "width": 640,
      "height": 220,
      "_$child": [
        {
          "_$id": "playimage01",
          "_$type": "GImage",
          "name": "ButtonImage",
          "width": 640,
          "height": 220,
          "src": "res://7cc468e7-e519-447c-811b-b7159288160e",
          "autoSize": false
        },
        {
          "_$id": "playlabel01",
          "_$type": "GTextField",
          "name": "ButtonLabel",
          "x": 60,
          "y": 55,
          "width": 520,
          "height": 100,
          "text": "PLAY",
          "fontSize": 54,
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
      "_$id": "592qmyec",
      "_$type": "SoundNode",
      "name": "Sound",
      "x": 496,
      "y": 1291,
      "width": 100,
      "height": 100,
      "source": "res://03402a39-12db-433a-bc21-28f5e26bdf95",
      "isMusic": true,
      "autoPlay": true
    },
    {
      "_$id": "3fgy08h9",
      "_$type": "Sprite",
      "name": "SpotLight",
      "x": 546,
      "y": 2071,
      "width": 0,
      "height": 0,
      "_$comp": [
        {
          "_$type": "SpotLight2D",
          "color": {
            "_$type": "Color"
          },
          "intensity": 0.94,
          "layerMask": 1,
          "shadowEnable": true,
          "shadowStrength": 0.5,
          "shadowColor": {
            "_$type": "Color",
            "r": 0,
            "g": 0,
            "b": 0
          },
          "shadowLayerMask": 1,
          "shadowFilterSmooth": 1,
          "innerRadius": 127,
          "outerRadius": 631,
          "innerAngle": 110,
          "outerAngle": 132,
          "falloffIntensity": 1
        }
      ]
    },
    {
      "_$id": "wan7lozr",
      "_$type": "Sprite",
      "name": "FreeformLight",
      "x": 199,
      "y": 180,
      "width": 0,
      "height": 0,
      "_$comp": [
        {
          "_$type": "FreeformLight2D",
          "color": {
            "_$type": "Color"
          },
          "intensity": 0.7,
          "layerMask": 1,
          "shadowStrength": 0.5,
          "shadowColor": {
            "_$type": "Color",
            "r": 0,
            "g": 0,
            "b": 0
          },
          "shadowLayerMask": 1,
          "shadowFilterSmooth": 1,
          "falloffRange": 1,
          "polygonPoint": {
            "_$type": "PolygonPoint2D",
            "points": [
              1,
              -7,
              729,
              -60,
              951,
              1326,
              -325,
              552
            ]
          }
        },
        {
          "_$type": "Animator2D",
          "controller": {
            "_$uuid": "490b9bc3-212b-4b59-b948-b556da2cf3f3",
            "_$type": "AnimationController2D"
          },
          "controllerLayers": [
            {
              "_$type": "AnimatorControllerLayer2D",
              "name": "Base Layer",
              "states": [
                {
                  "_$type": "AnimatorState2D",
                  "name": "NewAnimation",
                  "clipStart": 0,
                  "clip": {
                    "_$uuid": "28b4fd6d-d7d7-4057-a68b-b9456e457098",
                    "_$type": "AnimationClip2D"
                  },
                  "soloTransitions": []
                }
              ],
              "defaultStateName": "NewAnimation"
            }
          ]
        }
      ]
    }
  ]
}