"""One-time editor authoring. Runtime instantiates these bound prefabs, never builds UI."""
import shutil
from editor import *
from recover import image_meta, expand
from PIL import Image

def uid(s):return str(uuid.uuid5(uuid.NAMESPACE_URL,'teenpatti-local/'+s))
def comp(n,t):return next((c for c in n.get('_components',[]) if c and c.get('__type__')==t),None)
def find(n,path):
    for key in path.split('/'):n=next(c for c in n['_children'] if c['_name']==key)
    return n
def anynode(n,name):return next(x for x in walk(n) if x['_name']==name)
def add(p,n):p['_children'].append(n);n['_parent']=p;return n
def pos(n,x,y):n['_lpos']={'__type__':'cc.Vec3','x':x,'y':y,'z':0}
def label(n,text,size=22):
    c=comp(n,'cc.Label')
    if not c:c={'__type__':'cc.Label','node':n};n['_components'].append(c)
    c.update(_string=text,_fontSize=size,_lineHeight=size+5,_horizontalAlign=1,_verticalAlign=1,_overflow=2,_useSystemFont=True,_fontFamily='Arial',_color={'__type__':'cc.Color','r':255,'g':238,'b':186,'a':255})
    return c
report=json.loads((PROJECT/'tools/recovery-report.json').read_bytes())
sprites={s['name']:s['uuid'] for s in report['sprites']}
clip_paths={}
for p in (ASSETS/'animations').glob('*.anim'):
    d=json.loads(p.read_bytes());u=json.loads(Path(str(p)+'.meta').read_bytes())['uuid']
    clip_paths[u]=[o['path'] for o in d if isinstance(o,dict) and o.get('__type__')=='cc.animation.HierarchyPath']
    for o in d:
        if isinstance(o,dict) and o.get('__type__')=='cc.AnimationClip':o['_events']=[];o['events']=[]
    save(p,d)
def valid_path(n,path):
    try:
        if path:find(n,path)
        return True
    except StopIteration:return False
def sf(name):return {'__uuid__':sprites[name],'__expectedType__':'cc.SpriteFrame'}
def sprite(n,name):
    c=comp(n,'cc.Sprite')
    if not c:c={'__type__':'cc.Sprite','node':n,'_sizeMode':0};n['_components'].append(c)
    c['_spriteFrame']=sf(name);return c
def button(n):
    if not comp(n,'cc.Button'):n['_components'].append({'__type__':'cc.Button','node':n,'_interactable':True,'_transition':3,'_zoomScale':1.035,'clickEvents':[]})
def textnode(p,name,text,x,y,w=300,h=40,size=22):
    n=add(p,node(name,x,y,w,h));label(n,text,size);return n
def textbutton(p,name,text,x,y,w=180,h=54):
    n=add(p,node(name,x,y,w,h));sprite(n,'bnt_yellow');button(n);textnode(n,'Label',text,0,0,w-12,h,23);return n
def writeprefab(n,name):
    n['_parent']=None;n['_name']=name
    p=ASSETS/'prefabs/playable'/(name+'.prefab');save(p,serialize({'__type__':'cc.Prefab','_name':name,'data':n}));meta(p,uid(name),'prefab');return uid(name)
def prepare(n):
    for x in walk(n):
        x['_layer']=33554432
        # Rotation is locked to the original horizontal authored layout.
        x['_components']=[c for c in x.get('_components',[]) if c and c['__type__'] not in ['cc.Widget','cc.WebView']]
        for c in x['_components']:
            if c['__type__']=='cc.Animation':
                c['playOnLoad']=False
                c['_clips']=[r for r in c.get('_clips',[]) if r and all(valid_path(x,p) for p in clip_paths.get(r.get('__uuid__'),[]))]
                if c.get('_defaultClip') not in c['_clips']:c['_defaultClip']=None
            if c['__type__']=='cc.Button':c['clickEvents']=[]
            if c['__type__']=='cc.Label':
                c['_string']=c.get('_string','').replace('BUK','').replace('$','')
                c['_fontFamily']='Arial';c['_useSystemFont']=True
            if c['__type__']=='sp.Skeleton':c['_premultipliedAlpha']=True
    return n

