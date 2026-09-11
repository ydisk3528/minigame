"""Image-bound in-game notice dialog with an OK button."""
import json
from pathlib import Path
from prefab_metadata import attach_prefab_info

ROOT=Path(__file__).resolve().parents[1]

def dialog():
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
    root=node('NoticeDialog',None,0,0,4096,4096);objects[root]['_active']=False
    sprite(root,(0,0,0,175));component(root,{'__type__':'cc.BlockInputEvents'})
    frame=node('Frame',root,0,0,610,280);sprite(frame,(213,171,78,255))
    panel=node('Panel',frame,0,0,602,272);sprite(panel,(31,45,37,255))
    def label(i,text,size):
        component(i,{'__type__':'cc.Label','_string':text,'_fontSize':size,'_lineHeight':size+8,'_horizontalAlign':1,'_verticalAlign':1,'_useSystemFont':True,'_fontFamily':'Arial','_color':{'__type__':'cc.Color','r':255,'g':245,'b':218,'a':255}})
    message=node('Message',panel,0,42,560,120);label(message,'Your cards are already sorted.\nNo changes are needed.',28)
    ok=node('OK',panel,0,-83,180,60);sprite(ok,(53,119,64,255))
    title=node('Label',ok,0,0,180,60);label(title,'OK',28)
    return objects

def add_notice_dialog(objects):
    controller=next((o for o in objects if 'music' in o and 'cardSound' in o and 'app' in o),None)
    if controller is None:return False
    app=controller['app']['__id__']
    existing=next((r['__id__'] for r in objects[app]['_children'] if objects[r['__id__']].get('_name')=='NoticeDialog'),None)
    if existing is not None:return False
    offset=len(objects)
    def shift(v):
        if isinstance(v,list):return [shift(x) for x in v]
        if isinstance(v,dict):return {'__id__':v['__id__']+offset} if '__id__' in v else {k:shift(x) for k,x in v.items()}
        return v
    objects.extend(shift(dialog()));objects[offset]['_parent']={'__id__':app}
    objects[app]['_children'].append({'__id__':offset})
    for ref in objects[app]['_components']:
        c=objects[ref['__id__']]
        if 'music' in c and 'cardSound' in c:c['noticeDialog']={'__id__':offset}
    return True

if __name__=='__main__':
    from recover_b import save,meta
    import uuid
    for path in [ROOT/'assets/scenes/RummyB.scene',ROOT/'assets/prefabs/OfflineApp.prefab']:
        objects=json.loads(path.read_bytes())
        if add_notice_dialog(objects):
            if path.suffix=='.prefab':attach_prefab_info(objects)
            save(path,objects);print(path.name)
    # Standalone editor asset, sharing the same authored layout as the embedded nodes.
    data=dialog()
    def shift(v):
        if isinstance(v,list):return [shift(x) for x in v]
        if isinstance(v,dict):return {'__id__':v['__id__']+1} if '__id__' in v else {k:shift(x) for k,x in v.items()}
        return v
    data=[{'__type__':'cc.Prefab','_name':'NoticeDialog','data':{'__id__':1}}]+shift(data)
    data[1]['_active']=True
    attach_prefab_info(data)
    p=ROOT/'assets/prefabs/NoticeDialog.prefab';save(p,data)
    meta(p,str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/NoticeDialog')),'prefab')
