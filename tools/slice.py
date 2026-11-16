import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
src = sys.argv[1]
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
r,g,b = a[...,0],a[...,1],a[...,2]
lum = (r*299+g*587+b*114)//1000
mx = a.max(-1); mn = a.min(-1); sat = mx-mn
# foreground = dark, or strongly saturated (blue hoodie / red bandana / orange eyes / pink)
fg = (lum < 150) | ((sat > 90) & (lum < 200))
np.save('tools/work/fg.npy', fg)
rows = {'idle':(228,328),'walk':(332,418),'run':(422,505),'jump':(508,598),'sit':(602,683),
        'clawB':(782,885),'clawL':(895,995)}
cats = {'benji':(108,752),'luna':(772,1500)}
out = {}
dbg = im.copy(); d = ImageDraw.Draw(dbg)
for rn,(y0,y1) in rows.items():
    for cn,(x0,x1) in cats.items():
        if rn=='clawB':
            if cn!='benji': continue
            x0,x1 = 14,396
        if rn=='clawL':
            if cn!='luna': continue
            x0,x1 = 14,396
        sub = fg[y0:y1,x0:x1]
        sub = ndi.binary_closing(sub, iterations=2)
        lab,n = ndi.label(sub, structure=np.ones((3,3)))
        boxes=[]
        for i,sl in enumerate(ndi.find_objects(lab)):
            h = sl[0].stop-sl[0].start; w = sl[1].stop-sl[1].start
            area = (lab[sl]==i+1).sum()
            if area>700 and h>35:
                boxes.append([x0+sl[1].start,y0+sl[0].start,x0+sl[1].stop,y0+sl[0].stop])
        boxes.sort()
        key = f"{cn}_{'claw' if rn.startswith('claw') else rn}"
        out[key]=boxes
        for k,bx in enumerate(boxes):
            d.rectangle(bx, outline=(255,0,0)); d.text((bx[0],bx[1]-10),f"{key[:1]}{rn[:2]}{k}",fill=(255,0,0))
json.dump(out, open('tools/work/boxes.json','w'))
for k,v in out.items(): print(k, len(v), [ (b[2]-b[0], b[3]-b[1]) for b in v])
dbg.save('tools/work/dbg.png')
dbg.crop((0,220,1536,610)).save('tools/work/dbg1.png'); dbg.crop((0,600,1536,1010)).save('tools/work/dbg2.png')
