"""Author the client scenes and nested prefabs. Run only when intentionally regenerating assets."""
import runpy,copy,json
from pathlib import Path
from PIL import Image
P=Path(__file__).resolve().parents[1]
g=runpy.run_path(str(P/'tools/assemble-project.py'))
globals().update({k:v for k,v in g.items() if not k.startswith('__')})
# Preserve the user-requested replacement when regenerating recovered assets.
import shutil
shutil.copyfile(P/'source-art/lobby-star-coin.png', A/'art/LobbyIcon_01_d2104808.png')
next(c for c in card['components'] if c['__type__']==uid('CardView'))['face']=ref('PlayingCard/BG')
writeprefab(card,'PlayingCard')

def sprite(n,name):
    c=comp(n,'cc.Sprite')
    if not c:c={'__type__':'cc.Sprite','_sizeMode':0};n['components'].append(c)
    c['_spriteFrame']=sf(name)
def button(n):
    if not comp(n,'cc.Button'):n['components'].append({'__type__':'cc.Button','_transition':3,'_zoomScale':1.03})
    if comp(n,'cc.Sprite') and not any(c['props']['_name']=='BtnNormal' for c in n['children']):
        normal=node('BtnNormal');normal['components']=[copy.deepcopy(comp(n,'cc.UITransform')),copy.deepcopy(comp(n,'cc.Sprite'))]
        n['components']=[c for c in n['components'] if c['__type__']!='cc.Sprite'];n['children'].insert(0,normal)
def textat(n,path,text):comp(find(n,path),'cc.Label')['_string']=text
def import_image(name,relative):
    im=Image.open(P.parent/relative).convert('RGBA');out=A/'art'/(name+'.png');im.save(out)
    u=uid(name);template=next((A/'art').glob('*.png.meta'));m=json.loads(template.read_bytes());old=m['uuid'];m=json.loads(json.dumps(m).replace(old,u));m['uuid']=u
    sm=m['subMetas']['f9941']['userData'];sm.update(width=im.width,height=im.height,rawWidth=im.width,rawHeight=im.height,borderTop=0,borderBottom=0,borderLeft=0,borderRight=0)
    save(Path(str(out)+'.meta'),m);assets['sprites'][name]={'uuid':u+'@f9941','size':[im.width,im.height]}
import_image('LobbyBackground','raw/casino-wbgame.jiligames.com/rummy/assets/main/native/96/9664d8ab-73c2-47fd-91b2-958d0338c4f4.36c12.webp')
flat=P/'source-art/confetti-white.png';Image.new('RGBA',(8,8),(255,255,255,255)).save(flat)
import_image('ConfettiWhite','RummaAPorject/source-art/confetti-white.png')
for gender in ['female','male']:
    for i in range(1,5):import_image(f'Avatar_{gender}_{i:02}',f'RummaAPorject/source-art/avatars/{gender}_{i:02}.png')
import_image('RummyLogo','raw/casino-wbgame.jiligames.com/rummy/assets/main/native/5c/5cf08960-e4a1-4d2b-9732-c97bd26838c7.9b082.webp')
import_image('LobbyCards','raw/casino-wbgame.jiligames.com/rummy/assets/game/native/db/dbcdfdc9-9f35-491a-babc-9e9143127911.3ea34.png')

lobby=copy.deepcopy(trees['Lobby']);lobby['props']['_name']='RummyLobby'
for n in walk(lobby):
    n['components']=[c for c in n['components'] if c['__type__']!='cc.Widget']
    if comp(n,'cc.Animation'):comp(n,'cc.Animation')['_playOnLoad']=False
