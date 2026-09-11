"""Author scene/prefab files once. Runtime only changes game state and card faces."""
import copy,json,uuid
from pathlib import Path
P=Path(__file__).resolve().parents[1]
A=P/'assets'
assets=json.loads((P/'tools/recovered-assets.json').read_bytes())
original={p['uuid']:json.loads((P/p['path']).read_bytes()) for p in assets['prefabs']}
byname={p['name']:p['uuid'] for p in assets['prefabs']}
def uid(name):return str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-local/'+name))
def classid(u):
    h=u.replace('-','');alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    return h[:5]+''.join(alphabet[int(h[i:i+3],16)>>6]+alphabet[int(h[i:i+3],16)&63] for i in range(5,32,3))
def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
def meta(path,u,typ):save(Path(str(path)+'.meta'),{'ver':'4.0.24' if typ=='typescript' else '1.1.50','importer':typ,'imported':True,'uuid':u,'files':['.json'],'subMetas':{},'userData':{}})
def vec(x=0,y=0,z=0):return {'__type__':'cc.Vec3','x':x,'y':y,'z':z}
def walk(n):
    yield n
    for child in n['children']:yield from walk(child)
def find(n,path):
    for name in path.split('/'):
        n=next(c for c in n['children'] if c['props']['_name']==name)
    return n
def comp(n,typ):return next((c for c in n['components'] if c['__type__']==typ),None)
def clean(v):
    if isinstance(v,list):return [clean(x) for x in v]
    if not isinstance(v,dict):return v
    if '__id__' in v:return None
    return {k:clean(x) for k,x in v.items() if k not in ('node','__prefab','_prefab','_id')}
keep={'cc.Animation','cc.UITransform','cc.UIOpacity','cc.Sprite','cc.Label','cc.Layout','cc.Widget','cc.Button','cc.Mask','cc.Graphics','cc.BlockInputEvents','cc.Camera'}
def tree(u,idx=1):
    data=original[u];obj=data[idx];prefab=obj.get('_prefab') or {}
    if '__id__' in prefab:prefab=data[prefab['__id__']]
    nested=prefab.get('asset') or {}
    if '__uuid__' in nested and nested['__uuid__'] in original:
        n=tree(nested['__uuid__'])
        inst=prefab.get('instance') or {}
        for override in inst.get('propertyOverrides',[]):
            if override['propertyPath'][0] in ('clickEvents','_clickEvents','callFunc'):continue
            target=override.get('targetInfo')
            if target and '__id__' in target:target=data[target['__id__']]
            local=(target or {}).get('localID',[])
            for node in walk(n):
                targets=[node['props']] if node['fileId'] in local else []
                targets += [c for c in node['components'] if c.get('_sourceFileId') in local]
                for dest in targets:
                    keys=override['propertyPath'];d=dest
                    for key in keys[:-1]:
                        if key not in d:break
                        d=d[key]
                    else:
                        d[keys[-1]]=copy.deepcopy(override.get('value'))
        return n
    props={k:copy.deepcopy(v) for k,v in obj.items() if k not in ('_children','_components','_parent','_prefab','_id')}
    comps=[]
    for c in obj.get('_components',[]):
        if '__id__' in c:c=data[c['__id__']]
        if c and c.get('__type__') in keep:
            clone=clean(c);clone['_sourceFileId']=(c.get('__prefab') or {}).get('fileId','');comps.append(clone)
    n={'props':props,'components':comps,'children':[tree(u,c['__id__']) for c in obj.get('_children',[])],'fileId':prefab.get('fileId',uid(str(idx))),'source':u}
    return n
