"""The claw slash: a white crescent the game tints per cat. Placeholder until art/raw/fx-slash.png exists.
Bulges LEFT, like the drawn one: the game flips it when the cat faces right."""
from PIL import Image, ImageDraw
g = Image.new('L', (32, 32)); d = ImageDraw.Draw(g); d.ellipse([2, 2, 29, 29], fill=255); d.ellipse([-6, 4, 21, 27], fill=0)
s = Image.new('RGBA', (32, 32), (255, 255, 255, 0)); s.putalpha(g)
s.transpose(Image.FLIP_LEFT_RIGHT).resize((96, 96), Image.NEAREST).save('assets/slash.png')
