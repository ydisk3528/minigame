"""Author the requested lobby presentation buttons as bound prefab nodes."""
import json
from pathlib import Path
from prefab_metadata import attach_prefab_info

ROOT=Path(__file__).resolve().parents[1]
SHOW_TEST_BUTTONS=False

def add_test_buttons(objects):
    sprites={s['name']:s['uuid'] for s in json.loads((ROOT/'tools/recovery-report.json').read_bytes())['sprites']}
    changed=False
    for node in objects:
        if node.get('__type__')=='cc.Node' and node.get('_name') in ('TestWinButton','TestLoseButton'):
            if node.get('_active')!=SHOW_TEST_BUTTONS:
                node['_active']=SHOW_TEST_BUTTONS;changed=True
    for parent_id,parent in enumerate(list(objects)):
        if parent.get('__type__')!='cc.Node' or parent.get('_name')!='LobbyView':continue
        if not any(objects[r['__id__']].get('_name')=='TableButtonGroup' for r in parent['_children']):continue
        if any(objects[r['__id__']].get('_name')=='TestWinButton' for r in parent['_children']):continue
        for name,title,x,frame in [('TestWinButton','测试 WIN',200,'Base_Drop_BTN'),('TestLoseButton','测试 LOSE',470,'Base_Drop_Red_BTN')]:
            i=len(objects);parent['_children'].append({'__id__':i})
            objects.extend([
                {'__type__':'cc.Node','_name':name,'_parent':{'__id__':parent_id},'_children':[{'__id__':i+4}],
                 '_components':[{'__id__':i+1},{'__id__':i+2},{'__id__':i+3}], '_active':SHOW_TEST_BUTTONS,'_layer':33554432,
                 '_lpos':{'__type__':'cc.Vec3','x':x,'y':-345,'z':0},'_lscale':{'__type__':'cc.Vec3','x':1,'y':1,'z':1}},
                {'__type__':'cc.UITransform','node':{'__id__':i},'_contentSize':{'__type__':'cc.Size','width':240,'height':48}},
                {'__type__':'cc.Sprite','node':{'__id__':i},'_spriteFrame':{'__uuid__':sprites[frame]},'_sizeMode':0,'_type':1},
                {'__type__':'cc.Button','node':{'__id__':i},'_interactable':True,'clickEvents':[]},
                {'__type__':'cc.Node','_name':'Label','_parent':{'__id__':i},'_children':[],
                 '_components':[{'__id__':i+5},{'__id__':i+6}],'_active':True,'_layer':33554432},
                {'__type__':'cc.UITransform','node':{'__id__':i+4},'_contentSize':{'__type__':'cc.Size','width':228,'height':44}},
                {'__type__':'cc.Label','node':{'__id__':i+4},'_string':title,'_fontSize':26,'_lineHeight':30,
                 '_horizontalAlign':1,'_verticalAlign':1,'_useSystemFont':True,'_fontFamily':'Arial',
                 '_color':{'__type__':'cc.Color','r':255,'g':255,'b':255,'a':255}},
            ])
            changed=True
    return changed

if __name__=='__main__':
    for path in list((ROOT/'assets/prefabs').glob('*.prefab'))+list((ROOT/'assets/scenes').glob('*.scene')):
        objects=json.loads(path.read_bytes())
        if add_test_buttons(objects):
            if path.suffix=='.prefab':attach_prefab_info(objects)
            path.write_text(json.dumps(objects,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            print(path.name)