sprite(find(lobby,'Lobby_Bg'),'LobbyBackground');sprite(find(lobby,'Model/01'),'LobbyCards');find(lobby,'Model/02')['props']['_active']=False
find(lobby,'Room/LT')['props']['_active']=False
# Clip_Lobby_Rotate_L sets editorBottom=320 on the zero-height Room node.
find(lobby,'Room')['props']['_lpos']=vec()
room_paths=[]
# Lobby.ChangePosition: these five positions and shapes are copied from BTN_POS_L / BTN_TYPE_L.
for i,(x,y) in enumerate([(-125,-10),(140,110),(420,110),(140,-130),(420,-130)]):
    holder=find(lobby,f'Room/btn_{i+1:02}');holder['props']['_lpos']=vec(x,y)
    room=copy.deepcopy(trees['btn_root_RM']);room['props']['_name']='RoomCard';holder['children']=[room]
    variant='01' if i==0 else '02'
    for child in room['children']:child['props']['_active']=child['props']['_name']==variant
    body=find(room,variant);button(body)
    for n in walk(body):
        if comp(n,'cc.Animation'):comp(n,'cc.Animation')['_playOnLoad']=False
        if n['props']['_name'] in ('joinBtn_gray','btn_deco'):n['props']['_active']=False
    for p,t in [('need/perpoint','Per point'),('need/minentry','Min entry'),('RoomNum/boot',str([1,2,5,10,20][i])),('RoomNum/min',str([80,160,400,800,1600][i])),('RoomNum/limit',''),('joinBtn/JOIN_EN','JOIN')]:textat(body,p,t)
    icon=node('RoomIcon',0,0,110,100);sprite(icon,f'LobbyIcon_{i+1:02}');find(body,'Icon')['children']=[icon]
    reverse={s['uuid']:name for name,s in assets['sprites'].items()}
    for lv in walk(find(body,'LV')):
        sc=comp(lv,'cc.Sprite');name=reverse.get((sc or {}).get('_spriteFrame',{}).get('__uuid__',''),'')
        if name.startswith('Txt_LV_'):sprite(lv,'Txt_LV_'+str(i+1))
    join=find(body,'joinBtn');button(join)
    room_paths.append(f'RummyLobby/Room/btn_{i+1:02}/RoomCard/{variant}/joinBtn')
    writeprefab(room,'RoomCard'+str(i+1))
