"""Export marketing artwork with original seeded screens and exact crop-safe text."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'marketing/app-store'
SOURCE = OUT / 'source'
FONT = ROOT / 'admin/node_modules/@expo-google-fonts/figtree/900Black/Figtree_900Black.ttf'


def phone(canvas, name, x, y, width):
    screen = Image.open(SOURCE / f'{name}.png').convert('RGB')
    height = round(width * screen.height / screen.width)
    rim = max(4, round(width * .023))
    box = (x-rim, y-rim, x+width+rim, y+height+rim)
    shadow = Image.new('RGBA', canvas.size)
    ImageDraw.Draw(shadow).rounded_rectangle((box[0]+10,box[1]+18,box[2]+10,box[3]+18),radius=width*.17,fill=(0,0,0,110))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(width*.035)))
    ImageDraw.Draw(canvas).rounded_rectangle(box,radius=width*.17,fill='#16131e')
    mask=Image.new('L',(width,height))
    ImageDraw.Draw(mask).rounded_rectangle((0,0,width,height),radius=width*.15,fill=255)
    canvas.paste(screen.resize((width,height),Image.Resampling.LANCZOS),(x,y),mask)


def render(name,size,text,phones,safe=None,brand=False):
    canvas=Image.open(SOURCE/'purple-background.jpg').resize(size,Image.Resampling.LANCZOS).convert('RGBA')
    for spec in phones: phone(canvas,*spec)
    draw=ImageDraw.Draw(canvas)
    x,y,font_size,line_height=text
    font=ImageFont.truetype(str(FONT),font_size)
    bounds=[]
    for i,line in enumerate(['Find your','next great','Martini']):
        pos=(x,y+i*line_height)
        box=draw.textbbox(pos,line,font=font,anchor='lt')
        if safe:
            assert box[0]>=safe[0] and box[1]>=safe[1] and box[2]<=safe[2] and box[3]<=safe[3], (name,line,box,safe)
        draw.text(pos,line,font=font,fill='white',anchor='lt')
        bounds.append(box)
    if brand:
        draw.text((x,round(size[1]*.17)),'Tini Time Club',font=ImageFont.truetype(str(FONT),round(size[0]*.028)),fill='white',anchor='lt')
    path=ROOT/name
    path.parent.mkdir(parents=True,exist_ok=True)
    canvas.convert('RGB').save(path,optimize=True)
    print(path.relative_to(ROOT),size,'headline bounds:',bounds)
    if safe:
        proof=canvas.copy()
        ImageDraw.Draw(proof).rectangle(safe,outline='#ceff38',width=5)
        proof.thumbnail((1200,800))
        proof.convert('RGB').save(OUT/(Path(name).stem+'-safe-area.jpg'),quality=90)


render('marketing/app-store/header-3840x1646.png',(3840,1646),(1130,550,185,190),[('passport',2070,330,440),('feed',2220,240,510)],(1097,493,2743,1154))
render('marketing/app-store/search-3840x2560.png',(3840,2560),(880,900,240,280),[('passport',2130,610,520),('feed',2350,500,600)],(836,765,3004,1795))
render('marketing/app-store/universal-5244x2950.png',(5244,2950),(1950,900,140,165),[('passport',2690,690,365),('feed',2860,580,420)],(1921,660,3323,1622))
render('admin/public/tini-time-discover-share-v2.png',(1200,630),(65,205,110,125),[('passport',737,100,220),('feed',860,45,250)],brand=True)
render('marketing/google-play/feature-graphic-1024x500.png',(1024,500),(55,165,92,100),[('android-feed',710,40,190)],brand=True)