# Keep untouched recovered originals for reference.
for p in list((ASSETS/'prefabs').glob('*.prefab')):
    dest=ASSETS/'prefabs/original'/p.name;dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(p,dest)
    # References point to the materialized originals below, not duplicate UUIDs.
    meta(dest,uid('reference/'+p.stem),'prefab')

avatars=[]
for p in sorted((PROJECT.parents[1]/'RummyA/RummaAPorject/assets/art').glob('Avatar_*.png')):
    target=ASSETS/'art/avatars'/p.name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,target)
    u=uid('avatar/'+p.stem);im=Image.open(target);avatars.append(image_meta(target,u,*im.size,[0]*4))
save(PROJECT/'tools/avatar-provenance.json',{'source':'Previously generated RummyA character portraits; reused as local replacement avatars. Not original Teen Patti avatar downloads.','count':len(avatars)})

# Complete skeleton image import metadata.
for p in (ASSETS/'spine').rglob('*.png'):
    u=uid('spine/'+p.name);im=Image.open(p);image_meta(p,u,*im.size,[0]*4)
    m=json.loads(Path(str(p)+'.meta').read_bytes());m['userData']['type']='texture';m['userData']['redirect']=u+'@6c48a';save(Path(str(p)+'.meta'),m)

lobby=prepare(prefab(names['Lobby']));lobby['_name']='TeenPattiLobby'
sprite(find(lobby,'Lobby_Bg'),'Lobby_Bg')
find(lobby,'Model/01')['_active']=False
girl=find(lobby,'Model/02');girl['_active']=True
comp(girl,'sp.Skeleton')['_skeletonData']={'__uuid__':'34e29eab-bf06-46c0-9f15-6a3432eb6636'}
comp(girl,'sp.Skeleton')['_animationName']='animation'
for name in ['LT','roomBg']:
    try:find(lobby,'Room/'+name)['_active']=False
    except StopIteration:pass
for n in walk(lobby):
    if n['_name'] in ['Lobby_Bg_S','Bonus','indiaRecommend','PageBtn','PageBtn_S']:n['_active']=False
rooms=find(lobby,'Room');positions=[(-125,10),(140,120),(420,120),(140,-110),(420,-110)]
for i,boot in enumerate([1,5,10,30,100]):
    n=find(rooms,'btn_0'+str(i+1));n['_children']=[];pos(n,*positions[i])
    r=prepare(prefab(names['btn_root']));r['_name']='RoomCard';pos(r,0,0);add(n,r)
    for child in r['_children']:child['_active']=child['_name']==('01' if i==0 else '02')
    active=find(r,'01' if i==0 else '02');button(active)
    for key,value in [('boot',str(boot)),('min',f'{boot*512:,}'),('limit',f'{boot*1024:,}')]:label(find(active,'RoomNum/'+key),value,20)
    for key,value in [('boot','Boot:'),('min','Min Entry:'),('limit','Pot Limit:')]:label(find(active,'need/'+key),value,16)
    sprite(find(active,'LV/num'),'Txt_LV_'+str(i+1)) if 'Txt_LV_'+str(i+1) in sprites else None
    button(find(active,'joinBtn'))
    if i: sprite(anynode(active,'LobbyIcon01'),'LobbyIcon_0'+str(i+1))
bar=prepare(prefab(names['LobbyBar']));add(lobby,bar)
sprite(find(bar,'TopData/Logo'),'Loading_title_en')
layout=find(bar,'Data/Layout');layout['_components']=[c for c in layout['_components'] if c['__type__']!='cc.Layout']
pos(find(layout,'Num_Gold'),35,0);comp(find(layout,'Num_Gold'),'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':150,'height':28}
pos(find(layout,'Icon'),-57,0)
for n in walk(bar):
    if n['_name'] in ['Help_Btn','Record_Btn','Sound_On','Sound_Off','Exit_Btn','YTube','IndiaHall','Backpack','MoreGames']:n['_active']=False
label(find(bar,'Data/TXT_Name'),'Player',20);label(find(bar,'Data/Layout/Num_Gold'),'10,000',22)
comp(find(bar,'Data/Photo/Img'),'cc.Sprite')['_spriteFrame']={'__uuid__':avatars[0]}
for name,text,x in [('Help','RULES',390),('Sound','SOUND',510)]:textbutton(lobby,name,text,x,-283,110,46)
lobbyuid=writeprefab(lobby,'TeenPattiLobby')

