"""Author editable portrait prefabs from recovered artwork. Rerun only before manual editing."""
import shutil
from editor import *
from recover import image_meta, expand
from PIL import Image

def uid(s): return str(uuid.uuid5(uuid.NAMESPACE_URL,'crown-local/'+s))
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
sprites={}
for entry in report['sprites']: sprites.setdefault(entry['name'],entry['uuid'])
sprites['logo_en']=next(entry['uuid'] for entry in report['sprites'] if entry['name']=='logo_en' and 'ea5f394a' in entry['path'])
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
    n=add(p,node(name,x,y,w,h));sprite(n,'Btn_2');button(n);text(n,'Label',value,0,0,w-4,h,16 if w<80 else 22);return n
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
for p in (ASSETS/'spine').rglob('*.png'):
    u=uid('spine/'+p.relative_to(ASSETS).as_posix());im=Image.open(p);image_meta(p,u,*im.size,[0]*4)
    m=json.loads(Path(str(p)+'.meta').read_bytes());m['userData'].update(type='texture',redirect=u+'@6c48a');save(Path(str(p)+'.meta'),m)

def art(p,name,frame,x,y,w,h):
    n=add(p,node(name,x,y,w,h));sprite(n,frame);return n
def rect(p,name,x,y,w,h,color):
    n=art(p,name,'default_panel',x,y,w,h);comp(n,'cc.Sprite')['_color']={'__type__':'cc.Color',**dict(zip(['r','g','b','a'],color))};return n
def modal(name):
    n=node(name,0,0,1136,640)
    shade=rect(n,'Shade',0,0,1800,1200,[8,3,20,225]);shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
    rect(n,'Border',0,0,840,548,[191,141,47,255]);rect(n,'Panel',0,0,834,542,[35,14,56,255])
    return n

game=node('CrownGame',0,0,1136,640)
game['_components'].append({'__type__':'cc.Mask','node':game,'_type':0,'_inverted':False})
art(game,'Background','BackGround_L',0,0,1136,710)
# Retain the original frame's proportions. The reel window is 770 x 470.
reel=add(game,node('Reels',0,44,820,665));reel['_lscale']={'__type__':'cc.Vec3','x':.76,'y':.76,'z':1}
art(reel,'Back','MG_Reel_Back',0,29,820,661)
cells=add(reel,node('Cells',0,-35,770,470))
cells['_components'].append({'__type__':'cc.Mask','node':cells,'_type':0,'_inverted':False})
for col in range(5):
    for row in range(3):
        i=col*3+row;cell=art(cells,'Cell'+str(i),'Symbol_0'+str((i+col)%7),(col-2)*154,(1-row)*156,210,210)
        mark=art(cell,'Highlight','FrameGlow',0,0,157,148);mark['_active']=False
        fx=prepare(prefab(names['Symbol_0'+str((i+col)%7)]));fx['_name']='WinEffect';fx['_active']=False;pos(fx,0,0)
        fx['_lscale']={'__type__':'cc.Vec3','x':.68,'y':.68,'z':1};add(cell,fx)
art(reel,'Frame','MG_Reel',0,29,820,665)
for col in range(5):
    n=art(reel,'Lock'+str(col),'left_light_frame',(col-2)*154,-35,158,476);n['_active']=False
text(game,'FeatureLeft','EXPANDING\nWILDS',-430,65,210,90,25)
art(game,'WildPreview','Symbol_07',-430,180,138,138)
text(game,'FeatureRight','WIN UP TO\n1000×',430,110,215,115,29)
text(game,'Lines','20 LINES',-430,-12,200,35,18)
text(game,'Respin','',0,-168,590,38,21)
text(game,'Status','Choose your bet and spin',0,-211,790,34,19)
rect(game,'BottomBar',0,-278,1136,85,[16,5,30,240])
for name,value,x in [('Balance','BALANCE',-417),('Bet','TOTAL BET',-148),('Win','WIN',106)]:
    text(game,name+'Title',value,x,-256,180,26,14);text(game,name,'0.00',x,-287,180,36,25)
