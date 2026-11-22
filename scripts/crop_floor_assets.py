from PIL import Image

img = Image.open('public/assets/amitabha_stage.png')
w, h = img.size
print('amitabha_stage.png size:', w, h)

# Crop the floor area: y from 0.55*h to h
floor_crop = img.crop((0, int(0.55 * h), w, h))
floor_crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/carpet_current_floor.png')
print('Saved carpet_current_floor.png')

bg = Image.open('public/assets/temple_stage_bg.png')
print('temple_stage_bg.png size:', bg.size)
bw, bh = bg.size
bg_floor = bg.crop((0, int(0.55 * bh), bw, bh))
bg_floor.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_floor.png')
print('Saved temple_bg_floor.png')