view=prepare(prefab(names['GameView']));table=find(view,'MainGame');table['_parent']=None
table['_name']='TeenPattiTable';table['_active']=True
for n in walk(table):
    if n['_name'] in ['Mark','DoubleBet']:n['_active']=False
# Original dynamically filled dealer slot uses the recovered static dealer portrait.
dealer=next(n for n in find(table,'Bg')['_children'] if n['_name']=='Dealer' and comp(n,'cc.Sprite'))
dealer['_active']=True
for n in find(table,'Effect')['_children']:n['_active']=False
find(table,'PK')['_active']=False;find(table,'HelpMSG')['_active']=False
find(table,'SendPokerNode')['_active']=False
for n in find(table,'PokerType')['_children']:n['_active']=False
for i in range(5):
    seat=find(table,'Players/'+f'{i+1:02d}');seat['_active']=True
    for n in seat['_children']:n['_active']=True
    player=anynode(seat,'Players')
    for name in ['SeeRing','Crown','Crown_0','FX_Win','Status','CountDown','CountDown2']:
        for n in walk(player):
            if n['_name']==name:n['_active']=False
    for name in ['img','img2']:
        n=find(player,'Photo/mask/'+name);comp(n,'cc.Sprite')['_spriteFrame']={'__uuid__':avatars[i]};n['_active']=name=='img'
    textnode(player,'Balance','10,000',0,-75,180,28,18)
    textnode(player,'TurnClock','15',60,55,44,38,24)
    textnode(player,'ActionStatus','BLIND',0,-48,145,29,18)
    poker=find(table,'Poker/'+f'{i+1:02d}'+'/Poker');poker['_active']=True
    for n in poker['_children']:
        n['_active']=True
        for child in n['_children']:child['_active']=False
    # Use the existing three original card sprite nodes, statically placed.
    if i==2:
        mask=find(table,'Poker/03');mask['_components']=[c for c in mask['_components'] if c['__type__'] not in ['cc.Mask','cc.Graphics']]
    for g in find(table,'Gold/'+f'{i+1:02d}')['_children']:
        if g['_name']=='DoubleBet':g['_active']=False
btns=find(table,'Btn')
for n in btns['_children']:n['_active']=False
for i,text in [(0,'SEE'),(1,'PACK'),(2,'SIDE SHOW'),(3,'BLIND'),(4,'RAISE'),(5,'CONTINUE')]:
    n=find(btns,f'Btn_{i:02d}');n['_active']=i<5;button(n);label(find(n,'Label'),text,22)
textbutton(table,'Home','LOBBY',-487,277,145,48)
textbutton(table,'Help','RULES',486,277,125,48)
textbutton(table,'Sound','SOUND',486,214,125,44)
textnode(table,'RoomTitle','TEEN PATTI · BOOT 1',0,290,590,36,19)
textnode(table,'StatusLine','',0,-310,1060,22,16)
# Shared modal: rules, history and local results; editor-authored sprite/label/buttons.
modal=node('Dialog',0,0,1136,640);add(table,modal);modal['_active']=False
shade=add(modal,node('Shade',0,0,1136,640));sprite(shade,'data_bg');shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
panel=add(modal,node('Panel',0,25,760,460));sprite(panel,'help_Bg')
textnode(modal,'Title','',0,211,720,48,30)
textnode(modal,'Body','',0,34,700,285,21)
textbutton(modal,'Close','CLOSE',0,-179,230,55)
textbutton(modal,'Accept','ACCEPT',160,-179,220,55)
textbutton(modal,'Reject','REJECT',-160,-179,220,55)
table['_children'].remove(modal)
dialoguid=writeprefab(modal,'TeenPattiDialog')
tableuid=writeprefab(table,'TeenPattiTable')

# Import original audio, expose references on the controller.
audio=[];cfg=json.loads(next((PROJECT.parent/'coderesoures/assets/game').glob('config.*.json')).read_bytes())
for idx,path in cfg['paths'].items():
    if not path[0].startswith('Sound/'):continue
    u=expand(cfg['uuids'][int(idx)]);src=next((PROJECT.parent/'coderesoures/assets/game/native').rglob(u+'.*.mp3'))
    dest=ASSETS/'audio'/(path[0].split('/')[-1]+'.mp3');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,dest);meta(dest,u,'audio-clip','1.0.4');audio.append((dest.stem,u))

