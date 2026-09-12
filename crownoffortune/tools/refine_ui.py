# Executed by author.py after the base recovered stage is prepared.
import common_ui
import math
for key in ['BottomBar_Setting','BottomBar_Bet','BottomBar_Auto_01','BottomBar_AutoStop','BottomBar_Btn_Fast_Off','BottomBar_Btn_Fast_On','BottomBar_Wifi_04','BottomBar_Sound_On','BottomBar_Sound_Off','BottomBar_Setting_Info','BottomBar_Setting_History','BottomBar_Btn_Close','BottomBar_FrameSetting','Common_Btn_Green','Common_Frame_01','Common_Frame_02','PlayReady_Btn','PlayReady_Text','Spin_logo','AutoPlay_CheckBg','AutoPlay_Check','BottomBar_Btn_Fast3_Bg','BG_BottomBar_L']:
    sprites[key]=common_ui.copy_sprite(key)

def image_button(p,name,icon,x,y,w=60,h=60):
    n=art(p,name,'Btn_1',x,y,w,h);button(n);art(n,'Icon',icon,0,0,w*.65,h*.65);return n
def green(p,name,caption,x,y,w=220,h=60):
    n=art(p,name,'Common_Btn_Green',x,y,w,h);comp(n,'cc.Sprite')['_type']=1;button(n);text(n,'Label',caption,0,0,w-20,h,24);return n
def framed(name):
    n=node(name,0,0,1136,640);shade=rect(n,'Shade',0,0,1600,1000,[0,0,0,195]);shade['_components'].append({'__type__':'cc.BlockInputEvents','node':shade})
    frame=art(n,'Panel','Common_Frame_02',0,0,940,580);comp(frame,'cc.Sprite')['_type']=1
    return n
def prune_original(n):
    prepare(n)
    for q in walk(n):
        q['_components']=[co for co in q.get('_components',[]) if co and co['__type__'] in ['cc.UITransform','cc.Sprite','cc.Label','cc.Button','cc.UIOpacity']]
        for co in q['_components']:
            if co['__type__']=='cc.UIOpacity':co['_opacity']=255
            if '_customMaterial' in co:co['_customMaterial']=None
    return n

# Match the shipped bar: gear, balance, coin bet selector, win, speed, auto, JILI spin and signal.
old=['BottomBar','BalanceTitle','Balance','BetTitle','Bet','WinTitle','Win','BetDown','BetUp','Max','Spin','Help','History','Settings','Sound','Auto','Turbo']
game['_children']=[n for n in game['_children'] if n['_name'] not in old]
art(game,'BottomBar','BG_BottomBar_L',0,-279,1136,130)
image_button(game,'Settings','BottomBar_Setting',-512,-266)
image_button(game,'BetButton','BottomBar_Bet',-205,-267)
image_button(game,'Turbo','BottomBar_Btn_Fast_Off',183,-265)
art(find(game,'Turbo'),'Indicator','BottomBar_Btn_Fast3_Bg',0,-23,52,20)
image_button(game,'Auto','BottomBar_Auto_01',271,-266)
text(game,'AutoHint','Hold for setting',274,-304,190,26,18)
for name,caption,x in [('Balance','Balance',-367),('Win','WIN',-22)]:
    label(text(game,name+'Title',caption,x,-253,220,36,27),caption,27)['_color']={'__type__':'cc.Color','r':255,'g':224,'b':69,'a':255}
    text(game,name,'0.00',x,-289,220,36,25)
text(game,'Bet','Bet 3',-205,-305,120,29,19)
spin=art(game,'Spin','Btn_Spin_BG',393,-247,180,180);button(spin);art(spin,'Icon','Btn_Spin_1_2',0,0,157,157);art(spin,'Logo','Spin_logo',0,0,67,28)
art(game,'Network','BottomBar_Wifi_04',501,-268,38,33)
text(game,'Transaction','',360,-330,370,22,13)
for c in range(5):
    for r,name in [(-1,'Upper'),(3,'Lower')]:art(cells,name+str(c),'Symbol_0'+str(c),(c-2)*154,(1-r)*156,210,210)
