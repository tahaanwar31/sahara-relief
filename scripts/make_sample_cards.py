import sys,os,io,random
sys.path.insert(0,str(__import__('pathlib').Path(__file__).resolve().parent.parent/'service'))
from PIL import Image, ImageDraw, ImageFont
from app.docs.analyze import analyze_image
OUT=os.path.expanduser("~/Desktop/sahara-sample-docs"); os.makedirs(OUT,exist_ok=True)
F="C:/Windows/Fonts/"
def f(n,s): return ImageFont.truetype(F+n,s)
def grain(img,seed):
    r=random.Random(seed); px=img.load(); w,h=img.size
    for _ in range(w*h//10):
        x,y=r.randrange(w),r.randrange(h); a,b,c=px[x,y]; n=r.randint(-7,7)
        px[x,y]=(max(0,min(255,a+n)),max(0,min(255,b+n)),max(0,min(255,c+n)))
    return img
import numpy as np
from PIL import ImageFilter
def photoize(img,seed):
    img=img.filter(ImageFilter.GaussianBlur(0.9))
    a=np.asarray(img).astype(np.float32); rng=np.random.default_rng(seed)
    a+=rng.normal(0,14,a.shape)
    # soft lighting gradient like a phone photo
    h,w=a.shape[:2]; g=np.linspace(0.93,1.04,w)[None,:,None]*np.linspace(1.02,0.95,h)[:,None,None]
    a*=g
    return Image.fromarray(np.clip(a,0,255).astype(np.uint8))
def save(img,name,seed):
    img=photoize(img,seed); b=io.BytesIO(); img.save(b,"JPEG",quality=85); data=b.getvalue()
    open(f"{OUT}/{name}.jpg","wb").write(data)
    r=analyze_image(data); print(name, r.get("verdict"), r.get("signals",{}) if isinstance(r.get("signals"),dict) else "")
def card(front):
    img=Image.new("RGB",(1000,640),(226,238,226)); d=ImageDraw.Draw(img)
    d.rectangle([14,14,986,626],outline=(24,90,56),width=6)
    d.rectangle([14,14,986,96],fill=(24,90,56))
    d.text((40,32),"ISLAMIC REPUBLIC OF PAKISTAN",fill="white",font=f("arialbd.ttf",34))
    d.text((640,60),"National Identity Card",fill=(230,245,230),font=f("arial.ttf",24))
    d.text((40,104),"SAMPLE FOR DEMO - NOT A REAL ID",fill=(170,20,20),font=f("arialbd.ttf",20))
    return img,d

def front(name,father,cnic,dob,expiry,gender,file,seed,photo=None):
    img,d=card(True)
    rows=[("Name",name),("Father Name",father),("Gender",gender),("Date of Birth",dob),("Date of Expiry",expiry)]
    y=150
    for k,v in rows:
        d.text((250,y),k,fill=(70,90,70),font=f("arial.ttf",20)); d.text((250,y+24),v,fill=(15,15,15),font=f("arialbd.ttf",32)); y+=78
    d.text((250,y+6),"Identity Number",fill=(70,90,70),font=f("arial.ttf",20)); d.text((250,y+30),cnic,fill=(15,15,15),font=f("arialbd.ttf",34))
    if photo:
        ph=Image.open(photo).convert("RGB"); w0,h0=ph.size; cw=min(w0,int(h0*185/220)); ph=ph.crop(((w0-cw)//2,0,(w0+cw)//2,int(cw*220/185))).resize((185,220)); img.paste(ph,(40,150)); d.rectangle([40,150,225,370],outline=(60,80,60),width=3)
    else:
        d.rectangle([40,150,225,370],fill=(190,200,190),outline=(60,80,60),width=3); d.ellipse([85,180,180,275],fill=(150,160,150)); d.rectangle([65,290,200,370],fill=(150,160,150))
    save(img,file,seed)

def back(cnic,address,file,seed):
    img,d=card(False)
    d.text((40,140),"Permanent Address",fill=(70,90,70),font=f("arial.ttf",22)); d.text((40,172),address,fill=(15,15,15),font=f("arialbd.ttf",28))
    d.text((40,240),"Present Address",fill=(70,90,70),font=f("arial.ttf",22)); d.text((40,272),address,fill=(15,15,15),font=f("arialbd.ttf",28))
    d.text((40,350),"Date of Issue: 01.01.2020",fill=(15,15,15),font=f("arial.ttf",26))
    for i in range(40): d.rectangle([40+i*9,470,40+i*9+(3 if i%3 else 6),580],fill=(20,20,20))
    d.text((420,500),cnic,fill=(15,15,15),font=f("arial.ttf",30))
    save(img,file,seed)

def letter(name,husband,cnic,address,file,seed):
    img=Image.new("RGB",(900,1200),(250,248,240)); d=ImageDraw.Draw(img)
    d.text((60,50),"UNION COUNCIL - INCOME CERTIFICATE",fill=(20,20,20),font=f("arialbd.ttf",34))
    d.text((60,98),"Household Income Certificate",fill=(20,20,20),font=f("arial.ttf",28))
    d.text((60,140),"SAMPLE FOR DEMO - NOT A REAL DOCUMENT",fill=(170,20,20),font=f("arialbd.ttf",20))
    d.line([60,180,840,180],fill=(40,40,40),width=3)
    body=[f"This is to certify that {name}, of {husband},",f"ID number {cnic}, resident of {address},","is a member of a household with a monthly income","below Rs 20,000.","","Issued on request for the Sahara Relief Programme.","","Date: 02 November 2026"]
    y=220
    for l in body: d.text((60,y),l,fill=(25,25,25),font=f("arial.ttf",26)); y+=48
    d.text((60,1000),"Secretary, Union Council",fill=(25,25,25),font=f("arial.ttf",24))
    d.ellipse([560,930,780,1150],outline=(30,60,140),width=5); d.text((610,1020),"UC STAMP",fill=(30,60,140),font=f("arialbd.ttf",26))
    save(img,file,seed)

if __name__=="__main__":
    # python scripts/make_sample_cards.py -> Zainab Bibi's household: the RIGHT set, and wrong fronts for the human-review demo
    # Her registry photo is db/seed/photos/4130190000112.jpg; "strangers" are other AI-generated faces (nobody real).
    PH=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"db","seed","photos")
    N,Fa,C="Zainab Bibi","Ghulam Mustafa Chandio","41301-9000011-2"; A="House 14, Street 3, Mohalla Chandio, Larkana, Sindh"
    for old in os.listdir(OUT): os.remove(os.path.join(OUT,old))
    front(N,Fa,C,"15.06.1978","31.12.2029","F","A1_front_CORRECT",1,photo=PH+"/4130190000112.jpg")
    back(C,A,"A2_back_CORRECT",2)
    W="Zubaida Khatoon"; WN="41301-9000099-7"; S=PH+"/_other_people/stranger_A.jpg"; Z=PH+"/4130190000112.jpg"
    front(W,Fa,C,"15.06.1978","31.12.2029","F","B1_front_WRONG_NAME",4,photo=Z)
    front(N,Fa,WN,"15.06.1978","31.12.2029","F","B2_front_WRONG_NUMBER",5,photo=Z)
    front(N,Fa,C,"15.06.1978","31.12.2029","F","B3_front_WRONG_FACE",6,photo=S)
    front(W,Fa,WN,"15.06.1978","31.12.2029","F","B4_front_WRONG_NAME_AND_NUMBER",7,photo=Z)
    front(W,Fa,WN,"15.06.1978","31.12.2029","F","B5_front_EVERYTHING_WRONG",8,photo=S)