scene={'__type__':'cc.Scene','_name':'TeenPatti','_children':[],'_components':[],'_parent':None,'autoReleaseAssets':False}
canvas=add(scene,node('Canvas',568,320,1136,640));camera=add(canvas,node('Camera',0,0));camera['_lpos']['z']=1000
cam={'__type__':'cc.Camera','node':camera,'_projection':0,'_orthoHeight':320,'_near':.1,'_far':2000,'_visibility':33554432,'_clearFlags':7,'_clearColor':{'__type__':'cc.Color','r':12,'g':7,'b':28,'a':255},'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1}}
camera['_components'].append(cam);canvas['_components'].append({'__type__':'cc.Canvas','node':canvas,'_cameraComponent':cam,'_alignCanvasWithScreen':True})
table['_active']=False;add(canvas,table);add(canvas,lobby);add(canvas,modal)
controller={'__type__':uid('TeenPattiApp'),'node':canvas,'lobbyRoot':lobby,'tableRoot':table,'dialogRoot':modal,'faces':[sf(f'Card_{s}_{r:02d}') for s in range(4) for r in range(2,15)],'portraits':[{'__uuid__':u} for u in avatars],'sounds':[{'__uuid__':u} for _,u in audio],'soundNames':[n for n,_ in audio]}
canvas['_components'].append(controller)
scene_data=serialize({'__type__':'cc.SceneAsset','_name':'TeenPatti','scene':scene})
def link_prefab(name):
    original=json.loads((ASSETS/'prefabs/playable'/(name+'.prefab')).read_bytes())
    rootidx=next(i for i,o in enumerate(scene_data) if o.get('__type__')=='cc.Node' and o.get('_name')==name)
    def link(si,pi):
        s,p=scene_data[si],original[pi]
        info=original[p['_prefab']['__id__']]
        s['_prefab']={'__id__':len(scene_data)}
        scene_data.append({'__type__':'cc.PrefabInfo','root':{'__id__':rootidx},'asset':{'__uuid__':uid(name)},'fileId':info['fileId'],'instance':None,'targetOverrides':None,'nestedPrefabInstanceRoots':None})
        for sc,pc in zip(s['_components'],p['_components']):
            c=original[pc['__id__']];meta_info=original[c['__prefab']['__id__']]
            scene_data[sc['__id__']]['__prefab']={'__id__':len(scene_data)};scene_data.append(copy.deepcopy(meta_info))
        for sc,pc in zip(s['_children'],p['_children']):link(sc['__id__'],pc['__id__'])
    link(rootidx,original[0]['data']['__id__'])
for name in ['TeenPattiLobby','TeenPattiTable','TeenPattiDialog']:link_prefab(name)
save(ASSETS/'scenes/TeenPatti.scene',scene_data);meta(ASSETS/'scenes/TeenPatti.scene',uid('scene'),'scene')
for p in (ASSETS/'scripts').glob('*.ts'):meta(p,uid(p.stem),'typescript','4.0.24')
save(PROJECT/'build-config.json',{'name':'TeenPatti','platform':'web-mobile','buildPath':'project://build','debug':True,'sourceMaps':True,'startScene':uid('scene'),'scenes':[{'url':'db://assets/scenes/TeenPatti.scene','uuid':uid('scene')}],'packages':{'web-mobile':{'orientation':'landscape'}},'md5Cache':True})
settings=PROJECT/'settings/v2/packages/project.json'
s=json.loads(settings.read_bytes());s['general']={'designResolution':{'width':1136,'height':640,'fitWidth':False,'fitHeight':True}};save(settings,s)
print('Authored lobby/table prefabs and scene; audio',len(audio),'portraits',len(avatars))
import runpy
runpy.run_path(str(PROJECT/'tools/author_results.py'),run_name='__main__')
runpy.run_path(str(PROJECT/'tools/author_quick_setting.py'),run_name='__main__')
runpy.run_path(str(PROJECT/'tools/defer_assets.py'),run_name='__main__')
