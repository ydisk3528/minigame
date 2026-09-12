"""Keep OfflineApp as the full authoring source; emit a light scene + lazy prefabs."""
import copy,json,uuid
from pathlib import Path
from assemble_b import hydrate,serialize,node
from recover_b import PROJECT,ASSETS,save,meta

def main():
    full=hydrate(json.loads((ASSETS/'prefabs/OfflineApp.prefab').read_bytes()))['data']
    controller=next(c for c in full['_components'] if 'cardSound' in c)
    children={n['_name']:n for n in full['_children']}
    scriptid=str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/DeferredAssets'))
    meta(ASSETS/'scripts/DeferredAssets.ts',scriptid,'typescript','4.0.24')
    folder=ASSETS/'resources/deferred';folder.mkdir(parents=True,exist_ok=True)
    table=children['TableView']
    room=children['RoomMenu'];room['_parent']=table;table['_children'].append(room)
    fields=['cards','blackRanks','redRanks','suits','portraits']
    table['_components'].append(dict(__type__=scriptid,node=table,**{k:controller[k] for k in fields}))
    audio=node('AudioBank',0,0)
    audio['_components'].append(dict(__type__=scriptid,node=audio,**{k:controller[k] for k in ['backgroundMusic','winMusic','cardSound']}))
    panels=[table,children['ResultView'],children['Help'],children['ChangeAvatorView'],audio]
    for panel in panels:
        panel['_parent']=None;panel['_active']=False
        path=folder/(panel['_name']+'.prefab')
        save(path,serialize({'__type__':'cc.Prefab','_name':panel['_name'],'data':panel}))
        meta(path,str(uuid.uuid5(uuid.NAMESPACE_URL,'rummy-b/deferred/'+panel['_name'])),'prefab')
    # Copy AFTER emitting panels; removing source children must not remove full authoring assets.
    full['_children']=[n for n in full['_children'] if n['_name'] in ['LobbyView','MenuVertical','Status','LoadingOverlay','NoticeDialog']]
    for k in fields:controller[k]=[]
    for k in ['backgroundMusic','winMusic','cardSound']:controller[k]=None
    music=controller['music'];music['_clip']=None;music['_playOnAwake']=False
    # The existing canvas/camera settings are retained from the current scene.
    scene=hydrate(json.loads((ASSETS/'scenes/RummyB.scene').read_bytes()))
    canvas=scene['scene']['_children'][0]
    full['_parent']=canvas
    canvas['_children']=[n for n in canvas['_children'] if not any('music' in c and 'cardSound' in c for c in n.get('_components',[]))]+[full]
    save(ASSETS/'scenes/RummyB.scene',serialize(scene,True))
    config=json.loads((PROJECT/'build-config.json').read_bytes())
    config.update(debug=False,sourceMaps=False,md5Cache=True)
    save(PROJECT/'build-config.json',config)
    from first_play_guide import main as add_guide
    add_guide()
    print('First scene: LobbyView, MenuVertical, Status; deferred:',[p['_name'] for p in panels])

if __name__=='__main__':main()
