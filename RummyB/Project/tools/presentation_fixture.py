"""Create an isolated browser fixture for the win presentation; never edits release assets."""
import shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'build/web-mobile';target=root/'temp/presentation-check'
shutil.copytree(source,target,dirs_exist_ok=True)
p=target/'assets/main/index.js';s=p.read_text(encoding='utf-8');needle='this.round = new Round(rate);'
assert s.count(needle)==1
fixture='''
          { const r=this.round, cards=[...r.stock,...r.pile,r.indicator,...r.seats.flatMap(s=>s.hand)];
            const hand=[];
            for(const [suit,ranks] of [[0,[1,2,3,4]],[1,[5,6,7]],[2,[8,9,10]],[3,[11,12,13]]]){
              for(const rank of ranks){const i=cards.findIndex(c=>c.suit===suit&&c.rank===rank);hand.push(cards.splice(i,1)[0]);}
            }
            r.seats.forEach((seat,i)=>{seat.hand=i?cards.splice(0,13):hand;seat.groups=[];r.sort(i);});
            r.indicator=cards.pop();r.pile=[cards.pop()];r.stock=cards;r.sort(0);
          }
'''
p.write_text(s.replace(needle,needle+fixture),encoding='utf-8')
print(target)
