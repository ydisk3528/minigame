"""Author editable Cocos prefabs with serialized artwork and controller bindings."""
import re,shutil
from editor import *
from recover import expand

def uid(s):return str(uuid.uuid5(uuid.NAMESPACE_URL,'bc100-local/'+s))
def comp(n,t):return next((c for c in n.get('_components',[]) if c and c.get('__type__')==t),None)
def add(p,n):p['_children'].append(n);n['_parent']=p;return n
def find(n,name):return next(x for x in walk(n) if x.get('_name')==name)
def pos(n,x,y):n['_lpos']={'__type__':'cc.Vec3','x':x,'y':y,'z':0}
report=json.loads((PROJECT/'tools/recovery-report.json').read_bytes())
sprites={s['name']:s['uuid'] for s in report['sprites']}
def sf(name):return {'__uuid__':sprites[name],'__expectedType__':'cc.SpriteFrame'}
def sprite(n,name):
 c={'__type__':'cc.Sprite','node':n,'_spriteFrame':sf(name),'_sizeMode':0,'_color':{'__type__':'cc.Color','r':255,'g':255,'b':255,'a':255}};n['_components'].append(c);return c
def picture(p,name,art,x,y,w,h):
 n=add(p,node(name,x,y,w,h));sprite(n,art);return n
def text(p,name,value,x,y,w=180,h=34,size=22):
 n=add(p,node(name,x,y,w,h));n['_components'].append({'__type__':'cc.Label','node':n,'_string':value,'_fontSize':size,'_lineHeight':size+5,'_horizontalAlign':1,'_verticalAlign':1,'_overflow':2,'_useSystemFont':True,'_fontFamily':'Arial','_color':{'__type__':'cc.Color','r':255,'g':238,'b':164,'a':255}});return n
def button(p,name,value,x,y,w=70,h=70,art='Btn_1'):
 n=picture(p,name,art,x,y,w,h);n['_components'].append({'__type__':'cc.Button','node':n,'_interactable':True,'_transition':3,'_zoomScale':1.06,'_duration':.1,'clickEvents':[]});
 if value:text(n,'Label',value,12 if art.startswith('JP_') else 0,0,w-36 if art.startswith('JP_') else w,h,21)
 return n
def write(n,name):
 n['_name']=name;n['_parent']=None;p=ASSETS/'prefabs/playable'/(name+'.prefab');save(p,serialize({'__type__':'cc.Prefab','_name':name,'data':n}));meta(p,uid(name),'prefab');return uid(name)

# Materialize nested recovered prefabs; preserve their imported UUIDs.
for key,u in names.items():
 n=prefab(u)
 for x in walk(n):
  x['_components']=[c for c in x.get('_components',[]) if c and c.get('__type__') not in ['cc.Graphics']]
 p=ASSETS/'prefabs'/(key+'.prefab');save(p,serialize({'__type__':'cc.Prefab','_name':key,'data':n}));meta(p,u,'prefab')

# Original authored background, reel frame, jackpot plates, and logo positions.
game=prefab(names['MainGame_03bd85f8'])
for x in walk(game):
 x['_layer']=33554432
 x['_components']=[c for c in x.get('_components',[]) if c and c.get('__type__') not in ['cc.Animation','cc.Widget','cc.Mask','cc.Graphics','cc.Button','cc.ScrollView','cc.ScrollBar']]
 op=comp(x,'cc.UIOpacity')
 if op:op['_opacity']=255
for name in ['Node_Bar','MASK','MG_S','Logo_S','Fx_Expand','Ways','ManualRoot','Node_Win','Reel_BG','AutoTime','Node_BigWin','Node_Compliment','Node_BGDeclare','Node_GameIntro']:
 find(game,name)['_active']=False