logo=node('Logo',-400,250,204,63);sprite(logo,'RummyLogo');lobby['children'].append(logo)
lobby['children'].append(label('Wallet','Local chips  10,000',260,277,540,36,23))
bar=copy.deepcopy(trees['LobbyBar']);comp(bar,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':1136,'height':640}
for n in walk(bar):
    n['components']=[c for c in n['components'] if c['__type__']!='cc.Widget']
    if comp(n,'cc.Animation'):comp(n,'cc.Animation')['_playOnLoad']=False
for path in ['Btn/IndiaHall_Btn','Btn/IndiaHall_Btn_S','Btn/YTubeNode','versionPosNode']:
    find(bar,path)['props']['_active']=False
sprite(find(bar,'TopData/Logo'),'RummyLogo');textat(bar,'Data/TXT_Name','You');textat(bar,'Data/Layout/TXT_Mark','Local chips');textat(bar,'Data/Layout/Num_Gold','10,000')
for name in ['Record_Btn','Help_Btn','Sound_On','Sound_Off','Music_On','Music_Off']:
    n=find(bar,'Btn/System/'+name);n['props']['_active']=name not in ('Sound_Off','Music_Off');button(n)
lobby['children']=[n for n in lobby['children'] if n['props']['_name'] not in ('Logo','Wallet')]+[bar]
sprite(find(bar,'Data/Photo/Img'),'Avatar_female_01')
comp(find(bar,'Data/Photo/Img'),'cc.Sprite')['_sizeMode']=0
writeprefab(bar,'LobbyToolbar')
writeprefab(lobby,'RummyLobby')

# Replace the first-pass controller with group-aware controls and the original result panel.
table['components']=[c for c in table['components'] if c['__type__']!=uid('RummyGame')]
table['props']['_active']=False
for n in walk(table):
    if comp(n,'cc.Animation'):comp(n,'cc.Animation')['_playOnLoad']=False
main=find(table,'MainGame');hand=find(main,'Poker/PlayerPoker/05/Main_Card/Card_Layout');hand['children']=[]
find(main,'Poker/PlayerPoker/05/black')['props']['_active']=False
hand['components'].append({'__type__':'cc.Layout','_layoutType':1,'_resizeMode':1,'_spacingX':1,'_affectedByScale':True})
handpath='RummyTable/MainGame/Poker/PlayerPoker/05/Main_Card/Card_Layout'
group_paths=[]
for i in range(7):
    group=copy.deepcopy(trees['Card_set']);group['props']['_name']=f'Group{i+1}';group['props']['_lpos']=vec()
    for n in walk(group):
        n['components']=[c for c in n['components'] if c['__type__']!='cc.Widget' and (c['__type__']!='cc.Animation' or n['props']['_name']=='Wipes')]
        if n['props']['_name'] in ('Wipes','WipesStar','Add_Btn'):n['props']['_active']=False
    button(find(group,'CardBottom/Add_Btn'))
    cards=find(group,'Cards');cards['children']=[];comp(cards,'cc.Layout').update(_layoutType=1,_resizeMode=1,_spacingX=-35)
    comp(group,'cc.UITransform')['_anchorPoint']={'__type__':'cc.Vec2','x':.5,'y':0}
    hand['children'].append(group);group_paths.append(handpath+'/'+group['props']['_name'])
    if i==0:writeprefab(group,'CardGroup')
for key in ['Btn_01','Btn_02','Btn_03','Btn_04','Btn_05']:button(find(main,'Btn/'+key))
deck=find(main,'Poker/TablePoker/DeckPoker')
for n in walk(deck):
    n['props']['_active']=True
    if comp(n,'cc.UIOpacity'):comp(n,'cc.UIOpacity')['_opacity']=255
find(main,'Poker/TablePoker/TableBTN/Open')['props']['_active']=False
# Remove template balances; the local authority supplies session values.
for n in walk(main):
    c=comp(n,'cc.Label')
    if c and ('BUK' in c.get('_string','') or c.get('_string') in ('1100,00','1.00.00.000.00','1,00,00,000.00','-80,000')):c['_string']=''
find(main,'LocalStatus')['props']['_lpos']=vec(0,-122);comp(find(main,'LocalStatus'),'cc.Label')['_fontSize']=17
point=label('PointValue','1',60,142,110,32,24);main['children'].append(point)
clock=label('TurnClock','20',0,80,58,36,22);main['children'].append(clock)
back=copy.deepcopy(find(main,'Btn/Btn_04'));back['props']['_name']='BackToLobby';back['props']['_lpos']=vec(-465,275);comp(back,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':146,'height':52};textat(back,'Label','Lobby');main['children'].append(back)
player_states=[]
for i in [5,1,2,3,4]:
    seat=find(main,f'Players/{i:02}');n=next(n for n in walk(seat) if n['props']['_name']=='Status');n['props']['_name']='SeatStatus';n['props']['_active']=True
    # Use a stable full path even when original nested prefab names differ.
    def path_to(root,target,path=''):
        path=path+'/'+root['props']['_name']
        if root is target:return path
        for child in root['children']:
            p=path_to(child,target,path)
            if p:return p
        return None
    player_states.append(path_to(table,n).lstrip('/'))
end=find(main,'End');end['props']['_active']=True
result=find(end,'Compliment');result['props']['_active']=False
resultpath='RummyTable/MainGame/End/Compliment'
result_names=[];result_states=[];result_amounts=[];result_cards=[]
for i in range(1,6):
    base=f'Root/Result/{i:02}';row=find(result,base)
    for n in row['children']:n['props']['_active']=n['props']['_name'] in ('Lost','Money')
    textat(row,'Lost/Num','');textat(row,'Lost/Label','')
    result_names.append(resultpath+f'/Root/Players/{i:02}/sPlayers/TXT_Name')
    result_states.append(resultpath+'/'+base+'/Lost/Label');result_amounts.append(resultpath+'/'+base+'/Money')
    poker=find(result,f'Root/Poker/{i:02}/Main_Card/Card_Layout');poker['children']=[]
    poker['components']=[c for c in poker['components'] if c['__type__']!='cc.Layout'];poker['components'].append({'__type__':'cc.Layout','_layoutType':1,'_resizeMode':1,'_spacingX':-47.5,'_affectedByScale':True})
    # The original result row already scales the full-size cards; do not scale twice.
    poker['props']['_lscale']=vec(1,1,1);result_cards.append(resultpath+f'/Root/Poker/{i:02}/Main_Card/Card_Layout')
    find(result,f'Root/Poker/{i:02}/Main_Card')['props']['_lpos']['x']=-102
    for placeholder in find(result,f'Root/Poker/{i:02}/CardBgs')['children']:placeholder['props']['_active']=False
for p in ['Root/FX','Root/Sports_Ribbon','Root/Button_Light']:find(result,p)['props']['_active']=False
glow=find(result,'Root/Title/Win/ResultTitle_Win01')
for i in range(2,5):
    layer=copy.deepcopy(find(glow,'add_Win01'));layer['props']['_name']=f'add_Win{i:02}';glow['children'].append(layer)
for p in ['Root/Button/Continue','Root/Button/Back']:button(find(result,p))
writeprefab(result,'RoundResult')

confirmation=node('Confirmation',0,0,1136,640);confirmation['props']['_active']=False;confirmation['components'].append({'__type__':'cc.BlockInputEvents'})
body=copy.deepcopy(find(result,'Root/ResultBoard/Board'));body['props']['_name']='Panel';body['props']['_lpos']=vec();body['props']['_lscale']=vec(1,1,1);body['children']=[];comp(body,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':590,'height':270}
confirmation['children']=[body,label('Message','Confirm?',0,42,510,100,24)]
comp(body,'cc.UITransform')['_anchorPoint']={'__type__':'cc.Vec2','x':.5,'y':.5}
for name,x,title in [('Confirm',130,'Confirm'),('Cancel',-130,'Cancel')]:
    b=copy.deepcopy(find(main,'Btn/Btn_04'));b['props']['_name']=name;b['props']['_lpos']=vec(x,-75);b['props']['_active']=True;textat(b,'Label',title);confirmation['children'].append(b)
main['children'].append(confirmation);writeprefab(confirmation,'Confirmation')

audio_map={e['name']:e['uuid'] for e in json.loads((P/'tools/audio-map.json').read_bytes())}
def audio_ref(name):return {'__uuid__':audio_map[name],'__expectedType__':'cc.AudioClip'}
effects=node('Effects');effects['components']=[{'__type__':'cc.AudioSource','_volume':1,'_playOnAwake':False}];table['children'].append(effects)
music=node('Music');music['components']=[{'__type__':'cc.AudioSource','_clip':audio_ref('Sound/BGMusic'),'_loop':True,'_volume':.3,'_playOnAwake':False}]
info=node('Information',0,0,1136,640);info['props']['_active']=False;info['components'].append({'__type__':'cc.BlockInputEvents'})
info_body=copy.deepcopy(body);comp(info_body,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':860,'height':530}
info['children']=[info_body,label('Title','How to Play',0,202,720,50,32),label('Content','',0,0,770,320,23)]
close=copy.deepcopy(find(confirmation,'Confirm'));close['props']['_name']='Close';close['props']['_lpos']=vec(0,-204);textat(close,'Label','Close');info['children'].append(close);writeprefab(info,'Information')

def nref(p):return ref(p)
def lref(p):return ref(p,'cc.Label')
controller={'__type__':uid('TableController'),'cardPrefab':{'__uuid__':carduid,'__expectedType__':'cc.Prefab'},'groupRoots':[nref(p) for p in group_paths],'cardRoots':[nref(p+'/Cards') for p in group_paths],'groupLabels':[lref(p+'/CardBottom/Type/Label') for p in group_paths],'groupTags':[ref(p+'/CardBottom/Type','cc.Sprite') for p in group_paths],'tagFrames':[sf('PokerStatus_0'+str(i)) for i in [1,1,1,1,3,5,5,4]],'handRoot':nref(handpath),'handWidth':1070,'groupDistance':1,'turnSeconds':20}
for field,path in {'discardRoot':'Poker/TablePoker/DisPoker','wildRoot':'Poker/TablePoker/WildPoker','drawButton':'Poker/TablePoker/TableBTN/Deck','openButton':'Poker/TablePoker/TableBTN/Dis','actionButton':'Btn/Btn_01','groupButton':'Btn/Btn_02','declareButton':'Btn/Btn_03','sortButton':'Btn/Btn_04','dropButton':'Btn/Btn_05','backButton':'BackToLobby','confirmation':'Confirmation','confirmButton':'Confirmation/Confirm','cancelButton':'Confirmation/Cancel'}.items():controller[field]=nref('RummyTable/MainGame/'+path)
for field,path in {'statusLabel':'LocalStatus','pointLabel':'PointValue','turnLabel':'TurnClock','confirmationText':'Confirmation/Message'}.items():controller[field]=lref('RummyTable/MainGame/'+path)
avatar_names=[f'Avatar_{gender}_{i:02}' for gender in ['female','male'] for i in range(1,5)]
seat_names=[];seat_avatars=[];result_avatars=[]
def avatar_node(root,asset):
    photo=next(n for n in walk(root) if n['props']['_name']=='Photo')
    for n in walk(photo):
        if n['props']['_name'] in ('Photo','mask','img'):n['props']['_active']=True
        if n['props']['_name'] in ('CountDown','CountDown2','img2'):n['props']['_active']=False
    mask=find(photo,'mask');comp(mask,'cc.Mask')['_type']=1
    img=find(mask,'img');sprite(img,asset);comp(img,'cc.Sprite')['_sizeMode']=0
    comp(img,'cc.UITransform')['_contentSize']=copy.deepcopy(comp(mask,'cc.UITransform')['_contentSize'])
    return img
for index,seat_number in enumerate([5,1,2,3,4]):
    seat=find(main,f'Players/{seat_number:02}')
    img=avatar_node(seat,avatar_names[index])
    seat_avatars.append(ref(path_to(table,img).lstrip('/'),'cc.Sprite'))
    name=next(n for n in walk(seat) if n['props']['_name']=='TXT_Name')
    seat_names.append(lref(path_to(table,name).lstrip('/')))
    status=next(n for n in walk(seat) if n['props']['_name']=='SeatStatus')
    status['props']['_lpos']=vec(0,-59)
    # Preserve an editable seat prefab with the same default avatar as the scene.
    writeprefab(seat,f'PlayerSeat{seat_number}')
for index in range(5):
    seat=find(result,f'Root/Players/{index+1:02}/sPlayers')
    img=avatar_node(seat,avatar_names[index])
    result_avatars.append(ref(path_to(table,img).lstrip('/'),'cc.Sprite'))
writeprefab(result,'RoundResult')
countdown_refs=[]
for number in [5,1,2,3,4]:
    seat=find(main,f'Players/{number:02}')
    countdown=next(n for n in walk(seat) if n['props']['_name']=='CountDown')
    countdown_refs.append(ref(path_to(table,countdown).lstrip('/'),'cc.Sprite'))
    comp(countdown,'cc.Sprite')['_fillRange']=-1
    countdown['props']['_active']=False
info_root=find(main,'Players/05/PlayerInfo')
for n in walk(info_root):
    if n['props']['_name'] not in ('coin_silver','Mark'):n['props']['_active']=True
    opacity=comp(n,'cc.UIOpacity')
    if opacity:opacity['_opacity']=255
# Keep the original HUD to the right of the local avatar.
info_root['props']['_lpos']=vec(-20,45.928)
find(main,'LocalStatus')['props']['_lpos']=vec(0,230)
comp(find(main,'LocalStatus'),'cc.Label')['_fontSize']=14
hint=find(main,'Hint');hint['props']['_active']=True
for child in hint['children']:child['props']['_active']=False
pick=find(hint,'PickHint')
for old,new in [('TXT1','TXT01'),('TXT2','TXT02')]:
    n=find(pick,old);n['props']['_name']=new;comp(n,'cc.Label')['_string']='Pick up a Card'
controller.update(countdowns=countdown_refs,balanceLabel=lref('RummyTable/MainGame/Players/05/PlayerInfo/MoneyFrame/Num_Property'),pointsLabel=lref('RummyTable/MainGame/Players/05/PlayerInfo/PointsFrame/Points'),dropAmount=lref('RummyTable/MainGame/Btn/Btn_05/Num'),firstDrop=nref('RummyTable/MainGame/Btn/Btn_05/Type1'),laterDrop=nref('RummyTable/MainGame/Btn/Btn_05/Type2'),drawHints=[ref('RummyTable/MainGame/Hint/'+p+'/Dis_Deck','cc.Animation') for p in ['DeckHint','DisHint']],pickHint=ref('RummyTable/MainGame/Hint/PickHint','cc.Animation'),pickText=lref('RummyTable/MainGame/Hint/PickHint/TXT01'))
clock_refs=[];coin_refs=[]
for number in [5,1,2,3,4]:
    seat=find(main,f'Players/{number:02}');portrait=next(n for n in walk(seat) if n['props']['_name']=='Photo')
    players=next(n for n in walk(seat) if n['props']['_name']=='TXT_Name')
    parent=next(n for n in walk(seat) if players in n['children'])
    clock=label('SeatClock','20',43,39,40,30,23);clock['props']['_active']=False;parent['children'].append(clock)
    coins=label('SeatCoins','0',0,-79,150,25,17);coins['props']['_active']=number!=5;parent['children'].append(coins)
    comp(coins,'cc.Label')['_color']={'__type__':'cc.Color','r':255,'g':224,'b':95,'a':255}
    clock_refs.append(lref(path_to(table,clock).lstrip('/')));coin_refs.append(lref(path_to(table,coins).lstrip('/')))
    count=next(n for n in walk(seat) if n['props']['_name']=='CountDown')
    for n in [portrait,find(portrait,'mask'),find(portrait,'mask/img'),count]:
        if comp(n,'cc.UIOpacity'):comp(n,'cc.UIOpacity')['_opacity']=255
    comp(count,'cc.Sprite')['_color']={'__type__':'cc.Color','r':255,'g':224,'b':20,'a':155}
    writeprefab(seat,f'PlayerSeat{number}')
find(main,'TurnClock')['props']['_active']=False
flight=node('CardFlight',0,0,1136,640)
flying=copy.deepcopy(card);flying['props']['_name']='FlyingCard';flying['props']['_active']=False
flying=json.loads(json.dumps(flying).replace('PlayingCard/','FlyingCard/'))
flight['children']=[flying];table['children'].append(flight);writeprefab(flight,'CardFlight')
party=node('WinCelebration',0,0,1136,640);party['props']['_active']=False
for i in range(56):
    coin=i<20;x=-535+(i*137)%1070;y=370+(i*43)%280
    n=node(f'Coin{i}' if coin else f'Ribbon{i}',x,y,26 if coin else 9,26 if coin else 20)
    sprite(n,'Gold' if coin else 'ConfettiWhite')
    comp(n,'cc.Sprite')['_sizeMode']=0
    if not coin:
        colors=[(255,90,120),(255,215,80),(80,190,255),(150,105,255)]
        r,g,b=colors[i%4];comp(n,'cc.Sprite')['_color']={'__type__':'cc.Color','r':r,'g':g,'b':b,'a':255}
    party['children'].append(n)
result['children'].append(party);writeprefab(party,'WinCelebration');writeprefab(result,'RoundResult')
controller.update(seatClocks=clock_refs,seatCoins=coin_refs,groupSweeps=[ref(p+'/CardBottom/Type/Wipes','cc.Animation') for p in group_paths],flightLayer=ref('RummyTable/CardFlight'),flightCard=ref('RummyTable/CardFlight/FlyingCard',classid(uid('CardView'))),celebration=ref(resultpath+'/WinCelebration'),celebrationPieces=[ref(resultpath+'/WinCelebration/'+n['props']['_name']) for n in party['children']])
controller.update(playerNames=seat_names,playerAvatars=seat_avatars,resultAvatars=result_avatars,avatarFrames=[sf(n) for n in avatar_names])
controller.update(playerStates=[lref(p) for p in player_states],resultPanel=nref(resultpath),winTitle=nref(resultpath+'/Root/Title/Win'),loseTitle=nref(resultpath+'/Root/Title/Lose'),resultNames=[lref(p) for p in result_names],resultStates=[lref(p) for p in result_states],resultAmounts=[lref(p) for p in result_amounts],resultCards=[nref(p) for p in result_cards],continueButton=nref(resultpath+'/Root/Button/Continue'),lobbyButton=nref(resultpath+'/Root/Button/Back'))
table['components'].append(controller);writeprefab(table,'RummyTable')
controller.update(addGroupButtons=[nref(p+'/CardBottom/Add_Btn') for p in group_paths],hurrySound=audio_ref('Sound/Sound_HurryUp'),effects=ref('RummyTable/Effects','cc.AudioSource'),drawSound=audio_ref('Sound/SendCard'),cardSound=audio_ref('Sound/Card01'),winSound=audio_ref('Sound/WinMusic01'))
shuffle_path='MainGame/SendPokerNode/Shuffle'
shuffle_cards=[]
for i in range(1,14):
    path=f'{shuffle_path}/Root/CardBack_{i:02}/Set/Card_1'
    original=find(table,path)
    visual=copy.deepcopy(card)
    visual['props']=copy.deepcopy(original['props'])
    # Bind each serialized card component within its own instance.
    def rebase(value):
        if isinstance(value,dict):
            return {k:(v.replace('PlayingCard','RummyTable/'+path,1) if k=='$node' else rebase(v)) for k,v in value.items()}
        if isinstance(value,list):return [rebase(v) for v in value]
        return value
    visual=rebase(visual)
    parent=find(table,path.rsplit('/',1)[0]);parent['children']=[visual if c is original else c for c in parent['children']]
    shuffle_cards.append(ref('RummyTable/'+path,classid(uid('CardView'))))
find(table,'MainGame/SendPokerNode')['props']['_active']=True
find(table,shuffle_path)['props']['_active']=False
controller.update(shuffleAnimation=ref('RummyTable/'+shuffle_path,'cc.Animation'),shuffleCards=shuffle_cards)
start_path='MainGame/Effect/Node_StartGame/StartGame'
opponent_paths=[f'MainGame/Poker/PlayerPoker/OtherPoker/{i:02}/Move' for i in range(1,5)]
turn_paths=['MainGame/Players/05/MainPlayer/Players/FX_Win/Win']+[f'MainGame/Players/{i:02}/Players/FX_Win/Win' for i in range(1,5)]
for path in [start_path]+opponent_paths+turn_paths:
    parent=table
    for part in path.split('/'):
        parent=next(c for c in parent['children'] if c['props']['_name']==part)
        parent['props']['_active']=True
    parent['props']['_active']=False
for path in opponent_paths:
    move=find(table,path)
    back=node('MovingCardBack',0,0,106,160);sprite(back,'CardBack_01')
    comp(back,'cc.UITransform')['_anchorPoint']={'__type__':'cc.Vec2','x':.5,'y':0}
    move['children']=[back]
controller.update(startAnimation=ref('RummyTable/'+start_path,'cc.Animation'),opponentAnimations=[ref('RummyTable/'+p,'cc.Animation') for p in opponent_paths],turnAnimations=[ref('RummyTable/'+p,'cc.Animation') for p in turn_paths])
writeprefab(table,'RummyTable')
for title,x,name in [('Test WIN',-465,'TestWin'),('Test LOSE',-295,'TestLose')]:
    b=copy.deepcopy(find(main,'Btn/Btn_04'));b['props']['_name']=name;b['props']['_lpos']=vec(x,278);b['props']['_active']=False;b['props']['_lscale']=vec(.85,.85,1);textat(b,'Label',title);lobby['children'].append(b)
writeprefab(lobby,'RummyLobby')
canvas['children']=[camera,table,lobby,music,info]
app={'__type__':uid('RummyApp'),'testWin':nref('RummyLobby/TestWin'),'testLose':nref('RummyLobby/TestLose'),'lobby':nref('RummyLobby'),'table':ref('RummyTable',classid(uid('TableController'))),'rooms':[nref(p) for p in room_paths],'perPoint':[1,2,5,10,20],'wallet':lref('RummyLobby/LobbyBar/Data/Layout/Num_Gold'),'music':ref('Canvas/Music','cc.AudioSource'),'effects':ref('RummyTable/Effects','cc.AudioSource'),'infoPanel':nref('Information'),'infoTitle':lref('Information/Title'),'infoText':lref('Information/Content'),'closeInfo':nref('Information/Close')}
app['lobbyAvatar']=ref('RummyLobby/LobbyBar/Data/Photo/Img','cc.Sprite')
app['lobbyName']=lref('RummyLobby/LobbyBar/Data/TXT_Name')
for field,name in [('musicOn','Music_On'),('musicOff','Music_Off'),('soundOn','Sound_On'),('soundOff','Sound_Off'),('helpButton','Help_Btn'),('recordButton','Record_Btn')]:app[field]=nref('RummyLobby/LobbyBar/Btn/System/'+name)
canvas['components'].append(app)
scene_data=serialize(scene,'Rummy',sceneuid,True)
def link_instance(scene_data,prefab_path,name):
    prefab=json.loads(prefab_path.read_bytes());u=json.loads(Path(str(prefab_path)+'.meta').read_bytes())['uuid']
    root=next(i for i,n in enumerate(scene_data) if n.get('__type__')=='cc.Node' and n.get('_name')==name)
    def link(si,pi):
        sn,pn=scene_data[si],prefab[pi];info=prefab[pn['_prefab']['__id__']]
        sn['_prefab']={'__id__':len(scene_data)}
        scene_data.append({'__type__':'cc.PrefabInfo','root':{'__id__':root},'asset':{'__uuid__':u,'__expectedType__':'cc.Prefab'},'fileId':info['fileId']})
        for s,p in zip(sn['_children'],pn['_children']):link(s['__id__'],p['__id__'])
    link(root,1)
link_instance(scene_data,A/'prefabs/playable/RummyTable.prefab','RummyTable')
link_instance(scene_data,A/'prefabs/playable/RummyLobby.prefab','RummyLobby')
save(A/'scenes/Rummy.scene',scene_data)
for name in ['Round','TableController','RummyApp','PlayerIdentity','GameSave']:meta(A/'scripts'/(name+'.ts'),uid(name),'typescript')
print('Authored original lobby, room cards, 7 card groups, original result panel and confirmation prefab')

# Keep the generated first scene light after restoring the full authored layout.
from split_loading import migrate
migrate()

from first_play_guide import main as author_first_play_guide
author_first_play_guide()
