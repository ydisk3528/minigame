"""One-time split of existing scene; all authored image bindings remain in prefabs."""
from editor import *
name='DeferredAssets';u=str(uuid.uuid5(uuid.NAMESPACE_URL,'teenpatti-local/'+name));meta(ASSETS/'scripts/DeferredAssets.ts',u,'typescript','4.0.24')
p=ASSETS/'scenes/TeenPatti.scene';d=json.loads(p.read_bytes());app=next(o for o in d if isinstance(o,dict) and 'lobbyRoot'in o)
if not app.get('tableRoot'):raise SystemExit('Already deferred; do not regenerate over editor changes.')
save(PROJECT/'tools/pre-deferred-scene.json',d)
folder=ASSETS/'resources/deferred';folder.mkdir(parents=True,exist_ok=True)
for name in ['TeenPattiTable','TeenPattiLobby','TeenPattiWinner','TeenPattiLose']:
    src=ASSETS/'prefabs/playable'/(name+'.prefab');dst=folder/src.name
    data=json.loads(src.read_bytes())
    if name in ['TeenPattiTable','TeenPattiLobby']:
        h=u.replace('-','');abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        encoded=h[:5]+''.join(abc[int(h[j:j+3],16)>>6]+abc[int(h[j:j+3],16)&63] for j in range(5,32,3))
        component={'__type__':encoded,'node':data[0]['data'],'faces':app['faces'] if name=='TeenPattiTable' else [],'portraits':app['portraits'],'sounds':app['sounds'] if name=='TeenPattiTable' else [],'soundNames':app['soundNames'] if name=='TeenPattiTable' else []}
        data[data[0]['data']['__id__']]['_components'].append({'__id__':len(data)});data.append(component)
    attach_prefab_info(data)
    save(src,data);src.replace(dst);Path(str(src)+'.meta').replace(Path(str(dst)+'.meta'))
canvas=d[app['node']['__id__']];remove={app[k]['__id__'] for k in ['lobbyRoot','tableRoot','winnerRoot','loseRoot']}
canvas['_children']=[r for r in canvas['_children'] if r['__id__'] not in remove]
for k in ['lobbyRoot','tableRoot','winnerRoot','loseRoot']:app[k]=None
for k in ['faces','portraits','sounds','soundNames']:app[k]=[]
# Loading uses system labels, so its spinner adds no image dependencies.
root=node('Loading',0,0,1136,640);root['_parent']=None
root['_components'].append({'__type__':'cc.BlockInputEvents','node':root})
def text(name,value,y,size,w=600):
    n=node(name,0,y,w,70);n['_parent']=root;root['_children'].append(n)
    n['_components'].append({'__type__':'cc.Label','node':n,'_string':value,'_fontSize':size,'_lineHeight':size+6,'_horizontalAlign':1,'_verticalAlign':1,'_useSystemFont':True,'_fontFamily':'Arial','_color':{'__type__':'cc.Color','r':255,'g':227,'b':151,'a':255}});return n
shade=node('Shade',0,0,1136,640);shade['_parent']=root;root['_children'].append(shade)
sf=next(s['uuid'] for s in json.loads((PROJECT/'tools/recovery-report.json').read_bytes())['sprites'] if s['name']=='data_bg')
shade['_components'].append({'__type__':'cc.Sprite','node':shade,'_sizeMode':0,'_spriteFrame':{'__uuid__':sf},'_color':{'__type__':'cc.Color','r':12,'g':7,'b':28,'a':255}})
text('Spinner','◌',60,68,80);text('LoadingLabel','Loading… 0%',-25,27)
for name,value,y in [('Retry','RETRY',-115),('Back','BACK',-190)]:
    n=text(name,value,y,25,240);n['_components'].append({'__type__':'cc.Button','node':n,'_interactable':True,'clickEvents':[]})
objects=serialize({'__type__':'cc.Prefab','_name':'Loading','data':root});offset=len(d)-1
def shift(v):
    if isinstance(v,list):return [shift(x) for x in v]
    if isinstance(v,dict):
        if '__id__'in v:return {'__id__':v['__id__']+offset}
        return {k:shift(x) for k,x in v.items() if k not in ['_prefab','__prefab']}
    return v
# Exclude prefab metadata for this scene-local loading UI.
extra=shift(objects[1:]);idx=objects[0]['data']['__id__']+offset;d.extend(extra);d[idx]['_parent']=app['node'].copy();d[idx]['_active']=False
canvas['_children'].append({'__id__':idx});app['loadingOverlay']={'__id__':idx}
keep=set()
def mark(v):
    if isinstance(v,list):
        for x in v:mark(x)
    elif isinstance(v,dict):
        if '__id__'in v:
            i=v['__id__']
            if i not in keep:keep.add(i);mark(d[i])
        else:
            for x in v.values():mark(x)
mark({'__id__':0});mapping={old:new for new,old in enumerate(sorted(keep))}
def remap(v):
    if isinstance(v,list):return [remap(x) for x in v]
    if isinstance(v,dict):return {'__id__':mapping[v['__id__']]} if '__id__'in v else {k:remap(x) for k,x in v.items()}
    return v
out=[remap(d[i]) for i in sorted(keep)];save(p,out)
print('Startup scene objects:',len(d),'->',len(out),'bytes:',p.stat().st_size)

config=PROJECT/'build-config.json';options=json.loads(config.read_bytes());options.update(debug=False,sourceMaps=False);save(config,options)
