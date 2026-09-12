"""Restore only AUTO assets/prefab; preserve other authored editor changes."""
import json,sys
from pathlib import Path
import editor,common_ui
from editor import node,walk,serialize,hydrate
ROOT=Path(__file__).resolve().parents[1]
# Reuse the existing prefab writing and label helpers without running the authoring pass.
scope={};exec((ROOT/'tools/author.py').read_text(encoding='utf-8').split("for p in (ASSETS/'spine')")[0],scope)
comp,find,pos,button,label,writeprefab=[scope[k] for k in ['comp','find','pos','button','label','writeprefab']]
auto=common_ui.original('Astt/framework/autoPlay/AutoPlaySettingPanel')
auto['_parent']=None;auto['_name']='CrownAuto';comp(auto,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':1136,'height':640}
for n in walk(auto):
 n['_layer']=33554432
 n['_components']=[c for c in n.get('_components',[]) if c and c.get('__type__','').startswith('cc.') and c['__type__'] not in ['cc.Animation','cc.Widget','cc.Toggle','cc.ToggleContainer','cc.RichText']]
 for c in n['_components']:
  if '_customMaterial' in c:c['_customMaterial']=None
  if c['__type__']=='cc.Label':c.update(_isSystemFontUsed=True,_font=None,_fontFamily='Arial')
  if c['__type__']=='cc.Button':c['clickEvents']=[]
  if c['__type__']=='cc.Sprite' and not c.get('_spriteFrame'):n['_components'].remove(c)
# Original title image and native numeric labels (the source used private number renderers).
title=find(auto,'Bg/Title');title['_components'].append({'__type__':'cc.Sprite','node':title,'_sizeMode':0,'_spriteFrame':{'__uuid__':common_ui.copy_sprite('AutoPlay_Title')}})
base='Btn/ScrollView/view/content/'
for i,num in [(1,'Num_Round'),(2,'Num_Exceed'),(3,'Num_BalanceLess'),(4,'Num_BalanceMore')]:
 row=find(auto,base+f'Toggle_0{i}');button(row)
 target=find(row,'Btn/Under/'+num);target['_children']=[];label(target,'10' if i==1 else '0',26)
 comp(target,'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':145,'height':45}
 button(find(row,'Btn/btn_increase'));button(find(row,'Btn/btn_decrease'))
row=find(auto,base+'Toggle_01')
for count in [50,100,200,500,999]:button(find(row,'Btn/Btn_Bet'+str(count)))
find(row,'InfoNode/BetBtn/Under/Num_Bet')['_children']=[]
label(find(row,'InfoNode/BetBtn/Under/Num_Bet'),'3',26)
comp(find(row,'InfoNode/BetBtn/Under/Num_Bet'),'cc.UITransform')['_contentSize']={'__type__':'cc.Size','width':145,'height':45}
for key in ['btn_increase','btn_decrease']:button(find(row,'InfoNode/BetBtn/'+key))
button(find(auto,base+'Toggle_05'))
# Crown has free respins; the unrelated generic bonus-mode row is not applicable.
find(auto,'Btn/Toggle_06')['_active']=False
# Keep the source Start/Cancel shapes and positions; expose the established binding names.
for old,new in [('Btn_Start','Start'),('Btn_Cancel','Close')]:
 n=find(auto,'Btn/'+old);find(auto,'Btn')['_children'].remove(n);n['_parent']=auto;n['_name']=new;auto['_children'].append(n);button(n)
find(auto,'FX')['_active']=False
common_ui.import_frames(auto);writeprefab(auto,'CrownAuto')
# Resolve the exact source icon, avoiding same-name English text art.
bar=common_ui.original('Astt/framework/bottombar/BarNode_share')
source=next(n for n in walk(bar) if n['_name']=='btn_autostop')
common_ui.import_frames(source)
stop=comp(find(source,'Icon'),'cc.Sprite')['_spriteFrame']
gamePath=ROOT/'assets/resources/deferred/CrownGame.prefab';doc=json.loads(gamePath.read_bytes())
controller=next(c for c in doc if 'uiIcons' in c);controller['uiIcons'][1]=stop
for n in doc:
 if n.get('_name')=='Auto':
  for r in n['_components']:
   c=doc[r['__id__']]
   if c['__type__']=='cc.UITransform':c['_contentSize'].update(width=58,height=58)
  icon=next(doc[r['__id__']] for r in n['_children'] if doc[r['__id__']].get('_name')=='Icon')
  for r in icon['_components']:
   c=doc[r['__id__']]
   if c['__type__']=='cc.UITransform':c['_contentSize'].update(width=50,height=46)
gamePath.write_text(json.dumps(doc,ensure_ascii=False,indent=2),encoding='utf-8')
print('Restored original AUTO panel and exact stop icon.')
