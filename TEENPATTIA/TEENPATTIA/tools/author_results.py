"""Author result prefabs once; preserve existing scene objects and prefab edits."""
from editor import node, serialize, save, meta, PROJECT, ASSETS
import json, uuid, copy

sprites={s['name']:s['uuid'] for s in json.loads((PROJECT/'tools/recovery-report.json').read_bytes())['sprites']}
def uid(name):return str(uuid.uuid5(uuid.NAMESPACE_URL,'teenpatti-local/'+name))
def add(parent,child):parent['_children'].append(child);child['_parent']=parent;return child
def image(parent,name,asset,x,y,w,h):
    n=add(parent,node(name,x,y,w,h));n['_components'].append({'__type__':'cc.Sprite','node':n,'_sizeMode':0,'_spriteFrame':{'__uuid__':sprites[asset],'__expectedType__':'cc.SpriteFrame'}});return n
def label(parent,name,text,x,y,w,h,size,color=(255,238,186)):
    n=add(parent,node(name,x,y,w,h));n['_components'].append({'__type__':'cc.Label','node':n,'_string':text,'_fontSize':size,'_lineHeight':size+6,'_horizontalAlign':1,'_verticalAlign':1,'_overflow':2,'_useSystemFont':True,'_fontFamily':'Arial','_isBold':True,'_color':{'__type__':'cc.Color','r':color[0],'g':color[1],'b':color[2],'a':255}});return n
def button(parent,name,text,x,y,w):
    n=image(parent,name,'bnt_yellow',x,y,w,48);n['_components'].append({'__type__':'cc.Button','node':n,'_interactable':True,'_transition':3,'_zoomScale':1.04,'clickEvents':[]});label(n,'Label',text,0,0,w-10,44,21,(62,25,12))

scene_path=ASSETS/'scenes/TeenPatti.scene';scene=json.loads(scene_path.read_bytes())
app=next(o for o in scene if 'lobbyRoot'in o);canvas_index=app['node']['__id__']
if 'winnerRoot'in app:raise SystemExit('Result instances already exist; edit the prefabs and scene in Creator instead of regenerating.')
for won,name,field in [(True,'TeenPattiWinner','winnerRoot'),(False,'TeenPattiLose','loseRoot')]:
    root=node(name,0,0,1136,640);root['_parent']=None
    shade=image(root,'Shade','data_bg',0,0,1136,640)
    shade['_components'][-1]['_color']={'__type__':'cc.Color','r':0,'g':0,'b':0,'a':210}
    shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
    content=add(root,node('Content',0,0,690,570))
    image(content,'Background','BG_background',0,0,690,570)
    image(content,'Header','CountDownBg_PK',0,205,610,132)
    if won:
        image(content,'Crown','Win_01_Crown',0,259,86,65)
        image(content,'Ribbon','Win_01_Ribbon',0,198,315,122)
    label(content,'Title','WINNER' if won else 'LOSE',0,207,390,66,48,(255,227,138) if won else (207,207,244))
    label(content,'PlayerName','Player',0,142,540,30,22)
    label(content,'Amount','+0' if won else '-0',0,93,580,62,44,(255,224,97) if won else (236,151,168))
    label(content,'Balance','BALANCE  10,000',0,48,570,30,20)
    for i in range(3):image(content,f'Card{i+1}',f'Card_0_{i+2:02d}',(i-1)*91,-39,76,105)
    label(content,'HandName','HIGH CARD',0,-109,560,32,21)
    label(content,'WinnerInfo','',0,-147,590,44,19)
    button(content,'Lobby','LOBBY',-177,-213,154)
    button(content,'Continue','CONTINUE',28,-213,232)
    button(content,'Close','×',282,248,43)
    data=serialize({'__type__':'cc.Prefab','_name':name,'data':root})
    path=ASSETS/'prefabs/playable'/(name+'.prefab');save(path,data);meta(path,uid(name),'prefab')
    # Keep fileIds from the authored prefab, remap only local object indices.
    offset=len(scene)-1
    def remap(v):
        if isinstance(v,list):return [remap(x) for x in v]
        if isinstance(v,dict):
            if '__id__'in v:return {'__uuid__':uid(name)} if v['__id__']==0 else {'__id__':v['__id__']+offset}
            return {k:remap(x) for k,x in v.items()}
        return v
    instance=remap(copy.deepcopy(data[1:]));root_index=data[0]['data']['__id__']+offset
    scene.extend(instance);scene[root_index]['_parent']={'__id__':canvas_index};scene[root_index]['_active']=False
    scene[canvas_index]['_children'].append({'__id__':root_index});app[field]={'__id__':root_index}
save(scene_path,scene)
print('Authored WINNER and LOSE prefabs and linked scene instances; existing scene objects preserved.')
