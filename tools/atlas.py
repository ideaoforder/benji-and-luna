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
for cat in ['benji','luna']:
    s=sheet(cat); s.save(f'assets/{cat}.png'); assets[cat]=uri(s)

# --- officer (original placeholder art), 60x48 low-res x3
OUT=(38,28,48); KH=(201,176,116); KD=(160,136,84); SK=(240,196,160); CAP=(52,74,62); PANT=(70,78,96); BOOT=(40,36,44); POLE=(140,96,60); NET=(245,245,250)
def officer(pose):
    g=Image.new('RGBA',(60,48)); d=ImageDraw.Draw(g)
    la,ra = {'a':(2,-2),'b':(-2,2)}.get(pose,(1,-1))
    lean = -2 if pose=='hurt' else (1 if pose=='swing' else 0)
    for off,x in ((la,25),(ra,31)):
        d.rectangle([x+off,33,x+off+4,43],fill=PANT); d.rectangle([x+off,44,x+off+5,46],fill=BOOT)
    d.rectangle([23+lean,17,36+lean,32],fill=KH); d.rectangle([23+lean,30,36+lean,31],fill=BOOT)
    d.rectangle([23+lean,17,25+lean,29],fill=KD); d.rectangle([32+lean,20,33+lean,21],fill=(250,210,70))
    hx=25+lean*2
    d.rectangle([hx,7,hx+10,16],fill=SK); d.rectangle([hx-1,3,hx+11,7],fill=CAP); d.rectangle([hx+8,7,hx+14,8],fill=CAP)
    d.rectangle([hx+4,4,hx+6,5],fill=(250,210,70))
    if pose=='hurt':
        d.line([hx+6,10,hx+8,12],fill=OUT); d.line([hx+8,10,hx+6,12],fill=OUT); d.rectangle([hx+6,14,hx+8,15],fill=OUT)
    else:
        d.rectangle([hx+7,10,hx+8,11],fill=OUT); d.line([hx+6,14,hx+9,14],fill=OUT)
    sh=(33+lean,19)
    if pose in('a','b'):   hand=(39,25); tip=(46,10); hoop=(48,6)
    elif pose=='windup':   hand=(30,12); tip=(18,6);  hoop=(13,6)
    elif pose=='swing':    hand=(41,25); tip=(50,32); hoop=(53,37)
    else:                  hand=(38,12); tip=(44,4);  hoop=(48,3)
    d.line([sh,hand],fill=KD,width=3); d.rectangle([hand[0]-1,hand[1]-1,hand[0]+1,hand[1]+1],fill=SK)
    d.line([hand,tip],fill=POLE,width=1)
    d.ellipse([hoop[0]-5,hoop[1]-5,hoop[0]+5,hoop[1]+5],outline=NET)
    for k in(-2,1): d.line([hoop[0]+k,hoop[1]-4,hoop[0]+k,hoop[1]+4],fill=(215,215,230))
    for k in(-2,1): d.line([hoop[0]-4,hoop[1]+k,hoop[0]+4,hoop[1]+k],fill=(215,215,230))
    al=np.asarray(g)[...,3]>0; ring=ndi.binary_dilation(al)&~al
    arr=np.asarray(g).copy(); arr[ring]=(*OUT,255)
    return Image.fromarray(arr,'RGBA').resize((180,144),Image.NEAREST)
off=Image.new('RGBA',(180*5,144))
for i,p in enumerate(['a','b','windup','swing','hurt']): off.alpha_composite(officer(p),(i*180,0))
off.save('assets/officer.png'); assets['officer']=uri(off)
# slash crescent
g=Image.new('L',(32,32)); d=ImageDraw.Draw(g); d.ellipse([2,2,29,29],fill=255); d.ellipse([-6,4,21,27],fill=0)
sl=Image.new('RGBA',(32,32),(255,255,255,0)); sl.putalpha(g); sl=sl.resize((96,96),Image.NEAREST); assets['slash']=uri(sl); sl.save('assets/slash.png')
# preview on dark bg
pv=Image.new('RGBA',(720+900,1000+150),(40,90,70,255))
pv.alpha_composite(Image.open('assets/benji.png'),(0,0)); pv.alpha_composite(Image.open('assets/luna.png'),(0,500)); pv.alpha_composite(off,(720,0)); pv.alpha_composite(sl,(720,200))
pv.convert('RGB').save('tools/work/preview.png')
