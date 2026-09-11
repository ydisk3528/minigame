"""Static loading overlay: bound white sprites form a rotating twelve-bar ring."""
import json,math
from pathlib import Path
from prefab_metadata import attach_prefab_info

ROOT=Path(__file__).resolve().parents[1]

def overlay():
    white=json.loads((ROOT/'assets/art/ConfettiWhite.png.meta').read_bytes())['subMetas']['f9941']['uuid']
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