def node(name,x=0,y=0,w=0,h=0):
    return {'props':{'__type__':'cc.Node','_name':name,'_active':True,'_layer':33554432,'_lpos':vec(x,y),'_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1},'_lscale':vec(1,1,1),'_euler':vec()},'components':[{'__type__':'cc.UITransform','_contentSize':{'__type__':'cc.Size','width':w,'height':h},'_anchorPoint':{'__type__':'cc.Vec2','x':.5,'y':.5}}],'children':[],'fileId':uid(name),'source':None}
def sf(name):return {'__uuid__':assets['sprites'][name]['uuid'],'__expectedType__':'cc.SpriteFrame'}
def label(name,text,x,y,w,h,size=22):
    n=node(name,x,y,w,h);n['components'].append({'__type__':'cc.Label','_string':text,'_fontSize':size,'_lineHeight':size+4,'_horizontalAlign':1,'_verticalAlign':1,'_useSystemFont':True,'_fontFamily':'Arial','_overflow':2,'_color':{'__type__':'cc.Color','r':250,'g':230,'b':185,'a':255}});return n
def serialize(root,name,u,scene=False):
    out=[{'__type__':'cc.SceneAsset' if scene else 'cc.Prefab','_name':name,('scene' if scene else 'data'):{'__id__':1}}]
    def add(n,parent=None,isroot=False):
        idx=len(out);obj=copy.deepcopy(n['props']);out.append(obj)
        obj['_parent']={'__id__':parent} if parent is not None else None;obj['_children']=[];obj['_components']=[];obj['_id']=uid(name+'/'+str(idx))
        if scene and isroot:obj['__type__']='cc.Scene';obj['_id']=u;obj['autoReleaseAssets']=False
        if not scene:
            obj['_prefab']={'__id__':len(out)};out.append({'__type__':'cc.PrefabInfo','root':{'__id__':1},'asset':{'__id__':0},'fileId':n['fileId']+'_'+str(idx)})
        else:obj['_prefab']=None
        for c in n['components']:
            clone=copy.deepcopy(c);clone.pop('_sourceFileId',None);clone['node']={'__id__':idx};clone['_enabled']=True;clone['__prefab']=None;clone['_id']=uid(name+'/component/'+str(len(out)))
            if len(clone['__type__'])==36:clone['__type__']=classid(clone['__type__'])
            obj['_components'].append({'__id__':len(out)});out.append(clone)
        for child in n['children']:obj['_children'].append({'__id__':add(child,idx)})
        return idx
    add(root,isroot=True)
    # Named editor references are resolved now, never searched/created at runtime.
    nodes={}
    def paths(i,path=''):
        obj=out[i];path=path+'/'+obj['_name'];nodes[path]=i
        for c in obj['_children']:paths(c['__id__'],path)
    paths(1)
    def resolve(v):
        if isinstance(v,list):return [resolve(x) for x in v]
        if not isinstance(v,dict):return v
        if '$node' in v:
            matches=[i for path,i in nodes.items() if path.endswith('/'+v['$node'])]
            assert len(matches)==1,(v,matches)
            i=matches[0]
            if '$component' in v:i=next(c['__id__'] for c in out[i]['_components'] if out[c['__id__']]['__type__']==v['$component'])
            return {'__id__':i}
        return {k:resolve(x) for k,x in v.items()}
    return resolve(out)
def writeprefab(n,name,u=None,folder='playable'):
    u=u or uid(name);path=A/'prefabs'/folder/(name+'.prefab');save(path,serialize(n,name,u));meta(path,u,'prefab');return u
def ref(path,component=None):return {'$node':path,**({'$component':component} if component else {})}

# Expand all original nested instances at authoring time and serialize ordinary editor records.
trees={name:tree(u) for name,u in byname.items()}
for name,n in trees.items():writeprefab(n,name,byname[name],'original')

card=copy.deepcopy(trees['Card_1']);card['props']['_name']='PlayingCard'
find(card,'BG/Need_Root')['props']['_active']=False
for n in walk(card):
    if n['props']['_name'] in ('Max_Tip','FXNode'):n['props']['_active']=False
card['components'].append({'__type__':uid('CardView'),'rank':ref('PlayingCard/BG/Num','cc.Sprite'),'suit':ref('PlayingCard/BG/Flower','cc.Sprite'),'picture':ref('PlayingCard/BG/Picture','cc.Sprite'),'jokerMark':ref('PlayingCard/BG/JokerMark'),'redRanks':[sf(f'Poker_R_{i:02}') for i in range(1,14)],'blackRanks':[sf(f'Poker_B_{i:02}') for i in range(1,14)],'suits':[sf(f'PokerSuit_{i:02}') for i in range(1,13)],'jokers':[sf('Poker_J_01'),sf('Poker_J_02')]})
carduid=writeprefab(card,'PlayingCard')

table=copy.deepcopy(trees['GameView']);table['props']['_name']='RummyTable'
table['children']=[n for n in table['children'] if n['props']['_name']=='MainGame']
main=find(table,'MainGame')
for n in main['children']:
    if n['props']['_name'] in ('Effect','End','SkyEye','SendPokerNode','OpenPage','Node'):n['props']['_active']=False
for n in walk(table):
    n['components']=[c for c in n['components'] if c['__type__'] not in ('cc.Widget','cc.Camera')]
    if n['props']['_name'] in ('FX_Win','FX_Hit','CountDown','CountDown2','Win','Crown'):n['props']['_active']=False
for key in ['Btn_01','Btn_04','Btn_05']:
    n=find(main,'Btn/'+key);n['props']['_active']=True;n['components'].append({'__type__':'cc.Button','_transition':3,'_zoomScale':1.04,'_interactable':True})
for i in range(1,6):
    seat=find(main,f'Players/{i:02}')
    for n in walk(seat):
        if n['props']['_name']=='TXT_Name':comp(n,'cc.Label')['_string']='You' if i==5 else 'Player '+str(i)
    writeprefab(seat,'PlayerSeat'+str(i))

hand=find(main,'Poker/PlayerPoker/05/Main_Card/Card_Layout');hand['children']=[]
hand['components']=[c for c in hand['components'] if c['__type__']!='cc.Layout']
# CardMain's hand lives on this original baseline. Slots are saved in the prefab.
for i in range(14):
    slot=node(f'CardSlot{i+1:02}',-468+i*72,0,110,200)
    hand['children'].append(slot)
handpath='MainGame/Poker/PlayerPoker/05/Main_Card/Card_Layout'
status=label('LocalStatus','Draw a card',0,-112,560,32,20);main['children'].append(status)
table['components'].append({'__type__':uid('RummyGame'),'cardPrefab':{'__uuid__':carduid,'__expectedType__':'cc.Prefab'},'slots':[ref(handpath+f'/CardSlot{i+1:02}') for i in range(14)],'discardRoot':ref('MainGame/Poker/TablePoker/DisPoker'),'wildRoot':ref('MainGame/Poker/TablePoker/WildPoker'),'drawButton':ref('MainGame/Poker/TablePoker/TableBTN/Deck'),'openButton':ref('MainGame/Poker/TablePoker/TableBTN/Dis'),'actionButton':ref('MainGame/Btn/Btn_01'),'sortButton':ref('MainGame/Btn/Btn_04'),'dropButton':ref('MainGame/Btn/Btn_05'),'statusLabel':ref('MainGame/LocalStatus','cc.Label'),'actionLabel':ref('MainGame/Btn/Btn_01/Label','cc.Label')})
tableuid=writeprefab(table,'RummyTable')

scene=node('Rummy');canvas=node('Canvas',568,320,1136,640);scene['children']=[canvas]
camera=node('Camera');camera['props']['_lpos']=vec(0,0,1000);camera['components']=[{'__type__':'cc.Camera','_projection':0,'_orthoHeight':320,'_near':0,'_far':2000,'_clearFlags':7,'_visibility':33554432,'_color':{'__type__':'cc.Color','r':10,'g':12,'b':16,'a':255}}]
canvas['components'].append({'__type__':'cc.Canvas','_cameraComponent':ref('Canvas/Camera','cc.Camera'),'_alignCanvasWithScreen':True})
canvas['children']=[camera,table]
sceneuid=uid('Rummy.scene');path=A/'scenes/Rummy.scene';save(path,serialize(scene,'Rummy',sceneuid,True));meta(path,sceneuid,'scene')
save(P/'settings/v2/packages/project.json',{'__version__':'1.0.6','general':{'designResolution':{'width':1136,'height':640,'fitWidth':False,'fitHeight':True}}})
save(P/'build-config.json',{'name':'Rummy','platform':'web-mobile','buildPath':'project://build','debug':True,'sourceMaps':True,'startScene':sceneuid,'scenes':[{'url':'db://assets/scenes/Rummy.scene','uuid':sceneuid}],'packages':{'web-mobile':{'orientation':'landscape'}}})
for name in ['CardView','RummyGame','Rules']:meta(A/'scripts'/(name+'.ts'),uid(name),'typescript')
print('Authored Rummy.scene, RummyTable, PlayingCard, five seat prefabs and original prefabs')
