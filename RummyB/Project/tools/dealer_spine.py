"""Bind the recovered dealer Spine to the table, keeping it out of the lobby."""
import json
from pathlib import Path
from prefab_metadata import attach_prefab_info

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT/'assets/spine/Base_Dealer/Base_Dealer.json'
UUID = json.loads(Path(str(DATA)+'.meta').read_bytes())['uuid']

def apply(objects):
    # Remove the old off-screen lobby instance from the hierarchy.
    for c in list(objects):
        if c.get('__type__') != 'sp.Skeleton' or c.get('_skeletonData', {}).get('__uuid__') != UUID:
            continue
        index = c['node']['__id__']; n = objects[index]
        if n.get('_name') == 'DealerSpine':
            continue
        parent = objects[n['_parent']['__id__']]
        parent['_children'] = [r for r in parent['_children'] if r['__id__'] != index]
    bounds = json.loads(DATA.read_bytes())['skeleton']
    for index, n in enumerate(list(objects)):
        if n.get('__type__') != 'cc.Node' or n.get('_name') != 'Base_Dealer':
            continue
        if any(objects[r['__id__']].get('_name') == 'DealerSpine' for r in n['_children']):
            continue
        n['_components'] = [r for r in n['_components'] if objects[r['__id__']].get('__type__') != 'cc.Sprite']
        transform = next(objects[r['__id__']] for r in n['_components'] if objects[r['__id__']]['__type__'] == 'cc.UITransform')
        size = transform['_contentSize']; scale = min(size['width']/bounds['width'], size['height']/bounds['height'])
        i = len(objects)
        n['_children'].append({'__id__': i})
        objects.extend([
            {'__type__':'cc.Node','_name':'DealerSpine','_active':True,'_layer':n.get('_layer',33554432),
             '_parent':{'__id__':index},'_children':[], '_components':[{'__id__':i+1},{'__id__':i+2}],
             '_lpos':{'__type__':'cc.Vec3','x':-(bounds['x']+bounds['width']/2)*scale,'y':-(bounds['y']+bounds['height']/2)*scale,'z':0},
             '_lscale':{'__type__':'cc.Vec3','x':scale,'y':scale,'z':1},'_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1}},
            {'__type__':'cc.UITransform','node':{'__id__':i},'_contentSize':{'__type__':'cc.Size','width':bounds['width'],'height':bounds['height']}},
            {'__type__':'sp.Skeleton','node':{'__id__':i},'_enabled':True,
             '_skeletonData':{'__uuid__':UUID,'__expectedType__':'sp.SkeletonData'},
             'defaultSkin':'default','defaultAnimation':'idle','loop':True,'_timeScale':1,
             '_premultipliedAlpha':False,'_color':{'__type__':'cc.Color','r':255,'g':255,'b':255,'a':255}}
        ])
    # Prune detached nodes/components and remap object references.
    out = []; memo = {}
    def visit(v):
        if isinstance(v,list): return [visit(x) for x in v]
        if not isinstance(v,dict): return v
        if '__id__' not in v: return {k:visit(x) for k,x in v.items()}
        old=v['__id__']
        if old not in memo:
            memo[old]=len(out); out.append(None); out[memo[old]]=visit(objects[old])
        return {'__id__':memo[old]}
    visit({'__id__':0}); objects[:]=out

if __name__ == '__main__':
    for name in ['resources/deferred/TableView.prefab','prefabs/TableView.prefab','prefabs/OfflineApp.prefab','scenes/RummyB.scene']:
        path=ROOT/'assets'/name; objects=json.loads(path.read_bytes()); apply(objects)
        if path.suffix=='.prefab': attach_prefab_info(objects)
        path.write_text(json.dumps(objects,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(name)