# Static top clover replaces controller-dependent skeleton startup.
character=find(game,'Node_Character');charspine=comp(find(character,'Spine'),'sp.Skeleton');charspine['loop']=True;charspine['_premultipliedAlpha']=True;pos(character,-16.712,278);character['_lscale']={'__type__':'cc.Vec3','x':.72,'y':.72,'z':1}
logo=find(game,'Logo_L');comp(logo,'cc.Sprite')['_spriteFrame']=sf('logo_en');pos(logo,-483,203);comp(logo,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':173,'height':80}
# Explicit English lines panel.
broad=find(game,'Node_WaysBroad');broad['_children']=[];text(broad,'Count','100\nLINES',0,0,68,90,22)
# Replace bitmap-font values with readable labels at the same plates.
for name,value in [('JP_Mini','500'),('JP_Minor','2,000'),('JP_Major','5,000'),('JP_Grand','100,000')]:
 n=find(game,name)
 for child in n['_children']:
  if comp(child,'cc.Label'):child['_active']=False
 text(n,'Value',value,30,0,145,40,27)
# Four rows are explicit source configuration, despite the website's 5x3 copy.
plate=find(game,'SlotPlate');plate['_children']=[]
initial=[0,4,1,6,2,7,3,0,9,5,4,2,6,3,0,7,1,5,2,4]
cells=[]
for col in range(5):
 reel=add(plate,node('Reel'+str(col),-289.2+col*144.6,0,144.6,410))
 reel['_components'].append({'__type__':'cc.Mask','node':reel,'_type':0,'_inverted':False})
 for row in range(-1,5):
  cell=picture(reel,'Cell'+str(row),f'Symbol_{initial[col*4+max(0,min(3,row))]:02d}',0,153.75-row*102.5,140,140);cells.append(cell)
  glow=picture(cell,'Glow','WildGlow',0,0,126,116);glow['_active']=False
  # Make symbol render above glow.
  cell['_children']=[]
effects=add(plate['_parent'],node('SymbolEffects',-18.7,28.5,723,410))
for x in walk(game):
 if x.get('_name') in ['JPBroad_Fx','JPBroad_Collect']:x['_active']=False
write(picture(node('Holder'),'Symbol','Symbol_00',0,0,112,112),'SlotSymbol')
# Bottom control panel uses shipped raster buttons.
hud=add(game,node('HUD',0,-261,1136,118));picture(hud,'Background','BG_BottomBar_L',0,-9,1600,150)
button(hud,'Settings','≡',-486,0,54,54)
text(hud,'BalanceTitle','BALANCE',-340,17,185,28,18);text(hud,'Balance','10,000.00',-340,-16,220,36,25)
button(hud,'BetDown','−',-216,-4,42,42);button(hud,'BetUp','+',-58,-4,42,42)
text(hud,'BetTitle','BET',-137,19,100,26,16);text(hud,'Bet','100',-137,-14,105,36,24)
text(hud,'WinTitle','WIN',69,17,210,28,19);text(hud,'Win','0.00',69,-17,210,38,30)
button(hud,'Turbo','⚡',242,0,58,58);button(hud,'Auto','AUTO',321,0,63,63)
spin=button(hud,'Spin','',424,13,123,123,'Btn_Spin_BG');picture(spin,'Arrow','Btn_Spin_1_2',0,0,113,113)
text(game,'Status','100 LINES · EXPANDING WILDS',0,-192,700,25,16)
text(game,'LocalMode','LOCAL DEMO',488,305,155,22,12)
# Modal prefab with settings, help, history; no runtime UI construction.
dialog=node('CloverDialog',0,0,1136,640);dialog['_active']=False
shade=picture(dialog,'Shade','Black',0,0,1136,640);comp(shade,'cc.Sprite')['_color']['a']=235;shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
picture(dialog,'Panel','MG_Reel',0,0,860,524)
text(dialog,'Title','SETTINGS',0,205,720,50,32)
text(dialog,'Body','',0,15,750,300,22)
for name,title,x in [('Help','RULES',-275),('Sound','SOUND ON',-90),('History','HISTORY',95),('Reset','RESET',280)]:button(dialog,name,title,x,142,150,44,'JP_Club')
button(dialog,'Close','CLOSE',0,-204,170,46,'JP_Club')
button(dialog,'Paytable','PAYTABLE',-240,-204,170,46,'JP_Club')
button(dialog,'Feature','BONUS DEMO',240,-204,185,46,'JP_Club')
# 15 image-bound card buttons; collect three matching suits.
bonus=node('CloverBonus',0,0,1136,640);bonus['_active']=False
sh=picture(bonus,'Shade','Black',0,0,1136,640);sh['_components'].append({'__type__':'cc.BlockInputEvents','node':sh})
picture(bonus,'Frame','MG_Reel',0,0,930,562)
text(bonus,'Title','CLOVER CARD BONUS',0,239,860,45,30)
text(bonus,'Progress','Pick cards · collect 3 matching suits',0,193,820,36,22)
for i in range(15):
 card=button(bonus,'Card'+str(i),'',-264+(i%5)*132,112-(i//5)*126,87,115,'card_frame_close')
 face=picture(card,'Face','Symbol_10',0,0,87,115);face['_active']=False
button(bonus,'Collect','COLLECT',0,-235,210,45,'JP_Club');find(bonus,'Collect')['_active']=False
# Each card uses the recovered frame/face/light hierarchy and original clips.
for i in range(15):
 card=find(bonus,'Card'+str(i)); card['_components']=[c for c in card['_components'] if c['__type__']!='cc.Sprite'];card['_children']=[]
 art=add(card,prefab(names['SelectGame_Poker_3d12b568']));art['_name']='CardArt';pos(art,0,0)
 art['_lscale']={'__type__':'cc.Vec3','x':.87,'y':.87,'z':1}
 for x in walk(art):
  x['_layer']=33554432
  x['_components']=[c for c in x['_components'] if c and c['__type__']!='cc.Button']
 comp(art,'cc.Animation')['_playOnLoad']=False
# Explicit effect prefabs retain their original skeleton and texture references.
for key in [n for n in names if n.startswith('Symbol_')]+['WaysRun_d1e4eccf','FX_Fly_c56e31f4']:
 effect=prefab(names[key])
 for x in walk(effect):
  x['_layer']=33554432
  sk=comp(x,'sp.Skeleton')
  if sk:sk['defaultAnimation']='';sk['_animationName']='';sk['_cacheMode']=0
 write(effect,key.split('_')[0]+'Effect' if key.startswith('WaysRun') or key.startswith('FX_Fly') else key)
award=find(game,'Node_Compliment');award['_parent']['_children'].remove(award);add(bonus,award)
text(award,'AwardAmount','0.00',0,-55,720,72,50)
text(find(game,'Node_BigWin'),'AwardAmount','0.00',0,-70,650,70,50)
# Keep interactive panels as independently editable prefabs.
for n,name in [(game,'CloverGame'),(dialog,'CloverDialog'),(bonus,'CloverBonus')]:write(n,name)
# Original audio imported with stable references.
audio=[];cfg=json.loads(next((PROJECT/'coderesoures/assets/game').glob('config.*.json')).read_bytes())
for idx,entry in cfg['paths'].items():
 if cfg['types'][entry[1]]!='cc.AudioClip':continue
 u=expand(cfg['uuids'][int(idx)]);src=next((PROJECT/'coderesoures/assets/game/native').rglob(u+'.*.mp3'),None)
 if not src:continue
 dest=ASSETS/'audio'/(entry[0].split('/')[-1]+'.mp3');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);meta(dest,u,'audio-clip','1.0.0');audio.append((dest.stem,u))
scene={'__type__':'cc.Scene','_name':'CloverSlot','_children':[],'_components':[],'_parent':None,'autoReleaseAssets':False}
canvas=add(scene,node('Canvas',568,320,1136,640));camera=add(canvas,node('Camera'));camera['_lpos']['z']=1000
cam={'__type__':'cc.Camera','node':camera,'_projection':0,'_orthoHeight':320,'_near':.1,'_far':2000,'_visibility':33554432,'_clearFlags':7,'_clearColor':{'__type__':'cc.Color','r':0,'g':22,'b':6,'a':255},'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1}}
camera['_components'].append(cam);canvas['_components'].append({'__type__':'cc.Canvas','node':canvas,'_cameraComponent':cam,'_alignCanvasWithScreen':True})
for n in [game,dialog,bonus]:add(canvas,n)
canvas['_components'].append({'__type__':uid('CloverApp'),'node':canvas,'gameRoot':game,'dialogRoot':dialog,'bonusRoot':bonus,'symbols':[sf('Symbol_'+str(i).zfill(2)) for i in range(10)],'cardFaces':[sf('Symbol_'+str(i)) for i in range(10,17)],'cardBack':sf('card_frame_close'),'cardFront':sf('Symbol_Empty'),'sounds':[{'__uuid__':u} for _,u in audio],'soundNames':[n for n,_ in audio],'symbolPrefabs':[{'__uuid__':uid(next(n for n in names if n.startswith('Symbol_'+str(i).zfill(2)+'_')))} for i in range(10)],'linePrefab':{'__uuid__':uid('WaysRunEffect')},'flyPrefab':{'__uuid__':uid('FXEffect')}})
scene_data=serialize({'__type__':'cc.SceneAsset','_name':'CloverSlot','scene':scene})
# Link scene instances back to editor prefabs.
for name in ['CloverGame','CloverDialog','CloverBonus']:
 original=json.loads((ASSETS/'prefabs/playable'/(name+'.prefab')).read_bytes());rootidx=next(i for i,o in enumerate(scene_data) if o.get('__type__')=='cc.Node' and o.get('_name')==name)
 def link(si,pi):
  a,b=scene_data[si],original[pi];info=original[b['_prefab']['__id__']]
  a['_prefab']={'__id__':len(scene_data)};scene_data.append({'__type__':'cc.PrefabInfo','root':{'__id__':rootidx},'asset':{'__uuid__':uid(name)},'fileId':info['fileId'],'instance':None})
  for sc,pc in zip(a['_children'],b['_children']):link(sc['__id__'],pc['__id__'])
 link(rootidx,original[0]['data']['__id__'])
save(ASSETS/'scenes/CloverSlot.scene',scene_data);meta(ASSETS/'scenes/CloverSlot.scene',uid('scene'),'scene')
for p in (ASSETS/'scripts').glob('*.ts'):meta(p,uid(p.stem),'typescript','4.0.24')
save(PROJECT/'build-config.json',{'name':'CloverSlot','platform':'web-mobile','buildPath':'project://build','debug':False,'sourceMaps':True,'startScene':uid('scene'),'scenes':[{'url':'db://assets/scenes/CloverSlot.scene','uuid':uid('scene')}],'packages':{'web-mobile':{'orientation':'landscape'}},'md5Cache':True})
p=PROJECT/'settings/v2/packages/project.json';settings=json.loads(p.read_bytes());settings['general']={'designResolution':{'width':1136,'height':640,'fitWidth':True,'fitHeight':True}};save(p,settings)
print('Authored scene; playable prefabs',len(list((ASSETS/'prefabs/playable').glob('*.prefab'))),'audio',len(audio))