gamecomp=next(co for co in game['_components'] if 'soundNames' in co)
gamecomp['uiIcons']=[{'__uuid__':sprites[n]} for n in ['BottomBar_Auto_01','BottomBar_AutoStop','BottomBar_Btn_Fast_Off','BottomBar_Btn_Fast_On','BottomBar_Sound_On','BottomBar_Sound_Off']]
# A game's loading shield must remain above its authored controls.
game['_children'].remove(loading);game['_children'].append(loading)
label(find(game,'Status'),' ',20)
writeprefab(game,'CrownGame')

# Original three-column bet menu, retaining its cell images and selected states.
bet=node('CrownBet',0,0,1136,640);shade=rect(bet,'Close',0,0,1600,1000,[0,0,0,45]);button(shade)
grid=prune_original(common_ui.original('Astt/framework/bottombar/NewCustomBarResource/Prefab/BetView'));pos(grid,-205,-38);grid['_name']='Grid';add(bet,grid)
for q in walk(grid):
    q['_components']=[co for co in q['_components'] if co['__type__']!='cc.Layout']
for i,q in enumerate([q for q in walk(grid) if comp(q,'cc.Button')]):
    q['_name']='Bet'+str([1,2,3,5,10,15,20,30,50,75,100,150,200,300,500][i])
    q['_children']=[x for x in q['_children'] if x['_name']!='Data']
    text(q,'Value',q['_name'][3:],0,0,110,56,25)
common_ui.import_frames(bet);writeprefab(bet,'CrownBet')

# Source auto-play panel frame/buttons, with functional local limits.
auto=framed('CrownAuto');text(auto,'Title','AUTOPLAY SETTINGS',0,250,820,50,30)
text(auto,'Caption','Number of autospins',-210,163,420,40,24)
for i,v in enumerate([10,25,50,100]):
    n=art(auto,'Count'+str(v),'AutoPlay_CheckBg',80+i*86,163,56,56);button(n);text(n,'Value',str(v),0,0,54,40,22);art(n,'Checked','AutoPlay_Check',0,-19,10,10)['_active']=False
for key,title,y in [('Loss','Stop if net loss exceeds',65),('Profit','Stop if net win exceeds',-28)]:
    text(auto,key+'Title',title,-167,y,485,50,24);text(auto,key,'OFF',220,y,155,50,24)
    image_button(auto,key+'Down','BottomBar_Btn_Close',97,y,45,45);label(text(auto,key+'Minus','−',97,y,45,45,28),'−',28);find(auto,key+'Down/Icon')['_active']=False
    green(auto,key+'Up','+',342,y,62,48)
text(auto,'Hint','Press AUTO to stop after the current round.\nFree respins complete before the next paid spin.',0,-125,800,65,20)
green(auto,'Close','Cancel',-140,-244,235,57);green(auto,'Start','Start',140,-244,235,57);writeprefab(auto,'CrownAuto')

settings=node('CrownSettings',0,0,1136,640)
shade=rect(settings,'Shade',0,0,1600,1000,[0,0,0,45]);button(shade)
frame=art(settings,'Panel','BottomBar_FrameSetting',-512,-85,76,298);comp(frame,'cc.Sprite')['_type']=1
for name,icon,y in [('Sound','BottomBar_Sound_On',32),('Help','BottomBar_Setting_Info',-43),('History','BottomBar_Setting_History',-118),('Auto','BottomBar_Auto_01',-193)]:
    n=art(settings,name,icon,-512,y,55,55);button(n)
writeprefab(settings,'CrownSettings')

help=framed('CrownHelp');text(help,'Title','CROWN OF FORTUNE',0,250,830,45,29)
pages=[]
for i in range(3):
    page=add(help,node('Page'+str(i),0,0,850,430));page['_active']=i==0;pages.append(page)