btn(game,'BetDown','−',-260,-282,55,55);btn(game,'BetUp','+',-34,-282,55,55)
btn(game,'Max','MAX',239,-282,62,56)
spin=art(game,'Spin','Btn_Spin_BG',430,-245,133,133);button(spin)
art(spin,'Icon','Btn_Spin_1_2',0,0,100,100)
for name,title,x in [('Help','?',-520),('History','LOG',-455),('Settings','⚙',455),('Sound','ON',520)]:btn(game,name,title,x,275,54,48)
btn(game,'Auto','AUTO',335,-285,62,52);btn(game,'Turbo','FAST',528,-286,62,52)
loading=add(game,node('Loading',0,0,1136,640));loading['_active']=False
shade=rect(loading,'Shade',0,0,1600,1000,[12,4,24,240]);shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
text(loading,'Spinner','◌',0,55,100,100,64);text(loading,'Label','LOADING…',0,-30,700,50,23)
btn(loading,'Retry','RETRY',-115,-120,190,60);btn(loading,'Cancel','CLOSE',115,-120,190,60)

audio=[]
cfg=json.loads(next((PROJECT/'coderesoures/assets/game').glob('config.*.json')).read_bytes())
for idx,p in cfg['paths'].items():
    if cfg['types'][p[1]]!='cc.AudioClip':continue
    u=expand(cfg['uuids'][int(idx)]);src=next((PROJECT/'coderesoures/assets/game/native').rglob(u+'.*.mp3'),None)
    if not src:continue
    dest=ASSETS/'audio'/(p[0].split('/')[-1]+'.mp3');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);meta(dest,u,'audio-clip','1.0.0');audio.append((dest.stem,u))
skels=[]
for i in range(8):
    fx=prefab(names['Symbol_0'+str(i)])
    skels.append(next(c['_skeletonData'] for n in walk(fx) for c in n.get('_components',[]) if c and c['__type__']=='sp.Skeleton'))
game['_components'].append({'__type__':uid('CrownGame'),'node':game,'symbols':[{'__uuid__':sprites['Symbol_0'+str(i)]} for i in range(8)],'symbolEffects':skels,'sounds':[{'__uuid__':u} for _,u in audio],'soundNames':[n for n,_ in audio]})
game['_components'].append({'__type__':'cc.AudioSource','node':game,'_playOnAwake':False,'_volume':.5})
writeprefab(game,'CrownGame')

intro=modal('CrownIntro');art(intro,'Backdrop','Intro_Bg_L',0,0,834,542)
art(intro,'Logo','logo_en',0,183,280,130)
for i in range(5): art(intro,'Fruit'+str(i),'Symbol_0'+str([0,7,6,7,5][i]),(i-2)*119,20,118,118)
text(intro,'Title','EXPANDING WILDS & RESPINS',0,102,780,45,29)
text(intro,'Body','Wilds expand to cover a reel and lock in place.\nNew Wilds keep the free respins going. Win up to 1000×!',0,-99,760,90,23)
btn(intro,'Close','CONTINUE',0,-208,270,58);writeprefab(intro,'CrownIntro')
dialog=modal('CrownDialog');text(dialog,'Title','HOW TO PLAY',0,220,760,50,30);text(dialog,'Body','',0,10,760,360,21);btn(dialog,'Previous','◀',-290,-216,75,52);btn(dialog,'Next','▶',290,-216,75,52);btn(dialog,'Close','CLOSE',0,-216,210,55);writeprefab(dialog,'CrownDialog')
auto=modal('CrownAuto');text(auto,'Title','AUTO PLAY',0,215,740,50,30)
for name,title,y in [('Rounds','NUMBER OF SPINS',100),('Loss','STOP AT NET LOSS',15),('Profit','STOP AT NET PROFIT',-70)]:
    text(auto,name+'Title',title,-170,y,370,48,23);text(auto,name,'10',150,y,160,48,25);btn(auto,name+'Down','−',36,y,58,54);btn(auto,name+'Up','+',280,y,58,54)
