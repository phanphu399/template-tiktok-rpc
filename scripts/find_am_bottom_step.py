from PIL import Image

am = Image.open('public/assets/amitabha_stage.png')
w, h = am.size

crop = am.crop((0, 920, w, 960))
crop.save('C:/Users/phanp/.gemini/antigravity-cli/brain/bbaf71a0-95ff-4d69-a3f3-37c909cd5ce8/am_bottom_step.png')
print('Saved am_bottom_step.png')
