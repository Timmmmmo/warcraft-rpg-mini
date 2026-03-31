#!/usr/bin/env python3
"""Generate game art assets for 我的刀盾"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, math, random

random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
os.makedirs(OUT, exist_ok=True)

def radial_gradient(size, center_color, edge_color):
    img = Image.new('RGBA', (size, size), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    for r in range(size//2, 0, -1):
        t = r / (size//2)
        c = tuple(int(center_color[i]*(1-t) + edge_color[i]*t) for i in range(4))
        draw.ellipse([size//2-r, size//2-r, size//2+r, size//2+r], fill=c)
    return img

def draw_hero_portrait(name, main_color, accent, icon_char, filename):
    S = 128
    img = Image.new('RGBA', (S, S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Outer glow
    for r in range(S//2+8, S//2-2, -2):
        alpha = max(5, 40 - abs(r - S//2)*3)
        glow = main_color + (alpha,)
        d.ellipse([S//2-r, S//2-r, S//2+r, S//2+r], fill=glow)
    # Main circle
    for r in range(S//2-2, 0, -1):
        t = r / (S//2)
        cr = int(main_color[0]*(1-t*0.4))
        cg = int(main_color[1]*(1-t*0.4))
        cb = int(main_color[2]*(1-t*0.4))
        d.ellipse([S//2-r, S//2-r, S//2+r, S//2+r], fill=(cr,cg,cb,255))
    # Highlight
    for r in range(20, 0, -1):
        alpha = int(80 * (1 - r/20))
        d.ellipse([S//2-25-r, S//2-25-r, S//2-25+r, S//2-25+r], fill=(255,255,255,alpha))
    # Border
    d.ellipse([4,4,S-4,S-4], outline=(255,215,0,200), width=3)
    d.ellipse([2,2,S-2,S-2], outline=(255,255,255,60), width=1)
    # Icon (use text)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
    except:
        font = ImageFont.load_default()
    bbox = d.textbbox((0,0), icon_char, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    d.text((S//2-tw//2, S//2-th//2-2), icon_char, fill=(255,255,255,255), font=font)
    # Type indicator (bottom bar)
    d.rounded_rectangle([20, S-22, S-20, S-12], radius=5, fill=accent+(200,))
    img.save(os.path.join(OUT, filename))
    return img

def draw_monster_orc(filename, body_color):
    S = 96
    img = Image.new('RGBA', (S, S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Shadow
    d.ellipse([S//2-20, S-18, S//2+20, S-8], fill=(0,0,0,80))
    # Body
    for r in range(35, 0, -1):
        t = r/35
        c = tuple(int(body_color[i]*(0.6+0.4*t)) for i in range(3)) + (255,)
        d.ellipse([S//2-r, S//2-r-5, S//2+r, S//2+r-5], fill=c)
    # Face features
    # Brow ridges
    d.ellipse([S//2-18, S//2-18, S//2-6, S//2-8], fill=tuple(max(0,c-40) for c in body_color[:3])+(255,))
    d.ellipse([S//2+6, S//2-18, S//2+18, S//2-8], fill=tuple(max(0,c-40) for c in body_color[:3])+(255,))
    # Eyes
    d.ellipse([S//2-15, S//2-14, S//2-7, S//2-4], fill=(255,255,255,255))
    d.ellipse([S//2+7, S//2-14, S//2+15, S//2-4], fill=(255,255,255,255))
    d.ellipse([S//2-13, S//2-12, S//2-9, S//2-6], fill=(220,30,30,255))
    d.ellipse([S//2+9, S//2-12, S//2+13, S//2-6], fill=(220,30,30,255))
    # Tusks
    d.polygon([(S//2-10, S//2+5),(S//2-8, S//2+18),(S//2-5, S//2+5)], fill=(255,240,200,255))
    d.polygon([(S//2+5, S//2+5),(S//2+8, S//2+18),(S//2+10, S//2+5)], fill=(255,240,200,255))
    # Scar
    d.line([(S//2-20, S//2-20),(S//2-10, S//2)], fill=(100,20,20,180), width=2)
    # Border
    d.ellipse([4,4,S-4,S-4], outline=(100,50,50,150), width=2)
    img.save(os.path.join(OUT, filename))
    return img

def draw_monster_centaur(filename, body_color):
    S = 128
    img = Image.new('RGBA', (S, S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Horse body shadow
    d.ellipse([S//2-35, S-22, S//2+35, S-10], fill=(0,0,0,70))
    # Horse body
    for r in range(30, 0, -1):
        t = r/30
        c = tuple(int(body_color[i]*(0.5+0.5*t)) for i in range(3)) + (255,)
        d.ellipse([S//2-r-5, S//2+10-r//2, S//2+r+5, S//2+10+r//2], fill=c)
    # Legs
    for lx in [S//2-25, S//2-10, S//2+10, S//2+25]:
        d.line([(lx, S//2+15),(lx+(5 if lx<S//2 else -5), S-12)], fill=tuple(max(0,c-30) for c in body_color[:3])+(255,), width=6)
    # Human torso
    d.rounded_rectangle([S//2-15, S//2-30, S//2+15, S//2+10], radius=8,
        fill=tuple(min(255,c+30) for c in body_color[:3])+(255,))
    # Head
    for r in range(16, 0, -1):
        c = tuple(int(body_color[i]*(0.6+0.4*r/16)) for i in range(3)) + (255,)
        d.ellipse([S//2-r, S//2-50-r, S//2+r, S//2-50+r], fill=c)
    # Eyes
    d.ellipse([S//2-8, S//2-54, S//2-3, S//2-48], fill=(255,255,255,255))
    d.ellipse([S//2+3, S//2-54, S//2+8, S//2-48], fill=(255,255,255,255))
    d.ellipse([S//2-6, S//2-53, S//2-4, S//2-49], fill=(255,200,0,255))
    d.ellipse([S//2+4, S//2-53, S//2+6, S//2-49], fill=(255,200,0,255))
    # Horns
    d.polygon([(S//2-8, S//2-60),(S//2-15, S//2-78),(S//2-3, S//2-60)], fill=(255,215,0,255))
    d.polygon([(S//2+3, S//2-60),(S//2+15, S//2-78),(S//2+8, S//2-60)], fill=(255,215,0,255))
    img.save(os.path.join(OUT, filename))
    return img

def draw_tower(filename, active):
    S = 80
    img = Image.new('RGBA', (S, S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    if active:
        # Active tower - golden glow
        for r in range(38, 20, -1):
            alpha = int(30*(1-(r-20)/18))
            d.ellipse([S//2-r, S//2-r, S//2+r, S//2+r], fill=(255,215,0,alpha))
        d.ellipse([10,10,S-10,S-10], fill=(60,60,80,255), outline=(255,215,0,255), width=3)
        # Castle icon
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        except:
            font = ImageFont.load_default()
        d.text((S//2-14, S//2-18), "🏰", fill=(255,215,0,255), font=font)
    else:
        d.ellipse([12,12,S-12,S-12], fill=(40,40,50,200), outline=(100,100,100,150), width=2)
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except:
            font = ImageFont.load_default()
        d.text((S//2-12, S//2-15), "🏚️", fill=(150,150,150,200), font=font)
    img.save(os.path.join(OUT, filename))
    return img

def draw_background(filename):
    W, H = 800, 600
    img = Image.new('RGBA', (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img)
    # Gradient background
    for y in range(H):
        t = y/H
        r = int(15 + 15*t)
        g = int(30 + 15*t)
        b = int(15 + 10*t)
        d.line([(0,y),(W,y)], fill=(r,g,b,255))
    # Grid lines
    for x in range(0, W, 50):
        d.line([(x,0),(x,H)], fill=(30,50,30,40), width=1)
    for y in range(0, H, 50):
        d.line([(0,y),(W,y)], fill=(30,50,30,40), width=1)
    # Grass patches
    for _ in range(200):
        gx, gy = random.randint(0,W), random.randint(0,H)
        shade = random.randint(20,50)
        d.ellipse([gx,gy,gx+random.randint(2,6),gy+random.randint(2,4)],
                  fill=(shade, shade+random.randint(10,30), shade, random.randint(30,60)))
    # Stones
    for _ in range(30):
        sx, sy = random.randint(0,W), random.randint(0,H)
        sr = random.randint(3,8)
        d.ellipse([sx-sr, sy-sr, sx+sr, sy+sr],
                  fill=(random.randint(50,70), random.randint(50,65), random.randint(45,60), random.randint(60,100)))
    img.save(os.path.join(OUT, filename))
    return img

# ====== GENERATE ALL ASSETS ======
print("Generating hero portraits...")
heroes = [
    ('warrior', (200,30,30), (255,200,100), '⚔'),
    ('archer', (40,100,220), (100,200,255), '🏹'),
    ('mage', (200,180,0), (255,255,100), '🔮'),
    ('blademaster', (220,40,40), (255,100,100), '🗡'),
    ('mountainking', (200,170,0), (255,230,100), '🛡'),
    ('windrunner', (0,180,100), (100,255,180), '💨'),
    ('shadowhunter', (120,30,160), (180,80,220), '🌑'),
    ('frost', (60,170,220), (150,220,255), '❄'),
    ('bloodmage', (180,30,30), (255,80,50), '🔥'),
    ('storm', (100,50,200), (160,120,255), '⚡'),
]
for name, col, accent, icon in heroes:
    draw_hero_portrait(name, col, accent, icon, f'hero_{name}.png')
    print(f"  ✓ hero_{name}.png")

print("Generating monster sprites...")
draw_monster_orc('orc_normal.png', (80,120,60))
draw_monster_orc('orc_fast.png', (50,140,160))
draw_monster_orc('orc_tank.png', (120,80,60))
draw_monster_orc('orc_elite.png', (160,40,180))
print("  ✓ 4 orc variants")

draw_monster_centaur('centaur_boss.png', (180,150,50))
draw_monster_centaur('centaur_elite.png', (160,60,180))
print("  ✓ 2 centaur variants")

print("Generating environment...")
draw_tower('tower_active.png', True)
draw_tower('tower_inactive.png', False)
print("  ✓ towers")

draw_background('bg_tile.png')
print("  ✓ background")

print("\n✅ All assets generated!")
