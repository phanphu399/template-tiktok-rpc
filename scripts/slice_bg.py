from PIL import Image

img = Image.open('public/assets/temple_stage_bg.png')
w, h = img.size

# Let's save 3 vertical slices of temple_stage_bg
img.crop((0, 0, w, int(h * 0.35))).save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_top.png')
img.crop((0, int(h * 0.35), w, int(h * 0.70))).save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_mid.png')
img.crop((0, int(h * 0.70), w, h)).save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_bot.png')
print('Saved slices')