text(auto,'Hint','A current spin and its free respins finish before stopping.',0,-142,750,36,17)
btn(auto,'Close','CANCEL',-140,-218,225,55);btn(auto,'Start','START',140,-218,225,55);writeprefab(auto,'CrownAuto')
win=modal('CrownWin');text(win,'Title','BIG WIN',0,160,760,80,52);text(win,'Amount','0.00',0,-90,780,95,66);text(win,'Detail','',0,-151,740,40,22);btn(win,'Close','COLLECT',0,-218,250,60)
fx=add(win,node('OriginalEffect',0,0,800,500));data=next((ASSETS/'spine').glob('Bigwin_*/*.skel'));su=json.loads(Path(str(data)+'.meta').read_bytes())['uuid'];fx['_components'].append({'__type__':'sp.Skeleton','node':fx,'_skeletonData':{'__uuid__':su},'_premultipliedAlpha':False,'defaultAnimation':'','defaultSkin':'default','loop':False});fx['_active']=False
writeprefab(win,'CrownWin')
settings=modal('CrownSettings');text(settings,'Title','SETTINGS',0,205,740,55,32)
btn(settings,'Sound','SOUND ON',0,98,360,65);btn(settings,'Turbo','FAST SPIN OFF',0,3,360,65);btn(settings,'Intro','GAME FEATURES',0,-92,360,65)
btn(settings,'Close','CLOSE',0,-210,250,55);writeprefab(settings,'CrownSettings')

scene={'__type__':'cc.Scene','_name':'Crown','_children':[],'_components':[],'_autoReleaseAssets':False}
canvas=add(scene,node('Canvas',568,320,1136,640));camera=add(canvas,node('Camera'));camera['_lpos']['z']=1000
cam={'__type__':'cc.Camera','node':camera,'_projection':0,'_orthoHeight':320,'_near':.1,'_far':2000,'_visibility':33554432,'_clearFlags':7,'_clearColor':{'__type__':'cc.Color','r':18,'g':6,'b':30,'a':255},'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1}}
camera['_components'].append(cam);canvas['_components'].append({'__type__':'cc.Canvas','node':canvas,'_cameraComponent':cam,'_alignCanvasWithScreen':True})
shell=add(canvas,node('Boot',0,0,1136,640));art(shell,'Logo','logo_en',0,100,336,156)
text(shell,'Spinner','◌',0,-30,90,90,64);text(shell,'Progress','LOADING  0%',0,-120,600,50,25)
btn(shell,'Retry','RETRY',0,-215,230,60)['_active']=False
canvas['_components'].append({'__type__':uid('CrownBoot'),'node':canvas})
p=ASSETS/'scenes/Crown.scene';save(p,serialize({'__type__':'cc.SceneAsset','_name':'Crown','scene':scene}));meta(p,uid('scene'),'scene')
for p in (ASSETS/'scripts').glob('*.ts'):meta(p,uid(p.stem),'typescript','4.0.24')
save(PROJECT/'build-config.json',{'name':'CrownOfFortune','platform':'web-mobile','buildPath':'project://build','debug':False,'sourceMaps':False,'startScene':uid('scene'),'scenes':[{'url':'db://assets/scenes/Crown.scene','uuid':uid('scene')}],'packages':{'web-mobile':{'orientation':'landscape'}},'md5Cache':True})
settings=PROJECT/'settings/v2/packages/project.json';s=json.loads(settings.read_bytes()) if settings.exists() else {};s['general']={'designResolution':{'width':1136,'height':640,'fitWidth':True,'fitHeight':True}};save(settings,s)
print('Authored seven deferred prefabs and lightweight loading scene; audio:',len(audio))


exec(compile((PROJECT/'tools/refine_ui.py').read_text(encoding='utf-8'), 'refine_ui.py', 'exec'))
