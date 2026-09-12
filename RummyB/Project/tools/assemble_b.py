"""Materialize shipped prefab instances and author a static editor scene."""
import copy,json,uuid
from pathlib import Path
from recover_b import PROJECT,ASSETS,save,meta
from prefab_metadata import attach_prefab_info
from test_buttons import add_test_buttons
from loading_overlay import add_loading_overlay
from notice_dialog import add_notice_dialog

files=[p for p in (ASSETS/'prefabs').glob('*.prefab') if p.stem!='OfflineApp']
raw={json.loads(Path(str(p)+'.meta').read_bytes())['uuid']:json.loads(p.read_bytes()) for p in files}
names={p.stem:json.loads(Path(str(p)+'.meta').read_bytes())['uuid'] for p in files}
VALUE={'cc.Vec2','cc.Vec3','cc.Vec4','cc.Quat','cc.Color','cc.Size','cc.Rect'}

def hydrate(objects):
    memo={}
    def visit(v):
        if isinstance(v,list):return [visit(x) for x in v]
        if not isinstance(v,dict):return v
        if '__id__' in v:return visit(objects[v['__id__']])
        if id(v) in memo:return memo[id(v)]
        out={};memo[id(v)]=out
        for k,x in v.items():out[k]=visit(x)
        return out
    return visit(objects[0])

def prefab(uid,chain=()):
    if uid in chain:raise ValueError('Recursive prefab '+uid)
    root=hydrate(raw[uid])['data']
    def materialize(node):
        info=node.get('_prefab') or {};asset=info.get('asset') or {};other=asset.get('__uuid__')
        if other and other!=uid:
            replacement=prefab(other,chain+(uid,));instance=info.get('instance') or {}
            lookup={}
            def collect(n):
                lookup[(n.get('_prefab') or {}).get('fileId')]=n
                for c in n.get('_components',[]):
                    if c:lookup[(c.get('__prefab') or {}).get('fileId')]=c
                for c in n.get('_children',[]):collect(c)
            collect(replacement)
            for override in instance.get('propertyOverrides') or []:
                ids=(override.get('targetInfo') or {}).get('localID',[])
                target=lookup.get(ids[-1]) if ids else replacement
                path=override.get('propertyPath',[])
                if target is not None and len(path)==1:target[path[0]]=override.get('value')
            for key in ('_parent','_name','_lpos','_lrot','_lscale','_active'):
                if key in node:replacement[key]=node[key]
            node.clear();node.update(replacement)
            seen=set()
            def rewire(value):
                if not isinstance(value,(dict,list)) or id(value) in seen:return
                seen.add(id(value))
                for key,item in (list(value.items()) if isinstance(value,dict) else enumerate(value)):
                    if item is replacement:value[key]=node
                    else:rewire(item)
            rewire(node)
        for child in node.get('_children',[]):
            materialize(child);child['_parent']=node
    materialize(root)
    return root

def serialize(root,scene=False):
    out=[];memo={}
    def visit(v):
        if isinstance(v,list):return [visit(x) for x in v if x is not None]
        if not isinstance(v,dict):return v
        typ=v.get('__type__','')
        if typ and typ not in VALUE and typ!='TypedArray':
            if id(v) in memo:return {'__id__':memo[id(v)]}
            i=len(out);memo[id(v)]=i;obj={};out.append(obj)
            for k,x in v.items():
                if k in ('_prefab','__prefab','_id','__editorExtras__'):continue
                obj[k]=visit(x)
            if len(typ)==36:
                h=typ.replace('-','');abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
                obj['__type__']=h[:5]+''.join(abc[int(h[j:j+3],16)>>6]+abc[int(h[j:j+3],16)&63] for j in range(5,32,3))
            if typ in ('cc.Node','cc.Scene'):
                obj.setdefault('_name','Node');obj.setdefault('_active',True);obj.setdefault('_layer',33554432)
                obj.setdefault('_children',[]);obj.setdefault('_components',[])
                obj.setdefault('_lpos',{'__type__':'cc.Vec3','x':0,'y':0,'z':0})
                obj.setdefault('_lrot',{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1})
                obj.setdefault('_lscale',{'__type__':'cc.Vec3','x':1,'y':1,'z':1})
                obj.setdefault('_euler',{'__type__':'cc.Vec3','x':0,'y':0,'z':0})
            return {'__id__':i}
        return {k:visit(x) for k,x in v.items()}
    visit(root)
    add_test_buttons(out)
    add_loading_overlay(out)
    add_notice_dialog(out)
    from dealer_spine import apply as bind_dealer_spine
    bind_dealer_spine(out)
    if out[0].get('__type__')=='cc.Prefab':attach_prefab_info(out)
    return out

def node(name,x=0,y=0,w=1344,h=756):
    n={'__type__':'cc.Node','_name':name,'_children':[],'_components':[],'_lpos':{'__type__':'cc.Vec3','x':x,'y':y,'z':0}}
    n['_components'].append({'__type__':'cc.UITransform','node':n,'_contentSize':{'__type__':'cc.Size','width':w,'height':h},'_anchorPoint':{'__type__':'cc.Vec2','x':.5,'y':.5}})
    return n

