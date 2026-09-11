"""Static loading overlay: bound white sprites form a rotating twelve-bar ring."""
import json,math
from pathlib import Path
from prefab_metadata import attach_prefab_info

ROOT=Path(__file__).resolve().parents[1]

def overlay():
    sprites=json.loads((ROOT/'tools/recovery-report.json').read_bytes())['sprites']
    white=next(s['uuid'] for s in sprites if s['name']=='default_sprite_splash')
    objects=[]
    def node(name,parent,x,y,w,h):
        i=len(objects)
        objects.append({'__type__':'cc.Node','_name':name,'_parent':{'__id__':parent} if parent is not None else None,
            '_children':[],'_components':[],'_active':True,'_layer':33554432,
            '_lpos':{'__type__':'cc.Vec3','x':x,'y':y,'z':0},
            '_lscale':{'__type__':'cc.Vec3','x':1,'y':1,'z':1},'_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1}})
        if parent is not None:objects[parent]['_children'].append({'__id__':i})
        component(i,{'__type__':'cc.UITransform','_contentSize':{'__type__':'cc.Size','width':w,'height':h}})
        return i
    def component(i,c):
        c['node']={'__id__':i};objects[i]['_components'].append({'__id__':len(objects)});objects.append(c)
    def sprite(i,color):
        component(i,{'__type__':'cc.Sprite','_spriteFrame':{'__uuid__':white},'_sizeMode':0,
            '_color':dict(__type__='cc.Color',**dict(zip('rgba',color)))})
    root=node('LoadingOverlay',None,0,0,4096,4096);objects[root]['_active']=False
    sprite(root,(0,0,0,175));component(root,{'__type__':'cc.BlockInputEvents'})
    ring=node('Spinner',root,0,36,110,110)
    for i in range(12):
        angle=i*math.pi/6
        n=node('Bar'+str(i),ring,math.sin(angle)*37,math.cos(angle)*37,7,20)
        objects[n]['_lrot'].update(z=math.sin(-angle/2),w=math.cos(-angle/2))
        objects[n]['_euler']={'__type__':'cc.Vec3','x':0,'y':0,'z':-i*30}
        sprite(n,(255,255,255,45+i*19))
    text=node('LoadingLabel',root,0,-62,520,100)
    component(text,{'__type__':'cc.Label','_string':'Loading… 0%','_fontSize':30,'_lineHeight':40,
        '_horizontalAlign':1,'_verticalAlign':1,'_useSystemFont':True,'_fontFamily':'Arial',
        '_color':{'__type__':'cc.Color','r':255,'g':255,'b':255,'a':255}})
    return objects

def add_loading_overlay(objects):
    controller=next((o for o in objects if 'music' in o and 'cardSound' in o and 'app' in o),None)
    if controller is None:return False
    app=controller['app']['__id__']
    existing=next((r['__id__'] for r in objects[app]['_children'] if objects[r['__id__']].get('_name')=='LoadingOverlay'),None)
    if existing is not None:return False
    offset=len(objects)
    def shift(v):
        if isinstance(v,list):return [shift(x) for x in v]
        if isinstance(v,dict):return {'__id__':v['__id__']+offset} if '__id__' in v else {k:shift(x) for k,x in v.items()}
        return v
    objects.extend(shift(overlay()));objects[offset]['_parent']={'__id__':app}
    objects[app]['_children'].append({'__id__':offset})
    for ref in objects[app]['_components']:
        c=objects[ref['__id__']]
        if 'music' in c and 'cardSound' in c:c['loadingOverlay']={'__id__':offset}
    return True

if __name__=='__main__':
    from recover_b import save,meta
    import uuid
    for path in [ROOT/'assets/scenes/RummyB.scene',ROOT/'assets/prefabs/OfflineApp.prefab']:
        objects=json.loads(path.read_bytes())
        if add_loading_overlay(objects):
            if path.suffix=='.prefab':attach_prefab_info(objects)
            save(path,objects);print(path.name)
    # Standalone editor asset, sharing the same authored layout as the embedded nodes.
    data=overlay()
    def shift(v):
        if isinstance(v,list):return [shift(x) for x in v]
        if isinstance(v,dict):return {'__id__':v['__id__']+1} if '__id__' in v else {k:shift(x) for k,x in v.items()}
        return v
    data=[{'__type__':'cc.Prefab','_name':'LoadingOverlay','data':{'__id__':1}}]+shift(data)
    data[1]['_active']=True
    attach_prefab_info(data)
    p=ROOT/'assets/prefabs/LoadingOverlay.prefab';save(p,data)
    meta(p,str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/LoadingOverlay')),'prefab')
