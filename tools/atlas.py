import sys, json, base64, io
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
im = Image.open(sys.argv[1]).convert('RGB'); a = np.asarray(im).astype(int)
lum = (a[...,0]*299+a[...,1]*587+a[...,2]*114)//1000
sat = a.max(-1)-a.min(-1)
boxes = json.load(open('tools/work/boxes.json'))
CW,CH = 144,100
def cut(bx):
    x0,y0,x1,y1 = bx; p=4
    x0-=p;y0-=p;x1+=p;y1+=p
    L = lum[y0:y1,x0:x1]; S = sat[y0:y1,x0:x1]
    barrier = (L<200)|(S>70)
    barrier = ndi.binary_closing(barrier, iterations=1)
    free = ~barrier
    lab,n = ndi.label(free)
    border = set(lab[0,:])|set(lab[-1,:])|set(lab[:,0])|set(lab[:,-1]); border.discard(0)
    bg = np.isin(lab, list(border))
    m = ~bg
    l2,n2 = ndi.label(m)
    if n2>1:
        sizes = ndi.sum(m,l2,range(1,n2+1)); m = l2==(1+int(np.argmax(sizes)))
    rgba = np.dstack([a[y0:y1,x0:x1], m*255]).astype(np.uint8)
    img = Image.fromarray(rgba,'RGBA')
    return img.crop(img.getbbox())
def sheet(cat):
    out = Image.new('RGBA',(CW*5,CH*5))
    for r,row in enumerate(['idle','walk','run','jump','sit']):
        for c,bx in enumerate(boxes[f'{cat}_{row}'][:5]):
            s = cut(bx)
            out.alpha_composite(s,(c*CW+(CW-s.width)//2, r*CH+CH-s.height))
    return out
def uri(img):
    b=io.BytesIO(); img.save(b,'PNG',optimize=True); return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
assets={}
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sheetlib import record
for cat in ['benji','luna']:
    s=sheet(cat); s.save(f'assets/{cat}.png')
    counts={row: min(5,len(boxes[f'{cat}_{row}'])) for row in ['idle','walk','run','jump','sit']}
    record(cat, f'{cat}.png', {'frameWidth':CW,'frameHeight':CH,'cols':5,'rows':['idle','walk','run','jump','sit'],'counts':counts,
                              'anims':{'idle':[0,1,2,1]}})   # the concept sheet's 4th idle frame is a different pose

# slash crescent
g=Image.new('L',(32,32)); d=ImageDraw.Draw(g); d.ellipse([2,2,29,29],fill=255); d.ellipse([-6,4,21,27],fill=0)
sl=Image.new('RGBA',(32,32),(255,255,255,0)); sl.putalpha(g); sl=sl.resize((96,96),Image.NEAREST); sl.save('assets/slash.png')
# preview on dark bg
pv=Image.new('RGBA',(720+900,1000+150),(40,90,70,255))
pv.alpha_composite(Image.open('assets/benji.png'),(0,0)); pv.alpha_composite(Image.open('assets/luna.png'),(0,500)); pv.alpha_composite(sl,(720,200))
pv.convert('RGB').save('tools/work/preview.png')