def walk(n):
    yield n
    for c in n.get('_children',[]):yield from walk(c)

def main():
    restored={name:prefab(uid) for name,uid in names.items()}
    sprites={s['name']:s['uuid'] for s in json.loads((PROJECT/'tools/recovery-report.json').read_bytes())['sprites']}
    def sf(name):return {'__uuid__':sprites[name],'__expectedType__':'cc.SpriteFrame'}
    materialBindings=json.loads((PROJECT/'tools/material-bindings.json').read_bytes())
    clipPaths={}
    for clip in (ASSETS/'animations').glob('*.anim'):
        uid=json.loads(Path(str(clip)+'.meta').read_bytes())['uuid']
        clipPaths[uid]=[o['path'] for o in json.loads(clip.read_bytes()) if o.get('__type__')=='cc.animation.HierarchyPath']
    def pathExists(n,path):
        for part in filter(None,path.split('/')):
            n=next((c for c in n.get('_children',[]) if c.get('_name')==part),None)
            if n is None:return False
        return True
    def prepare(root):
        for n in walk(root):
            for c in n.get('_components',[]):
                if c.get('__type__')=='cc.Animation':
                    if n.get('_name')=='StartGame':c['playOnLoad']=True
                    c['_clips']=[r for r in c.get('_clips',[]) if all(pathExists(n,p) for p in clipPaths.get(r.get('__uuid__'),[]))]
                    if c.get('_defaultClip') not in c['_clips']:c['_defaultClip']=None
                if c.get('__type__')=='cc.Sprite' and not c.get('_spriteFrame') and n.get('_name') in sprites:
                    c['_spriteFrame']=sf(n['_name'])
                if c.get('__type__')=='cc.Sprite':
                    key=n.get('_name','')+'|'+(c.get('_spriteFrame') or {}).get('__uuid__','')
                    if key in materialBindings:c['_customMaterial']={'__uuid__':materialBindings[key]}
            if n.get('_name')=='Base_Poker_Black_FNT':
                n['_components']=[c for c in n['_components'] if c.get('__type__') not in ('cc.Label','cc.Sprite')]
                n['_components'].append({'__type__':'cc.Sprite','node':n,'_spriteFrame':sf('Base_Poker_Black_FNT_1'),'_sizeMode':0})
    for root in restored.values():prepare(root)
    for name,n in restored.items():
        n['_parent']=None
        save(ASSETS/'prefabs'/(name+'.prefab'),serialize({'__type__':'cc.Prefab','_name':name,'data':n}))
    scene={'__type__':'cc.Scene','_name':'RummyB','_children':[],'_components':[],'_parent':None,'autoReleaseAssets':False}
    canvas=node('Canvas',672,378);canvas['_parent']=scene;scene['_children']=[canvas]
    camera=node('Camera',0,0);camera['_lpos']['z']=1000;camera['_parent']=canvas;canvas['_children'].append(camera)
    cam={'__type__':'cc.Camera','node':camera,'_projection':0,'_orthoHeight':378,'_near':.1,'_far':2000,'_visibility':33554432,'_clearFlags':7,'_clearColor':{'__type__':'cc.Color','r':15,'g':28,'b':33,'a':255},'_rect':{'__type__':'cc.Rect','x':0,'y':0,'width':1,'height':1}}
    camera['_components'].append(cam);canvas['_components'].append({'__type__':'cc.Canvas','node':canvas,'_cameraComponent':cam,'_alignCanvasWithScreen':True})
    app=restored['AppView'];app['_parent']=canvas;canvas['_children'].append(app)
    for n in walk(app):
        if n.get('_name') in ('TableView','Help','RoomMenu','ResultView','ChangeAvatorView'):n['_active']=False
    def find(n,name):return next(x for x in walk(n) if x.get('_name')==name)
    def label(n,text,size=22):
        c={'__type__':'cc.Label','node':n,'_string':text,'_fontSize':size,'_lineHeight':size+4,'_horizontalAlign':1,'_verticalAlign':1,'_overflow':2,'_useSystemFont':True,'_fontFamily':'Arial','_color':{'__type__':'cc.Color','r':255,'g':245,'b':215,'a':255}}
        n['_components'].append(c);return c
    def append(parent,child):parent['_children'].append(child);child['_parent']=parent
    statusNode=node('Status',0,-350,1180,36);append(app,statusNode);status=label(statusNode,'',18)
    lobby=find(app,'LobbyView');table=find(app,'TableView');rooms=find(lobby,'TableButtonGroup')['_children']
    positions=[(-129.059,-60),(187.5,80),(502.5,80),(187.5,-200),(502.5,-200)]
    for i,r in enumerate(rooms):
        r['_lpos']={'__type__':'cc.Vec3','x':positions[i][0],'y':positions[i][1],'z':0}
        for n in walk(r):
            if n.get('_name')=='TableIcon':
                for child in n.get('_children',[]):
                    if child.get('_name','').startswith('LV'):child['_active']=child['_name']=='LV'+str(i+1)
            if n.get('_name')=='LevelSprite':n['_active']=False
    cardGroup=find(find(table,'HandSettingView'),'CardGroup');cardGroup['_children']=[]
    cardGroup['_components']=[c for c in cardGroup['_components'] if c.get('__type__')!='cc.Layout']
    cards=[]
    for i in range(14):
        card=prefab(names['Card']);card['_name']='HandCard'+str(i+1);card['_lpos']={'__type__':'cc.Vec3','x':-430+i*60,'y':0,'z':0};append(cardGroup,card);cards.append(card)
    # Keep original B controls and menu; no development toolbar in the scene.
    for n in walk(app):
        for c in n.get('_components',[]):
            if c.get('__type__') in ('cc.Button','cc.Toggle'):
                c['clickEvents']=[];c['checkEvents']=[];c['_interactable']=True
    menu=find(app,'MenuVertical')
    find(menu,'InputLayer')['_active']=False
    find(menu,'UI_Menu_Board_Mask')['_active']=False
    find(menu,'UI_Menu_Report_BTN')['_active']=False
    find(menu,'Bottom')['_lpos']['y']=-339
    # The shipped result layout already contains all five rows and hand slots.
    result=find(app,'ResultView')
    for n in walk(result):
        for c in n.get('_components',[]):
            if c.get('__type__')=='cc.UIOpacity':c['_opacity']=255
    picker=find(app,'ChangeAvatorView')
    for i,n in enumerate(find(picker,'Group')['_children']):
        for c in n['_components']:
            if c.get('__type__')=='cc.Sprite':c['_spriteFrame']=sf('UI_Avatar_'+str(i+1))
    roommenu=find(app,'RoomMenu')
    find(roommenu,'BG')['_active']=False
    find(roommenu,'WifiLabel')['_active']=False
    find(roommenu,'Label-001')['_active']=False
    for i,row in enumerate(find(roommenu,'Board')['_children']):
        for c in find(row,'Level')['_components']:
            if c.get('__type__')=='cc.Sprite':c['_spriteFrame']=sf('Lobby_Lv'+str(i+1)+'_MSG')
    for n in table['_children']:
        if any(c.get('_name')=='Base_Win_Ribbon' for c in n.get('_children',[])):n['_name']='PlayerWin'
    prepare(app)
    scriptid=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/OfflineGame'))
    script=ASSETS/'scripts/OfflineGame.ts';meta(script,scriptid,'typescript','4.0.24')
    for name in ['Round','Rules']:meta(ASSETS/'scripts'/(name+'.ts'),str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/'+name)),'typescript','4.0.24')
    audio=json.loads((PROJECT/'tools/audio-map.json').read_bytes())
    music={'__type__':'cc.AudioSource','node':app,'_clip':{'__uuid__':audio['Base_BG_01']},'_loop':True,'_playOnAwake':True,'_volume':.35};app['_components'].append(music)
    app['_components'].append({'__type__':scriptid,'node':app,'app':app,'rooms':rooms,'cards':cards,'status':status,'music':music,'backgroundMusic':{'__uuid__':audio['Base_BG_01']},'winMusic':{'__uuid__':audio['Base_BG_02']},'cardSound':{'__uuid__':audio['Base_Poker_01']},
        'blackRanks':[sf('Base_Poker_Black_FNT_'+str(i)) for i in range(1,15)],'redRanks':[sf('Base_Poker_Red_FNT_'+str(i)) for i in range(1,15)],
        'suits':[sf('Base_Poker_'+s) for s in ['Club','Diamond','Heart','Spades']],
        'portraits':[sf('Base_Poker_'+color+'_'+rank) for color in ['Black','Red'] for rank in ['Jack','Queen','King']]+[sf('Base_Poker_Red_Joker')],
        'avatars':[sf('UI_Avatar_'+str(i)) for i in range(1,25)]})
    app['_parent']=None
    offlineid=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/OfflineApp'))
    save(ASSETS/'prefabs/OfflineApp.prefab',serialize({'__type__':'cc.Prefab','_name':'OfflineApp','data':app}));meta(ASSETS/'prefabs/OfflineApp.prefab',offlineid,'prefab')
    app['_parent']=canvas
    sceneid=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/scene'))
    path=ASSETS/'scenes/RummyB.scene';save(path,serialize({'__type__':'cc.SceneAsset','_name':'RummyB','scene':scene},True));meta(path,sceneid,'scene')
    save(PROJECT/'build-config.json',{'name':'RummyB','platform':'web-mobile','buildPath':'project://build','debug':True,'sourceMaps':True,'startScene':sceneid,'scenes':[{'url':'db://assets/scenes/RummyB.scene','uuid':sceneid}],'packages':{'web-mobile':{'orientation':'landscape'}}})
    print('Normalized',len(restored),'prefabs; authored RummyB.scene')

if __name__=='__main__':
    main()
    from split_loading import main as split_loading
    split_loading()
