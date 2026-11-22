from PIL import Image

bg = Image.open('public/assets/temple_stage_bg.png')
w, h = bg.size

crop = bg.crop((0, 830, w, 950))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/temple_bg_step_bottom.png')
print('Saved temple_bg_step_bottom.png')
