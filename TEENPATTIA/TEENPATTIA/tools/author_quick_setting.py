"""Bind the recovered quickSetting prefab without rebuilding other scene objects."""
from editor import *

name='TeenPattiQuickSetting';u=str(uuid.uuid5(uuid.NAMESPACE_URL,'teenpatti-local/'+name))
path=ASSETS/'scenes/TeenPatti.scene';scene=json.loads(path.read_bytes());app=next(o for o in scene if 'lobbyRoot'in o)
if 'quickSettingRoot'in app:raise SystemExit('Quick setting already authored; edit its prefab in Creator.')
root=prefab(names['quickSetting']);root['_name']=name;root['_parent']=None
for n in walk(root):
    n['_layer']=33554432
    for c in n.get('_components',[]):
        if c['__type__']=='cc.Button':c['clickEvents']=[]
        if c['__type__']=='cc.Label':c['_useSystemFont']=True;c['_fontFamily']='Arial'
        if c['__type__']=='cc.UIOpacity':c['_opacity']=255
    n['_components']=[c for c in n.get('_components',[]) if c['__type__']!='cc.Widget']
shade=node('Shade',0,0,1136,640);shade['_parent']=root
shade['_components'] += [{'__type__':'cc.Sprite','node':shade,'_sizeMode':0,'_spriteFrame':{'__uuid__':next(s['uuid'] for s in json.loads((PROJECT/'tools/recovery-report.json').read_bytes())['sprites'] if s['name']=='data_bg')},'_color':{'__type__':'cc.Color','r':0,'g':0,'b':0,'a':170}}, {'__type__':'cc.BlockInputEvents','node':shade}]
root['_children'].insert(0,shade)
data=serialize({'__type__':'cc.Prefab','_name':name,'data':root})
asset=ASSETS/'prefabs/playable'/(name+'.prefab');save(asset,data);meta(asset,u,'prefab')
offset=len(scene)-1
def remap(v):
    if isinstance(v,list):return [remap(x) for x in v]
    if isinstance(v,dict):
        if '__id__'in v:return {'__uuid__':u} if v['__id__']==0 else {'__id__':v['__id__']+offset}
        return {k:remap(x) for k,x in v.items()}
    return v
idx=data[0]['data']['__id__']+offset;scene.extend(remap(data[1:]));scene[idx]['_active']=False;scene[idx]['_parent']=app['node'].copy()
scene[app['node']['__id__']]['_children'].append({'__id__':idx});app['quickSettingRoot']={'__id__':idx};save(path,scene)
print('Recovered quickSetting layout, sprites, labels and buttons bound to scene.')
