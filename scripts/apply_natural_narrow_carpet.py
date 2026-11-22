from PIL import Image
import numpy as np

# Load amitabha_stage.png (the one with clean dais without cushions)
am = Image.open('public/assets/amitabha_stage.png')
bg = Image.open('public/assets/temple_stage_bg.png')

w, h = am.size
bw, bh = bg.size

y_am = 1038
y_bg = 904

top_part = am.crop((0, 0, w, y_am))
floor_part = bg.crop((0, y_bg, bw, bh))

target_h = h - y_am
floor_resized = floor_part.resize((w, target_h), Image.Resampling.LANCZOS)

# Create composited image with clean dais and natural narrow carpet
stage_clean = Image.new('RGB', (w, h))
stage_clean.paste(top_part, (0, 0))
stage_clean.paste(floor_resized, (0, y_am))

stage_clean.save('public/assets/amitabha_stage.png')
print('Overwrote public/assets/amitabha_stage.png with clean dais & natural narrow runner!')

# Crop y: 920 to h to verify
crop = stage_clean.crop((0, 920, w, h))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/new_amitabha_stage_floor.png')
print('Saved new_amitabha_stage_floor.png')
