"""One-time migration (also run after author-client.py); preserve authored prefab bindings."""
import copy,json,uuid
from pathlib import Path
from loading_overlay import overlay
from prefab_metadata import attach_prefab_info
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def meta(path,kind):
    p=Path(str(path)+'.meta')
    if not p.exists():save(p,{'ver':'1.1.50' if kind=='prefab' else '1.2.0','importer':kind,'imported':True,'uuid':str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-a/'+path.relative_to(A).as_posix())),'files':['.json'] if kind=='prefab' else [],'subMetas':{},'userData':{}})
def shift(v,offset):
    if isinstance(v,list):return [shift(x,offset) for x in v]
    if isinstance(v,dict):return {'__id__':v['__id__']+offset} if '__id__' in v else {k:shift(x,offset) for k,x in v.items()}
    return v
def compact(objects):
    used=set()
    def visit(v):
        if isinstance(v,list):
            for x in v:visit(x)
        elif isinstance(v,dict):
            if '__id__' in v:
                i=v['__id__']
                if i not in used:used.add(i);visit(objects[i])
            else:
                for x in v.values():visit(x)
    visit({'__id__':0});ids={old:new for new,old in enumerate(sorted(used))}
    def remap(v):
        if isinstance(v,list):return [remap(x) for x in v]
        if isinstance(v,dict):return {'__id__':ids[v['__id__']]} if '__id__' in v else {k:remap(x) for k,x in v.items()}
        return v
    return [remap(objects[i]) for i in sorted(used)]
def split_avatars(data,table):
    app=next(o for o in data if 'lobbyAvatar' in o)
    app.pop('avatarFrames',None)
    sprite=data[app['lobbyAvatar']['__id__']];source=data[sprite['node']['__id__']]
    transform=next(data[c['__id__']] for c in source['_components'] if data[c['__id__']].get('__type__')=='cc.UITransform')
    for i,frame in enumerate(table['avatarFrames']):
        node=copy.deepcopy(source);node.update(_name='LobbyAvatar',_parent=None,_children=[],_components=[{'__id__':2},{'__id__':3}],_prefab=None,_lscale={'__type__':'cc.Vec3','x':1,'y':1,'z':1})
        visual=copy.deepcopy(sprite);visual.update(node={'__id__':1},__prefab=None,_spriteFrame=frame)
        size=copy.deepcopy(transform);size.update(node={'__id__':1},__prefab=None)
        prefab=[{'__type__':'cc.Prefab','_name':'LobbyAvatar','data':{'__id__':1}},node,visual,size]
        attach_prefab_info(prefab);p=A/f'resources/deferred/Avatar{i}.prefab';save(p,prefab);meta(p,'prefab')
    sprite['_spriteFrame']=None
    lobby_path=A/'prefabs/playable/RummyLobby.prefab';lobby=json.loads(lobby_path.read_bytes())
    node=lobby[lobby[0]['data']['__id__']]
    for part in ['LobbyBar','Data','Photo','Img']:
        node=next(lobby[r['__id__']] for r in node['_children'] if lobby[r['__id__']]['_name']==part)
    next(lobby[r['__id__']] for r in node['_components'] if lobby[r['__id__']]['__type__']=='cc.Sprite')['_spriteFrame']=None
    save(lobby_path,lobby)


def migrate():
    scene=A/'scenes/Rummy.scene';data=json.loads(scene.read_bytes())
    app=next(o for o in data if 'lobbyAvatar' in o)
    if not app.get('table'):
        print('Scene already uses deferred table');return
    backup=ROOT/'temp/Rummy-before-loading.scene';save(backup,data)
    canvas=data[app['node']['__id__']]
    table=data[app['table']['__id__']];table_root=table['node']['__id__']
    app['avatarFrames']=copy.deepcopy(table['avatarFrames']);app['table']=None;app['effects']=None
    canvas['_children']=[r for r in canvas['_children'] if r['__id__']!=table_root]
    # Music remains an AudioSource on the scene, but its bound clip moves to an optional prefab.
    music=data[app['music']['__id__']];music_root=copy.deepcopy(data[music['node']['__id__']]);music_source=copy.deepcopy(music)
    music_root.update(_name='LobbyMusic',_parent=None,_children=[],_components=[{'__id__':2}],_prefab=None)
    music_source.update(node={'__id__':1},__prefab=None,_playOnAwake=False)
    bank=[{'__type__':'cc.Prefab','_name':'LobbyMusic','data':{'__id__':1}},music_root,music_source]
    attach_prefab_info(bank);music['_clip']=None;music['_playOnAwake']=False
    for folder in [A/'resources',A/'resources/deferred']:folder.mkdir(exist_ok=True);meta(folder,'directory')
    music_path=A/'resources/deferred/LobbyMusic.prefab';save(music_path,bank);meta(music_path,'prefab')
    source=A/'prefabs/playable/RummyTable.prefab';target=A/'resources/deferred/RummyTable.prefab'
    if target.exists():
        assert json.loads(Path(str(source)+'.meta').read_bytes())['uuid']==json.loads(Path(str(target)+'.meta').read_bytes())['uuid']
    source.replace(target);Path(str(source)+'.meta').replace(Path(str(target)+'.meta'))
    # Reuse a static image-bound spinner, both embedded and editable as a standalone prefab.
    offset=len(data);data.extend(shift(overlay(),offset));data[offset]['_parent']=copy.deepcopy(app['node'])
    canvas['_children'].append({'__id__':offset});app['loadingOverlay']={'__id__':offset}
    split_avatars(data,table)
    save(scene,compact(data))
    loading=[{'__type__':'cc.Prefab','_name':'LoadingOverlay','data':{'__id__':1}}]+shift(overlay(),1)
    loading[1]['_active']=True;attach_prefab_info(loading)
    p=A/'prefabs/playable/LoadingOverlay.prefab';save(p,loading);meta(p,'prefab')
    config=ROOT/'build-config.json';c=json.loads(config.read_bytes());c.update(debug=False,sourceMaps=False,md5Cache=True);save(config,c)
    print('Migrated table and music; scene now contains only lobby and small overlays')
if __name__=='__main__':migrate()