text(pages[0],'Heading','GAME RULES & FEATURES',0,175,800,40,26)
art(pages[0],'Wild','Symbol_07',-310,25,160,160)
text(pages[0],'Rules','5 reels · 3 rows · 20 fixed paylines\n\nWins pay from left to right, starting on reel 1.\nMatch 3, 4 or 5 symbols on a winning line.\nWILD substitutes for every symbol.\n\nA WILD expands to cover its reel and locks in place.\nLocked reels stay while the others respin for free.\nEach new locked reel awards another free respin.',85,15,635,295,22)
text(pages[0],'Limit','Maximum total win: 1000× bet.',0,-177,830,42,19)
text(pages[1],'Heading','PAYTABLE · MULTIPLIERS OF LINE BET',0,175,840,42,25)
for i in range(8):
    x=(i%4-1.5)*208;y=82-(i//4)*169;art(pages[1],'Symbol'+str(i),'Symbol_0'+str(i),x,y,98,98)
    pay=[[2,5,10],[3,6,15],[4,8,20],[5,10,30],[6,15,40],[8,20,60],[10,40,160],[10,50,1000]][i]
    text(pages[1],'Pay'+str(i),'3   /   4   /   5\n'+'  /  '.join(map(str,pay)),x,y-72,200,62,18)
text(pages[2],'Heading','20 WINNING LINES',0,184,820,38,25)
lines=[[1,4,7,10,13],[0,3,6,9,12],[2,5,8,11,14],[0,4,8,10,12],[2,4,6,10,14],[1,5,8,11,13],[1,3,6,9,13],[0,3,7,9,12],[2,5,7,11,14],[1,3,7,9,13],[1,5,7,11,13],[0,4,6,10,12],[2,4,8,10,14],[1,4,6,10,13],[1,4,8,10,13],[0,4,7,10,12],[2,4,7,10,14],[0,4,8,11,14],[2,4,6,9,12],[0,5,6,11,12]]
for i,line in enumerate(lines):
    chart=add(pages[2],node('Line'+str(i+1),(i%4-1.5)*205,116-(i//4)*66,180,60));text(chart,'No',str(i+1),-76,0,30,30,17)
    points=[((col-2)*23,(1-v%3)*15) for col,v in enumerate(line)]
    for col in range(5):
        for row in range(3):rect(chart,f'Dot{col}_{row}',(col-2)*23,(1-row)*15,7,7,[95,92,89,255])
    for j,((x,y),(xx,yy)) in enumerate(zip(points,points[1:])):
        n=rect(chart,'Segment'+str(j),(x+xx)/2,(y+yy)/2,math.hypot(xx-x,yy-y),3,[249,205,77,255]);angle=math.atan2(yy-y,xx-x);n['_lrot']={'__type__':'cc.Quat','x':0,'y':0,'z':math.sin(angle/2),'w':math.cos(angle/2)}
green(help,'Previous','◀',-328,-248,95,54);green(help,'Next','▶',328,-248,95,54);green(help,'Close','Close',0,-248,220,54);text(help,'PageNumber','1 / 3',0,-194,160,28,18);writeprefab(help,'CrownHelp')

# The original ready button and actual opening Spine, loaded separately from the scene.
opening=node('CrownOpening',0,0,1136,640);art(opening,'Backdrop','BackGround_L',0,0,1136,710)
spine=add(opening,node('OpeningSpine',0,0,1136,640));su=json.loads(next((ASSETS/'spine').glob('GameIntro_*/*.skel.meta')).read_bytes())['uuid']
spine['_components'].append({'__type__':'sp.Skeleton','node':spine,'_skeletonData':{'__uuid__':su},'_premultipliedAlpha':False,'defaultSkin':'default','defaultAnimation':'GameIntro_L','loop':False})
play=prune_original(find(common_ui.original('Astt/framework/Common/Prefab/Common_PlayReady'),'Btn/Btn_Play'));play['_name']='Play';pos(play,0,-157);add(opening,play)
sprite(find(play,'Text'),'PlayReady_Text');common_ui.import_frames(play)
text(opening,'Hint','Click PLAY to begin',0,-232,650,42,21)
writeprefab(opening,'CrownOpening')
for p in (ASSETS/'scripts').glob('*.ts'):meta(p,uid(p.stem),'typescript','4.0.24')
print('Refined original shared controls, bet grid, auto/settings/help and opening Spine.')

# Keep source AUTO restoration when regenerating the project.
import runpy
runpy.run_path(str(PROJECT/'tools/restore_auto.py'),run_name='__main__')
