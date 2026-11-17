import numpy as np, time, sys
from scipy.signal import fftconvolve
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw, ImageFilter

def smoothstep(a,b,x):
    t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)

def orientation(W,H,cores,deltas,seed,noise=0.13):
    rng=np.random.default_rng(seed)
    y,x=np.mgrid[0:H,0:W].astype(np.float32)
    s=np.zeros((H,W),np.float32)
    for (cx,cy) in deltas: s+=np.arctan2(y-cy,x-cx)
    for (cx,cy) in cores:  s-=np.arctan2(y-cy,x-cx)
    th=0.5*s
    n=gaussian_filter(rng.standard_normal((H,W)).astype(np.float32),60); n/=n.std()
    return th+noise*n

def ridges(W,H,theta,period,seed,iters=8,bins=20):
    rng=np.random.default_rng(seed+1)
    f=1.0/period; sig=0.62*period; r=int(np.ceil(2.6*sig))
    yy,xx=np.mgrid[-r:r+1,-r:r+1].astype(np.float32)
    env=np.exp(-(xx**2+yy**2)/(2*sig**2))
    kernels=[]
    for k in range(bins):
        phi=np.pi*k/bins+np.pi/2
        xp=xx*np.cos(phi)+yy*np.sin(phi)
        g=env*np.cos(2*np.pi*f*xp); g-=g.mean(); g/=np.abs(g).sum()
        kernels.append(g.astype(np.float32))
    idx=np.floor(((theta%np.pi)/np.pi)*bins).astype(int)%bins
    I=rng.standard_normal((H,W)).astype(np.float32)
    for t in range(iters):
        out=np.zeros_like(I)
        for k in range(bins):
            m=(idx==k)
            if not m.any(): continue
            c=fftconvolve(I,kernels[k],mode='same')
            out[m]=c[m]
        loc=np.sqrt(gaussian_filter(out**2,18))+1e-6
        I=np.clip(out/loc,-1.6,1.6)
        print(" iter",t,flush=True)
    return I/1.6

def shade(I,W,H,P):
    h=gaussian_filter(I,P.get('soft',1.3))
    gy,gx=np.gradient(h); s=P.get('bump',3.2)
    nz=np.ones_like(h); nx=-gx*s; ny=-gy*s
    n=np.sqrt(nx**2+ny**2+nz**2); nx/=n; ny/=n; nz/=n
    L=np.array([-0.45,-0.65,0.62]); L/=np.linalg.norm(L)
    L2=np.array([0.75,0.55,0.38]); L2/=np.linalg.norm(L2)
    d1=np.clip(nx*L[0]+ny*L[1]+nz*L[2],0,1)
    d2=np.clip(nx*L2[0]+ny*L2[1]+nz*L2[2],0,1)
    Hh=(L+np.array([0,0,1.0])); Hh/=np.linalg.norm(Hh)
    spec=np.clip(nx*Hh[0]+ny*Hh[1]+nz*Hh[2],0,1)**P.get('shine',46)
    crest=smoothstep(-0.25,0.75,h)
    navy=np.array([4,9,34],np.float32); blue=np.array([9,52,150],np.float32)
    cyan=np.array([33,212,253],np.float32); white=np.array([205,246,255],np.float32); orange=np.array([255,138,31],np.float32)
    img=navy[None,None,:]+crest[...,None]*(blue-navy)[None,None,:]
    img+= (crest*d1**1.5)[...,None]*cyan[None,None,:]*0.85
    img+= (crest*spec)[...,None]*white[None,None,:]*1.1
    y,x=np.mgrid[0:H,0:W].astype(np.float32)
    ox,oy=P['warm']
    warm=np.exp(-(((x-ox*W)**2+(y-oy*H)**2)/(2*(P['warm_r']*W)**2)))
    img+= (crest*d2**1.3*warm)[...,None]*orange[None,None,:]*2.1
    return img,y,x

