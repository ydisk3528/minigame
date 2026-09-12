"""Materialize shipped prefab instances and author a static editor scene."""
import copy,json,uuid
from pathlib import Path
from recover import PROJECT,ASSETS,save,meta
from prefab_metadata import attach_prefab_info




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
                if not override:continue
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





    if out[0].get('__type__')=='cc.Prefab':attach_prefab_info(out)
    return out

def node(name,x=0,y=0,w=1344,h=756):
    n={'__type__':'cc.Node','_name':name,'_children':[],'_components':[],'_lpos':{'__type__':'cc.Vec3','x':x,'y':y,'z':0}}
    n['_components'].append({'__type__':'cc.UITransform','node':n,'_contentSize':{'__type__':'cc.Size','width':w,'height':h},'_anchorPoint':{'__type__':'cc.Vec2','x':.5,'y':.5}})
    return n

def walk(n):
    yield n
    for c in n.get('_children',[]):yield from walk(c)
