{
  "_$ver": 1,
  "_$id": "lx8mwule",
  "_$type": "Scene",
  "left": 0,
  "right": 0,
  "top": 0,
  "bottom": 0,
  "name": "GameScene",
  "width": 1080,
  "height": 1920,
  "_$child": [
    {
      "_$id": "gamebg01",
      "_$type": "GImage",
      "name": "Background",
      "width": 1080,
      "height": 1920,
      "src": "res://5536bfdb-a189-41a6-9ba9-f041ad55ab7c",
      "autoSize": false,
      "color": "#FFFFFF",
      "_$comp": [
        {
          "_$type": "96d5357c-4e16-4a5a-8163-a9f21c1d9704",
          "scriptPath": "../src/game/BackgroundAdapter.ts"
        }
      ]
    },
    {
      "_$id": "title001",
      "_$type": "GTextField",
      "name": "TitleText",
      "active": false,
      "x": 90,
      "y": 88,
      "width": 900,
      "height": 84,
      "text": "",
      "fontSize": 58,
      "color": "#E9E5D6",
      "bold": true,
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "strokeColor": "#3D200F"
    },
    {
      "_$id": "hudpanel01",
      "_$type": "GImage",
      "name": "HudPanel",
      "x": 44,
      "y": 128,
      "width": 992,
      "height": 249,
      "src": "res://5c34add3-862a-474e-ae8d-bf5a60d70247",
      "autoSize": false
    },
    {
      "_$id": "hudlevel",
      "_$type": "GTextField",
      "name": "LevelText",
      "x": 60,
      "y": 84,
      "width": 540,
      "height": 64,
      "text": "LEVEL 1",
      "fontSize": 36,
      "color": "#E9E5D6",
      "bold": true,
      "valign": "middle",
      "letterSpacing": 0,
      "strokeColor": "#3D200F"
    },
    {
      "_$id": "hudscore",
      "_$type": "GTextField",
      "name": "ScoreText",
      "x": 76,
      "y": 219,
      "width": 440,
      "height": 72,
      "text": "SCORE 0",
      "fontSize": 34,
      "color": "#E9E5D6",
      "bold": true,
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "strokeColor": "#3D200F"
    },
    {
      "_$id": "hudmoves",
      "_$type": "GTextField",
      "name": "MovesText",
      "x": 564,
      "y": 219,
      "width": 440,
      "height": 72,
      "text": "MOVES 25",
      "fontSize": 34,
      "color": "#E9E5D6",
      "bold": true,
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "strokeColor": "#3D200F"
    },
    {
      "_$id": "hudgoal",
      "_$type": "GPanel",
      "name": "GoalRoot",
      "x": 60,
      "y": 380,
      "width": 960,
      "height": 110
    },
    {
      "_$id": "boardslots01",
      "_$type": "Sprite",
      "name": "BoardSlotLayer",
      "x": 60,
      "y": 530,
      "width": 960,
      "height": 960,
      "_mouseState": 1
    },
    {
      "_$id": "gems0001",
      "_$type": "Sprite",
      "name": "GemLayer",
      "x": 60,
      "y": 530,
      "width": 960,
      "height": 960
    },
    {
      "_$id": "effects001",
      "_$type": "Sprite",
      "name": "EffectLayer",
      "x": 60,
      "y": 530,
      "width": 960,
      "height": 960,
      "_mouseState": 1,
      "mouseThrough": true
    },
    {
      "_$id": "gameaudioroot",
      "_$type": "Sprite",
      "name": "AudioRoot",
      "width": 0,
      "height": 0,
      "_mouseState": 1,
      "_$child": [
        {
          "_$id": "audiobgm01",
          "_$type": "SoundNode",
          "name": "Bgm",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1001-7a11-4c31-9111-000000000001",
          "isMusic": true,
          "loop": 0
        },
        {
          "_$id": "audioselect01",
          "_$type": "SoundNode",
          "name": "Select",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1002-7a11-4c31-9111-000000000002"
        },
        {
          "_$id": "audiomatch01",
          "_$type": "SoundNode",
          "name": "Match",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1003-7a11-4c31-9111-000000000003"
        },
        {
          "_$id": "audiorocket01",
          "_$type": "SoundNode",
          "name": "Rocket",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1004-7a11-4c31-9111-000000000004"
        },
        {
          "_$id": "audiobomb01",
          "_$type": "SoundNode",
          "name": "Bomb",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1005-7a11-4c31-9111-000000000005"
        },
        {
          "_$id": "audiogood01",
          "_$type": "SoundNode",
          "name": "ComboGood",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1006-7a11-4c31-9111-000000000006"
        },
        {
          "_$id": "audiogreat01",
          "_$type": "SoundNode",
          "name": "ComboGreat",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1007-7a11-4c31-9111-000000000007"
        },
        {
          "_$id": "audioamazing01",
          "_$type": "SoundNode",
          "name": "ComboAmazing",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1008-7a11-4c31-9111-000000000008"
        },
        {
          "_$id": "audiowin01",
          "_$type": "SoundNode",
          "name": "Win",
          "width": 0,
          "height": 0,
          "source": "res://8a1c1009-7a11-4c31-9111-000000000009"
        },
        {
          "_$id": "audiowinshatter01",
          "_$type": "SoundNode",
          "name": "WinShatter",
          "width": 0,
          "height": 0,
          "source": "res://bdf4af8b-598e-4f48-bbcd-4da80094af4d"
        }
      ]
    },
    {
      "_$id": "propbar01",
      "_$type": "Sprite",
      "name": "PropBar",
      "y": 1650,
      "width": 1080,
      "height": 180
    },
    {
      "_$id": "status01",
      "_$type": "GTextField",
      "name": "StatusText",
      "x": 70,
      "y": 1530,
      "width": 940,
      "height": 52,
      "text": "STARTING...",
      "fontSize": 26,
      "color": "#E9E5D6",
      "align": "center",
      "valign": "middle",
      "letterSpacing": 0,
      "strokeColor": "#3D200F"
    },
    {
      "_$id": "templeGoalsLabel",
      "_$type": "GTextField",
      "name": "GoalsLabel",
      "x": 96,
      "y": 364,
      "width": 400,
      "height": 42,
      "text": "GOALS",
      "fontSize": 25,
      "color": "#C8C8B7",
      "letterSpacing": 2
    }
  ]
}