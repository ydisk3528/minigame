"""Author editable portrait prefabs from recovered artwork. Rerun only before manual editing."""
import shutil
from editor import *
from recover import image_meta, expand
from PIL import Image

def uid(s): return str(uuid.uuid5(uuid.NAMESPACE_URL,'chicken-local/'+s))
def comp(n,t): return next((c for c in n.get('_components',[]) if c and c['__type__']==t),None)
def find(n,path):
    for key in path.split('/'): n=next(c for c in n.get('_children',[]) if c['_name']==key)
    return n
def add(p,n): p.setdefault('_children',[]).append(n);n['_parent']=p;return n
def pos(n,x,y): n['_lpos']={'__type__':'cc.Vec3','x':x,'y':y,'z':0}
def size(n,w,h): comp(n,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':w,'height':h}
def label(n,text,fs=22):
    c=comp(n,'cc.Label')
    if not c:c={'__type__':'cc.Label','node':n};n.setdefault('_components',[]).append(c)
    c.update(_string=text,_fontSize=fs,_lineHeight=fs+7,_horizontalAlign=1,_verticalAlign=1,_overflow=2,_isSystemFontUsed=True,_spacingX=0,_fontFamily='Arial',_color={'__type__':'cc.Color','r':255,'g':246,'b':218,'a':255})
    return c
report=json.loads((PROJECT/'tools/recovery-report.json').read_bytes())
sprites={s['name']:s['uuid'] for s in report['sprites']}
def sprite(n,name):
    c=comp(n,'cc.Sprite')
    if not c:c={'__type__':'cc.Sprite','node':n,'_sizeMode':0};n.setdefault('_components',[]).append(c)
    c['_spriteFrame']={'__uuid__':sprites[name],'__expectedType__':'cc.SpriteFrame'};return c
def button(n):
    c=comp(n,'cc.Button')
    if not c:n.setdefault('_components',[]).append({'__type__':'cc.Button','node':n,'_interactable':True,'_transition':3,'_zoomScale':1.03,'clickEvents':[]})
def text(p,name,value,x,y,w=500,h=42,fs=22):
    n=add(p,node(name,x,y,w,h));label(n,value,fs);return n
def btn(p,name,value,x,y,w=190,h=60):
    n=add(p,node(name,x,y,w,h));sprite(n,'Btn_Start');button(n);text(n,'Label',value,0,0,w-14,h,22);return n
def prepare(n):
    for x in walk(n):
        x['_layer']=33554432
        x['_components']=[c for c in x.get('_components',[]) if c and c['__type__'] not in ['cc.Widget','cc.Animation','cc.Camera','cc.WebView']]
        for c in x['_components']:
            if c['__type__']=='cc.Button':c['clickEvents']=[]
            if c['__type__']=='sp.Skeleton':c.update(_premultipliedAlpha=False,_animationName='',_skinName='default')
            if c['__type__']=='cc.Label':c.update(_isSystemFontUsed=True,_font=None,_fontFamily='Arial',_spacingX=0)
    return n
def writeprefab(n,name,script=None):
    n['_parent']=None;n['_name']=name;n['_active']=True;pos(n,0,0)
    if script:n['_components'].append({'__type__':uid(script),'node':n})
    p=ASSETS/'resources/deferred'/(name+'.prefab');save(p,serialize({'__type__':'cc.Prefab','_name':name,'data':n}));meta(p,uid('prefab/'+name),'prefab')
def modal(name):
    n=node(name,0,0,640,1136)
    shade=add(n,node('Shade',0,0,1600,2200));c=sprite(shade,'default_btn_normal');c['_color']={'__type__':'cc.Color','r':5,'g':10,'b':22,'a':240};shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
    panel=add(n,node('Panel',0,0,584,850));sprite(panel,'Fairness_Bg')
    return n

for p in (ASSETS/'spine').rglob('*.png'):
    u=uid('spine/'+p.relative_to(ASSETS).as_posix());im=Image.open(p);image_meta(p,u,*im.size,[0]*4)
    m=json.loads(Path(str(p)+'.meta').read_bytes());m['userData'].update(type='texture',redirect=u+'@6c48a');save(Path(str(p)+'.meta'),m)

stage=prepare(prefab(names['Stage']));game=find(stage,'Display/UI');game['_name']='ChickenGame';size(game,640,1136)
keep=['BGLayer','blackBoard','Character','TopLayer','ButtonLayer','GameDataLayer','ListLayer']
game['_children']=[c for c in game['_children'] if c['_name'] in keep]
game['_components']=[c for c in game['_components'] if c['__type__']=='cc.UITransform']
game['_components'].append({'__type__':'cc.Mask','node':game,'_type':0,'_inverted':False})
bg=find(game,'BGLayer');first=find(bg,'bg_first');end=find(bg,'bg_end')
bg['_children']=[first];pos(bg,-480,-120)
for i in range(28):
    road=prepare(prefab(names['roadItem']));road['_name']=f'Lane{i+1}';pos(road,483.5+199*i,0);road['_active']=True;add(bg,road)
    for ch in road['_children']:ch['_active']=ch['_name'] in ['coin_01','odds_num','oddsTag','Cars']
    find(road,'oddsTag/bag')['_active']=False
    label(find(road,'odds_num'),f'{1.1+i*.2:.2f}x',28)
    label(find(road,'oddsTag/oddsNum'),str(i+1),19)
    car=find(road,'Cars');comp(car,'sp.Skeleton').update(defaultAnimation='Track1_Smoke123',defaultSkin=['Car_01-1','Car_01-2','Car_02-1','Car_03'][i%4],loop=True);pos(car,0,950)
    # Bonus-wheel skeletons belong only to the bonus prefab.
    road['_children']=[ch for ch in road['_children'] if ch['_name']!='wheel']
add(bg,end);pos(end,483.5+199*28,0)
end['_children']=[]
character=find(game,'Character');comp(character,'sp.Skeleton').update(defaultAnimation='Idle',loop=True,_color={'__type__':'cc.Color','r':255,'g':255,'b':255,'a':255})
find(character,'Button')['_active']=False
top=find(game,'TopLayer');top['_children']=[c for c in top['_children'] if c['_name'] not in ['RoundList','RoundList_L']]
for name in ['bg','stepNode','oddsNode']:find(top,name)['_active']=True
text(top,'HistoryStrip','READY TO CROSS',0,468,610,38,19)
buttons=find(game,'ButtonLayer')
for n in buttons['_children']:
    n['_active']=n['_name'] not in ['StopAutoPlay','Jump','CashOut']
    for child in n.get('_children',[]):
        if child['_name']=='Black':child['_active']=False
for k,title in [('Spin','START'),('Jump','JUMP'),('CashOut','CASH OUT')]:
    n=find(buttons,k)
    for ch in n.get('_children',[]):
        if ch['_name'].startswith('icon_'):ch['_active']=False
    text(n,'ActionLabel',title,0,12 if k=='CashOut' else 0,220,45,26)
pos(find(buttons,'CashOut/num'),0,-24);size(find(buttons,'CashOut/num'),215,32)
label(find(game,'GameDataLayer/playerCoin_txt'),'BALANCE',15);label(find(game,'GameDataLayer/win_txt'),'WIN',15)
find(game,'GameDataLayer/NetNode')['_active']=False
for name,value,x in [('Help','?',170),('History','LOG',225),('Sound','ON',280)]:btn(game,name,value,x,405,49,42)
text(game,'Status','Choose a difficulty and start crossing',0,-270,600,50,21)
text(game,'LocalLabel','LOCAL PLAY  •  CHICKEN DASH 10000',0,-553,600,26,13)
lists=find(game,'ListLayer');find(lists,'BetList')['_active']=False;find(lists,'DifficultyList')['_active']=False
d=find(lists,'DifficultyList/Layout')
d['_active']=True
for n,title in zip(d['_children'],['EASY','MEDIUM','HARD']):label(find(n,'Label'),title,22)
b=find(lists,'BetList/Layout');template=b['_children'][0];b['_children']=[]
b['_active']=True
b['_components']=[c for c in b['_components'] if c['__type__']!='cc.Layout']
for i,value in enumerate([10,25,50,100,250,500]):
    n=copy.deepcopy(template);n['_name']='Bet'+str(value);pos(n,(i%2)*100-30,45+(i//2)*58);label(find(n,'Label'),str(value));add(b,n)
size(find(lists,'BetList'),245,240);pos(find(lists,'BetList'),-175,-405)
# Own delayed-loading shield needs no remote resources.
loading=add(game,node('Loading',0,0,640,1136));loading['_active']=False
shade=add(loading,node('Shade',0,0,1600,2200));sprite(shade,'default_btn_normal')['_color']={'__type__':'cc.Color','r':8,'g':15,'b':26,'a':245};shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
text(loading,'Label','LOADING…',0,10);btn(loading,'Retry','RETRY',0,-90);btn(loading,'Cancel','CLOSE',0,-170)

audio=[]
cfg=json.loads(next((PROJECT/'coderesoures/assets/game').glob('config.*.json')).read_bytes())
for idx,p in cfg['paths'].items():
    if cfg['types'][p[1]]!='cc.AudioClip':continue
    u=expand(cfg['uuids'][int(idx)]);src=next((PROJECT/'coderesoures/assets/game/native').rglob(u+'.*.mp3'),None)
    if not src:continue
    dest=ASSETS/'audio'/(p[0].split('/')[-1]+'.mp3');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);meta(dest,u,'audio-clip','1.0.1');audio.append((dest.stem,u))
game['_components'].append({'__type__':uid('ChickenGame'),'node':game,'sounds':[{'__uuid__':u} for _,u in audio],'soundNames':[n for n,_ in audio]})
game['_components'].append({'__type__':'cc.AudioSource','node':game,'_playOnAwake':False,'_loop':False,'_volume':.6})
writeprefab(game,'ChickenGame')

dialog=modal('ChickenDialog');text(dialog,'Title','HOW TO PLAY',0,345,520,65,32);text(dialog,'Body','',0,20,510,555,23);btn(dialog,'Close','CLOSE',0,-340,220,65);writeprefab(dialog,'ChickenDialog')
auto=modal('ChickenAuto');text(auto,'Title','AUTO PLAY',0,345,520,65,32)
custom=prepare(prefab(names['ChickenDashAutoSetting']));pos(custom,0,190);add(auto,custom)
label(find(custom,'MineCnt/AutoPlay_txt_2'),'DIFFICULTY',19);label(find(custom,'TargetStage/AutoPlay_txt_3'),'CASH OUT AT',19)
find(custom,'TargetStage/Toggle')['_active']=False
for n in walk(custom):
    if n['_name'].startswith('AutoPlay_txt_'):pos(n,-142,n.get('_lpos',{}).get('y',0));size(n,230,40)
for name,caption,y in [('Rounds','ROUNDS',30),('StopLoss','LOSS LIMIT',-70),('StopWin','PROFIT TARGET',-170)]:
    text(auto,name+'Title',caption,-135,y,240,50,20);text(auto,name,'10',135,y,120,50,23);btn(auto,name+'Down','−',55,y,45,47);btn(auto,name+'Up','+',245,y,45,47)
text(auto,'Hint','Stop can be pressed at any time.\nA running round remains under your control.',0,-255,500,60,17)
btn(auto,'Start','START',135,-340,220,65);btn(auto,'Close','CANCEL',-135,-340,220,65);writeprefab(auto,'ChickenAuto')

bonus=modal('ChickenBonus');text(bonus,'Title','BONUS WHEEL',0,355,550,70,35)
wheel=add(bonus,node('Wheel',0,50,518,518));sprite(wheel,'wheel1_bg')
for i,value in enumerate([10000,8,50,5,30,3,1000,1,100,10]):
    import math
    a=math.radians(90-i*36);n=text(wheel,'Prize'+str(i),str(value)+'x',math.cos(a)*185,math.sin(a)*185,100,40,22)
    n['_euler']={'__type__':'cc.Vec3','x':0,'y':0,'z':-i*36};ang=math.radians(-i*36)/2;n['_lrot']={'__type__':'cc.Quat','x':0,'y':0,'z':math.sin(ang),'w':math.cos(ang)}
text(bonus,'Pointer','▼',0,325,80,60,45)
text(bonus,'Amount','A bag brings an extra reward!',0,-245,510,70,26);btn(bonus,'Spin','SPIN',0,-340,240,70)
# Preserve the original editable wheel Spine as a separate effect node.
effect=prepare(prefab(names['Wheel']));effect['_name']='OriginalWheelEffect';pos(effect,0,50);effect['_active']=False;add(bonus,effect)
writeprefab(bonus,'ChickenBonus')

result=modal('ChickenResult');text(result,'Title','CASH OUT!',0,310,520,75,40)
hero=copy.deepcopy(character);hero['_name']='Chicken';pos(hero,0,150);hero['_lscale']={'__type__':'cc.Vec3','x':1.35,'y':1.35,'z':1};add(result,hero)
text(result,'Amount','0',0,-90,520,95,52);text(result,'Detail','',0,-180,510,70,23);btn(result,'StopAuto','STOP AUTO',0,-260,220,48)['_active']=False;btn(result,'Continue','CONTINUE',0,-340,260,70);writeprefab(result,'ChickenResult')

scene={'__type__':'cc.Scene','_name':'Chicken','_children':[],'_components':[],'_parent':None,'autoReleaseAssets':False}
canvas=add(scene,node('Canvas',320,568,640,1136));camera=add(canvas,node('Camera',0,0,640,1136));camera['_lpos']['z']=1000
cam={'__type__':'cc.Camera','node':camera,'_projection':0,'_orthoHeight':568,'_near':.1,'_far':2000,'_visibility':33554432,'_clearFlags':7,'_clearColor':{'__type__':'cc.Color','r':18,'g':27,'b':42,'a':255},'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1}}
camera['_components'].append(cam);canvas['_components'].append({'__type__':'cc.Canvas','node':canvas,'_cameraComponent':cam,'_alignCanvasWithScreen':True})
shell=add(canvas,node('Boot',0,0,640,1136));logo=add(shell,node('Logo',0,130,387,177));sprite(logo,'logo_en')
text(shell,'Spinner','◌',0,-25,90,90,65);text(shell,'Progress','LOADING  0%',0,-125,500,50,25);text(shell,'Caption','CHICKEN DASH 10000',0,-200,540,40,18)
btn(shell,'Retry','RETRY',0,-280,230,65)['_active']=False
canvas['_components'].append({'__type__':uid('ChickenBoot'),'node':canvas})
p=ASSETS/'scenes/Chicken.scene';save(p,serialize({'__type__':'cc.SceneAsset','_name':'Chicken','scene':scene}));meta(p,uid('scene'),'scene')
for p in (ASSETS/'scripts').glob('*.ts'):meta(p,uid(p.stem),'typescript','4.0.24')
save(PROJECT/'build-config.json',{'name':'Chicken','platform':'web-mobile','buildPath':'project://build','debug':False,'sourceMaps':False,'startScene':uid('scene'),'scenes':[{'url':'db://assets/scenes/Chicken.scene','uuid':uid('scene')}],'packages':{'web-mobile':{'orientation':'portrait'}},'md5Cache':True})
settings=PROJECT/'settings/v2/packages/project.json';s=json.loads(settings.read_bytes()) if settings.exists() else {};s['general']={'designResolution':{'width':640,'height':1136,'fitWidth':True,'fitHeight':False}};save(settings,s)
print('Authored 5 delayed prefabs, lightweight scene, audio:',len(audio))
import runpy
runpy.run_path(str(PROJECT/'tools/landscape.py'),run_name='__main__')
