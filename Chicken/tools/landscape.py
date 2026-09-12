"""Apply landscape layout to the current authored assets without regenerating their artwork."""
import json
from editor import PROJECT, ASSETS, hydrate, serialize
from recover import save

def at(n,path):
    for key in path.split('/'):n=next(c for c in n.get('_children',[]) if c['_name']==key)
    return n
def position(n,x,y):n['_lpos']={'__type__':'cc.Vec3','x':x,'y':y,'z':n.get('_lpos',{}).get('z',0)}
def size(n,w,h):
    next(c for c in n['_components'] if c['__type__']=='cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':w,'height':h}
def scale(n,s):n['_lscale']={'__type__':'cc.Vec3','x':s,'y':s,'z':1}
def place(n,path,x,y,w=None,h=None):
    child=at(n,path);position(child,x,y)
    if w is not None:size(child,w,h)
    return child

for path in (ASSETS/'resources/deferred').glob('Chicken*.prefab'):
    doc=hydrate(json.loads(path.read_bytes()));root=doc['data'];size(root,1136,640)
    name=path.stem
    if name=='ChickenGame':
        place(root,'BGLayer',-480,0);place(root,'Character',-199,60)
        bg=at(root,'BGLayer');bg['_components']=[c for c in bg['_components'] if c['__type__']!='cc.Layout']
        place(root,'BGLayer/bg_first',148,0,472,1600)
        at(root,'blackBoard')['_active']=False
        place(root,'TopLayer/bg',0,320,1136,100)
        place(root,'TopLayer/logo_en',0,282)
        place(root,'TopLayer/stepNode',-450,280);place(root,'TopLayer/oddsNode',450,280)
        place(root,'TopLayer/HistoryStrip',0,228,850,35)
        place(root,'ButtonLayer/bg',0,-320,1136,150)
        for key,x in [('Bet',-475),('Difficulty',-335),('AutoPlay',-195),('StopAutoPlay',-195),('CashOut',90),('Spin',400),('Jump',400)]:place(root,'ButtonLayer/'+key,x,-250)
        place(root,'ButtonLayer/trubo',-75,-248,70,70)
        for key,x in [('playerCoin_txt',-450),('playercoin_num',-373),('win_txt',150),('win_num',250)]:place(root,'GameDataLayer/'+key,x,-187)
        for key,x in [('Help',385),('History',450),('Sound',515)]:place(root,key,x,193)
        place(root,'Status',0,-137,960,36);place(root,'LocalLabel',0,-309,800,22)
        place(root,'ListLayer/BetList',-405,-196);place(root,'ListLayer/DifficultyList',-335,-199)
        size(at(root,'Loading'),1136,640)
        for key in ['TopLayer','ButtonLayer','GameDataLayer','ListLayer']:size(at(root,key),1136,640)
    else:
        size(at(root,'Panel'),930,600)
        place(root,'Title',0,249,850,60)
        if name=='ChickenDialog':
            place(root,'Body',0,12,820,390);place(root,'Close',0,-250)
        elif name=='ChickenAuto':
            place(root,'ChickenDashAutoSetting',0,135);scale(at(root,'ChickenDashAutoSetting'),.9)
            for name2,y in [('Rounds',35),('StopLoss',-35),('StopWin',-105)]:
                for suffix in ['Title','','Down','Up']:
                    n=at(root,name2+suffix);position(n,n['_lpos']['x'],y)
            place(root,'Hint',0,-180,720,55)
            place(root,'Start',160,-250);place(root,'Close',-160,-250)
        elif name=='ChickenResult':
            place(root,'Chicken',-220,45);scale(at(root,'Chicken'),1.3)
            place(root,'Amount',190,70,440,95);place(root,'Detail',190,-45,440,85)
            place(root,'StopAuto',190,-150);place(root,'Continue',190,-245)
        elif name=='ChickenBonus':
            place(root,'Wheel',-210,-25);scale(at(root,'Wheel'),.82)
            place(root,'Pointer',-210,204)
            place(root,'OriginalWheelEffect',-210,-25);scale(at(root,'OriginalWheelEffect'),.82)
            place(root,'Amount',240,30,370,120);place(root,'Spin',240,-170)
    save(path,serialize(doc))

p=ASSETS/'scenes/Chicken.scene';doc=hydrate(json.loads(p.read_bytes()));canvas=at(doc['scene'],'Canvas')
position(canvas,568,320);size(canvas,1136,640)
camera=at(canvas,'Camera');size(camera,1136,640)
next(c for c in camera['_components'] if c['__type__']=='cc.Camera')['_orthoHeight']=320
boot=at(canvas,'Boot');size(boot,1136,640)
place(boot,'Logo',0,150,322,147);place(boot,'Spinner',0,20);place(boot,'Progress',0,-75);place(boot,'Caption',0,-130);place(boot,'Retry',0,-215)
save(p,serialize(doc))
p=PROJECT/'build-config.json';d=json.loads(p.read_bytes());d['packages']['web-mobile']['orientation']='landscape';save(p,d)
p=PROJECT/'settings/v2/packages/project.json';d=json.loads(p.read_bytes());d['general']['designResolution']={'width':1136,'height':640,'fitWidth':False,'fitHeight':True};save(p,d)
print('Landscape: scene, 5 prefabs, and build orientation updated to 1136 x 640')
