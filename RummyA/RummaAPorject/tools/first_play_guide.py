"""Author image-bound first-play guide; run after restoring the table prefab."""
import copy,json,uuid
from pathlib import Path
from PIL import Image
from split_loading import save,meta,shift
from prefab_metadata import attach_prefab_info
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'assets'

def main():
    path=A/'art/TutorialHand.png';u=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-a/TutorialHand'))
    m=json.loads((A/'art/ConfettiWhite.png.meta').read_bytes());old=m['uuid']
    m=json.loads(json.dumps(m).replace(old,u).replace('ConfettiWhite','TutorialHand'))
    w,h=Image.open(path).size;d=m['subMetas']['f9941']['userData']
    d.update(width=w,height=h,rawWidth=w,rawHeight=h)
    d['vertices']={'rawPosition':[-w/2,-h/2,0,w/2,-h/2,0,-w/2,h/2,0,w/2,h/2,0],'indexes':[0,1,2,2,1,3],'uv':[0,h,w,h,0,0,w,0],'nuv':[0,0,1,0,0,1,1,1],'minPos':[-w/2,-h/2,0],'maxPos':[w/2,h/2,0]}
    save(Path(str(path)+'.meta'),m)
    white=json.loads((A/'art/ConfettiWhite.png.meta').read_bytes())['subMetas']['f9941']['uuid']
    o=[]
    def component(i,c):
        c.update(node={'__id__':i},_enabled=True);o[i]['_components'].append({'__id__':len(o)});o.append(c)
    def node(name,parent,x,y,w,h):
        i=len(o);o.append({'__type__':'cc.Node','_name':name,'_active':True,'_layer':33554432,'_parent':{'__id__':parent} if parent is not None else None,'_children':[],'_components':[],'_lpos':{'__type__':'cc.Vec3','x':x,'y':y,'z':0},'_lscale':{'__type__':'cc.Vec3','x':1,'y':1,'z':1},'_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1}})
        if parent is not None:o[parent]['_children'].append({'__id__':i})
        component(i,{'__type__':'cc.UITransform','_contentSize':{'__type__':'cc.Size','width':w,'height':h},'_anchorPoint':{'__type__':'cc.Vec2','x':.5,'y':.5}})
        return i
    def sprite(i,frame,color):component(i,{'__type__':'cc.Sprite','_spriteFrame':{'__uuid__':frame,'__expectedType__':'cc.SpriteFrame'},'_sizeMode':0,'_color':dict(__type__='cc.Color',**dict(zip('rgba',color)))})
    root=node('FirstPlayGuide',None,0,0,1136,640);o[root]['_active']=False
    for name,x,y,w,h in [('Top',0,236,8192,160),('Bottom',0,-212,8192,224),('Left',-339,28,458,256),('Right',339,28,458,256)]:
        i=node(name,root,x,y,w,h);sprite(i,white,(0,0,0,180));component(i,{'__type__':'cc.BlockInputEvents'})
    instruction=node('Instruction',root,0,255,690,66);sprite(instruction,white,(24,30,26,245))
    label=node('Label',instruction,0,0,676,60)
    component(label,{'__type__':'cc.Label','_string':'1 / 3   Tap the highlighted pile to draw a card.','_fontSize':25,'_lineHeight':32,'_horizontalAlign':1,'_verticalAlign':1,'_useSystemFont':True,'_fontFamily':'Arial','_color':{'__type__':'cc.Color','r':255,'g':241,'b':192,'a':255}})
    finger=node('Finger',root,0,0,104,104);sprite(finger,u+'@f9941',(255,255,255,255))
    o[o[finger]['_components'][0]['__id__']]['_anchorPoint']={'__type__':'cc.Vec2','x':.51,'y':.95}
    prefab=[{'__type__':'cc.Prefab','_name':'FirstPlayGuide','data':{'__id__':1}}]+shift(o,1);prefab[1]['_active']=True;attach_prefab_info(prefab)
    path=A/'prefabs/playable/FirstPlayGuide.prefab';save(path,prefab);meta(path,'prefab')
    table_path=A/'resources/deferred/RummyTable.prefab';data=json.loads(table_path.read_bytes());root_index=data[0]['data']['__id__'];controller=next(c for c in data if 'shuffleCards' in c)
    if not controller.get('firstPlayGuide'):
        offset=len(data);data.extend(shift(o,offset));data[offset]['_parent']={'__id__':root_index};data[root_index]['_children'].append({'__id__':offset});controller['firstPlayGuide']={'__id__':offset};attach_prefab_info(data);save(table_path,data)
    print('Authored FirstPlayGuide: image-bound pointer, four alpha-180 blocking panels')
if __name__=='__main__':main()
