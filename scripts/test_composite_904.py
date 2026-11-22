from PIL import Image

am = Image.open('public/assets/amitabha_stage.png')
bg = Image.open('public/assets/temple_stage_bg.png')

w, h = am.size
bw, bh = bg.size

# In amitabha_stage, the wooden dais step beam is at y = 1038
y_am = 1038

# In temple_stage_bg, the wooden dais step beam is at y = 904
y_bg = 904

top_part = am.crop((0, 0, w, y_am))
floor_part = bg.crop((0, y_bg, bw, bh))

target_h = h - y_am
floor_resized = floor_part.resize((w, target_h), Image.Resampling.LANCZOS)

new_stage = Image.new('RGB', (w, h))
new_stage.paste(top_part, (0, 0))
new_stage.paste(floor_resized, (0, y_am))

new_stage.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/new_stage_narrow_carpet.png')
print('Saved new_stage_narrow_carpet.png')

# Crop seam y: 950 to 1250
seam = new_stage.crop((0, 950, w, 1250))
seam.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/seam_verify_904.png')

# Crop full floor y: 1000 to h
full_floor = new_stage.crop((0, 1000, w, h))
full_floor.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/full_floor_verify_904.png')
print('Saved crops')
