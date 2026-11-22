from PIL import Image

img = Image.open('public/assets/temple_stage_bg.png')
w, h = img.size
print('temple_stage_bg size:', w, h)

# Let's save the full image or lower 60% of temple_stage_bg to inspect
crop = img.crop((0, int(0.4 * h), w, h))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_stage_bg_full_floor.png')
print('Saved temple_stage_bg_full_floor.png')