def make(name,W,H,P,seed):
    t0=time.time()
    cores=[(a*W,b*H) for a,b in P['cores']]; deltas=[(a*W,b*H) for a,b in P['deltas']]
    theta=orientation(W,H,cores,deltas,seed)
    I=ridges(W,H,theta,P['period'],seed)
    img,y,x=shade(I,W,H,P)
    cx,cy=P['cx']*W,P['cy']*H
    d=((x-cx)/(P['rx']*W))**2+((y-cy)/(P['ry']*H))**2
    mask=np.clip(1-d,0,1)**0.8
    mask=gaussian_filter(mask,25)
    vis=P['floor']+(1-P['floor'])*mask
    lefty=smoothstep(P['fade0'],P['fade1'],x/W)
    vis*= (P['left']+(1-P['left'])*lefty)
    img*=vis[...,None]*P['gain']
    # glows
    core=np.exp(-(((x-cx)**2+(y-cy)**2)/(2*(0.05*W)**2)))
    img+=core[...,None]*np.array([255,150,60],np.float32)*P['coreglow']
    # scan beam
    if P.get('scan'):
        sy=P['scan']*H
        span=smoothstep(cx-P['rx']*W*1.05,cx-P['rx']*W*0.3,x)*(1-smoothstep(cx+P['rx']*W*0.3,cx+P['rx']*W*1.05,x))
        line=np.exp(-((y-sy)**2)/(2*2.2**2)); halo=np.exp(-((y-sy)**2)/(2*34**2))
        beam=(line*0.95+halo*0.16)*span
        img+=beam[...,None]*np.array([90,225,255],np.float32)
    # bokeh
    rng=np.random.default_rng(seed+7)
    lay=Image.new('RGB',(W,H),(0,0,0)); dr=ImageDraw.Draw(lay)
    for _ in range(P.get('bokeh',34)):
        bx=rng.uniform(0.35,1.0)*W; by=rng.uniform(0,1)*H; br=rng.uniform(5,34)
        col=(255,138,31) if rng.random()<0.35 else (33,212,253)
        a=rng.uniform(0.05,0.16)
        dr.ellipse([bx-br,by-br,bx+br,by+br],fill=tuple(int(c*a) for c in col))
    lay=lay.filter(ImageFilter.GaussianBlur(3.2))
    img+=np.asarray(lay,np.float32)
    # vignette + base lift
    vx=(x/W-0.5)*2; vy=(y/H-0.5)*2
    vig=1-0.55*np.clip((vx**2*0.6+vy**2*0.9),0,1.4)
    img*=vig[...,None]
    img+=np.array([5,10,33],np.float32)*(1-np.clip(img.max(axis=2,keepdims=True)/120,0,1))
    img=np.clip(img,0,255)
    # chromatic aberration at the edges
    wgt=np.clip((vx**2+vy**2)/2,0,1)[...,None]
    r=np.roll(img[...,0],2,axis=1); b=np.roll(img[...,2],-2,axis=1)
    img[...,0]=img[...,0]*(1-wgt[...,0])+r*wgt[...,0]
    img[...,2]=img[...,2]*(1-wgt[...,0])+b*wgt[...,0]
    # grain
    g=np.random.default_rng(seed+3).standard_normal((H,H if False else W)).astype(np.float32)*5.5
    img+=g[...,None]
    img=np.clip(img,0,255).astype(np.uint8)
    out=Image.fromarray(img)
    out.save(f'{name}.webp',quality=80,method=6)
    out.save(f'{name}.png')
    print(name,"done in",round(time.time()-t0),"s")

if __name__=="__main__":
    which=sys.argv[1]
    if which=="hero":
        make("hero",1920,1080,dict(cx=0.70,cy=0.50,rx=0.27,ry=0.62,period=15,floor=0.10,left=0.06,fade0=0.18,fade1=0.58,
            cores=[(0.69,0.40)],deltas=[(0.80,0.93)],gain=1.0,coreglow=0.16,warm=(0.96,0.92),warm_r=0.30,scan=0.60,bokeh=36,bump=3.2,shine=46),seed=11)
    else:
        make("dash",1920,1080,dict(cx=0.22,cy=0.78,rx=0.50,ry=0.85,period=26,floor=0.05,left=0.55,fade0=0.0,fade1=0.3,
            cores=[(0.22,0.70)],deltas=[(0.30,1.15)],gain=0.78,coreglow=0.07,warm=(0.95,0.95),warm_r=0.45,scan=None,bokeh=22,bump=3.6,shine=40,soft=1.8),seed=29)
